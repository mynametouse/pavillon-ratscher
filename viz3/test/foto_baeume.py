# feat/fotorealismus (helper foto-baeume): the leaves' light and colour (garden/trees.js LAUB, the far cards in world/ratscher.js, the
# aspen's summer picture in eztree/textures.js).
#   bash tools/browser_lock.sh python3 viz3/test/run.py --port 9075 --serve foto_baeume[:szene,linde,reihen,tal]
# What it guards:
#   szene  – every kind of tree built by buildTreeKind carries the leaves' light and knows how deep each card sits in its crown; the
#            uniforms reach the programs (leaf crowns and far cards); the aspen's leaf picture is green
#   linde  – the lime at the Anger in the afternoon and in the evening sun (15:30, 20:00, 1 June) is a green tree: its leaves' pixels
#            (found by painting its leaf material for one frame) are green-dominant, hardly any is pale (the cream of the mirror lobes)
#            or neon (hardly any blue or red in it); its lit and its shaded leaves lie in the range of a photo of a lime in June; with
#            the mirror lobes back (LAUB.set({ sheen: 1 })) it is paler – so the test notices if three's light changes under the patch
#   reihen – the far rows in June: no orange trees; no two alike – the hues of the trees' pixels spread wider with each tree's own
#            colour than without
#   tal    – the valley from above: no orange trees in June (every fourth leaf tree was), the far cards and the 3D crowns in one tone
import sys, os, json, time, base64
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__))); import lib

port = sys.argv[1]
WANT = set((sys.argv[2] if len(sys.argv) > 2 else 'szene,linde,reihen,tal').split(','))
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
  // the leaf materials in the scene: the crowns built by buildTreeKind (userData.laub) and the far cards (userData.treeCards)
  mats(far = true) { const s = new Set(); GAME.scene.traverse(o => { for (const m of [].concat(o.material || [])) if (m && m.userData && (m.userData.laub || (far && m.userData.treeCards))) s.add(m); }); return [...s]; },
  // the pixels of frame a that show leaves of the materials ms: those that change when the materials are painted magenta for a frame
  leaves(a, ms) { const keep = ms.map(m => m.color.clone()); ms.forEach(m => m.color.setRGB(6, 0, 6)); const b = this.grab(); ms.forEach((m, i) => m.color.copy(keep[i]));
    const out = []; for (let i = 0; i < a.px.length; i += 4) if (Math.abs(a.px[i] - b.px[i]) + Math.abs(a.px[i + 1] - b.px[i + 1]) + Math.abs(a.px[i + 2] - b.px[i + 2]) > 40) out.push(i); return out; },
  // colours of the pixels m of frame f: the mean; the share that is green (green above red and blue), pale (bright and hardly any colour:
  // the cream of a mirror lobe), neon (green with hardly any blue: the pigment alone), orange (red clearly above green, green above
  // blue); the mean of the pixels' darkest fifth to third (shade) and of their brightest (lit, 80th–95th hundredth by brightness); how
  // far the hues spread (standard deviation of (red − blue) / brightness over cells of 6 × 6 pixels – a tree's tone, not a leaf's)
  stat(f, m) { const o = { n: m.length, green: 0, pale: 0, neon: 0, orange: 0 }, s = [0, 0, 0], lum = new Float32Array(m.length), cell = new Map(); let k = 0;
    for (const i of m) { const r = f.px[i], g = f.px[i + 1], b = f.px[i + 2], lu = 0.3 * r + 0.59 * g + 0.11 * b, mx = Math.max(r, g, b), mn = Math.min(r, g, b);
      s[0] += r; s[1] += g; s[2] += b; lum[k++] = lu; if (g > r * 1.02 && g > b * 1.08) o.green++; if (lu > 150 && mx - mn < 0.3 * mx) o.pale++;
      if (g > 45 && b < 0.2 * g) o.neon++; if (r > g * 1.12 && g > b * 1.15 && mx > 70) o.orange++;
      const p = i / 4, ck = Math.floor((p % f.w) / 6) + 4096 * Math.floor(Math.floor(p / f.w) / 6); let c = cell.get(ck); if (!c) cell.set(ck, (c = [0, 0, 0, 0])); c[0] += r; c[1] += g; c[2] += b; c[3]++; }
    const n = Math.max(1, m.length); o.mean = s.map(v => Math.round(v / n)); for (const q of ['green', 'pale', 'neon', 'orange']) o[q] = +(o[q] / n).toFixed(4);
    const srt = Float32Array.from(lum).sort(), band = (a, b) => { const lo = srt[Math.floor(a * (n - 1))], hi = srt[Math.floor(b * (n - 1))], t = [0, 0, 0]; let c = 0, j = 0;
      for (const i of m) { const lu = lum[j++]; if (lu >= lo && lu <= hi) { t[0] += f.px[i]; t[1] += f.px[i + 1]; t[2] += f.px[i + 2]; c++; } } return t.map(v => Math.round(v / Math.max(1, c))); };
    o.shade = band(0.2, 0.35); o.lit = band(0.8, 0.95); let q = 0, q2 = 0, qn = 0;
    for (const c of cell.values()) { if (c[3] < 18) continue; const lu = (0.3 * c[0] + 0.59 * c[1] + 0.11 * c[2]) / c[3]; if (lu < 25) continue; const h = (c[0] - c[2]) / c[3] / lu; q += h; q2 += h * h; qn++; }
    o.hue = qn ? +Math.sqrt(Math.max(0, q2 / qn - (q / qn) ** 2)).toFixed(4) : 0; o.cells = qn; return o; },
  uni() { const R = GAME.R, gl = R.getContext(), o = { leaf: 0, leafOk: 0, far: 0, farOk: 0 };
    for (const p of R.info.programs || []) { if (!p.program) continue;
      const a = gl.getUniformLocation(p.program, 'lfK'), t = gl.getUniformLocation(p.program, 'lfM'), c = gl.getUniformLocation(p.program, 'lfC');
      if (!a) continue; const v = gl.getUniform(p.program, a), ok = Math.abs(v[0] - LAUB.U.lfK.value.x) < 1e-4 && Math.abs(v[3] - LAUB.U.lfK.value.w) < 1e-4 && (!c || Math.abs(gl.getUniform(p.program, c)[0] - LAUB.U.lfC.value.x) < 1e-4);
      if (t) { o.leaf++; if (ok) o.leafOk++; } else { o.far++; if (ok) o.farOk++; } }
    return o; },
  // the mean colour of a leaf picture as the GPU gets it (where it is not transparent)
  pic(tex) { const im = tex && tex.image; if (!im || !im.width) return null; const c = document.createElement('canvas'); c.width = c.height = 64; const g = c.getContext('2d', { willReadFrequently: true }); g.drawImage(im, 0, 0, 64, 64);
    const d = g.getImageData(0, 0, 64, 64).data, s = [0, 0, 0]; let n = 0; for (let i = 0; i < d.length; i += 4) if (d[i + 3] > 128) { s[0] += d[i]; s[1] += d[i + 1]; s[2] += d[i + 2]; n++; } return s.map(v => Math.round(v / Math.max(1, n))); },
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
def clock(pg, hour):
    pg.evaluate(f"if (window.DN && !DN.active) GAME.setMode('auto'); CLOCK.t = Math.floor(CLOCK.t / 1440) * 1440 + {hour * 60}; DN.update(true); 0")
    lib.settle_light(pg)
# what a photo of a lime in June shows (the lead's reference, 18.11.2026): lit leaves about sRGB (95–125, 125–150, 55–75), shaded
# ones about (35–55, 55–70, 30–40) – checked with room around it (the bands here are means over a fifth of the crown's pixels)
def natural(s):
    l, d = s['lit'], s['shade']
    return (75 <= l[0] <= 150 and 100 <= l[1] <= 170 and 35 <= l[2] <= 100 and l[1] > l[0] > l[2]
            and 10 <= d[0] <= 75 and 22 <= d[1] <= 95 and 4 <= d[2] <= 60 and d[1] > d[0])

with lib.browser() as b:
    pg = lib.page(b, 960, 540, errs=errs, tier='hoch'); E = pg.evaluate
    J = lambda s: json.loads(E(f"JSON.stringify({s})"))
    lib.boot(pg, port, '?bauphase=0&wetter=klar&kaskade=an')
    E(HELP)
    E("GAME.setView3 && GAME.setView3(false)")
    E("document.querySelectorAll('#toast,#hud,#topbar,#minimap,#joy,.hud').forEach(e => e.style.visibility = 'hidden')")
    print('laub', J("LAUB.state()"), flush=True)

    if 'szene' in WANT:
        clock(pg, 15.5); go(pg, 4, 23, 1.6, 186, 6, 62)
        kinds = J("""Object.fromEntries(Object.entries(TREES).map(([k, K]) => { const a = K.lg.getAttribute('aLfIn'); let s = 0, n = 0, lo = 255, hi = 0;
          if (a) for (let i = 0; i < a.count; i += 5) { const v = a.array[i]; s += v; n++; if (v < lo) lo = v; if (v > hi) hi = v; }
          return [k, { laub: !!K.leaf.userData.laub, n: a ? a.count : 0, pos: K.lg.attributes.position.count, mean: n ? +(s / n / 255).toFixed(3) : -1, lo, hi,
            far: [K.lgFar, K.lgFar2].filter(g => g && !g.getAttribute('aLfIn')).length }]; }))""")
        bad = [k for k, v in kinds.items() if not (v['laub'] and v['n'] == v['pos'] and 0.25 < v['mean'] < 0.7 and v['lo'] < 30 and v['hi'] > 190 and v['far'] == 0)]
        ck("every kind of tree: the leaves' light, and each card corner knows its depth in the crown (open at the hull, deep in the core)",
           len(kinds) >= 8 and not bad, f"{len(kinds)} kinds, mean depth {min(v['mean'] for v in kinds.values())}–{max(v['mean'] for v in kinds.values())}, bad {bad}")
        E("__FB.grab(); 0")
        u = J("__FB.uni()")
        ck("the leaves' uniforms reach their programs (leaf crowns and far cards)", u['leaf'] >= 1 and u['leaf'] == u['leafOk'] and u['far'] >= 1 and u['far'] == u['farOk'], str(u))
        pic = J("({ aspen: __FB.pic(TREES.aspen.leaf.map), bush: __FB.pic(TREES.bushB.leaf.map), oak: __FB.pic(TREES.oakA.leaf.map) })")
        ck("the aspen's leaf picture is a summer one: green as the oak's, not October's gold",
           all(pic[k] and pic[k][1] > pic[k][0] * 1.15 and pic[k][1] > pic[k][2] * 1.3 for k in pic), str(pic))
        st = J("LAUB.state()")
        ck("the crowns' depth costs little to bake", st['crowns'] >= 8 and st['ms'] < 1500, f"{st['crowns']} crowns in {st['ms']} ms")

    if 'linde' in WANT:
        has = E("!!(window.VPROPS && VPROPS.lindeMeshes && VPROPS.lindeMeshes.length)")
        ck('the lime at the Anger is there', has)
        for hour, name, v in ((15.5, 'linde_1530', (240, -112, 1.6, 250, 0, 62)), (20, 'linde_20', (240, -112, 1.6, 250, 0, 62))) if has else ():
            clock(pg, hour); go(pg, *v)
            E(f"""(() => {{ const F = __FB, ms = [VPROPS.lindeMeshes[1].material]; F.a = F.grab('{name}'); F.m = F.leaves(F.a, ms);
              LAUB.set({{ sheen: 1 }}); F.off = F.grab('{name}_spiegel'); LAUB.set({{ on: true }}); }})(); 0""")
            s, so = J("__FB.stat(__FB.a, __FB.m)"), J("__FB.stat(__FB.off, __FB.m)")
            print(name, s, '| with the mirror lobes', so, flush=True)
            ck(f'{name}: the crown fills a good part of the picture', s['n'] > 0.08 * 960 * 540, f"{s['n']} pixels")
            if hour < 18:
                ck(f'{name}: the lime is green – most of its pixels green-dominant, hardly any pale or neon',
                   s['green'] > 0.8 and s['pale'] < 0.03 and s['neon'] < 0.15, f"green {s['green']}, pale {s['pale']}, neon {s['neon']}, mean {s['mean']}")
                ck(f'{name}: lit and shaded leaves as in a photo of a lime in June', natural(s), f"lit {s['lit']}, shade {s['shade']}")
            else:
                ck(f'{name}: no cream in the low sun – green in the shade, its brightest leaves keep their colour',
                   s['green'] > 0.55 and s['pale'] < 0.03 and s['lit'][1] >= s['lit'][0] * 0.9 and s['lit'][2] < 0.72 * s['lit'][1] and s['shade'][1] > s['shade'][0],
                   f"green {s['green']}, pale {s['pale']}, lit {s['lit']}, shade {s['shade']}")
            lum = lambda c: 0.3 * c[0] + 0.59 * c[1] + 0.11 * c[2]
            ck(f'{name}: with the mirror lobes of sky and sun back (LAUB.set sheen 1) the crown is paler – the patch is what keeps it green',
               so['mean'][2] > s['mean'][2] + 8 and lum(so['mean']) > lum(s['mean']) + 4, f"mean {so['mean']} vs {s['mean']}, pale {so['pale']} vs {s['pale']}, lit {so['lit']} vs {s['lit']}")

    if 'reihen' in WANT:
        clock(pg, 15.5); go(pg, -520, -480, 1.6, 40, 2, 62, 32)
        E("""(() => { const F = __FB; F.a = F.grab('reihen_1530'); F.m = F.leaves(F.a, F.mats()); LAUB.set({ vary: 0 }); F.b = F.grab('reihen_1530_gleich'); LAUB.set({ vary: 1 }); })(); 0""")
        s, s0 = J("__FB.stat(__FB.a, __FB.m)"), J("__FB.stat(__FB.b, __FB.m)")
        print('reihen', s, "| without the trees' own colours", s0, flush=True)
        ck('the far rows: trees in the picture', s['n'] > 4000 and s['cells'] > 60, f"{s['n']} pixels, {s['cells']} cells")
        ck("no two alike: the trees' hues spread wider with each tree's own colour", s['hue'] > s0['hue'] * 1.15, f"spread {s['hue']} vs {s0['hue']}")
        ck('June: no orange trees in the far rows', s['orange'] < 0.01, f"orange {s['orange']}")

    if 'tal' in WANT:
        clock(pg, 15.5); go(pg, 20, 60, 60, 150, -12, 55, 16)
        E("""(() => { const F = __FB; F.a = F.grab('tal_1530'); F.m = F.leaves(F.a, F.mats()); F.mf = F.leaves(F.a, F.mats().filter(m => m.userData.treeCards)); })(); 0""")
        s, sf = J("__FB.stat(__FB.a, __FB.m)"), J("__FB.stat(__FB.a, __FB.mf)")
        near = J("(() => { const far = new Set(__FB.mf), m = __FB.m.filter(i => !far.has(i)); return __FB.stat(__FB.a, m); })()")
        print('tal', s, '| far cards', sf, '| 3D crowns', near, flush=True)
        ck('the valley: trees in the picture, far cards and 3D crowns', sf['n'] > 3000 and near['n'] > 1500, f"{sf['n']} / {near['n']} pixels")
        ck('June: no orange trees in the valley (every fourth leaf tree was)', s['orange'] < 0.01 and s['green'] > 0.75, f"orange {s['orange']}, green {s['green']}")
        rg = lambda c: c[0] / max(1, c[1])
        lum = lambda c: 0.3 * c[0] + 0.59 * c[1] + 0.11 * c[2]
        ck('far cards and 3D crowns in one tone (red to green alike, neither half as bright as the other)',
           abs(rg(sf['mean']) - rg(near['mean'])) < 0.2 and 0.5 < lum(sf['mean']) / max(1, lum(near['mean'])) < 2, f"far {sf['mean']}, 3D {near['mean']}")

    for k, d in (J("__FB.img || {}")).items():
        open(os.path.join(OUT, k + '.jpg'), 'wb').write(base64.b64decode(d.split(',')[1]))
    ok, gl = lib.check_gl(pg)
    ck('at most 16 textures per shader program, none broken', ok, f"{gl['programs']} programs, max {gl['maxFrag']} fragment / {gl['maxVert']} vertex samplers, bad {[p['name'] for p in gl['bad']]}, broken {gl['broken']}")
    ck.errors(errs)
ck.done()
