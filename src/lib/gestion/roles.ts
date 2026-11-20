// Rôles de l'équipe et droits par action.
//
// La base de données est la seule autorité (fonctions SQL role_equipe() et
// peut(), migration 20261120_gestion_fondations) : chaque lecture et chaque
// écriture y est contrôlée. Ce fichier ne sert qu'à l'affichage (masquer un
// bouton qui serait de toute façon refusé) et doit rester identique à peut().

export type Role = 'admin' | 'gerant' | 'preparateur';
export type Droit = 'commandes' | 'annuler' | 'stock' | 'catalogue' | 'clients' | 'promos' | 'equipe';

export const ROLES: readonly Role[] = ['admin', 'gerant', 'preparateur'];

export const LIBELLE_ROLE: Record<Role, string> = {
  admin: 'Administrateur',
  gerant: 'Gérant',
  preparateur: 'Préparateur',
};

export function roleEquipe(valeur: unknown): Role | null {
  return typeof valeur === 'string' && (ROLES as readonly string[]).includes(valeur) ? (valeur as Role) : null;
}

export function peut(role: Role | null, droit: Droit): boolean {
  if (role === 'admin') return true;
  if (role === 'gerant') return droit !== 'equipe';
  if (role === 'preparateur') return droit === 'commandes' || droit === 'stock';
  return false;
}
