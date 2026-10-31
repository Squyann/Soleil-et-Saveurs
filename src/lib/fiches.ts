// Pages produits détaillées : types et utilitaires communs (site + admin).

export type Recette = {
  titre: string;
  temps?: string;
  personnes?: string;
  ingredients: string[];
  etapes: string[];
  photo?: string;
};

export type Fiche = {
  product_id: string;
  slug: string;
  publiee: boolean;
  titre_complet: string | null;
  accroche: string | null;
  description: string | null;
  origine_detail: string | null;
  caracteristiques: string | null;
  gout: string | null;
  conservation: string | null;
  preparation: string | null;
  saison_mois: number[];
  photos: string[];
  recettes: Recette[];
  updated_at?: string;
};

export const PHOTOS_MAX = 8;

export const MOIS = ['Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin', 'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'];
export const MOIS_COURTS = ['Janv', 'Févr', 'Mars', 'Avr', 'Mai', 'Juin', 'Juil', 'Août', 'Sept', 'Oct', 'Nov', 'Déc'];

// « Ananas Victoria (Réunion) » → « ananas-victoria-reunion »
export function creerSlug(texte: string): string {
  return texte
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/œ/g, 'oe').replace(/æ/g, 'ae')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80)
    .replace(/-+$/g, '');
}

export const SLUG_VALIDE = /^[a-z0-9]+(-[a-z0-9]+)*$/;

// Mois en cours à Paris (1 à 12)
export function moisCourantParis(date = new Date()): number {
  return Number(new Intl.DateTimeFormat('fr-FR', { month: 'numeric', timeZone: 'Europe/Paris' }).format(date));
}

// Rubriques remplies, pour l'indicateur de complétude de l'admin
export function completudeFiche(f: Partial<Fiche>): { remplies: number; total: number } {
  const rubriques = [
    f.description, f.origine_detail, f.caracteristiques, f.gout, f.conservation, f.preparation,
  ].map(t => !!t?.trim());
  rubriques.push((f.saison_mois?.length ?? 0) > 0, (f.recettes?.length ?? 0) > 0, (f.photos?.length ?? 0) > 0);
  return { remplies: rubriques.filter(Boolean).length, total: rubriques.length };
}
