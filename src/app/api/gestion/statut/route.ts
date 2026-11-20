// Changement de statut d'une commande depuis l'application de gestion.
//
// 1. La base vérifie le rôle, le statut attendu (pas de modification croisée)
//    et le changement autorisé, puis applique l'annulation (stock, points,
//    code promo) dans la même transaction.
// 2. Si la base le demande (livrée ou annulée), le client est prévenu par
//    e-mail ici même, côté serveur : l'e-mail part même si le téléphone est
//    fermé juste après l'appui.

import { NextResponse, type NextRequest } from 'next/server';
import type { SupabaseClient } from '@supabase/supabase-js';
import { equipe } from '@/lib/gestion/serveur';
import { statutNormalise } from '@/lib/gestion/statuts';
import { emailCommandeAnnulee, emailCommandeLivree, type CommandeEmail, type FactureEmail } from '@/lib/email/commande';
import { envoyerEmail, fournisseur } from '@/lib/email/envoi';
import { notifierEquipe } from '@/lib/gestion/notifier';

type ReponseRpc = { ok: boolean; conflit?: boolean; inchange?: boolean; statut: string; updated_at: string; prevenir_client?: boolean };

export async function POST(req: NextRequest) {
  const e = await equipe(req);
  if (e instanceof NextResponse) return e;

  const corps = await req.json().catch(() => null);
  const id = Number(corps?.id);
  const attendu = typeof corps?.attendu === 'string' ? corps.attendu.slice(0, 40) : '';
  const nouveau = typeof corps?.nouveau === 'string' ? corps.nouveau.slice(0, 40) : '';
  const motif = typeof corps?.motif === 'string' ? corps.motif.trim().slice(0, 300) : null;
  if (!Number.isInteger(id) || id <= 0 || !attendu || !nouveau) {
    return NextResponse.json({ error: 'Demande invalide' }, { status: 400 });
  }

  const { data, error } = await e.supabase.rpc('changer_statut_commande', {
    p_id: id, p_attendu: attendu, p_nouveau: nouveau, p_motif: motif,
  });
  if (error) {
    const refuse = error.code === '42501';
    return NextResponse.json({ error: error.message }, { status: refuse ? 403 : 422 });
  }
  const r = data as ReponseRpc;
  if (!r.ok) return NextResponse.json({ conflit: true, statut: r.statut, updated_at: r.updated_at }, { status: 409 });

  // E-mail au client (uniquement pour un vrai changement)
  let email: 'envoye' | 'echec' | 'sans' = 'sans';
  const statut = statutNormalise(r.statut);
  if (r.prevenir_client && !r.inchange) {
    const jeton = (req.headers.get('authorization') ?? '').replace(/^Bearer\s+/i, '');
    [email] = await Promise.all([
      prevenirClient(e.supabase, id, statut),
      // Annulation : les autres membres de l'équipe sont prévenus sur leur téléphone
      statut === 'annulee' ? notifierEquipe(jeton, { action: 'annulation', id }) : Promise.resolve(),
    ]);
  }
  return NextResponse.json({ ok: true, statut: r.statut, updated_at: r.updated_at, inchange: !!r.inchange, email });
}

async function prevenirClient(supabase: SupabaseClient, id: number, statut: string): Promise<'envoye' | 'echec' | 'sans'> {
  try {
    if (!fournisseur()) return 'sans';
    const { data: cmd } = await supabase
      .from('commandes')
      .select('id, nom_client, adresse_livraison, email_client, total, contenu_panier, date_livraison, code_promo')
      .eq('id', id)
      .maybeSingle();
    if (!cmd?.email_client) return 'sans';
    let message;
    if (statut === 'livree') {
      const { data: facture } = await supabase.from('factures').select('numero, total_ttc, total_tva, date_reglement').eq('commande_id', id).maybeSingle();
      message = emailCommandeLivree(cmd as CommandeEmail, (facture as FactureEmail) ?? null);
    } else if (statut === 'annulee') {
      message = emailCommandeAnnulee(cmd as CommandeEmail);
    } else {
      return 'sans';
    }
    const res = await envoyerEmail({ to: cmd.email_client, subject: message.objet, html: message.html }, `gestion-${statut}`);
    return res.ok ? 'envoye' : 'echec';
  } catch (err) {
    console.error('[gestion/statut] e-mail client :', err);
    return 'echec';
  }
}
