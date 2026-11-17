// Visuels réseaux sociaux : photos de profil (rondes) et photo de couverture Facebook
// Usage : node reseaux.js <scratchpad> <racine SOLEIL-ET-SAVEURS-BRANDING>
const fs = require('fs'); const { chromium } = require('playwright');
const { panorama } = require('../b2/panorama.js');
const [, , S, R] = process.argv;
const OUT = `${R}/09-RESEAUX-SOCIAUX`; fs.mkdirSync(OUT, { recursive: true });
const IDX = JSON.parse(fs.readFileSync(`${S}/work/final-index.json`, 'utf8'));
const SRC = `${R}/01-LOGO-SOURCE`;
const ratio = k => IDX[k][2] / IDX[k][3];
const LIN = '#F3E8D6', OLIVE = '#2F4A2B';

// Le logo doit tenir entièrement dans le cercle : diagonale du logo ≤ 92 % du diamètre
function profile(k, bg, side = 2048) {
  const a = ratio(k); const diag = 0.9 * side; const h = diag / Math.sqrt(1 + a * a); const w = h * a;
  return `<div style="width:${side}px;height:${side}px;background:${bg};display:flex;align-items:center;justify-content:center">
    <img src="${SRC}/${k}.svg" style="width:${w.toFixed(1)}px;height:${h.toFixed(1)}px"></div>`;
}
function profileSymbol(bg, side = 2048) {
  const k = 'soleil-et-saveurs_symbole'; const a = ratio(k); const h = 0.9 * side / Math.sqrt(1 + a * a) * 1.04; const w = h * a;
  return `<div style="width:${side}px;height:${side}px;background:${bg};display:flex;align-items:center;justify-content:center">
    <img src="${SRC}/${k}.svg" style="width:${w.toFixed(1)}px;height:${h.toFixed(1)}px"></div>`;
}
// Couverture Facebook 1640 x 624 (logo centré : visible aussi sur mobile, où Facebook rogne les côtés)
function cover() {
  const k = 'soleil-et-saveurs_logo-horizontal_fond-sombre'; const w = 560, h = w / ratio(k);
  return `<div style="width:1640px;height:624px;position:relative;overflow:hidden">${panorama(1640, 624)}
    <img src="${SRC}/${k}.svg" style="position:absolute;left:${(1640 - w) / 2}px;top:64px;width:${w}px;height:${h.toFixed(1)}px"></div>`;
}
const jobs = [
  ['photo-profil_embleme_fond-lin.png', profile('soleil-et-saveurs_embleme_fond-clair', LIN), 2048, 2048],
  ['photo-profil_embleme_fond-vert.png', profile('soleil-et-saveurs_embleme_fond-sombre', OLIVE), 2048, 2048],
  ['photo-profil_symbole_fond-lin.png', profileSymbol(LIN), 2048, 2048],
  ['photo-profil_symbole_fond-vert.png', profileSymbol(OLIVE), 2048, 2048],
  ['photo-couverture_facebook.png', cover(), 1640, 624],
];
(async () => {
  const b = await chromium.launch(); const p = await b.newPage();
  for (const [name, html, W, H] of jobs) {
    fs.writeFileSync(`${S}/work/_rs.html`, `<!doctype html><html><body style="margin:0">${html}</body></html>`);
    await p.setViewportSize({ width: W, height: H }); await p.goto('file://' + `${S}/work/_rs.html`); await p.waitForTimeout(250);
    await p.screenshot({ path: `${OUT}/${name}`, clip: { x: 0, y: 0, width: W, height: H } });
  }
  // Aperçu : rendu dans le cercle, comme sur Facebook et Instagram
  const prev = jobs.slice(0, 4).map(([n]) => `<div style="text-align:center;font:500 22px sans-serif;color:#444"><div style="width:380px;height:380px;border-radius:50%;overflow:hidden;box-shadow:0 0 0 6px #fff,0 8px 24px rgba(0,0,0,.2);margin:0 auto 18px"><img src="${OUT}/${n}" style="width:100%;height:100%"></div>${n.replace('photo-profil_', '').replace('.png', '').replace(/_/g, ' · ')}</div>`).join('');
  fs.writeFileSync(`${S}/work/_rs.html`, `<!doctype html><html><body style="margin:0;background:#e9e9ee;width:1800px;padding:50px;display:flex;gap:40px;justify-content:center">${prev}</body></html>`);
  await p.setViewportSize({ width: 1800, height: 560 }); await p.goto('file://' + `${S}/work/_rs.html`); await p.waitForTimeout(250);
  await p.screenshot({ path: `${OUT}/apercu-dans-le-cercle.png`, fullPage: true });
  await b.close(); console.log('ok');
})();
