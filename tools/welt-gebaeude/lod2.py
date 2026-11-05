#!/usr/bin/env python3
"""feat/welt-gebaeude: is the state's LoD2 (real roof shapes, Thuringia) downloadable again? And how it replaces the estimated roofs.

  python3 tools/welt-gebaeude/lod2.py                 # tries the tiles of Ratscher's square and the cells beyond it, prints what answers
  python3 tools/welt-gebaeude/lod2.py --get DIR       # when it answers: downloads the ZIPs (CityGML) into DIR (raw data: never commit)

The download service (https://geoportal.geoportal-th.de/3dgebaeude/LoD2/LoD2_32_{E_km}_{N_km}_2_TH.zip, 2 km tiles, lower-left corner in
km, even numbers) answered since ~22.10.2026 with a page „Dieser Geodaten-Dienst ist im Moment leider noch nicht verfügbar“; the portal
itself sits behind a CAPTCHA – never try to get past it. This script only asks the tile URLs and recognises that page.

The swap, once ZIPs come: every building of viz3/extra/welt-gebaeude/dist/gebaeude/ratscher.json and gebaeude/z/*.json carries `id` –
the ETHOS id, which is the LoD2 building id (gml:id of bldg:Building, e.g. DETHL51P000004BA; `_1` … for a part cut off an OSM building).
In the CityGML of the tile: bldg:Building gml:id="DETHL51P000004BA" → bldg:boundedBy/bldg:RoofSurface/…/gml:Polygon (3D rings, EPSG:25832,
heights NHN) and bldg:WallSurface; bldg:roofType (1000 flat, 1010 mono-pitch, 1020 offset mono, 1030 gable, 1040 hipped, 1050 half-hipped,
1060 mansard, 1070 pyramid, 1080 dome, 1090 shed/other); bldg:measuredHeight. Write per building: `rv` = the roof surfaces' vertices
(model x, y via tools/welt-gebaeude/wglib.py to_model, z = NHN height − the building's lowest ground height = above the foot), `rt` =
their triangles (earcut per surface), `r` from roofType (1000→0, 1010/1020→1, 1030→2, 1040/1050/1070→3), `e` = the lowest roof edge,
`F` = each footprint edge with the roof height above its ends and its highest point between (walls_of in tools/welt/zone_schleusingen.py
does that from planes – with LoD2 take the RoofSurface heights along the edge). The app (gebaeude/gebaeude.js) needs nothing else: it builds
from f, F, rv, rt, e, k, rk, rc. The OSM buildings of world/ratscher.js (heights and roofs fitted to the surface model) could take the
LoD2 roofs the same way (matched by footprint overlap) – a job for the lead, it changes world/village.js's input.
"""
import argparse, os, sys, urllib.request

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
URL = 'https://geoportal.geoportal-th.de/3dgebaeude/LoD2/LoD2_32_{e}_{n}_2_TH.zip'
# 2 km tiles over Ratscher's square, Schleusingen and the roads to Kloster Veßra (UTM km, lower-left, even)
TILES = [(e, n) for e in range(614, 630, 2) for n in range(5590, 5600, 2)]


def probe(e, n):
    u = URL.format(e=e, n=n)
    try:
        req = urllib.request.Request(u, headers={'User-Agent': 'PavillonRatscher-Welt/0.1 (open geodata, non-commercial)'})
        with urllib.request.urlopen(req, timeout=60) as r:
            ct = r.headers.get('content-type', '')
            head = r.read(4096)
            if head[:2] == b'PK':
                return 'zip', u, ct
            txt = head.decode('utf-8', 'replace')
            if 'nicht verf' in txt or 'CAPTCHA' in txt.upper():
                return 'not available', u, ct
            return 'other: ' + ct, u, ct
    except Exception as ex:
        return 'error: ' + repr(ex)[:120], u, ''


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--get', default=None)
    a = ap.parse_args()
    seen = {}
    for e, n in TILES:
        st, u, ct = probe(e, n)
        seen[st] = seen.get(st, 0) + 1
        print(st.ljust(16), u, flush=True)
        if st == 'zip' and a.get:
            os.makedirs(a.get, exist_ok=True)
            with urllib.request.urlopen(u, timeout=300) as r:
                open(os.path.join(a.get, os.path.basename(u)), 'wb').write(r.read())
        if st != 'zip' and len(seen) == 1 and sum(seen.values()) >= 3 and not a.get:
            break   # the service is down: three answers alike are enough
    print('summary', seen)


if __name__ == '__main__':
    main()
