// Prix au format français : « 3,99 € » (virgule décimale, espace insécable).
export const formatPrix = (montant: number) => `${(Number(montant) || 0).toFixed(2).replace('.', ',')} €`;

// Contenu d'un conditionnement, saisi dans l'admin : « 1 kg », « 500 g », « 3 pièces »
export type Contenance = { contenance?: number | string | null; contenance_unite?: string | null };

export function libelleContenance(c: Contenance | null | undefined): string {
  const q = Number(c?.contenance);
  if (!c || !c.contenance_unite || !(q > 0)) return '';
  const nombre = String(q).replace('.', ',');
  if (c.contenance_unite === 'pièces') return `${nombre} pièce${q > 1 ? 's' : ''}`;
  return `${nombre} ${c.contenance_unite}`;
}

// Unités de vente au masculin (« au sachet », « au filet »), les autres au féminin
const UNITES_MASCULINES = ['sachet', 'filet'];

// Unité de vente en toutes lettres : « à la pièce », « au kg », « au poids »,
// « au sachet de 1 kg », « à la barquette de 500 g »…
export function libelleUnite(unite: string | null | undefined, contenu?: Contenance | null): string {
  if (unite === 'g') return 'au poids';
  if (unite === 'kg') return 'au kg';
  const u = unite || 'pièce';
  const base = UNITES_MASCULINES.includes(u) ? `au ${u}` : `à la ${u}`;
  const c = libelleContenance(contenu);
  return c ? `${base} de ${c}` : base;
}

const PLURIELS: Record<string, string> = { pièce: 'pièces', botte: 'bottes', barquette: 'barquettes', sachet: 'sachets', filet: 'filets' };

// Quantité en toutes lettres : « 2 pièces », « 1,5 kg », « 300 g »
export function libelleQuantite(produit: { unite?: string | null }, q: number): string {
  if (produit.unite === 'g') return q < 1000 ? `${q} g` : `${String(q / 1000).replace('.', ',')} kg`;
  if (produit.unite === 'kg') return `${String(q).replace('.', ',')} kg`;
  const unite = produit.unite || 'pièce';
  return `${q} ${q > 1 ? PLURIELS[unite] ?? unite : unite}`;
}
