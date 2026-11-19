# House numbers of the map (feat/karte): the official house coordinates of Thuringia (INSPIRE addresses „TH Adressen Hauskoordinaten“,
# © GDI-Th, CC BY 4.0 – ATOM feed http://www.geoproxy.geoportal-th.de/inspire-dl/atom/DataSet/DataSet_5d023fec-02e0-4317-b415-4d3698e6d7fd.xml,
# file ad_25832.zip, 26 MB packed, a GML of 1.4 GB) cut to the map and packed for the browser:
#   karte/adr/index.json    { v, src, gem: [municipality names], s: [[street, gem index, x, y, n], …], cells: { "i_j": n } }
#   karte/adr/<i>_<j>.json  [[street index, "12a", x, y], …]   – cells of 2 km in model metres, loaded only near the observer or for a search
#   python3 -I tools/karte/adressen.py ad_25832.zip OUT_DIR [RAW]     RAW: masks.npz + grid.json of abdeckung.py (only what lies on the map)
# The GML is read as a stream with regular expressions (an XML parser takes far longer for 1.4 GB); an address without a number, a street or a
# position is skipped. The municipality is the 8-digit AdminUnitName (Gemeinde); parts of a municipality (Ortsteile) are not in the data –
# the app takes them from its gazetteer (karte/orte.json).
import json, os, re, sys, zipfile, math
from collections import defaultdict

ZIP, OUT = sys.argv[1], sys.argv[2]
RAW = sys.argv[3] if len(sys.argv) > 3 else None
REPO = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
XF = json.load(open(os.path.join(REPO, 'viz3', 'manifests.json')))['geoman']['xf']
a, b, ex, ey = XF['a'], XF['b'], XF['ex'], XF['ey']
S2 = a * a + b * b
def model(E, N):
    dE, dN = E - ex, N - ey
    return (a * dE + b * dN) / S2, (-b * dE + a * dN) / S2

onmap = None
if RAW:
    import numpy as np
    M = np.load(os.path.join(RAW, 'masks.npz'))
    G = json.load(open(os.path.join(RAW, 'grid.json')))
    K = M['karte']
    def onmap(E, N):
        c, r = int((E - G['E0']) / G['RES']), int((G['N1'] - N) / G['RES'])
        return 0 <= c < G['W'] and 0 <= r < G['H'] and bool(K[r, c])
BOX = (598000, 5575000, 652000, 5625000)   # without RAW: a box around the map (UTM)

RX_ADDR = re.compile(r'<ad:Address gml:id="[^"]*">(.*?)</ad:Address>', re.S)
RX_POS = re.compile(r'<gml:pos>([0-9.]+) ([0-9.]+)</gml:pos>')
RX_DES = re.compile(r'<ad:LocatorDesignator>\s*<ad:designator>([^<]*)</ad:designator>\s*<ad:type xlink:href="[^"]*/([A-Za-z]+)"', re.S)
RX_COMP = re.compile(r'<ad:component xlink:href="#(ThoroughfareName|AdminUnitName)_(\d+)"')
RX_NAMED = re.compile(r'<ad:(ThoroughfareName|AdminUnitName) gml:id="(?:ThoroughfareName|AdminUnitName)_(\d+)">(.*?)</ad:\1>', re.S)
RX_TEXT = re.compile(r'<gn:text>([^<]*)</gn:text>')

z = zipfile.ZipFile(ZIP)
name = [n for n in z.namelist() if n.endswith('.gml')][0]
f = z.open(name)
addrs = []          # (street id, gem id, number, E, N)
names = {}          # 'T<id>' / 'A<id>' → name
buf = ''
n_all = n_in = 0
while True:
    chunk = f.read(1 << 24)
    if not chunk:
        break
    buf += chunk.decode('utf-8', 'replace')
    cut = buf.rfind('</base:member>')
    if cut < 0:
        continue
    part, buf = buf[:cut], buf[cut:]
    for m in RX_ADDR.finditer(part):
        n_all += 1
        body = m.group(1)
        p = RX_POS.search(body)
        if not p:
            continue
        E, N = float(p.group(1)), float(p.group(2))
        if onmap:
            if not onmap(E, N):
                continue
        elif not (BOX[0] <= E <= BOX[2] and BOX[1] <= N <= BOX[3]):
            continue
        num = ''
        for d, t in RX_DES.findall(body):
            d = d.strip()
            if t == 'addressNumber':
                num = d + num
            elif t == 'addressNumberExtension':
                num = num + d
        comps = RX_COMP.findall(body)
        st = next((c for k, c in comps if k == 'ThoroughfareName'), None)
        gem = next((c for k, c in comps if k == 'AdminUnitName' and len(c) == 8), None)
        if not num or not st:
            continue
        n_in += 1
        addrs.append((st, gem, num, E, N))
    for m in RX_NAMED.finditer(part):
        t = RX_TEXT.search(m.group(3))
        if t:
            names[('T' if m.group(1) == 'ThoroughfareName' else 'A') + m.group(2)] = t.group(1).strip()
print('addresses', n_all, 'on the map', n_in, 'names', len(names), file=sys.stderr)

# streets: one entry per (street id) – name, municipality, centre, count
by_st = defaultdict(list)
for st, gem, num, E, N in addrs:
    by_st[st].append((gem, num, E, N))
gems, gem_ix = [], {}
streets, st_ix = [], {}
for st, L in sorted(by_st.items(), key=lambda kv: names.get('T' + kv[0], '')):
    nm = names.get('T' + st)
    if not nm:
        continue
    g = max(set(q[0] for q in L), key=lambda gg: sum(1 for q in L if q[0] == gg))
    gn = names.get('A' + str(g), '') if g else ''
    if gn not in gem_ix:
        gem_ix[gn] = len(gems)
        gems.append(gn)
    xs = [model(q[2], q[3]) for q in L]
    cx = sum(p[0] for p in xs) / len(xs)
    cy = sum(p[1] for p in xs) / len(xs)
    st_ix[st] = len(streets)
    streets.append([nm, gem_ix[gn], round(cx), round(cy), len(L)])
cells = defaultdict(list)
C = 2000
for st, gem, num, E, N in addrs:
    if st not in st_ix:
        continue
    x, y = model(E, N)
    cells['%d_%d' % (math.floor(x / C), math.floor(y / C))].append([st_ix[st], num, round(x, 1), round(y, 1)])
os.makedirs(os.path.join(OUT, 'adr'), exist_ok=True)
tot = 0
for k, L in cells.items():
    L.sort(key=lambda q: (q[0], q[1]))
    s = json.dumps(L, ensure_ascii=False, separators=(',', ':'))
    open(os.path.join(OUT, 'adr', k + '.json'), 'w').write(s)
    tot += len(s)
idx = {
    'v': 1, 'made': '2026-11-19', 'cell': C,
    'src': 'Hauskoordinaten Thüringen (INSPIRE Adressen, Stand 2025 Q1) © GDI-Th, CC BY 4.0',
    'gem': gems, 's': streets, 'cells': {k: len(v) for k, v in sorted(cells.items())},
}
s = json.dumps(idx, ensure_ascii=False, separators=(',', ':'))
open(os.path.join(OUT, 'adr', 'index.json'), 'w').write(s)
print('streets', len(streets), 'municipalities', len(gems), 'cells', len(cells), 'bytes cells', tot, 'index', len(s), file=sys.stderr)
