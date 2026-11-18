# feat/fotorealismus (foto-gebaeude): the walls of the world look built and lived in – the weathering the facade shader of
# world/village.js gets from gebaeude/geb_foto.js (the house's own tone, soft patches, a plinth, splash and soil at the foot, runs, grain).
#   bash tools/browser_lock.sh python3 viz3/test/run.py --port 9073 --serve foto_gebaeude
# What it guards: the one wall material still draws village, square and town (so the weathering reaches them all); its program holds the
# new uniforms and stays within 16 textures; a plaster wall at two metres is no longer one flat colour, its foot is darker than the wall
# and has changed; houses in one street differ in tone (not the paint chart's ten colours); the sky and the costs of a picture (draw
# calls, triangles) are exactly as without it; GEBFOTO.set(0) gives the walls as they were.
import sys, os, json, math, time
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__))); import lib

port = sys.argv[1]
OUT = lib.out('foto_gebaeude')
ck = lib.Checks('foto_gebaeude')
errs = []
HELP = r"""
window.__FG = {
  // one frame, its pixels read in the same task (the drawing buffer is not kept); rows from the bottom
  // (draw calls and triangles of the main pass counted as viz3/test/fotoref.py does)
  grab() { const R = GAME.R, gl = R.getContext(), w = gl.drawingBufferWidth, h = gl.drawingBufferHeight, px = new Uint8Array(w * h * 4), I = [0, 0], rbd = R.renderBufferDirect;
    R.renderBufferDirect = function (camera, scene, geometry, material, object, group) { const n = geometry.index ? geometry.index.count : geometry.attributes.position ? geometry.attributes.position.count : 0;
      if (scene) { I[0]++; I[1] += Math.round((group ? group.count : n) / 3) * (object.isInstancedMesh ? object.count : 1); } return rbd.call(this, camera, scene, geometry, material, object, group); };
    try { R.shadowMap.needsUpdate = true; GAME.shot(); } finally { R.renderBufferDirect = rbd; }
    gl.readPixels(0, 0, w, h, gl.RGBA, gl.UNSIGNED_BYTE, px); return { w, h, px, calls: I[0], tris: I[1] }; },
  // the pixel of a model point (x east, y north, z up), or null when it is not in the picture
  pix(f, x, y, z) { const v = GAME.cam.position.clone().set(x, z, -y).project(GAME.cam); if (v.z > 1 || Math.abs(v.x) > 0.98 || Math.abs(v.y) > 0.98) return null;
    return [Math.round((v.x * 0.5 + 0.5) * f.w), Math.round((v.y * 0.5 + 0.5) * f.h)]; },
  // luminance of the pixels of a patch on a facade: from u0 to u1 along it (metres from its start), h0 to h1 above the building's foot
  patch(f, F, u0, u1, h0, h1, n = 14, base = F.foot) { const L = []; for (let i = 0; i <= n; i++) for (let j = 0; j <= n; j++) { const u = u0 + (u1 - u0) * i / n, h = h0 + (h1 - h0) * j / n,
      p = this.pix(f, F.ax + F.dx * u, F.ay + F.dy * u, base + h); if (!p) continue; const o = (p[1] * f.w + p[0]) * 4; L.push(0.3 * f.px[o] + 0.59 * f.px[o + 1] + 0.11 * f.px[o + 2]); }
    if (L.length < 20) return null; const m = L.reduce((s, q) => s + q, 0) / L.length; return { n: L.length, mean: +m.toFixed(2), sd: +Math.sqrt(L.reduce((s, q) => s + (q - m) * (q - m), 0) / L.length).toFixed(2), L }; },
  // a facade of a village building as plain numbers; the plain wall between two bays of windows (the shader's rule: bays evenly along the facade, a window in the middle of each)
  fac(b, f) { const sp = b.st.sp, nb = Math.max(1, Math.floor((f.L - 0.6) / sp)), bw = f.L / nb; return { id: b.id, st: b.st.style, ax: f.ax, ay: f.ay, dx: f.dx, dy: f.dy, nx: f.nx, ny: f.ny, L: f.L, foot: b.foot, eave: b.eave, nb, bw,
      door: f.door ? f.door.u : -9, kind: f.kind, raised: !!b.st.raised }; },
  // a dwelling in plaster near the Anger with a long free facade
  wall() { let best = null; for (const b of VILLAGE.bld) { if (b.typ !== 0 || !(b.st.style === 0 || b.st.style === 1)) continue; const d = Math.hypot(b.cx - 245, b.cy + 130); if (d > 140) continue;
      for (const f of b.fac) { if (f.L < 7 || f.kind === 'slope') continue; const mx = (f.ax + f.bx) / 2, my = (f.ay + f.by) / 2; let free = true;
        for (const o of VILLAGE.bld) if (o !== b && Math.hypot(o.cx - (mx + f.nx * 4), o.cy - (my + f.ny * 4)) < 9) free = false;
        if (!free) continue; const sc = d - f.L * 2 + (f.door ? -10 : 0); if (!best || sc < best.sc) best = Object.assign(this.fac(b, f), { sc }); } }
    return best; },
  // facades of dwellings that face the camera within r metres, one per building (the longest in view)
  street(r) { const c = GAME.cam.position, out = []; for (const b of VILLAGE.bld) { if (b.typ !== 0) continue; let best = null;
      for (const f of b.fac) { if (f.L < 5) continue; const mx = (f.ax + f.bx) / 2, my = (f.ay + f.by) / 2, vx = c.x - mx, vy = -c.z - my, d = Math.hypot(vx, vy); if (d > r || d < 6) continue;
        if ((vx * f.nx + vy * f.ny) / d < 0.35) continue; if (!best || f.L > best.L) best = this.fac(b, f); }
      if (best) out.push(best); } return out; },
  // the wall programs: the weathering's uniforms and the textures of each
  prog() { const R = GAME.R, gl = R.getContext(), o = []; for (const p of R.info.programs || []) { if (!p.program || !/v16e-wall/.test(p.cacheKey)) continue; const names = []; let s = 0;
      for (let i = 0; i < gl.getProgramParameter(p.program, gl.ACTIVE_UNIFORMS); i++) { const u = gl.getActiveUniform(p.program, i); if (!u) continue; const n = u.name.replace(/\[.*$/, '');
        if (u.type === gl.SAMPLER_2D || u.type === gl.SAMPLER_CUBE || u.type === gl.SAMPLER_2D_SHADOW || u.type === gl.SAMPLER_3D || u.type === gl.SAMPLER_2D_ARRAY) { s += u.size; names.push(n); } else if (n === 'uFoto') names.push(n); }
      o.push({ s, foto: names.includes('uFoto'), noise: names.includes('tFgN'), grain: names.includes('tPlasN') }); } return o; },
};
"""
with lib.browser() as b:
    pg = lib.page(b, 960, 540, errs=errs, tier='hoch'); E = pg.evaluate
    J = lambda s: json.loads(E(f"JSON.stringify({s})"))
    lib.boot(pg, port, '?bauphase=0&wetter=klar&kaskade=an')
    E(HELP)
    E("GAME.setView3 && GAME.setView3(false)")
    E("document.querySelectorAll('#toast,#hud,#topbar,#minimap,#joy,.hud').forEach(e => e.style.visibility = 'hidden')")
    E("if (window.DN && !DN.active) GAME.setMode('auto'); CLOCK.t = Math.floor(CLOCK.t / 1440) * 1440 + 15.5 * 60; DN.update(true)")
    lib.settle_light(pg)

    def view(x, y, yaw, pitch, fov=62, steps=16):
        E(f"GAME.view({x}, {y}, KERN.ground({x}, {y}) + 1.6, {yaw}, {pitch}, {fov}); 0")
        for i in range(steps):
            E("GAME.step(0.25)")
        time.sleep(1.0)
        E(f"GAME.step(0.1); GAME.view({x}, {y}, KERN.ground({x}, {y}) + 1.6, {yaw}, {pitch}, {fov}); SCHATTEN.settle(); 0")

    def pair(name):
        """the same picture without and with the weathering: kept on the page as __a (without) and __b (with)"""
        E("GEBFOTO.set(0); window.__a = __FG.grab(); 0"); lib.shot(pg, OUT, name + '_vorher')
        E("GEBFOTO.set(1); window.__b = __FG.grab(); 0"); lib.shot(pg, OUT, name + '_nachher')
        return J("({ a: [__a.calls, __a.tris], b: [__b.calls, __b.tris] })")

    # ---- the mechanism: one material for village, square and town; the module is on ----
    st = J("""({ foto: GEBFOTO.state(), village: VILLAGE.ready, n: VILLAGE.bld.length, geb: GEB.ready, gebWalls: GEB.meshes.filter(m => /walls/.test(m.name)).length,
      gebSame: GEB.meshes.filter(m => /walls/.test(m.name)).every(m => m.material === RATSCHER.bld[0].material), key: RATSCHER.bld[0].material.customProgramCacheKey() })""")
    print('state', st, flush=True)
    ck('the weathering is on, its noise made, the plaster grain loaded', st['foto']['on'] and st['foto']['k'] == 1 and st['foto']['noise'] == 256 and st['foto']['grain'], str(st['foto']))
    ck("the buildings of the square are drawn by the village's wall material (one shader for them all)", st['village'] and st['geb'] and st['gebWalls'] > 0 and st['gebSame'] and st['key'] == 'v16e-wall', str(st))

    # ---- a plaster wall at two metres ----
    w = J("__FG.wall()")
    print('wall', w, flush=True)
    if ck('a dwelling in plaster with a free facade near the Anger', bool(w), str(w)):
        yaw = math.degrees(math.atan2(-w['nx'], -w['ny']))
        um = w['L'] / 2 + 1.2
        view(w['ax'] + w['dx'] * um + w['nx'] * 2.2, w['ay'] + w['dy'] * um + w['ny'] * 2.2, yaw, -6)
        c = pair('wand')
        ck('a picture costs the same with and without (draw calls, triangles)', c['a'] == c['b'], str(c))
        # the plain wall between two bays nearest the camera, above the plinth and below the sills' height it is free of openings
        kb = max(1, min(w['nb'] - 1, round(um / w['bw']))) if w['nb'] > 1 else 0
        ub = kb * w['bw'] if w['nb'] > 1 else um
        if abs(ub - w['door']) < 1.2: ub += w['bw'] if ub + w['bw'] < w['L'] - 0.5 else -w['bw']
        F = json.dumps(w)
        # (the foot: the strip of wall just above the ground as drawn there – on a slope the building's own foot lies under it)
        r = J(f"""(() => {{ const F = {F}, g = Math.max(F.foot, KERN.ground(F.ax + F.dx * {ub} + F.nx * 0.15, F.ay + F.dy * {ub} + F.ny * 0.15)),
            P = (f, h0, h1, du = 0.32, base = F.foot) => {{ const p = __FG.patch(f, F, {ub} - du, {ub} + du, h0, h1, 14, base); if (p) delete p.L; return p; }};
          return {{ ground: +(g - F.foot).toFixed(2), wallA: P(__a, 0.95, 2.1), wallB: P(__b, 0.95, 2.1), footA: P(__a, 0.04, 0.2, 0.9, g), footB: P(__b, 0.04, 0.2, 0.9, g), midB: P(__b, 1.0, 1.6, 0.9) }}; }})()""")
        print('patches', r, flush=True)
        ok = all(r.get(k) for k in ('wallA', 'wallB', 'footA', 'footB', 'midB'))
        if ck('wall and foot of the facade are in the picture', ok, str({k: bool(v) for k, v in r.items() if k != 'ground'})):
            ck('the wall is not one flat colour: its lightness varies more than before (patches, mottling, grain)',
               r['wallB']['sd'] >= 1.6 and r['wallB']['sd'] >= 1.4 * r['wallA']['sd'], f"sd {r['wallA']['sd']} -> {r['wallB']['sd']} (of 255)")
            ck('the foot of the wall is darker than the wall above it (plinth, splash, soil)', r['footB']['mean'] < 0.85 * r['midB']['mean'], f"foot {r['footB']['mean']}, wall {r['midB']['mean']}")
            ck('the foot varies along the wall (the splash reaches differently high, the plinth is mottled)', r['footB']['sd'] >= 1.3 * max(r['footA']['sd'], 1.0), f"sd {r['footA']['sd']} -> {r['footB']['sd']}")
        # the sky: untouched
        sky = J("""(() => { let d = 0, n = 0; const f = __a, g = __b; for (let y = Math.floor(f.h * 0.9); y < f.h; y += 3) for (let x = 0; x < f.w; x += 5) { const o = (y * f.w + x) * 4;
          d = Math.max(d, Math.abs(f.px[o] - g.px[o]), Math.abs(f.px[o + 1] - g.px[o + 1]), Math.abs(f.px[o + 2] - g.px[o + 2])); n++; } return { d, n }; })()""")
        print('top rows', sky, flush=True)

    # ---- a street: every house its own tone ----
    view(250, -118, 200, 6, 55)
    c = pair('strasse')
    ck('the street view costs the same with and without (draw calls, triangles)', c['a'] == c['b'], str(c))
    hs = J("""(() => { const out = []; for (const F of __FG.street(70)) { const u = F.nb > 1 ? Math.round(F.nb / 2) * F.bw : F.L / 2, h0 = F.raised ? 0.9 : 0.7;
        const a = __FG.patch(__a, F, u - 0.3, u + 0.3, h0, h0 + 0.5, 8), b = __FG.patch(__b, F, u - 0.3, u + 0.3, h0, h0 + 0.5, 8); if (!a || !b || a.mean < 30) continue;
        let ch = 0; for (let i = 0; i < a.L.length; i++) if (Math.abs(a.L[i] - b.L[i]) > 1.5) ch++;
        out.push({ id: F.id, st: F.st, a: a.mean, b: b.mean, q: +(b.mean / a.mean).toFixed(3), ch: +(ch / a.L.length).toFixed(2) }); } return out; })()""")
    seen = [h for h in hs if h['ch'] > 0.5]      # patches the picture really shows as wall (not behind a hedge or a tree: there nothing changes)
    print('street', hs, flush=True)
    qs = sorted(h['q'] for h in seen)
    ck('houses in one street differ in tone: the weathering moves their lightness apart', len(seen) >= 3 and qs[-1] - qs[0] >= 0.04,
       f"{len(seen)} houses, lightness with/without {qs[0] if qs else '-'} … {qs[-1] if qs else '-'}")
    sky = J("""(() => { let d = 0, n = 0, ch = 0, all = 0; const f = __a, g = __b; for (let y = 0; y < f.h; y += 2) for (let x = 0; x < f.w; x += 2) { const o = (y * f.w + x) * 4;
        const e = Math.max(Math.abs(f.px[o] - g.px[o]), Math.abs(f.px[o + 1] - g.px[o + 1]), Math.abs(f.px[o + 2] - g.px[o + 2])); all++; if (e > 2) ch++;
        if (y > f.h * 0.93) { d = Math.max(d, e); n++; } } return { d, n, share: +(ch / all).toFixed(3) }; })()""")
    print('picture', sky, flush=True)
    ck('the sky above the roofs is exactly as before (only walls change)', sky['n'] > 100 and sky['d'] <= 2, str(sky))
    ck('the walls of the street changed, the rest of the picture did not', 0.03 <= sky['share'] <= 0.7, f"{sky['share']} of the picture")

    # ---- off is off: twice without gives the same picture; the programs ----
    same = J("""(() => { GEBFOTO.set(0); const f = __FG.grab(), g = __a; let d = 0; for (let i = 0; i < f.px.length; i += 16) d = Math.max(d, Math.abs(f.px[i] - g.px[i])); GEBFOTO.set(1); GAME.shot(); return d; })()""")
    ck('GEBFOTO.set(0) gives the walls as they were, set(1) the weathering again', same <= 2 and J("GEBFOTO.state().k") == 1, f'largest difference {same}')
    pr = J("__FG.prog()")
    print('wall programs', pr, flush=True)
    ck("the wall programs hold the weathering's uniforms and at most 16 textures", len(pr) >= 1 and all(p['foto'] and p['noise'] and p['grain'] and p['s'] <= 16 for p in pr), str(pr))
    ok, r = lib.check_gl(pg)
    ck('no shader program over 16 textures, none broken', ok, str({k: r[k] for k in ('programs', 'maxFrag', 'maxVert', 'bad', 'broken')}))
    ck.errors(errs)
ck.done()
