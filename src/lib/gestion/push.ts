// Notifications sur le téléphone : abonnement de l'appareil, réglages, essai.
// L'envoi est fait par la fonction serveur Supabase « notifications ».

import { supabase } from '@/lib/supabase';
import { reponse } from './memoire';

export type Preferences = {
  nouvelle_commande: boolean;
  annulation: boolean;
  stock_bas: boolean;
  non_confirmee: boolean;
  resume_soir: boolean;
  heures_calmes: boolean;
  verrouillage: boolean;
};
export const PREFERENCES_DEFAUT: Preferences = { nouvelle_commande: true, annulation: true, stock_bas: true, non_confirmee: true, resume_soir: false, heures_calmes: true, verrouillage: false };

export type Appareil = { id: string; endpoint: string; appareil: string | null; cree_le: string; vu_le: string };

const FONCTION = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/notifications`;

export function pushPossible() {
  return typeof window !== 'undefined' && 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;
}

export function estIos() {
  return typeof navigator !== 'undefined' && (/iphone|ipad|ipod/i.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1));
}

export function nomAppareil() {
  const ua = navigator.userAgent;
  const systeme = /iphone/i.test(ua) ? 'iPhone' : /ipad/i.test(ua) ? 'iPad' : /android/i.test(ua) ? 'Android' : /mac/i.test(ua) ? 'Mac' : /windows/i.test(ua) ? 'PC Windows' : 'Appareil';
  const nav = /edg\//i.test(ua) ? 'Edge' : /firefox|fxios/i.test(ua) ? 'Firefox' : /samsungbrowser/i.test(ua) ? 'Samsung' : /chrome|crios/i.test(ua) ? 'Chrome' : /safari/i.test(ua) ? 'Safari' : '';
  return `${systeme}${nav ? ` · ${nav}` : ''}`.slice(0, 80);
}

function octets(b64: string) {
  const b = b64.replace(/-/g, '+').replace(/_/g, '/') + '='.repeat((4 - (b64.length % 4)) % 4);
  return Uint8Array.from(atob(b), (c) => c.charCodeAt(0));
}

async function enregistrementSw() {
  const r = await navigator.serviceWorker.getRegistration('/gestion');
  if (r) return r;
  return navigator.serviceWorker.register('/gestion/sw.js', { scope: '/gestion', updateViaCache: 'none' });
}

export async function abonnementActuel(): Promise<PushSubscription | null> {
  if (!pushPossible()) return null;
  const r = await navigator.serviceWorker.getRegistration('/gestion');
  return (await r?.pushManager.getSubscription()) ?? null;
}

async function clePublique() {
  const cle = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? '';
  const rep = await fetch(`${FONCTION}?action=cle`, { headers: { Authorization: `Bearer ${cle}`, apikey: cle } });
  if (!rep.ok) throw new Error('Service de notifications indisponible');
  return String((await rep.json()).cle);
}

// Demande l'autorisation, abonne l'appareil et l'enregistre (confirmé par la base)
export async function activerSurCetAppareil() {
  const permission = await Notification.requestPermission();
  if (permission !== 'granted') throw new Error(permission === 'denied' ? 'Notifications refusées dans les réglages du téléphone' : 'Autorisation non donnée');
  const reg = await enregistrementSw();
  await navigator.serviceWorker.ready;
  const cle = await clePublique();
  let ab = await reg.pushManager.getSubscription();
  // Abonnement fait avec une autre clé : on le refait
  const ancienne = ab?.options?.applicationServerKey;
  if (ab && ancienne && btoa(String.fromCharCode(...new Uint8Array(ancienne))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '') !== cle) {
    await ab.unsubscribe();
    ab = null;
  }
  try {
    ab ??= await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: octets(cle) });
  } catch {
    throw new Error('Le téléphone n’a pas pu s’abonner aux notifications : réessayez, ou vérifiez qu’elles sont autorisées pour ce site');
  }
  const j = ab.toJSON();
  await reponse(supabase.from('abonnements_push').upsert({
    endpoint: ab.endpoint, p256dh: j.keys?.p256dh ?? '', auth: j.keys?.auth ?? '', appareil: nomAppareil(), vu_le: new Date().toISOString(),
  }, { onConflict: 'endpoint' }).select());
}

export async function desactiverSurCetAppareil() {
  const ab = await abonnementActuel();
  if (!ab) return;
  await reponse(supabase.from('abonnements_push').delete().eq('endpoint', ab.endpoint).select());
  await ab.unsubscribe();
}

export const listerAppareils = () =>
  reponse(supabase.from('abonnements_push').select('id, endpoint, appareil, cree_le, vu_le').order('cree_le')) as Promise<Appareil[]>;

export const retirerAppareil = (id: string) => reponse(supabase.from('abonnements_push').delete().eq('id', id).select());

export async function lirePreferences(): Promise<Preferences> {
  const { data } = await supabase.from('preferences_gestion').select('nouvelle_commande, annulation, stock_bas, non_confirmee, resume_soir, heures_calmes, verrouillage').maybeSingle();
  return { ...PREFERENCES_DEFAUT, ...(data ?? {}) };
}

export const enregistrerPreferences = (p: Partial<Preferences>, userId: string) =>
  reponse(supabase.from('preferences_gestion').upsert({ user_id: userId, ...p, maj_le: new Date().toISOString() }, { onConflict: 'user_id' }).select()) as Promise<Preferences[]>;

export async function envoyerEssai() {
  const { data } = await supabase.auth.getSession();
  const cle = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? '';
  const rep = await fetch(FONCTION, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${data.session?.access_token ?? ''}`, apikey: cle },
    body: JSON.stringify({ action: 'test' }),
  });
  const corps = await rep.json().catch(() => ({}));
  if (!rep.ok) throw new Error(corps.error ?? `Erreur ${rep.status}`);
  return corps as { destinataires: number; envoyes: number };
}
