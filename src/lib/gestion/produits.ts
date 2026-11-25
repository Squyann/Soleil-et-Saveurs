// Produits dans l'application de gestion : stock (ajouté ou retiré côté
// serveur), visibilité, et modification protégée contre les écrasements
// (date de dernière modification vérifiée à l'enregistrement).

import { supabase } from '@/lib/supabase';
import { formatPrix, libelleUnite } from '@/lib/format';
import { reponse } from './memoire';

export type Produit = {
  id: string;
  name: string;
  description: string | null;
  price: number;
  image_url: string | null;
  category: string | null;
  stock: number | null;
  unite: string | null;
  provenance: string | null;
  promotion: number | null;
  seuil_achat: number | null;
  quantite_offerte: number | null;
  seuil_promo_qte: number | null;
  prix_promo: number | null;
  premieres_offertes: number | null;
  actif: boolean;
  contenance: number | null;
  contenance_unite: string | null;
  pas_g: number | null;
  variantes_cumulables: boolean | null;
  updated_at: string;
};

export type Variante = {
  id: string;
  product_id: string;
  nom: string;
  ordre: number;
  prix: number | null;
  unite: string | null;
  promotion: number | null;
  stock: number | null;
  actif: boolean;
  image_url: string | null;
  pas_g: number | null;
  description: string | null;
  contenance: number | null;
  contenance_unite: string | null;
  source_product_id: string | null;
  updated_at: string;
};

export const COLONNES_PRODUIT = 'id, name, description, price, image_url, category, stock, unite, provenance, promotion, seuil_achat, quantite_offerte, seuil_promo_qte, prix_promo, premieres_offertes, actif, contenance, contenance_unite, pas_g, variantes_cumulables, updated_at';
export const COLONNES_VARIANTE = 'id, product_id, nom, ordre, prix, unite, promotion, stock, actif, image_url, pas_g, description, contenance, contenance_unite, source_product_id, updated_at';

export const CATEGORIES = ['Fruits', 'Légumes', 'Épicerie', 'Panier'];

// Sur le site, « illimité » est enregistré comme un très grand nombre
export const STOCK_ILLIMITE = 99999;
export const SEUIL_STOCK_BAS = 5;
export const estIllimite = (stock: number | null | undefined) => stock == null || stock >= 9999;
export const estStockBas = (stock: number | null | undefined) => !estIllimite(stock) && Number(stock) <= SEUIL_STOCK_BAS;

export function prixAffiche(p: Pick<Produit, 'price' | 'unite' | 'contenance' | 'contenance_unite'>) {
  const unite = p.unite === 'g' || p.unite === 'kg' ? '/kg' : libelleUnite(p.unite, p);
  return `${formatPrix(Number(p.price) || 0)} ${unite}`;
}

export function stockLisible(stock: number | null | undefined, unite?: string | null) {
  if (estIllimite(stock)) return '∞';
  const n = Number(stock) || 0;
  return unite === 'g' && n >= 1000 ? `${String(n / 1000).replace('.', ',')} kg` : String(n).replace('.', ',');
}

// --- Écritures (toutes contrôlées par la base) ------------------------------

export const ajusterStock = (produit: string, variante: string | null, delta: number) =>
  reponse(supabase.rpc('ajuster_stock', { p_produit: produit, p_variante: variante, p_delta: delta })) as Promise<{ stock: number; updated_at: string }>;

export const definirStock = (produit: string, variante: string | null, valeur: number | null) =>
  reponse(supabase.rpc('definir_stock', { p_produit: produit, p_variante: variante, p_valeur: valeur })) as Promise<{ stock: number | null; updated_at: string }>;

export const definirDisponibilite = (produit: string, variante: string | null, actif: boolean) =>
  reponse(supabase.rpc('definir_disponibilite', { p_produit: produit, p_variante: variante, p_actif: actif })) as Promise<{ actif: boolean; updated_at: string }>;

export type Enregistrement<T> = { ok: true; ligne: T } | { ok: false; conflit: T | null };

// Enregistre seulement si personne n'a modifié la ligne depuis son ouverture.
// Sinon renvoie la version actuelle du serveur (conflit) sans rien écrire.
export async function enregistrerProduit(id: string, versionLue: string, champs: Partial<Produit>): Promise<Enregistrement<Produit>> {
  const r = await supabase.from('products').update(champs).eq('id', id).eq('updated_at', versionLue).select(COLONNES_PRODUIT);
  if (r.error) throw r.error;
  if (r.data && r.data.length) return { ok: true, ligne: r.data[0] as Produit };
  const actuel = await reponse(supabase.from('products').select(COLONNES_PRODUIT).eq('id', id).maybeSingle());
  return { ok: false, conflit: (actuel as Produit) ?? null };
}

export async function enregistrerVariante(id: string, versionLue: string, champs: Partial<Variante>): Promise<Enregistrement<Variante>> {
  const r = await supabase.from('product_variants').update(champs).eq('id', id).eq('updated_at', versionLue).select(COLONNES_VARIANTE);
  if (r.error) throw r.error;
  if (r.data && r.data.length) return { ok: true, ligne: r.data[0] as Variante };
  const actuel = await reponse(supabase.from('product_variants').select(COLONNES_VARIANTE).eq('id', id).maybeSingle());
  return { ok: false, conflit: (actuel as Variante) ?? null };
}
