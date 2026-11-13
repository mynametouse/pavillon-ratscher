"""suhl-strassen: the road heights for the other Suhl packages – one source of truth (decision of the Suhl-Chat, 13.11.2026: the roads
package owns the smoothed profiles; suhl-boden cuts the roads into its terrain tiles from them; the buildings read their feet from
that terrain; the drive code does not carve inside Suhl at run time).

The source is the file in the format of the drive data that lauf.py writes (fahrt/suhl-zentrum.json for the sample set, fahrt/suhl.json
for the whole city): per way its axis with z, width, class, surface and the flags (bridge 1, tunnel 2). This module turns it back
into what tools/welt/roads.py works with, without solving anything again:

    import sys; sys.path.insert(0, 'tools/suhl/strassen'); import profil
    pos, chains, h, meta = profil.load('tools/suhl/out/strassen/probe/fahrt/suhl-zentrum.json')
    # pos: UTM 32N (n, 2) · chains: [(way dict, node indices)] · h: NHN (m) per node · meta: sources, which terrain the heights were solved on
    roads.carve(dem, pos, chains, h, area)        # tools/welt/roads.py, unchanged: bridges keep their corridor, tunnels are skipped

A way dict has what roads.py reads: kind (name), surf (name), w (m), fl (bit 1 bridge, bit 2 tunnel; Suhl's further bits stay in it),
id, name, ref – and `walk`: the width of the pavement the road map draws beside it in a town (0 where none).
town=True widens `w` by kerb and pavements on both sides: the cut is then level across the whole street space (the carriageway's
2.5 % cross fall runs on to the back of the pavement), as the road map of feat/strassen draws it (strassen_stil.js marks()).
"""
import gzip, json, math, os, sys
import numpy as np

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import sslib as S

LEVEL_BIT, NO_L, NO_R = 64, 256, 512


def pavement(kind_i, surf_i, fl, style):
    """the pavement width per side as the road map of feat/strassen draws it (strassen_stil.js marks): in a town 1.7 m along main and
    county roads, 1.3 m along streets with a hard surface; none in open country, in villages, on level streets (bit 64)"""
    if style != 2 or surf_i > 2 or kind_i > 3 or fl & LEVEL_BIT or fl & 3:
        return 0.0
    return 1.7 if kind_i <= 2 else 1.3


def load(path, step=2.0, town=False, kinds=None):
    """-> pos (UTM), chains, h (NHN), meta. step: the ways are densified to at most this spacing (roads.py expects about 2 m: its
    superelevation filter counts nodes). kinds: only these kind names (default: all)."""
    op = gzip.open if path.endswith('.gz') else open
    with op(path, 'rt', encoding='utf-8') as f:
        j = json.load(f)
    K, SF = j['kinds'], j['surf']
    orte = []
    for o in j.get('orte', []):
        for r in o['a']:
            orte.append((o['t'], np.array(r, float).reshape(-1, 2) / 10))

    def style_at(x, y):
        best = 0
        for t, r in orte:
            if t > best and r[:, 0].min() < x < r[:, 0].max() and r[:, 1].min() < y < r[:, 1].max():
                c, k = False, len(r) - 1
                for i in range(len(r)):
                    if (r[i, 1] > y) != (r[k, 1] > y) and x < (r[k, 0] - r[i, 0]) * (y - r[i, 1]) / (r[k, 1] - r[i, 1]) + r[i, 0]:
                        c = not c
                    k = i
                if c:
                    best = t
        return 2 if best == 2 else 3 if best == 1 else 0
    pos, hh, chains = [], [], []
    ids_osm = j.get('ids') or [0] * len(j['ways'])
    for n, (k, sf, w10, fl, ni, ri, q) in enumerate(j['ways']):
        if kinds is not None and K[k] not in kinds:
            continue
        P = np.array(q, float).reshape(-1, 3) / 10
        seg = np.hypot(*np.diff(P[:, :2], axis=0).T)
        cum = np.concatenate([[0], np.cumsum(seg)])
        if cum[-1] < 0.05:
            continue
        m = max(1, int(math.ceil(cum[-1] / step)))
        s = np.unique(np.concatenate([cum, np.linspace(0, cum[-1], m + 1)]))
        x, y, z = np.interp(s, cum, P[:, 0]), np.interp(s, cum, P[:, 1]), np.interp(s, cum, P[:, 2])
        E, N = S.m2u(x, y)
        mid = len(x) // 2
        walk = pavement(k, sf, fl, style_at(x[mid], y[mid]))
        w = w10 / 10
        if town and walk > 0:
            w += (0.15 + walk) * ((0 if fl & NO_L else 1) + (0 if fl & NO_R else 1))
        i0 = len(pos)
        pos += list(zip(E.tolist(), N.tolist()))
        hh += (z + S.H0).tolist()
        chains.append((dict(id=ids_osm[n], kind=K[k], surf=SF[sf], w=w, w0=w10 / 10, fl=fl, name=j['names'][ni], ref=j['names'][ri], walk=walk),
                       np.arange(i0, i0 + len(x))))
    meta = {'made': j.get('made'), 'heights': j.get('heights'), 'credits': j.get('credits'), 'ways': len(chains), 'nodes': len(pos),
            'unit': 'pos UTM 32N (m), h NHN (m); lengths true metres'}
    return np.array(pos, float), chains, np.array(hh, float), meta


if __name__ == '__main__':
    p = sys.argv[1] if len(sys.argv) > 1 else os.path.join(S.OUT, 'probe', 'fahrt', 'suhl-zentrum.json')
    pos, chains, h, meta = load(p, town='--town' in sys.argv)
    S.log(os.path.relpath(p, S.REPO), meta['ways'], 'ways,', meta['nodes'], 'nodes; NHN', round(float(h.min()), 1), '…', round(float(h.max()), 1))
    S.log('solved on:', (meta['heights'] or {}).get('solved_on'))
    import roads as WR
    for w, ids in chains[:3]:
        o, hw, sw = WR.cross(w)
        sL, sR = WR.slopes(w, pos[ids])
        S.log(' ', w['id'], w['kind'], w['surf'], 'w', w['w'], 'fl', w['fl'] & 3, 'walk', w['walk'], 'cross', [round(float(v), 2) for v in o], 'fall', round(float(sL[0]), 3))
    nb = sum(1 for w, _ in chains if w['fl'] & 1)
    nt = sum(1 for w, _ in chains if w['fl'] & 2)
    S.log('bridges', nb, 'tunnels', nt, '(kept out of the cut by roads.carve)')
