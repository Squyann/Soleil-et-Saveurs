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
  
  // LOGIQUE ADRESSE (IDENTIQUE AU PANIER)
  const [address, setAddress] = useState('');
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [isVerifying, setIsVerifying] = useState(false);
  const [showResult, setShowResult] = useState(false);
  const [distanceValide, setDistanceValide] = useState<boolean | null>(null);
  
  const router = useRouter();

  useEffect(() => {
    const initSession = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setUser(user);
    };
    initSession();
  }, []);

  // Gestion de la saisie (API Gouv)
  const handleAddressChange = async (val: string) => {
    setAddress(val);
    setDistanceValide(null); // Reset pendant la frappe
    if (val.length > 5) {
      try {
        const res = await fetch(`https://api-adresse.data.gouv.fr/search/?q=${encodeURIComponent(val)}&limit=5`);
        const data = await res.json();
        setSuggestions(data.features);
      } catch (err) { console.error(err); }
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
    
    // Simulation de vérification pour l'expérience utilisateur
    setTimeout(() => {
      setIsVerifying(false);
      if (cp.startsWith('78')) {
        setDistanceValide(true);
        setShowResult(true); // Ouvre la pop-up de succès
      } else {
        setDistanceValide(false);
      }
    }, 800);
  };

  const handleAddressCheck = (e: React.FormEvent) => {
    e.preventDefault();
    // La validation se fait déjà via la sélection dans la liste
  };

  return (
    <main className="min-h-screen bg-[#FDFCF9] text-slate-900 font-sans selection:bg-[#FF4500]/10 pb-10 overflow-x-hidden">
      {/* Navbar Compacte */}
      <nav className="fixed top-0 left-0 right-0 z-[100] bg-white border-b border-slate-100 px-4 md:px-8 h-14 flex items-center justify-between shadow-sm">
        <Link href="/" className="text-lg font-bold tracking-tight flex items-center gap-2">
          <div className="w-7 h-7 bg-[#FF4500] rounded flex items-center justify-center text-white text-[10px]">S</div>
          <span>SOLEIL<span className="text-[#FF4500]">SAVEURS</span></span>
        </Link>
        <div className="flex items-center gap-1 md:gap-2">
          <button onClick={() => setIsPanierOpen(true)} className="p-2 hover:bg-slate-100 rounded-lg transition-colors relative">
            <ShoppingCart className="w-5 h-5" />
            <span className="absolute top-1 right-1 w-3.5 h-3.5 bg-[#FF4500] text-white text-[8px] flex items-center justify-center rounded-full font-bold">0</span>
          </button>
          
          <Link href={user ? "/compte" : "/login"} className="p-2 hover:bg-slate-100 rounded-lg transition-colors">
            <User className="w-5 h-5" />
          </Link>
          
          <Link href="/aide" className="flex items-center gap-1.5 bg-slate-900 text-white px-2 md:px-3 py-1.5 rounded-lg text-[10px] md:text-xs font-semibold hover:bg-slate-800 transition-all ml-1">
            <HelpCircle className="w-3.5 h-3.5 text-[#FF4500]" />
            <span>Aide</span>
          </Link>
        </div>
      </nav>

      <PanierDrawer isOpen={isPanierOpen} onClose={() => setIsPanierOpen(false)} />

      {/* Pop-up de succès d'éligibilité */}
      {showResult && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="bg-white rounded-[2rem] p-8 max-w-sm w-full shadow-2xl text-center scale-up-center">
            <div className="w-16 h-16 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle2 className="w-8 h-8" />
            </div>
            <h3 className="text-xl font-black uppercase italic mb-2">Vous êtes éligible !</h3>
            <p className="text-sm text-slate-500 mb-6 italic">Votre adresse dans le 78 est bien située dans notre zone de livraison.</p>
            <div className="space-y-3">
              <button onClick={() => router.push('/commander')} className="w-full bg-[#FF4500] text-white py-4 rounded-xl font-bold hover:scale-105 transition-all shadow-lg shadow-orange-200">
                Voir la récolte du jour
              </button>
              <button onClick={() => setShowResult(false)} className="w-full text-slate-400 text-xs font-bold uppercase tracking-widest">
                Fermer
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Hero Section */}
      <section className="pt-20 md:pt-24 pb-10 px-4 md:px-8">
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
                
                {/* Sélecteur d'adresse avec suggestions (comme dans le panier) */}
                <div className="bg-white border-2 border-slate-100 p-4 rounded-2xl shadow-xl relative">
                  <p className="text-[10px] font-black uppercase text-slate-400 mb-2 flex justify-between">
                    Vérifier mon adresse <Navigation className="w-3 h-3 text-[#FF4500]" />
                  </p>
                  <div className="relative">
                    <div className="relative flex items-center">
                      <input 
                        type="text" 
                        placeholder="Saisissez votre adresse complète..." 
                        className="w-full text-xs font-bold uppercase bg-slate-50 p-4 pr-12 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#FF4500]/20 border border-slate-100"
                        value={address}
                        onChange={(e) => handleAddressChange(e.target.value)}
                      />
                      <div className="absolute right-4">
                        {isVerifying ? <Loader2 className="w-4 h-4 animate-spin text-[#FF4500]" /> : <Search className="w-4 h-4 text-slate-300" />}
                      </div>
                    </div>

                    {/* Suggestions d'adresses (API Gouv) */}
                    {suggestions.length > 0 && (
                      <div className="absolute z-50 top-full left-0 right-0 bg-white border border-slate-100 shadow-2xl rounded-2xl mt-2 overflow-hidden">
                        {suggestions.map((s, i) => (
                          <button 
                            key={i} 
                            onClick={() => selectionnerAdresse(s)} 
                            className="w-full p-4 text-left text-[10px] font-black uppercase border-b border-slate-50 hover:bg-slate-50 transition-colors"
                          >
                            {s.properties.label}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Message d'erreur si hors 78 */}
                  {distanceValide === false && (
                    <div className="mt-3 p-3 bg-red-50 rounded-xl text-red-600 flex items-center gap-2 animate-in slide-in-from-top-1">
                      <AlertCircle className="w-4 h-4" />
                      <p className="text-[10px] font-black uppercase">Désolé, livraison uniquement dans le 78.</p>
                    </div>
                  )}
                  
                  <p className="text-[9px] text-slate-400 mt-2 italic font-medium">Nous livrons à 15km autour de Plaisir (78)</p>
                </div>
              </div>
            </div>

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

      {/* Bento Services */}
      <section className="max-w-6xl mx-auto px-4 md:px-8 py-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-slate-900 rounded-2xl p-6 text-white min-h-[160px] flex flex-col justify-center">
            <Zap className="w-8 h-8 text-[#FF4500] mb-3" />
            <h3 className="text-xl font-bold mb-1 uppercase italic tracking-tighter">Zéro Stock.</h3>
            <p className="text-slate-400 text-xs">L'arbre est notre seul entrepôt.</p>
          </div>
          <Link href="/livraison" className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm min-h-[160px] flex flex-col justify-center hover:border-[#FF4500]/20 transition-all group">
            <Truck className="w-8 h-8 text-[#FF4500] mb-3 group-hover:translate-x-2 transition-transform" />
            <h3 className="text-xl font-bold mb-1 uppercase italic tracking-tighter">Livraison J+0</h3>
            <p className="text-slate-500 text-xs">Récolté le matin, chez vous le soir.</p>
          </Link>
          <div className="bg-[#FF4500]/5 border border-[#FF4500]/10 rounded-2xl p-6 min-h-[160px] flex flex-col justify-center">
            <MapPin className="w-8 h-8 text-[#FF4500] mb-3" />
            <h3 className="text-xl font-bold mb-1 uppercase italic tracking-tighter">Local 78</h3>
            <p className="text-slate-700 text-xs">Plaisir, Versailles et alentours.</p>
          </div>
        </div>
      </section>

      {/* Promesse */}
      <section className="max-w-6xl mx-auto px-4 md:px-8 py-16">
        <h2 className="text-3xl font-black uppercase italic tracking-tighter mb-10 text-center">NOTRE <span className="text-[#FF4500]">PROMESSE</span></h2>
        <div className="grid md:grid-cols-3 gap-8">
          {[
            { icon: <Clock />, title: "Récolte à 5h", desc: "Nos agriculteurs partenaires cueillent vos fruits et légumes à l'aube." },
            { icon: <ShieldCheck />, title: "Tri Sélectif", desc: "Nous vérifions chaque pièce. Seul le meilleur arrive dans votre cagette." },
            { icon: <Truck />, title: "Livré à 17h", desc: "Directement à votre porte dans le 78, sans passer par un frigo." }
          ].map((item, i) => (
            <div key={i} className="text-center group">
              <div className="w-16 h-16 bg-white border border-slate-100 shadow-lg rounded-2xl flex items-center justify-center mx-auto mb-4 text-[#FF4500] group-hover:scale-110 transition-transform">
                {item.icon}
              </div>
              <h4 className="font-bold uppercase text-sm mb-2 italic tracking-tight">{item.title}</h4>
              <p className="text-xs text-slate-500 leading-relaxed">{item.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Map Interactive */}
      <section className="max-w-6xl mx-auto px-4 md:px-8 py-10">
        <div className="bg-white rounded-[2.5rem] overflow-hidden shadow-xl border border-slate-100 grid md:grid-cols-2">
          <div className="p-8 md:p-12 flex flex-col justify-center">
            <h3 className="text-3xl font-black uppercase italic tracking-tighter mb-4 text-slate-900">ZONE DE <br/><span className="text-[#FF4500]">FRAÎCHEUR</span></h3>
            <p className="text-sm text-slate-500 mb-6 font-medium italic">Rayon de 15km autour de Plaisir. L'ultra-local est notre priorité.</p>
            <ul className="grid grid-cols-2 gap-3 mb-6">
              {['Plaisir', 'Versailles', 'St-Cyr', 'Villepreux', 'Clayes-sous-Bois', 'Beynes'].map((v, i) => (
                <li key={i} className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-slate-400">
                  <CheckCircle2 className="w-4 h-4 text-green-500" /> {v}
                </li>
              ))}
            </ul>
            <Link href="/livraison" className="text-xs font-bold text-[#FF4500] underline underline-offset-4">Voir les détails de livraison</Link>
          </div>
          <div className="h-[400px] w-full grayscale hover:grayscale-0 transition-all duration-700">
            <iframe 
              src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d42036.08298713028!2d1.916723!3d48.814987!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x47e682236e76839d%3A0x40b82c3688c5660!2sPlaisir!5e0!3m2!1sfr!2sfr!4v1710000000000!5m2!1sfr!2sfr" 
              width="100%" 
              height="100%" 
              style={{ border: 0 }} 
              allowFullScreen={true} 
              loading="lazy" 
            ></iframe>
          </div>
        </div>
      </section>

      {/* Stats */}
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

      {/* Avis */}
      <section className="max-w-6xl mx-auto px-4 md:px-8 py-10">
        <div className="grid md:grid-cols-3 gap-6">
          {[
            { name: "Marie L.", city: "Versailles", text: "Les tomates ont enfin du goût ! On sent qu'elles n'ont pas voyagé." },
            { name: "Thomas B.", city: "Plaisir", text: "Le concept du 'cueilli le matin' est bluffant. Fraîcheur imbattable." },
            { name: "Sophie D.", city: "Villepreux", text: "Livraison ponctuelle et livreur adorable. Je recommande !" }
          ].map((avis, i) => (
            <div key={i} className="bg-white p-6 rounded-3xl border border-slate-50 shadow-sm">
              <div className="flex gap-1 mb-3 text-yellow-400">
                {[...Array(5)].map((_, i) => <Star key={i} className="w-3 h-3 fill-current" />)}
              </div>
              <p className="text-xs font-medium italic text-slate-600 mb-4 leading-relaxed">"{avis.text}"</p>
              <p className="text-[10px] font-black uppercase tracking-widest">{avis.name} — <span className="text-[#FF4500]">{avis.city}</span></p>
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