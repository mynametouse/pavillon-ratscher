# Small trees give way to vehicles (world/treehit.js, Falko 23.10.2026 2:52): the car and the tractor each drive into a sapling (bends under
# the vehicle and springs back), a small tree (tips over with its root plate and stays lying, the vehicle goes on) and a thick one (stops the
# vehicle, the tree stays). Then a reload: the knocked-over trees still lie and are no obstacles. Pictures in out/baeume/ (side view before
# and after, the chase camera in the middle). Sections (optional second argument): car,tractor,reload
import sys, os, json, math
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__))); import lib
port = sys.argv[1]; OUT = lib.out('baeume'); ONLY = sys.argv[2].split(',') if len(sys.argv) > 2 else None
def want(k): return not ONLY or k in ONLY
ck = lib.Checks('baeume')
# a target for vehicle vid: a trunk with the wanted outcome (bend / fall / stop) and a free, fairly level run-up of 12 m (and 6 m behind it);
# nothing else in the corridor that would hold the vehicle (saplings may stand there), away from the modelled garden
PICK = r"""window._bPick = (vid, want, cx, cy, maxR, dmin, dmax, src) => {
  const W = WCOL, hw = vid === 'tractor' ? 1.8 : 1.5, res = [];
  for (let i = 0; i < W.nTree; i++) {
    if (W.dead[i]) continue;
    const p = W.trunk(i);
    if (!p || Math.hypot(p[0] - cx, p[1] - cy) > maxR || (Math.abs(p[0]) < 170 && Math.abs(p[1]) < 170)) continue;
    const inf = TREEHIT.info(i);
    if (!inf || inf.down || (src === 'r' && inf.forest) || (src === 'f' && !inf.forest)) continue;
    const v = TREEHIT.verdict(i, vid, 20);
    if (want === 'bend' ? !inf.soft || inf.H < 1.2 : v !== want) continue;
    if (want === 'fall' && (inf.D < (dmin || (vid === 'tractor' ? 0.11 : 0.05)) || inf.D > (dmax || (vid === 'tractor' ? 0.155 : 0.09)) || inf.soft)) continue;
    if (want === 'stop' && inf.D < 0.2) continue;
    res.push([Math.hypot(p[0] - cx, p[1] - cy), i, p]);
  }
  res.sort((a, b) => a[0] - b[0]);
  for (const [d0, i, p] of res.slice(0, 600)) {
    for (let k = 0; k < 12; k++) {
      const az = (k * Math.PI) / 6, dx = Math.sin(az), dy = Math.cos(az), L0 = 12, L1 = want === 'stop' ? 1 : 7;
      let ok = true, zp = ROADS.groundAt(p[0] - dx * L0, p[1] - dy * L0);
      for (let s = -L0; s <= L1 && ok; s += 1) {
        const x = p[0] + dx * s, y = p[1] + dy * s, z = ROADS.groundAt(x, y);
        if (!Number.isFinite(z) || Math.abs(z - zp) > 0.22 || (ROADS.at(x, y) && ROADS.at(x, y).bridge)) ok = false;
        zp = z;
        if (!ok) break;
        W.each(x - hw - 0.6, y - hw - 0.6, x + hw + 0.6, y + hw + 0.6,
          (q, A) => { const ax = A[q * 4], ay = A[q * 4 + 1], bx = A[q * 4 + 2], by = A[q * 4 + 3], ex = bx - ax, ey = by - ay, L2 = ex * ex + ey * ey || 1,
              t = Math.max(0, Math.min(1, ((x - ax) * ex + (y - ay) * ey) / L2)); if (Math.hypot(ax + ex * t - x, ay + ey * t - y) < hw + 0.3) ok = false; },
          (t, A) => { if (t === i || W.soft[t]) return; if (Math.hypot(A[t * 3] - x, A[t * 3 + 1] - y) < hw + A[t * 3 + 2] + 0.2) ok = false; });
      }
      if (!ok) continue;
      return { i, x: p[0], y: p[1], z: ROADS.groundAt(p[0], p[1]), sx: p[0] - dx * L0, sy: p[1] - dy * L0, psi: az, dx, dy, info: TREEHIT.info(i), d0 };
    }
  }
  return null;
};"""
with lib.browser() as b:
    errs = []; pg = lib.page(b, 1100, 680, errs, tier='mittel'); lib.boot(pg, port, figures=True); E = pg.evaluate
    E("document.querySelectorAll('#toast').forEach(e => e.style.visibility = 'hidden')")
    E("CLOCK.t = 13 * 60; DN.update(true)"); lib.settle_light(pg); E(PICK)
    steps = lambda secs: E(f"for (let i = 0; i < {max(1, int(secs / 0.025))}; i++) GAME.step(0.025)")
    st = json.loads(E("JSON.stringify({ th: TREEHIT.stats(), soft: WCOL.soft.reduce((a, b) => a + b, 0), trunks: WCOL.nTree, nR: WCOL.nR, rule: TREEHIT.rule })"))
    print('world', st, flush=True)
    ck('trees give way: module ready, saplings listed as soft trunks', st['th']['ready'] and st['soft'] > 100, f"{st['soft']} saplings of {st['trunks']} trunks")
    # the rule in numbers: what the car and the tractor manage at 20 km/h (stem diameter in cm → verdict), from the forest's spruces
    tab = json.loads(E("""JSON.stringify((() => { const out = {}; for (let i = 0; i < WCOL.nTree; i++) { const f = TREEHIT.info(i); if (!f || !f.forest || f.soft || f.name !== 'Fichte') continue;
        const c = Math.round(f.D * 100); if (out[c]) continue; out[c] = [TREEHIT.verdict(i, 'car', 20), TREEHIT.verdict(i, 'tractor', 20), TREEHIT.verdict(i, 'car', 4)]; } return out; })())"""))
    keys = sorted(int(k) for k in tab); print('spruce: D cm → car 20 km/h, tractor 20 km/h, car 4 km/h', {k: tab[str(k)] for k in keys}, flush=True)
    car_max = max([k for k in keys if tab[str(k)][0] == 'fall'] or [0]); tr_max = max([k for k in keys if tab[str(k)][1] == 'fall'] or [0])
    ck('car knocks over spruces up to ~9–10 cm, the tractor up to ~16 cm (loader low; ~18 with its front weights)', 8 <= car_max <= 11 and 15 <= tr_max <= 19, f"car ≤ {car_max} cm, tractor ≤ {tr_max} cm")
    fallen = []

    def look(t, H):   # 6 m up, 6 m back along the run-up and 5 m to the side, looking at a third of the height along the push direction
        dx, dy = t['dx'], t['dy']; cx_, cy_ = t['x'] - dx * 6 + dy * 5, t['y'] - dy * 6 - dx * 5
        tx, ty = t['x'] + dx * H / 3, t['y'] + dy * H / 3; dist = math.hypot(tx - cx_, ty - cy_)
        yaw = math.degrees(math.atan2(tx - cx_, ty - cy_)); pitch = -math.degrees(math.atan2(6, dist))
        return f"GAME.setView3 && GAME.setView3(false, true); GAME.view({cx_}, {cy_}, ROADS.groundAt({cx_}, {cy_}) + 6, {yaw}, {pitch}, 62); GAME.step(0.3)"
    def lies_along(i, t):
        ax = E(f"TREEHIT.axisOf({i})")
        return ax, (ax is not None and ax[0] * t['dx'] + ax[1] * t['dy'] > 0.6 and ax[2] < 0.45)

    def scenario(vid, kind, cx, cy, R, src=None):
        t = json.loads(E(f"JSON.stringify(_bPick('{vid}', '{kind}', {cx}, {cy}, {R}, 0, 0, {json.dumps(src)}))"))
        tag = '' if not src else (' (field tree)' if src == 'r' else ' (forest)')
        if not ck(f'{vid} {kind}{tag}: a target with a free run-up', t is not None, ''): return None
        inf = t['info']; name = f"{vid}_{kind}" + ('_field' if src == 'r' else '')
        print(name, 'target', {k: t[k] for k in ('i', 'x', 'y', 'psi')}, inf, flush=True)
        dx, dy = t['dx'], t['dy']; i = t['i']
        # the view from above and behind the run-up, before
        E(f"VEH.place('{vid}', {t['sx']}, {t['sy']}, {t['psi']}); GAME.step(0.2)")
        E("if (VEH.cur) VEH.exit()"); E(look(t, inf['H'])); lib.shot(pg, OUT, name + '_1_before')
        E(f"VEH.enter('{vid}'); GAME.setView3(true)"); steps(0.5)
        E("VEH.auto = () => ({ thr: 1, brk: 0, steer: 0, hand: false })")
        mx, passed, shot_mid, s, kmh_hit = 0.0, False, False, -12.0, 0
        for k in range(48):
            steps(0.2); r = json.loads(E(f"JSON.stringify({{ s: TREEHIT.state({i}), v: VEH.state().find(v => v.id === '{vid}') }})"))
            mx = max(mx, r['s']['th']); v = r['v']; s = (v['x'] - t['x']) * dx + (v['y'] - t['y']) * dy
            if s < -3: kmh_hit = v['kmh']
            if not shot_mid and (r['s']['th'] > 0.25 or (kind == 'stop' and s > -4)): lib.shot(pg, OUT, name + '_2_contact'); shot_mid = True
            if s > 6 or (kind == 'stop' and k > 30): break
        E("VEH.auto = () => ({ thr: 0, brk: 0, steer: 0, hand: true })"); steps(3.0); E("VEH.auto = null")
        r = json.loads(E(f"JSON.stringify({{ s: TREEHIT.state({i}), v: VEH.state().find(v => v.id === '{vid}'), last: TREEHIT.last, n: TREEHIT.stats().n }})"))
        v = r['v']; s = (v['x'] - t['x']) * dx + (v['y'] - t['y']) * dy
        print(name, 'after', r, f"s {s:.2f} m, hit at {kmh_hit} km/h, max tilt {mx:.2f}", flush=True)
        if not shot_mid: lib.shot(pg, OUT, name + '_2_contact')
        E("VEH.exit(); GAME.step(0.3)"); E(look(t, inf['H'])); lib.shot(pg, OUT, name + '_3_after')
        if kind == 'bend':
            ck(f'{vid}: sapling ({inf["H"]:.1f} m) bends under it', mx > 0.5, f"max {math.degrees(mx):.0f}°")
            ck(f'{vid}: drives over the sapling', s > 2, f"{s:.1f} m past it")
            ck(f'{vid}: sapling springs back', r['s']['th'] < 0.2 and not r['s']['dead'], f"{math.degrees(r['s']['th']):.0f}° now")
        elif kind == 'fall':
            ck(f'{vid}: small tree (Ø {inf["D"] * 100:.0f} cm) tips over', r['s']['mode'] == 'rest' and r['s']['dead'] and r['s']['th'] > 1.1, f"{r['s']}")
            ax, ok_ax = lies_along(i, t); ck(f'{vid}: it lies in the push direction (drawn stem axis)', ok_ax, f"axis {ax}, push {dx:.2f}, {dy:.2f}")
            ck(f'{vid}: goes on past the fallen tree', s > 2, f"{s:.1f} m past it, hit at {kmh_hit} km/h")
            fallen.append(t)
        else:
            ck(f'{vid}: thick tree (Ø {inf["D"] * 100:.0f} cm) stops it', s < 0 and not r['s']['dead'], f"centre {s:.2f} m before the stem, tree {r['s']}")
            ck(f'{vid}: the crown swayed', mx > 0.0005, f"max {math.degrees(mx):.2f}°")
        return t

    # pushed slowly: the tractor creeps against a small tree with the throttle – it leans with the loader, the root plate tears, it falls
    def push_scenario(vid, cx, cy, R):
        t = json.loads(E(f"JSON.stringify(_bPick('{vid}', 'fall', {cx}, {cy}, {R}, 0.07, 0.13))"))
        if not ck(f'{vid} push: a target', t is not None, ''): return None
        i, dx, dy = t['i'], t['dx'], t['dy']; r0 = E(f"WCOL.trunk({i})[2]"); back = (4.25 if vid == 'tractor' else 2.75) + r0
        E(f"VEH.place('{vid}', {t['x'] - dx * back}, {t['y'] - dy * back}, {t['psi']}); VEH.enter('{vid}'); GAME.setView3(true)"); steps(0.5)
        print(vid, 'push target', t['info'], flush=True)
        E("VEH.auto = () => ({ thr: 0.5, brk: 0, steer: 0, hand: false })")
        modes, mxp, shot = [], 0.0, False
        for k in range(50):
            steps(0.1); r = json.loads(E(f"JSON.stringify(TREEHIT.state({i}))"))
            if not modes or modes[-1] != r['mode']: modes.append(r['mode'])
            if r['mode'] == 'push':
                mxp = max(mxp, r['th'])
                if not shot and r['th'] > 0.12: lib.shot(pg, OUT, vid + '_push_2_leaning'); shot = True
            if r['mode'] == 'rest': break
        E("VEH.auto = () => ({ thr: 0, brk: 0, steer: 0, hand: true })"); steps(2.0); E("VEH.auto = null")
        r = json.loads(E(f"JSON.stringify({{ s: TREEHIT.state({i}), last: TREEHIT.last }})")); print(vid, 'push', modes, f"max lean {math.degrees(mxp):.0f}°", r, flush=True)
        ck(f'{vid}: pushed slowly, the tree leans first (root plate lifting)', 'push' in modes and 0.08 < mxp < 0.4, f"{modes}, max {math.degrees(mxp):.0f}°")
        ck(f'{vid}: then it tears out and lies', r['s']['mode'] == 'rest' and r['s']['dead'], str(r['s']))
        ax, ok_ax = lies_along(i, t); ck(f'{vid}: pushed over, it lies ahead of the tractor (drawn stem axis)', ok_ax, f"axis {ax}, push {dx:.2f}, {dy:.2f}")
        E("VEH.exit(); GAME.step(0.2)"); E(look(t, t['info']['H'])); lib.shot(pg, OUT, vid + '_push_3_after')
        if r['s']['dead']: fallen.append(t)

    F0 = (-470, -600)
    if want('car'):
        scenario('car', 'bend', *F0, 500)
        scenario('car', 'fall', *F0, 600)
        scenario('car', 'stop', *F0, 600)
    if want('tractor'):
        scenario('tractor', 'bend', *F0, 500)
        scenario('tractor', 'fall', *F0, 700)
        scenario('tractor', 'stop', *F0, 600)
        push_scenario('tractor', *F0, 700)
        # a measured crown of the canopy model (world/ratscher.js instances, not the forest's): a broadleaf at a field edge
        scenario('tractor', 'fall', -150, -300, 700, src='r')
    ck.errors(errs)
    if want('reload') and fallen:
        sv = E("SAVE.raw('pav-trees-v1')"); print('saved', sv, flush=True)
        sl = (json.loads(sv) or {}).get('t', []) if sv else []
        ck('fallen trees saved', all(any(abs(e[0] - t['x']) < 0.05 and abs(e[1] - t['y']) < 0.05 for e in sl) for t in fallen), str(sv)[:200])
        pg.reload(wait_until='domcontentloaded', timeout=300000)
        pg.wait_for_function("window.GAME && GAME.loaded && GAME.loaded()", timeout=1500000, polling=2000); E("window.FREEZE = true")
        E("document.querySelectorAll('#toast').forEach(e => e.style.visibility = 'hidden')"); E("CLOCK.t = 13 * 60; DN.update(true)"); lib.settle_light(pg)
        stt = json.loads(E("JSON.stringify(TREEHIT.stats())")); print('after reload', stt, flush=True)
        ck('after a reload: the trees are restored', stt['restored'] >= len(fallen), str(stt))
        for t in fallen:
            r = json.loads(E(f"JSON.stringify({{ s: TREEHIT.state({t['i']}), free: WCOL.treeAt({t['x']}, {t['y']}, 0.35) }})"))
            ck(f"after a reload: still lying at {t['x']:.0f}, {t['y']:.0f}, no obstacle", r['s']['dead'] and r['s']['mode'] == 'rest' and r['free'] == -1, str(r))
            E(look(t, t['info']['H'])); lib.shot(pg, OUT, f"reload_{t['i']}")
        # across a lying stem with the car: a wheel climbs it (a jolt, some speed lost) – from whichever side has a free run
        lie = sorted(fallen, key=lambda t: t['info']['forest'])[0]
        az = next((e[2] for e in sl if abs(e[0] - lie['x']) < 0.05 and abs(e[1] - lie['y']) < 0.05), None)
        if az is not None:
            d = (math.sin(math.radians(az)), math.cos(math.radians(az))); L = 0.9 * lie['info']['H']
            m = (lie['x'] + d[0] * 0.3 * L, lie['y'] + d[1] * 0.3 * L); run = None
            for sg in (1, -1):
                pp = (d[1] * sg, -d[0] * sg)
                if not E(f"[...Array(5).keys()].some(k => WCOL.pushCircle([{m[0]} - {pp[0]} * (6 - k), {m[1]} - {pp[1]} * (6 - k)], 1.1)) || [...Array(6).keys()].some(k => WCOL.pushCircle([{m[0]} + {pp[0]} * (k + 1), {m[1]} + {pp[1]} * (k + 1)], 1.1))"):
                    run = pp; break
            if run:
                n0 = E("TREEHIT.stats().n.over || 0")
                E(f"VEH.place('car', {m[0] - run[0] * 6}, {m[1] - run[1] * 6}, Math.atan2({run[0]}, {run[1]})); VEH.enter('car'); GAME.setView3(true)"); steps(0.4)
                E("VEH.auto = () => ({ thr: 1, brk: 0, steer: 0, hand: false })"); kmh = []
                for k in range(20):
                    steps(0.25); kmh.append(E("VEH.state().find(v => v.id === 'car').kmh"))
                    if k == 10: lib.shot(pg, OUT, 'over_stem')
                E("VEH.auto = () => ({ thr: 0, brk: 0, steer: 0, hand: true })"); steps(1.5); E("VEH.auto = null; VEH.exit(); GAME.step(0.2)")
                n1 = E("TREEHIT.stats().n.over || 0"); print('over the stem', n0, n1, kmh, flush=True)
                ck('car across a lying stem: the wheels climb it (jolts)', n1 > n0, f"{n1 - n0} wheel(s), km/h {kmh}")
            else: print('no free run across a lying stem – not tested', flush=True)
        # the menu's „Bäume aufstellen“: every knocked-over tree up again, an obstacle again, the save cleared
        E("document.querySelector('[data-treereset]').click(); GAME.step(0.2)")
        up = json.loads(E("JSON.stringify({ st: TREEHIT.stats(), saved: SAVE.raw('pav-trees-v1'), toast: document.getElementById('toast') && document.getElementById('toast').textContent })"))
        ck('menu „Bäume aufstellen“: none lies, nothing saved', up['st']['down'] == 0 and not up['saved'], str(up))
        for t in fallen:
            r = json.loads(E(f"JSON.stringify({{ s: TREEHIT.state({t['i']}), at: WCOL.treeAt({t['x']}, {t['y']}, 0.35), ax: TREEHIT.axisOf({t['i']}) }})"))
            ck(f"stands again at {t['x']:.0f}, {t['y']:.0f} (upright, an obstacle)", not r['s']['dead'] and r['at'] == t['i'] and r['ax'] and r['ax'][2] > 0.98, str(r))
        E(look(fallen[0], fallen[0]['info']['H'])); lib.shot(pg, OUT, 'stood_up')
    ck.errors(errs)
ck.done()
