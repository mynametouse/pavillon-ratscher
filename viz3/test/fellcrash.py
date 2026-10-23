# V16b5: a felled tree must not break the vehicles. Felling (and loading a felled tree) takes the trunk out of the collisions
# (FOREST.hide → WCOL.removeTree); until V16b5 it stayed there as NaN, the vehicles' circle test took that for a hit with NaN depth, the
# tractor near the stump got a NaN position, the sounds threw outside the ticks and the page showed „Das 3D-Modell konnte nicht geladen
# werden (… setTargetAtTime … non-finite)“ and stood still (Falko, 22.10. 17:54).
# Checks: a tree near the tractor is taken out, the tractor drives up to the stump and past it (stepped by hand, then with the real frame
# loop) – its state stays finite, no page error; the safety nets: a NaN audio value is dropped, a vehicle state set to NaN goes back to the
# last good one, an error in a frame after loading leaves the model running (no loading message, a short notice, the frames go on).
#   python3 viz3/test/fellcrash.py 8951   (~4 min)
import sys, os, json, time, math
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__))); import lib
port = sys.argv[1]; ok = []; fails = []
def check(name, cond, info=''):
    (ok if cond else fails).append(name); print(('OK   ' if cond else 'FAIL ') + name, info, flush=True)
FIN = "(() => { const t = VEH.by.tractor, s = t.st; return [s.x, s.y, s.z, s.psi, s.u, s.v, s.r, s.rpm, GAME.P.x, GAME.P.y].every(Number.isFinite); })()"
with lib.browser() as b:
    errs = []; pg = lib.page(b, 1000, 640, errs); lib.boot(pg, port)
    E = pg.evaluate
    steps = lambda secs: E(f"for (let i = 0; i < {int(secs / 0.025)}; i++) GAME.step(0.025)")
    # a tree the forester marked (as Falko fells them), the one nearest to the tractor, taken out like after felling (FOREST.hide)
    t = E("""(() => { const h = VEH.by.tractor.spec.home(); let best = null, bd = 1e9;
      for (const q of FELL.marked || []) { if (q.gone) continue; const d = Math.hypot(q.x - h[0], q.y - h[1]); if (d < bd) { bd = d; best = q; } }
      if (!best) return null; const near = () => { let n = 0; WCOL.each(best.x - 1, best.y - 1, best.x + 1, best.y + 1, null, (i, A) => { if (!(Math.hypot(A[i * 3] - best.x, A[i * 3 + 1] - best.y) >= 0.6)) n++; }); return n; };
      const n0 = near(); FOREST.hide(best); const n1 = near();
      // where the tractor starts: 7 m from the stump, on the side nearest to the road
      let st = null, se = -1e9; for (let k = 0; k < 16; k++) { const a = k / 16 * 2 * Math.PI, x = best.x + 7 * Math.sin(a), y = best.y + 7 * Math.cos(a), e = ROADS.edge(x, y); if (e > se) { se = e; st = [x, y]; } }
      return { x: best.x, y: best.y, h: best.h, d: bd, n0, n1, sx: st[0], sy: st[1], edge: se }; })()""")
    print('tree', t, flush=True)
    check('a marked tree taken out of the collisions (felled)', t and t['n0'] == 1 and t['n1'] == 0, str(t))
    # 1) stepped by hand: the tractor 7 m from the stump, slowly towards it
    sx, sy = t['sx'], t['sy']
    E(f"VEH.place('tractor', {sx}, {sy}, Math.atan2({t['x'] - sx}, {t['y'] - sy})); VEH.enter('tractor'); GAME.setView3(true)")
    dmin, fin, err = 1e9, True, ''
    try:
        E("VEH.auto = () => ({ thr: 0.5, brk: 0, steer: 0, hand: false })")
        for k in range(12):
            steps(0.5); fin = fin and E(FIN)
            p = E("[VEH.by.tractor.st.x, VEH.by.tractor.st.y]")
            if p[0] is not None: dmin = min(dmin, math.hypot(p[0] - t['x'], p[1] - t['y']))
    except Exception as e: err = str(e)[:200]
    E("VEH.auto = () => ({ thr: 0, brk: 1, steer: 0, hand: false })"); steps(1.0); E("VEH.auto = null")
    check('the tractor drives up to the stump with a valid state (stepped)', fin and not err and dmin < 5, f"closest {dmin:.1f} m, finite {fin}, {err}")
    # 2) the safety nets
    au = E("""(() => { let c = null; try { c = new OfflineAudioContext(1, 128, 44100); } catch (e) { return 'no audio context'; } const g = c.createGain();
      try { g.gain.setTargetAtTime(NaN, 0, 0.1); g.gain.linearRampToValueAtTime(Infinity, 1); g.gain.value = NaN; g.gain.setTargetAtTime(0.5, 0, 0.1); return 'dropped, value ' + g.gain.value; } catch (e) { return 'threw: ' + e.message; } })()""")
    check('a non-finite audio value is dropped, not thrown', au.startswith('dropped'), au)
    E("VEH.by.tractor.st.u = NaN; VEH.by.tractor.st.x = NaN"); steps(0.3)
    check('a vehicle state set to NaN goes back to the last good one', E(FIN), E("JSON.stringify(VEH.state()[1])"))
    # 3) the real frame loop: drive at the stump again, then an error inside a frame
    E(f"VEH.place('tractor', {sx}, {sy}, Math.atan2({t['x'] - sx}, {t['y'] - sy})); window.__n = 0; KERN.tick(() => __n++, 'test:fellcrash'); window.FREEZE = false")
    E("VEH.auto = () => ({ thr: 1, brk: 0, steer: 0, hand: false })"); time.sleep(8); E("VEH.auto = () => ({ thr: 0, brk: 1, steer: 0, hand: false })"); time.sleep(2); E("VEH.auto = null")
    n1 = E("__n"); check('the tractor at the stump with the real frame loop: valid state, frames go on', E(FIN) and n1 > 5, f"{n1} frames, {E('JSON.stringify(VEH.state()[1])')}")
    E("window.__toasts = []; new MutationObserver(() => __toasts.push(document.getElementById('toast').textContent)).observe(document.getElementById('toast'), { childList: true, characterData: true, subtree: true })")
    E("(() => { const A = GAME.audio, u = A.update; let n = 0; A.update = function () { if (n++ === 0) throw new Error('Testfehler im Bild'); return u.apply(this, arguments); }; })()")
    E("window.__hb = 0; (function hb() { __hb++; requestAnimationFrame(hb); })()")
    t1 = time.time()
    while time.time() - t1 < 25 and E("__n") <= n1 + 2: time.sleep(1)
    n2 = E("__n"); hb = E("__hb"); print(f"after the error: {n2 - n1} frames of the model, {hb} browser frames in {time.time() - t1:.0f} s", flush=True)
    st = json.loads(E("""JSON.stringify({ loading: (() => { const l = document.getElementById('loading'); return l && !l.hidden ? l.textContent : ''; })(),
      toast: __toasts.join(' | ').slice(0, 300),
      logged: (JSON.parse(localStorage.getItem('pav-loadlog') || '{}').errs || []).some(x => /Testfehler/.test(x)) })"""))
    check('an error in a frame after loading: no loading message, frames go on, logged', not st['loading'] and n2 > n1 + 2 and st['logged'], f"{n1} → {n2} frames, {st}")
    check('a short notice names it', 'Kurzer Fehler' in st['toast'], st['toast'])
    E("window.FREEZE = true; VEH.exit && VEH.exit()")
    rest = [e for e in errs if 'Testfehler' not in e and 'Texture marked' not in e]
    check('no page errors', not rest, '\n'.join(rest[:5]))
print(f"\n{len(ok)} ok, {len(fails)} failed: {fails}")
