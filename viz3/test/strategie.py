# feat/strategie (Falko 5.11.2026 23:11–23:30): „Ratscher von oben“ – the same world from above, steered like Die Siedler 3 / Age of
# Empires / Warcraft 3 (viz3/src/strategie/*). Starts the scene (?szenario=strategie) and checks with numbers: the mode is on in the plan
# view, the German HUD (resource bar with Euro, logs, boards, firewood, power, petrol, diesel; the five people; time controls); who is
# there when (Saturday: your people and the neighbours; Tuesday: only the neighbours; Sunday: the neighbours rest); selecting a person by
# a click on her symbol and by a frame, a right click on a place gives her a job (mowing), the clock runs from above at 30×, the job
# advances and changes the world (the lawn is short in garden/grass.js, petrol left the mower's tank), a quiet-hours refusal on a Sunday
# with its reason and source („Warum?“), Euro booked, the state after a reload, the normal walk afterwards; no new shader program, no
# page error. Pictures in out/strategie/ (from above, close up).
#   python3 viz3/test/strategie.py 9002 [sections]     sections: start,leute,auftrag,regel,holz,strom,ereignis,reload,welt (default all)
import sys, os, json, time, math
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__))); import lib
port = sys.argv[1] if len(sys.argv) > 1 else '8951'
want = set((sys.argv[2] if len(sys.argv) > 2 else 'start,leute,auftrag,regel,holz,strom,ereignis,reload,welt').split(','))
ck = lib.Checks('strategie')
OUT = lib.out('strategie')
with lib.browser() as b:
    errs = []
    pg = lib.page(b, 1200, 760, errs)
    lib.boot(pg, port, '?szenario=strategie')
    E = pg.evaluate
    J = lambda js: json.loads(E("JSON.stringify(" + js + ")"))
    steps = lambda secs, dt=0.25: E(f"for (let i = 0; i < {max(1, int(secs / dt))}; i++) GAME.step({dt})")
    E("document.head.insertAdjacentHTML('beforeend', '<style>*{backdrop-filter:none!important;-webkit-backdrop-filter:none!important}</style>')")
    def page_pic(name):
        try:
            E("GAME.shot(); STHUD.draw()"); pg.screenshot(path=os.path.join(OUT, name + '.png'), timeout=120000); print('page shot', name, flush=True)
        except Exception as e: print('note: page shot', name, 'failed:', repr(e)[:160], flush=True)
    def until(cond, secs=120, dt=0.25):
        for i in range(int(secs / 5)):
            steps(5, dt)
            if E(cond): return True
        return E(cond)
    def job(defn, who):
        return J(f"(() => {{ const j = STRAT.job.add('{defn}', {json.dumps(who)}); return j && j.id ? {{ id: j.id, dur: Math.round(j.dur) }} : j; }})()")
    def done(jid):
        return f"(() => {{ const j = STRAT.job.of('{jid}'); return !j || j.st === 'done'; }})()"
    progs = lambda: E("GAME.R.info.programs.length")
    pnames = lambda: J("GAME.R.info.programs.map(p => p.name + ' ' + String(p.cacheKey).length)")
    def newprogs(before):
        now = pnames()
        return [n for n in now if n not in before][:20]
    # the programs of the chain's own things (the logs' instanced meshes, the workshop and the yard – boards, the drying stack, the board on
    # the shelf –, and what came onto the scene since the mark: the felled tree; no figures – a person's first look compiles her own, the
    # lead warms those centrally): each must have been there before
    def mark():
        E("window.__st_roots = GAME.scene.children.map(o => o.uuid)")
        return set(J("GAME.R.info.programs.map(p => p.cacheKey)"))
    OWN = """(() => { const R = GAME.R, out = [], seen = new Set();
      const addO = (o, what) => o && o.traverse(m => { if (!m.material || m.isSkinnedMesh) return; for (const M of [].concat(m.material)) { if (seen.has(M)) continue; seen.add(M);
        const p = R.properties.get(M).currentProgram; if (p) out.push([what + ' ' + (M.name || M.type), p.cacheKey]); } });
      for (const sp of new Set(HOLZ.logs.map(l => l.sp))) { const G = HOLZ.species && HOLZ.species(sp); if (G) { addO(G.mS, 'Stamm'); addO(G.mC, 'Stamm'); } }
      const Bw = window.BUILD && BUILD.werkstatt; if (Bw && Bw.root) addO(Bw.root, 'Werkstatt');
      const base = new Set(window.__st_roots || []);
      for (const o of GAME.scene.children) if (!base.has(o.uuid)) { let sk = false; o.traverse(m => { if (m.isSkinnedMesh) sk = true; }); if (!sk) addO(o, 'neu ' + (o.name || o.type)); }
      return out; })()"""
    def own_new(K):
        own = J(OWN)
        return own, sorted(set(n for n, k in own if k not in K))
    steps(1.0)
    E("GAME.shot()")
    p0 = progs()
    pn0 = pnames()
    # a Saturday morning in November: your people are in the garden, the neighbours too; dry weather (the live or the climate's could rain)
    E("STRAT.W.force = { cloud: 0.3, rain: 0, wind: 12, storm: false, src: 'Test' }")
    day = J("STRAT.setDate('2026-11-07', 9 * 60 + 30)")
    steps(0.5)
    if 'start' in want:
        st = J("({ on: STRAT.on, mode: GAME.P.mode, res: document.querySelectorAll('#sthud .r').length, ppl: document.querySelectorAll('#stppl .p').length, time: !document.getElementById('sttime').hidden, svg: document.getElementById('stsvg').childElementCount, sitebar: getComputedStyle(document.getElementById('sitebar')).display })")
        ck('the scene „Ratscher von oben“ starts the mode in the plan view', st['on'] and st['mode'] == 'top', str(st))
        ck('the resource bar shows Euro, logs, boards, firewood, power, petrol, diesel', st['res'] >= 7, str(st))
        ck('the five people are listed (Falko, Sarah, Christoph, Hubert, Ronald)', st['ppl'] == 5, str(st))
        ck('time controls and the overlay are there, the building toolbar of the plan view is hidden', st['time'] and st['svg'] > 3 and st['sitebar'] == 'none', str(st))
        txt = E("document.getElementById('sthud').textContent")
        ck('Euro with the start capital and the units fm, m³, rm, %, l', '2.500,00 €' in txt and 'fm' in txt and 'rm' in txt and ' l' in txt, txt[:200])
        E("STHUD.refresh()")
        ck('the calendar says Saturday', day['wd'] == 6 and 'Sa' in E("document.getElementById('stdate').textContent"), str(day) + ' ' + E("document.getElementById('stdate').textContent"))
        page_pic('01_von_oben')
    if 'leute' in want:
        pres = J("Object.fromEntries(Object.keys(STRAT.S.people).map(id => [id, STRAT.present(id).ok]))")
        ck('Saturday 9:30: all five are there', all(pres.values()), str(pres))
        J("STRAT.setDate('2026-11-10', 10 * 60)")
        steps(0.3)
        pres = J("Object.fromEntries(Object.keys(STRAT.S.people).map(id => [id, STRAT.present(id).ok]))")
        ck('Tuesday 10:00: only Hubert and Ronald (your people are at home during the week)', pres == {'falko': False, 'sarah': False, 'christoph': False, 'hubert': True, 'ronald': True}, str(pres))
        away = E("document.querySelector('#stppl [data-p=sarah] .s').textContent")
        ck('the list says when Sarah comes next (Friday evening)', 'kommt' in away and 'Fr' in away, away)
        J("STRAT.setDate('2026-11-08', 10 * 60)")
        steps(0.3)
        pres = J("({ h: STRAT.present('hubert'), f: STRAT.present('falko').ok })")
        ck('Sunday: the neighbours rest (and say why), your people are there', not pres['h']['ok'] and pres['h']['why'] == 'ruhe_sonntag' and pres['f'], str(pres))
        J("STRAT.setDate('2026-11-07', 9 * 60 + 30)")
        steps(0.3)
        # select Sarah by a click on her symbol (the plan view's pointer events → the hook of strategie/st_hud.js)
        q = J("(() => { const p = STRAT.pos('sarah'); GAME.shot(); const s = STHUD.pr(p[0], p[1], 1.8); const r = document.querySelector('#stage canvas').getBoundingClientRect(); return [s[0] + r.left, s[1] + r.top]; })()")
        pg.mouse.click(q[0], q[1])
        steps(0.1)
        sel = J("STRAT.S.sel")
        ck('a click on Sarah\'s symbol selects her (and opens her panel)', sel == ['sarah'] and not E("document.getElementById('stpan').hidden"), str(sel) + ' at ' + str(q))
        # a frame around Falko, Sarah and Christoph (by the bungalow)
        box = J("(() => { const r = document.querySelector('#stage canvas').getBoundingClientRect(); const ps = ['falko','sarah','christoph'].map(id => { const p = STRAT.pos(id); return STHUD.pr(p[0], p[1], 1.8); }); const xs = ps.map(p => p[0]), ys = ps.map(p => p[1]); return [Math.min(...xs) - 25 + r.left, Math.min(...ys) - 25 + r.top, Math.max(...xs) + 25 + r.left, Math.max(...ys) + 25 + r.top]; })()")
        pg.mouse.move(box[0], box[1]); pg.mouse.down(); pg.mouse.move((box[0] + box[2]) / 2, (box[1] + box[3]) / 2, steps=4); pg.mouse.move(box[2], box[3], steps=4); pg.mouse.up()
        steps(0.1)
        sel = J("STRAT.S.sel")
        ck('a frame selects several (your three by the bungalow)', set(sel) >= {'falko', 'sarah', 'christoph'}, str(sel))
        # send Christoph somewhere with a right click on the ground
        E("STHUD.select(['christoph'])")
        tgt = J("(() => { const r = document.querySelector('#stage canvas').getBoundingClientRect(); const s = STHUD.pr(-2, 4, 0); return [s[0] + r.left, s[1] + r.top]; })()")
        pg.mouse.click(tgt[0], tgt[1], button='right')
        steps(0.1)
        w = J("({ path: !!STRAT.S.people.christoph.path, to: STRAT.S.people.christoph.path ? STRAT.S.people.christoph.path.pts.slice(-1)[0] : null })")
        ck('a right click on the ground sends him there (a path)', w['path'] and w['to'] and math.hypot(w['to'][0] + 2, w['to'][1] - 4) < 2.5, str(w))
        E("STRAT.setSpeed(5)")
        steps(3)
        cpos = J("STRAT.pos('christoph')")
        ck('… and he walks there in game time', math.hypot(cpos[0] + 2, cpos[1] - 4) < 2.5, str(cpos))
        page_pic('02_auswahl')
    if 'auftrag' in want:
        E("STHUD.select(['sarah'])")
        before = J("({ m2: STRAT.W.mownArea(CLOCK.t), fuel: STRAT.W.fuel(), t: CLOCK.t })")
        # a right click on the place „Garten (Rasen)“ with Sarah selected: the one possible job there is given (mowing)
        g = J("(() => { const r = document.querySelector('#stage canvas').getBoundingClientRect(); const c = STRAT.place.pos('garten'); const s = STHUD.pr(c[0], c[1], 1); return [s[0] + r.left, s[1] + r.top]; })()")
        pg.mouse.click(g[0], g[1], button='right')
        steps(0.1)
        jb = J("STRAT.S.jobs.filter(j => j.def === 'maehen').map(j => ({ id: j.id, who: j.who, st: j.st, dur: Math.round(j.dur) }))")
        ck('a right click on the garden gives Sarah the job „Rasen mähen“', len(jb) == 1 and jb[0]['who'] == ['sarah'], str(jb) + ' ' + str(J("STRAT.S.notes.slice(-3).map(n => n.text)")))
        if not jb:
            E("STRAT.job.add('maehen', ['sarah'], { place: 'garten' })")
        E("STRAT.setSpeed(30)")
        for i in range(40):
            steps(2)
            s = J("(() => { const j = STRAT.S.jobs.find(j => j.def === 'maehen'); return j ? { st: j.st, k: j.done / j.dur, need: j.need } : { st: 'none' }; })()")
            if s['st'] == 'done': break
        after = J("({ m2: STRAT.W.mownArea(CLOCK.t), fuel: STRAT.W.fuel(), t: CLOCK.t, xp: STRAT.S.people.sarah.xp, nd: STRAT.S.people.sarah.nd })")
        ck('the clock runs from above (30×) and the job is done', s['st'] == 'done' and after['t'] > before['t'] + 30, f"{s} t {before['t']} → {after['t']}")
        ck('the world changed: the lawn is short where she mowed (garden/grass.js)', after['m2'] > before['m2'] + 150, f"{before['m2']} → {after['m2']} m²")
        used = before['fuel']['mower'] + before['fuel']['can'] - after['fuel']['mower'] - after['fuel']['can']
        ck('petrol left the mower\'s tank and the can (about a litre an hour)', 0.2 < used < 2.5, f'{used:.2f} l')
        ck('Sarah gained experience and is a little tired', after['xp'] > 30 and after['nd']['energy'] < 85, str(after))
        lib.shot(pg, OUT, '03_gemaeht_oben')
        E("GAME.P.th = 34; GAME.P.tx = STRAT.place.pos('garten')[0]; GAME.P.ty = STRAT.place.pos('garten')[1]")
        lib.shot(pg, OUT, '04_gemaeht_nah')
        E("GAME.P.th = 120; GAME.P.tx = -2; GAME.P.ty = -8")
    if 'regel' in want:
        J("STRAT.setDate('2026-11-08', 11 * 60)")
        steps(0.3)
        q = J("STRAT.job.check('maehen', ['falko'])")
        ck('Sunday: mowing is refused – quiet day (Thüringer Feiertagsgesetz, 32. BImSchV)', q and q.get('rule') == 'ruhe_sonntag' and 'BImSchV' in q.get('src', '') and len(q.get('why', '')) > 40, str(q))
        E("STHUD.select(['falko'])")
        r = J("STRAT.job.add('maehen', ['falko'])")
        ck('… the job is not given', r and r.get('no'), str(r))
        E("STHUD.openPlace('garten')")
        steps(0.1)
        E("document.querySelector('#stpan [data-whyj=maehen]') && document.querySelector('#stpan [data-whyj=maehen]').click()")
        steps(0.1)
        why = J("[...document.querySelectorAll('#stnotes .n')].map(n => n.textContent).join(' | ')")
        ck('„Warum?“ gives the reason and its source', 'BImSchV' in why, why[:300])
        J("STRAT.setDate('2026-11-09', 21 * 60)")
        q = J("STRAT.job.check('maehen', ['hubert'])")
        ck('Monday 21:00: refused for the evening (32. BImSchV § 7: 7–20 h)', q and q.get('rule') in ('ruhe_nacht', 'nachts_daheim', 'feierabend') or (q and 'Feierabend' in q.get('text', '')), str(q))
        E("STRAT.book(-12.5, 'Test: Kettenöl', 'test')")
        led = J("({ eur: STRAT.S.eur, last: STRAT.S.ledger.slice(-1)[0] })")
        ck('Euro booked in the ledger', abs(led['eur'] - 2487.5) < 0.01 and led['last']['text'] == 'Test: Kettenöl', str(led))
        page_pic('05_warum')
    if 'holz' in want:
        # the wood chain end to end in time-lapse: look → fell → skid → saw → stack → dry; oak panels → boards → the order
        E("STRAT.setSpeed(30)")
        E("STRAT.W.force = { cloud: 0.2, rain: 0, wind: 10, storm: false, src: 'Test' }")
        J("STRAT.setDate('2026-11-14', 8 * 60 + 30)")
        k0 = J("STRAT.known('wald', 'klinge')")
        ck('the Klinge is unknown until someone looks (exploration instead of a fog of war)', k0 is None and 'unbekannt' in E("JSON.stringify(STRAT.place.get('klinge').stock())"), str(k0))
        q = J("STRAT.job.check('faellen', ['falko', 'christoph'])")
        ck('felling without the course is refused – with its reason and source (DGUV, SVLFG)', q and (q.get('rule') == 'lehrgang' or 'nachsehen' in q.get('text', '')), str(q))
        q1 = J("STRAT.job.check('faellen', ['hubert'])")
        ck('… and never alone in the forest (two people)', q1 and q1.get('rule') == 'allein', str(q1))
        q2 = J("(() => { const c = STRAT.S.people.christoph.certs; c.push('motorsaege'); const r = STRAT.job.check('faellen', ['christoph', 'falko']); c.pop(); return r; })()")
        ck('… and only with forest gear for both in the danger zone (the Forstkiste at the tractor holds one set; DGUV I 214-046)', q2 and q2.get('rule') == 'psa_forst' and q2.get('src'), str(q2))
        E("window.__ent = []; KERN.on('strategie:entdeckt', d => window.__ent.push(d))")
        w = job('waldbegang', ['sarah'])
        ok = until(done(w['id']), 160)
        k1 = J("STRAT.known('wald', 'klinge')")
        ent = J("window.__ent")
        if not ent: ent = J("KERN.events().filter(e => e.name === 'strategie:entdeckt').map(e => e.data)")
        print('events', J("KERN.events().slice(-12).map(e => e.name)"), flush=True)
        ck('Sarah walks to the Klinge, looks and knows: the marked trees', ok and k1 and k1['data']['marked'] >= 5, str(k1)[:300])
        ck('the discovery comes as the event strategie:entdeckt (for the discovery book)', len(ent) >= 1 and ent[0]['kind'] == 'wald' and ent[0].get('source'), str(ent)[:300])
        E("(() => { const c = STRAT.place.pos('klinge'); GAME.P.tx = c[0]; GAME.P.ty = c[1]; GAME.P.th = 260; })()")
        E("STRAT.setSpeed(0)"); steps(1.5); E("STRAT.setSpeed(30)")
        page_pic('07_klinge_oben')
        E("GAME.P.th = 120; GAME.P.tx = -2; GAME.P.ty = -8")
        tree = J("STHOLZ.marked()[0] ? { id: STHOLZ.marked()[0].id, sp: STHOLZ.marked()[0].sp, h: STHOLZ.marked()[0].h } : null")
        # the views of the chain drawn once before (the world's own first look compiles what it shows there) – then the chain may add none
        views = [("GAME.P.tx = -2; GAME.P.ty = -8; GAME.P.th = 120", 'garten'),
                 (f"(() => {{ const t = FOREST.byId({tree['id']}); GAME.P.tx = t.x; GAME.P.ty = t.y; GAME.P.th = 60; }})()", 'baum'),
                 ("(() => { const c = STRAT.place.pos('holzlager'); GAME.P.tx = c[0]; GAME.P.ty = c[1]; GAME.P.th = 30; })()", 'lager')]
        # the same date and hour for every look (the light of the day decides shader variants of the world's own materials)
        when0 = J("({ e0: DN.e0, t: CLOCK.t })")
        def look_all():
            now = J("({ e0: DN.e0, t: CLOCK.t })")
            E(f"DN.e0 = {when0['e0']}; CLOCK.t = {when0['t']}; STRAT.S.t = CLOCK.t")
            lib.settle_light(pg)
            for js, nm in views:
                E(js); steps(0.5); E("GAME.shot()")
            E("GAME.P.th = 120; GAME.P.tx = -2; GAME.P.ty = -8")
            E(f"DN.e0 = {now['e0']}; CLOCK.t = {now['t']}; STRAT.S.t = CLOCK.t")
            lib.settle_light(pg)
        look_all()
        p1 = progs()
        pn1 = pnames()
        K1 = mark()
        f = job('faellen', ['hubert', 'falko'])
        ck('Hubert (with the course) and Falko get the felling job', f and f.get('id'), str(f))
        ok = until(done(f['id']), 200)
        ft = J(f"({{ rec: FELL.trees[{tree['id']}] ? FELL.trees[{tree['id']}].st : null, gone: FOREST.byId({tree['id']}).gone, logs: HOLZ.logs.filter(l => l.tid === {tree['id']}).map(l => ({{ id: l.id, st: l.st, vol: l.vol, L: l.L }})), fell: FELL.logs.filter(l => l.tid === {tree['id']}).length }})")
        ck('the tree is felled and worked up in the world (world/fell.js record done, gone from the standing forest)', ok and ft['rec'] == 'done' and ft['gone'], str(ft)[:300])
        ck('its measured logs lie in the forest as HOLZ logs (the same as by hand)', len(ft['logs']) >= 2 and all(l['st'] == 'ground' for l in ft['logs']), str(ft['logs'])[:300])
        look_all()
        own, ours = own_new(K1)
        ck('felling made no new shader program for its own things (compiled ahead when the mode started)', own and not ours, f'{len(own)} drawn materials, new: {ours}; new in all: {newprogs(pn1)}')
        E(f"(() => {{ const t = FOREST.byId({tree['id']}); GAME.P.tx = t.x; GAME.P.ty = t.y; GAME.P.th = 60; }})()")
        E("STRAT.setSpeed(0)"); steps(1.5); E("STRAT.setSpeed(30)")  # the forest chooses its near trees for the new view, the tiles come
        lib.shot(pg, OUT, '08_gefaellt_nah')
        E("GAME.P.th = 120; GAME.P.tx = -2; GAME.P.ty = -8")
        led0 = J("STRAT.S.eur")
        r = job('ruecken', ['hubert'])
        # on the way home: the tractor with its load on the field track (the driver's symbol goes along the route, the tractor on the map)
        E("STRAT.setSpeed(5)")
        on_way = None
        for i in range(160):
            steps(1)
            st = J(f"""(() => {{ const j = STRAT.job.of('{r['id']}'); if (!j) return null; const k = j.done / Math.max(1, j.dur), p = STRAT.pos('hubert'),
              a = STRAT.place.pos('klinge'), b = STRAT.place.pos('holzlager'); return {{ st: j.st, k: +k.toFixed(3), p: p.slice(0, 2).map(v => +v.toFixed(1)),
              da: Math.round(Math.hypot(p[0] - a[0], p[1] - a[1])), db: Math.round(Math.hypot(p[0] - b[0], p[1] - b[1])) }}; }})()""")
            if not st or st['st'] == 'done': break
            if st['st'] == 'work' and 0.6 < st['k'] < 0.8:
                on_way = st
                break
        ck('on the way home the tractor with the load is on the field track (the driver goes along the route between the Klinge and the yard)', on_way and on_way['da'] > 60 and on_way['db'] > 60, str(on_way or st))
        if on_way:
            E(f"GAME.P.tx = {on_way['p'][0]}; GAME.P.ty = {on_way['p'][1]}; GAME.P.th = 220")
            E("STRAT.setSpeed(0)"); steps(1.0)
            page_pic('085_traktor')
            E("GAME.P.th = 120; GAME.P.tx = -2; GAME.P.ty = -8")
        E("STRAT.setSpeed(30)")
        ok = until(done(r['id']), 200)
        yd = J("({ yard: STHOLZ.logsYard().length, forest: STHOLZ.logsForest().length, diesel: STRAT.S.diesel })")
        ck('Hubert skids the logs with tractor and winch home to the log yard', ok and yd['yard'] >= 2, str(yd))
        b0 = J("HOLZSAW.boards.length")
        sw = job('saegen52', ['christoph'])
        ok = until(done(sw['id']), 200)
        b1 = J("({ n: HOLZSAW.boards.length, pile: STHOLZ.boardsPile().length, yard: STHOLZ.logsYard().length, fire: HOLZSAW.fire })")
        ck('Christoph saws them on the band sawmill into planks (werk/holz_saw.js boards, slabs as firewood)', ok and b1['n'] > b0 + 4 and b1['yard'] == 0, f'{b0} → {b1}')
        st = job('stapeln', ['sarah', 'christoph'])
        ok = until(done(st['id']), 120)
        ms0 = J("HOLZDRY.stackMC()")
        ck('Sarah and Christoph stack them to dry (werk/holz_dry.js)', ok and ms0 and ms0['n'] >= b1['pile'] and ms0['avg'] > 30, str(ms0))
        E("(() => { const c = STRAT.place.pos('holzlager'); GAME.P.tx = c[0]; GAME.P.ty = c[1]; GAME.P.th = 30; })()")
        E("STRAT.setSpeed(0)"); steps(1.0); E("STRAT.setSpeed(30)")
        lib.shot(pg, OUT, '09_holzlager')
        E("GAME.P.th = 120; GAME.P.tx = -2; GAME.P.ty = -8")
        E("STRAT.skip(75 * 1440)")
        until("!CLOCK.warp", 60, 0.25)
        ms1 = J("HOLZDRY.stackMC()")
        ck('two and a half months later the stack is drier (the climate of Meiningen)', ms1 and ms1['avg'] < ms0['avg'] - 10, f"{ms0['avg']:.0f} → {ms1['avg']:.0f} %")
        # own wood for the workshop: not yet (still too wet to dry on – and why); through spring and summer the stack becomes air-dry, the planks
        # are dried on (today, without the hall, under the lean-to's roof; with the hall in the cabinet) and glued to panels of own wood
        q0 = J("STRAT.job.check('nachtrocknen', ['christoph'])")
        ck('drying on is refused while the stack is not air-dry – with the reason (checks above ~20 %)', q0 and 'lufttrocken' in q0.get('text', '') and q0.get('why'), str(q0)[:300])
        for i in range(10):
            ms = J("HOLZDRY.stackMC()")
            if ms and ms['avg'] <= 20.5: break
            E("STRAT.skip(30 * 1440)"); until("!CLOCK.warp", 60, 0.25)
        ms2 = J("HOLZDRY.stackMC()")
        E("STRAT.S.plan.urlaub = [{ from: STRAT.W.day(CLOCK.t).iso, to: STRAT.W.day(CLOCK.t + 400 * 1440).iso }]")  # on site every day
        nt = job('nachtrocknen', ['christoph'])
        ok = nt and nt.get('id') and until(done(nt['id']), 160)
        km = J("HOLZDRY.kilnMC()")
        ck('air-dry by summer, the planks go to dry on (under the lean-to\'s roof today; the cabinet comes with the hall)', ok and km and km['n'] > 4, f"stack {ms2 and round(ms2['avg'], 1)} % → {km} {nt} {J('STRAT.S.notes.slice(-2).map(n => n.text)')}")
        for i in range(24):
            km = J("HOLZDRY.kilnMC()")
            if km and km['mc'] <= J("HOLZDRY.kilnTarget()"): break
            E("STRAT.skip(15 * 1440)"); until("!CLOCK.warp", 40, 0.25)
        op0 = J("STHOLZ.ownPanels().length")
        lo = job('leimholz_eigen', ['falko'])
        ok = lo and lo.get('id') and until(done(lo['id']), 200)
        op1 = J("STHOLZ.ownPanels().map(w => w.sp + ' ' + w.mc)")
        ck('Falko glues panels of own wood from the Klinge (table saw, drum sander, clamps) – Leimholz in the workshop rack', ok and len(op1) > op0, f'{km} → {op0} → {op1} {lo} {J("STRAT.S.notes.slice(-2).map(n => n.text)")}')
        if op1 and all(w.startswith('larch') for w in op1):
            o3 = J("STRAT.S.orders.find(o => o.key === 'laerche3')")
            ck('the first Leimholz of own larch brings its order: 3 Schneidebretter Lärche aus der Klinge', o3 and o3['n'] == 3 and o3['wood'] == 'larch', str(o3)[:200])
            bl = job('brett_eigen', ['falko'])
            ok = bl and bl.get('id') and until(done(bl['id']), 200)
            lb = J("STHOLZ.shelf(0, 'larch').map(w => ({ id: w.id, stars: w.stars, sp: w.sp, notes: w.notes }))")
            ck('Falko builds the first board of own larch – on the shelf as larch, apart from the oak ones', ok and len(lb) == 1 and J("STHOLZ.shelf(0).length") == 0, f'{lb} {bl}')
        else:
            print('note: the own panels are not larch', op1, flush=True)
        # the workshop: oak panels, five boards, the order
        J("STRAT.setDate('2026-11-21', 8 * 60 + 30)")
        o = J("STRAT.S.orders.find(o => o.key === 'bretter5')")
        ck('the first order is there: 5 Schneidebretter Eiche, at least 3 stars, with a date', o and o['n'] == 5 and o['minStars'] == 3 and o['due'] > 0, str(o)[:200])
        ph = J("STHOLZ.panelHalves()")
        e0 = J("STRAT.S.eur")
        lz = job('leimholz', ['sarah'])
        ok = until(done(lz['id']), 60)
        e1 = J("STRAT.S.eur")
        ck('Sarah orders oak panels: Euro booked with real prices (3 × 64 € + delivery)', ok and abs((e0 - e1) - (3 * 64 + 25)) < 0.02, f'{e0} → {e1}')
        E("STRAT.skip('morgen')")
        until("!CLOCK.warp", 30, 0.25)
        steps(8)
        ph2 = J("STHOLZ.panelHalves()")
        ck('the delivery comes at 9:00 – the panels lie in the workshop (werk/werk.js rack)', ph2 >= ph + 6, f'{ph} → {ph2} halves')
        # a holiday week for the boards (the holiday plan: your people on site every day; Sundays the machines rest)
        E("STRAT.S.plan.urlaub = [{ from: '2026-11-22', to: '2026-12-06' }]")
        E("STRAT.ability.use('falko', 'meisterstueck')")
        made = []
        gen0 = J("STRAT.W.fuel()")
        for i in range(9):
            if J("STHOLZ.shelf(3).length") >= 5: break
            bj = job('brett', ['falko'])
            if not bj or not bj.get('id'):
                print('note: board job', bj, flush=True)
                steps(20)
                continue
            for k in range(12):
                if until(done(bj['id']), 40): break
                w = J(f"(() => {{ const j = STRAT.job.of('{bj['id']}'); return j ? {{ st: j.st, need: j.need }} : null; }})()")
                print('  board', i, w, J("CLOCK.fmt(CLOCK.t)"), flush=True)
            made.append(J("STHOLZ.shelf().slice(-1)[0] ? STHOLZ.shelf().slice(-1)[0].stars : null"))
        sh = J("STHOLZ.shelf().map(w => ({ id: w.id, stars: w.stars, by: w.by }))")
        ck('Falko builds the boards in his holiday week; they lie on the shelf with his stars (the first a master piece)', J("STHOLZ.shelf(3).length") >= 5 and all(w['by'] == 'Falko' for w in sh[-5:]), str(sh)[:300] + ' made ' + str(made))
        gen1 = J("({ f: STRAT.W.fuel(), genL: STRAT.S.power.genL || 0, soc: STRAT.S.power.soc })")
        ck('power: the machines drew from the power station and the generator (petrol from its tank)', gen1['genL'] > 0.2 or gen1['soc'] < 1.9, f'{gen0} → {gen1}')
        pw = J("({ gen: STRAT.W.fuel().gen, soc: STRAT.S.power.soc })")
        e2 = J("STRAT.S.eur")
        dl = job('liefern', ['sarah'])
        if dl and dl.get('id'): until(done(dl['id']), 80)
        o2 = J("STRAT.S.orders.find(o => o.key === 'bretter5')")
        e3 = J("STRAT.S.eur")
        ck('Sarah delivers: the order is done, Euro booked, the boards left the shelf', o2 and o2['st'] == 'geliefert' and e3 > e2 + 5 * 150, f"{o2 and o2['st']} {e2} → {e3} {dl}")
        look_all()
        own, ours = own_new(K1)
        ck('the whole wood chain made no new shader program for its own things (logs, boards, stack, the board on the shelf, the felled tree)', own and not ours, f'{len(own)} drawn materials, new: {ours}; new in all ({p1} → {progs()}): {newprogs(pn1)}')
        # firewood from the slabs (still in the holiday weeks – Christoph is there every day): he cuts, splits and stacks them; Sarah sells them
        # fresh to Ronald next door
        fb0 = J("({ rm: +STRAT.res.val('brennholz').toFixed(2), eur: Math.round(STRAT.S.eur), slabs: HOLZSAW.fire })")
        bh = job('brennholz', ['christoph'])
        ok = bh and bh.get('id') and until(done(bh['id']), 220)
        fb1 = J("({ rm: +STRAT.res.val('brennholz').toFixed(2), stacked: +STRAT.S.brennholz.toFixed(2), lots: STRAT.S.ext.brennholz && STRAT.S.ext.brennholz.lots, eur: Math.round(STRAT.S.eur) })")
        ck('Christoph makes firewood of the slabs (cut to 33 cm, split, stacked – rm with the day it will be dry)', ok and fb1['stacked'] > 0.15 and fb1['lots'] and len(fb1['lots']) == 1 and abs(fb1['rm'] - fb0['rm']) < 0.05, f'{fb0} → {fb1} {bh}')
        bv = job('brennholz_verkaufen', ['sarah'])
        ok = bv and bv.get('id') and until(done(bv['id']), 160)
        fb2 = J("({ stacked: +STRAT.S.brennholz.toFixed(2), eur: Math.round(STRAT.S.eur), sale: STRAT.S.ledger.filter(e => /^Brennholz an Ronald/.test(e.text)).slice(-1)[0] })")
        ck('Sarah sells it fresh to Ronald next door (80 €/rm; dry after a year it would bring 110 €)', ok and fb2['stacked'] < 0.01 and fb2['sale'] and abs(fb2['sale']['eur'] - 80 * fb1['stacked']) <= 0.09 * 80 * fb1['stacked'] + 0.01, f'{fb1} → {fb2}')
        led = J("STRAT.S.ledger.slice(-12).map(e => e.text + ' ' + e.eur)")
        print('ledger', led, flush=True)
        page_pic('10_werkstatt')
    if 'strom' in want:
        # power: a clear June noon against an overcast November noon (two PV modules, 0,86 kWp)
        E("STRAT.W.force = { cloud: 0.05, rain: 0, wind: 8, storm: false, src: 'Test' }")
        J("STRAT.setDate('2027-06-19', 13 * 60 + 15)")
        steps(0.5)
        jun = J("({ pv: STRAT.S.power.pv, day: STRAT.C.pvDayKWh(5, 0.05) })")
        E("STRAT.W.force = { cloud: 0.95, rain: 0.5, wind: 20, storm: false, src: 'Test' }")
        J("STRAT.setDate('2026-11-28', 12 * 60 + 15)")
        steps(0.5)
        nov = J("({ pv: STRAT.S.power.pv, day: STRAT.C.pvDayKWh(10, 0.95) })")
        ck('PV: a clear June noon gives far more than an overcast November noon', jun['pv'] > 450 and nov['pv'] < 90 and jun['day'] > 8 * nov['day'], f'{jun} {nov}')
        E("STRAT.W.force = { cloud: 0.2, rain: 0, wind: 10, storm: false, src: 'Test' }")
    if 'ereignis' in want:
        # a storm throws spruces in the Klinge – unknown until someone looks; the forestry contractor; a breakdown and its repair
        J("STRAT.setDate('2026-12-05', 8 * 60 + 30)")
        steps(0.3)
        E("STRAT.fire('sturm')")
        st = J("STRAT.S.ext.sturm")
        ck('a storm: spruces thrown in the Klinge, but nobody knows yet', st and len(st['ids']) >= 1 and not st['known'], str(st))
        w = job('waldbegang', ['christoph'])
        until(done(w['id']), 160)
        kn = J("({ k: STRAT.known('wald', 'sturmholz'), st: STRAT.S.ext.sturm.known, jobs: STRAT.job.at('klinge').map(J => J.id) })")
        ck('Christoph looks: the windthrow is known, the contractor can be hired', kn['k'] and kn['st'] and 'unternehmer' in kn['jobs'], str(kn))
        e0 = J("STRAT.S.eur")
        u = job('unternehmer', ['sarah'])
        until(done(u['id']), 60)
        tm = J("STRAT.S.ext.termin")
        ck('Sarah hires a forestry contractor – he comes in a few days', tm and tm['t'] > J("CLOCK.t"), str(tm))
        E("STRAT.skip(6 * 1440)")
        until("!CLOCK.warp", 40, 0.25)
        steps(2)
        tr = J("STRAT.S.ext.sturm.ids.map(id => FELL.trees[id] ? FELL.trees[id].st : null)")
        e1 = J("STRAT.S.eur")
        ck('the contractor felled the thrown trees (world/fell.js), Euro booked per cubic metre', all(x == 'done' for x in tr) and e1 < e0 - 5, f'{tr} {e0} → {e1}')
        E("STRAT.S.broken.push('Blockbandsäge')")
        q = J("STRAT.job.check('saegen30', ['christoph'])")
        ck('a broken band saw: sawing refused with the reason (Betriebssicherheitsverordnung)', q and 'kaputt' in q.get('text', '') and q.get('src'), str(q))
        J("STRAT.setDate('2026-12-12', 9 * 60)")
        rp = job('reparieren', ['christoph'])
        until(done(rp['id']), 60)
        ck('Christoph repairs it', 'Blockbandsäge' not in J("STRAT.S.broken"), str(J("STRAT.S.broken")))
    if 'reload' in want:
        J("STRAT.setDate('2026-11-07', 10 * 60)")
        E("STHUD.select(['ronald'])")
        jr = J("(() => { const j = STRAT.job.add('maehen', ['ronald']); return j && j.id ? j.id : j; })()")
        E("STRAT.setSpeed(5)")
        steps(4)
        mid = J(f"(() => {{ const j = STRAT.job.of('{jr}'); return j ? {{ st: j.st, done: j.done, dur: j.dur }} : null; }})()")
        print('programs before the reload', progs(), 'new since the start:', newprogs(pn0), flush=True)
        eur_before = J("STRAT.S.eur")
        E("STRAT.save(); CLOCK.save()")
        time.sleep(0.5)
        pg.reload(wait_until='domcontentloaded', timeout=300000)
        pg.wait_for_function("window.GAME && GAME.loaded && GAME.loaded()", timeout=1500000, polling=2000)
        time.sleep(4)
        E("window.FREEZE = true")
        steps(2)
        E("GAME.shot()")
        p0 = progs()
        st = J(f"(() => {{ const j = STRAT.job.of('{jr}'); return {{ on: STRAT.on, mode: GAME.P.mode, job: j ? {{ st: j.st, done: j.done }} : null, eur: STRAT.S.eur }}; }})()")
        ck('after a reload the mode goes on from above', st['on'] and st['mode'] == 'top', str(st))
        ck('… and Ronald\'s job is still there with its progress', mid and st['job'] and st['job']['done'] >= mid['done'] - 0.01, f'{mid} → {st}')
        ck('… and the ledger kept its Euro', abs(st['eur'] - eur_before) < 0.01, f"{eur_before} → {st['eur']}")
    if 'welt' in want:
        # a double click on Sarah's symbol: you walk as Sarah where she stands; U brings you back up
        E("STHUD.select([])")
        J("STRAT.setDate('2026-11-07', 11 * 60)")
        steps(0.5)
        q = J("(() => { const p = STRAT.pos('sarah'); GAME.shot(); const s = STHUD.pr(p[0], p[1], 1.8); const r = document.querySelector('#stage canvas').getBoundingClientRect(); return [s[0] + r.left, s[1] + r.top, p[0], p[1]]; })()")
        pg.mouse.dblclick(q[0], q[1])
        steps(1.0)
        tk = J("({ on: STRAT.on, mode: GAME.P.mode, kind: AVATAR.kind, x: GAME.P.x, y: GAME.P.y })")
        ck('a double click on Sarah: you walk as Sarah where she stood', not tk['on'] and tk['mode'] == 'walk' and tk['kind'] == 'f' and math.hypot(tk['x'] - q[2], tk['y'] - q[3]) < 2, str(tk) + ' ' + str(q))
        up = J("(() => { const b = document.getElementById('stup'); return b ? !b.hidden : null; })()")
        steps(0.6)
        up = J("(() => { const b = document.getElementById('stup'); return b ? !b.hidden : null; })()")
        ck('… the button „Von oben“ is there while walking', up is True, str(up))
        pg.keyboard.press('u')
        steps(0.5)
        ck('… and U brings you back up', J("STRAT.on") and J("GAME.P.mode") == 'top', J("({ on: STRAT.on, mode: GAME.P.mode })"))
        E("STRAT.stop()")
        steps(0.5)
        w = J("({ on: STRAT.on, mode: GAME.P.mode, hud: document.getElementById('sthud').hidden })")
        ck('„Zur Welt“: back in the walk, the HUD is gone', not w['on'] and w['mode'] == 'walk' and w['hud'], str(w))
        lib.shot(pg, OUT, '06_welt')
    ck('no new shader programs', progs() <= p0 + 0, f'{p0} → {progs()}')
    ck.errors(errs)
    ck.done()
