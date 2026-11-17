# feat/grenzland-alltag: the day of the village people in the mode „Grenzland“ (Ratscher, Schleusingen), the birds, the festivals.
# Free play in the mode, one area per page:
#   blick   top views of the Anger and the Markt with marker posts every 10 m (to place things; pictures only)
#   tag     the people by the clock: the morning at the Anger (the van, the school bus stop), the evening at the Feldscheune and the bus
#           stop, Sunday at St. Johannis, the clique at the fountain on the Markt, shoppers into the bakery's door; greetings, E, the API
#   fest    the festivals by the calendar (GLFESTE.debug.zu): Kirmes at night, Christmas market, Feuerwehrfest
# Pictures in out/grenzland_alltag/.   python3 viz3/test/grenzland_alltag.py 9041 [sections, comma separated]
import sys, os, json, time, urllib.request, concurrent.futures
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__))); import lib, grenzland_ci
port = sys.argv[1] if len(sys.argv) > 1 else '9041'
ONLY = set(sys.argv[2].split(',')) if len(sys.argv) > 2 else None
want = lambda s: (ONLY is None and s != 'diag') or (ONLY is not None and s in ONLY)  # diag only when named
ck = grenzland_ci.wrap(lib.Checks('grenzland_alltag'), 'grenzland_alltag')
OUT = lib.out('grenzland_alltag')
# the world tiles round the Markt and St. Johannis from the published site (as viz3/test/welt_dinge_stadt.py, laeden.py): without them the
# town stands on the coarse terrain of world/ratscher.js, drawn up to 1.7 m above KERN.ground there – people and pigeons would look sunk
SITE = os.environ.get('WELT_SITE', 'https://mynametouse.github.io/pavillon-ratscher/welt-test/')
DIST = os.path.join(lib.ROOT, 'viz3', 'dist', 'welt-test')
XF = json.load(open(os.path.join(lib.ROOT, 'viz3', 'manifests.json')))['geoman']['xf']
def utm(x, y):
    return XF['a'] * x - XF['b'] * y + XF['ex'], XF['b'] * x + XF['a'] * y + XF['ey']
def fetch_tiles(centres, half=300):
    os.makedirs(DIST, exist_ok=True)
    def get(rel):
        p = os.path.join(DIST, rel)
        if os.path.exists(p) and os.path.getsize(p) > 0:
            return 0
        os.makedirs(os.path.dirname(p), exist_ok=True)
        try:
            with urllib.request.urlopen(SITE + rel, timeout=60) as r:
                b = r.read()
        except Exception:
            return 0
        open(p, 'wb').write(b)
        return len(b)
    get('meta.json')
    try:
        meta = json.load(open(os.path.join(DIST, 'meta.json')))
    except Exception as e:
        print('note: no world tiles', e, flush=True)
        return
    lv = meta['tiling']['levels']
    jobs = set()
    for cx, cy in centres:
        cs = [utm(cx + sx * half, cy + sy * half) for sx in (-1, 1) for sy in (-1, 1)]
        for L, pad in ((10, 900), (11, 450), (12, 150)):
            s = 409600 / (1 << L)
            r = lv[str(L)]['rect']
            E0, E1 = min(c[0] for c in cs) - pad, max(c[0] for c in cs) + pad
            N0, N1 = min(c[1] for c in cs) - pad, max(c[1] for c in cs) + pad
            for x in range(int((E0 - 420700) // s), int((E1 - 420700) // s) + 1):
                for y in range(int((N0 - 5390800) // s), int((N1 - 5390800) // s) + 1):
                    if r[0] <= x <= r[2] and r[1] <= y <= r[3]:
                        jobs.add(f't/{L}/{x}/{y}.bin')
                        jobs.add(f'i/{L}/{x}/{y}.webp')
    t0 = time.time()
    with concurrent.futures.ThreadPoolExecutor(8) as ex:
        n = sum(ex.map(get, sorted(jobs)))
    print(f'welt tiles: {len(jobs)} files, {n / 1e6:.1f} MB new in {time.time() - t0:.0f} s', flush=True)
if any(want(k) for k in ('blick', 'stadt', 'voegel', 'fest', 'diag')):
    fetch_tiles([(-1084.7, 1241.9), (-1250.0, 1188.0)])
with lib.browser() as b:
    errs = []
    pg = lib.page(b, 1100, 680, errs, tier='hoch' if want('blick') else 'schnell')
    lib.boot(pg, port, '?szenario=grenzland', figures=True)
    E = pg.evaluate
    X = lambda js: pg.evaluate('(() => { ' + js + ' })(); 0')
    J = lambda js: json.loads(E("JSON.stringify(" + js + ")"))
    def steps(secs, dt=0.1):
        X(f"for (let i = 0; i < {max(1, int(round(secs / dt)))}; i++) GAME.step({dt})")
    def pic(name):
        try:
            lib.shot(pg, OUT, name)
        except Exception as e:
            print('shot failed', name, e)
    def until(cond, secs, dt=0.5, nap=0.0):
        t = 0.0
        while t < secs:
            steps(dt); t += dt
            if E(cond): return t
            if nap: time.sleep(nap)
        return None
    # free play (the scene starts mission 1): every mission done, in the garden
    for _ in range(6): steps(0.3); time.sleep(0.3)
    X("GLMISSION.stop(); const d = GLMISSION.debug; if (d && d.info) for (const id of Object.keys(d.info().st || {})) GLSTATE.m[id] = { st: 'erledigt', i: 0, n: 0 }; GLSTATE.cur = ''; GLSTATE.kap1 = true; GLHUD.fade(false); if (window.GLRADIO && GLRADIO.off) GLRADIO.off(); GAME.go('garten'); GLSTATE.save(true)")
    steps(1)
    ck('the scene runs in free play', E("GLSTATE.on && !GLSTATE.cur"))
    X("GRENZLAND.folgen && GRENZLAND.folgen(false)")
    # ------------------------------------------------------------------ blick ------------------------------------------------------------------
    if want('blick'):
        X("CLOCK.t = Math.floor(CLOCK.t / 1440) * 1440 + 12 * 60; if (DN.active) DN.update(true)")
        X("""window.MARK = (cx, cy, n) => { const T = THREE, g = new T.Group(), C = [0xff2020, 0x20ff20, 0x2060ff, 0xffff20];
          for (let i = -n; i <= n; i++) for (let j = -n; j <= n; j++) { const x = cx + i * 10, y = cy + j * 10, z = KERN.ground(x, y) || 0;
            const m = new T.Mesh(new T.BoxGeometry(i === 0 && j === 0 ? 1.2 : 0.5, 4, i === 0 && j === 0 ? 1.2 : 0.5), new T.MeshBasicMaterial({ color: C[((i + 10) % 2) + 2 * ((j + 10) % 2)] }));
            m.position.set(x, z + 2, -y); g.add(m) } GAME.scene.add(g); return g }""")
        X("window.MK = MARK(235, -110, 4); GAME.view(235, -110, KERN.ground(235, -110) + 75, 0, -89.9, 50)")
        steps(2); time.sleep(1); steps(1)
        pic('00_anger_oben')
        X("GAME.view(236, -138, KERN.ground(236, -138) + 9, 0, -14, 60)")
        steps(1); pic('00_anger_sued')
        info = J("""(() => { const H = window.DLIFE && DLIFE.homes ? DLIFE.homes() : null, o = {};
          if (H) for (const [k, h] of Object.entries(H)) o[k] = { door: h.door.map(v => Math.round(v * 10) / 10), spot: h.spot.map(v => Math.round(v * 10) / 10) };
          const seats = (GLPOSE.seats ? GLPOSE.seats() : []).map(s => [Math.round(s.x * 10) / 10, Math.round(s.y * 10) / 10, Math.round(s.hd * 100) / 100]);
          return { homes: o, seats, orte: GLORTE.P, place: [KERN.place(226, -104), KERN.place(239, -121), KERN.place(248, -102), KERN.place(230, -97)] } })()""")
        print('INFO ratscher', json.dumps(info), flush=True)
        X("GAME.scene.remove(MK); GAME.view(-1084.7, 1241.9, 400, 0, -30)")
        ok = until("window.SCHL && SCHL.state === 'ready'", 240, 1.0, 0.5)
        print('schleusingen ready after', ok, flush=True)
        X("window.MK = MARK(-1085, 1235, 4); GAME.view(-1085, 1235, KERN.ground(-1085, 1235) + 75, 0, -89.9, 50)")
        steps(2); time.sleep(1); steps(1)
        pic('00_markt_oben')
        info = J("""(() => { const S = window.SCHL, I = window.SINNEN, M = [-1085, 1235];
          const doors = I && I.doors ? [...I.doors.values()].filter(h => h.shop && Math.hypot(h.door.x - M[0], h.door.y - M[1]) < 260).map(h => [h.id, h.shop, Math.round(h.door.x * 10) / 10, Math.round(h.door.y * 10) / 10, Math.round(h.door.nx * 100) / 100, Math.round(h.door.ny * 100) / 100]) : null;
          return { fountain: S.fountain, benches: (S.benchSpots || []).filter(b => Math.hypot(b.x - M[0], b.y - M[1]) < 60).map(b => [Math.round(b.x * 10) / 10, Math.round(b.y * 10) / 10, Math.round(b.z * 100) / 100, Math.round(b.yaw)]), doors, sinnen: I ? I.state : null } })()""")
        print('INFO schleusingen', json.dumps(info), flush=True)
        X("GAME.view(-1250, 1176, KERN.ground(-1250, 1176) + 6, 0, -10, 60)")
        steps(1); pic('00_kirche')
    # ------------------------------------------------------------------ helpers for the people ------------------------------------------------------------------
    # what is drawn under (x, y): a ray from above onto the visible meshes (birds and the mode's own things left out), the tiles marked
    X("""window.TD = (x, y) => { const T = THREE, rc = new T.Raycaster(new T.Vector3(x, 400, -y), new T.Vector3(0, -1, 0), 0, 800); rc.camera = GAME.cam;
      const L = []; GAME.scene.traverse(o => { if (o.isMesh && !o.isSkinnedMesh && o.visible && !/voegel|grenzland/.test(o.name || '')) L.push(o) });
      const hits = rc.intersectObjects(L, false);
      const tiles = new Set([...WELT.tiles.values()].map(t => t.mesh).filter(Boolean)), h0 = hits[0];
      return { ground: KERN.ground(x, y), hit: h0 ? h0.point.y : null, what: h0 ? (h0.object.name || h0.object.type) + (tiles.has(h0.object) ? ' [tile]' : '') + (h0.object.parent && h0.object.parent.name ? ' in ' + h0.object.parent.name : '') : null,
        tile: (hits.find(h => tiles.has(h.object)) || {}).point?.y ?? null } }; 0""")
    X("""window.TA = {
      // a view of (x, y) from d metres, h above the ground: the first direction (from az round) with a clear line and not indoors
      blick(x, y, az, d, h, pitch) { for (const dd of [d, d * 0.7, d * 1.3]) for (let i = 0; i < 12; i++) { const a = (az + (i % 2 ? 1 : -1) * Math.ceil(i / 2) * 30) * Math.PI / 180, cx = x - Math.sin(a) * dd, cy = y - Math.cos(a) * dd;
          if (KERN.inside(cx, cy, KERN.ground(cx, cy) + 1.5) || !GLFAHNDUNG.los(cx, cy, x, y)) continue; GAME.view(cx, cy, KERN.ground(cx, cy) + h, a * 180 / Math.PI, pitch ?? -6); return true } return false },
      st: () => GLALLTAG.debug.stand(),
      an: platz => GLALLTAG.leute().filter(q => q.platz === platz && q.gezeigt).map(q => q.id),
      // arrived (standing or sitting at the spot) at a place
      da: platz => GLALLTAG.leute().filter(q => q.platz === platz && q.gezeigt && GLALLTAG.debug.stand().st[q.id] === 'da').map(q => q.id),
      // the view on people: d metres from their middle, from the side az (round it if blocked)
      zeig(ids, az, d, h) { const P2 = ids.map(id => GLALLTAG.debug.hin(id)).filter(Boolean); if (!P2.length) return false;
        const x = P2.reduce((a, q) => a + q[0], 0) / P2.length, y = P2.reduce((a, q) => a + q[1], 0) / P2.length; return TA.blick(x, y, az, d || 8, h || 1.65, -3) } }; 0""")
    def warte_figuren(cond, secs=90):
        # the figures load asynchronously (real time), the game is stepped meanwhile (the clock runs in real time: CLOCK 'real')
        for _ in range(int(secs / 0.8)):
            steps(0.4, 0.1); time.sleep(0.4)
            if E(cond): return True
        return False
    X("CLOCK.setRate('real'); GAME.setView3 && GAME.setView3(false)")
    st0 = J("({ geo: GAME.R.info.memory.geometries, tex: GAME.R.info.memory.textures, prog: GAME.R.info.programs.length, figs: GLFIG.figs.length })")
    # ------------------------------------------------------------------ tag: Ratscher by the clock ------------------------------------------------------------------
    if want('tag'):
        L = J("GLALLTAG.leute()")
        ck('tag: the API lists the village people (12 of Ratscher, 5 of Schleusingen) with place and doing',
           len(L) == 17 and all(k in L[0] for k in ('id', 'name', 'ort', 'x', 'y', 'tun')) and sum(1 for q in L if q['ort'] == 'ratscher') >= 10, str(L[:2]))
        ck('tag: person() by name and id, linien() for the recordings', E("GLALLTAG.person('Ingrid').id === 'ingrid' && GLALLTAG.person('anja').name === 'Anja' && GLALLTAG.person('Hubert') === null && GLALLTAG.linien().length > 150"))
        # the school bus stop on a Tuesday morning
        X("GLALLTAG.debug.zeit(6 * 60 + 57, 2); TA.blick(248.4, -102.4, 20, 16, 1.65, -4)")
        ok = warte_figuren("TA.an('haltestelle').length >= 2", 90)
        ck('tag: Lea and Max wait at the school bus stop at 6:57 on a school day', ok, json.dumps(J("TA.st()"))[:400])
        ok = warte_figuren("TA.da('haltestelle').length >= 2", 120)
        ck('tag: … they walked there along the street and stand at the stop', ok, json.dumps(J("TA.st()"))[:300])
        X("TA.zeig(['lea', 'max'], 200, 7)")
        steps(2, 0.1)
        pic('01_schulbus')
        # the van's morning: Ingrid queues every working morning
        X("GLALLTAG.debug.zeit(8 * 60 + 22, 2); TA.blick(237, -121.5, 300, 13, 1.65, -5)")
        ok = warte_figuren("TA.an('wagen').length >= 1", 60)
        ck('tag: Ingrid comes to the shop on wheels at 8:22', ok, json.dumps(J("TA.st()"))[:400])
        ok = warte_figuren("TA.st().st.ingrid === 'da'", 150)
        ck('tag: … and queues there', ok, json.dumps(J("TA.st()"))[:300])
        gone = E("!TA.an('haltestelle').length")
        ck('tag: the school bus has taken the two (none at the stop later)', gone, str(J("TA.an('haltestelle')")))
        # a greeting when one passes (counted from here: the view of the van comes within 6.5 m of some), and E
        n0 = J("TA.st().n.gruss")
        X("TA.zeig(TA.da('wagen'), 160, 7)")
        steps(3, 0.1)
        pic('02_morgen_wagen')
        X("const F = GLALLTAG.debug.hin('ingrid'); GAME.view(F[0] - 3.2, F[1] - 2.5, KERN.ground(F[0] - 3.2, F[1] - 2.5) + 1.65, Math.atan2(3.2, 2.5) * 180 / Math.PI, -5)")
        until(f"TA.st().n.gruss > {n0}", 8, 0.5)  # one greeting at a time, six seconds apart
        steps(1, 0.1)
        g = J("TA.st()")
        ck('tag: passing by, the people at the van greet (neutral without the agent ruf: „Morgen.“)', g['n']['gruss'] > n0 and g['gruesse'] and g['gruesse'][-1]['text'] == 'Morgen.', str(g['gruesse'][-3:]))
        X("const F = GLALLTAG.debug.hin('ingrid'); GAME.view(F[0] - 1.2, F[1] - 1.0, KERN.ground(F[0] - 1.2, F[1] - 1.0) + 1.65, Math.atan2(1.2, 1.0) * 180 / Math.PI, -5)")
        steps(0.3, 0.1)
        lab = E("(KERN.acts().find(a => a.id === 'gl-alltag') || { label: () => null }).label()")
        txt = E("GLALLTAG.reden()")
        ck('tag: E by the people at the van: „Reden mit …“ and a line', bool(lab) and lab.startswith('Reden mit ') and isinstance(txt, str) and len(txt) > 5, f'{lab} | {txt}')
        steps(2, 0.1)
        pic('03_reden')
        # the cost per frame of the module (the numbers of everybody, the figures' behaviour)
        ms = E("(() => { const t0 = performance.now(); for (let i = 0; i < 200; i++) GLALLTAG.tick(0.016); return (performance.now() - t0) / 200 })()")
        mem = J("({ geo: GAME.R.info.memory.geometries, tex: GAME.R.info.memory.textures, prog: GAME.R.info.programs.length, figs: GLFIG.figs.length })")
        print('cost per tick', round(ms, 3), 'ms; memory before', st0, 'with figures', mem, flush=True)
        ck('tag: cheap per frame (< 1.5 ms per tick here, SwiftShader)', ms < 1.5, f'{ms:.3f} ms')
        ck('tag: no new shader program for the people', mem['prog'] - st0['prog'] <= 2, f"{st0['prog']} → {mem['prog']}")
        # the textures of the drawn village people (decoded, RGBA, without mipmaps): the share of this module on a phone's memory
        tm = J("""(() => { const seen = new Set(); let mb = 0, n = 0; for (const F of GLFIG.figs.filter(f => f.alltag)) { n++; F.g.traverse(o => { for (const m of o.material ? [].concat(o.material) : []) for (const k in m) { const t = m[k];
          if (t && t.isTexture && t.source && !seen.has(t.source)) { seen.add(t.source); const im = t.source.data; if (im && im.width) mb += im.width * im.height * 4 / 1e6 } } }) } return { n, mb: Math.round(mb) } })()""")
        print('textures of the village people', tm, flush=True)
        ck('tag: the figures cost < 20 MB of textures each', tm['n'] == 0 or tm['mb'] / tm['n'] < 20, str(tm))
        # the evening at the Feldscheune: skittles on a Wednesday in September
        X("GLALLTAG.debug.zeit(19 * 60 + 25, 3); const T = GLORTE.P.kegel; TA.blick(T[0] + 2, T[1] + 1.5, 200, 14, 1.65, -5)")
        ok = warte_figuren("TA.an('treff').length >= 2", 120)
        ck('tag: Wednesday 19:25 – skittles at the Feldscheune', ok, json.dumps(J("TA.st()"))[:400])
        ok = warte_figuren("TA.da('treff').length >= 2", 150)
        X("TA.zeig(TA.da('treff'), 200, 7)")
        steps(3, 0.1)
        pic('04_feldscheune_abend')
        # the base game's evening first: on Friday at eight the seven are at the Skat evening in the old school (dorf/), none drawn twice
        X("GLALLTAG.debug.zeit(20 * 60, 5); TA.blick(236, -95, 180, 14, 1.65, -5)")
        steps(2, 0.1)
        j = J("TA.st().jetzt")
        ck('tag: Friday 20:00 – Ingrid and Manfred are the base game’s (Skat evening), not drawn by the mode', j.get('ingrid', '').startswith('schule:skat:basis') and 'ingrid' not in J("TA.st().gezeigt"), str(j.get('ingrid')))
        ok = warte_figuren("TA.da('haltestelle').length >= 1", 120)
        if ok: X("TA.zeig(TA.da('haltestelle'), 220, 7)")
        steps(2, 0.1)
        pic('05_freitagabend')
        # Anja's round at a quarter past nine
        X("GLALLTAG.debug.zeit(21 * 60 + 18, 5)")
        ok = warte_figuren("TA.an('runde').length >= 1 && TA.st().st.anja === 'hin'", 90)
        ck('tag: Anja walks her round of the Anger in the evening', ok, json.dumps(J("TA.st()"))[:300])
        if ok:
            steps(6, 0.1)
            X("TA.zeig(['anja'], 300, 9)")
            steps(0.5, 0.1)
            pic('05b_abendrunde')
        # night: nobody
        X("GLALLTAG.debug.zeit(2 * 60, 4); GAME.view(226, -110, KERN.ground(226, -110) + 1.65, 0, -5)")
        ok = warte_figuren("TA.st().gezeigt.length === 0", 60)
        ck('tag: at two in the night nobody of them is out', ok, str(J("TA.st().gezeigt")))
        st = J("TA.st()")
        ck('tag: no errors in the module', not st['err'], str(st['err']))
    # ------------------------------------------------------------------ stadt: Schleusingen by the clock ------------------------------------------------------------------
    if want('stadt'):
        X("GAME.view(-1084.7, 1225, 400, 0, -30)")
        ok = until("window.SCHL && SCHL.state === 'ready' && window.SINNEN && SINNEN.state === 'ready'", 300, 1.0, 0.5)
        ck('stadt: Schleusingen and its shop doors are there', bool(ok), E("[window.SCHL && SCHL.state, window.SINNEN && SINNEN.state].join()"))
        # Saturday evening: the clique by the fountain on the Markt
        X("GLALLTAG.debug.zeit(20 * 60 + 10, 6); const f = SCHL.fountain; TA.blick(f[0] + 5.2, f[1] - 0.8, 250, 15, 1.65, -5)")
        ok = warte_figuren("TA.an('marktmitte').length >= 2", 150)
        ck('stadt: Saturday 20:10 – the young ones by the fountain on the Markt', ok, json.dumps(J("TA.st()"))[:400])
        ok = warte_figuren("TA.da('marktmitte').length >= 2", 150)
        X("TA.zeig(TA.da('marktmitte'), 250, 8)")
        steps(3, 0.1)
        pic('06_markt_clique')
        # Sunday: before church and after it at the south door of St. Johannis
        X("GLALLTAG.debug.zeit(9 * 60 + 48, 0); TA.blick(-1250.2, 1187.9, 0, 14, 1.65, -3)")
        ok = warte_figuren("TA.da('kirche').length >= 2", 200)
        ck('stadt: Sunday 9:48 – people before St. Johannis', ok, json.dumps(J("TA.st()"))[:400])
        X("TA.zeig(TA.da('kirche'), 200, 9)")
        steps(2, 0.1)
        pic('07_kirche_vor')
        X("GLALLTAG.debug.zeit(9 * 60 + 58)")
        ok = warte_figuren("TA.an('kirche').length === 0", 90)
        ck('stadt: at 9:58 they go in at the door', ok and J("TA.st().n.tuer") >= 1, json.dumps(J("TA.st()"))[:300])
        X("GLALLTAG.debug.zeit(11 * 60 + 1)")
        ok = warte_figuren("TA.an('kirche').length >= 2", 120)
        steps(4, 0.1)
        ck('stadt: at 11:01 they come out and stand about', ok, json.dumps(J("TA.st()"))[:300])
        pic('08_kirche_nach')
        # a Monday morning: Bärbel goes to the café's (or a bakery’s) door and in
        # (her slot moves a few minutes from day to day: the first minute she is on her way)
        w = None
        for mi in (8, 12, 16, 20):
            X(f"GLALLTAG.debug.zeit(9 * 60 + {mi}, 1)")
            steps(1, 0.1)
            w = J("GLALLTAG.debug.wo('baerbel')")
            if w and w.get('tuer') and w.get('platz') == 'baecker': break
        ck('stadt: Monday morning – Bärbel heads for the door of the bakery or the café', bool(w and w.get('tuer') and w.get('platz') == 'baecker'), str(w)[:300])
        if w and w.get('tuer'):
            X(f"TA.blick({w['tuer']['x']}, {w['tuer']['y']}, 200, 16, 1.65, -4)")
            n0 = J("TA.st().n.tuer")
            ok = warte_figuren(f"TA.st().n.tuer > {n0}", 180)
            ck('stadt: and goes in at the door (gone there)', ok, json.dumps(J("TA.st()"))[:300])
            pic('09_laden_tuer')
        st = J("TA.st()")
        ck('stadt: no errors in the module', not st['err'], str(st['err']))
    # ------------------------------------------------------------------ voegel: the birds (base game – the same in the mode) ------------------------------------------------------------------
    if want('voegel'):
        # sparrows at the hedges of the Anger on a Tuesday morning
        X("GLALLTAG.debug.zeit(10 * 60, 2); GAME.view(236, -104.6, KERN.ground(236, -104.6) + 1.2, 180, -18)")
        ok = until("(VOEGEL.stand().aktiv.spatz || 0) > 0", 20, 0.5)
        ck('voegel: sparrows at the hedges of the Anger by day', bool(ok), str(J("VOEGEL.stand()")))
        X("const b = VOEGEL.debug.voegel('spatz').find(q => q.st === 'boden') || VOEGEL.debug.voegel('spatz')[0]; GAME.view(b.x - 4.4, b.y - 3.3, KERN.ground(b.x - 4.4, b.y - 3.3) + 0.8, Math.atan2(4.4, 3.3) * 180 / Math.PI, -6)")
        steps(0.6, 0.05)
        pic('20_spatzen')
        prog0 = E("GAME.R.info.programs.length")
        # walking at them: they dart into the hedge
        X("const b = VOEGEL.debug.voegel('spatz')[0]; GAME.view(b.x - 0.8, b.y - 0.6, KERN.ground(b.x - 0.8, b.y - 0.6) + 1.6, 50, -10)")
        ok = until("VOEGEL.stand().versteckt > 0", 6, 0.1)
        ck('voegel: come near and the sparrows hide in the hedge', bool(ok), str(J("VOEGEL.stand()")))
        # crows over the fields by day, out of the village
        X("GAME.view(330, -40, KERN.ground(330, -40) + 1.7, 90, 12)")
        ok = until("(VOEGEL.stand().aktiv.kraehe || 0) > 0", 10, 0.5)
        ck('voegel: crows circle over the land by day', bool(ok), str(J("VOEGEL.stand()")))
        X("const b = VOEGEL.debug.voegel('kraehe'); const c = b[0]; GAME.view(c.x - 40, c.y - 30, KERN.ground(c.x - 40, c.y - 30) + 1.7, Math.atan2(40, 30) * 180 / Math.PI, 18)")
        steps(1, 0.05)
        pic('21_kraehen')
        # swallows (forced: the story's September is past their time) over the Anger
        X("VOEGEL.debug.an('schwalbe', true); GAME.view(222, -128, KERN.ground(222, -128) + 1.7, 20, 4)")
        steps(1.5, 0.05)
        ck('voegel: swallows fly over the Anger (forced)', (J("VOEGEL.stand()")['aktiv'].get('schwalbe') or 0) > 0, str(J("VOEGEL.stand()")))
        pic('22_schwalben')
        X("VOEGEL.debug.an('schwalbe', null)")
        # starlings at dusk in September
        X("const s = DN.riseSet(CLOCK.t, 'sun'); GLALLTAG.debug.zeit(Math.round(s.down - 25)); GAME.view(300, -60, KERN.ground(300, -60) + 1.7, 0, 10)")
        ok = until("(VOEGEL.stand().aktiv.star || 0) > 0", 10, 0.5)
        ck('voegel: a flock of starlings at dusk in autumn', bool(ok), str(J("VOEGEL.stand()")))
        if ok:
            X("const b = VOEGEL.debug.voegel('star'); let x = 0, y = 0; for (const q of b) { x += q.x; y += q.y } x /= b.length; y /= b.length; GAME.view(x - 120, y - 90, KERN.ground(x - 120, y - 90) + 1.7, Math.atan2(120, 90) * 180 / Math.PI, 16)")
            steps(1, 0.05)
            pic('23_stare')
        prog1 = E("GAME.R.info.programs.length")
        # pigeons on the Markt of Schleusingen: they flutter up when one comes close and come down again
        X("GLALLTAG.debug.zeit(11 * 60, 2); GAME.view(-1084.7, 1225, 400, 0, -30)")
        ok = until("window.SCHL && SCHL.state === 'ready'", 300, 1.0, 0.5)
        ok = until("(VOEGEL.stand().aktiv.taube || 0) > 0", 20, 0.5)
        ck('voegel: pigeons on the Markt by day', bool(ok), str(J("VOEGEL.stand()")))
        steps(2, 0.1)
        gd = J("VOEGEL.debug.voegel('taube').filter(q => q.st === 'boden').slice(0, 6).map(b => { const t = TD(b.x, b.y); return [t.tile === null ? null : +(b.z - t.tile).toFixed(2), t.what] })")
        dz = [d[0] for d in gd if d[0] is not None]
        if dz:
            ck('voegel: the pigeons stand on the Markt as it is drawn (a ray from above meets the tiles within 0.25 m of their feet)', all(abs(v) <= 0.25 for v in dz), str(gd))
        else:
            print('note: no world tiles drawn under the pigeons – their ground check skipped', str(gd), flush=True)
        X("const b = VOEGEL.debug.voegel('taube'); const c = b[0]; GAME.view(c.x - 5, c.y - 4, KERN.ground(c.x - 5, c.y - 4) + 1.3, Math.atan2(5, 4) * 180 / Math.PI, -12)")
        steps(0.5, 0.05)
        pic('24_tauben')
        X("const b = VOEGEL.debug.voegel('taube'); const c = b[0]; GAME.view(c.x - 1.2, c.y - 1.0, KERN.ground(c.x - 1.2, c.y - 1.0) + 1.65, Math.atan2(1.2, 1.0) * 180 / Math.PI, 10)")
        ok = until("VOEGEL.stand().flug > 3", 4, 0.1)
        steps(1.2, 0.05)
        ck('voegel: come close and the pigeons flutter up', bool(ok) and J("VOEGEL.stand().auf") >= 1, str(J("VOEGEL.stand()")))
        pic('25_tauben_auf')
        X("GAME.view(-1084.7, 1200, KERN.ground(-1084.7, 1200) + 1.7, 0, 0)")
        ok = until("VOEGEL.stand().flug === 0", 60, 0.5)
        ck('voegel: and come down again on the square when nobody is near', bool(ok), str(J("VOEGEL.stand()")))
        st = J("VOEGEL.stand()")
        mats = J("[...new Set(GAME.scene.children.filter(o => /^voegel /.test(o.name)).map(o => o.material.uuid))].length")
        ck('voegel: cheap (< 0.6 ms per frame here), one shared material for all kinds, no new shader program for crows, swallows, starlings',
           st['ms'] < 0.6 and prog1 - prog0 <= 1 and mats == 1 and not st['err'], f"{st['ms']} ms, programs {prog0} → {prog1}, materials {mats}, err {st['err']}")
    # ------------------------------------------------------------------ diag: the ground under birds and people vs. what is drawn ------------------------------------------------------------------
    if want('diag'):
        X("GLALLTAG.debug.zeit(11 * 60, 2); GAME.view(236, -112, KERN.ground(236, -112) + 1.7, 0, -5)")
        until("(VOEGEL.stand().aktiv.spatz || 0) > 0", 20, 0.5)
        sp = J("VOEGEL.debug.voegel('spatz').slice(0, 4).map(b => Object.assign({ bz: b.z }, TD(b.x, b.y)))")
        print('DIAG spatzen', json.dumps(sp), flush=True)
        X("const b = VOEGEL.debug.voegel('spatz').find(q => q.st === 'boden'); if (b) GAME.view(b.x - 4.4, b.y - 3.3, KERN.ground(b.x - 4.4, b.y - 3.3) + 0.7, Math.atan2(4.4, 3.3) * 180 / Math.PI, -6)")
        steps(0.3, 0.05)
        pic('40_spatz_nah')
        X("GAME.view(-1084.7, 1225, 400, 0, -30)")
        until("window.SCHL && SCHL.state === 'ready'", 300, 1.0, 0.5)
        until("(VOEGEL.stand().aktiv.taube || 0) > 0", 20, 0.5)
        steps(3, 0.1)
        tb = J("VOEGEL.debug.voegel('taube').slice(0, 5).map(b => Object.assign({ bz: b.z, st: b.st }, TD(b.x, b.y)))")
        print('DIAG tauben', json.dumps(tb), flush=True)
        X("const b = VOEGEL.debug.voegel('taube').find(q => q.st === 'boden'); if (b) GAME.view(b.x - 3.6, b.y - 2.7, KERN.ground(b.x - 3.6, b.y - 2.7) + 0.9, Math.atan2(3.6, 2.7) * 180 / Math.PI, -8)")
        steps(0.3, 0.05)
        pic('41_taube_nah')
        mk = J("[[-1079.5, 1241.1], [-1091.7, 1238.6], [-1100.3, 1249.5], [-1070, 1230], [-1060, 1250], [-1250, 1188], [-1040, 1245]].map(q => Object.assign({ x: q[0], y: q[1], pad: WELT.padAt ? WELT.padAt(q[0], q[1], KERN.ground(q[0], q[1])) : null, floor: GAME.floorAt(q[0], q[1], KERN.ground(q[0], q[1]) + 3) }, TD(q[0], q[1])))")
        print('DIAG markt', json.dumps(mk), flush=True)
        # where the player stands when put there
        X("GAME.view(-1079.5, 1236, KERN.ground(-1079.5, 1236) + 3.5, 0, 0)")
        steps(3, 0.1)
        print('DIAG spieler', json.dumps(J("({ feet: GAME.P.feet, ground: KERN.ground(GAME.P.x, GAME.P.y), hit: TD(GAME.P.x, GAME.P.y).hit })")), flush=True)
    # ------------------------------------------------------------------ fest: the festivals by the calendar ------------------------------------------------------------------
    if want('fest'):
        X("window.TF = []; KERN.on('grenzland:fest', d => TF.push(d)); GAME.setSound && GAME.setSound(true)")
        # the songs in the sound repository through the test server's own /pavillon-ton/ (tools/csp/cspserve.py), as on GitHub Pages
        X("window.GLTON_BASE = location.origin + '/pavillon-ton/'")
        k = J("GLFESTE.kalender()")
        ck('fest: the calendar – Kirmes on Saturday 10 October first, then Sunday, then the Christmas market', [q['id'] for q in k[:3]] == ['kirmes', 'kirmes', 'weihnachtsmarkt'] and 'Sa. 10. Oktober' in k[0]['text'], str(k[:3]))
        # the Kirmes on Saturday evening round the Dorflinde
        X("GLFESTE.debug.zu('kirmes', 20 * 60 + 30); GAME.view(217, -96, KERN.ground(217, -96) + 1.65, 180, -4)")
        ok = until("GLFESTE.debug.stand().bau === 'kirmes'", 20, 0.5)
        st = J("GLFESTE.debug.stand()")
        ck('fest: the Kirmes stands round the Dorflinde (stalls on free ground, the Kirmesbaum)', bool(ok) and len(st['staende']) >= 3 and st['baum'] and not st['err'], str(st))
        ck('fest: „grenzland:fest“ { id: kirmes, an: true } and GLFESTE.aktiv()', any(d.get('id') == 'kirmes' and d.get('an') for d in J("TF")) and (J("GLFESTE.aktiv()") or {}).get('id') == 'kirmes', str(J("TF")) + ' ' + str(J("GLFESTE.aktiv()")))
        ck('fest: a crowd to hide in at the middle (deckung)', E("GLFESTE.deckung(217, -109)") > 0.5, str(E("GLFESTE.deckung(217, -109)")))
        ok = warte_figuren("TA.da('fest').length >= 3", 200)
        ck('fest: the village comes to the Kirmes (at least three there, the stall keepers behind their stalls)', ok, json.dumps(J("TA.st()"))[:400])
        X("GAME.view(217, -94.5, KERN.ground(217, -94.5) + 2.2, 180, -6)")
        steps(2, 0.1)
        pic('30_kirmes_nacht')
        X("TA.zeig(TA.da('fest'), 160, 7)")
        steps(1, 0.1)
        pic('31_kirmes_leute')
        # buying at the grill (or the first stall that sells something)
        g0 = E("GLSTATE.geld")
        X("""const B = GLFESTE.debug.stand(); const s = B.staende.find(q => q[0] === 'grill') || B.staende[0];
          const c = [217, -109], a = Math.atan2(c[0] - s[1], c[1] - s[2]); const x = s[1] + Math.sin(a) * 1.6, y = s[2] + Math.cos(a) * 1.6;
          GAME.view(x, y, KERN.ground(x, y) + 1.65, (a + Math.PI) * 180 / Math.PI, -8)""")
        steps(0.4, 0.1)
        lab = E("(KERN.acts().find(a => a.id === 'gl-fest-0') || { label: () => null }).label()")
        X("const a = KERN.acts().find(a => a.id === 'gl-fest-0'); a && a.label() && a.run()")
        steps(0.5, 0.1)
        ck('fest: E at a stall buys (a Rostbratwurst for 3 €)', bool(lab) and E("GLSTATE.geld") < g0, f'{lab} {g0} → {E("GLSTATE.geld")}')
        mu = J("GLFESTE.debug.stand().musik")
        ck('fest: a polka of the Kirmeswelle plays through one media element', bool(mu and mu.get('datei')), str(mu))
        # the Christmas market on the Markt of Schleusingen, an Advent Saturday at six
        X("GLFESTE.debug.zu('weihnachtsmarkt', 18 * 60); GAME.view(-1084.7, 1220, 400, 0, -30)")
        ok = until("window.SCHL && SCHL.state === 'ready' && GLFESTE.debug.stand().bau === 'weihnachtsmarkt'", 300, 1.0, 0.5)
        st = J("GLFESTE.debug.stand()")
        ck('fest: the Christmas market stands round the fountain on the Markt', bool(ok) and len(st['staende']) >= 3 and not st['err'], str(st))
        # the view: from the south across the square to the huts – a clear line to a point inside the ring (the fountain's own middle
        # is inside its basin, no line reaches it), else straight from 20 m south
        BLICK_WM = "const f = SCHL.fountain; if (!TA.blick(f[0], f[1] - 4.5, 0, 16, 1.7, -3)) GAME.view(f[0], f[1] - 20, KERN.ground(f[0], f[1] - 20) + 1.7, 0, -4)"
        X(BLICK_WM)
        warte_figuren("TA.da('fest').length >= 2", 150)
        X(BLICK_WM)
        steps(0.5, 0.1)
        pic('32_weihnachtsmarkt')
        # the carols (Kevin MacLeod, in the sound repository) – where the repository answers; else the music box
        until("/^wm_/.test(String((GLFESTE.debug.stand().musik || {}).datei || ''))", 30, 0.5, 0.2)
        mu = J("GLFESTE.debug.stand().musik")
        erreichbar = E("fetch(GLRDATA.ton() + 'radio/wm_tannenbaum.mp3', { method: 'HEAD' }).then(r => r.ok, () => false)")
        ck('fest: the Christmas market plays a carol from the sound repository' + ('' if erreichbar else ' (repository not reachable here: the music box)'),
           (not erreichbar) or str((mu or {}).get('datei') or '').startswith('wm_'), str(mu))
        # the Feuerwehrfest on a July evening by the old school
        X("GLFESTE.debug.zu('feuerwehrfest', 21 * 60 + 40); GAME.view(229.5, -112, KERN.ground(229.5, -112) + 1.8, 0, -4)")
        ok = until("GLFESTE.debug.stand().bau === 'feuerwehrfest'", 30, 0.5)
        st = J("GLFESTE.debug.stand()")
        ck('fest: the Feuerwehrfest stands by the old school', bool(ok) and len(st['staende']) >= 2 and not st['err'], str(st))
        warte_figuren("TA.da('fest').length >= 2", 150)
        steps(2, 0.1)
        pic('33_feuerwehrfest')
        X("GRENZLAND.stop()")
        steps(1, 0.1)
        ck('fest: after „Beenden“ no festival is left in the world', J("GLFESTE.debug.stand()")['bau'] is None and E("!GAME.scene.children.some(o => o.name === 'grenzland fest')"), str(J("GLFESTE.debug.stand()")))
    ck.errors(errs)
    ck.done()
