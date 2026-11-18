# feat/fotorealismus: the machinery of the picture quality – the sun's shadow in cascades (foto/schatten.js: a far and a wide tile in the
# sun's own shadow map), the hills' shadows at a low sun (foto/schatten_land.js: a field of shadow heights in a strip of the same map),
# the air (foto/luft.js: haze by height and towards the sun), the water of the reservoir (foto/wasser.js: waves with the wind, a bank
# from a map of the distance to it) and the vegetation far away in the ground (bewuchs/bw_ferne.js: flowers as a tint, the fields'
# crops as one surface).
#   bash tools/browser_lock.sh python3 viz3/test/run.py --port 9071 --serve fotorealismus[:schatten,land,luft,wasser,ferne]
# What it guards: the shared uniforms still reach the programs (they are typed arrays in THREE.ShaderLib – a three.js update could
# clone them), the tiles are drawn, used and stay within their budgets, no program over 16 textures, shadows show far from the walker
# and nowhere light leaks in, the garden lies in the shadow of the hills until the sun is over them in the morning, the haze thins with
# the height, the reservoir has waves that move and a bank that fades, a field in June is green out to where the eye reaches.
import sys, os, json, time
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__))); import lib

port = sys.argv[1]
WANT = set((sys.argv[2] if len(sys.argv) > 2 else 'schatten,land,luft,wasser,ferne').split(','))
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
  uni() { const R = GAME.R, gl = R.getContext(), o = { csm: 0, csmOk: 0, land: 0, landOk: 0, luft: 0, luftOk: 0 };
    const s = GAME.scene.children.find(o => o.isDirectionalLight && o.castShadow), own = s.shadow.map ? s.shadow.map.height / s.shadow.map.width : 1;
    for (const p of R.info.programs || []) { if (!p.program) continue;
      const a = gl.getUniformLocation(p.program, 'csmP'); if (a) { o.csm++; const v = gl.getUniform(p.program, a); if (Math.abs(v[0] - 2) < 0.01 && Math.abs(v[1] - own) < 0.002) o.csmOk++; }
      const h = gl.getUniformLocation(p.program, 'csmH'); if (h) { o.land++; const v = gl.getUniform(p.program, h); if (v[0] === 256 && v[3] > 0.99) o.landOk++; }
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
    # (kaskade=an: the tests' browser has no graphics card – without it the page leaves three's shadow chunks alone, foto/schatten_glsl.js)
    lib.boot(pg, port, '?bauphase=0&wetter=klar&kaskade=an')
    E(HELP)
    E("GAME.setView3 && GAME.setView3(false)")
    E("document.querySelectorAll('#toast,#hud,#topbar,#minimap,#joy,.hud').forEach(e => e.style.visibility = 'hidden')")
    E("if (window.DN && !DN.active) GAME.setMode('auto'); CLOCK.t = Math.floor(CLOCK.t / 1440) * 1440 + 15.5 * 60; DN.update(true)")
    lib.settle_light(pg)

    def view(x, y, eye, yaw, pitch, fov=55, n=8):
        E(f"(() => {{ window.CAM3 && (CAM3.want = false); GAME.view({x}, {y}, KERN.ground({x}, {y}) + {eye}, {yaw}, {pitch}, {fov}); for (let i = 0; i < {n}; i++) GAME.step(0.2); GAME.view({x}, {y}, KERN.ground({x}, {y}) + {eye}, {yaw}, {pitch}, {fov}); }})()")

    if 'schatten' in WANT:
        s0 = J("SCHATTEN.state()")
        ck('the cascades are on (three\'s shadow chunks as expected; asked for in the address, as this browser has no graphics card)', s0['ok'] and s0['on'], json.dumps(s0)[:200])
        view(-26, 46, 15, 143, -24, 52)
        E("SCHATTEN.set({ mode: 'an' }); SCHATTEN.settle(); 0")
        E("window.__a = __FT.grab(); 0")
        st = J("SCHATTEN.state()"); print('schatten', json.dumps(st), flush=True)
        T = {t['name']: t for t in st['tiles']}
        ck('both tiles drawn and in use (atlas one and a half maps wide, and the strip of the land\'s field)', all(t['ok'] for t in st['tiles']) and abs(st['P'][0] - 2) < 0.01 and st['atlas'][0] == st['atlas'][1] * 3 // 2 + 256, json.dumps(st)[:300])
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
        E("SCHATTEN.set({ mode: 'an' }); SCHATTEN.settle(); 0")
    if 'land' in WANT:
        # the hills' shadows: a quarter to six on the first of June – the sun stands 4° high behind the hills north-east of the garden
        E("SCHATTEN.set({ mode: 'an', land: true }); CLOCK.t = Math.floor(CLOCK.t / 1440) * 1440 + 5.75 * 60; DN.update(true)")
        lib.settle_light(pg)
        view(62, 31, 1.6, 112, 1, 60)
        E("SCHATTEN.settle(); window.__a = __FT.grab(); 0")
        st = J("SCHATTEN.state()"); L = st['land']; F = L['field']; print('land', json.dumps(L), flush=True)
        ck('the hills\' field: the heights sampled, a field worked out for the low sun and copied into the atlas', L['ready'] and L['missing'] == 0 and L['have'] and L['inAtlas'] and L['shown'] > 0.99 and 3 < F['el'] < 6 and st['atlas'][0] == st['atlas'][1] * 3 // 2 + 256, json.dumps(L)[:300])
        u = J("__FT.uni()")
        ck('its uniforms reach the programs', u['landOk'] >= 5, json.dumps(u))
        ck('a field is worked out in a few milliseconds (under 12 here)', 0 < F['ms'] < 12, F['ms'])
        ck('at 4° a fifth to a half of the land around lies in a hill\'s shadow', 0.2 < F['shaded'] < 0.55, F['shaded'])
        g = J("[SCHLAND.at(2, 2), SCHLAND.at(62, 31), KERN.terrain(62, 31)]")
        ck('the garden and the field path lie in it: the shadow reaches metres above the ground', bool(g[0]) and g[0]['lo'] > 3 and bool(g[1]) and g[1]['lo'] - g[2] > 3, json.dumps(g))
        lib.shot(pg, OUT, 'land_morgen')
        E("SCHATTEN.set({ land: false }); SCHATTEN.settle(); window.__b = __FT.grab(); 0")
        d = J("__FT.cmp(__a, __b)"); print('land an/aus', d, flush=True)
        off = J("SCHATTEN.state().land")
        lib.shot(pg, OUT, 'land_morgen_ohne')
        ck('switched off the field is not read', off['shown'] == 0 and off['H'][3] == 0, json.dumps(off)[:200])
        ck('the morning on the field path: the low sun does not reach the ground yet (over 5 % of the lit picture darker), nowhere brighter', d['dark'] > 0.05 and d['bright'] < 0.005, json.dumps(d))
        # an hour and a half later the sun is over the hills
        E("SCHATTEN.set({ land: true }); CLOCK.t = Math.floor(CLOCK.t / 1440) * 1440 + 7.25 * 60; DN.update(true)")
        lib.settle_light(pg)
        E("SCHATTEN.settle(); 0")
        g2 = J("[SCHLAND.at(2, 2), SCHATTEN.state().land]")
        ck('at a quarter past seven the sun is over them: the garden in the light', bool(g2[0]) and g2[0]['hi'] < -1 and g2[1]['shown'] > 0, json.dumps(g2)[:260])
        # and in the afternoon the field is neither worked out nor read
        n0 = g2[1]['n']
        E("CLOCK.t = Math.floor(CLOCK.t / 1440) * 1440 + 15.5 * 60; DN.update(true)")
        lib.settle_light(pg)
        E("SCHATTEN.settle(); 0")
        hi = J("SCHATTEN.state().land")
        ck('at a high sun no field is worked out, none read', hi['shown'] == 0 and hi['H'][3] == 0 and hi['n'] == n0, json.dumps(hi)[:200])
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
    if 'wasser' in WANT:
        w = J("WASSER.state()"); print('wasser', json.dumps(w), flush=True)
        nb = J("GEOMAN.water.length")
        ck('the water: every body of the geodata rebuilt with its bank map, quickly', w['built'] and w['bodies'] == nb and len(w['maps']) == nb and w['ms'] < 600 and J("RATSCHER.water.length") == nb, json.dumps(w))
        # the reservoir (the largest body): the middle of its largest triangle is deep water, a corner of its outline is the bank, the garden has no map
        bk = J("""(() => { const g = GEOMAN.water.slice().sort((a, b) => b.area - a.area)[0]; let best = 0, m = null;
          for (let t = 0; t < g.tri.length; t += 3) { const [p, q, r] = [g.tri[t], g.tri[t + 1], g.tri[t + 2]], a = Math.abs((g.x[q] - g.x[p]) * (g.y[r] - g.y[p]) - (g.y[q] - g.y[p]) * (g.x[r] - g.x[p]));
            if (a > best) { best = a; m = [(g.x[p] + g.x[q] + g.x[r]) / 3, (g.y[p] + g.y[q] + g.y[r]) / 3]; } }
          return { mid: WASSER.bank(m[0], m[1]), corner: WASSER.bank(g.x[0], g.y[0]), garden: WASSER.bank(2, 2) }; })()""")
        ck('the bank map: deep in the middle of the reservoir, about zero at a corner of its outline, none at the garden', bk['mid'] is not None and bk['mid'] > 8 and bk['corner'] is not None and abs(bk['corner']) < 3.5 and bk['garden'] is None, json.dumps(bk))
        # from the east end of the dam over the water (a calm afternoon): the waves stand until they are stepped, then the picture of the water changes
        view(1176, -730, 1.6, 200, -5, 60)
        E("WASSER.step(0); window.__w0 = __FT.grab(); window.__w1 = __FT.grab(); 0")
        lib.shot(pg, OUT, 'wasser_damm')
        dif = "(a, b) => { let n = 0, c = 0; for (let y = 0; y < Math.floor(a.h * 0.45); y++) for (let x = 0; x < a.w; x += 2) { const i = (y * a.w + x) * 4; n++; if (Math.abs(a.px[i] - b.px[i]) + Math.abs(a.px[i + 1] - b.px[i + 1]) + Math.abs(a.px[i + 2] - b.px[i + 2]) > 12) c++; } return +(c / n).toFixed(4); }"
        still = J(f"({dif})(__w0, __w1)")
        moved = J(f"(() => {{ WASSER.step(0.8); window.__w2 = __FT.grab(); return ({dif})(__w0, __w2); }})()")
        ck('the waves stand while the test holds the world, and move when stepped (lower part of the picture)', still < 0.004 and moved > 0.03, f'still {still}, after 0.8 s {moved}')
        # wind ruffles it: steeper waves
        w0 = J("WETTER.S.cur.wind")
        s0 = J("(() => { WETTER.S.cur.wind = 0; return WASSER.step(0).slope; })()")
        s1 = J("(() => { WETTER.S.cur.wind = 5; const s = WASSER.step(0).slope; __FT.grab(); return s; })()")
        lib.shot(pg, OUT, 'wasser_damm_wind')
        ck('steeper waves in a wind of 5 m/s than in calm air', 0.02 < s0 < 0.06 and s1 > s0 * 1.8, f'{s0} → {s1}')
        E(f"WETTER.S.cur.wind = {w0}; WASSER.step(0); 0")
        # the old plate back and the waves again
        off = J(f"(() => {{ WASSER.set({{ on: false }}); const c = __FT.grab(); const r = [RATSCHER.water.length, ({dif})(__w2, c)]; WASSER.set({{ on: true }}); return r; }})()")
        lib.shot(pg, OUT, 'wasser_damm_an')
        ck('switched off the old plate is back (one mesh), on again the bodies', off[0] == 1 and off[1] > 0.03 and J("RATSCHER.water.length") == nb, off)
        # from above: the whole reservoir in one picture
        view(900, -700, 80, 135, -18, 55, n=3)
        E("__FT.grab(); 0")
        lib.shot(pg, OUT, 'wasser_oben')
        ck('seen from 80 m up the water is within 600 m and would ask for pictures on a graphics card', J("WASSER.state().near") < 600, J("WASSER.state()"))
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
