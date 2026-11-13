import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseServerClient, requireAdmin } from '@/lib/api-auth';
import { rendreCampagne, type CampagneMail } from '@/lib/email/campagne';
import { envoyerEmail } from '@/lib/email/envoi';
import { urlSite } from '@/lib/email/gabarit';
import { etatEnvoi, expediteurCampagne, produitsDesBlocs } from '@/lib/email/serveur';

// E-mail de test : envoyé uniquement à l'adresse de l'administrateur connecté,
// objet préfixé de [TEST]. Ne touche ni aux destinataires ni aux statistiques.
export async function POST(req: NextRequest) {
  const { user, error } = await requireAdmin();
  if (error) return error;
  const body = await req.json().catch(() => ({}));
  const id = String(body?.campagne_id || '');
  if (!/^[0-9a-f-]{36}$/i.test(id)) return NextResponse.json({ error: 'Campagne invalide' }, { status: 400 });

  const etat = await etatEnvoi();
  if (!etat.cle_api) return NextResponse.json({ error: etat.raison }, { status: 409 });

  const supabase = await getSupabaseServerClient();
  const { data: c } = await supabase.from('campagnes').select('*').eq('id', id).maybeSingle();
  if (!c) return NextResponse.json({ error: 'Campagne introuvable' }, { status: 404 });
  if (!user?.email) return NextResponse.json({ error: 'Adresse administrateur inconnue' }, { status: 400 });

  const produits = await produitsDesBlocs(supabase, c.blocs || []);
  const prenom = (user.user_metadata?.first_name as string) || null;
  const { html } = rendreCampagne(c as CampagneMail, { email: user.email, prenom, jeton: null }, produits, urlSite());
  const resultat = await envoyerEmail({
    to: user.email,
    from: expediteurCampagne(c.expediteur_nom, c.expediteur_local) || undefined,
    subject: `[TEST] ${c.objet || '(sans objet)'}`,
    html,
  }, 'mail/test');
  if (!resultat.ok) return NextResponse.json({ error: "Le prestataire d'envoi a refusé l'e-mail de test (voir les journaux du serveur)." }, { status: 502 });

  if (c.statut === 'brouillon') await supabase.from('campagnes').update({ test_envoye_le: new Date().toISOString() }).eq('id', id);
  return NextResponse.json({ ok: true, a: user.email });
}
