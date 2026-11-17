// Exports du logo validé : PNG transparents, PDF vectoriels, favicons. Usage : node export.js <scratchpad> <racine SOLEIL-ET-SAVEURS-BRANDING>
const fs = require('fs'); const path = require('path'); const { chromium } = require('playwright');
const [, , S, R] = process.argv;
const IDX = JSON.parse(fs.readFileSync(`${S}/work/final-index.json`, 'utf8'));
const SRC = `${R}/01-LOGO-SOURCE`, MONO = `${R}/06-MONOCHROME`;
const dirs = ['02-LOGO-PNG', '03-LOGO-PDF', '05-FAVICON'].map(d => `${R}/${d}`); dirs.forEach(d => fs.mkdirSync(d, { recursive: true }));
const ratio = k => IDX[k][2] / IDX[k][3];
const kindOf = k => k.includes('horizontal') ? 'h' : k.includes('symbole') ? 's' : 'v';
// Tailles de base (1x) : horizontal 1000 px de large ; vertical et emblème 600 px de haut ; symbole 512 px de haut
const base = k => kindOf(k) === 'h' ? { w: 1000 } : kindOf(k) === 's' ? { h: 512 } : { h: 600 };
const dims = (k, s) => { const b = base(k), a = ratio(k); const w = b.w ? b.w * s : Math.round(b.h * s * a), h = b.h ? b.h * s : Math.round(b.w * s / a); return [Math.round(w), Math.round(h)]; };

(async () => {
  const browser = await chromium.launch(); const page = await browser.newPage();
  // SVG intégré directement dans la page (setContent n'a pas accès aux fichiers locaux)
  const inline = (file, css) => { const t = fs.readFileSync(file, 'utf8'); const i = t.indexOf('<svg'); return t.slice(i).replace('<svg ', `<svg style="${css}" `).replace(/ width="[^"]+" height="[^"]+"/, ''); };
  const png = async (file, out, W, H, bg = null, pad = 0) => {
    await page.setViewportSize({ width: W, height: H });
    await page.setContent(`<html><body style="margin:0;background:${bg || 'transparent'}"><div style="width:${W}px;height:${H}px;display:flex;align-items:center;justify-content:center">${(() => { const k = path.basename(file, '.svg'); const a = IDX[k] ? ratio(k) : 1; const bw = W - 2 * pad, bh = H - 2 * pad; const w = Math.min(bw, bh * a), h = w / a; return inline(file, `width:${w}px;height:${h}px;display:block`); })()}</div></body></html>`);
    await page.waitForTimeout(60);
    await page.screenshot({ path: out, omitBackground: !bg, clip: { x: 0, y: 0, width: W, height: H } });
  };
  const pdf = async (file, out, W, H) => {
    await page.setContent(`<html><head><style>@page{size:${W}px ${H}px;margin:0}html,body{margin:0;background:transparent}</style></head><body>${inline(file, `width:${W}px;height:${H}px;display:block`)}</body></html>`);
    await page.waitForTimeout(60);
    await page.pdf({ path: out, width: `${W}px`, height: `${H}px`, printBackground: false, pageRanges: '1' });
  };
  let count = { png: 0, pdf: 0 };
  // PNG transparents (versions écran, en relief)
  for (const k of Object.keys(IDX)) {
    if (k.includes('a-plat')) continue;
    const isMono = /_(noir|blanc)$/.test(k); const file = `${isMono ? MONO : SRC}/${k}.svg`;
    const scales = isMono ? [1, 4] : [1, 2, 4];
    for (const s of scales) { const [W, H] = dims(k, s); await png(file, `${isMono ? MONO : `${R}/02-LOGO-PNG`}/${k}@${s}x.png`, W, H); count.png++; }
  }
  // PDF vectoriels : versions à plat (sans filtre) et monochromes
  for (const k of Object.keys(IDX)) {
    const isMono = /_(noir|blanc)$/.test(k); if (!isMono && !k.includes('a-plat') && !k.includes('symbole-simplifie')) continue;
    const file = `${isMono ? MONO : SRC}/${k}.svg`; const [W, H] = dims(k, 0.6);
    await pdf(file, `${isMono ? MONO : `${R}/03-LOGO-PDF`}/${k}.pdf`, W, H); count.pdf++;
  }
  // Favicons et icônes d'application
  const FAV = `${R}/05-FAVICON`, simp = `${SRC}/soleil-et-saveurs_symbole-simplifie.svg`, full = `${SRC}/soleil-et-saveurs_symbole.svg`;
  for (const s of [16, 32, 48]) await png(simp, `${FAV}/favicon-${s}x${s}.png`, s, s);
  await png(full, `${FAV}/apple-touch-icon.png`, 180, 180, '#F3E8D6', 26);
  await png(full, `${FAV}/icon-192.png`, 192, 192, '#F3E8D6', 28);
  await png(full, `${FAV}/icon-512.png`, 512, 512, '#F3E8D6', 72);
  await png(full, `${FAV}/icon-maskable-512.png`, 512, 512, '#F3E8D6', 120);
  // favicon.svg : symbole simplifié centré dans un carré
  { const v = IDX['soleil-et-saveurs_symbole-simplifie']; const svg = fs.readFileSync(simp, 'utf8'); const inner = svg.slice(svg.indexOf('>', svg.indexOf('<svg')) + 1, svg.lastIndexOf('</svg>'));
    const side = v[3]; const x = v[0] - (side - v[2]) / 2;
    fs.writeFileSync(`${FAV}/favicon.svg`, `<?xml version="1.0" encoding="UTF-8"?>\n<!-- Soleil et Saveurs — favicon (symbole simplifié) -->\n<svg xmlns="http://www.w3.org/2000/svg" viewBox="${+x.toFixed(2)} ${v[1]} ${side} ${side}" width="64" height="64">${inner}</svg>\n`); }
  await browser.close();
  console.log(count);
})();
