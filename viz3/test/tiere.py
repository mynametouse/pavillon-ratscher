# feat/tiere (Falko 5.11.2026 23:20/23:24: the animals that really live around Ratscher, with influence; a companion dog that learns):
# the bodies (procedural, true to size, one shared material – no new shader program), the habitat from the real crowns (forest, edge,
# open land), the groups by the sun and the calendar (roe deer at dusk at the forest edge, wild boar at night on the field, the red kite
# by day over the meadows), flight from the walker at the real distance (the group goes together), the first sighting as an event for
# the discovery book, the dog following, sitting, lying. Pictures in out/tiere/ (look at them).
#   python3 viz3/test/tiere.py 9003 [sections]      sections: bau,welt,flucht,hund,einfluss,lernen,andere,telefon (default all)
import sys, os, json, time, math
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__))); import lib
port = sys.argv[1] if len(sys.argv) > 1 else '8951'
want = set((sys.argv[2] if len(sys.argv) > 2 else 'bau,welt,flucht,hund,einfluss,lernen,andere,telefon').split(','))
ck = lib.Checks('tiere')
OUT = lib.out('tiere')
with lib.browser() as b:
    errs = []
    pg = lib.page(b, 1100, 680, errs, tier='hoch')
    lib.boot(pg, port)
    E = pg.evaluate
    J = lambda js: json.loads(E("JSON.stringify(" + js + ")"))
    steps = lambda secs, dt=0.05: E(f"for (let i = 0; i < {max(1, int(secs / dt))}; i++) GAME.step({dt})")
    progs = lambda: E("GAME.R.info.programs.length")
    E("document.querySelectorAll('#toast').forEach(e => e.style.visibility = 'hidden')")
    def pic(name):
        try: lib.shot(pg, OUT, name)
        except Exception as e: print('shot failed', name, e)
    # the calendar and the clock: date (month 1–12, day) at hh:mm – the game's day today becomes that date, the light settled
    def at(hh, mm=0, date=(11, 5)):
        E(f"(() => {{ const d = Math.floor(CLOCK.t / 1440); DN.e0 = Date.UTC(2026, {date[0] - 1}, {date[1]}) / 864e5 - d; CLOCK.t = d * 1440 + {hh * 60 + mm}; DN.update(true); }})()")
        lib.settle_light(pg)
    # (ends with 0: an expression that evaluates to a function is invoked by Playwright – here KERN.on's unsubscribe)
    E("window.__ev = []; KERN.on('tiere:entdeckt', e => window.__ev.push(e)); KERN.on('tiere:flucht', e => window.__ev.push(Object.assign({ ev: 'flucht' }, e))); 0")
    # pictures in the first-person view (the walker's own eyes); the walk camera takes its field of view from window.FOVX
    E("GAME.setView3(false, true)")
    VIEWFN = "window.__view = (x, y, z, yaw, pitch, fov) => { window.FOVX = fov || 70; GAME.view(x, y, z, yaw, pitch, fov); }; 0"
    E(VIEWFN)
    st = J("TIERE.state()")
    ck('the animals are there (TIERE, HUND, the body builder)', E("!!(window.TIERE && window.HUND && window.TKOERPER)"), str(st))
    p0 = progs()
    print('programs after load', p0, flush=True)
    if 'bau' in want:
        # a model sheet at noon on the field by the L 1625, the forest behind: doe, buck, fawn, sow, piglets, the dog, a kite
        E("TIERE.on = false; HUND.on = false")
        at(12, 0, date=(7, 10))
        x0, y0 = -150, -400
        E(f"__view({x0}, {y0}, ROADS.groundAt({x0}, {y0}) + 1.5, 225, -6, 50); GAME.step(0.1)")
        E("GAME.shot()")
        pa = progs()
        # (name, kind, variant, scale, close-up distance, eye height): November coats, the summer ones for comparison
        SHEET = [('reh_ricke_winter', 'reh', {'winter': True}, 1, 2.6, 0.75), ('reh_bock_sommer', 'reh', {'antler': True}, 1, 2.6, 0.8),
                 ('reh_kitz_sommer', 'reh', {'spots': True}, 0.55, 1.8, 0.5), ('sau', 'sau', {}, 1, 3.4, 0.7),
                 ('frischling_november', 'sau', {'young': True}, 0.68, 2.6, 0.55), ('frischling_juni', 'sau', {'young': True, 'stripes': True}, 0.4, 1.6, 0.4),
                 ('hund', 'hund', {}, 1, 2.6, 0.7), ('fuchs', 'fuchs', {}, 1, 1.8, 0.45), ('hase', 'hase', {}, 1, 1.4, 0.35),
                 ('dachs', 'dachs', {}, 1, 1.8, 0.4), ('waschbaer', 'waschbaer', {}, 1, 1.6, 0.4), ('marder', 'marder', {}, 1, 1.3, 0.3),
                 ('wildkatze', 'katze', {}, 1, 1.6, 0.45), ('hirsch_alttier', 'hirsch', {'winter': True}, 1, 4.2, 1.2),
                 ('hirsch_brunft', 'hirsch', {'winter': True, 'antler': True}, 1.05, 4.8, 1.35), ('huhn', 'huhn', {}, 1, 1.0, 0.3)]
        # the fox is a real model (glTF, loaded on first need): wait for it
        E("TKOERPER.ready('fuchs')")
        for i in range(60):
            if E("TKOERPER.ready('fuchs')"): break
            time.sleep(0.5)
        E("window.__sheet = []")
        for k, (n, kind, var, sc, dd, eh) in enumerate(SHEET):
            # in two rows across the view, 9 and 14 m ahead
            E(f"""(() => {{ const A = TKOERPER.make('{kind}', {json.dumps(var)}); A.g.scale.setScalar({sc}); GAME.scene.add(A.g);
              const yaw = 225 * Math.PI / 180, fx = Math.sin(yaw), fy = Math.cos(yaw), rx = Math.cos(yaw), ry = -Math.sin(yaw);
              const row = {k} < 8 ? 0 : 1, s = ({k} % 8) - 3.5, d = 9 + row * 5, x = {x0} + fx * d + rx * s * 1.6, y = {y0} + fy * d + ry * s * 1.6;
              A.g.position.set(x, ROADS.groundAt(x, y), -y); A.g.rotation.y = Math.PI - (yaw + Math.PI / 2);
              A.anim(0.05, 0, {{}}); window.__sheet.push(A); }})()""")
        E("GAME.setView3(false, true); GAME.step(0.05)")
        pic('01_tafel_mittag')
        pb = progs()
        ck('the bodies: no new shader program (one shared material, made at load)', pb <= pa, f'{pa} -> {pb} (load {p0})')
        tri = J("window.__sheet.map(A => ({ k: A.kind, tri: (A.mesh.geometry.index ? A.mesh.geometry.index.count : A.mesh.geometry.attributes.position.count) / 3, bones: A.mesh.skeleton.bones.length, h: +(new THREE.Box3().setFromObject(A.g).getSize(new THREE.Vector3()).y).toFixed(2), l: +(new THREE.Box3().setFromObject(A.g).getSize(new THREE.Vector3()).length()).toFixed(2) }))")
        print('models', tri, flush=True)
        H = {t['k']: t['h'] for t in tri}
        ck('true to size: roe deer 1.0–1.3 m to the ears, boar 0.8–1.0 m, dog 0.75–0.95 m, fox 0.45–0.65 m, red deer 1.7–2.1 m',
           1.0 < tri[0]['h'] < 1.35 and 0.75 < tri[3]['h'] < 1.05 and 0.7 < tri[6]['h'] < 0.98 and 0.42 < tri[7]['h'] < 0.68 and 1.65 < tri[13]['h'] < 2.15,
           str([(t['k'], t['h']) for t in tri]))
        ck('cheap: each animal one mesh of fewer than 4000 triangles', all(t['tri'] < 4000 for t in tri), str([t['tri'] for t in tri]))
        fx = J("""(() => { const A = window.__sheet[7], c = A.mesh && A.mesh.geometry.attributes.color; let r = 0, g = 0, b = 0;
          if (c) for (let i = 0; i < c.count; i++) { r += c.getX(i) / c.count; g += c.getY(i) / c.count; b += c.getZ(i) / c.count; }
          return { gltf: !!A.gltf, mat: A.mesh && A.mesh.material === TKOERPER.mat, col: !!c, mean: [r, g, b].map(v => +v.toFixed(3)), diag: TKOERPER.diag || null }; })()""")
        print('fox colours', fx, flush=True)
        ck('the fox is the real model (Khronos glTF), drawn with the shared material (colours baked from its texture)', fx['gltf'] and fx['mat'] and fx['col'] and fx['mean'][0] > 0.12, str(fx))
        def closeups(tag, only=None):
            for i, (n, kind, var, sc, dd, eh) in enumerate(SHEET):
                if only and n not in only: continue
                # standing eye height (the walk physics keeps the feet on the ground), looking down at the animal, a lens to frame it
                D = max(2.6, dd * 1.9)
                pit = -math.degrees(math.atan2(1.62 - eh, D))
                fov = max(16, min(48, math.degrees(2 * math.atan2(dd * 0.55, D))))
                E(f"""(() => {{ const A = window.__sheet[{i}], yaw = 225 * Math.PI / 180, fx = Math.sin(yaw), fy = Math.cos(yaw);
                  const x = A.g.position.x, y = -A.g.position.z, cx = x - fx * {D}, cy = y - fy * {D};
                  window.__sheet.forEach((B, j) => B.g.visible = j === {i});
                  __view(cx, cy, ROADS.groundAt(cx, cy) + 1.62, 225, {pit}, {fov}); }})()""")
                E("GAME.step(0.02)")
                pic(f'02_{tag}_{i:02d}_{n}')
            E("window.__sheet.forEach(B => B.g.visible = true)")
        closeups('stand')
        # movement: walking, trotting, bounding, rooting, lying, sitting …
        E("""(() => { const P = [[0.8, {}], [2.4, {}], [9, { flee: 1 }], [0, { dig: 1 }], [0, { lie: 1 }], [1.0, {}], [0, { sit: 1, wag: 1 }],
            [2.5, {}], [6, { flee: 1 }], [0, { dig: 1 }], [1, {}], [5, {}], [0, { sit: 1, alert: 0.4 }], [1.4, {}], [0, { alert: 1, look: 0.7 }]];
          window.__sheet.forEach((A, i) => { const q = P[i] || [0, { graze: 1 }]; for (let k = 0; k < 40; k++) A.anim(0.033, q[0], q[1]); }); })()""")
        closeups('pose', ['reh_ricke_winter', 'reh_bock_sommer', 'reh_kitz_sommer', 'sau', 'hund', 'fuchs', 'hase', 'wildkatze', 'hirsch_brunft'])
        E("""(() => { const P = [[0, { graze: 1 }], [0, { alert: 1, look: 0.8 }], [0, { lie: 1 }], [3, {}], [1.2, {}], [0, { lie: 1 }], [5, {}],
            [0, { graze: 0.55 }], [0, { graze: 0.7 }], [0, { lie: 1 }], [0, {}], [0, {}], [0, {}], [0, { graze: 1 }], [0, {}]];
          window.__sheet.forEach((A, i) => { const q = P[i] || [0, { graze: 1 }]; for (let k = 0; k < 60; k++) A.anim(0.033, q[0], q[1]); }); })()""")
        closeups('pose2', ['reh_ricke_winter', 'reh_bock_sommer', 'reh_kitz_sommer', 'sau', 'hund', 'fuchs', 'hase', 'hirsch_alttier'])
        # the kite from below and the side, close
        E(f"""(() => {{ const A = TKOERPER.make('milan', {{}}); GAME.scene.add(A.g); const x = {x0} - 4, y = {y0} - 4;
          A.g.position.set(x, ROADS.groundAt(x, y) + 3.2, -y); A.g.rotation.y = 0.6; A.anim(0.05, 8, {{ flap: 0, bank: 0.2, twist: 0.3 }}); window.__kite = A; }})()""")
        E(f"__view({x0}, {y0}, ROADS.groundAt({x0}, {y0}) + 1.6, 225, 24, 50); GAME.step(0.05)")
        pic('03_milan_nah')
        E(f"""(() => {{ const A = window.__kite, x = {x0} - 4, y = {y0} - 4; A.g.rotation.y = 2.3; A.anim(0.05, 8, {{ flap: 0, bank: 0, twist: 0.2 }});
          __view(x + 0.3, y + 0.3, ROADS.groundAt(x, y) + 1.0, 225, 62, 60); }})()""")
        E("GAME.step(0.02)")
        pic('04_milan_unten')
        E("window.__sheet.forEach(A => A.dispose()); window.__kite.dispose(); TIERE.on = true; HUND.on = true")
    if 'welt' in want:
        g = J("TIERE.state()")
        ck('habitat from the real crowns: groups of roe deer, wild boar and red kites', g['byArt'].get('reh', 0) >= 8 and g['byArt'].get('wildschwein', 0) >= 2 and g['byArt'].get('rotmilan', 0) >= 1, str(g['byArt']))
        G = J("(() => { const G = TIERE.grid; const n = [0, 0, 0, 0, 0]; for (const c of G.cls) n[c]++; return { n, nx: G.nx }; })()")
        print('habitat cells (none, forest, edge, open, settled)', G, flush=True)
        ck('the habitat map has forest, edges and open land', G['n'][1] > 200 and G['n'][2] > 100 and G['n'][3] > 2000, str(G['n']))
        # dusk at the Klinge: a roe group on its feeding place in front of the edge, the walker 140 m away looking at it
        at(16, 50, date=(11, 5))
        st = J("TIERE.state()")
        print('dusk', st, flush=True)
        r = J("(() => { const g = TIERE.nearest('reh', -560, -560); return { id: g.id, home: g.home, feed: g.feed, plan: TIERE.plan(g) }; })()")
        print('roe group near the Klinge', r, flush=True)
        ck('at dusk the roe deer are out (plan „out“)', r['plan']['where'] == 'out', str(r['plan']))
        fx, fy = r['feed']
        hx, hy = r['home']
        # stand 140 m from the feeding place, on the open side, looking at it
        dx, dy = fx - hx, fy - hy
        L = math.hypot(dx, dy) or 1
        vx, vy = fx + dx / L * 140, fy + dy / L * 140
        yaw = math.degrees(math.atan2(fx - vx, fy - vy))
        E(f"__view({vx}, {vy}, ROADS.groundAt({vx}, {vy}) + 1.65, {yaw}, -2, 45); GAME.step(0.1)")
        steps(1.2)
        lv = J(f"TIERE.list().filter(a => a.g === '{r['id']}')")
        print('roe live', lv[:6], flush=True)
        ck('… and real near the walker: roe deer at their feeding place in front of the edge', len(lv) >= 1, str(len(lv)))
        pa = progs()
        pic('10_dammerung_rehe')
        ck('no new shader program for the animals in the world', progs() <= pa, f'{pa} -> {progs()}')
        ev = J("window.__ev")
        ck('first sighting: tiere:entdeckt for the roe deer with a source', any(e.get('id') == 'reh' and e.get('kind') == 'art' and 'wikipedia' in (e.get('source') or '') for e in ev), str(ev)[:300])
        # a closer look with a long lens at the nearest one
        if lv:
            a = lv[0]
            yaw2 = math.degrees(math.atan2(a['x'] - vx, a['y'] - vy))
            E(f"__view({vx}, {vy}, ROADS.groundAt({vx}, {vy}) + 1.65, {yaw2}, -1, 9); GAME.step(0.05)")
            pic('11_dammerung_reh_tele')
            # can the walker see it? the ground along the line of sight (eye to the animal's back)
            los = J(f"""(() => {{ const ax = {a['x']}, ay = {a['y']}, az = {a['z']} + 0.7, ex = {vx}, ey = {vy}, ez = ROADS.groundAt(ex, ey) + 1.65;
              let worst = -1e9; for (let i = 1; i < 100; i++) {{ const t = i / 100, x = ex + (ax - ex) * t, y = ey + (ay - ey) * t, z = ez + (az - ez) * t;
              worst = Math.max(worst, KERN.ground(x, y) - z); }} return {{ worst: +worst.toFixed(2), az: +az.toFixed(2), mesh: RATSCHER.hMesh ? +RATSCHER.hMesh(ax, ay).toFixed(2) : null, kern: +KERN.ground(ax, ay).toFixed(2) }}; }})()""")
            print('line of sight to the roe deer (ground above the line, m)', los, flush=True)
            # sneaking up: from 35 m, the group frozen for the picture
            E("TIERE.on = false")
            cx, cy = a['x'] + (vx - a['x']) / 140 * 35, a['y'] + (vy - a['y']) / 140 * 35
            E(f"__view({cx}, {cy}, ROADS.groundAt({cx}, {cy}) + 1.65, {yaw2}, -2, 30); GAME.step(0.05)")
            pic('11b_dammerung_rehe_35m')
            E("TIERE.on = true")
        # night on the field: a sounder out
        at(23, 30, date=(11, 5))
        s = J("(() => { const g = TIERE.groups.filter(g => g.art === 'wildschwein')[0]; return { id: g.id, home: g.home, feed: g.feed, plan: TIERE.plan(g) }; })()")
        print('sounder', s, flush=True)
        ck('at night the wild boar are out on the field', s['plan']['where'] == 'out' and s['plan']['n'] >= 4, str(s['plan']))
        fx, fy = s['feed']
        hx, hy = s['home']
        dx, dy = fx - hx, fy - hy
        L = math.hypot(dx, dy) or 1
        vx, vy = fx + dx / L * 60, fy + dy / L * 60
        yaw = math.degrees(math.atan2(fx - vx, fy - vy))
        E(f"__view({vx}, {vy}, ROADS.groundAt({vx}, {vy}) + 1.65, {yaw}, -3, 40); GAME.step(0.1)")
        steps(1.2)
        lb = J("TIERE.list().filter(a => a.art === 'wildschwein')")
        ck('… real near the walker: a sounder rooting on the field', len(lb) >= 4, str(len(lb)))
        pic('12_nacht_wildschweine')
        # noon over the meadows: the kite circling
        at(12, 30, date=(9, 10))
        k = J("(() => { const g = TIERE.groups.filter(g => g.art === 'rotmilan')[0]; return { id: g.id, home: g.home, plan: TIERE.plan(g) }; })()")
        print('kite', k, flush=True)
        ck('by day in September the red kite is aloft', k['plan']['where'] == 'sky', str(k['plan']))
        kx, ky = k['home']
        E(f"__view({kx} + 30, {ky} - 120, ROADS.groundAt({kx} + 30, {ky} - 120) + 1.65, 0, 22, 60); GAME.step(0.1)")
        steps(1.5)
        lk = J("TIERE.list().filter(a => a.art === 'rotmilan')")
        ck('… circling over the open land, 40–90 m up', len(lk) >= 1 and all(30 < a['z'] - E(f"ROADS.groundAt({a['x']}, {a['y']})") < 100 for a in lk), str(lk))
        if lk:
            a = lk[0]
            yaw3 = math.degrees(math.atan2(a['x'] - (kx + 30), a['y'] - (ky - 120)))
            gz = E(f"ROADS.groundAt({kx} + 30, {ky} - 120)")
            pit = math.degrees(math.atan2(a['z'] - gz - 1.65, math.hypot(a['x'] - kx - 30, a['y'] - ky + 120)))
            E(f"__view({kx} + 30, {ky} - 120, {gz} + 1.65, {yaw3}, {pit}, 14); GAME.step(0.05)")
            pic('13_mittag_milan')
    if 'flucht' in want:
        # walk at the roe deer: they look up, then the group bounds away towards cover, and stays there a while
        at(16, 50, date=(11, 5))
        E("TIERE.reset(); HUND.on = false; if (HUND.model) HUND.model.g.visible = false")
        r = J("(() => { const g = TIERE.nearest('reh', -560, -560); return { id: g.id, home: g.home, feed: g.feed }; })()")
        fx, fy = r['feed']
        hx, hy = r['home']
        dx, dy = fx - hx, fy - hy
        L = math.hypot(dx, dy) or 1
        vx, vy = fx + dx / L * 160, fy + dy / L * 160
        yaw = math.degrees(math.atan2(fx - vx, fy - vy))
        E(f"__view({vx}, {vy}, ROADS.groundAt({vx}, {vy}) + 1.65, {yaw}, -2, 45); GAME.step(0.1)")
        steps(1.0)
        n0 = J(f"TIERE.list().filter(a => a.g === '{r['id']}')")
        ck('the group is there, not fleeing yet', len(n0) >= 1 and not any(a['mode'] == 'flee' for a in n0), str(n0))
        # walk towards them in steps of 10 m and note when they look up and when they go
        alert_at = flee_at = None
        for i in range(14):
            d = 160 - (i + 1) * 10
            px, py = fx + dx / L * d, fy + dy / L * d
            E(f"(() => {{ const P = GAME.P; P.x = {px}; P.y = {py}; P.feet = GAME.floorAt(P.x, P.y, P.feet + 2); P.speed = 1.3; }})()")
            steps(0.6)
            q = J(f"TIERE.list().filter(a => a.g === '{r['id']}')")
            if alert_at is None and any(a['alert'] > 0.3 for a in q): alert_at = d
            if flee_at is None and any(a['mode'] == 'flee' for a in q):
                flee_at = d
                break
        print('alert at', alert_at, 'flee at', flee_at, flush=True)
        ck('they look up first (alert before the flight)', alert_at is not None and (flee_at is None or alert_at > flee_at), f'{alert_at} / {flee_at}')
        ck('they flee at a roe deer\'s flight distance (70–130 m from a walker at dusk)', flee_at is not None and 60 <= flee_at <= 130, str(flee_at))
        E("GAME.step(0.05)")
        pic('20_flucht_rehe')
        steps(1.2)
        pic('21_flucht_rehe_spiegel')
        q1 = J(f"TIERE.list().filter(a => a.g === '{r['id']}')")
        ck('the whole group goes, fast (bounding)', len(q1) >= 1 and all(a['mode'] == 'flee' for a in q1) and max(a['v'] for a in q1) > 6, str(q1))
        ev = J("window.__ev.filter(e => e.ev === 'flucht')")
        hist = J("KERN.events().filter(e => /^tiere/.test(e.name)).map(e => ({ name: e.name, art: e.data && e.data.art }))")
        print('events', hist, flush=True)
        ck('an event tiere:flucht for the strategy mode', any(e.get('art') == 'reh' for e in ev) or any(h['name'] == 'tiere:flucht' and h['art'] == 'reh' for h in hist), str(ev)[:200])
        steps(8)
        pl = J(f"TIERE.plan(TIERE.groups.find(g => g.id === '{r['id']}'))")
        ck('startled, the group keeps to cover for a while', pl['where'] == 'cover', str(pl))
    if 'hund' in want:
        at(10, 0, date=(11, 6))
        E("HUND.on = true")
        # on the open field by the L 1625, walking north-east
        E("__view(-150, -400, ROADS.groundAt(-150, -400) + 1.65, 40, -4, 60); GAME.step(0.1)")
        E("(() => { const P = GAME.P; P.body = P.yaw = 40; HUND.x = P.x + 1; HUND.y = P.y - 6; })()")
        steps(0.2)
        d0 = J("HUND.state()")
        # walk 25 m (forward input) – he keeps up
        r0 = J("GAME.step(0.025)")
        for i in range(10):
            E("GAME.step(0.5, 1)")
        d1 = J("HUND.state()")
        print('dog', d0, d1, flush=True)
        ck('the dog follows the walker (stays within 5 m)', d1['visible'] and d1['dist'] < 5.0, str(d1))
        steps(7)
        d2 = J("HUND.state()")
        ck('standing still he sits beside you (after a few seconds)', d2['still'] > 2.5 and d2['dist'] < 4.5, str(d2))
        # a picture from behind the walker towards the dog
        E("(() => { const P = GAME.P, D = HUND; const yaw = Math.atan2(D.x - P.x, D.y - P.y) * 180 / Math.PI; __view(P.x - Math.sin(yaw * Math.PI / 180) * 2.5, P.y - Math.cos(yaw * Math.PI / 180) * 2.5, GAME.floorAt(P.x, P.y, P.feet) + 1.5, yaw, -18, 55); })()")
        E("GAME.step(0.05)")
        pic('30_hund_sitzt')
    if 'einfluss' in want:
        # the influence: a planting at the Klinge (half guarded), last summer's beetle spruces, the stork's quiet zone, rooting and the
        # electric fence, signs found by walking up to them – no new shader program for any of it
        at(11, 0, date=(11, 6))
        steps(1.0)
        st = J("TEINFLUSS.state()")
        print('influence', st, flush=True)
        ck('a planting of young trees at the Klinge, half of them in tree guards', st['plot'] and st['plot']['n'] == 40 and st['guarded'] >= 20, str(st))
        ck('last summer\'s bark beetle spruces are there (red-brown and grey crowns)', sum(st['kaefer'].values()) >= 8, str(st['kaefer']))
        tinted = E("FOREST.list.filter(t => t.tint).length")
        ck('… their crowns tinted in the forest (world/forest.js hook)', tinted >= 8, str(tinted))
        px, py = (st['plot']['x'], st['plot']['y']) if st['plot'] else (-470, -500)
        E(f"__view({px} + 6, {py} - 9, ROADS.groundAt({px} + 6, {py} - 9) + 1.6, -15, -12, 55); GAME.step(0.1)")
        pa = progs()
        E("GAME.step(0.05)")
        pic('40_pflanzung_vorher')
        ck('no new shader program for saplings, guards and signs', progs() <= pa, f'{pa} -> {progs()}')
        b0 = J("TIERE.baeume().filter(t => t.plot)")
        # a winter and spring in time-lapse (November to April)
        E("TIERE.sim(160)")
        steps(0.3)
        b1 = J("TIERE.baeume().filter(t => t.plot)")
        prot1 = [t for t in b1 if t['geschuetzt']]
        open1 = [t for t in b1 if not t['geschuetzt']]
        print('browsed: guarded', sum(1 for t in prot1 if t['dmg'] >= 0.4), 'of', len(prot1), '– open', sum(1 for t in open1 if t['dmg'] >= 0.4), 'of', len(open1), flush=True)
        ck('time-lapse winter: no guarded young tree browsed', all(t['dmg'] == 0 for t in prot1), str([t['dmg'] for t in prot1]))
        ck('… but many of the unguarded ones (fir and maple first)', sum(1 for t in open1 if t['dmg'] >= 0.4) >= 5, str([(t['art'], t['dmg']) for t in open1]))
        E("GAME.step(0.05)")
        pic('41_pflanzung_nach_winter')
        # close by the unguarded half: browsed firs without their leader, beeches holding dry leaves, bare maples and larches
        E(f"__view({px} + 11, {py} - 2.6, ROADS.groundAt({px} + 11, {py} - 2.6) + 1.6, -25, -22, 50); GAME.step(0.1)")
        pic('41b_pflanzung_nah')
        sch = J("TIERE.schaden({ season: 'winter' })")
        ck('the damage per season for the strategy mode (TIERE.schaden)', sch['sum'].get('verbiss', 0) >= 5, str(sch['sum']))
        # the black stork's quiet zone
        nest = J("TEINFLUSS.state().nest")
        g = J("TIERE.groups.find(g => g.art === 'schwarzstorch').nest")
        at(11, 0, date=(5, 10))
        r1 = J(f"TIERE.ruhe({g[0]} + 60, {g[1]})")
        r2 = J(f"TIERE.ruhe({g[0]} + 220, {g[1]})")
        at(11, 0, date=(11, 6))
        r3 = J(f"TIERE.ruhe({g[0]} + 220, {g[1]})")
        ck('quiet zone: no felling within 100 m of the stork\'s nest, within 300 m none in the breeding season, free in November',
           r1 and r1['zone'] == 'horst' and r2 and r2['zone'] == 'brutzeit' and r3 is None, f'{r1} | {r2} | {r3}')
        if nest:
            E(f"__view({nest[0]} - 14, {nest[1]} - 10, ROADS.groundAt({nest[0]} - 14, {nest[1]} - 10) + 1.7, 55, 38, 60); GAME.step(0.1)")
            pic('42_horst')
        # beetle trees from the field, and the bore dust at the foot of a fresh one
        kl = J("TIERE.kaefer.list()")
        red = [k for k in kl if k['stage'] == 2]
        if red:
            k = red[0]
            E(f"__view({k['x']} + 26, {k['y']} + 30, ROADS.groundAt({k['x']} + 26, {k['y']} + 30) + 1.7, {math.degrees(math.atan2(-26, -30))}, 8, 60); GAME.step(0.1)")
            pic('43_kaeferfichten')
        # the bark beetle through a summer (time-lapse May to August): new attacks, the brood flies out into the neighbours after
        # ~6 weeks; a beetle tree taken out of the forest is gone from the list
        at(11, 0, date=(5, 1))
        k0 = J("TIERE.schaden().sum")
        E("TIERE.sim(110)")
        k1 = J("TIERE.schaden().sum")
        print('beetle summer', k0, k1, flush=True)
        ck('a summer in time-lapse: new beetle attacks and broods flying out', (k1.get('kaefer', 0) > k0.get('kaefer', 0)) and (k1.get('ausflug', 0) > k0.get('ausflug', 0)), f'{k0} -> {k1}')
        kl = J("TIERE.kaefer.list()")
        fresh = [k for k in kl if k['stage'] < 3]
        if fresh:
            E(f"TIERE.kaefer.raus({fresh[0]['id']})")
            ck('a beetle tree out of the forest (felled and taken out) is off the list, its crown untinted', not any(k['id'] == fresh[0]['id'] for k in J("TIERE.kaefer.list()")) and not E(f"!!FOREST.byId({fresh[0]['id']}).tint"), str(fresh[0]))
        # rooting in the garden: an electric fence keeps the sounders out (counted from the damage log: nights in the garden)
        garden_n = "TIERE.schaden({ circle: [-4, -10, 12] }).sum.wuehlen || 0"
        E("TIERE.schutz.add({ id: 'ez', kind: 'elektrozaun', x: -4, y: -10, r: 40 })")
        at(11, 0, date=(9, 1))
        w0 = J(garden_n)
        E("TIERE.sim(90)")
        w1 = J(garden_n)
        E("TIERE.schutz.remove('ez')")
        at(11, 0, date=(9, 1))
        E("TIERE.sim(90)")
        w2 = J(garden_n)
        print('garden rooting nights', w0, w1, w2, flush=True)
        ck('with the electric fence no rooting in the garden meadow (an autumn)', w1 == w0, f'{w0} -> {w1}')
        ck('… without it the sounders come (autumn nights, several running)', w2 > w1, f'{w1} -> {w2}')
        E("__view(-4, -18, ROADS.groundAt(-4, -18) + 1.7, 0, -14, 60); GAME.step(0.1)")
        pic('44_garten_wuehlstellen')
        # chickens where someone decides to keep them (the strategy mode): coop and flock in the garden, eggs, the fox and the open hatch
        E("TIERE.huehner({ x: 14, y: -20, n: 6, zu: true })")
        at(10, 0, date=(5, 10))
        steps(1.6)
        hh = J("({ coop: !!THUEHNER.coop, hens: THUEHNER.hens.length, c: TEINFLUSS.E.huehner })")
        ck('chickens: a coop and six hens where the strategy mode puts them', hh['coop'] and hh['hens'] == 6, str(hh))
        E("__view(9.0, -26.5, ROADS.groundAt(9.0, -26.5) + 1.65, 40, -16, 60); GAME.step(0.1)")
        steps(0.6)
        pic('46_huehner')
        e0 = J("TEINFLUSS.E.huehner.eier")
        E("TIERE.sim(10)")
        e1 = J("TEINFLUSS.E.huehner")
        ck('in May six hens lay four to five eggs a day', e1['eier'] - e0 >= 30, f"{e0} -> {e1}")
        E("TIERE.huehner({ x: 14, y: -20, n: 6, zu: false })")
        E("TIERE.sim(60)")
        e2 = J("TEINFLUSS.E.huehner")
        ck('the hatch left open at night: the fox takes hens', e2['n'] < 6, str(e2))
        E("TIERE.huehner(null)")
        steps(1.2)
        ck('… and without chickens no coop', not E("!!THUEHNER.coop"), '')
        # a sign found: walk to a wallow
        w = J("TIERE.groups.find(g => g.art === 'wildschwein').wallowAt")
        E(f"__view({w[0]} + 5, {w[1]}, ROADS.groundAt({w[0]} + 5, {w[1]}) + 1.7, -90, -25, 60); GAME.step(0.1)")
        steps(1.2)
        ev = J("window.__ev.filter(e => e.kind === 'spur')")
        ck('a sign found: the wallow (tiere:entdeckt, kind spur, with a source)', any(e['id'] == 'suhle' for e in ev), str(ev)[:300])
        pic('45_suhle')
        ck('the strategy mode\'s numbers: counts, nature value', J("Object.keys(TIERE.counts()).length") >= 5 and 0 <= E("TIERE.naturwert()") <= 100, str(J("TIERE.counts()")))
    if 'lernen' in want:
        # the dog learns: what he did last is what praise and scolding are about; commands; the panel; kept after a reload
        at(10, 30, date=(11, 6))
        E("HUND.on = true; __view(-150, -400, ROADS.groundAt(-150, -400) + 1.65, 40, -4, 60); GAME.step(0.1)")
        steps(1.5)
        l0 = J("HUND.state()")
        E("HUND.act('vertreiben'); HUND.lob(1)")
        l1 = J("HUND.state()")
        ck('praised after driving game off: he tends to do it more', l1['learn']['vertreiben'] > l0['learn']['vertreiben'], f"{l0['learn']['vertreiben']} -> {l1['learn']['vertreiben']}")
        E("HUND.act('jagen'); HUND.lob(-1)")
        l2 = J("HUND.state()")
        ck('scolded after chasing game far: he tends to do it less', l2['learn']['jagen'] < l1['learn']['jagen'], f"{l1['learn']['jagen']} -> {l2['learn']['jagen']}")
        E("HUND.act('bellen'); HUND.lob(-1)")
        l3 = J("HUND.state()")
        ck('scolded for barking at a neighbour: he becomes calmer with people', l3['learn']['ruhe'] > l2['learn']['ruhe'], f"{l2['learn']['ruhe']} -> {l3['learn']['ruhe']}")
        ck('praise strengthens the bond', l1['bindung'] > l0['bindung'], f"{l0['bindung']} -> {l1['bindung']}")
        # the keys: + praises (what he did last)
        E("HUND.act('suchen'); window.dispatchEvent(new KeyboardEvent('keydown', { key: '+' }))")
        l4 = J("HUND.state()")
        ck('the key + praises (finding things: more searching)', l4['learn']['suchen'] > l3['learn']['suchen'], f"{l3['learn']['suchen']} -> {l4['learn']['suchen']}")
        vis = E("!!document.getElementById('hund-panel') && !document.getElementById('hund-panel').hidden")
        ck('the dog\'s buttons are there when he is near (call, send, praise, scold)', vis, str(vis))
        # sent: to a point 25 m ahead – he runs there and searches
        E("HUND.schicken()")
        m1 = J("HUND.state()")
        steps(5)
        m2 = J("HUND.state()")
        ck('sent (U) he runs ahead to where you look', m1['mode'] == 'gehen' and (m2['dist'] > 8 or m2['mode'] in ('suchen', 'follow')), f"{m1['mode']} -> {m2['mode']} {m2['dist']}")
        E("HUND.rufen()")
        steps(6)
        m3 = J("HUND.state()")
        ck('called (P) he comes back to heel', m3['mode'] == 'follow' and m3['dist'] < 6, str(m3))
        # of his own accord: game near the walker in the open – with the urge to chase high he goes after it, the deer flee
        r = J("(() => { const g = TIERE.nearest('reh', -150, -400); return { id: g.id, feed: g.feed }; })()")
        E("HUND.learn.jagen = 1; HUND.learn.vertreiben = 1; HUND.char.eifer = 1")
        at(16, 50, date=(11, 6))
        E(f"TIERE.reset(); __view({r['feed'][0]} + 95, {r['feed'][1]}, ROADS.groundAt({r['feed'][0]} + 95, {r['feed'][1]}) + 1.65, -90, -2, 60); GAME.step(0.1)")
        steps(1.0)
        E(f"(() => {{ const P = GAME.P; HUND.x = P.x - 1; HUND.y = P.y; HUND.mode = 'follow'; HUND.task = null; }})()")
        E(f"(() => {{ const a = TIERE.live.find(a => a.g.id === '{r['id']}'); if (a) {{ HUND.x = a.x + 60; HUND.y = a.y; }} }})()")
        chased = None
        for i in range(12):
            E("HUND.decide()")
            steps(0.5)
            st = J("HUND.state()")
            if st['mode'] in ('jagen', 'vertreiben'):
                chased = st['mode']
                break
        ck('of his own accord he goes after game (a tendency learned), the deer flee', chased is not None and any(a['mode'] == 'flee' for a in J("TIERE.list().filter(a => a.art === 'reh')")) , f'{chased}')
        E("GAME.step(0.05)")
        pic('50_hund_jagt')
        steps(16)
        st = J("HUND.state()")
        ck('… and remembers what he did (for praise or scolding)', st['recent'] in ('jagen', 'vertreiben'), str(st))
        E("HUND.lob(-1)")
        want_l = J("HUND.state().learn")
        print('learned', want_l, flush=True)
        # kept after a reload
        pg.reload(wait_until='domcontentloaded')
        pg.wait_for_function("window.GAME && GAME.loaded && GAME.loaded()", timeout=1500000, polling=2000)
        time.sleep(2)
        E("window.FREEZE = true")
        E(VIEWFN)
        got = J("HUND.state().learn")
        print('after reload', got, flush=True)
        ck('what he learned is kept after a reload (pav-hund-v1)', all(abs(got[k] - want_l[k]) < 0.002 for k in want_l), f'{want_l} / {got}')
        seen = J("Object.keys((SAVE.get('pav-tiere-v1') || {}).seen || {})")
        ck('the species seen are kept too (pav-tiere-v1)', 'reh' in seen, str(seen))
    if 'andere' in want:
        # the rest of the game unharmed: Schleusingen, then the zombie night (the dog's buttons out of the way, no page errors)
        E("GAME.go && GAME.go('schleusingen')")
        steps(3)
        sl = J("TIERE.state()")
        ck('Schleusingen: the animals keep to their numbers (few near, none in the town square)', sl['live'] <= 26, str(sl['liveByArt']))
        pic('60_schleusingen')
        sc = J("KERN.scenarios().map(s => s.name || s.id || s)")
        print('scenarios', str(sc)[:300], flush=True)
        try:
            E("(() => { const s = KERN.scenarios().find(s => (s.name || s.id) === 'zombie'); if (s && s.run) s.run(); })()")
            steps(6)
            z = J("({ on: !!(window.ZSTATE && ZSTATE.on), panel: !!document.getElementById('hund-panel') && !document.getElementById('hund-panel').hidden })")
            ck('the zombie night starts with the animals in the world, the dog\'s buttons hidden there', z['on'] and not z['panel'], str(z))
        except Exception as e:
            ck('the zombie night starts with the animals in the world', False, repr(e)[:200])
    ck.errors(errs)
    if 'telefon' in want:
        # a phone (Falko's iPhone): fewer animals, the dog's buttons inside the screen and clear of the joystick and the jump buttons
        pg.close()
        errs2 = []
        pp = lib.page(b, 390, 844, errs2, 'schnell', is_mobile=True, has_touch=True, device_scale_factor=2)
        lib.boot(pp, port)
        E2 = pp.evaluate
        E2(VIEWFN)
        E2("GAME.setView3(false, true); (() => { const d = Math.floor(CLOCK.t / 1440); DN.e0 = Date.UTC(2026, 10, 5) / 864e5 - d; CLOCK.t = d * 1440 + 16 * 60 + 50; DN.update(true); })()")
        E2("__view(-150, -400, ROADS.groundAt(-150, -400) + 1.65, 40, -4, 60); GAME.step(0.1)")
        for i in range(40): E2("GAME.step(0.05)")
        ph = json.loads(E2("""JSON.stringify((() => { const R = id => { const e = document.getElementById(id); if (!e || e.hidden) return null; const r = e.getBoundingClientRect();
          return r.width ? [r.left, r.top, r.right, r.bottom].map(Math.round) : null; }; return { coarse: TIERE.max, live: TIERE.live.length, dog: R('hund-panel'), moves: R('moves'), joy: R('joy'), w: innerWidth, h: innerHeight }; })())"""))
        print('phone', ph, flush=True)
        ck('phone: at most 14 animals as models (instead of 26)', ph['coarse'] == 14 and ph['live'] <= 14, str(ph))
        apart = lambda a, c: (not a or not c) or a[2] <= c[0] or c[2] <= a[0] or a[3] <= c[1] or c[3] <= a[1]
        ck('phone: the dog\'s buttons inside the screen, clear of the joystick and the jump buttons', ph['dog'] and ph['dog'][0] >= 0 and ph['dog'][2] <= ph['w'] and ph['dog'][3] <= ph['h'] and apart(ph['dog'], ph['moves']) and apart(ph['dog'], ph['joy']), str(ph))
        try:
            E2("GAME.shot()"); pp.screenshot(path=os.path.join(OUT, '70_telefon.png'), timeout=120000)
        except Exception as e: print('note: phone picture', repr(e)[:120])
        ck.errors(errs2)
ck.done()
