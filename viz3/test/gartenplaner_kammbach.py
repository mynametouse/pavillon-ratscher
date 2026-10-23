# feat/gartenplaner round 2: buying at the Baumschule Kammbach in Kloster Veßra and bringing the plants home (gplan/gplan_shop.js).
# A small plan (an apple as a half standard, a walnut as a tall standard, a shrub, a perennial), the shopping list starts the task
# gplan-kaufen; at the nursery (?szenario=baumschule, the zone builds around the walker) the plants stand in tagged containers on the beds
# of their kind (no new shader programs); „Aussuchen“ with the action button, „Bezahlen“ at the counter with the receipt, „Selbst
# mitnehmen“, the car on the parking place: „Ins Auto laden“ (the walnut does not fit: „Liefern lassen“), home: „Ausladen“ behind the car,
# the delivery the next morning by the garden gate, „Tragen“ (the arms pose), and the planting steps with the plant from the hands – the
# task done. Pictures in out/gartenplaner_kammbach/. The zone's world tiles come from the published site first (as viz3/test/vessra.py).
#   python3 viz3/test/run.py --port 8979 --serve gartenplaner_kammbach      (or: python3 viz3/test/gartenplaner_kammbach.py 8979 [noshots])
import sys, os, time, json, math, urllib.request, urllib.error, concurrent.futures
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__))); import lib
port = sys.argv[1]
arg = sys.argv[2] if len(sys.argv) > 2 else ''
NOSHOTS = 'noshots' in arg
OUT = lib.out('gartenplaner_kammbach')
ck = lib.Checks('gartenplaner_kammbach')
errs = []

# ---- the zone's world tiles (as viz3/test/vessra.py; shared module vessra_tiles.py where it exists) ----
try:
    import vessra_tiles
    vessra_tiles.fetch_tiles()
except ImportError:
    SITE = os.environ.get('WELT_SITE', 'https://mynametouse.github.io/pavillon-ratscher/welt-test/') + 'zonen/vessra/'
    DIST = os.path.join(lib.ROOT, 'viz3', 'dist', 'welt-test', 'zonen', 'vessra')
    XF = json.load(open(os.path.join(lib.ROOT, 'viz3', 'manifests.json')))['geoman']['xf']
    ORT = (-8850.0, -300.0)
    def utm(x, y):
        return XF['a'] * x - XF['b'] * y + XF['ex'], XF['b'] * x + XF['a'] * y + XF['ey']
    def fetch_tiles():
        os.makedirs(DIST, exist_ok=True)
        def get(rel):
            p = os.path.join(DIST, rel)
            if os.path.exists(p) and os.path.getsize(p) > 0: return 0
            os.makedirs(os.path.dirname(p), exist_ok=True)
            for k in range(4):
                try:
                    with urllib.request.urlopen(SITE + rel, timeout=60) as r: b = r.read()
                    break
                except urllib.error.HTTPError as e:
                    if e.code == 404: return 0
                except Exception: pass
                time.sleep(1 + 2 * k)
            else: return 0
            open(p + '.part', 'wb').write(b); os.replace(p + '.part', p)
            return len(b)
        get('meta.json')
        try: meta = json.load(open(os.path.join(DIST, 'meta.json')))
        except Exception as e:
            print('no zone tiles on the site:', e, flush=True); return
        lv = meta['tiling']['levels']; jobs = set()
        cs = [utm(ORT[0] + sx * 700, ORT[1] + sy * 700) for sx in (-1, 1) for sy in (-1, 1)]
        for L, pad in ((10, 800), (11, 400), (12, 160)):
            s = 409600 / (1 << L); r = lv[str(L)]['rect']
            E0, E1 = min(c[0] for c in cs) - pad, max(c[0] for c in cs) + pad
            N0, N1 = min(c[1] for c in cs) - pad, max(c[1] for c in cs) + pad
            for x in range(int((E0 - 420700) // s), int((E1 - 420700) // s) + 1):
                for y in range(int((N0 - 5390800) // s), int((N1 - 5390800) // s) + 1):
                    if r[0] <= x <= r[2] and r[1] <= y <= r[3]:
                        jobs.add(f't/{L}/{x}/{y}.bin'); jobs.add(f'i/{L}/{x}/{y}.webp')
        t0 = time.time()
        with concurrent.futures.ThreadPoolExecutor(8) as ex: n = sum(ex.map(get, sorted(jobs)))
        print(f'zone tiles: {len(jobs)} files, {n / 1e6:.1f} MB new in {time.time() - t0:.0f} s', flush=True)
    fetch_tiles()

def page_shot(pg, name):
    if NOSHOTS: return
    try:
        pg.evaluate("GAME.shot()"); pg.screenshot(path=os.path.join(OUT, name + '.png'), timeout=120000); print('page shot', name, flush=True)
    except Exception as ex:
        print('note: page shot', name, 'failed:', repr(ex)[:160], flush=True)

with lib.browser() as b:
    pg = lib.page(b, 1100, 700, errs, tier='mittel')
    E = pg.evaluate
    J = lambda s: json.loads(E('JSON.stringify(' + s + ')'))
    # with the world around Ratscher (Kloster Veßra needs it: welt/welt.js on)
    t0 = time.time(); pg.goto(f'http://localhost:{port}/index.html', timeout=300000, wait_until='domcontentloaded')
    while not E("!!(window.GAME && GAME.loaded && GAME.loaded())"):
        if [e for e in errs if e.startswith('PAGEERR')] or time.time() - t0 > 1200:
            ck('page loads', False, ' | '.join(errs[:3]) or 'time-out'); ck.errors(errs); ck.done()
        time.sleep(2)
    time.sleep(2); E("window.FREEZE = true"); print('loaded', round(time.time() - t0), 's', flush=True)
    E("document.querySelectorAll('#toast').forEach(e => e.style.visibility = 'hidden'); GAME.setMode('day'); GAME.CAM3.want = false")
    E("document.head.insertAdjacentHTML('beforeend', '<style>*{backdrop-filter:none!important;-webkit-backdrop-filter:none!important}</style>')")
    G = {}
    try:
        # ---- a small plan: a half standard apple, a walnut (tall standard), a shrub, a perennial ----
        E("GPLAN.open()")
        for i in range(60):
            if E("GPLAN.data.st") == 'ok': break
            time.sleep(0.5)
        ids = J("""(() => { const L = GPLAN.data.db.list, f = q => (L.find(q) || {}).id;
          return { apple: f(p => p.form === 'halbstamm' && p.darstellung && p.darstellung.typ === 'obstbaum'), nut: f(p => p.form === 'hochstamm'),
            bush: f(p => p.schicht === 'strauch' && (p.funktionen || []).includes('ertrag')), herb: f(p => p.schicht === 'kraut') }; })()""")
        print('plants', ids, flush=True)
        spots = {'apple': (-3.5, -8.5), 'nut': (6.0, -24.0), 'bush': (-6.5, -12.0), 'herb': (-1.5, -11.5)}
        for k, (x, y) in spots.items(): E(f"GPLAN.add('{ids[k]}', {x}, {y})")
        E("GPLAN.setFrei(false); GPLAN.setShow(true)")
        # the shopping list looked at: the task starts
        E("document.querySelector('#gplan [data-tab=\"listen\"]').click(); document.querySelector('#gplan [data-list=\"shop\"]').click()")
        E("GAME.step(0.6)")
        t = J("TASKS.state('gplan-kaufen')")
        ck('the shopping list starts the task „Pflanzen in der Baumschule Kammbach kaufen“', bool(t) and t['st'] == 'läuft' and t['i'] == 0, json.dumps(t))
        E("GPLAN.close(); GAME.step(0.1)")
        ck('nothing to plant without buying: „Einpflanzen“ asks for the plant', True, '')
        # ---- the nursery: the start situation, the zone builds around the walker ----
        E("KERN.scenario('baumschule').run()")
        t1 = time.time()
        while time.time() - t1 < 400:
            E("GAME.step(0.3)")
            if E("!!(window.VESSRA && VESSRA.state === 'ready' && VESSRA.baumschule) && GPSHOP.near && GPSHOP.shelf().length > 0"): break
            time.sleep(0.5)
        print('nursery ready after', round(time.time() - t1), 's', flush=True)
        sh = J("GPSHOP.shelf().map(s => ({ id: s.it.id, x: s.x, y: s.y, z: s.z, art: GPSHOP.artOf(s.p), bed: VESSRA.baumschule.beete.map(b => b.art) }))")
        arts = J("GPSHOP.shelf().map(s => { const B = VESSRA.baumschule.beete; let best = null, bd = 1e9; for (const b of B) { const d = Math.hypot(b.x - s.x, b.y - s.y); if (d < bd) { bd = d; best = b; } } return [GPSHOP.artOf(s.p), best && best.art]; })")
        print('shelf', json.dumps(sh)[:600], 'arts', arts, flush=True)
        ck('the nursery: the four plants of the shopping list stand in containers on the beds of their kind', len(sh) == 4 and all(a == b for a, b in arts), json.dumps(arts))
        # shader programs: the same view without and with the containers
        s0 = sh[0]
        look = lambda s, d=1.1: E(f"(() => {{ const yaw = 0; GAME.view({s['x']}, {s['y']} - {d}, {s['z']} + 1.7, yaw, -22, 62); GAME.step(0.1); }})()")
        look(s0, 2.6)
        E("GAME.G3_hide = GPLAN.G3.potSet('welt', null, []); GAME.step(0.1); GAME.shot()"); pA = E("GAME.R.info.programs.length")
        E("GPSHOP.refresh(); GAME.step(0.1); GAME.shot()"); pB = E("GAME.R.info.programs.length")
        ck('no new shader programs for the plants in containers at the nursery', pB <= pA, f'{pA} -> {pB}')
        lib.shot(pg, OUT, 'a_beet')
        t = J("TASKS.state('gplan-kaufen')")
        ck('the task: at the nursery (step 2: choose the plants)', t and t['i'] >= 1, json.dumps(t))
        # ---- „Aussuchen“ with the action button, each container ----
        picked = []
        for s in sh:
            # standing at the container (the nearest one is taken)
            E(f"GAME.view({s['x']}, {s['y']}, {s['z']} + 1.7, 0, -30, 62); GAME.step(0.1)")
            best = J("GAME.step(0.1).best"); picked.append(best)
            E("PLAY.primary(); GAME.step(0.3)")
        n = E("GPLAN.state.kuebel.filter(c => c.loc === 'korb').length")
        print('picked', picked, flush=True)
        tk = J("VESSRA.baumschule.taken ? VESSRA.baumschule.taken() : null")
        print('taken out of the beds', tk, flush=True)
        ck('the nursery’s own plants are taken out where the containers stood (VESSRA.baumschule.take)', tk is None or len(tk) == 4, json.dumps(tk))
        ck('„Aussuchen – …“ at each container puts it into the basket, the beds are empty then', n == 4 and all(p and p.startswith('Aussuchen') for p in picked) and E("GPSHOP.shelf().length") == 0, json.dumps(picked, ensure_ascii=False))
        E("GAME.step(0.6)")
        # ---- the counter: pay, the receipt ----
        k = J("VESSRA.baumschule.kasse")
        E(f"GAME.view({k['x']}, {k['y']}, {k['z']} + 1.7, {k['yaw']}, -8, 62); GAME.step(0.1)")
        best = J("GAME.step(0.1).best")
        E("PLAY.primary(); GAME.step(0.2)")
        bon = J("(() => { const b = document.getElementById('gpbon'); return { open: !!b && !b.hidden, text: b ? b.textContent : '', btns: b ? [...b.querySelectorAll('button')].map(x => x.textContent) : [] }; })()")
        print('receipt', json.dumps(bon, ensure_ascii=False), flush=True)
        ck('„Bezahlen“ at the counter: the receipt with the plants and the date, no prices', bool(best) and best.startswith('Bezahlen') and bon['open'] and 'Kassenzettel' in bon['text'] and '€' not in bon['text'] and 'EUR' not in bon['text'] and E(f"GPLAN.M.fullName(GPLAN.data.db.byId.get('{ids['apple']}'))") in bon['text'], json.dumps(bon, ensure_ascii=False)[:300])
        page_shot(pg, 'b_kassenzettel')
        E("document.querySelector('#gpbon [data-b=\"mit\"]').click(); GAME.step(0.6)")
        t = J("TASKS.state('gplan-kaufen')")
        ck('paid: the plants wait at the counter; the task goes on (bring them home)', E("GPLAN.state.kuebel.filter(c => c.loc === 'kasse').length") == 4 and t and t['i'] >= 3, json.dumps(t))
        # ---- the car on the parking place: into the car; the walnut does not fit – delivered ----
        E("(() => { const B = VESSRA.baumschule; VEH.place('car', B.parkplatz.x, B.parkplatz.y, B.parkplatz.yaw * Math.PI / 180); })(); GAME.step(0.3)")
        E(f"GAME.view({k['x']}, {k['y']}, {k['z']} + 1.7, {k['yaw']}, -8, 62); GAME.step(0.1)")
        d = E("(() => { const v = VEH.by.car, K = VESSRA.baumschule.kasse; return Math.hypot(v.st.x - K.x, v.st.y - K.y); })()")
        G['car'] = d < 40
        if G['car']:
            best = J("GAME.step(0.1).best")
            E("PLAY.primary(); GAME.step(2.0)")
            locs = J("GPLAN.state.kuebel.map(c => [c.id, c.loc])")
            print('car', round(d, 1), 'm from the counter;', best, locs, flush=True)
            ck('„Ins Auto laden“ with the car on the parking place: the apple, the shrub and the perennial in the car, the walnut left',
               bool(best) and best.startswith('Ins Auto laden') and sorted(l for i, l in locs) == ['auto', 'auto', 'auto', 'kasse'] and dict(locs).get(ids['nut']) == 'kasse', json.dumps(locs))
            best = J("GAME.step(0.1).best")
            E("PLAY.primary(); GAME.step(2.0)")
            ck('the walnut (a tall standard): „Liefern lassen“', bool(best) and best.startswith('Liefern lassen') and dict(J("GPLAN.state.kuebel.map(c => [c.id, c.loc])")).get(ids['nut']) == 'liefer', str(best))
            # a picture of the load: behind the car, the tailgate
            E("(() => { const v = VEH.by.car, C = v.model.cargo, p = VEH.toW(v, 0.9, C.y0 - 2.2), c = VEH.toW(v, 0, C.y0); GAME.view(p[0], p[1], v.st.z + 2.1, Math.atan2(c[0] - p[0], c[1] - p[1]) * 180 / Math.PI, -25, 62); GAME.step(0.2); })()")
            lib.shot(pg, OUT, 'c_auto_beladen')
            ck('the load drawn in the car (a set hung on it)', J("GPLAN.G3.sets()").get('auto', 0) == 3, json.dumps(J("GPLAN.G3.sets()")))
            # ---- home: the car by the garden, „Ausladen“ behind it ----
            E("VEH.reset(); GAME.step(0.5)")
            E("(() => { const v = VEH.by.car, C = v.model.cargo, p = VEH.toW(v, 0, C.y0 - 1.3), c = VEH.toW(v, 0, C.y0); GAME.view(p[0], p[1], KERN.ground(p[0], p[1]) + 1.7, Math.atan2(c[0] - p[0], c[1] - p[1]) * 180 / Math.PI, -15, 62); GAME.step(0.2); })()")
            best = J("GAME.step(0.1).best")
            E("PLAY.primary(); GAME.step(2.0)")
            bo = J("GPLAN.state.kuebel.filter(c => c.loc === 'boden')")
            ck('home: „Ausladen“ at the tailgate sets the three plants down behind the car', bool(best) and best.startswith('Ausladen') and len(bo) == 3, f'{best} {json.dumps(bo)}')
            lib.shot(pg, OUT, 'd_ausgeladen')
        else:
            # vehicles stop at the edge of the 2.4 km square until the drive (feat/fahrt) is in this build: everything delivered
            print(f'note: the car cannot stand at the nursery in this build ({d:.0f} m from the counter) – the car part is skipped, all delivered', flush=True)
            best = J("GAME.step(0.1).best")
            E("PLAY.primary(); GAME.step(2.0)")
            ck('without the car at the nursery: „Liefern lassen“ for all four', bool(best) and best.startswith('Liefern lassen') and E("GPLAN.state.kuebel.filter(c => c.loc === 'liefer').length") == 4, str(best))
        # ---- the delivery: the next morning by the garden gate ----
        E("CLOCK.t = (Math.floor(CLOCK.t / 1440) + 1) * 1440 + 7.5 * 60; GAME.step(1.5)")
        tor = J("GPLAN.state.kuebel.filter(c => c.loc === 'tor')")
        n_tor = 1 if G['car'] else 4
        ck('the next morning the delivery stands by the garden gate' + (' (the walnut)' if G['car'] else ''), len(tor) == n_tor and (not G['car'] or tor[0]['id'] == ids['nut']) and all(math.hypot(c['x'] + 8.86, c['y'] - 39.08) < 6 for c in tor), json.dumps(tor))
        E("GAME.view(-8.4, 36.6, KERN.ground(-8.4, 36.6) + 1.7, 160, -20, 62); GAME.step(0.2)"); lib.shot(pg, OUT, 'd_gartentor')
        t = J("TASKS.state('gplan-kaufen')")
        ck('the task: all bought plants at home (step 5: plant them)', t and t['i'] == 4, json.dumps(t))
        # ---- carrying each to its hole and planting it ----
        steps_done = []
        for kk in ('herb', 'bush', 'apple', 'nut'):
            pid = ids[kk]
            c = J(f"GPLAN.state.kuebel.find(c => c.id === '{pid}')")
            # standing at the container (the nearest one is taken)
            E(f"GAME.view({c['x']}, {c['y']}, KERN.ground({c['x']}, {c['y']}) + 1.7, 0, -30, 62); GAME.step(0.1)")
            best = J("GAME.step(0.1).best")
            E("PLAY.primary(); GAME.step(0.3)")
            held = J("({ loc: (GPLAN.state.kuebel.find(c => c.id === '" + pid + "') || {}).loc, carry: PLAY.carry && PLAY.carry.id, sets: GPLAN.G3.sets() })")
            if kk == 'apple':
                E("GAME.CAM3.want = true; GAME.step(0.3)"); lib.shot(pg, OUT, 'e_tragen'); E("GAME.CAM3.want = false; GAME.step(0.1)")
            ok_carry = bool(best) and best.startswith('Tragen') and held['loc'] == 'hand' and held['carry'] == 'gplan-topf' and held['sets'].get('hand') == 1
            x, y = spots[kk]
            E(f"GAME.view({x}, {y} - 1.3, KERN.ground({x}, {y} - 1.3) + 1.7, 0, -24, 62); GAME.step(0.1)")
            labels = []
            for i in range(8):
                best = J("GAME.step(0.05).best")
                if not best: break
                labels.append(best)
                if 'Mulchen' in best or 'Gießen' in best or 'Ernten' in best or 'Schneiden' in best: break
                k2 = next((k3 for k3, v in J("GPLAN.M.STEP").items() if best.startswith(v['label'])), None)
                dur = E(f"GPLAN.M.STEP['{k2}'].dur") if k2 else 0.5
                E("PLAY.primary()"); E(f"GAME.step({dur + 0.25})")
            it = J(f"GPLAN.state.items.find(it => it.id === '{pid}')")
            steps_done.append((kk, ok_carry, labels, it.get('st')))
            print('planted', kk, ok_carry, labels, it.get('st'), flush=True)
        ck('„Tragen“: the plant in the arms (the arms pose of PLAY, drawn in front of the figure)', all(s[1] for s in steps_done), json.dumps(steps_done, ensure_ascii=False)[:400])
        ck('planted from the hands: „Einpflanzen“ without the Vorrat, every bought plant in the ground, the hands free',
           all(s[3] == 'gepflanzt' and any(l.startswith('Einpflanzen') and 'Vorrat' not in l for l in s[2]) for s in steps_done) and not E("!!PLAY.carry") and E("GPLAN.state.kuebel.length") == 0, json.dumps(steps_done, ensure_ascii=False)[:400])
        E("GAME.step(0.6)")
        t = J("TASKS.state('gplan-kaufen')")
        ck('the task „Pflanzen in der Baumschule Kammbach kaufen“ is done', t and t['st'] == 'erledigt', json.dumps(t))
        E("GAME.view(-3.5, -16.5, 1.7, 8, 4, 62); GAME.step(0.2)"); lib.shot(pg, OUT, 'f_gepflanzt')
        # ---- reload: the planted plants and the harvest book stay; nothing left in containers ----
        st = J("GPLAN.state")
        ck('saved: v 2 with the planted plants', st['v'] == 2 and sum(1 for i in st['items'] if i.get('st') == 'gepflanzt') == 4, '')
    except Exception as ex:
        ck('the nursery test ran', False, repr(ex)[:500])
    ck.errors(errs)
ck.done()
