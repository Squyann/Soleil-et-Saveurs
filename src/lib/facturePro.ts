// Factures, bons de livraison et avoirs pour les professionnels.
//
// Même présentation que les factures du site (styles et en-tête communs, voir
// facture.ts), avec les mentions obligatoires entre professionnels : SIREN et
// TVA du client, adresse de livraison si différente, échéance, pénalités de
// retard et indemnité forfaitaire de 40 €. Les prix sont saisis hors taxes ;
// les montants d'un document émis sont ceux calculés par la base.

import { LOGO_IMPRESSION } from '@/lib/logoImpression';
import { dateLongue, echapper, STYLES, TAUX_TVA, VENDEUR } from '@/lib/facture';
import { formatPrix } from '@/lib/format';

export type TypeDocumentPro = 'facture' | 'bon' | 'avoir';

export type LignePro = {
  designation: string;
  quantite: number;
  unite: string;
  prix_ht?: number | null;
  remise_pct?: number | null;
  product_id?: string | null;
  total_ht?: number | null;
};

export type ClientPro = {
  id: string;
  raison_sociale: string;
  siren: string | null;
  tva: string | null;
  adresse_facturation: string;
  adresse_livraison: string | null;
  email: string | null;
  telephone: string | null;
  notes: string | null;
  actif: boolean;
  updated_at: string;
};

export type DocumentPro = {
  id: string;
  type: TypeDocumentPro;
  statut: 'brouillon' | 'emis';
  client_id: string | null;
  client: { raison_sociale: string; siren: string | null; tva: string | null; adresse_facturation: string; email: string | null; telephone: string | null } | null;
  lignes: LignePro[];
  date_livraison: string | null;
  adresse_livraison: string | null;
  delai_jours: number;
  notes: string | null;
  avoir_de: string | null;
  avoir_de_numero?: string | null;
  numero: string | null;
  date_emission: string | null;
  date_echeance: string | null;
  taux_tva: number;
  total_ht: number | null;
  total_tva: number | null;
  total_ttc: number | null;
  date_reglement: string | null;
  mode_reglement: 'virement' | 'carte' | 'especes' | 'cheque' | null;
  jeton?: string;
  envoye_le: string | null;
  cree_le: string;
  updated_at: string;
};

export const COLONNES_DOCUMENT = 'id, type, statut, client_id, client, lignes, date_livraison, adresse_livraison, delai_jours, notes, avoir_de, numero, date_emission, date_echeance, taux_tva, total_ht, total_tva, total_ttc, date_reglement, mode_reglement, jeton, envoye_le, cree_le, updated_at';

export const UNITES_PRO = ['kg', 'g', 'pièce', 'botte', 'barquette', 'sachet', 'filet', 'cagette', 'colis', 'plateau', 'lot', 'forfait'];

export const LIBELLE_TYPE: Record<TypeDocumentPro, string> = { facture: 'Facture', bon: 'Bon de livraison', avoir: 'Avoir' };
export const LIBELLE_MODE: Record<NonNullable<DocumentPro['mode_reglement']>, string> = { virement: 'virement', carte: 'carte bancaire', especes: 'espèces', cheque: 'chèque' };

// --- Calculs (aperçu ; à l'émission, la base recalcule avec les mêmes règles)

const centimes = (euros: number) => Math.round(euros * 100 + Math.sign(euros) * 1e-6);

export function totalLigne(l: LignePro): number {
  return centimes((Number(l.quantite) || 0) * (Number(l.prix_ht) || 0) * (1 - (Number(l.remise_pct) || 0) / 100)) / 100;
}

export function totaux(lignes: LignePro[], taux = TAUX_TVA) {
  const ht = lignes.reduce((a, l) => a + centimes(l.total_ht ?? totalLigne(l)), 0);
  const tva = Math.round((ht * taux) / 100);
  return { ht: ht / 100, tva: tva / 100, ttc: (ht + tva) / 100 };
}

// Prix du site (TTC) → hors taxes, pour proposer un prix de départ
export const versHT = (ttc: number) => Math.round((ttc / (1 + TAUX_TVA / 100)) * 100) / 100;
export const versTTC = (ht: number) => Math.round(ht * (1 + TAUX_TVA / 100) * 100) / 100;

const PLURIELS: Record<string, string> = {
  pièce: 'pièces', botte: 'bottes', barquette: 'barquettes', sachet: 'sachets', filet: 'filets',
  cagette: 'cagettes', colis: 'colis', plateau: 'plateaux', lot: 'lots', forfait: 'forfaits',
};

export function nombreFr(n: number, decimales = 3) {
  return (Number(n) || 0).toLocaleString('fr-FR', { maximumFractionDigits: decimales });
}

export function quantitePro(l: Pick<LignePro, 'quantite' | 'unite'>) {
  const q = Number(l.quantite) || 0;
  const u = l.unite || 'pièce';
  if (u === 'kg' || u === 'g') return `${nombreFr(q)} ${u}`;
  return `${nombreFr(q)} ${q > 1 ? PLURIELS[u] ?? u : u}`;
}

// --- Siren et TVA ------------------------------------------------------------

export function sirenValide(siren: string) {
  if (!/^\d{9}$/.test(siren)) return false;
  let somme = 0;
  for (let i = 0; i < 9; i++) {
    let c = Number(siren[i]);
    if (i % 2 === 1) { c *= 2; if (c > 9) c -= 9; }
    somme += c;
  }
  return somme % 10 === 0;
}

// Numéro de TVA français déduit du SIREN (clé = (12 + 3 × (SIREN mod 97)) mod 97)
export function tvaDepuisSiren(siren: string) {
  if (!/^\d{9}$/.test(siren)) return '';
  const cle = (12 + 3 * (Number(siren) % 97)) % 97;
  return `FR${String(cle).padStart(2, '0')}${siren}`;
}

// --- Document HTML -----------------------------------------------------------

const STYLES_PRO = `
.bloc .ident { margin: 6px 0 0; font-size: 12.5px; font-weight: 700; color: #2F4A2B; }
.brouillon { display: inline-block; margin: 8px 0 0; padding: 4px 10px; border: 2px dashed #A94E25; border-radius: 8px; font-size: 12px; font-weight: 800; letter-spacing: .08em; text-transform: uppercase; color: #A94E25; }
.signature { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-top: 26px; }
.signature div { border-top: 1px solid #2F4A2B; padding-top: 6px; font-size: 12px; color: #44583F; min-height: 60px; }
`;

const euros = (n: number | null | undefined) => formatPrix(Number(n) || 0);
const taux = (t: number) => `${String(t).replace('.', ',')} %`;

export function htmlDocumentPro(d: DocumentPro, clientBrouillon?: ClientPro | null): string {
  const emis = d.statut === 'emis';
  const c = emis ? d.client : clientBrouillon ? {
    raison_sociale: clientBrouillon.raison_sociale, siren: clientBrouillon.siren, tva: clientBrouillon.tva,
    adresse_facturation: clientBrouillon.adresse_facturation, email: clientBrouillon.email, telephone: clientBrouillon.telephone,
  } : null;
  const livraison = (d.adresse_livraison || (!emis ? clientBrouillon?.adresse_livraison : null) || '').trim();
  const facturation = (c?.adresse_facturation ?? '').trim();
  const bon = d.type === 'bon';
  const avoir = d.type === 'avoir';
  const t = emis && d.total_ht != null
    ? { ht: Number(d.total_ht), tva: Number(d.total_tva), ttc: Number(d.total_ttc) }
    : totaux(d.lignes, Number(d.taux_tva) || TAUX_TVA);
  const signe = avoir ? '−' : '';
  const titre = LIBELLE_TYPE[d.type];
  const regle = !!d.date_reglement;
  const echeance = d.date_echeance;

  const reperes = [
    [emis ? "Date d'émission" : 'Brouillon du', dateLongue(emis ? d.date_emission : d.cree_le)],
    ['Date de livraison', dateLongue(d.date_livraison)],
    avoir ? ['Facture d’origine', echapper(d.avoir_de_numero ?? '—')]
      : bon ? ['Client', echapper(c?.raison_sociale ?? '—')]
      : ['Échéance', emis ? dateLongue(echeance) : `${d.delai_jours} jours`],
    ['Nature', 'Livraison de biens'],
  ];

  const lignes = d.lignes.map((l) => {
    const total = l.total_ht ?? totalLigne(l);
    const remise = Number(l.remise_pct) > 0 ? `−${nombreFr(Number(l.remise_pct), 2)} %` : '—';
    return bon
      ? `<tr><td><strong>${echapper(l.designation)}</strong></td><td>${echapper(quantitePro(l))}</td></tr>`
      : `<tr><td><strong>${echapper(l.designation)}</strong></td><td>${echapper(quantitePro(l))}</td><td>${euros(l.prix_ht)} / ${echapper(l.unite || 'pièce')}</td><td${remise === '—' ? '' : ' class="remise"'}>${remise}</td><td>${taux(Number(d.taux_tva) || TAUX_TVA)}</td><td class="total">${signe}${euros(total)}</td></tr>`;
  }).join('\n');

  let reglement = '';
  if (d.type === 'facture') {
    reglement = regle
      ? `Réglée le ${dateLongue(d.date_reglement)}${d.mode_reglement ? ` par ${LIBELLE_MODE[d.mode_reglement]}` : ''}.`
      : `À régler à réception, au plus tard le ${emis ? dateLongue(d.date_echeance) : `${d.delai_jours} jours après l’émission`}${d.delai_jours ? ` (${d.delai_jours} jours)` : ''}.<br>Virement, carte bancaire, chèque ou espèces.`;
  } else if (avoir) {
    reglement = `Avoir à déduire de la facture ${echapper(d.avoir_de_numero ?? '')}, ou remboursé.`;
  }

  const blocClient = c
    ? `<p class="nom">${echapper(c.raison_sociale)}</p>
<p class="texte">${echapper(facturation)}</p>
${c.siren || c.tva ? `<p class="ident">${[c.siren ? `SIREN ${echapper(c.siren.replace(/(\d{3})(?=\d)/g, '$1 '))}` : '', c.tva ? `TVA ${echapper(c.tva)}` : ''].filter(Boolean).join(' · ')}</p>` : ''}
<p class="texte">${[livraison && livraison !== facturation ? `Livré à : ${echapper(livraison)}` : '', c.email ? echapper(c.email) : '', c.telephone ? echapper(c.telephone) : ''].filter(Boolean).join('<br>')}</p>`
    : '<p class="texte">Client à choisir</p>';

  return `<!doctype html>
<html lang="fr">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${echapper(emis ? `${titre} ${d.numero}` : `${titre} (brouillon)`)}</title>
<style>${STYLES}${STYLES_PRO}</style>
</head>
<body>
<div class="page">

<div class="entete">
<div>
${LOGO_IMPRESSION}
<p class="accroche">Fruits &amp; légumes frais livrés dans les Yvelines</p>
</div>
<div>
<h1 class="titre">${titre}</h1>
${emis ? `<p class="numero">N° ${echapper(d.numero)}</p>` : '<p class="numero"><span class="brouillon">Brouillon · aperçu</span></p>'}
</div>
</div>

<dl class="reperes">
${reperes.map(([dt, dd]) => `<div><dt>${dt}</dt><dd>${dd}</dd></div>`).join('\n')}
</dl>

<div class="parties">
<section class="bloc vendeur">
<h2>Vendeur</h2>
<p class="nom">${VENDEUR.nom}</p>
<p class="texte">${VENDEUR.forme}<br>${VENDEUR.adresse}<br>SIREN ${VENDEUR.siren} · ${VENDEUR.rcs}<br>TVA intracommunautaire : ${VENDEUR.tva}<br>${VENDEUR.email}<br>${VENDEUR.telephone}</p>
</section>
<section class="bloc">
<h2>${bon ? 'Livré à' : 'Facturé à'}</h2>
${blocClient}
</section>
</div>

<table>
<thead>
${bon
    ? '<tr><th scope="col">Désignation</th><th scope="col">Quantité</th></tr>'
    : '<tr><th scope="col">Désignation</th><th scope="col">Quantité</th><th scope="col">Prix unit. HT</th><th scope="col">Remise</th><th scope="col">TVA</th><th scope="col">Total HT</th></tr>'}
</thead>
<tbody>
${lignes}
</tbody>
</table>

${bon ? `
<div class="signature"><div>Livré le :</div><div>Reçu par (nom et signature) :</div></div>
${d.notes ? `<p class="texte" style="margin-top:14px">${echapper(d.notes)}</p>` : ''}` : `
<div class="bas">
<section class="bloc">
<h2>${avoir ? 'Avoir' : 'Règlement'}</h2>
<p class="texte" style="margin-top:0">${reglement}</p>
${regle ? '<p class="acquittee">Facture acquittée</p>' : ''}
${d.notes ? `<p class="texte">${echapper(d.notes)}</p>` : ''}
</section>
<dl class="totaux">
<div class="ht"><dt>Total HT</dt><dd>${signe}${euros(t.ht)}</dd></div>
<div><dt>TVA ${taux(Number(d.taux_tva) || TAUX_TVA)}</dt><dd>${signe}${euros(t.tva)}</dd></div>
<div class="ttc"><dt>${avoir ? 'Total TTC de l’avoir' : regle ? 'Total TTC — réglé' : 'Total TTC à régler'}</dt><dd class="titre">${signe}${euros(t.ttc)}</dd></div>
</dl>
</div>`}

<footer>
${bon ? '' : `<p class="mentions"><strong>Escompte pour paiement anticipé : néant.</strong> En cas de retard de paiement : pénalités au taux appliqué par la Banque centrale européenne à son opération de refinancement la plus récente, majoré de 10 points, exigibles sans rappel, et indemnité forfaitaire de 40 € pour frais de recouvrement (articles L441-10 et D441-5 du Code de commerce). Prix hors taxes, TVA au taux indiqué.</p>`}
<p class="identite">${VENDEUR.nom} · ${VENDEUR.forme} · ${VENDEUR.adresse} · ${VENDEUR.rcs} ${VENDEUR.siren} · TVA ${VENDEUR.tva} · ${VENDEUR.site}</p>
</footer>

</div>
</body>
</html>`;
}
