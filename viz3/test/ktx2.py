# GPU-compressed textures (KTX2/Basis, docs/features/texturen.md): the model loaded twice on the desktop – as published (KTX2 where tex2/
# has the file) and with ?tex2=0 (the images, as before) – then once in an iPhone-13 context (half-size files). Checks: KTX2 used for the
# tex/ textures, nothing fell back to an image, the same shader programs (a compressed texture must not change a material's program),
# the same pictures at five views (garden, pavilion, interior, village, forest: mean difference small, no strongly changed areas – a texture
# upside down, with wrong colours or missing would show), half-size base levels on the phone, no page errors. Prints load times and the
# graphics memory of the tex/ textures (compressed bytes vs RGBA with mipmaps). Without tex2/ in the build only the fallback is checked.
# Pictures: out/ktx2/<view>_k2.png, <view>_img.png and <view>_diff.png (difference ×4).
#   python3 viz3/test/ktx2.py 8985        (~4 min on GitHub, ~10 min here)
import sys, os, json, time, base64
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__))); import lib
port = sys.argv[1]; OUT = lib.out('ktx2'); ck = lib.Checks('ktx2')
VIEWS = [('garten', "GAME.view(-14, 10, 1.7, 205, -4, 62)"),
         ('pavillon', "GAME.orbit(-35, 16, 24)"),
         ('innen', "GAME.go('bibliothek')"),
         ('dorf', "GAME.view(-14.0, 44.0, 1.7, 300, 1, 60)"),
         ('wald', "GAME.view(-520, -640, ROADS.groundAt(-520, -640) + 1.7, 60, 8, 62)")]
STATE = """JSON.stringify((() => { const T = window.TEX2 || {}, f = T.files ? T.files() : [], tex = f.filter(x => /^tex\\//.test(x.file) && !/\\|i$/.test(x.file));
  const k2 = tex.filter(x => x.k2), img = tex.filter(x => !x.k2 && x.w);
  return { on: !!T.on, why: T.why || '', names: T.names ? T.names.size : 0, n: T.n || 0, fails: T.fails || 0, back: T.back || 0, fmt: T.fmt || {},
    gpu: T.gpu || [], half: !!T.half, drop: T.drop || 0, mb: Math.round((T.mb || 0) * 10) / 10, last: T.last || 0, files: tex.length,
    k2: k2.length, k2mb: Math.round(k2.reduce((s, x) => s + x.mb, 0) * 10) / 10, k2w: [...new Set(k2.map(x => x.w))],
    img: img.length, imgmb: Math.round(img.reduce((s, x) => s + x.w * x.w * 4 * 4 / 3, 0) / 1e5) / 10, imgw: [...new Set(img.map(x => x.w))],
    all: (() => { const seen = new Set(); let c = 0, i = 0, nc = 0, ni = 0; const add = t => { if (!t || !t.isTexture || t.isRenderTargetTexture) return; const s = t.source;
        if (!s || seen.has(s)) return; seen.add(s); const im = s.data; if (!im || !im.width) return;
        if (t.isCompressedTexture && t.mipmaps && t.mipmaps.length && t.mipmaps[0].data) { nc++; c += t.mipmaps.reduce((a, m) => a + m.data.byteLength, 0); }
        else { ni++; i += im.width * im.height * (im.depth || 1) * 4 * (t.generateMipmaps === false ? 1 : 4 / 3); } };
      GAME.scene.traverse(o => { for (const m of o.material ? [].concat(o.material) : []) { for (const k in m) add(m[k]); if (m.uniforms) for (const k in m.uniforms) { const u = m.uniforms[k]; if (u && u.value) [].concat(u.value).forEach(add); } } });
      return { compressed: nc, compressedMB: Math.round(c / 1e5) / 10, images: ni, imagesMB: Math.round(i / 1e5) / 10, totalMB: Math.round((c + i) / 1e5) / 10 }; })(),
    programs: (GAME.R.info.programs || []).length, keys: (GAME.R.info.programs || []).map(p => p.cacheKey).sort(),
    tex: GAME.R.info.memory.textures, prep: window.RENDER ? RENDER.prepMs : null,
    log: (JSON.parse(localStorage.getItem('pav-loadlog') || '{}').steps || []).filter(s => /KTX2|Textur/.test(s[1])).map(s => s[1]) }; })())"""
def visit(query, ctx=None, views=True):
    with lib.browser() as b:
        errs = []
        if ctx:
            pg = b.new_context(**ctx).new_page(); lib.preset(pg, 'schnell')
            pg.on('pageerror', lambda e: errs.append('PAGEERR ' + str(e)))
        else:
            pg = lib.page(b, 900, 560, errs)
        t0 = time.time(); lib.boot(pg, port, query=query); t = round(time.time() - t0)
        st = json.loads(pg.evaluate(STATE)); st['load_s'] = t
        ims = {}
        if views:
            pg.evaluate("document.querySelectorAll('.ov,#doorbtn,#joy,header,#ppanel,#talkbtn,#npcsub,#toast').forEach(e => e.style.visibility = 'hidden')")
            for name, js in VIEWS:
                pg.evaluate(js + "; GAME.step(0.3)"); time.sleep(0.5)
                ims[name] = pg.evaluate("(() => { GAME.shot(); GAME.shot(); return document.querySelector('#stage canvas').toDataURL('image/png'); })()")
            st2 = json.loads(pg.evaluate(STATE)); st['programs_after'] = st2['programs']; st['keys_after'] = st2['keys']
        return st, ims, errs
k2, ik2, ek2 = visit('')
img, iimg, eimg = visit('?tex2=0')
show = lambda s: {k: v for k, v in s.items() if k not in ('keys', 'keys_after')}
print('KTX2  ', json.dumps(show(k2), ensure_ascii=False), flush=True)
print('images', json.dumps(show(img), ensure_ascii=False), flush=True)
have = k2['names'] > 0
ck('?tex2=0: images only (the switch for comparisons)', not img['on'] and img['n'] == 0 and img['k2'] == 0, img['why'])
if not have:
    ck('no tex2/ in this build: the images, nothing broken', not k2['on'] and k2['k2'] == 0 and k2['img'] > 30, k2['why'])
else:
    ck('KTX2 on (transcoder in a worker, a compressed format of this GPU)', k2['on'], f"{k2['why']} gpu {k2['gpu']}")
    ck('the tex/ textures are compressed', k2['k2'] >= 0.9 * k2['files'] and k2['k2'] > 30, f"{k2['k2']} of {k2['files']} ({k2['fmt']}), {k2['img']} images")
    ck('nothing fell back to an image', k2['fails'] == 0 and k2['back'] == 0, f"fails {k2['fails']}, back {k2['back']}")
    ck('graphics memory of the tex/ textures at most a third', k2['k2mb'] + k2['imgmb'] <= img['imgmb'] / 3 + 1,
       f"KTX2 {k2['k2mb']} MB (+ {k2['imgmb']} MB images) vs images {img['imgmb']} MB (RGBA with mipmaps)")
    ck('same shader programs (count and keys)', k2['programs'] == img['programs'] and k2['keys'] == img['keys']
       and k2.get('programs_after') == img.get('programs_after') and k2.get('keys_after') == img.get('keys_after'),
       f"{k2['programs']}/{k2.get('programs_after')} vs {img['programs']}/{img.get('programs_after')}"
       + ('' if k2['keys'] == img['keys'] else ' – keys differ: ' + str(sorted(set(k2['keys']) ^ set(img['keys'])))[:300]))
    ck('full-size base levels on the desktop', k2['k2w'] == [1024], str(k2['k2w']))
    print(f"load: KTX2 {k2['load_s']} s (prepare GPU {k2['prep']} ms) vs images {img['load_s']} s (prepare GPU {img['prep']} ms)", flush=True)
    print(f"graphics memory of all scene textures (estimate): KTX2 {k2['all']} vs images {img['all']}", flush=True)
# the pictures compared in a blank page (canvas pixels; no image library needed on the CI machines): mean difference over RGB, share of
# pixels with a difference > 60 in their mean, and the difference ×4 as a picture
CMP = """async ([a, b]) => { const load = u => new Promise((r, e) => { const i = new Image(); i.onload = () => r(i); i.onerror = e; i.src = u; });
  const [A, B] = await Promise.all([load(a), load(b)]), w = A.width, h = A.height, px = im => { const c = document.createElement('canvas'); c.width = w; c.height = h;
    const x = c.getContext('2d'); x.drawImage(im, 0, 0); return x.getImageData(0, 0, w, h); };
  const p = px(A).data, q = px(B).data, c = document.createElement('canvas'); c.width = w; c.height = h; const x = c.getContext('2d'), D = x.createImageData(w, h);
  let s = 0, big = 0; for (let i = 0; i < p.length; i += 4) { const r = Math.abs(p[i] - q[i]), g = Math.abs(p[i + 1] - q[i + 1]), bl = Math.abs(p[i + 2] - q[i + 2]);
    s += r + g + bl; if ((r + g + bl) / 3 > 60) big++; D.data[i] = Math.min(255, r * 4); D.data[i + 1] = Math.min(255, g * 4); D.data[i + 2] = Math.min(255, bl * 4); D.data[i + 3] = 255; }
  x.putImageData(D, 0, 0); return { mean: s / (p.length / 4) / 3, big: big / (p.length / 4), diff: c.toDataURL('image/png') }; }"""
save = lambda name, url: open(os.path.join(OUT, name + '.png'), 'wb').write(base64.b64decode(url.split(',')[1]))
with lib.browser() as b:
    pc = b.new_page()
    for name, _ in VIEWS:
        save(f'{name}_k2', ik2[name]); save(f'{name}_img', iimg[name])
        r = pc.evaluate(CMP, [ik2[name], iimg[name]]); save(f'{name}_diff', r['diff'])
        ck(f'{name}: the same picture (mean difference, share of strongly changed pixels)', r['mean'] < 5 and r['big'] < 0.02,
           f"mean {r['mean']:.2f}, {r['big'] * 100:.2f} % > 60")
if have:
    from playwright.sync_api import sync_playwright
    with sync_playwright() as p: phone = dict(p.devices['iPhone 13'])
    ph, _, eph = visit('', ctx=phone, views=False)
    ph0, _, eph0 = visit('?tex2=0', ctx=phone, views=False)
    print('phone ', json.dumps(show(ph), ensure_ascii=False), flush=True)
    print(f"phone: loaded in {ph['load_s']} s (prepare GPU {ph['prep']} ms) vs {ph0['load_s']} s ({ph0['prep']} ms) with ?tex2=0; graphics memory of all"
          f" scene textures (estimate): KTX2 {ph['all']} vs images {ph0['all']}", flush=True)
    eph += eph0
    ck('phone: half-size files, compressed', ph['on'] and ph['half'] and ph['k2'] > 30 and ph['k2w'] == [512], f"{ph['k2']} at {ph['k2w']} px, {ph['k2mb']} MB, {ph['fmt']}")
    eimg += eph
ck.errors(ek2 + eimg)
ck.done()
