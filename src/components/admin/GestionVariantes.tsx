'use client';
import React, { useState } from 'react';
import {
  X, Plus, Trash2, ArrowUp, ArrowDown, ImagePlus, Save, Loader2, Layers, CircleDot, Import, AlertTriangle,
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import CadrageImage from '@/components/CadrageImage';
import { nomVariante, UNITES, type Variante } from '@/lib/variantes';

const IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/avif'];
const TAILLE_MAX_SOURCE = 20 * 1024 * 1024;
const TAILLE_MAX_IMAGE = 5 * 1024 * 1024;

// Champs éditables d'une variante (vides = valeurs du produit)
type Saisie = { nom: string; prix: string; description: string; unite: string; pas_g: string; promotion: string; stock: string };

const texte = (n: number | null | undefined) => (n != null ? String(n) : '');
const versSaisie = (v: Variante): Saisie => ({
  nom: v.nom ?? '',
  prix: texte(v.prix),
  description: v.description ?? '',
  unite: v.unite ?? '',
  pas_g: texte(v.pas_g),
  promotion: texte(v.promotion),
  stock: texte(v.stock),
});

// « 1,70 » → 1.7 ; vide → null ; texte invalide → NaN
const nombre = (x: string) => (x.trim() === '' ? null : parseFloat(x.replace(',', '.')));
const uniteLibelle = (u: string | null | undefined) => (u === 'g' ? 'kg' : u || 'pièce');
const memeNom = (a: string, b: string) => a.trim().toLowerCase() === b.trim().toLowerCase();

const messageErreur = (e: any) =>
  e?.code === '42703' || e?.code === 'PGRST204'
    ? 'La base n’est pas encore à jour : faites lancer la migration 20261111b_variantes_unites.sql.'
    : `Erreur : ${e?.message ?? 'enregistrement impossible'}`;

// Fenêtre de gestion des variantes d'un produit (admin, onglet Produits)
export default function GestionVariantes({
  produit, variantes, produits, onFermer, onChange,
}: {
  produit: any;
  variantes: Variante[];
  produits: any[];
  onFermer: () => void;
  onChange: () => Promise<void> | void;
}) {
  const liste = [...variantes].sort((a, b) => (a.ordre ?? 0) - (b.ordre ?? 0));
  const [saisies, setSaisies] = useState<Record<string, Saisie>>(() => Object.fromEntries(liste.map(v => [v.id, versSaisie(v)])));
  const [nouveauNom, setNouveauNom] = useState('');
  const [nouveauPrix, setNouveauPrix] = useState('');
  const [aImporter, setAImporter] = useState('');
  const [enCours, setEnCours] = useState<string | null>(null);
  const [erreur, setErreur] = useState<string | null>(null);
  const [cadrage, setCadrage] = useState<{ src: string; varianteId: string } | null>(null);

  const cumulables = produit.variantes_cumulables !== false;
  const saisie = (v: Variante) => saisies[v.id] ?? versSaisie(v);
  // Comparaison des valeurs (« 1,70 » et 1.7 sont le même prix)
  const normaliser = (x: Saisie) => JSON.stringify({
    nom: x.nom.trim(), prix: nombre(x.prix), description: x.description.trim(),
    unite: x.unite || null, pas_g: x.unite === 'g' ? nombre(x.pas_g) : null, promotion: nombre(x.promotion), stock: nombre(x.stock),
  });
  const modifiee = (v: Variante) => normaliser(saisie(v)) !== normaliser(versSaisie(v));

  async function executer(cle: string, action: () => Promise<{ error: any } | void>) {
    setErreur(null);
    setEnCours(cle);
    try {
      const res = await action();
      if (res && res.error) throw res.error;
      await onChange();
    } catch (e) {
      console.error(e);
      setErreur(messageErreur(e));
    } finally {
      setEnCours(null);
    }
  }

  const changerMode = (valeur: boolean) => executer('mode', async () =>
    supabase.from('products').update({ variantes_cumulables: valeur }).eq('id', produit.id));

  function enregistrer(v: Variante) {
    const s = saisie(v);
    if (!s.nom.trim()) { setErreur('Le nom de la variante est obligatoire.'); return; }
    const prix = nombre(s.prix);
    const promotion = nombre(s.promotion);
    const stock = nombre(s.stock);
    const pasG = s.unite === 'g' ? nombre(s.pas_g) : null;
    if (prix !== null && (Number.isNaN(prix) || prix < 0)) { setErreur('Prix invalide.'); return; }
    if (promotion !== null && (Number.isNaN(promotion) || promotion < 0 || promotion > 100)) { setErreur('Remise invalide (entre 0 et 100 %).'); return; }
    if (stock !== null && (Number.isNaN(stock) || stock < 0)) { setErreur('Stock invalide.'); return; }
    if (pasG !== null && (Number.isNaN(pasG) || pasG <= 0)) { setErreur('Pas en grammes invalide.'); return; }
    executer(v.id, async () => supabase.from('product_variants')
      .update({
        nom: s.nom.trim(), prix, description: s.description.trim() || null,
        unite: s.unite || null, pas_g: pasG !== null ? Math.round(pasG) : null, promotion, stock,
      })
      .eq('id', v.id));
  }

  const basculerActif = (v: Variante) => executer(`actif-${v.id}`, async () =>
    supabase.from('product_variants').update({ actif: v.actif === false }).eq('id', v.id));

  // Réordonne en réécrivant l'ordre de toutes les variantes (0, 1, 2…)
  const deplacer = (index: number, sens: -1 | 1) => executer('ordre', async () => {
    const j = index + sens;
    if (j < 0 || j >= liste.length) return;
    const ordre = [...liste];
    [ordre[index], ordre[j]] = [ordre[j], ordre[index]];
    for (let k = 0; k < ordre.length; k++) {
      if (ordre[k].ordre !== k) {
        const { error } = await supabase.from('product_variants').update({ ordre: k }).eq('id', ordre[k].id);
        if (error) return { error };
      }
    }
  });

  // Annule un regroupement : la variante est retirée et le produit d'origine
  // redevient visible dans le catalogue, tel qu'il était.
  function degrouper(v: Variante) {
    const source = produits.find(p => String(p.id) === String(v.source_product_id));
    if (!confirm(`Dégrouper « ${v.nom} » ?\n\n• La variante est retirée de « ${produit.name.trim()} ».\n• Le produit « ${source?.name?.trim() ?? v.nom} » est réactivé dans le catalogue, tel qu'il était.`)) return;
    executer(`degrouper-${v.id}`, async () => {
      if (source) {
        const r = await supabase.from('products').update({ actif: true }).eq('id', source.id);
        if (r.error) return r;
      }
      return supabase.from('product_variants').delete().eq('id', v.id);
    });
  }

  // Le produit principal lui-même, proposé comme l'un des choix (ex. « Ananas
  // doux entier » à côté de « Ananas doux préparé »)
  const versionPrincipale = liste.find(v => memeNom(v.nom, produit.name));
  function ajouterVersionPrincipale() {
    const ordre = liste.length ? Math.min(...liste.map(v => v.ordre ?? 0)) - 1 : 0;
    executer('principale', async () => supabase.from('product_variants').insert([{ product_id: String(produit.id), nom: produit.name.trim(), ordre }]));
  }

  function supprimer(v: Variante) {
    if (!confirm(`Supprimer définitivement « ${v.nom} » ?\n\nPour la retirer temporairement, utilisez plutôt « Désactiver » (elle reste enregistrée). Les commandes passées ne sont pas touchées.`)) return;
    executer(`suppr-${v.id}`, async () => supabase.from('product_variants').delete().eq('id', v.id));
  }

  function ajouter() {
    if (!nouveauNom.trim()) return;
    const prix = nouveauPrix.trim() === '' ? null : parseFloat(nouveauPrix.replace(',', '.'));
    if (prix !== null && (Number.isNaN(prix) || prix < 0)) { setErreur('Prix invalide.'); return; }
    const ordre = liste.length ? Math.max(...liste.map(v => v.ordre ?? 0)) + 1 : 0;
    executer('ajout', async () => {
      const res = await supabase.from('product_variants').insert([{ product_id: String(produit.id), nom: nouveauNom.trim(), prix, ordre }]);
      if (!res.error) { setNouveauNom(''); setNouveauPrix(''); }
      return res;
    });
  }

  // Transforme un produit existant (ex. « Ananas doux préparé ») en variante
  // de celui-ci. Le produit principal reste l'un des choix : s'il n'a pas encore
  // de variante, il est d'abord ajouté comme première variante (sinon la carte
  // n'afficherait plus que le produit regroupé). Le produit regroupé garde son
  // nom, sa photo, son prix, son unité, sa description, sa remise et son stock ;
  // son ancienne fiche est seulement DÉSACTIVÉE (rien n'est supprimé, voir
  // « Dégrouper »).
  function importer() {
    const source = produits.find(p => String(p.id) === aImporter);
    if (!source) return;
    const premierRegroupement = liste.length === 0;
    if (!confirm(`Regrouper « ${source.name.trim()} » dans « ${produit.name.trim()} » ?\n\n`
      + (premierRegroupement ? `• « ${produit.name.trim()} » reste le produit principal et devient le premier choix.\n` : '')
      + `• « ${source.name.trim()} » devient une variante avec son nom, sa photo, son prix, son unité, sa description, sa remise et son stock.\n`
      + `• Son ancienne fiche est DÉSACTIVÉE dans le catalogue (rien n'est supprimé ; « Dégrouper » la remet en ligne).`)) return;
    const ordreMax = liste.length ? Math.max(...liste.map(v => v.ordre ?? 0)) : -1;
    const uniteSource = (source.unite ?? null) !== (produit.unite ?? null) ? source.unite : null;
    const pctSource = Number(source.promotion) || 0;
    executer('import', async () => {
      if (premierRegroupement) {
        const r = await supabase.from('product_variants').insert([{ product_id: String(produit.id), nom: produit.name.trim(), ordre: 0 }]);
        if (r.error) return r;
      }
      const ins = await supabase.from('product_variants').insert([{
        product_id: String(produit.id),
        nom: source.name.trim(),
        prix: Number(source.price) !== Number(produit.price) ? source.price : null,
        image_url: source.image_url || null,
        description: source.description || null,
        unite: uniteSource,
        pas_g: (uniteSource ?? produit.unite) === 'g' && source.pas_g && source.pas_g !== produit.pas_g ? source.pas_g : null,
        promotion: pctSource !== (Number(produit.promotion) || 0) ? pctSource : null,
        stock: source.stock ?? null,
        source_product_id: source.id,
        ordre: ordreMax + (premierRegroupement ? 2 : 1),
      }]);
      if (ins.error) return ins;
      setAImporter('');
      return supabase.from('products').update({ actif: false }).eq('id', source.id);
    });
  }

  function choisirPhoto(e: React.ChangeEvent<HTMLInputElement>, varianteId: string) {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    if (!IMAGE_TYPES.includes(file.type)) { alert('Format non supporté. Utilisez une image JPG, PNG, WEBP, GIF ou AVIF.'); return; }
    if (file.size > TAILLE_MAX_SOURCE) { alert('Image trop lourde (20 Mo maximum).'); return; }
    setCadrage({ src: URL.createObjectURL(file), varianteId });
  }

  function fermerCadrage() {
    if (cadrage?.src.startsWith('blob:')) URL.revokeObjectURL(cadrage.src);
    setCadrage(null);
  }

  async function envoyerPhoto(image: Blob) {
    if (!cadrage) return;
    if (image.size > TAILLE_MAX_IMAGE) { alert('Image trop lourde (5 Mo maximum).'); return; }
    const { varianteId } = cadrage;
    const nom = `variantes/${Date.now()}-${Math.round(Math.random() * 1e9)}.jpg`;
    const { error } = await supabase.storage.from('produits-images').upload(nom, image, { contentType: 'image/jpeg', upsert: false });
    if (error) { alert("Erreur lors de l'envoi de la photo."); return; }
    const { data } = supabase.storage.from('produits-images').getPublicUrl(nom);
    fermerCadrage();
    await executer(`photo-${varianteId}`, async () =>
      supabase.from('product_variants').update({ image_url: data.publicUrl }).eq('id', varianteId));
  }

  const retirerPhoto = (v: Variante) => executer(`photo-${v.id}`, async () =>
    supabase.from('product_variants').update({ image_url: null }).eq('id', v.id));

  // Produits déjà regroupés ailleurs : exclus (on ne regroupe pas deux fois)
  const dejaRegroupes = new Set(liste.map(v => String(v.source_product_id ?? '')));
  const candidatsImport = produits
    .filter(p => String(p.id) !== String(produit.id) && !dejaRegroupes.has(String(p.id)))
    .sort((a, b) => Number(b.actif !== false) - Number(a.actif !== false) || a.name.localeCompare(b.name, 'fr'));

  const uniteTexte = `€/${uniteLibelle(produit.unite)}`;
  const champ = 'w-full bg-slate-50 border border-transparent focus:border-[#FF4500]/40 focus:bg-white rounded-lg p-2.5 text-xs outline-none transition-colors';

  return (
    <div className="fixed inset-0 z-[150] flex items-stretch sm:items-center justify-center sm:p-4 bg-black/50 backdrop-blur-sm animate-in fade-in">
      <div className="relative bg-[#F6F1EA] w-full sm:max-w-2xl h-full sm:h-auto sm:max-h-[92vh] sm:rounded-[2rem] shadow-2xl flex flex-col overflow-hidden">
        {/* EN-TÊTE */}
        <div className="flex items-center gap-3 px-4 py-3 sm:px-6 sm:py-4 bg-white border-b border-slate-100">
          <div className="w-14 h-10 rounded-lg overflow-hidden bg-slate-100 shrink-0">
            {produit.image_url && <img src={produit.image_url} alt="" className="w-full h-full object-cover" />}
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-[9px] font-black uppercase tracking-widest text-slate-400">Variantes du produit</p>
            <p className="font-black uppercase italic text-slate-800 truncate">{produit.name}</p>
          </div>
          {enCours && <Loader2 className="w-4 h-4 text-[#FF4500] animate-spin" />}
          <button onClick={onFermer} aria-label="Fermer" className="w-9 h-9 flex items-center justify-center rounded-xl bg-slate-100 text-slate-400 hover:bg-slate-200 shrink-0"><X className="w-4 h-4" /></button>
        </div>

        <div className="flex-1 overflow-y-auto px-3 py-4 sm:px-6 sm:py-5 space-y-4">
          {erreur && (
            <p className="flex items-start gap-2 text-[11px] font-bold text-red-600 bg-red-50 border border-red-100 rounded-xl px-3 py-2.5">
              <AlertTriangle className="w-4 h-4 shrink-0" /> {erreur}
            </p>
          )}

          {/* MODE DE CHOIX */}
          <section className="bg-white rounded-2xl border border-slate-100 p-4">
            <p className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-3">Choix du client</p>
            <div className="grid sm:grid-cols-2 gap-2">
              {[
                { valeur: true, icone: Layers, titre: 'Plusieurs variétés cumulables', exemple: 'Ex. salades : 2 laitues + 1 batavia dans la même commande' },
                { valeur: false, icone: CircleDot, titre: 'Une seule version par commande', exemple: 'Ex. ananas : entier OU préparé' },
              ].map(({ valeur, icone: Icone, titre, exemple }) => (
                <button
                  key={titre}
                  type="button"
                  onClick={() => valeur !== cumulables && changerMode(valeur)}
                  aria-pressed={valeur === cumulables}
                  className={`text-left rounded-xl border-2 p-3 transition-all ${valeur === cumulables ? 'border-[#FF4500] bg-orange-50/60' : 'border-slate-100 hover:border-slate-200'}`}
                >
                  <span className="flex items-center gap-2 text-[11px] font-black uppercase tracking-tight text-slate-800"><Icone className={`w-4 h-4 ${valeur === cumulables ? 'text-[#FF4500]' : 'text-slate-300'}`} />{titre}</span>
                  <span className="block text-[10px] text-slate-400 font-bold mt-1">{exemple}</span>
                </button>
              ))}
            </div>
            <p className="text-[10px] text-slate-400 font-bold mt-3 leading-relaxed">
              Les promotions de « {produit.name.trim()} » (prix dégressif, lot, premières offertes) s’appliquent à ses variantes vendues
              dans la même unité, quantités additionnées (ex. « dès 3 » : 1 laitue + 1 batavia + 1 sucrine). Chaque variante peut avoir
              son prix, son unité, sa remise % et son stock ; laissés vides, ce sont ceux du produit.
            </p>
          </section>

          {/* LISTE DES VARIANTES */}
          <section className="space-y-2">
            <p className="text-[10px] font-black uppercase tracking-widest text-slate-500 px-1">
              {liste.length ? `${liste.length} variante${liste.length > 1 ? 's' : ''} — dans l’ordre d’affichage` : 'Aucune variante pour le moment'}
            </p>
            {liste.map((v, index) => {
              const s = saisie(v);
              const inactive = v.actif === false;
              return (
                <div key={v.id} className={`bg-white rounded-2xl border p-3 transition-opacity ${inactive ? 'border-slate-100 opacity-60' : 'border-slate-100'}`}>
                  <div className="flex gap-3">
                    {/* Photo */}
                    <div className="shrink-0 flex flex-col items-center gap-1">
                      <label className="relative w-20 aspect-[3/2] rounded-lg overflow-hidden bg-slate-100 cursor-pointer group" title="Changer la photo">
                        {v.image_url
                          ? <img src={v.image_url} alt="" className="w-full h-full object-cover" />
                          : produit.image_url
                            ? <img src={produit.image_url} alt="" className="w-full h-full object-cover opacity-40 grayscale" />
                            : null}
                        <span className="absolute inset-0 flex items-center justify-center bg-black/0 group-hover:bg-black/30 transition-colors">
                          <ImagePlus className={`w-4 h-4 ${v.image_url ? 'text-white opacity-0 group-hover:opacity-100' : 'text-slate-500'}`} />
                        </span>
                        <input type="file" accept="image/*" className="absolute inset-0 opacity-0 cursor-pointer" onChange={e => choisirPhoto(e, v.id)} />
                      </label>
                      {v.image_url
                        ? <button type="button" onClick={() => retirerPhoto(v)} className="text-[8px] font-black uppercase text-slate-400 hover:text-red-500">Retirer</button>
                        : <span className="text-[8px] font-bold text-slate-300 uppercase">Photo du produit</span>}
                    </div>

                    {/* Champs */}
                    <div className="flex-1 min-w-0 space-y-1.5">
                      <div className="grid grid-cols-[1fr_92px] gap-1.5">
                        <input className={`${champ} font-bold`} value={s.nom} placeholder="Nom de la variante" onChange={e => setSaisies(p => ({ ...p, [v.id]: { ...s, nom: e.target.value } }))} />
                        <div className="relative">
                          <input className={`${champ} pr-9 font-bold`} inputMode="decimal" value={s.prix} placeholder={Number(produit.price).toFixed(2)} onChange={e => setSaisies(p => ({ ...p, [v.id]: { ...s, prix: e.target.value } }))} />
                          <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[8px] font-black text-slate-300">€/{uniteLibelle(s.unite || produit.unite)}</span>
                        </div>
                      </div>
                      {/* Caractéristiques commerciales propres (vides = celles du produit) */}
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
                        <label className="col-span-2 sm:col-span-1 block">
                          <span className="block text-[8px] font-black uppercase tracking-widest text-slate-400 mb-0.5">Unité de vente</span>
                          <select className={`${champ} font-bold py-2`} value={s.unite} onChange={e => setSaisies(p => ({ ...p, [v.id]: { ...s, unite: e.target.value } }))}>
                            <option value="">Comme le produit ({uniteLibelle(produit.unite)})</option>
                            {UNITES.map(u => <option key={u.valeur} value={u.valeur}>{u.libelle}</option>)}
                          </select>
                        </label>
                        {(s.unite || produit.unite) === 'g' && (
                          <label className="block">
                            <span className="block text-[8px] font-black uppercase tracking-widest text-slate-400 mb-0.5">Pas (g)</span>
                            <input className={`${champ} font-bold py-2`} inputMode="numeric" value={s.pas_g} placeholder={String(produit.pas_g || 100)} onChange={e => setSaisies(p => ({ ...p, [v.id]: { ...s, pas_g: e.target.value } }))} />
                          </label>
                        )}
                        <label className="block">
                          <span className="block text-[8px] font-black uppercase tracking-widest text-slate-400 mb-0.5">Remise %</span>
                          <input className={`${champ} font-bold py-2`} inputMode="decimal" value={s.promotion} placeholder={Number(produit.promotion) > 0 ? `${produit.promotion} (produit)` : '—'} onChange={e => setSaisies(p => ({ ...p, [v.id]: { ...s, promotion: e.target.value } }))} />
                        </label>
                        <label className="block">
                          <span className="block text-[8px] font-black uppercase tracking-widest text-slate-400 mb-0.5">Stock propre</span>
                          <input className={`${champ} font-bold py-2`} inputMode="decimal" value={s.stock} placeholder={(s.unite || produit.unite) === produit.unite ? 'partagé' : 'illimité'} onChange={e => setSaisies(p => ({ ...p, [v.id]: { ...s, stock: e.target.value } }))} />
                        </label>
                      </div>
                      <textarea className={`${champ} min-h-[52px]`} rows={2} value={s.description} placeholder="Informations propres à cette variante (facultatif)" onChange={e => setSaisies(p => ({ ...p, [v.id]: { ...s, description: e.target.value } }))} />
                      <p className="text-[9px] font-bold text-slate-400 truncate">
                        Affiché : « {nomVariante(produit, { ...v, nom: s.nom || v.nom })} »{s.prix.trim() === '' ? ' · prix du produit' : ''}
                        {(s.unite || produit.unite) !== produit.unite && ' · promos par quantité du produit non appliquées (autre unité)'}
                      </p>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex flex-wrap items-center gap-1.5 mt-2.5 pt-2.5 border-t border-slate-50">
                    {versionPrincipale?.id === v.id && (
                      <span className="text-[8px] font-black uppercase tracking-widest text-[#FF4500] bg-orange-50 px-2 py-1 rounded-full">Produit principal</span>
                    )}
                    {v.source_product_id && (
                      <button type="button" onClick={() => degrouper(v)} className="text-[8px] font-black uppercase tracking-widest text-blue-600 bg-blue-50 px-2 py-1 rounded-full hover:bg-blue-100" title="Retirer la variante et remettre le produit d'origine en ligne">
                        Regroupé · Dégrouper
                      </button>
                    )}
                    <button type="button" role="switch" aria-checked={!inactive} onClick={() => basculerActif(v)} className="flex items-center gap-2 text-[9px] font-black uppercase tracking-widest text-slate-500 mr-auto">
                      <span className={`relative w-9 h-5 rounded-full transition-colors ${inactive ? 'bg-slate-200' : 'bg-green-500'}`}>
                        <span className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${inactive ? '' : 'translate-x-4'}`} />
                      </span>
                      {inactive ? 'Désactivée' : 'Active'}
                    </button>
                    <button type="button" onClick={() => deplacer(index, -1)} disabled={index === 0 || !!enCours} aria-label="Monter" className="w-8 h-8 rounded-lg bg-slate-50 text-slate-400 flex items-center justify-center disabled:opacity-30"><ArrowUp className="w-3.5 h-3.5" /></button>
                    <button type="button" onClick={() => deplacer(index, 1)} disabled={index === liste.length - 1 || !!enCours} aria-label="Descendre" className="w-8 h-8 rounded-lg bg-slate-50 text-slate-400 flex items-center justify-center disabled:opacity-30"><ArrowDown className="w-3.5 h-3.5" /></button>
                    <button type="button" onClick={() => supprimer(v)} aria-label="Supprimer" className="w-8 h-8 rounded-lg bg-red-50 text-red-400 flex items-center justify-center hover:bg-red-500 hover:text-white"><Trash2 className="w-3.5 h-3.5" /></button>
                    {modifiee(v) && (
                      <button type="button" onClick={() => enregistrer(v)} disabled={!!enCours} className="h-8 px-3 rounded-lg bg-slate-900 text-white text-[9px] font-black uppercase tracking-widest flex items-center gap-1.5 hover:bg-[#FF4500]">
                        {enCours === v.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />} Enregistrer
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </section>

          {liste.length > 0 && !versionPrincipale && (
            <section className="bg-amber-50 border border-amber-100 rounded-2xl p-3 flex flex-col sm:flex-row sm:items-center gap-2 justify-between">
              <p className="text-[10px] font-bold text-amber-700 leading-snug">
                « {produit.name.trim()} » lui-même n’est pas proposé parmi les choix. Ajoutez-le si le client doit pouvoir le choisir (ex. « entier » à côté de « préparé »).
              </p>
              <button type="button" onClick={ajouterVersionPrincipale} disabled={!!enCours} className="shrink-0 px-3 py-2 rounded-lg bg-amber-600 text-white text-[9px] font-black uppercase tracking-widest hover:bg-amber-700">
                Ajouter comme choix
              </button>
            </section>
          )}

          {/* AJOUT */}
          <section className="bg-white rounded-2xl border border-slate-100 p-4 space-y-2">
            <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">Nouvelle variante</p>
            <div className="grid grid-cols-[1fr_100px] gap-2">
              <input className={`${champ} font-bold`} value={nouveauNom} placeholder={cumulables ? 'Ex : Batavia' : `Ex : ${produit.name.trim()} préparé`} onChange={e => setNouveauNom(e.target.value)} onKeyDown={e => e.key === 'Enter' && ajouter()} />
              <input className={`${champ} font-bold`} inputMode="decimal" value={nouveauPrix} placeholder={`${Number(produit.price).toFixed(2)} ${uniteTexte}`} onChange={e => setNouveauPrix(e.target.value)} onKeyDown={e => e.key === 'Enter' && ajouter()} />
            </div>
            <p className="text-[9px] font-bold text-slate-400">Prix vide = prix du produit. Photo et description se règlent ensuite sur la variante.</p>
            <button type="button" onClick={ajouter} disabled={!nouveauNom.trim() || !!enCours} className="w-full bg-slate-900 text-white text-[10px] font-black uppercase tracking-widest py-3 rounded-xl hover:bg-[#FF4500] disabled:opacity-40 flex items-center justify-center gap-2">
              <Plus className="w-4 h-4" /> Ajouter la variante
            </button>
          </section>

          {/* IMPORT D'UN PRODUIT EXISTANT */}
          <section className="bg-white rounded-2xl border border-dashed border-slate-200 p-4 space-y-2">
            <p className="text-[10px] font-black uppercase tracking-widest text-slate-500 flex items-center gap-1.5"><Import className="w-3.5 h-3.5" /> Regrouper un produit existant</p>
            <p className="text-[10px] font-bold text-slate-400 leading-relaxed">Vous aviez créé deux fiches (ex. « Ananas doux » et « Ananas doux préparé ») ? Choisissez l’autre fiche : elle devient une variante de celui-ci et son ancienne fiche est simplement désactivée.</p>
            <div className="flex gap-2">
              <select value={aImporter} onChange={e => setAImporter(e.target.value)} className="flex-1 min-w-0 p-2.5 bg-slate-50 rounded-lg text-xs font-bold border-none">
                <option value="">Choisir un produit ({produit.unite === 'g' ? 'vendu au gramme' : `vendu ${produit.unite === 'kg' ? 'au kg' : `à la ${produit.unite || 'pièce'}`}`})…</option>
                {candidatsImport.map(p => (
                  <option key={p.id} value={p.id}>{p.name.trim()} — {Number(p.price).toFixed(2)}€{p.actif === false ? ' (désactivé)' : ''}</option>
                ))}
              </select>
              <button type="button" onClick={importer} disabled={!aImporter || !!enCours} className="px-4 rounded-lg bg-[#FF4500] text-white text-[10px] font-black uppercase tracking-widest disabled:opacity-40">Regrouper</button>
            </div>
          </section>
        </div>
      </div>

      {cadrage && <CadrageImage src={cadrage.src} onAnnuler={fermerCadrage} onValider={envoyerPhoto} />}
    </div>
  );
}
