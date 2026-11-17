# feat/innen-real: before and after side by side – the pictures of viz3/test/innen_real.py with the same name from out/innen_real/<vorher>/
# and out/innen_real/<nachher>/ joined (left before, right after) into out/innen_real/vergleich/, and the numbers of both runs: per house
# the interior's draw calls and triangles, per picture the whole frame's draw calls, triangles and time (no browser).
#   python3 viz3/test/innen_real_vergleich.py [vorher] [nachher]
import sys, os, json, statistics
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__))); import lib
A = sys.argv[1] if len(sys.argv) > 1 else 'vorher'
B = sys.argv[2] if len(sys.argv) > 2 else 'nachher'
base = os.path.join(lib.ROOT, 'out', 'innen_real')
out = lib.out(os.path.join('innen_real', 'vergleich'))


def load(tag):
    import glob
    m = {'houses': [], 'shots': []}
    for p in sorted(glob.glob(os.path.join(base, tag, 'metrics*.json'))):
        d = json.load(open(p))
        m['houses'] += d['houses']; m['shots'] += d['shots']
    return m


ma, mb = load(A), load(B)
print('house                         draws  tris        (%s → %s)' % (A, B))
hb = {(h['place'], h['label']): h for h in mb['houses']}
for h in ma['houses']:
    o = hb.get((h['place'], h['label']))
    sa = (h.get('survey') or {}).get('stats') or {}
    sb = ((o or {}).get('survey') or {}).get('stats') or {}
    print('%-28s %3s → %-3s %6s → %-6s' % (h['place'] + ' ' + h['label'], sa.get('draws'), sb.get('draws'), sa.get('tris'), sb.get('tris')))
sb = {s['name']: s for s in mb['shots']}
pairs = [(s, sb[s['name']]) for s in ma['shots'] if s['name'] in sb]
if pairs:
    med = lambda xs: round(statistics.median(xs)) if xs else None
    for k in ('calls', 'tris', 'ms'):
        print('frame %-5s median %s → %s' % (k, med([a[k] for a, _ in pairs]), med([b[k] for _, b in pairs])))
try:
    from PIL import Image
    n = 0
    for a, b in pairs:
        pa, pb = os.path.join(base, A, a['name'] + '.jpg'), os.path.join(base, B, b['name'] + '.jpg')
        if not (os.path.exists(pa) and os.path.exists(pb)): continue
        ia, ib = Image.open(pa), Image.open(pb)
        w, h = 640, int(640 * ia.height / ia.width)
        im = Image.new('RGB', (2 * w + 8, h), (255, 255, 255))
        im.paste(ia.resize((w, h)), (0, 0)); im.paste(ib.resize((w, h)), (w + 8, 0))
        im.save(os.path.join(out, a['name'] + '.jpg'), quality=86); n += 1
    print(n, 'pictures side by side in', os.path.relpath(out, lib.ROOT))
except ImportError:
    print('no PIL: pictures not joined')
