# feat/grenzland: memory of the mode on a phone (iPhone 13 profile as viz3/test/memphone.py: halved textures). What the mode adds to the
# decoded texture images and to the renderer's resident memory (SwiftShader: the GPU side is only a hint): after the app's load, after the
# scene's start in Schleusingen, in free play in the garden, on the moped, at the barn, in 1989, after „Beenden“. Measures and reports
# (as GitHub annotations); fails only if the textures grow by more than 250 MB or the page dies.
#   python3 viz3/test/grenzland_speicher.py 8951   (~8 min; on GitHub Actions: the browser of the chat machine may not hold it)
import sys, os, json, time, subprocess
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__))); import lib
import grenzland_ci
# the same count of decoded images as memphone.py (read from there: importing it would run that test)
import re
TEXMB = re.search(r'TEXMB = """(.*?)"""', open(os.path.join(os.path.dirname(os.path.abspath(__file__)), 'memphone.py'), encoding='utf-8').read(), re.S).group(1)
port = sys.argv[1] if len(sys.argv) > 1 else '8951'
ck = grenzland_ci.wrap(lib.Checks('grenzland_speicher'), 'grenzland_speicher')
def rss():
    r = {}
    for ln in subprocess.run(['ps', '-eo', 'rss,args'], capture_output=True, text=True).stdout.split('\n'):
        if 'headless_shell' not in ln and 'chrome' not in ln: continue
        try: kb = int(ln.split()[0])
        except Exception: continue
        t = 'renderer' if '--type=renderer' in ln else 'gpu' if '--type=gpu-process' in ln else None
        if t: r[t] = r.get(t, 0) + kb // 1024
    return r
rows = []
from playwright.sync_api import sync_playwright
with sync_playwright() as p:
    b = p.chromium.launch(args=lib.ARGS); ctx = b.new_context(**p.devices['iPhone 13']); pg = ctx.new_page(); errs = []
    pg.on('pageerror', lambda e: errs.append('PAGEERR ' + str(e)))
    E = pg.evaluate
    steps = lambda secs, dt=0.1: E(f"for (let i = 0; i < {max(1, int(secs / dt))}; i++) GAME.step({dt})")
    def settle(n=10, s=0.3):
        for _ in range(n):
            steps(s); time.sleep(0.35)
    def mess(label):
        try:
            m = json.loads(E(TEXMB))
            h = E("performance.memory ? Math.round(performance.memory.usedJSHeapSize / 1e6) : -1")
            g = E("({ geo: GAME.R.info.memory.geometries, tex: GAME.R.info.memory.textures, prog: (GAME.R.info.programs || []).length })")
        except Exception as e:
            m, h, g = {'mb': -1}, -1, {'err': str(e)[:80]}
        r = rss()
        rows.append((label, m.get('mb'), h, r.get('renderer'), r.get('gpu'), g))
        print(f"{label}: textures {m.get('mb')} MB ({m.get('n')} images, level {m.get('level')}), JS heap {h} MB, rss {r}, three {g}", flush=True)
        return m.get('mb', -1)
    pg.goto(f'http://localhost:{port}/index.html', timeout=300000, wait_until='domcontentloaded')
    pg.wait_for_function("window.GAME && GAME.loaded && GAME.loaded()", timeout=1500000, polling=2000)
    time.sleep(3); E("window.FREEZE = true")
    t0 = mess('app loaded')
    alive = True
    def part(name, fn):
        global alive
        if not alive: return
        try:
            fn()
        except Exception as e:
            alive = False
            ck('the page lives through „%s“' % name, False, repr(e)[:200])
    def start():
        E("GRENZLAND.start()")
        for _ in range(60):
            steps(0.4); time.sleep(0.5)
            if E("!!GRENZLAND.partnerOf()"): break
        settle(12, 0.5)
        mess('scene started (Schleusingen, mission 1)')
    part('the start', start)
    def frei():
        E("(() => { GLMISSION.stop(); const d = GLMISSION.debug; if (d && d.info) for (const id of Object.keys(d.info().st || {})) GLSTATE.m[id] = { st: 'erledigt', i: 0, n: 0 }; "
          "GLSTATE.cur = ''; GLSTATE.kap1 = true; GLHUD.fade(false); GLFAHNDUNG.off = true; GAME.go('garten'); "
          "GLAUTO.mopedAt(GLDATA.ORTE.moped.pos[0], GLDATA.ORTE.moped.pos[1], GLDATA.ORTE.moped.az * Math.PI / 180); GLSTATE.tank = 3; })()")
        settle(12)
        mess('garden, free play')
    part('free play', frei)
    def moped():
        E("GAME.view(104, -316, KERN.ground(104, -316) + 1.6, 30, -5); GLAUTO.mopedAt(108, -312, 0.5)")
        steps(0.5)
        E("VEH.enter('gl-moped'); if (window.GLRADIO && GLRADIO.next) GLRADIO.next()")
        E("VEH.auto = () => ({ thr: 1, brk: 0, steer: 0, hand: false })")
        steps(6, 0.05); settle(6)
        mess('on the moped at the barn, radio on')
        E("VEH.auto = null; VEH.exit(); if (window.GLRADIO && GLRADIO.off) GLRADIO.off()")
    part('the moped', moped)
    def damals():
        E("window.__in = false; GL89.enter({ pos: [238.5, -72.5], yaw: 320 }).then(() => { window.__in = true; }); 0")
        for _ in range(60):
            steps(0.3); time.sleep(0.4)
            if E("window.__in === true"): break
        settle(10)
        mess('1989 at the school')
        E("window.__in = true; GL89.leave().then(() => { window.__in = false; }); 0")
        for _ in range(40):
            steps(0.3); time.sleep(0.4)
            if E("window.__in === false"): break
    part('1989', damals)
    def ende():
        E("GRENZLAND.stop()")
        settle(8)
        mess('after „Beenden“')
    part('the end', ende)
    top = max([r[1] or 0 for r in rows])
    ck('the page lived through the mode on a phone profile', alive, str(rows[-1]))
    ck('the mode adds less than 250 MB of decoded textures (phone)', alive and top - t0 < 250, f'{t0} → max {top} MB')
    summary = ' | '.join(f'{r[0]}: tex {r[1]} MB, heap {r[2]} MB, rss {r[3]}+{r[4]} MB' for r in rows)
    print(summary, flush=True)
    if os.environ.get('GITHUB_ACTIONS'):
        try:
            with open(f'/proc/{os.getppid()}/fd/1', 'w') as f:
                f.write('::notice title=grenzland_speicher::' + summary.replace('%', '%25') + '\n')
        except Exception: pass
    ck.errors(errs)
    ck.done()
    b.close()
