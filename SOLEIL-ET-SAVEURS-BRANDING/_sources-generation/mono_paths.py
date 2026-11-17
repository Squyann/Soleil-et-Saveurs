"""Calcule en vrai vectoriel (opérations booléennes Skia) le paysage monochrome du logo :
les filets en réserve deviennent des découpes dans la forme, sans masque SVG.
Sortie : JSON { "mono": d, "simple": d, "fillRule": ... } sur la sortie standard."""
import json, math, re, sys
import skia

def parse(d):
    """Analyseur minimal de chemins SVG (M L H V C Q A Z, absolus et relatifs)."""
    toks = re.findall(r'[MLHVCQAZmlhvcqaz]|-?\d*\.?\d+(?:e-?\d+)?', d)
    p = skia.Path(); i = 0; cmd = None; x = y = 0.0; sx = sy = 0.0
    def num():
        nonlocal i; v = float(toks[i]); i += 1; return v
    while i < len(toks):
        t = toks[i]
        if re.match(r'[A-Za-z]', t): cmd = t; i += 1
        rel = cmd.islower(); c = cmd.upper()
        if c == 'Z': p.close(); x, y = sx, sy; continue
        if c == 'M':
            nx, ny = num(), num(); x, y = (x + nx, y + ny) if rel else (nx, ny); p.moveTo(x, y); sx, sy = x, y; cmd = 'l' if rel else 'L'
        elif c == 'L':
            nx, ny = num(), num(); x, y = (x + nx, y + ny) if rel else (nx, ny); p.lineTo(x, y)
        elif c == 'H':
            nx = num(); x = x + nx if rel else nx; p.lineTo(x, y)
        elif c == 'V':
            ny = num(); y = y + ny if rel else ny; p.lineTo(x, y)
        elif c == 'C':
            a = [num() for _ in range(6)]
            if rel: a = [a[0] + x, a[1] + y, a[2] + x, a[3] + y, a[4] + x, a[5] + y]
            p.cubicTo(*a); x, y = a[4], a[5]
        elif c == 'Q':
            a = [num() for _ in range(4)]
            if rel: a = [a[0] + x, a[1] + y, a[2] + x, a[3] + y]
            p.quadTo(*a); x, y = a[2], a[3]
        elif c == 'A':
            rx, ry, rot, la, sw, nx, ny = [num() for _ in range(7)]
            if rel: nx, ny = x + nx, y + ny
            p.arcTo(rx, ry, rot, skia.Path.ArcSize.kLarge_ArcSize if la else skia.Path.ArcSize.kSmall_ArcSize,
                    skia.PathDirection.kCW if sw else skia.PathDirection.kCCW, nx, ny)
            x, y = nx, ny
    return p

def circle(cx, cy, r):
    p = skia.Path(); p.addCircle(cx, cy, r); return p
def oval(cx, cy, rx, ry):
    p = skia.Path(); p.addOval(skia.Rect.MakeLTRB(cx - rx, cy - ry, cx + rx, cy + ry)); return p
def stroke(path, w, cap='butt', join='miter'):
    paint = skia.Paint(Style=skia.Paint.kStroke_Style, StrokeWidth=w,
                       StrokeCap={'butt': skia.Paint.kButt_Cap, 'round': skia.Paint.kRound_Cap}[cap],
                       StrokeJoin={'miter': skia.Paint.kMiter_Join, 'round': skia.Paint.kRound_Join}[join])
    out = skia.Path(); paint.getFillPath(path, out); return out
def tr(path, tx=0, ty=0, rot=0, s=1):
    m = skia.Matrix(); m.setTranslate(tx, ty); m.preRotate(rot); m.preScale(s, s)
    q = skia.Path(path); q.transform(m); return q

class Ink:
    def __init__(self): self.p = skia.Path()
    def W(self, q): self.p = skia.Op(self.p, q, skia.PathOp.kUnion_PathOp)
    def B(self, q): self.p = skia.Op(self.p, q, skia.PathOp.kDifference_PathOp)
    def clip(self, q): self.p = skia.Op(self.p, q, skia.PathOp.kIntersect_PathOp)

def to_d(path):
    out = []; it = skia.Path.Iter(path, False); f = lambda v: f"{v:.3f}".rstrip('0').rstrip('.')
    while True:
        verb, pts = it.next()
        if verb == skia.Path.Verb.kDone_Verb: break
        if verb == skia.Path.Verb.kMove_Verb: out.append(f"M{f(pts[0].x())} {f(pts[0].y())}")
        elif verb == skia.Path.Verb.kLine_Verb: out.append(f"L{f(pts[1].x())} {f(pts[1].y())}")
        elif verb == skia.Path.Verb.kQuad_Verb: out.append(f"Q{f(pts[1].x())} {f(pts[1].y())} {f(pts[2].x())} {f(pts[2].y())}")
        elif verb == skia.Path.Verb.kCubic_Verb: out.append(f"C{f(pts[1].x())} {f(pts[1].y())} {f(pts[2].x())} {f(pts[2].y())} {f(pts[3].x())} {f(pts[3].y())}")
        elif verb == skia.Path.Verb.kConic_Verb:
            w = it.conicWeight()
            quads = skia.Path.ConvertConicToQuads(pts[0], pts[1], pts[2], w, 2)
            for k in range(1, len(quads), 2): out.append(f"Q{f(quads[k].x())} {f(quads[k].y())} {f(quads[k + 1].x())} {f(quads[k + 1].y())}")
        elif verb == skia.Path.Verb.kClose_Verb: out.append('Z')
    return ' '.join(out)

ARCH = parse('M14 116 V52 A36 36 0 0 1 86 52 V116 Z')
HILLS = ['M4 86 C14 80 22 79 30 82 C40 86 46 78 58 78.6 C70 79 78 86 96 82 V122 H4Z',
         'M4 93 C16 87 28 88 38 91.6 C50 96 60 88 72 88.6 C82 89 88 92 96 90.6 V122 H4Z',
         'M4 100 C18 95 30 96.4 42 99.6 C56 103.4 66 96.4 80 97 C88 97.4 92 99 96 98.6 V122 H4Z']
SEP = 1.5

def mono():
    k = Ink(); k.W(ARCH)
    k.B(stroke(circle(50, 80, 40), 1.2)); k.B(stroke(circle(50, 80, 31), 1.2))
    k.B(circle(50, 80, 23.4)); k.W(circle(50, 80, 21))
    for h in HILLS: hp = parse(h); k.W(hp); k.B(stroke(hp, SEP))
    k.B(stroke(parse('M4 96.6 C16 90.6 28 91.6 38 95.2 C50 99.6 60 91.6 72 92.2 C82 92.6 88 95.6 96 94.2'), 0.7))
    T = lambda q: tr(q, 0, 3)
    leeks = T(parse('M23.4 106 C21.4 96 18.4 88 15.6 77.6 C20.4 85.6 24 95 25.6 106Z M26.2 106 C25.6 94 26.2 85.6 27.8 73.6 C29.8 85.6 29.4 96 28.8 106Z M30.2 106 C31.6 97 34.2 90 38.8 81.8 C36.8 91 34.4 99 32.8 106Z'))
    k.W(leeks); k.B(stroke(leeks, 1.1))
    cab = T(circle(42, 101.4, 9.6)); k.W(cab); k.B(stroke(cab, SEP))
    k.B(stroke(T(parse('M42 92.4 C40.2 96.6 40.2 104.4 42 110.6 M42 98.4 C38.2 98.2 35.4 100 33.8 103 M42 98.4 C45.8 98.2 48.6 100 50.2 103')), 1, 'round'))
    tom = T(circle(58.6, 102.8, 8.6)); k.W(tom); k.B(stroke(tom, SEP))
    k.B(T(parse('M58.6 95.6 l1.6 -2.6 l0.4 2.8 l2.8 -0.6 l-2 2 l2.4 1.4 l-2.8 0.2 l-0.4 2.6 l-2 -2 l-2 2 l-0.4 -2.6 l-2.8 -0.2 l2.4 -1.4 l-2 -2 l2.8 0.6 l0.4 -2.8z')))
    pear = T(parse('M75.4 84.6 C78.4 84.6 79.8 87.4 79.8 90.2 C79.8 92.8 82.8 95.2 83.8 99.2 C85.2 105.2 81.2 110.4 75.4 110.4 C69.6 110.4 65.6 105.2 67 99.2 C68 95.2 71 92.8 71 90.2 C71 87.4 72.4 84.6 75.4 84.6Z'))
    k.W(pear); k.B(stroke(pear, SEP)); k.B(T(oval(72.6, 99, 1.4, 3.2)))
    k.W(stroke(T(parse('M75.4 85 C75.4 82 76.4 80 78.4 78.8')), 1.4, 'round'))
    leaf = tr(parse('M0 0 C1.4 -5.6 6.8 -9.4 13.6 -8.6 C11.8 -2.4 6.2 1 0 0Z'), 76.8, 83.6, -12, 0.55)
    k.B(stroke(leaf, 1.6 * 0.55)); k.W(leaf)
    ground = T(parse('M8 107.5 C30 104.5 70 104.5 92 107.5 V122 H8Z')); k.W(ground); k.B(stroke(ground, SEP))
    k.clip(ARCH); return k.p

def simple():
    k = Ink(); k.W(ARCH); k.B(circle(50, 80, 25.5)); k.W(circle(50, 80, 22))
    for h in ['M4 92 C20 84 34 86 46 90 C60 95 72 85 96 86 V122 H4Z', 'M4 104 C24 97 44 98 58 102 C72 106 84 99 96 99 V122 H4Z']:
        hp = parse(h); k.W(hp); k.B(stroke(hp, 3))
    k.clip(ARCH); return k.p

m, s = mono(), simple()
rule = lambda p: 'evenodd' if p.getFillType() in (skia.PathFillType.kEvenOdd, skia.PathFillType.kInverseEvenOdd) else 'nonzero'
print(json.dumps({'mono': to_d(m), 'monoRule': rule(m), 'simple': to_d(s), 'simpleRule': rule(s)}))
