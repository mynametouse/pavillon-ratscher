# Start time with and without KTX2 textures (docs/features/texturen.md), measured fairly: one warm-up load first (the first browser of a
# job is several seconds slower – disk cache – whatever it loads), then the modes in turns, several rounds; the median per mode.
# Modes: k2 = as published (KTX2 where tex2/ has the file), img = ?tex2=0 (the images), and any target family forced with ?tex2fmt=
# (astc, bc7, bc1, etc2, rgba). Per load: seconds until the model is shown, the GPU preparation (RENDER.prepMs) and the phases of the
# loading text (files, building, shaders, textures, first picture). Diagnostic: fails only when a load does not finish or the page errs.
#   python3 viz3/test/ktx2prof.py 8985 [modes] [rounds]     (default 'k2,img' and 3 rounds: 7 loads, ~5 min on GitHub)
import sys, os, json, time, statistics
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__))); import lib
port = sys.argv[1]; ck = lib.Checks('ktx2prof'); OUT = lib.out('ktx2prof')
MODES = (sys.argv[2] if len(sys.argv) > 2 and sys.argv[2] else 'k2,img').split(',')
ROUNDS = int(sys.argv[3]) if len(sys.argv) > 3 else 3
QUERY = lambda m: '' if m == 'k2' else '?tex2=0' if m == 'img' else '?tex2fmt=' + m
PHASES = [('Dateien', 'Modell wird geladen'), ('Aufbau', 'Modell wird aufgebaut'), ('Shader', 'Shader'), ('Texturen', 'Texturen'), ('Bild', 'erstes Bild')]
def run(mode):
    with lib.browser() as b:
        errs = []; pg = lib.page(b, 1000, 640, errs, tier='schnell')
        t0 = time.time(); pg.goto(f'http://localhost:{port}/index.html{QUERY(mode)}', timeout=300000, wait_until='domcontentloaded')
        first = {}; done = False
        while time.time() - t0 < 1500:
            try: s = pg.evaluate("(() => { const l = document.getElementById('loading'); return (l && !l.hidden ? l.textContent : '[shown]') + '|' + !!(window.GAME && GAME.loaded && GAME.loaded()); })()")
            except Exception: s = 'ERR|false'
            txt = s.split('|')[0]
            for name, pat in PHASES:
                if pat in txt and name not in first: first[name] = round(time.time() - t0, 1)
            if s.endswith('|true'): done = True; break
            time.sleep(0.2)
        t = round(time.time() - t0, 1)
        st = json.loads(pg.evaluate("JSON.stringify({ prep: GAME.RENDER ? GAME.RENDER.prepMs : null, n: window.TEX2 ? TEX2.n : 0, gn: window.TEX2 ? TEX2.gn || 0 : 0, fmt: window.TEX2 ? TEX2.fmt : {}, last: window.TEX2 ? TEX2.last || 0 : 0, mb: window.TEX2 ? Math.round(TEX2.mb) : 0, why: window.TEX2 ? TEX2.why : '' })"))
    r = {'mode': mode, 'shown': t, 'done': done, 'phases': first, **st, 'errs': [e for e in errs if 'Texture marked' not in e]}
    print(f"{mode:5s} shown {t:6.1f} s  prep {st['prep']} ms  phases {first}  KTX2 {st['n']}+{st['gn']} {st['fmt']} {st['mb']} MB {st['why']}", flush=True)
    return r
print(f'warm-up load ({MODES[0]}, not counted)', flush=True); run(MODES[0])
R = {m: [] for m in MODES}
for i in range(ROUNDS):
    for m in (MODES if i % 2 == 0 else MODES[::-1]): R[m].append(run(m))
json.dump(R, open(os.path.join(OUT, 'runs.json'), 'w'), indent=1)
med = lambda xs: round(statistics.median(xs), 1) if xs else None
print(f'\n== median of {ROUNDS} loads per mode (model shown s, GPU preparation s, time from "Texturen" to the model s)')
for m, rs in R.items():
    tex = [r['shown'] - r['phases']['Texturen'] for r in rs if 'Texturen' in r['phases']]
    print(f"  {m:5s} shown {med([r['shown'] for r in rs])} s  prep {med([r['prep'] / 1000 for r in rs if r['prep']])} s  textures→model {med(tex)} s"
          f"  (all: {[r['shown'] for r in rs]})", flush=True)
ck('every load finishes', all(r['done'] for rs in R.values() for r in rs), ', '.join(f"{m} {[r['shown'] for r in rs]}" for m, rs in R.items()))
ck.errors(sum((r['errs'] for rs in R.values() for r in rs), []))
ck.done()
