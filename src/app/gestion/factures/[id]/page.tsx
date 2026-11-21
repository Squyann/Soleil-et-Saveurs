'use client';
// Document pro : saisie du brouillon (chaque changement est enregistré et
// confirmé par la base), aperçu, émission ; puis, une fois émis : impression,
// envoi par e-mail, règlement, avoir.
import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, Check, Copy, Eye, Mail, Pencil, Plus, Printer } from 'lucide-react';
import { formatPrix } from '@/lib/format';
import { imprimerDocument } from '@/lib/facture';
import { htmlDocumentPro, LIBELLE_MODE, LIBELLE_TYPE, quantitePro, totalLigne, totaux, type ClientPro, type DocumentPro, type LignePro } from '@/lib/facturePro';
import {
  creerBrouillon, emettre, enregistrerBrouillon, enregistrerReglement, envoyerParEmail, etatDocument, lienPublic, lignesSansTotal, lireDocument,
  listerClientsPro, supprimerBrouillon, type ChampsBrouillon,
} from '@/lib/gestion/documentsPro';
import { useGestion } from '@/components/gestion/AppliGestion';
import { aujourdhui, Carte, Chargement, dateCourte } from '@/components/gestion/Elements';
import Feuille from '@/components/gestion/Feuille';
import FeuilleLigne from '@/components/gestion/FeuilleLigne';
import FicheClientPro from '@/components/gestion/FicheClientPro';

export default function DocumentProPage() {
  const params = useParams<{ id: string }>();
  const id = String(params?.id ?? '');
  const router = useRouter();
  const { peut, executer, enLigne, notifier } = useGestion();
  const [d, setD] = useState<DocumentPro | null>(null);
  const [origine, setOrigine] = useState<DocumentPro | null>(null);
  const [clients, setClients] = useState<ClientPro[]>([]);
  const [introuvable, setIntrouvable] = useState(false);
  const [ligne, setLigne] = useState<{ index: number | null } | null>(null);
  const [choixClient, setChoixClient] = useState(false);
  const [nouveauClient, setNouveauClient] = useState(false);
  const [apercu, setApercu] = useState(false);
  const [confirmation, setConfirmation] = useState(false);
  const [reglement, setReglement] = useState(false);
  const [envoi, setEnvoi] = useState(false);

  const charger = useCallback(async () => {
    try {
      const [doc, cl] = await Promise.all([lireDocument(id), listerClientsPro()]);
      if (!doc) { setIntrouvable(true); return; }
      setD(doc); setClients(cl);
      if (doc.avoir_de) setOrigine(await lireDocument(doc.avoir_de));
    } catch { setIntrouvable(true); }
  }, [id]);
  useEffect(() => {
    const t = setTimeout(() => { void charger(); }, 0);
    return () => clearTimeout(t);
  }, [charger]);

  const retour = (
    <Link href="/gestion/factures" className="-ml-2 mb-2 inline-flex min-h-[44px] items-center gap-1 px-2 text-[14px] font-bold text-olivier-gris">
      <ArrowLeft className="h-5 w-5" aria-hidden="true" /> Factures pros
    </Link>
  );
  if (!peut('clients')) return (<>{retour}<Carte><p>Réservé à l’administrateur et au gérant.</p></Carte></>);
  if (introuvable) return (<>{retour}<Carte><p>Document introuvable.</p></Carte></>);
  if (!d) return (<>{retour}<Chargement lignes={4} /></>);

  const client = clients.find((c) => c.id === d.client_id) ?? null;
  const brouillon = d.statut === 'brouillon';
  const avecPrix = d.type !== 'bon';
  const t = brouillon ? totaux(d.lignes) : { ht: Number(d.total_ht), tva: Number(d.total_tva), ttc: Number(d.total_ttc) };
  const docAffiche = { ...d, avoir_de_numero: origine?.numero ?? null };
  const html = () => htmlDocumentPro(docAffiche, client);

  // Chaque modification du brouillon est enregistrée tout de suite
  async function sauver(champs: ChampsBrouillon, libelle: string) {
    setEnvoi(true);
    const r = await executer(libelle, () => enregistrerBrouillon(d!, champs));
    setEnvoi(false);
    if (!r.ok) return false;
    if (!r.donnees.ok) {
      notifier({ type: 'info', texte: 'Ce brouillon a été modifié ailleurs entre-temps : rechargé, rien n’a été écrasé.' });
      if (r.donnees.actuel) setD(r.donnees.actuel); else setIntrouvable(true);
      return false;
    }
    setD(r.donnees.doc);
    return true;
  }

  async function validerLigne(l: LignePro, index: number | null) {
    const lignes = lignesSansTotal(d!.lignes);
    if (index == null) lignes.push(l); else lignes[index] = l;
    if (await sauver({ lignes }, index == null ? 'Ajout de la ligne' : 'Modification de la ligne')) setLigne(null);
  }
  async function retirerLigne(index: number) {
    const lignes = lignesSansTotal(d!.lignes).filter((_, i) => i !== index);
    if (await sauver({ lignes }, 'Retrait de la ligne')) setLigne(null);
  }

  async function emettreDocument() {
    setEnvoi(true);
    const r = await executer(`Émission ${d!.type === 'facture' ? 'de la facture' : d!.type === 'avoir' ? 'de l’avoir' : 'du bon'}`, () => emettre(d!));
    setEnvoi(false);
    setConfirmation(false);
    if (!r.ok) return;
    if (r.donnees.conflit) { notifier({ type: 'info', texte: 'Le brouillon a changé entre-temps : rechargé. Vérifiez-le puis émettez de nouveau.' }); void charger(); return; }
    notifier({ type: 'ok', texte: `${LIBELLE_TYPE[d!.type]} ${r.donnees.numero} émis${d!.type === 'facture' ? 'e' : ''} : numéro définitif` });
    void charger();
  }

  async function supprimer() {
    const r = await executer('Suppression du brouillon', () => supprimerBrouillon(d!.id), { reussite: 'Brouillon supprimé' });
    if (r.ok) router.replace('/gestion/factures');
  }

  async function creerAvoir() {
    const r = await executer('Nouvel avoir', () => creerBrouillon('avoir', d!.client_id, { avoir_de: d!.id, lignes: lignesSansTotal(d!.lignes) }));
    if (r.ok) { notifier({ type: 'ok', texte: 'Avoir créé en brouillon : gardez seulement les lignes à rembourser.' }); router.push(`/gestion/factures/${r.donnees.id}`); }
  }

  async function envoyer() {
    setEnvoi(true);
    const r = await executer('Envoi par e-mail', () => envoyerParEmail(d!.id), { reussite: `Envoyé à ${d!.client?.email}` });
    setEnvoi(false);
    if (r.ok) setD({ ...d!, envoye_le: r.donnees.envoye_le });
  }

  async function copierLien() {
    try {
      await navigator.clipboard.writeText(lienPublic(d!.jeton ?? ''));
      notifier({ type: 'ok', texte: 'Lien copié : collez-le dans un message au client' });
    } catch { notifier({ type: 'erreur', texte: 'Copie impossible sur ce téléphone.' }); }
  }

  const e = etatDocument(d);
  const titre = brouillon ? `${LIBELLE_TYPE[d.type]} · brouillon` : `${LIBELLE_TYPE[d.type]} ${d.numero}`;

  return (
    <>
      {retour}
      <header className="mb-3 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h1 className="titre text-[26px] leading-tight">{titre}</h1>
          <p className="text-[13px] text-olivier-gris">
            {brouillon ? 'Modifiable jusqu’à l’émission' : `Émis le ${dateCourte(d.date_emission)}${d.envoye_le ? ` · envoyé le ${dateCourte(d.envoye_le)}` : ''}`}
            {d.type === 'avoir' && origine ? ` · sur ${origine.numero}` : ''}
          </p>
        </div>
        <span className="flex-none rounded-full px-3 py-1 text-[12.5px] font-extrabold" style={{ background: e.fond, color: e.texte }}>{e.libelle}</span>
      </header>

      {brouillon && d.type !== 'avoir' && (
        <div className="mb-3 grid grid-cols-2 gap-1 rounded-2xl bg-[#EFE6D8] p-1">
          {(['facture', 'bon'] as const).map((type) => (
            <button key={type} type="button" aria-pressed={d.type === type} disabled={envoi || !enLigne} onClick={() => d.type !== type && sauver({ type }, 'Type de document')} className={`min-h-[44px] rounded-xl text-[14px] font-bold ${d.type === type ? 'bg-white shadow-sm' : 'text-olivier-gris'}`}>{LIBELLE_TYPE[type]}</button>
          ))}
        </div>
      )}

      <Carte className="mb-3">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <h2 className="text-[12px] font-extrabold uppercase tracking-[0.07em] text-olivier-gris">Client</h2>
            {(brouillon ? client : d.client) ? (
              <>
                <b className="mt-1 block text-[16px]">{brouillon ? client!.raison_sociale : d.client!.raison_sociale}</b>
                <span className="text-[12.5px] text-olivier-gris">
                  {(brouillon ? client!.siren : d.client!.siren) ? `SIREN ${(brouillon ? client!.siren! : d.client!.siren!).replace(/(\d{3})(?=\d)/g, '$1 ')}` : <span className="font-bold text-brique">SIREN manquant</span>}
                  {(d.adresse_livraison || (brouillon && client?.adresse_livraison)) ? ` · livraison : ${d.adresse_livraison || client?.adresse_livraison}` : ''}
                </span>
              </>
            ) : <p className="mt-1 text-[14px] font-bold text-brique">À choisir</p>}
          </div>
          {brouillon && d.type !== 'avoir' && <button type="button" disabled={!enLigne} onClick={() => setChoixClient(true)} className="min-h-[40px] flex-none rounded-xl px-2 text-[13.5px] font-bold text-brique disabled:opacity-40">{client ? 'Changer' : 'Choisir'}</button>}
        </div>
      </Carte>

      <Carte className="mb-3">
        <h2 className="text-[12px] font-extrabold uppercase tracking-[0.07em] text-olivier-gris">Articles{avecPrix ? ' · prix HT' : ''}</h2>
        {d.lignes.length === 0 && <p className="mt-1 text-[13.5px] text-olivier-gris">Aucune ligne pour l’instant.</p>}
        <ul className="divide-y divide-[#F0E7DA]">
          {d.lignes.map((l, i) => (
            <li key={i}>
              <button type="button" disabled={!brouillon || !enLigne} onClick={() => setLigne({ index: i })} className="flex min-h-[52px] w-full items-center gap-2 py-2 text-left disabled:opacity-100">
                <span className="min-w-0 flex-1">
                  <b className="block text-[14.5px]">{l.designation}</b>
                  <span className="text-[12.5px] text-olivier-gris">{quantitePro(l)}{avecPrix ? ` × ${formatPrix(Number(l.prix_ht))} HT${Number(l.remise_pct) > 0 ? ` · −${l.remise_pct} %` : ''}` : ''}</span>
                </span>
                {avecPrix && <b className="text-[14.5px]">{formatPrix(l.total_ht ?? totalLigne(l))}</b>}
                {brouillon && <Pencil className="h-4 w-4 flex-none text-olivier-pale" aria-hidden="true" />}
              </button>
            </li>
          ))}
        </ul>
        {brouillon && (
          <button type="button" disabled={!enLigne || envoi} onClick={() => setLigne({ index: null })} className="mt-1 flex min-h-[44px] items-center gap-2 text-[14px] font-bold text-brique disabled:opacity-40">
            <Plus className="h-5 w-5" aria-hidden="true" /> Ajouter une ligne
          </button>
        )}
        {avecPrix && d.lignes.length > 0 && (
          <div className="mt-2 space-y-1 border-t border-[#E3D6C4] pt-3 text-[13.5px]">
            <p className="flex justify-between"><span>Total HT</span><b>{d.type === 'avoir' ? '−' : ''}{formatPrix(t.ht)}</b></p>
            <p className="flex justify-between"><span>TVA 5,5 %</span><b>{d.type === 'avoir' ? '−' : ''}{formatPrix(t.tva)}</b></p>
            <p className="flex justify-between text-[17px] font-extrabold"><span>Total TTC</span><span>{d.type === 'avoir' ? '−' : ''}{formatPrix(t.ttc)}</span></p>
          </div>
        )}
      </Carte>

      {brouillon ? <Details d={d} client={client} sauver={sauver} desactive={envoi || !enLigne} /> : (
        <Carte className="mb-3 space-y-1 text-[13.5px]">
          <p className="flex justify-between"><span className="text-olivier-gris">Date de livraison</span><b>{d.date_livraison ? dateCourte(d.date_livraison) : '—'}</b></p>
          {d.type === 'facture' && <p className="flex justify-between"><span className="text-olivier-gris">Échéance</span><b>{dateCourte(d.date_echeance)}</b></p>}
          {d.type === 'facture' && <p className="flex justify-between"><span className="text-olivier-gris">Règlement</span><b>{d.date_reglement ? `le ${dateCourte(d.date_reglement)}${d.mode_reglement ? ` · ${LIBELLE_MODE[d.mode_reglement]}` : ''}` : 'en attente'}</b></p>}
        </Carte>
      )}

      {/* Actions */}
      {brouillon ? (
        <div className="sticky bottom-[calc(84px+env(safe-area-inset-bottom))] z-30 mt-4 grid grid-cols-2 gap-2">
          <button type="button" onClick={() => setApercu(true)} className="flex min-h-[56px] items-center justify-center gap-2 rounded-2xl border border-olivier bg-white text-[15px] font-extrabold shadow-lg"><Eye className="h-5 w-5" aria-hidden="true" /> Aperçu</button>
          <button type="button" disabled={envoi || !enLigne || !d.lignes.length || !client} onClick={() => setConfirmation(true)} className="min-h-[56px] rounded-2xl bg-olivier text-[15px] font-extrabold text-lin shadow-lg disabled:opacity-40">Émettre</button>
        </div>
      ) : (
        <div className="space-y-2">
          <div className="grid grid-cols-2 gap-2">
            <button type="button" onClick={() => imprimerDocument(html())} className="flex min-h-[52px] items-center justify-center gap-2 rounded-2xl border border-olivier bg-white text-[14px] font-bold"><Printer className="h-4 w-4" aria-hidden="true" /> Imprimer / PDF</button>
            <button type="button" onClick={() => setApercu(true)} className="flex min-h-[52px] items-center justify-center gap-2 rounded-2xl border border-olivier bg-white text-[14px] font-bold"><Eye className="h-4 w-4" aria-hidden="true" /> Voir</button>
          </div>
          {d.client?.email ? (
            <button type="button" disabled={envoi || !enLigne} onClick={envoyer} className="flex min-h-[52px] w-full items-center justify-center gap-2 rounded-2xl bg-olivier text-[15px] font-extrabold text-lin disabled:opacity-40">
              <Mail className="h-5 w-5" aria-hidden="true" /> {envoi ? 'Envoi…' : d.envoye_le ? 'Renvoyer par e-mail' : `Envoyer à ${d.client.email}`}
            </button>
          ) : <p className="text-center text-[12.5px] text-olivier-gris">Pas d’e-mail enregistré pour ce client : copiez le lien ou imprimez.</p>}
          <button type="button" onClick={copierLien} className="flex min-h-[48px] w-full items-center justify-center gap-2 rounded-2xl border border-[#E3D6C4] bg-white text-[14px] font-bold"><Copy className="h-4 w-4" aria-hidden="true" /> Copier le lien du document</button>
          {d.type === 'facture' && (
            <div className="grid grid-cols-2 gap-2">
              <button type="button" disabled={!enLigne} onClick={() => setReglement(true)} className="flex min-h-[48px] items-center justify-center gap-2 rounded-2xl border border-[#E3D6C4] bg-white text-[14px] font-bold disabled:opacity-40"><Check className="h-4 w-4" aria-hidden="true" /> {d.date_reglement ? 'Règlement' : 'Marquer réglée'}</button>
              <button type="button" disabled={!enLigne} onClick={creerAvoir} className="min-h-[48px] rounded-2xl border border-[#E3D6C4] bg-white text-[14px] font-bold text-brique disabled:opacity-40">Faire un avoir</button>
            </div>
          )}
          <p className="pt-1 text-center text-[12px] text-olivier-gris">Document émis : il ne se modifie plus. En cas d’erreur, faites un avoir puis une nouvelle facture.</p>
        </div>
      )}
      {brouillon && (
        <button type="button" disabled={!enLigne} onClick={supprimer} className="mt-3 min-h-[44px] w-full text-[13.5px] font-bold text-brique disabled:opacity-40">Supprimer ce brouillon</button>
      )}

      {ligne && (
        <FeuilleLigne
          ligne={ligne.index == null ? null : d.lignes[ligne.index]}
          avecPrix={avecPrix}
          fermer={() => setLigne(null)}
          valider={(l) => validerLigne(l, ligne.index)}
          supprimer={ligne.index == null ? undefined : () => retirerLigne(ligne.index!)}
        />
      )}
      {choixClient && (
        <Feuille titre="Client" fermer={() => setChoixClient(false)}>
          <div className="max-h-[60dvh] overflow-y-auto px-2">
            {clients.filter((c) => c.actif).map((c) => (
              <button key={c.id} type="button" onClick={async () => { if (await sauver({ client_id: c.id }, 'Choix du client')) setChoixClient(false); }} className="flex min-h-[56px] w-full items-center justify-between rounded-2xl px-3 text-left active:bg-lin">
                <span><b className="block text-[15px]">{c.raison_sociale}</b><span className="text-[12px] text-olivier-gris">{c.siren ? `SIREN ${c.siren}` : 'SIREN à compléter'}</span></span>
                {c.id === d.client_id && <Check className="h-5 w-5" aria-hidden="true" />}
              </button>
            ))}
            <button type="button" onClick={() => { setChoixClient(false); setNouveauClient(true); }} className="flex min-h-[52px] w-full items-center gap-2 px-3 text-[14.5px] font-bold text-brique"><Plus className="h-5 w-5" aria-hidden="true" /> Nouveau client pro</button>
          </div>
        </Feuille>
      )}
      {nouveauClient && (
        <FicheClientPro client={null} fermer={() => setNouveauClient(false)} apres={async (c) => { setNouveauClient(false); if (c) { setClients((l) => [...l, c]); await sauver({ client_id: c.id }, 'Choix du client'); } }} />
      )}
      {apercu && (
        <div className="fixed inset-0 z-[80] flex flex-col bg-black/50" role="dialog" aria-modal="true" aria-label="Aperçu du document">
          <div className="flex items-center justify-between bg-olivier px-4 py-3 text-lin pt-[max(12px,env(safe-area-inset-top))]">
            <b>Aperçu</b>
            <button type="button" onClick={() => setApercu(false)} className="min-h-[40px] rounded-xl bg-white/15 px-3 font-bold">Fermer</button>
          </div>
          <iframe title="Aperçu du document" srcDoc={html()} className="w-full flex-1 bg-white" />
        </div>
      )}
      {confirmation && (
        <Feuille titre={`Émettre ${d.type === 'facture' ? 'la facture' : d.type === 'avoir' ? 'l’avoir' : 'le bon'}`} fermer={() => setConfirmation(false)}>
          <div className="px-4">
            <p className="text-[14px] leading-relaxed text-olivier-doux">
              {d.type === 'facture' ? 'La facture reçoit le numéro suivant de votre suite (FA-…)' : d.type === 'avoir' ? 'L’avoir reçoit son numéro (AV-…)' : 'Le bon reçoit son numéro (BL-…)'} et devient <b>définitif</b> : il ne pourra plus être modifié ni supprimé.
              {avecPrix && <> Total : <b>{d.type === 'avoir' ? '−' : ''}{formatPrix(t.ttc)} TTC</b>.</>}
            </p>
            <button type="button" disabled={envoi} onClick={emettreDocument} className="mt-3 min-h-[52px] w-full rounded-2xl bg-olivier text-[15px] font-extrabold text-lin disabled:opacity-40">{envoi ? 'Émission…' : 'Émettre définitivement'}</button>
          </div>
        </Feuille>
      )}
      {reglement && <Reglement d={d} fermer={() => setReglement(false)} apres={(doc) => { setD(doc); setReglement(false); }} />}
    </>
  );
}

function Details({ d, client, sauver, desactive }: { d: DocumentPro; client: ClientPro | null; sauver: (c: ChampsBrouillon, l: string) => Promise<boolean>; desactive: boolean }) {
  const champ = 'w-full rounded-2xl border border-[#E3D6C4] bg-[#FBF6F0] px-3.5 py-3 text-[16px] outline-none focus:border-olivier disabled:opacity-60';
  const libelle = 'mb-1 block text-[12.5px] font-bold text-olivier-gris';
  return (
    <Carte className="mb-3 space-y-3">
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label htmlFor="d-liv" className={libelle}>Date de livraison</label>
          <input id="d-liv" type="date" defaultValue={d.date_livraison ?? ''} key={`liv-${d.updated_at}`} disabled={desactive} onChange={(e) => sauver({ date_livraison: e.target.value || null }, 'Date de livraison')} className={`${champ} text-[15px]`} />
        </div>
        {d.type === 'facture' && (
          <div>
            <span className={libelle}>Échéance</span>
            <div className="grid grid-cols-2 gap-1 rounded-2xl bg-[#EFE6D8] p-1">
              {[[0, 'Réception'], [30, '30 jours']].map(([j, l]) => (
                <button key={j} type="button" aria-pressed={d.delai_jours === j} disabled={desactive} onClick={() => d.delai_jours !== j && sauver({ delai_jours: Number(j) }, 'Échéance')} className={`min-h-[40px] rounded-xl text-[12.5px] font-bold ${d.delai_jours === j ? 'bg-white shadow-sm' : 'text-olivier-gris'}`}>{l}</button>
              ))}
            </div>
          </div>
        )}
      </div>
      <div>
        <label htmlFor="d-adr" className={libelle}>Adresse de livraison (si différente)</label>
        <input id="d-adr" defaultValue={d.adresse_livraison ?? ''} key={`adr-${d.updated_at}`} placeholder={client?.adresse_livraison || 'celle du client'} disabled={desactive} onBlur={(e) => (e.target.value.trim() || null) !== (d.adresse_livraison || null) && sauver({ adresse_livraison: e.target.value.trim().slice(0, 300) || null }, 'Adresse de livraison')} className={champ} />
      </div>
      <div>
        <label htmlFor="d-notes" className={libelle}>Note sur le document (facultatif)</label>
        <textarea id="d-notes" rows={2} defaultValue={d.notes ?? ''} key={`notes-${d.updated_at}`} placeholder="ex. Livraison du marché de Noël" disabled={desactive} onBlur={(e) => (e.target.value.trim() || null) !== (d.notes || null) && sauver({ notes: e.target.value.trim().slice(0, 1000) || null }, 'Note')} className={champ} />
      </div>
    </Carte>
  );
}

function Reglement({ d, fermer, apres }: { d: DocumentPro; fermer: () => void; apres: (d: DocumentPro) => void }) {
  const { executer } = useGestion();
  const [date, setDate] = useState(d.date_reglement ?? aujourdhui());
  const [mode, setMode] = useState<NonNullable<DocumentPro['mode_reglement']>>(d.mode_reglement ?? 'virement');
  const [envoi, setEnvoi] = useState(false);
  async function valider(dateReglement: string | null) {
    setEnvoi(true);
    const r = await executer('Règlement', () => enregistrerReglement(d, dateReglement, mode), { reussite: dateReglement ? `${d.numero} réglée` : 'Règlement retiré' });
    setEnvoi(false);
    if (r.ok && r.donnees) apres(r.donnees);
  }
  return (
    <Feuille titre={`Règlement de ${d.numero}`} fermer={fermer}>
      <div className="space-y-3 px-4">
        <div>
          <label htmlFor="r-date" className="mb-1 block text-[12.5px] font-bold text-olivier-gris">Réglée le</label>
          <input id="r-date" type="date" value={date} max={aujourdhui()} onChange={(e) => setDate(e.target.value)} className="w-full rounded-2xl border border-[#E3D6C4] bg-[#FBF6F0] px-3.5 py-3 text-[16px]" />
        </div>
        <div className="grid grid-cols-2 gap-2">
          {(Object.keys(LIBELLE_MODE) as (keyof typeof LIBELLE_MODE)[]).map((m) => (
            <button key={m} type="button" aria-pressed={mode === m} onClick={() => setMode(m)} className={`min-h-[44px] rounded-xl border text-[13.5px] font-bold ${mode === m ? 'border-olivier bg-olivier text-lin' : 'border-[#E3D6C4]'}`}>{LIBELLE_MODE[m].charAt(0).toUpperCase() + LIBELLE_MODE[m].slice(1)}</button>
          ))}
        </div>
        <button type="button" disabled={envoi || !date} onClick={() => valider(date)} className="min-h-[52px] w-full rounded-2xl bg-olivier text-[15px] font-extrabold text-lin disabled:opacity-40">Enregistrer le règlement</button>
        {d.date_reglement && <button type="button" disabled={envoi} onClick={() => valider(null)} className="min-h-[44px] w-full text-[13.5px] font-bold text-brique">Retirer le règlement (erreur)</button>}
      </div>
    </Feuille>
  );
}
