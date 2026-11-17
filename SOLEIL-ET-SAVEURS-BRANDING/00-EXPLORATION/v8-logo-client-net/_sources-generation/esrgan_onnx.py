"""Real-ESRGAN (RRDBNet) sans PyTorch : lit les poids .pth (zip + pickle) et construit le réseau en ONNX,
puis agrandit une image x4 par tuiles avec onnxruntime.
Usage : python3 esrgan_onnx.py <modele.pth> <blocs (6 ou 23)> <entrée.png> <sortie.png>"""
import sys, zipfile, pickle, io, os
import numpy as np, onnx, onnxruntime as ort
from onnx import helper, TensorProto, numpy_helper
from PIL import Image

class OD(dict): pass

def load_pth(path):
    z = zipfile.ZipFile(path); root = z.namelist()[0].split('/')[0]
    DT = {'FloatStorage': np.float32, 'HalfStorage': np.float16}
    class U(pickle.Unpickler):
        def find_class(self, mod, name):  # liste blanche stricte : aucun autre objet ne peut être chargé
            if (mod, name) == ('torch._utils', '_rebuild_tensor_v2'):
                def rb(st, off, size, stride, *a):
                    v = np.lib.stride_tricks.as_strided(st[off:], shape=tuple(size), strides=[s * st.itemsize for s in stride])
                    return np.array(v, dtype=np.float32)
                return rb
            if mod == 'torch' and name in DT: return name
            if (mod, name) == ('collections', 'OrderedDict'): return OD
            raise pickle.UnpicklingError(f'objet refusé : {mod}.{name}')
        def persistent_load(self, pid):
            _, stype, key, loc, numel = pid
            return np.frombuffer(z.read(f'{root}/data/{key}'), dtype=DT[stype if isinstance(stype, str) else stype])
    d = U(io.BytesIO(z.read(f'{root}/data.pkl'))).load()
    return d.get('params_ema', d.get('params', d))

def build(w, nb):
    nodes, inits = [], []; c = [0]
    def nm(p): c[0] += 1; return f'{p}{c[0]}'
    def conv(x, k):
        W, B = k + '.weight', k + '.bias'
        if W not in [i.name for i in inits]:
            inits.append(numpy_helper.from_array(w[W], W)); inits.append(numpy_helper.from_array(w[B], B))
        o = nm('c'); nodes.append(helper.make_node('Conv', [x, W, B], [o], pads=[1, 1, 1, 1], kernel_shape=[3, 3])); return o
    def lrelu(x): o = nm('l'); nodes.append(helper.make_node('LeakyRelu', [x], [o], alpha=0.2)); return o
    def cat(xs): o = nm('k'); nodes.append(helper.make_node('Concat', xs, [o], axis=1)); return o
    def axpy(a, s, b):  # a*s + b
        sc = nm('s'); inits.append(numpy_helper.from_array(np.array(s, np.float32), sc))
        m = nm('m'); nodes.append(helper.make_node('Mul', [a, sc], [m])); o = nm('a'); nodes.append(helper.make_node('Add', [m, b], [o])); return o
    def add(a, b): o = nm('a'); nodes.append(helper.make_node('Add', [a, b], [o])); return o
    def up(x):
        sc = nm('u'); inits.append(numpy_helper.from_array(np.array([1, 1, 2, 2], np.float32), sc))
        o = nm('r'); nodes.append(helper.make_node('Resize', [x, '', sc], [o], mode='nearest', nearest_mode='floor', coordinate_transformation_mode='asymmetric')); return o
    def rdb(x, p):
        x1 = lrelu(conv(x, p + '.conv1')); x2 = lrelu(conv(cat([x, x1]), p + '.conv2'))
        x3 = lrelu(conv(cat([x, x1, x2]), p + '.conv3')); x4 = lrelu(conv(cat([x, x1, x2, x3]), p + '.conv4'))
        x5 = conv(cat([x, x1, x2, x3, x4]), p + '.conv5'); return axpy(x5, 0.2, x)
    feat = conv('input', 'conv_first'); h = feat
    for i in range(nb):
        o = rdb(rdb(rdb(h, f'body.{i}.rdb1'), f'body.{i}.rdb2'), f'body.{i}.rdb3'); h = axpy(o, 0.2, h)
    feat = add(feat, conv(h, 'conv_body'))
    feat = lrelu(conv(up(feat), 'conv_up1')); feat = lrelu(conv(up(feat), 'conv_up2'))
    out = conv(lrelu(conv(feat, 'conv_hr')), 'conv_last')
    nodes.append(helper.make_node('Identity', [out], ['output']))
    g = helper.make_graph(nodes, 'rrdb', [helper.make_tensor_value_info('input', TensorProto.FLOAT, [1, 3, None, None])],
                          [helper.make_tensor_value_info('output', TensorProto.FLOAT, [1, 3, None, None])], inits)
    m = helper.make_model(g, opset_imports=[helper.make_opsetid('', 17)]); m.ir_version = 8; return m

def upscale(sess, img, tile=192, pad=12):
    H, W, _ = img.shape; S = 4; out = np.zeros((H * S, W * S, 3), np.float32)
    x = np.pad(img, ((pad, pad), (pad, pad), (0, 0)), mode='reflect')
    for y0 in range(0, H, tile):
        for x0 in range(0, W, tile):
            y1, x1 = min(H, y0 + tile), min(W, x0 + tile)
            t = x[y0:y1 + 2 * pad, x0:x1 + 2 * pad].transpose(2, 0, 1)[None]
            r = sess.run(None, {'input': np.ascontiguousarray(t)})[0][0].transpose(1, 2, 0)
            out[y0 * S:y1 * S, x0 * S:x1 * S] = r[pad * S:pad * S + (y1 - y0) * S, pad * S:pad * S + (x1 - x0) * S]
            print(f'\r{y0},{x0}', end='', flush=True)
    print(); return np.clip(out, 0, 1)

if __name__ == '__main__':
    pth, nb, src, dst = sys.argv[1], int(sys.argv[2]), sys.argv[3], sys.argv[4]
    onx = pth.replace('.pth', '.onnx')
    if not os.path.exists(onx): onnx.save(build(load_pth(pth), nb), onx)
    so = ort.SessionOptions(); so.graph_optimization_level = ort.GraphOptimizationLevel.ORT_ENABLE_ALL
    sess = ort.InferenceSession(onx, so, providers=['CPUExecutionProvider'])
    img = np.asarray(Image.open(src).convert('RGB')).astype(np.float32) / 255
    Image.fromarray((upscale(sess, img) * 255 + .5).astype(np.uint8)).save(dst)
