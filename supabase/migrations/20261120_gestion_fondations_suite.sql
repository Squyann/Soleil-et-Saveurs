-- Soleil et Saveurs : dernière étape de la mise à jour de l'application de gestion.
-- À coller tel quel dans Supabase > SQL Editor > New query, puis « Run ».
BEGIN;
CREATE OR REPLACE FUNCTION public.changer_statut_commande(p_id bigint, p_attendu text, p_nouveau text, p_motif text DEFAULT NULL)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
DECLARE
  v_cmd public.commandes%ROWTYPE;
  v_de text;
  v_vers text;
  v_valeur text;
  v_ligne jsonb;
  v_vid uuid;
  v_pid uuid;
  v_q numeric;
  v_unite_prod text;
  v_stock_prod integer;
  v_points integer;
  v_util uuid;
BEGIN
  IF NOT public.peut('commandes') THEN
    RAISE EXCEPTION 'Accès refusé' USING ERRCODE = '42501';
  END IF;

  v_vers := public.statut_normalise(p_nouveau);
  v_valeur := CASE v_vers
    WHEN 'nouvelle' THEN 'En attente'
    WHEN 'preparation' THEN 'En préparation'
    WHEN 'livraison' THEN 'En livraison'
    WHEN 'livree' THEN 'livrée'
    WHEN 'annulee' THEN 'annulée' END;

  IF v_vers = 'annulee' AND NOT public.peut('annuler') THEN
    RAISE EXCEPTION 'Accès refusé : annulation réservée aux gérants' USING ERRCODE = '42501';
  END IF;
  IF v_vers = 'annulee' AND coalesce(btrim(p_motif), '') = '' THEN
    RAISE EXCEPTION 'Motif d''annulation obligatoire';
  END IF;

  SELECT * INTO v_cmd FROM public.commandes WHERE id = p_id FOR UPDATE;
  -- Même périmètre que la lecture : le préparateur ne touche qu'aux
  -- commandes à livrer depuis la veille
  IF NOT FOUND OR (NOT public.peut('clients') AND coalesce(v_cmd.date_livraison < current_date - 1, true)) THEN
    RAISE EXCEPTION 'Commande introuvable';
  END IF;

  v_de := public.statut_normalise(v_cmd.statut);
  IF v_de IS DISTINCT FROM public.statut_normalise(p_attendu) THEN
    RETURN jsonb_build_object('ok', false, 'conflit', true, 'statut', v_cmd.statut, 'updated_at', v_cmd.updated_at);
  END IF;
  IF v_de = v_vers THEN
    RETURN jsonb_build_object('ok', true, 'statut', v_cmd.statut, 'inchange', true, 'updated_at', v_cmd.updated_at);
  END IF;

  IF NOT (
       (v_de = 'nouvelle'    AND v_vers IN ('preparation', 'livraison', 'livree', 'annulee'))
    OR (v_de = 'preparation' AND v_vers IN ('nouvelle', 'livraison', 'livree', 'annulee'))
    OR (v_de = 'livraison'   AND v_vers IN ('preparation', 'livree', 'annulee'))
  ) THEN
    RAISE EXCEPTION 'Changement impossible : % → %', v_cmd.statut, v_valeur;
  END IF;

  IF v_vers = 'annulee' THEN
    -- Remise en stock, ligne par ligne, selon les règles de creer_commande
    FOR v_ligne IN SELECT * FROM jsonb_array_elements(coalesce(v_cmd.contenu_panier, '[]'::jsonb)) LOOP
      v_q := nullif(v_ligne ->> 'quantite', '')::numeric;
      CONTINUE WHEN v_q IS NULL OR v_q <= 0;
      v_vid := nullif(v_ligne ->> 'variant_id', '')::uuid;
      v_pid := nullif(v_ligne ->> 'id', '')::uuid;
      IF v_vid IS NOT NULL AND EXISTS (SELECT 1 FROM public.product_variants WHERE id = v_vid AND stock IS NOT NULL) THEN
        UPDATE public.product_variants SET stock = stock + v_q WHERE id = v_vid;
      ELSIF v_pid IS NOT NULL THEN
        SELECT unite, stock INTO v_unite_prod, v_stock_prod FROM public.products WHERE id = v_pid;
        IF v_stock_prod IS NOT NULL AND (v_ligne ->> 'unite') IS NOT DISTINCT FROM v_unite_prod THEN
          UPDATE public.products SET stock = stock + round(v_q)::integer WHERE id = v_pid;
        END IF;
      END IF;
    END LOOP;

    -- Retrait des points gagnés avec cette commande (hors frais de livraison)
    IF v_cmd.user_id IS NOT NULL THEN
      v_points := floor(greatest(0, coalesce(v_cmd.total, 0) - coalesce(v_cmd.frais_livraison, 0)));
      UPDATE public.profiles SET loyalty_points = greatest(0, coalesce(loyalty_points, 0) - v_points)
       WHERE user_id = v_cmd.user_id;
    END IF;

    -- Le code promo redevient utilisable par ce client
    IF v_cmd.code_promo IS NOT NULL AND v_cmd.user_id IS NOT NULL THEN
      SELECT u.id INTO v_util FROM public.codes_promo_utilisations u
        JOIN public.codes_promo c ON c.id = u.code_promo_id
       WHERE u.user_id = v_cmd.user_id AND upper(c.code) = upper(v_cmd.code_promo)
       ORDER BY u.created_at DESC LIMIT 1;
      IF v_util IS NOT NULL THEN
        UPDATE public.codes_promo SET usage_count = greatest(0, usage_count - 1)
         WHERE id = (SELECT code_promo_id FROM public.codes_promo_utilisations WHERE id = v_util);
        DELETE FROM public.codes_promo_utilisations WHERE id = v_util;
      END IF;
    END IF;
  END IF;

  UPDATE public.commandes
     SET statut = v_valeur,
         motif_annulation = CASE WHEN v_vers = 'annulee' THEN btrim(p_motif) ELSE motif_annulation END
   WHERE id = p_id
  RETURNING * INTO v_cmd;

  RETURN jsonb_build_object('ok', true, 'statut', v_cmd.statut, 'updated_at', v_cmd.updated_at,
    'prevenir_client', v_vers IN ('livree', 'annulee') AND v_cmd.email_client IS NOT NULL);
END;
$function$;
REVOKE ALL ON FUNCTION public.changer_statut_commande(bigint, text, text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.changer_statut_commande(bigint, text, text, text) TO authenticated;

CREATE OR REPLACE FUNCTION public.push_retirer(p_cle text, p_endpoint text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
BEGIN
  IF NOT public.cle_serveur_valide(p_cle) THEN RAISE EXCEPTION 'Non autorisé' USING ERRCODE = '42501'; END IF;
  DELETE FROM public.abonnements_push WHERE endpoint = p_endpoint;
END;
$function$;
REVOKE ALL ON FUNCTION public.push_retirer(text, text) FROM PUBLIC, authenticated;
GRANT EXECUTE ON FUNCTION public.push_retirer(text, text) TO anon;
SELECT 'Mise à jour terminée' AS resultat;
COMMIT;
