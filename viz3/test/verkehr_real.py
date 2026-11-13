# feat/verkehr-real: the traffic of today – vehicles after real measures (verkehr/vk_typen.js), built in a worker (lazy/verkehr-bau.js),
# drawn by one material in three levels (verkehr/vk_modelle.js), driving with the place traffic (verkehr/verkehr_auto.js), the density by
# road, weekday and hour (verkehr/vk_dichte.js), the flow on every road round the observer (verkehr/vk_strom.js), the top view.
# Pictures in out/verkehr_real/.
#   bash tools/browser_lock.sh python3 viz3/test/run.py --port 8962 --serve verkehr_real      (or: python3 viz3/test/verkehr_real.py 8962 bau,bild)
# Sections (second argument, comma-separated): bau,bild,nacht,lod,zug,leih,dichte,strom,regeln,ampel,oben,perf
import sys, os, time, json, math
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import lib

port = sys.argv[1]
OUT = lib.out('verkehr_real')
ONLY = sys.argv[2].split(',') if len(sys.argv) > 2 else None
want = lambda k: not ONLY or k in ONLY
ck = lib.Checks('verkehr_real')
ANGER = (222, -108)


def E(pg, js):
    return pg.evaluate(js)


def J(pg, js):
    return json.loads(pg.evaluate('JSON.stringify(' + js + ')'))


def shot(pg, name):
    lib.shot(pg, OUT, name)


HELP = r"""
window.__vr = {
  day(h) { CLOCK.t = Math.floor(CLOCK.t / 1440) * 1440 + h * 60; if (window.DN && DN.active) DN.update(true); },
  until(cond, secs) { for (let t = 0; t < secs; t += 0.5) { GAME.step(0.5); if (cond()) return t; } return -1; },
  progs() { return (GAME.R.info.programs || []).length; },
  pnames() { return (GAME.R.info.programs || []).map(p => p.name + ' ' + (p.cacheKey || '').slice(0, 60)); },
  // the line of the village's traffic that passes closest to (x, y), and the arc length there
  line(x, y) { const Pl = VERKEHR.places.dorf; let best = null;
    for (const a of Pl.exits) for (const b of Pl.exits) { if (a === b) continue; const L = VERKEHR.line('dorf', a, b); if (!L) continue;
      const pr = VERKEHR.net.project(L, x, y, 0, L.L); if (pr && (!best || pr.d < best.d)) best = { L, s: pr.s, d: pr.d }; }
    return best; },
  // vehicles of the given types parked one behind the other on that line from s on (gap metres apart): their ids
  park(types, x, y, ds, gap) { const b = __vr.line(x, y); if (!b) return []; let s = b.s + (ds || 0); const ids = [];
    for (const typ of types) { const T = VKTYPEN.TYP[typ], z = VKTYPEN.TYP[T.zug], Lz = z ? T.hitch - z.kp + z.yr : T.yr;
      s += -Lz + (gap || 2);
      const c = VAUTO.spawn({ place: 'test', typ, line: b.L, s, v: 0 }); c.st = 'parkt'; ids.push(c.id); s += T.yf; }
    for (let i = 0; i < 4; i++) GAME.step(0.05);
    return ids; },
  car(id) { return VAUTO.cars.find(c => c.id === id) || null; },
  clear() { for (const c of VAUTO.cars.slice()) if (c.place === 'test') VAUTO.remove(c); },
  // the camera beside a car (side: degrees from its heading, + to its right), looking at its middle
  look(id, dist, side, h) { const c = __vr.car(id), a = c.hd + side * Math.PI / 180, cx = c.x + Math.sin(c.hd) * c.D.CY, cy = c.y + Math.cos(c.hd) * c.D.CY;
    const ax = cx + Math.sin(a) * dist, ay = cy + Math.cos(a) * dist;
    GAME.view(ax, ay, KERN.ground(ax, ay) + h, Math.atan2(cx - ax, cy - ay) * 180 / Math.PI, -Math.atan2(h - 1, dist) * 180 / Math.PI); },
};
"""

with lib.browser() as b:
    errs = []
    pg = lib.page(b, 1200, 720, errs, tier='hoch')
    lib.boot(pg, port, '?szenario=verkehr')
    E(pg, HELP)
    E(pg, "document.querySelectorAll('#toast').forEach(e => e.style.visibility = 'hidden'); GAME.setView3(false)")
    E(pg, "if (!DN.active) GAME.setMode('auto'); __vr.day(11)")
    lib.settle_light(pg)
    E(pg, "__vr.until(() => VERKEHR.state().places.dorf.on, 60)")
    p0 = E(pg, "__vr.progs()")
    n0 = J(pg, "__vr.pnames()")
    has = J(pg, "({ mod: !!window.VKMOD, typen: Object.keys(VKTYPEN.TYP).length, worker: VKMOD.stats.worker })")
    print('start', json.dumps(has), 'programs', p0, flush=True)
    ck('the modules are there (20 types)', has['mod'] and has['typen'] == 20, json.dumps(has))

    if want('bau'):
        try:
            # every type's far levels from the worker; the time the main thread spends meanwhile per frame
            t0 = time.time()
            E(pg, "for (const t of Object.keys(VKTYPEN.TYP)) VKMOD.need(t, 1)")
            worst, n = 0, 0
            while time.time() - t0 < 120:
                r = J(pg, "(() => { const a = performance.now(); GAME.step(0.05); const ms = performance.now() - a;"
                          " return { ms, done: Object.keys(VKTYPEN.TYP).filter(t => VKMOD.ready(t)).length, st: VKMOD.stats }; })()")
                worst = max(worst, r['ms'])
                n += 1
                if r['done'] == 20:
                    break
                time.sleep(0.2)
            print('built', json.dumps(r), 'in', round(time.time() - t0, 1), 's; worst step', round(worst), 'ms', flush=True)
            ck('the worker built the far levels of all 20 types', r['done'] == 20 and r['st']['worker'] is True and r['st']['fails'] == 0, json.dumps(r['st']))
            # the near level of a few
            E(pg, "for (const t of ['kompakt', 'suv', 'transporter', 'sattel', 'traktor']) VKMOD.need(t, 0)")
            ok0, t1 = -1, time.time()
            while time.time() - t1 < 60:
                E(pg, "GAME.step(0.05)")
                if E(pg, "['kompakt', 'suv', 'transporter', 'sattel', 'traktor'].every(t => (VKMOD.geo.get(t) || [])[0])"):
                    ok0 = round(time.time() - t1, 1)
                    break
                time.sleep(0.2)
            tris = J(pg, "Object.fromEntries([...VKMOD.geo].map(([t, L]) => [t, L.map(g => g ? g.tris : 0)]))")
            print('triangles by level', json.dumps(tris), flush=True)
            ck('the near level comes on request', ok0 >= 0, f'{ok0} s')
            ck('the levels thin out (far ≤ 3000 triangles, middle < near)', all(v[2] <= 3000 and v[1] > 0 for v in tris.values())
               and all(v[0] == 0 or v[1] <= v[0] for v in tris.values()), '')
        except Exception as ex:
            ck('section ran: bau', False, repr(ex)[:400])

    if want('bild') or want('nacht') or want('lod') or want('zug'):
        E(pg, "for (const t of Object.keys(VKTYPEN.TYP)) { VKMOD.need(t, 1); }")
        for k in range(200):
            E(pg, "GAME.step(0.05)")
            if E(pg, "Object.keys(VKTYPEN.TYP).every(t => VKMOD.ready(t))"):
                break
            time.sleep(0.25)

    if want('bild'):
        try:
            E(pg, "VERKEHR.autoOn(false); VERKEHR.clear(); VERKEHR.force({ peds: 0, cars: 0 })")
            ids = J(pg, f"__vr.park(['kompakt', 'suv', 'kombi', 'klein', 'limo', 'transporter'], {ANGER[0]}, {ANGER[1]}, -20, 2.5)")
            print('parked', ids, flush=True)
            ck('six cars parked on the village street', len(ids) == 6, str(ids))
            E(pg, "for (const t of ['kompakt', 'suv', 'kombi', 'klein', 'limo', 'transporter']) VKMOD.need(t, 0)")
            for k in range(120):
                E(pg, "GAME.step(0.05)")
                if E(pg, "['kompakt', 'suv', 'kombi', 'klein', 'limo', 'transporter'].every(t => (VKMOD.geo.get(t) || [])[0])"):
                    break
                time.sleep(0.25)
            for i, (side, dist) in enumerate([(35, 8), (150, 8), (90, 7)]):
                E(pg, f"__vr.look({ids[0]}, {dist}, {side}, 1.7)")
                for k in range(3):
                    E(pg, "GAME.step(0.05)")
                shot(pg, f'reihe_{i}')
            E(pg, f"__vr.look({ids[2]}, 16, 40, 2.2)")
            for k in range(3):
                E(pg, "GAME.step(0.05)")
            shot(pg, 'reihe_weit')
            lv = J(pg, f"[{','.join(str(i) for i in ids)}].map(id => __vr.car(id).vm.lod)")
            print('levels', lv, flush=True)
            p1 = E(pg, "__vr.progs()")
            new = [n for n in J(pg, "__vr.pnames()") if n not in n0]
            print('new programs', new, flush=True)
            # (a villager's figure coming into sight may bring its own – only the traffic's count: 'verkehr …' materials, 'vk-1')
            mine = [n for n in new if n.startswith('verkehr') or 'vk-1' in n]
            ck('no new shader program for the new vehicles', not mine, f'{p0} → {p1} {new}')
        except Exception as ex:
            ck('section ran: bild', False, repr(ex)[:400])

    if want('nacht'):
        try:
            E(pg, "__vr.day(22)")
            lib.settle_light(pg)
            ids = J(pg, "VAUTO.cars.filter(c => c.place === 'test').map(c => c.id)")
            if not ids:
                ids = J(pg, f"__vr.park(['kompakt', 'suv', 'kombi'], {ANGER[0]}, {ANGER[1]}, -20, 2.5)")
            # waiting in the street with the engine on (a parked car is dark)
            E(pg, f"for (const id of {json.dumps(ids)}) __vr.car(id).st = 'steht'")
            for k in range(4):
                E(pg, "GAME.step(0.05)")
            E(pg, f"__vr.look({ids[0]}, 9, 30, 1.7)")
            E(pg, "GAME.step(0.05)")
            shot(pg, 'nacht_vorn')
            E(pg, f"__vr.look({ids[0]}, 9, 160, 1.7)")
            E(pg, "GAME.step(0.05)")
            shot(pg, 'nacht_hinten')
            lamp = J(pg, f"__vr.car({ids[0]}).vm.U.uLamp.value.toArray()")
            ck('at night the head and tail lamps are on', lamp[0] > 1 and lamp[1] > 0.5, str(lamp))
            E(pg, "__vr.day(11)")
            lib.settle_light(pg)
        except Exception as ex:
            ck('section ran: nacht', False, repr(ex)[:400])

    if want('lod'):
        try:
            ids = J(pg, "VAUTO.cars.filter(c => c.place === 'test').map(c => c.id)")
            for lod in (0, 1, 2):
                E(pg, f"VKMOD.force = {lod}; for (const c of VAUTO.cars) if (c.vm) VKMOD.place(c.vm, 10)")
                E(pg, f"__vr.look({ids[0]}, 8, 35, 1.7)")
                E(pg, "GAME.step(0.05)")
                shot(pg, f'stufe_{lod}')
            E(pg, "VKMOD.force = null")
        except Exception as ex:
            ck('section ran: lod', False, repr(ex)[:400])

    if want('zug'):
        try:
            E(pg, "__vr.clear()")
            ids = J(pg, f"__vr.park(['traktor', 'sattel'], {ANGER[0]}, {ANGER[1]}, -40, 4)")
            for i, id_ in enumerate(ids):
                E(pg, f"__vr.look({id_}, 13, 40, 2.4)")
                E(pg, "GAME.step(0.05)")
                shot(pg, f'zug_{i}')
            # let the tractor unit drive round the next corners: the trailer follows inside the curve, never folded
            E(pg, f"(() => {{ const c = __vr.car({ids[1]}); c.st = 'fahren'; c.v = 6; }})()")
            worst = 0
            for i in range(40):
                r = J(pg, f"(() => {{ GAME.step(0.25); const c = __vr.car({ids[1]}); if (!c) return null; const t = c.trailer;"
                          f" return {{ rel: Math.abs(Math.atan2(Math.sin(t.hd - c.hd), Math.cos(t.hd - c.hd))), d: Math.hypot(t.x - c.x, t.y - c.y), v: c.v }}; }})()")
                if not r:
                    break
                worst = max(worst, r['rel'])
            print('trailer', json.dumps(r), 'worst angle', round(math.degrees(worst)), flush=True)
            ck('the semi-trailer follows its tractor (never folded beyond 80°)', r is not None and worst < 1.41, f'{math.degrees(worst):.0f}°')
            E(pg, f"__vr.look({ids[1]}, 18, 120, 4)")
            E(pg, "GAME.step(0.05)")
            shot(pg, 'zug_fahrt')
        except Exception as ex:
            ck('section ran: zug', False, repr(ex)[:400])

    # ---- the flow: as many as counted at this hour, on the roads, out of sight when they come; fewer at night; no lorries on Sundays ----
    def at_day(iso, h):
        E(pg, f"(() => {{ const d = Date.UTC({iso[0]}, {iso[1] - 1}, {iso[2]}) / 864e5; CLOCK.t = Math.floor(CLOCK.t / 1440) * 1440 + {h} * 60;"
              f" DN.e0 = d - Math.floor(CLOCK.t / 1440); if (DN.active) DN.update(true); }})()")

    def run_flow(secs, real=0.08):
        for i in range(int(secs / 0.5)):
            E(pg, "GAME.step(0.5)")
            if real:
                time.sleep(real)

    if want('strom') or want('dichte') or want('regeln') or want('ampel') or want('oben') or want('perf'):
        E(pg, "for (const t of Object.keys(VKTYPEN.TYP)) VKMOD.need(t, 1)")
        for k in range(200):
            E(pg, "GAME.step(0.05)")
            if E(pg, "Object.keys(VKTYPEN.TYP).every(t => VKMOD.ready(t))"):
                break
            time.sleep(0.25)

    if want('strom'):
        try:
            E(pg, "__vr.clear(); VERKEHR.clear(); VERKEHR.autoOn(true); VERKEHR.force({ peds: 0, cars: 0 }); VKSTROM.force = { mult: 1 }")
            at_day((2026, 11, 13), 16.5)
            lib.settle_light(pg)
            # the observer on the country road west of the village (as the oncoming test of verkehr.py)
            E(pg, "GAME.view(-430, -230, KERN.ground(-430, -230) + 1.7, 120, -3)")
            run_flow(90)
            st = J(pg, "VKSTROM.state()")
            print('flow Fr 16:30', json.dumps(st), flush=True)
            ck('the flow has its roads round the observer', st['edges'] > 20, f"{st['edges']} edges, src {st['src']}")
            ck('Friday 16:30: vehicles on the roads as counted (± 40 %)', st['n'] > 0 and abs(st['n'] - st['want']) <= max(2, 0.4 * st['want']),
               f"{st['n']} of {st['want']} wanted ({st['counted']} counted)")
            # all on a road, none inside another
            pos = J(pg, "VAUTO.cars.filter(c => c.place === 'strom' && c.st !== 'weg').map(c => [c.x, c.y, c.typ, !!KERN.surface(c.x, c.y), c.D.HL])")
            off = [p for p in pos if not p[3]]
            ck('every vehicle of the flow stands on a road', not off, str(off[:3]))
            close = []
            for i in range(len(pos)):
                for j in range(i + 1, len(pos)):
                    d = math.hypot(pos[i][0] - pos[j][0], pos[i][1] - pos[j][1])
                    if d < 2.5:
                        close.append((pos[i][2], pos[j][2], round(d, 2)))
            ck('no two vehicles in one another', not close, str(close[:3]))
            # parked only at the end of a small street, never on a bigger road (where the data ends the road goes on: an exit there)
            pk = J(pg, "VAUTO.cars.filter(c => c.place === 'strom' && c.st === 'parkt').map(c => { const s = KERN.surface(c.x, c.y); return [c.typ, s ? s.kind : -1, Math.round(c.x), Math.round(c.y)]; })")
            ck('none parks on a bigger road (the square\'s edge is an exit)', all(p[1] >= 3 or p[1] < 0 for p in pk), str(pk[:4]))
            # a picture along the road
            ids = J(pg, "VAUTO.cars.filter(c => c.place === 'strom' && c.st !== 'weg').map(c => [c.id, Math.hypot(c.x + 430, c.y + 230)]).sort((a, b) => a[1] - b[1]).map(q => q[0])")
            if ids:
                E(pg, f"__vr.look({ids[0]}, 14, 30, 2.4)")
                E(pg, "GAME.step(0.05)")
                shot(pg, 'strom_abend')
            # at night much less; on a Sunday no lorries
            at_day((2026, 11, 13), 3.2)
            lib.settle_light(pg)
            run_flow(120, 0.02)
            sn = J(pg, "VKSTROM.state()")
            print('flow Fr 3:12', json.dumps(sn), flush=True)
            ck('at 3 at night far fewer', sn['want'] < st['want'] * 0.25 and sn['n'] <= max(2, st['n'] * 0.5), f"{sn['n']} (want {sn['want']}) against {st['n']}")
            at_day((2026, 11, 15), 11)
            lib.settle_light(pg)
            E(pg, "VERKEHR.clear()")
            run_flow(90, 0.02)
            ss = J(pg, "VKSTROM.state()")
            print('flow Su 11:00', json.dumps(ss), flush=True)
            heavy = sum(v for k, v in ss['types'].items() if k in ('lkw', 'sattel', 'muell', 'traktor'))
            ck('Sunday: no lorries, no tractors', heavy == 0 and ss['when']['day'] == 'so', json.dumps(ss['types']))
        except Exception as ex:
            ck('section ran: strom', False, repr(ex)[:400])

    if want('regeln'):
        # stage 2: right of way. A junction of the flow's graph where a street gives way (sign 205 of strassen/, by rule where a street
        # joins a county road); one car on the street, one on the priority road arriving at the same time: the one on the street waits at
        # its line until the other is through, then goes; the indicator before its turn; on equal streets the one from the right first
        try:
            E(pg, "__vr.clear(); VERKEHR.force({ peds: 0, cars: 0 }); VERKEHR.clear(); VERKEHR.autoOn(true); VKSTROM.force = { n: 0 }")
            at_day((2026, 11, 13), 11)
            lib.settle_light(pg)
            RG = """window.__rg = {
              // junctions near (x, y) with roles wanted: [{ ni, x, y, app }]
              find(x, y, r) { const G = VKSTROM.G, out = []; if (!G) return out;
                G.nodes.forEach((N, ni) => { if (N.edges.length < 3 || Math.hypot(N.x - x, N.y - y) > r) return; const R = G.ruleOf(ni); if (R) out.push({ ni, x: N.x, y: N.y, R }); });
                return out; },
              roles() { const G = VKSTROM.G, n = {}; if (!G) return n; G.nodes.forEach((N, ni) => { if (N.edges.length < 3) return; const R = G.ruleOf(ni); if (R) for (const a of R.app) n[a.role] = (n[a.role] || 0) + 1; }); return n; },
              // a car on edge a into node ni, then on along edge b; its front d metres before its stop line
              put(ni, a, b, d, typ) { const G = VKSTROM.G, ea = G.edges[a], eb = G.edges[b];
                const path = [{ e: ea, fwd: ea.b === ni }, { e: eb, fwd: eb.a === ni }];
                const c = VKSTROM.put(path, 'exit', typ || 'kompakt', 0, false); if (!c) return null;
                const ev = c.jn.find(q => q.ni === ni); if (!ev) return { id: c.id, noev: true };
                c.s = Math.max(c.D.B, ev.sStop - c.D.YF - d); c.jk = 0; while (c.jk < c.jn.length && c.jn[c.jk].sN < c.s + 2) c.jn[c.jk++].passed = true;
                c.v = Math.min(c.line.S[Math.round(c.s)] || 8, 13); return { id: c.id, role: ev.role, sStop: ev.sStop, sN: ev.sN, turn: ev.turn }; },
              // the limits along a route past the sign at (x, y) read in heading hdg (°): the line's speeds before and after it
              limit(x, y, hdg) { const G = VKSTROM.G, h = hdg * Math.PI / 180; let best = null;
                for (const e of G.edges) for (let k = 0; k + 1 < e.pts.length; k++) { const a = e.pts[k], b = e.pts[k + 1], dx = b[0] - a[0], dy = b[1] - a[1], l2 = dx * dx + dy * dy || 1, t = Math.max(0, Math.min(1, ((x - a[0]) * dx + (y - a[1]) * dy) / l2)), d = Math.hypot(x - a[0] - dx * t, y - a[1] - dy * t);
                  if (d < 12 && (!best || d < best.d)) best = { e, d, fwd: Math.sin(h) * dx + Math.cos(h) * dy >= 0 }; }
                if (!best) return null;
                const e = best.e, fwd = best.fwd, n0 = fwd ? e.a : e.b, n1 = fwd ? e.b : e.a, path = [];
                const prev = G.nodes[n0].edges.find(q => q !== e); if (prev) path.push({ e: prev, fwd: prev.b === n0 });
                path.push({ e, fwd });
                const next = G.nodes[n1].edges.find(q => q !== e); if (next) path.push({ e: next, fwd: next.a === n1 });
                const c = VKSTROM.put(path, 'exit', 'kompakt', 0, false); if (!c) return null;
                const L = c.line; let bi = 0, bd = 1e9;
                for (let i = 0; i < L.n; i++) { const d = Math.hypot(L.X[i] - x, L.Y[i] - y); if (d < bd) { bd = d; bi = i; } }
                const mx = (a, b) => { let m = 0; for (let i = Math.max(0, a); i < Math.min(L.n, b); i++) m = Math.max(m, L.V[i]); return m; };
                const out = { lim: L.lim, i: bi, d: Math.round(bd * 10) / 10, before: Math.round(mx(bi - 80, bi - 8) * 36) / 10, after: Math.round(mx(bi + 8, bi + 90) * 36) / 10, kind: e.kind, style: e.style, ev: Math.round(e.v * 36) / 10, n: L.n };
                c.st = 'weg'; VAUTO.remove(c); return out; },
              // step the world, record each car's way to the node
              run(ids, ni, secs) { const G = VKSTROM.G, N = G.nodes[ni], cars = ids.map(i => VAUTO.cars.find(c => c.id === i)), rec = cars.map(() => []);
                for (let t = 0; t < secs; t += 0.05) { GAME.step(0.05);
                  cars.forEach((c, k) => { const ev = c.jn && c.jn.find(q => q.ni === ni); rec[k].push([+t.toFixed(2), +(c.s + c.D.YF - (ev ? ev.sStop : 0)).toFixed(2), +c.v.toFixed(2), +Math.hypot(c.x - N.x, c.y - N.y).toFixed(1), c.blinkR || 0, c.st]); }); }
                return rec; },
            };"""
            E(pg, RG)
            # the junction east of the village where a street joins the county road (sign 205 at (394, -455))
            E(pg, "GAME.view(380, -470, KERN.ground(380, -470) + 1.7, 330, -10)")
            run_flow(3, 0.02)
            print('roles round the observer', json.dumps(J(pg, "__rg.roles()")), flush=True)
            js = J(pg, "__rg.find(390, -452, 40).map(j => ({ ni: j.ni, x: Math.round(j.x), y: Math.round(j.y), app: j.R.app.map(a => [a.e, a.role, Math.round(a.stopD * 10) / 10, a.line, Math.round(VKSTROM.G.edges[a.e].len)]) }))")
            print('junctions there', json.dumps(js), flush=True)
            jy = next((j for j in js if any(a[1] == 'yield' for a in j['app']) and sum(1 for a in j['app'] if a[1] == 'prio') >= 2), None)
            ck('a junction where the street gives way to the county road (sign 205 there)', jy is not None, json.dumps(js)[:300])
            if jy:
                ya = next(a for a in jy['app'] if a[1] == 'yield')
                pa = [a for a in jy['app'] if a[1] == 'prio']
                ni = jy['ni']
                # the street's car turns onto the priority road (towards the first priority edge); the priority car comes along the other one
                # and goes on along the first: they meet
                A = J(pg, f"__rg.put({ni}, {ya[0]}, {pa[0][0]}, 30, 'kompakt')")
                B = J(pg, f"__rg.put({ni}, {pa[1][0]}, {pa[0][0]}, 52, 'kombi')")
                print('put', json.dumps(A), json.dumps(B), flush=True)
                ck('both cars on their routes with the junction', A and B and not A.get('noev') and not B.get('noev') and A['role'] == 'yield' and B['role'] == 'prio', f"{A} {B}")
                rec = J(pg, f"__rg.run([{A['id']}, {B['id']}], {ni}, 22)")
                ra, rb = rec
                # A: stopped before its line while B came by; never in the junction while B was in it; through at the end
                b_in = [r[0] for r in rb if r[3] < 7]
                a_wait = [r for r in ra if r[2] < 0.3 and r[1] <= 0.4]
                # (A in the junction: its front over its line)
                a_in_with_b = [r for r in ra if r[1] > 0.5 and any(abs(r[0] - t) < 0.05 for t in b_in)]
                a_through = [r for r in ra if r[3] > 12 and r[1] > 5]
                print('A (street)', ra[::40], flush=True)
                print('B (priority)', rb[::40], flush=True)
                ck('the street car waits at its line for the priority car', bool(a_wait) and bool(b_in) and min(r[0] for r in a_wait) <= max(b_in), f"waited {len(a_wait)} steps, B in the junction {b_in[:1]}–{b_in[-1:] }")
                ck('never in the junction together', not a_in_with_b, str(a_in_with_b[:2]))
                ck('the priority car does not stop', min(r[2] for r in rb if r[0] < (b_in[0] if b_in else 99)) > 3, str([r[2] for r in rb[::20]]))
                ck('the street car goes once the way is free', bool(a_through), str(ra[-1]))
                if abs(A['turn']) > 0.45:
                    bl = [r[4] for r in ra if r[1] > -40 and r[1] < 0]
                    ck('its indicator before the turn', bl and all(b == (1 if A['turn'] > 0 else -1) for b in bl[-20:]), f"turn {A['turn']:.2f} blink {set(bl)}")
            # right before left: a crossing of equal streets in the village
            E(pg, "VERKEHR.clear(); GAME.view(95, -95, KERN.ground(95, -95) + 1.7, 120, -10)")
            run_flow(3, 0.02)
            js2 = J(pg, "__rg.find(95, -95, 260).filter(j => j.R.app.length >= 3 && j.R.app.every(a => a.role === 'rvl')).map(j => ({ ni: j.ni, x: Math.round(j.x), y: Math.round(j.y), app: j.R.app.map(a => [a.e, a.role, Math.round(a.h * 100) / 100, Math.round(VKSTROM.G.edges[a.e].len)]) }))")
            print('equal junctions', len(js2), json.dumps(js2[:3]), flush=True)
            jr = next((j for j in js2 if all(a[3] >= 25 for a in j['app'])), None)
            ck('a junction of equal streets (right before left)', jr is not None, str(len(js2)))
            if jr:
                import math as _m
                # two approaches at about a right angle: A, and B coming from A's right (B's heading A's minus 90°)
                pair = None
                for a in jr['app']:
                    for b in jr['app']:
                        rel = _m.atan2(_m.sin(b[2] - a[2]), _m.cos(b[2] - a[2]))
                        if a is not b and -2.2 < rel < -0.9:
                            pair = (a, b)
                if pair:
                    a, b = pair
                    third = next(q for q in jr['app'] if q is not a and q is not b)
                    # both go straight on or into the third street; they arrive together (fronts 18 m before their lines)
                    A = J(pg, f"__rg.put({jr['ni']}, {a[0]}, {third[0]}, 18, 'klein')")
                    B = J(pg, f"__rg.put({jr['ni']}, {b[0]}, {third[0] if third[0] != b[0] else a[0]}, 18, 'kombi')")
                    if A and B and not A.get('noev') and not B.get('noev'):
                        rec = J(pg, f"__rg.run([{A['id']}, {B['id']}], {jr['ni']}, 18)")
                        ra, rb = rec
                        ta = next((r[0] for r in ra if r[1] > 0.8), 99)
                        tb = next((r[0] for r in rb if r[1] > 0.8), 99)
                        print('right before left: A over its line at', ta, 'B (from the right) at', tb, flush=True)
                        ck('right before left: the one from the right goes first', tb < ta and ta < 99, f"A {ta} s, B {tb} s")
                else:
                    ck('right before left: two approaches at a right angle', False, json.dumps(jr))
            # a limit by sign: the 60 on the county road north-east of the village (274-60 of strassen/ at (469, -194), read northwards)
            E(pg, "VERKEHR.clear(); GAME.view(450, -240, KERN.ground(450, -240) + 1.7, 0, -10)")
            run_flow(3, 0.02)
            lm = J(pg, "__rg.limit(469, -194, 357)")
            print('limit 60', json.dumps(lm), flush=True)
            ck('a speed limit by sign: after the 60 at most 60 km/h, below the road’s own', lm and lm['lim'] >= 1 and lm['after'] <= 60.5 and (lm['ev'] <= 60 or lm['after'] < lm['ev']), json.dumps(lm))
            E(pg, "VKSTROM.force = { mult: 1 }; VERKEHR.clear()")
        except Exception as ex:
            ck('section ran: regeln', False, repr(ex)[:400])

    if want('ampel'):
        # stage 2b: the traffic lights of OpenStreetMap in Schleusingen – the junction light built near the observer (a pole on every
        # approach), the phases of its two groups; a car on a red approach waits at its line until green, then goes; the walkers' crossing
        # switches when someone presses; the top view shows the lights
        try:
            E(pg, "__vr.clear(); VERKEHR.force({ peds: 0, cars: 0 }); VERKEHR.clear(); VERKEHR.autoOn(true); VKSTROM.force = { n: 0 }")
            at_day((2026, 11, 13), 11)
            lib.settle_light(pg)
            if not E(pg, "!!window.__rg"):
                raise RuntimeError('needs the section regeln first (its helpers)')
            E(pg, "GAME.view(-1034, 1630, KERN.ground(-1034, 1630) + 1.7, 0, -8)")
            run_flow(4, 0.05)
            lt = J(pg, "VKAMPEL.lights.map(L => ({ id: L.id, kind: L.kind, built: !!L.g, failed: !!L.failed, axis: L.axis, parts: L.g ? L.g.children.length : 0, lamps: L.mat ? Object.keys(L.mat).sort() : [] }))")
            print('lights', json.dumps(lt), flush=True)
            k = next((l for l in lt if l['kind'] == 'k'), None)
            ck('the junction light in Schleusingen is built near the observer (poles, heads, lamps per group)', k and k['built'] and {'Ar', 'Ay', 'Ag', 'Br', 'By', 'Bg'} <= set(k['lamps']), json.dumps(k))
            # the phases over one cycle: both groups see green, never at once
            ph = J(pg, "(() => { const L = VKAMPEL.lights.find(q => q.kind === 'k'), out = []; for (let t = 0; t < 50; t += 1) { const p = VKREGELN.phaseK(t + L.off); out.push(p.A[0] + p.B[0]); } return out; })()")
            ck('its two groups take turns (green for each, never both)', any(p[0] == 'g' for p in ph) and any(p[1] == 'g' for p in ph) and not any(p == 'gg' for p in ph), ''.join(p[0] for p in ph))
            # a car on a red approach: the light set so that its group has red for the next ~18 s
            js = J(pg, "__rg.find(-1034, 1677, 18).map(j => ({ ni: j.ni, x: Math.round(j.x), y: Math.round(j.y), app: j.R.app.map(a => [a.e, a.role, Math.round(a.h * 100) / 100, Math.round(VKSTROM.G.edges[a.e].len)]) }))")
            print('junction at the light', json.dumps(js), flush=True)
            if js:
                j = js[0]
                a0 = max(j['app'], key=lambda a: a[3])
                out = next(a for a in j['app'] if a is not a0)
                # the moment: this approach's group red for 18 s (A red 28–49 s of the cycle, B red 0–29 and 47–50)
                E(pg, f"(() => {{ const L = VKAMPEL.lights.find(q => q.kind === 'k'), g = VKAMPEL.grpOf(L, {a0[2]}); window.__ag = g; VKAMPEL.t = (g === 'A' ? 30 : 5) - L.off; }})()")
                A = J(pg, f"__rg.put({j['ni']}, {a0[0]}, {out[0]}, 35, 'kompakt')")
                print('car at the light', json.dumps(A), flush=True)
                ck('the car’s route knows the light of its approach', A and not A.get('noev'), json.dumps(A))
                if A and not A.get('noev'):
                    rec = J(pg, f"(() => {{ const c = VAUTO.cars.find(q => q.id === {A['id']}), L = VKAMPEL.lights.find(q => q.kind === 'k'), out = []; for (let t = 0; t < 32; t += 0.05) {{ GAME.step(0.05); const ev = c.jn && c.jn.find(q => q.ni === {j['ni']}); out.push([+t.toFixed(2), +(c.s + c.D.YF - ev.sStop).toFixed(2), +c.v.toFixed(2), VKAMPEL.state(L, __ag), !!ev.lt, c.st]); }} return out; }})()")
                    red_cross = [r for r in rec if r[3] in ('rot', 'rotgelb') and r[1] > 0.5 and r[5] != 'weg']
                    waited = [r for r in rec if r[3] in ('rot', 'rotgelb') and r[2] < 0.3 and r[1] <= 0.3]
                    went = [r for r in rec if r[3] == 'gruen' and r[1] > 2]
                    print('at the light', rec[::40], flush=True)
                    ck('it waits at the line while its light is red', bool(waited) and not red_cross, f"waited {len(waited)} steps, over the line at red {red_cross[:2]}")
                    ck('and goes at green', bool(went), str(rec[-1]))
            # the walkers' crossing at the Markt: someone presses – yellow, then red for the cars, the walkers green in between
            E(pg, "GAME.view(-702, 1400, KERN.ground(-702, 1400) + 1.7, 0, -8)")
            run_flow(3, 0.05)
            cr = J(pg, "(() => { const L = VKAMPEL.lights.find(q => q.kind === 'f'); if (!L) return null; L.st.ph = 'gruen'; L.st.t = 25; L.st.req = true; const seq = []; for (let t = 0; t < 22; t += 0.5) { GAME.step(0.5); seq.push(L.st.ph[0] + (VKREGELN.walkGreen(L.st) ? '*' : '')); } return { built: !!L.g, lamps: L.mat ? Object.keys(L.mat).sort() : [], seq: seq.join(' ') }; })()")
            print('crossing', json.dumps(cr), flush=True)
            ck('the walkers’ crossing switches on request (yellow, red with the walkers’ green, back to green)', cr and cr['built'] and 'g r' not in cr['seq'] and 'r*' in cr['seq'] and cr['seq'].strip().endswith('g'), json.dumps(cr))
            # the top view: the lights as dots
            svg = J(pg, "(() => { const L = STRAT.layer.list().find(l => l.id === 'verkehr'); if (!L) return ''; const pr = (x, y) => [600 + (x + 870) * 0.5, 360 - (y - 1550) * 0.5, 0]; return L.draw(pr, 1200, 720); })()")
            ck('the top view shows the lights', svg and svg.count('Ampel') >= 2, str(svg.count('Ampel') if svg else None))
            E(pg, "VKSTROM.force = { mult: 1 }; VERKEHR.clear()")
        except Exception as ex:
            ck('section ran: ampel', False, repr(ex)[:400])

    if want('dichte'):
        try:
            # the wanted count through a weekday at one place: low at night, peaks morning and afternoon
            E(pg, "VERKEHR.clear(); VKSTROM.force = { mult: 1 }")
            row = []
            for h in (3, 6, 7.5, 10, 13, 16.5, 20, 23):
                at_day((2026, 11, 11), h)
                E(pg, "GAME.step(0.5)")
                row.append(round(J(pg, "VKSTROM.state().counted"), 2))
            print('counted by hour (Wed)', row, flush=True)
            ck('the count follows the day: night < morning peak, afternoon peak the highest', row[0] < row[2] / 5 and row[5] >= max(row[3], row[4]) and row[7] < row[5] / 2, str(row))
        except Exception as ex:
            ck('section ran: dichte', False, repr(ex)[:400])

    if want('oben'):
        try:
            # the top view's layer: one shape per vehicle (and trailer) in its paint, in its true size near by, bigger than true far up
            at_day((2026, 11, 13), 11)
            E(pg, "VERKEHR.clear()")
            run_flow(40, 0.02)
            r = J(pg, """(() => { const L = STRAT.layer.list().find(l => l.id === 'verkehr'); const cars = VAUTO.cars.filter(c => c.st !== 'weg');
              const c0 = cars[0]; if (!L || !c0) return null; const out = {};
              for (const [name, k] of [['near', 4], ['far', 0.05]]) {
                const pr = (x, y) => [600 + (x - c0.x) * k, 360 - (y - c0.y) * k, 0];
                const svg = L.draw(pr, 1200, 720);
                const polys = (svg.match(/<polygon/g) || []).length;
                const m = /points="([^"]+)"/.exec(svg), p = m ? m[1].split(' ').map(q => q.split(',').map(Number)) : [];
                out[name] = { polys, edge: p.length ? Math.hypot(p[0][0] - p[1][0], p[0][1] - p[1][1]) : 0, fill: (/fill="(#[0-9a-f]+)"/i.exec(svg) || [])[1] }; }
              out.n = cars.length + cars.filter(c => c.trailer && c.trailer.init).length; return out; })()""")
            print('top view', json.dumps(r), flush=True)
            ck('the top view draws every vehicle (and trailer) as its shape', r and r['near']['polys'] >= 1 and r['far']['polys'] == r['n'], json.dumps(r))
            ck('near in its true size, far up bigger than true (still to be seen)', r and r['far']['edge'] >= 4.5, json.dumps(r))
        except Exception as ex:
            ck('section ran: oben', False, repr(ex)[:400])

    if want('perf'):
        try:
            # the time per frame with the computer's full budget in sight, the draw calls; no new program in all of this
            E(pg, "VKSTROM.force = { n: 36 }; VERKEHR.clear()")
            at_day((2026, 11, 13), 16.5)
            E(pg, "GAME.view(-430, -230, KERN.ground(-430, -230) + 1.7, 120, -3)")
            run_flow(60, 0.03)
            # the frame's time and its draw calls with all vehicles shown and with them hidden (the camera looking along the road)
            r = J(pg, """(() => { const R = GAME.R, f0 = R.renderBufferDirect; let n = 0;
              R.renderBufferDirect = function () { n++; return f0.apply(this, arguments); };
              const vis = on => { for (const c of VAUTO.cars) { if (c.g) c.g.visible = on; if (c.trailer) c.trailer.g.visible = on; } VKMOD.SH.im.visible = on; };
              const frame = () => { const t = []; let calls = 0; for (let i = 0; i < 5; i++) { n = 0; const a = performance.now(); GAME.shot(); t.push(performance.now() - a); calls = n; } t.sort((a, b) => a - b); return [t[2], calls]; };
              try { GAME.step(0.05); const [ms1, c1] = frame(); vis(false); const [ms0, c0] = frame(); vis(true);
                return { ms: +ms1.toFixed(1), ms0: +ms0.toFixed(1), calls: c1, calls0: c0, n: VKSTROM.state().n,
                  shown: VAUTO.cars.filter(c => c.vm && c.vm.body.visible).length,
                  lod: VAUTO.cars.filter(c => c.vm).reduce((m, c) => (m[c.vm.lod] = (m[c.vm.lod] || 0) + 1, m), {}) }; }
              finally { R.renderBufferDirect = f0; } })()""")
            print('perf', json.dumps(r), flush=True)
            ck('the vehicles cost few draw calls (≤ 2 per vehicle shown, + 2 for the shadows)', r['calls'] - r['calls0'] <= 2 * max(1, r['shown']) + 2,
               f"{r['calls0']} → {r['calls']} for {r['shown']} shown of {r['n']}")
            ck('and little time per frame (SwiftShader: ≤ 12 ms more)', r['ms'] - r['ms0'] <= 12, f"{r['ms0']} → {r['ms']} ms")
            E(pg, "VKSTROM.force = { mult: 1 }; VERKEHR.clear()")
            p2 = E(pg, "__vr.progs()")
            new = [n for n in J(pg, "__vr.pnames()") if n not in n0]
            ck('still no new shader program (flow, levels, shadows, pools)', not [n for n in new if 'verkehr' in n or 'vk-1' in n], str(new[:6]))
        except Exception as ex:
            ck('section ran: perf', False, repr(ex)[:400])

    ck.errors(errs)
ck.done()
