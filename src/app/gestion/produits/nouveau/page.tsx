'use client';
// Nouveau produit : mêmes champs et mêmes règles que l'admin du site
// (nom unique, prix au kg pour la vente au gramme, variantes facultatives).
// Rien n'est affiché comme créé tant que la base ne l'a pas confirmé.
import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Camera, Plus, Trash2 } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { contenanceSaisie, UNITES } from '@/lib/variantes';
import { CATEGORIES, STOCK_ILLIMITE } from '@/lib/gestion/produits';
import { useGestion } from '@/components/gestion/AppliGestion';
import { Bascule, Carte } from '@/components/gestion/Elements';
import ChampContenu, { avecContenu } from '@/components/gestion/ChampContenu';
import CadrageImage from '@/components/CadrageImage';

type VarianteSaisie = { nom: string; prix: string };
const nombre = (s: string) => { const n = Number(s.replace(',', '.').trim()); return s.trim() === '' ? null : Number.isFinite(n) ? n : NaN; };

export default function NouveauProduit() {
  const router = useRouter();
  const { peut, executer, enLigne, notifier } = useGestion();
  const [nom, setNom] = useState('');
  const [prix, setPrix] = useState('');
  const [unite, setUnite] = useState('kg');
  const [pasG, setPasG] = useState('100');
  const [categorie, setCategorie] = useState('Légumes');
  const [provenance, setProvenance] = useState('');
  const [description, setDescription] = useState('');
  const [contenu, setContenu] = useState({ quantite: '', unite: 'g' });
  const [illimite, setIllimite] = useState(true);
  const [stock, setStock] = useState('');
  const [visible, setVisible] = useState(true);
  const [variantes, setVariantes] = useState<VarianteSaisie[]>([]);
  const [photo, setPhoto] = useState<{ blob: Blob; apercu: string } | null>(null);
  const [cadrage, setCadrage] = useState<string | null>(null);
  const [erreur, setErreur] = useState('');
  const [envoi, setEnvoi] = useState(false);

  if (!peut('catalogue')) {
    return (<><Retour /><Carte><p>La création de produits est réservée à l’administrateur et au gérant.</p></Carte></>);
  }

  function choisirPhoto(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    e.target.value = '';
    if (!f) return;
    if (!f.type.startsWith('image/') || f.size > 20 * 1024 * 1024) { notifier({ type: 'erreur', texte: 'Photo non prise en charge (20 Mo maximum).' }); return; }
    setCadrage(URL.createObjectURL(f));
  }

  async function creer() {
    setErreur('');
    const p = nombre(prix);
    if (!nom.trim()) return setErreur('Le nom est obligatoire.');
    if (p == null || Number.isNaN(p) || p <= 0 || p > 1000) return setErreur('Prix invalide.');
    const pas = unite === 'g' ? nombre(pasG) : null;
    const c = nombre(contenu.quantite);
    if (c != null && (Number.isNaN(c) || c <= 0 || c > 100000)) return setErreur('Contenu invalide.');
    if (unite === 'g' && (pas == null || Number.isNaN(pas) || pas < 10 || pas > 5000 || !Number.isInteger(pas))) return setErreur('Tranche de vente invalide (entre 10 et 5000 g).');
    const s = illimite ? STOCK_ILLIMITE : nombre(stock);
    if (s == null || Number.isNaN(s) || s < 0 || (!Number.isInteger(s) && unite !== 'kg')) return setErreur('Stock invalide.');
    const vs = variantes.filter((v) => v.nom.trim());
    for (const v of vs) {
      const vp = nombre(v.prix);
      if (vp !== null && (Number.isNaN(vp) || vp <= 0 || vp > 1000)) return setErreur(`Prix invalide pour la variante « ${v.nom.trim()} ».`);
    }
    if (new Set(vs.map((v) => v.nom.trim().toLowerCase())).size !== vs.length) return setErreur('Deux variantes portent le même nom.');

    setEnvoi(true);
    const r = await executer(`Création de ${nom.trim()}`, async () => {
      let image_url: string | null = null;
      if (photo) {
        const fichier = `${Date.now()}-${Math.round(Math.random() * 1e9)}.jpg`;
        const up = await supabase.storage.from('produits-images').upload(fichier, photo.blob, { contentType: 'image/jpeg', upsert: false });
        if (up.error) throw up.error;
        image_url = supabase.storage.from('produits-images').getPublicUrl(fichier).data.publicUrl;
      }
      const ins = await supabase.from('products').insert([{
        name: nom.trim().slice(0, 120), price: Math.round(p * 100) / 100, unite, pas_g: unite === 'g' ? pas : 100,
        category: categorie, provenance: provenance.trim().slice(0, 80) || null, stock: unite === 'g' || unite === 'kg' ? s : Math.round(s),
        actif: visible, image_url, description: description.trim().slice(0, 1000), ...contenanceSaisie(unite, contenu.quantite, contenu.unite), promotion: 0, seuil_achat: 0, quantite_offerte: 0, seuil_promo_qte: 0, prix_promo: 0,
      }]).select('id').single();
      if (ins.error) {
        if (ins.error.code === '23505') throw new Error(`Un produit nommé « ${nom.trim()} » existe déjà`);
        throw ins.error;
      }
      const id = ins.data.id as string;
      let variantesOk = true;
      if (vs.length) {
        const res = await supabase.from('product_variants').insert(vs.map((v, i) => {
          const vp = nombre(v.prix);
          return { product_id: String(id), nom: v.nom.trim().slice(0, 80), prix: vp == null ? null : Math.round(vp * 100) / 100, ordre: i };
        }));
        variantesOk = !res.error;
      }
      return { id, variantesOk };
    });
    setEnvoi(false);
    if (!r.ok) return;
    if (r.donnees.variantesOk) notifier({ type: 'ok', texte: `${nom.trim()} créé${visible ? ' et visible sur le site' : ' (masqué du site)'}` });
    else notifier({ type: 'erreur', texte: `${nom.trim()} est créé, mais ses variantes n’ont pas pu être ajoutées : ajoutez-les depuis sa fiche.` });
    router.replace(`/gestion/produits/${r.donnees.id}`);
  }

  const champ = 'w-full rounded-2xl border border-[#E3D6C4] bg-[#FBF6F0] px-3.5 py-3 text-[16px] outline-none focus:border-olivier';
  const libelle = 'mb-1 block text-[12.5px] font-bold text-olivier-gris';

  return (
    <>
      <Retour />
      <h1 className="titre mb-4 text-[28px] leading-tight">Nouveau produit</h1>

      <label className={`relative mb-3 block cursor-pointer overflow-hidden rounded-3xl border-2 border-dashed border-[#D9CBB8] bg-white ${!enLigne ? 'pointer-events-none opacity-50' : ''}`}>
        {photo ? <img src={photo.apercu} alt="" className="aspect-[3/2] w-full object-cover" /> : (
          <span className="flex aspect-[3/2] w-full flex-col items-center justify-center gap-2 text-[14px] font-bold text-olivier-gris">
            <Camera className="h-8 w-8" aria-hidden="true" /> Ajouter une photo
          </span>
        )}
        {photo && <span className="absolute bottom-3 right-3 rounded-2xl bg-white/95 px-3 py-2 text-[13px] font-bold shadow">Changer la photo</span>}
        <input type="file" accept="image/*" onChange={choisirPhoto} className="sr-only" />
      </label>

      <Carte className="mb-3 space-y-3">
        <div>
          <label htmlFor="nom" className={libelle}>Nom</label>
          <input id="nom" value={nom} onChange={(e) => { setErreur(''); setNom(e.target.value); }} placeholder="ex. Potimarron" className={champ} />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label htmlFor="prix" className={libelle}>Prix {unite === 'g' || unite === 'kg' ? 'au kg' : ''} (€)</label>
            <input id="prix" inputMode="decimal" value={prix} onChange={(e) => { setErreur(''); setPrix(e.target.value); }} placeholder="ex. 2,99" className={champ} />
          </div>
          <div>
            <label htmlFor="unite" className={libelle}>Vendu</label>
            <select id="unite" value={unite} onChange={(e) => setUnite(e.target.value)} className={champ}>
              {UNITES.map((u) => <option key={u.valeur} value={u.valeur}>{u.libelle}</option>)}
            </select>
          </div>
          {unite === 'g' && (
            <div className="col-span-2">
              <label htmlFor="pas" className={libelle}>Vendu par tranche de (grammes)</label>
              <input id="pas" inputMode="numeric" value={pasG} onChange={(e) => setPasG(e.target.value.replace(/\D/g, ''))} className={champ} />
            </div>
          )}
          {avecContenu(unite) && (
            <div className="col-span-2">
              <ChampContenu id="contenu" unite={unite} quantite={contenu.quantite} uniteContenu={contenu.unite} changer={(q, u) => setContenu({ quantite: q, unite: u })} />
            </div>
          )}
          <div>
            <label htmlFor="categorie" className={libelle}>Catégorie</label>
            <select id="categorie" value={categorie} onChange={(e) => setCategorie(e.target.value)} className={champ}>
              {CATEGORIES.map((c) => <option key={c}>{c}</option>)}
            </select>
          </div>
          <div>
            <label htmlFor="provenance" className={libelle}>Provenance</label>
            <input id="provenance" value={provenance} onChange={(e) => setProvenance(e.target.value)} placeholder="facultatif" className={champ} />
          </div>
        </div>
        <div>
          <label htmlFor="description" className={libelle}>Description courte (facultatif)</label>
          <textarea id="description" rows={2} value={description} onChange={(e) => setDescription(e.target.value)} placeholder="ex. Cueillis jeunes, extra-fins" className={champ} />
        </div>
      </Carte>

      <Carte className="mb-3 space-y-3">
        <div className="flex items-center gap-3">
          <span className="flex-1"><b className="block text-[14.5px]">Stock illimité</b><span className="text-[12px] text-olivier-gris">sinon, indiquez la quantité disponible</span></span>
          <Bascule on={illimite} libelle="Stock illimité" changer={() => setIllimite(!illimite)} />
        </div>
        {!illimite && (
          <div>
            <label htmlFor="stock" className={libelle}>Stock ({unite === 'g' ? 'grammes' : unite})</label>
            <input id="stock" inputMode={unite === 'kg' ? 'decimal' : 'numeric'} value={stock} onChange={(e) => setStock(e.target.value)} className={champ} />
          </div>
        )}
        <div className="flex items-center gap-3 border-t border-[#F0E7DA] pt-3">
          <span className="flex-1"><b className="block text-[14.5px]">Visible sur le site tout de suite</b><span className="text-[12px] text-olivier-gris">sinon masqué, le temps de le compléter</span></span>
          <Bascule on={visible} libelle="Visible sur le site" changer={() => setVisible(!visible)} />
        </div>
      </Carte>

      <Carte className="mb-3">
        <h2 className="text-[12px] font-extrabold uppercase tracking-[0.07em] text-olivier-gris">Variantes (facultatif)</h2>
        <p className="mt-1 text-[12.5px] leading-relaxed text-olivier-gris">
          Ex. Ananas doux : « Entier », « Préparé ». Quand un produit a des variantes, le client choisit parmi elles : ajoutez-les toutes. Prix vide = prix du produit.
        </p>
        <ul className="mt-3 space-y-2">
          {variantes.map((v, i) => (
            <li key={i} className="flex gap-2">
              <input aria-label={`Nom de la variante ${i + 1}`} value={v.nom} onChange={(e) => setVariantes((l) => l.map((x, k) => (k === i ? { ...x, nom: e.target.value } : x)))} placeholder="Nom" className={`${champ} min-w-0 flex-1`} />
              <input aria-label={`Prix de la variante ${i + 1}`} inputMode="decimal" value={v.prix} onChange={(e) => setVariantes((l) => l.map((x, k) => (k === i ? { ...x, prix: e.target.value } : x)))} placeholder={prix || 'Prix'} className={`${champ} w-[92px]`} />
              <button type="button" aria-label={`Retirer la variante ${i + 1}`} onClick={() => setVariantes((l) => l.filter((_, k) => k !== i))} className="flex w-12 flex-none items-center justify-center rounded-2xl text-brique"><Trash2 className="h-5 w-5" /></button>
            </li>
          ))}
        </ul>
        <button type="button" onClick={() => setVariantes((l) => [...l, { nom: '', prix: '' }])} className="mt-2 flex min-h-[48px] items-center gap-2 text-[14px] font-bold text-brique">
          <Plus className="h-5 w-5" aria-hidden="true" /> Ajouter une variante
        </button>
      </Carte>

      <div className="sticky bottom-[calc(84px+env(safe-area-inset-bottom))] z-30 mt-4">
        {erreur && <p role="alert" className="mb-2 rounded-2xl bg-[#F1E1DB] px-4 py-2.5 text-[13.5px] font-semibold text-[#8A3A1E] shadow">{erreur}</p>}
        <button type="button" disabled={envoi || !enLigne || !nom.trim() || !prix.trim()} onClick={creer} className="min-h-[56px] w-full rounded-2xl bg-olivier text-[16px] font-extrabold text-lin shadow-lg disabled:opacity-40">
          {envoi ? 'Création…' : !enLigne ? 'Hors connexion' : 'Créer le produit'}
        </button>
      </div>

      {cadrage && (
        <CadrageImage
          src={cadrage}
          onAnnuler={() => { URL.revokeObjectURL(cadrage); setCadrage(null); }}
          onValider={async (blob) => {
            if (blob.size > 5 * 1024 * 1024) { notifier({ type: 'erreur', texte: 'Image trop lourde (5 Mo maximum).' }); return; }
            if (photo) URL.revokeObjectURL(photo.apercu);
            setPhoto({ blob, apercu: URL.createObjectURL(blob) });
            URL.revokeObjectURL(cadrage);
            setCadrage(null);
          }}
        />
      )}
    </>
  );
}


function Retour() {
  return (
    <Link href="/gestion/produits" className="-ml-2 mb-2 inline-flex min-h-[44px] items-center gap-1 px-2 text-[14px] font-bold text-olivier-gris">
      <ArrowLeft className="h-5 w-5" aria-hidden="true" /> Produits
    </Link>
  );
}
