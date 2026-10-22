"""Error report by click (boot/report.js): menu → Einstellungen → „Fehlerbericht“ shows the report with device, graphics, load log and
errors; the GitHub link is prefilled; Escape closes only the report, the menu stays open; the text holds no saved values.
    python3 viz3/test/report.py 8951"""
import sys, os

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import lib

port = sys.argv[1]
ck = lib.Checks('report')
with lib.browser() as b:
    errs = []
    pg = lib.page(b, 1000, 640, errs)
    pg.add_init_script("try { localStorage.setItem('pav-layout', JSON.stringify({ secretNote: 'nicht im Bericht' })) } catch (e) {}")
    lib.boot(pg, port)
    E = pg.evaluate
    ck('build id on the page', E("!!(window.PAV_BUILD && PAV_BUILD.src !== undefined && PAV_BUILD.t)"), str(E('window.PAV_BUILD')))
    t = E('REPORT.text()')
    print(t[:1500], flush=True)
    for part in ('Pavillon Ratscher – Fehlerbericht', 'Gerät:', 'Grafik:', 'Stufe:', 'Ladeprotokoll', 'Gespeichert:', 'Ort:'):
        ck('report has ' + part, part in t, '')
    ck('saved values stay out (names only)', 'nicht im Bericht' not in t and 'pav-layout' in t, '')
    # through the menu
    E("document.getElementById('menubtn').click()")
    pg.wait_for_timeout(300)
    E("document.getElementById('reportbtn').click()")
    pg.wait_for_timeout(300)
    box = E("(() => { const b = document.getElementById('reportbox'); if (!b) return null; const a = b.querySelector('a'), ta = b.querySelector('textarea');"
            " return { href: a && a.href, len: ta && ta.value.length, visible: b.getBoundingClientRect().width > 0 }; })()")
    ck('menu button opens the report', bool(box and box['visible'] and box['len'] > 200), str(box and {k: v for k, v in box.items() if k != 'href'}))
    ck('GitHub link prefilled', bool(box and box['href'].startswith('https://github.com/mynametouse/pavillon-ratscher/issues/new?title=') and '&body=' in box['href']),
       (box or {}).get('href', '')[:90])
    lib.shot(pg, lib.out('report'), 'report')
    pg.keyboard.press('Escape')
    pg.wait_for_timeout(200)
    ck('Escape closes the report', E("!document.getElementById('reportbox')"), '')
    ck('… and the menu stays open', E("(() => { const m = document.getElementById('menu'); return !!m && !m.hidden && getComputedStyle(m).display !== 'none'; })()"), '')
    ck.errors(errs)
ck.done()
