"""Choisit, pour chaque texte du logo client, la police (et ses réglages) qui recouvre le mieux le lettrage d'origine.
Méthode : mise à l'échelle sur la hauteur d'encre, interlettrage ajusté sur la largeur, score = IoU des masques.
Usage : python3 fit_fonts.py <scratchpad> <image d'origine>  → JSON des meilleurs réglages"""
import json, sys
import numpy as np, skia
from PIL import Image
S, SRC = sys.argv[1], sys.argv[2]
sys.path.insert(0, f'{S}/scripts'); sys.path.insert(0, f'{S}/scripts/final')
from text2path import shape_line
from mono_paths import parse

im = np.asarray(Image.open(SRC).convert('RGB')).astype(int)
r, g, b = im[..., 0], im[..., 1], im[..., 2]
H, W = r.shape
lum = (r * 299 + g * 587 + b * 114) / 1000
dark = (lum < 140) & (g >= r - 10)
orange = (r > 150) & (g < 140) & (b < 90) & (r - g > 60)
FT = lambda n: f'{S}/fonts/{n}.woff2'

def region(m, x0, y0, x1, y1):
    z = np.zeros_like(m); z[y0:y1, x0:x1] = m[y0:y1, x0:x1]; return z

TARGETS = {
    'soleilS': (region(dark, 890, 170, 1058, 386), 'S'),
    'oleil': (region(dark, 1058, 170, 1530, 386), 'oleil'),
    'saveursS': (region(dark, 890, 382, 1066, 586), 'S'),
    'aveurs': (region(dark, 1066, 418, 1746, 586), 'aveurs'),
    'et': (region(orange, 1532, 228, 1712, 386), 'et'),
    's1': (region(dark, 955, 652, 1702, 692), 'FRUITS & LÉGUMES FRAIS'),
    's2': (region(dark, 1133, 702, 1552, 742), 'EN LIVRAISON'),
    'script': (region(dark, 984, 748, 1702, 856), 'La fraîcheur au quotidien'),
}
CANDS = {
    'serif': [('AbrilFatface-normal-400', {}), ('RozhaOne-normal-400', {}), ('YesevaOne-normal-400', {}), ('Gloock-normal', {}), ('DMSerif-normal', {}),
              ('YoungSerif-normal', {}), ('Playfair-normal', {'wght': 900}), ('Playfair-normal', {'wght': 800}), ('Fraunces-normal', {'wght': 900, 'SOFT': 0, 'opsz': 144, 'WONK': 0}),
              ('Fraunces-normal', {'wght': 800, 'SOFT': 0, 'opsz': 144, 'WONK': 0}), ('Fraunces-normal', {'wght': 900, 'SOFT': 50, 'opsz': 144, 'WONK': 0}), ('BodoniModa-normal', {'wght': 900})],
    'et': [('Playfair-italic', {'wght': 700}), ('Playfair-italic', {'wght': 800}), ('Playfair-italic', {'wght': 900}), ('Fraunces-italic', {'wght': 800, 'SOFT': 0, 'opsz': 144}),
           ('Fraunces-italic', {'wght': 700, 'SOFT': 50, 'opsz': 144}), ('DMSerif-italic', {}), ('BodoniModa-italic', {'wght': 800})],
    'caps': [('JosefinSans-normal', {'wght': w}) for w in (500, 600, 700)] + [('Montserrat-normal', {'wght': w}) for w in (500, 600)] +
            [('Spartan-normal', {'wght': w}) for w in (500, 600)] + [('Jost-normal', {'wght': w}) for w in (500, 600)],
    'script': [(n, {}) for n in ('AlexBrush-normal-400', 'Montez-normal-400', 'Sacramento-normal-400', 'MrDafoe-normal-400', 'Arizonia-normal-400', 'Italianno-normal-400',
              'Tangerine-normal-700', 'Satisfy-normal-400', 'Cookie-normal-400', 'Lavishly-normal-400', 'Ephesis-normal-400', 'Allura-normal-400', 'GreatVibes-normal-400',
              'Parisienne-normal-400', 'Pinyon-normal', 'Monsieur-normal-400', 'Mea-normal-400')],
}
KIND = {'soleilS': 'serif', 'oleil': 'serif', 'saveursS': 'serif', 'aveurs': 'serif', 'et': 'et', 's1': 'caps', 's2': 'caps', 'script': 'script'}

def raster(d, sx, tx, ty):
    surf = skia.Surface(W, H); c = surf.getCanvas(); c.clear(skia.ColorWHITE)
    p = parse(d); p.transform(skia.Matrix.MakeAll(sx, 0, tx, 0, sx, ty, 0, 0, 1))
    c.drawPath(p, skia.Paint(Color=skia.ColorBLACK, AntiAlias=True))
    a = np.asarray(surf.makeImageSnapshot().toarray())[..., 0]
    return a < 128

def fit(key, font, axes):
    m, text = TARGETS[key]
    ys, xs = np.where(m); ox0, ox1, oy0, oy1 = xs.min(), xs.max() + 1, ys.min(), ys.max() + 1
    run = lambda t: shape_line([{'font': FT(font), 'axes': axes, 'size': 100, 'text': text, 'tracking': t}])
    L = run(0); bh = L['bbox'][3] - L['bbox'][1]; s = (oy1 - oy0) / bh
    lo, hi = -0.25, 0.5
    for _ in range(22):
        t = (lo + hi) / 2; L = run(t); w = (L['bbox'][2] - L['bbox'][0]) * s
        if w > ox1 - ox0: hi = t
        else: lo = t
    L = run(t); tx = ox0 - L['bbox'][0] * s; ty = oy0 - L['bbox'][1] * s
    R = raster(L['d'], s, tx, ty)
    iou = (R & m).sum() / max(1, (R | m).sum())
    return dict(key=key, font=font, axes=axes, size=round(100 * s, 2), tracking=round(t, 4), x=round(tx, 2), baseline=round(ty, 2), iou=round(float(iou), 4))

def overlay(key, rows, n=4):
    m, text = TARGETS[key]; ys, xs = np.where(m); x0, x1, y0, y1 = xs.min() - 6, xs.max() + 7, ys.min() - 6, ys.max() + 7
    tiles = []
    for d in rows[:n]:
        L = shape_line([{'font': FT(d['font']), 'axes': d['axes'], 'size': 100, 'text': text, 'tracking': d['tracking']}])
        R = raster(L['d'], d['size'] / 100, d['x'], d['baseline'])
        o = np.full((H, W, 3), 255, np.uint8); o[m] = (230, 60, 60); o[R] = (40, 90, 220); o[R & m] = (30, 30, 30)
        tiles.append(o[y0:y1, x0:x1])
    return np.concatenate(tiles, 0)

res = {}
for key in TARGETS:
    rows = sorted((fit(key, f, a) for f, a in CANDS[KIND[key]]), key=lambda d: -d['iou'])
    res[key] = rows
    Image.fromarray(overlay(key, rows)).save(f'{S}/work/hybrid/_ov_{key}.png')
    print(key, *[f"{d['font']}{d['axes'] or ''}:{d['iou']}" for d in rows[:5]], sep='\n  ', file=sys.stderr)
json.dump(res, open(f'{S}/work/hybrid/fit.json', 'w'), indent=1)
