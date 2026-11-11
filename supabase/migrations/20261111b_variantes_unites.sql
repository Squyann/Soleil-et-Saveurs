-- Variantes : unité de vente, remise % et stock propres à chaque variante, et
-- lien vers le produit d'origine en cas de regroupement.
--
-- product_variants :
--   unite      : unité de vente de la variante (pièce, kg, g, botte, barquette),
--                vide = celle du produit.
--   pas_g      : pas de quantité pour une variante vendue au gramme.
--   promotion  : remise % propre à la variante, vide = celle du produit.
--   stock      : stock propre à la variante, vide = stock du produit (variantes
--                dans l'unité du produit) ou illimité (autre unité).
--   source_product_id : produit d'origine quand la variante vient d'un
--                regroupement (le produit d'origine est seulement désactivé).
--
-- creer_commande : chaque ligne utilise le prix, l'unité, la remise et le stock
-- de sa variante. Les promotions par quantité du produit (prix dégressif, lot,
-- premières offertes) portent sur le total des variantes vendues dans l'unité
-- du produit ; les autres variantes gardent la remise %. Calcul identique à
-- src/lib/prix.ts / src/lib/panier.ts. Inchangé pour un produit sans variante
-- et pour les variantes sans unité ni remise propres.
--
-- Fonction remplacée seulement si sa version actuelle est celle attendue
-- (migration 20261105). Une transaction, relançable.

BEGIN;

ALTER TABLE public.product_variants ADD COLUMN IF NOT EXISTS unite text;
ALTER TABLE public.product_variants ADD COLUMN IF NOT EXISTS pas_g integer;
ALTER TABLE public.product_variants ADD COLUMN IF NOT EXISTS promotion numeric;
ALTER TABLE public.product_variants ADD COLUMN IF NOT EXISTS stock numeric;
ALTER TABLE public.product_variants ADD COLUMN IF NOT EXISTS source_product_id uuid;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'product_variants_unite_valide') THEN
    ALTER TABLE public.product_variants ADD CONSTRAINT product_variants_unite_valide
      CHECK (unite IS NULL OR unite IN ('kg', 'g', 'pièce', 'botte', 'barquette'));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'product_variants_valeurs_valides') THEN
    ALTER TABLE public.product_variants ADD CONSTRAINT product_variants_valeurs_valides
      CHECK ((pas_g IS NULL OR pas_g > 0) AND (promotion IS NULL OR (promotion >= 0 AND promotion <= 100)) AND (stock IS NULL OR stock >= 0));
  END IF;
END $$;

DO $garde$
DECLARE
  v_def text;
BEGIN
  SELECT pg_get_functiondef(p.oid) INTO v_def
    FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
   WHERE n.nspname = 'public' AND p.proname = 'creer_commande'
     AND pg_get_function_identity_arguments(p.oid) = 'p_items jsonb, p_infos jsonb';
  IF v_def IS NULL THEN RAISE EXCEPTION 'creer_commande(jsonb, jsonb) introuvable — migration annulée'; END IF;
  IF position('Variantes : unité, prix, remise et stock propres' in v_def) > 0 THEN
    RAISE NOTICE 'creer_commande déjà à jour : mise à jour simple';
    RETURN;
  END IF;
  IF md5(regexp_replace(v_def, '\s+', ' ', 'g')) <> '0a56ddfb3de2e0743c0ade621e2e07a5' THEN
    RAISE EXCEPTION 'creer_commande n''est pas la version attendue (migration 20261105). Rien n''a été changé.';
  END IF;
END
$garde$;

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
  v_prod record;
  v_var record;
  v_ligne_rec record;
  v_idx record;
  -- lignes du produit en cours (une par variante)
  v_ords integer[];
  v_qtes numeric[];
  v_bases numeric[];
  v_units numeric[];
  v_offerts numeric[];
  v_vids text[];
  v_vnoms text[];
  v_noms text[];
  v_imgs text[];
  v_n integer;
  i integer;
  v_q_total numeric;
  v_q_eff_total numeric;
  v_eff_div numeric;
  v_ecart numeric;
  v_seuil numeric;
  v_offert numeric;
  v_taille_lot numeric;
  v_nb_lots numeric;
  v_reste numeric;
  v_a_offrir numeric;
  v_f numeric;
  v_ligne numeric;
  v_degressif boolean;
  v_lignes jsonb := '[]'::jsonb;
  v_sous_total numeric := 0;
  v_contenu jsonb := '[]'::jsonb;
  v_desc text := '';
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
  v_geo_dispo boolean;
  v_geo_statut integer;
  v_geo_contenu text;
  v_geo_url text;
  v_feat jsonb;
  v_code_commune text;
  v_unites text[];
  v_pcts numeric[];
  v_s0 boolean[];
  v_stock_propre boolean[];
  v_unite_ligne text;
  v_nom_ligne text;
  v_q_stock numeric;
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

  -- Contrôle des articles reçus
  FOR v_item IN SELECT * FROM jsonb_array_elements(p_items)
  LOOP
    IF nullif(v_item->>'id','') IS NULL THEN RAISE EXCEPTION 'Produit introuvable'; END IF;
    v_qte := (v_item->>'quantite')::numeric;
    IF v_qte IS NULL OR v_qte <= 0 THEN RAISE EXCEPTION 'Quantité invalide'; END IF;
  END LOOP;

  -- Variantes : unité, prix, remise et stock propres (migration 20261111b).
  -- Géocodage serveur de l'adresse (extension http) : les frais et la zone de
  -- livraison ne dépendent plus de la position envoyée par le navigateur, qui
  -- pouvait être falsifiée (frais à 3 € au lieu de 5 €, commande hors 78).
  -- Même service et même requête que le site (api-adresse.data.gouv.fr,
  -- premier résultat). Fait avant de verrouiller les produits.
  v_geo_dispo := EXISTS (SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
                          WHERE n.nspname = 'extensions' AND p.proname = 'http_get');
  IF v_geo_dispo THEN
    v_lat := NULL;
    v_lon := NULL;
    v_geo_statut := NULL;
    BEGIN
      EXECUTE 'SELECT extensions.http_set_curlopt(''CURLOPT_TIMEOUT_MS'', ''4000'')';
      EXECUTE 'SELECT ''https://api-adresse.data.gouv.fr/search/?limit=1&q='' || extensions.urlencode($1)'
        INTO v_geo_url USING v_adresse;
      EXECUTE 'SELECT status, content FROM extensions.http_get($1)'
        INTO v_geo_statut, v_geo_contenu USING v_geo_url;
    EXCEPTION WHEN OTHERS THEN
      v_geo_statut := NULL;  -- service injoignable : frais au palier maximum
    END;
    IF v_geo_statut = 200 THEN
      v_feat := (v_geo_contenu::jsonb) -> 'features' -> 0;
      IF v_feat IS NULL THEN
        RAISE EXCEPTION 'Adresse introuvable : vérifiez votre adresse de livraison';
      END IF;
      v_code_commune := coalesce(v_feat -> 'properties' ->> 'citycode', v_feat -> 'properties' ->> 'postcode', '');
      IF left(v_code_commune, 2) <> '78' THEN
        RAISE EXCEPTION 'Désolé, nous livrons uniquement dans les Yvelines (78)';
      END IF;
      v_lon := (v_feat -> 'geometry' -> 'coordinates' ->> 0)::numeric;
      v_lat := (v_feat -> 'geometry' -> 'coordinates' ->> 1)::numeric;
    END IF;
  END IF;

  -- Un passage par produit (verrouillés dans un ordre fixe) : toutes ses
  -- variantes sont calculées ensemble pour les promotions et le stock.
  FOR v_pid IN SELECT DISTINCT (e->>'id')::uuid FROM jsonb_array_elements(p_items) e ORDER BY 1
  LOOP
    SELECT id, name, price, promotion, seuil_achat, quantite_offerte,
           seuil_promo_qte, prix_promo, unite, stock, actif, premieres_offertes,
           image_url, variantes_cumulables
      INTO v_prod FROM products WHERE id = v_pid FOR UPDATE;
    IF NOT FOUND THEN RAISE EXCEPTION 'Produit introuvable'; END IF;
    IF v_prod.actif = false THEN RAISE EXCEPTION 'Produit indisponible : %', v_prod.name; END IF;

    v_ords := '{}'; v_qtes := '{}'; v_bases := '{}'; v_vids := '{}'; v_vnoms := '{}'; v_noms := '{}'; v_imgs := '{}';
    v_unites := '{}'; v_pcts := '{}'; v_s0 := '{}'; v_stock_propre := '{}';
    -- Lignes du produit, une par variante (doublons additionnés), dans l'ordre du panier.
    -- Chaque variante a son prix, son unité, sa remise % et éventuellement son
    -- propre stock (champs vides = ceux du produit).
    FOR v_ligne_rec IN
      SELECT min(o)::integer AS ord, nullif(e->>'variant_id','') AS vid, sum((e->>'quantite')::numeric) AS qte
        FROM jsonb_array_elements(p_items) WITH ORDINALITY AS t(e, o)
       WHERE (e->>'id')::uuid = v_pid
       GROUP BY nullif(e->>'variant_id','')
       ORDER BY min(o)
    LOOP
      v_ords := v_ords || v_ligne_rec.ord;
      v_qtes := v_qtes || v_ligne_rec.qte;
      v_vids := v_vids || v_ligne_rec.vid;
      IF v_ligne_rec.vid IS NOT NULL THEN
        SELECT nom, prix, image_url, actif, unite, promotion, stock INTO v_var FROM product_variants
         WHERE id::text = v_ligne_rec.vid AND product_id = v_pid::text FOR UPDATE;
        IF NOT FOUND THEN RAISE EXCEPTION 'Variante introuvable pour : %', trim(v_prod.name); END IF;
        IF v_var.actif = false THEN RAISE EXCEPTION 'Variante indisponible : % – %', trim(v_prod.name), v_var.nom; END IF;
        -- Nom affiché : celui de la variante s'il commence comme celui du produit
        -- (« Ananas doux préparé », « Melon préparé »), sinon « Salade – Batavia »
        v_nom_ligne := CASE
          WHEN lower(split_part(regexp_replace(trim(v_var.nom), '\s+', ' ', 'g'), ' ', 1))
             = lower(split_part(regexp_replace(trim(v_prod.name), '\s+', ' ', 'g'), ' ', 1)) THEN v_var.nom
          ELSE v_prod.name || ' – ' || v_var.nom END;
        v_bases := v_bases || coalesce(v_var.prix, v_prod.price);
        v_vnoms := v_vnoms || v_var.nom;
        v_imgs := v_imgs || coalesce(nullif(v_var.image_url, ''), v_prod.image_url);
        v_unite_ligne := coalesce(nullif(v_var.unite, ''), v_prod.unite);
        v_pcts := v_pcts || coalesce(v_var.promotion, v_prod.promotion, 0)::numeric;
        v_stock_propre := v_stock_propre || (v_var.stock IS NOT NULL);
      ELSE
        v_nom_ligne := v_prod.name;
        v_bases := v_bases || v_prod.price;
        v_vnoms := v_vnoms || NULL::text;
        v_imgs := v_imgs || v_prod.image_url;
        v_unite_ligne := v_prod.unite;
        v_pcts := v_pcts || coalesce(v_prod.promotion, 0)::numeric;
        v_stock_propre := v_stock_propre || false;
      END IF;
      v_noms := v_noms || v_nom_ligne;
      v_unites := v_unites || v_unite_ligne;
      -- Groupe « promo par quantité » : variantes vendues dans l'unité du produit
      v_s0 := v_s0 || (v_unite_ligne IS NOT DISTINCT FROM v_prod.unite);

      -- Unités entières pour les produits vendus à la pièce / botte / barquette
      IF v_ligne_rec.qte > 100000 OR (coalesce(v_unite_ligne, 'pièce') NOT IN ('kg', 'g')
         AND v_ligne_rec.qte <> trunc(v_ligne_rec.qte)) THEN
        RAISE EXCEPTION 'Quantité invalide pour : %', trim(v_nom_ligne);
      END IF;

      -- Stock propre à la variante
      IF v_ligne_rec.vid IS NOT NULL THEN
        IF v_var.stock IS NOT NULL THEN
          IF v_var.stock < v_ligne_rec.qte THEN RAISE EXCEPTION 'Stock insuffisant pour : %', v_nom_ligne; END IF;
          UPDATE product_variants SET stock = stock - v_ligne_rec.qte WHERE id::text = v_ligne_rec.vid;
        END IF;
      END IF;
    END LOOP;

    v_n := array_length(v_ords, 1);
    IF v_n > 1 AND v_prod.variantes_cumulables = false THEN
      RAISE EXCEPTION 'Une seule variante possible pour : %', trim(v_prod.name);
    END IF;

    -- Quantités dans l'unité du produit : promos par quantité et stock partagé
    v_q_total := 0;
    v_q_stock := 0;
    FOR i IN 1 .. v_n LOOP
      IF v_s0[i] THEN
        v_q_total := v_q_total + v_qtes[i];
        IF NOT v_stock_propre[i] THEN v_q_stock := v_q_stock + v_qtes[i]; END IF;
      END IF;
    END LOOP;

    IF v_prod.stock IS NOT NULL AND v_prod.stock < v_q_stock THEN
      RAISE EXCEPTION 'Stock insuffisant pour : %', v_prod.name;
    END IF;
    IF v_prod.stock IS NOT NULL AND v_q_stock > 0 THEN
      UPDATE products SET stock = stock - v_q_stock WHERE id = v_pid;
    END IF;

    v_q_eff_total := v_q_total / CASE WHEN v_prod.unite = 'g' THEN 1000 ELSE 1 END;
    v_units := '{}'; v_offerts := '{}';
    FOR i IN 1 .. v_n LOOP v_offerts := v_offerts || 0::numeric; END LOOP;

    v_degressif := coalesce(v_prod.seuil_promo_qte,0) > 0 AND coalesce(v_prod.prix_promo,0) > 0
                   AND v_q_eff_total >= v_prod.seuil_promo_qte;
    v_ecart := v_prod.price - v_prod.prix_promo;

    FOR i IN 1 .. v_n LOOP
      v_units := v_units || CASE
        WHEN v_s0[i] AND v_degressif THEN
          CASE WHEN v_bases[i] = v_prod.price THEN v_prod.prix_promo ELSE greatest(v_bases[i] - v_ecart, 0) END
        WHEN v_pcts[i] > 0 THEN v_bases[i] * (1 - v_pcts[i] / 100)
        ELSE v_bases[i] END;
    END LOOP;

    IF NOT v_degressif THEN
      v_a_offrir := 0;
      v_seuil := coalesce(v_prod.seuil_achat,0);
      v_offert := coalesce(v_prod.quantite_offerte,0);
      IF v_seuil > 0 AND v_offert > 0 THEN
        v_taille_lot := v_seuil + v_offert;
        v_nb_lots := floor(v_q_total / v_taille_lot);
        v_reste := v_q_total - (v_nb_lots * v_taille_lot);
        v_a_offrir := v_q_total - ((v_nb_lots * v_seuil) + least(v_reste, v_seuil));
      ELSIF coalesce(v_prod.premieres_offertes,0) > 0 AND v_prod.unite <> 'g' THEN
        v_a_offrir := least(v_prod.premieres_offertes, v_q_total);
      END IF;

      -- Unités offertes sur les lignes les moins chères d'abord (unité du produit)
      FOR v_idx IN SELECT u.idx::integer AS idx FROM unnest(v_units) WITH ORDINALITY AS u(val, idx) ORDER BY u.val, u.idx
      LOOP
        EXIT WHEN v_a_offrir <= 0;
        CONTINUE WHEN NOT v_s0[v_idx.idx];
        v_f := least(v_a_offrir, v_qtes[v_idx.idx]);
        v_offerts[v_idx.idx] := v_f;
        v_a_offrir := v_a_offrir - v_f;
      END LOOP;
    END IF;

    FOR i IN 1 .. v_n LOOP
      v_ligne := ((v_qtes[i] - v_offerts[i]) / CASE WHEN v_unites[i] = 'g' THEN 1000 ELSE 1 END) * v_units[i];
      v_sous_total := v_sous_total + v_ligne;
      v_lignes := v_lignes || jsonb_build_object(
        'ord', v_ords[i],
        'id', v_prod.id,
        'name', v_noms[i],
        'nom', v_noms[i],
        'quantite', v_qtes[i],
        'unite', v_unites[i],
        'price', v_bases[i],
        'promotion', v_pcts[i],
        'seuil_achat', v_prod.seuil_achat,
        'quantite_offerte', v_prod.quantite_offerte,
        'seuil_promo_qte', v_prod.seuil_promo_qte,
        'prix_promo', v_prod.prix_promo,
        'premieres_offertes', v_prod.premieres_offertes,
        'prixUnitaire', round(v_units[i], 2),
        'prixTotalLigne', round(v_ligne, 2),
        'offerts', v_offerts[i],
        'variant_id', v_vids[i],
        'variant_nom', v_vnoms[i],
        'image_url', v_imgs[i]
      );
    END LOOP;
  END LOOP;

  -- Contenu et description dans l'ordre du panier
  SELECT coalesce(jsonb_agg(l - 'ord' ORDER BY (l->>'ord')::int), '[]'::jsonb),
         coalesce(string_agg((l->>'quantite') || 'x ' || (l->>'name'), ', ' ORDER BY (l->>'ord')::int), '')
    INTO v_contenu, v_desc
    FROM jsonb_array_elements(v_lignes) AS l;

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
      v_frais := 5;               -- repli sécurisé : palier maximum si coordonnées absentes
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

COMMIT;
