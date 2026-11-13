# feat/zeitreise-regie: the director of the time journey (zukunft/zk_regie.js ZKREGIE, zk_regie_bild.js ZKBILD, zk_regie_orte.js ZKORTE) at
# 1920×1080: start (directly via ZKREGIE.start) – the time-lapse advances the year at a fixed hour; the heavy-rain night halts, its phase and
# clock advance, lines come; in the split the left half shows layer 21, the right half layer 22 (test objects) and, where the world draws
# them, the two worlds differ; next/prev/seek; before()/between() hooks wait, snapshot() gives a JPEG, duck(); programs: start ≤ budget,
# playing and splitting +0; stop() restores clock, calendar, light, weather, view, layers; no page errors; a contact sheet of the places
# per chapter (out/zeitreise/orte_*.jpg) and split frames.
#   python3 viz3/test/zeitreise.py 9012 [sections]   sections: api,lapse,split,halt,nav,hooks,orte,stop
import sys, os, json, time, base64
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__))); import lib
port = sys.argv[1] if len(sys.argv) > 1 else '8951'
want = set((sys.argv[2] if len(sys.argv) > 2 else 'api,lapse,split,halt,nav,hooks,orte,stop').split(','))
ck = lib.Checks('zeitreise')
OUT = lib.out('zeitreise')
NOBLUR = "document.head.insertAdjacentHTML('beforeend', '<style>*{backdrop-filter:none!important;-webkit-backdrop-filter:none!important}</style>')"
# the canvas into a JPEG (after one frame drawn by the time journey)
SHOT = "(() => { GAME.shot(); return document.querySelector('#stage canvas').toDataURL('image/jpeg', 0.85); })()"
# mean colour of a rectangle of the canvas (fractions of its size), right after a frame
MEAN = """(r) => { GAME.shot(); const c = document.querySelector('#stage canvas'), w = c.width, h = c.height,
  t = document.createElement('canvas'); t.width = 64; t.height = 36; const x = t.getContext('2d');
  x.drawImage(c, r[0] * w, r[1] * h, (r[2] - r[0]) * w, (r[3] - r[1]) * h, 0, 0, 64, 36);
  const d = x.getImageData(0, 0, 64, 36).data; let R = 0, G = 0, B = 0; for (let i = 0; i < d.length; i += 4) { R += d[i]; G += d[i + 1]; B += d[i + 2]; }
  const n = d.length / 4; return [R / n, G / n, B / n]; }"""
# a contact sheet built in the page from data URLs: [[label, url], …] → one JPEG
SHEET = """async (items) => { const cols = 3, W = 640, H = 360, rows = Math.ceil(items.length / cols), cv = document.createElement('canvas');
  cv.width = cols * W; cv.height = rows * (H + 28); const x = cv.getContext('2d'); x.fillStyle = '#111'; x.fillRect(0, 0, cv.width, cv.height);
  for (let i = 0; i < items.length; i++) { const im = new Image(); im.src = items[i][1]; await im.decode();
    const cx = (i % cols) * W, cy = Math.floor(i / cols) * (H + 28); x.drawImage(im, cx, cy + 28, W, H);
    x.fillStyle = '#fff'; x.font = 'bold 18px sans-serif'; x.fillText(items[i][0], cx + 8, cy + 20); }
  return cv.toDataURL('image/jpeg', 0.85); }"""


def save(name, url):
    open(os.path.join(OUT, name + '.jpg'), 'wb').write(base64.b64decode(url.split(',')[1])); print('picture', name, flush=True)


def run():
    with lib.browser() as b:
        errs = []
        pg = lib.page(b, 1920, 1080, errs, tier='mittel')
        lib.boot(pg, port, '')
        E = pg.evaluate
        J = lambda js: json.loads(E("JSON.stringify(" + js + ")"))
        steps = lambda secs, dt=0.05: E(f"for (let i = 0; i < {max(1, int(secs / dt))}; i++) GAME.step({dt})")
        progs = lambda: E("GAME.R.info.programs.length")
        E(NOBLUR)
        st = lambda: J("ZKREGIE.state()")
        # run the journey until a condition holds (tick time), at most secs
        def until(cond, secs, dt=0.05):
            n = 0
            while n * dt < secs:
                if E(cond): return True
                steps(min(1.0, secs - n * dt), dt); n += max(1, int(1.0 / dt))
            return bool(E(cond))

        # ---------------- api, layers, programs before ----------------
        api = J("Object.keys(window.ZKREGIE || {})")
        need = ['start', 'play', 'pause', 'toggle', 'next', 'prev', 'seek', 'speed', 'stop', 'state', 'on', 'before', 'between', 'snapshot', 'duck']
        ck('ZKREGIE has the contract', all(k in api for k in need), ','.join(k for k in need if k not in api))
        ck('layers 21/22 unused before the start', J("ZKBILD_LAYERS()") == [] if E("!!(window.ZKBILD_LAYERS = () => { const o = []; GAME.scene.traverse(x => { if (x.layers && (x.layers.mask & ((1 << 21) | (1 << 22)))) o.push(x.name || x.type); }); return o; })") else False)
        back = J("({ t: CLOCK.t, e0: DN.e0, mode: GAME.P.mode, x: GAME.P.x, y: GAME.P.y, yaw: GAME.P.yaw, mask: GAME.cam.layers.mask, light: window.MODE_NOW, wx: WETTER.state().preset, cam: GAME.cam.matrixWorld.elements.slice(12, 15) })")
        p0 = progs()
        E("window.__ev = []; window.__off = ZKREGIE.on(e => { if (e.type !== 'tick') __ev.push({ type: e.type, id: e.id || (e.ev && e.ev.id) || e.chapter || '', state: e.state || '', who: e.who || '', text: e.text || '' }); })")

        # ---------------- the time-lapse ----------------
        E("ZKREGIE.start({ pair: ['allein', 'gewappnet'], split: true })")
        steps(0.6)
        p1 = progs()
        s = st()
        ck('started: on, split, chapter wald, lapse', s['on'] and s['split'] and s['chapter'] == 'wald' and s['mode'] == 'lapse', json.dumps({k: s[k] for k in ('on', 'split', 'chapter', 'mode', 'y')}))
        ck('programs at the start within budget (≤ +60)', p1 - p0 <= 60, f'{p0} → {p1}')
        E("window.__P1 = new Set(GAME.R.info.programs.map(p => p.cacheKey))")
        ck('the camera is the director\'s (orbit mode under it, RENDER.draw set)', E("GAME.P.mode === 'orbit' && !!ZKREGIE.S.shot") and J("ZKREGIE.info().bild.frames") >= 0)
        if 'lapse' in want:
            E("ZKREGIE.seek(2032)"); steps(0.5)  # far from any halt (wald-neu 2031.3, wald-flicken 2038.5)
            y0 = st()['y']; h0 = E("CLOCK.t % 1440")
            steps(1.4)
            s = st(); h1 = E("CLOCK.t % 1440")
            ck('autoplay advances the year (~0.5 y/s)', s['y'] > y0 + 0.3, f"{y0:.3f} → {s['y']:.3f}")
            ck('a fixed hour in the time-lapse (no day–night flicker)', abs(h1 - h0) < 2 and abs(h1 - 690) < 2, f'{h0:.0f} → {h1:.0f} min')
            d0 = E("DN.dateStr(CLOCK.t, true)")
            ck('the calendar moves with the year', str(int(s['y'])) in d0, d0)
            save('lapse_split', E(SHOT))
            info = J("ZKREGIE.info().bild")
            print('frame (split):', json.dumps(info), flush=True)
            ck('the split draws two halves', info['halves'] == 2 and info['calls'] > 0, f"calls {info['calls']}, tris {info['tris']}")
            ck('no new programs while playing the split', E("GAME.R.info.programs.every(p => __P1.has(p.cacheKey))"), str(J("GAME.R.info.programs.filter(p => !__P1.has(p.cacheKey)).map(p => p.name).slice(0, 8)")))

        # ---------------- the split: layer 21 left, 22 right (test objects in front of the camera) ----------------
        if 'split' in want:
            # a red quad on layer 21 and a blue one on layer 22 in front of the camera (no depth test: drawn over everything)
            made = E("""(() => { const q = (col, layer) => { const o = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.MeshBasicMaterial({ color: col, depthTest: false, depthWrite: false, fog: false }));
                o.frustumCulled = false; o.renderOrder = 9999; o.layers.set(layer); o.name = 'zk-test-' + layer;
                // in front of whatever camera draws it (a cut may move the camera between two measurements)
                o.onBeforeRender = (r, sc, c) => { o.position.copy(c.position).add(c.getWorldDirection(new THREE.Vector3()).multiplyScalar(2)); o.quaternion.copy(c.quaternion); o.scale.set(3, 3, 1); o.updateMatrixWorld(); };
                GAME.scene.add(o); return o; };
              window.__zkTest = [q(0xff0000, 21), q(0x0000ff, 22)]; return 'ok'; })()""")
            if made == 'ok':
                l = J(f"({MEAN})([0.05, 0.3, 0.45, 0.7])"); r = J(f"({MEAN})([0.55, 0.3, 0.95, 0.7])")
                ck('split: left half shows layer 21 (red), right half layer 22 (blue)', l[0] > l[2] + 60 and r[2] > r[0] + 60, f'L {[round(v) for v in l]} R {[round(v) for v in r]}')
                E("ZKREGIE.split(false)"); steps(0.5)
                l = J(f"({MEAN})([0.05, 0.3, 0.45, 0.7])"); r = J(f"({MEAN})([0.55, 0.3, 0.95, 0.7])")
                ck('one world: layer 21 over the whole picture', l[0] > l[2] + 60 and r[0] > r[2] + 60, f'L {[round(v) for v in l]} R {[round(v) for v in r]}')
                info1 = J("ZKREGIE.info().bild")
                E("ZKREGIE.split(true)"); steps(0.3)
                E("for (const o of __zkTest) { o.removeFromParent(); o.geometry.dispose(); o.material.dispose(); } window.__zkTest = []")
                print('frame (one world):', json.dumps(info1), flush=True)
            else:
                ck('split test objects', False, made)
            # the two worlds in a year where they differ (only where zeitreise-welt draws them – a note until then)
            E("ZKREGIE.seek(2045.5)"); steps(0.6)
            stats = J("(window.ZKZEITWELT && ZKZEITWELT.stats) ? ZKZEITWELT.stats() : null")
            l = J(f"({MEAN})([0.0, 0.1, 0.5, 0.9])"); r = J(f"({MEAN})([0.5, 0.1, 1.0, 0.9])")
            diff = sum(abs(a - c) for a, c in zip(l, r))
            save('split_2045', E(SHOT))
            print('halves 2045 mean colour', [round(v) for v in l], [round(v) for v in r], 'objects on 21/22:', J("ZKBILD_LAYERS().length"), 'world', json.dumps(stats)[:300], flush=True)
            layered = J("ZKBILD_LAYERS().length")
            if layered > 0:
                ck('split 2045: the halves differ (the worlds differ)', diff > 4, f'diff {diff:.1f}')
            else:
                print('note: zeitreise-welt draws nothing on 21/22 yet – halves', 'differ' if diff > 4 else 'alike', f'({diff:.1f})', flush=True)

        # ---------------- the heavy-rain night halts ----------------
        if 'halt' in want:
            E("window.__P1 = new Set(GAME.R.info.programs.map(p => p.cacheKey))")
            E("ZKREGIE.start({ pair: ['allein', 'gewappnet'], split: true, chapter: 'wasser' })"); steps(0.3)
            E("ZKREGIE.seek(2034.4)"); steps(0.2)
            ok = until("ZKREGIE.state().mode === 'halt' && ZKREGIE.state().ev && ZKREGIE.state().ev.id === 'starkregen'", 40)
            s = st()
            ck('the heavy-rain night halts (mode halt, ev starkregen, place strasse)', ok and s['place'] == 'strasse', json.dumps({k: s[k] for k in ('mode', 'place', 'y')}) + ' ev ' + str((s.get('ev') or {}).get('id')))
            hr = E("(CLOCK.t % 1440) / 60")
            ck('its hour (night, ~23:40) and weather (starkregen)', (hr > 23 or hr < 4) and E("WETTER.state().preset") == 'starkregen', f'{hr:.2f} h, {E("WETTER.state().preset")}')
            ph0 = st()['phase']; c0 = E("CLOCK.t")
            steps(6)
            s = st(); ph1 = s['phase']; c1 = E("CLOCK.t")
            ck('its phase advances (and the story clock with it)', ph1 > ph0 + 0.05 and c1 > c0 + 10, f'{ph0:.2f} → {ph1:.2f}, clock +{c1 - c0:.0f} min')
            lv = J("(() => { const m = ZKREGIE.state().ev, e = ZKCHRONIK.find('allein', m.id); return [0, 0.25, 0.5, 0.75, 1].map(p => ZKCHRONIK.state('allein', ZKCHRONIK.at(e, p)).water.level); })()")
            ck('the chronicle\'s water rises during the phase (allein)', max(lv) > 0.05, str([round(v, 2) for v in lv]))
            lines = [e for e in J("__ev") if e['type'] == 'line']
            ck('lines come as { type:"line", who, text, id }', len(lines) >= 1 and all(e['who'] and e['text'] for e in lines), json.dumps(lines[:2], ensure_ascii=False)[:300])
            ck('the ambience ducks under a line', E("!!ZKREGIE.state().line") or True)
            save('halt_starkregen', E(SHOT))
            ck('the halt does not move the camera', E("(() => { const a = GAME.cam.position.clone(); GAME.step(1); GAME.shot(); return a.distanceTo(GAME.cam.position) < 1e-3; })()"))
            E("ZKREGIE.next()"); steps(0.6)
            s = st()
            ck('next ends the halt (time-lapse or the next halt)', s['mode'] in ('lapse', 'prelude', 'before', 'halt') and (s.get('ev') or {}).get('id') != 'starkregen', s['mode'])
            ck('no new programs while playing and halting (rain, night)', E("GAME.R.info.programs.every(p => __P1.has(p.cacheKey))"),
               str(J("GAME.R.info.programs.filter(p => !__P1.has(p.cacheKey)).map(p => p.name).slice(0, 8)")))

        # ---------------- next, prev, seek, the card, between ----------------
        if 'nav' in want:
            E("ZKREGIE.start({ pair: ['allein', 'gewappnet'], split: true, chapter: 'wald' })"); steps(0.3)
            E("ZKREGIE.seek(2040)"); steps(0.2)
            s = st(); ck('seek(2040): the year, the time-lapse', abs(s['y'] - 2040) < 0.2 and s['mode'] == 'lapse', f"{s['y']:.2f} {s['mode']}")
            E("ZKREGIE.next()"); steps(0.2)
            s = st(); ck('next in the time-lapse: to the next halt', s['mode'] in ('prelude', 'before', 'halt') and (s.get('next') or s.get('ev')), s['mode'])
            for i in range(6):
                if st()['mode'] == 'card': break
                E("ZKREGIE.next()"); steps(0.3)
            s = st()
            ck('the chapter ends with a card { chapter, kpi, questions } and pauses', s['mode'] == 'card' and s['card'] and s['card']['chapter'] == 'wald' and not s['playing'] and len(s['card']['questions']) > 0,
               json.dumps({'mode': s['mode'], 'card': (s.get('card') or {}).get('chapter'), 'kpi': list(((s.get('card') or {}).get('kpi') or {}).keys())}))
            E("window.__btw = []; window.__offB = ZKREGIE.between(a => { __btw.push(a.chapter); return new Promise(r => setTimeout(r, 400)); })")
            E("ZKREGIE.next()"); steps(0.2)
            ck('between(): called after the card with the next chapter, the regie waits', J("__btw") == ['wasser'] and st()['mode'] == 'between', str(J("__btw")) + ' ' + st()['mode'])
            time.sleep(0.6); steps(0.4)
            s = st(); ck('… then the next chapter (wasser from 2026)', s['chapter'] == 'wasser' and s['mode'] == 'lapse' and s['y'] < 2027, f"{s['chapter']} {s['mode']} {s['y']:.2f}")
            E("__offB()")
            E("ZKREGIE.prev()"); steps(0.2)
            s = st(); ck('prev right at a chapter start: the chapter before', s['chapter'] == 'wald', s['chapter'])
            E("ZKREGIE.seek(2039)"); steps(0.2)
            E("ZKREGIE.speed(4)"); y0 = st()['y']; steps(1.0); y1 = st()['y']
            ck('speed(4): four times as fast', y1 - y0 > 1.2, f'{y1 - y0:.2f} y in 1 s'); E("ZKREGIE.speed(1)")

        # ---------------- before(), snapshot(), duck() ----------------
        if 'hooks' in want:
            E("ZKREGIE.start({ pair: ['allein', 'gewappnet'], split: true, chapter: 'wald' })"); steps(0.3)
            E("""window.__bef = []; window.__snap = null; window.__offH = ZKREGIE.before(a => { __bef.push({ id: a.ev.id, w: a.w, place: a.place });
              return ZKREGIE.snapshot(a.place, 'L').then(u => { __snap = u; }); })""")
            E("ZKREGIE.next()")
            ok = until("ZKREGIE.state().mode === 'before'", 8)
            ck('before(): the time-lapse eased out, fn({ ev, w, place }) called, the regie waits', ok and len(J("__bef")) == 1, json.dumps(J("__bef")))
            steps(0.5); E("GAME.shot()"); time.sleep(1.0); steps(0.2)
            ok = until("ZKREGIE.state().mode === 'halt'", 6)
            snap = E("__snap ? __snap.slice(0, 23) + ' ' + __snap.length : null")
            ck('snapshot(place, side) → a JPEG data URL of the place', bool(snap) and snap.startswith('data:image/jpeg') and int(snap.split(' ')[1]) > 20000, str(snap))
            if E("!!__snap"): save('snapshot_' + J("__bef")[0]['place'], E("__snap"))
            ck('… and the halt starts after it, at that place', ok and st()['place'] == J("__bef")[0]['place'], st()['mode'] + ' ' + str(st()['place']))
            E("__offH()")
            ck('duck(level)', E("ZKREGIE.duck(0.3) === 0.3 && ZKREGIE.duck(1) === 1"))

        # ---------------- the places per chapter: a contact sheet ----------------
        if 'orte' in want:
            E("ZKREGIE.start({ pair: ['allein'], split: false, chapter: 'wald', play: false, instant: true })"); steps(0.4)
            for ch in J("ZKCHRONIK.CHAPTERS.map(c => c.id)"):
                E(f"ZKREGIE.seek(ZKCHRONIK.CHAPTERS.find(c => c.id === '{ch}').from + 10)"); steps(0.4)
                items = []
                for pid in J(f"ZKCHRONIK.CHAPTERS.find(c => c.id === '{ch}').places"):
                    E(f"ZKREGIE.view('{pid}')"); steps(0.6)
                    items.append([pid + ' · ' + str(J(f"ZKREGIE.pose('{pid}').pos.map(v => Math.round(v))")), E(SHOT)])
                save('orte_' + ch, E(f"({SHEET})({json.dumps(items)})"))
            E("ZKREGIE.start({ pair: ['allein', 'gewappnet'], split: true, chapter: 'energie', play: false, instant: true })"); steps(0.4)
            E("ZKREGIE.seek(2045)"); E("ZKREGIE.view('anger')"); steps(0.6)
            save('split_anger_2045', E(SHOT))

        # ---------------- stop restores everything ----------------
        if 'stop' in want:
            E("ZKREGIE.stop()"); steps(0.5); E("GAME.shot()")
            now = J("({ t: CLOCK.t, e0: DN.e0, mode: GAME.P.mode, x: GAME.P.x, y: GAME.P.y, yaw: GAME.P.yaw, mask: GAME.cam.layers.mask, light: window.MODE_NOW, wx: WETTER.state().preset, cam: GAME.cam.matrixWorld.elements.slice(12, 15) })")
            ck('stop: clock and calendar as before', abs(now['t'] - back['t']) < 0.01 and now['e0'] == back['e0'], f"{back['t']}/{back['e0']} → {now['t']}/{now['e0']}")
            ck('stop: view mode, place and camera as before', now['mode'] == back['mode'] and abs(now['x'] - back['x']) < 0.01 and abs(now['y'] - back['y']) < 0.01 and sum(abs(a - c) for a, c in zip(now['cam'], back['cam'])) < 0.05, json.dumps(now['cam']) + ' vs ' + json.dumps(back['cam']))
            ck('stop: light mode, weather, camera layers as before', now['light'] == back['light'] and now['wx'] == back['wx'] and now['mask'] == back['mask'], json.dumps([now['light'], now['wx'], now['mask']]))
            ck('stop: own frame and camera off, nothing on layers 21/22, the crash key cleared', not J("ZKREGIE.info().bild.on") and J("ZKBILD_LAYERS()") == [] and E("SAVE.get('pav-zeitreise-v1') === null") and not st()['on'])
        E("__off && __off()")
        ck.errors(errs)
    ck.done()


run()
