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
];

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
  created_at?: string | null;
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
  return {
    ...produit,
    unite: uniteVariante(produit, v),
    pas_g: v.pas_g ?? produit.pas_g,
    promotion: v.promotion != null ? Number(v.promotion) : produit.promotion,
    stock: v.stock != null ? Number(v.stock) : stockPartage,
    ...(memeUnite ? {} : { seuil_achat: 0, quantite_offerte: 0, seuil_promo_qte: 0, prix_promo: 0, premieres_offertes: 0 }),
  };
}
