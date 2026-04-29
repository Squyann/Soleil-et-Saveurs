'use client';
import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import { Lock, ArrowRight, Loader2, CheckCircle2, Eye, EyeOff, ShieldCheck } from 'lucide-react';
import Link from 'next/link';

export default function ResetPasswordPage() {
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [ready, setReady] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY') {
        setReady(true);
      }
    });
    return () => subscription.unsubscribe();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (password.length < 8) {
      setError('Le mot de passe doit contenir au moins 8 caractères.');
      return;
    }
    if (password !== confirm) {
      setError('Les mots de passe ne correspondent pas.');
      return;
    }

    setLoading(true);
    const { error } = await supabase.auth.updateUser({ password });
    if (error) {
      setError(error.message);
      setLoading(false);
    } else {
      setSuccess(true);
      setTimeout(() => router.push('/login'), 3000);
    }
  };

  return (
    <div className="min-h-screen bg-[#FDFCF9] flex flex-col md:flex-row">

      {/* GAUCHE — visuel */}
      <div className="hidden md:flex md:w-1/2 bg-slate-900 relative overflow-hidden items-center justify-center p-12">
        <div className="absolute top-[-10%] right-[-10%] w-96 h-96 bg-[#FF4500] rounded-full blur-[120px] opacity-20" />
        <div className="absolute bottom-[-10%] left-[-10%] w-96 h-96 bg-orange-500 rounded-full blur-[120px] opacity-10" />
        <div className="relative z-10 max-w-lg">
          <Link href="/" className="inline-flex items-center text-slate-400 hover:text-white transition-colors mb-12 group text-sm font-bold">
            ← Retour à la boutique
          </Link>
          <h1 className="text-6xl font-black text-white leading-none tracking-tighter mb-8">
            NOUVEAU<br />
            <span className="text-[#FF4500]">MOT DE PASSE.</span>
          </h1>
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 bg-white/5 rounded-2xl flex items-center justify-center shrink-0 border border-white/10">
              <ShieldCheck className="w-6 h-6 text-[#FF4500]" />
            </div>
            <div>
              <h3 className="text-white font-bold uppercase tracking-wider text-sm">Compte sécurisé</h3>
              <p className="text-slate-400 text-sm leading-relaxed">Choisissez un mot de passe fort d'au moins 8 caractères.</p>
            </div>
          </div>
        </div>
      </div>

      {/* DROITE — formulaire */}
      <div className="flex-1 flex items-center justify-center p-6 md:p-12">
        <div className="w-full max-w-[400px] space-y-8">

          {success ? (
            <div className="text-center space-y-6">
              <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto">
                <CheckCircle2 className="w-10 h-10 text-green-500" />
              </div>
              <div>
                <h2 className="text-3xl font-black text-slate-900 tracking-tighter uppercase">Mot de passe mis à jour !</h2>
                <p className="text-slate-500 text-sm mt-2">Redirection vers la connexion dans quelques secondes…</p>
              </div>
              <Link href="/login" className="inline-flex items-center gap-2 text-[#FF4500] font-black text-sm uppercase hover:underline">
                Se connecter maintenant <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          ) : !ready ? (
            <div className="text-center space-y-4">
              <Loader2 className="w-10 h-10 animate-spin text-[#FF4500] mx-auto" />
              <p className="text-slate-500 text-sm font-bold">Vérification du lien en cours…</p>
              <p className="text-slate-400 text-xs">Si rien ne se passe, le lien est peut-être expiré.<br />
                <Link href="/login" className="text-[#FF4500] font-black hover:underline">Retourner à la connexion</Link>
              </p>
            </div>
          ) : (
            <>
              <div className="text-center md:text-left">
                <p className="text-[#FF4500] font-black text-[10px] tracking-[0.3em] uppercase mb-2">Sécurité</p>
                <h2 className="text-4xl font-black text-slate-900 tracking-tighter uppercase">Nouveau mot de passe</h2>
                <p className="text-slate-500 text-sm mt-2 font-medium">Choisissez un mot de passe sécurisé.</p>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                {error && (
                  <div className="p-4 bg-red-50 border border-red-100 rounded-2xl text-red-600 text-xs font-bold flex items-center gap-3">
                    <div className="w-2 h-2 bg-red-600 rounded-full animate-pulse shrink-0" />
                    {error}
                  </div>
                )}

                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase ml-4 tracking-widest">Nouveau mot de passe</label>
                  <div className="relative group">
                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-300 group-focus-within:text-[#FF4500] transition-colors" />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      required
                      placeholder="••••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full bg-white border border-slate-100 p-4 pl-12 pr-12 rounded-2xl font-bold text-sm focus:border-[#FF4500] focus:ring-4 focus:ring-[#FF4500]/5 outline-none transition-all shadow-sm"
                    />
                    <button type="button" onClick={() => setShowPassword(v => !v)} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-300 hover:text-slate-600 transition-colors">
                      {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                    </button>
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase ml-4 tracking-widest">Confirmer le mot de passe</label>
                  <div className="relative group">
                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-300 group-focus-within:text-[#FF4500] transition-colors" />
                    <input
                      type={showConfirm ? 'text' : 'password'}
                      required
                      placeholder="••••••••"
                      value={confirm}
                      onChange={(e) => setConfirm(e.target.value)}
                      className="w-full bg-white border border-slate-100 p-4 pl-12 pr-12 rounded-2xl font-bold text-sm focus:border-[#FF4500] focus:ring-4 focus:ring-[#FF4500]/5 outline-none transition-all shadow-sm"
                    />
                    <button type="button" onClick={() => setShowConfirm(v => !v)} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-300 hover:text-slate-600 transition-colors">
                      {showConfirm ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                    </button>
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
                      Enregistrer le mot de passe
                      <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                    </>
                  )}
                </button>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
