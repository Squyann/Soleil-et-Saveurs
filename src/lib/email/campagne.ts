// Campagnes e-mail : blocs de contenu, nettoyage du texte mis en forme et
// rendu HTML (même rendu pour l'aperçu de l'éditeur, le test et l'envoi).
import { formatPrix } from '@/lib/format';
import { bouton, COULEURS as C, coquille, echapper, VENDEUR_PIED } from './gabarit';

export type Alignement = 'gauche' | 'centre';

export type Bloc =
  | { id: string; type: 'titre'; texte: string; alignement?: Alignement }
  | { id: string; type: 'texte'; html: string; alignement?: Alignement }
  | { id: string; type: 'image'; url: string; alt?: string; lien?: string }
  | { id: string; type: 'bouton'; texte: string; lien: string; couleur?: 'orange' | 'brun' }
  | { id: string; type: 'code'; code: string; legende?: string }
  | { id: string; type: 'produits'; ids: string[] }
  | { id: string; type: 'separateur' }
  | { id: string; type: 'espace'; hauteur?: number };

export interface ProduitMail { id: string; nom: string; prix: string; image: string | null; lien: string }

export interface CampagneMail {
  id?: string;
  objet: string;
  apercu: string;
  type: 'offre' | 'info';
  blocs: Bloc[];
}

export interface DestinataireMail { email: string; prenom?: string | null; jeton?: string | null }

// Couleurs autorisées dans le texte (palette du site)
export const COULEURS_TEXTE: { nom: string; valeur: string }[] = [
  { nom: 'Brun', valeur: '#3D2B1F' },
  { nom: 'Brun doux', valeur: '#5C4030' },
  { nom: 'Orange', valeur: '#C73600' },
  { nom: 'Vert', valeur: '#166534' },
];

const POLICE = "-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif";

function lienSur(url: string): string | null {
  const u = String(url || '').trim();
  if (/^(https:\/\/|mailto:|tel:)/i.test(u)) return u;
  if (u.startsWith('/')) return u;
  return null;
}

// Texte mis en forme de l'éditeur → HTML sûr. Seules les balises gras,
// italique, souligné, lien (https, mailto, tel) et couleur de la palette sont
// gardées ; tout le reste est retiré. Fonctionne côté navigateur et serveur.
export function nettoyerTexte(html: string): string {
  const couleurs = new Set(COULEURS_TEXTE.map((c) => c.valeur.toLowerCase()));
  const sortie: string[] = [];
  const pile: string[] = [];
  const source = String(html || '')
    .replace(/<(script|style)[\s\S]*?<\/\1>/gi, '')
    .replace(/<!--[\s\S]*?-->/g, '')
    .replace(/<\/(p|div)>\s*<(p|div)[^>]*>/gi, '<br>')
    .replace(/<(p|div)[^>]*>/gi, '<br>')
    .replace(/<\/(p|div)>/gi, '');
  const re = /<\/?([a-zA-Z0-9]+)([^>]*)>|([^<]+)/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(source))) {
    if (m[3] != null) { sortie.push(m[3].replace(/>/g, '&gt;')); continue; }
    const fermante = m[0].startsWith('</');
    let nom = m[1].toLowerCase();
    if (nom === 'strong') nom = 'b';
    if (nom === 'em') nom = 'i';
    if (nom === 'br') { if (!fermante) sortie.push('<br>'); continue; }
    if (!['b', 'i', 'u', 'a', 'span', 'font'].includes(nom)) continue;
    if (nom === 'font') nom = 'span';
    if (fermante) {
      const i = pile.lastIndexOf(nom);
      if (i >= 0) { while (pile.length > i) sortie.push(`</${pile.pop()}>`); }
      continue;
    }
    const attrs = m[2] || '';
    if (nom === 'a') {
      const href = /href\s*=\s*"([^"]*)"|href\s*=\s*'([^']*)'/i.exec(attrs);
      const sur = href ? lienSur((href[1] ?? href[2] ?? '').replace(/&amp;/g, '&')) : null;
      if (!sur) continue;
      sortie.push(`<a href="${echapper(sur)}">`);
    } else if (nom === 'span') {
      const c = (/color\s*:\s*(#[0-9a-f]{6})/i.exec(attrs) || /color\s*=\s*"?(#[0-9a-f]{6})/i.exec(attrs) || [])[1]?.toLowerCase();
      const rgb = /color\s*:\s*rgb\((\d+),\s*(\d+),\s*(\d+)\)/i.exec(attrs);
      const hex = c || (rgb ? `#${[rgb[1], rgb[2], rgb[3]].map((x) => Number(x).toString(16).padStart(2, '0')).join('')}` : null);
      if (!hex || !couleurs.has(hex)) continue;
      sortie.push(`<span style="color:${hex}">`);
    } else {
      sortie.push(`<${nom}>`);
    }
    pile.push(nom);
  }
  while (pile.length) sortie.push(`</${pile.pop()}>`);
  return sortie.join('').replace(/(<br>\s*){3,}/g, '<br><br>').replace(/^(\s*<br>)+/, '').replace(/(<br>\s*)+$/, '').trim();
}

// « Bonjour {prenom}, » → « Bonjour Camille, » ou « Bonjour, »
function personnaliser(html: string, prenom: string | null | undefined): string {
  const p = (prenom || '').trim();
  return html.replace(/\s*\{prenom\}/g, p ? ` ${echapper(p)}` : '');
}

function absolu(url: string, site: string): string {
  return url.startsWith('/') ? `${site}${url}` : url;
}

function rendreBloc(b: Bloc, produits: Map<string, ProduitMail>, site: string, prenom?: string | null): string {
  const align = (a?: Alignement) => (a === 'centre' ? 'center' : 'left');
  switch (b.type) {
    case 'titre':
      return `<h1 style="margin:0 0 4px;font-family:Georgia,'Times New Roman',serif;font-weight:400;font-size:30px;line-height:1.18;color:${C.brun};text-align:${align(b.alignement)};">${personnaliser(echapper(b.texte), prenom)}</h1>`;
    case 'texte': {
      const html = personnaliser(nettoyerTexte(b.html), prenom)
        .replace(/<a href="([^"]*)">/g, (_, h) => `<a href="${absolu(h.replace(/&amp;/g, '&'), site).replace(/"/g, '&quot;')}" style="color:${C.orangeTexte};font-weight:700;">`)
        .replace(/<b>/g, `<b style="color:${C.brun};">`);
      return `<p style="margin:12px 0 0;font-family:${POLICE};font-size:16px;line-height:1.6;color:${C.brunMoyen};text-align:${align(b.alignement)};">${html}</p>`;
    }
    case 'image': {
      if (!/^https:\/\//.test(b.url) && !b.url.startsWith('/')) return '';
      const img = `<img src="${echapper(absolu(b.url, site))}" width="536" alt="${echapper(b.alt || '')}" style="display:block;width:100%;max-width:536px;height:auto;border:0;border-radius:14px;">`;
      const lien = b.lien ? lienSur(b.lien) : null;
      return `<div style="margin:18px 0 0;">${lien ? `<a href="${echapper(absolu(lien, site))}">${img}</a>` : img}</div>`;
    }
    case 'bouton': {
      const lien = lienSur(b.lien);
      if (!lien || !b.texte.trim()) return '';
      return bouton(echapper(b.texte), absolu(lien, site), b.couleur === 'brun' ? 'brun' : 'orange', '24px 0 0');
    }
    case 'code':
      if (!b.code.trim()) return '';
      return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:22px 0 0;"><tr>
        <td align="center" style="padding:20px;border-radius:16px;border:2px dashed ${C.orange};background:${C.orangePale};font-family:${POLICE};">
          <p style="margin:0;font-size:12px;font-weight:800;letter-spacing:1.3px;text-transform:uppercase;color:${C.orangeTexte};">Votre code</p>
          <p style="margin:6px 0 0;font-size:30px;font-weight:800;letter-spacing:4px;color:${C.brun};">${echapper(b.code.toUpperCase())}</p>
          ${b.legende ? `<p style="margin:6px 0 0;font-size:13px;color:${C.brunMoyen};">${echapper(b.legende)}</p>` : ''}
        </td></tr></table>`;
    case 'produits': {
      const liste = b.ids.map((id) => produits.get(id)).filter((p): p is ProduitMail => Boolean(p));
      if (!liste.length) return '';
      const cellule = (p: ProduitMail) => `<td width="50%" valign="top" style="width:50%;padding:6px;">
        <a href="${echapper(absolu(p.lien, site))}" style="display:block;text-decoration:none;border:1px solid ${C.bordClair};border-radius:14px;overflow:hidden;">
          ${p.image ? `<img src="${echapper(absolu(p.image, site))}" width="256" alt="" style="display:block;width:100%;height:auto;border:0;">` : ''}
          <span style="display:block;padding:10px 12px;font-family:${POLICE};">
            <span style="display:block;font-size:15px;font-weight:700;color:${C.brun};">${echapper(p.nom)}</span>
            <span style="display:block;margin-top:2px;font-size:14px;font-weight:800;color:${C.orangeTexte};">${echapper(p.prix)}</span>
          </span>
        </a></td>`;
      const lignes: string[] = [];
      for (let i = 0; i < liste.length; i += 2) {
        lignes.push(`<tr>${cellule(liste[i])}${liste[i + 1] ? cellule(liste[i + 1]) : '<td width="50%" style="width:50%;"></td>'}</tr>`);
      }
      return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:16px -6px 0;width:calc(100% + 12px);">${lignes.join('')}</table>`;
    }
    case 'separateur':
      return `<div style="margin:24px 0 0;border-top:1px solid ${C.bord};font-size:0;line-height:0;">&nbsp;</div>`;
    case 'espace':
      return `<div style="height:${Math.min(Math.max(Number(b.hauteur) || 24, 8), 80)}px;font-size:0;line-height:0;">&nbsp;</div>`;
    default:
      return '';
  }
}

export function lienDesinscription(site: string, jeton: string, campagneId?: string): string {
  return `${site}/desinscription?j=${encodeURIComponent(jeton)}${campagneId ? `&c=${encodeURIComponent(campagneId)}` : ''}`;
}

export function rendreCampagne(c: CampagneMail, d: DestinataireMail, produits: ProduitMail[], site: string): { html: string; headers: Record<string, string> } {
  const carte = new Map(produits.map((p) => [p.id, p]));
  const contenu = c.blocs.map((b) => rendreBloc(b, carte, site, d.prenom)).join('');
  const headers: Record<string, string> = {};
  let mention: string;
  if (c.type === 'offre') {
    const lien = d.jeton ? lienDesinscription(site, d.jeton, c.id) : `${site}/compte`;
    mention = `Vous recevez cet e-mail car vous avez accepté de recevoir les offres de Soleil et Saveurs. <a href="${echapper(lien)}" style="color:${C.brun};font-weight:700;">Se désinscrire</a>`;
    if (d.jeton) {
      // Désinscription en un clic depuis la messagerie (Gmail, Yahoo…)
      headers['List-Unsubscribe'] = `<${site}/api/mail/desinscription?j=${encodeURIComponent(d.jeton)}${c.id ? `&c=${encodeURIComponent(c.id)}` : ''}>`;
      headers['List-Unsubscribe-Post'] = 'List-Unsubscribe=One-Click';
    }
  } else {
    mention = 'Message d’information sur le service, envoyé à tous les clients de Soleil et Saveurs. Il ne contient aucune offre commerciale.';
  }
  const pied = `${VENDEUR_PIED}.<br>${mention}`;
  return { html: coquille({ titre: c.objet, preheader: c.apercu, contenu, pied }), headers };
}

let compteur = 0;
export function nouvelId(): string {
  compteur += 1;
  return `b${Date.now().toString(36)}${compteur.toString(36)}${Math.random().toString(36).slice(2, 6)}`;
}

export function blocsDeDepart(): Bloc[] {
  return [
    { id: nouvelId(), type: 'titre', texte: 'Un titre qui donne envie' },
    { id: nouvelId(), type: 'texte', html: 'Bonjour {prenom},<br>Écrivez ici votre message.' },
    { id: nouvelId(), type: 'bouton', texte: 'Je fais mon panier', lien: '/commander', couleur: 'orange' },
  ];
}

// Produit du catalogue → carte affichée dans un bloc « Produits »
export function produitMail(p: { id: string; name: string; price: number; promotion?: number | null; unite?: string | null; image_url?: string | null }): ProduitMail {
  const pu = Number(p.price) * (1 - (Number(p.promotion) || 0) / 100);
  const unite = p.unite === 'g' || p.unite === 'kg' ? 'le kg' : `la ${p.unite || 'pièce'}`;
  return { id: String(p.id), nom: String(p.name).trim(), prix: `${formatPrix(pu)} ${unite}`, image: p.image_url || null, lien: '/commander' };
}
