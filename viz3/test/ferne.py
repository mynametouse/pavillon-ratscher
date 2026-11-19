# feat/ferne: the houses of the world far away (ferne/ferne.js, FERNE). The data from the build (dist/ferne/haeuser.bin, from the cells of
# gebaeude/z and Schleusingen's old town), the blocks in reach of the camera, the cells gebaeude.js built near it dissolved, the range
# by tier; at the five fixed views of viz3/extra/ferne/views.json a picture with and without the far houses (out/ferne/<view>_mit.jpg,
# _ohne.jpg) and what the far houses cost there (draw calls, triangles). The world tiles round the views copied into dist first.
#   bash tools/browser_lock.sh python3 viz3/test/run.py --port 9076 --serve ferne[:a_+c_]
import sys, os, json, time, base64, math
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import lib

port = sys.argv[1] if len(sys.argv) > 1 else '9076'
ONLY = [s for s in (sys.argv[2] if len(sys.argv) > 2 else '').split('+') if s]
ck = lib.Checks('ferne')
OUT = lib.out('ferne')
SITE = os.environ.get('WELT_SITE', 'https://mynametouse.github.io/pavillon-ratscher/welt-test/')
VIEWS = json.load(open(os.path.join(lib.ROOT, 'viz3', 'extra', 'ferne', 'views.json')))
if ONLY:
    VIEWS = [v for v in VIEWS if any(v['name'].startswith(o) for o in ONLY)]
import urllib.request, concurrent.futures
import vessra_tiles as VT
SUBS = {'a_': '', 'b_': '', 'c_': 'werratal', 'd_': 'meiningen', 'e_': 'trusetal', 'f_': ''}


def tiles(sub, place, R=260):
    """the tiles of levels 10-12 round a place into dist (the test server serves dist; the page may not fetch from elsewhere)"""
    pre = f'zonen/{sub}/' if sub else ''
    dist = os.path.join(lib.ROOT, 'viz3', 'dist', 'welt-test', *([f'zonen', sub] if sub else []))
    os.makedirs(dist, exist_ok=True)
    mp = os.path.join(dist, 'meta.json')
    if not os.path.exists(mp):
        open(mp, 'wb').write(urllib.request.urlopen(SITE + pre + 'meta.json', timeout=60).read())
    lv = json.load(open(mp))['tiling']['levels']
    E_, N_ = VT.utm(*place)
    jobs = set()
    for L in (8, 9, 10, 11, 12):
        if str(L) not in lv:
            continue
        s_ = 409600 / (1 << L)
        r = lv[str(L)]['rect']
        pad = 6500 if L < 10 else R + (400 if L == 10 else 0)   # the far houses' ground: the terrain of levels 8 and 9 out to 6.5 km
        for x in range(int((E_ - pad - 420700) // s_), int((E_ + pad - 420700) // s_) + 1):
            for y in range(int((N_ - pad - 5390800) // s_), int((N_ + pad - 5390800) // s_) + 1):
                if r[0] <= x <= r[2] and r[1] <= y <= r[3]:
                    jobs |= {f't/{L}/{x}/{y}.bin'} | (set() if L < 10 else {f'i/{L}/{x}/{y}.webp'})

    def get(rel):
        p_ = os.path.join(dist, rel)
        if os.path.exists(p_) and os.path.getsize(p_) > 0:
            return 0
        os.makedirs(os.path.dirname(p_), exist_ok=True)
        for k in range(4):
            try:
                b_ = urllib.request.urlopen(SITE + pre + rel, timeout=60).read()
                open(p_, 'wb').write(b_)
                return len(b_)
            except urllib.error.HTTPError as e:
                if e.code == 404:
                    return 0
            except Exception:
                time.sleep(1 + 2 * k)
        return 0
    with concurrent.futures.ThreadPoolExecutor(8) as ex:
        n_ = sum(ex.map(get, sorted(jobs)))
    print(f'tiles {sub or "main"}: {len(jobs)} files, {n_ / 1e6:.1f} MB new', flush=True)


for v in VIEWS:
    tiles(SUBS[v['name'][:2]], (v['x'], v['y']))
# step 2: the forests' roof – a field west of Ratscher, the forest 450–900 m to the south (and the same 30 m up)
HV = [{'name': 'h_wald_boden', 'x': -2200, 'y': 0, 'eye': 1.7, 'yaw': 180, 'pitch': 1, 'fov': 60},
      {'name': 'h_wald_oben', 'x': -2200, 'y': 0, 'eye': 30, 'yaw': 180, 'pitch': -3, 'fov': 60}]
if not ONLY or any(o.startswith('h') for o in ONLY):
    tiles('', (-2200, 0), R=420)
DIFF = '''((a, b, y0, y1) => new Promise(res => { const A = new Image(), B = new Image(); let n = 0; const go = () => { if (++n < 2) return;
  const c = document.createElement('canvas'); c.width = A.width; c.height = A.height; const g = c.getContext('2d');
  g.drawImage(A, 0, 0); const pa = g.getImageData(0, 0, c.width, c.height).data; g.drawImage(B, 0, 0); const pb = g.getImageData(0, 0, c.width, c.height).data;
  let k = 0, t = 0; for (let y = Math.floor(c.height * y0); y < c.height * y1; y++) for (let x = 0; x < c.width; x += 2) { const i = (y * c.width + x) * 4; t++;
  if (Math.abs(pa[i] - pb[i]) + Math.abs(pa[i + 1] - pb[i + 1]) + Math.abs(pa[i + 2] - pb[i + 2]) > 15) k++; } res(+(k / t).toFixed(4)); };
  A.onload = go; B.onload = go; A.src = a; B.src = b; }))'''
COUNT = r"""
(() => {
  const R = GAME.R, I = { M: [0, 0], F: [0, 0] }, rbd = R.renderBufferDirect;
  R.renderBufferDirect = function (camera, scene, geometry, material, object, group) {
    if (scene) {
      const n = geometry.index ? geometry.index.count : geometry.attributes.position ? geometry.attributes.position.count : 0,
        t = Math.round((group ? group.count : n) / 3) * (object.isInstancedMesh ? object.count : 1);
      I.M[0]++; I.M[1] += t;
      if (object.name && object.name.startsWith('ferne ')) { I.F[0]++; I.F[1] += t; }
    }
    return rbd.call(this, camera, scene, geometry, material, object, group);
  };
  try { R.shadowMap.needsUpdate = true; GAME.shot(); } finally { R.renderBufferDirect = rbd; }
  const img = document.querySelector('#stage canvas').toDataURL('image/jpeg', 0.9);
  return JSON.stringify({ img, calls: I.M[0], tris: I.M[1], fCalls: I.F[0], fTris: I.F[1], programs: R.info.programs.length });
})()
"""


def save(d, name):
    open(os.path.join(OUT, name + '.jpg'), 'wb').write(base64.b64decode(d['img'].split(',', 1)[1]))


with lib.browser() as b:
    errs = []
    pg = lib.page(b, 1280, 720, errs, tier='hoch')
    lib.boot(pg, port)
    E = pg.evaluate
    J = lambda s: json.loads(E('JSON.stringify(' + s + ')'))
    E("document.querySelectorAll('#toast').forEach(e => e.style.visibility = 'hidden'); GAME.setView3(false)")
    t0 = time.time()
    while time.time() - t0 < 60 and not J("FERNE.state().ready"):
        E("GAME.step(0.2)")
        time.sleep(0.3)
    s = J("FERNE.state()")
    ck('the far houses\' data came with the build', s['ready'] and not s['err'], json.dumps(s))
    n = J("(() => { let n = 0, b = 0; for (const B of FERNE.blocks.values()) { n += B.n; b++; } return [n, b]; })()")
    ck('… counted', n[0] > 20000 and n[1] > 100, n)
    ck('the range on tier hoch: the blocks from 220–320 m out to 5–6 km', s['range'] == [220, 320, 5000, 6000], s['range'])
    E("if (!DN.active) GAME.setMode('auto'); CLOCK.t = Math.floor(CLOCK.t / 1440) * 1440 + 15.5 * 60; DN.update(true)")
    lib.settle_light(pg)

    def eye(v):
        E(f"(() => {{ window.CAM3 && (CAM3.want = false); document.body.dataset.mode = 'walk'; GAME.setView3(false, true); "
          f"GAME.P.x = {v['x']}; GAME.P.y = {v['y']}; "   # the walker there too: gebaeude.js builds its cells round the walker
          f"GAME.view({v['x']}, {v['y']}, KERN.ground({v['x']}, {v['y']}) + {v['eye']}, {v['yaw']}, {v['pitch']}, {v['fov']}); GAME.step(0.05); "
          f"GAME.view({v['x']}, {v['y']}, KERN.ground({v['x']}, {v['y']}) + {v['eye']}, {v['yaw']}, {v['pitch']}, {v['fov']}); }})()")

    res = {}
    for v in VIEWS:
        E("CLOCK.t = Math.floor(CLOCK.t / 1440) * 1440 + 15.5 * 60; DN.update(true)")
        eye(v)
        t1, calm, st = time.time(), 0, {}
        while time.time() - t1 < 150:
            E("GAME.step(0.3)")
            eye(v)
            st = J("{ f: FERNE.state(), g: GEB.Z ? { busy: GEB.Z.busy, built: GEB.Z.built } : null, w: WELT.state().loading }")
            quiet = st['f']['fading'] == 0 and not (st['g'] or {}).get('busy') and st['w'] == 0
            calm = calm + 1 if quiet else 0
            if calm >= 8 and time.time() - t1 > 15:
                break
            time.sleep(0.2)
        st['secs'] = round(time.time() - t1)
        E("CLOCK.t = Math.floor(CLOCK.t / 1440) * 1440 + 15.5 * 60; DN.update(true)")
        eye(v)
        mit = json.loads(E(COUNT))
        save(mit, v['name'] + '_mit')
        E("FERNE.set({ on: false }); GAME.step(0.1)")
        eye(v)
        ohne = json.loads(E(COUNT))
        save(ohne, v['name'] + '_ohne')
        E("FERNE.set({ on: true }); GAME.step(0.3)")
        res[v['name']] = {'state': st, 'mit': {k: mit[k] for k in ('calls', 'tris', 'fCalls', 'fTris')}, 'ohne': {k: ohne[k] for k in ('calls', 'tris')}}
        print(v['name'], json.dumps(res[v['name']]), flush=True)
        f = st['f']
        if math.hypot(v['x'], v['y']) < 8000:
            ck(f"{v['name']}: far blocks built in reach, {f['buildings']} buildings", f['blocks'] > 0 and f['buildings'] > 50 and not f['err'], json.dumps(f)[:300])
        else:   # beyond the 12 km of Ratscher's terrain nothing is drawn under a far house yet: none there (step 1b brings the far ground)
            ck(f"{v['name']}: beyond Ratscher's terrain no far blocks hang in the haze", f['buildings'] == 0 and not f['err'], json.dumps(f)[:300])
        ck(f"{v['name']}: what they cost – at most 40 draw calls and 500 000 triangles more", mit['fCalls'] <= 40 and mit['fTris'] <= 500000, f"{mit['fCalls']} calls, {mit['fTris']} triangles (frame {ohne['calls']} → {mit['calls']} calls)")
        # cells gebaeude.js built near the camera: their texel dissolved
        hid = J("(() => { const out = []; for (const c of (GEB.Z ? GEB.Z.cells.values() : [])) if (c.meshes.length) out.push(FERNE.cellFade(c.ij[0], c.ij[1])); return out; })()")
        if hid:
            ck(f"{v['name']}: the {len(hid)} cells built in detail near the camera show no far blocks", max(hid) == 0, hid)
    # step 3: the crops far away (bewuchs/bw_ferne.js, the coarse band of 10 m texels from dist/ferne/felder.bin) – July, ripe grain
    if not ONLY or any(o.startswith('g') for o in ONLY):
        # (25 m up at the edge of Ratscher, looking west over the fields towards Hinternah: 400 m – 1.5 km lie between rows 0.43 and 0.49)
        v = {'name': 'g_felder_juli', 'x': 62, 'y': 31, 'eye': 25, 'yaw': 260, 'pitch': -4, 'fov': 60}
        JULI = "DN.e0 = Date.UTC(2026, 6, 15) / 864e5 - Math.floor(CLOCK.t / 1440); CLOCK.t = Math.floor(CLOCK.t / 1440) * 1440 + 15.5 * 60; DN.update(true)"
        E(JULI)
        eye(v)
        for k in range(30):
            E("GAME.step(0.3)")
            eye(v)
            time.sleep(0.2)
        bf = J("BWFERNE.state().far")
        ck('the fields\' coarse band is filled round the camera (434 cells with fields)', bf['ready'] and bf['n'] >= 1 and bf['cells'] > 300, json.dumps(bf))
        E(JULI)
        eye(v)
        mit = json.loads(E(COUNT))
        save(mit, 'g_felder_juli_mit')
        E("BWFERNE.U.uBwFarE.value.w = 0; GAME.step(0.05)")
        eye(v)
        ohne = json.loads(E(COUNT))
        save(ohne, 'g_felder_juli_ohne')
        E("BWFERNE.U.uBwFarE.value.w = 1; GAME.step(0.05)")
        # the picture changes beyond the fine band (the upper part of the ground: far away) and not in front (near: the same)
        far_d = E(f"{DIFF}({json.dumps(mit['img'])}, {json.dumps(ohne['img'])}, 0.42, 0.5)")
        near_d = E(f"{DIFF}({json.dumps(mit['img'])}, {json.dumps(ohne['img'])}, 0.85, 1.0)")
        ck('July: the fields far away show their crop (the picture changes beyond 340 m, not in front)', far_d > 0.02 and near_d < 0.01, f'far {far_d}, near {near_d}')
    if not ONLY or any(o.startswith('h') for o in ONLY):
        E("DN.e0 = Date.UTC(2026, 6, 15) / 864e5 - Math.floor(CLOCK.t / 1440); CLOCK.t = Math.floor(CLOCK.t / 1440) * 1440 + 15.5 * 60; DN.update(true)")
        for v in HV:
            eye(v)
            for k in range(40):
                E("GAME.step(0.3)")
                eye(v)
                time.sleep(0.2)
            fw = J("FWALD.state()")
            ck(f"{v['name']}: the forests' roof stands round the camera", fw['ready'] and fw['builds'] >= 1 and fw['tris'] > 2000 and fw['ms'] <= 12, json.dumps(fw))
            E("DN.e0 = Date.UTC(2026, 6, 15) / 864e5 - Math.floor(CLOCK.t / 1440); CLOCK.t = Math.floor(CLOCK.t / 1440) * 1440 + 15.5 * 60; DN.update(true)")
            eye(v)
            mit = json.loads(E(COUNT))
            save(mit, v['name'] + '_mit')
            E("FWALD.off = true; GAME.step(0.05)")
            eye(v)
            ohne = json.loads(E(COUNT))
            save(ohne, v['name'] + '_ohne')
            E("FWALD.off = false; FWALD.mesh.visible = true; GAME.step(0.05)")
            far_d = E(f"{DIFF}({json.dumps(mit['img'])}, {json.dumps(ohne['img'])}, 0.3, 0.56)")
            near_d = E(f"{DIFF}({json.dumps(mit['img'])}, {json.dumps(ohne['img'])}, 0.85, 1.0)")
            ck(f"{v['name']}: the forest beyond the trees stands up (the picture changes at the horizon, not in front)", far_d > 0.01 and near_d < 0.01, f'far {far_d}, near {near_d}, calls {mit["calls"] - ohne["calls"]}, tris {mit["tris"] - ohne["tris"]}')
    mx = J("FERNE.state().ms")
    ck('a block is built in slices: no step over 12 ms (this machine, without a graphics card)', mx <= 12, f'{mx} ms')
    ok, gl = lib.check_gl(pg)
    ck('every shader program within 16 textures, none broken (the far houses add one program)', ok, json.dumps(gl)[:300])
    ck.errors(errs)
    json.dump(res, open(os.path.join(OUT, 'ferne.json'), 'w'), indent=1)
ck.done()
