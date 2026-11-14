'use client';
import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import { Mail, Lock, ArrowRight, Loader2, Leaf, Truck, Banknote, Check, Eye, EyeOff, AlertCircle } from 'lucide-react';
import Link from 'next/link';
import GabaritConnexion, { etiquetteChamp, champAvecIcone, iconeChamp, boutonPrincipal, messageErreur } from '@/components/GabaritConnexion';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resetSent, setResetSent] = useState(false);
  const [resetLoading, setResetLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const router = useRouter();

  // Si l'utilisateur est déjà connecté, on ne lui montre pas la page de login
  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) router.replace('/');
    });
  }, [router]);

  const handleForgotPassword = async () => {
    if (!email) {
      setError('Entrez votre e-mail ci-dessus puis cliquez sur « Oublié ? ».');
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

      router.push('/');
      router.refresh();
    } catch (err: any) {
      setError(err.message || "Erreur lors de la connexion");
    } finally {
      setLoading(false);
    }
  };

  return (
    <GabaritConnexion
      surtitre="Espace client"
      titre="Connexion"
      sousTitre="Bon retour parmi nous !"
      accroche={<>Vos produits<br /><em className="text-[#FF7A47]">frais, livrés chez vous.</em></>}
      arguments={[
        { icone: <Leaf className="w-[22px] h-[22px]" />, titre: 'Qualité premium', texte: 'Sélection rigoureuse de fruits et légumes frais chaque matin.' },
        { icone: <Truck className="w-[22px] h-[22px]" />, titre: 'Livraison rapide', texte: 'Livré dans tout le 78, dès le lendemain, à la date de votre choix.' },
        { icone: <Banknote className="w-[22px] h-[22px]" />, titre: 'Paiement à la livraison', texte: 'En espèces ou par carte bancaire, directement au livreur.' },
      ]}
    >
      <form onSubmit={handleLogin} className="flex flex-col gap-4 lg:gap-[18px]">
        {error && (
          <p role="alert" className={messageErreur}>
            <AlertCircle className="w-[18px] h-[18px] shrink-0" aria-hidden />{error}
          </p>
        )}

        <div>
          <label htmlFor="connexion-email" className={etiquetteChamp}>E-mail</label>
          <div className="relative">
            <Mail className={iconeChamp} aria-hidden />
            <input
              id="connexion-email"
              type="email"
              required
              autoComplete="email"
              placeholder="exemple@mail.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className={champAvecIcone}
            />
          </div>
        </div>

        <div>
          <div className="flex items-center justify-between gap-3 mb-1.5">
            <label htmlFor="connexion-mdp" className={`${etiquetteChamp} !mb-0`}>Mot de passe</label>
            <button
              type="button"
              onClick={handleForgotPassword}
              disabled={resetLoading || resetSent}
              className="min-h-7 text-[13.5px] lg:text-sm font-bold text-[#C73600] hover:underline underline-offset-4 disabled:text-[#166534] disabled:no-underline"
            >
              {resetLoading ? 'Envoi…' : resetSent ? 'E-mail envoyé' : 'Oublié ?'}
            </button>
          </div>
          <div className="relative">
            <Lock className={iconeChamp} aria-hidden />
            <input
              id="connexion-mdp"
              type={showPassword ? 'text' : 'password'}
              required
              autoComplete="current-password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className={`${champAvecIcone} pr-14`}
            />
            <button type="button" onClick={() => setShowPassword(v => !v)} aria-label={showPassword ? 'Masquer le mot de passe' : 'Afficher le mot de passe'} className="absolute right-1.5 top-1/2 -translate-y-1/2 w-11 h-11 rounded-xl flex items-center justify-center text-[#6F5A4B] hover:text-[#3D2B1F] transition-colors">
              {showPassword ? <EyeOff className="w-[19px] h-[19px]" aria-hidden /> : <Eye className="w-[19px] h-[19px]" aria-hidden />}
            </button>
          </div>
        </div>

        <button type="submit" disabled={loading} className={`${boutonPrincipal} mt-1 lg:mt-1.5`}>
          {loading ? (
            <Loader2 className="w-6 h-6 animate-spin mx-auto" aria-label="Connexion en cours" />
          ) : (
            <>
              Accéder à mon compte
              <ArrowRight className="w-[22px] h-[22px]" strokeWidth={2.4} aria-hidden />
            </>
          )}
        </button>
      </form>

      <p className="mt-5 lg:mt-[26px] text-center text-[15px] font-semibold text-[#5C4030]">
        Pas encore de compte ?{' '}
        <Link href="/signup" className="font-extrabold text-[#C73600] underline underline-offset-4">Créer un profil</Link>
      </p>

      <p className="mt-6 lg:mt-[34px] pt-[18px] lg:pt-[22px] border-t border-[#E3D6C4] flex items-center justify-center gap-5 text-[12.5px] lg:text-[13px] font-bold text-[#6F5A4B]">
        <span className="inline-flex items-center gap-1.5"><Check className="w-4 h-4 text-[#15803D]" strokeWidth={2.4} aria-hidden />Conforme au RGPD</span>
        <span className="inline-flex items-center gap-1.5"><Check className="w-4 h-4 text-[#15803D]" strokeWidth={2.4} aria-hidden />Connexion sécurisée</span>
      </p>
    </GabaritConnexion>
  );
}
