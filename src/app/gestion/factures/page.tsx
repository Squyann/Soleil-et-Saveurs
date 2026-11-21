'use client';
// Factures pros : montant à encaisser, filtres, création d'un document
import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowLeft, ChevronRight, Plus } from 'lucide-react';
import { formatPrix } from '@/lib/format';
import { LIBELLE_TYPE, type ClientPro, type DocumentPro, type TypeDocumentPro } from '@/lib/facturePro';
import { creerBrouillon, etatDocument, listerClientsPro, listerDocuments } from '@/lib/gestion/documentsPro';
import { useGestion } from '@/components/gestion/AppliGestion';
import { aujourdhui, Carte, Chargement, dateCourte, EnTete } from '@/components/gestion/Elements';
import Feuille from '@/components/gestion/Feuille';

type Filtre = 'tous' | 'a-regler' | 'brouillons' | 'bons' | 'avoirs';

export default function PageFactures() {
  const router = useRouter();
  const { peut, executer, enLigne } = useGestion();
  const [docs, setDocs] = useState<DocumentPro[] | null>(null);
  const [clients, setClients] = useState<ClientPro[]>([]);
  const [erreur, setErreur] = useState(false);
  const [filtre, setFiltre] = useState<Filtre>('tous');
  const [nouveau, setNouveau] = useState(false);

  const charger = useCallback(async () => {
    try {
      const [d, c] = await Promise.all([listerDocuments(), listerClientsPro()]);
      setDocs(d); setClients(c); setErreur(false);
    } catch { setErreur(true); }
  }, []);
  useEffect(() => {
    const t = setTimeout(() => { void charger(); }, 0);
    return () => clearTimeout(t);
  }, [charger]);

  const resume = useMemo(() => {
    const l = docs ?? [];
    const mois = aujourdhui().slice(0, 7);
    const aRegler = l.filter((d) => d.statut === 'emis' && d.type === 'facture' && !d.date_reglement);
    return {
      aEncaisser: aRegler.reduce((a, d) => a + Number(d.total_ttc || 0), 0),
      nbARegler: aRegler.length,
      duMois: l.filter((d) => d.statut === 'emis' && d.type === 'facture' && (d.date_emission ?? '').startsWith(mois)).reduce((a, d) => a + Number(d.total_ttc || 0), 0)
        - l.filter((d) => d.statut === 'emis' && d.type === 'avoir' && (d.date_emission ?? '').startsWith(mois)).reduce((a, d) => a + Number(d.total_ttc || 0), 0),
      brouillons: l.filter((d) => d.statut === 'brouillon').length,
    };
  }, [docs]);

  const visibles = (docs ?? []).filter((d) => {
    if (filtre === 'a-regler') return d.statut === 'emis' && d.type === 'facture' && !d.date_reglement;
    if (filtre === 'brouillons') return d.statut === 'brouillon';
    if (filtre === 'bons') return d.type === 'bon';
    if (filtre === 'avoirs') return d.type === 'avoir';
    return true;
  });
  const nomClient = (d: DocumentPro) => d.client?.raison_sociale ?? clients.find((c) => c.id === d.client_id)?.raison_sociale ?? 'Client à choisir';

  async function creer(type: TypeDocumentPro, clientId: string | null) {
    const r = await executer('Nouveau document', () => creerBrouillon(type, clientId));
    if (r.ok) router.push(`/gestion/factures/${r.donnees.id}`);
  }

  const retour = (
    <Link href="/gestion/plus" className="-ml-2 mb-2 inline-flex min-h-[44px] items-center gap-1 px-2 text-[14px] font-bold text-olivier-gris">
      <ArrowLeft className="h-5 w-5" aria-hidden="true" /> Plus
    </Link>
  );
  if (!peut('clients')) return (<>{retour}<Carte><p>Réservé à l’administrateur et au gérant.</p></Carte></>);

  return (
    <>
      {retour}
      <EnTete
        titre="Factures pros"
        droite={<button type="button" disabled={!enLigne} onClick={() => setNouveau(true)} aria-label="Nouveau document" className="flex h-10 w-10 items-center justify-center rounded-xl bg-olivier text-lin disabled:opacity-40"><Plus className="h-5 w-5" /></button>}
      />
      {erreur && !docs ? <Carte><p>Impossible de charger les documents. Vérifiez la connexion.</p></Carte> : !docs ? <Chargement lignes={4} /> : (
        <>
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-3xl border border-[#E3D6C4] bg-white p-4">
              <b className={`block text-[22px] leading-none ${resume.aEncaisser > 0 ? 'text-terre-cuite' : ''}`}>{formatPrix(resume.aEncaisser)}</b>
              <span className="mt-1.5 block text-[12.5px] font-bold text-olivier-gris">à encaisser · {resume.nbARegler} facture{resume.nbARegler > 1 ? 's' : ''}</span>
            </div>
            <div className="rounded-3xl border border-[#E3D6C4] bg-white p-4">
              <b className="block text-[22px] leading-none">{formatPrix(resume.duMois)}</b>
              <span className="mt-1.5 block text-[12.5px] font-bold text-olivier-gris">facturé ce mois-ci (TTC)</span>
            </div>
          </div>

          <div className="-mx-4 mt-3 flex gap-2 overflow-x-auto px-4 pb-1 [scrollbar-width:none]" role="tablist">
            {([['tous', 'Tous'], ['a-regler', 'À régler'], ['brouillons', 'Brouillons'], ['bons', 'Bons'], ['avoirs', 'Avoirs']] as const).map(([cle, libelle]) => {
              const n = cle === 'a-regler' ? resume.nbARegler : cle === 'brouillons' ? resume.brouillons : 0;
              return (
                <button key={cle} type="button" role="tab" aria-selected={filtre === cle} onClick={() => setFiltre(cle)} className={`flex min-h-[40px] flex-none items-center gap-1.5 rounded-full border px-3.5 text-[13.5px] font-bold ${filtre === cle ? 'border-olivier bg-olivier text-lin' : 'border-[#E3D6C4] bg-white'}`}>
                  {libelle}{n > 0 && <span className={`rounded-full px-1.5 text-[11.5px] ${filtre === cle ? 'bg-lin/20' : 'bg-lin'}`}>{n}</span>}
                </button>
              );
            })}
          </div>

          {visibles.length === 0 ? (
            <Carte className="mt-3"><p className="text-[14.5px] text-olivier-doux">{docs.length ? 'Aucun document ici.' : 'Aucune facture pro pour l’instant. Appuyez sur « + » pour en créer une.'}</p></Carte>
          ) : (
            <ul className="mt-3 space-y-2">
              {visibles.map((d) => {
                const e = etatDocument(d);
                return (
                  <li key={d.id}>
                    <Link href={`/gestion/factures/${d.id}`} className="flex items-center gap-3 rounded-2xl border border-[#E3D6C4] bg-white px-4 py-3 active:bg-[#FBF6F0]">
                      <span className="min-w-0 flex-1">
                        <b className="block truncate text-[15px]">{d.statut === 'emis' ? d.numero : `${LIBELLE_TYPE[d.type]} (brouillon)`} · {nomClient(d)}</b>
                        <span className="block truncate text-[12.5px] text-olivier-gris">
                          {d.statut === 'emis'
                            ? [dateCourte(d.date_emission), d.type === 'facture' ? (d.date_reglement ? `réglée le ${dateCourte(d.date_reglement)}` : `échéance ${dateCourte(d.date_echeance)}`) : null].filter(Boolean).join(' · ')
                            : `${d.lignes.length} ligne${d.lignes.length > 1 ? 's' : ''} · créé le ${dateCourte(d.cree_le)}`}
                        </span>
                      </span>
                      <span className="flex flex-none flex-col items-end gap-1">
                        {d.statut === 'emis' && d.type !== 'bon' && <b className="text-[14.5px]">{d.type === 'avoir' ? '−' : ''}{formatPrix(Number(d.total_ttc || 0))}</b>}
                        <span className="rounded-full px-2.5 py-0.5 text-[11.5px] font-extrabold" style={{ background: e.fond, color: e.texte }}>{e.libelle}</span>
                      </span>
                      <ChevronRight className="h-5 w-5 flex-none text-olivier-pale" aria-hidden="true" />
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}

          <Link href="/gestion/factures/clients" className="mt-4 flex min-h-[60px] items-center justify-between rounded-3xl border border-[#E3D6C4] bg-white px-4">
            <span><b className="block text-[15px]">Clients pros</b><span className="text-[12.5px] text-olivier-gris">{clients.length} enregistré{clients.length > 1 ? 's' : ''}</span></span>
            <span className="text-[14px] font-extrabold text-brique">Gérer ›</span>
          </Link>
        </>
      )}

      {nouveau && (
        <NouveauDocument clients={clients.filter((c) => c.actif)} fermer={() => setNouveau(false)} creer={(t, c) => { setNouveau(false); void creer(t, c); }} />
      )}
    </>
  );
}

function NouveauDocument({ clients, fermer, creer }: { clients: ClientPro[]; fermer: () => void; creer: (t: TypeDocumentPro, c: string | null) => void }) {
  const [type, setType] = useState<TypeDocumentPro>('facture');
  const [client, setClient] = useState<string>('');
  return (
    <Feuille titre="Nouveau document" fermer={fermer}>
      <div className="space-y-3 px-4">
        <div className="grid grid-cols-2 gap-1 rounded-2xl bg-[#EFE6D8] p-1">
          {([['facture', 'Facture'], ['bon', 'Bon de livraison']] as const).map(([cle, l]) => (
            <button key={cle} type="button" aria-pressed={type === cle} onClick={() => setType(cle)} className={`min-h-[44px] rounded-xl text-[14px] font-bold ${type === cle ? 'bg-white shadow-sm' : 'text-olivier-gris'}`}>{l}</button>
          ))}
        </div>
        <label htmlFor="client" className="block text-[12.5px] font-bold text-olivier-gris">Client</label>
        {clients.length ? (
          <select id="client" value={client} onChange={(e) => setClient(e.target.value)} className="w-full rounded-2xl border border-[#E3D6C4] bg-[#FBF6F0] px-3.5 py-3 text-[16px]">
            <option value="">Choisir plus tard</option>
            {clients.map((c) => <option key={c.id} value={c.id}>{c.raison_sociale}</option>)}
          </select>
        ) : (
          <p className="text-[13.5px] text-olivier-gris">Aucun client pro enregistré : vous pourrez l’ajouter dans le brouillon.</p>
        )}
        <button type="button" onClick={() => creer(type, client || null)} className="min-h-[52px] w-full rounded-2xl bg-olivier text-[15px] font-extrabold text-lin">Créer le brouillon</button>
      </div>
    </Feuille>
  );
}
