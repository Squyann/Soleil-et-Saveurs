// Aperçu « B1 + T3 sans B5 » : l'arche Potager au lever du jour + nom Fraunces + descripteur DM Sans
// Usage : node b1-t3.js <scratchpad> <dossier de sortie>
const fs = require('fs'); const { chromium } = require('playwright');
const X = require('../mockups.js'); const PV2 = require('../deck-data.js'); const { panorama } = require('../b2/panorama.js');
const [, , S, OUT] = process.argv;
const IN = `${S}/work/b1/src`; const IDX = JSON.parse(fs.readFileSync(`${S}/work/b1-index.json`, 'utf8'));
const k = n => `soleil-et-saveurs_${n}`; const file = n => `${IN}/${k(n)}.svg`;
const fit = (n, W, H, st = '') => { const v = IDX[k(n)]; const a = v[2] / v[3]; const w = Math.min(W, H * a); return `<img src="${file(n)}" style="width:${w.toFixed(1)}px;height:${(w / a).toFixed(1)}px;display:block;${st}">`; };
// Moteur de maquettes : la version verticale empilée remplace ici l'emblème
const MK = `${S}/work/mk-b1t3`; fs.mkdirSync(`${MK}/piste-F3`, { recursive: true });
const MAP = { 'horizontal-couleur': 'logo-horizontal_fond-clair', 'horizontal-sombre': 'logo-horizontal_fond-sombre', 'vertical-couleur': 'logo-vertical_fond-clair', 'vertical-sombre': 'logo-vertical_fond-sombre', 'symbole-couleur': 'symbole', 'symbole-sombre': 'symbole' };
const MIDX = {}; for (const [a, b] of Object.entries(MAP)) { fs.copyFileSync(file(b), `${MK}/piste-F3/${a}.svg`); MIDX[`F3/${a}`] = IDX[k(b)]; }
X.setLogos(MK, MIDX); X.setHScale('F3', 1.18);
const P = { ...PV2.B, id: 'F3', c: { ...PV2.B.c, acc: '#A94E25', bgSoft: '#E8DAC2' }, visual: (w, h) => panorama(w, h, { road: h > 200, foreground: h > 150 }), vanBody: '#F3E8D6', vanTheme: 'couleur', vanTxt: '#2F4A2B', vanLogo: [130, 150, 440, 104] };
const FONTS = `@font-face{font-family:Fraunces;src:url(${S}/fonts/Fraunces-normal.woff2);font-weight:100 900}@font-face{font-family:Fraunces;src:url(${S}/fonts/Fraunces-italic.woff2);font-weight:100 900;font-style:italic}@font-face{font-family:DMSans;src:url(${S}/fonts/DMSans-normal.woff2);font-weight:100 1000}@font-face{font-family:Jost;src:url(${S}/fonts/Jost-normal.woff2);font-weight:100 900}@font-face{font-family:Brico;src:url(${S}/fonts/Bricolage-normal.woff2);font-weight:200 800}`;
const H = "font-family:Fraunces;font-weight:600;font-variation-settings:'SOFT' 100,'opsz' 72;color:#2F4A2B";
const cap = t => `<div style="position:absolute;left:22px;bottom:16px;font:600 12px DMSans;letter-spacing:.16em;text-transform:uppercase;color:rgba(47,74,43,.6)">${t}</div>`;
const capL = t => `<div style="position:absolute;left:22px;bottom:16px;font:600 12px DMSans;letter-spacing:.16em;text-transform:uppercase;color:rgba(255,255,255,.65)">${t}</div>`;
const planche = `<div style="width:1920px;height:1080px;background:#EDE1CC;position:relative;font-family:DMSans">
  <div style="position:absolute;left:72px;top:46px;font:700 13px DMSans;letter-spacing:.22em;text-transform:uppercase;color:#A94E25">Aperçu · B1 « Potager au lever du jour » + typographie T3</div>
  <div style="position:absolute;left:72px;right:72px;top:90px;height:470px;background:#F3E8D6;border-radius:8px;display:flex;align-items:center;justify-content:center">${fit('logo-horizontal_fond-clair', 1250, 300)}${cap('Logo horizontal · fond clair')}</div>
  <div style="position:absolute;left:72px;right:72px;top:580px;bottom:60px;display:grid;grid-template-columns:1fr 1.5fr 0.8fr 0.8fr;gap:16px">
    <div style="background:#F3E8D6;border-radius:8px;position:relative;display:flex;align-items:center;justify-content:center">${fit('logo-vertical_fond-clair', 300, 360)}${cap('Vertical empilé')}</div>
    <div style="background:#2F4A2B;border-radius:8px;position:relative;display:flex;align-items:center;justify-content:center">${fit('logo-horizontal_fond-sombre', 560, 150)}${capL('Horizontal · fond sombre')}</div>
    <div style="background:#fff;border-radius:8px;position:relative;display:flex;align-items:center;justify-content:center">${fit('symbole', 220, 300)}${cap('Symbole seul')}</div>
    <div style="background:#fff;border-radius:8px;position:relative;display:flex;align-items:center;justify-content:center"><div style="width:250px;height:250px;border-radius:50%;background:#F3E8D6;display:flex;align-items:center;justify-content:center;box-shadow:0 0 0 5px #fff,0 6px 18px rgba(0,0,0,.18)">${fit('symbole', 150, 205)}</div>${cap('Photo de profil')}</div></div></div>`;
const situ = `<div style="width:1920px;height:1080px;background:#E8DAC2;position:relative">
  <div style="position:absolute;left:72px;top:46px;font:700 13px DMSans;letter-spacing:.22em;text-transform:uppercase;color:#A94E25">Aperçu · B1 + T3 en situation</div>
  <div style="position:absolute;left:60px;top:100px;transform:scale(.68);transform-origin:top left">${X.browser(P, 1180)}</div>
  <div style="position:absolute;left:1000px;top:560px;transform:scale(.58);transform-origin:top left">${X.van(P, 1500)}</div>
  <div style="position:absolute;right:110px;top:90px;transform:scale(.62);transform-origin:top right">${X.phone(P, X.phoneShop(P), { w: 340, h: 700 })}</div>
  <div style="position:absolute;left:40px;top:610px;transform:scale(.5);transform-origin:top left">${X.stationery(P)}</div></div>`;
(async () => {
  fs.mkdirSync(OUT, { recursive: true });
  const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 1920, height: 1080 }, deviceScaleFactor: 2 });
  for (const [n, html] of [['B1-T3_planche-logo.png', planche], ['B1-T3_mises-en-situation.png', situ]]) {
    fs.writeFileSync(`${S}/work/_b1t3.html`, `<!doctype html><html><head><meta charset="utf-8"><style>${FONTS}*{margin:0;padding:0;box-sizing:border-box}img{display:block}</style></head><body>${html}</body></html>`);
    await p.goto('file://' + `${S}/work/_b1t3.html`); await p.evaluate(() => document.fonts.ready); await p.waitForTimeout(400);
    await p.screenshot({ path: `${OUT}/${n}`, clip: { x: 0, y: 0, width: 1920, height: 1080 } });
  }
  await b.close(); console.log('ok');
})();
