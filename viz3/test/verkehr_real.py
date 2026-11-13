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
            ck('no new shader program for the new vehicles', p1 == p0, f'{p0} → {p1} {new}')
        except Exception as ex:
            ck('section ran: bild', False, repr(ex)[:400])

    if want('nacht'):
        try:
            E(pg, "__vr.day(22)")
            lib.settle_light(pg)
            ids = J(pg, "VAUTO.cars.filter(c => c.place === 'test').map(c => c.id)")
            if not ids:
                ids = J(pg, f"__vr.park(['kompakt', 'suv', 'kombi'], {ANGER[0]}, {ANGER[1]}, -20, 2.5)")
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

    ck.errors(errs)
ck.done()
