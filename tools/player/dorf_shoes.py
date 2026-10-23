#!/usr/bin/env python3
# Darker leather shoes for a villager figure (feat/dorf): some Rocketbox avatars wear light tan shoes that read as bare feet in the warm
# light of the fire. The shoes are found on the mesh (the triangles of the body near the ground, grown over their UV island while they stay
# below the ankles), drawn as a mask into the body colour texture and darkened there to a dark brown, the leather's detail kept.
#   python3 tools/player/dorf_shoes.py <name>_mesh.glb <dorf_name.json> [target luminance 0–255, default 34] [saturation 0–1, default 1]
# <name>_mesh.glb: the mesh before compression (tools/player/build_player.mjs, in $PAV_WORK/out); the JSON is changed in place.
import base64, io, json, struct, sys
import numpy as np
from PIL import Image, ImageDraw, ImageFilter

glb, target = sys.argv[1], sys.argv[2]
lum = float(sys.argv[3]) if len(sys.argv) > 3 else 34.0
sat = float(sys.argv[4]) if len(sys.argv) > 4 else 1.0
d = open(glb, 'rb').read()
jl = struct.unpack_from('<I', d, 12)[0]
G = json.loads(d[20:20 + jl])
bo = 20 + jl
B = d[bo + 8: bo + 8 + struct.unpack_from('<I', d, bo)[0]]


def acc(i):
    a = G['accessors'][i]
    bv = G['bufferViews'][a['bufferView']]
    dt = np.dtype('<' + {5126: 'f4', 5123: 'u2', 5125: 'u4', 5121: 'u1', 5120: 'i1', 5122: 'i2'}[a['componentType']])
    n = {'SCALAR': 1, 'VEC2': 2, 'VEC3': 3, 'VEC4': 4}[a['type']]
    off = bv.get('byteOffset', 0) + a.get('byteOffset', 0)
    st = bv.get('byteStride', dt.itemsize * n)
    return np.ndarray((a['count'], n), dtype=dt, buffer=B, offset=off, strides=(st, dt.itemsize)).astype(np.float64)


prim = next(p for m in G['meshes'] for p in m['primitives'] if 'body' in G['materials'][p['material']]['name'].lower())
pos = acc(prim['attributes']['POSITION'])
uv = acc(prim['attributes']['TEXCOORD_0'])
tri = acc(prim['indices']).astype(np.int64).reshape(-1, 3)
up = int(np.argmax(pos.max(0) - pos.min(0)))  # the height axis (z in the Rocketbox export, centimetres)
h = pos[:, up] - pos[:, up].min()
H = h.max()
zt = h[tri]
seed = zt.max(1) < 0.02 * H  # soles and toe caps
ok = zt.max(1) < 0.14 * H  # never above the top of a boot
# grow over triangles that share a corner – the same point with the same UV (one UV island: the export splits vertices at hard edges too)
key = {}
wv = np.zeros(len(pos), np.int64)
for v in range(len(pos)):
    k = (tuple(np.round(pos[v] * 100).astype(np.int64)), tuple(np.round(uv[v] * 4096).astype(np.int64)))
    wv[v] = key.setdefault(k, len(key))
tri_w = wv[tri]
by_v = {}
for t, vs in enumerate(tri_w):
    for v in vs:
        by_v.setdefault(v, []).append(t)
inside = seed & ok
stack = list(np.nonzero(inside)[0])
while stack:
    t = stack.pop()
    for v in tri_w[t]:
        for u in by_v[v]:
            if not inside[u] and ok[u]:
                inside[u] = True
                stack.append(u)
J = json.load(open(target))
mat = next(m for m in J['materials'] if 'body' in m['name'].lower())
ii = J['textures'][mat['pbrMetallicRoughness']['baseColorTexture']['index']]
src = ii.get('source')
if src is None:  # EXT_texture_webp
    src = ii['extensions']['EXT_texture_webp']['source']
im = J['images'][src]
head, b64 = im['uri'].split(',', 1)
img = Image.open(io.BytesIO(base64.b64decode(b64))).convert('RGB')
W, Hh = img.size
mask = Image.new('L', (W, Hh), 0)
dr = ImageDraw.Draw(mask)
for t in np.nonzero(inside)[0]:
    dr.polygon([((uv[v, 0] % 1) * W, (uv[v, 1] % 1) * Hh) for v in tri[t]], fill=255)
mask = mask.filter(ImageFilter.MaxFilter(5))
a = np.asarray(img).astype(np.float64)
m = np.asarray(mask) > 127
if m.sum() < 50:
    sys.exit(f'{target}: no shoes found ({int(m.sum())} pixels)')
L = (a[m] @ np.array([0.299, 0.587, 0.114])).mean()
k = min(1.0, max(0.25, lum / max(L, 1)))
c = a[m] * k
c = c * np.array([1.06, 0.98, 0.9])  # a little warmer: brown leather, not grey
g = c @ np.array([0.299, 0.587, 0.114])
c = g[:, None] + (c - g[:, None]) * sat  # less colour: black leather
a[m] = np.clip(c, 0, 255)
out = io.BytesIO()
Image.fromarray(a.astype(np.uint8)).save(out, 'WEBP', quality=88, method=6)
im['uri'] = head + ',' + base64.b64encode(out.getvalue()).decode()
open(target, 'w').write(json.dumps(J, separators=(',', ':')))
print(f'{target}: shoes {int(inside.sum())} triangles, {int(m.sum())} px, luminance {L:.0f} → {L * k:.0f}')
