import { NextRequest, NextResponse } from 'next/server';

const ADMIN_EMAIL = 'clement.sigwald041005@gmail.com';

function getSiteUrl() {
  if (process.env.NEXT_PUBLIC_SITE_URL) return process.env.NEXT_PUBLIC_SITE_URL;
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`;
  return 'http://localhost:3000';
}

export async function POST(req: NextRequest) {
  try {
    const { commande } = await req.json();
    const adminUrl = `${getSiteUrl()}/admin`;

    const lignesHTML = (commande.panier || []).map((item: any) => `
      <tr>
        <td style="padding:10px 12px;border-bottom:1px solid #f0f0f0;">
          ${item.quantite}${item.unite === 'kg' ? ' kg' : 'x'} ${item.name}
        </td>
        <td style="padding:10px 12px;border-bottom:1px solid #f0f0f0;text-align:right;font-weight:bold;">
          ${Number(item.prix_ligne).toFixed(2)}€
        </td>
      </tr>`).join('');

    const remiseHTML = commande.remise_pct > 0
      ? `<tr>
          <td style="padding:8px 12px;color:#16a34a;font-weight:bold;">Remise -${commande.remise_pct}%</td>
          <td style="padding:8px 12px;text-align:right;color:#16a34a;font-weight:bold;">-${Number(commande.remise_montant).toFixed(2)}€</td>
        </tr>`
      : '';

    const livraisonLabel = Number(commande.frais_livraison) === 0 ? 'Gratuit' : `${Number(commande.frais_livraison).toFixed(2)}€`;

    const emailHtml = `<!DOCTYPE html>
<html lang="fr">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f5f4f0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <div style="max-width:600px;margin:32px auto;background:white;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);">

    <div style="background:#FF4500;padding:28px 32px;text-align:center;">
      <p style="color:rgba(255,255,255,0.8);margin:0 0 4px;font-size:12px;font-weight:700;letter-spacing:3px;text-transform:uppercase;">Soleil et Saveurs</p>
      <h1 style="color:white;margin:0;font-size:24px;font-weight:900;">🛒 Nouvelle commande !</h1>
    </div>

    <div style="padding:32px;">
      <h2 style="margin:0 0 16px;font-size:13px;font-weight:800;text-transform:uppercase;letter-spacing:2px;color:#94a3b8;">Informations client</h2>
      <table style="width:100%;border-collapse:collapse;background:#f9f8f6;border-radius:12px;overflow:hidden;">
        <tr>
          <td style="padding:10px 16px;color:#64748b;font-size:13px;font-weight:600;width:110px;">Client</td>
          <td style="padding:10px 16px;font-weight:800;font-size:14px;">${commande.nom}</td>
        </tr>
        <tr style="background:white;">
          <td style="padding:10px 16px;color:#64748b;font-size:13px;font-weight:600;">Téléphone</td>
          <td style="padding:10px 16px;font-size:14px;">${commande.telephone}</td>
        </tr>
        <tr>
          <td style="padding:10px 16px;color:#64748b;font-size:13px;font-weight:600;">Adresse</td>
          <td style="padding:10px 16px;font-size:14px;">${commande.adresse}</td>
        </tr>
        <tr style="background:white;">
          <td style="padding:10px 16px;color:#64748b;font-size:13px;font-weight:600;">Paiement</td>
          <td style="padding:10px 16px;font-size:14px;">${commande.methode_paiement}</td>
        </tr>
      </table>

      <h2 style="margin:28px 0 16px;font-size:13px;font-weight:800;text-transform:uppercase;letter-spacing:2px;color:#94a3b8;">Détail de la commande</h2>
      <table style="width:100%;border-collapse:collapse;border:1px solid #f0f0f0;border-radius:12px;overflow:hidden;">
        ${lignesHTML}
        ${remiseHTML}
        <tr>
          <td style="padding:10px 12px;color:#64748b;font-size:13px;">Livraison</td>
          <td style="padding:10px 12px;text-align:right;font-size:13px;color:#64748b;">${livraisonLabel}</td>
        </tr>
        <tr style="background:#FF4500;">
          <td style="padding:14px 16px;color:white;font-weight:900;font-size:16px;text-transform:uppercase;letter-spacing:1px;">Total</td>
          <td style="padding:14px 16px;color:white;font-weight:900;font-size:20px;text-align:right;">${Number(commande.total).toFixed(2)}€</td>
        </tr>
      </table>

      <div style="margin-top:32px;text-align:center;">
        <a href="${adminUrl}"
           style="display:inline-block;background:#1e293b;color:white;padding:16px 32px;border-radius:10px;text-decoration:none;font-weight:800;font-size:14px;letter-spacing:1px;text-transform:uppercase;">
          Accéder à la page admin →
        </a>
      </div>
    </div>

    <div style="padding:16px 32px;background:#f9f8f6;text-align:center;">
      <p style="margin:0;font-size:11px;color:#94a3b8;">Soleil et Saveurs · Livraison dans le 78</p>
    </div>
  </div>
</body>
</html>`;

    if (!process.env.RESEND_API_KEY) {
      console.warn('[notify-order] RESEND_API_KEY non configuré — email non envoyé');
      return NextResponse.json({ ok: true, skipped: true });
    }

    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: process.env.RESEND_FROM_EMAIL || 'onboarding@resend.dev',
        to: ADMIN_EMAIL,
        subject: `🛒 Commande de ${commande.nom} — ${Number(commande.total).toFixed(2)}€`,
        html: emailHtml,
      }),
    });

    if (!res.ok) {
      const detail = await res.text();
      console.error('[notify-order] Resend error:', detail);
      return NextResponse.json({ error: detail }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('[notify-order] Unexpected error:', err);
    return NextResponse.json({ error: 'Notification failed' }, { status: 500 });
  }
}
