# Kloster Veßra (welt/welt.js tile sets, welt/vessra.js): nothing of it at the start; Orte → „Kloster Veßra“ leads to the gate in the
# monastery wall, the zone's own world tiles (welt-test/zonen/vessra/) and the place load there; ground under the feet, walls stop the
# walker, through the west portal into the church ruin, the gate church, the monastery wall and its gates, the nursery's beds and spots,
# place names; pictures at the places of photos (Panoramax 2025, Wikimedia Commons), from above and at night; going home frees it again.
# The tiles come from the published site and are copied into viz3/dist/welt-test/zonen/vessra/ first (the test server serves dist).
# Sections (optional second argument, comma-separated): start,load,walk,kirche,baumschule,names,shots,night,free
import sys, os, json, time, math
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import lib
from vessra_tiles import fetch_tiles, ORT, KL   # the zone's tiles into dist (shared with vessra_szenario.py)

port = sys.argv[1]
ONLY = sys.argv[2].split(',') if len(sys.argv) > 2 else None
want = lambda k: not ONLY or k in ONLY
ck = lib.Checks('vessra')
OUT = lib.out('vessra')

fetch_tiles()
with lib.browser() as b:
    errs = []
    pg = lib.page(b, 1100, 680, errs, tier='mittel')
    lib.boot(pg, port)
    E = pg.evaluate
    J = lambda s: json.loads(E('JSON.stringify(' + s + ')'))
    E("document.querySelectorAll('#toast').forEach(e => e.style.visibility = 'hidden'); GAME.setView3(false)")
    st0 = J("""{ s: VESSRA.status(), res: performance.getEntriesByType('resource').filter(e => /zonen\\/vessra|vessra\\/ort/.test(e.name)).length,
        progs: (GAME.R.info.programs || []).length, tex: GAME.R.info.memory.textures, geo: GAME.R.info.memory.geometries, kern: KERN.providers() }""")
    print('start', json.dumps(st0), flush=True)
    if want('start'):
        ck('nothing of Kloster Veßra at the start', st0['s']['state'] == 'idle' and st0['res'] == 0 and st0['s']['welt']['tiles'] == 0, json.dumps(st0['s']))
        ck('the zone tile set is registered, not fetched', 'zonen/vessra/' in st0['s']['welt'].get('sets', ''), st0['s']['welt'].get('sets', ''))
        ck('menu: Orte → Kloster Veßra', E("!!document.querySelector('#menu [data-spot=vessra]')"))
        kz = J("""{ zone: KERN.zones().find(z => z.id === 'vessra') || null, sc: ['vessra', 'baumschule'].map(n => (KERN.scenario(n) || {}).label || null),
            spots: ['vessra', 'baumschule'].map(n => !!KERN.spots()[n]) }""")
        ck('a zone of the core, start situations and jump spots (KERN.zone, KERN.scenario, KERN.spot)',
           kz['zone'] and kz['zone']['state'] == 'idle' and all(kz['sc']) and all(kz['spots']), json.dumps(kz))

    def wait_ready(limit=240):
        t0 = time.time()
        while time.time() - t0 < limit:
            E("GAME.step(0.25)")
            s = J("VESSRA.status()")
            if s['state'] in ('ready', 'error'):
                return s, time.time() - t0
            time.sleep(0.4)
        return J("VESSRA.status()"), time.time() - t0

    def settle(n=40):
        for _ in range(n):
            E("GAME.step(0.25)")
            if J("WELT.state()")['loading'] == 0:
                break
            time.sleep(0.3)

    E("document.querySelector('#menu [data-spot=vessra]').click()")
    s, dt = wait_ready()
    settle()
    E("GAME.step(1)")
    s = J("VESSRA.status()")
    print('loaded', json.dumps(s), flush=True)
    p = J("{ x: GAME.P.x, y: GAME.P.y, feet: GAME.P.feet, g: KERN.ground(GAME.P.x, GAME.P.y), w: WELT.heightAt(GAME.P.x, GAME.P.y) ?? null }")
    if want('load'):
        sp = J("VESSRA.START")
        th = J("(() => { const b = VESSRA.bld.find(q => q.lm === 'torhaus'); return b ? [b.cx, b.cy] : [0, 0]; })()")
        ck('Orte → Kloster Veßra: in front of the gate house', math.hypot(p['x'] - sp[0], p['y'] - sp[1]) < 3 and math.hypot(sp[0] - th[0], sp[1] - th[1]) < 14, json.dumps(p))
        ck('the place is built there', s['state'] == 'ready' and s['zone'] == 'ready' and s['buildings'] > 120 and s['segs'] > 1500 and not s['err'],
           f"{s['buildings']} buildings, {s['segs']} segments, {s['trees']} trees, {s['lamps']} lamps, {s['ms']} ms build, {s['loadMs']} ms data + {round(dt)} s; zone {s['zone']}; err {s['err']}")
        ck('its own world tiles around the camera', s['welt']['visible'] >= 10 and s['welt']['err'] == 0 and not s['noTiles'] and '+zonen/vessra/' in s['welt'].get('sets', ''), json.dumps(s['welt']))
        ck('ground under the feet (tiles)', p['w'] is not None and abs(p['feet'] - p['g']) < 0.05 and abs(p['g'] - p['w']) < 0.01, json.dumps(p))
    if want('walk'):
        # the ground beside the Schleusinger Straße: the banks of the road cut lowered (at 8 m from the axis at most ~0.5 m above it)
        r = J("""(() => { const st = VESSRA.data.st.filter(s => s.n === 'Schleusinger Straße'); let raw = 0, adj = 0, n = 0, d = 0;
            for (const s of st) { const p = s.p; for (let k = 0; k + 3 < p.length; k += 2) { const ex = p[k + 2] - p[k], ey = p[k + 3] - p[k + 1], L = Math.hypot(ex, ey);
              for (let u = 0; u < L; u += 20) { const x = p[k] + ex * u / L, y = p[k + 1] + ey * u / L, nx = ey / L, ny = -ex / L;
                if (Math.hypot(x - VESSRA.ORT[0], y - VESSRA.ORT[1]) > 450) continue;
                for (const sg of [-1, 1]) { const qx = x + nx * sg * 8, qy = y + ny * sg * 8; if (VESSRA.raw(qx, qy) === undefined) continue;
                  raw = Math.max(raw, VESSRA.raw(qx, qy) - VESSRA.raw(x, y)); adj = Math.max(adj, VESSRA.gz(qx, qy) - VESSRA.gz(x, y));
                  if (Math.hypot(qx - GAME.P.x, qy - GAME.P.y) < 120) d = Math.max(d, Math.abs(VESSRA.gz(qx, qy) - (WELT.heightAt(qx, qy) ?? VESSRA.gz(qx, qy)))); n++; } } } }
            return { n, raw: +raw.toFixed(2), adj: +adj.toFixed(2), tilesVsGround: +d.toFixed(3), ms: VESSRA.capMs }; })()""")
        ck('the village ground: no trough beside the Schleusinger Straße (8 m from the axis)',
           r['n'] > 20 and r['adj'] <= 0.8 and r['adj'] < r['raw'] / 2 and r['tilesVsGround'] < 0.15, json.dumps(r))
        # walk straight at a house wall in the village: the wall stops the walker
        r = J("""(() => { const b = VESSRA.bld.find(b => !b.lm && !b.old && b.k === 0 && b.F.length > 3 && Math.hypot(b.cx + 8700, b.cy + 230) < 120);
            const f = b.F.find(f => !(f[8] & 1)) || b.F[0], mx = (f[0] + f[2]) / 2, my = (f[1] + f[3]) / 2, L = Math.hypot(f[2] - f[0], f[3] - f[1]), nx = (f[3] - f[1]) / L, ny = -(f[2] - f[0]) / L;
            const x = mx + nx * 3, y = my + ny * 3, yaw = Math.atan2(-nx, -ny) * 180 / Math.PI;
            GAME.view(x, y, VESSRA.gz(x, y) + 1.62, yaw, 0, 60); GAME.step(0.5); GAME.step(4, 1);
            const d = (GAME.P.x - mx) * nx + (GAME.P.y - my) * ny; return { d, x: GAME.P.x, y: GAME.P.y, n: b.n || '', i: b.i }; })()""")
        ck('a house wall stops the walker', 0.1 < r['d'] < 0.6, json.dumps(r, ensure_ascii=False))
        # the monastery wall: walk at it from the street side (between the gates) – it stops the walker
        r = J("""(() => { const inB = (x, y) => VESSRA.bld.some(b => { let c = false; const f = b.f; for (let p = 0, q = f.length - 2; p < f.length; q = p, p += 2) { if ((f[p + 1] > y) !== (f[q + 1] > y) && x < (f[q] - f[p]) * (y - f[p + 1]) / (f[q + 1] - f[p + 1]) + f[p]) c = !c; } return c; });
            let seg = null; for (const w of VESSRA.data.walls) for (let k = 0; k + 3 < w.p.length && !seg; k += 2) { const ax = w.p[k], ay = w.p[k + 1], bx = w.p[k + 2], by = w.p[k + 3], L = Math.hypot(bx - ax, by - ay); if (L < 8) continue;
              const mx = (ax + bx) / 2, my = (ay + by) / 2, nx = (by - ay) / L, ny = -(bx - ax) / L; if (inB(mx + nx * 4, my + ny * 4) || inB(mx - nx * 4, my - ny * 4) || Math.abs(VESSRA.gz(mx + nx * 4, my + ny * 4) - VESSRA.gz(mx - nx * 4, my - ny * 4)) > 1.5) continue; seg = [ax, ay, bx, by]; }
            const [ax, ay, bx, by] = seg, L = Math.hypot(bx - ax, by - ay), mx = (ax + bx) / 2, my = (ay + by) / 2, nx = (by - ay) / L, ny = -(bx - ax) / L;
            const res = []; for (const s of [1, -1]) { const x = mx + nx * s * 4, y = my + ny * s * 4; GAME.view(x, y, VESSRA.gz(x, y) + 1.62, Math.atan2(-nx * s, -ny * s) * 180 / Math.PI, 0, 60); GAME.step(0.5); GAME.step(5, 1);
              res.push((GAME.P.x - mx) * nx * s + (GAME.P.y - my) * ny * s); } return res; })()""")
        ck('the monastery wall stops the walker from both sides', all(0.3 < d < 0.9 for d in r), json.dumps(r))
    if want('walk'):
        # through the passage of the gate house into the courtyard
        r = J("""(() => { const T = VESSRA.torhaus; if (!T) return null; const p = [T.a[0] - T.dir[0] * 5, T.a[1] - T.dir[1] * 5];
            GAME.view(p[0], p[1], VESSRA.gz(p[0], p[1]) + 1.62, Math.atan2(T.dir[0], T.dir[1]) * 180 / Math.PI, 0, 60); GAME.step(0.5); GAME.step(9, 1);
            return { t: (GAME.P.x - T.a[0]) * T.dir[0] + (GAME.P.y - T.a[1]) * T.dir[1], len: Math.hypot(T.b[0] - T.a[0], T.b[1] - T.a[1]) }; })()""")
        ck('through the gate house into the monastery grounds', r is not None and r['t'] > r['len'] + 1.0, json.dumps(r))
    if want('kirche'):
        k = J("VESSRA.kirche ? { uX: VESSRA.kirche.uX, uW: VESSRA.kirche.uW, vM: VESSRA.kirche.vM, z: VESSRA.kirche.z } : null")
        ck('the church: west front, nave and crossing in their frame', k is not None and 30 < k['uX'] - k['uW'] < 40, json.dumps(k))
        if k:
            # from 8 m in front of the west portal through the passage into the nave
            r = J("""(() => { const K = VESSRA.kirche, p = K.Q(-8, K.vM), q = K.Q(K.uW + 6, K.vM); GAME.view(p[0], p[1], VESSRA.gz(p[0], p[1]) + 1.62, Math.atan2(q[0] - p[0], q[1] - p[1]) * 180 / Math.PI, 0, 60);
                GAME.step(0.5); GAME.step(13, 1); const u = (GAME.P.x - K.O[0]) * K.ex[0] + (GAME.P.y - K.O[1]) * K.ex[1]; return { u, where: VESSRA.place(GAME.P.x, GAME.P.y), x: GAME.P.x, y: GAME.P.y }; })()""")
            ck('through the west portal into the nave of the ruin', k['uW'] + 2 < r['u'] < k['uX'] and 'Klosterkirche' in (r['where'] or ''), json.dumps(r, ensure_ascii=False))
            # on through the triumphal arch into the crossing; the walled-up east wall stops
            r = J("""(() => { GAME.step(30, 1); const K = VESSRA.kirche, u = (GAME.P.x - K.O[0]) * K.ex[0] + (GAME.P.y - K.O[1]) * K.ex[1]; return { u, uX: K.uX }; })()""")
            ck('through the triumphal arch into the crossing, the east wall stops', k['uX'] < r['u'] < k['uX'] + 12, json.dumps(r))
            r = J("""(() => { const K = VESSRA.kirche, p = K.Q(20, K.vN + 6), q = K.Q(20, K.vM); GAME.view(p[0], p[1], VESSRA.gz(p[0], p[1]) + 1.62, Math.atan2(q[0] - p[0], q[1] - p[1]) * 180 / Math.PI, 0, 60);
                GAME.step(0.5); GAME.step(6, 1); const v = (GAME.P.x - K.O[0]) * K.en[0] + (GAME.P.y - K.O[1]) * K.en[1]; return { v, vN: K.vN }; })()""")
            ck('the north wall of the nave stops the walker', r['v'] > r['vN'] + 0.5, json.dumps(r))
        t = J("VESSRA.bld.filter(b => b.lm).map(b => b.lm)")
        ck('landmarks: gate church, Henneberg chapel, south chapel, two apses, Kornhaus, claustral ranges',
           all(x in t for x in ('torkirche', 'henneberg', 'suedkapelle', 'kornhaus', 'klausur')) and t.count('apsis') == 2, json.dumps(t))
    if want('baumschule'):
        bs = J("VESSRA.baumschule ? { n: VESSRA.baumschule.name, e: VESSRA.baumschule.eingang, k: VESSRA.baumschule.kasse, p: VESSRA.baumschule.parkplatz, beete: VESSRA.baumschule.beete.map(b => ({ art: b.art, x: b.x, y: b.y, w: b.w, h: b.h, yaw: b.yaw, n: b.slots.length })) } : null")
        print('baumschule', json.dumps(bs, ensure_ascii=False), flush=True)
        ck('the nursery: five beds by kind with plant slots, entrance, till, parking',
           bs is not None and [q['art'] for q in bs['beete']] == ['obst', 'beeren', 'zier', 'kletter', 'boden'] and all(q['n'] >= 20 for q in bs['beete'])
           and all(k in bs and bs[k] and 'yaw' in bs[k] for k in ('e', 'k', 'p')), json.dumps(bs, ensure_ascii=False)[:400])
        if bs:
            nm = J(f"[VESSRA.place({bs['beete'][2]['x']}, {bs['beete'][2]['y']}), VESSRA.place({bs['k']['x']}, {bs['k']['y']})]")
            ck('the nursery has its name on the HUD', all('Baumschule Kammbach' in (n or '') for n in nm), json.dumps(nm, ensure_ascii=False))
            # the yard is one smooth plane (the beds on it): a plane through the plant slots fits them within a few centimetres
            fl = J("""(() => { const P = VESSRA.baumschule.beete.flatMap(b => b.slots.map(([x, y]) => [x, y, VESSRA.gz(x, y)])), n = P.length,
                m = [0, 1, 2].map(i => P.reduce((a, p) => a + p[i], 0) / n);
                let xx = 0, xy = 0, yy = 0, xz = 0, yz = 0;
                for (const [x, y, z] of P) { const dx = x - m[0], dy = y - m[1], dz = z - m[2]; xx += dx * dx; xy += dx * dy; yy += dy * dy; xz += dx * dz; yz += dy * dz; }
                const det = xx * yy - xy * xy, b = (xz * yy - yz * xy) / det, c = (yz * xx - xz * xy) / det;
                let r = 0; for (const [x, y, z] of P) r = Math.max(r, Math.abs(z - m[2] - b * (x - m[0]) - c * (y - m[1])));
                return { n, slope: +Math.hypot(b, c).toFixed(3), resid: +r.toFixed(3) }; })()""")
            ck('the sales yard is one smooth plane: the beds lie on it', fl['resid'] < 0.1 and fl['slope'] < 0.13, json.dumps(fl))
            # a car's way in (Kern/fahrt 23.10.): from the Schulstraße 8 m in front of the gate through it to the parking place – the ground
            # (KERN.ground) at most ~15 % steep, no step over 0.15 m
            dr = J("""(() => { const B = VESSRA.baumschule, f = B.frame, Y = (u, w) => [f.G[0] + f.u[0] * u + f.w[0] * w, f.G[1] + f.u[1] * u + f.w[1] * w],
                pk = B.parkplatz, pw = [(pk.x - f.G[0]) * f.u[0] + (pk.y - f.G[1]) * f.u[1], (pk.x - f.G[0]) * f.w[0] + (pk.y - f.G[1]) * f.w[1]],
                P = [[0, -8], [0, 0.5], [pw[0] / 2, (0.5 + pw[1]) / 2], pw],
                // the approach for the obstacles: north on the right side of the Schulstraße (centre about 9 m outside the fence), a left turn in
                A = [[-30, -13], [-12, -11.5], [-5, -10], [-1.5, -7.5], [0.5, -4], [0, 0.5]];
              let clear = 99, cat = null;
              for (let k = 0; k + 1 < A.length; k++) { const [u0, w0] = A[k], [u1, w1] = A[k + 1], m = Math.max(1, Math.ceil(Math.hypot(u1 - u0, w1 - w0) / 0.5));
                for (let i = 0; i <= m; i++) { const [x, y] = Y(u0 + (u1 - u0) * i / m, w0 + (w1 - w0) * i / m);
                  for (const g of VESSRA.segs) { if (Math.abs(g[0] - x) > 12 || Math.abs(g[1] - y) > 12) continue;
                    const ex = g[2] - g[0], ey = g[3] - g[1], l2 = ex * ex + ey * ey || 1, tt = Math.max(0, Math.min(1, ((x - g[0]) * ex + (y - g[1]) * ey) / l2)),
                      dd = Math.hypot(x - g[0] - ex * tt, y - g[1] - ey * tt); if (dd < clear) { clear = dd; cat = [x, y]; } } } }
                let slope = 0, step = 0, at = null, n = 0, prev = null;
                for (let k = 0; k + 1 < P.length; k++) { const [u0, w0] = P[k], [u1, w1] = P[k + 1], L = Math.hypot(u1 - u0, w1 - w0), m = Math.max(1, Math.ceil(L / 0.5));
                  for (let i = k ? 1 : 0; i <= m; i++) { const [x, y] = Y(u0 + (u1 - u0) * i / m, w0 + (w1 - w0) * i / m), z = KERN.ground(x, y); n++;
                    if (prev) { const d = Math.hypot(x - prev[0], y - prev[1]), dz = Math.abs(z - prev[2]); if (d > 1e-6 && dz / d > slope) { slope = dz / d; at = [x, y]; } step = Math.max(step, dz); }
                    for (const g of VESSRA.segs) { if (Math.abs(g[0] - x) > 12 || Math.abs(g[1] - y) > 12) continue;
                      const ex = g[2] - g[0], ey = g[3] - g[1], l2 = ex * ex + ey * ey || 1, tt = Math.max(0, Math.min(1, ((x - g[0]) * ex + (y - g[1]) * ey) / l2)),
                        dd = Math.hypot(x - g[0] - ex * tt, y - g[1] - ey * tt); if (dd < clear) { clear = dd; cat = [x, y]; } }
                    prev = [x, y, z]; } }
                return { n, slope: +slope.toFixed(3), step: +step.toFixed(3), at, clear: +clear.toFixed(2), cat, gate: +KERN.ground(...Y(0, 0.5)).toFixed(2), street: +KERN.ground(...Y(0, -8)).toFixed(2), park: +KERN.ground(pk.x, pk.y).toFixed(2) }; })()""")
            ck('a car drives in: Schulstraße → gate → parking place at most 15 % steep, no step over 0.15 m, nothing in the way (1.2 m)',
               dr['n'] > 20 and dr['slope'] <= 0.15 and dr['step'] <= 0.15 and dr['clear'] >= 1.2, json.dumps(dr))
            # buying (the planner's next round): a plant comes out of its bed and goes back
            tk = J("""(() => { const B = VESSRA.baumschule, a = B.take('obst', 3), again = B.take('obst', 3), t1 = B.isTaken('obst', 3);
                const back = B.putBack('obst', 3); return { a, again, t1, back, after: B.isTaken('obst', 3), n: B.taken().length }; })()""")
            ck('a plant can be taken out of its bed and put back (VESSRA.baumschule.take/putBack)',
               bool(tk['a']) and tk['a']['art'] == 'obst' and tk['again'] is None and tk['t1'] and tk['back'] and not tk['after'] and tk['n'] == 0, json.dumps(tk, ensure_ascii=False))
            r = J(f"""(() => {{ const e = VESSRA.baumschule.eingang; GAME.view(e.x, e.y, e.z + 1.62, e.yaw, 0, 60); GAME.step(0.5); GAME.step(4, 1);
                return {{ x: GAME.P.x, y: GAME.P.y, where: VESSRA.place(GAME.P.x, GAME.P.y), sign: (VESSRA.signs || []).filter(s => /Kammbach/.test(s)).length, young: VESSRA.youngTrees }}; }})()""")
            ck('from the gate into the sales yard; its signs; young trees on the field', 'Baumschule' in (r['where'] or '') and r['sign'] >= 2 and r['young'] > 150, json.dumps(r, ensure_ascii=False))
            # the start situation ?szenario=baumschule: on the street in front of the gate, walking in reaches the yard
            r = J("""(() => { KERN.scenario('baumschule').run(); GAME.step(0.5); const a = { x: GAME.P.x, y: GAME.P.y, place: KERN.place(GAME.P.x, GAME.P.y) };
                GAME.step(5, 1); return { a, b: { x: GAME.P.x, y: GAME.P.y, place: KERN.place(GAME.P.x, GAME.P.y) }, e: VESSRA.baumschule.eingang }; })()""")
            ck('?szenario=baumschule: in front of the gate, a few steps into the yard',
               math.hypot(r['a']['x'] - r['e']['x'], r['a']['y'] - r['e']['y']) < 8 and 'Baumschule Kammbach' in (r['b']['place'] or ''), json.dumps(r, ensure_ascii=False))
    if want('names'):
        n = J("[[-8790, -376], [-8798, -287], [-8749, -362], [-8805, -266], [-8905, -175]].map(([x, y]) => VESSRA.place(x, y))")
        ck('place names: church, gate church, Henneberg chapel, a street, the nursery',
           'Klosterkirche' in n[0] and 'Torkirche' in n[1] and 'Henneberg' in n[2] and 'Straße' in n[3] and 'Kammbach' in n[4], json.dumps(n, ensure_ascii=False))
        ss = J("(VESSRA.streetSigns || []).filter((q, i) => i % 2 === 0).map(q => [q.name, Math.round(Math.hypot(q.at[0] - VESSRA.START[0], q.at[1] - VESSRA.START[1]))])")
        ck('street name signs at the junctions (the Schleusinger Straße near the gate)', len(ss) >= 4 and any(q[0] == 'Schleusinger Straße' and q[1] < 250 for q in ss), json.dumps(ss, ensure_ascii=False))

    def view(x, y, yaw, pitch=4, fov=62, steps=12, h=1.62):
        E(f"GAME.view({x}, {y}, VESSRA.gz({x}, {y}) + {h}, {yaw}, {pitch}, {fov}); for (let i = 0; i < {steps}; i++) GAME.step(0.25)")
        settle(30)
    yaw = lambda x, y, tx, ty: math.degrees(math.atan2(tx - x, ty - y))
    if want('shots'):
        E("if (!DN.active) GAME.setMode('auto'); CLOCK.t = 14 * 60 + 30; DN.update(true)")
        lib.settle_light(pg)
        E("GAME.go('vessra')")
        settle()
        lib.shot(pg, OUT, 'a_tor')
        k = J("(() => { const K = VESSRA.kirche; return K ? { Q: [K.Q(-22, K.vS - 14), K.Q(3, K.vM), K.Q(K.uW + 1.2, K.vM), K.Q(K.uX + 8, K.vM), K.Q(70, K.vN + 18), K.Q(45, K.vN + 4)] } : null; })()")
        if k:
            a, tw, inn, cr, ne, hk = k['Q']
            view(a[0], a[1], yaw(a[0], a[1], tw[0], tw[1]), 16, 64)   # the west front from the south-west (photo Tilman2007 2025)
            lib.shot(pg, OUT, 'b_westfront')
            view(inn[0], inn[1], yaw(inn[0], inn[1], cr[0], cr[1]), 8, 70)   # the nave from the west (photo 2025)
            lib.shot(pg, OUT, 'c_langhaus')
            view(ne[0], ne[1], yaw(ne[0], ne[1], hk[0], hk[1]), 8, 64)   # the Henneberg chapel with its apse from the north-east
            lib.shot(pg, OUT, 'd_henneberg')
            E(f"GAME.orbit(95, 34, 150, [{KL[0]}, {KL[1]}, VESSRA.gz({KL[0]}, {KL[1]}) + 6]); GAME.step(0.5)")   # like the drone photo 2021 from the east
            settle()
            lib.shot(pg, OUT, 'e_drohne_ost')
        tk = J("(() => { const b = VESSRA.bld.find(q => q.lm === 'torkirche'); return b ? [b.cx, b.cy] : null; })()")
        if tk:
            view(tk[0] + 4, tk[1] - 14, yaw(tk[0] + 4, tk[1] - 14, tk[0], tk[1]), 10, 64)
            lib.shot(pg, OUT, 'f_torkirche')
        # Panoramax 2025 (R_A): the Schleusinger Straße by the monastery wall, heading 65°
        view(-8890.5, -319.8, 65 + 3.1, 2, 70, h=1.5)   # model yaw = compass + 3.1° (model frame 4.36° from UTM, meridian convergence 1.27°)
        lib.shot(pg, OUT, 'g_pmx_schleusinger')
        view(-8833.1, -284.0, 65 + 3.1, 2, 70, h=1.5)   # Panoramax 2025 by the Domänenscheune: the barn of the domain, the village ahead
        lib.shot(pg, OUT, 'g2_pmx_domaene')
        bs = J("VESSRA.baumschule ? { e: VESSRA.baumschule.eingang, b: VESSRA.baumschule.beete[2] } : null")
        if bs:
            e = bs['e']
            view(e['x'], e['y'], e['yaw'] + 25, 2, 66)
            lib.shot(pg, OUT, 'h_baumschule')
            E(f"GAME.orbit(150, 40, 70, [{bs['b']['x']}, {bs['b']['y']}, VESSRA.gz({bs['b']['x']}, {bs['b']['y']}) + 1]); GAME.step(0.5)")
            settle()
            lib.shot(pg, OUT, 'i_baumschule_oben')
        E(f"GAME.orbit(200, 38, 520, [{ORT[0]}, {ORT[1]}, VESSRA.gz({ORT[0]}, {ORT[1]})]); GAME.step(0.5)")
        settle()
        lib.shot(pg, OUT, 'j_oben')
        sg = J("(() => { const q = (VESSRA.streetSigns || []).find(q => q.name === 'Schleusinger Straße'); return q ? { at: q.at, d: q.d } : null; })()")
        if sg:   # the street sign by the gate, from 6 m in front of it
            nx, ny = sg['d'][1], -sg['d'][0]
            x, y = sg['at'][0] + nx * 6, sg['at'][1] + ny * 6
            view(x, y, yaw(x, y, sg['at'][0], sg['at'][1]), 8, 55)
            lib.shot(pg, OUT, 'l_strassenschild')
    if want('night'):
        E("if (!DN.active) GAME.setMode('auto'); CLOCK.t = 22 * 60 + 40; DN.update(true)")
        lib.settle_light(pg)
        E("GAME.go('vessra')")
        settle()
        lib.shot(pg, OUT, 'k_tor_nacht')
        n = J("{ glass: VPROPS.glass ? VPROPS.glass.emissiveIntensity : -1, mine: VESSRA.lamps.length, pool: VESSRA.pool ? VESSRA.pool.visible : null }")
        ck('night: the lamps glow', n['glass'] > 3 and n['mine'] > 30, json.dumps(n))
        lt = J("{ lit: VESSRA.lit(), lights: KERN.lights.status().filter(b => b.id === 'vessra-laternen') }")
        ck('night: two borrowed lights stand in the lamps nearest the walker (KERN.lights)', len(lt['lit']) == 2 and lt['lights'] and lt['lights'][0]['has'] == 2, json.dumps(lt))
    progs = E("(GAME.R.info.programs || []).length")
    tri = E("GAME.R.info.render.triangles")
    print('programs at the start', st0['progs'], 'after Kloster Veßra', progs, 'textures', st0['tex'], '->', E("GAME.R.info.memory.textures"), 'triangles last frame', tri, flush=True)
    ck('few new shader programs', progs - st0['progs'] <= 6, f"{st0['progs']} -> {progs}")
    if want('free'):
        E("GAME.go('garten')")
        for _ in range(140):
            E("GAME.step(0.25)")
            s = J("VESSRA.status()")
            if s['state'] == 'idle' and not s['welt']['active']:
                break
        s = J("VESSRA.status()")
        ck('back in the garden: Kloster Veßra and the tiles are freed', s['state'] == 'idle' and s['welt']['tiles'] == 0 and s['welt']['lowered'] == 0, json.dumps(s))
    good, r = lib.check_gl(pg)
    ck('every shader within 16 textures per stage', good, f"fragment {r['maxFrag']}, vertex {r['maxVert']}, {r['bad'][:3]}")
    ck.errors(errs)
ck.done()
