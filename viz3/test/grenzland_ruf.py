# feat/grenzland-ruf: the village talks about the two, and side jobs (Grenzland, chapter 2 stage 1). Free play, one area per page:
#   ruf    a deed somebody saw costs the place (and a third at the other one), the chat gossips about it, the step changes show under the
#          radar; at the shop on wheels the saleswoman tells it in fixed fragments; misstrauisch: a whisper and a pointed finger;
#          beliebt: a wave, a warm greeting; verhasst: a call to the police; people forget day by day; saved under its own key; „Beenden“
#   jobs   the side jobs: offers, Brötchen ausliefern, Brennholz fahren, the fire brigade's exercise, the small side quests
# Pictures in out/grenzland_ruf/.   python3 viz3/test/grenzland_ruf.py 9042 [ruf,jobs]
import sys, os, json, time
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__))); import lib, grenzland_ci
port = sys.argv[1] if len(sys.argv) > 1 else '9042'
ONLY = set(sys.argv[2].split(',')) if len(sys.argv) > 2 else None
want = lambda s: ONLY is None or s in ONLY
ck = grenzland_ci.wrap(lib.Checks('grenzland_ruf'), 'grenzland_ruf')
OUT = lib.out('grenzland_ruf')
with lib.browser() as b:
    errs = []
    pg = lib.page(b, 1100, 680, errs)
    lib.boot(pg, port, '?szenario=grenzland', figures=True)
    E = pg.evaluate
    X = lambda js: pg.evaluate('(() => { ' + js + ' })(); 0')
    J = lambda js: json.loads(E("JSON.stringify(" + js + ")"))
    def steps(secs, dt=0.1):
        X(f"for (let i = 0; i < {max(1, int(round(secs / dt)))}; i++) GAME.step({dt})")
    def pic(name):
        try:
            E("GAME.shot(), 0")
            pg.screenshot(path=os.path.join(OUT, name + '.png'))
            print('shot', name, flush=True)
        except Exception as e:
            print('shot failed', name, e)
    def until(cond, secs, dt=0.5, nap=0.0):
        t = 0.0
        while t < secs:
            steps(dt); t += dt
            if E(cond): return t
            if nap: time.sleep(nap)
        return None
    X("""window.TR = { ev: [], ruf: [],
      act(id) { const a = KERN.acts().find(q => q.id === id); return a ? a.label() : null },
      run(id) { const a = KERN.acts().find(q => q.id === id); if (a) a.run(); return !!a },
      get x() { return KERN.where()[0] }, get y() { return KERN.where()[1] } };
      KERN.on('grenzland:ruf', d => TR.ruf.push(d)); KERN.on('grenzland:reaktion', d => TR.ev.push(d)); 0""")
    # free play (the scene starts mission 1): every mission done, Friday evening (the shop on wheels is open until 18:30)
    for _ in range(6): steps(0.3); time.sleep(0.3)
    X("GLMISSION.stop(); const d = GLMISSION.debug; if (d && d.info) for (const id of Object.keys(d.info().st || {})) GLSTATE.m[id] = { st: 'erledigt', i: 0, n: 0 }; GLSTATE.cur = ''; GLSTATE.kap1 = true; GLHUD.fade(false); if (window.GLRADIO && GLRADIO.off) GLRADIO.off(); CLOCK.t = Math.floor(CLOCK.t / 1440) * 1440 + 17 * 60 + 20; GAME.go('garten'); GLSTATE.save(true)")
    steps(1)
    ck('the scene runs in free play', E("GLSTATE.on && !GLSTATE.cur"))
    X("GRENZLAND.folgen && GRENZLAND.folgen(false)")
    AN = (226, -100)
    # a figure of the mode beside the player
    def figur(id, x, y, hd):
        X(f"window.TF = null; GLFIG.make('{id}', {{}}).then(F => {{ window.TF = F; if (F) {{ GLFIG.place(F, {x}, {y}, {hd}); F.sees = true }} }}); 0")
        for i in range(240):
            steps(0.1)
            if E("window.TF !== null"): return E("!!window.TF")
            time.sleep(0.6)
        return False
    # ------------------------------------------------------------------ ruf ------------------------------------------------------------------
    if want('ruf'):
        i0 = J("GLRUF.debug.info()")
        ck('ruf: a fresh game: both places neutral at 0, saved under its own key', i0['w'] == {'ratscher': 0, 'schleusingen': 0} and i0['st'] == {'ratscher': 'neutral', 'schleusingen': 'neutral'}
           and E("(() => { const v = GLRUF.debug.gespeichert(); return !!v && v.v === 1 && v.w.ratscher === 0 })()") and E("GLRUF.KEY") == 'pav-gl-ruf-v1', str(i0))
        ck('ruf: the API', E("['wert', 'stufe', 'add', 'tick', 'stop', 'linien'].every(k => typeof GLRUF[k] === 'function') && GLRUF.stufe('ratscher') === 'neutral' && GLRUF.wert('schleusingen') === 0"))
        # a banger at the Anger, seen by somebody who knows him: Ratscher thinks less of him – Schleusingen hears of it
        X(f"GLFAHNDUNG.clear(); GAME.view({AN[0]}, {AN[1]}, KERN.ground({AN[0]}, {AN[1]}) + 1.62, 160, -3); GAME.setView3(true); TR.ruf.length = 0")
        steps(0.5)
        c0 = J("GLSTATE.feed.filter(q => q.k === 'chat').length")
        X("GLFAHNDUNG.tat('boeller', { force: [{ name: 'Testzeuge', knows: true }] })")
        steps(0.5)
        i1 = J("GLRUF.debug.info()")
        ck('ruf: a deed somebody saw (he knew him) costs Ratscher 4, Schleusingen a third of it', i1['w']['ratscher'] == -4 and abs(i1['w']['schleusingen'] + 1.2) < 0.01, str(i1['w']))
        ck('ruf: … told as grenzland:ruf, kept in the log and saved', any(d['ort'] == 'ratscher' and d['grund'] == 'tat:boeller' and d['stufe'] == 'neutral' for d in J("TR.ruf"))
           and i1['log'][-2]['grund'] == 'tat:boeller' and E("GLRUF.debug.gespeichert().w.ratscher") == -4, str((J("TR.ruf"), i1['log'])))
        ck('ruf: the village has something to talk about (who, where)', i1['themen'] and i1['themen'][-1]['g'] == 'boeller' and i1['themen'][-1]['wer'] == 'm' and i1['themen'][-1]['wo'] in ('am Anger', 'an der Linde', 'an der alten Schule', 'im Dorf'), str(i1['themen']))
        # the chat gossips about it a while later
        X("GLRUF.chatT = 0; GLRUF.debug.flush()")
        steps(0.3)
        ch = J("GLSTATE.feed.filter(q => q.k === 'chat').slice(-4).map(q => q.wer + ': ' + q.text)")
        ck('ruf: the village chat gossips (Falko, the banger)', J("GLSTATE.feed.filter(q => q.k === 'chat').length") > c0 and any('Falko' in t and ('Böller' in t or 'Hund' in t) for t in ch), str(ch))
        X("GLFAHNDUNG.clear()")
        X("GLHANDY.open('chat')")
        steps(0.6)
        pic('01_chat_nach_tat')
        X("GLHANDY.close()")
        steps(0.4)
        # spoken gossip at the shop on wheels: the saleswoman tells it in fixed fragments
        X("const k = GLORTE.WG.kunde, f = GLORTE.WG.frau.xy, a = Math.atan2(f[0] - k[0], f[1] - k[1]) * 180 / Math.PI; GAME.view(k[0] - Math.sin(a * Math.PI / 180) * 0.6, k[1] - Math.cos(a * Math.PI / 180) * 0.6, KERN.ground(k[0], k[1]) + 1.62, a, -4); GAME.setView3(true)")
        t = until("GLWAGEN.frau && GLWAGEN.frau.g.visible", 60, 0.5, 0.4)
        X("window.TF = GLWAGEN.frau")
        ck('ruf: the saleswoman stands behind the counter of the shop on wheels (a place where people talk)', t is not None and E("!!GLRUF.platz(TF.x, TF.y)"), str((t, J("GLRUF.plaetze().map(p => p.name)"))))
        X("GLREAKTION.tatT = 99; GLREAKTION.sagT = 0; GLREAKTION.sagVon = {}; TR.ev.length = 0; GLFAHNDUNG.clear()")
        t = until("TR.ev.some(e => e.wer === 'haendler' && e.art === 'gerede')", 12, 0.25)
        g = J("TR.ev.filter(e => e.wer === 'haendler').map(e => e.art + ': ' + e.text)")
        ck('ruf: at the shop on wheels she tells what the village says – who, where, what (a sentence of fixed fragments)', t is not None and any('Falko hat' in x and 'Böller geworfen.' in x and 'einer von denen' in x for x in g), str((t, g)))
        steps(0.6)
        pic('02_gerede_am_wagen')
        L = J("GLRUF.linien().filter(q => q[0] === 'haendler').map(q => q[1])")
        ck('ruf: every fragment of it is a line to record (GLRUF.linien)', all(x in L for x in ['Hast du schon gehört?', 'Der Falko hat', 'am Anger', 'Böller geworfen.', 'Ach, du bist ja einer von denen.']), str(len(L)))
        # misstrauisch: a whisper at the Anger and a pointed finger; the step change shows under the radar
        X("TR.ruf.length = 0; GLRUF.debug.set('ratscher', -40)")
        steps(0.3)
        until("/misstrauisch/.test((document.getElementById('glort') || {}).textContent || '')", 6, 0.25)
        st = J("({ st: GLRUF.stufe('ratscher'), ort: document.getElementById('glort') ? document.getElementById('glort').textContent : '' })")
        ck('ruf: −40 – Ratscher is misstrauisch; the change shows as a small line under the radar', st['st'] == 'misstrauisch' and 'misstrauisch' in st['ort'] and any(d['alt'] == 'neutral' and d['stufe'] == 'misstrauisch' for d in J("TR.ruf")), str(st))
        pic('03_stufe_hud')
        X("window.TF = null")
        X(f"GAME.view({AN[0]}, {AN[1]}, KERN.ground({AN[0]}, {AN[1]}) + 1.62, 100, -3); GAME.setView3(true)")
        steps(0.5)
        okf = figur('gerhard', f"{AN[0]} + 2.6", f"{AN[1]} + 1.2", "Math.atan2(-2.6, -1.2)")
        X("Math.__r = Math.random; Math.random = () => 0.2; GLREAKTION.tatT = 99; GLREAKTION.sagT = 0; GLREAKTION.sagVon = {}; GLREAKTION.blick.clear(); TR.ev.length = 0")
        t = until("TR.ev.some(e => e.wer === 'gerhard')", 12, 0.25)
        X("Math.random = Math.__r")
        g = J("({ ev: TR.ev.filter(e => e.wer === 'gerhard'), gest: TF && TF.gest ? TF.gest.art : '', sub: (document.getElementById('glsub') || {}).textContent || '' })")
        ck('ruf: misstrauisch at the Anger – Gerhard whispers and points', okf and t is not None and g['ev'] and g['ev'][0]['art'] == 'misstrauisch' and '(leise)' in g['sub'] and g['gest'] == 'zeigen', str((t, g)))
        steps(0.5)
        pic('04_tuscheln_anger')
        # beliebt: a wave when he sees him, a warm answer to a greeting
        X("GLRUF.debug.set('ratscher', 60); GLREAKTION.blick.clear(); GLREAKTION.winkT = {}; GLREAKTION.sagVon = {}; GLREAKTION.sagT = 0; TR.ev.length = 0")
        X("const p = KERN.where(); GAME.view(p[0] + 0.2, p[1], KERN.ground(p[0] + 0.2, p[1]) + 1.62, 100, -3)")
        t = until("window.TF && TF.gest && TF.gest.art === 'winken'", 8, 0.25)
        ck('ruf: beliebt – he waves when he sees him', E("GLRUF.stufe('ratscher')") == 'beliebt' and t is not None, str((t, J("TF && TF.gest ? TF.gest.art : null"))))
        steps(0.5)
        pic('05_beliebt_winken')
        X(f"GAME.view(TF.x - 1.6, TF.y - 0.6, KERN.ground(TF.x - 1.6, TF.y - 0.6) + 1.62, Math.atan2(1.6, 0.6) * 180 / Math.PI, -3)")
        steps(0.3)
        lab = E("TR.act('gl-ansprechen')")
        X("TR.ev.length = 0; TR.run('gl-ansprechen')")
        steps(0.2)
        X("GLHUD.pick(0)")
        for _ in range(8): steps(0.2); time.sleep(0.3)
        g = J("TR.ev.filter(e => e.wer === 'gerhard').map(e => e.text)")
        ck('ruf: beliebt – a greeting is answered warmly (and counts a little)', lab == 'Ansprechen: Gerhard' and 'Für euch immer' in ' '.join(g) and E("GLRUF.debug.info().log.slice(-1)[0].grund") == 'antwort:gruessen', str((lab, g, J("GLRUF.debug.info().log.slice(-2)"))))
        # verhasst: he calls the police (a report that brings a star unless one talks him round)
        X("GLRUF.debug.set('ratscher', -80); GLFAHNDUNG.clear(); GLREAKTION.rufT = 0; GLREAKTION.gemerkt = {}; GLREAKTION.blick.clear(); GLREAKTION.sagVon = {}; GLREAKTION.sagT = 0; TR.ev.length = 0")
        X("Math.__r = Math.random; Math.random = () => 0.1")
        t = until("TR.ev.some(e => e.wer === 'gerhard')", 12, 0.25)
        X("Math.random = Math.__r")
        g = J("({ ev: TR.ev.filter(e => e.wer === 'gerhard'), offen: GLSTATE.W.offen.map(q => q.id), st: GLRUF.stufe('ratscher') })")
        ck('ruf: verhasst – he says so and takes the phone: a report on its way', g['st'] == 'verhasst' and t is not None and g['ev'] and g['ev'][0]['art'] == 'verhasst' and 'Polizei' in g['ev'][0]['text'] and 'verdacht' in g['offen'], str((t, g)))
        steps(0.4)
        pic('06_verhasst_polizei')
        t = until("GLLOGIK.stars(GLSTATE.W) > 0", 15, 0.5)
        ck('ruf: … and the call brings a star', t is not None, str((t, J("GLSTATE.W.offen.map(q => q.id)"))))
        X("GLFAHNDUNG.clear(); if (window.TF) GLFIG.drop(TF); window.TF = null")
        # people forget: a day later some points back towards 0
        X("GLRUF.debug.set('ratscher', -30); GLRUF.debug.set('schleusingen', 20)")
        X("CLOCK.t += 1440")
        steps(1.5)
        w = J("GLRUF.debug.info().w")
        ck('ruf: a game day later they have forgotten a little (6 points towards 0)', abs(w['ratscher'] + 24) < 0.6 and abs(w['schleusingen'] - 14) < 0.6, str(w))
        # a talked-round witness gives half back; a good deed adds; the decisions of chapter 2 may add
        X("GLRUF.debug.set('ratscher', 0)")
        n = E("GLRUF.add('ratscher', 6, 'job:test') + GLRUF.add('ratscher', -10, 'entscheidung:westgeld')")
        ck('ruf: GLRUF.add for good deeds and decisions', n == -4 and E("GLRUF.wert('ratscher')") == -4 and E("GLRUF.debug.info().log.slice(-1)[0].grund") == 'entscheidung:westgeld', str(J("GLRUF.debug.info()")))
        ck('ruf: no error', E("!GLRUF.err && !GLREAKTION.err"), str(E("GLRUF.err || GLREAKTION.err")))
        # „Beenden“: nothing runs on, the values stay saved; a fresh start begins at 0
        X("GLRUF.debug.set('ratscher', -12); GRENZLAND.stop(true)")
        steps(0.5)
        ck('ruf: after „Beenden“ nothing changes any more, the value stays saved', E("GLRUF.add('ratscher', 5, 'x')") == 0 and E("GLRUF.debug.gespeichert().w.ratscher") == -12 and E("GLRUF.q.length") == 0, str(J("GLRUF.debug.gespeichert()")))
    ck.errors(errs)
    ck.done()
