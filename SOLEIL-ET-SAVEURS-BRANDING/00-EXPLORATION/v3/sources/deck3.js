// Présentation v3 : 15 nouvelles pistes (D → R), une par type de logo
// Usage : node deck3.js <scratchpad> <logos v3> <logos v2> <sortie> [diapos]
const fs = require('fs');
const { chromium } = require('playwright');
const C = require('./concepts/defs.js');
const X = require('./mockups.js');
const PV2 = require('./deck-data.js');
const [, , S, D, D2, OUT, ONLY] = process.argv;
const IDX = JSON.parse(fs.readFileSync(`${S}/work/concepts-index.json`, 'utf8'));
X.setLogos(D, IDX);
const f = n => +(+n).toFixed(2);
const ids = Object.keys(C);
const ar = id => { const v = IDX[`${id}/horizontal-couleur`]; return v[2] / v[3]; };
ids.forEach(id => X.setHScale(id, Math.max(0.5, Math.min(1.35, Math.sqrt(5.6 / ar(id))))));

// ---------- Visuels de marque ----------
let pid = 0;
const tiled = (src, w, h, bg, s = 64, op = 1) => { const id = `tp${++pid}`;
  return `<svg width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" xmlns="http://www.w3.org/2000/svg" style="display:block"><defs><pattern id="${id}" width="${s * 2}" height="${s * 1.8}" patternUnits="userSpaceOnUse">
    <image href="${src}" x="${s * 0.25}" y="${s * 0.2}" width="${s * 0.75}" height="${s * 0.75}" opacity="${op}"/><image href="${src}" x="${s * 1.25}" y="${s * 1.1}" width="${s * 0.75}" height="${s * 0.75}" opacity="${op * 0.55}"/></pattern></defs>
    <rect width="${w}" height="${h}" fill="${bg}"/><rect width="${w}" height="${h}" fill="url(#${id})"/></svg>`; };
const big = (src, w, h, bg, scale = 1.25, dx = 0.62, dy = 0.5) => `<div style="width:${w}px;height:${h}px;background:${bg};position:relative;overflow:hidden"><img src="${src}" style="position:absolute;height:${h * scale}px;left:${w * dx}px;top:${h * dy}px;transform:translate(-50%,-50%)"></div>`;
const S_ = (id, k) => `${D}/piste-${id}/${k}.svg`;
const VIS = {
  D: (w, h) => `<div style="width:${w}px;height:${h}px;background:#161616;position:relative;overflow:hidden"><div style="position:absolute;left:${w * 0.62}px;top:${h * 0.42}px;width:${h * 0.5}px;height:${h * 0.5}px;border-radius:50%;background:#E3A221;transform:translate(-50%,-50%)"></div><div style="position:absolute;left:${w * 0.62 + h * 0.06}px;top:${h * 0.42 - h * 0.3}px;width:${h * 0.2}px;height:${h * 0.11}px;background:#2F6B3A;border-radius:0 100% 0 100%;transform:rotate(-30deg)"></div></div>`,
  M: (w, h) => { const n = Math.ceil(w / 120) + 1, m = Math.ceil(h / 120) + 1; let s = ''; for (let j = 0; j < m; j++) for (let i = 0; i < n; i++) s += `<img src="${S_('M', ['symbole-couleur', 'symbole-combi1-couleur', 'symbole-combi2-couleur', 'symbole-combi3-couleur'][(i + j * 3) % 4])}" style="position:absolute;left:${i * 120}px;top:${j * 120}px;width:114px;height:114px">`; return `<div style="width:${w}px;height:${h}px;background:#1E1E1E;position:relative;overflow:hidden">${s}</div>`; },
  N: (w, h) => `<div style="width:${w}px;height:${h}px;background:#1F2B24;display:flex;align-items:center;justify-content:space-evenly;overflow:hidden">${['printemps', 'ete', 'automne', 'hiver'].map(s => `<img src="${S_('N', `symbole-${s}-sombre`)}" style="height:${Math.min(h * 0.6, w / 5)}px">`).join('')}</div>`,
  R: (w, h) => big(S_('R', 'symbole-var2-couleur'), w, h, '#123A2A', 1.5, 0.66, 0.55),
  Q: (w, h) => big(S_('Q', 'symbole-sombre'), w, h, '#1E4D45', 0.95, 0.5, 0.72),
  K: (w, h) => { const ex = ['symbole-couleur', 'symbole-clin-couleur', 'symbole-ravi-couleur']; const s = Math.min(h * 0.55, 140); let o = ''; let k = 0; for (let y = -s * 0.2; y < h; y += s * 1.15) for (let x = (Math.round(y) % 2 ? s * 0.5 : 0); x < w; x += s * 1.25) o += `<img src="${S_('K', ex[k++ % 3])}" style="position:absolute;left:${x}px;top:${y}px;height:${s}px">`; return `<div style="width:${w}px;height:${h}px;background:#FFF6E9;position:relative;overflow:hidden">${o}</div>`; },
  H: (w, h) => big(S_('H', 'symbole-sombre'), w, h, '#183D2B', 1.4, 0.7, 0.62),
  I: (w, h) => tiled(S_('I', 'symbole-couleur'), w, h, '#1F3A2A', 70),
};
ids.forEach(id => { const P = C[id]; P.registre = P.type; P.c.bgSoft = P.c.bgSoft || '#ECE6DA';
  P.visual = VIS[id] || ((w, h) => tiled(S_(id, 'symbole-sombre'), w, h, P.c.dark, id === 'L' || id === 'F' ? 84 : 64));
  if (['I', 'K', 'M', 'R', 'H'].includes(id)) { P.vanBody = '#FFFFFF'; }
  if (['D', 'E', 'Q', 'L'].includes(id)) { P.vanBody = P.c.dark; P.vanTheme = 'sombre'; P.vanTxt = P.c.paper; }
});

const FONTS = [['Corm', 'CormorantGaramond-normal', '300 700'], ['Jost', 'Jost-normal', '100 900'], ['Fraunces', 'Fraunces-normal', '100 900'], ['DMSans', 'DMSans-normal', '100 1000'], ['Brico', 'Bricolage-normal', '200 800'],
  ['Bod', 'BodoniModa-normal', '400 900'], ['Play', 'Playfair-normal', '400 900'], ['Marc', 'Marcellus-normal', '400'], ['Young', 'YoungSerif-normal', '400'], ['Outfit', 'Outfit-normal', '100 900'], ['DMS', 'DMSerif-normal', '400'],
  ['Man', 'Manrope-normal', '200 800'], ['Hepta', 'HeptaSlab-normal', '1 900'], ['Cor', 'Corinthia-normal-700', '400'], ['Syne', 'Syne-normal', '400 800'], ['InstS', 'InstrumentSerif-normal', '400'], ['Jos', 'JosefinSans-normal', '100 700'],
  ['Big', 'BigShouldersStencil-normal', '100 900'], ['Lime', 'Limelight-normal', '400'], ['Sora', 'Sora-normal', '100 800']]
  .map(([n, file, w]) => `@font-face{font-family:${n};src:url(${S}/fonts/${file}.woff2);font-weight:${w}}`).join('\n')
  + `@font-face{font-family:Corm;src:url(${S}/fonts/CormorantGaramond-italic.woff2);font-style:italic;font-weight:300 700}@font-face{font-family:InstS;src:url(${S}/fonts/InstrumentSerif-italic.woff2);font-style:italic}@font-face{font-family:Play;src:url(${S}/fonts/Playfair-italic.woff2);font-style:italic;font-weight:400 900}@font-face{font-family:Bod;src:url(${S}/fonts/BodoniModa-italic.woff2);font-style:italic;font-weight:400 900}@font-face{font-family:DMS;src:url(${S}/fonts/DMSerif-italic.woff2);font-style:italic}`;
const CSS = `${FONTS}
@page{size:1920px 1080px;margin:0}*{box-sizing:border-box;margin:0;padding:0}html,body{background:#ddd}body{-webkit-font-smoothing:antialiased;font-family:Jost}
.slide{width:1920px;height:1080px;position:relative;overflow:hidden;background:#F6F3EE;break-after:page}
.hdr{position:absolute;top:44px;left:72px;right:72px;display:flex;justify-content:space-between;font:500 12.5px Jost;letter-spacing:.22em;text-transform:uppercase;color:rgba(20,20,20,.5);z-index:5}
.lab{font:500 12.5px Jost;letter-spacing:.24em;text-transform:uppercase;color:rgba(20,20,20,.5)}
.cap{position:absolute;font:500 11.5px Jost;letter-spacing:.2em;text-transform:uppercase;color:rgba(20,20,20,.55)}
img{display:block}`;
let pageNo = 0; const hdr = (l, r = '') => `<div class="hdr"><span>${l}</span><span>${r ? r + ' · ' : ''}${String(++pageNo).padStart(2, '0')}</span></div>`;
const slide = (b, bg = '#F6F3EE') => `<section class="slide" style="background:${bg}">${b}</section>`;
const noise = (op = .035) => X.layer(X.tex(X.NOISE(op), 240));
const fit = (id, kind, th, W, H) => { const v = IDX[`${id}/${kind}-${th}`]; const a = v[2] / v[3]; const w = Math.min(W, H * a); return `<img src="${S_(id, `${kind}-${th}`)}" style="width:${f(w)}px;height:${f(w / a)}px">`; };
const hex2rgb = h => [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16)).join(' · ');
const light = h => { const [r, g, b] = [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16)); return (0.299 * r + 0.587 * g + 0.114 * b) > 165; };

function extraTile(P) {
  const id = P.id;
  if (id === 'N') return `<div style="display:flex;gap:18px;align-items:center">${['printemps', 'ete', 'automne', 'hiver'].map((s, i) => `<div style="text-align:center"><img src="${S_('N', `symbole-${s}-couleur`)}" style="height:96px;margin:auto"><div style="font:500 11px Jost;letter-spacing:.14em;text-transform:uppercase;color:#777;margin-top:10px">${['Printemps', 'Été', 'Automne', 'Hiver'][i]}</div></div>`).join('')}</div>`;
  if (id === 'K') return `<div style="display:flex;gap:26px;align-items:center">${[['symbole-couleur', 'Savoure'], ['symbole-clin-couleur', 'Complice'], ['symbole-ravi-couleur', 'Ravi']].map(([s, l]) => `<div style="text-align:center"><img src="${S_('K', s)}" style="height:110px;margin:auto"><div style="font:500 11px Jost;letter-spacing:.14em;text-transform:uppercase;color:#777;margin-top:8px">${l}</div></div>`).join('')}</div>`;
  if (id === 'M') return `<div style="display:flex;gap:18px;align-items:center">${['symbole-couleur', 'symbole-combi1-couleur', 'symbole-combi2-couleur', 'symbole-combi3-couleur'].map(s => `<img src="${S_('M', s)}" style="height:104px">`).join('')}</div>`;
  if (id === 'R') return `<div style="display:flex;gap:22px;align-items:center">${['symbole-var1-couleur', 'symbole-couleur', 'symbole-var3-couleur', 'symbole-var4-couleur'].map(s => `<img src="${S_('R', s)}" style="height:104px">`).join('')}</div>`;
  return `<div style="display:flex;align-items:flex-end;gap:20px">${X.appIcon(P, 120, { light: true })}${X.appIcon(P, 120)}${X.appIcon(P, 64)}<div style="display:flex;flex-direction:column;gap:12px;align-items:flex-start">${[32, 16].map(s => `<img src="${S_(id, 'symbole-couleur')}" style="height:${s}px">`).join('')}</div></div>`;
}
const extraLabel = id => ({ N: 'Le logo change avec les saisons', K: 'Le personnage a plusieurs expressions', M: 'Les tuiles se recombinent', R: 'Variantes générées (nombre de graines, angle)' }[id] || "Icône d'application · favicon");

function board(P) {
  const c = P.c;
  return slide(`
    <div style="position:absolute;left:0;top:0;width:1160px;height:1080px;background:${c.paper}">${noise()}</div>
    ${hdr(`Piste ${P.id} · ${P.type}`)}
    <div style="position:absolute;left:72px;top:120px;width:1016px;height:560px;display:flex;align-items:center;justify-content:center">${fit(P.id, 'horizontal', 'couleur', 860, P.id === 'F' || P.id === 'Q' ? 200 : 230)}</div>
    <div style="position:absolute;left:72px;top:720px;width:1016px;height:300px;display:grid;grid-template-columns:1fr 1fr 1.25fr;gap:14px">
      <div style="background:${c.dark};border-radius:4px;display:flex;align-items:center;justify-content:center;position:relative">${fit(P.id, 'vertical', 'sombre', 250, 200)}<div class="cap" style="left:16px;bottom:12px;color:rgba(255,255,255,.55)">Vertical · fond sombre</div></div>
      <div style="background:#fff;border-radius:4px;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:26px;position:relative">${fit(P.id, 'horizontal', 'noir', 270, 60)}<div style="display:flex;gap:16px;align-items:flex-end">${[56, 32, 20].map(s => `<img src="${S_(P.id, 'symbole-noir')}" style="height:${s}px">`).join('')}</div><div class="cap" style="left:16px;bottom:12px">Monochrome · réductions</div></div>
      <div style="background:#fff;border-radius:4px;display:flex;align-items:center;justify-content:center;position:relative">${extraTile(P)}<div class="cap" style="left:16px;bottom:12px">${extraLabel(P.id)}</div></div>
    </div>
    <div style="position:absolute;left:1160px;top:0;right:0;bottom:0;padding:120px 80px 0 72px">
      <div class="lab">Piste ${P.id} · ${P.famille}</div>
      <div style="${P.head};font-size:${P.id === 'L' ? 76 : P.id === 'P' ? 62 : 52}px;line-height:1.02;color:${c.ink};margin-top:18px">${P.nom}</div>
      <div style="font:400 18.5px Jost;line-height:1.58;color:#333;margin-top:28px">${P.idee}</div>
      <div style="font:italic 400 16.5px Jost;line-height:1.5;color:#777;margin-top:16px">${P.idee2}</div>
      <div class="lab" style="margin-top:42px">Couleurs</div>
      <div style="display:flex;gap:14px;margin-top:16px">${P.pal.map(([n, h]) => `<div style="width:120px"><div style="height:74px;border-radius:4px;background:${h};${light(h) ? 'box-shadow:inset 0 0 0 1px #00000018' : ''}"></div><div style="font:500 12px Jost;color:#333;margin-top:8px;line-height:1.35">${n}</div><div style="font:400 11.5px Jost;color:#888">${h}</div></div>`).join('')}</div>
      <div class="lab" style="margin-top:36px">Typographie</div>
      <div style="font:400 16px Jost;color:#333;margin-top:12px">${P.typo} <span style="color:#2E7D4F">· licence OFL, usage commercial libre</span></div>
    </div>`, '#F3F0EA');
}

function mock(P) {
  const c = P.c; let hero = '';
  if (P.hero === 'van') hero = `<div style="position:absolute;left:40px;top:300px">${X.van(P, 1100)}</div><div style="position:absolute;left:0;right:0;bottom:0;height:300px;background:linear-gradient(180deg,#00000006,#00000012)"></div>`;
  else if (P.hero === 'cards') hero = `<div style="position:absolute;left:-60px;top:170px;transform:scale(.76);transform-origin:top left">${X.stationery(P)}</div>`;
  else if (P.hero === 'crate') hero = `<div style="position:absolute;left:150px;top:330px">${X.crate(P, 880)}</div>`;
  else if (P.hero === 'apple') hero = `<div style="position:absolute;left:120px;top:250px">${X.appleSticker(P, 470)}</div><div style="position:absolute;left:640px;top:430px;transform:rotate(14deg)">${X.appleSticker(P, 340)}</div>`;
  else if (P.hero === 'social') hero = `<div style="position:absolute;left:150px;top:130px">${X.phone(P, X.phoneSocial(P), { w: 360, h: 760 })}</div><div style="position:absolute;left:600px;top:250px;display:flex;flex-direction:column;gap:30px;align-items:center">${X.appIcon(P, 260)}<div style="display:flex;gap:22px">${X.appIcon(P, 96, { light: true })}${X.appIcon(P, 96)}</div></div>`;
  else if (P.hero === 'seasons') hero = `<div style="position:absolute;left:70px;top:250px;display:flex;gap:26px">${['printemps', 'ete', 'automne', 'hiver'].map(s => `<div style="position:relative;width:250px;height:355px;background:linear-gradient(98deg,#B78F64,#C9A47A 18%,#C7A176 60%,#B48A5E);box-shadow:0 40px 60px -26px rgba(40,25,10,.5);display:flex;flex-direction:column;align-items:center;justify-content:center;gap:22px">${X.layer(X.tex(X.NOISE(0.16, 0.9), 220))}<img src="${S_('N', `symbole-${s}-couleur`)}" style="height:120px;position:relative"><div style="font:400 30px InstS;color:#1F2B24;position:relative">Soleil <i>et</i> Saveurs</div><div style="font:500 10px Jost;letter-spacing:.24em;text-transform:uppercase;color:#1F2B24;position:relative">${{ printemps: 'Printemps', ete: 'Été', automne: 'Automne', hiver: 'Hiver' }[s]}</div></div>`).join('')}</div>`;
  return slide(`${hdr(`Piste ${P.id} · ${P.nom}`, 'Mises en situation')}${noise(.04)}
    ${hero}
    <div style="position:absolute;left:1200px;top:150px">${X.phone(P, X.phoneShop(P), { w: 330, h: 680 })}</div>
    <div style="position:absolute;left:1570px;top:${P.hero === 'seasons' ? 470 : 380}px">${P.hero === 'seasons' ? X.appIcon(P, 200) : X.kraftBag(P, 290)}</div>
    <div class="cap" style="left:72px;bottom:40px">${{ van: 'Véhicule de livraison', cards: 'Papeterie', crate: 'Étiquette de cagette', apple: 'Étiquette de fruit', social: 'Réseaux sociaux · application', seasons: 'Un sac par saison' }[P.hero]} · site mobile · ${P.hero === 'seasons' ? "icône d'application" : 'sac kraft'}</div>`, c.bgSoft);
}

function cover() {
  return slide(`${hdr('Soleil et Saveurs · Exploration élargie')}${noise()}
    <div style="position:absolute;left:72px;top:150px;width:1100px">
      <div class="lab">Novembre 2026 · 15 nouvelles pistes</div>
      <div style="font:600 104px Corm;line-height:.95;color:#1F2A22;margin-top:26px">Tous les chemins<br>d'un logo.</div>
      <div style="font:400 24px Jost;line-height:1.55;color:#444;margin-top:30px;max-width:900px">Logotype pur, monogramme, sceau, étiquette, abstrait, pictogramme, espace négatif, personnage, signature, système modulaire, logo dynamique, trait continu, pochoir, Art déco, génératif. Chaque type de logo, une idée pour Soleil et Saveurs.</div></div>
    <div style="position:absolute;left:72px;right:72px;bottom:80px;display:grid;grid-template-columns:repeat(15,1fr);gap:10px">${ids.map(id => `<div style="background:#fff;border-radius:4px;height:150px;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:12px"><img src="${S_(id, 'symbole-couleur')}" style="max-width:70%;max-height:72px"><div style="font:500 11px Jost;letter-spacing:.14em;color:#999">${id}</div></div>`).join('')}</div>`, '#F3EFE8');
}
function panorama() {
  const v2 = ['A', 'B', 'C'].map(id => ({ id, nom: PV2[id].nom, type: PV2[id].registre, src: `${D2}/piste-${id}/horizontal-couleur.svg`, bg: PV2[id].c.paper }));
  const all = [...v2, ...ids.map(id => ({ id, nom: C[id].nom, type: C[id].type, src: S_(id, 'horizontal-couleur'), bg: C[id].c.paper }))];
  return slide(`${hdr('Panorama · 18 pistes')}
    <div style="position:absolute;left:72px;right:72px;top:100px;bottom:50px;display:grid;grid-template-columns:repeat(3,1fr);grid-template-rows:repeat(6,1fr);gap:10px">${all.map(a => `<div style="background:${a.bg};border-radius:4px;position:relative;display:flex;align-items:center;justify-content:center;padding:20px 40px 26px">
      <img src="${a.src}" style="max-width:76%;max-height:64%"><div style="position:absolute;left:14px;bottom:9px;font:500 10.5px Jost;letter-spacing:.14em;text-transform:uppercase;color:#00000070"><b style="color:#000000a0">${a.id}</b> · ${a.nom} · ${a.type}</div>${['A', 'B', 'C'].includes(a.id) ? '<div style="position:absolute;right:12px;top:10px;font:500 10px Jost;letter-spacing:.12em;text-transform:uppercase;color:#00000060">v2</div>' : ''}</div>`).join('')}</div>`, '#EEEAE3');
}
function guide() {
  const groups = [['Classique et premium', 'Épicerie fine, maison, patrimoine', ['A', 'D', 'E', 'L', 'O', 'Q']], ['Chaleureux et gourmand', 'Proximité, plaisir, nature', ['B', 'G', 'K', 'N']], ['Moderne et iconique', 'Symbole fort, digital, livraison', ['C', 'H', 'I', 'J', 'M', 'R']], ['Authentique et brut', 'Marché, savoir-faire, cagette', ['F', 'P']]];
  const all = { ...Object.fromEntries(['A', 'B', 'C'].map(id => [id, { src: `${D2}/piste-${id}/symbole-${id === 'A' ? 'couleur' : 'couleur'}.svg`, nom: PV2[id].nom }])), ...Object.fromEntries(ids.map(id => [id, { src: S_(id, 'symbole-couleur'), nom: C[id].nom }])) };
  return slide(`${hdr('Comment choisir')}
    <div style="position:absolute;left:72px;top:120px;width:640px">
      <div class="lab">Lecture par famille</div>
      <div style="font:600 64px Corm;line-height:1.02;color:#1F2A22;margin-top:20px">Quatre familles, une seule question : que doit-on ressentir en premier ?</div>
      <div style="font:400 19px Jost;line-height:1.6;color:#444;margin-top:30px">La qualité d'une maison (classique), l'envie et le sourire (chaleureux), la reconnaissance immédiate du camion à l'écran (iconique), ou la mémoire du marché (authentique). Choisissez la famille, puis la piste ; tout se combine ensuite : un symbole d'une piste peut prendre la typographie d'une autre.</div>
      <div class="lab" style="margin-top:44px">Mes quatre coups de cœur</div>
      <div style="font:400 18px Jost;line-height:1.7;color:#333;margin-top:14px"><b>C</b> Le Sommet de l'étal, pour l'icône et le récit du métier · <b>I</b> La Tomate vue du ciel, pour l'appétit et la lisibilité · <b>N</b> Le Fruit de saison, pour une marque vivante · <b>D</b> Le Point de soleil, pour l'élégance pure.</div></div>
    <div style="position:absolute;left:780px;right:72px;top:120px;bottom:60px;display:grid;grid-template-rows:repeat(4,1fr);gap:14px">${groups.map(([t, s, list]) => `<div style="background:#fff;border-radius:4px;padding:22px 28px;display:flex;align-items:center;gap:30px">
      <div style="width:250px;flex:none"><div style="font:600 30px Corm;color:#1F2A22;line-height:1.05">${t}</div><div style="font:400 14px Jost;color:#888;margin-top:6px">${s}</div></div>
      <div style="display:flex;gap:16px;align-items:center">${list.map(id => `<div style="text-align:center;width:98px"><img src="${all[id].src}" style="height:64px;max-width:96px;margin:auto"><div style="font:500 11px Jost;color:#555;margin-top:8px;line-height:1.25"><b>${id}</b> · ${all[id].nom}</div></div>`).join('')}</div></div>`).join('')}</div>`, '#F3EFE8');
}

(async () => {
  fs.mkdirSync(OUT, { recursive: true });
  const slides = [cover(), panorama()];
  for (const id of ids) { slides.push(board(C[id])); slides.push(mock(C[id])); }
  slides.push(guide());
  fs.writeFileSync(`${S}/work/deck3.html`, `<!doctype html><html lang="fr"><head><meta charset="utf-8"><style>${CSS}</style></head><body>${slides.join('\n')}</body></html>`);
  const browser = await chromium.launch(); const page = await browser.newPage({ viewport: { width: 1920, height: 1080 }, deviceScaleFactor: +(process.env.SCALE || 1) });
  await page.goto('file://' + `${S}/work/deck3.html`); await page.evaluate(() => document.fonts.ready); await page.waitForTimeout(600);
  const els = await page.$$('section.slide'); const only = ONLY ? ONLY.split(',').map(Number) : null;
  for (let i = 0; i < els.length; i++) { if (only && !only.includes(i + 1)) continue; await els[i].screenshot({ path: `${OUT}/${String(i + 1).padStart(2, '0')}.png` }); }
  if (process.env.PDF) await page.pdf({ path: process.env.PDF, width: '1920px', height: '1080px', printBackground: true, preferCSSPageSize: true });
  await browser.close(); console.log(els.length, 'diapositives');
})();
