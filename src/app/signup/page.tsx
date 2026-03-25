'use client';
import React, { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import { 
  Mail, 
  Lock, 
  ArrowRight, 
  Loader2, 
  ChevronLeft, 
  User,
  Sparkles,
  Gift,
  Clock,
  ShieldCheck,
  Calendar,
  Phone,
  MapPin
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
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
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
          },
        },
      });

      if (error) throw error;
      
      alert("Compte créé ! Vérifiez vos emails pour confirmer l'inscription.");
      router.push('/login');
    } catch (err: any) {
      setError(err.message || "Erreur lors de l'inscription");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#FDFCF9] flex flex-col md:flex-row-reverse">
      
      {/* SECTION ILLUSTRATION */}
      <div className="hidden md:flex md:w-1/2 bg-slate-900 relative overflow-hidden items-center justify-center p-12">
        <div className="absolute top-[-20%] left-[-10%] w-[500px] h-[500px] bg-[#FF4500] rounded-full blur-[150px] opacity-10" />
        
        <div className="relative z-10 max-w-lg">
          <h2 className="text-5xl font-black text-white leading-none tracking-tighter mb-12">
            REJOIGNEZ LA <br />
            <span className="text-[#FF4500]">COMMUNAUTÉ.</span>
          </h2>

          <div className="grid grid-cols-1 gap-8">
            <div className="bg-white/5 p-6 rounded-3xl border border-white/10 backdrop-blur-sm">
              <Gift className="w-8 h-8 text-[#FF4500] mb-4" />
              <h3 className="text-white font-bold uppercase text-xs tracking-widest mb-2">Offre de bienvenue</h3>
              <p className="text-slate-400 text-xs leading-relaxed">-10% sur votre première commande après inscription.</p>
            </div>
            <div className="bg-white/5 p-6 rounded-3xl border border-white/10 backdrop-blur-sm">
              <Clock className="w-8 h-8 text-blue-400 mb-4" />
              <h3 className="text-white font-bold uppercase text-xs tracking-widest mb-2">Historique Express</h3>
              <p className="text-slate-400 text-xs leading-relaxed">Retrouvez vos produits favoris et commandez en 2 clics.</p>
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
            <p className="text-slate-500 text-sm mt-2 font-medium">Commencez l'aventure Soleil Saveurs.</p>
          </div>

          <form onSubmit={handleSignup} className="space-y-4">
            {error && (
              <div className="p-4 bg-red-50 border border-red-100 rounded-2xl text-red-600 text-[10px] font-black uppercase flex items-center gap-3">
                <ShieldCheck className="w-4 h-4" />
                {error}
              </div>
            )}

            {/* NOM ET PRÉNOM SUR UNE LIGNE */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase ml-4 tracking-widest">Nom</label>
                <div className="relative group">
                  <User className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-300 group-focus-within:text-[#FF4500] transition-colors" />
                  <input type="text" required placeholder="NOM" value={lastName} onChange={(e) => setLastName(e.target.value)}
                    className="w-full bg-white border border-slate-100 p-3 pl-10 rounded-2xl font-bold text-sm focus:border-[#FF4500] outline-none transition-all shadow-sm uppercase" />
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase ml-4 tracking-widest">Prénom</label>
                <div className="relative group">
                  <User className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-300 group-focus-within:text-[#FF4500] transition-colors" />
                  <input type="text" required placeholder="PRÉNOM" value={firstName} onChange={(e) => setFirstName(e.target.value)}
                    className="w-full bg-white border border-slate-100 p-3 pl-10 rounded-2xl font-bold text-sm focus:border-[#FF4500] outline-none transition-all shadow-sm uppercase" />
                </div>
              </div>
            </div>

            {/* DATE DE NAISSANCE ET TÉLÉPHONE */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase ml-4 tracking-widest">Date de naissance</label>
                <div className="relative group">
                  <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-300 group-focus-within:text-[#FF4500] transition-colors" />
                  <input type="date" required value={birthDate} onChange={(e) => setBirthDate(e.target.value)}
                    className="w-full bg-white border border-slate-100 p-3 pl-10 rounded-2xl font-bold text-sm focus:border-[#FF4500] outline-none transition-all shadow-sm" />
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase ml-4 tracking-widest">Téléphone</label>
                <div className="relative group">
                  <Phone className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-300 group-focus-within:text-[#FF4500] transition-colors" />
                  <input type="tel" required placeholder="06 00 00 00 00" value={phone} onChange={(e) => setPhone(e.target.value)}
                    className="w-full bg-white border border-slate-100 p-3 pl-10 rounded-2xl font-bold text-sm focus:border-[#FF4500] outline-none transition-all shadow-sm" />
                </div>
              </div>
            </div>

            {/* ADRESSE */}
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-400 uppercase ml-4 tracking-widest">Adresse Complète (Yvelines 78)</label>
              <div className="relative group">
                <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-300 group-focus-within:text-[#FF4500] transition-colors" />
                <input type="text" required placeholder="Numéro, rue, ville et CP" value={address} onChange={(e) => setAddress(e.target.value)}
                  className="w-full bg-white border border-slate-100 p-3 pl-10 rounded-2xl font-bold text-sm focus:border-[#FF4500] outline-none transition-all shadow-sm uppercase" />
              </div>
            </div>

            {/* EMAIL */}
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-400 uppercase ml-4 tracking-widest">Email</label>
              <div className="relative group">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-300 group-focus-within:text-[#FF4500] transition-colors" />
                <input type="email" required placeholder="votre@email.com" value={email} onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-white border border-slate-100 p-3 pl-10 rounded-2xl font-bold text-sm focus:border-[#FF4500] outline-none transition-all shadow-sm" />
              </div>
            </div>

            {/* MOT DE PASSE */}
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-400 uppercase ml-4 tracking-widest">Mot de passe</label>
              <div className="relative group">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-300 group-focus-within:text-[#FF4500] transition-colors" />
                <input type="password" required placeholder="••••••••" value={password} onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-white border border-slate-100 p-3 pl-10 rounded-2xl font-bold text-sm focus:border-[#FF4500] outline-none transition-all shadow-sm" />
              </div>
              <div className="flex gap-1 px-4 pt-1">
                <div className={`h-1 flex-1 rounded-full ${password.length > 0 ? 'bg-red-400' : 'bg-slate-100'}`} />
                <div className={`h-1 flex-1 rounded-full ${password.length > 5 ? 'bg-orange-400' : 'bg-slate-100'}`} />
                <div className={`h-1 flex-1 rounded-full ${password.length > 8 ? 'bg-green-400' : 'bg-slate-100'}`} />
              </div>
            </div>

            <button type="submit" disabled={loading}
              className="w-full bg-[#FF4500] text-white p-5 rounded-2xl font-black uppercase text-sm tracking-widest hover:bg-slate-900 transition-all shadow-xl flex items-center justify-center gap-3 group disabled:bg-slate-200 mt-6"
            >
              {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <>Créer mon compte <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" /></>}
            </button>
          </form>

          <div className="pt-4 text-center">
            <p className="text-slate-400 text-xs font-bold uppercase tracking-tighter">
              Déjà membre ? <Link href="/login" className="text-[#FF4500] ml-2 hover:underline">Se connecter</Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}