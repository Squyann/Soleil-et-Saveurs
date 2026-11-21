'use client';
// Ajout / modification d'une ligne de facture pro : article du catalogue
// (nom, unité et prix proposés) ou texte libre, quantité, unité, prix HT
import { useEffect, useMemo, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { formatPrix } from '@/lib/format';
import { nombreFr, totalLigne, UNITES_PRO, versHT, versTTC, type LignePro } from '@/lib/facturePro';
import Feuille from './Feuille';

type Article = { id: string; name: string; price: number; unite: string | null };
let catalogue: Article[] | null = null;

const nombre = (s: string) => { const n = Number(s.replace(',', '.').replace(/\s/g, '')); return s.trim() === '' ? null : Number.isFinite(n) ? n : NaN; };
const texte = (n: number | null | undefined, d = 3) => (n == null ? '' : nombreFr(n, d).replace(/ |\s/g, ''));

export default function FeuilleLigne({ ligne, avecPrix, fermer, valider, supprimer }: {
  ligne: LignePro | null; avecPrix: boolean; fermer: () => void; valider: (l: LignePro) => void; supprimer?: () => void;
}) {
  const [designation, setDesignation] = useState(ligne?.designation ?? '');
  const [productId, setProductId] = useState<string | null>(ligne?.product_id ?? null);
  const [quantite, setQuantite] = useState(texte(ligne?.quantite));
  const [unite, setUnite] = useState(ligne?.unite ?? 'kg');
  const [prix, setPrix] = useState(texte(ligne?.prix_ht, 2));
  const [remise, setRemise] = useState(ligne?.remise_pct ? texte(ligne.remise_pct, 2) : '');
  const [articles, setArticles] = useState<Article[]>(catalogue ?? []);
  const [suggestions, setSuggestions] = useState(false);
  const [erreur, setErreur] = useState('');

  useEffect(() => {
    if (catalogue) return;
    supabase.from('products').select('id, name, price, unite').order('name').then(({ data }) => {
      catalogue = (data as Article[]) ?? [];
      setArticles(catalogue);
    });
  }, []);

  const q = designation.trim().toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
  const proposes = useMemo(() => (q.length < 2 || productId ? [] : articles.filter((a) => a.name.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').includes(q)).slice(0, 6)), [q, articles, productId]);
  const article = articles.find((a) => a.id === productId);

  function choisir(a: Article) {
    setDesignation(a.name);
    setProductId(a.id);
    // Vendu au gramme sur le site : prix au kg, facturé au kg
    setUnite(a.unite === 'g' || a.unite === 'kg' ? 'kg' : a.unite || 'pièce');
    if (!prix) setPrix(texte(versHT(Number(a.price)), 2));
    setSuggestions(false);
  }

  const n = { q: nombre(quantite), p: nombre(prix), r: nombre(remise) };
  const apercu: LignePro = { designation, quantite: Number(n.q) || 0, unite, prix_ht: Number(n.p) || 0, remise_pct: Number(n.r) || 0 };

  function ok() {
    if (!designation.trim()) return setErreur('Indiquez l’article.');
    if (n.q == null || Number.isNaN(n.q) || n.q <= 0 || n.q > 1000000) return setErreur('Quantité invalide.');
    if (avecPrix && (n.p == null || Number.isNaN(n.p) || n.p < 0 || n.p > 100000)) return setErreur('Prix HT invalide.');
    if (n.r != null && (Number.isNaN(n.r) || n.r < 0 || n.r > 100)) return setErreur('Remise invalide (0 à 100 %).');
    valider({
      designation: designation.trim().slice(0, 200), quantite: Math.round(n.q * 1000) / 1000, unite,
      ...(avecPrix ? { prix_ht: Math.round(Number(n.p) * 100) / 100, remise_pct: n.r ? Math.round(n.r * 100) / 100 : 0 } : {}),
      product_id: productId,
    });
  }

  const champ = 'w-full rounded-2xl border border-[#E3D6C4] bg-[#FBF6F0] px-3.5 py-3 text-[16px] outline-none focus:border-olivier';
  const libelle = 'mb-1 block text-[12.5px] font-bold text-olivier-gris';
  return (
    <Feuille titre={ligne ? 'Modifier la ligne' : 'Nouvelle ligne'} fermer={fermer}>
      <div className="max-h-[72dvh] space-y-3 overflow-y-auto px-4 pb-1">
        <div className="relative">
          <label htmlFor="l-des" className={libelle}>Article (catalogue ou texte libre)</label>
          <input id="l-des" value={designation} autoComplete="off" onFocus={() => setSuggestions(true)} onChange={(e) => { setErreur(''); setDesignation(e.target.value); setProductId(null); setSuggestions(true); }} placeholder="ex. Clémentines, Cagette mixte…" className={champ} />
          {suggestions && proposes.length > 0 && (
            <ul className="absolute inset-x-0 top-full z-10 mt-1 overflow-hidden rounded-2xl border border-[#E3D6C4] bg-white shadow-lg">
              {proposes.map((a) => (
                <li key={a.id}><button type="button" onClick={() => choisir(a)} className="flex min-h-[44px] w-full items-center justify-between px-3.5 text-left text-[14.5px] active:bg-lin"><span>{a.name}</span><span className="text-[12.5px] text-olivier-gris">{formatPrix(Number(a.price))} TTC</span></button></li>
              ))}
            </ul>
          )}
        </div>
        <div className={`grid gap-2 ${avecPrix ? 'grid-cols-[1.1fr_1fr_0.9fr]' : 'grid-cols-2'}`}>
          <div><label htmlFor="l-q" className={libelle}>Quantité</label><input id="l-q" inputMode="decimal" value={quantite} onChange={(e) => { setErreur(''); setQuantite(e.target.value); }} className={champ} /></div>
          <div><label htmlFor="l-u" className={libelle}>Unité</label><select id="l-u" value={unite} onChange={(e) => setUnite(e.target.value)} className={champ}>{UNITES_PRO.map((u) => <option key={u}>{u}</option>)}</select></div>
          {avecPrix && <div><label htmlFor="l-r" className={libelle}>Remise %</label><input id="l-r" inputMode="decimal" value={remise} onChange={(e) => setRemise(e.target.value)} placeholder="—" className={champ} /></div>}
        </div>
        {avecPrix && (
          <>
            <div className="grid grid-cols-2 gap-2">
              <div><label htmlFor="l-p" className={libelle}>Prix unitaire HT (€)</label><input id="l-p" inputMode="decimal" value={prix} onChange={(e) => { setErreur(''); setPrix(e.target.value); }} className={`${champ} font-bold`} /></div>
              <div><span className={libelle}>soit TTC</span><div className={`${champ} text-olivier-gris`}>{n.p != null && !Number.isNaN(n.p) ? formatPrix(versTTC(n.p)) : '—'}</div></div>
            </div>
            {article && <p className="text-[12px] text-olivier-gris">Prix du site : {formatPrix(Number(article.price))} TTC{article.unite === 'g' || article.unite === 'kg' ? ' le kg' : ''} ({formatPrix(versHT(Number(article.price)))} HT). Vous mettez le prix que vous voulez.</p>}
            <div className="flex justify-between text-[15px]"><span>Total de la ligne</span><b>{formatPrix(totalLigne(apercu))} HT</b></div>
          </>
        )}
        {erreur && <p role="alert" className="rounded-xl bg-[#F1E1DB] px-3 py-2 text-[13.5px] font-semibold text-[#8A3A1E]">{erreur}</p>}
        <button type="button" onClick={ok} className="min-h-[52px] w-full rounded-2xl bg-olivier text-[15px] font-extrabold text-lin">{ligne ? 'Valider' : 'Ajouter'}</button>
        {supprimer && <button type="button" onClick={supprimer} className="min-h-[44px] w-full text-[13.5px] font-bold text-brique">Retirer cette ligne</button>}
      </div>
    </Feuille>
  );
}
