# feat/strategie-dorf (Falko 5.11.2026 23:14/23:30): the village in „Ratscher von oben“ (viz3/src/strategie/st_dorf*.js) on the core of
# feat/strategie and the Ortsvorsteher system (amt/*). Starts the scene (?szenario=strategie) on a Saturday and checks with numbers:
# exploration (who one knows comes from someone who went and listened – Sarah learns more), a village project from idea to done in a
# time-lapse (the Mitfahrbank: talk about the place, the Ortsteilrat votes on Friday evening and pays from the Ortsteil's 600 €, three
# people set the bench up), the villagers' opinions changing in AMT.ST.rep (one copy), the booking in the Ortsteil's ledger, the bench
# standing in the first-person world (amt/amt_world.js), the saved state after a reload, no new shader program for the village's things,
# no page error, the core's HUD unharmed. Pictures in out/strategie_dorf/.
#   python3 viz3/test/strategie_dorf.py 9004 [sections]     sections: reden,projekt,welt,reload (default all)
import sys, os, json, time, math
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__))); import lib
port = sys.argv[1] if len(sys.argv) > 1 else '8951'
want = set((sys.argv[2] if len(sys.argv) > 2 else 'reden,projekt,welt,reload').split(','))
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
    def mark():
        E("window.__sd_roots = GAME.scene.children.map(o => o.uuid)")
        return set(J("GAME.R.info.programs.map(p => p.cacheKey)"))
    OWN = """(() => { const R = GAME.R, out = [], seen = new Set(), base = new Set(window.__sd_roots || []);
      const addO = (o, what) => o && o.traverse(m => { if (!m.material || m.isSkinnedMesh) return; for (const M of [].concat(m.material)) { if (seen.has(M)) continue; seen.add(M);
        const p = R.properties.get(M).currentProgram; if (p) out.push([what + ' ' + (M.name || M.type), p.cacheKey]); } });
      for (const o of GAME.scene.children) if (!base.has(o.uuid)) { let sk = false; o.traverse(m => { if (m.isSkinnedMesh) sk = true; }); if (!sk) addO(o, 'neu ' + (o.name || o.type)); }
      return out; })()"""
    steps(1.0)
    E("GAME.shot()")
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
    if 'welt' in want:
        bp = J("AMTWORLD.state().at.mitfahrbank")
        K = mark()
        if bp:
            # into the first-person world: stand in front of the bench, look at it (the same thing as from above)
            E("STRAT.stop()")
            steps(0.5)
            E(f"(() => {{ const p = [{bp[0]}, {bp[1]}], a = Math.atan2(250.6 - p[0], -99.6 - p[1]); AMT.put(p[0] + Math.sin(a) * 5.5, p[1] + Math.cos(a) * 5.5, (a * 180 / Math.PI + 180) % 360); }})()")
            steps(1.0)
            E("GAME.P.pitch = -8")
            steps(0.5)
            lib.shot(pg, OUT, '03_ich_sicht_mitfahrbank')
            near = J(f"Math.hypot(GAME.P.x - {bp[0]}, GAME.P.y - {bp[1]})")
            ck('in the first-person world one stands at the bench decided from above', E("GAME.P.mode") == 'walk' and near < 9, f"mode {E('GAME.P.mode')} · {near:.1f} m")
        own = J(OWN)
        newp = sorted(set(n for n, k in own if k not in K))
        ck('no new shader program for the village\'s things (looked at from above and in the first-person view)', not newp, str(newp)[:300])
    if 'reload' in want:
        E("STRAT.save()")
        steps(0.5)
        pre = J("({ d: STDORF.state(), known: STRAT.S.known })")
        pg.reload(wait_until='domcontentloaded')
        pg.wait_for_function("window.GAME && GAME.loaded && GAME.loaded()", timeout=1500000, polling=2000)
        time.sleep(3)
        E("window.FREEZE = true")
        steps(3)
        post = J("STDORF.state()")
        ck('after a reload: the project is still done, the people still known, the Ortsteil\'s money still spent', post['proj'].get('mitfahrbank', {}).get('st') == pre['d']['proj'].get('mitfahrbank', {}).get('st') and post['known'] == pre['d']['known'] and abs(post['budget'] - pre['d']['budget']) < 0.01, str(post)[:300])
        ck('… and the bench stands again (built from the saved AMT state)', ('mitfahrbank' in post['world']) == ('mitfahrbank' in pre['d']['world']), str(post['world']))
    ck.errors(errs)
    ck.done()
