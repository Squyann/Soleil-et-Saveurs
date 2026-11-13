-- Codes promo : limite d'utilisations par client et période de validité.
--
-- Deux réglages facultatifs et indépendants sur chaque code :
--   max_par_client : nombre de commandes avec ce code par compte client
--                    (vide = sans limite) ;
--   debut / fin    : période de validité (vide = sans date de début / de fin).
-- Les codes existants gardent leur fonctionnement actuel : 1 utilisation par
-- client, sans date.
--
-- Le contrôle est fait deux fois par la base : quand le client saisit le code
-- (verifier_code_promo, réponse détaillée pour le message affiché) et quand il
-- valide la commande (creer_commande, seul contrôle qui fait foi). Le code est
-- verrouillé pendant la validation : deux commandes simultanées ne peuvent pas
-- dépasser la limite. Une utilisation est comptée à la commande, comme
-- aujourd'hui.
--
-- Un code déjà utilisé ne peut plus être supprimé (il figure sur des
-- factures) : on le désactive.
--
-- Une transaction, relançable. Seul le bloc « code promo » de creer_commande
-- est remplacé ; la migration s'arrête sans rien changer s'il n'a pas la forme
-- attendue.

BEGIN;

ALTER TABLE public.codes_promo
  ADD COLUMN IF NOT EXISTS max_par_client integer,
  ADD COLUMN IF NOT EXISTS debut timestamptz,
  ADD COLUMN IF NOT EXISTS fin timestamptz;

DO $colonnes$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'codes_promo_max_par_client_positif') THEN
    ALTER TABLE public.codes_promo ADD CONSTRAINT codes_promo_max_par_client_positif
      CHECK (max_par_client IS NULL OR max_par_client BETWEEN 1 AND 1000);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'codes_promo_periode_coherente') THEN
    ALTER TABLE public.codes_promo ADD CONSTRAINT codes_promo_periode_coherente
      CHECK (debut IS NULL OR fin IS NULL OR fin > debut);
  END IF;
  -- Première application seulement : les codes existants restent à 1 par client
  IF NOT EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'etat_code_promo' AND pronamespace = 'public'::regnamespace) THEN
    UPDATE public.codes_promo SET max_par_client = 1 WHERE max_par_client IS NULL;
  END IF;
END
$colonnes$;

-- Plusieurs utilisations possibles par client : l'unicité (client, code) est
-- remplacée par le comptage ci-dessous.
DROP INDEX IF EXISTS public.codes_promo_utilisations_user_code_unique;
CREATE INDEX IF NOT EXISTS codes_promo_utilisations_user_code_idx
  ON public.codes_promo_utilisations (user_id, code_promo_id);

-- État d'un code pour un client : ok, inconnu, pas_encore, expire ou limite.
CREATE OR REPLACE FUNCTION public.etat_code_promo(p_code_id uuid, p_uid uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
DECLARE
  v_code public.codes_promo%ROWTYPE;
  v_nb integer := 0;
  v_statut text := 'ok';
BEGIN
  SELECT * INTO v_code FROM public.codes_promo WHERE id = p_code_id;
  IF NOT FOUND OR NOT v_code.actif THEN
    RETURN jsonb_build_object('statut', 'inconnu');
  END IF;
  SELECT count(*) INTO v_nb FROM public.codes_promo_utilisations
   WHERE user_id = p_uid AND code_promo_id = p_code_id;
  IF v_code.debut IS NOT NULL AND now() < v_code.debut THEN
    v_statut := 'pas_encore';
  ELSIF v_code.fin IS NOT NULL AND now() > v_code.fin THEN
    v_statut := 'expire';
  ELSIF v_code.max_par_client IS NOT NULL AND v_nb >= v_code.max_par_client THEN
    v_statut := 'limite';
  END IF;
  RETURN jsonb_build_object(
    'statut', v_statut,
    'id', v_code.id,
    'reduction_pct', v_code.reduction_pct,
    'debut', v_code.debut,
    'fin', v_code.fin,
    'max_par_client', v_code.max_par_client,
    'utilisations', v_nb,
    'restant', CASE WHEN v_code.max_par_client IS NULL THEN NULL ELSE greatest(v_code.max_par_client - v_nb, 0) END
  );
END;
$function$;
REVOKE ALL ON FUNCTION public.etat_code_promo(uuid, uuid) FROM PUBLIC, anon, authenticated;

-- Vérification au moment de la saisie, pour le client connecté. Réponse
-- compatible avec l'ancienne version du panier (valide, deja_utilise).
CREATE OR REPLACE FUNCTION public.verifier_code_promo(p_code text)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
DECLARE
  v_uid uuid := auth.uid();
  v_code text := upper(trim(coalesce(p_code, '')));
  v_id uuid;
  v_etat jsonb;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'Non authentifié'; END IF;
  IF v_code = '' THEN
    RETURN jsonb_build_object('valide', false, 'deja_utilise', false, 'statut', 'inconnu');
  END IF;
  SELECT id INTO v_id FROM public.codes_promo WHERE code = v_code AND actif = true;
  IF v_id IS NULL THEN
    RETURN jsonb_build_object('valide', false, 'deja_utilise', false, 'statut', 'inconnu');
  END IF;
  v_etat := public.etat_code_promo(v_id, v_uid);
  RETURN v_etat || jsonb_build_object(
    'valide', v_etat->>'statut' IN ('ok', 'limite'),
    'deja_utilise', v_etat->>'statut' = 'limite'
  );
END;
$function$;
REVOKE ALL ON FUNCTION public.verifier_code_promo(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.verifier_code_promo(text) TO authenticated;

-- Contrôle à la validation de la commande : lève le message adapté.
CREATE OR REPLACE FUNCTION public.controler_code_promo(p_code_id uuid, p_uid uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
DECLARE
  v_statut text := public.etat_code_promo(p_code_id, p_uid)->>'statut';
BEGIN
  IF v_statut = 'inconnu' THEN
    RAISE EXCEPTION 'Ce code promotionnel n''existe pas ou n''est plus actif.';
  ELSIF v_statut = 'pas_encore' THEN
    RAISE EXCEPTION 'Ce code promotionnel n''est pas encore valable.';
  ELSIF v_statut = 'expire' THEN
    RAISE EXCEPTION 'La période de validité de ce code promotionnel est terminée.';
  ELSIF v_statut = 'limite' THEN
    RAISE EXCEPTION 'Vous avez atteint la limite d''utilisation de ce code promotionnel.';
  END IF;
END;
$function$;
REVOKE ALL ON FUNCTION public.controler_code_promo(uuid, uuid) FROM PUBLIC, anon, authenticated;

-- creer_commande : seul le bloc « code promo » change. La recherche tolère
-- les différences d'espaces et de fins de ligne (texte enregistré depuis un
-- autre éditeur) ; chaque morceau doit être trouvé exactement une fois.
DO $commande$
DECLARE
  v_def text;
  v_nb integer;
  -- 1. le code est verrouillé pendant la commande
  v_m1 text := 'FROM\s+codes_promo\s+WHERE\s+code\s*=\s*v_code\s+AND\s+actif\s*=\s*true\s*;';
  -- 2. message plus clair pour un code inconnu
  v_m2 text := 'RAISE\s+EXCEPTION\s+''Code promo invalide''\s*;';
  -- 3. l'unicité (client, code) est remplacée par le contrôle détaillé
  v_m3 text := 'BEGIN\s+INSERT\s+INTO\s+codes_promo_utilisations\s*\(\s*user_id\s*,\s*code_promo_id\s*\)\s*VALUES\s*\(\s*v_uid\s*,\s*v_code_id\s*\)\s*;\s*EXCEPTION\s+WHEN\s+unique_violation\s+THEN\s+RAISE\s+EXCEPTION\s+''[^'']*''\s*;\s*END\s*;';
BEGIN
  SELECT pg_get_functiondef(p.oid) INTO v_def
    FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
   WHERE n.nspname = 'public' AND p.proname = 'creer_commande'
     AND pg_get_function_identity_arguments(p.oid) = 'p_items jsonb, p_infos jsonb';
  IF v_def IS NULL THEN RAISE EXCEPTION 'creer_commande(jsonb, jsonb) introuvable — migration annulée'; END IF;
  IF position('controler_code_promo(v_code_id, v_uid)' in v_def) > 0 THEN
    RAISE NOTICE 'creer_commande déjà à jour';
    RETURN;
  END IF;

  SELECT count(*) INTO v_nb FROM regexp_matches(v_def, v_m1, 'g');
  IF v_nb <> 1 THEN RAISE EXCEPTION 'creer_commande : verrouillage du code introuvable (% trouvé(s)). Rien n''a été changé. Extrait : %', v_nb, substring(v_def from position('IF v_code IS NOT NULL' in v_def) for 600); END IF;
  SELECT count(*) INTO v_nb FROM regexp_matches(v_def, v_m2, 'g');
  IF v_nb <> 1 THEN RAISE EXCEPTION 'creer_commande : message « Code promo invalide » introuvable (% trouvé(s)). Rien n''a été changé. Extrait : %', v_nb, substring(v_def from position('IF v_code IS NOT NULL' in v_def) for 600); END IF;
  SELECT count(*) INTO v_nb FROM regexp_matches(v_def, v_m3, 'g');
  IF v_nb <> 1 THEN RAISE EXCEPTION 'creer_commande : bloc d''utilisation du code introuvable (% trouvé(s)). Rien n''a été changé. Extrait : %', v_nb, substring(v_def from position('IF v_code IS NOT NULL' in v_def) for 600); END IF;

  v_def := regexp_replace(v_def, v_m1, 'FROM codes_promo WHERE code = v_code AND actif = true FOR UPDATE;');
  v_def := regexp_replace(v_def, v_m2, $r$RAISE EXCEPTION 'Ce code promotionnel n''existe pas ou n''est plus actif.';$r$);
  v_def := regexp_replace(v_def, v_m3, E'PERFORM controler_code_promo(v_code_id, v_uid);
    INSERT INTO codes_promo_utilisations (user_id, code_promo_id) VALUES (v_uid, v_code_id);');
  EXECUTE v_def;
END
$commande$;

-- Un code déjà utilisé ne se supprime pas : il figure sur des commandes et
-- des factures.
CREATE OR REPLACE FUNCTION public.codes_promo_suppression_protegee() RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
BEGIN
  IF EXISTS (SELECT 1 FROM public.codes_promo_utilisations WHERE code_promo_id = OLD.id)
     OR coalesce(OLD.usage_count, 0) > 0 THEN
    RAISE EXCEPTION 'Ce code a déjà été utilisé : désactivez-le plutôt que de le supprimer.';
  END IF;
  RETURN OLD;
END;
$function$;
REVOKE ALL ON FUNCTION public.codes_promo_suppression_protegee() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS trg_codes_promo_suppression_protegee ON public.codes_promo;
CREATE TRIGGER trg_codes_promo_suppression_protegee
  BEFORE DELETE ON public.codes_promo
  FOR EACH ROW EXECUTE FUNCTION public.codes_promo_suppression_protegee();

COMMIT;
