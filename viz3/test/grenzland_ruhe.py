# feat/grenzland, package A (Falko 13.11.2026 10:59 „gta6 vibes und immersivität“, chosen ~11:25): quiet like GTA. While the mode runs the
# page's header, the bar of things, the dog's buttons, the game's notices and hints are hidden; top right only stars and money (a tap opens
# the panel, it folds again); the journal lists the mode's tasks only; the game's thoughts about animals and its tasks stay out and no
# thought covers a subtitle; Hasso stays at home and comes back at the end; one subtitle at a time (the police radio waits for people,
# the car radio's words step back); mission titles queue; scenes put black bars over and under the picture; ruhig() waits for the cards;
# the radar shows a patrol only while it sees you; the panel shows what the police know; the camera close to the other one hides him;
# key O frees the screen. Pictures in out/grenzland_ruhe/.
#   python3 viz3/test/grenzland_ruhe.py 9011
import sys, os, json, time
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__))); import lib
import grenzland_ci
port = sys.argv[1] if len(sys.argv) > 1 else '8951'
ck = grenzland_ci.wrap(lib.Checks('grenzland_ruhe'), 'grenzland_ruhe')
OUT = lib.out('grenzland_ruhe')
with lib.browser() as b:
    errs = []
    pg = lib.page(b, 1100, 680, errs)
    lib.boot(pg, port, '?szenario=grenzland', figures=True)
    E = pg.evaluate
    J = lambda js: json.loads(E("JSON.stringify(" + js + ")"))
    steps = lambda secs, dt=0.1: E(f"for (let i = 0; i < {max(1, int(secs / dt))}; i++) GAME.step({dt})")
    def pic(name):
        try:
            lib.shot(pg, OUT, name)
            pg.screenshot(path=os.path.join(OUT, name + '_hud.png'))
        except Exception as e:
            print('shot failed', name, e)
    VIS = "(sel => { const el = document.querySelector(sel); if (!el) return false; const cs = getComputedStyle(el); const r = el.getBoundingClientRect(); " \
          "return !el.hidden && cs.display !== 'none' && cs.visibility !== 'hidden' && +cs.opacity > 0.05 && r.width > 0 && r.height > 0; })"
    vis = lambda sel: E(VIS + "(" + json.dumps(sel) + ")")
    # ---- the scene starts: the title card ----
    steps(0.5)
    t = J("({ on: !document.getElementById('glmtitel').hidden, t: document.getElementById('glmtitel').textContent })")
    ck('the scene opens with a title card („Grenzland“, Kapitel 1, the keys)', t['on'] and 'Grenzland' in t['t'] and 'Kapitel 1' in t['t'], str(t))
    pic('01_titel')
    for _ in range(6):
        steps(0.3); time.sleep(0.3)
    E("(() => { GLMISSION.stop(); const d = GLMISSION.debug; if (d) for (const id of Object.keys(d.info().st)) GLSTATE.m[id] = { st: 'erledigt', i: 0, n: 0 }; "
      "GLSTATE.cur = ''; GLSTATE.kap1 = true; GLHUD.fade(false); if (window.GLRADIO && GLRADIO.off) GLRADIO.off(); "
      "CLOCK.t = Math.floor(CLOCK.t / 1440) * 1440 + 15 * 60 + 20; GAME.go('garten'); GLSTATE.save(true); })()")
    steps(8)
    # ---- the game's own things are hidden, the eye and the menu stay ----
    hid = {s: vis(s) for s in ['header.top', '#hotbar', '#hund-panel', '#clockbtn', '#camtog', '#qbanner']}
    ck('hidden in the mode: page header, bar of things, dog buttons, time, view chip', not any(hid.values()), str(hid))
    ck('the eye and the menu stay', vis('#cleanbtn') and vis('#menubtn'))
    E("(() => { const t = document.getElementById('toast'); t.textContent = 'Die Sonne ist untergegangen.'; t.hidden = false; })()")
    w = E("(() => { const el = document.getElementById('winote'); return el ? 1 : 0; })()")
    ck('a hint of the game does not show (toast)', not vis('#toast'))
    E("document.getElementById('toast').hidden = true")
    # ---- top right: stars and money only; a tap opens the panel, it folds again ----
    m = J("({ more: getComputedStyle(document.querySelector('#glhud .gmore')).display, geld: document.getElementById('glgeld').textContent, "
          "r: document.getElementById('glhud').getBoundingClientRect().toJSON() })")
    ck('folded: stars and money, no buttons', m['more'] == 'none' and '€' in m['geld'] and m['r']['width'] < 200, str(m))
    pic('02_frei')
    E("document.querySelector('#glhud .gs').click()")
    o = J("({ open: document.getElementById('glhud').classList.contains('gopen'), more: getComputedStyle(document.querySelector('#glhud .gmore')).display })")
    ck('a tap on the stars opens the panel with the buttons', o['open'] and o['more'] != 'none', str(o))
    pic('03_panel')
    steps(9)
    ck('the panel folds again by itself', not E("document.getElementById('glhud').classList.contains('gopen')"))
    # ---- the journal: the mode's tasks only ----
    srcs = J("[...new Set(KERN.tasks.list().map(e => String(e.src)))]")
    ck('the journal lists the mode\'s tasks only', all(s.startswith('grenzland') for s in srcs), str(srcs))
    # ---- thoughts: an animal seen for the book, a garden task – not shown; the mode's own thought – shown ----
    E("document.getElementById('npcsub').hidden = true")
    E("PLAY.think('Ein Reh!', 3000); KERN.emit('tiere:gesehen', { art: 'reh', x: 0, y: 0, d: 30 })")
    time.sleep(0.2)
    a = J("({ vis: !document.getElementById('npcsub').hidden, t: document.getElementById('npcsub').textContent })")
    ck('the game\'s thought about an animal is dropped', not (a['vis'] and 'Reh' in a['t']), str(a))
    E("PLAY.think('Testgedanke im Modus', 3000)")
    time.sleep(0.2)
    a = J("({ vis: !document.getElementById('npcsub').hidden, t: document.getElementById('npcsub').textContent })")
    ck('the mode\'s own thought shows', a['vis'] and 'Testgedanke' in a['t'], str(a))
    # a thought while a subtitle shows waits for it
    E("document.getElementById('npcsub').hidden = true; GLHUD.sub('Jule', 'Ein Satz, der gerade gesagt wird.', 2000); PLAY.think('Wartender Gedanke', 3000)")
    time.sleep(0.2)
    a1 = J("({ vis: !document.getElementById('npcsub').hidden, t: document.getElementById('npcsub').textContent })")
    steps(2.4)
    a2 = J("({ vis: !document.getElementById('npcsub').hidden, t: document.getElementById('npcsub').textContent })")
    ck('a thought waits while somebody speaks and shows after', not (a1['vis'] and 'Wartender' in a1['t']) and a2['vis'] and 'Wartender' in a2['t'], str([a1, a2]))
    # ---- subtitles: one line at a time ----
    E("GLHUD.sub('Jule', 'Erster Satz von Jule.', 3000)")
    E("GLHUD.sub('Funk', 'Zentrale an alle.', 2000)")
    s1 = E("document.getElementById('glsub').textContent")
    E("GLHUD.funk('Radio Grenzland', 'Und jetzt das Wetter.', 3000)")
    f1 = vis('#glfunk')
    pic('04_untertitel')
    steps(3.2)
    s2 = E("document.getElementById('glsub').textContent")
    ck('the police radio waits while somebody speaks, then shows', 'Jule' in s1 and 'Zentrale' not in s1 and 'Zentrale' in s2, str([s1, s2]))
    ck('the car radio\'s words step back while somebody speaks', not f1)
    E("GLHUD.sub('Timo', 'Und noch einer.', 1500)")
    ck('people speak at once (they do not wait for the radio)', 'Timo' in E("document.getElementById('glsub').textContent"))
    steps(2)
    # ---- mission titles queue; ruhig() waits for the cards ----
    E("window._fz = window.FREEZE; window.FREEZE = false")   # (in tests ruhig() does not wait – here it must)
    E("GLHUD.titel('Erste Mission', 'Kapitel 1 · Mission 1', 2); GLHUD.titel('Zweite Mission', 'Kapitel 1 · Mission 2', 2)")
    t1 = E("document.getElementById('glmtitel').textContent")
    E("window._ruhig = 0; void GLHUD.ruhig().then(() => window._ruhig = 1)")   # (void: evaluate must not wait for it)
    steps(2.2); time.sleep(1.1); steps(0.2)
    t2 = E("document.getElementById('glmtitel').textContent")
    ck('titles queue: the second after the first', 'Erste' in t1 and 'Zweite' in t2, str([t1, t2]))
    r0 = E("window._ruhig")
    steps(2.3); time.sleep(0.5)
    r1 = E("window._ruhig")
    ck('ruhig() resolves when no card shows any more', r0 == 0 and r1 == 1, str([r0, r1]))
    E("window.FREEZE = window._fz")
    # ---- a scene: bars, the panel out of the way ----
    E("GLHUD.kino(true); GLHUD.sub('Gerhard', 'Am nächsten Morgen war die Kiste weg.', 3000)")
    time.sleep(0.8)
    k = J("({ kino: document.body.dataset.glKino, bar: getComputedStyle(document.querySelector('#glbars i')).transform, hud: +getComputedStyle(document.getElementById('glhud')).opacity })")
    ck('a scene: black bars, the panel out of the way', k['kino'] == '1' and k['bar'] in ('none', 'matrix(1, 0, 0, 1, 0, 0)') and k['hud'] < 0.1, str(k))
    pic('05_szene')
    E("GLHUD.kino(false)")
    steps(3.2)
    # ---- what the police know; the radar shows a patrol only while it sees you ----
    E("window._st0 = GLFAHNDUNG.stand; GLFAHNDUNG.stand = () => Object.assign(window._st0() || {}, { cars: [{ x: KERN.where()[0] + 30, y: KERN.where()[1], gesehen: false }, "
      "{ x: KERN.where()[0] - 30, y: KERN.where()[1], gesehen: true }], wissen: { gesicht: true, kleidung: false, fahrzeug: true } })")
    E("GLFAHNDUNG.tat('einbruch', { force: [{ name: 'Testzeuge', knows: false }] })")
    steps(1.2)
    p = J("({ pol: GLKARTE.blips().filter(b => b.k === 'polizei').length, wis: !document.getElementById('glwissen').hidden, "
          "an: [...document.querySelectorAll('#glwissen i.an')].map(i => i.dataset.w) })")
    ck('the radar shows only the patrol that sees you', p['pol'] == 1, str(p))
    ck('the panel shows what the police know (face, vehicle)', p['wis'] and sorted(p['an']) == ['fahrzeug', 'gesicht'], str(p))
    pic('06_gesucht')
    E("GLFAHNDUNG.stand = window._st0; GLFAHNDUNG.clear()")
    steps(1)
    # ---- key O: the screen free; again: back ----
    pg.keyboard.press('o'); steps(0.3)
    c1 = J("({ clean: document.body.dataset.clean, hud: getComputedStyle(document.getElementById('glhud')).display, map: getComputedStyle(document.getElementById('glmap')).display })")
    pic('07_frei_o')
    pg.keyboard.press('o'); steps(0.3)
    c2 = J("({ clean: document.body.dataset.clean, hud: getComputedStyle(document.getElementById('glhud')).display })")
    ck('key O hides the panel and the radar, O again brings them back', c1['clean'] == '1' and c1['hud'] == 'none' and c1['map'] == 'none'
       and c2['clean'] != '1' and c2['hud'] != 'none', str([c1, c2]))
    # ---- the camera close to the other one: he steps out of the picture ----
    ok = False
    for _ in range(20):
        steps(0.3)
        if E("!!GRENZLAND.partnerOf()"): ok = True; break
        time.sleep(0.3)
    if ok:
        # the other one where the camera stands: his parts go out of the picture; away again: back
        E("(() => { const F = GRENZLAND.partnerOf(); GLSTATE.folgt = false; GLFIG.stop(F); const c = GAME.cam.position; GLFIG.place(F, c.x + 0.2, -c.z, 0); })()")
        steps(0.2)
        NAH = "(() => { const F = GRENZLAND.partnerOf(); const c = GAME.cam.position; return { aus: !!F.camAus, sicht: F.g.children.filter(c => c.visible).length, g: F.g.visible, dz: c.y - F.z }; })()"
        n1 = J(NAH)
        E("(() => { const F = GRENZLAND.partnerOf(); GLFIG.place(F, KERN.where()[0] + 3, KERN.where()[1] + 3, 0); })()")
        steps(0.2)
        n2 = J(NAH)
        ck('the other one close to the camera steps out of the picture, and back when away', n1['aus'] and n1['sicht'] == 0 and n1['g']
           and not n2['aus'] and n2['sicht'] > 0, str([n1, n2]))
        E("GLSTATE.folgt = true")
    ck('the partner figure exists for the camera check', ok)
    # ---- the angling spot by day: a look round (the review saw a house in the reservoir) ----
    E("CLOCK.t = Math.floor(CLOCK.t / 1440) * 1440 + 13 * 60; if (DN && DN.update) DN.update(true)")
    for i, yaw in enumerate([0, 90, 180, 270]):
        E(f"(() => {{ const a = GLORTE.P.angel; GRENZLAND.hin(a[0], a[1], {yaw}); }})()")
        steps(1.5)
        if i == 0:
            for _ in range(8):
                steps(0.3); time.sleep(0.4)
        pic(f'08_angel_{yaw}')
    # ---- Hasso stays at home and comes back at the end ----
    hund = E("!!(window.HUND && HUND.show)")
    if hund:
        E("GRENZLAND.stop(true); HUND.show(true)")
        steps(0.5)
        E("GRENZLAND.begin(false)")
        steps(1)
        h1 = J("({ on: HUND.on, mark: GLSTATE.hund, panel: getComputedStyle(document.getElementById('hund-panel') || document.body).display })")
        E("GRENZLAND.stop(true)")
        steps(0.5)
        h2 = J("({ on: HUND.on, mark: GLSTATE.hund })")
        ck('Hasso stays at home in the mode and comes back at the end', not h1['on'] and h1['mark'] and h2['on'] and not h2['mark'], str([h1, h2]))
        E("HUND.show(false)")
    else:
        ck('Hasso stays at home (no dog module)', True)
    # ---- after the end: the journal and the thoughts of the game as before, the page header back ----
    E("if (GLSTATE.on) GRENZLAND.stop(true)")
    steps(0.5)
    st = J("({ on: GLSTATE.on, head: getComputedStyle(document.querySelector('header.top')).display, think: PLAY.think.name, "
           "srcs: [...new Set(KERN.tasks.list().map(e => String(e.src)))] })")
    ck('after the end: the page header, the journal and the thoughts as before', not st['on'] and st['head'] != 'none' and st['think'] != 'denk'
       and any(not s.startswith('grenzland') for s in st['srcs']), str(st))
    errs2 = [e for e in errs if 'Failed to load resource' not in e]
    ck('no page errors', not errs2, str(errs2[:5]))
ck.done()
