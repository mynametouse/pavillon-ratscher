# feat/grenzland-radio (Falko, 13.11.2026: „… verschiedene Radiosender eingestellt werden können. Ähnlich wie bei GTA.“): the radio and the
# phone of the mode „Grenzland“. Starts the scene, switches through the six stations (R, the list, the keys), checks that a piece is
# rendered and plays (level of the buffer, the phone's thin sound rendered offline), that the programme advances (music, words), that the
# police report tells a deed of the player's and a special report interrupts the music at three stars, the reception of the station
# from across the border, the dial of 1989 with the news of 10 November 1989; the phone with every tab, a message that arrives and is
# read, the chat's reaction to a patrol car, a post's marker, the bank, a note with sources, the camera that counts, the phone on a
# phone's screen (portrait, landscape); after „Beenden“ everything is silent and gone. Pictures in out/grenzland_radio/.
#   python3 viz3/test/grenzland_radio.py 9013        (~6 min in the chat machine)
import sys, os, json, time
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__))); import lib
port = sys.argv[1] if len(sys.argv) > 1 else '8951'
ck = lib.Checks('grenzland_radio')
OUT = lib.out('grenzland_radio')
with lib.browser() as b:
    errs = []
    pg = lib.page(b, 1100, 680, errs)
    lib.boot(pg, port, '?szenario=grenzland')
    E = pg.evaluate
    J = lambda js: json.loads(E("JSON.stringify(" + js + ")"))
    steps = lambda secs, dt=0.25: E(f"for (let i = 0; i < {max(1, int(secs / dt))}; i++) GAME.step({dt})")
    def pic(name, world=False):
        try:
            if world: lib.shot(pg, OUT, name)
            else: E("GAME.shot()")
            pg.screenshot(path=os.path.join(OUT, name + '.png'))
            print('pic', name, flush=True)
        except Exception as e:
            print('shot failed', name, e)
    def until(cond, secs=30, dt=0.25, real=0.05):
        for _ in range(int(secs / dt)):
            steps(dt, dt)
            if E(cond): return True
            if real: time.sleep(real)
        return False
    ST = lambda: J("GLRADIO.stand()")
    E("GAME.setSound && GAME.setSound(true)")
    steps(1)
    ton = E("!!GLTON.raw()")
    print('sound engine:', ton, flush=True)
    # ---------------- the radio ----------------
    st = J("({ on: GLSTATE.on, n: GLRADIO.stations().map(s => s.id), cur: GLRADIO.cur(), radio: GLSTATE.radio })")
    ck('six stations on the dial, the radio is off at first', st['on'] and st['n'] == ['grenzland', 'kirmes', 'klassik', 'zweitakt', 'blasius', 'neon']
       and st['cur'] is None and st['radio'] == 0, str(st))
    E("GLRADIO.next()")
    steps(0.5)
    s = ST()
    ck('R: the first station, the display with name and frequency', s['id'] == 'grenzland' and s['radio'] == 1 and s['bar']
       and 'Radio Grenzland' in E("document.getElementById('glradio').textContent") and '89,1' in E("document.getElementById('glradio').textContent"), str(s))
    if ton:
        ok = until("GLRADIO.stand().k === 'musik' && GLRADIO.stand().src", 40)
        s = ST()
        ck('a piece is rendered in slices and plays (in the middle, as if it had been running)', ok and s['ton'] and s['titel'] and 5 < s['left'] < 80, str({k: s[k] for k in ('k', 'titel', 'left', 'bufs', 'jobs')}))
        lv = J("(() => { const b = Object.values(GLRADIO.S.bufs)[0]; if (!b) return null; const d = b.getChannelData(0); let pk = 0, sq = 0; for (let i = 0; i < d.length; i++) { const a = Math.abs(d[i]); if (a > pk) pk = a; sq += d[i] * d[i]; } return { pk, rms: Math.sqrt(sq / d.length), sr: b.sampleRate, sec: b.duration } })()")
        ck('its buffer: no clipping, a moderate level', lv and lv['pk'] <= 0.86 and 0.06 < lv['rms'] < 0.13 and lv['sr'] == 24000 and lv['sec'] > 30, str(lv))
        # the phone's thin sound, rendered offline through the same filters: audible, not clipping, the bass gone
        off = E("""(async () => { const b = Object.values(GLRADIO.S.bufs)[0]; const o = new OfflineAudioContext(1, 48000 * 6, 48000);
          const s = o.createBufferSource(); s.buffer = b; const hp = o.createBiquadFilter(); hp.type = 'highpass'; hp.frequency.value = 520;
          const lp = o.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 3600; const g = o.createGain(); g.gain.value = 0.3;
          s.connect(hp); hp.connect(lp); lp.connect(g); g.connect(o.destination); s.start(0, 12); const r = await o.startRendering(); const d = r.getChannelData(0);
          let pk = 0, sq = 0; for (let i = 0; i < d.length; i++) { const a = Math.abs(d[i]); if (a > pk) pk = a; sq += d[i] * d[i]; } return JSON.stringify({ pk, rms: Math.sqrt(sq / d.length) }) })()""")
        off = json.loads(off)
        ck('from the phone: thin and quiet, but there', 0.002 < off['rms'] < 0.05 and off['pk'] < 0.4, str(off))
        m = J("({ mode: GLRADIO.stand().mode, out: GLRADIO.S.A.out.gain.value, lp: GLRADIO.S.A.lp.frequency.value })")
        ck('on foot the radio plays from the phone', m['mode'] == 'handy' and m['lp'] < 4500, str(m))
    pic('01_sender', True)
    # through the dial with R, back with Shift+R, off after the last one
    ids = []
    for _ in range(6):
        E("GLRADIO.next()"); steps(0.25); ids.append(E("GLRADIO.cur()"))
    ck('R goes through the stations and switches off after the last', ids == ['kirmes', 'klassik', 'zweitakt', 'blasius', 'neon', None], str(ids))
    ck('off: the display says so, the choice is saved', E("GLSTATE.radio") == 0 and 'Radio aus' in E("document.getElementById('glradio').textContent"))
    E("GLRADIO.prev()"); steps(0.25)
    ck('Shift+R: the one before', E("GLRADIO.cur()") == 'neon' and E("GLSTATE.radio") == 6)
    pg.keyboard.press('r'); steps(0.25)
    a = E("GLRADIO.cur()")
    pg.keyboard.press('Shift+R'); steps(0.25)
    ck('the keys: R steps on (to off), Shift+R back', a is None and E("GLRADIO.cur()") == 'neon', str(a))
    # the list: R held (here: opened), a click tunes
    E("GLRADIO.list(true)"); steps(0.25)
    rows = E("document.querySelectorAll('#glradio .rl button').length")
    pic('02_liste')
    pg.click('#glradio .rl button[data-s="klassik"]')
    steps(0.5)
    s = ST()
    ck('the list shows all stations and „aus“; a click tunes', rows == 7 and s['id'] == 'klassik' and s['liste'], str({k: s[k] for k in ('id', 'liste', 'k', 'titel')}))
    rec = J("({ t: GLRADIO.now().titel, el: !!GLRADIO.S.el, src: GLRADIO.S.el ? GLRADIO.S.el.a.src : '' })")
    ck('the classical station plays a public-domain recording of the record player\'s shelf', bool(rec['t']) and (not ton or ('snd/music/' in rec['src'])), str(rec))
    E("GLRADIO.list(false)")
    # ---------------- the programme advances ----------------
    E("GLRADIO.tune('kirmes')"); steps(0.5)
    for _ in range(26):
        E("if (GLRADIO.S.item && GLRADIO.S.item.k !== 'wort' ) GLRADIO.S.item.left = Math.min(GLRADIO.S.item.left || 0, 0.3); if (GLRADIO.S.item && GLRADIO.S.item.k === 'lade') GLRADIO.S.item.t = 99")
        steps(4)
    s = ST()
    arts = [q['art'] or q['k'] for q in s['log']]
    ck('the programme goes on: pieces, the presenter, an ident, an advert', s['count']['musik'] >= 4 and s['count']['wort'] >= 3
       and 'musik' in arts and any(a in arts for a in ('mod', 'kenn', 'werb', 'gruss', 'news')), str(s['count']) + ' ' + str(arts))
    sub = E("(document.getElementById('glfunk') || document.getElementById('glsub')).textContent")
    print('the radio\'s line now:', sub[:90], flush=True)
    # ---------------- the police report of the player's own deeds ----------------
    E("GLRADIO.tune('grenzland')"); steps(1)
    E("GAME.go('dorf')"); steps(1)
    E("GLFAHNDUNG.tat('autoklau', { force: [{ name: 'Testzeuge', knows: false }], quiet: true })")
    p0 = ST()
    ok = until("GLRADIO.stand().log.some(q => q.art === 'polizei' && /Polizeibericht/.test(q.text))", 70)
    s = ST()
    pol = [q['text'] for q in s['log'] if q['art'] == 'polizei']
    ck('a deed somebody saw: the radio tells it at once – the police report', p0['pend'] == 1 and ok and any('Fahrzeug' in t for t in pol) and s['pend'] == 0, str(pol)[:300])
    steps(0.25)
    sub = E("(document.getElementById('glfunk') || document.getElementById('glsub')).textContent")
    ck('as a line on the screen, with the station\'s name', 'Radio Grenzland' in sub and not E("(document.getElementById('glfunk') || document.getElementById('glsub')).hidden"), sub[:120])
    pic('03_polizeibericht', True)
    ok = until("GLRADIO.stand().log.some(q => /sucht Zeugen/.test(q.text))", 40)
    ck('„Die Polizei sucht Zeugen …“ while one is wanted', ok, str([q['text'][:50] for q in ST()['log'][-4:]]))
    # three stars: a special report over the music
    until("GLRADIO.stand().k === 'musik'", 60)
    E("GLRADIO.S.item.left = 60; GLFAHNDUNG.tat('einbruch', { force: [{ name: 'Streife', police: true }], quiet: true }); GLFAHNDUNG.tat('einbruch', { force: [{ name: 'Streife', police: true }], quiet: true })")
    stars = E("GLLOGIK.stars(GLSTATE.W)")
    ok = until("GLRADIO.stand().log.some(q => q.art === 'eil')", 20)
    s = ST()
    ck('three stars: the music is interrupted by a special report', stars >= 3 and ok, str(stars) + ' ' + str([q['art'] for q in s['log'][-5:]]))
    E("GLFAHNDUNG.clear()")
    # ---------------- reception ----------------
    E("GLRADIO.tune('blasius'); GAME.view(4, 15, 0, 180, 0)"); steps(1)
    n = E("GLRADIO.stand().sig")
    E("GAME.view(300, -900, 0, 180, 0)"); steps(1)
    f = E("GLRADIO.stand().sig")
    ck('the station from across the border: noise in the garden, clear in the south', n < 0.3 and f > 0.95, f'{n:.2f} {f:.2f}')
    E("GAME.go('garten')"); steps(1)
    # ---------------- 1989 ----------------
    E("GLRADIO.tune('zweitakt'); GL89.enter({}).then(() => { window.__e89 = 1 }); 0")
    for _ in range(20):
        steps(0.5); time.sleep(0.2)
        if E("window.__e89 === 1"): break
    steps(0.5)
    s = J("({ era: GLSTATE.era, n: GLRADIO.stations().map(s => s.id), cur: GLRADIO.cur(), radio: GLSTATE.radio, txt: document.getElementById('glradio').textContent })")
    ck('1989: the dial shows the stations of the time, the set plays the first of them', s['era'] == '1989' and s['n'] == ['republik', 'impuls', 'west']
       and s['cur'] == 'republik' and s['radio'] == 4 and 'Radio Republik' in s['txt'], str(s))
    pic('04_1989', True)
    for _ in range(40):
        if E("GLRADIO.stand().log.some(q => q.id === 'republik' && q.art === 'news' && /Reiseregelung|Volkspolizei|Zentralkomitee|Aufruf/.test(q.text))"): break
        E("if (GLRADIO.S.item && GLRADIO.S.item.k !== 'wort') GLRADIO.S.item.left = Math.min(GLRADIO.S.item.left || 0, 0.3); if (GLRADIO.S.item && GLRADIO.S.item.k === 'lade') GLRADIO.S.item.t = 99")
        steps(3)
    nw = [q['text'] for q in ST()['log'] if q['id'] == 'republik' and q['art'] == 'news']
    ck('the news of 10 November 1989', any(('Reiseregelung' in t or 'Volkspolizei' in t or 'Zentralkomitee' in t or 'Aufruf' in t) for t in nw), str(nw)[:300])
    pic('05_1989_nachrichten')
    E("GLRADIO.next()"); steps(0.25); a = E("GLRADIO.cur()")
    E("GLRADIO.next()"); steps(0.5); w = ST()
    ck('the youth station, and the Western one with noise', a == 'impuls' and w['id'] == 'west' and w['sig'] < 0.95 and w['mode'] == 'koffer', str({k: w[k] for k in ('id', 'sig', 'mode')}))
    E("GLHANDY.toggle()"); steps(0.25)
    ck('1989 nobody has a phone', not E("GLHANDY.isOpen()"))
    E("GL89.leave().then(() => { window.__e89 = 2 }); 0")
    for _ in range(20):
        steps(0.5); time.sleep(0.2)
        if E("window.__e89 === 2"): break
    steps(0.5)
    s = J("({ era: GLSTATE.era, cur: GLRADIO.cur(), n: GLRADIO.stations().length, notes: GLHANDY.S.notes.map(n => n.titel) })")
    ck('back today: one\'s own station again, and a note on what the radio of 1989 reported', s['era'] == 'heute' and s['cur'] == 'zweitakt' and s['n'] == 6
       and any('10. November 1989' in t for t in s['notes']), str(s))
    # ---------------- the phone ----------------
    E("KERN.on('grenzland:ziel', d => { window.__ziel = d }); 0")
    pg.keyboard.press('t'); steps(0.5)
    ck('T takes the phone out', E("GLHANDY.isOpen()") and E("!document.getElementById('glhandy').hidden"))
    tabs = {}
    for k in ['sms', 'chat', 'feed', 'bank', 'notiz', 'kamera', 'radio']:
        pg.click(f'#glhandy .hn button[data-tab="{k}"]'); steps(0.25)
        tabs[k] = J("({ t: document.getElementById('hytitel').textContent, n: document.getElementById('hybody').textContent.length, sel: document.querySelector('#glhandy .hn button[aria-selected=\"true\"]').dataset.tab })")
        if k in ('chat', 'feed', 'radio'): pic('06_handy_' + k)
    ck('every tab opens with its content', all(tabs[k]['sel'] == k and tabs[k]['n'] > 20 for k in tabs)
       and tabs['chat']['t'] == 'Ratscher aktuell' and tabs['bank']['t'] == 'Bank', str(tabs))
    chat = J("GLSTATE.feed.filter(q => q.k === 'chat').map(q => q.wer)")
    ck('the village chat has a past and goes on', len(chat) >= 6 and 'Ingrid' in chat, str(chat))
    # a patrol car in the village: the chat reacts
    E("GLHANDY.S.evT = {}; KERN.emit('grenzland:streife', { n: 1 })"); steps(14)
    ch = J("GLSTATE.feed.filter(q => q.k === 'chat').slice(-3).map(q => q.text)")
    ck('a patrol car in the village: the chat talks about it', any(('Streifenwagen' in t or 'Polizei' in t or 'Blaulicht' in t) for t in ch), str(ch))
    pg.click('#glhandy .hn button[data-tab="feed"]'); steps(0.25)
    pg.click('#glhandy .po button[data-ort]'); steps(0.25)
    z = J("window.__ziel || null")
    ck('a post sets a marker', z and len(z['pos']) == 2 and z['name'], str(z))
    # a message arrives and is read
    pg.keyboard.press('Escape'); steps(0.25)
    closed = not E("GLHANDY.isOpen()")
    E("GLHANDY.sms('Jule', 'Staumauer, 20 Uhr. Bring Gemisch mit.')"); steps(0.25)
    u1 = E("GLHANDY.unread()")
    E("GLHANDY.open()"); steps(0.5)
    v = J("({ tab: GLHANDY.S.tab, neu: document.querySelectorAll('#glhandy .msg.neu').length, txt: document.getElementById('hybody').textContent, unread: GLHANDY.unread(), saved: GLSTATE.sms.length })")
    ck('Esc puts the phone away; a message arrives, is shown as new, and is read', closed and u1 == 1 and v['tab'] == 'sms' and v['neu'] == 1 and 'Staumauer' in v['txt'] and v['unread'] == 0 and v['saved'] == 1, str(v)[:240])
    pic('07_handy_nachricht')
    # the bank
    E("GLSTATE.earn(50, 'Kurierlohn')"); pg.click('#glhandy .hn button[data-tab="bank"]'); steps(0.5)
    bk = E("document.getElementById('hybody').textContent")
    ck('the bank shows the money and its movements', 'Kurierlohn' in bk and '+50 €' in bk and (str(E("GLSTATE.geld")) + ' €') in bk, bk[:160])
    # a note with its sources
    E("GLHANDY.unlock('sushi', true)"); pg.click('#glhandy .hn button[data-tab="notiz"]'); steps(0.25)
    pg.click('#glhandy .nt >> nth=0'); steps(0.25)
    nt = J("({ t: document.getElementById('hytitel').textContent, links: [...document.querySelectorAll('#glhandy .nz a')].map(a => a.href), n: GLHANDY.S.notes.length })")
    ck('notes with their sources as links', nt['n'] >= 2 and len(nt['links']) >= 3 and all(h.startswith('https://') for h in nt['links']), str(nt)[:200])
    pic('08_handy_notiz')
    # the camera
    E("GAME.view(4, 15, 0, 90, 0)"); steps(0.5)
    E("window.__fotos = 0; GLHANDY.kamera({ ziel: [KERN.where()[0] + 12, KERN.where()[1]], r: 30, n: 2, name: 'Testmotiv', done: () => { window.__fotos = 1 } }); GLHANDY.open('kamera')"); steps(0.5)
    c0 = J("({ cam: !document.getElementById('glcam').hidden, handy: GLHANDY.isOpen(), gut: document.getElementById('glcam').classList.contains('gut'), t: document.getElementById('glcam').textContent })")
    pic('09_kamera', True)
    pg.click('#glcam button[data-c="foto"]'); steps(0.25)
    c1 = J("GLHANDY.cam() ? GLHANDY.cam().got : -1")
    E("GAME.view(4, 15, 0, 270, 0)"); steps(0.5)
    back = E("GLHANDY.fotoUI()")
    E("GAME.view(4, 15, 0, 90, 0)"); steps(0.5)
    pg.keyboard.press('e'); steps(0.5)
    c2 = J("({ cam: GLHANDY.cam() === null, done: window.__fotos, shown: !document.getElementById('glcam').hidden })")
    ck('the camera: a viewfinder, the target in the picture, it counts to the end', c0['cam'] and not c0['handy'] and c0['gut'] and 'FOTO 0/2' in c0['t'] and c1 == 1
       and back is False and c2['cam'] and c2['done'] == 1 and not c2['shown'], str(c0) + ' ' + str(c1) + ' ' + str(back) + ' ' + str(c2))
    # ---------------- on a phone's screen ----------------
    fits = {}
    for name, (w, h) in {'hochkant': (390, 780), 'quer': (780, 390)}.items():
        pg.set_viewport_size({'width': w, 'height': h}); time.sleep(1.5); steps(0.5)
        E("GLHANDY.open('chat')"); steps(0.5)
        r = J("(() => { const r = document.getElementById('glhandy').getBoundingClientRect(), t = document.querySelector('#glhandy .hn').getBoundingClientRect(); return { l: r.left, t: r.top, r: r.right, b: r.bottom, tabs: t.bottom, w: innerWidth, h: innerHeight } })()")
        fits[name] = r['l'] >= -1 and r['t'] >= -1 and r['r'] <= r['w'] + 1 and r['b'] <= r['h'] + 1 and r['tabs'] <= r['h'] + 1 and (r['r'] - r['l']) > 250
        print(name, r, flush=True)
        pic('10_handy_' + name)
        E("GLHANDY.close(); GLRADIO.show(true)"); steps(0.25)
        rb = J("(() => { const r = document.getElementById('glradio').getBoundingClientRect(); return { l: r.left, r: r.right, t: r.top, w: innerWidth } })()")
        fits[name + '_radio'] = rb['l'] >= -1 and rb['r'] <= rb['w'] + 1
        pic('11_sender_' + name)
    ck('the phone and the station display fit a phone\'s screen, portrait and landscape', all(fits.values()), str(fits))
    pg.set_viewport_size({'width': 1100, 'height': 680}); time.sleep(1); steps(0.5)
    # ---------------- the end ----------------
    E("GLHANDY.open('radio')"); steps(0.5)
    E("GRENZLAND.stop()"); steps(0.5)
    time.sleep(0.6)
    s = J("({ on: GLSTATE.on, cur: GLRADIO.cur(), st: GLRADIO.stand(), handy: document.getElementById('glhandy').hidden, cam: document.getElementById('glcam').hidden, "
          "bar: document.getElementById('glradio').hidden, open: GLHANDY.isOpen(), el: !!GLRADIO.S.el, prog: Object.keys(GLRADIO.S.prog).length })")
    ck('after „Beenden“ the radio is silent and the phone gone', not s['on'] and s['cur'] is None and not s['st']['ton'] and not s['st']['src'] and s['st']['jobs'] == 0
       and not s['st']['bufs'] and s['handy'] and s['cam'] and s['bar'] and not s['open'] and not s['el'] and s['prog'] == 0, str(s)[:300])
    E("GLRADIO.next()"); steps(0.5)
    ck('and stays off outside the mode', E("GLRADIO.cur()") is None and not E("GLRADIO.stand().ton"), str(E("GLRADIO.cur()")))
    okgl, rep = lib.check_gl(pg)
    ck('at most 16 textures per shader program, none broken', okgl, str({k: rep[k] for k in ('maxFrag', 'maxVert')}))
    ck.errors(errs)
    ck.done()
