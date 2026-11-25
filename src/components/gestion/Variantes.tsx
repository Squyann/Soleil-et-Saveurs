'use client';
// Variantes d'un produit (ex. Ananas doux : Entier / Préparé). Mêmes règles
// que l'admin du site : champ vide = valeur du produit (prix, unité, remise,
// stock). Chaque modification vérifie que la variante n'a pas changé ailleurs.
import { useState } from 'react';
import { ArrowDown, ArrowUp, Camera, Minus, Pencil, Plus } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { formatPrix, libelleContenance, libelleUnite } from '@/lib/format';
import { contenanceSaisie, UNITES } from '@/lib/variantes';
import { ajusterStock, enregistrerProduit, enregistrerVariante, estIllimite, STOCK_ILLIMITE, stockLisible, type Produit, type Variante } from '@/lib/gestion/produits';
import { reponse } from '@/lib/gestion/memoire';
import { useGestion } from './AppliGestion';
import { Carte } from './Elements';
import Feuille from './Feuille';
import FeuilleStock from './FeuilleStock';
import CadrageImage from '@/components/CadrageImage';
import ChampContenu, { avecContenu } from './ChampContenu';
import Regroupement from './Regroupement';

const texte = (v: unknown) => (v == null ? '' : String(v).replace('.', ','));
const nombre = (s: string) => { const n = Number(s.replace(',', '.').trim()); return s.trim() === '' ? null : Number.isFinite(n) ? n : NaN; };

export default function Variantes({ p, variantes, recharger }: { p: Produit; variantes: Variante[]; recharger: () => void }) {
  const { peut, executer, enLigne, notifier } = useGestion();
  const modifiable = peut('catalogue');
  const [edition, setEdition] = useState<Variante | 'nouvelle' | null>(null);
  const [stock, setStock] = useState<Variante | null>(null);
  const [regroupement, setRegroupement] = useState(false);
  const liste = [...variantes].sort((a, b) => a.ordre - b.ordre);
  const cumulables = p.variantes_cumulables !== false;
  const memeNom = (a: string, b: string) => a.trim().toLowerCase() === b.trim().toLowerCase();
  const principale = liste.find((v) => memeNom(v.nom, p.name));

  // Choix du client : plusieurs variantes dans le panier, ou une seule
  async function changerMode(valeur: boolean) {
    const r = await executer('Choix des variantes', () => enregistrerProduit(p.id, p.updated_at, { variantes_cumulables: valeur }));
    if (!r.ok) return;
    if (!r.donnees.ok) notifier({ type: 'info', texte: 'Le produit a été modifié ailleurs entre-temps : rechargé, réessayez.' });
    else notifier({ type: 'ok', texte: valeur ? 'Plusieurs variantes possibles dans une commande' : 'Une seule variante par commande' });
    recharger();
  }

  // Le produit principal lui-même proposé parmi les choix (ex. « entier »)
  async function ajouterPrincipale() {
    const ordre = liste.length ? Math.min(...liste.map((v) => v.ordre ?? 0)) - 1 : 0;
    const r = await executer(`Ajout de ${p.name}`, () => reponse(supabase.from('product_variants').insert([{ product_id: String(p.id), nom: p.name.trim(), ordre }]).select('id')), { reussite: `« ${p.name.trim()} » ajouté parmi les choix` });
    if (r.ok) recharger();
  }

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
            <li key={v.id} className={`py-3 ${v.actif ? '' : '-mx-2 rounded-xl bg-[#E6DED2] px-2'}`}>
              <div className="flex items-center gap-2">
                <img src={v.image_url || p.image_url || '/icon-192.png'} alt="" className={`h-10 w-[60px] flex-none rounded-lg object-cover ${!v.actif ? 'opacity-40 grayscale' : v.image_url ? '' : 'opacity-50'}`} />
                <span className="min-w-0 flex-1">
                  <b className={`block text-[14.5px] ${v.actif ? '' : 'text-[#8C877E]'}`}>{!v.actif && <span className="mr-1.5 rounded-full bg-[#7D776E] px-1.5 align-middle text-[11px] font-extrabold uppercase tracking-wide text-white">Masquée</span>}{v.nom}</b>
                  <span className="text-[12.5px] text-olivier-gris">
                    {[formatPrix(Number(v.prix ?? p.price)) + (v.prix == null ? ' (prix du produit)' : ''), (v.unite && v.unite !== p.unite) || libelleContenance(v) ? `vendue ${libelleUnite(v.unite || p.unite, libelleContenance(v) ? v : null)}` : null, v.promotion ? `−${v.promotion} %` : null, principale?.id === v.id ? 'produit principal' : null, v.source_product_id ? 'regroupée' : null].filter(Boolean).join(' · ')}
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

      {modifiable && liste.length > 0 && (
        <div className="mt-3 space-y-2 border-t border-[#F0E7DA] pt-3">
          <p className="text-[12.5px] font-bold text-olivier-gris">Choix du client</p>
          <div className="grid grid-cols-2 gap-1 rounded-2xl bg-[#EFE6D8] p-1" role="radiogroup" aria-label="Choix du client">
            {([[true, 'Plusieurs variantes', 'ex. 2 laitues + 1 batavia'], [false, 'Une seule', 'ex. entier OU préparé']] as const).map(([valeur, titre, exemple]) => (
              <button key={titre} type="button" role="radio" aria-checked={cumulables === valeur} disabled={!enLigne} onClick={() => valeur !== cumulables && changerMode(valeur)}
                className={`min-h-[52px] rounded-xl px-2 text-[13px] font-bold leading-tight ${cumulables === valeur ? 'bg-white shadow-sm' : 'text-olivier-gris'}`}>
                {titre}<span className="block text-[11.5px] font-medium text-olivier-gris">{exemple}</span>
              </button>
            ))}
          </div>
          {!principale && (
            <button type="button" disabled={!enLigne} onClick={ajouterPrincipale} className="flex min-h-[48px] w-full items-center justify-between rounded-2xl border border-[#E3D6C4] px-3.5 text-left text-[13.5px] font-bold disabled:opacity-40">
              Ajouter « {p.name.trim()} » lui-même comme choix <Plus className="h-4 w-4 flex-none" aria-hidden="true" />
            </button>
          )}
        </div>
      )}
      {modifiable && (
        <button type="button" disabled={!enLigne} onClick={() => setRegroupement(true)} className="mt-2 flex min-h-[48px] w-full items-center justify-between rounded-2xl border border-dashed border-[#D9CBB8] px-3.5 text-left text-[13.5px] font-bold disabled:opacity-40">
          Regrouper un produit existant ici <Plus className="h-4 w-4 flex-none" aria-hidden="true" />
        </button>
      )}
      {regroupement && <Regroupement p={p} variantes={liste} fermer={() => setRegroupement(false)} apres={() => { setRegroupement(false); recharger(); }} />}

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
  const [contenu, setContenu] = useState({ quantite: texte(v?.contenance), unite: v?.contenance_unite ?? 'g' });
  const [pasG, setPasG] = useState(v?.pas_g ? String(v.pas_g) : '');
  const [description, setDescription] = useState(v?.description ?? '');
  const [degroupement, setDegroupement] = useState(false);
  const [modeStock, setModeStock] = useState<'partage' | 'illimite' | 'quantite'>(v?.stock == null ? 'partage' : estIllimite(v.stock) ? 'illimite' : 'quantite');
  const [stock, setStock] = useState(v?.stock != null && !estIllimite(v.stock) ? texte(v.stock) : '');
  const [erreur, setErreur] = useState('');
  const [envoi, setEnvoi] = useState(false);
  const [suppression, setSuppression] = useState(false);
  const [image, setImage] = useState<string | null>(v?.image_url ?? null);
  const [version, setVersion] = useState(v?.updated_at ?? '');
  const [cadrage, setCadrage] = useState<string | null>(null);
  const { notifier } = useGestion();

  function choisirPhoto(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    e.target.value = '';
    if (!f) return;
    if (!f.type.startsWith('image/') || f.size > 20 * 1024 * 1024) { notifier({ type: 'erreur', texte: 'Photo non prise en charge (20 Mo maximum).' }); return; }
    setCadrage(URL.createObjectURL(f));
  }

  // La photo est enregistrée dès la validation du cadrage (comme dans l'admin)
  async function enregistrerPhoto(blob: Blob | null) {
    if (!v) return;
    if (blob && blob.size > 5 * 1024 * 1024) { notifier({ type: 'erreur', texte: 'Image trop lourde (5 Mo maximum).' }); return; }
    setEnvoi(true);
    const res = await executer(blob ? `Photo de ${v.nom}` : `Retrait de la photo de ${v.nom}`, async () => {
      let url: string | null = null;
      if (blob) {
        const fichier = `${Date.now()}-${Math.round(Math.random() * 1e9)}.jpg`;
        const up = await supabase.storage.from('produits-images').upload(fichier, blob, { contentType: 'image/jpeg', upsert: false });
        if (up.error) throw up.error;
        url = supabase.storage.from('produits-images').getPublicUrl(fichier).data.publicUrl;
      }
      return enregistrerVariante(v.id, version, { image_url: url });
    });
    setEnvoi(false);
    if (cadrage) { URL.revokeObjectURL(cadrage); setCadrage(null); }
    if (!res.ok) return;
    if (!res.donnees.ok) { conflit(); return; }
    setImage(res.donnees.ligne.image_url);
    setVersion(res.donnees.ligne.updated_at);
    notifier({ type: 'ok', texte: blob ? `Photo de « ${v.nom} » enregistrée` : `Photo de « ${v.nom} » retirée (celle du produit s’affiche)` });
  }

  async function enregistrer() {
    setErreur('');
    if (!nom.trim()) return setErreur('Le nom est obligatoire.');
    const vp = nombre(prix);
    if (vp !== null && (Number.isNaN(vp) || vp <= 0 || vp > 1000)) return setErreur('Prix invalide.');
    const r = nombre(remise);
    if (r !== null && (Number.isNaN(r) || r < 0 || r > 90 || !Number.isInteger(r))) return setErreur('Remise invalide (0 à 90 %).');
    const s = modeStock === 'partage' ? null : modeStock === 'illimite' ? STOCK_ILLIMITE : nombre(stock);
    if (modeStock === 'quantite' && (s == null || Number.isNaN(s) || s < 0)) return setErreur('Stock invalide.');
    const c = nombre(contenu.quantite);
    if (avecContenu(uniteEffective) && c != null && (Number.isNaN(c) || c <= 0 || c > 100000)) return setErreur('Contenu invalide.');
    const pas = uniteEffective === 'g' ? nombre(pasG) : null;
    if (pas != null && (Number.isNaN(pas) || pas < 10 || pas > 5000 || !Number.isInteger(pas))) return setErreur('Tranche de vente invalide (10 à 5000 g).');
    const champs = {
      nom: nom.trim().slice(0, 80), prix: vp == null ? null : Math.round(vp * 100) / 100, unite: unite || null,
      promotion: r || null, stock: s, description: description.trim().slice(0, 1000) || null, pas_g: pas,
      ...contenanceSaisie(uniteEffective, contenu.quantite, contenu.unite),
    };
    setEnvoi(true);
    if (!v) {
      const res = await executer(`Ajout de ${champs.nom}`, () => reponse(supabase.from('product_variants').insert([{ product_id: String(p.id), ordre: ordreSuivant, ...champs }]).select('id')));
      setEnvoi(false);
      if (res.ok) apres(`Variante « ${champs.nom} » ajoutée`);
      return;
    }
    const res = await executer(`Modification de ${v.nom}`, () => enregistrerVariante(v.id, version, champs));
    setEnvoi(false);
    if (!res.ok) return;
    if (res.donnees.ok) apres(`Variante « ${champs.nom} » enregistrée`);
    else conflit();
  }

  async function basculerActif() {
    if (!v) return;
    setEnvoi(true);
    const res = await executer(v.actif ? `Masquer ${v.nom}` : `Afficher ${v.nom}`, () => enregistrerVariante(v.id, version, { actif: !v.actif }));
    setEnvoi(false);
    if (!res.ok) return;
    if (res.donnees.ok) apres(`${v.nom} ${v.actif ? 'masquée du site' : 'visible sur le site'}`);
    else conflit();
  }

  // Annule un regroupement : la variante est retirée et le produit d'origine
  // est réactivé, tel qu'il était
  async function degrouper() {
    if (!v?.source_product_id) return;
    setEnvoi(true);
    const res = await executer(`Dégroupement de ${v.nom}`, async () => {
      await reponse(supabase.from('products').update({ actif: true }).eq('id', v.source_product_id!).select('id'));
      await reponse(supabase.from('product_variants').delete().eq('id', v.id).select('id'));
    });
    setEnvoi(false);
    if (res.ok) apres(`« ${v.nom} » dégroupé : l’article d’origine est de nouveau en ligne`);
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
        {v ? (
          <div className="flex items-center gap-3">
            <img src={image || p.image_url || '/icon-192.png'} alt="" className={`h-16 w-24 flex-none rounded-xl object-cover ${image ? '' : 'opacity-50'}`} />
            <div className="flex flex-1 flex-wrap gap-2">
              <label className={`flex min-h-[44px] cursor-pointer items-center gap-2 rounded-xl border border-olivier px-3 text-[13.5px] font-bold ${envoi || !enLigne ? 'pointer-events-none opacity-40' : ''}`}>
                <Camera className="h-4 w-4" aria-hidden="true" /> {image ? 'Changer la photo' : 'Ajouter une photo'}
                <input type="file" accept="image/*" onChange={choisirPhoto} className="sr-only" />
              </label>
              {image && <button type="button" disabled={envoi || !enLigne} onClick={() => enregistrerPhoto(null)} className="min-h-[44px] px-2 text-[13px] font-bold text-brique disabled:opacity-40">Retirer</button>}
            </div>
          </div>
        ) : (
          <p className="text-[12.5px] text-olivier-gris">La photo de la variante s’ajoute une fois la variante créée (sinon, celle du produit s’affiche).</p>
        )}
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
          {uniteEffective === 'g' && (
            <div>
              <label htmlFor="v-pas" className={libelle}>Par tranche de (g)</label>
              <input id="v-pas" inputMode="numeric" value={pasG} onChange={(e) => setPasG(e.target.value.replace(/\D/g, ''))} placeholder={`${p.pas_g ?? 100} (produit)`} className={champ} />
            </div>
          )}
        </div>
        <ChampContenu id="v-contenu" unite={uniteEffective} quantite={contenu.quantite} uniteContenu={contenu.unite} changer={(q, u) => { setErreur(''); setContenu({ quantite: q, unite: u }); }}
          indication={uniteEffective === (p.unite || 'pièce') && libelleContenance(p) ? `(vide : celui du produit, ${libelleContenance(p)})` : undefined} />
        <div>
          <label htmlFor="v-description" className={libelle}>Petite description (facultatif)</label>
          <textarea id="v-description" rows={2} value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Informations propres à cette variante" className={champ} />
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
        {v?.source_product_id && (
          degroupement ? (
            <div className="rounded-2xl bg-lin p-3 text-[13px] leading-relaxed">
              La variante est retirée et l’article d’origine « {v.nom} » est remis en ligne, tel qu’il était.
              <div className="mt-2 grid grid-cols-2 gap-2">
                <button type="button" onClick={() => setDegroupement(false)} className="min-h-[44px] rounded-xl border border-olivier font-bold">Annuler</button>
                <button type="button" disabled={envoi || !enLigne} onClick={degrouper} className="min-h-[44px] rounded-xl bg-olivier font-bold text-lin disabled:opacity-40">Dégrouper</button>
              </div>
            </div>
          ) : (
            <button type="button" disabled={envoi || !enLigne} onClick={() => setDegroupement(true)} className="min-h-[44px] w-full text-[13.5px] font-bold text-brique disabled:opacity-40">Dégrouper (remettre l’article d’origine)</button>
          )
        )}
        {cadrage && <CadrageImage src={cadrage} onAnnuler={() => { URL.revokeObjectURL(cadrage); setCadrage(null); }} onValider={enregistrerPhoto} />}
        {suppression && <p className="text-[12px] text-olivier-gris">Définitif. Pour la retirer temporairement, préférez « Masquer du site ». Les commandes passées ne sont pas touchées.</p>}
      </div>
    </Feuille>
  );
}
