// Exports de la reproduction : logo complet, emblème seul, logotype seul, photo de profil, PNG, PDF
// Usage : node export.js <scratchpad> <dossier source (repro-complet.svg)> <dossier de sortie>
const fs = require('fs'); const { chromium } = require('playwright');
const E = require('../concepts/engine.js');
const [, , S, IN, OUT] = process.argv; E.setRoot(S);
const full = fs.readFileSync(`${IN}/repro-complet.svg`, 'utf8');
const defs = full.slice(full.indexOf('<defs>'), full.indexOf('</defs>') + 7);
const grp = id => { const a = full.indexOf(`<g id="${id}">`); let depth = 0, i = a; const re = /<g[\s>]|<\/g>/g; re.lastIndex = a; let m; while ((m = re.exec(full))) { depth += m[0] === '</g>' ? -1 : 1; if (depth === 0) { i = m.index + 4; break; } } return full.slice(a, i); };
const emb = grp('embleme'), logo = grp('logotype');
const N = n => `soleil-et-saveurs_reproduction_${n}`;
(async () => {
  fs.mkdirSync(OUT, { recursive: true });
  const b = await chromium.launch(); const p = await b.newPage();
  const idx = await E.tightAll([
    { key: 'complet', file: `${OUT}/${N('logo-complet')}.svg`, inner: defs + emb + logo, title: 'Soleil et Saveurs — reproduction vectorielle : logo complet (emblème + logotype)' },
    { key: 'embleme', file: `${OUT}/${N('embleme')}.svg`, inner: defs + emb, title: 'Soleil et Saveurs — reproduction vectorielle : emblème seul' },
    { key: 'logotype', file: `${OUT}/${N('logotype')}.svg`, inner: defs + logo, title: 'Soleil et Saveurs — reproduction vectorielle : logotype seul' },
  ], p);
  const inline = (file, css) => { const t = fs.readFileSync(file, 'utf8'); const i = t.indexOf('<svg'); return t.slice(i).replace('<svg ', `<svg style="${css}" `).replace(/ width="[^"]+" height="[^"]+"/, ''); };
  const shot = async (html, W, H, out, bg) => { await p.setViewportSize({ width: W, height: H }); await p.setContent(`<html><body style="margin:0;background:${bg || 'transparent'}">${html}</body></html>`); await p.waitForTimeout(150); await p.screenshot({ path: out, omitBackground: !bg, clip: { x: 0, y: 0, width: W, height: H } }); };
  const ar = k => idx[k][2] / idx[k][3];
  // PNG haute définition : transparent et sur fond blanc
  for (const [k, n, W] of [['complet', 'logo-complet', 3600], ['embleme', 'embleme', 1800], ['logotype', 'logotype', 1800]]) {
    const H = Math.round(W / ar(k)); const svg = inline(`${OUT}/${N(n)}.svg`, `width:${W}px;height:${H}px;display:block`);
    await shot(svg, W, H, `${OUT}/${N(n)}_transparent.png`); await shot(svg, W, H, `${OUT}/${N(n)}_fond-blanc.png`, '#FFFFFF');
    // PDF vectoriel
    await p.setContent(`<html><head><style>@page{size:${Math.round(W / 3)}px ${Math.round(H / 3)}px;margin:0}html,body{margin:0}</style></head><body>${inline(`${OUT}/${N(n)}.svg`, `width:${Math.round(W / 3)}px;height:${Math.round(H / 3)}px;display:block`)}</body></html>`);
    await p.pdf({ path: `${OUT}/${N(n)}.pdf`, width: `${Math.round(W / 3)}px`, height: `${Math.round(H / 3)}px`, printBackground: false, pageRanges: '1' });
  }
  // Photo de profil : l'emblème entier tient dans le cercle
  { const a = ar('embleme'); const side = 2048, w = 0.8 * side, h = w / a; // le bandeau et le haut arrondi restent dans le cercle
    await shot(`<div style="width:${side}px;height:${side}px;background:#FFFFFF;display:flex;align-items:center;justify-content:center">${inline(`${OUT}/${N('embleme')}.svg`, `width:${w.toFixed(1)}px;height:${h.toFixed(1)}px;display:block`)}</div>`, side, side, `${OUT}/${N('photo-profil')}.png`, '#FFFFFF'); }
  await b.close(); console.log(JSON.stringify(idx));
})();
