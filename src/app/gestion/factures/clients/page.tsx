'use client';
// Carnet des clients professionnels (raison sociale, SIREN, TVA, adresses)
import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, ChevronRight, Plus } from 'lucide-react';
import type { ClientPro } from '@/lib/facturePro';
import { listerClientsPro } from '@/lib/gestion/documentsPro';
import { useGestion } from '@/components/gestion/AppliGestion';
import { Carte, Chargement, EnTete } from '@/components/gestion/Elements';
import FicheClientPro from '@/components/gestion/FicheClientPro';

export default function ClientsPro() {
  const { peut, enLigne } = useGestion();
  const [clients, setClients] = useState<ClientPro[] | null>(null);
  const [edition, setEdition] = useState<ClientPro | 'nouveau' | null>(null);

  const charger = useCallback(async () => {
    try { setClients(await listerClientsPro()); } catch { setClients((c) => c ?? []); }
  }, []);
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

  return (
    <>
      {retour}
      <EnTete
        titre="Clients pros"
        droite={<button type="button" disabled={!enLigne} onClick={() => setEdition('nouveau')} aria-label="Nouveau client pro" className="flex h-10 w-10 items-center justify-center rounded-xl bg-olivier text-lin disabled:opacity-40"><Plus className="h-5 w-5" /></button>}
      />
      {!clients ? <Chargement /> : clients.length === 0 ? (
        <Carte><p className="text-[14.5px] text-olivier-doux">Aucun client pro. Appuyez sur « + » pour enregistrer un restaurant, une crèche, un traiteur…</p></Carte>
      ) : (
        <ul className="space-y-2">
          {clients.map((c) => (
            <li key={c.id}>
              <button type="button" onClick={() => setEdition(c)} className={`flex w-full items-center gap-3 rounded-2xl border border-[#E3D6C4] px-4 py-3 text-left ${c.actif ? 'bg-white' : 'bg-[#E6DED2]'}`}>
                <span className="min-w-0 flex-1">
                  <b className={`block truncate text-[15px] ${c.actif ? '' : 'text-[#8C877E]'}`}>{c.raison_sociale}{!c.actif && ' · archivé'}</b>
                  <span className="block truncate text-[12.5px] text-olivier-gris">{[c.siren ? `SIREN ${c.siren.replace(/(\d{3})(?=\d)/g, '$1 ')}` : 'SIREN à compléter', c.adresse_facturation].join(' · ')}</span>
                </span>
                <ChevronRight className="h-5 w-5 flex-none text-olivier-pale" aria-hidden="true" />
              </button>
            </li>
          ))}
        </ul>
      )}
      {edition && <FicheClientPro client={edition === 'nouveau' ? null : edition} fermer={() => setEdition(null)} apres={() => { setEdition(null); void charger(); }} />}
    </>
  );
}
