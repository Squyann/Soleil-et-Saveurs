import { cache } from 'react';
import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import {
  ArrowLeft, ArrowRight, MapPin, Sparkles, Utensils, Refrigerator, ChefHat, Leaf,
  Clock, Users, Eye, Check, ChevronDown, ShoppingBasket,
} from 'lucide-react';
import { supabaseServeur } from '@/lib/supabase-serveur';
import { MOIS, MOIS_COURTS, moisCourantParis, type Fiche, type Recette } from '@/lib/fiches';
import { etiquettesPromo } from '@/lib/promos';
import { formatPrix, libelleUnite } from '@/lib/format';
import Rubrique from '@/components/fiche/Rubrique';
import EnTeteProduit from '@/components/fiche/EnTeteProduit';
import { variantesActives } from '@/lib/variantes';

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

  // Visible uniquement par un admin : brouillon ou produit désactivé
  const apercu = !fiche.publiee || produit.actif === false;
  return { fiche: fiche as Fiche, produit, variantes: variantes ?? [], apercu };
});

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

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const page = await chargerPage(slug);
  if (!page) return { title: 'Page introuvable — Soleil et Saveurs' };
  const { fiche, produit, apercu } = page;
  const titre = fiche.titre_complet?.trim() || produit.name;
  const description = resume(fiche.accroche || fiche.description) || `${produit.name}, livré chez vous dans les Yvelines.`;
  const image = produit.image_url || fiche.photos[0];
  return {
    title: `${titre} — Soleil et Saveurs`,
    description,
    alternates: { canonical: `/produits/${fiche.slug}` },
    robots: apercu ? { index: false, follow: false } : undefined,
    openGraph: {
      title: titre,
      description,
      url: `/produits/${fiche.slug}`,
      siteName: 'Soleil et Saveurs',
      locale: 'fr_FR',
      type: 'website',
      images: image ? [{ url: image, alt: titre }] : undefined,
    },
  };
}

// Texte d'une rubrique ; `liste` : une ligne par point, avec une coche
function TexteRubrique({ texte, liste = false }: { texte: string; liste?: boolean }) {
  const lignes = texte.trim().split('\n').map(l => l.trim()).filter(Boolean);
  if (liste && lignes.length > 1) {
    return (
      <ul className="flex flex-col gap-2 lg:gap-[9px] text-[15px] lg:text-base leading-snug text-[#5C4030]">
        {lignes.map((ligne, i) => (
          <li key={i} className="flex gap-2.5">
            <Check className="w-[17px] h-[17px] lg:w-[18px] lg:h-[18px] shrink-0 mt-0.5 text-[#15803D]" strokeWidth={2.6} aria-hidden />
            {ligne}
          </li>
        ))}
      </ul>
    );
  }
  return <p className="text-[15px] lg:text-base leading-relaxed text-[#5C4030] whitespace-pre-line">{texte.trim()}</p>;
}

function FriseSaison({ mois, moisCourant, deSaison }: { mois: number[]; moisCourant: number; deSaison: boolean }) {
  return (
    <section className="bg-white rounded-3xl lg:rounded-[28px] border border-[#E8DCCB] p-5 lg:px-9 lg:py-[30px]">
      <div className="flex items-center justify-between gap-3 flex-wrap mb-4 lg:mb-5">
        <h2 className="titre text-[26px] leading-[1.1]">Saisonnalité</h2>
        {deSaison && (
          <p className="inline-flex items-center gap-2 px-3 py-1.5 lg:px-3.5 lg:py-2 rounded-full bg-[#ECF7EF] text-[13px] lg:text-sm font-extrabold text-[#166534]">
            <Leaf className="w-4 h-4" aria-hidden />De saison en ce moment
          </p>
        )}
      </div>
      <ol className="grid grid-cols-12 gap-[5px] lg:gap-2">
        {MOIS.map((nom, i) => {
          const m = i + 1;
          const enSaison = mois.includes(m);
          const courant = m === moisCourant;
          return (
            <li key={nom} aria-current={courant ? 'true' : undefined} className="flex flex-col items-center gap-1.5 lg:gap-2" title={`${nom}${enSaison ? ' : de saison' : ''}`}>
              <span className={`w-full h-[34px] lg:h-11 rounded-lg lg:rounded-xl ${enSaison ? 'bg-[#15803D]' : 'bg-[#EDE3D5]'} ${courant ? 'outline outline-[2.5px] lg:outline-[3px] outline-offset-2 lg:outline-offset-[3px] outline-[#FF4500]' : ''}`} />
              <span className={`text-xs ${courant ? 'font-extrabold text-[#C73600]' : enSaison ? 'font-extrabold text-[#166534]' : 'font-bold text-[#6F5A4B]'}`}>
                <span className="lg:hidden" aria-hidden>{nom[0]}</span>
                <span className="sr-only lg:not-sr-only">{MOIS_COURTS[i]}</span>
              </span>
            </li>
          );
        })}
      </ol>
      <p className="mt-4 lg:mt-5 flex items-center gap-4 lg:gap-5 flex-wrap text-[12.5px] lg:text-[13px] font-semibold text-[#6F5A4B]">
        <span className="inline-flex items-center gap-2"><span className="w-3 h-3 lg:w-3.5 lg:h-3.5 rounded bg-[#15803D]" />Mois de saison</span>
        <span className="inline-flex items-center gap-2"><span className="w-2.5 h-2.5 lg:w-3 lg:h-3 rounded-[3px] outline outline-2 outline-offset-2 outline-[#FF4500]" />Mois en cours</span>
      </p>
    </section>
  );
}

function CarteRecette({ recette }: { recette: Recette }) {
  const ingredients = recette.ingredients?.filter(Boolean) ?? [];
  const etapes = recette.etapes?.filter(Boolean) ?? [];
  return (
    <details className="group bg-white rounded-3xl lg:rounded-[28px] border border-[#E8DCCB] overflow-hidden">
      <summary className="list-none [&::-webkit-details-marker]:hidden cursor-pointer flex flex-wrap items-center gap-x-4 gap-y-3 lg:gap-x-[22px] p-[18px] lg:px-[26px] lg:py-[22px] hover:bg-[#FFFBF7] transition-colors">
        {recette.photo ? (
          <img src={recette.photo} alt="" className="w-20 lg:w-24 aspect-[3/2] object-cover rounded-[14px] shrink-0" loading="lazy" />
        ) : (
          <span className="hidden sm:flex w-[60px] h-[60px] rounded-[18px] bg-[#FFF1EA] text-[#FF4500] items-center justify-center shrink-0" aria-hidden><ChefHat className="w-[26px] h-[26px]" /></span>
        )}
        <div className="min-w-0 flex-1 basis-[200px]">
          <h3 className="text-[17px] lg:text-[19px] font-extrabold leading-snug text-[#3D2B1F]">{recette.titre}</h3>
          <p className="mt-1.5 flex flex-wrap items-center gap-x-3.5 gap-y-1 text-[13px] lg:text-sm font-semibold text-[#6F5A4B]">
            {recette.temps && <span className="inline-flex items-center gap-1.5"><Clock className="w-[15px] h-[15px]" aria-hidden />{recette.temps}</span>}
            {recette.personnes && <span className="inline-flex items-center gap-1.5"><Users className="w-[15px] h-[15px]" aria-hidden />{recette.personnes} pers.</span>}
            {ingredients.length > 0 && <span>{ingredients.length} ingrédient{ingredients.length > 1 ? 's' : ''}</span>}
          </p>
        </div>
        <span className="w-full sm:w-auto shrink-0 inline-flex items-center justify-center gap-2 h-12 px-[18px] rounded-[14px] sm:rounded-full border-[1.5px] border-[#3D2B1F] text-sm font-bold text-[#3D2B1F] group-hover:bg-[#3D2B1F] group-hover:text-[#F5EAE0] transition-colors">
          <span className="group-open:hidden">Voir la recette</span>
          <span className="hidden group-open:inline">Fermer la recette</span>
          <ChevronDown className="w-4 h-4 transition-transform duration-200 group-open:rotate-180" strokeWidth={2.4} aria-hidden />
        </span>
      </summary>
      <div className="px-[18px] pb-5 lg:px-[26px] lg:pb-7 grid md:grid-cols-[1fr_1.6fr] gap-6 border-t border-[#F0E7DA] pt-5">
        {ingredients.length > 0 && (
          <div>
            <p className="mb-2.5 text-xs font-extrabold uppercase tracking-[0.14em] text-[#C73600]">Ingrédients</p>
            <ul className="flex flex-col gap-2">
              {ingredients.map((ing, i) => (
                <li key={i} className="flex gap-2.5 text-[15px] leading-snug text-[#5C4030]"><span className="mt-[7px] w-1.5 h-1.5 rounded-full bg-[#FF4500] shrink-0" aria-hidden />{ing}</li>
              ))}
            </ul>
          </div>
        )}
        {etapes.length > 0 && (
          <div>
            <p className="mb-2.5 text-xs font-extrabold uppercase tracking-[0.14em] text-[#C73600]">Préparation</p>
            <ol className="flex flex-col gap-3.5">
              {etapes.map((etape, i) => (
                <li key={i} className="flex gap-3 text-[15px] text-[#5C4030] leading-relaxed">
                  <span className="titre w-7 h-7 rounded-full bg-[#3D2B1F] text-[#F5EAE0] text-sm flex items-center justify-center shrink-0">{i + 1}</span>
                  <span className="pt-0.5">{etape}</span>
                </li>
              ))}
            </ol>
          </div>
        )}
      </div>
    </details>
  );
}

export default async function PageProduit({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const page = await chargerPage(slug);
  if (!page) notFound();
  const { fiche, produit, variantes, apercu } = page;

  const titre = fiche.titre_complet?.trim() || produit.name;
  const photos = [produit.image_url, ...(fiche.photos ?? [])].filter((u, i, t): u is string => !!u && t.indexOf(u) === i);
  const moisCourant = moisCourantParis();
  const saison = (fiche.saison_mois ?? []).map(Number);
  const deSaison = saison.includes(moisCourant);
  const recettes = (fiche.recettes ?? []).filter(r => r?.titre?.trim());
  const suggestions = await chargerSuggestions(produit.id, produit.category);

  const rubriques = [
    { cle: 'origine', titre: 'Origine', texte: fiche.origine_detail, icone: <MapPin className="w-[22px] h-[22px]" /> },
    { cle: 'caracteristiques', titre: 'Caractéristiques', texte: fiche.caracteristiques, icone: <Sparkles className="w-[22px] h-[22px]" />, liste: true },
    { cle: 'gout', titre: 'Goût et saveurs', texte: fiche.gout, icone: <Utensils className="w-[22px] h-[22px]" /> },
    { cle: 'conservation', titre: 'Conservation', texte: fiche.conservation, icone: <Refrigerator className="w-[22px] h-[22px]" /> },
    { cle: 'preparation', titre: 'Conseils de préparation', texte: fiche.preparation, icone: <ChefHat className="w-[22px] h-[22px]" />, large: true },
  ].filter(r => r.texte?.trim());
  const description = fiche.description?.trim();
  // Sur mobile, la première rubrique est dépliée ; la dernière, seule sur sa ligne, prend toute la largeur
  const rubriquesCourtes = rubriques.filter(r => !r.large);

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

        {/* EN-TÊTE : photos, nom, variantes et achat — puis le contenu de la fiche */}
        <EnTeteProduit
          produit={produit}
          variantes={variantesActives(variantes)}
          photos={photos}
          titre={titre}
          accroche={fiche.accroche?.trim() || null}
          deSaison={deSaison}
        >
          {(description || rubriques.length > 0) && (
            <div className="bg-white rounded-3xl border border-[#E8DCCB] overflow-hidden lg:bg-transparent lg:border-0 lg:rounded-none lg:overflow-visible lg:grid lg:grid-cols-2 lg:gap-[22px]">
              {description && (
                <section className="p-5 lg:col-span-2 lg:bg-white lg:rounded-[28px] lg:border lg:border-[#E8DCCB] lg:px-9 lg:py-[34px]">
                  <p className="hidden lg:block mb-2.5 text-xs font-extrabold uppercase tracking-[0.14em] text-[#C73600]">Le produit</p>
                  <h2 className="titre text-[26px] lg:text-[34px] leading-[1.05] mb-2.5 lg:mb-4">Description</h2>
                  <p className="text-[15.5px] lg:text-[17px] leading-relaxed lg:leading-[1.7] text-[#5C4030] whitespace-pre-line">{description}</p>
                </section>
              )}
              {rubriques.map((r, i) => (
                <Rubrique
                  key={r.cle}
                  icone={r.icone}
                  titre={r.titre}
                  ouverteSurMobile={!description ? i === 0 : r.cle === 'caracteristiques'}
                  teinte={!!r.large}
                  large={!!r.large || (rubriquesCourtes.length % 2 === 1 && r === rubriquesCourtes[rubriquesCourtes.length - 1])}
                >
                  <TexteRubrique texte={r.texte as string} liste={r.liste} />
                </Rubrique>
              ))}
            </div>
          )}

          {saison.length > 0 && <FriseSaison mois={saison} moisCourant={moisCourant} deSaison={deSaison} />}

          {recettes.length > 0 && (
            <section className="pt-5 lg:pt-4">
              <h2 className="titre text-[32px] lg:text-[40px] leading-none mb-3.5 lg:mb-[18px] px-2 lg:px-0">
                Idées <em className="text-[#FF4500]">recettes</em>
              </h2>
              <div className="flex flex-col gap-3">
                {recettes.map((r, i) => <CarteRecette key={i} recette={r} />)}
              </div>
            </section>
          )}
        </EnTeteProduit>

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
