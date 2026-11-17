// LOGO VALIDÉ — Soleil et Saveurs : « L'Arche titrée », paysage en papier découpé, sans bandeau ; typographie T3
// Repère du paysage : 100 x 120 (arche x 14→86, sommet y 16, base y 116)
const { K, ARCH, etal } = require('../b2/variants.js');
const f = n => +(+n).toFixed(2);
// Tracés monochromes précalculés en vrai vectoriel (opérations booléennes, voir mono_paths.py)
const MP = require('./mono-paths.json');
let n = 0; const uid = p => `${p}${++n}`;
const HILLS = [
  'M4 86 C14 80 22 79 30 82 C40 86 46 78 58 78.6 C70 79 78 86 96 82 V122 H4Z',
  'M4 93 C16 87 28 88 38 91.6 C50 96 60 88 72 88.6 C82 89 88 92 96 90.6 V122 H4Z',
  'M4 100 C18 95 30 96.4 42 99.6 C56 103.4 66 96.4 80 97 C88 97.4 92 99 96 98.6 V122 H4Z',
];
const clipArch = inner => { const id = uid('ca'); return `<defs><clipPath id="${id}"><path d="${ARCH}"/></clipPath></defs><g clip-path="url(#${id})">${inner}</g>`; };

// Paysage : 'relief' (ombres portées, écran) | 'plat' (sans ombre, impression)
function scene(mode = 'relief') {
  const sh = uid('sh'); const F = mode === 'relief' ? ` filter="url(#${sh})"` : '';
  const defs = mode === 'relief' ? `<defs><filter id="${sh}" x="-20%" y="-20%" width="140%" height="140%" color-interpolation-filters="sRGB"><feDropShadow dx="0" dy="-0.9" stdDeviation="1.1" flood-color="#3a1d0c" flood-opacity=".38"/></filter></defs>` : '';
  return defs + clipArch(`<!-- ciel -->
    <rect x="0" y="0" width="100" height="120" fill="${K.brick}"/>
    <!-- halo et soleil -->
    <circle cx="50" cy="80" r="40" fill="${K.terra}"${F}/><circle cx="50" cy="80" r="31" fill="${K.halo2}"${F}/><circle cx="50" cy="80" r="21" fill="${K.saffron}"${F}/>
    <!-- collines -->
    <path d="${HILLS[0]}" fill="${K.sageLL}"${F}/><path d="${HILLS[1]}" fill="${K.sageL}"${F}/><path d="${HILLS[2]}" fill="${K.sage}"${F}/>
    <!-- étal : poireaux, chou, tomate, poire -->
    <g${F}>${etal(K, 3)}</g>`);
}

// Paysage en une couleur : les plans du papier découpé deviennent des filets en réserve (vraie transparence)
function sceneMono(ink) {
  return `<path d="${MP.mono}" fill="${ink}" fill-rule="${MP.monoRule}"/>`;
}
function sceneMonoMasque(ink) {
  const id = uid('mm'); const W = '#fff', B = '#000';
  const sep = 1.5;
  const et = `<g transform="translate(0 3)">
    <path d="M23.4 106 C21.4 96 18.4 88 15.6 77.6 C20.4 85.6 24 95 25.6 106Z M26.2 106 C25.6 94 26.2 85.6 27.8 73.6 C29.8 85.6 29.4 96 28.8 106Z M30.2 106 C31.6 97 34.2 90 38.8 81.8 C36.8 91 34.4 99 32.8 106Z" fill="${W}" stroke="${B}" stroke-width="1.1"/>
    <circle cx="42" cy="101.4" r="9.6" fill="${W}" stroke="${B}" stroke-width="${sep}"/>
    <path d="M42 92.4 C40.2 96.6 40.2 104.4 42 110.6 M42 98.4 C38.2 98.2 35.4 100 33.8 103 M42 98.4 C45.8 98.2 48.6 100 50.2 103" fill="none" stroke="${B}" stroke-width="1" stroke-linecap="round"/>
    <circle cx="58.6" cy="102.8" r="8.6" fill="${W}" stroke="${B}" stroke-width="${sep}"/>
    <path d="M58.6 95.6 l1.6 -2.6 l0.4 2.8 l2.8 -0.6 l-2 2 l2.4 1.4 l-2.8 0.2 l-0.4 2.6 l-2 -2 l-2 2 l-0.4 -2.6 l-2.8 -0.2 l2.4 -1.4 l-2 -2 l2.8 0.6 l0.4 -2.8z" fill="${B}"/>
    <path d="M75.4 84.6 C78.4 84.6 79.8 87.4 79.8 90.2 C79.8 92.8 82.8 95.2 83.8 99.2 C85.2 105.2 81.2 110.4 75.4 110.4 C69.6 110.4 65.6 105.2 67 99.2 C68 95.2 71 92.8 71 90.2 C71 87.4 72.4 84.6 75.4 84.6Z" fill="${W}" stroke="${B}" stroke-width="${sep}"/>
    <ellipse cx="72.6" cy="99" rx="1.4" ry="3.2" fill="${B}"/>
    <path d="M75.4 85 C75.4 82 76.4 80 78.4 78.8" fill="none" stroke="${W}" stroke-width="1.4" stroke-linecap="round"/>
    <path d="M0 0 C1.4 -5.6 6.8 -9.4 13.6 -8.6 C11.8 -2.4 6.2 1 0 0Z" fill="${W}" stroke="${B}" stroke-width="1.6" paint-order="stroke" transform="translate(76.8 80.6) rotate(-12) scale(0.55)"/>
    <path d="M8 107.5 C30 104.5 70 104.5 92 107.5 V122 H8Z" fill="${W}" stroke="${B}" stroke-width="${sep}"/></g>`;
  return `<defs><mask id="${id}" maskUnits="userSpaceOnUse" x="0" y="0" width="100" height="120">
      <path d="${ARCH}" fill="${W}"/>
      <circle cx="50" cy="80" r="40" fill="none" stroke="${B}" stroke-width="1.2"/><circle cx="50" cy="80" r="31" fill="none" stroke="${B}" stroke-width="1.2"/>
      <circle cx="50" cy="80" r="23.4" fill="${B}"/><circle cx="50" cy="80" r="21" fill="${W}"/>
      ${HILLS.map(d => `<path d="${d}" fill="${W}" stroke="${B}" stroke-width="${sep}"/>`).join('')}
      <path d="M4 96.6 C16 90.6 28 91.6 38 95.2 C50 99.6 60 91.6 72 92.2 C82 92.6 88 95.6 96 94.2" fill="none" stroke="${B}" stroke-width="0.7"/>
      ${et}</mask></defs>${clipArch(`<rect x="0" y="0" width="100" height="120" fill="${ink}" mask="url(#${id})"/>`)}`;
}

// Version simplifiée (favicon, < 40 px)
function sceneSimple() {
  return clipArch(`<rect x="0" y="0" width="100" height="120" fill="${K.brick}"/><circle cx="50" cy="80" r="36" fill="${K.terra}"/><circle cx="50" cy="80" r="22" fill="${K.saffron}"/>
    <path d="M4 92 C20 84 34 86 46 90 C60 95 72 85 96 86 V122 H4Z" fill="${K.sageL}"/><path d="M4 104 C24 97 44 98 58 102 C72 106 84 99 96 99 V122 H4Z" fill="${K.olive}"/>`);
}
function sceneSimpleMono(ink) {
  return `<path d="${MP.simple}" fill="${ink}" fill-rule="${MP.simpleRule}"/>`;
}
function sceneSimpleMonoMasque(ink) {
  const id = uid('sm');
  return `<defs><mask id="${id}" maskUnits="userSpaceOnUse" x="0" y="0" width="100" height="120"><path d="${ARCH}" fill="#fff"/><circle cx="50" cy="80" r="25.5" fill="#000"/><circle cx="50" cy="80" r="22" fill="#fff"/>
    <path d="M4 92 C20 84 34 86 46 90 C60 95 72 85 96 86 V122 H4Z" fill="#fff" stroke="#000" stroke-width="3"/><path d="M4 104 C24 97 44 98 58 102 C72 106 84 99 96 99 V122 H4Z" fill="#fff" stroke="#000" stroke-width="3"/></mask></defs>${clipArch(`<rect width="100" height="120" fill="${ink}" mask="url(#${id})"/>`)}`;
}

// Emblème « Arche titrée » sans bandeau. theme : couleur | sombre | noir | blanc ; mode : relief | plat
const EMB = { cx: 70, cy: 70, Ro: 56, sc: 1.18, bottomMargin: 8.6 };
function emblem(T, arcText, { theme = 'couleur', mode = 'relief' } = {}) {
  const { cx, cy, Ro, sc } = EMB; const bot = cy + (116 - 52) * sc + EMB.bottomMargin;
  const mono = theme === 'noir' || theme === 'blanc'; const ink = theme === 'noir' ? '#000000' : theme === 'blanc' ? '#FFFFFF' : null;
  const line = theme === 'sombre' ? K.lin : mono ? ink : K.olive;
  const fill = theme === 'couleur' ? K.lin : 'none';
  const inner = mono ? sceneMono(ink) : scene(mode);
  const dots = mono ? ink : K.terra;
  return `<!-- cadre de l'arche -->
    <path d="M${cx - Ro} ${f(bot)} V${cy} A${Ro} ${Ro} 0 0 1 ${cx + Ro} ${cy} V${f(bot)} Z" fill="${fill}" stroke="${line}" stroke-width="2.6"/>
    <!-- nom en arc -->
    ${arcText(T.arc, cx, cy, 46.6, 0, line, 1)}
    <circle cx="${cx - 50.2}" cy="${cy + 3}" r="1.7" fill="${dots}"/><circle cx="${cx + 50.2}" cy="${cy + 3}" r="1.7" fill="${dots}"/>
    <!-- paysage -->
    <g transform="translate(${f(cx - 50 * sc)} ${f(cy - 52 * sc)}) scale(${sc})">${inner}<path d="${ARCH}" fill="none" stroke="${line}" stroke-width="${f(1.4 / sc)}"/></g>`;
}
// Symbole seul (arche sans texte) avec son filet
function symbol({ theme = 'couleur', mode = 'relief', simple = false } = {}) {
  const mono = theme === 'noir' || theme === 'blanc'; const ink = theme === 'noir' ? '#000000' : theme === 'blanc' ? '#FFFFFF' : null;
  const inner = simple ? (mono ? sceneSimpleMono(ink) : sceneSimple()) : (mono ? sceneMono(ink) : scene(mode));
  return inner;
}
module.exports = { K, ARCH, EMB, scene, sceneMono, sceneSimple, emblem, symbol };
