// Piste B « L'Horizon gourmand » : six variantes enrichies du symbole (repère 100 x 120, arche 14→86)
const f = n => +(+n).toFixed(2);
let n = 0; const uid = p => `${p}${++n}`;
const ARCH = 'M14 116 V52 A36 36 0 0 1 86 52 V116 Z';
const K = { olive: '#2F4A2B', oliveDeep: '#22371F', leek: '#3F6B33', sage: '#6F8A50', sageD: '#5E7843', sageL: '#9DB07A', sageLL: '#B9C79A', terra: '#C2602D', brick: '#A94E25', terraL: '#D27A43', halo1: '#CB6C35', halo2: '#D7803F', saffron: '#ECAD44', honey: '#F2C46B', lin: '#F3E8D6', tomato: '#B83A26', pear: '#B3B65A', cabbage: '#4C7A3A', plum: '#6B3555', lemon: '#E7C04A', apricot: '#EE9B3C' };

// Offsets d'une courbe (copies translatées) découpées dans une forme → sillons
const furrows = (d, clip, from, to, step, col, w) => { const id = uid('fu'); let s = `<defs><clipPath id="${id}"><path d="${clip}"/></clipPath></defs><g clip-path="url(#${id})" fill="none" stroke="${col}" stroke-width="${w}" stroke-linecap="round">`; for (let y = from; y <= to; y += step) s += `<path d="${d}" transform="translate(0 ${f(y)})"/>`; return s + '</g>'; };
const inArch = (inner, arch = ARCH) => { const id = uid('ar'); return `<defs><clipPath id="${id}"><path d="${arch}"/></clipPath></defs><g clip-path="url(#${id})">${inner}</g>`; };
const leaf = (x, y, s, col, rot = 0) => `<path d="M0 0 C1.4 -5.6 6.8 -9.4 13.6 -8.6 C11.8 -2.4 6.2 1 0 0Z" fill="${col}" transform="translate(${f(x)} ${f(y)}) rotate(${rot}) scale(${f(s)})"/>`;

// Étal de premier plan : poireaux, chou, tomate, poire (réutilisé par B1, B5, B6)
function etal(c = K, dy = 0) {
  return `<g transform="translate(0 ${dy})">
    <path d="M23.4 106 C21.4 96 18.4 88 15.6 77.6 C20.4 85.6 24 95 25.6 106Z" fill="${c.leek}"/>
    <path d="M26.2 106 C25.6 94 26.2 85.6 27.8 73.6 C29.8 85.6 29.4 96 28.8 106Z" fill="#4E7D3B"/>
    <path d="M30.2 106 C31.6 97 34.2 90 38.8 81.8 C36.8 91 34.4 99 32.8 106Z" fill="${c.leek}"/>
    <circle cx="42" cy="101.4" r="9.6" fill="${c.cabbage}"/>
    <path d="M42 92.4 C40.2 96.6 40.2 104.4 42 110.6 M42 98.4 C38.2 98.2 35.4 100 33.8 103 M42 98.4 C45.8 98.2 48.6 100 50.2 103 M42 104 C39.6 104 37.4 105.4 36 107.6 M42 104 C44.4 104 46.6 105.4 48 107.6" fill="none" stroke="#7BA35F" stroke-width="0.95" stroke-linecap="round"/>
    <circle cx="58.6" cy="102.8" r="8.6" fill="${c.tomato}"/><ellipse cx="55.4" cy="99.6" rx="2" ry="1.3" fill="#fff" opacity=".28" transform="rotate(-30 55.4 99.6)"/>
    <path d="M58.6 95.6 l1.6 -2.6 l0.4 2.8 l2.8 -0.6 l-2 2 l2.4 1.4 l-2.8 0.2 l-0.4 2.6 l-2 -2 l-2 2 l-0.4 -2.6 l-2.8 -0.2 l2.4 -1.4 l-2 -2 l2.8 0.6 l0.4 -2.8z" fill="#3F6B33"/>
    <path d="M75.4 84.6 C78.4 84.6 79.8 87.4 79.8 90.2 C79.8 92.8 82.8 95.2 83.8 99.2 C85.2 105.2 81.2 110.4 75.4 110.4 C69.6 110.4 65.6 105.2 67 99.2 C68 95.2 71 92.8 71 90.2 C71 87.4 72.4 84.6 75.4 84.6Z" fill="${c.pear}"/>
    <ellipse cx="72.6" cy="99" rx="1.6" ry="3.4" fill="#fff" opacity=".22"/>
    <path d="M75.4 85 C75.4 82 76.4 80 78.4 78.8" fill="none" stroke="${c.oliveDeep}" stroke-width="1.4" stroke-linecap="round"/>${leaf(76.8, 80.6, 0.55, '#4E7D3B', -12)}
    <path d="M8 107.5 C30 104.5 70 104.5 92 107.5 V122 H8Z" fill="${c.olive}"/>
  </g>`;
}

// B1 — Le Potager au lever du jour
function B1() {
  const far = 'M10 86 C22 78.4 34 80 44 84 C54 88 64 79.4 76 78.4 C84 77.8 88 80 92 82';
  const mid = 'M8 95.6 C26 88.8 40 90 52 94 C64 98 76 92 92 90';
  return inArch(`<rect x="0" y="0" width="100" height="120" fill="${K.terra}"/>
    <circle cx="50" cy="76" r="33" fill="${K.halo1}"/><circle cx="50" cy="76" r="26.4" fill="${K.halo2}"/><circle cx="50" cy="76" r="18.6" fill="${K.saffron}"/>
    <path d="${far} V122 H10Z" fill="${K.sageL}"/>${furrows(far, `${far} V122 H10Z`, 3.4, 14, 3.4, '#8DA26C', 0.8)}
    <path d="${mid} V122 H8Z" fill="${K.sage}"/>${furrows(mid, `${mid} V122 H8Z`, 3, 16, 3, K.sageD, 1)}
    ${etal()}`);
}

// B2 — Les Sillons
function B2() {
  let wedges = ''; for (let i = 0; i < 12; i++) { const a0 = 180 + i * 15, a1 = a0 + 7.5, r = 60; const p = a => [50 + r * Math.cos(a * Math.PI / 180), 82 + r * Math.sin(a * Math.PI / 180)]; const [x0, y0] = p(a0), [x1, y1] = p(a1); wedges += `<path d="M50 82 L${f(x0)} ${f(y0)} L${f(x1)} ${f(y1)}Z"/>`; }
  const back = 'M6 90 C22 79 40 77.6 56 85.6 C66 90.6 78 83.6 94 81.6', front = 'M6 99.4 C20 93.4 34 91.6 48 97.6 C60 102.6 74 99.6 94 93.6';
  return inArch(`<rect x="0" y="0" width="100" height="120" fill="${K.terra}"/><g fill="${K.halo1}">${wedges}</g>
    <circle cx="50" cy="82" r="19" fill="${K.saffron}"/>
    <path d="${back} V122 H6Z" fill="${K.sageL}"/>${furrows(back, `${back} V122 H6Z`, 3, 24, 3, K.sage, 1.1)}
    <path d="M71.6 83.6 L71.6 79" stroke="${K.oliveDeep}" stroke-width="1.2"/><circle cx="71.6" cy="76.2" r="3.8" fill="${K.olive}"/><path d="M79.6 82.2 L79.6 78.6" stroke="${K.oliveDeep}" stroke-width="1"/><circle cx="79.6" cy="76.4" r="3" fill="${K.olive}"/>
    <path d="${front} V122 H6Z" fill="${K.olive}"/>${furrows(front, `${front} V122 H6Z`, 3.4, 26, 3.4, '#43663A', 1.3)}
    <circle cx="27" cy="104.6" r="11.4" fill="${K.tomato}"/><ellipse cx="22.8" cy="100.6" rx="2.6" ry="1.6" fill="#fff" opacity=".28" transform="rotate(-30 22.8 100.6)"/>
    <path d="M27 93.6 C27 89.6 28.4 87 31 85.6" fill="none" stroke="${K.oliveDeep}" stroke-width="1.6" stroke-linecap="round"/>${leaf(28.6, 88.4, 0.72, '#4E7D3B', -8)}`);
}

// B3 — La Gravure (une encre + soleil safran)
function B3(ink = K.olive, paper = K.lin, sun = K.saffron) {
  const hH = uid('hh'), hD = uid('hd'), hX = uid('hx');
  const back = 'M10 88 C24 78 40 77 54 84 C64 89 76 82 92 80', front = 'M8 98 C22 92 36 90 50 96 C62 101 76 98 92 92';
  let rays = ''; for (let a = 186; a <= 354; a += 7) { const r0 = 22.5, r1 = a % 14 === 4 ? 36 : 31; const c = Math.cos(a * Math.PI / 180), s = Math.sin(a * Math.PI / 180); rays += `<line x1="${f(50 + r0 * c)}" y1="${f(78 + r0 * s)}" x2="${f(50 + r1 * c)}" y2="${f(78 + r1 * s)}"/>`; }
  return `<defs>
      <pattern id="${hH}" width="4" height="2.4" patternUnits="userSpaceOnUse"><line x1="0" y1="1.2" x2="4" y2="1.2" stroke="${ink}" stroke-width="0.42"/></pattern>
      <pattern id="${hD}" width="2.2" height="2.2" patternUnits="userSpaceOnUse" patternTransform="rotate(40)"><line x1="0" y1="1.1" x2="2.2" y2="1.1" stroke="${ink}" stroke-width="0.7"/></pattern>
      <pattern id="${hX}" width="2" height="2" patternUnits="userSpaceOnUse" patternTransform="rotate(-35)"><line x1="0" y1="1" x2="2" y2="1" stroke="${ink}" stroke-width="0.55"/></pattern></defs>
    ${inArch(`<rect x="0" y="0" width="100" height="120" fill="${paper}"/><rect x="0" y="0" width="100" height="120" fill="url(#${hH})" opacity=".55"/>
      <circle cx="50" cy="78" r="19.5" fill="${paper}"/><g stroke="${ink}" stroke-width="0.8" stroke-linecap="round">${rays}</g>
      <circle cx="50" cy="78" r="17.5" fill="${sun}" stroke="${ink}" stroke-width="1"/>
      <path d="${back} V122 H10Z" fill="${paper}"/><path d="${back} V122 H10Z" fill="url(#${hD})" opacity=".55"/><path d="${back}" fill="none" stroke="${ink}" stroke-width="1.1"/>
      <path d="${front} V122 H8Z" fill="${paper}"/><path d="${front} V122 H8Z" fill="url(#${hD})"/><path d="${front} V122 H8Z" fill="url(#${hX})" opacity=".7"/><path d="${front}" fill="none" stroke="${ink}" stroke-width="1.3"/>
      <g stroke="${ink}" stroke-width="1.1" stroke-linejoin="round">
        <path d="M72.6 84 C75.6 84 77 86.8 77 89.6 C77 92.2 80 94.6 81 98.6 C82.4 104.6 78.4 109.8 72.6 109.8 C66.8 109.8 62.8 104.6 64.2 98.6 C65.2 94.6 68.2 92.2 68.2 89.6 C68.2 86.8 69.6 84 72.6 84Z" fill="${paper}"/></g>
      <path d="M76 92 C79 95 81 99 80.6 103 C80 107 77 109 73.6 109.4 C77 106 78 99 76 92Z" fill="url(#${hX})"/>
      <path d="M72.6 84.4 C72.6 81.4 73.6 79.4 75.6 78.2" fill="none" stroke="${ink}" stroke-width="1.3" stroke-linecap="round"/>${leaf(74, 80.2, 0.55, ink, -12)}
      <circle cx="30" cy="104" r="10.6" fill="${paper}" stroke="${ink}" stroke-width="1.1"/><path d="M33 95 C38 98 40 104 38 109 C36 112.6 32 114.4 28 114.4 C34 110 36 102 33 95Z" fill="url(#${hX})"/>
      <path d="M30 93.6 C30 90 31.4 87.6 33.8 86.4" fill="none" stroke="${ink}" stroke-width="1.3" stroke-linecap="round"/>${leaf(31.6, 88.6, 0.62, ink, -6)}`)}
    <path d="${ARCH}" fill="none" stroke="${ink}" stroke-width="2.4"/><path d="M17.6 116 V52 A32.4 32.4 0 0 1 82.4 52 V116" fill="none" stroke="${ink}" stroke-width="0.7"/>`;
}

// B4 — La Fenêtre des Halles : vitrail en éventail (les meneaux sont des rayons) au-dessus de l'étal
function B4() {
  const W = 'M17.8 112.4 V52 A32.2 32.2 0 0 1 82.2 52 V112.4 Z';
  let panes = '', bars = '';
  const cx = 50, cy = 80.6;
  for (let i = 0; i < 9; i++) { const a0 = 180 + i * 20, a1 = a0 + 20, r = 70; const p = a => [cx + r * Math.cos(a * Math.PI / 180), cy + r * Math.sin(a * Math.PI / 180)]; const [x0, y0] = p(a0), [x1, y1] = p(a1); panes += `<path d="M${cx} ${cy} L${f(x0)} ${f(y0)} L${f(x1)} ${f(y1)}Z" fill="${i % 2 ? K.terra : '#CF7038'}"/>`; }
  for (let i = 1; i < 9; i++) { const a = (180 + i * 20) * Math.PI / 180; bars += `<line x1="${f(cx + 13.4 * Math.cos(a))}" y1="${f(cy + 13.4 * Math.sin(a))}" x2="${f(cx + 70 * Math.cos(a))}" y2="${f(cy + 70 * Math.sin(a))}"/>`; }
  const fr = (x, y, r, c, hl = true) => `<circle cx="${x}" cy="${y}" r="${r}" fill="${c}"/>${hl ? `<circle cx="${f(x - r * 0.35)}" cy="${f(y - r * 0.38)}" r="${f(r * 0.24)}" fill="#fff" opacity=".25"/>` : ''}`;
  const lower = `<rect x="0" y="82" width="100" height="40" fill="${K.oliveDeep}"/>
    ${fr(26, 95.4, 5.6, K.apricot)}${fr(37.4, 94.4, 5.8, K.tomato)}${fr(49.4, 95.2, 5.6, K.pear)}${fr(61.2, 94.4, 5.8, K.plum)}${fr(73.4, 95.6, 5.6, K.lemon)}
    ${fr(20.6, 102, 5.6, K.tomato)}${fr(31.6, 101.4, 5.8, K.lemon)}${fr(43.2, 101.8, 5.8, K.apricot)}${fr(55, 101.4, 5.8, K.tomato)}${fr(66.8, 101.8, 5.8, K.pear)}${fr(78.6, 102, 5.6, K.apricot)}
    <path d="M37.4 88.6 l1 -1.6 l0.3 1.7 l1.7 -0.3 l-1.2 1.2" fill="#3F6B33"/><path d="M61.4 88.6 C61.6 86.6 62.6 85.6 64 85" stroke="${K.oliveDeep}" stroke-width="0.9" fill="none"/>
    <rect x="14" y="104.6" width="72" height="4" fill="#E2CDA2"/><rect x="14" y="109.8" width="72" height="4" fill="#D8BF8E"/>`;
  return `<path d="${ARCH}" fill="${K.olive}"/>
    ${inArch(`${panes}<circle cx="${cx}" cy="${cy}" r="13.4" fill="${K.saffron}"/><g stroke="${K.olive}" stroke-width="1.7" stroke-linecap="butt">${bars}</g>
      <circle cx="${cx}" cy="${cy}" r="13.4" fill="none" stroke="${K.olive}" stroke-width="1.5"/>${lower}`, W)}
    <rect x="17.8" y="80.6" width="64.4" height="2.8" fill="${K.olive}"/>
    <path d="M46.6 15 H53.4 L52.4 22.4 H47.6Z" fill="${K.olive}"/><path d="M47.8 16.4 H52.2 L51.6 20.8 H48.4Z" fill="${K.saffron}"/>
    <path d="M${f(17.8)} 112.4 H${f(82.2)}" stroke="${K.olive}" stroke-width="1.6"/>`;
}

// B6 — Papier découpé : couches superposées avec ombres portées
function B6() {
  const sh = uid('sh');
  const L = (d, c) => `<path d="${d}" fill="${c}" filter="url(#${sh})"/>`;
  return `<defs><filter id="${sh}" x="-20%" y="-20%" width="140%" height="140%"><feDropShadow dx="0" dy="-0.9" stdDeviation="1.1" flood-color="#3a1d0c" flood-opacity=".38"/></filter></defs>
    ${inArch(`<rect x="0" y="0" width="100" height="120" fill="${K.brick}"/>
      <circle cx="50" cy="80" r="40" fill="${K.terra}" filter="url(#${sh})"/><circle cx="50" cy="80" r="31" fill="${K.halo2}" filter="url(#${sh})"/><circle cx="50" cy="80" r="21" fill="${K.saffron}" filter="url(#${sh})"/>
      ${L('M4 86 C14 80 22 79 30 82 C40 86 46 78 58 78.6 C70 79 78 86 96 82 V122 H4Z', K.sageLL)}
      ${L('M4 93 C16 87 28 88 38 91.6 C50 96 60 88 72 88.6 C82 89 88 92 96 90.6 V122 H4Z', K.sageL)}
      ${L('M4 100 C18 95 30 96.4 42 99.6 C56 103.4 66 96.4 80 97 C88 97.4 92 99 96 98.6 V122 H4Z', K.sage)}
      <g filter="url(#${sh})">${etal({ ...K, olive: K.olive }, 3)}</g>`)}`;
}

// B5 — L'Arche titrée : emblème avec le nom en arc
function B5(T, arcText, line) {
  const cx = 70, cy = 70, Ro = 56, Ri = 44.6, sc = 1.18;
  const bot = cy + (116 - 52) * sc;
  return `<path d="M${cx - Ro} ${f(bot + 21)} V${cy} A${Ro} ${Ro} 0 0 1 ${cx + Ro} ${cy} V${f(bot + 21)} Z" fill="${K.lin}" stroke="${K.olive}" stroke-width="2.6"/>
    ${arcText(T.arc, cx, cy, 46.6, 0, K.olive, 1)}
    <circle cx="${cx - 50.2}" cy="${cy + 3}" r="1.7" fill="${K.terra}"/><circle cx="${cx + 50.2}" cy="${cy + 3}" r="1.7" fill="${K.terra}"/>
    <g transform="translate(${f(cx - 50 * sc)} ${f(cy - 52 * sc)}) scale(${sc})">${B1()}<path d="${ARCH}" fill="none" stroke="${K.olive}" stroke-width="${f(1.4 / sc)}"/></g>
    <rect x="${cx - Ro}" y="${f(bot)}" width="${2 * Ro}" height="21" fill="${K.olive}"/>${line(T.band, cx, f(bot + 13.2), K.lin, 'middle')}`;
}

// Version simplifiée pour les petites tailles (≤ 32 px) : la piste B d'origine
function Bsimple() {
  return inArch(`<rect x="0" y="0" width="100" height="120" fill="${K.terra}"/><circle cx="52" cy="70" r="19" fill="${K.saffron}"/><circle cx="74" cy="101.5" r="22" fill="${K.sage}"/><circle cx="32" cy="109" r="28" fill="${K.olive}"/>`);
}

module.exports = { K, ARCH, B1, B2, B3, B4, B5, B6, Bsimple, etal };
