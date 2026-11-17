"""Partie droite du logo client : garde les décors dessinés (feuilles, arcs et filets dorés, ornement central),
efface tous les textes (refaits en vectoriel), raccorde les traits dorés que les lettres coupaient.
Usage : python3 hybrid_right.py <image d'origine> <sortie RGB sur fond blanc>"""
import sys
import numpy as np, cv2
from PIL import Image
from scipy import ndimage as ndi

src, dst = sys.argv[1], sys.argv[2]
X0 = 893
im = np.asarray(Image.open(src).convert('RGB'))[:, X0:].copy()
H, W, _ = im.shape
f = im.astype(int); r, g, b = f[..., 0], f[..., 1], f[..., 2]
yy, xx = np.mgrid[0:H, 0:W]
leafbox = ((xx + X0 >= 1555) & (yy <= 212) & (yy >= 30)) | ((xx + X0 >= 1240) & (xx + X0 <= 1400) & (yy >= 572) & (yy <= 647))
gold = (r > 175) & (g > 110) & (g < 225) & (b < 150) & (r - b > 80)
dark = (r < 110) & (g < 125) & (b < 95) & (g >= r)            # vert du texte (le doré foncé a r > g)
orange = (r > 150) & (g < 140) & (b < 90) & (r - g > 60) & (xx + X0 >= 1530) & (xx + X0 <= 1715) & (yy >= 228) & (yy <= 388)
ink = dark | orange
text = ink & ~leafbox
text = ndi.binary_dilation(text, iterations=3) & ~(leafbox) & ~(gold & ~ndi.binary_dilation(ink, iterations=1))
nonwhite = f.min(2) < 242
deco = nonwhite & ~text
lab, n = ndi.label(deco)
keep = np.zeros_like(deco)
for i, sl in enumerate(ndi.find_objects(lab), 1):
    m = lab[sl] == i; sz = m.sum()
    if sz < 25: continue
    gfrac = gold[sl][m].mean(); inleaf = leafbox[sl][m].mean()
    if gfrac > 0.25 or inleaf > 0.5: keep[sl] |= m
# traits dorés coupés par les lettres : fermeture morphologique puis inpainting
gk = ndi.binary_closing(keep & ~leafbox, structure=np.ones((5, 21)), iterations=1) | ndi.binary_closing(keep & ~leafbox, structure=np.ones((21, 5)), iterations=1)
holes = gk & ~keep & text
keep_all = keep | holes
out = np.full_like(im, 255)
out[keep_all] = im[keep_all]
for y, x in zip(*np.where(holes)):          # interpolation le long du trait (presque horizontal)
    row = keep[y]; L = next((x - k for k in range(1, 40) if x - k >= 0 and row[x - k]), None); R = next((x + k for k in range(1, 40) if x + k < W and row[x + k]), None)
    if L is not None and R is not None:
        w = (x - L) / (R - L); out[y, x] = (im[y, L] * (1 - w) + im[y, R] * w).astype(np.uint8)
    elif L is not None or R is not None: out[y, x] = im[y, L if L is not None else R]
# bords doux : on reprend le halo d'origine autour des décors gardés (sans toucher aux textes)
halo = ndi.binary_dilation(keep_all, iterations=2) & ~keep_all & ~text
out[halo] = im[halo]
Image.fromarray(out).save(dst)
print('gardé', int(keep_all.sum()), 'raccords', int(holes.sum()))
