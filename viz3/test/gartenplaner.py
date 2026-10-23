# feat/gartenplaner: the garden planner – nothing of it at start (no request, no panel, no 3D, same shader programs), opened from the menu
# (plan view, test data with the badge), plants set, a guild, the age switch with pictures of the plan view and of the 3D garden at the
# same spot (heute, 5, 10, 20 Jahre), shade at two times, the warnings (a tree 0.5 m from the boundary, an apple without a pollinator),
# the plant list and the shopping list, on site (a plant set in front of the walker), trunks that stop the walker, shader programs and
# textures per program, reload keeps the plan (and loads the data only after the model stands), „im Garten: aus“ (no request after reload),
# the panel on a phone. Round 2: planting the apple step by step from the Vorrat (the action button, hole, heap, stake, no new shader
# programs), planted and planned in the plan view, „im Garten: aus“ keeps the planted, watering after a dry week, the time-lapse, the harvest
# in its month into the harvest book, pruning in late winter. Pictures and texts in out/gartenplaner/.
#   python3 viz3/test/run.py --port 8979 --serve gartenplaner      (or: python3 viz3/test/gartenplaner.py 8979 [geo,phone,only=a+b])
import sys, os, time, json, math
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__))); import lib
port = sys.argv[1]
arg = sys.argv[2] if len(sys.argv) > 2 else ''
opts = dict(a.split('=', 1) if '=' in a else (a, '1') for a in arg.split(',') if a)
QUERY = '' if opts.get('geo') == '1' else '?nogeo=1'
ONLY = set(opts.get('only', '').split('+')) - {''}
OUT = lib.out('gartenplaner')
ck = lib.Checks('gartenplaner')
errs, reqs = [], []

def want(k):
    return not ONLY or k in ONLY

def boot(pg):
    t0 = time.time(); pg.goto(f'http://localhost:{port}/index.html{QUERY}', timeout=300000, wait_until='domcontentloaded')
    while not pg.evaluate("!!(window.GAME && GAME.loaded && GAME.loaded())"):
        bad = [e for e in errs if e.startswith('PAGEERR')]
        if bad or time.time() - t0 > 1200:
            ck('page loads', False, ' | '.join(bad[:3]) or 'time-out'); ck.errors(errs); ck.done()
        time.sleep(2)
    time.sleep(2); pg.evaluate("window.FREEZE = true"); print('loaded', round(time.time() - t0), 's', flush=True)
    pg.evaluate("document.querySelectorAll('#toast').forEach(e => e.style.visibility = 'hidden'); GAME.setMode('day'); GAME.CAM3.want = false")
    # page screenshots with a blurred backdrop (the plan view's bar) take minutes in SwiftShader – without the blur about half a minute
    pg.evaluate("document.head.insertAdjacentHTML('beforeend', '<style>*{backdrop-filter:none!important;-webkit-backdrop-filter:none!important}</style>')")

def page_shot(pg, name):
    # the whole page with the panel and the plan view's SVG (slow in SwiftShader; never fatal)
    try:
        pg.evaluate("GAME.shot()"); pg.screenshot(path=os.path.join(OUT, name + '.png'), timeout=120000); print('page shot', name, flush=True)
    except Exception as ex:
        print('note: page shot', name, 'failed:', repr(ex)[:160], flush=True)

def section(name, fn):
    if not want(name): return
    try: fn()
    except Exception as ex: ck('section ran: ' + name, False, repr(ex)[:500])

with lib.browser() as b:
    pg = lib.page(b, 1100, 700, errs, tier='mittel')
    pg.on('request', lambda r: reqs.append(r.url.split('?')[0].rsplit('/', 2)[-1]) if '/gartenplaner/' in r.url else None)
    E = pg.evaluate
    J = lambda s: json.loads(E('JSON.stringify(' + s + ')'))
    boot(pg)
    G = {}
    # ---- start: nothing of the planner ----
    def start():
        st = J("""({ panel: !!document.getElementById('gplan'), btn: !!document.getElementById('gplanbtn'), data: GPLAN.data.st, g3: !!GPLAN.G3.group,
          programs: GAME.R.info.programs.length, mem: GAME.R.info.memory, heap: performance.memory ? Math.round(performance.memory.usedJSHeapSize / 1e6) : null,
          gcol: GAME.COL.filter(c => c[6] === 'gplan').length, hooks: SITEPLAN.hooks.length, saved: SAVE.raw('pav-gplan-v1') })""")
        print('start', json.dumps(st), flush=True)
        G['p0'] = st['programs']; G['mem0'] = st['mem']
        ck('start: no request for the planner’s data', not reqs, str(reqs))
        ck('start: no panel, no 3D plants, no collisions, data not loaded', not st['panel'] and not st['g3'] and st['gcol'] == 0 and st['data'] == 'none', json.dumps(st))
        ck('menu entry „Garten planen“, one plan view hook, the start situation „gartenplaner“', st['btn'] and st['hooks'] == 1 and E("!!KERN.scenario('gartenplaner')"), json.dumps(st))
    section('start', start)
    # ---- open from the menu: plan view, test data ----
    def open_():
        E("document.getElementById('menubtn').click()"); time.sleep(0.3)
        E("document.getElementById('gplanbtn').click()")
        for i in range(60):
            if E("GPLAN.data.st") in ('ok', 'fail'): break
            time.sleep(0.5)
        E("GAME.step(0.1)")
        st = J("""({ st: GPLAN.data.st, test: GPLAN.data.test, n: GPLAN.data.db.list.length, mode: GAME.P.mode, panel: !document.getElementById('gplan').hidden,
          badge: !document.querySelector('#gplan .gp-badge').hidden, menu: !document.getElementById('menu').hidden, errors: GPLAN.data.errors.length,
          rows: document.querySelectorAll('#gplan .gp-list button[data-pid]').length })""")
        print('open', json.dumps(st), 'requests', reqs, flush=True)
        ck('open: data loaded (test data while the real files are missing), badge „Testdaten“', st['st'] == 'ok' and (st['badge'] == st['test']), json.dumps(st))
        ck('open: the plan view with the panel, the menu closed', st['mode'] == 'top' and st['panel'] and not st['menu'], json.dumps(st))
        ck('open: the plant list shows the plants', st['rows'] == st['n'] and st['n'] >= 3, json.dumps(st))
        ck('open: the data files asked for only now', any(r.endswith('.json') for r in reqs), str(reqs))
        G['test'] = st['test']
    section('open', open_)
    # ---- plants: an apple in the lawn, a tree 0.5 m from the boundary, a guild ----
    def plants():
        ids = J("GPLAN.data.db.list.map(p => [p.id, p.schicht, p.befruchtung ? p.befruchtung.selbstfruchtbar : null, p.nachbarrecht])")
        trees = [i for i in ids if i[1] == 'baum']
        sterile = [i for i in trees if i[2] == 'nein'] or trees
        G['apple'] = sterile[0][0]
        # a point 0.5 m inside the west boundary at the middle of its longest edge south of the pavilion
        pt = J("""(() => { const B = GPLAN.site().boundary; let best = null;
          for (let i = 0; i < B.length; i++) { const a = B[i], b = B[(i + 1) % B.length], L = Math.hypot(b[0] - a[0], b[1] - a[1]), m = [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];
            if (m[0] > -5 || m[1] > -2 || m[1] < -30) continue; if (!best || L > best.L) best = { a, b, L, m }; }
          const n = [-(best.b[1] - best.a[1]) / best.L, (best.b[0] - best.a[0]) / best.L], q = [best.m[0] + n[0] * 0.5, best.m[1] + n[1] * 0.5];
          return GPLAN.RULES.inPoly(q[0], q[1], B) ? q : [best.m[0] - n[0] * 0.5, best.m[1] - n[1] * 0.5]; })()""")
        G['edge'] = pt
        # shader programs: one frame of the plan view without the plants, then with them (the same view)
        E("GAME.step(0.1); GAME.shot()"); pA = E("GAME.R.info.programs.length")
        E(f"GPLAN.add('{G['apple']}', -3.5, -8.5)")
        E(f"GPLAN.add('{G['apple']}', {pt[0]}, {pt[1]})")
        d = E(f"GPLAN.RULES.edgeDist({pt[0]}, {pt[1]}, GPLAN.site().boundary)")
        gid = J("GPLAN.data.db.guilds.map(g => g.id)")
        # the guild far enough (> 30 m) from the lonely apple that a cultivar in its middle cannot pollinate it
        n = E(f"GPLAN.placeGuild('{gid[0]}', 10, -38)") if gid else 0
        E("GAME.step(0.3)"); time.sleep(0.5); E("GAME.step(0.3); GAME.shot()")
        pB = E("GAME.R.info.programs.length"); G['pB'] = pB
        ck('no new shader programs for the planned plants (trees, mounds; plan view)', pB <= pA, f'{pA} -> {pB}')
        W = J("GPLAN.warnings.map(w => [w.level, w.key, w.items, w.text])")
        print('warnings', json.dumps(W, ensure_ascii=False), flush=True)
        import re
        ck('a tree 0.5 m from the boundary: a warning after the Thuringian neighbour law', d < 0.6 and any(w[1] == 'grenze' and w[0] == 'warn' and 1 in w[2] and re.search(r'0,[45]\d m bis zur Grenze', w[3]) for w in W), f'{d:.2f} m')
        ck('an apple without a pollinator: a warning that names a fitting cultivar', any(w[1] == 'befruchter' and w[0] == 'warn' and 0 in w[2] and 'passend' in w[3] for w in W), '')
        ck('a guild set: the middle tree and its partners', n >= 3 and E("GPLAN.state.items.length") == 2 + n, f'{n} plants')
        tab = J("(() => { document.querySelector('#gplan [data-tab=\"hinweise\"]').click(); return { n: document.querySelectorAll('#gplan .gp-warns li').length, badge: document.querySelector('#gplan [data-tab=\"hinweise\"] b').textContent }; })()")
        ck('the warnings tab lists them, the tab shows the number', tab['n'] == len(W) and tab['badge'] == str(len(W)), json.dumps(tab))
        # tap a warning: its plant is selected; the legal ring is drawn
        E("document.querySelector('#gplan .gp-warns li.warn button').click()")
        sel = J("({ sel: GPLAN.ui.sel, ring: document.querySelectorAll('#topsvg .gp-ring').length, crowns: document.querySelectorAll('#topsvg .gp-c').length })")
        ck('a warning selects its plant; crowns and the distance ring in the plan view', sel['sel'] >= 0 and sel['crowns'] == E("GPLAN.state.items.length") and sel['ring'] == 1, json.dumps(sel))
        E("GPLAN.frameGarden(); GAME.step(0.1)")
        page_shot(pg, 'a_plan_hinweise')
    section('plants', plants)
    # ---- the age switch: the plan view and the 3D garden at the same spot ----
    def ages():
        E("GPLAN.select(-1); document.querySelector('#gplan [data-tab=\"pflanzen\"]').click()")
        sizes = {}
        for a in (0, 5, 10, 20):
            E(f"GPLAN.setAge({a}); GPLAN.frameGarden(); GAME.step(0.1)")
            time.sleep(0.3)
            r = J("(() => { const c = [...document.querySelectorAll('#topsvg .gp-c.gp-baum')].map(e => +e.getAttribute('r')); return { r: Math.max(...c), n: c.length }; })()")
            sizes[a] = r['r']
            page_shot(pg, f'b_plan_{a:02d}_jahre')
        print('crown radius on the plan (px)', sizes, flush=True)
        ck('the crowns grow with the age (plan view)', sizes[0] < sizes[5] < sizes[10] <= sizes[20], json.dumps(sizes))
        # 3D: stand south of the apple in the lawn, look at it (the planner closes when leaving the plan view; the plants stay)
        E("GAME.go('garten')")
        # shader programs in the 3D garden: the same views without and with the planned plants (trees, bushes, perennials, blossom)
        pv = []
        for view in ("-3.5, -16.5, 1.7, 8, 4, 62", "5.2, -33.2, 1.7, 135, -6, 62"):
            E(f"GPLAN.setShow(false); GPLAN.setAge(10); GAME.view({view}); GAME.step(0.2); GAME.shot()"); a = E("GAME.R.info.programs.length")
            E(f"GPLAN.setShow(true); GAME.step(0.2); GAME.shot()"); b2 = E("GAME.R.info.programs.length")
            pv.append((a, b2))
        ck('3D garden: no new shader programs for the planned plants (same views without and with them)', all(b2 <= a for a, b2 in pv), str(pv))
        stats = {}
        for a in (0, 5, 10, 20):
            E(f"GPLAN.setAge({a}); GAME.view(-3.5, -16.5, 1.7, 8, 4, 62); GAME.step(0.2)")
            stats[a] = J("GPLAN.G3.stats")
            lib.shot(pg, OUT, f'c_garten_{a:02d}_jahre')
        print('3D', json.dumps(stats), flush=True)
        # the guild, ten years on
        E("GPLAN.setAge(10); GAME.view(5.2, -33.2, 1.7, 135, -6, 62); GAME.step(0.2)")
        lib.shot(pg, OUT, 'c_gilde_10_jahre')
        ck('3D: the planned plants stand in the garden at every age', all(s['trees'] >= 3 and s['bushes'] >= 1 for s in stats.values()), json.dumps(stats))
        ck('trunks of trees from 5 years on stop the walker (not at planting)', stats[0]['cols'] == 0 and stats[5]['cols'] >= 3, json.dumps(stats))
        # walk north into the apple (from 1.5 m south of it): the trunk holds
        r = J("(() => { GAME.view(-3.5, -10.2, 1.7, 0, 0); return GAME.step(1.6, 1); })()")
        ck('walking into the apple’s trunk stops before it', r['y'] < -8.5 - 0.1, json.dumps(r))
        # seasons: with the planner open on site its month counts (closed: the game's date) – blossom in April, autumn in October
        E("GPLAN.open(); GPLAN.siteMode(true); GAME.step(0.1)")
        pC = E("GAME.R.info.programs.length")
        for m, name in ((4, 'april'), (10, 'oktober'), (1, 'januar')):
            E(f"GPLAN.setShade({m}, 14); GPLAN.setAge(10); GAME.view(-3.5, -16.5, 1.7, 8, 4, 62); GAME.step(0.2)")
            st = J("GPLAN.G3.stats")
            lib.shot(pg, OUT, f'd_garten_10_jahre_{name}')
            E("GAME.view(5.2, -33.2, 1.7, 135, -6, 62); GAME.step(0.2)")
            lib.shot(pg, OUT, f'd_gilde_10_jahre_{name}')
            print('season', name, json.dumps(st), flush=True)
            if m == 4: ck('April: blossom on the trees', st['dots'] > 10, json.dumps(st))
        pD = E("GAME.R.info.programs.length")
        ck('no new shader programs for blossom and fruit', pD <= pC, f'{pC} -> {pD}')
        E("GPLAN.setShade(6, 14); GPLAN.siteMode(false); GAME.step(0.1)")
    section('ages', ages)
    # ---- shade at two times ----
    def shade():
        E("GPLAN.open(); GAME.step(0.1); GPLAN.setAge(20); document.querySelector('#gplan [data-tab=\"schatten\"]').click(); document.querySelector('#gplan [data-gp=\"shade\"]').click(); GPLAN.frameGarden()")
        res = {}
        for h in (9, 17):
            E(f"GPLAN.setShade(6, {h}); GAME.step(0.1)")
            res[h] = J("({ polys: document.querySelectorAll('#topsvg .gp-shade polygon').length, info: document.querySelector('#gplan .gp-sinfo').textContent, sun: GPLAN.shadows().s })")
            page_shot(pg, f'e_schatten_juni_{h:02d}uhr')
        print('shade', json.dumps(res, ensure_ascii=False), flush=True)
        ck('shade in the plan view at 9 and 17 o’clock, the sun east then west', res[9]['polys'] > 3 and res[17]['polys'] > 3 and res[9]['sun']['az'] < 150 and res[17]['sun']['az'] > 210, '')
        n = E("GPLAN.probe(-3.5, -6.2)"); s = E("GPLAN.probe(-3.5, -12.5)")
        ck('a point north of the grown apple lies longer in shade than one south of it', n > s, f'north {n:.2f} south {s:.2f}')
    section('shade', shade)
    # ---- the lists ----
    def lists():
        E("GPLAN.open(); document.querySelector('#gplan [data-tab=\"listen\"]').click()")
        plan = E("GPLAN.listText('plan')"); shop = E("GPLAN.listText('shop')")
        open(os.path.join(OUT, 'pflanzliste.txt'), 'w').write(plan); open(os.path.join(OUT, 'einkaufsliste.txt'), 'w').write(shop)
        name = E(f"GPLAN.M.fullName(GPLAN.data.db.byId.get('{G.get('apple', '')}'))")
        ck('plant list: every plant with its place', 'Pflanzplan' in plan and name in plan and 'zur Grenze' in plan and plan.count('Pflanzjahr') == E("GPLAN.state.items.length"), plan[:200])
        ck('shopping list: counts, Kammbach, planting time, accessories', 'Einkaufsliste' in shop and '× ' + name in shop and 'bei Kammbach' in shop and 'pflanzen ' in shop and 'Zubehör' in shop, shop[:300])
        ui = J("({ pre: document.querySelector('#gplan .gp-text').textContent.length, btns: [...document.querySelectorAll('#gplan .gp-body button')].map(b => b.textContent) })")
        ck('the lists tab: text, Kopieren, Herunterladen', ui['pre'] > 100 and 'Kopieren' in ui['btns'] and 'Herunterladen' in ui['btns'], json.dumps(ui, ensure_ascii=False))
        page_shot(pg, 'f_einkaufsliste')
    section('lists', lists)
    # ---- on site: the walker sets the chosen plant in front of him ----
    def site():
        E("GPLAN.open(); GPLAN.select(0); GPLAN.siteMode(true); GAME.step(0.2)")
        ids = J("GPLAN.data.db.list.filter(p => p.schicht !== 'baum').map(p => p.id)")
        E(f"GPLAN.arm({{ id: '{ids[0]}' }}); GAME.view(-6, -12, 1.7, 90, -10, 62); GAME.step(0.1)")
        # the action button (KERN.act) offers to set it; pressing it puts the plant 2.2 m in front of the walker
        best = J("GAME.step(0.1).best")
        ck('on site: the action button offers „… hier setzen“', bool(best) and best.endswith('hier setzen'), str(best))
        ck('on site: rings on the ground – the selected plant and where the chosen one would stand', E("GPLAN.G3.nMarks") == 32, str(E("GPLAN.G3.nMarks")))
        n0 = E("GPLAN.state.items.length"); E("PLAY.primary(); GAME.step(0.2)")
        it = J("GPLAN.state.items[GPLAN.state.items.length - 1]")
        ck('on site: the plant stands 2.2 m in front of the walker', E("GPLAN.state.items.length") == n0 + 1 and abs(it['x'] - (-6 + 2.2)) < 0.1 and abs(it['y'] - (-12)) < 0.1, json.dumps(it))
        ck('undo takes the plant back', E("GPLAN.undo()") and E("GPLAN.state.items.length") == n0, str(E("GPLAN.state.items.length")))
        ck('on site: walking, the panel open in its small form', J("({ m: GAME.P.mode, site: document.getElementById('gplan').classList.contains('site'), open: !document.getElementById('gplan').hidden })") == {'m': 'walk', 'site': True, 'open': True}, '')
        page_shot(pg, 'g_vor_ort')
        E("GPLAN.siteMode(false); GAME.step(0.1)")
        ck('back to the plan view', E("GAME.P.mode") == 'top', '')
    section('site', site)
    # ---- planting in the game: the apple in the lawn step by step, the plant from the Vorrat ----
    def plant():
        E("GPLAN.close(); GPLAN.setShow(true); GPLAN.setAge(0); GAME.go('garten'); CLOCK.t = 9 * 60; GAME.step(0.1)")
        it = J("GPLAN.state.items[0]"); G['ax'], G['ay'] = it['x'], it['y']
        steps = J(f"GPLAN.M.plantSteps(GPLAN.data.db.byId.get('{G['apple']}'))")
        name = E(f"GPLAN.M.fullName(GPLAN.data.db.byId.get('{G['apple']}'))")
        # the figure 1.3 m south of the apple, looking at it (and down a little)
        E(f"GAME.view({it['x']}, {it['y'] - 1.3}, 1.7, 0, -24, 62); GAME.step(0.1); GAME.shot()")
        pA = E("GAME.R.info.programs.length")
        labels = []
        for k in steps:
            best = J("GAME.step(0.05).best"); labels.append(best)
            dur = E(f"GPLAN.M.STEP['{k}'].dur")
            E("PLAY.primary()"); E(f"GAME.step({dur + 0.25})")
            if k == 'loch':
                G['parts'] = J("GPLAN.G3.stats"); E("GAME.shot()"); lib.shot(pg, OUT, 'j_pflanzloch')
        print('labels', json.dumps(labels, ensure_ascii=False), 'parts after the hole', json.dumps(G.get('parts')), flush=True)
        want_l = [J(f"GPLAN.M.STEP['{k}'].label") for k in steps]
        ck('planting: the action button offers the steps one by one (hole, basket and stake where the plant asks, planting from the Vorrat, watering)',
           all(l and l.startswith(w) and name in l for l, w in zip(labels, want_l)) and '(aus dem Vorrat)' in labels[steps.index('pflanzen')], json.dumps(labels, ensure_ascii=False))
        ck('planting: an open hole with its heap after digging', G.get('parts', {}).get('parts', 0) >= 2, json.dumps(G.get('parts')))
        st = J("GPLAN.state.items[0]"); gd = E("GPLAN.gday()")
        ck('planting: the apple is planted, with the planting day of the game calendar', st.get('st') == 'gepflanzt' and st.get('pd') == gd and 'sch' not in st, json.dumps(st))
        evs = J("KERN.events().slice(-30).map(e => [e.name, e.data])")
        print('events', json.dumps(evs, ensure_ascii=False)[:600], flush=True)
        ck('planting: events gplan:schritt for each step and gplan:gepflanzt with the plant', 'gplan:gepflanzt' in json.dumps(evs) and json.dumps(evs).count('gplan:schritt') == len(steps), json.dumps(evs)[:300])
        E("GAME.step(0.1); GAME.shot()"); pB = E("GAME.R.info.programs.length")
        ck('planting: no new shader programs for hole, heap, stake and the young tree', pB <= pA, f'{pA} -> {pB}')
        lib.shot(pg, OUT, 'k_gepflanzt')
        # „im Garten: aus“ hides only the planned plants
        E("GPLAN.setShow(false); GAME.step(0.1)"); s1 = J("GPLAN.G3.stats")
        E("GPLAN.setShow(true); GAME.step(0.1)"); s2 = J("GPLAN.G3.stats")
        ck('„im Garten: aus“ hides the planned plants, the planted apple stays', s1['trees'] == 1 and s2['trees'] > 1 and E("GPLAN.G3.group.visible"), f'{s1} {s2}')
        # the plan view: planted and planned look different
        E("GPLAN.open(); GPLAN.select(0); GAME.step(0.1)")
        pv = J("({ pl: document.querySelectorAll('#topsvg .gp-c.pl').length, plan: document.querySelectorAll('#topsvg .gp-c:not(.pl)').length, state: (document.querySelector('#gplan .gp-state') || {}).textContent, del: [...document.querySelectorAll('#gplan .gp-sel button')].map(b => b.textContent) })")
        ck('plan view: the planted apple drawn solid, the planned ones dashed; the panel says when it was planted', pv['pl'] == 1 and pv['plan'] >= 3 and 'Gepflanzt am' in (pv['state'] or '') and 'Roden' in pv['del'], json.dumps(pv, ensure_ascii=False))
        # a planted plant is not dragged away in the plan view
        E("GPLAN.frameGarden(); GAME.step(0.1)")
        page_shot(pg, 'l_plan_gepflanzt')
    section('plant', plant)
    # ---- care: watering after a dry week, the time-lapse, harvest in its month, pruning in late winter ----
    def care():
        E("GPLAN.close(); GPLAN.select(-1); GAME.go('garten'); GAME.step(0.1)")
        ax, ay = G['ax'], G['ay']
        look = f"GAME.view({ax}, {ay - 1.3}, 1.7, 0, -14, 62); GAME.step(0.1)"
        E("CLOCK.t += 8 * 1440; GAME.step(0.6)"); E(look)
        best = J("GAME.step(0.6).best")
        rings = E("GPLAN.G3.nMarks")
        ck('a week without rain in June: „Gießen“ at the young apple, a blue ring round it', bool(best) and best.startswith('Gießen') and rings == 16, f'{best} rings {rings}')
        E("PLAY.primary(); GAME.step(2.7)")
        st = J("GPLAN.state.items[0]")
        ck('watering: the day is noted, the event gplan:gegossen', st.get('w') == E("GPLAN.gday()") and 'gplan:gegossen' in json.dumps(J("KERN.events().slice(-12)")), json.dumps(st))
        # the time-lapse: five years on for the plants, the game clock stays
        t0 = E("CLOCK.t"); s0 = J("GPLAN.G3.stats")
        E("GPLAN.timeLapse(5); GAME.step(0.1)")
        p = J(f"(() => {{ const p = GPLAN.data.db.byId.get('{G['apple']}'); return {{ bear: GPLAN.M.bearingAge(p), months: p.ernte ? p.ernte.monate : null, typ: p.darstellung && p.darstellung.typ }}; }})()")
        while E("GPLAN.ageNow(GPLAN.state.items[0])") < p['bear']:
            E("GPLAN.timeLapse(1)")
        age = E("GPLAN.ageNow(GPLAN.state.items[0])")
        ck('time-lapse: the apple years older, the game clock untouched', age >= 5 - 1e-6 and E("CLOCK.t") == t0 and E("GPLAN.state.off") >= 5, f'age {age:.2f} off {E("GPLAN.state.off")}')
        E(f"GAME.view({ax}, {ay - 4.5}, 1.7, 0, 4, 62); GAME.step(0.2)"); lib.shot(pg, OUT, 'm_zeitraffer')
        # the harvest month (of the next game year): the action „Ernten“, kg into the harvest book
        if p['months']:
            m = p['months'][0]
            E(f"CLOCK.t = (Date.UTC(2027, {m - 1}, 15) / 864e5 - DN.e0) * 1440 + 10 * 60; GAME.step(0.6)"); E(look)
            d0 = J("GPLAN.G3.stats.dots")
            best = J("GAME.step(0.6).best")
                E(f"GAME.view({ax}, {ay - 4.5}, 1.7, 0, 4, 62); GAME.step(0.2)"); lib.shot(pg, OUT, 'n_vor_der_ernte')
            E(look); E("PLAY.primary(); GAME.step(3.3)")
            y = E("GPLAN.year()"); log = J("GPLAN.state.ernte")
            d1 = J("GPLAN.G3.stats.dots")
            lines = J("GPLAN.M.harvestLines(GPLAN.state.ernte, GPLAN.data.db)")
            print('harvest', best, json.dumps(log), lines, 'dots', d0, d1, flush=True)
            ck('harvest: „Ernten“ in the harvest month, kg in the harvest book of the garden year, the event gplan:geerntet',
               bool(best) and best.startswith('Ernten') and log.get(str(y), {}).get(G['apple'], 0) > 0 and 'gplan:geerntet' in json.dumps(J("KERN.events().slice(-12)")), f'{best} {log}')
            E("GPLAN.open(); document.querySelector('#gplan [data-tab=\"garten\"]').click(); GAME.step(0.1)")
            txt = E("document.querySelector('#gplan .gp-body').textContent")
            ck('the garden tab: the garden year, the planted apple, „Ernte <year>: … kg“', f'Ernte {y}:' in txt and 'Gartenjahr' in txt and 'Gepflanzt (1)' in txt, txt[:300])
            page_shot(pg, 'o_garten_ernte')
            E("GPLAN.close(); GAME.step(0.1)")
        if p['typ'] == 'obstbaum':
            E(f"CLOCK.t = (Date.UTC(2028, 1, 15) / 864e5 - DN.e0) * 1440 + 10 * 60; GAME.step(0.6)"); E(look)
            best = J("GAME.step(0.6).best")
            E("PLAY.primary(); GAME.step(3.3)")
            ck('late winter: „Schneiden“ at the fruit tree, then done for the year', bool(best) and best.startswith('Schneiden') and J("GPLAN.state.items[0]").get('cut') == E("GPLAN.year()"), str(best))
        # back to June of the first year for the sections after this one (the garden keeps its offset)
        E("CLOCK.t = 9 * 60; GAME.step(0.1)")
    section('care', care)
    # ---- shader programs and textures per program ----
    def gl():
        E("GPLAN.setAge(10); GPLAN.setShow(true); GAME.go('garten'); GAME.view(-3.5, -16.5, 1.7, 8, 4, 62); GAME.step(0.2); GAME.shot()")
        st = J("({ programs: GAME.R.info.programs.length, mem: GAME.R.info.memory })")
        print('programs at start', G.get('p0'), 'now', st['programs'], 'memory at start', G.get('mem0'), 'now', st['mem'], flush=True)
        ok, r = lib.check_gl(pg, 16)
        ck('every shader program within 16 textures, none broken', ok, f"max frag {r['maxFrag']}, bad {r['bad'][:2]}, broken {r['broken'][:2]}")
    section('gl', gl)
    # ---- reload keeps the plan; the data come after the model stands ----
    def reload():
        E("GPLAN.setAge(10); GPLAN.setShow(true)"); time.sleep(0.6)
        before = J("GPLAN.state")
        reqs.clear()
        boot(pg)
        early = list(reqs)
        for i in range(40):
            if E("GPLAN.data.st") == 'ok' and E("GPLAN.G3.stats.trees || 0") > 0: break
            time.sleep(0.5); E("GAME.step(0.1)")
        after = J("GPLAN.state")
        ck('reload keeps the plan (plants, age, setting)', after['items'] == before['items'] and after['age'] == 10 and after['show'] is True, f"{len(after['items'])} plants")
        ck('a plan shown in the garden loads its data after the start and stands again', E("GPLAN.data.st") == 'ok' and E("GPLAN.G3.stats.trees") >= 3, f'requests while loading: {early}')
        E("GAME.view(-3.5, -16.5, 1.7, 8, 4, 62); GAME.step(0.2)"); lib.shot(pg, OUT, 'h_nach_neuladen')
    section('reload', reload)
    # ---- „im Garten: aus“: hidden, and after a reload nothing is loaded ----
    def off():
        E("GPLAN.setShow(false)"); time.sleep(0.6); E("GAME.step(0.1)")
        npl = E("GPLAN.state.items.filter(it => it.st === 'gepflanzt').length")
        if not npl:
            ck('„im Garten: aus“ hides the plants', E("!GPLAN.G3.group || !GPLAN.G3.group.visible"), '')
            reqs.clear(); boot(pg); time.sleep(3); E("GAME.step(0.5)")
            ck('after a reload with „aus“: no request for the data, the plan kept', not reqs and E("GPLAN.state.show") is False and E("GPLAN.state.items.length") > 3, str(reqs))
            return
        st = J("GPLAN.G3.stats")
        ck('„im Garten: aus“ hides the planned plants, the planted stand', st['trees'] + st['bushes'] == npl and E("GPLAN.G3.group.visible"), json.dumps(st))
        reqs.clear(); boot(pg); early = list(reqs)
        for i in range(40):
            if E("GPLAN.data.st") == 'ok' and E("GPLAN.G3.stats.trees || 0") > 0: break
            time.sleep(0.5); E("GAME.step(0.1)")
        st = J("GPLAN.G3.stats")
        ck('after a reload with „aus“: the planted plants stand again (data loaded after the start), the planned stay hidden', not early and E("GPLAN.state.show") is False and st['trees'] + st['bushes'] == npl, f'{st} early {early}')
    section('off', off)
    ck.errors(errs)
    # ---- the panel on a phone held upright ----
    if opts.get('phone') == '1' or 'phone' in ONLY:
        p2 = lib.page(b, 390, 780, errs, tier='schnell', is_mobile=True, has_touch=True, device_scale_factor=2)
        pg = p2; E = pg.evaluate; J = lambda s: json.loads(E('JSON.stringify(' + s + ')'))
        boot(pg)
        E("document.getElementById('gplanbtn').click()")
        for i in range(40):
            if E("GPLAN.data.st") == 'ok': break
            time.sleep(0.5)
        E("GPLAN.frameGarden(); GAME.step(0.2)")
        r = J("(() => { const a = document.getElementById('gplan').getBoundingClientRect(); return { top: a.top, bottom: a.bottom, h: a.height, w: a.width, H: innerHeight }; })()")
        ck('phone: the panel is a sheet at the bottom, at most half the height', r['bottom'] >= r['H'] - 2 and r['h'] <= r['H'] * 0.52 and r['w'] >= 380, json.dumps(r))
        page_shot(pg, 'i_telefon')
        # the phone turned: the panel beside the plan, inside the screen
        pg.set_viewport_size({'width': 780, 'height': 390}); time.sleep(0.5)
        E("GPLAN.frameGarden(); GAME.step(0.2)")
        r = J("(() => { const a = document.getElementById('gplan').getBoundingClientRect(); return { left: a.left, right: a.right, top: a.top, bottom: a.bottom, w: a.width, W: innerWidth, H: innerHeight }; })()")
        ck('phone across: the panel on the right, at most half the width, inside the screen', r['right'] <= r['W'] + 1 and r['w'] <= r['W'] * 0.5 and r['bottom'] <= r['H'] + 1 and r['top'] >= 0, json.dumps(r))
        page_shot(pg, 'i_telefon_quer')
ck.done()
