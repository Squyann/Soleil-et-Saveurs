// Dernières données affichées, gardées sur le téléphone pour pouvoir les
// consulter hors connexion (avec leur heure). Jamais utilisées pour écrire :
// toute modification repart du serveur. Effacées à la déconnexion.

const PREFIXE = 'gestion:';

export type Memorise<T> = { le: number; valeur: T };

export function lireMemoire<T>(cle: string): Memorise<T> | null {
  try {
    const brut = localStorage.getItem(PREFIXE + cle);
    if (!brut) return null;
    const v = JSON.parse(brut) as Memorise<T>;
    return typeof v?.le === 'number' ? v : null;
  } catch {
    return null;
  }
}

export function ecrireMemoire<T>(cle: string, valeur: T) {
  try {
    localStorage.setItem(PREFIXE + cle, JSON.stringify({ le: Date.now(), valeur }));
  } catch {
    // stockage plein ou indisponible : l'appli fonctionne sans
  }
}

export function viderMemoire() {
  try {
    Object.keys(localStorage).filter((k) => k.startsWith(PREFIXE)).forEach((k) => localStorage.removeItem(k));
  } catch {}
}

// Réponse Supabase → données, ou erreur levée (pour executer())
export async function reponse<T>(requete: PromiseLike<{ data: T; error: unknown }>): Promise<T> {
  const { data, error } = await requete;
  if (error) throw error;
  return data;
}
