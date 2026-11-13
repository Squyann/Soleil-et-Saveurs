// E-mails automatiques liés aux commandes : commande reçue (client),
// nouvelle commande (boutique) et commande livrée avec sa facture (client).
// Tout le contenu est relu dans la base par les routes /api/notify-*.
import { libelleQuantite } from '@/lib/format';
import {
  bouton, COULEURS as C, coquille, dateLivraison, echapper, encadre, intertitre, ligneArticle,
  paragraphe, piedTransactionnel, prix, reperes, surtitre, tableauArticles, titre, totaux, urlAbsolue, urlSite,
} from './gabarit';

type Valeur = string | number | null | undefined;

export interface LigneCommande {
  nom?: string;
  name?: string;
  unite?: string | null;
  quantite?: Valeur;
  price?: Valeur;
  promotion?: Valeur;
  prixUnitaire?: Valeur;
  prixTotalLigne?: Valeur;
  offerts?: Valeur;
  seuil_achat?: Valeur;
  quantite_offerte?: Valeur;
  image_url?: string | null;
}

export interface CommandeEmail {
  id: number;
  nom_client: string | null;
  telephone_client?: string | null;
  adresse_livraison: string | null;
  email_client?: string | null;
  total: Valeur;
  contenu_panier: LigneCommande[] | null;
  date_livraison: string | null;
  code_promo?: string | null;
  remise_code_pct?: number | null;
  frais_livraison?: Valeur;
  distance_km?: Valeur;
  commentaire_client?: string | null;
  created_at?: string;
}

export interface FactureEmail {
  numero: string;
  total_ttc: Valeur;
  total_tva: Valeur;
  date_reglement: string | null;
}

export interface Email { objet: string; html: string }

const n = (v: Valeur) => Number(v) || 0;
const CRENEAU = 'entre 15&nbsp;h et 20&nbsp;h';

// « 1 pièce offerte », « 2 bottes offertes », « 1 kg offert »
function offert(l: LigneCommande, q: number): string {
  const feminin = !l.unite || ['pièce', 'botte', 'barquette'].includes(l.unite);
  return `${libelleQuantite(l, q)} offert${feminin ? 'e' : ''}${q > 1 && l.unite !== 'g' && l.unite !== 'kg' ? 's' : ''}`;
}

function prenom(nom: string | null): string {
  return (nom || '').trim().split(/\s+/)[0] || '';
}

function libellePrixUnitaire(l: LigneCommande): string {
  const pu = prix(l.prixUnitaire != null ? n(l.prixUnitaire) : n(l.price));
  if (l.unite === 'g' || l.unite === 'kg') return `${pu} le kg`;
  return `${pu} ${l.unite === 'pièce' || !l.unite ? 'la pièce' : `la ${echapper(l.unite)}`}`;
}

function badge(l: LigneCommande): string | undefined {
  const offerts = n(l.offerts);
  if (n(l.promotion) > 0) return `−${n(l.promotion)}&nbsp;%`;
  if (offerts > 0 && n(l.seuil_achat) > 0 && n(l.quantite_offerte) > 0) return `${n(l.seuil_achat)} achetés + ${n(l.quantite_offerte)} offert${n(l.quantite_offerte) > 1 ? 's' : ''}`;
  if (offerts > 0) return 'Offert';
  if (l.prixUnitaire != null && n(l.prixUnitaire) < n(l.price) - 0.001) return 'Prix dégressif';
  return undefined;
}

function montants(cmd: CommandeEmail) {
  const lignes = cmd.contenu_panier || [];
  const produits = Math.round(lignes.reduce((s, l) => s + n(l.prixTotalLigne), 0) * 100) / 100;
  const frais = n(cmd.frais_livraison);
  const total = n(cmd.total);
  const remise = Math.max(Math.round((produits + frais - total) * 100) / 100, 0);
  const lignesTotaux: { libelle: string; montant: string; vert?: boolean }[] = [{ libelle: 'Produits', montant: prix(produits) }];
  if (remise >= 0.01) {
    lignesTotaux.push(cmd.code_promo
      ? { libelle: `Code promo ${echapper(cmd.code_promo)}${cmd.remise_code_pct ? ` (−${cmd.remise_code_pct}&nbsp;%)` : ''}`, montant: `−${prix(remise)}`, vert: true }
      : { libelle: 'Remise fidélité ou parrainage', montant: `−${prix(remise)}`, vert: true });
  }
  lignesTotaux.push({ libelle: 'Livraison', montant: frais > 0 ? prix(frais) : 'Offerte' });
  return { lignesTotaux, total };
}

function articlesClient(cmd: CommandeEmail): string {
  return tableauArticles((cmd.contenu_panier || []).map((l) => {
    const offerts = n(l.offerts);
    const detail = `${libelleQuantite(l, n(l.quantite))} · ${libellePrixUnitaire(l)}${offerts > 0 ? ` · dont ${offert(l, offerts)}` : ''}`;
    return ligneArticle({ image: urlAbsolue(l.image_url), nom: echapper(l.nom || l.name || 'Produit'), detail, badge: badge(l), montant: prix(n(l.prixTotalLigne)) });
  }));
}

// 1. Au client, dès la commande
export function emailCommandeRecue(cmd: CommandeEmail): Email {
  const { lignesTotaux, total } = montants(cmd);
  const date = dateLivraison(cmd.date_livraison);
  const p = prenom(cmd.nom_client);
  const contenu = [
    surtitre('Commande reçue'),
    titre(`Merci${p ? ` ${echapper(p)}` : ''}, nous préparons votre panier`),
    paragraphe('Votre commande est bien enregistrée : nous la préparons avec soin et vous la livrons à la date choisie.'),
    reperes([
      { libelle: 'Livraison', valeur: date ? `${date}<br>${CRENEAU}` : 'À la date choisie' },
      { libelle: 'Paiement', valeur: 'À la livraison<br>espèces ou carte' },
      { libelle: 'Adresse', valeur: echapper(cmd.adresse_livraison), plein: true },
    ]),
    intertitre('Votre panier'),
    articlesClient(cmd),
    totaux(lignesTotaux, { libelle: 'Total à régler', montant: prix(total) }),
    paragraphe('Prix TTC, TVA 5,5&nbsp;% incluse. Votre facture sera disponible dans votre espace client dès la livraison.', '14px 0 0'),
    bouton('Suivre ma commande', `${urlSite()}/compte?onglet=commandes`),
    encadre(`<strong style="color:${C.brun};">Un changement, une question ?</strong> Répondez simplement à cet e-mail ou appelez-nous au 07&nbsp;59&nbsp;72&nbsp;00&nbsp;83.`),
  ].join('');
  return {
    objet: `Votre commande n° ${cmd.id} est bien reçue`,
    html: coquille({ titre: `Commande n° ${cmd.id}`, preheader: date ? `Livraison ${date.toLowerCase()}, ${CRENEAU.replace(/&nbsp;/g, ' ')}` : 'Votre commande est enregistrée', reference: `Commande n° ${cmd.id}`, contenu, pied: piedTransactionnel() }),
  };
}

// 2. À la boutique, dès la commande
export function emailNouvelleCommande(cmd: CommandeEmail, emailClient: string): Email {
  const { lignesTotaux, total } = montants(cmd);
  const date = dateLivraison(cmd.date_livraison);
  const heure = cmd.created_at ? new Date(cmd.created_at).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Paris' }).replace(':', ' h ') : '';
  const tel = (cmd.telephone_client || '').replace(/[^\d+]/g, '');
  const itineraire = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(cmd.adresse_livraison || '')}`;
  const nbArticles = (cmd.contenu_panier || []).length;
  const livraison = lignesTotaux.find((l) => l.libelle === 'Livraison');
  if (livraison && n(cmd.distance_km) > 0) livraison.libelle = `Livraison (${String(n(cmd.distance_km)).replace('.', ',')} km du relais)`;

  const enTete = `<tr><td style="padding:18px 32px;background:${C.orange};font-family:Arial,sans-serif;color:#FFFFFF;">
      <span style="font-size:22px;font-weight:800;">Nouvelle commande</span>
      <span style="font-size:15px;font-weight:600;"> &nbsp;n° ${cmd.id}${heure ? ` · passée à ${heure}` : ''}</span>
    </td></tr>`;
  const actions = `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-top:12px;"><tr>
      ${tel ? `<td width="49%" style="width:49%;">${bouton('Appeler', `tel:${tel}`, 'contour', '0')}</td><td width="2%"></td>` : ''}
      <td>${bouton('Itinéraire', itineraire, 'contour', '0')}</td>
    </tr></table>`;
  const contenu = [
    reperes([
      { libelle: 'À livrer', valeur: `<span style="font-size:19px;">${date || 'Date non renseignée'} · 15&nbsp;h – 20&nbsp;h</span>`, plein: true, fond: C.orangePale, couleur: C.orangeTexte },
      { libelle: 'Total à encaisser', valeur: `<span style="font-family:Georgia,serif;font-weight:400;font-size:24px;">${prix(total)}</span>` },
      { libelle: 'Paiement', valeur: 'À la livraison' },
    ], '0'),
    intertitre('Client'),
    `<p style="margin:0;font-family:Arial,sans-serif;font-size:17px;font-weight:800;color:${C.brun};">${echapper(cmd.nom_client)}</p>`,
    paragraphe(`${echapper(cmd.adresse_livraison)}<br>${echapper(cmd.telephone_client || 'Téléphone non renseigné')} · ${echapper(emailClient || '—')}`, '4px 0 0'),
    actions,
    cmd.commentaire_client ? encadre(`<strong style="display:block;margin-bottom:3px;font-size:12px;letter-spacing:1px;text-transform:uppercase;color:${C.orangeTexte};">Commentaire du client</strong>${echapper(cmd.commentaire_client)}`, { fond: C.orangePale, bord: C.orangePale, marge: '14px 0 0' }) : '',
    intertitre(`À préparer · ${nbArticles} article${nbArticles > 1 ? 's' : ''}`),
    tableauArticles((cmd.contenu_panier || []).map((l) => {
      const offerts = n(l.offerts);
      return ligneArticle({
        nom: `${libelleQuantite(l, n(l.quantite))} · ${echapper(l.nom || l.name || 'Produit')}`,
        detail: offerts > 0 ? `dont ${offert(l, offerts)}` : undefined,
        montant: prix(n(l.prixTotalLigne)),
      }, false);
    })),
    totaux(lignesTotaux, { libelle: 'Total', montant: prix(total) }),
    bouton("Ouvrir la commande dans l'admin", `${urlSite()}/admin`, 'brun'),
  ].join('');
  return {
    objet: `Nouvelle commande n° ${cmd.id} — ${(cmd.nom_client || '').trim()} — ${n(cmd.total).toFixed(2).replace('.', ',')} €`,
    html: coquille({ titre: `Nouvelle commande n° ${cmd.id}`, preheader: `À livrer ${date.toLowerCase()} · ${n(cmd.total).toFixed(2).replace('.', ',')} € à encaisser`, enTete, contenu, pied: "E-mail interne envoyé à l'adresse de la boutique. Ne pas transférer : il contient les coordonnées du client." }),
  };
}

// 3. Au client, à la livraison (avec sa facture si elle est émise)
export function emailCommandeLivree(cmd: CommandeEmail, facture: FactureEmail | null): Email {
  const p = prenom(cmd.nom_client);
  const date = dateLivraison(cmd.date_livraison);
  const blocFacture = facture
    ? `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-top:24px;"><tr><td style="padding:20px;border-radius:16px;border:2px solid ${C.vert};background:#F4FBF6;font-family:Arial,sans-serif;">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr>
          <td style="font-size:13px;font-weight:800;letter-spacing:1px;text-transform:uppercase;color:${C.vert};">Facture ${echapper(facture.numero)}</td>
          ${facture.date_reglement ? `<td align="right"><span style="display:inline-block;padding:4px 10px;border:2px solid ${C.vert};border-radius:8px;font-size:12px;font-weight:800;letter-spacing:1px;text-transform:uppercase;color:${C.vert};">Acquittée</span></td>` : ''}
        </tr></table>
        <p style="margin:10px 0 0;font-family:Georgia,serif;font-size:30px;color:${C.brun};">${prix(n(facture.total_ttc))}</p>
        <p style="margin:6px 0 0;font-size:14px;color:${C.brunMoyen};">${facture.date_reglement ? `Réglée le ${new Date(`${facture.date_reglement}T12:00:00`).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })} · ` : ''}dont TVA 5,5&nbsp;% : ${prix(n(facture.total_tva))}</p>
      </td></tr></table>`
    : '';
  const contenu = [
    surtitre('Commande livrée', C.vert),
    titre(`Bonne dégustation${p ? `, ${echapper(p)}` : ''} !`),
    paragraphe(`Votre panier a été livré${date ? ` le ${date.toLowerCase()}` : ''} au ${echapper(cmd.adresse_livraison)}. Merci pour votre confiance.`),
    blocFacture,
    bouton(facture ? 'Télécharger ma facture' : 'Voir ma commande', `${urlSite()}/compte?onglet=commandes`, 'brun'),
    bouton('Commander à nouveau', `${urlSite()}/commander`, 'contour', '10px 0 0'),
    encadre(`<strong style="color:${C.brun};">Un produit abîmé ou une erreur ?</strong> Envoyez-nous une photo par WhatsApp ou en répondant à cet e-mail dans les 24&nbsp;h suivant la livraison : nous vous créditons la valeur du produit.`),
  ].join('');
  return {
    objet: facture ? `Livrée ! Votre facture ${facture.numero} est disponible` : `Votre commande n° ${cmd.id} est livrée`,
    html: coquille({ titre: `Commande n° ${cmd.id} livrée`, preheader: facture ? `Facture ${facture.numero} · ${n(facture.total_ttc).toFixed(2).replace('.', ',')} €` : 'Votre commande a été livrée', reference: `Commande n° ${cmd.id}`, contenu, pied: piedTransactionnel() }),
  };
}
