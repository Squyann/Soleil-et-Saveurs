-- Variétés/déclinaisons d'un même produit (ex: Salade -> Batavia, Scarole...).
-- L'admin crée un seul produit "Salade" et y attache plusieurs variétés,
-- chacune avec son propre stock. Le prix reste celui du produit parent
-- (même prix pour toutes les variétés, choix confirmé avec l'utilisateur).
-- product_id est en TEXT (pas de FK stricte) car le type réel de products.id
-- n'est pas connu avec certitude depuis le code applicatif existant.
CREATE TABLE IF NOT EXISTS product_variants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id TEXT NOT NULL,
  nom TEXT NOT NULL,
  stock NUMERIC NOT NULL DEFAULT 0,
  ordre INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS product_variants_product_id_idx ON product_variants (product_id);

ALTER TABLE product_variants ENABLE ROW LEVEL SECURITY;

-- Lecture publique : nécessaire pour afficher le menu déroulant en boutique.
CREATE POLICY "product_variants_read_all" ON product_variants
  FOR SELECT USING (true);

-- Gestion complète pour l'admin (utilisateur authentifié), comme codes_promo.
CREATE POLICY "product_variants_admin_insert" ON product_variants
  FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "product_variants_admin_update" ON product_variants
  FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "product_variants_admin_delete" ON product_variants
  FOR DELETE TO authenticated USING (true);

-- Décrément de stock atomique tenant compte des variétés : si un item du
-- panier précise un variant_id, on verrouille et décrémente
-- product_variants.stock au lieu de products.stock.
CREATE OR REPLACE FUNCTION decrementer_stock_panier(p_items jsonb)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  item jsonb;
  v_id text;
  v_variant_id text;
  v_qte numeric;
  v_stock numeric;
  v_nom text;
BEGIN
  FOR item IN SELECT * FROM jsonb_array_elements(p_items)
  LOOP
    v_id := item->>'id';
    v_variant_id := item->>'variant_id';
    v_qte := (item->>'quantite')::numeric;

    IF v_id IS NULL OR v_qte IS NULL OR v_qte <= 0 THEN
      RAISE EXCEPTION 'Article invalide';
    END IF;

    IF v_variant_id IS NOT NULL THEN
      SELECT stock, nom INTO v_stock, v_nom
        FROM product_variants
        WHERE id::text = v_variant_id AND product_id = v_id
        FOR UPDATE;

      IF NOT FOUND THEN
        RAISE EXCEPTION 'Variété introuvable : %', v_variant_id;
      END IF;

      IF v_stock < v_qte THEN
        RAISE EXCEPTION 'Stock insuffisant pour : %', v_nom;
      END IF;

      UPDATE product_variants SET stock = stock - v_qte WHERE id::text = v_variant_id;
    ELSE
      SELECT stock, name INTO v_stock, v_nom
        FROM products
        WHERE id::text = v_id
        FOR UPDATE;

      IF NOT FOUND THEN
        RAISE EXCEPTION 'Produit introuvable : %', v_id;
      END IF;

      IF v_stock IS NOT NULL AND v_stock < v_qte THEN
        RAISE EXCEPTION 'Stock insuffisant pour : %', v_nom;
      END IF;

      IF v_stock IS NOT NULL THEN
        UPDATE products SET stock = stock - v_qte WHERE id::text = v_id;
      END IF;
    END IF;
  END LOOP;
END;
$$;

REVOKE ALL ON FUNCTION decrementer_stock_panier(jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION decrementer_stock_panier(jsonb) TO authenticated;
