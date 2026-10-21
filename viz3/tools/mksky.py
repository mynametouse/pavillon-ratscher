# Photographic skies (Poly Haven, CC0): per light mode an environment HDR for the lighting (scaled to the old brightness, so the
# light balance stays) and a log-encoded sky photo (upper hemisphere) as the visible background, decoded to HDR in the sky shader.
import cv2, numpy as np, json, os
from PIL import Image
SP = '/tmp/claude-0/-home-claude/c5ba8437-b351-5b29-96e3-f852e8e82b48/scratchpad'; SRC = SP + '/hdrsel'; A = SP + '/assets'
LO, HI, CROP = -5.0, 3.0, 0.56
MODES = [('day', 'kloofendal_48d_partly_cloudy', 0.656, 0.55), ('gold', 'kloppenheim_06', 0.418, 0.55), ('dusk', 'qwantani_dusk_2', 0.727, 0.42)]
Y = np.array([0.2126, 0.7152, 0.0722], np.float32)
def load(p): im = cv2.imread(p, cv2.IMREAD_ANYDEPTH | cv2.IMREAD_COLOR); return im[:, :, ::-1].astype(np.float32)
man = json.load(open(A + '/hdri/manifest.json')); sky = {'_format': f'Sky photo (upper {CROP:.2f} of the equirect, u from the left edge as in three.js), per channel log2-encoded: v = exp2({LO} + c*({HI}-{LO})) in scene-linear units; sun_u as in the HDRI manifest.'}
for mode, id, envk, target in MODES:
    env1 = load(f'{SRC}/{id}_1k.hdr'); H, W = env1.shape[:2]; lum = env1 @ Y; b = cv2.GaussianBlur(lum, (0, 0), 2); y, x = np.unravel_index(np.argmax(b), b.shape)
    sun_u, sun_el = (x + .5) / W, 90 - (y + .5) / H * 180
    for res in ('1k', '2k'):   # environment lighting, brightness matched to the previous HDRI of this mode
        e = load(f'{SRC}/{id}_{res}.hdr') * envk; cv2.imwrite(f'{A}/hdri/{mode}_{res}.hdr', np.ascontiguousarray(e[:, :, ::-1]))
    s = load(f'{SRC}/{id}_puresky_4k.hdr'); Hs, Ws = s.shape[:2]; ls = s @ Y; up = ls[:Hs // 2]; med = np.median(up[up < np.median(up) * 50])
    k = target / med; rows = int(round(Hs * CROP)); c = s[:rows] * k
    enc = np.clip((np.log2(np.maximum(c, 2 ** LO)) - LO) / (HI - LO), 0, 1)
    img = Image.fromarray((enc * 255 + 0.5).astype(np.uint8), 'RGB')
    img.save(f'{A}/sky/{mode}_hq.jpg', quality=90, subsampling=0); img.resize((Ws // 2, rows // 2), Image.LANCZOS).save(f'{A}/sky/{mode}_lq.jpg', quality=88, subsampling=0)
    hz = (s[int(Hs * 0.47):int(Hs * 0.5)] * k).reshape(-1, 3).mean(0); zen = (s[: int(Hs * 0.08)] * k).reshape(-1, 3).mean(0)
    sky[mode] = { 'id': id, 'url': f'https://polyhaven.com/a/{id}', 'license': 'CC0', 'files': { 'hq': f'{mode}_hq.jpg', 'lq': f'{mode}_lq.jpg' }, 'crop': CROP, 'lo': LO, 'hi': HI, 'sun_u': round(float(sun_u), 4), 'sun_elevation_deg': round(float(sun_el), 1),
        'horizon_linear': [round(float(v), 4) for v in hz], 'zenith_linear': [round(float(v), 4) for v in zen], 'scale': round(float(k), 5) }
    m = man[mode]; m.update({ 'id': id, 'url': f'https://polyhaven.com/a/{id}', 'license': 'CC0', 'sun_u': round(float(sun_u), 4), 'sun_elevation_deg': round(float(sun_el), 1),
        'downloaded_from': [f'https://dl.polyhaven.org/file/ph-assets/HDRIs/hdr/1k/{id}_1k.hdr', f'https://dl.polyhaven.org/file/ph-assets/HDRIs/hdr/2k/{id}_2k.hdr'], 'scaled_by': envk,
        'notes': f'V13: same capture as the visible sky ({id}_puresky); scaled by {envk} so the overall light level of this mode stays as before.' })
    print(mode, id, 'sun u %.3f el %.1f' % (sun_u, sun_el), 'scale %.3f' % k, 'horizon', sky[mode]['horizon_linear'], 'zenith', sky[mode]['zenith_linear'], 'sizes', os.path.getsize(f'{A}/sky/{mode}_hq.jpg') // 1024, os.path.getsize(f'{A}/sky/{mode}_lq.jpg') // 1024, 'KB')
json.dump(man, open(A + '/hdri/manifest.json', 'w'), indent=1); json.dump(sky, open(A + '/sky/manifest.json', 'w'), indent=1)
