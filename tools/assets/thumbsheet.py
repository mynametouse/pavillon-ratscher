# usage: thumbsheet.py out.jpg cachedir id1 id2 ...  (ids: ph:xxx or acg:Xxx)
import sys,os,subprocess,io
from PIL import Image,ImageDraw,ImageFont
out,cache=sys.argv[1],sys.argv[2]
ids=sys.argv[3:]
os.makedirs(cache,exist_ok=True)
T=240
cols=min(6,len(ids)); rows=(len(ids)+cols-1)//cols
sheet=Image.new('RGB',(cols*T,rows*(T+18)),(40,40,40))
d=ImageDraw.Draw(sheet)
try: f=ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf',12)
except: f=ImageFont.load_default()
for i,x in enumerate(ids):
    src,aid=x.split(':',1)
    p=os.path.join(cache,f'{src}_{aid}.png')
    if not os.path.exists(p) or os.path.getsize(p)<500:
        url=(f'https://cdn.polyhaven.com/asset_img/thumbs/{aid}.png?width=256&height=256' if src=='ph'
             else f'https://acg-media.struffelproductions.com/file/ambientCG-Web/media/thumbnail/256-PNG/{aid}.png')
        subprocess.run(['curl','-sS','-L','-o',p,url])
    try:
        im=Image.open(p).convert('RGB').resize((T,T))
    except Exception as e:
        im=Image.new('RGB',(T,T),(255,0,0))
    c,r=i%cols,i//cols
    sheet.paste(im,(c*T,r*(T+18)+18))
    d.text((c*T+3,r*(T+18)+2),x,fill=(255,255,255),font=f)
sheet.save(out,quality=85)
