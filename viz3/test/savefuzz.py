"""Broken saved states must not stop the start (lesson V16b4; SAVE, refactor phase 0): every key the app keeps in the browser gets garbage –
not JSON, wrong types, wrong nested shapes, NaN/Infinity, old names – then the page must still load, answer and step; SAVE lists what it ignored.
    python3 viz3/test/savefuzz.py 8951 [rounds, default 5]"""
import sys, os, json, time

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import lib

port = sys.argv[1]
ROUNDS = int(sys.argv[2]) if len(sys.argv) > 2 else 5
ck = lib.Checks('savefuzz')
GARBAGE = [
    lambda kind: 'kaputt {',  # not JSON
    lambda kind: '42',  # a number where an object is expected
    lambda kind: '[1,2,"x"]' if kind == 'json' else '-7',
    lambda kind: json.dumps({'v': 1, 'list': 5, 'n': 'x', 'st': 7, 'rack': 3, 'shelf': None, 'tent': 'y', 'car': ['x', None],
                             'tractor': [1e308, 'NaN', 0], 't': 'Mittag', 'rate': 99, 'e0': None, 'have': 'all', 'on': 7}),
    lambda kind: json.dumps({'v': 1, 'list': [{'id': 'a', 'where': 'ronald', 'x': None}], 'car': [5e5, -5e5, 9], 'bld': 'x',
                             'fences': 3, 'layout': [1], 'steps': 'x', 'open': True, 'at': 'gestern'}),
]
with lib.browser() as b:
    errs = []
    pg = lib.page(b, 900, 560, errs)
    lib.boot(pg, port)
    keys = pg.evaluate('SAVE.keys()')
    ck('SAVE knows the saved keys', len(keys) >= 20, f'{len(keys)} keys')
    ck.errors(errs)
    pg.close()
    for r in range(ROUNDS):
        g = GARBAGE[r % len(GARBAGE)]
        vals = {k['key']: g(k['kind']) for k in keys if k['key'] != 'pav-tier'}  # keep the preset tier (no GPU benchmark)
        errs = []
        pg = lib.page(b, 900, 560, errs)
        pg.add_init_script('(() => { const v = ' + json.dumps(vals) + '; for (const k in v) try { localStorage.setItem(k, v[k]); } catch (e) {} })()')
        t0 = time.time()
        try:
            lib.boot(pg, port)
            ok = pg.evaluate('(() => { for (let i = 0; i < 40; i++) GAME.step(0.05); return !!(GAME.loaded && GAME.loaded()); })()')
            prob = pg.evaluate('SAVE.problems.length')
        except Exception as e:
            ok, prob = False, -1
            print('load failed', str(e)[:300], flush=True)
        ck(f'round {r + 1}: starts and runs with broken saved values', ok, f'{round(time.time() - t0)} s, SAVE ignored {prob}')
        ck.errors(errs)
        pg.close()
ck.done()
