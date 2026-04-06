'use client';
export const dynamic = 'force-dynamic';
import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { 
  ArrowRight, Zap, MapPin, ShoppingCart, Truck, 
  User, HelpCircle, Search, X, CheckCircle2, Star, Clock, ShieldCheck, Navigation, Loader2, AlertCircle
} from 'lucide-react';

// --- CONFIGURATION DES VILLES (MISES À JOUR) ET CALCUL DE DISTANCE ---
const VILLES_RELAIS = [
  { nom: "Chatou", lat: 48.8897, lon: 2.1574 },
  { nom: "Croissy-sur-Seine", lat: 48.8794, lon: 2.1431 },
  { nom: "Mareil-sur-Mauldre", lat: 48.8944, lon: 1.8681 },
  { nom: "Saint-Nom-la-Bretèche", lat: 48.8594, lon: 2.0186 },
  { nom: "Plaisir", lat: 48.8111, lon: 1.9472 }
];

function calculerDistance(lat1: number, lon1: number, lat2: number, lon2: number) {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
}

export default function Home() {
  const [user, setUser] = useState<any>(null);
  // isPanierOpen et panierCount supprimés — gérés par le layout
  
  const [address, setAddress] = useState('');
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [isVerifying, setIsVerifying] = useState(false);
  const [showResult, setShowResult] = useState(false);
  const [distanceValide, setDistanceValide] = useState<boolean | null>(null);
  const [distanceAffichee, setDistanceAffichee] = useState<number | null>(null);
  
  const router = useRouter();

  useEffect(() => {
    const initSession = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setUser(user);
    };
    initSession();
  }, []);

  const handleAddressChange = async (val: string) => {
    setAddress(val);
    setDistanceValide(null);
    if (val && val.length > 5) {
      try {
        const res = await fetch(`https://api-adresse.data.gouv.fr/search/?q=${encodeURIComponent(val)}&limit=5`);
        const data = await res.json();
        setSuggestions(data.features || []);
      } catch (err) { 
        console.error(err); 
        setSuggestions([]);
      }
    } else {
      setSuggestions([]);
    }
  };

  const selectionnerAdresse = (feat: any) => {
    const [lonSaisie, latSaisie] = feat.geometry.coordinates;
    setAddress(feat.properties.label);
    setSuggestions([]);
    setIsVerifying(true);
    
    setTimeout(() => {
      setIsVerifying(false);
      
      let minDistance = 999;
      VILLES_RELAIS.forEach(ville => {
        const d = calculerDistance(latSaisie, lonSaisie, ville.lat, ville.lon);
        if (d < minDistance) minDistance = d;
      });

      if (minDistance <= 5) {
        setDistanceAffichee(parseFloat(minDistance.toFixed(1)));
        setDistanceValide(true);
        setShowResult(true);
      } else {
        setDistanceValide(false);
      }
    }, 800);
  };

  const handleActionClick = (path: string) => {
    if (!user) {
      router.push('/login');
    } else {
      router.push(path);
    }
  };

  return (
    <main className="min-h-screen bg-[#FDFCF9] text-slate-900 font-sans selection:bg-[#FF4500]/10 pb-10 overflow-x-hidden">

      {/* Pop-up de succès d'éligibilité */}
      {showResult && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="bg-white rounded-[2.5rem] p-8 max-w-sm w-full shadow-2xl text-center border border-slate-100">
            <div className="w-16 h-16 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle2 className="w-8 h-8" />
            </div>
            <h3 className="text-xl font-black uppercase italic mb-2 tracking-tighter">Vous êtes éligible !</h3>
            <p className="text-sm text-slate-500 mb-6 italic leading-snug">
              Vous êtes à seulement <span className="text-[#FF4500] font-bold">{distanceAffichee} km</span> de nos champs. Livraison confirmée !
            </p>
            <div className="space-y-3">
              <button 
                onClick={() => handleActionClick('/commander')} 
                className="w-full bg-[#FF4500] text-white py-4 rounded-xl font-bold hover:scale-[1.02] active:scale-[0.98] transition-all shadow-lg shadow-orange-200"
              >
                {user ? "Voir la récolte du jour" : "Se connecter pour commander"}
              </button>
              <button onClick={() => setShowResult(false)} className="w-full text-slate-400 text-xs font-bold uppercase tracking-widest hover:text-slate-600 transition-colors">
                Fermer
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Hero Section */}
      <section className="pt-24 md:pt-32 pb-10 px-4 md:px-8">
        <div className="max-w-6xl mx-auto">
          <div className="inline-flex items-center gap-2 bg-[#FF4500]/10 text-[#FF4500] px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider mb-6">
            <span className="w-1.5 h-1.5 rounded-full bg-[#FF4500] animate-pulse"></span>
            Récolte ultra-locale 78
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-10 items-center">
            <div className="z-10">
              <h1 className="text-5xl md:text-7xl font-extrabold tracking-tighter leading-[0.95] mb-6 text-slate-900">
                Le goût du soleil,<br />
                <span className="text-[#FF4500]">livré chez vous.</span>
              </h1>
              <p className="text-base md:text-lg text-slate-500 max-w-md mb-8 leading-relaxed font-medium">
                Circuit court réinventé : cueillis à maturité le matin, dans votre cuisine le soir.
              </p>
              
              <div className="flex flex-col gap-4 max-w-md">
                <button 
                  onClick={() => handleActionClick('/commander')} 
                  className="w-full flex items-center justify-between bg-[#FF4500] text-white p-4 rounded-2xl font-bold hover:bg-[#e63e00] transition-all shadow-xl shadow-[#FF4500]/20 group"
                >
                  <span>Accéder au catalogue direct</span>
                  <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                </button>
                
                <div className="bg-white border border-slate-100 p-1.5 rounded-[2rem] shadow-xl shadow-slate-200/60 relative">
                  <div className="relative">
                    <div className="relative flex items-center">
                      <div className="absolute left-4 text-slate-300">
                        <MapPin className="w-4 h-4" />
                      </div>
                      <input 
                        type="text" 
                        placeholder="Saisissez votre adresse..." 
                        className="w-full text-xs font-bold uppercase bg-[#F4F7FF] p-4 pl-11 pr-12 rounded-[1.8rem] focus:outline-none focus:ring-2 focus:ring-[#FF4500]/20 border-none transition-all"
                        value={address}
                        onChange={(e) => handleAddressChange(e.target.value)}
                      />
                      <div className="absolute right-4">
                        {isVerifying ? <Loader2 className="w-4 h-4 animate-spin text-[#FF4500]" /> : <Search className="w-4 h-4 text-slate-300" />}
                      </div>
                    </div>

                    {(suggestions || []).length > 0 && (
                      <div className="absolute z-50 top-full left-0 right-0 bg-white border border-slate-100 shadow-2xl rounded-2xl mt-2 overflow-hidden animate-in slide-in-from-top-2">
                        {suggestions.map((s, i) => (
                          <button 
                            key={i} 
                            onClick={() => selectionnerAdresse(s)} 
                            className="w-full p-4 text-left text-[10px] font-black uppercase border-b border-slate-50 hover:bg-slate-50 transition-colors flex items-center gap-3"
                          >
                            <MapPin className="w-3 h-3 text-[#FF4500]" />
                            {s.properties.label}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  {distanceValide === false && (
                    <div className="mx-2 mt-2 p-3 bg-red-50 rounded-xl text-red-600 flex items-center gap-2 animate-in fade-in zoom-in-95">
                      <AlertCircle className="w-3.5 h-3.5" />
                      <p className="text-[10px] font-black uppercase">Désolé, hors zone (Rayon 5km autour de nos points relais).</p>
                    </div>
                  )}
                </div>
                <p className="text-[10px] text-slate-400 px-4 italic font-semibold">📍 Chatou, Croissy, Mareil, St-Nom, Plaisir (Rayon 5km)</p>
              </div>
            </div>

            <div className="relative aspect-[4/5] md:aspect-[3/4] max-w-[420px] mx-auto md:ml-auto w-full rounded-[2.5rem] overflow-hidden shadow-2xl bg-slate-100 border-8 border-white">
              <video id="hero-video" autoPlay loop muted playsInline className="absolute inset-0 w-full h-full object-cover">
                <source src="/video.mp4" type="video/mp4" />
              </video>
              <div className="absolute bottom-6 left-6 right-6 p-4 bg-white/10 backdrop-blur-xl rounded-2xl border border-white/20 flex items-center justify-between">
                <div className="flex items-center gap-2">
                   <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                   <span className="text-white text-[10px] font-black uppercase tracking-widest">Live du champ</span>
                </div>
                <button onClick={() => {const v = document.getElementById('hero-video') as HTMLVideoElement; if (v) v.muted = !v.muted;}} className="text-white hover:scale-110 transition-transform">
                  <Zap className="w-4 h-4 fill-white text-white" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Bento Services */}
      <section className="max-w-6xl mx-auto px-4 md:px-8 py-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-[#0F172A] rounded-[2rem] p-8 text-white min-h-[180px] flex flex-col justify-center shadow-xl shadow-slate-200">
            <Zap className="w-8 h-8 text-[#FF4500] mb-4" />
            <h3 className="text-2xl font-black mb-1 uppercase italic tracking-tighter">Zéro Stock.</h3>
            <p className="text-slate-400 text-sm font-medium">L'arbre est notre seul entrepôt.</p>
          </div>
          <Link href="/livraison" className="bg-white border border-slate-100 rounded-[2rem] p-8 shadow-xl shadow-slate-100 min-h-[180px] flex flex-col justify-center hover:border-[#FF4500]/20 transition-all group">
            <Truck className="w-8 h-8 text-[#FF4500] mb-4 group-hover:translate-x-3 transition-transform" />
            <h3 className="text-2xl font-black mb-1 uppercase italic tracking-tighter">Livraison J+0</h3>
            <p className="text-slate-500 text-sm font-medium">Récolté le matin, chez vous le soir.</p>
          </Link>
          <div className="bg-[#FFF5F1] rounded-[2rem] p-8 min-h-[180px] flex flex-col justify-center border border-orange-100 shadow-xl shadow-orange-50">
            <MapPin className="w-8 h-8 text-[#FF4500] mb-4" />
            <h3 className="text-2xl font-black mb-1 uppercase italic tracking-tighter text-slate-900">Zone 78</h3>
            <p className="text-slate-600 text-sm font-medium">Ultra-local : rayon de 5km maximum.</p>
          </div>
        </div>
      </section>

      {/* PROMESSE */}
      <section className="max-w-6xl mx-auto px-4 md:px-8 py-24 overflow-hidden">
        <div className="flex items-center gap-4 mb-16">
          <div className="h-px flex-1 bg-slate-200" />
          <h2 className="text-4xl font-black uppercase italic tracking-tighter text-center whitespace-nowrap">
            NOTRE <span className="text-[#FF4500]">PROMESSE</span>
          </h2>
          <div className="h-px flex-1 bg-slate-200" />
        </div>

        <div className="relative">
          <div className="hidden md:block absolute top-[52px] left-[calc(16.66%+16px)] right-[calc(16.66%+16px)] h-px bg-gradient-to-r from-transparent via-[#FF4500]/30 to-transparent" />
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 md:gap-6">
            {[
              {
                icon: <Clock className="w-7 h-7" />,
                step: "01",
                title: "Récolte à 5h",
                desc: "Nos agriculteurs partenaires cueillent vos fruits et légumes à l'aube, au pic de leur maturité.",
                tag: "L'aube",
                bg: "bg-[#FFF5F1]",
                border: "border-orange-100",
              },
              {
                icon: <ShieldCheck className="w-7 h-7" />,
                step: "02",
                title: "Tri Sélectif",
                desc: "Nous vérifions chaque pièce manuellement. Seul le meilleur arrive dans votre cagette.",
                tag: "La sélection",
                bg: "bg-white",
                border: "border-slate-100",
              },
              {
                icon: <Truck className="w-7 h-7" />,
                step: "03",
                title: "Livré à 17h",
                desc: "Directement à votre porte, sans jamais passer par un frigo. De l'arbre à l'assiette.",
                tag: "Le soir",
                bg: "bg-[#0F172A]",
                border: "border-transparent",
                dark: true,
              },
            ].map((item, i) => (
              <div
                key={i}
                className={`relative group rounded-[2rem] p-8 border ${item.bg} ${item.border} shadow-xl shadow-slate-100/60 hover:shadow-slate-200 transition-all duration-500 hover:-translate-y-1`}
              >
                <span className={`absolute top-6 right-6 text-7xl font-black leading-none select-none pointer-events-none ${item.dark ? 'text-white/5' : 'text-slate-900/5'}`}>
                  {item.step}
                </span>
                <div className={`w-14 h-14 rounded-2xl flex items-center justify-center mb-6 transition-transform duration-500 group-hover:scale-110 ${item.dark ? 'bg-white/10 text-[#FF4500]' : 'bg-white border border-slate-100 shadow-md text-[#FF4500]'}`}>
                  {item.icon}
                </div>
                <span className={`inline-block text-[9px] font-black uppercase tracking-[0.2em] px-2.5 py-1 rounded-full mb-3 ${item.dark ? 'bg-white/10 text-white/60' : 'bg-[#FF4500]/10 text-[#FF4500]'}`}>
                  {item.tag}
                </span>
                <h4 className={`text-2xl font-black uppercase italic tracking-tighter mb-3 ${item.dark ? 'text-white' : 'text-slate-900'}`}>
                  {item.title}
                </h4>
                <p className={`text-sm leading-relaxed font-medium ${item.dark ? 'text-slate-400' : 'text-slate-500'}`}>
                  {item.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* STATS */}
      <section className="max-w-6xl mx-auto px-4 md:px-8 my-4">
        <div className="bg-[#0F172A] rounded-[2.5rem] px-10 py-12 grid grid-cols-2 md:grid-cols-4 gap-8 shadow-2xl shadow-slate-300 relative overflow-hidden">
          <div className="absolute -top-20 -right-20 w-72 h-72 bg-[#FF4500]/10 blur-[80px] rounded-full pointer-events-none" />
          <div className="absolute -bottom-10 -left-10 w-48 h-48 bg-blue-500/10 blur-[60px] rounded-full pointer-events-none" />
          {[
            { label: "Fraîcheur", val: "100%", desc: "Zéro frigo" },
            { label: "Maturité", val: "Optim.", desc: "Sur l'arbre" },
            { label: "Circuit", val: "Ultra", desc: "Zéro interm." },
            { label: "Avis", val: "4.9/5", desc: "Note Google" },
          ].map((stat, i) => (
            <div key={i} className="flex flex-col items-start relative z-10 group">
              <p className="text-4xl md:text-5xl font-black text-white leading-none tracking-tighter mb-2 group-hover:text-[#FF4500] transition-colors duration-300">
                {stat.val}
              </p>
              <p className="text-[10px] font-black uppercase text-[#FF4500] tracking-widest mb-1">{stat.label}</p>
              <div className="h-px w-8 bg-white/10 mb-1" />
              <p className="text-[10px] text-slate-500 font-bold uppercase">{stat.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* AVIS */}
      <section className="max-w-6xl mx-auto px-4 md:px-8 py-16">
        <div className="flex items-center justify-between mb-12">
          <div>
            <p className="text-[10px] font-black uppercase text-[#FF4500] tracking-widest mb-2">Ce qu'ils en pensent</p>
            <h3 className="text-3xl font-black uppercase italic tracking-tighter">Ils nous font <span className="text-[#FF4500]">confiance</span></h3>
          </div>
          <div className="hidden md:flex items-center gap-1">
            {[...Array(5)].map((_, i) => (
              <Star key={i} className="w-5 h-5 fill-[#FF4500] text-[#FF4500]" />
            ))}
            <span className="ml-2 text-sm font-black text-slate-900">4.9</span>
            <span className="text-xs text-slate-400 font-bold ml-1">/ 5</span>
          </div>
        </div>
        <div className="grid md:grid-cols-3 gap-6">
          {[
            { name: "Marie L.", city: "Chatou", text: "Les tomates ont enfin du goût ! On sent qu'elles n'ont pas voyagé.", stars: 5 },
            { name: "Thomas B.", city: "Plaisir", text: "Le concept du 'cueilli le matin' est bluffant. Fraîcheur imbattable.", stars: 5 },
            { name: "Sophie D.", city: "Croissy", text: "Livraison ponctuelle et livreur adorable. Je recommande !", stars: 5 },
          ].map((avis, i) => (
            <div
              key={i}
              className={`relative p-8 rounded-[2rem] border transition-all duration-500 hover:-translate-y-1 group ${
                i === 1
                  ? 'bg-[#FF4500] border-transparent shadow-2xl shadow-[#FF4500]/25'
                  : 'bg-white border-slate-100 shadow-xl shadow-slate-100/60 hover:shadow-slate-200'
              }`}
            >
              <span className={`absolute top-6 right-8 text-7xl font-black leading-none select-none pointer-events-none ${i === 1 ? 'text-white/10' : 'text-slate-900/5'}`}>
                "
              </span>
              <div className="flex gap-1 mb-5">
                {[...Array(avis.stars)].map((_, j) => (
                  <Star key={j} className={`w-3.5 h-3.5 fill-current ${i === 1 ? 'text-white' : 'text-[#FF4500]'}`} />
                ))}
              </div>
              <p className={`text-[15px] font-semibold italic leading-relaxed mb-8 ${i === 1 ? 'text-white' : 'text-slate-600'}`}>
                "{avis.text}"
              </p>
              <div className="flex items-center gap-3">
                <div className={`w-9 h-9 rounded-xl flex items-center justify-center text-xs font-black ${i === 1 ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-700'}`}>
                  {avis.name.charAt(0)}
                </div>
                <div>
                  <p className={`text-xs font-black uppercase tracking-wider ${i === 1 ? 'text-white' : 'text-slate-900'}`}>
                    {avis.name}
                  </p>
                  <p className={`text-[10px] font-black uppercase tracking-widest ${i === 1 ? 'text-white/60' : 'text-[#FF4500]'}`}>
                    {avis.city}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Map Interactive */}
      <section className="max-w-6xl mx-auto px-4 md:px-8 py-10">
        <div className="bg-white rounded-[3rem] overflow-hidden shadow-2xl shadow-slate-200 border border-slate-50 grid md:grid-cols-2">
          <div className="p-10 md:p-14 flex flex-col justify-center">
            <h3 className="text-4xl font-black uppercase italic tracking-tighter mb-6 text-slate-900 leading-[0.9]">ZONE DE <br/><span className="text-[#FF4500]">FRAÎCHEUR</span></h3>
            <p className="text-sm text-slate-500 mb-8 font-semibold italic leading-relaxed">Rayon de 5km autour de nos points de récolte. L'ultra-local est notre priorité.</p>
            <ul className="grid grid-cols-2 gap-4 mb-8">
              {['Chatou', 'Croissy', 'Mareil', 'St-Nom', 'Plaisir'].map((v, i) => (
                <li key={i} className="flex items-center gap-2.5 text-[11px] font-black uppercase tracking-widest text-slate-400">
                  <div className="w-5 h-5 rounded-full bg-green-50 flex items-center justify-center">
                    <CheckCircle2 className="w-3.5 h-3.5 text-green-500" />
                  </div>
                  {v}
                </li>
              ))}
            </ul>
            <Link href="/livraison" className="text-xs font-black text-[#FF4500] underline underline-offset-8 decoration-2 hover:text-[#e63e00] transition-colors uppercase tracking-widest">Voir les détails de livraison</Link>
          </div>
          <div className="h-[450px] w-full grayscale contrast-[1.1] hover:grayscale-0 transition-all duration-1000">
            <iframe 
              src="https://www.google.com/maps/embed?pb=!1m12!1m8!1m3!1d84030.82565651523!2d2.0125!3d48.855!3m2!1i1024!2i768!4f13.1!2m1!1sYvelines%20Chatou%20Plaisir!5e0!3m2!1sfr!2sfr!4v1710000000000!5m2!1sfr!2sfr" 
              width="100%" 
              height="100%" 
              style={{ border: 0 }} 
              allowFullScreen={true} 
              loading="lazy" 
            ></iframe>
          </div>
        </div>
      </section>

      {/* CTA Final */}
      <section className="max-w-6xl mx-auto px-4 md:px-8 py-10">
        <div className="bg-[#0F172A] rounded-[3.5rem] p-12 md:p-20 text-center text-white relative overflow-hidden shadow-2xl shadow-slate-400">
          <div className="absolute top-0 right-0 w-[400px] h-[400px] bg-[#FF4500]/15 blur-[120px] pointer-events-none rounded-full" />
          <div className="absolute bottom-0 left-0 w-[300px] h-[300px] bg-blue-500/10 blur-[100px] pointer-events-none rounded-full" />
          <h2 className="text-4xl md:text-6xl font-black uppercase italic tracking-tighter mb-10 relative z-10 leading-[0.95]">
            PRÊT À GOÛTER <br/><span className="text-[#FF4500]">LA DIFFÉRENCE ?</span>
          </h2>
          <button 
            onClick={() => handleActionClick('/commander')} 
            className="relative z-10 inline-flex items-center gap-3 bg-[#FF4500] text-white px-12 py-5 rounded-2xl font-black text-xl hover:scale-105 active:scale-95 transition-all shadow-2xl shadow-orange-500/30 group"
          >
            {user ? "Voir la récolte 🍓" : "Créer mon compte 🍓"}
            <ArrowRight className="w-6 h-6 group-hover:translate-x-1 transition-transform" />
          </button>
        </div>
      </section>

      <footer className="text-center py-6 opacity-30 text-[8px] font-black uppercase tracking-[0.4em] italic">
        © Soleil & Saveurs 2026 — De l'arbre à l'assiette.
      </footer>
    </main>
  );
}
