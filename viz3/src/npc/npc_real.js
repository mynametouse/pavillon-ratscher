// ---------------- realistic neighbours and goats: rigged, textured glTF models (CC BY, see "Quellen und Lizenzen") ----------------
// Loaded after the scene is up; until then (or if loading fails) the low-poly figures stay. Walk cycle: motion capture, retargeted
// offline onto both men (tools: chars/rt.html); standing pose = average of that cycle; Hubert keeps his own idle (an old man's stance).
// Goats: one rigged goat with its own idle clip (head, ears, bleat), legs and grazing posed procedurally on top.
import * as THREE from 'three';
import { MeshoptDecoder } from 'three/examples/jsm/libs/meshopt_decoder.module.js';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { clone as skelClone } from 'three/examples/jsm/utils/SkeletonUtils.js';
import { BASE, cam, HQ0, OFFLINE, QS, R, scene } from '../core/head.js';
import { canonBone, decodeClip } from '../core/rig.js';
import { ANISO, FIGSH, gltfDataURIs, markDirty, patchSV, toFloatAttrs, whenLoaded } from '../core/assets.js';
import { sun, sunDir } from '../garden/env.js';
import { RENDER } from '../render/render.js';
import { P } from '../game/walkable.js';
import { BLOBS, GOATS, MOWER, NPCS, TRACTOR } from './npc.js';
const CHARMAN = window.CHARMAN || null;
const REAL = { ready: false, failed: false, started: false };
export const CHL = gltfDataURIs(new GLTFLoader());
CHL.setMeshoptDecoder(MeshoptDecoder);
// no stand-in figures while the real ones load: the simple low-poly ones only come back if loading fails
const STANDIN = () => [NPCS.hubert.fig, NPCS.ronald.fig, ...GOATS.map(g => g.fig), TRACTOR, MOWER];
if (CHARMAN && !QS.get('lowfig')) for (const f of STANDIN()) f.g.visible = false;
const _rq = new THREE.Quaternion(),
  _rq2 = new THREE.Quaternion(),
  _rv = new THREE.Vector3(),
  _rv2 = new THREE.Vector3(),
  _rmq = new THREE.Quaternion();
// canonical bone names of every rig in use (Mixamo, Character Creator, 3ds Max Biped, UE): core/rig.js
function charMat(m, tint) {
  if (!m || !m.isMeshStandardMaterial) return m;
  m.metalness = 0;
  m.metalnessMap = null;
  if (!m.roughnessMap) m.roughness = Math.max(0.55, m.roughness);
  if (m.transparent && !/eyelash|cornea/i.test(m.name)) {
    m.transparent = false;
    m.alphaTest = 0.5;
    m.depthWrite = true;
  }
  if (tint) m.color.set(tint);
  if (m.map) m.map.anisotropy = ANISO;
  m.envMapIntensity = 0.8;
  patchSV(m);
  m.needsUpdate = true;
  return m;
}
// rotate a bone about an axis given in the model's own frame (x = the figure's left, y = up, z = forward); parents must be up to date.
// The pose before the turn is kept in sv and put back before the next mixer update: the mixer only writes a bone when its own
// value changes, so a turned bone would otherwise keep (and add up) the turns of earlier frames.
export function boneTurn(sv, modelQinv, b, ax, ay, az, ang) {
  if (!b || !ang) return;
  if (!sv.has(b)) sv.set(b, b.quaternion.clone());
  b.parent.getWorldQuaternion(_rq);
  _rq.premultiply(modelQinv).invert();
  _rv.set(ax, ay, az).applyQuaternion(_rq);
  _rq2.setFromAxisAngle(_rv, ang);
  b.quaternion.premultiply(_rq2);
  b.updateMatrixWorld(true);
}
export function prepModel(model, h, o = {}) {
  model.updateMatrixWorld(true);
  model.traverse(x => {
    if (x.isMesh) {
      x.castShadow = false;
      x.receiveShadow = true;
      x.userData.noMerge = true;
      const ms = Array.isArray(x.material) ? x.material : [x.material];
      x.material = Array.isArray(x.material)
        ? ms.map(m => charMat(o.cloneMats ? m.clone() : m, o.tint))
        : charMat(o.cloneMats ? x.material.clone() : x.material, o.tint);
    }
  });
  const box = new THREE.Box3().setFromObject(model);
  const size = box.getSize(new THREE.Vector3());
  const s = h / (o.byLength ? size.z : size.y);
  model.scale.multiplyScalar(s);
  model.position.y -= box.min.y * s;
  model.updateMatrixWorld(true);
  model.traverse(x => {
    if (x.isSkinnedMesh) {
      x.computeBoundingSphere();
      x.boundingSphere.radius *= 1.6;
    }
  });
  return s;
}
const camNear = (g, d) => {
  g.getWorldPosition(_rv);
  return _rv.distanceToSquared(cam.position) < d * d;
};
// ---- people ----
function strawHat() {
  const c = document.createElement('canvas');
  c.width = c.height = 256;
  const q = c.getContext('2d');
  q.fillStyle = '#c8ac70';
  q.fillRect(0, 0, 256, 256);
  for (let y = 0; y < 256; y += 6)
    for (let x = 0; x < 256; x += 12) {
      const o = (y / 6) % 2 ? 6 : 0;
      const l = 0.82 + Math.random() * 0.3;
      q.fillStyle = `rgb(${(200 * l) | 0},${(170 * l) | 0},${(108 * l) | 0})`;
      q.fillRect(x + o, y, 11, 5);
      q.fillStyle = 'rgba(90,64,30,0.35)';
      q.fillRect(x + o, y + 5, 11, 1);
      q.fillRect(x + o + 11, y, 1, 6);
    }
  for (let i = 0; i < 900; i++) {
    q.fillStyle = `rgba(${Math.random() < 0.5 ? '70,50,25' : '250,235,190'},${0.15 + Math.random() * 0.2})`;
    q.fillRect(Math.random() * 256, Math.random() * 256, 1 + Math.random() * 3, 1);
  }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(6, 3);
  t.anisotropy = ANISO;
  const prof = [
    [0.001, 0.128],
    [0.05, 0.126],
    [0.074, 0.118],
    [0.088, 0.1],
    [0.094, 0.06],
    [0.097, 0.018],
    [0.1, 0.004],
    [0.125, -0.002],
    [0.155, -0.005],
    [0.178, -0.003],
    [0.188, 0.004],
    [0.19, 0.01],
  ].map(([r, y]) => new THREE.Vector2(r, y));
  const hat = new THREE.Group();
  const m = patchSV(
    new THREE.MeshStandardMaterial({ map: t, roughness: 0.92, side: THREE.DoubleSide, envMapIntensity: 0.7 })
  );
  const crown = new THREE.Mesh(new THREE.LatheGeometry(prof, 40), m);
  hat.add(crown);
  const band = new THREE.Mesh(
    new THREE.CylinderGeometry(0.0952, 0.0975, 0.024, 40, 1, true),
    patchSV(new THREE.MeshStandardMaterial({ color: 0x3a2a1e, roughness: 0.8, side: THREE.DoubleSide }))
  );
  band.position.y = 0.024;
  hat.add(band);
  hat.traverse(x => {
    if (x.isMesh) {
      x.castShadow = false;
      x.userData.noMerge = true;
    }
  });
  return hat;
}
// a model with stylised proportions made more natural: smaller head and hands, longer legs (the knee and ankle joints move apart, so the
// skin stretches; in Character-Creator rigs the offsets sit on the '_scaleCompensation' parent of each bone). Before scaling to height.
function propTweak(model, P) {
  model.updateMatrixWorld(true);
  const B = {},
    tw = [];
  model.traverse(x => {
    if (!x.isBone) return;
    const c = canonBone(x.name);
    if (c && !B[c]) B[c] = x;
    if (/^(L|R)_(Thigh|Calf)Twist02/.test(x.name)) tw.push(x);
  });
  const carrier = b =>
    b.parent && /_scaleCompensation$/.test(b.parent.name) && b.position.lengthSq() < 1e-10 ? b.parent : b;
  if (P.head && B.Head) B.Head.scale.multiplyScalar(P.head);
  for (const sd of ['Left', 'Right']) {
    if (P.hand && B[sd + 'Hand']) B[sd + 'Hand'].scale.multiplyScalar(P.hand);
    if (P.leg) for (const n of ['Leg', 'Foot']) if (B[sd + n]) carrier(B[sd + n]).position.multiplyScalar(P.leg);
  }
  if (P.leg) for (const b of tw) carrier(b).position.multiplyScalar(P.leg);
  model.traverse(x => {
    if (x.isSkinnedMesh) x.boundingBox = null;
  });
  model.updateMatrixWorld(true);
}
// straw hat on the head bone, sized and placed from the head's rest pose (o.hatK size, o.hatY height, o.hatTilt). Rigs with a head-top bone
// (Character Creator): sized by the head's length. Rigs without one (Rocketbox Biped): the brim o.hatUp above the head bone and o.hatFwd
// forward, o.hatK as the hat's own scale (fitted by eye on Ronald, 23.10.2026: 0.105 m, 0.022 m, 1.16).
function hatOn(B, o) {
  const hp = B.Head.getWorldPosition(new THREE.Vector3());
  const hat = strawHat();
  let want;
  if (B.HeadTop_End) {
    const up = B.HeadTop_End.getWorldPosition(new THREE.Vector3()).sub(hp);
    const L = up.length();
    up.normalize();
    const k = ((o.hatK || 1.35) * L) / 0.19;
    want = new THREE.Matrix4().compose(
      hp
        .clone()
        .addScaledVector(up, L * (o.hatY ?? 0.45))
        .addScaledVector(new THREE.Vector3(0, 0, 1), -L * 0.05),
      new THREE.Quaternion()
        .setFromUnitVectors(new THREE.Vector3(0, 1, 0), up)
        .multiply(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1, 0, 0), o.hatTilt ?? 0.1)),
      new THREE.Vector3(k, k, k)
    );
  } else {
    const k = o.hatK ?? 1.16;
    want = new THREE.Matrix4().compose(
      hp.clone().add(new THREE.Vector3(0, o.hatUp ?? 0.105, o.hatFwd ?? 0.022)), // the rest pose stands upright, facing +z
      new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1, 0, 0), o.hatTilt ?? -0.05),
      new THREE.Vector3(k, k, k)
    );
  }
  const loc = B.Head.matrixWorld.clone().invert().multiply(want);
  loc.decompose(hat.position, hat.quaternion, hat.scale);
  B.Head.add(hat);
}
function realPerson(gl, cl, o) {
  const model = gl.scene,
    g = new THREE.Group(),
    inner = new THREE.Group();
  inner.rotation.y = Math.PI;
  g.add(inner);
  inner.add(model); // models face +z; figures walk along local -z
  if (o.prop) propTweak(model, o.prop);
  const s = prepModel(model, o.h);
  const B = {};
  model.traverse(x => {
    if (x.isBone) {
      const c = canonBone(x.name);
      if (c && !B[c]) B[c] = x;
    }
  });
  const hipH = B.Hips ? B.Hips.getWorldPosition(new THREE.Vector3()).y : 0.9;
  if (o.hat && B.Head) hatOn(B, o);
  const mixer = new THREE.AnimationMixer(model);
  const C = j => THREE.AnimationClip.parse(j);
  const aW = mixer.clipAction(C(cl.walk)),
    aS = mixer.clipAction(C(cl.stand)),
    aI = o.idle && gl.animations[0] ? mixer.clipAction(gl.animations[0]) : null;
  for (const a of [aW, aS, aI])
    if (a) {
      a.play();
      a.time = Math.random() * a.getClip().duration;
    }
  const walkSp = cl.speed * cl.hip * s * ((o.prop && o.prop.leg) || 1); // m/s at normal playback
  const idleMix = aI ? (o.idleMix ?? 0.5) : 0;
  let w = 0,
    acc = 0,
    t = Math.random() * 100,
    look = 0,
    lookT = 0,
    lookTo = 0;
  const sv = new Map();
  const self = {
    g,
    real: true,
    mode: 'stand',
    model,
    bones: B,
    hipH,
    anim(dt, speed) {
      acc += dt;
      t += dt;
      const sit = self.mode === 'sit';
      const tw = !sit && speed > 0.05 ? 1 : 0;
      w += (tw - w) * Math.min(1, dt * 6);
      if (!g.visible || !camNear(g, 70)) return; // far away or hidden: no pose updates (time is caught up when seen again)
      aW.setEffectiveWeight(w);
      aW.timeScale = speed > 0.05 ? THREE.MathUtils.clamp(speed / walkSp, 0.55, 1.7) : 1;
      const rest = 1 - w;
      if (aI) aI.setEffectiveWeight(sit ? 0 : rest * idleMix);
      aS.setEffectiveWeight(sit ? 1 : rest * (1 - idleMix));
      for (const [b, q] of sv) b.quaternion.copy(q);
      sv.clear();
      mixer.update(acc);
      acc = 0;
      model.updateMatrixWorld(true);
      model.getWorldQuaternion(_rmq).invert();
      const Q = _rmq;
      if (sit) {
        for (const sd of ['Left', 'Right']) {
          boneTurn(sv, Q, B[sd + 'UpLeg'], 1, 0, 0, -1.45);
          boneTurn(sv, Q, B[sd + 'Leg'], 1, 0, 0, 1.5);
          boneTurn(sv, Q, B[sd + 'Arm'], 1, 0, 0, -0.55);
          boneTurn(sv, Q, B[sd + 'ForeArm'], 1, 0, 0, -0.75);
        }
        return;
      }
      // standing: breathing, small weight shifts and a slow look around (more of it when there is no idle clip)
      const st = rest * (aI ? 0.5 : 1);
      // somebody close by (the visitor) gets looked at; otherwise a slow look around
      let seen = false;
      if (camNear(g, 7)) {
        _rv2.copy(cam.position);
        model.worldToLocal(_rv2);
        const yaw = Math.atan2(_rv2.x, _rv2.z);
        if (Math.abs(yaw) < 1.6) {
          lookTo = THREE.MathUtils.clamp(yaw, -1.0, 1.0);
          seen = true;
          lookT = 1.5;
        }
      }
      if (st > 0.01 || seen) {
        lookT -= dt;
        if (lookT <= 0) {
          lookT = 2.5 + Math.random() * 5;
          lookTo = Math.random() < 0.35 ? 0 : (Math.random() - 0.5) * 1.1;
        }
        look += (lookTo - look) * Math.min(1, dt * (seen ? 3 : 1.6));
        boneTurn(sv, Q, B.Spine2 || B.Spine1, 1, 0, 0, Math.sin(t * 1.6) * 0.018 * st);
        boneTurn(sv, Q, B.Hips, 0, 0, 1, Math.sin(t * 0.37) * 0.025 * st);
        const lk = (seen ? 1 : st) * rest;
        boneTurn(sv, Q, B.Neck, 0, 1, 0, look * 0.4 * lk);
        boneTurn(sv, Q, B.Head, 0, 1, 0, look * 0.6 * lk);
        boneTurn(sv, Q, B.Head, 1, 0, 0, Math.sin(t * 0.23) * 0.06 * st);
      }
    },
  };
  return self;
}
// ---- work poses of the neighbours (feat/nachbarn, 23.10.2026): procedural turns on top of the clips, like sitting. fig.pose = { k, t }
// (kind and its own clock, set by npc/life.js); the pose fades in and out (0.4 s). Angles in model space: about x (the figure's left)
// a positive turn bends the trunk forward, a negative one lifts an arm or a thigh forward; about y (up) it turns. Keyframes per kind:
// [phase 0…1, arm, forearm, spine, hips, knee], interpolated smoothly; c: the cycle in seconds.
const POSE = {
  // two-handed axe: ready at the block, up over the head, a quick strike, hold, back (strike at phase 0.56: npc/life.js plays the knock)
  chop: {
    c: 2.6,
    kf: [
      [0, -0.95, -0.3, 0.32, 0.12, 0.12],
      [0.4, -2.85, -0.75, -0.08, 0.0, 0.05],
      [0.47, -2.7, -0.6, 0.0, 0.0, 0.05],
      [0.56, -0.8, -0.1, 0.55, 0.25, 0.32],
      [0.72, -0.85, -0.15, 0.5, 0.22, 0.28],
      [1, -0.95, -0.3, 0.32, 0.12, 0.12],
    ],
    adduct: 0.32,
  },
  // the chainsaw at the sawhorse: held at the hips, trunk bent a little, a small rocking while it cuts
  saw: {
    c: 0.7,
    kf: [
      [0, -0.7, -0.95, 0.42, 0.18, 0.25],
      [0.5, -0.78, -0.9, 0.46, 0.2, 0.27],
      [1, -0.7, -0.95, 0.42, 0.18, 0.25],
    ],
    adduct: 0.3,
  },
  // bending down to the ground (picking up wood, a round, hay)
  pick: {
    c: 1,
    kf: [
      [0, -0.55, -0.25, 0.75, 0.55, 0.5],
      [1, -0.55, -0.25, 0.75, 0.55, 0.5],
    ],
    adduct: 0.15,
  },
  // an armful in front of the chest (also while walking)
  carry: {
    c: 1,
    kf: [
      [0, -0.5, -1.45, -0.04, 0, 0],
      [1, -0.5, -1.45, -0.04, 0, 0],
    ],
    adduct: 0.36,
    walk: true,
  },
  // putting it down at chest height (the drying hut, the hay rack)
  place: {
    c: 1,
    kf: [
      [0, -1.2, -0.55, 0.28, 0.08, 0.08],
      [1, -1.2, -0.55, 0.28, 0.08, 0.08],
    ],
    adduct: 0.25,
  },
  // over the open bonnet: bent forward, hands in the engine bay, the right one turning a spanner
  bonnet: {
    c: 1.3,
    kf: [
      [0, -1.05, -0.35, 0.5, 0.35, 0.12],
      [0.5, -1.1, -0.55, 0.52, 0.36, 0.12],
      [1, -1.05, -0.35, 0.5, 0.35, 0.12],
    ],
    adduct: 0.12,
    oneHand: true,
  },
  // at the workbench: hands on the work
  bench: {
    c: 2.2,
    kf: [
      [0, -0.75, -0.95, 0.2, 0.05, 0.05],
      [0.5, -0.8, -1.05, 0.22, 0.05, 0.05],
      [1, -0.75, -0.95, 0.2, 0.05, 0.05],
    ],
    adduct: 0.25,
    oneHand: true,
  },
};
const _pk = [0, 0, 0, 0, 0];
function poseAt(P, t) {
  const c = (((t / P.c) % 1) + 1) % 1,
    K = P.kf;
  let i = 0;
  while (i < K.length - 2 && c > K[i + 1][0]) i++;
  const a = K[i],
    b = K[i + 1],
    u = Math.min(1, Math.max(0, (c - a[0]) / Math.max(1e-6, b[0] - a[0]))),
    s = u * u * (3 - 2 * u);
  for (let j = 0; j < 5; j++) _pk[j] = a[j + 1] + (b[j + 1] - a[j + 1]) * s;
  return _pk;
}
// the gestures of someone talking on a chair: the speaking hand comes up and moves, the head nods a little (k 0…1: how much)
function talkSit(sv, Q, B, t, k) {
  if (k < 0.01) return;
  const g = Math.sin(t * 2.3) * 0.5 + 0.5;
  boneTurn(sv, Q, B.RightArm, 1, 0, 0, -0.35 * k);
  boneTurn(sv, Q, B.RightForeArm, 1, 0, 0, (-0.55 - 0.35 * g) * k);
  boneTurn(sv, Q, B.Head, 1, 0, 0, Math.sin(t * 3.1) * 0.06 * k);
}
function applyPose(sv, Q, B, kind, t, k, walking) {
  const P = POSE[kind];
  if (!P || k < 0.01) return;
  const w = P.walk ? k : k * (1 - walking);
  if (w < 0.01) return;
  const [arm, fore, spine, hips, knee] = poseAt(P, t);
  if (hips) {
    boneTurn(sv, Q, B.Hips, 1, 0, 0, hips * w);
    for (const sd of ['Left', 'Right']) boneTurn(sv, Q, B[sd + 'UpLeg'], 1, 0, 0, -hips * w * 0.85);
  }
  if (knee) for (const sd of ['Left', 'Right']) boneTurn(sv, Q, B[sd + 'Leg'], 1, 0, 0, knee * w);
  boneTurn(sv, Q, B.Spine, 1, 0, 0, spine * 0.5 * w);
  boneTurn(sv, Q, B.Spine1 || B.Spine2, 1, 0, 0, spine * 0.5 * w);
  for (const sd of ['Left', 'Right']) {
    const one = P.oneHand && sd === 'Left';
    boneTurn(sv, Q, B[sd + 'Arm'], 1, 0, 0, (one ? arm * 0.8 : arm) * w);
    boneTurn(sv, Q, B[sd + 'Arm'], 0, 1, 0, (sd === 'Left' ? -1 : 1) * P.adduct * w);
    boneTurn(sv, Q, B[sd + 'ForeArm'], 1, 0, 0, (one ? fore * 0.6 : fore) * w);
  }
}
// ---- Rocketbox neighbours (since 22.10.2026, Falko: realistic older men like the player figures): 3ds Max Biped rig (MIT), driven by the
// player's clip set chars/pclips_m.json (idle, walk, talking gestures); sitting on the tractor stays the procedural pose of realPerson.
// Age: a slight stoop of the upper back (o.stoop rad) and a slower idle (o.idleRate).
export function rbPerson(gl, set, o) {
  const model = gl.scene,
    g = new THREE.Group(),
    inner = new THREE.Group();
  inner.rotation.y = Math.PI;
  g.add(inner);
  inner.add(model); // models face +z; figures walk along local -z
  const s = prepModel(model, o.h);
  const B = {};
  model.traverse(x => {
    if (x.isBone) {
      const c = canonBone(x.name);
      if (c && !B[c]) B[c] = x;
    }
  });
  const hipH = B.Hips ? B.Hips.getWorldPosition(new THREE.Vector3()).y : 0.9;
  if (o.hat && B.Head) hatOn(B, o);
  const mixer = new THREE.AnimationMixer(model);
  const act = k => {
    const c = set && set.clips && set.clips[k];
    if (!c) return null;
    const a = mixer.clipAction(decodeClip(c));
    a.play();
    a.setEffectiveWeight(0);
    a.time = Math.random() * a.getClip().duration;
    return a;
  };
  const aW = act('walk'),
    aI = act('idle'),
    aT = act('talk');
  if (aI) aI.timeScale = o.idleRate ?? 0.85;
  const walkSp = ((set.clips.walk && set.clips.walk.speed) || 1.25) * s; // m/s of the cycle at this size
  // a limp now and then (o.limp, Falko 23.10.2026: Hubert "läuft manchmal ein bisschen hinkend"): the right leg hurts – the walk hurries over
  // its stance and lingers on the left, the body dips and leans over it. Where in the clip the right foot stands: its lowest point
  // against the left foot, sampled once.
  let phR = 0;
  if (o.limp && aW && B.RightFoot && B.LeftFoot) {
    const d = aW.getClip().duration,
      vr = new THREE.Vector3(),
      vl = new THREE.Vector3();
    aW.setEffectiveWeight(1);
    let lo = 1e9;
    for (let i = 0; i < 24; i++) {
      aW.time = (i / 24) * d;
      mixer.update(0);
      model.updateMatrixWorld(true);
      const y = B.RightFoot.getWorldPosition(vr).y - B.LeftFoot.getWorldPosition(vl).y;
      if (y < lo) {
        lo = y;
        phR = i / 24;
      }
    }
    aW.setEffectiveWeight(0);
    aW.time = Math.random() * d;
  }
  let w = 0,
    tk = 0,
    limT = Math.random() * 60,
    acc = 0,
    look = 0,
    lookT = 0,
    lookTo = 0,
    pw = 0,
    pk = null,
    pt = 0,
    sk = 0,
    st = 0;
  const sv = new Map();
  const self = {
    g,
    real: true,
    mode: 'stand',
    model,
    bones: B,
    hipH,
    walker: null, // set by swapFig: talking shows the gestures
    pose: null, // { k, t }: a work pose (POSE above), set by npc/life.js
    speak: false, // talking on a chair (npc/life.js): gestures
    after: null, // called after each pose update (npc/life.js puts the tools into the hands)
    anim(dt, speed) {
      acc += dt;
      const sit = self.mode === 'sit';
      const talk = !sit && !!(self.walker && self.walker.talking);
      w += ((!sit && speed > 0.05 ? 1 : 0) - w) * Math.min(1, dt * 6);
      tk += ((talk ? 1 : 0) - tk) * Math.min(1, dt * 3);
      if (self.pose) {
        if (self.pose.k !== pk) {
          pk = self.pose.k; // a new kind takes over at once (a little weaker, then it settles)
          pw *= 0.6;
        }
        pt = self.pose.t;
      }
      pw += ((self.pose && self.pose.k === pk ? 1 : 0) - pw) * Math.min(1, dt * 4);
      sk += ((sit && self.speak ? 1 : 0) - sk) * Math.min(1, dt * 3);
      st += dt;
      if (!g.visible || !camNear(g, 70)) return; // far away or hidden: no pose updates
      const rest = 1 - w;
      let lim = 0,
        ph = 0;
      if (o.limp && aW && w > 0.05) {
        limT += dt;
        lim = o.limp * w * THREE.MathUtils.clamp(Math.sin(limT * 0.11) * 1.6, 0, 1); // limps for a while, then walks evenly again
        ph = (aW.time / aW.getClip().duration - phR) * Math.PI * 2; // 0: the right foot stands
      }
      if (aW) {
        aW.setEffectiveWeight(w);
        aW.timeScale =
          (speed > 0.05 ? THREE.MathUtils.clamp(speed / walkSp, 0.55, 1.6) : 1) * (1 + 0.32 * lim * Math.cos(ph));
      }
      if (aT) aT.setEffectiveWeight(sit ? 0 : rest * tk);
      if (aI) aI.setEffectiveWeight(sit ? 1 : rest * (1 - (aT ? tk : 0)));
      for (const [b, q] of sv) b.quaternion.copy(q);
      sv.clear();
      mixer.update(acc);
      acc = 0;
      model.updateMatrixWorld(true);
      model.getWorldQuaternion(_rmq).invert();
      const Q = _rmq;
      if (sit) {
        for (const sd of ['Left', 'Right']) {
          boneTurn(sv, Q, B[sd + 'UpLeg'], 1, 0, 0, -1.45);
          boneTurn(sv, Q, B[sd + 'Leg'], 1, 0, 0, 1.5);
          boneTurn(sv, Q, B[sd + 'Arm'], 1, 0, 0, -0.55);
          boneTurn(sv, Q, B[sd + 'ForeArm'], 1, 0, 0, -0.75);
        }
        talkSit(sv, Q, B, st, sk);
        if (self.after) self.after(self);
        return;
      }
      if (pk && pw > 0.01) applyPose(sv, Q, B, pk, pt, pw, w);
      if (o.stoop) {
        boneTurn(sv, Q, B.Spine1 || B.Spine, 1, 0, 0, o.stoop);
        boneTurn(sv, Q, B.Neck, 1, 0, 0, -o.stoop * 0.6); // the head comes up again
      }
      const rs = lim > 0.01 ? Math.max(0, Math.cos(ph)) * lim : 0; // on the sore right leg
      if (rs) {
        boneTurn(sv, Q, B.Spine1 || B.Spine, 0, 0, 1, 0.08 * rs); // the trunk leans over it
        boneTurn(sv, Q, B.Hips, 0, 0, 1, -0.05 * rs); // the other side of the pelvis drops
      }
      inner.position.y = -0.012 * rs; // and the body dips
      // somebody close by (the visitor) gets looked at; otherwise now and then a slow look around
      let seen = false;
      if (camNear(g, 7)) {
        _rv2.copy(cam.position);
        model.worldToLocal(_rv2);
        const yaw = Math.atan2(_rv2.x, _rv2.z);
        if (Math.abs(yaw) < 1.6) {
          lookTo = THREE.MathUtils.clamp(yaw, -1.0, 1.0);
          seen = true;
          lookT = 1.5;
        }
      }
      lookT -= dt;
      if (!seen && lookT <= 0) {
        lookT = 3 + Math.random() * 6;
        lookTo = Math.random() < 0.45 ? 0 : (Math.random() - 0.5) * 0.9;
      }
      look += (lookTo - look) * Math.min(1, dt * (seen ? 3 : 1.4));
      const lk = rest * (seen ? 1 : 0.6) * (1 - 0.7 * pw); // at work the eyes stay on the work
      if (lk > 0.01) {
        boneTurn(sv, Q, B.Neck, 0, 1, 0, look * 0.4 * lk);
        boneTurn(sv, Q, B.Head, 0, 1, 0, look * 0.6 * lk);
      }
      if (self.after) self.after(self);
    },
  };
  return self;
}
// ---- goats ----
function realGoat(gl, o) {
  const model = skelClone(gl.scene),
    g = new THREE.Group(),
    inner = new THREE.Group();
  inner.rotation.y = Math.PI;
  g.add(inner);
  inner.add(model);
  prepModel(model, o.len, { byLength: true, cloneMats: true, tint: o.tint });
  const find = rx => {
    let r = null;
    model.traverse(x => {
      if (!r && x.isBone && rx.test(x.name)) r = x;
    });
    return r;
  };
  const legs = [];
  for (const sd of ['left', 'right'])
    for (const n of ['1', '2']) {
      const up = find(new RegExp('^' + sd + 'Leg' + n + '_LoResUpperLeg')),
        lo = find(new RegExp('^' + sd + 'Leg' + n + '_LoResLowerLeg'));
      if (up) legs.push({ up, lo, side: sd, z: up.getWorldPosition(new THREE.Vector3()).z });
    }
  const zMid = legs.reduce((a, l) => a + l.z, 0) / Math.max(1, legs.length);
  for (const l of legs) {
    l.front = l.z > zMid;
    l.off = (l.front ? 0.25 : 0) + (l.side === 'right' ? 0.5 : 0);
  }
  const neck = [find(/^Neck01_/), find(/^Neck02_/), find(/^Neck03_/), find(/^Head_\d/)],
    jaw = find(/^Jaw_/),
    tail = find(/^Tail_/);
  const mixer = new THREE.AnimationMixer(model);
  const aI = gl.animations[0] ? mixer.clipAction(gl.animations[0]) : null;
  if (aI) {
    aI.play();
    aI.time = Math.random() * aI.getClip().duration;
  }
  let acc = 0,
    ph = 0,
    amp = 0,
    gz = 0,
    t = Math.random() * 50;
  const stride = o.len * 0.62;
  const sv = new Map();
  const self = {
    g,
    real: true,
    graze: 0,
    model,
    onBleat() {
      if (aI) aI.time = 1.15;
    },
    anim(dt, speed) {
      acc += dt;
      t += dt;
      amp += ((speed > 0.03 ? Math.min(1, speed / 0.5) : 0) - amp) * Math.min(1, dt * 5);
      ph += ((dt * speed) / stride) * Math.PI * 2;
      gz += ((self.graze ? 1 : 0) - gz) * Math.min(1, dt * 1.8);
      if (!g.visible || !camNear(g, 60)) return;
      for (const [b, q] of sv) b.quaternion.copy(q);
      sv.clear();
      mixer.update(acc);
      acc = 0;
      model.updateMatrixWorld(true);
      model.getWorldQuaternion(_rmq).invert();
      const Q = _rmq;
      if (amp > 0.01)
        for (const l of legs) {
          const a = ph + l.off * Math.PI * 2,
            sw = Math.sin(a);
          boneTurn(sv, Q, l.up, 1, 0, 0, -sw * (l.front ? 0.36 : 0.27) * amp);
          boneTurn(sv, Q, l.lo, 1, 0, 0, Math.max(0, Math.cos(a)) * (l.front ? 0.75 : -0.45) * amp);
        }
      if (gz > 0.01) {
        [1.15, 0.45, 0.15, -0.05].forEach((k, i) => boneTurn(sv, Q, neck[i], 1, 0, 0, k * gz));
        if (jaw && gz > 0.6) boneTurn(sv, Q, jaw, 1, 0, 0, (Math.sin(t * 8.5) * 0.5 + 0.5) * 0.1 * gz);
      }
      if (tail) boneTurn(sv, Q, tail, 0, 1, 0, Math.sin(t * 2.3) * 0.25 * (0.4 + amp));
    },
  };
  return self;
}
// ---- Hubert's tractor: an old weathered red tractor (CC BY); its four wheels are cut out of the one wheel mesh so they can turn ----
function realTractor(gl) {
  const model = gl.scene,
    inner = new THREE.Group();
  inner.rotation.y = Math.PI / 2;
  inner.add(model); // model front = +x → figure forward (-z)
  model.updateMatrixWorld(true);
  const box = new THREE.Box3().setFromObject(model);
  const s = 3.0 / (box.max.x - box.min.x);
  model.scale.multiplyScalar(s);
  model.position.y -= box.min.y * s;
  model.updateMatrixWorld(true);
  const wheels = [];
  let wheelMesh = null,
    seatBox = null;
  model.traverse(x => {
    if (!x.isMesh) return;
    x.castShadow = false;
    x.receiveShadow = true;
    x.userData.noMerge = true;
    const m = x.material;
    if (m && m.isMeshStandardMaterial) {
      m.envMapIntensity = 0.85;
      if (m.map) m.map.anisotropy = ANISO;
      patchSV(m);
      m.needsUpdate = true;
    }
    if (m && /Tractor_04/.test(m.name) && !wheelMesh) wheelMesh = x;
  });
  const seatNode = model.getObjectByName('Rear_seat_low');
  if (seatNode) seatBox = new THREE.Box3().setFromObject(seatNode);
  if (wheelMesh) {
    const geo = toFloatAttrs(wheelMesh.geometry.clone());
    geo.applyMatrix4(wheelMesh.matrixWorld);
    const P = geo.attributes.position,
      idx = geo.index ? geo.index.array : null;
    const nT = idx ? idx.length / 3 : P.count / 3;
    const xs = [];
    for (let i = 0; i < P.count; i++) xs.push(P.getX(i));
    xs.sort((a, b) => a - b);
    const xMid = (xs[0] + xs[xs.length - 1]) / 2;
    const groups = [[], [], [], []];
    const vi = (t, k) => (idx ? idx[t * 3 + k] : t * 3 + k);
    for (let t = 0; t < nT; t++) {
      let cx = 0,
        cz = 0;
      for (let k = 0; k < 3; k++) {
        cx += P.getX(vi(t, k));
        cz += P.getZ(vi(t, k));
      }
      groups[(cx / 3 > xMid ? 2 : 0) + (cz / 3 > 0 ? 1 : 0)].push(vi(t, 0), vi(t, 1), vi(t, 2));
    }
    for (const ids of groups) {
      if (!ids.length) continue;
      const bb = new THREE.Box3();
      const v = new THREE.Vector3();
      for (const i of ids) bb.expandByPoint(v.fromBufferAttribute(P, i));
      const c = bb.getCenter(new THREE.Vector3());
      const sub = new THREE.BufferGeometry();
      for (const [n, a] of Object.entries(geo.attributes)) sub.setAttribute(n, a);
      sub.setIndex(ids);
      const piv = new THREE.Object3D();
      piv.position.copy(c);
      const wm = new THREE.Mesh(sub, wheelMesh.material);
      wm.position.copy(c).negate();
      wm.receiveShadow = true;
      wm.userData.noMerge = true;
      piv.add(wm);
      inner.add(piv);
      wheels.push({ piv, r: (bb.max.y - bb.min.y) / 2 });
    }
    wheelMesh.visible = false;
  }
  // (inner is not in the scene yet, so 'world' above means the inner group's own frame – where the wheel pivots are added)
  const seat = seatBox ? { back: -((seatBox.min.x + seatBox.max.x) / 2), top: seatBox.max.y - 0.04 } : null;
  return { inner, wheels, seat };
}
// TR: Hubert's TRACTOR or Ronald's MOWER (keep: parts of the low-poly one that stay, the mower's cutter bar)
function swapTractor(T, TR = TRACTOR, keep = []) {
  const old = TR.g.children.slice();
  for (const c of old) if (!keep.includes(c)) TR.g.remove(c);
  TR.g.add(T.inner);
  TR.wheels = T.wheels;
  TR.roll = d => {
    for (const w of T.wheels) w.piv.rotation.z -= d / w.r;
  };
  if (T.seat) TR.seat = T.seat;
  for (const b of BLOBS) if (b.fig === TR) Object.assign(b, { w: 1.7, l: 3.1, h: 1.0 });
}
// ---- the figures' sun shadows (see FIGSH in core/assets.js): a depth map from the sun's direction, fitted each frame around the figures
// nearest to the camera (the nearest one and whoever stands within 18 m of it), drawn with the figures' own meshes only ----
const FSD = {
  size: HQ0 || OFFLINE ? 2048 : 1024,
  rt: null,
  cam: new THREE.OrthographicCamera(-1, 1, 1, -1, 0.1, 60),
  mats: new Map(),
  figs: [],
};
const _fsBias = new THREE.Matrix4().set(0.5, 0, 0, 0.5, 0, 0.5, 0, 0.5, 0, 0, 0.5, 0.5, 0, 0, 0, 1),
  _fsv = new THREE.Vector3(),
  _fsc = new THREE.Color(),
  _fsctr = new THREE.Vector3();
function fsDepthMat(m) {
  let d = FSD.mats.get(m);
  if (!d) {
    d = new THREE.MeshDepthMaterial({ depthPacking: THREE.RGBADepthPacking, side: THREE.DoubleSide });
    if (m && m.alphaTest > 0 && m.map) {
      d.map = m.map;
      d.alphaTest = m.alphaTest;
    }
    FSD.mats.set(m, d);
  }
  return d;
}
// fig: { g }, r: radius around the point cy m above the feet that holds the whole figure
export function fsAdd(fig, r, cy) {
  const ms = [];
  fig.g.traverse(x => {
    if (!x.isMesh || !x.visible) return;
    const n = ((x.material && x.material.name) || '') + ' ' + x.name;
    if (/eyelash|cornea|fingernail/i.test(n)) return;
    ms.push(x);
  });
  FSD.figs.push({ fig, r, cy, ms, p: new THREE.Vector3(), d: 0 });
}
function figShadowPass() {
  const F = FSD.figs;
  for (const f of F) f.fig.fsOn = false;
  if (
    !REAL.ready ||
    !F.length ||
    RENDER.tier === 'schnell' ||
    sunDir.y < 0.035 ||
    sun.intensity < 0.05 ||
    (typeof P !== 'undefined' && P.mode === 'top')
  ) {
    FIGSH.on.value = 0;
    return;
  }
  let best = null,
    bd = 42 * 42;
  for (const f of F) {
    if (!f.fig.g.visible) {
      f.d = 1e9;
      continue;
    }
    f.fig.g.getWorldPosition(f.p);
    f.d = f.p.distanceToSquared(cam.position);
    if (f.d < bd) {
      bd = f.d;
      best = f;
    }
  }
  if (!best) {
    FIGSH.on.value = 0;
    return;
  }
  const C = F.filter(f => f.d < 42 * 42 && f.p.distanceToSquared(best.p) < 18 * 18);
  _fsctr.set(0, 0, 0);
  for (const f of C) _fsctr.add(f.p);
  _fsctr.divideScalar(C.length);
  _fsctr.y += 0.8;
  const cm = FSD.cam,
    D = 30;
  cm.position.copy(_fsctr).addScaledVector(sunDir, D);
  cm.up.set(0, 1, 0);
  cm.lookAt(_fsctr);
  cm.updateMatrixWorld(true);
  let x0 = 1e9,
    x1 = -1e9,
    y0 = 1e9,
    y1 = -1e9;
  for (const f of C) {
    _fsv.copy(f.p);
    _fsv.y += f.cy;
    _fsv.applyMatrix4(cm.matrixWorldInverse);
    x0 = Math.min(x0, _fsv.x - f.r);
    x1 = Math.max(x1, _fsv.x + f.r);
    y0 = Math.min(y0, _fsv.y - f.r);
    y1 = Math.max(y1, _fsv.y + f.r);
    f.fig.fsOn = true;
  }
  const ext = Math.max(x1 - x0, y1 - y0);
  cm.left = x0;
  cm.right = x1;
  cm.bottom = y0;
  cm.top = y1;
  cm.near = 0.1;
  cm.far = D + 28;
  cm.updateProjectionMatrix();
  if (!FSD.rt) {
    FSD.rt = new THREE.WebGLRenderTarget(FSD.size, FSD.size, {
      minFilter: THREE.NearestFilter,
      magFilter: THREE.NearestFilter,
      generateMipmaps: false,
    });
    FSD.rt.texture.name = 'figShadow';
    FIGSH.map.value = FSD.rt.texture;
  }
  const pRT = R.getRenderTarget(),
    pAC = R.autoClear,
    pCA = R.getClearAlpha();
  R.getClearColor(_fsc);
  R.setRenderTarget(FSD.rt);
  R.setClearColor(0xffffff, 1);
  R.clear(true, true, false);
  R.autoClear = false;
  const saved = [];
  for (const f of C)
    for (const m of f.ms) {
      saved.push(m, m.material);
      m.material = Array.isArray(m.material) ? m.material.map(fsDepthMat) : fsDepthMat(m.material);
    }
  try {
    for (const f of C) R.render(f.fig.g, cm);
  } finally {
    for (let i = 0; i < saved.length; i += 2) saved[i].material = saved[i + 1];
    R.setRenderTarget(pRT);
    R.autoClear = pAC;
    R.setClearColor(_fsc, pCA);
  }
  FIGSH.mat.value.multiplyMatrices(cm.projectionMatrix, cm.matrixWorldInverse).premultiply(_fsBias);
  FIGSH.texel.value = 1 / FSD.size;
  FIGSH.wtexel.value = ext / FSD.size;
  FIGSH.range.value = cm.far - cm.near;
  FIGSH.bias.value = 0.03 / (cm.far - cm.near);
  FIGSH.on.value = 1;
}
function swapFig(w, f, blob) {
  const old = w.fig;
  f.mode = old.mode;
  scene.remove(old.g);
  scene.add(f.g);
  for (const b of BLOBS)
    if (b.fig === old) {
      b.fig = f;
      if (blob) Object.assign(b, blob);
    }
  f.blob = old.blob;
  f.walker = w;
  w.fig = f;
  w.place();
}
async function loadReal() {
  if (!CHARMAN || REAL.started) return;
  REAL.started = true;
  const FL = new THREE.FileLoader();
  FL.setResponseType('json');
  const U = f => BASE + 'chars/' + f;
  // since 22.10.2026 the neighbours are Rocketbox figures (hubert_rb, ronald_rb) moved by the player's clips; the earlier models stay
  // as a fallback for an asset base without them
  const PM = window.PLAYERMAN || {},
    RB = !!(CHARMAN.hubert_rb && CHARMAN.ronald_rb && PM.pclips_m) && !QS.get('oldfig');
  try {
    const [cl, gh, gr, gg, gt] = await Promise.all([
      FL.loadAsync(U(RB ? PM.pclips_m : CHARMAN.clips)),
      CHL.loadAsync(U(RB ? CHARMAN.hubert_rb : CHARMAN.hubert)),
      CHL.loadAsync(U(RB ? CHARMAN.ronald_rb : CHARMAN.ronald)),
      CHL.loadAsync(U(CHARMAN.goat)),
      CHARMAN.tractor ? CHL.loadAsync(U(CHARMAN.tractor)) : null,
    ]);
    if (gt) {
      const gm = { scene: gt.scene.clone(true) }; // Ronald's mowing tractor: a copy (shared geometry and materials)
      swapTractor(realTractor(gt));
      TRACTOR.g.visible = true;
      swapTractor(realTractor(gm), MOWER, [MOWER.bar]);
      MOWER.g.visible = true;
    } else TRACTOR.g.visible = MOWER.g.visible = true; // no tractor model: the simple ones
    if (RB) {
      // Hubert, 70–75: dark hair, moustache, a light checked work shirt, work trousers and shoes, limps now and then (Construction_Male_01,
      // tools/player/build_npc.sh); Ronald, about 60: grey beard, work suit, rubber boots (Gardener_Male_01) – no hat (Falko, 23.10. 1:23:
      // at most a flat cap, and only if it sits right)
      swapFig(NPCS.hubert, rbPerson(gh, cl, { h: 1.73, stoop: 0.1, idleRate: 0.78, limp: 1 }));
      swapFig(NPCS.ronald, rbPerson(gr, cl, { h: 1.76, stoop: 0.05, idleRate: 0.9 }));
    } else {
      swapFig(NPCS.hubert, realPerson(gh, cl.hubert, { h: 1.74, idle: true, idleMix: 0.3 }));
      swapFig(
        NPCS.ronald,
        realPerson(gr, cl.ronald, {
          h: 1.72,
          hat: true,
          prop: QS.get('rawfig') ? null : { head: 0.87, hand: 0.86, leg: 1.07 },
        })
      );
      NPCS.ronald.speed = 0.8; // a shorter man: a slightly slower pace keeps his steps natural
    }
    const GT = { Lotte: { len: 1.12 }, Frieda: { len: 1.1, tint: 0xa47b55 }, Egon: { len: 1.3, tint: 0x4a3f36 } };
    for (const gt of GOATS)
      swapFig(gt, realGoat(gg, GT[gt.gname] || { len: 1.1 }), {
        w: 0.62,
        l: 1.25 * (GT[gt.gname] || { len: 1.1 }).len,
        h: 0.55,
      });
    fsAdd(NPCS.hubert.fig, 1.05, 0.9);
    fsAdd(NPCS.ronald.fig, 1.05, 0.9);
    for (const gt of GOATS) fsAdd(gt.fig, 0.85, 0.5);
    if (gt) {
      fsAdd(TRACTOR, 2.0, 1.1);
      fsAdd(MOWER, 2.0, 1.1);
    }
    if (!QS.get('noshfig')) window.FIGSHADOW = figShadowPass;
    REAL.ready = true;
    markDirty(true);
  } catch (e) {
    console.warn('Figuren (Modelle) nicht geladen:', e);
    REAL.failed = true;
    for (const f of STANDIN()) f.g.visible = true;
    markDirty(true);
  }
}
if (!QS.get('lowfig')) whenLoaded(() => setTimeout(loadReal, 400));
window.NPC.real = REAL;
