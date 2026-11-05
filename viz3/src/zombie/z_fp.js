// ===================== feat/zombie: first person – arms and hands on the weapon, fists, a boot for the kick, recoil (ZFP) =====================
// Falko 5.11.2026: „Die First Person Ansicht muss samt des Tragens der Waffe, aber auch beim Kämpfen realistischer aussehen … Auch das
// Schlagen und Treten realistischer“. In the zombie night the player now sees his own arms: two sleeves (upper arm, forearm with a cuff) and
// hands that hold the weapon where one holds it (zombie/z_waffe_mod.js HANDS) – the elbows found by a two-bone solver from the shoulders –,
// with nothing in the hand two fists (raised at night or when one of them is near, lowered by day), for G a boot that comes up from below.
// The weapon is posed here (game/play.js HELD only draws it): a ready pose per weapon, a lower one when nothing threatens, the swing of each
// kind of weapon timed to the blow of zombie/z_waffe.js (wind-up, strike at ZDATA wind, follow-through, back), the Doppelflinte's recoil and
// its reload (break open, the empty shells fly, two new ones from the pocket, snap shut), the chainsaw's pull start, idle shake and push
// while cutting; walking sways it, turning drags it, breathing moves it more when tired; a hit taken jolts it; the camera kicks, shakes,
// dips (P.yaw/P.pitch offsets that are taken back again). Everything lives in the HELD overlay scene: ~10 draw calls, plain materials (the
// same shader program as the things in the hand), no allocation per frame. Third person, a vehicle, a seat: nothing of this is drawn.
import * as THREE from 'three';
import * as BufferGeometryUtils from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { clone as skelClone } from 'three/examples/jsm/utils/SkeletonUtils.js';
import { cam, R as REN } from '../core/head.js';
import { canonBone } from '../core/rig.js';
import { markDirty, plain } from '../core/assets.js';
import { KERN } from '../core/kern.js';
import { P } from '../game/walkable.js';
import { CAM3 } from '../game/player.js';
import { AVATAR } from '../game/avatar.js';
import { HELD, PLAY } from '../game/play.js';
import { VEH } from '../vehicles/vehicle.js';
import { ZDATA } from './z_data.js';
import { Z } from './z_state.js';
import { ZTON } from './z_ton.js';
import { ZWMOD } from './z_waffe_mod.js';
import { ZWAFFE } from './z_waffe.js';
export const ZFP = (() => {
  const W = ZDATA.WEAPONS,
    HANDS = ZWMOD.HANDS;
  const UP = 0.3, // upper arm (shoulder to elbow)
    FORE = 0.265, // forearm (elbow to wrist)
    WR = 0.072; // wrist to the middle of the fist
  const S = {
    shown: false,
    id: null,
    time: 0,
    alert: 0,
    lowK: 0.12, // how far calm lowers a weapon towards its 'low' pose (by eye: every weapon stays in view)
    drawK: 0,
    clipA: null, // the running animation { c, t }
    fistSide: 0,
    kickA: null,
    recoilT: 9,
    brk: 0,
    flashT: 9,
    stopT: 0,
    lastAtk: -9,
    lagYaw: 0,
    lagPitch: 0,
    lastYaw: null,
    lastPitch: null,
    shakeA: 0,
    camYaw: 0,
    camPitch: 0,
    kickCam: 0,
    jolt: 0,
    sawPull: 0,
    shells: [],
  };
  // ---- materials and meshes ----
  let MT = null;
  const mats = () =>
    MT ||
    (MT = {
      skin: plain({ color: 0xc28f72, roughness: 0.62 }),
      sleeve: plain({ color: 0x8c2e25, roughness: 0.92 }),
      fore: plain({ color: 0x8c2e25, roughness: 0.92 }),
      cuff: plain({ color: 0x6a221c, roughness: 0.95 }),
      denim: plain({ color: 0x2d333b, roughness: 0.92 }),
      boot: plain({ color: 0x2c221b, roughness: 0.65 }),
      sole: plain({ color: 0x141210, roughness: 0.9 }),
      flash: plain({
        color: 0x000000,
        emissive: 0xffc46a,
        emissiveIntensity: 5,
        transparent: true,
        opacity: 0.85,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        side: THREE.DoubleSide,
      }),
      cord: plain({ color: 0xd9d4c4, roughness: 0.8 }),
    });
  const _mm = new THREE.Matrix4(),
    _qq = new THREE.Quaternion(),
    _ee = new THREE.Euler(),
    _pp = new THREE.Vector3(),
    _ss = new THREE.Vector3();
  // parts of one material → one geometry
  function merge(parts) {
    const l = parts.map(([g, x = 0, y = 0, z = 0, rx = 0, ry = 0, rz = 0, sx = 1, sy = 1, sz = 1]) => {
      g = g.index ? g.toNonIndexed() : g;
      for (const n of Object.keys(g.attributes)) if (n !== 'position' && n !== 'normal') g.deleteAttribute(n);
      g.applyMatrix4(_mm.compose(_pp.set(x, y, z), _qq.setFromEuler(_ee.set(rx, ry, rz)), _ss.set(sx, sy, sz)));
      return g;
    });
    return BufferGeometryUtils.mergeGeometries(l, false);
  }
  const rb = (w, h, d, r) => ZWMOD.rbox(w, h, d, r);
  // the right hand closed round a handle: origin in the middle of the fist (the handle's axis along y, the index finger at +y), +x the
  // back of the hand, +z towards the wrist (the left hand is its mirror image)
  function handGeo() {
    const p = [];
    for (const [y, w, k] of [
      [0.0305, 0.0205, 1],
      [0.0103, 0.0212, 1.03],
      [-0.0103, 0.0204, 0.99],
      [-0.0298, 0.0172, 0.9],
    ]) {
      p.push([rb(0.052 * k, w, 0.03, 0.009), 0.003, y, -0.024 * k]); // round the front of the handle
      p.push([rb(0.026, w * 0.98, 0.034, 0.009), 0.021, y, -0.004]); // over the knuckle side
      p.push([rb(0.024, w * 0.94, 0.03, 0.009), -0.019, y, -0.002 + (1 - k) * 0.01]); // tucked in on the palm side
      p.push([new THREE.SphereGeometry(0.0093 * k, 8, 6), 0.029, y, -0.017]); // the knuckle
    }
    p.push([rb(0.034, 0.08, 0.082, 0.013), 0.017, 0.002, 0.042]); // back of the hand and palm
    p.push([rb(0.026, 0.032, 0.05, 0.011), -0.004, 0.031, 0.04]); // the ball of the thumb
    p.push([new THREE.CapsuleGeometry(0.0102, 0.034, 3, 8), -0.015, 0.044, 0.012, 0.32, 0, 0.12]); // the thumb over the index finger
    p.push([new THREE.CylinderGeometry(0.027, 0.028, 0.06, 12), 0.012, 0.0, 0.098, Math.PI / 2, 0, 0, 0.72, 1, 1]); // the wrist
    return merge(p);
  }
  // mirror a non-indexed geometry in x (the left hand): flip the winding so it is not drawn inside out
  function mirrorX(g) {
    g = g.clone();
    g.scale(-1, 1, 1);
    const a = g.attributes.position,
      n = g.attributes.normal;
    for (let i = 0; i < a.count; i += 3)
      for (const at of [a, n]) {
        const x = at.getX(i + 1),
          y = at.getY(i + 1),
          z = at.getZ(i + 1);
        at.setXYZ(i + 1, at.getX(i + 2), at.getY(i + 2), at.getZ(i + 2));
        at.setXYZ(i + 2, x, y, z);
      }
    a.needsUpdate = n.needsUpdate = true;
    return g;
  }
  // a sleeve along +y from 0 to len, r0 at 0, r1 at len (the upper arm with a round elbow at its end)
  const sleeve = (len, r0, r1, elbow) =>
    merge(
      [[new THREE.CylinderGeometry(r1, r0, len, 12, 1, true), 0, len / 2, 0]].concat(
        elbow ? [[new THREE.SphereGeometry(r1 * 1.02, 12, 8), 0, len, 0]] : []
      )
    );
  // the boot and the trouser leg for the kick: origin at the ankle, the toe to −z, the sole down, the shin up (+y)
  function legGeo() {
    return {
      boot: merge([
        [rb(0.1, 0.085, 0.25, 0.03), 0, -0.048, -0.06],
        [rb(0.095, 0.07, 0.07, 0.03), 0, -0.05, -0.17],
        [new THREE.CylinderGeometry(0.056, 0.06, 0.15, 12), 0, 0.03, 0.0],
      ]),
      sole: merge([[rb(0.106, 0.024, 0.275, 0.01), 0, -0.098, -0.065]]),
      denim: merge([[new THREE.CylinderGeometry(0.068, 0.06, 0.42, 12, 1, true), 0, 0.3, 0.0]]),
    };
  }
  let B = null;
  function build() {
    if (B) return B;
    const M = mats(),
      rig = new THREE.Group();
    rig.name = 'zfp';
    rig.visible = false;
    HELD.scene.add(rig);
    const hg = handGeo(),
      hgL = mirrorX(hg),
      upG = sleeve(UP, 0.058, 0.05, true),
      foG = sleeve(FORE, 0.049, 0.037, false),
      cuG = merge([[new THREE.CylinderGeometry(0.041, 0.042, 0.05, 12, 1, true), 0, FORE - 0.02, 0]]);
    const mesh = (g, m, parent = rig) => {
      const me = new THREE.Mesh(g, m);
      me.frustumCulled = false;
      me.matrixAutoUpdate = true;
      parent.add(me);
      return me;
    };
    const arm = L => {
      const a = { up: mesh(upG, M.sleeve), fo: mesh(foG, M.fore), hand: mesh(L ? hgL : hg, M.skin) };
      a.cuff = mesh(cuG, M.cuff, a.fo);
      return a;
    };
    const lg = legGeo(),
      leg = new THREE.Group();
    leg.visible = false;
    rig.add(leg);
    for (const [k, m] of [
      ['boot', M.boot],
      ['sole', M.sole],
      ['denim', M.denim],
    ])
      mesh(lg[k], m, leg);
    // the muzzle flash: three crossed blades of light, additive
    const fl = new THREE.Group();
    fl.visible = false;
    rig.add(fl);
    const fg = new THREE.PlaneGeometry(0.075, 0.26);
    fg.translate(0, 0.12, 0);
    for (let i = 0; i < 3; i++) {
      const me = mesh(fg, M.flash, fl);
      me.rotation.y = (i * Math.PI) / 3;
    }
    const star = mesh(new THREE.CircleGeometry(0.05, 10), M.flash, fl);
    star.rotation.x = Math.PI / 2;
    // shells: two that fly out of the opened gun, two in the left hand on the way to the chambers
    const sh = [0, 1, 2, 3].map(() => {
      const s = ZWMOD.shell(ZWMOD.mats());
      s.visible = false;
      s.traverse(o => {
        if (o.isMesh) o.frustumCulled = false;
      });
      rig.add(s);
      return s;
    });
    // the starter cord of the saw
    const cg = new THREE.CylinderGeometry(0.0022, 0.0022, 1, 5);
    cg.translate(0, 0.5, 0);
    const cord = mesh(cg, M.cord);
    cord.visible = false;
    B = { rig, R: arm(false), L: arm(true), leg, fl, sh, cord };
    return B;
  }
  // ---- the sleeves as the chosen figure wears them (game/avatar.js, docs/features/figuren.md): Falko his red check shirt, Sarah her
  // leather jacket, Christoph a dark T-shirt – bare forearms ----
  const DRESS = {
    m: { up: 0x8c2e25, fo: 0x8c2e25, cuff: 0x6a221c, r: 0.92 },
    f: { up: 0x2b211c, fo: 0x2b211c, cuff: 0x1c1613, r: 0.55 },
    c: { up: 0x2b2d31, fo: null, cuff: null, r: 0.9 },
  };
  let dressed = null;
  function dress(b) {
    const k = (AVATAR && AVATAR.kind) || 'm';
    if (dressed === k) return;
    dressed = k;
    const d = DRESS[k] || DRESS.m,
      M = mats();
    M.sleeve.color.setHex(d.up);
    M.sleeve.roughness = M.fore.roughness = d.r;
    if (d.fo != null) M.fore.color.setHex(d.fo);
    if (d.cuff != null) M.cuff.color.setHex(d.cuff);
    for (const a of [b.R, b.L]) {
      a.fo.material = d.fo == null ? M.skin : M.fore;
      a.cuff.visible = d.cuff != null;
    }
  }
  // ---- small vector helpers (camera space: x right, y up, z towards the viewer) ----
  const V = (x = 0, y = 0, z = 0) => new THREE.Vector3(x, y, z);
  const _a = V(),
    _c = V(),
    _d = V(),
    _u = V(),
    _v = V(),
    _x = V(),
    _y = V(),
    _z = V(),
    _o = V(),
    _q = new THREE.Quaternion(),
    _q2 = new THREE.Quaternion(),
    _m = new THREE.Matrix4(),
    YUP = new THREE.Vector3(0, 1, 0);
  const SH = { R: new THREE.Vector3(0.19, -0.25, 0.07), L: new THREE.Vector3(-0.19, -0.25, 0.07) }; // the shoulders
  const POLE = {
    R: new THREE.Vector3(0.55, -0.82, 0.15).normalize(),
    L: new THREE.Vector3(-0.55, -0.82, 0.15).normalize(),
  };
  const nrm = a => new THREE.Vector3(a[0], a[1], a[2]).normalize();
  // a rotation from the directions of an object's +y and (roughly) +x
  function basisQ(y, xh, out) {
    _y.copy(y).normalize();
    _x.copy(xh).addScaledVector(_y, -xh.dot(_y));
    if (_x.lengthSq() < 1e-6) _x.set(1, 0, 0).addScaledVector(_y, -_y.x);
    _x.normalize();
    _z.crossVectors(_x, _y);
    _m.makeBasis(_x, _y, _z);
    return out.setFromRotationMatrix(_m);
  }
  // a hand frame from the finger axis (y) and the way to the wrist (z)
  function handQ(y, zw, out) {
    _y.copy(y).normalize();
    _z.copy(zw).addScaledVector(_y, -zw.dot(_y)).normalize();
    _x.crossVectors(_y, _z);
    _m.makeBasis(_x, _y, _z);
    return out.setFromRotationMatrix(_m);
  }
  // rotation vector (axis · angle) ↔ quaternion
  function qFromRV(rx, ry, rz, out) {
    const a = Math.hypot(rx, ry, rz);
    if (a < 1e-6) return out.identity();
    return out.setFromAxisAngle(_v.set(rx / a, ry / a, rz / a), a);
  }
  // ---- the poses, by eye (pictures: viz3/test/zombie_kampf.py): where the right hand holds the weapon (camera space, metres), where the
  // weapon's +y (handle towards the head, the gun's barrels, the saw's bar) and roughly its +x (the edge; the gun's and the saw's right side)
  // point. R: ready, low: nothing threatens, the others the moments of a blow (wind-up, the middle of the swing, the hit, follow-through),
  // of the reload (open, close) and of the pull start ----
  const POSE = {
    flinte: {
      R: { p: [0.13, -0.17, -0.21], y: [-0.04, 0.035, -1], x: [1, 0.04, 0] },
      low: { p: [0.12, -0.2, -0.14], y: [-0.25, -0.45, -0.85], x: [0.95, -0.1, -0.2] },
      open: { p: [0.07, -0.16, -0.36], y: [-0.35, 0.18, -0.92], x: [0.935, 0, -0.356] },
      close: { p: [0.1, -0.13, -0.24], y: [-0.06, 0.12, -1], x: [1, 0.05, 0] },
    },
    motorsaege: {
      R: { p: [0.25, -0.26, -0.42], y: [-0.5, 0.35, -0.79], x: [0.845, 0, -0.535] }, // raised: both hands and the bar in view
      low: { p: [0.18, -0.45, -0.26], y: [-0.1, -0.3, -1], x: [1, 0, 0] },
      pull: { p: [0.17, -0.3, -0.42], y: [-0.4, 0.1, -0.9], x: [0.9, 0, -0.4] },
    },
    spaten: {
      R: { p: [0.2, -0.33, -0.18], y: [0.22, -0.3, 0.93], x: [1, 0, 0.25] },
      low: { p: [0.22, -0.38, -0.18], y: [0.15, -0.55, 0.82], x: [1, 0, -0.2] },
      wind: { p: [0.3, -0.12, -0.14], y: [-0.55, -0.45, 0.7], x: [0.7, -0.5, 0.2] },
      mid: { p: [0.22, -0.16, -0.3], y: [-0.05, -0.35, 0.94], x: [1, 0, 0.05] },
      hit: { p: [0.08, -0.22, -0.38], y: [0.6, -0.15, 0.78], x: [0.78, 0.1, -0.6] },
      follow: { p: [-0.02, -0.28, -0.32], y: [0.92, -0.05, 0.38], x: [0.38, 0, -0.92] },
    },
    mistgabel: {
      R: { p: [0.15, -0.28, -0.16], y: [0.1, -0.08, 1], x: [1, 0, 0.1] },
      low: { p: [0.18, -0.32, -0.1], y: [0.08, 0.35, 0.93], x: [1, 0, -0.08] },
      wind: { p: [0.18, -0.26, -0.02], y: [0.1, -0.06, 1], x: [1, 0, 0.1] },
      hit: { p: [0.15, -0.23, -0.47], y: [0.1, -0.1, 1], x: [1, 0, 0.1] },
    },
    brechstange: {
      // two hands, the axe's diagonal
      R: { p: [0.17, -0.26, -0.5], y: [0.18, 0.8, -0.6], x: [0, -0.4, -1] },
      low: { p: [0.22, -0.4, -0.35], y: [0.1, -0.6, -0.8], x: [0, -0.8, 0.6] },
      wind: { p: [0.22, 0.04, -0.2], y: [0.45, 0.601, 0.661], x: [-0.184, 0.786, -0.59] },
      mid: { p: [0.16, -0.02, -0.4], y: [0.447, 0.744, -0.496], x: [-0.677, -0.082, -0.732] },
      hit: { p: [0.1, -0.24, -0.42], y: [-0.302, 0.216, -0.928], x: [-0.517, -0.855, -0.031] },
      follow: { p: [0, -0.36, -0.4], y: [-0.601, -0.45, -0.661], x: [-0.209, -0.709, 0.674] },
    },
    beil: {
      // one-handed, the same diagonal chop, shorter
      R: { p: [0.16, -0.24, -0.46], y: [0.1, 0.9, -0.45], x: [-1, 0, -0.3] },
      low: { p: [0.22, -0.4, -0.35], y: [0.1, -0.6, -0.8], x: [0, -0.8, 0.6] },
      wind: { p: [0.24, 0.02, -0.2], y: [0.45, 0.601, 0.661], x: [-0.184, 0.786, -0.59] },
      mid: { p: [0.18, -0.04, -0.36], y: [0.4, 0.799, -0.449], x: [-0.69, -0.061, -0.721] },
      hit: { p: [0.12, -0.2, -0.42], y: [-0.465, 0.199, -0.863], x: [-0.478, -0.876, 0.055] },
      follow: { p: [0.02, -0.34, -0.4], y: [-0.601, -0.45, -0.661], x: [-0.209, -0.709, 0.674] },
    },
    axt: {
      // a diagonal chop: up over the right shoulder, down from the upper right, the head hits in the middle (a zombie's head), on to the lower left
      R: { p: [0.12, -0.16, -0.5], y: [0.6, 0.75, 0.05], x: [-0.75, 0.6, 0] },
      low: { p: [0.18, -0.36, -0.3], y: [0.2, -0.4, -0.9], x: [0, -0.9, 0.4] },
      wind: { p: [0.22, 0.04, -0.2], y: [0.45, 0.601, 0.661], x: [-0.184, 0.786, -0.59] },
      mid: { p: [0.16, -0.02, -0.4], y: [0.447, 0.744, -0.496], x: [-0.677, -0.082, -0.732] },
      hit: { p: [0.1, -0.24, -0.42], y: [-0.332, 0.205, -0.921], x: [-0.51, -0.86, -0.007] },
      follow: { p: [0, -0.36, -0.4], y: [-0.601, -0.45, -0.661], x: [-0.209, -0.709, 0.674] },
    },
    sense: {
      R: { p: [0.15, -0.32, -0.5], y: [-0.35, 0.85, -0.4], x: [-1, 0, -0.2] },
      low: { p: [0.2, -0.4, -0.35], y: [-0.2, 0.5, -0.85], x: [-1, 0, 0] },
      wind: { p: [0.22, -0.1, -0.25], y: [0.3, 0.7, 0.65], x: [-0.9, 0.4, 0] },
      mid: { p: [0.15, -0.15, -0.42], y: [-0.1, 0.8, -0.6], x: [-1, 0, 0] },
      hit: { p: [0.05, -0.25, -0.5], y: [-0.4, 0.25, -0.88], x: [-0.9, -0.3, 0.3] },
      follow: { p: [-0.05, -0.35, -0.4], y: [-0.7, -0.2, -0.7], x: [-0.7, -0.4, 0.6] },
    },
  };
  const READY = {};
  for (const id of Object.keys(POSE)) READY[id] = POSE[id].R;
  // the fists (camera space): position, the finger axis, the way to the wrist
  const FIST = {
    R: { p: [0.12, -0.11, -0.38], y: [-0.15, 1, 0.1], z: [0.15, -0.3, 1] },
    L: { p: [-0.11, -0.1, -0.4], y: [0.15, 1, 0.1], z: [-0.15, -0.3, 1] },
    Rhit: { p: [0.045, -0.06, -0.5], y: [-1, 0.05, -0.05], z: [0.04, -0.15, 1] },
    Lhit: { p: [-0.035, -0.05, -0.48], y: [1, 0.05, -0.05], z: [-0.04, -0.15, 1] },
    Rlow: { p: [0.2, -0.34, -0.33], y: [-0.2, 0.3, -0.93], z: [0.1, 0.95, 0.3] },
    Llow: { p: [-0.2, -0.34, -0.33], y: [0.2, 0.3, -0.93], z: [-0.1, 0.95, 0.3] },
    Lside: { p: [-0.17, -0.25, -0.33], y: [0.5, 0.85, 0.15], z: [-0.25, -0.5, 1] }, // the free left hand beside a one-handed weapon
    Lpocket: { p: [-0.16, -0.5, -0.2], y: [0.2, 0.2, -1], z: [-0.2, -0.9, 0.3] },
  };
  function prepFists() {
    for (const k of Object.keys(FIST)) {
      const f = FIST[k];
      f.P = new THREE.Vector3(...f.p);
      f.Y = nrm(f.y);
      f.Z = nrm(f.z);
    }
  }
  prepFists();
  // a pose as an offset from the ready one: [dx, dy, dz, rx, ry, rz] (rx, ry, rz: a rotation about the camera's axes about the right hand)
  const REL = new Map(),
    _rq = new THREE.Quaternion(),
    _rq2 = new THREE.Quaternion();
  function rel(id, pose) {
    if (!pose || pose === POSE[id].R) return [0, 0, 0, 0, 0, 0];
    let r = REL.get(pose);
    if (r) return r;
    const R0 = POSE[id].R;
    basisQ(nrm(pose.y), nrm(pose.x), _rq);
    basisQ(nrm(R0.y), nrm(R0.x), _rq2);
    _rq.multiply(_rq2.invert());
    if (_rq.w < 0) _rq.set(-_rq.x, -_rq.y, -_rq.z, -_rq.w);
    const ang = 2 * Math.acos(Math.min(1, _rq.w)),
      sn = Math.sqrt(Math.max(0, 1 - _rq.w * _rq.w)),
      k = sn < 1e-6 ? 0 : ang / sn;
    r = [pose.p[0] - R0.p[0], pose.p[1] - R0.p[1], pose.p[2] - R0.p[2], _rq.x * k, _rq.y * k, _rq.z * k];
    REL.set(pose, r);
    return r;
  }
  // the moments of a blow: chops and swings (wind-up, middle, hit, follow-through), the fork's thrust
  const SEQ = {
    chop: (a, c) => [
      [0, 'R'],
      [a * 0.58, 'wind'],
      [a * 0.84, 'mid'],
      [a, 'hit'],
      [a + 0.1, 'follow'],
      [c * 0.95, 'R'],
    ],
    thrust: (a, c) => [
      [0, 'R'],
      [a * 0.65, 'wind'],
      [a, 'hit'],
      [a + 0.08, 'hit'],
      [c * 0.92, 'R'],
    ],
  };
  const keysOf = (id, seq) =>
    seq.map(([t, n]) => {
      const pz = POSE[id][n];
      return [t, ...rel(id, pz)];
    });
  function swingClip(id) {
    const w = W[id],
      P0 = POSE[id];
    if (!P0 || !P0.hit) return null;
    const keys = keysOf(id, (id === 'mistgabel' ? SEQ.thrust : SEQ.chop)(w.wind, w.cd));
    return { kind: 'swing', w: keys, dur: w.cd * 0.95, impact: w.wind };
  }
  // the reload of the Doppelflinte (2.3 s): break open, the shells fly, the new ones from the pocket into the chambers, snap shut
  function reloadClip(dur, spent) {
    const k = dur / 2.3;
    return {
      kind: 'reload',
      dur,
      w: keysOf('flinte', [
        [0, 'R'],
        [0.3 * k, 'open'],
        [1.62 * k, 'open'],
        [1.82 * k, 'close'],
        [2.3 * k, 'R'],
      ]),
      brk: [
        [0, 0],
        [0.18 * k, 0],
        [0.34 * k, 1],
        [1.62 * k, 1],
        [1.72 * k, 0.94],
        [1.8 * k, 0],
      ],
      // the left hand: 1 on the fore-end; else to the pocket, with the shells to the chambers
      L: [
        [0, 1],
        [0.36 * k, 1],
        [0.55 * k, 0, 'Lpocket'],
        [0.8 * k, 0, 'Lpocket'],
        [1.1 * k, 0, 'breech'],
        [1.45 * k, 0, 'breech'],
        [1.66 * k, 1],
        [2.3 * k, 1],
      ],
      ins: [1.1 * k, 1.42 * k], // the shells go in (zombie/z_fp.js gunParts)
      // (the sounds: zombie/z_waffe.js reload, timed the same – they play in third person too)
      ev: [
        [0.34 * k, () => eject(spent)],
        [0.8 * k, () => (S.inHand = Math.max(1, Math.min(2, spent)))],
        [1.1 * k, () => (S.inHand = 0)],
      ],
      spent,
    };
  }
  // the chainsaw's pull start: the saw turned a little, the left hand to the starter grip and back twice
  function pullClip(dur) {
    return {
      kind: 'pull',
      dur,
      w: keysOf('motorsaege', [
        [0, 'R'],
        [0.15, 'pull'],
        [dur - 0.25, 'pull'],
        [dur, 'R'],
      ]),
      L: [
        [0, 1],
        [0.18, 0, 'grip'],
        [0.42, 0, 'pull'],
        [0.62, 0, 'grip'],
        [0.95, 0, 'grip'],
        [1.18, 0, 'pull'],
        [1.4, 0, 'grip'],
        [dur, 1],
      ],
    };
  }
  // after editing POSE or FIST at run time (the pose tool): forget what was worked out from them
  function reset() {
    REL.clear();
    for (const k of Object.keys(RQ)) delete RQ[k];
    for (const id of Object.keys(POSE)) READY[id] = POSE[id].R;
    prepFists();
  }
  // ---- the curve through the keys: Catmull-Rom on each number, the times as knots ----
  function curve(keys, t, n, out) {
    const L = keys.length;
    if (t <= keys[0][0]) {
      for (let j = 0; j < n; j++) out[j] = keys[0][j + 1];
      return out;
    }
    if (t >= keys[L - 1][0]) {
      for (let j = 0; j < n; j++) out[j] = keys[L - 1][j + 1];
      return out;
    }
    let i = 0;
    while (i < L - 2 && t > keys[i + 1][0]) i++;
    const k0 = keys[Math.max(0, i - 1)],
      k1 = keys[i],
      k2 = keys[i + 1],
      k3 = keys[Math.min(L - 1, i + 2)],
      h = k2[0] - k1[0] || 1e-6,
      s = (t - k1[0]) / h,
      s2 = s * s,
      s3 = s2 * s;
    for (let j = 1; j <= n; j++) {
      const m1 = i === 0 ? 0 : ((k2[j] - k0[j]) / (k2[0] - k0[0] || 1e-6)) * h,
        m2 = i + 2 >= L ? 0 : ((k3[j] - k1[j]) / (k3[0] - k1[0] || 1e-6)) * h;
      out[j - 1] = (2 * s3 - 3 * s2 + 1) * k1[j] + (s3 - 2 * s2 + s) * m1 + (-2 * s3 + 3 * s2) * k2[j] + (s3 - s2) * m2;
    }
    return out;
  }
  const smooth = s => (s <= 0 ? 0 : s >= 1 ? 1 : s * s * (3 - 2 * s));
  // a hand track: [t, attach, poseName] → attach weight and the free pose blended between named poses
  function handTrack(keys, t) {
    if (!keys) return null;
    let i = 0;
    while (i < keys.length - 1 && t > keys[i + 1][0]) i++;
    const a = keys[i],
      b = keys[Math.min(keys.length - 1, i + 1)],
      s = b === a ? 0 : smooth((t - a[0]) / (b[0] - a[0] || 1e-6));
    return { at: a[1] + (b[1] - a[1]) * s, pa: a[2] || b[2] || null, pb: b[2] || a[2] || null, s };
  }
  // ---- the weapon's ready pose as numbers, cached per weapon ----
  const RQ = {};
  function ready(id) {
    if (RQ[id]) return RQ[id];
    const r = READY[id];
    if (!r) return null;
    const q = basisQ(nrm(r.y), nrm(r.x), new THREE.Quaternion());
    return (RQ[id] = { P: new THREE.Vector3(...r.p), Q: q, piv: new THREE.Vector3(...HANDS[id].R.p) });
  }
  // ---- what is in the hand, and whether the arms are drawn ----
  function curId() {
    const T = PLAY.carry;
    if (!T) return 'faust';
    if (T.zw) return T.zw;
    if (T.id === 'axe') return 'axt';
    return null; // something else (a tin, a board …): no arms
  }
  const active = () =>
    Z.on &&
    P.mode === 'walk' &&
    !CAM3.on &&
    !(VEH && VEH.cur) &&
    !PLAY.seat &&
    Z.hp > 0 &&
    !(window.ZHAUS && window.ZHAUS.busy) &&
    !(P.cam && !PLAY.seat);
  // ===== the player's own arms (Falko 5.11.: the hands must not look like a puppet's): a copy of the chosen figure (game/avatar.js
  // A.fig – the same photo-textured Rocketbox model as in third person, its geometry and textures shared) sits in the overlay with its
  // eyes at the camera, the head shrunk away; only arms and hands come into view. The arms reach the hands' places by a two-bone solver
  // (shoulder, elbow, wrist; the elbow's hinge kept as in the figure), every finger bends on its own (a fist round a handle, the index
  // finger at the trigger, the left hand under the fore-end, a clenched fist), the right leg kicks. One skinned mesh more in the overlay. =====
  const FING = ['Thumb', 'Index', 'Middle', 'Ring', 'Pinky'];
  // bend of the three joints of each finger (degrees; thumb, index … little finger) per hand pose
  // (looser than one thinks: a hand round a handle is half closed, more so from the index finger to the little finger – Falko 5.11.:
  // „sehr unrealistisch verstellt und verkrampft, insbesondere die Finger“; a clenched fist only to strike)
  const HPOSE = {
    grip: [
      [30, 20, 24],
      [42, 48, 28],
      [48, 54, 30],
      [52, 57, 31],
      [56, 60, 30],
    ],
    fist: [
      [52, 34, 42],
      [76, 86, 48],
      [79, 89, 50],
      [81, 89, 49],
      [83, 87, 47],
    ],
    trigger: [
      [30, 18, 20],
      [14, 10, 4],
      [50, 56, 30],
      [54, 58, 31],
      [58, 60, 30],
    ],
    cradle: [
      [12, 8, 5],
      [24, 28, 16],
      [27, 31, 17],
      [30, 33, 17],
      [33, 35, 16],
    ],
    relax: [
      [8, 6, 4],
      [10, 14, 8],
      [12, 16, 9],
      [14, 18, 10],
      [16, 20, 10],
    ],
  };

  let FB = null;
  const _bm = new THREE.Matrix4(),
    _bm2 = new THREE.Matrix4(),
    _bq = new THREE.Quaternion(),
    _bq2 = new THREE.Quaternion(),
    _bv = V(),
    _bv3 = V(),
    _bs = V(1, 1, 1);
  const wpos = (o, v) => o.getWorldPosition(v);
  function fpBody(b) {
    const F = AVATAR && AVATAR.ready ? AVATAR.fig : null;
    if (!F || !F.model || !F.B || !F.B.RightHand || !F.B.LeftHand) return null;
    if (FB && FB.src === F) return FB;
    if (FB) FB.root.removeFromParent();
    FB = null;
    try {
      const model = skelClone(F.model),
        root = new THREE.Group(),
        inner = new THREE.Group();
      inner.rotation.y = Math.PI; // the model faces +z, the camera looks along −z
      inner.add(model);
      root.add(inner);
      b.rig.add(root);
      b.rig.updateWorldMatrix(true, true);
      const Bn = {};
      model.traverse(x => {
        if (x.isBone) {
          const c = canonBone(x.name);
          if (c && !Bn[c]) Bn[c] = x;
        }
        if (x.isMesh) {
          x.frustumCulled = false;
          x.castShadow = false;
          x.receiveShadow = false;
        }
      });
      for (const k of ['Head', 'RightArm', 'RightForeArm', 'RightHand', 'LeftArm', 'LeftForeArm', 'LeftHand'])
        if (!Bn[k]) throw new Error('bone ' + k);
      // standing at ease: the figure's idle clip at its start (the source may be in the middle of a step or a gesture)
      if (F.clips && F.clips.idle) {
        const mx = new THREE.AnimationMixer(model),
          a = mx.clipAction(F.clips.idle);
        a.play();
        mx.update(0);
        a.stop();
        mx.uncacheRoot(model);
      }
      root.updateMatrixWorld(true);
      // where things are in the rig (camera) space
      const inv = _bm.copy(root.matrixWorld).invert(),
        loc = n => wpos(Bn[n], V()).applyMatrix4(inv);
      const mid = loc('RightArm').add(loc('LeftArm')).multiplyScalar(0.5);
      root.position.set(0, -0.255, 0.075).sub(mid);
      root.updateMatrixWorld(true);
      const fwd = V(0, 0, -1).applyQuaternion(b.rig.getWorldQuaternion(_bq)); // the figure's forward (the camera's)
      const fb = { src: F, root, model, B: Bn, arm: {}, leg: null, fing: { R: [], L: [] }, cur: { R: null, L: null } };
      // the limbs: lengths, and in each bone's own frame the axis along it and the hinge (elbow: flexes forward; knee: backward)
      const limb = (a, m, e, bend) => {
        const A = Bn[a],
          M = Bn[m],
          E = Bn[e];
        if (!A || !M || !E) return null;
        const pa = wpos(A, V()),
          pm = wpos(M, V()),
          pe = wpos(E, V()),
          d1 = pm.clone().sub(pa),
          d2 = pe.clone().sub(pm),
          L1 = d1.length(),
          L2 = d2.length();
        d1.normalize();
        d2.normalize();
        const hinge = V().crossVectors(d1, fwd.clone().multiplyScalar(bend));
        if (hinge.lengthSq() < 1e-6) hinge.set(0, 1, 0);
        hinge.normalize();
        const qa = A.getWorldQuaternion(new THREE.Quaternion()).invert(),
          qm = M.getWorldQuaternion(new THREE.Quaternion()).invert();
        return {
          A,
          M,
          E,
          L1,
          L2,
          a1: d1.clone().applyQuaternion(qa),
          n1: hinge.clone().applyQuaternion(qa),
          a2: d2.clone().applyQuaternion(qm),
          n2: hinge.clone().applyQuaternion(qm),
          restA: A.quaternion.clone(),
          restM: M.quaternion.clone(),
          restE: E.quaternion.clone(),
        };
      };
      fb.arm.R = limb('RightArm', 'RightForeArm', 'RightHand', 1);
      fb.arm.L = limb('LeftArm', 'LeftForeArm', 'LeftHand', 1);
      fb.leg = limb('RightUpLeg', 'RightLeg', 'RightFoot', -1);
      // each hand: the frame of a closed hand round a handle (as game/avatar.js grip), bone space → grip frame; the fingers' hinges
      for (const sd of ['R', 'L']) {
        const S0 = sd === 'R' ? 'Right' : 'Left',
          H = Bn[S0 + 'Hand'],
          Mi = Bn[S0 + 'HandMiddle1'],
          I = Bn[S0 + 'HandIndex1'],
          K = Bn[S0 + 'HandPinky1'];
        const hp = wpos(H, V()),
          f = (Mi ? wpos(Mi, V()) : hp.clone().add(fb.arm[sd].a2)).sub(hp),
          L = f.length();
        f.normalize();
        const t = I && K ? wpos(I, V()).sub(wpos(K, V())) : V(0, 1, 0);
        t.addScaledVector(f, -t.dot(f)).normalize();
        const n = V().crossVectors(f, t).normalize(),
          palm = sd === 'R' ? n.clone().negate() : n.clone(); // out of the palm
        const at = hp
          .clone()
          .addScaledVector(f, L * 0.55)
          .addScaledVector(palm, L * 0.2);
        const G = new THREE.Matrix4().makeBasis(f, t, n).setPosition(at);
        fb.arm[sd].grip = H.matrixWorld.clone().invert().multiply(G).invert(); // grip frame → bone
        for (let fi = 0; fi < 5; fi++)
          for (let k = 1; k <= 3; k++) {
            const bn = Bn[S0 + 'Hand' + FING[fi] + k];
            if (!bn) continue;
            // its direction: to the next joint; the last joint (no bone after it) bends like the one before
            const ch = bn.children.find(c => c.isBone),
              dir = ch
                ? wpos(ch, V()).sub(wpos(bn, V()))
                : bn.parent && bn.parent.isBone
                  ? wpos(bn, V()).sub(wpos(bn.parent, V()))
                  : null;
            if (!dir || dir.lengthSq() < 1e-8) continue;
            dir.normalize();
            // the thumb folds across the palm: its hinge leans towards the fingers' line
            const ax = V().crossVectors(
              dir,
              fi === 0 ? palm.clone().addScaledVector(t, sd === 'R' ? -0.6 : 0.6) : palm
            );
            if (ax.lengthSq() < 1e-8) continue;
            ax.normalize().applyQuaternion(bn.getWorldQuaternion(new THREE.Quaternion()).invert());
            fb.fing[sd].push({ bn, fi, k, rest: bn.quaternion.clone(), ax, cur: 0 });
          }
      }
      // the head (and with it hair, cap, glasses, ear defenders) shrunk to nothing; the eyes are the camera
      // the hands as people hold things: finger poses taken from the figure's own motion-capture clips – holding a tool (right hand),
      // gripping the steering wheel (both hands) –, the frame where the fingers are closed most; at ease: the idle pose
      fb.pq = { grip: { R: null, L: null } };
      const sampleClip = (name, sd) => {
        const clip = F.clips && F.clips[name];
        if (!clip || !fb.fing[sd].length) return null;
        const mx = new THREE.AnimationMixer(model),
          a = mx.clipAction(clip);
        a.play();
        let best = null,
          bc = -1;
        for (let i = 0; i <= 12; i++) {
          mx.setTime((clip.duration * i) / 12);
          let c = 0;
          for (const f of fb.fing[sd]) if (f.fi > 0) c += Math.acos(Math.min(1, Math.abs(f.bn.quaternion.dot(f.rest))));
          if (c > bc) {
            bc = c;
            best = fb.fing[sd].map(f => f.bn.quaternion.clone());
          }
        }
        a.stop();
        mx.uncacheRoot(model);
        return bc > 0.6 ? best : null;
      };
      fb.pq.grip.R = sampleClip('holdTool', 'R') || sampleClip('drive', 'R');
      fb.pq.grip.L = sampleClip('drive', 'L') || sampleClip('holdTool', 'L');
      // back to standing at ease
      if (F.clips && F.clips.idle) {
        const mx = new THREE.AnimationMixer(model),
          a = mx.clipAction(F.clips.idle);
        a.play();
        mx.update(0);
        a.stop();
        mx.uncacheRoot(model);
      }
      for (const sd of ['R', 'L']) for (const f of fb.fing[sd]) f.bn.quaternion.copy(f.rest);
      Bn.Head.scale.setScalar(0.001);
      FB = fb;
      return FB;
    } catch (e) {
      console.warn('zfp body', e);
      return null;
    }
  }
  // a limb to its end: the two-bone solver in world space; the root bone and the middle bone turned so that their axis points along
  // and their hinge lies across the bend; the end bone (hand, foot) gets the world turn q
  const _wA = V(),
    _wE = V(),
    _wT = V(),
    _wu = V(),
    _wv = V(),
    _wn = V(),
    _wx = V(),
    _bx = V(),
    _by = V(),
    _bz = V();
  function aimBone(bone, aLocal, nLocal, along, hinge) {
    // world turn whose (aLocal, nLocal) go to (along, hinge)
    _bx.copy(aLocal);
    _by.copy(nLocal).addScaledVector(_bx, -nLocal.dot(_bx)).normalize();
    _bz.crossVectors(_bx, _by);
    _bm.makeBasis(_bx, _by, _bz);
    _wx.copy(hinge).addScaledVector(along, -hinge.dot(along)).normalize();
    _bz.crossVectors(along, _wx);
    _bm2.makeBasis(along, _wx, _bz);
    _bm2.multiply(_bm.transpose());
    _bq.setFromRotationMatrix(_bm2);
    bone.parent.getWorldQuaternion(_bq2).invert();
    bone.quaternion.copy(_bq2.multiply(_bq));
    bone.updateMatrixWorld(true);
  }
  function reachLimb(L, target, pole, endQ) {
    wpos(L.A, _wA);
    _wT.copy(target);
    let d = _wA.distanceTo(_wT);
    const max = (L.L1 + L.L2) * 0.999;
    if (d > max) {
      _wT
        .sub(_wA)
        .multiplyScalar(max / d)
        .add(_wA);
      d = max;
    }
    d = Math.max(d, Math.abs(L.L1 - L.L2) + 0.01);
    _wu.subVectors(_wT, _wA).normalize();
    const x = (L.L1 * L.L1 - L.L2 * L.L2 + d * d) / (2 * d),
      h = Math.sqrt(Math.max(0, L.L1 * L.L1 - x * x));
    _wv.copy(pole).addScaledVector(_wu, -pole.dot(_wu));
    if (_wv.lengthSq() < 1e-8) _wv.set(0, -1, 0);
    _wv.normalize();
    _wE.copy(_wA).addScaledVector(_wu, x).addScaledVector(_wv, h);
    // the hinge: across the bend (upper part × lower part)
    _wn.crossVectors(_wv, _wu).normalize();
    aimBone(L.A, L.a1, L.n1, _bv.subVectors(_wE, _wA).normalize(), _wn);
    aimBone(L.M, L.a2, L.n2, _bv.subVectors(_wT, _wE).normalize(), _wn);
    if (endQ) {
      L.E.parent.getWorldQuaternion(_bq2).invert();
      L.E.quaternion.copy(_bq2.multiply(endQ));
      L.E.updateMatrixWorld(true);
    }
  }
  // a hand of the figure to the hand frame of the poses (camera space: hp, and hq with x the back of the hand, y the index side,
  // z towards the wrist) – the grip frame of the figure is x the fingers (−z), y the index side, z the back of the hand
  const QG = new THREE.Quaternion().setFromAxisAngle(V(0, 1, 0), Math.PI / 2),
    _gm = new THREE.Matrix4(),
    _gq = new THREE.Quaternion(),
    _gp = V(),
    _pw = V();
  // the wrist straight on the forearm: after a first reach the hand turns towards the elbow – about the handle only when it holds one
  // (the handle stays in the fist), freely for a fist; then the arm reaches again
  const _hq = new THREE.Quaternion(),
    _fy = V(),
    _fz = V(),
    _fx = V(),
    _rigI = new THREE.Matrix4();
  function handBone(L, hp, hq, rigM) {
    _gq.copy(hq).multiply(QG);
    _gm.compose(_gp.copy(hp), _gq, _bs).premultiply(rigM).multiply(L.grip); // the hand bone's world matrix
    _gm.decompose(_gp, _gq, _bv3);
  }
  function placeBodyArm(fb, sd, hp, hq, rigM, rigQ, held) {
    const L = fb.arm[sd];
    _pw.copy(POLE[sd]).applyQuaternion(rigQ);
    handBone(L, hp, hq, rigM);
    reachLimb(L, _gp, _pw, _gq);
    // the forearm's way from the wrist to the elbow, in camera space
    _rigI.copy(rigM).invert();
    wpos(L.M, _fz).applyMatrix4(_rigI);
    wpos(L.E, _fx).applyMatrix4(_rigI);
    _fz.sub(_fx).normalize();
    _fy.set(0, 1, 0).applyQuaternion(hq); // the index side (along the handle)
    _hq.copy(hq);
    if (held) {
      _fz.addScaledVector(_fy, -_fz.dot(_fy));
      if (_fz.lengthSq() > 1e-4) handQ(_fy, _fz.normalize(), _hq);
    } else {
      _fx.set(0, 0, 1).applyQuaternion(hq).lerp(_fz, 0.65).normalize();
      handQ(_fy, _fx, _hq);
    }
    handBone(L, hp, _hq, rigM);
    reachLimb(L, _gp, _pw, _gq);
  }
  // the fingers towards a hand pose (blended a little each frame)
  // grip: the captured hold (the trigger: its index finger at ease along the guard; under the fore-end: half closed); a fist and the
  // rest by bending the joints (HPOSE); each frame the fingers move part of the way there
  const _fq2 = new THREE.Quaternion();
  function fingers(fb, sd, pose, dt) {
    const k = Math.min(1, dt * 12),
      cap = fb.pq && fb.pq.grip[sd],
      P0 = HPOSE[pose] || HPOSE.relax;
    const useCap = cap && (pose === 'grip' || pose === 'trigger' || pose === 'cradle');
    fb.fing[sd].forEach((f, i) => {
      if (useCap) {
        _fq2.copy(cap[i]);
        if (pose === 'trigger' && f.fi === 1) _fq2.copy(f.rest).slerp(cap[i], 0.18);
        else if (pose === 'cradle') _fq2.copy(f.rest).slerp(cap[i], 0.55);
      } else _fq2.copy(f.rest).multiply(_bq.setFromAxisAngle(f.ax, P0[f.fi][f.k - 1] * (Math.PI / 180)));
      f.bn.quaternion.slerp(_fq2, k);
    });
  }
  // ---- the frame: pose the weapon, the hands, the arms (called by HELD.place, game/play.js H.post) ----
  const wOff = [0, 0, 0, 0, 0, 0],
    tmp = [0, 0, 0, 0, 0, 0],
    ZERO = [0, 0, 0, 0, 0, 0],
    wP = V(),
    wQ = new THREE.Quaternion(),
    gP = { R: V(), L: V() },
    gQ = { R: new THREE.Quaternion(), L: new THREE.Quaternion() },
    hP = { R: V(), L: V() },
    hQ = { R: new THREE.Quaternion(), L: new THREE.Quaternion() },
    use = { R: false, L: false },
    camQ = new THREE.Quaternion(),
    camP = V();
  // aspect: on a narrow (portrait) screen everything comes in towards the middle
  const squeeze = () => Math.max(0.55, Math.min(1, cam.aspect / 1.45));
  function post() {
    const t0 = performance.now();
    postArms();
    S.postMs = (S.postMs || 0) * 0.9 + (performance.now() - t0) * 0.1;
  }
  function postArms() {
    const id = curId();
    if (!S.shown || !id) {
      if (B) B.rig.visible = false;
      return;
    }
    const b = build();
    b.rig.visible = true;
    dress(b);
    camQ.copy(cam.quaternion);
    camP.copy(cam.position);
    b.rig.position.copy(camP);
    b.rig.quaternion.copy(camQ);
    const sq = squeeze(),
      obj = HELD.obj,
      R0 = id !== 'faust' ? ready(id) : null,
      clip = S.clipA,
      ct = clip ? clip.t : 0;
    // the common sway: walking, breathing, the drag of turning, the draw, a jolt
    const walk = Math.min(1, HELD.sway),
      ph = ((P.stride || 0) * Math.PI) / 0.72,
      tired = Z.stam < 30 ? (30 - Z.stam) / 30 : 0,
      br = Math.sin(S.time * (1.6 + tired * 1.4)) * (1 + tired * 2.5);
    // walking: a lying eight (side to side once per two steps, down at every step), stronger running; a dip when stopping short
    const bob = walk * (1 + S.run * 0.9),
      dip = Math.sin(S.dip * Math.PI) * 0.5 + S.land * 0.6;
    const sw = [
      Math.sin(ph) * 0.011 * bob - S.lagYaw * 0.12 + S.run * 0.03,
      -Math.abs(Math.cos(ph)) * 0.012 * bob +
        br * 0.002 -
        S.drawK * 0.32 +
        S.lagPitch * 0.1 -
        S.run * 0.06 -
        dip * 0.035,
      S.drawK * 0.06 + S.run * 0.04 - dip * 0.02,
      Math.abs(Math.cos(ph)) * 0.012 * bob +
        br * 0.0035 -
        S.drawK * 0.55 +
        S.lagPitch * 0.9 +
        S.jolt * 0.12 -
        S.run * 0.3 -
        dip * 0.08,
      S.lagYaw * 0.9 + S.run * 0.22,
      Math.sin(ph) * 0.018 * bob - S.jolt * 0.08 - S.run * 0.15,
    ];
    use.R = use.L = false;
    if (R0 && obj) {
      // the weapon: ready, lowered a little by calm (only part of the way to 'low': what is in the hand stays in view – Falko 5.11.:
      // „Es macht natürlich Sinn, dass die Waffe, wenn ich sie in der Hand habe, auch zu sehen ist“), the clip, the sway, the recoil,
      // the saw's shake
      const low = POSE[id] && POSE[id].low ? rel(id, POSE[id].low) : ZERO,
        k = (1 - S.alert) * S.lowK;
      for (let j = 0; j < 6; j++) wOff[j] = low[j] * k + sw[j];
      if (clip && clip.c.w) {
        curve(clip.c.w, ct, 6, tmp);
        for (let j = 0; j < 6; j++) wOff[j] += tmp[j];
      }
      if (S.recoilT < 0.5) {
        const r = S.recoilT < 0.03 ? S.recoilT / 0.03 : Math.exp(-(S.recoilT - 0.03) * 11);
        wOff[2] += 0.06 * r;
        wOff[1] += 0.01 * r;
        wOff[3] += 0.16 * r;
      }
      if (id === 'motorsaege' && ZWAFFE.saw && (ZWAFFE.saw.run || ZWAFFE.saw.start > 0)) {
        const s = ZWAFFE.saw,
          v = (s.run ? 0.0016 + 0.0024 * s.rpm + 0.004 * s.cut : 0.004) * (Math.random() - 0.5) * 2;
        wOff[0] += v;
        wOff[1] += v * 0.7;
        wOff[4] += v * 1.5;
        if (ZWAFFE.saw.run && ZWAFFE.down) {
          wOff[2] -= 0.07 * (0.4 + s.cut);
          wOff[1] += 0.025;
          wOff[3] += 0.06;
        }
      }
      // the weapon in camera space: the right hand at P (+ offset), turned by the offset about the hand
      qFromRV(wOff[3], wOff[4], wOff[5], _q);
      wQ.copy(_q).multiply(R0.Q);
      wP.set(R0.P.x * sq + wOff[0], R0.P.y + wOff[1], R0.P.z + wOff[2]);
      // its origin: the hand minus the turned grip point
      _o.copy(R0.piv).applyQuaternion(wQ);
      _a.copy(wP).sub(_o);
      obj.position.copy(_a).applyQuaternion(camQ).add(camP);
      obj.quaternion.copy(camQ).multiply(wQ);
      obj.scale.setScalar(1);
      // the gun's barrels, its shells
      if (id === 'flinte') gunParts(obj, clip, ct);
      // the grips in camera space
      for (const sd of ['R', 'L']) {
        const g = HANDS[id][sd];
        if (!g) continue;
        gP[sd].set(g.p[0], g.p[1], g.p[2]).applyQuaternion(wQ).add(_a);
        _y.set(g.y[0], g.y[1], g.y[2]).applyQuaternion(wQ);
        // the wrist: towards the shoulder, square to the handle, tipped a little along it (a handle lies across the palm)
        _d.copy(SH[sd]).sub(gP[sd]).normalize();
        const al = _d.dot(_y);
        _z.copy(_d).addScaledVector(_y, -al);
        if (_z.lengthSq() < 1e-5) _z.set(0, -1, 0);
        _z.normalize().addScaledVector(_y, Math.sign(al) * Math.min(0.42, Math.abs(al) * 0.6));
        handQ(_y, _z, gQ[sd]);
        use[sd] = true;
      }
      if (S.flashT < 0.07) flash(obj, wQ);
      else b.fl.visible = false;
    } else b.fl.visible = false;
    // the hands: on the grips, or free (fists, the left hand beside a one-handed weapon, the reload, the pull start)
    const fist = id === 'faust',
      fb = fpBody(b),
      now = performance.now(),
      dtp = Math.min(0.1, Math.max(0, (now - (S.postT || now)) / 1000));
    S.postT = now;
    if (fb) {
      b.rig.updateMatrixWorld(true);
      for (const a of [b.R, b.L]) a.up.visible = a.fo.visible = a.hand.visible = false;
    }
    for (const sd of ['R', 'L']) {
      const free = fistPose(sd, fist, clip, ct, sq);
      let at = use[sd] ? 1 : 0;
      if (use[sd] && clip && clip.c[sd]) {
        const tr = handTrack(clip.c[sd], ct);
        at = tr.at;
      }
      if (at >= 0.999) {
        hP[sd].copy(gP[sd]);
        hQ[sd].copy(gQ[sd]);
      } else if (at <= 0.001) {
        hP[sd].copy(free.P);
        hQ[sd].copy(free.Q);
      } else {
        hP[sd].copy(free.P).lerp(gP[sd], at);
        hQ[sd].copy(free.Q).slerp(gQ[sd], at);
      }
      // a fist free in the air sways too
      if (!use[sd] || at < 1) {
        hP[sd].x += sw[0] * 0.8;
        hP[sd].y += sw[1] * 0.8;
      }
      if (fb) {
        placeBodyArm(fb, sd, hP[sd], hQ[sd], b.rig.matrixWorld, camQ, use[sd] && at > 0.5);
        // the fingers: round the handle (the gun: the index finger at the trigger, the left hand under the fore-end), a fist, at ease
        const g = use[sd] && HANDS[id] && HANDS[id][sd];
        // (while reloading the right hand holds the stock's wrist with all fingers, the index finger off the trigger)
        const pose =
          at > 0.5 && g
            ? g.pose === 'trigger' && clip && clip.c.kind === 'reload'
              ? 'grip'
              : g.pose || 'grip'
            : fist || !clip || !clip.c[sd]
              ? S.alert > 0.4 || (clip && clip.c.kind === 'punch')
                ? 'fist'
                : 'relax'
              : 'grip';
        fingers(fb, sd, pose, dtp);
      } else placeArm(b[sd], sd, hP[sd], hQ[sd]);
    }
    // shells in the left hand on the way to the chambers
    for (let i = 0; i < 2; i++) {
      const s = b.sh[2 + i];
      s.visible = i < (S.inHand || 0);
      if (s.visible) {
        _v.set(-0.006 - i * 0.022, 0.012, -0.03)
          .applyQuaternion(hQ.L)
          .add(hP.L);
        s.position.copy(_v);
        _q2.setFromAxisAngle(_u.set(1, 0, 0), -1.2);
        s.quaternion.copy(hQ.L).multiply(_q2);
      }
    }
    if (id === 'motorsaege' && obj) sawParts(obj);
    else b.cord.visible = false;
    // the boot of the kick: the figure's own leg, else the boot
    kickPose(b, fb);
  }
  // a free hand: the fist's guard (raised by alertness), the punch, the left beside a one-handed weapon, the reload's pocket and breech
  // (BRE: the left hand at the chambers – o: its place in the barrels' frame from the hinge pin, x right, y along the barrels, z up;
  // y, z: its index side and the way to its wrist, camera space)
  const BRE = { o: [-0.065, -0.085, 0.02], y: [0.9, 0.35, -0.25], z: [-0.55, -0.55, 0.65] };
  const _fp = { P: V(), Q: new THREE.Quaternion() },
    _fq = new THREE.Quaternion(),
    _fv = V();
  function namedPose(sd, name, out) {
    if (name === 'breech' || name === 'breech2' || name === 'grip' || name === 'pull') {
      // points on the weapon (gun: over the chambers; saw: the starter grip and the pulled-out cord)
      const obj = HELD.obj;
      if (!obj) return namedPose(sd, 'Lpocket', out);
      if (name === 'breech' || name === 'breech2') {
        // behind the chamber mouths of the opened gun (the barrels turned about the hinge by the break): the thumb pushes the shells
        const B = BRE,
          th = -0.6 * S.brk,
          c = Math.cos(th),
          sn = Math.sin(th),
          [lx, ly, lz] = B.o;
        _fv
          .set(lx, 0.455 + ly * c - lz * sn, -0.022 + ly * sn + lz * c)
          .applyQuaternion(wQ)
          .add(_a);
        out.P.copy(_fv);
        handQ(_u.set(...B.y), _v.set(...B.z), out.Q);
        return out;
      }
      const lp = name === 'grip' ? [-0.15, 0.26, 0.1] : [-0.36, 0.2, 0.32];
      _fv.set(lp[0], lp[1], lp[2]).applyQuaternion(wQ).add(_a);
      out.P.copy(_fv);
      handQ(_u.set(0, 1, 0.4), _v.set(-0.5, -0.6, 0.6), out.Q);
      return out;
    }
    const f = FIST[name];
    out.P.copy(f.P);
    handQ(f.Y, f.Z, out.Q);
    return out;
  }
  const _fa = { P: V(), Q: new THREE.Quaternion() },
    _fb = { P: V(), Q: new THREE.Quaternion() };
  function fistPose(sd, fist, clip, ct, sq) {
    const out = _fp;
    if (clip && clip.c[sd] && !fist) {
      const tr = handTrack(clip.c[sd], ct);
      if (tr && tr.pa) {
        namedPose(sd, tr.pa, _fa);
        namedPose(sd, tr.pb, _fb);
        out.P.copy(_fa.P).lerp(_fb.P, tr.s);
        out.Q.copy(_fa.Q).slerp(_fb.Q, tr.s);
        return out;
      }
    }
    // the guard, between low and raised
    const hi = sd === 'R' ? FIST.R : FIST.L,
      lo = sd === 'R' ? FIST.Rlow : FIST.Llow,
      k = fist ? S.alert : 0;
    out.P.copy(lo.P).lerp(hi.P, k);
    out.P.x *= sq;
    handQ(_u.copy(lo.Y).lerp(hi.Y, k), _v.copy(lo.Z).lerp(hi.Z, k), out.Q);
    // the punch: out to the hit pose and back
    if (fist && clip && clip.c.kind === 'punch' && clip.c.side === sd) {
      const a = clip.c.impact,
        t = ct;
      const e = t < a ? smooth(t / a) : 1 - smooth((t - a - 0.04) / (clip.c.dur - a - 0.04));
      const h = sd === 'R' ? FIST.Rhit : FIST.Lhit;
      out.P.lerp(h.P, e);
      _fq.copy(out.Q);
      handQ(h.Y, h.Z, out.Q);
      out.Q.copy(_fq.slerp(out.Q, e));
    } else if (fist && clip && clip.c.kind === 'punch') {
      // the other fist pulls back a little to the chin
      const a = clip.c.impact,
        e = ct < a ? smooth(ct / a) : 1 - smooth((ct - a) / (clip.c.dur - a));
      out.P.z += 0.04 * e;
      out.P.y += 0.015 * e;
    }
    return out;
  }
  // an arm: the wrist from the hand, the elbow by the two-bone solver (the shoulder comes forward when the hand reaches far)
  const _sh = V(),
    _el = V(),
    _wr = V();
  function placeArm(a, sd, hp, hq) {
    a.hand.position.copy(hp);
    a.hand.quaternion.copy(hq);
    // the wrist: back from the fist along the hand's +z, a little to the back of the hand (+x, mirrored for the left)
    _wr
      .set(sd === 'R' ? 0.012 : -0.012, 0, WR)
      .applyQuaternion(hq)
      .add(hp);
    _sh.copy(SH[sd]);
    _sh.x *= squeeze();
    let d = _sh.distanceTo(_wr);
    const max = (UP + FORE) * 0.998;
    if (d > max) {
      _sh.addScaledVector(_c.subVectors(_wr, _sh).normalize(), d - max);
      d = max;
    }
    if (d < 0.05) d = 0.05;
    _u.subVectors(_wr, _sh).normalize();
    const x = (UP * UP - FORE * FORE + d * d) / (2 * d),
      h = Math.sqrt(Math.max(0, UP * UP - x * x));
    _v.copy(POLE[sd]).addScaledVector(_u, -POLE[sd].dot(_u));
    if (_v.lengthSq() < 1e-6) _v.set(0, -1, 0);
    _v.normalize();
    _el.copy(_sh).addScaledVector(_u, x).addScaledVector(_v, h);
    seg(a.up, _sh, _el);
    seg(a.fo, _el, _wr);
  }
  function seg(me, A, Bp) {
    me.position.copy(A);
    _d.subVectors(Bp, A).normalize();
    me.quaternion.setFromUnitVectors(YUP, _d);
  }
  // ---- the gun: barrels broken open by the clip, shells shown while open, the flying empties ----
  function gunParts(obj, clip, ct) {
    const lauf = obj.getObjectByName('lauf');
    if (!lauf) return;
    let k = 0;
    if (clip && clip.c.brk) k = Math.max(0, Math.min(1, curve(clip.c.brk, ct, 1, tmp)[0]));
    S.brk = k;
    lauf.rotation.x = -0.6 * k;
    // while open the chambers show what is in them: the right barrel (0) fires first, so one shell left sits in the left one (1); the
    // new ones slide in during the reload, the right one first
    const re = clip && clip.c.kind === 'reload' ? clip.c : null,
      left = re ? 2 - re.spent : ZWAFFE.state('flinte').ammo;
    for (let i = 0; i < 2; i++) {
      const p = lauf.getObjectByName('patrone' + i);
      if (!p) continue;
      if (p.userData.y0 === undefined) p.userData.y0 = p.position.y;
      const live = i === 1 ? left >= 1 : left >= 2;
      let vis = live,
        slide = 0;
      if (re && !live) {
        const n = Math.max(1, Math.min(2, re.spent)),
          o = re.spent >= 2 ? i : 0,
          w = (re.ins[1] - re.ins[0]) / n,
          a = re.ins[0] + w * o;
        vis = ct >= a;
        slide = 1 - smooth((ct - a) / w);
      }
      p.position.y = p.userData.y0 - 0.075 * slide;
      p.visible = k > 0.05 && vis;
    }
  }
  // the spent shells: out of the chambers, up and back over the shoulder, turning
  function eject(n) {
    const b = build(),
      obj = HELD.obj,
      lauf = obj && obj.getObjectByName('lauf');
    if (!lauf) return;
    for (let i = 0; i < Math.min(2, n); i++) {
      const s = b.sh[i];
      // the chamber in camera space
      lauf.updateMatrixWorld(true);
      _v.set(i ? -0.0106 : 0.0106, 0.3852 - 0.455, 0.022).applyMatrix4(lauf.matrixWorld);
      _v.sub(cam.position).applyQuaternion(_q2.copy(cam.quaternion).invert());
      s.position.copy(_v);
      s.visible = true;
      S.shells[i] = {
        s,
        t: 0,
        v: new THREE.Vector3(0.35 + Math.random() * 0.3, 1.1 + Math.random() * 0.4, 0.55 + Math.random() * 0.3),
        w: new THREE.Vector3(6 + Math.random() * 6, Math.random() * 3, 3 + Math.random() * 4),
      };
    }
    if (n > 0) setTimeout(() => ZTON.shellDrop && ZTON.shellDrop(P.x, P.y), 420);
  }
  function shellsTick(dt) {
    for (let i = 0; i < 2; i++) {
      const e = S.shells[i];
      if (!e) continue;
      e.t += dt;
      e.v.y -= 9.8 * dt;
      e.s.position.addScaledVector(e.v, dt);
      e.s.rotation.x += e.w.x * dt;
      e.s.rotation.y += e.w.y * dt;
      e.s.rotation.z += e.w.z * dt;
      if (e.t > 0.7) {
        e.s.visible = false;
        S.shells[i] = null;
      }
    }
  }
  // the muzzle flash at the front of the barrels, and the lamp of the overlay lights hands and gun
  function flash(obj, wq) {
    const b = build();
    _v.set(0, 1.11, 0).applyQuaternion(wq).add(_a);
    b.fl.position.copy(_v);
    b.fl.quaternion.copy(wq).multiply(_q2.setFromAxisAngle(_u.set(0, 1, 0), Math.random() * 2));
    const s = 0.7 + Math.random() * 0.6;
    b.fl.scale.set(s, 0.8 + Math.random() * 0.5, s);
    b.fl.visible = true;
    // the overlay's lamp at the muzzle (world space)
    HELD.lampAt = (HELD.lampAt || new THREE.Vector3()).copy(_v).applyQuaternion(cam.quaternion).add(cam.position);
  }
  function muzzle() {
    if (!S.shown || curId() !== 'flinte' || !HELD.obj) return null;
    const v = new THREE.Vector3(0, 1.1, 0).applyQuaternion(HELD.obj.quaternion).add(HELD.obj.position);
    return [v.x, -v.z, v.y]; // three → site (x east, y north, z up)
  }
  // ---- the saw: the starter cord while pulling ----
  function sawParts(obj) {
    const b = build(),
      clip = S.clipA;
    if (!clip || clip.c.kind !== 'pull') {
      b.cord.visible = false;
      return;
    }
    // from the starter housing to the left hand
    _v.set(-0.125, 0.26, 0.095).applyQuaternion(wQ).add(_a);
    _c.copy(hP.L);
    const d = _v.distanceTo(_c);
    if (d < 0.03) {
      b.cord.visible = false;
      return;
    }
    b.cord.visible = true;
    b.cord.position.copy(_v);
    b.cord.quaternion.setFromUnitVectors(YUP, _d.subVectors(_c, _v).normalize());
    b.cord.scale.set(1, d, 1);
  }
  // ---- the kick: the boot comes up from below, the sole forward ----
  // [t, ankle x y z, toe direction, shin direction (ankle to knee)]: up from below, the knee comes up, the sole forward, back down
  const KICK = [
    [0, 0.12, -0.95, -0.15, 0, 0, -1, 0, 1, 0.1],
    [0.1, 0.1, -0.62, -0.38, 0, 0.3, -0.95, 0, 0.6, 0.8],
    [0.2, 0.05, -0.26, -0.62, 0, 0.85, -0.5, 0, -0.45, 0.9],
    [0.3, 0.06, -0.42, -0.52, 0, 0.6, -0.8, 0, 0.1, 0.99],
    [0.55, 0.12, -0.95, -0.2, 0, 0, -1, 0, 1, 0.1],
  ];
  const kv = new Array(9),
    _kp = V(),
    _kf = V(),
    _ku = V(),
    _kpole = V();
  function kickPose(b, fb) {
    const k = S.kickA;
    if (fb && fb.leg) {
      b.leg.visible = false;
      const L = fb.leg;
      if (!k || k.t > 0.55) {
        if (L.kicked) {
          L.A.quaternion.copy(L.restA);
          L.M.quaternion.copy(L.restM);
          L.E.quaternion.copy(L.restE);
          L.kicked = false;
        }
        return;
      }
      L.kicked = true;
      curve(KICK, k.t, 9, kv);
      const rq = camQ;
      _kp.set(kv[0] * squeeze(), kv[1], kv[2]).applyMatrix4(b.rig.matrixWorld);
      _kpole.set(0, 0.5, -1).applyQuaternion(rq);
      reachLimb(L, _kp, _kpole, null);
      // the foot: toes along F, its up along U (the shin)
      if (!L.toe) {
        const toe = fb.B.RightToeBase;
        L.E.updateMatrixWorld(true);
        const qi = L.E.getWorldQuaternion(new THREE.Quaternion()).invert();
        L.toe = (toe ? wpos(toe, V()).sub(wpos(L.E, V())) : V(0, 0, -1)).normalize().applyQuaternion(qi);
        L.up = L.a2.clone().negate(); // the shin's way, seen from the foot's own frame at rest
        L.up.applyQuaternion(L.M.getWorldQuaternion(new THREE.Quaternion())).applyQuaternion(qi);
      }
      _kf.set(kv[3], kv[4], kv[5]).applyQuaternion(rq).normalize();
      _ku.set(kv[6], kv[7], kv[8]).applyQuaternion(rq).normalize();
      aimBone(L.E, L.toe, L.up, _kf, _ku);
      return;
    }
    if (!k || k.t > 0.55) {
      b.leg.visible = false;
      return;
    }
    curve(KICK, k.t, 9, kv);
    b.leg.visible = true;
    b.leg.position.set(kv[0] * squeeze(), kv[1], kv[2]);
    // the foot's toe (−z) along F, its shin (+y) along U
    _y.set(kv[6], kv[7], kv[8]).normalize();
    _z.set(-kv[3], -kv[4], -kv[5]).normalize();
    _z.addScaledVector(_y, -_z.dot(_y)).normalize();
    _x.crossVectors(_y, _z);
    _m.makeBasis(_x, _y, _z);
    b.leg.quaternion.setFromRotationMatrix(_m);
  }
  // ---- per frame: clips, alertness, the camera's kick and shake ----
  function tick(dt) {
    if (!Z.on) {
      if (S.shown) {
        S.shown = false;
        HELD.fp = false;
        if (B) B.rig.visible = false;
        setCam(0, 0);
      }
      return;
    }
    dt = Math.min(dt, 0.1);
    S.time += dt;
    const id = curId(),
      on = active() && !!id && (id === 'faust' || !!READY[id]);
    if (on !== S.shown) {
      S.shown = on;
      if (B && !on) B.rig.visible = false;
    }
    HELD.fp = on;
    // the hands' own narrower view (game/play.js HELD.fov): 0.8 of the world's
    HELD.fov = on ? Math.round(cam.fov * 0.8) : 0;
    // running lowers the weapon; stopping short lets it swing on; landing dips it
    const sp = P.speed || 0;
    S.run += (Math.max(0, Math.min(1, (sp - 3.0) / 1.4)) - S.run) * Math.min(1, dt * 5);
    if (S.lastSpeed != null && (S.lastSpeed - sp) / Math.max(dt, 1e-3) > 5 && S.lastSpeed > 1.5) S.dip = 1;
    S.lastSpeed = sp;
    S.dip = Math.max(0, S.dip - dt * 2.5);
    if (S.lastVz != null && S.lastVz < -2.5 && !(P.vz < 0)) S.land = 1;
    S.lastVz = P.vz;
    S.land = Math.max(0, S.land - dt * 3);
    // a new weapon in the hand: it comes up from below
    if (id !== S.id) {
      S.id = id;
      S.drawK = 1;
      S.clipA = null;
    }
    S.drawK = Math.max(0, S.drawK - dt * 3.2);
    // alert: night with zombies near, or a fight a moment ago
    let near = false;
    if (Z.ents.length)
      for (const e of Z.ents)
        if (e.kind === 'zombie' && !e.dead && Math.abs(e.x - P.x) < 18 && Math.abs(e.y - P.y) < 18) {
          near = true;
          break;
        }
    const want = near || S.time - S.lastAtk < 5 || (Z.phase === 'nacht' && !(window.ZHAUS && window.ZHAUS.H)) ? 1 : 0;
    S.alert += (want - S.alert) * Math.min(1, dt * (want ? 4 : 1.2));
    // the clip: time runs (slowed for a moment when a blow lands – it bites)
    const c = S.clipA;
    if (c) {
      const k = S.stopT > 0 ? 0.18 : 1;
      S.stopT = Math.max(0, S.stopT - dt);
      const t0 = c.t;
      c.t += dt * k;
      if (c.c.ev) for (const [t, f] of c.c.ev) if (t0 < t && c.t >= t) f();
      if (c.t >= c.c.dur) S.clipA = null;
    }
    if (S.kickA) {
      S.kickA.t += dt;
      if (S.kickA.t > 0.6) S.kickA = null;
    }
    S.recoilT += dt;
    S.flashT += dt;
    shellsTick(dt);
    // the view: drag when turning, the jolt of a hit decays
    const y = P.yaw,
      p = P.pitch;
    if (S.lastYaw != null && dt > 0) {
      let dy = y - S.lastYaw;
      if (dy > 180) dy -= 360;
      if (dy < -180) dy += 360;
      // (lastYaw is taken after our own offsets: dy is the player's turning alone)
      const rateY = dy / dt,
        rateP = (p - S.lastPitch) / dt;
      const ty = Math.max(-0.07, Math.min(0.07, -rateY * 0.0011)),
        tp = Math.max(-0.05, Math.min(0.05, rateP * 0.0009));
      S.lagYaw += (ty - S.lagYaw) * Math.min(1, dt * 9);
      S.lagPitch += (tp - S.lagPitch) * Math.min(1, dt * 9);
    }
    S.jolt = Math.max(0, S.jolt - dt * 4);
    // the camera: recoil, shake, the dip of the kick – offsets added to the view and taken back again
    S.shakeA = Math.max(0, S.shakeA - dt * 2.2);
    let cy = 0,
      cp = 0;
    if (S.recoilT < 0.6) {
      const r = S.recoilT < 0.035 ? S.recoilT / 0.035 : Math.exp(-(S.recoilT - 0.035) * 7);
      cp += 3.2 * r;
      cy += 0.6 * r * S.recoilSide;
    }
    if (S.shakeA > 0) {
      const a = S.shakeA * S.shakeA;
      cy += Math.sin(S.time * 47) * 1.1 * a + Math.sin(S.time * 31 + 1) * 0.6 * a;
      cp += Math.sin(S.time * 53 + 2) * 0.9 * a;
    }
    if (S.kickA) cp -= 4 * Math.sin(Math.min(1, S.kickA.t / 0.55) * Math.PI);
    if (S.clipA && S.clipA.c.kind === 'punch') {
      const cc = S.clipA,
        e = Math.sin(Math.min(1, cc.t / cc.c.dur) * Math.PI);
      cy += (cc.c.side === 'R' ? -1.2 : 0.8) * e;
    }
    setCam(cy, cp);
    S.lastYaw = P.yaw;
    S.lastPitch = P.pitch;
    if (S.shown && (S.clipA || S.kickA || S.drawK > 0 || S.recoilT < 0.6 || S.shakeA > 0 || HELD.sway > 0)) markDirty();
    // the overlay's lamp: the muzzle flash; the torch at night lights the hands a little
    if (S.flashT < 0.07) HELD.lamp = 7 * (1 - S.flashT / 0.07);
    else {
      HELD.lamp = window.ZOMBIE && window.ZOMBIE.lamp && S.shown ? 0.9 : 0;
      HELD.lampAt = null;
    }
  }
  S.recoilSide = 1;
  S.run = 0;
  S.dip = 0;
  S.land = 0;
  // the view's offset: only the change since the last frame is added to P.yaw / P.pitch
  function setCam(y, p) {
    const dy = y - S.camYaw,
      dp = p - S.camPitch;
    if (dy) P.yaw += dy;
    if (dp) P.pitch += dp;
    S.camYaw = y;
    S.camPitch = p;
  }
  KERN.tick(tick, 'zombie/fp');
  HELD.post = post;
  // ---- the weapons tell what happens (zombie/z_waffe.js) ----
  KERN.on('zombie:swing', d => {
    S.lastAtk = S.time;
    if (!d) return;
    if (d.id === 'tritt') {
      S.kickA = { t: 0 };
      return;
    }
    if (d.id === 'faust') {
      const side = S.fistSide ? 'L' : 'R';
      S.fistSide ^= 1;
      const w = W.faust;
      S.clipA = { c: { kind: 'punch', side, impact: w.wind, dur: w.cd * 0.9 }, t: 0 };
      return;
    }
    const c = swingClip(d.id === 'axe' ? 'axt' : d.id);
    if (c) S.clipA = { c, t: 0 };
  });
  KERN.on('zombie:treffer', d => {
    S.stopT = d && d.id === 'faust' ? 0.04 : 0.07;
    S.shakeA = Math.min(1, S.shakeA + 0.35);
  });
  KERN.on('zombie:schuss', () => {
    S.lastAtk = S.time;
    S.recoilT = 0;
    S.flashT = 0;
    S.recoilSide = Math.random() < 0.5 ? -1 : 1;
    S.shakeA = Math.min(1, S.shakeA + 0.5);
  });
  KERN.on('zombie:reload', d => {
    if (!d) return;
    S.clipA = { c: reloadClip(d.dur, d.spent || 0), t: 0, left: d.left || 0 };
    S.clipA.left = d.left || 0;
  });
  KERN.on('zombie:sawpull', d => {
    S.clipA = { c: pullClip((d && d.dur) || 1.6), t: 0 };
  });
  KERN.on('zombie:hurt', d => {
    S.jolt = 1;
    S.shakeA = Math.min(1, S.shakeA + Math.min(0.8, ((d && d.dmg) || 10) / 25));
  });
  // before the first blow: the arms built and their shaders compiled while the night is still far (no stutter at the first swing)
  function prewarm() {
    if (!Z.on) return;
    if (!(AVATAR && AVATAR.ready)) return setTimeout(prewarm, 2000);
    try {
      const b = build(),
        was = b.rig.visible;
      fpBody(b);
      if (!b.warm) {
        b.warm = new THREE.Mesh(new THREE.BoxGeometry(0.01, 0.01, 0.01), ZWMOD.mats().steel);
        b.warm.frustumCulled = false;
        b.rig.add(b.warm);
      }
      b.warm.visible = true;
      b.rig.visible = true;
      b.rig.position.copy(cam.position);
      b.rig.quaternion.copy(cam.quaternion);
      b.rig.updateMatrixWorld(true);
      REN.compile(HELD.scene, cam);
      b.warm.visible = false;
      b.rig.visible = was;
    } catch (e) {
      console.warn('zfp warm', e);
    }
  }
  KERN.on('zombie:start', () => setTimeout(prewarm, 1500));
  KERN.on('zombie:stop', () => {
    S.clipA = null;
    S.kickA = null;
    setCam(0, 0);
  });
  // tests and the picture tool: the state in numbers
  function info() {
    return {
      shown: S.shown,
      id: S.id,
      alert: +S.alert.toFixed(2),
      clip: S.clipA ? S.clipA.c.kind : null,
      kick: !!S.kickA,
      brk: +S.brk.toFixed(2),
      rig: !!(B && B.rig.visible),
      body: !!FB,
      postMs: +(S.postMs || 0).toFixed(2),
      bodyHands: FB
        ? ['RightHand', 'LeftHand'].map(n => {
            const v = FB.B[n]
              .getWorldPosition(new THREE.Vector3())
              .sub(cam.position)
              .applyQuaternion(cam.quaternion.clone().invert());
            return v.toArray().map(q => +q.toFixed(3));
          })
        : null,
      hands: B
        ? [B.R.hand.position.toArray().map(v => +v.toFixed(3)), B.L.hand.position.toArray().map(v => +v.toFixed(3))]
        : null,
      view: inView(),
    };
  }
  // where the weapon's middle is in the hands' view: [x, y] from -1 to 1 (screen edges), null if nothing is held
  function inView() {
    const o = HELD.obj;
    if (!o || !o.visible || !S.shown) return null;
    const c = new THREE.Box3().setFromObject(o).getCenter(new THREE.Vector3());
    c.sub(cam.position).applyQuaternion(cam.quaternion.clone().invert());
    if (c.z >= 0) return [0, -9];
    const t = Math.tan(((HELD.fov || cam.fov) * Math.PI) / 360);
    return [+(c.x / (-c.z * t * cam.aspect)).toFixed(2), +(c.y / (-c.z * t)).toFixed(2)];
  }
  Object.assign(S, { post, info, muzzle, build, reset, POSE, FIST, KICK, HPOSE, BRE, swingClip, HELD, body: () => FB });
  return S;
})();
window.ZFP = ZFP;
