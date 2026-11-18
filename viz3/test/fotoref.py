# feat/fotorealismus: the fixed reference views of the picture quality – the same cameras, hours and weather every time, so a change of
# the rendering can be compared with the state before it (Falko's brief of 18.11.2026, „Qualitätskontrolle“: garden overview, the
# pavilion close up, the vegetation around, buildings and landscape, the walker's view of the ground; plus the evening view to the west
# and the valley from above for the air and the sky). With every picture: what the frame costs (draw calls, triangles, programs,
# textures per program) – the numbers that count where frame times mean nothing (software graphics, docs/WORKFLOW.md).
#   python3 viz3/test/fotoref.py PORT [name=ref][,views=viz3/extra/fotorealismus/views.json][,tier=hoch][,wetter=heiter][,only=r1+r4][,w=1280][,h=720][,map=4096][,q=a=1;b=2]
# Pictures and numbers: out/fotoref/<name>/<view>.jpg, <name>.json. As a CI test (viz3/extra/fotorealismus/tests.txt) it checks only that
# every view renders without errors, within 16 textures per program and within the budgets below.
import sys, os, json, time, base64
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__))); import lib

port = sys.argv[1]
arg = sys.argv[2] if len(sys.argv) > 2 else ''
opts = dict(a.split('=', 1) if '=' in a else (a, '1') for a in arg.split(',') if a)
NAME = opts.get('name', 'ref')
SRC = opts.get('views', os.path.join('viz3', 'extra', 'fotorealismus', 'views.json'))
TIER = opts.get('tier', 'hoch')
WX = opts.get('wetter', 'heiter')
W, H = int(opts.get('w', 1280)), int(opts.get('h', 720))
ONLY = [s for s in opts.get('only', '').split('+') if s]
OUT = lib.out(os.path.join('fotoref', NAME))
views = json.load(open(SRC if os.path.isabs(SRC) else os.path.join(lib.ROOT, SRC)))
if ONLY: views = [v for v in views if any(v['name'].startswith(o) for o in ONLY)]
ck = lib.Checks('fotoref')
errs = []
# one frame, counted: draw calls and triangles of the main pass (scene given) and of the shadow pass
COUNT = r"""
(() => {
  const R = GAME.R, I = { M: [0, 0], S: [0, 0] }, rbd = R.renderBufferDirect;
  R.renderBufferDirect = function (camera, scene, geometry, material, object, group) {
    const n = geometry.index ? geometry.index.count : geometry.attributes.position ? geometry.attributes.position.count : 0,
      r = I[scene ? 'M' : 'S'];
    r[0]++;
    r[1] += Math.round((group ? group.count : n) / 3) * (object.isInstancedMesh ? object.count : 1);
    return rbd.call(this, camera, scene, geometry, material, object, group);
  };
  const t0 = performance.now();
  try { R.shadowMap.needsUpdate = true; GAME.shot(); } finally { R.renderBufferDirect = rbd; }
  // the picture in the same task as the frame (the drawing buffer is not kept: read later it is empty)
  const img = document.querySelector('#stage canvas').toDataURL('image/jpeg', 0.92);
  return JSON.stringify({ img, m: { calls: I.M[0], tris: I.M[1], shCalls: I.S[0], shTris: I.S[1], ms: Math.round(performance.now() - t0),
    programs: R.info.programs.length, textures: R.info.memory.textures, geometries: R.info.memory.geometries,
    tier: GAME.perf().tier, pr: GAME.perf().pr, exp: +R.toneMappingExposure.toFixed(3) } });
})()
"""
res = {'name': NAME, 'tier': TIER, 'wetter': WX, 'size': [W, H], 'views': {}}
groups = {}
for v in views: groups.setdefault(str(v.get('phase', '0')), []).append(v)
done = 0
with lib.browser() as b:
    for ph, vs in groups.items():
        pg = lib.page(b, W, H, errs=errs, tier=TIER); E = pg.evaluate
        q = f'?bauphase={ph}' + (f'&wetter={WX}' if WX and WX != '-' else '') + (('&' + opts['q'].replace(';', '&')) if opts.get('q') else '')
        lib.boot(pg, port, q)
        E("GAME.setView3 && GAME.setView3(false)")
        if opts.get('map'):   # the sun's shadow map as large as on a graphics card (software graphics start with 1024²)
            E(f"(() => {{ const s = GAME.scene.children.find(o => o.isDirectionalLight && o.castShadow); s.shadow.mapSize.set({int(opts['map'])}, {int(opts['map'])}); if (s.shadow.map) {{ s.shadow.map.dispose(); s.shadow.map = null; }} DIRTY.shadow = true; }})()")
        E("document.querySelectorAll('#toast,#hud,#topbar,#minimap,#joy,.hud').forEach(e => e.style.visibility = 'hidden')")
        for v in vs:
            E(f"if (window.DN && !DN.active) GAME.setMode('auto'); CLOCK.t = Math.floor(CLOCK.t / 1440) * 1440 + {float(v.get('time', 13.5)) * 60}; DN.update(true)")
            lib.settle_light(pg)
            x, y, yaw, vf = v['x'], v['y'], v['yaw'], v.get('vfov', 60)
            E(f"window.FOVX = {vf}; GAME.view({x}, {y}, KERN.ground({x}, {y}) + {v.get('eye', 1.6)}, {yaw}, {v.get('pitch', 0)}, {vf}); for (let i = 0; i < 8; i++) GAME.step(0.25)")
            time.sleep(1.5); E("GAME.step(0.1)"); lib.settle_light(pg)
            E(f"GAME.view({x}, {y}, KERN.ground({x}, {y}) + {v.get('eye', 1.6)}, {yaw}, {v.get('pitch', 0)}, {vf}); 0")
            # the far shadow tiles that are due after the jump (in the game they come a frame or two later)
            if E("!!window.SCHATTEN"): E("SCHATTEN.settle(); 0")
            r = json.loads(E(COUNT)); m = r['m']
            if E("!!window.SCHATTEN"): m['schatten'] = json.loads(E("JSON.stringify(SCHATTEN.state())"))
            open(os.path.join(OUT, v['name'] + '.jpg'), 'wb').write(base64.b64decode(r['img'].split(',')[1]))
            res['views'][v['name']] = m; done += 1
            print('view', v['name'], m, flush=True)
        ok, gl = lib.check_gl(pg)
        res.setdefault('gl', {})[ph] = {'programs': gl['programs'], 'maxFrag': gl['maxFrag'], 'maxVert': gl['maxVert'], 'bad': gl['bad'], 'broken': gl['broken']}
        ck(f'phase {ph}: at most 16 textures per shader program, none broken', ok, f"{gl['programs']} programs, max {gl['maxFrag']} fragment / {gl['maxVert']} vertex samplers, bad {[p['name'] for p in gl['bad']]}, broken {gl['broken']}")
        pg.close()
json.dump(res, open(os.path.join(OUT, NAME + '.json'), 'w'), indent=1)
ck('every reference view rendered', done == len(views), f'{done} of {len(views)}')
# budgets with room above the state of 18.11.2026 (tier „hoch“): a view that suddenly costs far more shows up here
for n, m in res['views'].items():
    ck(f'{n}: draw calls and triangles within the budget', m['calls'] <= 1400 and m['tris'] <= 3.2e6, f"{m['calls']} calls, {m['tris'] / 1e6:.2f} M triangles, shadow {m['shCalls']} calls / {m['shTris'] / 1e3:.0f} k")
ck.errors(errs)
ck.done()
