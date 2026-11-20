-- Application de gestion (/gestion) : fondations dans la base.
--
--  1. Rôles d'équipe : admin, gerant, preparateur (app_metadata.role) et
--     droits par action (peut()). Le rôle « admin » garde tous ses accès
--     actuels : les règles existantes ne sont pas modifiées, on en ajoute.
--  2. Commandes : nouveaux statuts (En préparation, En livraison, annulée),
--     changement de statut contrôlé côté serveur (statut attendu vérifié,
--     transitions autorisées), annulation avec remise en stock, retrait des
--     points gagnés et restitution du code promo. Journal des statuts.
--  3. Stock et disponibilité modifiés par ajout / retrait côté serveur.
--  4. Date de dernière modification (updated_at) sur les produits, variantes,
--     codes promo et commandes, pour détecter les modifications simultanées.
--  5. Temps réel : commandes, journal, produits, variantes, codes promo.
--  6. Clients : liste et fiche, réservées aux rôles autorisés.
--  7. Notifications : abonnements des téléphones, préférences, anti-doublon.
--
-- Une transaction, relançable. Aucune donnée existante n'est supprimée ;
-- le contenu et le prix des commandes ne sont jamais modifiés.

BEGIN;

-- ---------------------------------------------------------------------------
-- 1. Rôles et droits
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.role_equipe()
 RETURNS text
 LANGUAGE sql
 STABLE
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
  SELECT CASE WHEN r IN ('admin', 'gerant', 'preparateur') THEN r END
    FROM (SELECT u.raw_app_meta_data ->> 'role' AS r FROM auth.users u WHERE u.id = auth.uid()) s;
$function$;

-- Droits : commandes, annuler, stock, catalogue, clients, promos, equipe
CREATE OR REPLACE FUNCTION public.peut(p_droit text)
 RETURNS boolean
 LANGUAGE sql
 STABLE
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
  SELECT coalesce(CASE public.role_equipe()
    WHEN 'admin' THEN true
    WHEN 'gerant' THEN p_droit <> 'equipe'
    WHEN 'preparateur' THEN p_droit IN ('commandes', 'stock')
    ELSE false END, false);
$function$;

REVOKE ALL ON FUNCTION public.role_equipe() FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.peut(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.role_equipe() TO authenticated;
GRANT EXECUTE ON FUNCTION public.peut(text) TO authenticated;

-- Clé serveur partagée (tâches planifiées, notifications) : même clé que
-- l'envoi des campagnes (MAIL_CRON_SECRET, mail_reglages.cle_traitement).
CREATE OR REPLACE FUNCTION public.cle_serveur_valide(p_cle text)
 RETURNS boolean
 LANGUAGE sql
 STABLE
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
  SELECT coalesce(p_cle IS NOT NULL AND length(p_cle) >= 32
    AND p_cle = (SELECT cle_traitement FROM public.mail_reglages WHERE id = 1), false);
$function$;
REVOKE ALL ON FUNCTION public.cle_serveur_valide(text) FROM PUBLIC, anon, authenticated;

-- ---------------------------------------------------------------------------
-- 4. Dates de modification (détection des modifications simultanées)
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.maj_updated_at()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$function$;

ALTER TABLE public.products         ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();
ALTER TABLE public.product_variants ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();
ALTER TABLE public.codes_promo      ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();
ALTER TABLE public.commandes        ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();
ALTER TABLE public.commandes        ADD COLUMN IF NOT EXISTS statut_modifie_le timestamptz;
ALTER TABLE public.commandes        ADD COLUMN IF NOT EXISTS motif_annulation text;

DROP TRIGGER IF EXISTS trg_products_updated_at ON public.products;
CREATE TRIGGER trg_products_updated_at BEFORE UPDATE ON public.products
  FOR EACH ROW EXECUTE FUNCTION public.maj_updated_at();
DROP TRIGGER IF EXISTS trg_product_variants_updated_at ON public.product_variants;
CREATE TRIGGER trg_product_variants_updated_at BEFORE UPDATE ON public.product_variants
  FOR EACH ROW EXECUTE FUNCTION public.maj_updated_at();
DROP TRIGGER IF EXISTS trg_codes_promo_updated_at ON public.codes_promo;
CREATE TRIGGER trg_codes_promo_updated_at BEFORE UPDATE ON public.codes_promo
  FOR EACH ROW EXECUTE FUNCTION public.maj_updated_at();

-- ---------------------------------------------------------------------------
-- 2. Commandes : statuts, journal, changement contrôlé
-- ---------------------------------------------------------------------------

-- Statut lisible et stable, quelle que soit l'écriture enregistrée
-- (« En attente », « livrée », « Livrée »…)
CREATE OR REPLACE FUNCTION public.statut_normalise(p_statut text)
 RETURNS text
 LANGUAGE sql
 IMMUTABLE
 SET search_path TO ''
AS $function$
  -- Clés courtes acceptées telles quelles ; « En livraison » ne commence
  -- pas par « livr » (la facture n'est émise qu'à « livrée »)
  SELECT CASE
    WHEN s IN ('nouvelle', 'preparation', 'livraison', 'livree', 'annulee') THEN s
    WHEN s LIKE 'en liv%' THEN 'livraison'
    WHEN s LIKE 'livr%' THEN 'livree'
    WHEN s LIKE 'annul%' THEN 'annulee'
    WHEN s LIKE 'en pr%' THEN 'preparation'
    ELSE 'nouvelle' END
    FROM (SELECT lower(btrim(coalesce(p_statut, ''))) AS s) x;
$function$;

CREATE TABLE IF NOT EXISTS public.commandes_journal (
  id          bigserial PRIMARY KEY,
  commande_id bigint NOT NULL REFERENCES public.commandes(id) ON DELETE CASCADE,
  de          text,
  vers        text NOT NULL,
  par         uuid,
  motif       text,
  le          timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS commandes_journal_commande ON public.commandes_journal (commande_id, le DESC);
CREATE INDEX IF NOT EXISTS commandes_journal_le ON public.commandes_journal (le DESC);
ALTER TABLE public.commandes_journal ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.commandes_journal FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public.commandes_journal TO authenticated;
DROP POLICY IF EXISTS commandes_journal_lecture ON public.commandes_journal;
CREATE POLICY commandes_journal_lecture ON public.commandes_journal
  FOR SELECT TO authenticated USING ((SELECT public.peut('commandes')));

-- Date de modification + journal, quel que soit le chemin (admin web ou appli)
CREATE OR REPLACE FUNCTION public.commandes_avant_maj()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
BEGIN
  NEW.updated_at := now();
  IF NEW.statut IS DISTINCT FROM OLD.statut THEN
    NEW.statut_modifie_le := now();
  END IF;
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.commandes_journaliser()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
BEGIN
  IF NEW.statut IS DISTINCT FROM OLD.statut THEN
    INSERT INTO public.commandes_journal (commande_id, de, vers, par, motif)
    VALUES (NEW.id, OLD.statut, NEW.statut, auth.uid(), NEW.motif_annulation);
  END IF;
  RETURN NULL;
END;
$function$;

DROP TRIGGER IF EXISTS trg_commandes_avant_maj ON public.commandes;
CREATE TRIGGER trg_commandes_avant_maj BEFORE UPDATE ON public.commandes
  FOR EACH ROW EXECUTE FUNCTION public.commandes_avant_maj();
DROP TRIGGER IF EXISTS trg_commandes_journal ON public.commandes;
CREATE TRIGGER trg_commandes_journal AFTER UPDATE OF statut ON public.commandes
  FOR EACH ROW EXECUTE FUNCTION public.commandes_journaliser();

-- Lecture des commandes et factures par l'équipe (le préparateur ne voit
-- que les commandes à livrer depuis la veille)
DROP POLICY IF EXISTS commandes_equipe_lecture ON public.commandes;
CREATE POLICY commandes_equipe_lecture ON public.commandes
  FOR SELECT TO authenticated
  USING ((SELECT public.peut('clients')) OR ((SELECT public.peut('commandes')) AND date_livraison >= current_date - 1));
DROP POLICY IF EXISTS factures_equipe_lecture ON public.factures;
CREATE POLICY factures_equipe_lecture ON public.factures
  FOR SELECT TO authenticated USING ((SELECT public.peut('commandes')));

-- Changement de statut contrôlé. Renvoie {ok:false, conflit:true, statut}
-- si la commande a changé entre-temps (rien n'est modifié).
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

-- ---------------------------------------------------------------------------
-- 3. Stock et disponibilité
-- ---------------------------------------------------------------------------

-- Ajoute (ou retire) une quantité. Stock illimité (vide) : refusé.
CREATE OR REPLACE FUNCTION public.ajuster_stock(p_produit uuid, p_variante uuid, p_delta numeric)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
DECLARE
  v_stock numeric;
  v_maj timestamptz;
BEGIN
  IF NOT public.peut('stock') THEN RAISE EXCEPTION 'Accès refusé' USING ERRCODE = '42501'; END IF;
  IF p_delta IS NULL OR abs(p_delta) > 1000000 THEN RAISE EXCEPTION 'Quantité invalide'; END IF;
  IF p_variante IS NOT NULL THEN
    UPDATE public.product_variants SET stock = greatest(0, stock + p_delta)
     WHERE id = p_variante AND product_id = p_produit::text AND stock IS NOT NULL
    RETURNING stock, updated_at INTO v_stock, v_maj;
  ELSE
    UPDATE public.products SET stock = greatest(0, stock + round(p_delta)::integer)
     WHERE id = p_produit AND stock IS NOT NULL
    RETURNING stock, updated_at INTO v_stock, v_maj;
  END IF;
  IF NOT FOUND THEN RAISE EXCEPTION 'Stock illimité ou produit introuvable'; END IF;
  RETURN jsonb_build_object('stock', v_stock, 'updated_at', v_maj);
END;
$function$;

-- Fixe le stock (NULL = illimité)
CREATE OR REPLACE FUNCTION public.definir_stock(p_produit uuid, p_variante uuid, p_valeur numeric)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
DECLARE
  v_stock numeric;
  v_maj timestamptz;
BEGIN
  IF NOT public.peut('stock') THEN RAISE EXCEPTION 'Accès refusé' USING ERRCODE = '42501'; END IF;
  IF p_valeur IS NOT NULL AND (p_valeur < 0 OR p_valeur > 1000000000) THEN RAISE EXCEPTION 'Quantité invalide'; END IF;
  IF p_variante IS NOT NULL THEN
    UPDATE public.product_variants SET stock = p_valeur WHERE id = p_variante AND product_id = p_produit::text
    RETURNING stock, updated_at INTO v_stock, v_maj;
  ELSE
    UPDATE public.products SET stock = round(p_valeur)::integer WHERE id = p_produit
    RETURNING stock, updated_at INTO v_stock, v_maj;
  END IF;
  IF NOT FOUND THEN RAISE EXCEPTION 'Produit introuvable'; END IF;
  RETURN jsonb_build_object('stock', v_stock, 'updated_at', v_maj);
END;
$function$;

-- Affiche ou masque un produit (ou une variante) sur le site
CREATE OR REPLACE FUNCTION public.definir_disponibilite(p_produit uuid, p_variante uuid, p_actif boolean)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
DECLARE
  v_maj timestamptz;
BEGIN
  IF NOT public.peut('stock') THEN RAISE EXCEPTION 'Accès refusé' USING ERRCODE = '42501'; END IF;
  IF p_actif IS NULL THEN RAISE EXCEPTION 'Valeur invalide'; END IF;
  IF p_variante IS NOT NULL THEN
    UPDATE public.product_variants SET actif = p_actif WHERE id = p_variante AND product_id = p_produit::text
    RETURNING updated_at INTO v_maj;
  ELSE
    UPDATE public.products SET actif = p_actif WHERE id = p_produit RETURNING updated_at INTO v_maj;
  END IF;
  IF NOT FOUND THEN RAISE EXCEPTION 'Produit introuvable'; END IF;
  RETURN jsonb_build_object('actif', p_actif, 'updated_at', v_maj);
END;
$function$;

REVOKE ALL ON FUNCTION public.ajuster_stock(uuid, uuid, numeric) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.definir_stock(uuid, uuid, numeric) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.definir_disponibilite(uuid, uuid, boolean) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.ajuster_stock(uuid, uuid, numeric) TO authenticated;
GRANT EXECUTE ON FUNCTION public.definir_stock(uuid, uuid, numeric) TO authenticated;
GRANT EXECUTE ON FUNCTION public.definir_disponibilite(uuid, uuid, boolean) TO authenticated;

-- Catalogue, fiches, photos et codes promo : mêmes accès que l'admin pour
-- les gérants (règles ajoutées, celles de l'admin restent en place)
DROP POLICY IF EXISTS products_equipe_insert ON public.products;
CREATE POLICY products_equipe_insert ON public.products FOR INSERT TO authenticated WITH CHECK ((SELECT public.peut('catalogue')));
DROP POLICY IF EXISTS products_equipe_update ON public.products;
CREATE POLICY products_equipe_update ON public.products FOR UPDATE TO authenticated USING ((SELECT public.peut('catalogue'))) WITH CHECK ((SELECT public.peut('catalogue')));
DROP POLICY IF EXISTS products_equipe_delete ON public.products;
CREATE POLICY products_equipe_delete ON public.products FOR DELETE TO authenticated USING ((SELECT public.peut('catalogue')));

DROP POLICY IF EXISTS variants_equipe_insert ON public.product_variants;
CREATE POLICY variants_equipe_insert ON public.product_variants FOR INSERT TO authenticated WITH CHECK ((SELECT public.peut('catalogue')));
DROP POLICY IF EXISTS variants_equipe_update ON public.product_variants;
CREATE POLICY variants_equipe_update ON public.product_variants FOR UPDATE TO authenticated USING ((SELECT public.peut('catalogue'))) WITH CHECK ((SELECT public.peut('catalogue')));
DROP POLICY IF EXISTS variants_equipe_delete ON public.product_variants;
CREATE POLICY variants_equipe_delete ON public.product_variants FOR DELETE TO authenticated USING ((SELECT public.peut('catalogue')));

DROP POLICY IF EXISTS fiches_produits_equipe ON public.fiches_produits;
CREATE POLICY fiches_produits_equipe ON public.fiches_produits FOR ALL TO authenticated USING ((SELECT public.peut('catalogue'))) WITH CHECK ((SELECT public.peut('catalogue')));
DROP POLICY IF EXISTS fiches_variantes_equipe ON public.fiches_variantes;
CREATE POLICY fiches_variantes_equipe ON public.fiches_variantes FOR ALL TO authenticated USING ((SELECT public.peut('catalogue'))) WITH CHECK ((SELECT public.peut('catalogue')));

DROP POLICY IF EXISTS codes_promo_equipe ON public.codes_promo;
CREATE POLICY codes_promo_equipe ON public.codes_promo FOR ALL TO authenticated USING ((SELECT public.peut('promos'))) WITH CHECK ((SELECT public.peut('promos')));
DROP POLICY IF EXISTS codes_promo_utilisations_equipe ON public.codes_promo_utilisations;
CREATE POLICY codes_promo_utilisations_equipe ON public.codes_promo_utilisations FOR SELECT TO authenticated USING ((SELECT public.peut('promos')));

DROP POLICY IF EXISTS produits_images_equipe_insert ON storage.objects;
CREATE POLICY produits_images_equipe_insert ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'produits-images' AND (SELECT public.peut('catalogue')));
DROP POLICY IF EXISTS produits_images_equipe_update ON storage.objects;
CREATE POLICY produits_images_equipe_update ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'produits-images' AND (SELECT public.peut('catalogue')))
  WITH CHECK (bucket_id = 'produits-images' AND (SELECT public.peut('catalogue')));
DROP POLICY IF EXISTS produits_images_equipe_delete ON storage.objects;
CREATE POLICY produits_images_equipe_delete ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'produits-images' AND (SELECT public.peut('catalogue')));

DROP POLICY IF EXISTS profiles_equipe_lecture ON public.profiles;
CREATE POLICY profiles_equipe_lecture ON public.profiles FOR SELECT TO authenticated USING ((SELECT public.peut('clients')));

-- ---------------------------------------------------------------------------
-- 6. Clients
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.gestion_clients(p_recherche text DEFAULT NULL, p_limite integer DEFAULT 100, p_decalage integer DEFAULT 0)
 RETURNS TABLE (user_id uuid, email text, nom text, telephone text, adresse text, inscrit_le timestamptz,
                nb_commandes bigint, total numeric, derniere_commande timestamptz, accepte_offres boolean, points integer)
 LANGUAGE plpgsql
 STABLE
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
DECLARE
  v_q text := nullif(btrim(coalesce(p_recherche, '')), '');
BEGIN
  IF NOT public.peut('clients') THEN RAISE EXCEPTION 'Accès refusé' USING ERRCODE = '42501'; END IF;
  RETURN QUERY
  WITH c AS (
    SELECT cm.user_id AS uid,
           count(*) FILTER (WHERE public.statut_normalise(cm.statut) <> 'annulee') AS nb,
           coalesce(sum(cm.total) FILTER (WHERE public.statut_normalise(cm.statut) <> 'annulee'), 0)::numeric AS tot,
           max(cm.created_at) AS derniere,
           (array_agg(cm.nom_client ORDER BY cm.created_at DESC))[1] AS nom,
           (array_agg(cm.telephone_client ORDER BY cm.created_at DESC))[1] AS tel,
           (array_agg(cm.adresse_livraison ORDER BY cm.created_at DESC))[1] AS adr
      FROM public.commandes cm WHERE cm.user_id IS NOT NULL GROUP BY cm.user_id
  )
  SELECT u.id, lower(u.email)::text,
         coalesce(nullif(btrim(concat_ws(' ', u.raw_user_meta_data ->> 'first_name', u.raw_user_meta_data ->> 'last_name')), ''), c.nom)::text,
         coalesce(nullif(u.raw_user_meta_data ->> 'phone', ''), c.tel)::text,
         c.adr::text, u.created_at, coalesce(c.nb, 0), coalesce(c.tot, 0), c.derniere,
         coalesce(pm.accepte_offres, u.raw_user_meta_data ->> 'accepts_marketing' = 'true', false),
         coalesce(p.loyalty_points, 0)
    FROM auth.users u
    LEFT JOIN c ON c.uid = u.id
    LEFT JOIN public.profiles p ON p.user_id = u.id
    LEFT JOIN public.preferences_mail pm ON pm.user_id = u.id
   WHERE coalesce(u.raw_app_meta_data ->> 'role', '') NOT IN ('admin', 'gerant', 'preparateur')
     AND (v_q IS NULL OR u.email ILIKE '%' || v_q || '%' OR c.nom ILIKE '%' || v_q || '%'
          OR c.tel ILIKE '%' || v_q || '%' OR c.adr ILIKE '%' || v_q || '%'
          OR (u.raw_user_meta_data ->> 'first_name') ILIKE '%' || v_q || '%'
          OR (u.raw_user_meta_data ->> 'last_name') ILIKE '%' || v_q || '%')
   ORDER BY c.derniere DESC NULLS LAST, u.created_at DESC
   LIMIT least(greatest(coalesce(p_limite, 100), 1), 500) OFFSET greatest(coalesce(p_decalage, 0), 0);
END;
$function$;

CREATE OR REPLACE FUNCTION public.gestion_client(p_user uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
DECLARE
  v jsonb;
BEGIN
  IF NOT public.peut('clients') THEN RAISE EXCEPTION 'Accès refusé' USING ERRCODE = '42501'; END IF;
  SELECT jsonb_build_object(
    'user_id', u.id,
    'email', lower(u.email),
    'prenom', u.raw_user_meta_data ->> 'first_name',
    'nom', u.raw_user_meta_data ->> 'last_name',
    'telephone', u.raw_user_meta_data ->> 'phone',
    'inscrit_le', u.created_at,
    'points', coalesce(p.loyalty_points, 0),
    'code_parrainage', p.referral_code,
    'parraine_par', (SELECT lower(x.email) FROM auth.users x WHERE x.id = p.referred_by),
    'filleuls', (SELECT count(*) FROM public.profiles f WHERE f.referred_by = u.id),
    'accepte_offres', coalesce(pm.accepte_offres, u.raw_user_meta_data ->> 'accepts_marketing' = 'true', false),
    'commandes', coalesce((SELECT jsonb_agg(jsonb_build_object('id', cm.id, 'created_at', cm.created_at,
        'date_livraison', cm.date_livraison, 'total', cm.total, 'statut', cm.statut,
        'nom_client', cm.nom_client, 'telephone_client', cm.telephone_client, 'adresse_livraison', cm.adresse_livraison)
        ORDER BY cm.created_at DESC)
      FROM (SELECT * FROM public.commandes WHERE user_id = u.id ORDER BY created_at DESC LIMIT 100) cm), '[]'::jsonb),
    'produits_preferes', coalesce((SELECT jsonb_agg(t.nom ORDER BY t.n DESC) FROM (
        SELECT coalesce(l ->> 'name', l ->> 'nom') AS nom, count(*) AS n
          FROM public.commandes cm, jsonb_array_elements(coalesce(cm.contenu_panier, '[]'::jsonb)) l
         WHERE cm.user_id = u.id AND public.statut_normalise(cm.statut) <> 'annulee'
         GROUP BY 1 ORDER BY 2 DESC LIMIT 5) t), '[]'::jsonb)
  ) INTO v
    FROM auth.users u
    LEFT JOIN public.profiles p ON p.user_id = u.id
    LEFT JOIN public.preferences_mail pm ON pm.user_id = u.id
   WHERE u.id = p_user;
  IF v IS NULL THEN RAISE EXCEPTION 'Client introuvable'; END IF;
  RETURN v;
END;
$function$;

REVOKE ALL ON FUNCTION public.gestion_clients(text, integer, integer) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.gestion_client(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.gestion_clients(text, integer, integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.gestion_client(uuid) TO authenticated;

-- ---------------------------------------------------------------------------
-- 7. Notifications
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.abonnements_push (
  id        uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id   uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  endpoint  text NOT NULL UNIQUE CHECK (endpoint LIKE 'https://%' AND length(endpoint) <= 1000),
  p256dh    text NOT NULL CHECK (length(p256dh) <= 200),
  auth      text NOT NULL CHECK (length(auth) <= 100),
  appareil  text CHECK (length(appareil) <= 80),
  cree_le   timestamptz NOT NULL DEFAULT now(),
  vu_le     timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.abonnements_push ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.abonnements_push FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.abonnements_push TO authenticated;
DROP POLICY IF EXISTS abonnements_push_soi ON public.abonnements_push;
CREATE POLICY abonnements_push_soi ON public.abonnements_push FOR ALL TO authenticated
  USING (user_id = (SELECT auth.uid()) AND (SELECT public.role_equipe()) IS NOT NULL)
  WITH CHECK (user_id = (SELECT auth.uid()) AND (SELECT public.role_equipe()) IS NOT NULL);

CREATE TABLE IF NOT EXISTS public.preferences_gestion (
  user_id           uuid PRIMARY KEY DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  nouvelle_commande boolean NOT NULL DEFAULT true,
  annulation        boolean NOT NULL DEFAULT true,
  non_confirmee     boolean NOT NULL DEFAULT true,
  stock_bas         boolean NOT NULL DEFAULT true,
  journee_complete  boolean NOT NULL DEFAULT false,
  resume_soir       boolean NOT NULL DEFAULT false,
  heures_calmes     boolean NOT NULL DEFAULT true,
  verrouillage      boolean NOT NULL DEFAULT false,
  maj_le            timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.preferences_gestion ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.preferences_gestion FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT, UPDATE ON public.preferences_gestion TO authenticated;
DROP POLICY IF EXISTS preferences_gestion_soi ON public.preferences_gestion;
CREATE POLICY preferences_gestion_soi ON public.preferences_gestion FOR ALL TO authenticated
  USING (user_id = (SELECT auth.uid()) AND (SELECT public.role_equipe()) IS NOT NULL)
  WITH CHECK (user_id = (SELECT auth.uid()) AND (SELECT public.role_equipe()) IS NOT NULL);

-- Anti-doublon : une notification par événement
CREATE TABLE IF NOT EXISTS public.notifications_envoyees (
  cle        text PRIMARY KEY CHECK (length(cle) <= 120),
  envoyee_le timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.notifications_envoyees ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.notifications_envoyees FROM PUBLIC, anon, authenticated;

-- Destinataires d'un événement (appelé par le serveur avec la clé serveur).
-- Renvoie une liste vide si l'événement a déjà été notifié.
CREATE OR REPLACE FUNCTION public.push_destinataires(p_cle text, p_evenement text, p_cle_unique text)
 RETURNS TABLE (endpoint text, p256dh text, auth text, heures_calmes boolean)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
BEGIN
  IF NOT public.cle_serveur_valide(p_cle) THEN RAISE EXCEPTION 'Non autorisé' USING ERRCODE = '42501'; END IF;
  IF p_evenement NOT IN ('nouvelle_commande', 'annulation', 'non_confirmee', 'stock_bas', 'journee_complete', 'resume_soir', 'test') THEN
    RAISE EXCEPTION 'Événement inconnu';
  END IF;
  IF p_evenement <> 'test' THEN
    INSERT INTO public.notifications_envoyees (cle) VALUES (left(p_cle_unique, 120)) ON CONFLICT DO NOTHING;
    IF NOT FOUND THEN RETURN; END IF;
  END IF;
  RETURN QUERY
  SELECT a.endpoint, a.p256dh, a.auth, coalesce(g.heures_calmes, true)
    FROM public.abonnements_push a
    JOIN auth.users u ON u.id = a.user_id
    LEFT JOIN public.preferences_gestion g ON g.user_id = a.user_id
   WHERE coalesce(u.raw_app_meta_data ->> 'role', '') IN ('admin', 'gerant', 'preparateur')
     AND (p_evenement = 'test'
       OR (p_evenement = 'nouvelle_commande' AND coalesce(g.nouvelle_commande, true))
       OR (p_evenement = 'annulation' AND coalesce(g.annulation, true))
       OR (p_evenement = 'non_confirmee' AND coalesce(g.non_confirmee, true))
       OR (p_evenement = 'stock_bas' AND coalesce(g.stock_bas, true) AND u.raw_app_meta_data ->> 'role' IN ('admin', 'gerant'))
       OR (p_evenement = 'journee_complete' AND coalesce(g.journee_complete, false))
       OR (p_evenement = 'resume_soir' AND coalesce(g.resume_soir, false)));
END;
$function$;

-- Abonnement expiré (le service de notifications a répondu 404 / 410)
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

REVOKE ALL ON FUNCTION public.push_destinataires(text, text, text) FROM PUBLIC, authenticated;
REVOKE ALL ON FUNCTION public.push_retirer(text, text) FROM PUBLIC, authenticated;
GRANT EXECUTE ON FUNCTION public.push_destinataires(text, text, text) TO anon;
GRANT EXECUTE ON FUNCTION public.push_retirer(text, text) TO anon;

-- ---------------------------------------------------------------------------
-- 5. Temps réel (les règles d'accès s'appliquent aussi aux abonnés)
-- ---------------------------------------------------------------------------

DO $$
DECLARE
  t text;
BEGIN
  IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
    FOREACH t IN ARRAY ARRAY['commandes', 'commandes_journal', 'products', 'product_variants', 'codes_promo'] LOOP
      IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = t) THEN
        EXECUTE format('ALTER PUBLICATION supabase_realtime ADD TABLE public.%I', t);
      END IF;
    END LOOP;
  END IF;
END $$;

COMMIT;
