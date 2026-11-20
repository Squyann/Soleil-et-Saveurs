// Commandes dans l'application de gestion : lecture, affichage et
// changement de statut (toujours confirmé par le serveur).

import { supabase } from '@/lib/supabase';
import { libelleQuantite } from '@/lib/format';
import { statutNormalise, type Statut } from './statuts';

export type LignePanier = {
  id?: string;
  name?: string;
  nom?: string;
  variant_nom?: string | null;
  quantite?: number | string;
  unite?: string | null;
  prixUnitaire?: number | string;
  prixTotalLigne?: number | string;
  offerts?: number | string;
  image_url?: string | null;
};

export type Commande = {
  id: number;
  created_at: string;
  updated_at?: string;
  nom_client: string | null;
  email_client: string | null;
  telephone_client: string | null;
  adresse_livraison: string | null;
  total: number | null;
  frais_livraison: number | null;
  distance_km: number | null;
  statut: string | null;
  methode_paiement: string | null;
  user_id: string | null;
  contenu_panier: LignePanier[] | null;
  date_livraison: string | null;
  creneau_livraison: string | null;
  code_promo: string | null;
  remise_code_pct: number | null;
  commentaire_client: string | null;
  motif_annulation?: string | null;
  statut_modifie_le?: string | null;
};

export const COLONNES = 'id, created_at, updated_at, nom_client, email_client, telephone_client, adresse_livraison, total, frais_livraison, distance_km, statut, methode_paiement, user_id, contenu_panier, date_livraison, creneau_livraison, code_promo, remise_code_pct, commentaire_client, motif_annulation, statut_modifie_le';

// Créneau de livraison habituel (voir e-mails de commande)
export const CRENEAU = '15 h – 20 h';

export const statutDe = (c: Pick<Commande, 'statut'>): Statut => statutNormalise(c.statut);

export function ville(adresse: string | null | undefined): string {
  const m = (adresse ?? '').match(/\b\d{5}\s+([^,]+)/);
  return m ? m[1].trim() : '';
}

export const lignes = (c: Pick<Commande, 'contenu_panier'>) => (Array.isArray(c.contenu_panier) ? c.contenu_panier : []);

export function nomLigne(l: LignePanier) {
  const base = l.name || l.nom || 'Produit';
  return l.variant_nom && !base.includes(l.variant_nom) ? `${base} · ${l.variant_nom}` : base;
}

export function quantiteLigne(l: LignePanier) {
  const q = Number(l.quantite) || 0;
  return libelleQuantite({ unite: l.unite }, q);
}

export function telephoneLisible(t: string | null | undefined) {
  const c = (t ?? '').replace(/\D/g, '');
  const n = c.startsWith('33') && c.length === 11 ? '0' + c.slice(2) : c;
  return n.length === 10 ? n.replace(/(\d{2})(?=\d)/g, '$1 ') : (t ?? '');
}

export function lienWhatsApp(t: string | null | undefined) {
  const c = (t ?? '').replace(/\D/g, '');
  const intl = c.startsWith('0') && c.length === 10 ? '33' + c.slice(1) : c;
  return intl.length >= 10 ? `https://wa.me/${intl}` : null;
}

export const lienItineraire = (adresse: string | null | undefined) =>
  adresse ? `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(adresse)}` : null;

export type ReponseStatut =
  | { ok: true; statut: string; updated_at: string; inchange: boolean; email: 'envoye' | 'echec' | 'sans' }
  | { ok: false; conflit: true; statut: string };

// Changement de statut par le serveur. Lève une erreur si refusé ou en panne ;
// renvoie { conflit } si la commande a changé entre-temps (rien n'est modifié).
export async function changerStatut(c: Pick<Commande, 'id' | 'statut'>, nouveau: Statut, motif?: string): Promise<ReponseStatut> {
  const { data } = await supabase.auth.getSession();
  const jeton = data.session?.access_token;
  if (!jeton) throw new Error('Session expirée, reconnectez-vous');
  const rep = await fetch('/api/gestion/statut', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${jeton}` },
    body: JSON.stringify({ id: c.id, attendu: statutDe(c), nouveau, motif }),
  });
  const corps = await rep.json().catch(() => ({}));
  if (rep.status === 409 && corps.conflit) return { ok: false, conflit: true, statut: String(corps.statut ?? '') };
  if (!rep.ok) throw new Error(typeof corps.error === 'string' ? corps.error : `Erreur ${rep.status}`);
  return { ok: true, statut: corps.statut, updated_at: corps.updated_at, inchange: !!corps.inchange, email: corps.email };
}
