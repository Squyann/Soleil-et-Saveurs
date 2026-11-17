// Mises en situation (HTML + SVG) paramétrées par piste
const fs = require('fs');
let D = '', IDX = {};
const setLogos = (dir, index) => { D = dir; IDX = index; };
let uid = 0; const nid = p => `${p}${++uid}`;
const f = n => +(+n).toFixed(2);

// Logo maître en <img> : hauteur ou largeur imposée
function logo(id, kind, th, { h = null, w = null, style = '' } = {}) {
  const vb = IDX[`${id}/${kind}-${th}`]; const ratio = vb[2] / vb[3];
  const H = h ?? w / ratio, W = w ?? h * ratio;
  return `<img src="${D}/piste-${id}/${kind}-${th}.svg" style="width:${f(W)}px;height:${f(H)}px;display:block;${style}">`;
}
const logoW = (id, kind, th, h) => { const vb = IDX[`${id}/${kind}-${th}`]; return h * vb[2] / vb[3]; };
const markSrc = (id, th) => `${D}/piste-${id}/symbole-${th}.svg`;
// Logo monochrome dans une couleur d'encre donnée (à partir de la version noire)
function logoInk(id, kind, color, { h = null, w = null, style = '' } = {}) {
  const vb = IDX[`${id}/${kind}-noir`]; const ratio = vb[2] / vb[3];
  const H = h ?? w / ratio, W = w ?? h * ratio;
  const svg = fs.readFileSync(`${D}/piste-${id}/${kind}-noir.svg`, 'utf8').replace(/#000000/g, color);
  return `<img src="data:image/svg+xml;utf8,${encodeURIComponent(svg)}" style="width:${f(W)}px;height:${f(H)}px;display:block;${style}">`;
}

// ---------- Textures (SVG en data URI) ----------
const enc = s => 'data:image/svg+xml;utf8,' + encodeURIComponent(s);
const NOISE = (op = 0.09, freq = 0.85) => enc(`<svg xmlns="http://www.w3.org/2000/svg" width="300" height="300"><filter id="n"><feTurbulence type="fractalNoise" baseFrequency="${freq}" numOctaves="3" stitchTiles="stitch"/><feColorMatrix values="0 0 0 0 0.25  0 0 0 0 0.2  0 0 0 0 0.15  0 0 0 ${op} 0"/></filter><rect width="300" height="300" filter="url(#n)"/></svg>`);
const FIBRE = (op = 0.12) => enc(`<svg xmlns="http://www.w3.org/2000/svg" width="400" height="400"><filter id="n"><feTurbulence type="fractalNoise" baseFrequency="0.012 0.55" numOctaves="2" seed="4" stitchTiles="stitch"/><feColorMatrix values="0 0 0 0 0.3  0 0 0 0 0.2  0 0 0 0 0.1  0 0 0 ${op*6} -${op*2.2}"/></filter><rect width="400" height="400" filter="url(#n)"/></svg>`);
const WOOD = enc(`<svg xmlns="http://www.w3.org/2000/svg" width="600" height="120"><filter id="n"><feTurbulence type="fractalNoise" baseFrequency="0.004 0.18" numOctaves="3" seed="9" stitchTiles="stitch"/><feColorMatrix values="0 0 0 0 0.45  0 0 0 0 0.3  0 0 0 0 0.15  0 0 0 1.1 -0.38"/></filter><rect width="600" height="120" filter="url(#n)"/></svg>`);
const tex = (url, size = 300, blend = 'multiply') => `background-image:url("${url}");background-size:${size}px;mix-blend-mode:${blend}`;
const layer = (css, extra = '') => `<div style="position:absolute;inset:0;${css};pointer-events:none;${extra}"></div>`;

// ---------- Motifs de marque ----------
function patternA(w, h, bg = '#1E3A2C', fg = '#D9B66A') {
  const id = nid('pa');
  const seed = `M0 -15 C2.3 -11.4 2.4 -8.3 2.4 -7.4 A2.4 2.4 0 0 1 -2.4 -7.4 C-2.4 -8.3 -2.3 -11.4 0 -15Z`;
  const star = (o) => `<g fill="${fg}" opacity="${o}">${[0,72,144,216,288].map(a => `<path d="${seed}" transform="rotate(${a})"/>`).join('')}</g>`;
  return `<svg width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" xmlns="http://www.w3.org/2000/svg" style="display:block"><defs><pattern id="${id}" width="96" height="110" patternUnits="userSpaceOnUse">
    <g transform="translate(24 27)">${star(1)}</g><g transform="translate(72 82) rotate(36)">${star(0.45)}</g></pattern></defs>
    <rect width="${w}" height="${h}" fill="${bg}"/><rect width="${w}" height="${h}" fill="url(#${id})"/></svg>`;
}
function sceneB(w, h) {
  const k = h / 100;
  return `<svg width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="xMidYMid slice" style="display:block">
    <rect width="${w}" height="${h}" fill="#C2602D"/>
    <circle cx="${w*0.55}" cy="${h*0.6}" r="${h*0.3}" fill="#ECAD44"/>
    <circle cx="${w*0.9}" cy="${h*1.05}" r="${h*0.45}" fill="#6F8A50"/>
    <path d="M${w*0.9} ${h*0.6} c${0.5*k} -${5*k} ${2.5*k} -${8*k} ${6*k} -${9.5*k}" stroke="#6F8A50" stroke-width="${2.6*k}" fill="none" stroke-linecap="round"/>
    <circle cx="${w*0.32}" cy="${h*1.12}" r="${h*0.42}" fill="#6F8A50"/>
    <circle cx="${w*0.08}" cy="${h*1.2}" r="${h*0.5}" fill="#2F4A2B"/>
    <circle cx="${w*0.62}" cy="${h*1.32}" r="${h*0.5}" fill="#2F4A2B"/>
    <path d="M${w*0.62} ${h*0.83} c0 -${5*k} -${1.6*k} -${8.6*k} -${5*k} -${10.6*k}" stroke="#2F4A2B" stroke-width="${2.8*k}" fill="none" stroke-linecap="round"/>
    <path d="M${w*0.62+0.6*k} ${h*0.8} c${3.2*k} -${6*k} ${10*k} -${8.2*k} ${16*k} -${5.8*k} c-${3.6*k} ${5.4*k} -${10*k} ${7.6*k} -${16*k} ${5.8*k}z" fill="#2F4A2B"/>
  </svg>`;
}
function patternC(w, h, bg = '#123F30', r = 26, gold = 0.085, seed0 = 7) {
  const gap = r * 0.2, d = 2*r + gap, hh = d * Math.sqrt(3)/2;
  let s = '', seed = seed0; const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  for (let y = r * 0.6, row = 0; y < h + r*2; y += hh, row++)
    for (let x = (row % 2) * d / 2 - r*0.4; x < w + d; x += d) {
      const g = rnd() < gold;
      s += `<circle cx="${f(x)}" cy="${f(y)}" r="${r}" fill="${g ? '#F3B33E' : '#DD6A2C'}"/>`;
      if (g) s += `<path d="M${f(x+r*0.04)} ${f(y-r*0.93)} c${f(r*0.07)} ${f(-r*0.38)} ${f(r*0.48)} ${f(-r*0.65)} ${f(r*1.02)} ${f(-r*0.6)} c${f(-r*0.14)} ${f(r*0.45)} ${f(-r*0.56)} ${f(r*0.72)} ${f(-r*1.02)} ${f(r*0.6)}z" fill="#9CC37A"/>`;
    }
  return `<svg width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" xmlns="http://www.w3.org/2000/svg" style="display:block"><rect width="${w}" height="${h}" fill="${bg}"/>${s}</svg>`;
}
const visual = (P, w, h, o = {}) => P.id === 'A' ? patternA(w, h) : P.id === 'B' ? sceneB(w, h) : patternC(w, h, '#123F30', o.r || 26);

// ---------- Icône d'application ----------
function appIcon(P, size, { light = false, shadow = true } = {}) {
  const bg = light ? P.c.paper : P.c.dark;
  const th = P.id === 'A' ? (light ? 'couleur' : 'sombre') : P.id === 'B' ? 'couleur' : (light ? 'couleur' : 'sombre');
  const vb = IDX[`${P.id}/symbole-${th}`]; const ar = vb[2] / vb[3];
  const inner = P.id === 'B' ? size * 0.66 : size * 0.64;
  const ih = ar >= 1 ? inner / ar : inner, iw = ar >= 1 ? inner : inner * ar;
  return `<div style="width:${size}px;height:${size}px;border-radius:${size*0.225}px;background:${bg};display:flex;align-items:center;justify-content:center;flex:none;position:relative;overflow:hidden;${shadow ? `box-shadow:0 ${size*0.06}px ${size*0.16}px -${size*0.04}px rgba(20,20,10,.35),inset 0 0 0 1px rgba(255,255,255,${light?0:.08})` : ''}">
    <img src="${markSrc(P.id, th)}" style="width:${f(iw)}px;height:${f(ih)}px;${P.id==='B'?`margin-top:${size*0.04}px`:''}"></div>`;
}

// ---------- Navigateur + téléphone ----------
function browser(P, w = 1180) {
  const hh = 470;
  const btnR = P.radius;
  return `<div style="width:${w}px;border-radius:12px;overflow:hidden;background:#fff;box-shadow:0 50px 90px -30px rgba(30,25,15,.45),0 18px 30px -18px rgba(30,25,15,.3)">
    <div style="background:#E7E4DF;padding:11px 16px 0;display:flex;align-items:flex-end;gap:12px">
      <div style="display:flex;gap:8px;padding-bottom:13px">${['#EC6A5E','#F4BF4F','#61C554'].map(c => `<i style="width:12px;height:12px;border-radius:50%;background:${c};display:block"></i>`).join('')}</div>
      <div style="background:#fff;border-radius:10px 10px 0 0;padding:10px 16px;display:flex;align-items:center;gap:10px;font:400 13px Jost;color:#333;width:270px">
        <img src="${markSrc(P.id, P.id==='A'?'plein':'couleur')}" style="height:16px">Soleil et Saveurs<span style="margin-left:auto;color:#aaa">×</span></div></div>
    <div style="background:#fff;padding:9px 16px;border-bottom:1px solid #eee"><div style="background:#F1F0EE;border-radius:20px;padding:8px 18px;font:400 13px Jost;color:#555">soleiletsaveurs.fr</div></div>
    <div style="background:${P.c.ink};color:${P.c.paper};text-align:center;${P.label};font-size:11px;padding:9px">Livraison offerte dès 40 € de produits</div>
    <div style="background:${P.c.paper};display:flex;align-items:center;justify-content:space-between;padding:20px 48px;border-bottom:1px solid ${P.c.ink}14">
      ${logo(P.id, 'horizontal', 'couleur', { h: P.id === 'A' ? 30 : P.id === 'B' ? 40 : 38 })}
      <div style="display:flex;gap:38px;align-items:center;${P.body};font-size:15.5px;color:${P.c.ink}">Boutique<span>Livraison</span><span>Aide</span>
        <span style="background:${P.c.ink};color:${P.c.paper};padding:11px 20px;border-radius:${btnR}px;font-size:14.5px">Panier · 0</span></div></div>
    <div style="display:grid;grid-template-columns:1.05fr 1fr;height:${hh}px;background:${P.c.paper}">
      <div style="padding:70px 48px 0">
        <div style="${P.label};font-size:12px;color:${P.c.acc}">Primeur · Yvelines (78)</div>
        <div style="${P.head};font-size:${P.id==='A'?62:58}px;line-height:1.02;color:${P.c.ink};margin:18px 0 24px">Le goût du soleil, <em style="color:${P.c.acc};font-style:${P.emStyle}">livré chez vous.</em></div>
        <div style="${P.body};font-size:17px;color:${P.c.ink};opacity:.8;line-height:1.55;max-width:440px">Fruits et légumes choisis à maturité, livrés dès le lendemain entre 15 h et 20 h.</div>
        <div style="display:inline-block;margin-top:30px;background:${P.c.acc};color:#fff;padding:16px 28px;border-radius:${btnR}px;${P.body};font-weight:500;font-size:15.5px">Découvrir la récolte</div></div>
      <div style="overflow:hidden">${visual(P, Math.round(w * 0.49), hh)}</div></div></div>`;
}
function phone(P, content, { w = 340, h = 700 } = {}) {
  return `<div style="width:${w}px;height:${h}px;border-radius:52px;background:#151515;padding:12px;box-shadow:0 50px 90px -30px rgba(30,25,15,.5),inset 0 0 0 2px #333">
    <div style="width:100%;height:100%;border-radius:41px;overflow:hidden;background:${P.c.paper};position:relative">
      <div style="height:46px;display:flex;justify-content:space-between;align-items:center;padding:0 30px;font:600 13px Jost;color:#111;position:relative;z-index:2">9:41<span style="position:absolute;left:50%;top:10px;transform:translateX(-50%);width:100px;height:28px;background:#151515;border-radius:20px;display:block"></span><span style="letter-spacing:1px">▮▮▮</span></div>
      ${content}</div></div>`;
}
function phoneShop(P) {
  const prod = (n, col, pr) => `<div style="background:#fff;border-radius:${Math.min(P.radius, 14)}px;padding:10px;flex:1;box-shadow:0 2px 8px rgba(0,0,0,.05)"><div style="height:92px;border-radius:${Math.min(P.radius, 10)}px;background:${col}1f;display:flex;align-items:center;justify-content:center"><div style="width:50px;height:50px;border-radius:50%;background:radial-gradient(circle at 35% 30%,#ffffff55,transparent 45%),${col}"></div></div>
    <div style="${P.body};font-size:12.5px;color:${P.c.ink};margin-top:9px;font-weight:500;line-height:1.25">${n}</div><div style="display:flex;justify-content:space-between;align-items:center;margin-top:6px"><span style="${P.body};font-size:12px;color:${P.c.ink};opacity:.6">${pr}</span><span style="width:24px;height:24px;border-radius:50%;background:${P.c.ink};color:${P.c.paper};font:500 15px Jost;display:flex;align-items:center;justify-content:center">+</span></div></div>`;
  return `<div style="display:flex;justify-content:space-between;align-items:center;padding:6px 20px 14px;border-bottom:1px solid ${P.c.ink}14">${logo(P.id, 'horizontal', 'couleur', { h: P.id === 'A' ? 19 : 25 })}
      <div style="display:flex;flex-direction:column;gap:5px"><i style="width:22px;height:2px;background:${P.c.ink};display:block"></i><i style="width:22px;height:2px;background:${P.c.ink};display:block"></i><i style="width:15px;height:2px;background:${P.c.ink};display:block"></i></div></div>
    <div style="height:170px;overflow:hidden">${visual(P, 316, 170, { r: 20 })}</div>
    <div style="padding:20px">
      <div style="${P.label};font-size:10px;color:${P.c.acc}">La récolte du jour</div>
      <div style="${P.head};font-size:${P.id==='A'?33:30}px;line-height:1.04;color:${P.c.ink};margin:9px 0 16px">Le goût du soleil, <em style="color:${P.c.acc};font-style:${P.emStyle}">livré chez vous.</em></div>
      <div style="display:flex;gap:10px">${prod('Pommes reinettes', P.id==='B' ? '#C2602D' : '#DD6A2C', 'le kg')}${prod('Carottes en botte', P.id==='A' ? '#B98C3E' : '#ECAD44', 'la botte')}</div>
      <div style="margin-top:16px;background:${P.c.ink};color:${P.c.paper};text-align:center;padding:14px;border-radius:${P.radius}px;${P.body};font-weight:500;font-size:14px">Voir le panier</div></div>`;
}
function phoneSocial(P) {
  const tiles = [visual(P, 108, 108, { r: 14 }), `<div style="width:100%;height:100%;background:${P.c.dark};display:flex;align-items:center;justify-content:center"><img src="${markSrc(P.id, 'sombre')}" style="height:52px"></div>`,
    `<div style="width:100%;height:100%;background:${P.c.paper};display:flex;align-items:center;justify-content:center;${P.head};font-size:17px;color:${P.c.ink};text-align:center;line-height:1.05">Arrivage<br><em style="color:${P.c.acc};font-style:${P.emStyle}">du jour</em></div>`,
    `<div style="width:100%;height:100%;background:${P.c.acc};display:flex;align-items:center;justify-content:center;${P.head};font-size:17px;color:#fff;text-align:center;line-height:1.05">Livré<br>dès 15 h</div>`,
    `<div style="width:100%;height:100%;background:${P.c.paper};display:flex;align-items:center;justify-content:center">${logo(P.id, 'vertical', 'couleur', { h: 78 })}</div>`, visual(P, 108, 108, { r: 14 }),
    `<div style="width:100%;height:100%;background:${P.c.dark};display:flex;align-items:center;justify-content:center;${P.label};font-size:9px;color:${P.c.paper};text-align:center;line-height:1.7">Producteurs<br>de saison</div>`,
    `<div style="width:100%;height:100%;background:radial-gradient(circle at 50% 60%,${P.id==='A'?'#D9B66A':'#F3B33E'},${P.id==='B'?'#C2602D':'#DD6A2C'})"></div>`,
    `<div style="width:100%;height:100%;background:${P.c.paper};display:flex;align-items:center;justify-content:center"><img src="${markSrc(P.id, P.id==='A'?'couleur':'couleur')}" style="height:46px"></div>`];
  return `<div style="padding:8px 18px 0;font:600 15px Jost;color:#111;display:flex;justify-content:space-between"><span>soleiletsaveurs</span><span>☰</span></div>
    <div style="display:flex;align-items:center;gap:20px;padding:16px 18px">
      <div style="width:86px;height:86px;border-radius:50%;padding:3px;background:linear-gradient(45deg,${P.c.acc},${P.c.accLight})"><div style="width:100%;height:100%;border-radius:50%;border:3px solid ${P.c.paper};overflow:hidden">${appIcon(P, 74, { shadow: false })}</div></div>
      <div style="display:flex;gap:18px;font:400 11.5px Jost;color:#333;text-align:center">${[['248', 'publications'], ['3 412', 'abonnés'], ['180', 'abonnements']].map(([n, l]) => `<div><b style="font:600 15px Jost;display:block">${n}</b>${l}</div>`).join('')}</div></div>
    <div style="padding:0 18px 14px;font:400 12.5px Jost;color:#222;line-height:1.45"><b>Soleil et Saveurs</b><br>Primeur · Fruits et légumes frais<br>Livrés dans les Yvelines (78)</div>
    <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:2px">${tiles.map(t => `<div style="aspect-ratio:1;overflow:hidden">${t}</div>`).join('')}</div>`;
}

// ---------- Camionnette de livraison ----------
function van(P, w = 1500) {
  const h = w * 0.46, id = nid('van');
  const body = P.id === 'C' ? '#123F30' : P.id === 'A' ? '#F4EEE3' : '#F3E8D6';
  const band = P.id === 'A' ? patternA(560, 90) : P.id === 'B' ? sceneB(560, 90) : patternC(560, 90, '#123F30', 13);
  const lth = P.id === 'C' ? 'sombre' : 'couleur';
  const txt = P.id === 'C' ? '#FBF6EC' : P.c.ink;
  const BODY = 'M70 120 Q70 92 100 92 L598 92 C640 92 664 98 694 126 L792 220 C802 229 816 233 842 238 L906 254 C926 260 936 272 936 292 L936 352 Q936 378 912 378 L846 378 A63 63 0 0 0 720 378 L302 378 A63 63 0 0 0 176 378 L94 378 Q70 378 70 354 Z';
  return `<svg viewBox="0 0 1000 460" width="${w}" height="${h}" xmlns="http://www.w3.org/2000/svg" style="display:block;overflow:visible">
    <defs>
      <clipPath id="${id}c"><path d="${BODY}"/></clipPath>
      <linearGradient id="${id}g" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff" stop-opacity=".22"/><stop offset=".45" stop-color="#fff" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity=".16"/></linearGradient>
      <linearGradient id="${id}w" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#3B4652"/><stop offset=".55" stop-color="#1F262E"/><stop offset="1" stop-color="#2A333C"/></linearGradient>
      <radialGradient id="${id}s"><stop offset="0" stop-color="#000" stop-opacity=".38"/><stop offset="1" stop-color="#000" stop-opacity="0"/></radialGradient>
    </defs>
    <ellipse cx="505" cy="440" rx="480" ry="26" fill="url(#${id}s)"/>
    <path d="${BODY}" fill="${body}"/>
    <g clip-path="url(#${id}c)">
      <foreignObject x="70" y="300" width="560" height="90"><div xmlns="http://www.w3.org/1999/xhtml">${band}</div></foreignObject>
      <rect x="70" y="296" width="866" height="4" fill="${P.c.acc}"/>
      <rect x="630" y="300" width="320" height="90" fill="${P.id==='C'?'#0C2F24':P.c.ink}"/>
      <path d="M615 110 L668 110 C690 112 702 121 713 132 L774 212 Q778 224 766 224 L615 224 Z" fill="url(#${id}w)"/>
      <path d="M630 116 L668 116 C684 118 694 124 702 134 L660 216 L630 216 Z" fill="#fff" opacity=".07"/>
      <path d="M100 92 L598 92 C640 92 664 98 694 126" fill="none" stroke="#fff" stroke-opacity=".35" stroke-width="3"/>
      <line x1="604" y1="96" x2="604" y2="372" stroke="#000" stroke-opacity=".18" stroke-width="2"/>
      <line x1="782" y1="232" x2="782" y2="372" stroke="#000" stroke-opacity=".18" stroke-width="2"/>
      <line x1="84" y1="110" x2="84" y2="372" stroke="#000" stroke-opacity=".14" stroke-width="2"/>
      <rect x="618" y="240" width="34" height="9" rx="4.5" fill="#000" opacity=".28"/>
      <rect x="70" y="92" width="866" height="290" fill="url(#${id}g)"/>
    </g>
    <path d="M916 262 C928 266 934 274 935 284 L906 284 Q898 284 898 276 L898 266 Q898 258 916 262Z" fill="#FFF6D8" stroke="#00000022"/>
    <rect x="70" y="128" width="9" height="72" rx="3" fill="#C9372C"/>
    <path d="M700 168 L718 160 Q726 158 726 166 L726 186 Q726 192 718 192 L706 192 Q700 192 700 186Z" fill="${P.id==='C'?'#0C2F24':P.c.ink}"/>
    <rect x="884" y="340" width="54" height="30" rx="8" fill="#2A2A2A"/><rect x="66" y="344" width="40" height="26" rx="7" fill="#2A2A2A"/>
    ${[239, 783].map(cx => `<circle cx="${cx}" cy="380" r="54" fill="#1A1A1A"/><circle cx="${cx}" cy="380" r="31" fill="#C9CBCD"/><circle cx="${cx}" cy="380" r="27" fill="#A9ACAF"/>${[0,72,144,216,288].map(a => `<rect x="${cx-3}" y="${380-26}" width="6" height="18" rx="3" fill="#C9CBCD" transform="rotate(${a} ${cx} 380)"/>`).join('')}<circle cx="${cx}" cy="380" r="8" fill="#6E7275"/>`).join('')}
    <image href="${D}/piste-${P.id}/horizontal-${lth}.svg" x="${P.id==='A'?128:150}" y="${P.id==='A'?168:150}" width="${P.id==='A'?420:380}" height="${P.id==='A'?70:110}" preserveAspectRatio="xMidYMid meet"/>
    <text x="${P.id==='A'?338:340}" y="${P.id==='A'?272:282}" text-anchor="middle" style="font:${P.id==='A'?'500 13px Jost':P.id==='B'?'600 13px DMSans':'600 13px Brico'};letter-spacing:.2em;text-transform:uppercase;fill:${txt}">Livraison à domicile · Yvelines (78)</text>
    <text x="705" y="276" style="font:${P.id==='A'?'500 12px Jost':P.id==='B'?'600 12px DMSans':'600 12px Brico'};letter-spacing:.06em;fill:${txt}">soleiletsaveurs.fr</text>
  </svg>`;
}

// ---------- Sac kraft ----------
function kraftBag(P, w = 380) {
  const h = w * 1.42;
  const ink = P.c.ink;
  const leaves = `<svg viewBox="0 0 380 200" width="${w}" height="${w*200/380}" style="position:absolute;left:0;top:${-w*0.36}px" xmlns="http://www.w3.org/2000/svg">
    ${[[120,200,-14,190,'#3F6B2E'],[150,200,-4,205,'#4E7D36'],[175,200,8,180,'#355C27'],[250,200,10,150,'#4E7D36'],[268,200,24,140,'#3F6B2E']].map(([x,y,a,l,c]) => `<path d="M${x} ${y} C${x-9} ${y-l*0.5} ${x-5} ${y-l*0.85} ${x} ${y-l} C${x+5} ${y-l*0.85} ${x+9} ${y-l*0.5} ${x} ${y}Z" fill="${c}" transform="rotate(${a} ${x} ${y})"/>`).join('')}
    <circle cx="214" cy="178" r="34" fill="#C9372C"/><circle cx="204" cy="168" r="10" fill="#fff" opacity=".18"/><path d="M214 146 C216 136 222 130 230 128" stroke="#4E7D36" stroke-width="4" fill="none" stroke-linecap="round"/></svg>`;
  return `<div style="position:relative;width:${w}px;height:${h}px">
    ${leaves}
    <div style="position:absolute;inset:0;border-radius:2px;background:linear-gradient(98deg,#B78F64 0%,#C9A47A 16%,#C7A176 58%,#B48A5E 100%);box-shadow:0 50px 80px -30px rgba(40,25,10,.55);clip-path:polygon(0 2.4%,3% 0,6% 2.4%,9% 0,12% 2.4%,15% 0,18% 2.4%,21% 0,24% 2.4%,27% 0,30% 2.4%,33% 0,36% 2.4%,39% 0,42% 2.4%,45% 0,48% 2.4%,51% 0,54% 2.4%,57% 0,60% 2.4%,63% 0,66% 2.4%,69% 0,72% 2.4%,75% 0,78% 2.4%,81% 0,84% 2.4%,87% 0,90% 2.4%,93% 0,96% 2.4%,100% 0,100% 100%,0 100%)">
      ${layer(tex(NOISE(0.16, 0.9), 220))}${layer(tex(FIBRE(0.1), 400), 'opacity:.7')}
      <div style="position:absolute;left:0;right:0;top:4.5%;height:7%;background:linear-gradient(180deg,rgba(0,0,0,.10),rgba(0,0,0,.02))"></div>
      <div style="position:absolute;right:0;top:0;bottom:0;width:7%;background:linear-gradient(90deg,rgba(0,0,0,.0),rgba(0,0,0,.14))"></div>
      <div style="position:absolute;left:0;right:0;bottom:0;height:5%;background:rgba(0,0,0,.07)"></div>
      <div style="position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:${w*0.07}px;mix-blend-mode:multiply;opacity:.9">
        ${logoInk(P.id, 'vertical', ink, { w: P.id === 'A' ? w * 0.42 : w * 0.46 })}
        <div style="${P.label};font-size:${w*0.024}px;color:${ink}">Fruits &amp; légumes frais</div></div>
    </div></div>`;
}

// ---------- Pomme avec étiquette ----------
function appleSticker(P, size = 460) {
  const id = nid('ap');
  const th = P.id === 'C' ? 'couleur' : 'couleur';
  return `<svg viewBox="0 0 400 420" width="${size}" height="${size*1.05}" xmlns="http://www.w3.org/2000/svg" style="display:block;overflow:visible">
    <defs>
      <radialGradient id="${id}a" cx="38%" cy="38%" r="70%"><stop offset="0" stop-color="#F6C453"/><stop offset=".28" stop-color="#E98A3A"/><stop offset=".6" stop-color="#C8402B"/><stop offset="1" stop-color="#8A2219"/></radialGradient>
      <radialGradient id="${id}h" cx="50%" cy="50%" r="50%"><stop offset="0" stop-color="#fff" stop-opacity=".55"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></radialGradient>
      <radialGradient id="${id}s"><stop offset="0" stop-color="#000" stop-opacity=".4"/><stop offset="1" stop-color="#000" stop-opacity="0"/></radialGradient>
      <filter id="${id}f" x="-20%" y="-20%" width="140%" height="140%"><feDropShadow dx="0" dy="2" stdDeviation="2.5" flood-opacity=".28"/></filter>
    </defs>
    <ellipse cx="200" cy="392" rx="150" ry="20" fill="url(#${id}s)"/>
    <path d="M200 96 C168 74 104 70 74 118 C40 172 50 258 92 314 C124 356 166 372 200 356 C234 372 276 356 308 314 C350 258 360 172 326 118 C296 70 232 74 200 96Z" fill="url(#${id}a)"/>
    <ellipse cx="128" cy="150" rx="36" ry="54" fill="url(#${id}h)" transform="rotate(24 128 150)"/>
    <path d="M200 100 C198 80 202 60 214 42" stroke="#5B3A22" stroke-width="7" fill="none" stroke-linecap="round"/>
    <path d="M208 64 C222 40 256 30 290 40 C276 66 240 76 208 64Z" fill="#4E7D36"/><path d="M210 63 C236 52 262 46 288 41" stroke="#3B6128" stroke-width="2" fill="none"/>
    <g transform="translate(232 214) rotate(-12)" filter="url(#${id}f)">
      <ellipse cx="0" cy="0" rx="74" ry="56" fill="${P.id==='C'?'#FBF6EC':P.c.paper}"/>
      <ellipse cx="0" cy="0" rx="68" ry="50" fill="none" stroke="${P.c.ink}" stroke-opacity=".25" stroke-width="1"/>
      <image href="${D}/piste-${P.id}/vertical-${th}.svg" x="-48" y="-40" width="96" height="74" preserveAspectRatio="xMidYMid meet"/>
    </g>
  </svg>`;
}

// ---------- Cagette avec étiquette ----------
function crate(P, w = 760) {
  const fruit = P.id === 'B' ? ['#E58A55', '#C2602D', '#9E4421'] : ['#F2A160', '#DD6A2C', '#B24E1A'];
  const slat = (top, hgt) => `<div style="position:absolute;left:4%;right:4%;top:${top}%;height:${hgt}%;background:linear-gradient(180deg,#EAD3AC,#D6B888);border-radius:3px;box-shadow:inset 0 -3px 0 rgba(0,0,0,.08),0 2px 3px rgba(0,0,0,.15);overflow:hidden">${layer(tex(WOOD, 600), 'opacity:.55')}${layer(tex(NOISE(0.1), 200))}</div>`;
  return `<div style="position:relative;width:${w}px;height:${w*0.52}px">
    <div style="position:absolute;left:5%;right:5%;top:0;height:30%;display:flex;justify-content:center">
      ${Array.from({ length: 8 }, (_, i) => `<div style="width:12.5%;aspect-ratio:1;border-radius:50%;margin:${i%2?'4%':'1%'} -0.6% 0;background:radial-gradient(circle at 34% 30%,${fruit[0]},${fruit[1]} 58%,${fruit[2]});box-shadow:inset -6px -8px 14px rgba(0,0,0,.18)"></div>`).join('')}</div>
    <div style="position:absolute;left:0;right:0;top:22%;bottom:0;background:#BE9C6B;border-radius:4px;box-shadow:0 40px 60px -26px rgba(40,25,10,.55);overflow:hidden">
      ${layer(tex(WOOD, 600), 'opacity:.4')}
      ${slat(6, 20)}${slat(30, 20)}${slat(54, 20)}${slat(78, 18)}
      <div style="position:absolute;left:0;top:0;bottom:0;width:4%;background:linear-gradient(90deg,#A88655,#BE9C6B)"></div><div style="position:absolute;right:0;top:0;bottom:0;width:4%;background:linear-gradient(270deg,#A88655,#BE9C6B)"></div>
      <div style="position:absolute;left:50%;top:50%;transform:translate(-50%,-50%) rotate(-1.2deg);background:${P.id==='C'?'#FBF6EC':P.c.paper};padding:${w*0.03}px ${w*0.045}px;box-shadow:0 4px 10px rgba(0,0,0,.22);display:flex;flex-direction:column;align-items:center;gap:${w*0.016}px;overflow:hidden">
        ${layer(tex(NOISE(0.07), 200))}
        ${logo(P.id, 'horizontal', 'couleur', { h: P.id === 'A' ? w * 0.04 : w * 0.055 })}
        <div style="border-top:1px solid ${P.c.ink}33;padding-top:${w*0.012}px;${P.label};font-size:${w*0.0135}px;color:${P.c.acc}">Vérifié pièce par pièce</div></div>
    </div></div>`;
}

// ---------- Papeterie ----------
function stationery(P) {
  const paper = P.id === 'C' ? '#FFFFFF' : '#FCFAF6';
  const lines = n => Array.from({ length: n }, (_, i) => `<div style="height:5px;border-radius:3px;background:#00000014;margin:9px 0;width:${[96,92,98,88,94,70][i%6]}%"></div>`).join('');
  return `<div style="position:relative;width:1500px;height:760px">
    <div style="position:absolute;left:90px;top:40px;width:500px;height:707px;background:${paper};transform:rotate(-3deg);box-shadow:0 40px 70px -30px rgba(30,25,15,.45);padding:56px 54px;overflow:hidden">
      ${layer(tex(NOISE(0.05), 200))}
      ${logo(P.id, 'horizontal', 'couleur', { h: P.id === 'A' ? 30 : 40 })}
      <div style="${P.body};font-size:11px;color:${P.c.ink};opacity:.75;margin-top:64px;line-height:1.6">Madame, Monsieur,</div>
      <div style="margin-top:18px">${lines(6)}</div><div style="margin-top:22px">${lines(5)}</div><div style="margin-top:22px">${lines(3)}</div>
      <div style="position:absolute;left:54px;right:54px;bottom:44px;border-top:1px solid ${P.c.ink}26;padding-top:14px;display:flex;justify-content:space-between;${P.body};font-size:9.5px;color:${P.c.ink};opacity:.8"><span>Primeur · Livraison à domicile</span><span>Yvelines (78)</span><span style="color:${P.c.acc}">soleiletsaveurs.fr</span></div>
      <div style="position:absolute;right:0;top:0;width:10px;height:100%;background:${P.c.acc}"></div></div>
    <div style="position:absolute;left:560px;top:420px;width:600px;height:300px;background:${P.id==='B'?P.c.paper:paper};transform:rotate(4deg);box-shadow:0 30px 60px -26px rgba(30,25,15,.45);overflow:hidden">
      ${layer(tex(NOISE(0.06), 200))}
      <div style="position:absolute;left:36px;top:34px">${logo(P.id, 'horizontal', 'couleur', { h: P.id === 'A' ? 22 : 30 })}</div>
      <div style="position:absolute;left:300px;top:150px;${P.body};font-size:13px;color:#333;line-height:1.7">Madame Dupont<br>12, rue des Vergers<br>78000 Versailles</div>
      <div style="position:absolute;right:30px;top:28px;width:56px;height:66px;border:2px dashed ${P.c.ink}40"></div></div>
    <div style="position:absolute;left:860px;top:40px;width:420px;height:240px;background:${P.c.dark};transform:rotate(-7deg);border-radius:8px;box-shadow:0 30px 50px -22px rgba(30,25,15,.55);display:flex;align-items:center;justify-content:flex-start;padding-left:64px;overflow:hidden">
      ${P.id === 'C' ? `<div style="position:absolute;inset:0;opacity:.25">${patternC(420, 240, '#123F30', 18)}</div>` : P.id === 'A' ? `<div style="position:absolute;inset:0;opacity:.18">${patternA(420, 240)}</div>` : ''}
      <img src="${markSrc(P.id, 'sombre')}" style="height:${P.id==='B'?118:100}px;position:relative;margin-top:-20px"></div>
    <div style="position:absolute;left:1000px;top:290px;width:420px;height:240px;background:${paper};transform:rotate(5deg);border-radius:8px;box-shadow:0 30px 50px -22px rgba(30,25,15,.5);padding:36px 38px;display:flex;flex-direction:column;justify-content:space-between;overflow:hidden">
      ${layer(tex(NOISE(0.05), 200))}
      ${logo(P.id, 'horizontal', 'couleur', { h: P.id === 'A' ? 24 : 32 })}
      <div style="${P.body};font-size:13px;line-height:1.7;color:${P.c.ink}"><b style="font-weight:600">Primeur · Livraison à domicile</b><br>Yvelines (78)<br><span style="color:${P.c.acc}">soleiletsaveurs.fr</span></div></div>
  </div>`;
}

module.exports = { setLogos, logo, logoInk, logoW, markSrc, appIcon, browser, phone, phoneShop, phoneSocial, van, kraftBag, appleSticker, crate, stationery, visual, patternA, patternC, sceneB, NOISE, tex, layer };
