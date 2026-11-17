# feat/gebaeude (docs/features/gebaeude.md): every building of Ratscher and Schleusingen plausible from outside. The audit FASSADE.audit
# (fassade/fassade.js) before and after the fixes, per kind (tuer, fenster, durchgang, hof) and place; draw calls, triangles and the time
# of a frame where the fixes are (Ratscher: with and without the new meshes; Schleusingen: the same view with ?nofassade in section perf);
# walking through a gateway into a yard and through the castle's gates into its courtyard; pictures – a street in each place by day and
# by night, a passage into a yard from the street and from the yard, a hall with its new windows (before/after, at night), a shed with its
# new door. Sections (second argument, comma-separated): ratscher, schleusingen, perf (default: ratscher,schleusingen).
#   bash tools/browser_lock.sh python3 viz3/test/run.py --port 9044 --serve gebaeude:ratscher
import sys, os, json, time, math, urllib.request, concurrent.futures
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import lib

port = sys.argv[1]
ONLY = sys.argv[2].split(',') if len(sys.argv) > 2 and sys.argv[2] else ['ratscher', 'schleusingen']
want = lambda k: k in ONLY
ck = lib.Checks('gebaeude')
OUT = lib.out('gebaeude')
SITE = os.environ.get('WELT_SITE', 'https://mynametouse.github.io/pavillon-ratscher/welt-test/')
DIST = os.path.join(lib.ROOT, 'viz3', 'dist', 'welt-test')
XF = json.load(open(os.path.join(lib.ROOT, 'viz3', 'manifests.json')))['geoman']['xf']
MARKT = (-1084.7, 1241.9)
COUNT = r"""
(() => {
  // draw calls and triangles of one frame (main passes only); 'static' leaves out what moves and comes and goes between two loads:
  // people (skinned figures and what hangs on their bones), traffic, buses, animals
  const R = GAME.R, I = [0, 0, 0, 0], K = {}, rbd = R.renderBufferDirect, DYN = /verkehr|bus|tiere|fahrt|autos|vogel|strategie|zombie/i;
  const dyn = o => { if (o.isSkinnedMesh) return true; for (let p = o; p; p = p.parent) if (p.isBone || (p.name && DYN.test(p.name))) return true; return false; };
  const key = o => { for (let p = o; p; p = p.parent) if (p.name) return p.name; return o.type; };
  R.renderBufferDirect = function (camera, scene, geometry, material, object, group) {
    const n = geometry.index ? geometry.index.count : geometry.attributes.position ? geometry.attributes.position.count : 0;
    if (scene) { const t = Math.round((group ? group.count : n) / 3) * (object.isInstancedMesh ? object.count : 1); I[0]++; I[1] += t;
      if (!dyn(object)) { I[2]++; I[3] += t; const k = key(object); K[k] = (K[k] || 0) + 1; } }
    return rbd.call(this, camera, scene, geometry, material, object, group);
  };
  let t = 0;
  try { GAME.shot(); const t0 = performance.now(); for (let k = 0; k < 3; k++) GAME.shot(); t = (performance.now() - t0) / 3; } finally { R.renderBufferDirect = rbd; }
  for (const k in K) K[k] = Math.round(K[k] / 4);
  return JSON.stringify({ calls: Math.round(I[0] / 4), tris: Math.round(I[1] / 4), sCalls: Math.round(I[2] / 4), sTris: Math.round(I[3] / 4), ms: Math.round(t), keys: K });
})()
"""


def utm(x, y):
    return XF['a'] * x - XF['b'] * y + XF['ex'], XF['b'] * x + XF['a'] * y + XF['ey']


def fetch_tiles():
    """the world tiles round the Markt (levels 10-12) into dist/welt-test/, as viz3/test/schleusingen.py does"""
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
    meta = json.load(open(os.path.join(DIST, 'meta.json')))
    lv = meta['tiling']['levels']
    jobs = set()
    cs = [utm(MARKT[0] + sx * 650, MARKT[1] + sy * 650) for sx in (-1, 1) for sy in (-1, 1)]
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
    t0 = time.time()
    with concurrent.futures.ThreadPoolExecutor(8) as ex:
        n = sum(ex.map(get, sorted(jobs)))
    print(f'welt tiles: {len(jobs)} files, {n / 1e6:.1f} MB new in {time.time() - t0:.0f} s', flush=True)


def counts(E, ort):
    r = json.loads(E(f"""JSON.stringify((() => {{ const v = FASSADE.audit('{ort}', {{ vorher: true }}), n = FASSADE.audit('{ort}');
        const by = L => {{ const o = {{}}; for (const q of L) {{ const k = q.art + (q.rest ? ' (erklärt)' : '') + ': ' + q.text.replace(/[0-9.]+ m Wand/, 'N m Wand').replace(/[0-9]+ m²/, 'N m²'); o[k] = (o[k] || 0) + 1; }} return o; }};
        return {{ vorher: FASSADE.count(v), nachher: FASSADE.count(n), byV: by(v), byN: by(n), rest: n.filter(q => !q.rest).slice(0, 12), ms: FASSADE.status().ms, nRec: FASSADE.status().nRec, err: FASSADE.status().err }}; }})())"""))
    print(f'audit {ort} vorher', json.dumps(r['vorher']), json.dumps(r['byV'], ensure_ascii=False), flush=True)
    print(f'audit {ort} nachher', json.dumps(r['nachher']), json.dumps(r['byN'], ensure_ascii=False), flush=True)
    print(f'audit {ort} still open (first 12)', json.dumps(r['rest'], ensure_ascii=False), flush=True)
    det = json.loads(E(f"""JSON.stringify(FASSADE.audit('{ort}').filter(q => !q.rest).slice(0, 40).map(q => {{ const b = window.VILLAGE && VILLAGE.byId && VILLAGE.byId.get(q.id);
        return [q.art, q.text, q.id, q.k, q.run, q.nWin, Math.round(q.x), Math.round(q.y), b ? [b.typ, b.st && b.st.style, +b.eave.toFixed(2), +b.area.toFixed(0), b.fac.map(f => [+f.L.toFixed(1), f.kind, +f.t0.toFixed(1), +f.t1.toFixed(1), f.door ? 'T' : ''])] : null]; }}))"""))
    for d in det:
        print('  open', json.dumps(d, ensure_ascii=False), flush=True)
    ck(f'{ort}: the audit covers the buildings of the place', r['nRec'] > {'ratscher': 300, 'zonen': 100}.get(ort, 700) and not r['err'], f"{r['nRec']} buildings {r['err']}")
    return r


def night(E, pg, on):
    E(f"if (!DN.active) GAME.setMode('auto'); CLOCK.t = Math.floor(CLOCK.t / 1440) * 1440 + {22.75 if on else 11.0} * 60; DN.update(true)")
    lib.settle_light(pg)
    E("GAME.step(0.5)")


with lib.browser() as b:
    errs = []
    pg = lib.page(b, 1100, 680, errs, tier='mittel')
    lib.boot(pg, port)
    E = pg.evaluate
    E("document.querySelectorAll('#toast').forEach(e => e.style.visibility = 'hidden'); GAME.setView3(false)")
    night(E, pg, False)
    for _ in range(60):
        E("GAME.step(0.25)")
        if E("FASSADE.state !== 'idle'"):
            break
        time.sleep(0.3)
    st = json.loads(E("JSON.stringify(FASSADE.status())"))
    print('status', json.dumps(st, ensure_ascii=False), flush=True)
    ck('FASSADE is there and has fixed Ratscher', st['state'] == 'ready' and not st['err'], json.dumps(st, ensure_ascii=False))

    if want('ratscher'):
        r = counts(E, 'ratscher')
        v, n = r['vorher'], r['nachher']
        ck('Ratscher: fewer buildings without an entrance', n['tuer'] < v['tuer'] or v['tuer'] == 0, f"tuer {v['tuer']} → {n['tuer']}")
        ck('Ratscher: no hall without a window any more', n['fenster'] <= v['fenster'] and not any('ganz ohne Fenster' in k for k in r['byN'] if 'halle' in k),
           f"fenster {v['fenster']} → {n['fenster']}")
        ck('Ratscher: the audit runs fast enough', max(r['ms'].get('audit ratscher', 0), 1) < 3000, json.dumps(r['ms']))
        # the hall with the most new windows: from 24 m in front of its longest new row, by day, without and with them, and at night
        h = json.loads(E("""JSON.stringify((() => { let best = null; for (const [id, per] of FASSADE.win) for (const k in per) if (!best || per[k] > best.n) best = { id, k: +k, n: per[k] };
            if (!best) return null; const b = VILLAGE.byId.get(best.id), f = b.fac[best.k], u = f.L / 2, x = f.ax + f.dx * u + f.nx * 38, y = f.ay + f.dy * u + f.ny * 38;
            return { id: best.id, n: best.n, L: f.L, x, y, z: KERN.ground(x, y) + 1.7, yaw: Math.atan2(-f.nx, -f.ny) * 180 / Math.PI }; })())"""))
        ck('a hall got a row of stable windows', bool(h) and h['n'] >= 5, json.dumps(h))
        if h:
            E(f"GAME.view({h['x']}, {h['y']}, {h['z']}, {h['yaw']}, 3, 60); GAME.step(0.5)")
            m1 = json.loads(E(COUNT))
            E("FASSADE.meshes.forEach(m => m.visible = false); GAME.step(0.1)")
            m0 = json.loads(E(COUNT))
            lib.shot(pg, OUT, 'ratscher_halle_vorher')
            E("FASSADE.meshes.forEach(m => m.visible = !RATSCHER.map); GAME.step(0.1)")
            lib.shot(pg, OUT, 'ratscher_halle_nachher')
            m0.pop('keys', None)
            m1.pop('keys', None)
            print('perf ratscher hall', json.dumps({'without': m0, 'with': m1}), flush=True)
            ck('Ratscher: draw calls with the new windows within a few', m1['calls'] - m0['calls'] <= 4, f"{m0['calls']} → {m1['calls']} calls, {m0['tris']} → {m1['tris']} triangles, {m0['ms']} → {m1['ms']} ms per frame (SwiftShader)")
            night(E, pg, True)
            lib.shot(pg, OUT, 'ratscher_halle_nacht')
            lit = json.loads(E("JSON.stringify((FASSADE.glass || []).map(g => +g.m.emissiveIntensity.toFixed(3)))"))
            ck('at night some of the stable windows are lit (by the village share)', any(x > 0 for x in lit), json.dumps(lit))
            night(E, pg, False)
        # a building that got a door: from 7 m in front
        d = json.loads(E("""JSON.stringify((() => { for (const [id, D] of FASSADE.doors) { const b = VILLAGE.byId.get(id), f = b.fac[D.k], x = f.ax + f.dx * D.u + f.nx * 7, y = f.ay + f.dy * D.u + f.ny * 7;
            return { id, D, typ: b.typ, x, y, z: KERN.ground(x, y) + 1.65, yaw: Math.atan2(-f.nx, -f.ny) * 180 / Math.PI, e: FASSADE.eingang(id) }; } return null; })())"""))
        print('door', json.dumps(d), flush=True)
        if d:
            E(f"GAME.view({d['x']}, {d['y']}, {d['z']}, {d['yaw']}, -6, 60); GAME.step(0.5)")
            lib.shot(pg, OUT, 'ratscher_tuer')
            ck('FASSADE.eingang gives the new door', bool(d['e']) and abs(d['e']['x'] - (d['x'])) < 7.5, json.dumps(d['e']))
        # steps in front of the house doors: how many, one walked on, a picture
        print('steps', E("JSON.stringify(FASSADE.steps())"), flush=True)
        st = json.loads(E("""JSON.stringify((() => { const n = (FASSADE.status().doors || {}).stufen || 0; let pick = null;
            for (const b of VILLAGE.bld) { const f = b.fac.find(q => q.door); if (!f || b.typ !== 0) continue; const x = f.ax + f.dx * f.door.u + f.nx * 0.25, y = f.ay + f.dy * f.door.u + f.ny * 0.25, z = FASSADE.stepAt(x, y);
              if (z !== undefined && z - KERN.ground(x + f.nx * 2, y + f.ny * 2) > 0.4) { pick = { id: b.id, x, y, z, g: KERN.ground(x, y), nx: f.nx, ny: f.ny }; break; } }
            return { n, pick }; })())"""))
        print('door steps', json.dumps(st), flush=True)
        ck('Ratscher: steps in front of the house doors, the ground on them', st['n'] > 50 and bool(st['pick']) and abs(st['pick']['g'] - st['pick']['z']) < 0.01, json.dumps(st))
        if st['pick']:
            q = st['pick']
            E(f"GAME.view({q['x'] + q['nx'] * 4.5}, {q['y'] + q['ny'] * 4.5}, KERN.ground({q['x'] + q['nx'] * 4.5}, {q['y'] + q['ny'] * 4.5}) + 1.6, {math.degrees(math.atan2(-q['nx'], -q['ny']))}, -10, 60); GAME.step(0.4)")
            lib.shot(pg, OUT, 'ratscher_haustuer_stufen')
        # the Anger (a street of the village) by day and by night
        E("GAME.view(240.0, -112.0, KERN.ground(240.0, -112.0) + 1.65, 250, -2, 62); GAME.step(0.5)")
        lib.shot(pg, OUT, 'ratscher_anger_tag')
        night(E, pg, True)
        lib.shot(pg, OUT, 'ratscher_anger_nacht')
        night(E, pg, False)
        ck('the eingang of a house with a door inside (HAEUSER) is its painted door',
           E("(() => { const L = window.HAEUSER && HAEUSER.list ? HAEUSER.list() : []; if (!L.length) return true; const o = L[0], e = FASSADE.eingang(o.id); return !!e && Math.hypot(e.x - o.door.x, e.y - o.door.y) < 0.8; })()"))

    if want('schleusingen') or want('perf'):
        fetch_tiles()

        def go_schl():
            E("document.querySelector('#menu [data-spot=schleusingen]').click()")
            t0 = time.time()
            while time.time() - t0 < 240:
                E("GAME.step(0.25)")
                if E("SCHL.state === 'ready' || SCHL.state === 'error'"):
                    break
                time.sleep(0.4)
            for _ in range(60):
                E("GAME.step(0.25)")
                if json.loads(E("JSON.stringify(WELT.state())"))['loading'] == 0 and E("WELT.padQueue() === 0"):
                    break
                time.sleep(0.3)
            E("GAME.step(1)")
            return json.loads(E("JSON.stringify(SCHL.status())"))
        def settle(limit=25):
            """after a jump: the tiles round the new place loaded and drawn with the pads (the finest level, 2 m)"""
            t0 = time.time()
            while time.time() - t0 < limit:
                E("GAME.step(0.25)")
                if E("WELT.state().loading === 0 && WELT.padQueue() === 0"):
                    break
                time.sleep(0.25)
            E("GAME.step(0.3)")
        ZDONE = """(() => { if (!window.GEB || !GEB.Z || GEB.jobs() > 0) return !window.GEB || !GEB.Z; const C = [...GEB.Z.cells.values()];
            if (C.some(c => c.state === 'building' || c.job)) return false; const n = C.filter(c => c.meshes.length).length;
            return !(FASSADE.state === 'ready' && FASSADE.zonen) || FASSADE.zonen().zellen >= n; })()"""

        def zones(limit=40):
            """the ETHOS cells round here built (gebaeude/gebaeude.js) and, with the fixes, fixed (FASSADE: one cell each half second)"""
            t0 = time.time()
            while time.time() - t0 < limit:
                E("GAME.step(0.5)")
                if E(ZDONE):
                    return True
                time.sleep(0.2)
            return False
        # looks from outside (FASSADE.ansicht, as feat/schleusingen-ansicht will give them): one town house by its index, one ETHOS
        # building by a point – before the town and the cells are built
        E("""FASSADE.ansicht('#56', { farbe: '#3a62b0', laeden: 'braun', rahmen: 'weiss' });
            FASSADE.ansicht('#80', { art: 'schule', geschosse: 2, dach: { form: 'flach', material: 'kies' } });
            FASSADE.ansicht('@-1161.5,1217.9', { farbe: '#b03a3a', material: 'klinker' })""")
        s = go_schl()
        print('schleusingen', json.dumps(s), flush=True)
        ck('Schleusingen stands', s['state'] == 'ready', s.get('err', ''))
        st = json.loads(E("JSON.stringify(FASSADE.status().schl)"))
        print('schl fassade', json.dumps(st, ensure_ascii=False), flush=True)
        VIEW_M = "GAME.view(-1100.5, 1214.5, SCHL.gz(-1100.5, 1214.5) + 1.65, 330, 2, 62); GAME.step(0.5)"
        if want('schleusingen'):
            ck('the plan ran (yards, passages, doors, windows)', bool(st) and st['ms'] < 2500 and len(st['passes']) >= 3, json.dumps(st and {'ms': st['ms'], 'n': st['n']}))
            r = counts(E, 'schleusingen')
            v, n = r['vorher'], r['nachher']
            ck('Schleusingen: every building has an entrance (or an explained rest)', n['tuer'] <= max(3, v['tuer'] // 20), f"tuer {v['tuer']} → {n['tuer']}")
            ck('Schleusingen: the free runs of party walls have windows', n['fenster'] <= max(4, v['fenster'] // 10), f"fenster {v['fenster']} → {n['fenster']}")
            ck('Schleusingen: the yards are reached (or explained)', n['hof'] == 0 and v['hof'] >= 3, f"hof {v['hof']} → {n['hof']}, explained {n['rest']}")
            ck('Schleusingen: the mapped passages are open', n['durchgang'] == 0 and v['durchgang'] >= 2, f"durchgang {v['durchgang']} → {n['durchgang']}")
            # through each passage: from 3 m in front of its street side straight on; at the end in the yard (or the courtyard), the feet on the ground
            P = json.loads(E("""JSON.stringify(SCHL.fassade.passes.map(q => ({ src: q.src, A: q.A, B: q.B, d: q.d, depth: q.depth, w: q.w, h: q.h, zA: q.zA, zB: q.zB, a: q.b.a || q.b.n || '' })))"""))
            for i, q in enumerate(P):
                E(f"(() => {{ const q = SCHL.fassade.passes[{i}], x = q.A[0] - q.d[0] * 3, y = q.A[1] - q.d[1] * 3; GAME.view(x, y, KERN.ground(x, y) + 1.62, Math.atan2(q.d[0], q.d[1]) * 180 / Math.PI, 0, 62); }})()")
                settle()
                r2 = json.loads(E(f"""JSON.stringify((() => {{ const q = SCHL.fassade.passes[{i}], x = q.A[0] - q.d[0] * 3, y = q.A[1] - q.d[1] * 3, yaw = Math.atan2(q.d[0], q.d[1]) * 180 / Math.PI;
                    GAME.view(x, y, KERN.ground(x, y) + 1.62, yaw, 0, 62); GAME.step(0.5); GAME.step(Math.ceil((q.depth + 6) / 1.4) , 1);
                    const t = (GAME.P.x - q.A[0]) * q.d[0] + (GAME.P.y - q.A[1]) * q.d[1], Y = q.yard;
                    return {{ t, depth: q.depth, inYard: Y ? Y.at(GAME.P.x, GAME.P.y) : null, where: (KERN.place(GAME.P.x, GAME.P.y, GAME.P.feet) || {{}}).name || SCHL.place(GAME.P.x, GAME.P.y),
                      feet: GAME.P.feet, g: KERN.ground(GAME.P.x, GAME.P.y), x: GAME.P.x, y: GAME.P.y }}; }})())"""))
                ck(f"through the passage {i + 1} ({q['src']}, {q['a']}) into the yard behind", r2['t'] > q['depth'] + 0.8 and abs(r2['feet'] - r2['g']) < 0.1,
                   json.dumps(r2, ensure_ascii=False))
                # pictures: from the street into the passage, and from the yard back
                # (a gate with a stair: from the landing at the top of the stair, looking at the gate)
                OUTV = f"""(() => {{ const q = SCHL.fassade.passes[{i}], t = q.stair, x = t ? t.top[0] + (q.A[0] - t.top[0]) * 0.1 : q.A[0] - q.d[0] * 9, y = t ? t.top[1] + (q.A[1] - t.top[1]) * 0.1 : q.A[1] - q.d[1] * 9;
                    GAME.view(x, y, KERN.ground(x, y) + 1.65, Math.atan2(q.A[0] - x, q.A[1] - y) * 180 / Math.PI, 2, 62); GAME.step(0.3); }})()"""
                E(OUTV)
                settle()
                E(OUTV)
                lib.shot(pg, OUT, f"schleusingen_durchgang{i + 1}_strasse")
                E(f"""(() => {{ const q = SCHL.fassade.passes[{i}], x = q.B[0] + q.d[0] * 7, y = q.B[1] + q.d[1] * 7; GAME.view(x, y, KERN.ground(x, y) + 1.65, Math.atan2(-q.d[0], -q.d[1]) * 180 / Math.PI, 2, 62); GAME.step(0.3); }})()""")
                settle()
                E(f"""(() => {{ const q = SCHL.fassade.passes[{i}], x = q.B[0] + q.d[0] * 7, y = q.B[1] + q.d[1] * 7; GAME.view(x, y, KERN.ground(x, y) + 1.65, Math.atan2(-q.d[0], -q.d[1]) * 180 / Math.PI, 2, 62); GAME.step(0.3); }})()""")
                lib.shot(pg, OUT, f"schleusingen_durchgang{i + 1}_hof")
            # the stair outside the castle's west gate (OSM steps): from its foot looking up at the gate, and walking down it from the landing
            for i, q in enumerate(P):
                if not E(f"!!SCHL.fassade.passes[{i}].stair"):
                    continue
                st = json.loads(E(f"JSON.stringify((() => {{ const t = SCHL.fassade.passes[{i}].stair; return {{ top: t.top, bot: t.bot, zL: t.zL, zF: t.zF, L: t.L, osm: t.osm }}; }})())"))
                print('stair', json.dumps(st), flush=True)
                ux, uy = (st['bot'][0] - st['top'][0]) / st['L'], (st['bot'][1] - st['top'][1]) / st['L']
                E(f"GAME.view({st['bot'][0] + ux * 8}, {st['bot'][1] + uy * 8}, KERN.ground({st['bot'][0] + ux * 8}, {st['bot'][1] + uy * 8}) + 1.65, {math.degrees(math.atan2(-ux, -uy))}, 12, 62)")
                settle()
                E(f"GAME.view({st['bot'][0] + ux * 8}, {st['bot'][1] + uy * 8}, KERN.ground({st['bot'][0] + ux * 8}, {st['bot'][1] + uy * 8}) + 1.65, {math.degrees(math.atan2(-ux, -uy))}, 12, 62); GAME.step(0.3)")
                lib.shot(pg, OUT, f"schleusingen_burgtreppe")
                r3 = json.loads(E(f"""JSON.stringify((() => {{ const x = {st['top'][0] + ux * 0.3}, y = {st['top'][1] + uy * 0.3};
                    GAME.view(x, y, KERN.ground(x, y) + 1.62, {math.degrees(math.atan2(ux, uy))}, 0, 62); GAME.step(0.5); const z0 = GAME.P.feet; GAME.step(Math.ceil({st['L']} / 1.2), 1);
                    const t = (GAME.P.x - {st['top'][0]}) * {ux} + (GAME.P.y - {st['top'][1]}) * {uy};
                    return {{ t, z0, feet: GAME.P.feet, g: KERN.ground(GAME.P.x, GAME.P.y) }}; }})())"""))
                ck('down the castle stair from the landing to its foot', r3['t'] > st['L'] - 1.5 and abs(r3['feet'] - r3['g']) < 0.15 and abs(r3['feet'] - r3['z0']) > 0.5 * abs(st['zL'] - st['zF']),
                   json.dumps(r3))
            # a street (the Markt) by day and by night
            E(VIEW_M)
            lib.shot(pg, OUT, 'schleusingen_markt_tag')
            # what stands at the left of that view (a tall blank wall there: whose?)
            hit = json.loads(E("""JSON.stringify((() => { const out = []; for (const [sx, sy] of [[-0.85, 0.1], [-0.7, 0.3], [-0.6, 0.05]]) {
                const rc = new THREE.Raycaster(); rc.setFromCamera(new THREE.Vector2(sx, sy), GAME.cam); const h = rc.intersectObjects(GAME.scene.children, true).find(q => q.object.visible);
                if (h) out.push({ s: [sx, sy], name: h.object.name, x: +h.point.x.toFixed(1), y: +(-h.point.z).toFixed(1), z: +h.point.y.toFixed(1), d: +h.distance.toFixed(1) }); } return out; })())"""))
            print('left of the Markt view', json.dumps(hit, ensure_ascii=False), flush=True)
            night(E, pg, True)
            E(VIEW_M)
            lib.shot(pg, OUT, 'schleusingen_markt_nacht')
            night(E, pg, False)
            # a back house with its new door and a party wall with its new windows
            y = json.loads(E("""JSON.stringify((() => { const b = SCHL.bld.find(b => b.doorYard && b.k === 0 && Math.hypot(b.cx - SCHL.MARKT[0], b.cy - SCHL.MARKT[1]) < 260); if (!b) return null;
                const d = b.doorYard, f = b.F[d.k], L = Math.hypot(f[2] - f[0], f[3] - f[1]), dx = (f[2] - f[0]) / L, dy = (f[3] - f[1]) / L, x = f[0] + dx * d.u + dy * 6, y = f[1] + dy * d.u - dx * 6;
                GAME.view(x, y, KERN.ground(x, y) + 1.65, Math.atan2(-dy, dx) * 180 / Math.PI, -4, 62); GAME.step(0.3); return { i: b.i, a: b.a || '', e: FASSADE.eingang(900000 + b.i) }; })())"""))
            print('yard door', json.dumps(y, ensure_ascii=False), flush=True)
            if y:
                lib.shot(pg, OUT, 'schleusingen_hoftuer')
            w = json.loads(E("""JSON.stringify((() => { let best = null; for (const b of SCHL.bld) if (b.open) for (const k in b.open) for (const [a, c] of b.open[k]) if (!best || c - a > best.len) best = { b, k: +k, a, c, len: c - a };
                if (!best) return null; const f = best.b.F[best.k], L = Math.hypot(f[2] - f[0], f[3] - f[1]), dx = (f[2] - f[0]) / L, dy = (f[3] - f[1]) / L, u = (best.a + best.c) / 2, x = f[0] + dx * u + dy * 14, y = f[1] + dy * u - dx * 14;
                GAME.view(x, y, KERN.ground(x, y) + 1.65, Math.atan2(-dy, dx) * 180 / Math.PI, 6, 62); GAME.step(0.3); return { i: best.b.i, len: best.len }; })())"""))
            print('party wall run', json.dumps(w), flush=True)
            if w:
                lib.shot(pg, OUT, 'schleusingen_brandwand_fenster')
            n = json.loads(E("JSON.stringify({ n: SCHL.steps || 0, sets: FASSADE.steps() })"))
            ck('Schleusingen: steps in front of the house doors', n['n'] > 200, json.dumps(n))
            # the ETHOS cells round the old town (gebaeude/gebaeude.js, built as one walks): fixed one by one as they stand
            zok = zones()
            z = json.loads(E("JSON.stringify(FASSADE.zonen ? FASSADE.zonen() : null)"))
            print('zonen', zok, json.dumps(z), flush=True)
            if z:
                r = counts(E, 'zonen')
                v, n = r['vorher'], r['nachher']
                k0, k1 = r['byV'].get('tuer: kein Eingang', 0), r['byN'].get('tuer: kein Eingang', 0)
                ck('the ETHOS cells round Schleusingen: their walls with windows, their buildings with doors (skins in the cells\' own meshes)',
                   z['zellen'] > 0 and not z['err'] and z['ungemischt'] == 0 and n['fenster'] <= max(3, v['fenster'] // 5) and k1 <= max(3, k0 // 5),
                   f"{json.dumps(z)} – kein Eingang {k0} → {k1}, tuer {v['tuer']} → {n['tuer']}, fenster {v['fenster']} → {n['fenster']}")
                q = json.loads(E("JSON.stringify(FASSADE.zonenBild())"))
                print('zone picture', json.dumps(q), flush=True)
                if q:
                    E(f"GAME.view({q['x']}, {q['y']}, KERN.ground({q['x']}, {q['y']}) + 1.65, {q['yaw']}, 4, 62)")
                    settle()
                    E(f"GAME.view({q['x']}, {q['y']}, KERN.ground({q['x']}, {q['y']}) + 1.65, {q['yaw']}, 4, 62); GAME.step(0.3)")
                    lib.shot(pg, OUT, 'schleusingen_zone_fenster')
            # the looks given before the build: the town house in blue with brown shutters, the ETHOS shed in red brick
            lk = json.loads(E("""JSON.stringify((() => { const b = SCHL.bld.find(q => q.i === 56), s = SCHL.bld.find(q => q.i === 80), z = FASSADE.zonen ? FASSADE.zonen() : {};
                return { st: b && b.st.style, col: b && b.st.col.map(v => +v.toFixed(3)), shutters: b && b.st.shutters, shut: b && b.st.shut, look: !!(b && b.look),
                  school: s && { style: s.st.style, e: +s.e.toFixed(2), fl: s.fl, rk: s.rk, top: Math.max(...s.rv.filter((v, k) => k % 3 === 2)) }, zonen: z.ansicht, stand: FASSADE.ansichtStand() }; })())"""))
            print('looks', json.dumps(lk), flush=True)
            sc = lk.get('school') or {}
            ck('looks given from outside (FASSADE.ansicht) on town houses (colour, shutters; a school with two storeys and a flat roof) and on an ETHOS building',
               lk['look'] and lk['shutters'] and lk['shut'] == 1 and lk['col'][2] > lk['col'][0] and (lk['zonen'] or 0) >= 1
               and sc.get('style') == 1 and sc.get('fl') == 1 and sc.get('rk') == 4 and abs(sc.get('e', 0) - 5.9) < 0.01 and abs(sc.get('top', 0) - 5.9) < 0.01, json.dumps(lk))
            # the three findings of schleusingen-ansicht: the Markt from its south-east corner looking west (a grey block stood there), the
            # blocks of flats on Hildburghäuser Straße (white, no shutters), the school (a school's look, not a house's)
            E("""(() => { const P = SCHL.data.marktplatz; let bx = 0, by = 0, best = -1e9; for (let k = 0; k < P.length; k += 2) if (P[k] - P[k + 1] > best) { best = P[k] - P[k + 1]; bx = P[k]; by = P[k + 1]; }
                const x = bx - 4, y = by + 4; GAME.view(x, y, KERN.ground(x, y) + 1.65, 285, 2, 62); GAME.step(0.3); })()""")
            settle()
            lib.shot(pg, OUT, 'schleusingen_markt_suedost')
            # (from the longest free wall near a street, as far off as fits – not inside another building: a carport roof hid the school)
            fd = json.loads(E("""JSON.stringify([236, 314].map(i => { const b = SCHL.bld.find(q => q.i === i); if (!b) return null; let k = -1, best = -1e9;
                b.F.forEach((f, j) => { const L = Math.hypot(f[2] - f[0], f[3] - f[1]), sc = L - (f[9] > 25 ? 1000 : 0); if (!(f[8] & 1) && sc > best) { best = sc; k = j; } });
                if (k < 0) return null; const f = b.F[k], L = Math.hypot(f[2] - f[0], f[3] - f[1]), nx = (f[3] - f[1]) / L, ny = -(f[2] - f[0]) / L, mx = (f[0] + f[2]) / 2, my = (f[1] + f[3]) / 2;
                const inR = (f, x, y) => { let c = false; for (let p = 0, q = f.length - 2; p < f.length; q = p, p += 2) if ((f[p + 1] > y) !== (f[q + 1] > y) && x < ((f[q] - f[p]) * (y - f[p + 1])) / (f[q + 1] - f[p + 1]) + f[p]) c = !c; return c; };
                const inB = (x, y) => SCHL.bld.some(q => inR(q.f, x, y)) || [...((window.GEB && GEB.Z && GEB.Z.cells.values()) || [])].some(c => c.data && c.data.b.some(q => q.st && inR(q.f, x, y)));
                let d = 14; for (const t of [Math.min(32, 10 + L * 0.6), 26, 20, 14, 9]) if (!inB(mx + nx * t, my + ny * t)) { d = t; break; }
                return { i, a: b.a || '', n: b.n || '', style: b.st.style, shutters: b.st.shutters, col: b.st.col.map(v => +v.toFixed(3)), x: mx + nx * d, y: my + ny * d, yaw: Math.atan2(-nx, -ny) * 180 / Math.PI }; }))"""))
            print('findings', json.dumps(fd, ensure_ascii=False), flush=True)
            for q, name in zip(fd, ('schleusingen_wohnblock', 'schleusingen_schule')):
                if q:
                    E(f"GAME.view({q['x']}, {q['y']}, KERN.ground({q['x']}, {q['y']}) + 1.65, {q['yaw']}, 4, 62)")
                    settle()
                    E(f"GAME.view({q['x']}, {q['y']}, KERN.ground({q['x']}, {q['y']}) + 1.65, {q['yaw']}, 4, 62); GAME.step(0.3)")
                    lib.shot(pg, OUT, name)
            ck('the blocks of flats light without shutters, the school in the look of a school of our time',
               all(q and q['style'] == 1 and not q['shutters'] and min(q['col']) > 0.45 for q in fd), json.dumps(fd, ensure_ascii=False))
            ok, rep = lib.check_gl(pg)
            ck('every shader program within 16 textures, none broken', ok, json.dumps({k: rep[k] for k in ('programs', 'maxFrag', 'maxVert')}))
        if want('perf'):
            # the same view in two fresh loads, with the fixes and with ?nofassade (the page above has walked through the town: people
            # and cars gather, interiors stay loaded – not the fixes' doing)
            TOWN = "JSON.stringify({ n: SCHL.meshes.length, tris: SCHL.meshes.reduce((s, m) => s + Math.round((m.geometry.index ? m.geometry.index.count : m.geometry.attributes.position.count) / 3) * (m.isInstancedMesh ? m.count : 1), 0) })"
            M = {}
            for tag, q in (('with', ''), ('without', '?nofassade')):
                pg.close()
                pg = lib.page(b, 1100, 680, errs, tier='mittel')
                lib.boot(pg, port, q)
                E = pg.evaluate
                E("document.querySelectorAll('#toast').forEach(e => e.style.visibility = 'hidden'); GAME.setView3(false)")
                night(E, pg, False)
                go_schl()
                E(VIEW_M)
                settle()
                zones()
                E(VIEW_M)
                m = json.loads(E(COUNT))
                m['town'] = json.loads(E(TOWN))
                M[tag] = m
                print(f'perf schleusingen ({tag} the fixes)', json.dumps({k: m[k] for k in m if k != 'keys'}), flush=True)
            m1, m0 = M['with'], M['without']
            s1, s0 = m1['town'], m0['town']
            diff = {k: [m0['keys'].get(k, 0), m1['keys'].get(k, 0)] for k in set(m0['keys']) | set(m1['keys']) if m0['keys'].get(k, 0) != m1['keys'].get(k, 0)}
            print('perf schleusingen: static draw calls that differ (without → with)', json.dumps(diff, ensure_ascii=False), flush=True)
            ck('Schleusingen: the town draws with as many meshes as before, its triangles within a few per cent (the door steps, gateways, stair)', s1['n'] <= s0['n'] and s1['tris'] <= s0['tris'] * 1.06,
               f"{s0['n']} → {s1['n']} meshes, {s0['tris']} → {s1['tris']} triangles of the town")
            ck('Schleusingen: the frame at the Markt about the same (without people, traffic and animals, which vary between two loads)',
               m1['sCalls'] <= m0['sCalls'] + 4 and m1['sTris'] <= m0['sTris'] * 1.06 + 2000,
               f"static {m0['sCalls']} → {m1['sCalls']} calls, {m0['sTris']} → {m1['sTris']} triangles; whole frame {m0['calls']} → {m1['calls']} calls, "
               f"{m0['tris']} → {m1['tris']} triangles, {m0['ms']} → {m1['ms']} ms per frame (SwiftShader)")
    ck.errors(errs)
ck.done()
