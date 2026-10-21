import json,sys,re
assets=[]
for f in ['acg_all.json','acg_all2.json']:
    assets+=json.load(open(f))['foundAssets']
pats=[re.compile(p,re.I) for p in sys.argv[1:]]
for a in assets:
    txt=' '.join([a['assetId'],a.get('displayName',''),' '.join(a.get('tags',[])),a.get('description','') or '',a.get('displayCategory','') or ''])
    if any(p.search(txt) for p in pats):
        print(f"{a['assetId']:16s} {a.get('dimensionX')}x{a.get('dimensionY')} pop={a.get('popularityScore',0):.0f} m={a.get('creationMethod')} | {','.join(t for t in a.get('tags',[]) if not t.isdigit())[:140]}")
