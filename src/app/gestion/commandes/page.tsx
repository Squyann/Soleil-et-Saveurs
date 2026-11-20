'use client';
// Liste des commandes : recherche, onglets par statut, regroupement par jour
// de livraison, glisser vers la gauche pour l'étape suivante.
import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { ChevronRight, ListChecks, Search, X } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { formatPrix } from '@/lib/format';
import { COLONNES, lignes, statutDe, ville, type Commande } from '@/lib/gestion/commandes';
import { etapeSuivante, LIBELLE_STATUT, type Statut } from '@/lib/gestion/statuts';
import { ecrireMemoire, lireMemoire } from '@/lib/gestion/memoire';
import { useChangements, useGestion } from '@/components/gestion/AppliGestion';
import { useStatut } from '@/components/gestion/useStatut';
import { aujourdhui, Carte, Chargement, dateCourte, DonneesDu, EnTete, PastilleStatut } from '@/components/gestion/Elements';

type Onglet = 'a-traiter' | Statut | 'toutes';
type FiltreDate = 'toutes' | 'aujourdhui' | 'demain';

const ONGLETS: { cle: Onglet; libelle: string }[] = [
  { cle: 'a-traiter', libelle: 'À traiter' },
  { cle: 'nouvelle', libelle: 'Nouvelles' },
  { cle: 'preparation', libelle: 'En préparation' },
  { cle: 'livraison', libelle: 'En livraison' },
  { cle: 'livree', libelle: 'Livrées' },
  { cle: 'annulee', libelle: 'Annulées' },
  { cle: 'toutes', libelle: 'Toutes' },
];
const CLE = 'commandes';

export default function PageCommandes() {
  return (
    <Suspense fallback={<Chargement lignes={4} />}>
      <ListeCommandes />
    </Suspense>
  );
}

function depuisUrl(filtre: string | null): { onglet: Onglet; date: FiltreDate } {
  if (filtre === 'nouvelles') return { onglet: 'nouvelle', date: 'toutes' };
  if (filtre === 'aujourdhui') return { onglet: 'toutes', date: 'aujourdhui' };
  if (filtre === 'demain') return { onglet: 'toutes', date: 'demain' };
  return { onglet: 'a-traiter', date: 'toutes' };
}

function ListeCommandes() {
  const params = useSearchParams();
  const router = useRouter();
  const depart = depuisUrl(params.get('filtre'));
  const [onglet, setOnglet] = useState<Onglet>(depart.onglet);
  const [filtreDate, setFiltreDate] = useState<FiltreDate>(depart.date);
  const [recherche, setRecherche] = useState('');
  const [commandes, setCommandes] = useState<Commande[] | null>(() => lireMemoire<Commande[]>(CLE)?.valeur ?? null);
  const [le, setLe] = useState<number | null>(() => lireMemoire<Commande[]>(CLE)?.le ?? null);
  const [erreur, setErreur] = useState(false);

  const charger = useCallback(async () => {
    const { data, error } = await supabase.from('commandes').select(COLONNES).order('created_at', { ascending: false }).limit(400);
    if (error) { setErreur(true); return; }
    setCommandes(data as Commande[]);
    setLe(null);
    setErreur(false);
    ecrireMemoire(CLE, data);
  }, []);
  useEffect(() => {
    const t = setTimeout(() => { void charger(); }, 0);
    return () => clearTimeout(t);
  }, [charger]);
  useChangements(['commandes'], () => { void charger(); });
  const { changer, enCours } = useStatut();

  const jour = aujourdhui();
  const demain = aujourdhui(1);

  const { groupes, comptes, preparables } = useMemo(() => {
    const q = recherche.trim().toLowerCase();
    const tout = (commandes ?? []).filter((c) => {
      if (filtreDate === 'aujourdhui' && c.date_livraison !== jour) return false;
      if (filtreDate === 'demain' && c.date_livraison !== demain) return false;
      if (!q) return true;
      const tel = (c.telephone_client ?? '').replace(/\D/g, '');
      return String(c.id).includes(q) || (c.nom_client ?? '').toLowerCase().includes(q) || (c.adresse_livraison ?? '').toLowerCase().includes(q)
        || (q.replace(/\D/g, '').length >= 3 && tel.includes(q.replace(/\D/g, '')));
    });
    const comptes: Partial<Record<Onglet, number>> = {};
    for (const c of tout) {
      const s = statutDe(c);
      comptes[s] = (comptes[s] ?? 0) + 1;
      if (s === 'nouvelle' || s === 'preparation' || s === 'livraison') comptes['a-traiter'] = (comptes['a-traiter'] ?? 0) + 1;
    }
    const visibles = tout.filter((c) => {
      const s = statutDe(c);
      if (onglet === 'toutes') return true;
      if (onglet === 'a-traiter') return s === 'nouvelle' || s === 'preparation' || s === 'livraison';
      return s === onglet;
    });
    const termine = onglet === 'livree' || onglet === 'annulee' || onglet === 'toutes';
    const parJour = new Map<string, Commande[]>();
    for (const c of visibles) {
      const d = c.date_livraison ?? '';
      if (!parJour.has(d)) parJour.set(d, []);
      parJour.get(d)!.push(c);
    }
    const groupes = [...parJour.entries()]
      .sort(([a], [b]) => (termine ? b.localeCompare(a) : (a || '9999').localeCompare(b || '9999')))
      .map(([d, l]) => ({ date: d, commandes: l.sort((x, y) => x.created_at.localeCompare(y.created_at)) }));
    // Jours avec des commandes à préparer (préparation en série)
    const preparables = new Map<string, number>();
    for (const c of commandes ?? []) {
      const s = statutDe(c);
      if ((s === 'nouvelle' || s === 'preparation') && c.date_livraison && c.date_livraison >= jour) preparables.set(c.date_livraison, (preparables.get(c.date_livraison) ?? 0) + 1);
    }
    return { groupes, comptes, preparables: [...preparables.entries()].sort(([a], [b]) => a.localeCompare(b)) };
  }, [commandes, recherche, onglet, filtreDate, jour, demain]);

  const titreJour = (d: string) => {
    if (!d) return 'Sans date de livraison';
    const libelle = dateCourte(d);
    if (d === jour) return `Aujourd’hui · ${libelle}`;
    if (d === demain) return `Livraison demain · ${libelle}`;
    return `Livraison ${libelle}`;
  };

  return (
    <>
      <EnTete titre="Commandes" />

      <label className="relative block">
        <span className="sr-only">Rechercher une commande</span>
        <Search className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-olivier-pale" aria-hidden="true" />
        <input
          type="search"
          value={recherche}
          onChange={(e) => setRecherche(e.target.value)}
          placeholder="N°, nom, téléphone, ville…"
          className="w-full rounded-2xl border border-[#E3D6C4] bg-white py-3.5 pl-12 pr-12 text-[16px] outline-none focus:border-olivier"
        />
        {recherche && (
          <button type="button" onClick={() => setRecherche('')} aria-label="Effacer la recherche" className="absolute right-1 top-1/2 flex h-11 w-11 -translate-y-1/2 items-center justify-center text-olivier-pale">
            <X className="h-5 w-5" />
          </button>
        )}
      </label>

      <div className="-mx-4 mt-3 flex gap-2 overflow-x-auto px-4 pb-1 [scrollbar-width:none]" role="tablist" aria-label="Statut">
        {ONGLETS.map((o) => {
          const on = onglet === o.cle;
          const n = o.cle === 'toutes' ? undefined : comptes[o.cle];
          return (
            <button
              key={o.cle}
              type="button"
              role="tab"
              aria-selected={on}
              onClick={() => setOnglet(o.cle)}
              className={`flex min-h-[40px] flex-none items-center gap-1.5 rounded-full border px-3.5 text-[13.5px] font-bold ${on ? 'border-olivier bg-olivier text-lin' : 'border-[#E3D6C4] bg-white text-olivier'}`}
            >
              {o.libelle}
              {!!n && <span className={`rounded-full px-1.5 text-[11.5px] ${on ? 'bg-lin/20' : 'bg-lin'}`}>{n}</span>}
            </button>
          );
        })}
      </div>

      <div className="mt-2 flex gap-2">
        {([['toutes', 'Toutes dates'], ['aujourdhui', 'Aujourd’hui'], ['demain', 'Demain']] as const).map(([cle, libelle]) => (
          <button
            key={cle}
            type="button"
            onClick={() => { setFiltreDate(cle); router.replace('/gestion/commandes'); }}
            aria-pressed={filtreDate === cle}
            className={`min-h-[36px] rounded-full px-3 text-[12.5px] font-bold ${filtreDate === cle ? 'bg-[#E7EEDC] text-olivier' : 'text-olivier-gris'}`}
          >
            {libelle}
          </button>
        ))}
      </div>

      {preparables.length > 0 && (
        <div className="mt-3 flex gap-2 overflow-x-auto [scrollbar-width:none]">
          {preparables.slice(0, 3).map(([d, n]) => (
            <Link key={d} href={`/gestion/commandes/preparation?date=${d}`} className="flex min-h-[48px] flex-none items-center gap-2 rounded-2xl bg-terre-pale px-3.5 text-[13.5px] font-bold text-brique">
              <ListChecks className="h-5 w-5" aria-hidden="true" />
              Préparer {d === jour ? 'aujourd’hui' : d === demain ? 'demain' : dateCourte(d)} · {n}
            </Link>
          ))}
        </div>
      )}

      <div className="mt-4">
        <DonneesDu le={le} />
        {erreur && !commandes ? (
          <Carte><p className="text-[14px]">Impossible de charger les commandes. Vérifiez la connexion.</p></Carte>
        ) : !commandes ? (
          <Chargement lignes={4} />
        ) : groupes.length === 0 ? (
          <Carte><p className="text-[14.5px] text-olivier-doux">{recherche ? 'Aucune commande ne correspond à cette recherche.' : 'Aucune commande ici pour le moment.'}</p></Carte>
        ) : (
          groupes.map((g) => (
            <section key={g.date} className="mb-5">
              <h2 className="mb-2 text-[13px] font-extrabold uppercase tracking-[0.06em] text-olivier-gris">{titreJour(g.date)}</h2>
              <ul className="space-y-2">
                {g.commandes.map((c) => (
                  <LigneCommande key={c.id} c={c} occupee={enCours === c.id} suivante={(cmd, s) => changer(cmd, s)} />
                ))}
              </ul>
            </section>
          ))
        )}
        {commandes && groupes.length > 0 && (
          <p className="mt-2 text-center text-[12px] leading-relaxed text-olivier-gris">
            Glissez une commande vers la gauche pour la passer à l’étape suivante. Rien n’est enregistré tant que le serveur n’a pas confirmé.
          </p>
        )}
      </div>
    </>
  );
}

const SEUIL = 96;

function LigneCommande({ c, occupee, suivante }: { c: Commande; occupee: boolean; suivante: (c: Commande, s: Statut) => void }) {
  const { enLigne } = useGestion();
  const s = statutDe(c);
  const etape = etapeSuivante(s);
  const [dx, setDx] = useState(0);
  const depart = useRef<{ x: number; y: number; horizontal: boolean | null } | null>(null);
  const glisse = useRef(false);
  const n = lignes(c).length;
  const v = ville(c.adresse_livraison);
  const glissable = !!etape && enLigne && !occupee;

  const debut = (e: React.PointerEvent) => {
    if (!glissable || e.pointerType === 'mouse') return;
    depart.current = { x: e.clientX, y: e.clientY, horizontal: null };
    glisse.current = false;
  };
  const deplacement = (e: React.PointerEvent) => {
    const d = depart.current;
    if (!d) return;
    const ddx = e.clientX - d.x;
    const ddy = e.clientY - d.y;
    if (d.horizontal === null && (Math.abs(ddx) > 8 || Math.abs(ddy) > 8)) d.horizontal = Math.abs(ddx) > Math.abs(ddy);
    if (d.horizontal) { glisse.current = true; setDx(Math.max(-140, Math.min(0, ddx))); }
  };
  const fin = () => {
    if (depart.current?.horizontal && dx <= -SEUIL && etape) suivante(c, etape);
    depart.current = null;
    setDx(0);
  };

  return (
    <li className="relative overflow-hidden rounded-2xl">
      {etape && (
        <div className={`absolute inset-0 flex items-center justify-end px-5 text-[13.5px] font-extrabold ${dx <= -SEUIL ? 'bg-olivier text-lin' : 'bg-[#E7EEDC] text-olivier'}`} aria-hidden="true">
          → {LIBELLE_STATUT[etape]}
        </div>
      )}
      <Link
        href={`/gestion/commandes/${c.id}`}
        onClick={(e) => { if (glisse.current) { e.preventDefault(); glisse.current = false; } }}
        onPointerDown={debut}
        onPointerMove={deplacement}
        onPointerUp={fin}
        onPointerCancel={fin}
        style={{ transform: dx ? `translateX(${dx}px)` : undefined, transition: dx ? 'none' : 'transform .2s', touchAction: 'pan-y' }}
        className={`relative flex items-center gap-3 border border-[#E3D6C4] bg-white px-4 py-3 rounded-2xl active:bg-[#FBF6F0] ${occupee ? 'opacity-60' : ''}`}
        aria-busy={occupee}
      >
        <span className="min-w-0 flex-1">
          <b className="block truncate text-[15px]">N° {c.id} · {c.nom_client || 'Client'}</b>
          <span className="block truncate text-[12.5px] text-olivier-gris">
            {[v, `${n} article${n > 1 ? 's' : ''}`, c.code_promo ? `code ${c.code_promo}` : null].filter(Boolean).join(' · ')}
          </span>
        </span>
        <span className="flex flex-none flex-col items-end gap-1">
          <b className="text-[14.5px]">{formatPrix(Number(c.total) || 0)}</b>
          {occupee ? <span className="text-[11.5px] font-bold text-olivier-gris">Envoi…</span> : <PastilleStatut statut={s} petite />}
        </span>
        <ChevronRight className="h-5 w-5 flex-none text-olivier-pale" aria-hidden="true" />
      </Link>
    </li>
  );
}
