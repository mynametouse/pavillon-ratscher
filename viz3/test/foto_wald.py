# feat/fotorealismus (foto-wald): the woods' herb layer – plants and blades in the stand's light instead of the open sky's, in patches with
# bare litter between them instead of an even carpet (viz3/src/bewuchs/: the class table's texel 7, bw_halm.js bwLight/bwField, the patches
# of bw_blume.js, the woods' floor of bw_ferne.js; docs/features/foto-wald.md).
#   bash tools/browser_lock.sh python3 viz3/test/run.py --port 9072 --serve foto_wald[:tabelle,klinge,wald,kosten]
# What it guards: the class table and the mix texture carry the wood's light and patches (and open ground stays open); the tiles in the
# forest at the Klinge take its canopy map, those of other woods the class's constant; in the wood no pale carpet (pixels: hardly a bright
# pixel on the floor; here a patch of the herb layer, there bare litter); a wood's floor outside the Klinge and its plants are darker than open
# ground would be; one draw call per ring, the rings' triangles and the programs' textures within their budgets. Pictures in out/foto_wald/.
import sys, os, json, time
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__))); import lib

port = sys.argv[1]
WANT = set((sys.argv[2] if len(sys.argv) > 2 else 'tabelle,klinge,wald,kosten').split(','))
OUT = lib.out('foto_wald')
ck = lib.Checks('foto_wald')
errs = []
HELP = r"""
window.__FW = {
  // one frame, its pixels read in the same task (the drawing buffer is not kept), and the picture
  grab(name) { const R = GAME.R, gl = R.getContext(), w = gl.drawingBufferWidth, h = gl.drawingBufferHeight, px = new Uint8Array(w * h * 4);
    R.shadowMap.needsUpdate = true; GAME.shot(); gl.readPixels(0, 0, w, h, gl.RGBA, gl.UNSIGNED_BYTE, px);
    const f = { w, h, px }; if (name) f.img = document.querySelector('#stage canvas').toDataURL('image/jpeg', 0.9); return f; },
  // of the rows from the bottom up to the share `top` of the height: the mean brightness (0–255), the share of bright pixels (pale
  // plants in a dark wood – before this work a quarter of the floor of the view „klinge“ was brighter than 105, the litter is ~50),
  // the share of green ones (plants on the brown floor – then nearly half of it in every view)
  floor(f, top = 0.4, bright = 105) { let n = 0, s = 0, b = 0, g = 0; const rows = Math.floor(f.h * top);
    for (let y = 0; y < rows; y++) for (let x = 0; x < f.w; x += 2) { const o = (y * f.w + x) * 4, r = f.px[o], gg = f.px[o + 1], bl = f.px[o + 2], l = 0.3 * r + 0.59 * gg + 0.11 * bl;
      n++; s += l; if (l > bright) b++; if (gg > r * 1.1 && gg > bl * 1.15 && l > 22) g++; }
    return { mean: +(s / n).toFixed(1), bright: +(b / n).toFixed(4), green: +(g / n).toFixed(4) }; },
  // texel k of row c of the class table
  row(c, k) { const T = BWHALM.U.tBwK.value.image; return Array.from(T.data.slice((c * T.width + k) * 4, (c * T.width + k) * 4 + 4)).map(v => +v.toFixed(4)); },
  // per ring: its tiles, and how many of them lie in the forest at the Klinge (the flag the shaders read)
  flags() { return BWHALM.rings.map(R => { let n = 0; const a = R.P.iU.array; for (let k = 0; k < R.n; k++) if (a[k * 4 + 3] > 0.5) n++; return [R.tag, R.n, n]; }); },
  // one frame counted: the draw calls and triangles of the vegetation's meshes
  cost() { const R = GAME.R, rbd = R.renderBufferDirect, per = {}; let calls = 0, tris = 0;
    R.renderBufferDirect = function (camera, scene, geometry, material, object, group) {
      if (scene) { const n = geometry.index ? geometry.index.count : geometry.attributes.position.count, t = Math.round((group ? group.count : n) / 3) * (object.isInstancedMesh ? object.count : geometry.isInstancedBufferGeometry ? geometry.instanceCount : 1);
        calls++; tris += t; if (/^bewuchs/.test(object.name || '')) per[object.name] = [(per[object.name] || [0, 0])[0] + 1, (per[object.name] || [0, 0])[1] + t]; }
      return rbd.call(this, camera, scene, geometry, material, object, group); };
    try { GAME.shot(); } finally { R.renderBufferDirect = rbd; }
    return { calls, tris, per }; },
  // the samplers of the vegetation's programs, vertex and fragment stage
  samplers() { const R = GAME.R, gl = R.getContext(), ST = new Set([gl.SAMPLER_2D, gl.SAMPLER_CUBE, gl.SAMPLER_3D, gl.SAMPLER_2D_ARRAY, gl.SAMPLER_2D_SHADOW, gl.SAMPLER_CUBE_SHADOW, gl.SAMPLER_2D_ARRAY_SHADOW]), out = {};
    for (const p of R.info.programs || []) { const m = /bwhalm-\w+|bwblume/.exec(p.cacheKey || ''); if (!m || !p.program) continue;
      const vs = (gl.getShaderSource(p.vertexShader) || '').replace(/\/\/.*$/gm, ''), fs = (gl.getShaderSource(p.fragmentShader) || '').replace(/\/\/.*$/gm, ''); let v = 0, f = 0;
      for (let i = 0; i < gl.getProgramParameter(p.program, gl.ACTIVE_UNIFORMS); i++) { const u = gl.getActiveUniform(p.program, i); if (!u || !ST.has(u.type)) continue;
        const re = new RegExp('\\b' + u.name.replace(/\[.*$/, '') + '\\b'), inV = re.test(vs); if (inV) v += u.size; if (re.test(fs) || !inV) f += u.size; }
      out[m[0]] = [v, f]; }
    return out; },
};
"""
with lib.browser() as b:
    pg = lib.page(b, 960, 540, errs=errs, tier='hoch'); E = pg.evaluate
    J = lambda s: json.loads(E(f"JSON.stringify({s})"))
    # (kaskade=an: the tests' browser has no graphics card – the pictures shall show the far shadows a graphics card shows)
    lib.boot(pg, port, '?bauphase=0&wetter=klar&kaskade=an')
    E(HELP)
    E("GAME.setView3 && GAME.setView3(false)")
    E("document.querySelectorAll('#toast,#hud,#topbar,#minimap,#joy,.hud').forEach(e => e.style.visibility = 'hidden')")
    E("if (window.DN && !DN.active) GAME.setMode('auto'); CLOCK.t = Math.floor(CLOCK.t / 1440) * 1440 + 15.5 * 60; DN.update(true)")
    lib.settle_light(pg)

    def view(x, y, yaw, pitch, fov=62, eye=1.6, n=24):
        E(f"GAME.view({x}, {y}, KERN.ground({x}, {y}) + {eye}, {yaw}, {pitch}, {fov}); 0")
        for i in range(n):
            E("GAME.step(0.25)")
            if i % 8 == 7: time.sleep(0.5)
        time.sleep(1.0); E("GAME.step(0.1)"); lib.settle_light(pg)
        E(f"GAME.view({x}, {y}, KERN.ground({x}, {y}) + {eye}, {yaw}, {pitch}, {fov}); 0")
        E("window.SCHATTEN && SCHATTEN.settle(); 0")

    def grab(name):
        import base64
        d = E(f"(() => {{ const f = __FW.grab(true); window.__f = f; return f.img; }})()")
        open(os.path.join(OUT, name + '.jpg'), 'wb').write(base64.b64decode(d.split(',')[1])); print('shot', name, flush=True)

    try:
        # the species table and the atlas are in (bw_arten.js → the class table, the mixes)
        for i in range(60):
            if J("BEWUCHS.state().blumen.arten"): break
            E("GAME.step(0.1)"); time.sleep(0.25)
        if 'tabelle' in WANT:
            w11, w4, tw = J("__FW.row(11, 7)"), J("__FW.row(4, 7)"), J("BWHALM.U.tBwK.value.image.width")
            ck("the class table carries the wood's light: a wood's floor gets less than 60 % of the sun and little open sky, its herbs stand in patches of 8–20 m",
               tw == 8 and 0.2 < w11[0] < 0.6 and w11[1] < 0.5 and 8 <= w11[2] <= 20 and 0.3 < w11[3] < 0.8, json.dumps({'wood': w11, 'width': tw}))
            ck('open ground stays open (a hay meadow: the whole sun and sky, no patches)', w4 == [1, 1, 0, 0], w4)
            mx = J("(() => { const T = BWBLUME.U.tBwMx.value.image, o = 11 * T.width * 4, p = (11 * T.width + T.width / 2) * 4; return { m0: Array.from(T.data.slice(o, o + 4)), p0: Array.from(T.data.slice(p, p + 4)), carpet: BWBLUME.SP.findIndex(s => s.id === 'heidelbeere'), patch: BWBLUME.PATCH && BWBLUME.PATCH[11], mix: BWBLUME.MIX[11] }; })()")
            ck("the wood's plants stand in patches: denser inside them than the mean, the bilberry first as the carpet, on a part of the area only",
               mx['m0'][2] > 2 and mx['m0'][0] == mx['carpet'] and 0.2 < mx['p0'][1] < 0.5 and bool(mx['patch']) and len(mx['patch']['arten']) >= 3, json.dumps(mx)[:500])
            ck('few ferns: less than one on 4 m² in the mean (before: 1.5 on every m²)', 0.01 <= mx['mix']['farn'] <= 0.25, mx['mix'])
        if 'klinge' in WANT:
            # in the forest at the Klinge, a closed spruce stand (the lead's view „wald_c“)
            view(-440, -650, 350, 2)
            fl = J("__FW.flags()"); print('flags klinge', fl, flush=True)
            ck("in the forest at the Klinge the tiles take its canopy map", all(n > 20 and k >= 0.9 * n for _, n, k in fl), fl)
            grab('klinge'); a = J("__FW.floor(__f)"); print('klinge', a, flush=True)
            ck('no pale carpet in the dark wood: hardly a bright pixel on the floor (before: 27 %)', a['bright'] < 0.03, a)
            ck('here the herb layer stands (a carpet of bilberry, ferns behind it)', a['green'] > 0.03, a)
            # 60 m on (the lead's view „wald_a“): no patch – bare litter
            view(-475, -600, 40, 3, n=16)
            grab('klinge_kahl'); a = J("__FW.floor(__f)"); print('klinge_kahl', a, flush=True)
            ck('and there it does not: bare litter over a wide stretch (before: 39 % of the floor green, 21 % bright)', a['green'] < 0.25 and a['bright'] < 0.03, a)
            view(-460, -610, 130, -32, n=10)
            grab('klinge_boden'); a = J("__FW.floor(__f, 0.9)"); print('klinge_boden', a, flush=True)
            ck('looking down: litter between the plants, nothing glowing (before: 14 % bright)', a['bright'] < 0.03, a)
        if 'wald' in WANT:
            # a wood outside the forest at the Klinge (nothing knows its crowns): the floor and the plants in the class's light
            view(-380, -420, 240, 2, fov=60)
            fl = J("__FW.flags()"); print('flags wald', fl, flush=True)
            ck('outside the Klinge no tile takes the canopy map', all(k <= 0.05 * max(n, 1) for _, n, k in fl), fl)
            grab('wald'); a = J("__FW.floor(__f)")
            # the same frame as open ground: the row's light 1, the floor's share 1
            E("(() => { const T = BWHALM.U.tBwK.value, o = (11 * T.image.width + 7) * 4; window.__k7 = [T.image.data[o], T.image.data[o + 1]]; T.image.data[o] = 1; T.image.data[o + 1] = 1; T.needsUpdate = true; window.__fw = BWFERNE.U.uBwFarW.value.x; BWFERNE.U.uBwFarW.value.x = 1; })()")
            grab('wald_offen'); o = J("__FW.floor(__f)")
            E("(() => { const T = BWHALM.U.tBwK.value, o = (11 * T.image.width + 7) * 4; T.image.data[o] = __k7[0]; T.image.data[o + 1] = __k7[1]; T.needsUpdate = true; BWFERNE.U.uBwFarW.value.x = __fw; GAME.step(0.1); })()")
            print('wald', a, 'open', o, flush=True)
            ck("a wood's floor and its plants lie in the shade: clearly darker than lit as open ground", a['mean'] < 0.85 * o['mean'], {'wood': a, 'open': o})
        if 'kosten' in WANT:
            view(-440, -650, 350, 2, n=8)
            c = J("__FW.cost()"); h = J("BWHALM.stats()"); print('cost', json.dumps(c), json.dumps(h['rings']), flush=True)
            ck('one draw call per ring (three of blades, two of plants)', len(c['per']) == 5 and all(v[0] == 1 for v in c['per'].values()), c['per'])
            ck("the rings' triangles within the tier's budget (≤ 600 000)", h['tris'] <= 600000 and sum(v[1] for v in c['per'].values()) <= 650000, {'blades': h['tris'], 'drawn': sum(v[1] for v in c['per'].values())})
            sm = J("__FW.samplers()")
            ck("the vegetation's programs: at most 6 textures in the vertex shader, 8 in the fragment shader", len(sm) == 4 and all(v <= 6 and f <= 8 for v, f in sm.values()), sm)
        ok, gl = lib.check_gl(pg)
        ck('no program over 16 textures, none broken', ok, json.dumps({k: gl[k] for k in ('programs', 'maxFrag', 'maxVert', 'bad', 'broken')})[:300])
        s = J("BEWUCHS.state().err")
        ck('no error in the template', not s, s)
    except Exception as ex:
        ck('sections ran', False, repr(ex)[:400])
    ck.errors(errs)
ck.done()
