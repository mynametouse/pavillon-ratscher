#!/usr/bin/env python3
"""The sample set of the Zentrum for the Suhl runtime: copies what the data agents pushed to their branches
(origin/suhl/<paket>: tools/suhl/out/<paket>/probe/suhl/**) into viz3/extra/suhl-laufzeit/dist/suhl/ – the build copies that folder
into dist/, the test server serves it, the app reads it as SUHL.BASE = 'suhl/'.

    python3 viz3/extra/suhl-laufzeit/probe_holen.py            # fetch the branches (depth 1) and copy
    python3 viz3/extra/suhl-laufzeit/probe_holen.py --local    # copy from the refs already fetched (refs/suhl-tmp/<paket>)

What a branch does not deliver yet is filled so the runtime can be built and tested:
  aktuell.json   written here from the product folders found (until suhl-daten publishes the real one)
  g/v0/          a stand-in (marked "platzhalter": true): building records of an existing cell of gebaeude/z (villages and Schleusingen,
                 ETHOS.BUILDA) moved into the sample tiles – real records in the real format, at the wrong place. Removed as soon as
                 origin/suhl/gebaeude has a sample.
Nothing here is published; the folder stays below 15 MB.
"""
import io, json, math, os, shutil, subprocess, sys, tarfile

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.abspath(os.path.join(HERE, '..', '..', '..'))
DIST = os.path.join(HERE, 'dist', 'suhl')
PAKETE = ['boden', 'gebaeude', 'gruen', 'strassen', 'daten']
XF = json.load(open(os.path.join(ROOT, 'viz3', 'manifests.json')))['geoman']['xf']
ROOT_E0, ROOT_N0, ROOT_S = 420700.0, 5390800.0, 409600.0


def git(*a, binary=False):
    r = subprocess.run(['git', '-C', ROOT] + list(a), capture_output=True)
    if r.returncode:
        return None
    return r.stdout if binary else r.stdout.decode()


def to_model(E, N):
    a, b, ex, ey = XF['a'], XF['b'], XF['ex'], XF['ey']
    s2 = a * a + b * b
    return (a * (E - ex) + b * (N - ey)) / s2, (-b * (E - ex) + a * (N - ey)) / s2


def to_utm(x, y):
    return XF['a'] * x - XF['b'] * y + XF['ex'], XF['b'] * x + XF['a'] * y + XF['ey']


def copy_branch(paket, local):
    ref = 'refs/suhl-tmp/' + paket
    if not local:
        r = subprocess.run(['git', '-C', ROOT, 'fetch', '-q', '--depth', '1', 'origin', 'suhl/' + paket], capture_output=True)
        if r.returncode:
            print(f'{paket:9s} no branch origin/suhl/{paket} yet')
            return None
        git('update-ref', ref, 'FETCH_HEAD')
    head = git('rev-parse', '--short', ref)
    if not head:
        print(f'{paket:9s} not fetched')
        return None
    src = f'tools/suhl/out/{paket}/probe/suhl'
    tar = git('archive', ref, src, binary=True)
    if not tar:
        print(f'{paket:9s} {head.strip()} has no sample set ({src})')
        return None
    n = size = 0
    with tarfile.open(fileobj=io.BytesIO(tar)) as tf:
        for m in tf.getmembers():
            if not m.isfile():
                continue
            rel = os.path.relpath(m.name, src)
            dst = os.path.join(DIST, rel)
            os.makedirs(os.path.dirname(dst), exist_ok=True)
            with open(dst, 'wb') as f:
                shutil.copyfileobj(tf.extractfile(m), f)
            n += 1
            size += m.size
    print(f'{paket:9s} {head.strip()}  {n} files, {size / 1e6:.2f} MB')
    return head.strip()


def standin_g(tiles):
    """building records of one existing cell (absolute model metres) moved into every sample tile, tile-local model metres"""
    cells = os.path.join(ROOT, 'viz3', 'dist', 'gebaeude', 'z')
    cand = sorted((f for f in os.listdir(cells) if '_' in f), key=lambda f: -os.path.getsize(os.path.join(cells, f)))[:6] if os.path.isdir(cells) else []
    if not cand:
        print('g         no stand-in: viz3/dist/gebaeude/z is not there')
        return 0
    total = 0
    for k, (x, y) in enumerate(tiles):
        src = json.load(open(os.path.join(cells, cand[k % len(cand)])))
        i, j = (int(v) for v in cand[k % len(cand)][:-5].split('_'))
        ccx, ccy = (i + 0.5) * 400, (j + 0.5) * 400          # the cell's centre (model metres)
        s = ROOT_S / 1024
        e0, n0 = ROOT_E0 + x * s, ROOT_N0 + y * s
        ox, oy = to_model(e0 + s / 2, n0 + s / 2)
        out = []
        for b in src['b']:
            f = b['f']
            cx = sum(f[0::2]) / (len(f) / 2) - ccx
            cy = sum(f[1::2]) / (len(f) / 2) - ccy
            E, N = to_utm(ox + cx, oy + cy)
            if not (e0 + 8 <= E < e0 + s - 8 and n0 + 8 <= N < n0 + s - 8):
                continue   # the model square is turned by 4.36 degrees against the tile: what falls outside is left out
            mv = lambda px, py: (round(px - ccx, 2), round(py - ccy, 2))
            r = dict(b)
            r['f'] = [v for q in range(0, len(f), 2) for v in mv(f[q], f[q + 1])]
            r['F'] = [list(mv(q[0], q[1])) + list(mv(q[2], q[3])) + q[4:] for q in b['F']]
            r['rv'] = [v for q in range(0, len(b['rv']), 3) for v in (*mv(b['rv'][q], b['rv'][q + 1]), b['rv'][q + 2])]
            r['id'] = 'PLATZHALTER-%d-%d-%d' % (x, y, len(out))
            out.append(r)
        d = os.path.join(DIST, 'g', 'v0', '10', str(x))
        os.makedirs(d, exist_ok=True)
        json.dump({'v': 0, 'platzhalter': True, 'key': '10/%d/%d' % (x, y), 'o': [round(ox, 3), round(oy, 3)], 'frame': 'modell', 'b': out},
                  open(os.path.join(d, '%d.json' % y), 'w'), separators=(',', ':'))
        total += len(out)
    json.dump({'produkt': 'g', 'schema': 1, 'level': 10, 'platzhalter': True, 'frame': 'modell',
               'stand': 'Platzhalter: Datensätze aus gebaeude/z (Dörfer, Schleusingen) in die Probekacheln verschoben – nicht Suhl',
               'kacheln': {'%d_%d' % t: 0 for t in tiles},
               'attribution': 'ETHOS.BUILDA (Forschungszentrum Jülich, Zenodo 11845992, ODbL 1.0) aus LoD2 Thüringen (© GDI-Th)'},
              open(os.path.join(DIST, 'g', 'v0', 'index.json'), 'w'), indent=1, ensure_ascii=False)
    print(f'g         stand-in: {total} records in {len(tiles)} tiles (from {", ".join(cand)})')
    return total


def main():
    local = '--local' in sys.argv
    heads = {p: copy_branch(p, local) for p in PAKETE}
    # the sample tiles: the level-10 tiles of the ground product
    tiles = []
    mp = os.path.join(DIST, 'boden', 'v0', 'meta.json')
    if os.path.exists(mp):
        lv = json.load(open(mp))['tiling']['levels']['10']
        tiles = [tuple(t) for t in lv.get('has') or [(x, y) for y in range(lv['rect'][1], lv['rect'][3] + 1) for x in range(lv['rect'][0], lv['rect'][2] + 1)]]
    gi = os.path.join(DIST, 'g', 'v0', 'index.json')
    real_g = os.path.exists(gi) and not json.load(open(gi)).get('platzhalter')
    if not real_g and tiles:
        shutil.rmtree(os.path.join(DIST, 'g'), ignore_errors=True)
        standin_g(tiles)
    # aktuell.json: the versions found (the highest v<N> of every product folder), unless a branch delivered one
    ap = os.path.join(DIST, 'aktuell.json')
    if not os.path.exists(ap) or json.load(open(ap)).get('platzhalter'):
        prod = {}
        for name in sorted(os.listdir(DIST)):
            d = os.path.join(DIST, name)
            vs = sorted(int(v[1:]) for v in os.listdir(d) if v[:1] == 'v' and v[1:].isdigit()) if os.path.isdir(d) else []
            if vs:
                prod[name] = {'v': vs[-1], 'schema': 1}
        json.dump({'platzhalter': True, 'schema': 1, 'stand': 'Probesatz Zentrum (viz3/extra/suhl-laufzeit/probe_holen.py)', 'quellen': {k: v for k, v in heads.items() if v},
                   'produkte': prod}, open(ap, 'w'), indent=1, ensure_ascii=False)
        print('aktuell.json written:', ', '.join(f'{k} v{v["v"]}' for k, v in prod.items()))
    tot = sum(os.path.getsize(os.path.join(dp, f)) for dp, _, fs in os.walk(DIST) for f in fs)
    print(f'dist/suhl: {tot / 1e6:.2f} MB')
    if tot > 15e6:
        sys.exit('more than 15 MB – too much for git')


if __name__ == '__main__':
    main()
