'use client';
import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import confetti from 'canvas-confetti';
import { 
  Mail, Lock, ArrowRight, Loader2, ChevronLeft, User, Sparkles, Gift, 
  ShieldCheck, Calendar, Phone, MapPin, AlertCircle 
} from 'lucide-react';
import Link from 'next/link';

export default function SignupPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [lastName, setLastName] = useState('');
  const [firstName, setFirstName] = useState('');
  const [birthDate, setBirthDate] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [referralCodeInput, setReferralCodeInput] = useState('');

  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  // --- LOGIQUE DE CONFETTIS ---
  const triggerConfetti = () => {
    const duration = 3 * 1000;
    const animationEnd = Date.now() + duration;
    const defaults = { startVelocity: 30, spread: 360, ticks: 60, zIndex: 0 };

    const randomInRange = (min: number, max: number) => Math.random() * (max - min) + min;

    const interval: any = setInterval(function() {
      const timeLeft = animationEnd - Date.now();
      if (timeLeft <= 0) return clearInterval(interval);

      const particleCount = 50 * (timeLeft / duration);
      confetti({ ...defaults, particleCount, origin: { x: randomInRange(0.1, 0.3), y: Math.random() - 0.2 } });
      confetti({ ...defaults, particleCount, origin: { x: randomInRange(0.7, 0.9), y: Math.random() - 0.2 } });
    }, 250);
  };

  // --- VALIDATIONS ---
  const isPhoneValid = phone.replace(/\s/g, '').length === 10;
  const isEligibleZone = /(78\d{3})/.test(address);
  
  const calculateAge = (date: string) => {
    if (!date) return 0;
    const today = new Date();
    const birth = new Date(date);
    let age = today.getFullYear() - birth.getFullYear();
    const m = today.getMonth() - birth.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--;
    return age;
  };
  const isAdult = calculateAge(birthDate) >= 18;

  const passwordStrength = () => {
    if (password.length === 0) return 0;
    if (password.length < 6) return 1;
    if (password.length < 10) return 2;
    return 3;
  };

  // API ADRESSE
  useEffect(() => {
    if (address.length > 5 && !isEligibleZone) {
      const fetchAddress = async () => {
        try {
          const res = await fetch(`https://api-adresse.data.gouv.fr/search/?q=${encodeURIComponent(address)}&limit=5`);
          const data = await res.json();
          setSuggestions(data.features);
        } catch (err) { console.error(err); }
      };
      const timer = setTimeout(fetchAddress, 300);
      return () => clearTimeout(timer);
    } else { setSuggestions([]); }
  }, [address, isEligibleZone]);

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAdult) { setError("Vous devez être majeur."); return; }
    if (!isEligibleZone) { setError("Livraison uniquement dans le 78."); return; }
    if (!isPhoneValid) { setError("Téléphone invalide."); return; }

    setLoading(true);
    setError(null);

    const cleanReferral = referralCodeInput.trim().toUpperCase();

    try {
      if (cleanReferral) {
        const { data: refData } = await supabase
          .from('profiles')
          .select('user_id')
          .eq('referral_code', cleanReferral)
          .maybeSingle();
        if (!refData) {
          setError("Code de parrainage invalide.");
          setLoading(false);
          return;
        }
      }

      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            first_name: firstName,
            last_name: lastName,
            full_name: `${firstName} ${lastName}`,
            birth_date: birthDate,
            phone: phone,
            address: address,
            referral_code_used: cleanReferral || null,
            referral_processed: false,
          },
        },
      });
      if (error) throw error;

      triggerConfetti();
      setTimeout(() => {
        router.push('/login?message=check-email');
      }, 2000);

    } catch (err: any) {
      setError(err.message || "Erreur lors de l'inscription");
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#FDFCF9] flex flex-col md:flex-row-reverse">
      
      {/* SECTION VISUELLE */}
      <div className="hidden md:flex md:w-1/2 bg-slate-900 relative overflow-hidden items-center justify-center p-12">
        <div className="absolute top-[-20%] left-[-10%] w-[500px] h-[500px] bg-[#FF4500] rounded-full blur-[150px] opacity-10" />
        <div className="relative z-10 max-w-lg space-y-8 text-center md:text-left">
          <h2 className="text-6xl font-black text-white leading-none tracking-tighter uppercase">Soleil  <br /><span className="text-[#FF4500]">& Saveurs.</span></h2>
          <div className="space-y-4">
            <div className="bg-white/5 p-6 rounded-3xl border border-white/10 backdrop-blur-sm flex gap-4 items-center">
              <Gift className="w-8 h-8 text-[#FF4500]" />
              <p className="text-slate-300 text-xs font-black uppercase tracking-widest">-10% sur votre 1ère commande</p>
            </div>
            <div className="bg-white/5 p-6 rounded-3xl border border-white/10 backdrop-blur-sm flex gap-4 items-center">
              <ShieldCheck className="w-8 h-8 text-green-400" />
              <p className="text-slate-300 text-xs font-black uppercase tracking-widest">Produits 100% locaux du 78</p>
            </div>
          </div>
        </div>
      </div>

      {/* SECTION FORMULAIRE */}
      <div className="flex-1 flex items-center justify-center p-6 md:p-12 overflow-y-auto">
        <div className="w-full max-w-[480px] py-12 space-y-8">
          <div className="text-center md:text-left">
            <Link href="/login" className="inline-flex items-center text-[10px] font-black text-slate-400 hover:text-[#FF4500] transition-colors mb-6 uppercase tracking-widest">
              <ChevronLeft className="w-4 h-4 mr-1" /> Retour
            </Link>
            <h2 className="text-4xl font-black text-slate-900 tracking-tighter uppercase">Créer un compte</h2>
          </div>

          <form onSubmit={handleSignup} className="space-y-4">
            {error && (
              <div className="p-4 bg-red-50 border border-red-100 rounded-2xl text-red-600 text-[10px] font-black uppercase flex items-center gap-3 animate-shake">
                <AlertCircle className="w-4 h-4" /> {error}
              </div>
            )}

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-400 uppercase ml-4">Nom</label>
                <input type="text" required placeholder="NOM" value={lastName} onChange={(e) => setLastName(e.target.value)}
                  className="w-full bg-white border border-slate-100 p-3 rounded-2xl font-bold text-sm uppercase outline-none focus:border-[#FF4500]" />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-400 uppercase ml-4">Prénom</label>
                <input type="text" required placeholder="PRÉNOM" value={firstName} onChange={(e) => setFirstName(e.target.value)}
                  className="w-full bg-white border border-slate-100 p-3 rounded-2xl font-bold text-sm uppercase outline-none focus:border-[#FF4500]" />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-400 uppercase ml-4 flex justify-between">
                  Naissance {birthDate && !isAdult && <span className="text-red-500">Majeur seul.</span>}
                </label>
                <div className="relative">
                  <Calendar className={`absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 ${birthDate && !isAdult ? 'text-red-500' : 'text-slate-300'}`} />
                  <input type="date" required value={birthDate} onChange={(e) => setBirthDate(e.target.value)}
                    className={`w-full bg-white border p-3 pl-10 rounded-2xl font-bold text-sm outline-none transition-all ${birthDate && !isAdult ? 'border-red-200 bg-red-50' : 'border-slate-100 focus:border-[#FF4500]'}`} />
                </div>
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-400 uppercase ml-4">Téléphone</label>
                <div className="relative">
                  <Phone className={`absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 ${phone && !isPhoneValid ? 'text-red-500' : 'text-slate-300'}`} />
                  <input type="tel" required placeholder="06XXXXXXXX" value={phone} onChange={(e) => setPhone(e.target.value)}
                    className="w-full bg-white border border-slate-100 p-3 pl-10 rounded-2xl font-bold text-sm outline-none focus:border-[#FF4500]" />
                </div>
              </div>
            </div>

            <div className="space-y-1 relative">
              <label className="text-[10px] font-black text-slate-400 uppercase ml-4">Adresse Complète (Yvelines 78)</label>
              <div className="relative">
                <MapPin className={`absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 ${address && !isEligibleZone ? 'text-red-500' : 'text-slate-300'}`} />
                <input type="text" required placeholder="Tapez votre adresse..." value={address} onChange={(e) => setAddress(e.target.value)}
                  className={`w-full bg-white border p-3 pl-10 rounded-2xl font-bold text-sm outline-none transition-all uppercase ${address && isEligibleZone ? 'border-green-200 bg-green-50' : 'border-slate-100 focus:border-[#FF4500]'}`} />
              </div>
              {suggestions.length > 0 && (
                <div className="absolute z-50 w-full bg-white border border-slate-100 rounded-2xl shadow-2xl mt-1 overflow-hidden">
                  {suggestions.map((s: any) => (
                    <button key={s.properties.id} type="button" onClick={() => { setAddress(s.properties.label); setSuggestions([]); }}
                      className="w-full p-3 text-left text-[10px] font-black hover:bg-slate-50 border-b border-slate-50 last:border-0 flex items-center gap-2 uppercase tracking-tight">
                      <MapPin className="w-3 h-3 text-[#FF4500]" /> {s.properties.label}
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-black text-slate-400 uppercase ml-4">Email</label>
              <div className="relative">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-300" />
                <input type="email" required placeholder="votre@email.com" value={email} onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-white border border-slate-100 p-3 pl-10 rounded-2xl font-bold text-sm outline-none focus:border-[#FF4500]" />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-black text-slate-400 uppercase ml-4">Mot de passe (8+ car.)</label>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-300" />
                <input type="password" required placeholder="••••••••" value={password} onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-white border border-slate-100 p-3 pl-10 rounded-2xl font-bold text-sm outline-none focus:border-[#FF4500]" />
              </div>
              <div className="flex gap-1 px-4 pt-1">
                <div className={`h-1 flex-1 rounded-full transition-all ${passwordStrength() >= 1 ? (passwordStrength() === 1 ? 'bg-red-400' : passwordStrength() === 2 ? 'bg-orange-400' : 'bg-green-400') : 'bg-slate-100'}`} />
                <div className={`h-1 flex-1 rounded-full transition-all ${passwordStrength() >= 2 ? (passwordStrength() === 2 ? 'bg-orange-400' : 'bg-green-400') : 'bg-slate-100'}`} />
                <div className={`h-1 flex-1 rounded-full transition-all ${passwordStrength() >= 3 ? 'bg-green-400' : 'bg-slate-100'}`} />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-black text-slate-400 uppercase ml-4">
                Code parrainage <span className="text-slate-300 normal-case font-bold">(optionnel)</span>
              </label>
              <div className="relative">
                <Gift className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-300" />
                <input
                  type="text"
                  placeholder="EX: ABC12345"
                  value={referralCodeInput}
                  onChange={(e) => setReferralCodeInput(e.target.value.toUpperCase())}
                  className="w-full bg-white border border-slate-100 p-3 pl-10 rounded-2xl font-bold text-sm uppercase outline-none focus:border-[#FF4500] tracking-widest"
                />
              </div>
              <p className="text-[9px] text-slate-400 font-bold ml-4">Vous et votre parrain obtiendrez -10% sur votre prochaine commande</p>
            </div>

            <button type="submit"
              disabled={loading || !isEligibleZone || !isPhoneValid || !isAdult || password.length < 8}
              className="w-full bg-[#FF4500] text-white p-5 rounded-3xl font-black uppercase text-sm tracking-widest hover:bg-slate-900 transition-all shadow-xl disabled:bg-slate-200 mt-4 flex items-center justify-center gap-3 active:scale-95"
            >
              {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <>Rejoindre Soleil Saveurs <ArrowRight className="w-5 h-5" /></>}
            </button>
          </form>

          <p className="text-center text-slate-400 text-[10px] font-black uppercase tracking-tighter pt-4">
            Déjà membre ? <Link href="/login" className="text-[#FF4500] ml-2 hover:underline">Se connecter ici</Link>
          </p>
        </div>
      </div>
    </div>
  );
}