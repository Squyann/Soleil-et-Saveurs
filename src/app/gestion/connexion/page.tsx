'use client';
// Connexion à l'application de gestion : même compte que l'admin du site.
// Après 5 essais ratés, l'appareil attend 15 minutes (en plus des limites
// anti-abus de Supabase côté serveur).

import { useEffect, useState } from 'react';
import { Eye, EyeOff, Lock } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { roleEquipe } from '@/lib/gestion/roles';

const CLE = 'gestion-essais';
const MAX_ESSAIS = 5;
const ATTENTE_MS = 15 * 60 * 1000;

type Essais = { n: number; bloqueJusqua: number };

function lireEssais(): Essais {
  try {
    const v = JSON.parse(localStorage.getItem(CLE) || '{}');
    return { n: Number(v.n) || 0, bloqueJusqua: Number(v.bloqueJusqua) || 0 };
  } catch {
    return { n: 0, bloqueJusqua: 0 };
  }
}
function ecrireEssais(e: Essais) {
  try { localStorage.setItem(CLE, JSON.stringify(e)); } catch {}
}

export default function Connexion() {
  const [voir, setVoir] = useState(false);
  const [envoi, setEnvoi] = useState(false);
  const [erreur, setErreur] = useState('');
  const [bloque, setBloque] = useState(0);
  const [maintenant, setMaintenant] = useState(() => Date.now());

  // Déjà connecté avec un compte de l'équipe : directement à l'accueil
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (roleEquipe(data.session?.user?.app_metadata?.role)) window.location.replace('/gestion');
      setBloque(lireEssais().bloqueJusqua);
      setMaintenant(Date.now());
    });
  }, []);

  useEffect(() => {
    if (bloque <= Date.now()) return;
    const t = setInterval(() => setMaintenant(Date.now()), 1000);
    return () => clearInterval(t);
  }, [bloque]);

  const resteMs = Math.max(0, bloque - maintenant);
  const minutes = Math.ceil(resteMs / 60000);

  async function seConnecter(e: React.FormEvent) {
    e.preventDefault();
    if (resteMs > 0 || envoi) return;
    // Lecture directe du formulaire : fonctionne aussi avec le remplissage
    // automatique du téléphone (gestionnaire de mots de passe)
    const champs = new FormData(e.currentTarget as HTMLFormElement);
    const email = String(champs.get('email') ?? '').trim();
    const motDePasse = String(champs.get('mdp') ?? '');
    if (!email || !motDePasse) { setErreur('Saisissez votre e-mail et votre mot de passe.'); return; }
    if (!navigator.onLine) { setErreur('Pas de connexion internet.'); return; }
    setEnvoi(true);
    setErreur('');
    const { data, error } = await supabase.auth.signInWithPassword({ email, password: motDePasse });

    if (error || !data.user) {
      const essais = lireEssais();
      const n = essais.n + 1;
      if (n >= MAX_ESSAIS) {
        const fin = Date.now() + ATTENTE_MS;
        ecrireEssais({ n: 0, bloqueJusqua: fin });
        setBloque(fin);
        setMaintenant(Date.now());
        setErreur('Trop d’essais. Connexion bloquée 15 minutes sur cet appareil.');
      } else {
        ecrireEssais({ n, bloqueJusqua: 0 });
        const trop = error?.status === 429;
        setErreur(trop ? 'Trop de tentatives, réessayez dans quelques minutes.' : `E-mail ou mot de passe incorrect. ${MAX_ESSAIS - n} essai${MAX_ESSAIS - n > 1 ? 's' : ''} restant${MAX_ESSAIS - n > 1 ? 's' : ''}.`);
      }
      setEnvoi(false);
      return;
    }

    if (!roleEquipe(data.user.app_metadata?.role)) {
      await supabase.auth.signOut({ scope: 'local' });
      setErreur('Ce compte n’a pas accès à l’application de gestion.');
      setEnvoi(false);
      return;
    }

    ecrireEssais({ n: 0, bloqueJusqua: 0 });
    window.location.replace('/gestion');
  }

  return (
    <main className="flex min-h-[100dvh] items-center justify-center bg-lin px-5 py-10 text-olivier">
      <div className="w-full max-w-sm">
        <div className="flex flex-col items-center text-center">
          <img src="/icon-192.png" alt="" className="h-16 w-16 rounded-2xl shadow-sm" />
          <p className="mt-5 text-[12px] font-extrabold uppercase tracking-[0.14em] text-brique">Espace équipe</p>
          <h1 className="titre mt-1 text-[30px] leading-tight">Gestion Soleil et Saveurs</h1>
        </div>

        <form method="post" onSubmit={seConnecter} className="mt-8 rounded-3xl border border-[#E3D6C4] bg-white p-5" noValidate>
          <label htmlFor="email" className="block text-[13px] font-bold text-olivier-gris">E-mail</label>
          <input
            id="email"
            name="email"
            type="email"
            inputMode="email"
            autoComplete="username"
            required
            className="mt-1.5 w-full rounded-2xl border border-[#E3D6C4] bg-[#FBF6F0] px-4 py-3.5 text-[16px] outline-none focus:border-olivier focus:ring-2 focus:ring-olivier/20"
          />
          <label htmlFor="mdp" className="mt-4 block text-[13px] font-bold text-olivier-gris">Mot de passe</label>
          <div className="relative mt-1.5">
            <input
              id="mdp"
              name="mdp"
              type={voir ? 'text' : 'password'}
              autoComplete="current-password"
              required
              className="w-full rounded-2xl border border-[#E3D6C4] bg-[#FBF6F0] px-4 py-3.5 pr-14 text-[16px] outline-none focus:border-olivier focus:ring-2 focus:ring-olivier/20"
            />
            <button
              type="button"
              onClick={() => setVoir((v) => !v)}
              aria-label={voir ? 'Masquer le mot de passe' : 'Afficher le mot de passe'}
              className="absolute right-1 top-1/2 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-xl text-olivier-pale"
            >
              {voir ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
            </button>
          </div>

          {erreur && <p role="alert" className="mt-4 rounded-xl bg-[#F1E1DB] px-3 py-2.5 text-[13.5px] font-semibold text-[#8A3A1E]">{erreur}</p>}

          <button
            type="submit"
            disabled={envoi || resteMs > 0}
            className="mt-5 flex min-h-[52px] w-full items-center justify-center gap-2 rounded-2xl bg-olivier text-[15px] font-extrabold text-lin disabled:opacity-50"
          >
            <Lock className="h-4 w-4" aria-hidden="true" />
            {envoi ? 'Vérification…' : resteMs > 0 ? `Réessayez dans ${minutes} min` : 'Se connecter'}
          </button>
        </form>
        <p className="mt-5 text-center text-[12.5px] leading-relaxed text-olivier-gris">
          Même compte et même mot de passe que l’administration du site.
        </p>
      </div>
    </main>
  );
}
