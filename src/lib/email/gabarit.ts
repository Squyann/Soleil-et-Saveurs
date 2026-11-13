// Gabarit des e-mails Soleil et Saveurs (automatiques et campagnes).
//
// Les messageries n'acceptent qu'un HTML ancien : mise en page en tableaux,
// styles en ligne, pas de SVG ni de polices web (titres en Georgia). Tous les
// textes venant de la base ou d'un client passent par echapper().

export const COULEURS = {
  fond: '#F5EAE0',
  carte: '#FFFFFF',
  creme: '#F8F1E8',
  brun: '#3D2B1F',
  brunMoyen: '#5C4030',
  gris: '#6F5A4B',
  bord: '#E3D6C4',
  bordClair: '#F0E7DA',
  orange: '#FF4500',
  orangeTexte: '#C73600',
  orangePale: '#FFF1EA',
  vert: '#166534',
  vertPale: '#ECF7EF',
};

const C = COULEURS;
const POLICE = "-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif";
const SERIF = "Georgia,'Times New Roman',serif";

export const VENDEUR_PIED =
  'SOLEIL ET SAVEURS, SAS au capital de 1&nbsp;000&nbsp;€ · 6-8 avenue Henriette, 93170 Bagnolet · RCS Bobigny 821&nbsp;324&nbsp;324';

export function echapper(texte: unknown): string {
  return String(texte ?? '').replace(/[&<>"']/g, (c) => (
    { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c] as string
  ));
}

export function urlSite(): string {
  const url = process.env.NEXT_PUBLIC_SITE_URL || 'https://soleiletsaveurs.fr';
  return url.replace(/\/$/, '');
}

// Adresse absolue d'une image (les e-mails ne comprennent pas les chemins relatifs)
export function urlAbsolue(chemin: string | null | undefined): string | null {
  if (!chemin) return null;
  if (/^https:\/\//.test(chemin)) return chemin;
  if (chemin.startsWith('/')) return `${urlSite()}${chemin}`;
  return null;
}

// « 2026-11-14 » → « samedi 14 novembre »
export function dateLivraison(date: string | null | undefined, annee = false): string {
  if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) return '';
  const texte = new Date(`${date}T12:00:00`).toLocaleDateString('fr-FR', {
    weekday: 'long', day: 'numeric', month: 'long', ...(annee ? { year: 'numeric' } : {}), timeZone: 'Europe/Paris',
  });
  return texte.charAt(0).toUpperCase() + texte.slice(1);
}

export const prix = (n: number) => `${(Number(n) || 0).toFixed(2).replace('.', ',')}&nbsp;€`;

// --- Briques ---------------------------------------------------------------

export function surtitre(texte: string, couleur = C.orangeTexte): string {
  return `<p style="margin:0 0 6px;font-family:${POLICE};font-size:13px;font-weight:800;letter-spacing:1.3px;text-transform:uppercase;color:${couleur};">${texte}</p>`;
}

export function titre(texte: string, taille = 30): string {
  return `<h1 style="margin:0;font-family:${SERIF};font-weight:400;font-size:${taille}px;line-height:1.18;color:${C.brun};">${texte}</h1>`;
}

export function paragraphe(html: string, marge = '12px 0 0'): string {
  return `<p style="margin:${marge};font-family:${POLICE};font-size:16px;line-height:1.55;color:${C.brunMoyen};">${html}</p>`;
}

export function intertitre(texte: string): string {
  return `<p style="margin:28px 0 8px;font-family:${POLICE};font-size:13px;font-weight:800;letter-spacing:1px;text-transform:uppercase;color:${C.brunMoyen};">${texte}</p>`;
}

// Petits encarts « Livraison », « Paiement »… deux par ligne
export function reperes(items: { libelle: string; valeur: string; plein?: boolean; fond?: string; couleur?: string }[], marge = '22px'): string {
  const cellule = (r: (typeof items)[number], colspan = 1) => `
    <td colspan="${colspan}" valign="top" style="padding:14px 16px;background:${r.fond || C.creme};border-radius:14px;">
      <p style="margin:0;font-family:${POLICE};font-size:12px;font-weight:800;letter-spacing:1px;text-transform:uppercase;color:${r.couleur || C.gris};">${r.libelle}</p>
      <p style="margin:4px 0 0;font-family:${POLICE};font-size:15px;font-weight:700;line-height:1.4;color:${C.brun};">${r.valeur}</p>
    </td>`;
  const lignes: string[] = [];
  let attente: (typeof items)[number] | null = null;
  for (const r of items) {
    if (r.plein) {
      if (attente) { lignes.push(`<tr>${cellule(attente, 3)}</tr>`); attente = null; }
      lignes.push(`<tr>${cellule(r, 3)}</tr>`);
    } else if (attente) {
      lignes.push(`<tr>${cellule(attente)}<td width="10" style="width:10px;"></td>${cellule(r)}</tr>`);
      attente = null;
    } else {
      attente = r;
    }
  }
  if (attente) lignes.push(`<tr>${cellule(attente, 3)}</tr>`);
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-top:${marge};border-collapse:separate;border-spacing:0 10px;">${lignes.join('')}</table>`;
}

// avecImage : colonne photo présente sur toutes les lignes du tableau (case
// vide si le produit n'a pas de photo), pour garder les colonnes alignées.
export function ligneArticle(a: { image?: string | null; nom: string; detail?: string; badge?: string; montant: string }, avecImage = true): string {
  const img = !avecImage
    ? ''
    : a.image
      ? `<td width="64" valign="middle" style="width:64px;padding:10px 12px 10px 0;"><img src="${echapper(a.image)}" width="52" height="52" alt="" style="display:block;width:52px;height:52px;border-radius:12px;object-fit:cover;background:${C.fond};"></td>`
      : `<td width="64" valign="middle" style="width:64px;padding:10px 12px 10px 0;"><div style="width:52px;height:52px;border-radius:12px;background:${C.fond};"></div></td>`;
  return `<tr>
    ${img}
    <td valign="middle" style="padding:10px 0;border-bottom:1px solid ${C.bordClair};font-family:${POLICE};">
      <p style="margin:0;font-size:15px;font-weight:700;color:${C.brun};">${a.nom}</p>
      ${a.detail ? `<p style="margin:2px 0 0;font-size:13px;color:${C.gris};">${a.detail}</p>` : ''}
      ${a.badge ? `<p style="margin:4px 0 0;"><span style="display:inline-block;padding:2px 8px;border-radius:99px;background:${C.vertPale};color:${C.vert};font-size:12px;font-weight:800;">${a.badge}</span></p>` : ''}
    </td>
    <td valign="middle" align="right" style="padding:10px 0 10px 12px;border-bottom:1px solid ${C.bordClair};font-family:${POLICE};font-size:15px;font-weight:700;color:${C.brun};white-space:nowrap;">${a.montant}</td>
  </tr>`;
}

export function tableauArticles(lignes: string[]): string {
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0">${lignes.join('')}</table>`;
}

export function totaux(lignes: { libelle: string; montant: string; vert?: boolean }[], total: { libelle: string; montant: string }): string {
  const l = lignes.map((t) => `<tr>
      <td style="padding:5px 0;font-family:${POLICE};font-size:15px;color:${t.vert ? C.vert : C.brunMoyen};${t.vert ? 'font-weight:700;' : ''}">${t.libelle}</td>
      <td align="right" style="padding:5px 0;font-family:${POLICE};font-size:15px;color:${t.vert ? C.vert : C.brunMoyen};${t.vert ? 'font-weight:700;' : ''}white-space:nowrap;">${t.montant}</td>
    </tr>`).join('');
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-top:14px;">${l}</table>
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-top:8px;"><tr>
    <td style="padding:14px 18px;background:${C.brun};border-radius:14px 0 0 14px;font-family:${POLICE};font-size:15px;font-weight:700;color:#FFFFFF;">${total.libelle}</td>
    <td align="right" style="padding:14px 18px;background:${C.brun};border-radius:0 14px 14px 0;font-family:${SERIF};font-size:26px;color:#FFFFFF;white-space:nowrap;">${total.montant}</td>
  </tr></table>`;
}

export function bouton(texte: string, lien: string, style: 'orange' | 'brun' | 'contour' = 'orange', marge = '26px 0 0'): string {
  const fond = style === 'orange' ? C.orange : style === 'brun' ? C.brun : '#FFFFFF';
  const couleur = style === 'contour' ? C.brun : '#FFFFFF';
  const bord = style === 'contour' ? `border:2px solid ${C.brun};` : `border:2px solid ${fond};`;
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:${marge};"><tr>
    <td align="center" style="border-radius:14px;background:${fond};${bord}">
      <a href="${echapper(lien)}" style="display:block;padding:15px 20px;font-family:${POLICE};font-size:16px;font-weight:800;color:${couleur};text-decoration:none;border-radius:14px;">${texte}</a>
    </td>
  </tr></table>`;
}

export function encadre(html: string, options: { fond?: string; bord?: string; marge?: string } = {}): string {
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:${options.marge || '24px 0 0'};"><tr>
    <td style="padding:16px 18px;border-radius:14px;background:${options.fond || '#FFFFFF'};border:1px solid ${options.bord || C.bord};font-family:${POLICE};font-size:14px;line-height:1.55;color:${C.brunMoyen};">${html}</td>
  </tr></table>`;
}

// --- Page complète ---------------------------------------------------------

export function coquille(o: {
  titre: string;            // <title>, pour les messageries qui l'affichent
  preheader?: string;       // texte d'aperçu affiché après l'objet
  enTete?: string;          // remplace l'en-tête avec logo (e-mail interne)
  reference?: string;       // texte à droite du logo
  banniere?: string | null; // image pleine largeur sous l'en-tête
  contenu: string;
  pied: string;
}): string {
  const logo = `${urlSite()}/email/logo.png`;
  const enTete = o.enTete ?? `<tr><td style="padding:20px 32px;border-bottom:1px solid ${C.bordClair};">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr>
        <td valign="middle"><a href="${urlSite()}" style="text-decoration:none;"><img src="${logo}" width="200" height="38" alt="Soleil et Saveurs" style="display:block;width:200px;height:38px;border:0;"></a></td>
        ${o.reference ? `<td valign="middle" align="right" style="font-family:${POLICE};font-size:13px;font-weight:700;color:${C.gris};white-space:nowrap;">${o.reference}</td>` : ''}
      </tr></table>
    </td></tr>`;
  return `<!DOCTYPE html>
<html lang="fr">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="color-scheme" content="light">
<title>${echapper(o.titre)}</title>
</head>
<body style="margin:0;padding:0;background:${C.fond};">
${o.preheader ? `<div style="display:none;max-height:0;overflow:hidden;opacity:0;">${echapper(o.preheader)}&#847;&zwnj;&nbsp;&#847;&zwnj;&nbsp;&#847;&zwnj;&nbsp;</div>` : ''}
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${C.fond};">
<tr><td align="center" style="padding:24px 12px;">
  <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="width:100%;max-width:600px;background:${C.carte};border-radius:16px;border:1px solid ${C.bord};overflow:hidden;">
    ${enTete}
    ${o.banniere ? `<tr><td><img src="${echapper(o.banniere)}" width="600" alt="" style="display:block;width:100%;max-width:600px;height:auto;border:0;"></td></tr>` : ''}
    <tr><td style="padding:28px 32px 8px;">${o.contenu}</td></tr>
    <tr><td style="padding:20px 32px 24px;background:${C.creme};font-family:${POLICE};font-size:12px;line-height:1.6;color:${C.gris};">${o.pied}</td></tr>
  </table>
</td></tr>
</table>
</body>
</html>`;
}

export function piedTransactionnel(): string {
  return `<strong style="color:${C.brun};">Soleil et Saveurs</strong> — fruits et légumes frais livrés dans les Yvelines.<br>${VENDEUR_PIED}<br>Vous recevez cet e-mail suite à votre commande sur soleiletsaveurs.fr.`;
}
