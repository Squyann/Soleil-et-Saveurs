// Ajout au panier et calcul du prix affiché, communs au catalogue (/commander)
// et aux pages produits (/produits/[slug]) : un seul code, donc le même panier
// et les mêmes prix partout. Code repris tel quel de la page catalogue.
import { premieresOffertes, qtePayantePremieresOffertes } from '@/lib/promos';

export const getPasG = (product: any) => product.pas_g || 100;
export const getStep = (product: any) => product.unite === 'kg' ? 0.5 : product.unite === 'g' ? getPasG(product) : 1;
export const getMin = (product: any) => product.unite === 'kg' ? 0.5 : product.unite === 'g' ? getPasG(product) : 1;
export const quantiteInitiale = (product: any) => product.unite === 'kg' ? 0.5 : product.unite === 'g' ? (product.pas_g || 100) : 1;
export const formatGramLabel = (g: number) => g < 1000 ? `${g}g` : `${(g / 1000).toString().replace('.', ',')}kg`;
export const uniteAffichee = (product: any) => product.unite === 'g' ? 'kg' : (product.unite || 'pièce');

// Quantité saisie ramenée entre le minimum et le stock, arrondie au pas.
export function bornerQuantite(product: any, val: string, max: number): number {
  const step = getStep(product);
  const min = getMin(product);
  const num = Math.min(max, Math.max(min, parseFloat(val) || min));
  const rounded = Math.round(num / step) * step;
  return parseFloat(rounded.toFixed(2));
}

// Prix affiché pour `currentQty` (même calcul que le panier et creer_commande).
export function calculerPrixAffiche(product: any, currentQty: number) {
  const qteEffective = product.unite === 'g' ? currentQty / 1000 : currentQty;

  // Prix dégressif
  const prixDegressifActif = product.seuil_promo_qte > 0 && product.prix_promo > 0
    && qteEffective >= product.seuil_promo_qte;

  const unitPrice = prixDegressifActif
    ? product.prix_promo
    : product.promotion > 0
      ? product.price * (1 - product.promotion / 100)
      : product.price;

  // Promo « N premières offertes » (ignorée si le prix dégressif s'applique)
  const nbPremieresOffertes = prixDegressifActif ? 0 : premieresOffertes(product);
  const totalPrice = (nbPremieresOffertes > 0 ? qtePayantePremieresOffertes(product, currentQty) : qteEffective) * unitPrice;
  const totalEconomy = qteEffective * product.price - totalPrice;

  // --- CALCULS D'AFFICHAGE POUR LA PROMO X+Y ---
  const produitsOfferts = product.seuil_achat > 0
    ? Math.floor(currentQty / product.seuil_achat) * product.quantite_offerte
    : 0;
  const totalItemsRecus = currentQty + produitsOfferts;

  return { qteEffective, prixDegressifActif, unitPrice, nbPremieresOffertes, totalPrice, totalEconomy, produitsOfferts, totalItemsRecus };
}

// Ajoute `qteSaisie` du produit (et de la variété choisie) au panier du navigateur.
export function ajouterAuPanier(product: any, qteSaisie: number, variant: any | null) {
  let qteFinale = qteSaisie;

  // --- LOGIQUE PROMO X POUR Y ---
  if (product.seuil_achat > 0 && product.quantite_offerte > 0) {
    const nombreDePaliersAtteints = Math.floor(qteSaisie / product.seuil_achat);
    const produitsGratuits = nombreDePaliersAtteints * product.quantite_offerte;
    qteFinale = qteSaisie + produitsGratuits;
  }

  const variantId = variant ? variant.id : null;

  const panierActuel = JSON.parse(localStorage.getItem('mon-panier') || '[]');
  const index = panierActuel.findIndex((item: any) => item.id === product.id && (item.variant_id ?? null) === variantId);

  if (index >= 0) {
    panierActuel[index].quantite += qteFinale;
  } else {
    panierActuel.push({
      ...product,
      name: variant ? `${product.name} – ${variant.nom}` : product.name,
      stock: product.stock,
      variant_id: variantId,
      variant_nom: variant ? variant.nom : null,
      // Prix de base : le panier applique lui-même la remise (sinon elle
      // était comptée deux fois). originalPrice gardé pour les anciens paniers.
      price: product.price,
      originalPrice: product.price,
      quantite: qteFinale
    });
  }

  localStorage.setItem('mon-panier', JSON.stringify(panierActuel));
  window.dispatchEvent(new Event('panier-updated'));
}
