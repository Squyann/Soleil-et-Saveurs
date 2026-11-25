import { creerSlug } from '@/lib/fiches';

// Variantes d'un produit (ex. Ananas doux : entier / préparé ; Salade :
// laitue, batavia…). Les champs vides d'une variante reprennent ceux du
// produit parent. Mêmes règles que creer_commande côté serveur.

// Unités de vente du site (une seule liste, utilisée pour les produits et
// pour les variantes). 'g' = vendu au gramme, prix saisi au kg.
export const UNITES: { valeur: string; libelle: string }[] = [
  { valeur: 'kg', libelle: 'kilogramme (kg)' },
  { valeur: 'g', libelle: 'grammes (g) — prix au kg' },
  { valeur: 'pièce', libelle: 'unité (pièce)' },
  { valeur: 'botte', libelle: 'botte' },
  { valeur: 'barquette', libelle: 'barquette' },
  { valeur: 'sachet', libelle: 'sachet' },
  { valeur: 'filet', libelle: 'filet' },
];

// Unités du contenu d'un conditionnement (ex. sachet de 1 kg, barquette de 500 g)
export const UNITES_CONTENANCE = ['g', 'kg', 'pièces'] as const;

// Contenu enregistré : sans objet pour une vente au kg ou au poids, et vide
// si la quantité n'est pas un nombre positif (même règle partout)
export function contenanceSaisie(unite: string | null | undefined, quantite: number | string | null | undefined, uniteContenu: string | null | undefined) {
  const q = Number(String(quantite ?? '').replace(',', '.'));
  if (['kg', 'g'].includes(unite || '') || !(q > 0) || String(quantite ?? '').trim() === '') return { contenance: null, contenance_unite: null };
  return { contenance: Math.round(q * 1000) / 1000, contenance_unite: (UNITES_CONTENANCE as readonly string[]).includes(uniteContenu || '') ? uniteContenu! : 'kg' };
}

export type Variante = {
  id: string;
  product_id: string;
  nom: string;
  ordre?: number | null;
  prix?: number | null;
  image_url?: string | null;
  description?: string | null;
  actif?: boolean | null;
  unite?: string | null;     // vide = unité du produit
  pas_g?: number | null;     // pas de quantité si vendue au gramme
  promotion?: number | null; // remise % propre, vide = celle du produit
  stock?: number | null;     // stock propre, vide = stock du produit / illimité
  source_product_id?: string | null; // produit d'origine (regroupement)
  contenance?: number | null;       // contenu propre (ex. barquette de 250 g)
  contenance_unite?: string | null; // vide = celui du produit (même unité)
  created_at?: string | null;
  updated_at?: string | null;
};

export const varianteActive = (v: Variante) => v.actif !== false;

// Variantes proposées au client, dans l'ordre choisi dans l'admin
export function variantesActives(variantes: Variante[] | undefined): Variante[] {
  return (variantes ?? [])
    .filter(varianteActive)
    .sort((a, b) => (a.ordre ?? 0) - (b.ordre ?? 0) || String(a.created_at ?? '').localeCompare(String(b.created_at ?? '')));
}

export function prixVariante(produit: { price: number }, v: Variante | null | undefined): number {
  return v && v.prix != null && !Number.isNaN(Number(v.prix)) ? Number(v.prix) : Number(produit.price);
}

export function imageVariante(produit: { image_url?: string | null }, v: Variante | null | undefined): string | null {
  return (v?.image_url || produit.image_url) ?? null;
}

export function uniteVariante(produit: { unite?: string | null }, v: Variante | null | undefined): string | null {
  return (v?.unite || produit.unite) ?? null;
}

const mots = (t: string) => (t || '').trim().split(/\s+/).filter(Boolean);

// Nom affiché d'une variante (même règle que le serveur) : son propre nom s'il
// commence comme celui du produit (« Ananas doux préparé », « Melon préparé »
// pour le produit « Melon entier »), sinon « Salade – Batavia ».
export function nomVariante(produit: { name: string }, v: Variante | null | undefined): string {
  if (!v) return produit.name;
  const premierProduit = mots(produit.name)[0]?.toLowerCase();
  const premierVariante = mots(v.nom)[0]?.toLowerCase();
  return premierProduit && premierProduit === premierVariante ? v.nom : `${produit.name} – ${v.nom}`;
}

// Libellé court affiché sur les boutons de choix : ce qui distingue la variante
// (« Entier », « Préparé » plutôt que « Ananas doux entier »).
export function libelleCourt(produit: { name: string }, v: Pick<Variante, 'nom'>): string {
  const mp = mots(produit.name).map(m => m.toLowerCase());
  const mv = mots(v.nom);
  let k = 0;
  while (k < mp.length && k < mv.length && mp[k] === mv[k].toLowerCase()) k++;
  if (k === 0 || k === mv.length) return v.nom; // nom différent, ou identique au produit
  const reste = mv.slice(k).join(' ');
  return reste.charAt(0).toUpperCase() + reste.slice(1);
}

export const variantesCumulables = (produit: { variantes_cumulables?: boolean | null }) => produit.variantes_cumulables !== false;

// La variante est-elle vendue dans l'unité du produit ? (elle profite alors des
// promotions par quantité du produit et de son stock partagé)
export const memeUniteQueProduit = (produit: { unite?: string | null }, v: Variante | null | undefined) =>
  (uniteVariante(produit, v) ?? null) === (produit.unite ?? null);

// Le produit « vu » à travers sa variante : unité, pas, remise et stock de la
// variante. Les promotions par quantité du produit ne s'appliquent qu'aux
// variantes vendues dans son unité. `price` reste le prix du produit (référence
// du prix dégressif) ; le prix de la variante est donné par prixVariante().
export function produitPourVariante<T extends Record<string, any>>(produit: T, v: Variante | null | undefined): T {
  if (!v) return produit;
  const memeUnite = memeUniteQueProduit(produit, v);
  const stockPartage = memeUnite ? produit.stock : null; // autre unité : illimité sauf stock propre
  // Contenu : celui de la variante s'il est précisé, sinon celui du produit
  // (seulement si elle est vendue dans la même unité)
  const contenuPropre = Number(v.contenance) > 0 && !!v.contenance_unite;
  return {
    ...produit,
    unite: uniteVariante(produit, v),
    pas_g: v.pas_g ?? produit.pas_g,
    promotion: v.promotion != null ? Number(v.promotion) : produit.promotion,
    stock: v.stock != null ? Number(v.stock) : stockPartage,
    ...(memeUnite ? {} : { seuil_achat: 0, quantite_offerte: 0, seuil_promo_qte: 0, prix_promo: 0, premieres_offertes: 0, contenance: null, contenance_unite: null }),
    ...(contenuPropre ? { contenance: Number(v.contenance), contenance_unite: v.contenance_unite } : {}),
  };
}

// Identifiant lisible d'une variante dans l'adresse de la page produit :
// /produits/ananas-doux?variete=prepare
export function slugVariante(produit: { name: string }, v: Pick<Variante, 'nom'>): string {
  return creerSlug(libelleCourt(produit, v)) || creerSlug(v.nom);
}
