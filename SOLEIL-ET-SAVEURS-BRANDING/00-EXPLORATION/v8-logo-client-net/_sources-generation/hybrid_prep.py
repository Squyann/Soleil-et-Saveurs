"""Prépare l'illustration d'origine pour la version hybride :
- découpe de l'emblème, fond blanc détouré (transparence) ;
- effacement du texte en arc (bande crème) et du texte du bandeau (repeints à plat) ;
- mesure de la géométrie (arc, bandeau, étoiles) pour y poser des textes vectoriels ;
- agrandissement x2,5 (Lanczos + accentuation).
Usage : python3 hybrid_prep.py <image d'origine> <dossier de sortie>"""
import json, sys
import numpy as np, cv2
from PIL import Image, ImageFilter
from scipy import ndimage as ndi

src, out = sys.argv[1], sys.argv[2]
im = np.asarray(Image.open(src).convert('RGB')).astype(np.uint8)
CW = 893
E = im[:, :CW].copy()
H, W, _ = E.shape
f = E.astype(int)
r, g, b = f[..., 0], f[..., 1], f[..., 2]

# ---------- 1. Bande crème du nom en arc ----------
creamish = (r > 236) & (g > 228) & (b > 200) & (b < 244) & ((r - b) > 9)   # crème, blanc pur exclu
lab, _ = ndi.label(creamish)
band0 = lab == lab[380, 130]
band = ndi.binary_fill_holes(band0)
cream_col = np.median(E[band0], axis=0).astype(int)
# couleur du texte : pixels foncés dans la bande d'origine
txt = band & (f.sum(2) < 260)
text_col = np.median(E[txt], axis=0).astype(int) if txt.any() else np.array([28, 58, 20])
# étoiles dorées dans la bande (composantes or)
goldish = (r > 180) & (g > 120) & (g < 215) & (b < 140)
gl, gn = ndi.label(goldish & band)
stars = []
for i in range(1, gn + 1):
    ys, xs = np.where(gl == i)
    if 60 < len(ys) < 3000: stars.append([float(xs.mean()), float(ys.mean()), float(max(np.ptp(xs), np.ptp(ys)) / 2)])
# axe médian de la bande (partie haute) → cercle pour le texte
dist = ndi.distance_transform_edt(band)
thick = float(np.percentile(dist[band & (np.arange(H)[:, None] < 300)], 99.5) * 2)
med = (dist >= thick / 2 - 1.5) & band
ys, xs = np.where(med & (np.arange(H)[:, None] < 330))
A = np.c_[2 * xs, 2 * ys, np.ones_like(xs)]; bb = xs.astype(float) ** 2 + ys.astype(float) ** 2
s, *_ = np.linalg.lstsq(A.astype(float), bb, rcond=None); acx, acy = s[0], s[1]; aR = float(np.sqrt(s[2] + acx ** 2 + acy ** 2))

# ---------- 2. Bandeau vert ----------
mask = np.zeros((H + 2, W + 2), np.uint8)
flood = E.copy()
cv2.floodFill(flood, mask, (450, 700), (0, 0, 0), (26, 26, 26), (26, 26, 26), cv2.FLOODFILL_MASK_ONLY | (255 << 8) | 8)
ban = ndi.binary_fill_holes(mask[1:-1, 1:-1] > 0)
by, bx = np.where(ban)
bbox = [int(bx.min()), int(by.min()), int(bx.max()), int(by.max())]
letters = ban & (f.sum(2) > 520)
ly, lx = np.where(letters & (np.arange(W)[None, :] > bbox[0] + 80) & (np.arange(W)[None, :] < bbox[2] - 80))
capH = float(np.percentile(ly, 98) - np.percentile(ly, 2)) if len(ly) else 40.0
lcx = float((lx.min() + lx.max()) / 2) if len(lx) else (bbox[0] + bbox[2]) / 2
lw = float(lx.max() - lx.min()) if len(lx) else 600.0
lcy = float((np.percentile(ly, 2) + np.percentile(ly, 98)) / 2) if len(ly) else (bbox[1] + bbox[3]) / 2
inner = ban & ~letters & (f.sum(2) < 330)
top_col = np.median(E[inner & (np.arange(H)[:, None] < bbox[1] + 12)], axis=0).astype(int)
bot_col = np.median(E[inner & (np.arange(H)[:, None] > bbox[3] - 12)], axis=0).astype(int)

# ---------- 3. Repeindre (effacer les textes d'origine) ----------
P = E.copy()
P[band] = cream_col
yy = np.arange(H)[:, None].repeat(W, 1)
t = np.clip((yy - bbox[1]) / max(1, bbox[3] - bbox[1]), 0, 1)[..., None]
grad = (top_col * (1 - t) + bot_col * t).astype(np.uint8)
P[ban] = grad[ban]

# ---------- 4. Détourage du fond blanc ----------
white = (r > 236) & (g > 236) & (b > 236)
wl, _ = ndi.label(white)
edge_labels = set(np.unique(np.r_[wl[0], wl[-1], wl[:, 0], wl[:, -1]])) - {0}
bg = np.isin(wl, list(edge_labels))
ring = ndi.binary_dilation(bg, iterations=3) & ~bg
alpha = np.where(bg, 0.0, 1.0)
mn = f.min(2).astype(float)
alpha[ring] = np.clip((255 - mn[ring]) / 60.0, 0, 1)
rgba = np.dstack([P, (alpha * 255).astype(np.uint8)])
a = alpha[..., None]
safe = np.where(a > 0.02, (P.astype(float) - (1 - a) * 255) / np.maximum(a, 0.02), P)
rgba[..., :3] = np.clip(np.where(ring[..., None], safe, P), 0, 255).astype(np.uint8)

# ---------- 5. Agrandissement ----------
SC = 2.5
img = Image.fromarray(rgba, 'RGBA')
up = img.resize((int(W * SC), int(H * SC)), Image.LANCZOS).filter(ImageFilter.UnsharpMask(radius=2.2, percent=70, threshold=2))
up.save(f'{out}/emblem-illustration@2.5x.png', optimize=True)
img.save(f'{out}/emblem-illustration@1x.png')
geo = dict(W=W, H=H, scale=SC, arc=dict(cx=float(acx), cy=float(acy), Rmid=aR, thick=thick), stars=stars,
           banner=dict(bbox=bbox, capH=capH, cx=lcx, cy=lcy, textW=lw), colors=dict(cream='#%02X%02X%02X' % tuple(cream_col), text='#%02X%02X%02X' % tuple(text_col),
           bannerTop='#%02X%02X%02X' % tuple(top_col), bannerBot='#%02X%02X%02X' % tuple(bot_col)))
json.dump(geo, open(f'{out}/geometry.json', 'w'), indent=1)
print(json.dumps(geo, indent=1))
