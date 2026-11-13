# Suhl (welt/suhl.js, lazy/suhl.js, lazy/suhl-worker.js): nothing of the city at the start; the zone loads the package; the jump to the
# Markt; ground, buildings and trees of the sample area by distance; ground under the feet and a wall that stops; the drive; the view
# from above; night; leaving frees everything; counts against the budgets of docs/plans/plan_suhl.md 3.4; the phone tier.
# The sample set lies in viz3/extra/suhl-laufzeit/dist/suhl/ (copied into dist by the build; the test server serves dist).
# Sections (optional second argument, comma-separated): start,sprung,stufen,boden,fahrt,oben,nacht,frei,zahlen,telefon
#   tag1   the checks of the first day (not in the default run): package and worker, the sky and the top view at Suhl, precision
import sys, os, json, time, math
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import lib

port = sys.argv[1]
ALL = ['start', 'sprung', 'stufen', 'boden', 'fahrt', 'oben', 'nacht', 'frei', 'zahlen', 'telefon']
ONLY = sys.argv[2].split(',') if len(sys.argv) > 2 else ALL
want = lambda k: k in ONLY
ck = lib.Checks('suhl')
OUT = lib.out('suhl')
O = (-4698.2, 12255.7)     # SUHL.O, the centre of Suhl in model metres
MARKT = (-4652.5, 12470.5)

# colours at points of the picture just drawn (u, v in 0..1 from the top left)
PIX = """window.__pix = pts => { GAME.shot(); const c = document.querySelector('#stage canvas'), d = document.createElement('canvas'); d.width = c.width; d.height = c.height;
  const g = d.getContext('2d'); g.drawImage(c, 0, 0);
  return pts.map(([u, v]) => Array.from(g.getImageData(Math.round(u * (c.width - 1)), Math.round(v * (c.height - 1)), 1, 1).data.slice(0, 3))); };
window.__row = (v, x0, x1) => { GAME.shot(); const c = document.querySelector('#stage canvas'), d = document.createElement('canvas'); d.width = c.width; d.height = c.height;
  const g = d.getContext('2d'); g.drawImage(c, 0, 0); const y = Math.round(v * (c.height - 1)), p = g.getImageData(0, y, c.width, 1).data, o = [];
  for (let x = Math.round(x0 * (c.width - 1)); x <= Math.round(x1 * (c.width - 1)); x++) o.push(p[x * 4] + p[x * 4 + 1] + p[x * 4 + 2]); return o; };"""
GRID = [[u, v] for v in (0.08, 0.25, 0.42) for u in (0.1, 0.3, 0.5, 0.7, 0.9)]


def mean(px):
    return [round(sum(p[k] for p in px) / len(px)) for k in range(3)]


def spread(px):
    return max(max(p[k] for p in px) - min(p[k] for p in px) for k in range(3))


def tag1(pg, E, J):
    """The checks of the first day: (a) package and worker, (b) the sky and the top view at Suhl as the browser shows them, (c) precision."""
    res = {}
    E(PIX)
    # --- (b) the sky: only sky in the picture (pitch 35° up), at the garden, at Kloster Veßra and at Suhl, in the four directions ---
    sky = {}
    for name, (x, y, z) in (('garten', (2, -30, 12)), ('vessra', (-8850, -300, 60)), ('suhl', (O[0], O[1], 150))):
        for d, yaw in (('n', 0), ('o', 90), ('s', 180), ('w', 270)):
            E(f"GAME.view({x}, {y}, {z}, {yaw}, 35, 60)")
            px = J(f"__pix({json.dumps(GRID)})")
            sky[name + '_' + d] = {'mean': mean(px), 'spread': spread(px)}
            lib.shot(pg, OUT, f'tag1_himmel_{name}_{d}')
    res['sky'] = sky
    res['sky_mesh'] = J("""(() => { const s = GAME.scene.children.find(o => o.geometry && o.geometry.type === 'SphereGeometry' && o.geometry.parameters.radius > 5000);
        return s ? { r: s.geometry.parameters.radius, pos: s.position.toArray(), bg: GAME.scene.background ? String(GAME.scene.background.getHexString ? GAME.scene.background.getHexString() : 'tex') : null,
          clear: '#' + GAME.R.getClearColor(new THREE.Color()).getHexString(), far: GAME.cam.far } : null; })()""")
    # the horizon from Suhl towards the garden (the sky sphere stands there) and away from it, level view
    for d, yaw in (('zum_garten', 159), ('weg_vom_garten', 339)):
        E(f"GAME.view({O[0]}, {O[1]}, 150, {yaw}, 5, 60)")
        lib.shot(pg, OUT, f'tag1_suhl_{d}')
    # --- the view from above over Suhl: where the camera really ends up ---
    res['top'] = J(f"""(() => {{ const P = GAME.P; P.mode = 'top'; P.tx = {O[0]}; P.ty = {O[1]}; P.th = 1500; GAME.shot();
        return {{ want: [{O[0]}, {O[1]}], tx: P.tx, ty: P.ty, th: P.th, cam: GAME.cam.position.toArray().map(v => +v.toFixed(1)) }}; }})()""")
    lib.shot(pg, OUT, 'tag1_oben_suhl')
    E("GAME.P.mode = 'walk'")
    # --- what the ground services say at Suhl before anything of Suhl is there ---
    res['kern'] = J(f"({{ ground: KERN.ground({O[0]}, {O[1]}), terrain: KERN.terrain({O[0]}, {O[1]}), free: KERN.free({O[0]}, {O[1]}), place: KERN.place({O[0]}, {O[1]}) }})")
    # --- (a) the package: the zone has built by now (the camera stood at Suhl); what was handed in, the worker ---
    E(f"GAME.view({O[0]}, {O[1]}, 150, 0, 0, 60)")
    for _ in range(40):
        E("GAME.step(0.3)")
        if J("SUHL.status()").get('loaded'):
            break
        time.sleep(0.3)
    res['status'] = J("SUHL.status()")
    try:
        res['handed'] = json.loads(E("SUHL.load().then(a => JSON.stringify(a.probe.handed()))"))
        res['worker'] = json.loads(E("SUHL.load().then(a => a.probe.worker(new URL('index.html', document.baseURI).href)).then(r => JSON.stringify({ a: Array.from(r.a), status: r.status, href: r.href, module: r.module }))"))
    except Exception as e:
        res['pkg_error'] = str(e)[:400]
    res['resources'] = J("performance.getEntriesByType('resource').filter(e => /lazy\\/suhl|\\/suhl\\//.test(e.name)).map(e => e.name.replace(location.origin, ''))")
    # --- (c) precision 13 km from the origin: 2 mm bars seen from 12 cm, absolute coordinates below, local origin above ---
    try:
        lad = json.loads(E(f"SUHL.load().then(a => JSON.stringify(a.probe.ladders({O[0]}, {O[1]}, 200)))"))
        c = lad['cam']
        E(f"GAME.view({c[0]}, {c[1]}, {c[2]}, 0, 0, 60)")
        E("GAME.step(0.05)")
        E(f"GAME.view({c[0]}, {c[1]}, {c[2]}, 0, 0, 60)")
        lib.shot(pg, OUT, 'tag1_praezision')
        rows = {}
        for k, p in lad['rows'].items():
            v = J(f"(() => {{ GAME.shot(); const q = new THREE.Vector3({p[0]}, {p[2]}, {-p[1]}).project(GAME.cam); return (1 - q.y) / 2; }})()")
            line = J(f"__row({v}, 0, 1)")
            # bright runs = bars: their widths and the gaps between them in pixels
            runs, cur, on = [], 0, False
            for s in line:
                b = s > 380
                if b != on:
                    if cur: runs.append((on, cur))
                    on, cur = b, 0
                cur += 1
            bars = [n for b, n in runs[1:-1] if b]
            gaps = [n for b, n in runs[1:-1] if not b]
            rows[k] = {'v': round(v, 3), 'bars': len(bars), 'bar_px': [min(bars), max(bars)] if bars else None, 'gap_px': [min(gaps), max(gaps)] if gaps else None,
                       'widths': bars[:40]}
        res['precision'] = rows
        res['step_float32'] = J(f"[Math.fround({O[1]} + 0.0004) - Math.fround({O[1]}), Math.fround({O[1]} + 0.0006) - Math.fround({O[1]})]")
        E("SUHL.load().then(a => a.probe.clear())")
    except Exception as e:
        res['precision_error'] = str(e)[:400]
    json.dump(res, open(os.path.join(OUT, 'tag1.json'), 'w'), indent=1)
    print('TAG1', json.dumps(res), flush=True)
    s = res['sky']
    ck('tag1: the package loaded through the zone and got three.js, KERN, WELT', bool(res.get('handed')) and res['handed'].get('sameThree') and res['handed'].get('kern') and res['handed'].get('welt'), json.dumps(res.get('handed') or res.get('pkg_error')))
    ck('tag1: the module worker answers, transfers a typed array and may fetch', bool(res.get('worker')) and res['worker'].get('a') == [2, 4, 7] and res['worker'].get('status') == 200, json.dumps(res.get('worker')))
    ck('tag1: precision measured', 'precision' in res, json.dumps(res.get('precision') or res.get('precision_error')))
    print('tag1 sky', json.dumps(s), flush=True)


def desktop():
    """the sections on a computer (one page for all of them)"""
    with lib.browser() as b:
        errs = []
        pg = lib.page(b, 1100, 680, errs, tier='mittel')
        lib.boot(pg, port)
        E = pg.evaluate
        J = lambda s: json.loads(E('JSON.stringify(' + s + ')'))
        E("document.querySelectorAll('#toast').forEach(e => e.style.visibility = 'hidden'); GAME.setView3(false)")
        st0 = J("""{ s: SUHL.status(), res: performance.getEntriesByType('resource').filter(e => /lazy\\/suhl|\\/suhl\\//.test(e.name)).length,
            progs: (GAME.R.info.programs || []).length, tex: GAME.R.info.memory.textures, geo: GAME.R.info.memory.geometries, kern: KERN.providers(), welt: WELT.state() }""")
        print('start', json.dumps(st0), flush=True)
        if want('start'):
            ck('nothing of Suhl at the start: no request, no package, the zone idle', st0['s']['state'] == 'idle' and not st0['s']['loaded'] and st0['res'] == 0 and st0['s']['zone'] == 'idle', json.dumps(st0['s']))
            kz = J("""{ sc: (KERN.scenario('suhl') || {}).label || null, menu: (KERN.scenario('suhl') || {}).menu, spots: ['suhl', 'suhl_steinweg', 'suhl_bahnhof', 'suhl_ccs'].map(n => !!KERN.spots()[n]),
                chip: !!document.querySelector('#menu [data-spot=suhl]'), ll: SUHL.toLatLon(SUHL.O[0], SUHL.O[1]), back: SUHL.toModel(50.6086518, 10.6926437), utm: SUHL.toUTM(SUHL.O[0], SUHL.O[1]) }""")
            ck('a zone of the core, the start situation and the places to jump to; no menu entry without ?suhl=1', bool(kz['sc']) and kz['menu'] is False and all(kz['spots']) and not kz['chip'], json.dumps(kz))
            ck('SUHL.toLatLon / toModel / toUTM: the centre of Suhl (50.60865 N, 10.69264 E = UTM 619765, 5607674)',
               abs(kz['ll'][0] - 50.60865) < 2e-5 and abs(kz['ll'][1] - 10.69264) < 2e-5 and math.hypot(kz['back'][0] - O[0], kz['back'][1] - O[1]) < 0.2 and abs(kz['utm'][0] - 619765) < 1.5 and abs(kz['utm'][1] - 5607674) < 1.5, json.dumps(kz))
            ck('the contract answers before the package is there', J("[SUHL.near, SUHL.levelAt(-4700, 12300), SUHL.building('x'), SUHL.ground(-4700, 12300) === undefined, SUHL.quarters().length, !!SUHL.areas.zentrum]") == [False, -1, None, True, 0, True])
        if want('tag1'):
            tag1(pg, E, J)

        def wait(cond, limit=240, step=0.25):
            """step the world until the page says cond (a JS expression) – True if it came"""
            t0 = time.time()
            while time.time() - t0 < limit:
                E(f"GAME.step({step})")
                if E(cond):
                    return True
                time.sleep(0.15)
            return False

        QUIET = "SUHL.state === 'ready' && WELT.state().loading === 0 && SUHL.status().stadt.queue === 0 && SUHL.status().boden.farLoading === 0 && SUHL.status().worker === 0"
        need_city = any(want(k) for k in ('sprung', 'stufen', 'boden', 'fahrt', 'oben', 'nacht', 'frei', 'zahlen'))
        if need_city:
            # the memory before the visit, measured where it is measured again afterwards: in the garden
            E("GAME.go('garten')")
            for _ in range(12):
                E("GAME.step(0.5)")
            mem0 = J("{ tex: GAME.R.info.memory.textures, geo: GAME.R.info.memory.geometries, progs: (GAME.R.info.programs || []).length }")
            # ---- the jump: Orte → Suhl (the spot of the menu entry; the entry itself shows only with ?suhl=1) ----
            t0 = time.time()
            E("GAME.go('suhl')")
            ok = wait("SUHL.state === 'ready' || SUHL.state === 'error'", 120)
            ok = ok and wait(f"SUHL.levelAt({MARKT[0]}, {MARKT[1]}) === 1", 240)
            wait(QUIET, 240)
            E("GAME.step(1)")
            dt = time.time() - t0
            s = J("SUHL.status()")
            print('loaded', json.dumps(s), flush=True)
            p = J("{ x: GAME.P.x, y: GAME.P.y, feet: GAME.P.feet, g: KERN.ground(GAME.P.x, GAME.P.y), w: WELT.heightAt(GAME.P.x, GAME.P.y) ?? null, place: KERN.place(GAME.P.x, GAME.P.y), free: KERN.free(GAME.P.x, GAME.P.y) }")
            res = J("performance.getEntriesByType('resource').filter(e => /lazy\\/suhl|\\/suhl\\//.test(e.name)).map(e => [e.name.replace(location.origin, ''), e.transferSize || e.encodedBodySize || 0])")
            nbytes = sum(r[1] for r in res)
            print('at the Markt', json.dumps(p), f'{len(res)} requests, {nbytes / 1e6:.2f} MB, {round(dt)} s', flush=True)
        if want('sprung'):
            st, bo = s.get('stadt') or {}, s.get('boden') or {}
            ck('the jump to Suhl: the zone built, the package and the index loaded', s['state'] == 'ready' and s['zone'] == 'ready' and s['loaded'] and not s['err'], json.dumps({k: s.get(k) for k in ('state', 'zone', 'err', 'versions', 'products', 'times')}))
            ck('at the Markt, on Suhl\'s own ground', math.hypot(p['x'] - MARKT[0], p['y'] - MARKT[1]) < 3 and p['free'] is True and (p['place'] or '').startswith('Suhl'), json.dumps(p, ensure_ascii=False))
            ck('ground under the feet: the near tiles of Suhl\'s set in WELT', p['w'] is not None and abs(p['feet'] - p['g']) < 0.05 and abs(p['g'] - p['w']) < 0.01 and '+suhl/' in s['boden'].get('sets', J("WELT.state().sets")), json.dumps(p) + ' ' + J("WELT.state().sets"))
            ck('buildings in full around the Markt (level 1), from the records', st.get('l1', 0) >= 4 and st.get('buildings', 0) > 500 and st.get('err') == 0 and st.get('mats'), json.dumps(st))
            ck('trees of the sample tiles', st.get('trees', 0) >= 4 and st.get('nTrees', 0) > 1000 and st.get('atlas'), f"{st.get('nTrees')} trees in {st.get('trees')} tiles")
            ck('the far ground beyond the near tiles', bo.get('farDrawn', 0) >= 1 and bo.get('err') == 0 and bo.get('tileMat'), json.dumps(bo))
            ck('data until the first street picture within the budget (10 MB)', 0 < nbytes < 10e6, f'{nbytes / 1e6:.2f} MB in {len(res)} requests')
            # pictures: from the spot, along the Steinweg, from a roof height, from above
            lib.settle_light(pg)
            lib.shot(pg, OUT, 'suhl_markt')
            for name, (x, y, dz, yaw, pitch) in {'markt_s': (MARKT[0], MARKT[1], 1.7, 200, 2), 'markt_w': (MARKT[0], MARKT[1], 1.7, 290, 4), 'steinweg': (-4753.5, 12321.8, 1.7, 215, 3),
                                                 'schraeg': (-4560, 12600, 90, 215, -24), 'hoch': (-4300, 12900, 260, 222, -30)}.items():
                z = J(f"KERN.ground({x}, {y})")
                E(f"GAME.view({x}, {y}, {z + dz}, {yaw}, {pitch}, 62)")
                wait(QUIET, 120)
                lib.shot(pg, OUT, 'suhl_' + name)
            E("GAME.go('suhl')")
            wait(QUIET, 120)

        # draw calls and triangles of one full picture, of everything and of what belongs to Suhl (its meshes and the tiles of its ground)
        COUNT = r"""(() => { const R = GAME.R, I = { all: [0, 0], suhl: [0, 0], welt: [0, 0] }, rbd = R.renderBufferDirect;
          R.renderBufferDirect = function (camera, scene, geometry, material, object, group) {
            if (scene) { const n = geometry.index ? geometry.index.count : geometry.attributes.position ? geometry.attributes.position.count : 0,
              t = Math.round((group ? group.count : n) / 3) * (object.isInstancedMesh ? object.count : 1), nm = object.name || '';
              for (const k of ['all', nm.startsWith('suhl ') ? 'suhl' : nm.startsWith('welt ') ? 'welt' : null]) if (k) { I[k][0]++; I[k][1] += t; } }
            return rbd.call(this, camera, scene, geometry, material, object, group); };
          try { GAME.film(0, true); } finally { R.renderBufferDirect = rbd; }
          let lights = 0; GAME.scene.traverse(o => { if (o.isPointLight || o.isSpotLight) lights++; });
          return JSON.stringify({ calls: I.all[0], tris: I.all[1], suhlCalls: I.suhl[0], suhlTris: I.suhl[1], weltCalls: I.welt[0], weltTris: I.welt[1], lights,
            progs: (R.info.programs || []).length, tex: R.info.memory.textures, geo: R.info.memory.geometries }); })()"""

        if want('stufen'):
            # ---- levels by distance: full houses near, the lean level far, nothing of the near ground from 2 km away ----
            far_tile = (-5597.9, 11658.5)   # the centre of tile 495/540, 1.25 km from the Markt
            lv = J(f"[SUHL.levelAt({MARKT[0]}, {MARKT[1]}), SUHL.levelAt({far_tile[0]}, {far_tile[1]}), SUHL.levelAt(0, 0)]")
            ck('levels at the Markt: full houses here (1), the lean level 1.2 km away (2), nothing outside Suhl (-1)', lv == [1, 2, -1], str(lv))
            E(f"GAME.view(-2300, 12500, {J('KERN.ground(-4652, 12470)') + 420}, 268, -12, 55)")
            ok = wait("SUHL.status().stadt.l1 === 0 && SUHL.status().stadt.l2 >= 11 && SUHL.status().stadt.trees === 0 && !SUHL.status().boden.need && SUHL.status().stadt.queue === 0", 120)
            wait("SUHL.status().boden.farLoading === 0 && SUHL.status().worker === 0", 60)
            s2 = J("SUHL.status()")
            ck('from 2 km away: every tile in the lean level, no trees, the near ground not asked for, the far ground drawn',
               ok and s2['boden']['farDrawn'] >= 1 and s2['stadt']['l2'] == 11, json.dumps({'stadt': s2['stadt'], 'boden': s2['boden'], 'd': s2['d']}))
            lib.shot(pg, OUT, 'suhl_fern')
            c = json.loads(E(COUNT))
            ck('the lean level: at most 16 draw calls for the city', 0 < c['suhlCalls'] <= 16 + s2['boden']['farDrawn'], json.dumps(c))
            E("GAME.go('suhl')")
            ok = wait(f"SUHL.levelAt({MARKT[0]}, {MARKT[1]}) === 1", 120)
            r = E(f"SUHL.whenLevel({MARKT[0]}, {MARKT[1]}, 1)")
            ck('back at the Markt the full level returns (SUHL.whenLevel)', ok and r == 1, str(r))
            wait(QUIET, 120)

        if want('boden'):
            # ---- ground and walls: the feet on the tiles, a wall stops the walker, a house answers to its id ----
            g = J("""(() => { const out = []; for (const [dx, dy] of [[0, 0], [60, 20], [-90, -60], [140, -130], [-200, 90]]) { const x = SUHL.SPOTS.suhl[0][0] + dx, y = SUHL.SPOTS.suhl[0][1] + dy;
                out.push([KERN.ground(x, y), WELT.heightAt(x, y) ?? null, SUHL.ground(x, y) ?? null, KERN.free(x, y)]); } return out; })()""")
            ck('ground around the Markt: KERN.ground = the drawn tiles = SUHL.ground, walking allowed', all(q[1] is not None and abs(q[0] - q[1]) < 0.01 and abs(q[2] - q[1]) < 0.01 and q[3] is True for q in g), json.dumps(g))
            b = J(f"""(() => {{ const ids = SUHL.buildingsIn({{ center: [{MARKT[0]}, {MARKT[1]}], r: 160 }}); let best = null;
                for (const id of ids) {{ const B = SUHL.building(id); if (!B || B.kind !== 0) continue;
                  for (const sd of B.sides) {{ if (sd.party || !sd.a || !(sd.len > 8)) continue; const ex = (sd.b[0] - sd.a[0]) / sd.len, ey = (sd.b[1] - sd.a[1]) / sd.len, nx = ey, ny = -ex,
                    mx = (sd.a[0] + sd.b[0]) / 2, my = (sd.a[1] + sd.b[1]) / 2; let free = true;
                    for (const d of [1.5, 3, 4.5]) if (SUHL.buildingAt(mx + nx * d, my + ny * d)) free = false;
                    const q = [mx + nx * 4, my + ny * 4]; KERN.pushOut(q, 0.6); if (Math.hypot(q[0] - mx - nx * 4, q[1] - my - ny * 4) > 0.01) free = false;
                    if (free && (!best || sd.len > best.len)) best = {{ id, len: sd.len, mx, my, nx, ny, n: ids.length, name: B.name, adr: B.adr, levels: B.levels, use: B.use }}; }} }}
                return best; }})()""")
            ck('SUHL.buildingsIn / SUHL.building: the houses around the Markt with their sides', b is not None and b['n'] > 20, json.dumps(b, ensure_ascii=False))
            if b:
                r = J(f"""(() => {{ const mx = {b['mx']}, my = {b['my']}, nx = {b['nx']}, ny = {b['ny']}, x = mx + nx * 4, y = my + ny * 4;
                    GAME.view(x, y, KERN.ground(x, y) + 1.62, Math.atan2(-nx, -ny) * 180 / Math.PI, 0, 60); GAME.step(0.5); GAME.step(5, 1);
                    return {{ d: (GAME.P.x - mx) * nx + (GAME.P.y - my) * ny, feet: GAME.P.feet, g: KERN.ground(GAME.P.x, GAME.P.y), at: SUHL.buildingAt(mx - nx * 1.5, my - ny * 1.5)?.id || null }}; }})()""")
                ck('a house wall stops the walker', 0.1 < r['d'] < 0.7 and abs(r['feet'] - r['g']) < 0.06 and r['at'] == b['id'], json.dumps(r))
                lib.shot(pg, OUT, 'suhl_wand')
            tr = J("""(() => { const C = SUHL.status().stadt; const p = [GAME.P.x + 7, GAME.P.y + 3]; return { trunks: C.trunks, segs: C.segs }; })()""")
            ck('wall feet and trunks in the collisions', tr['segs'] > 3000 and tr['trunks'] > 1000, json.dumps(tr))
            pl = J("[KERN.place(-4753.5, 12321.8), KERN.place(SUHL.SPOTS.suhl[0][0], SUHL.SPOTS.suhl[0][1]), SUHL.areaAt(-4753.5, 12321.8), SUHL.ways(-4753.5, 12321.8, 60).length, SUHL.status().strassen]")
            ck('place names from the street tiles („…, Suhl“), the ways for traffic, the streets painted on the ground', (pl[0] or '').endswith(', Suhl') and pl[2] == 'zentrum' and pl[3] > 0 and pl[4] and pl[4]['overlay'] and pl[4]['err'] == 0, json.dumps(pl, ensure_ascii=False))
            E("GAME.go('suhl')")
            wait(QUIET, 60)

        if want('fahrt'):
            # ---- the drive: by car along a street of the sample area – ground under the wheels, no fall, the tiles come ahead ----
            w = J("""(() => { const c = SUHL.SPOTS.suhl[0], W = SUHL.ways(c[0], c[1], 420).filter(w => ['main', 'county', 'street'].includes(w.kind) && !(w.fl & (1 | 2 | 64 | 128 | 1024)));
                let best = null, bl = 0; for (const w of W) { let l = 0; for (let k = 0; k + 3 < w.p.length; k += 2) l += Math.hypot(w.p[k + 2] - w.p[k], w.p[k + 3] - w.p[k + 1]); if (l > bl) { bl = l; best = w; } }
                return best ? { name: best.name, kind: best.kind, len: bl, w: best.w, p: best.p, n: W.length } : null; })()""")
            ck('a street to drive on from the street tiles (SUHL.ways)', w is not None and w['len'] > 120, json.dumps({k: w[k] for k in ('name', 'kind', 'len', 'w', 'n')} if w else None, ensure_ascii=False))
            if w:
                pts = [[w['p'][k], w['p'][k + 1]] for k in range(0, len(w['p']), 2)]
                a, c2 = pts[0], pts[1]
                E(f"VEH.place('car', {a[0]}, {a[1]}, Math.atan2({c2[0] - a[0]}, {c2[1] - a[1]})); VEH.enter('car'); GAME.setView3(true)")
                wait(QUIET, 120)
                E(f"window._fs = VEH.follow({json.dumps(pts)}, 8, {{ look: 8 }})")
                worst, kmh, edge = 0.0, 0.0, None
                for i in range(70):
                    E("GAME.step(0.5)")
                    v = J("(() => { const c = VEH.state().find(v => v.id === 'car'); return { x: c.x, y: c.y, z: c.z, kmh: c.kmh, g: KERN.ground(c.x, c.y), edge: VEH.edge && VEH.cur ? VEH.edge(VEH.cur) : null, load: WELT.state().loading }; })()")
                    worst, kmh = max(worst, abs(v['z'] - v['g'])), max(kmh, v['kmh'])
                    edge = edge or v['edge']
                    if math.hypot(v['x'] - pts[-1][0], v['y'] - pts[-1][1]) < 12 or (i > 20 and v['kmh'] < 0.5):
                        break
                done = math.hypot(v['x'] - a[0], v['y'] - a[1])
                lib.shot(pg, OUT, 'suhl_fahrt')
                ck('by car along the street: it gets on, the wheels stay on the ground, the ground is there ahead',
                   done > min(100, w['len'] * 0.55) and worst < 1.2 and kmh > 15 and edge is None, json.dumps({'m': round(done), 'of': round(w['len']), 'kmh': kmh, 'dz': round(worst, 2), 'edge': edge, 'end': v}, ensure_ascii=False))
                E("VEH.follow([[0, 0], [0, 1]]); VEH.auto = null; VEH.exit(); GAME.setView3(false)")
                E("GAME.go('suhl')")
                wait(QUIET, 120)

        if want('zahlen'):
            # ---- the budgets of the plan (3.4) at the Markt, on foot ----
            E("GAME.go('suhl')")
            wait(QUIET, 120)
            worst = None
            for yaw in (0, 90, 180, 270):
                E(f"GAME.view({MARKT[0]}, {MARKT[1]}, KERN.ground({MARKT[0]}, {MARKT[1]}) + 1.7, {yaw}, 2, 70)")
                c = json.loads(E(COUNT))
                print('count', yaw, json.dumps(c), flush=True)
                if worst is None or c['suhlCalls'] + c['weltCalls'] > worst['suhlCalls'] + worst['weltCalls']:
                    worst = c
            s3 = J("SUHL.status()")
            ck('draw calls for Suhl at the Markt within the budget (+180)', 0 < worst['suhlCalls'] + worst['weltCalls'] <= 180, json.dumps(worst))
            ck('triangles for Suhl at the Markt within the budget (+800 000)', worst['suhlTris'] + worst['weltTris'] <= 800000, f"{worst['suhlTris']} Suhl + {worst['weltTris']} ground tiles")
            ck('new shader programs within the budget (+8)', 0 <= worst['progs'] - st0['progs'] <= 8, f"{st0['progs']} → {worst['progs']}")
            ck('no new lights', worst['lights'] == J("(() => { let n = 0; GAME.scene.traverse(o => { if (o.isPointLight || o.isSpotLight) n++; }); return n; })()"), str(worst['lights']))
            ck('building a tile takes no long frame (the meshes of one tile in under 50 ms here)', s3['stadt']['installMs'] < 50, f"{s3['stadt']['installMs']} ms, tiles built {s3['stadt']['built']}")
            tex_mb = (worst['tex'] - st0['tex']) * 512 * 512 * 4 * 1.33 / 1e6
            ck('textures for Suhl within the budget (+300 MB unpacked on a computer)', tex_mb < 300, f"{worst['tex'] - st0['tex']} textures, at most {round(tex_mb)} MB if all were ground tiles")
            good, r = lib.check_gl(pg)
            ck('every shader within 16 textures per stage', good, f"fragment {r['maxFrag']}, vertex {r['maxVert']}, {r['bad'][:3]}")
            json.dump({'worst': worst, 'start': st0, 'status': s3}, open(os.path.join(OUT, 'zahlen.json'), 'w'), indent=1)

        if want('oben'):
            # ---- from above: the plan view over the Zentrum in three heights ----
            E(PIX)
            # (the sample's ground ends 700 m north of the centre: in the 6 km picture only the middle and the south are looked at)
            for th, lvl in ((400, 1), (1500, 2), (6000, 2)):
                E(f"(() => {{ const P = GAME.P; P.mode = 'top'; P.tx = {O[0]}; P.ty = {O[1]}; P.th = {th}; document.body.dataset.mode = 'top'; GAME.shot(); }})()")
                ok = wait(f"SUHL.levelAt({O[0]}, {O[1]}) === {lvl} && SUHL.status().stadt.queue === 0 && WELT.state().loading === 0 && SUHL.status().boden.farLoading === 0", 120)
                E("GAME.step(0.5)")
                r = J(f"({{ tx: GAME.P.tx, ty: GAME.P.ty, th: GAME.P.th, lvl: SUHL.levelAt({O[0]}, {O[1]}), st: SUHL.status().stadt, px: __pix({json.dumps([[u, v] for v in ((0.3, 0.5, 0.7) if th < 3000 else (0.5, 0.56, 0.62)) for u in (0.3, 0.5, 0.7)])}) }})")
                lib.shot(pg, OUT, f'suhl_oben_{th}')
                ck(f'from above, picture {th} m high: over the Zentrum (not held back at 11 km), houses in level {lvl}, no hole in the ground',
                   ok and abs(r['ty'] - O[1]) < 1 and abs(r['tx'] - O[0]) < 1 and r['lvl'] == lvl and all(sum(p) > 45 for p in r['px']), json.dumps({k: r[k] for k in ('tx', 'ty', 'th', 'lvl', 'px')}))
            E("GAME.P.mode = 'walk'; document.body.dataset.mode = 'walk'; GAME.go('suhl')")
            wait(QUIET, 120)

        if want('frei'):
            # ---- leaving: back in the garden everything of Suhl is freed (the zone waits 60 s). three.js counts a geometry or texture
            # when it is first drawn, so a first visit also counts things of the app that were never in a picture before (far tree cells
            # around Ratscher seen from 13 km …). The clean measure: the same round of pictures on two visits – after the second leave
            # the counts must be those after the first. ----
            def runde():
                E("GAME.go('suhl')")
                wait(f"SUHL.levelAt({MARKT[0]}, {MARKT[1]}) === 1", 240)
                wait(QUIET, 240)
                for yaw in (20, 200):
                    E(f"GAME.view({MARKT[0]}, {MARKT[1]}, KERN.ground({MARKT[0]}, {MARKT[1]}) + 1.7, {yaw}, 2, 70); GAME.shot()")
                E(f"GAME.view(-4560, 12600, KERN.ground(-4560, 12600) + 90, 215, -24, 62); GAME.shot()")
                E(f"(() => {{ const P = GAME.P; P.mode = 'top'; P.tx = {O[0]}; P.ty = {O[1]}; P.th = 1500; GAME.shot(); }})()")
                wait(f"SUHL.levelAt({O[0]}, {O[1]}) === 2 && SUHL.status().stadt.queue === 0", 120)
                E("GAME.shot(); GAME.P.mode = 'walk'")
                m = J("{ tex: GAME.R.info.memory.textures, geo: GAME.R.info.memory.geometries, progs: (GAME.R.info.programs || []).length }")
                E("GAME.go('garten')")
                ok = wait("SUHL.state === 'idle' && !WELT.state().active", 400, 0.5)
                for _ in range(20):
                    E("GAME.step(0.5)")
                E("GAME.view(3.6, 15.2, 1.7, 200, 0, 70); GAME.shot(); GAME.go('garten')")
                return ok, m, J("{ tex: GAME.R.info.memory.textures, geo: GAME.R.info.memory.geometries, progs: (GAME.R.info.programs || []).length, welt: WELT.state(), over: !!(WELT.overlay && WELT.overlay()) }")

            ok, m1, m2 = runde()
            s4 = J("SUHL.status()")
            n_suhl = J("(() => { let n = 0; GAME.scene.traverse(o => { if ((o.name || '').startsWith('suhl ')) n++; }); return n; })()")
            ck('back in the garden: the zone idle, no mesh of Suhl in the scene, no tile, no overlay',
               ok and s4['state'] == 'idle' and n_suhl == 0 and s4['stadt']['l1'] + s4['stadt']['l2'] + s4['stadt']['trees'] == 0 and s4['boden']['far'] == 0 and m2['welt']['tiles'] == 0 and m2['welt']['lowered'] == 0 and not m2['over'],
               json.dumps({'state': s4['state'], 'stadt': s4['stadt'], 'boden': s4['boden'], 'n': n_suhl}))
            ok3, m3, m4 = runde()
            ck('memory: a second visit leaves nothing behind (geometries, textures, programs after it as after the first, within 3)',
               ok3 and abs(m4['geo'] - m2['geo']) <= 3 and abs(m4['tex'] - m2['tex']) <= 3 and m4['progs'] <= m2['progs'] + 1,
               f"before any visit {mem0['geo']} geometries / {mem0['tex']} textures / {mem0['progs']} programs; in Suhl {m1['geo']} / {m1['tex']} / {m1['progs']}; after the first visit {m2['geo']} / {m2['tex']} / {m2['progs']}; "
               f"in Suhl again {m3['geo']} / {m3['tex']} / {m3['progs']}; after the second {m4['geo']} / {m4['tex']} / {m4['progs']}")
            json.dump({'before': mem0, 'in_suhl': m1, 'after': m2, 'in_suhl_2': m3, 'after_2': m4}, open(os.path.join(OUT, 'frei.json'), 'w'), indent=1)

        if want('nacht'):
            # ---- night: lit windows from the village's clock, no new lights, no new programs ----
            E("GAME.go('suhl')")
            wait(f"SUHL.levelAt({MARKT[0]}, {MARKT[1]}) === 1", 240)
            wait(QUIET, 240)
            c0 = json.loads(E(COUNT))
            E("GAME.setMode('night')")
            lib.settle_light(pg)
            E(f"GAME.view({MARKT[0]}, {MARKT[1]}, KERN.ground({MARKT[0]}, {MARKT[1]}) + 1.7, 200, 4, 70)")
            E("GAME.step(1)")
            c1 = json.loads(E(COUNT))
            n = J("({ night: VILLAGE.night ? VILLAGE.night() : null, uNight: VILLAGE.U ? VILLAGE.U.uNight.value : null })")
            lib.shot(pg, OUT, 'suhl_nacht')
            ck('night at the Markt: the windows follow the village\'s clock, no new light, no new program', c1['lights'] == c0['lights'] and c1['progs'] <= c0['progs'] + 2 and (n['uNight'] or 0) > 0.5, json.dumps({'n': n, 'lights': [c0['lights'], c1['lights']], 'progs': [c0['progs'], c1['progs']]}))
            E("GAME.setMode('day')")
            lib.settle_light(pg)

        ck.errors(errs)


# decoded size of every image a material of the scene uses (each source once) – as viz3/test/memphone.py counts it
TEXMB = """(() => { const seen = new Set(); let mb = 0, n = 0; const add = t => { if (!t || !t.isTexture || t.isRenderTargetTexture) return; const s = t.source; if (!s || seen.has(s)) return; seen.add(s);
    const im = s.data; if (!im || !im.width) return; n++; mb += im.width * im.height * (im.depth || 1) * 4 / 1e6; };
  GAME.scene.traverse(o => { for (const m of o.material ? [].concat(o.material) : []) { for (const k in m) add(m[k]); if (m.uniforms) for (const k in m.uniforms) { const u = m.uniforms[k]; if (u && u.value) [].concat(u.value).forEach(add); } } });
  return JSON.stringify({ n, mb: Math.round(mb * 10) / 10, level: window.TEXHALF ? TEXHALF.level : -1 }); })()"""


def telefon():
    """the phone tier (iPhone 13 context, no tier preset): the images Suhl adds, the shorter radii, every program within 16 textures"""
    from playwright.sync_api import sync_playwright
    with sync_playwright() as p:
        b = p.chromium.launch(args=lib.ARGS)
        ctx = b.new_context(**p.devices['iPhone 13'])
        pg = ctx.new_page()
        errs = []
        pg.on('pageerror', lambda e: errs.append('PAGEERR ' + str(e)))
        lib.boot(pg, port)
        E = pg.evaluate
        J = lambda s: json.loads(E('JSON.stringify(' + s + ')'))
        m0 = json.loads(E(TEXMB))
        res0 = J("performance.getEntriesByType('resource').filter(e => /lazy\\/suhl|\\/suhl\\//.test(e.name)).length")
        E("GAME.go('suhl')")
        t0 = time.time()
        quiet = "SUHL.state === 'ready' && WELT.state().loading === 0 && SUHL.status().stadt.queue === 0 && SUHL.status().boden.farLoading === 0 && SUHL.status().worker === 0"
        ok = False
        while time.time() - t0 < 300:
            E("GAME.step(0.25)")
            if E(f"SUHL.levelAt({MARKT[0]}, {MARKT[1]}) === 1 && " + quiet):
                ok = True
                break
            time.sleep(0.15)
        E("GAME.step(1)")
        s = J("SUHL.status()")
        m1 = json.loads(E(TEXMB))
        print('telefon', json.dumps({'before': m0, 'in_suhl': m1, 'stadt': s.get('stadt'), 'boden': s.get('boden')}), flush=True)
        ck('phone: nothing of Suhl at the start, the city loads at the Markt', res0 == 0 and ok and s['state'] == 'ready', json.dumps({k: s.get(k) for k in ('state', 'err', 'd')}))
        ck('phone: shorter radii (full houses to 500 m, the lean level to 2 km, trees to 420 m)', (s.get('stadt') or {}).get('R') == [500, 2000, 420], str((s.get('stadt') or {}).get('R')))
        ck('phone: the images Suhl adds stay within the budget (+90 MB unpacked)', 0 <= m1['mb'] - m0['mb'] < 90, f"{m0['mb']} → {m1['mb']} MB ({m1['n'] - m0['n']} images, texture level {m1['level']})")
        good, r = lib.check_gl(pg)
        ck('phone: every shader within 16 textures per stage', good, f"fragment {r['maxFrag']}, vertex {r['maxVert']}, {r['bad'][:3]}")
        lib.shot(pg, OUT, 'suhl_telefon')
        ck.errors(errs)
        b.close()


if [k for k in ONLY if k != 'telefon']:
    desktop()
if want('telefon'):
    telefon()
ck.done()
