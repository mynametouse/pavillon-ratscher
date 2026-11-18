# feat/mehrspieler: playing together (netz/*.js, Falko 17.11.2026). Two pages of one browser, joined through a BroadcastChannel (?lokal=1
# – the same messages as over the internet, without the Nostr relays): the host opens room TEST01, the guest comes with ?zusammen=TEST01.
# Checks: both see each other (names, the guest's avatar – a person of the streets with painted clothes, a cap, glasses – on the guest's
# own figure and as the host's figure of him), the guest's clock follows the host's (and is his own again after leaving), where the guest
# goes the host sees him (figure, name over the head, through the jump „Hin“), pointing (a ring and a word over there, his arm points),
# a wave, a vehicle the guest drives moves on the host and cannot be taken there, a house: inside he is hidden outside, the jump takes one
# in, hide and seek (the seeker counts in the dark and cannot move, the names go, „gefunden“ checked on the host, the end), leaving.
# Pictures into out/mehrspieler/. Sections: raum, welt, zeigen, auto, haus, verstecken, ende (all by default).
#   python3 viz3/test/mehrspieler.py PORT [raum,welt,zeigen,auto,haus,verstecken,ende]
import sys, os, json, time
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__))); import lib
port = sys.argv[1] if len(sys.argv) > 1 else '8951'
ONLY = set((sys.argv[2] if len(sys.argv) > 2 else '').split(',')) - {''}
want = lambda k: not ONLY or k in ONLY
ck = lib.Checks('mehrspieler')
OUT = lib.out('mehrspieler')
errs = []
with lib.browser() as b:
    ctx = b.new_context(viewport={'width': 900, 'height': 560})
    # one browser, two pages: a BroadcastChannel joins pages of one browser only (they share the storage as well)
    A = ctx.new_page(); B = ctx.new_page()
    for pg in (A, B):
        lib.preset(pg, 'schnell')
        pg.on('pageerror', lambda e: errs.append('PAGEERR ' + str(e)))
    lib.boot(A, port, '?lokal=1', figures=True)
    JA = lambda js: json.loads(A.evaluate("JSON.stringify(" + js + ")"))
    JB = lambda js: json.loads(B.evaluate("JSON.stringify(" + js + ")"))
    def stepA(s): A.evaluate(f"for (let i = 0; i < {max(1, int(s / 0.05))}; i++) GAME.step(0.05)")
    def stepB(s): B.evaluate(f"for (let i = 0; i < {max(1, int(s / 0.05))}; i++) GAME.step(0.05)")
    def both(s, rounds=1):
        for _ in range(rounds):
            stepA(s); time.sleep(0.25); stepB(s); time.sleep(0.25)
    def until(cond, secs=60, s=0.3):
        t0 = time.time()
        while time.time() - t0 < secs:
            both(s)
            if cond(): return True
            time.sleep(0.4)
        return False
    A.evaluate("NAVATAR.set({ name: 'Falko', av: { b: 'm', c: 0 } })")
    A.evaluate("NETZ.open('host', 'TEST01', true)")
    lib.boot(B, port, '?zusammen=TEST01&lokal=1', figures=True)
    # the guest: a person of the streets in red with jeans, a cap in his colour, glasses
    B.evaluate("NAVATAR.set({ name: 'Tom', av: { b: 'vk_m11', o: 0, u: 0, um: 1, h: 1, br: 1, c: 2 } })")
    peerA = lambda: JA("NETZ.list().map(p => ({ name: p.name, fig: p.fig, st: !!p.st, b: p.av.b }))")
    peerB = lambda: JB("NETZ.list().map(p => ({ name: p.name, fig: p.fig, st: !!p.st, b: p.av.b }))")
    ok = until(lambda: any(p['name'] == 'Tom' and p['fig'] and p['st'] and p['b'] == 'vk_m11' for p in peerA()) and any(p['name'] == 'Falko' and p['fig'] for p in peerB()), 150)
    if want('raum'):
        ck('host and guest see each other (names, figures, states)', ok, f"{peerA()} | {peerB()}")
        r = JB("({ on: NETZ.on, role: NETZ.role, code: NETZ.code, status: NETZ.status })")
        ck('the guest is in room TEST01', r['on'] and r['role'] == 'gast' and r['code'] == 'TEST01', str(r))
        until(lambda: JB("AVATAR.kind === 'vk_m11' && NAVATAR.dressed > 0 && !NAVATAR.busy"), 90)
        av = JB("({ kind: AVATAR.kind, dressed: NAVATAR.dressed, extra: NAVATAR.LOC.extra.length, tex: NAVATAR.LOC.tex.length, err: NAVATAR.err })")
        ck('the guest\'s own figure is his avatar: the person, clothes painted, cap and glasses', av['kind'] == 'vk_m11' and av['dressed'] > 0 and av['tex'] > 0 and av['extra'] >= 2, str(av))
        cast = JA("(() => { const p = NETZ.list().find(q => q.name === 'Tom'); const c = p && GLDATA.CAST['netz_' + p.pid]; return c ? { fig: c.fig, kleid: !!GLDATA.KLEID[c.kleid], hut: c.hut, brille: c.brille } : null; })()")
        ck('the host builds the guest\'s figure from the plan (person, clothes, cap in his colour, glasses)', cast and cast['fig'] == 'vk_m11' and cast['kleid'] and str(cast['hut']).startswith('netz_cap_') and cast['brille'] == 'gross', str(cast))
        ck('the host\'s own figure stays Falko', JA("AVATAR.kind") == 'm', JA("AVATAR.kind"))
        # the window „Zusammen spielen“ (menu entry on the start page, the bar's button while in a room)
        A.evaluate("NETZUI.show(true)"); stepA(1.2)
        ui = JA("(() => { const w = document.getElementById('netzwin'); return w ? { vis: !w.hidden, txt: w.textContent, figs: w.querySelectorAll('[data-av=\"b\"]').length, hin: w.querySelectorAll('[data-n=\"hin\"]').length, link: (w.querySelector('.nzlink') || {}).value || '', menu: !!document.getElementById('netzbtn') } : null; })()")
        ck('the window: code and link, Tom with „Hin“, the 13 figures; the menu entry', ui and ui['vis'] and 'TEST01' in ui['txt'] and 'zusammen=TEST01' in ui['link'] and 'Tom' in ui['txt'] and ui['hin'] == 1 and ui['figs'] == 13 and ui['menu'], str(ui and {k: v for k, v in ui.items() if k != 'txt'}))
        hb = JA("(() => { const b = document.getElementById('netzhb'); return b ? [!b.hidden && getComputedStyle(b).display !== 'none', b.textContent] : null; })()")
        ck('the bar shows „Zusammen“ with the number of players', hb and hb[0] and '2' in hb[1], str(hb))
        A.evaluate("NETZUI.show(false)")
    if want('welt'):
        # the host's clock: the guest follows (and keeps his own for later)
        own = JB("CLOCK.t")
        A.evaluate("CLOCK.t = Math.floor(CLOCK.t / 1440) * 1440 + 20 * 60 + 15")
        until(lambda: abs(JB("CLOCK.t % 1440") - (20 * 60 + 15)) < 3, 30)
        ck('the guest\'s clock follows the host\'s', abs(JB("CLOCK.t % 1440") - (20 * 60 + 15)) < 3, f"{JB('CLOCK.hm()')} vs {JA('CLOCK.hm()')}")
        ck('the guest keeps his own clock for afterwards', JB("NETZ.uhr && NETZ.uhr.t") is not None and abs(JB("NETZ.uhr.t") - own) < 5, f"{JB('NETZ.uhr')} own {own}")
        A.evaluate("CLOCK.t = Math.floor(CLOCK.t / 1440) * 1440 + 11 * 60")
        until(lambda: abs(JB("CLOCK.t % 1440") - 11 * 60) < 3, 30)
        # the guest goes to the Anger: the host knows it, jumps to him, sees him
        B.evaluate("GAME.go('dorf')"); both(0.4, 2)
        pb = JB("[GAME.P.x, GAME.P.y]")
        until(lambda: (lambda q: q and abs(q[0] - pb[0]) < 1 and abs(q[1] - pb[1]) < 1)(JA("(() => { const p = NETZ.list()[0]; return p && p.st ? [p.st.x, p.st.y] : null; })()")), 20)
        pa = JA("(() => { const p = NETZ.list()[0]; return p && p.st ? [p.st.x, p.st.y] : null; })()")
        ck('the host knows where the guest is', pa and abs(pa[0] - pb[0]) < 1 and abs(pa[1] - pb[1]) < 1, f"{pa} vs {pb}")
        A.evaluate("(() => { const p = NETZ.list().find(q => q.name === 'Tom'); NETZ.jumpTo(p.pid); })()")
        both(0.5, 3)
        d = JA(f"Math.hypot(GAME.P.x - {pb[0]}, GAME.P.y - {pb[1]})")
        ck('„Hin“ puts the host beside the guest', d < 4, f"{d:.1f} m")
        # the host looks at him from a few metres, in the third person
        A.evaluate(f"(() => {{ const P = GAME.P, x = {pb[0]}, y = {pb[1]}; P.x = x + 3.2; P.y = y + 2.0; P.feet = GAME.floorAt(P.x, P.y, P.feet + 1); P.yaw = P.body = Math.atan2(x - P.x, y - P.y) * 180 / Math.PI; P.pitch = -4; GAME.setView3(false); }})()")
        B.evaluate("GAME.P.yaw = GAME.P.body = 40")
        both(0.5, 3)
        # GAME.step draws nothing (FREEZE): one picture puts the camera where the view is, the next step places the names for it (a
        # fresh state of the guest first – a picture takes seconds here, and a figure without news for 8 s goes)
        A.evaluate("GAME.shot()"); stepB(0.2); time.sleep(0.4); A.evaluate("GAME.step(0.1)")
        vis = JA("(() => { const p = Object.values(NETZ.peers).find(q => q.name === 'Tom'); return p ? { F: !!p.F, vis: !!(p.F && p.F.g.visible), lab: p.lab ? p.lab.style.display : null, txt: p.lab ? p.lab.textContent : null } : null; })()")
        ck('the host sees the guest\'s figure and his name over it', vis and vis['vis'] and vis['lab'] == 'block' and vis['txt'].startswith('Tom'), str(vis))
        lib.shot(A, OUT, 'a_host_sieht_tom')
        B.evaluate(f"(() => {{ const P = GAME.P; const q = NETZ.list()[0].st; P.yaw = Math.atan2(q.x - P.x, q.y - P.y) * 180 / Math.PI; P.pitch = -3; GAME.setView3(true); }})()")
        both(0.4, 2)
        lib.shot(B, OUT, 'b_tom_sieht_falko')
        # the guest walks: the host's figure of him walks too (the last state sent while walking)
        B.evaluate("GAME.step(1.0, 1)"); time.sleep(0.6)
        sp = JA("(() => { const p = NETZ.list()[0]; return p && p.st ? p.st.sp : null; })()")
        ck('the guest walks: his speed reaches the host (the figure walks)', sp is not None and sp > 0.5, str(sp))
    if want('zeigen'):
        B.evaluate("GAME.P.pitch = -25"); stepB(0.2)
        h = JB("(() => { const h = NETZ.ping(); return h ? { art: h.art, x: h.x, y: h.y } : null; })()")
        until(lambda: JA("document.querySelectorAll('.nzping').length") > 0, 15)
        pr = JA("[...document.querySelectorAll('.nzping')].map(e => e.textContent)")
        ck('pointing: the host gets a ring and the word', h and pr and any(t.startswith('Tom: ') for t in pr), f"{h} {pr}")
        g = JA("(() => { const p = Object.values(NETZ.peers).find(q => q.name === 'Tom'); return p && p.F && p.F.gest ? p.F.gest.art : null; })()")
        ck('… and the guest\'s figure points', g == 'zeigen', str(g))
        both(0.3, 4)
        B.evaluate("NETZ.geste('winken')")
        until(lambda: JA("(() => { const p = Object.values(NETZ.peers).find(q => q.name === 'Tom'); return !!(p && p.F && p.F.gest && p.F.gest.art === 'winken'); })()"), 10)
        ck('a wave reaches the host', JA("(() => { const p = Object.values(NETZ.peers).find(q => q.name === 'Tom'); return !!(p && p.F && p.F.gest && p.F.gest.art === 'winken'); })()"))
        lib.shot(A, OUT, 'c_tom_winkt')
    if want('auto'):
        B.evaluate("VEH.goTo('car'); GAME.step(0.3); VEH.enter('car')"); both(0.5, 2)
        ck('the guest drives the car', JB("!!(VEH.cur && VEH.cur.id === 'car')"))
        B.evaluate("(() => { const v = VEH.cur; VEH.place('car', v.st.x + 12, v.st.y + 3, v.st.psi); })()")
        cb = JB("[VEH.by.car.st.x, VEH.by.car.st.y]")
        until(lambda: (lambda q: abs(q[0] - cb[0]) < 1.5 and abs(q[1] - cb[1]) < 1.5)(JA("[VEH.by.car.st.x, VEH.by.car.st.y]")), 20)
        ca = JA("[VEH.by.car.st.x, VEH.by.car.st.y]")
        ck('the car the guest drives moves on the host', abs(ca[0] - cb[0]) < 1.5 and abs(ca[1] - cb[1]) < 1.5, f"{ca} vs {cb}")
        A.evaluate("(() => { const v = VEH.by.car; GAME.P.x = v.st.x - 1.5; GAME.P.y = v.st.y; GAME.P.feet = GAME.floorAt(GAME.P.x, GAME.P.y, v.st.z + 1); })()")
        stepA(0.3)
        lab = JA("(() => { const a = KERN.acts().find(q => q.id && q.id.startsWith('netz:veh:')); return a ? a.label() : null; })()")
        ck('the host is told who drives it (no getting in)', lab and 'fährt' in lab, str(lab))
        B.evaluate("PLAY.stand(true)"); both(0.4, 2)
        ck('the guest is out again', JB("!VEH.cur"))
    if want('haus'):
        hid = JB("(() => { const P = GAME.P; const L = HAEUSER.list().map(h => [Math.hypot(h.door.x - P.x, h.door.y - P.y), h.id]).sort((a, b) => a[0] - b[0]); return L.length ? L[0][1] : null; })()")
        if hid is not None:
            B.evaluate(f"HAEUSER.enter({hid})")
            until(lambda: JB("!!HAEUSER.H"), 60)
            both(0.4, 3)
            vis = JA("(() => { const p = Object.values(NETZ.peers).find(q => q.name === 'Tom'); return p ? { inn: p.st && p.st.inn, vis: !!(p.F && p.F.g.visible), txt: p.lab && p.lab.textContent } : null; })()")
            ck('the guest in a house: the host outside does not see his figure, the name says so', vis and vis['inn'] == hid and not vis['vis'], str(vis))
            A.evaluate("(() => { const p = NETZ.list().find(q => q.name === 'Tom'); NETZ.jumpTo(p.pid); })()")
            until(lambda: JA("!!HAEUSER.H"), 60)
            both(0.4, 4)
            A.evaluate("GAME.shot()"); stepB(0.2); time.sleep(0.4); A.evaluate("GAME.step(0.1)")
            vis2 = JA("(() => { const p = Object.values(NETZ.peers).find(q => q.name === 'Tom'); return p ? { vis: !!(p.F && p.F.g.visible), id: HAEUSER.id, d: +Math.hypot(GAME.P.x - p.x, GAME.P.y - p.y).toFixed(2) } : null; })()")
            ck('„Hin“ takes the host into the same house – beside him, he sees him there', vis2 and vis2['id'] == hid and vis2['vis'] and 0.5 < vis2['d'] < 2.5, str(vis2))
            lib.shot(A, OUT, 'd_im_haus')
            A.evaluate("HAEUSER.leave()"); B.evaluate("HAEUSER.leave()")
            ck('both out of the house again', until(lambda: JA("!HAEUSER.H") and JB("!HAEUSER.H"), 40), f"{JA('HAEUSER.id')} {JB('HAEUSER.id')}")
            # both came out of the same door: the guest steps away (in each other one would see the figure from inside – it goes)
            B.evaluate("GAME.step(1.2, 1)"); both(0.3, 2)
        else: ck('a house near the Anger', False, 'HAEUSER.list() empty')
    if want('verstecken'):
        pidB = JB("NAVATAR.pid")
        A.evaluate("NVERSTECK.start(NAVATAR.pid, { zaehlen: 6, suchen: 90 })")
        until(lambda: JB("!!(NVERSTECK.st && NVERSTECK.st.phase === 'zaehlen')"), 15)
        ck('a round starts on both: the host seeks, the guest hides', JA("NVERSTECK.role()") == 'sucher' and JB("NVERSTECK.role()") == 'versteckt', f"{JA('NVERSTECK.role()')} {JB('NVERSTECK.role()')}")
        d0 = JA("document.getElementById('nzvsd') && !document.getElementById('nzvsd').hidden")
        p0 = JA("[GAME.P.x, GAME.P.y]")
        A.evaluate("(() => { const P = GAME.P; for (let i = 0; i < 20; i++) { P.x += 0.2; GAME.step(0.05); } })()")
        p1 = JA("[GAME.P.x, GAME.P.y]")
        ck('the seeker counts in the dark and cannot move', d0 and abs(p1[0] - p0[0]) < 0.05, f"dark {d0}, {p0} → {p1}")
        lib.shot(A, OUT, 'e_zaehlen')
        until(lambda: JA("NVERSTECK.st && NVERSTECK.st.phase") == 'suchen' and JB("NVERSTECK.st && NVERSTECK.st.phase") == 'suchen', 30)
        A.evaluate("GAME.shot()"); stepB(0.2); time.sleep(0.4); A.evaluate("GAME.step(0.1)")
        lab = JA("(() => { const p = Object.values(NETZ.peers).find(q => q.name === 'Tom'); return p && p.lab ? [p.lab.style.display, NETZ.labelRule ? NETZ.labelRule(p) : null] : null; })()")
        ck('while seeking no name over the hiding one', lab and lab[0] == 'none' and lab[1] is False, str(lab))
        # the seeker comes to him: the action says „Tom gefunden!“
        A.evaluate("(() => { const q = NETZ.list()[0].st; const P = GAME.P; P.x = q.x + 1.2; P.y = q.y + 0.6; P.feet = GAME.floorAt(P.x, P.y, q.z + 1); })()")
        both(0.3, 2)
        al = JA("(() => { const a = KERN.acts().find(q => q.id === 'netz:verstecken'); return a ? a.label() : null; })()")
        ck('near him the action says who is found', al == 'Tom gefunden!', str(al))
        A.evaluate(f"NVERSTECK.claim('{pidB}')")
        until(lambda: JB("NVERSTECK.st && NVERSTECK.st.phase") == 'ende', 20)
        e = JB("NVERSTECK.st && { phase: NVERSTECK.st.phase, end: NVERSTECK.st.end, found: NVERSTECK.st.found.length }")
        ck('found: the round ends for both, all found', e and e['phase'] == 'ende' and e['end']['alle'] and e['found'] == 1, str(e))
        # (pictures of the guest's page only early on: with two pages here the second one may lose its graphics late in the run)
        lib.shot(A, OUT, 'f_ende')
    if want('ende'):
        B.evaluate("NETZ.close()")
        until(lambda: JA("NETZ.list().length") == 0, 30)
        ck('the guest leaves: the host is alone again, the figure gone', JA("NETZ.list().length") == 0 and JA("document.querySelectorAll('.nzlab').length") == 0, f"{JA('NETZ.list().length')}")
        ck('the guest has his own clock again', JB("NETZ.uhr") is None, str(JB("NETZ.uhr")))
        ck('nothing went wrong on either side', not JA("NETZ.err") and not JB("NETZ.err") and not JB("NAVATAR.err"), f"{JA('NETZ.err')} {JB('NETZ.err')} {JB('NAVATAR.err')}")
    ck.errors(errs)
ck.done()
