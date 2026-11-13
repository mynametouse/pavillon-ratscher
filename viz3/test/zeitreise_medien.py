# feat/zeitreise-medien: the media of the futures (zukunft/zk_medien.js ZKMEDIEN) – phone transitions, radio, real videos.
#   python3 viz3/test/zeitreise_medien.py 9015    (1920x1080; a server on the port: bash tools/csp/start8951.sh style, or run.py --serve)
# Checks: the phone shows push / group chat with a photo / call / alert / no network at the scripted events (both worlds as two phones in the
# split), the radio plays between chapters (cues + ducking), the video card shows consent stills and NO request goes to YouTube before the click,
# the layers switch things off, no page errors; screenshots in out/zeitreise_medien/.
import sys, os, json, time
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__))); import lib
port = sys.argv[1] if len(sys.argv) > 1 else '8951'
ck = lib.Checks('zeitreise_medien')
OUT = lib.out('zeitreise_medien')
STUB = """
(() => {
  window.__zkNoSpeech = true;
  window.__ducks = [];
  if (!window.ZKREGIE) {
    window.ZKREGIE = { _b: null, _w: null,
      state: () => ({ split: true, pair: ['allein', 'gewappnet'], chapter: 'wald' }),
      before(f) { this._b = f; return () => {}; }, between(f) { this._w = f; return () => {}; }, on() { return () => {}; },
      snapshot: async () => null, duck(v) { window.__ducks.push(v); } };
    window.__stubRegie = true;
  }
  if (!window.WORKSHOP) {
    const slots = {};
    window.WORKSHOP = { slot(n) { return slots[n] || (slots[n] = Object.assign(document.createElement('div'), { id: 'stub-' + n })); },
      layers: { defs: [], define(d) { this.defs.push(d); } } };
    document.body.append(WORKSHOP.slot('card-extra'));
    document.body.append(WORKSHOP.slot('phone'));
    window.__stubWorkshop = true;
  }
  // a still costs a software-rendered frame here: the test takes the photos from a drawn stand-in (the photo flow is what is tested)
  if (window.ZKREGIE) window.ZKREGIE.snapshot = async () => { const c = document.createElement('canvas'); c.width = 320; c.height = 213; const g = c.getContext('2d'); g.fillStyle = '#6a8a5a'; g.fillRect(0, 0, 320, 213); return c.toDataURL('image/jpeg', 0.6); };
  ZKMEDIEN.attach();
  window.__seen = {};
  const sel = { push: '.zkm-pushc', art: '.zkm-art .h', photo: '.zkm-photo', alert: '.zkm-alert .sd', call: '.zkm-call .nm', nonet: '.zkm-status .net.off', radio: '.zkm-radio.on', callst: '.zkm-call .st' };
  new MutationObserver(() => {
    for (const k in sel) if (document.querySelector(sel[k])) window.__seen[k] = (window.__seen[k] || 0) + 1;
    if (document.querySelectorAll('.zkm-phone').length >= 2) window.__seen.two = 1;
    const a = document.querySelector('.zkm-alert'); if (a) window.__seen.alertText = a.textContent;
    const n = document.querySelector('.zkm-status .net.off'); if (n) window.__seen.netText = n.textContent;
  }).observe(document.body, { subtree: true, childList: true, attributes: true, characterData: true });
})()
"""

def run():
    with lib.browser() as b:
        errs = []
        pg = lib.page(b, 1920, 1080, errs)
        reqs = []
        pg.on('request', lambda r: reqs.append(r.url))
        lib.boot(pg, port, query='?nogeo=1')
        E = pg.evaluate
        J = lambda js: json.loads(E("JSON.stringify(" + js + ")"))
        ck('ZKMEDIEN is there', E("!!window.ZKMEDIEN && typeof ZKMEDIEN.play === 'function'"), '')
        E(STUB)
        st = J("ZKMEDIEN.state()")
        ck('attached to the regie contract (before/between) and defined three layers', st['regie'] and st['layersDef'], json.dumps({k: st[k] for k in ('regie', 'layersDef')}))
        # the script is keyed to real chronicle event ids
        ids = J("(() => { const ev = ZKCHRONIK.events('allein').map(e => e.id); return ZKMEDIEN.script.SCRIPT.flatMap(e => e.ids).filter(i => !ev.includes(i) && !['energie-wind-dreht'].includes(i)) })()")
        ck('every script id exists in the chronicle (allein)', ids == [], json.dumps(ids))
        L = J("ZKMEDIEN.lines().length")
        ck('voice lines listed for the recording pipeline', L > 10, str(L))

        def ev(i):
            return "ZKCHRONIK.events('allein').find(e => e.id === '%s')" % i
        def play(i, eid):
            E("window.__done = false")
            E("window.__t0 = performance.now(); window.__p = ZKMEDIEN.play('%s', ['allein','gewappnet'], %s).then(() => { window.__dt = performance.now() - __t0; window.__done = true })" % (i, ev(eid)))
        def waitfor(js, sec=25):
            t = time.time()
            while time.time() - t < sec:
                if E(js): return True
                time.sleep(0.4)
            return False
        time.sleep(15)  # the page settles after loading (textures); the cap of 29 s is real time
        seen = lambda k: E("!!__seen.%s" % k)
        def shot(name, k):
            waitfor("!!__seen.%s" % k, 40); pg.screenshot(path=os.path.join(OUT, name))
        # ---- beetle summer: push, article, group chat with a photo, live photo
        play('kaefer', 'wald-kaefer')
        shot('01_push.png', 'push')
        ck('beetle: push banner arrives', seen('push'), '')
        shot('02_artikel.png', 'art')
        ck('beetle: the article of the news portal shows', seen('art'), '')
        shot('03_gruppe.png', 'photo')
        ck('beetle: the village group with a photo bubble', seen('photo'), '')
        ck('beetle: a snapshot was asked for the photo (ZKREGIE.snapshot)', E("ZKMEDIEN.S.log.some(c => c.k === 'snapshot:waldrand')"), '')
        ck('beetle: the photo becomes alive (fills the picture, dissolves)', waitfor("ZKMEDIEN.S.log.some(c => c.k === 'livephoto')", 40), '')
        ck('beetle: the sequence ends', waitfor("window.__done === true", 90), '')
        ck('beetle: within the regie\'s 30 s', E("ZKMEDIEN.state().nom") < 33000, str(E('ZKMEDIEN.state().nom')))
        ck('beetle: phones removed after the sequence', waitfor("!document.querySelector('.zkm-phone.on')", 10), '')
        # ---- heavy-rain night: alert (distinct tone), two phones in the split, call
        play('regen', 'starkregen')
        shot('04_warnung.png', 'alert')
        ck('rain: the scenario alert, with sender and mark', seen('alert') and 'Warnsystem (Szenario)' in E("__seen.alertText") and 'mögliche Zukunft' in E("__seen.alertText"), '')
        ck('rain: two phones in the split (one per world)', seen('two'), '')
        ck('rain: the alert tone is its own (not the siren)', E("ZKMEDIEN.S.log.some(c => c.k === 'snd:alert')"), '')
        shot('05_anruf.png', 'call')
        ck('rain: group chat then Manfred calls', seen('call'), '')
        ck('rain: ducking was asked for during the call', waitfor("ZKMEDIEN.S.log.some(c => c.k === 'duck:0.25')", 30), '')
        ck('rain: the sequence ends', waitfor("window.__done === true", 90), '')
        ck('rain: within 30 s', E("ZKMEDIEN.state().nom") < 33000, str(E('ZKMEDIEN.state().nom')))
        # ---- blackout: alert, chat, no network, battery radio
        play('blackout', 'blackout')
        shot('06_kein_netz.png', 'nonet')
        ck('blackout: the network is gone (status „Kein Netz“)', seen('nonet') and E("ZKMEDIEN.state().noNet") and 'Kein Netz' in E("__seen.netText"), '')
        shot('07_batterieradio.png', 'radio')
        ck('blackout: the battery radio takes over', seen('radio') and E("ZKMEDIEN.S.log.some(c => c.k === 'battery')"), '')
        ck('blackout: the sequence ends', waitfor("window.__done === true", 90), '')
        ck('blackout: within 30 s', E("ZKMEDIEN.state().nom") < 33000, str(E('ZKMEDIEN.state().nom')))
        E("ZKMEDIEN.resetNet()")
        # ---- the radio between the chapters
        E("window.__r = ZKMEDIEN.radio({ from: 'wald', to: 'wasser' }).then(() => window.__rdone = true)")
        ck('radio: station box with jingle', waitfor("ZKMEDIEN.S.log.some(c => c.k === 'radio:wasser') && ZKMEDIEN.S.log.some(c => c.k === 'snd:jingle')", 30), '')
        time.sleep(1); pg.screenshot(path=os.path.join(OUT, '08_radio.png'))
        ck('radio: audio context started', E("!!ZKMEDIEN.S.ctx"), '')
        ck('radio: everything under it ducks', E("ZKMEDIEN.S.log.some(c => c.k === 'duck:0.2')") and E("__ducks.includes(0.2)") if E("window.__stubRegie") else True, '')
        ck('radio: ends by itself', waitfor("window.__rdone === true", 40), '')
        ck('radio: ducking released', E("ZKMEDIEN.S.log.filter(c => c.k === 'duck:1').length > 0"), '')
        # ---- real videos: nothing before the click
        n0 = len(reqs)
        N = E("ZKMEDIEN.videoCard(WORKSHOP.slot('card-extra'), 'energie')")
        ck('video card: consent stills for the chapter (2 videos)', N == 2, str(N))
        time.sleep(1)
        yt = [r for r in reqs if any(h in r for h in ('youtube', 'ytimg', 'googlevideo', 'ggpht', 'doubleclick'))]
        ck('NO request to YouTube/Google before the click', not yt, str(yt[:3]))
        ck('the still carries title, source and the data warning', 'Daten gehen an YouTube' in E("document.querySelector('.zkm-vid button').textContent")
           and 'tagesschau' in E("document.querySelector('.zkm-vid .so').textContent"), '')
        ck('plain link as fallback is there', 'youtube.com/watch?v=' in E("document.querySelector('.zkm-vid a').href"), '')
        pg.screenshot(path=os.path.join(OUT, '09_video_karte.png'))
        E("document.querySelector('.zkm-vid button').click()")
        time.sleep(1.5)
        ck('after the click only youtube-nocookie.com is embedded', E("document.querySelector('.zkm-vid iframe')?.src.startsWith('https://www.youtube-nocookie.com/embed/')"), '')
        # ---- layers
        E("ZKMEDIEN.layer('handy', false)")
        E("window.__d2 = false; ZKMEDIEN.play('kaefer', ['allein','gewappnet'], %s).then(() => window.__d2 = true)" % ev('wald-kaefer'))
        time.sleep(0.5)
        ck('layer „Handy-Meldungen“ off: no phone', E("__d2") and not E("document.querySelector('.zkm-phone')"), '')
        E("ZKMEDIEN.layer('handy', true)")
        E("ZKMEDIEN.layer('videos', false)")
        ck('layer „Videos“ off: the card stays empty', E("ZKMEDIEN.videoCard(WORKSHOP.slot('card-extra'), 'wald')") == 0, '')
        E("ZKMEDIEN.layer('videos', true)")
        ck.errors(errs)
        pg.close()
    ck.done()


run()
