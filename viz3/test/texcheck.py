# textures used by materials that are marked for upload but have no image (the "Texture marked for update but no image data found" warnings)
import sys, os, time
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__))); import lib
port = sys.argv[1]
with lib.browser() as b:
    pg = lib.page(b, 800, 500); lib.boot(pg, port, '?nogeo=1')
    print(pg.evaluate("""(() => { const out = {}, seen = new Set();
      GAME.scene.traverse(o => { const ms = o.material ? (Array.isArray(o.material) ? o.material : [o.material]) : []; for (const m of ms) { if (!m || seen.has(m)) continue; seen.add(m);
        for (const k in m) { const t = m[k]; if (t && t.isTexture && !t.isRenderTargetTexture && t.version > 0 && (t.image == null)) { const key = (m.name || m.type) + '.' + k + ' ' + (t.name || '') + ' ' + (o.name || o.parent && o.parent.name || ''); out[key] = (out[key] || 0) + 1; } }
        if (m.uniforms) for (const u in m.uniforms) { const t = m.uniforms[u].value; if (t && t.isTexture && !t.isRenderTargetTexture && t.version > 0 && t.image == null) { const key = 'uniform ' + u + ' ' + (m.type); out[key] = (out[key] || 0) + 1; } } } });
      return JSON.stringify(out, null, 1); })()"""))
