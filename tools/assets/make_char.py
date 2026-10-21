# Builds a yakisugi (alligator char) board texture from a CC0 crack height field (Poly Haven mud_cracked_dry_03).
# make_char.py <disp_png> <crack_col_jpg> <outdir> [qc qn qo]
import sys,numpy as np
from PIL import Image, ImageFile, ImageFilter
ImageFile.MAXBLOCK=2**25
disp,ccol,out=sys.argv[1:4]
N=1024; TILE_M=0.8; NB=5; px_m=TILE_M/N
rng=np.random.default_rng(7)
def blur(a,r):
    # periodic gaussian blur via FFT (keeps tiling)
    fy=np.fft.fftfreq(a.shape[0])[:,None]; fx=np.fft.fftfreq(a.shape[1])[None,:]
    g=np.exp(-2*(np.pi*r)**2*(fx**2+fy**2))
    return np.real(np.fft.ifft2(np.fft.fft2(a)*g)).astype(np.float32)
h0=np.asarray(Image.open(disp)).astype(np.float32); h0=(h0-h0.min())/(h0.max()-h0.min())
c0=np.asarray(Image.open(ccol).convert('L')).astype(np.float32)/255
# crack tile: 4 x 2 repeats -> 256 x 512 px per repeat (cells ~2.4 cm wide, ~4.8 cm tall)
def layer(a,mode):
    t=np.asarray(Image.fromarray(a,mode='F').resize((256,512),Image.LANCZOS))
    return np.tile(t,(2,4))
H=layer(h0,'F'); C=layer(c0,'F')
bounds=[round(i*N/NB) for i in range(NB+1)]
hc=np.zeros((N,N),np.float32); cc=np.zeros((N,N),np.float32); board_tone=np.zeros((N,N),np.float32)
xx=np.arange(N)
for i in range(NB):
    a,b=bounds[i],bounds[i+1]
    oy,ox=int(rng.integers(0,512)),int(rng.integers(0,256))
    Hr=np.roll(np.roll(H,oy,0),ox,1); Cr=np.roll(np.roll(C,oy,0),ox,1)
    hc[:,a:b]=Hr[:,a:b]; cc[:,a:b]=Cr[:,a:b]
    board_tone[:,a:b]=rng.uniform(-1,1)
# sharpen cracks: narrow valleys, flat-ish plates
lo,hi=np.percentile(hc,5),np.percentile(hc,30)
plate=np.clip((hc-lo)/(hi-lo),0,1); plate=plate*plate*(3-2*plate)
# fine relief on plate tops from source
fine=hc-blur(hc,6)
# board seams (V-groove ~4 mm) and slight cupping
seam=np.zeros(N,np.float32); cup=np.zeros(N,np.float32)
for i in range(NB):
    a,b=bounds[i],bounds[i+1]; w=b-a; u=(xx[a:b]-a+0.5)/w
    cup[a:b]=np.sin(np.pi*u)
    d=np.minimum(xx[a:b]-a+0.5,b-xx[a:b]-0.5)*px_m*1000  # mm to board edge
    seam[a:b]=np.clip(1-d/2.5,0,1)
seam2=np.tile(seam,(N,1)); cup2=np.tile(cup,(N,1))
# grain streaks along boards (vertical), low amplitude
g=rng.standard_normal((N,N)).astype(np.float32); g=np.asarray(Image.fromarray(g,mode='F').resize((N//8,N//64),Image.BILINEAR).resize((N,N),Image.BICUBIC))
g=np.roll(g,0,0); g=(g-g.mean())/g.std()
# height in metres
dome=np.clip(blur(plate,3.5),0,1)**0.6*plate
h_m=(dome*2.8e-3 + fine*1.2e-3 + cup2*0.8e-3 + g*0.15e-3 - seam2*4e-3)
dx=(np.roll(h_m,-1,1)-np.roll(h_m,1,1))/(2*px_m); dy=(np.roll(h_m,-1,0)-np.roll(h_m,1,0))/(2*px_m)
STR=0.55
n=np.stack([-dx*STR, dy*STR, np.ones_like(dx)],-1); n/=np.linalg.norm(n,axis=2,keepdims=True)
# AO from cavity
cav=np.clip(blur(h_m,5)-h_m,0,None); ao=np.clip(1-cav/1.6e-3,0.25,1)
ao=np.minimum(ao,1-0.6*seam2)
# colour (sRGB 0..1): plates dark charcoal with slight variation, cracks near-black
tone=1+0.10*board_tone+0.10*(cc-cc.mean())/(cc.std()+1e-6)*0.5+0.04*g
base_plate=np.array([0.135,0.128,0.122]); base_crack=np.array([0.045,0.042,0.040])
m=plate[...,None]
col=(base_crack*(1-m)+base_plate*m)*tone[...,None]
col*= (1-0.5*seam2)[...,None]
# a few slightly greyer (ash) flecks on plate tops
ash=np.clip((fine-np.percentile(fine,97))/0.03,0,1)[...,None]*plate[...,None]
col=col*(1-0.35*ash)+np.array([0.26,0.25,0.24])*0.35*ash
rough=0.95-0.32*dome+0.06*seam2-0.05*np.clip(fine*20,-1,1)
rough=np.clip(rough,0.5,1)
orm=np.stack([ao,rough,np.zeros_like(ao)],-1)
def save(a,p,q,sub):
    Image.fromarray((np.clip(a,0,1)*255+0.5).astype(np.uint8)).save(p,quality=q,optimize=True,progressive=True,subsampling=sub)
qc,qn,qo=(int(x) for x in (sys.argv[4:7] if len(sys.argv)>6 else (85,90,90)))
save(col,out+'/char_col.jpg',qc,2); save(n*0.5+0.5,out+'/char_nrm.jpg',qn,2); save(orm,out+'/char_orm.jpg',qo,2)
print('col mean sRGB',(col.reshape(-1,3).mean(0)*255).round(1),'rough mean',rough.mean().round(3),'ao mean',ao.mean().round(3))
