import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/api-auth';
import { etatEnvoi } from '@/lib/email/serveur';

// État de l'expéditeur pour l'écran Mail : clé Resend présente, domaine
// d'envoi, enregistrements SPF / DKIM / DMARC, envoi automatique activé.
// Ne renvoie aucune valeur secrète.
export async function GET(req: NextRequest) {
  const { error } = await requireAdmin();
  if (error) return error;
  const etat = await etatEnvoi(req.nextUrl.searchParams.get('verifier') === '1');
  return NextResponse.json(etat);
}
