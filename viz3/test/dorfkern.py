# feat/dorfkern: the centre of Ratscher as in Falko's video of 10.04.2023 (world/dorfkern_data.js, world/village.js, world/dorfkern.js).
# Two loads of the same build: '?dorfkern=0' (the centre as before: hash looks, fitted roofs, old places) and the normal one. Checks: the table
# applied (styles, looks, measured heights, rebuilt houses split into house and barn), the open space built (well, benches, limes, hedges,
# poles, fence, porch) with collisions, the Easter eggs on the well in the Easter weeks only, the bus stop's place name, textures per shader,
# no new shader programs to speak of, frame time and draw calls at the Anger on the light tier not worse than before by more than a little,
# no errors. Pictures from the camera fitted to the video (model only – the video stays private): out/dorfkern/a_<view>.jpg (after),
# b_<view>.jpg (before), photo view of Anger 15 (p_anger15.jpg).   python3 viz3/test/dorfkern.py PORT
import sys, os, json, time, statistics
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__))); import lib
port = sys.argv[1]; OUT = lib.out('dorfkern'); ck = lib.Checks('dorfkern')
# the pan's camera (DKDATA.cam): headings and pitches of the compared frames, vertical field of view of the video (880 px focal at 960 × 540)
VIEWS = {'h000': (0.81, 0.16), 'h045': (45.21, 1.27), 'h090': (89.49, 5.8), 'h135': (134.89, 7.71), 'h160': (158.73, 5.22), 'h225': (224.52, 4.56),
         'h270': (270.39, -1.86), 'h315': (313.44, -2.22), 'g031': (147.7, 6.59), 'g081': (77.64, 4.84), 'g111': (13.33, -0.14), 'g141': (328.76, 6.55),
         'g181': (342.06, -2.51), 'g196': (295.74, -2.38), 'g221': (245.41, 2.06)}
VFOV = 34.1
PERF = ['h160', 'g081', 'g221']   # three views at the Anger for the frame time


def prep(pg):
    E = pg.evaluate
    E("GAME.setView3 && GAME.setView3(false); document.querySelectorAll('#toast,#hud,#topbar,#minimap,#joy,.hud,#where,#tut').forEach(e => e.style.visibility = 'hidden')")
    E("if (window.DN && !DN.active) GAME.setMode('auto'); DN.e0 = Date.UTC(2023, 3, 10) / 864e5; CLOCK.t = 15 * 60 + 26; DN.update(true)")
    lib.settle_light(pg)


def look(pg, k, steps=6):
    yaw, pitch = VIEWS[k]
    pg.evaluate(f"(() => {{ const c = DKDATA.cam; GAME.view(c.x, c.y, KERN.ground(c.x, c.y) + c.eye, {yaw}, {pitch}, {VFOV}); for (let i = 0; i < {steps}; i++) GAME.step(0.25); }})()")


def perf(pg, tag):
    E = pg.evaluate; out = {'ms': [], 'calls': [], 'tris': []}
    E("GAME.R.info.autoReset = false")
    for k in PERF:
        look(pg, k)
        E("GAME.shot()")   # warm (programs, uploads)
        for _ in range(4):
            E("GAME.R.info.reset()"); t = E("(() => { const t0 = performance.now(); GAME.shot(); GAME.R.getContext().finish(); return performance.now() - t0; })()")
            out['ms'].append(t)
        inf = E("({ c: GAME.R.info.render.calls, t: GAME.R.info.render.triangles })"); out['calls'].append(inf['c']); out['tris'].append(inf['t'])
    E("GAME.R.info.autoReset = true")
    out['med'] = statistics.median(out['ms']); out['programs'] = E("GAME.R.info.programs.length")
    print(tag, json.dumps({k: (round(v, 1) if isinstance(v, float) else v) for k, v in out.items() if k != 'ms'}), flush=True)
    return out


def shots(pg, prefix):
    for k in VIEWS:
        look(pg, k); lib.shot(pg, OUT, prefix + k)


with lib.browser() as b:
    errs = []
    # ---- before: the same build without the table and the open space ----
    pg = lib.page(b, 960, 597, errs, tier='schnell'); lib.boot(pg, port, '?dorfkern=0'); prep(pg)
    off = pg.evaluate("!!(DKDATA.off && !DORFKERN.ready && VILLAGE.ready)")
    ck('?dorfkern=0 loads the centre as before', off)
    before = perf(pg, 'before')
    shots(pg, 'b_')
    pg.close()
    # ---- after ----
    pg = lib.page(b, 960, 597, errs, tier='schnell'); lib.boot(pg, port); prep(pg); E = pg.evaluate
    st = json.loads(E("""JSON.stringify((() => {
      const L = DKDATA.houses, ST = VILLAGE.ST, out = { n: VILLAGE.bld.length, rows: [] }, parts = VILLAGE.parts || new Map();
      for (const id of Object.keys(L)) {
        const d = L[id], row = { id: +id, st: d.st || null };
        if (d.roof3) {
          const ps = [...parts.entries()].filter(([, p]) => p.of === +id).map(([pid]) => VILLAGE.byId.get(pid)).filter(Boolean);
          const f = ps.find(b => b.st.dk === d), bk = ps.find(b => b !== f);
          row.parts = ps.length; row.ok = !!f && (!d.st || f.st.style === ST[d.st]) && f.typ === 0;
          if (f) { const e = Array.isArray(d.roof3.e) ? Math.min(...d.roof3.e) : d.roof3.e; row.eave = +f.eave.toFixed(2); row.top = +f.top.toFixed(2); row.hOk = Math.abs(f.eave - e) < 0.3 && Math.abs(f.top - d.roof3.r) < 0.3; row.roof = !!(f.roof && f.roof.kind === 0); }
          row.backOk = !d.back || (!!bk && (!d.back.st || bk.st.style === ST[d.back.st]));
          row.gone = !VILLAGE.byId.get(+id);
        } else {
          const b = VILLAGE.byId.get(+id);
          row.ok = !!b && (!d.st || b.st.style === ST[d.st]) && b.st.dk === d;
          if (b && d.h) { row.eave = +b.eave.toFixed(2); row.top = +b.top.toFixed(2); row.hOk = Math.abs(b.eave - d.h[0]) < 0.3 && Math.abs(b.top - d.h[1]) < 0.4; }
          if (b && d.roof) row.roof = !!b.roof;
          if (b && d.doorAz !== undefined) row.door = b.fac.some(f => f.door);
        }
        out.rows.push(row);
      }
      out.school = VILLAGE.byId.get(215) && VILLAGE.byId.get(215).st.style === ST.SCHOOL;
      return out; })())"""))
    for r in st['rows']:
        print('house', json.dumps(r), flush=True)
    bad = [r['id'] for r in st['rows'] if not r.get('ok') or r.get('hOk') is False or r.get('backOk') is False or r.get('gone') is False or r.get('door') is False]
    ck('every house of the table has its look (style, colours, door, heights)', not bad and len(st['rows']) >= 15, f"{len(st['rows'])} houses, wrong: {bad}")
    rb = [r for r in st['rows'] if 'parts' in r]
    ck('rebuilt houses: gable roof, house at the street and barn behind, the old block gone', rb and all(r['parts'] == 2 and r['roof'] and r['gone'] for r in rb), json.dumps([(r['id'], r['parts'], r.get('eave'), r.get('top')) for r in rb]))
    ck('the old school keeps its style, eave and ridge as measured', st['school'] and any(r['id'] == 215 and r.get('hOk') for r in st['rows']))
    ck('all buildings still there (+1 per rebuilt house)', st['n'] == 337 + len(rb), f"{st['n']} buildings")
    o = json.loads(E("""JSON.stringify((() => { const s = DORFKERN.state(), w = DKDATA.open.well.c, a = [w[0] - 2.6, w[1]], hit = WCOL.pushCircle(a, 0.3);
      const sh = DKDATA.open.shelter.c, name = VPROPS.place(sh[0], sh[1]); const b = DKDATA.open.benches[0], hb = WCOL.pushCircle([b[0], b[1]], 0.3);
      return Object.assign(s, { hitWell: !!hit, hitBench: !!hb, name, lamps: VPROPS.lamps.length, linde: VPROPS.LINDE }); })())"""))
    print('open', json.dumps(o, ensure_ascii=False), flush=True)
    ck('the open space is built: well, benches, hedges, fence, poles, porch – four meshes, collisions', o['ready'] and o['meshes'] >= 4 and o['segs'] > 30, json.dumps(o))
    ck('the two limes by the well stand where the video shows their trunks', o['limes'] == 2)
    ck('the well and the benches stop the walker', o['hitWell'] and o['hitBench'])
    ck('bus stop and Dorflinde where the video shows them', o['name'] == 'Ratscher · Schulbushaltestelle' and abs(o['linde'][1] + 109.0) < 0.01, f"{o['name']} {o['linde']}")
    eg = json.loads(E("""JSON.stringify((() => { const d = (y, m, dd) => Date.UTC(y, m - 1, dd) / 864e5;
      const r = { mon2023: DORFKERN.isEaster(d(2023, 4, 10)), june: DORFKERN.isEaster(d(2023, 6, 1)), palm2026: DORFKERN.isEaster(d(2026, 3, 29)), oct: DORFKERN.isEaster(d(2026, 10, 30)) };
      GAME.step(0.3); r.shown = !!(DORFKERN.garland && DORFKERN.garland.visible);
      const e0 = DN.e0; DN.e0 = d(2023, 6, 1); GAME.step(0.3); r.hidden = !!(DORFKERN.garland && !DORFKERN.garland.visible); DN.e0 = e0; GAME.step(0.3); return r; })())"""))
    ck('Easter eggs on the well only in the Easter weeks (10 April 2023 yes, June no)', eg['mon2023'] and eg['palm2026'] and not eg['june'] and not eg['oct'] and eg['shown'] and eg['hidden'], json.dumps(eg))
    after = perf(pg, 'after')
    ck('frame time at the Anger (light tier) not worse than before by more than a little', after['med'] <= before['med'] * 1.10 + 25, f"median {before['med']:.0f} -> {after['med']:.0f} ms")
    ck('draw calls and shader programs: only a few more', sum(after['calls']) <= sum(before['calls']) + 3 * 8 and after['programs'] <= before['programs'] + 3,
       f"calls {before['calls']} -> {after['calls']}, triangles {before['tris']} -> {after['tris']}, programs {before['programs']} -> {after['programs']}")
    good, r = lib.check_gl(pg)
    ck('every shader within 16 textures per stage', good, f"fragment {r['maxFrag']}, vertex {r['maxVert']}, {r['bad'][:3]}")
    shots(pg, 'a_')
    # Falko's photo of Anger 15 (portrait, from the paving north of the well, looking south-south-east)
    pg.set_viewport_size({'width': 405, 'height': 597}); time.sleep(1)
    E("GAME.view(263.5, -116, KERN.ground(263.5, -116) + 1.5, 183, 3, 67); for (let i = 0; i < 6; i++) GAME.step(0.25)"); lib.shot(pg, OUT, 'p_anger15')
    errs = [e for e in errs if 'Texture marked' not in e]
    ck.errors(errs)
    ck.done()
