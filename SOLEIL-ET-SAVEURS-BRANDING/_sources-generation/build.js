// Construit les fichiers maîtres SVG du logo validé. Usage : node build.js <scratchpad> <dossier 01-LOGO-SOURCE> <dossier 06-MONOCHROME>
const fs = require('fs'); const path = require('path'); const { chromium } = require('playwright');
const E = require('../concepts/engine.js'); const L = require('./logo.js');
const [, , S, SRC, MONO] = process.argv; E.setRoot(S);
const K = L.K; const f = n => +(+n).toFixed(2);
const fra = (w, it = false) => ({ font: E.FONT(it ? 'Fraunces-italic' : 'Fraunces-normal'), axes: { wght: w, SOFT: 100, opsz: 72, WONK: 0 }, size: 100, tracking: 0, dx: 0, glyphs: false });
const dm = (size, tr) => ({ font: E.FONT('DMSans-normal'), axes: { wght: 600, opsz: 14 }, size, text: 'PRIMEUR · FRUITS & LÉGUMES', tracking: tr, dx: 0, glyphs: false });
const SPEC = {
  arc: [{ font: E.FONT('Fraunces-normal'), axes: { wght: 640, SOFT: 100, opsz: 72, WONK: 0 }, size: 10.4, text: 'SOLEIL ET SAVEURS', tracking: 0.2, dx: 0, glyphs: true }],
  h: [{ ...fra(620), text: 'Soleil ' }, { ...fra(480, true), text: 'et' }, { ...fra(620), text: ' Saveurs' }],
  v1: [{ ...fra(620), text: 'Soleil ' }, { ...fra(480, true), text: 'et' }], v2: [{ ...fra(620), text: 'Saveurs' }],
  d0: [dm(29, 0)], dv0: [dm(25, 0)],
  band: [{ font: E.FONT('DMSans-normal'), axes: { wght: 600, opsz: 14 }, size: 5.6, text: 'PRIMEUR DEPUIS 1999', tracking: 0.22, dx: 0, glyphs: false }],
};
const { execFileSync } = require('child_process');

(async () => {
  let T = E.shapeAll(SPEC);
  // Descripteur justifié sur la largeur du nom (horizontal) et sur la ligne la plus large (vertical)
  const n = T.d0.glyphs ? T.d0.glyphs.length : 'PRIMEUR · FRUITS & LÉGUMES'.length;
  const fitTr = (Ld, W, size) => (W - (Ld.bbox[2] - Ld.bbox[0])) / ((n - 1) * size);
  const Wh = E.inkW(T.h), Wv = Math.max(E.inkW(T.v1), E.inkW(T.v2));
  T = { ...T, ...E.shapeAll({ d: [dm(29, fitTr(T.d0, Wh, 29))], dv: [dm(25, fitTr(T.dv0, Wv, 25))] }) };
  fs.writeFileSync(`${S}/work/final-text.json`, JSON.stringify(Object.fromEntries(Object.entries(T).map(([k, v]) => [k, { ...v, d: undefined, glyphs: undefined }])), null, 1));

  const THEMES = { couleur: { txt: K.olive, desc: K.terra }, sombre: { txt: K.lin, desc: K.honey }, noir: { txt: '#000000', desc: '#000000' }, blanc: { txt: '#FFFFFF', desc: '#FFFFFF' } };
  const C = T.h.capH;
  // Logo horizontal : symbole + nom (+ descripteur)
  const horizontal = (th, mode, withDesc = true) => {
    const k = 3.55, sc = (k * C) / 100, gap = 0.62 * C, tx = -14 * sc;
    const dTop = 0.5 * C, dCap = T.d.capH;
    const blockTop = -C, blockBot = withDesc ? dTop + dCap : 0;
    const ty = (blockTop + blockBot) / 2 - 66 * sc;
    const x = 72 * sc + gap;
    let s = `<!-- symbole -->\n<g transform="translate(${f(tx)} ${f(ty)}) scale(${f(sc)})">${L.symbol({ theme: th, mode })}</g>\n<!-- nom -->\n${E.line(T.h, x, 0, THEMES[th].txt)}`;
    if (withDesc) s += `\n<!-- descripteur -->\n${E.line(T.d, x, dTop + dCap, THEMES[th].desc)}`;
    return s;
  };
  // Logo vertical empilé : symbole, nom sur deux lignes, descripteur
  const vertical = (th, mode) => {
    const k = 4.1, sc = (k * C) / 100;
    let s = `<g transform="translate(${f(-50 * sc)} ${f(-16 * sc)}) scale(${f(sc)})">${L.symbol({ theme: th, mode })}</g>`;
    let y = 100 * sc + 0.5 * C;
    for (const Ln of [T.v1, T.v2]) { const by = y - Ln.bbox[1]; s += E.line(Ln, 0, by, THEMES[th].txt, 'middle'); y = Ln.bbox[3] + by + 0.24 * C; }
    s += E.line(T.dv, 0, y + 0.2 * C + T.dv.capH, THEMES[th].desc, 'middle');
    return s;
  };
  // Bandeau vert « PRIMEUR DEPUIS 1999 »
  const EMB = L.EMB, bandTop = EMB.cy + 64 * EMB.sc, bx = EMB.cx - EMB.Ro, bw = 2 * EMB.Ro;
  const Lb = T.band, bwT = Lb.bbox[2] - Lb.bbox[0], base = bandTop + EMB.bandH / 2 + Lb.capH / 2;
  const tdx = EMB.cx - Lb.bbox[0] - bwT / 2, dotY = base - Lb.capH / 2, dotX = bwT / 2 + 5.2;
  const knock = JSON.parse(execFileSync('python3', [path.join(__dirname, 'band_knock.py')], { cwd: __dirname, input: JSON.stringify({ rect: [bx, bandTop, bw, EMB.bandH], d: Lb.d, dx: tdx, dy: base, dots: [[EMB.cx - dotX, dotY, 1.05], [EMB.cx + dotX, dotY, 1.05]] }) }).toString());
  const band = th => {
    if (th === 'noir' || th === 'blanc') return `<path d="${knock.d}" fill="${th === 'noir' ? '#000000' : '#FFFFFF'}" fill-rule="${knock.rule}"/>`;
    const [bg, tx, dt] = th === 'sombre' ? [K.lin, K.olive, K.terra] : [K.olive, K.lin, K.saffron];
    return `<rect x="${f(bx)}" y="${f(bandTop)}" width="${f(bw)}" height="${EMB.bandH}" fill="${bg}"/>
    <!-- texte du bandeau -->
    ${E.line(Lb, EMB.cx, f(base), tx, 'middle')}
    <circle cx="${f(EMB.cx - dotX)}" cy="${f(dotY)}" r="1.05" fill="${dt}"/><circle cx="${f(EMB.cx + dotX)}" cy="${f(dotY)}" r="1.05" fill="${dt}"/>`;
  };
  const items = []; const add = (dir, name, inner, title) => items.push({ key: name, file: `${dir}/${name}.svg`, inner, title: `Soleil et Saveurs — ${title}. Logo validé, novembre 2026.` });
  for (const th of ['couleur', 'sombre']) for (const mode of ['relief', 'plat']) {
    const suf = `${th === 'couleur' ? 'fond-clair' : 'fond-sombre'}${mode === 'plat' ? '_a-plat' : ''}`;
    const lab = `${th === 'couleur' ? 'fond clair' : 'fond sombre'}${mode === 'plat' ? ', à plat (impression)' : ', relief (écran)'}`;
    add(SRC, `soleil-et-saveurs_logo-horizontal_${suf}`, horizontal(th, mode), `logo principal horizontal, ${lab}`);
    add(SRC, `soleil-et-saveurs_logo-horizontal-sans-descripteur_${suf}`, horizontal(th, mode, false), `logo horizontal sans descripteur, ${lab}`);
    add(SRC, `soleil-et-saveurs_logo-vertical_${suf}`, vertical(th, mode), `logo vertical empilé, ${lab}`);
    add(SRC, `soleil-et-saveurs_embleme_${suf}`, L.emblem(T, E.arcText, { theme: th, mode, band: band(th) }), `emblème « Arche titrée », ${lab}`);
    if (th === 'couleur') add(SRC, `soleil-et-saveurs_symbole${mode === 'plat' ? '_a-plat' : ''}`, L.symbol({ mode }), `symbole seul${mode === 'plat' ? ', à plat' : ', relief'}`);
  }
  add(SRC, 'soleil-et-saveurs_symbole-simplifie', L.symbol({ simple: true }), 'symbole simplifié pour les petites tailles (moins de 40 px)');
  for (const th of ['noir', 'blanc']) {
    add(MONO, `soleil-et-saveurs_logo-horizontal_${th}`, horizontal(th, 'plat'), `logo horizontal monochrome ${th}`);
    add(MONO, `soleil-et-saveurs_logo-horizontal-sans-descripteur_${th}`, horizontal(th, 'plat', false), `logo horizontal sans descripteur, monochrome ${th}`);
    add(MONO, `soleil-et-saveurs_logo-vertical_${th}`, vertical(th, 'plat'), `logo vertical monochrome ${th}`);
    add(MONO, `soleil-et-saveurs_embleme_${th}`, L.emblem(T, E.arcText, { theme: th, band: band(th) }), `emblème monochrome ${th}`);
    add(MONO, `soleil-et-saveurs_symbole_${th}`, L.symbol({ theme: th }), `symbole monochrome ${th}`);
    add(MONO, `soleil-et-saveurs_symbole-simplifie_${th}`, L.symbol({ theme: th, simple: true }), `symbole simplifié monochrome ${th}`);
  }
  const browser = await chromium.launch(); const page = await browser.newPage();
  const idx = await E.tightAll(items, page); await browser.close();
  fs.writeFileSync(`${S}/work/final-index.json`, JSON.stringify(idx, null, 1));

  // Versions à texte éditable (polices Fraunces et DM Sans requises)
  const vb = k => idx[k];
  const sc = (3.55 * C) / 100, x = 72 * sc + 0.62 * C;
  const fr = (w, it) => `font-family:Fraunces;font-weight:${w};${it ? 'font-style:italic;' : ''}font-variation-settings:'SOFT' 100,'opsz' 72,'WONK' 0`;
  const editH = (th) => {
    const kk = `soleil-et-saveurs_logo-horizontal_${th === 'couleur' ? 'fond-clair' : 'fond-sombre'}`;
    const svg = fs.readFileSync(`${SRC}/${kk}.svg`, 'utf8');
    const symbolPart = svg.slice(svg.indexOf('<!-- symbole -->'), svg.indexOf('<!-- nom -->'));
    const v = vb(kk); const dTop = 0.5 * C, dCap = T.d.capH;
    const trD = (fitTr(T.d0, Wh, 29) * 29).toFixed(2);
    return `<?xml version="1.0" encoding="UTF-8"?>\n<!-- Soleil et Saveurs — logo horizontal, version à TEXTE ÉDITABLE. Nécessite Fraunces (variable) et DM Sans (Google Fonts, licence OFL).\n     La version de référence est le fichier vectorisé du même nom. -->
<svg xmlns="http://www.w3.org/2000/svg" viewBox="${v.join(' ')}" width="${v[2]}" height="${v[3]}">
${symbolPart}<text x="${f(x - T.h.bbox[0])}" y="0" font-size="100" fill="${THEMES[th].txt}" style="${fr(620)}">Soleil <tspan style="${fr(480, true)}">et</tspan> Saveurs</text>
<text x="${f(x - T.d.bbox[0])}" y="${f(dTop + dCap)}" font-size="29" fill="${THEMES[th].desc}" letter-spacing="${trD}" style="font-family:'DM Sans';font-weight:600">PRIMEUR · FRUITS &amp; LÉGUMES</text>
</svg>\n`;
  };
  fs.writeFileSync(`${SRC}/soleil-et-saveurs_logo-horizontal_fond-clair_texte-editable.svg`, editH('couleur'));
  fs.writeFileSync(`${SRC}/soleil-et-saveurs_logo-horizontal_fond-sombre_texte-editable.svg`, editH('sombre'));
  // Emblème à texte éditable : le nom suit un chemin en arc
  { const kk = 'soleil-et-saveurs_embleme_fond-clair'; const svg = fs.readFileSync(`${SRC}/${kk}.svg`, 'utf8'); const v = vb(kk);
    const body = svg.slice(svg.indexOf('>', svg.indexOf('<svg')) + 1, svg.lastIndexOf('</svg>'));
    const start = body.indexOf('<!-- nom en arc -->'), end = body.indexOf('<circle', start);
    const trB = (0.22 * 5.6).toFixed(2);
    const { cx, cy } = L.EMB, R = 46.6;
    const edited = body.slice(0, start) + `<!-- nom en arc (texte éditable) -->\n<defs><path id="arc-nom" d="M${cx - R} ${cy} A${R} ${R} 0 0 1 ${cx + R} ${cy}"/></defs>
<text font-size="10.4" fill="${K.olive}" letter-spacing="2.08" style="font-family:Fraunces;font-weight:640;font-variation-settings:'SOFT' 100,'opsz' 72,'WONK' 0"><textPath href="#arc-nom" startOffset="50%" text-anchor="middle">SOLEIL ET SAVEURS</textPath></text>\n` + body.slice(end).replace(/<!-- texte du bandeau -->\s*<path[^>]*\/>/, `<!-- texte du bandeau (éditable) -->\n<text x="${f(EMB.cx)}" y="${f(base)}" text-anchor="middle" font-size="5.6" letter-spacing="${trB}" fill="${K.lin}" style="font-family:'DM Sans';font-weight:600">PRIMEUR DEPUIS 1999</text>`);
    fs.writeFileSync(`${SRC}/soleil-et-saveurs_embleme_fond-clair_texte-editable.svg`, `<?xml version="1.0" encoding="UTF-8"?>\n<!-- Soleil et Saveurs — emblème, version à TEXTE ÉDITABLE (Fraunces et DM Sans requises). Référence : fichier vectorisé. -->\n<svg xmlns="http://www.w3.org/2000/svg" viewBox="${v.join(' ')}" width="${v[2]}" height="${v[3]}">${edited}</svg>\n`); }
  console.log(items.length + 3, 'fichiers SVG');
})();
