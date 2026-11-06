// ===================== feat/wetter: rain, drizzle, sleet and snow around the camera (WXFALL) =====================
// One mesh for everything that falls: a few thousand quads whose places come from a seed and the time in the vertex shader – a box around
// the camera, the drops wrapping round inside it, carried by the wind (gusts from the weather's gust speed), each drop a streak along its
// motion as a camera sees it (a thirtieth of a second), each flake a soft round disc that sways as it sinks; how many are drawn follows the
// intensity (the draw range – nothing is rebuilt). Its program is compiled with everything else at load (the mesh is in the scene from the
// start, hidden while dry): no new program at the first drop. No light of its own; the colour follows the light of the sky. Fewer on
// phones. Hidden indoors (wetter/wetter.js asks audio.inside: the pavilion, the garden buildings, the houses of the zombie night) and in the
// plan view; in a vehicle no drop comes nearer than 2.4 m (the cabin).
import * as THREE from 'three';
import { cam, COARSE, R, scene } from '../core/head.js';
import { LOAD } from '../core/assets.js';
export const WXFALL = (() => {
  const N = COARSE ? 3200 : 9000,
    BOX = COARSE ? new THREE.Vector3(22, 15, 22) : new THREE.Vector3(30, 19, 30);
  // the first M quads are splashes on the ground around the walker (brief white flecks where drops hit), then the N drops
  const M = COARSE ? 260 : 700,
    Q = M + N;
  const g = new THREE.BufferGeometry(),
    pos = new Float32Array(Q * 4 * 3),
    seed = new Float32Array(Q * 4 * 4),
    cor = new Float32Array(Q * 4 * 2),
    kind = new Float32Array(Q * 4),
    idx = new Uint16Array(Q * 6);
  let r = 4711;
  const rnd = () => {
    r = (r * 16807) % 2147483647;
    return (r - 1) / 2147483646;
  };
  const C4 = [-1, 0, 1, 0, -1, 1, 1, 1];
  for (let i = 0; i < Q; i++) {
    const s = [rnd(), rnd(), rnd(), rnd()];
    for (let k = 0; k < 4; k++) {
      const v = i * 4 + k;
      seed.set(s, v * 4);
      pos.set([s[0] * BOX.x, s[1] * BOX.y, s[2] * BOX.z], v * 3);
      cor[v * 2] = C4[k * 2];
      cor[v * 2 + 1] = C4[k * 2 + 1];
      kind[v] = i < M ? 1 : 0;
    }
    idx.set([i * 4, i * 4 + 1, i * 4 + 2, i * 4 + 2, i * 4 + 1, i * 4 + 3], i * 6);
  }
  g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  g.setAttribute('aSeed', new THREE.BufferAttribute(seed, 4));
  g.setAttribute('aC', new THREE.BufferAttribute(cor, 2));
  g.setAttribute('aK', new THREE.BufferAttribute(kind, 1));
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
    // splashes: x alpha, y radius around the walker (m), z the ground's height (world y), w how often each one comes (per s)
    uSplash: { value: new THREE.Vector4(0, 7, 0, 2.2) },
    // the ground around the walker as a sloped plane: x, y where it is measured (site coordinates), z, w its slope east and north
    uSlope: { value: new THREE.Vector4(0, 0, 0, 0) },
    // roofs over the rain (below): the depth of the scene seen from above, where it was taken (x, z), the eye's height there, and 1
    // when there is a map; near and far of its camera
    uRoof: { value: null },
    uRoofC: { value: new THREE.Vector4(0, 0, 0, 0) },
    uRoofN: { value: new THREE.Vector2(0.5, 140) },
  };
  // the roofs' map: RS m across, RN texels (0.5–0.7 m each)
  const RS = 32,
    RN = COARSE ? 48 : 64;
  const roofRT = new THREE.WebGLRenderTarget(RN, RN, { depthBuffer: true, stencilBuffer: false });
  roofRT.texture.generateMipmaps = false;
  roofRT.depthTexture = new THREE.DepthTexture(RN, RN);
  U.uRoof.value = roofRT.depthTexture;
  const mat = new THREE.ShaderMaterial({
    uniforms: U,
    transparent: true,
    depthWrite: false,
    depthTest: true,
    fog: false,
    side: THREE.DoubleSide,
    vertexShader: `attribute vec4 aSeed; attribute vec2 aC; attribute float aK;
      uniform vec3 uCam, uBox, uOff; uniform float uT, uHole, uPx; uniform vec2 uWind; uniform vec4 uRain, uSnow, uSplash, uSlope, uRoofC; uniform vec2 uRoofN; uniform sampler2D uRoof;
      // under a roof (or a dense crown): the topmost surface above the point lies more than 8 cm above it
      float roofed(vec3 p){ if (uRoofC.w < 0.5) return 0.0; vec2 uv = vec2((p.x - uRoofC.x) / ${RS.toFixed(1)} + 0.5, (uRoofC.y - p.z) / ${RS.toFixed(1)} + 0.5);
        if (uv.x <= 0.0 || uv.x >= 1.0 || uv.y <= 0.0 || uv.y >= 1.0) return 0.0; float d = texture2D(uRoof, uv).r; if (d > 0.9999) return 0.0;
        float top = uRoofC.z - (uRoofN.x + d * (uRoofN.y - uRoofN.x)); return step(p.y + 0.08, top); }
      varying vec2 vC; varying float vA, vS;
      void main(){
        if (aK > 0.5) {
          // a splash: each slot flashes up somewhere on the ground around the walker, a new place each time
          float cyc = uT * uSplash.w + aSeed.w * 13.0, k = mod(floor(cyc), 257.0), ph = fract(cyc);
          vec2 h = fract(sin(vec2(k * 12.9898 + aSeed.x * 78.233, k * 39.346 + aSeed.z * 11.135 + 4.1)) * 43758.5453);
          float rr = sqrt(h.x) * uSplash.y, an = h.y * 6.2832;
          vec2 wp = vec2(uCam.x + cos(an) * rr, uCam.z + sin(an) * rr);
          float gy = uSplash.z + uSlope.z * (wp.x - uSlope.x) + uSlope.w * (-wp.y - uSlope.y);
          vec4 sp = viewMatrix * vec4(wp.x, gy + 0.015, wp.y, 1.0);
          float px = max(-sp.z, 0.05) * uPx, sz = max(0.018 + 0.045 * smoothstep(0.0, 0.12, ph), px * 1.2);
          vC = aC; vS = 2.0;
          vA = uSplash.x * smoothstep(0.0, 0.02, ph) * (1.0 - smoothstep(0.03, 0.12, ph)) * (1.0 - smoothstep(uSplash.y * 0.6, uSplash.y, rr));
          vA *= 1.0 - roofed(vec3(wp.x, gy + 0.015, wp.y));
          gl_Position = projectionMatrix * vec4(sp.xyz + vec3(aC.x * sz, (aC.y * 2.0 - 1.0) * sz * 0.55, 0.0), 1.0);
          if (vA < 0.002) gl_Position = vec4(2.0, 2.0, 2.0, 1.0);
          return;
        }
        float snow = step(fract(aSeed.w * 7.31), uRain.w - 0.0001);
        // each drop's own speed from a number of its own: taken from its height's, the drops gathered in sheets as time went on
        float rv = fract(aSeed.w * 31.73 + aSeed.x * 7.13);
        float fall = snow > 0.5 ? uSnow.x * (0.75 + 0.5 * rv) : uRain.x * (0.82 + 0.36 * rv);
        vec3 vel = vec3(uWind.x, -fall, uWind.y);
        vec3 p = aSeed.xyz * uBox + vel * uT;
        if (snow > 0.5) { float ph = aSeed.x * 37.0 + aSeed.z * 23.0;
          p.x += sin(uT * (0.7 + aSeed.y * 0.8) + ph) * uSnow.z; p.z += cos(uT * (0.6 + aSeed.z * 0.7) + ph * 1.3) * uSnow.z; }
        vec3 c0 = uCam + uOff, o = c0 - 0.5 * uBox;
        p = o + mod(p - o, uBox);
        vec3 e = abs(p - c0) / (0.5 * uBox);
        float dc = length(p - uCam);
        float a = (1.0 - smoothstep(0.7, 1.0, max(e.x, max(e.y, e.z)))) * smoothstep(uHole, uHole + (snow > 0.5 ? 1.5 : 0.6), dc);
        a *= 1.0 - roofed(p);
        vec4 vp = viewMatrix * vec4(p, 1.0);
        float px = max(-vp.z, 0.05) * uPx;
        vec3 q;
        if (snow > 0.5) {
          // a flake is never more than a few pixels across (one right at the lens is a blur nobody notices) and at least one
          float sz = uSnow.y * (0.7 + 0.6 * aSeed.x), w = clamp(sz, px * 1.2, px * 5.0);
          a *= min(1.0, sz / w * 1.6);
          q = vp.xyz + vec3(aC.x * w, (aC.y * 2.0 - 1.0) * w, 0.0);
        } else {
          vec3 vv = mat3(viewMatrix) * vel; float L = length(vv);
          vec3 ax = L > 1e-4 ? vv / L : vec3(0.0, -1.0, 0.0), sd = cross(ax, normalize(vp.xyz)); float sl = length(sd);
          sd = sl > 1e-4 ? sd / sl : vec3(1.0, 0.0, 0.0);
          // far streaks thinner than a pixel are drawn one pixel wide and fainter, but never vanish (the rain's depth)
          float w = max(uRain.z, px * 1.0);
          a *= clamp(uRain.z / w * 2.5, 0.4, 1.0);
          q = vp.xyz - ax * (L * uRain.y) * aC.y + sd * w * aC.x;
        }
        vC = aC; vA = a; vS = snow;
        gl_Position = projectionMatrix * vec4(q, 1.0);
        if (a < 0.002) gl_Position = vec4(2.0, 2.0, 2.0, 1.0);
      }`,
    fragmentShader: `uniform vec3 uColR, uColS; uniform float uAR, uAS; varying vec2 vC; varying float vA, vS;
      void main(){
        float a; vec3 col;
        if (vS > 1.5) { vec2 q = vec2(vC.x, vC.y * 2.0 - 1.0); a = 1.0 - smoothstep(0.1, 1.0, dot(q, q)); col = uColS * 0.85; }
        else if (vS > 0.5) { vec2 q = vec2(vC.x, vC.y * 2.0 - 1.0); a = uAS * (1.0 - smoothstep(0.0, 1.0, dot(q, q))); col = uColS; }
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
  const S = { n: 0, t: 0, kR: 0, kS: 0, on: false, gustT: 0, gustK: 0, gustTo: 0, splash: 0 };
  const clamp = (x, a, b) => Math.max(a, Math.min(b, x));
  // the weather to show: { on, rain mm/h, snow cm/h, drizzle, wind m/s, gust m/s, dir °, col (THREE.Color of the sky's haze), hole m }
  function set(p, dt) {
    const rain = p.on ? p.rain : 0,
      snow = p.on ? p.snow : 0;
    const kR = rain > 0.03 ? (p.drizzle ? 0.55 : clamp(0.12 + 0.3 * Math.log2(1 + rain), 0.1, 1)) : 0,
      kS = p.hail ? 0.35 * kR : snow > 0.02 ? clamp(0.15 + 0.35 * Math.log2(1 + 3 * snow), 0.12, 1) : 0;
    S.kR = kR;
    S.kS = kS;
    const k = Math.max(kR, kS),
      n = Math.round(N * k);
    S.n = p.hide ? 0 : n;
    // splashes: where it rains (not drizzle, snow or hail) on the ground the walker stands on, outdoors
    const spl = S.n > 0 && p.ground != null && rain > 0.3 && !p.drizzle && !p.hail && kS < kR;
    S.splash = spl ? M : 0;
    const gd = p.ground;
    U.uSplash.value.set(spl ? 0.18 + 0.3 * kR : 0, COARSE ? 5 : 7, spl ? gd[0] : 0, 1.6 + 1.4 * kR);
    if (spl) U.uSlope.value.set(gd[1], gd[2], gd[3], gd[4]);
    g.setDrawRange(spl ? 0 : M * 6, (S.splash + S.n) * 6);
    mesh.visible = S.n > 0;
    S.on = mesh.visible;
    if (!mesh.visible) return false;
    U.uRain.value.set(
      p.drizzle ? 3 : clamp(5 + 1.2 * Math.log2(1 + rain), 5, 9),
      0.026,
      p.drizzle ? 0.004 : 0.008,
      kS / Math.max(1e-3, kR + kS)
    );
    // snow sinks at about 1 m/s; graupel falls faster; hail is small, fast and hard (it does not sway)
    U.uSnow.value.set(
      p.hail ? 9 : p.graupel ? 2.4 : 1.0,
      p.hail ? 0.009 : snow > 1.5 ? 0.022 : 0.016,
      p.hail ? 0.0 : 0.3,
      0
    );
    U.uAR.value = p.drizzle ? 0.26 : 0.42;
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
    // in a cabin (driving, riding) no roofs' map: the cabin keeps the drops away, and the map would be redrawn every few metres
    S.noRoof = !!p.cab;
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
    // (not while the loading screen is up: nothing may draw then – programs may still be compiling, V16b3)
    if (S.on && !S.noRoof && LOAD.ready) roofs();
    else if (S.noRoof) U.uRoofC.value.w = 0;
  }
  // ---- roofs over the rain: while it rains, the scene is drawn from straight above into a small depth map around the drops' box
  //      (again when the eye has moved 3 m); a drop or a splash below the topmost surface there is not drawn – no rain under the
  //      carport, a porch, the pavilion's upper floor or a dense crown. The scene's own programs (the render-target variant compiled at
  //      load), no new light; the drops themselves are not in it ----
  const topCam = new THREE.OrthographicCamera(-RS / 2, RS / 2, RS / 2, -RS / 2, U.uRoofN.value.x, U.uRoofN.value.y);
  topCam.up.set(0, 0, -1);
  const _d = new THREE.Vector3();
  function roofs(force) {
    cam.getWorldDirection(_d);
    _d.y = 0;
    if (_d.lengthSq() > 1e-6) _d.normalize();
    const cx = cam.position.x + _d.x * BOX.x * 0.22,
      cz = cam.position.z + _d.z * BOX.z * 0.22;
    if (!force && U.uRoofC.value.w > 0.5 && Math.hypot(cx - U.uRoofC.value.x, cz - U.uRoofC.value.y) < 3) return false;
    // at most twice a second (a fast camera: the map lags a little)
    const now = performance.now();
    if (!force && now - (S.roofT || 0) < 500) return false;
    S.roofT = now;
    const top = cam.position.y + 60;
    topCam.position.set(cx, top, cz);
    topCam.lookAt(cx, top - 1, cz);
    topCam.updateMatrixWorld();
    const prev = R.getRenderTarget(),
      vis = mesh.visible;
    mesh.visible = false;
    try {
      R.setRenderTarget(roofRT);
      R.render(scene, topCam);
      U.uRoofC.value.set(cx, cz, top, 1);
      S.roofs = (S.roofs || 0) + 1;
    } catch (e) {
      console.warn('wetter: roofs', e);
      U.uRoofC.value.w = 0;
    } finally {
      R.setRenderTarget(prev);
      mesh.visible = vis;
    }
    return true;
  }
  return { set, tick, mesh, U, S, N, M, roofs };
})();
