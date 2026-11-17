// Logos des variantes enrichies de la piste B. Usage : node build.js <scratchpad> <sortie>
const fs = require('fs'); const { chromium } = require('playwright');
const E = require('../concepts/engine.js'); const V = require('./variants.js');
const [, , S, OUT] = process.argv; E.setRoot(S);
const fra = (w, soft, opsz, wonk, it = false) => ({ font: E.FONT(it ? 'Fraunces-italic' : 'Fraunces-normal'), axes: { wght: w, SOFT: soft, opsz, WONK: wonk }, size: 100 });
const R = fra(620, 100, 72, 0), I = fra(480, 100, 72, 0, true);
const specs = {
  h: [{ ...R, text: 'Soleil ' }, { ...I, text: 'et' }, { ...R, text: ' Saveurs' }],
  v1: [{ ...R, text: 'Soleil ' }, { ...I, text: 'et' }], v2: [{ ...R, text: 'Saveurs' }],
  // options typographiques
  t2: [{ ...fra(600, 50, 144, 1), text: 'Soleil ' }, { ...fra(460, 50, 144, 1, true), text: 'et' }, { ...fra(600, 50, 144, 1), text: ' Saveurs' }],
  t4: [{ ...R, text: 'Soleil ' }, { ...fra(420, 100, 144, 1, true), text: '&' }, { ...R, text: ' Saveurs' }],
  desc: [{ font: E.FONT('DMSans-normal'), axes: { wght: 600, opsz: 14 }, size: 30, text: 'PRIMEUR · FRUITS & LÉGUMES', tracking: 0.32 }],
  arc: [{ font: E.FONT('Fraunces-normal'), axes: { wght: 640, SOFT: 100, opsz: 72, WONK: 0 }, size: 10.4, text: 'SOLEIL ET SAVEURS', tracking: 0.2, glyphs: true }],
  band: [{ font: E.FONT('DMSans-normal'), axes: { wght: 700, opsz: 14 }, size: 6.2, text: 'PRIMEUR · YVELINES (78)', tracking: 0.24 }],
};
(async () => {
  const T = E.shapeAll(Object.fromEntries(Object.entries(specs).map(([k, r]) => [k, r.map(x => ({ tracking: 0, dx: 0, glyphs: false, ...x }))])));
  const ink = '#2F4A2B', lin = '#F3E8D6';
  const marks = { B1: V.B1, B2: V.B2, B3: () => V.B3(), B4: V.B4, B6: V.B6, Bs: V.Bsimple };
  const items = []; const add = (key, inner, title) => items.push({ key, file: `${OUT}/piste-${key}.svg`, inner, title: `Soleil et Saveurs — piste B enrichie — ${title}` });
  for (const [id, fn] of Object.entries(marks)) {
    const m = () => ({ svg: fn(), vb: [14, 15, 72, 101], ref: [16, 116] });
    add(`${id}/symbole-couleur`, fn(), `${id} symbole`); add(`${id}/symbole-sombre`, fn(), `${id} symbole (fond sombre)`);
    add(`${id}/horizontal-couleur`, E.horiz(m(), T.h, { k: 3.25, gap: 0.6, fill: ink }), `${id} horizontal`);
    add(`${id}/horizontal-sombre`, E.horiz(m(), T.h, { k: 3.25, gap: 0.6, fill: lin }), `${id} horizontal fond sombre`);
    add(`${id}/vertical-couleur`, E.vert(m(), [T.v1, T.v2], { k: 3.7, gap: 0.5, lead: 0.28, fill: ink }), `${id} vertical`);
    add(`${id}/vertical-sombre`, E.vert(m(), [T.v1, T.v2], { k: 3.7, gap: 0.5, lead: 0.28, fill: lin }), `${id} vertical fond sombre`);
  }
  // Gravure en une encre (noir, blanc)
  for (const [th, ink2, pap] of [['noir', '#000000', '#FFFFFF'], ['blanc', '#FFFFFF', '#000000']]) add(`B3/symbole-${th}`, V.B3(ink2, pap, ink2 === '#000000' ? '#FFFFFF' : '#000000'), `B3 ${th}`);
  { const g = (th, ink2, pap, sun) => ({ svg: V.B3(ink2, pap, sun), vb: [14, 15, 72, 101], ref: [16, 116] });
    for (const [th, ink2, pap, sun] of [['noir', '#000000', '#FFFFFF', '#FFFFFF'], ['blanc', '#FFFFFF', '#000000', '#000000']]) {
      add(`B3/horizontal-${th}`, E.horiz(g(th, ink2, pap, sun), T.h, { k: 3.25, gap: 0.6, fill: ink2 }), `B3 horizontal ${th}`);
      add(`B3/vertical-${th}`, E.vert(g(th, ink2, pap, sun), [T.v1, T.v2], { k: 3.7, gap: 0.5, lead: 0.28, fill: ink2 }), `B3 vertical ${th}`); } }
  // Emblème titré
  const B5 = V.B5(T, E.arcText, E.line); add('B5/symbole-couleur', B5, 'B5 emblème');
  add('B5/horizontal-couleur', E.horiz({ svg: B5, vb: [12.7, 12.7, 114.6, 163] }, T.h, { k: 3.6, gap: 0.6, fill: ink }), 'B5 horizontal');
  // Options typographiques (avec B1)
  const m1 = { svg: V.B1(), vb: [14, 15, 72, 101], ref: [16, 116] };
  add('typo/t1', E.horiz(m1, T.h, { k: 3.25, gap: 0.6, fill: ink }), 'typo actuelle');
  add('typo/t2', E.horiz(m1, T.t2, { k: 3.25, gap: 0.6, fill: ink }), 'typo caractère');
  add('typo/t3', E.horiz(m1, T.h, { k: 3.25, gap: 0.6, fill: ink }) + E.line(T.desc, (m1.vb[2] * 3.25 * T.h.capH / 100) + 0.6 * T.h.capH, 52, '#C2602D'), 'typo avec descripteur');
  add('typo/t4', E.horiz(m1, T.t4, { k: 3.25, gap: 0.6, fill: ink }).replace(/(<path fill="#2F4A2B" transform="translate\([^"]+\)" d=")/, '$1'), 'typo esperluette');
  const browser = await chromium.launch(); const page = await browser.newPage();
  const idx = await E.tightAll(items, page); await browser.close();
  fs.writeFileSync(`${S}/work/bvar-index.json`, JSON.stringify(idx, null, 1)); console.log(items.length, 'fichiers');
})();
