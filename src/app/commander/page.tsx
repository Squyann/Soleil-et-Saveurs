'use client';
import React, { useState, useEffect } from 'react';
import { ShoppingCart, Star, ArrowLeft, Plus, Info, Tag, CheckCircle2 } from 'lucide-react';
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

  // CHARGEMENT DES PRODUITS DEPUIS SUPABASE
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
      if (data) setProducts(data);
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

  const filteredProducts = filter === 'all' 
    ? products 
    : products.filter(p => p.category?.toLowerCase() === filter.toLowerCase());

  const ajouterAuPanier = (product: any) => {
    const panierActuel = JSON.parse(localStorage.getItem('mon-panier') || '[]');
    const index = panierActuel.findIndex((item: any) => item.id === product.id);
    
    // Calcul du prix avec promo si elle existe
    const prixFinal = product.promotion > 0 
      ? product.price * (1 - product.promotion / 100) 
      : product.price;

    if (index >= 0) {
      panierActuel[index].quantite += 1;
    } else {
      panierActuel.push({ 
        ...product, 
        price: prixFinal, // On enregistre le prix remisé dans le panier
        originalPrice: product.price,
        quantite: 1 
      });
    }

    localStorage.setItem('mon-panier', JSON.stringify(panierActuel));
    updateBadgeCount();
    
    // Petit message de confirmation (Toast)
    setShowToast(true);
    setTimeout(() => setShowToast(false), 2000);
  };

  return (
    <main className="min-h-screen bg-[#FDFCF9] text-slate-900 pb-20 pt-24 px-4 md:px-10">
      
      <PanierDrawer isOpen={isPanierOpen} onClose={() => setIsPanierOpen(false)} />

      {/* TOAST DE CONFIRMATION */}
      {showToast && (
        <div className="fixed top-28 left-1/2 -translate-x-1/2 z-[100] bg-slate-900 text-white px-6 py-3 rounded-2xl shadow-2xl flex items-center gap-3 animate-in fade-in slide-in-from-top-4 duration-300">
          <CheckCircle2 className="w-5 h-5 text-[#FF4500]" />
          <span className="font-black text-[10px] uppercase tracking-widest">Produit ajouté !</span>
        </div>
      )}

      {/* BOUTON PANIER FLOTTANT */}
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

        {/* LOADING STATE */}
        {loading ? (
          <div className="flex justify-center py-20">
            <div className="w-10 h-10 border-4 border-slate-200 border-t-[#FF4500] rounded-full animate-spin" />
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
            {filteredProducts.map((product) => (
              <div 
                key={product.id}
                className="bg-white rounded-[2.5rem] p-6 border border-slate-50 shadow-sm hover:shadow-[0_20px_50px_rgb(0,0,0,0.06)] transition-all flex flex-col group relative overflow-hidden"
              >
                {/* BADGE PROMO */}
                {product.promotion > 0 && (
                  <div className="absolute top-6 left-6 z-10 bg-[#FF4500] text-white text-[10px] font-black px-3 py-1.5 rounded-full shadow-lg flex items-center gap-1 animate-pulse">
                    <Tag className="w-3 h-3" /> -{product.promotion}%
                  </div>
                )}
                {product.seuil_achat > 0 && (
                  <div className="absolute top-6 left-6 z-10 bg-slate-900 text-white text-[10px] font-black px-3 py-1.5 rounded-full shadow-lg flex items-center gap-1">
                    🎁 {product.seuil_achat}+{product.quantite_offerte}
                  </div>
                )}

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

                {/* INFOS */}
                <div className="flex justify-between items-start mb-1">
                  <h3 className="text-xl font-black uppercase tracking-tight text-slate-800">{product.name}</h3>
                  {product.provenance && (
                    <span className="text-[10px] font-bold text-[#FF4500] bg-orange-50 px-2 py-0.5 rounded-md uppercase">{product.provenance}</span>
                  )}
                </div>
                <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-6">
                   Vendu à la {product.unite || 'pièce'}
                </p>

                {/* PRIX ET ACTION */}
                <div className="mt-auto pt-6 border-t border-slate-50 flex items-center justify-between">
                  <div>
                    <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Prix</p>
                    <div className="flex items-center gap-2">
                      <p className="text-3xl font-black text-slate-900">
                        {product.promotion > 0 
                          ? (product.price * (1 - product.promotion / 100)).toFixed(2) 
                          : product.price?.toFixed(2)}€
                      </p>
                      {product.promotion > 0 && (
                        <span className="text-sm line-through text-slate-300 font-bold italic">{product.price?.toFixed(2)}€</span>
                      )}
                    </div>
                  </div>
                  
                  <button 
                    disabled={product.stock <= 0}
                    onClick={() => ajouterAuPanier(product)}
                    className={`w-14 h-14 rounded-2xl flex items-center justify-center transition-all ${
                      product.stock > 0 
                      ? 'bg-slate-900 text-white hover:bg-[#FF4500] shadow-xl hover:rotate-6 active:scale-90' 
                      : 'bg-slate-100 text-slate-300 cursor-not-allowed'
                    }`}
                  >
                    {product.stock > 0 ? <Plus className="w-7 h-7" /> : <Info className="w-6 h-6" />}
                  </button>
                </div>

                {/* ALERTE STOCK FAIBLE */}
                {product.stock > 0 && product.stock < 5 && (
                  <div className="mt-4 flex items-center gap-2 px-3 py-1.5 bg-orange-50 rounded-lg">
                    <span className="w-1.5 h-1.5 bg-[#FF4500] rounded-full animate-pulse" />
                    <p className="text-[9px] font-black uppercase tracking-widest text-[#FF4500]">
                      Derniers exemplaires en stock !
                    </p>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}