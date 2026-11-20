'use client';
// Cadre de l'application de gestion : session, rôle, connexion réseau,
// temps réel, enregistrements, mises à jour et barre de navigation.
//
// Règle d'or : aucune modification n'est présentée comme enregistrée tant que
// le serveur ne l'a pas confirmée. Toute écriture passe par executer() :
// refusée hors connexion, comptée « en cours » (pas de mise à jour de l'appli
// pendant ce temps), et en cas d'échec un message clair avec « Réessayer ».

import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import type { RealtimeChannel, Session } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';
import { peut as peutRole, roleEquipe, type Droit, type Role } from '@/lib/gestion/roles';
import { viderMemoire } from '@/lib/gestion/memoire';
import NavBas from './NavBas';
import Bandeaux, { type Message } from './Bandeaux';

export type TableSuivie = 'commandes' | 'commandes_journal' | 'products' | 'product_variants' | 'codes_promo';
export type EtatTempsReel = 'connexion' | 'direct' | 'coupe';
type Ecouteur = (table: TableSuivie, changement: { eventType: string; new: Record<string, unknown>; old: Record<string, unknown> }) => void;

export type Resultat<T> = { ok: true; donnees: T } | { ok: false; erreur: string };

type Contexte = {
  session: Session | null;
  role: Role | null;
  prenom: string;
  peut: (droit: Droit) => boolean;
  enLigne: boolean;
  tempsReel: EtatTempsReel;
  nouvelles: number;
  enCours: number;
  executer: <T>(libelle: string, action: () => Promise<T>, options?: { reussite?: string }) => Promise<Resultat<T>>;
  notifier: (m: Omit<Message, 'id'>) => void;
  ecouter: (tables: TableSuivie[], f: Ecouteur) => () => void;
  installation: { possible: boolean; installee: boolean; lancer: () => Promise<void> };
  miseAJour: { prete: boolean; version: string; appliquer: () => void };
  deconnecter: (partout?: boolean) => Promise<void>;
};

const Ctx = createContext<Contexte | null>(null);

export function useGestion() {
  const c = useContext(Ctx);
  if (!c) throw new Error('useGestion hors de <AppliGestion>');
  return c;
}

// Abonnement aux changements en direct d'une ou plusieurs tables
export function useChangements(tables: TableSuivie[], f: Ecouteur) {
  const { ecouter } = useGestion();
  const ref = useRef(f);
  useEffect(() => { ref.current = f; });
  const cle = tables.join(',');
  useEffect(() => ecouter(cle.split(',') as TableSuivie[], (t, c) => ref.current(t, c)), [cle, ecouter]);
}

const SANS_CADRE = ['/gestion/connexion', '/gestion/hors-ligne'];
const DELAI_SERVEUR = 15000;
const VERSION = process.env.NEXT_PUBLIC_VERSION_GESTION ?? 'dev';

class DelaiDepasse extends Error {}

function avecDelai<T>(p: Promise<T>): Promise<T> {
  return new Promise((ok, ko) => {
    const t = setTimeout(() => ko(new DelaiDepasse()), DELAI_SERVEUR);
    p.then((v) => { clearTimeout(t); ok(v); }, (e) => { clearTimeout(t); ko(e); });
  });
}

// Message d'erreur lisible (erreurs de la base en français, sinon générique)
export function messageErreur(e: unknown): string {
  const brut = e && typeof e === 'object' && 'message' in e ? String((e as { message: unknown }).message) : '';
  if (/Failed to fetch|NetworkError|Load failed/i.test(brut)) return 'Connexion perdue';
  if (/permission denied|Accès refusé|42501|row-level security/i.test(brut)) return 'Action non autorisée pour votre rôle';
  if (brut && /[éèàùç]|^[A-ZÉ][a-zé]/.test(brut) && brut.length < 160) return brut;
  return 'Erreur du serveur';
}

export default function AppliGestion({ children }: { children: React.ReactNode }) {
  const pathname = usePathname() || '/gestion';
  const router = useRouter();
  const avecCadre = !SANS_CADRE.includes(pathname);

  const [session, setSession] = useState<Session | null>(null);
  const [pret, setPret] = useState(false);
  const [enLigne, setEnLigne] = useState(true);
  const [tempsReel, setTempsReel] = useState<EtatTempsReel>('connexion');
  const [nouvelles, setNouvelles] = useState(0);
  const [enCours, setEnCours] = useState(0);
  const [messages, setMessages] = useState<Message[]>([]);
  const [attente, setAttente] = useState<ServiceWorker | null>(null);
  const [invite, setInvite] = useState<(Event & { prompt: () => Promise<void> }) | null>(null);
  const [installee, setInstallee] = useState(false);
  const ecouteurs = useRef(new Set<{ tables: TableSuivie[]; f: Ecouteur }>());
  const enCoursRef = useRef(0);

  const role = roleEquipe(session?.user?.app_metadata?.role);
  const prenom = String(session?.user?.user_metadata?.first_name ?? '').trim();

  // --- Messages (toasts) ---------------------------------------------------
  const notifier = useCallback((m: Omit<Message, 'id'>) => {
    const id = Date.now() + Math.random();
    setMessages((l) => [...l.slice(-2), { ...m, id }]);
    if (m.type !== 'erreur') setTimeout(() => setMessages((l) => l.filter((x) => x.id !== id)), 3500);
  }, []);
  const fermerMessage = useCallback((id: number) => setMessages((l) => l.filter((x) => x.id !== id)), []);

  // --- Session -------------------------------------------------------------
  useEffect(() => {
    let actif = true;
    supabase.auth.getSession().then(({ data }) => {
      if (!actif) return;
      setSession(data.session);
      setPret(true);
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((evenement, s) => {
      setSession(s);
      if (evenement === 'SIGNED_OUT') viderMemoire();
    });
    return () => { actif = false; subscription.unsubscribe(); };
  }, []);

  useEffect(() => {
    if (!pret || !avecCadre) return;
    if (!session || !role) router.replace('/gestion/connexion');
  }, [pret, avecCadre, session, role, router]);

  // --- Réseau --------------------------------------------------------------
  useEffect(() => {
    const maj = () => setEnLigne(navigator.onLine);
    maj();
    window.addEventListener('online', maj);
    window.addEventListener('offline', maj);
    return () => { window.removeEventListener('online', maj); window.removeEventListener('offline', maj); };
  }, []);

  // --- Temps réel ----------------------------------------------------------
  const ecouter = useCallback((tables: TableSuivie[], f: Ecouteur) => {
    const e = { tables, f };
    ecouteurs.current.add(e);
    return () => { ecouteurs.current.delete(e); };
  }, []);

  const diffuser = useCallback<Ecouteur>((table, c) => {
    ecouteurs.current.forEach((e) => { if (e.tables.includes(table)) e.f(table, c); });
  }, []);

  useEffect(() => {
    if (!session || !role || !avecCadre) return;
    let canal: RealtimeChannel | null = supabase.channel('gestion');
    const tables: TableSuivie[] = ['commandes', 'commandes_journal', 'products', 'product_variants', 'codes_promo'];
    for (const table of tables) {
      canal = canal.on('postgres_changes', { event: '*', schema: 'public', table }, (p) =>
        diffuser(table, { eventType: p.eventType, new: (p.new ?? {}) as Record<string, unknown>, old: (p.old ?? {}) as Record<string, unknown> }));
    }
    setTempsReel('connexion');
    canal.subscribe((etat) => {
      if (etat === 'SUBSCRIBED') {
        setTempsReel('direct');
        // Reconnexion : on recharge tout, des changements ont pu être manqués
        diffuser('commandes', { eventType: 'RESYNC', new: {}, old: {} });
        diffuser('products', { eventType: 'RESYNC', new: {}, old: {} });
      } else if (etat === 'CHANNEL_ERROR' || etat === 'TIMED_OUT' || etat === 'CLOSED') setTempsReel('coupe');
    });
    return () => { if (canal) supabase.removeChannel(canal); };
  }, [session?.user?.id, role, avecCadre, diffuser]); // eslint-disable-line react-hooks/exhaustive-deps

  // Retour au premier plan ou du réseau : on rafraîchit
  useEffect(() => {
    const rafraichir = () => {
      if (document.visibilityState !== 'visible') return;
      diffuser('commandes', { eventType: 'RESYNC', new: {}, old: {} });
      diffuser('products', { eventType: 'RESYNC', new: {}, old: {} });
    };
    document.addEventListener('visibilitychange', rafraichir);
    window.addEventListener('online', rafraichir);
    return () => { document.removeEventListener('visibilitychange', rafraichir); window.removeEventListener('online', rafraichir); };
  }, [diffuser]);

  // --- Pastille « nouvelles commandes » -------------------------------------
  const compterNouvelles = useCallback(async () => {
    const { count, error } = await supabase.from('commandes').select('id', { count: 'exact', head: true }).eq('statut', 'En attente');
    if (!error && typeof count === 'number') setNouvelles(count);
  }, []);
  useEffect(() => {
    if (!session || !role || !avecCadre) return;
    compterNouvelles();
    return ecouter(['commandes'], () => { compterNouvelles(); });
  }, [session?.user?.id, role, avecCadre, compterNouvelles, ecouter]); // eslint-disable-line react-hooks/exhaustive-deps

  // --- Enregistrements -----------------------------------------------------
  const changerEnCours = (d: number) => { enCoursRef.current += d; setEnCours(enCoursRef.current); };

  const executer = useCallback(async <T,>(libelle: string, action: () => Promise<T>, options?: { reussite?: string }): Promise<Resultat<T>> => {
    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      notifier({ type: 'erreur', texte: `Hors connexion : « ${libelle} » n'a pas été enregistré.` });
      return { ok: false, erreur: 'Hors connexion' };
    }
    changerEnCours(1);
    try {
      const donnees = await avecDelai(action());
      if (options?.reussite) notifier({ type: 'ok', texte: options.reussite });
      return { ok: true, donnees };
    } catch (e) {
      if (e instanceof DelaiDepasse) {
        // L'écriture a peut-être abouti : on recharge pour montrer l'état réel
        notifier({ type: 'erreur', texte: `Pas de réponse du serveur pour « ${libelle} ». L'écran a été rechargé : vérifiez avant de recommencer.` });
        diffuser('commandes', { eventType: 'RESYNC', new: {}, old: {} });
        diffuser('products', { eventType: 'RESYNC', new: {}, old: {} });
        return { ok: false, erreur: 'Pas de réponse' };
      }
      const erreur = messageErreur(e);
      notifier({ type: 'erreur', texte: `« ${libelle} » n'a pas pu être enregistré (${erreur.toLowerCase()}). Rien n'a changé.`, action: { libelle: 'Réessayer', faire: () => { void executer(libelle, action, options); } } });
      return { ok: false, erreur };
    } finally {
      changerEnCours(-1);
    }
  }, [notifier, diffuser]);

  // Quitter l'appli pendant un enregistrement : demande de confirmation
  useEffect(() => {
    const avant = (e: BeforeUnloadEvent) => { if (enCoursRef.current > 0) e.preventDefault(); };
    window.addEventListener('beforeunload', avant);
    return () => window.removeEventListener('beforeunload', avant);
  }, []);

  // --- Service worker : installation et mises à jour sûres -----------------
  useEffect(() => {
    if (!('serviceWorker' in navigator)) return;
    let enregistrement: ServiceWorkerRegistration | null = null;
    let recharge = false;
    const surveiller = (sw: ServiceWorker | null) => {
      if (!sw) return;
      const verifier = () => { if (sw.state === 'installed' && navigator.serviceWorker.controller) setAttente(sw); };
      verifier();
      sw.addEventListener('statechange', verifier);
    };
    navigator.serviceWorker.register('/gestion/sw.js', { scope: '/gestion', updateViaCache: 'none' }).then((r) => {
      enregistrement = r;
      if (r.waiting && navigator.serviceWorker.controller) setAttente(r.waiting);
      surveiller(r.installing);
      r.addEventListener('updatefound', () => surveiller(r.installing));
    }).catch(() => {});
    const chercher = () => { if (document.visibilityState === 'visible') enregistrement?.update().catch(() => {}); };
    document.addEventListener('visibilitychange', chercher);
    const minuterie = setInterval(chercher, 30 * 60 * 1000);
    const changement = () => { if (!recharge) { recharge = true; window.location.reload(); } };
    navigator.serviceWorker.addEventListener('controllerchange', changement);
    // Appui sur une notification alors que l'appli est ouverte
    const message = (e: MessageEvent) => { if (e.data?.type === 'OUVRIR' && typeof e.data.url === 'string') router.push(e.data.url); };
    navigator.serviceWorker.addEventListener('message', message);
    return () => {
      document.removeEventListener('visibilitychange', chercher);
      clearInterval(minuterie);
      navigator.serviceWorker.removeEventListener('controllerchange', changement);
      navigator.serviceWorker.removeEventListener('message', message);
    };
  }, [router]);

  const appliquerMiseAJour = useCallback(() => {
    if (enCoursRef.current > 0 || !attente) return;
    attente.postMessage({ type: 'ACTIVER' });
  }, [attente]);

  useEffect(() => {
    const avant = (e: Event) => { e.preventDefault(); setInvite(e as Event & { prompt: () => Promise<void> }); };
    const installe = () => { setInstallee(true); setInvite(null); };
    window.addEventListener('beforeinstallprompt', avant);
    window.addEventListener('appinstalled', installe);
    setInstallee(window.matchMedia('(display-mode: standalone)').matches || (navigator as Navigator & { standalone?: boolean }).standalone === true);
    return () => { window.removeEventListener('beforeinstallprompt', avant); window.removeEventListener('appinstalled', installe); };
  }, []);

  const deconnecter = useCallback(async (partout = false) => {
    await supabase.auth.signOut({ scope: partout ? 'global' : 'local' });
    viderMemoire();
    router.replace('/gestion/connexion');
  }, [router]);

  const valeur = useMemo<Contexte>(() => ({
    session, role, prenom,
    peut: (d) => peutRole(role, d),
    enLigne, tempsReel, nouvelles, enCours,
    executer, notifier, ecouter,
    installation: { possible: !!invite, installee, lancer: async () => { if (invite) { await invite.prompt(); setInvite(null); } } },
    miseAJour: { prete: !!attente, version: VERSION, appliquer: appliquerMiseAJour },
    deconnecter,
  }), [session, role, prenom, enLigne, tempsReel, nouvelles, enCours, executer, notifier, ecouter, invite, installee, attente, appliquerMiseAJour, deconnecter]);

  if (!avecCadre) return <Ctx.Provider value={valeur}>{children}</Ctx.Provider>;

  return (
    <Ctx.Provider value={valeur}>
      <div className="min-h-[100dvh] bg-lin text-olivier">
        <Bandeaux
          enLigne={enLigne}
          tempsReel={tempsReel}
          miseAJour={!!attente}
          enCours={enCours}
          appliquer={appliquerMiseAJour}
          messages={messages}
          fermer={fermerMessage}
        />
        {pret && session && role ? (
          <main className="mx-auto max-w-xl px-4 pt-4 pb-[calc(96px+env(safe-area-inset-bottom))]">{children}</main>
        ) : (
          <div className="flex min-h-[70dvh] items-center justify-center" aria-busy="true">
            <span className="h-8 w-8 animate-spin rounded-full border-[3px] border-olivier/20 border-t-olivier" />
          </div>
        )}
        {pret && session && role && <NavBas />}
      </div>
    </Ctx.Provider>
  );
}
