#!/usr/bin/env python3
"""feat/schleusingen-ansicht: check viz3/extra/schleusingen-ansicht/dist/schleusingen-ansicht/fassaden.json – the facades of Schleusingen as
read off private views from the street (the views stay outside the repository; only what was read off them is here).

  python3 tools/schleusingen-ansicht/check.py            # schema, the buildings exist and lie where the data says, coverage of the views
  python3 tools/schleusingen-ansicht/check.py --list     # also list per viewpoint which buildings it shows and whether they are read

Coverage: from every viewpoint of viz3/extra/schleusingen-ansicht/views.json a ray per column (the views' camera: 1366 × 559 px, vertical
field of view 90°) finds the nearest facade of the town (stadt.json, in plan, walls as tall as needed); a building that is the nearest
one over at least MIN_PX columns within MAX_D metres counts as shown and must be either read (gebaeude) or named as unreadable
(nicht_lesbar, with a reason: trees, a hedge, blur …). Exit code 1 on any error."""
import json, math, os, re, sys

ROOT = os.path.abspath(os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..'))
EXTRA = os.path.join(ROOT, 'viz3', 'extra', 'schleusingen-ansicht')
FASS = os.path.join(EXTRA, 'dist', 'schleusingen-ansicht', 'fassaden.json')
STADT = os.path.join(ROOT, 'viz3', 'extra', 'schleusingen', 'dist', 'schleusingen', 'stadt.json')
VIEWS = os.path.join(EXTRA, 'views.json')
MIN_PX, MAX_D, W, H = 40, 45.0, 1366, 559
MATERIAL = {'putz', 'putz_modern', 'schiefer', 'schiefer_og', 'schiefer_giebel', 'fachwerk', 'fachwerk_og', 'fachwerk_giebel', 'klinker',
            'bretter', 'blech', 'stein', 'verkleidung', 'glas'}
ART = {'haus', 'block', 'villa', 'geschaeft', 'halle', 'autohaus', 'schuppen', 'garage', 'scheune', 'schule', 'kirche', 'pavillon', 'gasthaus'}
DACH = {'ziegel', 'schiefer', 'blech', 'flach', 'faserzement'}
EG = {'putz', 'klinker', 'stein', 'verkleidung'}
HOLZ = {'braun', 'rot', 'schwarz'}
RAHMEN = {'weiss', 'braun', 'gruen', 'grau', 'blau'}
SICHER = {'hoch', 'mittel', 'niedrig'}
HEX = re.compile(r'^#[0-9a-f]{6}$')


def centroid(f):
    n = len(f) // 2
    return sum(f[0::2]) / n, sum(f[1::2]) / n


def shown(stadt, views):
    """{view name: {building i: columns}} – the nearest facade per column within MAX_D (plan only)"""
    segs = []
    for b in stadt['b']:
        for f in b['F']:
            ax, ay, bx, by = f[0], f[1], f[2], f[3]
            if math.hypot(bx - ax, by - ay) > 0.05:
                segs.append((b['i'], ax, ay, bx, by))
    out = {}
    for v in views:
        fpx = (H / 2) / math.tan(math.radians(v['vfov'] / 2))
        cx, cy = v['x'], v['y']
        near = [s for s in segs if min(math.hypot(s[1] - cx, s[2] - cy), math.hypot(s[3] - cx, s[4] - cy)) < MAX_D + 30]
        cnt = {}
        for u in range(0, W, 4):
            a = math.radians(v['yaw'] + math.degrees(math.atan((u + 0.5 - W / 2) * math.cos(math.radians(v['pitch'])) / fpx)))
            dx, dy = math.sin(a), math.cos(a)
            best = (MAX_D, None)
            for (i, ax, ay, bx, by) in near:
                ex, ey = bx - ax, by - ay
                den = dx * ey - dy * ex
                if abs(den) < 1e-9:
                    continue
                t = ((ax - cx) * ey - (ay - cy) * ex) / den
                s = ((ax - cx) * dy - (ay - cy) * dx) / den
                if 0.3 < t < best[0] and 0 <= s <= 1:
                    best = (t, i)
            if best[1] is not None:
                cnt[best[1]] = cnt.get(best[1], 0) + 4
        out[v['name']] = cnt
    return out


def main(argv):
    errs = []
    doc = json.load(open(FASS))
    stadt = json.load(open(STADT))
    views = json.load(open(VIEWS))
    B = {b['i']: b for b in stadt['b']}
    names = {v['name'] for v in views}
    if doc.get('v') != 1:
        errs.append('v must be 1')
    seen = set()
    for r in doc.get('gebaeude', []):
        i = r.get('i')
        tag = f'building {i}'
        if i not in B:
            errs.append(f'{tag}: no such building in stadt.json'); continue
        if i in seen:
            errs.append(f'{tag}: twice')
        seen.add(i)
        cx, cy = centroid(B[i]['f'])
        if math.hypot(cx - r.get('x', 1e9), cy - r.get('y', 1e9)) > 0.5:
            errs.append(f'{tag}: x, y {r.get("x")}, {r.get("y")} is not its centroid {cx:.1f}, {cy:.1f} (stadt.json changed?)')
        for k, allowed in (('art', ART), ('material', MATERIAL), ('sicher', SICHER)):
            if r.get(k) not in allowed:
                errs.append(f'{tag}: {k} {r.get(k)!r} not in {sorted(allowed)}')
        if not HEX.match(str(r.get('wand', ''))):
            errs.append(f'{tag}: wand {r.get("wand")!r} is no sRGB hex')
        if r.get('wand_quelle') not in ('gemessen', 'geschätzt'):
            errs.append(f'{tag}: wand_quelle')
        d = r.get('dach') or {}
        if d.get('material') not in DACH or not HEX.match(str(d.get('farbe', ''))) or d.get('farbe_quelle', 'Ansicht') not in ('Ansicht', 'Luftbild 2024'):
            errs.append(f'{tag}: dach {d}')
        if 'eg' in r and (r['eg'].get('material') not in EG or not HEX.match(str(r['eg'].get('farbe', '')))):
            errs.append(f'{tag}: eg {r["eg"]}')
        if r.get('material') in ('fachwerk', 'fachwerk_og', 'fachwerk_giebel') and r.get('fachwerk') not in HOLZ:
            errs.append(f'{tag}: half-timbering without the colour of its timber (fachwerk: {sorted(HOLZ)})')
        if 'fachwerk' in r and r['fachwerk'] not in HOLZ:
            errs.append(f'{tag}: fachwerk {r["fachwerk"]!r}')
        if r.get('material') == 'schiefer' and r.get('schiefer') not in ('hell', 'mittel', 'dunkel'):
            errs.append(f'{tag}: slate without its tone (schiefer: hell, mittel, dunkel)')
        if 'rahmen' in r and r['rahmen'] not in RAHMEN:
            errs.append(f'{tag}: rahmen {r["rahmen"]!r}')
        for k in ('laeden', 'laden'):
            if not isinstance(r.get(k), bool):
                errs.append(f'{tag}: {k} must be true or false')
        if not r.get('besonders'):
            errs.append(f'{tag}: besonders (what one sees) is empty')
        av = r.get('ansichten') or []
        if not av or any(a not in names for a in av):
            errs.append(f'{tag}: ansichten {av} not all in views.json')
        if B[i].get('lm'):
            errs.append(f'{tag}: a landmark ({B[i]["lm"]}) – the town models it itself, leave it out')
    nl = doc.get('nicht_lesbar', [])
    nl_ids = set()
    for q in nl:
        if q.get('i') not in B or not q.get('warum'):
            errs.append(f'nicht_lesbar: {q}')
        nl_ids.add(q.get('i'))
    both = seen & nl_ids
    if both:
        errs.append(f'read and unreadable at once: {sorted(both)}')
    sh = shown(stadt, views)
    need = {}
    for name, cnt in sh.items():
        for i, n in cnt.items():
            if n >= MIN_PX and not B[i].get('lm'):
                need.setdefault(i, []).append(name)
    miss = sorted(i for i in need if i not in seen and i not in nl_ids)
    if miss:
        errs.append(f'{len(miss)} buildings the views show are neither read nor named unreadable: {miss[:30]}')
    if '--list' in argv:
        for name in sorted(sh):
            row = [f'{i}{"" if i in seen else "?" if i not in nl_ids else "-"}' for i, n in sorted(sh[name].items(), key=lambda kv: -kv[1]) if n >= MIN_PX]
            print(name, ' '.join(row))
    from collections import Counter
    G = doc.get('gebaeude', [])
    print(f'fassaden.json: {len(G)} buildings read ({dict(Counter(r.get("sicher") for r in G))}), {len(nl)} named unreadable; '
          f'{len(need)} shown by the {len(views)} viewpoints (≥ {MIN_PX} px within {MAX_D:.0f} m), {len(miss)} missing')
    print(f'materials: {dict(Counter(r.get("material") for r in G))}')
    for e in errs:
        print('ERROR', e)
    print('OK' if not errs else f'{len(errs)} errors')
    return 1 if errs else 0


if __name__ == '__main__':
    sys.exit(main(sys.argv[1:]))
