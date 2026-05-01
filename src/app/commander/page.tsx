'use client';
import React, { useState, useEffect } from 'react';
import { ShoppingCart, Star, ArrowLeft, Plus, Info, Tag, CheckCircle2, TrendingDown, Gift } from 'lucide-react';
import Link from 'next/link';
import PanierDrawer from '@/components/ui/PanierDrawer';
import { supabase } from '@/lib/supabase';

export default function CommanderPage() {
  const [products, setProducts] = useState<any[]>([]);
  const [filter, setFilter] = useState('all');
  const [isPanierOpen, setIsPanierOpen] = useState(false);
  const [nombreArticles, setNombreArticles] = useState(0);
  const [loading, setLoading] = useState(true);
  const [showToast, setShowToast] = useState(false);
  
  // NOUVEAU : État pour gérer les quantités saisies par le client avant l'ajout
  const [quantities, setQuantities] = useState<{ [key: string]: number }>({});

  useEffect(() => {
    fetchProducts();
    updateBadgeCount();
  }, []);

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
        data.forEach(p => initialQty[p.id] = p.unite === 'kg' ? 0.5 : 1);
        setQuantities(initialQty);
      }
    } catch (error) {
      console.error("Erreur lors de la récupération des produits:", error);
    } finally {
      setLoading(false);
    }
  }

  const updateBadgeCount = () => {
    const panier = JSON.parse(localStorage.getItem('mon-panier') || '[]');
    setNombreArticles(panier.reduce((acc: number, item: any) => acc + item.quantite, 0));
  };

  const getStep = (product: any) => product.unite === 'kg' ? 0.5 : 1;
  const getMin  = (product: any) => product.unite === 'kg' ? 0.5 : 1;

  const handleQtyChange = (id: string, val: string, product: any) => {
    const step = getStep(product);
    const min  = getMin(product);
    const num  = Math.max(min, parseFloat(val) || min);
    // Arrondi au pas le plus proche (ex: 0.5)
    const rounded = Math.round(num / step) * step;
    setQuantities(prev => ({ ...prev, [id]: parseFloat(rounded.toFixed(2)) }));
  };

  const filteredProducts = filter === 'all' 
    ? products 
    : products.filter(p => p.category?.toLowerCase() === filter.toLowerCase());

  const ajouterAuPanier = (product: any) => {
    const qteSaisie = quantities[product.id] || 1;
    let qteFinale = qteSaisie;

    // --- LOGIQUE PROMO X POUR Y ---
    if (product.seuil_achat > 0 && product.quantite_offerte > 0) {
      const nombreDePaliersAtteints = Math.floor(qteSaisie / product.seuil_achat);
      const produitsGratuits = nombreDePaliersAtteints * product.quantite_offerte;
      qteFinale = qteSaisie + produitsGratuits;
    }

    const panierActuel = JSON.parse(localStorage.getItem('mon-panier') || '[]');
    const index = panierActuel.findIndex((item: any) => item.id === product.id);
    
    const prixUnitairePromo = product.promotion > 0 
      ? product.price * (1 - product.promotion / 100) 
      : product.price;

    if (index >= 0) {
      panierActuel[index].quantite += qteFinale;
    } else {
      panierActuel.push({ 
        ...product, 
        price: prixUnitairePromo, 
        originalPrice: product.price,
        quantite: qteFinale 
      });
    }

    localStorage.setItem('mon-panier', JSON.stringify(panierActuel));
    updateBadgeCount();
    
    setShowToast(true);
    setTimeout(() => setShowToast(false), 2000);
    setQuantities(prev => ({ ...prev, [product.id]: product.unite === 'kg' ? 0.5 : 1 }));
  };

  return (
    <main className="min-h-screen bg-[#FDFCF9] text-slate-900 pb-20 pt-24 px-4 md:px-10">
      
      <PanierDrawer isOpen={isPanierOpen} onClose={() => setIsPanierOpen(false)} />

      {showToast && (
        <div className="fixed top-28 left-1/2 -translate-x-1/2 z-[100] bg-slate-900 text-white px-6 py-3 rounded-2xl shadow-2xl flex items-center gap-3 animate-in fade-in slide-in-from-top-4 duration-300">
          <CheckCircle2 className="w-5 h-5 text-[#FF4500]" />
          <span className="font-black text-[10px] uppercase tracking-widest">Ajouté au panier !</span>
        </div>
      )}

      <button 
        onClick={() => setIsPanierOpen(true)}
        className="fixed bottom-8 right-8 z-50 bg-slate-900 text-white p-4 rounded-full shadow-2xl hover:bg-[#FF4500] hover:scale-110 transition-all flex items-center gap-3 active:scale-95 group"
      >
        <div className="relative">
          <ShoppingCart className="w-6 h-6" />
          {nombreArticles > 0 && (
            <span className="absolute -top-3 -right-3 bg-[#FF4500] text-white text-[10px] w-5 h-5 flex items-center justify-center rounded-full font-bold border-2 border-white shadow-lg">
              {nombreArticles}
            </span>
          )}
        </div>
        <span className="font-bold text-sm pr-2 hidden md:inline">Mon Panier</span>
      </button>

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
            <div className="flex items-center gap-3 bg-white px-5 py-3 rounded-2xl border border-slate-100 shadow-sm">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
              <span className="text-xs font-black uppercase tracking-widest text-slate-600">Stock mis à jour</span>
            </div>
          </div>
        </header>

        {/* FILTRES */}
        <div className="flex flex-wrap gap-2 mb-10 overflow-x-auto pb-2 scrollbar-hide">
          {['all', 'Fruits', 'Légumes', 'Épicerie'].map((cat) => (
            <button
              key={cat}
              onClick={() => setFilter(cat)}
              className={`px-6 py-2.5 rounded-xl font-bold text-sm uppercase tracking-tight transition-all whitespace-nowrap ${
                filter === cat 
                ? 'bg-slate-900 text-white shadow-md' 
                : 'bg-white text-slate-500 hover:bg-slate-50 border border-slate-100 shadow-sm'
              }`}
            >
              {cat === 'all' ? 'Tout voir' : cat}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="flex justify-center py-20">
            <div className="w-10 h-10 border-4 border-slate-200 border-t-[#FF4500] rounded-full animate-spin" />
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
            {filteredProducts.map((product) => {
              const currentQty = quantities[product.id] || 1;
              const unitPrice = product.promotion > 0 
                ? product.price * (1 - product.promotion / 100) 
                : product.price;
              const totalPrice = unitPrice * currentQty;
              const totalEconomy = (product.price * currentQty) - totalPrice;

              // --- CALCULS D'AFFICHAGE POUR LA PROMO X+Y ---
              const produitsOfferts = product.seuil_achat > 0 
                ? Math.floor(currentQty / product.seuil_achat) * product.quantite_offerte 
                : 0;
              const totalItemsRecus = currentQty + produitsOfferts;

              return (
                <div 
                  key={product.id}
                  className="bg-white rounded-[2.5rem] p-6 border border-slate-50 shadow-sm hover:shadow-[0_20px_50px_rgb(0,0,0,0.06)] transition-all flex flex-col group relative overflow-hidden"
                >
                  {/* BADGES PROMO ET X+Y */}
                  <div className="absolute top-6 left-6 z-10 flex flex-col gap-2">
                    {product.promotion > 0 && (
                      <div className="bg-[#FF4500] text-white text-[10px] font-black px-3 py-1.5 rounded-full shadow-lg flex items-center gap-1 animate-pulse">
                        <Tag className="w-3 h-3" /> -{product.promotion}%
                      </div>
                    )}
                    {product.seuil_achat > 0 && (
                      <div className="bg-slate-900 text-white text-[10px] font-black px-3 py-1.5 rounded-full shadow-lg flex items-center gap-1 border border-slate-700">
                        <span>🎁</span> {product.seuil_achat} ACHETÉS = {product.quantite_offerte} OFFERT(S)
                      </div>
                    )}
                  </div>

                  {/* IMAGE */}
                  <div className="h-64 bg-slate-50 rounded-[2rem] mb-6 overflow-hidden flex items-center justify-center relative">
                    {product.image_url ? (
                      <img src={product.image_url} alt={product.name} className="w-full h-full object-cover group-hover:scale-110 transition-all duration-700" />
                    ) : (
                      <span className="text-6xl grayscale opacity-20">🧺</span>
                    )}
                    {product.stock <= 0 && (
                      <div className="absolute inset-0 bg-white/60 backdrop-blur-[2px] flex items-center justify-center">
                        <span className="bg-white px-4 py-2 rounded-xl font-black text-xs uppercase tracking-[0.2em] shadow-sm">Épuisé</span>
                      </div>
                    )}
                  </div>

                  <div className="flex justify-between items-start mb-1">
                    <h3 className="text-xl font-black uppercase tracking-tight text-slate-800">{product.name}</h3>
                    {product.provenance && (
                      <span className="text-[10px] font-bold text-[#FF4500] bg-orange-50 px-2 py-0.5 rounded-md uppercase">{product.provenance}</span>
                    )}
                  </div>
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4">
                       Vendu à la {product.unite || 'pièce'}
                  </p>

                  {/* SECTION QUANTITÉ ET PRIX DYNAMIQUE */}
                  <div className="bg-slate-50 rounded-3xl p-4 mb-6 border border-slate-100/50">
                    <div className="flex items-center justify-between mb-3">
                        <span className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Quantité</span>
                        <div className="flex items-center bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
                            <button
                              onClick={() => handleQtyChange(product.id, String(currentQty - getStep(product)), product)}
                              className="px-3 py-2 hover:bg-slate-50 text-slate-900 font-bold transition-colors"
                            >-</button>
                            <input
                                type="number"
                                min={getMin(product)}
                                step={getStep(product)}
                                value={currentQty}
                                onChange={(e) => handleQtyChange(product.id, e.target.value, product)}
                                className="w-16 text-center font-black text-sm bg-transparent border-none focus:ring-0 p-0"
                            />
                            <button
                              onClick={() => handleQtyChange(product.id, String(currentQty + getStep(product)), product)}
                              className="px-3 py-2 hover:bg-slate-50 text-slate-900 font-bold transition-colors"
                            >+</button>
                        </div>
                    </div>

                    <div className="flex justify-between items-end">
                        <div>
                            <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-1">Total produit</p>
                            <div className="flex items-baseline gap-2">
                                <span className="text-2xl font-black text-slate-900">{totalPrice.toFixed(2)}€</span>
                                {product.promotion > 0 && (
                                    <span className="text-xs line-through text-slate-300 font-bold italic">{(product.price * currentQty).toFixed(2)}€</span>
                                )}
                            </div>
                        </div>
                        
                        {/* AFFICHAGE DES ÉCONOMIES ET CADEAUX */}
                        <div className="flex flex-col items-end gap-1">
                          {totalEconomy > 0 && (
                              <div className="flex items-center gap-1 text-green-600 bg-green-50 px-3 py-1 rounded-full">
                                  <TrendingDown className="w-3 h-3" />
                                  <span className="text-[10px] font-black">-{totalEconomy.toFixed(2)}€</span>
                              </div>
                          )}
                          {produitsOfferts > 0 && (
                              <div className="flex items-center gap-1 text-[#FF4500] bg-orange-50 px-3 py-1 rounded-full animate-bounce">
                                  <Gift className="w-3 h-3" />
                                  <span className="text-[10px] font-black">+{produitsOfferts} OFFERT(S)</span>
                              </div>
                          )}
                        </div>
                    </div>
                  </div>

                  {/* BOUTON ACTION FINAL */}
                  <button 
                    disabled={product.stock <= 0}
                    onClick={() => ajouterAuPanier(product)}
                    className={`w-full py-4 rounded-[1.5rem] font-black uppercase tracking-widest text-xs flex items-center justify-center gap-3 transition-all ${
                      product.stock > 0 
                      ? 'bg-slate-900 text-white hover:bg-[#FF4500] shadow-xl active:scale-95' 
                      : 'bg-slate-100 text-slate-300 cursor-not-allowed'
                    }`}
                  >
                    {product.stock > 0 ? (
                        <>
                            <ShoppingCart className="w-4 h-4" />
                            Ajouter {totalItemsRecus} au panier
                        </>
                    ) : (
                        <>
                            <Info className="w-4 h-4" />
                            Produit indisponible
                        </>
                    )}
                  </button>

                  {product.stock > 0 && product.stock < 5 && (
                    <div className="mt-4 flex items-center justify-center gap-2">
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
  );
}