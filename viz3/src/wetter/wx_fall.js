// ===================== feat/wetter: rain, drizzle, sleet and snow around the camera (WXFALL) =====================
// One mesh for everything that falls: a few thousand quads whose places come from a seed and the time in the vertex shader – a box around
// the camera, the drops wrapping round inside it, carried by the wind (gusts from the weather's gust speed), each drop a streak along its
// motion as a camera sees it (a thirtieth of a second), each flake a soft round disc that sways as it sinks; how many are drawn follows the
// intensity (the draw range – nothing is rebuilt). Its program is compiled with everything else at load (the mesh is in the scene from the
// start, hidden while dry): no new program at the first drop. No light of its own; the colour follows the light of the sky. Fewer on
// phones. Hidden indoors (wetter/wetter.js asks audio.inside: the pavilion, the garden buildings, the houses of the zombie night) and in the
// plan view; in a vehicle no drop comes nearer than 2.4 m (the cabin).
import * as THREE from 'three';
import { COARSE, scene } from '../core/head.js';
export const WXFALL = (() => {
  const N = COARSE ? 2600 : 6400,
    BOX = COARSE ? new THREE.Vector3(26, 18, 26) : new THREE.Vector3(34, 22, 34);
  const g = new THREE.BufferGeometry(),
    pos = new Float32Array(N * 4 * 3),
    seed = new Float32Array(N * 4 * 4),
    cor = new Float32Array(N * 4 * 2),
    idx = new Uint16Array(N * 6);
  let r = 4711;
  const rnd = () => {
    r = (r * 16807) % 2147483647;
    return (r - 1) / 2147483646;
  };
  const C4 = [-1, 0, 1, 0, -1, 1, 1, 1];
  for (let i = 0; i < N; i++) {
    const s = [rnd(), rnd(), rnd(), rnd()];
    for (let k = 0; k < 4; k++) {
      const v = i * 4 + k;
      seed.set(s, v * 4);
      pos.set([s[0] * BOX.x, s[1] * BOX.y, s[2] * BOX.z], v * 3);
      cor[v * 2] = C4[k * 2];
      cor[v * 2 + 1] = C4[k * 2 + 1];
    }
    idx.set([i * 4, i * 4 + 1, i * 4 + 2, i * 4 + 2, i * 4 + 1, i * 4 + 3], i * 6);
  }
  g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  g.setAttribute('aSeed', new THREE.BufferAttribute(seed, 4));
  g.setAttribute('aC', new THREE.BufferAttribute(cor, 2));
  g.setIndex(new THREE.BufferAttribute(idx, 1));
  g.setDrawRange(0, 0);
  g.boundingSphere = new THREE.Sphere(new THREE.Vector3(), 1e5);
  const U = {
    uCam: { value: new THREE.Vector3() },
    uBox: { value: BOX.clone() },
    uOff: { value: new THREE.Vector3(0, 2, 0) },
    uT: { value: 0 },
    uHole: { value: 0.35 },
    uPx: { value: 0.0015 },
    uWind: { value: new THREE.Vector2() },
    uRain: { value: new THREE.Vector4(6, 0.03, 0.009, 0) },
    uSnow: { value: new THREE.Vector4(1, 0.022, 0.3, 0) },
    uColR: { value: new THREE.Color(0.7, 0.72, 0.76) },
    uColS: { value: new THREE.Color(0.95, 0.96, 1) },
    uAR: { value: 0.28 },
    uAS: { value: 0.9 },
  };
  const mat = new THREE.ShaderMaterial({
    uniforms: U,
    transparent: true,
    depthWrite: false,
    depthTest: true,
    fog: false,
    side: THREE.DoubleSide,
    vertexShader: `attribute vec4 aSeed; attribute vec2 aC;
      uniform vec3 uCam, uBox, uOff; uniform float uT, uHole, uPx; uniform vec2 uWind; uniform vec4 uRain, uSnow;
      varying vec2 vC; varying float vA, vS;
      void main(){
        float snow = step(fract(aSeed.w * 7.31), uRain.w - 0.0001);
        float fall = snow > 0.5 ? uSnow.x * (0.75 + 0.5 * aSeed.y) : uRain.x * (0.82 + 0.36 * aSeed.y);
        vec3 vel = vec3(uWind.x, -fall, uWind.y);
        vec3 p = aSeed.xyz * uBox + vel * uT;
        if (snow > 0.5) { float ph = aSeed.x * 37.0 + aSeed.z * 23.0;
          p.x += sin(uT * (0.7 + aSeed.y * 0.8) + ph) * uSnow.z; p.z += cos(uT * (0.6 + aSeed.z * 0.7) + ph * 1.3) * uSnow.z; }
        vec3 c0 = uCam + uOff, o = c0 - 0.5 * uBox;
        p = o + mod(p - o, uBox);
        vec3 e = abs(p - c0) / (0.5 * uBox);
        float a = (1.0 - smoothstep(0.7, 1.0, max(e.x, max(e.y, e.z)))) * smoothstep(uHole, uHole + 0.8, length(p - uCam));
        vec4 vp = viewMatrix * vec4(p, 1.0);
        float px = max(-vp.z, 0.05) * uPx;
        vec3 q;
        if (snow > 0.5) {
          float sz = uSnow.y * (0.7 + 0.6 * aSeed.x), w = max(sz, px * 1.2);
          a *= min(1.0, sz / w * 1.6);
          q = vp.xyz + vec3(aC.x * w, (aC.y * 2.0 - 1.0) * w, 0.0);
        } else {
          vec3 vv = mat3(viewMatrix) * vel; float L = length(vv);
          vec3 ax = L > 1e-4 ? vv / L : vec3(0.0, -1.0, 0.0), sd = cross(ax, normalize(vp.xyz)); float sl = length(sd);
          sd = sl > 1e-4 ? sd / sl : vec3(1.0, 0.0, 0.0);
          float w = max(uRain.z, px * 0.9);
          a *= min(1.0, uRain.z / w * 1.5);
          q = vp.xyz - ax * (L * uRain.y) * aC.y + sd * w * aC.x;
        }
        vC = aC; vA = a; vS = snow;
        gl_Position = projectionMatrix * vec4(q, 1.0);
        if (a < 0.002) gl_Position = vec4(2.0, 2.0, 2.0, 1.0);
      }`,
    fragmentShader: `uniform vec3 uColR, uColS; uniform float uAR, uAS; varying vec2 vC; varying float vA, vS;
      void main(){
        float a; vec3 col;
        if (vS > 0.5) { vec2 q = vec2(vC.x, vC.y * 2.0 - 1.0); a = uAS * (1.0 - smoothstep(0.2, 1.0, dot(q, q))); col = uColS; }
        else { a = uAR * (1.0 - abs(vC.x)) * (1.0 - 0.75 * vC.y); col = uColR; }
        a *= vA;
        if (a < 0.004) discard;
        gl_FragColor = vec4(col, a);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }`,
  });
  const mesh = new THREE.Mesh(g, mat);
  mesh.frustumCulled = false;
  mesh.matrixAutoUpdate = false;
  mesh.renderOrder = 8;
  mesh.visible = false;
  mesh.castShadow = false;
  mesh.receiveShadow = false;
  mesh.userData.noMerge = true;
  mesh.name = 'wetter:niederschlag';
  mesh.raycast = () => {};
  scene.add(mesh);
  const _f = new THREE.Vector3();
  mesh.onBeforeRender = (rr, sc, c) => {
    U.uCam.value.copy(c.position);
    c.getWorldDirection(_f);
    _f.y = 0;
    if (_f.lengthSq() > 1e-6) _f.normalize();
    // more of the box ahead of the camera, and above it (what falls comes from there)
    U.uOff.value.set(_f.x * BOX.x * 0.22, BOX.y * 0.12, _f.z * BOX.z * 0.22);
    const rt = rr.getRenderTarget(),
      h = (rt && rt.height) || rr.domElement.height || 600;
    U.uPx.value = (2 * Math.tan(((c.fov || 60) * Math.PI) / 360)) / h;
  };
  const S = { n: 0, t: 0, kR: 0, kS: 0, on: false, gustT: 0, gustK: 0, gustTo: 0 };
  const clamp = (x, a, b) => Math.max(a, Math.min(b, x));
  // the weather to show: { on, rain mm/h, snow cm/h, drizzle, wind m/s, gust m/s, dir °, col (THREE.Color of the sky's haze), hole m }
  function set(p, dt) {
    const rain = p.on ? p.rain : 0,
      snow = p.on ? p.snow : 0;
    const kR = rain > 0.03 ? (p.drizzle ? 0.55 : clamp(0.12 + 0.3 * Math.log2(1 + rain), 0.1, 1)) : 0,
      kS = snow > 0.02 ? clamp(0.15 + 0.35 * Math.log2(1 + 3 * snow), 0.12, 1) : 0;
    S.kR = kR;
    S.kS = kS;
    const k = Math.max(kR, kS),
      n = Math.round(N * k);
    S.n = p.hide ? 0 : n;
    g.setDrawRange(0, S.n * 6);
    mesh.visible = S.n > 0;
    S.on = mesh.visible;
    if (!mesh.visible) return false;
    U.uRain.value.set(
      p.drizzle ? 3 : clamp(5 + 1.2 * Math.log2(1 + rain), 5, 9),
      0.03,
      p.drizzle ? 0.005 : 0.009,
      kS / Math.max(1e-3, kR + kS)
    );
    U.uSnow.value.set(p.graupel ? 2.4 : 1.0, snow > 1.5 ? 0.034 : 0.024, 0.3, 0);
    U.uAR.value = p.drizzle ? 0.2 : 0.3;
    // gusts: the wind swings between its mean and the gust speed (slow random), near the ground ~0.8 of the 10-m wind
    S.gustT -= dt;
    if (S.gustT <= 0) {
      S.gustT = 2 + Math.random() * 6;
      S.gustTo = Math.pow(Math.random(), 2.2);
    }
    S.gustK += (S.gustTo - S.gustK) * Math.min(1, dt * 0.8);
    const v = 0.8 * (p.wind + (Math.max(p.gust, p.wind) - p.wind) * S.gustK),
      a = (p.dir * Math.PI) / 180;
    U.uWind.value.set(-Math.sin(a) * v, Math.cos(a) * v);
    U.uHole.value = p.hole || 0.35;
    const c = p.col;
    if (c) {
      U.uColR.value.setRGB(c.r * 1.35 + 0.01, c.g * 1.35 + 0.01, c.b * 1.35 + 0.012);
      U.uColS.value.setRGB(c.r * 2.1 + 0.02, c.g * 2.1 + 0.02, c.b * 2.1 + 0.025);
    }
    return true;
  }
  // the time of the drops (seconds; the game's steps in tests – the same picture for the same steps), wrapped before precision suffers
  function tick(dt) {
    S.t = (S.t + dt) % 600;
    U.uT.value = S.t;
  }
  return { set, tick, mesh, U, S, N };
})();
