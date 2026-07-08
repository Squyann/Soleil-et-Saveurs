-- Optimisations de performance (advisors Supabase) :
-- index manquants sur clés étrangères + colonnes fréquemment filtrées,
-- et suppression d'un index unique en double sur codes_promo_utilisations.
CREATE INDEX IF NOT EXISTS idx_codes_promo_utilisations_code_promo_id ON public.codes_promo_utilisations(code_promo_id);
CREATE INDEX IF NOT EXISTS idx_paniers_produit_id ON public.paniers(produit_id);
CREATE INDEX IF NOT EXISTS idx_paniers_user_id ON public.paniers(user_id);
CREATE INDEX IF NOT EXISTS idx_commandes_user_id ON public.commandes(user_id);
CREATE INDEX IF NOT EXISTS idx_commandes_date_livraison ON public.commandes(date_livraison);

-- La contrainte codes_promo_utilisations_user_id_code_promo_id_key assure déjà
-- l'unicité (user_id, code_promo_id) : on retire l'index dupliqué manuel.
DROP INDEX IF EXISTS public.codes_promo_utilisations_user_code_unique;
