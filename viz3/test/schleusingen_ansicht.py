# feat/schleusingen-ansicht: Schleusingen after private views from the street – facades and the Markt.
# Without a browser (section data): viz3/extra/schleusingen-ansicht/dist/schleusingen-ansicht/fassaden.json is valid
# (tools/schleusingen-ansicht/check.py) and covers the buildings the viewpoints of viz3/extra/schleusingen-ansicht/views.json show.
# In the browser: Orte → Schleusingen, wait for the town and what loads round it; then
#   fassaden – the game uses the data for the right buildings (style, wall and roof colour of SCHL.bld as in the data)
#   markt    – the Markt's props of MARKT are there (statue, seated figure, benches, planters, bollards …), at most +4 draw calls at
#              the Markt and no new shader programs
#   bilder   – model pictures from the viewpoints (the model only; the private views stay on the chat machine) → out/schleusingen_ansicht/
# The world tiles come from the published site (as viz3/test/laeden.py).
#   python3 viz3/test/schleusingen_ansicht.py PORT [sections]      sections: data,fassaden,markt,bilder (default all)
#   environment: SA_VIEWS=v000,v010 (only these pictures), SA_DUMP=1 (the town's buildings with their feet → out/…/stadt_dump.json)
import sys, os, json, time, math, urllib.request, concurrent.futures, base64, subprocess
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__))); import lib
port = sys.argv[1] if len(sys.argv) > 1 else '8951'
want = set((sys.argv[2] if len(sys.argv) > 2 and sys.argv[2] else 'data,fassaden,markt,bilder').split(','))
ck = lib.Checks('schleusingen_ansicht')
OUT = lib.out('schleusingen_ansicht')
EXTRA = os.path.join(lib.ROOT, 'viz3', 'extra', 'schleusingen-ansicht')
VIEWS = json.load(open(os.path.join(EXTRA, 'views.json')))
FASS_P = os.path.join(EXTRA, 'dist', 'schleusingen-ansicht', 'fassaden.json')
SITE = os.environ.get('WELT_SITE', 'https://mynametouse.github.io/pavillon-ratscher/welt-test/')
DIST = os.path.join(lib.ROOT, 'viz3', 'dist', 'welt-test')
XF = json.load(open(os.path.join(lib.ROOT, 'viz3', 'manifests.json')))['geoman']['xf']
MARKT = (-1084.7, 1241.9)
# section vorschau: the data applied in the page to the town's wall and roof meshes (attributes only: style, colour, pack, flags, bays; roof kind
# and colour by footprint) – what the hook in welt/schleusingen.js will show, for pictures before it exists (test only, nothing shipped)
VORSCHAU_JS = """(() => {
  const W = SCHL.meshes.find(m => m.name === 'schleusingen walls'), R = SCHL.meshes.find(m => m.name === 'schleusingen roofs');
  const byI = new Map(SCHL.bld.map(b => [b.i, b])), looks = new Map();
  for (const [i, b] of byI) { const r = SAFASS.record(i); if (r && SALOOK.matches(r, b.cx, b.cy)) looks.set(i, { o: SALOOK.look(r, b.st), rf: SALOOK.roof(r, !!b.fl), b }); }
  const g = W.geometry, aW = g.attributes.aW, aV = g.attributes.aV, aC = g.attributes.aC, aD = g.attributes.aD;
  let nv = 0;
  for (let v = 0; v < aW.count; v++) {
    const L = looks.get(Math.floor(Math.round(aW.getW(v)) / 4)); if (!L) continue; const o = L.o;
    const blind = Math.abs(aV.getY(v) - 0.5) < 1e-3; // a party wall: half-timbering there is plaster (as building() does)
    aV.setW(v, blind && (o.style === 5 || o.style === 6) ? 0 : o.style);
    aC.setXYZW(v, o.col[0], o.col[1], o.col[2], o.timber + 4 * o.frame + 16 * o.door + 128 * o.shut + 512 * (o.slate || 0));
    const fl = Math.round(aD.getW(v)); aD.setW(v, (fl & 1) + (o.shutters ? 2 : 0) + (o.orn ? 4 : 0) + (fl & 8));
    if (aD.getY(v) > 0 || aV.getY(v) > 0.5) aD.setZ(v, o.sp);
    nv++;
  }
  aV.needsUpdate = aC.needsUpdate = aD.needsUpdate = true;
  const lin = c => (c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4));
  const inP = (f, x, y) => { let c = false; for (let p = 0, q = f.length - 2; p < f.length; q = p, p += 2) { const xi = f[p], yi = f[p + 1], xj = f[q], yj = f[q + 1]; if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) c = !c; } return c; };
  const rg = R.geometry, P = rg.attributes.position, aR = rg.attributes.aR; let nr = 0;
  const grid = new Map(); for (const [i, L] of looks) { const f = L.b.f; let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9; for (let k = 0; k < f.length; k += 2) { x0 = Math.min(x0, f[k]); x1 = Math.max(x1, f[k]); y0 = Math.min(y0, f[k + 1]); y1 = Math.max(y1, f[k + 1]); }
    for (let gx = Math.floor((x0 - 1) / 8); gx <= Math.floor((x1 + 1) / 8); gx++) for (let gy = Math.floor((y0 - 1) / 8); gy <= Math.floor((y1 + 1) / 8); gy++) { const key = gx + ',' + gy; if (!grid.has(key)) grid.set(key, []); grid.get(key).push(L); } }
  for (let v = 0; v < P.count; v += 3) {
    const x = (P.getX(v) + P.getX(v + 1) + P.getX(v + 2)) / 3, y = -(P.getZ(v) + P.getZ(v + 1) + P.getZ(v + 2)) / 3;
    const cand = grid.get(Math.floor(x / 8) + ',' + Math.floor(y / 8)); if (!cand) continue;
    const L = cand.find(c => inP(c.b.f, x, y)) || cand.find(c => { const f = c.b.f; for (let k = 0; k < f.length; k += 2) if (Math.hypot(f[k] - x, f[k + 1] - y) < 1.2) return true; return false; });
    if (!L || !L.rf) continue;
    for (let w = v; w < v + 3; w++) { const k = Math.round(aR.getX(w)); if (k > 13 && k < 17) continue; aR.setXYZW(w, k <= 4 ? L.rf.rk : k, lin(L.rf.rc[0]), lin(L.rf.rc[1]), lin(L.rf.rc[2])); }
    nr++;
  }
  aR.needsUpdate = true; if (window.markDirty) markDirty(true);
  return { looks: looks.size, wallVerts: nv, roofTris: nr };
})()"""


def utm(x, y):
    return XF['a'] * x - XF['b'] * y + XF['ex'], XF['b'] * x + XF['a'] * y + XF['ey']


def fetch_tiles(centres, half=420):
    """the world tiles round the viewpoints (levels 10-12) into dist/welt-test/ (as viz3/test/laeden.py)"""
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


# ---------------------------------------------------------------- without a browser ------------------------------------------------
if 'data' in want:
    r = subprocess.run([sys.executable, os.path.join(lib.ROOT, 'tools', 'schleusingen-ansicht', 'check.py')], capture_output=True, text=True)
    ck('fassaden.json is valid (tools/schleusingen-ansicht/check.py)', r.returncode == 0, (r.stdout + r.stderr).strip()[-400:])

# ---------------------------------------------------------------- in the browser -----------------------------------------------------
BROWSER = [s for s in ('fassaden', 'markt', 'bilder', 'vorschau') if s in want]
if 'ratscher' in want:
    # Ratscher's houses (world/village.js) with their walls and looks, and model pictures from the viewpoints of
    # viz3/extra/schleusingen-ansicht/views_ratscher.json (the village loads at the start)
    RV = json.load(open(os.path.join(EXTRA, 'views_ratscher.json')))
    only = set(filter(None, os.environ.get('SA_VIEWS', '').split(',')))
    with lib.browser() as b:
        errs = []
        pg = lib.page(b, 1024, 576, errs, tier='hoch')
        lib.boot(pg, port)
        E = pg.evaluate
        J = lambda js: json.loads(E("JSON.stringify(" + js + ")"))
        E("document.querySelectorAll('#toast,#hud,#topbar,#minimap,#joy,.hud').forEach(e => e.style.visibility = 'hidden')")
        E("if (window.DN && !DN.active) GAME.setMode('auto'); CLOCK.t = Math.floor(CLOCK.t / 1440) * 1440 + 14 * 60; DN.update(true)")
        lib.settle_light(pg)
        n = J("VILLAGE.ready ? VILLAGE.bld.length : 0")
        ck('the village stands', n > 100, f'{n} buildings')
        dump = J("VILLAGE.bld.map(b => ({ id: b.id, typ: b.typ, st: b.st ? b.st.style : null, col: b.st && b.st.col ? b.st.col.map(c => +c.toFixed(3)) : null, "
                 "q: b.quads.map(q => [+q.ax.toFixed(2), +q.ay.toFixed(2), +q.bx.toFixed(2), +q.by.toFixed(2), +q.foot.toFixed(2), +q.ta.toFixed(2), +q.tb.toFixed(2)]) }))")
        gz = {v['name']: J(f"KERN.ground({v['x']}, {v['y']})") for v in RV}
        json.dump({'bld': dump, 'ground': gz}, open(os.path.join(OUT, 'ratscher_dump.json'), 'w'))
        done = 0
        for v in RV:
            if only and v['name'] not in only: continue
            x, y = v['x'], v['y']
            E(f"GAME.setView3(false, true); GAME.view({x}, {y}, KERN.ground({x}, {y}) + {v['eye']}, {v['yaw']}, {v['pitch']}, {v['vfov']}); for (let i = 0; i < 6; i++) GAME.step(0.25)")
            time.sleep(0.5)
            E(f"GAME.view({x}, {y}, KERN.ground({x}, {y}) + {v['eye']}, {v['yaw']}, {v['pitch']}, {v['vfov']})")
            d = E("(() => { GAME.shot(); return document.querySelector('#stage canvas').toDataURL('image/jpeg', 0.86); })()")
            open(os.path.join(OUT, v['name'] + '.jpg'), 'wb').write(base64.b64decode(d.split(',')[1]))
            done += 1
        ck('model pictures from the Ratscher viewpoints', done == len([v for v in RV if not only or v['name'] in only]), f'{done}')
        ck.errors(errs)
if BROWSER:
    only = set(filter(None, os.environ.get('SA_VIEWS', '').split(',')))
    views = [v for v in VIEWS if not only or v['name'] in only]
    fetch_tiles([MARKT, (-1480, 1040), (-1110, 1620), (-650, 1430)])
    with lib.browser() as b:
        errs = []
        pg = lib.page(b, 1366, 559, errs, tier='hoch')
        lib.boot(pg, port)
        E = pg.evaluate
        J = lambda js: json.loads(E("JSON.stringify(" + js + ")"))

        def settle(limit=120):
            t0 = time.time()
            st = None
            while time.time() - t0 < limit:
                E("GAME.step(0.25)")
                st = J("({ w: WELT.state().loading, pq: WELT.padQueue ? WELT.padQueue() : 0, busy: !!(window.GEB && GEB.Z && GEB.Z.busy), "
                       "jobs: window.GEB && GEB.jobs ? GEB.jobs() : 0, d: window.DINGE ? DINGE.areaState().schleusingen || null : null })")
                if st['w'] == 0 and st['pq'] == 0 and not st['busy'] and st['jobs'] == 0 and time.time() - t0 > 4:
                    break
                time.sleep(0.25)
            return st

        E("document.querySelectorAll('#toast,#hud,#topbar,#minimap,#joy,.hud').forEach(e => e.style.visibility = 'hidden')")
        # an autumn afternoon like most of the views (October, 14:00)
        E("if (window.DN && !DN.active) GAME.setMode('auto'); CLOCK.t = Math.floor(CLOCK.t / 1440) * 1440 + 14 * 60; DN.update(true)")
        lib.settle_light(pg)
        E("document.querySelector('#menu [data-spot=schleusingen]').click()")
        t0 = time.time()
        while time.time() - t0 < 300:
            E("GAME.step(0.25)")
            if J("SCHL.status().state") in ('ready', 'error'):
                break
            time.sleep(0.3)
        st = settle(150)
        S0 = J("SCHL.status()")
        ck('the town stands', S0['state'] == 'ready' and S0['buildings'] > 700, json.dumps(S0)[:300] + ' ' + json.dumps(st))
        if os.environ.get('SA_DUMP'):
            dump = J("SCHL.bld.map(b => [b.i, +b.z0.toFixed(2), +b.zmin.toFixed(2), b.st.style, b.st.col.map(c => +c.toFixed(3)), b.rk, b.rc])")
            gz = {v['name']: J(f"KERN.ground({v['x']}, {v['y']})") for v in views}
            json.dump({'bld': dump, 'ground': gz}, open(os.path.join(OUT, 'stadt_dump.json'), 'w'))
            print('dump', len(dump), flush=True)
        if 'fassaden' in want:
            fs = J("SAFASS.status()")
            ck('the facade data is loaded with the town', fs['state'] == 'ready' and fs['n'] >= 100, json.dumps(fs))
            # the hook's path on copies of the town's buildings (SAFASS.apply on a copy: the town itself stays as drawn)
            res = J("""(() => { const out = { ok: 0, off: [], miss: [], kinds: {} }; const D = SAFASS.data.gebaeude;
                for (const r of D) { const b = SCHL.bld.find(q => q.i === r.i); if (!b) { out.miss.push(r.i); continue; }
                  const c = { i: b.i, cx: b.cx, cy: b.cy, st: Object.assign({}, b.st), F: b.F.map(f => f.slice()), fl: b.fl, rk: b.rk, rc: b.rc };
                  if (!SAFASS.apply(c)) { out.off.push(r.i); continue; }
                  const want = SALOOK.look(r, b.st); if (c.st.style !== want.style || c.st.col.join() !== want.col.join()) { out.off.push(r.i); continue; }
                  out.ok++; out.kinds[r.material] = (out.kinds[r.material] || 0) + 1; }
                return out; })()""")
            ck('every record fits its building of the town (centroid within 1 m) and gives the look of SALOOK', res['ok'] >= len(json.load(open(FASS_P))['gebaeude']) - len(res['miss']) and not res['off'],
               f"{res['ok']} fit; off: {res['off'][:10]}; not in the town (shops build themselves): {res['miss']}")
            hooked = J("SCHL.bld.filter(b => b.fass !== undefined).length")
            if hooked:
                bad = J("SCHL.bld.filter(b => b.fass !== undefined).filter(b => { const r = SAFASS.record(b.i); return SALOOK.look(r, b.st).style !== b.st.style; }).map(b => b.i)")
                ck('the town draws the buildings of the data as read (the hook in welt/schleusingen.js)', hooked >= 100 and not bad, f'{hooked} buildings; off: {bad[:10]}')
            else:
                print('note: the hook in welt/schleusingen.js is not there yet – the town draws its own looks', flush=True)
        if 'markt' in want:
            t0 = time.time()
            while time.time() - t0 < 120 and J("SAMARKT.status().state") != 'ready':
                E("GAME.step(0.25)"); time.sleep(0.25)
            ms = J("SAMARKT.status()")
            ck('the Markt\'s things stand: paving and props in two meshes, collisions', ms['state'] == 'ready' and ms['meshes'] == ['markt pflaster', 'markt ausstattung'] and ms['solids'] == 11, json.dumps(ms))
            x, y = -1082.4, 1230.2
            E(f"GAME.setView3(false, true); GAME.view({x}, {y}, KERN.ground({x}, {y}) + 1.6, 316, 8, 70)")
            settle(30)
            fr = J("(() => { const i = GAME.R.info, M = SAMARKT.meshes; i.autoReset = false; i.reset(); GAME.shot(); const a = { calls: i.render.calls, tris: i.render.triangles }; M.forEach(m => m.visible = false); i.reset(); GAME.shot(); const b = { calls: i.render.calls, tris: i.render.triangles }; M.forEach(m => m.visible = true); i.autoReset = true; return { a, b }; })()")
            ck('at most 4 draw calls more at the Markt', fr['a']['calls'] - fr['b']['calls'] <= 4, json.dumps(fr))
            pr = J("(() => { const R = GAME.R, key = m => { const p = R.properties.get(m.material); return p && p.currentProgram ? p.currentProgram : null; }; const town = SCHL.meshes.find(m => m.name === 'schleusingen props'); "
                   "return SAMARKT.meshes.map(m => { const p = key(m); return [m.name, !!p, p ? p.usedTimes : 0, m.material === (town && town.material)]; }); })()")
            ck('no new shader program: the paving shares the program of the town\'s signs, the props use the town\'s props material',
               all(p[1] for p in pr) and pr[0][2] >= 2 and pr[1][3], json.dumps(pr))
            gap = J("(() => { const p = SAMARKT.meshes[0].geometry.attributes.position.array, d = []; for (let k = 0; k < p.length; k += 3 * 37) d.push(p[k + 1] - KERN.ground(p[k], -p[k + 2])); return [Math.min(...d), Math.max(...d), d.length]; })()")
            ck('the paving lies 2–5 cm above the ground everywhere', gap[0] >= 0.019 and gap[1] <= 0.05, json.dumps(gap))
            col = J("(() => { const S = SAMARKT.spots, out = []; for (const [x, y] of S.PLANTERS) { const p = [x + 0.2, y + 0.1]; KERN.pushOut(p, 0.3); out.push(+Math.hypot(p[0] - x, p[1] - y).toFixed(2)); } const p = [S.FIGURE.x, S.FIGURE.y]; KERN.pushOut(p, 0.3); out.push(+Math.hypot(p[0] - S.FIGURE.x, p[1] - S.FIGURE.y).toFixed(2)); return out; })()")
            ck('one cannot walk through the planters and the figure', all(d > 0.9 for d in col[:4]) and col[4] > 0.5, json.dumps(col))
            for nm, (x, y, yaw, pitch, h) in {'markt_brunnen': (-1083.5, 1229.0, 340, 2, 1.6), 'markt_figur': (-1088.6, 1234.3, 35, -4, 1.6),
                                               'markt_baenke': (-1080.3, 1228.5, 0, -8, 1.7), 'markt_oben': (-1084.7, 1241.9, 0, 0, 0)}.items():
                if nm == 'markt_oben':
                    E("GAME.orbit(200, 55, 38, [-1084.7, 1239.0, KERN.ground(-1084.7, 1239.0)])"); E("GAME.shot()")
                else:
                    E(f"GAME.setView3(false, true); GAME.view({x}, {y}, KERN.ground({x}, {y}) + {h}, {yaw}, {pitch}, 62)"); E("GAME.step(0.05)")
                    E(f"GAME.view({x}, {y}, KERN.ground({x}, {y}) + {h}, {yaw}, {pitch}, 62)")
                lib.shot(pg, OUT, nm)
        if 'vorschau' in want:
            pv = J(VORSCHAU_JS)
            ck('the preview applies the data to the town\'s meshes', pv['looks'] >= 100 and pv['wallVerts'] > 1000 and pv['roofTris'] > 500, json.dumps(pv))
        if 'bilder' in want or 'vorschau' in want:
            done = 0
            for v in views:
                x, y = v['x'], v['y']
                E(f"GAME.setView3(false, true); GAME.view({x}, {y}, KERN.ground({x}, {y}) + {v['eye']}, {v['yaw']}, {v['pitch']}, {v['vfov']})")
                settle(60)
                E(f"GAME.view({x}, {y}, KERN.ground({x}, {y}) + {v['eye']}, {v['yaw']}, {v['pitch']}, {v['vfov']})")
                d = E("(() => { GAME.shot(); return document.querySelector('#stage canvas').toDataURL('image/jpeg', 0.88); })()")
                open(os.path.join(OUT, v['name'] + ('_vorschau' if 'vorschau' in want else '') + '.jpg'), 'wb').write(base64.b64decode(d.split(',')[1]))
                cam = J(f"({{ z: KERN.ground({x}, {y}) }})")
                json.dump({**v, **cam}, open(os.path.join(OUT, v['name'] + '.json'), 'w'))
                done += 1
                print('view', v['name'], flush=True)
            ck('model pictures from every viewpoint', done == len(views), f'{done} of {len(views)}')
        ck.errors(errs)
ck.done()
