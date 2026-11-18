# feat/bewuchs: the vegetation template (viz3/src/bewuchs/) – lawn and grass in 3D around the camera, the garden's mowing, the year, the budget.
#   bash tools/browser_lock.sh python3 viz3/test/run.py --port 8965 --serve bewuchs[:rasen,maehen,wiese,ferne,jahr,leistung]
# Pictures in out/bewuchs/.
import sys, os, time, json, math
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import lib

port = sys.argv[1]
WANT = set((sys.argv[2] if len(sys.argv) > 2 else 'rasen,maehen,wiese,ferne,jahr,strauch,beet,acker,leistung').split(','))
OUT = lib.out('bewuchs')
ck = lib.Checks('bewuchs')

with lib.browser() as b:
    errs = []
    pg = lib.page(b, 1100, 680, errs, tier='hoch')
    lib.boot(pg, port)
    E = pg.evaluate
    J = lambda js: json.loads(pg.evaluate('JSON.stringify(' + js + ')'))
    st = lambda: J("BEWUCHS.state()")

    def view(x, y, yaw, pitch=-12, h=1.65, fov=60, n=8):
        E(f"(() => {{ window.CAM3 && (CAM3.want = false); GAME.view({x}, {y}, KERN.ground({x}, {y}) + {h}, {yaw}, {pitch}, {fov}); }})()")
        for i in range(n):
            E("GAME.step(0.1)")

    def ready(tries=90):
        for i in range(tries):
            s = st()
            if s['karte']['site'] >= 1 and s['karte']['index'] in ('ok', 'none') and s['karte']['guide'][0] == s['karte']['guide'][0]:
                return s
            E("GAME.step(0.2)")
            time.sleep(0.3)
        return st()

    s0 = ready()
    # the helper's species and atlas (bw_arten.js, dist/bewuchs/blumen.png) replace the stand-ins once the picture is loaded
    for i in range(60):
        if J("BEWUCHS.state().blumen.arten"):
            break
        E("GAME.step(0.1)")
        time.sleep(0.25)
    print('state', json.dumps(s0)[:900], flush=True)
    ck('the species table and the flower atlas are loaded', J("BEWUCHS.state().blumen.arten") and not J("BEWUCHS.state().blumen.standin") and J("BEWUCHS.state().arten") >= 18, J("({ a: BEWUCHS.state().arten, s: BEWUCHS.state().blumen.standin, e: BWBLUME.err })"))
    nidx = J("BWKARTE.index && BWKARTE.index.cells ? Object.keys(BWKARTE.index.cells).length : 0")
    ck('the maps of the whole world are indexed (the square, the corridors, Schleusingen, Veßra, the world tiles)', nidx >= 800, nidx)
    ck('the template runs (rings built, site texture made)', s0['on'] and len(s0['halm']['rings']) == 3 and s0['karte']['site'] >= 1, json.dumps(s0)[:400])
    top = J("""(() => { const R = GAME.R, gl = R.getContext(), ST = new Set([gl.SAMPLER_2D, gl.SAMPLER_CUBE, gl.SAMPLER_3D, gl.SAMPLER_2D_ARRAY, gl.SAMPLER_2D_SHADOW, gl.SAMPLER_CUBE_SHADOW, gl.SAMPLER_2D_ARRAY_SHADOW]), out = [];
      for (const p of R.info.programs || []) { const prog = p.program; if (!prog) continue; let n = 0;
        for (let i = 0; i < gl.getProgramParameter(prog, gl.ACTIVE_UNIFORMS); i++) { const u = gl.getActiveUniform(prog, i); if (u && ST.has(u.type)) n += u.size; }
        out.push([n, p.name, String(p.cacheKey || '').slice(0, 60)]); }
      return out.sort((a, b) => b[0] - a[0]).slice(0, 8); })()""")
    print('samplers (most, vertex and fragment together)', json.dumps(top), flush=True)
    ok, rep = lib.check_gl(pg)
    ck('every program within 16 textures per stage, none broken', ok, json.dumps({k: rep[k] for k in ('programs', 'maxFrag', 'maxVert', 'bad', 'broken')})[:400])
    try:
        if 'rasen' in WANT:
            # the garden in May at noon, from the north-east towards the pavilion
            E("BEWUCHS.set({ doy: 140 })")
            E("CLOCK.t = Math.floor(CLOCK.t / 1440) * 1440 + 12 * 60; CLOCK.focus && CLOCK.focus('test')")
            lib.settle_light(pg)
            view(14, 16, math.degrees(math.atan2(2 - 14, 2 - 16)), -14)
            s = st()
            print('garden', json.dumps(s['halm']), flush=True)
            R = {r['tag']: r for r in s['halm']['rings']}
            ck('in the garden the dense and the near ring have tiles and blades', R['dicht']['tiles'] > 15 and R['nah']['tiles'] > 60 and s['halm']['blades'] > 20000, json.dumps(R))
            ck('the budget of this tier holds (≤ 600 000 triangles)', s['halm']['tris'] <= 600000, s['halm']['tris'])
            bl = J("BEWUCHS.state().blumen")
            # daisies flower in May in all four groups of plants (earlier … later), dandelions too or are seed heads
            ck('the lawn flowers in May (daisies, dandelions)', sum(1 for c, sh in bl['species']['gaensebluemchen'] if c >= 0 and sh > 0.5) >= 3 and sum(1 for c, sh in bl['species']['loewenzahn'] if c >= 0) >= 3, json.dumps({k: bl['species'][k] for k in ('gaensebluemchen', 'loewenzahn', 'weissklee')}))
            lib.shot(pg, OUT, 'garten_mai')
            view(14, 16, math.degrees(math.atan2(2 - 14, 2 - 16)), -38, h=1.65, fov=45)
            lib.shot(pg, OUT, 'garten_mai_nah')
            # the old lawn clumps are not drawn (one empty mesh for the time journey)
            g = J("{ n: GRASS.meshes.length, drawn: GRASS.meshes.filter(m => m.count > 0 && m.visible).length, bw: GRASS.bw }")
            ck('the old lawn clumps are not drawn', g['bw'] and g['drawn'] == 0, g)
        if 'wiese' in WANT:
            # a hay meadow east of the garden (class 4 in the area maps), June before the cut
            E("BEWUCHS.set({ doy: 156 })")
            view(112, -22, 150, -10)
            s = st()
            print('meadow', json.dumps(s['halm']), flush=True)
            R = {r['tag']: r for r in s['halm']['rings']}
            ck('beyond the garden: blades in all rings', R['nah']['blades'] > 2000 and R['mittel']['tiles'] > 30, json.dumps(s['halm']))
            lib.shot(pg, OUT, 'wiese_juni')
            bl = J("BEWUCHS.state().blumen")
            print('flowers', json.dumps(bl), flush=True)
            bloom = lambda sp: sum(1 for c, sh in bl['species'][sp] if c >= 0 and sh > 0.5)
            ck('flowers out in June (margerites, buttercups …)', bloom('margerite') >= 3 and bloom('hahnenfuss') >= 3 and bl['rings'][0]['slots'] > 500, json.dumps({k: bl['species'][k] for k in ('margerite', 'hahnenfuss', 'rotklee')}))
            view(112, -22, 150, -30, fov=45)
            lib.shot(pg, OUT, 'wiese_juni_nah')
        if 'ferne' in WANT:
            # flowering meadows far away: the colour speckles in the ground (bw_ferne.js through the hook in world/roads.js)
            E("BEWUCHS.set({ doy: 150 })")
            for i in range(30):
                E("GAME.step(0.1)")
                if J("BEWUCHS.state().ferne.on"):
                    break
            view(120, 20, 150, -7, h=6.0, fov=55, n=12)
            f = J("BEWUCHS.state().ferne")
            print('far', json.dumps(f), flush=True)
            ck('the far bloom is there (window filled, classes in flower)', f['on'] and len(f['classes']) > 0, json.dumps(f)[:300])
            lib.shot(pg, OUT, 'ferne_juni')
            E("BEWUCHS.set({ doy: 20 })")
            for i in range(30):
                E("GAME.step(0.1)")
            lib.shot(pg, OUT, 'ferne_januar')
        if 'jahr' in WANT:
            view(14, 16, math.degrees(math.atan2(2 - 14, 2 - 16)), -14)
            for d, name in ((20, 'januar'), (105, 'april'), (200, 'juli'), (290, 'oktober'), (322, 'november')):
                E(f"BEWUCHS.set({{ doy: {d} }})")
                E("GAME.step(0.1); GAME.step(0.1)")
                lib.shot(pg, OUT, 'garten_' + name)
        if 'maehen' in WANT:
            # cut a strip through the lawn: the cells there are short (the texture the blades read follows GRASS.cut)
            E("BEWUCHS.set({ doy: 140 })")
            t = E("CLOCK.t")
            n0 = J("BEWUCHS.state().mown")
            E(f"(() => {{ for (let x = 6; x <= 14; x += 0.3) GRASS.cut(x, 12, 0.35, {t}, 1); }})()")
            E("GAME.step(0.1)")
            n1 = J("BEWUCHS.state().mown")
            c = J("GRASS.cutCount(10, 12, 0.3)")
            ck('mown cells reach the template', n1 > n0 + 50, f'{n0} → {n1}')
            ck('GRASS.cutCount answers from the grid', c['all'] > 0 and c['n'] >= 0.8 * c['all'], c)
            view(10, 17, 180, -24)
            lib.shot(pg, OUT, 'garten_gemaeht')
        if 'strauch' in WANT:
            # stage 3: a thicket of the maps (class 12) near the garden – the nearest place of that class, searched in the loaded cells
            spot = J("""(() => { let best = null; for (const c of BWKARTE.cells.values()) { if (c.state !== 'ok') continue;
                for (let v = 0; v < c.n; v += 4) for (let u = 0; u < c.n; u += 4) { if ((c.px[v * c.n + u] & 31) !== 12) continue;
                  const x = c.i * 400 + (u + 0.5) * c.res, y = c.j * 400 + (c.n - 1 - v + 0.5) * c.res, d = Math.hypot(x - 2, y - 2);
                  if (d > 60 && (!best || d < best[2])) best = [x, y, d]; } } return best; })()""")
            print('thicket', spot, flush=True)
            ck('a thicket in the maps near the garden', bool(spot), spot)
            if spot:
                sx, sy = spot[0], spot[1]
                # from 14 m south-west of it, looking at it
                vx, vy = sx - 10, sy - 10
                for d, name in ((156, 'juni'), (255, 'september'), (20, 'januar')):
                    E(f"BEWUCHS.set({{ doy: {d} }})")
                    view(vx, vy, math.degrees(math.atan2(sx - vx, sy - vy)), -6)
                    for i in range(40):
                        E("GAME.step(0.1)")
                        t = J("BEWUCHS.state().strauch")
                        if t['queue'] == 0 and t['drawn'] > 0:
                            break
                        time.sleep(0.2)
                    t = J("BEWUCHS.state().strauch")
                    print('strauch', name, json.dumps(t), flush=True)
                    lib.shot(pg, OUT, 'strauch_' + name)
                    if name == 'juni':
                        ck('shrubs stand in the thicket (kinds built, shrubs drawn, some close)', t['kinds'] >= 3 and t['drawn'] >= 20 and t['near'] >= 1 and not t['failed'], json.dumps(t))
                    if name == 'september':
                        ck('berries in September', t['dots'] > 50, json.dumps(t))
                # solid from 1 m: a body on foot (the walker's 0.21 m) at a tall shrub is moved out of it – after three steps (shrubs that
                # overlap hand it on) outside every shrub round it; a vehicle's circle (0.9 m) passes as before
                E("BEWUCHS.set({ doy: 156 })")
                view(vx, vy, math.degrees(math.atan2(sx - vx, sy - vy)), -6)
                hit = J("""(() => { let best = null;
                    for (const c of BWKARTE.cells.values()) if (c.solid) for (const L of c.solid.values()) for (let n = 0; n < L.length; n += 3) {
                      const d = Math.hypot(L[n] - GAME.cam.position.x, L[n + 1] + GAME.cam.position.z); if (!best || d < best[3]) best = [L[n], L[n + 1], L[n + 2], d]; }
                    if (!best) return null;
                    const [x, y, r] = best, k = [x + 0.05, y + 0.02], v = [x + 0.05, y + 0.02];
                    for (let i = 0; i < 3; i++) KERN.pushOut(k, 0.21);
                    BWSTRAUCH.pushOut(v, 0.9);
                    let pen = 0;
                    for (const c of BWKARTE.cells.values()) if (c.solid) for (const L of c.solid.values()) for (let n = 0; n < L.length; n += 3) {
                      const d = Math.hypot(k[0] - L[n], k[1] - L[n + 1]); if (d < 6) pen = Math.max(pen, L[n + 2] + 0.21 - d); }
                    return { r: +r.toFixed(2), moved: +Math.hypot(k[0] - x - 0.05, k[1] - y - 0.02).toFixed(2), pen: +pen.toFixed(3),
                      vehicle: +Math.hypot(v[0] - x - 0.05, v[1] - y - 0.02).toFixed(3), solid: BWSTRAUCH.state().solid, pushes: BWSTRAUCH.state().pushes }; })()""")
                print('solid', json.dumps(hit), flush=True)
                ck('shrubs from 1 m are solid for a walker (moved out, then outside all of them), not for a vehicle', bool(hit) and hit['solid'] > 20 and hit['moved'] >= hit['r'] and hit['pen'] <= 0.02 and hit['vehicle'] == 0, json.dumps(hit))
        if 'beet' in WANT:
            # stage 4: the bed classes have their templates; a place of class 13–16 near the garden in July
            bl = J("BEWUCHS.state().blumen")
            ck('the bed templates are in (classes 13–16 planted by them)', bl['tpl'] >= 8 and len(bl['beds']) >= 3, json.dumps({k: bl[k] for k in ('tpl', 'beds')}))
            spot = J("""(() => { let best = null; for (const c of BWKARTE.cells.values()) { if (c.state !== 'ok') continue;
                for (let v = 0; v < c.n; v += 2) for (let u = 0; u < c.n; u += 2) { const k = c.px[v * c.n + u] & 31; if (k < 13 || k > 16) continue;
                  const x = c.i * 400 + (u + 0.5) * c.res, y = c.j * 400 + (c.n - 1 - v + 0.5) * c.res, d = Math.hypot(x - 2, y - 2);
                  if (!best || d < best[2]) best = [x, y, d, k]; } } return best; })()""")
            print('bed', spot, flush=True)
            if spot:
                E("BEWUCHS.set({ doy: 190 })")
                view(spot[0] - 5, spot[1] - 5, math.degrees(math.atan2(5, 5)), -20)
                lib.shot(pg, OUT, 'beet_juli')
        if 'acker' in WANT:
            # stage 5a: a field of the maps' crop classes near the garden (cereal 19 or rape 20) through the farmer's year
            spot = J("""(() => { let best = null; for (const c of BWKARTE.cells.values()) { if (c.state !== 'ok') continue;
                for (let v = 0; v < c.n; v += 6) for (let u = 0; u < c.n; u += 6) { const k = c.px[v * c.n + u] & 31; if (k !== 19 && k !== 20) continue;
                  const x = c.i * 400 + (u + 0.5) * c.res, y = c.j * 400 + (c.n - 1 - v + 0.5) * c.res, d = Math.hypot(x - 2, y - 2);
                  if (d > 80 && (!best || d < best[2])) best = [x, y, d, k]; } } return best; })()""")
            print('field', spot, flush=True)
            ck('a field of the crop classes near the garden', bool(spot), spot)
            if spot:
                fx, fy = spot[0], spot[1]
                for d, name in ((130, 'mai'), (170, 'juni'), (225, 'august'), (300, 'oktober')):
                    E(f"BEWUCHS.set({{ doy: {d} }})")
                    view(fx - 6, fy - 6, 45, -10)
                    s = st()
                    print('acker', name, json.dumps(s['halm']['rings'])[:300], flush=True)
                    lib.shot(pg, OUT, 'acker_' + name)
                    if name == 'juni':
                        ck('the field stands in June (blades on its tiles)', s['halm']['blades'] > 2000, json.dumps(s['halm']['rings'])[:300])
            # stage 5b: the crops' plants from the acker atlas – the atlas three pictures high, every crop with its pictures; maize in August
            # with its cobs (the phase kolben, cells 128–191), and a field of maize, beet or potatoes (class 21) seen from its edge
            bl = J("BWBLUME.stats()")
            ck('the crops have their plants from the acker atlas (cells 128–191, an atlas of 8 × 24 cells)', len(bl['acker']) >= 6 and bool(bl['atlasPx']) and bl['atlasPx'][1] == 3 * bl['atlasPx'][0], json.dumps({k: bl[k] for k in ('acker', 'atlasPx')}))
            E("BEWUCHS.set({ doy: 232 })")
            for i in range(3):
                E("GAME.step(0.1)")
            sm = J("BWBLUME.stats().species['acker:silomais'] || null")
            ck('maize in August: the picture of its cobs', bool(sm) and all(g[0] == 128 + 8 + 3 for g in sm), sm)
            sp21 = J("""(() => { let best = null; for (const c of BWKARTE.cells.values()) { if (c.state !== 'ok') continue;
                for (let v = 0; v < c.n; v += 6) for (let u = 0; u < c.n; u += 6) { if ((c.px[v * c.n + u] & 31) !== 21) continue;
                  const x = c.i * 400 + (u + 0.5) * c.res, y = c.j * 400 + (c.n - 1 - v + 0.5) * c.res, d = Math.hypot(x - 2, y - 2);
                  if (d > 80 && (!best || d < best[2])) best = [x, y, d]; } } return best; })()""")
            print('field 21', sp21, flush=True)
            if sp21:
                for d, name in ((175, 'juni'), (232, 'august')):
                    E(f"BEWUCHS.set({{ doy: {d} }})")
                    view(sp21[0] - 4, sp21[1] - 4, 45, -6)
                    lib.shot(pg, OUT, 'acker21_' + name)
        if 'leistung' in WANT:
            view(14, 16, math.degrees(math.atan2(2 - 14, 2 - 16)), -14)
            r = J("(() => { const R = GAME.R; R.info.autoReset = false; R.info.reset(); GAME.shot(); const o = { calls: R.info.render.calls, tris: R.info.render.triangles }; R.info.autoReset = true; return o; })()")
            print('frame', json.dumps(r), flush=True)
            for t in ('mittel', 'schnell'):
                E(f"BEWUCHS.set({{ tier: '{t}' }})")
                E("GAME.step(0.1)")
                s = st()
                print('tier', t, json.dumps(s['halm']), flush=True)
                ck(f'tier {t}: fewer blades, within its budget', s['tier'] == t and s['halm']['tris'] <= (300000 if t == 'mittel' else 150000), json.dumps(s['halm']['rings']))
            E("BEWUCHS.set({ tier: null })")
    except Exception as ex:
        ck('sections ran', False, repr(ex)[:400])
    s = st()
    ck('no error in the template', not s['err'], s['err'])
    ck.errors(errs)
ck.done()
