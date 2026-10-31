-- Pages produits détaillées (/produits/<slug>).
-- Une fiche par produit, liée à products.id. La table products et la fonction
-- creer_commande ne sont pas modifiées : un produit sans fiche fonctionne
-- exactement comme avant.
--
-- publiee = l'interrupteur « Page détaillée » de l'admin. Le désactiver ne
-- supprime rien : la fiche reste enregistrée pour une réactivation ultérieure.
-- Script relançable sans risque.

CREATE TABLE IF NOT EXISTS public.fiches_produits (
  product_id       uuid PRIMARY KEY REFERENCES public.products(id) ON DELETE CASCADE,
  slug             text NOT NULL UNIQUE
                   CHECK (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$' AND length(slug) <= 80),
  publiee          boolean NOT NULL DEFAULT false,
  titre_complet    text,
  accroche         text,
  description      text,
  origine_detail   text,
  caracteristiques text,
  gout             text,
  conservation     text,
  preparation      text,
  saison_mois      smallint[] NOT NULL DEFAULT '{}'
                   CHECK (saison_mois <@ '{1,2,3,4,5,6,7,8,9,10,11,12}'::smallint[]),
  photos           text[] NOT NULL DEFAULT '{}'
                   CHECK (cardinality(photos) <= 8),
  recettes         jsonb NOT NULL DEFAULT '[]'::jsonb
                   CHECK (jsonb_typeof(recettes) = 'array'),
  created_at       timestamptz NOT NULL DEFAULT now(),
  updated_at       timestamptz NOT NULL DEFAULT now(),
  -- Pas de page en ligne sans description (évite de publier une page vide)
  CONSTRAINT fiches_produits_publiee_avec_description
    CHECK (NOT publiee OR coalesce(btrim(description), '') <> '')
);

-- Date de dernière modification tenue à jour automatiquement
CREATE OR REPLACE FUNCTION public.fiches_produits_maj_date()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS fiches_produits_maj_date ON public.fiches_produits;
CREATE TRIGGER fiches_produits_maj_date
  BEFORE UPDATE ON public.fiches_produits
  FOR EACH ROW EXECUTE FUNCTION public.fiches_produits_maj_date();

-- Contrôle d'accès, appliqué par la base elle-même : même en interrogeant
-- Supabase directement (sans passer par le site), une fiche non publiée ou
-- celle d'un produit désactivé reste illisible pour les visiteurs.
ALTER TABLE public.fiches_produits ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON public.fiches_produits FROM anon, authenticated;
GRANT SELECT ON public.fiches_produits TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.fiches_produits TO authenticated;

DROP POLICY IF EXISTS fiches_produits_lecture ON public.fiches_produits;
CREATE POLICY fiches_produits_lecture ON public.fiches_produits
  FOR SELECT TO anon, authenticated
  USING (
    (publiee AND EXISTS (
      SELECT 1 FROM public.products p
       WHERE p.id = fiches_produits.product_id AND p.actif
    ))
    OR public.is_admin()
  );

DROP POLICY IF EXISTS fiches_produits_admin_insert ON public.fiches_produits;
CREATE POLICY fiches_produits_admin_insert ON public.fiches_produits
  FOR INSERT TO authenticated WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS fiches_produits_admin_update ON public.fiches_produits;
CREATE POLICY fiches_produits_admin_update ON public.fiches_produits
  FOR UPDATE TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS fiches_produits_admin_delete ON public.fiches_produits;
CREATE POLICY fiches_produits_admin_delete ON public.fiches_produits
  FOR DELETE TO authenticated USING (public.is_admin());
