# feat/foto-boeden: the ground one walks and drives on, up close (docs/features/foto-boeden.md) – step 1: asphalt and hard roads.
#   bash tools/browser_lock.sh python3 viz3/test/run.py --port 9074 --serve foto_boeden
# What it guards, from pixels (the look lives in the ground shaders, world/roads.js roadShade): up close the asphalt has a grain
# (the aggregate – it was a soft grey before), which is gone where a pixel is wider than a stone (nothing flickers far away); the wheel
# paths of the Landstraße are lighter than the stripe between them; a village street is paler than the Landstraße (older asphalt);
# and what it may cost: no program over 16 textures, none broken, no new program, the ground shaders' source within its budget.
import sys, os, json, time
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__))); import lib

port = sys.argv[1]
OUT = lib.out('foto_boeden')
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
  // the ground shaders: the length of their fragment source (what a computer without a graphics card pays at every pixel)
  shaders() { const gl = GAME.R.getContext(), o = {}; for (const p of GAME.R.info.programs || []) { const fs = gl.getShaderSource(p.fragmentShader) || '';
      if (/vec3 roadShade\(/.test(fs)) o[(p.cacheKey || p.name || '?').slice(0, 24)] = fs.length; } return o; },
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
    LX, LY, LYAW = 196.0, 55.6, 135.5   # on its centre line, the road runs towards yaw 135.5°
    import math
    ux, uy = math.sin(math.radians(LYAW)), math.cos(math.radians(LYAW))
    s = J(f"KERN.surface({LX}, {LY})")
    ck('the spot on the Landstraße: a main road, asphalt, open country, near its centre line', bool(s) and s['kind'] == 1 and s['surf'] == 0 and s['style'] in (0, 1) and abs(s['lat']) < 0.5, json.dumps(s))
    view(LX, LY, 16, LYAW, -89.5, 62, 24)
    shot('01_landstrasse_oben')
    # lane middle 1.65 m from the centre line, the wheel paths 0.8 m either side of it (0.85 m, 2.45 m)
    a = J(f"__FB.across(__FB.grab(), {LX}, {LY}, {ux}, {uy}, [0.85, 1.65, 2.45])")
    ck('seen from above the wheel paths of the Landstraße are lighter than the stripe between them', a['n'] >= 8 and a['rel'][0] > a['rel'][1] * 1.025 and a['rel'][2] > a['rel'][1] * 1.025, json.dumps(a))
    view(LX + uy * 1.65, LY - ux * 1.65, 1.3, LYAW, -89.5, 62, 6)
    shot('02_landstrasse_nah')
    g_main = J("__FB.grain(__FB.grab())")
    ck('from 1.3 m the asphalt of the Landstraße shows its aggregate (fine contrast)', g_main['rel'] > 0.05, json.dumps(g_main))
    view(LX + uy * 1.65, LY - ux * 1.65, 14, LYAW, -89.5, 30, 4)
    g_far = J("__FB.grain(__FB.grab(), 60)")
    ck('where a pixel is wider than a stone the grain is gone (nothing to flicker far away)', g_far['rel'] < 0.5 * g_main['rel'], f"near {g_main['rel']}, from 14 m {g_far['rel']}")

    # ---- the Anger's street in the village (a street, 5 m, old asphalt) ----
    AX, AY = 242.0, -101.0
    s = J(f"KERN.surface({AX}, {AY})")
    ck('the spot in the village: a street of asphalt, in the village', bool(s) and s['kind'] == 3 and s['surf'] == 0 and s['style'] == 3 and s['e'] > 1, json.dumps(s))
    view(AX, AY, 1.3, 292, -89.5, 62, 12)
    shot('03_dorfstrasse_nah')
    g_dorf = J("__FB.grain(__FB.grab())")
    ck('the village street shows its aggregate too', g_dorf['rel'] > 0.05, json.dumps(g_dorf))
    # (both spots lie in the sun at 15:30; the picture's brightness follows the ground's colour there)
    ck('the old asphalt of the village street is paler than the Landstraße (kept best)', g_dorf['mean'] > g_main['mean'] * 1.04, f"village {g_dorf['mean']} {g_dorf['rgb']}, Landstraße {g_main['mean']} {g_main['rgb']}")
    view(AX, AY, 1.6, 292, -8, 62, 4)
    shot('04_anger')

    # ---- what it may cost ----
    sh = J("__FB.shaders()")
    print('ground shaders (fragment source, characters):', json.dumps(sh), flush=True)
    ck('the ground shaders stay within their length (every line is paid at every pixel without a graphics card)', len(sh) >= 2 and max(sh.values()) < 131000, json.dumps(sh))
    ck('no shader program came with the views (the road is drawn by the ground materials there are)', E("GAME.R.info.programs.length") <= progs0, f"{progs0} → {E('GAME.R.info.programs.length')}")
    ok, r = lib.check_gl(pg, 16)
    ck('every shader program links and stays within 16 textures', ok, json.dumps({k: r[k] for k in ('programs', 'maxFrag', 'maxVert', 'broken')}) + json.dumps(r['bad'])[:300])
ck.errors(errs)
ck.done()
