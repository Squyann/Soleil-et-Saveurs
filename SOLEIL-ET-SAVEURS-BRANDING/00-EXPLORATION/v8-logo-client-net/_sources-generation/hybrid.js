// Logo client « hybride » : illustration d'origine (détourée, agrandie x4 par IA) + tous les textes en vectoriel net,
// calés au pixel près sur l'image fournie (repère = pixels de l'original, 1774 × 887).
// Usage : node hybrid.js <scratchpad> <dossier des images préparées> <résolution des images: 2x|4x>  → écrit hybrid-<res>.svg (+ index JSON)
const fs = require('fs');
const E = require('../concepts/engine.js');
const [, , S, IMG, RES = '2x'] = process.argv; E.setRoot(S);
const f = E.f;
const C = { vert: '#162E0E', orange: '#C94A08', creme: '#FBF4E2', or: '#E6A224' };
const nb = s => [...s].length;

// ---------- 1. Formes de texte à 100 px pour la mise à l'échelle ----------
const R = (font, text, axes = {}, extra = {}) => [{ font: E.FONT(font), axes, size: 100, text, tracking: 0, ...extra }];
const SPEC = {
  arc: ['Cinzel-normal', 'SOLEIL ET SAVEURS', { wght: 700 }, { glyphs: true }],
  band: ['Cinzel-normal', 'PRIMEUR DEPUIS 1999', { wght: 700 }],
  S: [process.env.SFONT || 'Playfair-normal', 'S', JSON.parse(process.env.SAXES || '{"wght":900}')],   // grande capitale : Playfair Display Black (la plus proche du S d'origine)
  oleil: ['Gloock-normal', 'oleil'], aveurs: ['Gloock-normal', 'aveurs'],
  et: ['Playfair-italic', 'et', { wght: +(process.env.ETW || 800) }],
  s1: ['Montserrat-normal', 'FRUITS & LÉGUMES FRAIS', { wght: 600 }], s2: ['Montserrat-normal', 'EN LIVRAISON', { wght: 600 }],
  script: [process.env.SCRIPT || 'Satisfy-normal-400', 'La fraîcheur au quotidien'],
};
const B = E.shapeAll(Object.fromEntries(Object.entries(SPEC).map(([k, a]) => [k, R(...a)])));
const ih = L => L.bbox[3] - L.bbox[1], iw = L => L.bbox[2] - L.bbox[0];
// taille d'après une hauteur d'encre, interlettrage d'après une largeur d'encre (linéaire en tracking)
function fit(k, inkH, inkWidth, sizeOverride) {
  const L = B[k]; const size = sizeOverride || 100 * inkH / ih(L);
  const w0 = iw(L) * size / 100; const n = nb(SPEC[k][1]);
  const tracking = inkWidth == null || n < 2 ? 0 : (inkWidth - w0) / (size * (n - 1));
  return { size, tracking };
}
const P = {
  arc: fit('arc', 54, 727), band: fit('band', 32, 583),
  S1: fit('S', 203), S2: fit('S', 195),
  et: fit('et', 141, 165), s2: fit('s2', 28.5, 407),
  script: { size: 100 * 708 / iw(B.script), tracking: 0 },   // écriture liée : pas d'interlettrage, corps réglé sur la largeur
};
// le S de Gloock est plus étroit que celui de l'original : le reste du mot suit le S (approche naturelle) et garde la même fin de ligne
const wS1 = iw(B.S) * P.S1.size / 100, wS2 = iw(B.S) * P.S2.size / 100;
const xO = 894 + wS1 + 9, xA = 894 + wS2 + 11;
P.oleil = fit('oleil', 202, 1512 - xO);
P.aveurs = fit('aveurs', null, 1740 - xA, P.oleil.size);
P.s1 = fit('s1', null, 735, P.s2.size);   // même corps que la 2e ligne (l'accent du É fausserait la hauteur)
const T = E.shapeAll(Object.fromEntries(Object.entries({ arc: 'arc', band: 'band', S1: 'S', oleil: 'oleil', S2: 'S', aveurs: 'aveurs', et: 'et', s1: 's1', s2: 's2', script: 'script' })
  .map(([k, s]) => { const [font, text, axes = {}, extra = {}] = SPEC[s]; return [k, [{ font: E.FONT(font), axes, size: P[k].size, text, tracking: P[k].tracking, ...extra }]]; })));
// place l'encre : (x, y) = coin haut-gauche, ou ancrage centré / ligne de base basse
const at = (L, x, y, fill) => `<path fill="${fill}" transform="translate(${f(x - L.bbox[0])} ${f(y - L.bbox[1])})" d="${L.d}"/>`;
const atBottom = (L, x, yBottom, fill) => at(L, x, yBottom - ih(L), fill);
const atCenter = (L, cx, yTop, fill) => at(L, cx - iw(L) / 2, yTop, fill);

// ---------- 2. Emblème ----------
const cx = 467.1, cy = 433.6;
const sparkle = (x, y, w, h) => { const k = 0.16; return `<path fill="url(#gStar)" d="M${f(x)} ${f(y - h / 2)} Q${f(x + w * k)} ${f(y - h * k)} ${f(x + w / 2)} ${f(y)} Q${f(x + w * k)} ${f(y + h * k)} ${f(x)} ${f(y + h / 2)} Q${f(x - w * k)} ${f(y + h * k)} ${f(x - w / 2)} ${f(y)} Q${f(x - w * k)} ${f(y - h * k)} ${f(x)} ${f(y - h / 2)}Z"/>`; };
const bannerCx = 475.5, gap = 24, dashW = 56;
const bandL = T.band;
const emb = `<image href="${IMG}/embleme@${RES}.png" x="0" y="0" width="893" height="887" preserveAspectRatio="none"/>
  ${E.arcText(T.arc, cx, cy, 302.5, 0, C.vert, 1)}
  ${sparkle(467.1 - 312.5, 370, 38, 43)}${sparkle(467.1 + 312.5, 370, 38, 43)}
  ${atBottom(bandL, bannerCx - iw(bandL) / 2, 741, C.creme)}
  <rect x="${f(bannerCx - iw(bandL) / 2 - gap - dashW)}" y="724.5" width="${dashW}" height="5" rx="2.5" fill="url(#gDash)"/>
  <rect x="${f(bannerCx + iw(bandL) / 2 + gap)}" y="724.5" width="${dashW}" height="5" rx="2.5" fill="url(#gDash)"/>`;

// ---------- 3. Logotype ----------
const axe = 1323;   // axe commun de l'ornement, du descripteur et de la signature
const S1 = T.S1, S2 = T.S2;
const logo = `<image href="${IMG}/decors@${RES}.png" x="893" y="0" width="881" height="887" preserveAspectRatio="none"/>
  ${at(S1, 894, 176, C.vert)}${at(T.oleil, xO, 178, C.vert)}
  ${at(S2, 894, 384, C.vert)}${atBottom(T.aveurs, xA, 563, C.vert)}
  ${at(T.et, 1540, 238, C.orange)}
  ${E.line(T.s1, axe, 687, C.vert, 'middle')}${E.line(T.s2, axe, 736, C.vert, 'middle')}
  ${E.line(T.script, axe, +(process.env.SCRIPT_BASE || 818), C.vert, 'middle')}`;

const defs = `<defs><linearGradient id="gStar" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#F7C95A"/><stop offset="1" stop-color="#D88E1C"/></linearGradient>
  <linearGradient id="gDash" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#C9861A"/><stop offset=".5" stop-color="#F2C04E"/><stop offset="1" stop-color="#C9861A"/></linearGradient></defs>`;
const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1774 887" width="1774" height="887">${defs}<g id="embleme">${emb}</g><g id="logotype">${logo}</g></svg>`;
fs.writeFileSync(`${S}/work/hybrid/hybrid-${RES}.svg`, svg);
fs.writeFileSync(`${S}/work/hybrid/hybrid-params.json`, JSON.stringify(Object.fromEntries(Object.entries(P).map(([k, v]) => [k, { size: f(v.size), tracking: +v.tracking.toFixed(4) }])), null, 1));
console.log(JSON.stringify(Object.fromEntries(Object.entries(P).map(([k, v]) => [k, [f(v.size), +v.tracking.toFixed(3)]]))));
