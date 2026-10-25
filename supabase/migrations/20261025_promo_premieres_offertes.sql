-- Nouveau type de promo : les N premières unités d'une ligne de commande sont
-- offertes, les suivantes au prix normal (ex. persil : 1ʳᵉ botte offerte, puis
-- 0,50 € la botte). Uniquement pour les produits vendus à l'unité (pas au
-- gramme). Le prix dégressif et le lot « X achetés + Y offerts » restent
-- prioritaires, comme dans le calcul côté site (src/lib/promos.ts).
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS premieres_offertes integer NOT NULL DEFAULT 0;

-- Patch en place de creer_commande (même méthode que 20260917g) : chaque motif
-- doit être trouvé exactement une fois, sinon la migration est annulée.
DO $do$
DECLARE
  v_def text;
  v_motifs text[] := ARRAY[
    E'seuil_promo_qte, prix_promo, unite, stock, actif\n      INTO v_prod',
    E'        v_ligne := v_qte_payante * v_prix_unit;\n      ELSE\n        v_ligne := v_qte_eff * v_prix_unit;',
    E'''prix_promo'', v_prod.prix_promo,'
  ];
  v_remplacements text[] := ARRAY[
    E'seuil_promo_qte, prix_promo, unite, stock, actif, premieres_offertes\n      INTO v_prod',
    E'        v_ligne := v_qte_payante * v_prix_unit;\n      ELSIF coalesce(v_prod.premieres_offertes,0) > 0 AND v_prod.unite <> ''g'' THEN\n        v_ligne := greatest(v_qte - v_prod.premieres_offertes, 0) * v_prix_unit;\n      ELSE\n        v_ligne := v_qte_eff * v_prix_unit;',
    E'''prix_promo'', v_prod.prix_promo,\n      ''premieres_offertes'', v_prod.premieres_offertes,'
  ];
  v_occurrences integer;
BEGIN
  SELECT pg_get_functiondef(p.oid) INTO v_def
    FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
   WHERE n.nspname = 'public' AND p.proname = 'creer_commande'
     AND pg_get_function_identity_arguments(p.oid) = 'p_items jsonb, p_infos jsonb';
  IF v_def IS NULL THEN RAISE EXCEPTION 'creer_commande(jsonb, jsonb) introuvable'; END IF;

  FOR i IN 1 .. array_length(v_motifs, 1) LOOP
    v_occurrences := (length(v_def) - length(replace(v_def, v_motifs[i], ''))) / length(v_motifs[i]);
    IF v_occurrences <> 1 THEN
      RAISE EXCEPTION 'Motif % attendu 1 fois, trouvé % fois — migration annulée', i, v_occurrences;
    END IF;
    v_def := replace(v_def, v_motifs[i], v_remplacements[i]);
  END LOOP;

  EXECUTE v_def;
END
$do$;
