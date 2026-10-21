# Bake a sky-visibility volume around the pavilion: voxelize opaque static geometry, march rays, write tiled PNG atlas + json.
import time, base64, json, os, math, sys
import numpy as np
from PIL import Image
H = os.path.dirname(os.path.dirname(os.path.abspath(__file__))); PUB = os.path.join(H, 'public')
VAR = 'B' if 'B' in sys.argv[1:] else 'A'; SUF = '_b' if VAR == 'B' else ''
tri_file = os.path.join(H, 'test', 'occ' + SUF + '.f32')
if '--reuse' not in sys.argv or not os.path.exists(tri_file):
    from playwright.sync_api import sync_playwright
    with sync_playwright() as p:
        b = p.chromium.launch(args=['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'])
        pg = b.new_page(viewport={'width': 400, 'height': 300}); pg.add_init_script("try{localStorage.setItem('pav-variant','%s')}catch(e){}" % VAR)
        pg.goto('http://localhost:8765/index.html?offline=1', timeout=300000, wait_until='domcontentloaded'); pg.wait_for_function("window.GAME && GAME.loaded()", timeout=600000, polling=2000)
        pg.evaluate("GAME.setVariant('%s'); GAME.doorsAll(false); GAME.setDoorNow('hatch', true); GAME.setDoorNow('roofhatch', true)" % VAR)
        d = pg.evaluate("(()=>{ const a=exportOccluders([-2.6, 7.4, -2.6, 6.6, -0.1, 9.4]); const u=new Uint8Array(a.buffer); let s=''; for(let i=0;i<u.length;i+=0x8000) s+=String.fromCharCode.apply(null,u.subarray(i,i+0x8000)); return btoa(s); })()")
        open(tri_file, 'wb').write(base64.b64decode(d)); b.close()
T = np.fromfile(tri_file, dtype=np.float32).reshape(-1, 3, 3)   # three coords (X, Y up, Z)
print('triangles', len(T))
# volume bounds in three coords
MIN = np.array([-2.6, -0.1, -6.6]); MAX = np.array([7.4, 9.4, 2.6]); VS = 0.05
dims = np.ceil((MAX - MIN) / VS).astype(int); print('voxels', dims, dims.prod())
occ = np.zeros(dims, dtype=bool)
# voxelize by dense barycentric sampling (≤ VS/2 spacing)
for chunk in np.array_split(T, max(1, len(T) // 4000)):
    a, b_, c = chunk[:, 0], chunk[:, 1], chunk[:, 2]
    L = np.maximum(np.linalg.norm(b_ - a, axis=1), np.maximum(np.linalg.norm(c - a, axis=1), np.linalg.norm(c - b_, axis=1)))
    n = np.clip(np.ceil(L / (VS * 0.45)).astype(int), 1, 400)
    for k in np.unique(n):
        sel = n == k; A, Bq, C = a[sel], b_[sel], c[sel]
        u, v = np.meshgrid(np.arange(k + 1), np.arange(k + 1)); m = (u + v) <= k; u = u[m] / k; v = v[m] / k
        P = A[:, None, :] + (Bq - A)[:, None, :] * u[None, :, None] + (C - A)[:, None, :] * v[None, :, None]
        idx = np.floor((P.reshape(-1, 3) - MIN) / VS).astype(int); ok = np.all((idx >= 0) & (idx < dims), axis=1); idx = idx[ok]
        occ[idx[:, 0], idx[:, 1], idx[:, 2]] = True
print('occupied', occ.sum())
# close thin gaps (walls are double-sided boxes, fine) - one dilation in all axes to make 25 cm walls solid enough
# sample grid
SS = 0.125; sd = np.ceil((MAX - MIN) / SS).astype(int); print('samples', sd, sd.prod())
gx = MIN[0] + (np.arange(sd[0]) + 0.5) * SS; gy = MIN[1] + (np.arange(sd[1]) + 0.5) * SS; gz = MIN[2] + (np.arange(sd[2]) + 0.5) * SS
X, Y, Z = np.meshgrid(gx, gy, gz, indexing='ij'); pts = np.stack([X.ravel(), Y.ravel(), Z.ravel()], 1)
# directions: fibonacci sphere
ND = 96; i = np.arange(ND) + 0.5; phi = np.arccos(1 - 2 * i / ND); th = math.pi * (1 + 5 ** 0.5) * i
dirs = np.stack([np.cos(th) * np.sin(phi), np.cos(phi), np.sin(th) * np.sin(phi)], 1)
step = VS * 0.9; NS = int(9.0 / step)
vis = np.zeros(len(pts), dtype=np.float32); t0 = time.time()
start_solid = occ[tuple(np.clip(np.floor((pts - MIN) / VS).astype(int), 0, dims - 1).T)]
for di, d in enumerate(dirs):
    alive = np.ones(len(pts), dtype=bool); hit = np.zeros(len(pts), dtype=bool)
    p = pts + d * 0.03
    for s in range(NS):
        p = p + d * step if s else p
        idx = np.floor((p - MIN) / VS).astype(int)
        inb = np.all((idx >= 0) & (idx < dims), axis=1)
        alive &= inb                                  # leaving the volume = escaped to the sky / ground bounce
        if not alive.any(): break
        a_idx = np.where(alive)[0]; ii = idx[a_idx]
        h = occ[ii[:, 0], ii[:, 1], ii[:, 2]]
        if h.any(): hit[a_idx[h]] = True; alive[a_idx[h]] = False
    w = 1.0 if d[1] >= 0 else 0.55                    # light from below (ground bounce) counts less
    vis += np.where(hit, 0.0, w)
    if di % 16 == 0: print('dir', di, round(time.time() - t0, 1), 's')
wsum = sum(1.0 if d[1] >= 0 else 0.55 for d in dirs); vis = (vis / wsum).reshape(sd)
# open field reference: a point in the open sees the full sky + ground -> 1; normalize so open field = 1
vis = np.clip(vis, 0, 1)
# fill samples inside solids with the mean of open neighbours (avoid dark bleeding through trilinear filtering)
solid = start_solid.reshape(sd)
v2 = vis.copy()
for it in range(3):
    acc = np.zeros_like(v2); cnt = np.zeros_like(v2)
    for ax in range(3):
        for sh in (-1, 1):
            r = np.roll(v2, sh, axis=ax); rs = np.roll(solid, sh, axis=ax)
            acc += np.where(rs, 0, r); cnt += np.where(rs, 0, 1)
    fill = np.where(cnt > 0, acc / np.maximum(cnt, 1), v2)
    v2 = np.where(solid, fill, v2); solid = solid & (cnt == 0)
vis = v2
print('vis stats', float(vis.min()), float(vis.mean()), float(np.percentile(vis, 5)))
# atlas: tiles along Z (depth), each tile nx (X) by ny (Y), rows = Y from min
nx, ny, nz = sd; tilesX = int(math.ceil(math.sqrt(nz))); tilesY = int(math.ceil(nz / tilesX))
atlas = np.zeros((tilesY * ny, tilesX * nx), dtype=np.uint8)
for k in range(nz):
    tx, ty = (k % tilesX) * nx, (k // tilesX) * ny
    atlas[ty:ty + ny, tx:tx + nx] = np.round(vis[:, :, k].T * 255).astype(np.uint8)
Image.fromarray(atlas).save(os.path.join(PUB, 'sv' + SUF + '.png'), optimize=True)
json.dump({'file': 'sv' + SUF + '.png', 'dims': [int(nx), int(ny), int(nz)], 'tilesX': tilesX, 'min': MIN.tolist(), 'size': (sd * SS).tolist(), 'floor': 0.15, 'gain': 2.8}, open(os.path.join(PUB, 'sv' + SUF + '.json'), 'w'))
print('done', atlas.shape, os.path.getsize(os.path.join(PUB, 'sv' + SUF + '.png')), 'bytes', round(time.time() - t0, 1), 's')
