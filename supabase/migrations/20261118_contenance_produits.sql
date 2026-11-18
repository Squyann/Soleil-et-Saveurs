-- Conditionnement des produits : contenu d'une unité de vente, saisi dans
-- l'admin (ex. « sachet de 1 kg », « barquette de 500 g », « filet de 3 pièces »).
-- Facultatif : vide = non précisé. Sans objet pour les produits vendus au kg
-- ou au poids.
--
-- Ajoute aussi les unités de vente « sachet » et « filet » (produits et
-- variantes). creer_commande traite déjà toute unité autre que kg / g comme
-- une unité entière : aucun changement de calcul.
--
-- Une transaction, relançable. Ne modifie aucune donnée existante, sauf le
-- passage de la pomme de terre grenaille en « sachet de 1 kg ».

BEGIN;

ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS contenance numeric,
  ADD COLUMN IF NOT EXISTS contenance_unite text;

ALTER TABLE public.products DROP CONSTRAINT IF EXISTS products_contenance_valide;
ALTER TABLE public.products ADD CONSTRAINT products_contenance_valide CHECK (
  (contenance IS NULL AND contenance_unite IS NULL)
  OR (contenance > 0 AND contenance_unite IN ('g', 'kg', 'pièces'))
);

ALTER TABLE public.product_variants DROP CONSTRAINT IF EXISTS product_variants_unite_valide;
ALTER TABLE public.product_variants ADD CONSTRAINT product_variants_unite_valide CHECK (
  unite IS NULL OR unite IN ('kg', 'g', 'pièce', 'botte', 'barquette', 'sachet', 'filet')
);

UPDATE public.products
   SET unite = 'sachet', contenance = 1, contenance_unite = 'kg'
 WHERE name = 'Pomme de terre grenaille' AND unite = 'pièce';

COMMIT;
