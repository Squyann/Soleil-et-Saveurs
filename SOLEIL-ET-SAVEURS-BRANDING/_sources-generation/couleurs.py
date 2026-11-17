"""Valeurs CMJN indicatives (LittleCMS, sRGB → profil CMJN générique Ghostscript, intention colorimétrique relative)
et contrastes WCAG des couples texte / fond."""
import json
from PIL import Image, ImageCms
PAL = [
 ('Vert olivier', '#2F4A2B', 'principale'), ('Terre cuite', '#C2602D', 'principale'), ('Safran', '#ECAD44', 'principale'), ('Lin', '#F3E8D6', 'principale'),
 ('Olivier profond', '#22371F', 'secondaire'), ('Brique', '#A94E25', 'secondaire'), ('Halo', '#D7803F', 'secondaire'), ('Miel', '#F2C46B', 'secondaire'),
 ('Sauge', '#6F8A50', 'secondaire'), ('Sauge claire', '#9DB07A', 'secondaire'), ('Sauge pâle', '#B9C79A', 'secondaire'),
 ('Tomate', '#B83A26', 'secondaire'), ('Poire', '#B3B65A', 'secondaire'), ('Chou', '#4C7A3A', 'secondaire')]
srgb = ImageCms.getOpenProfile('/usr/share/color/icc/sRGB.icc')
cmyk = ImageCms.getOpenProfile('/usr/share/color/icc/ghostscript/default_cmyk.icc')
t = ImageCms.buildTransform(srgb, cmyk, 'RGB', 'CMYK', renderingIntent=ImageCms.Intent.RELATIVE_COLORIMETRIC)
def rgb(h): return tuple(int(h[i:i + 2], 16) for i in (1, 3, 5))
def lum(h):
    c = [v / 255 for v in rgb(h)]; c = [v / 12.92 if v <= 0.03928 else ((v + 0.055) / 1.055) ** 2.4 for v in c]
    return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2]
def contrast(a, b):
    la, lb = sorted([lum(a), lum(b)], reverse=True); return round((la + 0.05) / (lb + 0.05), 2)
out = []
for n, h, role in PAL:
    im = Image.new('RGB', (1, 1), rgb(h)); c = ImageCms.applyTransform(im, t).getpixel((0, 0))
    out.append(dict(nom=n, hex=h, role=role, rvb=' · '.join(map(str, rgb(h))), cmjn=' · '.join(str(round(v / 2.55)) for v in c)))
pairs = [('Vert olivier', '#2F4A2B', 'Lin', '#F3E8D6'), ('Vert olivier', '#2F4A2B', 'Blanc', '#FFFFFF'), ('Terre cuite', '#C2602D', 'Lin', '#F3E8D6'), ('Brique', '#A94E25', 'Lin', '#F3E8D6'),
         ('Lin', '#F3E8D6', 'Vert olivier', '#2F4A2B'), ('Miel', '#F2C46B', 'Vert olivier', '#2F4A2B'), ('Safran', '#ECAD44', 'Vert olivier', '#2F4A2B'), ('Blanc', '#FFFFFF', 'Terre cuite', '#C2602D')]
cons = [dict(texte=a, fond=c, ratio=contrast(b, d), aa_normal=contrast(b, d) >= 4.5, aa_grand=contrast(b, d) >= 3) for a, b, c, d in pairs]
print(json.dumps({'palette': out, 'contrastes': cons}, ensure_ascii=False, indent=1))
