// Illustration de marque « L'Horizon gourmand » : panorama du champ jusqu'à la porte
const { K } = require('./variants.js');
const f = n => +(+n).toFixed(2);
let n = 0; const uid = p => `${p}${++n}`;
const furrows = (d, clip, from, to, step, col, w) => { const id = uid('pf'); let s = `<defs><clipPath id="${id}"><path d="${clip}"/></clipPath></defs><g clip-path="url(#${id})" fill="none" stroke="${col}" stroke-width="${w}" stroke-linecap="round">`; for (let y = from; y <= to; y += step) s += `<path d="${d}" transform="translate(0 ${f(y)})"/>`; return s + '</g>'; };
const leafP = (x, y, s, col, rot = 0) => `<path d="M0 0 C1.4 -5.6 6.8 -9.4 13.6 -8.6 C11.8 -2.4 6.2 1 0 0Z" fill="${col}" transform="translate(${f(x)} ${f(y)}) rotate(${rot}) scale(${f(s)})"/>`;
const leeks = (x, y, s) => `<g transform="translate(${x} ${y}) scale(${s})">
  <path d="M-4 0 C-6 -10 -9 -18 -12 -28 C-7 -20 -3.4 -11 -2 0Z" fill="${K.leek}"/><path d="M-1 0 C-1.6 -12 -1 -20 0.6 -32 C2.6 -20 2.2 -10 1.6 0Z" fill="#4E7D3B"/>
  <path d="M3 0 C4.4 -9 7 -16 11.6 -24 C9.6 -15 7.2 -7 5.6 0Z" fill="${K.leek}"/><path d="M-2.8 0 C-3 -4 3.6 -4 3.4 0Z" fill="#E7DFC3"/></g>`;
const cabbage = (x, y, s) => `<g transform="translate(${x} ${y}) scale(${s})"><circle r="10" fill="${K.cabbage}"/><path d="M0 -9 C-1.8 -4.8 -1.8 3 0 9.4 M0 -3 C-3.8 -3.2 -6.6 -1.4 -8.2 1.6 M0 -3 C3.8 -3.2 6.6 -1.4 8.2 1.6 M0 2.6 C-2.4 2.6 -4.6 4 -6 6.2 M0 2.6 C2.4 2.6 4.6 4 6 6.2" fill="none" stroke="#7BA35F" stroke-width="0.95" stroke-linecap="round"/></g>`;
const tomato = (x, y, s) => `<g transform="translate(${x} ${y}) scale(${s})"><circle r="8.6" fill="${K.tomato}"/><ellipse cx="-3.2" cy="-3.2" rx="2" ry="1.3" fill="#fff" opacity=".28" transform="rotate(-30 -3.2 -3.2)"/>
  <path d="M0 -7.2 l1.6 -2.6 l0.4 2.8 l2.8 -0.6 l-2 2 l2.4 1.4 l-2.8 0.2 l-0.4 2.6 l-2 -2 l-2 2 l-0.4 -2.6 l-2.8 -0.2 l2.4 -1.4 l-2 -2 l2.8 0.6 l0.4 -2.8z" fill="#3F6B33"/></g>`;
const pear = (x, y, s) => `<g transform="translate(${x} ${y}) scale(${s})"><path d="M0 -26 C3 -26 4.4 -23.2 4.4 -20.4 C4.4 -17.8 7.4 -15.4 8.4 -11.4 C9.8 -5.4 5.8 -0.2 0 -0.2 C-5.8 -0.2 -9.8 -5.4 -8.4 -11.4 C-7.4 -15.4 -4.4 -17.8 -4.4 -20.4 C-4.4 -23.2 -3 -26 0 -26Z" fill="${K.pear}"/>
  <ellipse cx="-2.8" cy="-11.6" rx="1.6" ry="3.4" fill="#fff" opacity=".22"/><path d="M0 -25.6 C0 -28.6 1 -30.6 3 -31.8" fill="none" stroke="${K.oliveDeep}" stroke-width="1.4" stroke-linecap="round"/>${leafP(1.4, -30, 0.55, '#4E7D3B', -12)}</g>`;
const carrots = (x, y, s) => `<g transform="translate(${x} ${y}) scale(${s})">${[-5, 0, 5].map((dx, i) => `<path d="M${dx - 2.6} -2 C${dx - 2.4} 6 ${dx - 0.8} 13 ${dx} 18 C${dx + 0.8} 13 ${dx + 2.4} 6 ${dx + 2.6} -2Z" fill="${K.apricot}" transform="rotate(${(i - 1) * 9} ${dx} -2)"/>`).join('')}
  ${[-14, -6, 2, 10].map((a, i) => `<path d="M0 -2 C${a * 0.4 - 2} -10 ${a - 1} -18 ${a} -26 C${a * 0.6 + 2} -18 ${a * 0.2 + 2} -10 1.6 -2Z" fill="${i % 2 ? '#4E7D3B' : K.leek}"/>`).join('')}</g>`;
const tree = (x, y, r, c = K.olive) => `<path d="M${x} ${y} V${f(y - r * 1.3)}" stroke="${K.oliveDeep}" stroke-width="${f(r * 0.28)}"/><circle cx="${x}" cy="${f(y - r * 1.6)}" r="${r}" fill="${c}"/>`;
const van = (x, y, s) => `<g transform="translate(${x} ${y}) scale(${s})"><path d="M0 -14 Q0 -18 4 -18 H26 C29 -18 31 -16 33 -12 L36 -7 Q38 -6 38 -3 V0 H0Z" fill="${K.lin}"/><path d="M27 -16 H29 C30.6 -16 31.6 -14.6 32.6 -12.4 L34.4 -8.6 H27Z" fill="${K.oliveDeep}"/>
  <rect x="3" y="-12.4" width="18" height="3.2" rx="1" fill="${K.terra}"/><circle cx="8" cy="0.4" r="3.4" fill="#1d1d1d"/><circle cx="29" cy="0.4" r="3.4" fill="#1d1d1d"/></g>`;

function panorama(w = 1600, h = 640, { road = true, foreground = true } = {}) {
  const sx = 1600, sy = 640;
  const far = 'M0 392 C140 360 260 372 380 388 C520 406 640 360 800 362 C960 364 1060 396 1200 392 C1340 388 1460 360 1600 372';
  const orch = 'M0 438 C180 404 360 410 520 428 C700 448 860 410 1040 414 C1220 418 1400 444 1600 424';
  const mid = 'M0 486 C200 452 420 458 600 478 C800 500 980 462 1180 466 C1360 470 1480 488 1600 480';
  const near = 'M0 548 C220 520 440 526 640 540 C860 556 1080 524 1300 530 C1440 534 1540 546 1600 544';
  let trees = ''; for (let i = 0; i < 16; i++) { const x = 60 + i * 98 + (i % 3) * 12; const yy = 432 - 22 * Math.sin(i * 0.9) - (i > 9 ? 8 : 0); trees += tree(x, yy, 13 + (i % 3) * 2.5, i % 2 ? K.olive : '#3E5E36'); }
  let lettuces = ''; for (let r = 0; r < 3; r++) for (let i = 0; i < 26; i++) { const x = 20 + i * 64 + (r % 2) * 32, y = 566 + r * 26; lettuces += `<circle cx="${x}" cy="${y}" r="${9 + r * 2}" fill="${r % 2 ? '#3E6233' : '#3A5C30'}"/>`; }
  const roadP = 'M560 640 C600 590 700 560 760 530 C820 500 860 470 900 450 C930 435 960 425 1000 418';
  return `<svg viewBox="0 0 ${sx} ${sy}" width="${w}" height="${h}" preserveAspectRatio="xMidYMid slice" xmlns="http://www.w3.org/2000/svg" style="display:block">
    <rect width="${sx}" height="${sy}" fill="${K.terra}"/>
    <circle cx="980" cy="392" r="360" fill="#C5642F"/><circle cx="980" cy="392" r="270" fill="${K.halo1}"/><circle cx="980" cy="392" r="190" fill="${K.halo2}"/><circle cx="980" cy="392" r="118" fill="${K.saffron}"/>
    <path d="${far} V640 H0Z" fill="${K.sageLL}"/>${furrows(far, `${far} V640 H0Z`, 10, 60, 10, '#A9B98A', 2)}
    ${trees}
    <path d="${orch} V640 H0Z" fill="${K.sageL}"/>${furrows(orch, `${orch} V640 H0Z`, 9, 70, 9, '#8DA26C', 2.4)}
    <path d="${mid} V640 H0Z" fill="${K.sage}"/>${furrows(mid, `${mid} V640 H0Z`, 10, 70, 10, K.sageD, 2.8)}
    <path d="${near} V640 H0Z" fill="${K.olive}"/>${lettuces}
    ${road ? `<path d="${roadP}" fill="none" stroke="${K.lin}" stroke-width="26" stroke-linecap="round"/><path d="${roadP}" fill="none" stroke="#E2D2B4" stroke-width="2" stroke-dasharray="10 12"/>${van(842, 474, 1.6)}` : ''}
    ${foreground ? `${leeks(120, 640, 4.2)}${cabbage(250, 612, 3.6)}${carrots(380, 598, 3.2)}${tomato(1180, 618, 3.2)}${tomato(1250, 628, 2.6)}${pear(1360, 640, 3.6)}${cabbage(1490, 616, 3.2)}` : ''}
    <path d="M0 628 C400 618 1200 618 1600 628 V640 H0Z" fill="${K.oliveDeep}"/>
  </svg>`;
}
module.exports = { panorama };
