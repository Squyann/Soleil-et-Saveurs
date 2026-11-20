'use client';
// Fiche d'une commande : client, livraison, articles, montants, historique et
// changement de statut (annulation avec motif, réservée aux gérants).
import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { ArrowLeft, MapPin, MessageCircle, MoreHorizontal, Phone, Printer } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { formatPrix } from '@/lib/format';
import { htmlDocument, imprimerDocument, type FactureEmise } from '@/lib/facture';
import {
  COLONNES, CRENEAU, lienItineraire, lienWhatsApp, lignes, nomLigne, quantiteLigne, statutDe, telephoneLisible, type Commande,
} from '@/lib/gestion/commandes';
import { changementsPossibles, etapeSuivante, LIBELLE_STATUT, statutNormalise, type Statut } from '@/lib/gestion/statuts';
import { ecrireMemoire, lireMemoire } from '@/lib/gestion/memoire';
import { useChangements, useGestion } from '@/components/gestion/AppliGestion';
import { useStatut } from '@/components/gestion/useStatut';
import { Carte, Chargement, DonneesDu, PastilleStatut } from '@/components/gestion/Elements';
import Feuille from '@/components/gestion/Feuille';

type Etape = { id: number; de: string | null; vers: string; motif: string | null; le: string };

const LIBELLE_ACTION: Record<Statut, string> = {
  nouvelle: 'Remettre en « Nouvelle »',
  preparation: 'Passer en préparation',
  livraison: 'Partir en livraison',
  livree: 'Marquer comme livrée',
  annulee: 'Annuler la commande',
};

export default function FicheCommande() {
  const params = useParams<{ id: string }>();
  const id = Number(String(params?.id ?? '').replace(/\D/g, ''));
  const { peut, enLigne } = useGestion();
  const cle = `commande-${id}`;
  const [c, setC] = useState<Commande | null>(() => lireMemoire<Commande>(cle)?.valeur ?? null);
  const [le, setLe] = useState<number | null>(() => lireMemoire<Commande>(cle)?.le ?? null);
  const [introuvable, setIntrouvable] = useState(false);
  const [journal, setJournal] = useState<Etape[]>([]);
  const [rang, setRang] = useState<number | null>(null);
  const [menu, setMenu] = useState(false);
  const [annulation, setAnnulation] = useState(false);
  const [voirTout, setVoirTout] = useState(false);

  const charger = useCallback(async () => {
    if (!id) return;
    const { data, error } = await supabase.from('commandes').select(COLONNES).eq('id', id).maybeSingle();
    if (error) return;
    if (!data) { setIntrouvable(true); return; }
    const cmd = data as Commande;
    setC(cmd);
    setLe(null);
    ecrireMemoire(cle, cmd);
    const { data: j } = await supabase.from('commandes_journal').select('id, de, vers, motif, le').eq('commande_id', id).order('le', { ascending: true });
    setJournal((j as Etape[]) ?? []);
    if (cmd.user_id && peut('clients')) {
      const { count } = await supabase.from('commandes').select('id', { count: 'exact', head: true }).eq('user_id', cmd.user_id).lte('created_at', cmd.created_at);
      setRang(count ?? null);
    }
  }, [id, cle, peut]);
  useEffect(() => {
    const t = setTimeout(() => { void charger(); }, 0);
    return () => clearTimeout(t);
  }, [charger]);
  useChangements(['commandes', 'commandes_journal'], (_t, ch) => {
    if (ch.eventType === 'RESYNC' || Number(ch.new?.id ?? ch.new?.commande_id ?? ch.old?.id) === id) void charger();
  });
  const { changer, enCours } = useStatut(charger);

  if (introuvable) {
    return (
      <>
        <Retour />
        <Carte><p className="text-[14.5px]">Commande introuvable, ou hors de votre accès.</p></Carte>
      </>
    );
  }
  if (!c) return (<><Retour /><Chargement lignes={4} /></>);

  const s = statutDe(c);
  const etape = etapeSuivante(s);
  const autres = changementsPossibles(s).filter((x) => x !== etape && x !== 'annulee');
  const art = lignes(c);
  const affiches = voirTout ? art : art.slice(0, 4);
  const sommeLignes = art.reduce((a, l) => a + (Number(l.prixTotalLigne) || 0), 0);
  const frais = Number(c.frais_livraison) || 0;
  const total = Number(c.total) || 0;
  const remise = Math.round((sommeLignes + frais - total) * 100) / 100;
  const occupee = enCours === c.id;
  const recu = new Date(c.created_at);
  const wa = lienWhatsApp(c.telephone_client);
  const iti = lienItineraire(c.adresse_livraison);
  const dateLiv = c.date_livraison
    ? new Date(`${c.date_livraison}T12:00:00`).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })
    : 'Date non précisée';

  async function imprimer(type: 'facture' | 'bon de livraison') {
    setMenu(false);
    let facture: FactureEmise | null = null;
    if (type === 'facture') {
      const { data } = await supabase.from('factures').select('*').eq('commande_id', c!.id).maybeSingle();
      facture = (data as FactureEmise) ?? null;
    }
    imprimerDocument(htmlDocument(c!, facture, 'bon de livraison'));
  }

  return (
    <>
      <Retour />
      <DonneesDu le={le} />
      <header className="mb-4 flex items-start justify-between gap-3">
        <div>
          <h1 className="titre text-[28px] leading-tight">Commande n° {c.id}</h1>
          <p className="text-[13.5px] text-olivier-gris">
            Reçue le {recu.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' })} à {recu.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }).replace(':', ' h ')}
          </p>
        </div>
        <PastilleStatut statut={s} />
      </header>

      {s === 'annulee' && c.motif_annulation && (
        <p className="mb-3 rounded-2xl bg-[#F1E1DB] px-4 py-3 text-[13.5px] text-[#8A3A1E]"><b>Motif de l’annulation :</b> {c.motif_annulation}</p>
      )}

      <Carte className="mb-3">
        <h2 className="text-[12px] font-extrabold uppercase tracking-[0.07em] text-olivier-gris">Client</h2>
        <p className="mt-1 text-[17px] font-bold">{c.nom_client || 'Client'}</p>
        <p className="text-[13.5px] text-olivier-gris">
          {telephoneLisible(c.telephone_client) || 'Pas de téléphone'}{rang ? ` · ${rang === 1 ? '1re commande' : `${rang}e commande`}` : ''}
        </p>
        <div className="mt-3 grid grid-cols-3 gap-2">
          <Bouton href={c.telephone_client ? `tel:${c.telephone_client.replace(/[^\d+]/g, '')}` : null} Icone={Phone} libelle="Appeler" />
          <Bouton href={wa} Icone={MessageCircle} libelle="WhatsApp" externe />
          <Bouton href={iti} Icone={MapPin} libelle="Itinéraire" externe />
        </div>
      </Carte>

      <Carte className="mb-3">
        <h2 className="text-[12px] font-extrabold uppercase tracking-[0.07em] text-olivier-gris">Livraison</h2>
        <p className="mt-1 text-[15.5px] font-bold first-letter:uppercase">{dateLiv} · {c.creneau_livraison || CRENEAU}</p>
        <p className="mt-0.5 text-[14px] leading-snug">{c.adresse_livraison}</p>
        <p className="mt-0.5 text-[12.5px] text-olivier-gris">
          {[c.distance_km != null ? `${String(Number(c.distance_km).toFixed(1)).replace('.', ',')} km` : null, frais > 0 ? `frais ${formatPrix(frais)}` : 'livraison offerte'].filter(Boolean).join(' · ')}
        </p>
        {c.commentaire_client && <p className="mt-2 rounded-xl bg-[#FFF6E2] px-3 py-2 text-[13.5px]">« {c.commentaire_client} »</p>}
      </Carte>

      <Carte className="mb-3">
        <h2 className="text-[12px] font-extrabold uppercase tracking-[0.07em] text-olivier-gris">{art.length} article{art.length > 1 ? 's' : ''}</h2>
        <ul className="mt-1 divide-y divide-[#F0E7DA]">
          {affiches.map((l, i) => (
            <li key={i} className="flex items-baseline gap-3 py-2.5">
              <span className="min-w-0 flex-1">
                <b className="block text-[14.5px]">{nomLigne(l)}</b>
                <span className="text-[12.5px] text-olivier-gris">
                  {quantiteLigne(l)}{Number(l.offerts) > 0 ? ` · dont ${quantiteLigne({ ...l, quantite: l.offerts })} offert` : ''}
                </span>
              </span>
              <b className="text-[14.5px]">{formatPrix(Number(l.prixTotalLigne) || 0)}</b>
            </li>
          ))}
        </ul>
        {art.length > 4 && (
          <button type="button" onClick={() => setVoirTout((v) => !v)} className="min-h-[44px] text-[13.5px] font-bold text-brique">
            {voirTout ? 'Réduire' : `+ ${art.length - 4} autre${art.length - 4 > 1 ? 's' : ''} article${art.length - 4 > 1 ? 's' : ''}`}
          </button>
        )}
        <div className="mt-2 space-y-1 border-t border-[#E3D6C4] pt-3 text-[13.5px]">
          {remise > 0.009 && <p className="flex justify-between"><span>{c.code_promo ? `Code ${c.code_promo}${c.remise_code_pct ? ` · −${c.remise_code_pct} %` : ''}` : 'Remises'}</span><span>−{formatPrix(remise)}</span></p>}
          <p className="flex justify-between"><span>Livraison</span><span>{frais > 0 ? formatPrix(frais) : 'offerte'}</span></p>
          <p className="flex justify-between text-[17px] font-extrabold"><span>{c.methode_paiement ? `Total · ${c.methode_paiement}` : 'Total · paiement à la livraison'}</span><span>{formatPrix(total)}</span></p>
        </div>
        <p className="mt-2 text-[12px] text-olivier-gris">Prix figé à la commande : le contenu et le montant ne se modifient pas.</p>
      </Carte>

      {journal.length > 0 && (
        <Carte className="mb-3">
          <h2 className="text-[12px] font-extrabold uppercase tracking-[0.07em] text-olivier-gris">Historique</h2>
          <ol className="mt-2 space-y-1.5 text-[13px]">
            {journal.map((j) => (
              <li key={j.id} className="flex gap-2">
                <span className="w-[86px] flex-none text-olivier-gris">{new Date(j.le).toLocaleString('fr-FR', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}</span>
                <span>{LIBELLE_STATUT[statutNormalise(j.vers)]}{j.motif && statutNormalise(j.vers) === 'annulee' ? ` · ${j.motif}` : ''}</span>
              </li>
            ))}
          </ol>
        </Carte>
      )}

      {/* Barre d'action, au-dessus du menu */}
      <div className="sticky bottom-[calc(84px+env(safe-area-inset-bottom))] z-30 mt-4 flex gap-2">
        {etape ? (
          <button
            type="button"
            disabled={occupee || !enLigne}
            onClick={() => changer(c, etape)}
            className="min-h-[56px] flex-1 rounded-2xl bg-olivier text-[16px] font-extrabold text-lin shadow-lg disabled:opacity-50"
          >
            {occupee ? 'Enregistrement…' : !enLigne ? 'Hors connexion' : LIBELLE_ACTION[etape]}
          </button>
        ) : (
          <p className="flex min-h-[56px] flex-1 items-center justify-center rounded-2xl bg-white text-[14px] font-bold text-olivier-gris shadow">
            Commande {s === 'livree' ? 'livrée' : 'annulée'} · terminée
          </p>
        )}
        <button
          type="button"
          onClick={() => setMenu(true)}
          aria-label="Autres actions"
          className="flex h-14 w-14 flex-none items-center justify-center rounded-2xl border border-[#E3D6C4] bg-white shadow-lg"
        >
          <MoreHorizontal className="h-6 w-6" />
        </button>
      </div>

      {menu && (
        <Feuille fermer={() => setMenu(false)} titre="Autres actions">
          {autres.map((x) => (
            <button key={x} type="button" disabled={occupee || !enLigne} onClick={() => { setMenu(false); void changer(c, x); }} className="flex min-h-[52px] w-full items-center rounded-2xl px-4 text-left text-[15px] font-bold active:bg-lin disabled:opacity-40">
              {LIBELLE_ACTION[x]}
            </button>
          ))}
          <button type="button" onClick={() => imprimer(s === 'livree' ? 'facture' : 'bon de livraison')} className="flex min-h-[52px] w-full items-center gap-2 rounded-2xl px-4 text-left text-[15px] font-bold active:bg-lin">
            <Printer className="h-5 w-5" aria-hidden="true" /> {s === 'livree' ? 'Imprimer la facture' : 'Imprimer le bon de livraison'}
          </button>
          {changementsPossibles(s).includes('annulee') && peut('annuler') && (
            <button type="button" disabled={!enLigne} onClick={() => { setMenu(false); setAnnulation(true); }} className="flex min-h-[52px] w-full items-center rounded-2xl px-4 text-left text-[15px] font-bold text-brique active:bg-lin disabled:opacity-40">
              Annuler la commande…
            </button>
          )}
        </Feuille>
      )}

      {annulation && <Annulation c={c} fermer={() => setAnnulation(false)} confirmer={async (motif) => { const ok = await changer(c, 'annulee', motif); if (ok) setAnnulation(false); }} occupee={occupee} />}
    </>
  );
}

function Retour() {
  return (
    <Link href="/gestion/commandes" className="-ml-2 mb-2 inline-flex min-h-[44px] items-center gap-1 px-2 text-[14px] font-bold text-olivier-gris">
      <ArrowLeft className="h-5 w-5" aria-hidden="true" /> Commandes
    </Link>
  );
}

function Bouton({ href, Icone, libelle, externe }: { href: string | null; Icone: typeof Phone; libelle: string; externe?: boolean }) {
  const classe = 'flex min-h-[52px] flex-col items-center justify-center gap-1 rounded-2xl border border-[#E3D6C4] text-[12.5px] font-bold';
  if (!href) return <span className={`${classe} opacity-40`} aria-disabled="true"><Icone className="h-5 w-5" aria-hidden="true" />{libelle}</span>;
  return (
    <a href={href} className={`${classe} active:bg-lin`} {...(externe ? { target: '_blank', rel: 'noopener noreferrer' } : {})}>
      <Icone className="h-5 w-5" aria-hidden="true" />{libelle}
    </a>
  );
}

function Annulation({ c, fermer, confirmer, occupee }: { c: Commande; fermer: () => void; confirmer: (motif: string) => void; occupee: boolean }) {
  const [motif, setMotif] = useState('');
  const motifs = ['Demandée par le client', 'Client injoignable', 'Produits indisponibles', 'Adresse hors zone'];
  return (
    <Feuille titre={`Annuler la commande n° ${c.id}`} fermer={fermer}>
      <div className="px-4">
        <p className="text-[13.5px] leading-relaxed text-olivier-doux">
          Le stock sera remis, les points de fidélité de cette commande retirés{c.code_promo ? `, le code ${c.code_promo} redeviendra utilisable` : ''}, et le client recevra un e-mail. C’est définitif.
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
          {motifs.map((m) => (
            <button key={m} type="button" onClick={() => setMotif(m)} className={`min-h-[40px] rounded-full border px-3 text-[13px] font-bold ${motif === m ? 'border-olivier bg-olivier text-lin' : 'border-[#E3D6C4]'}`}>{m}</button>
          ))}
        </div>
        <label htmlFor="motif" className="mt-3 block text-[13px] font-bold text-olivier-gris">Motif (obligatoire, non envoyé au client)</label>
        <textarea id="motif" value={motif} onChange={(e) => setMotif(e.target.value.slice(0, 300))} rows={2} className="mt-1 w-full rounded-2xl border border-[#E3D6C4] bg-[#FBF6F0] px-3 py-2.5 text-[16px] outline-none focus:border-olivier" />
        <button
          type="button"
          disabled={!motif.trim() || occupee}
          onClick={() => confirmer(motif.trim())}
          className="mt-3 min-h-[52px] w-full rounded-2xl bg-brique text-[15px] font-extrabold text-white disabled:opacity-40"
        >
          {occupee ? 'Annulation en cours…' : 'Confirmer l’annulation'}
        </button>
      </div>
    </Feuille>
  );
}
