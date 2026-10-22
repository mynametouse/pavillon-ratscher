// ---------- 360° panoramas: capture (used offline to render them) ----------
// Six square views with the full pipeline (shadows, ambient occlusion, SMAA), 100° wide so the screen-space effects have context at the seams;
// the cube is turned into an equirectangular image outside the browser (test/pano.py). Face basis (three.js coords): forward F, up U.
import * as THREE from 'three';
import { LATE } from '../core/late.js';
import { $, BASE, cam, DPR, R, stage, V, VARIANT } from '../core/head.js';
import { DIRTY, markDirty, VEG } from '../core/assets.js';
import { RENDER, renderFrame } from './render.js';
import { adaptExposure } from './modes.js';
import { EYE } from '../game/game.js';
Object.assign(LATE, { panoShow }); // functions for modules that load earlier: pavilion/variant.js
const PANO_FACES = [
  ['px', [1, 0, 0], [0, 1, 0]],
  ['nx', [-1, 0, 0], [0, 1, 0]],
  ['py', [0, 1, 0], [0, 0, 1]],
  ['ny', [0, -1, 0], [0, 0, -1]],
  ['pz', [0, 0, 1], [0, 1, 0]],
  ['nz', [0, 0, -1], [0, 1, 0]],
];
function panoCapture(x, y, zEye, size = 1152, fov = 100) {
  const w0 = stage.clientWidth,
    h0 = stage.clientHeight,
    pr0 = R.getPixelRatio(),
    fov0 = cam.fov;
  R.setPixelRatio(1);
  R.setSize(size, size, false);
  if (RENDER.composer) RENDER.composer.setSize(size, size);
  cam.aspect = 1;
  cam.fov = fov;
  cam.updateProjectionMatrix();
  if (window.VEG) {
    VEG.last.set(1e9, 0, 0);
    VEG.update(V(x, y, zEye));
  }
  const out = {},
    tgt = new THREE.Vector3();
  adaptExposure(0, true, [x, y, zEye - EYE]);
  for (const [n, f, u] of PANO_FACES) {
    cam.position.copy(V(x, y, zEye));
    cam.up.set(...u);
    cam.lookAt(tgt.copy(cam.position).add(new THREE.Vector3(...f)));
    cam.updateMatrixWorld();
    if (DIRTY.shadow) {
      R.shadowMap.needsUpdate = true;
      DIRTY.shadow = false;
    }
    renderFrame('still');
    out[n] = R.domElement.toDataURL('image/png');
  }
  adaptExposure(0, true);
  cam.up.set(0, 1, 0);
  cam.fov = fov0;
  R.setPixelRatio(pr0);
  R.setSize(w0, h0, false);
  if (RENDER.composer) RENDER.composer.setSize(w0, h0);
  cam.aspect = w0 / Math.max(1, h0);
  cam.updateProjectionMatrix();
  markDirty(true);
  return out;
}
window.panoCapture = panoCapture;
// ---------- 360° viewer (tab "360°"): pre-rendered panoramas per variant, drag to look, hotspots to walk on; smooth on any device ----------
const PANOMAN = window.PANOMAN || {};
const PANO = {
  r: null,
  scene: null,
  cam: null,
  mat: null,
  cur: null,
  yaw: 0,
  pitch: 0,
  fov: 78,
  on: false,
  cache: new Map(),
  drag: null,
  pinch: null,
  dirty: true,
};
LATE.PANO = PANO;
function panoList() {
  return (PANOMAN[VARIANT] || []).slice();
}
function panoInit() {
  if (PANO.r) return true;
  const host = $('panostage');
  if (!host) return false;
  const r = new THREE.WebGLRenderer({ antialias: false, powerPreference: 'high-performance' });
  r.setPixelRatio(Math.min(DPR, 2));
  r.outputColorSpace = THREE.LinearSRGBColorSpace;
  r.toneMapping = THREE.NoToneMapping;
  host.prepend(r.domElement);
  r.domElement.style.touchAction = 'none';
  PANO.mat = new THREE.ShaderMaterial({
    depthTest: false,
    depthWrite: false,
    uniforms: {
      tex: { value: null },
      yaw: { value: 0 },
      pitch: { value: 0 },
      tanH: { value: 1 },
      aspect: { value: 1 },
    },
    vertexShader: 'varying vec2 vUv; void main() { vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }',
    fragmentShader: `uniform sampler2D tex; uniform float yaw, pitch, tanH, aspect; varying vec2 vUv;
      void main() { vec2 n = vUv * 2.0 - 1.0; float cy = cos(yaw), sy = sin(yaw), cp = cos(pitch), sp = sin(pitch);
        vec3 f = vec3(sy * cp, cy * cp, sp), rt = vec3(cy, -sy, 0.0), up = cross(rt, f);
        vec3 d = normalize(f + n.x * tanH * aspect * rt + n.y * tanH * up);
        float lon = atan(d.x, d.y), lat = asin(clamp(d.z, -1.0, 1.0));
        gl_FragColor = texture2D(tex, vec2(lon / 6.2831853 + 0.5, lat / 3.1415927 + 0.5)); }`,
  });
  PANO.scene = new THREE.Scene();
  PANO.scene.add(new THREE.Mesh(new THREE.PlaneGeometry(2, 2), PANO.mat));
  PANO.cam = new THREE.Camera();
  PANO.r = r;
  const cv = r.domElement,
    pts = new Map();
  cv.addEventListener('pointerdown', e => {
    try {
      cv.setPointerCapture(e.pointerId);
    } catch (err) {}
    pts.set(e.pointerId, [e.clientX, e.clientY]);
    if (pts.size === 2) {
      const [a, b] = [...pts.values()];
      PANO.pinch = [Math.hypot(a[0] - b[0], a[1] - b[1]), PANO.fov];
    }
  });
  cv.addEventListener('pointermove', e => {
    if (!pts.has(e.pointerId)) return;
    const pr = pts.get(e.pointerId);
    const dx = e.clientX - pr[0],
      dy = e.clientY - pr[1];
    pts.set(e.pointerId, [e.clientX, e.clientY]);
    if (pts.size === 2 && PANO.pinch) {
      const [a, b] = [...pts.values()];
      PANO.fov = THREE.MathUtils.clamp(
        (PANO.pinch[1] * PANO.pinch[0]) / Math.max(10, Math.hypot(a[0] - b[0], a[1] - b[1])),
        35,
        100
      );
      PANO.dirty = true;
      return;
    }
    const k = PANO.fov / Math.max(300, cv.clientHeight);
    PANO.yaw -= (dx * k * Math.PI) / 180;
    PANO.pitch = THREE.MathUtils.clamp(PANO.pitch + (dy * k * Math.PI) / 180, -1.45, 1.45);
    PANO.dirty = true;
  });
  const up = e => {
    pts.delete(e.pointerId);
    if (pts.size < 2) PANO.pinch = null;
  };
  cv.addEventListener('pointerup', up);
  cv.addEventListener('pointercancel', up);
  cv.addEventListener(
    'wheel',
    e => {
      e.preventDefault();
      PANO.fov = THREE.MathUtils.clamp(PANO.fov * Math.exp(e.deltaY * 0.001), 35, 100);
      PANO.dirty = true;
    },
    { passive: false }
  );
  window.addEventListener('keydown', e => {
    if (!PANO.on) return;
    const k = e.key;
    if (k === 'ArrowLeft') PANO.yaw -= 0.08;
    else if (k === 'ArrowRight') PANO.yaw += 0.08;
    else if (k === 'ArrowUp') PANO.pitch = Math.min(1.45, PANO.pitch + 0.06);
    else if (k === 'ArrowDown') PANO.pitch = Math.max(-1.45, PANO.pitch - 0.06);
    else return;
    PANO.dirty = true;
    e.preventDefault();
  });
  new ResizeObserver(() => {
    PANO.dirty = true;
  }).observe(host);
  requestAnimationFrame(panoLoop);
  return true;
}
function panoLoop() {
  requestAnimationFrame(panoLoop);
  if (!PANO.on || !PANO.dirty) return;
  PANO.dirty = false;
  const host = $('panostage'),
    w = host.clientWidth,
    h = host.clientHeight;
  if (!w || !h) return;
  const r = PANO.r,
    sz = r.getSize(new THREE.Vector2());
  if (sz.x !== w || sz.y !== h) r.setSize(w, h, false);
  PANO.mat.uniforms.yaw.value = PANO.yaw;
  PANO.mat.uniforms.pitch.value = PANO.pitch;
  PANO.mat.uniforms.tanH.value = Math.tan((PANO.fov * Math.PI) / 360);
  PANO.mat.uniforms.aspect.value = w / h;
  if (PANO.mat.uniforms.tex.value) r.render(PANO.scene, PANO.cam);
  else {
    r.setClearColor(0x1d1f1c, 1);
    r.clear();
  }
  panoHotspots(w, h);
}
// hotspots: the neighbouring points (list nb in pano.json, otherwise all within 25 m), drawn where they lie a little above their floor
function panoHotspots(w, h) {
  const box = $('panohot');
  if (!box || !PANO.cur) return;
  const c = PANO.cur,
    t = Math.tan((PANO.fov * Math.PI) / 360),
    cy = Math.cos(PANO.yaw),
    sy = Math.sin(PANO.yaw),
    cp = Math.cos(PANO.pitch),
    sp = Math.sin(PANO.pitch);
  const f = [sy * cp, cy * cp, sp],
    rt = [cy, -sy, 0],
    up = [rt[1] * f[2] - rt[2] * f[1], rt[2] * f[0] - rt[0] * f[2], rt[0] * f[1] - rt[1] * f[0]];
  for (const el of box.children) {
    const p = PANO.byId[el.dataset.id];
    if (!p || p === c || (c.nb && !c.nb.includes(p.id))) {
      el.hidden = true;
      continue;
    }
    const v = c.via && c.via[p.id],
      tx = v ? v[0] : p.x,
      ty = v ? v[1] : p.y,
      Lh = Math.hypot(tx - c.x, ty - c.y); // via: where the way there starts (a ladder, a hatch)
    const d = [tx - c.x, ty - c.y, v ? v[2] - c.z : p.z - c.z - Math.min(1.2, 0.45 * Lh)];
    if (!c.nb && Math.hypot(...d) > 25) {
      el.hidden = true;
      continue;
    }
    const df = d[0] * f[0] + d[1] * f[1] + d[2] * f[2];
    if (df < 0.2) {
      el.hidden = true;
      continue;
    }
    const x = (d[0] * rt[0] + d[1] * rt[1] + d[2] * rt[2]) / df / ((t * w) / h),
      y = (d[0] * up[0] + d[1] * up[1] + d[2] * up[2]) / df / t;
    if (Math.abs(x) > 1.05 || Math.abs(y) > 1.05) {
      el.hidden = true;
      continue;
    }
    el.hidden = false;
    el.style.left = ((x + 1) / 2) * w + 'px';
    el.style.top = ((1 - y) / 2) * h + 'px';
  }
}
// how = 'start' (the point's own start direction), 'walk' (looking the way one came), 'keep' (same direction, e.g. after switching the variant)
function panoLoad(p, how = 'start') {
  if (!p) return;
  const st = $('panostate');
  if (st) st.textContent = 'Lädt …';
  const from = PANO.cur;
  const done = tex => {
    if (how === 'walk' && from) {
      PANO.yaw = Math.atan2(p.x - from.x, p.y - from.y);
      PANO.pitch = 0;
    } else if (how !== 'keep' || !from) {
      PANO.yaw = ((p.yaw || 0) * Math.PI) / 180;
      PANO.pitch = ((p.pitch || 0) * Math.PI) / 180;
    }
    PANO.cur = p;
    PANO.mat.uniforms.tex.value = tex;
    PANO.dirty = true;
    if (st) st.textContent = p.label;
    document
      .querySelectorAll('#panolist [data-pid]')
      .forEach(b => b.setAttribute('aria-pressed', b.dataset.pid === p.id ? 'true' : 'false'));
    const key = VARIANT + p.id;
    PANO.cache.delete(key);
    PANO.cache.set(key, tex); // most recently used last
    while (PANO.cache.size > 4) {
      const k = PANO.cache.keys().next().value;
      PANO.cache.get(k).dispose();
      PANO.cache.delete(k);
    }
  };
  const key = VARIANT + p.id;
  if (PANO.cache.has(key)) {
    done(PANO.cache.get(key));
    return;
  }
  const url = (window.EMBED_URL && window.EMBED_URL[BASE + p.file]) || BASE + p.file;
  new THREE.TextureLoader().load(
    url,
    tex => {
      tex.colorSpace = THREE.NoColorSpace;
      tex.generateMipmaps = false;
      tex.minFilter = THREE.LinearFilter;
      tex.magFilter = THREE.LinearFilter;
      tex.wrapS = THREE.RepeatWrapping;
      done(tex);
    },
    undefined,
    () => {
      if (st) st.textContent = 'Bild nicht verfügbar';
    }
  );
}
function panoBuildUI(how) {
  const list = panoList(),
    lb = $('panolist'),
    hot = $('panohot'),
    empty = $('panoempty');
  PANO.byId = {};
  for (const p of list) PANO.byId[p.id] = p;
  if (empty) empty.hidden = list.length > 0;
  if (!lb || !hot) return;
  lb.innerHTML = '';
  hot.innerHTML = '';
  for (const p of list) {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'chip';
    b.dataset.pid = p.id;
    b.textContent = p.label;
    b.setAttribute('aria-pressed', 'false');
    b.addEventListener('click', () => panoLoad(p, 'start'));
    lb.appendChild(b);
    const h = document.createElement('button');
    h.type = 'button';
    h.className = 'hot';
    h.dataset.id = p.id;
    h.hidden = true;
    h.innerHTML = '<i></i><span>' + p.label + '</span>';
    h.addEventListener('click', () => panoLoad(p, 'walk'));
    hot.appendChild(h);
  }
  if (!list.length) {
    PANO.cur = null;
    PANO.mat.uniforms.tex.value = null;
    const st = $('panostate');
    if (st) st.textContent = '360°-Rundblick';
    return;
  }
  const same = PANO.cur && PANO.byId[PANO.cur.id];
  panoLoad(same || list[0], same ? how : 'start');
}
function panoShow(on) {
  PANO.on = on;
  if (!on) return;
  if (!panoInit()) return;
  if (PANO.builtFor !== VARIANT) {
    const first = !PANO.builtFor;
    PANO.builtFor = VARIANT;
    panoBuildUI(first ? 'start' : 'keep');
  }
  PANO.dirty = true;
}
{
  const tab = $('tab-pano'),
    pan = $('p-pano');
  if (tab && pan) {
    if (!Object.keys(PANOMAN).some(k => (PANOMAN[k] || []).length)) {
      tab.hidden = true;
      if (!pan.hidden) $('tab-3d')?.click();
    } // no panoramas rendered yet → no tab
    else {
      new MutationObserver(() => panoShow(!pan.hidden)).observe(pan, { attributes: true, attributeFilter: ['hidden'] });
      if (!pan.hidden) panoShow(true);
    }
  }
}
window.PANO = PANO;
window.panoShow = panoShow;
window.panoLoad = panoLoad;
