// ===================== feat/cockpit: the driver's arms – on the wheel, the right hand to the lever when a gear changes (CPHANDS) =====================
// The same arms as the zombie night's first person (zombie/z_fp.js, ZFP.makeBody): a copy of the chosen figure (game/avatar.js – the same
// photo-textured model, its geometry and textures shared) on a rig at the driver's eyes, the head shrunk away, seated by its own sitting
// clip; the arms reach the hands' places by the two-bone solver of ZFP (placeBodyArm), the fingers close round the rim as the figure's
// driving clip holds a wheel (ZFP.fingers 'grip'). It lives in the car's body (so it moves with it) and is only shown in the driver's view;
// in third person the figure itself sits in the car. The legs are left out: in today's car the floor is too high for them under the wheel
// (docs/features/cockpit.md).
//   CPHANDS.ensure(parent, A) → body or null · CPHANDS.update(dt, T) – T = { R: { p, q, pose }, L: … } in the rig's frame · show(on) · drop()
import * as THREE from 'three';
import { V } from '../core/head.js';
import { AVATAR } from '../game/avatar.js';
import { ZFP } from '../zombie/z_fp.js';
export const CPHANDS = (() => {
  const S = { fb: null, rig: null, src: null, fails: 0, ms: 0 };
  const _q = new THREE.Quaternion(),
    _v = new THREE.Vector3(),
    _w = new THREE.Vector3();
  function drop() {
    if (S.rig) S.rig.removeFromParent();
    if (S.fb)
      S.fb.model.traverse(o => {
        if (o.isSkinnedMesh && o.skeleton) o.skeleton.dispose();
      });
    S.fb = S.rig = S.src = null;
  }
  // the figure's sitting clip at its start: hips and spine as on a seat; then the shoulders under the eyes again (as ZFP puts them)
  function seat(F, fb) {
    const clip = F.clips && (F.clips.sit || F.clips.sitRide);
    if (clip) {
      const mx = new THREE.AnimationMixer(fb.model),
        a = mx.clipAction(clip);
      a.play();
      mx.update(0);
      a.stop();
      mx.uncacheRoot(fb.model);
    }
    S.rig.updateMatrixWorld(true);
    const inv = S.rig.matrixWorld.clone().invert(),
      l = (n, o) => fb.B[n].getWorldPosition(o).applyMatrix4(inv);
    l('RightArm', _v).add(l('LeftArm', _w)).multiplyScalar(0.5);
    fb.root.position.add(_w.set(0, -0.255, 0.075).sub(_v));
    for (const n of ['LeftUpLeg', 'RightUpLeg']) if (fb.B[n]) fb.B[n].scale.setScalar(0.001);
    fb.root.updateMatrixWorld(true);
  }
  function ensure(par, A) {
    const F = AVATAR && AVATAR.ready ? AVATAR.fig : null;
    if (!F || !ZFP || typeof ZFP.makeBody !== 'function') return null;
    if (S.fb && S.src === F && S.rig && S.rig.parent === par) return S.fb;
    if (S.fails > 2) return null;
    drop();
    const t0 = performance.now();
    const rig = new THREE.Group();
    rig.name = 'cockpit-arme';
    rig.position.copy(V(A.eye[0], A.eye[1], A.eye[2]));
    par.add(rig);
    rig.updateMatrixWorld(true);
    S.rig = rig;
    const fb = ZFP.makeBody(F, rig);
    if (!fb) {
      S.fails++;
      drop();
      return null;
    }
    S.fb = fb;
    S.src = F;
    try {
      seat(F, fb);
    } catch (e) {
      console.warn('cockpit: Sitz', e);
    }
    // shaded by the car like the figure itself (the same shadow flags: its shader programs exist already)
    let rs = true;
    F.model.traverse(o => {
      if (o.isMesh) rs = o.receiveShadow;
    });
    fb.model.traverse(o => {
      if (o.isMesh) {
        o.receiveShadow = rs;
        o.castShadow = false;
      }
    });
    S.ms = performance.now() - t0;
    return fb;
  }
  function show(on) {
    if (S.rig && S.rig.visible !== on) S.rig.visible = on;
  }
  // T.R / T.L: p (Vector3) and q (Quaternion) of each hand in the rig's frame – x the back of the hand, y its index side, z towards the
  // wrist (ZFP's convention) –, pose: 'grip' (round the rim or the knob) or 'relax'
  function update(dt, T) {
    const fb = S.fb;
    if (!fb || !S.rig.visible) return;
    S.rig.updateMatrixWorld(true);
    S.rig.getWorldQuaternion(_q);
    for (const sd of ['R', 'L']) {
      const t = T[sd];
      if (!t) continue;
      ZFP.placeBodyArm(fb, sd, t.p, t.q, S.rig.matrixWorld, _q, t.pose !== 'relax');
      ZFP.fingers(fb, sd, t.pose || 'grip', dt);
    }
  }
  // tests: where the hands are in the rig's frame (the hand bones)
  function where() {
    if (!S.fb) return null;
    S.rig.updateMatrixWorld(true);
    const inv = S.rig.matrixWorld.clone().invert();
    return ['RightHand', 'LeftHand'].map(n =>
      S.fb.B[n]
        .getWorldPosition(new THREE.Vector3())
        .applyMatrix4(inv)
        .toArray()
        .map(x => +x.toFixed(3))
    );
  }
  return {
    S,
    ensure,
    update,
    show,
    drop,
    where,
    get rig() {
      return S.rig;
    },
  };
})();
