// Calcul des prix d'un produit et de ses variantes — MÊME algorithme que la
// fonction serveur creer_commande (migration 20261104_variantes_produits.sql),
// qui reste seule juge du montant facturé.
//
// Les promotions sont celles du produit parent et portent sur la quantité
// TOTALE de ses variantes : 1 laitue + 1 batavia = 2 salades pour le prix
// dégressif « dès 2 ». Règles, dans cet ordre (inchangées pour un produit
// sans variante) :
// 1. Prix dégressif (seuil_promo_qte / prix_promo) atteint : chaque unité perd
//    l'écart prix de base → prix promo (une variante au prix du parent passe
//    exactement au prix promo ; une variante plus chère garde son écart).
// 2. Sinon remise % sur chaque unité (celle de la variante si elle en a une), puis :
//    - lot « X achetés + Y offerts » : nombre d'unités offertes calculé sur le
//      total, offertes en priorité sur les variantes les moins chères ;
//    - ou « N premières offertes » : idem, les N moins chères.
import { premieresOffertes } from '@/lib/promos';

export type ProduitPrix = {
  price: number;
  unite?: string | null;
  promotion?: number | null;
  seuil_achat?: number | null;
  quantite_offerte?: number | null;
  seuil_promo_qte?: number | null;
  prix_promo?: number | null;
  premieres_offertes?: number | null;
};

// promotion : remise % propre à la ligne (variante), sinon celle du produit
export type LigneGroupe = { qte: number; prixBase: number; promotion?: number | null };

export type ResultatLigne = {
  prixUnitaire: number;   // prix unitaire après remise (€/unité ou €/kg)
  total: number;          // montant de la ligne
  totalSansPromo: number; // montant au prix de base
  offerts: number;        // unités offertes sur cette ligne
};

export type ResultatGroupe = {
  lignes: ResultatLigne[];
  total: number;
  totalSansPromo: number;
  qteTotale: number;       // en unité de vente (g pour les produits au gramme)
  degressifActif: boolean;
  offerts: number;
};

export function calculerGroupe(p: ProduitPrix, lignes: LigneGroupe[]): ResultatGroupe {
  const auGramme = p.unite === 'g';
  const eff = (q: number) => (auGramme ? q / 1000 : q);
  const qteTotale = lignes.reduce((s, l) => s + (l.qte || 0), 0);
  const prixParent = Number(p.price) || 0;
  const seuilDegressif = Number(p.seuil_promo_qte) || 0;
  const prixPromo = Number(p.prix_promo) || 0;
  const pct = Number(p.promotion) || 0;

  const resultats: ResultatLigne[] = lignes.map(l => ({
    prixUnitaire: l.prixBase, total: 0, totalSansPromo: eff(l.qte) * l.prixBase, offerts: 0,
  }));

  const degressifActif = seuilDegressif > 0 && prixPromo > 0 && eff(qteTotale) >= seuilDegressif;
  let offertsTotal = 0;

  if (degressifActif) {
    const ecart = prixParent - prixPromo;
    lignes.forEach((l, i) => {
      const unit = l.prixBase === prixParent ? prixPromo : Math.max(l.prixBase - ecart, 0);
      resultats[i].prixUnitaire = unit;
      resultats[i].total = eff(l.qte) * unit;
    });
  } else {
    lignes.forEach((l, i) => {
      const pctLigne = l.promotion != null ? Number(l.promotion) || 0 : pct;
      resultats[i].prixUnitaire = pctLigne > 0 ? l.prixBase * (1 - pctLigne / 100) : l.prixBase;
    });

    const seuil = Number(p.seuil_achat) || 0;
    const offert = Number(p.quantite_offerte) || 0;
    if (seuil > 0 && offert > 0) {
      const tailleLot = seuil + offert;
      const nbLots = Math.floor(qteTotale / tailleLot);
      const reste = qteTotale - nbLots * tailleLot;
      offertsTotal = qteTotale - (nbLots * seuil + Math.min(reste, seuil));
    } else if (premieresOffertes(p) > 0) {
      offertsTotal = Math.min(premieresOffertes(p), qteTotale);
    }

    // Unités offertes : sur les lignes les moins chères d'abord
    let aOffrir = offertsTotal;
    lignes
      .map((_, i) => i)
      .sort((a, b) => resultats[a].prixUnitaire - resultats[b].prixUnitaire || a - b)
      .forEach(i => {
        const f = Math.min(aOffrir, lignes[i].qte);
        resultats[i].offerts = f;
        aOffrir -= f;
      });

    lignes.forEach((l, i) => {
      resultats[i].total = eff(l.qte - resultats[i].offerts) * resultats[i].prixUnitaire;
    });
  }

  return {
    lignes: resultats,
    total: resultats.reduce((s, r) => s + r.total, 0),
    totalSansPromo: resultats.reduce((s, r) => s + r.totalSansPromo, 0),
    qteTotale,
    degressifActif,
    offerts: offertsTotal,
  };
}

// Ce qu'il manque pour profiter de la promo du produit (affiché dans le
// panier et sur les fiches) — null si rien à suggérer.
export function prochainePromo(p: ProduitPrix, qteTotale: number): { manque: number; texte: string } | null {
  const auGramme = p.unite === 'g';
  const uniteTexte = auGramme ? 'kg' : p.unite === 'kg' ? 'kg' : '';
  const qteEff = auGramme ? qteTotale / 1000 : qteTotale;
  const seuilDegressif = Number(p.seuil_promo_qte) || 0;
  const prixPromo = Number(p.prix_promo) || 0;
  if (seuilDegressif > 0 && prixPromo > 0 && qteEff < seuilDegressif) {
    const manque = +(seuilDegressif - qteEff).toFixed(3);
    return { manque, texte: `Encore ${String(manque).replace('.', ',')}${uniteTexte ? ' ' + uniteTexte : ''} pour passer à ${prixPromo.toFixed(2)}€/${auGramme ? 'kg' : p.unite || 'pièce'}` };
  }
  const seuil = Number(p.seuil_achat) || 0;
  const offert = Number(p.quantite_offerte) || 0;
  if (seuil > 0 && offert > 0 && !auGramme) {
    const tailleLot = seuil + offert;
    const reste = qteTotale % tailleLot;
    if (reste >= seuil) {
      const manque = tailleLot - reste;
      return { manque, texte: `Ajoutez-en encore ${manque} : ${manque > 1 ? 'ils sont offerts' : 'il est offert'}` };
    }
    if (reste > 0) {
      const manque = seuil - reste;
      return { manque, texte: `Encore ${manque} pour obtenir ${offert} offert${offert > 1 ? 's' : ''}` };
    }
  }
  return null;
}
