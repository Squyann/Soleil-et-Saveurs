-- Empêche un même client d'utiliser deux fois le même code promo,
-- y compris en cas de double soumission ou de validation concurrente.
CREATE UNIQUE INDEX IF NOT EXISTS codes_promo_utilisations_user_code_unique
  ON codes_promo_utilisations (user_id, code_promo_id);
