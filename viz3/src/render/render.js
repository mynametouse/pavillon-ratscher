// ---------------- rendering: one fixed pipeline (scene with ambient occlusion → tone mapping → SMAA) for every frame ----------------
// The quality tier (resolution, AO quality) is chosen once while the loading screen is up, by timing a few frames on this GPU; it never
// changes on its own while someone looks around (switching looked like flicker). The "Grafik" button cycles the tiers by hand.
import * as THREE from 'three';
import { RGBELoader } from 'three/examples/jsm/loaders/RGBELoader.js';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { ShaderPass } from 'three/examples/jsm/postprocessing/ShaderPass.js';
import { SMAAPass } from 'three/examples/jsm/postprocessing/SMAAPass.js';
import { N8AOPass } from 'n8ao';
import { LATE } from '../core/late.js';
import { SAVE } from '../core/save.js';
import { BASE, cam, DPR, HQ0, OFFLINE, QS, R, scene, stage, VARIANT } from '../core/head.js';
import { FIGSH, GI, LM, LOAD, LOADLOG, markDirty, SV } from '../core/assets.js';
import { PHN } from '../core/geo.js';
import { GLCHECK } from '../core/detail.js';
import { pmrem, sun, sunDir } from '../garden/env.js';
export const TIERS = {
  hoch: { label: 'hoch', pr: Math.min(DPR, 1.5), ao: 'Medium' },
  mittel: { label: 'mittel', pr: Math.min(DPR, 1.0), ao: 'Performance' },
  schnell: { label: 'schnell', pr: Math.min(DPR, 1.0) * 0.8, ao: null },
};
export const TIER_ORDER = ['hoch', 'mittel', 'schnell'];
export let TIER_USER = null;
try {
  const t = SAVE.raw('pav-tier');
  if (TIERS[t]) TIER_USER = t;
} catch (e) {}
export const RENDER = {
  tier: TIER_USER || (HQ0 ? 'hoch' : 'mittel'),
  composer: null,
  ao: null,
  rp: null,
  smaa: null,
  bench: null,
  get hq() {
    return this.tier !== 'schnell';
  },
};
function buildComposer() {
  const w = Math.max(2, stage.clientWidth || window.innerWidth),
    h = Math.max(2, stage.clientHeight || window.innerHeight);
  const comp = new EffectComposer(R);
  RENDER.composer = comp;
  const rp = new RenderPass(scene, cam);
  comp.addPass(rp);
  RENDER.rp = rp;
  try {
    const ao = new N8AOPass(scene, cam, w, h);
    ao.configuration.aoRadius = 0.4;
    ao.configuration.distanceFalloff = 1.0;
    ao.configuration.intensity = 2.2;
    ao.configuration.color = new THREE.Color(0x0d0b09);
    ao.configuration.gammaCorrection = false;
    // no extra transparency passes (they re-render the scene twice per frame); glass simply shows the AO of what is behind it
    ao.autoDetectTransparency = false;
    ao.configuration.transparencyAware = false;
    ao.configuration.halfRes = true;
    ao.configuration.depthAwareUpsampling = true;
    comp.addPass(ao);
    RENDER.ao = ao;
  } catch (e) {
    console.warn('AO aus', e);
    RENDER.ao = null;
  }
  comp.addPass(new OutputPass());
  comp.addPass(gradePass());
  try {
    const sm = new SMAAPass(w * R.getPixelRatio(), h * R.getPixelRatio());
    comp.addPass(sm);
    RENDER.smaa = sm;
  } catch (e) {
    console.warn('SMAA aus', e);
  }
}
// photographic finish after tone mapping: a touch of contrast and colour (AgX alone is a little flat) and a soft lens vignette
export const GRADE = { contrast: { value: 1.06 }, sat: { value: 1.08 }, vig: { value: 0.32 }, lift: { value: 0.0 } };
function gradePass() {
  return new ShaderPass({
    uniforms: Object.assign({ tDiffuse: { value: null } }, GRADE),
    vertexShader:
      'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
    fragmentShader: `uniform sampler2D tDiffuse; uniform float contrast, sat, vig, lift; varying vec2 vUv;
    void main(){ vec4 c = texture2D(tDiffuse, vUv); vec3 x = c.rgb; float l = dot(x, vec3(0.2126, 0.7152, 0.0722));
      x = mix(vec3(l), x, sat); x = (x - 0.5) * contrast + 0.5 + lift; vec2 d = vUv - 0.5; x *= 1.0 - vig * dot(d, d) * 1.4;
      gl_FragColor = vec4(clamp(x, 0.0, 1.0), c.a); }`,
  });
}
buildComposer();
// ---- motion quality: while the camera moves, frames come from a cheaper path (lower resolution, no ambient occlusion, no SMAA);
// as soon as it stands still for a moment, one full-quality frame. The motion resolution adapts to the measured frame rate (target ≥ 50 fps). ----
export const MLEVELS = [0, 1.0, 0.85, 0.72, 0.6, 0.5]; // 0 = moving frames in full quality (fast GPUs); then resolution factors of the still quality
export const MOTION = {
  comp: null,
  level: 2,
  lastMove: -1e9,
  stillDue: false,
  lastStill: -1e9,
  stillMs: 30,
  buf: [],
  lastT: 0,
  lastDown: -1e9,
  lastUp: -1e9,
  sig: new Float64Array(8),
  frames: 0,
};
function buildMotion() {
  const comp = new EffectComposer(R);
  comp.addPass(new RenderPass(scene, cam));
  comp.addPass(new OutputPass());
  comp.addPass(gradePass());
  MOTION.comp = comp;
  sizeMotion();
}
export function sizeMotion() {
  if (!MOTION.comp) return;
  const w = Math.max(2, stage.clientWidth || window.innerWidth),
    h = Math.max(2, stage.clientHeight || window.innerHeight);
  const f = MLEVELS[MOTION.level] || 1;
  MOTION.comp.setPixelRatio(OFFLINE ? 1 : Math.max(0.42, TIERS[RENDER.tier].pr * f));
  MOTION.comp.setSize(w, h);
}
function setMotionLevel(l) {
  l = Math.max(0, Math.min(MLEVELS.length - 1, l));
  if (l === MOTION.level) return;
  MOTION.level = l;
  sizeMotion();
}
// camera signature: did the view change since the last frame?
export function camMoved() {
  const s = MOTION.sig,
    p = cam.position,
    q = cam.quaternion,
    v = [p.x, p.y, p.z, q.x, q.y, q.z, q.w, cam.fov];
  let m = false;
  for (let i = 0; i < 8; i++) {
    if (Math.abs(v[i] - s[i]) > 1e-5) m = true;
    s[i] = v[i];
  }
  return m;
}
// adapt the motion resolution: median of the last 30 intervals between consecutive moving frames
export function motionTrack(now) {
  const dt = now - MOTION.lastT;
  MOTION.lastT = now;
  if (dt > 0 && dt < 250) MOTION.buf.push(dt);
  if (MOTION.buf.length < 30) return;
  const b = MOTION.buf.sort((p, q) => p - q),
    med = b[b.length >> 1];
  MOTION.buf = [];
  if (TIER_USER === 'fix') return;
  if (med > 20.5 && MOTION.level < MLEVELS.length - 1) {
    setMotionLevel(MOTION.level + 1);
    MOTION.lastDown = now;
  } else if (med < 17.6 && MOTION.level > 0 && now - MOTION.lastDown > 5000 && now - MOTION.lastUp > 2500) {
    setMotionLevel(MOTION.level - 1);
    MOTION.lastUp = now;
  }
}
buildMotion();
export function applyTier(name, save) {
  const T = TIERS[name] || TIERS.mittel;
  RENDER.tier = name;
  const aoOn = !!(T.ao && RENDER.ao);
  if (RENDER.ao) {
    RENDER.ao.enabled = aoOn;
    if (aoOn) RENDER.ao.setQualityMode(T.ao);
  }
  if (RENDER.rp) RENDER.rp.enabled = !aoOn;
  R.setPixelRatio(OFFLINE ? 1 : T.pr);
  if (save) {
    TIER_USER = name;
    try {
      SAVE.setRaw('pav-tier', name);
    } catch (e) {}
  }
  if (window._resize) window._resize();
  sizeMotion();
  markDirty();
}
export function setQuality(v) {
  const name = typeof v === 'string' ? v : v ? 'hoch' : 'schnell';
  applyTier(name, true);
}
export function nextTier() {
  const i = TIER_ORDER.indexOf(RENDER.tier);
  setQuality(TIER_ORDER[(i + 1) % TIER_ORDER.length]);
}
applyTier(RENDER.tier, false);
export function renderFrame(kind) {
  if (window.PREFRAME) window.PREFRAME();
  if (window.FIGSHADOW) window.FIGSHADOW();
  if (kind === 'motion' && MOTION.level > 0 && MOTION.comp) MOTION.comp.render();
  else if (RENDER.composer) RENDER.composer.render();
  else R.render(scene, cam);
}
// ---- GPU preparation while the loading screen is visible: compile every shader in parallel, upload every texture, then time a few frames ----
const nextFrame = () => new Promise(r => requestAnimationFrame(() => r()));
// V16b2: what draws the pictures. A software renderer (no graphics card: SwiftShader, Windows' "Microsoft Basic Render Driver", llvmpipe)
// draws every frame on the processor – seconds per frame at full size. There the lightest tier is set at once and nothing is timed:
// timing six frames per tier took minutes and looked like a hang at "100 %" (Falko, 22.10.2026).
export const GLINFO = (() => {
  let r = '';
  try {
    const gl = R.getContext(),
      d = gl.getExtension('WEBGL_debug_renderer_info');
    r = String((d && gl.getParameter(d.UNMASKED_RENDERER_WEBGL)) || gl.getParameter(gl.RENDERER) || '');
  } catch (e) {}
  return { renderer: r, soft: /swiftshader|basic render|llvmpipe|softpipe|software/i.test(r) };
})();
LATE.GLINFO = GLINFO;
window.GLINFO = GLINFO;
// V16b3: decided at once, not only after loading – every frame on a software renderer is cheap from the start
if (GLINFO.soft && !TIER_USER && !OFFLINE && RENDER.tier !== 'schnell') applyTier('schnell', false);
// and the sun's shadow map smaller and with the plain filter there: its one-time drawing took ~14 s on a PC without graphics card
if (GLINFO.soft && !OFFLINE) {
  R.shadowMap.type = THREE.PCFShadowMap;
  if (sun.shadow.mapSize.x > 1024) sun.shadow.mapSize.set(1024, 1024);
}
function timeOne() {
  const gl = R.getContext(),
    px = new Uint8Array(4),
    a = performance.now();
  renderFrame();
  gl.readPixels(0, 0, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, px);
  return performance.now() - a;
}
function timeFrames(n) {
  const gl = R.getContext(),
    px = new Uint8Array(4),
    ts = [];
  for (let i = 0; i < n + 2; i++) {
    const a = performance.now();
    renderFrame();
    gl.readPixels(0, 0, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, px);
    if (i >= 2) ts.push(performance.now() - a);
  }
  ts.sort((a, b) => a - b);
  return ts[Math.floor(ts.length / 2)];
}
// V16b3: nothing in the preparation may block the page for long. On Windows every shader goes through Direct3D's compiler (0.3–1.4 s each
// on a PC without graphics card, 129 programs), and the old "one frame with everything" uploaded ~300 megapixels of textures in one go
// (65 s there) – the page froze for minutes at "100 %" (Falko, 22.10.2026). Now: shaders compile in the background with a count on the
// loading screen (KHR_parallel_shader_compile: readiness is asked without waiting), textures go up one by one between short pauses, and a
// software renderer uploads only what the first picture shows (the rest when it comes into view). LOAD.alive marks progress: the boot
// fallback opens the page only when nothing has moved for a while, never in the middle of a running step.
const sleep = ms => new Promise(r => setTimeout(r, ms));
// V16b4: compile() of the whole scene handed every program to the driver in one go and the page waited until the GPU process had taken
// them all – half a minute frozen on the test PC, minutes on Falko's laptop, and the screen still said „Modell wird aufgebaut …“ (the new text
// is only painted after the task). Now object by object: a few new programs, then wait (without blocking) until the driver has them, paint
// the count, go on. The same programs as before, in the render-target variant the composer uses.
async function compileShown(say) {
  const gl = R.getContext(),
    ext = gl.getExtension('KHR_parallel_shader_compile');
  const rt = new THREE.WebGLRenderTarget(4, 4, { type: THREE.HalfFloatType });
  // one object per material (compile() walks the whole scene for its lights on every call: objects whose materials have a program already
  // are skipped), at the end one pass over everything for the few variants left (instanced, skinned …)
  const objs = [],
    seen = new Set(),
    mats = o => (Array.isArray(o.material) ? o.material : [o.material]);
  scene.traverse(o => {
    if ((o.isMesh || o.isPoints || o.isLine || o.isSprite) && o.material && mats(o).some(m => m && !seen.has(m))) {
      mats(o).forEach(m => seen.add(m));
      objs.push(o);
    }
  });
  const has = o =>
    mats(o).every(m => {
      const mp = m && R.properties.get(m);
      return !m || (mp && mp.programs && mp.programs.size);
    });
  const progs = () => R.info.programs || [],
    ready = p => {
      if (p._pavReady) return true;
      try {
        if (
          ext
            ? gl.getProgramParameter(p.program, ext.COMPLETION_STATUS_KHR)
            : (gl.getProgramParameter(p.program, gl.LINK_STATUS), true)
        )
          p._pavReady = true;
      } catch (e) {
        p._pavReady = true;
      }
      return !!p._pavReady;
    };
  const tell = i => {
    LOAD.alive = performance.now();
    say && say('Grafik wird vorbereitet … Shader ' + Math.min(i, objs.length) + ' von ' + objs.length);
  }; // counted by material
  // the new programs: with the extension ask without waiting until they are done; without it the driver finishes each one when asked
  const settle = async (fresh, i) => {
    if (ext) {
      const w0 = performance.now();
      while (fresh.some(p => !ready(p))) {
        tell(i);
        await sleep(30);
        if (performance.now() - w0 > 30000) {
          console.warn('compile: a program takes > 30 s');
          break;
        }
      }
    } else
      for (const p of fresh) {
        const a = performance.now();
        ready(p);
        if (performance.now() - a > 40) {
          tell(i);
          await sleep(0);
        }
      }
  }; // one at a time, a breath after a slow one
  let i = 0;
  while (i < objs.length) {
    // a portion: objects until 3 new programs were made or 30 ms have passed
    const n0 = progs().length,
      t0 = performance.now();
    try {
      R.setRenderTarget(rt);
      while (i < objs.length && progs().length - n0 < (ext ? 3 : 1) && performance.now() - t0 < 30) {
        if (!has(objs[i])) R.compile(objs[i], cam, scene);
        i++;
      }
    } catch (e) {
      console.warn('compile', e);
      i++;
    } finally {
      R.setRenderTarget(null);
    }
    await settle(progs().slice(n0), i);
    tell(i);
    await sleep(0);
  }
  {
    const n0 = progs().length;
    try {
      R.setRenderTarget(rt);
      R.compile(scene, cam);
    } catch (e) {
      console.warn('compile', e);
    } finally {
      R.setRenderTarget(null);
    }
    await settle(progs().slice(n0), objs.length);
  }
  tell(objs.length);
  rt.dispose();
}
async function uploadTextures(say, seenOnly) {
  const set = new Set(),
    add = t => {
      if (t && t.isTexture && !t.isRenderTargetTexture && t.image && (t.image.width || t.image.data || t.image.length))
        set.add(t);
    };
  let fr = null;
  if (seenOnly) {
    LATE.applyCam();
    cam.updateMatrixWorld();
    fr = new THREE.Frustum().setFromProjectionMatrix(
      new THREE.Matrix4().multiplyMatrices(cam.projectionMatrix, cam.matrixWorldInverse)
    );
  }
  (fr ? scene.traverseVisible : scene.traverse).call(scene, o => {
    if (fr && (o.isMesh || o.isPoints || o.isLine) && o.frustumCulled && !fr.intersectsObject(o)) return;
    const ms = o.material ? (Array.isArray(o.material) ? o.material : [o.material]) : [];
    for (const m of ms) {
      for (const k in m) {
        const v = m[k];
        if (v && v.isTexture) add(v);
      }
      if (m.uniforms)
        for (const k in m.uniforms) {
          const u = m.uniforms[k];
          if (u && u.value) Array.isArray(u.value) ? u.value.forEach(add) : add(u.value);
        }
    }
  });
  const list = [...set];
  let n = 0,
    slice = performance.now();
  for (const t of list) {
    try {
      R.initTexture(t);
    } catch (e) {}
    n++;
    if (performance.now() - slice > 40) {
      LOAD.alive = performance.now();
      say && say('Grafik wird vorbereitet … Texturen ' + n + ' von ' + list.length);
      await sleep(0);
      slice = performance.now();
    }
  }
  return list.length;
}
export async function prepareGPU(say) {
  const t0 = performance.now(),
    step = t => say && say('Grafik wird vorbereitet … ' + t);
  const soft = GLINFO.soft && !TIER_USER && !OFFLINE;
  if (soft) {
    applyTier('schnell', false);
    LATE.resize();
    RENDER.bench = { soft: 1 };
  }
  // V16b4: the light way (as for a software renderer) on every device: only the textures in view, no frame of everything – that frame was
  // seconds of GPU work on a laptop, enough for a driver reset, and the full upload is too much graphics memory for a phone
  const qp = (location.search.match(/[?&]prep=(lite|full)/) || [])[1],
    mobile =
      /iPhone|iPad|iPod|Android/i.test(navigator.userAgent) ||
      (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  // (Falko's laptop hung while loading, 22.10.2026; ?prep=full for comparisons)
  const lite = !OFFLINE && (soft || qp !== 'full');
  RENDER.lite = lite;
  LOADLOG.note(
    'Vorbereitung ' +
      (lite ? 'sparsam' : 'voll') +
      (mobile ? ' (Mobilgerät)' : '') +
      (LOADLOG.prev ? ' (nach abgebrochenem Versuch)' : ''),
    true
  );
  // 1) all scene materials in the render-target variant the composer uses – in the background, the count on the loading screen
  step('Shader');
  LOAD.alive = performance.now();
  await compileShown(say);
  // 2) textures to the GPU one by one; then (hardware) one frame with culling off for the shadow-map programs and post passes, with the hidden
  //    design variant shown for this one frame (switching variants later uploads nothing). A software renderer skips both: every texture
  //    there costs a second, and a frame of everything many more – the first picture comes first, the rest when it is seen
  if (!lite) {
    RENDER.texN = await uploadTextures(say);
    step('erstes Bild');
    LOAD.alive = performance.now();
    await nextFrame();
    const off = [],
      shown = [],
      phOn = o =>
        o.userData.ph === undefined ||
        (o.userData.ph <= LATE.PHASE && (o.userData.phEnd === undefined || LATE.PHASE < o.userData.phEnd));
    scene.traverse(o => {
      if (o.isMesh && o.frustumCulled) {
        off.push(o);
        o.frustumCulled = false;
      }
      if (o.userData.var && !o.visible && phOn(o)) {
        shown.push(o);
        o.visible = true;
      }
    });
    R.shadowMap.needsUpdate = true;
    LATE.applyCam();
    renderFrame();
    for (const o of off) o.frustumCulled = true;
    for (const o of shown) o.visible = false;
    R.shadowMap.needsUpdate = true;
  } else {
    RENDER.texN = await uploadTextures(say, true);
    step('erstes Bild');
    LOAD.alive = performance.now();
    await nextFrame();
    R.shadowMap.needsUpdate = true;
    LATE.applyCam();
  }
  LOAD.alive = performance.now();
  await nextFrame();
  renderFrame();
  await nextFrame();
  renderFrame('motion');
  await nextFrame();
  LOAD.alive = performance.now();
  // 3) pick the tier once (unless chosen by hand earlier): one probe frame first – a slow GPU goes straight to the lightest tier
  //    (still frames are drawn only when the view stops, so they may take longer; moving frames get their own, cheaper path)
  if (!TIER_USER && !OFFLINE && !soft) {
    step('Grafikkarte testen');
    LOAD.alive = performance.now();
    await nextFrame();
    let name = RENDER.tier,
      ms = timeOne();
    RENDER.bench = { probe: Math.round(ms) };
    if (ms > 250 && name !== 'schnell') {
      name = 'schnell';
      applyTier(name, false);
      LATE.resize();
      renderFrame();
      await nextFrame();
      ms = timeOne();
      RENDER.bench[name] = Math.round(ms);
    } else {
      ms = timeFrames(4);
      RENDER.bench[name] = Math.round(ms);
      while (ms > 45 && name !== 'schnell') {
        name = ms > 150 ? 'schnell' : TIER_ORDER[TIER_ORDER.indexOf(name) + 1];
        applyTier(name, false);
        LATE.resize();
        renderFrame();
        await nextFrame();
        ms = timeFrames(name === 'schnell' ? 1 : 4);
        RENDER.bench[name] = Math.round(ms);
      }
    }
  }
  {
    const ms = soft ? 999 : (RENDER.bench && Object.values(RENDER.bench).pop()) || 30;
    MOTION.stillMs = Math.min(ms, 400);
    setMotionLevel(OFFLINE ? 0 : ms <= 12 ? 0 : ms <= 18 ? 1 : ms <= 26 ? 2 : ms <= 36 ? 3 : 4);
  }
  if (window.GLCHECK) GLCHECK.guard(); // V16b1: a program with more textures than this GPU allows → plain ground instead of none
  RENDER.prepMs = Math.round(performance.now() - t0);
  markDirty(true);
}
// ---------------- HDRI per time of day (aligned with the modelled sun) ----------------
const HDRI = window.HDRIMAN || {}; // {day:{file,sun_u}, ...}
const envCache = {},
  envBusy = {};
let envWant = null;
// a prefiltered image light per mood: the render target when it is there, else null (and it is fetched and prefiltered once)
export function envLoad(mode) {
  const h = HDRI[mode];
  if (!h) return null;
  if (envCache[mode]) return envCache[mode];
  if (envBusy[mode]) return null;
  envBusy[mode] = true;
  new THREE.FileLoader(LM).setResponseType('json').load(
    BASE + 'hdri/' + h.file,
    j => {
      const bin = atob(j.b64),
        u8 = new Uint8Array(bin.length);
      for (let i = 0; i < u8.length; i++) u8[i] = bin.charCodeAt(i);
      const rl = new RGBELoader().setDataType(THREE.FloatType);
      const img = rl.parse(u8.buffer);
      if (!img) {
        delete envBusy[mode];
        return;
      }
      // the sun disc is drawn by the shadow-casting light; clip it out of the image light so shadows stay crisp
      {
        const d = img.data,
          cap = h.cap || 6.0;
        for (let i = 0; i < d.length; i += 4) {
          const l = Math.max(d[i], d[i + 1], d[i + 2]);
          if (l > cap) {
            const k = cap / l;
            d[i] *= k;
            d[i + 1] *= k;
            d[i + 2] *= k;
          }
        }
      }
      const tex = new THREE.DataTexture(img.data, img.width, img.height, THREE.RGBAFormat, THREE.FloatType);
      tex.colorSpace = THREE.LinearSRGBColorSpace;
      tex.flipY = true;
      tex.mapping = THREE.EquirectangularReflectionMapping;
      tex.needsUpdate = true;
      const rt = pmrem.fromEquirectangular(tex);
      tex.dispose();
      envCache[mode] = rt;
      delete envBusy[mode];
      if (window.DN && LATE.DN.active) LATE.DN.update(true);
      else envUse(mode, rt);
    },
    undefined,
    () => {
      delete envBusy[mode];
    }
  );
  return null;
}
function envUse(mode, rt) {
  if (envWant !== mode || (window.DN && LATE.DN.active)) return;
  const h = HDRI[mode];
  scene.environment = rt.texture;
  // three: equirect u -> phi = 2π(u-0.5) measured from +X towards +Z; our sun: phi_s = atan2(Z, X)
  const phiH = 2 * Math.PI * (h.sun_u - 0.5),
    phiS = Math.atan2(sunDir.z, sunDir.x);
  scene.environmentRotation.set(0, -(phiS - phiH) * (window.ENV_SIGN || 1), 0);
  markDirty();
}
export function setEnvFor(mode) {
  envWant = mode;
  const rt = envLoad(mode);
  if (rt) envUse(mode, rt);
}
// ---------------- baked sky-visibility volume (soft room-scale occlusion indoors) ----------------
// one volume per design variant (A: tower, B: ladder stairs); the active one is bound to the shared uniforms
const SVTEX = {};
export function svApply(key) {
  const e = SVTEX[key] || SVTEX.A || SVTEX.B;
  if (!e) return;
  const sv = e.man;
  SV.tex.value = e.t;
  SV.min.value.set(...sv.min);
  SV.size.value.set(...sv.size);
  SV.on.value = (window.PHASE ?? 99) >= PHN.egOSB ? 1 : 0;
  SV.floor.value = sv.floor ?? 0.15;
  if (sv.gain) SV.gain.value = sv.gain;
  markDirty();
}
function svLoad(sv, key) {
  if (!sv) return;
  const img = new Image();
  img.onload = () => {
    const [nx, ny, nz] = sv.dims,
      c = document.createElement('canvas');
    c.width = img.width;
    c.height = img.height;
    const g = c.getContext('2d', { willReadFrequently: true });
    g.drawImage(img, 0, 0);
    const d = g.getImageData(0, 0, img.width, img.height).data;
    const data = new Uint8Array(nx * ny * nz);
    const tilesX = sv.tilesX;
    for (let k = 0; k < nz; k++) {
      const tx = (k % tilesX) * nx,
        ty = Math.floor(k / tilesX) * ny;
      for (let j = 0; j < ny; j++)
        for (let i = 0; i < nx; i++) data[(k * ny + j) * nx + i] = d[((ty + j) * img.width + tx + i) * 4];
    }
    const t = new THREE.Data3DTexture(data, nx, ny, nz);
    t.format = THREE.RedFormat;
    t.type = THREE.UnsignedByteType;
    t.minFilter = t.magFilter = THREE.LinearFilter;
    t.wrapS = t.wrapT = t.wrapR = THREE.ClampToEdgeWrapping;
    t.unpackAlignment = 1;
    t.needsUpdate = true;
    // volume axes: tex x = three X, tex y = three Y(up), tex z = three Z
    SVTEX[key] = { t, man: sv };
    if (key === VARIANT || !SVTEX[VARIANT]) svApply(VARIANT);
  };
  img.src = (window.EMBED_URL && window.EMBED_URL[BASE + sv.file]) || BASE + sv.file;
}
svLoad(window.SVMAN, 'A');
svLoad(window.SVMAN_B, 'B');
// ---------------- baked global illumination (per design variant and light mode; only in the finished state, not in the plan view) ----------------
const GIMAN = { A: window.GIMAN_A || null, B: window.GIMAN_B || null },
  GITEX = {};
function giImg(file, man, cb) {
  const img = new Image();
  img.onload = () => {
    const [nx, ny, nz] = man.dims,
      c = document.createElement('canvas');
    c.width = img.width;
    c.height = img.height;
    const g = c.getContext('2d', { willReadFrequently: true });
    g.drawImage(img, 0, 0);
    const d = g.getImageData(0, 0, img.width, img.height).data;
    const data = new Uint8Array(nx * ny * nz * 4),
      tilesX = man.tilesX;
    for (let k = 0; k < nz; k++) {
      const tx = (k % tilesX) * nx,
        ty = Math.floor(k / tilesX) * ny;
      for (let j = 0; j < ny; j++)
        for (let i = 0; i < nx; i++) {
          const o = ((k * ny + j) * nx + i) * 4,
            q = ((ty + j) * img.width + tx + i) * 4;
          data[o] = d[q];
          data[o + 1] = d[q + 1];
          data[o + 2] = d[q + 2];
          data[o + 3] = 255;
        }
    }
    const t = new THREE.Data3DTexture(data, nx, ny, nz);
    t.format = THREE.RGBAFormat;
    t.type = THREE.UnsignedByteType;
    t.minFilter = t.magFilter = THREE.LinearFilter;
    t.wrapS = t.wrapT = t.wrapR = THREE.ClampToEdgeWrapping;
    t.unpackAlignment = 1;
    t.needsUpdate = true;
    cb(t);
  };
  img.onerror = () => cb(null);
  img.src = (window.EMBED_URL && window.EMBED_URL[BASE + file]) || BASE + file;
}
function giLoad(v, m) {
  const man = GIMAN[v],
    mm = man && man.modes && man.modes[m];
  if (!mm) return null;
  const key = v + '_' + m,
    e = GITEX[key];
  if (e === 'loading') return null;
  if (e) return e;
  GITEX[key] = 'loading';
  let a = null,
    b = null,
    n = 0;
  const done = () => {
    if (++n < 2) return;
    if (a && b) {
      GITEX[key] = { a, b, lo: mm.lo, hi: mm.hi };
      giApply();
    } else delete GITEX[key];
  };
  giImg(mm.a, man, t => {
    a = t;
    done();
  });
  giImg(mm.b, man, t => {
    b = t;
    done();
  });
  return null;
}
// V16a: between two moods the two baked volumes are mixed on the CPU (8 slices per frame) into one of two buffers; the other stays bound meanwhile.
// E = (1−k)·E1 + k·E2 per colour (decoded from the log encoding), the direction term weighted by brightness.
export const GIMIX = { job: null, ready: null, buf: [null, null] };
function giMix(v, man, ea, eb, key, k, pair) {
  if (GIMIX.ready && GIMIX.ready.key === key) return GIMIX.ready;
  const stale = GIMIX.ready && GIMIX.ready.pair === pair ? GIMIX.ready : null; // the same two moods at a nearby mix: shown until the new one is done
  if (GIMIX.job && GIMIX.job.key === key) return stale;
  const [nx, ny, nz] = man.dims,
    N = nx * ny * nz,
    bi = GIMIX.ready ? 1 - GIMIX.ready.bi : 0;
  let B = GIMIX.buf[bi];
  if (!B || B.n !== N) {
    const mk = () => {
      const t = new THREE.Data3DTexture(new Uint8Array(N * 4), nx, ny, nz);
      t.format = THREE.RGBAFormat;
      t.type = THREE.UnsignedByteType;
      t.minFilter = t.magFilter = THREE.LinearFilter;
      t.wrapS = t.wrapT = t.wrapR = THREE.ClampToEdgeWrapping;
      t.unpackAlignment = 1;
      return t;
    };
    B = GIMIX.buf[bi] = { a: mk(), b: mk(), n: N };
  }
  const lut = e => {
    const f = new Float32Array(256);
    for (let i = 0; i < 256; i++) f[i] = Math.pow(2, e.lo + (i / 255) * (e.hi - e.lo));
    return f;
  };
  GIMIX.job = {
    key,
    pair,
    bi,
    B,
    ea,
    eb,
    k,
    lo: Math.min(ea.lo, eb.lo),
    hi: Math.max(ea.hi, eb.hi),
    la: lut(ea),
    lb: lut(eb),
    z: 0,
    nz,
    sl: nx * ny,
  };
  return stale;
}
function giMixStep() {
  const J = GIMIX.job;
  if (!J) return;
  const A1 = J.ea.a.image.data,
    B1 = J.ea.b.image.data,
    A2 = J.eb.a.image.data,
    B2 = J.eb.b.image.data,
    OA = J.B.a.image.data,
    OB = J.B.b.image.data;
  const k = J.k,
    k1 = 1 - k,
    inv = 255 / (J.hi - J.lo),
    lo = J.lo,
    la = J.la,
    lb = J.lb,
    z1 = Math.min(J.nz, J.z + 8),
    cl = x => (x < 0 ? 0 : x > 255 ? 255 : Math.round(x));
  for (let i = J.z * J.sl * 4, e = z1 * J.sl * 4; i < e; i += 4) {
    const r1 = la[A1[i]],
      g1 = la[A1[i + 1]],
      b1 = la[A1[i + 2]],
      r2 = lb[A2[i]],
      g2 = lb[A2[i + 1]],
      b2 = lb[A2[i + 2]];
    OA[i] = cl((Math.log2(k1 * r1 + k * r2) - lo) * inv);
    OA[i + 1] = cl((Math.log2(k1 * g1 + k * g2) - lo) * inv);
    OA[i + 2] = cl((Math.log2(k1 * b1 + k * b2) - lo) * inv);
    OA[i + 3] = 255;
    const w1 = k1 * (r1 * 0.2126 + g1 * 0.7152 + b1 * 0.0722),
      w2 = k * (r2 * 0.2126 + g2 * 0.7152 + b2 * 0.0722),
      ws = 1 / Math.max(1e-12, w1 + w2);
    for (let c = 0; c < 3; c++)
      OB[i + c] = cl(((w1 * (B1[i + c] / 127.5 - 1) + w2 * (B2[i + c] / 127.5 - 1)) * ws + 1) * 127.5);
    OB[i + 3] = 255;
  }
  J.z = z1;
  if (J.z >= J.nz) {
    J.B.a.needsUpdate = true;
    J.B.b.needsUpdate = true;
    GIMIX.ready = { key: J.key, pair: J.pair, bi: J.bi, a: J.B.a, b: J.B.b, lo: J.lo, hi: J.hi };
    GIMIX.job = null;
    giApply();
  }
}
(window.TICKS = window.TICKS || []).push(giMixStep);
let GIVAR = null;
export function giApply() {
  const v = VARIANT,
    man = GIMAN[v];
  const W = window.DN && LATE.DN.active ? LATE.DN.giWant() : { a: window.MODE_NOW || 'day', b: null, k: 0, g: 1 };
  const want =
    !!(man && man.modes && man.modes[W.a]) &&
    !QS.get('nogi') &&
    (window.PHASE ?? 99) >= LATE.PHASES.length - 1 &&
    !(typeof LATE.P !== 'undefined' && LATE.P.mode === 'top');
  if (!want) {
    if (GI.on.value) {
      GI.on.value = 0;
      markDirty();
    }
    return;
  }
  const ea = giLoad(v, W.a),
    eb = W.b ? giLoad(v, W.b) : null;
  // while loading or mixing the volume shown stays (same variant); after a variant switch nothing is shown until the new one is there
  const hold = () => {
    if (GIVAR !== v && GI.on.value) {
      GI.on.value = 0;
      markDirty();
    }
    GI.k.value = W.g;
  };
  if (!ea || (W.b && !eb)) {
    hold();
    return;
  }
  const src = eb ? giMix(v, man, ea, eb, v + W.a + W.b + W.k, W.k, v + W.a + W.b) : ea;
  if (!src) {
    hold();
    return;
  }
  GI.a.value = src.a;
  GI.b.value = src.b;
  GI.lo.value = src.lo;
  GI.hi.value = src.hi;
  GI.min.value.set(...man.min);
  GI.size.value.set(...man.size);
  GI.k.value = W.g;
  GI.on.value = 1;
  GIVAR = v;
  markDirty();
}
window.giApply = giApply;
window.GI = GI;
window.FIGSH = FIGSH;
