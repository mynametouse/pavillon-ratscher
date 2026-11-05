# feat/zombie-innen (Falko, 4.11.2026): the village houses from inside for the zombie night (zombie/z_innen*.js, ZINNEN). Mounts several
# houses (the scenario's, small, large, raised, half-timbered, the three looks, a villager's), takes pictures from the entry and in every
# room, walks from the entry into the Stube, up the stairs and down into the cellar, opens a door, searches a container, switches a light;
# shader programs must not grow, draw calls / triangles / mount time per house in the log, unmount frees geometries and textures.
# Pictures into out/zombie_innen/.
#   python3 viz3/test/zombie_innen.py PORT [tier=schnell,n=6,only=walk+shots+free+epochen+progs+sweep,haus=<id>]
import sys, os, time, json, math
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__))); import lib
port = sys.argv[1]
arg = sys.argv[2] if len(sys.argv) > 2 else ''
opts = dict(a.split('=', 1) if '=' in a else (a, '1') for a in arg.split(',') if a)
TIER = opts.get('tier', 'hoch')
NH = int(opts.get('n', '6'))
ONLY = set(opts.get('only', '').split('+')) - {''}
OUT = lib.out('zombie_innen')
ck = lib.Checks('zombie_innen')
errs = []

def want(k):
    return not ONLY or k in ONLY

HELP = r"""
window.__Z = {
  hide() { document.querySelectorAll('.ov,#doorbtn,#act2,#joy,header,#ppanel,#talkbtn,#npcsub,#toast,#qtrack,#quests,#qbanner,#vhud,#tut').forEach(e => e.style.visibility = 'hidden'); },
  mem() { const m = GAME.R.info.memory; return { g: m.geometries, t: m.textures, p: GAME.R.info.programs.length }; },
  // houses to show: the scenario's, small, large, raised, half-timbered, one of each look, a villager's
  pick(n) {
    const L = ZINNEN.list(), info = id => ZINNEN.info(id), P = id => ZIPLAN.plan(id), out = [], add = id => { if (id && !out.includes(id) && P(id)) out.push(id); };
    if (ZINNEN.scen) add(ZINNEN.scen.id);
    const by = f => L.map(o => o.id).filter(id => P(id)).sort((a, b) => f(a) - f(b));
    const area = id => P(id).W * P(id).D;
    add(by(id => (P(id).nSt > 1 && P(id).astair ? 0 : 1) + (P(id).hatch ? 0 : 0.5) + Math.abs(area(id) - 110) / 1000)[0]);
    add(by(area)[0]);
    add(by(id => -area(id))[0]);
    add(by(id => (P(id).plH > 0.5 ? 0 : 1) + Math.abs(area(id) - 90) / 1000)[0]);
    add(by(id => (P(id).nSt > 1 && P(id).astair ? 0 : 1) + (P(id).hatch ? 0 : 0.5) + Math.abs(area(id) - 110) / 1000)[0]);
    const S = VILLAGE.ST; add(L.map(o => o.id).find(id => P(id) && [S.FW, S.FW_UP].includes(VILLAGE.byId.get(id).st.style)));
    for (const lk of ['alt', 'ddr', 'nachwende']) add(L.map(o => o.id).find(id => P(id) && P(id).look === lk && !out.includes(id)));
    add(247);
    return out.slice(0, n);
  },
  rooms(H) { return H.rooms.map(r => ({ id: r.id, kind: r.kind, floor: r.floor, name: r.name, poly: r.poly.map(p => p.map(v => +v.toFixed(2))), z0: +r.z0.toFixed(2), z1: +r.z1.toFixed(2) })); },
  // a view from inside a room: from near one corner towards the room's middle (eye 1.6 m over the floor)
  roomView(H, rid, k = 0) {
    const r = H.rooms.find(q => q.id === rid), c = [0, 1].map(i => r.poly.reduce((s, p) => s + p[i], 0) / 4), p0 = r.poly[k % 4];
    const x = p0[0] + (c[0] - p0[0]) * 0.22, y = p0[1] + (c[1] - p0[1]) * 0.22;
    CAM3.want = false; GAME.view(x, y, r.z0 + 1.6, Math.atan2(c[0] - x, c[1] - y) * 180 / Math.PI, -10, 82); GAME.step(0.05);
  },
  // stand at (x, y) on the floor of z, facing yaw, third person (the walker)
  stand(x, y, z, yaw) { const P = GAME.P; P.mode = 'walk'; P.x = x; P.y = y; P.feet = z; P.vz = 0; P.yaw = yaw; P.body = yaw; P.pitch = -6; GAME.step(0.1); },
  // walk towards a point (turning to it each step) up to secs; returns where one ended
  walkTo(x, y, secs = 8) { const P = GAME.P; for (let t = 0; t < secs; t += 0.05) { const dx = x - P.x, dy = y - P.y; if (Math.hypot(dx, dy) < 0.25) break; P.yaw = Math.atan2(dx, dy) * 180 / Math.PI; P.body = P.yaw; GAME.step(0.05, 1); }
    GAME.step(0.6); // let one land (falling from a step takes a moment)
    return { x: +P.x.toFixed(2), y: +P.y.toFixed(2), feet: +P.feet.toFixed(2), room: ZINNEN.mounted()[0] ? ZINNEN.mounted()[0].roomAt(P.x, P.y, P.feet + 1) : null }; },
  // the programs the house's own meshes use, against those compiled before it came (keys of three's program cache)
  ownPrograms(H, before) {
    const R = GAME.R, keys = new Set(before), bad = new Set(), groups = [H.group].concat(H.lamps.map(l => l.g), H.doorKeys.map(k => DOORS[k].group));
    for (const g of groups) g.traverse(o => { if (!o.isMesh) return; const p = R.properties.get(o.material).currentProgram; if (p && !keys.has(p.cacheKey)) bad.add((o.material.name || o.material.type) + ' ' + p.cacheKey.slice(-80)); });
    return [...bad];
  },
  progKeys() { return GAME.R.info.programs.map(p => p.cacheKey); },
  // on foot from the entry (a 10 cm grid in the house frame, the walker's radius, steps up to STEP, no falls; inner doors count as open,
  // the trapdoor must be open): the rooms one does not reach, the waypoints where one cannot stand or that one does not reach
  reach(H) {
    const P = H.plan, cs = 0.1, R = 0.19, D = window.DOORS, cols = H.cols.filter(c => c[4] > -50);
    const walks = H.walks.filter(w => w[4] > -50 && !(w[8] && D[w[8]] && D[w[8]].t > 0.5));
    const x0 = P.xi0 - 0.05, y0 = P.yi0 - 0.05, nx = Math.ceil((P.xi1 - P.xi0 + 0.1) / cs), ny = Math.ceil((P.yi1 - P.yi0 + 0.1) / cs);
    const cw = [], cc = [], X = k => x0 + ((k % nx) + 0.5) * cs, Y = k => y0 + (Math.floor(k / nx) + 0.5) * cs;
    for (let k = 0; k < nx * ny; k++) { const x = X(k), y = Y(k);
      cw.push(walks.filter(w => x >= w[0] - 0.02 && x <= w[1] + 0.02 && y >= w[2] - 0.02 && y <= w[3] + 0.02).map(w => w[4]));
      cc.push(cols.filter(c => x > c[0] - R && x < c[1] + R && y > c[2] - R && y < c[3] + R)); }
    const floor = (k, feet) => { let b = null; for (const z of cw[k]) if (z <= feet + 0.42 && (b === null || z > b)) b = z; return b; };
    const ok = (k, z) => !cc[k].some(c => z + 1.72 > c[4] && z + 0.25 < c[5]) && !cw[k].some(s => s > z + 0.42 && s < z + 1.8);
    const cell = (x, y) => { const i = Math.floor((x - x0) / cs), j = Math.floor((y - y0) / cs); return i < 0 || j < 0 || i >= nx || j >= ny ? -1 : j * nx + i; };
    const [ex, ey] = P.toL(H.entry.x, H.entry.y), k0 = cell(ex, ey), z0 = k0 < 0 ? null : floor(k0, H.entry.z);
    if (z0 === null) return { err: 'no floor at the entry' };
    const seen = new Set([k0 + ':' + Math.round(z0 * 50)]), q = [[k0, z0]], at = [];
    while (q.length) { const [k, z] = q.pop(); at.push([k, z]); const i = k % nx, j = Math.floor(k / nx);
      for (const [di, dj] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const ii = i + di, jj = j + dj; if (ii < 0 || jj < 0 || ii >= nx || jj >= ny) continue;
        const kk = jj * nx + ii, zz = floor(kk, z); if (zz === null || zz < z - 0.45 || !ok(kk, zz)) continue;
        const key = kk + ':' + Math.round(zz * 50); if (seen.has(key)) continue; seen.add(key); q.push([kk, zz]); } }
    const unreached = P.rooms.filter(r => !at.some(([k, z]) => { const x = X(k), y = Y(k); return x > r.x0 && x < r.x1 && y > r.y0 && y < r.y1 && Math.abs(z - r.z0) < 0.06; })).map(r => r.id);
    const badNodes = [];
    H.graph.nodes.forEach((n, i) => { const [lx, ly] = P.toL(n.x, n.y), k = cell(lx, ly);
      const near = k >= 0 && at.some(([kk, z]) => Math.abs(X(kk) - lx) < 0.16 && Math.abs(Y(kk) - ly) < 0.16 && Math.abs(z - n.z) < 0.06);
      if (!near) badNodes.push({ i, room: n.room, at: [+lx.toFixed(2), +ly.toFixed(2), +n.z.toFixed(2)] }); });
    const adj = H.graph.nodes.map(() => []); for (const [a, b] of H.graph.edges) { adj[a].push(b); adj[b].push(a); }
    const gs = new Set([H.graph.entry]), gq = [H.graph.entry]; while (gq.length) { const a = gq.pop(); for (const b of adj[a]) if (!gs.has(b)) { gs.add(b); gq.push(b); } }
    const offGraph = H.rooms.filter(r => !H.graph.nodes.some((n, i) => n.room === r.id && gs.has(i))).map(r => r.id);
    return { cells: at.length, unreached, badNodes, offGraph };
  },
  act(id) { return KERN.acts().find(a => a.id === id); },
  label(id) { const a = this.act(id); try { return a ? a.label() : 'no act'; } catch (e) { return 'ERR ' + e.message; } },
};
"""

def E(js): return pg.evaluate(js)
def J(js): return json.loads(pg.evaluate('JSON.stringify(' + js + ')'))
def shot(name): lib.shot(pg, OUT, name)

def boot():
    t0 = time.time()
    hs = opts.get('haus')
    pg.goto(f'http://localhost:{port}/index.html?szenario=zombie-innen' + (f'&haus={hs}' if hs else ''), timeout=300000, wait_until='domcontentloaded')
    while not E("!!(window.GAME && GAME.loaded && GAME.loaded())"):
        bad = [e for e in errs if e.startswith('PAGEERR')]
        if bad or time.time() - t0 > 1500:
            ck('page loads', False, ' | '.join(bad[:3]) or 'time-out'); ck.errors(errs); ck.done()
        time.sleep(2)
    time.sleep(3)
    E("window.FREEZE = true")
    print('loaded', round(time.time() - t0), 's', flush=True)
    E(HELP)
    E("__Z.hide(); GAME.setMode('day'); GAME.step(0.1)")
    for _ in range(60):
        if E("!!(window.ZINNEN && ZINNEN.scen)"): break
        E("GAME.step(0.1)"); time.sleep(0.5)

with lib.browser() as b:
    pg = lib.page(b, 1100, 660, errs=errs, tier=TIER)
    boot()
    sc = J("ZINNEN.scen ? { id: ZINNEN.scen.id, entry: ZINNEN.scen.entry, stats: ZINNEN.scen.stats, look: ZINNEN.scen.plan.look, rooms: ZINNEN.scen.rooms.length, err: ZINNEN.err || null } : { err: ZINNEN.err || 'no scenario house' }")
    print('scenario', json.dumps(sc), flush=True)
    ck('the scenario mounts a house near the Anger', 'id' in sc, sc)
    n_list = E("ZINNEN.list().length")
    ck('many houses are enterable', n_list > 60, n_list)
    # the villagers' houses (dorf/dorf_life.js PIN) are enterable; Wolfgang's has the chainsaw and the axe as spots
    pins = J("[247, 219, 220, 260, 198, 214, 246, 191].map(id => ({ id, ok: !!ZINNEN.info(id), look: ZINNEN.info(id) && ZINNEN.info(id).style }))")
    print('villagers', json.dumps(pins), flush=True)
    ck('the villagers\' houses are enterable', sum(1 for p in pins if p['ok']) >= 6, pins)
    E("(() => { window.__W = null; ZINNEN.mount(220).then(H => { window.__W = { spots: H.spots.filter(s => ['motorsaege', 'axt'].includes(s.kind)).map(s => ({ id: s.id, kind: s.kind, room: s.room })), cont: H.containers.map(c => c.kind), stats: H.stats }; ZINNEN.unmount(H); }, e => { window.__W = { err: String(e) }; }); return 1; })()")
    for _ in range(100):
        if E("!!window.__W"): break
        time.sleep(0.1)
    wolf = J("window.__W")
    print('wolfgang', json.dumps(wolf), flush=True)
    ck('Wolfgang\'s house: chainsaw and axe lie ready (spots), a gun cabinet', bool(wolf) and len(wolf.get('spots', [])) == 2 and 'waffenschrank' in wolf.get('cont', []), wolf)
    if 'id' in sc:
        st = J("{ x: GAME.P.x, y: GAME.P.y, feet: GAME.P.feet, mode: GAME.P.mode, cam3: CAM3.want, place: KERN.place(GAME.P.x, GAME.P.y, GAME.P.feet + 1) }")
        print('walker', json.dumps(st), flush=True)
        ck('the walker stands at the entry, third person', abs(st['x'] - sc['entry']['x']) < 0.3 and abs(st['y'] - sc['entry']['y']) < 0.3 and st['mode'] == 'walk' and st['cam3'], st)
        E("GAME.step(0.3)")
        shot('00_szenario_eingang')
    # unmount the scenario's house, then measure clean mounts
    E("(() => { ZINNEN.scen && ZINNEN.unmount(ZINNEN.scen); GAME.step(0.05); GAME.shot(); return 1; })()")
    houses = J(f"__Z.pick({NH})")
    print('houses', houses, flush=True)
    # programs before any house (the kit's materials and textures are made at the first mount, shared by all houses)
    base = J("__Z.mem()")
    E("window.__K0 = __Z.progKeys(); 1")
    # how far the terrain rises above the ground floor in all enterable houses (cut out while a house is mounted)
    tex = J("(() => { const out = []; for (const o of ZINNEN.list()) { const P = ZIPLAN.plan(o.id); let mx = -1e9; for (let x = P.xi0 + 0.2; x < P.xi1; x += 1) for (let y = P.yi0 + 0.2; y < P.yi1; y += 1) mx = Math.max(mx, KERN.terrain(...P.toW(x, y))); out.push(+(mx - P.zG).toFixed(2)); } out.sort((a, b) => a - b); const n = out.length, q = k => out[Math.min(n - 1, Math.floor(n * k))]; return { n, over0: out.filter(v => v > 0).length, over05: out.filter(v => v > 0.5).length, over2: out.filter(v => v > 2).length, median: q(0.5), p90: q(0.9), max: out[n - 1] }; })()")
    print('terrain above the ground floor', json.dumps(tex), flush=True)
    report = []
    # never let evaluate return the handle (its group leads into the whole scene graph – docs/WORKFLOW.md)
    MOUNT = "(() => { window.__H = null; window.__ME = null; ZINNEN.mount(%d).then(H => { window.__H = H; }, e => { window.__ME = String(e && e.stack || e); }); return 1; })()"
    for hi, hid in enumerate(houses):
        # a pure cycle first: mount, draw, unmount, draw – the geometries and textures must come back to the count before
        if want('free'):
            E("(() => { window.__C = null; const m0 = __Z.mem(); ZINNEN.mount(%d).then(H => { GAME.shot(); const m1 = __Z.mem(); ZINNEN.unmount(H); GAME.shot(); window.__C = { m0, m1, m2: __Z.mem(), ms: H.stats.ms }; }); return 1; })()" % hid)
            for _ in range(200):
                if E("!!window.__C"): break
                time.sleep(0.1)
            cyc = J("window.__C")
            print('cycle', json.dumps(cyc), flush=True)
            if cyc:
                # other systems (streamed tiles) make and drop programs meanwhile: compare within the cycle (exactly: ownPrograms below)
                ck(f'house {hid}: at most one program more (the terrain cut out under the house, once)', cyc['m1']['p'] <= cyc['m0']['p'] + 1, cyc)
                ck(f'house {hid}: unmount gives geometries and textures back', cyc['m2']['g'] <= cyc['m0']['g'] and cyc['m2']['t'] <= cyc['m0']['t'], cyc)
        E(MOUNT % hid)
        for _ in range(200):
            if E("!!(window.__H || window.__ME)"): break
            time.sleep(0.1)
        if not E("!!window.__H"):
            ck(f'house {hid} mounts', False, (E("String(window.__ME || ZINNEN.err || '')") or '')[:300]); continue
        info = J(f"(() => {{ const H = __H, P = H.plan; return {{ id: H.id, look: P.look, owner: P.owner, W: +P.W.toFixed(1), D: +P.D.toFixed(1), nSt: P.nSt, cellar: !!P.cellar, attic: !!P.attic, raised: P.plH > 0.5, style: VILLAGE.byId.get(H.id).st.style, stats: H.stats, rooms: H.rooms.map(r => r.kind + r.floor), cont: H.containers.length, spots: H.spots.map(s => s.kind), doors: H.doors.length, win: H.openings.filter(o => o.kind === 'window').length, graph: [H.graph.nodes.length, H.graph.edges.length], err: ZINNEN.err || null }}; }})()")
        print('house', json.dumps(info), flush=True)
        report.append(info)
        stt = info['stats']
        ck(f'house {hid}: built in ≤ 400 ms (SwiftShader machine), ≤ 60 draw calls, ≤ 150 k triangles', stt['ms'] <= 400 and stt['draws'] <= 60 and stt['tris'] <= 150000, stt)
        ck(f'house {hid}: rooms, containers, doors', len(info['rooms']) >= 3 and info['cont'] >= 2 and info['doors'] >= 1, info)
        # every room on foot from the front door (trapdoor open), every waypoint of the zombies where one can stand, the graph connected
        rc = J("(() => { const H = __H; if (H.hatch) GAME.setDoorNow(H.hatch.key, true); const r = __Z.reach(H); if (H.hatch) GAME.setDoorNow(H.hatch.key, false); return r; })()")
        print('reach', json.dumps(rc), flush=True)
        ck(f'house {hid}: every room can be reached on foot from the entry', not rc.get('err') and not rc['unreached'], rc)
        ck(f'house {hid}: the waypoints stand where one can stand, the graph reaches every room', not rc.get('err') and not rc['badNodes'] and not rc['offGraph'], rc)
        # pictures: the entry, then a view in every room (ground floor first)
        if want('shots'):
            E("(() => { const H = __H; GAME.P.mode = 'walk'; CAM3.want = true; __Z.stand(H.entry.x, H.entry.y, H.entry.z, H.entry.yaw); GAME.step(0.4); })()")
            shot(f'{hi + 1:02d}_{hid}_eingang')
            E("(() => { const H = __H; CAM3.want = false; GAME.view(H.entry.x, H.entry.y, H.entry.z + 1.6, H.entry.yaw, -6, 80); GAME.step(0.05); })()")
            shot(f'{hi + 1:02d}_{hid}_eingang_augen')
            rooms = J("__H.rooms.map(r => r.id)")
            for rid in rooms:
                E(f"__Z.roomView(__H, '{rid}', 0)")
                shot(f'{hi + 1:02d}_{hid}_{rid}')
                if rid.startswith('stube') or rid.startswith('kueche'):
                    E(f"__Z.roomView(__H, '{rid}', 2)")
                    shot(f'{hi + 1:02d}_{hid}_{rid}_b')
        # walking: entry → Stube (its door opened), up the stairs, down into the cellar; a container, a light
        if want('walk') and hi < 3:
            r = J("""(() => { const H = __H, P = H.plan, out = {};
              __Z.stand(H.entry.x, H.entry.y, H.entry.z, H.entry.yaw);
              const st = H.rooms.find(r => r.kind === 'stube' && r.floor === 0), d = H.doors.find(q => q.room === (st && st.id));
              if (d) { GAME.setDoorNow(d.key, true); const p = P.doors.find(q => q.id === d.id), vert = p.axis === 'y', rr = P.rooms.find(q => q.id === st.id);
                const into = vert ? Math.sign((rr.x0 + rr.x1) / 2 - p.x) : Math.sign((rr.y0 + rr.y1) / 2 - p.y);
                const a = P.toW(vert ? p.x - into * 0.7 : p.x, vert ? p.y : p.y - into * 0.7), b = P.toW(vert ? p.x + into * 0.9 : p.x, vert ? p.y : p.y + into * 0.9);
                out.toDoor = __Z.walkTo(a[0], a[1], 10); out.inStube = __Z.walkTo(b[0], b[1], 6); out.stube = st.id; }
              return out; })()""")
            print('walk stube', json.dumps(r), flush=True)
            ck(f'house {hid}: walked from the entry into the Stube', r.get('inStube', {}).get('room') == r.get('stube'), r)
            shot(f'{hi + 1:02d}_{hid}_gang_stube')
            r = J("""(() => { const H = __H, P = H.plan, out = {}; if (!P.stair || P.nSt < 2) return { none: true };
              const st = P.stair, cx = (st.x0 + st.x1) / 2, a = P.toW(cx, st.y0 - 0.6), b = P.toW(cx, st.y1 - 0.15), c = P.toW(st.side === 'R' ? st.x0 - 0.3 : st.x1 + 0.3, st.y1 - 0.2);
              __Z.stand(H.entry.x, H.entry.y, H.entry.z, H.entry.yaw);
              out.foot = __Z.walkTo(a[0], a[1], 10); out.step = __Z.walkTo(b[0], b[1], 14); out.top = __Z.walkTo(c[0], c[1], 4); out.zTop = P.zF[1]; return out; })()""")
            print('walk stairs', json.dumps(r), flush=True)
            if not r.get('none'):
                ck(f'house {hid}: up the stairs to the upper floor', abs(r['top']['feet'] - r['zTop']) < 0.1, r)
                shot(f'{hi + 1:02d}_{hid}_gang_oben')
            r = J("""(() => { const H = __H, P = H.plan, out = {}; if (!P.astair) return { none: true };
              const st = P.astair, cx = (st.x0 + st.x1) / 2, dir = st.y1 >= st.y0 ? 1 : -1, a = P.toW(cx, st.y0 - dir * 0.7), b = P.toW(cx, st.y1 + dir * 0.7);
              __Z.stand(a[0], a[1], P.zF[P.nSt - 1], Math.atan2(b[0] - a[0], b[1] - a[1]) * 180 / Math.PI);
              out.top = __Z.walkTo(b[0], b[1], 14); out.zA = P.zA; return out; })()""")
            print('walk attic', json.dumps(r), flush=True)
            if not r.get('none'):
                ck(f'house {hid}: up the attic stair', abs(r['top']['feet'] - r['zA']) < 0.1, r)
                shot(f'{hi + 1:02d}_{hid}_gang_boden')
            # the way the zombies inside would take (H.route, inner doors open): from the entry to the attic (else the last room upstairs)
            r = J("""(() => { const H = __H, P = H.plan, W = GAME.P, out = { steps: [] };
              const goal = H.rooms.find(r => r.kind === 'boden') || H.rooms.filter(r => r.kind !== 'keller').slice(-1)[0];
              const c = [0, 1].map(i => goal.poly.reduce((s, p) => s + p[i], 0) / 4); out.goal = goal.id;
              for (const k of H.doorKeys) GAME.setDoorNow(k, true);
              __Z.stand(H.entry.x, H.entry.y, H.entry.z, H.entry.yaw);
              for (let i = 0; i < 30; i++) { const w = H.route(W.x, W.y, W.feet, c[0], c[1], goal.z0); const e = __Z.walkTo(w.x, w.y, 6); out.steps.push(e.room);
                if (e.room === goal.id) break; }
              out.at = H.roomAt(W.x, W.y, W.feet + 0.3); for (const k of H.doorKeys) GAME.setDoorNow(k, false); return out; })()""")
            print('route', json.dumps(r), flush=True)
            ck(f'house {hid}: along H.route from the entry to {r["goal"]}', r['at'] == r['goal'], r)
            r = J("""(() => { const H = __H, P = H.plan, out = {}; if (!P.hatch) return { none: true };
              const h = P.hatch, cx = (h.x0 + h.x1) / 2, kr = P.rooms.find(q => q.id === h.room.id), dd = H.doors.find(q => q.room === kr.id);
              __Z.stand(H.entry.x, H.entry.y, H.entry.z, H.entry.yaw);
              if (dd) GAME.setDoorNow(dd.key, true);
              const p = P.doors.find(q => q.room === kr.id); if (p) { const vert = p.axis === 'y', into = vert ? Math.sign((kr.x0 + kr.x1) / 2 - p.x) : Math.sign((kr.y0 + kr.y1) / 2 - p.y);
                const a = P.toW(vert ? p.x - into * 0.7 : p.x, vert ? p.y : p.y - into * 0.7), b = P.toW(vert ? p.x + into * 0.8 : p.x, vert ? p.y : p.y + into * 0.8); out.door = __Z.walkTo(a[0], a[1], 10); out.inKitchen = __Z.walkTo(b[0], b[1], 6); }
              const t = P.toW(cx, h.y0 - 0.5); out.atHatch = __Z.walkTo(t[0], t[1], 8);
              GAME.setDoorNow(H.hatch.key, true); GAME.step(0.2);
              const d = P.toW(cx, h.y1 + 0.3); out.down = __Z.walkTo(d[0], d[1], 12); out.zK = P.cellar.z0; return out; })()""")
            print('walk cellar', json.dumps(r), flush=True)
            if not r.get('none'):
                ck(f'house {hid}: down into the cellar through the trapdoor', abs(r['down']['feet'] - r['zK']) < 0.15, r)
                shot(f'{hi + 1:02d}_{hid}_gang_keller')
            # a container is searched (its part opens), a light goes on
            r = J("""(() => { const H = __H, c = H.containers.find(q => q.parts.length) || H.containers[0], out = { id: c.id, kind: c.kind };
              const r = H.rooms.find(q => q.id === c.room); __Z.stand(c.pos[0], c.pos[1], r.z0, 0);
              const a = __Z.act('zinnen:' + H.id + ':c:' + c.id); out.label = a ? a.label() : null; if (a) { PLAY.run ? PLAY.run(a) : a.run(); } GAME.step(0.8);
              out.t = +c.t.toFixed(2); out.searched = !!c.searched; out.think = (document.getElementById('npcsub') || {}).textContent || '';
              const l = __Z.act('zinnen:' + H.id + ':licht:' + c.room); out.light = l ? l.label() : null; if (l) l.run(); GAME.step(0.4);
              out.lit = !!H.lit[c.room]; out.lights = KERN.lights.status(); return out; })()""")
            print('search+light', json.dumps(r, ensure_ascii=False), flush=True)
            ck(f'house {hid}: a container opens and is searched', r['t'] > 0.9 and r['searched'], r)
            ck(f'house {hid}: the light goes on (a lamp of the pool is borrowed)', r['lit'] and any(s['id'] == 'zinnen' and s['has'] == 1 for s in r['lights']), r)
            E("GAME.setMode('night'); GAME.step(0.3)")
            lib.settle_light(pg)
            shot(f'{hi + 1:02d}_{hid}_licht_nacht')
            E("GAME.setMode('day'); GAME.step(0.3)")
            lib.settle_light(pg)
        own = J("__Z.ownPrograms(__H, window.__K0)")
        ck(f'house {hid}: its meshes use programs that were there before', not own, own)
        E("(() => { ZINNEN.unmount(__H); window.__H = null; GAME.step(0.1); return 1; })()")
    # the three eras in pictures (for the look after the photos): Stube, Küche and a bedroom of a house of each era, by day and at night
    # with the room's light – from the corner by the door, eye height, towards the room's middle
    if want('epochen'):
        for look, prefer in (('alt', 247), ('ddr', 219), ('nachwende', 260)):
            hid = J(f"""(() => {{ const ok = id => {{ const P = ZIPLAN.plan(id); return P && P.look === '{look}' && P.rooms.some(r => r.kind === 'stube') && P.rooms.some(r => r.kind === 'kueche'); }};
              return ok({prefer}) ? {prefer} : (ZINNEN.list().map(o => o.id).find(ok) || null); }})()""")
            if not hid:
                ck(f'a house of the era {look}', False, 'none'); continue
            E(MOUNT % hid)
            for _ in range(200):
                if E("!!(window.__H || window.__ME)"): break
                time.sleep(0.1)
            rooms = J("""(() => { const H = __H, P = H.plan, pick = k => P.rooms.find(r => r.kind === k);
              const list = [pick('stube'), pick('kueche'), pick('schlafzimmer') || pick('kammer') || pick('kinderzimmer')].filter(Boolean);
              const out = [];
              for (const r of list) { const d = H.doors.find(q => q.room === r.id), dp = d ? P.toL(d.pos[0], d.pos[1]) : [(r.x0 + r.x1) / 2, r.y0];
                const cs = [[r.x0, r.y0], [r.x1, r.y0], [r.x1, r.y1], [r.x0, r.y1]].sort((a, b) => Math.hypot(a[0] - dp[0], a[1] - dp[1]) - Math.hypot(b[0] - dp[0], b[1] - dp[1]));
                for (const [c, v] of r.kind === 'stube' ? [[cs[0], 'a'], [cs[3], 'b']] : [[cs[0], 'a']]) {
                  const m = [(r.x0 + r.x1) / 2, (r.y0 + r.y1) / 2], e = [c[0] + Math.sign(m[0] - c[0]) * 0.35, c[1] + Math.sign(m[1] - c[1]) * 0.35];
                  const ew = P.toW(e[0], e[1]), mw = P.toW(m[0], m[1]);
                  out.push({ id: r.id, kind: r.kind + (v === 'b' ? '_b' : ''), x: ew[0], y: ew[1], z: r.z0 + 1.6, yaw: Math.atan2(mw[0] - ew[0], mw[1] - ew[1]) * 180 / Math.PI }); } }
              return out; })()""")
            for mode in ('day', 'night'):
                E(f"GAME.setMode('{mode}'); GAME.step(0.2)")
                lib.settle_light(pg)
                for r in rooms:
                    E(f"""(() => {{ if ('{mode}' === 'night') __H.light('{r['id']}', true); CAM3.want = false;
                      GAME.view({r['x']}, {r['y']}, {r['z']}, {r['yaw']}, -12, 78); GAME.step(0.05); return 1; }})()""")
                    shot(f"epoche_{look}_{hid}_{r['kind']}_{'tag' if mode == 'day' else 'nacht'}")
                    if mode == 'night': E(f"__H.light('{r['id']}', false); 1")
            E("GAME.setMode('day'); GAME.step(0.2); ZINNEN.unmount(__H); window.__H = null; GAME.step(0.1); 1")
            lib.settle_light(pg)
            ck(f'pictures of the era {look} (house {hid}: ' + ', '.join(r['kind'] for r in rooms) + ')', len(rooms) >= 2, rooms)
    # as in the zombie night (viz3/test/zombie_haus.py on feat/zombie): in the village with no house mounted, drawn; then a house entered
    # and drawn – no program may come that was not there (the shared materials are given back when the last house goes)
    if want('progs'):
        E("(() => { GAME.go('dorf'); GAME.setMode('day'); for (let i = 0; i < 10; i++) GAME.step(0.05); ZINNEN.warm(); GAME.shot(); GAME.shot(); return 1; })()")
        k0 = J("__Z.progKeys()")
        hid0 = houses[0]
        E(MOUNT % hid0)
        for _ in range(200):
            if E("!!(window.__H || window.__ME)"): break
            time.sleep(0.1)
        E("(() => { ZINNEN.enter(__H); for (let i = 0; i < 6; i++) GAME.step(0.05); GAME.shot(); return 1; })()")
        k1 = J("__Z.progKeys()")
        new = [k for k in k1 if k not in set(k0)]
        print('programs in the village', len(k0), '→ in the house', len(k1), 'new:', [k[-120:] for k in new], flush=True)
        ck('entering a house in the village adds no shader program (ZINNEN.warm() made the terrain cut-out ahead)', not new, [k[-160:] for k in new])
        E("(() => { ZINNEN.unmount(__H); window.__H = null; GAME.step(0.1); return 1; })()")
    # all enterable houses once: each mounts without error within the budget, every room on foot, the waypoints (≈ 2 min)
    if want('sweep'):
        t1 = time.time()
        sw = json.loads(E("""(async () => { const bad = [], ids = ZINNEN.list().map(o => o.id); let n = 0, ms = 0, mx = 0, dr = 0, rooms = 0;
          for (const id of ids) { let H = null; try { H = await ZINNEN.mount(id); } catch (e) { bad.push({ id, err: String(e).slice(0, 200) }); continue; }
            if (!H) { bad.push({ id, err: 'no handle' }); continue; } n++; ms += H.stats.ms; mx = Math.max(mx, H.stats.ms); dr = Math.max(dr, H.stats.draws); rooms += H.rooms.length;
            if (H.hatch) GAME.setDoorNow(H.hatch.key, true); const r = __Z.reach(H); if (H.hatch) GAME.setDoorNow(H.hatch.key, false);
            if (r.err || r.unreached.length || r.badNodes.length || r.offGraph.length || H.stats.draws > 60 || H.stats.tris > 150000 || ZINNEN.err)
              bad.push({ id, stats: { draws: H.stats.draws, tris: H.stats.tris }, err: ZINNEN.err || r.err || null, unreached: r.unreached, badNodes: r.badNodes.slice(0, 4), offGraph: r.offGraph });
            ZINNEN.unmount(H); }
          return JSON.stringify({ ids: ids.length, n, msAvg: Math.round(ms / Math.max(1, n)), msMax: Math.round(mx), drawsMax: dr, rooms, bad }); })()"""))
        print('sweep', round(time.time() - t1), 's', json.dumps({k: sw[k] for k in ('ids', 'n', 'msAvg', 'msMax', 'drawsMax', 'rooms')}), 'bad', len(sw['bad']), flush=True)
        for b in sw['bad'][:30]: print('  sweep', json.dumps(b), flush=True)
        # (a few houses with a room the 10 cm flood does not reach are listed – open; the budget and errors are hard)
        hard = [b['id'] for b in sw['bad'] if b.get('err') or b['stats']['draws'] > 60 or b['stats']['tris'] > 150000]
        ck('all houses mount (≤ 60 draw calls, ≤ 150 k triangles), every room on foot and the waypoints in at least 95 %', sw['n'] == sw['ids'] and not hard and len(sw['bad']) <= sw['ids'] * 0.05, {'n': sw['n'], 'hard': hard, 'bad': [b['id'] for b in sw['bad']]})
    left = J("{ cols: GAME.COL.filter(c => c[6] === 'zinnen' && c[4] > -50).length, walks: GAME.WALK.filter(w => w[4] > -50 && w[9] && ZINNEN.mounted().length === 0 && false).length, acts: KERN.acts().filter(a => /^zinnen:/.test(a.id)).length, doors: Object.keys(DOORS).filter(k => /^zinnen:/.test(k)).length, mounted: ZINNEN.mounted().length }")
    print('left over', json.dumps(left), flush=True)
    ck('nothing of the houses left after unmount', left['cols'] == 0 and left['acts'] == 0 and left['doors'] == 0 and left['mounted'] == 0, left)
    json.dump(report, open(os.path.join(OUT, 'houses.json'), 'w'), indent=1)
    ok, gl = lib.check_gl(pg, 16)
    ck('shader programs within 16 textures, none broken', ok, {k: gl[k] for k in ('programs', 'maxFrag', 'maxVert', 'bad', 'broken')})
    ck.errors(errs)
    ck.done()
