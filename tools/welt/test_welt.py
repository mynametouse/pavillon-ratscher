"""Quick tests of the world pipeline (seconds, no downloads): tiling, terrain encoding, road profile smoothing, carving, GLB.
  python3 -I tools/welt/test_welt.py"""
import json, os, struct, sys, tempfile
import numpy as np
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import wlib
from tiles import encode_heights, decode_heights
import roads
from glb import write_glb

fails = 0


def ck(name, cond, info=''):
    global fails
    print(('PASS ' if cond else 'FAIL ') + name, info, flush=True)
    fails += 0 if cond else 1


# tiling: level 12 = 100 m, the root centre is a corner of every level, areas round outwards
ck('tile size L12', wlib.tsize(12) == 100.0)
ck('root centre', wlib.tbounds(12, 2048, 2048)[:2] == (625500.0, 5595600.0))
ck('aligned', wlib.aligned(9, (623950, 5593250, 627850, 5597150)) == (623900.0, 5593200.0, 627900.0, 5597200.0))
x, y = wlib.model_from_utm(wlib.XF['ex'], wlib.XF['ey'])
ck('model origin', abs(x) < 1e-6 and abs(y) < 1e-6)

# terrain: lossless to 1 cm, small for smooth ground, int32 fallback for steep coarse tiles
rng = np.random.default_rng(3)
h = wlib.H0 + 40 + np.cumsum(np.cumsum(rng.normal(0, 0.01, (101, 101)), 0), 1) + rng.normal(0, 0.03, (101, 101))
b = encode_heights(h)
d = decode_heights(b)
ck('terrain roundtrip', np.max(np.abs(d - (np.round((h - wlib.H0) * 100) / 100))) < 1e-9, f'{len(b)} bytes')
h2 = wlib.H0 + np.linspace(0, 900, 101)[None, :] * np.ones((101, 1)) + rng.normal(0, 30, (101, 101))
d2 = decode_heights(encode_heights(h2))
ck('terrain int32 path', np.max(np.abs(d2 - (np.round((h2 - wlib.H0) * 100) / 100))) < 1e-9)
hdr = struct.unpack('<4sHHiff', b[:20])
ck('terrain header', hdr[0] == b'WTH1' and hdr[1] == 101)


# roads: a synthetic network – a main road over a hill with ditch-like noise, a side street joining it
class FakeDem:
    def __init__(self):
        self.e0, self.n1 = 0.0, 2000.0
        yy, xx = np.mgrid[0:2000, 0:2000]
        hill = 30 * np.exp(-((xx - 1000.0) ** 2) / (2 * 400.0 ** 2))
        ditch = -0.8 * ((np.abs(yy - 1000) > 4) & (np.abs(yy - 1000) < 7))   # ditches beside the main road
        self.mos = (300 + hill + 0.3 * np.sin(xx / 7.0) + ditch + rng.normal(0, 0.05, xx.shape)).astype(np.float32)

    def sample(self, E, N):
        from dem import bilinear
        return bilinear(self.mos, E, N, self.e0, self.n1, 1.0)


dem = FakeDem()
osm = {'nodes': {}, 'ways': {}, 'rels': {}}
from pyproj import Transformer
toLL = Transformer.from_crs('EPSG:25832', 'EPSG:4326', always_xy=True)
# coordinates: the fake DEM lives at E 0..2000, N 0..2000 – use a UTM offset that pyproj accepts, then shift the DEM accordingly
E0, N0 = 600000.0, 5590000.0
dem.e0, dem.n1 = E0, N0 + 2000


def node(i, E, N):
    lon, lat = toLL.transform(E0 + E, N0 + N)
    osm['nodes'][str(i)] = [lon, lat]


for k, E in enumerate(np.arange(100, 1901, 50)):
    node(k, E, 1000)
osm['ways']['1'] = [[str(k) for k in range(len(np.arange(100, 1901, 50)))], {'highway': 'secondary'}]
for k, N in enumerate(np.arange(1000, 1601, 50)):
    if k == 0:
        continue
    node(100 + k, 1000, N)
osm['ways']['2'] = [[str(18)] + [str(100 + k) for k in range(1, len(np.arange(1000, 1601, 50)))], {'highway': 'residential'}]
area = (E0, N0, E0 + 2000, N0 + 2000)
ways, nodeE = roads.load_ways(osm, area)
pos, chains = roads.network(ways, nodeE)
h, axis, data = roads.solve_profile(pos, chains, dem)
res = roads.metrics(pos, chains, h, axis)
ck('road metric before', res['main']['wellen_je_km_vorher'] > 20, json.dumps(res['main']))
ck('road metric after', res['main']['wellen_je_km'] < 2, json.dumps(res['main']))
jn = [i for i in range(len(pos)) if sum(int(i in set(ids)) for _, ids in chains) > 1]
ck('junction shared', len(jn) == 1)
# carving: terrain under the road at road level - UNDER, slopes 1:1.5 beside it
dem.mos = dem.mos.copy()
before = dem.mos.copy()
n, st = roads.carve(dem, pos, chains, h, (E0 + 200, N0 + 900, E0 + 1800, N0 + 1100))
r, c = 1000, 700   # on the main road axis (row = N1 - N - .5)
hc = float(np.interp(E0 + 700.5, pos[chains[0][1]][:, 0], h[chains[0][1]]))
ck('carve on axis', abs(dem.mos[999, 700] - (hc - roads.UNDER)) < 0.05, f'{dem.mos[999, 700]:.2f} vs {hc - roads.UNDER:.2f}; {st}')
ck('carve far away untouched', np.all(dem.mos[960:965, 700] == before[960:965, 700]))
groups = roads.ribbons(pos, chains, h, area)
with tempfile.TemporaryDirectory() as td:
    files = roads.write_ribbons(groups, td)
    fn = os.path.join(td, sorted(os.listdir(td))[0])
    raw = open(fn, 'rb').read()
    mg, ver, ln = struct.unpack('<III', raw[:12])
    jl, jt = struct.unpack('<II', raw[12:20])
    doc = json.loads(raw[20:20 + jl])
    ck('glb header', mg == 0x46546C67 and ver == 2 and ln == len(raw))
    acc = doc['accessors'][doc['meshes'][0]['primitives'][0]['attributes']['POSITION']]
    ck('glb positions', acc['count'] > 100 and len(acc['min']) == 3, f"{acc['count']} vertices in {len(files)} tiles")
print('test_welt:', 'ok' if not fails else f'{fails} FAILED')
sys.exit(1 if fails else 0)
