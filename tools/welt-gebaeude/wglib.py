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


# ---- what the hand-modelled places build themselves (also for other features: welt-dinge keeps its cars out of it) ----
def keepout(where):
    """what the hand-modelled places build themselves besides their OSM houses: no ETHOS building may touch it (model metres; a list of
    (shapely geometry, name)). 'zonen': Kloster Veßra (welt/vessra.js, vessra/ort.json) – the church ruin with its towers and portal
    (8 m round), the monastery precinct, i.e. the museum's area (15 m round), the tree nursery Baumschule Kammbach (8 m), its other areas
    (ponds, cemetery, gardens, parking: 2 m), walls (1.5 m), gates (3 m), fences and hedges (0.5 m); Schleusingen (welt/schleusingen.js,
    schleusingen/stadt.json) – the Bertholdsburg with its terraces and round towers (20 m), the Rathaus, St. Johannis and the Heckenturm
    (8 m), the Markt (3 m), fountains (4 m), benches (1.5 m), lamps (0.6 m). 'ratscher': the centre as Falko filmed it
    (world/dorfkern_data.js, its open space: the well, the bus shelter, the white box, benches, bins, limes, poles, lamps …)"""
    from shapely.geometry import Polygon, LineString, Point
    P = lambda f, m: Polygon(list(zip(f[0::2], f[1::2]))).buffer(0).buffer(m)
    L = lambda f, m: LineString(list(zip(f[0::2], f[1::2]))).buffer(m)
    out = []
    if where == 'zonen':
        try:
            v = json.load(open(dist_file('vessra/ort.json')))
            K = v.get('kirche') or {}
            if K.get('area'):
                out.append((P(K['area'], 8.0), 'Veßra: Klosterkirche (Ruine)'))
            for t in K.get('towers') or []:
                out.append((P(t, 8.0), 'Veßra: Türme der Klosterkirche'))
            if K.get('portal'):
                out.append((Point(*K['portal']).buffer(8.0), 'Veßra: Westportal'))
            for a_ in v.get('areas', []):
                m = {'museum': 15.0, 'nursery': 8.0}.get(a_['k'], 2.0)
                if len(a_['p']) >= 6:
                    out.append((P(a_['p'], m), 'Veßra: %s %s' % (a_['k'], a_.get('n') or '')))
            for w in v.get('walls', []):
                out.append((L(w['p'], 1.5), 'Veßra: Klostermauer'))
            for g in v.get('gates', []):
                out.append((Point(g[0], g[1]).buffer(3.0), 'Veßra: Tor'))
            for w in v.get('fences', []) + v.get('hedges', []):
                if len(w['p']) >= 4:
                    out.append((L(w['p'], 0.5), 'Veßra: Zaun/Hecke'))
        except Exception as e:
            print('no keep-out of Veßra', e, flush=True)
        try:
            s = json.load(open(dist_file('schleusingen/stadt.json')))
            for b in s['b']:
                m = {'burg': 20.0, 'rathaus': 8.0, 'kirche': 8.0, 'turm': 6.0}.get(b.get('lm'))
                if m:
                    out.append((P(b['f'], m), 'Schleusingen: ' + b['lm']))
            if len(s.get('marktplatz') or []) >= 6:
                out.append((P(s['marktplatz'], 3.0), 'Schleusingen: Markt'))
            for q in s.get('fountains', []):
                out.append((Point(q[0], q[1]).buffer(4.0), 'Schleusingen: Brunnen'))
            for q in s.get('benches', []):
                out.append((Point(q[0], q[1]).buffer(1.5), 'Schleusingen: Bank'))
            for q in s.get('lamps', []):
                out.append((Point(q[0], q[1]).buffer(0.6), 'Schleusingen: Laterne'))
        except Exception as e:
            print('no keep-out of Schleusingen', e, flush=True)
    elif where == 'ratscher':
        import subprocess
        try:
            js = os.path.join(VIZ, 'src', 'world', 'dorfkern_data.js')
            o = json.loads(subprocess.run(['node', '--no-warnings', '--input-type=module', '-e',
                                           "globalThis.window = {}; const m = await import(%s); console.log(JSON.stringify(m.DKDATA.open))"
                                           % json.dumps('file://' + js)], capture_output=True, text=True, check=True).stdout)
            pt = lambda q, m, n: out.append((Point(q[0], q[1]).buffer(m), 'Dorfkern: ' + n))
            if o.get('well'):
                pt(o['well']['c'], max(o['well'].get('size') or [4.0]) / 2 + 0.5, 'Brunnen')
            if o.get('shelter'):
                pt(o['shelter']['c'], 2.5, 'Wartehäuschen')
            wb = o.get('whitebox')
            if wb:
                x, y, az, l_, d_ = wb[:5]
                ux, uy = math.sin(math.radians(az)), math.cos(math.radians(az))
                out.append((Polygon([(x + ux * s_ * l_ / 2 - uy * t_ * d_ / 2, y + uy * s_ * l_ / 2 + ux * t_ * d_ / 2)
                                     for s_, t_ in ((-1, -1), (1, -1), (1, 1), (-1, 1))]).buffer(0.5), 'Dorfkern: weißer Kasten'))
            for k_, m in (('benches', 1.2), ('bins', 0.6), ('poles', 0.6), ('lamps', 0.6), ('roundabout', 1.5), ('logs', 2.5)):
                for q in o.get(k_) or []:
                    pt(q, m, k_)
            for q in o.get('limes') or []:
                pt(q['at'], 1.0, 'Linde')
            for k_ in ('linde', 'vending', 'signpost', 'planter'):
                if o.get(k_):
                    pt(o[k_], 1.2, k_)
            for k_ in ('hedges', 'fences'):
                for q in o.get(k_) or []:
                    out.append((LineString(q['p']).buffer(0.6), 'Dorfkern: ' + k_))
            for q in o.get('paving') or []:
                out.append((Polygon(q['p']).buffer(0.3), 'Dorfkern: Pflaster'))
        except Exception as e:
            print('no keep-out of the Dorfkern', e, flush=True)
    return out


def kept_out(g, ko, tree):
    """the name of the first keep-out area footprint g touches, or None"""
    for i in tree.query(g):
        if g.intersects(ko[i][0]):
            return ko[i][1]
    return None
