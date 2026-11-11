'use client';
export const dynamic = 'force-dynamic';
import React, { useState, useEffect, useCallback } from 'react';
import { ArrowLeft, Plus, Minus, Info, Check, CheckCircle2, Search, X, Flame, BookOpen, ChevronDown, ShoppingBasket } from 'lucide-react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import { estEnPromo, etiquettesPromo } from '@/lib/promos';
import { getStep, getMin, formatQuantite, uniteAffichee, stockDisponible, stockMaxLigne, ligneDepuisProduit, ajouterUnPas, retirerUnPas, lirePanier, calculerPanier } from '@/lib/panier';
import { variantesActives, prixVariante, imageVariante, nomVariante, libelleCourt, variantesCumulables, produitPourVariante } from '@/lib/variantes';
import { prochainePromo } from '@/lib/prix';
import { formatPrix, libelleUnite } from '@/lib/format';
import { CLE_FILTRE, CLE_RECHERCHE, CLE_DEFILEMENT, lireSession, ecrireSession } from '@/lib/catalogue';
import ChoixVariantes, { PanneauVariantes } from '@/components/ChoixVariantes';
import ImageFondu from '@/components/ImageFondu';
import BarrePanier from '@/components/BarrePanier';

const PLURIELS: Record<string, string> = { pièce: 'pièces', botte: 'bottes', barquette: 'barquettes' };

// Quantité en toutes lettres : « 2 pièces », « 1,5 kg », « 300 g »
function libelleQuantite(produit: any, q: number): string {
  if (produit.unite === 'g') return q < 1000 ? `${q} g` : `${String(q / 1000).replace('.', ',')} kg`;
  if (produit.unite === 'kg') return `${String(q).replace('.', ',')} kg`;
  const unite = produit.unite || 'pièce';
  return `${q} ${q > 1 ? PLURIELS[unite] ?? unite : unite}`;
}

// Image et nom d'une carte : lien vers la page produit seulement si elle est
// publiée, sinon simple bloc (comportement actuel). Défini hors de la page pour
// ne pas recréer l'image à chaque changement de quantité.
function LienFiche({ slug, className, children }: { slug?: string; className?: string; children: React.ReactNode }) {
  if (!slug) return <div className={className}>{children}</div>;
  return (
    <Link
      href={`/produits/${slug}`}
      onClick={() => ecrireSession(CLE_DEFILEMENT, String(window.scrollY))}
      className={`${className ?? ''} cursor-pointer`}
    >
      {children}
    </Link>
  );
}

export default function CommanderPage() {
  const [products, setProducts] = useState<any[]>([]);
  const [filter, setFilter] = useState('all');
  const [loading, setLoading] = useState(true);
  const [showToast, setShowToast] = useState(false);
  const [texteToast, setTexteToast] = useState('');
  // Panier actuel : quantités déjà choisies par variante et promos en cours
  const [panier, setPanier] = useState<any[]>([]);

  const [search, setSearch] = useState('');
  const [infoProduct, setInfoProduct] = useState<any | null>(null);
  const [variantsByProduct, setVariantsByProduct] = useState<{ [productId: string]: any[] }>({});
  const [selectedVariant, setSelectedVariant] = useState<{ [productId: string]: string }>({});
  // Adresse de la page détaillée des produits dont la page est publiée
  const [slugs, setSlugs] = useState<{ [productId: string]: string }>({});
  // Carte dont le panneau « Toutes les variantes » est ouvert
  const [panneauVariantes, setPanneauVariantes] = useState<string | null>(null);

  useEffect(() => {
    const filtre = lireSession(CLE_FILTRE);
    const recherche = lireSession(CLE_RECHERCHE);
    if (filtre) setFilter(filtre);
    if (recherche) setSearch(recherche);
    fetchProducts();
  }, []);

  useEffect(() => {
    const lire = () => setPanier(lirePanier());
    lire();
    window.addEventListener('panier-updated', lire);
    window.addEventListener('storage', lire);
    return () => { window.removeEventListener('panier-updated', lire); window.removeEventListener('storage', lire); };
  }, []);

  const choisirFiltre = (valeur: string) => { setFilter(valeur); ecrireSession(CLE_FILTRE, valeur); };
  const choisirRecherche = (valeur: string) => { setSearch(valeur); ecrireSession(CLE_RECHERCHE, valeur); };

  // Retour d'une page produit : on revient à l'endroit où le client était.
  useEffect(() => {
    if (loading) return;
    const position = lireSession(CLE_DEFILEMENT);
    if (!position) return;
    try { sessionStorage.removeItem(CLE_DEFILEMENT); } catch {}
    requestAnimationFrame(() => window.scrollTo(0, parseInt(position, 10) || 0));
  }, [loading]);

  async function fetchProducts() {
    try {
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .order('name', { ascending: true });

      if (error) throw error;
      if (data) setProducts(data);

      const [{ data: variantesData }, { data: fichesData }] = await Promise.all([
        supabase.from('product_variants').select('*').order('ordre', { ascending: true }),
        // Pages produits publiées. En cas d'erreur (table absente…), aucun
        // lien : le catalogue fonctionne exactement comme avant.
        supabase.from('fiches_produits').select('product_id, slug').eq('publiee', true),
      ]);
      if (variantesData) {
        const grouped: { [productId: string]: any[] } = {};
        variantesData.forEach((v: any) => {
          if (!grouped[v.product_id]) grouped[v.product_id] = [];
          grouped[v.product_id].push(v);
        });
        setVariantsByProduct(grouped);
        const initialSelected: { [productId: string]: string } = {};
        Object.entries(grouped).forEach(([productId, vs]) => {
          const premiere = variantesActives(vs)[0];
          if (premiere) initialSelected[productId] = premiere.id;
        });
        setSelectedVariant(initialSelected);
      }
      if (fichesData) {
        const parProduit: { [productId: string]: string } = {};
        fichesData.forEach((f: any) => { parProduit[f.product_id] = f.slug; });
        setSlugs(parProduit);
      }
    } catch (error) {
      console.error("Erreur lors de la récupération des produits:", error);
    } finally {
      setLoading(false);
    }
  }

  // Variantes proposées au client (actives, dans l'ordre de l'admin)
  const getVariants = (product: any) => variantesActives(variantsByProduct[product.id]);
  const getSelectedVariant = (product: any) => {
    const vs = getVariants(product);
    if (vs.length === 0) return null;
    return vs.find(v => v.id === selectedVariant[product.id]) || vs[0];
  };

  const produitsActifs = products.filter(p => p.actif !== false);
  // En promo : le produit ou l'une de ses variantes (remise % propre)
  const enPromoProduit = (p: any) => estEnPromo(p) || getVariants(p).some(v => (Number(v.promotion) || 0) > 0);
  const promosDisponibles = produitsActifs.some(enPromoProduit);
  // Filtre « Promos » mémorisé alors qu'il n'y a plus de promo : on montre tout.
  const filtreEffectif = filter === 'promos' && !promosDisponibles ? 'all' : filter;

  const filteredProducts = produitsActifs
    .filter(p => filtreEffectif === 'all'
      || (filtreEffectif === 'promos' ? enPromoProduit(p) : p.category?.toLowerCase() === filtreEffectif.toLowerCase()))
    .filter(p => {
      const q = search.trim().toLowerCase();
      if (!q) return true;
      return (
        p.name?.toLowerCase().includes(q) ||
        p.category?.toLowerCase().includes(q) ||
        p.provenance?.toLowerCase().includes(q)
      );
    })
    // Produits en promo en premier, l'ordre alphabétique est conservé ensuite
    .sort((a, b) => Number(enPromoProduit(b)) - Number(enPromoProduit(a)));

  const choisirVariante = (product: any, id: string) => {
    setSelectedVariant(prev => ({ ...prev, [product.id]: id }));
  };
  const fermerPanneau = useCallback(() => setPanneauVariantes(null), []);

  const afficherToast = (texte: string) => {
    setTexteToast(texte);
    setShowToast(true);
    setTimeout(() => setShowToast(false), 2000);
  };

  // « Ajouter » puis « + » : un pas de vente de plus dans le panier. La carte
  // se met à jour d'elle-même (événement panier-updated).
  const ajouterAuPanier = (product: any) => {
    const variante = getSelectedVariant(product);
    const resultat = ajouterUnPas(product, variante);
    if (!resultat.ok) afficherToast('Stock maximum atteint');
    else if (resultat.remplace && variante) afficherToast(`Remplacé par : ${libelleCourt(product, variante)}`);
    else if (resultat.offerts > 0) afficherToast(`${resultat.offerts} offert${resultat.offerts > 1 ? 's' : ''} : ajouté${resultat.offerts > 1 ? 's' : ''} au panier`);
  };
  const retirerDuPanier = (product: any) => retirerUnPas(product, getSelectedVariant(product));

  return (
    <>
    <main className="min-h-screen bg-[#EDE3D5] text-slate-900 pb-44 md:pb-36 pt-24 px-2 md:px-10">

      {showToast && (
        <div className="fixed top-28 left-1/2 -translate-x-1/2 z-[100] bg-[#3D2B1F] text-white px-6 py-3 rounded-2xl shadow-2xl flex items-center gap-3 animate-in fade-in slide-in-from-top-4 duration-300">
          <CheckCircle2 className="w-5 h-5 text-[#FF7A47]" aria-hidden />
          <span role="status" className="font-bold text-sm">{texteToast}</span>
        </div>
      )}


      <div className="max-w-7xl mx-auto">

        <header className="mb-12">
          <Link href="/" className="inline-flex items-center gap-2 text-slate-400 hover:text-[#FF4500] font-bold text-xs uppercase tracking-widest transition-colors mb-6 group">
            <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" /> Retour
          </Link>
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
            <div>
              <h1 className="text-5xl md:text-7xl font-black tracking-tighter uppercase leading-none text-slate-900">
                La <span className="text-[#FF4500]">Récolte</span>
              </h1>
              <p className="text-slate-500 font-medium mt-2 italic">Cultivé avec passion, livré avec soin.</p>
            </div>
            <div className="flex items-center gap-3 bg-white px-5 py-3 rounded-2xl border border-[#D5C9B8] shadow-sm">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
              <span className="text-xs font-black uppercase tracking-widest text-slate-600">Stock mis à jour</span>
            </div>
          </div>
        </header>

        {/* BARRE DE RECHERCHE */}
        <div className="relative mb-6">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
          <input
            type="text"
            value={search}
            onChange={(e) => choisirRecherche(e.target.value)}
            placeholder="Rechercher un produit, une provenance..."
            className="w-full bg-white border border-[#D5C9B8] shadow-sm rounded-2xl pl-11 pr-10 py-3.5 text-sm font-bold text-slate-700 placeholder:text-slate-300 placeholder:font-medium focus:outline-none focus:border-[#FF4500] transition-colors"
          />
          {search && (
            <button
              onClick={() => choisirRecherche('')}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-300 hover:text-slate-500 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* FILTRES */}
        <div className="flex flex-wrap gap-2 mb-10 overflow-x-auto pb-2 scrollbar-hide">
          {['all', ...(promosDisponibles ? ['promos'] : []), 'Fruits', 'Légumes', 'Épicerie'].map((cat) => (
            <button
              key={cat}
              onClick={() => choisirFiltre(cat)}
              className={`px-6 py-2.5 rounded-xl font-bold text-sm uppercase tracking-tight transition-all whitespace-nowrap ${
                filtreEffectif === cat
                ? cat === 'promos' ? 'bg-[#FF4500] text-white shadow-md' : 'bg-[#3D2B1F] text-white shadow-md'
                : cat === 'promos'
                  ? 'bg-white text-[#FF4500] hover:bg-orange-50 border border-[#FF4500]/40 shadow-sm'
                  : 'bg-white text-slate-500 hover:bg-[#EDE3D5] border border-[#D5C9B8] shadow-sm'
              }`}
            >
              {cat === 'all' ? 'Tout voir' : cat === 'promos' ? (
                <span className="inline-flex items-center gap-1.5"><Flame className="w-4 h-4" /> Promos</span>
              ) : cat}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="flex justify-center py-20">
            <div className="w-10 h-10 border-4 border-slate-200 border-t-[#FF4500] rounded-full animate-spin" />
          </div>
        ) : filteredProducts.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <div className="w-16 h-16 bg-[#EDE3D5] rounded-full flex items-center justify-center mb-4">
              <Search className="w-7 h-7 text-slate-200" />
            </div>
            <p className="font-black text-slate-300 uppercase tracking-widest text-sm">Aucun produit trouvé</p>
            {search && (
              <button
                onClick={() => choisirRecherche('')}
                className="mt-4 text-xs font-bold text-[#FF4500] hover:underline uppercase tracking-widest"
              >
                Effacer la recherche
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-2 sm:gap-5">
            {filteredProducts.map((product) => {
              // Variante affichée : sa photo, son nom et son prix remplacent ceux du produit
              const variante = getSelectedVariant(product);
              // Produit vu à travers la variante : unité, pas, remise, stock et promos applicables
              const pv = produitPourVariante(product, variante);
              const prixBase = prixVariante(product, variante);
              const imageCarte = imageVariante(product, variante);
              const nomCarte = nomVariante(product, variante);
              const descriptionCarte = variante?.description || product.description;
              const productVariants = getVariants(product);
              const slug = slugs[product.id];
              const pas = getStep(pv);

              // Déjà dans le panier pour ce produit (toutes variantes)
              const lignesPanier = panier.filter((i: any) => String(i.id) === String(product.id));
              const qteParVariante = Object.fromEntries(lignesPanier.map((i: any) => [i.variant_id ?? '', Number(i.quantite) || 0]));
              // Ligne de la variante affichée : c'est elle que le sélecteur de quantité modifie
              const ligne = lignesPanier.find((i: any) => (i.variant_id ?? null) === (variante?.id ?? null)) ?? null;
              const qteLigne = ligne ? Number(ligne.quantite) || 0 : 0;
              const calculs = lignesPanier.length ? calculerPanier(lignesPanier) : null;
              const resultat = ligne && calculs ? calculs.ligne(ligne) : null;
              // Quantité dans l'unité du produit (base des promotions par quantité)
              const qtePanierTotale = lignesPanier.filter((i: any) => (i.unite ?? null) === (product.unite ?? null)).reduce((s: number, i: any) => s + (Number(i.quantite) || 0), 0);
              const economiePanier = calculs ? calculs.economie : 0;
              const suggestion = qtePanierTotale > 0 ? prochainePromo(product, qtePanierTotale) : null;

              const effectiveStock = stockDisponible(pv);
              const epuise = effectiveStock <= 0;
              const stockMax = stockMaxLigne(panier, ligne ?? ligneDepuisProduit(product, variante, 0));
              const plusPossible = qteLigne + pas <= stockMax + 1e-9;

              // Prix à l'unité : celui du panier s'il y est (dégressif compris), sinon remise % déduite
              const prixUnitaire = resultat ? resultat.prixUnitaire : pv.promotion > 0 ? prixBase * (1 - pv.promotion / 100) : prixBase;
              const prixReduit = prixUnitaire < prixBase - 0.005;

              // Message de promotion : ce qu'il manque, ce qui est gagné, ou l'offre
              const etiquettes = etiquettesPromo(pv);
              const offre = etiquettes.find(e => e.cle !== 'remise');
              const message: { texte: string; ton: 'orange' | 'vert' | 'neutre' } | null =
                suggestion ? { texte: `${suggestion.texte}${productVariants.length > 0 && variantesCumulables(product) ? ' (toutes variétés)' : ''}`, ton: 'orange' }
                : economiePanier > 0.005 ? { texte: `Promo appliquée : -${formatPrix(economiePanier)}`, ton: 'vert' }
                : offre ? { texte: offre.cle === 'degressif' ? `${offre.texte} ${pv.unite === 'g' || pv.unite === 'kg' ? 'le kg' : `la ${pv.unite || 'pièce'}`}` : offre.texte, ton: 'orange' }
                : pv.unite === 'g' ? { texte: `Par tranche de ${libelleQuantite(pv, pas)}`, ton: 'neutre' }
                : null;

              return (
                <article
                  key={product.id}
                  className={`group relative flex flex-col rounded-[18px] sm:rounded-3xl border border-[#E8DCCB] p-1.5 sm:p-2.5 overflow-hidden transition-[transform,box-shadow] duration-300 ease-out sm:hover:-translate-y-1 sm:hover:shadow-[0_26px_44px_-28px_rgba(61,43,31,0.5)] ${epuise ? 'bg-[#F9F3EA]' : 'bg-white'}`}
                >
                  {/* PHOTO — au format 3:2 de l'outil de cadrage de l'admin : le client voit le cadrage exact */}
                  <div className="relative">
                    <LienFiche slug={slug} className="block aspect-[3/2] bg-white rounded-xl sm:rounded-2xl overflow-hidden relative">
                      {imageCarte ? (
                        <div className={`absolute inset-0 transition-transform duration-700 ease-out group-hover:scale-105 ${epuise ? 'grayscale opacity-45' : ''}`}>
                          <ImageFondu src={imageCarte} alt={nomCarte} />
                        </div>
                      ) : (
                        <span className="absolute inset-0 flex items-center justify-center bg-[#F5EAE0] text-[#C9BBAA]"><ShoppingBasket className="w-10 h-10" aria-hidden /></span>
                      )}
                      {slug && (
                        <span className="absolute bottom-1.5 right-1.5 sm:bottom-2 sm:right-2 bg-white/90 backdrop-blur-sm text-[#3D2B1F] text-[11px] sm:text-xs font-bold px-2 py-1 rounded-full shadow-sm flex items-center gap-1 group-hover:bg-[#3D2B1F] group-hover:text-[#F5EAE0] transition-colors">
                          <BookOpen className="w-3 h-3" aria-hidden /> Voir la fiche
                        </span>
                      )}
                    </LienFiche>

                    {/* PROMOTIONS ET DISPONIBILITÉ */}
                    <div className="absolute top-1.5 left-1.5 sm:top-2 sm:left-2 flex flex-col items-start gap-1 pointer-events-none">
                      {epuise ? (
                        <span className="px-2 py-1 sm:px-2.5 rounded-full bg-[#5C4030] text-white text-[11px] sm:text-[13px] font-extrabold">Épuisé</span>
                      ) : etiquettes.map(e => (
                        <span
                          key={e.cle}
                          className={`px-2 py-1 sm:px-2.5 rounded-full text-white text-[11px] sm:text-[13px] font-extrabold ${
                            e.cle === 'offertes' ? 'bg-[#166534]' : e.cle === 'lot' ? 'bg-[#3D2B1F]' : 'bg-[#D43A00]'}`}
                        >
                          <span className="sm:hidden">{e.court}</span>
                          <span className="hidden sm:inline">{e.texte}</span>
                        </span>
                      ))}
                    </div>

                    {qteLigne > 0 && (
                      <span className="ss-pop absolute top-1.5 right-1.5 sm:top-2 sm:right-2 flex items-center gap-1 h-6 px-1.5 sm:pl-2 sm:pr-2.5 rounded-full bg-[#166534] text-white text-xs font-extrabold pointer-events-none">
                        <Check className="w-3.5 h-3.5" strokeWidth={3} aria-hidden />
                        <span className="hidden sm:inline">Au panier</span>
                        <span className="sr-only sm:hidden">Au panier</span>
                      </span>
                    )}

                    {descriptionCarte && !slug && (
                      <button
                        type="button"
                        onClick={() => setInfoProduct({ ...product, name: nomCarte, image_url: imageCarte, description: descriptionCarte })}
                        aria-label={`Description : ${nomCarte}`}
                        className="absolute bottom-1.5 right-1.5 sm:bottom-2 sm:right-2 w-9 h-9 bg-white/90 backdrop-blur-sm rounded-full flex items-center justify-center shadow-sm text-[#5C4030] hover:bg-white hover:text-[#3D2B1F] transition-colors"
                      >
                        <Info className="w-4 h-4" aria-hidden />
                      </button>
                    )}
                  </div>

                  <div className="flex-1 flex flex-col gap-2 sm:gap-3 px-1 sm:px-1.5 pt-2.5 sm:pt-3.5 pb-0.5 sm:pb-1">
                    <div>
                      <LienFiche slug={slug} className="block min-w-0">
                        <h3 className={`text-sm sm:text-[17px] font-extrabold leading-tight text-[#3D2B1F] line-clamp-2 ${epuise ? 'text-[#5C4030]' : ''} ${slug ? 'hover:underline' : ''}`}>{nomCarte}</h3>
                      </LienFiche>
                      <p className="mt-0.5 text-xs sm:text-[13px] font-semibold text-[#6F5A4B]">
                        {product.provenance ? `${product.provenance} · ` : ''}{libelleUnite(pv.unite)}
                      </p>
                    </div>

                    {/* CHOIX DE LA VARIANTE : photo, nom et prix changent aussitôt */}
                    {productVariants.length > 0 && (
                      <div>
                        <div className="flex items-center justify-between gap-1 mb-0.5">
                          <p className="text-[11px] sm:text-xs font-semibold text-[#6F5A4B] truncate">
                            {productVariants.length} {variantesCumulables(product) ? 'variétés' : 'versions'}<span className="hidden sm:inline">{variantesCumulables(product) ? ' · cumulables' : ' au choix'}</span>
                          </p>
                          {productVariants.length > 2 && (
                            <button
                              type="button"
                              onClick={() => setPanneauVariantes(String(product.id))}
                              aria-haspopup="dialog"
                              className="shrink-0 inline-flex items-center gap-0.5 text-[11px] sm:text-xs font-bold text-[#C73600] hover:text-[#3D2B1F] transition-colors"
                            >
                              Tout voir <ChevronDown className="w-3 h-3" aria-hidden />
                            </button>
                          )}
                        </div>
                        <ChoixVariantes
                          compact
                          produit={product}
                          variantes={productVariants}
                          selection={variante?.id ?? null}
                          quantites={qteParVariante}
                          onChoisir={(id) => choisirVariante(product, id)}
                        />
                      </div>
                    )}

                    {message && !epuise && (
                      <p
                        aria-live="polite"
                        className={`self-start px-2.5 py-1.5 sm:px-3 sm:py-2 rounded-[10px] sm:rounded-xl text-[11px] sm:text-[13px] font-bold leading-snug ${
                          message.ton === 'vert' ? 'bg-[#ECF7EF] text-[#166534]' : message.ton === 'orange' ? 'bg-[#FFF1EA] text-[#B83200]' : 'bg-[#F5EAE0] text-[#5C4030]'}`}
                      >
                        {message.texte}
                      </p>
                    )}

                    {/* PRIX : nouveau prix bien visible, ancien prix barré */}
                    <div className="mt-auto flex items-end justify-between gap-2">
                      <p className="flex flex-col">
                        {prixReduit && <s className="text-xs sm:text-[13px] font-semibold text-[#6F5A4B]">{formatPrix(prixBase)}</s>}
                        <span className={`text-[19px] sm:text-2xl font-black tracking-tight leading-tight ${epuise ? 'text-[#6F5A4B]' : prixReduit ? 'text-[#FF4500]' : 'text-[#3D2B1F]'}`}>
                          {formatPrix(prixUnitaire)}<span className="text-xs sm:text-[13px] font-bold tracking-normal text-[#6F5A4B]"> /{uniteAffichee(pv)}</span>
                        </span>
                      </p>
                      {resultat && (
                        <p className="mb-0.5 text-xs sm:text-[13px] font-semibold text-[#6F5A4B] text-right leading-tight">
                          Total<br />
                          <strong className="text-sm sm:text-[15px] font-extrabold text-[#3D2B1F]">{formatPrix(resultat.total)}</strong>
                          {resultat.offerts > 0 && <span className="block text-[11px] font-bold text-[#166534]">dont {resultat.offerts} offert{resultat.offerts > 1 ? 's' : ''}</span>}
                        </p>
                      )}
                    </div>

                    {/* ACTION : « Ajouter », puis sélecteur de quantité relié au panier */}
                    {epuise ? (
                      <button type="button" disabled className="w-full h-11 sm:h-[50px] rounded-[13px] sm:rounded-[15px] border-[1.5px] border-dashed border-[#C9BBAA] text-[#5C4030] text-[13px] sm:text-[15px] font-bold cursor-not-allowed">
                        Bientôt de retour
                      </button>
                    ) : qteLigne === 0 ? (
                      <button
                        type="button"
                        onClick={() => ajouterAuPanier(product)}
                        className="w-full h-11 sm:h-[50px] rounded-[13px] sm:rounded-[15px] bg-[#3D2B1F] text-[#F5EAE0] text-sm sm:text-[15px] font-extrabold flex items-center justify-center gap-2 transition-[background-color,transform] duration-200 hover:bg-[#FF4500] active:scale-[0.97]"
                      >
                        <Plus className="w-[18px] h-[18px]" strokeWidth={2.6} aria-hidden />
                        Ajouter{pv.unite === 'g' || pv.unite === 'kg' ? ` ${libelleQuantite(pv, pas)}` : ''}
                      </button>
                    ) : (
                      <div className="ss-pop flex items-center h-11 sm:h-[50px] p-[3px] rounded-[13px] sm:rounded-[15px] bg-[#FFF1EA] border-[1.5px] border-[#FFC9B0]">
                        <button
                          type="button"
                          onClick={() => retirerDuPanier(product)}
                          aria-label={qteLigne <= getMin(pv) ? `Retirer ${nomCarte} du panier` : `Diminuer la quantité de ${nomCarte}`}
                          className="shrink-0 w-10 sm:w-11 h-full rounded-[10px] sm:rounded-xl bg-white text-[#3D2B1F] flex items-center justify-center transition-[background-color,transform] duration-150 hover:bg-[#FFE1D3] active:scale-90"
                        >
                          <Minus className="w-[18px] h-[18px]" strokeWidth={2.6} aria-hidden />
                        </button>
                        <span aria-live="polite" className="flex-1 text-center text-[13px] sm:text-[15px] font-extrabold text-[#3D2B1F] whitespace-nowrap">{libelleQuantite(pv, qteLigne)}</span>
                        <button
                          type="button"
                          onClick={() => ajouterAuPanier(product)}
                          disabled={!plusPossible}
                          aria-label={`Augmenter la quantité de ${nomCarte}`}
                          className="shrink-0 w-10 sm:w-11 h-full rounded-[10px] sm:rounded-xl bg-[#FF4500] text-white flex items-center justify-center transition-[background-color,transform] duration-150 hover:bg-[#D43A00] active:scale-90 disabled:bg-[#C9BBAA] disabled:cursor-not-allowed"
                        >
                          <Plus className="w-[18px] h-[18px]" strokeWidth={2.6} aria-hidden />
                        </button>
                      </div>
                    )}

                    {/* DÉJÀ DANS LE PANIER (variantes cumulées) */}
                    {productVariants.length > 0 && lignesPanier.length > 0 && (
                      <p className="text-[11px] sm:text-xs font-semibold text-[#6F5A4B] leading-snug">
                        <span className="font-extrabold text-[#3D2B1F]">Panier : </span>
                        {lignesPanier.map((i: any) => `${formatQuantite(i, Number(i.quantite))} ${i.variant_nom ? libelleCourt(product, { nom: i.variant_nom }) : product.name}`).join(' · ')}
                      </p>
                    )}

                    {!epuise && effectiveStock < (pv.unite === 'g' ? 500 : 5) && (
                      <p className="flex items-center justify-center gap-2 text-[11px] sm:text-xs font-bold text-[#C73600]">
                        <span className="ss-pouls w-1.5 h-1.5 bg-[#FF4500] rounded-full" />
                        Derniers exemplaires !
                      </p>
                    )}
                  </div>

                  {/* TOUTES LES VARIANTES : panneau par-dessus la carte (la grille ne bouge pas) */}
                  {panneauVariantes === String(product.id) && (
                    <PanneauVariantes
                      produit={product}
                      variantes={productVariants}
                      selection={variante?.id ?? null}
                      quantites={qteParVariante}
                      onChoisir={(id) => { choisirVariante(product, id); setPanneauVariantes(null); }}
                      onFermer={fermerPanneau}
                    />
                  )}
                </article>
              );
            })}
          </div>
        )}
      </div>
    </main>

    <BarrePanier panier={panier} />

    {/* MODAL DESCRIPTION PRODUIT */}
    {infoProduct && (
      <div className="fixed inset-0 z-[200] flex items-end sm:items-center justify-center p-4" onClick={() => setInfoProduct(null)}>
        <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
        <div
          className="relative bg-white rounded-3xl shadow-2xl w-full max-w-sm overflow-hidden animate-in slide-in-from-bottom duration-300"
          onClick={(e) => e.stopPropagation()}
        >
          {infoProduct.image_url && (
            <div className="aspect-[3/2] overflow-hidden">
              <img src={infoProduct.image_url} alt={infoProduct.name} className="w-full h-full object-cover" />
            </div>
          )}
          <div className="p-6">
            <div className="flex items-start justify-between mb-2">
              <h3 className="font-black uppercase text-base tracking-tight text-slate-900 leading-tight">{infoProduct.name}</h3>
              <button type="button" onClick={() => setInfoProduct(null)} className="p-1.5 hover:bg-slate-100 rounded-xl transition-colors ml-3 shrink-0">
                <X className="w-5 h-5 text-slate-400" />
              </button>
            </div>
            {infoProduct.provenance && (
              <span className="inline-block text-[10px] font-bold text-[#FF4500] bg-orange-50 px-2 py-0.5 rounded-md uppercase mb-3">{infoProduct.provenance}</span>
            )}
            <p className="text-sm text-slate-600 leading-relaxed">{infoProduct.description}</p>
          </div>
        </div>
      </div>
    )}
    </>
  );
}
