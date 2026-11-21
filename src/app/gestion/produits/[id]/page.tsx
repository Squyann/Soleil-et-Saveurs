'use client';
// Fiche produit : prix, unité, catégorie, provenance, promotions, photo,
// variétés et stock. L'enregistrement vérifie que personne n'a modifié le
// produit entre-temps ; sinon les deux versions sont proposées, rien n'est écrasé.
import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { ArrowLeft, Camera, ExternalLink } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { formatPrix, libelleQuantite } from '@/lib/format';
import { UNITES } from '@/lib/variantes';
import {
  CATEGORIES, COLONNES_PRODUIT, COLONNES_VARIANTE, enregistrerProduit, estIllimite, type Produit, type Variante,
} from '@/lib/gestion/produits';
import { useChangements, useGestion } from '@/components/gestion/AppliGestion';
import { Carte, Chargement } from '@/components/gestion/Elements';
import Feuille from '@/components/gestion/Feuille';
import FeuilleStock from '@/components/gestion/FeuilleStock';
import Variantes from '@/components/gestion/Variantes';
import CadrageImage from '@/components/CadrageImage';

// Champs modifiables dans l'appli (le reste — fiche détaillée, description,
// regroupements — reste dans l'admin du site)
type Saisie = {
  name: string; price: string; unite: string; category: string; provenance: string;
  promotion: string; seuil_promo_qte: string; prix_promo: string; seuil_achat: string; quantite_offerte: string; premieres_offertes: string;
};
const LIBELLES: Record<keyof Saisie, string> = {
  name: 'Nom', price: 'Prix', unite: 'Unité', category: 'Catégorie', provenance: 'Provenance', promotion: 'Remise %',
  seuil_promo_qte: 'Prix dégressif dès', prix_promo: 'Prix dégressif', seuil_achat: 'Lot : achetés', quantite_offerte: 'Lot : offerts', premieres_offertes: 'Premières offertes',
};

const texte = (v: unknown) => (v == null ? '' : String(v).replace('.', ','));
const nombre = (s: string) => { const n = Number(s.replace(',', '.').trim()); return s.trim() === '' ? null : Number.isFinite(n) ? n : NaN; };

function depuis(p: Produit): Saisie {
  return {
    name: p.name ?? '', price: texte(p.price), unite: p.unite ?? 'pièce', category: p.category ?? 'Légumes', provenance: p.provenance ?? '',
    promotion: p.promotion ? texte(p.promotion) : '', seuil_promo_qte: p.seuil_promo_qte ? texte(p.seuil_promo_qte) : '', prix_promo: p.prix_promo ? texte(p.prix_promo) : '',
    seuil_achat: p.seuil_achat ? texte(p.seuil_achat) : '', quantite_offerte: p.quantite_offerte ? texte(p.quantite_offerte) : '', premieres_offertes: p.premieres_offertes ? texte(p.premieres_offertes) : '',
  };
}

// Saisie → champs de la base (null si erreur, avec le message)
function verifier(s: Saisie): { champs: Partial<Produit> } | { erreur: string } {
  const prix = nombre(s.price);
  if (!s.name.trim()) return { erreur: 'Le nom est obligatoire.' };
  if (prix == null || Number.isNaN(prix) || prix <= 0 || prix > 1000) return { erreur: 'Prix invalide.' };
  const ent = (v: string, nom: string, max: number) => {
    const n = nombre(v);
    if (n == null) return 0;
    if (Number.isNaN(n) || n < 0 || n > max || !Number.isInteger(n)) throw new Error(`${nom} invalide.`);
    return n;
  };
  try {
    const promotion = ent(s.promotion, 'Remise', 90);
    const seuil = nombre(s.seuil_promo_qte) ?? 0;
    const prixPromo = nombre(s.prix_promo) ?? 0;
    if (Number.isNaN(seuil) || Number.isNaN(prixPromo) || seuil < 0 || prixPromo < 0) throw new Error('Prix dégressif invalide.');
    if ((seuil > 0) !== (prixPromo > 0)) throw new Error('Prix dégressif : indiquez la quantité et le prix.');
    if (prixPromo >= prix && prixPromo > 0) throw new Error('Le prix dégressif doit être inférieur au prix normal.');
    const achetes = ent(s.seuil_achat, 'Lot', 100);
    const offerts = ent(s.quantite_offerte, 'Lot', 100);
    if ((achetes > 0) !== (offerts > 0)) throw new Error('Lot : indiquez le nombre acheté et le nombre offert.');
    return {
      champs: {
        name: s.name.trim().slice(0, 120), price: Math.round(prix * 100) / 100, unite: s.unite, category: s.category, provenance: s.provenance.trim().slice(0, 80) || null,
        promotion: promotion || null, seuil_promo_qte: seuil, prix_promo: prixPromo, seuil_achat: achetes || null, quantite_offerte: offerts || null,
        premieres_offertes: ent(s.premieres_offertes, 'Premières offertes', 50),
      },
    };
  } catch (e) {
    return { erreur: (e as Error).message };
  }
}

export default function FicheProduit() {
  const params = useParams<{ id: string }>();
  const id = String(params?.id ?? '');
  const { peut, role, executer, enLigne, notifier } = useGestion();
  const modifiable = peut('catalogue');
  const [p, setP] = useState<Produit | null>(null);
  const [variantes, setVariantes] = useState<Variante[]>([]);
  const [saisie, setSaisie] = useState<Saisie | null>(null);
  const [introuvable, setIntrouvable] = useState(false);
  const [erreur, setErreur] = useState('');
  const [conflit, setConflit] = useState<Produit | null>(null);
  const [stock, setStock] = useState<{ variante: Variante | null } | null>(null);
  const [cadrage, setCadrage] = useState<string | null>(null);
  const [envoi, setEnvoi] = useState(false);

  const charger = useCallback(async (garderSaisie = true) => {
    const [a, b] = await Promise.all([
      supabase.from('products').select(COLONNES_PRODUIT).eq('id', id).maybeSingle(),
      supabase.from('product_variants').select(COLONNES_VARIANTE).eq('product_id', id).order('ordre'),
    ]);
    if (a.error) return;
    if (!a.data) { setIntrouvable(true); return; }
    const prod = a.data as Produit;
    setP(prod);
    setVariantes((b.data as Variante[]) ?? []);
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

  const maj = (k: keyof Saisie) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => { setErreur(''); setSaisie({ ...saisie, [k]: e.target.value }); };

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
    // Les deux champs d'une même promotion partent ensemble
    if (cles.has('seuil_promo_qte') || cles.has('prix_promo')) { cles.add('seuil_promo_qte'); cles.add('prix_promo'); }
    if (cles.has('seuil_achat') || cles.has('quantite_offerte')) { cles.add('seuil_achat'); cles.add('quantite_offerte'); }
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
  function fermerCadrage() { if (cadrage) URL.revokeObjectURL(cadrage); setCadrage(null); }
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

  const champ = 'w-full rounded-2xl border border-[#E3D6C4] bg-[#FBF6F0] px-3.5 py-3 text-[16px] outline-none focus:border-olivier disabled:opacity-60';
  const libelle = 'mb-1 block text-[12.5px] font-bold text-olivier-gris';
  const auKg = saisie.unite === 'g' || saisie.unite === 'kg';

  return (
    <>
      <Retour />
      <div className="relative mb-4 overflow-hidden rounded-3xl bg-white">
        {p.image_url ? <img src={p.image_url} alt="" className={`aspect-[3/2] w-full object-cover ${p.actif ? '' : 'opacity-50 grayscale'}`} /> : <div className="aspect-[3/2] w-full bg-lin" />}
        {modifiable && (
          <label className={`absolute bottom-3 right-3 flex min-h-[44px] cursor-pointer items-center gap-2 rounded-2xl bg-white/95 px-3.5 text-[13.5px] font-bold shadow ${!enLigne ? 'pointer-events-none opacity-50' : ''}`}>
            <Camera className="h-4 w-4" aria-hidden="true" /> Changer la photo
            <input type="file" accept="image/*" onChange={choisirPhoto} className="sr-only" />
          </label>
        )}
      </div>
      {!p.actif && (
        <p className="mb-3 rounded-2xl border border-dashed border-[#A79F94] bg-[#E6DED2] px-4 py-2.5 text-[13.5px] font-bold text-[#5E5951]">
          Masqué du site : les clients ne voient pas ce produit. « Stock et visibilité » pour le remettre en ligne.
        </p>
      )}
      <h1 className={`titre text-[28px] leading-tight ${p.actif ? '' : 'text-[#8C877E]'}`}>{p.name}</h1>
      <p className="mb-4 text-[13px] text-olivier-gris">
        {p.actif ? 'Visible sur le site' : 'Masqué du site'} · modifié le {new Date(p.updated_at).toLocaleString('fr-FR', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
      </p>

      <Carte className="mb-3 flex items-center gap-3">
        <span className="flex-1">
          <b className="block text-[15px]">Stock</b>
          <span className="text-[13px] text-olivier-gris">{estIllimite(p.stock) ? 'Illimité' : libelleQuantite({ unite: p.unite }, Number(p.stock) || 0)}</span>
        </span>
        <button type="button" onClick={() => setStock({ variante: null })} className="min-h-[44px] rounded-2xl border border-olivier px-4 text-[14px] font-bold">Stock et visibilité</button>
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
          <div>
            <label htmlFor="categorie" className={libelle}>Catégorie</label>
            <select id="categorie" value={saisie.category} onChange={maj('category')} disabled={!modifiable} className={champ}>
              {CATEGORIES.map((c) => <option key={c}>{c}</option>)}
            </select>
          </div>
          <div>
            <label htmlFor="provenance" className={libelle}>Provenance</label>
            <input id="provenance" value={saisie.provenance} onChange={maj('provenance')} disabled={!modifiable} className={champ} />
          </div>
        </div>
      </Carte>

      <Carte className="mb-3 space-y-3">
        <h2 className="text-[12px] font-extrabold uppercase tracking-[0.07em] text-olivier-gris">Promotions</h2>
        <p className="-mt-2 text-[12px] text-olivier-gris">Laissez vide pour aucune. Les mêmes règles que sur le site s’appliquent.</p>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label htmlFor="remise" className={libelle}>Remise (%)</label>
            <input id="remise" inputMode="numeric" placeholder="ex. 20" value={saisie.promotion} onChange={maj('promotion')} disabled={!modifiable} className={champ} />
          </div>
          <div className="flex items-end pb-3 text-[13px] text-olivier-gris">
            {nombre(saisie.promotion) && nombre(saisie.price) ? `→ ${formatPrix((nombre(saisie.price)! * (100 - nombre(saisie.promotion)!)) / 100)}${auKg ? ' /kg' : ''}` : ''}
          </div>
          <div>
            <label htmlFor="degressif-qte" className={libelle}>Prix dégressif dès ({auKg ? 'kg' : saisie.unite})</label>
            <input id="degressif-qte" inputMode="decimal" placeholder="ex. 2" value={saisie.seuil_promo_qte} onChange={maj('seuil_promo_qte')} disabled={!modifiable} className={champ} />
          </div>
          <div>
            <label htmlFor="degressif-prix" className={libelle}>Nouveau prix (€)</label>
            <input id="degressif-prix" inputMode="decimal" placeholder="ex. 4,50" value={saisie.prix_promo} onChange={maj('prix_promo')} disabled={!modifiable} className={champ} />
          </div>
          <div>
            <label htmlFor="lot-a" className={libelle}>Lot : achetés</label>
            <input id="lot-a" inputMode="numeric" placeholder="ex. 3" value={saisie.seuil_achat} onChange={maj('seuil_achat')} disabled={!modifiable} className={champ} />
          </div>
          <div>
            <label htmlFor="lot-o" className={libelle}>Lot : offerts</label>
            <input id="lot-o" inputMode="numeric" placeholder="ex. 1" value={saisie.quantite_offerte} onChange={maj('quantite_offerte')} disabled={!modifiable} className={champ} />
          </div>
          <div>
            <label htmlFor="premieres" className={libelle}>Premières offertes</label>
            <input id="premieres" inputMode="numeric" placeholder="ex. 1" value={saisie.premieres_offertes} onChange={maj('premieres_offertes')} disabled={!modifiable} className={champ} />
          </div>
        </div>
      </Carte>

      <Variantes p={p} variantes={variantes} recharger={() => { void charger(true); }} />

      {role === 'admin' && (
        <Link href="/admin" className="mb-3 flex min-h-[52px] items-center justify-between rounded-3xl border border-[#E3D6C4] bg-white px-4 text-[14.5px] font-bold">
          Page détaillée, description, regroupements <ExternalLink className="h-4 w-4 text-olivier-pale" aria-hidden="true" />
        </Link>
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
              {modifie.map((k) => {
                const serveur = depuis(conflit)[k];
                return (
                  <li key={k} className="rounded-2xl bg-lin px-3 py-2 text-[13.5px]">
                    <b>{LIBELLES[k]}</b>
                    <span className="block text-olivier-gris">Sur le serveur : {serveur || '—'}</span>
                    <span className="block">Votre saisie : {saisie[k] || '—'}</span>
                  </li>
                );
              })}
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
