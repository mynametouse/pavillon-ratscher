# feat/bewuchs-pflanzen: the species of the vegetation (viz3/src/bewuchs/bw_arten.js, BWARTEN) and the flower atlas (dist/bewuchs/blumen.png)
# seen in the game – only a test, the real drawing is the lead's template (viz3/src/bewuchs/bw_blume.js): three patches of 4 x 4 m on the
# garden's lawn around (12, 11) with the mixes of zierrasen (1), maehwiese (4) and bankett + saum (3, 7), each plant a pair of crossed quads
# from the atlas, its frame (leaves, bud, flower, seed head) from the table's calendar for the day, its height from the table, the grass
# heads tinted with their species' colour; pictures on days in April, June, August and October into out/bewuchs_pflanzen/.
#   python3 viz3/test/bewuchs_pflanzen.py PORT [nogeo=1,tier=hoch,tage=110+166+227+288,top=1]
import sys, os, time, json
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__))); import lib
port = sys.argv[1]
arg = sys.argv[2] if len(sys.argv) > 2 else ''
opts = dict(a.split('=', 1) if '=' in a else (a, '1') for a in arg.split(',') if a)
TIER = opts.get('tier', 'hoch')
QUERY = '?nogeo=1' if opts.get('nogeo') == '1' else ''
DAYS = [int(d) for d in opts.get('tage', '110+166+227+288').split('+')]
OUT = lib.out('bewuchs_pflanzen')
ck = lib.Checks('bewuchs_pflanzen')
errs = []

# the patches: class id of bw_arten.js flaechen, model rectangle x0, y0, x1, y1 (m) relative to the open square the test finds on the
# garden's lawn (8 x 8 m: lawn south-west, meadow south-east, verge north-west, margin north-east), a share of the table's density
PATCHES0 = [(1, 0, 0, 4, 4, 1.0), (4, 4, 0, 8, 4, 1.0), (3, 0, 4, 4, 8, 1.0), (7, 4, 4, 8, 8, 1.0)]

HELP = r"""
window.__BP = {
  meshes: [], tex: null, atlas: null,
  hide() { document.querySelectorAll('.ov,#doorbtn,#act2,#joy,header,#ppanel,#talkbtn,#npcsub,#toast,#qtrack,#quests,#qbanner,#vhud,#tut').forEach(e => e.style.visibility = 'hidden'); },
  async load() {
    const j = await fetch('bewuchs/blumen.json').then(r => r.json());
    this.atlas = new Map(j.zellen.map(e => [e.zelle.join(','), e]));
    this.tex = await new Promise(res => new THREE.TextureLoader().load('bewuchs/blumen.png', t => res(t), undefined, () => res(null)));
    if (!this.tex) return { ok: false };
    this.tex.colorSpace = THREE.SRGBColorSpace;
    this.tex.anisotropy = 4;
    // front faces only: each quad is there twice with opposite windings and both normals up (DoubleSide would flip the normal of a back
    // face downwards – half the plants dark)
    this.mat = new THREE.MeshStandardMaterial({ map: this.tex, alphaTest: 0.5, side: THREE.FrontSide, roughness: 0.85, metalness: 0 });
    return { ok: true, w: this.tex.image.width, h: this.tex.image.height, cells: this.atlas.size };
  },
  // the most open 8 x 8 m square of the garden's lawn: a 1 m grid of the lawn clumps (GRASS.meshes, hidden ones have scale 0),
  // the square whose emptiest cell is fullest (no building, gravel or ditch inside)
  spot() {
    const G = new Map(), k = (i, j) => i * 10000 + j;
    for (const im of window.GRASS ? GRASS.meshes : []) {
      const a = im.instanceMatrix.array, n = im.userData.n0 ?? im.count;
      for (let i = 0; i < n; i++) {
        if (Math.abs(a[i * 16 + 5]) < 1e-4) continue;
        const key = k(Math.floor(a[i * 16 + 12]), Math.floor(-a[i * 16 + 14]));
        G.set(key, (G.get(key) || 0) + 1);
      }
    }
    let best = null;
    for (let x0 = -14; x0 <= 14; x0++)
      for (let y0 = -24; y0 <= 26; y0++) {
        let mn = 1e9, sum = 0;
        for (let i = 0; i < 8 && mn > 0; i++) for (let j = 0; j < 8; j++) { const c = G.get(k(x0 + i, y0 + j)) || 0; mn = Math.min(mn, c); sum += c; }
        const sc = mn * 1000 + sum;
        if (!best || sc > best.sc) best = { x0, y0, mn, sum, sc };
      }
    return best;
  },
  rng(a) { return () => { a |= 0; a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; },
  // one plant's frame on a day (the rule of bw_arten.js: its own shift of ± streuung_tage; a window's share shows it, the others show
  // the leaves – or nothing when the window is the leaves)
  frameOf(sp, doy, r1, r2) {
    const d = doy - (r1 * 2 - 1) * sp.streuung_tage;
    for (const [f, a, b, share = 1] of sp.jahr)
      if (d >= a && d <= b) return r2 < share ? f : f === 'blatt' ? null : sp.bilder.blatt ? 'blatt' : null;
    return null;
  },
  // crossed quads for one atlas cell, narrowed to the width the drawing covers; origin at the stem foot, 1 x 1 m
  geo(c, r, b) {
    const u0 = (c + 0.5 - b / 2) / 8, u1 = (c + 0.5 + b / 2) / 8, v0 = 1 - (r + 1) / 8, v1 = 1 - r / 8, h = b / 2;
    const pos = [], uv = [], idx = [];
    for (const [ax, az] of [[1, 0], [0, 1]]) {
      const k = pos.length / 3;
      pos.push(-h * ax, 0, -h * az, h * ax, 0, h * az, h * ax, 1, h * az, -h * ax, 1, -h * az);
      uv.push(u0, v0, u1, v0, u1, v1, u0, v1);
      idx.push(k, k + 1, k + 2, k, k + 2, k + 3, k, k + 2, k + 1, k, k + 3, k + 2);
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
    g.setAttribute('normal', new THREE.Float32BufferAttribute(new Array(pos.length / 3).fill(0).flatMap(() => [0, 1, 0]), 3));
    g.setIndex(idx);
    return g;
  },
  place(doy, patches) {
    for (const m of this.meshes) { GAME.scene.remove(m); m.geometry.dispose(); }
    this.meshes = [];
    const B = BWARTEN, month = Math.min(11, Math.floor((doy - 1) / 30.5)), by = new Map(), lerp = (a, t) => a[0] + (a[1] - a[0]) * t;
    const put = (key, x, y, w, h, yaw, col) => { let l = by.get(key); if (!l) by.set(key, (l = [])); l.push([x, y, w, h, yaw, col]); };
    const stats = { plants: 0, heads: 0, frames: {} };
    patches.forEach(([cls, x0, y0, x1, y1, dens], pi) => {
      const F = B.flaechen[cls], area = (x1 - x0) * (y1 - y0);
      Object.entries(F.blumen).forEach(([id, n], si) => {
        const sp = B.blumen[id], R = this.rng(7919 * (pi + 1) + 104729 * (si + 1)), cnt = Math.round(n * area * dens);
        for (let i = 0; i < cnt; i++) {
          const x = x0 + R() * (x1 - x0), y = y0 + R() * (y1 - y0), r1 = R(), r2 = R(), rh = R(), yaw = R() * 6.283;
          const f = this.frameOf(sp, doy, r1, r2);
          if (!f) continue;
          const fr = sp.bilder[f], cell = this.atlas.get(fr.zelle.join(','));
          const living = f === 'blatt' || f === 'knospe' || f === 'bluete';
          const H = lerp(sp.hoehe_m, rh) * fr.hoehe * (living ? sp.wuchs[month] : 1);
          if (H < 0.025 || !cell) continue;
          const hq = H / cell.oben;
          put(fr.zelle.join(','), x, y, hq, hq, yaw, null);
          stats.plants++;
          stats.frames[id + ':' + f] = (stats.frames[id + ':' + f] || 0) + 1;
        }
      });
      // grass heads above the blades in the unmown patches, tinted: species colour / the cell's mean colour
      if (cls === 1) return;
      Object.entries(F.gras).forEach(([id, share], gi) => {
        const g = B.gras[id], a = g.aehre, R = this.rng(31337 * (pi + 1) + 7 * (gi + 1));
        if (doy < a.von - 10 || doy > a.reif_bis) return;
        const ripe = doy > a.bis, key = (ripe ? a.reif_zelle : a.zelle).join(','), cell = this.atlas.get(key);
        const tint = new THREE.Color(ripe ? a.reif_farbe : a.farbe), mean = new THREE.Color(cell.farbe);
        tint.r /= Math.max(0.05, mean.r); tint.g /= Math.max(0.05, mean.g); tint.b /= Math.max(0.05, mean.b);
        const cnt = Math.round(14 * share * a.anteil * area * dens), grow = Math.min(1, Math.max(0, (doy - a.von + 10) / 14));
        for (let i = 0; i < cnt; i++) {
          const x = x0 + R() * (x1 - x0), y = y0 + R() * (y1 - y0), yaw = R() * 6.283;
          const H = (Math.min(lerp(g.halm_m, R()), F.hoehe.max_m) + lerp(a.ueber_m, R())) * grow;
          if (H < 0.05) continue;
          const hq = H / cell.oben;
          put(key, x, y, hq, hq, yaw, tint);
          stats.heads++;
        }
      });
    });
    const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), up = new THREE.Vector3(0, 1, 0), white = new THREE.Color(1, 1, 1);
    for (const [key, list] of by) {
      const [c, r] = key.split(',').map(Number), cell = this.atlas.get(key);
      const im = new THREE.InstancedMesh(this.geo(c, r, cell.breite), this.mat, list.length);
      list.forEach(([x, y, w, h, yaw, col], i) => {
        q.setFromAxisAngle(up, yaw);
        m4.compose(new THREE.Vector3(x, GAME.floorAt(x, y, 0.3) - 0.01, -y), q, new THREE.Vector3(w, h, w));
        im.setMatrixAt(i, m4);
        im.setColorAt(i, col || white);
      });
      im.castShadow = false; im.receiveShadow = true; im.frustumCulled = false;
      GAME.scene.add(im);
      this.meshes.push(im);
    }
    stats.meshes = this.meshes.length;
    GAME.render();
    return stats;
  },
};
"""


def E(js): return pg.evaluate(js)
def J(js): return json.loads(pg.evaluate('JSON.stringify(' + js + ')'))
def shot(name): lib.shot(pg, OUT, name)


DATE = {110: (3, 20), 166: (5, 15), 227: (7, 15), 288: (9, 15)}

with lib.browser() as b:
    pg = lib.page(b, 1200, 720, errs=errs, tier=TIER)
    t0 = time.time()
    pg.goto(f'http://localhost:{port}/index.html{QUERY}', timeout=300000, wait_until='domcontentloaded')
    while not E("!!(window.GAME && GAME.loaded && GAME.loaded())"):
        bad = [e for e in errs if e.startswith('PAGEERR')]
        if bad or time.time() - t0 > 1500:
            ck('page loads', False, ' | '.join(bad[:3]) or 'time-out'); ck.errors(errs); ck.done()
        time.sleep(2)
    time.sleep(3); E("window.FREEZE = true"); print('loaded', round(time.time() - t0), 's', flush=True)
    E(HELP + '; 0')  # never hand an object of the page back to Python
    info = J("window.BWARTEN ? { v: BWARTEN.v, gras: Object.keys(BWARTEN.gras).length, blumen: Object.keys(BWARTEN.blumen).length, flaechen: Object.keys(BWARTEN.flaechen).length } : null")
    ck('BWARTEN in the page (v 1, 18 kinds of area)', info and info['v'] == 1 and info['flaechen'] == 18, info)
    ld = pg.evaluate("__BP.load()")
    ck('the atlas loads (1024 x 1024, 64 cells)', ld.get('ok') and ld.get('w') == 1024 and ld.get('cells') == 64, ld)
    E("__BP.hide(); if (window.DN && !DN.active) GAME.setMode('auto'); CAM3.want = false; GAME.step(0.1)")
    sp = J("__BP.spot()")
    ck('an open square of lawn found', sp and sp['mn'] > 0, sp)
    X0, Y0 = (sp['x0'], sp['y0']) if sp else (-8, 10)
    PATCHES = [(c, X0 + a, Y0 + b_, X0 + c_, Y0 + d, k) for c, a, b_, c_, d, k in PATCHES0]
    print('patches', PATCHES, J(f"[[{X0 + 2}, {Y0 + 2}], [{X0 + 6}, {Y0 + 2}], [{X0 + 2}, {Y0 + 6}], [{X0 + 6}, {Y0 + 6}]].map(([x, y]) => ({{ x, y, place: KERN.place ? KERN.place(x, y, 0) : null }}))"), flush=True)
    for doy in DAYS:
        m, d = DATE.get(doy, (int((doy - 1) / 30.5), 15))
        E(f"DN.e0 = Date.UTC(2026, {m}, {d}) / 864e5 - Math.floor(CLOCK.t / 1440); CLOCK.t = Math.floor(CLOCK.t / 1440) * 1440 + 11 * 60 + 30; DN.update(true)")
        lib.settle_light(pg)
        st = J(f"__BP.place({doy}, {json.dumps(PATCHES)})")
        top = sorted(st['frames'].items(), key=lambda kv: -kv[1])[:14]
        print('day', doy, 'plants', st['plants'], 'heads', st['heads'], 'meshes', st['meshes'], top, flush=True)
        ck(f'day {doy}: plants placed', st['plants'] > 40, st['plants'])
        tag = f'{doy:03d}'
        def cam(x, y, h, yaw, pitch, fov, name):
            E(f"GAME.view({x}, {y}, GAME.floorAt({x}, {y}, 0.3) + {h}, {yaw}, {pitch}, {fov}); GAME.step(0.05)"); shot(f'{tag}_{name}')
        cam(X0 + 4, Y0 - 4.5, 1.65, 0, -14, 62, 'ueberblick')
        cam(X0 + 6, Y0 - 1.4, 1.1, 0, -24, 60, 'wiese')
        cam(X0 + 2, Y0 - 1.0, 0.9, 0, -32, 58, 'rasen')
        cam(X0 + 4, Y0 + 2.6, 1.25, 0, -24, 62, 'bankett_saum')
        if opts.get('top') == '1' and doy == DAYS[0]:
            cam(X0 + 4, Y0 - 3, 9, 0, -60, 60, 'von_oben')
    ck.errors(errs)
    ck.done()
