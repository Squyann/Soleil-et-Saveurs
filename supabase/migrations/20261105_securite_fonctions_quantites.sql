-- Audit de sécurité du 05/11/2026.
--
-- 1. Trois anciennes fonctions, que le site n'utilise plus depuis que
--    creer_commande gère tout côté serveur, restaient appelables par n'importe
--    quel client connecté (depuis la console du navigateur) :
--    - appliquer_recompenses_commande(points, …) : un client pouvait s'attribuer
--      autant de points de fidélité qu'il voulait (remise -10 % illimitée) ;
--    - decrementer_stock_panier(articles) : un client pouvait mettre à zéro le
--      stock de tous les produits (catalogue entièrement « épuisé ») ;
--    - increment_code_promo_usage(code) : fausser les compteurs des codes promo.
--    On leur retire le droit d'exécution (elles ne sont pas supprimées).
--
-- 2. creer_commande acceptait des quantités fractionnées pour les produits
--    vendus à l'unité (pièce, botte, barquette) : « 0,1 ananas » était facturé
--    0,40 €. Désormais refusé ; les produits au kg et au gramme ne changent pas.
--
-- Script en une transaction, relançable sans risque.

BEGIN;

DO $$
DECLARE
  v_fonction text;
BEGIN
  FOREACH v_fonction IN ARRAY ARRAY[
    'public.appliquer_recompenses_commande(integer, boolean, boolean)',
    'public.decrementer_stock_panier(jsonb)',
    'public.increment_code_promo_usage(uuid)'
  ] LOOP
    IF to_regprocedure(v_fonction) IS NOT NULL THEN
      EXECUTE format('REVOKE EXECUTE ON FUNCTION %s FROM PUBLIC, anon, authenticated', v_fonction);
      RAISE NOTICE 'Accès retiré : %', v_fonction;
    END IF;
  END LOOP;
END $$;

-- Patch en place de creer_commande (version du 04/11, variantes) : motif
-- insensible aux espaces, attendu exactement une fois, sinon rien n'est modifié.
DO $do$
DECLARE
  v_def text;
  v_motif text := 'v_qtes\s+:=\s+v_qtes\s+\|\|\s+v_ligne_rec\.qte;';
  v_ajout text := 'v_qtes := v_qtes || v_ligne_rec.qte;
      -- Unités entières pour les produits vendus à la pièce / botte / barquette
      IF v_ligne_rec.qte > 100000 OR (coalesce(v_prod.unite, ''pièce'') NOT IN (''kg'', ''g'')
         AND v_ligne_rec.qte <> trunc(v_ligne_rec.qte)) THEN
        RAISE EXCEPTION ''Quantité invalide pour : %'', trim(v_prod.name);
      END IF;';
  v_occurrences integer;
BEGIN
  SELECT pg_get_functiondef(p.oid) INTO v_def
    FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
   WHERE n.nspname = 'public' AND p.proname = 'creer_commande'
     AND pg_get_function_identity_arguments(p.oid) = 'p_items jsonb, p_infos jsonb';
  IF v_def IS NULL THEN RAISE EXCEPTION 'creer_commande(jsonb, jsonb) introuvable'; END IF;
  IF position('Unités entières' in v_def) > 0 THEN
    RAISE NOTICE 'creer_commande contrôle déjà les quantités : rien à faire';
    RETURN;
  END IF;
  SELECT count(*) INTO v_occurrences FROM regexp_matches(v_def, v_motif, 'g');
  IF v_occurrences <> 1 THEN
    RAISE EXCEPTION 'Motif attendu 1 fois dans creer_commande, trouvé % fois — migration annulée (la migration 20261104 a-t-elle été lancée ?)', v_occurrences;
  END IF;
  EXECUTE regexp_replace(v_def, v_motif, v_ajout);
END
$do$;

COMMIT;
