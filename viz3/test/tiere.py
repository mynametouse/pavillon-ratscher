# feat/tiere (Falko 5.11.2026 23:20/23:24: the animals that really live around Ratscher, with influence; a companion dog that learns):
# the bodies (procedural, true to size, one shared material – no new shader program), the habitat from the real crowns (forest, edge,
# open land), the groups by the sun and the calendar (roe deer at dusk at the forest edge, wild boar at night on the field, the red kite
# by day over the meadows), flight from the walker at the real distance (the group goes together), the first sighting as an event for
# the discovery book, the dog following, sitting, lying. Pictures in out/tiere/ (look at them).
#   python3 viz3/test/tiere.py 9003 [sections]      sections: bau,welt,flucht,hund,einfluss (default all)
import sys, os, json, time, math
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__))); import lib
port = sys.argv[1] if len(sys.argv) > 1 else '8951'
want = set((sys.argv[2] if len(sys.argv) > 2 else 'bau,welt,flucht,hund,einfluss').split(','))
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
    E("window.__ev = []; KERN.on('tiere:entdeckt', e => window.__ev.push(e)); KERN.on('tiere:flucht', e => window.__ev.push(Object.assign({ ev: 'flucht' }, e)))")
    st = J("TIERE.state()")
    ck('the animals are there (TIERE, HUND, the body builder)', E("!!(window.TIERE && window.HUND && window.TKOERPER)"), str(st))
    p0 = progs()
    print('programs after load', p0, flush=True)
    if 'bau' in want:
        # a model sheet at noon on the field by the L 1625, the forest behind: doe, buck, fawn, sow, piglets, the dog, a kite
        E("TIERE.on = false; HUND.on = false")
        at(12, 0, date=(7, 10))
        x0, y0 = -150, -400
        E(f"GAME.view({x0}, {y0}, ROADS.groundAt({x0}, {y0}) + 1.5, 225, -6, 50); GAME.step(0.1)")
        E("GAME.shot()")
        pa = progs()
        # (name, kind, variant, scale, close-up distance, eye height): November coats, the summer ones for comparison
        SHEET = [('reh_ricke_winter', 'reh', {'winter': True}, 1, 2.6, 0.75), ('reh_bock_sommer', 'reh', {'antler': True}, 1, 2.6, 0.8),
                 ('reh_kitz_sommer', 'reh', {'spots': True}, 0.55, 1.8, 0.5), ('sau', 'sau', {}, 1, 3.4, 0.7),
                 ('frischling_november', 'sau', {'young': True}, 0.68, 2.6, 0.55), ('frischling_juni', 'sau', {'young': True, 'stripes': True}, 0.4, 1.6, 0.4),
                 ('hund', 'hund', {}, 1, 2.6, 0.7), ('fuchs', 'fuchs', {}, 1, 1.8, 0.45), ('hase', 'hase', {}, 1, 1.4, 0.35),
                 ('dachs', 'dachs', {}, 1, 1.8, 0.4), ('waschbaer', 'waschbaer', {}, 1, 1.6, 0.4), ('marder', 'marder', {}, 1, 1.3, 0.3),
                 ('wildkatze', 'katze', {}, 1, 1.6, 0.45), ('hirsch_alttier', 'hirsch', {'winter': True}, 1, 4.2, 1.2),
                 ('hirsch_brunft', 'hirsch', {'winter': True, 'antler': True}, 1.05, 4.8, 1.35)]
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
        tri = J("window.__sheet.map(A => ({ k: A.kind, tri: A.mesh.geometry.index.count / 3, bones: A.mesh.skeleton.bones.length, h: +(new THREE.Box3().setFromObject(A.g).getSize(new THREE.Vector3()).y).toFixed(2), l: +(new THREE.Box3().setFromObject(A.g).getSize(new THREE.Vector3()).length()).toFixed(2) }))")
        print('models', tri, flush=True)
        H = {t['k']: t['h'] for t in tri}
        ck('true to size: roe deer 1.0–1.3 m to the ears, boar 0.8–1.0 m, dog 0.75–0.95 m, fox 0.45–0.65 m, red deer 1.7–2.1 m',
           1.0 < tri[0]['h'] < 1.35 and 0.75 < tri[3]['h'] < 1.05 and 0.7 < tri[6]['h'] < 0.98 and 0.42 < tri[7]['h'] < 0.68 and 1.65 < tri[13]['h'] < 2.15,
           str([(t['k'], t['h']) for t in tri]))
        ck('cheap: each animal one mesh of fewer than 4000 triangles', all(t['tri'] < 4000 for t in tri), str([t['tri'] for t in tri]))
        def closeups(tag, only=None):
            for i, (n, kind, var, sc, dd, eh) in enumerate(SHEET):
                if only and n not in only: continue
                E(f"""(() => {{ const A = window.__sheet[{i}], yaw = 225 * Math.PI / 180, fx = Math.sin(yaw), fy = Math.cos(yaw);
                  const x = A.g.position.x, y = -A.g.position.z, cx = x - fx * {dd}, cy = y - fy * {dd};
                  window.__sheet.forEach((B, j) => B.g.visible = j === {i});
                  GAME.view(cx, cy, ROADS.groundAt(cx, cy) + {eh}, 225, -4, 42); }})()""")
                E("GAME.step(0.02)")
                pic(f'02_{tag}_{i:02d}_{n}')
            E("window.__sheet.forEach(B => B.g.visible = true)")
        closeups('stand')
        # movement: walking, trotting, bounding, rooting, lying, sitting …
        E("""(() => { const P = [[0.8, {}], [2.4, {}], [9, { flee: 1 }], [0, { dig: 1 }], [0, { lie: 1 }], [1.0, {}], [0, { sit: 1, wag: 1 }],
            [2.5, {}], [6, { flee: 1 }], [0, { dig: 1 }], [1, {}], [5, {}], [0, { sit: 1, alert: 0.4 }], [1.4, {}], [0, { alert: 1, look: 0.7 }]];
          window.__sheet.forEach((A, i) => { const q = P[i]; for (let k = 0; k < 40; k++) A.anim(0.033, q[0], q[1]); }); })()""")
        closeups('pose', ['reh_ricke_winter', 'reh_bock_sommer', 'reh_kitz_sommer', 'sau', 'hund', 'fuchs', 'hase', 'wildkatze', 'hirsch_brunft'])
        E("""(() => { const P = [[0, { graze: 1 }], [0, { alert: 1, look: 0.8 }], [0, { lie: 1 }], [3, {}], [1.2, {}], [0, { lie: 1 }], [5, {}],
            [0, { graze: 0.55 }], [0, { graze: 0.7 }], [0, { lie: 1 }], [0, {}], [0, {}], [0, {}], [0, { graze: 1 }], [0, {}]];
          window.__sheet.forEach((A, i) => { const q = P[i]; for (let k = 0; k < 60; k++) A.anim(0.033, q[0], q[1]); }); })()""")
        closeups('pose2', ['reh_ricke_winter', 'reh_bock_sommer', 'reh_kitz_sommer', 'sau', 'hund', 'fuchs', 'hase', 'hirsch_alttier'])
        # the kite from below and the side, close
        E(f"""(() => {{ const A = TKOERPER.make('milan', {{}}); GAME.scene.add(A.g); const x = {x0} - 4, y = {y0} - 4;
          A.g.position.set(x, ROADS.groundAt(x, y) + 3.2, -y); A.g.rotation.y = 0.6; A.anim(0.05, 8, {{ flap: 0, bank: 0.2, twist: 0.3 }}); window.__kite = A; }})()""")
        E(f"GAME.view({x0}, {y0}, ROADS.groundAt({x0}, {y0}) + 1.6, 225, 24, 50); GAME.step(0.05)")
        pic('03_milan_nah')
        E(f"""(() => {{ const A = window.__kite, x = {x0} - 4, y = {y0} - 4; A.g.rotation.y = 2.3; A.anim(0.05, 8, {{ flap: 0, bank: 0, twist: 0.2 }});
          GAME.view(x + 0.3, y + 0.3, ROADS.groundAt(x, y) + 1.0, 225, 62, 60); }})()""")
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
        E(f"GAME.view({vx}, {vy}, ROADS.groundAt({vx}, {vy}) + 1.65, {yaw}, -2, 45); GAME.step(0.1)")
        steps(1.2)
        lv = J("TIERE.list().filter(a => a.art === 'reh')")
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
            E(f"GAME.view({vx}, {vy}, ROADS.groundAt({vx}, {vy}) + 1.65, {yaw2}, -1, 9); GAME.step(0.05)")
            pic('11_dammerung_reh_tele')
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
        E(f"GAME.view({vx}, {vy}, ROADS.groundAt({vx}, {vy}) + 1.65, {yaw}, -3, 40); GAME.step(0.1)")
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
        E(f"GAME.view({kx} + 30, {ky} - 120, ROADS.groundAt({kx} + 30, {ky} - 120) + 1.65, 0, 22, 60); GAME.step(0.1)")
        steps(1.5)
        lk = J("TIERE.list().filter(a => a.art === 'rotmilan')")
        ck('… circling over the open land, 40–90 m up', len(lk) >= 1 and all(30 < a['z'] - E(f"ROADS.groundAt({a['x']}, {a['y']})") < 100 for a in lk), str(lk))
        if lk:
            a = lk[0]
            yaw3 = math.degrees(math.atan2(a['x'] - (kx + 30), a['y'] - (ky - 120)))
            gz = E(f"ROADS.groundAt({kx} + 30, {ky} - 120)")
            pit = math.degrees(math.atan2(a['z'] - gz - 1.65, math.hypot(a['x'] - kx - 30, a['y'] - ky + 120)))
            E(f"GAME.view({kx} + 30, {ky} - 120, {gz} + 1.65, {yaw3}, {pit}, 14); GAME.step(0.05)")
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
        E(f"GAME.view({vx}, {vy}, ROADS.groundAt({vx}, {vy}) + 1.65, {yaw}, -2, 45); GAME.step(0.1)")
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
        ck('an event tiere:flucht for the strategy mode', any(e.get('art') == 'reh' for e in ev), str(ev)[:200])
        steps(8)
        pl = J(f"TIERE.plan(TIERE.groups.find(g => g.id === '{r['id']}'))")
        ck('startled, the group keeps to cover for a while', pl['where'] == 'cover', str(pl))
    if 'hund' in want:
        at(10, 0, date=(11, 6))
        E("HUND.on = true")
        # on the open field by the L 1625, walking north-east
        E("GAME.view(-150, -400, ROADS.groundAt(-150, -400) + 1.65, 40, -4, 60); GAME.step(0.1)")
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
        E("(() => { const P = GAME.P, D = HUND; const yaw = Math.atan2(D.x - P.x, D.y - P.y) * 180 / Math.PI; GAME.view(P.x - Math.sin(yaw * Math.PI / 180) * 2.5, P.y - Math.cos(yaw * Math.PI / 180) * 2.5, GAME.floorAt(P.x, P.y, P.feet) + 1.5, yaw, -18, 55); })()")
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
        px, py = st['plot']['x'], st['plot']['y']
        E(f"GAME.view({px} + 6, {py} - 9, ROADS.groundAt({px} + 6, {py} - 9) + 1.6, -15, -12, 55); GAME.step(0.1)")
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
            E(f"GAME.view({nest[0]} - 14, {nest[1]} - 10, ROADS.groundAt({nest[0]} - 14, {nest[1]} - 10) + 1.7, 55, 38, 60); GAME.step(0.1)")
            pic('42_horst')
        # beetle trees from the field, and the bore dust at the foot of a fresh one
        kl = J("TIERE.kaefer.list()")
        red = [k for k in kl if k['stage'] == 2]
        if red:
            k = red[0]
            E(f"GAME.view({k['x']} + 26, {k['y']} + 30, ROADS.groundAt({k['x']} + 26, {k['y']} + 30) + 1.7, {math.degrees(math.atan2(-26, -30))}, 8, 60); GAME.step(0.1)")
            pic('43_kaeferfichten')
        # rooting in the garden: an electric fence keeps the sounders out
        E("TIERE.schutz.add({ id: 'ez', kind: 'elektrozaun', x: -4, y: -10, r: 40 })")
        at(11, 0, date=(9, 20))
        w0 = J("TEINFLUSS.E.wuehl.filter(w => Math.hypot(w[0] + 4, w[1] + 10) < 12).length")
        E("TIERE.sim(60)")
        w1 = J("TEINFLUSS.E.wuehl.filter(w => Math.hypot(w[0] + 4, w[1] + 10) < 12).length")
        E("TIERE.schutz.remove('ez')")
        E("TIERE.sim(60)")
        w2 = J("TEINFLUSS.E.wuehl.filter(w => Math.hypot(w[0] + 4, w[1] + 10) < 12).length")
        print('garden rooting', w0, w1, w2, flush=True)
        ck('with the electric fence no rooting in the garden meadow (autumn)', w1 == w0, f'{w0} -> {w1}')
        ck('… without it the sounders come (autumn nights)', w2 > w1, f'{w1} -> {w2}')
        E("GAME.view(-4, -18, ROADS.groundAt(-4, -18) + 1.7, 0, -14, 60); GAME.step(0.1)")
        pic('44_garten_wuehlstellen')
        # a sign found: walk to a wallow
        w = J("(() => { const g = TIERE.groups.find(g => g.art === 'wildschwein'); return [g.home[0] + 18 * Math.cos(g.seed % 7), g.home[1] + 18 * Math.sin(g.seed % 7)]; })()")
        E(f"GAME.view({w[0]} + 5, {w[1]}, ROADS.groundAt({w[0]} + 5, {w[1]}) + 1.7, -90, -25, 60); GAME.step(0.1)")
        steps(1.2)
        ev = J("window.__ev.filter(e => e.kind === 'spur')")
        ck('a sign found: the wallow (tiere:entdeckt, kind spur, with a source)', any(e['id'] == 'suhle' for e in ev), str(ev)[:300])
        pic('45_suhle')
        ck('the strategy mode\'s numbers: counts, nature value', J("Object.keys(TIERE.counts()).length") >= 5 and 0 <= E("TIERE.naturwert()") <= 100, str(J("TIERE.counts()")))
    ck.errors(errs)
ck.done()
