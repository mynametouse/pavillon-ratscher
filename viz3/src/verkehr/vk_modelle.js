// ===================== feat/verkehr-real 3: the traffic's vehicles as meshes – one material, three levels, built in a worker (VKMOD) =====================
// The types of verkehr/vk_typen.js become meshes here (Falko 13.11.2026: „möglichst echte Modelle … flüssige Spielbarkeit“):
// - built off the main thread: the worker dist/lazy/verkehr-bau.js (src/lazy/verkehr-bau.js) builds a type's far levels first (1 and 2,
//   what a vehicle needs before it may drive), the near level 0 only when a vehicle of that type comes near; where no worker starts the
//   same code runs on the main thread, one type per idle moment (verkehr/vk_bau.js)
// - ONE program for every vehicle: MeshPhysicalMaterial (clear-coated paint as the player's car) whose corners say what they are (the
//   attribute vk: paint, plastic, chrome, glass, lamp, rim, tyre); each vehicle has its own copy of the material (same program) holding
//   its paint, its lamps (head, tail, brake, indicators, reversing, day light) and its wheels' turn and steering (the shader turns the
//   wheels – they are part of the one mesh): one draw call per vehicle, two near by (the glass, see-through, the cab inside)
// - level 0 near (the full build, its glass apart), 1 in the middle (lighter, the glass dark and solid), 2 far (clustered: ~2000
//   triangles); the soft shadow under every vehicle and the pools of the head lamps at night are one instanced mesh each
// - the programs are made while the loading screen is up (an invisible carrier each), none during play
//   VKMOD.make(typ, o) → m   o: { col, col2, metal (0…1), rough } – the paint; m: { typ, T, g, body, glas, U, ax: [{ y, r, steer }] }
//   VKMOD.place(m, d)        the level for the distance d to the camera (call when it moved); VKMOD.free(m)
//   VKMOD.lamps(m, o)        o: { head, tail, brake, rev, left, right, drl } (0 … 1)
//   VKMOD.wheels(m, spin, steer)   spin: [rad per axle] (forward rolling positive), steer: rad (left positive)
//   VKMOD.ready(typ)         the far levels are there (it may drive); VKMOD.need(typ, lod) asks for it
//   VKMOD.shade(m, on)       its soft shadow (and pool of light) follows it each frame (VKMOD.tick)
import * as THREE from 'three';
import { scene, COARSE } from '../core/head.js';
import { markDirty } from '../core/assets.js';
import { VKTYPEN } from './vk_typen.js';
import { VKBAU } from './vk_bau.js';
export const VKMOD = (() => {
  const S = {
    geo: new Map(), // typ → [level 0, 1, 2] { op: BufferGeometry, gl: BufferGeometry | null }
    asked: new Map(), // typ|lod → true while the worker builds it
    queue: [], // [typ, lod] waiting for the worker
    live: new Set(), // the vehicles made
    stats: { built: 0, ms: 0, worker: null, fails: 0 },
    // the levels by distance (m), wider on the computer
    L0: COARSE ? 13 : 24,
    L1: COARSE ? 55 : 95,
    force: null, // a test may force a level
  };
  // ---- the material: one program for all, a copy per vehicle (its own uniforms) ----
  const VS_HEAD = `
attribute vec4 vk;
varying vec4 vVk;
uniform vec4 uSpin, uAxZ, uAxR;
uniform vec2 uSteer;
vec3 vkLin(vec3 c) { return mix(c / 12.92, pow((c + 0.055) / 1.055, vec3(2.4)), step(0.04045, c)); }
`;
  // the wheel's turn about its axle (three's x) and the steering about the upright through the wheel's middle
  const VS_WHEEL = `
vVk = vk;
mat3 vkM = mat3(1.0);
vec3 vkC = vec3(0.0);
{
  int ax = int(vk.z + 0.5);
  if (ax > 0) {
    float sp = ax == 1 ? uSpin.x : ax == 2 ? uSpin.y : ax == 3 ? uSpin.z : uSpin.w;
    float az = ax == 1 ? uAxZ.x : ax == 2 ? uAxZ.y : ax == 3 ? uAxZ.z : uAxZ.w;
    float ar = ax == 1 ? uAxR.x : ax == 2 ? uAxR.y : ax == 3 ? uAxR.z : uAxR.w;
    float c = cos(sp), s = sin(sp);
    vkM = mat3(1.0, 0.0, 0.0, 0.0, c, s, 0.0, -s, c);
    vkC = vec3(0.0, ar, az);
    if (ax == 1 && uSteer.x != 0.0) {
      float cs = cos(uSteer.x), ss = sin(uSteer.x);
      vkM = mat3(cs, 0.0, -ss, 0.0, 1.0, 0.0, ss, 0.0, cs) * vkM;
      vkC.x = (vk.w > 0.5 ? 1.0 : -1.0) * uSteer.y;
    }
  }
}
vec3 objectNormal = vkM * vec3( normal );
#ifdef USE_TANGENT
  vec3 objectTangent = vec3( tangent.xyz );
#endif
`;
  const FS_HEAD = `
varying vec4 vVk;
uniform vec3 uPaint, uPaint2;
uniform vec2 uPaintRM;
uniform vec4 uLamp;
uniform vec3 uLamp2;
`;
  // what each kind of corner is made of: colour, roughness, metal, clear coat, light
  const FS_KIND = `
float vkK = vVk.x, vkL = vVk.y;
float vkR = 0.62, vkMe = 0.0, vkCo = 0.0;
vec3 vkE = vec3(0.0);
if (vkK > 0.5 && vkK < 1.5) { diffuseColor.rgb *= uPaint; vkR = uPaintRM.x; vkMe = uPaintRM.y; vkCo = 1.0; }
else if (vkK > 1.5 && vkK < 2.5) { diffuseColor.rgb *= uPaint2; vkR = 0.42; vkCo = 0.6; }
else if (vkK > 2.5 && vkK < 3.5) { vkR = 0.16; vkMe = 1.0; }
else if (vkK > 3.5 && vkK < 4.5) { diffuseColor.rgb = vec3(0.012, 0.016, 0.019); vkR = 0.05; vkMe = 0.25; vkCo = 1.0; }
else if (vkK > 5.5 && vkK < 6.5) { vkR = 0.1; vkMe = 0.2; vkCo = 1.0; }
else if (vkK > 6.5 && vkK < 8.5) { vkR = 0.22; vkCo = 1.0; }
else if (vkK > 8.5 && vkK < 9.5) { vkR = 0.32; vkMe = 0.7; }
else if (vkK > 9.5) { vkR = 0.9; }
if (vkL > 0.5) {
  if (vkL < 1.5) vkE = vec3(1.0, 0.94, 0.82) * uLamp.x;
  else if (vkL < 2.5) vkE = vec3(1.0, 0.09, 0.04) * max(uLamp.y, uLamp.z);
  else if (vkL < 3.5) vkE = vec3(1.0, 0.42, 0.04) * uLamp2.x;
  else if (vkL < 4.5) vkE = vec3(1.0, 0.42, 0.04) * uLamp2.y;
  else if (vkL < 5.5) vkE = vec3(1.0) * uLamp.w;
  else vkE = vec3(0.92, 0.95, 1.0) * uLamp2.z;
}
`;
  function vehMat() {
    const m = new THREE.MeshPhysicalMaterial({
      color: 0xffffff,
      roughness: 0.6,
      metalness: 0,
      clearcoat: 1,
      clearcoatRoughness: 0.07,
      envMapIntensity: 1.0,
      vertexColors: true,
    });
    const U = {
      uPaint: { value: new THREE.Color(0.5, 0.5, 0.5) },
      uPaint2: { value: new THREE.Color(0.9, 0.9, 0.9) },
      uPaintRM: { value: new THREE.Vector2(0.34, 0.55) },
      uLamp: { value: new THREE.Vector4() }, // head, tail, brake, reversing
      uLamp2: { value: new THREE.Vector3() }, // indicator left, right, day light
      uSpin: { value: new THREE.Vector4() },
      uAxZ: { value: new THREE.Vector4() },
      uAxR: { value: new THREE.Vector4() },
      uSteer: { value: new THREE.Vector2() },
    };
    m.userData.U = U;
    m.onBeforeCompile = sh => {
      Object.assign(sh.uniforms, U);
      sh.vertexShader = sh.vertexShader
        .replace('#include <common>', '#include <common>\n' + VS_HEAD)
        .replace('#include <beginnormal_vertex>', VS_WHEEL)
        .replace('#include <begin_vertex>', 'vec3 transformed = vkM * (vec3( position ) - vkC) + vkC;')
        .replace(
          '#include <color_vertex>',
          '#include <color_vertex>\n#ifdef USE_COLOR\nvColor = vkLin(color);\n#endif'
        );
      sh.fragmentShader = sh.fragmentShader
        .replace('#include <common>', '#include <common>\n' + FS_HEAD)
        .replace('#include <color_fragment>', '#include <color_fragment>\n' + FS_KIND)
        .replace('#include <roughnessmap_fragment>', '#include <roughnessmap_fragment>\nroughnessFactor = vkR;')
        .replace('#include <metalnessmap_fragment>', '#include <metalnessmap_fragment>\nmetalnessFactor = vkMe;')
        .replace('#include <emissivemap_fragment>', '#include <emissivemap_fragment>\ntotalEmissiveRadiance += vkE;')
        .replace(
          '#include <lights_physical_fragment>',
          '#include <lights_physical_fragment>\n#ifdef USE_CLEARCOAT\nmaterial.clearcoat *= vkCo;\n#endif'
        );
    };
    m.customProgramCacheKey = () => 'vk-1';
    m.name = 'verkehr fahrzeug';
    return m;
  }
  // the glass near by: as the player's car's glass (the same program)
  const GLAS = new THREE.MeshPhysicalMaterial({
    color: 0x161c1f,
    metalness: 0,
    roughness: 0.04,
    transparent: true,
    opacity: 0.55,
    envMapIntensity: 1.4,
    depthWrite: false,
    side: THREE.DoubleSide,
  });
  GLAS.name = 'verkehr glas';
  // ---- the soft shadows (taking light away, as the Grenzland's vehicles) and the pools of the head lamps: instanced, one draw each ----
  const tex = (w, h, f) => {
    const cv = document.createElement('canvas');
    cv.width = w;
    cv.height = h;
    const x = cv.getContext('2d'),
      im = x.createImageData(w, h);
    for (let j = 0; j < h; j++)
      for (let i = 0; i < w; i++) {
        const a = Math.max(0, Math.min(1, f(i / (w - 1), j / (h - 1)))),
          q = (j * w + i) * 4;
        im.data[q] = im.data[q + 1] = im.data[q + 2] = Math.round(255 * a);
        im.data[q + 3] = 255;
      }
    x.putImageData(im, 0, 0);
    return new THREE.CanvasTexture(cv);
  };
  const SH = {
    mat: new THREE.MeshBasicMaterial({
      map: tex(64, 64, (u, v) => {
        const e = t => Math.max(0, Math.min(1, (1 - Math.abs(t * 2 - 1)) / 0.32)),
          a = e(u) * e(v);
        return a * a * (3 - 2 * a);
      }),
      transparent: true,
      blending: THREE.SubtractiveBlending,
      depthWrite: false,
      polygonOffset: true,
      polygonOffsetFactor: -2,
      polygonOffsetUnits: -2,
      toneMapped: false,
    }),
    pool: new THREE.MeshBasicMaterial({
      map: tex(64, 128, (u, j) => {
        // the canvas' rows from the top, the texture's v from the bottom (flipY): v 0 near the car, 1 far ahead – a soft cone, brightest
        // a few metres ahead, fading to the sides and far out
        const v = 1 - j,
          w = 0.3 + 0.7 * v,
          side = Math.max(0, 1 - Math.pow(Math.abs(u * 2 - 1) / w, 2)),
          along = Math.pow(Math.sin(Math.min(1, v * 2.2) * Math.PI * 0.5), 0.8) * Math.pow(1 - v, 1.6);
        return side * side * along;
      }),
      color: 0xffe2b0,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      polygonOffset: true,
      polygonOffsetFactor: -2,
      polygonOffsetUnits: -2,
      toneMapped: false,
      opacity: 0.42,
    }),
    N: COARSE ? 32 : 72,
    on: [], // the vehicles shown with a shadow, in instance order
  };
  SH.mat.name = 'verkehr schatten';
  SH.pool.name = 'verkehr lichtkegel';
  {
    const g = new THREE.PlaneGeometry(1, 1);
    g.rotateX(-Math.PI / 2);
    SH.im = new THREE.InstancedMesh(g, SH.mat, SH.N);
    const gp = new THREE.PlaneGeometry(1, 1);
    gp.rotateX(-Math.PI / 2);
    gp.translate(0, 0, -0.5); // the pool reaches ahead of its origin (forward is −z)
    SH.ip = new THREE.InstancedMesh(gp, SH.pool, SH.N);
    for (const im of [SH.im, SH.ip]) {
      im.count = 0;
      im.frustumCulled = false;
      im.userData.noMerge = true;
      im.castShadow = im.receiveShadow = false;
      im.renderOrder = 1;
      scene.add(im);
    }
    SH.ip.renderOrder = 2;
    SH.im.name = 'verkehr schatten';
    SH.ip.name = 'verkehr lichtkegel';
  }
  // how much light the shadow takes away: much by day, a little at night
  S.night = false;
  function tag(night) {
    S.night = night;
    const k = night ? 0.25 : 0.55;
    SH.mat.color.setRGB(k, k, k);
  }
  tag(false);
  // ---- the carriers: the programs made at load (render/render.js compileShown), never in play ----
  {
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(9), 3));
    g.setAttribute(
      'normal',
      new THREE.BufferAttribute(new Int16Array([0, 32767, 0, 0, 32767, 0, 0, 32767, 0]), 3, true)
    );
    g.setAttribute('color', new THREE.BufferAttribute(new Uint8Array(9).fill(255), 3, true));
    g.setAttribute('vk', new THREE.BufferAttribute(new Uint8Array(12), 4));
    g.setIndex([0, 1, 2]);
    S.carrierMat = vehMat();
    for (const m of [S.carrierMat, GLAS]) {
      const c = new THREE.Mesh(g, m);
      c.visible = false;
      c.receiveShadow = true;
      c.userData.noMerge = true;
      c.name = 'verkehr carrier';
      scene.add(c);
    }
  }
  // ---- geometry from the worker's arrays ----
  function toGeo(o, glass) {
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(o.pos, 3));
    g.setAttribute('normal', new THREE.BufferAttribute(o.nor, 3, true));
    if (!glass) {
      g.setAttribute('color', new THREE.BufferAttribute(o.col, 3, true));
      g.setAttribute('vk', new THREE.BufferAttribute(o.vk, 4));
    }
    g.setIndex(new THREE.BufferAttribute(o.idx, 1));
    g.computeBoundingSphere();
    // the shader turns and steers the wheels: a little room for them in the sphere the camera tests
    g.boundingSphere.radius += 0.15;
    return g;
  }
  function take(geo) {
    let L = S.geo.get(geo.typ);
    if (!L) S.geo.set(geo.typ, (L = [null, null, null]));
    if (L[geo.lod]) return;
    L[geo.lod] = {
      op: toGeo(geo.op, false),
      gl: geo.gl ? toGeo(geo.gl, true) : null,
      tris: geo.op.tris + (geo.gl ? geo.gl.tris : 0),
    };
    S.stats.built++;
    S.stats.ms += geo.ms || 0;
    // vehicles waiting for this level take it at their next placing
    for (const m of S.live) if (m.typ === geo.typ) m.lodT = -1;
    markDirty();
  }
  // ---- the worker (or, where none starts, the main thread in idle moments) ----
  let W = null,
    wid = 0,
    busy = 0;
  const pend = new Map();
  function worker() {
    if (W !== null) return W;
    W = false;
    if (S.noWorker || typeof Worker === 'undefined') return W;
    try {
      W = new Worker(new URL('lazy/verkehr-bau.js', document.baseURI).href, { type: 'module' });
      W.onmessage = e => {
        const d = e.data || {},
          p = pend.get(d.id);
        pend.delete(d.id);
        busy--;
        if (p) S.asked.delete(p);
        if (d.ok) for (const g of d.geos) take(g);
        else {
          S.stats.fails++;
          console.warn('verkehr-bau', d.err);
        }
        pump();
      };
      W.onerror = e => {
        // the worker cannot run here (an old browser, a blocked script): build on the main thread from now on
        console.warn('verkehr-bau: no worker, building on the main thread', e && e.message);
        e && e.preventDefault && e.preventDefault();
        try {
          W.terminate();
        } catch (er) {}
        W = false;
        for (const p of pend.values()) {
          S.asked.delete(p);
          const [typ, lod] = p.split('|');
          S.queue.unshift([typ, lod === 'fern' ? 'fern' : +lod]);
        }
        pend.clear();
        busy = 0;
        pump();
      };
      S.stats.worker = true;
    } catch (e) {
      W = false;
    }
    return W;
  }
  let idleT = null;
  function pump() {
    // nothing while the page loads: the worker starts with the first frame of play (VKMOD.tick), so it takes no time from the loading
    if (!S.queue.length || !S.playing) return;
    const w = worker();
    if (w) {
      while (busy < 2 && S.queue.length) {
        const [typ, lod] = S.queue.shift(),
          key = typ + '|' + lod,
          id = ++wid;
        pend.set(id, key);
        busy++;
        w.postMessage({ id, typ, lod });
      }
      return;
    }
    S.stats.worker = false;
    // on the main thread: one type per idle moment (the frame that builds it is the only one that waits)
    if (idleT) return;
    const step = () => {
      idleT = null;
      const job = S.queue.shift();
      if (!job) return;
      const [typ, lod] = job;
      try {
        const geos = lod === 'fern' ? VKBAU.geo12(typ) : [VKBAU.geo(typ, lod)];
        for (const g of geos) take(g);
      } catch (e) {
        S.stats.fails++;
        console.warn('verkehr-bau (main)', e);
      }
      S.asked.delete(typ + '|' + lod);
      if (S.queue.length)
        idleT = (window.requestIdleCallback || setTimeout)(step, window.requestIdleCallback ? { timeout: 400 } : 60);
    };
    idleT = (window.requestIdleCallback || setTimeout)(step, window.requestIdleCallback ? { timeout: 400 } : 60);
  }
  // ask for a level (1 or 2 → both far levels; 0 → the near one); first asked, first built – the near level jumps the queue
  function need(typ, lod) {
    if (!VKTYPEN.TYP[typ]) return false;
    const L = S.geo.get(typ);
    if (lod === 0 ? L && L[0] : L && L[1] && L[2]) return true;
    const key = typ + '|' + (lod === 0 ? 0 : 'fern');
    if (S.asked.has(key)) return false;
    S.asked.set(key, true);
    if (lod === 0) S.queue.unshift([typ, 0]);
    else S.queue.push([typ, 'fern']);
    pump();
    return false;
  }
  const ready = typ => {
    const L = S.geo.get(typ);
    return !!(L && L[1] && L[2]);
  };
  // ---- a vehicle ----
  const _c = new THREE.Color();
  function paint(m, o) {
    const U = m.U;
    U.uPaint.value.set(o.col || '#8c9094');
    U.uPaint2.value.set(o.col2 || '#eceee9');
    const metal = o.metal ?? 0.5;
    U.uPaintRM.value.set(o.rough ?? (metal > 0.2 ? 0.34 : 0.42), metal);
  }
  function make(typ, o = {}) {
    const T = VKTYPEN.TYP[typ];
    if (!T) return null;
    need(typ, 1);
    const mat = vehMat(),
      U = mat.userData.U,
      g = new THREE.Group(),
      body = new THREE.Mesh(new THREE.BufferGeometry(), mat),
      glas = new THREE.Mesh(new THREE.BufferGeometry(), GLAS);
    for (const x of [body, glas]) {
      x.userData.noMerge = true;
      x.castShadow = false;
      x.receiveShadow = x === body;
    }
    glas.visible = false;
    body.visible = false;
    g.add(body, glas);
    g.name = 'verkehr ' + typ;
    const ax = VKTYPEN.lage(T);
    ax.forEach((a, i) => {
      if (i > 3) return;
      U.uAxZ.value.setComponent(i, -a.y);
      U.uAxR.value.setComponent(i, a.r);
    });
    const st = ax.find(a => a.steer);
    U.uSteer.value.set(0, st ? T.track / 2 : 0);
    const m = {
      typ,
      T,
      g,
      body,
      glas,
      mat,
      U,
      ax,
      lod: -1,
      lodT: -1,
      d: 1e9,
      spin: [0, 0, 0, 0],
      shade: true,
      pool: false,
    };
    paint(m, o);
    S.live.add(m);
    scene.add(g);
    return m;
  }
  // the level for the distance d (with a little slack each way, so a vehicle at the border does not switch back and forth)
  function place(m, d) {
    m.d = d;
    const L = S.geo.get(m.typ);
    let want = S.force ?? (d < S.L0 ? 0 : d < S.L1 ? 1 : 2);
    if (S.force == null && m.lod >= 0 && Math.abs(want - m.lod) === 1) {
      const edge = want > m.lod ? (m.lod === 0 ? S.L0 : S.L1) : want === 0 ? S.L0 : S.L1;
      if (Math.abs(d - edge) < 3) want = m.lod;
    }
    if (want === 0 && !(L && L[0])) {
      need(m.typ, 0);
      want = 1;
    }
    if (want > 0 && !(L && L[want])) want = L && L[1] ? 1 : L && L[2] ? 2 : -1;
    if (want === m.lod && m.lodT >= 0) return want;
    m.lodT = 0;
    m.lod = want;
    if (want < 0) {
      m.body.visible = m.glas.visible = false;
      return want;
    }
    const G = L[want];
    m.body.geometry = G.op;
    m.body.visible = true;
    m.glas.visible = !!G.gl;
    if (G.gl) m.glas.geometry = G.gl;
    markDirty();
    return want;
  }
  function lamps(m, o) {
    const U = m.U;
    U.uLamp.value.set(o.head || 0, o.tail || 0, o.brake || 0, o.rev || 0);
    U.uLamp2.value.set(o.left || 0, o.right || 0, o.drl || 0);
  }
  function wheels(m, spin, steer = 0) {
    const v = m.U.uSpin.value;
    // the shader turns about +x: a wheel rolling forward turns the other way
    v.set(-(spin[0] || 0), -(spin[1] || 0), -(spin[2] || 0), -(spin[3] || 0));
    m.U.uSteer.value.x = steer;
  }
  function free(m) {
    if (!m || !S.live.has(m)) return;
    S.live.delete(m);
    scene.remove(m.g);
    m.mat.dispose();
    m.body.geometry = m.glas.geometry = null;
    m.g = null;
  }
  // ---- per frame: the shadows and pools under the vehicles shown ----
  const _m = new THREE.Matrix4(),
    _s = new THREE.Matrix4(),
    _v = new THREE.Vector3(),
    _q = new THREE.Quaternion(),
    _one = new THREE.Vector3(1, 1, 1);
  function tick(night) {
    if (!S.playing) {
      S.playing = true;
      pump();
    }
    if (night !== S.night) tag(night);
    let n = 0,
      np = 0;
    for (const m of S.live) {
      if (!m.g || !m.g.visible || !m.body.visible || m.d > S.L1 * 2.2) continue;
      if (n >= SH.N) break;
      const T = m.T;
      // (in the world: a vehicle the player borrowed rides inside the physics' body)
      m.g.updateWorldMatrix(true, false);
      if (m.shade) {
        // the shadow: the vehicle's plan a little wider, under its middle, on the ground of its frame
        _s.makeScale(2 * T.hw + 0.45, 1, T.yf - T.yr + 0.5);
        _s.setPosition(0, 0.04, -T.cy);
        _m.multiplyMatrices(m.g.matrixWorld, _s);
        SH.im.setMatrixAt(n++, _m);
      }
      if (night && m.pool && np < SH.N && m.d < S.L1 * 1.6) {
        _s.makeScale(5.2, 1, 14);
        _s.setPosition(0, 0.07, -(T.yf + 0.6));
        _m.multiplyMatrices(m.g.matrixWorld, _s);
        SH.ip.setMatrixAt(np++, _m);
      }
    }
    if (n !== SH.im.count || n) {
      SH.im.count = n;
      SH.im.instanceMatrix.needsUpdate = true;
    }
    if (np !== SH.ip.count || np) {
      SH.ip.count = np;
      SH.ip.instanceMatrix.needsUpdate = true;
    }
    SH.ip.visible = night && np > 0;
  }
  // ---- the colours of today: [hex, share, metal] (Kraftfahrt-Bundesamt, new cars by colour: grey, black and white two thirds) ----
  const FARBEN = [
    ['#5f6366', 15, 0.6], // dark grey metallic
    ['#8c9094', 12, 0.55], // grey metallic
    ['#1b1c1e', 13, 0.5], // black metallic
    ['#141516', 9, 0], // black
    ['#e9eae6', 13, 0], // white
    ['#dcdcd6', 4, 0.35], // pearl white
    ['#b4b8bb', 11, 0.7], // silver
    ['#24406b', 7, 0.55], // dark blue
    ['#3f72a8', 3, 0.5], // blue
    ['#8e1a1a', 5, 0.2], // red
    ['#2e4a37', 2, 0.45], // green
    ['#7a6650', 2, 0.4], // brown, beige
    ['#c9a227', 0.5, 0], // yellow
    ['#c8561f', 0.5, 0.2], // orange
  ];
  const pick = (L, r) => {
    let s = 0;
    for (const e of L) s += e[1];
    let x = r * s;
    for (const e of L) if ((x -= e[1]) <= 0) return e;
    return L[L.length - 1];
  };
  // a paint for a car (r ∈ [0, 1)); the vans mostly white, the lorries' boxes white or silver
  function farbe(typ, r) {
    const T = VKTYPEN.TYP[typ];
    if (!T) return { col: '#888888', metal: 0 };
    if (T.cls === 'lfz' && typ !== 'hochdach' && r < 0.62) return { col: '#eceee9', metal: 0 };
    if (T.cls === 'trak') {
      const e = pick(
        [
          ['#3d6b3a', 4],
          ['#a3201c', 3],
          ['#1f4f8f', 2],
          ['#5d6b2a', 1],
        ],
        r
      );
      return {
        col: e[0],
        metal: 0.1,
        col2: pick(
          [
            ['#8b2a1f', 3],
            ['#3f6b3c', 2],
            ['#9aa0a4', 2],
          ],
          (r * 7.31) % 1
        )[0],
      };
    }
    if (T.cls === 'lkw' || T.cls === 'zug') {
      const e = pick(
        [
          ['#eceee9', 5],
          ['#24406b', 2],
          ['#8e1a1a', 2],
          ['#5f6366', 2],
          ['#2e4a37', 1],
        ],
        r
      );
      return { col: e[0], metal: 0.15, col2: (r * 13.7) % 1 < 0.7 ? '#eceee9' : '#b4b8bb' };
    }
    const e = pick(FARBEN, r);
    return { col: e[0], metal: e[2] };
  }
  Object.assign(S, { make, place, lamps, wheels, free, tick, need, ready, paint, farbe, FARBEN, vehMat, GLAS, SH });
  return S;
})();
window.VKMOD = VKMOD;
window.VKTYPEN = VKTYPEN;
