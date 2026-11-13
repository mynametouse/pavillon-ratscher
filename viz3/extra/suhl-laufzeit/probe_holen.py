#!/usr/bin/env python3
"""The sample set of the Zentrum for the Suhl runtime: copies what the data agents pushed to their branches
(origin/suhl/<paket>: tools/suhl/out/<paket>/probe/suhl/<produkt>/v<N>/**) into viz3/extra/suhl-laufzeit/dist/suhl/ – the build copies
that folder into dist/, the test server serves it, the app reads it as SUHL.BASE = 'suhl/'.

    python3 viz3/extra/suhl-laufzeit/probe_holen.py            # fetch the branches (depth 1) and copy
    python3 viz3/extra/suhl-laufzeit/probe_holen.py --local    # copy from the refs already fetched (refs/suhl-tmp/<paket>)

Of every product ONE version is copied: the one whose index (index.json; the ground: meta.json) was made last – a branch can hold an
older set under a higher number. aktuell.json is written here in the form of the data contract (docs/features/suhl-daten.md,
section 4: products.<name> = {version, schema, path, index, made, area, based_on}) and marked "platzhalter": true, until the real
one is published with the first set.

What no branch delivers is filled so the runtime can be built and tested:
  g/v0/          a stand-in (marked "platzhalter": true): building records of an existing cell of gebaeude/z (villages and Schleusingen,
                 ETHOS.BUILDA) moved into the sample tiles – real records, at the wrong place. Only if origin/suhl/gebaeude has no sample.
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
    """-> (commit, {product: {version, made, files, bytes}}) of what the branch's sample holds, one version per product"""
    ref = 'refs/suhl-tmp/' + paket
    if not local:
        r = subprocess.run(['git', '-C', ROOT, 'fetch', '-q', '--depth', '1', 'origin', 'suhl/' + paket], capture_output=True)
        if r.returncode:
            print(f'{paket:9s} no branch origin/suhl/{paket} yet')
            return None, {}
        git('update-ref', ref, 'FETCH_HEAD')
    head = git('rev-parse', '--short', ref)
    if not head:
        print(f'{paket:9s} not fetched')
        return None, {}
    head = head.strip()
    src = f'tools/suhl/out/{paket}/probe/suhl'
    names = (git('ls-tree', '-r', '--name-only', ref, src) or '').split()
    # product -> version -> the time its index was made
    found = {}
    for n in names:
        q = n[len(src) + 1:].split('/')
        if len(q) == 3 and q[1][:1] == 'v' and q[1][1:].isdigit() and q[2] in ('index.json', 'meta.json'):
            try:
                ix = json.loads(git('show', f'{ref}:{n}'))
            except Exception:
                continue
            found.setdefault(q[0], {})[int(q[1][1:])] = str(ix.get('made') or ix.get('generated') or '')
    if not found:
        print(f'{paket:9s} {head} has no sample set ({src})')
        return head, {}
    out = {}
    for prod, vs in sorted(found.items()):
        v = max(vs, key=lambda k: (vs[k], k))
        if len(vs) > 1:
            print(f'{paket:9s} {prod}: versions {sorted(vs)} on the branch – taking v{v}, made last ({vs[v]})')
        sub = f'{src}/{prod}/v{v}'
        tar = git('archive', ref, sub, binary=True)
        shutil.rmtree(os.path.join(DIST, prod), ignore_errors=True)
        n = size = 0
        with tarfile.open(fileobj=io.BytesIO(tar)) as tf:
            for m in tf.getmembers():
                if not m.isfile():
                    continue
                dst = os.path.join(DIST, os.path.relpath(m.name, src))
                os.makedirs(os.path.dirname(dst), exist_ok=True)
                with open(dst, 'wb') as f:
                    shutil.copyfileobj(tf.extractfile(m), f)
                n += 1
                size += m.size
        out[prod] = {'version': v, 'made': vs[v], 'files': n, 'bytes': size}
        print(f'{paket:9s} {head}  {prod}/v{v}: {n} files, {size / 1e6:.2f} MB')
    return head, out


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
    heads, found = {}, {}
    for p in PAKETE:
        heads[p], got = copy_branch(p, local)
        for prod, d in got.items():
            found[prod] = dict(d, paket=p)
    # the sample tiles: the level-10 tiles of the ground product
    tiles = []
    bv = found.get('boden', {}).get('version', 0)
    mp = os.path.join(DIST, 'boden', 'v%d' % bv, 'meta.json')
    if os.path.exists(mp):
        lv = json.load(open(mp))['tiling']['levels']['10']
        tiles = [tuple(t) for t in lv.get('has') or [(x, y) for y in range(lv['rect'][1], lv['rect'][3] + 1) for x in range(lv['rect'][0], lv['rect'][2] + 1)]]
    if 'g' not in found and tiles:
        shutil.rmtree(os.path.join(DIST, 'g'), ignore_errors=True)
        standin_g(tiles)
    # aktuell.json in the contract's form, from the folders that are there now
    prod = {}
    for name in sorted(os.listdir(DIST)):
        d = os.path.join(DIST, name)
        vs = sorted(int(v[1:]) for v in os.listdir(d) if v[:1] == 'v' and v[1:].isdigit()) if os.path.isdir(d) else []
        if not vs:
            continue
        v = vs[-1]
        ixn = 'meta.json' if name == 'boden' else 'index.json'
        ix = json.load(open(os.path.join(d, 'v%d' % v, ixn))) if os.path.exists(os.path.join(d, 'v%d' % v, ixn)) else {}
        files = [os.path.join(dp, f) for dp, _, fs in os.walk(os.path.join(d, 'v%d' % v)) for f in fs]
        prod[name] = {'version': v, 'schema': 1, 'path': '%s/v%d/' % (name, v), 'index': '%s/v%d/%s' % (name, v, ixn),
                      'made': ix.get('made') or ix.get('generated'), 'area': ix.get('area') or (ix.get('suhl') or {}).get('area') or 'probe',
                      'files': len(files), 'bytes': sum(os.path.getsize(f) for f in files),
                      'based_on': ix.get('based_on') or (ix.get('suhl') or {}).get('based_on') or {}}
    made = max((p['made'] or '' for p in prod.values()), default='')
    json.dump({'schema': 1, 'made': made, 'base': 'suhl/', 'platzhalter': True,
               'note': 'Probesatz Zentrum aus den Zweigen der Daten-Agenten (viz3/extra/suhl-laufzeit/probe_holen.py) – nicht veröffentlicht',
               'sources': {k: v for k, v in heads.items() if v}, 'products': prod},
              open(os.path.join(DIST, 'aktuell.json'), 'w'), indent=1, ensure_ascii=False)
    print('aktuell.json written:', ', '.join(f'{k} v{v["version"]}' + (' based on ' + json.dumps(v['based_on']) if v['based_on'] else '') for k, v in prod.items()))
    tot = sum(os.path.getsize(os.path.join(dp, f)) for dp, _, fs in os.walk(DIST) for f in fs)
    print(f'dist/suhl: {tot / 1e6:.2f} MB')
    if tot > 15e6:
        sys.exit('more than 15 MB – too much for git')


if __name__ == '__main__':
    main()
