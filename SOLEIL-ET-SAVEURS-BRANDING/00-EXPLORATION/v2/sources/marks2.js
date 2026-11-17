// Symboles perfectionnés (v2). Chaque fonction renvoie le contenu SVG (sans balise <svg>)
// dessiné dans un repère 100 x 100 (120 de haut pour l'arche B).
const f = n => +n.toFixed(2);

// ---------------- PISTE A — L'Étoile du fruit ----------------
// Pépin : goutte effilée, extrémité ronde vers le cœur, pointe vers l'extérieur (rayon de soleil).
function pepin(cx, cy, c, t, r, angle) {
  // c : distance du centre de l'arrondi ; t : distance de la pointe ; r : rayon de l'arrondi
  // côtés convexes : forme de vrai pépin de pomme
  const k1 = (t - c) * 0.45, k2 = r * 0.5;
  const d = `M0 ${-t} C${f(r*1.0)} ${f(-t+k1)} ${r} ${f(-c-k2)} ${r} ${-c} A${r} ${r} 0 0 1 ${-r} ${-c} C${-r} ${f(-c-k2)} ${f(-r*1.0)} ${f(-t+k1)} 0 ${-t}Z`;
  return `<path d="${d}" transform="translate(${cx} ${cy}) rotate(${angle})"/>`;
}
const A_GEOM = { cx: 50, cy: 55, R: 43, w: 3.5, c: 15.4, t: 35.6, r: 6.0 };
function markA({ ring = '#1E3A2C', star = '#B98C3E', leaf = null, fill = 'none', solid = false } = {}) {
  const g = A_GEOM, lf = leaf || ring;
  const w = solid ? 0 : g.w;
  const seeds = [0, 72, 144, 216, 288].map(a => pepin(g.cx, g.cy, g.c, g.t, g.r, a)).join('');
  const circle = solid
    ? `<circle cx="${g.cx}" cy="${g.cy}" r="${g.R}" fill="${ring}"/>`
    : `<circle cx="${g.cx}" cy="${g.cy}" r="${f(g.R - w/2)}" fill="${fill}" stroke="${ring}" stroke-width="${w}"/>`;
  // Feuille : naît au sommet du fruit, légèrement décalée, pointe vers la droite
  const leafP = `<path d="M50.6 ${g.cy - g.R + 0.8} C52.2 ${g.cy - g.R - 6.4} 59.6 ${g.cy - g.R - 10.6} 68.6 ${g.cy - g.R - 9.6} C66.4 ${g.cy - g.R - 2.6} 58.8 ${g.cy - g.R + 1.4} 50.6 ${g.cy - g.R + 0.8}Z" fill="${lf}"/>`;
  return `${circle}${leafP}<g fill="${star}">${seeds}</g>`;
}

// ---------------- PISTE B — L'Horizon gourmand ----------------
const B_ARCH = 'M14 116 V52 A36 36 0 0 1 86 52 V116 Z';
function markB({ sky = '#C2602D', sun = '#ECAD44', back = '#6F8A50', front = '#2F4A2B', mono = null, paper = '#fff', id = 'b' } = {}) {
  const stemF = c => `<path d="M32.2 81 C32.2 76.4 30.8 73.2 27.6 71.4" fill="none" stroke="${c}" stroke-width="2.6" stroke-linecap="round"/>
    <path d="M32.6 78.2 C35.6 72.8 41.8 70.8 47.4 72.8 C44 77.8 38 79.8 32.6 78.2Z" fill="${c}"/>`;
  const stemB = c => `<path d="M74 79.6 C74.4 75.8 76.2 73.4 79.6 72.2" fill="none" stroke="${c}" stroke-width="2.4" stroke-linecap="round"/>`;
  if (mono) {
    // Monochrome : arche pleine, soleil et séparations en réserve (vraie transparence via un masque)
    const K = '#000', W = '#fff';
    return `<defs><mask id="${id}" maskUnits="userSpaceOnUse" x="0" y="0" width="100" height="120">
        <path d="${B_ARCH}" fill="${W}"/>
        <circle cx="52" cy="70" r="19" fill="${K}"/>
        <circle cx="74" cy="101.5" r="22" fill="${W}" stroke="${K}" stroke-width="3.4"/>
        <path d="M74 79.6 C74.4 75.8 76.2 73.4 79.6 72.2" fill="none" stroke="${K}" stroke-width="2.4" stroke-linecap="round"/>
        <circle cx="32" cy="109" r="28" fill="${W}" stroke="${K}" stroke-width="3.4"/>
        <path d="M32.2 81 C32.2 76.4 30.8 73.2 27.6 71.4" fill="none" stroke="${K}" stroke-width="2.6" stroke-linecap="round"/>
        <path d="M32.6 78.2 C35.6 72.8 41.8 70.8 47.4 72.8 C44 77.8 38 79.8 32.6 78.2Z" fill="${W}" stroke="${K}" stroke-width="2.6" paint-order="stroke"/>
        <path d="M14 116 H86" stroke="${W}" stroke-width="0.01"/>
      </mask></defs>
      <rect x="14" y="16" width="72" height="100" fill="${mono}" mask="url(#${id})"/>`;
  }
  return `<defs><clipPath id="${id}"><path d="${B_ARCH}"/></clipPath></defs>
    <path d="${B_ARCH}" fill="${sky}"/>
    <g clip-path="url(#${id})">
      <circle cx="52" cy="70" r="19" fill="${sun}"/>
      <circle cx="74" cy="101.5" r="22" fill="${back}"/>${stemB(back)}
      <circle cx="32" cy="109" r="28" fill="${front}"/>${stemF(front)}
    </g>`;
}

// ---------------- PISTE C — Le Sommet de l'étal ----------------
const C_GEOM = (() => { const r = 14.2, gap = 2.7, d = 2*r + gap, h = d * Math.sqrt(3) / 2, y0 = 95 - r; return { r, gap, d, h, y0 }; })();
function markC({ base = '#DD6A2C', top = '#F3B33E', leaf = '#123F30' } = {}) {
  const { r, d, h, y0 } = C_GEOM;
  const pts = [[-1,0],[0,0],[1,0],[-0.5,1],[0.5,1],[0,2]];
  const circ = pts.map(([i,j]) => `<circle cx="${f(50 + i*d)}" cy="${f(y0 - j*h)}" r="${r}" fill="${j===2?top:base}"/>`).join('');
  const ty = y0 - 2*h - r; // sommet du fruit-soleil
  const lf = `<path d="M50.8 ${f(ty+1)} C51.8 ${f(ty-5.4)} 57.6 ${f(ty-9.4)} 65.4 ${f(ty-8.6)} C63.4 ${f(ty-2.2)} 57.4 ${f(ty+1.8)} 50.8 ${f(ty+1)}Z" fill="${leaf}"/>`;
  return `${circ}${lf}`;
}

module.exports = { markA, markB, markC, A_GEOM, C_GEOM, B_ARCH, f };
