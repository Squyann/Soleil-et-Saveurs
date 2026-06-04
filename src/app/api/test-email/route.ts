import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/api-auth';

export async function GET() {
  const { error } = await requireAdmin();
  if (error) return error;

  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.RESEND_FROM_EMAIL || 'onboarding@resend.dev';
  const to = process.env.ADMIN_EMAIL;

  if (!apiKey) return NextResponse.json({ ok: false, error: 'RESEND_API_KEY manquant' });
  if (!to) return NextResponse.json({ ok: false, error: 'ADMIN_EMAIL manquant' });

  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      from,
      to,
      subject: '✅ Test email Soleil et Saveurs',
      html: `<p>Si tu reçois ce mail, Resend est correctement configuré.<br/>From: <strong>${from}</strong><br/>To: <strong>${to}</strong></p>`,
    }),
  });

  const body = await res.json().catch(() => ({}));

  return NextResponse.json({
    ok: res.ok,
    status: res.status,
    from,
    to,
    resend_response: body,
  });
}
