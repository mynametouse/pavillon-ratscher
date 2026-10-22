# Where the loading time goes (V16e1): timeline of the loading text, a CPU profile of the main thread from the first byte until the model is
# shown (Chrome DevTools protocol), the most expensive functions (self and total time, with the module they come from) and – if the build
# records them (window.__cbprof, see docs/WORKFLOW.md "Ladezeit messen") – the cost of every whenLoaded callback ("Modell wird aufgebaut …").
#   python3 viz3/test/loadprof.py 8951 [tier]     (tier: preset like the other tests, default 'schnell'; 'none' = the page picks)
# Best on a non-minified build (python3 build.py --fast): function names and lines are readable. Writes out/loadprof/profile.json.
import sys, os, json, time, re, collections
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__))); import lib
port = sys.argv[1]; tier = sys.argv[2] if len(sys.argv) > 2 else 'schnell'; OUT = lib.out('loadprof')
SRC = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'src')
# module of a source line: modules.txt order, the line ranges inside the inlined bundle are found by a unique line of every module
MODS = [ln.split('#', 1)[0].strip() for ln in open(os.path.join(SRC, 'modules.txt'))]; MODS = [m for m in MODS if m]
with lib.browser() as b:
    errs = []; pg = lib.page(b, 1000, 640, errs, tier=None if tier == 'none' else tier)
    cdp = pg.context.new_cdp_session(pg); cdp.send('Profiler.enable'); cdp.send('Profiler.setSamplingInterval', {'interval': 1000}); cdp.send('Profiler.start')
    t0 = time.time(); pg.goto(f'http://localhost:{port}/index.html', timeout=300000, wait_until='domcontentloaded'); texts = []; last = None
    while time.time() - t0 < 1500:
        try: s = pg.evaluate("(() => { const l = document.getElementById('loading'); return (l && !l.hidden ? l.textContent : '[shown]') + '|' + !!(window.GAME && GAME.loaded && GAME.loaded()); })()")
        except Exception as e: s = 'ERR|false'
        if s != last: texts.append((round(time.time() - t0, 1), s.split('|')[0])); last = s
        if s.endswith('|true'): break
        time.sleep(0.25)
    time.sleep(2)
    prof = cdp.send('Profiler.stop')['profile']; cdp.send('Profiler.disable')
    cb = pg.evaluate("window.__cbprof || null")
    # every linked program: its name, source size (Windows compiles each one through Direct3D – size and unrolled loops cost there) and
    # whether the village (V16e) uses it
    progs = pg.evaluate("""JSON.stringify((() => { const R = GAME.R, gl = R.getContext(), mine = new Set();
      const add = o => { if (!o || !o.material) return; for (const m of [].concat(o.material)) { const p = R.properties.get(m).currentProgram; if (p) mine.add(p); } };
      if (window.VILLAGE) { (VILLAGE.meshes || []).forEach(add); add(RATSCHER.bld[0]); }
      if (window.VPROPS) (VPROPS.meshes || []).forEach(o => o.traverse ? o.traverse(add) : add(o));
      if (window.VNEAR) for (const c of VNEAR.cells.values()) if (c.mesh) c.mesh.traverse(add);
      return (R.info.programs || []).map(p => ({ name: p.name, key: (p.cacheKey || '').slice(0, 40), n: p.usedTimes,
        len: (gl.getShaderSource(p.vertexShader) || '').length + (gl.getShaderSource(p.fragmentShader) || '').length, dorf: mine.has(p) })); })())""")
    progs = json.loads(progs)
    json.dump(prof, open(os.path.join(OUT, 'profile.json'), 'w'))
print('== loading text (s after start)')
for t, x in texts: print(f'{t:7.1f}  {x}')
# ---- CPU profile: self and total time per function ----
nodes = {n['id']: n for n in prof['nodes']}; parent = {}
for n in prof['nodes']:
    for c in n.get('children', []): parent[c] = n['id']
self_t = collections.Counter(); dt = prof['timeDeltas']
for i, sid in enumerate(prof['samples']): self_t[sid] += (dt[i + 1] if i + 1 < len(dt) else 0) / 1000.0   # ms
def key(n): cf = n['callFrame']; return (cf['functionName'] or '(anonymous)', cf['url'].split('/')[-1][:20], cf['lineNumber'] + 1)
by_self = collections.Counter(); by_total = collections.Counter()
for nid, n in nodes.items():
    by_self[key(n)] += self_t[nid]
# total: a function's time including callees, counted once per call stack (recursion not double-counted)
for nid in nodes:
    t = self_t[nid]
    if not t: continue
    seen = set(); p = nid
    while p is not None:
        k = key(nodes[p])
        if k not in seen: by_total[k] += t; seen.add(k)
        p = parent.get(p)
tot = sum(self_t.values())
print(f'\n== CPU profile: {tot / 1000:.1f} s sampled on the main thread')
def src_of(name, line):
    # which module defines a function of this name (first match in modules.txt order)
    if not name or name.startswith('('): return ''
    pat = re.compile(r'(function\s+' + re.escape(name) + r'\b|\b' + re.escape(name) + r'\s*[:=]\s*(async\s*)?(function|\(|[a-zA-Z_$][\w$]*\s*=>))')
    for m in MODS:
        p = os.path.join(SRC, m)
        try:
            if pat.search(open(p, encoding='utf-8').read()): return m
        except Exception: pass
    return '?'
print('-- self time (top 30)')
for k, v in by_self.most_common(30):
    if k[0] in ('(idle)', '(program)'): continue
    print(f'{v:9.0f} ms  {k[0][:40]:40s} {src_of(k[0], k[2])}')
print('-- total time (top 40, without the event-loop frames)')
n = 0
for k, v in by_total.most_common(80):
    if k[0] in ('(root)', '(idle)', '(program)', '(garbage collector)'): continue
    print(f'{v:9.0f} ms  {k[0][:40]:40s} {src_of(k[0], k[2])}'); n += 1
    if n >= 40: break
if cb:
    print(f'\n== whenLoaded callbacks: {sum(c[0] for c in cb) / 1000:.1f} s in {len(cb)} callbacks (top 25)')
    for ms, txt in sorted(cb, key=lambda c: -c[0])[:25]:
        print(f'{ms:7d} ms  {re.sub(r"\s+", " ", txt)[:150]}')
if progs:
    d = [p for p in progs if p['dorf']]
    print(f"\n== programs: {len(progs)} linked, {sum(p['len'] for p in progs) / 1e6:.2f} M characters of GLSL; village: {len(d)} programs, {sum(p['len'] for p in d) / 1e3:.0f} k characters")
    for p in sorted(progs, key=lambda p: -p['len'])[:25]: print(f"{p['len']:8d}  {'Dorf ' if p['dorf'] else '     '}{p['name'][:40]:40s} {p['key']}")
    for p in sorted(d, key=lambda p: -p['len']): print(f"   Dorf {p['len']:8d}  {p['name'][:50]}")
print('\n' + ('\n'.join([e for e in errs if 'Texture marked' not in e][:10]) or 'no errors'))
