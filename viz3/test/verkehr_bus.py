# feat/verkehr-real stage 3b: a bus in the knock (verkehr/vk_bus.js, the marked hooks in bus/bus.js and bus/bus_modell.js). The scene of
# bus.py (Ratscher, Schleusebrücke, a school day at 7:38): the 205 comes at 7:46 and stands at the stop; the player's car drives into it
# from behind at ~15 km/h – the car bounces off (12.5 t against 1.2 t), the bus does not move, but it stands on with its hazard lights
# (its minutes stop) and the driver complains; then it goes on. Pictures in out/verkehr_bus/.
#   bash tools/browser_lock.sh python3 viz3/test/run.py --port 8962 --serve verkehr_bus
import sys, os, time, json, math
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import lib

port = sys.argv[1]
OUT = lib.out('verkehr_bus')
ck = lib.Checks('verkehr_bus')

with lib.browser() as b:
    errs = []
    pg = lib.page(b, 1100, 680, errs)
    lib.boot(pg, port, '?szenario=bus')
    E = pg.evaluate
    J = lambda js: json.loads(pg.evaluate('JSON.stringify(' + js + ')'))
    steps = lambda dt: E(f"GAME.step({dt})")
    for i in range(60):
        if E("!!(window.BUS && BUS.S.state === 'ready' && BUS.STOPS().length)"):
            break
        steps(0.2)
        time.sleep(0.5)
    ck('the timetable is there', E("BUS.S.state") == 'ready', E("BUS.S.state"))
    try:
        # the 205 at the stop (the clock at 7:45, in real time from there)
        E("document.querySelectorAll('#toast').forEach(e => e.style.visibility = 'hidden'); VKSTROM.force = { n: 0 }")
        E("CLOCK.t = Math.floor(CLOCK.t / 1440) * 1440 + 7 * 60 + 45; CLOCK.focus('test')")
        arr = None
        for i in range(150):
            steps(1.0)
            st = J("BUS.state()")
            here = [q for q in st['inst'] if q['halt'] == 'Ratscher, Schleusebrücke' and q['st'] == 'halt' and q['line'] == '205']
            if here:
                arr = here[0]
                break
        ck('the 205 stands at the Schleusebrücke', arr is not None, E("CLOCK.hm()"))
        if arr:
            key = arr['key']
            # held at the stop a while (people getting on), the player's car 12 m behind it in its lane, driving into it at 4 m/s
            I0 = J(f"""(() => {{ const I = BUS.S.inst.find(q => q.key === '{key}'); I.hold = Math.max(I.hold, 25);
              const fx = Math.sin(I.hd), fy = Math.cos(I.hd), back = 6 + 12 + 2.1, x0 = I.x - fx * back, y0 = I.y - fy * back;
              VEH.enter('car'); VEH.place('car', x0, y0, I.hd);
              const pts = []; for (let k = 0; k < 20; k++) pts.push([x0 + fx * k * 1.5, y0 + fy * k * 1.5]);
              VEH.cur.st.u = 4; VEH.follow(pts, 4);
              return {{ tau: I.tau, x: I.x, y: I.y, hd: I.hd }}; }})()""")
            hit = None
            for i in range(160):
                q = J(f"""(() => {{ const I = BUS.S.inst.find(q => q.key === '{key}'); GAME.step(0.05);
                  return {{ k: I.knockT || 0, g: I.knockG || null, u: Math.hypot(VEH.cur.st.u, VEH.cur.st.v), x: I.x, y: I.y, n: VKBUS.knocks }}; }})()""")
                if q['k'] > 0:
                    hit = q
                    break
            E("VEH.auto = null; VEH.cur.st.u = VEH.cur.st.v = 0; GAME.step(0.05); VEH.exit(); GAME.step(0.05)")
            print('bus knock', json.dumps(I0), json.dumps(hit), flush=True)
            ck('the car into the standing bus: a real knock for its driver (15 s)', hit is not None and hit['g'] == 'crash' and hit['k'] > 14, json.dumps(hit))
            ck('the bus does not move (12.5 t)', hit is not None and math.hypot(hit['x'] - I0['x'], hit['y'] - I0['y']) < 0.05, json.dumps(hit))
            # the doors shut, it would go – but it stands with its hazard lights while knocked; the driver's word
            E(f"(() => {{ const I = BUS.S.inst.find(q => q.key === '{key}'); I.hold = 0; }})()")
            E(f"""(() => {{ const I = BUS.S.inst.find(q => q.key === '{key}'), fx = Math.sin(I.hd), fy = Math.cos(I.hd), x = I.x - fx * 16 + Math.cos(I.hd) * 4, y = I.y - fy * 16 - Math.sin(I.hd) * 4;
              window.CAM3 && (CAM3.want = false); GAME.view(x, y, KERN.ground(x, y) + 1.8, Math.atan2(I.x - x, I.y - y) * 180 / Math.PI, -6, 55); }})()""")
            rec = []
            for i in range(40):
                r = J(f"""(() => {{ const I = BUS.S.inst.find(q => q.key === '{key}'); GAME.step(0.25); const sub = document.getElementById('verkehrsub');
                  return [+(I.knockT || 0).toFixed(2), I.blinkSide, +Math.hypot(I.x - {I0['x']}, I.y - {I0['y']}).toFixed(2), I.st, sub && !sub.hidden ? sub.textContent : '']; }})()""")
                rec.append(r)
                if i == 6:
                    lib.shot(pg, OUT, 'bus_warnblinker')
            print('after', rec[::4], flush=True)
            standing = [r for r in rec if r[0] > 0]
            ck('while knocked it stands (its minutes stop) with both indicators blinking', standing and all(r[2] < 0.05 for r in standing) and all(r[1] == 2 for r in standing), str(standing[:2]) + ' … ' + str(standing[-1:]))
            subs = [r[4] for r in rec if r[4]]
            lines = J("VKBUS.LINES.crash")
            ck('the bus driver complains', any((s.startswith('Der Busfahrer:') or s.startswith('Die Busfahrerin:')) and any(l in s for l in lines) for s in subs), str(subs[:1]))
            # then it goes on (the knock over: its minutes run again)
            moved = None
            for i in range(60):
                r = J(f"""(() => {{ const I = BUS.S.inst.find(q => q.key === '{key}'); GAME.step(0.5); return I ? [+(I.knockT || 0).toFixed(2), +Math.hypot(I.x - {I0['x']}, I.y - {I0['y']}).toFixed(2), I.st, I.blinkSide] : null; }})()""")
                if r and r[0] <= 0 and r[1] > 3:
                    moved = r
                    break
            ck('then it goes on', moved is not None, str(r))
        E("CLOCK.unfocus('test'); VKSTROM.force = { mult: 1 }")
    except Exception as ex:
        ck('section ran: bus', False, repr(ex)[:400])
    ck.errors(errs)
ck.done()
