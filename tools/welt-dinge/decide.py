#!/usr/bin/env python3
"""Candidates of a large area (many blocks, e.g. a town) into checked detections by rules (feat/welt-dinge) – where there are too many
to look at each: the confident ones are taken, a random sample of them and the doubtful ones go on contact sheets for the eye.

  python3 tools/welt-dinge/decide.py schleusingen DIR [--sheets OUT_DIR] [--camping]   # DIR: blocks b_<x0>_<y1>.jpg + .json (detect.py)

Rules (from the village, where every candidate was looked at: of the small vehicles with confidence ≥ 0.4 all were cars, below 0.1 most
were not): small vehicle ≥ 0.4 → car; large vehicle ≥ 0.5, 4.8–7.5 m → van, longer ≥ 0.6 → lorry; swimming pool ≥ 0.4 → pool (round or
rectangular by its sides). Writes viz3/extra/welt-dinge/pruefung_<gebiet>.json ('ja' with "regel": true; decisions by eye added
there afterwards: 'nein' by position wins)."""
import json, math, os, random, sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import wdlib
import review

EXTRA = os.path.join(wdlib.REPO, 'viz3/extra/welt-dinge')


def main():
    gebiet, d = sys.argv[1], sys.argv[2]
    files = sorted(os.path.join(d, f) for f in os.listdir(d) if f.startswith('b_') and f.endswith('.json'))
    c = review.merge(files, 0.08)
    ja, zweifel = [], []
    for k in c:
        t = None
        if k['c'] == 'small vehicle':
            t = 'auto' if k['p'] >= 0.4 else None
        elif k['c'] == 'large vehicle':
            if '--camping' in sys.argv and 4.5 <= k['l'] <= 10 and k['p'] >= 0.3:
                t = 'wohnwagen'  # a campsite: the long white boxes are caravans and mobile homes
            elif 4.8 <= k['l'] <= 7.5 and k['p'] >= 0.5:
                t = 'van'
            elif k['l'] > 7.5 and k['p'] >= 0.6:
                t = 'lkw'
        elif k['c'] == 'swimming pool' and k['p'] >= 0.4:
            t = 'pool_rund' if abs(k['l'] - k['w']) < 0.15 * k['l'] else 'pool_eckig'
        if t:
            ja.append({'t': t, 'x': k['x'], 'y': k['y'], 'az': k['az'], 'l': k['l'], 'w': k['w'], 'p': k['p'], 'c': k['c'], 'regel': True})
        elif k['c'] in ('small vehicle', 'large vehicle') and k['p'] >= 0.15:
            zweifel.append(k)
    p = os.path.join(EXTRA, f'pruefung_{gebiet}.json')
    old = json.load(open(p)) if os.path.exists(p) else {}
    nein = old.get('nein', [])
    ja = [k for k in ja if not any(math.hypot(k['x'] - a[0], k['y'] - a[1]) < 1.5 for a in nein)]
    out = {'quelle': f'DOP 2024 (GDI-Th), YOLO11-OBB (DOTAv1), Regeln aus tools/welt-dinge/decide.py; Stichprobe und Zweifelsfälle von Auge',
           'ja': ja + [k for k in old.get('ja', []) if not k.get('regel')], 'nein': nein, 'dazu': old.get('dazu', [])}
    json.dump(out, open(p, 'w'), indent=0)
    from collections import Counter
    print(gebiet, len(c), 'candidates →', len(out['ja']), 'taken', dict(Counter(k['t'] for k in out['ja'])), len(zweifel), 'doubtful')
    if '--sheets' in sys.argv:
        o = sys.argv[sys.argv.index('--sheets') + 1]
        os.makedirs(o, exist_ok=True)
        random.seed(6)
        sample = random.sample(ja, min(30, len(ja)))
        for i, k in enumerate(sample):
            k['id'] = i
        for i, k in enumerate(zweifel):
            k['id'] = 100 + i
        json.dump({'stichprobe': sample, 'zweifel': zweifel}, open(os.path.join(o, 'kandidaten.json'), 'w'))
        from PIL import Image
        Image.MAX_IMAGE_PIXELS = None
        cache = {}
        blocks = []
        for f in os.listdir(d):
            if f.startswith('b_') and f.endswith('.jpg'):
                bx, by = f[2:-4].split('_')
                blocks.append((float(bx), float(by), os.path.join(d, f)))

        def crop(k, R):
            # the block that holds the candidate (0.1 m/px, pixel (u, v) = (x − x0, y1 − y) / 0.1)
            for bx, by, f in blocks:
                if bx <= k['x'] < bx + 350 and by - 350 < k['y'] <= by:
                    break
            else:
                return Image.new('RGB', (int(2 * R / 0.1), int(2 * R / 0.1)))
            if f not in cache:
                if len(cache) > 3:
                    cache.pop(next(iter(cache)))
                cache[f] = Image.open(f).convert('RGB')
            u, v, r = (k['x'] - bx) / 0.1, (by - k['y']) / 0.1, R / 0.1
            return cache[f].crop((int(u - r), int(v - r), int(u + r), int(v + r)))

        review.sheets(None, 0, 0, 0.1, sample, o, prefix='stichprobe', crop=crop)
        review.sheets(None, 0, 0, 0.1, zweifel, o, prefix='zweifel', crop=crop)
