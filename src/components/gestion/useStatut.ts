'use client';
// Changement de statut avec retour clair à l'utilisateur. Le nouvel état ne
// s'affiche qu'une fois confirmé par le serveur (puis par le temps réel).
import { useCallback, useState } from 'react';
import { changerStatut, statutDe, type Commande } from '@/lib/gestion/commandes';
import { LIBELLE_STATUT, statutNormalise, type Statut } from '@/lib/gestion/statuts';
import { useGestion } from './AppliGestion';

export function useStatut(apres?: () => void) {
  const { executer, notifier } = useGestion();
  const [enCours, setEnCours] = useState<number | null>(null);

  const changer = useCallback(async (c: Pick<Commande, 'id' | 'statut'>, nouveau: Statut, motif?: string) => {
    setEnCours(c.id);
    const libelle = `N° ${c.id} : ${LIBELLE_STATUT[nouveau]}`;
    const r = await executer(libelle, () => changerStatut(c, nouveau, motif));
    setEnCours(null);
    if (!r.ok) return false;
    const rep = r.donnees;
    if (!rep.ok) {
      notifier({ type: 'info', texte: `N° ${c.id} a été modifiée entre-temps (maintenant « ${LIBELLE_STATUT[statutNormalise(rep.statut)]} »). Rien n’a changé.` });
      apres?.();
      return false;
    }
    if (rep.email === 'echec') {
      notifier({ type: 'erreur', texte: `N° ${c.id} est bien « ${LIBELLE_STATUT[nouveau]} », mais l’e-mail au client n’est pas parti.` });
    } else {
      const mail = rep.email === 'envoye' ? ' · client prévenu par e-mail' : '';
      notifier({ type: 'ok', texte: `N° ${c.id} : ${LIBELLE_STATUT[statutNormalise(rep.statut)]}${mail}` });
    }
    apres?.();
    return true;
  }, [executer, notifier, apres]);

  return { changer, enCours, statutDe };
}
