# feat/cockpit: the inside of the cars and the graphics while moving (docs/features/cockpit.md). Pictures in out/cockpit/.
#   python3 viz3/test/cockpit.py PORT [sections]      sections (comma-separated, default all): grafik,cockpit,tractor,kombi,phone
# grafik:  Menü → Einstellungen → Grafik „Beim Bewegen“ sets the motion level of render/render.js (fixed stages, back to automatic), no new
#          shader programs by switching, the frame-rate counter shows, both are kept after a reload, the five buttons fit a phone's width.
# cockpit: Falko's car in the driver's view – the cockpit is built on getting in (programs compiled then, once), the speed needle moves when
#          accelerating, the wheel turns when steering, the hands are on it, a gear change sends the right hand to the lever, the mirrors
#          render (and stop when switched off), rain moves the wipers, the indicators blink (arrows, lamps), the navi shows the map and the
#          corner map steps aside; draw calls and programs in budget; pictures by day, at night, in the rain.
# tractor: the tractor's cab – its wheel turns, the gauges, the hands.
# kombi:   Falko's estate from outside (vehicles/kombi.js): three quarters front and rear, the side with its measures, night with lights and
#          an indicator, rain, the driver's view; the old body (?altkombi) from the same places; draw calls against the old body.
# phone:   a phone's width in the driver's view: the cockpit there, mirrors off by default, no page errors.
# Never return an object of the scene from evaluate (docs/WORKFLOW.md): only numbers, flags and JSON.stringify(…).
import sys, os, time, json
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__))); import lib
port = sys.argv[1]
ONLY = [a for a in sys.argv[2].split(',') if a] if len(sys.argv) > 2 else None
def want(k): return not ONLY or k in ONLY
OUT = lib.out('cockpit')
ck = lib.Checks('cockpit')
errs = []
QUERY = '?nogeo=1'

with lib.browser() as b:
    pg = lib.page(b, 1100, 680, errs=errs)
    E = pg.evaluate
    lib.boot(pg, port, QUERY)
    pg.set_default_timeout(120000)
    info = lambda: json.loads(E("JSON.stringify(COCKPIT.set.info())"))
    progs = lambda: E("GAME.R.info.programs.length")
    if want('grafik'):
        i0 = info()
        ck('setting: automatic by default', i0['mot'] == 'auto' and i0['user'] is None, json.dumps(i0))
        ck('menu: five stages and the counter button', E("document.querySelectorAll('#motseg [data-mot]').length === 5 && !!document.getElementById('fpsbtn')"))
        pg.click('#menubtn'); time.sleep(0.4)
        pg.click('#menu [data-go="einstellungen"]'); time.sleep(0.3)
        p0 = progs()
        lv = {}
        for name in ('stark', 'voll', 'leicht', 'mittel', 'auto'):
            pg.click(f'#motseg [data-mot="{name}"]'); time.sleep(0.15)
            lv[name] = info()
        ck('Stark: the lightest level, fixed', lv['stark']['level'] == 5 and lv['stark']['user'] == 5, json.dumps(lv['stark']))
        ck('Volle Qualität: no reduction (level 0)', lv['voll']['level'] == 0 and lv['voll']['user'] == 0)
        ck('Leicht and Mittel: levels 1 and 3', lv['leicht']['level'] == 1 and lv['mittel']['level'] == 3)
        ck('Automatisch: back to the level the automatic chose', lv['auto']['user'] is None and lv['auto']['level'] == lv['auto']['auto'],
           json.dumps(lv['auto']))
        note = E("document.getElementById('motnote').textContent")
        ck('one line of explanation under the stages', note.startswith('Automatisch:') and len(note) > 30, note)
        pg.click('#motseg [data-mot="stark"]'); time.sleep(0.15)
        # a still frame and a moving frame at the new level: the motion path was compiled at load, nothing new
        E("GAME.shot()"); E("COCKPIT.set.info()")
        p1 = progs()
        ck('switching the stages compiles no shader program', p1 == p0, f'{p0} → {p1}')
        pg.click('#fpsbtn'); time.sleep(0.2)
        pg.screenshot(path=os.path.join(OUT, 'grafik_menu.png'))
        pg.click('#menu .mhead [data-mclose]'); time.sleep(0.3)
        # frames over a second and a half (the loop is frozen in tests: each shot is one frame), the counter read right after
        for k in range(6):
            E("GAME.shot()"); time.sleep(0.25)
        fb = info()['box']
        ck('frame-rate counter shows frames per second and the level', bool(fb) and fb['shown'] and 'Bilder/s' in fb['text'] and 'Bewegen: 50 %' in fb['text'],
           json.dumps(fb))
        pg.screenshot(path=os.path.join(OUT, 'grafik_fps.png'))
        saved = E("JSON.stringify(SAVE.get('pav-cockpit-v1'))")
        ck('saved per browser', json.loads(saved).get('mot') == 'stark' and json.loads(saved).get('fps') is True, saved)
        # a reload keeps both
        lib.boot(pg, port, QUERY)
        i2 = info()
        ck('after a reload: the stage is kept (Stark: level 5, fixed)', i2['mot'] == 'stark' and i2['level'] == 5 and i2['user'] == 5, json.dumps(i2))
        ck('after a reload: the counter is on', bool(i2['box']) and i2['box']['shown'])
        # a phone's width: the five buttons fit the menu sheet
        pg.set_viewport_size({'width': 390, 'height': 760}); time.sleep(0.5)
        pg.click('#menubtn'); time.sleep(0.4)
        pg.click('#menu [data-go="einstellungen"]'); time.sleep(0.3)
        E("document.getElementById('motseg').scrollIntoView({ block: 'center' })"); time.sleep(0.2)
        r = json.loads(E("""JSON.stringify((() => { const s = document.getElementById('motseg').getBoundingClientRect(),
            m = document.querySelector('#menu .msheet').getBoundingClientRect(); return { l: s.left, r: s.right, ml: m.left, mr: m.right, w: innerWidth }; })())"""))
        ck('phone width: the five stages fit the menu', r['l'] >= r['ml'] - 0.5 and r['r'] <= r['mr'] + 0.5 and r['r'] <= r['w'], json.dumps(r))
        pg.screenshot(path=os.path.join(OUT, 'grafik_phone.png'))
        # back to the default for the other sections
        pg.click('#motseg [data-mot="auto"]'); pg.click('#fpsbtn'); time.sleep(0.1)
        pg.click('#menu .mhead [data-mclose]'); pg.set_viewport_size({'width': 1100, 'height': 680}); time.sleep(0.3)
    if want('cockpit') or want('look') or want('tractor'):
        # the real surroundings (roads for the navi) and the figure (its arms)
        pg.close()
        pg = lib.page(b, 1100, 680, errs=errs, tier='mittel')
        E = pg.evaluate
        lib.boot(pg, port, '', figures=True)
        pg.set_default_timeout(180000)
        E("document.querySelectorAll('#toast').forEach(e => e.style.visibility = 'hidden')")
        st = lambda: json.loads(E("JSON.stringify(COCKPIT.info())"))
        steps = lambda secs: E(f"for (let i = 0; i < {int(secs / 0.025)}; i++) GAME.step(0.025)")
        def drive(secs, thr=0, brk=0, steer=0, hand=False):
            E(f"VEH.auto = () => ({{ thr: {thr}, brk: {brk}, steer: {steer}, hand: {str(hand).lower()} }})"); steps(secs); E("VEH.auto = null")
        ck('not built before one gets in (lazy)', not st()['built'])
        p0 = E("GAME.R.info.programs.length")
        E("VEH.enter('car'); GAME.setView3(false)"); steps(1.2)
        i1 = st(); p1 = E("GAME.R.info.programs.length")
        ck('built on getting in, the body\'s simple inside hidden', i1['built'] and i1['inside'] is False, f"{i1['buildMs']} ms")
        ck('driver\'s view', i1['view'] is True)
        lib.shot(pg, OUT, 'a_day_driver'); p2 = E("GAME.R.info.programs.length")
        names = E(f"GAME.R.info.programs.slice({p0}).map(p => p.name + ':' + String(p.cacheKey || '').length).join(' | ')")
        ck('programs: the cockpit\'s few, compiled on getting in (warmed) and with the first frame', p2 - p0 <= 6, f'{p0} → {p1} → {p2}: {names}')
        ck('no part of the cockpit broken (NaN corners)', not i1['bad'], json.dumps(i1['bad']))
        ck('hands on the wheel', i1['handsShown'] and bool(i1['hands']), json.dumps(i1['hands']))
        # from outside (chase camera): the new inside through the glass, the figure itself at the wheel, no arms of the cockpit
        E("GAME.setView3(true)"); steps(0.6); lib.shot(pg, OUT, 'i_chase')
        ck('third person: the arms of the cockpit hidden', not st()['handsShown'])
        E("GAME.setView3(false)"); steps(0.4)
        print('info', json.dumps(i1), flush=True)
        if want('cockpit'):
            s0 = st(); drive(4, thr=1); s1 = st()
            ck('the speed needle moves when accelerating', s1['kmh'] > 15 and abs(s1['spd'] - s0['spd']) > 0.3, f"{s1['kmh']} km/h, {s0['spd']} → {s1['spd']}")
            # on until the automatic changes gear: the right hand at the lever a moment later
            E("VEH.auto = () => ({ thr: 1, brk: 0, steer: 0, hand: false })"); bmax = 0
            for k in range(40):
                steps(0.1); i = st(); bmax = max(bmax, i['shiftB'])
                if bmax > 0.95: break
            E("VEH.auto = null")
            ck('a gear change sends the right hand to the lever', i['shifts'] > 0 and bmax > 0.95, f"blend {bmax}, {i['shifts']} changes, gear {i['gear']}")
            lib.shot(pg, OUT, 'b_shift')
            h0 = st()['hands']; drive(0.6, thr=0.3, steer=1); s2 = st(); h1 = s2['hands']
            ck('the wheel turns when steering (about 15:1)', abs(s2['wheel']) > 2 and abs(abs(s2['wheel']) - abs(s2['steer']) * 15) < 0.05, f"wheel {s2['wheel']} rad, steer {s2['steer']}")
            moved = h0 and h1 and max(abs(a - b) for a, b in zip(h0[1], h1[1])) > 0.03
            ck('the hands follow the wheel', bool(moved), f'{h0} → {h1}')
            lib.shot(pg, OUT, 'c_steer')
            drive(1.5, brk=1)
            # indicators
            pg.keyboard.press(','); seen = set(); lamps = 0
            for k in range(10):
                steps(0.1); i = st(); seen.add(tuple(i['arrows'])); lamps = max(lamps, i['lamps'][0] or 0)
            ck('the left indicator blinks (arrow on and off, the lamp)', (True, False) in seen and (False, False) in seen and lamps > 1, f'{seen} lamp {lamps}')
            lib.shot(pg, OUT, 'd_blink')
            pg.keyboard.press(','); steps(0.2)
            ck('pressed again: off', st()['blink'] is None)
            # mirrors (on for computers)
            m = st()['mirrors']
            ck('the mirrors render', m['live'] and m['renders'] > 0, json.dumps(m))
            # navi and the corner map
            n = st()
            ck('the navi shows the map, the corner map steps aside', n['navi']['n'] > 0 and n['mapHidden'], json.dumps(n['navi']))
            # rain: the wipers
            E("COCKPIT.rain(0.5)"); phis = []
            for k in range(12):
                steps(0.1); phis.append(st()['wiper']['phi'])
            w = st()['wiper']
            ck('rain moves the wipers', w['mode'] == 'normal' and max(phis) > 0.8, f"{w} {phis}")
            lib.shot(pg, OUT, 'e_rain')
            E("COCKPIT.rain(null)")
            # mirrors off in the menu: no more pictures
            E("document.getElementById('mirbtn').click()"); r0 = st()['mirrors']['renders']; steps(0.5); m2 = st()['mirrors']
            ck('mirrors off: the glass is metal, no more pictures', not m2['live'] and m2['renders'] == r0, json.dumps(m2))
            E("document.getElementById('mirbtn').click()")
            # draw calls: the frame with and without the cockpit
            dc = json.loads(E("""JSON.stringify((() => { const R = GAME.R, root = COCKPIT.S.c.P.root; GAME.shot(); R.info.autoReset = false;
                root.visible = false; R.info.reset(); GAME.shot(); const b = R.info.render.calls;
                root.visible = true; R.info.reset(); GAME.shot(); const a = R.info.render.calls;
                R.info.autoReset = true; return { with: a, without: b }; })())"""))
            mc = st()['meshes']
            ck('draw calls of the cockpit in budget (< 60 meshes; a full frame with ambient occlusion draws them twice)', sum(mc.values()) < 60 and dc['with'] - dc['without'] < 130, json.dumps(dc) + ' ' + json.dumps(mc))
            p3 = E("GAME.R.info.programs.length")
            ck('no new programs while driving, shifting, steering, blinking, wiping, with mirrors on and off', p3 == p2, f'{p2} → {p3}')
            # night: the cluster backlit, the lights on (automatic)
            E("CLOCK.t = Math.floor(CLOCK.t / 1440) * 1440 + 22 * 60 + 30; DN && DN.update && DN.update(true)"); lib.settle_light(pg); steps(0.5)
            lib.shot(pg, OUT, 'f_night')
            n = st()
            ck('at night: the lights on, the light switch shown', n['light'] == 'auto' and E("VEH.lightsOn(VEH.cur)"), n['light'])
            print('info', json.dumps(st()), flush=True)
        E("VEH.exit()"); steps(0.5)
        if want('tractor'):
            # the tractor's cab: its own wheel turns, the pod's gauges, the hands
            E("CLOCK.t = Math.floor(CLOCK.t / 1440) * 1440 + 13 * 60; DN && DN.update && DN.update(true)"); lib.settle_light(pg)
            E("VEH.enter('tractor'); GAME.setView3(false)"); steps(1.2)
            t = st()
            ck('tractor: its cab built, the hands on its wheel', t.get('kind') == 'tractor' and t['view'] and t['handsShown'], json.dumps(t))
            drive(0.8, thr=0.4, steer=-1); t2 = st()
            ck('tractor: the wheel turns when steering', abs(t2['wheel']) > 2 and abs(abs(t2['wheel']) - abs(t2['steer']) * 18) < 0.05, f"wheel {t2['wheel']} steer {t2['steer']}")
            lib.shot(pg, OUT, 'h_tractor')
            drive(1.0, brk=1); E("VEH.exit()"); steps(0.5)
    if want('kombi'):
        # Falko's estate from outside (vehicles/kombi.js): front and rear three quarters, the side with its measures, the driver's view,
        # night with the lights and an indicator, rain; today's old body (?altkombi) from the same places to compare; draw calls, programs
        from PIL import Image, ImageDraw
        import math
        def look(pg, s0, dist, rel, h, name, fov=42):
            # the own eyes (no figure in the picture) at dist metres from the car, rel degrees from its nose, h above its ground
            a = math.radians(s0['psi'] + rel)
            cx, cy = s0['x'] + math.sin(a) * dist, s0['y'] + math.cos(a) * dist
            yaw = math.degrees(math.atan2(s0['x'] - cx, s0['y'] - cy))
            pg.evaluate(f"GAME.view({cx}, {cy}, {s0['z']} + {h}, {yaw}, -6, {fov})")
            lib.shot(pg, OUT, name)
        car = lambda E: json.loads(E("JSON.stringify(VEH.state().find(s => s.id === 'car'))"))
        def views(pg, E, tag):
            E("GAME.setView3(false)"); E("GAME.step(0.05)")
            s0 = car(E)
            look(pg, s0, 6.0, 35, 1.35, f'k_{tag}front34')
            look(pg, s0, 6.0, 215, 1.35, f'k_{tag}rear34')
            look(pg, s0, 7.5, 270, 0.95, f'k_{tag}side', 38)
            return s0
        pg.close()
        pg = lib.page(b, 1200, 700, errs=errs, tier='mittel')
        E = pg.evaluate
        lib.boot(pg, port, '', figures=True)
        pg.set_default_timeout(180000)
        E("document.querySelectorAll('#toast, .hint').forEach(e => e.style.visibility = 'hidden')")
        ki = json.loads(E("JSON.stringify(COCKPIT.kombi.info())"))
        ck('kombi: the new body is on the car', ki['swapped'], json.dumps(ki))
        # the car's materials: compiled at load (a program each), none added by looking at it from near (renderer.properties)
        E("""window.__carProg = () => { const out = new Map(); VEH.by.car.g.traverse(o => { if (o.isMesh)
            out.set(o.material, (GAME.R.properties.get(o.material).programs || new Map()).size); }); return out; }; window.__P0 = __carProg()""")
        miss = E("[...__P0].filter(e => !e[1]).map(e => e[0].type + ':' + (e[0].name || ''))")
        ck('kombi: the body\'s materials compiled at load', not miss, f'{len(miss)} without a program {miss[:6]}')
        p0 = E("GAME.R.info.programs.length")
        E("VEH.goTo('car'); GAME.step(0.3)")
        s0 = views(pg, E, '')
        # the side with its measures: points of the car's near side (0.87 m from its middle towards the camera) projected into the
        # picture, lines drawn over it
        pts = json.loads(E("""JSON.stringify((() => { const s = VEH.by.car.st, f = [Math.sin(s.psi), Math.cos(s.psi)], c = GAME.cam,
              r = [f[1], -f[0]], k = 0.87 * Math.sign((c.position.x - s.x) * r[0] + (-c.position.z - s.y) * r[1]);
            const P = (fy, z) => { const p = c.position.clone().set(s.x + f[0] * fy + r[0] * k, s.z + z, -(s.y + f[1] * fy + r[1] * k)).project(c);
              return [(p.x + 1) / 2 * innerWidth, (1 - p.y) / 2 * innerHeight]; };
            return { front: P(2.047, 0.05), rear: P(-2.426, 0.05), top: P(-1.0, 1.64), foot: P(-1.0, 0), ax1: P(1.25, 0.31), ax2: P(-1.655, 0.31) }; })())"""))
        im = Image.open(os.path.join(OUT, 'k_side.jpg')).convert('RGB'); dr = ImageDraw.Draw(im)
        kx, ky = im.width / 1200, im.height / 700
        T = lambda p: (p[0] * kx, p[1] * ky)
        dr.line([T(pts['front']), T(pts['rear'])], fill=(255, 210, 60), width=3)
        dr.text(((T(pts['front'])[0] + T(pts['rear'])[0]) / 2 - 20, T(pts['front'])[1] + 6), '4,47 m', fill=(255, 210, 60))
        dr.line([T(pts['foot']), T(pts['top'])], fill=(255, 210, 60), width=3)
        dr.text((T(pts['top'])[0] + 6, T(pts['top'])[1]), '1,64 m', fill=(255, 210, 60))
        dr.line([T(pts['ax1']), T(pts['ax2'])], fill=(120, 220, 255), width=2)
        dr.text(((T(pts['ax1'])[0] + T(pts['ax2'])[0]) / 2 - 40, T(pts['ax1'])[1] - 16), 'Radstand 2,905 m', fill=(120, 220, 255))
        im.save(os.path.join(OUT, 'k_side_mass.jpg'), quality=90)
        p1 = E("GAME.R.info.programs.length")
        names = E(f"GAME.R.info.programs.slice({p0}).map(p => p.name || '?').join(' | ')")
        grew = E("(() => { const out = []; for (const [m, n] of __carProg()) if (n > (__P0.get(m) || 0)) out.push(m.type + ':' + (m.name || '') + ' ' + (__P0.get(m) || 0) + '>' + n); return out; })()")
        ck('kombi: no new shader programs from looking at it from near', not grew, f'{grew}; the world compiled meanwhile {p0} -> {p1}: {names}')
        mc = E("(() => { let n = 0; VEH.by.car.g.traverseVisible(o => { if (o.isMesh) n++; }); return n; })()")
        # the driver's view by day
        E("VEH.enter('car'); GAME.setView3(false)"); E("for (let i = 0; i < 40; i++) GAME.step(0.05)")
        lib.shot(pg, OUT, 'k_driver_day')
        # looking up to the left: the A pillar's trim, the header with the visor, the roof's side rail over the driver's door
        E("GAME.P.yaw = VEH.state().find(s => s.id === 'car').psi - 55; GAME.P.pitch = 16")
        lib.shot(pg, OUT, 'k_driver_left')
        E("GAME.P.yaw = VEH.state().find(s => s.id === 'car').psi; GAME.P.pitch = -4")
        ci = json.loads(E("JSON.stringify(COCKPIT.info())"))
        ck('kombi: the cockpit in the new body (the mirrors there)', ci['built'] and ci['view'] and ci['mirrors']['renders'] > 0 and not ci['bad'],
           json.dumps({k: ci.get(k) for k in ('bad', 'meshes', 'mirrors')}))
        E("VEH.exit()"); E("GAME.step(0.3)")
        # night: the parked car with its engine running and its lights on (automatic), the left indicator lit, from the front and behind
        E("CLOCK.t = Math.floor(CLOCK.t / 1440) * 1440 + 22 * 60 + 40; DN && DN.update && DN.update(true)"); lib.settle_light(pg)
        E("VEH.by.car.st.engine = true; for (const m of VEH.by.car.model.lamps.blinkL) m.emissiveIntensity = 2.6"); E("GAME.step(0.2)")
        ln = E("VEH.state().find(s => s.id === 'car').light")
        look(pg, s0, 6.0, 30, 1.35, 'k_night_front')
        look(pg, s0, 6.0, 210, 1.35, 'k_night_rear')
        ck('kombi: at night the lights on, the indicator lit', ln, f'light {ln}')
        E("VEH.by.car.st.engine = false; for (const m of VEH.by.car.model.lamps.blinkL) m.emissiveIntensity = 0"); E("GAME.step(0.2)")
        # rain by day: outside, then the driver's view
        E("CLOCK.t = Math.floor(CLOCK.t / 1440) * 1440 + 14 * 60; DN && DN.update && DN.update(true)"); lib.settle_light(pg)
        E("window.WETTER && WETTER.preset && WETTER.preset('regen')"); E("for (let i = 0; i < 40; i++) GAME.step(0.05)")
        look(pg, s0, 6.0, 140, 1.35, 'k_rain')
        E("VEH.enter('car'); GAME.setView3(false)"); E("for (let i = 0; i < 30; i++) GAME.step(0.05)")
        lib.shot(pg, OUT, 'k_driver_rain')
        E("window.WETTER && WETTER.preset && WETTER.preset(null)")
        E("VEH.exit()"); E("GAME.step(0.3)")
        pg.close()
        # the old body from the same places
        pg = lib.page(b, 1200, 700, errs=errs, tier='mittel')
        E = pg.evaluate
        lib.boot(pg, port, '?altkombi=1', figures=False)
        E("document.querySelectorAll('#toast, .hint').forEach(e => e.style.visibility = 'hidden')")
        E("VEH.goTo('car'); GAME.step(0.3)")
        views(pg, E, 'alt_')
        mo = E("(() => { let n = 0; VEH.by.car.g.traverseVisible(o => { if (o.isMesh) n++; }); return n; })()")
        ck('kombi: draw calls near at most about +20 against the old body', mc - mo <= 20, f'new {mc}, old {mo}')
    if want('phone'):
        # a phone: touch, narrow, the lightest tier – the cockpit there, the mirrors off by default (COARSE)
        pg.close()
        pg = lib.page(b, 390, 800, errs=errs, tier='schnell', is_mobile=True, has_touch=True, device_scale_factor=2)
        E = pg.evaluate
        lib.boot(pg, port, '?nogeo=1', figures=True)
        pg.set_default_timeout(180000)
        E("document.querySelectorAll('#toast').forEach(e => e.style.visibility = 'hidden')")
        E("VEH.enter('car'); GAME.setView3(false)"); E("for (let i = 0; i < 40; i++) GAME.step(0.025)")
        i = json.loads(E("JSON.stringify(COCKPIT.info())"))
        ck('phone: the cockpit in the driver\'s view', i['built'] and i['view'], json.dumps({k: i.get(k) for k in ('built', 'view', 'buildMs', 'frameMs')}))
        ck('phone: mirrors off by default', not i['mirrors']['live'] and i['mirrors']['renders'] == 0, json.dumps(i['mirrors']))
        lib.shot(pg, OUT, 'g_phone')
        n = E("document.querySelectorAll('#vhud .cpblink').length")
        pg.locator('#vhud .cpblink').first.dispatch_event('pointerdown'); E("for (let i = 0; i < 8; i++) GAME.step(0.025)")
        bl = json.loads(E("JSON.stringify(COCKPIT.info())"))['blink']
        ck('phone: two indicator buttons, the left one blinks', n == 2 and bl == 'L', f'{n} buttons, blink {bl}')
        pg.locator('#vhud .cpblink').first.dispatch_event('pointerdown')
        E("VEH.exit()")
    ck.errors(errs)
ck.done()
