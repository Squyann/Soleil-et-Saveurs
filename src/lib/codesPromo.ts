// Codes promo : statut, dates à l'heure de Paris et textes affichés.
// Le contrôle qui fait foi est fait par la base (etat_code_promo,
// creer_commande) ; ces fonctions ne servent qu'à l'affichage.

export interface CodePromo {
  id: string;
  code: string;
  reduction_pct: number;
  actif: boolean;
  usage_count: number;
  created_at: string;
  max_par_client: number | null;
  debut: string | null;
  fin: string | null;
}

export type StatutCode = 'actif' | 'programme' | 'expire' | 'desactive';

export function statutCode(c: Pick<CodePromo, 'actif' | 'debut' | 'fin'>, maintenant = Date.now()): StatutCode {
  if (!c.actif) return 'desactive';
  if (c.fin && new Date(c.fin).getTime() < maintenant) return 'expire';
  if (c.debut && new Date(c.debut).getTime() > maintenant) return 'programme';
  return 'actif';
}

const FUSEAU = 'Europe/Paris';

// Écart (ms) entre l'heure de Paris et UTC à un instant donné
function decalageParis(instant: number): number {
  const p = Object.fromEntries(new Intl.DateTimeFormat('en-US', {
    timeZone: FUSEAU, hourCycle: 'h23', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit',
  }).formatToParts(new Date(instant)).map((x) => [x.type, x.value]));
  return Date.UTC(+p.year, +p.month - 1, +p.day, +p.hour, +p.minute, +p.second) - Math.floor(instant / 1000) * 1000;
}

// « 2026-12-01T00:00 » saisi à l'heure de Paris → instant ISO (UTC).
// finDeMinute : 23:59 devient 23:59:59,999 (le code reste valable toute la minute).
export function parisVersIso(local: string, finDeMinute = false): string | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/.exec(local);
  if (!m) return null;
  const naif = Date.UTC(+m[1], +m[2] - 1, +m[3], +m[4], +m[5]);
  let instant = naif - decalageParis(naif);
  instant = naif - decalageParis(instant); // changement d'heure
  if (finDeMinute) instant += 59_999;
  return new Date(instant).toISOString();
}

// Instant ISO → « 2026-12-01T00:00 » à l'heure de Paris (champ datetime-local)
export function isoVersParis(iso: string | null): string {
  if (!iso) return '';
  const t = new Date(iso).getTime();
  const local = new Date(t + decalageParis(t));
  return local.toISOString().slice(0, 16);
}

// « mardi 1er décembre 2026 à 0 h », « 25 décembre 2026 à 23 h 59 »
export function dateParis(iso: string, options: { jour?: boolean; annee?: boolean; heure?: boolean } = {}): string {
  const { jour = false, annee = true, heure = true } = options;
  const d = new Date(iso);
  const parts = Object.fromEntries(new Intl.DateTimeFormat('fr-FR', {
    timeZone: FUSEAU, weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit', hourCycle: 'h23',
  }).formatToParts(d).map((x) => [x.type, x.value]));
  const j = parts.day === '1' ? '1er' : parts.day;
  const h = Number(parts.hour);
  const mn = parts.minute;
  return [
    jour ? `${parts.weekday} ` : '',
    `${j} ${parts.month}`,
    annee ? ` ${parts.year}` : '',
    heure ? ` à ${h} h${mn !== '00' ? ` ${mn}` : ''}` : '',
  ].join('');
}

export function libelleLimite(max: number | null): string {
  if (!max) return 'Sans limite par client';
  return `${max} fois par client`;
}

export function libellePeriode(debut: string | null, fin: string | null): string {
  if (debut && fin) return `Du ${dateParis(debut, { heure: false, annee: false })} au ${dateParis(fin, { heure: false })}`;
  if (debut) return `À partir du ${dateParis(debut)}`;
  if (fin) return `Jusqu'au ${dateParis(fin)}`;
  return 'Sans date';
}

export function resumeCode(c: { reduction_pct: number; max_par_client: number | null; debut: string | null; fin: string | null }): string {
  const morceaux = [`−${c.reduction_pct} % sur les produits`];
  morceaux.push(c.max_par_client ? `utilisable ${c.max_par_client} fois par client` : 'sans limite par client');
  if (c.debut && c.fin) morceaux.push(`du ${dateParis(c.debut, { jour: true })} au ${dateParis(c.fin, { jour: true })}`);
  else if (c.debut) morceaux.push(`à partir du ${dateParis(c.debut, { jour: true })}, sans date de fin`);
  else if (c.fin) morceaux.push(`jusqu'au ${dateParis(c.fin, { jour: true })}`);
  else morceaux.push('sans date de fin');
  return `${morceaux.join(', ')}.`;
}

// Réponse de verifier_code_promo → message affiché dans le panier
export interface EtatCode {
  valide?: boolean;
  deja_utilise?: boolean;
  statut?: 'ok' | 'inconnu' | 'pas_encore' | 'expire' | 'limite';
  reduction_pct?: number;
  id?: string;
  debut?: string | null;
  fin?: string | null;
  max_par_client?: number | null;
  restant?: number | null;
}

export function messageCode(e: EtatCode): { titre: string; detail?: string } {
  switch (e.statut) {
    case 'limite':
      return { titre: "Vous avez atteint la limite d'utilisation de ce code promotionnel.", detail: e.max_par_client ? `Il était utilisable ${e.max_par_client === 1 ? 'une fois' : `${e.max_par_client} fois`} par client.` : undefined };
    case 'pas_encore':
      return { titre: "Ce code promotionnel n'est pas encore valable.", detail: e.debut ? `Il sera utilisable à partir du ${dateParis(e.debut, { jour: true, annee: false })}.` : undefined };
    case 'expire':
      return { titre: 'La période de validité de ce code promotionnel est terminée.', detail: e.fin ? `Il était valable jusqu'au ${dateParis(e.fin, { heure: false })}.` : undefined };
    case 'ok': {
      const restant = e.restant != null ? e.restant - 1 : null;
      const details = [
        restant != null ? (restant > 0 ? `Il vous restera ${restant} utilisation${restant > 1 ? 's' : ''} de ce code.` : 'Dernière utilisation possible de ce code.') : '',
        e.fin ? `Valable jusqu'au ${dateParis(e.fin, { annee: false })}.` : '',
      ].filter(Boolean);
      return { titre: `−${e.reduction_pct} % appliqués sur vos produits`, detail: details.join(' ') || undefined };
    }
    default:
      return { titre: "Ce code promotionnel n'existe pas ou n'est plus actif.", detail: "Vérifiez l'orthographe du code." };
  }
}
