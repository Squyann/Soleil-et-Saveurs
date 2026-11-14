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

// --- Fiches des variantes --------------------------------------------------
// Une variante peut avoir sa propre fiche (table fiches_variantes). Chaque
// rubrique vide (null) reprend celle de la fiche du produit principal.

export type FicheVariante = {
  variant_id: string;
  accroche: string | null;
  description: string | null;
  origine_detail: string | null;
  caracteristiques: string | null;
  gout: string | null;
  conservation: string | null;
  preparation: string | null;
  saison_mois: number[] | null;
  photos: string[] | null;
  recettes: Recette[] | null;
  updated_at?: string;
};

export const RUBRIQUES_TEXTE = ['accroche', 'description', 'origine_detail', 'caracteristiques', 'gout', 'conservation', 'preparation'] as const;
export type RubriqueTexte = (typeof RUBRIQUES_TEXTE)[number];

// Ce que la page affiche, une fois la variante et le produit fusionnés
export type FicheAffichee = {
  titre: string;
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
};

const texte = (t: string | null | undefined) => (t && t.trim() ? t.trim() : null);

export function resoudreFiche(
  fiche: Fiche,
  produit: { name: string; image_url?: string | null },
  variante: { nom: string; image_url?: string | null } | null,
  ficheVariante: FicheVariante | null,
  titreVariante?: string,
): FicheAffichee {
  const fv = variante ? ficheVariante : null;
  const choisir = (cle: RubriqueTexte) => texte(fv?.[cle]) ?? texte(fiche[cle]);
  // Photos : photo de la variante (ou du produit), puis les photos propres à
  // la variante si elle en a, sinon celles de la fiche du produit
  const photos = [variante?.image_url || produit.image_url, ...(fv?.photos ?? fiche.photos ?? [])]
    .filter((u, i, t): u is string => !!u && t.indexOf(u) === i);
  return {
    titre: variante ? (titreVariante ?? variante.nom) : (texte(fiche.titre_complet) ?? produit.name),
    accroche: choisir('accroche'),
    description: choisir('description'),
    origine_detail: choisir('origine_detail'),
    caracteristiques: choisir('caracteristiques'),
    gout: choisir('gout'),
    conservation: choisir('conservation'),
    preparation: choisir('preparation'),
    saison_mois: (fv?.saison_mois ?? fiche.saison_mois ?? []).map(Number),
    photos,
    recettes: (fv?.recettes ?? fiche.recettes ?? []).filter(r => r?.titre?.trim()),
  };
}

// Nombre de rubriques propres d'une fiche de variante (indicateur de l'admin)
export function rubriquesPropres(fv: Partial<FicheVariante> | null | undefined): number {
  if (!fv) return 0;
  return RUBRIQUES_TEXTE.filter(c => texte(fv[c] as string | null)).length
    + (fv.saison_mois ? 1 : 0) + (fv.photos ? 1 : 0) + (fv.recettes ? 1 : 0);
}
export const TOTAL_RUBRIQUES_VARIANTE = RUBRIQUES_TEXTE.length + 3;
