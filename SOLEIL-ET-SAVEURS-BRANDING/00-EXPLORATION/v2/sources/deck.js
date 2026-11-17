// Présentation v2 : diapositives 1920 x 1080 → PNG + PDF
// Usage : node deck.js <scratchpad> <dossier logos> <dossier sortie> [filtre de diapositives]
const fs = require('fs');
const { chromium } = require('playwright');
const P = require('./deck-data.js');
const X = require('./mockups.js');
const M = require('./marks2.js');
const [, , S, D, OUT, ONLY] = process.argv;
const IDX = JSON.parse(fs.readFileSync(`${S}/work/lockups-index.json`, 'utf8'));
X.setLogos(D, IDX);
const f = n => +(+n).toFixed(2);

const FONTS = `
@font-face{font-family:Corm;src:url(${S}/fonts/CormorantGaramond-normal.woff2);font-weight:300 700}
@font-face{font-family:Corm;src:url(${S}/fonts/CormorantGaramond-italic.woff2);font-weight:300 700;font-style:italic}
@font-face{font-family:Jost;src:url(${S}/fonts/Jost-normal.woff2);font-weight:100 900}
@font-face{font-family:Fraunces;src:url(${S}/fonts/Fraunces-normal.woff2);font-weight:100 900}
@font-face{font-family:Fraunces;src:url(${S}/fonts/Fraunces-italic.woff2);font-weight:100 900;font-style:italic}
@font-face{font-family:DMSans;src:url(${S}/fonts/DMSans-normal.woff2);font-weight:100 1000}
@font-face{font-family:Brico;src:url(${S}/fonts/Bricolage-normal.woff2);font-weight:200 800;font-stretch:75% 100%}`;
const CSS = `${FONTS}
@page{size:1920px 1080px;margin:0}
*{box-sizing:border-box;margin:0;padding:0}
html,body{background:#ddd}
body{-webkit-font-smoothing:antialiased;font-family:Jost}
.slide{width:1920px;height:1080px;position:relative;overflow:hidden;background:#F6F3EE;break-after:page}
.hdr{position:absolute;top:46px;left:96px;right:96px;display:flex;justify-content:space-between;font:500 12.5px Jost;letter-spacing:.22em;text-transform:uppercase;color:rgba(20,20,20,.5);z-index:5}
.hdr.light{color:rgba(255,255,255,.6)}
.lab{font:500 13px Jost;letter-spacing:.24em;text-transform:uppercase;color:rgba(20,20,20,.5)}
.cap{position:absolute;font:500 12px Jost;letter-spacing:.2em;text-transform:uppercase;color:rgba(20,20,20,.55)}
img{display:block}`;

let pageNo = 0;
const hdr = (left, light = false) => `<div class="hdr${light ? ' light' : ''}"><span>${left}</span><span>${String(++pageNo).padStart(2, '0')}</span></div>`;
const slide = (body, bg = '#F6F3EE', extra = '') => `<section class="slide" style="background:${bg};${extra}">${body}</section>`;
const noiseLayer = (op = 0.05) => X.layer(X.tex(X.NOISE(op), 240));

// ---------------- Illustrations « L'idée » ----------------
function illusA() {
  // Pomme coupée à l'horizontale : chair, peau, cœur en étoile, pépins
  // Cinq loges (carpelles) en étoile, un pépin brun dans chacune
  const seeds = [0, 72, 144, 216, 288].map(a => `<g transform="rotate(${a} 300 300)">
      <path d="M300 186 C324 214 330 262 300 292 C270 262 276 214 300 186Z" fill="#EFE0B0" stroke="#D2B677" stroke-width="2.5"/>
      <path d="M300 214 C314 228 316 252 300 266 C284 252 286 228 300 214Z" fill="#5A3417"/>
      <path d="M295 224 C297 234 297 246 296 254" stroke="#8A5A2E" stroke-width="2.5" fill="none" opacity=".7"/></g>`).join('');
  return `<svg viewBox="0 0 600 600" width="600" height="600" xmlns="http://www.w3.org/2000/svg">
    <defs><radialGradient id="ilA" cx="50%" cy="50%" r="50%"><stop offset="0" stop-color="#FBF3D6"/><stop offset=".75" stop-color="#F5E6B8"/><stop offset="1" stop-color="#EBD39A"/></radialGradient>
    <radialGradient id="ilAs"><stop offset="0" stop-color="#000" stop-opacity=".25"/><stop offset="1" stop-color="#000" stop-opacity="0"/></radialGradient></defs>
    <ellipse cx="300" cy="560" rx="230" ry="22" fill="url(#ilAs)"/>
    <circle cx="300" cy="300" r="250" fill="#B8352A"/><circle cx="300" cy="300" r="241" fill="#D9573C"/><circle cx="300" cy="300" r="236" fill="url(#ilA)"/>
    ${[0, 72, 144, 216, 288].map(a => `<path d="M300 300 L300 150" stroke="#E4CC8E" stroke-width="2" transform="rotate(${a + 36} 300 300)"/>`).join('')}
    <circle cx="300" cy="300" r="150" fill="none" stroke="#E6CF96" stroke-width="2" stroke-dasharray="3 8"/>
    ${seeds}<circle cx="300" cy="300" r="6" fill="#E2C98A"/>
  </svg>`;
}
function illusB() {
  return `<div style="position:relative;width:640px;height:600px;border-radius:320px 320px 0 0;overflow:hidden">${X.sceneB(640, 600)}</div>`;
}
function illusC() {
  // Pyramide de fruits « réalistes » : 4-3-2-1, le plus beau au sommet
  const r = 56, d = 2 * r + 4, h = d * Math.sqrt(3) / 2; let s = '';
  for (let row = 0; row < 4; row++) {
    const n = 4 - row;
    for (let i = 0; i < n; i++) {
      const cx = 320 + (i - (n - 1) / 2) * d, cy = 520 - row * h, top = row === 3;
      s += `<circle cx="${f(cx)}" cy="${f(cy)}" r="${r}" fill="url(#${top ? 'ilCg' : 'ilCo'})"/><circle cx="${f(cx - r*0.32)}" cy="${f(cy - r*0.36)}" r="${r*0.22}" fill="#fff" opacity=".22"/>
        <circle cx="${f(cx + r*0.05)}" cy="${f(cy - r*0.86)}" r="3" fill="${top ? '#9C7A1E' : '#8E4A1A'}" opacity=".6"/>`;
      if (top) s += `<path d="M${f(cx+3)} ${f(cy-r+4)} C${f(cx+8)} ${f(cy-r-26)} ${f(cx+36)} ${f(cy-r-44)} ${f(cx+70)} ${f(cy-r-38)} C${f(cx+58)} ${f(cy-r-8)} ${f(cx+30)} ${f(cy-r+8)} ${f(cx+3)} ${f(cy-r+4)}Z" fill="#4E7D36"/>`;
    }
  }
  return `<svg viewBox="0 0 640 600" width="640" height="600" xmlns="http://www.w3.org/2000/svg">
    <defs><radialGradient id="ilCo" cx="36%" cy="32%" r="72%"><stop offset="0" stop-color="#F6A35E"/><stop offset=".55" stop-color="#E06E2E"/><stop offset="1" stop-color="#A9461A"/></radialGradient>
    <radialGradient id="ilCg" cx="36%" cy="32%" r="72%"><stop offset="0" stop-color="#FFE08A"/><stop offset=".55" stop-color="#F3B33E"/><stop offset="1" stop-color="#C98418"/></radialGradient>
    <radialGradient id="ilCh"><stop offset="0" stop-color="#F3B33E" stop-opacity=".55"/><stop offset="1" stop-color="#F3B33E" stop-opacity="0"/></radialGradient>
    <radialGradient id="ilCs"><stop offset="0" stop-color="#000" stop-opacity=".3"/><stop offset="1" stop-color="#000" stop-opacity="0"/></radialGradient></defs>
    <circle cx="320" cy="${f(520 - 3*h)}" r="150" fill="url(#ilCh)"/>
    <ellipse cx="320" cy="586" rx="290" ry="18" fill="url(#ilCs)"/>${s}</svg>`;
}

// ---------------- Construction ----------------
function construction(id) {
  const g = 'stroke="#D2386C" stroke-width="0.25" fill="none"', gd = 'stroke="#D2386C" stroke-width="0.25" fill="none" stroke-dasharray="1.1 1.1"';
  const t = (x, y, s, a = 'start') => `<text x="${x}" y="${y}" font-size="2.5" fill="#D2386C" font-family="Jost" letter-spacing=".05" text-anchor="${a}">${s}</text>`;
  let vb, inner, guides;
  if (id === 'A') {
    const G = M.A_GEOM; vb = '-14 -8 128 120';
    inner = M.markA();
    guides = `<circle cx="50" cy="55" r="${G.R}" ${g}/><circle cx="50" cy="55" r="${G.t}" ${gd}/><circle cx="50" cy="55" r="${G.c}" ${gd}/>
      ${[0, 72, 144, 216, 288].map(a => `<line x1="50" y1="55" x2="50" y2="6" transform="rotate(${a} 50 55)" ${gd}/>`).join('')}
      <line x1="-8" y1="55" x2="108" y2="55" ${g}/><line x1="50" y1="-4" x2="50" y2="106" ${g}/>
      ${t(95, 52, 'Ø 86')}${t(78, 25, 'R 35,6')}${t(62, 72, 'R 15,4')}${t(53, 107, '5 × 72°')}${t(70, 4, 'feuille')}`;
  } else if (id === 'B') {
    vb = '-18 -4 136 132'; inner = M.markB({ id: 'cB' });
    guides = `<circle cx="50" cy="52" r="36" ${gd}/><circle cx="52" cy="70" r="19" ${gd}/><circle cx="74" cy="101.5" r="22" ${gd}/><circle cx="32" cy="109" r="28" ${gd}/>
      <line x1="-10" y1="52" x2="110" y2="52" ${g}/><line x1="50" y1="2" x2="50" y2="124" ${g}/><line x1="14" y1="122" x2="14" y2="6" ${gd}/><line x1="86" y1="122" x2="86" y2="6" ${gd}/><line x1="-10" y1="116" x2="110" y2="116" ${g}/>
      ${t(88, 40, 'arche R 36')}${t(53, 49, 'soleil R 19')}${t(97, 96, 'fruit R 22')}${t(-16, 86, 'fruit R 28')}${t(-16, 120, 'base')}`;
  } else {
    const C = M.C_GEOM; vb = '-12 -8 124 116'; inner = M.markC();
    const pts = [[-1,0],[0,0],[1,0],[-0.5,1],[0.5,1],[0,2]];
    guides = `<path d="M${f(50 - C.d)} ${f(C.y0)} L${f(50 + C.d)} ${f(C.y0)} L50 ${f(C.y0 - 2*C.h)}Z" ${g}/>
      ${pts.map(([i, j]) => `<circle cx="${f(50 + i*C.d)}" cy="${f(C.y0 - j*C.h)}" r="${f(C.r + C.gap/2)}" ${gd}/><circle cx="${f(50 + i*C.d)}" cy="${f(C.y0 - j*C.h)}" r="0.55" fill="#D2386C"/>`).join('')}
      <line x1="-8" y1="${f(C.y0)}" x2="108" y2="${f(C.y0)}" ${g}/><line x1="50" y1="-6" x2="50" y2="104" ${g}/>
      ${t(98, f(C.y0 + 6), '6 × R 14,2')}${t(67, 14, 'triangle équilatéral')}${t(-10, 104, 'espacement constant 2,7')}`;
  }
  return `<svg viewBox="${vb}" width="100%" height="100%" xmlns="http://www.w3.org/2000/svg"><g opacity=".9">${inner}</g>${guides}</svg>`;
}

// ---------------- Diapositives d'une piste ----------------
function pisteSlides(p) {
  const c = p.c, L = `Piste ${p.id} · ${p.nom}`;
  const out = [];
  // 1. Ouverture
  out.push(slide(`${hdr(`Soleil et Saveurs · Nouvelle identité`, true)}
    <div style="position:absolute;inset:0;display:flex;align-items:center;justify-content:center">
      <img src="${X.markSrc(p.id, 'sombre')}" style="height:${p.id === 'B' ? 470 : 400}px"></div>
    <div style="position:absolute;left:96px;bottom:84px;color:${c.paper}">
      <div style="${p.label};font-size:15px;color:${c.accLight};opacity:.95">Piste ${p.id} · ${p.registre}</div>
      <div style="${p.head};font-size:84px;line-height:1;margin-top:16px">${p.nom}</div></div>
    <div style="position:absolute;right:96px;bottom:92px;display:flex;gap:12px">${p.keywords.map(k => `<span style="${p.label};font-size:12px;color:${c.paper};border:1px solid ${c.paper}55;border-radius:40px;padding:10px 18px">${k}</span>`).join('')}</div>`, c.dark));
  // 2. L'idée
  out.push(slide(`${hdr(L)}
    <div style="position:absolute;left:96px;top:170px;width:820px">
      <div class="lab">L'idée</div>
      <div style="${p.head};font-size:${p.id === 'A' ? 60 : 54}px;line-height:1.12;color:${c.ink};margin-top:28px">${p.idee}</div>
      <div style="${p.body};font-size:21px;line-height:1.6;color:${c.ink};opacity:.78;margin-top:34px;max-width:720px">${p.idee2}</div>
      <div style="margin-top:46px;display:grid;grid-template-columns:1fr 1fr;gap:18px 40px;max-width:780px">${p.sens.map(([a, b]) => `<div style="border-top:1px solid ${c.ink}26;padding-top:14px"><div style="${p.label};font-size:11.5px;color:${c.acc}">${a}</div><div style="${p.body};font-size:17px;color:${c.ink};margin-top:6px">${b}</div></div>`).join('')}</div></div>
    <div style="position:absolute;right:96px;top:150px;bottom:110px;width:820px;display:flex;align-items:center;justify-content:center;gap:56px">
      <div style="transform:scale(${p.id === 'B' ? 0.72 : 0.76});transform-origin:center;margin:-80px">${p.id === 'A' ? illusA() : p.id === 'B' ? illusB() : illusC()}</div>
      <div style="font:300 54px Jost;color:${c.ink};opacity:.35">→</div>
      <img src="${X.markSrc(p.id, 'couleur')}" style="height:${p.id === 'B' ? 300 : 250}px"></div>
    <div class="cap" style="right:96px;bottom:70px">De l'observation au symbole</div>`, c.paper === '#FBF6EC' ? '#F7F1E4' : c.paper));
  // 3. Le logo
  out.push(slide(`${hdr(L)}${noiseLayer(0.035)}
    <div style="position:absolute;inset:0;display:flex;align-items:center;justify-content:center">${X.logo(p.id, 'horizontal', 'couleur', { w: p.id === 'A' ? 1200 : p.id === 'B' ? 1040 : 1080 })}</div>
    <div class="cap" style="left:96px;bottom:70px">Logo principal horizontal · fond clair</div>`, c.paper));
  // 4. Construction, zone de protection, tailles minimales
  const unit = p.id === 'A' ? 0.25 * 0.86 : p.id === 'B' ? 0.72 / 3 : 0.284; // en fraction de hauteur de symbole (approx. pour l'illustration)
  const xr = p.id === 'A' ? 0.215 : p.id === 'B' ? 0.2 : 0.3; const ar = X.logoW(p.id, 'horizontal', 'couleur', 100) / 100; const hl = Math.min(150, Math.floor(820 / (ar + 2 * xr))), xs = Math.round(hl * xr);
  out.push(slide(`${hdr(L)}
    <div style="position:absolute;left:96px;top:150px;width:760px;height:800px;background:#fff;border-radius:4px;padding:40px">${construction(p.id)}<div class="cap" style="left:30px;bottom:24px;color:#D2386C">Construction géométrique</div></div>
    <div style="position:absolute;left:920px;top:150px;right:96px">
      <div class="lab">Zone de protection</div>
      <div style="margin-top:26px;height:${hl + 2 * xs + 60}px;background:#fff;border-radius:4px;display:flex;align-items:center;justify-content:center">
        <div style="position:relative;padding:${xs}px;outline:1.5px dashed #D2386C;background:repeating-linear-gradient(45deg,#D2386C10 0 6px,transparent 6px 12px)">
          <div style="background:#fff">${X.logo(p.id, 'horizontal', 'couleur', { h: hl })}</div>
          <span style="position:absolute;left:4px;top:${xs / 2 - 9}px;font:500 13px Jost;color:#D2386C">x</span><span style="position:absolute;right:${xs / 2 - 4}px;top:4px;font:500 13px Jost;color:#D2386C">x</span></div></div>
      <div style="${p.body};font-size:16px;color:#444;margin-top:14px">${p.protection}. Aucun élément ne doit entrer dans cette zone.</div>
      <div class="lab" style="margin-top:52px">Tailles minimales</div>
      <div style="margin-top:22px;display:grid;grid-template-columns:repeat(3,1fr);gap:16px">${p.mini.map(([k, v], i) => `<div style="background:#fff;border-radius:4px;padding:26px 22px;height:200px;display:flex;flex-direction:column;justify-content:space-between">
        <div style="height:70px;display:flex;align-items:center">${i === 0 ? X.logo(p.id, 'horizontal', 'couleur', { w: parseInt(v.split('·')[1]) }) : i === 1 ? X.logo(p.id, 'vertical', 'couleur', { w: parseInt(v.split('·')[1]) }) : `<img src="${X.markSrc(p.id, p.id === 'A' ? 'plein' : 'couleur')}" style="height:${parseInt(v.split('·')[1])}px">`}</div>
        <div><div style="${p.body};font-size:14px;color:#333;font-weight:500">${k}</div><div style="font:400 14px Jost;color:#777;margin-top:4px">${v}</div></div></div>`).join('')}</div>
      <div style="font:400 13px Jost;color:#888;margin-top:12px">Exemples affichés à leur taille minimale réelle à l'écran.</div></div>`));
  // 5. Déclinaisons
  const tile = (bg, inner, cap, col = 'rgba(20,20,20,.5)') => `<div style="position:relative;background:${bg};border-radius:4px;display:flex;align-items:center;justify-content:center;overflow:hidden">${inner}<div class="cap" style="left:22px;bottom:18px;color:${col}">${cap}</div></div>`;
  out.push(slide(`${hdr(L)}
    <div style="position:absolute;left:96px;right:96px;top:110px;bottom:70px;display:grid;grid-template-columns:1.25fr 1fr 1fr;grid-template-rows:1fr 1fr;gap:16px">
      ${tile(c.paper, X.logo(p.id, 'vertical', 'couleur', { h: p.id === 'A' ? 290 : 300 }), 'Logo vertical · fond clair')}
      ${tile(c.dark, X.logo(p.id, 'horizontal', 'sombre', { w: 430 }), 'Horizontal · fond sombre', 'rgba(255,255,255,.6)')}
      ${tile(c.dark, X.logo(p.id, 'vertical', 'sombre', { h: 250 }), 'Vertical · fond sombre', 'rgba(255,255,255,.6)')}
      ${tile('#fff', X.logo(p.id, 'horizontal', 'noir', { w: 470 }), 'Monochrome noir')}
      ${tile('#111', X.logo(p.id, 'horizontal', 'blanc', { w: 430 }), 'Monochrome blanc', 'rgba(255,255,255,.6)')}
      ${tile(p.id === 'A' ? c.acc : p.id === 'B' ? '#ECAD44' : c.acc, `<img src="${X.markSrc(p.id, p.id === 'A' ? 'blanc' : p.id === 'B' ? 'couleur' : 'blanc')}" style="height:200px">`, 'Symbole seul · fond couleur', 'rgba(255,255,255,.75)')}
    </div>`));
  // 6. Couleurs et typographie
  const light = h => ['#F4EEE3', '#F3E8D6', '#FBF6EC', '#D9B66A', '#ECAD44', '#F3B33E', '#9CC37A'].includes(h);
  out.push(slide(`${hdr(L)}
    <div style="position:absolute;left:96px;top:130px;width:1000px">
      <div class="lab">Couleurs</div>
      <div style="margin-top:26px;display:flex;height:640px;border-radius:4px;overflow:hidden">${p.pal.map((k, i) => `<div style="flex:${i === 0 ? 2.1 : 1};background:${k.hex};color:${light(k.hex) ? '#222' : '#fff'};padding:30px 26px;display:flex;flex-direction:column;justify-content:flex-end;${k.hex.startsWith('#F') ? 'box-shadow:inset 0 0 0 1px #00000014' : ''}">
        <div style="${p.head};font-size:${i === 0 ? 34 : 26}px;line-height:1.05">${k.nom}</div>
        <div style="font:500 13px Jost;letter-spacing:.08em;margin-top:14px;line-height:1.75">${k.hex}<br>RVB ${k.rvb}</div>
        <div style="font:400 13px Jost;opacity:.8;margin-top:12px;line-height:1.45">${k.role}</div></div>`).join('')}</div>
      <div style="font:400 13px Jost;color:#888;margin-top:14px">Valeurs CMJN et Pantone calculées avec l'imprimeur lors de la finalisation (dépendent du papier et du profil d'impression).</div></div>
    <div style="position:absolute;left:1160px;top:130px;right:96px">
      <div class="lab">Typographie</div>
      ${p.typo.map(t => `<div style="margin-top:26px;border-top:1px solid #00000020;padding-top:24px">
        <div style="font:500 11.5px Jost;letter-spacing:.2em;text-transform:uppercase;color:#888">${t.role}</div>
        <div style="${t.css};font-size:56px;color:${c.ink};margin-top:10px;line-height:1.05">${t.nom}</div>
        <div style="${t.css};font-size:23px;color:${c.ink};opacity:.85;margin-top:10px;line-height:1.35">Aa Bb Cc Éé Èè Êê Çç Àà Ôô Œœ<br>0123456789 € &amp; « » ! ?</div>
        <div style="font:400 14.5px Jost;color:#555;margin-top:14px;line-height:1.55">${t.detail}</div>
        <div style="font:500 13.5px Jost;color:#2E7D4F;margin-top:8px">✓ ${t.lic} — usage commercial libre et gratuit</div></div>`).join('')}</div>`));
  // 7. Site web + mobile
  out.push(slide(`${hdr(L)}
    <div style="position:absolute;inset:0;display:flex;align-items:center;justify-content:center;gap:60px;padding-top:30px">${X.browser(p, 1180)}${X.phone(p, X.phoneShop(p), { w: 340, h: 700 })}</div>
    <div class="cap" style="left:96px;bottom:46px">Site internet · ordinateur et mobile</div>`, c.bgSoft));
  // 8. Camionnette
  out.push(slide(`${hdr(L)}
    <div style="position:absolute;left:0;right:0;bottom:0;height:300px;background:linear-gradient(180deg,#D9D3C8,#CFC8BB)"></div>
    <div style="position:absolute;left:210px;top:230px">${X.van(p, 1500)}</div>
    <div class="cap" style="left:96px;bottom:46px">Véhicule de livraison</div>`, '#ECE7DF'));
  // 9. Emballages
  out.push(slide(`${hdr(L)}${noiseLayer(0.04)}
    <div style="position:absolute;left:150px;top:300px">${X.kraftBag(p, 400)}</div>
    <div style="position:absolute;left:660px;top:330px">${X.crate(p, 720)}</div>
    <div style="position:absolute;left:1440px;top:420px">${X.appleSticker(p, 380)}</div>
    <div class="cap" style="left:96px;bottom:46px">Sac kraft · étiquette de cagette · étiquette de fruit</div>`, '#E9E3D8'));
  // 10. Papeterie
  out.push(slide(`${hdr(L)}${noiseLayer(0.035)}
    <div style="position:absolute;left:210px;top:150px">${X.stationery(p)}</div>
    <div class="cap" style="left:96px;bottom:46px">Papeterie · papier à en-tête, enveloppe, cartes de visite</div>`, '#E4DED4'));
  // 11. Réseaux sociaux et application
  out.push(slide(`${hdr(L)}
    <div style="position:absolute;left:180px;top:150px">${X.phone(p, X.phoneSocial(p), { w: 360, h: 760 })}</div>
    <div style="position:absolute;left:720px;top:190px;right:96px;bottom:110px;display:grid;grid-template-columns:1fr 1fr;gap:20px">
      <div style="background:linear-gradient(160deg,${c.dark},${c.ink});border-radius:6px;display:flex;align-items:center;justify-content:center;flex-direction:column;gap:22px;position:relative">${X.appIcon(p, 260)}<div style="font:500 17px Jost;color:#fff">Soleil et Saveurs</div><div class="cap" style="left:22px;bottom:18px;color:rgba(255,255,255,.6)">Icône d'application</div></div>
      <div style="display:grid;grid-template-rows:1fr 1fr;gap:20px">
        <div style="background:#fff;border-radius:6px;display:flex;align-items:center;justify-content:center;gap:34px;position:relative">${[128, 96, 64, 40].map(s => X.appIcon(p, s, { light: true })).join('')}<div class="cap" style="left:22px;bottom:18px">Icône claire · réductions</div></div>
        <div style="background:#fff;border-radius:6px;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:24px;position:relative">
          <div style="display:flex;align-items:center;gap:10px;background:#EDEBE7;border-radius:10px 10px 0 0;padding:12px 18px;font:400 15px Jost;color:#333;width:330px"><img src="${X.markSrc(p.id, p.id === 'A' ? 'plein' : 'couleur')}" style="height:18px">Soleil et Saveurs<span style="margin-left:auto;color:#999">×</span></div>
          <div style="display:flex;align-items:flex-end;gap:26px">${[48, 32, 24, 16].map(s => `<img src="${X.markSrc(p.id, p.id === 'A' ? 'plein' : 'couleur')}" style="height:${s}px">`).join('')}</div>
          <div class="cap" style="left:22px;bottom:18px">Favicon · 48 → 16 px</div></div></div></div>
    <div class="cap" style="left:96px;bottom:46px">Réseaux sociaux · application · favicon</div>`, c.bgSoft));
  // 12. Synthèse
  out.push(slide(`${hdr(L)}
    <div style="position:absolute;left:96px;top:150px;width:700px">
      <div class="lab">Synthèse</div>
      <div style="${p.head};font-size:64px;line-height:1.05;color:${c.ink};margin-top:24px">${p.nom}</div>
      <div style="${p.body};font-size:23px;line-height:1.55;color:${c.ink};opacity:.85;margin-top:30px">${p.pourQui}</div>
      <div style="margin-top:56px;display:flex;align-items:center;gap:40px">${X.logo(p.id, 'horizontal', 'couleur', { w: 520 })}</div></div>
    <div style="position:absolute;left:940px;top:150px;right:96px">
      <div class="lab">Forces</div>
      <ul style="list-style:none;margin-top:16px">${p.plus.map(s => `<li style="font:400 19px Jost;line-height:1.45;padding:14px 0;border-bottom:1px solid #00000018;display:flex;gap:16px;color:#222"><span style="color:#2E7D4F;font-weight:600">+</span>${s}</li>`).join('')}</ul>
      <div class="lab" style="margin-top:50px">Limites et vigilance</div>
      <ul style="list-style:none;margin-top:16px">${p.moins.map(s => `<li style="font:400 19px Jost;line-height:1.45;padding:14px 0;border-bottom:1px solid #00000018;display:flex;gap:16px;color:#222"><span style="color:#B3412A;font-weight:600">−</span>${s}</li>`).join('')}</ul></div>`));
  return out;
}

// ---------------- Diapositives communes ----------------
function cover() {
  return slide(`${hdr('Soleil et Saveurs · Refonte de l\'identité visuelle')}${noiseLayer(0.035)}
    <div style="position:absolute;left:96px;top:200px">
      <div class="lab">Novembre 2026 · Propositions perfectionnées</div>
      <div style="font:600 112px Corm;line-height:.95;color:#1F2A22;margin-top:30px">Soleil et Saveurs</div>
      <div style="font:400 30px Jost;color:#1F2A22;opacity:.7;margin-top:22px">Nouvelle identité visuelle · trois propositions</div></div>
    <div style="position:absolute;left:96px;right:96px;bottom:110px;display:grid;grid-template-columns:repeat(3,1fr);gap:24px">
      ${['A', 'B', 'C'].map(id => `<div style="background:${P[id].c.dark};height:360px;border-radius:4px;position:relative;display:flex;align-items:center;justify-content:center">
        <img src="${X.markSrc(id, 'sombre')}" style="height:${id === 'B' ? 200 : 170}px">
        <div style="position:absolute;left:28px;bottom:24px;${P[id].label};font-size:12px;color:${P[id].c.accLight}">Piste ${id}</div>
        <div style="position:absolute;right:28px;bottom:22px;${P[id].head};font-size:24px;color:${P[id].c.paper}">${P[id].nom}</div></div>`).join('')}</div>`, '#F3EFE8');
}
function analyse() {
  return slide(`${hdr('Point de départ')}
    <div style="position:absolute;left:96px;top:160px;width:760px">
      <div class="lab">Le logo actuel</div>
      <div style="margin-top:26px;background:#fff;height:300px;border-radius:4px;display:flex;align-items:center;justify-content:center"><img src="/home/user/Soleil-et-Saveurs/public/email/logo.png" style="height:96px"></div>
      <div style="margin-top:30px;display:grid;grid-template-columns:1fr 1fr;gap:12px 30px;font:400 16px Jost;color:#333">
        ${[['Singularité', 1], ['Pertinence', 2], ['Mémorisation', 2], ['Typographie', 2], ['Couleurs', 2], ['Web et mobile', 2], ['Lisibilité réduite', 3], ['Reproduction', 4]].map(([k, n]) => `<div style="display:flex;justify-content:space-between;border-bottom:1px solid #00000014;padding:8px 0"><span>${k}</span><span>${[1, 2, 3, 4, 5].map(i => `<i style="display:inline-block;width:10px;height:10px;border-radius:50%;margin-left:5px;background:${i <= n ? '#2b2b2b' : '#d9d3c8'}"></i>`).join('')}</span></div>`).join('')}</div></div>
    <div style="position:absolute;left:960px;top:160px;right:96px">
      <div class="lab">Ce que la marque a à dire</div>
      <div style="font:600 64px Corm;line-height:1.05;color:#1F2A22;margin-top:24px">« Le soleil se goûte. »</div>
      <div style="font:400 20px Jost;line-height:1.6;color:#333;margin-top:24px">Le soleil mûrit le fruit, le primeur choisit le meilleur, Soleil et Saveurs le livre. Votre site le dit déjà (« choisis à maturité », « chaque pièce vérifiée », « livré chez vous ») ; le logo actuel n'en montre presque rien : son soleil est le pictogramme « météo » des applications.</div>
      <div class="lab" style="margin-top:44px">Territoire à éviter</div>
      <div style="font:400 18px Jost;line-height:1.6;color:#333;margin-top:14px">Soleil-pictogramme · orange coupée en soleil · assemblage feuille + soleil + fruit · panier en osier · écritures manuscrites ou rustiques · dégradés.</div></div>`);
}
function compare() {
  const crit = [['Lisibilité en petite taille', 4, 3, 5], ['Mémorisation', 4, 3, 5], ['Singularité', 4, 3, 5], ['Perception premium', 5, 3, 4], ['Chaleur, gourmandise', 2, 5, 4], ['Évocation fruits et légumes', 3, 5, 4], ['Simplicité de reproduction', 4, 2, 5]];
  const dots = n => [1, 2, 3, 4, 5].map(i => `<i style="display:inline-block;width:12px;height:12px;border-radius:50%;margin-right:6px;background:${i <= n ? '#2b2b2b' : '#d9d3c8'}"></i>`).join('');
  return slide(`${hdr('Comparatif')}
    <div style="position:absolute;left:96px;right:96px;top:120px;display:grid;grid-template-columns:repeat(3,1fr);gap:24px">
      ${['A', 'B', 'C'].map(id => { const p = P[id]; return `<div style="background:#fff;border-radius:4px;overflow:hidden">
        <div style="height:230px;background:${p.c.paper};display:flex;align-items:center;justify-content:center">${X.logo(id, 'horizontal', 'couleur', { w: 440 })}</div>
        <div style="height:120px;background:${p.c.dark};display:flex;align-items:center;justify-content:center">${X.logo(id, 'horizontal', 'sombre', { w: 340 })}</div>
        <div style="display:flex;height:22px">${p.pal.map(k => `<div style="flex:1;background:${k.hex}"></div>`).join('')}</div>
        <div style="padding:22px 26px"><div style="${p.label};font-size:11.5px;color:${p.c.acc}">Piste ${id} · ${p.registre}</div><div style="${p.head};font-size:30px;color:${p.c.ink};margin-top:6px">${p.nom}</div></div></div>`; }).join('')}</div>
    <div style="position:absolute;left:96px;right:96px;top:660px">
      <table style="width:100%;border-collapse:collapse;font:400 17px Jost;color:#333">
        <tr style="font:500 12px Jost;letter-spacing:.18em;text-transform:uppercase;color:#888"><td style="padding:6px 0">Avis du directeur artistique</td><td>A</td><td>B</td><td>C</td></tr>
        ${crit.map(([k, a, b, d]) => `<tr style="border-top:1px solid #00000014"><td style="padding:11px 0">${k}</td><td>${dots(a)}</td><td>${dots(b)}</td><td>${dots(d)}</td></tr>`).join('')}</table></div>`);
}
function next() {
  return slide(`${hdr('Prochaines étapes')}
    <div style="position:absolute;left:96px;top:180px;width:1100px">
      <div class="lab">Après votre choix</div>
      <div style="font:600 68px Corm;line-height:1.05;color:#1F2A22;margin-top:24px">Une piste, puis le kit complet.</div>
      <ol style="list-style:none;margin-top:50px;counter-reset:n">${[['Ajustements', 'Retours sur la piste retenue : couleur, typographie, détails du symbole.'], ['Fichiers sources', 'SVG maîtres (texte vectorisé et version texte éditable), PDF vectoriels, EPS.'], ['Exports', 'PNG transparents 1x, 2x, 4x ; favicons 16 à 512 px ; icônes d\'application.'], ['Charte graphique', 'Règles d\'usage, couleurs HEX / RVB / CMJN, typographies, interdits, exemples.'], ['Mise en ligne', 'Intégration du nouveau logo et du favicon sur soleiletsaveurs.fr.']].map(([a, b], i) => `<li style="display:flex;gap:28px;padding:20px 0;border-bottom:1px solid #00000016"><span style="font:500 15px Jost;color:#999;width:30px">0${i + 1}</span><span style="font:500 20px Jost;color:#222;width:240px">${a}</span><span style="font:400 19px Jost;color:#555">${b}</span></li>`).join('')}</ol></div>
    <div style="position:absolute;left:96px;bottom:70px;right:96px;font:400 14px Jost;color:#777;line-height:1.6">Aucune proposition n'est déclarée juridiquement disponible. Une recherche d'antériorité (INPI, EUIPO) est recommandée avant tout dépôt ou usage commercial.</div>`, '#F3EFE8');
}

(async () => {
  fs.mkdirSync(OUT, { recursive: true });
  const slides = [cover(), analyse(), ...pisteSlides(P.A), ...pisteSlides(P.B), ...pisteSlides(P.C), compare(), next()];
  const html = `<!doctype html><html lang="fr"><head><meta charset="utf-8"><style>${CSS}</style></head><body>${slides.join('\n')}</body></html>`;
  fs.writeFileSync(`${S}/work/deck.html`, html);
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1920, height: 1080 }, deviceScaleFactor: +(process.env.SCALE || 1) });
  await page.goto('file://' + `${S}/work/deck.html`); await page.evaluate(() => document.fonts.ready); await page.waitForTimeout(500);
  const n = await page.$$eval('section.slide', s => s.length);
  const only = ONLY ? ONLY.split(',').map(Number) : null;
  for (let i = 0; i < n; i++) {
    if (only && !only.includes(i + 1)) continue;
    const el = (await page.$$('section.slide'))[i];
    await el.screenshot({ path: `${OUT}/${String(i + 1).padStart(2, '0')}.png` });
  }
  if (process.env.PDF) await page.pdf({ path: process.env.PDF, width: '1920px', height: '1080px', printBackground: true, preferCSSPageSize: true });
  await browser.close();
  console.log(n, 'diapositives');
})();
