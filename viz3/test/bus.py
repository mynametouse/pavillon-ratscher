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
import sys, os, json, time, math
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__))); import lib
port = sys.argv[1] if len(sys.argv) > 1 else '8951'
want = set((sys.argv[2] if len(sys.argv) > 2 else 'fahrt,reload,zombie').split(','))
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

with lib.browser() as b:
    errs = []
    if 'fahrt' in want or 'reload' in want:
        pg = lib.page(b, 1100, 680, errs)
        lib.boot(pg, port, '?szenario=bus')
        E, J, steps = helpers(pg)
        for i in range(60):
            if E("!!(window.BUS && BUS.S.state === 'ready' && BUS.STOPS().length)"): break
            steps(1.0)
        steps(1.0)
        st = J("BUS.state()")
        ck('the timetable is there (stations, trips, stops on the roads)', st['state'] == 'ready' and st['stations'] >= 25 and st['trips'] >= 200 and st['stops'] >= 30,
           f"{st['state']} {st['err']} stations {st['stations']} trips {st['trips']} stops {st['stops']}")
        info = J("""(() => { const B = BUS.plan, e = BUS.stopAt(GAME.P.x, GAME.P.y, 30), d = B.day(DN.e0 + Math.floor(CLOCK.t / 1440));
          return { stop: e && e.name, kind: d.kind, t: CLOCK.hm(), P: [GAME.P.x, GAME.P.y], dep: e ? B.departures(e.s, CLOCK.t, DN.e0, 40).map(q => q.trip.line + ' ' + B.hm(q.t) + ' ' + q.trip.head) : [] }; })()""")
        print('scene', info['stop'], info['kind'], info['t'], info['P'], flush=True)
        ck('the scene: at Ratscher, Schleusebrücke on a school day at 7:38', info['stop'] == 'Ratscher, Schleusebrücke' and 'Schultag' in info['kind'] and info['t'] == '07:38', str(info)[:300])
        lines = set(d.split(' ')[0] for d in info['dep'])
        ck("a workday's departures at Ratscher: the 203 and the 205", '203' in lines and '205' in lines, ', '.join(info['dep'][:12]))
        steps(2.0)
        st = J("BUS.state()")
        ck('the stop sign stands there (built near the walker)', st['furn'] >= 1, f"furniture {st['furn']}")
        E("GAME.shot()"); steps(0.3)
        p0 = E("GAME.R.info.programs.length")
        # the board
        brd = J("""(() => { const e = BUS.stopAt(GAME.P.x, GAME.P.y, 30); const a = KERN.acts().find(q => q.id === 'bus:plan:' + e.i);
          const lbl = a ? a.label() : null; BUS.board(e); const el = document.getElementById('busboard');
          return { lbl, shown: !!el && !el.hidden, rows: el ? [...el.querySelectorAll('tr')].map(r => r.textContent) : [], wait: !!(el && el.querySelector('[data-k=warten]')) }; })()""")
        print('board', brd, flush=True)
        ck('the board: „Fahrplan“ at the sign, the next departures of this kerb', brd['lbl'] and brd['lbl'].startswith('Fahrplan') and brd['shown'] and len(brd['rows']) >= 4 and brd['wait'],
           f"{brd['lbl']} | " + ' / '.join(brd['rows'][:5]))
        ck('the board shows the 205 to Schleusingen at 7:46', any('7:46' in r and '205' in r for r in brd['rows']), ' / '.join(brd['rows'][:5]))
        page_pic(pg, 'a_fahrplan')
        # waiting: the clock jumps to a minute before the bus
        E("document.querySelector('#busboard [data-k=warten]').click()")
        for i in range(40):
            steps(0.5)
            if not E("!!CLOCK.warp"): break
        w = J("({ t: CLOCK.hm(), focus: CLOCK.focused, ev: window.__ev.filter(e => e[0] === 'bus:warten').length })")
        ck('„Auf den Bus warten“: the clock jumps to 7:45, then runs in real time (the bus is due)', w['t'] == '07:45' and w['focus'] and w['ev'] >= 1, str(w))
        # the bus comes at its minute and stops at the sign
        arr = None
        for i in range(90):
            steps(1.0)
            st = J("BUS.state()")
            here = [q for q in st['inst'] if q['halt'] == 'Ratscher, Schleusebrücke' and q['st'] == 'halt' and q['line'] == '205']
            if here and here[0]['open'] > 0.8:
                arr = here[0]; break
        t_arr = E("CLOCK.hm()")
        ck('the 205 comes at its minute (7:46) and stands at the stop with open doors', arr is not None and t_arr in ('07:46', '07:47'), f"{t_arr} {arr}")
        if arr:
            d = J(f"(() => {{ const e = BUS.stopAt(GAME.P.x, GAME.P.y, 30); return Math.hypot({arr['x']} - e.x, {arr['y']} - e.y); }})()")
            ck('the bus stands beside the sign (its middle within 9 m of the stop)', d < 9, f'{d:.1f} m')
            # a picture from the kerb, looking along the bus
            E(f"""(() => {{ const e = BUS.stopAt(GAME.P.x, GAME.P.y, 30), I = BUS.S.inst.find(q => q.key === '{arr['key']}');
              const fx = Math.sin(I.hd), fy = Math.cos(I.hd), rx = Math.cos(I.hd), ry = -Math.sin(I.hd);
              const x = I.x + fx * 16 + rx * 6, y = I.y + fy * 16 + ry * 6, yaw = Math.atan2(I.x - x, I.y - y) * 180 / Math.PI;
              GAME.view(x, y, KERN.ground(x, y) + 1.7, yaw, -3, 60); }})()""")
            steps(0.2); pic(pg, 'b_bus_an_der_haltestelle')
            E("GAME.go && GAME.go('bus')")
            steps(0.3)
            p1 = E("GAME.R.info.programs.length")
            ck('no new shader program for the bus, the sign and the display', p1 == p0, f'{p0} → {p1}')
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
            # it drives off: the rider goes with it
            p_a = J("[GAME.P.x, GAME.P.y]")
            steps(25.0)
            p_b = J("[GAME.P.x, GAME.P.y]")
            st = J("BUS.state()")
            mine = [q for q in st['inst'] if q['key'] == arr['key']]
            moved = math.hypot(p_b[0] - p_a[0], p_b[1] - p_a[1])
            ck('the bus drives on its way, the rider with it', mine and mine[0]['st'] == 'fahrt' and moved > 40, f"{moved:.0f} m, {mine[0] if mine else None}")
            pic(pg, 'd_aus_dem_bus')
            # the next stop: Krankenhaus, then the Zentralhaltestelle – „Fahrt abkürzen“ to the Zentralhaltestelle
            kz = J("(() => { const I = BUS.S.ride.I; return I.Rn.P.st.findIndex(o => BUS.plan.S.stations[o.s].n === 'Schleusingen, Zentralhaltestelle'); })()")
            E(f"BUS.want({kz})")
            E("BUS.shorten()")
            for i in range(60):
                steps(0.5)
                if E("!BUS.S.ride || !BUS.S.ride.busy"): break
            for i in range(30):
                steps(0.5)
                if E("!BUS.S.ride"): break
            out = J("({ ride: !!BUS.S.ride, P: [GAME.P.x, GAME.P.y], t: CLOCK.hm(), ev: window.__ev.filter(e => e[0] === 'bus:aus').map(e => e[1].halt), focus: CLOCK.focused })")
            zh = J("(() => { const s = BUS.STOPS().filter(q => q.name === 'Schleusingen, Zentralhaltestelle'); return s.map(q => [q.x, q.y]); })()")
            dz = min(math.hypot(out['P'][0] - x, out['P'][1] - y) for x, y in zh) if zh else 999
            print('off', out, 'dist to the ZH', round(dz, 1), flush=True)
            ck('„Fahrt abkürzen“: off at Schleusingen, Zentralhaltestelle at 7:50', not out['ride'] and 'Schleusingen, Zentralhaltestelle' in out['ev'] and out['t'] in ('07:50', '07:51') and dz < 25 and not out['focus'], f"{out} {dz:.0f} m")
            pic(pg, 'e_schleusingen_zh')
        ck.errors(errs)
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
            pg.reload(wait_until='domcontentloaded')
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
        steps(30.0, 0.25)
        st = J("BUS.state()")
        ck('in the zombie night no regular buses', st['state'] in ('ready', 'idle', 'loading') and len(st['inst']) == 0, str(st)[:200])
        ck.errors(errs2)
ck.done()
