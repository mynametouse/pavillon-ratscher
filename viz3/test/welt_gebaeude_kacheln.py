# feat/welt-gebaeude: the world's image tiles without the printed roofs (welt-test/v2, tools/welt-gebaeude/kacheln.py; on by default since
# 6.11., ?welt1 shows the published photos) – before/after at five places along the routes (the blocks in the west of Schleusingen, the L 3004
# into Schleusingen, Rappelsdorf, Zollbrück, the road into Kloster Veßra): the 3D buildings stand in both, pictures at eye height and from
# 60 m up, without (?welt1) and with the set; the retouched tiles are taken where there are some, no page errors.
#   python3 viz3/test/welt_gebaeude_kacheln.py PORT
import sys, os, json, time, math, io, urllib.request, concurrent.futures
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__))); import lib
ROOT = lib.ROOT
port = sys.argv[1] if len(sys.argv) > 1 else '8951'
ck = lib.Checks('welt_gebaeude_kacheln')
OUT = lib.out('welt_gebaeude_kacheln')
SITE = 'https://mynametouse.github.io/pavillon-ratscher/welt-test/'
DIST = os.path.join(ROOT, 'viz3', 'dist', 'welt-test')
XF = json.load(open(os.path.join(ROOT, 'viz3', 'manifests.json')))['geoman']['xf']
utm = lambda x, y: (XF['a'] * x - XF['b'] * y + XF['ex'], XF['b'] * x + XF['a'] * y + XF['ey'])
SPOTS = [
    ('bloecke', -1775.0, 580.0, 122),       # Schleusingen west, the blocks of flats
    ('markt', -1180.7, 1075.6, 272),        # the L 3004 coming into Schleusingen, 500 m before the Markt
    ('rappelsdorf', -3206.0, -54.0, 264),   # Rappelsdorf, main street
    ('zollbrueck', -5487.5, -979.0, 260),   # Zollbrück on the way to Veßra
    ('vessra', -8647.3, -187.6, 266),       # the road into Kloster Veßra
]


def get(rel, force=False):
    p = os.path.join(DIST, rel)
    if os.path.exists(p) and not force:
        return 0
    try:
        b = urllib.request.urlopen(SITE + rel, timeout=60).read()
    except Exception:
        return 0
    os.makedirs(os.path.dirname(p), exist_ok=True)
    open(p, 'wb').write(b)
    return len(b)


get('meta.json'); get('zonen/vessra/meta.json'); get('v2/index.json', force=True)
metas = {'': json.load(open(os.path.join(DIST, 'meta.json'))), 'zonen/vessra/': json.load(open(os.path.join(DIST, 'zonen/vessra/meta.json')))}
v2 = set(json.load(open(os.path.join(DIST, 'v2', 'index.json')))['tiles'])
jobs = set()
for name, x, y, yaw in SPOTS:
    E, N = utm(x, y)
    for L in range(5, 13):
        s = 409600 / (1 << L)
        half = 450 if L >= 10 else 2 * s
        for tx in range(int((E - half - 420700) // s), int((E + half - 420700) // s) + 1):
            for ty in range(int((N - half - 5390800) // s), int((N + half - 5390800) // s) + 1):
                for sub, m in metas.items():
                    r = m['tiling']['levels'].get(str(L), {}).get('rect')
                    if r and r[0] <= tx <= r[2] and r[1] <= ty <= r[3]:
                        jobs.add(f'{sub}t/{L}/{tx}/{ty}.bin'); jobs.add(f'{sub}i/{L}/{tx}/{ty}.webp')
                        if f'{L}/{tx}/{ty}' in v2:
                            jobs.add(f'v2/i/{L}/{tx}/{ty}.webp')
                        break
v2jobs = [j for j in jobs if j.startswith('v2/')]
with concurrent.futures.ThreadPoolExecutor(8) as ex:
    n = sum(ex.map(lambda j: get(j, force=j.startswith('v2/')), sorted(jobs)))
print('tiles', len(jobs), 'v2', len(v2jobs), round(n / 1e6, 1), 'MB new', flush=True)

res = {}
for mode, q in (('ohne', '?welt1'), ('mit', '')):
    with lib.browser() as b:
        errs = []
        pg = lib.page(b, 1100, 680, errs, tier='hoch')
        lib.boot(pg, port, q)
        E = pg.evaluate
        J = lambda js: json.loads(E("JSON.stringify(" + js + ")"))
        E("document.querySelectorAll('#toast').forEach(e => e.style.visibility = 'hidden')")
        for name, x, y, yaw in SPOTS:
            t0 = time.time()
            E(f"(() => {{ document.body.dataset.mode = 'walk'; GAME.view({x}, {y}, KERN.ground({x}, {y}) + 1.6, {yaw}, -3, 60); for (let i = 0; i < 4; i++) GAME.step(0.25); }})()")
            last, calm = -1, 0
            for i in range(240):
                E("GAME.step(0.5)")
                s = J("({ w: WELT.state(), z: GEB.Z.state, jobs: GEB.jobs(), busy: GEB.Z.busy })")
                calm = calm + 1 if (s['w']['loading'] == 0 and s['w']['req'] == last and not s['jobs'] and not s['busy']) else 0
                last = s['w']['req']
                if i >= 12 and calm >= 6:
                    break
                time.sleep(0.25)
            E(f"(() => {{ GAME.view({x}, {y}, KERN.ground({x}, {y}) + 1.6, {yaw}, -3, 60); for (let i = 0; i < 6; i++) GAME.step(0.25); }})()")
            time.sleep(1.0); E("GAME.step(0.25)")
            lib.shot(pg, OUT, f'{name}_{mode}_boden')
            E(f"(() => {{ const P = GAME.P; P.mode = 'top'; P.tx = {x}; P.ty = {y}; P.th = 60; document.body.dataset.mode = 'top'; GAME.step(0.05); }})()")
            last, calm = -1, 0
            for i in range(120):
                E("GAME.step(0.25)")
                s = J("WELT.state()")
                calm = calm + 1 if (s['loading'] == 0 and s['req'] == last) else 0
                last = s['req']
                if i >= 10 and calm >= 4:
                    break
                time.sleep(0.25)
            lib.shot(pg, OUT, f'{name}_{mode}_top')
            st = J("({ w: WELT.state(), t2: { on: GEB.T2.on, state: GEB.T2.state, n: GEB.T2.n }, tex: GAME.R.info.memory.textures, geo: GAME.R.info.memory.geometries, heap: performance.memory ? Math.round(performance.memory.usedJSHeapSize / 1e6) : null })")
            st['secs'] = round(time.time() - t0, 1)
            res[f'{name}_{mode}'] = st
            print(name, mode, json.dumps(st), flush=True)
            E("document.body.dataset.mode = 'walk'")
        ck.errors(errs)
json.dump(res, open(os.path.join(OUT, 'state.json'), 'w'), indent=1)
for name, *_ in SPOTS:
    a, c = res.get(f'{name}_ohne', {}), res.get(f'{name}_mit', {})
    # (tiles the app asks for beyond the mirrored square answer 404 in both runs: the set may add none of its own)
    wa, wc = a.get('w', {}), c.get('w', {})
    ck(f'{name}: the world loaded in both runs, the same tiles, no more failed ones with the set', wa.get('tiles', 0) > 0 and wc.get('tiles', 0) == wa.get('tiles', 0) and wc.get('err', 0) <= wa.get('err', 0) + 2,
       json.dumps({'ohne': {k: wa.get(k) for k in ('tiles', 'req', 'err')}, 'mit': {k: wc.get(k) for k in ('tiles', 'req', 'err')}, 'tex': [a.get('tex'), c.get('tex')], 'heap': [a.get('heap'), c.get('heap')]}))
ck('without ?welt1 the retouched tiles are taken (the blocks, the L 3004, Rappelsdorf, Veßra)', all(res.get(f'{n}_mit', {}).get('t2', {}).get('n', 0) > 0 for n in ('bloecke', 'markt', 'rappelsdorf', 'vessra')), json.dumps({k: v.get('t2') for k, v in res.items()})[:400])
ck('with ?welt1 none of them', all(not res.get(f'{n}_ohne', {}).get('t2', {}).get('on') for n, *_ in SPOTS), json.dumps({k: v.get('t2') for k, v in res.items() if k.endswith('ohne')})[:300])
# side by side: without | with the set (where PIL is there)
try:
    from PIL import Image
    for name, *_ in SPOTS:
        for v in ('boden', 'top'):
            a = Image.open(os.path.join(OUT, f'{name}_ohne_{v}.jpg')); c = Image.open(os.path.join(OUT, f'{name}_mit_{v}.jpg'))
            w, h = a.size
            m = Image.new('RGB', (w * 2 + 8, h), (255, 255, 255)); m.paste(a, (0, 0)); m.paste(c, (w + 8, 0))
            m.save(os.path.join(OUT, f'{name}_{v}_vergleich.jpg'), quality=85)
except Exception as e:
    print('no side-by-side pictures', e, flush=True)
ck.done()
