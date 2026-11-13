# feat/zeitreise-welt: what the chronicle's states look and sound like (zukunft/zk_zeitwelt*.js ZKZEITWELT) – the slopes around the village,
# logging, the heating house and its trench, the wind turbine, the heavy-rain night and its morning, the blackout night, the ambience.
# Driven by the real chronicle (ZKCHRONIK.state, at(ev, p)) – contact sheets at 1920×1080 in out/zeitreise_welt/ to LOOK AT and compare with
# real photos (dead spruce slopes in the Harz and the Thuringian Forest, a street after heavy rain, a heat-network trench, a turbine in forest).
# Checks: the API and places; the slopes' colour changes with the years (pixels of the slope region); each state shows its things; the split
# puts what differs on layers 21/22 and the two halves differ; clear() restores today (uniforms, things, the village's lights); programs
# only in warm() (+0 on set and in the split); draw calls of its own; no page errors.
#   python3 viz3/test/zeitreise_welt.py 9013 [sections]   sections: api,hang,dinge,nacht,split,ende
import sys, os, json, time, math
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__))); import lib
from PIL import Image, ImageDraw, ImageStat
port = sys.argv[1] if len(sys.argv) > 1 else '8951'
want = set((sys.argv[2] if len(sys.argv) > 2 else 'api,hang,dinge,nacht,split,ende').split(','))
ck = lib.Checks('zeitreise_welt')
OUT = lib.out('zeitreise_welt')
NOBLUR = "document.head.insertAdjacentHTML('beforeend', '<style>*{backdrop-filter:none!important;-webkit-backdrop-filter:none!important}</style>')"


def sheet(name, names, cols=3, w=640):
    # a contact sheet: the pictures in a grid with their names (one image to look at instead of many)
    ims = [(n, Image.open(os.path.join(OUT, n + '.jpg'))) for n in names if os.path.exists(os.path.join(OUT, n + '.jpg'))]
    if not ims: return None
    h = int(w * ims[0][1].height / ims[0][1].width)
    rows = (len(ims) + cols - 1) // cols
    S = Image.new('RGB', (cols * w, rows * (h + 22)), (20, 20, 20))
    d = ImageDraw.Draw(S)
    for i, (n, im) in enumerate(ims):
        x, y = (i % cols) * w, (i // cols) * (h + 22)
        S.paste(im.resize((w, h)), (x, y + 22)); d.text((x + 6, y + 5), n, fill=(240, 240, 240))
    f = os.path.join(OUT, name + '.jpg'); S.save(f, quality=86); print('sheet', f, flush=True)
    return f


def region(name, box):
    # mean colour of a region (fractions of the picture) – the slopes' change in numbers
    f = os.path.join(OUT, name + '.jpg')
    if not os.path.exists(f): return [0, 0, 0]
    im = Image.open(f).convert('RGB')
    W, H = im.size
    c = im.crop((int(box[0] * W), int(box[1] * H), int(box[2] * W), int(box[3] * H)))
    return [round(v, 1) for v in ImageStat.Stat(c).mean]


def run():
    with lib.browser() as b:
        errs = []
        pg = lib.page(b, 1920, 1080, errs, tier='mittel')
        lib.boot(pg, port)
        E = pg.evaluate
        J = lambda js: json.loads(E("JSON.stringify(" + js + ")"))
        progs = lambda: E("GAME.R.info.programs.length")
        steps = lambda secs, dt=0.05: E(f"for (let i = 0; i < {max(1, int(secs / dt))}; i++) GAME.step({dt})")
        E(NOBLUR)
        E("window.CAM3 && (CAM3.want = false)")

        def look(x, y, h, yaw, pitch, fov=60):
            js = f"GAME.view({x}, {y}, (KERN.terrain({x}, {y}) || 0) + {h}, {yaw}, {pitch}, {fov})"
            E(js); steps(1.0); E(js); E("DN.update && DN.update(true)")

        def at_place(pid, fov=60):
            # a place's pose (ZKZEITWELT.place) → GAME.view (yaw and pitch from the look point)
            p = J(f"ZKZEITWELT.place('{pid}')")
            if not p: return False
            (x, y, z), (lx, ly, lz) = p['pos'], p['look']
            yaw = (math.degrees(math.atan2(lx - x, ly - y)) + 360) % 360
            pitch = math.degrees(math.atan2(lz - z, math.hypot(lx - x, ly - y)))
            js = f"GAME.view({x}, {y}, {z}, {yaw:.1f}, {pitch:.1f}, {fov})"
            E(js); steps(1.0); E(js); E("DN.update && DN.update(true)")
            return True

        def clock(h, preset='klar'):
            E(f"if (window.DN && !DN.active) GAME.setMode('auto'); CLOCK.t = Math.floor(CLOCK.t / 1440) * 1440 + {int(h * 60)}; DN.update(true)")
            E(f"WETTER.preset && WETTER.preset({json.dumps(preset)}); WETTER.snap && WETTER.snap()")
            lib.settle_light(pg)

        def one(w, y=None, ev=None, p=0.5):
            if ev: return f"ZKCHRONIK.state('{w}', ZKCHRONIK.at(ZKCHRONIK.find('{w}', '{ev}'), {p}))"
            return f"ZKCHRONIK.state('{w}', {y})"

        def state(w, y=None, ev=None, p=0.5):
            L = one(w, y, ev, p)
            E(f"ZKZEITWELT.set({L}, null); ZKZEITWELT.sound({L}, null, 'L')")
            steps(0.3)

        def pic(name):
            try:
                lib.shot(pg, OUT, name)
            except Exception as e:
                print('shot failed', name, repr(e)[:200], flush=True)

        def calls():
            return J("""(() => { const R = GAME.R, orig = R.renderBufferDirect; let calls = 0, tris = 0, zc = 0, zt = 0;
              R.renderBufferDirect = function (cam, scene, geo, mat, obj, group) {
                if (scene) { calls++; const n = geo.index ? geo.index.count : geo.attributes.position.count,
                    t = ((obj.isInstancedMesh ? obj.count : 1) * Math.min(n, geo.drawRange.count)) / 3; tris += t;
                    if ((obj.name || '').startsWith('zeitreise')) { zc++; zt += t; } }
                return orig.apply(this, arguments); };
              try { GAME.shot(); } finally { R.renderBufferDirect = orig; }
              return { calls, tris: Math.round(tris), zc, zt: Math.round(zt) }; })()""")

        ok_api = E("!!window.ZKZEITWELT && !!window.ZKCHRONIK && ['warm', 'set', 'place', 'sound', 'clear'].every(k => typeof ZKZEITWELT[k] === 'function')")
        ck('ZKZEITWELT and ZKCHRONIK are there (warm, set, place, sound, clear)', ok_api, '')
        clock(13)
        P = {'load': progs()}
        E("window.__p0 = new Set(GAME.R.info.programs.map(p => p.cacheKey))")
        E("ZKZEITWELT.warm()")
        P['warm'] = progs()
        print('programs: load', P['load'], 'warm', P['warm'], 'new', J("GAME.R.info.programs.filter(p => !__p0.has(p.cacheKey)).map(p => p.name)"), flush=True)
        E("window.__p1 = new Set(GAME.R.info.programs.map(p => p.cacheKey))")
        st = J("ZKZEITWELT.stats()")
        print('stats after warm', json.dumps(st)[:900], flush=True)
        ck('warm(): the slopes are ready (far cards with conifers, the terrain patched)', st['parts']['hang']['ready'] and st['parts']['hang']['conifers'] > 3000, json.dumps(st['parts']['hang']))

        if 'api' in want:
            pl = J("Object.fromEntries(['heizhaus', 'windrad', 'kahlflaeche', 'strasse', 'anger'].map(k => [k, ZKZEITWELT.place(k)]))")
            print('places', json.dumps(pl), flush=True)
            ck("place(): a pose for each built place, null for the regie's own", all(pl[k] and len(pl[k]['pos']) == 3 and len(pl[k]['look']) == 3 for k in ('heizhaus', 'windrad', 'kahlflaeche', 'strasse')) and pl['anger'] is None, '')
            sites = J("({ dinge: ZKZEITWELT.dinge.sites(), nacht: (s => ({ flood: s.flood.length, fronts: s.fronts.length, cam: s.cam, engine: s.engine, school: !!s.school, container: s.container }))(ZKZEITWELT.nacht.sites()) })")
            d = sites['dinge']
            print('sites', json.dumps({'heiz': d['heiz'], 'trench': len(d['trench']), 'wind': d['wind'], 'kahl': d['kahl'], 'oil': d['oil'], 'nacht': sites['nacht']}), flush=True)
            ck('sites: a trench path to the Anger, the flood street with houses along it, the school', len(d['trench']) > 20 and sites['nacht']['flood'] > 15 and sites['nacht']['fronts'] >= 3 and sites['nacht']['school'], '')
            m = J("ZKZEITWELT.sound(" + one('allein', ev='starkregen', p=0.3) + ", null, 'L')")
            ck('sound(): the heavy-rain night has water and sirens', m and m['water'] > 0.5 and m['sirens'] == 1, json.dumps(m))

        if 'hang' in want:
            # the slopes south of the village from the Anger (eye height) and from 90 m above it, by year and world
            V = [('anger', 222, -108, 1.65, 190, 3, 55), ('hoch', 222, -108, 90, 195, -10, 60)]
            S = [('heute', 'allein', 2026.5), ('allein-2029', 'allein', 2029.5), ('allein-2045', 'allein', 2045.5), ('gewappnet-2045', 'gewappnet', 2045.5)]
            names, cols = [], {}
            for tag, w, y in S:
                state(w, y)
                for v in V:
                    look(*v[1:]); n = f'hang-{v[0]}-{tag}'; pic(n); names.append(n)
                    cols[n] = region(n, (0.0, 0.3, 1.0, 0.62) if v[0] == 'hoch' else (0.0, 0.38, 1.0, 0.5))
            E("ZKZEITWELT.hang.debug(2)"); state('allein', 2034); look(*V[1][1:]); pic('hang-stufen-2034'); names.append('hang-stufen-2034'); E("ZKZEITWELT.hang.debug(0)")
            sheet('hang', names, cols=3)
            print('slope colours', json.dumps(cols), flush=True)
            d = lambda a, c: sum(abs(x - y) for x, y in zip(cols[a], cols[c]))
            ck('the slopes change colour with the years (overview: today → 2029 red-grey)', d('hang-hoch-heute', 'hang-hoch-allein-2029') > 9, f"{cols['hang-hoch-heute']} → {cols['hang-hoch-allein-2029']}")
            ck('the slopes change seen from the Anger (eye height)', d('hang-anger-heute', 'hang-anger-allein-2029') > 4, f"{cols['hang-anger-heute']} → {cols['hang-anger-allein-2029']}")
            ck('the two worlds look different in 2045 (pioneer wood and dead wood against the planted mix)', d('hang-hoch-allein-2045', 'hang-hoch-gewappnet-2045') > 2, f"{cols['hang-hoch-allein-2045']} vs {cols['hang-hoch-gewappnet-2045']}")

        if 'dinge' in want:
            names = []
            shots = [('heizhaus', 'gewappnet', 2033.2, 'heizhaus'), ('graben-anger', 'gewappnet', 2029.75, None), ('kahl-gewappnet-2035', 'gewappnet', 2035.5, 'kahlflaeche'),
                     ('kahl-allein-2035', 'allein', 2035.5, 'kahlflaeche'), ('ernte-gewappnet-2029', 'gewappnet', 2029.5, 'kahlflaeche'), ('windrad-bau', 'gewappnet', 2034.6, 'windrad'),
                     ('windrad-dreht', 'gewappnet', 2040.5, 'windrad'), ('windrad-dorf', 'gewappnet', 2040.5, None), ('heizoel', 'allein', 2034.05, None)]
            for name, w, y, pid in shots:
                state(w, y)
                if pid: at_place(pid)
                elif name == 'graben-anger': look(238, -126, 1.65, 120, -2)
                elif name == 'windrad-dorf': look(222, -108, 1.65, 190, 8, 55)
                elif name == 'heizoel': look(222, -108, 1.65, 300, 0)
                steps(0.5); pic(name); names.append(name)
                sh = J("ZKZEITWELT.stats().parts.dinge.shown")
                print(name, w, y, 'shown', sh, flush=True)
                if name == 'heizhaus': ck('Gewappnet 2033: heating house and the patched trench', 'heizhaus' in sh and 'graben' in sh, str(sh))
                if name == 'windrad-bau': ck('Gewappnet 2034: the turbine under construction', 'windrad' in sh, str(sh))
                if name == 'heizoel': ck('Allein im Sturm, winter 2034: the heating-oil truck, no heating house', 'heizoel' in sh and 'heizhaus' not in sh, str(sh))
                if name == 'ernte-gewappnet-2029': ck('Gewappnet 2029: logging (harvester, forwarder, piles)', 'ernte' in sh, str(sh))
            c = calls(); print('draw calls with the turbine in view', c, flush=True)
            ck('draw calls of its own in budget (≤ 40 with the turbine and the village in view)', c['zc'] <= 40, str(c))
            sheet('dinge', names, cols=3)

        if 'nacht' in want:
            names = []
            clock(23.7, 'starkregen')
            for w in ('allein', 'gewappnet'):
                state(w, ev='starkregen', p=0.32); at_place('strasse'); steps(0.4); n = f'regen-{w}'; pic(n); names.append(n)
                print(n, J("ZKZEITWELT.stats().parts.dinge.shown"), flush=True)
            sh = J("ZKZEITWELT.stats().parts.dinge.shown")
            ck('the rain night: water in the street and the fire engine', 'flut' in sh and 'feuerwehr' in sh, str(sh))
            clock(10, 'heiter')
            for w in ('allein', 'gewappnet'):
                state(w, ev='starkregen-morgen', p=0.5); at_place('strasse'); steps(0.4); n = f'morgen-{w}'; pic(n); names.append(n)
                sh = J("ZKZEITWELT.stats().parts.dinge.shown")
                print(n, sh, flush=True)
                if w == 'allein': ck('the morning after in Allein im Sturm: mud and bulky waste', 'schlamm' in sh and 'sperrmuell' in sh, str(sh))
                else: ck('the morning after in Gewappnet: sandbags, no bulky waste', 'sandsaecke' in sh and 'sperrmuell' not in sh, str(sh))
            clock(17.6, 'klar')
            for w in ('allein', 'gewappnet'):
                state(w, ev='blackout', p=0.5); look(212, -96, 1.65, 135, 3, 60); steps(0.4); n = f'blackout-{w}'; pic(n); names.append(n)
                st = J("ZKZEITWELT.stats().parts.dinge")
                print(n, json.dumps(st), flush=True)
                ck(f'the blackout ({w}): the village dark', st['dark'], '')
                if w == 'gewappnet': ck('Gewappnet: the old school lit, the battery beside it', 'schule' in st['shown'] and 'speicher' in st['shown'], str(st['shown']))
                else: ck('Allein im Sturm: a few houses with their own light, the school dark', 'inseln' in st['shown'] and 'schule' not in st['shown'], str(st['shown']))
            E("ZKZEITWELT.set(ZKCHRONIK.state('allein', 2037.2), null)"); look(212, -96, 1.65, 135, 3, 60); steps(0.4); pic('nacht-normal'); names.append('nacht-normal')
            ck('a night without the blackout: the village lights back', not J("ZKZEITWELT.stats().parts.dinge.dark"), '')
            sheet('nacht', names, cols=2)
            clock(13, 'klar')

        if 'split' in want:
            # the split: the same camera twice, left layers 0+21, right 0+22 – what differs must differ
            E("ZKZEITWELT.set(ZKCHRONIK.state('allein', 2040.5), ZKCHRONIK.state('gewappnet', 2040.5))")
            steps(0.3)
            lay = J("""(() => { const c = { 0: 0, 21: 0, 22: 0 }; GAME.scene.traverse(o => { if (!o.isMesh || !(o.name || '').startsWith('zeitreise') || !o.visible) return;
              const m = o.layers.mask; if (m & 1) c[0]++; if (m & (1 << 21)) c[21]++; if (m & (1 << 22)) c[22]++; }); return c; })()""")
            print('layers in the split', lay, flush=True)
            ck('the split: what differs is on layers 21 and 22', lay['21'] > 0 and lay['22'] > 0, str(lay))
            look(222, -108, 90, 195, -10, 60)
            for side, mask in (('links', (1 << 21) | 1), ('rechts', (1 << 22) | 1)):
                E(f"GAME.cam.layers.mask = {mask}"); E("GAME.shot()"); pic('split-' + side)
            E("GAME.cam.layers.mask = 1")
            a, c = region('split-links', (0, 0.3, 1, 0.62)), region('split-rechts', (0, 0.3, 1, 0.62))
            ck('the split: the two halves differ (slopes, turbine)', sum(abs(x - y) for x, y in zip(a, c)) > 2, f'{a} vs {c}')
            sheet('split', ['split-links', 'split-rechts'], cols=2)

        if 'ende' in want:
            new = J("GAME.R.info.programs.filter(p => !__p1.has(p.cacheKey)).map(p => p.name + ' …' + String(p.cacheKey).slice(-40))")
            mine = J("""(() => { const keys = new Set(), R = GAME.R; GAME.scene.traverse(o => { if (o.isMesh && (o.name || '').startsWith('zeitreise'))
              for (const m of [].concat(o.material)) { const p = R.properties.get(m).currentProgram; if (p) keys.add(p.cacheKey); } });
              return GAME.R.info.programs.filter(p => !__p1.has(p.cacheKey) && keys.has(p.cacheKey)).map(p => p.name); })()""")
            print('programs after everything', progs(), 'new since warm', new, flush=True)
            ck('no new programs of the Zeitreise world after warm() (set, places, nights, split)', not mine, str(mine))
            ck('warm() adds few programs (≤ 14, with the first version\'s)', P['warm'] - P['load'] <= 14, f"{P['load']} → {P['warm']}")
            E("ZKZEITWELT.clear()"); steps(0.3)
            s = J("ZKZEITWELT.stats()")
            vis = J("(() => { const o = []; GAME.scene.traverse(m => { if (m.name && m.name.startsWith('zeitreise:') && m.visible) o.push(m.name); }); return o; })()")
            ck('clear(): nothing of the futures visible, the slopes off, the village lights its own', not vis and s['parts']['hang']['on'] == 0 and not s['parts']['dinge']['dark'], f"{vis} {s['parts']['hang']} {s['parts']['dinge']}")
            ck('no errors inside the world module', not s['err'] and not s['parts']['hang']['err'] and not s['parts']['dinge']['err'], json.dumps(s)[:600])
            ok_gl, rep = lib.check_gl(pg, 16)
            ck('every program within 16 textures, none broken', ok_gl, str(rep.get('bad'))[:300])
        ck.errors(errs)
        pg.close()
    ck.done()


run()
