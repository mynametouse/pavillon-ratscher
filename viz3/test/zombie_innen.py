# feat/zombie-innen (Falko, 4.11.2026): the village houses from inside for the zombie night (zombie/z_innen*.js, ZINNEN). Mounts several
# houses (the scenario's, small, large, raised, half-timbered, the three looks, a villager's), takes pictures from the entry and in every
# room, walks from the entry into the Stube, up the stairs and down into the cellar, opens a door, searches a container, switches a light;
# shader programs must not grow, draw calls / triangles / mount time per house in the log, unmount frees geometries and textures.
# Pictures into out/zombie_innen/.
#   python3 viz3/test/zombie_innen.py PORT [tier=schnell,n=6,only=walk+shots+free,haus=<id>]
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
    add(by(area)[0]);
    add(by(id => -area(id))[0]);
    add(by(id => (P(id).plH > 0.5 ? 0 : 1) + Math.abs(area(id) - 90) / 1000)[0]);
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
    return { x: +P.x.toFixed(2), y: +P.y.toFixed(2), feet: +P.feet.toFixed(2), room: ZINNEN.mounted()[0] ? ZINNEN.mounted()[0].roomAt(P.x, P.y, P.feet + 1) : null }; },
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
                ck(f'house {hid}: no new shader programs', cyc['m1']['p'] <= base['p'], cyc)
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
        ck(f'house {hid}: rooms, containers, doors', len(info['rooms']) >= 3 and info['cont'] >= 2 and info['doors'] >= 2, info)
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
              const st = P.stair, cx = (st.x0 + st.x1) / 2, a = P.toW(cx, st.y0 - 0.6), b = P.toW(cx, st.y1 + 0.6);
              __Z.stand(H.entry.x, H.entry.y, H.entry.z, H.entry.yaw);
              out.foot = __Z.walkTo(a[0], a[1], 10); out.top = __Z.walkTo(b[0], b[1], 14); out.zTop = P.zF[1]; return out; })()""")
            print('walk stairs', json.dumps(r), flush=True)
            if not r.get('none'):
                ck(f'house {hid}: up the stairs to the upper floor', abs(r['top']['feet'] - r['zTop']) < 0.1, r)
                shot(f'{hi + 1:02d}_{hid}_gang_oben')
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
        m1 = J("__Z.mem()")
        ck(f'house {hid}: no new shader programs after pictures and walking', m1['p'] <= base['p'], {'base': base['p'], 'now': m1['p']})
        E("(() => { ZINNEN.unmount(__H); window.__H = null; GAME.step(0.1); return 1; })()")
    left = J("{ cols: GAME.COL.filter(c => c[6] === 'zinnen' && c[4] > -50).length, walks: GAME.WALK.filter(w => w[4] > -50 && w[9] && ZINNEN.mounted().length === 0 && false).length, acts: KERN.acts().filter(a => /^zinnen:/.test(a.id)).length, doors: Object.keys(DOORS).filter(k => /^zinnen:/.test(k)).length, mounted: ZINNEN.mounted().length }")
    print('left over', json.dumps(left), flush=True)
    ck('nothing of the houses left after unmount', left['cols'] == 0 and left['acts'] == 0 and left['doors'] == 0 and left['mounted'] == 0, left)
    json.dump(report, open(os.path.join(OUT, 'houses.json'), 'w'), indent=1)
    ok, gl = lib.check_gl(pg, 16)
    ck('shader programs within 16 textures, none broken', ok, {k: gl[k] for k in ('programs', 'maxFrag', 'maxVert', 'bad', 'broken')})
    ck.errors(errs)
    ck.done()
