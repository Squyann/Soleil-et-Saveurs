// Prix au format français : « 3,99 € » (virgule décimale, espace insécable).
export const formatPrix = (montant: number) => `${(Number(montant) || 0).toFixed(2).replace('.', ',')} €`;

// Unité de vente en toutes lettres : « à la pièce », « au kg », « au poids »…
export function libelleUnite(unite: string | null | undefined): string {
  if (unite === 'g') return 'au poids';
  if (unite === 'kg') return 'au kg';
  return `à la ${unite || 'pièce'}`;
}
