// Présentation « L'Horizon gourmand, version enrichie »
// Usage : node deckB.js <scratchpad> <logos> <sortie> [diapos]
const fs = require('fs'); const { chromium } = require('playwright');
const X = require('../mockups.js'); const PV2 = require('../deck-data.js');
const { panorama } = require('./panorama.js'); const { K } = require('./variants.js');
const [, , S, D, OUT, ONLY] = process.argv;
const IDX = JSON.parse(fs.readFileSync(`${S}/work/bvar-index.json`, 'utf8'));
X.setLogos(D, IDX);
const f = n => +(+n).toFixed(2);
const src = (id, k) => `${D}/piste-${id}/${k}.svg`;
const fit = (id, k, W, H, st = '') => { const v = IDX[`${id}/${k}`]; const a = v[2] / v[3]; const w = Math.min(W, H * a); return `<img src="${src(id, k)}" style="width:${f(w)}px;height:${f(w / a)}px;${st}">`; };
const base = PV2.B;
const PB = id => ({ ...base, id, c: { ...base.c, bgSoft: '#E8DAC2' }, visual: (w, h) => panorama(w, h, { road: h > 200, foreground: h > 150 }), vanBody: '#F3E8D6', vanTheme: 'couleur', vanTxt: '#2F4A2B', vanLogo: [150, 140, 400, 120] });
['B1', 'B2', 'B3', 'B4', 'B5', 'B6'].forEach(id => X.setHScale(id, 1));

const VAR = {
  B1: ['Le Potager au lever du jour', "Les collines deviennent des champs cultivés, le soleil se lève dans un halo, et l'horizon est un vrai étal : poireaux, chou, tomate, poire.", ['Halo du soleil en trois anneaux', 'Champs en plans successifs avec leurs sillons', 'Produits reconnaissables au premier plan', 'Sept couleurs harmonisées']],
  B2: ['Les Sillons', "Un soleil rayonnant au-dessus de champs labourés, des arbres de verger à l'horizon, et une pomme bien mûre au premier plan.", ['Rayons du soleil en éventail', 'Sillons qui donnent du rythme et de la matière', 'Verger à l\'horizon : le lien avec les producteurs', 'Une pomme héroïne, plus gourmande']],
  B3: ['La Gravure', "Le même paysage, traité comme une gravure d'étiquette ancienne : hachures, rayons fins, fruits au trait. Imprimable en une seule couleur.", ['Esprit épicerie fine et patrimoine', 'Version une couleur parfaite : tampon, sac kraft, marquage', 'Seul le soleil reste en couleur', 'Se décline en noir et en blanc']],
  B4: ['La Fenêtre des Halles', "L'arche devient la verrière d'une halle de marché. Les meneaux de l'éventail sont les rayons du soleil, et sous la traverse s'étale la vitrine du primeur.", ['Double lecture : soleil levant et verrière', "Clé de voûte d'or, cadre architectural premium", "L'étal coloré : tomates, abricots, poires, prunes, citrons", 'Le plus distinctif des six']],
  B5: ["L'Arche titrée", "Un emblème complet : le nom épouse la courbe de l'arche, le paysage enrichi est encadré, et un bandeau indique le métier et le territoire.", ['Badge prêt pour les emballages', 'Nom et symbole indissociables', 'Bandeau « Primeur · Yvelines (78) »', 'Effet label de qualité']],
  B6: ['Le Papier découpé', "Chaque plan est une feuille de papier découpée, avec son ombre portée : un relief chaleureux, très contemporain, qui donne de la profondeur au paysage.", ['Effet de relief tout en douceur', 'Quatre plans de collines et un halo étagé', 'Idéal en numérique : site, réseaux, vidéo', 'Une version à plat est prévue pour l\'impression']],
};

const FONTS = `@font-face{font-family:Fraunces;src:url(${S}/fonts/Fraunces-normal.woff2);font-weight:100 900}@font-face{font-family:Fraunces;src:url(${S}/fonts/Fraunces-italic.woff2);font-weight:100 900;font-style:italic}
@font-face{font-family:DMSans;src:url(${S}/fonts/DMSans-normal.woff2);font-weight:100 1000}@font-face{font-family:Jost;src:url(${S}/fonts/Jost-normal.woff2);font-weight:100 900}@font-face{font-family:Brico;src:url(${S}/fonts/Bricolage-normal.woff2);font-weight:200 800}`;
const HEAD = "font-family:Fraunces;font-weight:600;font-variation-settings:'SOFT' 100,'opsz' 72";
const CSS = `${FONTS}@page{size:1920px 1080px;margin:0}*{box-sizing:border-box;margin:0;padding:0}body{-webkit-font-smoothing:antialiased;font-family:DMSans}
.slide{width:1920px;height:1080px;position:relative;overflow:hidden;background:#F3E8D6;break-after:page}
.hdr{position:absolute;top:44px;left:72px;right:72px;display:flex;justify-content:space-between;font:600 12.5px DMSans;letter-spacing:.2em;text-transform:uppercase;color:rgba(47,74,43,.55);z-index:5}
.lab{font:600 12.5px DMSans;letter-spacing:.22em;text-transform:uppercase;color:#C2602D}
.cap{position:absolute;font:600 11.5px DMSans;letter-spacing:.18em;text-transform:uppercase;color:rgba(47,74,43,.6)}
.t{${HEAD};color:#2F4A2B}img{display:block}`;
let pageNo = 0; const hdr = (l, light = false) => `<div class="hdr" style="${light ? 'color:rgba(255,255,255,.75)' : ''}"><span>${l}</span><span>${String(++pageNo).padStart(2, '0')}</span></div>`;
const slide = (b, bg = '#F3E8D6') => `<section class="slide" style="background:${bg}">${b}</section>`;
const noise = (op = .035) => X.layer(X.tex(X.NOISE(op), 240));

function cover() {
  return slide(`<div style="position:absolute;inset:0">${panorama(1920, 1080)}</div>${hdr("Soleil et Saveurs · Piste B retenue", true)}
    <div style="position:absolute;left:96px;top:170px;color:#F3E8D6">
      <div style="font:600 14px DMSans;letter-spacing:.24em;text-transform:uppercase;opacity:.85">Perfectionnement · plusieurs améliorations</div>
      <div style="${HEAD};font-size:120px;line-height:.95;margin-top:22px">L'Horizon<br><em style="font-weight:480">gourmand,</em> enrichi.</div>
      <div style="font:400 24px DMSans;line-height:1.5;margin-top:26px;max-width:760px;opacity:.92">Six versions plus riches du symbole, quatre typographies, une palette élargie et une illustration de marque.</div></div>`);
}
function changes() {
  const cols = [['Le symbole', 'Six versions plus riches : des champs, des sillons, des produits reconnaissables, une gravure, une verrière de halle, un emblème, du relief.'], ['Le système', 'Une version détaillée pour les grands formats, une version simple pour les petits (favicon) et une version gravure en une couleur.'], ['La typographie', "Quatre réglages de Fraunces : actuel, à caractère, avec descripteur « Primeur », avec esperluette."], ['La couleur', 'Une palette élargie : la brique et le miel pour le halo, la tomate, la poire et la sauge claire pour les produits.'], ["L'illustration", 'Un vrai paysage de marque : du champ à votre porte, avec la camionnette sur la route. Pour le site, les sacs, le véhicule.']];
  return slide(`${hdr('Ce qui change')}
    <div style="position:absolute;left:72px;top:130px;width:620px">
      <div class="lab">Avant</div><div style="margin-top:20px;background:#fff;border-radius:6px;height:330px;display:flex;align-items:center;justify-content:center">${fit('Bs', 'symbole-couleur', 300, 260)}</div>
      <div style="font:400 17px DMSans;color:#555;margin-top:14px;line-height:1.5">La piste B d'origine : des collines en simples disques, un visuel trop épuré.</div>
      <div class="lab" style="margin-top:36px">Après</div>
      <div style="margin-top:20px;display:grid;grid-template-columns:repeat(6,1fr);gap:10px">${['B1', 'B2', 'B3', 'B4', 'B5', 'B6'].map(id => `<div style="background:#fff;border-radius:6px;height:140px;display:flex;align-items:center;justify-content:center">${fit(id, 'symbole-couleur', 80, 116)}</div>`).join('')}</div></div>
    <div style="position:absolute;left:780px;right:72px;top:130px">${cols.map(([t, d], i) => `<div style="display:flex;gap:28px;padding:26px 0;border-bottom:1px solid #2F4A2B22">
      <div style="font:600 14px DMSans;color:#C2602D;width:30px">0${i + 1}</div><div><div class="t" style="font-size:34px">${t}</div><div style="font:400 19px DMSans;line-height:1.55;color:#3c3c3c;margin-top:8px">${d}</div></div></div>`).join('')}</div>`);
}
function grid() {
  return slide(`${hdr('Six versions enrichies du symbole')}
    <div style="position:absolute;left:72px;right:72px;top:110px;bottom:60px;display:grid;grid-template-columns:repeat(3,1fr);grid-template-rows:1fr 1fr;gap:18px">
    ${Object.entries(VAR).map(([id, [nom]]) => `<div style="background:#fff;border-radius:6px;position:relative;display:flex;align-items:center;justify-content:center">${fit(id, 'symbole-couleur', 300, 360)}
      <div style="position:absolute;left:22px;bottom:18px"><span style="font:700 13px DMSans;color:#C2602D;letter-spacing:.1em">${id}</span> <span class="t" style="font-size:22px;margin-left:8px">${nom}</span></div></div>`).join('')}</div>`, '#EDE1CC');
}
function variant(id) {
  const [nom, desc, pts] = VAR[id];
  return slide(`<div style="position:absolute;left:0;top:0;width:900px;bottom:0;background:#EDE1CC">${noise()}</div>${hdr(`${id} · ${nom}`)}
    <div style="position:absolute;left:0;top:90px;width:900px;bottom:60px;display:flex;align-items:center;justify-content:center">${fit(id, 'symbole-couleur', 640, 820, 'filter:drop-shadow(0 30px 40px rgba(60,30,10,.18))')}</div>
    <div style="position:absolute;left:980px;right:80px;top:130px">
      <div class="lab">Version ${id}</div><div class="t" style="font-size:66px;line-height:1.02;margin-top:16px">${nom}</div>
      <div style="font:400 20px DMSans;line-height:1.6;color:#3c3c3c;margin-top:24px">${desc}</div>
      <ul style="list-style:none;margin-top:24px">${pts.map(p => `<li style="font:400 17.5px DMSans;color:#2F4A2B;padding:9px 0;border-bottom:1px solid #2F4A2B1c;display:flex;gap:14px"><span style="color:#C2602D">+</span>${p}</li>`).join('')}</ul>
      <div style="margin-top:34px;display:grid;grid-template-columns:1fr 1fr;gap:14px">
        <div style="background:#fff;border-radius:6px;height:170px;display:flex;align-items:center;justify-content:center">${fit(id, 'horizontal-couleur', 380, 92)}</div>
        <div style="background:#2F4A2B;border-radius:6px;height:170px;display:flex;align-items:center;justify-content:center">${id === 'B5' ? fit('B5', 'symbole-couleur', 200, 140) : fit(id, 'horizontal-sombre', 380, 92)}</div></div></div>`);
}
function systeme() {
  return slide(`${hdr('Un système, pas un seul dessin')}
    <div style="position:absolute;left:72px;top:120px;width:700px"><div class="lab">Logo adaptatif</div>
      <div class="t" style="font-size:58px;line-height:1.05;margin-top:16px">Riche quand on a la place, simple quand elle manque.</div>
      <div style="font:400 19px DMSans;line-height:1.6;color:#3c3c3c;margin-top:22px">La version détaillée sert aux grands formats : camionnette, sacs, site, affiches. Sous 40 px, on passe automatiquement à la version simple, pour un favicon toujours net. Pour le tampon, la gravure sur bois et l'impression une couleur, on utilise la version gravure.</div></div>
    <div style="position:absolute;left:840px;right:72px;top:150px;display:flex;gap:26px;align-items:flex-end">
      ${[['B1', 300, 'Détaillée · grands formats'], ['B1', 150, 'Détaillée · 150 px'], ['Bs', 80, 'Simple · moins de 40 px'], ['Bs', 32, ''], ['Bs', 16, 'favicon']].map(([id, h, l]) => `<div style="text-align:center">${fit(id, 'symbole-couleur', h, h * 1.4)}<div style="font:600 11px DMSans;letter-spacing:.12em;text-transform:uppercase;color:#888;margin-top:14px;height:14px">${l}</div></div>`).join('')}</div>
    <div style="position:absolute;left:840px;right:72px;top:650px;display:flex;gap:26px;align-items:center;background:#fff;border-radius:6px;padding:30px 40px">
      ${fit('B3', 'symbole-noir', 160, 200)}<div style="background:#111;padding:14px;border-radius:4px">${fit('B3', 'symbole-blanc', 140, 180)}</div>
      <div style="font:400 17px DMSans;line-height:1.55;color:#333;margin-left:16px"><b>Version gravure en une couleur</b><br>Pour le tampon, la sérigraphie, le marquage au fer et les sacs kraft. Toutes les nuances viennent des hachures.</div></div>`);
}
function typo() {
  const opts = [['t1', 'T1 · Actuelle', "Fraunces adoucie, « et » en italique. Chaleureuse et lisible."], ['t2', 'T2 · Caractère', "Fraunces en grande taille optique, avec ses lettres « bancales » : plus de personnalité, plus artisanal."], ['t3', 'T3 · Avec descripteur', "Ajoute « Primeur · fruits & légumes » sous le nom : on comprend le métier immédiatement."], ['t4', 'T4 · Esperluette', "« Soleil & Saveurs » : l'esperluette italique, comme une signature."]];
  return slide(`${hdr('Typographie : quatre réglages')}
    <div style="position:absolute;left:72px;right:72px;top:110px;bottom:60px;display:grid;grid-template-columns:1fr 1fr;grid-template-rows:1fr 1fr;gap:18px">
    ${opts.map(([k, t, d]) => `<div style="background:#fff;border-radius:6px;position:relative;padding:34px 40px;display:flex;flex-direction:column;justify-content:space-between">
      <div style="height:200px;display:flex;align-items:center">${fit('typo', k, 720, k === 't3' ? 150 : 120)}</div>
      <div><div class="t" style="font-size:26px">${t}</div><div style="font:400 16.5px DMSans;color:#555;margin-top:6px;line-height:1.5">${d}</div></div></div>`).join('')}</div>`, '#EDE1CC');
}
function palette() {
  const P = [['Vert olivier', K.olive, 'Textes, cadre, premier plan'], ['Olivier profond', K.oliveDeep, 'Fonds sombres, ombres'], ['Terre cuite', K.terra, 'Ciel, accents'], ['Brique', K.brick, 'Ciel profond, relief'], ['Halo', K.halo2, 'Halo du soleil'], ['Safran', K.saffron, 'Le soleil'], ['Miel', K.honey, 'Lumières, fonds clairs chauds'], ['Sauge', K.sage, 'Champs'], ['Sauge claire', K.sageL, 'Champs lointains'], ['Tomate', K.tomato, 'Produits, promotions'], ['Poire', K.pear, 'Produits, fraîcheur'], ['Lin', K.lin, 'Fond, papier, emballages']];
  const rgb = h => [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16)).join(' · ');
  const lt = h => { const [r, g, b] = [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16)); return 0.299 * r + 0.587 * g + 0.114 * b > 160; };
  return slide(`${hdr('Palette élargie')}
    <div style="position:absolute;left:72px;right:72px;top:110px"><div class="t" style="font-size:52px">Douze teintes, du lever du soleil à l'étal.</div></div>
    <div style="position:absolute;left:72px;right:72px;top:220px;bottom:70px;display:grid;grid-template-columns:repeat(6,1fr);grid-template-rows:1fr 1fr;gap:12px">
    ${P.map(([n, h, r]) => `<div style="background:${h};border-radius:6px;padding:22px;display:flex;flex-direction:column;justify-content:flex-end;color:${lt(h) ? '#2F4A2B' : '#fff'};${h === K.lin ? 'box-shadow:inset 0 0 0 1px #2F4A2B22' : ''}">
      <div style="${HEAD};font-size:24px">${n}</div><div style="font:600 12.5px DMSans;letter-spacing:.06em;margin-top:8px;line-height:1.6">${h}<br>RVB ${rgb(h)}</div><div style="font:400 12.5px DMSans;opacity:.85;margin-top:6px">${r}</div></div>`).join('')}</div>`);
}
function illustration() {
  return slide(`${hdr("L'illustration de marque")}
    <div style="position:absolute;left:72px;right:72px;top:110px;height:560px;border-radius:6px;overflow:hidden">${panorama(1776, 560)}</div>
    <div style="position:absolute;left:72px;top:700px;width:640px"><div class="t" style="font-size:44px;line-height:1.08">Du champ à votre porte.</div>
      <div style="font:400 18px DMSans;line-height:1.6;color:#3c3c3c;margin-top:16px">Le paysage du logo devient une grande illustration : le soleil se lève sur les vergers et les champs, la camionnette Soleil et Saveurs file sur la route, l'étal est au premier plan. Elle se recadre pour le site, les sacs, le véhicule et les réseaux.</div></div>
    <div style="position:absolute;left:780px;right:72px;top:700px;bottom:60px;display:grid;grid-template-columns:1.2fr 1fr 0.6fr;gap:14px">
      <div style="border-radius:6px;overflow:hidden;position:relative">${panorama(560, 320)}<div style="position:absolute;left:24px;top:22px">${fit('B1', 'horizontal-sombre', 300, 60)}</div></div>
      <div style="border-radius:6px;overflow:hidden">${panorama(440, 320, { road: false })}</div>
      <div style="border-radius:6px;overflow:hidden;position:relative">${panorama(260, 320)}</div></div>`);
}
function webMock() {
  const P = PB('B1');
  return slide(`${hdr('Site internet')}<div style="position:absolute;inset:0;display:flex;align-items:center;justify-content:center;gap:56px;padding-top:30px">${X.browser(P, 1180)}${X.phone(P, X.phoneShop(P), { w: 340, h: 700 })}</div>`, '#E8DAC2');
}
function vanMock() {
  const P = PB('B1');
  return slide(`${hdr('Véhicule de livraison')}<div style="position:absolute;left:0;right:0;bottom:0;height:300px;background:linear-gradient(180deg,#D9D3C8,#CFC8BB)"></div><div style="position:absolute;left:210px;top:230px">${X.van(P, 1500)}</div>`, '#ECE7DF');
}
function packMock() {
  const P3 = { ...PB('B3') }, P4 = PB('B4'), P1 = PB('B1');
  return slide(`${hdr('Emballages')}${noise(.04)}
    <div style="position:absolute;left:130px;top:300px">${X.kraftBag(P3, 380)}</div>
    <div style="position:absolute;left:600px;top:340px">${X.crate(P4, 720)}</div>
    <div style="position:absolute;left:1420px;top:300px">${X.appleSticker(P1, 330)}</div>
    <div style="position:absolute;left:1440px;top:640px;width:300px;height:300px;background:#F3E8D6;border-radius:50%;box-shadow:0 30px 50px -24px rgba(40,25,10,.5);display:flex;align-items:center;justify-content:center;transform:rotate(-6deg)">${fit('B5', 'symbole-couleur', 200, 240)}</div>
    <div class="cap" style="left:72px;bottom:44px">Sac kraft (gravure, une couleur) · cagette (Fenêtre des Halles) · étiquette de fruit (Potager) · autocollant (emblème)</div>`, '#E9E3D8');
}
function socialMock() {
  const P = PB('B1');
  return slide(`${hdr('Réseaux sociaux et application')}
    <div style="position:absolute;left:180px;top:150px">${X.phone(P, X.phoneSocial(P), { w: 360, h: 760 })}</div>
    <div style="position:absolute;left:720px;top:190px;right:96px;bottom:110px;display:grid;grid-template-columns:1fr 1fr;gap:20px">
      <div style="background:linear-gradient(160deg,#2F4A2B,#22371F);border-radius:6px;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:24px">
        <div style="width:260px;height:260px;border-radius:58px;background:#F3E8D6;display:flex;align-items:center;justify-content:center;box-shadow:0 20px 40px -10px rgba(0,0,0,.4)">${fit('B1', 'symbole-couleur', 170, 200)}</div><div style="font:500 17px DMSans;color:#fff">Soleil et Saveurs</div></div>
      <div style="display:grid;grid-template-rows:1fr 1fr;gap:20px">
        <div style="background:#fff;border-radius:6px;display:flex;align-items:center;justify-content:center;gap:30px">${[['B4', 128], ['B2', 96], ['B6', 72]].map(([id, s]) => `<div style="width:${s}px;height:${s}px;border-radius:${s * 0.22}px;background:#F3E8D6;display:flex;align-items:center;justify-content:center;box-shadow:inset 0 0 0 1px #0000000d">${fit(id, 'symbole-couleur', s * 0.62, s * 0.78)}</div>`).join('')}</div>
        <div style="background:#fff;border-radius:6px;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:22px">
          <div style="display:flex;align-items:center;gap:10px;background:#EDEBE7;border-radius:10px 10px 0 0;padding:12px 18px;font:400 15px DMSans;color:#333;width:330px">${fit('Bs', 'symbole-couleur', 16, 18)}Soleil et Saveurs<span style="margin-left:auto;color:#999">×</span></div>
          <div style="display:flex;gap:24px;align-items:flex-end">${[48, 32, 24, 16].map(s => fit('Bs', 'symbole-couleur', s, s * 1.4)).join('')}</div>
          <div style="font:600 11px DMSans;letter-spacing:.14em;text-transform:uppercase;color:#888">Favicon : version simple</div></div></div></div>`, '#E8DAC2');
}
function choix() {
  return slide(`${hdr('À vous de choisir')}${noise()}
    <div style="position:absolute;left:96px;top:150px;width:760px"><div class="lab">Votre choix</div>
      <div class="t" style="font-size:72px;line-height:1.02;margin-top:18px">Trois questions, puis le kit final.</div>
      <div style="font:400 20px DMSans;line-height:1.6;color:#3c3c3c;margin-top:26px">Tout se combine : par exemple, B4 comme logo principal, B3 pour l'impression une couleur, T3 pour la typographie et l'illustration pour le site.</div></div>
    <div style="position:absolute;left:940px;right:96px;top:150px">${[['1 · Le symbole', 'B1 Potager · B2 Sillons · B3 Gravure · B4 Fenêtre des Halles · B5 Arche titrée · B6 Papier découpé'], ['2 · La typographie', 'T1 Actuelle · T2 Caractère · T3 Avec descripteur · T4 Esperluette'], ["3 · L'illustration et la palette", 'Panorama « Du champ à votre porte » et palette de 12 teintes : on garde, on ajuste, ou on retire.']].map(([t, d]) => `<div style="background:#fff;border-radius:6px;padding:30px 34px;margin-bottom:18px"><div class="t" style="font-size:30px">${t}</div><div style="font:400 18px DMSans;color:#444;margin-top:10px;line-height:1.55">${d}</div></div>`).join('')}
      <div style="font:400 15px DMSans;color:#777;margin-top:16px;line-height:1.6">Ensuite : fichiers maîtres SVG, PDF, EPS, PNG, favicons, charte graphique complète (HEX, RVB, CMJN) et intégration sur le site.</div></div>`);
}

(async () => {
  fs.mkdirSync(OUT, { recursive: true });
  const slides = [cover(), changes(), grid(), ...Object.keys(VAR).map(variant), systeme(), typo(), palette(), illustration(), webMock(), vanMock(), packMock(), socialMock(), choix()];
  fs.writeFileSync(`${S}/work/deckB.html`, `<!doctype html><html lang="fr"><head><meta charset="utf-8"><style>${CSS}</style></head><body>${slides.join('\n')}</body></html>`);
  const browser = await chromium.launch(); const page = await browser.newPage({ viewport: { width: 1920, height: 1080 }, deviceScaleFactor: +(process.env.SCALE || 1) });
  await page.goto('file://' + `${S}/work/deckB.html`); await page.evaluate(() => document.fonts.ready); await page.waitForTimeout(600);
  const els = await page.$$('section.slide'); const only = ONLY ? ONLY.split(',').map(Number) : null;
  for (let i = 0; i < els.length; i++) { if (only && !only.includes(i + 1)) continue; await els[i].screenshot({ path: `${OUT}/${String(i + 1).padStart(2, '0')}.png` }); }
  if (process.env.PDF) await page.pdf({ path: process.env.PDF, width: '1920px', height: '1080px', printBackground: true, preferCSSPageSize: true });
  await browser.close(); console.log(els.length, 'diapositives');
})();
