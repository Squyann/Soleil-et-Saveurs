'use client';
import React, { useState, useEffect, lazy, Suspense } from 'react';
import Link from 'next/link';
import { ShoppingCart, User, HelpCircle, Store } from 'lucide-react';
import { supabase } from '@/lib/supabase';

// Chargement différé — ne bloque pas l'hydratation initiale
const PanierDrawer = lazy(() => import('@/components/ui/PanierDrawer'));

export default function ClientShell({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<any>(null);
  const [isPanierOpen, setIsPanierOpen] = useState(false);
  const [nombreArticles, setNombreArticles] = useState(0);

  const updateBadge = () => {
    try {
      const saved = localStorage.getItem('mon-panier');
      const items = saved ? JSON.parse(saved) : [];
      setNombreArticles(Array.isArray(items) ? items.length : 0);
    } catch {
      setNombreArticles(0);
    }
  };

  useEffect(() => {
    updateBadge();
    window.addEventListener('storage', updateBadge);
    window.addEventListener('panier-updated', updateBadge);
    return () => {
      window.removeEventListener('storage', updateBadge);
      window.removeEventListener('panier-updated', updateBadge);
    };
  }, []);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });
    return () => subscription.unsubscribe();
  }, []);

  return (
    <>
      {/* NAVBAR */}
      <nav className="fixed top-0 left-0 right-0 z-[100] bg-[#F5EAE0]/95 backdrop-blur-md border-b border-[#D5C9B8] h-14 shadow-sm">
        <div className="max-w-7xl mx-auto h-full px-4 md:px-8 flex items-center justify-between">
          <Link href="/" className="flex items-center group">
            <img src="/logo.svg" alt="Soleil et Saveurs" className="h-9 w-auto transition-opacity group-hover:opacity-80" />
          </Link>

          <div className="hidden md:flex items-center gap-1">
            <Link href="/commander" className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-[11px] font-black uppercase tracking-widest text-[#5C4030] hover:bg-[#EAD9C8] hover:text-[#FF4500] transition-all">
              <Store className="w-4 h-4" />
              Boutique
            </Link>
          </div>

          <div className="flex items-center gap-1 md:gap-3">
            <button
              onClick={() => setIsPanierOpen(true)}
              className="p-2 hover:bg-[#EAD9C8] rounded-full relative transition-colors group"
            >
              <ShoppingCart className="w-5 h-5 text-[#5C4030] group-hover:text-[#FF4500]" />
              {nombreArticles > 0 && (
                <span className="absolute top-1 right-1 w-4 h-4 bg-[#FF4500] text-white text-[9px] flex items-center justify-center rounded-full font-bold border-2 border-[#F5EAE0]">
                  {nombreArticles > 99 ? '99+' : nombreArticles}
                </span>
              )}
            </button>

            <Link href={user ? '/compte' : '/login'} className="flex items-center gap-1.5 p-2 md:px-3 hover:bg-[#EAD9C8] rounded-lg transition-colors group">
              <User className="w-5 h-5 text-[#5C4030] group-hover:text-[#3D2B1F]" />
              <span className="hidden md:inline text-[11px] font-black uppercase tracking-widest text-[#5C4030] group-hover:text-[#3D2B1F]">
                {user ? 'Mon compte' : 'Connexion'}
              </span>
            </Link>

            <Link href="/aide" className="flex items-center gap-1.5 bg-[#3D2B1F] text-[#F5EAE0] px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest hover:bg-[#FF4500] transition-all shadow-sm">
              <HelpCircle className="w-3.5 h-3.5" />
              <span className="hidden md:inline">Aide</span>
            </Link>
          </div>
        </div>
      </nav>

      {/* Bouton aide flottant mobile */}
      <Link href="/aide" className="md:hidden fixed bottom-6 right-6 z-50 bg-[#F5EAE0] text-[#3D2B1F] p-4 rounded-full shadow-2xl border border-[#D5C9B8] flex items-center justify-center">
        <HelpCircle className="w-6 h-6 text-[#FF4500]" />
      </Link>

      <Suspense fallback={null}>
        <PanierDrawer isOpen={isPanierOpen} onClose={() => setIsPanierOpen(false)} />
      </Suspense>

      <main className="mt-14">
        {children}
      </main>

      <footer className="bg-[#DDD0BF] border-t border-[#C9BBAA] py-12 px-4 mt-20">
        <div className="max-w-7xl mx-auto flex flex-col items-center gap-6">
          <div className="flex flex-wrap justify-center gap-6 mb-2">
            <Link href="/aide" className="text-[10px] font-black uppercase tracking-widest text-[#9A7D68] hover:text-[#FF4500]">Support</Link>
            <Link href="/livraison" className="text-[10px] font-black uppercase tracking-widest text-[#9A7D68] hover:text-[#FF4500]">Livraison</Link>
            <Link href="/mentions" className="text-[10px] font-black uppercase tracking-widest text-[#9A7D68] hover:text-[#FF4500]">Mentions légales</Link>
            <Link href="/cgv" className="text-[10px] font-black uppercase tracking-widest text-[#9A7D68] hover:text-[#FF4500]">CGV</Link>
            <Link href="/rgpd" className="text-[10px] font-black uppercase tracking-widest text-[#9A7D68] hover:text-[#FF4500]">Confidentialité</Link>
          </div>
          <p className="text-[9px] font-black uppercase tracking-[0.4em] text-[#B8A898]">© 2026 Soleil Saveurs</p>
        </div>
      </footer>
    </>
  );
}
