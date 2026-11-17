// Reproduction vectorielle du logo fourni par le client (emblème + logotype), en SVG
// Usage : node repro.js <scratchpad> <dossier de sortie>
const fs = require('fs'); const { chromium } = require('playwright');
const E = require('../concepts/engine.js');
const [, , S, OUT] = process.argv; E.setRoot(S);
const f = n => +(+n).toFixed(2);
const C = { vert: '#162E0E', vert2: '#1F3D17', orange: '#C94A08', or: '#E6A224', orF: '#B57A16', creme: '#FDF9E9', creme2: '#F7F0DA' };

// ---------- Textes ----------
const T = E.shapeAll({
  arc: [{ font: E.FONT('Cinzel-normal'), axes: { wght: 700 }, size: 66, text: 'SOLEIL ET SAVEURS', tracking: 0.03, dx: 0, glyphs: true }],
  band: [{ font: E.FONT('Cinzel-normal'), axes: { wght: 700 }, size: 50, text: 'PRIMEUR DEPUIS 1999', tracking: 0.02, dx: 0, glyphs: false }],
  soleil: [{ font: E.FONT('Fraunces-normal'), axes: { wght: 900, SOFT: 50, opsz: 144, WONK: 0 }, size: 252, text: 'Soleil', tracking: -0.02, dx: 0, glyphs: false }],
  et: [{ font: E.FONT('Playfair-italic'), axes: { wght: 800 }, size: 190, text: 'et', tracking: 0, dx: 0, glyphs: false }],
  saveurs: [{ font: E.FONT('Fraunces-normal'), axes: { wght: 900, SOFT: 50, opsz: 144, WONK: 0 }, size: 252, text: 'Saveurs', tracking: -0.02, dx: 0, glyphs: false }],
  s1: [{ font: E.FONT('JosefinSans-normal'), axes: { wght: 600 }, size: 47, text: 'FRUITS & LÉGUMES FRAIS', tracking: 0.08, dx: 0, glyphs: false }],
  s2: [{ font: E.FONT('JosefinSans-normal'), axes: { wght: 600 }, size: 47, text: 'EN LIVRAISON', tracking: 0.08, dx: 0, glyphs: false }],
  script: [{ font: E.FONT('Allura-normal-400'), axes: {}, size: 100, text: 'La fraîcheur au quotidien', tracking: 0, dx: 0, glyphs: false }],
});

// ---------- Éléments dessinés ----------
const leaf = (x, y, len, w, rot, id = 'gLeaf', vein = '#9FD36A') => `<g transform="translate(${x} ${y}) rotate(${rot})">
  <path d="M0 0 C${f(w)} ${f(-len * 0.25)} ${f(w * 0.9)} ${f(-len * 0.8)} 0 ${-len} C${f(-w * 0.9)} ${f(-len * 0.8)} ${f(-w)} ${f(-len * 0.25)} 0 0Z" fill="url(#${id})"/>
  <path d="M0 ${f(-len * 0.05)} C${f(w * 0.08)} ${f(-len * 0.4)} ${f(w * 0.05)} ${f(-len * 0.7)} 0 ${f(-len * 0.95)}" stroke="${vein}" stroke-width="${f(len * 0.025)}" fill="none" stroke-linecap="round" opacity=".8"/>
  ${[0.3, 0.5, 0.7].map(t => `<path d="M${f(w * 0.03)} ${f(-len * t)} q${f(w * 0.35)} ${f(-len * 0.06)} ${f(w * 0.6)} ${f(-len * 0.16)} M${f(-w * 0.03)} ${f(-len * t)} q${f(-w * 0.35)} ${f(-len * 0.06)} ${f(-w * 0.6)} ${f(-len * 0.16)}" stroke="${vein}" stroke-width="${f(len * 0.014)}" fill="none" opacity=".55"/>`).join('')}</g>`;
function frilly(cx, cy, R, n, amp, seed) { let d = ''; const N = 180; for (let i = 0; i <= N; i++) { const t = i / N * Math.PI * 2; const r = R * (1 + amp * Math.sin(n * t + seed) + amp * 0.5 * Math.sin(n * 2.3 * t + seed * 2)); d += `${i ? 'L' : 'M'}${f(cx + r * Math.cos(t))} ${f(cy + r * 0.86 * Math.sin(t))}`; } return d + 'Z'; }

const defs = `<defs>
  <radialGradient id="gSky" cx="465" cy="350" r="380" gradientUnits="userSpaceOnUse"><stop offset="0" stop-color="#FFF6C4"/><stop offset=".18" stop-color="#FFD54E"/><stop offset=".42" stop-color="#FCA226"/><stop offset=".72" stop-color="#F47A14"/><stop offset="1" stop-color="#DE560A"/></radialGradient>
  <radialGradient id="gSun"><stop offset="0" stop-color="#FFFDF0"/><stop offset=".55" stop-color="#FFEFA0"/><stop offset="1" stop-color="#FFD24A"/></radialGradient>
  <radialGradient id="gGlow"><stop offset="0" stop-color="#FFFFFF" stop-opacity=".75"/><stop offset="1" stop-color="#FFF4C0" stop-opacity="0"/></radialGradient>
  <linearGradient id="gFar" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#B9DB78"/><stop offset="1" stop-color="#86B848"/></linearGradient>
  <linearGradient id="gMid" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#9BD04A"/><stop offset="1" stop-color="#4F9A22"/></linearGradient>
  <linearGradient id="gNear" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#6FAE36"/><stop offset="1" stop-color="#2F6A1C"/></linearGradient>
  <linearGradient id="gLeaf" x1="0" y1="1" x2="0" y2="0"><stop offset="0" stop-color="#1F6B1E"/><stop offset=".6" stop-color="#3E9A2C"/><stop offset="1" stop-color="#6CBE3E"/></linearGradient>
  <linearGradient id="gLeafD" x1="0" y1="1" x2="0" y2="0"><stop offset="0" stop-color="#174F16"/><stop offset="1" stop-color="#2F7D24"/></linearGradient>
  <radialGradient id="gLettuce" cx=".45" cy=".35" r=".7"><stop offset="0" stop-color="#B9EC5E"/><stop offset=".5" stop-color="#6CBF2E"/><stop offset="1" stop-color="#2F7E1B"/></radialGradient>
  <radialGradient id="gTomato" cx=".38" cy=".32" r=".75"><stop offset="0" stop-color="#FF7A55"/><stop offset=".45" stop-color="#E8331F"/><stop offset="1" stop-color="#A0150E"/></radialGradient>
  <radialGradient id="gApple" cx=".35" cy=".35" r=".75"><stop offset="0" stop-color="#FF6E4E"/><stop offset=".5" stop-color="#D9261C"/><stop offset=".85" stop-color="#A3170F"/><stop offset="1" stop-color="#C4501A"/></radialGradient>
  <linearGradient id="gCarrot" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#FFB24A"/><stop offset=".5" stop-color="#F7891E"/><stop offset="1" stop-color="#D9600F"/></linearGradient>
  <linearGradient id="gZuc" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#5E9A35"/><stop offset=".45" stop-color="#2F6420"/><stop offset="1" stop-color="#1C4314"/></linearGradient>
  <radialGradient id="gPepper" cx=".4" cy=".3" r=".8"><stop offset="0" stop-color="#FFF08A"/><stop offset=".45" stop-color="#FFC72A"/><stop offset="1" stop-color="#E08D0E"/></radialGradient>
  <linearGradient id="gGold" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#C98A1E"/><stop offset=".5" stop-color="#F2BE4E"/><stop offset="1" stop-color="#C98A1E"/></linearGradient>
  <linearGradient id="gBand" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#25481B"/><stop offset="1" stop-color="#132B0D"/></linearGradient>
  <clipPath id="cScene"><path d="M179 640 V394 A286 286 0 0 1 751 394 V640 Z"/></clipPath>
</defs>`;

// ---------- Emblème ----------
const cx = 465, cy = 394, R = 372;
let rays = ''; for (let i = 0; i < 30; i++) { const a = (i / 30) * Math.PI * 2, a2 = a + 0.035; rays += `<path d="M${cx} 345 L${f(cx + 520 * Math.cos(a))} ${f(345 + 520 * Math.sin(a))} L${f(cx + 520 * Math.cos(a2))} ${f(345 + 520 * Math.sin(a2))}Z" fill="#FFF3B8" opacity="${i % 2 ? .28 : .5}"/>`; }
let rows = ''; { const vx = cx + 30, vy = 404; const xs = []; for (let x = -700; x <= 1700; x += 46) xs.push(x);
  for (let i = 0; i < xs.length - 1; i++) if (i % 2 === 0) rows += `<path d="M${vx} ${vy} L${xs[i]} 760 L${xs[i + 1]} 760Z" fill="#2F6A16" opacity=".5"/>`; }
const scene = `<g clip-path="url(#cScene)">
  <rect x="150" y="80" width="640" height="600" fill="url(#gSky)"/>${rays}
  <circle cx="${cx}" cy="345" r="150" fill="url(#gGlow)"/><circle cx="${cx}" cy="345" r="78" fill="url(#gSun)"/>
  <path d="M170 405 C230 378 300 372 360 386 C410 397 440 392 470 386 C540 372 610 360 680 372 C720 379 745 388 770 396 V700 H170Z" fill="url(#gFar)"/>
  <path d="M170 418 C250 398 330 404 420 414 C520 425 600 400 690 404 C730 406 755 412 770 416 V700 H170Z" fill="url(#gMid)"/>
  <defs><clipPath id="cRows"><path d="M170 418 C250 398 330 404 420 414 C520 425 600 400 690 404 C730 406 755 412 770 416 V700 H170Z"/></clipPath></defs>
  <g clip-path="url(#cRows)">${rows}</g>
  ${[[248, 232, 15], [274, 256, 13], [300, 282, 12], [212, 300, 10]].map(([x, top, w]) => `<path d="M${x} 410 C${x - w * 1.25} 380 ${x - w * 1.2} ${top + 40} ${x} ${top} C${x + w * 1.2} ${top + 40} ${x + w * 1.25} 380 ${x} 410Z" fill="#2C5A1B"/><path d="M${x} ${top + 8} C${x + w * 0.9} ${top + 45} ${x + w * 0.9} 380 ${x + 2} 405" fill="#4A8A2C" opacity=".6"/>`).join('')}
  <path d="M668 402 C670 380 668 360 664 340" stroke="#5A3A1E" stroke-width="10" fill="none" stroke-linecap="round"/><path d="M666 360 L650 340 M666 352 L684 336" stroke="#5A3A1E" stroke-width="5" stroke-linecap="round"/>
  ${[[640, 318, 30, '#3B7A26'], [692, 316, 32, '#3B7A26'], [664, 296, 34, '#4C9030'], [624, 338, 22, '#356F22'], [708, 340, 24, '#356F22'], [668, 330, 30, '#5AA038']].map(([x, y, r, c]) => `<circle cx="${x}" cy="${y}" r="${r}" fill="${c}"/>`).join('')}
</g>`;
const frame = `<path d="M${cx - R} 700 V${cy} A${R} ${R} 0 0 1 ${cx + R} ${cy} V700 Z" fill="${C.creme}" stroke="${C.vert}" stroke-width="12"/>
  <path d="M${cx - 292} 690 V${cy} A292 292 0 0 1 ${cx + 292} ${cy} V690" fill="none" stroke="${C.or}" stroke-width="6"/>
  ${E.arcText(T.arc, cx, cy, 304, 0, C.vert, 1)}
  ${[cx - 333, cx + 333].map(x => `<path d="M${x} 340 Q${x + 2} 358 ${x + 18} 360 Q${x + 2} 362 ${x} 380 Q${x - 2} 362 ${x - 18} 360 Q${x - 2} 358 ${x} 340Z" fill="${C.or}"/>`).join('')}`;
const lettuce = (cx0, cy0, R0) => [[R0, '#3E8A27', 0.2], [R0 * 0.9, 'url(#gLettuce)', 1.1], [R0 * 0.72, '#8DD145', 2.3], [R0 * 0.5, '#B4E66A', 3.1]].map(([r, c, sd], i) => `<path d="${frilly(cx0 + i * 6, cy0 - i * 10, r, 15 - i, 0.075, sd)}" fill="${c}" stroke="#2A6E18" stroke-width="3" stroke-opacity=".55"/>`).join('')
  + [[-40, -30], [0, -50], [40, -20], [-60, 10], [20, 10]].map(([dx, dy]) => `<path d="M${cx0 + dx} ${cy0 + dy + 40} q${dx * 0.3} -40 ${dx * 0.6 + 10} -70" stroke="#E7F7C4" stroke-width="5" fill="none" stroke-linecap="round" opacity=".55"/>`).join('');
const carrot = (x0, y0, len, w, rot) => `<g transform="translate(${x0} ${y0}) rotate(${rot})">
  ${[-26, -8, 10, 26].map((a, i) => `<path d="M0 0 C${-10 + a * 0.3} -30 ${a * 0.8 - 10} -70 ${a * 1.6} -110 C${a * 0.9 + 8} -72 ${a * 0.3 + 10} -34 6 0Z" fill="${i % 2 ? '#3F8A2C' : '#5DA83A'}" transform="rotate(-90)"/>`).join('')}
  <path d="M0 ${-w / 2} C${len * 0.3} ${-w * 0.62} ${len * 0.75} ${-w * 0.3} ${len} 0 C${len * 0.75} ${w * 0.3} ${len * 0.3} ${w * 0.62} 0 ${w / 2} C-10 ${w * 0.3} -10 ${-w * 0.3} 0 ${-w / 2}Z" fill="url(#gCarrot)"/>
  ${[0.18, 0.32, 0.46, 0.6, 0.74].map(t => `<path d="M${f(len * t)} ${f(-w * 0.42 * (1 - t * 0.7))} q6 ${f(w * 0.25)} 0 ${f(w * 0.5)}" stroke="#C9560C" stroke-width="4" fill="none" opacity=".5"/>`).join('')}
  <path d="M${f(len * 0.12)} ${f(-w * 0.28)} C${f(len * 0.4)} ${f(-w * 0.36)} ${f(len * 0.7)} ${f(-w * 0.18)} ${f(len * 0.9)} -2" stroke="#FFD08A" stroke-width="5" fill="none" opacity=".55" stroke-linecap="round"/></g>`;
const veggies = `
  ${leaf(120, 650, 150, 56, -64)}${leaf(118, 575, 140, 50, -40, 'gLeafD')}${leaf(150, 500, 120, 44, -16)}${leaf(820, 655, 150, 56, 64)}${leaf(830, 560, 135, 50, 40, 'gLeafD')}${leaf(785, 485, 110, 42, 16)}
  ${lettuce(225, 530, 125)}
  ${carrot(352, 545, 300, 70, 26)}${carrot(330, 600, 290, 66, 16)}
  <path d="M585 412 C614 398 672 404 686 456 C702 514 662 572 616 572 C602 572 594 565 585 565 C576 565 568 572 554 572 C508 572 468 514 484 456 C498 404 556 398 585 412Z" fill="url(#gApple)"/>
  <path d="M520 470 C530 520 560 548 600 560" stroke="#F2C14E" stroke-width="16" fill="none" opacity=".25" stroke-linecap="round"/>
  <ellipse cx="545" cy="455" rx="16" ry="30" fill="#fff" opacity=".38" transform="rotate(25 545 455)"/><path d="M586 416 C588 398 594 384 606 374" stroke="#5A3A1E" stroke-width="8" fill="none" stroke-linecap="round"/>
  ${leaf(610, 388, 52, 20, 64)}
  <ellipse cx="238" cy="618" rx="112" ry="92" fill="url(#gTomato)"/><ellipse cx="200" cy="582" rx="30" ry="16" fill="#fff" opacity=".38" transform="rotate(-20 200 582)"/>
  <path d="M238 534 l16 -20 l2 24 l30 -6 l-20 20 l26 14 l-30 2 l-4 28 l-20 -20 l-20 20 l-4 -28 l-30 -2 l26 -14 l-20 -20 l30 6 l2 -24z" fill="#2F7A26"/><path d="M238 534 q2 -20 12 -30" stroke="#2F7A26" stroke-width="7" fill="none" stroke-linecap="round"/>
  <g transform="rotate(20 668 640)"><path d="M548 636 C548 612 575 604 668 606 C752 608 790 616 790 638 C790 660 752 668 668 668 C575 670 548 660 548 636Z" fill="url(#gZuc)"/>${[630, 665, 700, 735, 770].map(x => `<path d="M${x - 46} 624 L${x} 624" stroke="#8CC05A" stroke-width="4" opacity=".55"/>`).join('')}<path d="M548 636 C538 630 528 634 522 644" stroke="#3E6E23" stroke-width="12" fill="none" stroke-linecap="round"/></g>
  <g><ellipse cx="702" cy="610" rx="58" ry="80" fill="url(#gPepper)"/><ellipse cx="806" cy="610" rx="56" ry="78" fill="url(#gPepper)"/><ellipse cx="754" cy="602" rx="64" ry="92" fill="url(#gPepper)"/>
  <path d="M722 540 C716 590 718 640 730 684" stroke="#D88A0C" stroke-width="7" fill="none" opacity=".5"/><path d="M786 540 C794 590 792 640 780 684" stroke="#D88A0C" stroke-width="7" fill="none" opacity=".5"/>
  <path d="M704 520 C730 506 778 506 804 520" stroke="#E9A214" stroke-width="10" fill="none" opacity=".45" stroke-linecap="round"/>
  <ellipse cx="740" cy="575" rx="14" ry="40" fill="#fff" opacity=".42" transform="rotate(6 740 575)"/>
  <path d="M752 514 C750 486 760 466 782 456 C794 451 800 461 789 469 C771 481 768 496 770 514Z" fill="#3F8A2C"/><path d="M736 520 C746 508 768 506 780 518" stroke="#2F7A26" stroke-width="10" fill="none" stroke-linecap="round"/></g>
  ${leaf(640, 690, 70, 28, -72)}${leaf(330, 694, 66, 26, 72)}${leaf(470, 690, 56, 22, -8, 'gLeafD')}${leaf(150, 690, 70, 28, -80, 'gLeafD')}${leaf(800, 694, 60, 24, 80)}`;
const band = (() => { const y = 676, h = 98, x0 = 58, x1 = 872; const notch = (x, s) => `${x + s * 0} ${y + h / 2}`;
  return `<path d="M${x0 + 30} ${y} H${x1 - 30} C${x1 - 12} ${y} ${x1 - 6} ${y + 14} ${x1} ${y + h / 2} C${x1 - 6} ${y + h - 14} ${x1 - 12} ${y + h} ${x1 - 30} ${y + h} H${x0 + 30} C${x0 + 12} ${y + h} ${x0 + 6} ${y + h - 14} ${x0} ${y + h / 2} C${x0 + 6} ${y + 14} ${x0 + 12} ${y} ${x0 + 30} ${y}Z" fill="url(#gBand)" stroke="${C.or}" stroke-width="5"/>
    <path d="M${x0 + 38} ${y + 9} H${x1 - 38} C${x1 - 22} ${y + 9} ${x1 - 17} ${y + 22} ${x1 - 12} ${y + h / 2} C${x1 - 17} ${y + h - 22} ${x1 - 22} ${y + h - 9} ${x1 - 38} ${y + h - 9} H${x0 + 38} C${x0 + 22} ${y + h - 9} ${x0 + 17} ${y + h - 22} ${x0 + 12} ${y + h / 2} C${x0 + 17} ${y + 22} ${x0 + 22} ${y + 9} ${x0 + 38} ${y + 9}Z" fill="none" stroke="${C.or}" stroke-width="2" opacity=".85"/>
    ${E.line(T.band, cx, y + h / 2 + T.band.capH / 2, C.creme, 'middle')}
    <path d="M${cx - E.inkW(T.band) / 2 - 62} ${y + h / 2} h34 M${cx + E.inkW(T.band) / 2 + 28} ${y + h / 2} h34" stroke="${C.or}" stroke-width="4" stroke-linecap="round"/>`; })();

// ---------- Logotype ----------
const xL = 905;
const wSoleil = E.inkW(T.soleil);
const word = `${E.line(T.soleil, xL, 345, C.vert)}${E.line(T.et, xL + wSoleil + 34, 338, C.orange)}${E.line(T.saveurs, xL, 560, C.vert)}
  <path d="M1022 162 Q1320 20 1622 150 Q1320 46 1022 162Z" fill="url(#gGold)"/>
  ${leaf(1650, 172, 120, 44, 52)}${leaf(1640, 150, 100, 38, 18, 'gLeafD')}
  <path d="M${xL + 4} 616 H1236 M1398 616 H1738" stroke="${C.or}" stroke-width="4"/>
  ${leaf(1314, 622, 52, 20, -48)}${leaf(1322, 622, 52, 20, 48)}
  ${E.line(T.s1, 1322, 690, C.vert, 'middle')}${E.line(T.s2, 1322, 744, C.vert, 'middle')}
  ${E.line(T.script, 1322, 838, C.vert, 'middle')}
  <path d="M1080 862 Q1360 846 1640 826 Q1360 852 1080 862Z" fill="url(#gGold)"/>`;

const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1780 890" width="1780" height="890">
<!-- Soleil et Saveurs — reproduction vectorielle du logo fourni (emblème + logotype) -->
${defs}
<!-- emblème -->
<g id="embleme">${frame}${scene}${veggies}${band}</g>
<!-- logotype -->
<g id="logotype">${word}</g>
</svg>`;
fs.mkdirSync(OUT, { recursive: true });
fs.writeFileSync(`${OUT}/repro-complet.svg`, svg);
(async () => {
  const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 1780, height: 890 } });
  await p.setContent(`<html><body style="margin:0;background:#fff">${svg}</body></html>`); await p.waitForTimeout(200);
  await p.screenshot({ path: `${OUT}/repro-complet.png` }); await b.close(); console.log('ok');
})();
