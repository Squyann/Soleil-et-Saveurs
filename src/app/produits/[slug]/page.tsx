import { cache } from 'react';
import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowLeft, ArrowRight, Eye, ShoppingBasket } from 'lucide-react';
import { supabaseServeur } from '@/lib/supabase-serveur';
import { moisCourantParis, resoudreFiche, type Fiche, type FicheAffichee, type FicheVariante } from '@/lib/fiches';
import { etiquettesPromo } from '@/lib/promos';
import { formatPrix, libelleUnite } from '@/lib/format';
import EnTeteProduit from '@/components/fiche/EnTeteProduit';
import { nomVariante, slugVariante, variantesActives, type Variante } from '@/lib/variantes';

// Contrôle d'accès : la fiche est lue avec la session du visiteur, donc avec les
// règles de la base. Une fiche non publiée (ou d'un produit désactivé) n'est
// renvoyée qu'à un admin connecté ; pour tout autre visiteur la base ne renvoie
// rien et la page répond 404, sans jamais envoyer son contenu au navigateur.
// Page recalculée à chaque visite (cookies) : publier ou dépublier prend effet
// immédiatement.
const chargerPage = cache(async (slug: string) => {
  const supabase = await supabaseServeur();
  const { data: fiche } = await supabase
    .from('fiches_produits')
    .select('*')
    .eq('slug', slug)
    .maybeSingle();
  if (!fiche) return null;

  const [{ data: produit }, { data: variantes }] = await Promise.all([
    supabase.from('products').select('*').eq('id', fiche.product_id).maybeSingle(),
    supabase.from('product_variants').select('*').eq('product_id', fiche.product_id).order('ordre', { ascending: true }),
  ]);
  if (!produit) return null;

  // Fiches propres aux variantes (table absente : on fait comme avant)
  const actives = variantesActives((variantes ?? []) as Variante[]);
  let fichesVariantes: FicheVariante[] = [];
  if (actives.length) {
    const { data } = await supabase.from('fiches_variantes').select('*').in('variant_id', actives.map(v => v.id));
    fichesVariantes = (data as FicheVariante[] | null) ?? [];
  }
  const ficheDe = new Map(fichesVariantes.map(f => [f.variant_id, f]));

  // Fiche affichée pour chaque variante (rubriques vides = celles du produit)
  const f = fiche as Fiche;
  const affichages: Record<string, FicheAffichee> = { '': resoudreFiche(f, produit, null, null) };
  const slugs: Record<string, string> = {};
  for (const v of actives) {
    affichages[v.id] = resoudreFiche(f, produit, v, ficheDe.get(v.id) ?? null, nomVariante(produit, v));
    slugs[v.id] = slugVariante(produit, v);
  }

  // Visible uniquement par un admin : brouillon ou produit désactivé
  const apercu = !fiche.publiee || produit.actif === false;
  return { fiche: f, produit, variantes: actives, affichages, slugs, apercu };
});

// Variante demandée dans l'adresse (?variete=…), sinon la première
function varianteDemandee(page: { variantes: Variante[]; slugs: Record<string, string> }, variete: string | string[] | undefined): Variante | null {
  const v = typeof variete === 'string' ? page.variantes.find(x => page.slugs[x.id] === variete) : undefined;
  return v ?? page.variantes[0] ?? null;
}

// « Vous aimerez aussi » : autres produits dont la page est publiée, ceux de
// la même catégorie d'abord.
async function chargerSuggestions(productId: string, categorie: string) {
  const supabase = await supabaseServeur();
  const { data: fiches } = await supabase
    .from('fiches_produits')
    .select('product_id, slug')
    .eq('publiee', true)
    .neq('product_id', productId)
    .limit(60);
  if (!fiches?.length) return [];
  const { data: produits } = await supabase
    .from('products')
    .select('*')
    .in('id', fiches.map(f => f.product_id))
    .neq('actif', false);
  if (!produits?.length) return [];
  const slugParProduit = new Map(fiches.map(f => [f.product_id, f.slug]));
  return produits
    .sort((a, b) => Number(b.category === categorie) - Number(a.category === categorie) || a.name.localeCompare(b.name, 'fr'))
    .slice(0, 4)
    .map(p => ({ ...p, slug: slugParProduit.get(p.id) as string }));
}

function resume(texte: string | null | undefined, max = 160) {
  const t = (texte ?? '').replace(/\s+/g, ' ').trim();
  return t.length > max ? `${t.slice(0, max - 1).trimEnd()}…` : t;
}

export async function generateMetadata({ params, searchParams }: { params: Promise<{ slug: string }>; searchParams: Promise<{ variete?: string | string[] }> }): Promise<Metadata> {
  const { slug } = await params;
  const { variete } = await searchParams;
  const page = await chargerPage(slug);
  if (!page) return { title: 'Page introuvable — Soleil et Saveurs' };
  const { fiche, produit, apercu } = page;
  // Une adresse par variante seulement quand elle est demandée explicitement
  const v = typeof variete === 'string' ? varianteDemandee(page, variete) : null;
  const vue = v && page.slugs[v.id] === variete ? page.affichages[v.id] : page.affichages[''];
  const url = v && page.slugs[v.id] === variete ? `/produits/${fiche.slug}?variete=${variete}` : `/produits/${fiche.slug}`;
  const titre = vue.titre;
  const description = resume(vue.accroche || vue.description) || `${produit.name}, livré chez vous dans les Yvelines.`;
  const image = vue.photos[0];
  return {
    title: `${titre} — Soleil et Saveurs`,
    description,
    alternates: { canonical: url },
    robots: apercu ? { index: false, follow: false } : undefined,
    openGraph: {
      title: titre,
      description,
      url,
      siteName: 'Soleil et Saveurs',
      locale: 'fr_FR',
      type: 'website',
      images: image ? [{ url: image, alt: titre }] : undefined,
    },
  };
}

export default async function PageProduit({ params, searchParams }: { params: Promise<{ slug: string }>; searchParams: Promise<{ variete?: string | string[] }> }) {
  const { slug } = await params;
  const { variete } = await searchParams;
  const page = await chargerPage(slug);
  if (!page) notFound();
  const { fiche, produit, variantes, affichages, slugs, apercu } = page;

  const titre = affichages[''].titre;
  const selectionInitiale = varianteDemandee(page, variete)?.id ?? null;
  const moisCourant = moisCourantParis();
  const suggestions = await chargerSuggestions(produit.id, produit.category);

  return (
    <main className="min-h-screen bg-[#EDE3D5] text-[#3D2B1F] pt-2 lg:pt-7 pb-28 lg:pb-20 px-3 md:px-10">
      <div className="max-w-[1240px] mx-auto">
        {apercu && (
          <div className="mt-2 mb-3 flex items-center gap-3 bg-[#3D2B1F] text-white rounded-2xl px-4 py-3 shadow-lg">
            <Eye className="w-5 h-5 text-[#FF7A47] shrink-0" aria-hidden />
            <p className="text-[13px] font-bold leading-snug">
              Aperçu administrateur — {produit.actif === false ? 'produit désactivé' : 'page non publiée'} : les clients ne la voient pas.
            </p>
          </div>
        )}

        <Link href="/commander" className="lg:hidden inline-flex items-center gap-2 min-h-11 px-1 text-sm font-bold text-[#5C4030] active:text-[#C73600]">
          <ArrowLeft className="w-[17px] h-[17px]" strokeWidth={2.2} aria-hidden /> Retour au catalogue
        </Link>
        <nav aria-label="Fil d'Ariane" className="hidden lg:flex items-center gap-2 mb-[22px] text-[13px] font-semibold text-[#6F5A4B]">
          <Link href="/commander" className="hover:text-[#C73600] transition-colors">Boutique</Link>
          {produit.category && <><span aria-hidden>›</span><span>{produit.category}</span></>}
          <span aria-hidden>›</span>
          <span aria-current="page" className="font-bold text-[#3D2B1F]">{titre}</span>
        </nav>

        {/* EN-TÊTE ET CONTENU : photos, nom, variantes, achat, puis la fiche de
            la variante choisie (rubriques vides = celles du produit) */}
        <EnTeteProduit
          produit={produit}
          variantes={variantes}
          affichages={affichages}
          slugs={slugs}
          selectionInitiale={selectionInitiale}
          moisCourant={moisCourant}
          slugPage={fiche.slug}
        />

        {/* VOUS AIMEREZ AUSSI */}
        {suggestions.length > 0 && (
          <section className="mt-9 lg:mt-[88px]">
            <div className="flex items-end justify-between gap-5 flex-wrap mb-3.5 lg:mb-7 px-2 lg:px-0">
              <h2 className="titre text-[32px] lg:text-[46px] leading-none">
                Vous aimerez <em className="text-[#FF4500]">aussi</em>
              </h2>
              <Link href="/commander" className="group hidden lg:inline-flex items-center gap-2.5 px-5 py-3 rounded-full border-[1.5px] border-[#3D2B1F] text-sm font-bold hover:bg-[#3D2B1F] hover:text-[#F5EAE0] transition-colors">
                Retour au catalogue
                <ArrowRight className="w-[18px] h-[18px] transition-transform duration-200 group-hover:translate-x-1" aria-hidden />
              </Link>
            </div>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 lg:gap-5">
              {suggestions.map(s => {
                const etiquette = etiquettesPromo(s)[0];
                const prix = s.promotion > 0 ? s.price * (1 - s.promotion / 100) : Number(s.price);
                return (
                  <Link key={s.id} href={`/produits/${s.slug}`} className="group flex flex-col bg-white rounded-[18px] lg:rounded-3xl border border-[#E8DCCB] p-1.5 lg:p-2.5 transition-[transform,box-shadow] duration-300 ease-out lg:hover:-translate-y-1 lg:hover:shadow-[0_26px_44px_-28px_rgba(61,43,31,0.5)]">
                    <div className="relative aspect-[3/2] bg-white rounded-xl lg:rounded-2xl overflow-hidden">
                      {s.image_url ? (
                        <img src={s.image_url} alt="" className="w-full h-full object-cover transition-transform duration-700 ease-out group-hover:scale-105" loading="lazy" />
                      ) : (
                        <span className="absolute inset-0 flex items-center justify-center bg-[#F5EAE0] text-[#C9BBAA]"><ShoppingBasket className="w-10 h-10" aria-hidden /></span>
                      )}
                      {etiquette && (
                        <span className={`absolute left-1.5 top-1.5 lg:left-2 lg:top-2 px-2 py-1 lg:px-2.5 rounded-full text-white text-[11px] lg:text-[13px] font-extrabold ${etiquette.cle === 'offertes' ? 'bg-[#166534]' : etiquette.cle === 'lot' ? 'bg-[#3D2B1F]' : 'bg-[#D43A00]'}`}>{etiquette.court}</span>
                      )}
                    </div>
                    <div className="px-1 lg:px-1.5 pt-2.5 lg:pt-3.5 pb-1.5">
                      <p className="text-sm lg:text-[17px] font-extrabold leading-tight line-clamp-2 group-hover:underline">{s.name}</p>
                      <p className="mt-0.5 text-xs lg:text-[13px] font-semibold text-[#6F5A4B]">{s.provenance ? `${s.provenance} · ` : ''}{libelleUnite(s.unite)}</p>
                      <p className={`mt-2 lg:mt-2.5 text-lg lg:text-[22px] font-black tracking-tight ${s.promotion > 0 ? 'text-[#FF4500]' : ''}`}>
                        {formatPrix(prix)}<span className="text-xs lg:text-[13px] font-bold tracking-normal text-[#6F5A4B]"> /{s.unite === 'g' ? 'kg' : s.unite || 'pièce'}</span>
                      </p>
                    </div>
                  </Link>
                );
              })}
            </div>
          </section>
        )}
      </div>
    </main>
  );
}
