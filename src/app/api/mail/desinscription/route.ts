import { NextRequest, NextResponse } from 'next/server';
import { urlSite } from '@/lib/email/gabarit';
import { clientAnonyme } from '@/lib/email/serveur';

// Désinscription en un clic depuis la messagerie (en-têtes List-Unsubscribe
// et List-Unsubscribe-Post) : POST sans corps utile, le jeton secret du lien
// identifie le client. Un GET renvoie vers la page de désinscription.

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function parametres(req: NextRequest) {
  const j = req.nextUrl.searchParams.get('j') || '';
  const c = req.nextUrl.searchParams.get('c') || '';
  return { jeton: UUID.test(j) ? j : null, campagne: UUID.test(c) ? c : null };
}

export async function POST(req: NextRequest) {
  const { jeton, campagne } = parametres(req);
  if (!jeton) return NextResponse.json({ error: 'Lien invalide' }, { status: 400 });
  const { data, error } = await clientAnonyme().rpc('desinscription_mail', { p_jeton: jeton, p_campagne: campagne });
  if (error || !data?.ok) return NextResponse.json({ error: 'Lien invalide' }, { status: error ? 500 : 404 });
  return NextResponse.json({ ok: true });
}

export async function GET(req: NextRequest) {
  const { jeton, campagne } = parametres(req);
  // Adresse publique du site (derrière l'hébergeur, l'origine de la requête
  // est l'adresse interne du serveur)
  const url = new URL('/desinscription', urlSite());
  if (jeton) url.searchParams.set('j', jeton);
  if (campagne) url.searchParams.set('c', campagne);
  return NextResponse.redirect(url, 303);
}
