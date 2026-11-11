// État du catalogue mémorisé le temps de la visite : filtre, recherche et
// position de défilement, pour retrouver le catalogue tel qu'on l'a laissé.
export const CLE_FILTRE = 'catalogue-filtre';
export const CLE_RECHERCHE = 'catalogue-recherche';
export const CLE_DEFILEMENT = 'catalogue-defilement';

export function lireSession(cle: string): string | null {
  try { return sessionStorage.getItem(cle); } catch { return null; }
}
export function ecrireSession(cle: string, valeur: string) {
  try { sessionStorage.setItem(cle, valeur); } catch {}
}

// Depuis l'accueil : le catalogue s'ouvrira sur ce filtre (« Fruits »,
// « Légumes », « promos » ou « all »), en haut de page et sans recherche.
export function preparerCatalogue(filtre: string) {
  ecrireSession(CLE_FILTRE, filtre);
  ecrireSession(CLE_RECHERCHE, '');
  try { sessionStorage.removeItem(CLE_DEFILEMENT); } catch {}
}
