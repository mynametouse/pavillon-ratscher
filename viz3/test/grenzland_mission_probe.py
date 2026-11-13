# feat/grenzland-mission: a probe of the places the missions of chapter 1 use – heights, place names, roads, routes – printed as JSON
# (out/grenzland_mission_probe/orte.json). Not a test of its own (not listed in tests.txt); run when a place moves:
#   bash tools/browser_lock.sh python3 viz3/test/run.py --port 9017 --serve grenzland_mission_probe
import sys, os, json, time
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__))); import lib
port = sys.argv[1] if len(sys.argv) > 1 else '8951'
OUT = lib.out('grenzland_mission_probe')
with lib.browser() as b:
    errs = []
    pg = lib.page(b, 1100, 680, errs)
    lib.boot(pg, port, '?szenario=grenzland', figures=True)
    E = pg.evaluate
    J = lambda js: json.loads(E("JSON.stringify(" + js + ")"))
    steps = lambda secs, dt=0.1: E(f"for (let i = 0; i < {max(1, int(secs / dt))}; i++) GAME.step({dt})")
    res = {}
    res['orte'] = J("""(() => { const o = {}, r = v => Math.round(v * 100) / 100;
      const at = (x, y) => ({ z: r(KERN.ground(x, y)), t: r(KERN.terrain(x, y)), pl: KERN.place(x, y, KERN.ground(x, y)), in: KERN.inside(x, y, KERN.ground(x, y) + 1), free: KERN.free(x, y),
        surf: (s => s ? { kind: s.kind, surf: s.surf, e: r(s.e) } : null)(KERN.surface(x, y)) });
      for (const [k, v] of Object.entries(GLDATA.ORTE)) o[k] = at(v.pos[0], v.pos[1]);
      for (const [k, v] of Object.entries(GLORTE.P)) o['P.' + k] = Object.assign({ pos: v }, at(v[0], v[1]));
      o.schulBau = at(224.6, -80.8); o.schulHalt = at(249, -101); o.lindeDK = at(217, -109); o.klingeTafel = at(-561, -577);
      return o })()""")
    res['box'] = J("RATSCHER.box")
    res['schule'] = J("""(() => { try { const F = DSCHOOL.frame(); return { ox: F.ox, oy: F.oy, c: F.c, s: F.s, du: F.du, dw: F.dw, zF: F.zF, L: F.L, D: F.D } } catch (e) { return String(e) } })()""")
    # the slope around the barn and the yard: heights on a grid (u along the az, v to the left of it)
    res['grid'] = J("""(() => { const out = {}, r = v => Math.round(v * 100) / 100;
      for (const [k, O] of [['treff', GLDATA.ORTE.treff], ['lager', GLDATA.ORTE.lager], ['klinge', GLDATA.ORTE.klinge], ['damm', GLDATA.ORTE.damm]]) {
        const a = (O.az || 0) * Math.PI / 180, rows = [];
        for (let v = -30; v <= 30; v += 10) { const row = [];
          for (let u = -30; u <= 30; u += 10) { const x = O.pos[0] + Math.sin(a) * u + Math.cos(a) * v, y = O.pos[1] + Math.cos(a) * u - Math.sin(a) * v; const s = KERN.surface(x, y);
            row.push(r(KERN.ground(x, y)) + (s ? 'k' + s.kind : '')) }
          rows.push(row.join(' ')) }
        out[k] = rows }
      return out })()""")
    # the roads: nodes near the places, the route of the race, the ends of the roads
    res['netz'] = J("""(() => { const G = GLAUTO.netz(), r = v => Math.round(v * 10) / 10, out = { nodes: G.nodes.length, edges: G.edges.length, zuf: GLAUTO.zufahrten().map(z => z.map(Math.round)) };
      const near = (x, y) => { const i = GLAUTO.nodeNear(x, y), n = G.nodes[i]; return n ? { i, x: r(n.x), y: r(n.y), d: r(Math.hypot(n.x - x, n.y - y)), kinds: n.edges.map(e => e.kind) } : null };
      for (const [k, v] of Object.entries(GLDATA.ORTE)) out['n.' + k] = near(v.pos[0], v.pos[1]);
      const line = GLAUTO.route(GLDATA.ORTE.treff.pos, GLDATA.ORTE.damm.pos, { k: 2 });
      if (line) { out.rennen = { L: r(line.L), n: line.n, step: line.step, pts: [] };
        const p = {}; for (let s = 0; s <= line.L; s += Math.max(20, line.L / 40)) { ((window.VERKEHR && VERKEHR.net) || window.VNETZ).at(line, s, p); const q = KERN.surface(p.x, p.y); out.rennen.pts.push([Math.round(s), r(p.x), r(p.y), r(KERN.ground(p.x, p.y)), q ? q.kind : -1, line.S ? r(line.S[Math.min(line.n - 1, Math.round(s / line.step))]) : 0]) } }
      const l2 = GLAUTO.route(GLDATA.ORTE.klinge.pos, GLDATA.ORTE.garten.pos, {}); out.klingeGarten = l2 ? r(l2.L) : null;
      const l3 = GLAUTO.route(GLDATA.ORTE.treff.pos, GLDATA.ORTE.lager.pos, {}); out.treffLager = l3 ? r(l3.L) : null;
      return out })()""")
    res['veh'] = J("({ types: Object.keys(GLAUTO.TYP), fx: Object.keys(GLTON), cast: Object.keys(GLDATA.CAST).length, stops: (window.BUS && BUS.stopAt) ? (e => e ? { name: e.name, x: e.x, y: e.y } : null)(BUS.stopAt(249, -101, 80)) : 'no BUS' })")
    res['dpeople'] = J("(() => { try { return Object.keys(DPEOPLE.figs || {}).map(k => [k, DPEOPLE.figs[k].g.visible, DPEOPLE.figs[k].at ? [Math.round(DPEOPLE.figs[k].at.x), Math.round(DPEOPLE.figs[k].at.y)] : null]) } catch (e) { return String(e) } })()")
    # the town: how long until the zone stands, what the ground does meanwhile
    E("GRENZLAND.hin(GLDATA.ORTE.zh.pos[0], GLDATA.ORTE.zh.pos[1], 110)")
    tl = []
    t0 = time.time()
    for i in range(60):
        steps(0.5)
        z = J("(() => { const z = KERN.zones().find(q => q.id === 'schleusingen'); const p = GLDATA.ORTE.zh.pos; return { st: z ? z.state : 'none', err: z ? z.err : '', g: Math.round(KERN.ground(p[0], p[1]) * 100) / 100, feet: Math.round(GAME.P.feet * 100) / 100, free: KERN.free(p[0], p[1]) } })()")
        tl.append([round(time.time() - t0), z])
        if z['st'] in ('ready', 'error') and i > 3: break
        time.sleep(1.5)
    res['zh'] = tl[-6:]
    res['zhStops'] = J("(() => { try { const out = []; for (let dx = -60; dx <= 60; dx += 15) for (let dy = -60; dy <= 60; dy += 15) { const e = BUS.stopAt(-1340 + dx, 1243 + dy, 12); if (e && !out.some(q => q.name === e.name && Math.abs(q.x - e.x) < 1)) out.push({ name: e.name, x: Math.round(e.x * 10) / 10, y: Math.round(e.y * 10) / 10 }) } return out } catch (e) { return String(e) } })()")
    res['zhGrid'] = J("""(() => { const rows = [], r = v => Math.round(v * 10) / 10; for (let dy = 30; dy >= -30; dy -= 10) { const row = []; for (let dx = -30; dx <= 30; dx += 10) { const x = -1340 + dx, y = 1243 + dy, s = KERN.surface(x, y), p = [x, y]; const moved = KERN.pushOut(p, 0.3);
        row.push(r(KERN.ground(x, y)) + (s ? 'k' + s.kind : '') + (moved ? '*' : '')) } rows.push(row.join(' ')) } return rows })()""")
    lib.shot(pg, OUT, 'zh')
    for name, x, y, yaw in [('scheune', 117 + 14, -304 + 14, 225), ('lager', 523 - 25, 549 - 25, 45), ('klinge', -548 + 14, -566 + 14, 225), ('damm', 853 - 16, -817 + 16, 135), ('linde', 222, -104, 225), ('schule', 236, -100, 320)]:
        E(f"GRENZLAND.hin({x}, {y}, {yaw})")
        steps(1.5)
        lib.shot(pg, OUT, name)
    json.dump(res, open(os.path.join(OUT, 'orte.json'), 'w'), indent=1, ensure_ascii=False)
    print(json.dumps(res, ensure_ascii=False)[:6000])
    print('RESULT grenzland_mission_probe: 1/1 ok in 0 s')
