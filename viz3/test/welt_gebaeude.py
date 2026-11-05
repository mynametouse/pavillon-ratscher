# feat/welt-gebaeude (Falko, 5.11.2026: „Häuserdächer, die … flach sind … in ein vollständiges, typisches, passendes, dreidimensionales Gebäude“):
# the buildings OpenStreetMap lacked, from ETHOS.BUILDA (gebaeude/gebaeude.js GEB, data viz3/extra/welt-gebaeude/dist/gebaeude/). Checks:
# built at load, how many per kind, none doubled (no new footprint more than a fifth under an OSM building of the village), known places
# where a roof was flat in the ground image now have a building (the farm hall south of the garden, the big round tank, a shed in the
# village) – pictures from the ground and from above, before (?nogeb) and after; walking into one stops at its wall; the canopy trees that
# were roofs are hidden; no new shader programs when looking at them; no page errors; the start (garden) as before.
#   python3 viz3/test/welt_gebaeude.py 8997 [sections]      sections: load,places,walk,before (default all)
import sys, os, json, time, math
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__))); import lib
port = sys.argv[1] if len(sys.argv) > 1 else '8951'
want = set((sys.argv[2] if len(sys.argv) > 2 else 'load,places,walk,before').split(','))
ck = lib.Checks('welt_gebaeude')
OUT = lib.out('welt_gebaeude')
# known places (model metres): a roof only in the ground image before, a building of the data now – and where to look from
SPOTS = {}   # the ground views found in the first run, used again in the run without the buildings
PLACES = [
    # name, point inside, ground view (x, y, yaw, pitch), top view (x, y, height)
    ('halle', (9.7, -134.2), (-25.0, -108.0, 125, -2), (10, -134, 70)),
    ('tank', (-128.0, -47.8), (-95.0, -70.0, 305, 2), (-115, -40, 75)),
    ('dorf', (164.1, -144.9), (140.0, -118.0, 140, -3), (160, -140, 60)),
    ('anger', None, None, (215, -95, 110)),   # the centre from above: the ground between the houses without printed roofs
]
with lib.browser() as b:
    errs = []
    pg = lib.page(b, 1100, 680, errs, tier='hoch')
    lib.boot(pg, port)
    E = pg.evaluate
    J = lambda js: json.loads(E("JSON.stringify(" + js + ")"))
    progs = lambda: E("GAME.R.info.programs.length")
    def pic(name):
        try: lib.shot(pg, OUT, name)
        except Exception as e: print('shot failed', name, e, flush=True)
    def top(x, y, h):
        E(f"(() => {{ const P = GAME.P; P.mode = 'top'; P.tx = {x}; P.ty = {y}; P.th = {h}; document.body.dataset.mode = 'top'; GAME.step(0.05); }})()")
    def ground(x, y, yaw, pitch):
        E(f"(() => {{ document.body.dataset.mode = 'walk'; GAME.view({x}, {y}, KERN.ground({x}, {y}) + 1.6, {yaw}, {pitch}, 60); for (let i = 0; i < 4; i++) GAME.step(0.25); }})()")
    st = J("""({ on: GEB.on, ready: GEB.ready, n: GEB.n, err: GEB.err, ms: GEB.ms, seg: GEB.nSeg, trees: GEB.trees, meshes: GEB.meshes.length,
      kinds: GEB.bld.reduce((o, b) => (o[b.k] = (o[b.k] || 0) + 1, o), {}), stats: GEB.stats, village: VILLAGE.bld.length, wcol: WCOL.nSeg,
      sameMat: GEB.meshes.length > 1 && GEB.meshes[0].material === RATSCHER.bld[0].material && GEB.meshes[1].material === VILLAGE.meshes[0].material })""")
    print('state', json.dumps(st), flush=True)
    ROOFS = J("VILLAGE.bld.map(b => b.roof ? [b.roof.kind, ...b.roof.col.map(v => +v.toFixed(3))] : null)")
    ground_info = J("({ retouched: GEBDACH.retouched, near: GEOMAN.tex.near.file, inner: GEOMAN.tex.inner.file, dach: !!GEBDACH.near && !!GEBDACH.inner })")
    print('ground', json.dumps(ground_info), flush=True)
    if 'load' in want:
        ck('the ground images of Ratscher are the retouched ones, the roof colours come from the originals', ground_info['retouched'] and ground_info['near'].endswith('_r.jpg') and ground_info['inner'].endswith('_r.jpg') and ground_info['dach'], json.dumps(ground_info))
        ck('the buildings are built at load (Ratscher: more than 250)', st['ready'] and st['n'] > 250 and not st['err'], f"{st['n']} in {st['ms']} ms, err {st['err']!r}")
        ck('all kinds there: houses, barns/halls, sheds/garages, tanks', all(st['kinds'].get(k, 0) > 0 for k in ('0', '1', '2', '4')), json.dumps(st['kinds']))
        ck('drawn with the village\'s own materials (no programs of their own)', st['sameMat'], '')
        ck('their walls are in the collisions of the square (WCOL)', st['seg'] > 1000 and st['wcol'] >= st['seg'], f"{st['seg']} segments, WCOL {st['wcol']}")
        ck('the village itself unchanged (337 OSM buildings + rebuilt parts)', 337 <= st['village'] <= 350, str(st['village']))
        ck('canopy trees that were roofs hidden', st['trees'] >= 20, str(st['trees']))
        # none doubled: sample points of each new footprint inside an OSM building of the village
        dup = J("""(() => { const inside = (F, x, y) => { let c = false; for (const f of F) if (f.ay > y !== f.by > y && x < ((f.bx - f.ax) * (y - f.ay)) / (f.by - f.ay) + f.ax) c = !c; return c; };
          const V = VILLAGE.bld.filter(v => v.bb), bad = [];
          for (const b of GEB.bld) { let n = 0, k = 0; const xs = [], ys = []; for (let i = 0; i < b.f.length; i += 2) { xs.push(b.f[i]); ys.push(b.f[i + 1]); }
            const x0 = Math.min(...xs), x1 = Math.max(...xs), y0 = Math.min(...ys), y1 = Math.max(...ys);
            for (let i = 0; i < 8; i++) for (let j = 0; j < 8; j++) { const x = x0 + (x1 - x0) * (i + 0.5) / 8, y = y0 + (y1 - y0) * (j + 0.5) / 8;
              let c = false; for (let p = 0, q = xs.length - 1; p < xs.length; q = p++) if (ys[p] > y !== ys[q] > y && x < ((xs[q] - xs[p]) * (y - ys[p])) / (ys[q] - ys[p]) + xs[p]) c = !c;
              if (!c) continue; n++; if (V.some(v => x >= v.bb[0] && x <= v.bb[2] && y >= v.bb[1] && y <= v.bb[3] && inside(v.fac, x, y))) k++; }
            if (n && k / n > 0.2) bad.push([b.id, +(k / n).toFixed(2), +b.cx.toFixed(1), +b.cy.toFixed(1)]); }
          return bad; })()""")
        ck('none doubled (no new footprint more than a fifth inside a village building)', len(dup) == 0, json.dumps(dup[:8]))
        # no new footprint in the hand-modelled site (garden, Hubert, Ronald)
        site = J("GEB.bld.filter(b => b.cx > -58 && b.cx < 42 && b.cy > -52 && b.cy < 48).length")
        ck('nothing new in the hand-modelled garden and yards', site == 0, str(site))
    # a free spot (inside no building, 2 m from every wall) 16–34 m from a building, looking at it; same in both runs (deterministic)
    SPOT = """((x, y) => { const inF = (f, px, py) => { let c = false; for (let p = 0, q = f.length - 2; p < f.length; q = p, p += 2) if (f[p + 1] > py !== f[q + 1] > py && px < ((f[q] - f[p]) * (py - f[p + 1])) / (f[q + 1] - f[p + 1]) + f[p]) c = !c; return c; };
        const flat = []; for (const v of VILLAGE.bld) { const f = []; for (const q of v.fac) f.push(q.ax, q.ay); flat.push(f); } for (const b of (window.GEB && GEB.bld) || []) flat.push(b.f);
        const free = (px, py) => !flat.some(f => inF(f, px, py) || inF(f, px + 2, py) || inF(f, px - 2, py) || inF(f, px, py + 2) || inF(f, px, py - 2));
        for (const d of [18, 24, 30, 36]) for (let k = 0; k < 16; k++) { const a = k * Math.PI / 8, px = x + Math.sin(a) * d, py = y + Math.cos(a) * d; if (free(px, py)) return [px, py, (Math.atan2(x - px, y - py) * 180 / Math.PI + 360) % 360]; }
        return null; })"""
    def look_at(px, py):
        sp = SPOTS.get((px, py)) or J(f"{SPOT}({px}, {py})")
        SPOTS[(px, py)] = sp
        if sp: ground(sp[0], sp[1], sp[2], -3)
        return sp
    hide = lambda on: E(f"(() => {{ for (const m of (window.GEB && GEB.meshes) || []) m.visible = {'false' if on else 'true'}; }})()")
    if 'places' in want:
        # warm up every view without the new buildings (other things seen there for the first time may bring programs of their own) …
        hide(True)
        for name, pt, gv, tv in PLACES:
            top(*tv); E("GAME.shot()")
            if pt: look_at(*pt); E("GAME.shot()")
        E("document.body.dataset.mode = 'walk'")
        hide(False)
        p0 = progs()
        # … then the same views with them: no new programs (they are drawn with the village's materials)
        for name, pt, gv, tv in PLACES:
            if not pt:
                top(*tv); pic(f'{name}_top'); continue
            px, py = pt
            hit = J(f"""(() => {{ const x = {px}, y = {py}; for (const b of GEB.bld) {{ const f = b.f; let c = false;
              for (let p = 0, q = f.length - 2; p < f.length; q = p, p += 2) if (f[p + 1] > y !== f[q + 1] > y && x < ((f[q] - f[p]) * (y - f[p + 1])) / (f[q + 1] - f[p + 1]) + f[p]) c = !c;
              if (c) return {{ id: b.id, k: b.k, h: b.h, e: b.e, r: b.r, z0: +b.z0.toFixed(2), A: Math.round(b.A) }}; }} return null; }})()""")
            ck(f'{name}: a building stands where the roof was flat in the ground image', hit is not None, json.dumps(hit))
            top(*tv); pic(f'{name}_top')
            sp = look_at(px, py); pic(f'{name}_boden'); print(name, 'seen from', sp, flush=True)
        E("document.body.dataset.mode = 'walk'")
        p1 = progs()
        ck('no new shader programs for the buildings', p1 <= p0, f'{p0} -> {p1}')
    if 'walk' in want:
        # walk at the farm hall's west wall from 6 m away: the walker stops at the wall, does not end up inside
        r = J("""(() => { const b = GEB.bld.find(b => { const f = b.f; let c = false; const x = 9.7, y = -134.2;
            for (let p = 0, q = f.length - 2; p < f.length; q = p, p += 2) if (f[p + 1] > y !== f[q + 1] > y && x < ((f[q] - f[p]) * (y - f[p + 1])) / (f[q + 1] - f[p + 1]) + f[p]) c = !c; return c; });
          if (!b) return null;
          // the facade facing west (outward normal x < 0) and its middle
          let best = null; for (const f of b.F) { const L = Math.hypot(f[2] - f[0], f[3] - f[1]), nx = (f[3] - f[1]) / L; if (L > 4 && (!best || nx < best.nx)) best = { nx, ny: -(f[2] - f[0]) / L, mx: (f[0] + f[2]) / 2, my: (f[1] + f[3]) / 2 }; }
          const sx = best.mx + best.nx * 6, sy = best.my + best.ny * 6, yaw = Math.atan2(-best.nx, -best.ny) * 180 / Math.PI;
          GAME.view(sx, sy, KERN.ground(sx, sy) + 1.6, yaw, 0, 60); GAME.P.body = yaw;
          for (let i = 0; i < 160; i++) GAME.step(0.025, 1);
          const P = GAME.P, d = (P.x - best.mx) * best.nx + (P.y - best.my) * best.ny;
          return { start: [+sx.toFixed(1), +sy.toFixed(1)], end: [+P.x.toFixed(2), +P.y.toFixed(2)], d: +d.toFixed(2), moved: +Math.hypot(P.x - sx, P.y - sy).toFixed(2) }; })()""")
        ck('walking into the farm hall stops at its wall', r is not None and r['moved'] > 2 and r['d'] > 0.1, json.dumps(r))
        pic('halle_wand')
    ck.errors(errs)
if 'before' in want:
    # the same pictures without the new buildings (?nogeb) – for the before/after comparison
    with lib.browser() as b:
        errs2 = []
        pg = lib.page(b, 1100, 680, errs2, tier='hoch')
        lib.boot(pg, port, '?nogeb&bodenalt')
        E = pg.evaluate
        ck('?nogeb: no buildings of the data', E("!GEB.on && !GEB.meshes.length"), '')
        alt = json.loads(E("JSON.stringify({ near: GEOMAN.tex.near.file, inner: GEOMAN.tex.inner.file, retouched: GEBDACH.retouched })"))
        ck('?bodenalt: the original ground images', not alt['retouched'] and alt['near'] == 'ortho_near.jpg' and alt['inner'] == 'ortho_inner.jpg', json.dumps(alt))
        roofs0 = json.loads(E("JSON.stringify(VILLAGE.bld.map(b => b.roof ? [b.roof.kind, ...b.roof.col.map(v => +v.toFixed(3))] : null))"))
        if 'ROOFS' in dir() and ground_info.get('retouched'):
            diff = [i for i, (p_, q_) in enumerate(zip(ROOFS, roofs0)) if (p_ is None) != (q_ is None) or (p_ and (p_[0] != q_[0] or max(abs(a_ - b_) for a_, b_ in zip(p_[1:], q_[1:])) > 0.03))]
            ck('the village roofs keep their colours with the retouched ground (taken from the originals)', len(ROOFS) == len(roofs0) and len(diff) <= 3, f'{len(diff)} of {len(roofs0)} differ: {diff[:6]}')
        for name, pt, gv, tv in PLACES:
            if tv:
                E(f"(() => {{ const P = GAME.P; P.mode = 'top'; P.tx = {tv[0]}; P.ty = {tv[1]}; P.th = {tv[2]}; document.body.dataset.mode = 'top'; GAME.step(0.05); }})()")
                lib.shot(pg, OUT, f'{name}_top_vorher')
            sp = SPOTS.get(pt) if pt else None
            if sp:
                E(f"(() => {{ document.body.dataset.mode = 'walk'; GAME.view({sp[0]}, {sp[1]}, KERN.ground({sp[0]}, {sp[1]}) + 1.6, {sp[2]}, -3, 60); for (let i = 0; i < 4; i++) GAME.step(0.25); }})()")
                lib.shot(pg, OUT, f'{name}_boden_vorher')
ck.done()
