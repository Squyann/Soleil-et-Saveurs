'use client';
export const dynamic = 'force-dynamic';
import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import { 
  ArrowRight, Zap, MapPin, ShoppingCart, Truck, 
  User, HelpCircle, Search, X, CheckCircle2 
} from 'lucide-react';
import PanierDrawer from '@/components/ui/PanierDrawer';

export default function Home() {
  const [user, setUser] = useState<any>(null);
  const [isPanierOpen, setIsPanierOpen] = useState(false);
  const [zipCode, setZipCode] = useState('');

  useEffect(() => {
    const initSession = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setUser(user);
    };
    initSession();
  }, []);

  return (
    <main className="min-h-screen bg-[#FDFCF9] text-slate-900 font-sans selection:bg-[#FF4500]/10 pb-10 overflow-x-hidden">
      {/* Navbar Compacte - Correction : bg-white total et z-index élevé */}
      <nav className="fixed top-0 left-0 right-0 z-[100] bg-white border-b border-slate-100 px-4 md:px-8 h-14 flex items-center justify-between shadow-sm">
        <Link href="/" className="text-lg font-bold tracking-tight flex items-center gap-2">
          <div className="w-7 h-7 bg-[#FF4500] rounded flex items-center justify-center text-white text-[10px]">S</div>
          <span>SOLEIL<span className="text-[#FF4500]">SAVEURS</span></span>
        </Link>
        <div className="flex items-center gap-2">
          <button onClick={() => setIsPanierOpen(true)} className="p-2 hover:bg-slate-100 rounded-lg transition-colors relative">
            <ShoppingCart className="w-5 h-5" />
            <span className="absolute top-1 right-1 w-3.5 h-3.5 bg-[#FF4500] text-white text-[8px] flex items-center justify-center rounded-full font-bold">0</span>
          </button>
          <Link href={user ? "/compte" : "/login"} className="p-2 hover:bg-slate-100 rounded-lg transition-colors">
            <User className="w-5 h-5" />
          </Link>
          <Link href="https://wa.me/ton-numero" target="_blank" className="hidden md:flex items-center gap-2 bg-slate-900 text-white px-3 py-1.5 rounded-lg text-xs font-semibold hover:bg-slate-800 transition-all">
            <HelpCircle className="w-3.5 h-3.5" />
            <span>Aide</span>
          </Link>
        </div>
      </nav>

      <PanierDrawer isOpen={isPanierOpen} onClose={() => setIsPanierOpen(false)} />

      {/* Hero Section - Correction : pt-14 (hauteur exacte nav) pour coller au header */}
      <section className="pt-14 md:pt-20 pb-10 px-4 md:px-8">
        <div className="max-w-6xl mx-auto">
          <div className="inline-flex items-center gap-2 bg-[#FF4500]/10 text-[#FF4500] px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider mb-4">
            <span className="w-1.5 h-1.5 rounded-full bg-[#FF4500] animate-pulse"></span>
            Récolte du jour 78
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-center">
            <div className="z-10">
              <h1 className="text-5xl md:text-7xl font-extrabold tracking-tight leading-[1] mb-6 text-slate-900">
                Le goût du soleil,<br />
                <span className="text-[#FF4500]">livré chez vous.</span>
              </h1>
              <p className="text-base md:text-lg text-slate-500 max-w-md mb-8 leading-relaxed">
                Circuit court réinventé : cueillis à maturité le matin, dans votre cuisine le soir.
              </p>
              
              <div className="flex flex-col gap-3">
                <Link href="/commander" className="flex items-center justify-between bg-[#FF4500] text-white p-4 rounded-xl font-bold hover:bg-[#e63e00] transition-all shadow-lg shadow-[#FF4500]/20">
                  <span>Accéder au catalogue direct</span>
                  <ArrowRight className="w-5 h-5" />
                </Link>
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-white border border-slate-200 p-3 rounded-xl">
                    <p className="text-[10px] font-bold uppercase text-slate-400 mb-1">Livraison 10km</p>
                    <div className="flex gap-1">
                      <input type="text" placeholder="CP" className="w-full text-xs bg-slate-50 p-1.5 rounded focus:outline-none" value={zipCode} onChange={(e)=>setZipCode(e.target.value)} />
                      <button className="bg-slate-900 text-white px-2 rounded text-[10px]">OK</button>
                    </div>
                  </div>
                  <Link href="https://maps.google.com" target="_blank" className="bg-white border border-slate-200 p-3 rounded-xl flex flex-col justify-center">
                    <p className="text-[10px] font-bold uppercase text-slate-400">Le Marché</p>
                    <p className="text-xs font-bold flex items-center gap-1">Plaisir (78) <MapPin className="w-3 h-3 text-[#FF4500]"/></p>
                  </Link>
                </div>
              </div>
            </div>

            {/* Vidéo Format Portrait - Correction : suppression des marges inutiles */}
            <div className="relative aspect-[4/5] md:aspect-[3/4] max-w-[400px] mx-auto md:ml-auto w-full rounded-2xl overflow-hidden shadow-2xl bg-slate-100">
              <video id="hero-video" autoPlay loop muted playsInline className="absolute inset-0 w-full h-full object-cover">
                <source src="/video.mp4" type="video/mp4" />
              </video>
              <div className="absolute bottom-4 left-4 right-4 p-3 bg-white/10 backdrop-blur-md rounded-xl border border-white/20 flex items-center justify-between">
                <span className="text-white text-[10px] font-bold uppercase tracking-widest">Live du champ</span>
                <button onClick={() => {const v = document.getElementById('hero-video') as HTMLVideoElement; if (v) v.muted = !v.muted;}} className="text-white p-1">
                  <Zap className="w-4 h-4 fill-white" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Bento Services - Correction : py-4 pour resserrer le contenu */}
      <section className="max-w-6xl mx-auto px-4 md:px-8 py-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-slate-900 rounded-2xl p-6 text-white min-h-[160px] flex flex-col justify-center">
            <Zap className="w-8 h-8 text-[#FF4500] mb-3" />
            <h3 className="text-xl font-bold mb-1 uppercase italic tracking-tighter">Zéro Stock.</h3>
            <p className="text-slate-400 text-xs">L'arbre est notre seul entrepôt.</p>
          </div>
          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm min-h-[160px] flex flex-col justify-center">
            <Truck className="w-8 h-8 text-[#FF4500] mb-3" />
            <h3 className="text-xl font-bold mb-1 uppercase italic tracking-tighter">Livraison J+0</h3>
            <p className="text-slate-500 text-xs">Récolté le matin, chez vous le soir.</p>
          </div>
          <div className="bg-[#FF4500]/5 border border-[#FF4500]/10 rounded-2xl p-6 min-h-[160px] flex flex-col justify-center">
            <MapPin className="w-8 h-8 text-[#FF4500] mb-3" />
            <h3 className="text-xl font-bold mb-1 uppercase italic tracking-tighter">Local 78</h3>
            <p className="text-slate-700 text-xs">Plaisir, Versailles et alentours.</p>
          </div>
        </div>
      </section>

      {/* Stats Section - Correction : py-8 */}
      <section className="max-w-6xl mx-auto px-4 md:px-8 py-8 border-y border-slate-100 my-6">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: "Fraîcheur", val: "100%", desc: "Zéro frigo" },
            { label: "Maturité", val: "Optim.", desc: "Sur l'arbre" },
            { label: "Circuit", val: "Ultra", desc: "Zéro interm." },
            { label: "Avis", val: "4.9/5", desc: "Note Google" }
          ].map((stat, i) => (
            <div key={i} className="flex flex-col">
              <p className="text-2xl font-black text-slate-900 leading-none">{stat.val}</p>
              <p className="text-[10px] font-bold uppercase text-[#FF4500] mt-1">{stat.label}</p>
              <p className="text-[9px] text-slate-400 uppercase">{stat.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* CTA Final */}
      <section className="max-w-6xl mx-auto px-4 md:px-8 py-6">
        <div className="bg-slate-900 rounded-[2.5rem] p-8 md:p-14 text-center text-white relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-[#FF4500]/10 blur-[100px] pointer-events-none" />
          <h2 className="text-3xl md:text-5xl font-black uppercase italic tracking-tighter mb-8">
            PRÊT À GOÛTER <br/><span className="text-[#FF4500]">LA DIFFÉRENCE ?</span>
          </h2>
          <Link href="/commander" className="inline-block bg-[#FF4500] text-white px-10 py-4 rounded-xl font-bold text-lg hover:scale-105 transition-all shadow-xl shadow-[#FF4500]/20">
            Voir la récolte 🍓
          </Link>
        </div>
      </section>
    </main>
  );
}