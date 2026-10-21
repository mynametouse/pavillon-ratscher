import sys,os,subprocess
from PIL import Image,ImageDraw,ImageFont
out,cache=sys.argv[1],sys.argv[2]; ids=sys.argv[3:]
TW,TH=480,240; cols=3; rows=(len(ids)+cols-1)//cols
sheet=Image.new('RGB',(cols*TW,rows*(TH+18)),(30,30,30)); d=ImageDraw.Draw(sheet)
f=ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf',13)
for i,x in enumerate(ids):
    p=os.path.join(cache,x+'.png')
    if not os.path.exists(p): subprocess.run(['curl','-sS','-L','-o',p,f'https://cdn.polyhaven.com/asset_img/thumbs/{x}.png?width={TW}&height={TH}'])
    try: im=Image.open(p).convert('RGB').resize((TW,TH))
    except Exception: im=Image.new('RGB',(TW,TH),(255,0,0))
    c,r=i%cols,i//cols; sheet.paste(im,(c*TW,r*(TH+18)+18)); d.text((c*TW+3,r*(TH+18)+2),x,fill=(255,255,255),font=f)
sheet.save(out,quality=85)
