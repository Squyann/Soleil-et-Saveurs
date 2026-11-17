// Variante B1 « Le Potager au lever du jour » : copie des SVG, PNG, PDF, photos de profil et comparatif avec le logo validé
// Usage : node b1-export.js <scratchpad> <racine SOLEIL-ET-SAVEURS-BRANDING>
const fs = require('fs'); const { chromium } = require('playwright');
const [, , S, R] = process.argv;
const IN = `${S}/work/b1/src`, OUT = `${R}/10-VARIANTE-B1-LEVER-DU-JOUR`;
const IDX = JSON.parse(fs.readFileSync(`${S}/work/b1-index.json`, 'utf8'));
const MAIN = JSON.parse(fs.readFileSync(`${S}/work/final-index.json`, 'utf8'));
const keep = ['embleme_fond-clair', 'embleme_fond-sombre', 'logo-horizontal_fond-clair', 'logo-horizontal_fond-sombre', 'logo-horizontal-sans-descripteur_fond-clair', 'logo-horizontal-sans-descripteur_fond-sombre', 'logo-vertical_fond-clair', 'logo-vertical_fond-sombre', 'symbole'];
const name = k => `soleil-et-saveurs-B1_${k}`;
const ratio = (I, k) => I[`soleil-et-saveurs_${k}`][2] / I[`soleil-et-saveurs_${k}`][3];
const inline = (file, css) => { const t = fs.readFileSync(file, 'utf8'); const i = t.indexOf('<svg'); return t.slice(i).replace('<svg ', `<svg style="${css}" `).replace(/ width="[^"]+" height="[^"]+"/, ''); };
(async () => {
  for (const d of ['SVG', 'PNG', 'PDF', 'RESEAUX-SOCIAUX']) fs.mkdirSync(`${OUT}/${d}`, { recursive: true });
  for (const k of keep) fs.writeFileSync(`${OUT}/SVG/${name(k)}.svg`, fs.readFileSync(`${IN}/soleil-et-saveurs_${k}.svg`, 'utf8').replace(/Soleil et Saveurs — /, 'Soleil et Saveurs — VARIANTE B1 « Potager au lever du jour » — '));
  for (const k of ['embleme_fond-clair', 'logo-horizontal_fond-clair']) fs.writeFileSync(`${OUT}/SVG/${name(k)}_texte-editable.svg`, fs.readFileSync(`${IN}/soleil-et-saveurs_${k}_texte-editable.svg`, 'utf8'));
  const b = await chromium.launch(); const p = await b.newPage();
  const shot = async (html, W, H, out, bg = null) => { fs.writeFileSync(`${S}/work/_b1.html`, `<!doctype html><html><body style="margin:0;background:${bg || 'transparent'}">${html}</body></html>`);
    await p.setViewportSize({ width: W, height: H }); await p.goto('file://' + `${S}/work/_b1.html`); await p.waitForTimeout(150);
    await p.screenshot({ path: out, omitBackground: !bg, clip: { x: 0, y: 0, width: W, height: H } }); };
  // PNG transparents : 2x et 4x (horizontal 2000/4000 px de large ; vertical, emblème 1200/2400 px de haut ; symbole 1024/2048)
  for (const k of keep) for (const s of [2, 4]) {
    const a = ratio(IDX, k); const hz = k.includes('horizontal');
    const W = Math.round(hz ? 1000 * s : (k === 'symbole' ? 512 : 600) * s * a), H = Math.round(hz ? 1000 * s / a : (k === 'symbole' ? 512 : 600) * s);
    await shot(inline(`${OUT}/SVG/${name(k)}.svg`, `width:${W}px;height:${H}px;display:block`), W, H, `${OUT}/PNG/${name(k)}@${s}x.png`);
  }
  // PDF vectoriels (le paysage B1 n'a pas d'effet : 100 % vectoriel)
  for (const k of ['embleme_fond-clair', 'embleme_fond-sombre', 'logo-horizontal_fond-clair', 'logo-horizontal_fond-sombre', 'logo-vertical_fond-clair', 'symbole']) {
    const a = ratio(IDX, k); const hz = k.includes('horizontal'); const W = Math.round(hz ? 600 : 360 * a), H = Math.round(hz ? 600 / a : 360);
    fs.writeFileSync(`${S}/work/_b1.html`, `<!doctype html><html><head><style>@page{size:${W}px ${H}px;margin:0}html,body{margin:0}</style></head><body>${inline(`${OUT}/SVG/${name(k)}.svg`, `width:${W}px;height:${H}px;display:block`)}</body></html>`);
    await p.goto('file://' + `${S}/work/_b1.html`); await p.waitForTimeout(100);
    await p.pdf({ path: `${OUT}/PDF/${name(k)}.pdf`, width: `${W}px`, height: `${H}px`, printBackground: false, pageRanges: '1' });
  }
  // Photos de profil rondes (le logo tient entièrement dans le cercle)
  const prof = (k, bg) => { const a = ratio(IDX, k); const h = 0.9 * 2048 / Math.sqrt(1 + a * a) * (k === 'symbole' ? 1.04 : 1); return `<div style="width:2048px;height:2048px;background:${bg};display:flex;align-items:center;justify-content:center"><img src="${OUT}/SVG/${name(k)}.svg" style="width:${(h * a).toFixed(1)}px;height:${h.toFixed(1)}px"></div>`; };
  await shot(prof('embleme_fond-clair', '#F3E8D6'), 2048, 2048, `${OUT}/RESEAUX-SOCIAUX/photo-profil-B1_embleme_fond-lin.png`);
  await shot(prof('embleme_fond-sombre', '#2F4A2B'), 2048, 2048, `${OUT}/RESEAUX-SOCIAUX/photo-profil-B1_embleme_fond-vert.png`);
  await shot(prof('symbole', '#F3E8D6'), 2048, 2048, `${OUT}/RESEAUX-SOCIAUX/photo-profil-B1_symbole_fond-lin.png`);
  // Comparatif : logo validé (papier découpé) et variante B1
  const F = 'font-family:sans-serif';
  const col = (title, emb, hor, prof) => `<div style="flex:1;display:flex;flex-direction:column;gap:22px;align-items:center">
    <div style="font:700 30px sans-serif;color:#2F4A2B">${title}</div>
    <div style="background:#F3E8D6;border-radius:18px;width:100%;height:860px;display:flex;align-items:center;justify-content:center"><img src="${emb}" style="height:780px"></div>
    <div style="background:#fff;border-radius:18px;width:100%;height:220px;display:flex;align-items:center;justify-content:center"><img src="${hor}" style="width:84%"></div>
    <div style="display:flex;gap:30px;align-items:center"><div style="width:240px;height:240px;border-radius:50%;overflow:hidden;box-shadow:0 0 0 5px #fff,0 6px 18px rgba(0,0,0,.2)"><img src="${prof}" style="width:100%;height:100%"></div><div style="font:400 22px sans-serif;color:#555">Photo de profil</div></div></div>`;
  const html = `<div style="width:1800px;padding:60px;background:#E9E3D8;${F}"><div style="font:700 15px sans-serif;letter-spacing:.2em;text-transform:uppercase;color:#A94E25">Soleil et Saveurs · comparatif</div>
    <div style="font:700 56px Georgia,serif;color:#2F4A2B;margin:12px 0 40px">Papier découpé ou Potager au lever du jour ?</div>
    <div style="display:flex;gap:50px">${col('Logo validé · Papier découpé', `${R}/01-LOGO-SOURCE/soleil-et-saveurs_embleme_fond-clair.svg`, `${R}/01-LOGO-SOURCE/soleil-et-saveurs_logo-horizontal_fond-clair.svg`, `${R}/09-RESEAUX-SOCIAUX/photo-profil_embleme_fond-lin.png`)}
    ${col('Variante B1 · Potager au lever du jour', `${OUT}/SVG/${name('embleme_fond-clair')}.svg`, `${OUT}/SVG/${name('logo-horizontal_fond-clair')}.svg`, `${OUT}/RESEAUX-SOCIAUX/photo-profil-B1_embleme_fond-lin.png`)}</div></div>`;
  fs.writeFileSync(`${S}/work/_b1.html`, `<!doctype html><html><body style="margin:0">${html}</body></html>`);
  await p.setViewportSize({ width: 1800, height: 1000 }); await p.goto('file://' + `${S}/work/_b1.html`); await p.waitForTimeout(250);
  await p.screenshot({ path: `${OUT}/comparatif_papier-decoupe_vs_B1.png`, fullPage: true });
  await b.close(); console.log('ok');
})();
