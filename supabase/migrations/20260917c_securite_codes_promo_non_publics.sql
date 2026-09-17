-- FAILLE : policy SELECT publique sur codes_promo => n'importe quel visiteur
-- pouvait lister tous les codes actifs et leur taux avec la clé anon.
-- CORRECTIF : plus de lecture directe côté client ; validation par fonction
-- SECURITY DEFINER qui ne révèle que le verdict du code soumis.
DROP POLICY IF EXISTS codes_promo_read_actif ON public.codes_promo;
REVOKE SELECT ON public.codes_promo FROM anon;

CREATE OR REPLACE FUNCTION public.verifier_code_promo(p_code text)
 RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE
  v_uid uuid := auth.uid();
  v_code text := upper(trim(coalesce(p_code, '')));
  v_id uuid; v_pct integer; v_deja boolean := false;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'Non authentifié'; END IF;
  IF v_code = '' THEN RETURN jsonb_build_object('valide', false, 'deja_utilise', false); END IF;

  SELECT id, reduction_pct INTO v_id, v_pct FROM codes_promo WHERE code = v_code AND actif = true;
  IF v_id IS NULL THEN RETURN jsonb_build_object('valide', false, 'deja_utilise', false); END IF;

  SELECT EXISTS (SELECT 1 FROM codes_promo_utilisations
                  WHERE user_id = v_uid AND code_promo_id = v_id) INTO v_deja;

  RETURN jsonb_build_object('valide', true, 'deja_utilise', v_deja,
                            'reduction_pct', v_pct, 'id', v_id);
END;
$function$;

REVOKE EXECUTE ON FUNCTION public.verifier_code_promo(text) FROM anon, PUBLIC;
GRANT EXECUTE ON FUNCTION public.verifier_code_promo(text) TO authenticated;
