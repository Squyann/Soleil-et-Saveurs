-- 1) Décrément de stock atomique côté serveur.
-- Avant cette fonction, le stock n'était jamais vérifié/décrémenté en base :
-- deux clients pouvaient acheter en même temps le dernier exemplaire d'un produit.
-- SECURITY DEFINER + FOR UPDATE verrouille la ligne produit pendant la vérification,
-- ce qui rend l'opération atomique même en cas de commandes simultanées.
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

REVOKE ALL ON FUNCTION decrementer_stock_panier(jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION decrementer_stock_panier(jsonb) TO authenticated;

-- 2) Verrouillage des points de fidélité / remise parrainage.
-- Avant cette fonction, le client mettait à jour profiles.loyalty_points et
-- has_referral_discount via un .update() direct depuis le navigateur : un
-- utilisateur pouvait s'attribuer des points ou une remise arbitraires en
-- appelant la même requête Supabase depuis la console du navigateur.
-- On retire le droit d'écriture direct sur ces colonnes et on passe par une
-- fonction qui relit l'état réel du profil avant de le modifier.
CREATE OR REPLACE FUNCTION appliquer_recompenses_commande(
  p_points_gagnes integer,
  p_consommer_loyalty boolean,
  p_consommer_referral boolean
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_current record;
  v_new_points integer;
BEGIN
  IF p_points_gagnes IS NULL OR p_points_gagnes < 0 THEN
    RAISE EXCEPTION 'Points gagnés invalides';
  END IF;

  SELECT loyalty_points, has_referral_discount, referral_pending
    INTO v_current
    FROM profiles
    WHERE user_id = auth.uid()
    FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Profil introuvable';
  END IF;

  IF p_consommer_loyalty AND COALESCE(v_current.loyalty_points, 0) < 100 THEN
    RAISE EXCEPTION 'Points de fidélité insuffisants';
  END IF;

  IF p_consommer_referral AND NOT (v_current.has_referral_discount AND NOT v_current.referral_pending) THEN
    RAISE EXCEPTION 'Remise parrainage non disponible';
  END IF;

  v_new_points := GREATEST(
    0,
    CASE WHEN p_consommer_loyalty THEN p_points_gagnes ELSE COALESCE(v_current.loyalty_points, 0) + p_points_gagnes END
  );

  UPDATE profiles
  SET
    loyalty_points = v_new_points,
    has_referral_discount = CASE
      WHEN p_consommer_referral THEN false
      WHEN v_current.referral_pending THEN true
      ELSE has_referral_discount
    END,
    referral_pending = CASE WHEN v_current.referral_pending THEN false ELSE referral_pending END
  WHERE user_id = auth.uid();
END;
$$;

REVOKE ALL ON FUNCTION appliquer_recompenses_commande(integer, boolean, boolean) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION appliquer_recompenses_commande(integer, boolean, boolean) TO authenticated;

-- 3) Idem pour l'activation du bon de parrainage en attente : avant cette
-- fonction, le client appelait process_referral() puis mettait à jour
-- referral_pending/has_referral_discount lui-même dans un second appel
-- séparé — rien n'empêchait d'appeler ce second .update() directement,
-- sans jamais avoir fourni de code de parrainage valide. On enchaîne les
-- deux étapes dans une seule fonction, et l'activation ne se déclenche
-- que si process_referral() a réellement validé le code.
-- (process_referral() existant n'est pas modifié, juste appelé en interne.)
CREATE OR REPLACE FUNCTION process_referral_for_self(p_referral_code text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_success boolean;
BEGIN
  SELECT process_referral(p_referral_code, auth.uid()) INTO v_success;

  IF v_success THEN
    UPDATE profiles
    SET has_referral_discount = false, referral_pending = true
    WHERE user_id = auth.uid();
  END IF;

  RETURN COALESCE(v_success, false);
END;
$$;

REVOKE ALL ON FUNCTION process_referral_for_self(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION process_referral_for_self(text) TO authenticated;

-- Empêche toute écriture directe sur ces colonnes depuis le client
-- (les fonctions SECURITY DEFINER ci-dessus continuent de fonctionner :
-- elles s'exécutent avec les droits du propriétaire de la fonction, pas du client).
REVOKE UPDATE (loyalty_points, has_referral_discount, referral_pending) ON profiles FROM authenticated;
