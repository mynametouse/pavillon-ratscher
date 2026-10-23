# feat/einrichtung (Falko, 23.10.2026): the interiors of the garden buildings – the wooden house as an atelier (pottery, painting, rocking chair,
# sofa bed), the caravan mirrored (bed on the right when entering), interior styles with single clicks for bungalow, atelier and caravan, accent
# colours; the styles and the sofa bed are kept over a reload; switching styles compiles no new shader programs.
#   python3 viz3/test/einrichtung.py PORT [opts]      opts: nogeo=1 (without the real surroundings), tier=schnell|hoch, only=atelier+caravan+styles+reload
import sys, os, time, json
import sys as _sys, os as _os; _sys.path.insert(0, _os.path.dirname(_os.path.abspath(__file__))); import lib
port = sys.argv[1]
arg = sys.argv[2] if len(sys.argv) > 2 else ''
opts = dict(a.split('=', 1) if '=' in a else (a, '1') for a in arg.split(',') if a)
TIER = opts.get('tier', 'schnell')
QUERY = '?nogeo=1' if opts.get('nogeo') == '1' else ''
ONLY = set(opts.get('only', '').split('+')) - {''}
OUT = lib.out('einrichtung')
ck = lib.Checks('einrichtung')
errs = []

def want(k):
    return not ONLY or k in ONLY

def ev(pg, js):
    return pg.evaluate(js)

def shot(pg, name):
    lib.shot(pg, OUT, name)

# local → site coordinates of a building (BLD descriptors: centre c, heading az; local x along the heading, y to its left)
W = """((k, lx, ly) => { const b = SITE.bld[k], a = b.az * Math.PI / 180; return [b.c[0] + lx * Math.sin(a) - ly * Math.cos(a), b.c[1] + lx * Math.cos(a) + ly * Math.sin(a)]; })"""

def view(pg, k, lx, ly, eye, yaw_local, pitch, fov=78):
    """camera at a building's local point (eye: height above the ground); yaw in the building's frame (0 = its local +x, 90 = local −y)"""
    ev(pg, f"(() => {{ const w = {W}('{k}', {lx}, {ly}); const az = SITE.bld['{k}'].az; GAME.view(w[0], w[1], {eye}, az + ({yaw_local}), {pitch}, {fov}); GAME.step(0.05); }})()")

def act(pg, aid):
    return ev(pg, f"(() => {{ const a = PLAY.acts().find(a => a.id === '{aid}'); return a ? a.label() : 'missing'; }})()")

def run(pg, aid, secs=0.2):
    ev(pg, f"(() => {{ const a = PLAY.acts().find(a => a.id === '{aid}'); a.run(); GAME.step({secs}); }})()")

def boot(pg):
    t0 = time.time(); pg.goto(f'http://localhost:{port}/index.html{QUERY}', timeout=300000, wait_until='domcontentloaded')
    while not ev(pg, "!!(window.GAME && GAME.loaded && GAME.loaded())"):
        bad = [e for e in errs if e.startswith('PAGEERR')]
        if bad or time.time() - t0 > 1200:
            ck('page loads', False, ' | '.join(bad[:3]) or 'time-out'); ck.errors(errs); ck.done()
        time.sleep(2)
    time.sleep(3); ev(pg, "window.FREEZE = true"); print('loaded', round(time.time() - t0), 's', flush=True)
    ev(pg, "document.querySelectorAll('.ov,#doorbtn,#act2,#joy,header,#ppanel,#talkbtn,#npcsub,#toast,#stilpanel').forEach(e => e.style.visibility = 'hidden')")
    ev(pg, "GAME.setMode('day'); CAM3.want = false")
    time.sleep(0.5)

PROGS = "(() => { GAME.shot(); return GAME.R.info.programs.length; })()"
EYE_A = 0.37 + 1.62   # atelier floor top + eye
EYE_C = 0.5 + 1.6     # caravan floor + eye

with lib.browser() as b:
    pg = lib.page(b, 1000, 640, errs=errs, tier=TIER)
    pg.add_init_script("try { if (!sessionStorage.getItem('einr-reload')) localStorage.removeItem('pav-stil-v1'); } catch (e) {}")
    boot(pg)
    st = json.loads(ev(pg, """JSON.stringify({ houses: STIL.houses().map(h => ({ key: h.key, cur: h.cur, styles: h.styles.map(s => s.id) })),
      seats: GARTEN.seats.map(s => s.key), acts: GARTEN.acts.map(a => a.key), lamps: GARTEN.lamps.map(l => l.key),
      place: sitePlace(...(() => { const b = SITE.bld.holzhaus; return [b.c[0], b.c[1]]; })(), 1.0),
      spot: document.querySelector('[data-spot=holzhaus]').textContent, menu: !!document.getElementById('stilmenubtn') })"""))
    print('state', json.dumps(st), flush=True)
    keys = [h['key'] for h in st['houses']]
    ck('houses with styles: atelier (+ bungalow, caravan)', 'atelier' in keys, keys)
    ck('every house has 4–5 styles', all(4 <= len(h['styles']) <= 6 for h in st['houses']), [(h['key'], len(h['styles'])) for h in st['houses']])
    ck('the hut is called „Atelier“ (place name, menu spot)', st['place'] == 'Atelier' and st['spot'] == 'Atelier', [st['place'], st['spot']])
    ck('menu entry „Gartengebäude“', st['menu'])
    ck('atelier: seats rocking chair, wheel, sofa, guest bed', {'schaukelstuhl', 'scheibe', 'atelier-sofa', 'atelier-bett'} <= set(st['seats']), st['seats'])
    ck('atelier: jobs sofa bed, painting, kiln', {'klappsofa', 'malen', 'brennofen'} <= set(st['acts']), st['acts'])
    ck('the hut keeps its lamp (key holzhaus)', 'holzhaus' in st['lamps'], st['lamps'])
    ev(pg, "GAME.setDoorNow('holzhaus', 1); GAME.setDoorNow('caravan', 1)")
    progs0 = None
    # ---- the atelier: pictures from the door and the corners ----
    if want('atelier'):
        view(pg, 'holzhaus', -0.88, 1.45, EYE_A, 90, -14, 80); shot(pg, 'atelier_von_tuer')
        view(pg, 'holzhaus', -1.25, 1.5, EYE_A, 45, -16, 82); shot(pg, 'atelier_ecke_nordwest')
        view(pg, 'holzhaus', 0.35, -1.5, EYE_A, -110, -14, 82); shot(pg, 'atelier_ecke_sued')
        view(pg, 'holzhaus', 0.5, 1.3, EYE_A, 140, -16, 82); shot(pg, 'atelier_ecke_nordost')
        view(pg, 'holzhaus', -0.75, 0.0, EYE_A, 0, -12, 80); shot(pg, 'atelier_sofa_wand')
        view(pg, 'holzhaus', -0.62, 0.15, 1.75, -57, -8, 60); shot(pg, 'atelier_staffelei')
        view(pg, 'holzhaus', -0.15, -0.5, 1.65, 145, -32, 68); shot(pg, 'atelier_toepferecke')
        # painting on: the canvas grows step by step
        ev(pg, f"(() => {{ const w = {W}('holzhaus', -0.4, 0.3); GAME.view(w[0], w[1], {EYE_A}, SITE.bld.holzhaus.az - 60, -8, 70); GAME.step(0.1); }})()")
        l0 = act(pg, 'garten:malen'); run(pg, 'garten:malen'); run(pg, 'garten:malen')
        ck('easel: „Am Bild weitermalen“ paints on', l0 in ('Am Bild weitermalen', 'Neues Bild beginnen') and ev(pg, "ATELIER.state.pic") >= 1, [l0, ev(pg, "ATELIER.state.pic")])
        view(pg, 'holzhaus', -0.62, 0.15, 1.75, -57, -8, 60); shot(pg, 'atelier_staffelei_gemalt')
        # the potter's wheel: sit down, turn a bowl (the clay is pulled up), put it on the shelf
        ev(pg, f"(() => {{ const w = {W}('holzhaus', -0.2, -0.7); GAME.view(w[0], w[1], {EYE_A}, SITE.bld.holzhaus.az + 180, -10, 70); GAME.step(0.1); }})()")
        run(pg, 'seat:garten:scheibe', 1.2)
        ck('sitting at the potter’s wheel', ev(pg, "!!(PLAY.seat && PLAY.seat.kind === 'sit' && PLAY.seat.primary)"))
        pl = ev(pg, "PLAY.seat.primaryLabel()")
        ev(pg, "PLAY.seat.primary(); GAME.step(3)"); shot(pg, 'atelier_scheibe_dreht')
        ev(pg, "GAME.step(3.5)")
        pl2 = ev(pg, "PLAY.seat.primaryLabel()")
        b0 = ev(pg, "ATELIER.state.bowls")
        ev(pg, "PLAY.seat.primary(); GAME.step(0.3)")
        ck('wheel: turn a bowl, then put it on the shelf', pl == 'Eine Schale drehen' and pl2 == 'Schale zum Trocknen ins Regal stellen' and ev(pg, "ATELIER.state.bowls") == b0 + 1, [pl, pl2, b0, ev(pg, "ATELIER.state.bowls")])
        ev(pg, "PLAY.stand(true); GAME.step(0.5)")
        # the rocking chair: sit down, it rocks (the chair and the eye move), stand up, it comes to rest
        ev(pg, f"(() => {{ const w = {W}('holzhaus', 0.4, -0.85); GAME.view(w[0], w[1], {EYE_A}, SITE.bld.holzhaus.az + 90, -6, 70); GAME.step(0.1); }})()")
        lbl = act(pg, 'seat:garten:schaukelstuhl')
        run(pg, 'seat:garten:schaukelstuhl', 1.0)
        ths, eyes = [], []
        for i in range(8):
            ev(pg, "GAME.step(0.25)")
            ths.append(round(ev(pg, "ATELIER.rock.th"), 4)); eyes.append(ev(pg, "(() => { const f = PLAY.seat && PLAY.seat.follow && PLAY.seat.follow(); return f ? +(f.x + f.y).toFixed(4) : null; })()"))
        print('rocking θ', ths, 'eye', eyes, flush=True)
        ck('rocking chair: sitting in it, it rocks (θ changes sign, the eye moves)', lbl == 'In den Schaukelstuhl setzen' and max(ths) > 0.02 and min(ths) < -0.02 and len(set(eyes)) > 3, [lbl, ths])
        shot(pg, 'atelier_vom_schaukelstuhl')
        ev(pg, "PLAY.stand(true); GAME.step(6)")
        ck('rocking chair: at rest again after getting up', abs(ev(pg, "ATELIER.rock.th")) < 0.01, ev(pg, "ATELIER.rock.th"))
        view(pg, 'holzhaus', 0.0, -0.3, 1.7, 46, -16, 70); shot(pg, 'atelier_schaukelstuhl')
        # the sofa bed: unfold (animation), lie down, stand up, fold
        ev(pg, f"(() => {{ const w = {W}('holzhaus', -0.45, 0.05); GAME.view(w[0], w[1], {EYE_A}, SITE.bld.holzhaus.az, -14, 78); GAME.step(0.1); }})()")
        l0 = act(pg, 'garten:klappsofa'); s0 = act(pg, 'seat:garten:atelier-sofa'); b0 = act(pg, 'seat:garten:atelier-bett')
        run(pg, 'garten:klappsofa', 0.8); mid = ev(pg, "ATELIER.sofa.k"); shot(pg, 'atelier_sofa_klappt')
        ev(pg, "GAME.step(1.5)")
        k1 = ev(pg, "ATELIER.sofa.k"); l1 = act(pg, 'garten:klappsofa'); b1 = act(pg, 'seat:garten:atelier-bett'); s1 = act(pg, 'seat:garten:atelier-sofa')
        col = ev(pg, "(() => { const c = GAME.COL.find(c => c && c[6] === 'sofabed'); return c ? [c[0], c[5]] : null; })()")
        print('sofa', [l0, s0, b0, mid, k1, l1, b1, s1, col], flush=True)
        ck('sofa bed: „Sofa ausklappen“ unfolds it in an animation', l0 == 'Sofa ausklappen' and 0.05 < mid < 0.95 and k1 == 1, [l0, mid, k1])
        ck('sofa bed: then „Hinlegen“ and „Sofa zusammenklappen“ (no sitting on it)', b0 is None and b1 == 'Hinlegen' and l1 == 'Sofa zusammenklappen' and s1 is None and s0 == 'Aufs Sofa setzen', [s0, b0, b1, l1, s1])
        ck('sofa bed: its collider is the bed now (deeper, lower)', col and col[0] < 0.3 and col[1] < 1.0, col)
        shot(pg, 'atelier_gaestebett')
        run(pg, 'seat:garten:atelier-bett', 1.2)
        ck('lying on the guest bed', ev(pg, "!!(PLAY.seat && PLAY.seat.kind === 'lie')"), ev(pg, "JSON.stringify(PLAY.seat && { x: PLAY.seat.x, y: PLAY.seat.y, eye: PLAY.seat.eye })"))
        shot(pg, 'atelier_vom_gaestebett')
        ev(pg, "PLAY.stand(true); GAME.step(0.6)")
        ev(pg, f"(() => {{ const w = {W}('holzhaus', -0.45, 0.05); GAME.view(w[0], w[1], {EYE_A}, SITE.bld.holzhaus.az, -14, 78); GAME.step(0.1); }})()")
        run(pg, 'garten:klappsofa', 2.2)
        ck('sofa bed: folded again', ev(pg, "ATELIER.sofa.k") == 0 and act(pg, 'seat:garten:atelier-sofa') == 'Aufs Sofa setzen', ev(pg, "ATELIER.sofa.k"))
        # the kiln: fire the bowls
        ev(pg, f"(() => {{ const w = {W}('holzhaus', 0.55, 0.95); GAME.view(w[0], w[1], {EYE_A}, SITE.bld.holzhaus.az - 45, -14, 70); GAME.step(0.1); }})()")
        kl = act(pg, 'garten:brennofen')
        if kl == 'Schalen in den Brennofen':
            run(pg, 'garten:brennofen', 3); shot(pg, 'atelier_brennofen'); ev(pg, "GAME.step(6)")
        ck('kiln: the dried bowls are fired', kl == 'Schalen in den Brennofen' and ev(pg, "ATELIER.state.fired") >= 1, [kl, ev(pg, "ATELIER.state.fired")])
        # the journal: the atelier's tasks started when we came in, pottery done after bowl and firing, the guest bed done after unfolding
        tk = json.loads(ev(pg, "JSON.stringify(['atelier-toepfern', 'atelier-malen', 'atelier-gaestebett'].map(id => [id, TASKS.state(id)]))"))
        print('tasks', tk, flush=True)
        ck('journal: the atelier tasks run (pottery and guest bed done)', tk[0][1] and tk[0][1]['st'] == 'erledigt' and tk[1][1] and tk[2][1] and tk[2][1]['st'] == 'erledigt', tk)
        # at night with the lamp on
        ev(pg, "GARTEN.set('holzhaus', true); GAME.setMode('night')"); lib.settle_light(pg)
        view(pg, 'holzhaus', -0.88, 1.45, EYE_A, 90, -14, 80); ev(pg, "GAME.step(0.4)"); shot(pg, 'atelier_nacht_lampe')
        ck('night: the shared lamp light is in the atelier', ev(pg, "GARTEN.cur() === 'holzhaus' && GARTEN.light.intensity > 0"), ev(pg, "GARTEN.cur()"))
        ev(pg, "GARTEN.set('holzhaus', false); GAME.setMode('day')"); lib.settle_light(pg)
        ev(pg, "GAME.go('holzhaus'); GAME.step(0.6)"); shot(pg, 'ort_atelier')
        # the start situation ?szenario=atelier: inside at the door
        sz = ev(pg, "(() => { const s = KERN.scenario('atelier'); if (!s) return null; s.run(); GAME.step(0.4); return sitePlace(GAME.P.x, GAME.P.y, GAME.P.feet + 0.5); })()")
        ck('start situation „atelier“ (?szenario=atelier) puts one inside', sz == 'Atelier', sz)
        shot(pg, 'szenario_atelier')
    # ---- the caravan: from the door the bed is on the right ----
    if want('caravan'):
        cv = json.loads(ev(pg, """JSON.stringify((() => { const b = SITE.bld.carport, r = GAME.COL.filter(c => c && (c[6] === 'bed' || c[6] === 'bench' || c[6] === 'kitchen') && c[9] && Math.abs(c[9].cx - b.c[0]) < 4 && Math.abs(c[9].cy - b.c[1]) < 4);
          return r.map(c => [c[6], +((c[0] + c[1]) / 2).toFixed(2), +((c[2] + c[3]) / 2).toFixed(2)]); })())"""))
        print('caravan colliders (tag, local x, local y)', cv, flush=True)
        bed = [c for c in cv if c[0] == 'bed']; bench = [c for c in cv if c[0] == 'bench']
        # door at caravan-local x 0.2…0.85 on the north side (+y): looking in (south), right = −x (west)
        ck('caravan mirrored: the bed is west of the door (on the right when entering), the dinette east', bed and bench and bed[0][1] < 0.2 and bench[0][1] > 0.85, cv)
        view(pg, 'carport', 0.35 + 0.52, -0.35 + 1.75, 1.95, 90, -10, 82); shot(pg, 'wohnwagen_von_tuer_aussen')
        view(pg, 'carport', 0.35 + 0.52, -0.35 + 0.75, EYE_C, 90, -12, 84); shot(pg, 'wohnwagen_von_tuer')
        view(pg, 'carport', 0.35 + 0.1, -0.35 + 0.0, EYE_C, 180, -14, 80); shot(pg, 'wohnwagen_bett')
        view(pg, 'carport', 0.35 + 0.6, -0.35 + 0.0, EYE_C, 0, -14, 80); shot(pg, 'wohnwagen_sitzecke')
        view(pg, 'carport', 0.35 + 0.5, -0.35 + 4.5, 1.7, 90, -6, 62); shot(pg, 'wohnwagen_aussen_nord')
        view(pg, 'carport', 0.35 + 0.5, -0.35 - 4.5, 1.7, -90, -6, 62); shot(pg, 'wohnwagen_aussen_sued')
        lb = act(pg, 'seat:garten:wohnwagen-bett')
        ev(pg, f"(() => {{ const w = {W}('carport', 0.35 - 0.9, -0.35); GAME.view(w[0], w[1], {EYE_C}, SITE.bld.carport.az + 180, -10, 70); GAME.step(0.1); }})()")
        lb = act(pg, 'seat:garten:wohnwagen-bett')
        run(pg, 'seat:garten:wohnwagen-bett', 1.2)
        ck('caravan: lie down in the bed', lb == 'Ins Bett legen' and ev(pg, "!!(PLAY.seat && PLAY.seat.kind === 'lie')"), lb)
        shot(pg, 'wohnwagen_vom_bett')
        ev(pg, "PLAY.stand(true); GAME.step(0.6)")
        # the dinette becomes a bed: the table goes down, two cushions close the gap; lie down; back to the dinette
        ev(pg, f"(() => {{ const w = {W}('carport', 0.35 + 0.95, -0.35); GAME.view(w[0], w[1], {EYE_C}, SITE.bld.carport.az, -16, 80); GAME.step(0.1); }})()")
        l0 = act(pg, 'garten:sitzecke-bett'); s0 = act(pg, 'seat:garten:wohnwagen-sitz')
        run(pg, 'garten:sitzecke-bett', 1.6)
        l1 = act(pg, 'garten:sitzecke-bett'); b1 = act(pg, 'seat:garten:wohnwagen-gaestebett'); s1 = act(pg, 'seat:garten:wohnwagen-sitz')
        view(pg, 'carport', 0.35 + 0.9, -0.35, EYE_C, 0, -38, 84); shot(pg, 'wohnwagen_sitzecke_als_bett')
        ck('caravan: the dinette table lowers into a bed (then „Hinlegen“)', l0 == 'Tisch absenken – Bett bauen' and s0 == 'In die Sitzecke setzen' and l1 == 'Bett wieder zur Sitzecke' and b1 == 'Hinlegen' and s1 is None, [l0, s0, l1, b1, s1])
        run(pg, 'seat:garten:wohnwagen-gaestebett', 1.2)
        ck('caravan: lying on the dinette bed', ev(pg, "!!(PLAY.seat && PLAY.seat.kind === 'lie')"))
        ev(pg, "PLAY.stand(true); GAME.step(0.6)")
        ev(pg, f"(() => {{ const w = {W}('carport', 0.35 + 0.95, -0.35); GAME.view(w[0], w[1], {EYE_C}, SITE.bld.carport.az, -16, 80); GAME.step(0.1); }})()")
        run(pg, 'garten:sitzecke-bett', 1.6)
        ck('caravan: back to the dinette', act(pg, 'seat:garten:wohnwagen-sitz') == 'In die Sitzecke setzen' and ev(pg, "WOHNWAGEN.dinette.k") == 0)
        # its ceiling light at night (the garden's one shared lamp light goes there)
        lbl = act(pg, 'garten:licht:wohnwagen')
        ev(pg, "GARTEN.set('wohnwagen', true); GAME.setMode('night')"); lib.settle_light(pg)
        view(pg, 'carport', 0.35 + 0.52, -0.35 + 0.75, EYE_C, 90, -12, 84); ev(pg, "GAME.step(0.4)"); shot(pg, 'wohnwagen_nacht_licht')
        ck('caravan: ceiling light by the door switch, the shared light goes there', lbl in ('Licht an', 'Licht aus') and ev(pg, "GARTEN.cur() === 'wohnwagen' && GARTEN.light.intensity > 0"), [lbl, ev(pg, "GARTEN.cur()")])
        ev(pg, "GARTEN.set('wohnwagen', false); GAME.setMode('day')"); lib.settle_light(pg)
    # ---- styles: every style of every house once (pictures), accents; no new shader programs ----
    if want('styles'):
        # warm up: every interior seen once in its current style
        for k, lx, ly, eye, yaw in (('holzhaus', -0.88, 1.45, EYE_A, 90), ('carport', 0.87, 0.4, EYE_C, 90), ('bungalow', 2.3, 0.0, 1.76, 180)):
            view(pg, k, lx, ly, eye, yaw, -12, 80); ev(pg, "GAME.shot()")
        progs0 = ev(pg, PROGS)
        VIEWS = {
            'atelier': [('holzhaus', -0.88, 1.45, EYE_A, 90, -14), ('holzhaus', 0.35, -1.5, EYE_A, -110, -14)],
            'wohnwagen': [('carport', 0.87, 0.4, EYE_C, 90, -12), ('carport', 1.15, -0.25, EYE_C, 165, -14)],
            'bungalow': [('bungalow', 0.7, 0.2, 1.72, -140, -12), ('bungalow', -0.3, 0.0, 1.72, 125, -14)],
        }
        info = {}
        for h in st['houses']:
            k = h['key']
            for sid in h['styles']:
                ok = ev(pg, f"STIL.set('{k}', '{sid}')")
                for i, v in enumerate(VIEWS.get(k, [])):
                    view(pg, v[0], v[1], v[2], v[3], v[4], v[5], 80)
                    shot(pg, f'stil_{k}_{sid}_{i + 1}')
                info[f'{k}:{sid}'] = ev(pg, f"STIL.layerInfo('{k}')")
                ck(f'style {k}: {sid}', ok and ev(pg, f"STIL.get('{k}').cur") == sid, info[f'{k}:{sid}'])
        print('layers', json.dumps(info), flush=True)
        # accent colours: each tints the house's accent material
        accs = ev(pg, "(() => { const out = []; for (let i = 0; i < 8; i++) { STIL.accent('atelier', i); out.push([STIL.get('atelier').M.acc.color.getHex(), STIL.get('atelier').acc]); } return out; })()")
        ck('eight accent colours, each tints the accent material', len(set(a[0] for a in accs)) == 8 and [a[1] for a in accs] == list(range(8)), accs)
        view(pg, 'holzhaus', -0.75, 0.0, EYE_A, 0, -12, 80); shot(pg, 'stil_atelier_akzent')
        progs1 = ev(pg, PROGS)
        for k, lx, ly, eye, yaw in (('holzhaus', -0.88, 1.45, EYE_A, 90), ('carport', 0.87, 0.4, EYE_C, 90), ('bungalow', 2.3, 0.0, 1.76, 180)):
            view(pg, k, lx, ly, eye, yaw, -12, 80); ev(pg, "GAME.shot()")
        progs1 = ev(pg, PROGS)
        print('shader programs before / after all styles', progs0, progs1, flush=True)
        ck('switching styles compiles no new shader programs', progs1 <= progs0, [progs0, progs1])
        ok, rep = lib.check_gl(pg, 16)
        ck('shader programs: ≤ 16 textures, none broken', ok, {k: rep[k] for k in ('programs', 'maxFrag', 'bad', 'broken')})
        # the panel: open from the menu entry, a style and an accent by click
        ev(pg, "document.getElementById('stilmenubtn').click()")
        pan = ev(pg, "(() => { const p = document.getElementById('stilpanel'); return p && !p.hidden ? [p.querySelectorAll('.stabs button').length, p.querySelectorAll('.sstyles button').length, p.querySelectorAll('.saccents button').length] : null; })()")
        ck('panel „Einrichtung“: tabs, styles, accents', pan and pan[0] >= 1 and pan[1] >= 4 and pan[2] == 8, pan)
        ev(pg, "(() => { const p = document.getElementById('stilpanel'); p.style.visibility = 'visible'; })()")
        try:
            ev(pg, "GAME.shot()"); pg.screenshot(path=os.path.join(OUT, 'panel.png'), timeout=120000); print('page shot panel', flush=True)
        except Exception as e:
            print('page shot panel failed (picture only)', str(e)[:120], flush=True)
        # the same on a phone (portrait): the panel fits beside the edge, nothing cut off
        try:
            pg.set_viewport_size({'width': 390, 'height': 844}); ev(pg, "window.dispatchEvent(new Event('resize')); GAME.step(0.1)")
            fit = ev(pg, "(() => { const r = document.getElementById('stilpanel').getBoundingClientRect(); return [Math.round(r.left), Math.round(r.right), Math.round(r.top), Math.round(r.bottom), innerWidth, innerHeight]; })()")
            ck('panel on a phone: inside the screen', fit[0] >= 0 and fit[1] <= fit[4] and fit[3] <= fit[5], fit)
            ev(pg, "GAME.shot()"); pg.screenshot(path=os.path.join(OUT, 'panel_handy.png'), timeout=120000); print('page shot panel_handy', flush=True)
        except Exception as e:
            print('page shot panel_handy failed (picture only)', str(e)[:120], flush=True)
        finally:
            pg.set_viewport_size({'width': 1000, 'height': 640}); ev(pg, "window.dispatchEvent(new Event('resize')); GAME.step(0.1)")
        ev(pg, "STIL.open(false)")
    # ---- a reload keeps the chosen styles and the sofa bed ----
    if want('reload'):
        want_st = {h['key']: h['styles'][min(2, len(h['styles']) - 1)] for h in st['houses']}
        for k, sid in want_st.items(): ev(pg, f"STIL.set('{k}', '{sid}'); STIL.accent('{k}', 5)")
        ev(pg, "ATELIER.setSofa(true)")
        saved = ev(pg, "SAVE.raw('pav-stil-v1')")
        print('saved', saved, flush=True)
        ev(pg, "sessionStorage.setItem('einr-reload', '1')")
        pg.reload(wait_until='domcontentloaded')
        boot(pg)
        got = json.loads(ev(pg, "JSON.stringify(Object.fromEntries(STIL.houses().map(h => [h.key, [h.cur, h.acc]])))"))
        ck('reload: the chosen styles and accents are back', all(got.get(k, [None])[0] == sid and got[k][1] == 5 for k, sid in want_st.items()), [want_st, got])
        ck('reload: the sofa bed is still unfolded', ev(pg, "ATELIER.sofa.k") == 1, ev(pg, "ATELIER.sofa.k"))
        view(pg, 'holzhaus', -0.88, 1.45, EYE_A, 90, -14, 80); shot(pg, 'reload_atelier')
        ev(pg, "ATELIER.setSofa(false)")
    ck.errors(errs)
ck.done()
