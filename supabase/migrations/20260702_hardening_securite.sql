-- ============================================================
-- Durcissement sécurité avant mise en production
-- ============================================================

-- C1 — Empêcher un client de s'auto-créditer fidélité / parrainage.
-- Les récompenses ne passent que par les fonctions SECURITY DEFINER.
REVOKE UPDATE (loyalty_points, has_referral_discount, referral_pending, referral_code)
  ON public.profiles FROM anon, authenticated;

-- M1 — Restreindre la lecture des profils au propriétaire ou à l'admin.
-- La validation d'un code de parrainage à l'inscription passe désormais par
-- une fonction dédiée (referral_code_valide) pour ne pas exposer la table.
DROP POLICY IF EXISTS profiles_select ON public.profiles;
CREATE POLICY profiles_select ON public.profiles
  FOR SELECT TO public
  USING (auth.uid() = user_id OR is_admin());

CREATE OR REPLACE FUNCTION public.referral_code_valide(p_code text)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM profiles WHERE referral_code = upper(trim(p_code))
  );
$$;
REVOKE ALL ON FUNCTION public.referral_code_valide(text) FROM public;
GRANT EXECUTE ON FUNCTION public.referral_code_valide(text) TO anon, authenticated;

-- C3 — Configuration livraison : écriture réservée aux admins.
DROP POLICY IF EXISTS config_cal_write_auth ON public.config_calendrier;
CREATE POLICY config_cal_write_admin ON public.config_calendrier
  FOR ALL TO authenticated USING (is_admin()) WITH CHECK (is_admin());

DROP POLICY IF EXISTS exceptions_write_auth ON public.dates_livraison_exceptions;
CREATE POLICY exceptions_write_admin ON public.dates_livraison_exceptions
  FOR ALL TO authenticated USING (is_admin()) WITH CHECK (is_admin());

-- H1 — product_variants : écriture réservée aux admins.
DROP POLICY IF EXISTS product_variants_admin_insert ON public.product_variants;
DROP POLICY IF EXISTS product_variants_admin_update ON public.product_variants;
DROP POLICY IF EXISTS product_variants_admin_delete ON public.product_variants;
CREATE POLICY product_variants_admin_insert ON public.product_variants
  FOR INSERT TO authenticated WITH CHECK (is_admin());
CREATE POLICY product_variants_admin_update ON public.product_variants
  FOR UPDATE TO authenticated USING (is_admin()) WITH CHECK (is_admin());
CREATE POLICY product_variants_admin_delete ON public.product_variants
  FOR DELETE TO authenticated USING (is_admin());

-- M1 — Ne plus exposer les codes promo inactifs à tout utilisateur connecté.
-- Les codes actifs restent lisibles via la policy publique codes_promo_read_actif.
DROP POLICY IF EXISTS codes_promo_admin_select ON public.codes_promo;
CREATE POLICY codes_promo_admin_select ON public.codes_promo
  FOR SELECT TO authenticated USING (is_admin());

-- Anti-réutilisation des codes promo : empêcher un client de supprimer/modifier
-- ses lignes d'utilisation (contournement de l'unicité). Lecture de ses propres
-- lignes conservée ; écriture faite uniquement par la fonction creer_commande.
DROP POLICY IF EXISTS utilisations_admin_all ON public.codes_promo_utilisations;
CREATE POLICY utilisations_admin ON public.codes_promo_utilisations
  FOR SELECT TO authenticated USING (is_admin());
REVOKE INSERT, UPDATE, DELETE ON public.codes_promo_utilisations FROM anon, authenticated;

-- Checkout réservé aux clients connectés : plus de commande anonyme.
DROP POLICY IF EXISTS "invités créent une commande" ON public.commandes;

-- Durcissement des fonctions existantes (search_path figé, accès restreint).
ALTER FUNCTION public.is_admin() SET search_path = public;
ALTER FUNCTION public.increment_code_promo_usage(uuid) SET search_path = public;
REVOKE ALL ON FUNCTION public.increment_code_promo_usage(uuid) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.increment_code_promo_usage(uuid) TO authenticated;
