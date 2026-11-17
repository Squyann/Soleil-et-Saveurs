// Exports de la version hybride (illustration d'origine + textes vectoriels) : SVG, PNG, PDF, photo de profil, comparatif
// Usage : node hybrid_export.js <scratchpad> <dossier de sortie>   (après hybrid.js en 2x et en 4x)
const fs = require('fs'); const { chromium } = require('playwright');
const E = require('../concepts/engine.js');
const [, , S, OUT] = process.argv; E.setRoot(S);
const H = `${S}/work/hybrid`;
const uri = p => 'data:image/png;base64,' + fs.readFileSync(p).toString('base64');
const load = res => fs.readFileSync(`${H}/hybrid-${res}.svg`, 'utf8').replace(/href="([^"]+\.png)"/g, (m, p) => `href="${uri(p)}"`);
const parts = full => {
  const defs = full.slice(full.indexOf('<defs>'), full.indexOf('</defs>') + 7);
  const grp = id => { const a = full.indexOf(`<g id="${id}">`); let depth = 0, i = a; const re = /<g[\s>]|<\/g>/g; re.lastIndex = a; let m; while ((m = re.exec(full))) { depth += m[0] === '</g>' ? -1 : 1; if (depth === 0) { i = m.index + 4; break; } } return full.slice(a, i); };
  return { defs, emb: grp('embleme'), logo: grp('logotype') };
};
const N = n => `soleil-et-saveurs_logo-client-net_${n}`;
const svgOf = (inner, vb, W, H2) => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${vb.join(' ')}" width="${W}" height="${H2}" style="display:block">${inner}</svg>`;
(async () => {
  fs.mkdirSync(OUT, { recursive: true });
  const P2 = parts(load('2x')), P4 = parts(load('4x'));
  const b = await chromium.launch(); const p = await b.newPage();
  const sets = { complet: ['logo-complet', d => d.defs + d.emb + d.logo, 'logo complet (emblème + logotype)', 4000],
    embleme: ['embleme', d => d.defs + d.emb, 'emblème seul', 3000], logotype: ['logotype', d => d.defs + d.logo, 'logotype seul', 3000] };
  // SVG (images intégrées en 2x : fichier léger pour le web) + mesure des cadres serrés
  const idx = await E.tightAll(Object.entries(sets).map(([key, [n, fn, t]]) => ({ key, file: `${OUT}/${N(n)}.svg`, inner: fn(P2),
    title: `Soleil et Saveurs — logo client, version nette : ${t}. Illustration d'origine (agrandie x4), textes en tracés vectoriels.` })), p);
  const shot = async (html, W, Hh, out, bg) => { await p.setViewportSize({ width: W, height: Hh }); await p.setContent(`<html><body style="margin:0;background:${bg || 'transparent'}">${html}</body></html>`); await p.waitForTimeout(400); await p.screenshot({ path: out, omitBackground: !bg, clip: { x: 0, y: 0, width: W, height: Hh } }); };
  for (const [key, [n, fn, , W]] of Object.entries(sets)) {
    const vb = idx[key]; const Hh = Math.round(W * vb[3] / vb[2]); const inner = fn(P4);
    await shot(svgOf(inner, vb, W, Hh), W, Hh, `${OUT}/${N(n)}_transparent.png`);
    await shot(svgOf(inner, vb, W, Hh), W, Hh, `${OUT}/${N(n)}_fond-blanc.png`, '#FFFFFF');
    // PDF : textes vectoriels + illustration 4x (impression)
    const pw = Math.round(vb[2] / 2), ph = Math.round(vb[3] / 2);   // ~ 1 unité = 0,5 px CSS → format A4 paysage environ pour le logo complet
    await p.setContent(`<html><head><style>@page{size:${pw}px ${ph}px;margin:0}html,body{margin:0}</style></head><body>${svgOf(inner, vb, pw, ph)}</body></html>`);
    await p.waitForTimeout(400);
    await p.pdf({ path: `${OUT}/${N(n)}.pdf`, width: `${pw}px`, height: `${ph}px`, printBackground: false, pageRanges: '1' });
  }
  // Photo de profil : l'emblème entier dans le cercle (cercle minimal englobant → 92 % du diamètre)
  const c = JSON.parse(fs.readFileSync(`${H}/circle.json`, 'utf8')); const su = 2 * c.r / 0.92;
  const vbP = [c.cx - su / 2, c.cy - su / 2, su, su].map(E.f);
  for (const [suf, bg] of [['', '#FFFFFF'], ['_fond-creme', '#FBF4E2']])
    await shot(svgOf(P4.defs + P4.emb, vbP, 2048, 2048), 2048, 2048, `${OUT}/${N('photo-profil' + suf)}.png`, bg);
  // Aperçu du recadrage rond (comme sur Facebook)
  await shot(`<div style="width:1200px;height:700px;background:#F0F2F5;display:flex;align-items:center;justify-content:center;gap:90px;font-family:sans-serif">
    <div style="width:420px;height:420px;border-radius:50%;overflow:hidden;box-shadow:0 0 0 6px #fff,0 4px 18px rgba(0,0,0,.18)">${svgOf(P2.defs + P2.emb, vbP, 420, 420).replace('<svg ', '<svg style="background:#fff" ')}</div>
    <div style="width:170px;height:170px;border-radius:50%;overflow:hidden;box-shadow:0 0 0 4px #fff,0 3px 10px rgba(0,0,0,.18)">${svgOf(P2.defs + P2.emb, vbP, 170, 170).replace('<svg ', '<svg style="background:#fff" ')}</div>
    <div style="width:56px;height:56px;border-radius:50%;overflow:hidden;box-shadow:0 1px 4px rgba(0,0,0,.25)">${svgOf(P2.defs + P2.emb, vbP, 56, 56).replace('<svg ', '<svg style="background:#fff" ')}</div></div>`, 1200, 700, `${OUT}/apercu_photo-profil-ronde.png`, '#F0F2F5');
  await b.close(); fs.writeFileSync(`${H}/export-index.json`, JSON.stringify(idx)); console.log(JSON.stringify(idx));
})();
