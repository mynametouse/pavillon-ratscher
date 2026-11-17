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
  const R = GAME.R, I = [0, 0], rbd = R.renderBufferDirect;
  R.renderBufferDirect = function (camera, scene, geometry, material, object, group) {
    const n = geometry.index ? geometry.index.count : geometry.attributes.position ? geometry.attributes.position.count : 0;
    if (scene) { I[0]++; I[1] += Math.round((group ? group.count : n) / 3) * (object.isInstancedMesh ? object.count : 1); }
    return rbd.call(this, camera, scene, geometry, material, object, group);
  };
  let t = 0;
  try { GAME.shot(); const t0 = performance.now(); for (let k = 0; k < 3; k++) GAME.shot(); t = (performance.now() - t0) / 3; } finally { R.renderBufferDirect = rbd; }
  return JSON.stringify({ calls: Math.round(I[0] / 4), tris: Math.round(I[1] / 4), ms: Math.round(t) });
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
    ck(f'{ort}: the audit covers the buildings of the place', r['nRec'] > (300 if ort == 'ratscher' else 700) and not r['err'], f"{r['nRec']} buildings {r['err']}")
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
                E(f"""(() => {{ const q = SCHL.fassade.passes[{i}], x = q.A[0] - q.d[0] * 9, y = q.A[1] - q.d[1] * 9; GAME.view(x, y, KERN.ground(x, y) + 1.65, Math.atan2(q.d[0], q.d[1]) * 180 / Math.PI, 2, 62); GAME.step(0.3); }})()""")
                settle()
                E(f"""(() => {{ const q = SCHL.fassade.passes[{i}], x = q.A[0] - q.d[0] * 9, y = q.A[1] - q.d[1] * 9; GAME.view(x, y, KERN.ground(x, y) + 1.65, Math.atan2(q.d[0], q.d[1]) * 180 / Math.PI, 2, 62); GAME.step(0.3); }})()""")
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
            ok, rep = lib.check_gl(pg)
            ck('every shader program within 16 textures, none broken', ok, json.dumps({k: rep[k] for k in ('programs', 'maxFrag', 'maxVert')}))
        if want('perf'):
            TOWN = "JSON.stringify({ n: SCHL.meshes.length, tris: SCHL.meshes.reduce((s, m) => s + Math.round((m.geometry.index ? m.geometry.index.count : m.geometry.attributes.position.count) / 3) * (m.isInstancedMesh ? m.count : 1), 0) })"
            E(VIEW_M)
            settle()
            m1 = json.loads(E(COUNT))
            s1 = json.loads(E(TOWN))
            print('perf schleusingen (with the fixes)', json.dumps(m1), json.dumps(s1), flush=True)
            pg.close()
            pg2 = lib.page(b, 1100, 680, errs, tier='mittel')
            lib.boot(pg2, port, '?nofassade')
            E2 = pg2.evaluate
            E2("document.querySelectorAll('#toast').forEach(e => e.style.visibility = 'hidden'); GAME.setView3(false)")
            night(E2, pg2, False)
            E = E2
            pg = pg2
            go_schl()
            E(VIEW_M)
            settle()
            m0 = json.loads(E(COUNT))
            s0 = json.loads(E(TOWN))
            print('perf schleusingen (?nofassade)', json.dumps(m0), json.dumps(s0), flush=True)
            ck('Schleusingen: the town draws with as many meshes as before, its triangles within a few per cent', s1['n'] <= s0['n'] and s1['tris'] <= s0['tris'] * 1.03,
               f"{s0['n']} → {s1['n']} meshes, {s0['tris']} → {s1['tris']} triangles of the town")
            ck('Schleusingen: the whole frame at the Markt about the same (traffic and people vary between two loads)', m1['calls'] <= m0['calls'] * 1.1 + 4,
               f"{m0['calls']} → {m1['calls']} calls, {m0['tris']} → {m1['tris']} triangles, {m0['ms']} → {m1['ms']} ms per frame (SwiftShader)")
    ck.errors(errs)
ck.done()
