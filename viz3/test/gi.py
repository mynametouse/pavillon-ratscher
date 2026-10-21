# Global-illumination bake around the pavilion (irradiance volume): two light bounces of sun and sky between the real
# surfaces (their colours), stored per sample as an L1 spherical-harmonic irradiance (constant RGB term + direction vector).
#   python3 gi.py A|B [--reuse] [modes...]  → public/gi/gi_<var>_<mode>_{a,b}.png + public/gi/gi_<var>.json
# Geometry and colours come from the live model (exportGI); sky radiance from the same HDR the renderer uses (sun disc capped,
# rotated to the modelled sun); the direct sun itself stays a real-time light – the bake adds only what it bounces.
import sys, os, re, json, math, time, base64
import numpy as np
from PIL import Image
H = os.path.dirname(os.path.dirname(os.path.abspath(__file__))); SP = os.path.dirname(H); PUB = os.path.join(H, 'public', 'gi'); os.makedirs(PUB, exist_ok=True)
VAR = 'B' if 'B' in sys.argv[1:2] else 'A'; REUSE = '--reuse' in sys.argv
MODES_WANT = [a for a in sys.argv[2:] if a in ('day', 'gold', 'dusk')] or ['day', 'gold', 'dusk']
PORT = os.environ.get('PORT', '8765')
BOUNDS = [-2.6, 7.4, -2.6, 6.6, -0.1, 9.4]                       # site x0, x1, y0, y1, z0, z1 (same box as the sky-visibility bake)
MIN = np.array([BOUNDS[0], BOUNDS[4], -BOUNDS[3]]); MAX = np.array([BOUNDS[1], BOUNDS[5], -BOUNDS[2]])   # three coords (X, Y up, Z = -north)
VS = 0.1; SS = 0.2; ND = 128
t0 = time.time()
def log(*a): print(round(time.time() - t0, 1), 's |', *a, flush=True)
# ---------- 1. geometry with albedo ----------
gf = os.path.join(H, 'test', f'gi_geo_{VAR}.npz')
if not REUSE or not os.path.exists(gf):
    from playwright.sync_api import sync_playwright
    with sync_playwright() as p:
        b = p.chromium.launch(args=['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'])
        pg = b.new_page(viewport={'width': 400, 'height': 300}); pg.add_init_script("try{localStorage.setItem('pav-variant','%s');localStorage.removeItem('pav-site');localStorage.removeItem('pav-layout')}catch(e){}" % VAR)
        pg.goto(f'http://localhost:{PORT}/index.html?offline=1&lowfig=1', timeout=300000, wait_until='domcontentloaded'); pg.wait_for_function("window.GAME && GAME.loaded()", timeout=900000, polling=2000)
        pg.evaluate("GAME.setVariant('%s'); GAME.setPhase(GAME.PHASES.length-1); GAME.doorsAll(false); GAME.setDoorNow('hatch', true); GAME.setDoorNow('roofhatch', true)" % VAR)
        enc = "(()=>{ const r = exportGI(%s); const f = a => { const u = new Uint8Array(a.buffer); let s=''; for (let i=0;i<u.length;i+=0x8000) s+=String.fromCharCode.apply(null,u.subarray(i,i+0x8000)); return btoa(s); }; return [f(r.tris), f(r.alb)]; })()" % json.dumps(BOUNDS)
        tb, ab = pg.evaluate(enc); b.close()
    T = np.frombuffer(base64.b64decode(tb), dtype=np.float32).reshape(-1, 3, 3); A = np.frombuffer(base64.b64decode(ab), dtype=np.float32).reshape(-1, 3)
    np.savez_compressed(gf, T=T, A=A)
G = np.load(gf); T, ALB = G['T'], G['A']; log('triangles', len(T), 'albedo mean', ALB.mean(0).round(3))
# ---------- 2. voxels: occupancy, mean albedo, mean normal ----------
dims = np.ceil((MAX - MIN) / VS).astype(int); NV = int(dims.prod())
nrm = np.cross(T[:, 1] - T[:, 0], T[:, 2] - T[:, 0]); area = np.linalg.norm(nrm, axis=1); ok = area > 1e-9; T, ALB, nrm, area = T[ok], ALB[ok], nrm[ok] / area[ok, None], area[ok]
cnt = np.zeros(NV); acc_a = np.zeros((NV, 3)); acc_n = np.zeros((NV, 3))
def vflat(P): ix = np.floor((P - MIN) / VS).astype(int); good = np.all((ix >= 0) & (ix < dims), axis=1); return np.where(good, (ix[:, 0] * dims[1] + ix[:, 1]) * dims[2] + ix[:, 2], -1)
for chunk in np.array_split(np.arange(len(T)), max(1, len(T) // 3000)):
    a, b_, c = T[chunk, 0], T[chunk, 1], T[chunk, 2]
    L = np.maximum(np.linalg.norm(b_ - a, axis=1), np.maximum(np.linalg.norm(c - a, axis=1), np.linalg.norm(c - b_, axis=1)))
    n = np.clip(np.ceil(L / (VS * 0.45)).astype(int), 1, 300)
    for k in np.unique(n):
        sel = np.where(n == k)[0]; u, v = np.meshgrid(np.arange(k + 1), np.arange(k + 1)); m = (u + v) <= k; u = u[m] / k; v = v[m] / k
        P = a[sel][:, None, :] + (b_[sel] - a[sel])[:, None, :] * u[None, :, None] + (c[sel] - a[sel])[:, None, :] * v[None, :, None]
        f = vflat(P.reshape(-1, 3)); w = np.repeat(area[chunk][sel] / len(u), len(u)); g = f >= 0
        cnt += np.bincount(f[g], weights=w[g], minlength=NV)
        for q in range(3):
            acc_a[:, q] += np.bincount(f[g], weights=(w * np.repeat(ALB[chunk][sel][:, q], len(u)))[g], minlength=NV)
            acc_n[:, q] += np.bincount(f[g], weights=(w * np.repeat(nrm[chunk][sel][:, q], len(u)))[g], minlength=NV)
occ = cnt > 0
# ground under everything (the lawn plane is not exported): one voxel layer at y = -0.1..0, lawn colour, facing up
LAWN = np.array([0.075, 0.105, 0.035]) * 1.4
gy = int(np.floor((0.0 - 0.05 - MIN[1]) / VS)); gi_idx = (np.arange(dims[0])[:, None] * dims[1] + gy) * dims[2] + np.arange(dims[2])[None, :]; gi_idx = gi_idx.ravel()
newg = ~occ[gi_idx]; cnt[gi_idx[newg]] = 1.0; acc_a[gi_idx[newg]] = LAWN; acc_n[gi_idx[newg]] = [0, 1, 0]; occ[gi_idx] = True
VOX = np.where(occ)[0]; valb = acc_a[VOX] / cnt[VOX, None]; vn = acc_n[VOX] / np.maximum(cnt[VOX, None], 1e-9); vl = np.linalg.norm(vn, axis=1)
vn = np.where(vl[:, None] > 0.25, vn / np.maximum(vl[:, None], 1e-9), np.array([0, 1, 0])); two = vl < 0.25      # thin double-sided parts: treated as facing up and down alike
vmap = -np.ones(NV, dtype=np.int64); vmap[VOX] = np.arange(len(VOX))
vpos = np.stack(np.unravel_index(VOX, dims), 1) * VS + MIN + VS / 2
log('voxels', dims, 'occupied', len(VOX))
# ---------- 3. ray marching ----------
def march(P0, d, maxs=None):   # → hit voxel (index into VOX) or -1 (escaped); d one direction for all rays
    step = VS * 0.85; nmax = maxs or int(np.linalg.norm(MAX - MIN) / step) + 2
    hit = -np.ones(len(P0), dtype=np.int64); alive = np.ones(len(P0), dtype=bool); p = P0.copy()
    for s in range(nmax):
        p += d * step; idx = np.floor((p - MIN) / VS).astype(np.int64); inb = np.all((idx >= 0) & (idx < dims), axis=1); alive &= inb
        if not alive.any(): break
        ai = np.where(alive)[0]; ii = idx[ai]; f = (ii[:, 0] * dims[1] + ii[:, 1]) * dims[2] + ii[:, 2]; h = occ[f]
        if h.any(): hit[ai[h]] = vmap[f[h]]; alive[ai[h]] = False
    return hit
i = np.arange(ND) + 0.5; phi = np.arccos(1 - 2 * i / ND); th = math.pi * (1 + 5 ** 0.5) * i
DIRS = np.stack([np.cos(th) * np.sin(phi), np.cos(phi), np.sin(th) * np.sin(phi)], 1); W = 4 * math.pi / ND
sd = np.ceil((MAX - MIN) / SS).astype(int); NS = int(sd.prod())
gx, gy2, gz = [MIN[k] + (np.arange(sd[k]) + 0.5) * SS for k in range(3)]
SP_ = np.stack([a.ravel() for a in np.meshgrid(gx, gy2, gz, indexing='ij')], 1)
sfl = vflat(SP_); solid = occ[np.maximum(sfl, 0)] & (sfl >= 0)
HIT = np.zeros((NS, ND), dtype=np.int64)
for di, d in enumerate(DIRS):
    HIT[:, di] = march(SP_ + d * 0.02, d)
    if di % 32 == 0: log('rays', di, '/', ND)
ESC = HIT < 0
log('ray table done, escaped share', round(float(ESC.mean()), 3))
def nearest_sample(P):
    ix = np.clip(np.floor((P - MIN) / SS).astype(int), 0, sd - 1); return (ix[:, 0] * sd[1] + ix[:, 1]) * sd[2] + ix[:, 2]
# ---------- 4. per light mode ----------
def read_hdr(path):
    data = open(path, 'rb').read(); pos = 0; lines = []
    while True:
        e = data.index(b'\n', pos); line = data[pos:e]; pos = e + 1
        if line.startswith(b'-Y') or line.startswith(b'+Y'): res = line.split(); h, w = int(res[1]), int(res[3]); break
    img = np.zeros((h, w, 4), dtype=np.uint8); buf = np.frombuffer(data, dtype=np.uint8)
    for y in range(h):
        if buf[pos] == 2 and buf[pos + 1] == 2:
            pos += 4
            for ch in range(4):
                x = 0
                while x < w:
                    c = int(buf[pos]); pos += 1
                    if c > 128: c -= 128; img[y, x:x + c, ch] = buf[pos]; pos += 1
                    else: img[y, x:x + c, ch] = buf[pos:pos + c]; pos += c
                    x += c
        else: img[y] = buf[pos:pos + w * 4].reshape(w, 4); pos += w * 4
    e = img[..., 3].astype(np.int32); f = np.where(e > 0, np.ldexp(1.0, e - 136), 0.0)
    return img[..., :3].astype(np.float64) * f[..., None]
SRC = open(os.path.join(H, 'src', 'render/modes.js')).read()
def mode_params(m):
    s = re.search(m + r':\s*\{([^}]*)\}', SRC).group(1); g = lambda k: re.search(k + r':\s*([0-9.x a-fA-F]+)', s).group(1).strip()
    hx = int(g('sunC'), 16); srgb = np.array([(hx >> 16) & 255, (hx >> 8) & 255, hx & 255]) / 255; lin = np.where(srgb <= 0.04045, srgb / 12.92, ((srgb + 0.055) / 1.055) ** 2.4)
    return float(g('az')), float(g('el')), float(g('sun')), lin, float(g('env'))
HMAN = json.load(open(os.path.join(SP, 'assets', 'hdri', 'manifest.json')))
YN = 0.282095; Y1 = 0.488603
out = {'dims': [int(x) for x in sd], 'min': MIN.tolist(), 'size': (sd * SS).tolist(), 'modes': {}}
nx, ny, nz = sd; tilesX = int(math.ceil(math.sqrt(nz))); tilesY = int(math.ceil(nz / tilesX)); out['tilesX'] = tilesX
for mode in MODES_WANT:
    az, el, sunI, sunC, envI = mode_params(mode); a_, e_ = math.radians(az), math.radians(el)
    SUN = np.array([math.sin(a_) * math.cos(e_), math.sin(e_), -math.cos(a_) * math.cos(e_)]); Esun = sunI * sunC
    hm = HMAN[mode]; hdr = np.minimum(read_hdr(os.path.join(SP, 'assets', 'hdri', hm['files']['1k'])), 6.0) * envI
    hh, hw = hdr.shape[:2]; phiS = math.atan2(SUN[2], SUN[0]); phiH = 2 * math.pi * (hm['sun_u'] - 0.5)
    # sky radiance per ray direction: mean over a cone of ~ one ray's solid angle (three's equirect mapping, rotated like scene.environmentRotation)
    rows = (np.arange(hh) + 0.5) / hh; cols = (np.arange(hw) + 0.5) / hw; elv = (0.5 - rows) * math.pi; phv = (cols - 0.5) * 2 * math.pi + phiS - phiH
    PD = np.stack([np.cos(elv)[:, None] * np.cos(phv)[None, :], np.repeat(np.sin(elv)[:, None], hw, 1), np.cos(elv)[:, None] * np.sin(phv)[None, :]], -1).reshape(-1, 3)
    pw = np.repeat(np.cos(elv)[:, None], hw, 1).ravel(); flat = hdr.reshape(-1, 3)
    cosr = math.cos(math.sqrt(W / math.pi) * 1.1); LSKY = np.zeros((ND, 3))
    for di, d in enumerate(DIRS): m_ = PD @ d > cosr; LSKY[di] = (flat[m_] * pw[m_, None]).sum(0) / max(pw[m_].sum(), 1e-9)
    chk = PD[np.argmax(flat.sum(1) * (PD[:, 1] > 0))]; log(mode, 'sun', SUN.round(3), 'brightest sky dir', chk.round(3), 'angle', round(math.degrees(math.acos(np.clip(chk @ SUN, -1, 1))), 1))
    up = DIRS[:, 1] > 0; Esky_open_up = (LSKY * (np.maximum(DIRS[:, 1], 0) * W)[:, None]).sum(0)
    LGROUND = LAWN / math.pi * (Esun * max(SUN[1], 0) + Esky_open_up)
    LESC = np.where(up[:, None], LSKY, LGROUND)                       # escaped ray: sky above the horizon, sunlit lawn below
    # direct sun on every surface voxel (shadow ray towards the sun, started a little off the surface)
    off = np.where(two[:, None], np.sign(SUN[1] + 1e-6) * np.array([0, 1, 0]), vn) * 0.16
    sv = march(vpos + off, SUN) < 0; cosv = np.where(two, np.abs(vn @ SUN), np.maximum(vn @ SUN, 0))
    Esun_v = np.outer(sv * cosv, Esun)
    # sky light on each voxel: rays of its nearest sample, weighted by the voxel's normal
    ns = nearest_sample(vpos + vn * 0.22); Esky_v = np.zeros((len(VOX), 3))
    for ch in np.array_split(np.arange(len(VOX)), max(1, len(VOX) // 40000)):
        wcos = np.maximum(vn[ch] @ DIRS.T, 0) * W; Esky_v[ch] = (ESC[ns[ch]] * wcos) @ LESC
    def gather(Lo):
        L00 = np.zeros((NS, 3)); L1 = np.zeros((NS, 3, 3))
        for ch in np.array_split(np.arange(NS), max(1, NS // 20000)):
            h = HIT[ch]; e = ESC[ch]; Lr = np.where(e[..., None], LESC[None, :, :], Lo[np.maximum(h, 0)])   # (n, ND, 3)
            L00[ch] = Lr.sum(1) * YN * W; L1[ch] = np.einsum('nkc,kd->ncd', Lr, DIRS) * Y1 * W
        return math.pi * YN * L00, (2 * math.pi / 3) * Y1 * L1              # E(n) = A + B·n  (B: rgb × xyz)
    Lo = valb / math.pi * (Esun_v + Esky_v); A_, B_ = gather(Lo)
    # second bounce: voxels lit by the gathered irradiance of their nearest sample
    Eind = np.maximum(A_[ns] + np.einsum('ncd,nd->nc', B_[ns], vn), 0); Lo = valb / math.pi * (Esun_v + Eind); A_, B_ = gather(Lo)
    # samples inside solids: copy from open neighbours (no dark bleeding when filtering)
    sol = solid.reshape(sd).copy(); Av = A_.reshape(*sd, 3); Bv = B_.reshape(*sd, 3, 3)
    for it in range(4):
        accA = np.zeros_like(Av); accB = np.zeros_like(Bv); c = np.zeros(sd)
        for ax in range(3):
            for s_ in (-1, 1):
                rs = np.roll(sol, s_, axis=ax); w_ = (~rs).astype(float); accA += np.roll(Av, s_, axis=ax) * w_[..., None]; accB += np.roll(Bv, s_, axis=ax) * w_[..., None, None]; c += w_
        fill = sol & (c > 0); Av[fill] = accA[fill] / c[fill][:, None]; Bv[fill] = accB[fill] / c[fill][:, None, None]; sol = sol & (c == 0)
    A_ = Av.reshape(-1, 3); B_ = Bv.reshape(-1, 3, 3)
    lum = np.array([0.2126, 0.7152, 0.0722]); Al = np.maximum(A_ @ lum, 1e-6); Bn = np.clip(np.einsum('c,ncd->nd', lum, B_) / Al[:, None], -1.5, 1.5)
    A_ = np.maximum(A_, A_.max() * 2.0 ** -9); lo, hi = float(np.log2(A_.min())), float(np.log2(A_.max())) + 1e-3   # 9 stops below the brightest sample is black enough
    qa = np.round((np.log2(A_) - lo) / (hi - lo) * 255).astype(np.uint8); qb = np.round((Bn / 1.5 * 0.5 + 0.5) * 255).astype(np.uint8)
    for nm, q in (('a', qa), ('b', qb)):
        v3 = q.reshape(nx, ny, nz, 3); atlas = np.zeros((tilesY * ny, tilesX * nx, 3), dtype=np.uint8)
        for k in range(nz): tx, ty = (k % tilesX) * nx, (k // tilesX) * ny; atlas[ty:ty + ny, tx:tx + nx] = v3[:, :, k].transpose(1, 0, 2)
        Image.fromarray(atlas).save(os.path.join(PUB, f'gi_{VAR.lower()}_{mode}_{nm}.png'), optimize=True)
    # report: open-field reference (top corner sample) and a few indoor numbers
    out['modes'][mode] = {'a': f'gi/gi_{VAR.lower()}_{mode}_a.png', 'b': f'gi/gi_{VAR.lower()}_{mode}_b.png', 'lo': lo, 'hi': hi, 'skyUp': Esky_open_up.round(4).tolist()}
    log(mode, 'A range', round(2 ** lo, 4), round(2 ** hi, 3), '| open sky E(up)', Esky_open_up.round(3), '| sunlit voxels', int(sv.sum()), 'of', len(sv))
jf = os.path.join(PUB, f'gi_{VAR.lower()}.json'); prev = json.load(open(jf)) if os.path.exists(jf) else {}
if prev.get('dims') == out['dims']: prev['modes'].update(out['modes']); out['modes'] = prev['modes']
json.dump(out, open(jf, 'w'), indent=1); log('done', jf)
