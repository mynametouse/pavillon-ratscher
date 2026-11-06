# feat/strategie-dorf (Falko 5.11.2026 23:14/23:30): the village in „Ratscher von oben“ (viz3/src/strategie/st_dorf*.js) on the core of
# feat/strategie and the Ortsvorsteher system (amt/*). Starts the scene (?szenario=strategie) on a Saturday and checks with numbers:
# exploration (who one knows comes from someone who went and listened – Sarah learns more), a village project from idea to done in a
# time-lapse (the Mitfahrbank: talk about the place, the Ortsteilrat votes on Friday evening and pays from the Ortsteil's 600 €, three
# people set the bench up), the villagers' opinions changing in AMT.ST.rep (one copy), the booking in the Ortsteil's ledger, the bench
# standing in the first-person world (amt/amt_world.js), the saved state after a reload, no new shader program for the village's things,
# no page error, the core's HUD unharmed. Pictures in out/strategie_dorf/.
#   python3 viz3/test/strategie_dorf.py 9004 [sections]     sections: reden,projekt,land,obst,foerder,welt,reload (default all)
import sys, os, json, time, math
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__))); import lib
port = sys.argv[1] if len(sys.argv) > 1 else '8951'
want = set((sys.argv[2] if len(sys.argv) > 2 else 'reden,projekt,land,obst,foerder,welt,reload').split(','))
ck = lib.Checks('strategie_dorf')
OUT = lib.out('strategie_dorf')
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
    # the programs of the village's own things: what came onto the scene since the mark (no skinned figures – their programs are warmed
    # by npc/npc_real.js), each must have been compiled before
    def look_at(x, y, d=6.5, h=1.7, az_off=200, pitch=-6, fov=58):
        # a camera d metres from (x, y), from the azimuth az_off, looking at it (as viz3/test/amt.py does)
        a = math.radians(az_off); cx = x + math.sin(a) * d; cy = y + math.cos(a) * d
        yaw = math.degrees(math.atan2(x - cx, y - cy))
        E(f"(() => {{ const z = KERN.terrain({cx}, {cy}); GAME.view({cx}, {cy}, z + {h}, {yaw}, {pitch}, {fov}); for (let i = 0; i < 6; i++) GAME.step(0.1); }})()")
    def mark():
        E("window.__sd_roots = GAME.scene.children.map(o => o.uuid)")
        return set(J("GAME.R.info.programs.map(p => p.cacheKey)"))
    OWN = """(() => { const R = GAME.R, out = [], seen = new Set(), base = new Set(window.__sd_roots || []);
      const addO = (o, what) => o && o.traverse(m => { if (!m.material || m.isSkinnedMesh) return; for (const M of [].concat(m.material)) { if (seen.has(M)) continue; seen.add(M);
        const p = R.properties.get(M).currentProgram; if (p) out.push([what + ' ' + (M.name || M.type), p.cacheKey]); } });
      for (const o of GAME.scene.children) if (!base.has(o.uuid)) o.traverse(m => { if (m.isMesh && !m.isSkinnedMesh && /^(amt:|strategie-dorf:)/.test(m.name || '') || (m.isMesh && m.parent && /^amt:/.test(m.parent.name || ''))) addO(m, m.name || 'amt'); });
      for (const o of GAME.scene.children) if (!base.has(o.uuid) && o.isGroup) o.traverse(m => { if (m.isMesh && !m.isSkinnedMesh && o.children.some(c => /^amt:/.test(c.name || ''))) addO(m, 'amt ' + (m.name || m.type)); });
      return out; })()"""
    steps(1.0)
    E("GAME.shot()")
    steps(1.0)
    E("GAME.shot()")
    K0 = mark()
    # a Saturday morning in November, dry weather (the live one could rain); a fresh village (no opinions changed yet)
    E("STRAT.W.force = { cloud: 0.3, rain: 0, wind: 12, storm: false, src: 'Test' }")
    day = J("STRAT.setDate('2026-11-07', 9 * 60 + 30)")
    steps(0.5)
    st0 = J("STDORF.state()")
    rep0 = st0['rep']
    ppl = E("document.querySelectorAll('#stppl .p').length")
    ck('the core\'s HUD is unharmed: the mode is on, five people listed, the village box in the bar', E("STRAT.on") and ppl == 5 and 'Dorf' in E("document.getElementById('sthud').textContent"), f"ppl {ppl} · {E('document.getElementById(`sthud`).textContent')[:160]}")
    ck('at first one knows nobody in the village and has no project ideas (exploration instead of fog)', st0['known'] == [] and st0['ideas'] == [], str(st0['known']) + ' ' + str(st0['ideas']))
    ck('the village\'s places are on the field: Anger, old school, bus stop, town hall', all(J(f"!!STRAT.place.get('{p}')") for p in ['anger', 'schule', 'haltestelle', 'rathaus']))
    if 'reden' in want:
        q = J("STDORF.start('mitfahrbank')")
        ck('a project one does not know of yet is refused – with its reason („Warum?“)', q and q.get('no') and q.get('why'), str(q))
        j = job('dorf_reden', ['sarah'])
        ck('Sarah gets the job „Im Dorf herumhören“ at the Anger', j and j.get('id'), str(j))
        E("STRAT.setSpeed(30)")
        ok = until(done(j['id']), 150)
        st1 = J("STDORF.state()")
        ck('… she comes back knowing three villagers (talking is her strength: Reden 5)', ok and len(st1['known']) == 3, str(st1['known']))
        ck('… and their wishes are now ideas (Mitfahrbank from Ingrid among them)', 'mitfahrbank' in st1['ideas'], str(st1['ideas']))
        ck('being asked moves their opinion of you (AMT.ST.rep, the Ortsvorsteher system\'s one copy)', all(st1['rep'][k] > rep0[k] for k in st1['known']), str({k: (rep0[k], st1['rep'][k]) for k in st1['known']}))
        disc = J("STRAT.S.notes.filter(n => n.kind === 'entdeckt').map(n => n.text).slice(-3)")
        ck('each new acquaintance is a discovery with what one learns about them', len(disc) >= 3 and any('Ingrid' in d for d in disc), str(disc)[:300])
        E("STHUD.openPlace('anger')")
        steps(0.3)
        pan = E("document.getElementById('stpan').textContent")
        ck('the Anger\'s panel shows the reputation and the project ideas', 'Ansehen im Dorf' in pan and 'Mitfahrbank' in pan and 'Angehen' in pan, pan[:200])
        E("(() => { const c = STRAT.place.pos('anger'); GAME.P.tx = c[0]; GAME.P.ty = c[1]; GAME.P.th = 150; })()")
        steps(0.5)
        page_pic('01_anger_ansehen')
    if 'projekt' in want:
        if not J("STDORF.state().ideas").count('mitfahrbank'):
            E("STDORF.meet('ingrid', 'sarah')")
        b0 = J("STDORF.state().budget")
        # the button in the panel starts the project (a real click on „Angehen“)
        E("STHUD.openPlace('anger')")
        steps(0.3)
        clicked = E("(() => { const b = document.querySelector('#stpan [data-dorf=\"start:mitfahrbank\"]'); if (!b) return false; b.click(); return true; })()")
        steps(0.2)
        p = J("STDORF.state().proj.mitfahrbank")
        ck('„Angehen“ in the panel starts the Mitfahrbank: first step, talk about the place', clicked and p and p['st'] == 'laeuft' and p['i'] == 0, str(p))
        jobs_here = J("STRAT.job.at('haltestelle').map(J => J.id)")
        ck('the step is a job offered at the bus stop', 'dp_mitfahrbank_0' in jobs_here, str(jobs_here))
        j = job('dp_mitfahrbank_0', ['sarah'])
        ok = until(done(j['id']), 150)
        p = J("STDORF.state().proj.mitfahrbank")
        due = J("STRAT.W.day(STDORF.state().proj.mitfahrbank.due)")
        ck('… done, the Ortsteilrat is called for the next Friday or Saturday evening at least three days on', ok and p['i'] == 1 and due['wd'] in (5, 6), str(p) + ' ' + str(due))
        E("STHUD.openPlace('schule')")
        steps(0.3)
        pan = E("document.getElementById('stpan').textContent")
        ck('the old school\'s panel shows the session with its agenda and the Ortsteil\'s money', 'Ortsteilrat' in pan and 'Mitfahrbank' in pan and 'Geld des Ortsteils' in pan, pan[:240])
        # the time-lapse to the session (Friday 20:00) and a little after
        mins = J("Math.ceil(STDORF.state().proj.mitfahrbank.due - CLOCK.t) + 30")
        E(f"CLOCK.wait({mins}, 'Test')")
        ok = until("STDORF.state().proj.mitfahrbank.i >= 2 || STDORF.state().proj.mitfahrbank.st !== 'laeuft'", 200)
        st2 = J("STDORF.state()")
        p = st2['proj']['mitfahrbank']
        ck('the Ortsteilrat votes for it on Friday evening (amt/amt_model.js ortsrat)', ok and p['st'] == 'laeuft' and p['i'] == 2, str(p) + ' ' + str(J("STRAT.S.notes.slice(-3).map(n => n.text)"))[:300])
        ck('the Ortsteil pays 380 € from its 600 € (a booking in its ledger)', abs(b0 - st2['budget'] - 380) < 0.01 and any('Mitfahrbank' in e[2] for e in st2['hh']), f"{b0} → {st2['budget']} · {st2['hh']}")
        ck('the concern stands as decided in the Ortsvorsteher system (AMT.ST.anl)', J("AMT.ST.anl.mitfahrbank && AMT.ST.anl.mitfahrbank.st") == 'yes', str(J("AMT.ST.anl.mitfahrbank")))
        # Saturday: Falko and Christoph set the bench up (Bauen 2 and more, two to three people)
        E("CLOCK.wait(CLOCK.until(9), 'Test')")
        until("CLOCK.warp == null || !CLOCK.warp", 60)
        steps(0.5)
        style0 = J("STRAT.S.style")
        rep1 = J("STDORF.state().rep")
        j = job('dp_mitfahrbank_2', ['falko', 'christoph'])
        ck('the next step goes to Falko and Christoph (bauen)', j and j.get('id'), str(j))
        ok = until(done(j['id']), 200)
        steps(1.5)
        st3 = J("STDORF.state()")
        p = st3['proj']['mitfahrbank']
        ck('the project is done', ok and p['st'] == 'fertig', str(p))
        ck('it stands in the village: AMT.ST.built and amt/amt_world.js built the bench', 'mitfahrbank' in st3['built'] and 'mitfahrbank' in st3['world'], str(st3['built']) + ' ' + str(st3['world']))
        ck('Ingrid and Gerhard think better of you (its fans in the Ortsvorsteher data)', st3['rep']['ingrid'] > rep1['ingrid'] and st3['rep']['gerhard'] > rep1['gerhard'], f"ingrid {rep1['ingrid']} → {st3['rep']['ingrid']}, gerhard {rep1['gerhard']} → {st3['rep']['gerhard']}")
        ck('your style (the core\'s Black-&-White measure) is fed by the village work', J("STRAT.S.style") > style0, f"{style0} → {J('STRAT.S.style')}")
        bp = J("AMTWORLD.state().at.mitfahrbank")
        if bp:
            E(f"GAME.P.tx = {bp[0]}; GAME.P.ty = {bp[1]}; GAME.P.th = 40")
            steps(0.5)
            E("STHUD.openPlace('haltestelle')")
            steps(0.3)
            page_pic('02_mitfahrbank_oben')
    if 'land' in want:
        # Uwe owns the meadows (one learns it by talking: here the same call the job makes), Heike is the meadow's neighbour
        E("STDORF.meet('uwe', 'sarah'); STDORF.meet('heike', 'sarah')")
        E("STRAT.setDate('2026-11-21', 9 * 60)")
        steps(0.5)
        r0 = J("STDORF.state().rep")
        # a tight offer (20 % under the going price) for buying: Uwe does not know you well enough for that – refused, and he is annoyed
        q = J("STDORF.start('kauf_hangwiese', { offer: 'knapp' })")
        j = job('dp_kauf_hangwiese_0', ['sarah'])
        ok = until(done(j['id']) if j and j.get('id') else 'true', 120)
        p = J("STDORF.state().proj.kauf_hangwiese")
        r1 = J("STDORF.state().rep")
        ck('a tight offer for the meadow is refused – unfair dealing costs trust (Uwe)', ok and p and p['st'] == 'abgelehnt' and r1['uwe'] < r0['uwe'], f"{p} uwe {r0['uwe']} → {r1['uwe']}")
        # a fair lease: talk, then sign; the first year's rent from your purse
        eur0 = J("STRAT.S.eur")
        E("STHUD.openPlace('flur')")
        steps(0.3)
        clicked = E("(() => { const b = document.querySelector('#stpan [data-dorf=\"start:pacht_hangwiese\"]'); if (!b) return false; b.click(); return true; })()")
        steps(0.2)
        ck('„Fair anbieten“ in the Flur panel starts the lease of the slope meadow', clicked and J("STDORF.state().proj.pacht_hangwiese.st") == 'laeuft', str(J("STDORF.state().proj.pacht_hangwiese")))
        j = job('dp_pacht_hangwiese_0', ['sarah'])
        ok = until(done(j['id']), 120)
        j = job('dp_pacht_hangwiese_1', ['falko'])
        ok = j and j.get('id') and until(done(j['id']), 120)
        lnd = J("STRAT.S.ext.dorf.land")
        led = J("STRAT.S.ledger.slice(-3).map(e => [e.eur, e.text])")
        ck('the meadow is leased (a contract with the owner\'s consent) and the first year\'s rent is booked (0,35 ha × 120 €/ha)', lnd.get('hangwiese', {}).get('st') == 'pacht' and any('Pacht' in e[1] and abs(e[0] + 42) < 0.01 for e in led), f"{lnd} {led} {eur0} → {J('STRAT.S.eur')}")
        ck('fair dealing: Uwe thinks better of you again', J("STDORF.state().rep.uwe") > r1['uwe'], f"{r1['uwe']} → {J('STDORF.state().rep.uwe')}")
        E("STHUD.openPlace('flur')")
        E("(() => { const c = STRAT.place.pos('flur'); GAME.P.tx = c[0]; GAME.P.ty = c[1]; GAME.P.th = 120; })()")
        steps(0.6)
        page_pic('03_flur_gepachtet')
    if 'obst' in want:
        if J("!STRAT.S.ext.dorf.land.hangwiese"):
            E("STRAT.S.ext.dorf.land.hangwiese = { st: 'pacht', t: CLOCK.t, eur: 42 }")
        E("STDORF.meet('heike', 'sarah'); STDORF.meet('gerhard', 'sarah')")
        E("STRAT.setDate('2026-11-28', 9 * 60)")
        steps(0.5)
        q = J("STDORF.start('streuobst')")
        ck('the meadow orchard can start on the leased meadow (planting time: autumn after the leaves fall)', q and q.get('ok'), str(q))
        eur0 = J("STRAT.S.eur")
        for i, who in [(0, ['sarah']), (1, ['falko']), (2, ['sarah', 'falko'])]:
            j = job(f'dp_streuobst_{i}', who)
            if not (j and j.get('id')):
                ck(f'orchard step {i} given', False, str(j))
                break
            until(done(j['id']), 240)
        steps(2.5)
        so = J("({ p: STDORF.state().proj.streuobst, w: STDWELT.state(), eur: STRAT.S.eur })")
        ck('the orchard is planted: twelve young standard trees stand on the meadow (strategie/st_dorf_welt.js)', so['p'] and so['p']['st'] == 'fertig' and so['w']['trees'] >= 10, str(so)[:300])
        ck('the trees were paid from your purse (12 × 72 €)', abs(eur0 - so['eur'] - 864) < 1, f"{eur0} → {so['eur']}")
        E("(() => { const c = STRAT.place.pos('flur'); GAME.P.tx = c[0]; GAME.P.ty = c[1]; GAME.P.th = 70; })()")
        steps(0.6)
        page_pic('04_streuobst_oben')
    if 'foerder' in want:
        E("STDORF.meet('ingrid', 'sarah')")
        E("STRAT.setDate('2026-12-05', 9 * 60)")
        steps(0.5)
        q = J("STDORF.start('treffpunkt')")
        ck('the LEADER project „Treffpunkt am Anger“ starts (Ingrid\'s idea)', q and q.get('ok'), str(q))
        for i, who in [(0, ['sarah']), (1, ['falko'])]:
            j = job(f'dp_treffpunkt_{i}', who)
            if j and j.get('id'):
                until(done(j['id']), 200)
        def skip_due(stepnow, secs=200):
            # the time-lapse to the project's next date and a little after, until its step moves on (or it stops)
            for k in range(6):
                pj = J("STDORF.state().proj.treffpunkt")
                if pj['st'] != 'laeuft' or pj['i'] != stepnow: return pj
                if pj['due'] is None: return pj
                E(f"CLOCK.wait(Math.max(5, STDORF.state().proj.treffpunkt.due - CLOCK.t + 20), 'Test')")
                until("!CLOCK.warp", 60)
                steps(1.0)
            return J("STDORF.state().proj.treffpunkt")
        pj = skip_due(2)
        ck('the Ortsteilrat recommends it to the town', pj['st'] == 'laeuft' and pj['i'] >= 3, str(pj))
        pj = skip_due(3)
        city = J("STDORF.state().city")
        ck('the town council takes on the own share (35 % of 24.000 €) and applies for the funding', pj['st'] == 'laeuft' and pj['i'] >= 4 and abs(12000 - city - 8400) < 1, f"{pj} city left {city}")
        due = J("STRAT.W.day(STDORF.state().proj.treffpunkt.due)")
        ck('the outline goes to the action group at its next deadline (31 March)', due['iso'].endswith('-03-31'), str(due))
        pj = skip_due(4)
        pj = skip_due(4) if pj['i'] == 4 and pj['st'] == 'laeuft' else pj
        pj = skip_due(4) if pj['i'] == 4 and pj['st'] == 'laeuft' else pj
        notes = J("STRAT.S.notes.slice(-8).map(n => n.text)")
        ck('selected by points, then the approval by the state office – only then the building starts', pj['st'] == 'laeuft' and pj['i'] >= 5 and any('Bewilligungsbescheid' in n for n in notes) and any('Punkte' in n for n in notes), str(pj) + ' ' + str(notes)[:400])
        pj = skip_due(5)
        if pj['st'] == 'laeuft' and pj['i'] == 6:
            if J("STRAT.W.day(CLOCK.t).wd") not in (6, 0):
                E("STRAT.skip('kommen')")
                until("!CLOCK.warp", 60)
                E("CLOCK.wait(CLOCK.until(9), 'Test')")
                until("!CLOCK.warp", 60)
            j = job('dp_treffpunkt_6', ['falko', 'christoph'])
            if j and j.get('id'): until(done(j['id']), 240)
        pj = skip_due(7)
        steps(2.5)
        tw = J("STDWELT.state()")
        ck('done: the meeting place stands at the Anger', pj['st'] == 'fertig' and 'treffpunkt' in tw['items'], str(pj) + ' ' + str(tw))
        tp = tw['at'].get('treffpunkt')
        if tp:
            E(f"GAME.P.tx = {tp[0]}; GAME.P.ty = {tp[1]}; GAME.P.th = 45")
            steps(0.6)
            page_pic('05_treffpunkt_oben')
    if 'welt' in want:
        E("STRAT.setDate(STRAT.W.day(CLOCK.t).iso, 11 * 60)")
        lib.settle_light(pg)
        bp = J("AMTWORLD.state().at.mitfahrbank")
        K = K0
        if bp:
            # into the first-person world: stand in front of the bench, look at it (the same thing as from above)
            E("STRAT.stop()")
            steps(0.5)
            E(f"(() => {{ const p = [{bp[0]}, {bp[1]}], a = Math.atan2(250.6 - p[0], -99.6 - p[1]); AMT.put(p[0] + Math.sin(a) * 5.5, p[1] + Math.cos(a) * 5.5, (a * 180 / Math.PI + 180) % 360); }})()")
            steps(1.0)
            near = J(f"Math.hypot(GAME.P.x - {bp[0]}, GAME.P.y - {bp[1]})")
            ck('in the first-person world one stands at the bench decided from above', E("GAME.P.mode") == 'walk' and near < 9, f"mode {E('GAME.P.mode')} · {near:.1f} m")
            look_at(bp[0], bp[1], 6.0, 1.6, 200, -8)
            lib.shot(pg, OUT, '06_ich_sicht_mitfahrbank')
        tw = J("STDWELT.state()")
        for k, nm in [('streuobst', '07_ich_sicht_streuobst'), ('treffpunkt', '08_ich_sicht_treffpunkt')]:
            at = tw['at'].get(k)
            if not at: continue
            if isinstance(at[0], list):
                xs = [p[0] for p in at]; ys = [p[1] for p in at]
                look_at(sum(xs) / len(xs), sum(ys) / len(ys), 30, 4.5, 225, -9)
            else:
                look_at(at[0], at[1], 10, 2.2, 200, -6)
            lib.shot(pg, OUT, nm)
        own = J(OWN)
        newp = sorted(set(n for n, k in own if k not in K))
        ck('no new shader program for the village\'s things (looked at from above and in the first-person view)', not newp, str(newp)[:300])
    if 'reload' in want:
        E("STRAT.save()")
        steps(0.5)
        pre = J("({ d: STDORF.state(), known: STRAT.S.known })")
        pre_land = J("STRAT.S.ext.dorf.land")
        pre_w = J("STDWELT.state().items")
        pg.reload(wait_until='domcontentloaded')
        pg.wait_for_function("window.GAME && GAME.loaded && GAME.loaded()", timeout=1500000, polling=2000)
        time.sleep(3)
        E("window.FREEZE = true")
        steps(3)
        post = J("STDORF.state()")
        ck('after a reload: the project is still done, the people still known, the Ortsteil\'s money still spent', post['proj'].get('mitfahrbank', {}).get('st') == pre['d']['proj'].get('mitfahrbank', {}).get('st') and post['known'] == pre['d']['known'] and abs(post['budget'] - pre['d']['budget']) < 0.01, str(post)[:300])
        ck('… and the bench stands again (built from the saved AMT state)', ('mitfahrbank' in post['world']) == ('mitfahrbank' in pre['d']['world']), str(post['world']))
        lw = J("({ land: STRAT.S.ext.dorf.land, w: STDWELT.state().items })")
        ck('… the leased meadow is still yours, the orchard and the meeting place stand again', ('hangwiese' in lw['land']) == ('hangwiese' in pre_land) and set(lw['w']) == set(pre_w), str(lw) + ' vs ' + str(pre_land) + ' ' + str(pre_w))
    ck.errors(errs)
    ck.done()
