-- Nettoyage des droits (suite de l'audit, alertes Supabase) — sans effet sur le site.
--
-- 1. TRUNCATE : droit technique accordé par défaut aux visiteurs et clients sur
--    les tables. Il ignore les règles d'accès (RLS) ; il n'est pas utilisable
--    depuis l'API du site, mais on le retire par précaution.
-- 2. limite_commandes_par_client() est une fonction de déclencheur (quota de 5
--    commandes / 24 h) : elle n'a pas à être appelable directement. Le
--    déclencheur continue de fonctionner (le droit n'est vérifié qu'à sa création).
-- 3. Formulaire de contact (ouvert aux visiteurs) : longueur maximale des champs
--    pour éviter les envois géants.

DO $$
DECLARE
  v_table text;
BEGIN
  FOR v_table IN SELECT tablename FROM pg_tables WHERE schemaname = 'public' LOOP
    EXECUTE format('REVOKE TRUNCATE ON public.%I FROM anon, authenticated', v_table);
  END LOOP;
END $$;

REVOKE EXECUTE ON FUNCTION public.limite_commandes_par_client() FROM PUBLIC, anon, authenticated;

ALTER TABLE public.messages DROP CONSTRAINT IF EXISTS messages_longueurs_max;
ALTER TABLE public.messages ADD CONSTRAINT messages_longueurs_max CHECK (
  coalesce(length(nom), 0) <= 200
  AND coalesce(length(email), 0) <= 320
  AND coalesce(length(message), 0) <= 5000
);
