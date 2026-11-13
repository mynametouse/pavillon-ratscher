#!/usr/bin/env python3
"""suhl-gebaeude: the age of the buildings from the census 2022 grid (100 m cells: number of buildings by year of construction;
Statistische Ämter des Bundes und der Länder, Zensus 2022, Stichtag 15.05.2022; values slightly changed for secrecy).

Two steps, both optional (a missing file is never an error):
  1. in GitHub Actions - the download host does not answer the chat machine:
       python3 -I tools/suhl/gebaeude/zensus.py --filter ZIP_OR_CSV --out tools/suhl/out/gebaeude/actions/zensus_baujahr.json
     keeps the cells whose midpoint lies in the box of the municipality of Suhl (+ 300 m) with all their columns.
  2. bauen.py --zensus FILE: a building's era class from its cell - only for houses, only where nothing better is known, and marked:
     q.era 1 (src zensus) when at least 60 % of the cell's buildings fall into one class, else the most frequent class as an
     assumption (q.era 0).
Era classes of the data contract: 1 up to 1918, 2 1919-1948, 3 1949-1990, 4 from 1991.
"""
import csv, io, json, math, os, re, sys, zipfile

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import gblib as G

BOX = (609500.0, 5602000.0, 630700.0, 5617100.0)        # UTM 32N: the municipality + 300 m (as tools/suhl/bestand/ethos_filter.py)


def era_of_column(name):
    """the era class a column of years stands for, or None: 'Vor1919' -> 1, 'a1949bis1978' -> 3, '2001bis2010' -> 4 ..."""
    n = name.lower()
    ys = [int(y) for y in re.findall(r'(1[89]\d\d|20[0-4]\d)', n)]
    if not ys or 'insgesamt' in n or 'gitter' in n:
        return None
    if 'vor' in n and len(ys) == 1:
        y = ys[0] - 1
    elif ('spaeter' in n or 'später' in n or 'nach' in n) and len(ys) == 1:
        y = ys[0]
    else:
        y = max(ys)             # the last year of the span decides (1990-1999 counts as 'from 1991')
        if len(ys) == 2 and ys[0] <= 1990 < ys[1] and ys[1] - 1990 <= 1:
            y = 1990
    return 1 if y <= 1918 else 2 if y <= 1949 else 3 if y <= 1990 else 4


def num(v):
    v = (v or '').strip().replace(',', '.')
    try:
        return float(v)
    except ValueError:
        return 0.0              # '–', '.', '/' : nothing or kept secret


def filter_file(path, out):
    """keep the cells of Suhl of a census grid file (ZIP with a CSV, or the CSV) -> small JSON"""
    from pyproj import Transformer
    inv = Transformer.from_crs(25832, 3035, always_xy=True)
    xs, ys = zip(*[inv.transform(e, n) for e in (BOX[0], BOX[2]) for n in (BOX[1], BOX[3])])
    X0, X1, Y0, Y1 = min(xs) - 100, max(xs) + 100, min(ys) - 100, max(ys) + 100
    back = Transformer.from_crs(3035, 25832, always_xy=True)
    if zipfile.is_zipfile(path):
        z = zipfile.ZipFile(path)
        names = [n for n in z.namelist() if n.lower().endswith('.csv') and '100m' in n.lower()] or [n for n in z.namelist() if n.lower().endswith('.csv')]
        if not names:
            raise SystemExit(f'no CSV in {path}: {z.namelist()[:8]}')
        f = io.TextIOWrapper(z.open(names[0]), encoding='utf-8', errors='replace', newline='')
        src = names[0]
    else:
        f = open(path, encoding='utf-8', errors='replace', newline='')
        src = os.path.basename(path)
    head = f.readline()
    delim = ';' if head.count(';') >= head.count(',') else ','
    cols = [c.strip().strip('"') for c in head.rstrip('\r\n').split(delim)]
    ix = next((i for i, c in enumerate(cols) if c.lower().startswith('x_mp')), None)
    iy = next((i for i, c in enumerate(cols) if c.lower().startswith('y_mp')), None)
    if ix is None or iy is None:
        raise SystemExit(f'no x_mp / y_mp columns in {src}: {cols}')
    cells, n = [], 0
    for row in csv.reader(f, delimiter=delim):
        n += 1
        try:
            x, y = float(row[ix]), float(row[iy])
        except (ValueError, IndexError):
            continue
        if not (X0 <= x <= X1 and Y0 <= y <= Y1):
            continue
        e, nn = back.transform(x, y)
        if not (BOX[0] <= e <= BOX[2] and BOX[1] <= nn <= BOX[3]):
            continue
        cells.append(row)
    eras = {c: era_of_column(c) for c in cols}
    doc = {'quelle': 'Statistische Ämter des Bundes und der Länder, Zensus 2022 (Stichtag 15.05.2022), Gitterdaten 100 m; Werte zur Geheimhaltung leicht verändert',
           'datei': src, 'zeilen_gelesen': n, 'zellen': len(cells), 'spalten': cols, 'baualter_klasse_je_spalte': {c: e for c, e in eras.items() if e},
           'x': ix, 'y': iy, 'rahmen_utm': BOX, 'cells': cells}
    G.write_json(out, doc)
    G.log('census grid:', src, 'rows', n, 'cells of Suhl', len(cells), 'columns', cols, 'era columns', doc['baualter_klasse_je_spalte'])
    return doc


class Grid:
    """the filtered cells: era class of the cell a UTM point lies in"""

    def __init__(self, path):
        from pyproj import Transformer
        d = json.load(open(path, encoding='utf-8'))
        self.tf = Transformer.from_crs(25832, 3035, always_xy=True)
        cols = d['spalten']
        era_cols = [(i, era_of_column(c)) for i, c in enumerate(cols)]
        era_cols = [(i, e) for i, e in era_cols if e]
        self.cells = {}
        for row in d['cells']:
            try:
                key = (int(float(row[d['x']]) // 100), int(float(row[d['y']]) // 100))
            except (ValueError, IndexError):
                continue
            s = [0.0, 0.0, 0.0, 0.0, 0.0]
            for i, e in era_cols:
                if i < len(row):
                    s[e] += num(row[i])
            if sum(s) > 0:
                self.cells[key] = s
        self.n = len(self.cells)

    def era(self, E, N):
        """(era class, share of the cell's buildings in it) or None"""
        x, y = self.tf.transform(E, N)
        s = self.cells.get((int(x // 100), int(y // 100)))
        if not s:
            return None
        t = sum(s)
        e = max(range(1, 5), key=lambda i: s[i])
        return e, s[e] / t


def selftest():
    cols = ['GITTER_ID_100m', 'x_mp_100m', 'y_mp_100m', 'Insgesamt_Gebaeude', 'Vor1919', 'a1919bis1948', 'a1949bis1978', 'a1979bis1990', 'a1991bis2000',
            'a2001bis2010', 'a2011bis2019', 'a2020undspaeter']
    want = [None, None, None, None, 1, 2, 3, 3, 4, 4, 4, 4]
    got = [era_of_column(c) for c in cols]
    dec = {'Vor1919': 1, '1919bis1948': 2, '1949bis1959': 3, '1980bis1989': 3, '1990bis1999': 4, '2010bis2015': 4, '2016undspaeter': 4}
    ok = got == want and all(era_of_column(k) == v for k, v in dec.items())
    print('ok' if ok else 'FAIL', got, {k: era_of_column(k) for k in dec})
    return ok


if __name__ == '__main__':
    import argparse
    ap = argparse.ArgumentParser()
    ap.add_argument('--filter', default=None)
    ap.add_argument('--out', default=os.path.join(G.OUT, 'actions', 'zensus_baujahr.json'))
    ap.add_argument('--selftest', action='store_true')
    a = ap.parse_args()
    if a.selftest:
        sys.exit(0 if selftest() else 1)
    if a.filter:
        filter_file(a.filter, a.out)
