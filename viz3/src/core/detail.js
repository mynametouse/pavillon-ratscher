// ===================== V16b1 the ground's detail textures as ONE texture array (DETAIL), sampler count check (GLCHECK) =====================
// A fragment shader may use 16 textures on many GPUs (the WebGL 2 minimum: Intel and AMD laptops, Macs, most phones). The near ground
// (garden/env.js) already used 16; V16b's road detail added five more and on such GPUs that shader did not compile – the ground near
// the garden vanished and the sky showed through like a flood (22.10.2026; SwiftShader in the tests allows 32, so it went unnoticed).
// Therefore every tiling detail texture of the ground shaders (lawn, second lawn, gravel, soil, asphalt, needle litter, moss) is one
// layer of this sampler2DArray – one unit for all of them. Layers are filled from the TEXMAN colour textures once they are loaded
// (until then a neutral grey, which the shaders treat as "no detail"). GLCHECK.run() counts the samplers of every compiled program;
// the tests demand ≤ 16 (test/lib.py check_gl), and at run time a GPU below what a program needs switches the ground to its plain
// shading (LITE) instead of losing it.
import * as THREE from 'three';
import { QUALITY, R, scene } from './head.js';
import { ANISO, markDirty, texFile, texFileOf, TEXMAN, whenLoaded } from './assets.js';
export const DETAIL = (() => {
  const NAMES = ['lawn', 'lawn2', 'gravel', 'forestfloor', 'asphalt', 'needles', 'mossfloor'];
  const SZ = QUALITY === 'high' ? 1024 : 512,
    N = NAMES.length,
    S = { names: NAMES, L: {}, size: SZ, ready: false, tile: {} };
  NAMES.forEach((n, i) => {
    S.L[n] = i;
    S.tile[n] = (TEXMAN[n] && TEXMAN[n].tile && TEXMAN[n].tile[0]) || 2;
  });
  const data = new Uint8Array(SZ * SZ * 4 * N);
  for (let i = 0; i < data.length; i += 4) {
    data[i] = data[i + 1] = data[i + 2] = 128;
    data[i + 3] = 255;
  }
  const tex = new THREE.DataArrayTexture(data, SZ, SZ, N);
  tex.format = THREE.RGBAFormat;
  tex.type = THREE.UnsignedByteType;
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.generateMipmaps = true;
  tex.minFilter = THREE.LinearMipmapLinearFilter;
  tex.magFilter = THREE.LinearFilter;
  tex.anisotropy = ANISO;
  tex.needsUpdate = true;
  S.tex = tex;
  S.has = n => !!TEXMAN[n];
  const recs = NAMES.map(n => (TEXMAN[n] ? texFile(texFileOf(n, 'col'), true) : null));
  whenLoaded(() => {
    const cv = document.createElement('canvas');
    cv.width = cv.height = SZ;
    const g = cv.getContext('2d', { willReadFrequently: true });
    let n = 0;
    recs.forEach((rec, i) => {
      const im = rec && rec.tex && rec.tex.image;
      if (!im || !im.width) return;
      g.clearRect(0, 0, SZ, SZ);
      g.drawImage(im, 0, 0, SZ, SZ);
      try {
        data.set(g.getImageData(0, 0, SZ, SZ).data, i * SZ * SZ * 4);
        n++;
      } catch (e) {
        console.warn('detail', NAMES[i], e);
      }
    });
    tex.needsUpdate = true;
    S.ready = n > 0;
    S.layers = n;
    markDirty(true);
  });
  return S;
})();
window.DETAIL = DETAIL;
// ---------- how many textures does each compiled shader program use? ----------
export const GLCHECK = (() => {
  const S = { lite: false };
  // the samplers a program's fragment shader really uses (active uniforms declared in its fragment source), and its vertex shader
  S.run = limit => {
    const gl = R.getContext(),
      lim = limit || gl.getParameter(gl.MAX_TEXTURE_IMAGE_UNITS),
      vlim = gl.getParameter(gl.MAX_VERTEX_TEXTURE_IMAGE_UNITS);
    const ST = new Set([
      gl.SAMPLER_2D,
      gl.SAMPLER_CUBE,
      gl.SAMPLER_3D,
      gl.SAMPLER_2D_ARRAY,
      gl.SAMPLER_2D_SHADOW,
      gl.SAMPLER_CUBE_SHADOW,
      gl.SAMPLER_2D_ARRAY_SHADOW,
      gl.INT_SAMPLER_2D,
      gl.INT_SAMPLER_3D,
      gl.INT_SAMPLER_CUBE,
      gl.INT_SAMPLER_2D_ARRAY,
      gl.UNSIGNED_INT_SAMPLER_2D,
      gl.UNSIGNED_INT_SAMPLER_3D,
      gl.UNSIGNED_INT_SAMPLER_CUBE,
      gl.UNSIGNED_INT_SAMPLER_2D_ARRAY,
    ]);
    const out = { limit: lim, vlimit: vlim, programs: 0, maxFrag: 0, maxVert: 0, bad: [], broken: [] };
    for (const p of R.info.programs || []) {
      const prog = p.program;
      if (!prog) continue;
      out.programs++;
      if (p.diagnostics && p.diagnostics.runnable === false)
        out.broken.push(p.name + ' ' + (p.cacheKey || '').slice(0, 40));
      let fs = '',
        vs = '';
      try {
        fs = gl.getShaderSource(p.fragmentShader) || '';
        vs = gl.getShaderSource(p.vertexShader) || '';
      } catch (e) {}
      const n = gl.getProgramParameter(prog, gl.ACTIVE_UNIFORMS);
      let f = 0,
        v = 0;
      const names = [];
      for (let i = 0; i < n; i++) {
        const u = gl.getActiveUniform(prog, i);
        if (!u || !ST.has(u.type)) continue;
        const base = u.name.replace(/\[.*$/, ''),
          re = new RegExp('\\b' + base + '\\b');
        const inF = re.test(fs.replace(/\/\/.*$/gm, '')),
          inV = re.test(vs.replace(/\/\/.*$/gm, ''));
        if (inF || !inV) f += u.size;
        if (inV) v += u.size;
        names.push(base);
      }
      out.maxFrag = Math.max(out.maxFrag, f);
      out.maxVert = Math.max(out.maxVert, v);
      if (f > lim || v > vlim)
        out.bad.push({ name: p.name, key: (p.cacheKey || '').slice(0, 60), frag: f, vert: v, samplers: names });
    }
    return out;
  };
  // run time: when this GPU allows fewer textures than a program needs, the ground drops its optional detail (roads, forest floor)
  S.guard = () => {
    try {
      const r = S.run();
      if (r.bad.length && !S.lite) {
        S.lite = true;
        console.warn(
          'Grafik: zu viele Texturen für diese GPU, Bodendetails vereinfacht',
          JSON.stringify(r.bad.slice(0, 4))
        );
        scene.traverse(o => {
          const ms = o.material ? (Array.isArray(o.material) ? o.material : [o.material]) : [];
          for (const m of ms)
            if (
              m.onBeforeCompile &&
              m.onBeforeCompile.toString() !== THREE.Material.prototype.onBeforeCompile.toString()
            )
              m.needsUpdate = true;
        });
        markDirty(true);
      }
      return r;
    } catch (e) {
      console.warn('glcheck', e);
      return null;
    }
  };
  return S;
})();
window.GLCHECK = GLCHECK;
