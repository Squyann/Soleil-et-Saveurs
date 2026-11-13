import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, consommerQuota, getSupabaseServerClient } from '@/lib/api-auth';
import { emailCommandeRecue, emailNouvelleCommande, type CommandeEmail } from '@/lib/email/commande';
import { envoyerEmail } from '@/lib/email/envoi';

export async function POST(req: NextRequest) {
  const { user, error: authError } = await requireAuth();
  if (authError) return authError;

  // Limite anti-abus : chaque appel déclenche 2 envois Resend. Sans plafond, une
  // boucle épuise le quota d'envoi et abîme la réputation du domaine.
  if (!(await consommerQuota('notify-order', 10, 60))) {
    return NextResponse.json({ error: 'Trop de requêtes' }, { status: 429 });
  }

  try {
    // Le corps de la requête ne contient que le numéro de la commande : tout le
    // contenu de l'e-mail est relu dans la base (commande du client connecté,
    // passée il y a moins de 30 minutes). Un client ne peut donc pas faire
    // envoyer à la boutique une fausse « nouvelle commande » au contenu inventé.
    const body = await req.json().catch(() => ({}));
    const commandeId = Number(body?.commande_id);
    if (!Number.isInteger(commandeId) || commandeId <= 0) {
      return NextResponse.json({ error: 'Payload invalide' }, { status: 400 });
    }
    const supabase = await getSupabaseServerClient();
    const { data: cmd } = await supabase
      .from('commandes')
      .select('id, user_id, nom_client, telephone_client, adresse_livraison, total, contenu_panier, date_livraison, code_promo, remise_code_pct, frais_livraison, distance_km, commentaire_client, created_at')
      .eq('id', commandeId)
      .eq('user_id', user!.id)
      .maybeSingle();
    if (!cmd || Date.now() - new Date(cmd.created_at).getTime() > 30 * 60 * 1000) {
      return NextResponse.json({ error: 'Commande introuvable' }, { status: 404 });
    }

    if (!process.env.RESEND_API_KEY) {
      console.warn('[notify-order] RESEND_API_KEY non configuré — emails non envoyés');
      return NextResponse.json({ ok: true, skipped: true });
    }

    const commande = cmd as CommandeEmail;
    // L'adresse du client vient toujours du compte authentifié
    const emailClient = user!.email ?? '';

    const boutique = emailNouvelleCommande(commande, emailClient);
    const adminResult = await envoyerEmail({ to: process.env.ADMIN_EMAIL!, subject: boutique.objet, html: boutique.html, replyTo: emailClient || undefined }, 'notify-order');

    let clientResult = { ok: true };
    if (emailClient) {
      const client = emailCommandeRecue(commande);
      clientResult = await envoyerEmail({ to: emailClient, subject: client.objet, html: client.html }, 'notify-order');
    }

    // On ne renvoie jamais le corps d'erreur de Resend au client : il divulgue
    // l'email admin, le domaine expéditeur et l'état du quota. Détails en logs.
    return NextResponse.json({
      ok: true,
      admin_email: { sent: adminResult.ok },
      client_email: { sent: clientResult.ok },
    });
  } catch (err) {
    console.error('[notify-order] Unexpected error:', err);
    return NextResponse.json({ error: 'Notification failed' }, { status: 500 });
  }
}
