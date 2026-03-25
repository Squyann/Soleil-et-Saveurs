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
import PanierDrawer from '@/components/ui/PanierDrawer';

export default function Home() {
  const [user, setUser] = useState<any>(null);
  const [isPanierOpen, setIsPanierOpen] = useState(false);
  const [panierCount, setPanierCount] = useState(0); // État pour le badge du panier
  
  // LOGIQUE ADRESSE
  const [address, setAddress] = useState('');
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [isVerifying, setIsVerifying] = useState(false);
  const [showResult, setShowResult] = useState(false);
  const [distanceValide, setDistanceValide] = useState<boolean | null>(null);
  
  const router = useRouter();

  // Initialisation Session + Panier Count
  useEffect(() => {
    const initSession = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setUser(user);
    };
    
    const updateBadge = () => {
      const saved = localStorage.getItem('mon-panier');
      if (saved) {
        const items = JSON.parse(saved);
        setPanierCount(Array.isArray(items) ? items.length : 0);
      }
    };

    initSession();
    updateBadge();
    window.addEventListener('storage', updateBadge);
    return () => window.removeEventListener('storage', updateBadge);
  }, []);

  // Gestion de la saisie (API Gouv)
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

  // Sélection de l'adresse (Logique 78)
  const selectionnerAdresse = (feat: any) => {
    setAddress(feat.properties.label);
    setSuggestions([]);
    setIsVerifying(true);
    
    const cp = feat.properties.postcode;
    
    setTimeout(() => {
      setIsVerifying(false);
      if (cp && cp.startsWith('78')) {
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
      {/* Navbar Compacte */}
      <nav className="fixed top-0 left-0 right-0 z-[100] bg-white/80 backdrop-blur-md border-b border-slate-100 px-4 md:px-8 h-14 flex items-center justify-between shadow-sm">
        <Link href="/" className="text-lg font-bold tracking-tight flex items-center gap-2">
          <div className="w-7 h-7 bg-[#FF4500] rounded flex items-center justify-center text-white text-[10px]">S</div>
          <span>SOLEIL<span className="text-[#FF4500]"> & SAVEURS</span></span>
        </Link>
        <div className="flex items-center gap-1 md:gap-2">
          <button onClick={() => setIsPanierOpen(true)} className="p-2 hover:bg-slate-100 rounded-lg transition-colors relative">
            <ShoppingCart className="w-5 h-5" />
            {panierCount > 0 && (
              <span className="absolute top-1 right-1 w-3.5 h-3.5 bg-[#FF4500] text-white text-[8px] flex items-center justify-center rounded-full font-bold animate-in zoom-in">
                {panierCount}
              </span>
            )}
          </button>
          
          <Link href={user ? "/compte" : "/login"} className="p-2 hover:bg-slate-100 rounded-lg transition-colors">
            <User className="w-5 h-5" />
          </Link>
          
          <Link href="/aide" className="flex items-center gap-1.5 bg-slate-900 text-white px-2 md:px-3 py-1.5 rounded-lg text-[10px] md:text-xs font-semibold hover:bg-slate-800 transition-all ml-1 shadow-lg shadow-slate-200">
            <HelpCircle className="w-3.5 h-3.5 text-[#FF4500]" />
            <span>Aide</span>
          </Link>
        </div>
      </nav>

      {/* Le PanierDrawer reçoit bien la prop user */}
      <PanierDrawer isOpen={isPanierOpen} onClose={() => setIsPanierOpen(false)} user={user} />

      {/* Pop-up de succès d'éligibilité */}
      {showResult && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="bg-white rounded-[2.5rem] p-8 max-w-sm w-full shadow-2xl text-center border border-slate-100">
            <div className="w-16 h-16 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle2 className="w-8 h-8" />
            </div>
            <h3 className="text-xl font-black uppercase italic mb-2 tracking-tighter">Vous êtes éligible !</h3>
            <p className="text-sm text-slate-500 mb-6 italic leading-snug">Votre adresse dans le 78 est bien située dans notre zone de livraison.</p>
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
            Récolte du jour 78
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
                      <p className="text-[10px] font-black uppercase">Livraison uniquement dans le 78.</p>
                    </div>
                  )}
                </div>
                <p className="text-[10px] text-slate-400 px-4 italic font-semibold">📍 Plaisir, Versailles et alentours (Rayon 15km)</p>
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
            <h3 className="text-2xl font-black mb-1 uppercase italic tracking-tighter text-slate-900">Local 78</h3>
            <p className="text-slate-600 text-sm font-medium">Plaisir, Versailles et alentours.</p>
          </div>
        </div>
      </section>

      {/* Promesse */}
      <section className="max-w-6xl mx-auto px-4 md:px-8 py-20">
        <h2 className="text-4xl font-black uppercase italic tracking-tighter mb-16 text-center">NOTRE <span className="text-[#FF4500]">PROMESSE</span></h2>
        <div className="grid md:grid-cols-3 gap-12">
          {[
            { icon: <Clock className="w-6 h-6" />, title: "Récolte à 5h", desc: "Nos agriculteurs partenaires cueillent vos fruits et légumes à l'aube." },
            { icon: <ShieldCheck className="w-6 h-6" />, title: "Tri Sélectif", desc: "Nous vérifions chaque pièce. Seul le meilleur arrive dans votre cagette." },
            { icon: <Truck className="w-6 h-6" />, title: "Livré à 17h", desc: "Directement à votre porte dans le 78." }
          ].map((item, i) => (
            <div key={i} className="text-center group">
              <div className="w-16 h-16 bg-white border border-slate-50 shadow-xl shadow-slate-100 rounded-2xl flex items-center justify-center mx-auto mb-6 text-[#FF4500] group-hover:scale-110 group-hover:shadow-orange-100 transition-all duration-500">
                {item.icon}
              </div>
              <h4 className="font-black uppercase text-base mb-3 italic tracking-tight">{item.title}</h4>
              <p className="text-sm text-slate-500 leading-relaxed max-w-[250px] mx-auto font-medium">{item.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Stats */}
      <section className="max-w-6xl mx-auto px-4 md:px-8 py-12 border-y border-slate-100 my-10 bg-white/50">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8 md:gap-4">
          {[
            { label: "Fraîcheur", val: "100%", desc: "Zéro frigo" },
            { label: "Maturité", val: "Optim.", desc: "Sur l'arbre" },
            { label: "Circuit", val: "Ultra", desc: "Zéro interm." },
            { label: "Avis", val: "4.9/5", desc: "Note Google" }
          ].map((stat, i) => (
            <div key={i} className="flex flex-col items-center md:items-start text-center md:text-left">
              <p className="text-4xl font-black text-slate-900 leading-none tracking-tighter mb-2">{stat.val}</p>
              <p className="text-[11px] font-black uppercase text-[#FF4500] tracking-widest">{stat.label}</p>
              <p className="text-[10px] text-slate-400 font-bold uppercase mt-0.5">{stat.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Avis */}
      <section className="max-w-6xl mx-auto px-4 md:px-8 py-10">
        <div className="grid md:grid-cols-3 gap-8">
          {[
            { name: "Marie L.", city: "Versailles", text: "Les tomates ont enfin du goût ! On sent qu'elles n'ont pas voyagé." },
            { name: "Thomas B.", city: "Plaisir", text: "Le concept du 'cueilli le matin' est bluffant. Fraîcheur imbattable." },
            { name: "Sophie D.", city: "Villepreux", text: "Livraison ponctuelle et livreur adorable. Je recommande !" }
          ].map((avis, i) => (
            <div key={i} className="bg-white p-8 rounded-[2.5rem] border border-slate-50 shadow-xl shadow-slate-100/50 hover:shadow-slate-200 transition-all duration-500">
              <div className="flex gap-1 mb-6 text-orange-400">
                {[...Array(5)].map((_, i) => <Star key={i} className="w-4 h-4 fill-current" />)}
              </div>
              <p className="text-[15px] font-semibold italic text-slate-600 mb-8 leading-relaxed">"{avis.text}"</p>
              <div className="flex flex-col">
                <p className="text-xs font-black uppercase tracking-[0.15em] text-slate-900">{avis.name}</p>
                <div className="h-0.5 w-6 bg-[#FF4500] my-2 rounded-full" />
                <p className="text-[10px] font-black uppercase tracking-widest text-[#FF4500]">{avis.city}</p>
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
            <p className="text-sm text-slate-500 mb-8 font-semibold italic leading-relaxed">Rayon de 15km autour de Plaisir. L'ultra-local est notre priorité absolue.</p>
            <ul className="grid grid-cols-2 gap-4 mb-8">
              {['Plaisir', 'Versailles', 'St-Cyr', 'Villepreux', 'Clayes-sous-Bois', 'Beynes'].map((v, i) => (
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
              src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d42013.4357285189!2d1.9168953999999998!3d48.8135359!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x47e683f12674e7d3%3A0x40b82c3688b3980!2s78370%20Plaisir!5e0!3m2!1sfr!2sfr!4v1709123456789!5m2!1sfr!2sfr" 
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
        © Soleil Saveurs 2026 — De l'arbre à l'assiette.
      </footer>
    </main>
  );
}