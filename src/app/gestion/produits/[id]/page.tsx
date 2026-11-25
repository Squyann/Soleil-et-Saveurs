'use client';
// Fiche produit : tout ce que l'admin du site permet (prix, unité, contenu,
// catégorie, provenance, description, promotion, photo, visibilité, page
// détaillée, variantes, suppression). L'enregistrement vérifie que personne
// n'a modifié le produit entre-temps ; sinon les deux versions sont
// proposées, rien n'est écrasé.
import { useCallback, useEffect, useMemo, useState } from 'react';
import nextDynamic from 'next/dynamic';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, Camera, Crop, ExternalLink } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { formatPrix, libelleQuantite } from '@/lib/format';
import { contenanceSaisie, UNITES } from '@/lib/variantes';
import { completudeFiche, type Fiche, type FicheVariante } from '@/lib/fiches';
import {
  CATEGORIES, COLONNES_PRODUIT, COLONNES_VARIANTE, definirDisponibilite, enregistrerProduit, estIllimite, type Produit, type Variante,
} from '@/lib/gestion/produits';
import { reponse } from '@/lib/gestion/memoire';
import { useChangements, useGestion } from '@/components/gestion/AppliGestion';
import { Bascule, Carte, Chargement } from '@/components/gestion/Elements';
import Feuille from '@/components/gestion/Feuille';
import FeuilleStock from '@/components/gestion/FeuilleStock';
import ChampContenu, { avecContenu } from '@/components/gestion/ChampContenu';
import Variantes from '@/components/gestion/Variantes';
import CadrageImage from '@/components/CadrageImage';

// Éditeur de la page détaillée (le même que dans l'admin du site)
const EditeurFiche = nextDynamic(() => import('@/components/admin/EditeurFiche'), { ssr: false });

// Une seule promotion à la fois (comme dans l'admin du site)
type TypePromo = 'aucune' | 'remise' | 'lot' | 'degressif' | 'premieres';
const TYPES_PROMO: { cle: TypePromo; libelle: string }[] = [
  { cle: 'aucune', libelle: 'Aucune' },
  { cle: 'remise', libelle: 'Remise %' },
  { cle: 'lot', libelle: 'Lot X + Y' },
  { cle: 'degressif', libelle: 'Prix dégressif' },
  { cle: 'premieres', libelle: 'Premières offertes' },
];

type Saisie = {
  name: string; price: string; unite: string; category: string; provenance: string; description: string; pas_g: string;
  contenance: string; contenance_unite: string;
  promo: TypePromo; promotion: string; seuil_promo_qte: string; prix_promo: string; seuil_achat: string; quantite_offerte: string; premieres_offertes: string;
};
const LIBELLES: Record<keyof Saisie, string> = {
  name: 'Nom', price: 'Prix', unite: 'Unité', category: 'Catégorie', provenance: 'Provenance', description: 'Description courte', pas_g: 'Tranche de vente (g)',
  contenance: 'Contenu', contenance_unite: 'Unité du contenu',
  promo: 'Type de promotion', promotion: 'Remise %', seuil_promo_qte: 'Prix dégressif dès', prix_promo: 'Prix dégressif', seuil_achat: 'Lot : achetés', quantite_offerte: 'Lot : offerts', premieres_offertes: 'Premières offertes',
};
const CHAMPS_PROMO: (keyof Saisie)[] = ['promo', 'promotion', 'seuil_promo_qte', 'prix_promo', 'seuil_achat', 'quantite_offerte', 'premieres_offertes'];

const texte = (v: unknown) => (v == null ? '' : String(v).replace('.', ','));
const nombre = (s: string) => { const n = Number(s.replace(',', '.').trim()); return s.trim() === '' ? null : Number.isFinite(n) ? n : NaN; };

function typePromo(p: Produit): TypePromo {
  if (Number(p.promotion) > 0) return 'remise';
  if (Number(p.seuil_achat) > 0 && Number(p.quantite_offerte) > 0) return 'lot';
  if (Number(p.seuil_promo_qte) > 0 && Number(p.prix_promo) > 0) return 'degressif';
  if (Number(p.premieres_offertes) > 0) return 'premieres';
  return 'aucune';
}

function depuis(p: Produit): Saisie {
  return {
    name: p.name ?? '', price: texte(p.price), unite: p.unite ?? 'pièce', category: p.category ?? 'Légumes', provenance: p.provenance ?? '',
    description: p.description ?? '', pas_g: texte(p.pas_g ?? 100),
    contenance: texte(p.contenance), contenance_unite: p.contenance_unite ?? 'g',
    promo: typePromo(p),
    promotion: p.promotion ? texte(p.promotion) : '', seuil_promo_qte: p.seuil_promo_qte ? texte(p.seuil_promo_qte) : '', prix_promo: p.prix_promo ? texte(p.prix_promo) : '',
    seuil_achat: p.seuil_achat ? texte(p.seuil_achat) : '', quantite_offerte: p.quantite_offerte ? texte(p.quantite_offerte) : '', premieres_offertes: p.premieres_offertes ? texte(p.premieres_offertes) : '',
  };
}

// Valeur lisible d'un champ (fenêtre de conflit)
function lisible(s: Saisie, k: keyof Saisie) {
  if (k === 'promo') return TYPES_PROMO.find((t) => t.cle === s.promo)?.libelle ?? '';
  return s[k];
}

// Saisie → champs de la base, ou message d'erreur
function verifier(s: Saisie): { champs: Partial<Produit> } | { erreur: string } {
  const prix = nombre(s.price);
  if (!s.name.trim()) return { erreur: 'Le nom est obligatoire.' };
  if (prix == null || Number.isNaN(prix) || prix <= 0 || prix > 1000) return { erreur: 'Prix invalide.' };
  const ent = (v: string, nom: string, min: number, max: number) => {
    const n = nombre(v);
    if (n == null || Number.isNaN(n) || n < min || n > max || !Number.isInteger(n)) throw new Error(`${nom} invalide.`);
    return n;
  };
  try {
    // Promotion choisie ; les autres sont remises à zéro
    const promo = { promotion: null as number | null, seuil_achat: null as number | null, quantite_offerte: null as number | null, seuil_promo_qte: 0, prix_promo: 0, premieres_offertes: 0 };
    if (s.promo === 'remise') promo.promotion = ent(s.promotion, 'Remise (1 à 90 %)', 1, 90);
    if (s.promo === 'lot') {
      promo.seuil_achat = ent(s.seuil_achat, 'Lot : nombre acheté', 1, 100);
      promo.quantite_offerte = ent(s.quantite_offerte, 'Lot : nombre offert', 1, 100);
    }
    if (s.promo === 'degressif') {
      const seuil = nombre(s.seuil_promo_qte);
      const prixPromo = nombre(s.prix_promo);
      if (seuil == null || prixPromo == null || Number.isNaN(seuil) || Number.isNaN(prixPromo) || seuil <= 0 || prixPromo <= 0) throw new Error('Prix dégressif : indiquez la quantité et le prix.');
      if (prixPromo >= prix) throw new Error('Le prix dégressif doit être inférieur au prix normal.');
      promo.seuil_promo_qte = seuil;
      promo.prix_promo = Math.round(prixPromo * 100) / 100;
    }
    if (s.promo === 'premieres') {
      if (s.unite === 'g') throw new Error('« Premières offertes » n’existe pas pour un produit vendu au poids.');
      promo.premieres_offertes = ent(s.premieres_offertes, 'Premières offertes', 1, 50);
    }
    const contenu = nombre(s.contenance);
    if (avecContenu(s.unite) && contenu != null && (Number.isNaN(contenu) || contenu <= 0 || contenu > 100000)) throw new Error('Contenu invalide.');
    const pas = s.unite === 'g' ? ent(s.pas_g, 'Tranche de vente (10 à 5000 g)', 10, 5000) : nombre(s.pas_g);
    return {
      champs: {
        name: s.name.trim().slice(0, 120), price: Math.round(prix * 100) / 100, unite: s.unite, category: s.category, provenance: s.provenance.trim().slice(0, 80) || null,
        description: s.description.trim().slice(0, 1000), pas_g: pas == null || Number.isNaN(pas) ? null : pas,
        ...contenanceSaisie(s.unite, s.contenance, s.contenance_unite),
        ...promo,
      },
    };
  } catch (e) {
    return { erreur: (e as Error).message };
  }
}

export default function FicheProduit() {
  const params = useParams<{ id: string }>();
  const id = String(params?.id ?? '');
  const router = useRouter();
  const { peut, role, executer, enLigne, notifier } = useGestion();
  const modifiable = peut('catalogue');
  const [p, setP] = useState<Produit | null>(null);
  const [variantes, setVariantes] = useState<Variante[]>([]);
  const [fiche, setFiche] = useState<Fiche | null | undefined>(undefined);
  const [fichesVariantes, setFichesVariantes] = useState<Record<string, FicheVariante>>({});
  const [editeur, setEditeur] = useState<{ slugsPris: string[] } | null>(null);
  const [saisie, setSaisie] = useState<Saisie | null>(null);
  const [introuvable, setIntrouvable] = useState(false);
  const [erreur, setErreur] = useState('');
  const [conflit, setConflit] = useState<Produit | null>(null);
  const [stock, setStock] = useState<{ variante: Variante | null } | null>(null);
  const [cadrage, setCadrage] = useState<string | null>(null);
  const [envoi, setEnvoi] = useState(false);
  const [suppression, setSuppression] = useState(false);

  const charger = useCallback(async (garderSaisie = true) => {
    const [a, b, f] = await Promise.all([
      supabase.from('products').select(COLONNES_PRODUIT).eq('id', id).maybeSingle(),
      supabase.from('product_variants').select(COLONNES_VARIANTE).eq('product_id', id).order('ordre'),
      supabase.from('fiches_produits').select('*').eq('product_id', id).maybeSingle(),
    ]);
    if (a.error) return;
    if (!a.data) { setIntrouvable(true); return; }
    const prod = a.data as Produit;
    setP(prod);
    const vs = (b.data as Variante[]) ?? [];
    setVariantes(vs);
    if (!f.error) setFiche((f.data as Fiche) ?? null);
    if (vs.length) {
      const fv = await supabase.from('fiches_variantes').select('*').in('variant_id', vs.map((v) => v.id));
      if (!fv.error) setFichesVariantes(Object.fromEntries(((fv.data as FicheVariante[]) ?? []).map((x) => [x.variant_id, x])));
    }
    setSaisie((s) => (garderSaisie && s ? s : depuis(prod)));
  }, [id]);
  useEffect(() => {
    const t = setTimeout(() => { void charger(false); }, 0);
    return () => clearTimeout(t);
  }, [charger]);
  // En direct : on rafraîchit l'affichage mais on garde ce qui est en cours de saisie
  useChangements(['products', 'product_variants'], (_t, ch) => {
    if (ch.eventType === 'RESYNC' || ch.new?.id === id || ch.new?.product_id === id || ch.old?.id === id) void charger(true);
  });

  const modifie = useMemo(() => {
    if (!p || !saisie) return [] as (keyof Saisie)[];
    const d = depuis(p);
    return (Object.keys(d) as (keyof Saisie)[]).filter((k) => d[k] !== saisie[k]);
  }, [p, saisie]);

  if (introuvable) return (<><Retour /><Carte><p>Produit introuvable.</p></Carte></>);
  if (!p || !saisie) return (<><Retour /><Chargement lignes={4} /></>);

  const maj = (k: keyof Saisie) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => { setErreur(''); setSaisie({ ...saisie, [k]: e.target.value }); };

  async function enregistrer(version: string, champs: Partial<Produit>) {
    setEnvoi(true);
    const r = await executer(`Modification de ${p!.name}`, () => enregistrerProduit(p!.id, version, champs));
    setEnvoi(false);
    if (!r.ok) return;
    if (r.donnees.ok) {
      setP(r.donnees.ligne);
      setSaisie(depuis(r.donnees.ligne));
      setConflit(null);
      notifier({ type: 'ok', texte: `${r.donnees.ligne.name} enregistré` });
    } else if (r.donnees.conflit) {
      setConflit(r.donnees.conflit);
    } else {
      notifier({ type: 'erreur', texte: 'Ce produit a été supprimé entre-temps.' });
    }
  }

  // Seuls les champs modifiés sont envoyés : un autre champ changé ailleurs
  // entre-temps n'est jamais écrasé
  function champsModifies(): Partial<Produit> | null {
    const v = verifier(saisie!);
    if ('erreur' in v) { setErreur(v.erreur); return null; }
    const cles = new Set<string>(modifie);
    // Toute la promotion part ensemble (une seule à la fois)
    if (CHAMPS_PROMO.some((k) => cles.has(k))) ['promotion', 'seuil_promo_qte', 'prix_promo', 'seuil_achat', 'quantite_offerte', 'premieres_offertes'].forEach((k) => cles.add(k));
    // Le contenu suit l'unité (effacé pour une vente au kg ou au poids)
    if (cles.has('unite') || cles.has('contenance') || cles.has('contenance_unite')) { cles.add('contenance'); cles.add('contenance_unite'); }
    return Object.fromEntries(Object.entries(v.champs).filter(([k]) => cles.has(k))) as Partial<Produit>;
  }

  function valider() {
    const champs = champsModifies();
    if (champs) void enregistrer(p!.updated_at, champs);
  }

  async function photo(image: Blob) {
    if (image.size > 5 * 1024 * 1024) { notifier({ type: 'erreur', texte: 'Image trop lourde (5 Mo maximum).' }); return; }
    const r = await executer('Nouvelle photo', async () => {
      const nom = `${Date.now()}-${Math.round(Math.random() * 1e9)}.jpg`;
      const envoi = await supabase.storage.from('produits-images').upload(nom, image, { contentType: 'image/jpeg', upsert: false });
      if (envoi.error) throw envoi.error;
      const url = supabase.storage.from('produits-images').getPublicUrl(nom).data.publicUrl;
      return enregistrerProduit(p!.id, p!.updated_at, { image_url: url });
    });
    if (r.ok && r.donnees.ok) { setP(r.donnees.ligne); notifier({ type: 'ok', texte: 'Photo enregistrée' }); fermerCadrage(); }
    else if (r.ok && !r.donnees.ok) { notifier({ type: 'info', texte: 'Le produit a été modifié ailleurs pendant ce temps : rechargé, réessayez la photo.' }); fermerCadrage(); void charger(false); }
  }
  function fermerCadrage() { if (cadrage?.startsWith('blob:')) URL.revokeObjectURL(cadrage); setCadrage(null); }
  function choisirPhoto(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    e.target.value = '';
    if (!f) return;
    if (!['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/avif', 'image/heic'].includes(f.type) || f.size > 20 * 1024 * 1024) {
      notifier({ type: 'erreur', texte: 'Photo non prise en charge (JPG, PNG, WEBP, 20 Mo maximum).' });
      return;
    }
    setCadrage(URL.createObjectURL(f));
  }

  async function basculerVisibilite() {
    const r = await executer(p!.actif ? `Masquer ${p!.name}` : `Afficher ${p!.name}`, () => definirDisponibilite(p!.id, null, !p!.actif), {
      reussite: `${p!.name} ${p!.actif ? 'masqué du site' : 'visible sur le site'}`,
    });
    if (r.ok) void charger(true);
  }

  // Interrupteur « page détaillée » : ne touche qu'à la mise en ligne de la fiche
  async function basculerFiche() {
    if (!fiche) return;
    if (!fiche.publiee && !fiche.description?.trim()) { notifier({ type: 'erreur', texte: 'Ajoutez une description à la fiche pour pouvoir la mettre en ligne.' }); return; }
    const r = await executer(fiche.publiee ? 'Page détaillée hors ligne' : 'Page détaillée en ligne', async () => {
      let q = supabase.from('fiches_produits').update({ publiee: !fiche.publiee }).eq('product_id', p!.id);
      if (fiche.updated_at) q = q.eq('updated_at', fiche.updated_at);
      return reponse(q.select('*'));
    });
    if (!r.ok) return;
    const ligne = (r.donnees as Fiche[] | null)?.[0];
    if (ligne) { setFiche(ligne); notifier({ type: 'ok', texte: ligne.publiee ? 'Page détaillée en ligne' : 'Page détaillée retirée du site' }); }
    else { notifier({ type: 'info', texte: 'La fiche a été modifiée ailleurs entre-temps : rechargée, réessayez.' }); void charger(true); }
  }

  // Ouvre l'éditeur de la page détaillée (adresses déjà prises par les autres fiches)
  async function ouvrirEditeur() {
    const r = await executer('Ouverture de la page détaillée', () => reponse(supabase.from('fiches_produits').select('product_id, slug')));
    if (!r.ok) return;
    const slugs = ((r.donnees as { product_id: string; slug: string }[]) ?? []).filter((x) => String(x.product_id) !== String(p!.id)).map((x) => x.slug);
    setEditeur({ slugsPris: slugs });
  }

  async function supprimer() {
    setEnvoi(true);
    const r = await executer(`Suppression de ${p!.name}`, async () => {
      // Les variantes ne sont pas liées par la base : on les retire d'abord
      if (variantes.length) await reponse(supabase.from('product_variants').delete().eq('product_id', String(p!.id)).select('id'));
      const res = await reponse(supabase.from('products').delete().eq('id', p!.id).select('id'));
      if (!res?.length) throw new Error('Suppression refusée');
    }, { reussite: `${p!.name} supprimé` });
    setEnvoi(false);
    if (r.ok) router.replace('/gestion/produits');
  }

  const champ = 'w-full rounded-2xl border border-[#E3D6C4] bg-[#FBF6F0] px-3.5 py-3 text-[16px] outline-none focus:border-olivier disabled:opacity-60';
  const libelle = 'mb-1 block text-[12.5px] font-bold text-olivier-gris';
  const auKg = saisie.unite === 'g' || saisie.unite === 'kg';
  const uniteQte = saisie.unite === 'g' ? 'kg' : saisie.unite;
  const completude = fiche ? completudeFiche(fiche) : null;

  return (
    <>
      <Retour />
      <div className="relative mb-4 overflow-hidden rounded-3xl bg-white">
        {p.image_url ? <img src={p.image_url} alt="" className={`aspect-[3/2] w-full object-cover ${p.actif ? '' : 'opacity-50 grayscale'}`} /> : <div className="aspect-[3/2] w-full bg-lin" />}
        {modifiable && (
          <div className={`absolute bottom-3 right-3 flex gap-2 ${!enLigne ? 'pointer-events-none opacity-50' : ''}`}>
            {p.image_url && (
              <button type="button" onClick={() => setCadrage(p.image_url)} className="flex min-h-[44px] items-center gap-2 rounded-2xl bg-white/95 px-3.5 text-[13.5px] font-bold shadow">
                <Crop className="h-4 w-4" aria-hidden="true" /> Recadrer
              </button>
            )}
            <label className="flex min-h-[44px] cursor-pointer items-center gap-2 rounded-2xl bg-white/95 px-3.5 text-[13.5px] font-bold shadow">
              <Camera className="h-4 w-4" aria-hidden="true" /> Changer la photo
              <input type="file" accept="image/*" onChange={choisirPhoto} className="sr-only" />
            </label>
          </div>
        )}
      </div>
      <h1 className={`titre text-[28px] leading-tight ${p.actif ? '' : 'text-[#8C877E]'}`}>{p.name}</h1>
      <p className="mb-4 text-[13px] text-olivier-gris">
        modifié le {new Date(p.updated_at).toLocaleString('fr-FR', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
      </p>

      {/* Activer / désactiver l'article, comme sur le site */}
      <Carte className={`mb-3 flex items-center gap-3 ${p.actif ? '' : 'border border-dashed border-[#A79F94] !bg-[#E6DED2]'}`}>
        <span className="flex-1">
          <b className="block text-[15px]">{p.actif ? 'Article activé' : 'Article désactivé'}</b>
          <span className="text-[13px] text-olivier-gris">{p.actif ? 'Visible et commandable sur le site' : 'Masqué : les clients ne le voient pas'}</span>
        </span>
        <Bascule on={p.actif} libelle="Article visible sur le site" desactive={!enLigne || !peut('stock')} changer={basculerVisibilite} />
      </Carte>

      <Carte className="mb-3 flex items-center gap-3">
        <span className="flex-1">
          <b className="block text-[15px]">Stock</b>
          <span className="text-[13px] text-olivier-gris">{estIllimite(p.stock) ? 'Illimité' : libelleQuantite({ unite: p.unite }, Number(p.stock) || 0)}</span>
        </span>
        <button type="button" onClick={() => setStock({ variante: null })} className="min-h-[44px] rounded-2xl border border-olivier px-4 text-[14px] font-bold">Modifier le stock</button>
      </Carte>

      <Carte className="mb-3 space-y-3">
        <div>
          <label htmlFor="nom" className={libelle}>Nom</label>
          <input id="nom" value={saisie.name} onChange={maj('name')} disabled={!modifiable} className={champ} />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label htmlFor="prix" className={libelle}>Prix {auKg ? 'au kg' : ''} (€)</label>
            <input id="prix" inputMode="decimal" value={saisie.price} onChange={maj('price')} disabled={!modifiable} className={champ} />
          </div>
          <div>
            <label htmlFor="unite" className={libelle}>Vendu</label>
            <select id="unite" value={saisie.unite} onChange={maj('unite')} disabled={!modifiable} className={champ}>
              {UNITES.map((u) => <option key={u.valeur} value={u.valeur}>{u.libelle}</option>)}
            </select>
          </div>
          {saisie.unite === 'g' && (
            <div className="col-span-2">
              <label htmlFor="pas" className={libelle}>Vendu par tranche de (grammes)</label>
              <input id="pas" inputMode="numeric" value={saisie.pas_g} onChange={(e) => { setErreur(''); setSaisie({ ...saisie, pas_g: e.target.value.replace(/\D/g, '') }); }} disabled={!modifiable} className={champ} />
            </div>
          )}
          {avecContenu(saisie.unite) && (
            <div className="col-span-2">
              <ChampContenu id="contenu" unite={saisie.unite} quantite={saisie.contenance} uniteContenu={saisie.contenance_unite} desactive={!modifiable}
                changer={(q, u) => { setErreur(''); setSaisie({ ...saisie, contenance: q, contenance_unite: u }); }} />
            </div>
          )}
          <div>
            <label htmlFor="categorie" className={libelle}>Catégorie</label>
            <select id="categorie" value={saisie.category} onChange={maj('category')} disabled={!modifiable} className={champ}>
              {[...CATEGORIES, ...(CATEGORIES.includes(saisie.category) ? [] : [saisie.category])].map((c) => <option key={c}>{c}</option>)}
            </select>
          </div>
          <div>
            <label htmlFor="provenance" className={libelle}>Provenance</label>
            <input id="provenance" value={saisie.provenance} onChange={maj('provenance')} disabled={!modifiable} className={champ} />
          </div>
        </div>
        <div>
          <label htmlFor="description" className={libelle}>Description courte</label>
          <textarea id="description" rows={2} value={saisie.description} onChange={maj('description')} disabled={!modifiable} placeholder="facultatif" className={champ} />
        </div>
      </Carte>

      <Carte className="mb-3 space-y-3">
        <h2 className="text-[12px] font-extrabold uppercase tracking-[0.07em] text-olivier-gris">Promotion</h2>
        <div className="-mt-1 flex flex-wrap gap-1.5" role="radiogroup" aria-label="Type de promotion">
          {TYPES_PROMO.filter((t) => t.cle !== 'premieres' || saisie.unite !== 'g').map((t) => (
            <button key={t.cle} type="button" role="radio" aria-checked={saisie.promo === t.cle} disabled={!modifiable} onClick={() => { setErreur(''); setSaisie({ ...saisie, promo: t.cle }); }}
              className={`min-h-[40px] rounded-xl px-3 text-[13px] font-bold ${saisie.promo === t.cle ? 'bg-olivier text-lin' : 'bg-[#EFE6D8] text-olivier-gris'}`}>
              {t.libelle}
            </button>
          ))}
        </div>
        {saisie.promo === 'aucune' && <p className="text-[12.5px] text-olivier-gris">Une seule promotion à la fois, comme sur le site : en choisir une retire les autres.</p>}
        {saisie.promo === 'remise' && (
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label htmlFor="remise" className={libelle}>Remise (%)</label>
              <input id="remise" inputMode="numeric" placeholder="ex. 20" value={saisie.promotion} onChange={maj('promotion')} disabled={!modifiable} className={champ} />
            </div>
            <div className="flex items-end pb-3 text-[13px] text-olivier-gris">
              {nombre(saisie.promotion) && nombre(saisie.price) ? `→ ${formatPrix((nombre(saisie.price)! * (100 - nombre(saisie.promotion)!)) / 100)}${auKg ? ' /kg' : ''}` : ''}
            </div>
          </div>
        )}
        {saisie.promo === 'lot' && (
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label htmlFor="lot-a" className={libelle}>Achetés ({uniteQte})</label>
              <input id="lot-a" inputMode="numeric" placeholder="ex. 3" value={saisie.seuil_achat} onChange={maj('seuil_achat')} disabled={!modifiable} className={champ} />
            </div>
            <div>
              <label htmlFor="lot-o" className={libelle}>Offerts ({uniteQte})</label>
              <input id="lot-o" inputMode="numeric" placeholder="ex. 1" value={saisie.quantite_offerte} onChange={maj('quantite_offerte')} disabled={!modifiable} className={champ} />
            </div>
          </div>
        )}
        {saisie.promo === 'degressif' && (
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label htmlFor="degressif-qte" className={libelle}>À partir de ({uniteQte})</label>
              <input id="degressif-qte" inputMode="decimal" placeholder="ex. 2" value={saisie.seuil_promo_qte} onChange={maj('seuil_promo_qte')} disabled={!modifiable} className={champ} />
            </div>
            <div>
              <label htmlFor="degressif-prix" className={libelle}>Prix ({auKg ? '€/kg' : `€/${saisie.unite}`})</label>
              <input id="degressif-prix" inputMode="decimal" placeholder="ex. 4,50" value={saisie.prix_promo} onChange={maj('prix_promo')} disabled={!modifiable} className={champ} />
            </div>
          </div>
        )}
        {saisie.promo === 'premieres' && (
          <div>
            <label htmlFor="premieres" className={libelle}>Nombre offert (les suivants au prix normal)</label>
            <input id="premieres" inputMode="numeric" placeholder="ex. 1" value={saisie.premieres_offertes} onChange={maj('premieres_offertes')} disabled={!modifiable} className={champ} />
          </div>
        )}
      </Carte>

      {/* Page détaillée (fiche) */}
      <Carte className="mb-3">
        <div className="flex items-center gap-3">
          <span className="flex-1">
            <b className="block text-[15px]">Page détaillée</b>
            <span className="text-[12.5px] text-olivier-gris">
              {fiche === undefined ? '…' : !fiche ? 'Pas encore de page pour ce produit' : `${fiche.publiee ? 'En ligne' : 'Hors ligne'} · ${completude!.remplies} rubriques sur ${completude!.total}${fiche.recettes?.length ? ` · ${fiche.recettes.length} recette${fiche.recettes.length > 1 ? 's' : ''}` : ''}`}
            </span>
          </span>
          {fiche && <Bascule on={fiche.publiee} libelle="Page détaillée en ligne" desactive={!modifiable || !enLigne} changer={basculerFiche} />}
        </div>
        <div className="mt-3 grid grid-cols-2 gap-2">
          {fiche && (
            <a href={`/produits/${fiche.slug}`} target="_blank" rel="noopener" className="flex min-h-[44px] items-center justify-center gap-1.5 rounded-2xl border border-[#E3D6C4] text-[13.5px] font-bold">
              {fiche.publiee ? 'Voir la page' : 'Aperçu'} <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
            </a>
          )}
          {modifiable && (
            <button type="button" disabled={!enLigne || fiche === undefined} onClick={ouvrirEditeur} className={`flex min-h-[44px] items-center justify-center gap-1.5 rounded-2xl bg-olivier text-[13.5px] font-bold text-lin disabled:opacity-40 ${fiche ? '' : 'col-span-2'}`}>
              {fiche ? 'Modifier la page' : 'Créer la page'}
            </button>
          )}
        </div>
      </Carte>

      <Variantes p={p} variantes={variantes} ficheProduit={fiche ?? null} fichesVariantes={fichesVariantes} recharger={() => { void charger(true); }} />

      {role === 'admin' && (
        <div className="mb-3 mt-6">
          {suppression ? (
            <div className="rounded-3xl bg-[#F8EADF] p-4 text-[13.5px] leading-relaxed">
              <b className="block">Supprimer définitivement « {p.name} » ?</b>
              Seront aussi supprimées : {[fiche ? 'sa page détaillée' : '', variantes.length ? `ses ${variantes.length} variante${variantes.length > 1 ? 's' : ''}` : ''].filter(Boolean).join(' et ') || 'rien d’autre'}. Les commandes passées ne sont pas touchées. Pour le retirer temporairement, désactivez-le plutôt.
              <div className="mt-3 grid grid-cols-2 gap-2">
                <button type="button" onClick={() => setSuppression(false)} className="min-h-[48px] rounded-2xl border border-olivier font-bold">Annuler</button>
                <button type="button" disabled={envoi || !enLigne} onClick={supprimer} className="min-h-[48px] rounded-2xl bg-brique font-bold text-white disabled:opacity-40">Supprimer</button>
              </div>
            </div>
          ) : (
            <button type="button" disabled={!enLigne} onClick={() => setSuppression(true)} className="min-h-[52px] w-full rounded-3xl border border-[#E3D6C4] bg-white text-[14.5px] font-bold text-brique disabled:opacity-40">Supprimer le produit</button>
          )}
        </div>
      )}

      {/* Barre d'enregistrement : seulement quand il y a une modification en cours */}
      {modifiable && (modifie.length > 0 || envoi || !!erreur) && (
        <div className="sticky bottom-[calc(84px+env(safe-area-inset-bottom))] z-30 mt-4">
          {erreur && <p role="alert" className="mb-2 rounded-2xl bg-[#F1E1DB] px-4 py-2.5 text-[13.5px] font-semibold text-[#8A3A1E] shadow">{erreur}</p>}
          <button type="button" disabled={!modifie.length || envoi || !enLigne} onClick={valider} className="min-h-[56px] w-full rounded-2xl bg-olivier text-[16px] font-extrabold text-lin shadow-lg disabled:opacity-40">
            {envoi ? 'Enregistrement…' : !enLigne ? 'Hors connexion' : modifie.length ? `Enregistrer (${modifie.length} modification${modifie.length > 1 ? 's' : ''})` : 'Aucune modification'}
          </button>
        </div>
      )}

      {conflit && (
        <Feuille titre="Modifié ailleurs entre-temps" fermer={() => setConflit(null)}>
          <div className="px-4">
            <p className="text-[13.5px] leading-relaxed text-olivier-doux">Ce produit a été changé (depuis le site ou un autre téléphone) pendant votre saisie. Rien n’a été écrasé. Choisissez la version à garder :</p>
            <ul className="mt-3 space-y-2">
              {modifie.map((k) => (
                <li key={k} className="rounded-2xl bg-lin px-3 py-2 text-[13.5px]">
                  <b>{LIBELLES[k]}</b>
                  <span className="block text-olivier-gris">Sur le serveur : {lisible(depuis(conflit), k) || '—'}</span>
                  <span className="block">Votre saisie : {lisible(saisie, k) || '—'}</span>
                </li>
              ))}
            </ul>
            <div className="mt-3 grid grid-cols-2 gap-2">
              <button type="button" onClick={() => { setP(conflit); setSaisie(depuis(conflit)); setConflit(null); }} className="min-h-[52px] rounded-2xl border border-olivier text-[14px] font-bold">Garder le serveur</button>
              <button type="button" disabled={envoi} onClick={() => { const champs = champsModifies(); if (champs) void enregistrer(conflit.updated_at, champs); }} className="min-h-[52px] rounded-2xl bg-olivier text-[14px] font-bold text-lin">Mettre ma saisie</button>
            </div>
          </div>
        </Feuille>
      )}

      {stock && (
        <FeuilleStock
          cible={stock.variante
            ? { produit: p.id, variante: stock.variante.id, nom: stock.variante.nom, stock: stock.variante.stock, actif: stock.variante.actif, unite: stock.variante.unite ?? p.unite }
            : { produit: p.id, variante: null, nom: p.name, stock: p.stock, actif: p.actif, unite: p.unite }}
          fermer={() => setStock(null)}
          apres={() => charger(true)}
        />
      )}
      {cadrage && <CadrageImage src={cadrage} onAnnuler={fermerCadrage} onValider={photo} />}
      {editeur && (
        <EditeurFiche
          produit={p}
          fiche={fiche ?? null}
          slugsPris={editeur.slugsPris}
          onFermer={() => { setEditeur(null); void charger(true); }}
          onEnregistre={(f) => setFiche(f)}
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
