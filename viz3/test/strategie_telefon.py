# feat/strategie: „Ratscher von oben“ on a phone (iPhone-13 profile, touch): the HUD fits (resource bar, people strip, time, panel do not
# cover each other), a tap selects a person, a tap on a place with her selected gives a job or opens its panel, drag pans, no page error,
# no new shader programs. Pictures in out/strategie/ (telefon_*).
#   python3 viz3/test/strategie_telefon.py 9002
import sys, os, json
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__))); import lib
port = sys.argv[1] if len(sys.argv) > 1 else '8951'
ck = lib.Checks('strategie_telefon')
OUT = lib.out('strategie')
with lib.browser() as b:
    errs = []
    ctx = b.new_context(viewport={'width': 390, 'height': 844}, device_scale_factor=2, is_mobile=True, has_touch=True,
                        user_agent='Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1')
    pg = ctx.new_page()
    lib.preset(pg)
    pg.on('pageerror', lambda e: errs.append('PAGEERR ' + str(e)))
    lib.boot(pg, port, '?szenario=strategie')
    E = pg.evaluate
    J = lambda js: json.loads(E("JSON.stringify(" + js + ")"))
    steps = lambda secs, dt=0.25: E(f"for (let i = 0; i < {max(1, int(secs / dt))}; i++) GAME.step({dt})")
    E("document.head.insertAdjacentHTML('beforeend', '<style>*{backdrop-filter:none!important;-webkit-backdrop-filter:none!important}</style>')")
    E("STRAT.W.force = { cloud: 0.3, rain: 0, wind: 12, storm: false, src: 'Test' }")
    J("STRAT.setDate('2026-11-07', 10 * 60)")
    steps(1)
    E("GAME.shot(); STHUD.refresh(); STHUD.draw()")
    p0 = E("GAME.R.info.programs.length")
    R = J("""(() => { const R = id => { const e = document.getElementById(id); if (!e || e.hidden || getComputedStyle(e).display === 'none') return null; const r = e.getBoundingClientRect(); return [r.left, r.top, r.right, r.bottom].map(Math.round); };
      return { res: R('sthud'), ppl: R('stppl'), time: R('sttime'), notes: R('stnotes'), w: innerWidth, h: innerHeight }; })()""")
    apart = lambda a, b: a is None or b is None or a[2] <= b[0] or b[2] <= a[0] or a[3] <= b[1] or b[3] <= a[1]
    ck('the HUD is there on the phone', R['res'] and R['ppl'] and R['time'], str(R))
    inside = lambda r: r is None or (r[0] >= -1 and r[2] <= R['w'] + 1 and r[1] >= -1 and r[3] <= R['h'] + 1)
    ck('… inside the screen', all(inside(R[k]) for k in ('res', 'ppl', 'time')), str(R))
    ck('… the resource bar, the people and the time do not cover each other', apart(R['res'], R['ppl']) and apart(R['res'], R['time']) and apart(R['ppl'], R['time']), str(R))
    pg.screenshot(path=os.path.join(OUT, 'telefon_1.png'), timeout=120000)
    # the garden in the middle of the map (as one pans there with a finger): a tap on Sarah's symbol, then on the garden's – its one job
    E("(() => { const c = STRAT.place.pos('garten'); GAME.P.tx = c[0]; GAME.P.ty = c[1]; GAME.P.th = 90; })()")
    steps(0.5)
    E("GAME.shot(); STHUD.draw()")
    q = J("(() => { const p = STRAT.pos('sarah'); GAME.shot(); const s = STHUD.pr(p[0], p[1], 1.8); const r = document.querySelector('#stage canvas').getBoundingClientRect(); return [s[0] + r.left, s[1] + r.top]; })()")
    pg.touchscreen.tap(q[0], q[1])
    steps(0.2)
    ck('a tap on her symbol selects Sarah', J("STRAT.S.sel") == ['sarah'], str(J("STRAT.S.sel")) + ' at ' + str(q))
    E("STHUD.refresh()")
    steps(0.1)
    R2 = J("""(() => { const R = id => { const e = document.getElementById(id); if (!e || e.hidden || getComputedStyle(e).display === 'none') return null; const r = e.getBoundingClientRect(); return [r.left, r.top, r.right, r.bottom].map(Math.round); };
      return { pan: R('stpan'), time: R('sttime'), ppl: R('stppl') }; })()""")
    ck('… her panel lies between the time box and the people strip (both stay readable)', R2['pan'] and apart(R2['pan'], R2['time']) and apart(R2['pan'], R2['ppl']), str(R2))
    pg.screenshot(path=os.path.join(OUT, 'telefon_person.png'), timeout=120000)
    E("STHUD.closePanel()")  # her panel closed with its ✕ (it lies over the middle of the map)
    steps(0.2)
    g = J("(() => { const c = STRAT.place.pos('garten'); GAME.shot(); const s = STHUD.pr(c[0], c[1], 1); const r = document.querySelector('#stage canvas').getBoundingClientRect(); return [s[0] + r.left, s[1] + r.top]; })()")
    on_map = E(f"(() => {{ const e = document.elementFromPoint({g[0]}, {g[1]}); return !!e && e.tagName === 'CANVAS'; }})()")
    print('garden symbol at', g, 'on the map:', on_map, flush=True)
    pg.touchscreen.tap(g[0], g[1])
    steps(0.2)
    jb = J("STRAT.S.jobs.filter(j => j.def === 'maehen').map(j => j.who)")
    dbg = J("""(() => { const c = STRAT.place.pos('garten'), s = STHUD.pr(c[0], c[1], 1), p = STRAT.pos('sarah'), q = STHUD.pr(p[0], p[1], 1.8);
      return { garten: s.slice(0, 2).map(Math.round), sarah: q.slice(0, 2).map(Math.round), sel: STRAT.S.sel, jobs: STRAT.job.at('garten').map(J => [J.id, STRAT.job.check(J, ['sarah']) && STRAT.job.check(J, ['sarah']).rule]),
        mode: GAME.P.mode, notes: STRAT.S.notes.slice(-3).map(n => n.text) }; })()""")
    ck('a tap on the garden (its symbol, where Sarah stands) with Sarah selected gives her the garden\'s job', jb == [['sarah']], str(jb) + ' ' + str(dbg) + f' tap at {g}')
    E("GAME.shot(); STHUD.refresh(); STHUD.draw()")
    pg.screenshot(path=os.path.join(OUT, 'telefon_2.png'), timeout=120000)
    # drag pans the view (touch) – on the map, not on a panel (the place's panel closed with its ✕ first)
    E("STHUD.closePanel()")
    steps(0.2)
    P = J("{ tx: GAME.P.tx, ty: GAME.P.ty }")
    free = J("""(() => { for (const [x, y] of [[195, 420], [195, 520], [120, 560], [280, 560], [195, 340], [120, 330]]) {
      const e = document.elementFromPoint(x, y); if (e && e.tagName === 'CANVAS') return [x, y]; } return null; })()""")
    at = J("""(() => { const e = document.elementFromPoint(195, 420); return e ? e.tagName + '#' + e.id + '.' + e.className : null; })()""")
    cdp = ctx.new_cdp_session(pg)
    def touch(kind, pts):
        cdp.send('Input.dispatchTouchEvent', {'type': kind, 'touchPoints': [{'x': x, 'y': y, 'id': 1} for x, y in pts]})
    x0, y0 = free or (195, 420)
    touch('touchStart', [(x0, y0)])
    for i in range(1, 9):
        touch('touchMove', [(x0 + i * 12, y0 + i * 8)])
        steps(0.05)
    touch('touchEnd', [])
    steps(0.2)
    P2 = J("{ tx: GAME.P.tx, ty: GAME.P.ty }")
    ck('dragging on the map pans the view', abs(P2['tx'] - P['tx']) + abs(P2['ty'] - P['ty']) > 3, f'{P} → {P2} from {(x0, y0)} (free {free}; at 195,420: {at})')
    ck('no new shader programs', E("GAME.R.info.programs.length") <= p0, f"{p0} → {E('GAME.R.info.programs.length')}")
    ck.errors(errs)
    ck.done()
