"""Planche avant / après : image fournie vs version nette (logo entier + zooms x3).
Usage : python3 hybrid_compare.py <scratchpad> <image d'origine> <PNG fond blanc 4000 px> <index JSON> <sortie>"""
import io, json, sys
from PIL import Image, ImageDraw, ImageFont
from fontTools.ttLib import TTFont
from fontTools.varLib import instancer
S, SRC, NEW, IDX, OUT = sys.argv[1:6]
def font(size, wght):
    f = TTFont(f'{S}/fonts/DMSans-normal.woff2'); f = instancer.instantiateVariableFont(f, {'wght': wght, 'opsz': 14}); f.flavor = None
    b = io.BytesIO(); f.save(b); b.seek(0); return ImageFont.truetype(b, size)
F1, F2, F3 = font(40, 700), font(26, 500), font(22, 600)
orig = Image.open(SRC).convert('RGB'); new = Image.open(NEW).convert('RGB')
vb = json.load(open(IDX))['complet']; k = new.width / vb[2]
full = Image.new('RGB', (round(1774 * k), round(887 * k)), 'white'); full.paste(new, (round(vb[0] * k), round(vb[1] * k)))
def crop_new(x0, y0, x1, y1, size):
    return full.crop((round(x0 * k), round(y0 * k), round(x1 * k), round(y1 * k))).resize(size, Image.LANCZOS)
W = 2000; pad = 60; colw = (W - 3 * pad) // 2
fullh = round(colw * 887 / 1774)
zooms = [(185, 95, 395, 230), (900, 180, 1110, 315), (1000, 745, 1210, 880)]
zw = (colw - 2 * 20) // 3; zh = round(zw * 135 / 210)
H = 150 + 40 + fullh + 30 + 36 + zh + 60
canvas = Image.new('RGB', (W, H), '#F4EEDF'); d = ImageDraw.Draw(canvas)
d.text((pad, 40), 'Votre logo : avant / après', font=F1, fill='#162E0E')
d.text((pad, 92), 'Même dessin. Textes refaits en vectoriel net, illustration détourée et agrandie x4.', font=F2, fill='#5A6150')
for i, (lab, im) in enumerate((('IMAGE FOURNIE', orig), ('VERSION NETTE', None))):
    x = pad + i * (colw + pad); y = 150
    d.text((x, y), lab, font=F3, fill='#C94A08'); y += 40
    tile = Image.new('RGB', (colw, fullh), 'white')
    if im is not None: tile.paste(im.resize((colw, fullh), Image.LANCZOS))
    else: tile.paste(crop_new(0, 0, 1774, 887, (colw, fullh)))
    canvas.paste(tile, (x, y)); y += fullh + 30
    d.text((x, y), 'Zoom x4', font=F3, fill='#5A6150'); y += 36
    for j, (x0, y0, x1, y1) in enumerate(zooms):
        z = orig.crop((x0, y0, x1, y1)).resize((zw, zh), Image.BICUBIC) if im is not None else crop_new(x0, y0, x1, y1, (zw, zh))
        canvas.paste(z, (x + j * (zw + 20), y))
canvas.save(OUT, optimize=True); print(canvas.size)
