-- FAILLE : dans creer_commande, si lat/lon étaient absents, le repli facturait le
-- palier le MOINS cher (3 €). Omettre les coordonnées suffisait à payer 3 € au
-- lieu de 5 €. CORRECTIF : le repli facture le palier MAXIMUM.
-- Patch en place avec gardes : échoue si le motif n'est pas trouvé exactement 1 fois.
DO $do$
DECLARE
  v_def text; v_new text;
  v_motif text := 'v_frais := 3;               -- fallback si coordonnées manquantes';
  v_occurrences integer;
BEGIN
  SELECT pg_get_functiondef(p.oid) INTO v_def
    FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
   WHERE n.nspname = 'public' AND p.proname = 'creer_commande'
     AND pg_get_function_identity_arguments(p.oid) = 'p_items jsonb, p_infos jsonb';
  IF v_def IS NULL THEN RAISE EXCEPTION 'creer_commande(jsonb, jsonb) introuvable'; END IF;

  v_occurrences := (length(v_def) - length(replace(v_def, v_motif, ''))) / length(v_motif);
  IF v_occurrences <> 1 THEN
    RAISE EXCEPTION 'Motif de repli attendu 1 fois, trouvé % fois — migration annulée', v_occurrences;
  END IF;

  v_new := replace(v_def, v_motif,
    'v_frais := 5;               -- repli sécurisé : palier maximum si coordonnées absentes');
  EXECUTE v_new;
END
$do$;
