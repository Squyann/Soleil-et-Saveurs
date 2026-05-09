import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/api-auth';

function getSiteUrl() {
  if (process.env.NEXT_PUBLIC_SITE_URL) return process.env.NEXT_PUBLIC_SITE_URL;
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`;
  return 'http://localhost:3000';
}

export async function POST(req: NextRequest) {
  const { error } = await requireAdmin();
  if (error) return error;

  try {
    const { commande } = await req.json();

    if (!commande.email_client) {
      return NextResponse.json({ ok: true, skipped: true, reason: 'no email_client' });
    }

    if (!process.env.RESEND_API_KEY) {
      console.warn('[notify-delivery] RESEND_API_KEY non configuré');
      return NextResponse.json({ ok: true, skipped: true });
    }

    const compteUrl = `${getSiteUrl()}/compte`;

    const html = `<!DOCTYPE html>
<html lang="fr">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f5f4f0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <div style="max-width:600px;margin:32px auto;background:white;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);">

    <div style="background:#16a34a;padding:28px 32px;text-align:center;">
      <p style="color:rgba(255,255,255,0.8);margin:0 0 4px;font-size:12px;font-weight:700;letter-spacing:3px;text-transform:uppercase;">Soleil et Saveurs</p>
      <h1 style="color:white;margin:0;font-size:24px;font-weight:900;">🎉 Commande livrée !</h1>
    </div>

    <div style="padding:32px;">
      <p style="font-size:15px;font-weight:700;color:#1e293b;margin:0 0 8px;">Bonjour ${commande.nom},</p>
      <p style="font-size:14px;color:#64748b;margin:0 0 28px;line-height:1.6;">
        Votre commande vient d'être livrée à l'adresse suivante :<br/>
        <strong style="color:#1e293b;">${commande.adresse}</strong>
      </p>

      <div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:12px;padding:20px;margin-bottom:28px;text-align:center;">
        <p style="margin:0;font-size:32px;">🌿</p>
        <p style="margin:8px 0 0;font-size:14px;font-weight:800;color:#15803d;text-transform:uppercase;letter-spacing:1px;">Merci pour votre confiance !</p>
        <p style="margin:6px 0 0;font-size:13px;color:#166534;">Vos produits frais ont été cultivés et livrés avec passion.</p>
      </div>

      <p style="font-size:13px;color:#64748b;margin:0 0 8px;">Montant total : <strong style="color:#1e293b;">${Number(commande.total).toFixed(2)}€</strong></p>

      <div style="margin-top:28px;text-align:center;">
        <a href="${compteUrl}" style="display:inline-block;background:#1e293b;color:white;padding:16px 32px;border-radius:10px;text-decoration:none;font-weight:800;font-size:14px;letter-spacing:1px;text-transform:uppercase;">
          Commander à nouveau →
        </a>
      </div>
    </div>

    <div style="padding:16px 32px;background:#f9f8f6;text-align:center;">
      <p style="margin:0;font-size:11px;color:#94a3b8;">Soleil et Saveurs · Livraison dans le 78 · <a href="mailto:soleiletsaveurs.livraison@gmail.com" style="color:#FF4500;">soleiletsaveurs.livraison@gmail.com</a></p>
    </div>
  </div>
</body>
</html>`;

    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: process.env.RESEND_FROM_EMAIL || 'onboarding@resend.dev',
        to: commande.email_client,
        subject: `🎉 Votre commande Soleil et Saveurs a été livrée !`,
        html,
      }),
    });

    if (!res.ok) {
      const detail = await res.text();
      console.error('[notify-delivery] Resend error:', detail);
      return NextResponse.json({ error: detail }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('[notify-delivery] Unexpected error:', err);
    return NextResponse.json({ error: 'Notification failed' }, { status: 500 });
  }
}
