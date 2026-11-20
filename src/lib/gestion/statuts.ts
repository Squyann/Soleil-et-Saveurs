// Statuts des commandes, communs au site, à l'admin web et à l'application.
//
// Valeurs enregistrées en base : « En attente », « En préparation »,
// « En livraison », « livrée », « annulée ». Les changements autorisés sont
// vérifiés par la base (changer_statut_commande) ; ce fichier reprend les
// mêmes règles pour l'affichage. À garder identique à statut_normalise().

export type Statut = 'nouvelle' | 'preparation' | 'livraison' | 'livree' | 'annulee';

export const STATUTS: readonly Statut[] = ['nouvelle', 'preparation', 'livraison', 'livree', 'annulee'];

export function statutNormalise(valeur: string | null | undefined): Statut {
  const s = (valeur ?? '').trim().toLowerCase();
  if ((STATUTS as readonly string[]).includes(s)) return s as Statut;
  if (s.startsWith('en liv')) return 'livraison';
  if (s.startsWith('livr')) return 'livree';
  if (s.startsWith('annul')) return 'annulee';
  if (s.startsWith('en pr')) return 'preparation';
  return 'nouvelle';
}

export const LIBELLE_STATUT: Record<Statut, string> = {
  nouvelle: 'Nouvelle',
  preparation: 'En préparation',
  livraison: 'En livraison',
  livree: 'Livrée',
  annulee: 'Annulée',
};

// Couleurs de la charte (pastilles)
export const COULEUR_STATUT: Record<Statut, { fond: string; texte: string }> = {
  nouvelle: { fond: '#ECAD44', texte: '#2F4A2B' },
  preparation: { fond: '#F8EADF', texte: '#A94E25' },
  livraison: { fond: '#E7EEDC', texte: '#2F4A2B' },
  livree: { fond: '#2F4A2B', texte: '#F3E8D6' },
  annulee: { fond: '#F1E1DB', texte: '#8A3A1E' },
};

const SUIVANTS: Record<Statut, readonly Statut[]> = {
  nouvelle: ['preparation', 'livraison', 'livree', 'annulee'],
  preparation: ['nouvelle', 'livraison', 'livree', 'annulee'],
  livraison: ['preparation', 'livree', 'annulee'],
  livree: [],
  annulee: [],
};

export function changementsPossibles(statut: Statut): readonly Statut[] {
  return SUIVANTS[statut];
}

// Étape suivante « normale » (bouton principal)
export function etapeSuivante(statut: Statut): Statut | null {
  if (statut === 'nouvelle') return 'preparation';
  if (statut === 'preparation') return 'livraison';
  if (statut === 'livraison') return 'livree';
  return null;
}

export const estTerminee = (s: Statut) => s === 'livree' || s === 'annulee';
