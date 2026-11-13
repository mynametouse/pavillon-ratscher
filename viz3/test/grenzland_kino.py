# feat/grenzland-kino (Falko, 13.11.2026, package B „Kino-Gefühl“): talks as cutscenes, mission title cards with a sting, the score.
# Sections (second argument, comma separated; one mission per page – memory): m1 (the first talks in Schleusingen: two-shot, cuts,
# bars, the walk held, Space, Esc, back behind the player), m3 (Gerhard under the lime), score (title card of a jumped-to mission,
# the score's layers: spannung, flucht with a wanted level, silent with the radio on). Pictures in out/grenzland_kino/.
#   bash tools/browser_lock.sh python3 viz3/test/run.py --port 9012 --serve grenzland_kino:m1
import sys, os, json, time, math
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__))); import lib, grenzland_ci
port = sys.argv[1] if len(sys.argv) > 1 else '8951'
SECT = [s for s in (sys.argv[2] if len(sys.argv) > 2 else 'm1').split(',') if s]
ck = grenzland_ci.wrap(lib.Checks('grenzland_kino'), 'grenzland_kino')
OUT = lib.out('grenzland_kino')
with lib.browser() as b:
    errs = []
    pg = lib.page(b, 1100, 680, errs)
    lib.boot(pg, port, '?szenario=grenzland', figures=True)
    E = pg.evaluate
    J = lambda js: json.loads(E("JSON.stringify(" + js + ")"))
    steps = lambda secs, dt=0.1: E(f"for (let i = 0; i < {max(1, int(round(secs / dt)))}; i++) GAME.step({dt})")
    info = lambda: J("GLMISSION.debug.info()")
    def pic(name, hud=True):
        try:
            lib.shot(pg, OUT, name)
            if hud: pg.screenshot(path=os.path.join(OUT, name + '_hud.png'))
        except Exception as e:
            print('shot failed', name, e)
    def until(cond, secs=40, dt=0.25, real=0.05):
        for _ in range(int(secs / dt) + 1):
            if E(cond): return True
            steps(dt)
            if real: time.sleep(real)
        return bool(E(cond))
    def talk(maxn=30):
        n = 0
        while n < maxn and E("GLMISSION.redet()"):
            E("GLMISSION.weiter()"); steps(0.1); n += 1
        return n
    progs = lambda: E("GAME.R.info.programs.length")
    pnames = lambda: J("GAME.R.info.programs.map(p => p.name + '#' + p.id)")
    def frei():
        """free play without the opening in town (the common part's recipe): the mission stopped, the garden, Friday evening"""
        for _ in range(6):
            steps(0.3); time.sleep(0.3)
        E("(() => { GLMISSION.stop(); const d = GLMISSION.debug; if (d && d.info) for (const id of Object.keys(d.info().st || {})) GLSTATE.m[id] = { st: 'erledigt', i: 0, n: 0 }; GLSTATE.cur = ''; GLSTATE.kap1 = true; GLHUD.fade(false); if (window.GLRADIO && GLRADIO.off) GLRADIO.off(); CLOCK.t = Math.floor(CLOCK.t / 1440) * 1440 + 17 * 60 + 20; GAME.go('garten'); GLSTATE.save(true); })()")
        steps(1)
    SEEN = set()
    def linie(key, i, tag):
        """line i of the running talk: the cut, the speaker in the picture – returns the measurement"""
        ok = until(f"GLMISSION.redet() && GLMISSION.St.talk.key === '{key}' && GLMISSION.St.talk.i >= {i}", 30, 0.1, 0.02)
        steps(0.15)
        E("GAME.shot()")
        st = J(f"(() => {{ const k = GLMISSION.St.talk, w = k ? k.lines[k.i][0] : ''; const I = GLKAMERA.info(); return {{ i: k ? k.i : -1, who: w, kind: I.kind, on: I.on, bars: I.bars, b: w ? GLKAMERA.bild(w) : null, n: I.n, cast: I.who }}; }})()")
        if ok and st['kind'] and st['kind'] not in SEEN:
            SEEN.add(st['kind'])
            pic(f'{tag}_{st["kind"]}')
        return ok, st
    def im_bild(st, dmax=4.0, frame=0.8):
        b = st.get('b')
        return bool(b) and abs(b[0]) < frame and abs(b[1]) < frame and b[2] < dmax
    def hinten():
        """the follow camera again: behind the player, looking the way he faces, his head near the middle of the picture"""
        E("GAME.shot()")
        return J("(() => { const I = GLKAMERA.info(), c = I.cam, y = GAME.P.yaw * Math.PI / 180, dx = GAME.P.x - c[0], dy = GAME.P.y - c[1], d = Math.hypot(dx, dy) || 1; "
                 "return { on: I.on, blend: I.blend, d, dot: (dx * Math.sin(y) + dy * Math.cos(y)) / d, cam3: GAME.CAM3.on, hook: I.hook }; })()")

    # ================================================================ m1 · the first talks in Schleusingen ================================================================
    if 'm1' in SECT:
      try:
        ok = until("GLMISSION.debug.info().step === 'ankunft' && !!GLMISSION.St.S.da", 120, 0.5, 0.3)
        ck('mission 1 starts in Schleusingen (the opening fade is over)', ok, str(info())[:200])
        p0 = progs()
        ok = until("GLMISSION.redet() && GLMISSION.St.talk.key === 'ankunft'", 20)
        st = J("({ on: GLKAMERA.on(), I: GLKAMERA.info(), p: (F => F ? [F.id, F.g.visible, Math.round(Math.hypot(F.x - GAME.P.x, F.y - GAME.P.y) * 10) / 10, !!F.rides] : null)(GRENZLAND.partnerOf()), mode: GAME.P.mode, seated: PLAY.seated() })")
        ck('the first talk („ankunft“: Sarah and Falko at the bus stop) is a cutscene with black bars', ok and st['on'] and st['I']['bars'], str(st)[:500])
        res = []
        for i in range(3):
            okl, s = linie('ankunft', i, '11_ankunft')
            res.append(s)
        good = [s for s in res if s['who'] and s['who'] != ('falko' if E("GLSTATE.wer") == 'm' else 'sarah')]
        ck('every line of the talk: a cut, and who speaks is in the middle of the picture, the camera within 4 m of him',
           len(res) == 3 and all(s['on'] for s in res) and all(im_bild(s) for s in res if s['who']) and len({s['kind'] for s in res}) >= 2,
           json.dumps(res)[:700])
        ok_t = until("GLMISSION.debug.info().titel === 'Ein Gefallen'", 30, 0.25, 0.05)
        st = J("({ t: GLMISSION.debug.info().titel, sc: GLSCORE.stand(), msg: (e => e && !e.hidden ? e.textContent : '')(document.getElementById('glmsg')) })")
        ck('the mission\'s title card comes when the screen is calm, with the score\'s sting', ok_t and st['sc']['stiche'] >= 1 and 'start' == st['sc']['letzter'], str(st))
        if ok_t: pic('10_titel')
        talk()
        ok = until("GLMISSION.debug.info().step === 'fremder'", 10)
        steps(1.0)
        p0, n0 = progs(), pnames()
        ok2 = until("GLMISSION.redet() && GLMISSION.St.talk.key === 'fremder'", 90, 0.3, 0.2)
        res = []
        for i in range(4):
            okl, s = linie('fremder', i, '12_fremder')
            res.append(s)
        fr = [s for s in res if s['who'] == 'fremder']
        ck('the stranger\'s talk: a cutscene of three – the stranger in the middle of the picture whenever he speaks',
           ok2 and len(fr) >= 2 and all(im_bild(s) for s in fr) and any(c.startswith('fremder') for c in res[0]['cast']), json.dumps(res)[:800])
        # the walk is held: walking forward a second leaves him where he stands
        x0 = J("[GAME.P.x, GAME.P.y]")
        E("GAME.step(1, 1, 0, 0, 1)")
        x1 = J("[GAME.P.x, GAME.P.y]")
        ck('during a cutscene the player cannot walk away', math.hypot(x1[0] - x0[0], x1[1] - x0[1]) < 0.05 and E("GLKAMERA.on()"), f'{x0} → {x1}')
        # Space: the next line
        steps(0.5)
        i0 = E("GLMISSION.St.talk ? GLMISSION.St.talk.i : -1")
        pg.keyboard.press(' '); steps(0.1)
        i1 = E("GLMISSION.St.talk ? GLMISSION.St.talk.i : -1")
        ck('Space says the next line', i1 == i0 + 1, f'{i0} → {i1}')
        # Esc: the rest of the talk skipped – what comes after it still happens (the parcel, 50 €), the next talk follows in the same cutscene
        g0 = E("GLSTATE.geld")
        steps(0.5)
        pg.keyboard.press('Escape'); steps(0.2)
        st = J("({ step: GLMISSION.debug.info().step, paket: GLSTATE.inv.paket || 0, geld: GLSTATE.geld, key: GLMISSION.St.talk ? GLMISSION.St.talk.key : '', on: GLKAMERA.on(), blend: GLKAMERA.info().blend })")
        ck('Esc skips the rest of the talk; its end still runs (the parcel, +50 €); „fremderWeg“ goes on in the same cutscene',
           st['step'] == 'heim' and st['paket'] == 1 and st['geld'] == g0 + 50 and st['key'] == 'fremderWeg' and st['on'] and not st['blend'], str(st))
        okl, s = linie('fremderWeg', 0, '13_weg')
        ok = until("!GLMISSION.redet()", 20)
        steps(0.3)
        st0 = J("({ on: GLKAMERA.on(), blend: GLKAMERA.info().blend, bars: GLKAMERA.info().bars })")
        pic('14_blend', False)
        steps(1.0)
        h = hinten()
        ck('after the talk the bars go and the camera blends back behind the player', ok and not st0['on'] and not st0['bars'] and not h['on'] and not h['blend']
           and 1.0 < h['d'] < 7 and h['dot'] > 0.6, str(st0) + str(h))
        pic('15_danach')
        p1 = progs()
        ck('no new shader programs over a cutscene (± 1)', abs(p1 - p0) <= 1, f'{p0} → {p1}: ' + str([n for n in pnames() if n not in n0])[:300])
      except Exception as e:
        ck('m1 ran through without an error of the test', False, str(e)[:300])

    # ================================================================ m3 · Gerhard under the lime ================================================================
    if 'm3' in SECT:
      try:
        frei()
        E("if (VEH.cur) VEH.exit(); GLMISSION.debug.go('gerhard')"); steps(0.5)
        B = J("GLKAP1.bank()")
        ok = until("!!GLMISSION.F('gerhard')", 120, 0.3, 0.5)
        steps(0.5)
        p0 = progs()
        dx, dy = (B['vor'][0] - B['p'][0]) * 0.9, (B['vor'][1] - B['p'][1]) * 0.9
        E(f"GAME.view({B['p'][0] + dx}, {B['p'][1] + dy}, KERN.ground({B['p'][0] + dx}, {B['p'][1] + dy}) + 1.62, {(B['hd'] * 180 / math.pi + 180) % 360}, -6)"); steps(0.3)
        pic('30_vorher')
        ok2 = until("GLMISSION.redet() && GLMISSION.St.talk.key === 'gerhard1'", 10)
        res = []
        for i in range(7):
            okl, s = linie('gerhard1', i, '31_gerhard')
            res.append(s)
            if not okl: break
        g = [s for s in res if s['who'] == 'gerhard']
        ck('Gerhard\'s talk is a cutscene: whenever he speaks, his face is in the middle of the picture and the camera within 4 m',
           ok and ok2 and len(g) >= 3 and all(s['on'] and s['bars'] for s in res) and all(im_bild(s) for s in g), json.dumps(res)[:900])
        ck('Gerhard\'s key line („Die hab ich schon einmal gesehen …“) shows Gerhard, not Falko\'s back',
           any(s['who'] == 'gerhard' and s['kind'] in ('ots', 'nah') and im_bild(s, 3.2, 0.7) for s in res[3:]), json.dumps(res[3:])[:500])
        n = talk()
        ok = until("GLMISSION.debug.info().step === 'damals'", 10)
        steps(0.8)
        st = J("({ on: GLKAMERA.on(), blend: GLKAMERA.info().blend })")
        ck('after the talk the cutscene is over (the memory begins)', ok and not st['on'], str(st))
        p1 = progs()
        ck('no new shader programs (± 1)', abs(p1 - p0) <= 1, f'{p0} → {p1}')
      except Exception as e:
        ck('m3 ran through without an error of the test', False, str(e)[:300])

    # ================================================================ score · title card, layers ================================================================
    if 'score' in SECT:
      try:
        frei()
        st = J("GLSCORE.stand()")
        ck('free play: no score', st['ziel'] == '' and st['mission'] == '', str(st))
        s0 = st['stiche']
        E("GLMISSION.debug.go('klinge')"); steps(0.5)
        ok = until("GLMISSION.debug.info().titel === 'Nachts an der Klinge'", 20, 0.25, 0.05)
        st = J("({ sc: GLSCORE.stand(), msg: (e => e && !e.hidden ? e.textContent : '')(document.getElementById('glmsg')) })")
        ck('a mission begins: its title card („Nachts an der Klinge“) and the start sting', ok and st['sc']['stiche'] > s0 and st['sc']['letzter'] == 'start', str(st))
        pic('40_titel')
        E("GLMISSION.debug.go('klinge', 'ansehen')"); steps(0.5)
        st = J("GLSCORE.stand()")
        ck('sneaking up to the Klinge: the layer „spannung“', st['ziel'] == 'spannung', str(st))
        E("GLFAHNDUNG.tat('boeller', { force: [{ name: 'Anwohner', knows: false }], k: 3, quiet: true })"); steps(0.5)
        st = J("({ sc: GLSCORE.stand(), n: GLLOGIK.stars(GLSTATE.W) })")
        ck('wanted: the layer „flucht“, more with more stars', st['n'] > 0 and st['sc']['ziel'] == 'flucht' and st['sc']['stufe'] == min(5, st['n']), str(st))
        sid = E("(GLRADIO.stations()[0] || {}).id || ''")
        E(f"GLRADIO.tune('{sid}')"); steps(0.5)
        st = J("({ sc: GLSCORE.stand(), r: GLRADIO.cur() })")
        ck('the car radio plays: the score is silent', st['r'] and st['sc']['ziel'] == '' and st['sc']['radio'], str(st))
        E("GLRADIO.tune(null)"); steps(0.5)
        st = J("GLSCORE.stand()")
        ck('radio off: the chase music again', st['ziel'] == 'flucht', str(st))
        # the music itself, rendered offline: every layer and sting sounds, nothing clips
        lv = {}
        for nm, sec in (('spannung', 6), ('flucht', 4), ('1989', 8), ('szene', 6), ('start', 2.5), ('bestanden', 3), ('gescheitert', 3)):
            pg.evaluate(f"GLSCORE.probe('{nm}', {sec}).then(r => {{ window.__lv = r }})")
            lv[nm] = None
            for _ in range(40):
                time.sleep(0.25)
                r = J("window.__lv || null")
                if r:
                    lv[nm] = r; E("window.__lv = null"); break
        ck('the score sounds: every layer and sting has a level, nothing clips', all(v and 0.004 < v['rms'] and v['peak'] < 0.98 for v in lv.values()), json.dumps(lv))
        E("GLFAHNDUNG.clear()"); steps(0.5)
        E("GLMISSION.stop()"); steps(0.5)
        st = J("GLSCORE.stand()")
        ck('the mission stopped: silence', st['ziel'] == '' and st['mission'] == '', str(st))
      except Exception as e:
        ck('score ran through without an error of the test', False, str(e)[:300])
    ck.errors(errs)
    ck.done()
