# feat/stadtgruen: Schleusingen's street trees and green (stadtgruen/stadtgruen.js, data stadtgruen/baeume.json from tools/stadtgruen/build.py).
# Without a browser: every tree inside the town's zone, none in a building, on a carriageway or a footway as the app draws them, in a
# parking bay or on a shop's pad; the avenues of Hildburghäuser Straße on both sides with their spacing; counts per species and street.
# In the browser: nothing at the start; Orte → Schleusingen: the town, then the trees (none left in a building or a bay of the town as
# it stands, every program shared with the garden's trees – no new shader programs), draw calls and triangles at the Markt and in
# Hildburghäuser Straße within the budget, summer green / October colours / bare in January (the crowns' instance colours), a trunk
# stops the walker, pictures from the viewpoints of viz3/extra/stadtgruen/blick.json (the model only); freed when the town goes.
# With the phone flag (iPhone profile, coarse pointer): the phone's budget of triangles. Ratscher (stadtgruen/ratscher.json): the belts
# on the banks of the L 1625 south of the village – none round the garden, none within 4 m of a world tree, none on a road; built
# when one comes near the road (not at the start in the garden), freed back in the garden. Pictures in out/stadtgruen/.
#   python3 viz3/test/stadtgruen.py 9051 [sections]      sections: data,stadt,bilder,telefon,ratscher (default all)
import sys, os, json, time, math, urllib.request, concurrent.futures
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__))); import lib
port = sys.argv[1] if len(sys.argv) > 1 else '8951'
want = set((sys.argv[2] if len(sys.argv) > 2 else 'data,stadt,bilder,telefon,ratscher').split(','))
ck = lib.Checks('stadtgruen')
OUT = lib.out('stadtgruen')
EXTRA = os.path.join(lib.ROOT, 'viz3', 'extra')
DATA = json.load(open(os.path.join(EXTRA, 'stadtgruen', 'dist', 'stadtgruen', 'baeume.json')))
RAT = json.load(open(os.path.join(EXTRA, 'stadtgruen', 'dist', 'stadtgruen', 'ratscher.json')))
STADT = json.load(open(os.path.join(EXTRA, 'schleusingen', 'dist', 'schleusingen', 'stadt.json')))
LAEDEN = json.load(open(os.path.join(EXTRA, 'laeden', 'dist', 'laeden', 'laeden.json')))
PLAETZE = json.load(open(os.path.join(EXTRA, 'welt-dinge', 'plaetze_schleusingen.json')))
BLICK = json.load(open(os.path.join(EXTRA, 'stadtgruen', 'blick.json')))
SITE = os.environ.get('WELT_SITE', 'https://mynametouse.github.io/pavillon-ratscher/welt-test/')
DIST = os.path.join(lib.ROOT, 'viz3', 'dist', 'welt-test')
XF = json.load(open(os.path.join(lib.ROOT, 'viz3', 'manifests.json')))['geoman']['xf']
ARTEN = DATA['arten']
HECKE = ARTEN.index('hecke')
# the drawn half width of the town's street classes (welt/schleusingen.js streetMap: 8, 7, 5.6, 3.6, 2.2 m)
HALF_W = {1: 4.0, 2: 3.5, 3: 2.8, 5: 1.8, 8: 1.1}
# the budget of the trees in view (docs/features/stadtgruen.md)
TRIS_PC, TRIS_PHONE, CALLS = 150000, 60000, 60
COUNT = """(() => {
  const R = GAME.R, I = { M: [0, 0], S: [0, 0], G: [0, 0], GS: [0, 0] }, rbd = R.renderBufferDirect;
  R.renderBufferDirect = function (camera, scene, geometry, material, object, group) {
    const n = geometry.index ? geometry.index.count : geometry.attributes.position ? geometry.attributes.position.count : 0,
      t = Math.round((group ? group.count : n) / 3) * (object.isInstancedMesh ? object.count : 1), sg = /^stadtgruen/.test(object.name || '');
    const r = I[scene ? 'M' : 'S']; r[0]++; r[1] += t;
    if (sg) { const g = I[scene ? 'G' : 'GS']; g[0]++; g[1] += t; }
    return rbd.call(this, camera, scene, geometry, material, object, group);
  };
  try { R.shadowMap.needsUpdate = true; GAME.film(0, true); } finally { R.renderBufferDirect = rbd; }
  return { calls: I.M[0], tris: I.M[1], shCalls: I.S[0], shTris: I.S[1], sgCalls: I.G[0], sgTris: I.G[1], sgShCalls: I.GS[0], sgShTris: I.GS[1],
           levels: STADTGRUEN.status().levels };
})()"""
# every program a mesh of the trees uses is one other meshes (the garden's, Ratscher's trees – also through a shared material) use too:
# no new shader program
PROGRAMS = """(() => { const R = GAME.R, own = new Set(), mats = new Map();
  for (const m of STADTGRUEN.meshes) mats.set(m.material, m.name);
  const progOf = mat => { const p = R.properties.get(mat); return p && p.currentProgram ? p.currentProgram : null; };
  const used = new Map();
  for (const [mat, name] of mats) { const p = progOf(mat); if (p) { own.add(p); used.set(p, name); } }
  const shared = new Set(); let others = 0;
  GAME.scene ? 0 : 0;
  const scn = STADTGRUEN.meshes[0] && STADTGRUEN.meshes[0].parent;
  if (scn) scn.traverse(o => { if (!o.isMesh || /^stadtgruen/.test(o.name || '')) return; const p = progOf(o.material); if (p && own.has(p)) shared.add(p); others++; });
  return { own: own.size, shared: shared.size, alone: [...own].filter(p => !shared.has(p)).map(p => used.get(p) + ' ' + p.name), others }; })()"""


def utm(x, y):
    return XF['a'] * x - XF['b'] * y + XF['ex'], XF['b'] * x + XF['a'] * y + XF['ey']


def fetch_tiles(centres, half=420):
    """the world tiles around the places (levels 10-12) into dist/welt-test/ (as viz3/test/laeden.py)"""
    os.makedirs(DIST, exist_ok=True)

    def get(rel):
        p = os.path.join(DIST, rel)
        if os.path.exists(p) and os.path.getsize(p) > 0:
            return 0
        os.makedirs(os.path.dirname(p), exist_ok=True)
        try:
            with urllib.request.urlopen(SITE + rel, timeout=60) as r:
                b = r.read()
        except Exception:
            return 0
        open(p, 'wb').write(b)
        return len(b)
    get('meta.json')
    try:
        meta = json.load(open(os.path.join(DIST, 'meta.json')))
    except Exception as e:
        print('note: no world tiles', e, flush=True)
        return
    lv = meta['tiling']['levels']
    jobs = set()
    for cx, cy in centres:
        cs = [utm(cx + sx * half, cy + sy * half) for sx in (-1, 1) for sy in (-1, 1)]
        for L, pad in ((10, 900), (11, 450), (12, 150)):
            s = 409600 / (1 << L)
            r = lv[str(L)]['rect']
            E0, E1 = min(c[0] for c in cs) - pad, max(c[0] for c in cs) + pad
            N0, N1 = min(c[1] for c in cs) - pad, max(c[1] for c in cs) + pad
            for x in range(int((E0 - 420700) // s), int((E1 - 420700) // s) + 1):
                for y in range(int((N0 - 5390800) // s), int((N1 - 5390800) // s) + 1):
                    if r[0] <= x <= r[2] and r[1] <= y <= r[3]:
                        jobs.add(f't/{L}/{x}/{y}.bin')
                        jobs.add(f'i/{L}/{x}/{y}.webp')
    get('v2/index.json')
    try:
        v2 = set(json.load(open(os.path.join(DIST, 'v2', 'index.json')))['tiles'])
    except Exception:
        v2 = set()
    for j in list(jobs):
        if j.startswith('i/') and j[2:-5] in v2:
            jobs.add('v2/' + j)
    t0 = time.time()
    with concurrent.futures.ThreadPoolExecutor(8) as ex:
        n = sum(ex.map(get, sorted(jobs)))
    print(f'welt tiles: {len(jobs)} files, {n / 1e6:.1f} MB new in {time.time() - t0:.0f} s', flush=True)


def ring(f):
    return [(f[i], f[i + 1]) for i in range(0, len(f), 2)]


def inside(r, x, y):
    c = False
    for i in range(len(r)):
        (xi, yi), (xj, yj) = r[i], r[i - 1]
        if (yi > y) != (yj > y) and x < (xj - xi) * (y - yi) / (yj - yi) + xi:
            c = not c
    return c


def seg_dist(px, py, a, b):
    dx, dy = b[0] - a[0], b[1] - a[1]
    l2 = dx * dx + dy * dy or 1
    t = max(0, min(1, ((px - a[0]) * dx + (py - a[1]) * dy) / l2))
    return math.hypot(px - a[0] - dx * t, py - a[1] - dy * t)


def edge_dist(r, x, y):
    return min(seg_dist(x, y, r[i - 1], r[i]) for i in range(len(r)))


def trees():
    b = DATA['b']
    return [(b[i] / 10, b[i + 1] / 10, b[i + 2], b[i + 3] / 10, b[i + 4] / 10, b[i + 5]) for i in range(0, len(b), 6)]


def along(name, side, T):
    """the trees of a row: within 8 m of the street's polyline on one side (l/r of its direction)"""
    out = []
    for s in STADT['st']:
        if s.get('n') != name:
            continue
        p = ring(s['p'])
        for t in T:
            for i in range(len(p) - 1):
                a, b = p[i], p[i + 1]
                if seg_dist(t[0], t[1], a, b) < 8:
                    cr = (b[0] - a[0]) * (t[1] - a[1]) - (b[1] - a[1]) * (t[0] - a[0])
                    if (cr > 0) == (side == 'l') and t not in out and t[5] & 1:
                        out.append(t)
                    break
    return out


# ---------------------------------------------------------------- without a browser ------------------------------------------------
if 'data' in want:
    T = trees()
    Z = DATA['zone']
    ck('the data names its sources (DOP © GDI-Th, OpenStreetMap ODbL) and calls the views private', 'GDI-Th' in DATA['src'] and 'ODbL' in DATA['src']
       and 'privaten Ansichten von der Straße' in DATA['src'] and 'oogle' not in json.dumps(DATA), DATA['src'][:100])
    out = [t for t in T if not (Z[0] <= t[0] <= Z[2] and Z[1] <= t[1] <= Z[3])]
    ck('every tree inside the town\'s zone (stadt.json)', len(T) > 1000 and not out, f'{len(T)} trees and bushes, {len(out)} outside')
    by = {}
    for t in T:
        by[ARTEN[t[2]]] = by.get(ARTEN[t[2]], 0) + 1
    ck('every species there (lime, maple, chestnut, birch, ash, conifer, fruit tree, hedge)', all(by.get(a, 0) > 0 for a in ARTEN if a != 'eiche'), json.dumps(by))
    # no tree in a building of the town (the trunk 0.3 m clear of the walls), none on a carriageway or footway as drawn
    B = [ring(b['f']) for b in STADT['b']]
    BB = [(min(p[0] for p in r), min(p[1] for p in r), max(p[0] for p in r), max(p[1] for p in r)) for r in B]
    bad_b = []
    for t in T:
        m = 0.05 if t[2] == HECKE else 0.3
        for r, bb in zip(B, BB):
            if bb[0] - 2 <= t[0] <= bb[2] + 2 and bb[1] - 2 <= t[1] <= bb[3] + 2 and (inside(r, t[0], t[1]) or edge_dist(r, t[0], t[1]) < m):
                bad_b.append((round(t[0], 1), round(t[1], 1), ARTEN[t[2]]))
                break
    ck('no tree in a house of the town (trunks 0.3 m clear of the walls)', not bad_b, f'{len(bad_b)}: {bad_b[:5]}')
    bad_r = []
    for s in STADT['st']:
        hw = HALF_W.get(s['k'])
        if hw is None:
            continue
        p = ring(s['p'])
        for t in T:
            m = 0.05 if t[2] == HECKE else 0.25
            if any(seg_dist(t[0], t[1], p[i], p[i + 1]) < hw + m for i in range(len(p) - 1)):
                bad_r.append((round(t[0], 1), round(t[1], 1), s.get('n', ''), s['k']))
    ck('no tree on a carriageway or a footway as the town draws them (centre line and width)', not bad_r, f'{len(bad_r)}: {bad_r[:5]}')
    bays = [tuple(q) for L in LAEDEN['lots'] for q in L['bays']] + [(p['x'], p['y'], p.get('az', 0)) for p in PLAETZE['plaetze']]
    bad_p = []
    for t in T:
        for bx, by_, az in bays:
            dx, dy = t[0] - bx, t[1] - by_
            if dx * dx + dy * dy > 16:
                continue
            a = math.radians(az or 0)
            if abs(dx * math.sin(a) + dy * math.cos(a)) < 2.5 and abs(dx * math.cos(a) - dy * math.sin(a)) < 1.25:
                bad_p.append((round(t[0], 1), round(t[1], 1)))
                break
    pads = [ring(p['f']) for sh in LAEDEN['shops'] for p in sh['parts'] + sh['annex']] + [ring(L['f']) for L in LAEDEN['lots']]
    bad_s = [(round(t[0], 1), round(t[1], 1)) for t in T if any(inside(r, t[0], t[1]) for r in pads)]
    ck('no tree in a parking bay (shops\' car parks, the town\'s parking places)', not bad_p, f'{len(bays)} bays; {bad_p[:5]}')
    ck('no tree on a shop\'s building or car park', not bad_s, str(bad_s[:5]))
    # the avenues of Hildburghäuser Straße: both sides, limes, the spacing of a row 8–12 m
    for side in ('l', 'r'):
        R_ = along('Hildburghäuser Straße', side, T)
        gaps = []
        for t in R_:
            d = min((math.dist(t[:2], q[:2]) for q in R_ if q is not t), default=0)
            gaps.append(d)
        gaps.sort()
        med = gaps[len(gaps) // 2] if gaps else 0
        ck(f'Hildburghäuser Straße, {"north-west" if side == "l" else "south-east"} side: an avenue of limes, 8–12 m apart',
           len(R_) >= 4 and all(ARTEN[t[2]] == 'linde' for t in R_) and 8 <= med <= 12, f'{len(R_)} trees, median spacing {med:.1f} m')
    near = {}
    for name in ('Hildburghäuser Straße', 'Suhler Straße', 'Ilmenauer Straße', 'Königstraße'):
        P = [ring(s['p']) for s in STADT['st'] if s.get('n') == name]
        near[name] = sum(1 for t in T if t[2] != HECKE and any(seg_dist(t[0], t[1], p[i], p[i + 1]) < 15 for p in P for i in range(len(p) - 1)))
    ck('trees along the three roads and Königstraße (within 15 m of the street)', all(v >= 10 for v in near.values()), json.dumps(near, ensure_ascii=False))
    ck('the rows the data names', len(DATA.get('reihen', [])) >= 2, json.dumps(DATA.get('reihen', []), ensure_ascii=False)[:300])

if 'data' in want or 'ratscher' in want:
    import base64
    b = RAT['b']
    RT = [(b[i] / 10, b[i + 1] / 10, b[i + 2], b[i + 3] / 10, b[i + 4] / 10, b[i + 5]) for i in range(0, len(b), 6)]
    ck('Ratscher: the data names its sources and calls the views private', 'GDI-Th' in RAT['src'] and 'ODbL' in RAT['src']
       and 'privaten Ansichten von der Straße' in RAT['src'], RAT['src'][:100])
    ck('Ratscher: nothing round Falko\'s garden and the two neighbours\' plots (150 m)', len(RT) > 50 and all(math.hypot(t[0], t[1]) > 150 for t in RT),
       f'{len(RT)} trees, nearest {min(math.hypot(t[0], t[1]) for t in RT):.0f} m from the garden')
    w = base64.b64decode(json.load(open(os.path.join(lib.ROOT, 'viz3', 'dist', 'geo', 'trees.b64.json')))['b64'])
    import array
    a_ = array.array('h'); a_.frombytes(w)
    cells = {}
    for i in range(0, len(a_), 5):
        x, y = a_[i] / 10, a_[i + 1] / 10
        cells.setdefault((int(x // 8), int(y // 8)), []).append((x, y))
    dup = []
    for t in RT:
        i, j = int(t[0] // 8), int(t[1] // 8)
        lim = 2 if t[2] == HECKE else 4  # a bush 2 m
        if any(math.hypot(q[0] - t[0], q[1] - t[1]) < lim for di in (-1, 0, 1) for dj in (-1, 0, 1) for q in cells.get((i + di, j + dj), ())):
            dup.append((round(t[0], 1), round(t[1], 1)))
    ck('Ratscher: no tree within 4 m of one of the world\'s trees (a bush 2 m; no duplicate)', not dup, f'{len(a_) // 5} world trees; {dup[:5]}')
    Zr = RAT['zone']
    ck('Ratscher: every tree inside its zone (the road south of the village)', all(Zr[0] <= t[0] <= Zr[2] and Zr[1] <= t[1] <= Zr[3] for t in RT)
       and Zr[1] < -400, json.dumps(Zr))

# ---------------------------------------------------------------- in the browser -----------------------------------------------------
MARKT = (-1084.7, 1241.9)
if want & {'stadt', 'bilder', 'telefon'}:
    fetch_tiles([MARKT, (-1600, 980), (-1200, 1400), (-650, 1450)])


def go_town(pg, errs):
    E = pg.evaluate
    J = lambda js: json.loads(E("JSON.stringify(" + js + ")"))
    E("document.querySelectorAll('#toast').forEach(e => e.style.visibility = 'hidden')")
    E("CLOCK.t = Math.floor(CLOCK.t / 1440) * 1440 + 11 * 60; DN.update(true)")
    lib.settle_light(pg)
    st0 = J("STADTGRUEN.status()")
    E("document.querySelector('#menu [data-spot=schleusingen]').click()")
    t0 = time.time()
    while time.time() - t0 < 300:
        E("GAME.step(0.25)")
        st = J("[SCHL.status().state, STADTGRUEN.status().state]")
        if st[0] in ('ready', 'error') and st[1] in ('ready', 'error'):
            break
        time.sleep(0.3)
    return st0, round(time.time() - t0)


def look(pg, x, y, yaw, h=1.7, pitch=4, fov=62):
    E = pg.evaluate
    E(f"GAME.setView3(false, true); GAME.view({x}, {y}, KERN.ground({x}, {y}) + {h}, {yaw}, {pitch}, {fov})")
    for i in range(16):
        E("GAME.step(0.25)")
        if E("WELT.state().loading") == 0 and i > 3:
            break
        time.sleep(0.3)
    E(f"GAME.view({x}, {y}, KERN.ground({x}, {y}) + {h}, {yaw}, {pitch}, {fov})")
    E("GAME.step(0.05)")


if want & {'stadt', 'bilder'}:
    with lib.browser() as b:
        errs = []
        pg = lib.page(b, 1920, 1080, errs, tier='hoch')
        lib.boot(pg, port)
        E = pg.evaluate
        J = lambda js: json.loads(E("JSON.stringify(" + js + ")"))
        st0, secs = go_town(pg, errs)
        ck('nothing built at the start (the town is 1.9 km away, the road south of Ratscher 500 m)',
           st0['on'] and st0['area'] is None and st0['state'] == 'idle' and st0['meshes'] == 0, json.dumps(st0))
        st = J("STADTGRUEN.status()")
        ck('with the town the trees stand', st['state'] == 'ready' and st['shown'] > 1000, f'{json.dumps(st)} after {secs} s')
        if 'stadt' in want:
            # the town as it stands: no tree in one of its houses, before a door, in a bay or on a pad (the module's own check), the Markt kept
            live = J("""(() => { const T = STADTGRUEN.live, out = []; const inP = STADTGRUEN.G.inPoly;
              for (const b of SCHL.bld) { if (!b.f) continue; for (const t of T) if (Math.abs(t.x - b.cx) < 40 && Math.abs(t.y - b.cy) < 40 && inP(b.f, t.x, t.y)) out.push([t.x, t.y]); }
              return { n: T.length, inHouse: out.slice(0, 5), nIn: out.length }; })()""")
            ck('no tree inside a house of the town as it stands', live['nIn'] == 0, json.dumps(live))
            ck('the module left out what the town has there now (doors, lamps, the Markt and its trees)', isinstance(st['off'], dict), json.dumps(st['off'], ensure_ascii=False))
            # the programs
            look(pg, -1640, 958, 56)
            E("STADTGRUEN.setDoy(292)")
            E("GAME.step(0.1)")
            E("GAME.shot()")
            pr = J(PROGRAMS)
            ck('no new shader programs: every program of the trees is one the garden\'s or Ratscher\'s trees use', pr['own'] > 0 and not pr['alone'], json.dumps(pr))
            # draw calls and triangles at the Markt and in Hildburghäuser Straße
            for name, (x, y, yaw) in {'Markt': (-1100.5, 1214.5, 30), 'Hildburghäuser Straße': (-1640, 958, 56), 'Suhler Straße (Lidl)': (-1131.4, 1509.5, 330)}.items():
                look(pg, x, y, yaw)
                c = J(COUNT)
                ck(f'{name}: the trees within the budget (≤ {CALLS} draw calls, ≤ {TRIS_PC // 1000} k triangles)', c['sgCalls'] <= CALLS and c['sgTris'] <= TRIS_PC,
                   json.dumps(c))
            # the seasons: green in July, coloured in October, bare in January (the crowns' instance colours, the crowns drawn)
            look(pg, -1640, 958, 56)
            COL = """(() => { const out = { n: 0, r: 0, g: 0, b: 0, crowns: 0 }; for (const m of STADTGRUEN.meshes) { if (!/linde krone/.test(m.name)) continue;
              out.crowns += m.visible ? m.count : 0; if (!m.instanceColor || !m.visible) continue; const a = m.instanceColor.array;
              for (let i = 0; i < m.count; i++) { out.r += a[i * 3]; out.g += a[i * 3 + 1]; out.b += a[i * 3 + 2]; out.n++; } }
              if (out.n) { out.r /= out.n; out.g /= out.n; out.b /= out.n; } return out; })()"""
            res = {}
            for nm, d in (('Juli', 200), ('Oktober', 292), ('Januar', 15)):
                E(f"STADTGRUEN.setDoy({d})")
                E("GAME.step(0.1)")
                res[nm] = J(COL)
                lib.shot(pg, OUT, f'jahreszeit_{nm.lower()}')
            ju, ok_, ja = res['Juli'], res['Oktober'], res['Januar']
            ck('July: the limes green (their own colour)', ju['crowns'] > 0 and abs(ju['r'] - ju['g']) < 0.05, json.dumps(ju))
            ck('October: the limes golden (red over green in the crowns\' colour, blue down)', ok_['crowns'] > 0 and ok_['r'] > ok_['g'] * 1.3 and ok_['b'] < ju['b'],
               json.dumps(ok_))
            ck('January: the limes bare (no crown drawn)', ja['crowns'] == 0, json.dumps(ja))
            E("STADTGRUEN.setDoy(null)")
            # a trunk stops the walker
            t = J("(() => { const t = STADTGRUEN.live.filter(t => t.tr > 0.15 && t.art === STADTGRUEN.G.BY_ID.linde)[0]; return t ? [t.x, t.y, t.tr] : null; })()")
            if t:
                x, y, tr = t
                p = J(f"(() => {{ const p = [{x} + 0.05, {y}]; const moved = KERN.pushOut(p, 0.3); return [moved, Math.hypot(p[0] - {x}, p[1] - {y})]; }})()")
                ck('a trunk stops the walker (KERN.pushOut moves a point out of it)', p[0] is True and p[1] >= tr + 0.29, json.dumps(p))
                E(f"GAME.setView3(false, true); GAME.view({x} - 3, {y}, KERN.ground({x} - 3, {y}) + 1.7, 90, 0)")
                E("GAME.step(3, 1)")
                d = J(f"Math.hypot(GAME.P.x - {x}, GAME.P.y - {y})")
                ck('walking into a tree: the walker stays outside its trunk', d >= tr + 0.2, f'{d:.2f} m from the trunk\'s centre (trunk {tr:.2f} m)')
        if 'bilder' in want:
            for v in BLICK:
                look(pg, v['x'], v['y'], v['yaw'], v.get('h', 1.7), v.get('pitch', 4))
                if v.get('doy') is not None:
                    E(f"STADTGRUEN.setDoy({v['doy']})")
                    E("GAME.step(0.05)")
                lib.shot(pg, OUT, 'blick_' + v['id'])
            E("STADTGRUEN.setDoy(null)")
        # freed when the town goes
        E("GAME.go('garten')")
        for i in range(40):
            E("GAME.step(0.5)")
            if J("STADTGRUEN.status().state") == 'idle' and J("SCHL.status().state") == 'idle':
                break
        st2 = J("STADTGRUEN.status()")
        ck('freed when the town goes (back in the garden)', st2['state'] == 'idle' and st2['meshes'] == 0 and st2['freed'] >= 1, json.dumps(st2))
        ck.errors(errs)

if 'telefon' in want:
    with lib.browser() as b:
        from playwright.sync_api import sync_playwright  # noqa: F401 (the device profiles come with the browser's playwright)
        errs = []
        pg = b.new_page(viewport={'width': 844, 'height': 390}, device_scale_factor=3, is_mobile=True, has_touch=True,
                        user_agent='Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1')
        lib.preset(pg, 'mittel')
        pg.on('pageerror', lambda e: errs.append('PAGEERR ' + str(e)))
        lib.boot(pg, port)
        E = pg.evaluate
        J = lambda js: json.loads(E("JSON.stringify(" + js + ")"))
        ck('the phone flag (coarse pointer)', E("matchMedia('(pointer:coarse)').matches"))
        go_town(pg, errs)
        st = J("STADTGRUEN.status()")
        for name, (x, y, yaw) in {'Markt': (-1100.5, 1214.5, 30), 'Hildburghäuser Straße': (-1640, 958, 56)}.items():
            look(pg, x, y, yaw)
            c = J(COUNT)
            ck(f'phone, {name}: ≤ {TRIS_PHONE // 1000} k triangles of trees', st['state'] == 'ready' and c['sgTris'] <= TRIS_PHONE, json.dumps(c))
        lib.shot(pg, OUT, 'telefon_hildburghaeuser')
        ck.errors(errs)

# ---------------------------------------------------------------- Ratscher ---------------------------------------------------------
RAT_SPOTS = {'L 1625 (Birken)': (-674.4, -80.5, 110, 'l1625_birken'), 'L 1625 (Böschung)': (-258.2, -344.4, 112, 'l1625_boeschung'),
             'L 1625 (Kreuzung)': (308.8, -517.7, 69, 'l1625_kreuzung')}
if 'ratscher' in want:
    with lib.browser() as b:
        errs = []
        pg = lib.page(b, 1920, 1080, errs, tier='hoch')
        lib.boot(pg, port)
        E = pg.evaluate
        J = lambda js: json.loads(E("JSON.stringify(" + js + ")"))
        E("document.querySelectorAll('#toast').forEach(e => e.style.visibility = 'hidden')")
        E("CLOCK.t = Math.floor(CLOCK.t / 1440) * 1440 + 14 * 60; DN.update(true)")
        lib.settle_light(pg)
        for i in range(8):
            E("GAME.step(0.25)")
        st0 = J("STADTGRUEN.status()")
        ck('Ratscher: nothing built in the garden (the road is 500 m away)', st0['area'] is None and st0['meshes'] == 0, json.dumps(st0))
        first = True
        for name, (x, y, yaw, fn) in RAT_SPOTS.items():
            look(pg, x, y, yaw, 1.6, 2, 75)
            for i in range(40):
                st = J("STADTGRUEN.status()")
                if st['area'] == 'ratscher' and st['state'] in ('ready', 'error'):
                    break
                E("GAME.step(0.25)")
                time.sleep(0.2)
            if first:
                first = False
                ck('Ratscher: near the road the belts stand', st['area'] == 'ratscher' and st['state'] == 'ready' and st['shown'] > 50, json.dumps(st))
                chk = J("""(() => { const T = STADTGRUEN.live, own = RATSCHER.treeXY || [], road = [], dup = [];
                  for (const t of T) { if (window.ROADS && ROADS.edgeAt(t.x, t.y) > -1.5) road.push([t.x, t.y]);
                    const lim = t.f & 64 ? 2 : 4;
                    for (let i = 0; i < own.length; i += 3) if (Math.abs(own[i] - t.x) < lim && Math.abs(own[i + 1] - t.y) < lim && Math.hypot(own[i] - t.x, own[i + 1] - t.y) < lim) { dup.push([t.x, t.y]); break; } }
                  return { n: T.length, road: road.slice(0, 5), nRoad: road.length, dup: dup.slice(0, 5), nDup: dup.length, off: STADTGRUEN.status().off }; })()""")
                ck('Ratscher: no tree on a road or its shoulder as the world draws it, none within 4 m of a world tree',
                   chk['nRoad'] == 0 and chk['nDup'] == 0, json.dumps(chk, ensure_ascii=False))
            look(pg, x, y, yaw, 1.6, 2, 75)
            c = J(COUNT)
            ck(f'Ratscher, {name}: within the budget (≤ {CALLS} draw calls, ≤ {TRIS_PC // 1000} k triangles)', c['sgCalls'] <= CALLS and c['sgTris'] <= TRIS_PC, json.dumps(c))
            lib.shot(pg, OUT, 'ratscher_' + fn)
        E("GAME.go('garten')")
        for i in range(40):
            E("GAME.step(0.5)")
            if J("STADTGRUEN.status().area") is None and J("STADTGRUEN.status().state") == 'idle':
                break
        st2 = J("STADTGRUEN.status()")
        ck('Ratscher: freed back in the garden', st2['state'] == 'idle' and st2['meshes'] == 0 and st2['freed'] >= 1, json.dumps(st2))
        ck.errors(errs)
ck.done()
