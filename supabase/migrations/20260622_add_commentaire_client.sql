-- Vrai champ de commentaire libre et optionnel saisi par le client à la commande,
-- distinct de description_commande (résumé du panier généré automatiquement).
ALTER TABLE commandes
  ADD COLUMN IF NOT EXISTS commentaire_client TEXT;
