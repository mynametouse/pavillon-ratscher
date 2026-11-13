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
    ck.errors(errs)
ck.done()
