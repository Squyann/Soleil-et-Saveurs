-- Verrouillage d'accès aux fonctions désormais inutilisées ou internes.
-- La logique de récompenses / décrément de stock / usage de code est intégrée
-- à creer_commande : plus aucun appel RPC direct ne doit être possible (sinon
-- un client pourrait, par ex., s'auto-créditer des points de fidélité).
REVOKE ALL ON FUNCTION public.appliquer_recompenses_commande(integer, boolean, boolean) FROM public, anon, authenticated;
REVOKE ALL ON FUNCTION public.decrementer_stock_panier(jsonb) FROM public, anon, authenticated;
REVOKE ALL ON FUNCTION public.increment_code_promo_usage(uuid) FROM public, anon, authenticated;

-- Fonctions de trigger : ne doivent pas être exposées via l'API REST.
-- (Les triggers continuent de s'exécuter indépendamment du privilège EXECUTE.)
REVOKE ALL ON FUNCTION public.handle_new_user() FROM public, anon, authenticated;
REVOKE ALL ON FUNCTION public.decrement_stock_on_order() FROM public, anon, authenticated;
REVOKE ALL ON FUNCTION public.process_referral(text, uuid) FROM public, anon, authenticated;

-- search_path figé (durcissement) sur les fonctions signalées par le linter.
ALTER FUNCTION public.handle_new_user() SET search_path = public;
ALTER FUNCTION public.process_referral(text, uuid) SET search_path = public;
