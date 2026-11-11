// Prix au format français : « 3,99 € » (virgule décimale, espace insécable).
export const formatPrix = (montant: number) => `${(Number(montant) || 0).toFixed(2).replace('.', ',')} €`;

// Unité de vente en toutes lettres : « à la pièce », « au kg », « au poids »…
export function libelleUnite(unite: string | null | undefined): string {
  if (unite === 'g') return 'au poids';
  if (unite === 'kg') return 'au kg';
  return `à la ${unite || 'pièce'}`;
}

const PLURIELS: Record<string, string> = { pièce: 'pièces', botte: 'bottes', barquette: 'barquettes' };

// Quantité en toutes lettres : « 2 pièces », « 1,5 kg », « 300 g »
export function libelleQuantite(produit: { unite?: string | null }, q: number): string {
  if (produit.unite === 'g') return q < 1000 ? `${q} g` : `${String(q / 1000).replace('.', ',')} kg`;
  if (produit.unite === 'kg') return `${String(q).replace('.', ',')} kg`;
  const unite = produit.unite || 'pièce';
  return `${q} ${q > 1 ? PLURIELS[unite] ?? unite : unite}`;
}
