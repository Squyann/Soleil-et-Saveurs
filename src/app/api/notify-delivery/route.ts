import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin, getSupabaseServerClient } from '@/lib/api-auth';
import { emailCommandeLivree, type CommandeEmail, type FactureEmail } from '@/lib/email/commande';
import { envoyerEmail } from '@/lib/email/envoi';

// E-mail « Commande livrée » : la commande et sa facture (émise par la base au
// passage en « livrée ») sont relues en base ; le navigateur n'envoie que le
// numéro de la commande.
export async function POST(req: NextRequest) {
  const { error: authError } = await requireAdmin();
  if (authError) return authError;

  try {
    const body = await req.json().catch(() => ({}));
    const commandeId = Number(body?.commande_id);
    if (!Number.isInteger(commandeId) || commandeId <= 0) {
      return NextResponse.json({ error: 'Payload invalide' }, { status: 400 });
    }

    const supabase = await getSupabaseServerClient();
    const { data: cmd } = await supabase
      .from('commandes')
      .select('id, nom_client, adresse_livraison, email_client, total, contenu_panier, date_livraison, statut')
      .eq('id', commandeId)
      .maybeSingle();
    if (!cmd) return NextResponse.json({ error: 'Commande introuvable' }, { status: 404 });
    if (!String(cmd.statut || '').toLowerCase().startsWith('livr')) {
      return NextResponse.json({ error: 'Commande non livrée' }, { status: 409 });
    }
    if (!cmd.email_client) {
      return NextResponse.json({ ok: true, skipped: true, reason: 'no email_client' });
    }
    if (!process.env.RESEND_API_KEY) {
      console.warn('[notify-delivery] RESEND_API_KEY non configuré');
      return NextResponse.json({ ok: true, skipped: true });
    }

    const { data: facture } = await supabase
      .from('factures')
      .select('numero, total_ttc, total_tva, date_reglement')
      .eq('commande_id', commandeId)
      .maybeSingle();

    const email = emailCommandeLivree(cmd as CommandeEmail, (facture as FactureEmail) ?? null);
    const resultat = await envoyerEmail({ to: cmd.email_client, subject: email.objet, html: email.html }, 'notify-delivery');
    return NextResponse.json({ ok: true, sent: resultat.ok });
  } catch (err) {
    console.error('[notify-delivery] Unexpected error:', err);
    return NextResponse.json({ error: 'Notification failed' }, { status: 500 });
  }
}
