# process.py <workdir_set> <outdir> <name> [--recolor R,G,B] [--desat f] [--rough_default v] [--metal v]
import sys,os,json,argparse
import numpy as np
from PIL import Image, ImageFile
ImageFile.MAXBLOCK=2**25
ap=argparse.ArgumentParser()
ap.add_argument('setdir'); ap.add_argument('outdir'); ap.add_argument('name')
ap.add_argument('--recolor'); ap.add_argument('--desat',type=float,default=0)
ap.add_argument('--metal',type=float,default=None); ap.add_argument('--colmul',type=float,default=1.0); ap.add_argument('--rough_affine',default=None)
ap.add_argument('--sn',type=int,default=2); ap.add_argument('--so',type=int,default=0); ap.add_argument('--qc',type=int,default=85); ap.add_argument('--qn',type=int,default=90); ap.add_argument('--qo',type=int,default=90)
a=ap.parse_args()
info=json.load(open(os.path.join(a.setdir,'info.json'))); F=info['files']
N=1024
def load(p,mode='RGB'):
    im=Image.open(p); im.load()
    if im.mode in ('I;16','I;16B','I'):
        arr=np.asarray(im).astype(np.float32); mx=65535 if arr.max()>255 else 255
        im=Image.fromarray((arr/mx*255).clip(0,255).astype(np.uint8))
    return im.convert(mode)
def rs(im): return im.resize((N,N),Image.LANCZOS) if im.size!=(N,N) else im
src_size=load(F['col']).size
col=rs(load(F['col']))
c=np.asarray(col).astype(np.float32)/255
if a.desat or a.recolor:
    lum=(c**2.2)@np.array([0.2126,0.7152,0.0722])
    if a.recolor:
        tgt=np.array([float(x) for x in a.recolor.split(',')])/255
        tl=(tgt**2.2)@np.array([0.2126,0.7152,0.0722])
        m=lum.mean()
        lin=(tgt**2.2)[None,None,:]*(lum/m)[...,None]*(tl/tl)  # keep luminance pattern, set mean to target
        # scale so mean luminance equals target luminance
        c=np.clip(lin,0,1)**(1/2.2)
    else:
        g=lum[...,None]**(1/2.2); c=c*(1-a.desat)+g*a.desat
c=c*a.colmul
col=Image.fromarray((c*255+0.5).clip(0,255).astype(np.uint8))
col.save(os.path.join(a.outdir,a.name+'_col.jpg'),quality=a.qc,optimize=True,progressive=True)
# normal
n=np.asarray(load(F['nrm']).resize((N,N),Image.LANCZOS)).astype(np.float32)/255*2-1
n[...,2]=np.maximum(n[...,2],0.05)
n/=np.linalg.norm(n,axis=2,keepdims=True)
Image.fromarray(((n*0.5+0.5)*255+0.5).clip(0,255).astype(np.uint8)).save(os.path.join(a.outdir,a.name+'_nrm.jpg'),quality=a.qn,optimize=True,progressive=True,subsampling=a.sn)
# orm
if 'orm' in F:
    o=np.asarray(load(F['orm']).resize((N,N),Image.LANCZOS)).copy()
    if 'ao' not in F: o[...,0]=255
else:
    ao=np.asarray(load(F['ao'],'L').resize((N,N),Image.LANCZOS)) if 'ao' in F else np.full((N,N),255,np.uint8)
    ro=np.asarray(load(F['rough'],'L').resize((N,N),Image.LANCZOS))
    me=np.asarray(load(F['metal'],'L').resize((N,N),Image.LANCZOS)) if 'metal' in F else np.zeros((N,N),np.uint8)
    o=np.stack([ao,ro,me],-1)
if a.metal is not None: o[...,2]=int(a.metal*255)
if a.rough_affine:
    ra,rb=(float(x) for x in a.rough_affine.split(','))
    o=o.astype(np.float32); o[...,1]=np.clip(ra+rb*o[...,1]/255,0,1)*255; o=(o+0.5).astype(np.uint8)
Image.fromarray(o.astype(np.uint8)).save(os.path.join(a.outdir,a.name+'_orm.jpg'),quality=a.qo,optimize=True,progressive=True,subsampling=a.so)
st={'name':a.name,'src_px':src_size,'rough_mean':float(o[...,1].mean()/255),'ao_mean':float(o[...,0].mean()/255),'metal_mean':float(o[...,2].mean()/255),
    'col_mean_srgb':[round(float(x),1) for x in np.asarray(col).reshape(-1,3).mean(0)]}
print(json.dumps(st))
