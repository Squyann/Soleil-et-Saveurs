// Outils serveur des campagnes : état de l'expéditeur (clé Brevo ou Resend,
// domaine SPF / DKIM / DMARC), expéditeur d'une campagne, produits à afficher.
import { promises as dns } from 'node:dns';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { produitMail, type Bloc, type ProduitMail } from './campagne';
import { adresseExpedition, fournisseur, NOM_FOURNISSEUR } from './envoi';

export interface EtatEnvoi {
  fournisseur: string | null;
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
  const from = adresseExpedition();
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
  const f = fournisseur();
  const cleApi = f !== null;
  const nom = f ? NOM_FOURNISSEUR[f] : 'Brevo';
  let spf = false, dkim = false, dmarc = false;
  if (domaine && !domaine.endsWith('resend.dev')) {
    // Brevo signe avec brevo1 / brevo2._domainkey (CNAME suivis par la requête TXT), Resend avec resend._domainkey
    const selecteurs = f === 'resend' ? ['resend'] : ['brevo1', 'brevo2', 'mail'];
    const [envoi, racine, politique, ...signatures] = await Promise.all([
      txt(`send.${domaine}`), txt(domaine), txt(`_dmarc.${domaine}`),
      ...selecteurs.map((sel) => txt(`${sel}._domainkey.${domaine}`)),
    ]);
    // Brevo n'exige plus d'inclure son SPF : il suffit que le domaine en publie un
    spf = [...envoi, ...racine].some((t) => /^v=spf1\b/i.test(t) && (f !== 'resend' || /amazonses\.com|resend/i.test(t)));
    dkim = signatures.flat().some((t) => /p=[A-Za-z0-9+/]{40,}/.test(t));
    dmarc = politique.some((t) => /^v=DMARC1\b/i.test(t));
  }
  const raison = !cleApi ? "La clé du prestataire d'envoi (Brevo) n'est pas configurée."
    : !domaine || domaine.endsWith('resend.dev') ? "L'adresse d'expédition n'est pas sur le domaine soleiletsaveurs.fr."
    : !spf || !dkim || !dmarc ? `Authentification du domaine incomplète chez ${nom} (${[!spf && 'SPF', !dkim && 'DKIM', !dmarc && 'DMARC'].filter(Boolean).join(', ')}).`
    : null;
  const etat: EtatEnvoi = {
    fournisseur: f ? NOM_FOURNISSEUR[f] : null,
    cle_api: cleApi,
    expediteur: domaine ? adresseExpedition() || null : null,
    domaine, spf, dkim, dmarc,
    envoi_auto: Boolean(process.env.MAIL_CRON_SECRET),
    webhook: Boolean((f === 'resend' ? process.env.RESEND_WEBHOOK_SECRET : process.env.BREVO_WEBHOOK_SECRET) && process.env.MAIL_CRON_SECRET),
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

