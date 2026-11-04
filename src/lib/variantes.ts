// Variantes d'un produit (ex. Ananas doux : entier / préparé ; Salade :
// laitue, batavia…). Les champs vides d'une variante reprennent ceux du
// produit parent. Mêmes règles que creer_commande côté serveur.

export type Variante = {
  id: string;
  product_id: string;
  nom: string;
  ordre?: number | null;
  prix?: number | null;
  image_url?: string | null;
  description?: string | null;
  actif?: boolean | null;
};

export const varianteActive = (v: Variante) => v.actif !== false;

// Variantes proposées au client, dans l'ordre choisi dans l'admin
export function variantesActives(variantes: Variante[] | undefined): Variante[] {
  return (variantes ?? []).filter(varianteActive).sort((a, b) => (a.ordre ?? 0) - (b.ordre ?? 0));
}

export function prixVariante(produit: { price: number }, v: Variante | null | undefined): number {
  return v && v.prix != null && !Number.isNaN(Number(v.prix)) ? Number(v.prix) : Number(produit.price);
}

export function imageVariante(produit: { image_url?: string | null }, v: Variante | null | undefined): string | null {
  return (v?.image_url || produit.image_url) ?? null;
}

// « Ananas doux entier » si la variante reprend le nom du produit, sinon
// « Salade – Batavia » (même règle que le serveur).
export function nomVariante(produit: { name: string }, v: Variante | null | undefined): string {
  if (!v) return produit.name;
  const parent = (produit.name || '').trim();
  return v.nom.toLowerCase().startsWith(parent.toLowerCase()) ? v.nom : `${produit.name} – ${v.nom}`;
}

// Libellé court affiché sur les boutons de choix (« Entier » plutôt que
// « Ananas doux entier »)
export function libelleCourt(produit: { name: string }, v: Variante): string {
  const parent = (produit.name || '').trim();
  if (parent && v.nom.toLowerCase().startsWith(parent.toLowerCase())) {
    const reste = v.nom.slice(parent.length).trim();
    if (reste) return reste.charAt(0).toUpperCase() + reste.slice(1);
  }
  return v.nom;
}

export const variantesCumulables = (produit: { variantes_cumulables?: boolean | null }) => produit.variantes_cumulables !== false;
