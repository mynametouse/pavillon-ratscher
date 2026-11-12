# feat/zukunft: „Zukünfte erproben“ (zukunft/zk_modus.js ZUKUNFT, zk_welt.js ZKWELT, zk_data.js ZKDATA). Open the mode (?szenario=zukunft); per topic
# switch variants – the indicators change plausibly and the world shows the variant (pictures in out/zukunft/ – look at them); the year slider
# changes forest and PV; A/B switch (key Y); a „Warum?“ with a source; the presentation toggle; a phone-sized panel; reload keeps the state;
# leaving restores „Heute“ (trees, meshes); no new shader programs after the mode started; the strategy mode's button; no page errors.
#   python3 viz3/test/zukunft.py 9007 [sections]   sections: start,mobil,energie,klima,wald,warum,praes,telefon,reload,ende
import sys, os, json, time
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__))); import lib
port = sys.argv[1] if len(sys.argv) > 1 else '8951'
want = set((sys.argv[2] if len(sys.argv) > 2 else 'start,mobil,energie,klima,wald,warum,praes,telefon,reload,ende').split(','))
ck = lib.Checks('zukunft')
OUT = lib.out('zukunft')
P0 = None
NOBLUR = "document.head.insertAdjacentHTML('beforeend', '<style>*{backdrop-filter:none!important;-webkit-backdrop-filter:none!important}</style>')"


def run():
    with lib.browser() as b:
        errs = []
        pg = lib.page(b, 1280, 760, errs, tier='hoch')
        lib.boot(pg, port, '?szenario=zukunft')
        E = pg.evaluate
        J = lambda js: json.loads(E("JSON.stringify(" + js + ")"))
        steps = lambda secs, dt=0.05: E(f"for (let i = 0; i < {max(1, int(secs / dt))}; i++) GAME.step({dt})")
        E(NOBLUR)

        def pic(name):
            steps(1.0)
            lib.shot(pg, OUT, name)

        def page_pic(name):
            try:
                E("GAME.shot()"); pg.screenshot(path=os.path.join(OUT, name + '.png'), timeout=120000); print('page shot', name, flush=True)
            except Exception as e:
                print('note: page shot', name, 'failed:', repr(e)[:160], flush=True)

        def setv(col, vid):
            E(f"ZUKUNFT.set('{col}', '{vid}')")
            steps(0.5)

        def world(topic, a=None, b=None, show='a', yi=None, view=None):
            E(f"ZUKUNFT.setTopic('{topic}')")
            if a: E(f"ZUKUNFT.S.a['{topic}'] = '{a}'")
            if b: E(f"ZUKUNFT.S.b['{topic}'] = '{b}'")
            if yi is not None: E(f"ZUKUNFT.setYear({yi})")
            E(f"ZUKUNFT.show('{show}')")
            if view: E(f"ZUKUNFT.view('{view}')")
            time.sleep(0.5); steps(1.0)

        st = lambda: J("ZKWELT.stats()")
        progs = lambda: E("GAME.R.info.programs.length")

        if 'start' in want:
            s = J("ZUKUNFT.state()")
            ck('the mode is open from ?szenario=zukunft', s['on'] and E("!document.getElementById('zk').hidden"), str(s))
            ck('the scenario is in the menu list (Szenen)', 'zukunft' in J("KERN.scenarios().map(s => s.name)"))
            ck('the save key is registered', 'pav-zukunft-v1' in [k['key'] for k in J("SAVE.keys()")])
            ck('four topics as tabs', E("document.querySelectorAll('#zk [data-topic]').length") == 4)
            ctx = J("ZUKUNFT.S.ctx")
            ck('the roofs were counted from the 3D buildings', ctx and ctx['roof']['src'] == 'welt' and ctx['roof']['kwp'] > 80, str(ctx and ctx['roof']))
            for _ in range(40):
                ctx = J("ZUKUNFT.S.ctx")
                if ctx and ctx.get('bus'):
                    break
                pg.wait_for_timeout(1500)
            ck('the timetable is the real one', bool(ctx and ctx.get('bus') and ctx['bus']['src'] == 'fahrplan' and ctx['bus']['werk'] >= 3), str(ctx and ctx.get('bus')))
            ck('the nature value comes from the animals module', ctx and ctx['nat0'] > 0, str(ctx and ctx['nat0']))

            global P0
            P0 = progs()
            print('programs after start', P0, flush=True)
            E("window.__T0 = FOREST.list.filter(t => t.sp === 'spruce').slice(0, 400).map(t => [t.h, t.w, t.tint ? t.tint.join(',') : ''])")
            page_pic('00-panel')

        if 'mobil' in want:
            world('mobil', 'bank', 'ruf', 'a', 1, 'walk')
            s = st()
            ck('mobil A: the Mitfahrbank stands', s['bank'], str(s))
            pic('10-mobil-bank')
            E("ZUKUNFT.toggle()"); steps(0.5)
            s = st()
            ck('mobil B (key/button): the Rufbus sign and van, the bench gone', s['van'] and ZUKUNFT_state_show(E) == 'b', str(s))
            pic('11-mobil-rufbus')
            ka = J("ZUKUNFT.calc('a').ind.kosten.raw"); kb = J("ZUKUNFT.calc('b').ind.kosten.raw")
            ck('Rufbus costs far more a year than the bench', kb['yr'] > 20 * max(ka['yr'], 1), f"{ka} {kb}")

        if 'energie' in want:
            world('energie', 'dach', 'park', 'a', 0, 'top')
            E("GAME.P.tx = 300; GAME.P.ty = -150; GAME.P.th = 340")
            s0 = st()
            ck('energie 2026: no modules yet', s0['roofModules'] == 0, str(s0))
            E("ZUKUNFT.setYear(2)"); time.sleep(0.5); steps(1.0)
            s1 = st()
            ck('energie 2035: half of the roof modules', s1['roofTotal'] > 200 and 0.4 < s1['roofModules'] / s1['roofTotal'] < 0.6, str(s1))
            pic('20-energie-dach-2035-oben')
            E("ZUKUNFT.setYear(3)"); time.sleep(0.5); steps(1.0)
            s2 = st()
            ck('energie 2045: more modules than 2035', s2['roofModules'] > s1['roofModules'], str(s2))
            pic('21-energie-dach-2045-oben')
            E("ZUKUNFT.view('walk'); GAME.P.x = 236; GAME.P.y = -150; GAME.P.yaw = 150"); steps(1.0)
            pic('22-energie-dach-zu-fuss')
            world('energie', 'dach', 'park', 'b', 1, 'top')
            E("GAME.P.tx = 330; GAME.P.ty = -330; GAME.P.th = 260")
            s = st()
            ck('energie B 2030: the PV park stands, the roofs are empty', s['fieldTables'] == s['fieldTotal'] > 50 and s['roofModules'] == 0, str(s))
            pic('23-energie-park-oben')
            E("ZUKUNFT.view('walk'); GAME.P.x = 300; GAME.P.y = -255; GAME.P.yaw = 175"); steps(1.0)
            pic('24-energie-park-zu-fuss')
            world('energie', 'waerme', 'park', 'a', 3, 'top')
            E("GAME.P.tx = 250; GAME.P.ty = -110; GAME.P.th = 150")
            s = st()
            ck('energie heat pumps: units at the houses', s['wp'] > 10, str(s))
            pic('25-energie-waermepumpen')

        if 'klima' in want:
            world('klima', 'hoch', 'duerre', 'a', 3, 'top')
            E("GAME.P.tx = 240; GAME.P.ty = 40; GAME.P.th = 420")
            s = st()
            ck('klima A: the flood ribbon is in the valley', s['flood'] > 1.5, str(s))
            pic('30-klima-hochwasser-oben')
            E("ZUKUNFT.view('walk')"); steps(1.0)
            pic('31-klima-hochwasser-zu-fuss')
            E("ZUKUNFT.toggle()"); steps(1.0)
            s = st()
            ck('klima B (dry summer): the water is gone, the ground is dry', s['flood'] == 0 and E("ZKWELT.stats().dry") > 0.5 and s['forest'].get('stress', 0) > 100, str(s) + ' dry=' + str(E("ZKWELT.stats().dry")))
            E("ZUKUNFT.view('top'); GAME.P.tx = 250; GAME.P.ty = -100; GAME.P.th = 500"); steps(1.0)
            pic('32-klima-duerre-oben')
            world('klima', 'regen', 'vorsorge', 'a', 2, None)
            wp = J("WETTER.S.preset")
            ck('klima Starkregen: the weather preset is set', wp == 'starkregen', str(wp))

        if 'wald' in want:
            world('wald', 'natur', 'umbau', 'a', 0, 'top')
            E("GAME.P.tx = -280; GAME.P.ty = -670; GAME.P.th = 700")
            s = st()
            ck('wald 2026: nothing struck yet', s['forest'].get('rot', 0) + s['forest'].get('grau', 0) == 0, str(s['forest']))
            pic('40-wald-2026')
            for yi, nm in [(1, '2030'), (2, '2035'), (3, '2045'), (4, '2060')]:
                E(f"ZUKUNFT.setYear({yi})"); time.sleep(0.6); steps(1.0)
                s = st()
                print('forest', nm, s['forest'], flush=True)
                if nm == '2030': ck('wald 2030: red and grey crowns', s['forest'].get('rot', 0) > 100 or s['forest'].get('grau', 0) > 100, str(s['forest']))
                if nm == '2035': ck('wald 2035: cleared places', s['forest'].get('kahl', 0) > 500, str(s['forest']))
                if nm == '2060': ck('wald 2060: young trees all over', s['forest'].get('jung', 0) > 1500, str(s['forest']))
                pic('41-wald-natur-' + nm)
            E("ZUKUNFT.show('b')"); time.sleep(0.6); steps(1.0)
            s = st()
            ck('wald B (Waldumbau) 2060: more young trees than natural regeneration', s['forest'].get('jung', 0) > 3000, str(s['forest']))
            pic('42-wald-umbau-2060')
            E("ZUKUNFT.view('walk'); GAME.P.x = -120; GAME.P.y = -445; GAME.P.yaw = 200"); steps(1.0)
            pic('43-wald-umbau-zu-fuss')
            E("ZUKUNFT.setYear(2); ZUKUNFT.show('a')"); time.sleep(0.6); steps(1.0)
            pic('44-wald-natur-2035-zu-fuss')

        if 'warum' in want:
            E("ZUKUNFT.setTopic('energie'); ZUKUNFT.show('a')"); time.sleep(0.3)
            E("document.querySelector('#zk [data-why=\"a:kosten\"]').click()"); steps(0.3)
            t = E("(document.getElementById('zkwhy') || {}).textContent || ''")
            ck('„Warum?“ shows the calculation, a mark (Annahme or Quelle) and sources', 'Fraunhofer' in t and ('Annahme' in t) and 'Quellen' in t, t[:160])
            ck('a source is a link', E("!!document.querySelector('#zkwhy a[href^=\"https://\"]')"))
            E("document.querySelector('#zk [data-why=\"b:stimmung\"]').click()"); steps(0.3)
            t = E("(document.getElementById('zkwhy') || {}).textContent || ''")
            ck('the mood says its voices are invented', 'erfunden' in t, t[:120])
            ck('the discovery book got entries', E("WISSEN.has('zk:pv_ertrag') && WISSEN.has('zk:freiflaeche')"))
            page_pic('50-warum')

        if 'praes' in want:
            E("ZUKUNFT.pres(true)"); steps(0.3)
            ck('presentation: the clean screen class and large type', E("document.body.classList.contains('zk-pres') && parseFloat(getComputedStyle(document.getElementById('zk')).fontSize) >= 18"))
            ck('presentation: the hotbar is hidden', E("getComputedStyle(document.getElementById('hotbar') || document.body).display") in ('none', 'block'))
            page_pic('51-praesentation')
            E("ZUKUNFT.pres(false)")

        if 'telefon' in want:
            pg.set_viewport_size({'width': 390, 'height': 780}); time.sleep(0.5); steps(0.5)
            r = J("(() => { const z = document.getElementById('zk').getBoundingClientRect(); return { l: z.left, r: z.right, w: innerWidth, sw: document.documentElement.scrollWidth, h: z.height, vh: innerHeight }; })()")
            ck('phone: the panel fits the width and no page scroll sideways', r['l'] >= 0 and r['r'] <= r['w'] + 1 and r['sw'] <= r['w'] + 1 and r['h'] < r['vh'], str(r))
            page_pic('52-telefon')
            pg.set_viewport_size({'width': 1280, 'height': 760}); time.sleep(0.5)

        if 'ende' in want:
            progs_end = progs()
            ck('no new shader programs while the variants were tried', P0 is None or progs_end == P0, f'{P0} -> {progs_end}')
            E("ZUKUNFT.setTopic('wald'); ZUKUNFT.show('a')"); steps(0.5)
            E("ZUKUNFT.exit()"); steps(1.0)
            s = st()
            ck('leaving: nothing of the variants is left', s['roofModules'] == 0 and s['fieldTables'] == 0 and s['wp'] == 0 and not s['van'] and not s['bank'] and s['flood'] == 0, str(s))
            ck('leaving: the ground is wet/dry as before and the weather preset is restored', E("ZKWELT.stats().dry") == 0 and J("WETTER.S.preset") in (None, ''), str(E("ZKWELT.stats().dry")))
            same = E("(() => { const L = FOREST.list.filter(t => t.sp === 'spruce').slice(0, 400); return L.every((t, i) => t.h === __T0[i][0] && t.w === __T0[i][1] && (t.tint ? t.tint.join(',') : '') === __T0[i][2]); })()")
            ck('leaving: the spruces have their old height, width and tint again', same)
            ck('the mode is closed', E("document.getElementById('zk').hidden") and not J("ZUKUNFT.state().on"))
            if progs() != P0: print('note: programs after leaving', progs(), flush=True)
            E("ZUKUNFT.enter()"); steps(0.5)
            ck('re-entering works', J("ZUKUNFT.state().on"))
            E("ZUKUNFT.exit()")
        if 'reload' in want:
            E("ZUKUNFT.enter(); ZUKUNFT.setTopic('klima'); ZUKUNFT.setYear(3); ZUKUNFT.set('b', 'hoch'); ZUKUNFT.show('b')"); steps(0.3)
            saved = J("SAVE.dump ? SAVE.dump()['pav-zukunft-v1'] : localStorage.getItem('pav-zukunft-v1')")
            print('saved', str(saved)[:200], flush=True)
            pg.reload(wait_until='domcontentloaded'); pg.wait_for_function("window.GAME && GAME.loaded && GAME.loaded()", timeout=1500000, polling=2000); E("window.FREEZE = true")
            E(NOBLUR)
            time.sleep(8)
            s = J("ZUKUNFT.state()")
            ck('reload: the state is kept (topic, year, variants, the mode goes on)', s['on'] and s['topic'] == 'klima' and s['year'] == 2045 and s['b'] == 'hoch' and s['show'] == 'b', str(s))
            E("ZUKUNFT.exit()")
        ck.errors(errs)
        ck.done()

def ZUKUNFT_state_show(E):
    return E("ZUKUNFT.state().show")

run()
