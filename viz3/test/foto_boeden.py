# feat/foto-boeden: the ground one walks and drives on, up close (docs/features/foto-boeden.md) – step 1: asphalt and hard roads,
# the setts of the towns.
#   bash tools/browser_lock.sh python3 viz3/test/run.py --port 9074 --serve foto_boeden
# What it guards, from pixels (the look lives in the ground shaders, world/roads.js roadShade): up close the asphalt has a grain
# (the aggregate – it was a soft grey before), which is gone where a pixel is wider than a stone (nothing flickers far away); the wheel
# paths of the Landstraße are broad darker bands; the old asphalt of a village street is warmer in tone than the Landstraße;
# from the scene: the Markt's paving is laid in courses (it was a mosaic without a direction) and wraps without a seam;
# and what it may cost: no program over 16 textures, none broken, no new program, the ground shaders' source within its budget.
import sys, os, json, time
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__))); import lib

port = sys.argv[1]
OUT = lib.out('foto_boeden')
# the limits, after the first run at GitHub (18.11.2026, run 44388287806, SwiftShader, 1100 × 620, tier hoch): fine contrast 0.0259
# on the Landstraße and 0.0258 in the village (from 14 m 0.0166), wheel paths 0.961 of the asphalt beside them, red/blue 1.031 in
# the village against 0.991, ground shaders 97 958 – 104 166 characters
GRAIN = 0.018     # fine contrast of the asphalt from 1.3 m (the grain is subtle: a few percent)
WHEEL = 0.98      # brightness of the wheel paths against the asphalt beside them
SHADER = 108000   # characters of a ground shader's fragment source without comments and blanks
ck = lib.Checks('foto_boeden')
errs = []
HELP = r"""
window.__FB = {
  // one frame, its pixels read in the same task (the drawing buffer is not kept)
  grab() { const R = GAME.R, gl = R.getContext(), w = gl.drawingBufferWidth, h = gl.drawingBufferHeight, px = new Uint8Array(w * h * 4);
    R.shadowMap.needsUpdate = true; GAME.shot(); gl.readPixels(0, 0, w, h, gl.RGBA, gl.UNSIGNED_BYTE, px); return { w, h, px }; },
  lum(f, X, Y) { const o = (Y * f.w + X) * 4; return 0.3 * f.px[o] + 0.59 * f.px[o + 1] + 0.11 * f.px[o + 2]; },
  // the fine contrast of the middle of the picture: each pixel against the mean of the 5 × 5 around it (rms, relative to the mean
  // brightness) – a grain shows, soft clouds and the light do not; and the mean colour there
  grain(f, half = 150) { const cx = f.w >> 1, cy = f.h >> 1; let s = 0, n = 0, m = 0; const c = [0, 0, 0];
    for (let Y = cy - half; Y < cy + half; Y += 2) for (let X = cx - half; X < cx + half; X += 2) { let a = 0;
      for (let j = -2; j <= 2; j++) for (let i = -2; i <= 2; i++) a += this.lum(f, X + i, Y + j);
      const l = this.lum(f, X, Y), d = l - a / 25; s += d * d; m += l; n++; const o = (Y * f.w + X) * 4; c[0] += f.px[o]; c[1] += f.px[o + 1]; c[2] += f.px[o + 2]; }
    return { rel: +(Math.sqrt(s / n) / (m / n)).toFixed(4), mean: +(m / n).toFixed(1), rgb: c.map(v => Math.round(v / n)) }; },
  // the mean brightness around the model point (x, y) on the ground, or null when it is not in the picture
  at(f, x, y, r = 4) { const v = GAME.cam.position.clone().set(x, KERN.ground(x, y) + 0.02, -y).project(GAME.cam);
    if (v.z > 1 || Math.abs(v.x) > 0.97 || Math.abs(v.y) > 0.97) return null;
    const cx = Math.round((v.x * 0.5 + 0.5) * f.w), cy = Math.round((v.y * 0.5 + 0.5) * f.h); let s = 0, n = 0;
    for (let j = -r; j <= r; j++) for (let i = -r; i <= r; i++) { const X = cx + i, Y = cy + j; if (X < 0 || Y < 0 || X >= f.w || Y >= f.h) continue; s += this.lum(f, X, Y); n++; }
    return n ? s / n : null; },
  // across a road at (x, y), its direction (ux, uy): the brightness at the lateral offsets `offs` (metres from the centre line, both
  // sides), at stations every 1.5 m along it – per station the offsets relative to that station's mean, then the median over the stations
  // (a shadow or a patch at one station does not decide)
  across(f, x, y, ux, uy, offs, n = 9) { const rows = [];
    for (let k = -n; k <= n; k++) { const sx = x + ux * k * 1.5, sy = y + uy * k * 1.5, row = [];
      for (const d of offs) { const a = this.at(f, sx - uy * d, sy + ux * d), b = this.at(f, sx + uy * d, sy - ux * d); row.push(a == null || b == null ? null : (a + b) / 2); }
      if (row.some(v => v == null)) continue; const m = row.reduce((p, q) => p + q, 0) / row.length; if (m < 30) continue; rows.push(row.map(v => v / m)); }
    const med = a => { const s = [...a].sort((p, q) => p - q); return s[s.length >> 1]; };
    return { n: rows.length, rel: offs.map((d, i) => rows.length ? +med(rows.map(r => r[i])).toFixed(4) : null) }; },
  // the ground shaders: the length of their fragment source without comments and blanks (what a computer without a graphics card
  // pays at every pixel)
  shaders() { const gl = GAME.R.getContext(), o = {}; for (const p of GAME.R.info.programs || []) { const fs = gl.getShaderSource(p.fragmentShader) || '';
      if (/vec3 roadShade\(/.test(fs)) o[((p.cacheKey || '').split(',').pop() || 'ground') + '#' + p.id] = fs.replace(/\/\/.*$/gm, '').replace(/\s+/g, ' ').length; } return o; },
  // the Markt's paving (schleusingen-ansicht/sa_markt.js settCanvas): the share of joints, how much the brightness of whole rows
  // differs (courses: the joints between them are rows of the picture) against that of whole columns, and its wrap – the step
  // from the last row and column to the first against the steps inside
  setts(n = 512) { const cv = SAMARKT.settCanvas(n, 4, 7), d = cv.getContext('2d').getImageData(0, 0, n, n).data, L = new Float32Array(n * n);
    let dark = 0, m = 0; for (let i = 0; i < n * n; i++) { L[i] = 0.3 * d[i * 4] + 0.59 * d[i * 4 + 1] + 0.11 * d[i * 4 + 2]; m += L[i]; } m /= n * n;
    const rows = new Float32Array(n), cols = new Float32Array(n);
    for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) { const l = L[y * n + x]; rows[y] += l / n; cols[x] += l / n; if (l < 0.72 * m) dark++; }
    const sd = a => { let s = 0; for (const v of a) s += (v - m) * (v - m); return Math.sqrt(s / a.length); };
    const step = (a, b) => { let s = 0; for (let k = 0; k < n; k++) s += Math.abs(a(k) - b(k)); return s / n; };
    const inX = step(k => L[k * n + 200], k => L[k * n + 201]), seamX = step(k => L[k * n + n - 1], k => L[k * n]);
    const rs = []; for (let y = 0; y < n - 1; y++) rs.push(step(k => L[y * n + k], k => L[(y + 1) * n + k])); rs.sort((p, q) => p - q);
    return { mean: +m.toFixed(1), joints: +(dark / (n * n)).toFixed(3), rows: +sd(rows).toFixed(2), cols: +sd(cols).toFixed(2), inX: +inX.toFixed(2), seamX: +seamX.toFixed(2),
      rowMax: +rs[rs.length - 1].toFixed(2), seamY: +step(k => L[(n - 1) * n + k], k => L[k]).toFixed(2) }; },
};
"""
with lib.browser() as b:
    pg = lib.page(b, 1100, 620, errs=errs, tier='hoch'); E = pg.evaluate
    J = lambda s: json.loads(E(f"JSON.stringify({s})"))
    lib.boot(pg, port, '?bauphase=0&wetter=klar&kaskade=an')
    E(HELP)
    E("GAME.setView3 && GAME.setView3(false)")
    E("document.querySelectorAll('#toast,#hud,#topbar,#minimap,#joy,.hud,.ov,#doorbtn').forEach(e => e.style.visibility = 'hidden')")
    E("if (window.DN && !DN.active) GAME.setMode('auto'); CLOCK.t = Math.floor(CLOCK.t / 1440) * 1440 + 15.5 * 60; DN.update(true)")
    lib.settle_light(pg)
    progs0 = E("GAME.R.info.programs.length")

    def view(x, y, h, yaw, pitch, fov=62, steps=8):
        """the eye h metres over the ground at (x, y); the land and its light settled before it returns"""
        E(f"window.FOVX = {fov}; GAME.view({x}, {y}, KERN.ground({x}, {y}) + {h}, {yaw}, {pitch}, {fov}); 0")
        for i in range(steps): E("GAME.step(0.25)")
        time.sleep(0.5)
        E(f"GAME.view({x}, {y}, KERN.ground({x}, {y}) + {h}, {yaw}, {pitch}, {fov}); window.SCHATTEN && SCHATTEN.settle(); 0")

    def shot(name):
        import base64
        d = E("(() => { GAME.shot(); return document.querySelector('#stage canvas').toDataURL('image/jpeg', 0.9); })()")
        open(os.path.join(OUT, name + '.jpg'), 'wb').write(base64.b64decode(d.split(',')[1]))

    # ---- the Landstraße beside Ratscher (a main road in open country, 6.6 m): seen from above, along the road ----
    LX, LY, LYAW = 197.25, 53.63, 135.47   # on its centre line, the road runs towards yaw 135.47°
    import math
    ux, uy = math.sin(math.radians(LYAW)), math.cos(math.radians(LYAW))
    s = J(f"KERN.surface({LX}, {LY})")
    ck('the spot on the Landstraße: a main road, asphalt, open country, near its centre line', bool(s) and s['kind'] == 1 and s['surf'] == 0 and s['style'] in (0, 1) and abs(s['lat']) < 0.5, json.dumps(s))
    view(LX, LY, 16, LYAW, -89.5, 62, 24)
    shot('01_landstrasse_oben')
    # the lane's middle lies 1.65 m from the centre line, the wheel paths 0.8 m either side of it (0.85 m, 2.45 m); between a path
    # and the middle (1.25 m, 2.05 m) the surface is as laid
    a = J(f"__FB.across(__FB.grab(), {LX}, {LY}, {ux}, {uy}, [0.85, 1.25, 2.05, 2.45])")
    wp = (a['rel'][0] + a['rel'][3]) / (a['rel'][1] + a['rel'][2]) if a['n'] else 9
    ck('seen from above the wheel paths of the Landstraße are broad bands a little darker than the asphalt beside them', a['n'] >= 8 and wp < WHEEL, f"{wp:.4f} (below {WHEEL}) " + json.dumps(a))
    view(LX + uy * 1.65, LY - ux * 1.65, 1.3, LYAW, -89.5, 62, 6)
    shot('02_landstrasse_nah')
    g_main = J("__FB.grain(__FB.grab())")
    ck('from 1.3 m the asphalt of the Landstraße shows its aggregate (fine contrast)', g_main['rel'] > GRAIN, json.dumps(g_main))
    view(LX + uy * 1.65, LY - ux * 1.65, 14, LYAW, -89.5, 30, 4)
    g_far = J("__FB.grain(__FB.grab(), 60)")
    ck('where a pixel is wider than a stone the grain is gone (nothing to flicker far away)', g_far['rel'] < 0.85 * g_main['rel'], f"near {g_main['rel']}, from 14 m {g_far['rel']}")

    # ---- the Anger's street in the village (a street, 5 m, old asphalt) ----
    AX, AY = 242.0, -101.0
    s = J(f"KERN.surface({AX}, {AY})")
    ck('the spot in the village: a street of asphalt, in the village', bool(s) and s['kind'] == 3 and s['surf'] == 0 and s['style'] == 3 and s['e'] > 1, json.dumps(s))
    view(AX, AY, 1.3, 292, -89.5, 62, 12)
    shot('03_dorfstrasse_nah')
    g_dorf = J("__FB.grain(__FB.grab())")
    ck('the village street shows its aggregate too', g_dorf['rel'] > GRAIN, json.dumps(g_dorf))
    # (both spots lie in the sun at 15:30: the same light – what differs is the surface: weathered asphalt is warmer, new bluish)
    warm = lambda g: g['rgb'][0] / max(1, g['rgb'][2])
    ck('the old asphalt of the village street is warmer in tone than the Landstraße (kept best)', warm(g_dorf) > warm(g_main) + 0.015, f"red/blue: village {warm(g_dorf):.3f} {g_dorf['rgb']}, Landstraße {warm(g_main):.3f} {g_main['rgb']}")
    view(AX, AY, 1.6, 292, -8, 62, 4)
    shot('04_anger')

    # ---- the setts of the Markt of Schleusingen (the picture SAMARKT lays over the Markt when the town stands; here only made) ----
    if E("!!(window.SAMARKT && SAMARKT.settCanvas)"):
        st = J("__FB.setts()")
        ck("the Markt's setts lie in courses: whole rows of the picture differ (the joints between the courses), whole columns hardly", st['rows'] > 3 * st['cols'] and 0.08 < st['joints'] < 0.3, json.dumps(st))
        ck('the picture wraps: no step from its last column and row to the first', st['seamX'] < 1.6 * st['inX'] and st['seamY'] <= st['rowMax'] * 1.05, json.dumps(st))
    else:
        ck('the Markt of Schleusingen is in this build (SAMARKT)', False, 'no SAMARKT.settCanvas')

    # ---- what it may cost ----
    sh = J("__FB.shaders()")
    print('ground shaders (fragment source, characters):', json.dumps(sh), flush=True)
    ck('the ground shaders stay within their length (every line is paid at every pixel without a graphics card)', len(sh) >= 2 and max(sh.values()) < SHADER, f"below {SHADER}: " + json.dumps(sh))
    # (other things compile a program when they first come into view – a bridge's deck, a car –, so only the ground's own are counted:
    # the garden's ground in its variants, the terrain, the bridges' decks, the tiles of the wider world)
    ck('the road is drawn by the ground programs there are (no further one carries the road GLSL)', 2 <= len(sh) <= 5, f"{len(sh)} ground programs; all programs {progs0} → {E('GAME.R.info.programs.length')}")
    ok, r = lib.check_gl(pg, 16)
    ck('every shader program links and stays within 16 textures', ok, json.dumps({k: r[k] for k in ('programs', 'maxFrag', 'maxVert', 'broken')}) + json.dumps(r['bad'])[:300])
ck.errors(errs)
ck.done()
