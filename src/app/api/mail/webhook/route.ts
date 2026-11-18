import { createHmac, timingSafeEqual } from 'node:crypto';
import { NextRequest, NextResponse } from 'next/server';
import { clientAnonyme } from '@/lib/email/serveur';

// Événements du prestataire d'envoi (délivré, rebond, plainte), enregistrés
// sur l'envoi correspondant (mail_evenement).
//
// - Brevo : webhook « transactionnel » configuré avec l'adresse
//   https://soleiletsaveurs.fr/api/mail/webhook?cle=<BREVO_WEBHOOK_SECRET>
//   (ou un en-tête « Authorization: Bearer <BREVO_WEBHOOK_SECRET> »).
//   Brevo ne signe pas ses webhooks : le secret est comparé à temps constant.
// - Resend : signature au format Svix (secret RESEND_WEBHOOK_SECRET),
//   message de plus de 5 minutes refusé.

const EVENEMENTS_RESEND = new Set(['email.delivered', 'email.bounced', 'email.complained']);
const EVENEMENTS_BREVO: Record<string, string> = {
  delivered: 'email.delivered',
  hard_bounce: 'email.bounced',
  hardBounce: 'email.bounced',
  invalid_email: 'email.bounced',
  spam: 'email.complained',
  complaint: 'email.complained',
};

function egal(a: string, b: string): boolean {
  const x = Buffer.from(a);
  const y = Buffer.from(b);
  return x.length === y.length && timingSafeEqual(x, y);
}

function signatureResendValide(secret: string, id: string, horodatage: string, corps: string, signatures: string): boolean {
  const cle = Buffer.from(secret.startsWith('whsec_') ? secret.slice(6) : secret, 'base64');
  const attendue = createHmac('sha256', cle).update(`${id}.${horodatage}.${corps}`).digest();
  return signatures.split(' ').some((s) => {
    const [version, valeur] = s.split(',');
    if (version !== 'v1' || !valeur) return false;
    const recue = Buffer.from(valeur, 'base64');
    return recue.length === attendue.length && timingSafeEqual(recue, attendue);
  });
}

async function enregistrer(cle: string, type: string, idMessage: string | null, email: string | null) {
  const { error } = await clientAnonyme().rpc('mail_evenement', {
    p_cle: cle, p_type: type, p_resend_id: idMessage, p_email: email,
  });
  if (error) console.error('[mail/webhook] mail_evenement :', error.message);
  return !error;
}

export async function POST(req: NextRequest) {
  const cle = process.env.MAIL_CRON_SECRET;
  const corps = await req.text();

  // Resend (en-têtes Svix)
  if (req.headers.get('svix-id')) {
    const secret = process.env.RESEND_WEBHOOK_SECRET;
    if (!secret || !cle) return NextResponse.json({ error: 'Webhook non configuré' }, { status: 503 });
    const id = req.headers.get('svix-id') || '';
    const horodatage = req.headers.get('svix-timestamp') || '';
    const signatures = req.headers.get('svix-signature') || '';
    if (!/^\d+$/.test(horodatage) || Math.abs(Date.now() / 1000 - Number(horodatage)) > 300
        || !signatureResendValide(secret, id, horodatage, corps, signatures)) {
      return NextResponse.json({ error: 'Signature invalide' }, { status: 401 });
    }
    let evenement: { type?: string; data?: { email_id?: string; to?: string[] | string } };
    try { evenement = JSON.parse(corps); } catch { return NextResponse.json({ error: 'Corps invalide' }, { status: 400 }); }
    if (!evenement.type || !EVENEMENTS_RESEND.has(evenement.type)) return NextResponse.json({ ok: true, ignore: true });
    const destinataire = Array.isArray(evenement.data?.to) ? evenement.data?.to[0] : evenement.data?.to;
    const ok = await enregistrer(cle, evenement.type, evenement.data?.email_id ?? null, destinataire ?? null);
    return ok ? NextResponse.json({ ok: true }) : NextResponse.json({ error: 'Enregistrement impossible' }, { status: 500 });
  }

  // Brevo (secret dans l'adresse ou en-tête Bearer)
  const secret = process.env.BREVO_WEBHOOK_SECRET;
  if (!secret || secret.length < 24 || !cle) return NextResponse.json({ error: 'Webhook non configuré' }, { status: 503 });
  const recu = req.nextUrl.searchParams.get('cle') || (req.headers.get('authorization') || '').replace(/^Bearer\s+/i, '');
  if (!recu || !egal(recu, secret)) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });

  let donnees: unknown;
  try { donnees = JSON.parse(corps); } catch { return NextResponse.json({ error: 'Corps invalide' }, { status: 400 }); }
  // Brevo peut regrouper les événements (tableau) ou les envoyer un par un
  const evenements = (Array.isArray(donnees) ? donnees : [donnees]).slice(0, 500) as Record<string, unknown>[];
  let enregistres = 0;
  for (const e of evenements) {
    const type = EVENEMENTS_BREVO[String(e?.event ?? '')];
    if (!type) continue;
    const idMessage = typeof e['message-id'] === 'string' ? e['message-id'] : null;
    const email = typeof e.email === 'string' ? e.email : null;
    if (!(await enregistrer(cle, type, idMessage, email))) {
      return NextResponse.json({ error: 'Enregistrement impossible' }, { status: 500 });
    }
    enregistres++;
  }
  return NextResponse.json({ ok: true, enregistres });
}
