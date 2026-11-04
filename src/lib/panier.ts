// Ajout au panier et calcul du prix affiché, communs au catalogue (/commander),
// aux pages produits (/produits/[slug]) et au panier : un seul code, donc le
// même panier et les mêmes prix partout.
import { supabase } from '@/lib/supabase';
import { premieresOffertes } from '@/lib/promos';
import { calculerGroupe, type ResultatGroupe, type ResultatLigne } from '@/lib/prix';
import { imageVariante, nomVariante, prixVariante, variantesCumulables, type Variante } from '@/lib/variantes';

export const getPasG = (product: any) => product.pas_g || 100;
export const getStep = (product: any) => product.unite === 'kg' ? 0.5 : product.unite === 'g' ? getPasG(product) : 1;
export const getMin = (product: any) => product.unite === 'kg' ? 0.5 : product.unite === 'g' ? getPasG(product) : 1;
export const quantiteInitiale = (product: any) => product.unite === 'kg' ? 0.5 : product.unite === 'g' ? (product.pas_g || 100) : 1;
export const formatGramLabel = (g: number) => g < 1000 ? `${g}g` : `${(g / 1000).toString().replace('.', ',')}kg`;
export const uniteAffichee = (product: any) => product.unite === 'g' ? 'kg' : (product.unite || 'pièce');
export const formatQuantite = (product: any, q: number) => product.unite === 'g' ? formatGramLabel(q) : `${String(q).replace('.', ',')}${product.unite === 'kg' ? ' kg' : ''}`;

// Quantité saisie ramenée entre le minimum et le stock, arrondie au pas.
export function bornerQuantite(product: any, val: string, max: number): number {
  const step = getStep(product);
  const min = getMin(product);
  const num = Math.min(max, Math.max(min, parseFloat(val) || min));
  const rounded = Math.round(num / step) * step;
  return parseFloat(rounded.toFixed(2));
}

// Prix affiché pour `currentQty` d'une variante (prix de base `prixBase`).
// Pour le lot « X achetés + Y offerts », les unités offertes sont ajoutées en
// plus au moment de l'ajout : le prix affiché est celui des unités choisies.
export function calculerPrixAffiche(product: any, currentQty: number, prixBase: number = product.price) {
  const qteEffective = product.unite === 'g' ? currentQty / 1000 : currentQty;
  const groupe = calculerGroupe(product, [{ qte: currentQty, prixBase }]);
  const prixDegressifActif = groupe.degressifActif;
  const unitPrice = groupe.lignes[0].prixUnitaire;
  const lotDefini = product.seuil_achat > 0 && product.quantite_offerte > 0;

  const nbPremieresOffertes = prixDegressifActif ? 0 : premieresOffertes(product);
  const totalPrice = !prixDegressifActif && lotDefini ? qteEffective * unitPrice : groupe.total;
  const totalEconomy = qteEffective * prixBase - totalPrice;

  // --- CALCULS D'AFFICHAGE POUR LA PROMO X+Y ---
  const produitsOfferts = product.seuil_achat > 0
    ? Math.floor(currentQty / product.seuil_achat) * product.quantite_offerte
    : 0;
  const totalItemsRecus = currentQty + produitsOfferts;

  return { qteEffective, prixDegressifActif, unitPrice, nbPremieresOffertes, totalPrice, totalEconomy, produitsOfferts, totalItemsRecus };
}

export function lirePanier(): any[] {
  try {
    const p = JSON.parse(localStorage.getItem('mon-panier') || '[]');
    return Array.isArray(p) ? p : [];
  } catch {
    return [];
  }
}

export function ecrirePanier(panier: any[]) {
  localStorage.setItem('mon-panier', JSON.stringify(panier));
  window.dispatchEvent(new Event('panier-updated'));
}

const cleLigne = (item: any) => `${item.id}|${item.variant_id ?? ''}`;

// Une ligne de panier à partir du produit et de la variante choisie
function ligneDepuisProduit(product: any, variant: Variante | null, quantite: number) {
  const base = prixVariante(product, variant);
  return {
    ...product,
    name: nomVariante(product, variant),
    stock: product.stock,
    variant_id: variant ? variant.id : null,
    variant_nom: variant ? variant.nom : null,
    image_url: imageVariante(product, variant),
    // Prix de base de la variante (le panier applique lui-même les remises) et
    // prix du produit parent (référence du prix dégressif)
    price: base,
    originalPrice: base,
    prix_base: base,
    prix_parent: Number(product.price),
    quantite,
  };
}

// Ajoute `qteSaisie` du produit (et de la variante choisie) au panier.
// Produit à variante unique : la variante choisie remplace les autres.
// Renvoie true si une autre variante a été remplacée.
export function ajouterAuPanier(product: any, qteSaisie: number, variant: Variante | null): boolean {
  let qteFinale = qteSaisie;

  // --- LOGIQUE PROMO X POUR Y ---
  if (product.seuil_achat > 0 && product.quantite_offerte > 0) {
    const nombreDePaliersAtteints = Math.floor(qteSaisie / product.seuil_achat);
    const produitsGratuits = nombreDePaliersAtteints * product.quantite_offerte;
    qteFinale = qteSaisie + produitsGratuits;
  }

  const variantId = variant ? variant.id : null;
  let panierActuel = lirePanier();
  let remplace = false;

  if (variant && !variantesCumulables(product)) {
    const avant = panierActuel.length;
    panierActuel = panierActuel.filter((item: any) => item.id !== product.id || (item.variant_id ?? null) === variantId);
    remplace = panierActuel.length < avant;
  }

  const index = panierActuel.findIndex((item: any) => item.id === product.id && (item.variant_id ?? null) === variantId);
  if (index >= 0) {
    panierActuel[index] = { ...ligneDepuisProduit(product, variant, panierActuel[index].quantite + qteFinale) };
  } else {
    panierActuel.push(ligneDepuisProduit(product, variant, qteFinale));
  }

  ecrirePanier(panierActuel);
  return remplace;
}

// Prix de toutes les lignes du panier : les variantes d'un même produit sont
// calculées ensemble (promotions sur le total), comme sur le serveur.
export function calculerPanier(panier: any[]) {
  const groupes = new Map<string, any[]>();
  // Articles indisponibles : ni comptés dans les promos ni facturés
  for (const item of panier.filter(i => !i.indisponible)) {
    const g = groupes.get(String(item.id)) ?? [];
    g.push(item);
    groupes.set(String(item.id), g);
  }
  const parLigne = new Map<string, ResultatLigne>();
  const parProduit = new Map<string, ResultatGroupe>();
  for (const [id, items] of groupes) {
    const ref = items[0];
    const produit = { ...ref, price: Number(ref.prix_parent ?? ref.originalPrice ?? ref.price) };
    const resultat = calculerGroupe(produit, items.map(i => ({
      qte: Number(i.quantite) || 0,
      prixBase: Number(i.prix_base ?? i.originalPrice ?? i.price),
    })));
    items.forEach((i, k) => parLigne.set(cleLigne(i), resultat.lignes[k]));
    parProduit.set(id, resultat);
  }
  const total = [...parProduit.values()].reduce((s, g) => s + g.total, 0);
  const economie = [...parProduit.values()].reduce((s, g) => s + (g.totalSansPromo - g.total), 0);
  return {
    total,
    economie,
    ligne: (item: any) => item.indisponible
      ? { prixUnitaire: 0, total: 0, totalSansPromo: 0, offerts: 0 }
      : parLigne.get(cleLigne(item)),
    groupe: (item: any) => (item.indisponible ? undefined : parProduit.get(String(item.id))),
  };
}

// Met à jour le panier avec les données actuelles des produits et variantes
// (prix, promotions, photos, stock) : un panier enregistré il y a plusieurs
// jours ou recommandé depuis « Mon compte » affiche ainsi les bons prix.
// Les articles devenus indisponibles sont signalés (`indisponible`).
export async function rafraichirPanier(panier: any[]): Promise<any[]> {
  const ids = [...new Set(panier.map(i => String(i.id)))];
  if (ids.length === 0) return panier;
  const [{ data: produits, error }, { data: variantes }] = await Promise.all([
    supabase.from('products').select('*').in('id', ids),
    supabase.from('product_variants').select('*').in('product_id', ids),
  ]);
  if (error || !produits) return panier;

  const produitsParId = new Map(produits.map((p: any) => [String(p.id), p]));
  const variantesParId = new Map((variantes ?? []).map((v: any) => [String(v.id), v as Variante]));

  const lignes = panier.map(item => {
    const produit = produitsParId.get(String(item.id));
    if (!produit || produit.actif === false) return { ...item, indisponible: 'Ce produit n’est plus disponible' };
    let variante: Variante | null = null;
    if (item.variant_id) {
      variante = variantesParId.get(String(item.variant_id)) ?? null;
      if (!variante || variante.product_id !== String(produit.id)) return { ...item, indisponible: 'Cette variante n’existe plus' };
      if (variante.actif === false) return { ...item, indisponible: 'Cette variante n’est plus disponible' };
    }
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { indisponible, alerte, ...reste } = item;
    return { ...reste, ...ligneDepuisProduit(produit, variante, item.quantite) };
  });

  // Produit passé à « une seule variante » : signalé s'il en reste plusieurs
  const comptes = new Map<string, number>();
  lignes.forEach(l => { if (!l.indisponible) comptes.set(String(l.id), (comptes.get(String(l.id)) ?? 0) + 1); });
  return lignes.map(l => (!l.indisponible && l.variantes_cumulables === false && (comptes.get(String(l.id)) ?? 0) > 1)
    ? { ...l, alerte: 'Une seule variante possible : retirez-en une' }
    : l);
}
