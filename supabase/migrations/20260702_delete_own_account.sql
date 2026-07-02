-- Permet à un client connecté de supprimer lui-même son compte.
-- La fonction s'exécute en SECURITY DEFINER pour pouvoir supprimer la ligne
-- correspondante dans auth.users (ce que la clé anonyme ne permet pas).
-- profiles et codes_promo_utilisations sont supprimés en cascade via leurs FK ;
-- paniers est en NO ACTION et doit donc être nettoyé explicitement.
-- Les commandes n'ont pas de clé étrangère vers auth.users : elles sont
-- conservées pour l'historique commerçant (facturation).
CREATE OR REPLACE FUNCTION public.supprimer_mon_compte()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  uid uuid := auth.uid();
BEGIN
  IF uid IS NULL THEN
    RAISE EXCEPTION 'Non authentifié';
  END IF;

  DELETE FROM public.paniers WHERE user_id = uid;
  DELETE FROM auth.users WHERE id = uid;
END;
$$;

REVOKE ALL ON FUNCTION public.supprimer_mon_compte() FROM public, anon;
GRANT EXECUTE ON FUNCTION public.supprimer_mon_compte() TO authenticated;
