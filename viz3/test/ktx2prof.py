# Where the start goes with and without KTX2 textures (docs/features/texturen.md): the page loaded several times – as published, with each
# target format family forced (?tex2fmt=astc|bc7|bc1|etc2|rgba) and with ?tex2=0 (the images) –
# with a CPU profile of the main thread from the first byte until the model is shown (like loadprof.py). Prints per run: seconds to the
# model, the loading text's steps (Shader, Texturen, erstes Bild), main-thread time in texture uploads (texSubImage2D, compressedTexSubImage2D,
# uploadTexture) and the top functions; then the difference. Diagnostic: no checks fail except a run that does not load.
#   python3 viz3/test/ktx2prof.py 8985 [modes]    (modes: comma-separated, default 'k2,bc7,bc1,etc2,rgba,img'; k2 = as published, img = ?tex2=0)
import sys, os, re, json, time, collections
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__))); import lib
port = sys.argv[1]; tier = 'schnell'; ck = lib.Checks('ktx2prof'); OUT = lib.out('ktx2prof')
MODES = (sys.argv[2] if len(sys.argv) > 2 else 'k2,bc7,bc1,etc2,rgba,img').split(',')
QUERY = lambda m: '' if m == 'k2' else '?tex2=0' if m == 'img' else '?tex2fmt=' + m
UP = ('texSubImage2D', 'texImage2D', 'compressedTexSubImage2D', 'compressedTexImage2D', 'generateMipmap', 'texStorage2D')
def run(query):
    with lib.browser() as b:
        errs = []; pg = lib.page(b, 1000, 640, errs, tier=None if tier == 'none' else tier)
        cdp = pg.context.new_cdp_session(pg); cdp.send('Profiler.enable'); cdp.send('Profiler.setSamplingInterval', {'interval': 1000}); cdp.send('Profiler.start')
        t0 = time.time(); pg.goto(f'http://localhost:{port}/index.html{query}', timeout=300000, wait_until='domcontentloaded'); steps = []; last = None; done = False
        while time.time() - t0 < 1500:
            try: s = pg.evaluate("(() => { const l = document.getElementById('loading'); return (l && !l.hidden ? l.textContent : '[shown]') + '|' + !!(window.GAME && GAME.loaded && GAME.loaded()); })()")
            except Exception: s = 'ERR|false'
            k = re.sub(r'[\d.,%\s]+', ' ', s.split('|')[0]).strip()   # the kind of step, without its numbers
            if k != last: steps.append((round(time.time() - t0, 1), s.split('|')[0][:60])); last = k
            if s.endswith('|true'): done = True; break
            time.sleep(0.25)
        t = round(time.time() - t0, 1); time.sleep(2)
        prof = cdp.send('Profiler.stop')['profile']
        st = json.loads(pg.evaluate("JSON.stringify({ prep: GAME.RENDER ? GAME.RENDER.prepMs : null, texN: GAME.RENDER ? GAME.RENDER.texN : null, k2: window.TEX2 ? TEX2.n : 0, fmt: window.TEX2 ? TEX2.fmt : {}, k2last: window.TEX2 ? TEX2.last : 0, k2ms: window.TEX2 ? Math.round(TEX2.ms) : 0, mb: window.TEX2 ? Math.round(TEX2.mb) : 0, programs: GAME.R.info.programs.length, textures: GAME.R.info.memory.textures })"))
    json.dump(prof, open(os.path.join(OUT, 'profile' + (query.replace('?', '_').replace('=', '') or '_k2') + '.json'), 'w'))
    nodes = {n['id']: n for n in prof['nodes']}; parent = {}
    for n in prof['nodes']:
        for c in n.get('children', []): parent[c] = n['id']
    self_t = collections.Counter(); dt = prof['timeDeltas']
    for i, sid in enumerate(prof['samples']): self_t[sid] += (dt[i + 1] if i + 1 < len(dt) else 0) / 1000.0
    by_self = collections.Counter(); by_total = collections.Counter()
    name = lambda n: n['callFrame']['functionName'] or '(anonymous)'
    for nid, n in nodes.items(): by_self[name(n)] += self_t[nid]
    for nid in nodes:
        tt = self_t[nid]
        if not tt: continue
        seen = set(); p = nid
        while p is not None:
            k = name(nodes[p])
            if k not in seen: by_total[k] += tt; seen.add(k)
            p = parent.get(p)
    return {'load_s': t, 'done': done, 'steps': steps, 'st': st, 'self': by_self, 'total': by_total, 'errs': [e for e in errs if 'Texture marked' not in e]}
R = {m: run(QUERY(m)) for m in MODES}
for k, r in R.items():
    print(f"\n== {k}: model shown after {r['load_s']} s, {r['st']}")
    for t, x in r['steps']: print(f'  {t:7.1f}  {x}')
    up = {f: round(r['self'][f]) for f in UP if r['self'][f]}
    print(f"  texture uploads (self, ms): {up}  uploadTexture total {round(r['total']['uploadTexture'])} ms, prepareGPU total {round(r['total']['prepareGPU'])} ms")
    print('  top self time:', ', '.join(f"{f} {round(v)}" for f, v in r['self'].most_common(14) if f not in ('(idle)', '(program)', '(root)')))
print('\n== summary (mode: model shown s, GPU preparation ms, uploadTexture ms on the main thread, texture MB as KTX2, formats)')
for k, r in R.items():
    print(f"  {k:5s} {r['load_s']:6.1f} s  prep {r['st']['prep']} ms  uploadTexture {round(r['total']['uploadTexture'])} ms  KTX2 {r['st']['k2']} ({r['st']['mb']} MB) {r['st']['fmt']}")
ck('every run loads', all(r['done'] for r in R.values()), ', '.join(f"{k} {r['load_s']} s" for k, r in R.items()))
ck.errors(sum((r['errs'] for r in R.values()), []))
ck.done()
