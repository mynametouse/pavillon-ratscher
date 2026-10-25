#!/usr/bin/env python3
"""GPU-compressed copies (KTX2 with Basis Universal) of the site's PBR textures tex/<name>_{col,nrm,orm}.webp|jpg – the app loads them
with three's KTX2Loader instead of the images (core/assets.js, docs/features/texturen.md): transcoded in a worker to BC7/BC1 on desktops,
ASTC/ETC2 on phones, about a quarter of the graphics memory and no image decoding or mipmap generation on the main thread.

  python3 tools/tex/ktx2.py --src <site>/tex --out <dir>/tex2 [--ktx <ktx binary>] [--prev <old tex2>] [--jobs 2] [--only larch,lawn]

Per image two files, both with every mip level:
  tex2/<stem>.ktx2     full size (1024 px) – desktops
  tex2/h/<stem>.ktx2   half size (512 px) – phones and tablets (TEXHALF), a quarter of the download and of the transcoding
Encoding: colour maps ETC1S (BasisLZ: small files, sRGB), normal and ORM maps UASTC (+ RDO, Zstandard; linear) – ETC1S makes normal maps
blocky. Images are flipped (texture origin bottom-left) so that a KTX2 texture (flipY impossible) looks exactly like the image texture
(flipY = true). Mipmaps are filtered with wrap-around (the textures tile).
tex2/tex2.json lists every source image with its size and SHA-1 – the build (viz3/buildlib/assets.py tex2_manifest) uses a KTX2 file only
while it belongs to the current image in tex/; with --prev, unchanged images (same source, same recipe) are copied instead of re-encoded.
With --gltf <site>/models,<site>/grass,<site>/chars also the images inside the glTF models (data URIs): tex2/g/<key>.ktx2 (+ g/h/), the key
made from the image's base64 text (gkey – the same function as core/assets.js), so the page finds the file from the image alone; not
flipped (glTF textures are not), mipmaps clamped at the edges (texture atlases), alpha kept; the role (colour, normal, ORM) from the
materials that use the image. Images whose size is not a multiple of 4 stay images.
The ktx tool: KTX-Software (github.com/KhronosGroup/KTX-Software, release Linux-x86_64; .github/workflows/texturen-ktx2.yml fetches it).
"""
import argparse, concurrent.futures as cf, glob, hashlib, json, os, shutil, subprocess, sys, tempfile, time

KTX_VERSION = '4.4.2'
# encoder settings per channel (changing a recipe re-encodes the images of that channel on the next run)
COMMON = ['--generate-mipmap', '--mipmap-wrap', 'wrap', '--convert-texcoord-origin', 'bottom-left']
RECIPES = {
    'col': ['--format', 'R8G8B8_SRGB', '--assign-tf', 'srgb', '--encode', 'basis-lz', '--clevel', '4', '--qlevel', '255'],
    'nrm': ['--format', 'R8G8B8_UNORM', '--assign-tf', 'linear', '--encode', 'uastc', '--uastc-quality', '2', '--uastc-rdo', '--uastc-rdo-l', '0.75', '--zstd', '18'],
    'orm': ['--format', 'R8G8B8_UNORM', '--assign-tf', 'linear', '--encode', 'uastc', '--uastc-quality', '2', '--uastc-rdo', '--uastc-rdo-l', '1.5', '--zstd', '18'],
}
SIZES = {'': None, 'h/': 0.5}   # output subfolder → scale of the base level
# glTF images: the same encoders, no flip, clamped mipmaps; RGBA where the image has alpha
G_COMMON = ['--generate-mipmap', '--mipmap-wrap', 'clamp']
G_RECIPES = {
    'col': ['--assign-tf', 'srgb', '--encode', 'basis-lz', '--clevel', '4', '--qlevel', '255'],
    'nrm': ['--assign-tf', 'linear', '--encode', 'uastc', '--uastc-quality', '2', '--uastc-rdo', '--uastc-rdo-l', '0.75', '--zstd', '18'],
    'orm': ['--assign-tf', 'linear', '--encode', 'uastc', '--uastc-quality', '2', '--uastc-rdo', '--uastc-rdo-l', '1.5', '--zstd', '18'],
}
G_FORMAT = {('col', False): 'R8G8B8_SRGB', ('col', True): 'R8G8B8A8_SRGB', ('nrm', False): 'R8G8B8_UNORM', ('nrm', True): 'R8G8B8A8_UNORM',
            ('orm', False): 'R8G8B8_UNORM', ('orm', True): 'R8G8B8A8_UNORM'}


def gkey(uri):
    """key of a data-URI image: length of its base64 text and FNV-1a over 4096 evenly spaced characters (core/assets.js gkey)"""
    p = uri[uri.index(',') + 1:]; n = len(p); step = max(1, n // 4096); h = 0x811c9dc5
    for i in range(0, n, step): h = ((h ^ ord(p[i])) * 16777619) & 0xffffffff
    return f'{n:x}{h:08x}'


def g_recipe_id(role, alpha):
    return hashlib.sha1(json.dumps([KTX_VERSION, G_COMMON, G_RECIPES[role], G_FORMAT[(role, alpha)], SIZES], sort_keys=True).encode()).hexdigest()[:12]


def gltf_images(dirs):
    """every data-URI image of the glTF JSON files in dirs: {key: {'src': 'models/x.glb.json#3', 'uri': …, 'role': col|nrm|orm}}"""
    out = {}
    for d in dirs:
        for f in sorted(glob.glob(os.path.join(d, '*.json'))):
            try: js = json.load(open(f))
            except Exception: continue
            if not isinstance(js, dict) or not js.get('images'): continue
            src = {}
            for ti, t in enumerate(js.get('textures', [])):
                s0 = t.get('source')
                for e in (t.get('extensions') or {}).values():
                    if isinstance(e, dict) and 'source' in e: s0 = e['source']
                src[ti] = s0
            use = {}
            def mark(ref, role):
                if isinstance(ref, dict) and ref.get('index') in src: use.setdefault(src[ref['index']], set()).add(role)
            for m in js.get('materials', []):
                pbr = m.get('pbrMetallicRoughness', {})
                mark(pbr.get('baseColorTexture'), 'col'); mark(m.get('emissiveTexture'), 'col')
                mark(pbr.get('metallicRoughnessTexture'), 'orm'); mark(m.get('occlusionTexture'), 'orm'); mark(m.get('normalTexture'), 'nrm')
            for ii, im in enumerate(js['images']):
                u = im.get('uri') or ''
                if not u.startswith('data:image/'): continue
                k = gkey(u); r = use.get(ii, {'col'})
                role = 'nrm' if 'nrm' in r else 'orm' if 'orm' in r else 'col'
                if k not in out: out[k] = {'src': os.path.basename(d.rstrip('/')) + '/' + os.path.basename(f) + '#' + str(ii), 'uri': u, 'role': role}
    return out


def encode_g(ktx, key, e, out, tmp, threads):
    """one glTF image → tex2/g/<key>.ktx2 (and g/h/ from 256 px up); returns (sizes, info) or None when it stays an image"""
    import base64, io
    from PIL import Image
    im = Image.open(io.BytesIO(base64.b64decode(e['uri'][e['uri'].index(',') + 1:])))
    w, h = im.size
    if w % 4 or h % 4 or min(w, h) < 16: return None
    alpha = im.mode in ('RGBA', 'LA', 'PA') or (im.mode == 'P' and 'transparency' in im.info)
    im = im.convert('RGBA' if alpha else 'RGB')
    if alpha and im.getextrema()[3][0] == 255: alpha = False; im = im.convert('RGB')
    png = os.path.join(tmp, key + '.png'); im.save(png, compress_level=1)
    sizes = {}
    for sub, scale in SIZES.items():
        if scale and max(w, h) < 256: continue
        dst = os.path.join(out, 'g', sub + key + '.ktx2'); os.makedirs(os.path.dirname(dst), exist_ok=True)
        cmd = [ktx, 'create', '--format', G_FORMAT[(e['role'], alpha)]] + G_RECIPES[e['role']] + G_COMMON + (['--scale', str(scale)] if scale else []) + ['--threads', str(threads), png, dst + '.part']
        r = subprocess.run(cmd, capture_output=True, text=True)
        if r.returncode or not os.path.exists(dst + '.part'):
            raise RuntimeError(f'{e["src"]} ({key}{" " + sub if sub else ""}): ktx create failed: {(r.stderr or r.stdout)[-400:]}')
        os.replace(dst + '.part', dst); sizes[sub] = os.path.getsize(dst)
    os.remove(png)
    return sizes, {'w': w, 'h': h, 'alpha': alpha}


def sha1(p):
    h = hashlib.sha1()
    with open(p, 'rb') as f:
        for b in iter(lambda: f.read(1 << 20), b''): h.update(b)
    return h.hexdigest()


def recipe_id(ch):
    return hashlib.sha1(json.dumps([KTX_VERSION, COMMON, RECIPES[ch], SIZES], sort_keys=True).encode()).hexdigest()[:12]


def encode(ktx, src, stem, ch, out, tmp, threads):
    """one source image → tex2/<stem>.ktx2 and tex2/h/<stem>.ktx2; returns {'': bytes, 'h/': bytes}"""
    from PIL import Image
    png = os.path.join(tmp, stem + '.png')
    Image.open(src).convert('RGB').save(png, compress_level=1)   # ktx reads PNG, not WebP/JPEG
    sizes = {}
    for sub, scale in SIZES.items():
        dst = os.path.join(out, sub + stem + '.ktx2'); os.makedirs(os.path.dirname(dst), exist_ok=True)
        cmd = [ktx, 'create'] + RECIPES[ch] + COMMON + (['--scale', str(scale)] if scale else []) + ['--threads', str(threads), png, dst + '.part']
        r = subprocess.run(cmd, capture_output=True, text=True)
        if r.returncode or not os.path.exists(dst + '.part'):
            raise RuntimeError(f'{stem}{" (" + sub + ")" if sub else ""}: ktx create failed: {(r.stderr or r.stdout)[-400:]}')
        os.replace(dst + '.part', dst); sizes[sub] = os.path.getsize(dst)
    os.remove(png)
    return sizes


def main():
    ap = argparse.ArgumentParser(description=__doc__.split('\n')[0])
    ap.add_argument('--src', required=True, help='folder with the images (the site\'s tex/)')
    ap.add_argument('--out', required=True, help='output folder (becomes tex2/ on the site)')
    ap.add_argument('--ktx', default=shutil.which('ktx') or 'ktx', help='KTX-Software ktx tool')
    ap.add_argument('--prev', help='the published tex2/ – unchanged images are copied from there')
    ap.add_argument('--jobs', type=int, default=2, help='images encoded at the same time')
    ap.add_argument('--only', help='comma-separated texture names (larch,lawn) – for trying settings')
    ap.add_argument('--gltf', help='comma-separated folders with glTF JSON files (models,grass,chars of the site) – their images too')
    a = ap.parse_args()
    imgs = sorted(f for f in glob.glob(os.path.join(a.src, '*_*.*')) if f.rsplit('.', 1)[-1] in ('webp', 'jpg', 'png'))
    imgs = [f for f in imgs if os.path.basename(f).rsplit('.', 1)[0].rsplit('_', 1)[-1] in RECIPES]
    if a.only:
        keep = set(a.only.split(','))
        imgs = [f for f in imgs if os.path.basename(f).rsplit('.', 1)[0].rsplit('_', 1)[0] in keep]
    if not imgs: sys.exit('no images in ' + a.src)
    os.makedirs(a.out, exist_ok=True)
    prev = {}; gprev = {}
    if a.prev and os.path.exists(os.path.join(a.prev, 'tex2.json')):
        try:
            pm = json.load(open(os.path.join(a.prev, 'tex2.json'))); prev = pm.get('files', {}); gprev = pm.get('gltf', {})
        except Exception as e: print('prev manifest unreadable:', e)
    man = {'v': 1, 'ktx': KTX_VERSION, 'made': time.strftime('%Y-%m-%d %H:%M'), 'files': {}, 'gltf': {}}
    threads = max(1, (os.cpu_count() or 2) // max(1, a.jobs))
    t0 = time.time(); todo = []
    for f in imgs:
        b = os.path.basename(f); stem, ext = b.rsplit('.', 1); ch = stem.rsplit('_', 1)[1]
        e = {'src': b, 'bytes': os.path.getsize(f), 'sha1': sha1(f), 'enc': 'etc1s' if ch == 'col' else 'uastc', 'recipe': recipe_id(ch)}
        p = prev.get(stem)
        if p and all(p.get(k) == e[k] for k in ('src', 'sha1', 'recipe')) and all(os.path.exists(os.path.join(a.prev, s + stem + '.ktx2')) for s in SIZES):
            for s in SIZES:
                os.makedirs(os.path.join(a.out, s), exist_ok=True); shutil.copy2(os.path.join(a.prev, s + stem + '.ktx2'), os.path.join(a.out, s + stem + '.ktx2'))
            e['size'] = p['size']; man['files'][stem] = e
        else:
            todo.append((f, stem, ch, e))
    print(f'{len(imgs)} images: {len(imgs) - len(todo)} unchanged (copied), {len(todo)} to encode with {a.jobs} jobs × {threads} threads', flush=True)
    fails = []
    with tempfile.TemporaryDirectory() as tmp, cf.ThreadPoolExecutor(a.jobs) as ex:
        futs = {ex.submit(encode, a.ktx, f, stem, ch, a.out, tmp, threads): (stem, e) for f, stem, ch, e in todo}
        for i, fu in enumerate(cf.as_completed(futs), 1):
            stem, e = futs[fu]
            try:
                sz = fu.result(); e['size'] = [sz[''], sz['h/']]; man['files'][stem] = e
                print(f'[{i}/{len(todo)}] {stem}: {e["bytes"] // 1024} KB → {sz[""] // 1024} KB (half {sz["h/"] // 1024} KB) {round(time.time() - t0)} s', flush=True)
            except Exception as err:
                fails.append(stem); print(f'[{i}/{len(todo)}] FAIL {err}', flush=True)
    if a.gltf:
        G = gltf_images([d for d in a.gltf.split(',') if d])
        gtodo = []
        for k, e in G.items():
            p = gprev.get(k)
            if p and p.get('role') == e['role'] and p.get('recipe') == g_recipe_id(e['role'], p.get('alpha', False)) and all(
                    os.path.exists(os.path.join(a.prev, 'g', s + k + '.ktx2')) for s, sc in SIZES.items() if not (sc and max(p['w'], p['h']) < 256)):
                for s, sc in SIZES.items():
                    if sc and max(p['w'], p['h']) < 256: continue
                    os.makedirs(os.path.join(a.out, 'g', s), exist_ok=True); shutil.copy2(os.path.join(a.prev, 'g', s + k + '.ktx2'), os.path.join(a.out, 'g', s + k + '.ktx2'))
                man['gltf'][k] = p
            else: gtodo.append(k)
        print(f'glTF images: {len(G)} (by content), {len(G) - len(gtodo)} unchanged (copied), {len(gtodo)} to encode', flush=True)
        with tempfile.TemporaryDirectory() as tmp, cf.ThreadPoolExecutor(a.jobs) as ex:
            futs = {ex.submit(encode_g, a.ktx, k, G[k], a.out, tmp, threads): k for k in gtodo}
            for i, fu in enumerate(cf.as_completed(futs), 1):
                k = futs[fu]; e = G[k]
                try:
                    r = fu.result()
                    if r is None: print(f'[g {i}/{len(gtodo)}] {e["src"]}: stays an image (size)', flush=True); continue
                    sz, info = r
                    man['gltf'][k] = {'src': e['src'], 'role': e['role'], **info, 'recipe': g_recipe_id(e['role'], info['alpha']), 'size': [sz[''], sz.get('h/', 0)]}
                    print(f'[g {i}/{len(gtodo)}] {e["src"]} {e["role"]} {info["w"]}x{info["h"]}{" alpha" if info["alpha"] else ""}: {sz[""] // 1024} KB (half {sz.get("h/", 0) // 1024} KB) {round(time.time() - t0)} s', flush=True)
                except Exception as err:
                    fails.append(k); print(f'[g {i}/{len(gtodo)}] FAIL {err}', flush=True)
        man['gltf'] = dict(sorted(man['gltf'].items()))
        gf = sum(e['size'][0] for e in man['gltf'].values()); gh = sum(e['size'][1] for e in man['gltf'].values())
        print(f'tex2/g: {len(man["gltf"])} glTF images, full {gf / 1e6:.1f} MB, half {gh / 1e6:.1f} MB', flush=True)
    man['files'] = dict(sorted(man['files'].items()))
    json.dump(man, open(os.path.join(a.out, 'tex2.json'), 'w'), indent=1)
    full = sum(e['size'][0] for e in man['files'].values()); half = sum(e['size'][1] for e in man['files'].values())
    src = sum(e['bytes'] for e in man['files'].values())
    print(f'tex2: {len(man["files"])} textures, full {full / 1e6:.1f} MB, half {half / 1e6:.1f} MB (images {src / 1e6:.1f} MB), {round(time.time() - t0)} s'
          + (f', FAILED {len(fails)}: {", ".join(fails)}' if fails else ''))
    sys.exit(1 if fails else 0)


if __name__ == '__main__':
    main()
