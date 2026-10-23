# Phase 2 services in the running app (core/kern.js): places by priority, jump spots, the action button registry, start situations
# (?szenario=…), one journal for the tasks of every feature (KERN.tasks), zones and borrowed lights in the frame loop.
#   python3 viz3/test/run.py --port 8951 --serve kern2
import sys, os, json
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__))); import lib
port = sys.argv[1]; OUT = lib.out('kern2')
ck = lib.Checks('kern2')
with lib.browser() as b:
    errs = []; pg = lib.page(b, 1100, 700, errs, tier='mittel'); lib.boot(pg, port, '?szenario=freitag&bauphase=0'); E = pg.evaluate
    J = lambda s: json.loads(E('JSON.stringify(' + s + ')'))
    E("document.querySelectorAll('#toast').forEach(e => e.style.visibility = 'hidden'); GAME.setView3(false)")
    # the real start: construction phase 0, the old garage – the pavilion's lights stay in the scene (switched off by intensity)
    ph = J("{ phase: window.PHASE, lights: LIGHTS.map(l => [l.visible, l.intensity, !!l.userData.lent]), progs: GAME.perf().programs }")
    ck('starts in construction phase 0 (Bestand)', ph['phase'] == 0, json.dumps(ph))
    ck('… the pavilion lights stay visible, dark (unless lent)', all(v for v, i, lent in ph['lights']) and all(i == 0 for v, i, lent in ph['lights'] if not lent), json.dumps(ph['lights']))
    # the start situation ran after loading: Friday evening, in front of the old school
    E("for (let i = 0; i < 40; i++) GAME.step(0.1)")
    ev = J("KERN.events().map(e => e.name)")
    ck('the start situation ran (?szenario=freitag)', 'scenario' in ev, ','.join(ev[-12:]))
    st = J("DORF.state()")
    ck('… Friday evening: the Skat evening is on', st['cal']['wd'] == 5 and st['cal']['skat'], json.dumps(st['cal']))
    ck('scenarios listed', len(J("KERN.scenarios()")) >= 10, ','.join(J("KERN.scenarios().map(s => s.name)")))
    # places: the provider chain answers in the garden, at the pavilion, at Hubert's, in the village
    pl = J("[KERN.place(3, 15.2, 0), KERN.place(2, 2, 0.05), KERN.place(-20, 15, 0), KERN.place(241, -101, 0)]")
    ck('places by priority (garden, the old garage in phase 0, Hubert, village)', pl[0] == 'Garten' and pl[1] == 'Alte Garage' and pl[2] and pl[3], json.dumps(pl, ensure_ascii=False))
    ck('jump spots in the registry', all(k in J("Object.keys(KERN.spots())") for k in ['garten', 'dorf', 'schleusingen', 'werkstatt']), '')
    ck('action button entries in KERN', len(J("KERN.acts().map(a => a.id)")) > 5, str(len(J("KERN.acts().map(a => a.id)"))))
    # the journal: the neighbours' tasks plus the village's task once one is invited
    E("DORF.setStep && DORF.setStep('greet', true)")
    keys = J("KERN.tasks.list().map(e => e.key)")
    ck('journal sources: the neighbours and the village', any(k.startswith('nachbarn:') for k in keys) and 'dorf:freitag' in keys, ','.join(keys))
    E("QUESTS.toggleJournal(true)")
    n = J("document.querySelectorAll('#quests .qi').length")
    ck('the journal shows every entry', n == len(keys), f'{n} of {len(keys)}')
    E("document.querySelector('#quests [data-track=\"dorf:freitag\"]').click(); QUESTS.toggleJournal(false)")
    E("KERN.scenario('dorf').run(); for (let i = 0; i < 10; i++) GAME.step(0.1)")
    tk = J("(() => { const t = document.getElementById('qtrack'); return t ? { hidden: t.hidden, text: t.textContent } : null })()")
    ck('the tracker follows a village task', tk and not tk['hidden'] and 'Freitagabend' in tk['text'], json.dumps(tk, ensure_ascii=False))
    lib.shot(pg, OUT, 'tracker_dorf')
    # lights: the school's evening borrows three of the pavilion's lights (KERN.lights) when one is near
    E("DORF.atDoor && DORF.atDoor(); for (let i = 0; i < 30; i++) GAME.step(0.1)")
    ls = J("KERN.lights.status()")
    ck('lights lent to the school (in phase 0, too)', any(l['id'] == 'dorf-schule' and l['has'] == 3 for l in ls), json.dumps(ls))
    lit = J("LIGHTS.filter(l => l.userData.lent).map(l => +l.intensity.toFixed(1))")
    ck('… and they shine there', len(lit) == 3 and all(i > 1 for i in lit), json.dumps(lit))
    vis = J("LIGHTS.map(l => l.visible)")
    ck('… all pavilion lights still in the scene (no new light count, no recompiled shaders)', all(vis), json.dumps(vis))
    E("KERN.scenario('garten').run(); GAME.step(0.2)")
    E("document.querySelector('[data-spot=\"bibliothek\"]').click(); GAME.step(0.2)")
    ck('jumping into the library shows the pavilion built', J("window.PHASE") == J("PHASES.length - 1"), str(J("window.PHASE")))
    # the menu lists the scenes (KERN.scenario) – not the places the „Orte“ chips have; a scene that changes the story asks first
    E("HUD.setMenu(true)")
    sc = J("[...document.querySelectorAll('#scen-menu [data-scen]')].map(b => b.dataset.scen)")
    ck('the menu lists the scenes, not the places of „Orte“', len(sc) >= 6 and 'garten' not in sc and 'baumschule' in sc and 'wahltag' in sc, ','.join(sc))
    E("document.querySelector('#scen-menu [data-scen=\"wahltag\"]').click()")
    ask = J("{ open: !document.getElementById('menu').hidden, note: document.getElementById('scen-note').hidden ? '' : document.getElementById('scen-note').textContent }")
    ck('… a scene that changes the story asks first (menu stays open)', ask['open'] and 'Ortsvorsteher' in ask['note'], json.dumps(ask, ensure_ascii=False))
    lib.shot(pg, OUT, 'menu_szenen')
    E("HUD.setMenu(false); HUD.setMenu(true); document.querySelector('#scen-menu [data-scen=\"atelier\"]').click(); for (let i = 0; i < 10; i++) GAME.step(0.1)")
    at = J("{ open: !document.getElementById('menu').hidden, note: !document.getElementById('scen-note').hidden, place: KERN.place(GAME.P.x, GAME.P.y, GAME.P.feet + 0.5), ev: KERN.events().filter(e => e.name === 'scenario').map(e => e.data && e.data.name) }")
    ck('… one tap on a plain scene starts it and closes the menu (Atelier, inside)', not at['open'] and not at['note'] and at['place'] == 'Atelier' and 'atelier' in at['ev'], json.dumps(at, ensure_ascii=False))
    # the per-frame callbacks run on KERN.tick (phase 2) – named, none of them broken; the old list only for the modules not moved yet
    tk = J("{ ticks: KERN.ticks(), old: (window.TICKS || []).length, broken: (LOADLOG.errs || []).filter(e => /^Takt/.test(e)) }")
    ck('per-frame callbacks on KERN.tick, named, none broken', len(tk['ticks']) >= 20 and any(t.startswith('world/forest') for t in tk['ticks']) and not tk['broken'],
       f"{len(tk['ticks'])} on KERN.tick, {tk['old']} on window.TICKS; broken: {tk['broken']}")
    zs = J("KERN.zones()")
    ck('zones registered (Schleusingen idle far away)', any(z['id'] == 'schleusingen' and z['state'] == 'idle' for z in zs), json.dumps(zs))
    ck.errors(errs)
ck.done()
