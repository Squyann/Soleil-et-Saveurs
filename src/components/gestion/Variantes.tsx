'use client';
// Variantes d'un produit (ex. Ananas doux : Entier / Préparé). Mêmes règles
// que l'admin du site : champ vide = valeur du produit (prix, unité, remise,
// stock). Chaque modification vérifie que la variante n'a pas changé ailleurs.
import { useState } from 'react';
import { ArrowDown, ArrowUp, Minus, Pencil, Plus } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { formatPrix } from '@/lib/format';
import { UNITES } from '@/lib/variantes';
import { ajusterStock, enregistrerVariante, estIllimite, STOCK_ILLIMITE, stockLisible, type Produit, type Variante } from '@/lib/gestion/produits';
import { reponse } from '@/lib/gestion/memoire';
import { useGestion } from './AppliGestion';
import { Carte } from './Elements';
import Feuille from './Feuille';
import FeuilleStock from './FeuilleStock';

const texte = (v: unknown) => (v == null ? '' : String(v).replace('.', ','));
const nombre = (s: string) => { const n = Number(s.replace(',', '.').trim()); return s.trim() === '' ? null : Number.isFinite(n) ? n : NaN; };

export default function Variantes({ p, variantes, recharger }: { p: Produit; variantes: Variante[]; recharger: () => void }) {
  const { peut, executer, enLigne, notifier } = useGestion();
  const modifiable = peut('catalogue');
  const [edition, setEdition] = useState<Variante | 'nouvelle' | null>(null);
  const [stock, setStock] = useState<Variante | null>(null);
  const liste = [...variantes].sort((a, b) => a.ordre - b.ordre);

  async function plusMoins(v: Variante, delta: number) {
    const r = await executer(`Stock de ${v.nom}`, () => ajusterStock(p.id, v.id, delta));
    if (r.ok) recharger();
  }

  // Réordonne en réécrivant l'ordre de toutes les variantes (0, 1, 2…)
  async function deplacer(i: number, sens: -1 | 1) {
    const j = i + sens;
    if (j < 0 || j >= liste.length) return;
    const ordre = [...liste];
    [ordre[i], ordre[j]] = [ordre[j], ordre[i]];
    const r = await executer('Ordre des variantes', async () => {
      for (let k = 0; k < ordre.length; k++) {
        if (ordre[k].ordre !== k) await reponse(supabase.from('product_variants').update({ ordre: k }).eq('id', ordre[k].id).select('id'));
      }
    });
    if (r.ok) recharger();
  }

  return (
    <Carte className="mb-3">
      <div className="flex items-center justify-between">
        <h2 className="text-[12px] font-extrabold uppercase tracking-[0.07em] text-olivier-gris">Variantes{liste.length ? ` · ${liste.length}` : ''}</h2>
        {modifiable && (
          <button type="button" disabled={!enLigne} onClick={() => setEdition('nouvelle')} className="flex min-h-[40px] items-center gap-1 rounded-xl px-2 text-[13.5px] font-bold text-brique disabled:opacity-40">
            <Plus className="h-4 w-4" aria-hidden="true" /> Ajouter
          </button>
        )}
      </div>
      {liste.length === 0 ? (
        <p className="mt-1 text-[13px] leading-relaxed text-olivier-gris">Aucune variante. Ex. pour un ananas : « Entier » et « Préparé ». Le client choisira parmi elles : ajoutez-les toutes.</p>
      ) : (
        <ul className="mt-1 divide-y divide-[#F0E7DA]">
          {liste.map((v, i) => (
            <li key={v.id} className={`py-3 ${v.actif ? '' : 'opacity-60'}`}>
              <div className="flex items-center gap-2">
                <span className="min-w-0 flex-1">
                  <b className="block text-[14.5px]">{v.nom}{!v.actif && <span className="font-semibold text-olivier-gris"> · masquée</span>}</b>
                  <span className="text-[12.5px] text-olivier-gris">
                    {[formatPrix(Number(v.prix ?? p.price)) + (v.prix == null ? ' (prix du produit)' : ''), v.unite && v.unite !== p.unite ? `vendue ${v.unite === 'g' ? 'au poids' : `à la ${v.unite}`}` : null, v.promotion ? `−${v.promotion} %` : null].filter(Boolean).join(' · ')}
                  </span>
                </span>
                {modifiable && (
                  <>
                    <button type="button" aria-label={`Monter ${v.nom}`} disabled={i === 0 || !enLigne} onClick={() => deplacer(i, -1)} className="flex h-10 w-9 items-center justify-center rounded-xl text-olivier-gris disabled:opacity-25"><ArrowUp className="h-4 w-4" /></button>
                    <button type="button" aria-label={`Descendre ${v.nom}`} disabled={i === liste.length - 1 || !enLigne} onClick={() => deplacer(i, 1)} className="flex h-10 w-9 items-center justify-center rounded-xl text-olivier-gris disabled:opacity-25"><ArrowDown className="h-4 w-4" /></button>
                    <button type="button" aria-label={`Modifier ${v.nom}`} disabled={!enLigne} onClick={() => setEdition(v)} className="flex h-10 w-10 items-center justify-center rounded-xl bg-lin disabled:opacity-40"><Pencil className="h-4 w-4" /></button>
                  </>
                )}
              </div>
              <div className="mt-2 flex items-center gap-1">
                <span className="flex-1 text-[12.5px] text-olivier-gris">{v.stock == null ? 'Stock partagé avec le produit' : estIllimite(v.stock) ? 'Stock propre : illimité' : `Stock propre : ${stockLisible(v.stock, v.unite ?? p.unite)}`}</span>
                {v.stock != null && !estIllimite(v.stock) && (
                  <>
                    <button type="button" aria-label={`Retirer 1 au stock de ${v.nom}`} disabled={!enLigne || v.stock <= 0} onClick={() => plusMoins(v, -1)} className="flex h-10 w-10 items-center justify-center rounded-xl bg-lin disabled:opacity-30"><Minus className="h-4 w-4" /></button>
                    <button type="button" aria-label={`Ajouter 1 au stock de ${v.nom}`} disabled={!enLigne} onClick={() => plusMoins(v, 1)} className="flex h-10 w-10 items-center justify-center rounded-xl bg-olivier text-lin disabled:opacity-30"><Plus className="h-4 w-4" /></button>
                  </>
                )}
                <button type="button" onClick={() => setStock(v)} className="min-h-[40px] rounded-xl px-2 text-[13px] font-bold text-brique">Stock et visibilité</button>
              </div>
            </li>
          ))}
        </ul>
      )}

      {edition && (
        <EditionVariante
          p={p}
          v={edition === 'nouvelle' ? null : edition}
          ordreSuivant={liste.length ? Math.max(...liste.map((x) => x.ordre)) + 1 : 0}
          fermer={() => setEdition(null)}
          apres={(message) => { setEdition(null); notifier({ type: 'ok', texte: message }); recharger(); }}
          conflit={() => { setEdition(null); notifier({ type: 'info', texte: 'Cette variante a été modifiée ailleurs entre-temps : rechargée, rien n’a été écrasé.' }); recharger(); }}
        />
      )}
      {stock && (
        <FeuilleStock
          cible={{ produit: p.id, variante: stock.id, nom: stock.nom, stock: stock.stock, actif: stock.actif, unite: stock.unite ?? p.unite, partage: true }}
          fermer={() => setStock(null)}
          apres={recharger}
        />
      )}
    </Carte>
  );
}

function EditionVariante({ p, v, ordreSuivant, fermer, apres, conflit }: {
  p: Produit; v: Variante | null; ordreSuivant: number; fermer: () => void; apres: (message: string) => void; conflit: () => void;
}) {
  const { executer, enLigne } = useGestion();
  const [nom, setNom] = useState(v?.nom ?? '');
  const [prix, setPrix] = useState(texte(v?.prix));
  const [unite, setUnite] = useState(v?.unite ?? '');
  const [remise, setRemise] = useState(v?.promotion ? texte(v.promotion) : '');
  const [modeStock, setModeStock] = useState<'partage' | 'illimite' | 'quantite'>(v?.stock == null ? 'partage' : estIllimite(v.stock) ? 'illimite' : 'quantite');
  const [stock, setStock] = useState(v?.stock != null && !estIllimite(v.stock) ? texte(v.stock) : '');
  const [erreur, setErreur] = useState('');
  const [envoi, setEnvoi] = useState(false);
  const [suppression, setSuppression] = useState(false);

  async function enregistrer() {
    setErreur('');
    if (!nom.trim()) return setErreur('Le nom est obligatoire.');
    const vp = nombre(prix);
    if (vp !== null && (Number.isNaN(vp) || vp <= 0 || vp > 1000)) return setErreur('Prix invalide.');
    const r = nombre(remise);
    if (r !== null && (Number.isNaN(r) || r < 0 || r > 90 || !Number.isInteger(r))) return setErreur('Remise invalide (0 à 90 %).');
    const s = modeStock === 'partage' ? null : modeStock === 'illimite' ? STOCK_ILLIMITE : nombre(stock);
    if (modeStock === 'quantite' && (s == null || Number.isNaN(s) || s < 0)) return setErreur('Stock invalide.');
    const champs = {
      nom: nom.trim().slice(0, 80), prix: vp == null ? null : Math.round(vp * 100) / 100, unite: unite || null,
      promotion: r || null, stock: s,
    };
    setEnvoi(true);
    if (!v) {
      const res = await executer(`Ajout de ${champs.nom}`, () => reponse(supabase.from('product_variants').insert([{ product_id: String(p.id), ordre: ordreSuivant, ...champs }]).select('id')));
      setEnvoi(false);
      if (res.ok) apres(`Variante « ${champs.nom} » ajoutée`);
      return;
    }
    const res = await executer(`Modification de ${v.nom}`, () => enregistrerVariante(v.id, v.updated_at, champs));
    setEnvoi(false);
    if (!res.ok) return;
    if (res.donnees.ok) apres(`Variante « ${champs.nom} » enregistrée`);
    else conflit();
  }

  async function basculerActif() {
    if (!v) return;
    setEnvoi(true);
    const res = await executer(v.actif ? `Masquer ${v.nom}` : `Afficher ${v.nom}`, () => enregistrerVariante(v.id, v.updated_at, { actif: !v.actif }));
    setEnvoi(false);
    if (!res.ok) return;
    if (res.donnees.ok) apres(`${v.nom} ${v.actif ? 'masquée du site' : 'visible sur le site'}`);
    else conflit();
  }

  async function supprimer() {
    if (!v) return;
    setEnvoi(true);
    const res = await executer(`Suppression de ${v.nom}`, () => reponse(supabase.from('product_variants').delete().eq('id', v.id).select('id')));
    setEnvoi(false);
    if (res.ok) apres(`Variante « ${v.nom} » supprimée`);
  }

  const champ = 'w-full rounded-2xl border border-[#E3D6C4] bg-[#FBF6F0] px-3.5 py-3 text-[16px] outline-none focus:border-olivier';
  const libelle = 'mb-1 block text-[12.5px] font-bold text-olivier-gris';
  const uniteEffective = unite || p.unite || 'pièce';

  return (
    <Feuille titre={v ? `Modifier « ${v.nom} »` : `Nouvelle variante de ${p.name}`} fermer={fermer}>
      <div className="max-h-[70dvh] space-y-3 overflow-y-auto px-4 pb-1">
        <div>
          <label htmlFor="v-nom" className={libelle}>Nom</label>
          <input id="v-nom" value={nom} onChange={(e) => { setErreur(''); setNom(e.target.value); }} placeholder="ex. Préparé" className={champ} />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label htmlFor="v-prix" className={libelle}>Prix (€)</label>
            <input id="v-prix" inputMode="decimal" value={prix} onChange={(e) => setPrix(e.target.value)} placeholder={`${texte(p.price)} (produit)`} className={champ} />
          </div>
          <div>
            <label htmlFor="v-unite" className={libelle}>Vendue</label>
            <select id="v-unite" value={unite} onChange={(e) => setUnite(e.target.value)} className={champ}>
              <option value="">comme le produit</option>
              {UNITES.map((u) => <option key={u.valeur} value={u.valeur}>{u.libelle}</option>)}
            </select>
          </div>
          <div>
            <label htmlFor="v-remise" className={libelle}>Remise propre (%)</label>
            <input id="v-remise" inputMode="numeric" value={remise} onChange={(e) => setRemise(e.target.value.replace(/\D/g, ''))} placeholder="celle du produit" className={champ} />
          </div>
        </div>
        <fieldset>
          <legend className={libelle}>Stock</legend>
          <div className="grid grid-cols-3 gap-1 rounded-2xl bg-[#EFE6D8] p-1">
            {([['partage', 'Du produit'], ['quantite', 'Propre'], ['illimite', 'Illimité']] as const).map(([cle, l]) => (
              <button key={cle} type="button" aria-pressed={modeStock === cle} onClick={() => setModeStock(cle)} className={`min-h-[40px] rounded-xl text-[13px] font-bold ${modeStock === cle ? 'bg-white shadow-sm' : 'text-olivier-gris'}`}>{l}</button>
            ))}
          </div>
          {modeStock === 'quantite' && (
            <input aria-label="Quantité en stock" inputMode="decimal" value={stock} onChange={(e) => setStock(e.target.value)} placeholder={`quantité (${uniteEffective === 'g' ? 'grammes' : uniteEffective})`} className={`${champ} mt-2`} />
          )}
          {modeStock === 'partage' && uniteEffective !== (p.unite || 'pièce') && (
            <p className="mt-1 text-[12px] text-brique">Vendue dans une autre unité que le produit : sans stock propre, elle est illimitée.</p>
          )}
        </fieldset>
        {erreur && <p role="alert" className="rounded-xl bg-[#F1E1DB] px-3 py-2 text-[13.5px] font-semibold text-[#8A3A1E]">{erreur}</p>}
        <button type="button" disabled={envoi || !enLigne || !nom.trim()} onClick={enregistrer} className="min-h-[52px] w-full rounded-2xl bg-olivier text-[15px] font-extrabold text-lin disabled:opacity-40">
          {envoi ? 'Enregistrement…' : v ? 'Enregistrer' : 'Ajouter la variante'}
        </button>
        {v && (
          <div className="grid grid-cols-2 gap-2">
            <button type="button" disabled={envoi || !enLigne} onClick={basculerActif} className="min-h-[48px] rounded-2xl border border-[#E3D6C4] text-[13.5px] font-bold disabled:opacity-40">{v.actif ? 'Masquer du site' : 'Afficher sur le site'}</button>
            {suppression ? (
              <button type="button" disabled={envoi || !enLigne} onClick={supprimer} className="min-h-[48px] rounded-2xl bg-brique text-[13.5px] font-bold text-white disabled:opacity-40">Confirmer la suppression</button>
            ) : (
              <button type="button" disabled={envoi || !enLigne} onClick={() => setSuppression(true)} className="min-h-[48px] rounded-2xl border border-[#E3D6C4] text-[13.5px] font-bold text-brique disabled:opacity-40">Supprimer</button>
            )}
          </div>
        )}
        {suppression && <p className="text-[12px] text-olivier-gris">Définitif. Pour la retirer temporairement, préférez « Masquer du site ». Les commandes passées ne sont pas touchées.</p>}
      </div>
    </Feuille>
  );
}
