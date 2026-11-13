import { createHmac, timingSafeEqual } from 'node:crypto';
import { NextRequest, NextResponse } from 'next/server';
import { clientAnonyme } from '@/lib/email/serveur';

// Événements envoyés par Resend (délivré, rebond, plainte). La signature
// (format Svix, secret RESEND_WEBHOOK_SECRET) est vérifiée avant tout
// traitement ; un message de plus de 5 minutes est refusé.

const EVENEMENTS = new Set(['email.delivered', 'email.bounced', 'email.complained']);

function signatureValide(secret: string, id: string, horodatage: string, corps: string, signatures: string): boolean {
  const cle = Buffer.from(secret.startsWith('whsec_') ? secret.slice(6) : secret, 'base64');
  const attendue = createHmac('sha256', cle).update(`${id}.${horodatage}.${corps}`).digest();
  return signatures.split(' ').some((s) => {
    const [version, valeur] = s.split(',');
    if (version !== 'v1' || !valeur) return false;
    const recue = Buffer.from(valeur, 'base64');
    return recue.length === attendue.length && timingSafeEqual(recue, attendue);
  });
}

export async function POST(req: NextRequest) {
  const secret = process.env.RESEND_WEBHOOK_SECRET;
  const cle = process.env.MAIL_CRON_SECRET;
  if (!secret || !cle) return NextResponse.json({ error: 'Webhook non configuré' }, { status: 503 });

  const corps = await req.text();
  const id = req.headers.get('svix-id') || '';
  const horodatage = req.headers.get('svix-timestamp') || '';
  const signatures = req.headers.get('svix-signature') || '';
  if (!id || !/^\d+$/.test(horodatage) || Math.abs(Date.now() / 1000 - Number(horodatage)) > 300
      || !signatureValide(secret, id, horodatage, corps, signatures)) {
    return NextResponse.json({ error: 'Signature invalide' }, { status: 401 });
  }

  let evenement: { type?: string; data?: { email_id?: string; to?: string[] | string } };
  try { evenement = JSON.parse(corps); } catch { return NextResponse.json({ error: 'Corps invalide' }, { status: 400 }); }
  if (!evenement.type || !EVENEMENTS.has(evenement.type)) return NextResponse.json({ ok: true, ignore: true });

  const destinataire = Array.isArray(evenement.data?.to) ? evenement.data?.to[0] : evenement.data?.to;
  const { error } = await clientAnonyme().rpc('mail_evenement', {
    p_cle: cle, p_type: evenement.type, p_resend_id: evenement.data?.email_id ?? null, p_email: destinataire ?? null,
  });
  if (error) {
    console.error('[mail/webhook] mail_evenement :', error.message);
    return NextResponse.json({ error: 'Enregistrement impossible' }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
