# feat/ortsvorsteher: the election of the Ortsvorsteher and the office – Ingrid's letter, standing, signatures, ringing at a door, an issue
# question, the nomination in the town hall, election day (voting in the old school, the public count, the result), the office (a concern,
# the Ortsteilrat, the town council with the swearing in) and what then stands in the village; the hydrant task; textures per shader.
# Pictures (canvas and page) in out/amt/. Sections (second argument, comma-separated): start,ask,rathaus,wahltag,zaehlen,amt,welt,hydrant,gl
#   python3 viz3/test/run.py --port 8978 --serve amt          (or: python3 viz3/test/amt.py 8978 ask,rathaus)
import sys, os, time, json
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__))); import lib
port = sys.argv[1]; OUT = lib.out('amt'); ONLY = sys.argv[2].split(',') if len(sys.argv) > 2 else None
def want(k): return not ONLY or k in ONLY
ck = lib.Checks('amt')
def page_shot(pg, name):   # the whole page with the panels (slow in SwiftShader: a long time limit, and never fatal)
    try:
        pg.evaluate("GAME.shot()"); pg.screenshot(path=os.path.join(OUT, name + '.png'), timeout=120000); print('page shot', name, flush=True)
    except Exception as ex:
        print('note: page shot', name, 'failed:', repr(ex)[:160], flush=True)
def section(name, fn):
    if not want(name): return
    try: fn()
    except Exception as ex: ck('section ran: ' + name, False, repr(ex)[:500])
with lib.browser() as b:
    errs = []; pg = lib.page(b, 1100, 700, errs, tier='mittel'); lib.boot(pg, port); E = pg.evaluate
    J = lambda s: json.loads(E('JSON.stringify(' + s + ')'))
    E("document.querySelectorAll('#toast').forEach(e => e.style.visibility = 'hidden'); GAME.setView3(false)")
    def look_at(x, y, d=6.5, h=1.7, az_off=200, pitch=-6, fov=58):
        # a view d metres from (x, y), from the azimuth az_off, looking at it
        import math
        a = math.radians(az_off); cx = x + math.sin(a) * d; cy = y + math.cos(a) * d
        yaw = math.degrees(math.atan2(x - cx, y - cy))
        E(f"(() => {{ const z = KERN.terrain({cx}, {cy}); GAME.view({cx}, {cy}, z + {h}, {yaw}, {pitch}, {fov}); for (let i = 0; i < 6; i++) GAME.step(0.1); }})()")
    def put(x, y, yaw):   # the walker to (x, y), turned to yaw (as DORF.atDoor does)
        E(f"(() => {{ P.mode = 'walk'; document.body.dataset.mode = 'walk'; P.x = {x}; P.y = {y}; P.feet = KERN.terrain({x}, {y}); P.vz = 0; P.yaw = P.body = {yaw}; P.pitch = 0; P.air = false; GAME.step(0.2); }})()")
    def start():
        st = J('AMT.state()'); print('start', json.dumps(st, ensure_ascii=False), flush=True)
        ck('the matter waits for game day 2 (phase none, no HUD button)', st['phase'] == 'none' and E("document.getElementById('amtbtn').hidden"), st['phase'])
        ck('the people of the election are there (villagers and neighbours)', len(st['avail']) >= 8, str(st['avail']))
        ck('every villager has a home with a door to ring at', st['homes'] >= 6, str(st['homes']))
    section('start', start)
    def ask():
        st = J("AMT.jump('brief', { fresh: true })")
        ck('the letter: panel open, the notice with the dates', st['panel'] == 'letter' and 'Ortsteilbürgermeisterin' in st['say'] and st['eday'] is not None, st['say'][:80])
        page_shot(pg, 'a_brief')
        E("AMT.UI.close(); AMT.talk('ingrid', 'panel')")
        st = J('AMT.state()'); ck('Ingrid asks whether one stands', 'Stellst du dich zur Wahl' in st['say'] and any('stelle mich' in x for x in st['buttons']), json.dumps(st['buttons'], ensure_ascii=False))
        E("AMT.press('stelle mich')"); st = J('AMT.state()')
        ck('standing: phase candidate, the signatures named', st['phase'] == 'candidate' and '20 Unterschriften' in st['say'], st['say'][:120])
        E("AMT.press('Unterschreibst du')"); st = J('AMT.state()')
        ck('Ingrid signs with her household', 'ingrid' in st['signed'] and st['sig'] >= 2, f"{st['sig']} {st['say'][:80]}")
        # ringing at Gerhard's door: the action button at his doorstep
        h = J("AMT.homes().gerhard")
        x, y = h['step']; put(x - 0.5, y - 0.5, 45)
        E("CLOCK.t = Math.floor(CLOCK.t / 1440) * 1440 + 10 * 60")
        best = J("GAME.step(0.2).best"); ck('the action button: ring at Gerhard’s door', best == 'Bei Gerhard klingeln', str(best))
        E("PLAY.primary(); GAME.step(0.2)"); st = J('AMT.state()')
        ck('Gerhard opens the door, the election topics', st['panel'] == 'gerhard' and 'öffnet die Tür' in st['say'] and any('Unterschreibst' in x for x in st['buttons']), json.dumps(st['buttons'], ensure_ascii=False))
        r0 = st['rep']['gerhard']
        E("AMT.press('Was ist dir wichtig')"); st = J('AMT.state()')
        ck('he asks about an issue (the lamp)', 'Laterne' in st['say'] and len(st['buttons']) >= 3, st['say'][:80])
        page_shot(pg, 'b_frage_laterne')
        E("AMT.press('abgeschirmt')"); st = J('AMT.state()')
        ck('the compromise is a promise, Gerhard likes it', st['pos'].get('laterne') == 'mitte' and st['rep']['gerhard'] > r0, f"{st['pos']} {r0}->{st['rep']['gerhard']}")
        E("AMT.toggleBook(true)"); E("AMT.BOOK.tab = 'menschen'; AMT.renderBook()"); page_shot(pg, 'c_mappe_menschen'); E("AMT.toggleBook(false)")
    section('ask', ask)
    def rathaus():
        E("AMT.UI.close()"); st = J("AMT.jump('wahlkampf')")
        ck('the campaign with 20 signatures', st['phase'] == 'candidate' and st['sig'] >= 20, str(st['sig']))
        E("AMT.rathaus()"); st = J('AMT.state()')
        ck('the town hall scene with the election office', st['panel'] == 'rathaus' and any('Wahlvorschlag' in x for x in st['buttons']), json.dumps(st['buttons'], ensure_ascii=False))
        E("AMT.press('Wahlvorschlag einreichen')"); st = J('AMT.state()')
        ck('nomination accepted: on the ballot', st['phase'] == 'nominated' and 'Wahlausschuss' in st['say'], st['say'][:100])
        page_shot(pg, 'd_rathaus')
        E("AMT.UI.close()")
    section('rathaus', rathaus)
    def wahltag():
        st = J("AMT.jump('wahltag')"); lib.settle_light(pg)
        E("DORF.atDoor(); for (let i = 0; i < 12; i++) GAME.step(0.1)")
        best = J("GAME.step(0.2).best"); ck('at the school on election day: go and vote', best == 'Wählen gehen (Wahllokal)', str(best))
        E("PLAY.primary(); GAME.step(0.2)"); st = J('AMT.state()')
        ck('the polling station: the ballot', st['panel'] == 'vote' and any('Kreuz bei dir' in x for x in st['buttons']), json.dumps(st['buttons'], ensure_ascii=False))
        page_shot(pg, 'e_wahllokal')
        E("AMT.press('Kreuz bei dir')"); ck('voted', J('AMT.state().voted') is True, '')
        E("AMT.UI.close()")
        x, y = J("DSCHOOL.toW(DSCHOOL.F.du, -9)"); z = J("DSCHOOL.F.zF")
        E(f"GAME.view({x}, {y}, {z} + 1.7, DSCHOOL.az(0, 1), 6, 64); GAME.step(0.3)"); lib.shot(pg, OUT, 'e_schule_wahltag')
    section('wahltag', wahltag)
    def zaehlen():
        st = J("AMT.jump('zaehlen')")
        E("DORF.atDoor(); for (let i = 0; i < 6; i++) GAME.step(0.1)")
        best = J("GAME.step(0.2).best"); ck('18 h: watch the count', best == 'Bei der Auszählung zuschauen', str(best))
        E("PLAY.primary(); for (let i = 0; i < 20; i++) GAME.step(0.25)"); st = J('AMT.state()')
        ck('the count runs ballot by ballot', st['panel'] == 'count' and E("!!document.querySelector('#amtpanel .tally')"), st['say'][:60])
        page_shot(pg, 'f_auszaehlung')
        E("AMT.press('Schneller'); for (let i = 0; i < 40; i++) GAME.step(0.25)"); st = J('AMT.state()')
        v = st['vote'] or {}
        ck('the result: the numbers add up, a majority of the valid votes decides', v.get('counted') and v['me'] + v['opp'] + v['inv'] == v['turnout'] and v['turnout'] <= v['eligible'], json.dumps(v))
        print('result', json.dumps(v), st['say'][:200], flush=True)
        page_shot(pg, 'g_ergebnis')
        if v.get('won'):
            E("AMT.press('nehme die Wahl an')"); st = J('AMT.state()')
            ck('accepted: in office, the first concerns', st['phase'] == 'office' and len(st['anl']) >= 2, json.dumps(st['anl']))
        else:
            ck('lost: Uwe is elected, a new chance later', st['phase'] == 'lost' and J('AMT.ST.retry') is not None, st['phase'])
        E("AMT.UI.close()")
    section('zaehlen', zaehlen)
    def amt():
        st = J("AMT.jump('amt', { fresh: true })")
        ck('in office after a won election', st['phase'] == 'office' and st['vote'] and st['vote']['won'], json.dumps(st['vote']))
        E("AMT.talk('gerhard', 'panel')"); st = J('AMT.state()')
        ck('greeted as Ortsvorsteher; a concern to ask for', any('Anliegen' in x for x in st['buttons']), st['say'][:80])
        E("AMT.press('Anliegen')"); st = J('AMT.state()')
        ck('Gerhard’s concern: the information board', st['anl'].get('tafel') == 'open', json.dumps(st['anl']))
        E("AMT.UI.close(); CLOCK.t = Math.floor(CLOCK.t / 1440) * 1440 + 19 * 60; AMT.ortsrat()"); st = J('AMT.state()')
        ck('the Ortsteilrat session', st['panel'] == 'ortsrat' and 'Tagesordnung' in st['say'], st['say'][:100])
        page_shot(pg, 'h_ortsteilrat')
        for i in range(8):
            if not E("AMT.press('Erster Punkt') || AMT.press('Nächster Punkt') || AMT.press('Ich stimme dafür')"): break
        st = J('AMT.state()'); print('after the session', json.dumps(st['anl']), st['budget'], flush=True)
        ck('decided: own money for Ratscher matters, the rest to the town council', st['anl'].get('kirmes') in ('yes', 'no', 'later') and st['anl'].get('laterne') in ('stadt', 'no'), json.dumps(st['anl']))
        E("AMT.UI.close()")
    section('amt', amt)
    def welt():
        st = J("AMT.jump('stadtrat')"); E("AMT.council()"); st = J('AMT.state()')
        ck('the town council: swearing in first', st['panel'] == 'council' and 'schwöre' in st['say'] and st['sworn'], st['say'][:80])
        page_shot(pg, 'i_stadtrat_eid')
        for i in range(8):
            if not E("AMT.press('Zur Tagesordnung') || AMT.press('Vortragen') || AMT.press('Weiter')"): break
        st = J('AMT.state()'); print('after the council', json.dumps(st['anl']), flush=True)
        ck('the council decided with reasons (the speed limit goes to the district office)', st['anl'].get('tempo30') in ('kreis', 'later') and st['anl'].get('laterne') in ('yes', 'later', 'no'), json.dumps(st['anl']))
        page_shot(pg, 'j_stadtrat_beschluss')
        E("AMT.UI.close()")
        # everything the councils can decide stands in the village a few days later (here all at once)
        E("DORF.atDoor(); GAME.step(0.5); const S = AMT.ST; for (const k of ['laterne', 'mitfahrbank', 'anzeige', 'kirmes', 'tafel']) S.built[k] = CLOCK.t - 1; AMTWORLD.refresh(S, CLOCK.t); GAME.step(0.6)")
        w = J('AMTWORLD.state()'); print('world', json.dumps(w), flush=True)
        ck('the things stand: lamp, Mitfahrbank, speed display, Kirmes poster, board', len(w['items']) == 5 and all(w['at'][k] for k in w['items']), json.dumps(w['at']))
        for k, (dd, az, h, p) in {'laterne': (8, 200, 2.0, 6), 'mitfahrbank': (6, 160, 1.6, -4), 'anzeige': (7, 120, 1.8, 2), 'kirmes': (4.5, 200, 1.6, -2), 'tafel': (4.0, 160, 1.5, -6)}.items():
            if w['at'].get(k):
                look_at(w['at'][k][0], w['at'][k][1], dd, h, az, p); lib.shot(pg, OUT, 'k_' + k)
        # the lamp at night
        E("if (!DN.active) GAME.setMode('auto'); CLOCK.t = Math.floor(CLOCK.t / 1440) * 1440 + 23 * 60"); lib.settle_light(pg)
        E("for (let i = 0; i < 4; i++) GAME.step(0.6)")
        if w['at'].get('laterne'):
            look_at(w['at']['laterne'][0], w['at']['laterne'][1], 9, 2.0, 200, 8); lib.shot(pg, OUT, 'k_laterne_nacht')
        ck('the lamp glows at night', J('AMTWORLD.S.on') > 0.5, str(J('AMTWORLD.S.on')))
        E("CLOCK.t = Math.floor(CLOCK.t / 1440) * 1440 + 1440 + 11 * 60"); lib.settle_light(pg)
    section('welt', welt)
    def hydrant():
        E("AMT.jump('wahlkampf', { fresh: true }); AMT.talk('manfred', 'panel')"); st = J('AMT.state()')
        ck('Manfred offers the hydrant task', any('Feuerwehr' in x for x in st['buttons']), json.dumps(st['buttons'], ensure_ascii=False))
        E("AMT.press('Feuerwehr'); AMT.UI.close(); GAME.step(0.3)")
        h = J('AMTWORLD.state().hydrant'); ck('the hydrant cover under leaves and the sign stand at the Anger', bool(h), str(h))
        if h:
            look_at(h[0], h[1], 5.0, 1.6, 230, -14); lib.shot(pg, OUT, 'l_hydrant_laub')
            put(h[0] - 0.7, h[1] - 0.7, 45)
            best = J("GAME.step(0.2).best"); ck('the action: clear the leaves', best == 'Laub vom Hydrantendeckel räumen', str(best))
            E("PLAY.primary(); for (let i = 0; i < 14; i++) GAME.step(0.25)")
            st = J('AMT.state()'); ck('the cover is free, back to Manfred', st['tasks'].get('hydrant') == 1 and J('AMTWORLD.state().hydFound'), json.dumps(st['tasks']))
            look_at(h[0], h[1], 4.0, 1.5, 230, -18); lib.shot(pg, OUT, 'l_hydrant_frei')
    section('hydrant', hydrant)
    def gl():
        ok, r = lib.check_gl(pg, 16)
        ck('textures per shader program ≤ 16, none broken', ok, json.dumps({k: r[k] for k in ('programs', 'maxFrag', 'maxVert', 'bad', 'broken')}))
    section('gl', gl)
    ck.errors(errs)
    ck.done()
