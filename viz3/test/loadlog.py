# V16b4 load log and step-by-step scene building: loads without a tier preset (like a visitor), records the loading text and the info line
# under it (seconds, steps), checks that the building steps are counted ("Modell wird aufgebaut … k von n"), that the log is closed after
# loading, and – after an interrupted attempt (page left in the middle of loading, like a crash) – that the next visit says where it stopped.
#   python3 viz3/test/loadlog.py 8951   (~6 min)
import sys, os, json, time
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__))); import lib
port = sys.argv[1]; ok = []; fails = []
def check(name, cond, info=''):
    (ok if cond else fails).append(name); print(('OK   ' if cond else 'FAIL ') + name, info, flush=True)
POLL = "(() => { const l = document.getElementById('loading'), i = document.getElementById('loadinfo'); return JSON.stringify({ t: l ? (l.hidden ? '[hidden]' : l.textContent) : '', i: i ? i.textContent.slice(0, 200) : '', r: !!(window.GAME && GAME.loaded && GAME.loaded()) }); })()"
def run(pg, url, stop=None, limit=900):
    seen = []; last = None; t0 = time.time(); pg.goto(url, timeout=300000, wait_until='domcontentloaded')
    while time.time() - t0 < limit:
        try: d = json.loads(pg.evaluate(POLL))
        except Exception as e: d = {'t': 'ERR ' + str(e)[:60], 'i': '', 'r': False}
        key = d['t'] + '|' + d['i'][:40]
        if key != last: seen.append((round(time.time() - t0, 1), d)); last = key
        if d['r'] or (stop and stop(d)): break
        time.sleep(0.5)
    return seen
with lib.browser() as b:
    errs = []; ctx = b.new_context(viewport={'width': 1000, 'height': 640}); pg = ctx.new_page()
    pg.on('pageerror', lambda e: errs.append('PAGEERR ' + str(e)))
    url = f'http://localhost:{port}/index.html'
    # 1) an attempt that is cut off while the scene is built or the GPU is prepared (like a crash): leave the page
    s1 = run(pg, url, stop=lambda d: 'aufgebaut' in d['t'] or 'vorbereitet' in d['t'])
    # like a visitor who drove: saved positions of all vehicles (since V16b1 a saved car position stopped the whole start – V16b4)
    sv = pg.evaluate("(() => { const o = { lights: 'auto' }; for (const v of (window.VEH && VEH.list) || []) o[v.id] = [+v.st.x.toFixed(2), +v.st.y.toFixed(2), +v.st.psi.toFixed(4)].concat(v.model.save ? v.model.save() : []); localStorage.setItem('pav-veh-v1', JSON.stringify(o)); return Object.keys(o).join(','); })()")
    print('first attempt, cut at', s1[-1], '· saved vehicles:', sv); pg.goto('about:blank'); time.sleep(1)
    # 2) the next visit: says where the last attempt stopped, counts the building steps, loads
    s2 = run(pg, url)
    for t, d in s2: print(f"{t:6.1f}  {d['t'][:70]:70s} | {d['i'][:90]}")
    texts = [d['t'] for t, d in s2]; infos = ' '.join(d['i'] for t, d in s2)
    check('the next visit says where the last attempt stopped', 'brach ab bei' in infos, infos[:160])
    check('building steps counted on the loading screen', any(x.startswith('Modell wird aufgebaut …') and 'von' in x for x in texts), str([x for x in texts if 'aufgebaut' in x][:3]))
    check('the seconds count while loading', any(d['i'][:3].strip().rstrip('s').strip().isdigit() for t, d in s2 if d['i']), '')
    check('the model opens (with saved vehicle positions)', s2[-1][1]['r'] and 'car' in sv, str(s2[-1]))
    check('vehicles and felling started (the start ran to its end)', pg.evaluate("!!(window.VEH && VEH.list.length >= 2 && window.FELL && window.GAME)"), pg.evaluate("JSON.stringify({ veh: window.VEH ? VEH.list.map(v => v.id) : null, fell: !!window.FELL, game: !!window.GAME })"))
    lg = json.loads(pg.evaluate("localStorage.getItem('pav-loadlog')") or '{}')
    check('the load log is closed after loading', lg.get('open') is False and len(lg.get('steps', [])) > 5, f"{len(lg.get('steps', []))} steps, last {lg.get('steps', [[0, '']])[-1]}")
    check('the info line is gone after loading', not pg.evaluate("!!document.getElementById('loadinfo')"))
    g = json.loads(pg.evaluate("JSON.stringify((() => { const g = GLCHECK.run(16); return { maxFrag: g.maxFrag, broken: g.broken.slice(0, 5) }; })())"))
    check('no broken shader programs', not g['broken'], str(g))
    check('no page errors', not errs, '\n'.join(errs[:5]))
print(f"\n{len(ok)} ok, {len(fails)} failed: {fails}")
