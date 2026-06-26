-- Le stock par variété est supprimé : il se gère désormais uniquement au
-- niveau du produit parent, quelle que soit la variété choisie par le client.
ALTER TABLE product_variants DROP COLUMN IF EXISTS stock;

CREATE OR REPLACE FUNCTION decrementer_stock_panier(p_items jsonb)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  item jsonb;
  v_id text;
  v_qte numeric;
  v_stock numeric;
  v_nom text;
BEGIN
  FOR item IN SELECT * FROM jsonb_array_elements(p_items)
  LOOP
    v_id := item->>'id';
    v_qte := (item->>'quantite')::numeric;

    IF v_id IS NULL OR v_qte IS NULL OR v_qte <= 0 THEN
      RAISE EXCEPTION 'Article invalide';
    END IF;

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
  END LOOP;
END;
$$;
