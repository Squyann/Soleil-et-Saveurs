// Promo « N premières offertes » (ex. persil : 1ʳᵉ botte offerte, les suivantes
// au prix normal). Même règle que creer_commande côté serveur : uniquement pour
// les produits vendus à l'unité (pas au gramme), et sans effet si le prix
// dégressif s'applique ou si une promo « X achetés + Y offerts » est définie.

type ProduitPromo = {
  unite?: string | null;
  premieres_offertes?: number | null;
  seuil_achat?: number | null;
  quantite_offerte?: number | null;
};

export function premieresOffertes(p: ProduitPromo): number {
  if (p.unite === 'g') return 0;
  if ((p.seuil_achat || 0) > 0 && (p.quantite_offerte || 0) > 0) return 0;
  return Math.max(0, p.premieres_offertes || 0);
}

// Quantité réellement payée pour `qte` unités.
export function qtePayantePremieresOffertes(p: ProduitPromo, qte: number): number {
  return Math.max(qte - premieresOffertes(p), 0);
}

const PLURIELS: Record<string, string> = { pièce: 'pièces', botte: 'bottes', barquette: 'barquettes' };

// « 1ʳᵉ botte offerte », « 2 premières pièces offertes », « 1er kg offert »…
export function libellePremieresOffertes(p: ProduitPromo): string {
  const n = premieresOffertes(p);
  const unite = p.unite || 'pièce';
  if (unite === 'kg') return n === 1 ? '1er kg offert' : `${n} premiers kg offerts`;
  return n === 1 ? `1ʳᵉ ${unite} offerte` : `${n} premières ${PLURIELS[unite] ?? unite} offertes`;
}

type ProduitEnPromo = ProduitPromo & {
  promotion?: number | null;
  seuil_promo_qte?: number | null;
  prix_promo?: number | null;
};

// Le produit a-t-il une promotion en cours (remise %, lot X+Y, prix dégressif
// ou « N premières offertes ») ? Lu directement sur les champs gérés dans
// l'admin : retirer la promo rend aussitôt au produit son affichage normal.
export function estEnPromo(p: ProduitEnPromo): boolean {
  return (p.promotion || 0) > 0
    || ((p.seuil_achat || 0) > 0 && (p.quantite_offerte || 0) > 0)
    || ((p.seuil_promo_qte || 0) > 0 && (p.prix_promo || 0) > 0)
    || premieresOffertes(p) > 0;
}
