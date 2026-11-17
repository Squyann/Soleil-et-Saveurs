"""Vectorise des lignes de texte (crénage HarfBuzz) en tracés SVG.

Entrée (stdin, JSON) : liste de lignes ; chaque ligne = liste de « runs » :
  {"font": "chemin.woff2", "axes": {"wght": 600}, "size": 100, "text": "SOLEIL ",
   "tracking": 0.13, "kern": {"2": -0.02}, "dx": 0}
  tracking et kern sont en em ; kern = ajustement après le glyphe d'indice donné.
Sortie (stdout, JSON) : pour chaque ligne {d, width, capH, xH, asc, desc}
  (origine sur la ligne de base, y vers le bas, unités = px à la taille donnée).
"""
import io, json, sys
import uharfbuzz as hb
from fontTools.ttLib import TTFont
from fontTools.varLib import instancer
from fontTools.pens.svgPathPen import SVGPathPen
from fontTools.pens.transformPen import TransformPen
from fontTools.pens.boundsPen import BoundsPen

_cache = {}

def load(path, axes):
    key = (path, tuple(sorted(axes.items())))
    if key in _cache:
        return _cache[key]
    f = TTFont(path)
    if 'fvar' in f:
        full = {a.axisTag: a.defaultValue for a in f['fvar'].axes}
        full.update(axes)
        f = instancer.instantiateVariableFont(f, full)
    f.flavor = None
    buf = io.BytesIO(); f.save(buf); data = buf.getvalue()
    f = TTFont(io.BytesIO(data))
    face = hb.Face(data); hbf = hb.Font(face)
    os2 = f['OS/2']; upem = f['head'].unitsPerEm
    m = dict(upem=upem, cap=getattr(os2, 'sCapHeight', 0) or 0, xh=getattr(os2, 'sxHeight', 0) or 0,
             asc=os2.sTypoAscender, desc=os2.sTypoDescender)
    _cache[key] = (f, hbf, m)
    return _cache[key]

def shape_line(runs):
    want_glyphs = any(r.get('glyphs') for r in runs); gl = []
    x = 0.0; parts = []; capH = xH = asc = desc = 0; bb = [1e9, 1e9, -1e9, -1e9]
    for r in runs:
        f, hbf, m = load(r['font'], r.get('axes', {}))
        s = r['size'] / m['upem']
        capH = max(capH, m['cap'] * s); xH = max(xH, m['xh'] * s)
        asc = max(asc, m['asc'] * s); desc = min(desc, m['desc'] * s)
        x += r.get('dx', 0) * r['size']
        buf = hb.Buffer(); buf.add_str(r['text']); buf.guess_segment_properties()
        hb.shape(hbf, buf, {"kern": True, "liga": r.get('liga', True), **r.get('features', {})})
        gs = f.getGlyphSet(); order = f.getGlyphOrder()
        n = len(buf.glyph_infos)
        for i, (info, pos) in enumerate(zip(buf.glyph_infos, buf.glyph_positions)):
            name = order[info.codepoint]
            pen = SVGPathPen(gs, lambda v: f"{v:.2f}".rstrip('0').rstrip('.'))
            gx = x + pos.x_offset * s; gy = -pos.y_offset * s
            gs[name].draw(TransformPen(pen, (s, 0, 0, -s, gx, gy)))
            bp = BoundsPen(gs); gs[name].draw(TransformPen(bp, (s, 0, 0, -s, gx, gy)))
            if bp.bounds:
                b = bp.bounds; bb = [min(bb[0], b[0]), min(bb[1], b[1]), max(bb[2], b[2]), max(bb[3], b[3])]
            d = pen.getCommands()
            if d: parts.append(d)
            if want_glyphs:
                gp = SVGPathPen(gs, lambda v: f"{v:.2f}".rstrip('0').rstrip('.'))
                gs[name].draw(TransformPen(gp, (s, 0, 0, -s, 0, 0)))
                gl.append(dict(d=gp.getCommands(), x=round(gx, 2), adv=round(pos.x_advance * s, 2), name=name))
            x += pos.x_advance * s
            if i < n - 1 or r.get('trackLast', False):
                x += r.get('tracking', 0) * r['size']
            x += r.get('kern', {}).get(str(i), 0) * r['size']
    return dict(glyphs=gl if want_glyphs else None, d=' '.join(parts), width=round(x, 2), bbox=[round(v, 2) for v in bb], capH=round(capH, 2), xH=round(xH, 2), asc=round(asc, 2), desc=round(desc, 2))

if __name__ == '__main__':
    lines = json.load(sys.stdin)
    print(json.dumps([shape_line(l) for l in lines]))
