# feat/workshop: the Workshop mode (zukunft/zk_workshop.js WORKSHOP). ?workshop enters, the game HUD is gone, the badge shows, the start screen and
# the Szenario-Kreuz are readable (font sizes by the big-screen rules), the Ebenen panel is labelled and each toggle changes its system, the keys
# call the right ZKREGIE functions (mocks until the real ones land), Esc/badge leave and everything is back; the strategy mode's Ebenen labels are
# light; a phone width does not break; no page errors. Pictures in out/workshop/ – look at them.
#   python3 viz3/test/workshop.py 8951 [sections]   sections: start,ebenen,spiel,ende,strategie,telefon
import sys, os, json, time
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__))); import lib
port = sys.argv[1] if len(sys.argv) > 1 else '8951'
want = set((sys.argv[2] if len(sys.argv) > 2 else 'start,ebenen,spiel,ende,strategie,telefon').split(','))
ck = lib.Checks('workshop')
OUT = lib.out('workshop')


def run():
    with lib.browser() as b:
        errs = []
        pg = lib.page(b, 1920, 1080, errs, tier='schnell')
        lib.boot(pg, port, '?nogeo=1&workshop', freeze=False)
        E = pg.evaluate
        J = lambda js: json.loads(E("JSON.stringify(" + js + ")"))
        vis = lambda sel: E(f"(() => {{ const e = document.querySelector('{sel}'); return !!e && getComputedStyle(e).display !== 'none' && e.getClientRects().length > 0; }})()")
        px = lambda sel: E(f"parseFloat(getComputedStyle(document.querySelector('{sel}')).fontSize)")
        vh = lambda p: p * 10.8  # 1 vh at 1920x1080

        def pic(name):
            time.sleep(0.8)
            try:
                pg.screenshot(path=os.path.join(OUT, name + '.png'), timeout=120000); print('page shot', name, flush=True)
            except Exception as e:
                print('note: page shot', name, 'failed:', repr(e)[:160], flush=True)

        pg.wait_for_function("window.WORKSHOP && WORKSHOP.S.on", timeout=60000)
        if 'start' in want:
            ck('?workshop enters the mode', E("WORKSHOP.S.on && document.body.classList.contains('ws-on')"))
            ck('the start screen is shown', vis('#ws-start') and E("WORKSHOP.S.screen") == 'menu')
            hidden = E("['hotbar','moves','act2','actrow','joy','hudtr','hint','menubtn','camtog','toast'].filter(id => { const e = document.getElementById(id); return e && getComputedStyle(e).display !== 'none'; })")
            ck('the game HUD is hidden', hidden == [], str(hidden))
            ck('the badge „Workshop“ with „Zurück ins Spiel“ is visible', vis('#ws-badge') and 'Zurück ins Spiel' in E("document.getElementById('ws-badge').textContent"))
            ck('title in the start screen ≥ 8 vh (px)', px('#ws-start h1') >= vh(7.5), str(px('#ws-start h1')))
            ck('lead sentence, cross cells and legend ≥ 2.6 vh', min(px('#ws-start .lead'), px('#ws-cross .cell span'), px('#ws-legend')) >= vh(2.6) - 0.5, str([px('#ws-start .lead'), px('#ws-cross .cell span'), px('#ws-legend')]))
            ck('the Szenario-Kreuz has four worlds, two active', E("document.querySelectorAll('#ws-cross .cell').length") == 4 and E("document.querySelectorAll('#ws-cross .cell:not(.stub)').length") == 2)
            ck('the dormant worlds say „kommt in Stufe 2“', E("document.querySelectorAll('#ws-cross .cell.stub').length") == 2 and 'Stufe 2' in E("document.querySelector('#ws-cross .cell.stub').textContent"))
            ck('the menu tile exists', E("!!document.getElementById('workshopbtn')"))
            ck('the scenario is in the Szenen list', 'workshop' in J("KERN.scenarios().map(s => s.name)"))
            ck('the save key is registered', 'pav-workshop-v1' in [k['key'] for k in J("SAVE.keys()")])
            pic('01-start')
        if 'ebenen' in want:
            E("WORKSHOP.key({ key: 'l', preventDefault() {}, stopImmediatePropagation() {} })")
            ck('the Ebenen panel opens (key L)', vis('#ws-lay'))
            n = E("document.querySelectorAll('#ws-lay label').length")
            ck('eleven layers, each with a label and an explanation', n == 11 and E("[...document.querySelectorAll('#ws-lay label')].every(l => l.querySelector('b').textContent.length > 3 && l.querySelector('small').textContent.length > 10)"), str(n))
            ck('label text ≥ 2.6 vh and light', px('#ws-lay label small') >= vh(2.6) - 0.5 and E("(() => { const c = getComputedStyle(document.querySelector('#ws-lay label b')).color.match(/\\d+/g).map(Number); return Math.min(...c) > 180; })()"))
            ck('every label has its checkbox', E("[...document.querySelectorAll('#ws-lay label')].every(l => !!l.querySelector('input[type=checkbox]'))"))
            pic('02-ebenen')
            # each toggle really switches its system
            E("WORKSHOP.layers.set('verkehr', true); WORKSHOP.layers.set('leute', true); WORKSHOP.layers.set('bus', true); WORKSHOP.layers.set('tiere', true)")
            ck('layers on: nothing muted', not any(J("['dorf/dorf','npc/life','bus','tiere','hund'].map(n => KERN.mute(n))")))
            E("WORKSHOP.layers.set('leute', false); WORKSHOP.layers.set('bus', false); WORKSHOP.layers.set('tiere', false)")
            m = J("['dorf/dorf','npc/life','bus','tiere','hund'].map(n => KERN.mute(n))")
            ck('Leute, Busse, Tiere off: their per-frame callbacks are muted', all(m), str(m))
            E("WORKSHOP.layers.set('verkehr', false)")
            ck('Verkehr off: no autos, no walkers, none spawned', E("VERKEHR.S.auto === false && VERKEHR.S.peds.length === 0 && VAUTO.cars.length === 0"))
            E("WORKSHOP.layers.set('untertitel', false)")
            ck('Untertitel off: class set', E("document.body.classList.contains('ws-no-sub')"))
            E("WORKSHOP.layers.set('untertitel', true); WORKSHOP.layers.set('stimmen', false)")
            ck('Stimmen off: voice volume 0', J("WORKSHOP.vols().stimmen") == 0)
            E("WORKSHOP.layers.set('stimmen', true)")
            ck('Stimmen on: volume back', J("WORKSHOP.vols().stimmen") > 0)
            ck('the choices are remembered per browser', 'stimmen' in E("localStorage.getItem('pav-workshop-v1') || ''"), E("localStorage.getItem('pav-workshop-v1')"))
            E("WORKSHOP.layers.reset()")
            ck('Voreinstellung: Leute, Verkehr, Busse, Tiere off, the overlays on', J("WORKSHOP.layers.list().filter(l => l.on && l.id !== 'testlayer').map(l => l.id)") == ['ortsnamen', 'untertitel', 'stimmen', 'umgebungston', 'jahr', 'kennzahlen'])
            E("document.querySelector('#ws-lay [data-a=layers-close]').click()")
            ck('Fertig closes the panel', not vis('#ws-lay'))
        if 'spiel' in want:
            E("WORKSHOP.begin()")
            time.sleep(1)
            s = J("WORKSHOP.regie().state()")
            ck('begin starts the regie with the pair, split', s['on'] and s['pair'] == ['allein', 'gewappnet'] and s['split'], str(s))
            try: pg.wait_for_function("document.body.classList.contains('ws-playing') && document.getElementById('ws-top').getBoundingClientRect().height > 50", timeout=20000)
            except Exception: pass
            ck('letterbox bars while it plays', E("document.body.classList.contains('ws-playing')") and E("document.getElementById('ws-top').getBoundingClientRect().height") > 50)
            ck('year ≥ 12 vh, two world titles over the halves', px('#ws-year') >= vh(11.5) and E("document.querySelectorAll('#ws-titles span').length") == 2)
            ck('the timeline has chapters and markers', E("document.querySelectorAll('#ws-tl .seg').length") == 3 and E("document.querySelectorAll('#ws-tl .mk').length") >= 1)
            ck('a chapter intro „Kapitel 1: Wald · 2026 → 2050“ shows', 'Kapitel 1' in E("document.getElementById('ws-intro').textContent") and vis('#ws-intro'), E("document.getElementById('ws-intro').textContent"))
            pic('03-spiel')
            key = lambda k: E(f"WORKSHOP.key({{ key: '{k}', preventDefault() {{}}, stopImmediatePropagation() {{}} }})")
            E("WORKSHOP.regie().seek(2026)")
            pg.wait_for_function("WORKSHOP.regie().state().playing", timeout=60000)
            key(' ')
            try: pg.wait_for_function("!WORKSHOP.regie().state().playing", timeout=15000)
            except Exception: pass
            ck('Space pauses', not J("WORKSHOP.regie().state().playing"))
            try: pg.wait_for_function("getComputedStyle(document.getElementById('ws-pause')).display !== 'none'", timeout=15000)
            except Exception: pass
            ck('the pause screen shows', vis('#ws-pause'), E("document.getElementById('ws-pause').className + ' | ' + JSON.stringify(WORKSHOP.regie().state()) + ' | ' + JSON.stringify(WORKSHOP.state())"))
            pic('04-pause')
            ck('slots: phone slot on the right third, card-extra exists', J("(() => { const e = WORKSHOP.slot('phone'), r = e.getBoundingClientRect(); return r.left > innerWidth * 0.6 && r.height > innerHeight * 0.6 && !!WORKSHOP.slot('card-extra'); })()"))
            ck('the page header is invisible', E("getComputedStyle(document.querySelector('header.top')).visibility") == 'hidden')
            ck('the view label „Modellansicht – Entwurfsstudie“ is not shown', not vis('.ov.where small') and (not vis('.ov.where') or not E("/^Modellansicht/.test(document.getElementById('where').textContent)")), E("document.getElementById('where').textContent"))
            E("WORKSHOP.layers.define({ id: 'testlayer', label: 'Testebene', text: 'Eine Ebene eines anderen Moduls', on: false, set: v => { window.__tl = v; } })")
            ck('layers.define adds a layer and calls set', E("window.__tl") is False and 'testlayer' in J("WORKSHOP.layers.list().map(l => l.id)"))
            E("WORKSHOP.layers.set('testlayer', true)")
            ck('the defined layer switches', E("window.__tl") is True)
            key(' ')
            ck('Space plays again', J("WORKSHOP.regie().state().playing"))
            key('b')
            ck('B: black screen', vis('#ws-black'))
            key('b')
            ck('B again: back', not vis('#ws-black'))
            # run into the first chapter end (card)
            E("WORKSHOP.regie().seek(2049.5)"); E("WORKSHOP.regie().play()")
            pg.wait_for_function("WORKSHOP.regie().state().card || WORKSHOP.regie().state().ev", timeout=40000)
            time.sleep(1)
            if vis('#ws-card'):
                ck('the chapter-end card has numbers of both worlds, a source line and questions', E("document.querySelectorAll('#ws-card th').length") == 3 and 'Quellen' in E("document.getElementById('ws-card').textContent") and vis('#ws-card .q'))
                ck('card figures ≥ 3 vh', px('#ws-card td.v') >= vh(3) - 0.5)
                ck('the card does not show the year', E("getComputedStyle(document.getElementById('ws-year')).visibility") == 'hidden')
                ck('the card-extra area sits inside the card', E("document.getElementById('ws-card').contains(document.getElementById('ws-card-extra'))"))
                pic('05-karte')
        if 'ende' in want:
            E("WORKSHOP.key({ key: 'Escape', preventDefault() {}, stopImmediatePropagation() {} })")
            ck('Esc: back to the workshop menu', E("WORKSHOP.S.screen") == 'menu' and vis('#ws-start'))
            E("document.querySelector('#ws-badge [data-a=leave]').click()")
            ck('the badge leaves the mode', not E("WORKSHOP.S.on") and not E("document.body.classList.contains('ws-on')"))
            back = E("document.getElementById('menubtn') && getComputedStyle(document.getElementById('menubtn')).display !== 'none' && getComputedStyle(document.getElementById('hudtr')).display !== 'none'")
            ck('the game HUD is back', back)
            ck('systems are running again', not any(J("['dorf/dorf','npc/life','bus','tiere'].map(n => KERN.mute(n))")))
            ck('the overlay is hidden', not vis('#ws'))
        if 'strategie' in want:
            E("KERN.scenario('strategie').run()")
            time.sleep(4)
            E("(document.querySelector('.stb[data-a=layers]') || {click(){}}).click()")
            time.sleep(1)
            c = E("(() => { const l = document.querySelector('#stlayers label'); if (!l) return null; const m = getComputedStyle(l).color.match(/\\d+/g).map(Number); return m; })()")
            ck('strategy mode Ebenen: the label text colour is light', c is not None and min(c[:3]) > 200, str(c))
            pic('06-strategie-ebenen')
        if 'telefon' in want:
            pg.set_viewport_size({'width': 390, 'height': 760})
            E("WORKSHOP.enter()"); time.sleep(1)
            ck('phone width: the start screen shows and nothing scrolls sideways', vis('#ws-start') and E("document.documentElement.scrollWidth <= window.innerWidth + 1"))
            pic('07-telefon')
            pg.set_viewport_size({'width': 1280, 'height': 720})
            time.sleep(0.5)
            ck('1280×720: start screen cross visible', vis('#ws-cross') and px('#ws-start .lead') >= 720 * 0.026 - 0.5)
            pic('08-720p')
            E("WORKSHOP.leave()")
        ck.errors(errs)
    ck.done()


run()
