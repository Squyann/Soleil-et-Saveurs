-- Conditionnement propre à une variante (ex. Haricots verts fins : barquette
-- de 250 g / barquette de 500 g). Vide = celui du produit si la variante est
-- vendue dans la même unité, sinon non précisé. Mêmes règles que products.
ALTER TABLE public.product_variants
  ADD COLUMN IF NOT EXISTS contenance numeric,
  ADD COLUMN IF NOT EXISTS contenance_unite text;

ALTER TABLE public.product_variants ADD CONSTRAINT product_variants_contenance_valide CHECK (
  (contenance IS NULL AND contenance_unite IS NULL)
  OR (contenance > 0 AND contenance_unite IN ('g', 'kg', 'pièces'))
);
