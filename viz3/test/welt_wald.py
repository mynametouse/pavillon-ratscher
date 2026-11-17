# feat/welt-wald: the region's forests and trees in 3D (weltwald/weltwald.js, data weltwald/z/ from tools/weltwald/baeume.py).
# Without a browser (data): the index and the cells agree, no tree in a keep-out area (Ratscher's square, Schleusingen's town zone, Suhl's
# tiles), none on the roads the app draws (welt/fahrt.js), none in a building of the cells of gebaeude/z/, none at the known open fields
# along the roads; kinds and sizes plausible.
# In the browser (the world tiles from the published site, as viz3/test/laeden.py): nothing at the start; at a forest by the road to
# Kloster Veßra and in the valley at Rappelsdorf the cells come, trees stand near (3D), in the middle and as cards, their feet on the drawn
# ground, no trunk on a road, the trunks stop the walker; draw calls and triangles in a forest, at a forest edge from the road and in a
# valley view (≤ 150 000 triangles, ≤ 10 draw calls; with the phone flag ≤ 60 000 and ≤ 8); no new shader programs; streaming on a drive
# at 100 km/h (the cells ahead are there before one reaches them, no tree pops up in front); summer, autumn, winter; pictures from the
# road at eye height and from 60 m above. Pictures in out/welt_wald/.
#   python3 viz3/test/welt_wald.py 9054 [sections]     sections: data,road,perf,drive,season,phone (default all)
import sys, os, json, time, math, struct, zlib, urllib.request, concurrent.futures
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__))); import lib
port = sys.argv[1] if len(sys.argv) > 1 else '8951'
want = set((sys.argv[2] if len(sys.argv) > 2 else 'data,road,perf,drive,season,phone').split(','))
ck = lib.Checks('welt_wald')
OUT = lib.out('welt_wald')
SITE = os.environ.get('WELT_SITE', 'https://mynametouse.github.io/pavillon-ratscher/welt-test/')
DIST = os.path.join(lib.ROOT, 'viz3', 'dist', 'welt-test')
MAN = json.load(open(os.path.join(lib.ROOT, 'viz3', 'manifests.json')))['geoman']
XF = MAN['xf']
WW = os.path.join(lib.ROOT, 'viz3', 'extra', 'welt-wald', 'dist', 'weltwald')
EXTRA = os.path.join(lib.ROOT, 'viz3', 'extra')
# places (model metres x east, y north; yaw ° from north): along the road to Kloster Veßra (welt/fahrt.js route 'baumschule')
SPOTS = json.load(open(os.path.join(os.path.dirname(os.path.abspath(__file__)), 'welt_wald_spots.json')))


def utm(x, y):
    return XF['a'] * x - XF['b'] * y + XF['ex'], XF['b'] * x + XF['a'] * y + XF['ey']


# ---------------------------------------------------------------- the data -----------------------------------------------------------
def cell_trees(key):
    """the trees of a cell (WWB2, tools/weltwald/baeume.py pack) in model metres: [(x, y, h, r, kind, flags)]"""
    b = open(os.path.join(WW, 'z', key + '.bin'), 'rb').read()
    assert b[:4] == b'WWB2', key
    n = struct.unpack('<I', b[4:8])[0]
    raw = zlib.decompress(b[8:])
    i, j = (int(v) for v in key.split('_'))
    out, yd = [], 0
    for t in range(n):
        xd = raw[t] | raw[n + t] << 8
        yd = (yd + (raw[2 * n + t] | raw[3 * n + t] << 8)) & 0xFFFF
        out.append((i * 400 + xd / 10, j * 400 + yd / 10, raw[4 * n + t] / 4, raw[5 * n + t] / 10, raw[6 * n + t] & 15, raw[6 * n + t] & 240))
    return out


def seg_d(px, py, ax, ay, bx, by):
    dx, dy = bx - ax, by - ay
    l2 = dx * dx + dy * dy or 1
    t = max(0, min(1, ((px - ax) * dx + (py - ay) * dy) / l2))
    return math.hypot(px - ax - dx * t, py - ay - dy * t)


def inside(f, x, y):
    c = False
    n = len(f) // 2
    for k in range(n):
        xi, yi, xj, yj = f[2 * k], f[2 * k + 1], f[2 * ((k - 1) % n)], f[2 * ((k - 1) % n) + 1]
        if (yi > y) != (yj > y) and x < (xj - xi) * (y - yi) / (yj - yi) + xi:
            c = not c
    return c


if 'data' in want:
    idx = json.load(open(os.path.join(WW, 'z', 'index.json')))
    files = sorted(f[:-4] for f in os.listdir(os.path.join(WW, 'z')) if f.endswith('.bin'))
    ck('the index names every cell file and nothing else', sorted(idx['cells']) == files, f"{len(idx['cells'])} in the index, {len(files)} files")
    T = {k: cell_trees(k) for k in files}
    n = sum(len(v) for v in T.values())
    ck('the cells hold as many trees as the index says', all(len(T[k]) == idx['cells'][k][0] for k in files) and n == idx['n'],
       f'{n} trees, index {idx["n"]}')
    size = sum(os.path.getsize(os.path.join(WW, 'z', k + '.bin')) for k in files)
    ck('the data stay small (every file < 1 MB, all < 16 MB)', size < 16e6 and all(os.path.getsize(os.path.join(WW, 'z', k + '.bin')) < 1e6 for k in files),
       f'{size / 1e6:.1f} MB in {len(files)} cells')
    # keep-out: Ratscher's square, Schleusingen's town zone
    T0 = MAN['terrain']['inner']
    box = (T0['x0'], T0['y0'], T0['x0'] + (T0['n'] - 1) * T0['step'], T0['y0'] + (T0['n'] - 1) * T0['step'])
    zone = json.load(open(os.path.join(EXTRA, 'schleusingen', 'dist', 'schleusingen', 'stadt.json')))['zone']
    bad = [(k, round(x), round(y)) for k, L in T.items() for x, y, *_ in L
           if (box[0] < x < box[2] and box[1] < y < box[3]) or (zone[0] < x < zone[2] and zone[1] < y < zone[3])]
    ck("no tree in Ratscher's square or in Schleusingen's town zone (others plant there)", not bad, f'{len(bad)}: {bad[:4]}')
    # the roads the app draws beyond the square: no trunk on a carriageway (its half width + 0.5 m)
    d = json.load(open(os.path.join(EXTRA, 'fahrt', 'dist', 'fahrt', 'strassen.json')))
    grid = {}
    for w in d['ways']:
        p = w[6]
        hw = max(1.5, w[2] / 20.0)
        pts = [(p[q] / 10, p[q + 1] / 10) for q in range(0, len(p) - 2, 3)]
        for a, b in zip(pts, pts[1:]):
            for gx in range(int(math.floor(min(a[0], b[0]) / 40)) - 1, int(math.floor(max(a[0], b[0]) / 40)) + 2):
                for gy in range(int(math.floor(min(a[1], b[1]) / 40)) - 1, int(math.floor(max(a[1], b[1]) / 40)) + 2):
                    grid.setdefault((gx, gy), []).append((a, b, hw))
    onroad = []
    for k, L in T.items():
        for x, y, h, r, kk, fl in L:
            for a, b, hw in grid.get((int(math.floor(x / 40)), int(math.floor(y / 40))), []):
                dd = seg_d(x, y, *a, *b)
                if dd < hw + 0.5:
                    onroad.append((k, round(x, 1), round(y, 1), round(dd, 2), hw))
                    break
    ck('no trunk on a road the app draws (half width + 0.5 m; welt/fahrt.js)', not onroad, f'{len(onroad)}: {onroad[:4]}')
    # buildings: the cells of gebaeude/z/ (ETHOS along the roads one drives) – no trunk inside a footprint
    gz = os.path.join(EXTRA, 'welt-gebaeude', 'dist', 'gebaeude', 'z')
    inb, nb = [], 0
    for k, L in T.items():
        p = os.path.join(gz, k + '.json')
        if not os.path.exists(p):
            continue
        B = json.load(open(p))['b']
        nb += len(B)
        for x, y, *_ in L:
            for b in B:
                f = b['f']
                if min(f[0::2]) - 1 < x < max(f[0::2]) + 1 and min(f[1::2]) - 1 < y < max(f[1::2]) + 1 and inside(f, x, y):
                    inb.append((k, round(x, 1), round(y, 1)))
                    break
    ck('no trunk inside a building of the cells (gebaeude/z/, ETHOS)', nb > 100 and not inb, f'{nb} buildings checked; {len(inb)} inside: {inb[:4]}')
    # the open fields along the roads (looked up in the aerial images): no tree within 12 m
    fields = SPOTS.get('fields', [])
    near = []
    for fx, fy, name in fields:
        for k, L in T.items():
            for x, y, *_ in L:
                if abs(x - fx) < 12 and abs(y - fy) < 12 and math.hypot(x - fx, y - fy) < 12:
                    near.append((name, round(x), round(y)))
    ck('no tree in the open fields along the roads (12 m round known points in fields)', fields and not near, f'{len(fields)} fields; {near[:4]}')
    ks = [0] * 8
    hs = []
    for L in T.values():
        for x, y, h, r, kk, fl in L:
            ks[kk] += 1
            hs.append(h)
    hs.sort()
    p = lambda q: hs[int(q * (len(hs) - 1))] if hs else 0
    ck('kinds and heights plausible (conifers and broadleaf both, median height 8–30 m, crowns 0.9–12 m)',
       ks[0] > 1000 and sum(ks[3:7]) > 1000 and 8 <= p(0.5) <= 30 and all(0.9 <= t[3] <= 12.5 for L in T.values() for t in L),
       f'kinds {dict(zip(idx.get("kinds", []), ks))}; heights p10/50/90 {p(0.1):.1f}/{p(0.5):.1f}/{p(0.9):.1f}')


# ---------------------------------------------------------------- the world tiles for the browser -----------------------------------
def fetch_tiles(centres, half=520):
    """the world tiles around the places (levels 10–12) into dist/welt-test/, from the main set and Kloster Veßra's set"""
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
    jobs = set()
    for sub in ('', 'zonen/vessra/'):
        get(sub + 'meta.json')
        try:
            meta = json.load(open(os.path.join(DIST, sub + 'meta.json')))
        except Exception as e:
            print('note: no world tiles', sub, e, flush=True)
            continue
        lv = meta['tiling']['levels']
        for cx, cy in centres:
            cs = [utm(cx + sx * half, cy + sy * half) for sx in (-1, 1) for sy in (-1, 1)]
            for L, pad in ((10, 900), (11, 450), (12, 150)):
                if str(L) not in lv:
                    continue
                s = 409600 / (1 << L)
                r = lv[str(L)]['rect']
                E0, E1 = min(c[0] for c in cs) - pad, max(c[0] for c in cs) + pad
                N0, N1 = min(c[1] for c in cs) - pad, max(c[1] for c in cs) + pad
                for x in range(int((E0 - 420700) // s), int((E1 - 420700) // s) + 1):
                    for y in range(int((N0 - 5390800) // s), int((N1 - 5390800) // s) + 1):
                        if r[0] <= x <= r[2] and r[1] <= y <= r[3]:
                            jobs.add(f'{sub}t/{L}/{x}/{y}.bin')
                            jobs.add(f'{sub}i/{L}/{x}/{y}.webp')
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


SUHL_SITE = os.environ.get('SUHL_SITE', 'https://mynametouse.github.io/pavillon-daten/suhl/')
SUHL_DIST = os.path.join(lib.ROOT, 'viz3', 'dist', 'suhl', 'boden', 'v2')


def suhl_ground(centres, half=520):
    """the ground north of the main tiles (the road to Suhl beyond Schleusingen) is Suhl's corridor set (pavillon-daten, boden v2): its
    tiles of levels 10–12 around the places into dist/suhl/boden/v2/, registered in the page as a set of WELT (without Suhl's runtime)"""
    os.makedirs(SUHL_DIST, exist_ok=True)

    def get(rel):
        p = os.path.join(SUHL_DIST, rel)
        if os.path.exists(p) and os.path.getsize(p) > 0:
            return 0
        os.makedirs(os.path.dirname(p), exist_ok=True)
        try:
            with urllib.request.urlopen(SUHL_SITE + 'boden/v2/' + rel, timeout=60) as r:
                b = r.read()
        except Exception:
            return 0
        open(p, 'wb').write(b)
        return len(b)
    get('meta.json')
    try:
        meta = json.load(open(os.path.join(SUHL_DIST, 'meta.json')))
    except Exception as e:
        print('note: no Suhl ground', e, flush=True)
        return False
    lv = meta['tiling']['levels']
    jobs = set()
    for cx, cy in centres:
        cs = [utm(cx + sx * half, cy + sy * half) for sx in (-1, 1) for sy in (-1, 1)]
        for L, pad in ((10, 900), (11, 450), (12, 150)):
            q = lv.get(str(L))
            if not q:
                continue
            s_ = 409600 / (1 << L)
            has = {(a, b) for a, b in q['has']} if isinstance(q.get('has'), list) else None
            E0, E1 = min(c[0] for c in cs) - pad, max(c[0] for c in cs) + pad
            N0, N1 = min(c[1] for c in cs) - pad, max(c[1] for c in cs) + pad
            for x in range(int((E0 - 420700) // s_), int((E1 - 420700) // s_) + 1):
                for y in range(int((N0 - 5390800) // s_), int((N1 - 5390800) // s_) + 1):
                    if has is not None and (x, y) not in has:
                        continue
                    jobs.add(f't/{L}/{x}/{y}.bin')
                    jobs.add(f'i/{L}/{x}/{y}.webp')
    t0 = time.time()
    with concurrent.futures.ThreadPoolExecutor(8) as ex:
        n = sum(ex.map(get, sorted(jobs)))
    print(f'Suhl corridor tiles: {len(jobs)} files, {n / 1e6:.1f} MB new in {time.time() - t0:.0f} s', flush=True)
    return True


# ---------------------------------------------------------------- in the browser -----------------------------------------------------
# what one frame draws of the forests: draw calls (distinct meshes per pass and all passes) and triangles, main and shadow pass
COUNT = r"""
(() => {
  const R = GAME.R, I = { M: [0, 0], S: [0, 0], A: [0, 0] }, seen = new Set(), rbd = R.renderBufferDirect;
  R.renderBufferDirect = function (camera, scene, geometry, material, object, group) {
    const n = geometry.index ? geometry.index.count : geometry.attributes.position ? geometry.attributes.position.count : 0,
      k = object.isInstancedMesh ? object.count : 1;
    if (k > 0) {
      const t = Math.round((group ? group.count : n) / 3) * k, r = I[scene ? 'A' : 'S'];
      r[0]++; r[1] += t;
      if (scene && object.name && object.name.startsWith('weltwald') && !seen.has(object)) { seen.add(object); I.M[0]++; I.M[1] += t; }
    }
    return rbd.call(this, camera, scene, geometry, material, object, group);
  };
  const ws = [];
  try { R.shadowMap.needsUpdate = true; GAME.film(0, true); } finally { R.renderBufferDirect = rbd; }
  return { calls: I.M[0], tris: I.M[1], all: I.A, shadow: I.S, programs: R.info.programs.length, sel: WWALD.status().sel };
})()
"""
# the walker's ground and the roads under every tree drawn in 3D: feet on the drawn ground, no trunk on a road
FEET = """(() => { const out = { n: 0, off: [], road: [], kinds: {} };
  for (const im of WWALD.root.children) { if (!im.isInstancedMesh || !im.count || !/stamm/.test(im.name)) continue;
    const a = im.instanceMatrix.array;
    for (let i = 0; i < im.count; i++) { const x = a[i * 16 + 12], z = a[i * 16 + 13], y = -a[i * 16 + 14]; out.n++;
      out.kinds[im.name] = (out.kinds[im.name] || 0) + 1;
      const g = KERN.terrain(x, y); if (!(Math.abs(z - g) < 0.35)) out.off.push([+x.toFixed(1), +y.toFixed(1), +z.toFixed(2), g === undefined ? null : +g.toFixed(2)]);
      const s = KERN.surface(x, y); if (s && s.e > 0.3 && s.kind <= 6) out.road.push([+x.toFixed(1), +y.toFixed(1), s.kind, +s.e.toFixed(2)]); } }
  out.off = out.off.slice(0, 5); out.road = out.road.slice(0, 5); return out; })()"""
BROWSER = [s for s in ('road', 'perf', 'drive', 'season', 'phone', 'look') if any(w.startswith(s) for w in want)]
if BROWSER:
    fetch_tiles([tuple(v[:2]) for k, v in SPOTS['places'].items()] + [tuple(p) for p in SPOTS['drive'][::6]])
    SUHLSET = suhl_ground([tuple(v[:2]) for k, v in SPOTS['places'].items() if k in SPOTS.get('suhl_ground', [])])
    with lib.browser() as b:
        errs = []
        phone = 'phone' in want and BROWSER == ['phone']
        if phone:
            ctx = b.new_context(viewport={'width': 844, 'height': 390}, device_scale_factor=2, is_mobile=True, has_touch=True)
            pg = ctx.new_page()
            lib.preset(pg, 'schnell')
            pg.on('pageerror', lambda e: errs.append('PAGEERR ' + str(e)))
        else:
            pg = lib.page(b, 1920, 1080, errs, tier='hoch')
        lib.boot(pg, port, '?suhl=0')
        E = pg.evaluate
        J = lambda js: json.loads(E("JSON.stringify(" + js + ")"))
        E("document.querySelectorAll('#toast').forEach(e => e.style.visibility = 'hidden')")
        if SUHLSET:
            # Suhl's corridor tiles as a set of the tiled world (the test does without Suhl's runtime: ?suhl=0)
            E("WELT.addSet('suhl/', 'suhl/boden/v2/'); WELT.need('weltwald-test', true, 'suhl/'); 0")

        def settle(limit=180, quiet=4):
            t0 = time.time()
            st = None
            while time.time() - t0 < limit:
                E("GAME.step(0.25)")
                st = J("({ w: WELT.state().loading, pq: WELT.padQueue(), ok: WWALD.settled(), c: WWALD.status().cells })")
                if st['w'] == 0 and st['pq'] == 0 and st['ok'] and time.time() - t0 > quiet:
                    break
                time.sleep(0.25)
            return st

        def eye(x, y, yaw, pitch=1.0, fov=62, h=1.4):
            for _ in range(2):
                E(f"GAME.setView3(false, true); GAME.view({x}, {y}, KERN.ground({x}, {y}) + {h}, {yaw}, {pitch}, {fov})")
                E("GAME.step(0.05)")

        def above(x, y, az=200, el=35, r=160):
            E(f"GAME.orbit({az}, {el}, {r}, [{x}, {y}, KERN.ground({x}, {y}) + 1])")
            E("GAME.step(0.05)")

        def pic(name):
            try:
                lib.shot(pg, OUT, name)
            except Exception as e:
                print('shot failed', name, e, flush=True)

        def date(month, day=15, hour=11):
            # the calendar day of the game (DN: day 1 = DN.e0) → minutes of the clock
            d = J(f"Math.round(Date.UTC(new Date().getUTCFullYear(), {month - 1}, {day}) / 864e5 - DN.e0)")
            E(f"CLOCK.t = {d} * 1440 + {hour * 60}; DN.active && DN.update(true)")
            lib.settle_light(pg)
            E("GAME.step(3.2)")  # the season is read every 3 s

        st0 = J("WWALD.status()")
        ck('the forests are on and nothing is loaded at the start (the garden is in the square)', st0['on'] and st0['cells'] == 0 and st0['index'] == 'idle',
           json.dumps(st0)[:300])
        date(7)
        nums = {}
        for name in [w.split(':', 1)[1] for w in want if w.startswith('look:')]:
            x, y, yaw = (float(v) for v in name.split('/'))
            eye(x, y, yaw)
            settle(200)
            eye(x, y, yaw)
            print('look', name, json.dumps(J(COUNT)), flush=True)
            pic(f'look_{int(x)}_{int(y)}_{int(yaw)}')
            above(x, y)
            pic(f'look_{int(x)}_{int(y)}_{int(yaw)}_oben')
        if 'road' in want or 'perf' in want:
            K0 = set(J("GAME.R.info.programs.map(p => p.cacheKey)"))
            for name, (x, y, yaw) in SPOTS['places'].items():
                eye(x, y, yaw)
                st = settle(220)
                eye(x, y, yaw)
                ww = J("WWALD.status()")
                ck(f'{name}: the cells came and trees stand near (3D), in the middle and as cards', ww['cells'] >= 2 and ww['sel']['near'] + ww['sel']['mid'] > 10 and ww['sel']['cards'] > 50,
                   json.dumps(ww['sel']) + ' ' + json.dumps(st))
                c = J(COUNT)
                nums[name] = c
                pic(f'{name}_strasse')
                f = J(FEET)
                ck(f'{name}: every 3D tree stands on the drawn ground (±0.35 m) and none on a road', f['n'] > 10 and not f['off'] and not f['road'], json.dumps(f)[:400])
                ck(f'{name}: ≤ 10 draw calls and ≤ 150 000 triangles of the forests in view', c['calls'] <= 10 and c['tris'] <= 150000,
                   f"{c['calls']} calls, {c['tris']} triangles; shadow pass {c['shadow']}; all passes {c['all']}")
                above(x, y)
                pic(f'{name}_oben')
                cv = J(COUNT)
                nums[name + '_oben'] = cv
                ck(f'{name}, valley view from above: ≤ 10 draw calls and ≤ 150 000 triangles', cv['calls'] <= 10 and cv['tris'] <= 150000,
                   f"{cv['calls']} calls, {cv['tris']} triangles")
            # a trunk stops the walker: a trunk of the near trees (WWALD.trunkList), a point just inside it is pushed out
            eye(*SPOTS['places'][next(iter(SPOTS['places']))])
            t = J("""(() => { const L = WWALD.trunkList(50); for (const [x, y, r] of L) { const p = [x + r * 0.5, y], m = KERN.pushOut(p, 0.3);
                return { n: L.length, x, y, r, m: !!m, p, d: Math.hypot(p[0] - x, p[1] - y) }; } return { n: 0 }; })()""")
            ck('a trunk stops the walker (KERN.pushOut moves a point out of it)', t.get('m') and t['d'] >= t['r'] + 0.29, json.dumps(t))
            # programs: those of the forests' materials (and their shadow materials) that came new on the way must be the Klinge's own
            # (FOREST's keys, compiled where the Klinge has not drawn that kind yet) – none for the garden's kinds or the cards
            K1 = set(J("GAME.R.info.programs.map(p => p.cacheKey)"))
            new = K1 - K0
            mine = J("""(() => { const R = GAME.R, out = {};
                const add = (m, who) => { if (!m) return; const pp = R.properties.get(m); if (!pp || !pp.programs) return;
                  for (const k of pp.programs.keys()) (out[k] = out[k] || []).push(who); };
                for (const im of WWALD.root.children) { add(im.material, im.name); add(im.customDepthMaterial, im.name + ' Schatten'); }
                return Object.entries(out).map(([k, w]) => [k, [...new Set(w)].slice(0, 3)]); })()""")
            mnew = [(k, w) for k, w in mine if k in new]
            bad = [(k[-60:], w) for k, w in mnew if 'forest_' not in k]
            ck('no new shader programs for the forests (the Klinge\'s, the garden\'s and the far trees\' programs)', not bad and len(mnew) <= 4,
               f'{len(mine)} programs of the forests, {len(mnew)} new on the way ({[k[-40:] for k, w in mnew]}); not the Klinge\'s: {bad[:4]}; '
               f'all new programs of the page: {len(new)}')
            json.dump(nums, open(os.path.join(OUT, 'zahlen.json'), 'w'), indent=1)
        if 'drive' in want:
            # 100 km/h along the road to Suhl between Schleusingen and St. Kilian: the cells ahead are there before one reaches them
            D = SPOTS['drive']
            path = []
            for (x0, y0), (x1, y1) in zip(D, D[1:]):
                L = math.hypot(x1 - x0, y1 - y0)
                k = max(1, int(L / 2.8))
                for q in range(k):
                    path.append((x0 + (x1 - x0) * q / k, y0 + (y1 - y0) * q / k, math.degrees(math.atan2(x1 - x0, y1 - y0))))
            eye(*path[0])
            settle(200)
            late, worst, ms, t0 = [], 0, [], time.time()
            for q, (x, y, yaw) in enumerate(path):
                E(f"GAME.view({x}, {y}, KERN.ground({x}, {y}) + 1.3, {yaw}, 0, 62); GAME.step(0.1)")
                if q % 10 == 0:
                    r = J(f"""(() => {{ const s = WWALD.status(), ahead = []; const yr = {yaw} * Math.PI / 180;
                        for (const d of [60, 150, 300]) {{ const ax = {x} + Math.sin(yr) * d, ay = {y} + Math.cos(yr) * d, key = Math.floor(ax / 400) + '_' + Math.floor(ay / 400);
                          const c = WWALD.cells.get(key), want = WWALD.Z.index && WWALD.Z.index.cells[key];
                          ahead.push([d, key, !!want, c ? c.state : 'none']); }} return {{ ahead, ms: s.sel.ms }}; }})()""")
                    ms.append(r['ms'])
                    for d, key, wnt, state in r['ahead']:
                        if wnt and state != 'ready' and d <= 150:
                            late.append((round(x), round(y), d, key, state))
                time.sleep(max(0, 0.1 - 0))  # real time: 2.8 m per 0.1 s = 100 km/h
            dt = time.time() - t0
            ck('a drive at 100 km/h: the cells within 150 m ahead are always there (no tree pops up in front)', not late,
               f'{len(path) * 2.8 / 1000:.1f} km in {dt:.0f} s real time; late: {late[:5]}; selection {max(ms) if ms else 0} ms at most')
            eye(*path[len(path) // 2])
            pic('fahrt_mitte')
        if 'season' in want:
            x, y, yaw = SPOTS['places'][list(SPOTS['places'])[-1]]
            for month, day, tag in ((7, 15, 'sommer'), (10, 20, 'herbst'), (1, 20, 'winter'), (5, 5, 'mai')):
                date(month, day)
                eye(x, y, yaw)
                settle(60, 2)
                eye(x, y, yaw)
                s = J("WWALD.status()")
                pic(f'jahreszeit_{tag}')
                if tag == 'herbst':
                    ck('October: the broadleaf in autumn colours (gold), still with leaves', s['season']['gold'] > 0.5 and s['season']['leaf'] > 0.5, json.dumps(s['season']))
                if tag == 'winter':
                    bare = J("WWALD.root.children.filter(im => im.isInstancedMesh && /(Buche|Laubbaum|Birke|Obstbaum) (nah|mitte) krone/.test(im.name)).map(im => im.count)")
                    ck('January: the broadleaf bare (no crowns drawn, the cards without leaves), the conifers green', s['season']['leaf'] < 0.05 and all(v == 0 for v in bare) and s['cards'] and s['cards']['bare'],
                       json.dumps(s['season']) + ' ' + json.dumps(bare) + ' ' + json.dumps(s['cards']))
            date(7)
        if phone:
            x, y, yaw = SPOTS['places'][next(iter(SPOTS['places']))]
            eye(x, y, yaw)
            settle(220)
            eye(x, y, yaw)
            c = J(COUNT)
            ck('the phone flag: ≤ 8 draw calls and ≤ 60 000 triangles of the forests', c['calls'] <= 8 and c['tris'] <= 60000, f"{c['calls']} calls, {c['tris']} triangles")
            pic('telefon')
        ck.errors(errs, ignore=('Texture marked for update', 'suhl/'))
ck.done()
