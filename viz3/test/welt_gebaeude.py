# feat/welt-gebaeude (Falko, 5.11.2026: „Häuserdächer, die … flach sind … in ein vollständiges, typisches, passendes, dreidimensionales Gebäude“):
# the buildings OpenStreetMap lacked, from ETHOS.BUILDA (gebaeude/gebaeude.js GEB, data viz3/extra/welt-gebaeude/dist/gebaeude/). Checks:
# built at load, how many per kind, none doubled (no new footprint more than a fifth under an OSM building of the village), known places
# where a roof was flat in the ground image now have a building (the farm hall south of the garden, the big round tank, a shed in the
# village) – pictures from the ground and from above, before (?nogeb) and after; walking into one stops at its wall; the canopy trees that
# were roofs are hidden; no new shader programs when looking at them; no page errors; the start (garden) as before.
# Beyond the square (zellen): Orte → Schleusingen – the cells of 400 m around the Markt come in (Schleusingen beyond its old town), none
# doubles a house of the old town, pictures from the street and from above, a wall stops the walker, no new programs.
# The world tiles for that come from the published site (welt-test/, as viz3/test/schleusingen.py does).
#   python3 viz3/test/welt_gebaeude.py 8997 [sections]      sections: load,places,walk,zellen,before (default all)
import sys, os, json, time, math
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__))); import lib
port = sys.argv[1] if len(sys.argv) > 1 else '8951'
want = set((sys.argv[2] if len(sys.argv) > 2 else 'load,places,walk,zellen,before').split(','))
ck = lib.Checks('welt_gebaeude')
OUT = lib.out('welt_gebaeude')
# known places (model metres): a roof only in the ground image before, a building of the data now – and where to look from
SPOTS = {}   # the ground views found in the first run, used again in the run without the buildings
STADT = {}   # the same for Schleusingen
PLACES = [
    # name, point inside, ground view (x, y, yaw, pitch), top view (x, y, height)
    ('halle', (9.7, -134.2), (-25.0, -108.0, 125, -2), (10, -134, 70)),
    ('tank', (-128.0, -47.8), (-95.0, -70.0, 305, 2), (-115, -40, 75)),
    ('dorf', (164.1, -144.9), (140.0, -118.0, 140, -3), (160, -140, 60)),
    ('anger', None, None, (215, -95, 110)),   # the centre from above: the ground between the houses without printed roofs
]
SITE = os.environ.get('WELT_SITE', 'https://mynametouse.github.io/pavillon-ratscher/welt-test/')
DIST = os.path.join(lib.ROOT, 'viz3', 'dist', 'welt-test')
XF = json.load(open(os.path.join(lib.ROOT, 'viz3', 'manifests.json')))['geoman']['xf']
MARKT = (-1084.7, 1241.9)


def fetch_tiles(cx, cy, half=650):
    """the world tiles around (cx, cy) the app asks for (levels 10-12) from the published site into dist/welt-test/ (as schleusingen.py)"""
    import urllib.request, concurrent.futures
    os.makedirs(DIST, exist_ok=True)
    utm = lambda x, y: (XF['a'] * x - XF['b'] * y + XF['ex'], XF['b'] * x + XF['a'] * y + XF['ey'])

    def get(rel):
        p = os.path.join(DIST, rel)
        if os.path.exists(p) and os.path.getsize(p) > 0:
            return 0
        os.makedirs(os.path.dirname(p), exist_ok=True)
        try:
            with urllib.request.urlopen(SITE + rel, timeout=60) as r:
                data = r.read()
        except Exception:
            return 0
        open(p, 'wb').write(data)
        return len(data)
    get('meta.json')
    try:
        meta = json.load(open(os.path.join(DIST, 'meta.json')))
    except Exception as e:
        print('no world tiles:', e, flush=True)
        return
    lv = meta['tiling']['levels']
    jobs = set()
    cs = [utm(cx + sx * half, cy + sy * half) for sx in (-1, 1) for sy in (-1, 1)]
    for L, pad in ((10, 900), (11, 450), (12, 150)):
        s_ = 409600 / (1 << L)
        r = lv[str(L)]['rect']
        E0, E1 = min(c[0] for c in cs) - pad, max(c[0] for c in cs) + pad
        N0, N1 = min(c[1] for c in cs) - pad, max(c[1] for c in cs) + pad
        for x in range(int((E0 - 420700) // s_), int((E1 - 420700) // s_) + 1):
            for y in range(int((N0 - 5390800) // s_), int((N1 - 5390800) // s_) + 1):
                if r[0] <= x <= r[2] and r[1] <= y <= r[3]:
                    jobs.add(f't/{L}/{x}/{y}.bin')
                    jobs.add(f'i/{L}/{x}/{y}.webp')
    # the image tiles without the printed roofs (welt-test/v2/, tools/welt-gebaeude/kacheln.py): those of the same area that it lists
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
    print(f'welt tiles: {len(jobs)} files ({sum(1 for j in jobs if j.startswith("v2/"))} without roofs), {n / 1e6:.1f} MB new in {time.time() - t0:.0f} s', flush=True)
    return len(v2)


V2N = 0
if 'zellen' in want:
    V2N = fetch_tiles(*MARKT) or 0
with lib.browser() as b:
    errs = []
    pg = lib.page(b, 1100, 680, errs, tier='hoch')
    lib.boot(pg, port, '?gebz&welt2')
    E = pg.evaluate
    J = lambda js: json.loads(E("JSON.stringify(" + js + ")"))
    progs = lambda: E("GAME.R.info.programs.length")
    def pic(name):
        try: lib.shot(pg, OUT, name)
        except Exception as e: print('shot failed', name, e, flush=True)
    def top(x, y, h):
        E(f"(() => {{ const P = GAME.P; P.mode = 'top'; P.tx = {x}; P.ty = {y}; P.th = {h}; document.body.dataset.mode = 'top'; GAME.step(0.05); }})()")
    def ground(x, y, yaw, pitch):
        E(f"(() => {{ document.body.dataset.mode = 'walk'; GAME.view({x}, {y}, KERN.ground({x}, {y}) + 1.6, {yaw}, {pitch}, 60); for (let i = 0; i < 4; i++) GAME.step(0.25); }})()")
    E("for (let i = 0; i < 800 && !GEB.ready; i++) GAME.step(0.05)")   # the meshes are built in pieces after the load
    st = J("""({ on: GEB.on, ready: GEB.ready, n: GEB.n, err: GEB.err, ms: GEB.ms, msPrep: GEB.msPrep, z: GEB.Z.state, seg: GEB.nSeg, trees: GEB.trees, meshes: GEB.meshes.length,
      kinds: GEB.bld.reduce((o, b) => (o[b.k] = (o[b.k] || 0) + 1, o), {}), stats: GEB.stats, village: VILLAGE.bld.length, wcol: WCOL.nSeg,
      sameMat: GEB.meshes.length > 1 && GEB.meshes[0].material === RATSCHER.bld[0].material && GEB.meshes[1].material === VILLAGE.meshes[0].material })""")
    print('state', json.dumps(st), flush=True)
    ROOFS = J("VILLAGE.bld.map(b => b.roof ? [b.roof.kind, ...b.roof.col.map(v => +v.toFixed(3))] : null)")
    ground_info = J("({ retouched: GEBDACH.retouched, near: GEOMAN.tex.near.file, inner: GEOMAN.tex.inner.file, dach: GEBDACH.loaded === 2 })")
    print('ground', json.dumps(ground_info), flush=True)
    if 'load' in want:
        ck('the ground images of Ratscher are the retouched ones, the roof colours come from the originals', ground_info['retouched'] and ground_info['near'].endswith('_r.jpg') and ground_info['inner'].endswith('_r.jpg') and ground_info['dach'], json.dumps(ground_info))
        ck('the buildings are built at load (Ratscher: more than 250)', st['ready'] and st['n'] > 250 and not st['err'], f"{st['n']} in {st['ms']} ms, err {st['err']!r}")
        ck('all kinds there: houses, barns/halls, sheds/garages, tanks', all(st['kinds'].get(k, 0) > 0 for k in ('0', '1', '2', '4')), json.dumps(st['kinds']))
        ck('drawn with the village\'s own materials (no programs of their own)', st['sameMat'], '')
        ck('their walls are in the collisions of the square (WCOL)', st['seg'] > 1000 and st['wcol'] >= st['seg'], f"{st['seg']} segments, WCOL {st['wcol']}")
        ck('the village itself unchanged (337 OSM buildings + rebuilt parts)', 337 <= st['village'] <= 350, str(st['village']))
        ck('canopy trees that were roofs hidden', st['trees'] >= 20, str(st['trees']))
        # none doubled: sample points of each new footprint inside an OSM building of the village
        dup = J("""(() => { const inside = (F, x, y) => { let c = false; for (const f of F) if (f.ay > y !== f.by > y && x < ((f.bx - f.ax) * (y - f.ay)) / (f.by - f.ay) + f.ax) c = !c; return c; };
          const V = VILLAGE.bld.filter(v => v.bb), bad = [];
          for (const b of GEB.bld) { let n = 0, k = 0; const xs = [], ys = []; for (let i = 0; i < b.f.length; i += 2) { xs.push(b.f[i]); ys.push(b.f[i + 1]); }
            const x0 = Math.min(...xs), x1 = Math.max(...xs), y0 = Math.min(...ys), y1 = Math.max(...ys);
            for (let i = 0; i < 8; i++) for (let j = 0; j < 8; j++) { const x = x0 + (x1 - x0) * (i + 0.5) / 8, y = y0 + (y1 - y0) * (j + 0.5) / 8;
              let c = false; for (let p = 0, q = xs.length - 1; p < xs.length; q = p++) if (ys[p] > y !== ys[q] > y && x < ((xs[q] - xs[p]) * (y - ys[p])) / (ys[q] - ys[p]) + xs[p]) c = !c;
              if (!c) continue; n++; if (V.some(v => x >= v.bb[0] && x <= v.bb[2] && y >= v.bb[1] && y <= v.bb[3] && inside(v.fac, x, y))) k++; }
            if (n && k / n > 0.2) bad.push([b.id, +(k / n).toFixed(2), +b.cx.toFixed(1), +b.cy.toFixed(1)]); }
          return bad; })()""")
        ck('none doubled (no new footprint more than a fifth inside a village building)', len(dup) == 0, json.dumps(dup[:8]))
        # no new footprint in the hand-modelled site (garden, Hubert, Ronald)
        site = J("GEB.bld.filter(b => b.cx > -58 && b.cx < 42 && b.cy > -52 && b.cy < 48).length")
        ck('nothing new in the hand-modelled garden and yards', site == 0, str(site))
        grid = J("GEB.bld.filter(b => { for (let i = 0; i < b.f.length; i += 2) if (Math.abs(b.f[i]) <= 50 && Math.abs(b.f[i + 1]) <= 55) return true; return false; }).length")
        ck('none reaches into the walk grid of the garden (x ±50, y ±55: there the walls would need boxes in COL)', grid == 0, str(grid))
        # the fences, hedges, bins and woodpiles of world/village_near.js ask GEB.footFree: blocked inside and at the walls, free elsewhere
        ff = J("""(() => { let n = 0, inside = 0, wall = 0; for (const b of GEB.bld) { n++; if (!GEB.footFree(b.cx, b.cy, 0.2)) inside++; if (!GEB.footFree(b.f[0] + 0.1, b.f[1], 0.6)) wall++; }
          return { n, inside, wall, garden: GEB.footFree(0, 0, 0.6) }; })()""")
        ck('fences and woodpiles of the village keep off the new buildings (GEB.footFree for world/village_near.js)', ff['inside'] >= 0.9 * ff['n'] and ff['wall'] == ff['n'] and ff['garden'], json.dumps(ff))
    # a free spot (inside no building, 2 m from every wall) 16–34 m from a building, looking at it; same in both runs (deterministic)
    SPOT = """((x, y) => { const inF = (f, px, py) => { let c = false; for (let p = 0, q = f.length - 2; p < f.length; q = p, p += 2) if (f[p + 1] > py !== f[q + 1] > py && px < ((f[q] - f[p]) * (py - f[p + 1])) / (f[q + 1] - f[p + 1]) + f[p]) c = !c; return c; };
        const flat = []; for (const v of VILLAGE.bld) { const f = []; for (const q of v.fac) f.push(q.ax, q.ay); flat.push(f); } for (const b of (window.GEB && GEB.bld) || []) flat.push(b.f);
        const free = (px, py) => !flat.some(f => inF(f, px, py) || inF(f, px + 2, py) || inF(f, px - 2, py) || inF(f, px, py + 2) || inF(f, px, py - 2));
        for (const d of [18, 24, 30, 36]) for (let k = 0; k < 16; k++) { const a = k * Math.PI / 8, px = x + Math.sin(a) * d, py = y + Math.cos(a) * d; if (free(px, py)) return [px, py, (Math.atan2(x - px, y - py) * 180 / Math.PI + 360) % 360]; }
        return null; })"""
    def look_at(px, py):
        sp = SPOTS.get((px, py)) or J(f"{SPOT}({px}, {py})")
        SPOTS[(px, py)] = sp
        if sp: ground(sp[0], sp[1], sp[2], -3)
        return sp
    hide = lambda on: E(f"(() => {{ for (const m of (window.GEB && GEB.meshes) || []) m.visible = {'false' if on else 'true'}; }})()")
    if 'places' in want:
        # warm up every view without the new buildings (other things seen there for the first time may bring programs of their own) …
        hide(True)
        for name, pt, gv, tv in PLACES:
            top(*tv); E("GAME.shot()")
            if pt: look_at(*pt); E("GAME.shot()")
        E("document.body.dataset.mode = 'walk'")
        hide(False)
        p0 = progs()
        # … then the same views with them: no new programs (they are drawn with the village's materials)
        for name, pt, gv, tv in PLACES:
            if not pt:
                top(*tv); pic(f'{name}_top'); continue
            px, py = pt
            hit = J(f"""(() => {{ const x = {px}, y = {py}; for (const b of GEB.bld) {{ const f = b.f; let c = false;
              for (let p = 0, q = f.length - 2; p < f.length; q = p, p += 2) if (f[p + 1] > y !== f[q + 1] > y && x < ((f[q] - f[p]) * (y - f[p + 1])) / (f[q + 1] - f[p + 1]) + f[p]) c = !c;
              if (c) return {{ id: b.id, k: b.k, h: b.h, e: b.e, r: b.r, z0: +b.z0.toFixed(2), A: Math.round(b.A) }}; }} return null; }})()""")
            ck(f'{name}: a building stands where the roof was flat in the ground image', hit is not None, json.dumps(hit))
            top(*tv); pic(f'{name}_top')
            sp = look_at(px, py); pic(f'{name}_boden'); print(name, 'seen from', sp, flush=True)
        E("document.body.dataset.mode = 'walk'")
        p1 = progs()
        ck('no new shader programs for the buildings', p1 <= p0, f'{p0} -> {p1}')
    if 'walk' in want:
        # walk at the farm hall's west wall from 6 m away: the walker stops at the wall, does not end up inside
        r = J("""(() => { const b = GEB.bld.find(b => { const f = b.f; let c = false; const x = 9.7, y = -134.2;
            for (let p = 0, q = f.length - 2; p < f.length; q = p, p += 2) if (f[p + 1] > y !== f[q + 1] > y && x < ((f[q] - f[p]) * (y - f[p + 1])) / (f[q + 1] - f[p + 1]) + f[p]) c = !c; return c; });
          if (!b) return null;
          // the facade facing west (outward normal x < 0) and its middle
          let best = null; for (const f of b.F) { const L = Math.hypot(f[2] - f[0], f[3] - f[1]), nx = (f[3] - f[1]) / L; if (L > 4 && (!best || nx < best.nx)) best = { nx, ny: -(f[2] - f[0]) / L, mx: (f[0] + f[2]) / 2, my: (f[1] + f[3]) / 2 }; }
          const sx = best.mx + best.nx * 6, sy = best.my + best.ny * 6, yaw = Math.atan2(-best.nx, -best.ny) * 180 / Math.PI;
          GAME.view(sx, sy, KERN.ground(sx, sy) + 1.6, yaw, 0, 60); GAME.P.body = yaw;
          for (let i = 0; i < 160; i++) GAME.step(0.025, 1);
          const P = GAME.P, d = (P.x - best.mx) * best.nx + (P.y - best.my) * best.ny;
          return { start: [+sx.toFixed(1), +sy.toFixed(1)], end: [+P.x.toFixed(2), +P.y.toFixed(2)], d: +d.toFixed(2), moved: +Math.hypot(P.x - sx, P.y - sy).toFixed(2) }; })()""")
        ck('walking into the farm hall stops at its wall', r is not None and r['moved'] > 2 and r['d'] > 0.1, json.dumps(r))
        pic('halle_wand')
    if 'load' in want:
        ck('at the garden nothing of the cells beyond the square is fetched', st['z'] == 'idle', st['z'])
    if 'zellen' in want:
        E("document.querySelectorAll('#toast').forEach(e => e.style.visibility = 'hidden')")
        E("document.querySelector('#menu [data-spot=schleusingen]').click()")
        t0 = time.time()
        while time.time() - t0 < 240:
            E("GAME.step(0.5)")
            zs = J("({ s: SCHL.status().state, z: GEB.Z.state, built: GEB.Z.built, jobs: GEB.jobs(), busy: GEB.Z.busy, w: WELT.state().loading })")
            if zs['s'] in ('ready', 'error') and zs['z'] in ('ready', 'error') and zs['built'] >= 4 and not zs['jobs'] and not zs['busy'] and zs['w'] == 0:
                break
            time.sleep(0.3)
        for _ in range(12):   # cells set down again when the tiles under them came in
            E("GAME.step(0.5)"); time.sleep(0.1)
        z = J("""({ state: GEB.Z.state, err: GEB.Z.err || '', built: GEB.Z.built, n: GEB.Z.n, segs: GEB.Z.segs.length, index: GEB.Z.index && GEB.Z.index.stats,
          cells: [...GEB.Z.cells.values()].filter(c => c.meshes.length).map(c => [c.key, c.data.b.length, c.ms, c.reseat || 0]), schl: SCHL.status().state, secs: 0 })""")
        z['secs'] = round(time.time() - t0)
        print('zellen', json.dumps(z), flush=True)
        ck('Schleusingen beyond the old town: the cells around the Markt are built', z['state'] == 'ready' and len(z['cells']) >= 4 and z['n'] > 300, f"{len(z['cells'])} cells, {z['n']} buildings, {z['segs']} walls, err {z['err']!r}")
        dupz = J("""(() => { const inF = (f, x, y) => { let c = false; for (let p = 0, q = f.length - 2; p < f.length; q = p, p += 2) if (f[p + 1] > y !== f[q + 1] > y && x < ((f[q] - f[p]) * (y - f[p + 1])) / (f[q + 1] - f[p + 1]) + f[p]) c = !c; return c; };
          const old = SCHL.bld.map(b => b.f), bad = []; let n = 0;
          for (const c of GEB.Z.cells.values()) { if (!c.meshes.length) continue; for (const b of c.data.b) { n++; let k = 0, m = 0; const f = b.f;
            for (let i = 0; i < f.length; i += 2) { const x = (f[i] * 3 + b.cx) / 4, y = (f[i + 1] * 3 + b.cy) / 4; m++; if (old.some(o => inF(o, x, y))) k++; }
            if (m && k / m > 0.5) bad.push([b.id, +b.cx.toFixed(1), +b.cy.toFixed(1)]); } }
          return { n, bad }; })()""")
        ck('none doubles a house of the old town (welt/schleusingen.js)', not dupz['bad'], json.dumps(dupz)[:300])
        # a house of the cells inside Schleusingen's zone, 300–560 m from the Markt: seen from the street and from above
        tgt = J("""(() => { let best = null; for (const c of GEB.Z.cells.values()) { if (!c.meshes.length) continue; for (const b of c.data.b) {
            const d = Math.hypot(b.cx - SCHL.MARKT[0], b.cy - SCHL.MARKT[1]); if (b.k === 0 && d > 300 && d < 560 && (!best || Math.abs(d - 430) < Math.abs(best.d - 430))) best = { x: b.cx, y: b.cy, d, h: b.h, id: b.id, z0: b.z0 }; } }
          return best; })()""")
        print('target', json.dumps(tgt), flush=True)
        ck('a house of the cells inside the town zone', tgt is not None, json.dumps(tgt))
        hideZ = lambda on: E(f"(() => {{ for (const c of GEB.Z.cells.values()) for (const m of c.meshes) m.visible = {'false' if on else 'true'}; }})()")
        if tgt:
            ZSPOT = """((x, y) => { const inF = (f, px, py) => { let c = false; for (let p = 0, q = f.length - 2; p < f.length; q = p, p += 2) if (f[p + 1] > py !== f[q + 1] > py && px < ((f[q] - f[p]) * (py - f[p + 1])) / (f[q + 1] - f[p + 1]) + f[p]) c = !c; return c; };
                const flat = SCHL.bld.map(b => b.f); for (const c of GEB.Z.cells.values()) for (const b of (c.data ? c.data.b : [])) flat.push(b.f);
                const free = (px, py) => !flat.some(f => inF(f, px, py) || inF(f, px + 2, py) || inF(f, px - 2, py) || inF(f, px, py + 2) || inF(f, px, py - 2));
                for (const d of [16, 22, 28, 34]) for (let k = 0; k < 16; k++) { const a = k * Math.PI / 8, px = x + Math.sin(a) * d, py = y + Math.cos(a) * d; if (free(px, py)) return [px, py, (Math.atan2(x - px, y - py) * 180 / Math.PI + 360) % 360]; }
                return null; })"""
            sp = J(f"{ZSPOT}({tgt['x']}, {tgt['y']})")
            # warm up the view without the cells, then with them: no new programs
            hideZ(True)
            top(tgt['x'], tgt['y'], 80); E("GAME.shot()")
            if sp: ground(sp[0], sp[1], sp[2], -2); E("GAME.shot()")
            lib.shot(pg, OUT, 'stadt_boden_ohne_zellen') if sp else None
            hideZ(False)
            q0 = progs()

            def settle():
                for i in range(40):   # the tiles near the camera (levels 11, 12) before the picture (asked for a moment after the move)
                    E("GAME.step(0.25)")
                    if i >= 8 and E("WELT.state().loading === 0"): break
                    time.sleep(0.3)
            top(tgt['x'], tgt['y'], 80); settle(); pic('stadt_top')
            if sp: ground(sp[0], sp[1], sp[2], -2); settle(); pic('stadt_boden')
            q1 = progs()
            ck('no new shader programs for the cells', q1 <= q0, f'{q0} -> {q1}')
            STADT['tgt'], STADT['sp'] = tgt, sp
        t2 = J("({ state: GEB.T2.state, n: GEB.T2.n, keys: GEB.T2.keys ? GEB.T2.keys.size : 0, err: GEB.T2.err || '' })")
        print('welt2', json.dumps(t2), flush=True)
        if V2N:
            ck('?welt2: the tiles without the printed roofs are taken where there are some (welt-test/v2/)', t2['state'] == 'ready' and t2['n'] > 0, json.dumps(t2))
            # walk at the house from 6 m: its wall stops the walker (KERN.pushOut beyond the square)
            r = J(f"""(() => {{ let b = null; for (const c of GEB.Z.cells.values()) for (const q of (c.data ? c.data.b : [])) if (q.id === {tgt['id']}) b = q;
                let best = null; for (const f of b.F) {{ const L = Math.hypot(f[2] - f[0], f[3] - f[1]); if (L > 4 && !(f[8] & 1) && (!best || L > best.L)) best = {{ L, nx: (f[3] - f[1]) / L, ny: -(f[2] - f[0]) / L, mx: (f[0] + f[2]) / 2, my: (f[1] + f[3]) / 2 }}; }}
                if (!best) return null; const sx = best.mx + best.nx * 6, sy = best.my + best.ny * 6, yaw = Math.atan2(-best.nx, -best.ny) * 180 / Math.PI;
                GAME.view(sx, sy, KERN.ground(sx, sy) + 1.6, yaw, 0, 60); GAME.P.body = yaw; for (let i = 0; i < 160; i++) GAME.step(0.025, 1);
                const d = (GAME.P.x - best.mx) * best.nx + (GAME.P.y - best.my) * best.ny; return {{ d: +d.toFixed(2), moved: +Math.hypot(GAME.P.x - sx, GAME.P.y - sy).toFixed(2), free: KERN.free(sx, sy) }}; }})()""")
            ck('beyond the square a wall of the cells stops the walker', r is not None and r['moved'] > 2 and r['d'] > 0.1, json.dumps(r))
    ck.errors(errs)
if 'before' in want:
    # the same pictures without the new buildings (?nogeb) – for the before/after comparison
    with lib.browser() as b:
        errs2 = []
        pg = lib.page(b, 1100, 680, errs2, tier='hoch')
        lib.boot(pg, port, '?nogeb&bodenalt')
        E = pg.evaluate
        ck('?nogeb: no buildings of the data', E("!GEB.on && !GEB.meshes.length"), '')
        alt = json.loads(E("JSON.stringify({ near: GEOMAN.tex.near.file, inner: GEOMAN.tex.inner.file, retouched: GEBDACH.retouched })"))
        ck('?bodenalt: the original ground images', not alt['retouched'] and alt['near'] == 'ortho_near.jpg' and alt['inner'] == 'ortho_inner.jpg', json.dumps(alt))
        roofs0 = json.loads(E("JSON.stringify(VILLAGE.bld.map(b => b.roof ? [b.roof.kind, ...b.roof.col.map(v => +v.toFixed(3))] : null))"))
        if 'ROOFS' in dir() and ground_info.get('retouched'):
            # the copies are scaled down by PIL, the browser scales the full image itself: single sampled pixels differ a little
            pairs = [(p_, q_) for p_, q_ in zip(ROOFS, roofs0) if p_ and q_]
            dmax = [max(abs(a_ - b_) for a_, b_ in zip(p_[1:], q_[1:])) for p_, q_ in pairs]
            kind = sum(1 for p_, q_ in pairs if p_[0] != q_[0])
            far = sum(1 for d in dmax if d > 0.06)
            ck('the village roofs keep their colours with the retouched ground (taken from the originals)', len(ROOFS) == len(roofs0) and kind <= 10 and far <= 15,
               f'{len(pairs)} roofs: kind changed {kind}, colour off by > 0.06 (linear) {far}, median off {sorted(dmax)[len(dmax) // 2] if dmax else 0:.3f}')
        for name, pt, gv, tv in PLACES:
            if tv:
                E(f"(() => {{ const P = GAME.P; P.mode = 'top'; P.tx = {tv[0]}; P.ty = {tv[1]}; P.th = {tv[2]}; document.body.dataset.mode = 'top'; GAME.step(0.05); }})()")
                lib.shot(pg, OUT, f'{name}_top_vorher')
            sp = SPOTS.get(pt) if pt else None
            if sp:
                E(f"(() => {{ document.body.dataset.mode = 'walk'; GAME.view({sp[0]}, {sp[1]}, KERN.ground({sp[0]}, {sp[1]}) + 1.6, {sp[2]}, -3, 60); for (let i = 0; i < 4; i++) GAME.step(0.25); }})()")
                lib.shot(pg, OUT, f'{name}_boden_vorher')
        if STADT.get('tgt'):
            # Schleusingen as published: the live tiles (roofs printed), no cells
            E("document.querySelectorAll('#toast').forEach(e => e.style.visibility = 'hidden'); document.querySelector('#menu [data-spot=schleusingen]').click()")
            t0 = time.time()
            while time.time() - t0 < 200:
                E("GAME.step(0.5)")
                if E("SCHL.status().state === 'ready' && WELT.state().loading === 0"): break
                time.sleep(0.3)
            tg, sp = STADT['tgt'], STADT['sp']
            E(f"(() => {{ const P = GAME.P; P.mode = 'top'; P.tx = {tg['x']}; P.ty = {tg['y']}; P.th = 80; document.body.dataset.mode = 'top'; GAME.step(0.05); }})()")
            for i in range(40):   # the tiles under the new view are asked for a moment later: wait at least 2 s, then until all are in
                E("GAME.step(0.25)")
                if i >= 8 and E("WELT.state().loading === 0"): break
                time.sleep(0.3)
            lib.shot(pg, OUT, 'stadt_top_vorher')
            if sp:
                E(f"(() => {{ document.body.dataset.mode = 'walk'; GAME.view({sp[0]}, {sp[1]}, KERN.ground({sp[0]}, {sp[1]}) + 1.6, {sp[2]}, -2, 60); for (let i = 0; i < 4; i++) GAME.step(0.25); }})()")
                for _ in range(20):
                    E("GAME.step(0.25)")
                    if E("WELT.state().loading === 0"): break
                    time.sleep(0.3)
                lib.shot(pg, OUT, 'stadt_boden_vorher')
ck.done()
