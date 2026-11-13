// Envoi par Resend (clé et adresses lues dans les variables d'environnement
// du serveur, jamais dans le code).

export const REPONDRE_A = 'soleiletsaveurs.livraison@gmail.com';

export function expediteurParDefaut(): string {
  return process.env.RESEND_FROM_EMAIL || 'onboarding@resend.dev';
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

export async function envoyerEmail(e: Envoi, contexte: string): Promise<{ ok: boolean; id?: string }> {
  const cle = process.env.RESEND_API_KEY;
  if (!cle) {
    console.warn(`[${contexte}] RESEND_API_KEY non configuré — e-mail non envoyé`);
    return { ok: false };
  }
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${cle}`, 'Content-Type': 'application/json' },
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
    // Le détail reste dans les journaux du serveur (il cite l'expéditeur et le quota)
    console.error(`[${contexte}] Resend ${res.status}:`, await res.text());
    return { ok: false };
  }
  const data = await res.json().catch(() => ({}));
  return { ok: true, id: data?.id };
}
