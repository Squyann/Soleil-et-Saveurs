import { createHash } from 'node:crypto';
import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseServerClient, requireAdmin } from '@/lib/api-auth';
import { rendreCampagne, type Bloc, type CampagneMail } from '@/lib/email/campagne';
import { envoyerLot, fournisseur, NOM_FOURNISSEUR, REPONDRE_A, type Envoi } from '@/lib/email/envoi';
import { urlSite } from '@/lib/email/gabarit';
import { clientAnonyme, etatEnvoi, expediteurCampagne, produitsDesBlocs } from '@/lib/email/serveur';

// Envoi des campagnes, par lots de 100 (un e-mail individuel par
// destinataire, aucune adresse visible des autres ; Brevo ou Resend, voir
// lib/email/envoi.ts). Appelé par
// l'administrateur connecté (bouton d'envoi, l'écran relance tant qu'il reste
// des e-mails) ou par une tâche planifiée munie de la clé MAIL_CRON_SECRET.
// Chaque appel traite au plus 5 lots pour rester court.

const PAUSE_MS = 400;          // courte pause entre deux lots, sous les limites de débit
const LOTS_PAR_APPEL = 5;

interface Destinataire { envoi_id: number; email: string; prenom: string | null; jeton: string | null }
interface Lot {
  campagne: (CampagneMail & { id: string; expediteur_nom: string; expediteur_local: string; blocs: Bloc[] }) | null;
  destinataires: Destinataire[];
  restants: number;
}

const pause = (ms: number) => new Promise((r) => setTimeout(r, ms));

export async function POST(req: NextRequest) {
  const cleRecue = req.headers.get('x-cle-mail');
  let cle: string | null = null;
  let supabase;
  if (cleRecue) {
    const attendue = process.env.MAIL_CRON_SECRET;
    if (!attendue || attendue.length < 32 || cleRecue !== attendue) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
    cle = cleRecue;
    supabase = clientAnonyme();
  } else {
    const { error } = await requireAdmin();
    if (error) return error;
    supabase = await getSupabaseServerClient();
  }

  const etat = await etatEnvoi();
  if (!etat.pret) return NextResponse.json({ error: etat.raison, etat }, { status: 409 });

  const site = urlSite();
  let envoyes = 0;
  let echecs = 0;
  let dernier: Lot | null = null;

  for (let n = 0; n < LOTS_PAR_APPEL; n++) {
    const { data, error } = await supabase.rpc('mail_lot', { p_cle: cle, p_taille: 100 });
    if (error) {
      console.error('[mail/traiter] mail_lot :', error.message);
      return NextResponse.json({ error: 'Lecture de la file impossible' }, { status: 500 });
    }
    const lot = data as Lot;
    dernier = lot;
    if (!lot.campagne) break;                       // rien à envoyer
    if (!lot.destinataires.length) {
      if (lot.restants === 0) continue;             // campagne terminée : la suivante
      break;
    }

    const c = lot.campagne;
    const from = expediteurCampagne(c.expediteur_nom, c.expediteur_local);
    const produits = await produitsDesBlocs(supabase, c.blocs || []);
    const emails: Envoi[] = lot.destinataires.map((d) => {
      const { html, headers } = rendreCampagne({ ...c, blocs: c.blocs || [] }, d, produits, site);
      return {
        from: from || undefined, to: d.email, subject: c.objet, html, replyTo: REPONDRE_A,
        headers, tags: [{ name: 'campagne', value: c.id.replace(/[^a-zA-Z0-9_-]/g, '') }],
      };
    });

    // Même lot renvoyé après une coupure : Resend ignore le doublon (clé d'idempotence)
    const idempotence = createHash('sha256').update(`${c.id}:${lot.destinataires.map((d) => d.envoi_id).join(',')}`).digest('hex');
    const envois = await envoyerLot(emails, idempotence, 'mail/traiter');
    const nom = NOM_FOURNISSEUR[fournisseur() ?? 'brevo'];
    // Échec passager (quota du jour atteint, limite de débit, panne) : l'e-mail repart dans la file
    const resultats = lot.destinataires.map((d, i) => {
      const r = envois[i];
      if (r?.ok && r.id) return { envoi_id: d.envoi_id, ok: true, resend_id: r.id, erreur: null };
      if (r?.ok) return { envoi_id: d.envoi_id, ok: false, erreur: 'Réponse incomplète du prestataire' };
      return { envoi_id: d.envoi_id, ok: false, reprendre: Boolean(r?.reprendre), erreur: r?.statut ? `${nom} ${r.statut}` : `${nom} injoignable` };
    });
    const { error: errRes } = await supabase.rpc('mail_resultats', { p_cle: cle, p_resultats: resultats });
    if (errRes) console.error('[mail/traiter] mail_resultats :', errRes.message);
    envoyes += resultats.filter((r) => r.ok).length;
    echecs += resultats.filter((r) => !r.ok && !('reprendre' in r && r.reprendre)).length;
    if (resultats.some((r) => 'reprendre' in r && r.reprendre)) {
      return NextResponse.json({ ok: true, pause: true, envoyes, echecs, campagne_id: c.id }, { status: 200 });
    }
    await pause(PAUSE_MS);
  }

  return NextResponse.json({
    ok: true,
    envoyes,
    echecs,
    campagne_id: dernier?.campagne?.id ?? null,
    restants: dernier?.restants ?? 0,
    termine: !dernier?.campagne || (dernier.restants === 0 && dernier.destinataires.length === 0),
  });
}
