# feat/dorf village life: the Skat and Rummy evening in the old school (Fridays 19–23 h), the fire on the field towards the Klinge (every other
# Saturday), the villagers (Rocketbox figures, loaded only for an evening nearby), the talk panel, table talk, the task, the card game.
# Pictures (canvas and page) in out/dorf/. Sections (second argument, comma-separated): light,door,inside,talk,task,fire,life,summer,gl.
#   python3 viz3/test/run.py --port 8974 --serve dorf          (or: python3 viz3/test/dorf.py 8974 door,inside)
import sys, os, time, json
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__))); import lib
port = sys.argv[1]; OUT = lib.out('dorf'); ONLY = sys.argv[2].split(',') if len(sys.argv) > 2 else None
def want(k): return not ONLY or k in ONLY
ck = lib.Checks('dorf')
def page_shot(pg, name):   # the whole page with the panels (slow in SwiftShader: a long time limit, and never fatal)
    try:
        pg.evaluate("GAME.shot()"); pg.screenshot(path=os.path.join(OUT, name + '.png'), timeout=120000); print('page shot', name, flush=True)
    except Exception as ex:
        print('note: page shot', name, 'failed:', repr(ex)[:160], flush=True)
with lib.browser() as b:
    errs = []; pg = lib.page(b, 1100, 700, errs, tier='mittel'); lib.boot(pg, port); E = pg.evaluate
    J = lambda s: json.loads(E('JSON.stringify(' + s + ')'))
    E("document.querySelectorAll('#toast').forEach(e => e.style.visibility = 'hidden'); GAME.setView3(false)")
    st = J('DORF.state()')
    print('start', json.dumps(st, ensure_ascii=False), flush=True)
    if want('light'):
        try:
            ck('nothing of the village life loaded at the start (no figures, no requests)', not st['figs'] and not st['requests'], json.dumps(st['requests']))
            ck('calendar: weekday from the game clock', isinstance(st['cal']['wd'], int), st['cal']['date'])
        except Exception as ex:
            ck('section ran: ' + "want('light')", False, repr(ex)[:400])
    # an October calendar: dark at 20 h (the game's day 1 is 1 June by default – light until after 21 h)
    E("if (!DN.active) GAME.setMode('auto'); DN.e0 = Date.UTC(2026, 9, 12) / 864e5 - Math.floor(CLOCK.t / 1440)")
    if want('door'):
        try:   # a Monday afternoon: the room is built when one comes near, but the door is shut and nobody is there
            E("CLOCK.t = Math.floor(CLOCK.t / 1440) * 1440 + 15 * 60; DN.update(true)"); lib.settle_light(pg)
            E("DORF.atDoor(); for (let i = 0; i < 30; i++) GAME.step(0.1)")
            st = J('DORF.state()'); dx, dy = J("DSCHOOL.toW(DSCHOOL.F.du, -1.0)")
            E(f"GAME.view({dx}, {dy}, DSCHOOL.F.zF - 0.3 + 1.62, DSCHOOL.az(0, 1), 0, 62); GAME.step(0.2)"); best = J("GAME.step(0.1).best")
            ck('Monday afternoon: the door is shut, nobody loaded', st['school']['built'] and st['school']['open'] == 0 and not st['figs'] and not st['skat'], json.dumps(st['school']))
            ck('the shut door says when the evening is', best == 'Tür der alten Schule', str(best))
            x, y = J("DSCHOOL.toW(DSCHOOL.F.du, -4.2)"); z = J("DSCHOOL.F.zF")
            E(f"GAME.view({x}, {y}, {z} + 1.3, DSCHOOL.az(0, 1), 4, 62); GAME.step(0.3)"); lib.shot(pg, OUT, 'a_door_shut_day')
        except Exception as ex:
            ck('section ran: door shut', False, repr(ex)[:400])
    if want('door') or want('inside') or want('talk') or want('task'):
        try:
            d = E("DORF.jump('skat', 20)"); lib.settle_light(pg)
            print('jumped to', d, flush=True)
            ck('jump to Friday 20:00', d and d.startswith('Freitag') and J("DCAL.on('skat')"), str(d))
            E("DORF.atDoor(); for (let i = 0; i < 20; i++) GAME.step(0.1)")
            st = J('DORF.state()'); print('at door', json.dumps(st, ensure_ascii=False), flush=True)
            ck('the room is built when one comes near, the facade has its opening', st['school']['built'] and st['school']['cut'], json.dumps(st['school']))
            E("for (let i = 0; i < 30; i++) GAME.step(0.1)")
            ck('the door opens on Friday evening', J('DSCHOOL.open') > 0.95, str(J('DSCHOOL.open')))
            # the figures load (async): wait, stepping the world
            t0 = time.time()
            for i in range(120):
                E("GAME.step(0.2)")
                if len(J('DORF.state().figs')) >= 6: break
                time.sleep(0.5)
            st = J('DORF.state()'); print('figures', round(time.time() - t0), 's', json.dumps(st, ensure_ascii=False), flush=True)
            ck('six villagers loaded for the evening', len(st['figs']) == 6 and not st['figErr'], f"{st['figs']} {st['figErr']}")
            ck('they sit and stand in the school', len(st['shown']) == 6, str(st['shown']))
            if want('door'):
                x, y = J("DSCHOOL.toW(DSCHOOL.F.du, -4.2)"); z = J("DSCHOOL.F.zF")
                E(f"GAME.view({x}, {y}, {z} + 1.3, DSCHOOL.az(0, 1), 4, 62); GAME.step(0.3)"); lib.shot(pg, OUT, 'a_door_open')
                E("GAME.setView3(true); DORF.atDoor(); GAME.step(0.5)"); lib.shot(pg, OUT, 'a_door_3p'); E("GAME.setView3(false)")
        except Exception as ex:
            ck('section ran: ' + "want('door') or want('inside') or want('talk') or want('task')", False, repr(ex)[:400])
    if want('inside') or want('talk') or want('task'):
        try:
            E("DORF.atDoor(); GAME.step(0.3)")
            r = J("GAME.step(4, 1)"); st = J('DORF.state()')
            print('walked in', r, json.dumps(st['school']), flush=True)
            ck('one walks in through the open door', st['school']['inside'], json.dumps(r))
            ck('the lamps are lit (borrowed lights)', st['school']['lit'], '')
            if want('inside'):
                for name, (x, y, dx, dy, pitch) in {'b_room_skat': (5.2, 1.4, 1.0, 1.1, -6), 'b_room_romme': (9.6, 2.2, 1.0, 0.35, -8), 'b_room_bar': (5.5, 5.6, -1.0, 0.25, -4), 'b_room_back': (13.8, 8.6, -1.0, -0.55, -6)}.items():
                    wx, wy = J(f"DSCHOOL.toW({x}, {y})"); z = J("DSCHOOL.F.zF")
                    E(f"GAME.view({wx}, {wy}, {z} + 1.62, DSCHOOL.az({dx}, {dy}), {pitch}, 68); for (let i = 0; i < 6; i++) GAME.step(0.1)"); lib.shot(pg, OUT, name)
                # close to the Skat table: the faces
                wx, wy = J("DSCHOOL.toW(DSCHOOL.seats.gerhard.x + 1.6, DSCHOOL.seats.gerhard.y - 1.2)"); z = J("DSCHOOL.F.zF")
                E(f"GAME.view({wx}, {wy}, {z} + 1.45, DSCHOOL.az(-1.6, 1.2), -14, 50); for (let i = 0; i < 6; i++) GAME.step(0.1)"); lib.shot(pg, OUT, 'b_skat_close')
                E("GAME.setView3(true); DORF.enter(); GAME.step(1.0)"); lib.shot(pg, OUT, 'b_room_3p'); E("GAME.setView3(false)")
        except Exception as ex:
            ck('section ran: ' + "want('inside') or want('talk') or want('task')", False, repr(ex)[:400])
    if want('talk') or want('task'):
        try:
            E("DORF.enter(); GAME.step(0.3)")
            # go to Ingrid and talk (the action button)
            ix, iy = J("DSCHOOL.toW(DSCHOOL.seats.ingrid.x - 0.3, DSCHOOL.seats.ingrid.y + 1.3)"); z = J("DSCHOOL.F.zF")
            E(f"GAME.view({ix}, {iy}, {z} + 1.62, DSCHOOL.az(0.2, -1), -12, 62); GAME.step(0.3)")
            best = J("GAME.step(0.1).best"); ck('the action button offers to talk to Ingrid', best == 'Mit Ingrid sprechen', str(best))
            E("PLAY.primary(); GAME.step(0.2)")
            st = J('DORF.state()'); ck('the talk panel opens', st['talk'] == 'ingrid' and not E("document.getElementById('dorfpanel').hidden"), str(st['talk']))
            page_shot(pg, 'c_talk_ingrid')
            topics = J("[...document.querySelectorAll('#dorfpanel .topics button')].map(b => b.textContent)")
            print('topics', topics, flush=True)
            ck('Ingrid has topics (the task first)', len(topics) >= 4 and topics[0] == 'Hallo, ich bin neu hier', str(topics))
            E("[...document.querySelectorAll('#dorfpanel .topics button')].find(b => b.textContent === 'Die Talsperre').click()")
            txt = E("document.querySelector('#dorfpanel .say').textContent"); ck('she answers about the dam', 'Talsperre' in txt, txt[:80])
            drink = E("(() => { DORF.UI.open('uwe'); const b = [...document.querySelectorAll('#dorfpanel .topics button')].find(b => b.textContent === 'Etwas zu trinken'); if (b) b.click(); const v = DSCHOOL.drink.visible; DORF.UI.open('ingrid'); return v; })()")
            ck('Uwe puts a glass on the counter', drink, '')
        except Exception as ex:
            ck('section ran: ' + "want('talk') or want('task')", False, repr(ex)[:400])
    if want('task'):
        try:
            E("[...document.querySelectorAll('#dorfpanel .topics button')].find(b => b.classList.contains('quest')).click()")
            ck('task: after greeting Ingrid one should sit down', J('DORF.ST.step') == 'sit', J('DORF.ST.step'))
            E("DORF.UI.close(); DORF.sitDown(); GAME.step(0.6)")
            page_shot(pg, 'd_seated')
            lines = []
            for i in range(70):
                E("GAME.step(0.5)"); s = J("DORF.state().sub")
                if s and (not lines or lines[-1] != s): lines.append(s)
                if J('DORF.ST.step') == 'play': break
            print('story', lines, flush=True)
            ck('sitting down: Gerhard tells the story of the clock', any('Gerhard' in l and '1828' in l for l in lines), str(lines[:3]))
            ck('task: then the card game', J('DORF.ST.step') == 'play', J('DORF.ST.step'))
            E("for (let i = 0; i < 14; i++) GAME.step(0.1)")   # Katrin turns to one (0.9 s of game time after the story)
            if J('DORF.state().talk') != 'katrin': E("DORF.UI.open('katrin')")
            # the card game: all clicks in one go (nothing of the world runs in between), with what the panel showed
            r = J("""(() => { const B = () => [...document.querySelectorAll('#dorfpanel .topics button')], txt = () => B().map(b => b.textContent).join('|');
              const out = { cur: DORF.UI.cur, before: txt(), clicks: [] }, q = B().find(b => b.classList.contains('quest'));
              if (q) q.click(); out.after = txt(); out.on = DORF.game.on;
              for (let i = 0; i < 5; i++) { const want = Math.random() < 0.5 ? 'Höher' : 'Tiefer', b = B().find(b => b.textContent === want);   // one choice per click
                if (!b) { out.clicks.push('none: ' + txt()); break; } b.click(); out.clicks.push(b.textContent + ' ' + DORF.game.round); }
              return out; })()""")
            print('game', json.dumps(r, ensure_ascii=False), flush=True)
            page_shot(pg, 'd_cardgame')
            txt = E("document.querySelector('#dorfpanel .say').textContent"); print('game', txt, flush=True)
            ck('five rounds „Höher oder tiefer“, the fire is next', J('DORF.ST.step') == 'fire' and 'von 5' in txt, J('DORF.ST.step') + ' | ' + txt[:100])
            E("DORF.UI.close(); PLAY.stand(true)")
        except Exception as ex:
            ck('section ran: ' + "want('task')", False, repr(ex)[:400])
    if want('fire'):
        try:
            d = E("DORF.jump('fire', 21)"); lib.settle_light(pg); print('fire evening', d, flush=True)
            ck('jump to a Saturday with the fire', d and d.startswith('Samstag') and J("DCAL.on('fire')"), str(d))
            E("DORF.toFire(); for (let i = 0; i < 30; i++) GAME.step(0.1)")
            t0 = time.time()
            for i in range(120):
                E("GAME.step(0.2)")
                if len(J('DORF.state().shown')) >= 6: break
                time.sleep(0.5)
            st = J('DORF.state()'); print('fire', round(time.time() - t0), 's', json.dumps(st, ensure_ascii=False), flush=True)
            ck('the fire burns, the village stands around it', st['fireBuilt'] and st['fireK'] > 0.5 and len(st['shown']) >= 6, f"{st['fireK']} {st['shown']}")
            E("for (let i = 0; i < 10; i++) GAME.step(0.1)"); lib.shot(pg, OUT, 'e_fire')
            fx, fy = J("DFIRE.at"); fz = J("DFIRE.z")
            E(f"GAME.view({fx} - 6.5, {fy} - 3.0, {fz} + 1.7, Math.atan2(6.5, 3.0) * 180 / Math.PI, -6, 60); for (let i = 0; i < 6; i++) GAME.step(0.1)"); lib.shot(pg, OUT, 'e_fire_side')
            E(f"GAME.view({fx} + 30, {fy} + 45, {fz} + 3, Math.atan2(-30, -45) * 180 / Math.PI, -3, 55); GAME.step(0.2)"); lib.shot(pg, OUT, 'e_fire_far')
            E(f"GAME.orbit(200, 62, 11, [{fx}, {fy}, {fz} + 0.5]); GAME.step(0.2)"); lib.shot(pg, OUT, 'e_fire_top')
            E(f"GAME.view({fx} + 2.6, {fy} + 2.2, {fz} + 1.5, Math.atan2(-2.6, -2.2) * 180 / Math.PI, -10, 60); GAME.step(0.2)"); lib.shot(pg, OUT, 'e_fire_close')
            print('place', E(f"KERN.place({fx} + 2, {fy})"), flush=True)
            if J('DORF.ST.step') == 'fire':
                E("DORF.toFire(); GAME.step(0.2); DORF.UI.open('wolfgang')")
                E("[...document.querySelectorAll('#dorfpanel .topics button')].find(b => b.classList.contains('quest')).click()")
                ck('task done at the fire (Wolfgang)', J('DORF.ST.step') == 'done', J('DORF.ST.step'))
                page_shot(pg, 'e_fire_talk')
            # the evening over and far away: the figures go
            E("CLOCK.t = CLOCK.t + 6 * 60; DN.update(true); GAME.view(222, -108, 3, 0, 0, 60)")
            for i in range(40): E("GAME.step(1.0)")
            st = J('DORF.state()'); ck('after the evening the figures are dropped again', not st['figs'] and st['drops'] >= 6, f"{st['figs']} drops {st['drops']}")
        except Exception as ex:
            ck('section ran: ' + "want('fire')", False, repr(ex)[:400])
    if want('life'):
        try:   # an ordinary June day: the villagers in their houses, now and then out in the front garden; errands
            E("DN.e0 = Date.UTC(2026, 5, 8) / 864e5 - Math.floor(CLOCK.t / 1440)")   # today: Monday 8 June
            H = J("(() => { const H = DLIFE.homes(); return H ? Object.fromEntries(Object.entries(H).map(([k, h]) => [k, [h.id, +h.spot[0].toFixed(1), +h.spot[1].toFixed(1)]])) : null; })()")
            print('homes', json.dumps(H), flush=True)
            ck('every villager has a house with a front garden', H and len(H) == 8, str(H and len(H)))
            # the first one out in the garden this day
            found = J("(() => { const d = Math.floor(CLOCK.t / 1440); for (let m = 8 * 60; m < 19 * 60; m += 5) for (const k of DLIFE.KEYS) { const r = DLIFE.routine(k, d * 1440 + m); if (r && !r.fence) return { k, t: d * 1440 + m + 8, mode: r.mode }; } return null; })()")
            print('out', found, flush=True)
            ck('the day brings somebody out into the garden', bool(found), str(found))
            if found:
                k = found['k']
                E(f"CLOCK.t = {found['t']}; DN.update(true)"); lib.settle_light(pg)
                sx, sy = H[k][1], H[k][2]
                E(f"(() => {{ const h = DLIFE.homes()['{k}']; GAME.view(h.spot[0] + h.n[0] * 3.2 + h.d[0] * 1.5, h.spot[1] + h.n[1] * 3.2 + h.d[1] * 1.5, KERN.terrain(h.spot[0], h.spot[1]) + 1.62, Math.atan2(-h.n[0] * 3.2 - h.d[0] * 1.5, -h.n[1] * 3.2 - h.d[1] * 1.5) * 180 / Math.PI, -10, 62); }})()")
                for i in range(80):
                    E("GAME.step(0.25)")
                    st = J(f"(() => {{ const f = DPEOPLE.figs['{k}']; return f ? {{ vis: f.g.visible, mode: f.mode, out: DORF.S.out['{k}'] }} : null; }})()")
                    if st and st['out'] == 'there': break
                    time.sleep(0.2)
                print('garden', k, st, flush=True)
                ck('a villager comes out and works in the front garden', st and st['vis'] and st['out'] == 'there' and st['mode'] in ('weed', 'water', 'stand'), str(st))
                lib.shot(pg, OUT, 'f_garden_' + k)
                E(f"DORF.UI.open('{k}'); GAME.step(0.3)")
                tp = J("[...document.querySelectorAll('#dorfpanel .topics button')].map(b => b.textContent)")
                print('topics', k, tp, flush=True)
                ck('talking in the garden: the errand is offered', any(t for t in tp if t not in ('Tschüss',)) and len(tp) >= 4, str(tp))
                page_shot(pg, 'f_garden_talk')
                E("DORF.UI.close(); GAME.step(0.2)")
                # far away the figures are freed again
                E("GAME.view(-200, -300, KERN.terrain(-200, -300) + 1.6, 0, 0, 60)")
                for i in range(35): E("GAME.step(1.0)")
                st = J('DORF.state()'); ck('away from the village the figures are freed', not st['figs'], str(st['figs']))
            # an errand: Gerhard's chronicle – the three places count as one walks by
            E("DORF.ST.err.chronik = { st: 'open', i: 0, n0: 0 }")
            for name in ('LINDE', 'FOUNTAIN'):
                E(f"(() => {{ const p = VPROPS.{name}; GAME.view(p[0] + 2, p[1] + 2, KERN.terrain(p[0], p[1]) + 1.6, 200, 0, 60); for (let i = 0; i < 6; i++) GAME.step(0.2); }})()")
            E("(() => { const s = VPROPS.school; GAME.view(s.cx + 3, s.cy - 9, KERN.terrain(s.cx, s.cy - 9) + 1.6, 0, 10, 60); for (let i = 0; i < 6; i++) GAME.step(0.2); })()")
            ck('errand „Für die Chronik“: the three places done, back to Gerhard', J('DORF.ST.err.chronik.i') == 3, str(J('DORF.ST.err.chronik')))
            # a car: Katrin drives to work on a weekday morning – parked at the kerb, she gets in, it drives off along the street
            E("DN.e0 = Date.UTC(2026, 5, 9) / 864e5 - Math.floor(CLOCK.t / 1440)")   # Tuesday 9 June
            dep = J("(() => { const d = Math.floor(CLOCK.t / 1440); for (let m = 6 * 60; m < 9 * 60; m++) if (DLIFE.away('katrin', d * 1440 + m)) return d * 1440 + m; return null; })()")
            E(f"CLOCK.t = {dep} - 1.5; DN.update(true)"); lib.settle_light(pg)
            E("(() => { const h = DLIFE.homes().katrin; GAME.view(h.door[0] + h.n[0] * 9, h.door[1] + h.n[1] * 9, KERN.terrain(h.door[0], h.door[1]) + 1.7, Math.atan2(-h.n[0], -h.n[1]) * 180 / Math.PI, -6, 66); })()")
            for i in range(12): E("GAME.step(0.5)")
            cs = J('DORF.state().cars'); print('cars', cs, flush=True)
            ck('four villagers have cars, parked at the kerb', cs and len(cs) == 4, str(cs))
            lib.shot(pg, OUT, 'h_car_parked')
            for i in range(30):
                E("GAME.step(0.5)")
                if J("DORF.state().cars.katrin.st") in ('leaving',): break
            for i in range(8): E("GAME.step(0.5)")
            st = J("DORF.state().cars.katrin"); print('katrin car', st, flush=True)
            lib.shot(pg, OUT, 'h_car_leaving')
            ck('Katrin drives off to work', st and st['st'] in ('leaving', 'away') and st['a'] > 1, str(st))
        except Exception as ex:
            ck('section ran: life', False, repr(ex)[:400])
    if want('summer'):
        try:   # a mild Friday evening in June: Jens and Heike outside at the beer table, the others inside
            E("DN.e0 = Date.UTC(2026, 5, 8) / 864e5 - Math.floor(CLOCK.t / 1440)"); d = E("DORF.jump('skat', 20)"); lib.settle_light(pg)
            E("DORF.atDoor(); for (let i = 0; i < 20; i++) GAME.step(0.1)")
            for i in range(80):
                E("GAME.step(0.25)")
                if len(J('DORF.state().shown')) >= 8: break
                time.sleep(0.3)
            st = J('DORF.state()'); print('summer', d, st['shown'], flush=True)
            ck('a mild Friday: eight villagers, two of them outside', len(st['shown']) == 8, str(st['shown']))
            x, y = J("DSCHOOL.toW(DSCHOOL.F.du + 4.2, -7.5)"); z = J("KERN.terrain(" + str(x) + ", " + str(y) + ")")
            E(f"GAME.view({x}, {y}, {z} + 1.65, DSCHOOL.az(-0.25, 1), -2, 62); GAME.step(0.3)"); lib.shot(pg, OUT, 'g_summer_front')
        except Exception as ex:
            ck('section ran: summer', False, repr(ex)[:400])
    if want('gl'):
        try:
            good, r = lib.check_gl(pg)
            ck('every shader within 16 textures per stage', good, f"fragment {r['maxFrag']}, vertex {r['maxVert']}, {r['bad'][:3]}")
        except Exception as ex:
            ck('section ran: ' + "want('gl')", False, repr(ex)[:400])
    ck.errors(errs)
    ck.done()
