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
    a = ap.parse_args()
    imgs = sorted(f for f in glob.glob(os.path.join(a.src, '*_*.*')) if f.rsplit('.', 1)[-1] in ('webp', 'jpg', 'png'))
    imgs = [f for f in imgs if os.path.basename(f).rsplit('.', 1)[0].rsplit('_', 1)[-1] in RECIPES]
    if a.only:
        keep = set(a.only.split(','))
        imgs = [f for f in imgs if os.path.basename(f).rsplit('.', 1)[0].rsplit('_', 1)[0] in keep]
    if not imgs: sys.exit('no images in ' + a.src)
    os.makedirs(a.out, exist_ok=True)
    prev = {}
    if a.prev and os.path.exists(os.path.join(a.prev, 'tex2.json')):
        try: prev = json.load(open(os.path.join(a.prev, 'tex2.json'))).get('files', {})
        except Exception as e: print('prev manifest unreadable:', e)
    man = {'v': 1, 'ktx': KTX_VERSION, 'made': time.strftime('%Y-%m-%d %H:%M'), 'files': {}}
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
    man['files'] = dict(sorted(man['files'].items()))
    json.dump(man, open(os.path.join(a.out, 'tex2.json'), 'w'), indent=1)
    full = sum(e['size'][0] for e in man['files'].values()); half = sum(e['size'][1] for e in man['files'].values())
    src = sum(e['bytes'] for e in man['files'].values())
    print(f'tex2: {len(man["files"])} textures, full {full / 1e6:.1f} MB, half {half / 1e6:.1f} MB (images {src / 1e6:.1f} MB), {round(time.time() - t0)} s'
          + (f', FAILED {len(fails)}: {", ".join(fails)}' if fails else ''))
    sys.exit(1 if fails else 0)


if __name__ == '__main__':
    main()
