-- FAILLES : (1) process_referral_for_self était exécutable par anon ; avec
-- auth.uid() NULL la garde anti-auto-parrainage devenait NULL donc jamais vraie.
-- (2) Aucune trace en base du parrainage => rejouable en boucle (-10 % à répétition).
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS referred_by uuid;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS referral_claimed_at timestamptz;

CREATE OR REPLACE FUNCTION public.process_referral_for_self(p_referral_code text)
 RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE
  v_uid uuid := auth.uid();
  v_code text := upper(trim(coalesce(p_referral_code, '')));
  v_parrain uuid;
  v_deja uuid;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'Non authentifié'; END IF;
  IF v_code = '' THEN RETURN false; END IF;

  SELECT referred_by INTO v_deja FROM profiles WHERE user_id = v_uid FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Profil introuvable'; END IF;
  IF v_deja IS NOT NULL THEN RETURN false; END IF;

  SELECT user_id INTO v_parrain FROM profiles WHERE referral_code = v_code LIMIT 1;
  IF v_parrain IS NULL OR v_parrain = v_uid THEN RETURN false; END IF;

  UPDATE profiles
     SET referred_by = v_parrain, referral_claimed_at = now(),
         has_referral_discount = false, referral_pending = true
   WHERE user_id = v_uid;
  UPDATE profiles SET has_referral_discount = true WHERE user_id = v_parrain;
  RETURN true;
END;
$function$;

REVOKE EXECUTE ON FUNCTION public.process_referral_for_self(text) FROM anon, PUBLIC;
GRANT EXECUTE ON FUNCTION public.process_referral_for_self(text) TO authenticated;
REVOKE EXECUTE ON FUNCTION public.process_referral(text, uuid) FROM anon, authenticated, PUBLIC;
