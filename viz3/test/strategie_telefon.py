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
    # a tap on Sarah's symbol, then a tap on the garden: the one job there (mowing)
    q = J("(() => { const p = STRAT.pos('sarah'); GAME.shot(); const s = STHUD.pr(p[0], p[1], 1.8); const r = document.querySelector('#stage canvas').getBoundingClientRect(); return [s[0] + r.left, s[1] + r.top]; })()")
    pg.touchscreen.tap(q[0], q[1])
    steps(0.2)
    ck('a tap on her symbol selects Sarah', J("STRAT.S.sel") == ['sarah'], str(J("STRAT.S.sel")) + ' at ' + str(q))
    g = J("(() => { const c = STRAT.place.pos('garten'); const s = STHUD.pr(c[0], c[1], 1); const r = document.querySelector('#stage canvas').getBoundingClientRect(); return [s[0] + r.left, s[1] + r.top]; })()")
    pg.touchscreen.tap(g[0], g[1])
    steps(0.2)
    jb = J("STRAT.S.jobs.filter(j => j.def === 'maehen').map(j => j.who)")
    ck('a tap on the garden with Sarah selected gives her the job (or opens its panel)', jb == [['sarah']] or not E("document.getElementById('stpan').hidden"), str(jb))
    E("GAME.shot(); STHUD.refresh(); STHUD.draw()")
    pg.screenshot(path=os.path.join(OUT, 'telefon_2.png'), timeout=120000)
    P = J("{ tx: GAME.P.tx, ty: GAME.P.ty }")
    # drag pans the view (touch)
    cdp = ctx.new_cdp_session(pg)
    def touch(kind, pts):
        cdp.send('Input.dispatchTouchEvent', {'type': kind, 'touchPoints': [{'x': x, 'y': y} for x, y in pts]})
    touch('touchStart', [(200, 420)])
    for i in range(1, 8): touch('touchMove', [(200 + i * 15, 420 + i * 10)])
    touch('touchEnd', [])
    steps(0.2)
    P2 = J("{ tx: GAME.P.tx, ty: GAME.P.ty }")
    ck('dragging pans the view', abs(P2['tx'] - P['tx']) + abs(P2['ty'] - P['ty']) > 3, f'{P} → {P2}')
    ck('no new shader programs', E("GAME.R.info.programs.length") <= p0, f"{p0} → {E('GAME.R.info.programs.length')}")
    ck.errors(errs)
    ck.done()
