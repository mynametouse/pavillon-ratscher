# Memory after loading (V16b4): resident memory of the page's renderer and GPU processes (ps), JS heap, and the decoded texture images
# (width × height × 4 per image source, the GPU copy comes on top), grouped by folder, the biggest ones listed. Optional query string.
#   python3 viz3/test/memprof.py 8951 [query]      e.g.  python3 viz3/test/memprof.py 8951 '?tex=half'
import sys, os, json, time, subprocess
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__))); import lib
port = sys.argv[1]; query = sys.argv[2] if len(sys.argv) > 2 else ''
def rss():
    out = subprocess.run(['ps', '-eo', 'rss,args'], capture_output=True, text=True).stdout.split('\n'); r = {}
    for ln in out:
        if 'headless_shell' not in ln: continue
        kb = int(ln.split()[0]); t = 'renderer' if '--type=renderer' in ln else 'gpu' if '--type=gpu-process' in ln else 'browser' if '--type=' not in ln else 'other'
        r[t] = r.get(t, 0) + kb // 1024
    return r
with lib.browser() as b:
    errs = []; pg = lib.page(b, 1000, 640, errs, tier=None); t0 = time.time(); lib.boot(pg, port, query=query); tb = round(time.time() - t0)
    time.sleep(5); pg.evaluate("GAME.step(0.5); GAME.shot()"); time.sleep(3)
    info = json.loads(pg.evaluate("""JSON.stringify((() => { const seen = new Map(), R = GAME.R;
      const add = t => { if (!t || !t.isTexture || t.isRenderTargetTexture) return; const s = t.source || { data: t.image }, im = s.data; if (!im || seen.has(s)) return;
        const w = im.width || 0, h = im.height || 0, d = im.depth || 1, kind = im.constructor ? im.constructor.name : typeof im;
        let name = (im.src || im.currentSrc || '').split('/').slice(-2).join('/') || t.name || kind;
        seen.set(s, { name, w, h, d, mb: w * h * d * 4 / 1e6, kind, up: !!(R.properties.get(t).__webglTexture) }); };
      GAME.scene.traverse(o => { const ms = o.material ? [].concat(o.material) : []; for (const m of ms) { for (const k in m) { const v = m[k]; if (v && v.isTexture) add(v); }
        if (m.uniforms) for (const k in m.uniforms) { const u = m.uniforms[k]; if (u && u.value) [].concat(u.value).forEach(add); } } });
      if (GAME.scene.background && GAME.scene.background.isTexture) add(GAME.scene.background);
      const L = [...seen.values()]; const by = {}; for (const x of L) { const k = x.name.includes('/') ? x.name.split('/')[0] : x.kind; by[k] = (by[k] || 0) + x.mb; }
      return { heap: performance.memory ? Math.round(performance.memory.usedJSHeapSize / 1e6) : null, n: L.length, mb: Math.round(L.reduce((s, x) => s + x.mb, 0)),
        by: Object.fromEntries(Object.entries(by).map(([k, v]) => [k, Math.round(v)]).sort((a, b) => b[1] - a[1])),
        top: L.sort((a, b) => b.mb - a.mb).slice(0, 18).map(x => `${x.mb.toFixed(1)} MB ${x.w}x${x.h}${x.d > 1 ? 'x' + x.d : ''} ${x.kind} ${x.name}${x.up ? '' : ' (not on GPU)'}`),
        geo: Math.round((() => { let s = 0; const g = new Set(); GAME.scene.traverse(o => { if (o.geometry && !g.has(o.geometry)) { g.add(o.geometry); for (const k in o.geometry.attributes) s += o.geometry.attributes[k].array.byteLength; if (o.geometry.index) s += o.geometry.index.array.byteLength; } if (o.isInstancedMesh) s += o.instanceMatrix.array.byteLength; }); return s / 1e6; })()),
        programs: R.info.programs.length, gpuTex: R.info.memory.textures, gpuGeo: R.info.memory.geometries }; })())"""))
    print('loaded in', tb, 's', query, '· processes MB', rss())
    print(json.dumps({k: v for k, v in info.items() if k != 'top'}, ensure_ascii=False))
    for x in info['top']: print('  ', x)
    print('\n'.join([e for e in errs if 'Texture marked' not in e][:5]) or 'no errors')
