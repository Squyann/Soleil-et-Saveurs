// Règles de livraison — une seule source pour le site, identiques à la
// fonction serveur creer_commande (migration 20261112), qui reste seule juge
// du montant facturé.
//
// - Points relais : Chatou, Croissy-sur-Seine, Mareil-sur-Mauldre,
//   Saint-Nom-la-Bretèche.
// - Livraison OFFERTE pour une adresse située dans l'une de ces 4 villes, quel
//   que soit le montant (ville reconnue par son code INSEE).
// - Ailleurs dans les Yvelines : offerte dès 40 € de produits (avant remises),
//   sinon 3 € (≤ 3 km), 4 € (≤ 6 km) ou 5 € selon la distance au relais le plus
//   proche ; 5 € si l'adresse n'a pas pu être localisée.

export const RELAIS = [
  { nom: 'Chatou', codeInsee: '78146', lat: 48.8897, lon: 2.1574 },
  { nom: 'Croissy-sur-Seine', codeInsee: '78190', lat: 48.8794, lon: 2.1431 },
  { nom: 'Mareil-sur-Mauldre', codeInsee: '78368', lat: 48.8944, lon: 1.8681 },
  { nom: 'Saint-Nom-la-Bretèche', codeInsee: '78571', lat: 48.8594, lon: 2.0186 },
];

export const SEUIL_LIVRAISON_OFFERTE = 40;
export const MINIMUM_COMMANDE = 10;
export const PALIERS_FRAIS = [
  { jusquA: 3, frais: 3 },
  { jusquA: 6, frais: 4 },
  { jusquA: Infinity, frais: 5 },
];
export const FRAIS_MAX = 5;

function distanceKm(lat1: number, lon1: number, lat2: number, lon2: number) {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// Distance (à vol d'oiseau) au point relais le plus proche
export const distanceAuRelais = (lat: number, lon: number) =>
  Math.min(...RELAIS.map(r => distanceKm(lat, lon, r.lat, r.lon)));

// Propriétés d'une adresse renvoyées par api-adresse.data.gouv.fr
type ProprietesAdresse = { citycode?: string; postcode?: string } | null | undefined;

// Zone de livraison : tout le département des Yvelines (78).
export function estDansLesYvelines(props: ProprietesAdresse): boolean {
  return String(props?.citycode || props?.postcode || '').startsWith('78');
}

// L'adresse est-elle dans une ville de point relais (livraison offerte) ?
export function estVilleRelais(props: ProprietesAdresse): boolean {
  return RELAIS.some(r => r.codeInsee === String(props?.citycode ?? ''));
}

export function fraisLivraison({ sousTotal, distance, villeRelais }: { sousTotal: number; distance: number | null; villeRelais: boolean }): number {
  if (sousTotal <= 0 || villeRelais || sousTotal >= SEUIL_LIVRAISON_OFFERTE) return 0;
  if (distance == null) return FRAIS_MAX;
  return PALIERS_FRAIS.find(p => distance <= p.jusquA)!.frais;
}

// « Chatou, Croissy-sur-Seine, Mareil-sur-Mauldre et Saint-Nom-la-Bretèche »
export const listeVillesRelais = () => {
  const noms = RELAIS.map(r => r.nom);
  return `${noms.slice(0, -1).join(', ')} et ${noms[noms.length - 1]}`;
};
