# feat/bewuchs: the vegetation template (viz3/src/bewuchs/) – lawn and grass in 3D around the camera, the garden's mowing, the year, the budget.
#   bash tools/browser_lock.sh python3 viz3/test/run.py --port 8965 --serve bewuchs[:rasen,maehen,wiese,ferne,jahr,leistung]
# Pictures in out/bewuchs/.
import sys, os, time, json, math
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import lib

port = sys.argv[1]
WANT = set((sys.argv[2] if len(sys.argv) > 2 else 'rasen,maehen,wiese,ferne,jahr,leistung').split(','))
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
    print('state', json.dumps(s0)[:900], flush=True)
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
            ck('flowers out in June (margerites, buttercups …)', bl['species']['margerite'] > 0.3 and bl['species']['hahnenfuss'] > 0.3 and bl['rings'][0]['slots'] > 500, json.dumps(bl)[:300])
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
            for d, name in ((20, 'januar'), (105, 'april'), (200, 'juli'), (290, 'oktober')):
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
