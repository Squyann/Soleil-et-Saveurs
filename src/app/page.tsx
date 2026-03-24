'use client';
export const dynamic = 'force-dynamic';
import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import { 
  ArrowRight, Zap, Sun, Package, MapPin, Star, ShoppingCart, Truck
} from 'lucide-react';

export default function Home() {
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    const initSession = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setUser(user);
    };
    initSession();
  }, []);

  return (
    <main className="min-h-screen bg-[#FFFCF0] text-black font-sans selection:bg-[#FF4500]/20 pb-10">
      {/* Ajout des styles globaux ici pour éviter l'erreur d'hydratation */}
      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes scroll-fast {
          0% { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }
        .animate-scroll-fast {
          display: flex;
          width: max-content;
          animation: scroll-fast 25s linear infinite;
        }
      `}} />
      
      {/* 1. HERO SECTION : ADAPTATIVE */}
      <section className="pt-20 md:pt-32 pb-12 px-4 md:px-6">
        <div className="max-w-7xl mx-auto">
          <div className="inline-block bg-[#FF4500] text-white px-4 py-1.5 border-2 border-black font-black uppercase text-[10px] md:text-xs tracking-[0.2em] shadow-[3px_3px_0px_#000] mb-8 md:mb-12">
            RÉCOLTE DU JOUR 78
          </div>

          <h1 className="text-5xl sm:text-7xl md:text-[11rem] font-black tracking-[-0.04em] leading-[0.9] uppercase mb-10 md:mb-16 border-b-4 md:border-b-8 border-black pb-6 md:pb-8">
            DU SOLEIL<br />
            <span className="text-[#FF4500]">DANS <br className="md:hidden"/> CHAQUE </span><br/>
            FRUIT.
          </h1>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 md:gap-12 items-start">
            <p className="md:col-span-2 text-xl md:text-3xl font-bold max-w-2xl leading-tight text-gray-900">
              Le circuit court poussé à l'extrême. Récolté à l'aube, dans votre cuisine avant le dîner. Sans intermédiaire, sans compromis.
            </p>
            <Link href="/commander" className="w-full">
              <button className="w-full bg-black text-white px-8 py-6 border-4 border-black font-black text-lg md:text-xl uppercase tracking-wider flex items-center justify-between group hover:bg-[#FF4500] transition-all shadow-[6px_6px_0px_#FF4500] active:translate-x-1 active:translate-y-1 active:shadow-none">
                MARCHÉ EN DIRECT
                <ArrowRight className="w-6 h-6 group-hover:translate-x-2 transition-transform" />
              </button>
            </Link>
          </div>
        </div>
      </section>

      {/* 2. BENTO SERVICES */}
      <section className="max-w-7xl mx-auto px-4 md:px-6 py-12">
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 md:gap-6">
          <div className="md:col-span-2 bg-white border-4 border-black p-8 shadow-[4px_4px_0px_#000] hover:-translate-y-1 transition-transform">
            <Zap className="w-10 h-10 text-[#FF4500] mb-6" />
            <h3 className="text-2xl md:text-3xl font-black uppercase mb-3">ZÉRO STOCK.</h3>
            <p className="text-base font-bold text-gray-600 uppercase tracking-tighter">Votre fruit est encore sur l'arbre au moment où vous l'achetez.</p>
          </div>

          <div className="bg-[#FF4500] border-4 border-black p-8 shadow-[4px_4px_0px_#000] text-white">
            <Truck className="w-10 h-10 mb-6" />
            <h3 className="text-2xl md:text-3xl font-black uppercase mb-3">LIVRAISON J+0</h3>
            <p className="text-base font-bold opacity-90 uppercase tracking-tighter">Commandez avant 11h. Livré le soir même chez vous.</p>
          </div>

          <div className="bg-black border-4 border-black p-8 shadow-[4px_4px_0px_#FF4500] text-white flex flex-col justify-center">
            <MapPin className="w-10 h-10 text-[#FF4500] mb-6" />
            <p className="text-[10px] font-black uppercase tracking-widest text-[#FF4500] mb-2">PÉRIMÈTRE 10KM</p>
            <p className="text-lg font-black uppercase leading-none">Marly • Plaisir • Versailles</p>
          </div>
        </div>
      </section>

      {/* 3. SECTION STATS */}
      <section className="max-w-7xl mx-auto px-4 md:px-6 py-16 border-t-4 border-black mt-10">
        <h2 className="text-4xl md:text-6xl font-black uppercase mb-12 italic">LES CHIFFRES <br className="md:hidden"/> NE MENTENT PAS.</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
          {[
            { label: "FRAÎCHEUR", val: "100%", desc: "Zéro chambre froide" },
            { label: "SUCRE", val: "NATUR.", desc: "Mûri au soleil" },
            { label: "KM", val: "-15", desc: "Moyenne livraison" },
            { label: "AVIS", val: "4.9/5", desc: "Clients accros" }
          ].map((stat, i) => (
            <div key={i} className="border-l-4 border-black pl-4 md:pl-6">
              <p className="text-3xl md:text-5xl font-black text-[#FF4500]">{stat.val}</p>
              <p className="text-xs font-black uppercase tracking-widest mb-1">{stat.label}</p>
              <p className="text-[10px] font-bold text-gray-500 uppercase">{stat.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* 4. SECTION VIDÉO IMMERSIVE : AMBIANCE MARCHÉ TOTALE */}
<section className="relative my-24 md:my-32 px-4 md:px-6 overflow-hidden">
  
  {/* FOND DE TEXTE RÉPÉTITIF */}
  <div className="absolute top-1/2 left-0 w-full h-full text-[#FF4500]/5 -translate-y-1/2 -z-20 font-black text-[8rem] md:text-[15rem] leading-none uppercase tracking-tighter select-none pointer-events-none rotate-3">
     DIRECT • DIRECT • DIRECT • DIRECT
  </div>

  <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-12 gap-12 items-start">
    
    {/* COLONNE GAUCHE : TEXTES */}
    <div className="md:col-span-5 space-y-8 md:space-y-12">
      <div className="space-y-6">
        <div className="inline-block bg-black text-white px-5 py-1.5 border-2 border-black font-black uppercase text-[10px] tracking-[0.2em] shadow-[4px_4px_0px_#FF4500]">
          EN DIRECT DU CHÂSSIS
        </div>
        <h2 className="text-5xl md:text-8xl font-black uppercase tracking-tighter leading-[0.85] text-gray-950">
          LE GOUT, <br/>
          <span className="text-[#FF4500]">RIEN QUE</span> <br/>
          LE GOUT.
        </h2>
        <p className="text-xl md:text-2xl font-bold text-gray-800 leading-tight border-l-8 border-black pl-8 py-2">
          Pas de longs discours, juste la réalité. Regardez la rosée sur les feuilles, écoutez le craquement de la cueillette.
        </p>
      </div>

      {/* BLOC LÉGENDE DE CUEILLETTE */}
      <div className="bg-white border-4 border-black p-6 shadow-[6px_6px_0px_#000] rotate-1 max-w-sm">
        <p className="text-sm font-black text-[#FF4500] uppercase tracking-widest mb-1">DÉTAIL CUEILLETTE</p>
        <p className="text-lg font-extrabold text-black">Cueillette de 6h30. Maturité optimale garantie.</p>
      </div>
    </div>

    {/* COLONNE DROITE : VIDÉO + CARTES */}
    <div className="md:col-span-7 flex flex-col md:flex-row gap-8 items-center md:items-start justify-end">
      
      {/* LA VIDÉO 3:4 */}
      <div className="relative w-full max-w-[320px] md:max-w-[400px] border-8 border-black shadow-[16px_16px_0px_#FF4500] aspect-[3/4] overflow-hidden bg-black group">
        <video
          id="hero-video"
          autoPlay
          loop
          muted
          playsInline
          className="absolute inset-0 w-full h-full object-cover"
        >
          <source src="/video.mp4" type="video/mp4" />
          Votre navigateur ne supporte pas la lecture.
        </video>

        {/* Bouton Son */}
        <button 
          onClick={() => {
            const v = document.getElementById('hero-video') as HTMLVideoElement;
            if (v) v.muted = !v.muted;
          }}
          className="absolute bottom-5 right-5 z-30 bg-white border-2 border-black p-3 shadow-[4px_4px_0px_#000] hover:bg-[#FF4500] hover:text-white transition-all active:translate-x-1 active:translate-y-1 active:shadow-none"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
            <path d="M11 5L6 9H2v6h4l5 4V5zM19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07" />
          </svg>
        </button>
      </div>

      {/* COLONNE DE CARTES (ÉTIQUETTES) */}
      <div className="flex flex-row md:flex-col gap-4">
        <div className="bg-[#FF4500] border-4 border-black p-4 text-white shadow-[6px_6px_0px_#000] -rotate-2">
          <p className="text-[9px] font-black uppercase tracking-[0.2em] mb-1">DATE</p>
          <p className="text-2xl font-black uppercase leading-none">24/03</p>
        </div>
        
        <div className="bg-black border-4 border-black p-4 text-white shadow-[6px_6px_0px_#FF4500] rotate-1">
          <p className="text-[9px] font-black uppercase tracking-[0.2em] text-[#FF4500] mb-1">LIEU</p>
          <p className="text-xl font-black uppercase leading-none">STAND 12</p>
        </div>
      </div>

    </div>
  </div>
</section>
      {/* 5. CTA FINAL */}
      <section className="max-w-7xl mx-auto px-4 md:px-6 py-12">
        <div className="bg-white border-4 md:border-8 border-black p-8 md:p-20 text-center shadow-[10px_10px_0px_#FF4500]">
          <h2 className="text-4xl md:text-[8rem] font-black mb-10 tracking-tighter uppercase leading-none border-b-4 border-black pb-8">
            VOTRE <span className="text-[#FF4500]">PANIER</span><br/> EST PRÊT.
          </h2>
          
          <Link href="/commander" className="inline-block w-full md:w-auto">
            <button className="w-full md:w-auto bg-black text-white px-12 py-6 border-4 border-black font-black text-xl uppercase tracking-widest hover:bg-[#FF4500] shadow-[6px_6px_0px_#FF4500] transition-all">
              VOIR LES PRODUITS 🍓
            </button>
          </Link>

          <div className="mt-16 flex flex-col md:flex-row justify-center items-center gap-6 md:gap-12">
             <div className="flex items-center gap-2 font-black text-xs uppercase tracking-widest">
                <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                Magasin Ouvert (7j/7)
             </div>
             <div className="flex items-center gap-2 font-black text-xs uppercase tracking-widest cursor-pointer hover:text-[#FF4500]">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                  <path d="M9 12a4 4 0 1 0 4 4V4a5 5 0 0 0 5 5" />
                </svg>
                TikTok : @soleilsaveurs
             </div>
          </div>
        </div>
      </section>
    </main>
  );
}