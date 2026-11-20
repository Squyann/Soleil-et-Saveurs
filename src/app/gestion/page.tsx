'use client';
// Accueil : l'essentiel du jour, mis à jour en direct
import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { ChevronRight } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { formatPrix } from '@/lib/format';
import { statutNormalise, type Statut } from '@/lib/gestion/statuts';
import { LIBELLE_ROLE } from '@/lib/gestion/roles';
import { lireMemoire, ecrireMemoire } from '@/lib/gestion/memoire';
import { useChangements, useGestion } from '@/components/gestion/AppliGestion';
import { aujourdhui, Carte, Chargement, dateCourte, DonneesDu, EnTete, PastilleStatut } from '@/components/gestion/Elements';

type Ligne = {
  id: number;
  created_at: string;
  nom_client: string | null;
  total: number | null;
  statut: string | null;
  date_livraison: string | null;
  creneau_livraison: string | null;
};

const CLE = 'accueil';

export default function Accueil() {
  const { role, prenom, peut } = useGestion();
  // Écran affiché seulement après lecture de la session (jamais côté serveur) :
  // la dernière copie s'affiche tout de suite, puis le serveur la remplace.
  const [lignes, setLignes] = useState<Ligne[] | null>(() => lireMemoire<Ligne[]>(CLE)?.valeur ?? null);
  const [le, setLe] = useState<number | null>(() => lireMemoire<Ligne[]>(CLE)?.le ?? null);
  const [erreur, setErreur] = useState(false);

  const charger = useCallback(async () => {
    const { data, error } = await supabase
      .from('commandes')
      .select('id, created_at, nom_client, total, statut, date_livraison, creneau_livraison')
      .gte('date_livraison', aujourdhui(-1))
      .order('date_livraison', { ascending: true })
      .order('created_at', { ascending: true })
      .limit(300);
    if (error) {
      const m = lireMemoire<Ligne[]>(CLE);
      if (m) { setLignes(m.valeur); setLe(m.le); } else setErreur(true);
      return;
    }
    setLignes(data as Ligne[]);
    setLe(null);
    setErreur(false);
    ecrireMemoire(CLE, data);
  }, []);

  useEffect(() => {
    const t = setTimeout(() => { void charger(); }, 0);
    return () => clearTimeout(t);
  }, [charger]);
  useChangements(['commandes'], () => { charger(); });

  const jour = aujourdhui();
  const demain = aujourdhui(1);
  const resume = useMemo(() => {
    const l = (lignes ?? []).map((c) => ({ ...c, s: statutNormalise(c.statut) as Statut }));
    const actives = l.filter((c) => c.s !== 'annulee');
    const duJour = actives.filter((c) => c.date_livraison === jour);
    return {
      nouvelles: l.filter((c) => c.s === 'nouvelle'),
      aPreparer: actives.filter((c) => (c.s === 'nouvelle' || c.s === 'preparation') && c.date_livraison && c.date_livraison <= demain),
      duJour,
      livreesDuJour: duJour.filter((c) => c.s === 'livree').length,
      montantDuJour: duJour.reduce((a, c) => a + (Number(c.total) || 0), 0),
      demain: actives.filter((c) => c.date_livraison === demain).length,
    };
  }, [lignes, jour, demain]);

  const date = new Date().toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', timeZone: 'Europe/Paris' });

  return (
    <>
      <EnTete titre={prenom ? `Bonjour ${prenom}` : 'Bonjour'} sousTitre={`${date.charAt(0).toUpperCase()}${date.slice(1)} · ${role ? LIBELLE_ROLE[role] : ''}`} />
      <DonneesDu le={le} />

      {erreur && !lignes ? (
        <Carte><p className="text-[14px]">Impossible de charger les commandes. Vérifiez la connexion.</p></Carte>
      ) : !lignes ? (
        <Chargement />
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3">
            <Tuile href="/gestion/commandes?filtre=nouvelles" valeur={resume.nouvelles.length} libelle="Nouvelles" accent={resume.nouvelles.length > 0} />
            <Tuile href="/gestion/commandes?filtre=a-preparer" valeur={resume.aPreparer.length} libelle="À préparer" detail="aujourd’hui et demain" />
            <Tuile href="/gestion/commandes?filtre=aujourdhui" valeur={`${resume.livreesDuJour}/${resume.duJour.length}`} libelle="Livrées aujourd’hui" />
            {peut('clients') ? (
              <Tuile valeur={formatPrix(resume.montantDuJour)} libelle="Montant du jour" detail="commandes livrées ou prévues" />
            ) : (
              <Tuile href="/gestion/commandes?filtre=demain" valeur={resume.demain} libelle="Demain" />
            )}
          </div>

          <h2 className="mt-6 mb-2 text-[13px] font-extrabold uppercase tracking-[0.08em] text-olivier-gris">À traiter en premier</h2>
          {resume.aPreparer.length === 0 && resume.nouvelles.length === 0 ? (
            <Carte><p className="text-[14.5px] text-olivier-doux">Rien en attente. Les nouvelles commandes apparaîtront ici dès leur arrivée.</p></Carte>
          ) : (
            <ul className="space-y-2">
              {[...new Map([...resume.nouvelles, ...resume.aPreparer].map((c) => [c.id, c])).values()].slice(0, 8).map((c) => (
                <li key={c.id}>
                  <Link href={`/gestion/commandes/${c.id}`} className="flex items-center gap-3 rounded-2xl border border-[#E3D6C4] bg-white px-4 py-3 active:bg-[#FBF6F0]">
                    <span className="min-w-0 flex-1">
                      <b className="block truncate text-[15px]">N° {c.id} · {c.nom_client || 'Client'}</b>
                      <span className="text-[12.5px] text-olivier-gris">
                        {dateCourte(c.date_livraison)}{c.creneau_livraison ? ` · ${c.creneau_livraison}` : ''} · {formatPrix(Number(c.total) || 0)}
                      </span>
                    </span>
                    <PastilleStatut statut={c.s} petite />
                    <ChevronRight className="h-5 w-5 flex-none text-olivier-pale" aria-hidden="true" />
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </>
      )}
    </>
  );
}

function Tuile({ valeur, libelle, detail, href, accent }: { valeur: React.ReactNode; libelle: string; detail?: string; href?: string; accent?: boolean }) {
  const contenu = (
    <>
      <span className={`block text-[28px] font-extrabold leading-none tracking-tight ${accent ? 'text-terre-cuite' : ''}`}>{valeur}</span>
      <span className="mt-2 block text-[13.5px] font-bold">{libelle}</span>
      {detail && <span className="block text-[11.5px] text-olivier-gris">{detail}</span>}
    </>
  );
  const classe = 'block min-h-[104px] rounded-3xl border border-[#E3D6C4] bg-white p-4';
  return href ? <Link href={href} className={`${classe} active:bg-[#FBF6F0]`}>{contenu}</Link> : <div className={classe}>{contenu}</div>;
}
