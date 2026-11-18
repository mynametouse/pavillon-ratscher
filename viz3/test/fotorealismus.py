# feat/fotorealismus: the machinery of the picture quality – the sun's shadow in cascades (foto/schatten.js: a far and a wide tile in the
# sun's own shadow map), the air (foto/luft.js: haze by height and towards the sun) and the vegetation far away in the ground
# (bewuchs/bw_ferne.js: flowers as a tint, the fields' crops as one surface).
#   bash tools/browser_lock.sh python3 viz3/test/run.py --port 9071 --serve fotorealismus[:schatten,luft,ferne]
# What it guards: the shared uniforms still reach the programs (they are typed arrays in THREE.ShaderLib – a three.js update could
# clone them), the tiles are drawn, used and stay within their budgets, no program over 16 textures, shadows show far from the walker
# and nowhere light leaks in, the haze thins with the height, a field in June is green out to where the eye reaches.
import sys, os, json, time
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__))); import lib

port = sys.argv[1]
WANT = set((sys.argv[2] if len(sys.argv) > 2 else 'schatten,luft,ferne').split(','))
OUT = lib.out('fotorealismus')
ck = lib.Checks('fotorealismus')
errs = []
HELP = r"""
window.__FT = {
  // one frame with a new sun shadow map, its pixels read in the same task (the drawing buffer is not kept)
  grab() { const R = GAME.R, gl = R.getContext(), w = gl.drawingBufferWidth, h = gl.drawingBufferHeight, px = new Uint8Array(w * h * 4);
    R.shadowMap.needsUpdate = true; GAME.shot(); gl.readPixels(0, 0, w, h, gl.RGBA, gl.UNSIGNED_BYTE, px); return { w, h, px }; },
  // of the lit pixels of b: the share clearly darker in a, and clearly brighter
  cmp(a, b) { let n = 0, dark = 0, bright = 0; for (let i = 0; i < a.px.length; i += 8) {
      const la = 0.3 * a.px[i] + 0.59 * a.px[i + 1] + 0.11 * a.px[i + 2], lb = 0.3 * b.px[i] + 0.59 * b.px[i + 1] + 0.11 * b.px[i + 2];
      if (lb < 40) continue; n++; if (la < 0.82 * lb) dark++; else if (la > 1.22 * lb) bright++; }
    return { n, dark: +(dark / n).toFixed(4), bright: +(bright / n).toFixed(4) }; },
  // the mean colour around the model point (x, y) on the ground, or null when it is not in the picture
  at(f, x, y, r = 5) { const v = GAME.cam.position.clone().set(x, KERN.ground(x, y) + 0.2, -y).project(GAME.cam);
    if (v.z > 1 || Math.abs(v.x) > 0.95 || Math.abs(v.y) > 0.95) return null;
    const cx = Math.round((v.x * 0.5 + 0.5) * f.w), cy = Math.round((v.y * 0.5 + 0.5) * f.h), s = [0, 0, 0]; let n = 0;
    for (let j = -r; j <= r; j++) for (let i = -r; i <= r; i++) { const X = cx + i, Y = cy + j; if (X < 0 || Y < 0 || X >= f.w || Y >= f.h) continue;
      const o = (Y * f.w + X) * 4; s[0] += f.px[o]; s[1] += f.px[o + 1]; s[2] += f.px[o + 2]; n++; }
    return n ? s.map(q => Math.round(q / n)) : null; },
  // what the programs hold of the shared uniforms after a frame
  uni() { const R = GAME.R, gl = R.getContext(), o = { csm: 0, csmOk: 0, luft: 0, luftOk: 0 };
    for (const p of R.info.programs || []) { if (!p.program) continue;
      const a = gl.getUniformLocation(p.program, 'csmP'); if (a) { o.csm++; const v = gl.getUniform(p.program, a); if (Math.abs(v[0] - 2) < 0.01 && Math.abs(v[1] - 2 / 3) < 0.01) o.csmOk++; }
      const l = gl.getUniformLocation(p.program, 'luftA'); if (l) { o.luft++; const v = gl.getUniform(p.program, l); if (v[1] > 0) o.luftOk++; } }
    return o; },
  // how much of the middle of each tile of the sun's atlas holds something (depth below 1)
  atlas() { const R = GAME.R, s = GAME.scene.children.find(o => o.isDirectionalLight && o.castShadow), m = s.shadow.map, N = s.shadow.mapSize.x, T = N >> 1, w = Math.min(256, T), o = { size: [m.width, m.height] };
    for (const [k, y0] of [['far', 0], ['wide', T]]) { const px = new Uint8Array(w * w * 4); R.readRenderTargetPixels(m, N + ((T - w) >> 1), y0 + ((T - w) >> 1), w, w, px);
      let c = 0; for (let i = 0; i < w * w; i++) if (px[i * 4 + 3] < 252) c++; o[k] = +(c / (w * w)).toFixed(4); }
    return o; },
};
"""
with lib.browser() as b:
    pg = lib.page(b, 1100, 620, errs=errs, tier='hoch'); E = pg.evaluate
    J = lambda s: json.loads(E(f"JSON.stringify({s})"))
    lib.boot(pg, port, '?bauphase=0&wetter=klar')
    E(HELP)
    E("GAME.setView3 && GAME.setView3(false)")
    E("document.querySelectorAll('#toast,#hud,#topbar,#minimap,#joy,.hud').forEach(e => e.style.visibility = 'hidden')")
    E("if (window.DN && !DN.active) GAME.setMode('auto'); CLOCK.t = Math.floor(CLOCK.t / 1440) * 1440 + 15.5 * 60; DN.update(true)")
    lib.settle_light(pg)

    def view(x, y, eye, yaw, pitch, fov=55, n=8):
        E(f"(() => {{ window.CAM3 && (CAM3.want = false); GAME.view({x}, {y}, KERN.ground({x}, {y}) + {eye}, {yaw}, {pitch}, {fov}); for (let i = 0; i < {n}; i++) GAME.step(0.2); GAME.view({x}, {y}, KERN.ground({x}, {y}) + {eye}, {yaw}, {pitch}, {fov}); }})()")

    if 'schatten' in WANT:
        s0 = J("SCHATTEN.state()")
        ck('the cascades are on at the tier „hoch“ (three\'s shadow chunks as expected)', s0['ok'] and s0['on'], json.dumps(s0)[:200])
        view(-26, 46, 15, 143, -24, 52)
        E("SCHATTEN.set({ mode: 'an' }); SCHATTEN.settle(); 0")
        E("window.__a = __FT.grab(); 0")
        st = J("SCHATTEN.state()"); print('schatten', json.dumps(st), flush=True)
        T = {t['name']: t for t in st['tiles']}
        ck('both tiles drawn and in use (atlas one and a half maps wide)', all(t['ok'] for t in st['tiles']) and abs(st['P'][0] - 2) < 0.01 and st['atlas'][0] == st['atlas'][1] * 3 // 2, json.dumps(st)[:300])
        u = J("__FT.uni()")
        ck('the shared uniforms reach the programs (typed arrays in THREE.ShaderLib)', u['csmOk'] >= 5 and u['luftOk'] >= 5, json.dumps(u))
        at = J("__FT.atlas()")
        ck('the tiles hold shadow casters (trees, houses)', at['far'] > 0.003 and at['wide'] > 0.003, json.dumps(at))
        ck('a tile within its budget (far ≤ 750 k, wide ≤ 650 k triangles, ≤ 900 draw calls)', T['far']['tris'] <= 750e3 and T['wide']['tris'] <= 650e3 and max(T['far']['calls'], T['wide']['calls']) <= 900, f"far {T['far']['calls']} / {T['far']['tris']}, wide {T['wide']['calls']} / {T['wide']['tris']}")
        lib.shot(pg, OUT, 'schatten_an')
        n0 = [t['n'] for t in st['tiles']]
        for i in range(25): E("GAME.step(0.2)")
        n1 = [t['n'] for t in J("SCHATTEN.state()")['tiles']]
        ck('standing still no tile is drawn again', n0 == n1, f'{n0} → {n1}')
        # the same frame without the cascades: what they add are shadows, nowhere light (the view again: stepping took it back to the walker)
        view(-26, 46, 15, 143, -24, 52, n=1)
        E("SCHATTEN.set({ mode: 'an' }); SCHATTEN.settle(); window.__a = __FT.grab(); SCHATTEN.set({ mode: 'aus' }); window.__b = __FT.grab(); 0")
        d = J("__FT.cmp(__a, __b)"); print('an/aus', d, flush=True)
        off = J("SCHATTEN.state()")
        ck('switched off: the sun\'s map alone again', not off['on'] and off['atlas'][0] == off['atlas'][1], json.dumps(off)[:160])
        lib.shot(pg, OUT, 'schatten_aus')
        ck('shadows far from the walker (the garden from above: over 0.8 % of the lit picture darker)', d['dark'] > 0.008, json.dumps(d))
        ck('and no light where there was shadow (under 0.5 % brighter)', d['bright'] < 0.005, json.dumps(d))
        E("SCHATTEN.set({ mode: 'auto' }); SCHATTEN.settle(); 0")
    if 'luft' in WANT:
        view(-26, 46, 15, 143, -24, 52)
        E("__FT.grab(); 0")
        l0 = J("LUFT.state()"); print('luft', json.dumps(l0), flush=True)
        ck('the air: the haze as dense as the day says at the garden\'s height, brighter towards the afternoon sun', l0['ok'] and abs(l0['k'][0] - 1) < 0.08 and l0['k'][1] > 0.05 and l0['k'][2] > 0.01, json.dumps(l0))
        view(-26, 46, 420, 143, -35, 52, n=2)
        E("__FT.grab(); 0")
        l1 = J("LUFT.state()")
        ck('thinner high above the valley (420 m up: under 0.5 of it)', l1['k'][0] < 0.5, json.dumps(l1))
        lib.shot(pg, OUT, 'luft_hoch')
        E("LUFT.set({ on: false }); __FT.grab(); 0")
        l2 = J("LUFT.state()")
        ck('switched off: one density, one colour', l2['k'] == [1, 0, 0], json.dumps(l2))
        E("LUFT.set({ on: true }); 0")
    if 'ferne' in WANT:
        E("BEWUCHS.set({ doy: 160 })")
        view(-26, 46, 2.2, 143, -4, 55, n=14)
        for i in range(40):
            E("GAME.step(0.1)")
            if J("BEWUCHS.state().ferne.on"): break
        f = J("BWFERNE.state()"); print('ferne', json.dumps(f)[:700], flush=True)
        cer = [c for c in f.get('crops', []) if c['id'] in ('winterweizen', 'wintergerste', 'triticale')]
        ck('the crops\' rows of the day (eight, the winter cereals closed in June)', len(f.get('crops', [])) == 8 and len(cer) == 3 and all(c['cover'] > 0.8 for c in cer), json.dumps(f.get('crops'))[:400])
        ck('one texture for bloom and classes (512 × 1024)', J("[BWFERNE.U.tBwFar.value.image.width, BWFERNE.U.tBwFar.value.image.height]") == [512, 1024])
        # a field of winter cereal (class 19) with nothing but field 30 m around it, 150–330 m from the garden: seen from 90 m away
        spot = J("""(() => { let best = null; const is = (x, y) => (BWKARTE.codeAt(x, y) & 31) === 19;
          for (let x = -330; x <= 330; x += 10) for (let y = -330; y <= 330; y += 10) { const d = Math.hypot(x - 2, y - 2); if (d < 150 || d > 330 || !is(x, y)) continue;
            let ok = true; for (let a = 0; a < 8 && ok; a++) for (const r of [15, 30]) if (!is(x + r * Math.cos(a * 0.785), y + r * Math.sin(a * 0.785))) { ok = false; break; }
            if (ok && (!best || d < best[2])) best = [x, y, d]; } return best; })()""")
        print('field', spot, flush=True)
        ck('a field of winter cereal near the garden (the maps\' class 19)', bool(spot), spot)
        if spot:
            import math
            fx, fy = spot[0], spot[1]
            # from 90 m away on the garden's side, 2.5 m up, looking at it (yaw: degrees from north over east)
            dx, dy = fx - 2, fy - 2; L = math.hypot(dx, dy); vx, vy = fx - dx / L * 90, fy - dy / L * 90
            view(vx, vy, 2.5, math.degrees(math.atan2(dx, dy)), -1.5, 50, n=14)
            for i in range(30):
                E("GAME.step(0.1)")
            c = J(f"(() => {{ window.__a = __FT.grab(); return __FT.at(__a, {fx}, {fy}, 6); }})()")
            lib.shot(pg, OUT, 'feld_juni')
            E("BWFERNE.U.uBwFarC.value.z = 0; 0")
            p = J(f"(() => {{ window.__b = __FT.grab(); return __FT.at(__b, {fx}, {fy}, 6); }})()")
            lib.shot(pg, OUT, 'feld_juni_luftbild')
            print('field colour', c, 'the photo there', p, flush=True)
            ck('the field 90 m away is green in June (the stand in the ground\'s colour beyond the blades)', bool(c) and c[1] > c[0] * 1.06 and c[1] > c[2] * 1.12, f'{c} (the photo alone: {p})')
        # from high above a field keeps the photo
        view(-26, 46, 130, 143, -40, 55, n=3)
        hi = J("BWFERNE.state().high")
        ck('from 130 m up the fields keep the aerial photo', hi < 0.05, hi)
    ok, gl = lib.check_gl(pg)
    ck('at most 16 textures per shader program, none broken', ok, f"{gl['programs']} programs, max {gl['maxFrag']} fragment / {gl['maxVert']} vertex samplers, bad {[p['name'] for p in gl['bad']]}, broken {gl['broken']}")
ck.errors(errs)
ck.done()
