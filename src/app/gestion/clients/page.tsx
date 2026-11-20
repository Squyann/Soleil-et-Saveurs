'use client';
// Clients : recherche et liste (réservées à l'administrateur et au gérant,
// contrôlé par la base : gestion_clients refuse les autres rôles)
import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { ChevronRight, Search, X } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { formatPrix } from '@/lib/format';
import { ville } from '@/lib/gestion/commandes';
import { ecrireMemoire, lireMemoire } from '@/lib/gestion/memoire';
import { useGestion } from '@/components/gestion/AppliGestion';
import { Carte, Chargement, DonneesDu, EnTete } from '@/components/gestion/Elements';

type ClientLigne = {
  user_id: string; email: string; nom: string | null; telephone: string | null; adresse: string | null; inscrit_le: string;
  nb_commandes: number; total: number; derniere_commande: string | null; accepte_offres: boolean; points: number;
};
const CLE = 'clients';

export default function PageClients() {
  const { peut } = useGestion();
  const [recherche, setRecherche] = useState('');
  const [clients, setClients] = useState<ClientLigne[] | null>(() => lireMemoire<ClientLigne[]>(CLE)?.valeur ?? null);
  const [le, setLe] = useState<number | null>(() => lireMemoire<ClientLigne[]>(CLE)?.le ?? null);
  const [erreur, setErreur] = useState('');
  const dernier = useRef(0);

  const charger = useCallback(async (q: string) => {
    const n = ++dernier.current;
    const { data, error } = await supabase.rpc('gestion_clients', { p_recherche: q || null, p_limite: 200, p_decalage: 0 });
    if (n !== dernier.current) return; // une recherche plus récente est en cours
    if (error) { setErreur(/42501|refus/i.test(error.message) ? 'Accès réservé à l’administrateur et au gérant.' : 'Impossible de charger les clients.'); return; }
    setErreur('');
    setClients(data as ClientLigne[]);
    setLe(null);
    if (!q) ecrireMemoire(CLE, data);
  }, []);
  useEffect(() => {
    const t = setTimeout(() => { void charger(recherche.trim()); }, recherche ? 300 : 0);
    return () => clearTimeout(t);
  }, [recherche, charger]);

  if (!peut('clients')) {
    return (<><EnTete titre="Clients" /><Carte><p className="text-[14.5px]">Accès réservé à l’administrateur et au gérant.</p></Carte></>);
  }

  return (
    <>
      <EnTete titre="Clients" sousTitre={clients ? `${clients.length}${clients.length >= 200 ? '+' : ''} client${clients.length > 1 ? 's' : ''}` : undefined} />
      <label className="relative block">
        <span className="sr-only">Rechercher un client</span>
        <Search className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-olivier-pale" aria-hidden="true" />
        <input type="search" value={recherche} onChange={(e) => setRecherche(e.target.value)} placeholder="Nom, e-mail, téléphone, ville…" className="w-full rounded-2xl border border-[#E3D6C4] bg-white py-3.5 pl-12 pr-12 text-[16px] outline-none focus:border-olivier" />
        {recherche && <button type="button" onClick={() => setRecherche('')} aria-label="Effacer la recherche" className="absolute right-1 top-1/2 flex h-11 w-11 -translate-y-1/2 items-center justify-center text-olivier-pale"><X className="h-5 w-5" /></button>}
      </label>
      <div className="mt-4">
        <DonneesDu le={le} />
        {erreur && !clients ? (
          <Carte><p className="text-[14px]">{erreur}</p></Carte>
        ) : !clients ? (
          <Chargement lignes={5} />
        ) : clients.length === 0 ? (
          <Carte><p className="text-[14.5px] text-olivier-doux">Aucun client ne correspond.</p></Carte>
        ) : (
          <ul className="space-y-2">
            {clients.map((c) => (
              <li key={c.user_id}>
                <Link href={`/gestion/clients/${c.user_id}`} className="flex items-center gap-3 rounded-2xl border border-[#E3D6C4] bg-white px-4 py-3 active:bg-[#FBF6F0]">
                  <span className="flex h-10 w-10 flex-none items-center justify-center rounded-full bg-lin text-[15px] font-extrabold" aria-hidden="true">
                    {(c.nom || c.email).trim().charAt(0).toUpperCase()}
                  </span>
                  <span className="min-w-0 flex-1">
                    <b className="block truncate text-[15px]">{c.nom || c.email}</b>
                    <span className="block truncate text-[12.5px] text-olivier-gris">
                      {[ville(c.adresse), c.nb_commandes ? `${c.nb_commandes} commande${c.nb_commandes > 1 ? 's' : ''}` : 'aucune commande', c.derniere_commande ? `dernière le ${new Date(c.derniere_commande).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}` : null].filter(Boolean).join(' · ')}
                    </span>
                  </span>
                  {c.total > 0 && <b className="flex-none text-[14px]">{formatPrix(c.total)}</b>}
                  <ChevronRight className="h-5 w-5 flex-none text-olivier-pale" aria-hidden="true" />
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </>
  );
}
