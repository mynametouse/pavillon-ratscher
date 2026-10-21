import json,sys,re
d=json.load(open(sys.argv[1]))
pats=[re.compile(p,re.I) for p in sys.argv[2:]]
for k,v in d.items():
    txt=' '.join([k,v.get('name',''),' '.join(v.get('tags',[])),' '.join(v.get('categories',[])),v.get('description',''),v.get('category','') or ''])
    if any(p.search(txt) for p in pats):
        print(f"{k:35s} dim={v.get('dimensions')} | {v.get('category','')} | {v.get('description','')[:150]}")
