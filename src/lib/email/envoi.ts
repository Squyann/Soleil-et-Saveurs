// Envoi des e-mails : Brevo si BREVO_API_KEY est configurée, sinon Resend
// (RESEND_API_KEY). Les clés et l'adresse d'expédition sont lues dans les
// variables d'environnement du serveur, jamais dans le code.

export const REPONDRE_A = 'soleiletsaveurs.livraison@gmail.com';

export type Fournisseur = 'brevo' | 'resend';

export function fournisseur(): Fournisseur | null {
  if (process.env.BREVO_API_KEY) return 'brevo';
  if (process.env.RESEND_API_KEY) return 'resend';
  return null;
}

export const NOM_FOURNISSEUR: Record<Fournisseur, string> = { brevo: 'Brevo', resend: 'Resend' };

// « Soleil et Saveurs <commandes@soleiletsaveurs.fr> » (EMAIL_EXPEDITEUR,
// ou l'ancienne variable RESEND_FROM_EMAIL)
export function adresseExpedition(): string {
  return process.env.EMAIL_EXPEDITEUR || process.env.RESEND_FROM_EMAIL || '';
}

export function expediteurParDefaut(): string {
  return adresseExpedition() || (fournisseur() === 'resend' ? 'onboarding@resend.dev' : '');
}

export interface Envoi {
  to: string;
  subject: string;
  html: string;
  from?: string;
  replyTo?: string;
  headers?: Record<string, string>;
  tags?: { name: string; value: string }[];
}

export interface Resultat {
  ok: boolean;
  id?: string;
  statut?: number;     // code HTTP du prestataire en cas d'échec
  reprendre?: boolean; // échec passager (quota, limite de débit, panne) : à retenter plus tard
}

// « Nom <adresse> » → { name, email } (format attendu par Brevo)
function decouperAdresse(texte: string): { name?: string; email: string } {
  const m = /^\s*"?([^"<]*?)"?\s*<([^>]+)>\s*$/.exec(texte);
  if (m) return { ...(m[1].trim() ? { name: m[1].trim() } : {}), email: m[2].trim() };
  return { email: texte.trim() };
}

const passager = (statut: number) => statut === 429 || statut === 402 || statut >= 500;

async function envoyerBrevo(e: Envoi, contexte: string): Promise<Resultat> {
  const expediteur = e.from || expediteurParDefaut();
  if (!expediteur) {
    console.warn(`[${contexte}] EMAIL_EXPEDITEUR non configuré — e-mail non envoyé`);
    return { ok: false };
  }
  const res = await fetch('https://api.brevo.com/v3/smtp/email', {
    method: 'POST',
    headers: { 'api-key': process.env.BREVO_API_KEY!, 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify({
      sender: decouperAdresse(expediteur),
      to: [{ email: e.to }],
      replyTo: { email: e.replyTo || REPONDRE_A },
      subject: e.subject,
      htmlContent: e.html,
      ...(e.headers ? { headers: e.headers } : {}),
      ...(e.tags?.length ? { tags: e.tags.map((t) => `${t.name}:${t.value}`.slice(0, 50)) } : {}),
    }),
  });
  if (!res.ok) {
    // Le détail reste dans les journaux du serveur (il cite l'expéditeur et le quota)
    console.error(`[${contexte}] Brevo ${res.status}:`, await res.text());
    return { ok: false, statut: res.status, reprendre: passager(res.status) };
  }
  const data = await res.json().catch(() => ({}));
  return { ok: true, id: data?.messageId };
}

async function envoyerResend(e: Envoi, contexte: string): Promise<Resultat> {
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      from: e.from || expediteurParDefaut(),
      to: e.to,
      subject: e.subject,
      html: e.html,
      reply_to: e.replyTo || REPONDRE_A,
      ...(e.headers ? { headers: e.headers } : {}),
      ...(e.tags ? { tags: e.tags } : {}),
    }),
  });
  if (!res.ok) {
    console.error(`[${contexte}] Resend ${res.status}:`, await res.text());
    return { ok: false, statut: res.status, reprendre: passager(res.status) };
  }
  const data = await res.json().catch(() => ({}));
  return { ok: true, id: data?.id };
}

export async function envoyerEmail(e: Envoi, contexte: string): Promise<Resultat> {
  const f = fournisseur();
  if (!f) {
    console.warn(`[${contexte}] Aucune clé d'envoi configurée (BREVO_API_KEY ou RESEND_API_KEY) — e-mail non envoyé`);
    return { ok: false };
  }
  try {
    return f === 'brevo' ? await envoyerBrevo(e, contexte) : await envoyerResend(e, contexte);
  } catch (err) {
    console.error(`[${contexte}] ${NOM_FOURNISSEUR[f]} injoignable :`, err);
    return { ok: false, reprendre: true };
  }
}

// Envoi d'un lot de campagne : un e-mail individuel par destinataire (aucune
// adresse visible des autres). Resend : un seul appel « batch ». Brevo : un
// appel par destinataire (en-têtes de désinscription propres à chacun),
// quelques-uns à la fois. Les résultats sont dans l'ordre des e-mails reçus.
export async function envoyerLot(emails: Envoi[], idempotence: string, contexte: string): Promise<Resultat[]> {
  const f = fournisseur();
  if (!f) return emails.map(() => ({ ok: false }));

  if (f === 'resend') {
    try {
      const res = await fetch('https://api.resend.com/emails/batch', {
        method: 'POST',
        headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}`, 'Content-Type': 'application/json', 'Idempotency-Key': idempotence },
        body: JSON.stringify(emails.map((e) => ({
          from: e.from || expediteurParDefaut(), to: [e.to], subject: e.subject, html: e.html,
          reply_to: e.replyTo || REPONDRE_A, ...(e.headers ? { headers: e.headers } : {}), ...(e.tags ? { tags: e.tags } : {}),
        }))),
      });
      if (!res.ok) {
        console.error(`[${contexte}] Resend ${res.status}:`, await res.text());
        return emails.map(() => ({ ok: false, statut: res.status, reprendre: passager(res.status) }));
      }
      const corps = await res.json().catch(() => ({}));
      const ids: { id: string }[] = corps?.data || [];
      return emails.map((_, i) => ({ ok: Boolean(ids[i]?.id), id: ids[i]?.id }));
    } catch (err) {
      console.error(`[${contexte}] Resend injoignable :`, err);
      return emails.map(() => ({ ok: false, reprendre: true }));
    }
  }

  // Brevo : 5 envois en parallèle ; dès qu'un échec passager survient (quota
  // du jour atteint, limite de débit), les e-mails suivants repartent dans la file.
  const resultats: Resultat[] = new Array(emails.length);
  const SIMULTANES = 5;
  let arret = false;
  for (let i = 0; i < emails.length; i += SIMULTANES) {
    const tranche = emails.slice(i, i + SIMULTANES);
    if (arret) {
      tranche.forEach((_, j) => { resultats[i + j] = { ok: false, reprendre: true }; });
      continue;
    }
    const obtenus = await Promise.all(tranche.map((e) => envoyerEmail(e, contexte)));
    obtenus.forEach((r, j) => { resultats[i + j] = r; });
    if (obtenus.some((r) => r.reprendre)) arret = true;
  }
  return resultats;
}
