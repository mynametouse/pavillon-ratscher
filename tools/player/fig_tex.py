# Textures of the selectable player figures (Falko 23.10.2026, docs/plans/plan_leben.md 3), from the Rocketbox originals (MIT):
#   sarah      the current female figure Adults/Female_Adult_04 (f004: face, skin, clothes) with the hair of Adults/Female_Party_01 (f010),
#              both made brunette
#   christoph  body of Adults/Male_Adult_09 (m017: dark T-shirt, jeans) without the forearm tattoo, head of Professions/Sports_Male_01
#              (m021: short brown hair, light beard)
# Christoph: where the skin of the two avatars meets (hands, arms), the body's skin is shifted towards the colour of the face.
#   python3 -I fig_tex.py <sarah|christoph> <src dir: <Avatar>/Textures/*.tga> <out dir> [preview dir]
import sys, os, shutil
import numpy as np
import cv2
from PIL import Image

WHO, SRC, OUT = sys.argv[1:4]
PV = sys.argv[4] if len(sys.argv) > 4 else None
os.makedirs(OUT, exist_ok=True)


def tga(av, f):
    return os.path.join(SRC, av, 'Textures', f)


def load(f):
    return np.asarray(Image.open(f).convert('RGB')).astype(np.float32) / 255.0


def save(a, name):
    Image.fromarray((np.clip(a, 0, 1) * 255 + 0.5).astype(np.uint8)).save(os.path.join(OUT, name))


def copy(av, f, name):
    shutil.copyfile(tga(av, f), os.path.join(OUT, name))


def skin_mask(a):
    """skin-coloured pixels: warm, moderately saturated, not too dark"""
    r, g, b = a[..., 0], a[..., 1], a[..., 2]
    mx = a.max(axis=2); mn = a.min(axis=2); s = (mx - mn) / np.maximum(mx, 1e-4)
    return ((r > g) & (g > b * 0.95) & (s > 0.12) & (s < 0.62) & (mx > 0.32)).astype(np.float32)


def median_rgb(a, m):
    sel = a[m > 0.5]
    return np.median(sel, axis=0) if len(sel) else np.array([0.7, 0.55, 0.45], np.float32)


def match_skin(body, face_ref, region):
    """shift the body's skin (inside region) towards the face's median skin colour (ratio per channel, softened at the edges)"""
    m = cv2.GaussianBlur(skin_mask(body) * region, (0, 0), 2.0)
    have = median_rgb(body, skin_mask(body) * region)
    k = np.clip(face_ref / np.maximum(have, 1e-3), 0.75, 1.3)
    print('skin', WHO, 'body', np.round(have, 3), 'face', np.round(face_ref, 3), 'gain', np.round(k, 3))
    return body * (1 - m[..., None]) + np.clip(body * k, 0, 1) * m[..., None]


def box(h, w, x0, x1, y0, y1):
    m = np.zeros((h, w), np.float32); m[int(y0 * h):int(y1 * h), int(x0 * w):int(x1 * w)] = 1; return m


def face_skin(head):
    h, w, _ = head.shape   # cheeks and forehead of the standard Rocketbox head layout
    reg = box(h, w, 0.30, 0.42, 0.28, 0.40) + box(h, w, 0.58, 0.70, 0.28, 0.40) + box(h, w, 0.40, 0.60, 0.14, 0.20)
    return median_rgb(head, skin_mask(head) * reg)


def hair_mask(img, blur=5.0):
    """painted hair of a Rocketbox head texture: yellower than skin (g/r up, b/g down) or dark brown strands; smoothed, as hair is in patches"""
    r, g, b = img[..., 0], img[..., 1], img[..., 2]
    l = 0.3 * r + 0.59 * g + 0.11 * b
    gr, bg = g / np.maximum(r, 1e-3), b / np.maximum(g, 1e-3)
    score = (gr - 0.765) / 0.04 + (0.745 - bg) / 0.04
    m = ((score > 0.6) | ((l < 0.3) & (l > 0.04) & (r >= g) & (g >= b))) & (l > 0.04) & (r >= g * 0.97)
    return np.clip(cv2.GaussianBlur(m.astype(np.float32), (0, 0), blur) * 1.6 - 0.3, 0, 1)


BRUNETTE = np.array([0.36, 0.235, 0.14], np.float32)   # the mean colour of Sarah's hair (sRGB; the model's light makes hair darker)


def brunette(img, m):
    """blonde → brunette: the brightness pattern of the strands kept, the colour from BRUNETTE"""
    l = img @ np.array([0.3, 0.59, 0.11], np.float32)
    ref = np.median(l[m > 0.5]) if (m > 0.5).any() else 0.5
    b = np.clip(BRUNETTE[None, None, :] * np.power(np.maximum(l, 1e-4) / ref, 1.15)[..., None], 0, 1)
    return img * (1 - m[..., None]) + b * m[..., None]


if WHO == 'sarah':
    # Sarah is a real person: the current female figure's face, skin and clothes stay (Adults/Female_Adult_04); only the hair changes –
    # brunette, curly/wavy, to the shoulders: the hair of Adults/Female_Party_01 (blonde wavy curls) recoloured, the own hair painted on
    # the head brunette as well (fig_mesh.mjs puts the donor's hair on the own head)
    copy('Female_Adult_04', 'f004_body_color.tga', 'sarah_body_color.tga')
    copy('Female_Adult_04', 'f004_body_normal.tga', 'sarah_body_normal.tga')
    head = load(tga('Female_Adult_04', 'f004_head_color.tga'))
    hh, hw_, _ = head.shape
    m = hair_mask(head) * (1 - box(hh, hw_, 0.0, 0.38, 0.6, 1.0))   # not the eyes and the mouth (lower left of the layout)
    save(brunette(head, m), 'sarah_head_color.tga')
    copy('Female_Adult_04', 'f004_head_normal.tga', 'sarah_head_normal.tga')
    # her lashes and earrings stay; the rest of that texture (her former hair cards) is cleared, the file gets small
    op4 = np.asarray(Image.open(tga('Female_Adult_04', 'f004_opacity_color.tga')).convert('RGBA')).copy()
    oh, ow = op4.shape[:2]
    keep = np.zeros((oh, ow), bool)
    for u0, u1, v0, v1 in [(0.23, 0.53, 0.0, 0.14), (0.48, 0.59, 0.18, 0.29)]:   # UV boxes (v up) of the lashes and the earrings
        keep[int((1 - v1) * oh):int((1 - v0) * oh), int(u0 * ow):int(u1 * ow)] = True
    op4[~keep] = 0
    Image.fromarray(op4, 'RGBA').save(os.path.join(OUT, 'sarah_opacity_color.tga'))
    hair = load(tga('Female_Party_01', 'f010_head_color.tga'))
    save(brunette(hair, hair_mask(hair)), 'sarah_hair_color.tga')
    # (no normal map for the donor's hair: smaller file, the strands of the texture carry it)
    op = np.asarray(Image.open(tga('Female_Party_01', 'f010_opacity_color.tga')).convert('RGBA')).copy()
    oh, ow = op.shape[:2]
    op[int(0.9 * oh):, int(0.56 * ow):] = 0   # the black stray strands (lower right): flecks floating above the head
    rgb = op[..., :3].astype(np.float32) / 255
    seen = (op[..., 3] > 30).astype(np.float32)
    op[..., :3] = (np.clip(brunette(rgb, seen), 0, 1) * 255 + 0.5).astype(np.uint8)
    Image.fromarray(op, 'RGBA').save(os.path.join(OUT, 'sarah_hairop_color.tga'))
    if PV:
        os.makedirs(PV, exist_ok=True)
        Image.open(os.path.join(OUT, 'sarah_head_color.tga')).convert('RGB').resize((768, 768)).save(os.path.join(PV, 'sarah_head.jpg'), quality=88)
        Image.open(os.path.join(OUT, 'sarah_hair_color.tga')).convert('RGB').resize((768, 768)).save(os.path.join(PV, 'sarah_hair.jpg'), quality=88)
elif WHO == 'christoph':
    head = load(tga('Sports_Male_01', 'm021_head_color.tga'))
    body8 = np.asarray(Image.open(tga('Male_Adult_09', 'm017_body_color.tga')).convert('RGB'))
    h, w, _ = body8.shape
    # the tattoo on the left forearm: dark strokes in the box, replaced by the mirrored right forearm (the layout is symmetric)
    bx = (int(0.080 * w), int(0.145 * w), int(0.738 * h), int(0.830 * h))
    sub = body8[bx[2]:bx[3], bx[0]:bx[1]].astype(np.float32) / 255
    lum = sub @ np.array([0.3, 0.59, 0.11], np.float32)
    dark = (lum < cv2.GaussianBlur(lum, (0, 0), 12) - 0.06).astype(np.uint8)
    mask = np.zeros((h, w), np.uint8)
    mask[bx[2]:bx[3], bx[0]:bx[1]] = cv2.dilate(dark, np.ones((15, 15), np.uint8)) * 255
    ys, xs = np.where(mask > 0)
    print('tattoo pixels', len(xs))
    if len(xs):
        src = np.ascontiguousarray(body8[:, ::-1])
        c = (int((xs.min() + xs.max()) / 2), int((ys.min() + ys.max()) / 2))
        body8 = cv2.seamlessClone(src, np.ascontiguousarray(body8), mask, c, cv2.NORMAL_CLONE)
    body = body8.astype(np.float32) / 255
    # the skin: both arms with the hands (lower corners), not the shoes beside them
    region = box(h, w, 0.0, 0.31, 0.47, 1.0) + box(h, w, 0.69, 1.0, 0.47, 1.0)
    region = np.clip(region - box(h, w, 0.222, 0.40, 0.72, 1.0) - box(h, w, 0.60, 0.778, 0.72, 1.0), 0, 1)
    body = match_skin(body, face_skin(head), region)
    save(body, 'christoph_body_color.tga')
    copy('Male_Adult_09', 'm017_body_normal.tga', 'christoph_body_normal.tga')
    copy('Sports_Male_01', 'm021_head_color.tga', 'christoph_head_color.tga')
    copy('Sports_Male_01', 'm021_head_normal.tga', 'christoph_head_normal.tga')
else:
    sys.exit('who? sarah | christoph')
if PV:
    os.makedirs(PV, exist_ok=True)
    Image.open(os.path.join(OUT, WHO + '_body_color.tga')).convert('RGB').resize((768, 768)).save(os.path.join(PV, WHO + '_body.jpg'), quality=88)
print('ok', WHO, OUT)
