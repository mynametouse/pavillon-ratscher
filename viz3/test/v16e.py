# V16e Ratscher after photos: facades and roofs of every building (VILLAGE), the centre with the old school (turret, clock), Dorflinde,
# fountain, bus stop and street lamps (VPROPS), the things near the walker that are loaded and dropped by distance (VNEAR); light at night,
# place names, collisions, the place "Dorf" in the menu, textures per shader. Pictures in out/v16e/ – the photo spots of the Commons
# pictures (Aschroet 2026), an overview, night. Sections (optional second argument, comma-separated): load,places,near,walk,night,shots,gl
import sys, os, time, json
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__))); import lib
port = sys.argv[1]; OUT = lib.out('v16e'); ONLY = sys.argv[2].split(',') if len(sys.argv) > 2 else None
def want(k): return not ONLY or k in ONLY
ok = []; fails = []
def check(name, cond, info=''):
    (ok if cond else fails).append(name); print(('OK   ' if cond else 'FAIL ') + name, info, flush=True)
# the photo spots (camera positions from the Commons pages, site metres) and the view: x, y, yaw, pitch, fov
VIEWS = {'schule': (246.5, -100.6, 306, 9, 62), 'linde': (248.0, -102.2, 254, 12, 66), 'brunnen': (200.9, -111.9, 248, 0, 66), 'strasse': (150, -110, 80, 0, 70)}
with lib.browser() as b:
    errs = []; pg = lib.page(b, 1100, 680, errs, tier='mittel'); lib.boot(pg, port); E = pg.evaluate
    E("document.querySelectorAll('#toast').forEach(e => e.style.visibility = 'hidden'); GAME.setView3(false)")
    def view(k, steps=20):
        x, y, yaw, pitch, fov = VIEWS[k]; E(f"GAME.view({x}, {y}, RATSCHER.hAt({x}, {y}) + 1.6, {yaw}, {pitch}, {fov}); for (let i = 0; i < {steps}; i++) GAME.step(0.4)")
    def at(h, m, day=1):
        E(f"if (!DN.active) GAME.setMode('auto'); CLOCK.t = {(day - 1) * 1440 + h * 60 + m}; DN.update(true)"); lib.settle_light(pg)
    st = json.loads(E("""JSON.stringify({ v: VILLAGE.ready, ms: VILLAGE.ms, n: VILLAGE.bld.length, p: VPROPS.ready, pms: VPROPS.ms, near: VNEAR.on, lamps: VPROPS.lamps.length,
        styles: VILLAGE.bld.reduce((o, b) => (o[b.st.style] = (o[b.st.style] || 0) + 1, o), {}), roofs: VILLAGE.bld.filter(b => b.roof).length, flat: VILLAGE.bld.filter(b => b.flat).length,
        doors: VILLAGE.bld.filter(b => b.fac.some(f => f.door)).length, chim: VILLAGE.bld.filter(b => b.chim).length, school: !!VPROPS.school, linde: !!VPROPS.lindeMeshes,
        roofTris: VILLAGE.meshes[0].geometry.attributes.position.count / 3, lost: VILLAGE.lostTris || 0, wcol: [WCOL.nSeg, WCOL.nTree] })"""))
    print('village', json.dumps(st), flush=True)
    if want('load'):
        # feat/dorfkern: houses rebuilt after Falko's video are split into the house and the barn behind (one building more each)
        check('village built from the 337 buildings', st['v'] and 337 <= st['n'] <= 350, f"{st['n']} buildings, {st['ms']} ms")
        check('every building has a style, slate and half-timbering among the houses', sum(st['styles'].values()) == st['n'] and all(st['styles'].get(str(k), 0) > 0 for k in (2, 3, 5, 6, 0)), str(st['styles']))
        check('roofs rebuilt with eaves (all but the few at the far edge of the data)', st['roofs'] >= 325 and st['lost'] < 10 and st['roofTris'] > 8000, f"{st['roofs']} roofs, {st['roofTris']} triangles, {st['flat']} flat, {st['lost']} roof triangles without a building")
        check('doors and gates towards the roads', st['doors'] > 250, str(st['doors']))
        check('chimneys on the houses', st['chim'] > 100, str(st['chim']))
        check('centre: school turret, Dorflinde, lamps', st['p'] and st['school'] and st['linde'] and st['lamps'] >= 15, f"{st['lamps']} lamps, {st['pms']} ms")
        hid = E("(() => { const m4 = new (GAME.cam.matrixWorld.constructor)(); let n = 0; for (const im of RATSCHER.trees) for (let i = 0; i < im.count; i++) { im.getMatrixAt(i, m4); const e = m4.elements; if (Math.hypot(e[12] - VPROPS.LINDE[0], -e[14] - VPROPS.LINDE[1]) < 7 && e[0] !== 0) n++; } return n; })()")
        check('the measured crowns at the Dorflinde are hidden', hid == 0, f'{hid} left')
        tick = E("(() => { const t0 = CLOCK.t; CLOCK.t = 9 * 60 + 15; GAME.step(0.5); const a = VPROPS.clock(); CLOCK.t = t0; return a; })()")
        check('the school clock follows the game clock', tick and abs(tick['h'] - 9.25) < 0.02, json.dumps(tick))
    if want('places'):
        r = json.loads(E("JSON.stringify([[216, -104], [229, -88], [192, -112], [300, -125], [300, -265]].map(([x, y]) => VPROPS.place(x, y)))"))
        check('place names of the centre and the streets', r[0].endswith('Dorflinde am Anger') and 'Alte Schule' in r[1] and 'Dorfbrunnen' in r[2] and r[3].endswith('Ratschner Anger') and r[4].endswith('An der Mühle'), str(r))
        E("GAME.go('dorf'); GAME.step(0.5)"); p = json.loads(E("JSON.stringify({ x: GAME.P.x, y: GAME.P.y, label: document.getElementById('where') ? document.getElementById('where').textContent : '' })"))
        check('menu place "Dorf" leads to the Anger, the name shows', abs(p['x'] - 241.5) < 1 and abs(p['y'] + 101.5) < 1 and p['label'].startswith('Ratscher'), json.dumps(p, ensure_ascii=False))
    if want('near'):
        res = []
        for x, y in [(230, -110), (700, -600), (230, -110)]:
            E(f"GAME.view({x}, {y}, RATSCHER.hAt({x}, {y}) + 1.6, 0, 0, 60); for (let i = 0; i < 50; i++) GAME.step(0.4)")
            res.append(json.loads(E("JSON.stringify(Object.assign(VNEAR.state(), { meshes: [...VNEAR.cells.values()].filter(c => c.mesh).length }))")))
        print('near', res, flush=True)
        check('near things loaded at the Anger', res[0]['meshes'] >= 3, str(res[0]))
        check('dropped far away', res[1]['meshes'] == 0 and res[1]['dropped'] >= res[0]['meshes'], str(res[1]))
        check('loaded again on return', res[2]['meshes'] >= res[0]['meshes'] - 1 and res[2]['built'] > res[0]['built'], str(res[2]))   # the first visit may keep one more cell from the walk there
    if want('walk'):
        r = json.loads(E("JSON.stringify((() => { const f = VPROPS.FOUNTAIN, a = [f[0], f[1] + 1.9 + 0.1], hitF = WCOL.pushCircle(a, 0.3); const l = VPROPS.lamps[3], b = [l.x + 0.05, l.y], hitL = WCOL.pushCircle(b, 0.3); const c = [VPROPS.LINDE[0] + 0.3, VPROPS.LINDE[1]], hitT = WCOL.pushCircle(c, 0.3); return { hitF, a, hitL, b, hitT, c }; })())"))
        check('the fountain, the lamps and the Linde stop the walker', r['hitF'] and r['hitL'] and r['hitT'], json.dumps(r))
    if want('shots'):
        at(15, 0)
        for k in VIEWS: view(k); lib.shot(pg, OUT, 'a_' + k)
        E("GAME.orbit(20, 22, 160, [240, -110, 5]); GAME.step(0.5)"); lib.shot(pg, OUT, 'b_overview')
        E("GAME.orbit(215, 30, 70, [228, -100, 4]); GAME.step(0.5)"); lib.shot(pg, OUT, 'b_anger_above')
    if want('night'):
        at(23, 15); view('brunnen', 25); lib.shot(pg, OUT, 'c_night_brunnen')
        n = json.loads(E("JSON.stringify({ night: VILLAGE.U.uNight.value, win: VILLAGE.U.uWinP.value, glass: VPROPS.glass.emissiveIntensity, pool: VPROPS.pool.visible, lampV: VILLAGE.U.uLampV.value.filter(v => v.w > 0).length })"))
        check('night: windows lit, lamps glow, light on the ground and the walls', n['night'] > 0.9 and n['win'] > 0.05 and n['glass'] > 3 and n['pool'] and n['lampV'] >= 4, json.dumps(n))
        view('schule', 10); lib.shot(pg, OUT, 'c_night_schule')
        at(13, 0); n = json.loads(E("JSON.stringify({ night: VILLAGE.U.uNight.value, glass: VPROPS.glass.emissiveIntensity, pool: VPROPS.pool.visible })"))
        check('day: lamps off', n['night'] < 0.01 and n['glass'] < 0.01 and not n['pool'], json.dumps(n))
    if want('gl'):
        good, r = lib.check_gl(pg)
        check('every shader within 16 textures per stage', good, f"fragment {r['maxFrag']}, vertex {r['maxVert']}, {r['bad'][:3]}")
    errs = [e for e in errs if 'Texture marked' not in e]
    print('\n'.join(errs[:20]) or 'no errors'); check('no errors', not errs)
    print(f"{len(ok)} ok, {len(fails)} failed: {fails}")
