import type { MetadataRoute } from 'next';
import { createClient } from '@supabase/supabase-js';
import { slugVariante } from '@/lib/variantes';

const SITE = 'https://soleiletsaveurs.fr';

// Plan du site pour Google : pages publiques + pages produits publiées.
// Calculé à chaque demande pour suivre les publications de l'admin.
export const dynamic = 'force-dynamic';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const pages: MetadataRoute.Sitemap = ['', '/commander', '/livraison', '/aide', '/cgv', '/mentions', '/rgpd']
    .map(chemin => ({ url: `${SITE}${chemin}`, changeFrequency: 'weekly', priority: chemin === '' ? 1 : chemin === '/commander' ? 0.9 : 0.4 }));

  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL ?? 'https://placeholder.supabase.co',
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? 'placeholder-key',
      { auth: { persistSession: false } }
    );
    // Les règles de la base ne renvoient que les fiches publiées de produits actifs
    const { data } = await supabase
      .from('fiches_produits')
      .select('slug, updated_at')
      .eq('publiee', true)
      .abortSignal(AbortSignal.timeout(5000));
    for (const f of data ?? []) {
      pages.push({ url: `${SITE}/produits/${f.slug}`, lastModified: f.updated_at, changeFrequency: 'weekly', priority: 0.7 });
    }

    // Variantes ayant leur propre fiche : une adresse par variante
    const { data: fv } = await supabase.from('fiches_variantes').select('variant_id, updated_at').abortSignal(AbortSignal.timeout(5000));
    if (fv?.length) {
      const { data: variantes } = await supabase.from('product_variants').select('id, nom, product_id').in('id', fv.map(f => f.variant_id));
      const { data: fiches } = await supabase.from('fiches_produits').select('product_id, slug').eq('publiee', true);
      const { data: produits } = await supabase.from('products').select('id, name').in('id', [...new Set((variantes ?? []).map(v => v.product_id))]);
      const slugDe = new Map((fiches ?? []).map(f => [String(f.product_id), f.slug]));
      const produitDe = new Map((produits ?? []).map(p => [String(p.id), p]));
      for (const f of fv) {
        const v = variantes?.find(x => x.id === f.variant_id);
        const produit = v ? produitDe.get(String(v.product_id)) : undefined;
        const slug = v ? slugDe.get(String(v.product_id)) : undefined;
        if (!v || !produit || !slug) continue;
        pages.push({ url: `${SITE}/produits/${slug}?variete=${encodeURIComponent(slugVariante(produit, v))}`, lastModified: f.updated_at, changeFrequency: 'weekly', priority: 0.6 });
      }
    }
  } catch {}

  return pages;
}
