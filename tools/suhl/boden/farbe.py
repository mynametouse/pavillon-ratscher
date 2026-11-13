#!/usr/bin/env python3
"""suhl-boden: the colour balance of the aerial image - Suhl in the look of the rest of the world (decision of the Suhl-Chat,
13.11.2026: 'garten-2024-04-07'; the switch --farbe wie-geflogen keeps the colours of the flight).

The existing world (test block B, Kloster Vessra) shows every flight day in the colours of the garden's flight (7 April 2024):
tools/welt/tiles.py Harmonizer learns one 3-D colour transfer per flight day on a coarse mosaic of the context square (25.6 km
around the garden, level 7), across the kilometre lines where two flights meet. Suhl was flown on 15 May 2024 like the north of
block B. Balance builds the SAME Harmonizer - same context square, same mosaic requests, same flight days, the garden as the
reference - and applies the transfer of each 1 km cell's flight day to every image before it is cut into tiles. Without it the Suhl
tiles are darker than block B by 28 / 34 / 39 grey levels (R / G / B) where the two meet (N 5 600 400).

Flight days: one GetFeatureInfo on the layer th_dop_info per 1 km cell of the context square (729 cells) - asked once, gently
(two at a time, a pause after each), and kept in tools/suhl/boden/flugtage.json, so no run has to ask again. Cells of the
municipality come from stage 1 (tools/suhl/out/bestand/luftbild.json). A cell nobody asked about takes the day of the nearest
known cell (at most 6 km away), else it stays as flown.   Source: WMS TH DOP, (c) GDI-Th, CC BY 4.0.

  python3 -I tools/suhl/boden/farbe.py --flugtage            ask the service for the flight days still missing -> flugtage.json
  python3 -I tools/suhl/boden/farbe.py --naht DIR            the step at the north edge of block B before/after: numbers and a strip
"""
import argparse, json, os, re, sys, time
import numpy as np

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import blib
from blib import log, tbounds, wlib
import fetch as wfetch
import tiles as wtiles

CTX = wlib.aligned(5, wlib.CTX)            # the context square of the test block run: E 612700..638300, N 5582800..5608400
FLUGTAGE = os.path.join(blib.HERE, 'flugtage.json')
NAMES = ('garten-2024-04-07', 'wie-geflogen')
# flight days of cells beyond the context square and the municipality (under the far tiles of the city plan). Kept apart from
# flugtage.json: the balance does not read this file yet - using it changes far image tiles, so it is switched on together with
# a new image key (docs/features/suhl-boden.md 3.3)
FERN = os.path.join(blib.HERE, 'flugtage_fern.json')


def km_cells(area):
    e0, n0 = int(np.floor(area[0] / 1000)), int(np.floor(area[1] / 1000))
    e1, n1 = int(np.ceil(area[2] / 1000)), int(np.ceil(area[3] / 1000))
    return [f'{i}_{j}' for j in range(n0, n1) for i in range(e0, e1)]


def load_flugtage():
    """{'E_N' (km): 'YYYY-MM-DD' or None} - the committed answers of the service, plus the cells of the municipality from stage 1"""
    d = {}
    if os.path.exists(FLUGTAGE):
        d.update(json.load(open(FLUGTAGE, encoding='utf-8'))['cells'])
    p = os.path.join(blib.BESTAND, 'luftbild.json')
    if os.path.exists(p):
        for k, v in json.load(open(p, encoding='utf-8')).get('kacheln', {}).items():
            if v.get('flug'):
                d.setdefault(k, v['flug'])
    return d


def cells_under(T):
    """the 1 km cells (e, n in km) under the tiles of a plan (T: level -> [(x, y)])"""
    cells = set()
    for L, ts in T.items():
        for x, y in ts:
            e0, n0, e1, n1 = tbounds(int(L), x, y)
            cells.update((e, n) for e in range(int(np.floor(e0 / 1000)), int(np.ceil(e1 / 1000)))
                         for n in range(int(np.floor(n0 / 1000)), int(np.ceil(n1 / 1000))))
    return cells


def ask_flugtage(cells, pause=0.3, threads=2, path=None):
    """the flight day of 1 km cells from the service (as tools/welt/fetch.py flight_dates, but gently) -> flugtage.json grows
    (or the file named by path)"""
    from concurrent.futures import ThreadPoolExecutor
    FLUGTAGE = path or globals()['FLUGTAGE']
    have = json.load(open(FLUGTAGE, encoding='utf-8')) if os.path.exists(FLUGTAGE) else {'cells': {}}
    todo = [k for k in cells if k not in have['cells']]
    log(f'Flugtage: {len(cells)} Zellen, {len(todo)} noch nicht gefragt')

    def one(key):
        E, N = (int(v) * 1000 + 500 for v in key.split('_'))
        url = (f'{wfetch.WMS_TH}?SERVICE=WMS&VERSION=1.3.0&REQUEST=GetFeatureInfo&LAYERS=th_dop_info&QUERY_LAYERS=th_dop_info&STYLES='
               f'&CRS=EPSG:25832&BBOX={E - 50},{N - 50},{E + 50},{N + 50}&WIDTH=101&HEIGHT=101&I=50&J=50&INFO_FORMAT=text/plain')
        st, b, _ = wlib.http_get(url, timeout=60)
        m = re.search(r'Erstellung=(\d\d)\.(\d\d)\.(\d{4})', b.decode('utf-8', 'replace')) if st == 200 else None
        time.sleep(pause)
        return key, (f'{m.group(3)}-{m.group(2)}-{m.group(1)}' if m else None), st

    def save():
        days = {}
        for v in have['cells'].values():
            days[str(v)] = days.get(str(v), 0) + 1
        have.update({'made': time.strftime('%Y-%m-%dT%H:%M:%SZ', time.gmtime()), 'days': dict(sorted(days.items())),
                     'what': 'flight day of the orthophoto per 1 km cell (lower-left corner E_N in km, UTM 32N); null = the service names none',
                     'source': wfetch.WMS_TH + ' (layer th_dop_info, GetFeatureInfo at the cell centre, attribute Erstellung), © GDI-Th, CC BY 4.0'})
        json.dump(have, open(FLUGTAGE, 'w', encoding='utf-8'), ensure_ascii=False, separators=(',', ':'), sort_keys=True)
    bad = 0
    for i in range(0, len(todo), 40):            # in portions: a restart goes on where it stopped
        with ThreadPoolExecutor(threads) as ex:
            for key, day, st in ex.map(one, todo[i:i + 40]):
                if st == 200:
                    have['cells'][key] = day
                else:
                    bad += 1
        save()
        log(f'  {min(i + 40, len(todo))} / {len(todo)}')
        if bad > 20:
            raise SystemExit('Flugtage: the service answers with errors - stopped, start again later')
    if not todo:
        save()
    return have['cells']


class Balance:
    """apply(image, bbox) for bild.build_level: the colour transfer of each 1 km cell's flight day (tools/welt/tiles.py Harmonizer
    built as the test block run builds it)."""

    def __init__(self, raw):
        self.dates = load_flugtage()
        miss = [k for k in km_cells(CTX) if k not in self.dates]
        if miss:
            raise SystemExit(f'Farbausgleich: {len(miss)} Zellen des Kontextquadrats haben keinen Flugtag in flugtage.json - '
                             'erst python3 -I tools/suhl/boden/farbe.py --flugtage')
        ctx_dates = {k: self.dates.get(k) for k in km_cells(CTX)}
        cimg, cbb = wtiles.wms_mosaic(raw, 7, CTX, 5)
        harm = wtiles.Harmonizer(cimg, cbb, ctx_dates, anchor=(wlib.XF['ex'], wlib.XF['ey']))
        self.tables = {name: harm.table[i] for i, name in enumerate(harm.names)}
        self.stats = harm.stats
        self.name = 'garten-' + str(harm.stats['reference'])
        self.used, self.guessed, self._near = {}, set(), {}
        self.known = np.array([[int(v) for v in k.split('_')] for k, d in self.dates.items() if d], int)
        self.known_day = [d for d in self.dates.values() if d]

    def day_of(self, e, n):
        k = f'{e}_{n}'
        if k in self.dates:
            return self.dates[k]
        if k not in self._near:                    # a cell nobody asked about: the day of the nearest known cell, at most 6 km away
            d2 = (self.known[:, 0] - e) ** 2 + (self.known[:, 1] - n) ** 2
            i = int(np.argmin(d2))
            self._near[k] = self.known_day[i] if d2[i] <= 36 else None
            self.guessed.add(k)
        return self._near[k]

    def apply(self, img, bbox):
        e0, n0, e1, n1 = bbox
        H, W = img.shape[:2]
        p = (e1 - e0) / W
        ci = np.floor((e0 + (np.arange(W) + 0.5) * p) / 1000).astype(int)
        rj = np.floor((n1 - (np.arange(H) + 0.5) * p) / 1000).astype(int)
        runs = lambda v: list(zip(np.r_[0, np.flatnonzero(np.diff(v)) + 1], np.r_[np.flatnonzero(np.diff(v)) + 1, len(v)]))
        out = None
        for r0, r1 in runs(rj):
            for c0, c1 in runs(ci):
                day = self.day_of(int(ci[c0]), int(rj[r0]))
                self.used[str(day)] = self.used.get(str(day), 0) + 1
                t = self.tables.get(day)
                if t is not None:
                    if out is None:
                        out = img.copy()
                    out[r0:r1, c0:c1] = wtiles.shift_colours(t, img[r0:r1, c0:c1])
        return img if out is None else out

    def cells_of(self, T):
        """the 1 km cells under the image tiles of a set (T: level -> [(x, y)]) and where their flight day comes from. A property of
        the tile lists - the same whether the images were fetched in this run or came out of the image store (the counters of
        apply() only see what a run fetches and are empty when every tile is reused)."""
        cells = cells_under(T)
        keep = set(self.guessed)                   # day_of notes the cells it guesses; this count must not change the run's counters
        by, near, none = {}, 0, 0
        for e, n in sorted(cells):
            asked = f'{e}_{n}' in self.dates
            day = self.day_of(e, n)
            by[str(day)] = by.get(str(day), 0) + 1
            near += int(not asked and day is not None)
            none += int(day is None)
        self.guessed = keep
        return {'cells': len(cells), 'by_day': dict(sorted(by.items())), 'day_from_nearest_cell': near, 'without_day': none,
                'note': '1-km-Zellen unter den Bildkacheln des Satzes; day_from_nearest_cell = Zellen außerhalb der abgefragten Flugtage '
                        '(flugtage.json), die den Tag der nächsten bekannten Zelle bekommen (höchstens 6 km); without_day = bleiben wie geflogen'}

    def info(self):
        return {'balance': self.name, 'model': 'tools/welt/tiles.py Harmonizer: je Flugtag eine 3-D-Farbübertragung, Bezug ist der Bildflug am Garten; '
                                               'gelernt am Kontextquadrat des Testblocks (Stufe 7), auf jede 1-km-Zelle nach ihrem Flugtag angewandt',
                'context': list(CTX), 'flights': self.stats.get('flights'), 'boundaries': self.stats.get('boundaries'),
                'tables': sorted(self.tables), 'cells_used_by_day': dict(sorted(self.used.items())),
                'cells_day_from_nearest': len(self.guessed)}


def naht(out, raw):
    """the step at the north edge of test block B (N 5 600 400) before and after the balance: the 7 corridor tiles of level 10 against
    the block-B tiles south of them (from the website) -> naht.json and a strip to look at"""
    import urllib.request
    from PIL import Image
    import bild, plan as planmod
    os.makedirs(out, exist_ok=True)
    T, _ = planmod.make('stadt')
    row = sorted(t for t in T[10] if t[1] == 524)
    bal = Balance(raw)
    res = {'made': time.strftime('%Y-%m-%dT%H:%M:%SZ', time.gmtime()), 'where': 'Nordkante von Testblock B, N 5 600 400; je Kachel der Stufe 10 '
           '24 Bildzeilen (19 m) beiderseits der Linie: Suhl-Kachel (y = 524) minus Block-B-Kachel (y = 523), Mittel der Grauwerte R, G, B',
           'tiles': {}, 'balance': bal.name}
    strips = []
    for x, y in row:
        (bb, w, h, x0, y1, v), = bild.requests_of(10, [(x, y)])
        src = wfetch.fetch_wms(raw, bild.LAYER, bb, w, h)
        time.sleep(0.5)
        p = os.path.join(raw, 'blockb', f'i_10_{x}_523.webp')
        if not os.path.exists(p):
            os.makedirs(os.path.dirname(p), exist_ok=True)
            req = urllib.request.Request(f'https://mynametouse.github.io/pavillon-ratscher/welt-test/i/10/{x}/523.webp', headers={'User-Agent': blib.UA})
            open(p, 'wb').write(urllib.request.urlopen(req, timeout=60).read())
            time.sleep(0.5)
        b = np.asarray(Image.open(p).convert('RGB'))
        bala = bal.apply(src, bb)
        d0 = src[-24:].reshape(-1, 3).mean(0) - b[:24].reshape(-1, 3).mean(0)
        d1 = bala[-24:].reshape(-1, 3).mean(0) - b[:24].reshape(-1, 3).mean(0)
        res['tiles'][f'{x}/{y}'] = {'wie_geflogen': [round(float(v_), 1) for v_ in d0], 'angeglichen': [round(float(v_), 1) for v_ in d1]}
        strips.append((src, bala, b))
    a0 = np.array([t['wie_geflogen'] for t in res['tiles'].values()])
    a1 = np.array([t['angeglichen'] for t in res['tiles'].values()])
    res['mean'] = {'wie_geflogen': [round(float(v_), 1) for v_ in a0.mean(0)], 'angeglichen': [round(float(v_), 1) for v_ in a1.mean(0)]}
    res['worst_abs'] = {'wie_geflogen': round(float(np.abs(a0).max()), 1), 'angeglichen': round(float(np.abs(a1).max()), 1)}
    json.dump(res, open(os.path.join(out, 'naht.json'), 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
    # the strip: left as flown, right balanced; in each half the Suhl tile above the block-B tile (N 5 600 400 is the line between them)
    k = min(4, len(strips))
    px = 128
    im = Image.new('RGB', (2 * k * px + 16, 2 * px + 16), (30, 30, 30))
    from PIL import ImageDraw
    for i, (src, bala, b) in enumerate(strips[:k]):
        for j, top in enumerate((src, bala)):
            xo = j * (k * px + 16) + i * px
            im.paste(Image.fromarray(top).resize((px, px), Image.LANCZOS), (xo, 16))
            im.paste(Image.fromarray(b).resize((px, px), Image.LANCZOS), (xo, 16 + px))
    d = ImageDraw.Draw(im)
    d.text((4, 2), f"wie geflogen: Suhl oben, Block B unten ({res['mean']['wie_geflogen']} Grauwerte)", fill=(255, 255, 255))
    d.text((k * px + 20, 2), f"angeglichen ({bal.name}): {res['mean']['angeglichen']}", fill=(255, 255, 255))
    im.save(os.path.join(out, 'naht_vorher_nachher.jpg'), quality=90)
    print(json.dumps({k_: res[k_] for k_ in ('mean', 'worst_abs', 'balance')}, ensure_ascii=False))
    print(json.dumps(bal.info(), ensure_ascii=False)[:1500])
    return res


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--flugtage', action='store_true')
    ap.add_argument('--flugtage-plan', default='', help='probe | stadt: ask the flight day of the cells under the tiles of this plan that '
                    'have no answer yet -> flugtage_fern.json (not read by the balance until it is switched on)')
    ap.add_argument('--naht', default='')
    ap.add_argument('--raw', default=blib.RAW)
    a = ap.parse_args()
    if a.flugtage:
        c = ask_flugtage(km_cells(CTX))
        log('Flugtage:', json.load(open(FLUGTAGE))['days'])
    if a.flugtage_plan:
        import plan as planmod
        T, _ = planmod.make(a.flugtage_plan)
        known = load_flugtage()
        cells = sorted(k for k in (f'{e}_{n}' for e, n in cells_under(T)) if k not in known)
        ask_flugtage(cells, path=FERN)
        log('Flugtage fern:', json.load(open(FERN))['days'])
    if a.naht:
        naht(a.naht, a.raw)


if __name__ == '__main__':
    main()
