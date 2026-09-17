-- FAILLE : /api/notify-order n'exigeait qu'un compte authentifié et déclenchait
-- 2 envois Resend par appel => épuisement du quota, coût, réputation du domaine.
CREATE TABLE IF NOT EXISTS public.quotas_api (
  user_id  uuid        NOT NULL,
  action   text        NOT NULL,
  fenetre  timestamptz NOT NULL,
  compteur integer     NOT NULL DEFAULT 0,
  PRIMARY KEY (user_id, action, fenetre)
);
ALTER TABLE public.quotas_api ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.quotas_api FROM anon, authenticated;

CREATE OR REPLACE FUNCTION public.consommer_quota(p_action text, p_max integer, p_fenetre_minutes integer)
 RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE
  v_uid uuid := auth.uid();
  v_taille integer := greatest(p_fenetre_minutes, 1) * 60;
  v_fenetre timestamptz;
  v_compteur integer;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'Non authentifié'; END IF;
  v_fenetre := to_timestamp(floor(extract(epoch FROM now()) / v_taille) * v_taille);
  INSERT INTO quotas_api (user_id, action, fenetre, compteur) VALUES (v_uid, p_action, v_fenetre, 1)
  ON CONFLICT (user_id, action, fenetre) DO UPDATE SET compteur = quotas_api.compteur + 1
  RETURNING compteur INTO v_compteur;
  DELETE FROM quotas_api WHERE fenetre < now() - interval '1 day';
  RETURN v_compteur <= p_max;
END;
$function$;

REVOKE EXECUTE ON FUNCTION public.consommer_quota(text, integer, integer) FROM anon, PUBLIC;
GRANT EXECUTE ON FUNCTION public.consommer_quota(text, integer, integer) TO authenticated;
