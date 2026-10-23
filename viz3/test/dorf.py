# feat/dorf village life: the Skat and Rummy evening in the old school (Fridays 19–23 h), the fire on the field towards the Klinge (every other
# Saturday), the villagers (Rocketbox figures, loaded only for an evening nearby), the talk panel, table talk, the task, the card game.
# Pictures (canvas and page) in out/dorf/. Sections (second argument, comma-separated): light,door,inside,talk,task,fire,gl – default all.
#   python3 viz3/test/run.py --port 8974 --serve dorf          (or: python3 viz3/test/dorf.py 8974 door,inside)
import sys, os, time, json
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__))); import lib
port = sys.argv[1]; OUT = lib.out('dorf'); ONLY = sys.argv[2].split(',') if len(sys.argv) > 2 else None
def want(k): return not ONLY or k in ONLY
ck = lib.Checks('dorf')
def page_shot(pg, name):
    pg.evaluate("GAME.shot()"); pg.screenshot(path=os.path.join(OUT, name + '.png')); print('page shot', name, flush=True)
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
            ix, iy = J("DSCHOOL.toW(DSCHOOL.seats.ingrid.x - 0.9, DSCHOOL.seats.ingrid.y - 0.5)"); z = J("DSCHOOL.F.zF")
            E(f"GAME.view({ix}, {iy}, {z} + 1.62, DSCHOOL.az(0.9, 0.5), -10, 62); GAME.step(0.3)")
            best = J("GAME.step(0.1).best"); ck('the action button offers to talk to Ingrid', best == 'Mit Ingrid sprechen', str(best))
            E("PLAY.primary(); GAME.step(0.2)")
            st = J('DORF.state()'); ck('the talk panel opens', st['talk'] == 'ingrid' and not E("document.getElementById('dorfpanel').hidden"), str(st['talk']))
            page_shot(pg, 'c_talk_ingrid')
            topics = J("[...document.querySelectorAll('#dorfpanel .topics button')].map(b => b.textContent)")
            print('topics', topics, flush=True)
            ck('Ingrid has topics (the task first)', len(topics) >= 4 and topics[0] == 'Hallo, ich bin neu hier', str(topics))
            E("[...document.querySelectorAll('#dorfpanel .topics button')].find(b => b.textContent === 'Die Talsperre').click()")
            txt = E("document.querySelector('#dorfpanel .say').textContent"); ck('she answers about the dam', 'Talsperre' in txt, txt[:80])
        except Exception as ex:
            ck('section ran: ' + "want('talk') or want('task')", False, repr(ex)[:400])
    if want('task'):
        try:
            E("[...document.querySelectorAll('#dorfpanel .topics button')].find(b => b.classList.contains('quest')).click()")
            ck('task: after greeting Ingrid one should sit down', J('DORF.ST.step') == 'sit', J('DORF.ST.step'))
            E("DORF.UI.close(); DORF.sitDown(); GAME.step(0.6)")
            page_shot(pg, 'd_seated')
            time.sleep(1.5)
            lines = []
            for i in range(70):
                E("GAME.step(0.5)"); s = J("DORF.state().sub")
                if s and (not lines or lines[-1] != s): lines.append(s)
                if J('DORF.ST.step') == 'play': break
            print('story', lines, flush=True)
            ck('sitting down: Gerhard tells the story of the clock', any('Gerhard' in l and '1828' in l for l in lines), str(lines[:3]))
            ck('task: then the card game', J('DORF.ST.step') == 'play', J('DORF.ST.step'))
            time.sleep(1.2); E("GAME.step(0.2)")
            if J('DORF.state().talk') != 'katrin': E("DORF.UI.open('katrin')")
            E("[...document.querySelectorAll('#dorfpanel .topics button')].find(b => b.classList.contains('quest')).click()")
            for i in range(5):
                E("[...document.querySelectorAll('#dorfpanel .topics button')].find(b => b.textContent === (Math.random() < 0.5 ? 'Höher' : 'Tiefer')).click()")
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
    if want('gl'):
        try:
            good, r = lib.check_gl(pg)
            ck('every shader within 16 textures per stage', good, f"fragment {r['maxFrag']}, vertex {r['maxVert']}, {r['bad'][:3]}")
        except Exception as ex:
            ck('section ran: ' + "want('gl')", False, repr(ex)[:400])
    ck.errors(errs)
    ck.done()
