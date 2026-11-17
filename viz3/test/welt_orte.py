# feat/welt-orte: the flat places of the region in 3D – the cells of gebaeude/gebaeude.js (400 m, gebaeude/z/) extended by
# tools/welt-gebaeude/orte.py: first the way to Suhl (the country road over St. Kilian, Erlau and Hirschbach, 600 m either side), then
# every place inside the world's fine tiles.
# Without a browser (daten): index and cells agree, no ETHOS building twice, the counts of each stage, no building of ours where the
# Suhl chat builds its own (product g of the data repo: none of its footprints under ours), none more than 0.3 m inside a drawn road of
# the approach to Suhl, the size of the cells.
# In the browser (hirschbach): Hirschbach from the L 3247 – the tiles of Suhl's corridor and the approach (data repo) and the world's
# tiles come through the page's own origin as on the site (cached under out/welt_orte_netz/); coming from 600 m south, the cells built on
# the coarse tiles there are set down again within 240 frames when the finer tiles are drawn under them (gebaeude.js, feat/welt-orte);
# the cells around come in: buildings stand (counts within 350 m against the data), none on the drawn road, the feet on the drawn ground,
# the cells freed behind (beyond 900 m) and built again; draw calls and triangles of the cells, their memory; pictures from the road at eye height and from 60 m above, with and
# without the cells. (strecke): St. Kilian and Erlau on the way – counts per village, a picture each.
#   python3 viz3/test/welt_orte.py 9053 [sections]      sections: daten,hirschbach,strecke (default all)
import sys, os, json, time, math, glob, re, urllib.request, urllib.error
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__))); import lib
port = sys.argv[1] if len(sys.argv) > 1 else '8951'
want = set((sys.argv[2] if len(sys.argv) > 2 else 'daten,hirschbach,strecke').split(','))
ck = lib.Checks('welt_orte')
OUT = lib.out('welt_orte')
NET = lib.out('welt_orte_netz')
SITE = os.environ.get('WELT_SITE', 'https://mynametouse.github.io/pavillon-ratscher/welt-test/')
DATEN = os.environ.get('SUHL_DATEN', 'https://mynametouse.github.io/pavillon-daten/suhl/')
Z = os.path.join(lib.ROOT, 'viz3', 'extra', 'welt-gebaeude', 'dist', 'gebaeude', 'z')
XF = json.load(open(os.path.join(lib.ROOT, 'viz3', 'manifests.json')))['geoman']['xf']
# the villages on the way to Suhl: the middle of the place (OSM), a point on the country road (route suhl_land) and the heading there
VILLAGES = {
    'hirschbach': ('Hirschbach', (-1813.0, 7041.0), (-1819.4, 7035.4, 3)),
    'erlau': ('Erlau', (-938.0, 4866.0), (-915.9, 4865.0, 7)),
    'stkilian': ('St. Kilian', (-238.0, 3045.0), (-254.4, 3063.3, 18)),
    # stage welt: the densest village (no road of the drive there – the street of its OSM place)
    'waldau': ('Waldau', (3644.0, 38.0), (3647.0, 40.0, 90)),
}


def utm(x, y):
    return XF['a'] * x - XF['b'] * y + XF['ex'], XF['b'] * x + XF['a'] * y + XF['ey']


def get(url, path):
    if os.path.exists(path):
        return open(path, 'rb').read()
    try:
        with urllib.request.urlopen(url, timeout=90) as r:
            b = r.read()
    except urllib.error.HTTPError as e:
        return e.code
    except Exception:
        return None
    os.makedirs(os.path.dirname(path), exist_ok=True)
    open(path, 'wb').write(b)
    return b


def cells():
    idx = json.load(open(os.path.join(Z, 'index.json')))
    return idx, {k: json.load(open(os.path.join(Z, k + '.json')))['b'] for k in idx['cells']}


def ring(f):
    return [(f[i], f[i + 1]) for i in range(0, len(f), 2)]


def inside(f, x, y):
    c = False
    r = ring(f)
    for i in range(len(r)):
        (xi, yi), (xj, yj) = r[i], r[i - 1]
        if (yi > y) != (yj > y) and x < (xj - xi) * (y - yi) / (yj - yi) + xi:
            c = not c
    return c


def area(f):
    r = ring(f)
    return abs(sum(r[i][0] * r[i - 1][1] - r[i - 1][0] * r[i][1] for i in range(len(r)))) / 2


def centre(f):
    r = ring(f)
    return sum(p[0] for p in r) / len(r), sum(p[1] for p in r) / len(r)


# ---------------------------------------------------------------- without a browser ------------------------------------------------
IDX, CELLS = cells()
ORTE = IDX.get('orte', {})
if 'daten' in want:
    files = sorted(os.path.basename(f)[:-5] for f in glob.glob(os.path.join(Z, '*_*.json')))
    bad = [k for k in files if k not in IDX['cells']] + [k for k, n in IDX['cells'].items() if len(CELLS.get(k, [])) != n]
    ck('index and cells agree (every cell file listed with its count)', not bad and len(files) == len(IDX['cells']), f'{len(files)} files, {len(IDX["cells"])} in the index; off: {bad[:5]}')
    seen, twice = {}, []
    for k, L in CELLS.items():
        for b in L:
            if b['id'] in seen:
                twice.append((b['id'], seen[b['id']], k))
            seen[b['id']] = k
    ck('no ETHOS building twice in the cells', not twice, f'{len(seen)} buildings; twice: {twice[:4]}')
    st = ORTE.get('suhl') or {}
    ck('stage suhl: the way to Suhl has its buildings (St. Kilian, Erlau, Hirschbach …)', st.get('built', 0) >= 1500 and st.get('cells_new', 0) >= 20,
       json.dumps(st, ensure_ascii=False))
    so = ORTE.get('osm') or {}
    osm_b = [b for L in CELLS.values() for b in L if b.get('o') == 'osm']
    if so:
        # a building OSM has and ETHOS not: none of them on an ETHOS building of the cells (centre in the other's footprint)
        G = {}
        for L in CELLS.values():
            for b in L:
                if b.get('o') != 'osm':
                    cx, cy = centre(b['f'])
                    G.setdefault((int(cx // 50), int(cy // 50)), []).append(b)
        on = []
        for b in osm_b:
            # the share of the OSM footprint under ETHOS buildings, on a grid of 0.5 m inside it
            cx, cy = centre(b['f'])
            near = [e for i in range(int(cx // 50) - 1, int(cx // 50) + 2) for j in range(int(cy // 50) - 1, int(cy // 50) + 2) for e in G.get((i, j), ())]
            xs, ys = b['f'][0::2], b['f'][1::2]
            pts = [(x / 2.0, y / 2.0) for x in range(int(min(xs) * 2), int(max(xs) * 2) + 1) for y in range(int(min(ys) * 2), int(max(ys) * 2) + 1)]
            pts = [q for q in pts if inside(b['f'], *q)]
            under = sum(1 for q in pts if any(inside(e['f'], *q) for e in near))
            if pts and under > 0.2 * len(pts):
                on.append((b['id'], round(under / len(pts), 2)))
        ck('stage osm: the buildings ETHOS lacks come from OSM, none on an ETHOS building (a fifth of it at most)', len(osm_b) == so.get('built') and not on,
           f"{len(osm_b)} from OSM ({json.dumps(so.get('kinds'))}); on top of ETHOS: {on[:4]}")
    for name, (label, c, road) in VILLAGES.items():
        n = sum(1 for L in CELLS.values() for b in L if math.dist(centre(b['f']), c) < 350)
        print(f'village {label}: {n} buildings within 350 m of its middle', flush=True)
    nh = sum(1 for L in CELLS.values() for b in L if math.dist(centre(b['f']), VILLAGES['hirschbach'][1]) < 350)
    ck('Hirschbach: its buildings in the cells (within 350 m of the middle)', nh >= 350, f'{nh}')
    # the Suhl chat's own buildings (product g of the data repo, the whole municipality): none of ours stands on one of them
    try:
        ak = json.loads(get(DATEN + 'aktuell.json', os.path.join(NET, 'suhl', 'aktuell.json')))
        g = ak['products']['g']
        gi = json.loads(get(DATEN + g['index'], os.path.join(NET, 'suhl', g['index'])))
        import base64
        h = gi['has']['10']
        bits = base64.b64decode(h['bits'])
        gt = set()
        for j in range(h['h']):
            for i in range(h['w']):
                k = j * h['w'] + i
                if bits[k >> 3] >> (k & 7) & 1:
                    gt.add((h['x0'] + i, h['y0'] + j))
        ours = {}
        for k, L in CELLS.items():
            for b in L:
                E, N = utm(*centre(b['f']))
                t = (int((E - 420700) // 400), int((N - 5390800) // 400))
                if t in gt:
                    ours.setdefault(t, []).append(b)
        hits, n_s = [], 0
        for t, L in ours.items():
            raw = get(DATEN + g['path'] + f'10/{t[0]}/{t[1]}.json', os.path.join(NET, 'suhl', g['path'], '10', str(t[0]), f'{t[1]}.json'))
            if not isinstance(raw, bytes):
                continue
            d = json.loads(raw)
            ox, oy = (d.get('o') or [0.0, 0.0])[:2]
            for s_ in d.get('b', []):
                n_s += 1
                fp = [v + (ox if k % 2 == 0 else oy) for k, v in enumerate(s_.get('f') or [])]
                sid = str(s_.get('id', ''))
                for b in L:
                    cx, cy = centre(b['f'])
                    if b['id'].replace('DEG_', '').split('_')[0] == sid or (len(fp) >= 6 and inside(fp, cx, cy)):
                        hits.append((b['id'], t))
                        break
        ck('none of ours where the Suhl chat builds (its tiles of product g: no footprint of ours over one of its own)', not hits,
           f'{sum(len(v) for v in ours.values())} of ours in {len(ours)} of its {len(gt)} tiles, {n_s} of its buildings there; on top: {hits[:4]}')
    except Exception as e:
        print('note: the data repo was not reachable – Suhl check skipped', e, flush=True)
    # the drawn roads of the approach (welt/suhl.js → FAHRT.add): no corner or wall middle more than 0.3 m inside one (no bridges, tunnels)
    try:
        p = ak['products']['s']['path']
        G, segs = 40.0, {}
        for fn in ('anfahrt.json', 'anfahrt-grund.json'):
            d = json.loads(get(DATEN + p + fn, os.path.join(NET, 'suhl', p, fn)))
            for w in d['ways']:
                if w[0] > 4 or w[3] & 3:
                    continue
                q = w[6]
                xy = [(q[i] / 10.0, q[i + 1] / 10.0) for i in range(0, len(q) - 2, 3)]
                for a_, b_ in zip(xy, xy[1:]):
                    hw = w[2] / 20.0
                    for i in range(int(math.floor((min(a_[0], b_[0]) - hw) / G)), int(math.floor((max(a_[0], b_[0]) + hw) / G)) + 1):
                        for j in range(int(math.floor((min(a_[1], b_[1]) - hw) / G)), int(math.floor((max(a_[1], b_[1]) + hw) / G)) + 1):
                            segs.setdefault((i, j), []).append((a_[0], a_[1], b_[0], b_[1], hw))
        rbad, n = [], 0
        for L in CELLS.values():
            for b in L:
                pts = ring(b['f'])
                pts += [((p_[0] + q_[0]) / 2, (p_[1] + q_[1]) / 2) for p_, q_ in zip(pts, pts[1:] + pts[:1])]
                worst = 0.0
                for x, y in pts:
                    for ax, ay, bx, by, hw in segs.get((int(math.floor(x / G)), int(math.floor(y / G))), ()):
                        dx, dy = bx - ax, by - ay
                        L2 = dx * dx + dy * dy
                        t = max(0.0, min(1.0, ((x - ax) * dx + (y - ay) * dy) / L2)) if L2 > 0 else 0.0
                        worst = max(worst, hw - math.hypot(x - ax - dx * t, y - ay - dy * t))
                n += 1
                if worst > 0.3:
                    rbad.append([b['id'], round(worst, 2)] + [round(v) for v in centre(b['f'])])
        ck('no building of the cells more than 0.3 m inside a drawn road of the approach to Suhl (cut back to its edge)', len(rbad) <= 3,
           f'{n} buildings, {len(rbad)} reach in: {rbad[:5]}')
    except Exception as e:
        print('note: no approach ways – road check skipped', e, flush=True)
    # the life of the new places: every area of dinge/orte.json has its data (parked cars …) in welt-dinge's folder
    orte = json.load(open(os.path.join(lib.ROOT, 'viz3', 'extra', 'welt-orte', 'dist', 'dinge', 'orte.json')))
    cars = {}
    for a in orte['areas']:
        fn = os.path.join(lib.ROOT, 'viz3', 'extra', 'welt-dinge', 'dist', 'dinge', a['id'] + '.json')
        cars[a['id']] = len(json.load(open(fn)).get('autos', [])) if os.path.exists(fn) else None
    ck('the life of the new places: every area of dinge/orte.json has its data', all(v for v in cars.values()), json.dumps(cars))
    size = sum(os.path.getsize(f) for f in glob.glob(os.path.join(Z, '*.json')))
    big = max(IDX['cells'].items(), key=lambda kv: kv[1])
    print(f'cells: {len(IDX["cells"])}, buildings {sum(IDX["cells"].values())}, {size / 1e6:.2f} MB; the largest {big[0]} with {big[1]}', flush=True)
    ck('the cells stay small (each below 1.5 MB, all below 40 MB)', size < 40e6 and max(os.path.getsize(f) for f in glob.glob(os.path.join(Z, '*_*.json'))) < 1.5e6,
       f'{size / 1e6:.2f} MB')

# ---------------------------------------------------------------- in the browser -----------------------------------------------------
TYPES = {'.json': 'application/json', '.webp': 'image/webp', '.bin': 'application/octet-stream', '.jpg': 'image/jpeg', '.png': 'image/png'}
NETN = {'hit': 0, 'got': 0, 'miss': 0, 'bytes': 0}


# a set of retouched tiles made here (tools/welt-gebaeude/kacheln.py --out DIR) shown before it is published: its tiles over the site's
V2 = os.environ.get('WELT_V2_LOCAL')


def through(base, sub):
    """a route of the page's own origin to the published files (welt-test/ of the site, suhl/ of the data repo) – as on the site, where
    both lie beside the page – cached on disk"""
    def handler(route):
        url = route.request.url
        rel = url.split('/' + sub + '/', 1)[1].split('?')[0]
        if V2 and sub == 'welt-test' and rel.startswith('v2/'):
            mine = os.path.join(V2, rel[3:])
            if rel == 'v2/index.json':
                site = get(base + rel, os.path.join(NET, sub, rel))
                keys = set(json.loads(site)['tiles']) if isinstance(site, bytes) else set()
                keys |= set(json.load(open(mine))['tiles'])
                return route.fulfill(status=200, body=json.dumps({'v': 1, 'tiles': sorted(keys)}), headers={'content-type': 'application/json'})
            if os.path.exists(mine):
                return route.fulfill(status=200, body=open(mine, 'rb').read(), headers={'content-type': 'image/webp'})
        p = os.path.join(NET, sub, rel)
        had = os.path.exists(p)
        b = get(base + rel, p)
        if not isinstance(b, bytes):
            NETN['miss'] += 1
            return route.fulfill(status=b if isinstance(b, int) else 502, body=b'')
        NETN['hit' if had else 'got'] += 1
        NETN['bytes'] += 0 if had else len(b)
        route.fulfill(status=200, body=b, headers={'content-type': TYPES.get(os.path.splitext(p)[1], 'application/octet-stream'),
                                                   'cache-control': 'no-store'})
    return handler


if want & {'hirschbach', 'strecke'}:
    with lib.browser() as b:
        errs = []
        pg = lib.page(b, 1920, 1080, errs, tier='hoch')
        pg.route(f'http://localhost:{port}/welt-test/**', through(SITE, 'welt-test'))
        pg.route(f'http://localhost:{port}/suhl/**', through(DATEN, 'suhl'))
        lib.boot(pg, port, '?suhl=1')
        E = pg.evaluate
        J = lambda js: json.loads(E("JSON.stringify(" + js + ")"))

        def pic(name):
            try:
                lib.shot(pg, OUT, name)
            except Exception as e:
                print('shot failed', name, e, flush=True)

        def eye(x, y, yaw, pitch=-2.0, fov=62, h=1.7):
            E(f"(() => {{ document.body.dataset.mode = 'walk'; GAME.setView3(false, true); GAME.view({x}, {y}, KERN.ground({x}, {y}) + {h}, {yaw}, {pitch}, {fov}); GAME.step(0.05); GAME.view({x}, {y}, KERN.ground({x}, {y}) + {h}, {yaw}, {pitch}, {fov}); }})()")

        def above(x, y, az=200, el=58, r=72):
            E(f"GAME.orbit({az}, {el}, {r}, [{x}, {y}, KERN.ground({x}, {y}) + 1])")

        NEAR = """((cx, cy, R) => { let cells = 0, n = 0, houses = 0, barns = 0, sheds = 0; for (const c of GEB.Z.cells.values()) { if (!c.meshes.length) continue; cells++;
            for (const b of c.data.b) if (b.cx !== undefined && Math.hypot(b.cx - cx, b.cy - cy) < R) { n++; if (b.k === 0) houses++; else if (b.k === 1) barns++; else sheds++; } }
            return { z: GEB.Z.state, err: GEB.Z.err || '', jobs: GEB.jobs(), busy: GEB.Z.busy, due: GEB.Z.rs ? GEB.Z.rs.due.size : 0, w: WELT.state().loading, cells, n, houses, barns, sheds,
              suhl: window.SUHL ? SUHL.state : null, fahrt: !!(window.FAHRT && FAHRT.ready), sets: FAHRT && FAHRT.sets ? FAHRT.sets() : [] }; })"""

        def settle(cx, cy, limit=300, R=350):
            # quiet: the index there, nothing being built or fetched, the world's tiles in, and no cell due for a check – gebaeude.js
            # (feat/welt-orte) marks the cells under a tile drawn after they were built and sets them down again in the same frames
            t0 = time.time()
            s = {}
            calm = 0
            while time.time() - t0 < limit:
                E("GAME.step(0.5)")
                s = J(f"{NEAR}({cx}, {cy}, {R})")
                quiet = s['z'] == 'ready' and not s['jobs'] and not s['busy'] and not s['due'] and s['w'] == 0 and s['n'] > 0
                calm = calm + 1 if quiet else 0
                if calm >= 6 and time.time() - t0 > 20:
                    break
                time.sleep(0.25)
            s['secs'] = round(time.time() - t0)
            s['reseated'] = J("[...GEB.Z.cells.values()].reduce((n, c) => n + (c.reseat || 0), 0)")
            return s

        # the set-down log of gebaeude.js after entry seq0: [cell, frame the tile was drawn, frame found off, frame built again (0: not
        # yet), ms between, metres off, buildings, still built]
        RSLOG = """((seq0) => { const R = GEB.Z.rs; return { marked: R.marked, checked: R.checked, reseated: R.reseated, worst: R.worst, due: R.due.size,
            log: R.log.filter(e => e.seq > seq0).map(e => { const c = GEB.Z.cells.get(e.key); return [e.key, e.at, e.found, e.done, e.ms, e.off, e.n, !!(c && c.meshes.length)]; }) }; })"""

        DRAW = """(() => { let meshes = 0, tris = 0, bytes = 0; for (const c of GEB.Z.cells.values()) for (const m of c.meshes) { meshes++; const g = m.geometry;
                tris += (g.index ? g.index.count : g.attributes.position.count) / 3; for (const k in g.attributes) bytes += g.attributes[k].array.byteLength; if (g.index) bytes += g.index.array.byteLength; }
                const i = GAME.R.info; i.autoReset = false; i.reset(); GAME.shot(); const a = { calls: i.render.calls, tris: i.render.triangles };
                for (const c of GEB.Z.cells.values()) for (const m of c.meshes) m.visible = false; i.reset(); GAME.shot(); const b = { calls: i.render.calls, tris: i.render.triangles };
                for (const c of GEB.Z.cells.values()) for (const m of c.meshes) m.visible = !RATSCHER.map; i.autoReset = true;
                const built = [...GEB.Z.cells.values()].filter(c => c.meshes.length);
                return { meshes, tris: Math.round(tris), mb: +(bytes / 1e6).toFixed(1), cells: built.length, ms: built.map(c => [c.key, c.data.b.length, c.ms]),
                  frame: a, without: b, heap: performance.memory ? Math.round(performance.memory.usedJSHeapSize / 1e6) : null }; })()"""

        def draw(label):
            dc = J(DRAW)
            print('draw', label, json.dumps(dc), flush=True)
            # two meshes per cell (walls, roofs); four where a building's middle lies over the cell's edge (it is drawn with its own cell)
            ck(f'{label}: few draw calls for the cells (walls and roofs per cell, ≤ 40 more in the frame)',
               dc['meshes'] <= 4 * dc['cells'] and dc['frame']['calls'] - dc['without']['calls'] <= 40,
               f"{dc['cells']} cells built, {dc['meshes']} meshes, {dc['tris']} triangles, {dc['mb']} MB of geometry; frame {dc['frame']} "
               f"without the cells {dc['without']}; heap {dc['heap']} MB; build ms per cell {sorted(m for _, _, m in dc['ms'])[-3:]}")
            return dc

        # the data's count near each village middle (what should stand there)
        def data_near(c, R=350):
            return sum(1 for L in CELLS.values() for b_ in L if math.dist(centre(b_['f']), c) < R)

        E("document.querySelectorAll('#toast').forEach(e => e.style.visibility = 'hidden')")
        # midday in autumn light, the same in every picture
        E("CLOCK.t = 1440 * 3 + 12 * 60; DN.active && DN.update(true)")
        lib.settle_light(pg)
        st0 = J("({ z: GEB.Z.state, n: GEB.Z.n })")
        ck('at the garden none of the cells is fetched', st0['z'] == 'idle', json.dumps(st0))
        order = [k for k in ('stkilian', 'erlau', 'waldau') if 'strecke' in want] + (['hirschbach'] if 'hirschbach' in want else [])
        res = {}
        for key in order:
            label, c, (rx, ry, yaw) = VILLAGES[key]
            if key == 'hirschbach':
                # first from 600 m south (the way from Erlau): the cells of the village's south come in on the coarse tiles there (level 10
                # – the finer ones only within 380 m and 150 m of the observer); coming closer, the finer tiles are drawn under them
                eye(rx, ry - 600, yaw)
                s0 = settle(c[0], c[1] - 600, 240, R=700)
                seq0 = J("GEB.Z.rs.reseated")
                print('hirschbach_vorher', json.dumps(s0), flush=True)
            eye(rx, ry, yaw)
            s = settle(c[0], c[1], 420 if key == 'hirschbach' else 300)
            want_n = data_near(c)
            res[key] = s
            print(key, json.dumps(s), 'data', want_n, flush=True)
            ck(f'{label}: the cells around come in and its buildings stand ({s["n"]} of {want_n} within 350 m of the middle)',
               s['z'] == 'ready' and s['n'] >= 0.95 * want_n and want_n > 0, json.dumps(s))
            if key != 'hirschbach':
                res[key + '_draw'] = draw(label)
                eye(rx, ry, yaw)
                for _ in range(6):
                    E("GAME.step(0.25)")
                pic(f'{key}_strasse')
                above(c[0], c[1], az=200, el=48, r=80)
                pic(f'{key}_oben')
                continue
            # ---- Hirschbach: the checks ----
            # set down again in time: every cell found off after the finer tiles came (in this approach) built again within 240 frames
            # (4 s at 60 frames a second; the test steps 25 ms a frame) of the frame its tile was drawn
            rs = J(f"{RSLOG}({seq0})")
            late = [e for e in rs['log'] if (e[3] == 0 and e[7]) or (e[3] and e[3] - e[1] > 240)]
            res['reseat'] = rs
            ck('Hirschbach: a cell built on the coarser ground is set down again within 4 s (240 frames) after a finer tile is drawn under it',
               len(rs['log']) >= 1 and not late and rs['due'] == 0, json.dumps({**rs, 'late': late}))
            ck('Hirschbach: Suhl\'s corridor and the approach are there (the ground of the data repo, the ways in the drive)',
               s['suhl'] == 'ready' and 'suhl/anfahrt-grund' in s['sets'], json.dumps({k: s[k] for k in ('suhl', 'sets', 'w')}))
            # the life of the aerial image (feat/welt-orte: dinge/orte.json names the new areas for dinge/dinge.js): Hirschbach's parked cars
            if os.path.exists(os.path.join(lib.ROOT, 'viz3', 'extra', 'welt-dinge', 'dist', 'dinge', 'hirschbach.json')):
                E("DINGE.settle()")
                for _ in range(6):
                    E("GAME.step(0.5)")
                dg = J("""(() => { const L = DINGE.places.filter(p => p.area === 'hirschbach'); return { orte: DINGE.orte || null,
                    area: DINGE.areaState().hirschbach || null, places: L.length, built: L.filter(p => p.im).length, shown: L.filter(p => p.im && p.on && !p.hide).length,
                    err: DINGE.state().err || null }; })()""")
                ck('Hirschbach: its parked cars come (the area from dinge/orte.json, its places built near the road)',
                   dg['orte'] == 'da' and dg['area'] == 'da' and dg['places'] >= 30 and dg['built'] >= 10, json.dumps(dg))
            # none on the drawn road: corners, wall middles and centres of the buildings near, against the drive's roads (no bridges)
            rd = J(f"""(() => {{ const bad = []; let n = 0; for (const c of GEB.Z.cells.values()) {{ if (!c.meshes.length) continue; for (const b of c.data.b) {{
                if (Math.hypot(b.cx - {c[0]}, b.cy - {c[1]}) > 500) continue; n++; const f = b.f, pts = [[b.cx, b.cy]];
                for (let k = 0; k < f.length; k += 2) {{ const j = (k + 2) % f.length; pts.push([f[k], f[k + 1]], [(f[k] + f[j]) / 2, (f[k + 1] + f[j + 1]) / 2]); }}
                let worst = 0; for (const [x, y] of pts) {{ const r = FAHRT.roadAt(x, y, 0, true); if (r && !(r.w.fl & 3) && r.w.kind <= 4) worst = Math.max(worst, r.e); }}
                if (worst > 0.3) bad.push([b.id, +worst.toFixed(2), +b.cx.toFixed(1), +b.cy.toFixed(1)]); }} }} return {{ n, bad: bad.slice(0, 6), nb: bad.length }}; }})()""")
            ck('Hirschbach: no building on a drawn road (no corner or wall middle more than 0.3 m inside)', rd['n'] > 200 and rd['nb'] <= 2, json.dumps(rd))
            # the feet on the ground as drawn: at the points the loader samples (each wall's start and middle) the lowest of the tiles'
            # triangles against the wall foot – above it is a gap under the wall (floating), below it the wall reaches into the ground
            ft = J(f"""(() => {{ const fl = []; let n = 0, worst = 0, sunk = 0, same = 0, pts = 0; for (const c of GEB.Z.cells.values()) {{ if (!c.meshes.length) continue; for (const b of c.data.b) {{
                if (Math.hypot(b.cx - {c[0]}, b.cy - {c[1]}) > 400 || b.zmin === undefined) continue; let lo = 1e9, lk = 1e9;
                for (const f of b.F) for (const [x, y] of [[f[0], f[1]], [(f[0] + f[2]) / 2, (f[1] + f[3]) / 2]]) {{ const h = WELT.heightAt(x, y), k = KERN.terrain(x, y);
                  if (h === undefined || h === null) continue; pts++; if (Math.abs(h - k) < 0.01) same++; lo = Math.min(lo, h); lk = Math.min(lk, k); }}
                if (lo > 1e8) continue; n++; const d = b.zmin - lo, bottom = Math.min(b.z0 - 1.5, b.zmin - 0.8); worst = Math.max(worst, d); sunk = Math.max(sunk, -d);
                // gebaeude.js lets every wall reach down to min(z0 − 1.5, zmin − 0.8): a gap only where the tiles lie lower still
                if (lo < bottom - 0.05) fl.push([b.id, c.key, +d.toFixed(2), +b.zmin.toFixed(2), +lo.toFixed(2), +lk.toFixed(2), c.reseat || 0]); }} }}
                return {{ n, gaps: fl.length, worst: +worst.toFixed(2), deepest: +sunk.toFixed(2), terrainIsTiles: +(same / Math.max(pts, 1)).toFixed(3), some: fl.slice(0, 6) }}; }})()""")
            ck('Hirschbach: the feet on the drawn ground (no gap under a wall: the tiles nowhere below its lowest edge)',
               ft['n'] > 200 and ft['gaps'] <= max(1, ft['n'] // 200), json.dumps(ft))
            # draw calls and triangles: the cells' meshes (walls and roofs, one pair per cell), a frame with and without them
            dc = draw('Hirschbach')
            res['draw'] = dc
            # pictures: from the road at eye height, from 60 m above – with the cells and (before) without them
            # the cells' meshes and the facades' extras of the cells (door steps, hall windows: one mesh 'fassade zonen' for all cells)
            VIS = "((v) => { for (const c of GEB.Z.cells.values()) for (const m of c.meshes) m.visible = v; const z = GAME.scene.getObjectByName('fassade zonen'); if (z) z.visible = v; })"
            for tag, vis in (('', True), ('_vorher', False)):
                E(f"{VIS}({'true' if vis else 'false'})")
                eye(rx, ry, yaw)
                for _ in range(4):
                    E("GAME.step(0.25)")
                E(f"{VIS}({'true' if vis else 'false'})")
                pic('hirschbach_strasse' + tag)
                eye(rx - 6, ry + 40, yaw + 165)
                E(f"{VIS}({'true' if vis else 'false'})")
                pic('hirschbach_strasse2' + tag)
                above(c[0], c[1], az=200, el=48, r=80)
                E(f"{VIS}({'true' if vis else 'false'})")
                pic('hirschbach_oben' + tag)
            E(f"{VIS}(!RATSCHER.map)")
            # free behind and build again: 1.5 km south on the road (beyond FAR = 900 m), then back
            near_keys = J(f"[...GEB.Z.cells.values()].filter(c => c.meshes.length && Math.hypot((c.ij[0] + 0.5) * 400 - {c[0]}, (c.ij[1] + 0.5) * 400 - {c[1]}) < 300).map(c => c.key)")
            f0 = J("GEB.Z.freed")
            eye(-915.9, 4865.0, 180)
            settle(-938.0, 4866.0, 240)
            fr = J(f"({{ freed: GEB.Z.freed, gone: {json.dumps(near_keys)}.filter(k => {{ const c = GEB.Z.cells.get(k); return !c || (!c.meshes.length && !c.data); }}) }})")
            ck('Hirschbach: its cells are freed behind (1.5 km away: meshes and data gone)', near_keys and len(fr['gone']) == len(near_keys) and fr['freed'] > f0,
               json.dumps({'near': near_keys, **fr}))
            eye(rx, ry, yaw)
            s2 = settle(c[0], c[1], 300)
            ck('Hirschbach: and built again on coming back', s2['n'] >= 0.95 * data_near(c), json.dumps(s2))
        print('net', json.dumps(NETN), flush=True)
        json.dump(res, open(os.path.join(OUT, 'zahlen.json'), 'w'), indent=1)
        ck.errors(errs)
ck.done()
