import json,os,glob
S='/tmp/claude-0/-home-claude/c5ba8437-b351-5b29-96e3-f852e8e82b48/scratchpad'
O=S+'/assets/tex'; L=S+'/assets/_tex_work/logs'; DL=S+'/assets/_tex_work/dl'
stats={}
for p in glob.glob(L+'/*.json'):
    try:
        d=json.load(open(p)); stats[d['name']]=d
    except Exception: pass
def ph(id): return ('Poly Haven',id,f'https://polyhaven.com/a/{id}')
def acg(id): return ('ambientCG',id,f'https://ambientcg.com/a/{id}')
M={
 'char':(('Procedural composite (Claude) from Poly Haven CC0 crack height field','mud_cracked_dry_03','https://polyhaven.com/a/mud_cracked_dry_03'),[0.8,0.8],
   'No CC0 charred/yakisugi/shou-sugi-ban set exists on Poly Haven or ambientCG (searched charred, burnt, burned, shou sugi ban, yakisugi). Built procedurally: 5 vertical boards (16 cm) with 4 mm V-seams, alligator-char cells (~2.4 x 4.8 cm, elongated along boards) derived from the mud_cracked_dry_03 displacement (2K, tiled 4x2 with per-board offsets), domed cell tops, near-black albedo (sRGB ~32 avg, cracks ~11), rough 0.6 on cells / 0.95 in cracks. Seamless. Fallback photo set if preferred: Poly Haven black_painted_planks (1.6 m).'),
 'larch':(ph('hinoki_planks'),[1.89,1.89],'Warm honey softwood boards with knots; boards run horizontally in the image (~11 boards, ~17 cm). Raw-wood roughness (mean 0.92): set material.roughness ~0.65-0.75 for a clear oiled/satin finish. For window frames map along the board direction.'),
 'deck':(ph('brown_planks_03'),[1.0,1.0],'Silver-grey weathered untreated boards, boards vertical in image (~9 boards, ~11 cm) with dark seams. Rough mean 0.52 (scan value); consider material.roughness 1.3-1.5 for a drier, more matte look.'),
 'oak':(ph('wood_floor'),[1.7,1.7],'Medium warm-brown oak floor, planks vertical in image (~9 planks, ~19 cm) with staggered butt joints. Rough mean 0.47 (oiled/satin).'),
 'clay':(ph('patterned_clay_plaster'),[2.0,2.0],'Warm beige clay plaster with overlapping trowel arcs (Lehmputz look). For a calmer interior finish use normalScale ~0.5.'),
 'slate':(ph('granite_tile'),[2.3,2.3],'Anthracite cleft-surface stone tiles in a 5x5 grid (each tile ~0.46 m, thin joints) - reads as slate. No jointless dark slate slab available; for a hearth plate align UVs so the plate covers 2x2 or 2x1 tiles. Colour sRGB ~78 avg: multiply material.color ~0.75 for darker slate.'),
 'concrete':(ph('concrete_floor_02'),[2.0,2.0],'Old weathered outdoor slab, grey-brown with moss/dirt staining. Rough mean 0.52 (scan); raise via material.roughness ~1.4 if too sheeny.'),
 'gravel':(acg('Gravel043'),[1.6,1.6],'Fine grey gravel path (photogrammetry), grey with few beige stones. ORM AO from AmbientOcclusion map, metal 0.'),
 'lawn':(acg('Grass004'),[1.4,1.4],'Dense natural garden lawn (procedural, slightly mottled). Source roughness was unrealistically low (mean 0.26) - remapped to 0.55+0.45*r (mean 0.67). Alternative more trampled/brown: Poly Haven leafy_grass (2 m).'),
 'forestfloor':(ph('forest_leaves_02'),[3.0,3.0],'Mossy forest floor with fallen leaves, twigs and debris.'),
 'flagstone':(ph('rock_08'),[1.5,1.5],'Beige-grey weathered sandstone-like rock surface, no joints - suits individual stepping stones (one stone ~0.4-0.6 m uses a sub-area). Rough mean 0.52.'),
 'linen':(ph('rough_linen'),[0.27,0.27],'Rough plain-weave linen. Source is blue; base colour recoloured to natural flax (sRGB ~190,176,152) keeping the luminance/weave pattern. Neutral enough to tint via material.color.'),
 'wool':(ph('curly_teddy_natural'),[0.336,0.331],'Curly looped teddy/boucle pile (source 2048x2018 resampled to square, so tile_m is not exactly square). Colour desaturated 40% from peach-beige to oatmeal (sRGB ~225,212,198). Use MeshPhysicalMaterial sheen ~0.5 for fabric look.'),
 'blacksteel':(acg('Metal046A'),[1.0,1.0],'Dark mottled blackened steel (procedural, no physical scale given; 1 m nominal). Metal = 1. Base colour darkened x0.62 (sRGB ~57) and roughness remapped 0.28+0.75*r (mean 0.43) for a blackened, less polished look.'),
 'roofmetal':(ph('corrugated_iron'),[1.12,1.12],'Weathered galvanised corrugated sheet; ribs vertical in image, 15 ribs per tile (76 mm pitch). Metal ~1 from source metal map, rough mean 0.70. Corrugation is normal-map only (geometry flat).'),
 'rooftiles':(ph('clay_roof_tiles_03'),[2.6,2.6],'Old weathered red plain clay tiles (Biberschwanz-like), courses horizontal in image (~16 cm gauge), eaves direction = image bottom.'),
 'plaster_ext':(ph('painted_plaster_wall'),[2.0,2.0],'Slightly discoloured light grey exterior render with worn patches. Tint material.color toward ochre for variety between village houses.'),
 'bark':(ph('tree_bark_03'),[1.0,1.0],'Old deciduous (oak-like) bark with deep vertical fissures and green lichen streaks; fissures run vertically in image (map v along trunk). Strong AO (mean 0.54).'),
}
out={}
for name,(src,tile,notes) in M.items():
    s,i,u=src
    st=stats.get(name,{})
    dl=[]
    if s=='Poly Haven':
        info=json.load(open(f'{DL}/ph_{i}_2k/info.json')) if os.path.exists(f'{DL}/ph_{i}_2k/info.json') else None
        if info: dl=[v for k,v in info['files'].items() if k.endswith('_url') and k[:-4] in ('col','nrm','orm')]
        if name=='char': dl=['https://dl.polyhaven.org/file/ph-assets/Textures/png/2k/mud_cracked_dry_03/mud_cracked_dry_03_disp_2k.png','https://dl.polyhaven.org/file/ph-assets/Textures/jpg/1k/mud_cracked_dry_03/mud_cracked_dry_03_diff_1k.jpg']
    elif s=='ambientCG':
        info=json.load(open(f'{DL}/acg_{i}_2k/info.json')); dl=[info['files']['zip_url']]
    e={'source':s,'asset_id':i,'url':u,'license':'CC0','tile_m':tile,'notes':notes,
       'files':{'col':f'{name}_col.jpg','nrm':f'{name}_nrm.jpg','orm':f'{name}_orm.jpg'},'downloaded_from':dl}
    if st: e['stats']={'roughness_mean':round(st['rough_mean'],2),'ao_mean':round(st['ao_mean'],2),'metal_mean':round(st['metal_mean'],2),'col_mean_srgb':st['col_mean_srgb']}
    out[name]=e
out['char']['stats']={'roughness_mean':0.69,'ao_mean':0.86,'metal_mean':0.0,'col_mean_srgb':[32.0,30.3,28.9]}
meta={'_format':'1024x1024 JPEG. *_col sRGB base colour (q85). *_nrm tangent-space normal, OpenGL convention (+Y up, three.js default; q90, renormalised after 2K->1K Lanczos downscale). *_orm R=ambient occlusion, G=roughness, B=metalness (q90; heavy ground maps q85-86). Sources downscaled from 2K. In three.js assign the same ORM texture to aoMap, roughnessMap and metalnessMap (they read R, G, B respectively; r169 aoMap uses texture.channel, default UV 0, no uv2 needed). Set colorSpace=SRGBColorSpace on *_col only. tile_m = real-world size of one 0..1 UV repeat [u,v] in metres.'}
json.dump({**meta,**out},open(O+'/manifest.json','w'),indent=1)
print(len(out),'entries')
