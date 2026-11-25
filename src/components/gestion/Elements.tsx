'use client';
// Éléments d'interface communs aux écrans de l'application de gestion
import { COULEUR_STATUT, LIBELLE_STATUT, type Statut } from '@/lib/gestion/statuts';
import { useGestion } from './AppliGestion';

export function EnTete({ titre, sousTitre, droite }: { titre: string; sousTitre?: string; droite?: React.ReactNode }) {
  const { tempsReel, enLigne } = useGestion();
  const direct = enLigne && tempsReel === 'direct';
  return (
    <header className="mb-4 flex items-start justify-between gap-3">
      <div className="min-w-0">
        <h1 className="titre text-[28px] leading-tight">{titre}</h1>
        {sousTitre && <p className="mt-0.5 text-[13.5px] text-olivier-gris">{sousTitre}</p>}
      </div>
      <div className="flex flex-none items-center gap-2 pt-1.5">
        {droite}
        <span
          className={`flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11.5px] font-bold ${direct ? 'bg-[#E7EEDC] text-olivier' : 'bg-[#EFE6D8] text-olivier-gris'}`}
          title={direct ? 'Les changements s’affichent en direct' : 'Pas de mise à jour en direct pour l’instant'}
        >
          <span className={`h-2 w-2 rounded-full ${direct ? 'bg-[#5C8A3A]' : 'bg-olivier-pale'}`} aria-hidden="true" />
          {direct ? 'En direct' : enLigne ? 'Connexion…' : 'Hors ligne'}
        </span>
      </div>
    </header>
  );
}

export function PastilleStatut({ statut, petite }: { statut: Statut; petite?: boolean }) {
  const c = COULEUR_STATUT[statut];
  return (
    <span
      className={`inline-flex items-center whitespace-nowrap rounded-full font-extrabold ${petite ? 'px-2.5 py-0.5 text-[11.5px]' : 'px-3 py-1 text-[13px]'}`}
      style={{ background: c.fond, color: c.texte }}
    >
      {LIBELLE_STATUT[statut]}
    </span>
  );
}

// Âge des données affichées quand elles viennent de la mémoire du téléphone
export function DonneesDu({ le }: { le: number | null }) {
  const { enLigne } = useGestion();
  if (enLigne || !le) return null;
  const h = new Date(le).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
  return <p className="mb-3 rounded-xl bg-[#EFE6D8] px-3 py-2 text-[12.5px] font-semibold text-olivier-gris">Données du {h}, enregistrées sur ce téléphone.</p>;
}

export function Carte({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return <section className={`rounded-3xl border border-[#E3D6C4] bg-white p-4 ${className}`}>{children}</section>;
}

export function Chargement({ lignes = 3 }: { lignes?: number }) {
  return (
    <div className="space-y-3" aria-busy="true" aria-label="Chargement">
      {Array.from({ length: lignes }).map((_, i) => (
        <div key={i} className="h-[72px] animate-pulse rounded-3xl bg-[#EFE6D8]" />
      ))}
    </div>
  );
}

// Date du jour à Paris (AAAA-MM-JJ), indépendante du fuseau du téléphone
export function aujourdhui(decalageJours = 0) {
  const d = new Date(Date.now() + decalageJours * 86400000);
  return new Intl.DateTimeFormat('fr-CA', { timeZone: 'Europe/Paris', year: 'numeric', month: '2-digit', day: '2-digit' }).format(d);
}

export function dateCourte(iso: string | null | undefined) {
  if (!iso) return '';
  const d = new Date(iso.length === 10 ? `${iso}T12:00:00` : iso);
  return d.toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric', month: 'short', timeZone: 'Europe/Paris' });
}

// Interrupteur (oui / non) aux couleurs de l'appli
export function Bascule({ on, libelle, changer, desactive }: { on: boolean; libelle: string; changer: () => void; desactive?: boolean }) {
  return (
    <button type="button" role="switch" aria-checked={on} aria-label={libelle} disabled={desactive} onClick={changer} className={`relative h-8 w-[52px] flex-none rounded-full transition-colors disabled:opacity-40 ${on ? 'bg-olivier' : 'bg-[#C9BBAA]'}`}>
      <span className={`absolute top-1 h-6 w-6 rounded-full bg-white transition-all ${on ? 'right-1' : 'left-1'}`} />
    </button>
  );
}
