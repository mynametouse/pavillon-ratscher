# feat/verkehr-real: the traffic of today – vehicles after real measures (verkehr/vk_typen.js), built in a worker (lazy/verkehr-bau.js),
# drawn by one material in three levels (verkehr/vk_modelle.js), driving with the place traffic (verkehr/verkehr_auto.js), the density by
# road, weekday and hour (verkehr/vk_dichte.js), the flow on every road round the observer (verkehr/vk_strom.js), the top view.
# Pictures in out/verkehr_real/.
#   bash tools/browser_lock.sh python3 viz3/test/run.py --port 8962 --serve verkehr_real      (or: python3 viz3/test/verkehr_real.py 8962 bau,bild)
# Sections (second argument, comma-separated): bau,bild,nacht,lod,zug,leih,dichte,strom,oben,perf
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

    if want('strom') or want('dichte') or want('oben') or want('perf'):
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
