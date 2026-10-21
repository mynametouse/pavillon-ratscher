# flatsheet.py out.jpg tilepx label=path ...
import sys
from PIL import Image,ImageDraw,ImageFont
out=sys.argv[1]; T=int(sys.argv[2]); items=[a.split('=',1) for a in sys.argv[3:]]
cols=min(6,len(items)); rows=(len(items)+cols-1)//cols
sheet=Image.new('RGB',(cols*T,rows*(T+18)),(40,40,40)); d=ImageDraw.Draw(sheet)
try: f=ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf',12)
except: f=ImageFont.load_default()
for i,(lab,p) in enumerate(items):
    try: im=Image.open(p).convert('RGB').resize((T,T),Image.LANCZOS)
    except Exception: im=Image.new('RGB',(T,T),(255,0,0))
    c,r=i%cols,i//cols; sheet.paste(im,(c*T,r*(T+18)+18)); d.text((c*T+3,r*(T+18)+2),lab,fill=(255,255,255),font=f)
sheet.save(out,quality=88)
