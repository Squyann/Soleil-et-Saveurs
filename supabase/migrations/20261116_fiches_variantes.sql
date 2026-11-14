-- Fiches des variantes : chaque variante peut avoir sa propre fiche, affichée
-- sur la page du produit quand le client choisit cette variante.
--
-- Une rubrique vide (NULL) reprend celle du produit principal : seules les
-- rubriques « propres » sont enregistrées ici. Une variante sans ligne dans
-- cette table s'affiche comme avant, avec la fiche du produit.
--
-- Lecture publique seulement si la variante et le produit sont actifs et la
-- page du produit publiée (mêmes règles que fiches_produits) ; écriture
-- réservée à l'administrateur.
--
-- Les variantes issues d'un produit regroupé reprennent l'ancienne fiche de
-- ce produit (copie unique, si elle existe et si la variante n'a pas encore
-- de fiche).
--
-- Une transaction, relançable. Ne modifie aucune table existante.

BEGIN;

CREATE TABLE IF NOT EXISTS public.fiches_variantes (
  variant_id       uuid PRIMARY KEY REFERENCES public.product_variants(id) ON DELETE CASCADE,
  accroche         text,
  description      text,
  origine_detail   text,
  caracteristiques text,
  gout             text,
  conservation     text,
  preparation      text,
  saison_mois      smallint[]
                   CHECK (saison_mois IS NULL OR saison_mois <@ '{1,2,3,4,5,6,7,8,9,10,11,12}'::smallint[]),
  photos           text[]
                   CHECK (photos IS NULL OR cardinality(photos) <= 8),
  recettes         jsonb
                   CHECK (recettes IS NULL OR jsonb_typeof(recettes) = 'array'),
  created_at       timestamptz NOT NULL DEFAULT now(),
  updated_at       timestamptz NOT NULL DEFAULT now()
);

DROP TRIGGER IF EXISTS fiches_variantes_maj_date ON public.fiches_variantes;
CREATE TRIGGER fiches_variantes_maj_date
  BEFORE UPDATE ON public.fiches_variantes
  FOR EACH ROW EXECUTE FUNCTION public.fiches_produits_maj_date();

ALTER TABLE public.fiches_variantes ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.fiches_variantes FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public.fiches_variantes TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.fiches_variantes TO authenticated;

DROP POLICY IF EXISTS fiches_variantes_lecture ON public.fiches_variantes;
CREATE POLICY fiches_variantes_lecture ON public.fiches_variantes
  FOR SELECT TO anon, authenticated
  USING (
    EXISTS (
      SELECT 1
        FROM public.product_variants v
        JOIN public.products p ON p.id::text = v.product_id
        JOIN public.fiches_produits f ON f.product_id = p.id
       WHERE v.id = fiches_variantes.variant_id
         AND coalesce(v.actif, true) AND p.actif AND f.publiee
    )
    OR (SELECT public.is_admin())
  );

DROP POLICY IF EXISTS fiches_variantes_admin_insert ON public.fiches_variantes;
CREATE POLICY fiches_variantes_admin_insert ON public.fiches_variantes
  FOR INSERT TO authenticated WITH CHECK ((SELECT public.is_admin()));
DROP POLICY IF EXISTS fiches_variantes_admin_update ON public.fiches_variantes;
CREATE POLICY fiches_variantes_admin_update ON public.fiches_variantes
  FOR UPDATE TO authenticated USING ((SELECT public.is_admin())) WITH CHECK ((SELECT public.is_admin()));
DROP POLICY IF EXISTS fiches_variantes_admin_delete ON public.fiches_variantes;
CREATE POLICY fiches_variantes_admin_delete ON public.fiches_variantes
  FOR DELETE TO authenticated USING ((SELECT public.is_admin()));

-- Variantes regroupées : reprise de l'ancienne fiche du produit d'origine
INSERT INTO public.fiches_variantes
  (variant_id, accroche, description, origine_detail, caracteristiques, gout, conservation, preparation, saison_mois, photos, recettes)
SELECT v.id,
       nullif(btrim(f.accroche), ''), nullif(btrim(f.description), ''), nullif(btrim(f.origine_detail), ''),
       nullif(btrim(f.caracteristiques), ''), nullif(btrim(f.gout), ''), nullif(btrim(f.conservation), ''),
       nullif(btrim(f.preparation), ''),
       CASE WHEN cardinality(f.saison_mois) > 0 THEN f.saison_mois END,
       CASE WHEN cardinality(f.photos) > 0 THEN f.photos END,
       CASE WHEN jsonb_array_length(f.recettes) > 0 THEN f.recettes END
  FROM public.product_variants v
  JOIN public.fiches_produits f ON f.product_id = v.source_product_id
 WHERE v.source_product_id IS NOT NULL
ON CONFLICT (variant_id) DO NOTHING;

COMMIT;
