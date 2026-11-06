# feat/bus (Falko, 5.11.2026 23:02: „Busse nach echtem Fahrplan – einsteigen und mitfahren (z. B. Ratscher – Schleusingen)“): the real
# timetable (gtfs.de, DELFI e.V.) in the world (bus/bus_fahrplan.js BUSPLAN, bus/bus_modell.js BUSMOD, bus/bus.js BUS). The scene „bus“
# puts the walker at the stop Ratscher, Schleusebrücke (the kerb towards Schleusingen) on a school day at 7:38. Checked: the data (stations,
# trips, a workday's departures at Ratscher with the 203 and the 205), the stop sign there, the board („Fahrplan“: the next departures of
# this kerb, the day), „Auf den Bus warten“ (the clock jumps to a minute before the bus), the clock in real time while the bus is due,
# the bus comes at its minute, stops with the front door at the sign, the doors open; „Einsteigen“ (the action), the ride panel, riding
# (the bus drives, the rider goes with it, the clock runs in real time), getting off at a chosen stop with „Fahrt abkürzen“ (Schleusingen,
# Zentralhaltestelle: the clock jumps, the walker stands at the kerb there); a reload during a ride puts one at the stop; no new shader
# program for bus, sign and display; no page errors; in the zombie night no regular buses. Pictures in out/bus/.
#   python3 viz3/test/bus.py 8999 [sections]      sections: fahrt,reload,zombie (default all)
import sys, os, json, time, math, urllib.request, concurrent.futures
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__))); import lib
port = sys.argv[1] if len(sys.argv) > 1 else '8951'

# the world tiles along the ways of the buses Ratscher → Schleusingen beyond the square (as viz3/test/fahrt.py: from the published site
# into viz3/dist/welt-test/, levels 10–12 around the way) – so the ride out of the square has its ground
SITE = os.environ.get('WELT_SITE', 'https://mynametouse.github.io/pavillon-ratscher/welt-test/')
DIST = os.path.join(lib.ROOT, 'viz3', 'dist', 'welt-test')
G = json.load(open(os.path.join(lib.ROOT, 'viz3', 'manifests.json')))['geoman']
XF, TI = G['xf'], G['terrain']['inner']
RB = (TI['x0'], TI['y0'], TI['x0'] + (TI['n'] - 1) * TI['step'], TI['y0'] + (TI['n'] - 1) * TI['step'])

def fetch_tiles():
    try:
        F = json.load(open(os.path.join(lib.ROOT, 'viz3', 'extra', 'bus', 'dist', 'bus', 'fahrplan.json')))
    except Exception as e:
        print('note: no timetable for the tiles', e, flush=True); return
    names = [s['n'] for s in F['stations']]
    pts = []
    for p in F['pats']:
        st = [names[s] if s >= 0 else '' for s, q in p['st']]
        if 'Ratscher, Schleusebrücke' in st and 'Schleusingen, Zentralhaltestelle' in st:
            pts += [(p['p'][2 * k] / 10, p['p'][2 * k + 1] / 10) for k in range(0, len(p['p']) // 2, 3)]
    os.makedirs(DIST, exist_ok=True)
    def get(rel):
        q = os.path.join(DIST, rel)
        if os.path.exists(q) and os.path.getsize(q) > 0: return 0
        os.makedirs(os.path.dirname(q), exist_ok=True)
        try:
            with urllib.request.urlopen(SITE + rel, timeout=60) as r: b = r.read()
        except Exception: return 0
        open(q, 'wb').write(b); return len(b)
    get('meta.json')
    try: m = json.load(open(os.path.join(DIST, 'meta.json')))
    except Exception as e:
        print('note: no tile meta', e, flush=True); return
    jobs = set()
    for L, pad in ((10, 900), (11, 500), (12, 270)):
        sz = 409600 / (1 << L)
        r = m['tiling']['levels'].get(str(L), {}).get('rect')
        if not r: continue
        for x, y in pts:
            if RB[0] + 400 < x < RB[2] - 400 and RB[1] + 400 < y < RB[3] - 400: continue
            E, N = XF['a'] * x - XF['b'] * y + XF['ex'], XF['b'] * x + XF['a'] * y + XF['ey']
            for tx in range(int((E - pad - 420700) // sz), int((E + pad - 420700) // sz) + 1):
                for ty in range(int((N - pad - 5390800) // sz), int((N + pad - 5390800) // sz) + 1):
                    if r[0] <= tx <= r[2] and r[1] <= ty <= r[3]:
                        jobs.add(f't/{L}/{tx}/{ty}.bin'); jobs.add(f'i/{L}/{tx}/{ty}.webp')
    t0 = time.time()
    with concurrent.futures.ThreadPoolExecutor(12) as ex: n = sum(ex.map(get, sorted(jobs)))
    print(f'welt tiles: {len(jobs)} files, {n / 1e6:.1f} MB new in {time.time() - t0:.0f} s', flush=True)

want = set((sys.argv[2] if len(sys.argv) > 2 else 'fahrt,nacht,reload,zombie').split(','))
ck = lib.Checks('bus')
OUT = lib.out('bus')

def helpers(pg):
    E = pg.evaluate
    J = lambda js: json.loads(E("JSON.stringify(" + js + ")"))
    steps = lambda secs, dt=0.1: E(f"for (let i = 0; i < {max(1, int(secs / dt))}; i++) GAME.step({dt})")
    E("document.head.insertAdjacentHTML('beforeend', '<style>*{backdrop-filter:none!important;-webkit-backdrop-filter:none!important}</style>')")
    E("(() => { window.__ev = []; KERN.on('*', (d, n) => { if (String(n).startsWith('bus:')) window.__ev.push([n, d]); }); window.__th = []; const t0 = PLAY.think; PLAY.think = (t, ms) => { window.__th.push(String(t)); return t0(t, ms); }; })()")
    return E, J, steps

def pic(pg, name):
    try: lib.shot(pg, OUT, name)
    except Exception as e: print('shot failed', name, e, flush=True)

def page_pic(pg, name):
    try:
        pg.evaluate("GAME.shot()"); pg.screenshot(path=os.path.join(OUT, name + '.png'), timeout=120000); print('page shot', name, flush=True)
    except Exception as e: print('note: page shot', name, 'failed:', repr(e)[:160], flush=True)

if 'fahrt' in want:
    fetch_tiles()
with lib.browser() as b:
    errs = []
    if 'fahrt' in want or 'reload' in want or 'nacht' in want:
        pg = lib.page(b, 1100, 680, errs)
        lib.boot(pg, port, '?szenario=bus')
        E, J, steps = helpers(pg)
        for i in range(60):
            if E("!!(window.BUS && BUS.S.state === 'ready' && BUS.STOPS().length)"): break
            steps(0.2)
            time.sleep(0.5)
        steps(1.0)
        st = J("BUS.state()")
        ck('the timetable is there (stations, trips, stops on the roads)', st['state'] == 'ready' and st['stations'] >= 25 and st['trips'] >= 200 and st['stops'] >= 30,
           f"{st['state']} {st['err']} stations {st['stations']} trips {st['trips']} stops {st['stops']}")
        info = J("""(() => { const B = BUS.plan, e = BUS.stopAt(GAME.P.x, GAME.P.y, 30), d = B.day(DN.e0 + Math.floor(CLOCK.t / 1440));
          return { stop: e && e.name, kind: d.kind, t: CLOCK.hm(), P: [GAME.P.x, GAME.P.y], dep: e ? B.departures(e.s, CLOCK.t, DN.e0, 40).map(q => q.trip.line + ' ' + B.hm(q.t) + ' ' + q.trip.head) : [] }; })()""")
        print('scene', info['stop'], info['kind'], info['t'], info['P'], flush=True)
        ck('the scene: at Ratscher, Schleusebrücke on a school day at 7:38', info['stop'] == 'Ratscher, Schleusebrücke' and 'Schultag' in info['kind'] and info['t'] in ('07:38', '07:39', '07:40', '07:41'), str(info)[:300])
        lines = set(d.split(' ')[0] for d in info['dep'])
        ck("a workday's departures at Ratscher: the 203 and the 205", '203' in lines and '205' in lines, ', '.join(info['dep'][:12]))
        steps(2.0)
        st = J("BUS.state()")
        ck('the stop sign stands there (built near the walker)', st['furn'] >= 1, f"furniture {st['furn']}")
        E("GAME.shot()"); steps(0.3)
        p0 = E("GAME.R.info.programs.length")
        progs0 = set(J("GAME.R.info.programs.map(p => p.cacheKey)"))
        def new_progs():
            # which programs came since the start (name and the start of the key: material type, defines)
            return J(f"GAME.R.info.programs.filter(p => !{json.dumps(sorted(progs0))}.includes(p.cacheKey)).map(p => p.name + ' ' + String(p.cacheKey).slice(0, 160))")
        def own_new():
            # the programs of the bus's own materials (buses, signs, displays, the printed timetables): all there before the bus came
            # (as zombie_ziele.py for its coach – the people's programs, e.g. a passer-by's hair, are not the bus's)
            return J(f"""(() => {{ const before = new Set({json.dumps(sorted(progs0))}), out = [], seen = new Set(), R = GAME.R;
              const roots = BUS.S.inst.map(I => I.B.g).concat([...BUS.S.furn.values()].map(f => f.sign && f.sign.grp).filter(Boolean));
              for (const g of roots) g.traverse(o => {{ for (const m of [].concat(o.material || [])) {{ if (!m || seen.has(m)) continue; seen.add(m);
                const pp = R.properties.get(m), cp = pp && pp.currentProgram; if (cp && !before.has(cp.cacheKey)) out.push((m.name || m.type) + ' ' + String(cp.cacheKey).slice(0, 120)); }} }});
              return out; }})()""")
        # the board
        brd = J("""(() => { const e = BUS.stopAt(GAME.P.x, GAME.P.y, 30); const a = KERN.acts().find(q => q.id === 'bus:plan:' + e.i);
          const lbl = a ? a.label() : null; BUS.board(e); const el = document.getElementById('busboard');
          return { lbl, shown: !!el && !el.hidden, rows: el ? [...el.querySelectorAll('tr')].map(r => r.textContent) : [], wait: !!(el && el.querySelector('[data-k=warten]')) }; })()""")
        print('board', brd, flush=True)
        ck('the board: „Fahrplan“ at the sign, the next departures of this kerb', brd['lbl'] and brd['lbl'].startswith('Fahrplan') and brd['shown'] and len(brd['rows']) >= 4 and brd['wait'],
           f"{brd['lbl']} | " + ' / '.join(brd['rows'][:5]))
        ck('the board shows the 205 to Schleusingen at 7:46', any('7:46' in r and '205' in r for r in brd['rows']), ' / '.join(brd['rows'][:5]))
        page_pic(pg, 'a_fahrplan')
        # the printed timetable in the sign's case, close (first person for the picture)
        E("""(() => { window.CAM3 && (CAM3.want = false); const e = BUS.stopAt(GAME.P.x, GAME.P.y, 30), a = ((e.az + 180) * Math.PI) / 180, fx = Math.sin(a), fy = Math.cos(a);
          const x = e.x + fx * 1.25, y = e.y + fy * 1.25; GAME.view(x, y, KERN.ground(e.x, e.y) + 1.45, Math.atan2(e.x - x, e.y - y) * 180 / Math.PI, -2, 50); })()""")
        steps(0.2)
        pic(pg, 'a2_aushang')
        E("window.CAM3 && (CAM3.want = true); document.querySelector('#busboard .x') && document.querySelector('#busboard .x').click(); GAME.go('bus')")
        steps(0.3)
        E("(() => { const e = BUS.stopAt(GAME.P.x, GAME.P.y, 30); BUS.board(e); })()")
        # waiting: the clock jumps to a minute before the bus (two people come to wait for it, one gets off: BUSLEUTE.force)
        E("BUSLEUTE.force = { ein: 2, aus: 1, line: '205' }")
        E("document.querySelector('#busboard [data-k=warten]').click()")
        for i in range(40):
            steps(0.5)
            if not E("!!CLOCK.warp"): break
        w = J("({ t: CLOCK.hm(), focus: CLOCK.focused, ev: window.__ev.filter(e => e[0] === 'bus:warten').length })")
        ck('„Auf den Bus warten“: the clock jumps to 7:45, then runs in real time (the bus is due)', w['t'] == '07:45' and w['focus'] and w['ev'] >= 1, str(w))
        # the people waiting beside the sign (their figures load)
        for i in range(40):
            lp = J("BUSLEUTE.state()")
            if len([q for q in lp['pax'] if q['fig']]) >= 2: break
            steps(0.2); time.sleep(0.5)
        lp = J("BUSLEUTE.state()")
        ck('two people wait at the stop (figures of the traffic)', len([q for q in lp['pax'] if q['st'] in ('wartet', 'kommt') and q['fig']]) >= 2, str(lp))
        E("""(() => { window.CAM3 && (CAM3.want = false); const e = BUS.stopAt(GAME.P.x, GAME.P.y, 30), fx = Math.sin(e.hd), fy = Math.cos(e.hd), rx = Math.cos(e.hd), ry = -Math.sin(e.hd);
          const x = e.x - rx * 5.5 + fx * 7, y = e.y - ry * 5.5 + fy * 7; GAME.view(x, y, KERN.ground(x, y) + 1.65, Math.atan2(e.x - x, e.y - y) * 180 / Math.PI, -4, 60); })()""")
        steps(0.1)
        pic(pg, 'a3_leute_warten')
        E("window.CAM3 && (CAM3.want = true); GAME.go('bus')")
        steps(0.1)
        # someone in its lane: the walker on the road 60 m before the stop – the bus brakes, stands before him, sounds its horn; he steps
        # back to the stop, it comes on (a little late)
        for i in range(40):
            if J("BUS.state().inst.some(q => q.line === '205' && q.halt !== 'Rand der Karte')") or J("BUS.state().inst.some(q => q.line === '205')"): break
            steps(0.5)
        lane = J("""(() => { const I = BUS.S.inst.find(q => q.trip.line === '205'); if (!I) return null; const R = I.Rn.R, k = I.Rn.P.st.findIndex(o => o.s >= 0 && BUS.plan.S.stations[o.s].n === 'Ratscher, Schleusebrücke');
          const a = BUS.plan.lane(I.Rn.P), o = {}; const s = R.st[k] - 60; const X = R.X, Y = R.Y, i = Math.max(0, Math.min(R.n - 1, Math.round(s)));
          return { x: X[i], y: Y[i], hd: Math.atan2(X[Math.min(R.n - 1, i + 1)] - X[i], Y[Math.min(R.n - 1, i + 1)] - Y[i]) }; })()""")
        if lane:
            E(f"GAME.P.x = {lane['x']}; GAME.P.y = {lane['y']}; GAME.P.feet = KERN.ground({lane['x']}, {lane['y']}); GAME.P.yaw = GAME.P.body = {lane['hd']} * 180 / Math.PI + 180")
            stood = None
            for i in range(120):
                steps(0.5)
                q = J(f"""(() => {{ const I = BUS.S.inst.find(q => q.trip.line === '205'); if (!I) return null; const fx = Math.sin(I.hd), fy = Math.cos(I.hd);
                  const front = [I.x + fx * 6, I.y + fy * 6]; return {{ d: Math.hypot(front[0] - GAME.P.x, front[1] - GAME.P.y), v: I.v * (I.r ?? 1), r: I.r, st: I.st, honks: BUS.S.stats.honks || 0 }}; }})()""")
                if q and q['d'] < 25 and q['v'] < 0.05 and q['honks'] >= 1:
                    stood = q; break
            ck('someone in its lane: the bus stands before him and sounds its horn', stood is not None and stood['d'] > 1.5, str(stood))
            E("(() => { const e = BUS.stopAt(GAME.P.x, GAME.P.y, 200); GAME.go('bus'); })()")
            steps(0.5)
        # the bus comes at its minute and stops at the sign
        arr = None
        for i in range(90):
            steps(1.0)
            st = J("BUS.state()")
            here = [q for q in st['inst'] if q['halt'] == 'Ratscher, Schleusebrücke' and q['st'] == 'halt' and q['line'] == '205']
            if here and here[0]['open'] > 0.8:
                arr = here[0]; break
        t_arr = E("CLOCK.hm()")
        ck('the 205 comes (7:46, a little late after waiting for the walker) and stands at the stop with open doors', arr is not None and t_arr in ('07:46', '07:47', '07:48'), f"{t_arr} {arr}")
        # the two get in at the front door (the bus waits for them)
        for i in range(12):
            steps(0.5)
            if i == 2: pic(pg, 'b0_leute_steigen_ein')
            if J("BUSLEUTE.state().stats.ein") >= 2: break
        lp = J("BUSLEUTE.state()")
        ck('the waiting people get in at the front door', lp['stats']['ein'] >= 2 and not [q for q in lp['pax'] if q['st'] == 'steigt'], str(lp))
        if arr:
            d = J(f"(() => {{ const e = BUS.stopAt(GAME.P.x, GAME.P.y, 30); return Math.hypot({arr['x']} - e.x, {arr['y']} - e.y); }})()")
            ck('the bus stands beside the sign (its middle within 9 m of the stop)', d < 9, f'{d:.1f} m')
            # a picture from the kerb, looking along the bus
            E(f"""(() => {{ const e = BUS.stopAt(GAME.P.x, GAME.P.y, 30), I = BUS.S.inst.find(q => q.key === '{arr['key']}');
              const fx = Math.sin(I.hd), fy = Math.cos(I.hd), rx = Math.cos(I.hd), ry = -Math.sin(I.hd);
              const x = I.x + fx * 16 + rx * 6, y = I.y + fy * 16 + ry * 6, yaw = Math.atan2(I.x - x, I.y - y) * 180 / Math.PI;
              GAME.view(x, y, KERN.ground(x, y) + 1.7, yaw, -3, 60); }})()""")
            steps(0.2); pic(pg, 'b_bus_an_der_haltestelle')
            # what a bus costs: draw calls of this picture with and without it
            dc = J(f"""(() => {{ const I = BUS.S.inst.find(q => q.key === '{arr['key']}'), R = GAME.R, f0 = R.renderBufferDirect; let n = 0, tri = 0;
              R.renderBufferDirect = function (cam, scene, geo, mat, obj, grp) {{ n++; return f0.apply(this, arguments); }};
              try {{ GAME.shot(); const a = n; n = 0; I.B.g.visible = false; GAME.shot(); const b = n; I.B.g.visible = true; return {{ calls: a - b, with: a, without: b }}; }}
              finally {{ R.renderBufferDirect = f0; }} }})()""")
            ck('a bus costs few draw calls (≤ 16)', 0 < dc['calls'] <= 16, str(dc))
            E(f"""(() => {{ const I = BUS.S.inst.find(q => q.key === '{arr['key']}');
              const fx = Math.sin(I.hd), fy = Math.cos(I.hd), rx = Math.cos(I.hd), ry = -Math.sin(I.hd);
              const x = I.x + fx * 9 + rx * 4.5, y = I.y + fy * 9 + ry * 4.5, yaw = Math.atan2(I.x + fx * 2 - x, I.y + fy * 2 - y) * 180 / Math.PI;
              GAME.view(x, y, KERN.ground(x, y) + 1.6, yaw, -6, 62); }})()""")
            steps(0.2); pic(pg, 'b2_tuer_offen')
            E("GAME.go && GAME.go('bus')")
            steps(0.3)
            p1 = E("GAME.R.info.programs.length")
            mine = own_new()
            ck('no new shader program for the bus, the sign and the display', not mine, f'{p0} → {p1}; of the bus: ' + (' | '.join(mine)[:400] or 'none') + '; others: ' + ' | '.join(new_progs())[:300])
            # boarding through the action at the front door
            E(f"""(() => {{ const I = BUS.S.inst.find(q => q.key === '{arr['key']}'); const fx = Math.sin(I.hd), fy = Math.cos(I.hd), rx = Math.cos(I.hd), ry = -Math.sin(I.hd);
              GAME.P.x = I.x + fx * 5.05 + rx * 2.2; GAME.P.y = I.y + fy * 5.05 + ry * 2.2; }})()""")
            steps(0.3)
            act = J("(() => { const a = KERN.acts().find(q => String(q.id).startsWith('bus:ein:')); return a ? { id: a.id, lbl: a.label() } : null; })()")
            ck('„Einsteigen“ at the front door', act and act['lbl'] and act['lbl'].startswith('Einsteigen: 205'), str(act))
            E("(() => { const a = KERN.acts().find(q => String(q.id).startsWith('bus:ein:')); a && a.run(); })()")
            steps(1.0)
            r = J("({ ride: BUS.state().ride, panel: !document.getElementById('buspanel').hidden, rows: [...document.querySelectorAll('#buspanel li')].map(l => l.textContent), focus: CLOCK.focused, seat: PLAY.seated() })")
            print('ride', r, flush=True)
            ck('riding: seated, the panel with the next stops, the clock in real time', r['ride'] and r['panel'] and r['seat'] and r['focus'] and any('Zentralhaltestelle' in x for x in r['rows']), str(r)[:300])
            page_pic(pg, 'c_im_bus_panel')
            # the same on a phone (the panel at the bottom, above the buttons)
            pg.set_viewport_size({'width': 390, 'height': 844})
            steps(0.3)
            page_pic(pg, 'c2_im_bus_telefon')
            pg.set_viewport_size({'width': 1100, 'height': 680})
            steps(0.3)
            # it drives off: the rider goes with it
            p_a = J("[GAME.P.x, GAME.P.y]")
            steps(25.0)
            p_b = J("[GAME.P.x, GAME.P.y]")
            st = J("BUS.state()")
            mine = [q for q in st['inst'] if q['key'] == arr['key']]
            moved = math.hypot(p_b[0] - p_a[0], p_b[1] - p_a[1])
            ck('the bus drives on its way, the rider with it', mine and mine[0]['st'] == 'fahrt' and moved > 40, f"{moved:.0f} m, {mine[0] if mine else None}")
            pic(pg, 'd_aus_dem_bus')
            # the eye at the seat (right, behind the middle door: local x 0.98, y -1.25, 1.56 m up) also while it drives – bus and
            # camera placed in the same frame (the eye once lagged a frame's way behind and looked over its own backrest)
            probe = J("""(() => { const I = BUS.S.ride.I, g = I.B.g, c = GAME.cam; g.updateMatrixWorld(true);
              const p = c.position.clone().applyMatrix4(g.matrixWorld.clone().invert()); return [p.x, -p.z, p.y]; })()""")
            ck('the eye stays at the seat while the bus drives', abs(probe[0] - 0.98) < 0.1 and abs(probe[1] + 1.25) < 0.15 and abs(probe[2] - 1.56) < 0.1,
               'local ' + ', '.join(f'{v:.2f}' for v in probe))
            # „Fahrt abkürzen“ to the Krankenhaus (the clock jumps), from there on in real time across the edge of the square to the
            # Zentralhaltestelle (the ground there streams in as for a car: welt/welt.js tiles, welt/fahrt.js roads), out there by itself
            kk, kz = J("""(() => { const I = BUS.S.ride.I, f = n => I.Rn.P.st.findIndex(o => o.s >= 0 && BUS.plan.S.stations[o.s].n === n);
              return [f('Schleusingen, Krankenhaus'), f('Schleusingen, Zentralhaltestelle')]; })()""")
            E(f"BUS.want({kz})")
            E(f"void BUS.shorten({kk})")  # (async: it waits for the ground, which the steps below bring)
            for i in range(80):
                steps(0.3)
                time.sleep(0.3)
                if E("!BUS.S.ride || !BUS.S.ride.busy"): break
            at_k = J("BUS.state().ride")
            ck('„Fahrt abkürzen“ to the Krankenhaus: the clock jumps, the bus stands there, one rides on', at_k and at_k['k'] == kk and at_k['st'] == 'halt', f"{at_k} {E('CLOCK.hm()')}")
            # on in real time: samples of the bus's height against the ground beyond the square
            box = J("RATSCHER.box")
            samp, shot_done = [], False
            for i in range(300):
                steps(1.0)
                time.sleep(0.15)
                q = J("""(() => { const R = BUS.S.ride; if (!R) return null; const I = R.I, g = KERN.ground(I.x, I.y, I.z + 0.5);
                  return { x: I.x, y: I.y, z: I.z, g, cov: !!(WELT.covers && WELT.covers(I.x, I.y)), st: I.st, k: I.k, v: I.v, hd: I.hd, tiles: WELT.state ? WELT.state().tiles : 0 }; })()""")
                if not q: break
                out_sq = not (box[0] < q['x'] < box[2] and box[1] < q['y'] < box[3])
                if out_sq: samp.append(q)
                if out_sq and not shot_done and q['st'] == 'fahrt' and len(samp) > 8:
                    shot_done = True
                    E(f"GAME.P.yaw = {q['hd']} * 180 / Math.PI; GAME.P.pitch = -6")
                    steps(0.05); pic(pg, 'h_vorn_ausserhalb')
                    E(f"GAME.P.yaw = {q['hd']} * 180 / Math.PI + 80; GAME.P.pitch = -8")
                    steps(0.05); pic(pg, 'h2_fenster_ausserhalb')
                    E(f"GAME.P.yaw = {q['hd']} * 180 / Math.PI")
            dz = [abs(q['z'] - q['g']) for q in samp if q['cov'] and q['g'] is not None]
            ck('the bus drives out of the square on its way, on the ground there (tiles streamed)', len(samp) >= 5 and dz and max(dz) < 0.45 and max(q['tiles'] for q in samp) > 0,
               f"{len(samp)} samples outside, ground difference max {max(dz) if dz else None}, tiles {max([q['tiles'] for q in samp] or [0])}")
            out = J("({ ride: !!BUS.S.ride, P: [GAME.P.x, GAME.P.y], t: CLOCK.hm(), ev: window.__ev.filter(e => e[0] === 'bus:aus').map(e => e[1].halt), focus: CLOCK.focused })")
            zh = J("(() => { const s = BUS.STOPS().filter(q => q.name === 'Schleusingen, Zentralhaltestelle'); return s.map(q => [q.x, q.y]); })()")
            dz = min(math.hypot(out['P'][0] - x, out['P'][1] - y) for x, y in zh) if zh else 999
            print('off', out, 'dist to the ZH', round(dz, 1), flush=True)
            ck('off at Schleusingen, Zentralhaltestelle at its minute (7:50)', not out['ride'] and 'Schleusingen, Zentralhaltestelle' in out['ev'] and out['t'] in ('07:50', '07:51', '07:52') and dz < 25 and not out['focus'], f"{out} {dz:.0f} m")
            for i in range(60):
                steps(0.5)
                time.sleep(0.5)
                if E("!!(window.SCHL && SCHL.state === 'ready' && (!WELT.state || WELT.state().loading === 0))"): break
            E("""(() => { const e = BUS.STOPS().filter(q => q.name === 'Schleusingen, Zentralhaltestelle').sort((a, b) => Math.hypot(a.x - GAME.P.x, a.y - GAME.P.y) - Math.hypot(b.x - GAME.P.x, b.y - GAME.P.y))[0];
              const x = e.x - Math.cos(e.hd) * 6 - Math.sin(e.hd) * 12, y = e.y + Math.sin(e.hd) * 6 - Math.cos(e.hd) * 12;
              GAME.view(x, y, KERN.ground(x, y) + 1.7, Math.atan2(e.x - x, e.y - y) * 180 / Math.PI, -3, 62); })()""")
            steps(0.3)
            pic(pg, 'e_schleusingen_zh')
            lp = J("BUSLEUTE.state()")
            ck('someone else gets off at the Zentralhaltestelle (middle door) and walks away', lp['stats']['aus'] >= 1 or any(q['st'] in ('aus', 'geht') for q in lp['pax']), str(lp))
            E("BUSLEUTE.force = null; BUSLEUTE.clear()")
            free = J("Object.entries(VERKEHR.S.busy).filter(([k, v]) => v === 'bus').length")
            ck('no person left marked as a passenger after clearing', free == 0, str(free))
        ck.errors(errs)
        if 'nacht' in want:
            # at night: the 205 from Coburg at 22:57 at the Schleusebrücke – lamps, the lit display and inside
            E("GAME.go('bus')")
            steps(0.5)
            E("(() => { const d = Math.floor(CLOCK.t / 1440); CLOCK.t = d * 1440 + 22 * 60 + 54; })()")
            steps(1.0)
            lib.settle_light(pg)
            I = None
            for i in range(240):
                steps(1.0)
                st = J("BUS.state()")
                here = [q for q in st['inst'] if q['halt'] == 'Ratscher, Schleusebrücke' and q['st'] == 'halt' and q['open'] > 0.8]
                if here:
                    I = here[0]; break
            ck('at night the bus comes too (22:57), its lamps on', I is not None and E("BUSMOD.M.head.emissiveIntensity > 1"), f"{E('CLOCK.hm()')} {I}")
            if I:
                E(f"""(() => {{ const B = BUS.S.inst.find(q => q.key === '{I['key']}'); const fx = Math.sin(B.hd), fy = Math.cos(B.hd), rx = Math.cos(B.hd), ry = -Math.sin(B.hd);
                  const x = B.x + fx * 15 + rx * 5, y = B.y + fy * 15 + ry * 5; GAME.view(x, y, KERN.ground(x, y) + 1.7, Math.atan2(B.x - x, B.y - y) * 180 / Math.PI, -2, 60); }})()""")
                steps(0.2); pic(pg, 'f_nacht_vorn')
                E(f"""(() => {{ const B = BUS.S.inst.find(q => q.key === '{I['key']}'); const fx = Math.sin(B.hd), fy = Math.cos(B.hd), rx = Math.cos(B.hd), ry = -Math.sin(B.hd);
                  const x = B.x - fx * 4 - rx * 8, y = B.y - fy * 4 - ry * 8; GAME.view(x, y, KERN.ground(x, y) + 1.6, Math.atan2(B.x - x, B.y - y) * 180 / Math.PI, 0, 62); }})()""")
                steps(0.2); pic(pg, 'g_nacht_seite')
                p2 = E("GAME.R.info.programs.length")
                mine = own_new()
                ck('no new shader program at night either', not mine, f'{p0} → {p2}; of the bus: ' + (' | '.join(mine)[:400] or 'none') + '; others: ' + ' | '.join(new_progs())[:300])
            E("GAME.go('bus')")
            steps(0.5)
        if 'reload' in want:
            # a ride, then a reload: one stands at the stop one boarded at
            E("GAME.go('bus')")
            steps(1.0)
            E("(() => { const e = BUS.stopAt(GAME.P.x, GAME.P.y, 30); BUS.waitFor(e); })()")
            for i in range(60):
                steps(0.5)
                if not E("!!CLOCK.warp"): break
            boarded = False
            for i in range(120):
                steps(1.0)
                if E("BUS.einsteigen()"):
                    boarded = True; break
            ck('boarded a second bus (for the reload)', boarded, E("CLOCK.hm()"))
            steps(3.0)
            saved = J("SAVE.get('pav-bus-v1')")
            ck('saved during the ride: the stop (pav-bus-v1)', saved and saved.get('ride') and saved['ride'].get('name'), str(saved))
            pg.goto(f'http://localhost:{port}/index.html', timeout=300000, wait_until='domcontentloaded')
            pg.wait_for_function("window.GAME && GAME.loaded && GAME.loaded()", timeout=1500000, polling=2000)
            time.sleep(3); pg.evaluate("window.FREEZE = true")
            E, J, steps = helpers(pg)
            for i in range(60):
                steps(0.5)
                if E("!!(window.BUS && BUS.S.restored)"): break
            steps(1.0)
            ps = J("[GAME.P.x, GAME.P.y]")
            rr = saved['ride'] if saved and saved.get('ride') else {'x': 1e9, 'y': 1e9}
            d = math.hypot(ps[0] - rr['x'], ps[1] - rr['y'])
            ck('after the reload one stands at that stop', d < 6 and not E("!!BUS.S.ride"), f'{d:.1f} m from {rr}')
            ck.errors(errs)
        pg.close()
    if 'zombie' in want:
        errs2 = []
        pg = lib.page(b, 1000, 640, errs2)
        lib.boot(pg, port, '?szenario=zombie')
        E, J, steps = helpers(pg)
        # the timetable loads (it fetches between the steps), then a minute of the night's day: buses would run, none is drawn
        for i in range(60):
            steps(0.5, 0.25)
            if E("!!(window.BUS && BUS.S.state === 'ready')"): break
            time.sleep(0.5)
        # (the night's day is a Sunday by the timetable – Reformationstag: at 14:46 the 205 from Coburg is due at the Schleusebrücke)
        E("CLOCK.t = Math.floor(CLOCK.t / 1440) * 1440 + 14 * 60 + 44")
        steps(2.0, 0.25)
        st = J("BUS.state()")
        due = E("BUS.S.state === 'ready' ? BUS.plan.active(CLOCK.t, DN.e0, 0, 0).length : -1")
        print('zombie night', E("CLOCK.hm()"), E("DN.dateStr()"), 'due', due, flush=True)
        ck('in the zombie night no regular buses (though the timetable has some on the road)', st['state'] == 'ready' and due > 0 and len(st['inst']) == 0 and st['furn'] >= 0,
           f"due {due}, drawn {len(st['inst'])}, {st['state']}")
        ck.errors(errs2)
ck.done()
