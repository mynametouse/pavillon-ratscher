# publish map: files in NEW that are new or changed versus OLD (the published snapshot), and files gone from NEW (-> null)
import os, sys, json, hashlib
old, new, out = sys.argv[1:4]
SKIP = {'pavillon-ratscher.html', 'index.html', 'app.js', '_files.json'} | (set() if os.environ.get('PUB_TOUR') else {'tour.mp4'})   # PUB_TOUR=1: the film changed
def files(root):
    r = {}
    for d, _, fs in os.walk(root):
        for f in fs:
            p = os.path.relpath(os.path.join(d, f), root).replace(os.sep, '/')
            if p in SKIP: continue
            r[p] = os.path.join(d, f)
    return r
def h(p): return hashlib.md5(open(p, 'rb').read()).hexdigest()
O, N = files(old), files(new)
m = {}
for p, f in N.items():
    if p not in O or os.path.getsize(O[p]) != os.path.getsize(f) or h(O[p]) != h(f): m[p] = p
for p in O:
    if p not in N: m[p] = None
json.dump(m, open(out, 'w'), indent=0)
print(len([v for v in m.values() if v]), 'new/changed,', len([v for v in m.values() if v is None]), 'removed')
