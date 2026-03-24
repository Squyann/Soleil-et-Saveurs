'use client';
import React, { useState, useEffect } from 'react';
import { ShoppingCart, Star, ArrowLeft, Filter, Plus, Info } from 'lucide-react';
import Link from 'next/link';
import PanierDrawer from '@/components/ui/PanierDrawer';

const PRODUCTS = [
  { id: 1, name: "Fraises Gariguette", price: "6.50", category: "fruits", unit: "250g", stock: 12, rating: 4.9, img: "🍓" },
  { id: 2, name: "Asperges Vertes", price: "8.90", category: "legumes", unit: "la botte", stock: 5, rating: 4.8, img: "🥬" },
  { id: 3, name: "Tomates Coeur de Boeuf", price: "4.20", category: "legumes", unit: "le kg", stock: 20, rating: 4.7, img: "🍅" },
  { id: 4, name: "Panier Découverte", price: "25.00", category: "panier", unit: "5kg environ", stock: 8, rating: 5.0, img: "🧺" },
  { id: 5, name: "Cerises Burlat", price: "7.80", category: "fruits", unit: "500g", stock: 0, rating: 4.6, img: "🍒" },
];

export default function CommanderPage() {
  const [filter, setFilter] = useState('all');
  const [isPanierOpen, setIsPanierOpen] = useState(false);
  const [nombreArticles, setNombreArticles] = useState(0);

  useEffect(() => {
    const panier = JSON.parse(localStorage.getItem('mon-panier') || '[]');
    setNombreArticles(panier.reduce((acc: number, item: any) => acc + item.quantite, 0));
  }, [isPanierOpen]);

  const filteredProducts = filter === 'all' 
    ? PRODUCTS 
    : PRODUCTS.filter(p => p.category === filter);

  const ajouterAuPanier = (product: any) => {
    const panierActuel = JSON.parse(localStorage.getItem('mon-panier') || '[]');
    const index = panierActuel.findIndex((item: any) => item.id === product.id);
    if (index >= 0) { panierActuel[index].quantite += 1; } 
    else { panierActuel.push({ ...product, quantite: 1 }); }
    localStorage.setItem('mon-panier', JSON.stringify(panierActuel));
    setNombreArticles(panierActuel.reduce((acc: number, item: any) => acc + item.quantite, 0));
    setIsPanierOpen(true);
  };

  return (
    <main className="min-h-screen bg-[#FDFCF9] text-slate-900 pb-20 pt-24 px-4 md:px-10">
      
      <PanierDrawer isOpen={isPanierOpen} onClose={() => setIsPanierOpen(false)} />

      {/* BOUTON PANIER FLOTTANT ADOUCI */}
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
        
        {/* HEADER DE PAGE ÉLÉGANT */}
        <header className="mb-12">
          <Link href="/" className="inline-flex items-center gap-2 text-slate-400 hover:text-[#FF4500] font-bold text-xs uppercase tracking-widest transition-colors mb-6 group">
            <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" /> Retour
          </Link>
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
            <div>
              <h1 className="text-5xl md:text-7xl font-black tracking-tighter uppercase leading-none text-slate-900">
                La <span className="text-[#FF4500]">Récolte</span>
              </h1>
              <p className="text-slate-500 font-medium mt-2">Cueillis ce matin même à Plaisir (78).</p>
            </div>
            <div className="flex items-center gap-3 bg-white px-5 py-3 rounded-2xl border border-slate-100 shadow-sm">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
              <span className="text-xs font-black uppercase tracking-widest text-slate-600">En direct du champ</span>
            </div>
          </div>
        </header>

        {/* FILTRES SANS BORDURES ÉPAISSES */}
        <div className="flex flex-wrap gap-2 mb-10 overflow-x-auto pb-2 scrollbar-hide">
          {['all', 'fruits', 'legumes', 'panier'].map((cat) => (
            <button
              key={cat}
              onClick={() => setFilter(cat)}
              className={`px-6 py-2.5 rounded-xl font-bold text-sm uppercase tracking-tight transition-all whitespace-nowrap ${
                filter === cat 
                ? 'bg-slate-900 text-white shadow-md' 
                : 'bg-white text-slate-500 hover:bg-slate-50 border border-slate-100 shadow-sm'
              }`}
            >
              {cat === 'all' ? 'Tout le catalogue' : cat}
            </button>
          ))}
        </div>

        {/* GRILLE DE PRODUITS ÉPURÉE */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredProducts.map((product) => (
            <div 
              key={product.id}
              className="bg-white rounded-[2.5rem] p-6 border border-slate-50 shadow-[0_8px_30px_rgb(0,0,0,0.04)] hover:shadow-[0_20px_50px_rgb(0,0,0,0.08)] transition-all flex flex-col group"
            >
              {/* Conteneur Image avec dégradé subtil */}
              <div className="h-56 bg-gradient-to-br from-slate-50 to-slate-100 rounded-[2rem] mb-6 flex items-center justify-center text-7xl group-hover:scale-105 transition-transform">
                {product.img}
              </div>

              {/* Infos */}
              <div className="flex justify-between items-start mb-1">
                <h3 className="text-xl font-black uppercase tracking-tight text-slate-800">{product.name}</h3>
                <div className="flex items-center gap-1 font-bold text-[#FF4500] text-sm">
                  <Star className="w-3.5 h-3.5 fill-current" />
                  {product.rating}
                </div>
              </div>
              <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-6">{product.unit}</p>

              {/* Pied de carte : Prix et Bouton */}
              <div className="mt-auto pt-6 border-t border-slate-50 flex items-center justify-between">
                <div>
                  <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Prix</p>
                  <p className="text-3xl font-black text-slate-900">{product.price}€</p>
                </div>
                
                <button 
                  disabled={product.stock === 0}
                  onClick={() => ajouterAuPanier(product)}
                  className={`w-14 h-14 rounded-2xl flex items-center justify-center transition-all ${
                    product.stock > 0 
                    ? 'bg-slate-900 text-white hover:bg-[#FF4500] hover:rotate-6 shadow-lg active:scale-90' 
                    : 'bg-slate-100 text-slate-300 cursor-not-allowed'
                  }`}
                >
                  {product.stock > 0 ? <Plus className="w-7 h-7" /> : <Info className="w-6 h-6" />}
                </button>
              </div>

              {/* Badges de stock */}
              {product.stock > 0 && product.stock < 10 && (
                <div className="mt-4 flex items-center gap-2 px-3 py-1.5 bg-orange-50 rounded-lg">
                  <span className="w-1.5 h-1.5 bg-[#FF4500] rounded-full animate-pulse" />
                  <p className="text-[10px] font-black uppercase tracking-widest text-[#FF4500]">
                    Dernières unités
                  </p>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}