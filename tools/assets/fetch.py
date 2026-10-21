# fetch.py <workdir> <src:id> [res=2k|1k] [maps=all|diff]
# Downloads into <workdir>/<src>_<id>_<res>/ ; prints paths as JSON
import sys,os,json,subprocess,zipfile,urllib.parse
work,spec=sys.argv[1],sys.argv[2]
res=sys.argv[3] if len(sys.argv)>3 else '2k'
maps=sys.argv[4] if len(sys.argv)>4 else 'all'
src,aid=spec.split(':',1)
d=os.path.join(work,f'{src}_{aid}_{res}'); os.makedirs(d,exist_ok=True)
def curl(url,out):
    if os.path.exists(out) and os.path.getsize(out)>1000: return
    r=subprocess.run(['curl','-sS','-L','--fail','--retry','3','-o',out,url])
    if r.returncode: raise SystemExit(f'download failed {url}')
info={'src':src,'id':aid,'res':res,'dir':d,'files':{}}
if src=='ph':
    fj=os.path.join(d,'files.json'); curl(f'https://api.polyhaven.com/files/{aid}',fj)
    F=json.load(open(fj))
    want={'col':['Diffuse','diff'],'nrm':['nor_gl'],'orm':['arm'],'ao':['AO'],'rough':['Rough'],'metal':['Metal','metal']}
    if maps=='diff': want={'col':want['col']}
    for role,keys in want.items():
        for k in keys:
            if k in F and res in F[k]:
                e=F[k][res].get('jpg') or F[k][res].get('png')
                url=e['url']; out=os.path.join(d,role+'_'+os.path.basename(url)); curl(url,out)
                info['files'][role]=out; info['files'][role+'_url']=url; break
else:
    aj=os.path.join(d,'asset.json'); curl(f'https://ambientcg.com/api/v2/full_json?id={aid}&include=downloadData',aj)
    A=json.load(open(aj))['foundAssets'][0]
    dl=None
    for fold in A['downloadFolders'].values():
        for cat in fold['downloadFiletypeCategories'].values():
            for x in cat['downloads']:
                if x['attribute']==res.upper()+'-JPG': dl=x
    if not dl: raise SystemExit('no zip')
    z=os.path.join(d,dl['fileName']); curl(dl['downloadLink'],z)
    info['files']['zip_url']=dl['downloadLink']
    ex=os.path.join(d,'x'); os.makedirs(ex,exist_ok=True)
    with zipfile.ZipFile(z) as zf:
        for n in zf.namelist():
            b=os.path.basename(n)
            if not b or not b.lower().endswith(('.jpg','.jpeg','.png')): continue
            with open(os.path.join(ex,b),'wb') as fo: fo.write(zf.read(n))
    for b in sorted(os.listdir(ex)):
        p=os.path.join(ex,b); low=b.lower()
        for role,tag in [('col','_color.'),('nrm','_normalgl.'),('rough','_roughness.'),('ao','_ambientocclusion.'),('metal','_metalness.'),('opacity','_opacity.')]:
            if tag in low: info['files'][role]=p
json.dump(info,open(os.path.join(d,'info.json'),'w'),indent=1)
print(json.dumps(info))
