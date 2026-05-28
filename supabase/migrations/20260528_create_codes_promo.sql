-- Création de la table codes_promo
CREATE TABLE IF NOT EXISTS codes_promo (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT NOT NULL UNIQUE,
  reduction_pct INTEGER NOT NULL CHECK (reduction_pct > 0 AND reduction_pct <= 100),
  actif BOOLEAN NOT NULL DEFAULT true,
  usage_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE codes_promo ENABLE ROW LEVEL SECURITY;

-- Lecture des codes actifs pour tous (validation côté panier client)
CREATE POLICY "codes_promo_read_actif" ON codes_promo
  FOR SELECT USING (actif = true);

-- Gestion complète pour l'admin (utilisateur authentifié)
CREATE POLICY "codes_promo_admin_select" ON codes_promo
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "codes_promo_admin_insert" ON codes_promo
  FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "codes_promo_admin_update" ON codes_promo
  FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "codes_promo_admin_delete" ON codes_promo
  FOR DELETE TO authenticated USING (true);

-- Colonnes ajoutées à la table commandes
ALTER TABLE commandes
  ADD COLUMN IF NOT EXISTS code_promo TEXT,
  ADD COLUMN IF NOT EXISTS remise_code_pct INTEGER;

-- Fonction RPC pour incrémenter le compteur d'utilisation
CREATE OR REPLACE FUNCTION increment_code_promo_usage(code_id UUID)
RETURNS void
LANGUAGE sql
SECURITY DEFINER
AS $$
  UPDATE codes_promo SET usage_count = usage_count + 1 WHERE id = code_id;
$$;
