# feat/schleusingen-ansicht: Schleusingen after private views from the street – facades and the Markt.
# Without a browser (section data): viz3/extra/schleusingen-ansicht/dist/schleusingen-ansicht/fassaden.json is valid
# (tools/schleusingen-ansicht/check.py) and covers the buildings the viewpoints of viz3/extra/schleusingen-ansicht/views.json show.
# In the browser: Orte → Schleusingen, wait for the town and what loads round it; then
#   fassaden – FASSADE has the looks (fassade/ansicht.json from tools/schleusingen-ansicht/ansicht.py) and the town drew its buildings
#              with them: style, wall colour, frames, shutters, slate and timber tones, type, roof colour of SCHL.bld as the look says
#   markt    – the Markt's props of MARKT are there (statue, seated figure, benches, planters, bollards …), at most +4 draw calls at
#              the Markt and no new shader programs
#   bilder   – model pictures from the viewpoints (the model only; the private views stay on the chat machine) → out/schleusingen_ansicht/
# The world tiles come from the published site (as viz3/test/laeden.py).
#   python3 viz3/test/schleusingen_ansicht.py PORT [sections]      sections: data,fassaden,markt,bilder (default all);
#   bilder=N: only N viewpoints spread evenly over the list (the CI – each picture waits up to a minute for the world round it)
#   environment: SA_VIEWS=v000,v010 (only these pictures), SA_DUMP=1 (the town's buildings with their feet → out/…/stadt_dump.json)
import sys, os, json, time, math, urllib.request, concurrent.futures, base64, subprocess
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__))); import lib
port = sys.argv[1] if len(sys.argv) > 1 else '8951'
ARGS = (sys.argv[2] if len(sys.argv) > 2 and sys.argv[2] else 'data,fassaden,markt,bilder').split(',')
want = set(a.split('=')[0] for a in ARGS)
NB = next((int(a.split('=')[1]) for a in ARGS if a.startswith('bilder=')), 0)  # 0: every viewpoint
ck = lib.Checks('schleusingen_ansicht')
OUT = lib.out('schleusingen_ansicht')
EXTRA = os.path.join(lib.ROOT, 'viz3', 'extra', 'schleusingen-ansicht')
VIEWS = json.load(open(os.environ.get('SA_VIEWS_FILE') or os.path.join(EXTRA, 'views.json')))  # SA_VIEWS_FILE: other viewpoints (model only)
FASS_P = os.path.join(EXTRA, 'dist', 'schleusingen-ansicht', 'fassaden.json')
ANSICHT_P = os.path.join(EXTRA, 'dist', 'fassade', 'ansicht.json')
SITE = os.environ.get('WELT_SITE', 'https://mynametouse.github.io/pavillon-ratscher/welt-test/')
DIST = os.path.join(lib.ROOT, 'viz3', 'dist', 'welt-test')
XF = json.load(open(os.path.join(lib.ROOT, 'viz3', 'manifests.json')))['geoman']['xf']
MARKT = (-1084.7, 1241.9)
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
BROWSER = [s for s in ('fassaden', 'markt', 'bilder') if s in want]
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
    if NB and len(views) > NB:
        views = [views[round(k * (len(views) - 1) / max(1, NB - 1))] for k in range(NB)]
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
            AN = json.load(open(ANSICHT_P))['b']
            fs = J("FASSADE.ansichtStand()")
            ck('FASSADE has the looks of the street views (fassade/ansicht.json over gebaeude/ansicht.json)',
               fs['done'] and not fs['err'] and fs['keys'] >= len(AN), json.dumps(fs))
            # each look laid over the town's style once more changes nothing: the town drew the building with it
            res = J("""(() => { const out = { ok: 0, off: [], miss: [], roof: [], kinds: {} }, A = %s;
                const close = (p, q) => !!p && !!q && p.every((v, j) => Math.abs(v - q[j]) < 2e-3);
                for (const k in A) { if (k[0] !== '#') continue; const i = +k.slice(1), b = SCHL.bld.find(q => q.i === i);
                  if (!b) { out.miss.push(i); continue; }
                  const L = FASSADE.ansichtOf(b), n = L ? FASSADE.ansichtStil(b.st, L) : null;
                  if (!n || n.style !== b.st.style || !close(n.col, b.st.col) || n.frame !== b.st.frame || !!n.shutters !== !!b.st.shutters ||
                      (n.slate || 0) !== (b.st.slate || 0) || n.timber !== b.st.timber || (n.typ || 0) !== (b.st.typ || 0)) { out.off.push(i); continue; }
                  const rc = FASSADE.ansichtDach(L); if (rc && !close(rc, b.rc)) out.roof.push(i);
                  out.ok++; out.kinds[L.material] = (out.kinds[L.material] || 0) + 1; }
                return out; })()""" % json.dumps(AN))
            NT = len([k for k in AN if k[0] == '#'])
            ck('the town draws the buildings as read: style, wall colour, frames, shutters, slate and timber tones, type, roof colour',
               res['ok'] >= NT - len(res['miss']) and not res['off'] and not res['roof'] and len(res['miss']) <= 3,
               f"{res['ok']} as read; off: {res['off'][:10]}; roof off: {res['roof'][:10]}; not in the town (shops build themselves): {res['miss']}; {res['kinds']}")
            # Ratscher's houses: FASSADE finds their looks by the village's ids (painted onto the village's walls when it stands)
            RK = [k for k in AN if k.startswith('ratscher:')]
            rv = J("(() => { const A = %s; return A.map(k => !!FASSADE.ansichtOf({ vid: +k.split(':')[1] })); })()" % json.dumps(RK))
            ck("Ratscher's houses have their looks (ratscher:<id>)", all(rv) and len(rv) == len(RK), json.dumps(dict(zip(RK, rv))))
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
        if 'bilder' in want:
            done = 0
            for v in views:
                x, y = v['x'], v['y']
                E(f"GAME.setView3(false, true); GAME.view({x}, {y}, KERN.ground({x}, {y}) + {v['eye']}, {v['yaw']}, {v['pitch']}, {v['vfov']})")
                settle(60)
                E(f"GAME.view({x}, {y}, KERN.ground({x}, {y}) + {v['eye']}, {v['yaw']}, {v['pitch']}, {v['vfov']})")
                d = E("(() => { GAME.shot(); return document.querySelector('#stage canvas').toDataURL('image/jpeg', 0.88); })()")
                open(os.path.join(OUT, v['name'] + '.jpg'), 'wb').write(base64.b64decode(d.split(',')[1]))
                cam = J(f"({{ z: KERN.ground({x}, {y}) }})")
                json.dump({**v, **cam}, open(os.path.join(OUT, v['name'] + '.json'), 'w'))
                done += 1
                print('view', v['name'], flush=True)
            ck('model pictures from every viewpoint', done == len(views), f'{done} of {len(views)}')
        ck.errors(errs)
ck.done()
