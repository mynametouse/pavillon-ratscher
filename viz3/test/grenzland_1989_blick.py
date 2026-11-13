# feat/grenzland-1989: today's village from the standpoints of the flashback's pictures (to compare with viz3/test/grenzland_1989.py:
# out/grenzland_1989/*.jpg), and the numbers the flashback's world is built on (facades, lamps, chimneys, what stands about) as
# out/grenzland_1989_blick/probe.json. Not in tests.txt – a tool for looking, run by hand:
#   bash tools/browser_lock.sh python3 viz3/test/run.py --port 9014 --serve grenzland_1989_blick
import sys, os, json, time
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__))); import lib
port = sys.argv[1] if len(sys.argv) > 1 else '8951'
ck = lib.Checks('grenzland_1989_blick')
OUT = lib.out('grenzland_1989_blick')
# the standpoints: name, x, y, yaw (compass degrees), pitch
SPOTS = [('a_haltestelle', 250.5, -107.5, 288, -2), ('b_schule', 216.5, -98.5, 98, -1), ('c_anger', 209.0, -113.0, 62, 0),
         ('d_brunnen', 268.0, -113.0, 282, -1)]
with lib.browser() as b:
    errs = []
    pg = lib.page(b, 1100, 680, errs, tier='mittel')
    lib.boot(pg, port, '?szenario=grenzland', figures=True)
    E = pg.evaluate
    J = lambda js: json.loads(E("JSON.stringify(" + js + ")"))
    steps = lambda secs, dt=0.1: E(f"for (let i = 0; i < {max(1, int(secs / dt))}; i++) GAME.step({dt})")
    # the afternoon of a 10th of November, as the flashback sets it (the date of today's year), the first person's eyes
    E("(() => { const d = Math.floor(CLOCK.t / 1440); DN.e0 = Date.UTC(2026, 10, 10) / 864e5 - d; CLOCK.t = d * 1440 + 15 * 60 + 35; DN.update(true); GAME.setView3(false); })()")
    for name, x, y, yaw, pitch in SPOTS:
        E(f"GAME.view({x}, {y}, KERN.ground({x}, {y}) + 1.62, {yaw}, {pitch})")
        for _ in range(8):
            steps(0.5); time.sleep(0.4)
        lib.settle_light(pg)
        E(f"GAME.view({x}, {y}, KERN.ground({x}, {y}) + 1.62, {yaw}, {pitch})")
        lib.shot(pg, OUT, 'heute_' + name)
    probe = J("""(() => {
      const r = v => Math.round(v * 100) / 100, near = (x, y, R = 110) => Math.hypot(x - 236, y + 100) < R;
      const bld = VILLAGE.bld.filter(b => near(b.cx, b.cy, 120)).map(b => ({ id: b.id, typ: b.typ, c: [r(b.cx), r(b.cy)], foot: r(b.foot), st: b.st && b.st.style,
        chim: b.chim ? b.chim.map(r) : null, adr: (DKDATA.houses[b.id] || {}).adr || '',
        fac: b.fac.map(f => ({ a: [r(f.ax), r(f.ay)], b: [r(f.bx), r(f.by)], L: r(f.L), n: [r(f.nx), r(f.ny)], t0: r(f.t0), t1: r(f.t1), kind: f.kind, tA: r(f.tA),
          door: f.door ? r(f.door.u) : null })) }));
      const lamps = VPROPS.lamps.filter(l => near(l.x, l.y, 170)).map(l => [r(l.x), r(l.y), r(l.z)]);
      const cells = []; for (const c of DINGE.cells.values()) if (c.built) cells.push({ k: c.k, places: c.places.filter(p => near(p.x, p.y, 150)).map(p => [r(p.x), r(p.y), p.on, p.type]),
        things: c.things.filter(d => near(d.x, d.y, 150)).map(d => [d.t, r(d.x), r(d.y)]) });
      const g = (x, y) => r(KERN.ground(x, y));
      return { bld, lamps, cells, dcars: Object.entries(DCARS.cars || {}).map(([k, c]) => [k, c.g ? c.g.visible : null, c.g ? r(c.g.position.x) : 0, c.g ? r(-c.g.position.z) : 0]), dorfHold: !!DORF.S.hold, night: r(VILLAGE.night()), sunEl: DN.state && r(DN.state.sunEl),
        ground: { schule: g(236, -93), anger: g(222, -108), halt: g(248.8, -100.8), linde: g(217, -109), brunnen: g(266, -121.4), treff: g(117, -304) },
        vnear: [...VNEAR.cells.values()].filter(c => c.ready).length, meshes: { vprops: VPROPS.meshes.length, dorfkern: DORFKERN.meshes.length },
        wetter: WETTER.state().label, preset: WETTER.state().preset, bus: BUS.state().inst.length, peds: VERKEHR.S.peds.length, vcars: (window.VAUTO ? VAUTO.cars.length : -1),
        figM: AVATAR.fig ? Object.keys(AVATAR.fig).slice(0, 30) : null, bones: AVATAR.fig && AVATAR.fig.B ? Object.keys(AVATAR.fig.B).slice(0, 80) : null };
    })()""")
    open(os.path.join(OUT, 'probe.json'), 'w').write(json.dumps(probe, indent=1))
    ck('the probe has the buildings round the school', len(probe['bld']) > 8, str(len(probe['bld'])))
    # the core's people of 1989 as they are painted now: a row before the school, front and back
    ids = ['erna', 'horst', 'renate', 'maik', 'ines', 'abv', 'vopo', 'lutz']
    E("window.__f = []; (async () => { for (const id of %s) { const F = await GLFIG.make(id, { era: '1989' }); window.__f.push(F); } window.__fd = true; })()" % json.dumps(ids))
    for _ in range(240):
        if E("!!window.__fd"): break
        time.sleep(0.5)
    n = E("window.__f.filter(Boolean).length")
    ck('the people of 1989 load', n == len(ids), str(n) + ' ' + str(E("GLFIG.err")))
    E("window.__f.forEach((F, i) => F && GLFIG.place(F, 222 + i * 1.15, -99.6 - i * 0.32, Math.PI * 1.05))")
    for name, yaw, dx, dy in [('vorn', 15, -0.6, -4.6), ('hinten', 195, 1.6, 4.4)]:
        for part, i0 in [('1', 1.5), ('2', 5.5)]:
            x, y = 222 + i0 * 1.15 + dx, -99.6 - i0 * 0.32 + dy
            E(f"GAME.view({x}, {y}, KERN.ground({x}, {y}) + 1.5, {yaw}, -4, 34)")
            steps(0.3)
            lib.shot(pg, OUT, f'leute_kern_{name}_{part}')
    ck.errors(errs)
    ck.done()
