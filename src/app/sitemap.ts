import type { MetadataRoute } from 'next';
import { createClient } from '@supabase/supabase-js';

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
  } catch {}

  return pages;
}
