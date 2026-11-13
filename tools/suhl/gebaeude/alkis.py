#!/usr/bin/env python3
"""suhl-gebaeude: the cadastre's buildings from the state's WFS 'ALKIS vereinfacht' (feature type ave:GebaeudeBauwerk; (c) GDI-Th,
CC BY 4.0) for the sample tiles or the whole municipality -> JSON lines (raw data, never committed) and a small summary.

  python3 -I tools/suhl/gebaeude/alkis.py --area probe      # the level-8 boxes (1.6 km) that cover the sample tiles of the Zentrum
  python3 -I tools/suhl/gebaeude/alkis.py --area stadt      # the level-8 boxes that touch the municipality (about 85 requests)

Polite: one request at a time, a pause after each, every answer cached (RAW/alkis/8_<x>_<y>.gml), a second start continues.
ONLY ave:GebaeudeBauwerk is asked - never ave:Flurstueck or anything about parcels or owners.
Per building: oid (the cadastre id, e.g. DETHL57P00006FYsBL; its first 16 characters are the LoD2 / ETHOS id), funktion (use in words),
anzahlgs (floors above ground), lagebeztxt (addresses), aktualit (date), gebnutzbez, name, the footprint (UTM 32N).
"""
import argparse, json, os, re, sys, time
from collections import Counter

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import gblib as G
from gblib import wlib

WFS = 'https://www.geoproxy.geoportal-th.de/geoproxy/services/adv_alkis_wfs'
TYPE = 'ave:GebaeudeBauwerk'           # the only feature type this tool may ask
BOX_LEVEL = 8                          # request boxes: tiles of level 8 (1.6 km)
COUNT = 25000                          # the service's own default limit; a box that reaches it is split


def url_box(b):
    return (f'{WFS}?SERVICE=WFS&VERSION=2.0.0&REQUEST=GetFeature&TYPENAMES={TYPE}&COUNT={COUNT}&SRSNAME=urn:ogc:def:crs:EPSG::25832'
            f'&BBOX={b[0]:.0f},{b[1]:.0f},{b[2]:.0f},{b[3]:.0f},urn:ogc:def:crs:EPSG::25832')


FEAT = re.compile(r'<ave:GebaeudeBauwerk .*?</ave:GebaeudeBauwerk>', re.S)
FIELD = re.compile(r'<ave:(\w+)>([^<]*)</ave:\w+>')
POLY = re.compile(r'<gml:Polygon.*?</gml:Polygon>', re.S)
RING = re.compile(r'<gml:(exterior|interior)>.*?<gml:posList[^>]*>([^<]+)</gml:posList>', re.S)


def unesc(s):
    return s.replace('&amp;', '&').replace('&lt;', '<').replace('&gt;', '>').replace('&quot;', '"').replace('&apos;', "'")


def parse(text):
    """the buildings of one answer: [{oid, fn, gs, adr, akt, nutz, name, poly: [[outer, hole, ...], ...]}]"""
    out = []
    for f in FEAT.findall(text):
        a = dict(FIELD.findall(f))
        polys = []
        for pg in POLY.findall(f):
            rings = []
            for kind, pl in RING.findall(pg):
                v = [float(x) for x in pl.split()]
                r = [[round(v[i], 2), round(v[i + 1], 2)] for i in range(0, len(v) - 1, 2)]
                if len(r) >= 4:
                    if kind == 'exterior':
                        rings.insert(0, r)
                    else:
                        rings.append(r)
            if rings:
                polys.append(rings)
        if not polys or not a.get('oid'):
            continue
        gs = a.get('anzahlgs')
        out.append({'oid': a['oid'], 'fn': unesc(a.get('funktion', '')), 'gs': int(gs) if gs and gs.isdigit() else None,
                    'adr': unesc(a.get('lagebeztxt', '')), 'akt': a.get('aktualit', ''), 'nutz': unesc(a.get('gebnutzbez', '')),
                    'name': unesc(a.get('name', '')), 'poly': polys})
    return out


def fetch_box(key, b, raw, depth=0):
    """one box (cached); a box that hits the count limit is split in four"""
    path = os.path.join(raw, f'{key}.gml')
    body, cached = G.http_cached(url_box(b), path, pause=1.5)
    t = body.decode('utf-8', 'replace')
    if '<wfs:FeatureCollection' not in t[:2000]:
        os.remove(path)
        raise RuntimeError(f'box {key}: not a feature collection: {t[:300]!r}')
    m = re.search(r'numberReturned="(\d+)"', t[:3000])
    n = int(m.group(1)) if m else -1
    if n >= COUNT and depth < 3:
        G.log('box', key, 'hit the limit', n, '- split')
        res = []
        em, nm = (b[0] + b[2]) / 2, (b[1] + b[3]) / 2
        for k, sb in enumerate(((b[0], b[1], em, nm), (em, b[1], b[2], nm), (b[0], nm, em, b[3]), (em, nm, b[2], b[3]))):
            res += fetch_box(f'{key}_{k}', sb, raw, depth + 1)
        return res
    feats = parse(t)
    # every footprint must touch the box we asked for (2 m tolerance) - else the answer is not what we asked
    bad = 0
    for f in feats:
        xs = [p[0] for pg in f['poly'] for p in pg[0]]
        ys = [p[1] for pg in f['poly'] for p in pg[0]]
        if max(xs) < b[0] - 2 or min(xs) > b[2] + 2 or max(ys) < b[1] - 2 or min(ys) > b[3] + 2:
            bad += 1
    if bad:
        raise RuntimeError(f'box {key}: {bad} of {len(feats)} footprints lie outside the requested box {b}')
    G.log('box', key, 'returned', n, 'parsed', len(feats), f'{len(body) / 1e6:.1f} MB', 'cache' if cached else 'fetched')
    return feats


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--area', default='probe', choices=['probe', 'stadt'])
    ap.add_argument('--raw', default=os.path.join(G.RAW, 'alkis'))
    ap.add_argument('--out', default=None, help='JSON lines (default RAW/alkis/<area>.jsonl)')
    ap.add_argument('--summary', default=None, help='small summary JSON (default tools/suhl/out/gebaeude/alkis_<area>.json)')
    a = ap.parse_args()
    from shapely.geometry import box as sbox
    from shapely.ops import unary_union
    A = G.areas()
    if a.area == 'probe':
        region = unary_union([sbox(*wlib.tbounds(G.LEVEL, x, y)) for x, y in G.sample_tiles()])
    else:
        region = A['stadt']
    boxes = G.tiles_touching(region, BOX_LEVEL)
    bb = (min(wlib.tbounds(BOX_LEVEL, x, y)[0] for x, y in boxes), min(wlib.tbounds(BOX_LEVEL, x, y)[1] for x, y in boxes),
          max(wlib.tbounds(BOX_LEVEL, x, y)[2] for x, y in boxes), max(wlib.tbounds(BOX_LEVEL, x, y)[3] for x, y in boxes))
    G.check_centre(bb, 'ALKIS boxes')
    G.log('area', a.area, 'boxes', len(boxes), 'bbox', bb)
    os.makedirs(a.raw, exist_ok=True)
    seen, t0, fails = {}, time.time(), []
    for x, y in boxes:
        try:
            for f in fetch_box(f'{BOX_LEVEL}_{x}_{y}', wlib.tbounds(BOX_LEVEL, x, y), a.raw):
                seen.setdefault(f['oid'], f)
        except Exception as ex:
            fails.append((x, y, repr(ex)[:200]))
            G.log('FAILED box', x, y, repr(ex)[:300])
    out = a.out or os.path.join(a.raw, f'{a.area}.jsonl')
    with open(out + '.part', 'w', encoding='utf-8') as f:
        for o in seen.values():
            f.write(json.dumps(o, ensure_ascii=False, separators=(',', ':')) + '\n')
    os.replace(out + '.part', out)
    L = list(seen.values())
    suffix = Counter(o['oid'][16:] for o in L)
    summ = {'made': time.strftime('%Y-%m-%dT%H:%M:%SZ', time.gmtime()), 'quelle': f'{WFS} ({TYPE}), © GDI-Th, CC BY 4.0', 'gebiet': a.area,
            'kaesten': len(boxes), 'kasten_stufe': BOX_LEVEL, 'fehlgeschlagen': fails, 'rechteck_utm': [round(v) for v in bb],
            'sekunden': round(time.time() - t0, 1), 'gebaeude': len(L), 'mit_geschosszahl': sum(1 for o in L if o['gs']),
            'mit_adresse': sum(1 for o in L if o['adr']), 'mit_namen': sum(1 for o in L if o['name']),
            'mehrteilig': sum(1 for o in L if len(o['poly']) > 1), 'mit_loch': sum(1 for o in L if any(len(pg) > 1 for pg in o['poly'])),
            'kennung_endung': dict(suffix.most_common(5)), 'kennung_laenge': dict(Counter(len(o['oid']) for o in L)),
            'art': dict(Counter(o['nutz'] or '(ohne)' for o in L).most_common()),
            'funktion': dict(Counter(o['fn'] or '(ohne)' for o in L).most_common()),
            'geschosse': dict(sorted(Counter(str(o['gs']) if o['gs'] else '(ohne)' for o in L).items(), key=lambda kv: (len(kv[0]), kv[0]))),
            'stand_jahr': dict(sorted(Counter(o['akt'][:4] for o in L).items()))}
    G.write_json(a.summary or os.path.join(G.OUT, f'alkis_{a.area}.json'), summ, compact=False)
    G.log('buildings', len(L), 'with floors', summ['mit_geschosszahl'], 'failed boxes', len(fails), '->', out)
    if fails and a.area == 'stadt' and len(fails) > len(boxes) // 4:
        raise SystemExit('too many failed boxes')


if __name__ == '__main__':
    main()
