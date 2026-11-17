// Construction des logos maîtres vectoriels (texte vectorisé) des trois pistes.
// Usage : node lockups.js <scratchpad> <dossier de sortie>
const fs = require('fs'), path = require('path'), { execFileSync } = require('child_process');
const { chromium } = require('playwright');
const M = require('./marks2.js');
const f = n => +(+n).toFixed(2);
const S = process.argv[2];
const FONT = n => `${S}/fonts/${n}.woff2`;

// ---------------- Thèmes de couleur ----------------
const PISTES = {
  A: {
    nom: "L'Étoile du fruit",
    themes: {
      couleur: { mark: o => M.markA(o), opts: {}, text: '#1E3A2C', bg: '#F4EEE3' },
      sombre: { mark: o => M.markA(o), opts: { ring: '#F4EEE3', star: '#D9B66A' }, text: '#F4EEE3', bg: '#1E3A2C' },
      noir: { mark: o => M.markA(o), opts: { ring: '#000000', star: '#000000' }, text: '#000000', bg: '#FFFFFF' },
      blanc: { mark: o => M.markA(o), opts: { ring: '#FFFFFF', star: '#FFFFFF' }, text: '#FFFFFF', bg: '#000000' },
      plein: { mark: o => M.markA(o), opts: { solid: true, ring: '#1E3A2C', star: '#D9B66A' }, text: '#1E3A2C', bg: '#F4EEE3' },
    },
    vb: [0, 0, 100, 100],
    ref: { y0: 12, y1: 98 },            // hauteur de référence : le cercle du fruit (sans la feuille)
    h: { k: 2.7, gap: 0.95 },           // diamètre = 2,7 × hauteur de capitale ; écart = 0,95 × capitale
    v: { k: 3.4, gap: 0.62, lead: 0.42 },
  },
  B: {
    nom: "L'Horizon gourmand",
    themes: {
      couleur: { mark: o => M.markB(o), opts: {}, text: '#2F4A2B', bg: '#F3E8D6' },
      sombre: { mark: o => M.markB(o), opts: { front: '#6F8A50', back: '#A9B985' }, text: '#F3E8D6', bg: '#2F4A2B' },
      noir: { mark: o => M.markB(o), opts: { mono: '#000000', paper: '#FFFFFF' }, text: '#000000', bg: '#FFFFFF' },
      blanc: { mark: o => M.markB(o), opts: { mono: '#FFFFFF', paper: '#000000' }, text: '#FFFFFF', bg: '#000000' },
    },
    vb: [0, 0, 100, 120],
    ref: { y0: 16, y1: 116 },
    h: { k: 3.15, gap: 0.62 },
    v: { k: 3.6, gap: 0.5, lead: 0.3 },
  },
  C: {
    nom: "Le Sommet de l'étal",
    themes: {
      couleur: { mark: o => M.markC(o), opts: {}, text: '#123F30', bg: '#FBF6EC' },
      sombre: { mark: o => M.markC(o), opts: { leaf: '#9CC37A' }, text: '#FBF6EC', bg: '#123F30' },
      noir: { mark: o => M.markC(o), opts: { base: '#000000', top: '#000000', leaf: '#000000' }, text: '#000000', bg: '#FFFFFF' },
      blanc: { mark: o => M.markC(o), opts: { base: '#FFFFFF', top: '#FFFFFF', leaf: '#FFFFFF' }, text: '#FFFFFF', bg: '#000000' },
    },
    vb: [0, 0, 100, 100],
    ref: { y0: null, y1: 95 },          // hauteur de référence : la pyramide (sans la feuille), calculée plus bas
    h: { k: 2.35, gap: 0.62 },
    v: { k: 2.9, gap: 0.42, lead: 0.2 },
  },
};
{ const g = M.C_GEOM; PISTES.C.ref.y0 = +(g.y0 - 2*g.h - g.r).toFixed(2); }

// ---------------- Textes ----------------
const cormR = { font: FONT('CormorantGaramond-normal'), axes: { wght: 600 } };
const cormI = { font: FONT('CormorantGaramond-italic'), axes: { wght: 500 } };
const fraR = { font: FONT('Fraunces-normal'), axes: { wght: 620, SOFT: 100, opsz: 72, WONK: 0 } };
const fraI = { font: FONT('Fraunces-italic'), axes: { wght: 480, SOFT: 100, opsz: 72, WONK: 0 } };
const bri = { font: FONT('Bricolage-normal'), axes: { wght: 700, wdth: 88, opsz: 96 } };
const SZ = 100;
const LINES = {
  A_h: [{ ...cormR, size: SZ, text: 'SOLEIL', tracking: 0.13 }, { ...cormI, size: SZ, text: 'et', dx: 0.30 }, { ...cormR, size: SZ, text: 'SAVEURS', tracking: 0.13, dx: 0.27 }],
  A_v1: [{ ...cormR, size: SZ, text: 'SOLEIL', tracking: 0.13 }],
  A_v2: [{ ...cormI, size: SZ, text: 'et' }],
  A_v3: [{ ...cormR, size: SZ, text: 'SAVEURS', tracking: 0.13 }],
  B_h: [{ ...fraR, size: SZ, text: 'Soleil ' }, { ...fraI, size: SZ, text: 'et', dx: -0.01 }, { ...fraR, size: SZ, text: ' Saveurs', dx: 0.0 }],
  B_v1: [{ ...fraR, size: SZ, text: 'Soleil ' }, { ...fraI, size: SZ, text: 'et' }],
  B_v2: [{ ...fraR, size: SZ, text: 'Saveurs' }],
  C_h: [{ ...bri, size: SZ, text: 'Soleil et Saveurs', tracking: -0.022 }],
  C_v1: [{ ...bri, size: SZ, text: 'Soleil et', tracking: -0.022 }],
  C_v2: [{ ...bri, size: SZ, text: 'Saveurs', tracking: -0.022 }],
};

function shapeAll() {
  const keys = Object.keys(LINES);
  const out = execFileSync('python3', ['-I', path.join(__dirname, 'text2path.py')], { input: JSON.stringify(keys.map(k => LINES[k])), maxBuffer: 1 << 26 });
  const res = JSON.parse(out); const T = {};
  keys.forEach((k, i) => T[k] = res[i]);
  return T;
}

// ---------------- Mesure de l'encre des symboles (au pixel près) ----------------
async function measureMarks() {
  const browser = await chromium.launch(); const page = await browser.newPage();
  const B = {};
  for (const [id, P] of Object.entries(PISTES)) for (const [th, T] of Object.entries(P.themes)) {
    const [, , w, h] = P.vb, sc = 20;
    const inner = T.mark({ ...T.opts, id: `m${id}${th}` });
    await page.setViewportSize({ width: w * sc, height: h * sc });
    await page.setContent(`<html><body style="margin:0;background:transparent"><svg width="${w*sc}" height="${h*sc}" viewBox="${P.vb.join(' ')}" xmlns="http://www.w3.org/2000/svg">${inner.replace(/#FFFFFF/g, '#000001')}</svg></body></html>`);
    const buf = await page.screenshot({ omitBackground: true });
    const tmp = `${S}/work/_m.png`; fs.writeFileSync(tmp, buf);
    const bb = JSON.parse(execFileSync('python3', ['-I', '-c', `import sys,json;from PIL import Image;im=Image.open(sys.argv[1]).getchannel('A').point(lambda v:255 if v>8 else 0);print(json.dumps(im.getbbox()))`, tmp]).toString());
    B[`${id}_${th}`] = [bb[0] / sc, bb[1] / sc, bb[2] / sc, bb[3] / sc];
  }
  await browser.close();
  return B;
}

// ---------------- Assemblage ----------------
function svgDoc(vb, body, title) {
  const [x, y, w, h] = vb.map(f);
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="${x} ${y} ${w} ${h}" width="${f(w)}" height="${f(h)}">
  <title>${title}</title>
${body}
</svg>
`;
}
const markGroup = (P, id, th, tx, ty, sc, uid) => {
  const T = P.themes[th];
  return `  <g transform="translate(${f(tx)} ${f(ty)}) scale(${f(sc * 1000) / 1000})">${T.mark({ ...T.opts, id: uid })}</g>`;
};
function inkUnion(boxes) { return boxes.reduce((a, b) => [Math.min(a[0], b[0]), Math.min(a[1], b[1]), Math.max(a[2], b[2]), Math.max(a[3], b[3])]); }

function horizontal(id, th, T, MB) {
  const P = PISTES[id], L = T[`${id}_h`], cap = L.capH;
  const refH = P.ref.y1 - P.ref.y0, sc = (P.h.k * cap) / refH;
  const mb = MB[`${id}_${th}`];
  // centre de la référence du symbole aligné sur le milieu de la hauteur de capitale
  const ty = -cap / 2 - ((P.ref.y0 + P.ref.y1) / 2) * sc;
  const tx = -mb[0] * sc;
  const markRight = mb[2] * sc + tx;
  const textX = markRight + P.h.gap * cap - L.bbox[0];
  const markBox = [mb[0] * sc + tx, mb[1] * sc + ty, mb[2] * sc + tx, mb[3] * sc + ty];
  const textBox = [L.bbox[0] + textX, L.bbox[1], L.bbox[2] + textX, L.bbox[3]];
  const u = inkUnion([markBox, textBox]);
  const body = `${markGroup(P, id, th, tx, ty, sc, `h${id}${th}`)}
  <path fill="${P.themes[th].text}" transform="translate(${f(textX)} 0)" d="${L.d}"/>`;
  return { vb: [u[0], u[1], u[2] - u[0], u[3] - u[1]], body, cap };
}

function vertical(id, th, T, MB) {
  const P = PISTES[id], th_ = P.themes[th];
  const lines = Object.keys(T).filter(k => k.startsWith(`${id}_v`)).sort().map(k => T[k]);
  const cap = lines[0].capH;
  const refH = P.ref.y1 - P.ref.y0, sc = (P.v.k * cap) / refH;
  const mb = MB[`${id}_${th}`];
  // symbole centré horizontalement sur 0
  const mcx = ((mb[0] + mb[2]) / 2) * sc;
  const tx = -mcx, ty = 0;
  const markBox = [mb[0] * sc + tx, mb[1] * sc + ty, mb[2] * sc + tx, mb[3] * sc + ty];
  let y = markBox[3] + P.v.gap * cap; // haut d'encre de la première ligne
  const boxes = [markBox]; let body = markGroup(P, id, th, tx, ty, sc, `v${id}${th}`) + '\n';
  lines.forEach((L, i) => {
    const by = y - L.bbox[1];                          // ligne de base
    const bx = -(L.bbox[0] + L.bbox[2]) / 2;           // centrage sur l'encre
    body += `  <path fill="${th_.text}" transform="translate(${f(bx)} ${f(by)})" d="${L.d}"/>\n`;
    boxes.push([L.bbox[0] + bx, L.bbox[1] + by, L.bbox[2] + bx, L.bbox[3] + by]);
    y = L.bbox[3] + by + P.v.lead * cap;
  });
  const u = inkUnion(boxes);
  return { vb: [u[0], u[1], u[2] - u[0], u[3] - u[1]], body };
}

function symbol(id, th, MB) {
  const P = PISTES[id], mb = MB[`${id}_${th}`];
  return { vb: [mb[0], mb[1], mb[2] - mb[0], mb[3] - mb[1]], body: markGroup(P, id, th, 0, 0, 1, `s${id}${th}`) };
}

(async () => {
  const out = process.argv[3]; fs.mkdirSync(out, { recursive: true });
  const T = shapeAll(); const MB = await measureMarks();
  fs.writeFileSync(`${S}/work/lockup-metrics.json`, JSON.stringify({ MB, T: Object.fromEntries(Object.entries(T).map(([k, v]) => [k, { ...v, d: undefined }])) }, null, 1));
  const index = {};
  for (const id of Object.keys(PISTES)) {
    const dir = `${out}/piste-${id}`; fs.mkdirSync(dir, { recursive: true });
    for (const th of Object.keys(PISTES[id].themes)) {
      const items = th === 'plein' ? { symbole: symbol(id, th, MB) } : { horizontal: horizontal(id, th, T, MB), vertical: vertical(id, th, T, MB), symbole: symbol(id, th, MB) };
      for (const [kind, r] of Object.entries(items)) {
        const name = `${kind}-${th}`;
        fs.writeFileSync(`${dir}/${name}.svg`, svgDoc(r.vb, r.body, `Soleil et Saveurs — piste ${id} « ${PISTES[id].nom} » — ${kind} ${th}`));
        index[`${id}/${name}`] = r.vb.map(f);
      }
    }
  }
  fs.writeFileSync(`${S}/work/lockups-index.json`, JSON.stringify(index, null, 1));
  console.log(Object.keys(index).length, 'fichiers');
})();
