'use client';
// Préparation en série d'une journée de livraison :
//  - « Commande par commande » : les articles à cocher, puis la suivante ;
//  - « Liste de préparation » : le total de chaque produit pour la journée.
// Les cases cochées restent sur ce téléphone (aide à la préparation) ; seul le
// passage « En préparation » est enregistré, et confirmé par le serveur.
import { Suspense, useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { ArrowLeft, Check } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { formatPrix } from '@/lib/format';
import { COLONNES, lignes, nomLigne, quantiteLigne, statutDe, ville, type Commande, type LignePanier } from '@/lib/gestion/commandes';
import { ecrireMemoire, lireMemoire } from '@/lib/gestion/memoire';
import { useChangements, useGestion } from '@/components/gestion/AppliGestion';
import { useStatut } from '@/components/gestion/useStatut';
import { aujourdhui, Carte, Chargement, dateCourte, PastilleStatut } from '@/components/gestion/Elements';

export default function PagePreparation() {
  return (
    <Suspense fallback={<Chargement />}>
      <Preparation />
    </Suspense>
  );
}

function Preparation() {
  const params = useSearchParams();
  const date = /^\d{4}-\d{2}-\d{2}$/.test(params.get('date') ?? '') ? params.get('date')! : aujourdhui();
  const { enLigne } = useGestion();
  const [vue, setVue] = useState<'commandes' | 'liste'>('commandes');
  const [commandes, setCommandes] = useState<Commande[] | null>(null);
  const [index, setIndex] = useState(0);
  const cleCoches = `preparation-${date}`;
  const [coches, setCoches] = useState<Record<string, boolean>>(() => lireMemoire<Record<string, boolean>>(cleCoches)?.valeur ?? {});

  const charger = useCallback(async () => {
    const { data, error } = await supabase.from('commandes').select(COLONNES).eq('date_livraison', date).order('created_at', { ascending: true });
    if (error) return;
    setCommandes((data as Commande[]).filter((c) => statutDe(c) !== 'annulee'));
  }, [date]);
  useEffect(() => {
    const t = setTimeout(() => { void charger(); }, 0);
    return () => clearTimeout(t);
  }, [charger]);
  useChangements(['commandes'], () => { void charger(); });
  const { changer, enCours } = useStatut();

  const aPreparer = useMemo(() => (commandes ?? []).filter((c) => ['nouvelle', 'preparation'].includes(statutDe(c))), [commandes]);
  const i = Math.min(index, Math.max(0, aPreparer.length - 1));
  const c = aPreparer[i];

  const basculer = (cle: string) => {
    setCoches((avant) => {
      const apres = { ...avant, [cle]: !avant[cle] };
      ecrireMemoire(cleCoches, apres);
      return apres;
    });
  };

  // Total de chaque produit pour la journée
  const liste = useMemo(() => {
    const m = new Map<string, { nom: string; unite: string | null | undefined; q: number; n: number }>();
    for (const cmd of aPreparer) {
      for (const l of lignes(cmd)) {
        const nom = nomLigne(l);
        const k = `${nom}|${l.unite ?? ''}`;
        const e = m.get(k) ?? { nom, unite: l.unite, q: 0, n: 0 };
        e.q += Number(l.quantite) || 0;
        e.n += 1;
        m.set(k, e);
      }
    }
    return [...m.values()].sort((a, b) => a.nom.localeCompare(b.nom, 'fr'));
  }, [aPreparer]);

  const titreJour = date === aujourdhui() ? 'aujourd’hui' : date === aujourdhui(1) ? 'demain' : dateCourte(date);

  return (
    <>
      <Link href="/gestion/commandes" className="-ml-2 mb-2 inline-flex min-h-[44px] items-center gap-1 px-2 text-[14px] font-bold text-olivier-gris">
        <ArrowLeft className="h-5 w-5" aria-hidden="true" /> Commandes
      </Link>
      <h1 className="titre text-[28px] leading-tight">Préparation</h1>
      <p className="text-[13.5px] text-olivier-gris">
        Livraison {titreJour}{aPreparer.length ? ` · ${aPreparer.length} commande${aPreparer.length > 1 ? 's' : ''}` : ''}
      </p>

      <div className="mt-3 grid grid-cols-2 gap-1 rounded-2xl bg-[#EFE6D8] p-1" role="tablist">
        {([['commandes', 'Commande par commande'], ['liste', 'Liste de préparation']] as const).map(([cle, libelle]) => (
          <button key={cle} type="button" role="tab" aria-selected={vue === cle} onClick={() => setVue(cle)} className={`min-h-[44px] rounded-xl text-[13.5px] font-bold ${vue === cle ? 'bg-white shadow-sm' : 'text-olivier-gris'}`}>
            {libelle}
          </button>
        ))}
      </div>

      <div className="mt-4">
        {!commandes ? (
          <Chargement />
        ) : aPreparer.length === 0 ? (
          <Carte><p className="text-[14.5px] text-olivier-doux">Toutes les commandes de ce jour sont préparées ou parties en livraison.</p></Carte>
        ) : vue === 'liste' ? (
          <Carte className="!p-0">
            <ul className="divide-y divide-[#F0E7DA]">
              {liste.map((p) => {
                const cle = `liste|${p.nom}|${p.unite ?? ''}`;
                return (
                  <li key={cle}>
                    <button type="button" onClick={() => basculer(cle)} aria-pressed={!!coches[cle]} className="flex min-h-[56px] w-full items-center gap-3 px-4 py-2 text-left">
                      <Case on={!!coches[cle]} />
                      <span className={`flex-1 text-[15px] ${coches[cle] ? 'text-olivier-pale line-through' : 'font-bold'}`}>{p.nom}</span>
                      <span className="text-right">
                        <b className="block text-[15px]">{quantiteLigne({ unite: p.unite, quantite: Math.round(p.q * 1000) / 1000 })}</b>
                        <span className="text-[11.5px] text-olivier-gris">{p.n} commande{p.n > 1 ? 's' : ''}</span>
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          </Carte>
        ) : c ? (
          <>
            <p className="mb-2 text-[13px] font-bold text-olivier-gris">Commande {i + 1} sur {aPreparer.length}</p>
            <Carte className="mb-3">
              <div className="flex items-start justify-between gap-3">
                <Link href={`/gestion/commandes/${c.id}`} className="min-w-0">
                  <b className="block text-[17px]">N° {c.id} · {c.nom_client || 'Client'}</b>
                  <span className="text-[13px] text-olivier-gris">{ville(c.adresse_livraison)} · {lignes(c).length} articles</span>
                </Link>
                <span className="flex flex-col items-end gap-1">
                  <b className="text-[15px]">{formatPrix(Number(c.total) || 0)}</b>
                  <PastilleStatut statut={statutDe(c)} petite />
                </span>
              </div>
              {c.commentaire_client && <p className="mt-2 rounded-xl bg-[#FFF6E2] px-3 py-2 text-[13.5px]">« {c.commentaire_client} »</p>}
            </Carte>
            <Carte className="!p-0">
              <ul className="divide-y divide-[#F0E7DA]">
                {lignes(c).map((l: LignePanier, k) => {
                  const cle = `${c.id}|${k}`;
                  return (
                    <li key={cle}>
                      <button type="button" onClick={() => basculer(cle)} aria-pressed={!!coches[cle]} className="flex min-h-[56px] w-full items-center gap-3 px-4 py-2 text-left">
                        <Case on={!!coches[cle]} />
                        <span className={`flex-1 text-[15px] ${coches[cle] ? 'text-olivier-pale line-through' : 'font-bold'}`}>{nomLigne(l)}</span>
                        <b className="text-[15px]">{quantiteLigne(l)}</b>
                      </button>
                    </li>
                  );
                })}
              </ul>
            </Carte>
            <p className="mt-3 rounded-2xl bg-terre-pale px-4 py-3 text-[12.5px] leading-relaxed text-brique">
              <b>Prix figé à la commande.</b> Le contenu et le montant d’une commande ne se modifient jamais après validation par le client.
            </p>

            <div className="sticky bottom-[calc(84px+env(safe-area-inset-bottom))] z-30 mt-4 flex gap-2">
              {i > 0 && (
                <button type="button" onClick={() => setIndex(i - 1)} className="min-h-[56px] rounded-2xl border border-[#E3D6C4] bg-white px-4 font-bold shadow-lg">←</button>
              )}
              {statutDe(c) === 'nouvelle' ? (
                <button type="button" disabled={enCours === c.id || !enLigne} onClick={() => changer(c, 'preparation')} className="min-h-[56px] flex-1 rounded-2xl bg-olivier text-[15.5px] font-extrabold text-lin shadow-lg disabled:opacity-50">
                  {enCours === c.id ? 'Enregistrement…' : !enLigne ? 'Hors connexion' : 'Commencer la préparation'}
                </button>
              ) : (
                <button type="button" disabled={i >= aPreparer.length - 1} onClick={() => setIndex(i + 1)} className="min-h-[56px] flex-1 rounded-2xl bg-olivier text-[15.5px] font-extrabold text-lin shadow-lg disabled:opacity-50">
                  {i >= aPreparer.length - 1 ? 'Dernière commande du jour' : 'Prête · commande suivante →'}
                </button>
              )}
            </div>
          </>
        ) : null}
      </div>
    </>
  );
}

function Case({ on }: { on: boolean }) {
  return (
    <span className={`flex h-7 w-7 flex-none items-center justify-center rounded-lg border-2 ${on ? 'border-olivier bg-olivier text-lin' : 'border-[#CDBFAE]'}`} aria-hidden="true">
      {on && <Check className="h-4 w-4" strokeWidth={3} />}
    </span>
  );
}
