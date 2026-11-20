'use client';
// Catalogue et stock rapide : − / + ajoutés côté serveur (deux téléphones ne
// s'écrasent pas), appui sur le stock pour le fixer ou masquer le produit.
import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { Minus, Plus, Search, X } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { etiquettesPromo, estEnPromo } from '@/lib/promos';
import {
  ajusterStock, COLONNES_PRODUIT, estIllimite, estStockBas, prixAffiche, stockLisible, type Produit,
} from '@/lib/gestion/produits';
import { ecrireMemoire, lireMemoire } from '@/lib/gestion/memoire';
import { useChangements, useGestion } from '@/components/gestion/AppliGestion';
import { Carte, Chargement, DonneesDu, EnTete } from '@/components/gestion/Elements';
import FeuilleStock from '@/components/gestion/FeuilleStock';

type Filtre = 'tous' | 'bas' | 'promo' | 'Fruits' | 'Légumes' | 'masques';
type Donnees = { produits: Produit[]; versions: Record<string, number> };
const CLE = 'produits';

export default function PageProduits() {
  const { executer, enLigne, peut } = useGestion();
  const [d, setD] = useState<Donnees | null>(() => lireMemoire<Donnees>(CLE)?.valeur ?? null);
  const [le, setLe] = useState<number | null>(() => lireMemoire<Donnees>(CLE)?.le ?? null);
  const [erreur, setErreur] = useState(false);
  const [filtre, setFiltre] = useState<Filtre>('tous');
  const [recherche, setRecherche] = useState('');
  const [enCours, setEnCours] = useState<string | null>(null);
  const [feuille, setFeuille] = useState<Produit | null>(null);

  const charger = useCallback(async () => {
    const [p, v] = await Promise.all([
      supabase.from('products').select(COLONNES_PRODUIT).order('name'),
      supabase.from('product_variants').select('product_id, actif'),
    ]);
    if (p.error) { setErreur(true); return; }
    const versions: Record<string, number> = {};
    for (const x of (v.data ?? []) as { product_id: string; actif: boolean }[]) if (x.actif) versions[x.product_id] = (versions[x.product_id] ?? 0) + 1;
    const donnees = { produits: p.data as Produit[], versions };
    setD(donnees);
    setLe(null);
    setErreur(false);
    ecrireMemoire(CLE, donnees);
  }, []);
  useEffect(() => {
    const t = setTimeout(() => { void charger(); }, 0);
    return () => clearTimeout(t);
  }, [charger]);
  useChangements(['products', 'product_variants'], () => { void charger(); });

  const comptes = useMemo(() => {
    const l = d?.produits ?? [];
    return {
      tous: l.length,
      bas: l.filter((p) => p.actif && estStockBas(p.stock)).length,
      promo: l.filter((p) => p.actif && estEnPromo(p)).length,
      masques: l.filter((p) => !p.actif).length,
    } as Partial<Record<Filtre, number>>;
  }, [d]);

  const visibles = useMemo(() => {
    const q = recherche.trim().toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
    return (d?.produits ?? []).filter((p) => {
      if (q && !p.name.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').includes(q)) return false;
      if (filtre === 'bas') return p.actif && estStockBas(p.stock);
      if (filtre === 'promo') return p.actif && estEnPromo(p);
      if (filtre === 'masques') return !p.actif;
      if (filtre === 'Fruits' || filtre === 'Légumes') return p.category === filtre;
      return true;
    });
  }, [d, filtre, recherche]);

  async function plusMoins(p: Produit, delta: number) {
    setEnCours(p.id);
    // Le nouveau stock s'affiche quand le serveur l'a confirmé
    // Vendu au gramme : le stock est en grammes, on ajoute ou retire 1 kg
    const pas = p.unite === 'g' ? 1000 : 1;
    const r = await executer(`Stock de ${p.name}`, () => ajusterStock(p.id, null, delta * pas));
    if (r.ok) setD((avant) => avant && { ...avant, produits: avant.produits.map((x) => (x.id === p.id ? { ...x, stock: r.donnees.stock, updated_at: r.donnees.updated_at } : x)) });
    setEnCours(null);
  }

  const FILTRES: { cle: Filtre; libelle: string }[] = [
    { cle: 'tous', libelle: 'Tous' }, { cle: 'bas', libelle: 'Stock bas' }, { cle: 'promo', libelle: 'En promo' },
    { cle: 'Fruits', libelle: 'Fruits' }, { cle: 'Légumes', libelle: 'Légumes' }, { cle: 'masques', libelle: 'Masqués' },
  ];

  return (
    <>
      <EnTete
        titre="Produits"
        droite={peut('catalogue') ? (
          <Link href="/gestion/produits/nouveau" aria-label="Nouveau produit" className="flex h-10 w-10 items-center justify-center rounded-xl bg-olivier text-lin">
            <Plus className="h-5 w-5" />
          </Link>
        ) : undefined}
      />
      <label className="relative block">
        <span className="sr-only">Rechercher un produit</span>
        <Search className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-olivier-pale" aria-hidden="true" />
        <input type="search" value={recherche} onChange={(e) => setRecherche(e.target.value)} placeholder="Rechercher un produit…" className="w-full rounded-2xl border border-[#E3D6C4] bg-white py-3.5 pl-12 pr-12 text-[16px] outline-none focus:border-olivier" />
        {recherche && (
          <button type="button" onClick={() => setRecherche('')} aria-label="Effacer la recherche" className="absolute right-1 top-1/2 flex h-11 w-11 -translate-y-1/2 items-center justify-center text-olivier-pale"><X className="h-5 w-5" /></button>
        )}
      </label>
      <div className="-mx-4 mt-3 flex gap-2 overflow-x-auto px-4 pb-1 [scrollbar-width:none]" role="tablist" aria-label="Filtre">
        {FILTRES.map((f) => {
          const on = filtre === f.cle;
          const n = comptes[f.cle];
          return (
            <button key={f.cle} type="button" role="tab" aria-selected={on} onClick={() => setFiltre(f.cle)} className={`flex min-h-[40px] flex-none items-center gap-1.5 rounded-full border px-3.5 text-[13.5px] font-bold ${on ? 'border-olivier bg-olivier text-lin' : 'border-[#E3D6C4] bg-white'}`}>
              {f.libelle}
              {!!n && <span className={`rounded-full px-1.5 text-[11.5px] ${on ? 'bg-lin/20' : f.cle === 'bas' ? 'bg-terre-pale text-brique' : 'bg-lin'}`}>{n}</span>}
            </button>
          );
        })}
      </div>

      <div className="mt-4">
        <DonneesDu le={le} />
        {erreur && !d ? (
          <Carte><p className="text-[14px]">Impossible de charger les produits. Vérifiez la connexion.</p></Carte>
        ) : !d ? (
          <Chargement lignes={5} />
        ) : visibles.length === 0 ? (
          <Carte><p className="text-[14.5px] text-olivier-doux">Aucun produit ici.</p></Carte>
        ) : (
          <ul className="space-y-2">
            {visibles.map((p) => {
              const promo = etiquettesPromo(p)[0];
              const illimite = estIllimite(p.stock);
              const bas = estStockBas(p.stock);
              const occupe = enCours === p.id;
              const n = d.versions[p.id];
              return (
                <li key={p.id} className={`flex items-center gap-3 rounded-2xl border border-[#E3D6C4] bg-white py-2 pl-2 pr-2 ${p.actif ? '' : 'opacity-70'}`}>
                  <Link href={`/gestion/produits/${p.id}`} className="flex min-w-0 flex-1 items-center gap-3">
                    {p.image_url ? <img src={p.image_url} alt="" loading="lazy" className="h-11 w-[60px] flex-none rounded-xl object-cover" /> : <span className="h-11 w-[60px] flex-none rounded-xl bg-lin" />}
                    <span className="min-w-0 flex-1">
                      <b className="block text-[15px] leading-snug [overflow-wrap:anywhere]">{p.name}</b>
                      <span className="block truncate text-[12.5px] text-olivier-gris">
                        {bas && p.actif && <span className="mr-1 rounded-full bg-terre-pale px-1.5 text-[11px] font-extrabold text-brique">stock bas</span>}
                        {promo && <span className="mr-1 rounded-full bg-terre-cuite px-1.5 text-[11px] font-extrabold text-white">{promo.court}</span>}
                        {[prixAffiche(p), !p.actif ? 'masqué du site' : null, bas ? null : p.provenance, n ? `${n} version${n > 1 ? 's' : ''}` : null].filter(Boolean).join(' · ')}
                      </span>
                    </span>
                  </Link>
                  <div className="flex flex-none items-center gap-1">
                    <button type="button" aria-label={`Retirer 1 au stock de ${p.name}`} disabled={illimite || occupe || !enLigne || (p.stock ?? 0) < (p.unite === 'g' ? 1000 : 1)} onClick={() => plusMoins(p, -1)} className="flex h-11 w-11 items-center justify-center rounded-xl bg-lin disabled:opacity-30">
                      <Minus className="h-4 w-4" />
                    </button>
                    <button type="button" onClick={() => setFeuille(p)} aria-label={`Stock de ${p.name} : ${illimite ? 'illimité' : p.stock}. Modifier`} className={`min-w-[44px] rounded-xl px-1 py-2 text-center text-[16px] font-extrabold ${bas ? 'text-brique' : ''} ${occupe ? 'opacity-40' : ''}`}>
                      {stockLisible(p.stock, p.unite)}
                    </button>
                    <button type="button" aria-label={`Ajouter 1 au stock de ${p.name}`} disabled={illimite || occupe || !enLigne} onClick={() => plusMoins(p, 1)} className="flex h-11 w-11 items-center justify-center rounded-xl bg-olivier text-lin disabled:opacity-30">
                      <Plus className="h-4 w-4" />
                    </button>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
        {d && <p className="mt-3 text-center text-[12px] leading-relaxed text-olivier-gris">Appuyez sur le stock pour le fixer, le rendre illimité ou masquer le produit. Chaque + ou − est ajouté côté serveur.</p>}
      </div>

      {feuille && (
        <FeuilleStock
          cible={{ produit: feuille.id, variante: null, nom: feuille.name, stock: feuille.stock, actif: feuille.actif, unite: feuille.unite }}
          fermer={() => setFeuille(null)}
          apres={charger}
        />
      )}
    </>
  );
}
