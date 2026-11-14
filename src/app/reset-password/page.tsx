'use client';
import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import { Lock, ArrowRight, Loader2, Check, Eye, EyeOff, ShieldCheck, AlertCircle } from 'lucide-react';
import Link from 'next/link';
import GabaritConnexion, { etiquetteChamp, champAvecIcone, iconeChamp, boutonPrincipal, messageErreur } from '@/components/GabaritConnexion';

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

  const champMotDePasse = (id: string, libelle: string, valeur: string, changer: (v: string) => void, visible: boolean, basculer: () => void) => (
    <div>
      <label htmlFor={id} className={etiquetteChamp}>{libelle}</label>
      <div className="relative">
        <Lock className={iconeChamp} aria-hidden />
        <input
          id={id}
          type={visible ? 'text' : 'password'}
          required
          autoComplete="new-password"
          placeholder="••••••••"
          value={valeur}
          onChange={(e) => changer(e.target.value)}
          className={`${champAvecIcone} pr-14`}
        />
        <button type="button" onClick={basculer} aria-label={visible ? 'Masquer le mot de passe' : 'Afficher le mot de passe'} className="absolute right-1.5 top-1/2 -translate-y-1/2 w-11 h-11 rounded-xl flex items-center justify-center text-[#6F5A4B] hover:text-[#3D2B1F] transition-colors">
          {visible ? <EyeOff className="w-[19px] h-[19px]" aria-hidden /> : <Eye className="w-[19px] h-[19px]" aria-hidden />}
        </button>
      </div>
    </div>
  );

  return (
    <GabaritConnexion
      surtitre="Sécurité"
      titre="Nouveau mot de passe"
      sousTitre={success || !ready ? undefined : 'Choisissez un mot de passe sécurisé.'}
      accroche={<>Nouveau<br /><em className="text-[#FF7A47]">mot de passe.</em></>}
      arguments={[
        { icone: <ShieldCheck className="w-[22px] h-[22px]" />, titre: 'Compte sécurisé', texte: "Choisissez un mot de passe fort d'au moins 8 caractères." },
      ]}
    >
      {success ? (
        <div className="flex flex-col items-center text-center gap-5 py-4">
          <span className="ss-pop w-20 h-20 rounded-full bg-[#166534] text-white flex items-center justify-center"><Check className="w-10 h-10" strokeWidth={3} aria-hidden /></span>
          <div>
            <h2 className="titre text-3xl leading-tight">Mot de passe mis à jour !</h2>
            <p className="mt-2 text-[15px] text-[#5C4030]">Redirection vers la connexion dans quelques secondes…</p>
          </div>
          <Link href="/login" className={boutonPrincipal}>
            Se connecter maintenant <ArrowRight className="w-[22px] h-[22px]" strokeWidth={2.4} aria-hidden />
          </Link>
        </div>
      ) : !ready ? (
        <div className="flex flex-col items-center text-center gap-4 py-8">
          <Loader2 className="w-10 h-10 animate-spin text-[#FF4500]" aria-hidden />
          <p role="status" className="text-base font-bold">Vérification du lien en cours…</p>
          <p className="text-sm leading-relaxed text-[#5C4030]">
            Si rien ne se passe, le lien a peut-être expiré.<br />
            <Link href="/login" className="font-extrabold text-[#C73600] underline underline-offset-4">Retourner à la connexion</Link>
          </p>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="flex flex-col gap-4 lg:gap-[18px]">
          {error && (
            <p role="alert" className={messageErreur}>
              <AlertCircle className="w-[18px] h-[18px] shrink-0" aria-hidden />{error}
            </p>
          )}
          {champMotDePasse('nouveau-mdp', 'Nouveau mot de passe', password, setPassword, showPassword, () => setShowPassword(v => !v))}
          {champMotDePasse('confirmer-mdp', 'Confirmer le mot de passe', confirm, setConfirm, showConfirm, () => setShowConfirm(v => !v))}
          <button type="submit" disabled={loading} className={`${boutonPrincipal} mt-1 lg:mt-1.5`}>
            {loading ? (
              <Loader2 className="w-6 h-6 animate-spin mx-auto" aria-label="Enregistrement" />
            ) : (
              <>
                Enregistrer le mot de passe
                <ArrowRight className="w-[22px] h-[22px]" strokeWidth={2.4} aria-hidden />
              </>
            )}
          </button>
        </form>
      )}
    </GabaritConnexion>
  );
}
