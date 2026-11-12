# feat/zukunft-welt: what the futures look like in the world (zukunft/zk_welt.js ZKWELT), driven through the what-if mode (ZUKUNFT).
# Per topic: before („Heute“) and after, on foot and from 60 m – pictures in out/zukunft_welt/ to LOOK AT and compare with real photos;
# numbers: PV modules on real roof planes, the park's tables/fence/station, Rufbus plates at the real stops and the van, the flood's
# cells and its connection to the river, the brook's level, the forest's stages and young trees by year; no new shader programs after
# the mode started (warm), draw calls within budget, a phone-sized page, leaving restores „Heute“ (trees, meshes, weather), no page errors.
#   python3 viz3/test/zukunft_welt.py 9008 [sections]   sections: start,pv,park,mobil,wasser,wald,budget,ende,telefon
import sys, os, json, time
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__))); import lib
port = sys.argv[1] if len(sys.argv) > 1 else '8951'
want = set((sys.argv[2] if len(sys.argv) > 2 else 'start,pv,park,mobil,wasser,wald,budget,ende,telefon').split(','))
ck = lib.Checks('zukunft_welt')
OUT = lib.out('zukunft_welt')
NOBLUR = "document.head.insertAdjacentHTML('beforeend', '<style>*{backdrop-filter:none!important;-webkit-backdrop-filter:none!important}</style>')"
YI = {2026: 0, 2030: 1, 2035: 2, 2045: 3, 2060: 4}


def session(pg, errs, phone=False):
    E = pg.evaluate
    J = lambda js: json.loads(E("JSON.stringify(" + js + ")"))
    steps = lambda secs, dt=0.05: E(f"for (let i = 0; i < {max(1, int(secs / dt))}; i++) GAME.step({dt})")
    progs = lambda: E("GAME.R.info.programs.length")
    st = lambda: J("ZKWELT.stats()")

    def world(topic, vid='heute', year=2045):
        E(f"ZUKUNFT.setTopic('{topic}')")
        if vid != 'heute':
            E(f"ZUKUNFT.S.a['{topic}'] = '{vid}'")
        E(f"ZUKUNFT.setYear({YI[year]})")
        E("ZUKUNFT.show('heute')" if vid == 'heute' else "ZUKUNFT.show('a')")
        time.sleep(0.35)
        E("WETTER.snap && WETTER.snap()")
        steps(0.3)

    def look(x, y, h, yaw, pitch, fov=60):
        # a camera at h m above the terrain, compass yaw, pitch in degrees; let the near details load, then set it again (no falling)
        js = f"GAME.view({x}, {y}, (KERN.terrain({x}, {y}) || 0) + {h}, {yaw}, {pitch}, {fov})"
        E(js); steps(1.2); E(js); E("DN.update && DN.update(true)")

    def pic(name):
        try:
            lib.shot(pg, OUT, name)
        except Exception as e:
            print('shot failed', name, repr(e)[:200], flush=True)

    def calls():
        # draw calls and triangles of the main pass (shadow passes have no scene): a wrapper round renderBufferDirect for one frame
        return J("""(() => { const R = GAME.R, orig = R.renderBufferDirect; let calls = 0, tris = 0;
          R.renderBufferDirect = function (cam, scene, geo, mat, obj, group) {
            if (scene) { calls++; const n = geo.index ? geo.index.count : geo.attributes.position.count,
                t = ((obj.isInstancedMesh ? obj.count : 1) * Math.min(n, geo.drawRange.count)) / 3; tris += t;
                if ((obj.name || '').startsWith('zukunft')) { zc++; zt += t; } }
            return orig.apply(this, arguments); };
          let zc = 0, zt = 0;
          try { GAME.shot(); } finally { R.renderBufferDirect = orig; }
          return { calls, tris: Math.round(tris), zc, zt: Math.round(zt) }; })()""")

    return E, J, steps, progs, st, world, look, pic, calls


def run():
    with lib.browser() as b:
        errs = []
        P = {}
        if want & {'start', 'pv', 'park', 'mobil', 'wasser', 'wald', 'budget', 'ende'}:
            pg = lib.page(b, 1280, 760, errs, tier='hoch')
            lib.boot(pg, port)
            E, J, steps, progs, st, world, look, pic, calls = session(pg, errs)
            E(NOBLUR)
            E("window.CAM3 && (CAM3.want = false)")
            # the same light for every picture: a clear November noon (the weather of the test browser is the calendar's)
            E("if (window.DN && !DN.active) GAME.setMode('auto'); CLOCK.t = Math.floor(CLOCK.t / 1440) * 1440 + 12 * 60 + 30; DN.update(true)")
            E("WETTER.preset && WETTER.preset('klar'); WETTER.snap && WETTER.snap()")
            lib.settle_light(pg)
            P['load'] = progs()
            E("ZUKUNFT.enter()"); steps(0.5)
            P['warm'] = progs()
            E("window.__zkP0 = new Set(GAME.R.info.programs.map(p => p.cacheKey))")
            newp = lambda: J("GAME.R.info.programs.filter(p => !__zkP0.has(p.cacheKey)).map(p => p.name + ' …' + String(p.cacheKey).slice(-48))")
            print('programs: after load', P['load'], 'after the mode started (warm)', P['warm'], flush=True)
            s = st()
            ck('the mode started, its materials compiled once (warm)', s['warmed'] and E("ZUKUNFT.S.on"), str(s))
            ck('starting the mode adds at most two shader programs (the mud band, the plate)', P['warm'] - P['load'] <= 2, f"{P['load']} → {P['warm']}")
            sp = J("ZKWELT.spots()")
            print('spots', json.dumps({k: v for k, v in sp.items() if k != 'river'}), flush=True)

            if 'start' in want:
                R = J("(() => { const R = ZKWELT.scanRoofs(); return { mods: R.mods.length, flats: R.flats.length, planes: R.P.length, all: R.planes, n: R.n, kwp: Math.round(R.kwp), ms: R.ms }; })()")
                print('roofs', R, 'left out:', J("ZKWELT.S.roofWhy"), flush=True)
                ck('roof planes found on the 3D buildings, modules laid out (and fast)', R['planes'] > 40 and R['mods'] > 800 and R['ms'] < 3000, str(R))
                ck('modules only on planes facing ESE…W (none facing north)', E("ZKWELT.S.roof.P.filter(p => !p.flat).every(p => Math.atan2(p.n[0], p.n[1]) * 180 / Math.PI + 360 > 0 && ((Math.atan2(p.n[0], p.n[1]) * 180 / Math.PI + 360) % 360) >= 110 && ((Math.atan2(p.n[0], p.n[1]) * 180 / Math.PI + 360) % 360) <= 275)"), '')
                K = J("(() => { const P = ZKWELT.fieldTables(); return { T: P.T.length, F: P.F.length, posts: P.posts.length, ha: +P.ha.toFixed(2), kwp: Math.round(P.kwp), rows: P.rows }; })()")
                print('park', K, flush=True)
                ck('the park: tables in rows, a fence of spans, about 1–3 ha', K['T'] >= 40 and K['F'] > 80 and 1.0 < K['ha'] < 3.2, str(K))
                # no table on a road, a building or water; every table inside the field polygon with its margin
                bad = J("""(() => { const P = ZKWELT.fieldTables(), out = [];
                  for (const t of P.T) { const e = window.ROADS && ROADS.edge ? ROADS.edge(t.x, t.y) : -99; const v = window.VILLAGE && VILLAGE.bld ? VILLAGE.bld.some(b => Math.hypot(b.cx - t.x, b.cy - t.y) < 14) : false; if (e > -4 || v) out.push([t.x, t.y, e, v]); } return out; })()""")
                ck('no table on a road or by a building', not bad, str(bad[:4]))
                c = J("ZUKUNFT.S.ctx")
                ck('the indicators read the world (roof kWp, the park\'s hectares)', c and c['roof']['src'] == 'welt' and c['field']['src'] == 'welt', str(c and {'roof': c['roof'], 'field': c['field']}))

            if 'pv' in want:
                print('programs before', 'pv', progs(), newp(), flush=True)
                world('energie', 'heute', 2045)
                look(222, -205, 60, 0, -30); pic('10-pv-dorf-60m-heute')
                world('energie', 'dach', 2045)
                s = st()
                ck('PV 2045: modules on the roofs (80 % of the suitable ones)', s['roofTotal'] > 500 and 0.7 < s['roofModules'] / s['roofTotal'] <= 1, str({k: s[k] for k in ('roofModules', 'roofTotal', 'roofPlanes', 'roofMs')}))
                look(222, -205, 60, 0, -30); pic('11-pv-dorf-60m-2045')
                look(150, -60, 60, 120, -30); pic('12-pv-dorf-60m-west-2045')
                # on foot, in front of the village houses with the most modules (a place in the open, from ZKWELT.spots)
                for k, r0 in enumerate(sp['roofs'][:2]):
                    look(r0['cam'][0], r0['cam'][1], 1.7, r0['yaw'], max(2, min(25, r0['pitch']))); pic(f'13-pv-dach-zu-fuss-{k}-2045')
                # all suitable planes at once (which roofs the scan finds; a check picture, not a variant)
                E("ZKWELT.apply({ pvRoof: 1 }, 2045)")
                look(222, -205, 60, 0, -30); pic('16-pv-dorf-60m-alle-flaechen')
                world('energie', 'heute', 2045)
                if sp['roofs']:
                    r0 = sp['roofs'][0]
                    look(r0['cam'][0], r0['cam'][1], 1.7, r0['yaw'], max(2, min(25, r0['pitch']))); pic('14-pv-dach-zu-fuss-heute')
                world('energie', 'dach', 2030)
                s30 = st()
                ck('PV 2030: fewer modules than 2045 (a quarter), whole buildings', 0 < s30['roofModules'] < s['roofModules'] * 0.5, f"{s30['roofModules']} vs {s['roofModules']}")
                look(222, -205, 60, 0, -30); pic('15-pv-dorf-60m-2030')

            if 'park' in want:
                print('programs before', 'park', progs(), newp(), flush=True)
                pk = sp['park']
                world('energie', 'heute', 2030)
                look(140, -480, 60, 45, -28); pic('20-park-60m-heute')
                world('energie', 'park', 2030)
                s = st()
                ck('the park stands: all tables, the fence, the station', s['fieldTables'] == s['fieldTotal'] > 40 and s['fence'] > 80 and s['station'], str({k: s[k] for k in ('fieldTables', 'fieldTotal', 'fence', 'station')}))
                look(140, -480, 60, 45, -28); pic('21-park-60m')
                look(240, -452, 1.7, 15, 3); pic('22-park-zu-fuss-sued')
                look(300, -335, 1.7, 190, -2); pic('23-park-zu-fuss-nord')
                look(sp['station'][0] + 9, sp['station'][1] + 14, 1.7, 215, -2); pic('24-park-station')
                world('energie', 'heute', 2030)
                look(240, -452, 1.7, 15, 3); pic('25-park-zu-fuss-sued-heute')
                world('energie', 'waerme', 2045)
                s = st()
                ck('heat pumps: units at the houses', s['wp'] > 10, str(s['wp']))
                u = J("ZKWELT.S.wp && ZKWELT.S.wp[0] ? [ZKWELT.S.wp[0].x, ZKWELT.S.wp[0].y] : null")
                if u:
                    look(u[0] + 4, u[1] - 5, 1.7, 320, -8); pic('26-waermepumpe')

            if 'mobil' in want:
                print('programs before', 'mobil', progs(), newp(), flush=True)
                world('mobil', 'heute', 2030)
                look(236, -121, 1.7, 30, 0); pic('30-haltestelle-heute')
                world('mobil', 'bank', 2030)
                s = st()
                ck('the Mitfahrbank stands', s['bank'], str(s['bank']))
                bq = J("AMTWORLD.state().at.mitfahrbank")
                if bq:
                    import math
                    look(bq[0] - 4.5, bq[1] - 5.5, 1.7, (math.degrees(math.atan2(4.5, 5.5)) + 360) % 360, -6); pic('31-haltestelle-mitfahrbank')
                world('mobil', 'ruf', 2030)
                s = st()
                ck('Rufbus: plates at the real stops of Ratscher, the van at the Anger', s['plates'] >= 1 and s['van'], str({k: s[k] for k in ('plates', 'van', 'bank')}))
                vp = J("ZKWELT.S.ruf && ZKWELT.S.ruf.vp")
                look(236, -121, 1.7, 30, 0); pic('32-haltestelle-rufbus')
                if vp:
                    import math
                    a = math.radians(vp[2] + 70)
                    look(vp[0] + math.sin(a) * 9, vp[1] + math.cos(a) * 9, 1.7, (vp[2] + 250) % 360, -3); pic('33-rufbus-kleinbus')
                stops = J("BUS.STOPS().filter(e => /^Ratscher/.test(e.name)).map(e => [e.x, e.y, e.az, e.shelter, e.name])")
                print('stops', stops, flush=True)
                if stops:
                    import math
                    e = [q for q in stops if not q[3]][:1] or stops[:1]
                    e = e[0]; a = math.radians(e[2])
                    look(e[0] + math.sin(a) * 4 - math.cos(a) * 2.5, e[1] + math.cos(a) * 4 + math.sin(a) * 2.5, 1.7, (e[2] + 200) % 360, 2); pic('34-rufbus-schild')

            if 'wasser' in want:
                print('programs before', 'wasser', progs(), newp(), flush=True)
                world('klima', 'heute', 2026)
                look(330, -175, 60, 320, -27); pic('40-hochwasser-dorf-60m-heute')
                for vid, tag in (('dez23', 'dez23'), ('hoch', 'hq100')):
                    world('klima', vid, 2026)
                    s = st()
                    fi = s['floodInfo'] or {}
                    print('flood', vid, json.dumps(fi), flush=True)
                    ck(f'the flood ({vid}): a surface along the Schleuse, connected to it, a mud band, flotsam', s['flood'] > 0.5 and fi.get('cells', 0) > 100 and s['mud'] and fi.get('flotsam', 0) > 10, str(fi))
                    if vid == 'dez23':
                        ck('December 2023: modest – no more houses in the water than the variant assumes, the river and the meadows next to it', fi.get('houses', 99) <= fi.get('want', -1) and not fi.get('usg'), str(fi))
                    else:
                        ck('HQ100: the official flood area (Überschwemmungsgebiet of the state)', fi.get('usg') is True, str(fi))
                    # never a plate through hills: nothing farther than 160 m from the river line (the valley)
                    far = J("""(() => { const g = ZKWELT.S.floodMesh.geometry.attributes.position; let far = 0, n = 0;
                      for (let i = 0; i < g.count; i += 37) { const x = g.getX(i), y = -g.getZ(i); let d = 1e9;
                        for (const p of ZKWELT.RIVER) d = Math.min(d, Math.hypot(p[0] - x, p[1] - y)); n++; if (d > 160) far++; } return [far, n]; })()""")
                    ck(f'the flood ({vid}) stays in the valley (nothing farther than 160 m from the river)', far[0] == 0, str(far))
                    look(330, -175, 60, 320, -27); pic(f'41-hochwasser-{tag}-dorf-60m')
                    look(196, -40, 1.7, 30, -2); pic(f'42-hochwasser-{tag}-bruecke-zu-fuss')
                    look(560, -420, 60, 340, -28); pic(f'43-hochwasser-{tag}-unter-damm-60m')
                world('klima', 'heute', 2026)
                look(196, -40, 1.7, 30, -2); pic('44-bruecke-heute')
                bk = J("""(() => { let c = null; GAME.scene.traverse(o => { if (!c && o.isMesh && o.material && o.material.customProgramCacheKey && !o.name.startsWith('zukunft')) { try { if (o.material.customProgramCacheKey() === 'brook') { o.geometry.computeBoundingSphere(); const s = o.geometry.boundingSphere.center; c = [s.x, -s.z, s.y]; } } catch (e) {} } }); return c; })()""")
                world('klima', 'regen', 2026)
                s = st()
                ck('Starkregen: rain, wet ground, the brook higher', s['brookDz'] > 0.1 and J("WETTER.state().preset") in ('starkregen', None), str({'brookDz': s['brookDz']}))
                look(222, -128, 1.7, 0, 0); pic('45-starkregen-dorf')
                if bk:
                    look(bk[0] + 4, bk[1] - 5, 1.7, 320, -18); pic('46-starkregen-bach')
                world('klima', 'duerre', 2045)
                s = st()
                ck('Dürre: dry ground, the brook low', s['dry'] > 0.5 and s['brookDz'] < 0, str({'dry': s['dry'], 'brookDz': s['brookDz']}))
                look(222, -128, 1.7, 0, 0); pic('47-duerre-dorf')
                look(140, -480, 60, 45, -28); pic('48-duerre-felder-60m')
                if bk:
                    look(bk[0] + 4, bk[1] - 5, 1.7, 320, -18); pic('49-duerre-bach')

            if 'wald' in want:
                print('programs before', 'wald', progs(), newp(), flush=True)
                c = sp['core']
                world('wald', 'heute', 2026)
                look(-420, -470, 60, 215, -27); pic('50-wald-60m-heute')
                look(c[0], c[1], 1.7, 200, 4); pic('51-wald-zu-fuss-heute')
                last = None
                for vid, year in (('umbau', 2030), ('umbau', 2035), ('umbau', 2045), ('umbau', 2060), ('natur', 2035), ('natur', 2060)):
                    world('wald', vid, year)
                    s = st()
                    print(vid, year, json.dumps(s['forest']), json.dumps(s['young']), flush=True)
                    look(-420, -470, 60, 215, -27); pic(f'5{2 if vid == "umbau" else 7}-wald-{vid}-{year}-60m')
                    look(c[0], c[1], 1.7, 200, 4); pic(f'5{2 if vid == "umbau" else 7}-wald-{vid}-{year}-zu-fuss')
                    if vid == 'umbau' and year == 2030:
                        ck('2030: spruces struck – red and grey crowns', s['forest'].get('rot', 0) + s['forest'].get('grau', 0) > 100, str(s['forest']))
                    if vid == 'umbau' and year == 2060:
                        ck('2060 Waldumbau: the spruces cleared, a young mixed stand', s['forest'].get('kahl', 0) > 500 and sum(s['young'].get(k, 0) for k in ('buche', 'tanne', 'eiche', 'ahorn')) > 200, str(s['young']))
                    if vid == 'natur' and year == 2060:
                        ck('2060 natural regeneration: spruce and birch, dead trees lying in the family forest', s['young'].get('fichte', 0) + s['young'].get('birke', 0) > 100 and s['forest'].get('liegt', 0) > 20, str(s['forest']) + str(s['young']))
                    last = s
                # the year slider changes the forest
                world('wald', 'umbau', 2035); a = st()['young']
                world('wald', 'umbau', 2060); b2 = st()['young']
                ck('the year slider changes the forest (more young trees later)', sum(b2.values()) > sum(a.values()), f"{sum(a.values())} → {sum(b2.values())}")

            if 'budget' in want:
                print('programs before', 'budget', progs(), newp(), flush=True)
                world('energie', 'heute', 2045)
                look(222, -205, 60, 0, -30); c0 = calls()
                world('energie', 'dach', 2045)
                look(222, -205, 60, 0, -30); c1 = calls()
                world('energie', 'park', 2030)
                look(140, -480, 60, 45, -28); c2 = calls()
                world('energie', 'heute', 2030)
                look(140, -480, 60, 45, -28); c3 = calls()
                world('wald', 'umbau', 2060)
                look(-420, -470, 60, 215, -27); c4 = calls()
                world('wald', 'heute', 2060)
                look(-420, -470, 60, 215, -27); c5 = calls()
                print('draw calls / triangles', c0, c1, c3, c2, c5, c4, flush=True)
                # (the world streams details in and out at a place: a few calls of noise)
                # the futures' own draws (meshes named zukunft:…): the world streams details in and out, its counts are only printed
                ck('roof PV: at most 4 draw calls of its own', c1['zc'] <= 4, str(c1))
                ck('the park: at most 9 draw calls of its own', c2['zc'] <= 9, str(c2))
                ck('the young forest: at most 12 draw calls of its own', c4['zc'] <= 12, str(c4))
                ck('triangles within budget (at most 700 000 of its own for a whole variant in view)', max(c1['zt'], c2['zt'], c4['zt']) < 700000, f"{c1['zt']} {c2['zt']} {c4['zt']}")

            if 'ende' in want:
                print('programs before', 'ende', progs(), newp(), flush=True)
                # every topic, variant and year again at the views seen before (the world's own lazy programs came with the first visits):
                # nothing of the futures may compile now
                E("window.__zkP1 = new Set(GAME.R.info.programs.map(p => p.cacheKey))")
                P['mid'] = progs()
                VIEWS = {'energie': (222, -205, 60, 0, -30), 'mobil': (236, -121, 1.7, 30, 0), 'klima': (330, -175, 60, 320, -27), 'wald': (-420, -470, 60, 215, -27)}
                for t, vids in (('energie', ('dach', 'park', 'waerme')), ('mobil', ('bank', 'ruf', 'takt')), ('klima', ('regen', 'vorsorge', 'dez23', 'hoch', 'duerre')), ('wald', ('natur', 'umbau'))):
                    for v in vids:
                        for y in (2035, 2060):
                            world(t, v, y)
                            look(*VIEWS[t]); E("GAME.shot()")
                P['end'] = progs()
                added = J("GAME.R.info.programs.filter(p => !__zkP1.has(p.cacheKey)).map(p => p.name + ' …' + String(p.cacheKey).slice(-48))")
                ck('no new shader programs while switching topics, variants and years', P['end'] == P['mid'], f"{P['mid']} → {P['end']} {added}")
                print('programs: load', P['load'], 'warm', P['warm'], 'after the pictures (the world loading where the camera went)', P['mid'], 'end', P['end'], flush=True)
                E("window.__zkT = FOREST.list.filter(t => t.sp === 'spruce').slice(0, 3000).map(t => [t.h, t.w, t.tint ? 1 : 0, t.tilt ? 1 : 0])")
                E("ZUKUNFT.exit()"); steps(0.5)
                s = st()
                vis = J("(() => { const o = []; GAME.scene.traverse(m => { if (m.name && m.name.startsWith('zukunft:') && m.visible) o.push(m.name); }); return o; })()")
                ck('leaving: nothing of the futures is visible', not vis and s['flood'] == 0 and not s['van'], str(vis))
                ok = J("ZKWELT.S.forest ? ZKWELT.S.forest.L.every((t, i) => t.h === ZKWELT.S.forest.orig[i].h && t.w === ZKWELT.S.forest.orig[i].w && !t._zkFall) : true")
                ck('leaving: every spruce back as it was (height, crown, upright)', ok, '')
                ck('leaving: the brook and the ground back', s['brookDz'] == 0 and s['dry'] == 0, str({'brookDz': s['brookDz'], 'dry': s['dry']}))
                ck('no errors inside the world module', not s['err'], str(s['err']))
                ok_gl, rep = lib.check_gl(pg, 16)
                ck('every program within 16 textures, none broken', ok_gl, str(rep.get('bad'))[:300])
            ck.errors(errs)
            pg.close()

        if 'telefon' in want:
            # a phone: coarse pointer (fewer instances, simpler modules), the mode from the address, each topic once
            perrs = []
            pg = b.new_page(viewport={'width': 390, 'height': 844}, is_mobile=True, has_touch=True, device_scale_factor=2)
            lib.preset(pg, 'schnell')
            pg.on('pageerror', lambda e: perrs.append('PAGEERR ' + str(e)))
            lib.boot(pg, port, '?szenario=zukunft')
            E, J, steps, progs, st, world, look, pic, calls = session(pg, perrs, True)
            p0 = progs()
            for t, v, y in (('energie', 'dach', 2045), ('energie', 'park', 2030), ('mobil', 'ruf', 2030), ('klima', 'hoch', 2026), ('wald', 'umbau', 2060)):
                world(t, v, y)
            s = st()
            ck('phone: every topic shown, no new programs', E("ZUKUNFT.S.on") and progs() == p0, f"{p0} → {progs()}")
            ck('phone: fewer young trees (coarse pointer)', sum(v for k, v in s['young'].items() if k not in ('stump', 'brush', 'guard')) <= 2600, str(s['young']))
            look(-420, -470, 60, 215, -27); pic('90-telefon-wald')
            ck.errors(perrs)
            pg.close()
    ck.done()


run()
