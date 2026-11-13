// Facture et bon de livraison : un seul modèle, utilisé par l'espace client
// et par l'administration.
//
// Les prix du site sont fixés toutes taxes comprises. Le hors taxe est donc
// déduit du TTC (TTC / 1,055) et la TVA est la différence : le total TTC du
// document est toujours, au centime près, le montant réellement payé.
// Tous les calculs se font en centimes entiers.
import { formatPrix, libelleQuantite } from '@/lib/format';
import { premieresOffertes, qtePayantePremieresOffertes } from '@/lib/promos';

// Fruits et légumes frais, et frais de livraison accessoires à la vente
export const TAUX_TVA = 5.5;

export const VENDEUR = {
  nom: 'SOLEIL ET SAVEURS',
  forme: 'SAS au capital de 1 000 €',
  adresse: '6-8 avenue Henriette, 93170 Bagnolet',
  siren: '821 324 324',
  rcs: 'RCS Bobigny',
  tva: 'FR33821324324',
  email: 'soleiletsaveurs.livraison@gmail.com',
  telephone: '07 59 72 00 83',
  site: 'soleiletsaveurs.fr',
};

type Valeur = string | number | null | undefined;

// Ligne du panier telle qu'enregistrée dans la commande par le serveur
export interface LignePanier {
  nom?: string;
  name?: string;
  unite?: string | null;
  quantite?: Valeur;
  quantity?: Valeur;
  price?: Valeur;
  prix?: Valeur;
  promotion?: Valeur;
  prixUnitaire?: Valeur;
  prixTotalLigne?: Valeur;
  offerts?: Valeur;
  seuil_achat?: number | null;
  quantite_offerte?: number | null;
  premieres_offertes?: number | null;
}

export interface CommandeDocument {
  id: number | string;
  created_at: string;
  total: Valeur;
  contenu_panier?: LignePanier[] | null;
  frais_livraison?: Valeur;
  date_livraison?: string | null;
  code_promo?: string | null;
  remise_code_pct?: number | null;
  methode_paiement?: string | null;
  nom_client?: string | null;
  adresse_livraison?: string | null;
  email_client?: string | null;
  telephone_client?: string | null;
}

// Ligne de la table « factures » : copie figée de la commande au moment où
// la facture a été émise (numéro attribué par la base, jamais par le site).
export interface FactureEmise {
  numero: string;
  commande_id: number;
  date_emission: string;
  date_livraison: string | null;
  date_reglement: string | null;
  mode_reglement: string | null;
  client_nom: string | null;
  client_adresse: string | null;
  client_email: string | null;
  client_telephone: string | null;
  lignes: LignePanier[];
  code_promo: string | null;
  remise_code_pct: number | null;
  frais_livraison_ttc: number;
  total_ht: number;
  total_tva: number;
  total_ttc: number;
  remplace: string | null;
}

export interface LigneDocument {
  designation: string;
  detail: string;
  quantite: string;
  prixUnitaireHT: string;
  remise: string;
  totalHT: number;
}

export interface MontantsDocument {
  lignes: LigneDocument[];
  produitsHT: number;
  remiseHT: number;
  libelleRemise: string;
  fraisHT: number;
  totalHT: number;
  tva: number;
  totalTTC: number;
}

const centimes = (euros: unknown) => Math.round((Number(euros) || 0) * 100);
const horsTaxe = (ttcCentimes: number) => Math.round(ttcCentimes / (1 + TAUX_TVA / 100));
const euros = (c: number) => formatPrix(c / 100);
const moins = (c: number) => `−${euros(c)}`;
const tauxAffiche = `${String(TAUX_TVA).replace('.', ',')} %`;

// Montant TTC d'une ligne. Celui calculé par le serveur à la commande fait
// foi ; le calcul de repli ne sert qu'aux très anciennes commandes.
function ligneTTC(item: LignePanier): number {
  if (item.prixTotalLigne != null) return centimes(item.prixTotalLigne);
  const qte = Number(item.quantite || item.quantity) || 0;
  const qteEffective = item.unite === 'g' ? qte / 1000 : qte;
  let prixUnit = Number(item.price || item.prix) || 0;
  const promotion = Number(item.promotion) || 0;
  if (promotion > 0) prixUnit *= 1 - promotion / 100;
  const seuil = item.seuil_achat || 0;
  const offert = item.quantite_offerte || 0;
  if (seuil > 0 && offert > 0) {
    const tailleLot = seuil + offert;
    const nbLots = Math.floor(qteEffective / tailleLot);
    const reste = qteEffective % tailleLot;
    return centimes((nbLots * seuil + Math.min(reste, seuil)) * prixUnit);
  }
  if (premieresOffertes(item) > 0) return centimes(qtePayantePremieresOffertes(item, qteEffective) * prixUnit);
  return centimes(qteEffective * prixUnit);
}

// Répartit « total » centimes entre les lignes au prorata de leur poids, sans
// perdre un centime (méthode du plus fort reste) : la somme des lignes est
// exactement le total affiché.
function repartir(total: number, poids: number[]): number[] {
  const somme = poids.reduce((a, b) => a + b, 0);
  if (somme <= 0) return poids.map(() => 0);
  const exacts = poids.map((p) => (total * p) / somme);
  const parts = exacts.map(Math.floor);
  let reste = total - parts.reduce((a, b) => a + b, 0);
  const ordre = exacts.map((e, i) => ({ i, f: e - Math.floor(e) })).sort((a, b) => b.f - a.f || a.i - b.i);
  for (let k = 0; reste > 0 && k < ordre.length; k++, reste--) parts[ordre[k].i] += 1;
  return parts;
}

export function calculerMontants(source: {
  lignes: LignePanier[];
  fraisTTC: Valeur;
  totalTTC: Valeur;
  codePromo?: string | null;
  remiseCodePct?: number | null;
  totalHT?: Valeur;
}): MontantsDocument {
  const items = source.lignes || [];
  const ttcLignes = items.map(ligneTTC);
  const produitsTTC = ttcLignes.reduce((a, b) => a + b, 0);
  const fraisTTC = centimes(source.fraisTTC);
  const totalTTC = centimes(source.totalTTC);

  const totalHT = source.totalHT != null ? centimes(source.totalHT) : horsTaxe(totalTTC);
  const tva = totalTTC - totalHT;
  const fraisHT = horsTaxe(fraisTTC);
  const netProduitsHT = totalHT - fraisHT;

  // Remise sur l'ensemble de la commande : code promo, ou remise fidélité /
  // parrainage (les deux ne se cumulent pas). Un écart de quelques centimes
  // n'est qu'un arrondi : il est absorbé dans la répartition des lignes.
  const ecartTTC = produitsTTC + fraisTTC - totalTTC;
  const pctCode = Number(source.remiseCodePct) || 0;
  const aRemise = produitsTTC > 0 && (pctCode > 0 || ecartTTC / produitsTTC > 0.03);
  const produitsHT = aRemise ? Math.max(horsTaxe(produitsTTC), netProduitsHT) : netProduitsHT;
  const remiseHT = produitsHT - netProduitsHT;
  const pct = pctCode > 0 ? pctCode : Math.round((ecartTTC / (produitsTTC || 1)) * 100);
  const libelleRemise = !aRemise
    ? ''
    : source.codePromo
      ? `Code promo ${source.codePromo} (−${pct} %)`
      : `Remise fidélité ou parrainage (−${pct} %)`;

  const htLignes = repartir(produitsHT, ttcLignes);

  const lignes = items.map((item, i): LigneDocument => {
    const qte = Number(item.quantite || item.quantity) || 0;
    const auPoids = item.unite === 'g' || item.unite === 'kg';
    const qteEffective = item.unite === 'g' ? qte / 1000 : qte;
    const prixBase = Number(item.price || item.prix) || 0;
    const promo = Number(item.promotion) || 0;
    const prixApplique = item.prixUnitaire != null ? Number(item.prixUnitaire) : prixBase * (1 - promo / 100);
    const offerts = Number(item.offerts) || 0;

    const reduit = prixApplique < prixBase - 0.001;
    let remise = '—';
    if (reduit && offerts <= 0 && promo > 0 && Math.abs(prixBase * (1 - promo / 100) - prixApplique) < 0.006) {
      remise = `−${promo} %`;
    } else if (reduit || offerts > 0) {
      const montant = Math.round((qteEffective * prixBase * 100) / (1 + TAUX_TVA / 100)) - htLignes[i];
      if (montant > 0) remise = moins(montant);
    }

    return {
      designation: String(item.nom || item.name || 'Produit'),
      detail: offerts > 0 ? `Dont offert : ${libelleQuantite(item, offerts)}` : '',
      quantite: libelleQuantite(item, qte),
      prixUnitaireHT: `${euros(horsTaxe(centimes(prixBase)))}${auPoids ? ' / kg' : ''}`,
      remise,
      totalHT: htLignes[i],
    };
  });

  return { lignes, produitsHT, remiseHT, libelleRemise, fraisHT, totalHT, tva, totalTTC };
}

const echapper = (texte: unknown) =>
  String(texte ?? '').replace(/[&<>"']/g, (c) => (
    { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c] as string
  ));

// « 2026-11-12 » ou date complète → « 12 novembre 2026 »
function dateLongue(valeur: string | null | undefined): string {
  if (!valeur) return '—';
  const date = new Date(/^\d{4}-\d{2}-\d{2}$/.test(valeur) ? `${valeur}T12:00:00` : valeur);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' });
}

// Frais réellement facturés ; repli pour les anciennes commandes enregistrées
// sans frais de livraison (même règle que la facture d'origine).
function fraisCommande(commande: CommandeDocument): number {
  if (commande.frais_livraison != null) return Number(commande.frais_livraison);
  if (commande.adresse_livraison?.includes('Retrait')) return 0;
  const produits = (commande.contenu_panier || []).reduce((a, l) => a + ligneTTC(l), 0);
  return produits > 0 && produits < 4000 ? 2.5 : 0;
}

const LOGO = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 320 60" width="224" height="42" role="img" aria-label="Soleil et Saveurs">
<circle cx="28" cy="30" r="9" fill="#F97316"/>
<g stroke="#F97316" stroke-width="2.5" stroke-linecap="round">
<line x1="28" y1="7" x2="28" y2="15"/><line x1="28" y1="45" x2="28" y2="53"/>
<line x1="5" y1="30" x2="13" y2="30"/><line x1="43" y1="30" x2="51" y2="30"/>
<line x1="44.3" y1="13.7" x2="38.5" y2="19.5"/><line x1="11.7" y1="46.3" x2="17.5" y2="40.5"/>
<line x1="11.7" y1="13.7" x2="17.5" y2="19.5"/><line x1="44.3" y1="46.3" x2="38.5" y2="40.5"/>
</g>
<text x="62" y="39" font-family="Georgia, 'Times New Roman', serif" font-size="26" fill="#4a3b32" letter-spacing="0.3">Soleil et Saveurs</text>
</svg>`;

const STYLES = `
@page { size: A4; margin: 12mm 13mm; }
* { box-sizing: border-box; }
html { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
body { margin: 0; background: #fff; color: #3D2B1F; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; font-size: 14px; line-height: 1.4; }
.page { display: flex; flex-direction: column; min-height: 270mm; }
@media screen { body { background: #EDE3D5; } .page { width: 210mm; max-width: 100%; margin: 16px auto; padding: 12mm 13mm; background: #fff; } }
.titre { font-family: Georgia, 'Times New Roman', serif; font-weight: 400; letter-spacing: -0.01em; }
.entete { display: flex; align-items: flex-start; justify-content: space-between; gap: 24px; }
.entete .accroche { margin: 8px 0 0 3px; font-size: 13px; color: #5C4030; }
.entete h1 { margin: 0; font-size: 46px; line-height: 0.95; text-align: right; }
.entete .numero { margin: 8px 0 0; font-size: 16px; font-weight: 800; letter-spacing: 0.04em; color: #C73600; text-align: right; }
.entete .remplace { margin: 4px 0 0; font-size: 12px; color: #5C4030; text-align: right; }
.reperes { margin: 18px 0 0; display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); border-top: 1.5px solid #3D2B1F; border-bottom: 1px solid #E3D6C4; }
.reperes div { padding: 9px 14px; border-left: 1px solid #E3D6C4; }
.reperes div:first-child { padding-left: 0; border-left: 0; }
.reperes div:last-child { padding-right: 0; }
.reperes dt, th { font-size: 12px; font-weight: 700; letter-spacing: 0.06em; text-transform: uppercase; color: #5C4030; }
.reperes dd { margin: 3px 0 0; font-size: 15px; font-weight: 700; }
.parties { margin-top: 16px; display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 20px; }
.bloc { padding: 13px 18px; border-radius: 14px; border: 1px solid #E3D6C4; }
.bloc.vendeur { border-color: #F8F1E8; background: #F8F1E8; }
.bloc h2 { margin: 0 0 6px; font-size: 12px; font-weight: 800; letter-spacing: 0.1em; text-transform: uppercase; color: #C73600; }
.bloc .nom { margin: 0; font-size: 16px; font-weight: 800; }
.bloc .texte { margin: 4px 0 0; font-size: 13px; line-height: 1.5; color: #5C4030; overflow-wrap: anywhere; }
table { margin-top: 20px; border-collapse: collapse; width: 100%; }
th { text-align: right; padding: 0 0 8px 10px; border-bottom: 1.5px solid #3D2B1F; white-space: nowrap; }
td { padding: 7px 0 7px 10px; border-bottom: 1px solid #E3D6C4; text-align: right; vertical-align: top; font-variant-numeric: tabular-nums; white-space: nowrap; }
th:first-child, td:first-child { text-align: left; padding-left: 0; white-space: normal; }
td strong { font-weight: 700; }
td .detail { display: block; margin-top: 1px; font-size: 12px; color: #5C4030; }
td.remise { color: #166534; font-weight: 700; }
td.total { font-weight: 700; }
thead { display: table-header-group; }
tr, .bas, footer { break-inside: avoid; page-break-inside: avoid; }
.bas { margin-top: 18px; display: flex; align-items: flex-start; justify-content: space-between; gap: 28px; }
.bas .bloc { flex: 1; min-width: 0; }
.acquittee { display: inline-block; margin: 10px 0 0; padding: 6px 14px; border: 2px solid #166534; border-radius: 8px; font-size: 13px; font-weight: 800; letter-spacing: 0.1em; text-transform: uppercase; color: #166534; }
.totaux { flex: none; width: 300px; margin: 0; font-variant-numeric: tabular-nums; }
.totaux div { display: flex; justify-content: space-between; gap: 12px; padding: 4px 0; }
.totaux dt { color: #5C4030; }
.totaux dd { margin: 0; font-weight: 600; white-space: nowrap; }
.totaux .remise dt, .totaux .remise dd { color: #166534; font-weight: 700; }
.totaux .ht { margin-top: 5px; padding-top: 8px; border-top: 1px solid #E3D6C4; }
.totaux .ttc { align-items: baseline; margin-top: 7px; padding: 11px 16px; border-radius: 12px; background: #3D2B1F; }
.totaux .ttc dt { color: #fff; font-weight: 700; }
.totaux .ttc dd { color: #fff; font-size: 28px; line-height: 1; font-weight: 400; }
footer { margin-top: auto; padding-top: 20px; }
footer p { margin: 0; font-size: 12px; line-height: 1.5; color: #5C4030; }
footer .mentions { padding-top: 10px; border-top: 1.5px solid #3D2B1F; }
footer .mentions strong { color: #3D2B1F; font-weight: 800; }
footer .identite { margin-top: 8px; padding-top: 8px; border-top: 1px solid #E3D6C4; }
`;

export type TypeDocument = 'facture' | 'bon de livraison' | 'récapitulatif de commande';

// Construit la page complète (HTML) d'une facture émise, ou d'un bon de
// livraison / récapitulatif tant que la facture n'existe pas.
export function htmlDocument(commande: CommandeDocument, facture: FactureEmise | null, typeSansFacture: TypeDocument = 'bon de livraison'): string {
  const type: TypeDocument = facture ? 'facture' : typeSansFacture;
  const montants = facture
    ? calculerMontants({
        lignes: facture.lignes,
        fraisTTC: facture.frais_livraison_ttc,
        totalTTC: facture.total_ttc,
        codePromo: facture.code_promo,
        remiseCodePct: facture.remise_code_pct,
        totalHT: facture.total_ht,
      })
    : calculerMontants({
        lignes: commande.contenu_panier || [],
        fraisTTC: fraisCommande(commande),
        totalTTC: commande.total,
        codePromo: commande.code_promo,
        remiseCodePct: commande.remise_code_pct,
      });

  const client = {
    nom: facture ? facture.client_nom : commande.nom_client,
    adresse: facture ? facture.client_adresse : commande.adresse_livraison,
    email: facture ? facture.client_email : commande.email_client,
    telephone: facture ? facture.client_telephone : commande.telephone_client,
  };
  const idCommande = facture ? facture.commande_id : commande.id;
  const dateLivraison = facture ? facture.date_livraison : commande.date_livraison;
  const enLigne = (facture ? facture.mode_reglement : commande.methode_paiement) === 'Ligne';
  const mode = enLigne ? 'carte bancaire en ligne' : 'espèces ou carte bancaire, à la livraison';
  const acquittee = Boolean(facture?.date_reglement);
  const titre = type === 'facture' ? 'Facture' : type === 'bon de livraison' ? 'Bon de livraison' : 'Récapitulatif';

  const reglement = facture
    ? `Mode de règlement : ${mode}.<br>${acquittee
        ? `Date de règlement : ${dateLongue(facture.date_reglement)} (comptant).`
        : 'Règlement comptant, à réception de la commande.'}`
    : `Mode de règlement : ${mode}.<br>Ce document n'est pas une facture : la facture est émise à la livraison, puis disponible dans l'espace client.`;

  return `<!doctype html>
<html lang="fr">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${echapper(facture ? `Facture ${facture.numero}` : `${titre} — commande n° ${idCommande}`)}</title>
<style>${STYLES}</style>
</head>
<body>
<div class="page">

<div class="entete">
<div>
${LOGO}
<p class="accroche">Fruits &amp; légumes frais livrés dans les Yvelines</p>
</div>
<div>
<h1 class="titre">${titre}</h1>
<p class="numero">${facture ? `N° ${echapper(facture.numero)}` : `Commande n° ${echapper(idCommande)}`}</p>
${facture?.remplace ? `<p class="remplace">Annule et remplace le document ${echapper(facture.remplace)}</p>` : ''}
</div>
</div>

<dl class="reperes">
<div><dt>${facture ? "Date d'émission" : 'Date de commande'}</dt><dd>${dateLongue(facture ? facture.date_emission : commande.created_at)}</dd></div>
<div><dt>Date de livraison</dt><dd>${dateLongue(dateLivraison)}</dd></div>
<div><dt>Commande</dt><dd>N° ${echapper(idCommande)}</dd></div>
<div><dt>Nature</dt><dd>Livraison de biens</dd></div>
</dl>

<div class="parties">
<section class="bloc vendeur">
<h2>Vendeur</h2>
<p class="nom">${VENDEUR.nom}</p>
<p class="texte">${VENDEUR.forme}<br>${VENDEUR.adresse}<br>SIREN ${VENDEUR.siren} · ${VENDEUR.rcs}<br>TVA intracommunautaire : ${VENDEUR.tva}<br>${VENDEUR.email}<br>${VENDEUR.telephone}</p>
</section>
<section class="bloc">
<h2>${facture ? 'Facturé et livré à' : 'Livré à'}</h2>
<p class="nom">${echapper(client.nom || 'Client')}</p>
<p class="texte">${[client.adresse, client.email, client.telephone].filter(Boolean).map(echapper).join('<br>')}</p>
</section>
</div>

<table>
<thead>
<tr><th scope="col">Désignation</th><th scope="col">Quantité</th><th scope="col">Prix unit. HT</th><th scope="col">Remise</th><th scope="col">TVA</th><th scope="col">Total HT</th></tr>
</thead>
<tbody>
${montants.lignes.map((l) => `<tr><td><strong>${echapper(l.designation)}</strong>${l.detail ? `<span class="detail">${echapper(l.detail)}</span>` : ''}</td><td>${echapper(l.quantite)}</td><td>${l.prixUnitaireHT}</td><td${l.remise === '—' ? '' : ' class="remise"'}>${l.remise}</td><td>${tauxAffiche}</td><td class="total">${euros(l.totalHT)}</td></tr>`).join('\n')}
</tbody>
</table>

<div class="bas">
<section class="bloc">
<h2>Règlement</h2>
<p class="texte" style="margin-top:0">${reglement}</p>
${acquittee ? '<p class="acquittee">Facture acquittée</p>' : ''}
</section>
<dl class="totaux">
<div><dt>Total des produits HT</dt><dd>${euros(montants.produitsHT)}</dd></div>
${montants.remiseHT > 0 ? `<div class="remise"><dt>${echapper(montants.libelleRemise)}</dt><dd>${moins(montants.remiseHT)}</dd></div>` : ''}
<div><dt>Frais de livraison HT</dt><dd>${montants.fraisHT > 0 ? euros(montants.fraisHT) : 'Offerts'}</dd></div>
<div class="ht"><dt>Total HT</dt><dd>${euros(montants.totalHT)}</dd></div>
<div><dt>TVA ${tauxAffiche}</dt><dd>${euros(montants.tva)}</dd></div>
<div class="ttc"><dt>Total TTC${acquittee ? ' — réglé' : ' — net à payer'}</dt><dd class="titre">${euros(montants.totalTTC)}</dd></div>
</dl>
</div>

<footer>
<p class="mentions"><strong>Escompte pour paiement anticipé : néant.</strong> TVA au taux indiqué sur chaque ligne, frais de livraison compris. Les prix de vente sont fixés toutes taxes comprises : les montants hors taxes en sont déduits et arrondis au centime.</p>
<p class="identite">${VENDEUR.nom} · ${VENDEUR.forme} · ${VENDEUR.adresse} · ${VENDEUR.rcs} ${VENDEUR.siren} · TVA ${VENDEUR.tva} · ${VENDEUR.site}<br>Merci d'avoir choisi le circuit court avec Soleil et Saveurs.</p>
</footer>

</div>
</body>
</html>`;
}

// Ouvre le document dans une fenêtre et lance l'impression (ou « Enregistrer en PDF »).
export function imprimerDocument(html: string) {
  const fenetre = window.open('', '', 'height=900,width=860');
  if (!fenetre) return;
  fenetre.document.write(html);
  fenetre.document.close();
  setTimeout(() => fenetre.print(), 500);
}
