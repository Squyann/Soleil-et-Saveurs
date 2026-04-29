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
  ShieldCheck, 
  Leaf, 
  Truck,
  CheckCircle2
} from 'lucide-react';
import Link from 'next/link';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resetSent, setResetSent] = useState(false);
  const [resetLoading, setResetLoading] = useState(false);
  const router = useRouter();

  const handleForgotPassword = async () => {
    if (!email) {
      setError('Entrez votre email ci-dessus puis cliquez sur "Oublié ?".');
      return;
    }
    setResetLoading(true);
    setError(null);
    await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    setResetSent(true);
    setResetLoading(false);
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) throw error;

      const { data: { user } } = await supabase.auth.getUser();
      if (user?.email === process.env.NEXT_PUBLIC_ADMIN_EMAIL) {
        router.push('/admin');
      } else {
        router.push('/');
      }
      router.refresh();
    } catch (err: any) {
      setError(err.message || "Erreur lors de la connexion");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#FDFCF9] flex flex-col md:flex-row">
      
      {/* SECTION GAUCHE : VISUEL & ARGUMENTS (Caché sur mobile) */}
      <div className="hidden md:flex md:w-1/2 bg-slate-900 relative overflow-hidden items-center justify-center p-12">
        {/* Cercles décoratifs en arrière-plan */}
        <div className="absolute top-[-10%] right-[-10%] w-96 h-96 bg-[#FF4500] rounded-full blur-[120px] opacity-20" />
        <div className="absolute bottom-[-10%] left-[-10%] w-96 h-96 bg-orange-500 rounded-full blur-[120px] opacity-10" />
        
        <div className="relative z-10 max-w-lg">
          <Link href="/" className="inline-flex items-center text-slate-400 hover:text-white transition-colors mb-12 group">
            <ChevronLeft className="w-5 h-5 mr-2 group-hover:-translate-x-1 transition-transform" />
            Retour à la boutique
          </Link>
          
          <h1 className="text-6xl font-black text-white leading-none tracking-tighter mb-8">
            VOS PRODUITS <br />
            <span className="text-[#FF4500]">DIRECT PRODUCTEURS.</span>
          </h1>

          <div className="space-y-6">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 bg-white/5 rounded-2xl flex items-center justify-center shrink-0 border border-white/10">
                <Leaf className="w-6 h-6 text-green-400" />
              </div>
              <div>
                <h3 className="text-white font-bold uppercase tracking-wider text-sm">Qualité Premium</h3>
                <p className="text-slate-400 text-sm leading-relaxed">Sélection rigoureuse de fruits et légumes frais chaque matin.</p>
              </div>
            </div>

            <div className="flex items-start gap-4">
              <div className="w-12 h-12 bg-white/5 rounded-2xl flex items-center justify-center shrink-0 border border-white/10">
                <Truck className="w-6 h-6 text-blue-400" />
              </div>
              <div>
                <h3 className="text-white font-bold uppercase tracking-wider text-sm">Livraison Rapide</h3>
                <p className="text-slate-400 text-sm leading-relaxed">Livré chez vous dans tout le 78 en moins de 24h.</p>
              </div>
            </div>

            <div className="flex items-start gap-4">
              <div className="w-12 h-12 bg-white/5 rounded-2xl flex items-center justify-center shrink-0 border border-white/10">
                <ShieldCheck className="w-6 h-6 text-[#FF4500]" />
              </div>
              <div>
                <h3 className="text-white font-bold uppercase tracking-wider text-sm">Paiement Sécurisé</h3>
                <p className="text-slate-400 text-sm leading-relaxed">Transactions cryptées et option paiement à la livraison.</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* SECTION DROITE : FORMULAIRE */}
      <div className="flex-1 flex items-center justify-center p-6 md:p-12">
        <div className="w-full max-w-[400px] space-y-8">
          
          <div className="text-center md:text-left">
            <p className="text-[#FF4500] font-black text-[10px] tracking-[0.3em] uppercase mb-2">Espace Client</p>
            <h2 className="text-4xl font-black text-slate-900 tracking-tighter uppercase">Connexion</h2>
            <p className="text-slate-500 text-sm mt-2 font-medium">Bon retour parmi nous !</p>
          </div>

          <form onSubmit={handleLogin} className="space-y-4">
            {error && (
              <div className="p-4 bg-red-50 border border-red-100 rounded-2xl text-red-600 text-xs font-bold flex items-center gap-3 animate-shake">
                <div className="w-2 h-2 bg-red-600 rounded-full animate-pulse" />
                {error}
              </div>
            )}

            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-400 uppercase ml-4 tracking-widest">Email Professionnel</label>
              <div className="relative group">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-300 group-focus-within:text-[#FF4500] transition-colors" />
                <input 
                  type="email" 
                  required
                  placeholder="exemple@mail.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-white border border-slate-100 p-4 pl-12 rounded-2xl font-bold text-sm focus:border-[#FF4500] focus:ring-4 focus:ring-[#FF4500]/5 outline-none transition-all shadow-sm"
                />
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex justify-between items-center ml-4">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Mot de passe</label>
                <button
                  type="button"
                  onClick={handleForgotPassword}
                  disabled={resetLoading || resetSent}
                  className="text-[10px] font-black text-[#FF4500] uppercase hover:underline disabled:opacity-50"
                >
                  {resetLoading ? 'Envoi…' : resetSent ? 'Email envoyé ✓' : 'Oublié ?'}
                </button>
              </div>
              <div className="relative group">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-300 group-focus-within:text-[#FF4500] transition-colors" />
                <input 
                  type="password" 
                  required
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-white border border-slate-100 p-4 pl-12 rounded-2xl font-bold text-sm focus:border-[#FF4500] focus:ring-4 focus:ring-[#FF4500]/5 outline-none transition-all shadow-sm"
                />
              </div>
            </div>

            <button 
              type="submit" 
              disabled={loading}
              className="w-full bg-slate-900 text-white p-5 rounded-2xl font-black uppercase text-sm tracking-widest hover:bg-[#FF4500] transition-all shadow-xl shadow-slate-200 flex items-center justify-center gap-3 group disabled:bg-slate-200"
            >
              {loading ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <>
                  Accéder à mon compte
                  <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                </>
              )}
            </button>
          </form>

          <div className="pt-8 text-center">
            <p className="text-slate-400 text-xs font-bold uppercase tracking-tighter">
              Pas encore de compte ? 
              <Link href="/signup" className="text-[#FF4500] ml-2 hover:underline">Créer un profil</Link>
            </p>
          </div>

          <div className="flex items-center justify-center gap-8 pt-8 opacity-30 grayscale hover:grayscale-0 transition-all cursor-default">
             <div className="flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3" />
                <span className="text-[8px] font-black uppercase">RGPD Ready</span>
             </div>
             <div className="flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3" />
                <span className="text-[8px] font-black uppercase">SSL Secure</span>
             </div>
          </div>

        </div>
      </div>
    </div>
  );
}