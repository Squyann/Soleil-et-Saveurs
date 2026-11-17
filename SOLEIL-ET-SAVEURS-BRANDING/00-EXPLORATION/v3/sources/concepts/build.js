// Construit les logos des pistes D → R. Usage : node build.js <scratchpad> <dossier de sortie> [lettres]
const fs = require('fs'); const { chromium } = require('playwright');
const E = require('./engine.js'); const C = require('./defs.js');
const [, , S, OUT, ONLY] = process.argv; E.setRoot(S);
const ids = ONLY ? ONLY.split('') : Object.keys(C);
(async () => {
  const specs = {};
  for (const id of ids) for (const [k, runs] of Object.entries(C[id].texts))
    specs[`${id}.${k}`] = runs.map(r => ({ font: E.FONT(r.f), axes: r.axes || {}, size: r.size || 100, text: r.text, tracking: r.tracking || 0, dx: r.dx || 0, glyphs: !!r.glyphs }));
  const TX = E.shapeAll(specs);
  const items = [];
  for (const id of ids) {
    const P = C[id]; const T = Object.fromEntries(Object.keys(P.texts).map(k => [k, TX[`${id}.${k}`]]));
    for (const th of ['couleur', 'sombre', 'noir', 'blanc']) {
      const r = P.build(th, T);
      for (const kind of ['horizontal', 'vertical', 'symbole']) items.push({ key: `${id}/${kind}-${th}`, file: `${OUT}/piste-${id}/${kind}-${th}.svg`, inner: r[kind], title: `Soleil et Saveurs — piste ${id} « ${P.nom} » (${P.type}) — ${kind} ${th}` });
    }
    const extra = [];
    if (id === 'N') for (const th of ['couleur', 'sombre']) P.extra(th).forEach(e => extra.push({ ...e, key: `${e.key}-${th}` }));
    if (id === 'K') for (const ex of ['clin', 'ravi']) extra.push({ key: `symbole-${ex}-couleur`, inner: P.mk('couleur', ex).svg });
    if (id === 'M') [['fruit', 'soleil', 'tranche', 'feuille'], ['tranche', 'fruit', 'feuille', 'soleil'], ['feuille', 'tranche', 'soleil', 'fruit']].forEach((o, i) => extra.push({ key: `symbole-combi${i + 1}-couleur`, inner: P.mk('couleur', o).svg }));
    if (id === 'R') [[80, 137.508], [220, 137.508], [130, 137.3], [130, 222.5]].forEach(([n, a], i) => extra.push({ key: `symbole-var${i + 1}-couleur`, inner: P.dots(n, undefined, null, a) }));
    extra.forEach(e => items.push({ key: `${id}/${e.key}`, file: `${OUT}/piste-${id}/${e.key}.svg`, inner: e.inner, title: `Soleil et Saveurs — piste ${id} — ${e.key}` }));
  }
  const browser = await chromium.launch(); const page = await browser.newPage();
  const idx = await E.tightAll(items, page); await browser.close();
  const idxFile = `${S}/work/concepts-index.json`;
  const prev = fs.existsSync(idxFile) ? JSON.parse(fs.readFileSync(idxFile, 'utf8')) : {};
  fs.writeFileSync(idxFile, JSON.stringify({ ...prev, ...idx }, null, 1));
  console.log(items.length, 'fichiers');
})();
