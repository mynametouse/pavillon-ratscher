# feat/zeitreise-welt: what the chronicle's states look and sound like (zukunft/zk_zeitwelt.js ZKZEITWELT) – the slopes around the village,
# logging, the heating house and its trench, the wind turbine, the heavy-rain night and its morning, the blackout night, the ambience.
# Stage 0: the API (warm/set/place/sound/clear) with stub states (ZKZEITWELT.demo, STATE v1) until ZKCHRONIK exists.
#   python3 viz3/test/zeitreise_welt.py 9013 [sections]   sections: api
import sys, os, json, time
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__))); import lib
port = sys.argv[1] if len(sys.argv) > 1 else '8951'
want = set((sys.argv[2] if len(sys.argv) > 2 else 'api').split(','))
ck = lib.Checks('zeitreise_welt')
OUT = lib.out('zeitreise_welt')


def run():
    with lib.browser() as b:
        errs = []
        pg = lib.page(b, 1280, 720, errs, tier='hoch')
        lib.boot(pg, port)
        E = pg.evaluate
        J = lambda js: json.loads(E("JSON.stringify(" + js + ")"))
        progs = lambda: E("GAME.R.info.programs.length")
        if 'api' in want:
            ck('ZKZEITWELT is there with its contract (warm, set, place, sound, clear)',
               E("!!window.ZKZEITWELT && ['warm', 'set', 'place', 'sound', 'clear'].every(k => typeof ZKZEITWELT[k] === 'function')"), '')
            p0 = progs()
            E("ZKZEITWELT.warm()")
            for w in ('allein', 'gewappnet'):
                for y in (2026, 2031.01, 2038.002, 2045, 2060):
                    s = J(f"ZKZEITWELT.demo('{w}', {y})")
                    f = s['forest']
                    tot = sum(f[k] for k in ('green', 'red', 'grey', 'cleared', 'fallen', 'young'))
                    ck(f'stub state {w} {y}: forest shares add up to 1', abs(tot - 1) < 0.02, json.dumps(f))
            E("window.__a = ZKZEITWELT.demo('allein', 2045); window.__g = ZKZEITWELT.demo('gewappnet', 2045)")
            ck('set(L, R) takes two states, set(L, null) one', E("ZKZEITWELT.set(__a, __g) !== undefined && ZKZEITWELT.S.split === true && (ZKZEITWELT.set(__a, null), ZKZEITWELT.S.split === false)"), '')
            pl = J("Object.fromEntries(['heizhaus', 'windrad', 'kahlflaeche', 'strasse', 'anger'].map(k => [k, ZKZEITWELT.place(k)]))")
            ck('place(): a pose for each built place, null for the regie\'s own', all(pl[k] and len(pl[k]['pos']) == 3 for k in ('heizhaus', 'windrad', 'kahlflaeche', 'strasse')) and pl['anger'] is None, json.dumps(pl))
            m = J("ZKZEITWELT.sound(ZKZEITWELT.demo('allein', 2031.01), ZKZEITWELT.demo('gewappnet', 2031.01), 'L')")
            ck('sound(): the heavy-rain night has rain and sirens', m and m['rain'] == 1 and m['sirens'] == 1, json.dumps(m))
            E("ZKZEITWELT.clear()")
            s = J("ZKZEITWELT.stats()")
            ck('clear(): back to today', not s['split'] and s['mix'] is None and not s['err'], json.dumps(s))
            print('programs', p0, '→', progs(), flush=True)
        ck.errors(errs)
        pg.close()
    ck.done()


run()
