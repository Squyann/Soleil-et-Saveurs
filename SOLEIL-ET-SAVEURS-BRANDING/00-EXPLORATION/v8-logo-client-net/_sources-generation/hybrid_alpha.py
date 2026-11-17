"""Détourage haute définition de l'illustration agrandie (fond blanc → transparent, bords doux, sans liseré blanc).
Usage : python3 hybrid_alpha.py <entrée RGB @4x> <sortie RGBA>"""
import sys
import numpy as np
from PIL import Image
from scipy import ndimage as ndi

src, dst = sys.argv[1], sys.argv[2]
P = np.asarray(Image.open(src).convert('RGB')).astype(np.float32)
mn = P.min(2)
white = mn > 238
lab, _ = ndi.label(white)
edge = set(np.unique(np.r_[lab[0], lab[-1], lab[:, 0], lab[:, -1]])) - {0}
bg = np.isin(lab, list(edge))
ring = ndi.binary_dilation(bg, iterations=7) & ~bg
alpha = np.where(bg, 0.0, 1.0).astype(np.float32)
# bord doux : opacité selon l'écart au blanc (le liseré clair des bords est absorbé)
alpha[ring] = np.clip((250 - mn[ring]) / 70.0, 0, 1)
alpha = np.minimum(alpha, ndi.gaussian_filter(alpha, 0.6) + 0.15) * (~bg)
a = alpha[..., None]
rgb = np.where(a > 0.01, (P - (1 - a) * 255) / np.maximum(a, 0.01), 0)
rgb = np.clip(rgb, 0, 255)
out = np.dstack([rgb, alpha * 255]).round().astype(np.uint8)
im = Image.fromarray(out, 'RGBA')
im.save(dst, optimize=True)
print(im.size, 'opaque', float((alpha > .99).mean()))
