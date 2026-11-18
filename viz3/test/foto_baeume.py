# feat/fotorealismus (helper foto-baeume): the leaves' light and colour (garden/trees.js LAUB, the far cards in world/ratscher.js).
#   bash tools/browser_lock.sh python3 viz3/test/run.py --port 9075 --serve foto_baeume[:szene,linde,reihen,monat]
# What it guards:
#   szene  – every kind of tree built by buildTreeKind carries the leaves' light and knows how deep each card sits in its crown; the
#            uniforms reach the programs; no program over 16 textures, none broken; nothing drawn that was not drawn before
#   linde  – the lime at the Anger in the evening sun (20:00, 1 June) is green, not cream: its crown's pixels (the picture with and
#            without the crown) are green-dominant, hardly any is pale; with the mirror lobes back (LAUB.set({ on: false })) it is paler
#            – so the test would notice if three's light changed under the patch; the crown has a light and a dark side
#   reihen – the far rows: no two trees alike – the hues of the trees' pixels spread wider with each tree's own colour than without
#   monat  – June: hardly an orange tree in the valley; 18 October: the aspens are golden (the leaf picture's own colour)
import sys, os, json, time
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__))); import lib

port = sys.argv[1]
WANT = set((sys.argv[2] if len(sys.argv) > 2 else 'szene,linde,reihen,monat').split(','))
OUT = lib.out('foto_baeume')
ck = lib.Checks('foto_baeume')
errs = []
HELP = r"""
window.__FB = {
  // one frame, its pixels read in the same task (the drawing buffer is not kept); name: also kept as a picture for the test's folder
  grab(name) { const R = GAME.R, gl = R.getContext(), w = gl.drawingBufferWidth, h = gl.drawingBufferHeight, px = new Uint8Array(w * h * 4);
    R.shadowMap.needsUpdate = true; GAME.shot(); gl.readPixels(0, 0, w, h, gl.RGBA, gl.UNSIGNED_BYTE, px);
    if (name) (this.img = this.img || {})[name] = document.querySelector('#stage canvas').toDataURL('image/jpeg', 0.88);
    return { w, h, px }; },
  // the pixels that differ between two frames (what was hidden in b): their indices
  mask(a, b, d = 14) { const m = []; for (let i = 0; i < a.px.length; i += 4)
      if (Math.abs(a.px[i] - b.px[i]) + Math.abs(a.px[i + 1] - b.px[i + 1]) + Math.abs(a.px[i + 2] - b.px[i + 2]) > d) m.push(i); return m; },
  // colours of the pixels m of frame f: mean, the share that is green (green above red and blue), pale (bright and hardly any
  // colour: the cream of a mirror lobe), orange (red clearly above green, green above blue), the mean brightness of the left and of the
  // right half of the pixels (by their column), and how far the hues spread (standard deviation of red − green over the brightness)
  stat(f, m) { const s = [0, 0, 0], o = { n: m.length, green: 0, pale: 0, orange: 0 }; let xs = 0;
    for (const i of m) xs += (i / 4) % f.w; const xm = xs / Math.max(1, m.length); let l = [0, 0], c = [0, 0], q = 0, q2 = 0;
    for (const i of m) { const r = f.px[i], g = f.px[i + 1], b = f.px[i + 2], lu = 0.3 * r + 0.59 * g + 0.11 * b, mx = Math.max(r, g, b), mn = Math.min(r, g, b);
      s[0] += r; s[1] += g; s[2] += b; if (g > r * 1.03 && g > b * 1.1) o.green++; if (lu > 150 && mx - mn < 0.3 * mx) o.pale++;
      if (r > g * 1.12 && g > b * 1.15 && mx > 70) o.orange++; const k = (i / 4) % f.w < xm ? 0 : 1; l[k] += lu; c[k]++;
      const hq = (r - g) / Math.max(20, lu); q += hq; q2 += hq * hq; }
    const n = Math.max(1, m.length); o.mean = s.map(v => Math.round(v / n)); for (const k of ['green', 'pale', 'orange']) o[k] = +(o[k] / n).toFixed(4);
    o.left = Math.round(l[0] / Math.max(1, c[0])); o.right = Math.round(l[1] / Math.max(1, c[1])); o.hue = +Math.sqrt(Math.max(0, q2 / n - (q / n) ** 2)).toFixed(4); return o; },
  // the pixels of frame f that show plants (not sky, road, roof): green or yellow-brown above blue, below the horizon band y0–y1 (shares of the height from the top)
  plants(f, y0, y1) { const m = []; for (let y = Math.round(f.h * (1 - y1)); y < Math.round(f.h * (1 - y0)); y++) for (let x = 0; x < f.w; x++) { const i = (y * f.w + x) * 4, r = f.px[i], g = f.px[i + 1], b = f.px[i + 2];
      if (g > b * 1.12 && r > b * 0.9 && Math.max(r, g) > 28) m.push(i); } return m; },
  // a frame without the lime's crown (moved below the ground: the levels of detail set its meshes' visibility for every frame)
  lime() { const ms = VPROPS.lindeMeshes.slice(1), put = y => ms.forEach(m => { m.position.y = y; m.updateMatrix(); m.updateMatrixWorld(true); });
    put(-900); const f = this.grab(); put(0); return f; },
  uni() { const R = GAME.R, gl = R.getContext(), o = { leaf: 0, leafOk: 0, far: 0, farOk: 0 };
    for (const p of R.info.programs || []) { if (!p.program) continue;
      const a = gl.getUniformLocation(p.program, 'lfK'), t = gl.getUniformLocation(p.program, 'lfT'), g = gl.getUniformLocation(p.program, 'gtU');
      if (a && t) { o.leaf++; const v = gl.getUniform(p.program, a); if (Math.abs(v[0] - LAUB.U.lfK.value.x) < 1e-4 && Math.abs(v[3] - LAUB.U.lfK.value.w) < 1e-4) o.leafOk++; }
      if (g) { o.far++; const v = gl.getUniform(p.program, g); if (Math.abs(v[0] - (1 - LAUB.S.autumn)) < 0.02) o.farOk++; } }
    return o; },
};
"""
VIEW = "window.FOVX = {5}; GAME.view({0}, {1}, KERN.ground({0}, {1}) + {2}, {3}, {4}, {5}); 0"
def go(pg, x, y, eye, yaw, pitch, fov, steps=8):
    E = pg.evaluate
    E(VIEW.format(x, y, eye, yaw, pitch, fov))
    for i in range(steps):
        E("GAME.step(0.25)")
        if i % 8 == 7: time.sleep(0.5)
    time.sleep(1.2); E("GAME.step(0.1)"); lib.settle_light(pg)
    E(VIEW.format(x, y, eye, yaw, pitch, fov)); E("window.SCHATTEN && SCHATTEN.settle(); 0")
def clock(pg, hour, days=0):
    pg.evaluate(f"if (window.DN && !DN.active) GAME.setMode('auto'); CLOCK.t = (Math.floor(CLOCK.t / 1440) + {days}) * 1440 + {hour * 60}; DN.update(true); LAUB.season(true); 0")
    lib.settle_light(pg)

with lib.browser() as b:
    pg = lib.page(b, 960, 540, errs=errs, tier='hoch'); E = pg.evaluate
    J = lambda s: json.loads(E(f"JSON.stringify({s})"))
    lib.boot(pg, port, '?bauphase=0&wetter=klar&kaskade=an')
    E(HELP)
    E("GAME.setView3 && GAME.setView3(false)")
    E("document.querySelectorAll('#toast,#hud,#topbar,#minimap,#joy,.hud').forEach(e => e.style.visibility = 'hidden')")
    day0 = J("LAUB.state()")
    print('laub', day0, flush=True)

    if 'szene' in WANT:
        clock(pg, 15.5); go(pg, 4, 23, 1.6, 186, 6, 62)
        kinds = J("""Object.fromEntries(Object.entries(TREES).map(([k, K]) => { const a = K.lg.getAttribute('aLfIn'); let s = 0, n = 0, lo = 255, hi = 0;
          if (a) for (let i = 0; i < a.count; i += 5) { const v = a.array[i]; s += v; n++; if (v < lo) lo = v; if (v > hi) hi = v; }
          return [k, { laub: !!K.leaf.userData.laub, n: a ? a.count : 0, pos: K.lg.attributes.position.count, mean: n ? +(s / n / 255).toFixed(3) : -1, lo, hi,
            far: [K.lgFar, K.lgFar2].filter(g => g && g.getAttribute('aLfIn')).length }]; }))""")
        bad = [k for k, v in kinds.items() if not (v['laub'] and v['n'] == v['pos'] and 0.25 < v['mean'] < 0.7 and v['lo'] < 30 and v['hi'] > 190)]
        ck("every kind of tree: the leaves' light, and each card corner knows its depth in the crown (open at the hull, deep in the core)",
           len(kinds) >= 8 and not bad, f"{len(kinds)} kinds, mean depth {min(v['mean'] for v in kinds.values())}–{max(v['mean'] for v in kinds.values())}, bad {bad}")
        E("__FB.grab(); 0")
        u = J("__FB.uni()")
        ck("the leaves' uniforms reach their programs (leaf crowns and far cards)", u['leaf'] >= 1 and u['leaf'] == u['leafOk'] and u['far'] >= 1 and u['far'] == u['farOk'], str(u))
        st = J("LAUB.state()")
        ck('1 June: summer – the aspen\'s autumn picture is drawn green', 140 < st['doy'] < 165 and st['autumn'] == 0, str(st))

    if 'linde' in WANT:
        # the lime in the evening sun, seen from the south-east: the sun (north-west, 8° up) lights the crown from behind on the right
        clock(pg, 20); go(pg, 240, -112, 1.6, 250, 0, 62)
        has = E("!!(window.VPROPS && VPROPS.lindeMeshes && VPROPS.lindeMeshes.length)")
        ck('the lime at the Anger is there', has)
        if has:
            E("""(() => { const F = __FB; F.a = F.grab('linde_20'); LAUB.set({ on: false }); F.off = F.grab('linde_20_spiegel'); LAUB.set({ on: true });
              F.b = F.lime(false);
              F.m = F.mask(F.a, F.b); })(); 0""")
            s, so = J("__FB.stat(__FB.a, __FB.m)"), J("__FB.stat(__FB.off, __FB.m)")
            print('linde 20:00', s, 'with the mirror lobes', so, flush=True)
            ck('the crown fills a good part of the picture', s['n'] > 0.08 * 960 * 540, f"{s['n']} pixels")
            ck('the lime in the evening sun is green: most of its pixels green-dominant, hardly any pale', s['green'] > 0.8 and s['pale'] < 0.03, f"green {s['green']}, pale {s['pale']}, mean {s['mean']}")
            ck('with the mirror lobes of sky and sun it is paler (the patch is what keeps it green)', so['pale'] > s['pale'] + 0.02 or so['mean'][2] > s['mean'][2] * 1.25, f"pale {so['pale']} vs {s['pale']}, blue {so['mean'][2]} vs {s['mean'][2]}")
        # in the afternoon from the street: the crown has a sunny and a shaded side (the sun in the south-west, to the left of this view)
        clock(pg, 15.5); go(pg, 242, -101, 1.6, 292, 2, 62)
        if has:
            E("""(() => { const F = __FB; F.a = F.grab('linde_1530'); F.b = F.lime(false); F.m = F.mask(F.a, F.b); })(); 0""")
            s = J("__FB.stat(__FB.a, __FB.m)")
            print('linde 15:30', s, flush=True)
            ck('the lime in the afternoon: green, not grey', s['green'] > 0.8 and s['pale'] < 0.03, f"green {s['green']}, pale {s['pale']}, mean {s['mean']}")

    if 'reihen' in WANT:
        clock(pg, 15.5); go(pg, -520, -480, 1.6, 40, 2, 62, 32)
        E("""(() => { const F = __FB; F.a = F.grab('reihen_1530'); LAUB.set({ vary: 0 }); F.b = F.grab('reihen_1530_gleich'); LAUB.set({ vary: 1 }); F.m = F.plants(F.a, 0.42, 0.62); })(); 0""")
        s, s0 = J("__FB.stat(__FB.a, __FB.m)"), J("__FB.stat(__FB.b, __FB.m)")
        print('reihen', s, 'without the trees\' own colours', s0, flush=True)
        ck("no two alike: the far trees' hues spread wider with each tree's own colour", s['n'] > 3000 and s['hue'] > s0['hue'] * 1.1, f"spread {s['hue']} vs {s0['hue']} over {s['n']} pixels")
        ck('June: no orange trees in the far rows', s['orange'] < 0.01, f"orange {s['orange']}")

    if 'monat' in WANT:
        clock(pg, 15.5); go(pg, 20, 60, 60, 150, -12, 55)
        E("(() => { const F = __FB; F.a = F.grab('tal_juni'); F.m = F.plants(F.a, 0.0, 0.8); })(); 0")
        sj = J("__FB.stat(__FB.a, __FB.m)")
        clock(pg, 15.5, 139); go(pg, 20, 60, 60, 150, -12, 55, 4)   # 18 October
        st = J("LAUB.state()")
        E("(() => { const F = __FB; F.b = F.grab('tal_oktober'); })(); 0")
        so = J("__FB.stat(__FB.b, __FB.m)")
        print('tal june', sj, 'october', so, st, flush=True)
        ck('18 October: the aspen\'s autumn has come', 285 < st['doy'] < 295 and st['autumn'] > 0.9, str(st))
        ck('June: hardly an orange tree in the valley; in October the aspens are golden', sj['orange'] < 0.01 and so['orange'] > sj['orange'] + 0.01, f"orange {sj['orange']} → {so['orange']}")
        clock(pg, 15.5, -139)

    for k, d in (J("__FB.img || {}")).items():
        import base64
        open(os.path.join(OUT, k + '.jpg'), 'wb').write(base64.b64decode(d.split(',')[1]))
    ok, gl = lib.check_gl(pg)
    ck('at most 16 textures per shader program, none broken', ok, f"{gl['programs']} programs, max {gl['maxFrag']} fragment / {gl['maxVert']} vertex samplers, bad {[p['name'] for p in gl['bad']]}, broken {gl['broken']}")
    ck.errors(errs)
ck.done()
