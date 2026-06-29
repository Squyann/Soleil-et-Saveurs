-- Permet d'activer ou désactiver un article depuis l'admin.
-- Un article désactivé reste en base mais n'est plus visible ni commandable
-- côté boutique.
ALTER TABLE products ADD COLUMN IF NOT EXISTS actif boolean NOT NULL DEFAULT true;
