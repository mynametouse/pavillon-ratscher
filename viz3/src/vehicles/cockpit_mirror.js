// ===================== feat/cockpit: real mirrors – the interior mirror and both door mirrors show what is behind, live (CPMIRROR) =====================
// One small render target for all three (desktop 512 × 256, its strips: the interior mirror below, the door mirrors above); each mirror is a
// camera at its glass looking back (a little outward for the door mirrors), with the field of view the glass covers as seen from the eyes,
// near 0.25 m, far 220 m. Drawn round-robin – at most one mirror per frame, each about 15 times a second, only the mirrors that are in view,
// only in the driver's view and only with „Echte Spiegel“ (Menü → Einstellungen → Grafik; on for computers, off for phones). No new shadow
// map for them (the frame's own is used), no new shader programs (the target is of the same kind as the composer's). Without live pictures
// the glass is polished metal that shows the sky's light. The picture is mirrored by the glass's texture coordinates.
//   CPMIRROR.attach(parts, A, off, which) → set · CPMIRROR.update(dt, set, body, live) → drawn or not · CPMIRROR.info()
import * as THREE from 'three';
import { cam, COARSE, R, scene, V } from '../core/head.js';
export const CPMIRROR = (() => {
  const TW = COARSE ? 256 : 512,
    TH = COARSE ? 128 : 256;
  // strips of the target (fractions): interior mirror, left and right door mirror
  const REG = [
    { x: 0, y: 0, w: 1, h: 0.48 },
    { x: 0, y: 0.5, w: 0.495, h: 0.5 },
    { x: 0.505, y: 0.5, w: 0.495, h: 0.5 },
  ];
  // glass size (m), the field of view across (degrees), how far it turns outward (degrees, + to the right)
  const GL = [
    { w: 0.225, h: 0.055, fovX: 30, out: 0, pitch: -1.5 },
    { w: 0.17, h: 0.088, fovX: 22, out: -9, pitch: -2.5 },
    { w: 0.17, h: 0.088, fovX: 22, out: 9, pitch: -2.5 },
  ];
  const S = {
    rt: null,
    cams: [],
    t: [0, 0, 0],
    next: 0,
    live: false,
    n: 0,
    calls: 0,
    ms: 0,
    last: -1,
    renders: 0,
  };
  let MAT = null,
    OFF = null;
  const _q = new THREE.Quaternion(),
    _q2 = new THREE.Quaternion(),
    _e = new THREE.Euler(),
    _p = new THREE.Vector3(),
    _fr = new THREE.Frustum(),
    _m = new THREE.Matrix4(),
    _sp = new THREE.Sphere();
  // the glass: a plane facing back, its texture coordinates the strip of the target, left and right swapped (a mirror)
  function glassGeo(i) {
    const g = new THREE.PlaneGeometry(GL[i].w, GL[i].h),
      r = REG[i],
      uv = g.attributes.uv;
    for (let k = 0; k < uv.count; k++) uv.setXY(k, r.x + (1 - uv.getX(k)) * r.w, r.y + uv.getY(k) * r.h);
    return g;
  }
  // a cockpit's glasses (which: the mirrors it has – 0 interior, 1 left, 2 right); returns its set for update()
  function attach(P, A, mirrorOff, which = [0, 1, 2]) {
    OFF = mirrorOff;
    if (!S.rt) {
      S.rt = new THREE.WebGLRenderTarget(TW, TH, { type: THREE.HalfFloatType });
      S.rt.texture.generateMipmaps = false;
      MAT = new THREE.MeshBasicMaterial({ map: S.rt.texture, color: 0xd9d9d9 });
    }
    const set = { glass: [null, null, null], live: false };
    // the housings of vehicles/cockpit_build.js (trims): centre, turn, how far behind the centre their back face is
    const spots = [
      { p: [A.mirI[0], A.mirI[1] + 0.012, A.mirI[2]], yaw: -0.2, tilt: 0.05, back: 0.0175 },
      { p: A.mirL, yaw: 0, tilt: 0, back: 0.0705 },
      { p: A.mirR, yaw: 0, tilt: 0, back: 0.0705 },
    ];
    spots.forEach((s, i) => {
      if (!which.includes(i)) return;
      // the glass on the housing's back face, facing the driver
      const f = new THREE.Group();
      f.position.copy(V(s.p[0], s.p[1], s.p[2]));
      f.rotation.set(s.tilt, s.yaw, 0, 'YXZ');
      P.mov.add(f);
      const m = new THREE.Mesh(glassGeo(i), OFF);
      m.position.z = s.back;
      m.castShadow = false;
      m.receiveShadow = false;
      f.add(m);
      set.glass[i] = m;
      if (!S.cams[i]) {
        const g = GL[i],
          aspect = (REG[i].w * TW) / (REG[i].h * TH),
          fovY = (2 * Math.atan(Math.tan((g.fovX * Math.PI) / 360) / aspect) * 180) / Math.PI;
        S.cams[i] = new THREE.PerspectiveCamera(fovY, aspect, 0.25, 220);
      }
    });
    return set;
  }
  // live pictures on a cockpit's glasses, or the metal
  function live(set, on) {
    on = !!on && !!S.rt;
    S.live = on;
    if (on === set.live) return;
    set.live = on;
    for (const m of set.glass) if (m) m.material = on ? MAT : OFF;
  }
  // which mirrors the camera sees now (their glass inside the view)
  function inView(gl) {
    _m.multiplyMatrices(cam.projectionMatrix, cam.matrixWorldInverse);
    _fr.setFromProjectionMatrix(_m);
    gl.getWorldPosition(_sp.center);
    _sp.radius = 0.15;
    return _fr.intersectsSphere(_sp);
  }
  // one mirror's picture: its camera at the glass, the body's turn plus a half turn (looking back), a little outward and down
  function draw(i, gl, body) {
    const c = S.cams[i],
      g = GL[i],
      r = REG[i];
    gl.getWorldPosition(_p);
    body.getWorldQuaternion(_q);
    _e.set((g.pitch * Math.PI) / 180, Math.PI + (g.out * Math.PI) / 180, 0, 'YXZ');
    _q2.setFromEuler(_e);
    c.position.copy(_p);
    c.quaternion.copy(_q).multiply(_q2);
    c.layers.mask = cam.layers.mask;
    c.updateMatrixWorld(true);
    const prevRT = R.getRenderTarget(),
      ac = R.autoClear,
      su = R.shadowMap.autoUpdate,
      nu = R.shadowMap.needsUpdate,
      info = R.info.autoReset;
    const x = Math.round(r.x * TW),
      y = Math.round(r.y * TH),
      w = Math.round(r.w * TW),
      h = Math.round(r.h * TH);
    const t0 = performance.now();
    try {
      R.shadowMap.autoUpdate = false;
      R.shadowMap.needsUpdate = false;
      S.rt.viewport.set(x, y, w, h);
      S.rt.scissor.set(x, y, w, h);
      S.rt.scissorTest = true;
      R.setRenderTarget(S.rt);
      R.autoClear = true;
      R.info.autoReset = false;
      const c0 = R.info.render.calls;
      R.render(scene, c);
      S.calls = R.info.render.calls - c0;
    } finally {
      R.info.autoReset = info;
      R.autoClear = ac;
      R.setRenderTarget(prevRT);
      R.shadowMap.autoUpdate = su;
      R.shadowMap.needsUpdate = nu;
    }
    S.ms = S.ms * 0.8 + (performance.now() - t0) * 0.2;
    S.renders++;
    S.last = i;
  }
  // per frame while driving: on (driver's view and the setting) → the mirror whose turn it is, if it is due and in view
  function update(dt, set, body, on) {
    live(set, on);
    if (!on) return false;
    for (let k = 0; k < 3; k++) S.t[k] += dt;
    for (let k = 0; k < 3; k++) {
      const i = (S.next + k) % 3,
        gl = set.glass[i];
      if (!gl || S.t[i] < 1 / 15 || !inView(gl)) continue;
      S.t[i] = 0;
      S.next = (i + 1) % 3;
      draw(i, gl, body);
      return true;
    }
    return false;
  }
  function dispose() {
    if (S.rt) S.rt.dispose();
    S.rt = null;
  }
  const info = () => ({
    live: S.live,
    renders: S.renders,
    calls: S.calls,
    ms: +S.ms.toFixed(2),
    last: S.last,
    size: [TW, TH],
  });
  return { attach, update, live, info, dispose, S, GL, REG };
})();
