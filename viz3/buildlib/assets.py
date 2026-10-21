"""Assets of a full build: copy and optimise textures, HDRIs, models, sounds, skies, figures, GI and SV volumes, panoramas and the geodata
from the originals (PAV_ASSETS, default <repo>/assets; <repo>/geo/out/pub; viz3/public; viz3/opt) into dist/, and compute the manifests the
page receives inline (window.TEXMAN … window.GEOMAN). Only a full build needs the originals; the result is stored in manifests.json, so a
fast build (or a new session with only the published site) can do without them (see build.py)."""
import json, os, re, shutil, glob, math

def collect(H, SP, A, D):
    def sync(src, dst, pats):
        if not os.path.isdir(src): return 0
        os.makedirs(dst, exist_ok=True); n = 0
        for p in pats:
            for f in glob.glob(os.path.join(src, p)):
                t = os.path.join(dst, os.path.basename(f))
                if not os.path.exists(t) or os.path.getmtime(t) < os.path.getmtime(f) or os.path.getsize(t) != os.path.getsize(f): shutil.copy2(f, t)
                n += 1
        return n
    OPT = os.path.join(H, 'opt')   # output of optimize_assets.mjs (meshopt models with separate WebP images, WebP textures)
    sync(os.path.join(A, 'tex'), os.path.join(D, 'tex'), ['*_col.jpg', '*_nrm.jpg', '*_orm.jpg'])   # (jpgs replaced by WebP are removed again below)
    # textures: use the WebP version only where it is clearly smaller (noisy normal/roughness maps compress better as JPEG)
    TEXEXT = {}
    for f in glob.glob(os.path.join(D, 'tex', '*.jpg')):
        b = os.path.basename(f)[:-4]; w = os.path.join(OPT, 'tex', b + '.webp'); dw = os.path.join(D, 'tex', b + '.webp')
        if os.path.exists(w) and os.path.getsize(w) < 0.85 * os.path.getsize(f): shutil.copy2(w, dw); TEXEXT[b] = 'webp'
        elif os.path.exists(dw): os.remove(dw)
    for b, e in TEXEXT.items():
        if e == 'webp' and os.path.exists(os.path.join(D, 'tex', b + '.jpg')): os.remove(os.path.join(D, 'tex', b + '.jpg'))
    import base64, struct
    def hdr_to_json(src, dst):
        if os.path.exists(dst) and os.path.getmtime(dst) >= os.path.getmtime(src): return
        open(dst, 'w').write(json.dumps({'b64': base64.b64encode(open(src, 'rb').read()).decode()}))
    def glb_to_json(src, dst):
        if os.path.exists(dst) and os.path.getmtime(dst) >= os.path.getmtime(src): return
        b = open(src, 'rb').read(); assert b[:4] == b'glTF'
        L = struct.unpack('<I', b[12:16])[0]; js = json.loads(b[20:20 + L]); off = 20 + L
        binL = struct.unpack('<I', b[off:off + 4])[0]; assert b[off + 4:off + 8] == b'BIN\0'; bin0 = b[off + 8:off + 8 + binL]
        js['buffers'][0]['uri'] = 'data:application/octet-stream;base64,' + base64.b64encode(bin0).decode()
        open(dst, 'w').write(json.dumps(js, separators=(',', ':')))
    os.makedirs(os.path.join(D, 'hdri'), exist_ok=True)
    for f in glob.glob(os.path.join(A, 'hdri', '*_1k.hdr')): hdr_to_json(f, os.path.join(D, 'hdri', os.path.basename(f) + '.json'))
    sync(os.path.join(H, 'public', 'tree'), os.path.join(D, 'tree'), ['*.jpg', '*.png'])
    os.makedirs(os.path.join(D, 'grass'), exist_ok=True)
    def opt_or_json(src, dstdir):
        b = os.path.basename(src); stem = b[:-4]
        for sub in ('models', 'grass'):
            oj = os.path.join(OPT, sub, b + '.json')
            if os.path.exists(oj) and os.path.getmtime(oj) >= os.path.getmtime(src) - 1:
                shutil.copy2(oj, os.path.join(dstdir, b + '.json'))
                for im in glob.glob(os.path.join(OPT, sub, stem + '__*')): shutil.copy2(im, os.path.join(dstdir, os.path.basename(im)))
                return 'opt'
        glb_to_json(src, os.path.join(dstdir, b + '.json')); return 'raw'
    for f in glob.glob(os.path.join(H, 'public', 'grass', '*.glb')): opt_or_json(f, os.path.join(D, 'grass'))
    sync(os.path.join(A, 'snd'), os.path.join(D, 'snd'), ['*.mp3', '*.m4a', '*.ogg'])
    sync(os.path.join(A, 'sky'), os.path.join(D, 'sky'), ['*.jpg'])   # photographic skies (tools/mksky.py)
    # rigged people and goats (gt/chars.mjs, chars/rt.html): glTF JSON with meshopt geometry + WebP images, animation clips
    sync(os.path.join(A, 'chars'), os.path.join(D, 'chars'), ['*.json', '*.webp'])
    charman = {k: k + '.json' for k in ('hubert', 'ronald', 'goat', 'clips')} if all(os.path.exists(os.path.join(D, 'chars', k + '.json')) for k in ('hubert', 'ronald', 'goat', 'clips')) else None
    if charman and os.path.exists(os.path.join(D, 'chars', 'tractor.json')): charman['tractor'] = 'tractor.json'
    # V15 player figures (man, woman) and their animation clips (chars/player.py): only the files that exist
    for _old in ('pclips.json',):
        if os.path.exists(os.path.join(D, 'chars', _old)): os.remove(os.path.join(D, 'chars', _old))
    playerman = {k: k + '.json' for k in ('player_m', 'player_f', 'pclips_m', 'pclips_f') if os.path.exists(os.path.join(D, 'chars', k + '.json'))} or None
    if playerman and not any(k.startswith('pclips_') for k in playerman): playerman = None
    try: skyman = json.load(open(os.path.join(A, 'sky', 'manifest.json')))
    except Exception: skyman = {}
    sync(os.path.join(A, 'snd', 'voice'), os.path.join(D, 'snd', 'voice'), ['*.mp3'])
    # published plan of the owner (website repo, written by the page's "Für alle veröffentlichen"); a placeholder when none exists yet, so the page finds a file
    _plan_src = os.environ.get('PLAN_JSON', '/home/claude/pavillon-ratscher/plan.json')
    if os.path.exists(_plan_src): shutil.copy2(_plan_src, os.path.join(D, 'plan.json'))
    else: open(os.path.join(D, 'plan.json'), 'w').write('{"v": 0}\n')
    for _sv in ('sv.png', 'sv_b.png'):
        if os.path.exists(os.path.join(H, 'public', _sv)): shutil.copy2(os.path.join(H, 'public', _sv), os.path.join(D, _sv))
    # baked global illumination (test/gi.py): atlases per variant and light mode
    sync(os.path.join(H, 'public', 'gi'), os.path.join(D, 'gi'), ['*.png'])
    def _giman(v):
        f = os.path.join(H, 'public', 'gi', 'gi_' + v + '.json')
        if not os.path.exists(f): return None
        m = json.load(open(f)); m['modes'] = {k: e for k, e in m.get('modes', {}).items() if os.path.exists(os.path.join(D, e['a'])) and os.path.exists(os.path.join(D, e['b']))}
        return m if m['modes'] else None
    giman_a, giman_b = _giman('a'), _giman('b')
    # 360° panoramas (rendered by test/pano.py): only the ones whose image exists
    PANOD = os.path.join(H, 'public', 'pano'); panoman = {}
    if os.path.exists(os.path.join(PANOD, 'pano.json')):
        for _v, _l in json.load(open(os.path.join(PANOD, 'pano.json'))).items():
            panoman[_v] = [e for e in _l if os.path.exists(os.path.join(H, 'public', e['file']))]
        sync(PANOD, os.path.join(D, 'pano'), ['*.jpg'])
    # ---- manifests ----
    ROT = {'larch': math.pi / 2}
    tm = {}
    try:
        for k, v in json.load(open(os.path.join(A, 'tex', 'manifest.json'))).items():
            if isinstance(v, dict) and (os.path.exists(os.path.join(D, 'tex', k + '_col.jpg')) or os.path.exists(os.path.join(D, 'tex', k + '_col.webp'))):
                tm[k] = {'tile': v.get('tile_m', [1, 1]), 'rot': ROT.get(k, 0), 'ext': {c: TEXEXT.get(k + '_' + c, 'jpg') for c in ('col', 'nrm', 'orm')}}
    except Exception as e: print('tex manifest', e)
    hm = {}
    try:
        for k, v in json.load(open(os.path.join(A, 'hdri', 'manifest.json'))).items():
            if isinstance(v, dict) and 'sun_u' in v: hm[k] = {'file': v['files']['1k'] + '.json', 'sun_u': v['sun_u']}
    except Exception as e: print('hdri manifest', e)
    mm = {}
    try:
        man = json.load(open(os.path.join(A, 'models', 'manifest.json')))
        items = man.get('assets', []) if isinstance(man, dict) else man
        alias = json.load(open(os.path.join(H, 'model_alias.json'))) if os.path.exists(os.path.join(H, 'model_alias.json')) else {}
        byid = {it.get('id'): it for it in items if isinstance(it, dict)}
        for slot, a in alias.items():
            it = byid.get(a['id']);
            if it and os.path.exists(os.path.join(A, 'models', it['file'])): mm[slot] = {'file': it['file'], 'bbox': it.get('bbox_size'), 'bmin': it.get('bbox_min'), 'front': a.get('front', 0), 'nodes': [{'name': n['name'], 'origin': n.get('origin', [0, 0, 0]), 'bmin': n.get('bbox_min'), 'bmax': n.get('bbox_max')} for n in (it.get('nodes') or [])]}
    except Exception as e: print('model manifest', e)
    sm = []
    try:
        for it in json.load(open(os.path.join(A, 'snd', 'manifest.json'))):
            f = it['file']; kind = re.sub(r'_\d+$', '', os.path.splitext(f)[0])
            if os.path.exists(os.path.join(D, 'snd', f)): sm.append({'file': f, 'kind': kind, 'loop': int(it.get('loop_samples') or 0), 'lic': it.get('license', ''), 'by': it.get('author', ''), 'src': it.get('source_url', '')})
    except Exception as e: print('snd manifest', e)
    vm = {'lines': [], 'topics': {}}
    try:
        vj = json.load(open(os.path.join(A, 'snd', 'voice', 'voices.json')))
        vm = {'lines': [{'file': l['file'], 'who': l['who'], 'id': l['id'], 'text': l['text'], 'dur': l['dur']} for l in vj['lines'] if os.path.exists(os.path.join(D, 'snd', l['file']))], 'topics': vj['topics']}
    except Exception as e: print('voice manifest', e)
    # records for the record player (public-domain recordings from Wikimedia Commons, see scripts/commons_dl.py and music/make.py): snd/music/*.mp3
    musicman = []
    try:
        _md = os.path.join(A, 'snd', 'music')
        if os.path.exists(os.path.join(_md, 'music.json')):
            musicman = [m for m in json.load(open(os.path.join(_md, 'music.json'))) if os.path.exists(os.path.join(_md, m['file']))]
            sync(_md, os.path.join(D, 'snd', 'music'), ['*.mp3'])
    except Exception as e: print('music manifest', e)
    # real surroundings of Ratscher (scratchpad geo/: terrain, orthophotos, OSM map, buildings, trees) → dist/geo, manifest inline
    geoman = None
    try:
        _gp = os.path.join(SP, 'geo', 'out', 'pub')
        if os.path.exists(os.path.join(_gp, 'geo.json')) and os.environ.get('NOGEO') != '1':
            geoman = json.load(open(os.path.join(_gp, 'geo.json')))
            sync(_gp, os.path.join(D, 'geo'), ['*.jpg', '*.b64.json'])
            for _f in glob.glob(os.path.join(D, 'geo', '*.bin')): os.remove(_f)
    except Exception as e: print('geo', e)
    os.makedirs(os.path.join(D, 'models'), exist_ok=True)
    used = {v['file'] for v in mm.values()}
    json.dump(sorted(used), open(os.path.join(H, 'used_models.json'), 'w'))
    for f in glob.glob(os.path.join(D, 'models', '*')):
        bn = os.path.basename(f)
        if bn.replace('.json', '') not in used and not any(bn.startswith(u[:-4] + '__') for u in used): os.remove(f)
    nopt = sum(opt_or_json(os.path.join(A, 'models', f), os.path.join(D, 'models')) == 'opt' for f in used)
    print('models optimised', nopt, 'of', len(used))
    for v in mm.values(): v['file'] = v['file'] + '.json'
    svm = json.load(open(os.path.join(H, 'public', 'sv.json'))) if os.path.exists(os.path.join(H, 'public', 'sv.json')) and os.path.exists(os.path.join(D, 'sv.png')) else None
    svmb = json.load(open(os.path.join(H, 'public', 'sv_b.json'))) if os.path.exists(os.path.join(H, 'public', 'sv_b.json')) and os.path.exists(os.path.join(D, 'sv_b.png')) else None
    return {'tm': tm, 'hm': hm, 'mm': mm, 'sm': sm, 'svm': svm, 'svmb': svmb, 'vm': vm, 'panoman': panoman, 'skyman': skyman, 'charman': charman,
            'playerman': playerman, 'giman_a': giman_a, 'giman_b': giman_b, 'musicman': musicman, 'geoman': geoman}

# fewer files: the images of the glTF models (props, grass, figures) go into their JSON as data URIs – one published version of the
# Claude artifact holds at most 511 files (PACK=0 keeps them separate)
def pack_gltf(dirs):
    import base64
    MT = {'.webp': 'image/webp', '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.ktx2': 'image/ktx2'}
    drop, n = set(), 0
    for dirp in dirs:
        for jf in glob.glob(os.path.join(dirp, '*.json')):
            try: js = json.load(open(jf))
            except Exception: continue
            if not isinstance(js, dict) or 'asset' not in js or not js.get('images'): continue
            ch = False
            for im in js['images']:
                u = im.get('uri')
                if not u or u.startswith('data:'): continue
                p = os.path.join(dirp, u)
                if not os.path.exists(p): continue
                mt = im.get('mimeType') or MT.get(os.path.splitext(p)[1].lower(), 'application/octet-stream')
                im['uri'] = 'data:' + mt + ';base64,' + base64.b64encode(open(p, 'rb').read()).decode(); drop.add(p); ch = True
            if ch: open(jf, 'w').write(json.dumps(js, separators=(',', ':'))); n += 1
    for p in drop: os.remove(p)
    return n, len(drop)
