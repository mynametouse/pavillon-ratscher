import sys,os,numpy as np,cv2
for p in sys.argv[1:]:
    im=cv2.imread(p,cv2.IMREAD_ANYDEPTH|cv2.IMREAD_COLOR)[:,:,::-1].astype(np.float64)  # RGB
    H,W,_=im.shape
    L=im@np.array([0.2126,0.7152,0.0722])
    v=(np.arange(H)+0.5)/H; el=(0.5-v)*np.pi; w=np.cos(el)[:,None]*np.ones((1,W))  # solid angle weight
    Lb=cv2.GaussianBlur(L,(0,0),2)
    iy,ix=np.unravel_index(np.argmax(Lb),Lb.shape)
    u_s=(ix+0.5)/W; el_s=np.degrees(el[iy])
    # sun disc region: pixels within 6 deg of peak
    yy,xx=np.mgrid[0:H,0:W]; ph=(xx+0.5)/W*2*np.pi; th=el[yy]
    ps=u_s*2*np.pi; ts=np.radians(el_s)
    cosd=np.sin(th)*np.sin(ts)+np.cos(th)*np.cos(ts)*np.cos(ph-ps)
    disc=cosd>np.cos(np.radians(6))
    tot=(L*w).sum(); sun=(L*w*disc).sum()
    up=el>0
    sky=(L*w)[up[:,0] if False else (yy<H//2)].sum()
    # irradiance on horizontal plane from upper hemisphere (cos theta to zenith)
    cz=np.sin(el)[:,None]*np.ones((1,W)); Eh=(L*w*np.clip(cz,0,None)).sum()*(2*np.pi/W)*(np.pi/H)
    Esun=(L*w*np.clip(cz,0,None)*disc).sum()*(2*np.pi/W)*(np.pi/H)
    sc=(im*(w*disc)[...,None]).reshape(-1,3).sum(0); sc/=sc.max()
    kc=(im*(w*(~disc)*(yy<H//2))[...,None]).reshape(-1,3).sum(0); kc/=kc.max()
    print(f"{os.path.basename(os.path.dirname(p)):22s} {W}x{H} peakL={L.max():9.1f} sun_u={u_s:.3f} sun_el={el_s:5.1f} sun_share_of_total={sun/tot:.2f} E_horiz={Eh:7.2f} sun_part_Eh={Esun/Eh:.2f} sunRGB={np.round(sc,2)} skyRGB={np.round(kc,2)}")
