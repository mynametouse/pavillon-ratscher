# preview.py <texdir> <out.jpg> [names...]  grid of *_col.jpg with labels (+ tile size from manifest if present)
import sys,os,json,glob
from PIL import Image,ImageDraw,ImageFont
d,out=sys.argv[1],sys.argv[2]
names=sys.argv[3:] or sorted(os.path.basename(p)[:-8] for p in glob.glob(os.path.join(d,'*_col.jpg')))
man={}
mp=os.path.join(d,'manifest.json')
if os.path.exists(mp): man=json.load(open(mp))
T=256; cols=6; rows=(len(names)+cols-1)//cols
sheet=Image.new('RGB',(cols*T,rows*(T+20)),(30,30,30)); dr=ImageDraw.Draw(sheet)
f=ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf',13)
for i,n in enumerate(names):
    im=Image.open(os.path.join(d,n+'_col.jpg')).convert('RGB').resize((T,T),Image.LANCZOS)
    c,r=i%cols,i//cols; sheet.paste(im,(c*T,r*(T+20)+20))
    lab=n
    if n in man: lab+=f"  {man[n]['tile_m'][0]:g}x{man[n]['tile_m'][1]:g} m"
    dr.text((c*T+4,r*(T+20)+3),lab,fill=(255,255,255),font=f)
sheet.save(out,quality=85)
