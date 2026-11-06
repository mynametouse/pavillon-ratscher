# feat/wissen (Falko, 5.11.2026 23:28: „viel zu entdecken … und viel zu lernen“): the discovery book (wissen/wissen.js WISSEN) across the
# modes. Normal start: the book with its chapters (menu button, key N); entries found by events of the other features (tiere:entdeckt –
# a known species and one the book has no entry for; strategie:entdeckt; the atelier), by places reached on foot (the Anger, the Dorflinde,
# the old school), by teachers (Gerhard's topic in the villagers' panel, Hubert's in the neighbours' panel – he says the line, then it
# opens), by an information board („Tafel lesen“); a „Warum?“ with text and a linked source, and the small „?“ beside a thought that names
# a rule; the boards draw without a new shader program; the soft notice; the saved state after a reload (also the generated entries);
# the zombie night starts with the book there; the strategy mode (when the build has it) gets the button in its bar. No page errors.
# Pictures in out/wissen/ (look at them).
# Data views on the plan view (Sonne, Lärm, Naturwert, Stimmung, Verkehr): on and off, legends, SVG only.
#   python3 viz3/test/wissen.py 9006 [sections]   sections: buch,ereignis,ort,lehrer,warum,wetter,tafel,daten,reload,telefon,zombie,strategie
#   (default all; 'stadt' – the boards in Schleusingen and Veßra – only when asked)
import sys, os, json, time
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__))); import lib
port = sys.argv[1] if len(sys.argv) > 1 else '8951'
want = set((sys.argv[2] if len(sys.argv) > 2 else 'buch,ereignis,ort,lehrer,warum,wetter,tafel,daten,reload,telefon,zombie,strategie').split(','))
ck = lib.Checks('wissen')
OUT = lib.out('wissen')
NOBLUR = "document.head.insertAdjacentHTML('beforeend', '<style>*{backdrop-filter:none!important;-webkit-backdrop-filter:none!important}</style>')"


def run():
    with lib.browser() as b:
        errs = []
        pg = lib.page(b, 1100, 700, errs)
        lib.boot(pg, port)
        E = pg.evaluate
        J = lambda js: json.loads(E("JSON.stringify(" + js + ")"))
        steps = lambda secs, dt=0.05: E(f"for (let i = 0; i < {max(1, int(secs / dt))}; i++) GAME.step({dt})")
        E(NOBLUR)

        def page_pic(name):
            try:
                E("GAME.shot()"); pg.screenshot(path=os.path.join(OUT, name + '.png'), timeout=120000); print('page shot', name, flush=True)
            except Exception as e:
                print('note: page shot', name, 'failed:', repr(e)[:160], flush=True)

        def goto(x, y, yaw=0, n=3):
            E(f"(() => {{ const P = GAME.P; P.mode = 'walk'; document.body.dataset.mode = 'walk'; P.x = {x}; P.y = {y}; P.feet = GAME.floorAt(P.x, P.y, (KERN.ground({x}, {y}) || 0) + 1.5); P.yaw = P.body = {yaw}; P.pitch = -4; }})()")
            steps(0.4 * n)

        st0 = J("WISSEN.state()")
        ck('the book is there with its entries and five chapters', st0['n'] >= 50 and len(J("WISSEN.data.CH")) == 5, f"{st0['n']} entries")
        ck('a fresh start: nothing found yet', len(st0['found']) == 0, str(st0['found'])[:200])
        ck('the menu entry is there from the start (before the book was ever opened)', E("!!document.getElementById('wibookbtn')"))
        ck('the save key is registered (SAVE.keys, so the broken-state test covers it)', 'pav-wissen-v1' in [k['key'] for k in J("SAVE.keys()")])
        p0 = E("GAME.R.info.programs.length")

        if 'buch' in want:
            pq0 = E("GAME.R.info.programs.length")
            E("HUD.setMenu(true, 'start')"); time.sleep(0.3)
            mb = J("(() => { const b = document.getElementById('wibookbtn'); return b ? { vis: b.offsetParent !== null, txt: b.textContent } : null; })()")
            ck('menu → „Entdeckerbuch“ on the start page', mb and mb['vis'] and 'Entdeckerbuch' in mb['txt'], str(mb))
            E("document.getElementById('wibookbtn').click()"); time.sleep(0.3)
            ui = J("(() => { const el = document.getElementById('wibook'); return { open: !el.hidden, tabs: [...el.querySelectorAll('nav button')].map(b => b.textContent), items: el.querySelectorAll('.wi-list li').length, menu: !document.getElementById('menu').hidden }; })()")
            ck('the book opens from the menu (and the menu closes)', ui['open'] and not ui['menu'], str(ui)[:200])
            ck('chapters Natur, Handwerk, Geschichte, Politik & Soziales, Orte (and the rules) as tabs with counts',
               len(ui['tabs']) == 6 and all(any(w in t for t in ui['tabs']) for w in ['Natur', 'Handwerk', 'Geschichte', 'Politik', 'Orte', 'Regeln']), str(ui['tabs']))
            ck('a chapter lists its entries (not yet found: a hint)', ui['items'] >= 5, str(ui['items']))
            pg.keyboard.press('n'); time.sleep(0.2)
            ck('key N closes it', J("WISSEN.isOpen") is False)
            pg.keyboard.press('n'); time.sleep(0.2)
            ck('key N opens it', J("WISSEN.isOpen") is True)
            E("GAME.shot()")
            ck('the open book compiles no shader program (it is a page, not 3D)', E("GAME.R.info.programs.length") == pq0, f"{pq0} → {E('GAME.R.info.programs.length')}")
            E("WISSEN.close()")

        if 'ereignis' in want:
            E("KERN.emit('tiere:entdeckt', { kind: 'art', id: 'rotmilan', title: 'Rotmilan', source: ['Rotmilan (Wikipedia)', 'https://de.wikipedia.org/wiki/Rotmilan'] })")
            time.sleep(0.6)
            no = J("(() => { const n = document.getElementById('winote'); return n ? { vis: !n.hidden, txt: n.textContent } : null; })()")
            ck('feat/tiere: a species seen → its entry (tier:rotmilan), with a soft notice', J("WISSEN.has('tier:rotmilan')") and no and no['vis'] and 'Rotmilan' in no['txt'], str(no))
            page_pic('01_hinweis')
            # the menu opens over a notice: it steps back, and comes again when the menu closes (a fresh notice, the first one may be gone)
            E("WISSEN.found('g_wende', 'tun:Test')"); time.sleep(0.6)
            shown = J("(() => { const n = document.getElementById('winote'); return !n.hidden && n.textContent.includes('Wende'); })()")
            E("HUD.setMenu(true)"); time.sleep(0.3)
            hid = J("document.getElementById('winote').hidden")
            E("HUD.setMenu(false)"); time.sleep(0.2); steps(1.7); time.sleep(0.3)
            back = J("(() => { const n = document.getElementById('winote'); return !n.hidden && n.textContent.includes('Wende'); })()")
            ck('a notice is not over the open menu – it comes again when the menu closes', shown is True and hid is True and back is True, str({'shown': shown, 'hidden_in_menu': hid, 'back': back}))
            E("KERN.emit('tiere:entdeckt', { kind: 'art', id: 'luchs', title: 'Luchs', source: ['Luchs (Wikipedia)', 'https://de.wikipedia.org/wiki/Luchs'] })")
            g = J("(() => { const e = WISSEN.get('tier:luchs'); return e ? { ch: e.ch, title: e.title, src: e.src } : null; })()")
            ck('a species the book has no entry for becomes one (Natur, with the source of the event)', g and g['ch'] == 'natur' and g['src'] and 'wikipedia' in (g['src'][0][1] or ''), str(g))
            E("KERN.emit('strategie:entdeckt', { kind: 'wald', id: 'kaefer', title: 'Borkenkäfer an der Klinge', source: 'ThüringenForst', text: 'Käferbäume', by: 'falko' })")
            ck('feat/strategie: exploring the beetle trees → the beetle entry (no second, generated one)', J("WISSEN.has('n_kaefer') && !WISSEN.get('st:wald:kaefer')"))
            # the book's search: what was discovered, not what is still hidden
            E("WISSEN.open('natur')"); time.sleep(0.2)
            pg.fill('#wibook .wi-find', 'milan'); time.sleep(0.2)
            sr = J("(() => { const b = document.querySelector('#wibook .wi-body'); const l = b.querySelector('.wi-lead'); return { lead: l ? l.textContent : '', items: [...b.querySelectorAll('[data-went]')].map(x => x.dataset.went) }; })()")
            ck('the book\'s search finds what was discovered („milan“ → Rotmilan)', 'tier:rotmilan' in sr['items'] and 'Treffer' in sr['lead'], str(sr))
            page_pic('01b_suche')
            pg.fill('#wibook .wi-find', 'Talsperre'); time.sleep(0.2)
            sr2 = J("(() => { const b = document.querySelector('#wibook .wi-body'); return { lead: b.querySelector('.wi-lead').textContent, items: [...b.querySelectorAll('[data-went]')].map(x => x.dataset.went) }; })()")
            ck('…and of what is still hidden only how much (no titles)', 'g_talsperre' not in sr2['items'] and 'noch nicht entdeckt' in sr2['lead'], str(sr2))
            pg.fill('#wibook .wi-find', ''); E("WISSEN.close()")
            if E("!!window.HUND"):
                E("KERN.emit('hund:gelernt', { tat: 'sitz', lob: true, learn: {} })")
                ck('feat/tiere: the dog praised → „Wie ein Hund lernt“ (operant conditioning)', J("WISSEN.has('n_hund')"))
            if E("!!window.BUS"):
                E("KERN.emit('bus:fahrplan', { halt: 'Ratscher' })")
                ck('feat/bus: the timetable at a stop read → „Der Bus auf dem Land“ (ThürÖPNVG)', J("WISSEN.has('p_bus')"))
            # the pavilion's build phases teach their crafts (pavilion/phases.js names): the facade, the clay plaster
            ph = J("(() => { const P = GAME.PHASES; return { y: P.findIndex(p => /Yakisugi/.test(p.name)), l: P.findIndex(p => /Lehmputz/.test(p.name)), n: P.length }; })()")
            if ph['y'] >= 0 and ph['l'] >= 0:
                steps(1.7)
                E(f"GAME.setPhase({ph['y']})"); steps(1.7)
                E(f"GAME.setPhase({ph['l']})"); steps(1.7)
                ck('the build phases teach: the facade → „Yakisugi“, the clay plaster → „Lehmputz“', J("WISSEN.has('h_yakisugi') && WISSEN.has('h_lehmputz')"), str(ph))
                E(f"GAME.setPhase({ph['n'] - 1})"); steps(0.3)
            E("KERN.emit('einrichtung:schale', { n: 1 })")
            ck('doing: a bowl thrown in the atelier → „Töpfern“', J("WISSEN.has('h_toepfern')"), str(J("WISSEN.state().how['h_toepfern']")))

        if 'ort' in want:
            V = J("({ L: VPROPS.LINDE, A: VPROPS.ANGER, s: VPROPS.school })")
            goto(V['A'][0] + 12, V['A'][1] + 2, 270)
            goto(V['L'][0] + 3, V['L'][1] - 3, 300)
            pl = E("document.getElementById('place') ? document.getElementById('place').textContent : ''")
            s = V['s']
            import math
            goto(s['cx'] + 5.5 * math.cos(s['rot']), s['cy'] + 5.5 * math.sin(s['rot']), 0)
            fs = J("WISSEN.state()")
            ck('on foot to the Dorflinde: „Die Dorflinde (1888)“ found at the place', 'g_linde' in fs['found'], str(fs['how'].get('g_linde')))
            ck('at the old school: „Die alte Schule (1828)“ and „Fachwerk“', 'g_schule' in fs['found'] and 'h_fachwerk' in fs['found'], str(fs['how'].get('g_schule')))
            ck('the Anger in the chapter Orte', 'o_anger' in fs['found'], str(sorted(fs['found'])))
            ck('how it was found is kept (the place name)', 'Schule' in (fs['how'].get('g_schule') or ''), fs['how'].get('g_schule'))

        if 'lehrer' in want:
            E("DORF.UI.open('gerhard')"); time.sleep(0.3)
            btns = J("[...document.querySelectorAll('#dorfpanel .topics button')].map(b => b.textContent)")
            ck('Gerhard (teacher, chronicler) has the topic „Erzähl von den Hennebergern“', any('Henneberg' in t for t in btns), str(btns))
            E("[...document.querySelectorAll('#dorfpanel .topics button')].find(b => b.textContent.includes('Henneberg')).click()"); time.sleep(0.3)
            say = E("document.querySelector('#dorfpanel .say').textContent")
            ck('he tells it in his words', 'Henneberg' in say, say[:120])
            ck('…and the entry „Die Grafen von Henneberg“ opens, found in the talk with Gerhard',
               J("WISSEN.has('g_henneberg')") and 'Gerhard' in (J("WISSEN.state().how['g_henneberg']") or ''), J("WISSEN.state().how['g_henneberg']"))
            bk = J("WISSEN.state()")
            ck('the book opens beside the talk on what he told (a wide screen)', bk['open'] and bk['view'] == 'g_henneberg', str({k: bk[k] for k in ('open', 'view')}))
            E("[...document.querySelectorAll('#dorfpanel .topics button')].find(b => b.textContent.includes('Handwerke')).click()")
            E("[...document.querySelectorAll('#dorfpanel .topics button')].find(b => b.textContent.includes('Handwerke')).click()")
            ck('a topic with one craft per line teaches them in turn (glass, then charcoal)', J("WISSEN.has('h_glas') && WISSEN.has('h_koehler') && !WISSEN.has('h_schiefer')"))
            page_pic('02_gerhard')
            E("DORF.UI.close()"); E("WISSEN.close()")
            # Hubert in his own panel (npc/npc.js extension topics)
            E("(() => { const w = NPC.NPCS.hubert, P = GAME.P; P.mode = 'walk'; P.x = w.x + 1.6; P.y = w.y; P.feet = GAME.floorAt(P.x, P.y, (w.z || 0) + 1.5); P.yaw = P.body = Math.atan2(w.x - P.x, w.y - P.y) * 180 / Math.PI; })()")
            steps(0.3)
            E("NPC.NPCUI.start(NPC.NPCS.hubert)")
            for i in range(40):
                if not E("NPC.NPCUI.busy()"): break
                time.sleep(0.5)
            hb = J("[...document.querySelectorAll('#np-topics button')].map(b => b.dataset.k + '|' + b.textContent)")
            ck('Hubert has „Wie trocknet man Holz richtig?“ among his topics', any('x_wi_trocknen' in t for t in hb), str(hb)[:300])
            E("(() => { const b = document.querySelector('#np-topics button[data-k=\"x_wi_trocknen\"]'); if (b) b.click(); })()")
            ok = False
            for i in range(60):
                steps(0.1)
                if J("WISSEN.has('h_trocknen')"): ok = True; break
                time.sleep(0.5)
            sub = E("document.getElementById('npcsub').textContent")
            ck('he says it (subtitle), then „Holz trocknen“ is found in the talk with Hubert', ok and 'Hubert' in (J("WISSEN.state().how['h_trocknen']") or ''), sub[:120])
            E("NPC.NPCUI.end(false)"); E("WISSEN.close()")

        if 'warum' in want:
            w = J("WISSEN.why('ruhe_sonntag')")
            ck('WISSEN.why: one sentence with a linked source (32. BImSchV on gesetze-im-internet.de)', w and len(w['text']) > 40 and any('gesetze-im-internet' in (s[1] or '') for s in w['src']), str(w)[:200])
            ck('a rule of the strategy mode the book knows under the same id', J("!!WISSEN.why('saftruhe') && !!WISSEN.why('psa_forst')"))
            E("PLAY.think('Heute ist Sonntag – Sonn- und Feiertagsruhe: der Mäher bleibt in der Garage.', 8000)"); time.sleep(0.4)
            chip = J("(() => { const c = document.getElementById('withink'); return c ? { vis: !c.hidden, l: c.style.left } : null; })()")
            ck('a thought that names a rule gets a small „?“ beside it', chip and chip['vis'], str(chip))
            E("document.getElementById('withink').click()"); time.sleep(0.3)
            ww = J("(() => { const el = document.getElementById('wiwhy'); return el ? { vis: !el.hidden, txt: el.textContent, links: [...el.querySelectorAll('a')].map(a => a.href) } : null; })()")
            ck('…tapped: „Warum?“ with the reason and the source', ww and ww['vis'] and 'Sonn' in ww['txt'] and ww['links'], str(ww)[:240])
            ck('the rule counts as understood (chapter Regeln)', 'ruhe_sonntag' in J("WISSEN.state().why"))
            page_pic('03_warum')
            E("document.querySelector('#wiwhy .x').click()")
            gc = J("(() => { const d = document.createElement('div'); d.innerHTML = '<ul class=\"gp-warns\"><li class=\"warn\"><button type=\"button\">Warnung Apfel: 1,2 m bis zur Grenze – nach Thüringer Nachbarrecht mindestens 1,5 m.</button></li><li class=\"hint\"><button type=\"button\">Hinweis zwei Kronen wachsen ineinander</button></li></ul>'; WISSEN.chips(d); return [...d.querySelectorAll('li')].map(li => (li.querySelector('[data-wiwhy]') || {}).dataset ? li.querySelector('[data-wiwhy]').dataset.wiwhy : null); })()")
            ck('the garden planner\'s warning on the boundary distance gets the „?“ (ThürNRG), one without a law none', gc == ['grenzabstand', None], str(gc))
            h = E("WISSEN.whyHTML('grenzabstand')")
            ck('WISSEN.whyHTML gives any panel its „?“', 'data-wiwhy="grenzabstand"' in h, h[:80])

        if 'wetter' in want and J("!!(window.WETTER && WETTER.preset)"):
            # feat/wetter: the weather of the moment (here one to try) → its entry; then back to the calendar's
            E("WETTER.preset('regen')"); steps(1.7)
            ck('feat/wetter: rain → „Regen am Gebirge“ (Steigungsregen), found by the weather', J("WISSEN.has('n_regen')"), str(J("WISSEN.state().how['n_regen'] || null")))
            E("WETTER.preset('sturm')"); steps(1.7)
            ck('…a storm → „Sturm und Windwurf“; a clear sky finds nothing', J("WISSEN.has('n_sturm') && !WISSEN.has('n_schnee') && !WISSEN.has('n_gewitter')"))
            # a clear sky for the pictures that follow (a weather to try, this visit only)
            E("WETTER.preset('klar'); if (WETTER.snap) WETTER.snap()"); steps(0.5)

        if 'tafel' in want:
            tb = J("WORTE.S.boards.map(b => ({ id: b.id, x: +b.x.toFixed(1), y: +b.y.toFixed(1), z: +b.z.toFixed(2) }))")
            ck('information boards at the real places (school, Dorflinde, brook, Klinge, dam)', len(tb) >= 4 and all(abs(b['z']) < 1000 for b in tb), str(tb))
            ck('their mesh is the village props\' material (no light, no new material)', J("!!WORTE.S.mesh && WORTE.S.mesh.material === VPROPS.mat.paint"))
            po = J("(() => { const B = WORTE.S.boards.find(b => b.id === 'schule'); if (!B) return null; const u = [-B.n[1], B.n[0]], q = [B.x + u[0] * 0.56, B.y + u[1] * 0.56], p = [q[0] + 0.05, q[1] + 0.02]; KERN.pushOut(p, 0.3); return +Math.hypot(p[0] - q[0], p[1] - q[1]).toFixed(3); })()")
            ck('a walker does not pass through a board\'s post (KERN.pushOut)', po is not None and po >= 0.36, str(po))
            sch = next((b for b in tb if b['id'] == 'schule'), None)
            sc = J("WORTE.S.schoolCheck || null")
            shd = J("(() => { const b = WORTE.S.boards.find(q => q.id === 'schule'), c = (window.DKDATA && DKDATA.open && DKDATA.open.shelter && DKDATA.open.shelter.c) || [248.8, -100.8]; return b ? +Math.hypot(b.x - c[0], b.y - c[1]).toFixed(1) : null; })()")
            ck('the board at the old school stands out of the ways: ≥ 2 m from the door and from the way to the school bus stop, away from its shelter (bus bay, evacuation bus), clear of the evening\'s beer table',
               sc is not None and sc['door'] >= 2 and sc['walk'] >= 2 and sc['shelter'] >= 6 and sc['table'] >= 0.9 and (shd or 0) >= 6, str({'check': sc, 'shelter_m': shd}))
            if sch:
                # the boards draw without a new shader program: the view with them hidden, then shown
                E(f"(() => {{ const b = WORTE.S.boards.find(q => q.id === 'schule'); GAME.view(b.x + b.n[0] * 4.2, b.y + b.n[1] * 4.2, b.z + 1.65, Math.atan2(-b.n[0], -b.n[1]) * 180 / Math.PI, -6); }})()")
                E("WORTE.S.mesh.visible = false"); E("GAME.shot()"); pa = E("GAME.R.info.programs.length")
                E("WORTE.S.mesh.visible = true"); lib.shot(pg, OUT, '04_tafel_schule'); pb = E("GAME.R.info.programs.length")
                ck('the board at the old school draws without a new shader program', pb == pa, f'{pa} → {pb}')
                goto(sch['x'] + J("WORTE.S.boards[0].n[0]") * 1.0, sch['y'] + J("WORTE.S.boards[0].n[1]") * 1.0, 180, 2)
                lab = J("(() => { const a = KERN.acts().find(a => a.id === 'wi:tafel:schule'); return a ? a.label() : null; })()")
                ck('„Tafel lesen“ at the board', lab and 'Tafel lesen' in lab, str(lab))
            E("WORTE.read('talsperre')"); time.sleep(0.3)
            st = J("WISSEN.state()")
            ck('reading the dam\'s board opens the book on „Die Talsperre Ratscher“ (found at the board)',
               st['open'] and st['view'] == 'g_talsperre' and 'tafel' in (st['how'].get('g_talsperre') or ''), str({k: st[k] for k in ('open', 'view')}))
            ent = J("(() => { const el = document.getElementById('wibook'); return { txt: el.querySelector('.wi-body').textContent, links: [...el.querySelectorAll('.wi-body a')].map(a => a.href) }; })()")
            ck('the entry shows what, why here and its sources as links', '1975' in ent['txt'] and 'Hier bei Ratscher' in ent['txt'] and any('structurae' in l for l in ent['links']), str(ent['links'])[:200])
            page_pic('05_buch_talsperre')
            E("WISSEN.open('geschichte')"); time.sleep(0.2)
            page_pic('06_buch_geschichte')
            dam = next((b for b in tb if b['id'] == 'talsperre'), None)
            if dam:
                E(f"(() => {{ const b = WORTE.S.boards.find(q => q.id === 'talsperre'); GAME.view(b.x + b.n[0] * 5, b.y + b.n[1] * 5, b.z + 1.7, Math.atan2(-b.n[0], -b.n[1]) * 180 / Math.PI, -8); }})()")
                lib.shot(pg, OUT, '07_tafel_talsperre')
            E("WISSEN.close()")

        if 'stadt' in want:
            # the board at the Bertholdsburg, made with the zone of Schleusingen (needs its tiles: locally, not in the branch CI)
            E("GAME.go('schleusingen')")
            ok = False
            for i in range(90):
                steps(0.5)
                if E("window.SCHL && SCHL.state === 'ready' && WORTE.S.boards.some(b => b.id === 'burg')"): ok = True; break
                time.sleep(0.5)
            ck('Schleusingen: a board at the Bertholdsburg once the town stands', ok, str(J("({ st: window.SCHL && SCHL.state, b: WORTE.S.boards.map(b => b.id) })")))
            if ok:
                E("(() => { const b = WORTE.S.boards.find(q => q.id === 'burg'); GAME.view(b.x + b.n[0] * 5, b.y + b.n[1] * 5, b.z + 1.7, Math.atan2(-b.n[0], -b.n[1]) * 180 / Math.PI, -6); })()")
                lib.shot(pg, OUT, '14_tafel_burg')
                E("WORTE.read('burg')")
                ck('…reading it opens „Schloss Bertholdsburg“', J("WISSEN.state().view") == 'g_burg')
                E("WISSEN.close()")
            E("GAME.go('garten')"); steps(2)

        if 'daten' in want:
            E("GAME.go('draufsicht')"); steps(1.0)
            # the plan view compiles its own programs when it is first shown – counted after it stands
            E("GAME.shot()"); steps(0.3); E("GAME.shot()")
            pd0 = E("GAME.R.info.programs.length")
            pn = J("(() => { const el = document.getElementById('widaten'); return el ? { vis: !el.hidden, chips: [...el.querySelectorAll('[data-wd]')].map(b => b.textContent) } : null; })()")
            ck('plan view: the panel „Daten-Ansichten“ with six views', pn and pn['vis'] and len(pn['chips']) == 6, str(pn))
            E("document.querySelector('#widaten [data-wdmin]').click()")
            fo = J("document.querySelectorAll('#widaten [data-wd]').length")
            E("document.querySelector('#widaten [data-wdmin]').click()")
            ck('its title folds it to one line and opens it again', fo == 0 and J("document.querySelectorAll('#widaten [data-wd]').length") == 6, str(fo))
            nsvg0 = E("document.getElementById('topsvg').querySelectorAll('polygon').length")
            E("document.querySelector('#widaten [data-wd=\"w_sonne\"]').click()"); steps(0.6)
            ws = J("WDATEN.state()")
            leg = E("document.getElementById('widaten').textContent")
            nsvg1 = E("document.getElementById('topsvg').querySelectorAll('polygon').length")
            ck('„Sonne“ on: sun hours over the garden computed (shade varies), drawn, with a legend',
               'w_sonne' in ws['on'] and ws['sun'] and ws['sun']['maxH'] > ws['sun']['min'] and nsvg1 > nsvg0 + 50 and 'Horizont' in leg, f"{ws['sun']} polygons {nsvg0} → {nsvg1}")
            ck('…and the entry „Sonne und Schatten im Garten“ is found by seeing', J("WISSEN.has('n_sonne')"))
            page_pic('09_daten_sonne')
            E("document.querySelector('#widaten [data-wd=\"w_sonne\"]').click()"); steps(0.6)
            ck('„Sonne“ off again', 'w_sonne' not in J("WDATEN.state().on") and E("document.getElementById('topsvg').querySelectorAll('polygon').length") <= nsvg0 + 2)
            for v in ['w_laerm', 'w_natur']:
                E(f"WDATEN.set('{v}', true)")
            steps(0.6)
            leg2 = E("document.getElementById('widaten').innerHTML")
            ck('„Lärm“ and „Naturwert“: legends, the quiet hours of today with their „?“', 'dB(A)' in leg2 and 'data-wiwhy' in leg2 and 'Uferstreifen' in leg2, leg2[:160])
            ck('the noise and nature entries found', J("WISSEN.has('p_laerm') && WISSEN.has('n_naturwert')"))
            page_pic('10_daten_laerm_natur')
            for v in ['w_laerm', 'w_natur']:
                E(f"WDATEN.set('{v}', false)")
            E("WDATEN.set('w_stimmung', true)"); E("WDATEN.set('w_verkehr', true)"); steps(1.2)
            ck('„Stimmung“ and „Verkehr“ on without errors (legend with the road classes)', 'Kreisstraße' in E("document.getElementById('widaten').textContent"))
            if E("!!(window.BUS && BUS.plan && BUS.plan.ready)"):
                bl = E("(() => { const p = [...document.querySelectorAll('#widaten p')].find(p => p.textContent.includes('Fahrplan')); return p ? p.textContent : ''; })()")
                ck('feat/bus: the traffic view counts today\'s buses in Ratscher by the real timetable', 'Ratscher' in bl and 'echten Fahrplan' in bl, bl[:160])
            page_pic('11_daten_verkehr_stimmung')
            E("WDATEN.set('w_stimmung', false)"); E("WDATEN.set('w_verkehr', false)")
            E("WDATEN.set('w_orte', true)"); steps(0.6)
            ck('„Orte der Geschichte“: the boards on the plan, read ones filled', E("document.getElementById('topsvg').innerHTML.includes('Der Bach am Garten')") and 'Tafel gelesen' in E("document.getElementById('widaten').textContent"))
            page_pic('11b_daten_orte')
            E("WDATEN.set('w_orte', false)")
            E("GAME.shot()")
            ck('the data views compile no shader program (SVG only)', E("GAME.R.info.programs.length") == pd0, f"{pd0} → {E('GAME.R.info.programs.length')}")
            E("GAME.go('garten')"); steps(1.0)
            ck('back on foot: the panel is gone', E("document.getElementById('widaten').hidden"))

        if 'strategie' in want:
            has = E("!!window.STRAT")
            if not has:
                print('note: the strategy mode is not in this build (feat/strategie not merged) – its section is skipped', flush=True)
            else:
                E("KERN.scenario('strategie') && KERN.scenario('strategie').run()"); steps(3)
                for i in range(20):
                    steps(0.5)
                    if E("!!document.querySelector('[data-wibook-st]')"): break
                ck('strategy mode: the book\'s button in its bar', E("!!document.querySelector('[data-wibook-st]')"))
                E("document.querySelector('[data-wibook-st]').click()"); time.sleep(0.2)
                ck('…opens the book from above', J("WISSEN.isOpen") is True)
                page_pic('08_strategie')
                E("WISSEN.close()")
                ly = J("STRAT.layer.list().map(L => L.id)")
                ck('the six data views are layers of its panel „Ebenen“ (off at first)', all(i in ly for i in ['w_orte', 'w_laerm', 'w_verkehr', 'w_sonne', 'w_natur', 'w_stimmung']) and not J("STRAT.layer.on('w_sonne')"), str(ly))
                E("STRAT.layer.set('w_sonne', true)"); steps(1.0)
                sv = J("(() => { const L = document.getElementById('widaten'); return { leg: L ? !L.hidden && L.textContent.includes('Horizont') : false, n: [...document.querySelectorAll('svg polygon')].filter(p => (p.getAttribute('style') || '').includes('fill:rgb')).length }; })()")
                ck('…„Sonne“ on from above: drawn on its map, with the legend', sv['leg'] and sv['n'] > 50, str(sv))
                ov = J("(() => { const a = document.getElementById('widaten').getBoundingClientRect(); const hit = id => { const e = document.getElementById(id); if (!e || !e.offsetParent) return false; const b = e.getBoundingClientRect(); return a.left < b.right && b.left < a.right && a.top < b.bottom && b.top < a.bottom; }; return { card: hit('stcard'), ppl: hit('stppl'), time: hit('sttime'), pan: hit('stpan') }; })()")
                ck('…its legend stands clear of the mode\'s people, chapter card, clock and panel', not any(ov.values()), str(ov))
                page_pic('08b_strategie_sonne')
                E("STRAT.layer.set('w_sonne', false)")
                E("KERN.emit('strategie:entdeckt', { kind: 'wald', id: 'sturmholz', title: 'Sturmholz: 3 Fichten geworfen', source: 'Waldbegang nach dem Sturm', text: 'Bäume unter Spannung', by: 'falko' })")
                ck('the windthrow found from above opens „Sturm und Windwurf“ (no generated entry)', J("WISSEN.has('n_sturm') && !WISSEN.get('st:wald:sturmholz')"))
                E("KERN.emit('strategie:entdeckt', { kind: 'wald', id: 'quellmulde', title: 'Eine Quellmulde am Hang', source: 'Waldbegang', text: 'nasser Boden, Binsen', by: 'falko' })")
                ck('an exploration of the strategy mode the book has no entry for becomes one (Natur)', J("(() => { const e = WISSEN.get('st:wald:quellmulde'); return !!e && e.ch === 'natur' && WISSEN.has(e.id); })()"))
                # its own „Warum?“ on a refusal: the rule counts as understood in the book, the reason gets the book's linked sources
                if J("!!(STRAT.D && STRAT.D.RULES && STRAT.D.RULES.saftruhe && STRAT.note)"):
                    E("(() => { const R = STRAT.D.RULES.saftruhe; STRAT.note(R.text, { kind: 'nein', why: R.why, src: R.src }); })()"); time.sleep(0.2)
                    E("(() => { const bs = [...document.querySelectorAll('button[data-why]')]; const b = bs[bs.length - 1]; if (b) b.click(); })()"); time.sleep(0.3)
                    sw = J("(() => { const bs = [...document.querySelectorAll('button[data-why]')]; const n = bs.length ? bs[bs.length - 1].closest('.n') : null; return { why: WISSEN.state().why, q: !!(n && n.querySelector('[data-wiwhy=\"saftruhe\"]')) }; })()")
                    ck('the strategy mode\'s own „Warum?“ (Saftruhe): understood in the book too, with „Quellen ›“', 'saftruhe' in sw['why'] and sw['q'], str(sw))
        found_before = J("WISSEN.state().found")
        E("WISSEN.saveNow()")
        ck.errors(errs)

        if 'reload' in want:
            # the same page loaded again (same localStorage): the saved state
            lib.boot(pg, port)
            f2 = J("WISSEN.state()")
            miss = [i for i in found_before if i not in f2['found']]
            ck('after a reload everything found is still found (pav-wissen-v1)', not miss and len(f2['found']) >= len(found_before), f'missing {miss}')
            if 'ereignis' in want:
                ck('…also the generated entry (tier:luchs) with its title', J("(() => { const e = WISSEN.get('tier:luchs'); return !!e && e.title === 'Luchs' && WISSEN.has('tier:luchs'); })()"))
            if 'warum' in want:
                ck('…and the understood rule', 'ruhe_sonntag' in f2['why'])
            ck.errors(errs)
        pg.close()

        if 'telefon' in want:
            # iPhone size with touch (Falko plays on an iPhone): the book and the data panel fit the screen
            errs4 = []
            pg4 = lib.page(b, 390, 780, errs4, is_mobile=True, has_touch=True, device_scale_factor=2)
            lib.boot(pg4, port)
            E4 = pg4.evaluate
            E4(NOBLUR)
            E4("KERN.emit('tiere:entdeckt', { kind: 'art', id: 'rotmilan', title: 'Rotmilan' })")
            E4("WISSEN.open('tier:rotmilan')")
            r = json.loads(E4("JSON.stringify((() => { const el = document.getElementById('wibook'), r = el.getBoundingClientRect(), b = el.querySelector('.wi-body'); return { l: r.left, r: r.right, t: r.top, b: r.bottom, W: innerWidth, H: innerHeight, over: b.scrollWidth > b.clientWidth + 1 }; })())"))
            ck('phone: the book fits the screen (no sideways scrolling)', r['l'] >= 0 and r['r'] <= r['W'] and r['b'] <= r['H'] and not r['over'], str(r))
            try:
                E4("GAME.shot()"); pg4.screenshot(path=os.path.join(OUT, '12_telefon_buch.png'), timeout=120000)
            except Exception as e:
                print('note: phone shot failed', repr(e)[:120])
            E4("WISSEN.close(); GAME.go('draufsicht')"); E4("for (let i = 0; i < 20; i++) GAME.step(0.05)")
            E4("WDATEN.set('w_natur', true)"); E4("for (let i = 0; i < 12; i++) GAME.step(0.05)")
            d = json.loads(E4("JSON.stringify((() => { const el = document.getElementById('widaten'), r = el.getBoundingClientRect(); return { vis: !el.hidden, l: r.left, r: r.right, t: r.top, b: r.bottom, W: innerWidth, H: innerHeight }; })())"))
            ck('phone: the data panel is shown and fits', d['vis'] and d['l'] >= 0 and d['r'] <= d['W'] and d['t'] >= 0 and d['b'] <= d['H'], str(d))
            try:
                E4("GAME.shot()"); pg4.screenshot(path=os.path.join(OUT, '13_telefon_daten.png'), timeout=120000)
            except Exception as e:
                print('note: phone shot failed', repr(e)[:120])
            ck.errors(errs4)
            pg4.close()

        if 'zombie' in want:
            errs3 = []
            pg3 = lib.page(b, 1000, 640, errs3)
            # a broken saved value as well: the page starts anyway and SAVE notes it
            pg3.add_init_script("try { localStorage.setItem('pav-wissen-v1', '{\"v\":1,\"f\":5}'); } catch (e) {}")
            lib.boot(pg3, port, '?szenario=zombie')
            pg3.evaluate("for (let i = 0; i < 60; i++) GAME.step(0.05)")
            z = json.loads(pg3.evaluate("JSON.stringify({ z: !!(window.ZSTATE && ZSTATE.on), w: !!window.WISSEN, p: SAVE.problems.map(p => p.key) })"))
            ck('the zombie night starts as before, the book is there (a broken pav-wissen-v1 was ignored)', z['z'] and z['w'] and 'pav-wissen-v1' in z['p'], str(z))
            pg3.evaluate("WISSEN.open()")
            ck('…and opens there too', pg3.evaluate("WISSEN.isOpen"))
            ck.errors(errs3)
            pg3.close()


run()
ck.done()
