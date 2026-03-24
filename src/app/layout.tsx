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

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });
    return () => subscription.unsubscribe();
  }, []);

  return (
    <html lang="fr">
      <body className={`${inter.className} bg-[#FDFCF9] antialiased`}>
        {/* NAVBAR UNIQUE ET FIXE */}
        <nav className="fixed top-0 left-0 right-0 z-[100] bg-white/95 backdrop-blur-md border-b border-slate-100 h-14 shadow-sm">
          <div className="max-w-7xl mx-auto h-full px-4 md:px-8 flex items-center justify-between">
            {/* Logo */}
            <Link href="/" className="flex items-center gap-2 group">
              <div className="w-8 h-8 bg-[#FF4500] rounded-lg flex items-center justify-center text-white font-black text-xs transition-transform group-hover:scale-110">S</div>
              <span className="font-black tracking-tighter text-lg uppercase text-slate-900">
                SOLEIL<span className="text-[#FF4500]">SAVEURS</span>
              </span>
            </Link>

            {/* Actions */}
            <div className="flex items-center gap-1 md:gap-3">
              <button 
                onClick={() => setIsPanierOpen(true)} 
                className="p-2 hover:bg-slate-50 rounded-full relative transition-colors"
              >
                <ShoppingCart className="w-5 h-5 text-slate-700" />
                <span className="absolute top-1 right-1 w-4 h-4 bg-[#FF4500] text-white text-[9px] flex items-center justify-center rounded-full font-bold border-2 border-white">
                  0
                </span>
              </button>

              <Link href={user ? "/compte" : "/login"} className="p-2 hover:bg-slate-50 rounded-full transition-colors">
                <User className="w-5 h-5 text-slate-700" />
              </Link>

              <Link 
                href="https://wa.me/ton-numero" 
                target="_blank" 
                className="hidden sm:flex bg-slate-900 text-white px-4 py-2 rounded-full text-[11px] font-black uppercase tracking-widest hover:bg-[#FF4500] transition-all items-center gap-2"
              >
                <HelpCircle className="w-3.5 h-3.5" /> Aide
              </Link>
            </div>
          </div>
        </nav>

        {/* Panier accessible partout */}
        <PanierDrawer isOpen={isPanierOpen} onClose={() => setIsPanierOpen(false)} />

        {/* CONTENU DES PAGES */}
        <div className="mt-14">
          {children}
        </div>

        {/* FOOTER PRO (Optionnel mais recommandé) */}
        <footer className="bg-white border-t border-slate-100 py-10 px-4">
          <div className="max-w-7xl mx-auto text-center">
            <p className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400">
              © 2024 Soleil Saveurs — Récolté avec passion dans le 78
            </p>
          </div>
        </footer>
      </body>
    </html>
  );
}