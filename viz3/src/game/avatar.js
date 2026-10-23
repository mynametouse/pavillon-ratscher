// ===================== V15 the player's own figure (third person): a rigged person whose motions come from an animation library =====================
// retargeted offline onto its skeleton (chars/player.html): standing, walking, jogging, sprinting, ducking, crawling, lying, jumping,
// sitting, carrying, chopping, kneeling … The thing in the hand sits in the right hand (tools), hangs from it (canister) or is held in both arms.
// Since 23.10.2026 three figures to choose from (Menü → Einstellungen → Spielfigur): Falko, Sarah and Christoph (FIGS below).
import * as THREE from 'three';
import { LATE } from '../core/late.js';
import { SAVE } from '../core/save.js';
import { BASE, QS, scene, V } from '../core/head.js';
import { canonBone, decodeClip } from '../core/rig.js';
import { markDirty, whenLoaded } from '../core/assets.js';
import { phase } from '../core/geo.js';
import { MOTION, RENDER } from '../render/render.js';
import { P } from './walkable.js';
import { CAM3, setView3 } from './player.js';
import { NPCUI } from '../npc/npc.js';
import { boneTurn, CHL, fsAdd, prepModel } from '../npc/npc_real.js';
import { HELD, PLAY } from './play.js';
import { HUD } from './hud.js';
phase(null);
// ---- headwear: begin – Christoph's cap and earbuds, fitted to the head of the loaded figure. Built in the head bone's own space from the
// vertices that move with the head alone, so they sit right in every pose (a placement measured in one pose and carried over sat too low
// and too far back in another). A pure function of three.js and the figure ({ model, B }): the offline preview (tools/player) uses it too.
// o: color (cap), front/back (rim height above the eyes, m), brim (length, m), off (gap over the hair, m).
function figHeadwear(THREE, F, o = {}) {
  const H = F.B && F.B.Head;
  const meshes = [];
  F.model.traverse(x => {
    if (x.isSkinnedMesh && x.skeleton) meshes.push(x);
  });
  const sk0 = meshes.length ? meshes[0].skeleton : null,
    hi = sk0 ? sk0.bones.indexOf(H) : -1;
  if (hi < 0) return null;
  const inv = sk0.boneInverses[hi],
    M = new THREE.Matrix4();
  // joints of the bind pose in the head bone's space (from the inverse bind matrices – independent of the pose and of the space the
  // vertices are stored in, which mesh quantization changes)
  const joint = b => {
    const i = b ? sk0.bones.indexOf(b) : -1;
    return i < 0
      ? null
      : new THREE.Vector3().setFromMatrixPosition(M.copy(sk0.boneInverses[i]).invert()).applyMatrix4(inv);
  };
  const jp = joint(F.B.Hips),
    jn = joint(F.B.Neck),
    jl = joint(F.B.LeftArm),
    jr = joint(F.B.RightArm);
  if (!jp || !jn || !jl || !jr) return null;
  // the head frame: X (the figure's left), U (up: pelvis → neck of the upright bind pose), W (forward) as unit vectors in the bone's space
  const U = jn.clone().sub(jp).normalize(),
    X = jl.clone().sub(jr);
  X.addScaledVector(U, -X.dot(U)).normalize();
  const W = new THREE.Vector3().crossVectors(X, U).normalize();
  // k: bone units per metre of the figure as modelled (bones carry no scale animation, so any pose will do)
  const k = 1 / new THREE.Vector3().setFromMatrixScale(M.copy(F.model.matrixWorld).invert().multiply(H.matrixWorld)).x;
  const v = new THREE.Vector3(),
    pts = [];
  for (const m of meshes) {
    if (!/head/i.test((m.material && m.material.name) || '')) continue; // face, neck and the modelled hair (not the hair cards)
    const g = m.geometry,
      P = g.attributes.position,
      SI = g.attributes.skinIndex,
      SW = g.attributes.skinWeight,
      j = m.skeleton.bones.indexOf(H);
    if (!P || !SI || !SW || j < 0) continue;
    M.multiplyMatrices(m.skeleton.boneInverses[j], m.bindMatrix);
    for (let i = 0; i < P.count; i++) {
      let w = 0;
      for (let c = 0; c < 4; c++) if (SI.getComponent(i, c) === j) w += SW.getComponent(i, c);
      if (w < 0.98) continue; // only what the head bone moves alone (not the neck, jaw, lids)
      v.fromBufferAttribute(P, i).applyMatrix4(M);
      pts.push(v.dot(X) / k, v.dot(U) / k, v.dot(W) / k);
    }
  }
  if (pts.length < 300) return null;
  // the eyes (bones of the facial rig), else estimated from the top of the head
  let eu = 0,
    ef = 0,
    ne = 0,
    top = -1e9,
    front = -1e9;
  for (const nm of ['Bip01_LEye', 'Bip01_REye']) {
    const b = sk0.bones.findIndex(x => x.name === nm);
    if (b < 0) continue;
    v.setFromMatrixPosition(M.copy(sk0.boneInverses[b]).invert()).applyMatrix4(inv);
    eu += v.dot(U) / k;
    ef += v.dot(W) / k;
    ne++;
  }
  for (let i = 0; i < pts.length; i += 3) {
    top = Math.max(top, pts[i + 1]);
    front = Math.max(front, pts[i + 2]);
  }
  if (ne) ((eu /= ne), (ef /= ne));
  else ((eu = top - 0.12), (ef = front - 0.015));
  // the cranium: centre between its extremes above the eyes
  let x0 = 1e9,
    x1 = -1e9,
    f0 = 1e9,
    f1 = -1e9;
  for (let i = 0; i < pts.length; i += 3)
    if (pts[i + 1] > eu + 0.01) {
      x0 = Math.min(x0, pts[i]);
      x1 = Math.max(x1, pts[i]);
      f0 = Math.min(f0, pts[i + 2]);
      f1 = Math.max(f1, pts[i + 2]);
    }
  const cx = (x0 + x1) / 2,
    cu = eu + 0.02,
    cf = (f0 + f1) / 2;
  // the outline of the head as seen from the centre: the farthest point per direction (azimuth × polar angle), gaps filled, widened, smoothed
  const NA = 36,
    NT = 20,
    TM = (118 * Math.PI) / 180,
    R = new Float32Array(NA * NT).fill(-1);
  for (let i = 0; i < pts.length; i += 3) {
    const dx = pts[i] - cx,
      du = pts[i + 1] - cu,
      df = pts[i + 2] - cf,
      r = Math.hypot(dx, du, df),
      th = Math.acos(THREE.MathUtils.clamp(du / (r || 1), -1, 1));
    if (th >= TM) continue;
    const ia = Math.floor(((Math.atan2(dx, df) + Math.PI) / (2 * Math.PI)) * NA) % NA,
      it = Math.min(NT - 1, Math.floor((th / TM) * NT));
    R[it * NA + ia] = Math.max(R[it * NA + ia], r);
  }
  const at = (a, t) => R[THREE.MathUtils.clamp(t, 0, NT - 1) * NA + (((a % NA) + NA) % NA)];
  for (let pass = 0; pass < 30; pass++) {
    let empty = 0;
    const R2 = R.slice();
    for (let t = 0; t < NT; t++)
      for (let a = 0; a < NA; a++) {
        if (R[t * NA + a] > 0) continue;
        let s = 0,
          n = 0;
        for (const [da, dt] of [
          [1, 0],
          [-1, 0],
          [0, 1],
          [0, -1],
        ]) {
          const q = at(a + da, t + dt);
          if (q > 0) ((s += q), n++);
        }
        if (n) R2[t * NA + a] = s / n;
        else empty++;
      }
    R.set(R2);
    if (!empty) break;
  }
  const blur = (src, max) => {
    const out = new Float32Array(src.length);
    for (let t = 0; t < NT; t++)
      for (let a = 0; a < NA; a++) {
        let s = max ? -1e9 : 0,
          n = 0;
        for (let dt = -1; dt <= 1; dt++)
          for (let da = -1; da <= 1; da++) {
            const q = src[THREE.MathUtils.clamp(t + dt, 0, NT - 1) * NA + ((((a + da) % NA) + NA) % NA)];
            if (max) s = Math.max(s, q);
            else s += q;
            n++;
          }
        out[t * NA + a] = max ? s : s / n;
      }
    return out;
  };
  const RS = blur(blur(R, true), false),
    off = o.off ?? 0.006;
  const rad = (al, th) => {
    const fa = ((al + Math.PI) / (2 * Math.PI)) * NA - 0.5,
      ft = THREE.MathUtils.clamp((th / TM) * NT - 0.5, 0, NT - 1),
      a0 = Math.floor(fa),
      t0 = Math.floor(ft),
      wa = fa - a0,
      wt = ft - t0,
      g = (a, t) => RS[Math.min(NT - 1, t) * NA + (((a % NA) + NA) % NA)];
    return (
      (g(a0, t0) * (1 - wa) + g(a0 + 1, t0) * wa) * (1 - wt) +
      (g(a0, t0 + 1) * (1 - wa) + g(a0 + 1, t0 + 1) * wa) * wt +
      off
    );
  };
  const dirp = (al, th, r) => [
    cx + Math.sin(th) * Math.sin(al) * r,
    cu + Math.cos(th) * r,
    cf + Math.sin(th) * Math.cos(al) * r,
  ];
  // the rim: a plane across the forehead (front above the eyes) sloping down to the back of the head
  const uF = eu + (o.front ?? 0.05),
    uB = eu + (o.back ?? 0.02),
    slope = (uF - uB) / 0.2,
    above = p => p[1] - (uF + (p[2] - ef) * slope);
  const rimTh = al => {
    let pr = 0.02,
      sp = above(dirp(al, pr, rad(al, pr)));
    for (let th = 0.03; th < TM; th += 0.01) {
      const s = above(dirp(al, th, rad(al, th)));
      if (s < 0) return th - (0.01 * s) / (s - sp);
      ((pr = th), (sp = s));
    }
    return TM;
  };
  // crown: a pole and rings down to the rim
  // six panels: the seams (every 60°, one at the front) a little darker – vertex colours
  const NC = 48,
    NJ = 9,
    pos = [],
    col = [],
    idx = [];
  pos.push(...dirp(0, 0, rad(0, 0)));
  col.push(0.86, 0.86, 0.86);
  const rims = [];
  for (let i = 0; i < NC; i++) {
    const al = -Math.PI + (2 * Math.PI * i) / NC,
      tr = rimTh(al),
      seam = i % 8 === 0 ? 0.8 : 1;
    rims.push(tr);
    for (let j = 1; j <= NJ; j++) {
      const th = (tr * j) / NJ;
      pos.push(...dirp(al, th, rad(al, th)));
      col.push(seam, seam, seam);
    }
  }
  const vi = (i, j) => 1 + (i % NC) * NJ + (j - 1);
  for (let i = 0; i < NC; i++) {
    idx.push(0, vi(i, 1), vi(i + 1, 1));
    const back = i >= NC - 2 || i < 2; // the opening at the back above the strap (the lowest band)
    for (let j = 1; j < NJ; j++)
      if (!(back && j >= NJ - 3 && j < NJ - 1))
        idx.push(vi(i, j), vi(i, j + 1), vi(i + 1, j + 1), vi(i, j), vi(i + 1, j + 1), vi(i + 1, j));
  }
  // the brim: from the front of the rim forward and a little down, the sides curving down; top and underside, outer edge
  const NB = 24,
    AB = (72 * Math.PI) / 180,
    LB = o.brim ?? 0.072,
    TB = 0.004,
    tilt = 0.2,
    b0 = pos.length / 3;
  const rows = [0, 0.25, 0.5, 0.75, 1];
  for (const side of [0, 1])
    for (let i = 0; i <= NB; i++) {
      const al = -AB + (2 * AB * i) / NB,
        q = al / AB,
        tr = rimTh(al),
        p0 = dirp(al, tr, rad(al, tr)),
        L = 0.004 + LB * Math.pow(Math.max(0, 1 - q * q), 0.6);
      // mostly forward, fanning out a little: the brim is about as wide as the head, its outline a half ellipse
      const dx = Math.sin(al) * 0.32,
        dn = Math.hypot(dx, Math.cos(al)) || 1;
      for (const t of rows) {
        const d = L * t;
        pos.push(
          p0[0] + (dx / dn) * Math.cos(tilt) * d,
          p0[1] - Math.sin(tilt) * d - 0.012 * q * q * t - side * TB,
          p0[2] + (Math.cos(al) / dn) * Math.cos(tilt) * d
        );
        const sh = side ? 0.62 : 1; // the underside darker
        col.push(sh, sh, sh);
      }
    }
  const bv = (side, i, r) => b0 + side * (NB + 1) * rows.length + i * rows.length + r;
  for (let i = 0; i < NB; i++)
    for (let r = 0; r < rows.length - 1; r++)
      for (const side of [0, 1]) {
        const a = bv(side, i, r),
          b = bv(side, i + 1, r),
          c = bv(side, i + 1, r + 1),
          d = bv(side, i, r + 1);
        if (side) idx.push(a, c, b, a, d, c);
        else idx.push(a, b, c, a, c, d);
      }
  for (let i = 0; i < NB; i++) {
    const e = rows.length - 1;
    idx.push(bv(0, i, e), bv(1, i, e), bv(1, i + 1, e), bv(0, i, e), bv(1, i + 1, e), bv(0, i + 1, e));
  }
  const toBone = new THREE.Matrix4().makeBasis(
    X.clone().multiplyScalar(k),
    U.clone().multiplyScalar(k),
    W.clone().multiplyScalar(k)
  );
  const mk = (geo, mat) => {
    const me = new THREE.Mesh(geo, mat);
    me.matrixAutoUpdate = false;
    me.matrix.copy(toBone);
    me.castShadow = true;
    me.userData.noMerge = true;
    return me;
  };
  const capG = new THREE.BufferGeometry();
  capG.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  capG.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
  capG.setIndex(idx);
  capG.computeVertexNormals();
  const capM = new THREE.MeshStandardMaterial({
    color: o.color ?? 0x56633f,
    roughness: 0.9,
    side: THREE.DoubleSide,
    vertexColors: true,
  });
  const cap = new THREE.Group();
  cap.name = 'cap';
  cap.add(mk(capG, capM));
  const btn = mk(
    new THREE.SphereGeometry(0.008, 10, 6),
    new THREE.MeshStandardMaterial({ color: capM.color, roughness: 0.9 })
  );
  btn.matrix.multiply(new THREE.Matrix4().makeTranslation(...dirp(0, 0, rad(0, 0) + 0.001)));
  btn.matrix.multiply(new THREE.Matrix4().makeScale(1, 0.45, 1));
  cap.add(btn);
  // earbuds: at the entrance of each ear canal – the ear is the outermost part of the head between the eyes' height and 5 cm below,
  // 5–13 cm behind the eyes; the bud sits a little in front of the ear's middle, its stem points down
  const buds = new THREE.Group();
  buds.name = 'buds';
  const budM = new THREE.MeshStandardMaterial({ color: 0xf1f1ee, roughness: 0.35 });
  for (const s of [-1, 1]) {
    let best = -1e9;
    for (let i = 0; i < pts.length; i += 3) {
      const x = pts[i] * s,
        u = pts[i + 1],
        f = pts[i + 2];
      if (u > eu - 0.05 && u < eu + 0.015 && f > ef - 0.13 && f < ef - 0.05 && x > best) best = x;
    }
    let su = 0,
      sf = 0,
      n = 0;
    for (let i = 0; i < pts.length; i += 3) {
      const x = pts[i] * s,
        u = pts[i + 1],
        f = pts[i + 2];
      if (u > eu - 0.05 && u < eu + 0.015 && f > ef - 0.13 && f < ef - 0.05 && x > best - 0.012)
        ((su += u), (sf += f), n++);
    }
    if (!n) continue;
    const bx = s * (best - (o.budIn ?? 0.009)),
      bu = su / n - 0.004,
      bf = sf / n + (o.budFwd ?? 0.008);
    const bud = mk(new THREE.SphereGeometry(0.0068, 12, 8), budM);
    bud.matrix.multiply(new THREE.Matrix4().makeTranslation(bx, bu, bf));
    buds.add(bud);
    const stem = mk(new THREE.CylinderGeometry(0.0026, 0.0024, 0.017, 8), budM);
    stem.matrix.multiply(new THREE.Matrix4().makeTranslation(bx, bu - 0.009, bf + 0.003));
    stem.matrix.multiply(new THREE.Matrix4().makeRotationX(0.3));
    buds.add(stem);
  }
  H.add(cap);
  H.add(buds);
  return { cap, buds, eye: [eu, ef], rim: rims };
}
// ---- headwear: end ----
export const AVATAR = (() => {
  const PM = window.PLAYERMAN || null;
  // the figures (Falko 23.10.2026, docs/plans/plan_leben.md 3): Microsoft Rocketbox avatars on the Biped skeleton shared by all adult women
  // resp. men (tools/player/build_figures.sh). 'pav-fig' keeps the code – m and f of the former Mann/Frau stay valid. file: PLAYERMAN key of
  // the mesh (else alt), clips: the clip set, scale: size against the skeleton's own (0: the clip set's height; Christoph 1.5 cm shorter
  // than Falko), gearK: size of the protective gear on the head, cap/buds: Christoph's cap and earbuds (figHeadwear)
  const FIGS = {
    m: { name: 'Falko', file: 'player_m', clips: 'pclips_m', scale: 0, gearK: 1 },
    f: { name: 'Sarah', file: 'player_f', clips: 'pclips_f', scale: 1.0023, gearK: 0.94 },
    c: {
      name: 'Christoph',
      file: 'player_c',
      alt: 'player_m',
      clips: 'pclips_m',
      scale: 0.9922,
      gearK: 1,
      cap: true,
      buds: true,
    },
  };
  const FIGID = { falko: 'm', sarah: 'f', christoph: 'c', mann: 'm', frau: 'f' };
  const own = (o, k) => Object.prototype.hasOwnProperty.call(o, k);
  const figCode = k =>
    typeof k !== 'string' ? null : own(FIGS, k) ? k : own(FIGID, k.toLowerCase()) ? FIGID[k.toLowerCase()] : null;
  const A = { ready: false, failed: !PM, kind: 'm', fig: null, figs: {}, loading: {}, clips: null, FIGS };
  try {
    const k = figCode(SAVE.raw('pav-fig'));
    if (k) A.kind = k;
  } catch (e) {}
  // canonical bone names (Mixamo, Character Creator, 3ds Max Biped, UE mannequin) and the compact clips: core/rig.js
  const canonP = canonBone;
  // ---- one figure ----
  const _v = new THREE.Vector3(),
    _v2 = new THREE.Vector3(),
    _q = new THREE.Quaternion(),
    _q2 = new THREE.Quaternion(),
    _m = new THREE.Matrix4(),
    _s = new THREE.Vector3();
  function build(gl, set, o) {
    const model = gl.scene,
      g = new THREE.Group(),
      inner = new THREE.Group();
    inner.rotation.y = Math.PI;
    g.add(inner);
    inner.add(model); // models face +z, figures look along local -z
    // size: the clip set's height, or a factor on the figure's own (the bounding box of the bind pose, as prepModel measures it)
    const sc = prepModel(model, o.scale ? new THREE.Box3().setFromObject(model).getSize(_s).y * o.scale : o.h);
    const B = {};
    model.traverse(x => {
      if (x.isBone) {
        const c = canonP(x.name);
        if (c && !B[c]) B[c] = x;
      }
    });
    model.traverse(x => {
      if (x.isMesh) {
        x.frustumCulled = false;
        const ms = Array.isArray(x.material) ? x.material : [x.material];
        for (const m of ms)
          if (m && /hair|lash|brow/i.test(m.name || '')) {
            m.alphaTest = Math.max(m.alphaTest || 0, 0.4);
            m.transparent = false;
          }
      }
    });
    if (window.FELL && LATE.FELL.on)
      try {
        wearZones(model);
      } catch (e) {
        console.warn('wear zones', e);
      } // only with felling (V16c2)
    const mixer = new THREE.AnimationMixer(model),
      acts = {},
      clips = {};
    for (const [k, c] of Object.entries(set.clips)) {
      const clip = decodeClip(c);
      clips[k] = clip;
      const a = mixer.clipAction(clip);
      a.play();
      a.setEffectiveWeight(0);
      if (!clip.userData.loop) {
        a.setLoop(THREE.LoopOnce, 1);
        a.clampWhenFinished = true;
      }
      acts[k] = a;
    }
    const w = {};
    for (const k of Object.keys(acts)) w[k] = 0;
    model.updateMatrixWorld(true);
    // the grip in the right hand, from the rest pose: fingers' direction, the line pinky → index (the handle runs along it), the palm
    const grip = (() => {
      const H = B.RightHand,
        M = B.RightHandMiddle1,
        I = B.RightHandIndex1,
        K = B.RightHandPinky1;
      if (!H) return null;
      const hp = H.getWorldPosition(new THREE.Vector3()),
        f = (M ? M.getWorldPosition(new THREE.Vector3()) : hp.clone().add(new THREE.Vector3(-0.08, 0, 0))).sub(hp),
        L = f.length();
      f.normalize();
      let t =
        I && K
          ? I.getWorldPosition(new THREE.Vector3()).sub(K.getWorldPosition(new THREE.Vector3()))
          : new THREE.Vector3(0, 0, 1);
      t.addScaledVector(f, -t.dot(f)).normalize();
      const n = new THREE.Vector3().crossVectors(f, t).normalize();
      const at = hp
        .clone()
        .addScaledVector(f, L * 0.55)
        .addScaledVector(n, -L * 0.18); // inside the closed hand
      const W = new THREE.Matrix4().makeBasis(f, t, n).setPosition(at);
      return H.matrixWorld.clone().invert().multiply(W);
    })(); // bone space → grip frame (x fingers, y towards the thumb, z out of the back of the hand)
    const hipH = B.Hips ? B.Hips.getWorldPosition(new THREE.Vector3()).y : 0.95;
    // the lying pose: which way the body lies (head → hips) when the figure faces yaw 0 – lying down it is turned so the body runs along the view
    let lieTurn = 0;
    if (acts.lie && B.Head && B.Hips) {
      for (const [k, a] of Object.entries(acts)) a.setEffectiveWeight(k === 'lie' ? 1 : 0);
      mixer.update(0.01);
      g.updateMatrixWorld(true);
      const h = B.Head.getWorldPosition(new THREE.Vector3()),
        p = B.Hips.getWorldPosition(new THREE.Vector3());
      lieTurn = (-Math.atan2(p.x - h.x, -(p.z - h.z)) * 180) / Math.PI;
      for (const a of Object.values(acts)) a.setEffectiveWeight(0);
    }
    const self = {
      g,
      model,
      mixer,
      acts,
      clips,
      w,
      B,
      grip,
      hipH,
      scale: sc,
      set,
      sv: new Map(),
      t: 0,
      gest: null,
      look: 0,
      kind: o.kind,
      lieTurn,
    };
    return self;
  }
  // ---- the state of motion → weights ----
  const LOCO = (F, sp) => {
    const s = {
      walk: F.clips.walk ? F.clips.walk.userData.speed : 1.4,
      jog: F.clips.jog ? F.clips.jog.userData.speed : 3.2,
      sprint: F.clips.sprint ? F.clips.sprint.userData.speed : 5.5,
    };
    if (sp < 0.12) return [['idle', 1, 1]];
    if (sp < s.walk * 1.25) {
      const k = Math.min(1, sp / 0.5);
      return [
        ['walk', k, sp / s.walk],
        ['idle', 1 - k, 1],
      ];
    }
    if (sp < (s.walk * 1.25 + s.jog) / 2 + 0.3) {
      const a = s.walk * 1.25,
        b = (s.walk * 1.25 + s.jog) / 2 + 0.3,
        k = (sp - a) / (b - a);
      return [
        ['walk', 1 - k, sp / s.walk],
        ['jog', k, sp / s.jog],
      ];
    }
    if (sp < s.jog * 1.15 || !F.acts.sprint) return [['jog', 1, sp / s.jog]];
    const k = Math.min(1, (sp - s.jog * 1.15) / Math.max(0.5, s.sprint - s.jog * 1.15));
    return [
      ['jog', 1 - k, sp / s.jog],
      ['sprint', k, sp / s.sprint],
    ];
  };
  function targets(F, dt) {
    const T = {};
    const put = (k, v, ts) => {
      if (!F.acts[k]) return false;
      T[k] = (T[k] || 0) + v;
      if (ts != null) F.acts[k].timeScale = THREE.MathUtils.clamp(ts, 0.35, 1.8);
      return true;
    };
    const seat = PLAY.seat,
      sp = P.speed;
    if (seat) {
      const kind = seat.kind;
      if (kind === 'lie') put('lie', 1) || put('sit', 1);
      else if (kind === 'ride' && F.acts.sitRide) put('sitRide', 1);
      else put('sit', 1);
      return T;
    }
    if (F.gest && F.acts[F.gest.k]) {
      const g = F.gest,
        a = F.acts[g.k],
        d = a.getClip().duration / Math.max(0.1, a.timeScale),
        e = Math.min(1, g.t / 0.18, (d - g.t) / 0.25);
      if (g.t < d) {
        put(g.k, Math.max(0, e));
        if (e >= 1) return T;
      }
    }
    if (P.air && (P.vz > 0.4 || (P.airT || 0) > 0.16)) {
      if (P.vz > 0.3 && (P.airT || 0) < 0.3 && F.acts.jumpStart) put('jumpStart', 1);
      else put('jumpLoop', 1) || put('idle', 1);
      return T;
    }
    if (P.landT > 0 && F.acts.jumpLand) {
      put('jumpLand', 1);
      return T;
    }
    const h = PLAY.hold;
    if (h && !sp) {
      const hk = (h.a.anim3 && (typeof h.a.anim3 === 'function' ? h.a.anim3() : h.a.anim3)) || 'interactLoop';
      if (put(hk, 1) || put('interact', 1)) return T;
    }
    const st = P.stance;
    if (st === 'crouch') {
      if (sp > 0.08) put('crouchWalk', 1, sp / (F.clips.crouchWalk ? F.clips.crouchWalk.userData.speed || 1 : 1));
      else put('crouchIdle', 1);
      return T;
    }
    if (st === 'crawl') {
      const c = F.acts.crawl;
      if (c) {
        put('crawl', 1);
        c.timeScale = sp > 0.04 ? THREE.MathUtils.clamp(sp / (F.clips.crawl.userData.speed || 0.35), 0.4, 1.8) : 0;
      } else put('crouchIdle', 1);
      return T;
    }
    if (st === 'prone') {
      put('lie', 1) || put('crouchIdle', 1);
      return T;
    }
    if (NPCUI.cur() && !sp && F.acts.talk) {
      put('talk', 0.55);
      put('idle', 0.45);
      return T;
    }
    for (const [k, v, ts] of LOCO(F, sp)) put(k, v, ts);
    return T;
  }
  // bones the arm pose of carrying (or holding a tool) replaces
  const ARM_R = ['RightShoulder', 'RightArm', 'RightForeArm', 'RightHand'],
    ARM_L = ['LeftShoulder', 'LeftArm', 'LeftForeArm', 'LeftHand'];
  const FING = s => ['Thumb', 'Index', 'Middle', 'Ring', 'Pinky'].flatMap(f => [1, 2, 3].map(k => s + 'Hand' + f + k));
  function overlay(F, clipKey, t, bones, wt) {
    const clip = F.clips[clipKey];
    if (!clip || wt <= 0) return;
    if (!F._ip) F._ip = {};
    let ips = F._ip[clipKey];
    const B = F.B;
    if (!ips) {
      ips = F._ip[clipKey] = {};
      for (const tr of clip.tracks) {
        const nm = tr.name.split('.')[0],
          c = canonP(nm);
        if (c && tr.name.endsWith('.quaternion')) ips[c] = tr.createInterpolant();
      }
    }
    for (const c of bones) {
      const ip = ips[c],
        b = B[c];
      if (!ip || !b) continue;
      const r = ip.evaluate(t % clip.duration);
      _q.set(r[0], r[1], r[2], r[3]);
      b.quaternion.slerp(_q, wt);
    }
  }
  // ---- the thing in the hand ----
  const SOCK = new THREE.Group();
  SOCK.matrixAutoUpdate = false;
  SOCK.userData.noMerge = true;
  scene.add(SOCK);
  function attach(F) {
    const H = HELD,
      obj = H.obj,
      third = CAM3.on && F && F.g.visible;
    if (!obj) return;
    if (!third) {
      if (obj.parent !== H.root) {
        H.root.add(obj);
        H.away = false;
      }
      return;
    }
    if (obj.parent !== SOCK) {
      SOCK.add(obj);
      H.away = true;
    }
    const T = PLAY.carry,
      mode = (T && T.carry3) || 'arms',
      B = F.B;
    obj.position.set(0, 0, 0);
    obj.quaternion.identity();
    obj.scale.setScalar((T && T.s3) || 1);
    if (mode === 'tool' && F.grip && B.RightHand) {
      _m.multiplyMatrices(B.RightHand.matrixWorld, F.grip);
      _m.decompose(_v, _q, _s);
      SOCK.matrix.compose(_v, _q, _v2.set(1, 1, 1));
      // the handle (the thing's +y) along the grip line, the hand at 'at' of the length from the lower end
      const g3 = (T && T.grip3) || {};
      obj.quaternion.setFromEuler(new THREE.Euler(g3.rx || 0, g3.ry || 0, g3.rz || 0));
      obj.position.set(0, -(g3.at ?? 0.12) * (g3.len || 0.7), 0).applyQuaternion(obj.quaternion);
    } else if (mode === 'side' && B.RightHand) {
      B.RightHand.getWorldPosition(_v);
      _q.setFromAxisAngle(_v2.set(0, 1, 0), (-P.body * Math.PI) / 180);
      const g3 = (T && T.grip3) || {};
      _v.y -= g3.hang ?? 0.38;
      SOCK.matrix.compose(_v, _q, _s.set(1, 1, 1));
    } else {
      if (!B.LeftHand || !B.RightHand) return;
      B.LeftHand.getWorldPosition(_v);
      B.RightHand.getWorldPosition(_v2);
      _v.add(_v2).multiplyScalar(0.5);
      const yaw = (-P.body * Math.PI) / 180;
      _q.setFromAxisAngle(_v2.set(0, 1, 0), yaw);
      const g3 = (T && T.grip3) || {};
      _v2.set(0, g3.dy ?? -0.02, -(g3.fwd ?? 0.12)).applyQuaternion(_q);
      _v.add(_v2);
      if (g3.ry) _q.multiply(_q2.setFromAxisAngle(_s.set(0, 1, 0), g3.ry));
      SOCK.matrix.compose(_v, _q, _s.set(1, 1, 1));
    }
    SOCK.matrixWorldNeedsUpdate = true;
    SOCK.updateMatrixWorld(true);
  }
  // ---- per frame ----
  let lastDraw = 0;
  function update(dt) {
    const F = A.fig;
    if (!F) return;
    budsTick(F, dt);
    const show = CAM3.on && P.mode === 'walk' && CAM3.cur > 0.85;
    if (F.g.visible !== show) {
      F.g.visible = show;
      markDirty(true);
    }
    if (!show) {
      attach(null);
      return;
    }
    // where the figure stands, and which way it faces
    const seat = PLAY.seat;
    let x = P.x,
      y = P.y,
      z = P.feet,
      yaw = P.body,
      want = null;
    if (seat) {
      const e = P.cam || { x: seat.x, y: seat.y, z: seat.eye };
      yaw = P.body = seat.kind === 'ride' ? P.yaw : (seat.yaw ?? P.yaw);
      const fw = [Math.sin((yaw * Math.PI) / 180), Math.cos((yaw * Math.PI) / 180)];
      const M = F.set.meta || {},
        sh = (M.sitHip && M.sitHip.y) || 0.59,
        lh = (M.lieHip && M.lieHip.y) || 0.07;
      if (seat.kind === 'lie') {
        x = e.x;
        y = e.y;
        z = e.z - 0.62 + 0.1 - lh;
        want = { head: [e.x, e.y] };
        yaw += F.lieTurn || 0;
      } // head where the eye is, the body along the view
      else {
        x = e.x;
        y = e.y;
        z = e.z - 0.78 + 0.11 - sh;
        want = { hips: [e.x - fw[0] * 0.04, e.y - fw[1] * 0.04] };
      }
    }
    F.g.position.copy(V(x, y, z));
    F.g.rotation.y = (-yaw * Math.PI) / 180;
    // weights toward the state's targets, then one mixer step
    const T = targets(F, dt),
      k = Math.min(1, dt * 9);
    let sum = 0;
    for (const n of Object.keys(F.w)) {
      const tw = T[n] || 0;
      F.w[n] += (tw - F.w[n]) * k;
      if (F.w[n] < 1e-3 && tw === 0) F.w[n] = 0;
      sum += F.w[n];
    }
    for (const [n, a] of Object.entries(F.acts)) a.setEffectiveWeight(sum > 0 ? F.w[n] / sum : n === 'idle' ? 1 : 0);
    if (F.gest) {
      F.gest.t += dt;
      const a = F.acts[F.gest.k];
      if (!a || F.gest.t > a.getClip().duration / Math.max(0.1, a.timeScale) + 0.3) F.gest = null;
    }
    for (const [b, q] of F.sv) b.quaternion.copy(q);
    F.sv.clear();
    F.mixer.update(dt);
    F.t += dt;
    // arms: an armful in both arms, a tool held a little forward
    const C = PLAY.carry,
      mode = C ? C.carry3 || 'arms' : null,
      base = !seat && !PLAY.hold && !F.gest && !P.air && P.stance !== 'crawl' && P.stance !== 'prone';
    if (base && mode === 'arms' && F.clips.walkCarry && !(F.w.walkCarry > 0.95))
      overlay(
        F,
        'walkCarry',
        F.acts.walkCarry ? F.acts.walkCarry.time : 0,
        [...ARM_L, ...ARM_R, ...FING('Left'), ...FING('Right')],
        1
      );
    else if (base && mode === 'tool' && F.clips.holdTool) overlay(F, 'holdTool', F.t, [...ARM_R, ...FING('Right')], 1);
    else if (base && mode === 'side' && F.clips.holdTool) overlay(F, 'holdTool', 0, FING('Right'), 1);
    F.model.updateMatrixWorld(true);
    // seated or lying: the measured pose decides where the figure stands – the hips onto the seat, the head onto the pillow
    if (want) {
      const B = F.B;
      if (want.head && B.Head && B.Hips) {
        const h = B.Head.getWorldPosition(_v),
          p = B.Hips.getWorldPosition(_v2);
        F.g.position.x += V(want.head[0], want.head[1], 0).x - h.x;
        F.g.position.z += V(want.head[0], want.head[1], 0).z - h.z;
      } else if (want.hips && B.Hips) {
        const p = B.Hips.getWorldPosition(_v),
          t = V(want.hips[0], want.hips[1], 0);
        F.g.position.x += t.x - p.x;
        F.g.position.z += t.z - p.z;
      }
      F.g.updateMatrixWorld(true);
    }
    // the head follows the view a little (standing, not doing anything special)
    if (!seat && !F.gest && P.stance === 'stand' && F.B.Head) {
      let d = P.yaw - P.body;
      while (d > 180) d -= 360;
      while (d < -180) d += 360;
      const tgt = Math.abs(d) < 110 ? (THREE.MathUtils.clamp(d, -60, 60) * Math.PI) / 180 : 0;
      F.look += (tgt - F.look) * Math.min(1, dt * 4);
      if (Math.abs(F.look) > 0.01) {
        F.model.getWorldQuaternion(_q2).invert();
        boneTurn(F.sv, _q2, F.B.Neck, 0, 1, 0, -F.look * 0.35);
        boneTurn(F.sv, _q2, F.B.Head, 0, 1, 0, -F.look * 0.45);
      }
    }
    attach(F);
    const now = performance.now();
    if (now - lastDraw > (RENDER.hq ? 25 : 45)) {
      lastDraw = now;
      markDirty();
    }
    if (F.gest || P.air || P.speed > 0.05 || Math.abs(P.eyeH - MOVE.STANCES[P.stance].eye) > 0.02)
      MOTION.lastMove = now;
  } // bigger movements: smooth frames (the light-weight motion path), not the slow still frames
  window.TICKS.push(dt => {
    try {
      update(dt);
    } catch (e) {
      if (!A._err) {
        A._err = 1;
        console.warn('avatar', e);
      }
    }
  });
  // ---- one-shot gestures: picking something up, a hand movement, chopping ----
  function gesture(k, ts = 1) {
    const F = A.fig;
    if (!F || !F.acts[k] || !F.g.visible) return 0;
    const a = F.acts[k];
    a.reset();
    a.timeScale = ts;
    a.play();
    F.gest = { k, t: 0 };
    return a.getClip().duration / ts;
  }
  // ---- V15b protective gear on the figure: goggles, ear defenders, masks – meshes on the head bone, built once per figure ----
  const GM = {
    lens: new THREE.MeshStandardMaterial({
      color: 0xd2e6ee,
      roughness: 0.06,
      transparent: true,
      opacity: 0.36,
      depthWrite: false,
    }),
    frame: new THREE.MeshStandardMaterial({ color: 0x24282c, roughness: 0.5 }),
    cup: new THREE.MeshStandardMaterial({ color: 0xd8a21a, roughness: 0.45 }),
    band: new THREE.MeshStandardMaterial({ color: 0x2b2e31, roughness: 0.6 }),
    ffp: new THREE.MeshStandardMaterial({ color: 0xf2f1ec, roughness: 0.85 }),
    mask: new THREE.MeshStandardMaterial({ color: 0x55595d, roughness: 0.55 }),
    filt: new THREE.MeshStandardMaterial({ color: 0x8a6a3a, roughness: 0.5 }),
    fk: new THREE.MeshStandardMaterial({ color: 0x3f8a3c, roughness: 0.5 }),
    helm: new THREE.MeshStandardMaterial({ color: 0xe8661c, roughness: 0.4 }),
    visor: new THREE.MeshStandardMaterial({
      color: 0x1c1d1f,
      roughness: 0.5,
      transparent: true,
      opacity: 0.55,
      depthWrite: false,
      side: THREE.DoubleSide,
    }),
  };
  let WEARING = { eyes: null, ears: null, resp: null };
  function gearOf(F) {
    if (F.gear !== undefined) return F.gear;
    const H = F.B.Head;
    if (!H) return (F.gear = null);
    // measured in the standing pose (after loading the skeleton may still hold the lying pose of the lieTurn measurement)
    for (const [k, a] of Object.entries(F.acts)) a.setEffectiveWeight(k === 'idle' ? 1 : 0);
    F.mixer.update(0);
    F.g.updateMatrixWorld(true);
    const hq = H.getWorldQuaternion(new THREE.Quaternion()),
      hs = H.getWorldScale(new THREE.Vector3()),
      gq = F.g.getWorldQuaternion(new THREE.Quaternion()),
      hp = H.getWorldPosition(new THREE.Vector3());
    const k = (FIGS[F.kind] && FIGS[F.kind].gearK) || 1,
      eye = new THREE.Vector3(0, 0.08 * k, -0.09 * k).applyQuaternion(gq).add(hp);
    const G = new THREE.Group();
    G.position.copy(H.worldToLocal(eye));
    G.quaternion.copy(hq.clone().invert().multiply(gq));
    G.scale.setScalar(1 / (hs.x || 1));
    H.add(G);
    const box = (par, x, y, z, sx, sy, sz, m) => {
      const me = new THREE.Mesh(new THREE.BoxGeometry(sx, sy, sz), m);
      me.position.set(x, y, z);
      me.castShadow = true;
      par.add(me);
      return me;
    };
    const cylr = (par, x, y, z, r, h, m, rx = 0, rz = 0) => {
      const me = new THREE.Mesh(new THREE.CylinderGeometry(r, r, h, 16), m);
      me.position.set(x, y, z);
      me.rotation.set(rx, 0, rz);
      me.castShadow = true;
      par.add(me);
      return me;
    };
    const it = {};
    const mk = id => ((it[id] = new THREE.Group()), G.add(it[id]), (it[id].visible = false), it[id]);
    {
      const g = mk('brille');
      box(g, 0, 0, -0.012, 0.15, 0.045, 0.006, GM.lens);
      box(g, 0, 0.024, -0.012, 0.152, 0.007, 0.01, GM.frame);
      for (const x of [-0.077, 0.077]) box(g, x, 0.018, 0.04, 0.005, 0.008, 0.11, GM.frame);
    }
    {
      const g = mk('korb');
      box(g, 0, -0.004, -0.018, 0.17, 0.06, 0.012, GM.lens);
      box(g, 0, 0.028, -0.012, 0.172, 0.008, 0.024, GM.band);
      box(g, 0, -0.035, -0.012, 0.172, 0.008, 0.024, GM.band);
      const t = new THREE.Mesh(new THREE.TorusGeometry(0.098, 0.006, 6, 28), GM.band);
      t.rotation.x = Math.PI / 2;
      t.position.set(0, 0.0, 0.07);
      t.scale.set(1, 1.15, 1);
      g.add(t);
    }
    {
      const g = mk('ohr');
      for (const x of [-0.088, 0.088]) cylr(g, x, -0.025, 0.075, 0.04, 0.036, GM.cup, 0, Math.PI / 2);
      const t = new THREE.Mesh(new THREE.TorusGeometry(0.092, 0.008, 6, 24, Math.PI), GM.band);
      t.position.set(0, -0.02, 0.075);
      g.add(t);
    }
    {
      const g = mk('ffp2');
      const c = new THREE.Mesh(new THREE.SphereGeometry(0.058, 16, 10, 0, Math.PI * 2, 0, Math.PI / 2), GM.ffp);
      c.rotation.x = -Math.PI / 2;
      c.scale.set(1, 0.62, 0.95);
      c.position.set(0, -0.065, -0.03);
      c.castShadow = true;
      g.add(c);
      const t = new THREE.Mesh(new THREE.TorusGeometry(0.094, 0.003, 4, 24), GM.ffp);
      t.rotation.x = Math.PI / 2;
      t.position.set(0, -0.06, 0.05);
      g.add(t);
    }
    {
      const g = mk('abek');
      const c = new THREE.Mesh(new THREE.SphereGeometry(0.056, 16, 10, 0, Math.PI * 2, 0, Math.PI / 2), GM.mask);
      c.rotation.x = -Math.PI / 2;
      c.scale.set(1, 0.7, 0.9);
      c.position.set(0, -0.07, -0.03);
      c.castShadow = true;
      g.add(c);
      for (const x of [-0.052, 0.052]) {
        cylr(g, x, -0.085, -0.07, 0.03, 0.028, GM.filt, Math.PI / 2 - 0.4, x < 0 ? 0.5 : -0.5);
        cylr(g, x * 1.08, -0.09, -0.09, 0.031, 0.008, GM.fk, Math.PI / 2 - 0.4, x < 0 ? 0.5 : -0.5);
      }
      const t = new THREE.Mesh(new THREE.TorusGeometry(0.095, 0.006, 4, 24), GM.band);
      t.rotation.x = Math.PI / 2;
      t.position.set(0, -0.05, 0.05);
      g.add(t);
    }
    // V16c2 forest helmet (world/fell.js): orange shell with brim, ear defenders on arms, the mesh visor down over the face
    {
      const g = mk('forsthelm');
      const sh = new THREE.Mesh(new THREE.SphereGeometry(0.128, 22, 12, 0, Math.PI * 2, 0, Math.PI / 2), GM.helm);
      sh.scale.set(1.0, 0.92, 1.14);
      sh.position.set(0, 0.055, 0.075);
      sh.castShadow = true;
      g.add(sh);
      const br = new THREE.Mesh(new THREE.CylinderGeometry(0.142, 0.146, 0.012, 26), GM.helm);
      br.scale.set(1, 1, 1.12);
      br.position.set(0, 0.052, 0.07);
      br.castShadow = true;
      g.add(br);
      for (const x of [-0.096, 0.096]) {
        cylr(g, x, -0.025, 0.078, 0.042, 0.03, GM.helm, 0, Math.PI / 2);
        box(g, x * 1.02, 0.02, 0.078, 0.008, 0.07, 0.018, GM.band);
      }
      const vz = new THREE.Mesh(
        new THREE.CylinderGeometry(0.155, 0.155, 0.135, 24, 1, true, Math.PI * 0.68, Math.PI * 0.64),
        GM.visor
      );
      vz.position.set(0, -0.02, 0.072);
      vz.scale.set(1, 1, 1.05);
      g.add(vz);
    }
    try {
      helmHair(F, G);
    } catch (e) {
      console.warn('helmet hair', e);
    }
    return (F.gear = it);
  }
  // the hair under the forest helmet (feat/figuren: Sarah's curls stood out through the shell): while it is worn, head vertices above the
  // shell's rim and outside an ellipsoid just inside it are pulled onto that ellipsoid – in the vertex shader, in bind space before skinning
  function helmHair(F, G) {
    const U = (F.helmU = { value: 0 });
    G.updateMatrix();
    const C = new THREE.Vector3(0, 0.055, 0.075),
      R = new THREE.Vector3(0.128, 0.118, 0.146).multiplyScalar(0.94),
      S = new THREE.Matrix4()
        .makeScale(1 / R.x, 1 / R.y, 1 / R.z)
        .multiply(new THREE.Matrix4().makeTranslation(-C.x, -C.y, -C.z))
        .multiply(G.matrix.clone().invert());
    F.model.traverse(m => {
      const mt = m.material;
      if (!m.isSkinnedMesh || Array.isArray(mt) || !mt || mt.userData.helm || !/head|opacity|hair/i.test(mt.name || ''))
        return;
      const j = m.skeleton.bones.indexOf(F.B.Head);
      if (j < 0) return;
      const T = S.clone().multiply(m.skeleton.boneInverses[j]).multiply(m.bindMatrix), // bind space → helmet ellipsoid (unit sphere)
        Ti = T.clone().invert();
      mt.userData.helm = true;
      const ob = mt.onBeforeCompile,
        ck = mt.customProgramCacheKey;
      mt.onBeforeCompile = (sh, r) => {
        if (ob) ob.call(mt, sh, r);
        sh.uniforms.uHelm = U;
        sh.uniforms.uHT = { value: T };
        sh.uniforms.uHTi = { value: Ti };
        sh.vertexShader =
          'uniform float uHelm; uniform mat4 uHT, uHTi;\n' +
          sh.vertexShader.replace(
            '#include <begin_vertex>',
            `#include <begin_vertex>
          if ( uHelm > 0.5 ) { vec3 e = ( uHT * vec4( transformed, 1.0 ) ).xyz; float L = length( e );
            if ( e.y > 0.0 && L > 1.0 ) transformed = ( uHTi * vec4( e / L, 1.0 ) ).xyz; }`
          );
      };
      mt.customProgramCacheKey = () => (ck ? ck.call(mt) : '') + '_helm';
      mt.needsUpdate = true;
    });
  }
  // V16c2 forest clothing (world/fell.js): warning jacket, chainsaw trousers, boots, gloves – the figure's own clothes recoloured by body zone.
  // Each vertex gets its zone from the bone that moves it most (skin weights): hands → gloves, arms/spine/chest → jacket, legs → trousers,
  // feet → boots; the hips bone splits at its own height (jacket above, trousers below). The folds of the texture stay (luminance kept).
  const WEAR_U = { value: new THREE.Vector4(0, 0, 0, 0) };
  const ZONE = n =>
    /Hand|Thumb|Index|Middle|Ring|Pinky/.test(n)
      ? 4
      : /Foot|Toe/.test(n)
        ? 3
        : /UpLeg|Leg/.test(n)
          ? 2
          : /Arm|Shoulder|Spine|Chest|Clavicle/.test(n)
            ? 1
            : n === 'Hips'
              ? 5
              : 0;
  function wearZones(model) {
    model.updateMatrixWorld(true);
    model.traverse(m => {
      if (!m.isSkinnedMesh || !m.skeleton || /hair|lash|brow|eye/i.test((m.material && m.material.name) || '')) return;
      const g = m.geometry,
        si = g.attributes.skinIndex,
        sw = g.attributes.skinWeight,
        pos = g.attributes.position;
      if (!si || !sw) return;
      const bones = m.skeleton.bones,
        zb = bones.map(b => ZONE(canonP(b.name) || '')),
        hipI = zb.indexOf(5),
        hipY =
          hipI >= 0 ? new THREE.Vector3().setFromMatrixPosition(m.skeleton.boneInverses[hipI].clone().invert()).y : 0;
      const z = new Float32Array(pos.count),
        v = new THREE.Vector3();
      for (let i = 0; i < pos.count; i++) {
        let b = 0,
          bw = -1;
        for (let k = 0; k < 4; k++) {
          const w = sw.getComponent(i, k);
          if (w > bw) {
            bw = w;
            b = si.getComponent(i, k);
          }
        }
        let zz = zb[b] || 0;
        if (zz === 5) {
          v.fromBufferAttribute(pos, i).applyMatrix4(m.bindMatrix);
          zz = v.y > hipY ? 1 : 2;
        }
        z[i] = zz;
      }
      g.setAttribute('aWear', new THREE.BufferAttribute(z, 1));
      const ms = Array.isArray(m.material) ? m.material : [m.material];
      for (const mt of ms) {
        if (!mt || mt.userData.wear) continue;
        mt.userData.wear = true;
        const ob = mt.onBeforeCompile,
          ck = mt.customProgramCacheKey;
        mt.onBeforeCompile = (sh, r) => {
          if (ob) ob.call(mt, sh, r);
          sh.uniforms.uWear = WEAR_U;
          sh.vertexShader =
            'attribute float aWear; varying float vWear;\n' +
            sh.vertexShader.replace('#include <begin_vertex>', '#include <begin_vertex>\n vWear = aWear;');
          sh.fragmentShader =
            'uniform vec4 uWear; varying float vWear;\n' +
            sh.fragmentShader.replace(
              '#include <color_fragment>',
              `#include <color_fragment>
            { float rg = floor( vWear + 0.5 ), on = rg < 0.5 ? 0.0 : rg < 1.5 ? uWear.x : rg < 2.5 ? uWear.y : rg < 3.5 ? uWear.z : uWear.w;
              if ( on > 0.5 ) { float lu = dot( diffuseColor.rgb, vec3( 0.3, 0.59, 0.11 ) ); vec3 tg = rg < 1.5 ? vec3( 0.95, 0.34, 0.04 ) : rg < 2.5 ? vec3( 0.12, 0.125, 0.13 ) : rg < 3.5 ? vec3( 0.055, 0.045, 0.04 ) : vec3( 0.62, 0.27, 0.06 );
                diffuseColor.rgb = tg * clamp( 0.5 + lu * 1.8, 0.55, 1.4 ); } }`
            );
        };
        mt.customProgramCacheKey = () => (ck ? ck.call(mt) : '') + '_wear';
        mt.needsUpdate = true;
      }
    });
  }
  function wear(on) {
    WEARING = Object.assign({ eyes: null, ears: null, resp: null, head: null }, on || {});
    WEAR_U.value.set(
      WEARING.body === 'warnjacke' ? 1 : 0,
      WEARING.legs === 'forsthose' ? 1 : 0,
      WEARING.feet === 'forststiefel' ? 1 : 0,
      WEARING.hands === 'forsthand' ? 1 : 0
    );
    for (const F of Object.values(A.figs)) applyGear(F);
    markDirty(true);
  }
  function applyGear(F) {
    const it = gearOf(F);
    if (it)
      for (const [id, g] of Object.entries(it))
        g.visible = WEARING.eyes === id || WEARING.ears === id || WEARING.resp === id || WEARING.head === id;
    if (F.helmU) F.helmU.value = WEARING.head === 'forsthelm' ? 1 : 0;
    applyHead(F);
  }
  // Christoph's cap and earbuds (figHeadwear): the cap stays off under the forest helmet and the ear defenders, the earbuds go with any
  // hearing protection – and otherwise come and go ("manchmal Kopfhörer in den Ohren"): in for a few minutes, out for a few, out while
  // talking with someone
  const HW = { on: true, t: 150, force: null, talk: false };
  function applyHead(F) {
    const h = F && F.hw;
    if (!h) return;
    h.cap.visible = !!FIGS[F.kind].cap && !WEARING.head && WEARING.ears !== 'ohr';
    h.buds.visible = !!FIGS[F.kind].buds && (HW.force ?? (HW.on && !HW.talk)) && !WEARING.ears && !WEARING.head;
  }
  function buds(on) {
    HW.force = on == null ? null : !!on;
    for (const F of Object.values(A.figs)) applyHead(F);
    markDirty(true);
  }
  function budsTick(F, dt) {
    if (!F.hw) return;
    const talk = !!NPCUI.cur(); // talking with a neighbour: the earbuds come out
    if (talk !== !!HW.talk) {
      HW.talk = talk;
      applyHead(F);
      markDirty(true);
    }
    if (HW.force != null || (HW.t -= dt) > 0) return;
    HW.on = !HW.on;
    HW.t = (HW.on ? 150 : 90) + Math.random() * 200;
    applyHead(F);
    markDirty(true);
  }
  // ---- loading ----
  const FL = new THREE.FileLoader();
  FL.setResponseType('json');
  const U = f => BASE + 'chars/' + f;
  const SETS = {}; // clip sets by file: Falko and Christoph share pclips_m
  async function load(kind) {
    if (A.figs[kind]) return A.figs[kind];
    if (A.loading[kind]) return A.loading[kind];
    return (A.loading[kind] = (async () => {
      const fg = FIGS[kind],
        cf = fg && PM[fg.clips],
        file = fg && (PM[fg.file] || (fg.alt && PM[fg.alt]));
      if (!cf || !file) throw new Error('keine Figur ' + kind);
      const set = await (SETS[cf] || (SETS[cf] = FL.loadAsync(U(cf))));
      const gl = await CHL.loadAsync(U(file));
      const F = build(gl, set, { h: set.h || (fg.clips === 'pclips_f' ? 1.68 : 1.8), scale: fg.scale, kind });
      if (fg.cap || fg.buds)
        try {
          F.hw = figHeadwear(THREE, F, fg.hw || {});
        } catch (e) {
          console.warn('headwear', e);
        }
      F.g.visible = false;
      scene.add(F.g);
      fsAdd(F, 1.05, 0.9);
      A.figs[kind] = F;
      try {
        applyGear(F);
      } catch (e) {
        console.warn('gear', e);
      }
      return F;
    })());
  }
  async function setKind(k0) {
    const k = figCode(k0); // m, f, c – or the name (falko, sarah, christoph)
    if (!k) return;
    A.kind = k;
    try {
      SAVE.setRaw('pav-fig', k);
    } catch (e) {}
    if (window.HUD) HUD.refresh();
    if (!PM) return;
    try {
      const F = await load(k);
      if (A.kind !== k) return;
      if (A.fig && A.fig !== F) A.fig.g.visible = false;
      A.fig = F;
      A.ready = true;
      markDirty(true);
      if (window.HUD) {
        HUD.viewChanged();
        HUD.refresh();
      }
    } catch (e) {
      console.warn('Figur', e);
      if (!A.fig) A.failed = true;
      if (window.HUD) HUD.refresh();
    }
  }
  if (PM && !QS.get('nofig'))
    whenLoaded(() =>
      setTimeout(
        () =>
          setKind(A.kind).then(() => {
            if (A.ready) setView3(CAM3.want, true);
          }),
        900
      )
    );
  const figName = k => (FIGS[figCode(k) || A.kind] || FIGS.m).name;
  return Object.assign(A, { setKind, gesture, update, load, canonP, wear, buds, figName });
})();
LATE.AVATAR = AVATAR;
window.AVATAR = AVATAR;
