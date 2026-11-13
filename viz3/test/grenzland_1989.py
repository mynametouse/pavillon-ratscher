# feat/grenzland-1989 (Falko, 13.11.2026 0:32: the flashbacks to 1989 – surroundings, clothes, style, fashion, so that it looks real):
# the flashback to Ratscher on Friday, 10 November 1989. Starts the mode, stands in the yard behind the old school, counts what of today is
# to be seen there (parked cars, people, lanterns), enters the flashback – the date, the clock, the era, nothing of today left, the street
# of the time and its people there, the player repainted as the young Gerhard –, takes the pictures one judges it by (the yard with the
# Konsum, the street from four standpoints, the people in a row from the front and from behind, heads close up, the player from behind
# and through his eyes), leaves – every flag, colour, date, clock and figure as before –, enters again and ends the mode in the middle
# of it: everything back as well. Pictures in out/grenzland_1989/ (today's same standpoints: viz3/test/grenzland_1989_blick.py).
#   bash tools/browser_lock.sh python3 viz3/test/run.py --port 9014 --serve grenzland_1989        (~7 min in the chat machine)
import sys, os, json, time, math
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__))); import lib
port = sys.argv[1] if len(sys.argv) > 1 else '8951'
ck = lib.Checks('grenzland_1989')
OUT = lib.out('grenzland_1989')
SPOTS = [('a_haltestelle', 250.5, -107.5, 288, -2), ('b_schule', 216.5, -98.5, 98, -1), ('c_anger', 209.0, -113.0, 62, 0),
         ('d_brunnen', 268.0, -113.0, 282, -1), ('e_hof', 241.5, -74.5, 322, -2), ('f_kohlen', 206.5, -99.5, 262, -6),
         ('g_start', 214.0, -72.0, 134, -2), ('h_gaerten', 212.5, -76.0, 236, -5)]
with lib.browser() as b:
    errs = []
    pg = lib.page(b, 1100, 680, errs, tier='schnell')
    lib.boot(pg, port, '?szenario=grenzland', figures=True)
    E = pg.evaluate
    J = lambda js: json.loads(E("JSON.stringify(" + js + ")"))
    steps = lambda secs, dt=0.1: E(f"for (let i = 0; i < {max(1, int(secs / dt))}; i++) GAME.step({dt})")
    def view(x, y, yaw, pitch=-2, fov=60, eye=1.62):
        E(f"GAME.view({x}, {y}, KERN.ground({x}, {y}) + {eye}, {yaw}, {pitch}, {fov})")
    def shot(name):
        try: lib.shot(pg, OUT, name)
        except Exception as e: print('shot failed', name, e)
    def wait(cond, secs=60, dt=0.3):
        for _ in range(int(secs * 2)):
            steps(dt)
            if E(cond): return True
            time.sleep(0.5)
        return False
    SNAP = """(() => { const m = AVATAR.figs.m, maps = []; if (m) m.model.traverse(x => { if (x.isMesh) for (const q of (Array.isArray(x.material) ? x.material : [x.material])) if (q && q.map) maps.push(q.map.uuid); });
      return { t: Math.round(CLOCK.t * 10) / 10, e0: DN.e0, era: GLSTATE.era, body: document.body.dataset.glEra || '', hold: !!DORF.S.hold, frozen: !!DINGE.frozen, busAuto: BUS.S.auto, vAuto: VERKEHR.S.auto,
        preset: WETTER.state().preset, wand: RATSCHER.bld[0].material.color.getHex(), dach: RATSCHER.bld[1].material.color.getHex(), fogOwn: !!Object.getOwnPropertyDescriptor(GAME_SCENE().fog, 'density').get,
        laub: RATSCHER.trees[0].material.color.getHex(), laubA: RATSCHER.trees[0].material.alphaTest, linde: VPROPS.lindeMeshes ? VPROPS.lindeMeshes[1].material.alphaTest : 0,
        kind: AVATAR.kind, maps: maps.join(','), figs: GLFIG.figs.length, cars: GLAUTO.cars.length, focus: CLOCK.focused, modern: GL89WELT.modern(),
        kids: GAME_SCENE().children.filter(o => /grenzland 1989/.test(o.name || '')).length }; })()"""
    E("window.GAME_SCENE = () => { let o = AVATAR.figs.m ? AVATAR.figs.m.g : GLAUTO.moped.g; while (o.parent) o = o.parent; return o; }")
    wait("!!GRENZLAND.partnerOf() && !!AVATAR.figs.m", 60)
    # ---- today, in the yard behind the old school: what stands about ----
    E("GAME.setView3(false); GRENZLAND.folgen(false)")
    view(241.5, -74.5, 322)
    for _ in range(10):
        steps(0.5); time.sleep(0.3)
    lib.settle_light(pg)
    view(241.5, -74.5, 322)
    shot('heute_e_hof')
    s0 = J(SNAP)
    ck('today there is something of today to hide (parked cars, lanterns)', s0['modern']['autos'] > 0 and s0['modern']['laternen'] > 0, str(s0['modern']))
    # ---- into the flashback ----
    E("window.__in = false; GL89.enter({ pos: [238.5, -72.5], yaw: 320 }).then(() => { window.__in = true; })")
    ok = wait("window.__in === true", 200)
    st = J("GL89.state()")
    ck('the flashback stands (the promise resolved, no error)', ok and st['on'] and not st['busy'] and not st['err'], json.dumps(st)[:600])
    s1 = J(SNAP)
    ck('the date is the 10th of November 1989, the clock the afternoon, the era 1989',
       '10.11' in st['datum'] and st.get('jahr') == 1989 and abs(st['m'] - (15 * 60 + 35)) < 4 and s1['era'] == '1989' and s1['body'] == '1989', st['datum'] + ' ' + str(st.get('jahr')) + ' ' + str(st['m']))
    ck('nothing of today is left to be seen (cars, people, lanterns)', s1['modern'] == {'autos': 0, 'leute': 0, 'laternen': 0}, str(s1['modern']))
    w = st['welt']
    ck('the street of the time is there (props, print, bulbs, smoke; cars; lamps)', w['meshes'] >= 3 and w['cars'] >= 4 and w['lamps'] >= 5 and w['tris'] > 3000 and not w['err'], json.dumps(w))
    ck('the air and the houses of 1989 (haze, the tint of the facades, the villagers held, the weather set)',
       w['fog'] > 0.0015 and s1['wand'] != s0['wand'] and s1['hold'] and s1['frozen'] and s1['preset'] and s1['focus'], json.dumps({k: s1[k] for k in ('wand', 'hold', 'frozen', 'preset', 'focus')}))
    ck('people of the afternoon stand as figures, witnesses who know the teacher', len(st['leute']) >= 3 and E("Object.values(GL89.leute).every(F => F.era === '1989' && F.knows && F.sees && F.g.visible)"), str(st['leute']))
    ck('the player is the young Gerhard (his figure repainted, glasses and moustache)', st['spieler'] and st['spieler']['tex'] >= 1 and st['spieler']['extra'] >= 1 and s1['kind'] == 'm' and s1['maps'] != s0['maps'], str(st['spieler']) + ' ' + str(E("JSON.stringify(GLFIG.last)")))
    # ---- pictures: the yard, the street ----
    steps(4)
    lib.settle_light(pg)
    for name, x, y, yaw, pitch in SPOTS:
        view(x, y, yaw, pitch)
        for _ in range(5):
            steps(0.6); time.sleep(0.25)
        view(x, y, yaw, pitch)
        shot('1989_' + name)
        if name in ('b_schule', 'e_hof'):
            # the page as one sees it: with the grade of the old print (filter, vignette, grain), the panel, the date
            try: pg.screenshot(path=os.path.join(OUT, '1989_' + name + '_seite.png'))
            except Exception as e: print('screenshot failed', e)
    lt = J("({ leute: Object.keys(GL89.leute), figs: GLFIG.figs.length, t: GL89.state().m })")
    ck('walking about, the nearest few stand (never more than the memory allows)', 2 <= len(lt['leute']) <= 6, str(lt))
    # ---- the player: over the shoulder, and through his eyes ----
    view(231.0, -96.5, 300, -4)
    E("GAME.setView3(true)")
    for _ in range(6):
        steps(0.5); time.sleep(0.2)
    shot('1989_gerhard_schulter')
    E("GAME.setView3(false)")
    steps(1)
    view(231.0, -96.5, 300, -30)
    shot('1989_gerhard_augen')
    # ---- the people in a row on the parking strip, from the front and from behind; heads close up ----
    ids = ['erna', 'horst', 'renate', 'maik', 'ines', 'gisela', 'brigitte', 'werner', 'kurt', 'abv', 'vopo', 'lutz']
    E("window.__row = 0; (async () => { const ids = %s; for (let i = 0; i < ids.length; i++) { const F = await GL89.hol(ids[i], 224.6 + i * 0.86, -100.5 - i * 0.24, 200); if (F) window.__row++; } window.__rowDone = true; })()" % json.dumps(ids))
    wait("window.__rowDone === true", 240, 0.2)
    ck('everybody of the cast can be made (twelve in a row)', E("window.__row") == len(ids), str(E("window.__row")) + ' ' + str(E("GLFIG.err")))
    E("for (const F of GLFIG.figs) { GLFIG.pose(F, null); GLFIG.talking(F, false); }")
    steps(1.5)
    sa, ca = math.sin(math.radians(200)), math.cos(math.radians(200))
    for g in range(3):
        cx, cy = 224.6 + (4 * g + 1.5) * 0.86, -100.5 - (4 * g + 1.5) * 0.24
        view(cx + sa * 5.3, cy + ca * 5.3, 20, -3, 34, 1.45)
        steps(0.3)
        shot(f'1989_leute_vorn_{g + 1}')
        view(cx - sa * 5.3, cy - ca * 5.3, 200, -3, 34, 1.45)
        steps(0.3)
        shot(f'1989_leute_hinten_{g + 1}')
    for name in ['maik', 'ines', 'gisela', 'werner', 'erna', 'abv']:
        i = ids.index(name)
        x, y = 224.6 + i * 0.86, -100.5 - i * 0.24
        a = math.radians(200 + 28)
        view(x + math.sin(a) * 1.25, y + math.cos(a) * 1.25, 20 + 28, -4, 34, 1.52)
        steps(0.2)
        shot('1989_kopf_' + name)
    # ---- leave: everything as before ----
    E("window.__out = false; GL89.leave().then(() => { window.__out = true; })")
    ok = wait("window.__out === true", 60)
    for _ in range(4):
        steps(0.5); time.sleep(0.2)
    s2 = J(SNAP)
    same = [k for k in s0 if k not in ('modern', 't', 'kids') and s0[k] != s2[k]]
    ck('leaving puts every flag, colour, date and figure back', ok and not same and abs(s2['t'] - s0['t']) < 8, 'differs: ' + str({k: (s0[k], s2[k]) for k in same}) + f" t {s0['t']} {s2['t']}")
    ck('the cars and lanterns of today are back', s2['modern']['autos'] >= s0['modern']['autos'] - 1 and s2['modern']['laternen'] == s0['modern']['laternen'], str(s0['modern']) + ' ' + str(s2['modern']))
    ck('nothing of 1989 is left in the scene', s1['kids'] >= 2 and s2['kids'] == 0 and not E("GL89WELT.on") and E("GL89WELT.state().undo") == 0, f"{s1['kids']} {s2['kids']}")
    # ---- again, and the mode ends in the middle of it ----
    E("window.__in = false; GL89.enter({ pos: [238.5, -72.5], yaw: 320 }).then(() => { window.__in = true; })")
    ok = wait("window.__in === true", 200)
    ck('a second time in', ok and E("GL89.on") and E("GLSTATE.era") == '1989')
    E("GRENZLAND.stop(true)")
    steps(1)
    s3 = J(SNAP.replace("figs: GLFIG.figs.length, cars: GLAUTO.cars.length,", "figs: 0, cars: 0,"))
    skip = ('modern', 't', 'kids', 'figs', 'cars')
    same = [k for k in s0 if k not in skip and s0[k] != s3[k]]
    ck('the mode\'s end inside the flashback restores too', not same and not E("GL89.on") and not E("GLSTATE.on") and E("GLFIG.figs.length") == 0, 'differs: ' + str({k: (s0[k], s3[k]) for k in same}))
    okgl, rep = lib.check_gl(pg)
    ck('at most 16 textures per shader program, none broken', okgl, str({k: rep[k] for k in ('maxFrag', 'maxVert', 'programs')}))
    ck.errors(errs)
    ck.done()
