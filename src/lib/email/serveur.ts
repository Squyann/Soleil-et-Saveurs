// Outils serveur des campagnes : état de l'expéditeur (clé Resend, domaine
// SPF / DKIM / DMARC), expéditeur d'une campagne, produits à afficher.
import { promises as dns } from 'node:dns';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { produitMail, type Bloc, type ProduitMail } from './campagne';

export interface EtatEnvoi {
  cle_api: boolean;
  expediteur: string | null;
  domaine: string | null;
  spf: boolean;
  dkim: boolean;
  dmarc: boolean;
  envoi_auto: boolean;
  webhook: boolean;
  pret: boolean;
  raison: string | null;
}

function domaineExpediteur(): string | null {
  const from = process.env.RESEND_FROM_EMAIL || '';
  const m = /@([a-z0-9.-]+\.[a-z]{2,})>?\s*$/i.exec(from);
  return m ? m[1].toLowerCase() : null;
}

async function txt(nom: string): Promise<string[]> {
  try {
    return (await dns.resolveTxt(nom)).map((morceaux) => morceaux.join(''));
  } catch {
    return [];
  }
}

let cache: { quand: number; etat: EtatEnvoi } | null = null;

export async function etatEnvoi(forcer = false): Promise<EtatEnvoi> {
  if (!forcer && cache && Date.now() - cache.quand < 10 * 60 * 1000) return cache.etat;
  const domaine = domaineExpediteur();
  const cleApi = Boolean(process.env.RESEND_API_KEY);
  let spf = false, dkim = false, dmarc = false;
  if (domaine && !domaine.endsWith('resend.dev')) {
    const [envoi, racine, signature, politique] = await Promise.all([
      txt(`send.${domaine}`), txt(domaine), txt(`resend._domainkey.${domaine}`), txt(`_dmarc.${domaine}`),
    ]);
    spf = [...envoi, ...racine].some((t) => /^v=spf1\b/i.test(t) && /amazonses\.com|resend/i.test(t));
    dkim = signature.some((t) => /p=[A-Za-z0-9+/]{40,}/.test(t));
    dmarc = politique.some((t) => /^v=DMARC1\b/i.test(t));
  }
  const raison = !cleApi ? "La clé du prestataire d'envoi (Resend) n'est pas configurée."
    : !domaine || domaine.endsWith('resend.dev') ? "L'adresse d'expédition n'est pas sur le domaine soleiletsaveurs.fr."
    : !spf || !dkim || !dmarc ? `Authentification du domaine incomplète (${[!spf && 'SPF', !dkim && 'DKIM', !dmarc && 'DMARC'].filter(Boolean).join(', ')}).`
    : null;
  const etat: EtatEnvoi = {
    cle_api: cleApi,
    expediteur: domaine ? process.env.RESEND_FROM_EMAIL || null : null,
    domaine, spf, dkim, dmarc,
    envoi_auto: Boolean(process.env.MAIL_CRON_SECRET),
    webhook: Boolean(process.env.RESEND_WEBHOOK_SECRET && process.env.MAIL_CRON_SECRET),
    pret: raison === null,
    raison,
  };
  cache = { quand: Date.now(), etat };
  return etat;
}

// « Soleil et Saveurs <bonjour@soleiletsaveurs.fr> » (nom et adresse nettoyés)
export function expediteurCampagne(nom: string, local: string): string | null {
  const domaine = domaineExpediteur();
  if (!domaine) return null;
  const n = String(nom || 'Soleil et Saveurs').replace(/[<>"\r\n]/g, '').trim().slice(0, 60) || 'Soleil et Saveurs';
  const l = /^[a-z0-9._-]{1,40}$/i.test(local) ? local.toLowerCase() : 'bonjour';
  return `${n} <${l}@${domaine}>`;
}

// Client Supabase sans session (tâche planifiée, webhook, désinscription)
export function clientAnonyme(): SupabaseClient {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

// Produits cités dans les blocs « Produits », avec leur prix du jour
export async function produitsDesBlocs(supabase: SupabaseClient, blocs: Bloc[]): Promise<ProduitMail[]> {
  const ids = [...new Set(blocs.flatMap((b) => (b.type === 'produits' ? b.ids : [])))].slice(0, 24);
  if (!ids.length) return [];
  const { data } = await supabase.from('products').select('id, name, price, promotion, unite, image_url, actif').in('id', ids);
  return (data || []).filter((p) => p.actif !== false).map((p) => produitMail(p));
}

