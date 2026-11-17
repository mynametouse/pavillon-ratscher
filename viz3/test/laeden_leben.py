# feat/laeden-leben: the shops of Schleusingen alive and usable (laeden/leben.js LLEBEN, laeden/kauf.js LKAUF, einkauf/* OEFFNUNG, WAREN,
# GELD, INVENTAR). Sections:
#   markt   EDEKA on a Saturday morning: cashiers sitting at the open tills, customers with baskets and trolleys between the shelves,
#           walking (they move, on free ground, never inside a fixture), queueing and paying; draw calls and the frame's time inside
#           before and after the people; Tuesday afternoon fewer; Sunday nobody (closed); going away frees the figures
#   kaufen  taking things from the shelves (the action button names the product and its price), paying at an open till (the cashier
#           scans, the receipt, the wallet goes down, the things are in the inventory), the inventory panel; the bakery's counter
#   obi     OBI on a Saturday morning: the tills, the information desk, the wood cutting, customers; timber, paint, screws to take
#   oeffentlich  the town hall's Bürgerbüro: the clerk at its hours, the options at the counter, closed on Wednesday; the registry
# Pictures in out/laeden_leben/. The world tiles come from the published site (as viz3/test/laeden.py).
#   python3 viz3/test/laeden_leben.py 9045 [sections]   (default markt,kaufen)
import sys, os, json, time, math
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__))); import lib
port = sys.argv[1] if len(sys.argv) > 1 else '8951'
want = [s for s in (sys.argv[2] if len(sys.argv) > 2 else 'markt,obi,kaufen,oeffentlich').split(',') if s]
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
        for i in range(20):
            if J("LLEBEN.status().dressed") >= 2:
                break
            steps(0.5)
            time.sleep(0.3)
        dst = J("LLEBEN.status()")
        ck('the staff wear plain work clothes (painted by body zone, no brand)', dst['dressed'] >= 2, f"{dst['dressed']} dressed, last {dst['dressMs']} ms")
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
    if 'obi' in want:
        # OBI on a Saturday morning: the tills in the vestibule, the information desk, the wood cutting, customers; timber to take
        set_time(6, 10, 0)
        osh = SHOP['obi']
        od = main_door(osh)
        oy = yaw_in(od)
        stand(od['x'] + od['nx'] * 25, od['y'] + od['ny'] * 25, oy)
        settle()
        steps(3)
        stand(od['x'] + od['nx'] * 3, od['y'] + od['ny'] * 3, oy)
        ost = wait_people(8, 120)
        L = J("LLEBEN.leute()")
        arts = {a: sum(1 for p in L if p['art'] == a) for a in ('kasse', 'info', 'zuschnitt', 'kunde')}
        ck('OBI on Saturday: tills, the information desk, the wood cutting, customers', ost['shop'] == 'obi' and arts['kasse'] >= 1 and arts['info'] == 1 and arts['zuschnitt'] == 1 and arts['kunde'] >= 4,
           f"{json.dumps(arts)} {json.dumps(ost)[:300]}")
        wood = J("(() => { const M = LINNEN.shopM('obi'); if (!M) return []; const out = []; for (const u of M.units) for (const g of u.goods || []) "
                 "if (g.front && (g.ware === 'latte' || g.ware === 'brett' || g.ware === 'lasur' || g.ware === 'schrauben')) out.push([g.ware, g.x + g.fx * (g.dep / 2 + 0.7), g.y + g.fy * (g.dep / 2 + 0.7), g.fx, g.fy]); return out.slice(0, 40); })()")
        got = []
        for (w, x, y, fx, fy) in wood:
            if J(f"!LINNEN.unitAt({x}, {y})"):
                continue
            yaw = (math.degrees(math.atan2(-fx, -fy)) + 360) % 360
            E(f"GAME.setView3(false, true); GAME.view({x}, {y}, KERN.ground({x}, {y}) + 1.65, {yaw}, -12, 70)")
            r = J("GAME.step(0.3)")
            lbl = r.get('best') or ''
            if lbl.startswith('Nehmen:') and w not in [g[0] for g in got]:
                got.append((w, lbl))
                if len(got) == 1:
                    page_pic('obi_regal')
            if len(got) >= 2:
                break
        ck('OBI: timber, paint or screws to take from the shelf (the button names them)', len(got) >= 1, json.dumps(got))
        vws = J("LINNEN.views('obi')") or []
        for k, v in enumerate(vws[:2]):
            E(f"GAME.setView3(false, true); GAME.view({v['x']}, {v['y']}, {v['z']} + 1.65, {v['yaw']}, -6, 70)")
            steps(0.5)
            pic(f"obi_{k}")
        E("LKAUF.zurueck(true)")
        stand(od['x'] + od['nx'] * 200, od['y'] + od['ny'] * 200, oy)
        steps(4)
    if 'kaufen' in want:
        set_time(6, 10, 0)
        stand(md['x'] + md['nx'] * 25, md['y'] + md['ny'] * 25, yi)
        settle(60)
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
        # the museum in the Bertholdsburg: Saturday 11:00 open – the door, inside the ticket desk with its cashier, the exhibition room
        set_time(6, 11, 0)
        b = J("(() => { const b = (SCHL.bld || []).find(q => q.lm === 'burg'); return b ? [b.cx, b.cy] : null; })()")
        if b:
            stand(b[0] + 45, b[1] + 5, 270)
            for i in range(30):
                steps(1)
                if J("MUSEUM.status().built"):
                    break
                time.sleep(0.2)
        ms = J("MUSEUM.status()")
        ck('the museum is built near the castle (rooms in the east wing)', ms['built'] and ms['meshes'] >= 2, json.dumps(ms))
        if ms['built']:
            dx, dy = ms['door']
            n = J("MUSEUM.n")
            ox, oy = dx + n[0] * 1.8, dy + n[1] * 1.8
            stand(ox, oy, (math.degrees(math.atan2(-n[0], -n[1])) + 360) % 360)
            lbl = J("GAME.step(0.3)").get('best') or ''
            page_pic('museum_tuer')
            ck('at the castle door: „Naturhistorisches Museum – hineingehen“', 'Museum' in lbl and 'hineingehen' in lbl, lbl)
            E("MUSEUM.betreten()")
            steps(2)
            for i in range(30):
                steps(0.5)
                if J("(LLEBEN.posts || []).some(q => q.id === 'museum' && q.p)"):
                    break
                time.sleep(0.2)
            inside = J("({ s: MUSEUM.status(), post: (LLEBEN.posts || []).filter(q => q.id.startsWith('museum') && q.p).length })")
            ck('inside the museum: the entrance hall, the cashier at the desk', inside['s']['inside'] and inside['post'] >= 1, json.dumps(inside)[:300])
            kk = J("(() => { const k = MUSEUM.spots && MUSEUM.spots.find(q => q.k === 'kunde'), c = MUSEUM.spots && MUSEUM.spots.find(q => q.k === 'kasse'); return k && c ? [k.x, k.y, c.x, c.y] : null; })()")
            if kk:
                yaw = (math.degrees(math.atan2(kk[2] - kk[0], kk[3] - kk[1])) + 360) % 360
                E(f"GAME.setView3(false, true); GAME.view({kk[0]}, {kk[1]}, MUSEUM.z + 1.65, {yaw}, -8, 70)")
                steps(0.5)
                lbl = J("GAME.step(0.3)").get('best') or ''
                ck('at the desk: „Museumskasse: Eintrittskarte“', 'Museumskasse' in lbl, lbl)
                E("MUSEUM.kasse()")
                steps(0.3)
                page_pic('museum_kasse')
                E("document.querySelector('#kassepanel [data-k=erwachsen]') && document.querySelector('#kassepanel [data-k=erwachsen]').click()")
                ck('a ticket bought (6 €, in the inventory)', J("INVENTAR.has('museumskarte')"), json.dumps(J("MUSEUM.status()")))
                # back a few steps for a view of the hall
                E(f"GAME.setView3(false, true); GAME.view({kk[0] - (kk[2] - kk[0]) * 1.5}, {kk[1] - (kk[3] - kk[1]) * 1.5}, MUSEUM.z + 1.65, {yaw}, -6, 70)")
                steps(0.5)
                pic('museum_halle')
            ex = J("MUSEUM.exp ? MUSEUM.exp.map(e => [e.id, e.at[0], e.at[1], e.look[0], e.look[1]]) : []")
            looked = 0
            for (eid, ax, ay, lx, ly) in ex:
                yaw = (math.degrees(math.atan2(lx - ax, ly - ay)) + 360) % 360
                E(f"GAME.setView3(false, true); GAME.view({ax}, {ay}, MUSEUM.z + 1.65, {yaw}, -6, 70)")
                steps(0.3)
                lbl = J("GAME.step(0.3)").get('best') or ''
                if lbl.startswith('Ansehen'):
                    looked += 1
                if eid in ('landschaft', 'minerale'):
                    pic('museum_' + eid)
            ck('in the exhibition room every exhibit offers „Ansehen …“ with its text', looked == len(ex) and len(ex) >= 5, f"{looked} of {len(ex)}")
            E("MUSEUM.ansehen('kugeln')")
            page_pic('museum_text')
            E("LKAUF.close()")
            E("MUSEUM.verlassen()")
            steps(1)
            ck('out of the museum again (outside the castle)', not J("MUSEUM.status().inside"), json.dumps(J("MUSEUM.status()")))
            set_time(1, 11, 0)
            stand(ox, oy, (math.degrees(math.atan2(-n[0], -n[1])) + 360) % 360)
            lbl = J("GAME.step(0.3)").get('best') or ''
            ck('Monday: the museum is closed (the label at the door says so)', 'geschlossen' in lbl, lbl)
        # the Stadtbibliothek: Tuesday 11:00 open – borrow a book at its door
        set_time(2, 11, 0)
        bx, by = -738.34, 1336.38
        stood = None
        for a in range(0, 360, 30):
            x, y = bx + math.sin(math.radians(a)) * 7.5, by + math.cos(math.radians(a)) * 7.5
            stand(x, y, (a + 180) % 360)
            r = J("GAME.step(0.3)")
            if 'Stadtbibliothek' in (r.get('best') or ''):
                stood = (x, y, r.get('best'))
                break
        ck('the library: at its door „Stadtbibliothek: Buch ausleihen“', stood is not None and 'ausleihen' in stood[2], json.dumps(stood))
        if stood:
            E("OEFFENTLICH.oeffnen('bibliothek')")
            steps(0.3)
            page_pic('bibliothek')
            E("document.querySelector('#kassepanel [data-b]') && document.querySelector('#kassepanel [data-b]').click()")
            ck('a book borrowed (the reader’s card paid, the book in the inventory)', J("INVENTAR.has('buch')"), json.dumps(J("INVENTAR.list()"))[:200])
            E("LKAUF.close()")
        o = J("OEFFENTLICH.orte()")
        ck('the public buildings in the registry with their hours', len(o) >= 7 and all(q['zeiten'] for q in o), json.dumps(o)[:400])
    ck.errors(errs)
    ck.done()
