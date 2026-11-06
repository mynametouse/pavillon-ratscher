# Bake the Khronos Fox's texture into per-face vertex colours (toned to a real red fox), add smooth normals, drop the texture:
# python3 -I bake_fox.py IN.glb OUT.glb
import json, struct, sys, zlib, math

def png_rgb(data):
    assert data[:8] == b'\x89PNG\r\n\x1a\n'
    i, idat, w = 8, b'', 0
    while i < len(data):
        n = struct.unpack('>I', data[i:i + 4])[0]; t = data[i + 4:i + 8]; c = data[i + 8:i + 8 + n]; i += 12 + n
        if t == b'IHDR':
            w, h, bd, ct, _, _, il = struct.unpack('>IIBBBBB', c)
            assert bd == 8 and il == 0 and ct in (2, 6), (bd, ct, il)
            bpp = 3 if ct == 2 else 4
        elif t == b'IDAT': idat += c
    raw = zlib.decompress(idat); stride = w * bpp; out = bytearray(h * stride); prev = bytearray(stride); o = 0
    for y in range(h):
        f = raw[o]; line = bytearray(raw[o + 1:o + 1 + stride]); o += 1 + stride
        for x in range(stride):
            a = line[x - bpp] if x >= bpp else 0; b = prev[x]; c = prev[x - bpp] if x >= bpp else 0
            if f == 1: line[x] = (line[x] + a) & 255
            elif f == 2: line[x] = (line[x] + b) & 255
            elif f == 3: line[x] = (line[x] + (a + b) // 2) & 255
            elif f == 4:
                p = a + b - c; pa, pb, pc = abs(p - a), abs(p - b), abs(p - c)
                line[x] = (line[x] + (a if pa <= pb and pa <= pc else b if pb <= pc else c)) & 255
        out[y * stride:(y + 1) * stride] = line; prev = line
    return w, h, bpp, out

def lin(v):
    v /= 255.0
    return v / 12.92 if v <= 0.04045 else ((v + 0.055) / 1.055) ** 2.4

def tone(r, g, b, k):
    l = r * 0.3 + g * 0.6 + b * 0.1
    if l > 0.7: r, g, b = 0.72, 0.69, 0.64
    elif l < 0.08: r, g, b = 0.028, 0.02, 0.016
    elif r > b * 3: r, g, b = 0.4, 0.11, 0.025
    else: r, g, b = r * 0.7, g * 0.7, b * 0.7
    m = 0.9 + k * 0.2
    return r * m, g * m, b * m

src, dst = sys.argv[1], sys.argv[2]
b = open(src, 'rb').read()
L = struct.unpack('<I', b[12:16])[0]; j = json.loads(b[20:20 + L])
binL = struct.unpack('<I', b[20 + L:24 + L])[0]; BIN = b[28 + L:28 + L + binL]
def view(i):
    bv = j['bufferViews'][i]; o = bv.get('byteOffset', 0); return BIN[o:o + bv['byteLength']]
def acc(i):
    a = j['accessors'][i]; bv = j['bufferViews'][a['bufferView']]; n = {'SCALAR': 1, 'VEC2': 2, 'VEC3': 3, 'VEC4': 4}[a['type']]
    fmt = {5126: 'f', 5123: 'H', 5121: 'B'}[a['componentType']]; sz = struct.calcsize(fmt)
    st = bv.get('byteStride', sz * n); base = bv.get('byteOffset', 0) + a.get('byteOffset', 0)
    return [struct.unpack('<%d%s' % (n, fmt), BIN[base + k * st: base + k * st + sz * n]) for k in range(a['count'])]
prim = j['meshes'][0]['primitives'][0]
P = acc(prim['attributes']['POSITION']); UV = acc(prim['attributes']['TEXCOORD_0'])
assert 'indices' not in prim
img = j['images'][0]; W, H, bpp, px = png_rgb(view(img['bufferView']))
n = len(P); col = []
for f in range(0, n, 3):
    u = sum(UV[f + k][0] for k in range(3)) / 3; v = sum(UV[f + k][1] for k in range(3)) / 3
    x = min(W - 1, max(0, int(u * W))); y = min(H - 1, max(0, int(v * H))); q = (y * W + x) * bpp
    h = math.sin(f * 12.9898 + 78.233) * 43758.5453; h -= math.floor(h)
    c = tone(lin(px[q]), lin(px[q + 1]), lin(px[q + 2]), h)
    col += [c, c, c]
# smooth normals by position (area-weighted face normals summed at each place)
accn = {}
key = lambda p: (round(p[0] * 100), round(p[1] * 100), round(p[2] * 100))
for f in range(0, n, 3):
    a, bb, c = P[f], P[f + 1], P[f + 2]
    e1 = [bb[i] - a[i] for i in range(3)]; e2 = [c[i] - a[i] for i in range(3)]
    fn = [e1[1] * e2[2] - e1[2] * e2[1], e1[2] * e2[0] - e1[0] * e2[2], e1[0] * e2[1] - e1[1] * e2[0]]
    for k in range(3):
        s = accn.setdefault(key(P[f + k]), [0.0, 0.0, 0.0])
        for i in range(3): s[i] += fn[i]
NRM = []
for p in P:
    s = accn[key(p)]; l = math.sqrt(sum(v * v for v in s)) or 1
    NRM.append([v / l for v in s])
# a new binary: every old view except the image's, then normals and colours
newBIN = bytearray(); remap = {}
views = []
for i, bv in enumerate(j['bufferViews']):
    if i == img['bufferView']: continue
    data = view(i)
    while len(newBIN) % 4: newBIN += b'\0'
    nb = dict(bv); nb['byteOffset'] = len(newBIN); newBIN += data
    remap[i] = len(views); views.append(nb)
def add(floats, typ):
    global newBIN
    while len(newBIN) % 4: newBIN += b'\0'
    off = len(newBIN); newBIN += struct.pack('<%df' % len(floats), *floats)
    views.append({'buffer': 0, 'byteOffset': off, 'byteLength': len(floats) * 4})
    j['accessors'].append({'bufferView': len(views) - 1, 'componentType': 5126, 'count': n, 'type': typ})
    return len(j['accessors']) - 1
for a in j['accessors']:
    if 'bufferView' in a: a['bufferView'] = remap[a['bufferView']]
for a in j.get('animations', []): pass
iN = add([v for p in NRM for v in p], 'VEC3'); iC = add([v for c in col for v in c], 'VEC3')
mins = [min(p[i] for p in NRM) for i in range(3)]
prim['attributes']['NORMAL'] = iN; prim['attributes']['COLOR_0'] = iC
del prim['attributes']['TEXCOORD_0']
j['bufferViews'] = views
for k in ('images', 'textures', 'samplers'): j.pop(k, None)
j['materials'] = [{'name': 'fox_baked', 'pbrMetallicRoughness': {'metallicFactor': 0, 'roughnessFactor': 0.9}}]
j['buffers'] = [{'byteLength': len(newBIN)}]
j['asset']['extras'] = {'baked': 'feat/tiere: texture baked into per-face colours (toned), smooth normals, texture removed'}
while len(newBIN) % 4: newBIN += b'\0'
js = json.dumps(j, separators=(',', ':')).encode()
while len(js) % 4: js += b' '
out = struct.pack('<III', 0x46546C67, 2, 12 + 8 + len(js) + 8 + len(newBIN)) + struct.pack('<II', len(js), 0x4E4F534A) + js + struct.pack('<II', len(newBIN), 0x004E4942) + newBIN
open(dst, 'wb').write(out)
mean = [sum(c[i] for c in col) / len(col) for i in range(3)]
print('baked', dst, len(out), 'bytes; mean colour', [round(v, 3) for v in mean])
