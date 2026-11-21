// Envoi d'une facture, d'un bon ou d'un avoir pro par e-mail : le client
// reçoit un lien vers son document (à consulter, imprimer ou enregistrer en
// PDF). Réservé à l'administrateur et au gérant, document émis uniquement.

import { NextResponse, type NextRequest } from 'next/server';
import { equipe } from '@/lib/gestion/serveur';
import { peut } from '@/lib/gestion/roles';
import { envoyerEmail, fournisseur } from '@/lib/email/envoi';
import { bouton, COULEURS as C, coquille, echapper, encadre, paragraphe, surtitre, titre, urlSite } from '@/lib/email/gabarit';
import { LIBELLE_TYPE, type DocumentPro } from '@/lib/facturePro';
import { dateLongue } from '@/lib/facture';
import { formatPrix } from '@/lib/format';

export async function POST(req: NextRequest) {
  const e = await equipe(req);
  if (e instanceof NextResponse) return e;
  if (!peut(e.role, 'clients')) return NextResponse.json({ error: 'Non autorisé' }, { status: 403 });

  const corps = await req.json().catch(() => null);
  const id = typeof corps?.id === 'string' && /^[0-9a-f-]{36}$/i.test(corps.id) ? corps.id : null;
  if (!id) return NextResponse.json({ error: 'Demande invalide' }, { status: 400 });

  const { data } = await e.supabase.from('documents_pro')
    .select('id, type, statut, numero, client, date_emission, date_echeance, date_livraison, total_ttc, date_reglement, jeton')
    .eq('id', id).maybeSingle();
  const d = data as (Pick<DocumentPro, 'id' | 'type' | 'statut' | 'numero' | 'client' | 'date_emission' | 'date_echeance' | 'date_livraison' | 'total_ttc' | 'date_reglement'> & { jeton: string }) | null;
  if (!d) return NextResponse.json({ error: 'Document introuvable' }, { status: 404 });
  if (d.statut !== 'emis') return NextResponse.json({ error: 'Émettez le document avant de l’envoyer' }, { status: 409 });
  const destinataire = d.client?.email;
  if (!destinataire) return NextResponse.json({ error: 'Le client n’a pas d’adresse e-mail' }, { status: 409 });
  if (!fournisseur()) return NextResponse.json({ error: 'Envoi d’e-mails non configuré' }, { status: 503 });

  const type = LIBELLE_TYPE[d.type];
  const lien = `${urlSite()}/document/${d.jeton}`;
  const montant = d.type !== 'bon' && d.total_ttc != null ? formatPrix(Number(d.total_ttc)) : null;
  const contenu = [
    surtitre(`${type} n° ${echapper(d.numero)}`),
    titre(`Bonjour ${echapper(d.client?.raison_sociale ?? '')},`),
    paragraphe(
      d.type === 'facture'
        ? `Voici votre facture n°&nbsp;${echapper(d.numero)} du ${dateLongue(d.date_emission)}${montant ? `, d'un montant de <strong>${montant} TTC</strong>` : ''}.${d.date_reglement ? ' Elle est réglée, merci.' : ` À régler à réception, au plus tard le ${dateLongue(d.date_echeance)}.`}`
        : d.type === 'avoir'
          ? `Voici votre avoir n°&nbsp;${echapper(d.numero)} du ${dateLongue(d.date_emission)}${montant ? `, d'un montant de <strong>${montant} TTC</strong>` : ''}.`
          : `Voici le bon de livraison n°&nbsp;${echapper(d.numero)}${d.date_livraison ? ` de la livraison du ${dateLongue(d.date_livraison)}` : ''}.`,
    ),
    bouton(`Voir et télécharger ${d.type === 'avoir' ? "l'avoir" : d.type === 'bon' ? 'le bon' : 'la facture'}`, lien, 'brun'),
    paragraphe(`Depuis la page, utilisez « Imprimer » puis « Enregistrer en PDF » pour garder le document.`, '14px 0 0'),
    encadre(`<strong style="color:${C.brun};">Une question ?</strong> Répondez simplement à cet e-mail ou appelez-nous au 07&nbsp;59&nbsp;72&nbsp;00&nbsp;83.`),
  ].join('');
  const html = coquille({
    titre: `${type} ${d.numero}`,
    preheader: montant ? `${type} ${d.numero} · ${montant} TTC` : `${type} ${d.numero}`,
    reference: `${type} n° ${echapper(d.numero)}`,
    contenu,
    pied: `<strong style="color:${C.brun};">Soleil et Saveurs</strong> · SAS au capital de 1 000 € · 6-8 avenue Henriette, 93170 Bagnolet · RCS Bobigny 821 324 324`,
  });

  const r = await envoyerEmail({ to: destinataire, subject: `${type} ${d.numero} · Soleil et Saveurs`, html }, 'document-pro');
  if (!r.ok) return NextResponse.json({ error: 'L’e-mail n’a pas pu partir, réessayez' }, { status: 502 });

  const envoye_le = new Date().toISOString();
  await e.supabase.from('documents_pro').update({ envoye_le }).eq('id', id);
  return NextResponse.json({ ok: true, envoye_le });
}
