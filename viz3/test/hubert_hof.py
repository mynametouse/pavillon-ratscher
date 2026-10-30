# Hubert's yard as it is today (feat/hubert-hof, 30.10.2026; Falko's photos of 26.10.2026 and the aerial of 2024) in construction phase 0:
# the four sheds of site.json neigh (the long open shed by the path, the shed with the door, his workshop, the small workshop behind the car),
# the black gate (shut, opens by hand and for Hubert's tractor), the grass lane with the drying huts, the brook in its pipe under the yard,
# the place names. Checks also what the neighbours' day needs: no collider in the lane, the tractor's home and its way out free, the car's
# working places free, Hubert walks from his workshop to the huts and stacks wood, the tractor opens the gate and it shuts behind it.
# Pictures: out/hubert_hof/ (the yard from the field path, the gate and the lane with the huts, the lane, the work yard, a top view).
#   python3 viz3/test/hubert_hof.py PORT [nogeo=1,tier=mittel]
import sys, os, time, json
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__))); import lib
port = sys.argv[1]
arg = sys.argv[2] if len(sys.argv) > 2 else ''
opts = dict(a.split('=', 1) if '=' in a else (a, '1') for a in arg.split(',') if a)
QUERY = '?bauphase=0' + ('&nogeo=1' if opts.get('nogeo') == '1' else '')
OUT = lib.out('hubert_hof')
ck = lib.Checks('hubert_hof')
errs = []

# helpers in the page – everything returned is plain data (never a scene object: Playwright would serialise the whole scene)
HELP = r"""
window.__Y = {
  hide() { document.querySelectorAll('.ov,#doorbtn,#act2,#joy,header,#ppanel,#talkbtn,#npcsub,#toast,#qtrack,#quests,#qbanner,#vhud,#wpcard,#hud,#topbar,#minimap,#tut').forEach(e => e.style.visibility = 'hidden'); },
  // active colliders (this phase) overlapping the box [x0, x1] × [y0, y1] between heights z0 and z1, except the given tags
  cols(x0, x1, y0, y1, z0, z1, skip) {
    const out = [], P = window.PHASE;
    for (const e of GAME.COL) {
      if (!((e[7] == null || e[7] <= P) && (e[8] == null || P < e[8]))) continue;
      if (skip && skip.includes(e[6])) continue;
      if (e[5] <= z0 || e[4] >= z1) continue;
      let bx0 = e[0], bx1 = e[1], by0 = e[2], by1 = e[3];
      if (e[9] && e[9].cx !== undefined) { // a turned box: its bounding box in site coordinates
        const r = e[9], C = [[e[0], e[2]], [e[1], e[2]], [e[1], e[3]], [e[0], e[3]]].map(([u, v]) => [r.cx + u * r.c - v * r.s, r.cy + u * r.s + v * r.c]);
        bx0 = Math.min(...C.map(p => p[0])); bx1 = Math.max(...C.map(p => p[0])); by0 = Math.min(...C.map(p => p[1])); by1 = Math.max(...C.map(p => p[1]));
      }
      if (bx1 > x0 && bx0 < x1 && by1 > y0 && by0 < y1) out.push({ tag: e[6], box: [bx0, bx1, by0, by1].map(v => +v.toFixed(2)), z: [e[4], e[5]] });
    }
    return out;
  },
  // colliders across a walking corridor: points every 0.5 m along a polyline, a square of half width r round each
  corridor(pts, r, skip) {
    const hit = [];
    for (let i = 0; i + 1 < pts.length; i++) {
      const [ax, ay] = pts[i], [bx, by] = pts[i + 1], n = Math.max(1, Math.ceil(Math.hypot(bx - ax, by - ay) / 0.5));
      for (let k = 0; k <= n; k++) { const x = ax + (bx - ax) * k / n, y = ay + (by - ay) * k / n;
        for (const c of this.cols(x - r, x + r, y - r, y + r, 0.3, 1.7, skip)) if (!hit.some(h => h.tag === c.tag && h.box.join() === c.box.join())) hit.push(Object.assign({ at: [+x.toFixed(1), +y.toFixed(1)] }, c)); }
    }
    return hit;
  },
  hub() { const h = NPC.NPCS.hubert; return { x: +h.x.toFixed(2), y: +h.y.toFixed(2), cur: LIFE.cur('hubert'), drive: !!h.drive, away: !!h.away }; },
  day(hm) { CLOCK.t = Math.floor(CLOCK.t / 1440) * 1440 + hm; GAME.step(0.1); },
  view(x, y, eye, yaw, pitch, fov) { GAME.view(x, y, KERN.ground(x, y) + eye, yaw, pitch, fov || 70); for (let i = 0; i < 4; i++) GAME.step(0.25); },
};
"""

def E(js): return pg.evaluate(js)
def J(js): return json.loads(pg.evaluate('JSON.stringify(' + js + ')'))
def shot(name): lib.shot(pg, OUT, name)

with lib.browser() as b:
    pg = lib.page(b, 1000, 640, errs=errs, tier=opts.get('tier', 'mittel'))
    t0 = time.time(); pg.goto(f'http://localhost:{port}/index.html{QUERY}', timeout=300000, wait_until='domcontentloaded')
    while not E("!!(window.GAME && GAME.loaded && GAME.loaded())"):
        bad = [e for e in errs if e.startswith('PAGEERR')]
        if bad or time.time() - t0 > 1500:
            ck('page loads', False, ' | '.join(bad[:3]) or 'time-out'); ck.errors(errs); ck.done()
        time.sleep(2)
    time.sleep(3); E("window.FREEZE = true"); print('loaded', round(time.time() - t0), 's', flush=True)
    E(HELP)
    E("__Y.hide(); GAME.setMode('day'); GAME.setView3 && GAME.setView3(false); GAME.step(0.1)")

    # ---------------- what is built ----------------
    info = J("""{ phase: window.PHASE, neigh: SITE.neigh.length, sheds: HOF.sheds.map(s => s && { name: s.name, kind: s.kind, open: s.open, u: s.u.map(v => +v.toFixed(3)), D: +s.D.toFixed(2), L: +s.L.toFixed(2), c: s.c.map(v => +v.toFixed(2)) }),
        huts: HOF.huts.map(h => ({ x: +h.x.toFixed(2), y: +h.y.toFixed(2), fill: h.fill, front: h.front.map(v => +v.toFixed(2)) })), stackHut: HOF.stackHut,
        gate: HOF.gate && { c: HOF.gate.c, keys: HOF.gate.keys, t: HOF.gate.keys.map(k => DOORS[k] && DOORS[k].t), label: HOF.gate.keys.map(k => DOORS[k] && DOORS[k].label) },
        home: NPC.TRACTOR_HOME ? [NPC.TRACTOR_HOME.x, NPC.TRACTOR_HOME.y] : [-15.1, 27.2] }""")
    print('built', json.dumps(info)[:1500], flush=True)
    ck('start in construction phase 0', info['phase'] == 0, info['phase'])
    kinds = [s and s['kind'] for s in info['sheds']]
    ck('the four sheds of site.json neigh are built (long shed, shed with door, workshop, workshop behind the car)', info['neigh'] == 4 and kinds == ['long', 'door', 'workshop', 'car'], kinds)
    s0 = info['sheds'][0]
    ck('the long shed by the path is open towards the yard (east) and long and low', s0['open'] and s0['u'][0] > 0.8 and s0['L'] > 12 and s0['D'] < 7.5, s0)
    ck('his workshop is open to the east', info['sheds'][2]['open'] and info['sheds'][2]['u'][0] > 0.8, info['sheds'][2])
    g = info['gate'] or {}
    ck('the black gate: two leaves, shut, called "Tor"', g.get('t') == [0, 0] and g.get('label') == ['Tor', 'Tor'], g)
    huts = info['huts']
    ck('a row of drying huts (at least six)', len(huts) >= 6, len(huts))
    fronts = all(h['front'][0] > h['x'] + 0.5 for h in huts)
    ck('the huts open to the lane (east)', fronts, [(h['x'], h['front'][0]) for h in huts])
    sh = huts[info['stackHut']] if info['stackHut'] is not None and info['stackHut'] < len(huts) else None
    ck('one hut is being filled (the fifth)', sh is not None and 0 < sh['fill'] < 1 and info['stackHut'] == 4, sh)
    # the lane: east of the huts, south of the gate, west of Falko's garden
    # (through the gate's east half: the tractor stands at home right behind the gate's west part, as in the aerial)
    lane = [[-14.2, 31.2], [-13.22, 29.6], [-12.5, 27.5], [-12.2, 25.3], [-14.0, 21.7], [-15.35, 18.0]]
    inGarden = J(f"{json.dumps(lane)}.map(([x, y]) => {{ let c = false; const P = SITE.garden; for (let i = 0, j = P.length - 1; i < P.length; j = i++) {{ const [xi, yi] = P[i], [xj, yj] = P[j]; if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) c = !c; }} return c; }})")
    ck("the lane runs outside Falko's garden", not any(inGarden), inGarden)
    ck('the huts stand west of the lane', all(min(abs(h['x'] - p[0]) + abs(h['y'] - p[1]) for p in lane) > 2.0 for h in huts))
    hit = J(f"__Y.corridor({json.dumps(lane)}, 0.45, [])")
    ck('no collider blocks the lane (through the gate past the parked tractor to the work yard, a person wide)', not hit, hit[:6])
    # the tractor's home and its way out through the gate
    home = J("__Y.cols(-16.5, -13.7, 25.3, 29.1, 0.05, 1.8, ['tractor'])")
    ck("the tractor's home is free (no hut, stack or fence in it)", not home, home[:5])
    way = J("__Y.corridor([[-15.1, 27.2], [-14.7, 32.2], [-13.5, 37.2], [-12.1, 41.2]], 0.9, ['tractor', 'tree'])")
    ck('its way out through the gate to the field path is free (of the yard: posts, fences, stacks)', not way, way[:5])
    trees = J("__Y.corridor([[-15.1, 27.2], [-14.7, 32.2], [-13.5, 37.2], [-12.1, 41.2]], 0.9, ['tractor']).filter(c => c.tag === 'tree')")
    print('note: garden trees and bank bushes on the tractor\'s way out (garden/trees.js, npc/npc.js DRIVE_ROUTE, not this yard):', trees, flush=True)
    # the car's working places
    car = J("[HOFCAR.front, HOFCAR.side, HOFCAR.rear].map(([x, y]) => __Y.cols(x - 0.25, x + 0.25, y - 0.25, y + 0.25, 0.3, 1.7, []).map(c => c.tag))")
    ck("Hubert's places at the car (front, side, back) are free", not any(car), car)
    inShed = J("HOF.sheds.some(S => { const dx = HOF.car.x - S.c[0], dy = HOF.car.y - S.c[1]; return Math.abs(dx * S.u[0] + dy * S.u[1]) < S.D / 2 + 1 && Math.abs(-dx * S.u[1] + dy * S.u[0]) < S.L / 2 + 1.5; })")
    ck('the car does not stand in a shed', not inShed)
    # the brook in its pipe under the yard: one stands on the yard, the ditch goes on beside it
    gr = J("""(() => { const L = HOF.layout.culvert, P = HOF.path, t = (L.t[0] + L.t[1]) / 2, o = STREAM.cOff(t), [x, y] = P.xy(t, o), [x2, y2] = P.xy(L.t[0] - 2.5, STREAM.cOff(L.t[0] - 2.5));
        return { on: +KERN.ground(x, y).toFixed(3), ditch: +STREAM.zAt(x, y).toFixed(2), beside: +KERN.ground(x2, y2).toFixed(2), place: KERN.place(x, y, 0) }; })()""")
    ck('over the brook the yard is level (the brook runs in a pipe), beside it the ditch', abs(gr['on']) < 0.05 and gr['ditch'] < -1 and gr['beside'] < -1, gr)
    places = J("""{ yard: KERN.place(-20, 40, 0), culvert: KERN.place(...HOF.path.xy(0, 4.6), 0), lane: KERN.place(-13.5, 24, 0),
        workshop: KERN.place(...HOF.sheds[2].c, 0), long: KERN.place(...HOF.sheds[0].c, 0) }""")
    bush = J("""(() => { const m4 = new THREE.Matrix4(), p = new THREE.Vector3(), q = new THREE.Quaternion(), s = new THREE.Vector3(), L = HOF.layout.culvert; let n = 0;
        TREEG.traverse(o => { if (!o.isInstancedMesh) return; const bb = o.geometry.boundingBox; for (let i = 0; i < o.count; i++) { o.getMatrixAt(i, m4); m4.decompose(p, q, s);
          const [t, oo] = HOF.path.to(p.x, -p.z); if (t > L.t[0] && t < L.t[1] && oo > L.o[0] && oo < L.o[1] && s.y > 0.01 && (!bb || s.y * (bb.max.y - bb.min.y) < 3.2)) n++; } });
        return { visible: n, hidden: HOF.bushesHidden }; })()""")
    ck('no bush of the brook bank stands on the yard over the pipe', bush['visible'] == 0, bush)
    ck('place names: Huberts Hof (yard, over the pipe, lane), Huberts Werkstatt, Huberts Schuppen',
       places['yard'] == 'Huberts Hof' and places['culvert'] == 'Huberts Hof' and places['lane'] == 'Huberts Hof' and places['workshop'] == 'Huberts Werkstatt' and places['long'] == 'Huberts Schuppen', places)

    # ---------------- pictures of phase 0 ----------------
    E("__Y.day(14 * 60); LIFE.force('hubert', 'off'); LIFE.force('ronald', 'off'); GAME.setMode('day'); GAME.step(0.2)")
    E("__Y.view(-9.2, 43.4, 1.65, -120, -5, 78)"); shot('a_yard_from_field_path')
    E("__Y.view(-15.4, 38.4, 1.65, 176, -8, 74)"); shot('b_black_gate_lane_huts')
    E("__Y.view(-12.6, 28.6, 1.65, -160, -6, 74)"); shot('c_lane_drying_huts')
    E("__Y.view(-4.0, 6.0, 1.65, -100, -4, 74)"); shot('d_work_yard_from_garden')
    E("__Y.view(-13.0, 16.5, 1.65, -30, -5, 74)"); shot('e_lane_up_to_the_gate')
    E("(() => { const z = 90, f = 2 * Math.atan(34 / z) * 180 / Math.PI; window.FOVX = f; GAME.view(-24, 12, z, 0, -89.9, f); for (let i = 0; i < 4; i++) GAME.step(0.25); })()")
    shot('f_top_view'); E("window.FOVX = undefined")

    # ---------------- the gate by hand ----------------
    E("(() => { const p = DOORS.hofgate1.pos; GAME.view(p[0], p[1] + 1.2, 1.62, 180, -10); GAME.step(0.05); GAME.toggleDoor('hofgate1'); GAME.toggleDoor('hofgate2'); for (let i = 0; i < 30; i++) GAME.step(0.1); })()")
    op = J("[DOORS.hofgate1.t, DOORS.hofgate2.t, HOF.gate.open()]")
    E("__Y.view(-15.4, 38.4, 1.65, 176, -8, 74)"); shot('g_gate_open')
    E("GAME.toggleDoor('hofgate1'); GAME.toggleDoor('hofgate2'); for (let i = 0; i < 30; i++) GAME.step(0.1)")
    sh_ = J("[DOORS.hofgate1.t, DOORS.hofgate2.t]")
    ck('the gate opens and shuts by hand', op[0] > 0.9 and op[1] > 0.9 and sh_ == [0, 0], [op, sh_])

    # ---------------- Hubert: from his workshop to the drying huts, stacking ----------------
    E("LIFE.force('hubert', null); LIFE.force('ronald', null); __Y.day(10 * 60); LIFE.force('hubert', 'putter')")
    r = J("""(() => { for (let k = 0; k < 1800; k++) { GAME.step(0.1); const h = NPC.NPCS.hubert, b = HOF.sheds[2].bench; if (Math.hypot(h.x - b[0], h.y - b[1]) < 1.3 && h.fig.pose) return { k, h: __Y.hub() }; } return { k: -1, h: __Y.hub() }; })()""")
    ck('Hubert works at the bench in his workshop', r['k'] >= 0, r)
    f0 = E("HOF.huts[HOF.stackHut].fill")
    E("LIFE.force('hubert', 'stack')")
    r = J("""(() => { const hut = HOF.huts[HOF.stackHut], f0 = hut.fill; let best = 99, path = [];
        for (let k = 0; k < 2400; k++) { GAME.step(0.1); const h = NPC.NPCS.hubert, d = Math.hypot(h.x - hut.front[0], h.y - hut.front[1]); best = Math.min(best, d);
          if (k % 40 === 0) path.push([+h.x.toFixed(1), +h.y.toFixed(1)]); if (hut.fill > f0 + 0.01) return { k, best: +best.toFixed(2), fill: hut.fill, path }; }
        return { k: -1, best: +best.toFixed(2), fill: hut.fill, path }; })()""")
    print('stack', r, flush=True)
    ck('he carries wood from the heap to the hut in the lane and stacks it', r['k'] >= 0 and r['best'] < 0.6 and r['fill'] > f0, r)
    E("__Y.view(-15.6, 21.6, 1.65, -110, -8, 66)"); shot('h_hubert_at_the_huts')
    E("LIFE.force('hubert', null)")

    # ---------------- the tractor opens the gate and it shuts again behind it ----------------
    E("LIFE.force('hubert', 'off'); NPC.NPCS.hubert.x = NPC.TRACTOR_HOME ? NPC.TRACTOR_HOME.x + 1 : -14.1; NPC.NPCS.hubert.y = 26.0; NPC.startDrive(); GAME.step(0.1)")
    r = J("""(() => { let opened = -1, passed = -1, shut = -1, k = 0; const G = HOF.gate;
        for (; k < 900; k++) { GAME.step(0.1); const T = NPC.TRACTOR.g.position, d = Math.hypot(T.x - G.c[0], -T.z - G.c[1]);
          if (opened < 0 && G.open()) opened = k; if (opened >= 0 && passed < 0 && d > 12) passed = k; if (passed >= 0 && !G.open() && DOORS.hofgate1.t < 0.05) { shut = k; break; } }
        return { opened, passed, shut, drive: !!NPC.NPCS.hubert.drive }; })()""")
    print('tractor out', r, flush=True)
    ck('the gate opens for the tractor and shuts behind it', r['opened'] >= 0 and r['passed'] > r['opened'] and r['shut'] > r['passed'], r)
    r = J("""(() => { let k = 0, wasOpen = false; for (; k < 2400 && NPC.NPCS.hubert.drive; k++) { GAME.step(0.1); if (HOF.gate.open()) wasOpen = true; }
        for (let j = 0; j < 120; j++) GAME.step(0.1); const T = NPC.TRACTOR.g.position;
        return { k, wasOpen, home: [+T.x.toFixed(2), +(-T.z).toFixed(2)], open: HOF.gate.open() }; })()""")
    print('tractor back', r, flush=True)
    ck('back home through the open gate, then shut again', r['wasOpen'] and abs(r['home'][0] + 15.1) < 1.5 and abs(r['home'][1] - 27.2) < 1.5 and not r['open'], r)
    E("LIFE.force('hubert', null); LIFE.force('ronald', null)")
    ck.errors(errs)
    ck.done()
