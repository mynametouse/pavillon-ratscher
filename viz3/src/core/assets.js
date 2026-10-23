// ---------------- asset loading ----------------
import * as THREE from 'three';
import { MeshoptDecoder } from 'three/examples/jsm/libs/meshopt_decoder.module.js';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { KTX2Loader } from 'three/examples/jsm/loaders/KTX2Loader.js';
import * as BufferGeometryUtils from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { LATE } from './late.js';
import { SAVE } from './save.js';
import { $, BASE, R, rnd, scene, V } from './head.js';
export const LM = new THREE.LoadingManager();
export const LOAD = { done: 0, total: 0, finished: false, cbs: [] };
// V16b4: load log – every step of loading with its time, written to localStorage while the page loads ('pav-loadlog'). If the browser kills the
// page (iPhone: out of memory) or it hangs, the next visit knows where the last attempt stopped; boot.js shows it on the loading screen.
export const LOADLOG = (() => {
  const L = { t0: performance.now(), steps: [], errs: [], prev: null, open: true, last: '', lastT: -1e9 };
  try {
    const p = JSON.parse(SAVE.raw('pav-loadlog') || 'null');
    if (p && p.open && Date.now() - p.at < 3 * 3600e3) L.prev = p;
  } catch (e) {}
  L.save = () => {
    try {
      SAVE.setRaw(
        'pav-loadlog',
        JSON.stringify({
          open: L.open,
          at: Date.now(),
          t: Math.round(performance.now() - L.t0),
          steps: L.steps.slice(-40),
          errs: L.errs.slice(-6),
          tex: window.TEXHALF ? window.TEXHALF.level : 0,
          gl: window.GLINFO ? LATE.GLINFO.renderer.slice(0, 90) : '',
          ua: navigator.userAgent.slice(0, 140),
          mem: performance.memory ? Math.round(performance.memory.usedJSHeapSize / 1e6) : null,
        })
      );
    } catch (e) {}
  };
  // a step: kept when it is a new kind of step (text before the numbers) or a second has passed since the last one
  L.note = (txt, force) => {
    const now = performance.now(),
      kind = String(txt)
        .replace(/[\d\s.,%()]+/g, ' ')
        .trim();
    if (!force && kind === L.last && now - L.lastT < 1000) return;
    L.last = kind;
    L.lastT = now;
    L.steps.push([Math.round(now - L.t0), String(txt).slice(0, 120)]);
    L.save();
  };
  L.err = e => {
    L.errs.push(String((e && (e.stack || e.message)) || e).slice(0, 300));
    L.save();
  };
  L.end = () => {
    L.open = false;
    L.note('fertig', true);
  };
  window.addEventListener('error', e => L.err(e.error || e.message));
  window.addEventListener('unhandledrejection', e => L.err(e.reason));
  return L;
})();
window.LOADLOG = LOADLOG;
// V16b5: Web Audio throws on a value that is not finite (NaN, Infinity) – one bad number from a position (a vehicle near a felled tree)
// stopped the whole page. Such a value is dropped now (the parameter keeps its course) and noted in the log (once in 10 s).
if (window.AudioParam) {
  const AP = AudioParam.prototype;
  let badT = -1e9;
  const bad = (k, v) => {
    const now = performance.now();
    if (now - badT < 10000) return;
    badT = now;
    console.warn('audio: ' + k + '(' + v + ') dropped');
    LOADLOG.err('Ton: ' + k + '(' + v + ') verworfen');
  };
  for (const k of ['setValueAtTime', 'setTargetAtTime', 'linearRampToValueAtTime', 'exponentialRampToValueAtTime']) {
    const f = AP[k];
    if (typeof f !== 'function') continue;
    AP[k] = function (v, t, c) {
      if (!isFinite(v) || !isFinite(t) || (arguments.length > 2 && !isFinite(c))) {
        bad(k, v);
        return this;
      }
      return f.apply(this, arguments);
    };
  } // isFinite converts like the browser does
  const d = Object.getOwnPropertyDescriptor(AP, 'value');
  if (d && d.set && d.configurable)
    Object.defineProperty(AP, 'value', {
      configurable: true,
      enumerable: d.enumerable,
      get: d.get,
      set(v) {
        if (!isFinite(v)) {
          bad('value', v);
          return;
        }
        d.set.call(this, v);
      },
    });
}
// V16b4: which files are still on the way (a file that never arrives keeps the page at „Modell wird geladen … 100 %“ – the info line names it)
LOAD.pending = new Map();
{
  const s0 = LM.itemStart,
    e0 = LM.itemEnd,
    x0 = LM.itemError;
  LM.itemStart = u => {
    LOAD.pending.set(u, performance.now());
    s0.call(LM, u);
  };
  LM.itemEnd = u => {
    LOAD.pending.delete(u);
    e0.call(LM, u);
  };
  LM.itemError = u => {
    LOAD.pending.delete(u);
    x0.call(LM, u);
  };
}
LM.onProgress = (u, d, t) => {
  LOAD.done = d;
  LOAD.total = t;
  LOAD.alive = performance.now();
  const l = $('loading');
  if (l && !l.hidden && !LOAD.finished && !LOAD.allIn)
    l.textContent = 'Modell wird geladen … ' + Math.round((100 * d) / Math.max(t, 1)) + ' %'; // V16b2: later loads do not overwrite the next steps
  if (!LOAD.allIn) LOADLOG.note('Dateien ' + d + ' von ' + t);
};
// V16b3: after the last file the scene is built from them (up to half a minute on a slow PC): say so, and let the page show it before the work
// starts (LOAD.finished – and with it whenLoaded's run-at-once – only from the moment the callbacks run, so nothing sees a half-built scene)
// V16b4: one callback at a time with a breath in between – the page stays responsive, the loading text counts the steps (a step that hangs
// shows which one it is), every step goes to the load log. Callbacks registered while the scene is built run at once, as before.
LM.onLoad = () => {
  if (LOAD.flushT || LOAD.flushing) return;
  const l = $('loading');
  if (!LOAD.finished && l && !l.hidden) l.textContent = 'Modell wird aufgebaut …';
  LOAD.allIn = true;
  LOAD.alive = performance.now();
  LOAD.flushT = setTimeout(
    () => {
      if (LOAD.finished) flushLoaded();
      else breathe().then(flushLoaded);
    },
    LOAD.finished ? 0 : 40
  );
}; // the new text is painted first
const breathe = () =>
  new Promise(r => {
    let d = 0;
    const go = () => {
      if (!d) {
        d = 1;
        r();
      }
    };
    requestAnimationFrame(() => setTimeout(go, 0));
    setTimeout(go, 80);
  }); // a paint, or 80 ms in a hidden tab
async function flushLoaded() {
  LOAD.flushT = 0;
  LOAD.finished = true;
  LOAD.flushing = true;
  let k = 0;
  while (LOAD.cbs.length) {
    const f = LOAD.cbs.shift(),
      n = ++k + LOAD.cbs.length,
      l = $('loading');
    if (l && !l.hidden && n > 1) l.textContent = 'Modell wird aufgebaut … ' + k + ' von ' + n;
    LOADLOG.note('Aufbau ' + k + '/' + n + ': ' + String(f).replace(/\s+/g, ' ').slice(0, 70), true);
    await breathe(); // the count above is on the screen while this step runs – a step that hangs shows its number
    const a = performance.now();
    try {
      f();
    } catch (e) {
      console.error(e);
      LOADLOG.err(e);
    }
    LOAD.alive = performance.now();
    if (performance.now() - a > 400)
      LOADLOG.note('Aufbau ' + k + ' fertig nach ' + Math.round(performance.now() - a) + ' ms', true);
  }
  LOAD.flushing = false;
  LOAD.alive = performance.now();
}
LM.onError = u => {
  console.warn('Datei fehlt:', u);
  LOADLOG.err('Datei fehlt: ' + u);
};
export function whenLoaded(f) {
  if (LOAD.finished) f();
  else LOAD.cbs.push(f);
}
// standalone single-file version: assets come from blob URLs built from the embedded data
if (window.EMBED_URL) {
  const mod = u => window.EMBED_URL[u] || u;
  LM.setURLModifier(mod);
  THREE.DefaultLoadingManager.setURLModifier(mod);
}
export const TXL = new THREE.TextureLoader(LM);
// V16b6: phones and tablets get every image from 512 px up at half its size, right when it is loaded – a quarter of the memory on the CPU and
// the GPU (iPhone: ~880 MB of decoded images made Safari drop the page while the textures went up). Desktop unchanged. Did a load at that level
// break off anyway (the previous load log is still open and names its level), the next attempt takes a quarter (from 256 px up: half) and keeps
// it (pav-texlevel). ?tex=full / half / quarter to check by hand. Data images (baked light, sky visibility), 360° and gallery pictures keep their size.
const TEXHALF = { level: 0, n: 0, mb: 0 };
window.TEXHALF = TEXHALF;
{
  const q = (location.search.match(/[?&]tex=(full|half|quarter)/) || [])[1],
    mobile =
      /iPhone|iPad|iPod|Android/i.test(navigator.userAgent) ||
      (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  if (q) TEXHALF.level = { full: 0, half: 1, quarter: 2 }[q];
  else if (mobile) {
    let kept = 1;
    try {
      kept = Math.max(1, +SAVE.raw('pav-texlevel') || 1);
    } catch (e) {}
    const P = LOADLOG.prev;
    if (P && (P.tex || 0) >= kept) {
      kept = Math.min(2, (P.tex || 0) + 1);
      try {
        SAVE.setRaw('pav-texlevel', String(kept));
      } catch (e) {}
    }
    TEXHALF.level = kept;
  }
  TEXHALF.on = TEXHALF.level > 0;
}
function halfImage(im) {
  const w = im.naturalWidth || im.width || 0,
    h = im.naturalHeight || im.height || 0,
    m = Math.max(w, h),
    L = TEXHALF.level;
  const sh = m >= 512 ? L : m >= 256 && L >= 2 ? 1 : 0;
  if (!sh) return im;
  try {
    const c = document.createElement('canvas');
    c.width = Math.max(1, w >> sh);
    c.height = Math.max(1, h >> sh);
    const x = c.getContext('2d');
    if (!x) return im;
    x.imageSmoothingQuality = 'high';
    x.drawImage(im, 0, 0, c.width, c.height);
    if (typeof im.close === 'function') im.close();
    TEXHALF.n++;
    TEXHALF.mb += ((w * h - c.width * c.height) * 4) / 1e6;
    return c;
  } catch (e) {
    return im;
  }
}
if (TEXHALF.on) {
  const IL = THREE.ImageLoader.prototype,
    load0 = IL.load,
    keep = /\/(gi|pano|img)\/|\bsv(_b)?\.png/;
  IL.load = function (url, onLoad, onProgress, onError) {
    return load0.call(this, url, onLoad && !keep.test(url) ? im => onLoad(halfImage(im)) : onLoad, onProgress, onError);
  };
  LOADLOG.note('Texturen auf Mobilgerät: ' + (TEXHALF.level > 1 ? 'Viertel' : 'halbe Größe'), true);
  whenLoaded(() =>
    LOADLOG.note('Texturen verkleinert: ' + TEXHALF.n + ', ' + Math.round(TEXHALF.mb) + ' MB gespart', true)
  );
}
// The glTF files carry geometry and images as data: URIs. Strict content-security policies (the artifact viewer in the Claude app) refuse
// to fetch() data: URIs, so every model failed there. The parser now decodes them itself: buffers with atob, images through
// createImageBitmap from a Blob (an <img> where that is missing). The loading manager stays busy until a model is fully parsed.
export function b64bytes(uri) {
  const s = atob(uri.slice(uri.indexOf(',') + 1));
  const u = new Uint8Array(s.length);
  for (let i = 0; i < s.length; i++) u[i] = s.charCodeAt(i);
  return u;
}
let GLTF_N = 0;
export function gltfDataURIs(loader) {
  loader.register(parser => {
    const man = parser.options.manager || THREE.DefaultLoadingManager,
      key = 'gltf-parse-' + ++GLTF_N;
    let ended = false;
    man.itemStart(key);
    const done = () => {
      if (!ended) {
        ended = true;
        man.itemEnd(key);
      }
    };
    const op = parser.parse;
    parser.parse = function (onLoad, onError) {
      return op.call(
        this,
        r => {
          try {
            onLoad(r);
          } finally {
            done();
          }
        },
        e => {
          done();
          if (onError) onError(e);
        }
      );
    };
    const lb = parser.loadBuffer;
    parser.loadBuffer = function (i) {
      const d = this.json.buffers[i];
      if (d && d.uri && d.uri.startsWith('data:')) {
        try {
          return Promise.resolve(b64bytes(d.uri).buffer);
        } catch (e) {
          return Promise.reject(e);
        }
      }
      return lb.call(this, i);
    };
    const tl = parser.textureLoader;
    parser.textureLoader = {
      isImageBitmapLoader: true,
      setCrossOrigin() {
        return this;
      },
      setRequestHeader() {
        return this;
      },
      setPath() {
        return this;
      },
      load(url, onLoad, onProgress, onError) {
        if (!url.startsWith('data:'))
          return tl.isImageBitmapLoader
            ? tl.load(url, onLoad, onProgress, onError)
            : tl.load(url, t => onLoad(t.image), onProgress, onError);
        const viaImg = () => {
          const im = new Image();
          im.onload = () => onLoad(halfImage(im));
          im.onerror = onError;
          im.src = url;
        }; // V16b6: halved on phones
        let blob;
        try {
          blob = new Blob([b64bytes(url)], { type: url.slice(5, url.indexOf(';')) });
        } catch (e) {
          viaImg();
          return;
        }
        if (typeof createImageBitmap !== 'function') {
          viaImg();
          return;
        }
        let p;
        try {
          p = createImageBitmap(blob, { premultiplyAlpha: 'none', colorSpaceConversion: 'none' });
        } catch (e) {
          viaImg();
          return;
        }
        p.then(bm => onLoad(halfImage(bm)), viaImg);
      },
    };
    return { name: 'PAV_data_uri' };
  });
  return loader;
}
export const GLL = gltfDataURIs(new GLTFLoader(LM));
GLL.setMeshoptDecoder(MeshoptDecoder); // models: meshopt-compressed geometry and WebP images inside the JSON
export const TEXMAN = window.TEXMAN || {}; // {name:{tile:[w,h], rot}} injected at build
export const ANISO = Math.min(8, R.capabilities.getMaxAnisotropy());
// ---------- GPU-compressed textures (KTX2 with Basis Universal, docs/features/texturen.md) ----------
// The PBR images tex/<name>_{col,nrm,orm} also exist as tex2/<name>.ktx2 (tools/tex/ktx2.py; window.TEX2MAN lists those that belong to the
// current images). Uploading ~430 decoded images (decode, mipmaps) was most of the start on a PC without graphics card, and the decoded
// RGBA images were what made Safari drop the page on the iPhone. A KTX2 file is transcoded in a worker (three's KTX2Loader) to what the GPU
// samples directly – BC7/BC1 on desktops, ASTC/ETC2 on phones – with every mip level made by the encoder: a quarter (BC1/ETC: an eighth)
// of the memory, nothing decoded on the main thread. Phones load tex2/h/ (half size, as TEXHALF did with the images) and leave out one
// more mip level after a broken-off attempt. The texture objects stay the same: a loaded KTX2 texture is turned into a compressed texture
// in place (clones made before included), so wrap, repeat, rotation, anisotropy, colour space – and the shader programs – stay as they are.
// Any problem (file, transcoder, no compressed format on this GPU) falls back to the image, per texture. ?tex2=0 switches it off.
// Where it is on by default – until Falko has checked it on his iPhone (Safari) and laptop (Chrome): in the preview (/vorschau/) and on
// the test servers (localhost, so the CI tests cover it); on the live site only with ?tex2=1. For everyone: TEX2_LIVE = true.
const TEX2_LIVE = false;
export const TEX2 = (() => {
  const S = {
    on: false,
    why: '',
    names: new Set(window.TEX2MAN || []),
    n: 0,
    fails: 0,
    back: 0,
    mb: 0,
    fmt: {},
    ms: 0,
  };
  window.TEX2 = S;
  const q = (location.search.match(/[?&]tex2=(\d)/) || [])[1];
  S.dflt = TEX2_LIVE || /\/vorschau\//.test(location.pathname) || /^(localhost|127\.0\.0\.1)$/.test(location.hostname);
  if (q === '0') S.why = 'aus (?tex2=0)';
  else if (q !== '1' && !S.dflt) S.why = 'aus auf der Live-Seite (an mit ?tex2=1)';
  else if (!S.names.size) S.why = 'keine KTX2-Dateien im Build';
  else if (window.EMBED_URL) S.why = 'eingebettete Fassung';
  else if (typeof WebAssembly !== 'object' || typeof Worker !== 'function') S.why = 'kein WebAssembly/Worker';
  else
    try {
      const L = new KTX2Loader(LM).setTranscoderPath(BASE + 'basis/').detectSupport(R),
        c = L.workerConfig;
      // colour maps are sRGB: as BC1/BC3 they need the sRGB variant of S3TC (three finds no format without it)
      if (c.dxtSupported && !R.extensions.has('WEBGL_compressed_texture_s3tc_srgb')) c.dxtSupported = false;
      c.etc1Supported = false; // ETC1 has no sRGB variant – ETC2 covers the same files
      c.pvrtcSupported = false;
      S.gpu = Object.keys(c).filter(k => c[k]);
      // ?tex2fmt=astc|bc7|bc1|etc2|rgba: one target family only (comparisons; rgba = transcoded to plain RGBA, nothing compressed)
      const ff = (location.search.match(/[?&]tex2fmt=(astc|bc7|bc1|etc2|rgba)/) || [])[1],
        FAM = { astc: 'astcSupported', bc7: 'bptcSupported', bc1: 'dxtSupported', etc2: 'etc2Supported' };
      if (ff) for (const k of Object.values(FAM)) c[k] = c[k] && FAM[ff] === k;
      if (ff) S.fam = ff;
      // without a graphics card (the same test as GLINFO in render/render.js) every compressed texture is decoded on the processor when
      // it goes up: measured with SwiftShader (docs/features/texturen.md) BC7 is cheap there – the start 5 s faster than with the images,
      // ASTC 4 s slower, BC1/ETC2/RGBA like the images. So BC7 only, and the images where there is no BC7.
      let soft = false;
      try {
        const gl = R.getContext(),
          d = gl.getExtension('WEBGL_debug_renderer_info');
        soft = /swiftshader|basic render|llvmpipe|softpipe|software/i.test(
          String((d && gl.getParameter(d.UNMASKED_RENDERER_WEBGL)) || gl.getParameter(gl.RENDERER) || '')
        );
      } catch (e) {}
      S.soft = soft;
      if (soft && !ff) c.astcSupported = c.etc2Supported = c.dxtSupported = false;
      if (soft && !ff && !c.bptcSupported) S.why = 'Software-Grafik ohne BC7 (dort sind die Bilder schneller)';
      else if (!(c.astcSupported || c.bptcSupported || c.etc2Supported || c.dxtSupported) && ff !== 'rgba')
        S.why = 'keine komprimierten Formate auf dieser GPU';
      else {
        // workers: each holds the transcoder's WebAssembly memory – one on phones, up to three on desktops; ended once nothing waits
        L.setWorkerLimit(TEXHALF.on ? 1 : Math.max(1, Math.min(3, (navigator.hardwareConcurrency || 2) - 1)));
        S.L = L;
        S.on = true;
        // the transcoder (~0.6 MB) comes at once, alongside the first files (a failure shows per texture → its image)
        L.init().catch(() => {});
      }
    } catch (e) {
      S.why = 'Fehler: ' + ((e && e.message) || e);
    }
  // phones: the half-size files; after a broken-off attempt one mip level less (the same rule as halfImage for the 1024 px images)
  S.half = TEXHALF.on;
  S.drop = TEXHALF.level > 1 ? 1 : 0;
  S.stem = file => {
    const m = /^tex\/([\w-]+)\.(webp|jpg|png)$/.exec(file);
    return m && S.names.has(m[1]) ? m[1] : null;
  };
  const NAMES = {
    [THREE.RGBA_BPTC_Format]: 'BC7',
    [THREE.RGBA_S3TC_DXT1_Format]: 'BC1',
    [THREE.RGBA_S3TC_DXT5_Format]: 'BC3',
    [THREE.RGBA_ASTC_4x4_Format]: 'ASTC',
    [THREE.RGB_ETC2_Format]: 'ETC2',
    [THREE.RGBA_ETC2_EAC_Format]: 'ETC2A',
    [THREE.RGBAFormat]: 'RGBA',
  };
  // a texture object (Texture) becomes a compressed texture with the transcoded levels – in place, so every reference stays valid
  const morph = (t, mips, fmt) => {
    Object.setPrototypeOf(t, THREE.CompressedTexture.prototype);
    t.isCompressedTexture = true;
    t.mipmaps = mips;
    t.format = fmt;
    t.type = THREE.UnsignedByteType;
    t.flipY = false;
    t.generateMipmaps = false;
    t.premultiplyAlpha = false;
    t.minFilter = mips.length > 1 ? THREE.LinearMipmapLinearFilter : THREE.LinearFilter;
    t.magFilter = THREE.LinearFilter;
    t.needsUpdate = true;
  };
  // the transcoder must answer: no texture transcoded 40 s after the first file arrived (a worker that cannot start its WebAssembly) →
  // every waiting texture takes its image. A timer that fires late (the page was busy building the scene) waits once more.
  const waiting = new Set();
  let watch = 0;
  const giveUp = why => {
    S.on = false;
    S.why = why;
    LOADLOG.note('KTX2 aus: ' + why, true);
    for (const w of [...waiting]) w.bad(why);
  };
  const arm = (ms, late) => {
    const due = performance.now() + ms;
    watch = setTimeout(() => {
      if (S.n || !S.on) return;
      if (!late && performance.now() - due > 2000) arm(10000, true);
      else giveUp('Transkodierer antwortet nicht');
    }, ms);
  };
  // the workers end 3 s after the last texture (their WebAssembly memory is freed); a later texture starts one again
  let idleT = 0;
  const idle = () => {
    clearTimeout(idleT);
    idleT = setTimeout(() => {
      if (waiting.size || !S.L) return;
      S.L.workerPool.dispose();
      S.ended = (S.ended || 0) + 1;
    }, 3000);
  };
  // load one texture into rec.tex; ok() after it is in place, bad(why) → the caller loads the image instead
  S.load = (stem, rec, ok, bad) => {
    const url = BASE + 'tex2/' + (S.half ? 'h/' : '') + stem + '.ktx2',
      key = 'ktx2:' + stem;
    let over = false;
    if (!S.t0) S.t0 = Math.round(performance.now());
    LM.itemStart(key);
    const w = {
      bad: why => {
        if (over) return;
        over = true;
        waiting.delete(w);
        idle();
        S.fails++;
        console.warn('KTX2', stem, why);
        try {
          bad(why);
        } finally {
          LM.itemEnd(key);
        }
      },
    };
    waiting.add(w);
    const fl = new THREE.FileLoader(LM).setResponseType('arraybuffer');
    fl.load(
      url,
      buf => {
        if (over) return;
        if (!watch && !S.n) arm(40000);
        const a = performance.now();
        S.L.parse(
          buf,
          ct => {
            if (over) return;
            let mips = (ct && ct.mipmaps) || [];
            if (!mips.length || !mips[0].data || !ct.isCompressedTexture) {
              w.bad('leer');
              return;
            }
            if (S.drop && mips.length > 1) mips = mips.slice(Math.min(S.drop, mips.length - 1));
            over = true;
            waiting.delete(w);
            idle();
            try {
              rec.tex.image = { width: mips[0].width, height: mips[0].height };
              for (const t of [rec.tex, ...rec.clones]) morph(t, mips, ct.format);
              S.n++;
              S.ms += performance.now() - a;
              S.last = Math.round(performance.now());
              if (!S.t1) S.t1 = S.last;
              const f = NAMES[ct.format] || String(ct.format);
              S.fmt[f] = (S.fmt[f] || 0) + 1;
              S.mb += mips.reduce((s, m) => s + m.data.byteLength, 0) / 1e6;
              ok();
            } finally {
              LM.itemEnd(key);
            }
          },
          e => w.bad((e && e.message) || String(e))
        );
      },
      undefined,
      () => w.bad('Datei fehlt')
    );
  };
  whenLoaded(() => {
    if (S.names.size)
      LOADLOG.note(
        S.n
          ? 'Texturen KTX2: ' +
              S.n +
              ' (' +
              Object.entries(S.fmt)
                .map(([k, v]) => v + ' ' + k)
                .join(', ') +
              '), ' +
              Math.round(S.mb) +
              ' MB' +
              (S.fails ? ', ' + S.fails + ' als Bild' : '')
          : 'Texturen KTX2 aus: ' + (S.why || 'keine geladen'),
        true
      );
  });
  return S;
})();
const texCache = {};
// for the tests: every texture file and how it came (compressed or image, size of the base level)
TEX2.files = () =>
  Object.entries(texCache).map(([k, r]) => ({
    file: k,
    k2: !!r.tex.isCompressedTexture,
    ok: r.ok,
    w: (r.tex.image && r.tex.image.width) || 0,
    mb: r.tex.isCompressedTexture ? r.tex.mipmaps.reduce((s, m) => s + m.data.byteLength, 0) / 1e6 : 0,
  }));
// img: always the image (pixels on the CPU – the ground's detail array draws them into a canvas)
export function texFile(file, srgb, img) {
  const key = file + (srgb ? '|s' : '|l') + (img ? '|i' : '');
  if (texCache[key]) return texCache[key];
  const rec = { tex: null, ok: null, fails: [], clones: [] };
  const done = () => {
      rec.ok = true;
      rec.clones.forEach(c => (c.needsUpdate = true));
      markDirty(true);
    },
    fail = () => {
      rec.ok = false;
      rec.fails.forEach(f => f());
    };
  const stem = TEX2.on && !img ? TEX2.stem(file) : null;
  if (stem) {
    rec.tex = new THREE.Texture();
    rec.k2 = stem;
    TEX2.load(
      stem,
      rec,
      () => {
        rec.ok = true;
        markDirty(true);
      },
      () => {
        rec.k2 = null;
        TEX2.back++;
        new THREE.ImageLoader(LM).setCrossOrigin('anonymous').load(
          BASE + file,
          im => {
            rec.tex.image = im;
            rec.tex.needsUpdate = true;
            done();
          },
          undefined,
          fail
        );
      }
    );
  } else rec.tex = TXL.load(BASE + file, done, undefined, fail);
  rec.tex.wrapS = rec.tex.wrapT = THREE.RepeatWrapping;
  rec.tex.anisotropy = ANISO;
  if (srgb) rec.tex.colorSpace = THREE.SRGBColorSpace;
  texCache[key] = rec;
  return rec;
}
export function texUse(file, srgb, rep, rot = 0) {
  const rec = texFile(file, srgb);
  const t = rec.tex.clone();
  t.repeat.set(rep[0], rep[1]);
  t.rotation = rot;
  if (rec.ok) t.needsUpdate = true;
  else rec.clones.push(t);
  return { t, rec };
}
// ---------- sky-visibility volume (baked ambient occlusion for the house, see bake) ----------
export const SV = {
  tex: { value: null },
  min: { value: new THREE.Vector3() },
  size: { value: new THREE.Vector3(1, 1, 1) },
  on: { value: 0 },
  floor: { value: 0.15 },
  gain: { value: 2.8 },
};
// baked global illumination around the pavilion (test/gi.py): irradiance from sky and two bounces of sun and sky light, per light mode;
// replaces the image-based diffuse light inside its box (E(n) = A · (1 + B·n), A log-encoded RGB, B direction term)
export const GI = {
  a: { value: null },
  b: { value: null },
  on: { value: 0 },
  lo: { value: 0 },
  hi: { value: 1 },
  k: { value: 1 },
  tint: { value: new THREE.Vector3(1, 1, 1) },
  min: { value: new THREE.Vector3() },
  size: { value: new THREE.Vector3(1, 1, 1) },
};
// sun shadows of the moving figures: the sun's own shadow map only changes with the buildings (it is redrawn on demand), so people, goats
// and the tractor get a small depth map of their own from the sun's direction (npc/npc_real.js, redrawn every frame around the figures near
// the camera); every patched material multiplies the sun's light by it: real shadows on lawn, grass blades, walls and the figures themselves.
// Soft edge like the sun's half-degree disc: a short blocker search sets the filter width from the distance to the occluder.
export const FIGSH = {
  map: { value: null },
  mat: { value: new THREE.Matrix4() },
  on: { value: 0 },
  texel: { value: 1 / 1024 },
  wtexel: { value: 0.01 },
  range: { value: 40 },
  bias: { value: 0.001 },
};
const FIGSH_GLSL = `uniform sampler2D uFSMap; uniform mat4 uFSMat; uniform float uFSOn, uFSTexel, uFSWTexel, uFSRange, uFSBias;
float figSh() {
  if ( uFSOn < 0.5 ) return 1.0;
  vec3 c = ( uFSMat * vec4( vSVW, 1.0 ) ).xyz;
  if ( c.x <= 0.004 || c.x >= 0.996 || c.y <= 0.004 || c.y >= 0.996 || c.z <= 0.0 || c.z >= 1.0 ) return 1.0;
  if ( unpackRGBAToDepth( texture2D( uFSMap, vec2( 0.5 * uFSTexel ) ) ) < 0.99 ) return 1.0;   // its corner is always empty: a map that failed (low memory) casts nothing
  float z = c.z - uFSBias, bs = 0.0, bn = 0.0;
  for ( int k = 0; k < 5; k ++ ) { vec2 o = k == 0 ? vec2( 0.0 ) : vec2( k == 1 ? 5.0 : ( k == 2 ? -5.0 : 0.0 ), k == 3 ? 5.0 : ( k == 4 ? -5.0 : 0.0 ) );
    float d = unpackRGBAToDepth( texture2D( uFSMap, c.xy + o * uFSTexel ) ); if ( d < z ) { bs += d; bn += 1.0; } }
  if ( bn < 0.5 ) return 1.0;
  float r = clamp( ( 0.0047 * ( z - bs / bn ) * uFSRange + 0.004 ) / uFSWTexel, 1.0, 5.0 );
  float s = 0.0;
  for ( int i = -1; i <= 1; i ++ ) for ( int j = -1; j <= 1; j ++ ) s += step( z, unpackRGBAToDepth( texture2D( uFSMap, c.xy + vec2( float( i ), float( j ) ) * r * uFSTexel ) ) );
  return s / 9.0; }
`;
// the sun is the only directional light: its shadow term gets the figures' shadow as a second factor
const LFB_FIG = (() => {
  const s = THREE.ShaderChunk.lights_fragment_begin,
    rx =
      /(directLight\.color \*= \( directLight\.visible && receiveShadow \) \? getShadow\( directionalShadowMap\[ i \][^;]*;)/;
  if (!rx.test(s)) {
    console.warn('Figurenschatten: three-Shader geändert, aus');
    return null;
  }
  return s.replace(rx, '$1\n\t\tdirectLight.color *= figSh();');
})();
// V16a: lawn and gravel near the pavilion get only a little of the room lamps (point lights have no shadows: without this the whole gravel bed
// glowed at night as if the walls were glass); the spill through windows and doors stays as a faint glow
const LFB_P = 'getPointLightInfo( pointLight, geometryPosition, directLight );';
const LFB_LEAK = (() => {
  const s = LFB_FIG || THREE.ShaderChunk.lights_fragment_begin;
  return s.includes(LFB_P) ? s.replace(LFB_P, LFB_P + '\n\t\tdirectLight.color *= svLeakF();') : null;
})();
const LEAK_GLSL =
  'float svLeakF() { return mix( 0.16, 1.0, smoothstep( 4.6, 9.0, length( vSVW.xz - vec2( 2.0, -2.0 ) ) ) ); }\n';
export function patchSV(m) {
  if (m.userData.svPatched) return m;
  m.userData.svPatched = true;
  const prev = m.onBeforeCompile;
  m.onBeforeCompile = (sh, r) => {
    if (prev) prev(sh, r);
    sh.uniforms.uSV = SV.tex;
    sh.uniforms.uSVMin = SV.min;
    sh.uniforms.uSVSize = SV.size;
    sh.uniforms.uSVOn = SV.on;
    sh.uniforms.uSVFloor = SV.floor;
    sh.uniforms.uSVGain = SV.gain;
    sh.uniforms.uGIA = GI.a;
    sh.uniforms.uGIB = GI.b;
    sh.uniforms.uGIOn = GI.on;
    sh.uniforms.uGILo = GI.lo;
    sh.uniforms.uGIHi = GI.hi;
    sh.uniforms.uGIK = GI.k;
    sh.uniforms.uGITint = GI.tint;
    sh.uniforms.uGIMin = GI.min;
    sh.uniforms.uGISize = GI.size;
    sh.uniforms.uFSMap = FIGSH.map;
    sh.uniforms.uFSMat = FIGSH.mat;
    sh.uniforms.uFSOn = FIGSH.on;
    sh.uniforms.uFSTexel = FIGSH.texel;
    sh.uniforms.uFSWTexel = FIGSH.wtexel;
    sh.uniforms.uFSRange = FIGSH.range;
    sh.uniforms.uFSBias = FIGSH.bias;
    sh.vertexShader =
      'varying vec3 vSVW;\n' +
      sh.vertexShader.replace(
        '#include <project_vertex>',
        `#include <project_vertex>
       { vec4 sw = vec4( transformed, 1.0 );
       #ifdef USE_INSTANCING
         sw = instanceMatrix * sw;
       #endif
         vSVW = ( modelMatrix * sw ).xyz + normalize( mat3( modelMatrix ) * objectNormal ) * 0.06; }`
      );
    const G = m.userData.grime;
    sh.fragmentShader =
      'precision highp sampler3D;\nuniform sampler3D uSV, uGIA, uGIB; uniform vec3 uSVMin, uSVSize, uGIMin, uGISize, uGITint; uniform float uSVOn, uSVFloor, uSVGain, uGIOn, uGILo, uGIHi, uGIK; varying vec3 vSVW;\n' +
      (G ? GRIME_GLSL : '') +
      (G
        ? sh.fragmentShader.replace(
            '#include <map_fragment>',
            `#include <map_fragment>
       { float h = vSVW.y - 0.06; float g = 1.0 - smoothstep(0.0, ${G[1].toFixed(3)}, h); float n = gNoise(vSVW.xz * 3.1 + vec2(vSVW.y * 2.3, 0.0));
         float splash = g * (0.55 + 0.45 * n);   // rain splash and soil near the ground
         vec3 dirt = vec3(dot(diffuseColor.rgb, vec3(0.3, 0.59, 0.11))) * vec3(0.78, 0.72, 0.62);
         diffuseColor.rgb = mix(diffuseColor.rgb, dirt, splash * ${G[0].toFixed(3)});
         float m2 = gNoise(vSVW.xz * 0.45 + vec2(0.0, vSVW.y * 0.6)) * 0.6 + gNoise(vSVW.xz * 1.7 + vec2(vSVW.y * 2.1)) * 0.4;   // weathering patches
         diffuseColor.rgb *= ${(1 - G[2]).toFixed(3)} + ${(2 * G[2]).toFixed(3)} * m2;${
           G[3]
             ? `
         float sk = gNoise(vec2((vSVW.x + vSVW.z) * 7.0, vSVW.y * 0.45)) * 0.65 + gNoise(vec2((vSVW.x - vSVW.z) * 17.0, vSVW.y * 0.9)) * 0.35;   // rain streaks running down
         diffuseColor.rgb *= 1.0 - ${G[3].toFixed(3)} * smoothstep(0.5, 0.9, sk);`
             : ''
         } }`
          )
        : sh.fragmentShader
      ).replace(
        '#include <lights_fragment_maps>',
        `#include <lights_fragment_maps>
       float giHit = 0.0; vec3 giE = vec3( 0.0 );
       if ( uGIOn > 0.5 ) { vec3 gt = ( vSVW - uGIMin ) / uGISize;
         if ( all( greaterThan( gt, vec3( 0.0 ) ) ) && all( lessThan( gt, vec3( 1.0 ) ) ) ) {
           vec3 nW = normalize( inverseTransformDirection( geometryNormal, viewMatrix ) );
           vec3 gA = exp2( mix( vec3( uGILo ), vec3( uGIHi ), texture( uGIA, gt ).rgb ) ); vec3 gB = ( texture( uGIB, gt ).rgb * 2.0 - 1.0 ) * 1.5;
           vec3 ge = min( gt, 1.0 - gt ) * uGISize;   // V16a: the volume fades out over its last 1.5 m sideways (no rectangle on the lawn)
           giE = gA * max( 0.0, 1.0 + dot( gB, nW ) ) * uGIK * uGITint; giHit = smoothstep( 0.0, 1.5, min( ge.x, ge.z ) ); } }
       if ( uSVOn > 0.5 ) { vec3 st = ( vSVW - uSVMin ) / uSVSize;
         if ( all( greaterThan( st, vec3( 0.0 ) ) ) && all( lessThan( st, vec3( 1.0 ) ) ) ) {
           float sv = texture( uSV, st ).r; sv = uSVFloor + ( 1.0 - uSVFloor ) * clamp( sv * uSVGain, 0.0, 1.0 );
           irradiance *= sv;
           #if defined( RE_IndirectSpecular )
             iblIrradiance = mix( iblIrradiance * sv, giE, giHit ); radiance *= sv;
           #endif
         } }` +
          (m.userData.svDim
            ? `
       { const vec3 LW = vec3( 0.2126, 0.7152, 0.0722 ); const float K = ${m.userData.svDim[0].toFixed(3)}, D = ${m.userData.svDim[1].toFixed(3)};
         irradiance = mix( irradiance, vec3( dot( irradiance, LW ) ), D ) * K;
         #if defined( RE_IndirectSpecular )
           iblIrradiance = mix( iblIrradiance, vec3( dot( iblIrradiance, LW ) ), D ) * K; radiance *= K;
         #endif
       }`
            : '')
      );
    const lfb = m.userData.leak && LFB_LEAK ? LFB_LEAK : LFB_FIG;
    if (lfb && sh.fragmentShader.includes('#include <lights_fragment_begin>'))
      sh.fragmentShader = sh.fragmentShader
        .replace('#include <lights_fragment_begin>', lfb)
        .replace('void main() {', (LFB_FIG ? FIGSH_GLSL : '') + (lfb === LFB_LEAK ? LEAK_GLSL : '') + 'void main() {');
  };
  const key = m.customProgramCacheKey ? m.customProgramCacheKey.bind(m) : null;
  m.customProgramCacheKey = () =>
    (key ? key() : '') +
    '|sv' +
    (m.userData.svDim ? m.userData.svDim.join('_') : '') +
    (m.userData.grime ? '|g' + m.userData.grime.join('_') : '') +
    (m.userData.leak ? '|lk' : '');
  return m;
}
// weathering of outdoor surfaces: soil and splash near the ground (strength k up to height h m), large soft patches (variation v)
const GRIME_GLSL = `float gHash(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
float gNoise(vec2 p){ vec2 i = floor(p), f = fract(p); vec2 u = f * f * (3.0 - 2.0 * f); return mix(mix(gHash(i), gHash(i + vec2(1.0, 0.0)), u.x), mix(gHash(i + vec2(0.0, 1.0)), gHash(i + vec2(1.0, 1.0)), u.x), u.y); }
`;
export function grime(m, k = 0.45, h = 0.45, v = 0.08, st = 0) {
  if (!m || !m.isMaterial) return m;
  m.userData.grime = [k, h, v, st];
  patchSV(m);
  m.needsUpdate = true;
  return m;
}
// interior surfaces outside the baked volume (site buildings): weaker, desaturated sky light – a room is not lit by the green lawn below it
export function dimIndoor(m, k = 0.5, desat = 0.6) {
  m.userData.svDim = [k, desat];
  m.needsUpdate = true;
  return m;
}
// ---------- PBR material from texture set tex/<name>_{col,nrm,orm}.jpg|webp (world-metre UVs) ----------
export const texFileOf = (name, ch) => `tex/${name}_${ch}.${((TEXMAN[name] || {}).ext || {})[ch] || 'jpg'}`;
export function pbrMat(name, o = {}) {
  const tm = TEXMAN[name];
  const tile = o.tile || (tm && tm.tile) || [1, 1];
  const rep = [1 / tile[0], 1 / tile[1]];
  const rot = o.rot !== undefined ? o.rot : (tm && tm.rot) || 0;
  const m = new THREE.MeshStandardMaterial({
    color: o.color ?? 0xffffff,
    roughness: o.rough ?? 1,
    metalness: o.metal ?? 0,
    envMapIntensity: o.env ?? 1,
    side: o.side ?? THREE.FrontSide,
  });
  if (o.transparent) {
    m.transparent = true;
    m.opacity = o.opacity ?? 1;
  }
  if (o.wash) {
    const wc = new THREE.Color(o.wash[0]),
      k = o.wash[1],
      v = `vec3(${wc.r.toFixed(4)},${wc.g.toFixed(4)},${wc.b.toFixed(4)})`; // whitewash / glaze: blend the albedo towards a colour, grain stays visible
    m.onBeforeCompile = sh => {
      sh.fragmentShader = sh.fragmentShader.replace(
        '#include <map_fragment>',
        `#include <map_fragment>\n diffuseColor.rgb = mix( diffuseColor.rgb, ${v}, ${k.toFixed(3)} );`
      );
    };
    m.customProgramCacheKey = () => 'wash' + o.wash[0] + '_' + k;
  }
  if (o.grade) {
    const G = (m.userData.grade = { d: { value: 0 }, c: { value: new THREE.Color(0xffffff) }, k: { value: 0 } }); // live colour grading of the albedo (facade options: greyed / glazed wood)
    m.onBeforeCompile = sh => {
      sh.uniforms.uGD = G.d;
      sh.uniforms.uGC = G.c;
      sh.uniforms.uGK = G.k;
      sh.fragmentShader =
        'uniform float uGD, uGK; uniform vec3 uGC;\n' +
        sh.fragmentShader.replace(
          '#include <map_fragment>',
          '#include <map_fragment>\n { float gl = dot( diffuseColor.rgb, vec3( 0.2126, 0.7152, 0.0722 ) ); diffuseColor.rgb = mix( mix( diffuseColor.rgb, vec3( gl ), uGD ), uGC, uGK ); }'
        );
    };
    m.customProgramCacheKey = () => 'grade';
  }
  m.name = name;
  if (!tm) {
    m.color.set(o.fallback ?? 0x888888);
    m.roughness = o.fbRough ?? 0.85;
    return patchSV(m);
  }
  const ex = tm.ext || {},
    c = texUse(`tex/${name}_col.${ex.col || 'jpg'}`, true, rep, rot),
    n = texUse(`tex/${name}_nrm.${ex.nrm || 'jpg'}`, false, rep, rot),
    r = texUse(`tex/${name}_orm.${ex.orm || 'jpg'}`, false, rep, rot);
  m.map = c.t;
  m.normalMap = n.t;
  const ns = o.nrm ?? 1;
  m.normalScale.set(ns, ns);
  m.roughnessMap = r.t;
  m.aoMap = r.t;
  m.aoMapIntensity = o.ao ?? 0.7;
  if ((o.metal ?? 0) > 0 && o.metalMap) m.metalnessMap = r.t;
  c.rec.fails.push(() => {
    m.map = null;
    m.color.set(o.fallback ?? 0x888888);
    m.needsUpdate = true;
  });
  n.rec.fails.push(() => {
    m.normalMap = null;
    m.needsUpdate = true;
  });
  r.rec.fails.push(() => {
    m.roughnessMap = null;
    m.aoMap = null;
    m.metalnessMap = null;
    m.roughness = o.fbRough ?? 0.85;
    m.needsUpdate = true;
  });
  return patchSV(m);
}
export function plain(o) {
  return patchSV(new THREE.MeshStandardMaterial(Object.assign({ roughness: 0.85, metalness: 0 }, o)));
}
// ---------- glTF models ----------
export const MODELS = window.MODELMAN || {}; // {id:{file,bbox:[x,y,z]}} injected at build
// each glTF is parsed once (textures decoded once, shared by every copy); a copy merges its meshes per material (one draw call per material, not per part)
const GLB_CACHE = {};
// quantized glTF attributes (KHR_mesh_quantization: normalized integers, scale in the node) → plain floats before baking a transform into them
export function toFloatAttrs(g) {
  for (const n of Object.keys(g.attributes)) {
    const a = g.attributes[n];
    if (a.array instanceof Float32Array && !a.normalized) continue;
    const f = new Float32Array(a.count * a.itemSize);
    for (let i = 0; i < a.count; i++) for (let k = 0; k < a.itemSize; k++) f[i * a.itemSize + k] = a.getComponent(i, k);
    g.setAttribute(n, new THREE.BufferAttribute(f, a.itemSize));
  }
  return g;
}
function mergeByMaterial(root) {
  root.updateMatrixWorld(true);
  const inv = root.matrixWorld.clone().invert();
  const groups = new Map();
  root.traverse(o => {
    if (
      o.isMesh &&
      !o.isSkinnedMesh &&
      !o.isInstancedMesh &&
      !Array.isArray(o.material) &&
      !(o.morphTargetInfluences && o.morphTargetInfluences.length)
    ) {
      const k = o.material.uuid;
      let a = groups.get(k);
      if (!a) groups.set(k, (a = []));
      a.push(o);
    }
  });
  for (const list of groups.values()) {
    if (list.length < 2) continue;
    try {
      let geos = list.map(o => {
        let g = o.geometry;
        if (Object.values(g.attributes).some(a => a.isInterleavedBufferAttribute))
          g = BufferGeometryUtils.deinterleaveGeometry(g.clone()) || g;
        g = toFloatAttrs(g.clone());
        g.applyMatrix4(new THREE.Matrix4().multiplyMatrices(inv, o.matrixWorld));
        g.morphAttributes = {};
        return g;
      });
      const names = Object.keys(geos[0].attributes).filter(n =>
        geos.every(g => g.attributes[n] && g.attributes[n].itemSize === geos[0].attributes[n].itemSize)
      );
      for (const g of geos) for (const n of Object.keys(g.attributes)) if (!names.includes(n)) g.deleteAttribute(n);
      if (!geos.every(g => g.index)) geos = geos.map(g => (g.index ? g.toNonIndexed() : g));
      const mg = BufferGeometryUtils.mergeGeometries(geos, false);
      if (!mg) continue;
      const m = new THREE.Mesh(mg, list[0].material);
      m.castShadow = list.some(o => o.castShadow);
      m.receiveShadow = true;
      m.name = list[0].name;
      root.add(m);
      for (const o of list) o.parent.remove(o);
    } catch (e) {
      /* keep the separate parts */
    }
  }
  return root;
}
export function loadModel(id, cb, matFix) {
  const mm = MODELS[id];
  if (!mm) {
    cb(null);
    return;
  }
  const done = src => {
    if (!src) {
      cb(null);
      return;
    }
    const sc = src.clone(true);
    sc.traverse(o => {
      if (o.isMesh) {
        o.castShadow = true;
        o.receiveShadow = true;
        if (matFix) o.material = matFix(o.material, o) || o.material;
      }
    });
    cb(mergeByMaterial(sc));
  };
  let c = GLB_CACHE[id];
  if (c) {
    if (c.scene) done(c.scene);
    else c.wait.push(done);
    return;
  }
  c = GLB_CACHE[id] = { scene: null, wait: [done] };
  GLL.load(
    BASE + 'models/' + mm.file,
    g => {
      g.scene.traverse(o => {
        if (o.isMesh) {
          const ms = Array.isArray(o.material) ? o.material : [o.material];
          ms.forEach(mt => {
            if (mt.isMeshStandardMaterial) {
              patchSV(mt);
              if (mt.map) mt.map.anisotropy = ANISO;
              if (mt.alphaTest > 0 || mt.transparent) {
                mt.side = THREE.DoubleSide;
              }
            }
          });
        }
      });
      c.scene = g.scene;
      c.wait.splice(0).forEach(f => f(g.scene));
    },
    undefined,
    () => {
      c.wait.splice(0).forEach(f => f(null));
      delete GLB_CACHE[id];
    }
  );
}
// render requests: a new frame (frame) and a new shadow map (shadow) are due – set through markDirty, cleared by the render loops
export const DIRTY = { frame: true, shadow: true };
export function markDirty(shadow) {
  DIRTY.frame = true;
  if (shadow) DIRTY.shadow = true;
}
// ---------- vegetation: one InstancedMesh per spatial cell, so frustum culling works; small detail additionally fades out of the draw list beyond maxD ----------
// Inside the house (walls all round) the far rule is halved; near tree cells switch between full and thinned leaf cards (lod pairs).
export const VEG = {
  far: [],
  lod: [],
  last: new THREE.Vector3(1e9, 0, 0),
  k: -1,
  update(p) {
    const k = window.inHouseNow && inHouseNow() ? 0.5 : 1;
    if (p.distanceToSquared(this.last) < 1 && k === this.k) return;
    this.last.copy(p);
    this.k = k;
    for (const im of this.far) {
      const bs = im.boundingSphere;
      if (bs) im.visible = bs.center.distanceTo(p) - bs.radius < im.userData.maxD * k;
    }
    for (const L of this.lod) {
      const bs = L.hi.boundingSphere;
      if (!bs) continue;
      const near = bs.center.distanceTo(p) - bs.radius < L.d;
      L.hi.visible = near;
      L.lo.visible = !near;
    }
  },
};
window.VEG = VEG;
export function cellsOf(items, cell, key) {
  const m = new Map();
  for (const it of items) {
    const k = key ? key(it) : Math.floor(it.x / cell) + ':' + Math.floor(it.y / cell);
    let a = m.get(k);
    if (!a) m.set(k, (a = []));
    a.push(it);
  }
  return [...m.values()];
}
export function vegReady(im, maxD) {
  im.frustumCulled = true;
  im.computeBoundingSphere();
  if (maxD) {
    im.userData.maxD = maxD;
    VEG.far.push(im);
  }
  return im;
}
// ---------- instancing of glTF variants (trees, grass clumps, ferns ...) ----------
export function loadGLBRaw(id, cb) {
  const mm = MODELS[id];
  if (!mm) {
    cb(null);
    return;
  }
  GLL.load(
    BASE + 'models/' + mm.file,
    g => cb(g),
    undefined,
    () => cb(null)
  );
}
export function variantParts(g, mm) {
  g.scene.updateMatrixWorld(true);
  const vars = [];
  const nodes = mm.nodes && mm.nodes.length > 1 && !mm.single ? mm.nodes : [null];
  for (const n of nodes) {
    const root = n ? g.scene.getObjectByName(n.name) : g.scene;
    if (!root) continue;
    const T = new THREE.Matrix4().makeTranslation(...(n ? n.origin.map(v => -v) : [0, 0, 0]));
    const parts = [];
    root.traverse(o => {
      if (o.isMesh) parts.push({ geo: o.geometry, mat: o.material, local: T.clone().multiply(o.matrixWorld) });
    });
    if (parts.length) vars.push({ parts, name: n ? n.name : '' });
  }
  return vars;
}
// leaf cards of a glTF tree (each card its own vertex island): keep a share of the cards and enlarge them – same crown density, fewer triangles
function thinIslands(geo, keep, grow) {
  const g = geo.index ? geo.clone() : null;
  if (!g) return geo;
  const idx = g.index.array,
    P = g.attributes.position,
    n = P.count;
  const par = new Int32Array(n);
  for (let i = 0; i < n; i++) par[i] = i;
  const find = a => {
    while (par[a] !== a) {
      par[a] = par[par[a]];
      a = par[a];
    }
    return a;
  };
  for (let t = 0; t < idx.length; t += 3) {
    const a = find(idx[t]),
      b = find(idx[t + 1]),
      c = find(idx[t + 2]);
    if (b !== a) par[b] = a;
    const c2 = find(c);
    if (c2 !== a) par[c2] = a;
  }
  const isl = new Map();
  for (let t = 0; t < idx.length; t += 3) {
    const r = find(idx[t]);
    let e = isl.get(r);
    if (!e) isl.set(r, (e = []));
    e.push(t);
  }
  if (isl.size < 50) return geo; // not a card mesh
  const out = [],
    v = new THREE.Vector3(),
    c = new THREE.Vector3(),
    done = new Uint8Array(n);
  for (const [r, tris] of isl) {
    const h = Math.sin(r * 12.9898) * 43758.5453;
    if (h - Math.floor(h) > keep) continue;
    const vs = new Set();
    for (const t of tris) for (let k = 0; k < 3; k++) vs.add(idx[t + k]);
    c.set(0, 0, 0);
    for (const i of vs) c.add(v.fromBufferAttribute(P, i));
    c.multiplyScalar(1 / vs.size);
    for (const i of vs) {
      if (done[i]) continue;
      done[i] = 1;
      v.fromBufferAttribute(P, i).sub(c).multiplyScalar(grow).add(c);
      P.setXYZ(i, v.x, v.y, v.z);
    }
    for (const t of tris) out.push(idx[t], idx[t + 1], idx[t + 2]);
  }
  g.setIndex(out);
  return g;
}
export function instanceVariants(id, items, o = {}) {
  loadGLBRaw(id, g => {
    if (!g) {
      if (o.fail) o.fail();
      return;
    }
    const vars = variantParts(g, MODELS[id]);
    if (!vars.length) return;
    if (o.thin)
      for (const vr of vars)
        for (const part of vr.parts) {
          const mt = Array.isArray(part.mat) ? part.mat[0] : part.mat,
            nm = (mt.map && mt.map.name) || mt.name || '';
          if (o.thin.match.test(nm)) part.geo = thinIslands(part.geo, o.thin.keep, o.thin.grow);
        }
    const by = vars.map(() => []);
    items.forEach(it => {
      const v = (it.v ?? -1) >= 0 ? it.v % vars.length : Math.floor(rnd() * vars.length);
      by[v].push(it);
    });
    const m4 = new THREE.Matrix4(),
      q = new THREE.Quaternion(),
      up = new THREE.Vector3(0, 1, 0),
      sc = new THREE.Vector3(),
      out = new THREE.Matrix4();
    vars.forEach((vr, vi) => {
      const all = by[vi];
      if (!all.length) return;
      for (const part of vr.parts) {
        const mats = Array.isArray(part.mat) ? part.mat : [part.mat];
        let depthMat = null;
        mats.forEach(mt => {
          if (mt.isMeshStandardMaterial) {
            patchSV(mt);
            if (mt.alphaTest > 0 || mt.transparent) {
              mt.side = THREE.DoubleSide;
              mt.transparent = false;
              mt.alphaTest = Math.max(mt.alphaTest, 0.45);
            }
            if (o.tint) mt.color.multiply(new THREE.Color(o.tint));
            if (o.env != null) mt.envMapIntensity = o.env;
          }
        });
        for (const list of o.cell ? cellsOf(all, o.cell) : [all]) {
          const im = new THREE.InstancedMesh(part.geo, part.mat, list.length);
          list.forEach((it, i) => {
            q.setFromAxisAngle(up, it.rot ?? rnd() * 6.283);
            const s = it.s ?? 1;
            if (Array.isArray(s)) sc.set(s[0], s[1], s[2]);
            else sc.set(s, s, s);
            m4.compose(V(it.x, it.y, it.z ?? 0), q, sc);
            out.multiplyMatrices(m4, part.local);
            im.setMatrixAt(i, out);
            if (it.c != null) im.setColorAt(i, new THREE.Color(it.c, it.c, it.c));
          });
          im.castShadow = o.cast ?? true;
          im.receiveShadow = true;
          im.userData.noMerge = true;
          vegReady(im, o.maxD);
          if (o.cast !== false && mats.some(mt => mt.alphaTest > 0 && mt.map)) {
            const mt = mats.find(mm2 => mm2.alphaTest > 0 && mm2.map);
            im.customDepthMaterial =
              depthMat ||
              (depthMat = new THREE.MeshDepthMaterial({
                depthPacking: THREE.RGBADepthPacking,
                map: mt.map,
                alphaTest: mt.alphaTest,
              }));
          }
          (o.parent || scene).add(im);
          if (o.list) o.list.push(im);
        }
      }
    });
    markDirty(true);
    if (o.done) o.done();
  });
}
