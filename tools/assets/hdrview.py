import sys,os,numpy as np,cv2
from PIL import Image,ImageDraw,ImageFont
out=sys.argv[1]; ps=sys.argv[2:]
f=ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf',14)
tiles=[]
for p in ps:
    im=cv2.imread(p,cv2.IMREAD_ANYDEPTH|cv2.IMREAD_COLOR)[:,:,::-1].astype(np.float32)
    L=im@np.array([0.2126,0.7152,0.0722],np.float32)
    key=np.exp(np.log(L+1e-4).mean()); x=im*(0.18/key)
    x=x/(1+x); x=np.clip(x,0,1)**(1/2.2)
    t=Image.fromarray((x*255).astype(np.uint8)).resize((800,400))
    d=ImageDraw.Draw(t)
    for k in range(1,8): d.line([(k*100,0),(k*100,400)],fill=(255,0,0) if k==4 else (255,255,0),width=1)
    d.line([(0,200),(800,200)],fill=(255,255,0))
    d.text((4,4),os.path.basename(os.path.dirname(p))+'  (lines: u=0.125 steps, red u=0.5, horizon)',fill=(255,255,255),font=f)
    tiles.append(t)
sheet=Image.new('RGB',(800*2,400*((len(tiles)+1)//2)))
for i,t in enumerate(tiles): sheet.paste(t,((i%2)*800,(i//2)*400))
sheet.save(out,quality=85)
