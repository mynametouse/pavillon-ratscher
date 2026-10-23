# Phase 2 services in the running app (core/kern.js): places by priority, jump spots, the action button registry, start situations
# (?szenario=…), one journal for the tasks of every feature (KERN.tasks), zones and borrowed lights in the frame loop.
#   python3 viz3/test/run.py --port 8951 --serve kern2
import sys, os, json
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__))); import lib
port = sys.argv[1]; OUT = lib.out('kern2')
ck = lib.Checks('kern2')
with lib.browser() as b:
    errs = []; pg = lib.page(b, 1100, 700, errs, tier='mittel'); lib.boot(pg, port, '?szenario=freitag'); E = pg.evaluate
    J = lambda s: json.loads(E('JSON.stringify(' + s + ')'))
    E("document.querySelectorAll('#toast').forEach(e => e.style.visibility = 'hidden'); GAME.setView3(false)")
    # the start situation ran after loading: Friday evening, in front of the old school
    E("for (let i = 0; i < 40; i++) GAME.step(0.1)")
    ev = J("KERN.events().map(e => e.name)")
    ck('the start situation ran (?szenario=freitag)', 'scenario' in ev, ','.join(ev[-12:]))
    st = J("DORF.state()")
    ck('… Friday evening: the Skat evening is on', st['cal']['wd'] == 5 and st['cal']['skat'], json.dumps(st['cal']))
    ck('scenarios listed', len(J("KERN.scenarios()")) >= 10, ','.join(J("KERN.scenarios().map(s => s.name)")))
    # places: the provider chain answers in the garden, at the pavilion, at Hubert's, in the village
    pl = J("[KERN.place(3, 15.2, 0), KERN.place(2, 2, 0.05), KERN.place(-20, 15, 0), KERN.place(241, -101, 0)]")
    ck('places by priority (garden, library, Hubert, village)', pl[0] and pl[1] and pl[2] and pl[3] and pl[1] != pl[0], json.dumps(pl, ensure_ascii=False))
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
    ck('lights lent to the school', any(l['id'] == 'dorf-schule' and l['has'] == 3 for l in ls), json.dumps(ls))
    zs = J("KERN.zones()")
    ck('zones registered (Schleusingen idle far away)', any(z['id'] == 'schleusingen' and z['state'] == 'idle' for z in zs), json.dumps(zs))
    ck.errors(errs)
ck.done()
