// Moteur commun des pistes D → R : textes vectorisés, assemblages, masques, mesure et écriture des SVG
const fs = require('fs'), path = require('path'), { execFileSync } = require('child_process');
const f = n => +(+n).toFixed(2);
let S = '';
const setRoot = s => { S = s; };
const FONT = n => `${S}/fonts/${n}.woff2`;

// ---- Textes ----
function shapeAll(specs) { // specs : { clé: runs }
  const keys = Object.keys(specs);
  const out = execFileSync('python3', ['-I', path.join(__dirname, '..', 'text2path.py')], { input: JSON.stringify(keys.map(k => specs[k])), maxBuffer: 1 << 28 });
  const res = JSON.parse(out); const T = {}; keys.forEach((k, i) => T[k] = res[i]); return T;
}
// Place une ligne de texte : (x, y) = origine de la ligne de base ; anchor 'start' | 'middle' | 'end' (sur l'encre)
function line(L, x, y, fill, anchor = 'start', scale = 1) {
  const w = (L.bbox[2] - L.bbox[0]) * scale;
  const dx = anchor === 'middle' ? -L.bbox[0] * scale - w / 2 : anchor === 'end' ? -L.bbox[2] * scale : -L.bbox[0] * scale;
  return `<path fill="${fill}" transform="translate(${f(x + dx)} ${f(y)})${scale !== 1 ? ` scale(${f(scale)})` : ''}" d="${L.d}"/>`;
}
const inkW = L => L.bbox[2] - L.bbox[0];
// Texte sur un arc (glyphes un par un). sens 1 = horaire, lecture en haut ; sens -1 = lecture en bas
function arcText(L, cx, cy, R, centerAngle, fill, sens = 1, letterSpacing = 0) {
  const gl = L.glyphs; const total = L.width; let out = '';
  gl.forEach(g => {
    const mid = -total / 2 + g.x + g.adv / 2;
    const ang = centerAngle + sens * (mid / R) * 180 / Math.PI;
    const rad = (ang - 90) * Math.PI / 180;
    const px = cx + R * Math.cos(rad), py = cy + R * Math.sin(rad);
    const rot = sens === 1 ? ang : ang + 180;
    if (g.d) out += `<path fill="${fill}" d="${g.d}" transform="translate(${f(px)} ${f(py)}) rotate(${f(rot)}) translate(${f(-g.adv / 2)} 0)"/>`;
  });
  return out;
}

// ---- Masques (réserves vraiment transparentes) ----
let mid = 0;
function knock(vb, base, cuts, fill) {
  const id = `k${++mid}`; const [x, y, w, h] = vb;
  return `<defs><mask id="${id}" maskUnits="userSpaceOnUse" x="${x}" y="${y}" width="${w}" height="${h}"><g fill="#fff" stroke="none">${base}</g><g fill="#000" stroke="#000">${cuts}</g></mask></defs><rect x="${x}" y="${y}" width="${w}" height="${h}" fill="${fill}" mask="url(#${id})"/>`;
}

// ---- Assemblages ----
// mark : { svg (contenu), vb:[x,y,w,h], ref:[y0,y1] facultatif } ; lines : [L] ; fill : couleur du texte
function horiz(mark, L, { k = 2.4, gap = 0.7, fill, dy = 0 }) {
  const cap = L.capH; const [vx, vy, vw, vh] = mark.vb; const [r0, r1] = mark.ref || [vy, vy + vh];
  const sc = (k * cap) / (r1 - r0);
  const ty = -cap / 2 - ((r0 + r1) / 2) * sc + dy * cap, tx = -vx * sc;
  const tX = vw * sc + gap * cap;
  return `<g transform="translate(${f(tx)} ${f(ty)}) scale(${f(sc)})">${mark.svg}</g>${line(L, tX, 0, fill)}`;
}
function vert(mark, lines, { k = 3, gap = 0.5, lead = 0.3, fill }) {
  const cap = lines[0].capH; const [vx, vy, vw, vh] = mark.vb; const [r0, r1] = mark.ref || [vy, vy + vh];
  const sc = (k * cap) / (r1 - r0);
  let out = `<g transform="translate(${f(-(vx + vw / 2) * sc)} ${f(-vy * sc)}) scale(${f(sc)})">${mark.svg}</g>`;
  let y = vh * sc + gap * cap;
  lines.forEach(L => { const by = y - L.bbox[1]; out += line(L, 0, by, fill, 'middle'); y = L.bbox[3] + by + lead * cap; });
  return out;
}
const svgWrap = (inner, vb) => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${vb.map(f).join(' ')}" width="${f(vb[2])}" height="${f(vb[3])}">${inner}</svg>`;

// ---- Mesure de l'encre (deux passes : getBBox puis pixels) et écriture ----
async function tightAll(items, page) { // items : [{file, inner, title}]
  const index = {};
  for (const it of items) {
    await page.setViewportSize({ width: 800, height: 800 });
    await page.setContent(`<html><body style="margin:0"><svg id="s" width="10" height="10" overflow="visible" xmlns="http://www.w3.org/2000/svg"><g id="g">${it.inner}</g></svg></body></html>`);
    const bb = await page.evaluate(() => { const b = document.getElementById('g').getBBox(); return [b.x, b.y, b.width, b.height]; });
    const pad = 0.12 * Math.max(bb[2], bb[3]);
    const R = [bb[0] - pad, bb[1] - pad, bb[2] + 2 * pad, bb[3] + 2 * pad];
    const sc = 1800 / Math.max(R[2], R[3]); const W = Math.ceil(R[2] * sc), H = Math.ceil(R[3] * sc);
    await page.setViewportSize({ width: W, height: H });
    await page.setContent(`<html><body style="margin:0;background:transparent"><svg width="${W}" height="${H}" viewBox="${R.join(' ')}" xmlns="http://www.w3.org/2000/svg">${it.inner.replace(/#FFFFFF/gi, '#000001')}</svg></body></html>`);
    const buf = await page.screenshot({ omitBackground: true, clip: { x: 0, y: 0, width: W, height: H } });
    const tmp = `${S}/work/_t.png`; fs.writeFileSync(tmp, buf);
    const px = JSON.parse(execFileSync('python3', ['-I', '-c', `import sys,json;from PIL import Image;im=Image.open(sys.argv[1]).getchannel('A').point(lambda v:255 if v>6 else 0);print(json.dumps(im.getbbox()))`, tmp]).toString());
    const m = 0.004 * Math.max(R[2], R[3]);
    const vb = [R[0] + px[0] / sc - m, R[1] + px[1] / sc - m, (px[2] - px[0]) / sc + 2 * m, (px[3] - px[1]) / sc + 2 * m];
    fs.mkdirSync(path.dirname(it.file), { recursive: true });
    fs.writeFileSync(it.file, `<?xml version="1.0" encoding="UTF-8"?>\n<!-- ${it.title} -->\n` + svgWrap(it.inner, vb) + '\n');
    index[it.key] = vb.map(f);
  }
  return index;
}

module.exports = { f, setRoot, FONT, shapeAll, line, inkW, arcText, knock, horiz, vert, svgWrap, tightAll };
