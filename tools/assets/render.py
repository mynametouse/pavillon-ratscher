# render.py out.jpg texdir name1 name2 ... : quick lit preview of col/nrm/orm (grazing key light + ambient), 2x2 tiling crop
import sys,numpy as np
from PIL import Image,ImageDraw,ImageFont
out,d=sys.argv[1],sys.argv[2]; names=sys.argv[3:]
T=512; f=ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf',13)
sheet=Image.new('RGB',(T*min(4,len(names)),(T+20)*((len(names)+3)//4)),(30,30,30)); dr=ImageDraw.Draw(sheet)
L=np.array([-0.55,0.45,0.70]); L/=np.linalg.norm(L); V=np.array([0,0,1.0]); Hh=(L+V)/np.linalg.norm(L+V)
for i,nm in enumerate(names):
    c=np.asarray(Image.open(f'{d}/{nm}_col.jpg').convert('RGB')).astype(np.float32)/255
    n=np.asarray(Image.open(f'{d}/{nm}_nrm.jpg').convert('RGB')).astype(np.float32)/255*2-1
    o=np.asarray(Image.open(f'{d}/{nm}_orm.jpg').convert('RGB')).astype(np.float32)/255
    # 2x2 tile, then downsample to T (shows seams/tiling)
    Z=int(__import__('os').environ.get('ZOOM','0'))
    if Z: c,n,o=c[:Z,:Z],n[:Z,:Z],o[:Z,:Z]
    else: c=np.tile(c,(2,2,1)); n=np.tile(n,(2,2,1)); o=np.tile(o,(2,2,1))
    n/=np.linalg.norm(n,axis=2,keepdims=True)
    lin=c**2.2; ao,r,m=o[...,0],o[...,1],o[...,2]
    ndl=np.clip(n@L,0,1); ndh=np.clip(n@Hh,0,1)
    a2=np.maximum(r**4,1e-3); D=a2/(np.pi*((ndh**2)*(a2-1)+1)**2)
    F0=0.04*(1-m)[...,None]+lin*m[...,None]
    spec=F0*(D*ndl/4)[...,None]*0.8
    diff=lin*(1-m)[...,None]*(ndl/np.pi)[...,None]
    amb=lin*(1-m)[...,None]*0.25*ao[...,None]+F0*0.25*ao[...,None]
    rgb=(diff*3.0+spec*3.0+amb)
    rgb=np.clip(rgb,0,1)**(1/2.2)
    im=Image.fromarray((rgb*255).astype(np.uint8)).resize((T,T),Image.LANCZOS)
    x,y=(i%4)*T,(i//4)*(T+20); sheet.paste(im,(x,y+20)); dr.text((x+4,y+3),nm+' (2x2 tiles)',fill=(255,255,255),font=f)
sheet.save(out,quality=88)
