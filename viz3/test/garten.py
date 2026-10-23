# feat/garten (Falko, 23.10.2026): the garden buildings – doors to the north (bungalow, wooden hut, greenhouse), the hut's roof falling west,
# the bungalow with its annex and the new furnishing, lamps, seats. One short run: walks in through the doors, checks collisions and the
# interactive parts, takes pictures into out/garten/.
#   python3 viz3/test/garten.py PORT [tier] [nogeo]      tier: schnell (default) | mittel | hoch; nogeo: 1 = without the real surroundings
import sys, os, time, json
import sys as _sys, os as _os; _sys.path.insert(0, _os.path.dirname(_os.path.abspath(__file__))); import lib
port = sys.argv[1]
arg = sys.argv[2] if len(sys.argv) > 2 else ''
opts = dict(a.split('=', 1) if '=' in a else (a, '1') for a in arg.split(',') if a)
TIER = opts.get('tier', 'schnell')
QUERY = '?nogeo=1' if opts.get('nogeo') == '1' else ''
ONLY = set(opts.get('only', '').split('+')) - {''}
OUT = lib.out('garten')
ck = lib.Checks('garten')
errs = []

def want(k):
    return not ONLY or k in ONLY

def shot(pg, name):
    lib.shot(pg, OUT, name)

def ev(pg, js):
    return pg.evaluate(js)

# local → site coordinates of a building (BLD descriptors: centre c, heading az; local x along the heading, y to its left)
W = """((k, lx, ly) => { const b = SITE.bld[k], a = b.az * Math.PI / 180; return [b.c[0] + lx * Math.sin(a) - ly * Math.cos(a), b.c[1] + lx * Math.cos(a) + ly * Math.sin(a)]; })"""

def view(pg, k, lx, ly, eye, yaw_local, pitch, fov=70):
    """camera at a building's local point; yaw given in the building's frame (0 = its heading, 90 = to its right)"""
    ev(pg, f"(() => {{ const w = {W}('{k}', {lx}, {ly}); const az = SITE.bld['{k}'].az; GAME.view(w[0], w[1], {eye}, az + ({yaw_local}), {pitch}, {fov}); GAME.step(0.05); }})()")

def walk(pg, k, lx, ly, yaw_local, secs, door=None, open_=True):
    """stand at a building's local point facing yaw_local, (open a door), walk forward for secs; returns where the walker ended and the place name"""
    if door: ev(pg, f"GAME.setDoorNow('{door}', {1 if open_ else 0})")
    ev(pg, f"(() => {{ const w = {W}('{k}', {lx}, {ly}); const az = SITE.bld['{k}'].az; GAME.view(w[0], w[1], 1.62 + GAME.floorAt(w[0], w[1], 0.5), az + ({yaw_local}), 0); }})()")
    r = ev(pg, f"(() => {{ const r = GAME.step({secs}, 1); const P = GAME.P; return {{ x: P.x, y: P.y, feet: P.feet, place: window.sitePlace ? sitePlace(P.x, P.y, P.feet + 0.5) : null }}; }})()")
    loc = ev(pg, f"(() => {{ const b = SITE.bld['{k}'], a = b.az * Math.PI / 180, dx = GAME.P.x - b.c[0], dy = GAME.P.y - b.c[1]; return [dx * Math.sin(a) + dy * Math.cos(a), -dx * Math.cos(a) + dy * Math.sin(a)]; }})()")
    r['local'] = [round(loc[0], 2), round(loc[1], 2)]
    return r

with lib.browser() as b:
    pg = lib.page(b, 1000, 640, errs=errs, tier=TIER)
    # boot (like lib.boot), but give up at once when the page throws while loading – a module that fails stops the whole app
    t0 = time.time(); pg.goto(f'http://localhost:{port}/index.html{QUERY}', timeout=300000, wait_until='domcontentloaded')
    while not ev(pg, "!!(window.GAME && GAME.loaded && GAME.loaded())"):
        bad = [e for e in errs if e.startswith('PAGEERR')]
        if bad or time.time() - t0 > 1200:
            ck('page loads', False, ' | '.join(bad[:3]) or 'time-out'); ck.errors(errs); ck.done()
        time.sleep(2)
    time.sleep(3); ev(pg, "window.FREEZE = true"); print('loaded', round(time.time() - t0), 's', flush=True)
    ev(pg, "document.querySelectorAll('.ov,#doorbtn,#act2,#joy,header,#ppanel,#talkbtn,#npcsub,#toast').forEach(e => e.style.visibility = 'hidden')")
    ev(pg, "GAME.setMode('day'); GAME.setPhase(GAME.PHASES.length - 1); CAM3.want = false")
    time.sleep(1)
    # ---- data: building frames, registries ----
    st = json.loads(ev(pg, "JSON.stringify({ bld: SITE.bld, lamps: GARTEN.lamps.map(l => l.key), seats: GARTEN.seats.map(s => s.key), acts: PLAY.acts().filter(a => /garten/.test(a.id)).map(a => a.id), doors: Object.keys(DOORS).filter(k => /bungalow|holzhaus|greenhouse|schrank|ghvent/.test(k)) })"))
    print('state', json.dumps(st), flush=True)
    ck('greenhouse turned: gable ends north/south (az 6)', abs(st['bld']['greenhouse']['az'] - 6) < 1e-6, st['bld']['greenhouse'])
    ck('lamps registered (bulb, reading lamp, night lamp, hut)', {'bungalow', 'leselampe', 'nachttisch', 'holzhaus'} <= set(st['lamps']), st['lamps'])
    ck('seats registered (sofa, bed)', {'sofa', 'bett'} <= set(st['seats']), st['seats'])
    ck('actions in the game layer', any('garten:licht:bungalow' in a for a in st['acts']) and any('seat:garten:bett' in a for a in st['acts']), st['acts'])
    ck('doors: bungalow N/S, hut, greenhouse, wardrobe, vent', {'bungalowN', 'bungalowS', 'holzhaus', 'greenhouse', 'schrankO', 'schrankW', 'ghvent'} <= set(st['doors']), st['doors'])
    # door directions: the hinge-to-leaf line of each house door runs across the north wall, the door's action point is north of the centre
    dpos = json.loads(ev(pg, f"JSON.stringify(['bungalowN', 'holzhaus', 'greenhouse'].map(k => {{ const d = DOORS[k], bk = k === 'bungalowN' ? 'bungalow' : k, b = SITE.bld[bk], a = b.az * Math.PI / 180, dx = d.pos[0] - b.c[0], dy = d.pos[1] - b.c[1]; return [k, dx * Math.sin(a) + dy * Math.cos(a), -dx * Math.cos(a) + dy * Math.sin(a), dy]; }}))"))
    print('door positions (local x, local y, world dy)', dpos, flush=True)
    for k, lx, ly, wdy in dpos:
        ck(f'door {k} faces north', wdy > 0.5, f'world dy {wdy:.2f}')
    # ---- walking in through the north doors (and not through closed ones) ----
    if want('walk'):
        r = walk(pg, 'bungalow', 3.6, 0.0, 180, 2.6, 'bungalowN', True)
        ck('bungalow: walk in through the front door (north)', r['place'] == 'Bungalow' and r['local'][0] < 2.0, r)
        r = walk(pg, 'bungalow', 1.0, 0.0, 180, 2.4)
        ck('bungalow: straight through to the back door', r['local'][0] < -1.6 and abs(r['local'][1]) < 0.6, r)
        r = walk(pg, 'bungalow', 0.9, -2.05, 90, 2.0)
        ck('bungalow: on into the annex (the old east wall is open)', r['local'][1] < -2.55 and r['local'][1] > -3.95, r)
        r = walk(pg, 'bungalow', 3.6, 0.0, 180, 2.0, 'bungalowN', False)
        ck('bungalow: closed front door blocks', r['local'][0] > 2.45, r)
        r = walk(pg, 'bungalow', 1.0, -4.6, -90, 1.5)
        ck('bungalow annex: east wall blocks from outside', r['local'][1] < -3.98, r)
        ev(pg, "GAME.setDoorNow('bungalowN', 1)")
        r = walk(pg, 'holzhaus', -0.88, 2.7, 90, 2.4, 'holzhaus', True)
        ck('hut: walk in through the north door', r['place'] == 'Holzhaus' and r['local'][1] < 1.6, r)
        r = walk(pg, 'holzhaus', 0.25, -2.6, -90, 2.0)
        ck('hut: no door in the south wall any more', r['local'][1] < -1.75, r)
        r = walk(pg, 'greenhouse', 1.9, 0.0, 180, 2.0, 'greenhouse', True)
        ck('greenhouse: walk in through the north door', r['place'] == 'Gewächshaus', r)
        r = walk(pg, 'greenhouse', -0.5, 1.4, 90, 1.5)
        ck('greenhouse: west side is glass (blocks)', r['local'][1] > 0.68, r)
    # ---- pictures, day ----
    if want('shots'):
        ev(pg, "GAME.doorsAll(false); ['bungalowN', 'holzhaus', 'greenhouse'].forEach(k => GAME.setDoorNow(k, 1))")
        view(pg, 'bungalow', 7.5, -5.5, 1.7, 180 + 35, -6, 62); shot(pg, 'bungalow_aussen_nordost')
        view(pg, 'bungalow', -6.0, -6.0, 1.7, -37, -5, 62); shot(pg, 'bungalow_aussen_suedost')
        view(pg, 'bungalow', 2.3, 0.0, 1.76, 180, -10, 78); shot(pg, 'bungalow_innen_von_tuer')
        # what the three garden buildings cost in this view: one full frame with and without them (the rest of the scene the same)
        cost = ev(pg, """(() => { const I = GAME.R.info, one = () => { I.autoReset = false; I.reset(); GAME.shot(); const o = { calls: I.render.calls, tris: I.render.triangles }; I.autoReset = true; return o; };
          const a = one(), roots = ['bungalow', 'holzhaus', 'greenhouse'].map(k => BUILD[k].root); roots.forEach(r => r.visible = false); const b = one(); roots.forEach(r => r.visible = true);
          return JSON.stringify({ all: a, without: b, buildings: { calls: a.calls - b.calls, tris: a.tris - b.tris }, programs: I.programs.length, textures: I.memory.textures }); })()""")
        print('render cost (bungalow from the door, one full frame)', cost, flush=True)
        view(pg, 'bungalow', 1.9, -0.6, 1.76, 180 - 40, -14, 78); shot(pg, 'bungalow_innen_schlafecke')
        view(pg, 'bungalow', -0.8, -0.2, 1.7, -40, -14, 78); shot(pg, 'bungalow_innen_kueche')
        view(pg, 'bungalow', -2.1, 0.0, 1.7, 0, -8, 78); shot(pg, 'bungalow_innen_von_hinten')
        view(pg, 'bungalow', -0.6, 0.6, 1.7, 80, -12, 78); shot(pg, 'bungalow_innen_anbau')
        ev(pg, "GAME.setDoorNow('schrankO', 1); GAME.setDoorNow('schrankW', 1)")
        view(pg, 'bungalow', -0.6, -0.9, 1.6, 180, -12, 70); shot(pg, 'bungalow_schrank_offen')
        ev(pg, "GAME.setDoorNow('schrankO', 0); GAME.setDoorNow('schrankW', 0)")
        # lying in the bed (the seat's camera), sitting on the sofa
        ev(pg, "(() => { const a = PLAY.acts().find(a => a.id === 'seat:garten:bett'), b = SITE.bld.bungalow; GAME.view(b.c[0] + 1.95, b.c[1] - 1.2, 1.76, 0, 0); a.run(); GAME.step(1.2); })()")
        ck('lying in the bed', ev(pg, "!!(PLAY.seat && PLAY.seat.kind === 'lie')"), ev(pg, "JSON.stringify(PLAY.seat && { x: PLAY.seat.x, y: PLAY.seat.y, eye: PLAY.seat.eye })"))
        shot(pg, 'bungalow_vom_bett')
        ev(pg, "PLAY.stand(true); GAME.step(0.6)")
        ev(pg, "(() => { const a = PLAY.acts().find(a => a.id === 'seat:garten:sofa'); a.run(); GAME.step(1.2); })()")
        ck('sitting on the sofa', ev(pg, "!!(PLAY.seat && PLAY.seat.kind === 'sit')"))
        shot(pg, 'bungalow_vom_sofa')
        ev(pg, "PLAY.stand(true); GAME.step(0.6)")
        # wooden hut: outside from the north-west (door) and the west (roof falling west), inside
        view(pg, 'holzhaus', -3.2, 5.0, 1.7, 55, -6, 62); shot(pg, 'holzhaus_aussen_nordwest')
        view(pg, 'holzhaus', -6.5, -1.0, 1.7, -9, -4, 62); shot(pg, 'holzhaus_aussen_west')
        # the gravel paths to the new doors from above, and the menu viewpoint 'Holzhaus' (game/player.js)
        ev(pg, "GAME.view(11.3, 0.6, 13.5, 0, -89, 60); GAME.step(0.05)"); shot(pg, 'pfade_von_oben')
        ev(pg, "GAME.go('holzhaus'); GAME.step(0.6)"); shot(pg, 'ort_holzhaus')
        view(pg, 'holzhaus', 0.2, -5.6, 1.7, -90, -6, 62); shot(pg, 'holzhaus_aussen_sued')
        view(pg, 'holzhaus', -0.75, 1.35, 1.98, 95, -16, 80); shot(pg, 'holzhaus_innen_von_tuer')
        view(pg, 'holzhaus', 0.4, -1.3, 1.95, 244, -14, 80); shot(pg, 'holzhaus_innen_von_ecke')
        # greenhouse: door from the north, inside, vent open
        view(pg, 'greenhouse', 2.4, 1.4, 1.65, 140, -12, 75); shot(pg, 'gewaechshaus_tuer_nord')
        view(pg, 'greenhouse', 2.0, 3.6, 1.7, 106, -8, 62); shot(pg, 'gewaechshaus_und_huette')
        ev(pg, "GAME.setDoorNow('ghvent', 1)")
        view(pg, 'greenhouse', 0.85, 0.0, 1.6, 180, -10, 78); shot(pg, 'gewaechshaus_innen')
        ev(pg, "GAME.setDoorNow('ghvent', 0)")
    # ---- lamps: switch at the door, one light follows; night pictures ----
    if want('night'):
        ev(pg, "(() => { const b = SITE.bld.bungalow; GAME.view(b.c[0] + 0.66, b.c[1] + 2.0, 1.76, 180, -5); GAME.step(0.4); })()")
        acts = ev(pg, "PLAY.acts().filter(a => a.id === 'garten:licht:bungalow').map(a => a.label())")
        ck('switch by the front door offers "Licht an"', acts == ['Licht an'], acts)
        ev(pg, "GARTEN.set('bungalow', true); GARTEN.set('leselampe', true); GAME.step(0.4)")
        ck('the light went to the bungalow', ev(pg, "GARTEN.cur() === 'bungalow' && GARTEN.light.intensity > 0"), ev(pg, "GARTEN.cur()"))
        ev(pg, "GAME.setMode('night')"); lib.settle_light(pg)
        view(pg, 'bungalow', 2.3, 0.0, 1.76, 180, -10, 78); shot(pg, 'nacht_bungalow_innen')
        view(pg, 'bungalow', 7.5, -5.5, 1.7, 180 + 35, -6, 62); shot(pg, 'nacht_bungalow_aussen')
        ev(pg, "GARTEN.set('holzhaus', true)")
        view(pg, 'holzhaus', -0.75, 1.35, 1.98, 95, -16, 80); ev(pg, "GAME.step(0.4)"); shot(pg, 'nacht_holzhaus_innen')
        ck('the light followed into the hut', ev(pg, "GARTEN.cur() === 'holzhaus'"), ev(pg, "GARTEN.cur()"))
        ev(pg, "GARTEN.set('aussen', true)")
        view(pg, 'bungalow', 7.5, -2.5, 1.7, 180 + 10, -6, 62); ev(pg, "GAME.step(0.4)"); shot(pg, 'nacht_bungalow_aussenlicht')
        ck('porch lamp: the light is with it outside', ev(pg, "GARTEN.cur() === 'aussen'"), ev(pg, "GARTEN.cur()"))
        ev(pg, "GARTEN.set('aussen', false)")
        ev(pg, "GARTEN.set('bungalow', false); GARTEN.set('leselampe', false); GARTEN.set('holzhaus', false)")
        view(pg, 'bungalow', -1.0, -0.6, 1.5, -55, -12, 75)
        ev(pg, "PLAY.acts().find(a => a.id === 'garten:ofen').run(); GAME.step(3.5)"); shot(pg, 'nacht_bungalow_ofen')
        ev(pg, "PLAY.acts().find(a => a.id === 'garten:ofen').run(); GAME.step(4)")
        ev(pg, "GAME.setMode('day')")
    if want('jobs'):
        # small jobs: put the kettle on (it whistles after a while), water the seedlings in the hut
        ev(pg, "(() => { const b = SITE.bld.bungalow; GAME.view(b.c[0] - 0.85, b.c[1] + 1.4, 1.76, 0, -10); GAME.step(0.2); })()")
        lbl = ev(pg, "PLAY.acts().find(a => a.id === 'garten:kessel').label()")
        ck('kitchen: "Wasser aufsetzen" offered', lbl == 'Wasser aufsetzen', lbl)
        ev(pg, "PLAY.acts().find(a => a.id === 'garten:kessel').run(); GAME.step(10.5)")
        lbl = ev(pg, "PLAY.acts().find(a => a.id === 'garten:kessel').label()")
        ck('kitchen: the kettle boils (then "Kessel vom Herd nehmen")', lbl == 'Kessel vom Herd nehmen', lbl)
        if want('shots'):
            view(pg, 'bungalow', 1.0, 1.0, 1.6, -30, -22, 60); shot(pg, 'bungalow_kessel_kocht')
        ev(pg, "PLAY.acts().find(a => a.id === 'garten:kessel').run(); GAME.step(0.2)")
        view(pg, 'holzhaus', -0.5, -0.3, 1.98, -90, -20, 70)
        lbl = ev(pg, "PLAY.acts().find(a => a.id === 'garten:giessen').label()")
        ev(pg, "PLAY.acts().find(a => a.id === 'garten:giessen').run(); GAME.step(0.2)")
        lbl2 = ev(pg, "PLAY.acts().find(a => a.id === 'garten:giessen').label()")
        ck('hut: water the seedlings once', lbl == 'Setzlinge gießen' and lbl2 is None, [lbl, lbl2])
        view(pg, 'greenhouse', 0.6, 0.0, 1.76, 180, -20, 70)
        lbl = ev(pg, "PLAY.acts().find(a => a.id === 'garten:tomaten').label()")
        ev(pg, "PLAY.acts().find(a => a.id === 'garten:tomaten').run(); GAME.step(0.2)")
        lbl2 = ev(pg, "PLAY.acts().find(a => a.id === 'garten:tomaten').label()")
        ck('greenhouse: pick the tomatoes once', lbl == 'Tomaten ernten' and lbl2 is None, [lbl, lbl2])
        ev(pg, "(() => { const b = SITE.bld.bungalow; GAME.view(b.c[0] - 1.2, b.c[1] + 0.6, 1.76, -60, -10); GAME.step(0.2); })()")
        lbl = ev(pg, "PLAY.acts().find(a => a.id === 'garten:ofen').label()")
        ev(pg, "PLAY.acts().find(a => a.id === 'garten:ofen').run(); GAME.step(3.5)")
        ck('stove: lit, the light went to the fire', lbl == 'Feuer im Ofen anzünden' and ev(pg, "GARTEN.cur() === 'ofen' && GARTEN.light.intensity > 0"), [lbl, ev(pg, "GARTEN.cur()")])
    ok, rep = lib.check_gl(pg)
    ck('textures per shader ≤ 16, no broken program', ok, f"max {rep['maxFrag']}/{rep['maxVert']}, programs {rep['programs']}")
    ck.errors(errs)
ck.done()
