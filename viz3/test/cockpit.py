# feat/cockpit: the inside of the cars and the graphics while moving (docs/features/cockpit.md). Pictures in out/cockpit/.
#   python3 viz3/test/cockpit.py PORT [sections]      sections (comma-separated, default all): grafik
# grafik: Menü → Einstellungen → Grafik „Beim Bewegen“ sets the motion level of render/render.js (fixed stages, back to automatic), no new
#         shader programs by switching, the frame-rate counter shows, both are kept after a reload, the five buttons fit a phone's width.
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
        E("GAME.shot(); GAME.shot(); GAME.shot()"); time.sleep(1.2)
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
    ck.errors(errs)
ck.done()
