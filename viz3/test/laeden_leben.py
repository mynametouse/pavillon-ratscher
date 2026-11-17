# feat/laeden-leben: the shops of Schleusingen alive and usable (laeden/leben.js LLEBEN, laeden/kauf.js LKAUF, einkauf/* OEFFNUNG, WAREN,
# GELD, INVENTAR). Sections:
#   markt   EDEKA on a Saturday morning: cashiers sitting at the open tills, customers with baskets and trolleys between the shelves,
#           walking (they move, on free ground, never inside a fixture), queueing and paying; draw calls and the frame's time inside
#           before and after the people; Tuesday afternoon fewer; Sunday nobody (closed); going away frees the figures
#   kaufen  taking things from the shelves (the action button names the product and its price), paying at an open till (the cashier
#           scans, the receipt, the wallet goes down, the things are in the inventory), the inventory panel; the bakery's counter
#   obi     OBI: the tills, the information desk, the wood cutting, customers; timber and tools to buy
#   oeffentlich  the town hall's Bürgerbüro: the clerk at its hours, the options at the counter, closed on Wednesday; the registry
# Pictures in out/laeden_leben/. The world tiles come from the published site (as viz3/test/laeden.py).
#   python3 viz3/test/laeden_leben.py 9045 [sections]   (default markt,kaufen)
import sys, os, json, time, math
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__))); import lib
port = sys.argv[1] if len(sys.argv) > 1 else '8951'
want = [s for s in (sys.argv[2] if len(sys.argv) > 2 else 'markt,kaufen,oeffentlich').split(',') if s]
ck = lib.Checks('laeden_leben')
OUT = lib.out('laeden_leben')
DATA = json.load(open(os.path.join(lib.ROOT, 'viz3', 'extra', 'laeden', 'dist', 'laeden', 'laeden.json')))
SHOP = {s['id']: s for s in DATA['shops']}
CENTRES = {'nord': (-885, 2060), 'mitte': (-1075, 1570), 'rewe': (-1765, 915)}
COUNT = r"""(() => { const R = GAME.R, I = [0, 0], rbd = R.renderBufferDirect;
  R.renderBufferDirect = function (camera, scene, geometry, material, object, group) {
    const n = geometry.index ? geometry.index.count : geometry.attributes.position ? geometry.attributes.position.count : 0;
    if (scene) { I[0]++; I[1] += Math.round((group ? group.count : n) / 3) * (object.isInstancedMesh ? object.count : 1); }
    return rbd.call(this, camera, scene, geometry, material, object, group); };
  let ms = 0;
  try { GAME.shot(); const t0 = performance.now(); for (let i = 0; i < 3; i++) GAME.shot(); ms = (performance.now() - t0) / 3; }
  finally { R.renderBufferDirect = rbd; }
  return { calls: Math.round(I[0] / 4), tris: Math.round(I[1] / 4), ms: Math.round(ms) }; })()"""


def fetch_tiles(centres):
    """the world tiles near the shops, as viz3/test/laeden.py does (its function, run without its checks)"""
    src = open(os.path.join(lib.ROOT, 'viz3', 'test', 'laeden.py')).read()
    pre = src.split('# ---------------------------------------------------------------- without a browser')[0]
    pre = pre.replace("port = sys.argv[1] if len(sys.argv) > 1 else '8951'", "port = '0'")
    pre = pre.replace("want = set((sys.argv[2] if len(sys.argv) > 2 else 'data,nord,mitte,rewe,nacht').split(','))", "want = set()")
    pre = pre.replace("ck = lib.Checks('laeden')", "ck = None")
    ns = {'__file__': os.path.join(lib.ROOT, 'viz3', 'test', 'laeden.py'), '__name__': 'laeden_pre'}
    exec(compile(pre, 'laeden_pre', 'exec'), ns)
    ns['fetch_tiles'](centres)


def main_door(sh):
    return next(d for d in sh['doors'] if d['k'] == 'main')


groups = ['nord'] + (['mitte'] if 'kaufen' in want else [])
fetch_tiles([(-1084.7, 1241.9)] + [CENTRES[g] for g in groups])
with lib.browser() as b:
    errs = []
    pg = lib.page(b, 1600, 900, errs, tier='hoch')
    lib.boot(pg, port)
    E = pg.evaluate
    J = lambda js: json.loads(E("JSON.stringify(" + js + ")"))

    def steps(secs, dt=0.25):
        E(f"for (let i = 0; i < {max(1, int(secs / dt))}; i++) GAME.step({dt})")

    def pic(name):
        try:
            lib.shot(pg, OUT, name)
        except Exception as e:
            print('shot failed', name, e, flush=True)

    def page_pic(name):
        try:
            E("GAME.shot()")
            pg.screenshot(path=os.path.join(OUT, name + '.jpg'), type='jpeg', quality=85, timeout=120000)
            print('page shot', name, flush=True)
        except Exception as e:
            print('shot failed', name, e, flush=True)

    def settle(limit=150):
        t0 = time.time()
        st = None
        while time.time() - t0 < limit:
            E("GAME.step(0.25)")
            st = J("({ w: WELT.state().loading, pq: WELT.padQueue(), busy: GEB.Z.busy, jobs: GEB.jobs(), l: LAEDEN.status().groups.map(g => g.state).join(',') })")
            if st['w'] == 0 and st['pq'] == 0 and not st['busy'] and st['jobs'] == 0 and 'pads' not in st['l'] and time.time() - t0 > 6:
                break
            time.sleep(0.25)
        return st

    def stand(x, y, yaw, pitch=0):
        E(f"GAME.setView3(false, true); GAME.view({x}, {y}, KERN.ground({x}, {y}) + 1.7, {yaw}, {pitch})")
        return J("GAME.step(0.1)")

    def look(x, y, yaw, pitch=-6, fov=70):
        E(f"GAME.setView3(false, true); GAME.view({x}, {y}, KERN.ground({x}, {y}) + 1.65, {yaw}, {pitch}, {fov})")
        E("GAME.step(0.05)")
        E(f"GAME.view({x}, {y}, KERN.ground({x}, {y}) + 1.65, {yaw}, {pitch}, {fov})")

    def set_time(day_of_week, hh, mm=0):
        d = J(f"(() => {{ for (let d = 0; d < 14; d++) if (DCAL.wd(d * 1440 + 600) === {day_of_week}) return d; return 1; }})()")
        E(f"CLOCK.t = {d * 1440 + hh * 60 + mm}; DN.active && DN.update(true)")
        lib.settle_light(pg)

    def wait_people(n, limit=120):
        t0 = time.time()
        st = None
        while time.time() - t0 < limit:
            steps(0.5)
            st = J("LLEBEN.status()")
            if st['people'] >= n and st['pending'] == 0:
                break
            time.sleep(0.2)
        return st

    def yaw_in(d):
        return (math.degrees(math.atan2(-d['nx'], -d['ny'])) + 360) % 360

    E("document.querySelectorAll('#toast').forEach(e => e.style.visibility = 'hidden')")
    set_time(6, 10, 0)  # a Saturday morning: full
    E("document.querySelector('#menu [data-spot=schleusingen]').click()")
    t0 = time.time()
    while time.time() - t0 < 200:
        E("GAME.step(0.25)")
        if J("SCHL.status().state") in ('ready', 'error'):
            break
        time.sleep(0.3)
    settle(60)
    st0 = J("({ l: LLEBEN.status(), k: LKAUF.status(), o: OEFFNUNG.liste().length, g: GELD.stand() })")
    ck('LLEBEN and LKAUF are on, nobody built at the start; the opening hours registry has the public buildings', st0['l']['on'] and st0['k']['on'] and st0['l']['people'] == 0 and st0['o'] >= 7, json.dumps(st0)[:300])
    sh = SHOP['edeka']
    md = main_door(sh)
    yi = yaw_in(md)
    if 'markt' in want or 'kaufen' in want:
        # in front of EDEKA: its rooms stand; just inside, its people come
        stand(md['x'] + md['nx'] * 25, md['y'] + md['ny'] * 25, yi)
        settle()
        steps(3)
        st = J("LINNEN.status()")
        ck('EDEKA: its rooms stand when one is near', any(q['shop'] == 'edeka' for q in st['mounted']), json.dumps(st)[:300])
        # before: inside without people (the people switched off for a moment)
        E("LLEBEN.on = false; LLEBEN.dropAll()")
        ix, iy = md['x'] - md['nx'] * 8, md['y'] - md['ny'] * 8
        look(ix, iy, yi, -8, 70)
        steps(1)
        before = J(COUNT)
        E("LLEBEN.on = true")
        stand(md['x'] + md['nx'] * 4, md['y'] + md['ny'] * 4, yi)
        lst = wait_people(8)
        print('people', json.dumps(lst)[:600], flush=True)
        L = J("LLEBEN.leute()")
        kassen = [p for p in L if p['art'] == 'kasse']
        kunden = [p for p in L if p['art'] == 'kunde']
        ck('EDEKA on Saturday morning: cashiers at the open tills (sitting), customers between the shelves',
           len(kassen) >= 2 and all(p['sitzt'] for p in kassen) and len(kunden) >= 5,
           f"{len(kassen)} cashiers, {len(kunden)} customers, all: {json.dumps(L)[:500]}")
        ck('customers carry baskets or push trolleys', sum(1 for p in kunden if p['korb']) >= max(1, len(kunden) - 1), json.dumps([p['korb'] for p in kunden]))
        # they move: after 15 s of game the customers stand elsewhere, and on free ground
        pos0 = {(p['wer']): (p['x'], p['y']) for p in kunden}
        look(ix, iy, yi, -8, 70)
        steps(15)
        L2 = J("LLEBEN.leute()")
        moved = sum(1 for p in L2 if p['art'] == 'kunde' and p['wer'] in pos0 and math.hypot(p['x'] - pos0[p['wer']][0], p['y'] - pos0[p['wer']][1]) > 1.0)
        ck('customers walk (after 15 s most have moved)', moved >= max(1, len(pos0) // 2), f"{moved} of {len(pos0)} moved")
        bad = J("LLEBEN.leute().filter(p => p.art === 'kunde' && p.st !== 'raus' && p.st !== 'rein').filter(p => !LINNEN.unitAt(p.x, p.y)).length")
        nan = J("LLEBEN.leute().filter(p => !Number.isFinite(p.x) || !Number.isFinite(p.y)).length")
        ck('nobody stands outside the shop or nowhere while shopping', bad == 0 and nan == 0, f"outside {bad}, NaN {nan}")
        after = J(COUNT)
        ck('draw calls and frame time inside: with the people within bounds (≤ +120 calls)', after['calls'] - before['calls'] <= 120,
           f"before {json.dumps(before)}, after {json.dumps(after)}")
        print('frame before/after', json.dumps(before), json.dumps(after), flush=True)
        # pictures: the shop on Saturday morning (the places with the longest views), the tills
        vws = J("LINNEN.views('edeka')") or []
        for k, v in enumerate(vws[:3]):
            E(f"GAME.setView3(false, true); GAME.view({v['x']}, {v['y']}, {v['z']} + 1.65, {v['yaw']}, -6, 70)")
            steps(0.5)
            pic(f"markt_samstag_{k}")
        KS = J("LLEBEN.kassen()")
        ko = [q for q in KS if q['open']]
        ck('each open till: its pay place across the counter from the cashier (1.6–1.9 m)', ko and all(1.6 < math.hypot(q['z'][0] - q['seat'][0], q['z'][1] - q['seat'][1]) < 1.9 for q in KS),
           json.dumps(KS)[:300])
        if ko:
            q = ko[0]
            sx, sy = q['seat']
            zx, zy = q['z']
            # from the customers' aisle, a step back from the pay place, looking across the counter at the cashier
            vx, vy = zx - sx, zy - sy
            L0 = math.hypot(vx, vy) or 1
            px, py = zx + vx / L0 * 0.9, zy + vy / L0 * 0.9
            yaw = (math.degrees(math.atan2(sx - px, sy - py)) + 360) % 360
            look(px, py, yaw, -14, 70)
            pic('markt_kasse')
        # the printed goods: the atlas made, every section has its printed fronts
        at = J("({ w: WBILD.status(), m: LINNEN.meshesOf('edeka').filter(m => /waren$/.test(m.name)).length })")
        ck('the goods are printed packages (one atlas, a printed mesh per section)', at['w']['made'] and at['m'] >= 1, json.dumps(at))
        tst = J("({ l: LLEBEN.status(), q: LLEBEN.kassen() })")
        print('tills', json.dumps(tst)[:800], flush=True)
        if 'markt' in want:
            # a quiet Tuesday afternoon: fewer people (the shop is set anew when one comes back)
            stand(md['x'] + md['nx'] * 200, md['y'] + md['ny'] * 200, yi)
            steps(5)
            gone = J("LLEBEN.status()")
            ck('going away frees the figures', gone['people'] == 0 and gone['shop'] is None, json.dumps(gone)[:300])
            set_time(2, 14, 30)
            stand(md['x'] + md['nx'] * 25, md['y'] + md['ny'] * 25, yi)
            settle(60)
            stand(md['x'] + md['nx'] * 4, md['y'] + md['ny'] * 4, yi)
            q2 = wait_people(3, 90)
            L3 = J("LLEBEN.leute()")
            k3 = len([p for p in L3 if p['art'] == 'kunde'])
            ck('Tuesday afternoon: quieter (fewer customers than on Saturday, one or two tills)', k3 < len(kunden) and 1 <= len([p for p in L3 if p['art'] == 'kasse']) <= 2,
               f"{k3} customers (Saturday {len(kunden)}), {json.dumps(q2)[:300]}")
            look(ix, iy, yi, -8, 70)
            pic('markt_dienstag')
            # Sunday: closed – nobody, the door shut
            stand(md['x'] + md['nx'] * 200, md['y'] + md['ny'] * 200, yi)
            steps(5)
            set_time(0, 11, 0)
            stand(md['x'] + md['nx'] * 25, md['y'] + md['ny'] * 25, yi)
            settle(60)
            stand(md['x'] + md['nx'] * 3, md['y'] + md['ny'] * 3, yi)
            steps(6)
            q3 = J("({ l: LLEBEN.status(), t: OEFFNUNG.text('edeka'), d: LINNEN.door('edeka:0') })")
            ck('Sunday: EDEKA closed – nobody inside, the door shut, the text says when it opens', q3['l']['people'] == 0 and 'geschlossen' in q3['t'] and (q3['d'] or {}).get('open', 1) < 0.1,
               json.dumps(q3)[:300])
            page_pic('markt_sonntag_tuer')
            set_time(6, 10, 0)
    if 'kaufen' in want:
        stand(md['x'] + md['nx'] * 4, md['y'] + md['ny'] * 4, yi)
        wait_people(6, 90)
        g0 = J("GELD.stand()")
        inv0 = J("INVENTAR.list().length")
        # stand in front of shelves: the action button names the product and its price; take three things
        took = []
        tries = J("(() => { const M = LINNEN.shopM('edeka'); const u = M.units.find(q => q.U.id === 'edeka'); "
                  "return LLPLAN.regalPlaetze(LLPLAN.grid(u.U.vols.map(v => v.f), M.segs, { cell: 0.4, rad: 0.3 }), u.goods, 30, 3).map(s => [s.x, s.y, s.hd]); })()")
        for (x, y, hd) in tries:
            if len(took) >= 3:
                break
            E(f"GAME.setView3(false, true); GAME.view({x}, {y}, KERN.ground({x}, {y}) + 1.65, {math.degrees(hd) % 360}, -10, 70)")
            r = J("GAME.step(0.3)")
            lbl = r.get('best') or ''
            if lbl.startswith('Nehmen:'):
                if not took:
                    page_pic('kaufen_regal')
                E("KERN.acts().find(a => a.id === 'laeden:nehmen').run()")
                took.append(lbl)
        k = J("LKAUF.status()")
        ck('taking from the shelf: the button names product and price, three things are in the basket', len(took) >= 3 and k['korb'] >= 1 and k['summe'] > 0, f"{took} → {json.dumps(k)[:300]}")
        # to an open till: its pay place
        KS = [q for q in J("LLEBEN.kassen()") if q['open']]
        paid = False
        if KS:
            q = KS[0]
            zx, zy = q['z']
            sx, sy = q['seat']
            yaw = (math.degrees(math.atan2(sx - zx, sy - zy)) + 360) % 360
            E(f"GAME.setView3(false, true); GAME.view({zx}, {zy}, KERN.ground({zx}, {zy}) + 1.65, {yaw}, -14, 70)")
            r = J("GAME.step(0.3)")
            lbl = r.get('best') or ''
            ck('at an open till the button offers to pay with the sum', lbl.startswith('An Kasse') and '€' in lbl, lbl)
            E("KERN.acts().find(a => a.id === 'laeden:kasse').run()")
            for i in range(20):
                steps(0.5)
                if J("!!document.querySelector('#kassepanel [data-k=bar]')"):
                    break
                time.sleep(0.3)
            page_pic('kaufen_kasse')
            E("document.querySelector('#kassepanel [data-k=bar]') && document.querySelector('#kassepanel [data-k=bar]').click()")
            steps(0.5)
            page_pic('kaufen_bon')
            g1 = J("GELD.stand()")
            inv = J("INVENTAR.list()")
            paid = g1 < g0 and len(inv) > inv0
            ck('paying: the wallet goes down by the sum, the things are in the inventory, the receipt is kept', paid and J("INVENTAR.bons().length") >= 1 and J("LKAUF.status().korb") == 0,
               f"wallet {g0} → {g1}; inventory {json.dumps(inv)[:300]}")
            E("LKAUF.close(); INVENTAR.zeigen(true)")
            steps(0.3)
            page_pic('kaufen_inventar')
            E("INVENTAR.zeigen(false)")
        # an unpaid basket stays in the shop
        if tries:
            x, y, hd = tries[-1]
            E(f"GAME.setView3(false, true); GAME.view({x}, {y}, KERN.ground({x}, {y}) + 1.65, {math.degrees(hd) % 360}, -10, 70)")
            r = J("GAME.step(0.3)")
            if (r.get('best') or '').startswith('Nehmen:'):
                E("KERN.acts().find(a => a.id === 'laeden:nehmen').run()")
            stand(md['x'] + md['nx'] * 8, md['y'] + md['ny'] * 8, yi)
            steps(1)
            ck('going out with an unpaid basket: the things stay in the shop', J("LKAUF.status().korb") == 0, json.dumps(J("LKAUF.status()"))[:200])
    if 'kaufen' in want:
        # the bakery at Lidl (Café & Backshop Drei Ähren): the baker behind the counter, ordering rolls
        bsh = SHOP['lidl']
        bd = next(d for d in bsh['doors'] if 'Drei' in (d.get('who') or ''))
        set_time(2, 9, 0)
        stand(bd['x'] + bd['nx'] * 25, bd['y'] + bd['ny'] * 25, yaw_in(bd))
        settle()
        steps(3)
        stand(bd['x'] - bd['nx'] * 1.5, bd['y'] - bd['ny'] * 1.5, yaw_in(bd))
        wait_people(2, 90)
        L = J("LLEBEN.leute()")
        ck('the bakery (Tuesday 9:00): someone behind the counter', any(p['art'] == 'theke' for p in L), json.dumps(L)[:300])
        T = J("LLEBEN.leute().find(p => p.art === 'theke') || null")
        spot = J("(() => { const L = LLEBEN.leute().find(p => p.art === 'theke'); if (!L) return null; for (let r = 0.6; r < 4; r += 0.2) for (let a = 0; a < 6.28; a += 0.3) { const x = L.x + Math.sin(a) * r, y = L.y + Math.cos(a) * r, at = LLEBEN.kasseAt(x, y, 0.4); if (at && at.theke) return [at.K.k.x, at.K.k.y, L.x, L.y]; } return null; })()")
        if spot:
            kx, ky, sx, sy = spot
            yaw = (math.degrees(math.atan2(sx - kx, sy - ky)) + 360) % 360
            E(f"GAME.setView3(false, true); GAME.view({kx}, {ky}, KERN.ground({kx}, {ky}) + 1.65, {yaw}, -12, 70)")
            r = J("GAME.step(0.3)")
            lbl = r.get('best') or ''
            ck('at the counter the button offers to order', 'Theke' in lbl, lbl)
            E("KERN.acts().find(a => a.id === 'laeden:theke').run()")
            steps(0.3)
            E("document.querySelector('#kassepanel [data-add=broetchen]') && document.querySelector('#kassepanel [data-add=broetchen]').click()")
            E("document.querySelector('#kassepanel [data-add=broetchen]') && document.querySelector('#kassepanel [data-add=broetchen]').click()")
            E("document.querySelector('#kassepanel [data-add=pfannkuchen]') && document.querySelector('#kassepanel [data-add=pfannkuchen]').click()")
            page_pic('baecker_theke')
            n0 = J("INVENTAR.anzahl('broetchen')")
            E("document.querySelector('#kassepanel [data-k=pay]') && document.querySelector('#kassepanel [data-k=pay]').click()")
            steps(0.3)
            ck('ordering at the bakery: two rolls and a doughnut paid, in the inventory', J("INVENTAR.anzahl('broetchen')") == n0 + 2 and J("INVENTAR.anzahl('pfannkuchen')") >= 1,
               json.dumps(J("INVENTAR.list()"))[:300])
            E("LKAUF.close()")
        else:
            ck('the bakery counter found', False, json.dumps(T)[:200])
    if 'oeffentlich' in want:
        # the town hall's Bürgerbüro: the clerk at the counter on a Tuesday morning, the options; closed on Wednesday
        set_time(2, 10, 0)
        R = J("(() => { const R = SCHL.rathaus; return R && R.counter ? { c: R.counter, k: R.clerk, z: R.floor } : null; })()")
        ck('the town hall stands (its counter)', R is not None, json.dumps(R))
        if R:
            cx, cy = R['c']
            kx, ky = R['k']
            yaw = (math.degrees(math.atan2(kx - cx, ky - cy)) + 360) % 360
            E(f"GAME.setView3(false, true); GAME.view({cx}, {cy}, {R['z']} + 1.65, {yaw}, -8, 70)")
            for i in range(40):
                steps(0.5)
                if J("OEFFENTLICH.status().post"):
                    break
                time.sleep(0.2)
            st = J("OEFFENTLICH.status()")
            ck('Tuesday 10:00: the clerk is at the counter', st['post'] is True, json.dumps(st))
            lbl = J("GAME.step(0.3)").get('best') or ''
            ck('at the counter: „Bürgerbüro: am Schalter fragen“', 'Schalter' in lbl, lbl)
            E("OEFFENTLICH.oeffnen('rathaus')")
            steps(0.3)
            page_pic('rathaus_schalter')
            E("document.querySelector('#kassepanel [data-k=saecke]') && document.querySelector('#kassepanel [data-k=saecke]').click()")
            ck('yellow bags from the counter (in the inventory)', J("INVENTAR.anzahl('gelbesaecke')") >= 1, json.dumps(J("INVENTAR.list()"))[:200])
            E("LKAUF.close()")
            look(cx, cy, yaw, -8, 70)
            pic('rathaus_buergerbuero')
            set_time(3, 10, 0)
            steps(2)
            lbl = J("GAME.step(0.3)").get('best') or ''
            st = J("OEFFENTLICH.status()")
            ck('Wednesday: the Bürgerbüro is closed (the label says so, nobody at the counter)', 'geschlossen' in lbl and not st['post'], f"{lbl} {json.dumps(st)}")
        o = J("OEFFENTLICH.orte()")
        ck('the public buildings in the registry with their hours', len(o) >= 7 and all(q['zeiten'] for q in o), json.dumps(o)[:400])
    ck.errors(errs)
    ck.done()
