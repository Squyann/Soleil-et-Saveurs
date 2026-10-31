import { cache } from 'react';
import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import {
  ArrowLeft, MapPin, Sparkles, Utensils, Refrigerator, ChefHat, CalendarDays,
  BookOpen, Clock, Users, Leaf, Eye, Flame,
} from 'lucide-react';
import { supabaseServeur } from '@/lib/supabase-serveur';
import { MOIS, MOIS_COURTS, moisCourantParis, type Fiche, type Recette } from '@/lib/fiches';
import { estEnPromo } from '@/lib/promos';
import GaleriePhotos from '@/components/fiche/GaleriePhotos';
import AchatProduit from '@/components/fiche/AchatProduit';
import BoutonPartager from '@/components/fiche/BoutonPartager';

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

function Rubrique({ icone: Icone, titre, texte }: { icone: any; titre: string; texte: string | null }) {
  if (!texte?.trim()) return null;
  return (
    <section className="bg-white rounded-[1.5rem] sm:rounded-[2rem] p-5 sm:p-7 border border-[#DDD0BF] shadow-sm">
      <h2 className="flex items-center gap-2.5 text-sm sm:text-base font-black uppercase tracking-tight text-[#3D2B1F] mb-3">
        <span className="w-9 h-9 rounded-xl bg-orange-50 text-[#FF4500] flex items-center justify-center shrink-0"><Icone className="w-4.5 h-4.5" /></span>
        {titre}
      </h2>
      <p className="text-sm sm:text-[15px] text-slate-600 leading-relaxed whitespace-pre-line">{texte.trim()}</p>
    </section>
  );
}

function FriseSaison({ mois, moisCourant }: { mois: number[]; moisCourant: number }) {
  return (
    <section className="bg-white rounded-[1.5rem] sm:rounded-[2rem] p-5 sm:p-7 border border-[#DDD0BF] shadow-sm">
      <h2 className="flex items-center gap-2.5 text-sm sm:text-base font-black uppercase tracking-tight text-[#3D2B1F] mb-4">
        <span className="w-9 h-9 rounded-xl bg-green-50 text-green-600 flex items-center justify-center shrink-0"><CalendarDays className="w-4.5 h-4.5" /></span>
        Saisonnalité
      </h2>
      <div className="grid grid-cols-12 gap-1 sm:gap-1.5">
        {MOIS.map((nom, i) => {
          const m = i + 1;
          const enSaison = mois.includes(m);
          return (
            <div key={nom} className="flex flex-col items-center gap-1.5" title={`${nom}${enSaison ? ' : de saison' : ''}`}>
              <div className={`w-full h-7 sm:h-9 rounded-md sm:rounded-lg ${enSaison ? 'bg-gradient-to-b from-green-500 to-green-600' : 'bg-[#EDE3D5]'} ${m === moisCourant ? 'ring-2 ring-offset-2 ring-[#FF4500]' : ''}`} />
              <span className={`text-[9px] sm:text-[10px] font-black uppercase ${m === moisCourant ? 'text-[#FF4500]' : enSaison ? 'text-green-700' : 'text-slate-400'}`}>
                <span className="sm:hidden">{nom[0]}</span>
                <span className="hidden sm:inline">{MOIS_COURTS[i]}</span>
              </span>
            </div>
          );
        })}
      </div>
      <p className="mt-4 text-[11px] font-bold text-slate-400">
        <span className="inline-block w-2.5 h-2.5 rounded-sm bg-green-500 mr-1.5 align-middle" />Mois de saison
        <span className="inline-block w-2.5 h-2.5 rounded-sm ring-2 ring-[#FF4500] ml-4 mr-1.5 align-middle" />Mois en cours
      </p>
    </section>
  );
}

function CarteRecette({ recette, ouverte }: { recette: Recette; ouverte: boolean }) {
  const ingredients = recette.ingredients?.filter(Boolean) ?? [];
  const etapes = recette.etapes?.filter(Boolean) ?? [];
  return (
    <details open={ouverte} className="group bg-white rounded-[1.5rem] border border-[#DDD0BF] shadow-sm overflow-hidden">
      <summary className="list-none [&::-webkit-details-marker]:hidden cursor-pointer flex items-center gap-4 p-4 sm:p-5 hover:bg-[#FBF7F2] transition-colors">
        {recette.photo ? (
          <img src={recette.photo} alt="" className="w-20 sm:w-24 aspect-[3/2] object-cover rounded-xl shrink-0" loading="lazy" />
        ) : (
          <span className="w-12 h-12 rounded-xl bg-orange-50 text-[#FF4500] flex items-center justify-center shrink-0"><ChefHat className="w-5 h-5" /></span>
        )}
        <div className="min-w-0 flex-1">
          <h3 className="font-black uppercase tracking-tight text-[#3D2B1F] text-sm sm:text-base leading-tight">{recette.titre}</h3>
          <p className="flex flex-wrap gap-x-3 mt-1 text-[10px] font-black uppercase tracking-widest text-slate-400">
            {recette.temps && <span className="inline-flex items-center gap-1"><Clock className="w-3 h-3" />{recette.temps}</span>}
            {recette.personnes && <span className="inline-flex items-center gap-1"><Users className="w-3 h-3" />{recette.personnes} pers.</span>}
          </p>
        </div>
        <span className="text-[#FF4500] font-black text-xl transition-transform group-open:rotate-45 shrink-0">+</span>
      </summary>
      <div className="px-4 pb-5 sm:px-6 sm:pb-6 grid md:grid-cols-[1fr_1.6fr] gap-5 border-t border-[#EDE3D5] pt-5">
        {ingredients.length > 0 && (
          <div>
            <p className="text-[10px] font-black uppercase tracking-widest text-[#FF4500] mb-2">Ingrédients</p>
            <ul className="space-y-1.5">
              {ingredients.map((ing, i) => (
                <li key={i} className="flex gap-2 text-sm text-slate-600"><span className="text-[#FF4500]">•</span>{ing}</li>
              ))}
            </ul>
          </div>
        )}
        {etapes.length > 0 && (
          <div>
            <p className="text-[10px] font-black uppercase tracking-widest text-[#FF4500] mb-2">Préparation</p>
            <ol className="space-y-3">
              {etapes.map((etape, i) => (
                <li key={i} className="flex gap-3 text-sm text-slate-600 leading-relaxed">
                  <span className="w-6 h-6 rounded-full bg-[#3D2B1F] text-white text-[11px] font-black flex items-center justify-center shrink-0">{i + 1}</span>
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

  return (
    <main className="min-h-screen bg-[#EDE3D5] text-slate-900 pt-6 sm:pt-10 pb-28 lg:pb-16 px-3 md:px-10">
      <div className="max-w-6xl mx-auto">
        {apercu && (
          <div className="mb-5 flex items-center gap-3 bg-[#3D2B1F] text-white rounded-2xl px-4 py-3 shadow-lg">
            <Eye className="w-5 h-5 text-[#FF4500] shrink-0" />
            <p className="text-[11px] font-black uppercase tracking-widest leading-snug">
              Aperçu administrateur — {produit.actif === false ? 'produit désactivé' : 'page non publiée'} : les clients ne la voient pas.
            </p>
          </div>
        )}

        <Link href="/commander" className="inline-flex items-center gap-2 text-slate-400 hover:text-[#FF4500] font-bold text-xs uppercase tracking-widest transition-colors mb-5 sm:mb-8 group">
          <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" /> Retour au catalogue
        </Link>

        {/* EN-TÊTE : photos + achat */}
        <div className="grid lg:grid-cols-[1.15fr_1fr] gap-5 lg:gap-10 items-start">
          <GaleriePhotos photos={photos} alt={titre} />

          <div className="lg:sticky lg:top-20 space-y-4">
            <div>
              <div className="flex flex-wrap items-center gap-1.5 mb-3">
                {produit.category && (
                  <span className="text-[10px] font-black uppercase tracking-widest text-[#5C4030] bg-white border border-[#D5C9B8] px-2.5 py-1 rounded-lg">{produit.category}</span>
                )}
                {produit.provenance && (
                  <span className="inline-flex items-center gap-1 text-[10px] font-black uppercase tracking-widest text-[#FF4500] bg-orange-50 border border-[#FF4500]/15 px-2.5 py-1 rounded-lg">
                    <MapPin className="w-3 h-3" />{produit.provenance}
                  </span>
                )}
                {deSaison && (
                  <span className="inline-flex items-center gap-1 text-[10px] font-black uppercase tracking-widest text-green-700 bg-green-50 border border-green-600/15 px-2.5 py-1 rounded-lg">
                    <Leaf className="w-3 h-3" />De saison en ce moment
                  </span>
                )}
              </div>
              <h1 className="text-3xl sm:text-5xl font-black tracking-tighter uppercase leading-[0.95] text-slate-900">{titre}</h1>
              {fiche.accroche?.trim() && (
                <p className="text-slate-500 font-medium italic mt-3 text-sm sm:text-base leading-relaxed">{fiche.accroche.trim()}</p>
              )}
            </div>

            <AchatProduit produit={produit} variantes={variantes} />

            <div className="flex items-center justify-between gap-3">
              <BoutonPartager titre={titre} />
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest text-right">Livraison dès le lendemain · Yvelines</p>
            </div>
          </div>
        </div>

        {/* CONTENU DE LA FICHE */}
        <div className="mt-10 sm:mt-14 space-y-4 sm:space-y-5">
          <Rubrique icone={BookOpen} titre="Description" texte={fiche.description} />
          <div className="grid md:grid-cols-2 gap-4 sm:gap-5">
            <Rubrique icone={MapPin} titre="Origine" texte={fiche.origine_detail} />
            <Rubrique icone={Sparkles} titre="Caractéristiques" texte={fiche.caracteristiques} />
            <Rubrique icone={Utensils} titre="Goût et saveurs" texte={fiche.gout} />
            <Rubrique icone={Refrigerator} titre="Conservation" texte={fiche.conservation} />
          </div>
          <Rubrique icone={ChefHat} titre="Conseils de préparation" texte={fiche.preparation} />
          {saison.length > 0 && <FriseSaison mois={saison} moisCourant={moisCourant} />}

          {recettes.length > 0 && (
            <section className="pt-4">
              <h2 className="text-2xl sm:text-4xl font-black tracking-tighter uppercase text-slate-900 mb-4 sm:mb-6">
                Idées <span className="text-[#FF4500]">recettes</span>
              </h2>
              <div className="space-y-3">
                {recettes.map((r, i) => <CarteRecette key={i} recette={r} ouverte={i === 0} />)}
              </div>
            </section>
          )}
        </div>

        {/* VOUS AIMEREZ AUSSI */}
        {suggestions.length > 0 && (
          <section className="mt-12 sm:mt-16">
            <h2 className="text-2xl sm:text-4xl font-black tracking-tighter uppercase text-slate-900 mb-4 sm:mb-6">
              Vous aimerez <span className="text-[#FF4500]">aussi</span>
            </h2>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-5">
              {suggestions.map(s => (
                <Link key={s.id} href={`/produits/${s.slug}`} className="group bg-white rounded-xl sm:rounded-[2rem] p-2 sm:p-4 border border-[#DDD0BF] shadow-sm hover:shadow-[0_20px_50px_rgb(0,0,0,0.06)] transition-all relative">
                  {estEnPromo(s) && (
                    <span className="absolute top-3 left-3 sm:top-6 sm:left-6 z-10 bg-gradient-to-r from-[#FF4500] to-[#FF7A1A] text-white text-[8px] sm:text-[10px] font-black px-2 py-1 rounded-full shadow flex items-center gap-1 uppercase">
                      <Flame className="w-2.5 h-2.5" /> En promo
                    </span>
                  )}
                  <div className="aspect-[3/2] bg-[#EDE3D5] rounded-lg sm:rounded-[1.5rem] overflow-hidden mb-2 sm:mb-3 flex items-center justify-center">
                    {s.image_url ? (
                      <img src={s.image_url} alt={s.name} className="w-full h-full object-cover group-hover:scale-110 transition-all duration-700" loading="lazy" />
                    ) : (
                      <span className="text-4xl grayscale opacity-20">🧺</span>
                    )}
                  </div>
                  <p className="text-[10px] sm:text-sm font-black uppercase tracking-tight text-slate-800 truncate group-hover:text-[#FF4500] transition-colors">{s.name}</p>
                  <p className="text-[9px] sm:text-xs font-bold text-slate-400 uppercase tracking-widest">
                    {(s.promotion > 0 ? s.price * (1 - s.promotion / 100) : s.price).toFixed(2)}€/{s.unite === 'g' ? 'kg' : s.unite}
                  </p>
                </Link>
              ))}
            </div>
          </section>
        )}
      </div>
    </main>
  );
}
