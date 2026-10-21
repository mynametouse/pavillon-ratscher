import json,sys,re
d=json.load(open(sys.argv[1]))
cp=re.compile(sys.argv[2],re.I)
kp=re.compile(sys.argv[3],re.I) if len(sys.argv)>3 else None
for k,v in sorted(d.items()):
    c=v.get('category','') or ''
    txt=k+' '+' '.join(v.get('tags',[]))+' '+v.get('description','')
    if cp.search(c) and (kp is None or kp.search(txt)):
        print(f"{k:28s} {int(v['dimensions'][0])}mm | {c.split('/',1)[-1][:40]} | {v.get('description','')[17:95]}")
