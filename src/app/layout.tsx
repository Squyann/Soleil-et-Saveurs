'use client';
import React, { useState, useEffect } from 'react';
import { Inter } from 'next/font/google';
import Link from 'next/link';
import { ShoppingCart, User, HelpCircle } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import PanierDrawer from '@/components/ui/PanierDrawer';
import './globals.css';

const inter = Inter({ subsets: ['latin'] });

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [user, setUser] = useState<any>(null);
  const [isPanierOpen, setIsPanierOpen] = useState(false);
  const [nombreArticles, setNombreArticles] = useState(0);

  // Synchronisation du badge panier
  useEffect(() => {
    const updateBadge = () => {
      const saved = localStorage.getItem('mon-panier');
      if (saved) {
        const items = JSON.parse(saved);
        const total = items.reduce((acc: number, item: any) => acc + item.quantite, 0);
        setNombreArticles(total);
      } else {
        setNombreArticles(0);
      }
    };

    updateBadge();
    window.addEventListener('storage', updateBadge);
    return () => window.removeEventListener('storage', updateBadge);
  }, []);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });
    return () => subscription.unsubscribe();
  }, []);

  return (
    <html lang="fr">
      <body className={`${inter.className} bg-[#FDFCF9] antialiased`}>
        {/* NAVBAR */}
        <nav className="fixed top-0 left-0 right-0 z-[100] bg-white/95 backdrop-blur-md border-b border-slate-100 h-14 shadow-sm">
          <div className="max-w-7xl mx-auto h-full px-4 md:px-8 flex items-center justify-between">
            {/* Logo */}
            <Link href="/" className="flex items-center gap-2 group">
              <div className="w-8 h-8 bg-[#FF4500] rounded-lg flex items-center justify-center text-white font-black text-xs transition-transform group-hover:scale-110 shadow-sm">S</div>
              <span className="font-black tracking-tighter text-lg uppercase text-slate-900">
                SOLEIL<span className="text-[#FF4500]">SAVEURS</span>
              </span>
            </Link>

            {/* Actions */}
            <div className="flex items-center gap-1 md:gap-3">
              <button 
                onClick={() => setIsPanierOpen(true)} 
                className="p-2 hover:bg-slate-50 rounded-full relative transition-colors group"
              >
                <ShoppingCart className="w-5 h-5 text-slate-700 group-hover:text-[#FF4500]" />
                {nombreArticles > 0 && (
                  <span className="absolute top-1 right-1 w-4 h-4 bg-[#FF4500] text-white text-[9px] flex items-center justify-center rounded-full font-bold border-2 border-white animate-in zoom-in">
                    {nombreArticles}
                  </span>
                )}
              </button>

              <Link href={user ? "/compte" : "/login"} className="p-2 hover:bg-slate-50 rounded-full transition-colors group">
                <User className="w-5 h-5 text-slate-700 group-hover:text-slate-900" />
              </Link>

              {/* BOUTON AIDE - CIBLE LA PAGE INTERNE /AIDE */}
              {/* Bouton d'aide flottant uniquement sur Mobile */}
<Link 
  href="/aide" 
  className="md:hidden fixed bottom-24 right-6 z-50 bg-white text-slate-900 p-4 rounded-full shadow-2xl border border-slate-100 flex items-center justify-center animate-bounce"
>
  <HelpCircle className="w-6 h-6 text-[#FF4500]" />
</Link>
            </div>
          </div>
        </nav>

        <PanierDrawer isOpen={isPanierOpen} onClose={() => setIsPanierOpen(false)} />

        <main className="mt-14">
          {children}
        </main>

        <footer className="bg-white border-t border-slate-100 py-12 px-4 mt-20">
          <div className="max-w-7xl mx-auto flex flex-col items-center gap-6">
            <div className="flex gap-8 mb-4">
               <Link href="/aide" className="text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-[#FF4500]">Support</Link>
               <Link href="/livraison" className="text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-[#FF4500]">Livraison</Link>
               <Link href="/mentions" className="text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-[#FF4500]">Mentions</Link>
            </div>
            <p className="text-[9px] font-black uppercase tracking-[0.4em] text-slate-300">
              © 2026 Soleil Saveurs — Plaisir (78)
            </p>
          </div>
        </footer>
      </body>
    </html>
  );
}