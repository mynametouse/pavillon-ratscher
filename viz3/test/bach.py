# feat/bach (Falko, 19.11.2026 11:41/11:54: „der Bach fließt nicht korrekt, insbesondere im unteren Dorf Richtung Garten … der Weg
# (the first push of a new branch starts no run: this line came with the second push of kern/bach)
# parallel zum Bach weicht auch ab“ – the brook comes piped from the Schleuse under the village and out at the Gartenweg): garden/stream_geo.js.
# Checked: at the bridge and west of it the photo-set course is unchanged; east of it the centre line follows the 1 m terrain (DGM1, the
# ditch's deepest line, tools/gelaende) within 1.2 m; the open ditch ends at the pipe's mouth (TE) – beyond it flat ground, no water, no
# „Am Bach“, the sound stays at the mouth; the headwall stands there (a wall one cannot walk through); the field path is painted and named
# along the real track (OSM 2026) and the village roads have it there (no straight track on to t = 53, no bridge); no page errors.
# Pictures in out/bach/.
#   python3 viz3/test/bach.py 8951
import sys, os, json, time
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__))); import lib
port = sys.argv[1] if len(sys.argv) > 1 else '8951'
OUT = os.path.join(lib.ROOT, 'out', 'bach'); os.makedirs(OUT, exist_ok=True)
ck = lib.Checks('bach')
# the ditch's deepest line in DGM1 Thüringen (1 m), [t, o] in the frame of STREAM (tools/gelaende, 19.11.2026) – what the course must follow
DGM1 = [[34, 6.25], [40, 8.5], [46, 10.25], [52, 12.0], [58, 14.5], [64, 16.5], [70, 19.25], [76, 22.0], [82, 25.25]]
with lib.browser() as b:
    errs = []
    pg = lib.page(b, 1100, 720, errs, tier='mittel')
    lib.boot(pg, port, '', figures=False)
    E = pg.evaluate
    J = lambda s: json.loads(E('JSON.stringify(' + s + ')'))
    step = lambda n, dt=0.25: [E(f'GAME.step({dt})') for _ in range(n)]
    E("CLOCK.t = 600; GAME.go('garten'); GAME.setView3(true); HUD.setMenu && HUD.setMenu(false)")
    step(6)
    S = J("({ TB: STREAM.TB, TE: STREAM.TE, lim: STREAM.tLim, c20: STREAM.cOff(20), c26: STREAM.cOff(STREAM.TB), "
          "dev: %s.map(([t, o]) => Math.abs(STREAM.cOff(t) - o)) })" % json.dumps(DGM1))
    ck('the bridge and the course west of it as set from the photos', abs(S['c26'] - 4.6) < 0.05 and abs(S['c20'] - 6.1) < 0.4, json.dumps(S))
    ck('east of the bridge the course follows the 1 m terrain (within 1.2 m)', max(S['dev']) < 1.2, json.dumps([round(v, 2) for v in S['dev']]))
    ck('the open brook ends at the pipe\'s mouth', abs(S['TE'] - 86) < 0.01 and abs(S['lim'][1] - S['TE']) < 0.01, json.dumps(S['lim']))
    G = J("""(() => { const g = (t, o) => { const p = STREAM.wpt(t, o); return KERN.ground(p[0], p[1], 9); };
      return { in70: g(70, STREAM.cOff(70)), in84: g(84, STREAM.cOff(84)), past: g(92, STREAM.cOff(92)), old110: g(110, 37.5),
               water70: STREAM.inWater(...STREAM.wpt(70, STREAM.cOff(70))), water95: STREAM.inWater(...STREAM.wpt(95, STREAM.cOff(95))),
               out: STREAM.OUT ? { t: STREAM.OUT.t } : null }; })()""")
    ck('the ditch at t 70 and 84 is the deep one', G['in70'] < -1.2 and G['in84'] < -1.2, json.dumps(G))
    ck('past the mouth and in the lower village: flat ground, no water', G['past'] > -0.15 and G['old110'] > -0.15 and G['water70'] and not G['water95'], json.dumps(G))
    ck('the headwall with the pipe stands at the mouth', bool(G['out']) and abs(G['out']['t'] - 86) < 0.01, json.dumps(G['out']))
    P = J("""(() => { const at = (t, o) => { const p = STREAM.wpt(t, o); return KERN.place(p[0], p[1], 0); };
      return { bach70: at(70, STREAM.cOff(70)), bach95: at(95, STREAM.cOff(95)), weg70: at(70, STREAM.pathOff(70)), weg60: at(60, STREAM.pathOff(60)),
               straight70: at(70, 0) }; })()""")
    ck('„Am Bach“ at the open brook, not in the village beyond the mouth', P['bach70'] in ('Im Bach', 'Am Bach') and P['bach95'] not in ('Im Bach', 'Am Bach'), json.dumps(P, ensure_ascii=False))
    ck('„Feldweg“ along the real track, not on the old straight line', P['weg70'] == 'Feldweg' and P['weg60'] == 'Feldweg' and P['straight70'] != 'Feldweg', json.dumps(P, ensure_ascii=False))
    R = J("""(() => { if (!window.ROADS || !ROADS.ways) return null; const near = (t, o) => { const p = STREAM.wpt(t, o);
        let best = 1e9; for (const w of ROADS.ways) if (w.kind === 6) for (let i = 0; i < w.p.length; i += 2) best = Math.min(best, Math.hypot(w.p[i] - p[0], w.p[i + 1] - p[1]));
        return best; };
      return { real70: near(70, STREAM.pathOff(70)), real55: near(55, STREAM.pathOff(55)), old60: near(60, 0) }; })()""")
    ck('the village roads have the track where it is (and not on the old line)', R is not None and R['real70'] < 2.5 and R['real55'] < 2.5 and R['old60'] > 4, json.dumps(R))
    E("STREAM.listen(GAME.P.x, GAME.P.y); GAME.P.x = -30; GAME.P.y = -20; GAME.P.feet = KERN.ground(-30, -20, 9)")
    for name, v in (('a_oben_ost', "GAME.view(48, -2, 70, 0, -89.5, 60)"),
                    ('b_muendung', "(() => { const t = STREAM.TE - 6, p = STREAM.wpt(t, STREAM.cOff(t)); GAME.view(p[0], p[1], KERN.ground(p[0], p[1]) + 1.2, 138, -6, 70); })()"),
                    ('c_feldweg', "(() => { const p = STREAM.pathPt(40); GAME.view(p[0], p[1], 1.7, 140, -6, 70); })()")):
        E(v)
        for _ in range(8):
            step(1, 0.2); time.sleep(0.2)
        lib.shot(pg, OUT, name)
    ck.errors(errs)
ck.done()
