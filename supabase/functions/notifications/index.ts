// Fonction serveur « notifications » (Supabase Edge Functions).
//
// Envoie les notifications de l'application de gestion aux téléphones de
// l'équipe. Elle seule détient la clé secrète d'envoi (VAPID) : créée au
// premier appel, gardée dans la table push_cles, jamais transmise.
//
// Appels (jeton de session de l'appelant dans Authorization) :
//  GET  ?action=cle                 clé publique, pour abonner un téléphone
//  POST { action: 'commande', id }  nouvelle commande (client qui vient de
//                                   commander, ou équipe) + stock bas
//  POST { action: 'annulation', id } commande annulée par un membre de
//                                   l'équipe : les autres sont prévenus
//  POST { action: 'test' }          notification d'essai sur ses appareils
//
// Une seule notification par événement (table notifications_envoyees),
// réglages de chacun respectés, heures calmes de 22 h à 7 h (sauf nouvelle
// commande à livrer aujourd'hui ou demain). Abonnements expirés supprimés.

import { createClient } from 'npm:@supabase/supabase-js@2.100.0';
import { creerClesVapid, envoyer, type CleVapid } from './webpush.ts';

const SUJET = 'mailto:commandes@soleiletsaveurs.fr';
const ROLES = ['admin', 'gerant', 'preparateur'];
const SEUIL_STOCK_BAS = 5;

const admin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const CORS = {
  'Access-Control-Allow-Origin': 'https://soleiletsaveurs.fr',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
};
const json = (corps: unknown, statut = 200) =>
  new Response(JSON.stringify(corps), { status: statut, headers: { ...CORS, 'Content-Type': 'application/json' } });

let vapid: CleVapid | null = null;
async function clesVapid(): Promise<CleVapid> {
  if (vapid) return vapid;
  const { data } = await admin.from('push_cles').select('publique, privee').eq('id', 1).maybeSingle();
  if (data) return (vapid = { publique: data.publique, privee: data.privee });
  const neuves = await creerClesVapid();
  // Si deux appels créent une clé en même temps, la première enregistrée gagne
  await admin.from('push_cles').insert({ id: 1, publique: neuves.publique, privee: neuves.privee });
  const { data: finale } = await admin.from('push_cles').select('publique, privee').eq('id', 1).single();
  return (vapid = { publique: finale!.publique, privee: finale!.privee });
}

type Evenement = 'nouvelle_commande' | 'annulation' | 'stock_bas' | 'test';
type Message = { titre: string; texte: string; url: string; cle: string };

const heureParis = () => Number(new Intl.DateTimeFormat('fr-FR', { timeZone: 'Europe/Paris', hour: '2-digit', hourCycle: 'h23' }).format(new Date()));
const jourParis = (decalage = 0) => new Intl.DateTimeFormat('fr-CA', { timeZone: 'Europe/Paris' }).format(new Date(Date.now() + decalage * 86400000));

// Une seule fois par événement : renvoie false si déjà notifié
async function premiereFois(cle: string) {
  const { error } = await admin.from('notifications_envoyees').insert({ cle: cle.slice(0, 120) });
  return !error;
}

async function destinataires(evenement: Evenement, options: { seulement?: string; sauf?: string; urgent?: boolean } = {}) {
  let q = admin.from('abonnements_push').select('id, user_id, endpoint, p256dh, auth');
  if (options.seulement) q = q.eq('user_id', options.seulement);
  const { data: abonnements } = await q;
  if (!abonnements?.length) return [];
  const ids = [...new Set(abonnements.map((a) => a.user_id))];
  const { data: prefs } = await admin.from('preferences_gestion').select('*').in('user_id', ids);
  const reglages = new Map((prefs ?? []).map((p) => [p.user_id, p]));
  const roles = new Map<string, string | undefined>();
  for (const id of ids) {
    const { data } = await admin.auth.admin.getUserById(id);
    roles.set(id, data.user?.app_metadata?.role);
  }
  const calme = heureParis() >= 22 || heureParis() < 7;
  return abonnements.filter((a) => {
    const role = roles.get(a.user_id);
    if (!role || !ROLES.includes(role)) return false;
    if (options.sauf && a.user_id === options.sauf) return false;
    if (evenement === 'test') return true;
    const p = reglages.get(a.user_id) ?? {};
    if (evenement === 'nouvelle_commande' && p.nouvelle_commande === false) return false;
    if (evenement === 'annulation' && p.annulation === false) return false;
    if (evenement === 'stock_bas' && (p.stock_bas === false || !['admin', 'gerant'].includes(role))) return false;
    if (calme && p.heures_calmes !== false && !options.urgent) return false;
    return true;
  });
}

async function diffuser(evenement: Evenement, m: Message, options: { seulement?: string; sauf?: string; urgent?: boolean } = {}) {
  const cles = await clesVapid();
  const liste = await destinataires(evenement, options);
  let envoyes = 0;
  await Promise.all(liste.map(async (a) => {
    try {
      const r = await envoyer(a, m, cles, SUJET, { urgence: evenement === 'stock_bas' ? 'normal' : 'high', sujetNotif: m.cle });
      if (r.ok) envoyes++;
      if (r.expire) await admin.from('abonnements_push').delete().eq('id', a.id);
      else if (r.ok) await admin.from('abonnements_push').update({ vu_le: new Date().toISOString() }).eq('id', a.id);
    } catch (e) {
      console.error('[notifications] envoi', e);
    }
  }));
  return { destinataires: liste.length, envoyes };
}

const prix = (n: unknown) => `${(Number(n) || 0).toFixed(2).replace('.', ',')} €`;
const jourCourt = (d: string | null) => (d ? new Date(`${d}T12:00:00`).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', timeZone: 'Europe/Paris' }) : '');

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS });
  try {
    const url = new URL(req.url);
    if (req.method === 'GET' && url.searchParams.get('action') === 'cle') {
      return json({ cle: (await clesVapid()).publique });
    }
    if (req.method !== 'POST') return json({ error: 'Méthode non prise en charge' }, 405);

    const jeton = (req.headers.get('authorization') ?? '').replace(/^Bearer\s+/i, '');
    const { data: u } = await admin.auth.getUser(jeton);
    const user = u.user;
    if (!user) return json({ error: 'Non connecté' }, 401);
    const role = user.app_metadata?.role as string | undefined;
    const equipe = !!role && ROLES.includes(role);
    const corps = await req.json().catch(() => ({}));

    if (corps.action === 'test') {
      if (!equipe) return json({ error: 'Non autorisé' }, 403);
      const r = await diffuser('test', { titre: 'Notifications activées', texte: 'Vous recevrez ici les nouvelles commandes.', url: '/gestion/plus', cle: `test-${Date.now()}` }, { seulement: user.id, urgent: true });
      return json({ ok: true, ...r });
    }

    const id = Number(corps.id);
    if (!Number.isInteger(id) || id <= 0) return json({ error: 'Demande invalide' }, 400);
    const { data: c } = await admin.from('commandes')
      .select('id, user_id, nom_client, total, date_livraison, created_at, statut, contenu_panier, adresse_livraison')
      .eq('id', id).maybeSingle();
    if (!c) return json({ error: 'Commande introuvable' }, 404);

    if (corps.action === 'commande') {
      // Le client qui vient de commander (30 min) ou un membre de l'équipe
      const recente = Date.now() - new Date(c.created_at).getTime() < 30 * 60 * 1000;
      if (!equipe && !(c.user_id === user.id && recente)) return json({ error: 'Non autorisé' }, 403);
      const resultats: Record<string, unknown> = {};
      if (await premiereFois(`commande-${id}`)) {
        const ville = (c.adresse_livraison ?? '').match(/\b\d{5}\s+([^,]+)/)?.[1]?.trim();
        const proche = !!c.date_livraison && c.date_livraison <= jourParis(1);
        resultats.commande = await diffuser('nouvelle_commande', {
          titre: `Nouvelle commande n° ${id}`,
          texte: [c.nom_client, prix(c.total), c.date_livraison ? `livraison ${jourCourt(c.date_livraison)}` : null, ville].filter(Boolean).join(' · '),
          url: `/gestion/commandes/${id}`,
          cle: `commande-${id}`,
        }, { urgent: proche });
      }
      // Stock bas après cette commande (une alerte par produit et par jour)
      const produits = [...new Set((Array.isArray(c.contenu_panier) ? c.contenu_panier : []).map((l: { id?: string }) => l.id).filter(Boolean))] as string[];
      if (produits.length) {
        const { data: bas } = await admin.from('products').select('id, name, stock, unite').in('id', produits).eq('actif', true).lte('stock', SEUIL_STOCK_BAS);
        for (const p of bas ?? []) {
          if (await premiereFois(`stock-${p.id}-${jourParis()}`)) {
            await diffuser('stock_bas', { titre: `Stock bas : ${p.name}`, texte: p.stock > 0 ? `Plus que ${p.stock} ${p.unite ?? ''} en stock.`.replace(/\s+\./, '.') : 'Rupture de stock.', url: `/gestion/produits/${p.id}`, cle: `stock-${p.id}` });
          }
        }
      }
      return json({ ok: true, ...resultats });
    }

    if (corps.action === 'annulation') {
      if (!equipe) return json({ error: 'Non autorisé' }, 403);
      if (!String(c.statut ?? '').toLowerCase().startsWith('annul')) return json({ error: 'Commande non annulée' }, 409);
      if (!(await premiereFois(`annulation-${id}`))) return json({ ok: true, deja: true });
      const r = await diffuser('annulation', { titre: `Commande n° ${id} annulée`, texte: [c.nom_client, prix(c.total), 'stock remis automatiquement'].filter(Boolean).join(' · '), url: `/gestion/commandes/${id}`, cle: `annulation-${id}` }, { sauf: user.id });
      return json({ ok: true, ...r });
    }

    return json({ error: 'Action inconnue' }, 400);
  } catch (e) {
    console.error('[notifications]', e);
    return json({ error: 'Erreur du serveur' }, 500);
  }
});
