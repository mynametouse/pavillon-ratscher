#!/usr/bin/env python3
"""Detect vehicles, pools … in an orthophoto on model axes with a pretrained aerial detector (Ultralytics YOLO11-OBB trained on DOTAv1:
small-vehicle, large-vehicle, swimming-pool, storage-tank, tennis-court …). CPU is enough.

  python detect.py IMG.jpg x0 y1 s OUT.json [--model yolo11m-obb.pt] [--scale 1.0] [--conf 0.2]

IMG pixel (u, v) is model (x0 + (u + .5) s, y1 - (v + .5) s) (wdlib.fetch). Tiles of 1024 px with 25 % overlap, merged by rotated NMS.
Output: [{ "c": class, "p": conf, "x", "y" (model m), "l", "w" (m, l ≥ w), "az" (deg: compass bearing of the long axis, 0…180) }]."""
import argparse, json, math, sys
import numpy as np


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('img')
    ap.add_argument('x0', type=float)
    ap.add_argument('y1', type=float)
    ap.add_argument('s', type=float)
    ap.add_argument('out')
    ap.add_argument('--model', default='yolo11m-obb.pt')
    ap.add_argument('--scale', type=float, default=1.0, help='resample the image by this factor before detecting')
    ap.add_argument('--conf', type=float, default=0.2)
    ap.add_argument('--tile', type=int, default=1024)
    a = ap.parse_args()
    from PIL import Image
    from ultralytics import YOLO
    Image.MAX_IMAGE_PIXELS = None
    im = Image.open(a.img).convert('RGB')
    if a.scale != 1.0:
        im = im.resize((round(im.width * a.scale), round(im.height * a.scale)), Image.BICUBIC)
    s = a.s / a.scale
    arr = np.asarray(im)
    H, W = arr.shape[:2]
    model = YOLO(a.model)
    names = model.names
    T, step = a.tile, int(a.tile * 0.75)
    dets = []
    xs = list(range(0, max(1, W - T) + 1, step)) + ([W - T] if W > T and (W - T) % step else [])
    ys = list(range(0, max(1, H - T) + 1, step)) + ([H - T] if H > T and (H - T) % step else [])
    n = 0
    for ty in ys:
        for tx in xs:
            crop = arr[ty:ty + T, tx:tx + T]
            r = model.predict(crop[:, :, ::-1].copy(), imgsz=T, conf=a.conf, verbose=False)[0]
            n += 1
            if r.obb is None or not len(r.obb):
                continue
            xywhr = r.obb.xywhr.cpu().numpy()
            cls = r.obb.cls.cpu().numpy().astype(int)
            cf = r.obb.conf.cpu().numpy()
            for (cx, cy, w, h, rot), c, p in zip(xywhr.tolist(), cls.tolist(), cf.tolist()):
                # skip boxes cut by the tile edge (another tile sees them whole)
                if (cx - 8 < max(w, h) / 2 and tx > 0) or (cy - 8 < max(w, h) / 2 and ty > 0):
                    continue
                if (T - cx - 8 < max(w, h) / 2 and tx + T < W) or (T - cy - 8 < max(w, h) / 2 and ty + T < H):
                    continue
                u, v = tx + cx, ty + cy
                # rot: radians, the box's w axis turned clockwise from the image x axis (image y down)
                if w < h:
                    w, h, rot = h, w, rot + math.pi / 2
                # long axis direction in model frame: image x = east-ish (model x), image y = -model y
                dx, dy = math.cos(rot), -math.sin(rot)
                az = (math.degrees(math.atan2(dx, dy)) + 360) % 180
                dets.append({'c': names[int(c)], 'p': round(float(p), 3), 'x': round(a.x0 + (u + 0.5) * s, 2),
                             'y': round(a.y1 - (v + 0.5) * s, 2), 'l': round(float(w) * s, 2), 'w': round(float(h) * s, 2),
                             'az': round(az, 1)})
    # merge duplicates from overlapping tiles: same class, centres closer than half the width
    dets.sort(key=lambda d: -d['p'])
    keep = []
    for d in dets:
        if any(k['c'] == d['c'] and math.hypot(k['x'] - d['x'], k['y'] - d['y']) < max(0.8, 0.5 * min(k['w'], d['w'])) for k in keep):
            continue
        keep.append(d)
    json.dump(keep, open(a.out, 'w'), indent=0)
    from collections import Counter
    print(a.out, n, 'tiles', len(keep), 'detections', dict(Counter(d['c'] for d in keep)))


if __name__ == '__main__':
    main()
