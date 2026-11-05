"""Shared helpers of feat/welt-gebaeude: the model frame, the existing buildings of the app (to find the missing ones), small geometry.

Model metres (x east, y north) <-> UTM 32N (EPSG:25832): E = ex + a x - b y, N = ey + b x + a y (viz3/manifests.json geoman.xf).
"""
import base64, json, math, os

HERE = os.path.dirname(os.path.abspath(__file__))
REPO = os.path.dirname(os.path.dirname(HERE))
VIZ = os.path.join(REPO, 'viz3')
MAN = json.load(open(os.path.join(VIZ, 'manifests.json')))
GEOMAN = MAN['geoman']
XF = GEOMAN['xf']
A, B, EX, EY = XF['a'], XF['b'], XF['ex'], XF['ey']
S2 = A * A + B * B


def to_utm(x, y):
    return EX + A * x - B * y, EY + B * x + A * y


def to_model(E, N):
    dx, dy = E - EX, N - EY
    return (A * dx + B * dy) / S2, (-B * dx + A * dy) / S2


def dist_file(rel):
    """a file of the built app: the feature extras first (they override dist/), then viz3/dist"""
    import glob
    for fx in sorted(glob.glob(os.path.join(VIZ, 'extra', '*', 'dist', rel))):
        return fx
    return os.path.join(VIZ, 'dist', rel)


def ratscher_osm():
    """the 337 OSM buildings of world/ratscher.js: {id: {'ring': [(x, y), ...], 'typ': 0|1|2, 'foot': z, 'top': max wall top}}"""
    import numpy as np
    b = GEOMAN['bld']
    raw = base64.b64decode(json.load(open(dist_file('geo/' + b['file'])))['b64'])
    nw = b['walls']
    wp = np.frombuffer(raw, dtype='<i2', count=nw * 3, offset=0).reshape(-1, 3)
    wt = np.frombuffer(raw, dtype='<i2', count=nw * 4, offset=nw * 6).reshape(-1, 4)
    out = {}
    for s in range(0, nw, 4):
        code = int(wt[s, 3])
        bid, typ = code >> 2, code & 3
        ax, ay = wp[s, 0] / 10, wp[s, 1] / 10
        foot = wp[s, 2] / 100 - wt[s, 1] / 100
        o = out.setdefault(bid, {'ring': [], 'typ': typ, 'foot': foot, 'top': 0})
        if not o['ring'] or math.hypot(o['ring'][-1][0] - ax, o['ring'][-1][1] - ay) > 0.01:
            o['ring'].append((ax, ay))
        o['top'] = max(o['top'], wt[s, 2] / 100, wt[s + 2, 2] / 100)
        o['foot'] = min(o['foot'], foot)
    return out


def load_ethos(path):
    for ln in open(path):
        yield json.loads(ln)
