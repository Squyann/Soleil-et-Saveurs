"""Bandeau monochrome : rectangle moins le texte et les points (vraie réserve vectorielle)."""
import json, sys
import skia
from mono_paths import parse, to_d, circle
a = json.load(sys.stdin)
x, y, w, h = a['rect']; band = skia.Path(); band.addRect(skia.Rect.MakeXYWH(x, y, w, h))
txt = parse(a['d']); txt.offset(a['dx'], a['dy'])
cut = skia.Path(); cut.setFillType(skia.PathFillType.kWinding)
cut = skia.Op(cut, txt, skia.PathOp.kUnion_PathOp)
for cx, cy, r in a['dots']: cut = skia.Op(cut, circle(cx, cy, r), skia.PathOp.kUnion_PathOp)
res = skia.Op(band, cut, skia.PathOp.kDifference_PathOp)
rule = 'evenodd' if res.getFillType() in (skia.PathFillType.kEvenOdd, skia.PathFillType.kInverseEvenOdd) else 'nonzero'
print(json.dumps({'d': to_d(res), 'rule': rule}))
