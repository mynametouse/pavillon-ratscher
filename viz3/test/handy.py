# handy (Falko, 13.11.2026 13:09: a realistic phone, apps to open and close, chats from top to bottom, calls, held up by the figure): the shared
# phone of viz3/src/handy/ with Grenzland as its first world. Free play in Grenzland: T takes it out (lock screen → home screen), the apps open
# from their icons and close, a thread scrolls from top to bottom (wheel), back and home, a notification banner and a reply chip, a call to a
# contact (calling → talking → ended), the camera's viewfinder and a real photo in Fotos, a locked app unlocked, the hold (the right hand at
# chest height with the phone in it, at the ear during a call, down again after), the peek while it is away, a phone's screen upright and
# sideways, the presentation layout, an alert; after „Beenden“ everything is gone. Pictures in out/handy/.
#   python3 viz3/test/handy.py 9017 [sections: app,anruf,kamera,halten,format]
import sys, os, json, time
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__))); import lib, grenzland_ci
port = sys.argv[1] if len(sys.argv) > 1 else '8951'
SECT = [s for s in (sys.argv[2] if len(sys.argv) > 2 else 'app,anruf,kamera,halten,format').split(',') if s]
ck = grenzland_ci.wrap(lib.Checks('handy'), 'handy')
OUT = lib.out('handy')
with lib.browser() as b:
    errs = []
    pg = lib.page(b, 1100, 680, errs)
    pg.set_default_timeout(12000)
    lib.boot(pg, port, '?szenario=grenzland', figures=True)
    E = pg.evaluate
    J = lambda js: json.loads(E("JSON.stringify(" + js + ")"))
    steps = lambda secs, dt=0.25: E(f"for (let i = 0; i < {max(1, int(secs / dt))}; i++) GAME.step({dt})")
    def pic(name, world=False):
        try:
            if world: lib.shot(pg, OUT, name)
            else: E("GAME.shot()")
            pg.screenshot(path=os.path.join(OUT, name + '.png'), timeout=20000)
            print('pic', name, flush=True)
        except Exception as e:
            print('shot failed', name, str(e)[:120])
    def until(cond, secs=10, dt=0.25, real=0.05):
        for _ in range(int(secs / dt)):
            steps(dt, dt)
            if E(cond): return True
            if real: time.sleep(real)
        return False
    H = lambda: J("({ open: HANDY.S.open, app: HANDY.S.app, view: HANDY.view(), sperre: HANDY.S.sperre, sucher: HANDY.S.sucher, anruf: HANDY.S.anruf ? HANDY.S.anruf.st : null, k: HANDY.S.k })")
    # free play (the common brief's recipe)
    for _ in range(6):
        steps(0.3); time.sleep(0.3)
    E("(() => { GLMISSION.stop(); const d = GLMISSION.debug; if (d && d.info) for (const id of Object.keys(d.info().st || {})) GLSTATE.m[id] = { st: 'erledigt', i: 0, n: 0 }; GLSTATE.cur = ''; GLSTATE.kap1 = true; GLHUD.fade(false); if (window.GLRADIO && GLRADIO.off) GLRADIO.off(); CLOCK.t = Math.floor(CLOCK.t / 1440) * 1440 + 17 * 60 + 20; GAME.go('garten'); GLSTATE.save(true); })()")
    steps(1)
    E("GLHANDY.close(); GLFAHNDUNG.clear && GLFAHNDUNG.clear(); 0")
    prog0 = E("(GAME.R.info.programs || []).length")
    # ---------------- taking it out ----------------
    for i in range(14): E(f"GLHANDY.chat('Dorfbewohner {i % 4}', 'Zeile {i} im Dorf-Chat: wer hat den Schlüssel vom Gemeindehaus? Schon wieder.')")
    E("for (const q of GLSTATE.sms) q.neu = false; GLHANDY.sms('Gerhard', 'Bring mir morgen die Leiter zurück. Gerhard.'); 0")
    steps(0.3)
    pg.keyboard.press('t'); steps(0.08, 0.04)
    h = H()
    ck('T takes the phone out: the lock screen first, with what came in', h['open'] and h['sperre'] >= 0 and E("!document.querySelector('#glhandy .hy-sperre').classList.contains('hy-weg')")
       and E("document.querySelectorAll('#glhandy .hy-sperre .hy-mk').length") >= 1, str(h))
    pic('01_sperre')
    steps(1)
    E("HANDY.home(); 0"); steps(0.3)
    h = H()
    root = J("(() => { const r = document.getElementById('glhandy').getBoundingClientRect(); return { w: r.width, h: r.height, l: r.left, t: r.top, b: r.bottom, r: r.right } })()")
    ico = J("[...document.querySelectorAll('#glhandy .hy-home .hy-ic')].map(b => b.dataset.app)")
    dock = J("[...document.querySelectorAll('#glhandy .hy-dock .hy-ic')].map(b => b.dataset.app)")
    ck('then it unlocks by itself: the home screen with the apps and a dock', not h['app'] and h['sperre'] < 0 and len(ico) >= 10 and len(dock) == 4, str(h) + ' ' + str(ico))
    ck('upright, at the lower right, the size of a phone (1100×680)', 230 < root['w'] < 330 and root['h'] > 1.9 * root['w'] and root['r'] <= 1100 and root['b'] <= 680 and root['l'] > 600, str(root))
    pic('02_home')
    def sect_app():
        # ---------------- Nachrichten: the threads, a conversation from top to bottom ----------------
        pg.click('#glhandy .hy-ic[data-app="nachrichten"]'); steps(0.3); time.sleep(0.4)
        h = H()
        rows = J("[...document.querySelectorAll('#glhandy #hybody [data-hy^=\"t:\"]')].map(b => b.dataset.hy)")
        ck('Nachrichten opens from its icon: the threads, the village group among them', h['app'] == 'nachrichten' and 't:dorf' in rows and 't:p:Gerhard' in rows
           and E("document.getElementById('hytitel').textContent") == 'Nachrichten', str(h) + str(rows))
        pic('03_threads')
        pg.click('#glhandy [data-hy="t:dorf"]'); steps(0.3); time.sleep(0.4)
        sc = J("(() => { const b = document.getElementById('hybody'); return { sh: b.scrollHeight, ch: b.clientHeight, st: b.scrollTop, sw: b.scrollWidth, cw: b.clientWidth, n: b.querySelectorAll('.hy-bl').length, oy: getComputedStyle(b).overflowY, t: document.getElementById('hytitel').textContent } })()")
        bb = J("(() => { const r = document.getElementById('hybody').getBoundingClientRect(); return [r.left + r.width / 2, r.top + r.height / 2] })()")
        pg.mouse.move(bb[0], bb[1]); pg.mouse.wheel(0, -400); time.sleep(0.6)
        st2 = E("document.getElementById('hybody').scrollTop")
        ck('a thread scrolls from top to bottom: bubbles one under the other, at the end first, the wheel scrolls up, nothing sideways',
           sc['t'] == 'Ratscher aktuell' and sc['n'] >= 10 and sc['sh'] > sc['ch'] + 40 and sc['st'] > 40 and st2 < sc['st'] - 40 and sc['sw'] <= sc['cw'] + 1 and sc['oy'] == 'auto', str(sc) + ' after wheel ' + str(st2))
        lay = J("(() => { const l = [...document.querySelectorAll('#hybody .hy-bl')].slice(-3).map(e => e.getBoundingClientRect()); return l.map(r => [Math.round(r.left), Math.round(r.top)]) })()")
        ck('the bubbles stand one under the other (not side by side)', len(lay) == 3 and lay[0][1] < lay[1][1] < lay[2][1] and abs(lay[0][0] - lay[2][0]) < 3, str(lay))
        pic('04_dorfchat')
        pg.keyboard.press('Backspace'); steps(0.3); time.sleep(0.3)
        h1 = H()
        pg.keyboard.press('Backspace'); steps(0.3); time.sleep(0.5)
        h2 = H()
        ck('back: Backspace to the threads, again to the home screen (the app closes into its icon)', h1['app'] == 'nachrichten' and h1['view'] == '' and h2['app'] is None
           and E("document.querySelector('#glhandy .hy-app').hidden"), str(h1) + str(h2))
        # a message while it is up: the banner; a tap opens the thread; an answer as a chip
        E("GLHANDY.sms('Jule', 'Staumauer, 20 Uhr. Bring Gemisch mit.'); 0"); steps(0.25)
        ban = J("(() => { const b = document.querySelector('#glhandy .hy-ban'); return { on: !b.classList.contains('hy-weg'), t: b.textContent } })()")
        badge = E("(document.querySelector('#glhandy .hy-ic[data-app=\"nachrichten\"] em') || {}).textContent || ''")
        ck('a message comes in: a banner drops in, a badge on the icon', ban['on'] and 'Staumauer' in ban['t'] and badge == '1', str(ban) + ' badge ' + badge)
        time.sleep(0.4); pic('05_banner')
        pg.click('#glhandy .hy-ban .hy-mk'); steps(0.3); time.sleep(0.4)
        h = H()
        chips = J("[...document.querySelectorAll('#glhandy .hy-fuss .hy-chip')].map(b => b.textContent)")
        ck('a tap on the banner opens the thread, answers as chips', h['app'] == 'nachrichten' and h['view'] == 'faden' and len(chips) >= 2 and E("GLHANDY.unread()") == 0, str(h) + str(chips))
        pg.click('#glhandy .hy-fuss .hy-chip >> nth=0'); steps(0.3)
        out_ = J("[...document.querySelectorAll('#hybody .hy-br')].map(e => e.textContent)")
        ck('the chip is sent: a bubble on the right with the time and ticks, kept in the save', len(out_) >= 1 and '✓✓' in out_[-1] and E("GLSTATE.sms.some(q => q.aus && q.von === 'Jule')"), str(out_))
        until("document.querySelectorAll('#hybody .hy-bl').length >= 2 || !GLHANDY.S.tippt['p:Jule']", 6)
        pic('06_antwort')
        # the other apps open and close
        seen = {}
        for a in ['feed', 'bank', 'notizen', 'karte', 'radio', 'uhr', 'einstellungen', 'fotos', 'telefon']:
            E(f"HANDY.home(); 0"); steps(0.2); time.sleep(0.3)
            pg.click(f'#glhandy .hy-ic[data-app="{a}"]'); steps(0.25); time.sleep(0.35)
            seen[a] = J("({ app: HANDY.S.app, t: document.getElementById('hytitel').textContent, n: document.getElementById('hybody').textContent.length })")
            if a in ('feed', 'karte', 'einstellungen'): pic('07_' + a)
        ck('every app opens from its icon with its content', all(seen[a]['app'] == a and seen[a]['n'] > 10 for a in seen), str(seen))
        # a locked app, unlocked later
        E("HANDY.home(); 0"); steps(0.2); time.sleep(0.3)
        zu0 = E("document.querySelector('#glhandy .hy-ic[data-app=\"auftraege\"]').classList.contains('hy-zu')")
        pg.click('#glhandy .hy-ic[data-app="auftraege"]'); steps(0.2)
        h = H(); why = E("document.querySelector('#glhandy .hy-ban').textContent")
        pic('08_gesperrt')
        E("GLHANDY.freischalten('auftraege'); HANDY.home(); 0"); steps(0.3)
        zu1 = E("document.querySelector('#glhandy .hy-ic[data-app=\"auftraege\"]').classList.contains('hy-zu')")
        pg.click('#glhandy .hy-ic[data-app="auftraege"]'); steps(0.25)
        h2 = H()
        ck('a locked app is grey and says „Kommt mit Kapitel 2.“; unlocked it opens (and stays so in the save)', zu0 and h['app'] != 'auftraege' and 'Kapitel 2' in why and not zu1
           and h2['app'] == 'auftraege' and E("GLSTATE.feed.some(q => q.k === 'frei' && q.text === 'auftraege')"), str([zu0, h, why[:60], zu1, h2]))
    if 'app' in SECT:
        try: sect_app()
        except Exception as e:
            ck('section app ran through', False, f'{type(e).__name__}: {str(e)[:400]}')
            try: E("HANDY.S.anruf && HANDY.auflegen(true); HANDY.sucher(false, { heim: false }); HANDY.alarm && HANDY.S.alarm && HANDY.back(); 0")
            except Exception: pass
    def sect_anruf():
        # ---------------- a call ----------------
        E("HANDY.home(); 0"); steps(0.2); time.sleep(0.3)
        pg.click('#glhandy .hy-ic[data-app="telefon"]'); steps(0.25); time.sleep(0.3)
        pg.click('#glhandy [data-hy="seg:alle"]'); steps(0.2)
        pg.click('#glhandy [data-hy="k:jule"]'); steps(0.25); time.sleep(0.3)
        pic('09_kontakt')
        pg.click('#glhandy [data-hy="ruf:jule"]'); steps(0.2)
        a0 = H()['anruf']
        pic('10_waehlt')
        ok = until("HANDY.S.anruf && HANDY.S.anruf.st === 'aktiv'", 8)
        steps(0.6)
        cap = E("document.querySelector('#glhandy .hy-anr').textContent")
        po = J("HANDYPOSE.stand()")
        ck('a call: calling, ringing, then talking with a timer and the line as a caption', a0 in ('waehlt', 'klingelt') and ok and ('Jule' in cap) and ('0:0' in cap), str(a0) + ' ' + cap[:160])
        ck('during the call the phone is at the ear', po['art'] == 'ohr' and po.get('handKopf', 9) < 0.26 and po['prop'], str(po))
        E("GAME.P.yaw = GAME.P.body + 150; 0"); steps(0.6)
        pic('11_anruf', True)
        if E("!!(HANDY.S.anruf && HANDY.S.anruf.st === 'aktiv')"): pg.click('#glhandy .hy-anr [data-k="ende"]'); steps(0.2)
        a1 = H()['anruf'] or 'ende'
        ok = until("!HANDY.S.anruf", 4)
        rec = J("GLSTATE.feed.filter(q => q.k === 'anruf').map(q => q.wer + ':' + q.text)")
        ck('hung up: „Anruf beendet“, then the app again, the call in the recents', a1 == 'ende' and ok and any('Jule' in r for r in rec), str(a1) + str(rec))
        E("GAME.P.yaw = GAME.P.body; 0")
    if 'anruf' in SECT:
        try: sect_anruf()
        except Exception as e:
            ck('section anruf ran through', False, f'{type(e).__name__}: {str(e)[:400]}')
            try: E("HANDY.S.anruf && HANDY.auflegen(true); HANDY.sucher(false, { heim: false }); HANDY.alarm && HANDY.S.alarm && HANDY.back(); 0")
            except Exception: pass
    def sect_kamera():
        # ---------------- the camera ----------------
        if not E("HANDY.S.open"): E("GLHANDY.open(); 0"); steps(0.8)
        E("HANDY.home(); 0"); steps(0.2); time.sleep(0.3)
        pg.click('#glhandy .hy-ic[data-app="kamera"]'); steps(0.3)
        c0 = J("({ su: !document.getElementById('glcam').hidden, open: HANDY.S.open, iso: GLHANDY.isOpen() })")
        n0 = E("HANDY.S.fotos.length")
        pg.click('#glcam button[data-c="foto"]'); steps(0.25); time.sleep(0.3)
        f = J("(() => { const f = HANDY.S.fotos[HANDY.S.fotos.length - 1]; return f ? { n: HANDY.S.fotos.length, len: f.img.length, jpg: f.img.startsWith('data:image/jpeg') } : null })()")
        ck('Kamera: the viewfinder over the picture, the phone itself put down; the shutter takes a real frame', c0['su'] and not c0['open'] and not c0['iso'] and f and f['n'] == n0 + 1 and f['jpg'] and f['len'] > 8000, str(c0) + str(f))
        po = J("HANDYPOSE.stand()")
        ck('the viewfinder: the phone held up in front of the eyes', po['art'] == 'foto' and po['prop'], str(po))
        pic('12_sucher')
        pg.keyboard.press('Escape'); steps(0.3)
        h = H()
        E("HANDY.zeige('fotos'); 0"); steps(0.3); time.sleep(0.4)
        g = E("document.querySelectorAll('#glhandy .hy-gitter button').length")
        ck('Esc: back to the phone; Fotos has the picture', not h['sucher'] and h['open'] and g == n0 + 1, str(h) + ' ' + str(g))
        pic('13_fotos')
    if 'kamera' in SECT:
        try: sect_kamera()
        except Exception as e:
            ck('section kamera ran through', False, f'{type(e).__name__}: {str(e)[:400]}')
            try: E("HANDY.S.anruf && HANDY.auflegen(true); HANDY.sucher(false, { heim: false }); HANDY.alarm && HANDY.S.alarm && HANDY.back(); 0")
            except Exception: pass
    def sect_halten():
        # ---------------- the hold ----------------
        if not E("HANDY.S.open"): E("GLHANDY.open(); 0")
        E("HANDY.home(); 0"); steps(1)
        po = J("HANDYPOSE.stand()")
        ok_up = po['w'] > 0.95 and po['art'] == 'halten' and po['prop'] and po.get('brustH', 0) - 0.25 < po.get('handH', 0) < po.get('kopfH', 0) + 0.05 and po.get('handVorn', 0) > 0.12
        ck('the hold: the right hand in front of the chest, below the face, the phone in it', ok_up, str(po))
        cam_up = po['cam']
        E("GAME.P.yaw = GAME.P.body + 155; 0"); steps(0.6)
        pic('14_halten', True)
        E("GAME.P.yaw = GAME.P.body + 120; GAME.P.pitch = -12; 0"); steps(0.4)
        pg.mouse.move(980, 400); pg.mouse.click(980, 400)
        steps(0.3)
        pic('15_halten_tippen', True)
        E("GAME.P.yaw = GAME.P.body; GAME.P.pitch = 0; 0")
        pg.keyboard.press('Escape'); steps(1.2)
        pd = J("HANDYPOSE.stand()")
        ck('put away: the hand down again, the phone gone, the camera back where it was', not E("HANDY.S.open") and pd['w'] < 0.01 and not pd['prop'] and pd.get('handH', 9) < pd.get('brustH', 0) - 0.2
           and cam_up is not None and pd['cam'] is not None and pd['cam'] >= cam_up, str(pd) + ' cam up ' + str(cam_up))
        pic('16_weg', True)
        # the peek while it is away
        E("GLHANDY.sms('Yuki', 'Hast du an die Worcestersauce gedacht?'); 0"); steps(0.3); time.sleep(0.5)
        pk = J("(() => { const p = document.querySelector('.hy-peek'); return { on: !p.classList.contains('hy-weg'), t: p.textContent } })()")
        ck('a message while it is away: a banner at the corner of the screen', pk['on'] and 'Worcester' in pk['t'], str(pk))
        pic('17_peek')
        steps(5)
        progs = E("(GAME.R.info.programs || []).length")
        ck('no new shader programs for the phone in the hand (at most one)', progs - prog0 <= 1, f'{prog0} → {progs}')
    if 'halten' in SECT:
        try: sect_halten()
        except Exception as e:
            ck('section halten ran through', False, f'{type(e).__name__}: {str(e)[:400]}')
            try: E("HANDY.S.anruf && HANDY.auflegen(true); HANDY.sucher(false, { heim: false }); HANDY.alarm && HANDY.S.alarm && HANDY.back(); 0")
            except Exception: pass
    def sect_format():
        # ---------------- other screens ----------------
        fits = {}
        for name, (w, hh) in {'hochkant': (390, 844), 'quer': (844, 390)}.items():
            pg.set_viewport_size({'width': w, 'height': hh}); time.sleep(1.5); steps(0.5)
            E("GLHANDY.open('chat'); 0"); steps(0.6); time.sleep(0.5)
            r = J("(() => { const r = document.getElementById('glhandy').getBoundingClientRect(); return { l: r.left, t: r.top, r: r.right, b: r.bottom, w: innerWidth, h: innerHeight } })()")
            fits[name] = r['l'] >= -1 and r['t'] >= -1 and r['r'] <= r['w'] + 1 and r['b'] <= r['h'] + 1 and (r['r'] - r['l']) > 250
            print(name, r, flush=True)
            pic('18_' + name)
            E("GLHANDY.close(); 0"); steps(0.6)
        ck('on a phone\'s screen: large in the middle upright, sideways in landscape – it fits', all(fits.values()), str(fits))
        pg.set_viewport_size({'width': 1100, 'height': 680}); time.sleep(1); steps(0.5)
        E("HANDY.layout('gross'); GLHANDY.open(); HANDY.home(); 0"); steps(0.8); time.sleep(0.4)
        r = J("(() => { const r = document.getElementById('glhandy').getBoundingClientRect(); return { h: r.height, r: r.right, t: r.top } })()")
        ck('the presentation layout: large at the right edge (~72 % of the height)', 0.66 * 680 < r['h'] < 0.76 * 680 and r['r'] > 1000, str(r))
        E("HANDY.alarm({ absender: 'Warnsystem (Szenario)', titel: 'Starkregen', text: 'Bitte Keller meiden. Dies ist eine mögliche Zukunft.', marke: 'mögliche Zukunft' }); 0"); steps(0.3); time.sleep(0.4)
        al = E("!document.querySelector('#glhandy .hy-alarm').hidden")
        pic('19_gross_alarm')
        pg.click('#glhandy .hy-alarm button'); steps(0.2)
        ck('an alert over everything, closed with OK', al and E("document.querySelector('#glhandy .hy-alarm').hidden"), str(al))
        E("HANDY.layout('auto'); 0")
        # a call that comes in (a mission's scene), taken by itself
        E("GLHANDY.ruf('sarah', [['sarah', 'Kommst du heute noch heim?'], ['ich', 'Gleich.']], { annehmen: 1.2 }); 0"); steps(0.4)
        ein = H()['anruf']
        pic('20_eingehend')
        ok = until("HANDY.S.anruf && HANDY.S.anruf.st === 'aktiv'", 4)
        ok2 = until("!HANDY.S.anruf", 20, 0.5, 0.3)
        ck('a call comes in: rings, is taken, the lines are said, it ends', ein == 'eingehend' and ok and ok2, str(ein))
        E("GLHANDY.close(); 0"); steps(0.5)
    if 'format' in SECT:
        try: sect_format()
        except Exception as e:
            ck('section format ran through', False, f'{type(e).__name__}: {str(e)[:400]}')
            try: E("HANDY.S.anruf && HANDY.auflegen(true); HANDY.sucher(false, { heim: false }); HANDY.alarm && HANDY.S.alarm && HANDY.back(); 0")
            except Exception: pass
    # ---------------- the end ----------------
    lin = J("GLHANDY.linien()")
    ck('the lines of the calls are listed for the recordings', len(lin) >= 10 and all(len(q) == 2 and q[0] for q in lin), str(lin[:3]))
    E("GLHANDY.open(); 0"); steps(0.6)
    E("GRENZLAND.stop(); 0"); steps(0.5); time.sleep(0.5)
    s = J("({ wid: HANDY.S.wid, root: document.getElementById('glhandy').hidden, cam: document.getElementById('glcam').hidden, open: HANDY.S.open, w: HANDYPOSE.S.w })")
    steps(0.6)
    s['prop'] = E("!!(HANDYPOSE.S.prop && HANDYPOSE.S.prop.g.visible)")
    ck('after „Beenden“ the phone is gone, no world, the hand down', s['wid'] is None and s['root'] and s['cam'] and not s['open'] and not s['prop'], str(s))
    pg.keyboard.press('t'); steps(0.3)
    ck('and stays away outside the mode', not E("HANDY.S.open"))
    okgl, rep = lib.check_gl(pg)
    ck('at most 16 textures per shader program, none broken', okgl, str({k: rep[k] for k in ('maxFrag', 'maxVert')}))
    ck.errors(errs)
    ck.done()
