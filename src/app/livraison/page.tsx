'use client';
import React, { useState } from 'react';
import Link from 'next/link';
import { 
  Truck, MapPin, CheckCircle2, Clock, ShieldCheck, 
  ArrowLeft, Search, Navigation, Package, RefreshCcw,
  AlertCircle, Info
} from 'lucide-react';

const ELIGIBLE_ZONES = [
  { cp: "78370", city: "Plaisir", delay: "J+0" },
  { cp: "78340", city: "Les Clayes-sous-Bois", delay: "J+0" },
  { cp: "78450", city: "Villepreux", delay: "J+0" },
  { cp: "78000", city: "Versailles", delay: "J+1" },
  { cp: "78150", city: "Le Chesnay", delay: "J+1" },
  { cp: "78180", city: "Montigny-le-Bretonneux", delay: "J+0" },
  { cp: "78650", city: "Beynes", delay: "J+0" },
  { cp: "78210", city: "Saint-Cyr-l'École", delay: "J+0" },
];

export default function LivraisonPage() {
  const [userCP, setUserCP] = useState('');
  const [status, setStatus] = useState<'idle' | 'eligible' | 'not-eligible'>('idle');

  const checkEligibility = (e: React.FormEvent) => {
    e.preventDefault();
    const isEligible = ELIGIBLE_ZONES.some(zone => zone.cp === userCP);
    setStatus(isEligible ? 'eligible' : 'not-eligible');
  };

  return (
    <div className="min-h-screen bg-[#FDFCF9] text-slate-900 pb-20">
      {/* Navbar Minimaliste */}
      <nav className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b border-slate-100 px-6 h-16 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-[#FF4500] transition-colors">
          <ArrowLeft className="w-4 h-4" /> Retour Boutique
        </Link>
        <span className="text-[10px] font-black uppercase tracking-tighter text-slate-900 italic">Soleil Saveurs — Logistique</span>
      </nav>

      {/* Hero Section - Testeur d'éligibilité */}
      <section className="bg-slate-900 py-20 px-6 relative overflow-hidden text-center">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-full bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-[#FF4500]/10 via-transparent to-transparent opacity-50"></div>
        
        <div className="max-w-4xl mx-auto relative z-10">
          <h1 className="text-4xl md:text-7xl font-black text-white uppercase tracking-tighter mb-6 italic">
            LIVRAISON <span className="text-[#FF4500]">ULTRA-LOCALE</span>
          </h1>
          <p className="text-slate-400 text-sm md:text-base font-bold uppercase tracking-[0.2em] mb-12 max-w-2xl mx-auto">
            Nous limitons nos trajets à 15km autour de nos champs pour une fraîcheur garantie.
          </p>

          <form onSubmit={checkEligibility} className="max-w-md mx-auto relative">
            <div className="flex bg-white rounded-2xl overflow-hidden p-1 shadow-2xl">
              <div className="flex items-center px-4 text-slate-400">
                <Navigation className="w-5 h-5" />
              </div>
              <input 
                type="text" 
                maxLength={5}
                value={userCP}
                onChange={(e) => setUserCP(e.target.value)}
                placeholder="Entrez votre Code Postal (ex: 78370)" 
                className="w-full py-4 text-sm font-bold focus:outline-none"
              />
              <button className="bg-[#FF4500] text-white px-8 rounded-xl font-black uppercase text-[10px] hover:bg-slate-900 transition-colors">
                Vérifier
              </button>
            </div>

            {/* Résultats du test */}
            <div className="mt-6 animate-in fade-in slide-in-from-top-4 duration-500">
              {status === 'eligible' && (
                <div className="bg-green-500/10 border border-green-500/20 p-4 rounded-xl flex items-center gap-3 text-green-400">
                  <CheckCircle2 className="w-5 h-5 shrink-0" />
                  <p className="text-[10px] font-black uppercase text-left">Génial ! Vous êtes dans notre zone de récolte directe. Livraison J+0 possible.</p>
                </div>
              )}
              {status === 'not-eligible' && (
                <div className="bg-red-500/10 border border-red-500/20 p-4 rounded-xl flex items-center gap-3 text-red-400">
                  <AlertCircle className="w-5 h-5 shrink-0" />
                  <p className="text-[10px] font-black uppercase text-left">Nous ne livrons pas encore chez vous. Laissez votre mail sur WhatsApp pour être prévenu !</p>
                </div>
              )}
            </div>
          </form>
        </div>
      </section>

      <div className="max-w-6xl mx-auto px-6 -mt-8 relative z-20">
        {/* Bento Logistique */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-20">
          <div className="bg-white p-8 rounded-[32px] shadow-xl border border-slate-50 flex flex-col items-center text-center">
            <div className="w-14 h-14 bg-orange-50 rounded-2xl flex items-center justify-center mb-4 text-[#FF4500]">
              <Clock className="w-7 h-7" />
            </div>
            <h3 className="font-black uppercase text-sm mb-2">Flux Tendu J+0</h3>
            <p className="text-[11px] text-slate-500 font-medium leading-relaxed italic">Commandé avant minuit, récolté à 5h, chez vous pour le dîner.</p>
          </div>
          <div className="bg-white p-8 rounded-[32px] shadow-xl border border-slate-100 flex flex-col items-center text-center">
            <div className="w-14 h-14 bg-blue-50 rounded-2xl flex items-center justify-center mb-4 text-blue-500">
              <Package className="w-7 h-7" />
            </div>
            <h3 className="font-black uppercase text-sm mb-2">Cagette Consignée</h3>
            <p className="text-[11px] text-slate-500 font-medium leading-relaxed italic">Zéro carton inutile. Nous récupérons les cagettes à chaque passage.</p>
          </div>
          <div className="bg-white p-8 rounded-[32px] shadow-xl border border-slate-50 flex flex-col items-center text-center">
            <div className="w-14 h-14 bg-green-50 rounded-2xl flex items-center justify-center mb-4 text-green-500">
              <ShieldCheck className="w-7 h-7" />
            </div>
            <h3 className="font-black uppercase text-sm mb-2">Frais Fixes</h3>
            <p className="text-[11px] text-slate-500 font-medium leading-relaxed italic">Gratuit dès 35€. Participation de 4,90€ en dessous pour nos livreurs locaux.</p>
          </div>
        </div>

        {/* Section Carte et Rayon */}
        <div className="grid lg:grid-cols-2 gap-12 items-center mb-24">
          <div className="space-y-8">
            <div className="inline-flex items-center gap-2 bg-[#FF4500]/10 text-[#FF4500] px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider">
              <span className="w-1.5 h-1.5 rounded-full bg-[#FF4500] animate-pulse"></span>
              Périmètre de sécurité fraîcheur
            </div>
            <h2 className="text-5xl font-black uppercase italic tracking-tighter leading-none">
              POURQUOI <span className="text-[#FF4500]">15 KM ?</span>
            </h2>
            <p className="text-slate-500 font-medium leading-relaxed italic">
              Parce que la saveur d'une fraise ou d'une salade décline à chaque kilomètre parcouru dans un camion. 
              En restant dans ce rayon autour de <span className="text-slate-900 font-bold">Plaisir (78)</span>, nous garantissons un produit qui n'a jamais vu la couleur d'un réfrigérateur industriel.
            </p>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="flex gap-4 items-start p-4 bg-slate-50 rounded-2xl">
                <div className="p-2 bg-white rounded-lg shadow-sm"><RefreshCcw className="w-4 h-4 text-[#FF4500]"/></div>
                <div>
                  <h4 className="text-[10px] font-black uppercase">Émissions Réduites</h4>
                  <p className="text-[9px] text-slate-400 font-bold uppercase">Trajets courts = Impact minime</p>
                </div>
              </div>
              <div className="flex gap-4 items-start p-4 bg-slate-50 rounded-2xl">
                <div className="p-2 bg-white rounded-lg shadow-sm"><MapPin className="w-4 h-4 text-[#FF4500]"/></div>
                <div>
                  <h4 className="text-[10px] font-black uppercase">Soutien Local</h4>
                  <p className="text-[9px] text-slate-400 font-bold uppercase">100% Yvelines uniquement</p>
                </div>
              </div>
            </div>
          </div>

          <div className="relative rounded-[40px] overflow-hidden shadow-2xl border-8 border-white bg-slate-100 h-[500px]">
             <iframe 
              src="https://www.google.com/maps/embed?pb=!1m14!1m12!1m3!1d84074.83177659556!2d1.954602!3d48.814324!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!5e0!3m2!1sfr!2sfr!4v1709650000000!5m2!1sfr!2sfr&q=Plaisir+78&z=11" 
              width="100%" 
              height="100%" 
              style={{ border: 0 }} 
              allowFullScreen={true} 
              loading="lazy"
              className="grayscale contrast-125 hover:grayscale-0 transition-all duration-1000"
            ></iframe>
            {/* Overlay d'information sur la carte */}
            <div className="absolute bottom-6 left-6 right-6 bg-slate-900 text-white p-6 rounded-3xl shadow-2xl flex items-center justify-between">
              <div>
                <p className="text-[9px] font-black uppercase tracking-widest text-[#FF4500]">Zone de couverture</p>
                <p className="text-xs font-bold italic">Cœur de zone : Plaisir & Environs</p>
              </div>
              <div className="w-10 h-10 bg-white/10 rounded-full flex items-center justify-center">
                <Info className="w-5 h-5" />
              </div>
            </div>
          </div>
        </div>

        {/* Liste des villes détaillées */}
        <div className="bg-white rounded-[40px] p-12 shadow-sm border border-slate-100">
           <h3 className="text-2xl font-black uppercase italic tracking-tighter mb-8 text-center">VILLES <span className="text-[#FF4500]">DESSERVIES</span></h3>
           <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
              {ELIGIBLE_ZONES.map((zone, i) => (
                <div key={i} className="flex flex-col border-l-2 border-[#FF4500] pl-4">
                  <span className="text-xs font-black text-slate-900 leading-none">{zone.city}</span>
                  <span className="text-[10px] font-bold text-slate-400 uppercase mt-1">{zone.cp}</span>
                  <span className="text-[9px] font-black text-green-500 uppercase mt-2 bg-green-50 self-start px-2 py-0.5 rounded-full">{zone.delay}</span>
                </div>
              ))}
           </div>
        </div>
      </div>

      {/* Footer CTA */}
      <section className="mt-20 px-6 text-center">
        <h2 className="text-3xl font-black uppercase italic tracking-tighter mb-8">VOUS ÊTES DANS <br/>LA ZONE ?</h2>
        <Link href="/commander" className="inline-flex items-center gap-4 bg-[#FF4500] text-white px-10 py-5 rounded-[2rem] font-black uppercase text-xs hover:scale-105 transition-all shadow-xl shadow-[#FF4500]/20">
          Lancer ma commande <Truck className="w-5 h-5" />
        </Link>
      </section>
    </div>
  );
}