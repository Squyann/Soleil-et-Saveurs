'use client';
export const dynamic = 'force-dynamic';
import React, { useState, useEffect } from 'react';
import { ShoppingCart, Star, ArrowLeft, Plus, Info, Tag, CheckCircle2, TrendingDown, Gift, Search, X, Flame, BookOpen } from 'lucide-react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import { premieresOffertes, libellePremieresOffertes, estEnPromo } from '@/lib/promos';
import { getStep, getMin, quantiteInitiale, formatGramLabel, uniteAffichee, bornerQuantite, calculerPrixAffiche, ajouterAuPanier as ajouterProduitAuPanier } from '@/lib/panier';

// Mémorisés le temps de la visite, pour retrouver le catalogue tel qu'on l'a
// laissé en revenant d'une page produit.
const CLE_FILTRE = 'catalogue-filtre';
const CLE_RECHERCHE = 'catalogue-recherche';
const CLE_DEFILEMENT = 'catalogue-defilement';

function lireSession(cle: string): string | null {
  try { return sessionStorage.getItem(cle); } catch { return null; }
}
function ecrireSession(cle: string, valeur: string) {
  try { sessionStorage.setItem(cle, valeur); } catch {}
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

  // NOUVEAU : État pour gérer les quantités saisies par le client avant l'ajout
  const [quantities, setQuantities] = useState<{ [key: string]: number }>({});
  const [search, setSearch] = useState('');
  const [infoProduct, setInfoProduct] = useState<any | null>(null);
  const [variantsByProduct, setVariantsByProduct] = useState<{ [productId: string]: any[] }>({});
  const [selectedVariant, setSelectedVariant] = useState<{ [productId: string]: string }>({});
  // Adresse de la page détaillée des produits dont la page est publiée
  const [slugs, setSlugs] = useState<{ [productId: string]: string }>({});

  useEffect(() => {
    const filtre = lireSession(CLE_FILTRE);
    const recherche = lireSession(CLE_RECHERCHE);
    if (filtre) setFilter(filtre);
    if (recherche) setSearch(recherche);
    fetchProducts();
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
      if (data) {
        setProducts(data);
        // Initialiser les quantités à 1 pour chaque produit
        const initialQty: { [key: string]: number } = {};
        data.forEach(p => initialQty[p.id] = quantiteInitiale(p));
        setQuantities(initialQty);
      }

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
          if (vs.length > 0) initialSelected[productId] = vs[0].id;
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

  const getVariants = (product: any) => variantsByProduct[product.id] || [];
  const getSelectedVariant = (product: any) => {
    const vs = getVariants(product);
    if (vs.length === 0) return null;
    return vs.find(v => v.id === selectedVariant[product.id]) || vs[0];
  };
  const getEffectiveStock = (product: any) => product.stock;

  const handleQtyChange = (id: string, val: string, product: any) => {
    const quantite = bornerQuantite(product, val, getEffectiveStock(product));
    setQuantities(prev => ({ ...prev, [id]: quantite }));
  };

  const produitsActifs = products.filter(p => p.actif !== false);
  const promosDisponibles = produitsActifs.some(estEnPromo);
  // Filtre « Promos » mémorisé alors qu'il n'y a plus de promo : on montre tout.
  const filtreEffectif = filter === 'promos' && !promosDisponibles ? 'all' : filter;

  const filteredProducts = produitsActifs
    .filter(p => filtreEffectif === 'all'
      || (filtreEffectif === 'promos' ? estEnPromo(p) : p.category?.toLowerCase() === filtreEffectif.toLowerCase()))
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
    .sort((a, b) => Number(estEnPromo(b)) - Number(estEnPromo(a)));

  const ajouterAuPanier = (product: any) => {
    ajouterProduitAuPanier(product, quantities[product.id] || 1, getSelectedVariant(product));

    setShowToast(true);
    setTimeout(() => setShowToast(false), 2000);
    setQuantities(prev => ({ ...prev, [product.id]: quantiteInitiale(product) }));
  };

  return (
    <>
    <main className="min-h-screen bg-[#EDE3D5] text-slate-900 pb-20 pt-24 px-2 md:px-10">

      {showToast && (
        <div className="fixed top-28 left-1/2 -translate-x-1/2 z-[100] bg-[#3D2B1F] text-white px-6 py-3 rounded-2xl shadow-2xl flex items-center gap-3 animate-in fade-in slide-in-from-top-4 duration-300">
          <CheckCircle2 className="w-5 h-5 text-[#FF4500]" />
          <span className="font-black text-[10px] uppercase tracking-widest">Ajouté au panier !</span>
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
              const currentQty = quantities[product.id] || 1;
              const { qteEffective, prixDegressifActif, nbPremieresOffertes, totalPrice, totalEconomy, totalItemsRecus } = calculerPrixAffiche(product, currentQty);
              const enPromo = estEnPromo(product);
              const slug = slugs[product.id];

              const productVariants = getVariants(product);
              const effectiveStock = getEffectiveStock(product);

              return (
                <div
                  key={product.id}
                  className={`bg-white rounded-xl sm:rounded-[2rem] p-2 sm:p-4 border transition-all flex flex-col group relative overflow-hidden ${
                    enPromo
                      ? 'border-[#FF4500]/50 ring-2 ring-[#FF4500]/15 shadow-[0_10px_30px_rgba(255,69,0,0.12)] hover:shadow-[0_20px_50px_rgba(255,69,0,0.18)]'
                      : 'border-[#DDD0BF] shadow-sm hover:shadow-[0_20px_50px_rgb(0,0,0,0.06)]'
                  }`}
                >
                  {/* BADGES PROMO ET X+Y */}
                  <div className="absolute top-2 left-2 sm:top-4 sm:left-4 z-10 flex flex-col items-start gap-1 pointer-events-none">
                    {enPromo && (
                      <div className="bg-gradient-to-r from-[#FF4500] to-[#FF7A1A] text-white text-[8px] sm:text-[10px] font-black px-2 py-1 sm:px-3 sm:py-1.5 rounded-full shadow-lg flex items-center gap-1 uppercase tracking-wider">
                        <Flame className="w-2.5 h-2.5 sm:w-3 sm:h-3" /> En promo
                      </div>
                    )}
                    {product.promotion > 0 && (
                      <div className="bg-white text-[#FF4500] border border-[#FF4500]/30 text-[8px] sm:text-[10px] font-black px-2 py-1 sm:px-3 sm:py-1.5 rounded-full shadow-lg flex items-center gap-1">
                        <Tag className="w-2.5 h-2.5 sm:w-3 sm:h-3" /> -{product.promotion}%
                      </div>
                    )}
                    {product.seuil_achat > 0 && (
                      <div className="bg-[#3D2B1F] text-white text-[8px] sm:text-[10px] font-black px-2 py-1 sm:px-3 sm:py-1.5 rounded-full shadow-lg flex items-center gap-1 border border-slate-700">
                        <span>🎁</span>
                        <span className="hidden sm:inline">{product.seuil_achat} ACHETÉS = {product.quantite_offerte} OFFERT(S)</span>
                        <span className="sm:hidden">{product.seuil_achat}+{product.quantite_offerte}</span>
                      </div>
                    )}
                    {product.seuil_promo_qte > 0 && product.prix_promo > 0 && (
                      <div className="bg-blue-600 text-white text-[8px] sm:text-[10px] font-black px-2 py-1 sm:px-3 sm:py-1.5 rounded-full shadow-lg flex items-center gap-1">
                        <TrendingDown className="w-2.5 h-2.5 sm:w-3 sm:h-3" />
                        <span className="hidden sm:inline">{`À partir de ${product.seuil_promo_qte}${product.unite === 'g' ? 'kg' : product.unite === 'pièce' ? ' pcs' : ` ${product.unite}`} : ${product.prix_promo.toFixed(2)}€`}</span>
                        <span className="sm:hidden">{product.prix_promo.toFixed(2)}€/{product.unite === 'g' ? 'kg' : product.unite}</span>
                      </div>
                    )}
                    {premieresOffertes(product) > 0 && (
                      <div className="bg-green-600 text-white text-[8px] sm:text-[10px] font-black px-2 py-1 sm:px-3 sm:py-1.5 rounded-full shadow-lg flex items-center gap-1 uppercase">
                        <span>🎁</span>
                        <span className="hidden sm:inline">{libellePremieresOffertes(product)}</span>
                        <span className="sm:hidden">{premieresOffertes(product)} offerte{premieresOffertes(product) > 1 ? 's' : ''}</span>
                      </div>
                    )}
                  </div>

                  {/* IMAGE — au format 3:2 de l'outil de cadrage de l'admin : le client voit le cadrage exact */}
                  <LienFiche slug={slug} className="aspect-[3/2] bg-[#EDE3D5] rounded-xl sm:rounded-[1.5rem] mb-2 sm:mb-4 overflow-hidden flex items-center justify-center relative">
                    {product.image_url ? (
                      <img src={product.image_url} alt={product.name} className="w-full h-full object-cover group-hover:scale-110 transition-all duration-700" />
                    ) : (
                      <span className="text-6xl grayscale opacity-20">🧺</span>
                    )}
                    {effectiveStock <= 0 && (
                      <div className="absolute inset-0 bg-white/60 backdrop-blur-[2px] flex items-center justify-center">
                        <span className="bg-white px-4 py-2 rounded-xl font-black text-xs uppercase tracking-[0.2em] shadow-sm">Épuisé</span>
                      </div>
                    )}
                    {slug && (
                      <span className="absolute bottom-1.5 right-1.5 sm:bottom-2.5 sm:right-2.5 bg-white/90 backdrop-blur-sm text-[#3D2B1F] text-[8px] sm:text-[10px] font-black uppercase tracking-wider px-2 py-1 rounded-full shadow-md flex items-center gap-1 group-hover:bg-[#3D2B1F] group-hover:text-white transition-colors">
                        <BookOpen className="w-2.5 h-2.5 sm:w-3 sm:h-3" /> Voir la fiche
                      </span>
                    )}
                    {product.description && !slug && (
                      <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); setInfoProduct(product); }}
                        className="absolute top-2 right-2 w-6 h-6 sm:w-7 sm:h-7 bg-white/90 backdrop-blur-sm rounded-full flex items-center justify-center shadow-md hover:bg-white transition-all z-10"
                      >
                        <Info className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-slate-600" />
                      </button>
                    )}
                  </LienFiche>

                  <div className="flex justify-between items-start mb-1 gap-1">
                    <LienFiche slug={slug} className="min-w-0">
                      <h3 className={`text-[9px] sm:text-base font-black uppercase tracking-tight text-slate-800 truncate ${slug ? 'hover:text-[#FF4500] transition-colors' : ''}`}>{product.name}</h3>
                    </LienFiche>
                    {product.provenance && (
                      <span className="text-[8px] sm:text-[10px] font-bold text-[#FF4500] bg-orange-50 px-1.5 py-0.5 rounded-md uppercase shrink-0">{product.provenance}</span>
                    )}
                  </div>
                  <p className={`text-[8px] sm:text-xs font-bold text-slate-400 uppercase tracking-widest ${product.promotion > 0 ? 'mb-1' : 'mb-2 sm:mb-3'}`}>
                    {product.unite === 'g'
                      ? product.promotion > 0 ? 'Vendu au gramme' : `Vendu au gramme · ${product.price.toFixed(2)}€/kg`
                      : `Vendu ${product.unite === 'kg' ? 'au' : 'à la'} ${product.unite || 'pièce'}`}
                  </p>

                  {/* PRIX PROMO : nouveau prix bien visible, ancien prix barré */}
                  {product.promotion > 0 && (
                    <p className="flex flex-wrap items-baseline gap-x-1.5 mb-2 sm:mb-3">
                      <span className="text-xs sm:text-lg font-black text-[#FF4500] leading-none">
                        {(product.price * (1 - product.promotion / 100)).toFixed(2)}€<span className="text-[8px] sm:text-xs">/{uniteAffichee(product)}</span>
                      </span>
                      <span className="text-[9px] sm:text-xs line-through text-slate-400 font-bold">{product.price.toFixed(2)}€/{uniteAffichee(product)}</span>
                    </p>
                  )}

                  {/* SÉLECTEUR DE VARIÉTÉ */}
                  {productVariants.length > 0 && (
                    <select
                      value={selectedVariant[product.id] || ''}
                      onChange={(e) => {
                        setSelectedVariant(prev => ({ ...prev, [product.id]: e.target.value }));
                        setQuantities(prev => ({ ...prev, [product.id]: getMin(product) }));
                      }}
                      className="w-full mb-2 sm:mb-3 p-2 text-[10px] sm:text-xs font-bold border border-[#D5C9B8] bg-white rounded-lg sm:rounded-xl focus:outline-none focus:border-[#FF4500]"
                    >
                      {productVariants.map((v) => (
                        <option key={v.id} value={v.id}>{v.nom}</option>
                      ))}
                    </select>
                  )}

                  {/* SECTION QUANTITÉ ET PRIX DYNAMIQUE */}
                  <div className={`rounded-xl sm:rounded-2xl p-2 sm:p-3 mb-2 sm:mb-4 border ${enPromo ? 'bg-orange-50/70 border-[#FF4500]/20' : 'bg-[#EDE3D5] border-[#D5C9B8]/50'}`}>
                    {/* Sélecteur quantité */}
                    <div className="flex items-center justify-between mb-2">
                      <span className="hidden sm:block text-[10px] font-black uppercase text-slate-400 tracking-widest">Quantité</span>
                      <div className="flex items-center bg-white rounded-lg sm:rounded-xl shadow-sm border border-[#D5C9B8] overflow-hidden w-full sm:w-auto">
                        <button
                          onClick={() => handleQtyChange(product.id, String(currentQty - getStep(product)), product)}
                          disabled={currentQty <= getMin(product)}
                          className="px-2 sm:px-3 py-1.5 sm:py-2 hover:bg-[#EDE3D5] text-slate-900 font-bold transition-colors disabled:text-slate-300 disabled:cursor-not-allowed text-sm"
                        >-</button>
                        <span className="flex-1 sm:w-16 text-center font-black text-[10px] sm:text-sm px-1">
                          {product.unite === 'g' ? formatGramLabel(currentQty) : currentQty}
                        </span>
                        <button
                          onClick={() => handleQtyChange(product.id, String(currentQty + getStep(product)), product)}
                          disabled={currentQty >= effectiveStock}
                          className="px-2 sm:px-3 py-1.5 sm:py-2 hover:bg-[#EDE3D5] text-slate-900 font-bold transition-colors disabled:text-slate-300 disabled:cursor-not-allowed text-sm"
                        >+</button>
                      </div>
                    </div>

                    {/* Prix */}
                    <div className="flex justify-between items-center">
                      <div className="flex items-baseline gap-1.5">
                        <span className={`text-sm sm:text-xl font-black ${prixDegressifActif ? 'text-blue-600' : totalEconomy > 0.005 ? 'text-[#FF4500]' : 'text-slate-900'}`}>{totalPrice.toFixed(2)}€</span>
                        {(product.promotion > 0 || prixDegressifActif || nbPremieresOffertes > 0) && (
                          <span className="text-[9px] sm:text-xs line-through text-slate-300 font-bold italic">{(product.price * qteEffective).toFixed(2)}€</span>
                        )}
                      </div>
                      {totalEconomy > 0 && (
                        <div className={`hidden sm:flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-black ${prixDegressifActif ? 'text-blue-600 bg-blue-50' : 'text-green-600 bg-green-50'}`}>
                          <TrendingDown className="w-3 h-3" />-{totalEconomy.toFixed(2)}€
                        </div>
                      )}
                    </div>
                  </div>

                  {/* BOUTON ACTION FINAL */}
                  <button
                    disabled={effectiveStock <= 0}
                    onClick={() => ajouterAuPanier(product)}
                    className={`w-full py-2 sm:py-3 rounded-xl sm:rounded-[1.25rem] font-black uppercase tracking-widest text-xs flex items-center justify-center gap-2 transition-all ${
                      effectiveStock > 0
                      ? 'bg-[#3D2B1F] text-white hover:bg-[#FF4500] shadow-xl active:scale-95'
                      : 'bg-[#DDD0BF] text-slate-300 cursor-not-allowed'
                    }`}
                  >
                    {effectiveStock > 0 ? (
                        <>
                            <ShoppingCart className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                            <span className="hidden sm:inline">Ajouter {product.unite === 'g' ? formatGramLabel(totalItemsRecus) : totalItemsRecus} au panier</span>
                            <span className="sm:hidden">Ajouter</span>
                        </>
                    ) : (
                        <>
                            <Info className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                            <span className="hidden sm:inline">Produit indisponible</span>
                        </>
                    )}
                  </button>

                  {effectiveStock > 0 && effectiveStock < (product.unite === 'g' ? 500 : 5) && (
                    <div className="hidden sm:flex mt-4 items-center justify-center gap-2">
                      <span className="w-1.5 h-1.5 bg-[#FF4500] rounded-full animate-pulse" />
                      <p className="text-[9px] font-black uppercase tracking-widest text-[#FF4500]">
                        Derniers exemplaires !
                      </p>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </main>

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
