# load time with and without the test shortcuts (tier preset = no GPU benchmark; ?nogeo=1 = no real surroundings; ?lowfig=1 = simple figures)
import sys, os, time
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__))); import lib
port = sys.argv[1]
for q, preset in [('', True), ('?nogeo=1', True)]:
    with lib.browser() as b:
        pg = lib.page(b, 900, 560)
        if preset: pg.add_init_script("try { localStorage.setItem('pav-tier', 'schnell'); } catch (e) {}")
        t0 = time.time(); lib.boot(pg, port, q, figures=True)
        print(q or '(full)', 'preset' if preset else '', round(time.time() - t0), 's', pg.evaluate("JSON.stringify({ prep: GAME.RENDER.prepMs, tier: GAME.RENDER.tier })"), flush=True)
