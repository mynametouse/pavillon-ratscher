// ===================== feat/zombie: gore of the zombie night – blood that sprays and pools, pieces that fly, a muzzle flash (ZFX) =====================
// Falko, 4.11.2026: „Es kann Resident Evil-artig auch brutal sein.“ Cheap on purpose: one instanced mesh for all drops of blood (they fly,
// fall, and leave a stain where they land), one for all stains on the ground and the floors (a ring: the oldest goes first), a few pieces
// (a forearm, a head, a lower leg: a capsule in skin colour with a red end) that tumble and lie, a flash at the muzzle. Built when the
// zombie night starts (zombie/z_modus.js calls build), freed when it ends; materials of the kind the scene already has (core/assets.js
// plain), so no unusual shader programs.
import * as THREE from 'three';
import { scene, V } from '../core/head.js';
import { markDirty, plain } from '../core/assets.js';
import { KERN } from '../core/kern.js';
import { floorAt } from '../game/walkable.js';
export const ZFX = (() => {
  const S = { built: false, drops: [], stains: 0, gibs: [], flashM: null, flashT: 0, g: null };
  const ND = 260,
    NS = 180;
  let dropIM = null,
    stainIM = null,
    M = null;
  const _m = new THREE.Matrix4(),
    _q = new THREE.Quaternion(),
    _e = new THREE.Euler(),
    _s = new THREE.Vector3(),
    _p = new THREE.Vector3(),
    UP = new THREE.Vector3(0, 1, 0);
  function build() {
    if (S.built) return;
    S.built = true;
    M = {
      blood: plain({ color: 0x6a0707, roughness: 0.35 }),
      stain: plain({ color: 0x400404, roughness: 0.18, transparent: true, opacity: 0.88, depthWrite: false }),
      skin: plain({ color: 0x8f8a74, roughness: 0.8 }),
      flesh: plain({ color: 0x7a1010, roughness: 0.5 }),
      cloth: plain({ color: 0x3b3a36, roughness: 0.95 }),
      flash: new THREE.MeshBasicMaterial({
        color: 0xffd08a,
        transparent: true,
        opacity: 0,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
      }),
    };
    M.stain.polygonOffset = true;
    M.stain.polygonOffsetFactor = -4;
    M.stain.polygonOffsetUnits = -4;
    S.g = new THREE.Group();
    S.g.userData.noMerge = true;
    scene.add(S.g);
    dropIM = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(0.028, 0), M.blood, ND);
    dropIM.count = 0;
    dropIM.frustumCulled = false;
    dropIM.castShadow = false;
    const sg = new THREE.CircleGeometry(1, 14);
    sg.rotateX(-Math.PI / 2);
    // a ragged edge: every other rim vertex a little in or out
    const p = sg.attributes.position;
    for (let i = 1; i < p.count; i++) {
      const k = 0.78 + ((i * 7919) % 13) / 30;
      p.setX(i, p.getX(i) * k);
      p.setZ(i, p.getZ(i) * k);
    }
    stainIM = new THREE.InstancedMesh(sg, M.stain, NS);
    stainIM.count = 0;
    stainIM.frustumCulled = false;
    stainIM.receiveShadow = true;
    stainIM.renderOrder = 2;
    const fl = new THREE.Mesh(new THREE.SphereGeometry(0.18, 8, 6), M.flash);
    fl.visible = false;
    S.flashM = fl;
    S.g.add(dropIM, stainIM, fl);
    S.GEO = {
      arm: new THREE.CapsuleGeometry(0.045, 0.3, 3, 8),
      leg: new THREE.CapsuleGeometry(0.06, 0.38, 3, 8),
      head: new THREE.SphereGeometry(0.11, 10, 8),
      cap: new THREE.CircleGeometry(0.05, 8),
      chunk: new THREE.DodecahedronGeometry(0.05, 0),
    };
  }
  function dispose() {
    if (!S.built) return;
    S.built = false;
    scene.remove(S.g);
    S.g.traverse(o => {
      if (o.geometry) o.geometry.dispose();
    });
    for (const k in S.GEO) S.GEO[k].dispose();
    for (const k in M) M[k].dispose();
    S.drops.length = 0;
    S.gibs.length = 0;
    S.stains = 0;
    dropIM = stainIM = null;
    markDirty(true);
  }
  // ---- blood: n drops from (x, y, z) towards the direction (dx, dy) with speed v (a fan), k = how much ----
  function spray(x, y, z, dx = 0, dy = 0, n = 14, v = 2.4, up = 1.6) {
    if (!S.built) return;
    const L = Math.hypot(dx, dy) || 1;
    for (let i = 0; i < n; i++) {
      if (S.drops.length >= ND) S.drops.shift();
      const a = (Math.random() - 0.5) * 1.6,
        s = v * (0.35 + Math.random() * 0.9),
        c = Math.cos(a),
        si = Math.sin(a),
        ux = dx / L,
        uy = dy / L;
      S.drops.push({
        x,
        y,
        z,
        vx: (ux * c - uy * si) * s + (Math.random() - 0.5) * 0.6,
        vy: (ux * si + uy * c) * s + (Math.random() - 0.5) * 0.6,
        vz: up * (0.3 + Math.random()),
        s: 0.6 + Math.random() * 1.2,
        life: 2.2,
        floor: null,
      });
    }
  }
  // a fountain: the neck or a stump spurting for t seconds (the next frames spray a little each)
  const FOUNTS = [];
  function fountain(get, t = 1.6, k = 1) {
    if (S.built) FOUNTS.push({ get, t, k, acc: 0 });
  }
  // ---- a stain on the floor at (x, y), radius r (the floor height from the walk surfaces: also indoors) ----
  function stain(x, y, r = 0.4, z) {
    if (!S.built) return;
    const fz = z ?? KERN.ground(x, y);
    const i = S.stains % NS;
    S.stains++;
    _e.set(0, Math.random() * Math.PI * 2, 0);
    _q.setFromEuler(_e);
    const sx = r * (0.7 + Math.random() * 0.6),
      sz = r * (0.7 + Math.random() * 0.6);
    _m.compose(_p.copy(V(x, y, fz + 0.012 + (i % 7) * 0.0015)), _q, _s.set(sx, 1, sz));
    stainIM.setMatrixAt(i, _m);
    stainIM.count = Math.min(NS, S.stains);
    stainIM.instanceMatrix.needsUpdate = true;
    markDirty();
  }
  // ---- a piece of a body: kind 'arm' | 'leg' | 'head', thrown from (x, y, z) with velocity (vx, vy, vz) ----
  function gib(kind, x, y, z, vx, vy, vz, skin) {
    if (!S.built) return null;
    if (S.gibs.length > 14) {
      const o = S.gibs.shift();
      S.g.remove(o.m);
    }
    const g = new THREE.Group(),
      geo = S.GEO[kind] || S.GEO.chunk,
      body = new THREE.Mesh(geo, skin || M.skin);
    body.castShadow = true;
    g.add(body);
    if (kind === 'head') {
      const hair = new THREE.Mesh(S.GEO.head, M.cloth);
      hair.scale.set(1.04, 0.62, 1.04);
      hair.position.y = 0.045;
      g.add(hair);
    }
    const cap = new THREE.Mesh(S.GEO.cap, M.flesh);
    const len = kind === 'leg' ? 0.25 : kind === 'arm' ? 0.2 : 0.1;
    cap.position.y = -len;
    cap.rotation.x = Math.PI / 2;
    g.add(cap);
    if (kind === 'leg' || kind === 'arm') {
      const cl = new THREE.Mesh(geo, M.cloth);
      cl.scale.set(1.12, 0.55, 1.12);
      cl.position.y = len * 0.35;
      g.add(cl);
    }
    g.position.copy(V(x, y, z));
    g.rotation.set(Math.random() * 3, Math.random() * 3, Math.random() * 3);
    S.g.add(g);
    const o = {
      m: g,
      vx,
      vy,
      vz,
      wx: (Math.random() - 0.5) * 14,
      wy: (Math.random() - 0.5) * 14,
      rest: false,
      t: 0,
      kind,
      x,
      y,
      z,
    };
    S.gibs.push(o);
    fountain(() => [o.x, o.y, o.z], 0.9, 0.5);
    return o;
  }
  // ---- the muzzle flash ----
  function flash(x, y, z) {
    if (!S.built) return;
    S.flashM.position.copy(V(x, y, z));
    S.flashM.visible = true;
    S.flashT = 0.07;
    M.flash.opacity = 1;
    markDirty();
  }
  // ---- per frame ----
  const G = 9.81;
  function tick(dt) {
    if (!S.built) return;
    dt = Math.min(dt, 0.05);
    let moved = false;
    for (let i = FOUNTS.length - 1; i >= 0; i--) {
      const f = FOUNTS[i];
      f.t -= dt;
      f.acc += dt;
      if (f.acc > 0.05) {
        f.acc = 0;
        const p = f.get();
        if (p)
          spray(p[0], p[1], p[2], Math.random() - 0.5, Math.random() - 0.5, Math.ceil(3 * f.k), 1.1 * f.k, 2.2 * f.k);
      }
      if (f.t <= 0) FOUNTS.splice(i, 1);
    }
    if (S.drops.length) {
      let n = 0;
      for (let i = S.drops.length - 1; i >= 0; i--) {
        const d = S.drops[i];
        d.life -= dt;
        d.vz -= G * dt;
        d.x += d.vx * dt;
        d.y += d.vy * dt;
        d.z += d.vz * dt;
        if (d.floor === null) d.floor = floorAt(d.x, d.y, d.z + 0.2);
        if (d.z <= d.floor || d.life <= 0) {
          if (Math.random() < 0.3) stain(d.x, d.y, 0.06 + Math.random() * 0.12, d.floor);
          S.drops.splice(i, 1);
          continue;
        }
      }
      for (const d of S.drops) {
        _m.compose(_p.copy(V(d.x, d.y, d.z)), _q.identity(), _s.setScalar(d.s));
        dropIM.setMatrixAt(n++, _m);
      }
      dropIM.count = n;
      dropIM.instanceMatrix.needsUpdate = true;
      moved = true;
    } else if (dropIM.count) {
      dropIM.count = 0;
      moved = true;
    }
    for (const o of S.gibs) {
      if (o.rest) continue;
      o.t += dt;
      o.vz -= G * dt;
      o.x += o.vx * dt;
      o.y += o.vy * dt;
      o.z += o.vz * dt;
      const fz = floorAt(o.x, o.y, o.z + 0.3) + 0.05;
      if (o.z <= fz) {
        o.z = fz;
        if (Math.abs(o.vz) > 1.2) {
          o.vz *= -0.3;
          o.vx *= 0.5;
          o.vy *= 0.5;
          stain(o.x, o.y, 0.18, fz - 0.05);
        } else {
          o.rest = true;
          stain(o.x, o.y, 0.3, fz - 0.05);
          o.m.rotation.x = Math.PI / 2;
          o.m.rotation.z = Math.random() * 6;
        }
      }
      const p = [o.x, o.y];
      KERN.pushOut(p, 0.08);
      o.x = p[0];
      o.y = p[1];
      o.m.position.copy(V(o.x, o.y, o.z));
      if (!o.rest) {
        o.m.rotation.x += o.wx * dt;
        o.m.rotation.y += o.wy * dt;
      }
      moved = true;
    }
    if (S.flashT > 0) {
      S.flashT -= dt;
      M.flash.opacity = Math.max(0, S.flashT / 0.07);
      if (S.flashT <= 0) S.flashM.visible = false;
      moved = true;
    }
    if (moved) markDirty();
  }
  // the morning cleans nothing – but leaving the zombie night does
  function clear() {
    if (!S.built) return;
    S.drops.length = 0;
    for (const o of S.gibs) S.g.remove(o.m);
    S.gibs.length = 0;
    S.stains = 0;
    stainIM.count = 0;
    dropIM.count = 0;
    markDirty(true);
  }
  Object.assign(S, { build, dispose, spray, fountain, stain, gib, flash, tick, clear, mats: () => M });
  return S;
})();
window.ZFX = ZFX;
