-- Réinitialisation des données depuis le panneau admin :
-- supprime toutes les commandes et tous les comptes clients (les comptes
-- administrateurs sont conservés). Réservé aux administrateurs.
CREATE OR REPLACE FUNCTION public.admin_reinitialiser_donnees()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF coalesce(auth.jwt() -> 'app_metadata' ->> 'role', '') <> 'admin' THEN
    RAISE EXCEPTION 'Réservé aux administrateurs';
  END IF;

  DELETE FROM public.commandes;
  DELETE FROM public.paniers;
  -- Supprime tous les utilisateurs sauf les administrateurs.
  -- profiles et codes_promo_utilisations sont supprimés en cascade.
  DELETE FROM auth.users
    WHERE coalesce(raw_app_meta_data ->> 'role', '') <> 'admin';
END;
$$;

REVOKE ALL ON FUNCTION public.admin_reinitialiser_donnees() FROM public, anon;
GRANT EXECUTE ON FUNCTION public.admin_reinitialiser_donnees() TO authenticated;
