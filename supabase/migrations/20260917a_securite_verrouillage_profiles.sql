-- FAILLE : les migrations précédentes tentaient un REVOKE de COLONNES sur profiles.
-- PostgreSQL ne peut pas révoquer une colonne quand le privilège existe au niveau
-- TABLE : le REVOKE n'a aucun effet. Combiné à la policy profiles_update
-- (auth.uid() = user_id, sans WITH CHECK), tout client pouvait s'attribuer
-- loyalty_points et has_referral_discount => 20 % de remise à vie.
-- CORRECTIF : retirer le privilège d'écriture au niveau TABLE. L'application ne
-- fait que LIRE profiles ; les écritures passent par des fonctions SECURITY DEFINER.
REVOKE INSERT, UPDATE, DELETE ON public.profiles FROM anon, authenticated;
DROP POLICY IF EXISTS profiles_update ON public.profiles;
