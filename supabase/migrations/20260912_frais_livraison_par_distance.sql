-- Frais de livraison selon la distance au relais le plus proche.
-- Paliers : ≤3 km = 3€, ≤6 km = 4€, ≤10 km = 5€. Gratuit dès 40€ (option A).
-- On stocke le frais facturé + la distance dans la commande pour que les
-- factures lisent la valeur réelle au lieu de la recalculer.
ALTER TABLE public.commandes ADD COLUMN IF NOT EXISTS frais_livraison numeric;
ALTER TABLE public.commandes ADD COLUMN IF NOT EXISTS distance_km numeric;

CREATE OR REPLACE FUNCTION public.creer_commande(p_items jsonb, p_infos jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_uid uuid := auth.uid();
  v_item jsonb;
  v_pid uuid;
  v_qte numeric;
  v_variant_id text;
  v_prod record;
  v_variant_nom text;
  v_qte_eff numeric;
  v_prix_unit numeric;
  v_ligne numeric;
  v_seuil numeric;
  v_offert numeric;
  v_taille_lot numeric;
  v_nb_lots numeric;
  v_reste numeric;
  v_qte_payante numeric;
  v_sous_total numeric := 0;
  v_contenu jsonb := '[]'::jsonb;
  v_desc text := '';
  v_nom_ligne text;
  v_nom text := trim(coalesce(p_infos->>'nom',''));
  v_tel text := trim(coalesce(p_infos->>'telephone',''));
  v_adresse text := trim(coalesce(p_infos->>'adresse',''));
  v_date date := nullif(p_infos->>'date_livraison','')::date;
  v_commentaire text := nullif(trim(coalesce(p_infos->>'commentaire','')),'');
  v_code text := nullif(upper(trim(coalesce(p_infos->>'code_promo',''))),'');
  v_apply_loyalty boolean := coalesce((p_infos->>'apply_loyalty')::boolean, false);
  v_apply_referral boolean := coalesce((p_infos->>'apply_referral')::boolean, false);
  v_lat numeric := nullif(p_infos->>'lat','')::numeric;
  v_lon numeric := nullif(p_infos->>'lon','')::numeric;
  v_dist numeric;
  v_code_id uuid;
  v_code_pct integer := 0;
  v_remise_code numeric := 0;
  v_prof record;
  v_remise_pct integer := 0;
  v_remise_montant numeric := 0;
  v_total_apres numeric;
  v_frais numeric := 0;
  v_total numeric;
  v_points integer;
  v_cmd_id bigint;
  v_count integer;
  v_config record;
  v_exc_ferme boolean;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'Connexion requise'; END IF;
  IF v_nom = '' OR v_tel = '' OR v_adresse = '' THEN RAISE EXCEPTION 'Informations de livraison incomplètes'; END IF;
  IF v_date IS NULL THEN RAISE EXCEPTION 'Date de livraison requise'; END IF;
  IF jsonb_typeof(p_items) <> 'array' OR jsonb_array_length(p_items) = 0 THEN RAISE EXCEPTION 'Panier vide'; END IF;

  SELECT jours_semaine, max_commandes_par_jour INTO v_config FROM config_calendrier WHERE id = 1;
  IF v_config IS NULL THEN RAISE EXCEPTION 'Calendrier indisponible'; END IF;
  IF v_date < ((now() AT TIME ZONE 'Europe/Paris')::date + 1) THEN
    RAISE EXCEPTION 'Date de livraison invalide';
  END IF;
  SELECT ferme INTO v_exc_ferme FROM dates_livraison_exceptions WHERE date = v_date;
  IF FOUND THEN
    IF v_exc_ferme THEN RAISE EXCEPTION 'Date de livraison indisponible'; END IF;
  ELSIF NOT (extract(dow FROM v_date)::int = ANY (v_config.jours_semaine)) THEN
    RAISE EXCEPTION 'Date de livraison indisponible';
  END IF;
  SELECT count(*) INTO v_count FROM commandes WHERE date_livraison = v_date;
  IF v_count >= v_config.max_commandes_par_jour THEN RAISE EXCEPTION 'Date de livraison complète'; END IF;

  FOR v_item IN SELECT * FROM jsonb_array_elements(p_items)
  LOOP
    v_pid := (v_item->>'id')::uuid;
    v_qte := (v_item->>'quantite')::numeric;
    v_variant_id := nullif(v_item->>'variant_id','');
    IF v_qte IS NULL OR v_qte <= 0 THEN RAISE EXCEPTION 'Quantité invalide'; END IF;

    SELECT id, name, price, promotion, seuil_achat, quantite_offerte,
           seuil_promo_qte, prix_promo, unite, stock, actif
      INTO v_prod FROM products WHERE id = v_pid FOR UPDATE;
    IF NOT FOUND THEN RAISE EXCEPTION 'Produit introuvable'; END IF;
    IF v_prod.actif = false THEN RAISE EXCEPTION 'Produit indisponible : %', v_prod.name; END IF;
    IF v_prod.stock IS NOT NULL AND v_prod.stock < v_qte THEN
      RAISE EXCEPTION 'Stock insuffisant pour : %', v_prod.name;
    END IF;

    v_qte_eff := CASE WHEN v_prod.unite = 'g' THEN v_qte/1000 ELSE v_qte END;

    IF coalesce(v_prod.seuil_promo_qte,0) > 0 AND coalesce(v_prod.prix_promo,0) > 0
       AND v_qte_eff >= v_prod.seuil_promo_qte THEN
      v_prix_unit := v_prod.prix_promo;
      v_ligne := v_qte_eff * v_prod.prix_promo;
    ELSE
      v_prix_unit := v_prod.price;
      IF coalesce(v_prod.promotion,0) > 0 THEN
        v_prix_unit := v_prix_unit * (1 - v_prod.promotion::numeric/100);
      END IF;
      v_seuil := coalesce(v_prod.seuil_achat,0);
      v_offert := coalesce(v_prod.quantite_offerte,0);
      IF v_seuil > 0 AND v_offert > 0 THEN
        v_taille_lot := v_seuil + v_offert;
        v_nb_lots := floor(v_qte / v_taille_lot);
        v_reste := v_qte - (v_nb_lots * v_taille_lot);
        v_qte_payante := (v_nb_lots * v_seuil) + least(v_reste, v_seuil);
        v_ligne := v_qte_payante * v_prix_unit;
      ELSE
        v_ligne := v_qte_eff * v_prix_unit;
      END IF;
    END IF;

    IF v_prod.stock IS NOT NULL THEN
      UPDATE products SET stock = stock - v_qte WHERE id = v_pid;
    END IF;

    v_variant_nom := NULL;
    IF v_variant_id IS NOT NULL THEN
      SELECT nom INTO v_variant_nom FROM product_variants
        WHERE id::text = v_variant_id AND product_id = v_pid::text;
    END IF;

    v_nom_ligne := v_prod.name || CASE WHEN v_variant_nom IS NOT NULL THEN ' – ' || v_variant_nom ELSE '' END;
    v_sous_total := v_sous_total + v_ligne;
    v_desc := v_desc || CASE WHEN v_desc = '' THEN '' ELSE ', ' END || v_qte::text || 'x ' || v_nom_ligne;

    v_contenu := v_contenu || jsonb_build_object(
      'id', v_prod.id,
      'name', v_nom_ligne,
      'nom', v_nom_ligne,
      'quantite', v_qte,
      'unite', v_prod.unite,
      'price', v_prod.price,
      'promotion', v_prod.promotion,
      'seuil_achat', v_prod.seuil_achat,
      'quantite_offerte', v_prod.quantite_offerte,
      'seuil_promo_qte', v_prod.seuil_promo_qte,
      'prix_promo', v_prod.prix_promo,
      'prixUnitaire', round(v_prix_unit, 2),
      'prixTotalLigne', round(v_ligne, 2),
      'variant_id', v_variant_id,
      'variant_nom', v_variant_nom
    );
  END LOOP;

  IF v_code IS NOT NULL THEN
    IF v_apply_loyalty OR v_apply_referral THEN
      RAISE EXCEPTION 'Un code promo ne peut pas être cumulé avec une autre remise';
    END IF;
    SELECT id, reduction_pct INTO v_code_id, v_code_pct
      FROM codes_promo WHERE code = v_code AND actif = true;
    IF v_code_id IS NULL THEN RAISE EXCEPTION 'Code promo invalide'; END IF;
    BEGIN
      INSERT INTO codes_promo_utilisations (user_id, code_promo_id) VALUES (v_uid, v_code_id);
    EXCEPTION WHEN unique_violation THEN
      RAISE EXCEPTION 'Code promo déjà utilisé';
    END;
    UPDATE codes_promo SET usage_count = usage_count + 1 WHERE id = v_code_id;
    v_remise_code := round(v_sous_total * v_code_pct / 100.0, 2);
  END IF;

  IF v_apply_loyalty OR v_apply_referral THEN
    SELECT loyalty_points, has_referral_discount, referral_pending INTO v_prof
      FROM profiles WHERE user_id = v_uid FOR UPDATE;
    IF NOT FOUND THEN RAISE EXCEPTION 'Profil introuvable'; END IF;
    IF v_apply_loyalty THEN
      IF coalesce(v_prof.loyalty_points,0) < 100 THEN RAISE EXCEPTION 'Points de fidélité insuffisants'; END IF;
      v_remise_pct := v_remise_pct + 10;
    END IF;
    IF v_apply_referral THEN
      IF NOT (v_prof.has_referral_discount AND NOT v_prof.referral_pending) THEN
        RAISE EXCEPTION 'Remise parrainage non disponible';
      END IF;
      v_remise_pct := v_remise_pct + 10;
    END IF;
    v_remise_montant := v_sous_total * v_remise_pct / 100.0;
  END IF;

  v_total_apres := v_sous_total - v_remise_montant - v_remise_code;
  IF v_total_apres < 10 THEN RAISE EXCEPTION 'Minimum de commande : 10€'; END IF;

  -- Frais de livraison selon la distance au relais le plus proche.
  -- Gratuit dès 40€ de sous-total (option A) ; sinon 3€ / 4€ / 5€ par palier.
  IF v_sous_total >= 40 THEN
    v_frais := 0;
  ELSE
    IF v_lat IS NOT NULL AND v_lon IS NOT NULL THEN
      SELECT min(
        2 * 6371 * asin(sqrt(
          power(sin(radians(r.lat - v_lat) / 2), 2) +
          cos(radians(v_lat)) * cos(radians(r.lat)) * power(sin(radians(r.lon - v_lon) / 2), 2)
        ))
      ) INTO v_dist
      FROM (VALUES
        (48.8897::numeric, 2.1574::numeric),
        (48.8794::numeric, 2.1431::numeric),
        (48.8944::numeric, 1.8681::numeric),
        (48.8594::numeric, 2.0186::numeric),
        (48.8111::numeric, 1.9472::numeric)
      ) AS r(lat, lon);
    END IF;

    IF v_dist IS NULL THEN
      v_frais := 3;               -- fallback si coordonnées manquantes
    ELSIF v_dist <= 3 THEN
      v_frais := 3;
    ELSIF v_dist <= 6 THEN
      v_frais := 4;
    ELSE
      v_frais := 5;
    END IF;
  END IF;

  v_total := round(v_total_apres + v_frais, 2);

  INSERT INTO commandes (
    user_id, nom_client, telephone_client, adresse_livraison, total,
    methode_paiement, statut, description_commande, commentaire_client,
    contenu_panier, email_client, date_livraison, code_promo, remise_code_pct,
    frais_livraison, distance_km
  ) VALUES (
    v_uid, v_nom, v_tel, v_adresse, v_total,
    'Espèces', 'En attente', v_desc, v_commentaire,
    v_contenu, (SELECT email FROM auth.users WHERE id = v_uid), v_date,
    CASE WHEN v_code_id IS NOT NULL THEN v_code ELSE NULL END,
    CASE WHEN v_code_id IS NOT NULL THEN v_code_pct ELSE NULL END,
    v_frais, CASE WHEN v_dist IS NOT NULL THEN round(v_dist, 2) ELSE NULL END
  ) RETURNING id INTO v_cmd_id;

  v_points := floor(v_total_apres);
  UPDATE profiles SET
    loyalty_points = GREATEST(0,
      CASE WHEN v_apply_loyalty THEN v_points ELSE coalesce(loyalty_points,0) + v_points END),
    has_referral_discount = CASE
      WHEN v_apply_referral THEN false
      WHEN referral_pending THEN true
      ELSE has_referral_discount END,
    referral_pending = CASE WHEN referral_pending THEN false ELSE referral_pending END
  WHERE user_id = v_uid;

  RETURN jsonb_build_object(
    'id', v_cmd_id,
    'total', v_total,
    'total_apres_remise', v_total_apres,
    'frais_livraison', v_frais,
    'distance_km', round(coalesce(v_dist, 0), 2),
    'remise_code', v_remise_code
  );
END;
$function$;
