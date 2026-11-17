// Les 15 pistes D → R : un type de logo différent par piste
const E = require('./engine.js');
const { f, FONT, line, inkW, arcText, knock, horiz, vert } = E;
const MONO = (roles, col) => Object.fromEntries(Object.keys(roles).map(k => [k, col]));
const themes = (couleur, sombre) => ({ couleur, sombre, noir: MONO(couleur, '#000000'), blanc: MONO(couleur, '#FFFFFF') });
const rays = (cx, cy, n, r0, r1, w, col, start = 0) => Array.from({ length: n }, (_, i) => { const a = start + i * 360 / n; return `<line x1="${cx}" y1="${cy - r0}" x2="${cx}" y2="${cy - r1}" stroke="${col}" stroke-width="${w}" stroke-linecap="round" transform="rotate(${f(a)} ${cx} ${cy})"/>`; }).join('');
const leafP = (x, y, s, col, rot = 0) => `<path d="M0 0 C1.4 -5.6 6.8 -9.4 13.6 -8.6 C11.8 -2.4 6.2 1 0 0Z" fill="${col}" transform="translate(${f(x)} ${f(y)}) rotate(${rot}) scale(${f(s)})"/>`;
const glyphs = (L, x, y, colorOf) => L.glyphs.map((g, i) => g.d ? `<path fill="${colorOf(i, g)}" d="${g.d}" transform="translate(${f(x + g.x)} ${f(y)})"/>` : '').join('');

const C = {};

// ============ D — Logotype pur : le point de soleil ============
C.D = {
  id: 'D', nom: 'Le Point de soleil', type: 'Logotype pur', famille: 'Wordmark',
  idee: "Aucun pictogramme : le nom seul, dessiné dans une Didone de haute couture. Un seul détail change tout : le point du « i » de Soleil est un petit soleil d'or, avec sa feuille.",
  idee2: "Le luxe du détail : le soin du primeur se lit dans un point.", hero: 'van',
  c: { ink: '#161616', acc: '#C8902A', accLight: '#E9AE36', paper: '#F7F3EC', dark: '#161616', bgSoft: '#E9E4DA' },
  pal: [['Encre', '#161616'], ['Or soleil', '#E3A221'], ['Feuille', '#2F6B3A'], ['Papier', '#F7F3EC']],
  typo: 'Bodoni Moda 560 (optique 30) · Jost', head: "font-family:Bod;font-weight:560;font-variation-settings:'opsz' 30", body: 'font-family:Jost;font-weight:400', label: 'font-family:Jost;font-weight:500;letter-spacing:.26em;text-transform:uppercase', emStyle: 'italic', radius: 0,
  texts: { h: [{ f: 'BodoniModa-normal', axes: { wght: 560, opsz: 30 }, text: 'Soleıl et Saveurs', glyphs: true }], v1: [{ f: 'BodoniModa-normal', axes: { wght: 560, opsz: 30 }, text: 'Soleıl', glyphs: true }], v2: [{ f: 'BodoniModa-normal', axes: { wght: 560, opsz: 30 }, text: 'et Saveurs' }], S: [{ f: 'BodoniModa-normal', axes: { wght: 560, opsz: 30 }, text: 'S' }] },
  themes: themes({ txt: '#161616', sun: '#E3A221', leaf: '#2F6B3A' }, { txt: '#F7F3EC', sun: '#E9AE36', leaf: '#86B86B' }),
  build(th, T) {
    const k = this.themes[th];
    const sunDot = (L, x0, y0) => { const g = L.glyphs.find(g => g.name === 'dotlessi'); const cx = x0 + g.x + g.adv * 0.5 - 0.6, cy = y0 - L.xH - 17.5, r = 8.6;
      return `<circle cx="${f(cx)}" cy="${f(cy)}" r="${r}" fill="${k.sun}"/>${leafP(cx + 1.4, cy - r + 0.8, 0.62, k.leaf)}`; };
    const H = line(T.h, 0, 0, k.txt) + sunDot(T.h, -T.h.bbox[0], 0);
    const w1 = inkW(T.v1), w2 = inkW(T.v2); const lead = 112;
    const V = line(T.v1, 0, 0, k.txt, 'middle') + sunDot(T.v1, -T.v1.bbox[0] - w1 / 2, 0) + line(T.v2, 0, lead, k.txt, 'middle');
    const sx = inkW(T.S);
    const SYM = line(T.S, 0, 0, k.txt) + `<circle cx="${f(sx + 13)}" cy="${f(-T.S.capH + 9)}" r="9.4" fill="${k.sun}"/>${leafP(sx + 14.6, -T.S.capH + 0.6, 0.66, k.leaf)}`;
    return { horizontal: H, vertical: V, symbole: SYM };
  },
};

// ============ E — Monogramme S&S ============
C.E = {
  id: 'E', nom: 'Le Monogramme', type: 'Monogramme', famille: 'Lettermark',
  idee: "Les deux initiales, unies par une esperluette d'or dans un cartouche ovale, comme le chiffre brodé d'une maison. Le « & » est le cœur du nom : le lien entre les producteurs et vos clients.",
  idee2: "Intemporel : se brode, se grave, se tamponne.", hero: 'cards',
  c: { ink: '#4B2342', acc: '#B88A3A', accLight: '#D7B26A', paper: '#F6EFE6', dark: '#4B2342', bgSoft: '#EDE3D8' },
  pal: [['Aubergine', '#4B2342'], ['Or', '#C9A24B'], ['Crème', '#F6EFE6'], ['Lie-de-vin', '#7A3C5E']],
  typo: 'Playfair Display · Jost', head: 'font-family:Play;font-weight:500', body: 'font-family:Jost;font-weight:400', label: 'font-family:Jost;font-weight:500;letter-spacing:.26em;text-transform:uppercase', emStyle: 'italic', radius: 2,
  texts: { m: [{ f: 'Playfair-normal', axes: { wght: 520 }, text: 'S', glyphs: true }, { f: 'Playfair-italic', axes: { wght: 420 }, text: '&', dx: -0.1, glyphs: true }, { f: 'Playfair-normal', axes: { wght: 520 }, text: 'S', dx: -0.1, glyphs: true }],
    h: [{ f: 'Playfair-normal', axes: { wght: 500 }, text: 'Soleil ' }, { f: 'Playfair-italic', axes: { wght: 420 }, text: 'et' }, { f: 'Playfair-normal', axes: { wght: 500 }, text: ' Saveurs' }],
    v: [{ f: 'Playfair-normal', axes: { wght: 500 }, text: 'SOLEIL ET SAVEURS', tracking: 0.16, size: 46 }] },
  themes: themes({ ink: '#4B2342', amp: '#C9A24B', frame: '#4B2342' }, { ink: '#F6EFE6', amp: '#D7B26A', frame: '#D7B26A' }),
  mono(th, T) {
    const k = this.themes[th], L = T.m; const w = L.width, cap = L.capH;
    const cx = w / 2, cy = -cap / 2 - 2;
    const rx = w / 2 + 34, ry = cap / 2 + 40;
    const letters = glyphs(L, 0, 0, i => i === 1 ? k.amp : k.ink);
    const top = cy - ry;
    const mid = `mE${th}`;
    return { svg: `<defs><mask id="${mid}" maskUnits="userSpaceOnUse" x="${f(cx - rx - 10)}" y="${f(top - 20)}" width="${f(2 * rx + 20)}" height="${f(2 * ry + 40)}"><rect x="${f(cx - rx - 10)}" y="${f(top - 20)}" width="${f(2 * rx + 20)}" height="${f(2 * ry + 40)}" fill="#fff"/><circle cx="${f(cx)}" cy="${f(top)}" r="14.5" fill="#000"/></mask></defs>
      <g mask="url(#${mid})"><ellipse cx="${f(cx)}" cy="${f(cy)}" rx="${f(rx)}" ry="${f(ry)}" fill="none" stroke="${k.frame}" stroke-width="3.2"/>
      <ellipse cx="${f(cx)}" cy="${f(cy)}" rx="${f(rx - 8)}" ry="${f(ry - 8)}" fill="none" stroke="${k.frame}" stroke-width="1.1"/></g>
      <circle cx="${f(cx)}" cy="${f(top)}" r="6.2" fill="${k.amp}"/>${rays(f(cx), f(top), 8, 8.6, 11.6, 1.6, k.amp)}${letters}`,
      vb: [cx - rx - 2, top - 13, 2 * rx + 4, 2 * ry + 15] };
  },
  build(th, T) {
    const k = this.themes[th]; const m = this.mono(th, T);
    return { horizontal: horiz(m, T.h, { k: 2.9, gap: 0.6, fill: k.ink }), vertical: vert(m, [T.v], { k: 4.8, gap: 0.9, fill: k.ink }), symbole: m.svg };
  },
};

// ============ F — Sceau : 30 rayons pour 30 ans ============
C.F = {
  id: 'F', nom: 'Le Sceau du primeur', type: 'Emblème · sceau', famille: 'Emblem',
  idee: "Un sceau rond dont le bord est un soleil de 30 rayons, un pour chaque année de marché. Au centre, le soleil se lève sur les sillons. Il se tamponne sur les sacs, les cagettes, les factures.",
  idee2: "Un label de qualité maison, comme un poinçon. Mention « 30 ans de marchés » à valider.", hero: 'crate',
  c: { ink: '#24452F', acc: '#C9822C', accLight: '#EDB54A', paper: '#F3EAD9', dark: '#24452F', bgSoft: '#E6DCC8' },
  pal: [['Vert sapin', '#24452F'], ['Or du sceau', '#E0A030'], ['Parchemin', '#F3EAD9'], ['Rouge cire', '#9E3A2A']],
  typo: 'Marcellus · Gloock', head: 'font-family:Marc;letter-spacing:.04em', body: 'font-family:Jost;font-weight:400', label: 'font-family:Marc;letter-spacing:.24em;text-transform:uppercase', emStyle: 'normal', radius: 2,
  texts: { top: [{ f: 'Marcellus-normal', text: 'SOLEIL ET SAVEURS', size: 15.8, tracking: 0.2, glyphs: true }], bot: [{ f: 'Marcellus-normal', text: '30 ANS DE MARCHÉS', size: 11.8, tracking: 0.24, glyphs: true }],
    h: [{ f: 'Marcellus-normal', text: 'SOLEIL ET SAVEURS', tracking: 0.12 }], hs: [{ f: 'Marcellus-normal', text: 'PRIMEUR · YVELINES', tracking: 0.32, size: 38 }] },
  themes: themes({ line: '#24452F', sun: '#E0A030' }, { line: '#F3EAD9', sun: '#EDB54A' }),
  seal(th, T, withText = true) {
    const k = this.themes[th]; const c = 100;
    const tri = Array.from({ length: 30 }, (_, i) => `<path d="M${c - 4.6} ${c - 88} L${c} ${c - 97} L${c + 4.6} ${c - 88}Z" transform="rotate(${i * 12} ${c} ${c})"/>`).join('');
    const sunRays = Array.from({ length: 9 }, (_, j) => { const i = j + 1; const a = -180 + i * 18; const r = Math.PI * a / 180; return `<line x1="${f(c + 25 * Math.cos(r))}" y1="${f(116 + 25 * Math.sin(r))}" x2="${f(c + (i % 2 ? 31 : 35) * Math.cos(r))}" y2="${f(116 + (i % 2 ? 31 : 35) * Math.sin(r))}" stroke="${k.sun}" stroke-width="2.6" stroke-linecap="round"/>`; }).join('');
    const center = withText
      ? `<path d="M${c - 20} 116 A20 20 0 0 1 ${c + 20} 116 Z" fill="${k.sun}"/>${sunRays}
        <line x1="${c - 40}" y1="117.5" x2="${c + 40}" y2="117.5" stroke="${k.line}" stroke-width="2.4" stroke-linecap="round"/>
        <path d="M${c - 32} 125 Q${c} 120 ${c + 32} 125 M${c - 22} 131.5 Q${c} 127.5 ${c + 22} 131.5" fill="none" stroke="${k.line}" stroke-width="1.8" stroke-linecap="round"/>`
      : `<path d="M${c - 30} 112 A30 30 0 0 1 ${c + 30} 112 Z" fill="${k.sun}"/><line x1="${c - 50}" y1="114" x2="${c + 50}" y2="114" stroke="${k.line}" stroke-width="4" stroke-linecap="round"/>
        <path d="M${c - 38} 126 Q${c} 120 ${c + 38} 126" fill="none" stroke="${k.line}" stroke-width="3.4" stroke-linecap="round"/>`;
    return `<g fill="${k.line}">${tri}</g><circle cx="${c}" cy="${c}" r="85" fill="none" stroke="${k.line}" stroke-width="2.4"/>
      <circle cx="${c}" cy="${c}" r="${withText ? 58 : 70}" fill="none" stroke="${k.line}" stroke-width="1.2"/>
      ${withText ? arcText(T.top, c, c, 64, 0, k.line, 1) + arcText(T.bot, c, c, 77.5, 180, k.line, -1)
        + `<circle cx="${c - 71}" cy="${c}" r="2.2" fill="${k.sun}"/><circle cx="${c + 71}" cy="${c}" r="2.2" fill="${k.sun}"/>` : ''}
      ${center}`;
  },
  build(th, T) {
    const k = this.themes[th];
    const mk = { svg: this.seal(th, T, false), vb: [3, 3, 194, 194] };
    const H = horiz(mk, T.h, { k: 2.6, gap: 0.55, fill: k.line, dy: 0 });
    return { horizontal: H, vertical: this.seal(th, T, true), symbole: this.seal(th, T, false) };
  },
};

// ============ G — Logo-étiquette ============
C.G = {
  id: 'G', nom: "L'Étiquette", type: 'Logo-étiquette', famille: 'Emblem · sticker',
  idee: "Le logo a la forme de la petite étiquette ovale collée sur les fruits. Chaque produit vendu est ainsi « signé » ; sur le site et les sacs, la marque garde la même forme reconnaissable.",
  idee2: "Ludique, gourmand, très produit, à imprimer en rouleaux d'étiquettes.", hero: 'apple',
  c: { ink: '#1F5A3C', acc: '#E0662B', accLight: '#F5C842', paper: '#FFF8EA', dark: '#1F5A3C', bgSoft: '#F1E7D2' },
  pal: [['Jaune citron', '#F5C842'], ['Vert étiquette', '#1F5A3C'], ['Mandarine', '#E0662B'], ['Crème', '#FFF8EA']],
  typo: 'Young Serif · DM Sans', head: 'font-family:Young', body: 'font-family:DMSans;font-weight:400', label: 'font-family:DMSans;font-weight:700;letter-spacing:.18em;text-transform:uppercase', emStyle: 'normal', radius: 30,
  texts: { l1: [{ f: 'YoungSerif-normal', text: 'Soleil et', size: 30 }], l2: [{ f: 'YoungSerif-normal', text: 'Saveurs', size: 30 }], cap: [{ f: 'DMSans-normal', axes: { wght: 700, opsz: 14 }, text: 'FRUITS & LÉGUMES', size: 7.6, tracking: 0.22 }],
    h: [{ f: 'YoungSerif-normal', text: 'Soleil et Saveurs' }] },
  themes: themes({ fill: '#F5C842', ink: '#1F5A3C', sun: '#E0662B', txt: '#1F5A3C' }, { fill: '#F5C842', ink: '#1F5A3C', sun: '#E0662B', txt: '#FFF8EA' }),
  sticker(th, T, full = true) {
    const k = this.themes[th]; const mono = th === 'noir' || th === 'blanc';
    const sun = (x, y, r) => `<circle cx="${x}" cy="${y}" r="${r}" fill="${mono ? k.ink : k.sun}"/>${rays(x, y, 10, r + 2.6, r + 5.6, 1.7, mono ? k.ink : k.sun)}`;
    if (!full) return `<ellipse cx="60" cy="42" rx="56" ry="38" fill="${mono ? 'none' : k.fill}" stroke="${k.ink}" stroke-width="4.4"/><ellipse cx="60" cy="42" rx="48" ry="30" fill="none" stroke="${k.ink}" stroke-width="1.2"/>${sun(60, 42, 10)}`;
    return `<ellipse cx="100" cy="70" rx="94" ry="64" fill="${mono ? 'none' : k.fill}" stroke="${k.ink}" stroke-width="5"/>
      <ellipse cx="100" cy="70" rx="85" ry="55" fill="none" stroke="${k.ink}" stroke-width="1.2"/>
      ${sun(100, 33, 6.4)}${line(T.l1, 100, 69, k.ink, 'middle')}${line(T.l2, 100, 96, k.ink, 'middle')}${line(T.cap, 100, 111.5, k.ink, 'middle')}`;
  },
  build(th, T) {
    const k = this.themes[th]; const mk = { svg: this.sticker(th, T, false), vb: [1, 1, 118, 82] };
    return { horizontal: horiz(mk, T.h, { k: 2.1, gap: 0.5, fill: k.txt }), vertical: this.sticker(th, T, true), symbole: mk.svg };
  },
};

// ============ H — Marque abstraite : l'horizon décalé ============
C.H = {
  id: 'H', nom: "L'Horizon décalé", type: 'Marque abstraite', famille: 'Abstract mark',
  idee: "Un cercle coupé à l'horizon, dont les deux moitiés glissent l'une sur l'autre : en haut le soleil, en bas la terre. Le décalage dit le mouvement, celui de la livraison ; ensemble, les deux moitiés dessinent un S couché.",
  idee2: "Abstrait, contemporain, très « marque digitale ».", hero: 'social',
  c: { ink: '#183D2B', acc: '#F08A3C', accLight: '#F4A532', paper: '#FFF8EE', dark: '#183D2B', bgSoft: '#EFE8DA' },
  pal: [['Mandarine', '#F4A532'], ['Vert basilic', '#2C6E49'], ['Nuit verte', '#183D2B'], ['Crème', '#FFF8EE']],
  typo: 'Outfit SemiBold', head: 'font-family:Outfit;font-weight:600;letter-spacing:-.02em', body: 'font-family:Outfit;font-weight:400', label: 'font-family:Outfit;font-weight:600;letter-spacing:.16em;text-transform:uppercase', emStyle: 'normal', radius: 40,
  texts: { h: [{ f: 'Outfit-normal', axes: { wght: 600 }, text: 'soleil et saveurs', tracking: -0.02 }], v1: [{ f: 'Outfit-normal', axes: { wght: 600 }, text: 'soleil et', tracking: -0.02 }], v2: [{ f: 'Outfit-normal', axes: { wght: 600 }, text: 'saveurs', tracking: -0.02 }] },
  themes: themes({ top: '#F4A532', bot: '#2C6E49', txt: '#183D2B' }, { top: '#F4A532', bot: '#6FB98A', txt: '#FFF8EE' }),
  mk(th) { const k = this.themes[th]; return { svg: `<path d="M28 47.6 A40 40 0 0 1 108 47.6 Z" fill="${k.top}"/><path d="M12 52.4 A40 40 0 0 0 92 52.4 Z" fill="${k.bot}"/>`, vb: [12, 7.6, 96, 84.8] }; },
  build(th, T) { const k = this.themes[th], m = this.mk(th); return { horizontal: horiz(m, T.h, { k: 1.85, gap: 0.62, fill: k.txt, dy: 0.08 }), vertical: vert(m, [T.v1, T.v2], { k: 2.6, gap: 0.55, lead: 0.12, fill: k.txt }), symbole: m.svg }; },
};

// ============ I — Pictogramme : la tomate vue du ciel ============
C.I = {
  id: 'I', nom: 'La Tomate vue du ciel', type: 'Pictogramme', famille: 'Pictorial mark',
  idee: "Vue d'en haut, une tomate porte un soleil vert : son calice. Le pictogramme montre le produit roi de l'étal, sous l'angle que seul le soleil connaît.",
  idee2: "Immédiat, appétissant, très lisible en petit.", hero: 'van',
  c: { ink: '#1F3A2A', acc: '#D9412B', accLight: '#F07A5E', paper: '#FBF4EA', dark: '#1F3A2A', bgSoft: '#EFE5D6' },
  pal: [['Rouge tomate', '#D9412B'], ['Vert calice', '#2E6B34'], ['Vert profond', '#1F3A2A'], ['Crème', '#FBF4EA']],
  typo: 'DM Serif Display · DM Sans', head: 'font-family:DMS', body: 'font-family:DMSans;font-weight:400', label: 'font-family:DMSans;font-weight:600;letter-spacing:.18em;text-transform:uppercase', emStyle: 'italic', radius: 8,
  texts: { h: [{ f: 'DMSerif-normal', text: 'Soleil et Saveurs' }], v1: [{ f: 'DMSerif-normal', text: 'Soleil et' }], v2: [{ f: 'DMSerif-normal', text: 'Saveurs' }] },
  themes: themes({ fruit: '#D9412B', calyx: '#2E6B34', stem: '#1F4A24', txt: '#1F3A2A' }, { fruit: '#E2503A', calyx: '#7DB46C', stem: '#4E8B3A', txt: '#FBF4EA' }),
  mk(th) {
    const k = this.themes[th], mono = th === 'noir' || th === 'blanc';
    const sepal = a => `<path d="M0 -3 C6.4 -9 7.8 -19 1.6 -31 C0.6 -27 -4 -22 -6.2 -13 C-6.8 -9 -4 -5 0 -3Z" transform="translate(50 52) rotate(${a})"/>`;
    const cal = [8, 68, 128, 188, 248, 308].map(sepal).join('');
    if (mono) return { svg: knock([0, 0, 100, 100], `<circle cx="50" cy="52" r="45"/>`, `<g stroke-width="2.4" stroke-linejoin="round">${cal}</g><circle cx="50" cy="52" r="8.6"/>`, k.fruit) + `<circle cx="50" cy="52" r="4.2" fill="${k.fruit}"/>`, vb: [5, 7, 90, 90] };
    return { svg: `<circle cx="50" cy="52" r="45" fill="${k.fruit}"/><path d="M24 30 C30 22 40 17.5 50 17" stroke="#fff" stroke-opacity=".28" stroke-width="3.4" fill="none" stroke-linecap="round"/><g fill="${k.calyx}">${cal}</g><circle cx="50" cy="52" r="6" fill="${k.calyx}"/><circle cx="50" cy="52" r="3" fill="${k.stem}"/>`, vb: [5, 7, 90, 90] };
  },
  build(th, T) { const k = this.themes[th], m = this.mk(th); return { horizontal: horiz(m, T.h, { k: 2.2, gap: 0.5, fill: k.txt }), vertical: vert(m, [T.v1, T.v2], { k: 2.9, gap: 0.45, lead: 0.16, fill: k.txt }), symbole: m.svg }; },
};

// ============ J — Espace négatif : la feuille signée ============
C.J = {
  id: 'J', nom: 'La Feuille signée', type: 'Espace négatif', famille: 'Negative space',
  idee: "Une feuille dont la nervure, laissée en réserve, dessine un S : Soleil, Saveurs. Au bout de la feuille, une goutte de soleil. Le monogramme se cache dans la nature.",
  idee2: "Se découvre au second regard : on ne l'oublie plus.", hero: 'social',
  c: { ink: '#173D28', acc: '#3E8E50', accLight: '#F2B33D', paper: '#F8F5EC', dark: '#173D28', bgSoft: '#E8E6D8' },
  pal: [['Vert feuille', '#3E8E50'], ['Vert sous-bois', '#173D28'], ['Or', '#F2B33D'], ['Blanc lin', '#F8F5EC']],
  typo: 'Manrope Bold', head: 'font-family:Man;font-weight:700;letter-spacing:-.02em', body: 'font-family:Man;font-weight:400', label: 'font-family:Man;font-weight:700;letter-spacing:.16em;text-transform:uppercase', emStyle: 'normal', radius: 14,
  texts: { h: [{ f: 'Manrope-normal', axes: { wght: 700 }, text: 'Soleil et Saveurs', tracking: -0.02 }], v1: [{ f: 'Manrope-normal', axes: { wght: 700 }, text: 'Soleil et', tracking: -0.02 }], v2: [{ f: 'Manrope-normal', axes: { wght: 700 }, text: 'Saveurs', tracking: -0.02 }] },
  themes: themes({ leaf: '#3E8E50', sun: '#F2B33D', txt: '#173D28' }, { leaf: '#5FB06F', sun: '#F2B33D', txt: '#F8F5EC' }),
  mk(th) {
    const k = this.themes[th];
    const leaf = `<path d="M50 6 C79 28 80 70 50 98 C20 70 21 28 50 6Z"/>`;
    const S = `<path d="M58.5 22 C40.5 27 37.5 41 49.5 50 C61.5 59 60 74 41.5 82" fill="none" stroke-width="7.2" stroke-linecap="round"/>`;
    return { svg: `<g transform="rotate(22 50 52)">${knock([0, 0, 100, 104], leaf, S, k.leaf)}</g><circle cx="80" cy="14" r="8.5" fill="${k.sun}"/>`, vb: [16, 4, 74, 96] };
  },
  build(th, T) { const k = this.themes[th], m = this.mk(th); return { horizontal: horiz(m, T.h, { k: 2.35, gap: 0.42, fill: k.txt }), vertical: vert(m, [T.v1, T.v2], { k: 3.1, gap: 0.45, lead: 0.14, fill: k.txt }), symbole: m.svg }; },
};

// ============ K — Personnage : le soleil gourmand ============
C.K = {
  id: 'K', nom: 'Le Soleil gourmand', type: 'Personnage', famille: 'Mascot',
  idee: "Un fruit-soleil qui ferme les yeux et savoure : c'est la seule piste qui montre la « saveur », le plaisir de goûter. Un personnage minimal, trois traits, décliné en expressions pour les réseaux.",
  idee2: "Proche, souriant, mémorable ; à doser pour rester haut de gamme.", hero: 'social',
  c: { ink: '#3B2416', acc: '#F28C28', accLight: '#F6B26B', paper: '#FFF6E9', dark: '#3B2416', bgSoft: '#F3E6D2' },
  pal: [['Orange soleil', '#F28C28'], ['Chocolat', '#3B2416'], ['Vert feuille', '#4E8B3A'], ['Crème', '#FFF6E9']],
  typo: 'Hepta Slab Bold · Jost', head: 'font-family:Hepta;font-weight:700', body: 'font-family:Jost;font-weight:400', label: 'font-family:Jost;font-weight:600;letter-spacing:.2em;text-transform:uppercase', emStyle: 'normal', radius: 30,
  texts: { h: [{ f: 'HeptaSlab-normal', axes: { wght: 700 }, text: 'Soleil et Saveurs' }], v1: [{ f: 'HeptaSlab-normal', axes: { wght: 700 }, text: 'Soleil et' }], v2: [{ f: 'HeptaSlab-normal', axes: { wght: 700 }, text: 'Saveurs' }] },
  themes: themes({ body: '#F28C28', face: '#3B2416', cheek: '#F8B46E', leaf: '#4E8B3A', txt: '#3B2416' }, { body: '#F28C28', face: '#3B2416', cheek: '#F8B46E', leaf: '#7DBA5E', txt: '#FFF6E9' }),
  face(expr) {
    const eyes = expr === 'clin' ? `<path d="M32.5 54 Q38.5 60 44.5 54"/><circle cx="61.5" cy="55" r="3.6" stroke="none" class="dot"/>` : expr === 'ravi' ? `<path d="M32.5 57 Q38.5 50 44.5 57"/><path d="M55.5 57 Q61.5 50 67.5 57"/>` : `<path d="M32.5 54 Q38.5 60 44.5 54"/><path d="M55.5 54 Q61.5 60 67.5 54"/>`;
    const mouth = expr === 'ravi' ? `<path d="M41 67 Q50 67 59 67 Q57 79 50 79 Q43 79 41 67Z" class="fillm"/>` : `<path d="M40.5 67.5 Q50 76.5 59.5 67.5"/>`;
    return eyes + mouth;
  },
  mk(th, expr = 'savoure') {
    const k = this.themes[th], mono = th === 'noir' || th === 'blanc';
    const leaf = `<path d="M51 17.5 C53 8.6 61.4 3.4 71 4.4 C68.6 12.6 60.4 17.6 51 17.5Z" fill="${k.leaf}"/><path d="M50 18 L48.6 11" stroke="${mono ? k.leaf : '#5A3A1E'}" stroke-width="2.6" stroke-linecap="round"/>`;
    const fc = this.face(expr);
    if (mono) return { svg: knock([0, 0, 100, 100], `<circle cx="50" cy="57" r="40"/>`, `<g fill="none" stroke-width="3.8" stroke-linecap="round">${fc.replace('class="dot"', 'fill="#000"').replace('class="fillm"', 'fill="#000"')}</g>`, k.body) + leaf, vb: [10, 3.4, 80, 93.6] };
    return { svg: `<circle cx="50" cy="57" r="40" fill="${k.body}"/><circle cx="29" cy="65" r="5" fill="${k.cheek}"/><circle cx="71" cy="65" r="5" fill="${k.cheek}"/>
      <g fill="none" stroke="${k.face}" stroke-width="3.8" stroke-linecap="round">${fc.replace('class="dot"', `fill="${k.face}"`).replace('class="fillm"', `fill="${k.face}"`)}</g>${leaf}`, vb: [10, 3.4, 80, 93.6] };
  },
  build(th, T) { const k = this.themes[th], m = this.mk(th); return { horizontal: horiz(m, T.h, { k: 2.4, gap: 0.45, fill: k.txt }), vertical: vert(m, [T.v1, T.v2], { k: 3.1, gap: 0.42, lead: 0.16, fill: k.txt }), symbole: m.svg }; },
};

// ============ L — Signature manuscrite ============
C.L = {
  id: 'L', nom: 'La Signature', type: 'Signature manuscrite', famille: 'Script',
  idee: "Le primeur signe sa sélection. Le nom est écrit à la plume, souligné d'un trait qui finit en feuille ; l'initiale seule devient un cachet. C'est l'engagement personnel, celui qu'on prend devant son client au marché.",
  idee2: "Élégant, humain ; lisibilité à surveiller en petit.", hero: 'cards',
  c: { ink: '#13372B', acc: '#B5532A', accLight: '#E39A62', paper: '#F7F1E5', dark: '#13372B', bgSoft: '#EAE1D0' },
  pal: [['Encre verte', '#13372B'], ['Terre de Sienne', '#B5532A'], ['Papier', '#F7F1E5'], ['Sauge', '#8AA585']],
  typo: 'Corinthia Bold · Jost', head: 'font-family:Cor', body: 'font-family:Jost;font-weight:400', label: 'font-family:Jost;font-weight:500;letter-spacing:.28em;text-transform:uppercase', emStyle: 'normal', radius: 2,
  texts: { h: [{ f: 'Corinthia-normal-700', text: 'Soleil & Saveurs', size: 150 }], cap: [{ f: 'Jost-normal', axes: { wght: 500 }, text: 'PRIMEUR · LIVRAISON À DOMICILE', size: 30, tracking: 0.3 }], S: [{ f: 'Corinthia-normal-700', text: 'S', size: 120 }] },
  themes: themes({ ink: '#13372B', acc: '#B5532A', leaf: '#5E8A55', paper: '#F7F1E5' }, { ink: '#F7F1E5', acc: '#E39A62', leaf: '#9CC08E', paper: '#13372B' }),
  sig(th, T) {
    const k = this.themes[th], L = T.h; const x0 = L.bbox[0], x1 = L.bbox[2], yb = L.bbox[3];
    const ux = -x0; const yU = yb + 10;
    const sw = `<path d="M${f(x0 + ux + 30)} ${f(yU + 6)} C${f((x0 + x1) / 2 + ux - 120)} ${f(yU - 8)} ${f(x1 + ux - 160)} ${f(yU + 2)} ${f(x1 + ux - 30)} ${f(yU - 14)}" fill="none" stroke="${k.acc}" stroke-width="3.4" stroke-linecap="round"/>`;
    return line(L, 0, 0, k.ink) + sw + leafP(x1 + ux - 31, yU - 13.6, 1.25, k.leaf, -24);
  },
  build(th, T) {
    const k = this.themes[th], mono = th === 'noir' || th === 'blanc';
    const s = T.S; const sw = inkW(s);
    const stamp = `<circle cx="60" cy="60" r="56" fill="${mono ? 'none' : k.acc}" stroke="${mono ? k.ink : 'none'}" stroke-width="3"/><circle cx="60" cy="60" r="49" fill="none" stroke="${mono ? k.ink : k.paper}" stroke-opacity="${mono ? 1 : .55}" stroke-width="1.1"/>${line(s, 60, 60 + s.capH * 0.42, mono ? k.ink : k.paper, 'middle')}${leafP(74, 28, 0.9, mono ? k.ink : k.paper, -10)}`;
    const sigW = inkW(T.h);
    const st = 2.3, sh = 120 * st; const V = `<g transform="translate(${f(-60 * st)} 0) scale(${st})">${stamp}</g><g transform="translate(${f(-sigW / 2)} ${f(sh + T.h.capH + 60)})">${this.sig(th, T)}</g>${line(T.cap, 0, f(sh + T.h.capH + 60 + T.h.bbox[3] + 80), k.ink, 'middle')}`;
    return { horizontal: this.sig(th, T), vertical: V, symbole: stamp };
  },
};

// ============ M — Système modulaire géométrique ============
C.M = {
  id: 'M', nom: 'Le Jardin modulaire', type: 'Système géométrique modulaire', famille: 'Geometric · modular',
  idee: "Quatre tuiles, quatre formes simples : le soleil qui se lève, la feuille, le fruit, la tranche. Ensemble, elles forment le logo ; séparées, elles deviennent des pictogrammes, des motifs, des animations. Une identité qui se recombine à l'infini, comme un étal qu'on réarrange chaque matin.",
  idee2: "Joyeux, graphique, très flexible (inspiration Bauhaus).", hero: 'van',
  c: { ink: '#1E1E1E', acc: '#E04B2D', accLight: '#F7B731', paper: '#F6EEDD', dark: '#1E1E1E', bgSoft: '#ECE3D0' },
  pal: [['Rouge tomate', '#E04B2D'], ['Jaune soleil', '#F7B731'], ['Vert feuille', '#2D8A57'], ['Crème', '#F6EEDD'], ['Encre', '#1E1E1E']],
  typo: 'Syne ExtraBold', head: 'font-family:Syne;font-weight:800', body: 'font-family:Jost;font-weight:400', label: 'font-family:Syne;font-weight:700;letter-spacing:.14em;text-transform:uppercase', emStyle: 'normal', radius: 0,
  texts: { h: [{ f: 'Syne-normal', axes: { wght: 800 }, text: 'SOLEIL ET SAVEURS' }], v1: [{ f: 'Syne-normal', axes: { wght: 800 }, text: 'SOLEIL ET' }], v2: [{ f: 'Syne-normal', axes: { wght: 800 }, text: 'SAVEURS' }] },
  themes: themes({ r: '#E04B2D', y: '#F7B731', g: '#2D8A57', c: '#F6EEDD', txt: '#1E1E1E' }, { r: '#E04B2D', y: '#F7B731', g: '#2D8A57', c: '#F6EEDD', txt: '#F6EEDD' }),
  tile(name, x, y, k, mono) {
    const s = 48; const id = `t${name}${x}${y}${Math.round(Math.random() * 1e6)}`;
    const clip = inner => `<defs><clipPath id="${id}"><rect x="${x}" y="${y}" width="${s}" height="${s}"/></clipPath></defs><g clip-path="url(#${id})">${inner}</g>`;
    const T = {
      soleil: [k.g, `<circle cx="${x + 24}" cy="${y + 48}" r="19"/>`, k.y],
      feuille: [k.c, `<path d="M${x + 6} ${y + 42} A38 38 0 0 1 ${x + 42} ${y + 6} A38 38 0 0 1 ${x + 6} ${y + 42}Z"/>`, k.g],
      fruit: [k.c, `<circle cx="${x + 24}" cy="${y + 27}" r="16"/>`, k.r, `<path d="M${x + 25} ${y + 11.5} A13 13 0 0 1 ${x + 38} ${y + 3.5} A13 13 0 0 1 ${x + 25} ${y + 11.5}Z" fill="${k.g}"/>`],
      tranche: [k.y, `<path d="M${x} ${y + 48} V${y + 8} A40 40 0 0 1 ${x + 40} ${y + 48}Z"/>`, k.r],
    }[name];
    if (mono) return clip(knock([x, y, s, s], `<rect x="${x}" y="${y}" width="${s}" height="${s}"/>`, T[1], k.txt)) + (T[3] && name === 'fruit' ? '' : '');
    return clip(`<rect x="${x}" y="${y}" width="${s}" height="${s}" fill="${T[0]}"/><g fill="${T[2]}">${T[1]}</g>${T[3] || ''}`);
  },
  mk(th, order = ['soleil', 'feuille', 'fruit', 'tranche']) {
    const k = this.themes[th], mono = th === 'noir' || th === 'blanc';
    const pos = [[0, 0], [52, 0], [0, 52], [52, 52]];
    return { svg: order.map((n, i) => this.tile(n, pos[i][0], pos[i][1], k, mono)).join(''), vb: [0, 0, 100, 100] };
  },
  build(th, T) { const k = this.themes[th], m = this.mk(th); return { horizontal: horiz(m, T.h, { k: 3.4, gap: 0.6, fill: k.txt }), vertical: vert(m, [T.v1, T.v2], { k: 4.6, gap: 0.55, lead: 0.22, fill: k.txt }), symbole: m.svg }; },
};

// ============ N — Logo dynamique : le fruit de saison ============
C.N = {
  id: 'N', nom: 'Le Fruit de saison', type: 'Logo dynamique', famille: 'Dynamic identity',
  idee: "Le cadre reste, le fruit change : radis au printemps, abricot en été, potiron en automne, clémentine en hiver. Le logo suit les saisons, comme votre étal et vos producteurs. Le nom, lui, ne bouge pas.",
  idee2: "Vivant, renouvelable : chaque saison relance la communication.", hero: 'seasons',
  c: { ink: '#1F2B24', acc: '#E8902F', accLight: '#F3A93B', paper: '#FAF6EE', dark: '#1F2B24', bgSoft: '#ECE6DA' },
  pal: [['Printemps · radis', '#D93A63'], ['Été · abricot', '#F3A93B'], ['Automne · potiron', '#D9682B'], ['Hiver · clémentine', '#F08A24'], ['Encre', '#1F2B24']],
  typo: 'Instrument Serif · Jost', head: 'font-family:InstS', body: 'font-family:Jost;font-weight:400', label: 'font-family:Jost;font-weight:500;letter-spacing:.24em;text-transform:uppercase', emStyle: 'italic', radius: 40,
  texts: { h: [{ f: 'InstrumentSerif-normal', text: 'Soleil ' }, { f: 'InstrumentSerif-italic', text: 'et' }, { f: 'InstrumentSerif-normal', text: ' Saveurs' }], v1: [{ f: 'InstrumentSerif-normal', text: 'Soleil ' }, { f: 'InstrumentSerif-italic', text: 'et' }], v2: [{ f: 'InstrumentSerif-normal', text: 'Saveurs' }] },
  themes: themes({ ring: '#1F2B24', txt: '#1F2B24', mono: false }, { ring: '#FAF6EE', txt: '#FAF6EE', mono: false }),
  picto(season, mono, col) {
    const g = mono ? col : null;
    if (season === 'printemps') return `<path d="M50 44 C39 37 35.6 25 40 15 C47.4 21 50.6 32 50 44Z" fill="${g || '#4C9A4A'}"/><path d="M50 44 C61 37 64.4 25 60 15 C52.6 21 49.4 32 50 44Z" fill="${g || '#3E8440'}"/><circle cx="50" cy="61" r="19" fill="${g || '#D93A63'}"/><path d="M50 79 L50 90" stroke="${g || '#D93A63'}" stroke-width="2.6" stroke-linecap="round"/><path d="M40 55 Q44 48 51 47" stroke="#fff" stroke-opacity="${mono ? 0 : .35}" stroke-width="2.6" fill="none" stroke-linecap="round"/>`;
    if (season === 'automne') return (mono ? knock([20, 30, 60, 52], `<ellipse cx="37" cy="62" rx="15" ry="18.5"/><ellipse cx="63" cy="62" rx="15" ry="18.5"/><ellipse cx="50" cy="62" rx="15.5" ry="20"/>`, `<path d="M43.5 47 Q41 62 43.5 78 M56.5 47 Q59 62 56.5 78" fill="none" stroke-width="2.2"/>`, col)
      : `<ellipse cx="37" cy="62" rx="15" ry="18.5" fill="#C9592A"/><ellipse cx="63" cy="62" rx="15" ry="18.5" fill="#C9592A"/><ellipse cx="50" cy="62" rx="15.5" ry="20" fill="#E07432"/>`) + `<path d="M50 43 C50 37 52 34 56 32" stroke="${g || '#5C7A3A'}" stroke-width="3.4" fill="none" stroke-linecap="round"/>`;
    if (season === 'hiver') return `<circle cx="50" cy="61" r="23" fill="${g || '#F08A24'}"/><path d="M50 38.5 C46 30 38 27 30 29 C33 37 41 40.5 50 38.5Z" fill="${g || '#3E7C4A'}"/><path d="M50 38.5 C55 31 63 29 70 32 C66 39 58 41 50 38.5Z" fill="${g || '#2F6B3A'}"/>${mono ? '' : '<circle cx="42" cy="54" r="4" fill="#fff" opacity=".3"/>'}`;
    // été : abricot
    return (mono ? knock([20, 26, 60, 62], `<circle cx="50" cy="61" r="24"/>`, `<path d="M50 38 C43.5 49 43.5 70 50 84" fill="none" stroke-width="2.4"/>`, col)
      : `<circle cx="50" cy="61" r="24" fill="#F3A93B"/><path d="M50 38 C43.5 49 43.5 70 50 84" fill="none" stroke="#D9822A" stroke-width="2.4"/><circle cx="58" cy="52" r="7" fill="#fff" opacity=".22"/>`) + `<path d="M51 37.5 C53.6 29 61 24.6 69.4 25.6 C67 33.6 59.6 38 51 37.5Z" fill="${g || '#4C8A3E'}"/>`;
  },
  mk(th, season = 'ete') {
    const k = this.themes[th], mono = th === 'noir' || th === 'blanc';
    const ringCol = mono ? k.ring : { printemps: '#D93A63', ete: '#E8902F', automne: '#C8642B', hiver: '#3E7C4A' }[season];
    return { svg: `<circle cx="50" cy="56" r="42" fill="none" stroke="${ringCol}" stroke-width="3.6"/>${this.picto(season, mono, k.ring)}`, vb: [6.2, 12.2, 87.6, 87.6] };
  },
  build(th, T) { const k = this.themes[th], m = this.mk(th); return { horizontal: horiz(m, T.h, { k: 2.4, gap: 0.42, fill: k.txt }), vertical: vert(m, [T.v1, T.v2], { k: 3.1, gap: 0.4, lead: 0.12, fill: k.txt }), symbole: m.svg }; },
  extra(th) { return ['printemps', 'ete', 'automne', 'hiver'].map(s => ({ key: `symbole-${s}`, inner: this.mk(th, s).svg })); },
};

// ============ O — Trait continu (monoline) ============
C.O = {
  id: 'O', nom: "D'un seul trait", type: 'Dessin au trait (monoline)', famille: 'Line art',
  idee: "Un trait fin et régulier dessine le contour du fruit, sa queue et sa feuille ; au cœur du fruit, un soleil tracé du même fil. La précision d'un geste sûr, la légèreté d'une épicerie fine.",
  idee2: "Raffiné, aérien ; parfait en gravure, dorure, broderie.", hero: 'apple',
  c: { ink: '#2C4A3B', acc: '#C8913A', accLight: '#E2A13A', paper: '#F7F3EA', dark: '#2C4A3B', bgSoft: '#EAE5D9' },
  pal: [['Vert mousse', '#2C4A3B'], ['Or mat', '#E2A13A'], ['Papier', '#F7F3EA'], ['Brume', '#B9C4B5']],
  typo: 'Josefin Sans Light', head: 'font-family:Jos;font-weight:300;letter-spacing:.08em', body: 'font-family:Jos;font-weight:400', label: 'font-family:Jos;font-weight:400;letter-spacing:.3em;text-transform:uppercase', emStyle: 'normal', radius: 2,
  texts: { h: [{ f: 'JosefinSans-normal', axes: { wght: 340 }, text: 'SOLEIL ET SAVEURS', tracking: 0.26 }], v1: [{ f: 'JosefinSans-normal', axes: { wght: 340 }, text: 'SOLEIL', tracking: 0.3 }], v2: [{ f: 'JosefinSans-normal', axes: { wght: 340 }, text: 'ET SAVEURS', tracking: 0.3, size: 72 }] },
  themes: themes({ line: '#2C4A3B', sun: '#E2A13A' }, { line: '#F7F3EA', sun: '#E2A13A' }),
  mk(th) {
    const k = this.themes[th];
    const apple = `M50 31 C40 23 22 22.5 15.5 38.5 C9 55.5 15.5 77 29.5 88 C37.5 94 45.5 94.5 50 90.5 C54.5 94.5 62.5 94 70.5 88 C84.5 77 91 55.5 84.5 38.5 C78 22.5 60 23 50 31`;
    return { svg: `<g fill="none" stroke="${k.line}" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"><path d="${apple}"/><path d="M50 31 C50 23 51.6 17 55.6 11.5"/><path d="M53.8 17.6 C59.6 9.2 69 6.6 77.6 9.6 C73.6 17.8 63.8 20.6 53.8 17.6Z"/><path d="M56 15.8 C62.6 12.8 68.6 11.2 74.6 10.8"/></g>
      <g fill="none" stroke="${k.sun}" stroke-width="2.6" stroke-linecap="round"><circle cx="50" cy="61" r="9.5"/>${rays(50, 61, 8, 14.5, 19.5, 2.6, k.sun).replace(/<line /g, '<line ')}</g>`, vb: [13, 6.5, 74, 89.5] };
  },
  build(th, T) { const k = this.themes[th], m = this.mk(th); return { horizontal: horiz(m, T.h, { k: 2.9, gap: 0.8, fill: k.line }), vertical: vert(m, [T.v1, T.v2], { k: 3.7, gap: 0.7, lead: 0.42, fill: k.line }), symbole: m.svg }; },
};

// ============ P — Pochoir de cagette ============
C.P = {
  id: 'P', nom: 'Le Pochoir de cagette', type: 'Logotype pochoir · bloc', famille: 'Stencil wordmark',
  idee: "Les lettres au pochoir qu'on peint sur les cagettes et les caisses de marché, rassemblées en un bloc justifié comme un tampon. C'est la mémoire de 30 ans de marchés, traitée avec la rigueur d'une marque d'aujourd'hui.",
  idee2: "Brut, authentique, urbain ; superbe sur le bois et le kraft.", hero: 'crate',
  c: { ink: '#1B1B1B', acc: '#E8602C', accLight: '#F0884F', paper: '#EFE4D2', dark: '#1B1B1B', bgSoft: '#E3D7C3' },
  pal: [['Noir pochoir', '#1B1B1B'], ['Orange cagette', '#E8602C'], ['Kraft', '#C9A57A'], ['Bois clair', '#EFE4D2']],
  typo: 'Big Shoulders Stencil', head: 'font-family:Big;font-weight:800;letter-spacing:.01em', body: 'font-family:Jost;font-weight:400', label: 'font-family:Big;font-weight:700;letter-spacing:.16em;text-transform:uppercase', emStyle: 'normal', radius: 0,
  texts: { s: [{ f: 'BigShouldersStencil-normal', axes: { wght: 800 }, text: 'SOLEIL', tracking: 0.02 }], v: [{ f: 'BigShouldersStencil-normal', axes: { wght: 800 }, text: 'SAVEURS', tracking: 0.02 }], et: [{ f: 'BigShouldersStencil-normal', axes: { wght: 800 }, text: 'ET', size: 40, tracking: 0.1 }],
    cap: [{ f: 'BigShouldersStencil-normal', axes: { wght: 700 }, text: 'PRIMEUR · YVELINES (78)', size: 26, tracking: 0.22 }],
    h1: [{ f: 'BigShouldersStencil-normal', axes: { wght: 800 }, text: 'SOLEIL', tracking: 0.02 }], h2: [{ f: 'BigShouldersStencil-normal', axes: { wght: 800 }, text: '&' }], h3: [{ f: 'BigShouldersStencil-normal', axes: { wght: 800 }, text: 'SAVEURS', tracking: 0.02 }],
    sym: [{ f: 'BigShouldersStencil-normal', axes: { wght: 800 }, text: 'S&S', tracking: 0.02 }] },
  themes: themes({ ink: '#1B1B1B', acc: '#E8602C' }, { ink: '#EFE4D2', acc: '#F0884F' }),
  build(th, T) {
    const k = this.themes[th];
    const W = inkW(T.v); const s1 = W / inkW(T.s);
    let y = 0; let V = line(T.s, -W / 2, 0, k.ink, 'start', s1);
    const capS = T.s.capH * s1; y = 0;
    const etY = 0 + 30 + T.et.capH; const etW = inkW(T.et);
    V += `<rect x="${f(-W / 2)}" y="${f(etY - T.et.capH / 2 - 2.5)}" width="${f(W / 2 - etW / 2 - 14)}" height="5" fill="${k.acc}"/><rect x="${f(etW / 2 + 14)}" y="${f(etY - T.et.capH / 2 - 2.5)}" width="${f(W / 2 - etW / 2 - 14)}" height="5" fill="${k.acc}"/>` + line(T.et, 0, etY, k.acc, 'middle');
    const y3 = etY + 30 + T.v.capH; V += line(T.v, -W / 2, y3, k.ink);
    const pad = 34; const top = -capS - pad, bot = y3 + pad + 44;
    V += line(T.cap, 0, y3 + pad + 22, k.ink, 'middle');
    V += `<rect x="${f(-W / 2 - pad)}" y="${f(top)}" width="${f(W + 2 * pad)}" height="${f(bot - top)}" fill="none" stroke="${k.ink}" stroke-width="7"/><line x1="${f(-W / 2 - pad)}" y1="${f(y3 + pad - 6)}" x2="${f(W / 2 + pad)}" y2="${f(y3 + pad - 6)}" stroke="${k.ink}" stroke-width="3"/>`;
    const g1 = inkW(T.h1), g2 = inkW(T.h2); const gap = 22;
    const H = line(T.h1, 0, 0, k.ink) + line(T.h2, g1 + gap, 0, k.acc) + line(T.h3, g1 + gap + g2 + gap, 0, k.ink);
    const sw = inkW(T.sym); const cap = T.sym.capH;
    const SYM = `<rect x="0" y="0" width="${f(sw + 56)}" height="${f(sw + 56)}" fill="none" stroke="${k.ink}" stroke-width="8"/>${line(T.sym, (sw + 56) / 2, (sw + 56) / 2 + cap / 2, k.ink, 'middle')}`;
    return { horizontal: H, vertical: V, symbole: SYM };
  },
};

// ============ Q — Art déco : le soleil des Halles ============
C.Q = {
  id: 'Q', nom: 'Le Soleil des Halles', type: 'Art déco', famille: 'Heritage · Art déco',
  idee: "Un soleil levant aux rayons géométriques, posé sur les lignes de l'horizon, avec la typographie des affiches des années 1930 : l'époque des Halles de Paris, le « ventre de Paris ». Un hommage au grand métier des marchés, en version haut de gamme.",
  idee2: "Patrimonial, chic, très français.", hero: 'cards',
  c: { ink: '#1E4D45', acc: '#B98A3A', accLight: '#D4A64A', paper: '#F3E9D2', dark: '#1E4D45', bgSoft: '#E6DCC4' },
  pal: [['Vert des Halles', '#1E4D45'], ['Or déco', '#D4A64A'], ['Ivoire', '#F3E9D2'], ['Noir laqué', '#14201D']],
  typo: 'Limelight · Jost', head: 'font-family:Lime;letter-spacing:.04em', body: 'font-family:Jost;font-weight:400', label: 'font-family:Jost;font-weight:500;letter-spacing:.3em;text-transform:uppercase', emStyle: 'normal', radius: 0,
  texts: { h: [{ f: 'Limelight-normal', text: 'SOLEIL ET SAVEURS', tracking: 0.07 }], v1: [{ f: 'Limelight-normal', text: 'SOLEIL ET', tracking: 0.08 }], v2: [{ f: 'Limelight-normal', text: 'SAVEURS', tracking: 0.08 }] },
  themes: themes({ sun: '#D4A64A', ray: '#1E4D45', line: '#1E4D45', txt: '#1E4D45' }, { sun: '#D4A64A', ray: '#D4A64A', line: '#D4A64A', txt: '#F3E9D2' }),
  mk(th) {
    const k = this.themes[th]; const cx = 100, cy = 92;
    let r = '';
    for (let i = 0; i <= 14; i++) { const a = 180 + i * (180 / 14); if (i === 0 || i === 14) continue; const long = i % 2 === 0; const R1 = long ? 86 : 70, half = long ? 3.6 : 3;
      const p = (rr, aa) => [cx + rr * Math.cos(aa * Math.PI / 180), cy + rr * Math.sin(aa * Math.PI / 180)];
      const [x1, y1] = p(40, a - half), [x2, y2] = p(R1, a), [x3, y3] = p(40, a + half);
      r += `<path d="M${f(x1)} ${f(y1)} L${f(x2)} ${f(y2)} L${f(x3)} ${f(y3)}Z"/>`; }
    return { svg: `<g fill="${k.ray}">${r}</g><path d="M${cx - 33} ${cy} A33 33 0 0 1 ${cx + 33} ${cy}Z" fill="${k.sun}"/>
      <rect x="6" y="${cy + 2}" width="188" height="4.4" fill="${k.line}"/><rect x="34" y="${cy + 10}" width="132" height="2.6" fill="${k.line}"/><rect x="62" y="${cy + 16}" width="76" height="2" fill="${k.line}"/>`, vb: [6, 4, 188, 106] };
  },
  build(th, T) { const k = this.themes[th], m = this.mk(th); return { horizontal: horiz(m, T.h, { k: 2.5, gap: 0.5, fill: k.txt, dy: 0.08 }), vertical: vert(m, [T.v1, T.v2], { k: 3.6, gap: 0.55, lead: 0.3, fill: k.txt }), symbole: m.svg }; },
};

// ============ R — Génératif : le soleil d'or ============
C.R = {
  id: 'R', nom: "Le Soleil d'or", type: 'Logo génératif', famille: 'Generative',
  idee: "En français, « un soleil » est aussi le tournesol. Ses graines suivent l'angle d'or (137,5°), la spirale la plus économe de la nature. Le symbole est calculé graine par graine, du vert au doré, du germe au soleil ; un programme peut générer une variante pour chaque saison ou chaque événement.",
  idee2: "Rigoureux, fascinant, unique : la nature mise en équation.", hero: 'social',
  c: { ink: '#123A2A', acc: '#E89A2E', accLight: '#F2B33D', paper: '#F8F4EA', dark: '#123A2A', bgSoft: '#E9E4D6' },
  pal: [['Germe', '#1F5A3F'], ['Pousse', '#5E9440'], ['Blé', '#C9B54A'], ['Or', '#F2B33D'], ['Nuit verte', '#123A2A']],
  typo: 'Sora Medium', head: 'font-family:Sora;font-weight:500;letter-spacing:-.02em', body: 'font-family:Sora;font-weight:300', label: 'font-family:Sora;font-weight:500;letter-spacing:.16em;text-transform:uppercase', emStyle: 'normal', radius: 50,
  texts: { h: [{ f: 'Sora-normal', axes: { wght: 500 }, text: 'Soleil et Saveurs', tracking: -0.02 }], v1: [{ f: 'Sora-normal', axes: { wght: 500 }, text: 'Soleil et', tracking: -0.02 }], v2: [{ f: 'Sora-normal', axes: { wght: 500 }, text: 'Saveurs', tracking: -0.02 }] },
  themes: themes({ ramp: true, txt: '#123A2A' }, { ramp: true, txt: '#F8F4EA' }),
  dots(n = 130, ramp = ['#1F5A3F', '#3E7A45', '#6C9A42', '#A9B04A', '#E2B13C', '#F2A033'], col = null, angle = 137.508, sz = 1) {
    let s = '';
    for (let i = 1; i <= n; i++) { const t = Math.sqrt(i / n); const r = 45 * t, a = i * angle * Math.PI / 180; const rad = (0.95 + 3.3 * t) * sz * Math.sqrt(130 / n);
      s += `<circle cx="${f(50 + r * Math.cos(a))}" cy="${f(50 + r * Math.sin(a))}" r="${f(rad)}" fill="${col || ramp[Math.min(ramp.length - 1, Math.floor(t * ramp.length))]}"/>`; }
    return s;
  },
  mk(th, n = 130) { const k = this.themes[th], mono = th === 'noir' || th === 'blanc'; return { svg: this.dots(n, undefined, mono ? k.txt : null), vb: [0, 0, 100, 100] }; },
  build(th, T) { const k = this.themes[th], m = this.mk(th); return { horizontal: horiz(m, T.h, { k: 2.35, gap: 0.5, fill: k.txt }), vertical: vert(m, [T.v1, T.v2], { k: 3.1, gap: 0.45, lead: 0.14, fill: k.txt }), symbole: this.mk(th, 46).svg }; },
};

module.exports = C;
