// ===================== feat/zombie-werk: the molotov – thrown with F, it flies, shatters and burns; zombies catch fire (ZMOLO) =====================
// Falko 5.11.2026: „Molotow aus Benzin“ (zombie/z_werk.js builds it at a workbench: a bottle, a litre of petrol, a rag). F (on touch screens
// 🔥) throws one: in first person the left hand takes the bottle from the belt, the rag catches, the arm winds back and throws (a clip of
// zombie/z_fp.js, the bottle a thing in the hand of the clip); the bottle flies on an arc, tumbling, the rag burning, and shatters on the
// ground, a wall or a zombie: glass, the whoomp of the petrol, a fire of ~3 m that burns ~8 s. Zombies in it take damage over time and catch
// fire: a flame on the figure, they lurch and burn on (and set the next one alight) until they fall. The fire lights the night with one of
// the shared point lights (KERN.lights.borrow – never a new light), crackles (the stove's recording, audio 'amb_stove') and is loud for the
// horde (Z.noise). It burns the player too. With two players the fire is sent over the room (zombie/z_netz.js event 'feuer'): the other sees
// and hears it and his zombies burn in it – the damage comes from the one who threw.
// Cheap: all flames of the world are one geometry with two layers (two draw calls): tongues of a lathe shape, rewritten each frame from a
// small list (fires, burning zombies, the bottle's rag), plain emissive materials with additive blending (the program of the scene's other
// transparent plain materials); the bottle in the hand and its flame live in the hands' overlay (game/play.js HELD). Built when the player
// first has a molotov; freed when the zombie night ends.
import * as THREE from 'three';
import { cam, COARSE, R as REN, scene } from '../core/head.js';
import { markDirty, plain } from '../core/assets.js';
import { KERN } from '../core/kern.js';
import { collide, floorAt, P } from '../game/walkable.js';
import { CAM3 } from '../game/player.js';
import { AVATAR } from '../game/avatar.js';
import { HELD, PLAY } from '../game/play.js';
import { HUD } from '../game/hud.js';
import { audio } from '../audio/audio.js';
import { VEH } from '../vehicles/vehicle.js';
import { Z } from './z_state.js';
import { ZTON } from './z_ton.js';
import { ZHORDE } from './z_horde.js';
import { ZHAUS } from './z_haus.js';
import { ZWMOD } from './z_waffe_mod.js';
import { ZWAFFE } from './z_waffe.js';
import { ZFP } from './z_fp.js';
import { ZHUD } from './z_hud.js';
import { ZNETZ } from './z_netz.js';
import { ZWERK } from './z_werk.js';
export const ZMOLO = (() => {
  // the numbers: the fire's radius (m), how long it burns (s), damage per second in it and while burning, how long a zombie burns, the
  // player's harm in it; the throw (m/s forward and up), the light
  const FIRE = {
    r: 1.5,
    life: 8,
    dps: 16,
    burn: 6,
    bdps: 9,
    hurt: 14,
    spread: 0.16,
    light: 30,
    lightD: 15,
    helmK: 0.35,
  };
  const THROW = { v: 12.5, up: 3.2, dur: 1.25, rel: 0.84, relTP: 0.4, cd: 1.5 };
  const S = {
    built: false,
    warmed: false,
    cd: 0,
    thr: null, // the throw under way
    bottles: [], // in flight
    fires: [], // burning
    burn: new Map(), // zombie → { t, net }
    acc: 0,
    stats: { thrown: 0, fires: 0, burnt: 0, kills: 0, lit: 0 },
  };
  let G = null; // the built things: materials, geometries, the flame fields, the bottles
  // ---- the bottle: green glass, a rag in the neck; its axis +y from the bottom, the neck (where the hand holds it) at y 0.235 ----
  const NECK = 0.235,
    RAG = 0.355;
  function bottleModel(M) {
    const g = new THREE.Group(),
      K = ZWMOD.kit();
    K.add(M.glass, new THREE.CylinderGeometry(0.034, 0.034, 0.2, 14), 0, 0.1, 0);
    K.add(M.glass, new THREE.CylinderGeometry(0.0135, 0.034, 0.05, 14), 0, 0.225, 0);
    K.add(M.glass, new THREE.CylinderGeometry(0.0135, 0.0135, 0.06, 12), 0, 0.28, 0);
    K.add(M.glass, new THREE.TorusGeometry(0.0138, 0.003, 6, 14), 0, 0.31, 0, Math.PI / 2);
    // the rag: knotted round the neck, a twisted end out of the mouth
    K.add(M.rag, new THREE.TorusGeometry(0.0155, 0.0045, 6, 12), 0, 0.27, 0, Math.PI / 2);
    K.add(M.rag, new THREE.CylinderGeometry(0.006, 0.0115, 0.07, 7), 0.004, 0.335, 0, 0, 0, -0.18);
    K.add(M.rag, new THREE.CylinderGeometry(0.004, 0.009, 0.06, 6), 0.012, 0.25, 0.02, 0.3, 0, 0.35);
    K.build(g);
    return g;
  }
  // ---- flames: a tongue (lathe, radius 0.5 at the widest, height 1), many in one geometry, two layers (outer red-orange, inner yellow) ----
  const PROFILE = [
    [0, 0],
    [0.3, 0.05],
    [0.45, 0.16],
    [0.47, 0.3],
    [0.41, 0.46],
    [0.3, 0.62],
    [0.18, 0.78],
    [0.07, 0.92],
    [0, 1],
  ];
  function field(cap, mats) {
    const t = new THREE.LatheGeometry(
      PROFILE.map(([r, y]) => new THREE.Vector2(r, y)),
      8
    );
    const tp = t.attributes.position.array,
      tn = t.attributes.normal.array,
      ti = t.index.array,
      n = tp.length / 3,
      m = ti.length;
    t.dispose();
    const pos = new Float32Array(cap * 2 * n * 3),
      nor = new Float32Array(cap * 2 * n * 3),
      idx = new Uint32Array(cap * 2 * m);
    for (let k = 0; k < cap * 2; k++) {
      nor.set(tn, k * n * 3);
      for (let j = 0; j < m; j++) idx[k * m + j] = ti[j] + k * n;
    }
    const geo = new THREE.BufferGeometry();
    const pa = new THREE.BufferAttribute(pos, 3);
    pa.setUsage(THREE.DynamicDrawUsage);
    geo.setAttribute('position', pa);
    geo.setAttribute('normal', new THREE.BufferAttribute(nor, 3));
    geo.setIndex(new THREE.BufferAttribute(idx, 1));
    geo.addGroup(0, 0, 0);
    geo.addGroup(cap * m, 0, 1);
    geo.boundingSphere = new THREE.Sphere(new THREE.Vector3(), 1e5);
    const mesh = new THREE.Mesh(geo, [mats.outer, mats.inner]);
    mesh.frustumCulled = false;
    mesh.castShadow = mesh.receiveShadow = false;
    mesh.renderOrder = 3;
    mesh.userData.noMerge = true;
    return { mesh, geo, pa, tp, n, m, cap, list: [] };
  }
  // write the tongues of the list (three coordinates, y up): { x, y, z, h, w, ph, k (0..1 size) }
  function writeField(F, time) {
    const L = F.list,
      cnt = Math.min(F.cap, L.length),
      a = F.pa.array,
      tp = F.tp,
      n = F.n;
    for (let i = 0; i < cnt; i++) {
      const f = L[i],
        k = f.k ?? 1,
        ph = f.ph,
        sy =
          f.h *
          k *
          (0.76 +
            0.14 * Math.sin(time * 11 + ph) +
            0.08 * Math.sin(time * 27.3 + ph * 2.1) +
            0.07 * Math.sin(time * 43 + ph * 3.3)),
        sx = f.w * Math.sqrt(k) * (0.92 + 0.08 * Math.sin(time * 14.1 + ph * 1.7)),
        lx = 0.13 * Math.sin(time * 4.3 + ph) + (f.lx || 0),
        lz = 0.11 * Math.sin(time * 3.7 + ph * 1.3) + (f.lz || 0),
        wa = 0.32 * sx;
      for (let layer = 0; layer < 2; layer++) {
        const ws = layer ? 0.5 : 1,
          hs = layer ? 0.66 : 1,
          o = ((layer ? F.cap : 0) + i) * n * 3;
        for (let v = 0; v < n; v++) {
          const tx = tp[v * 3],
            ty = tp[v * 3 + 1],
            tz = tp[v * 3 + 2],
            yy = ty * sy * hs,
            // the wave that runs up the tongue: the tip licks to and fro
            wv = ty * ty * wa;
          a[o + v * 3] = f.x + tx * sx * ws + lx * yy + Math.sin(time * 9.3 - ty * 5 + ph * 1.9) * wv;
          a[o + v * 3 + 1] = f.y + yy;
          a[o + v * 3 + 2] = f.z + tz * sx * ws + lz * yy + Math.cos(time * 7.9 - ty * 4.4 + ph * 2.7) * wv;
        }
      }
    }
    F.geo.groups[0].count = cnt * F.m;
    F.geo.groups[1].count = cnt * F.m;
    F.pa.needsUpdate = true;
    F.mesh.visible = cnt > 0;
  }
  function build() {
    if (G) return G;
    const M = ZWMOD.mats();
    // flames: plain, emissive only, additive (front faces – the program of the other transparent plain materials; the hands' overlay:
    // double-sided like its muzzle flash, zombie/z_fp.js)
    const fl = (c, i, o, side) =>
      plain({
        color: 0x000000,
        emissive: c,
        emissiveIntensity: i,
        roughness: 1,
        transparent: true,
        opacity: o,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        side,
      });
    G = {
      M: {
        glass: plain({ color: 0x2e5a2a, roughness: 0.12, metalness: 0.1 }),
        rag: plain({ color: 0xcfc4a6, roughness: 0.95 }),
        outer: fl(0xff3c08, 1.15, 0.45, THREE.FrontSide),
        inner: fl(0xff9a2e, 1.05, 0.5, THREE.FrontSide),
        hOuter: fl(0xff4608, 2.0, 0.6, THREE.DoubleSide),
        hInner: fl(0xffa232, 2.0, 0.7, THREE.DoubleSide),
      },
    };
    G.world = field(96, { outer: G.M.outer, inner: G.M.inner });
    scene.add(G.world.mesh);
    G.held = field(2, { outer: G.M.hOuter, inner: G.M.hInner });
    HELD.scene.add(G.held.mesh);
    G.hand = bottleModel(G.M);
    G.hand.visible = false;
    G.hand.traverse(o => {
      if (o.isMesh) o.frustumCulled = false;
    });
    G.pool = [];
    S.built = true;
    return G;
  }
  // the shaders of the flames and the bottle compiled once, before the first throw: drawn for two frames as specks at the camera, in the
  // world and in the hands' overlay (renderer.compile would build them for another tone mapping and colour space than the composer's)
  function warm(again) {
    if ((S.warmed && !again) || !Z.on) return;
    S.warmed = true;
    try {
      build();
      S.warmF = 3;
      markDirty();
    } catch (e) {
      console.warn('zmolo warm', e);
    }
  }
  function warmTick() {
    const g = G;
    if (!g || !(S.warmF > 0)) return;
    S.warmF--;
    const on = S.warmF > 0,
      c = cam.position;
    if (on) {
      const speck = { x: c.x, y: c.y - 0.3, z: c.z, h: 0.0005, w: 0.0005, ph: 0 };
      g.world.list.push(speck);
      writeField(g.world, 0);
      if (!S.thr) {
        g.held.list.length = 0;
        g.held.list.push(speck);
        writeField(g.held, 0);
      }
    } else if (!S.thr) {
      g.held.list.length = 0;
      writeField(g.held, 0);
    }
    // the bottle: a speck under the camera in the overlay and in the world
    if (!S.thr) {
      if (on && !g.hand.parent) HELD.scene.add(g.hand);
      if (g.hand.parent === HELD.scene) {
        g.hand.visible = on;
        g.hand.position.set(c.x, c.y - 0.3, c.z);
        g.hand.scale.setScalar(on ? 0.001 : 1);
        if (!on) HELD.scene.remove(g.hand);
      }
    }
    const b = g.pool[0] || flyer();
    if (!b.userData.busy) {
      b.visible = on;
      b.position.set(c.x, c.y - 0.3, c.z);
      b.scale.setScalar(on ? 0.001 : 1);
    }
    markDirty();
  }
  // a bottle for the world (thrown): from a small pool
  function flyer() {
    const g = build();
    let b = g.pool.find(q => !q.userData.busy);
    if (!b) {
      b = bottleModel(g.M);
      b.userData.noMerge = true;
      b.traverse(o => {
        if (o.isMesh) o.castShadow = true;
      });
      scene.add(b);
      g.pool.push(b);
    }
    b.visible = false;
    return b;
  }
  // ---- sounds ----
  const band = (x, y, o) => ZWERK.band(x, y, o),
    tone = (x, y, o) => ZWERK.tone(x, y, o);
  // the recordings of zombie/z_werk.js (werk.json: 'zuenden' a flare catching, 'glas' a bottle breaking, 'feuer' the petrol's whoosh), else
  // synthesised
  function sndLight(x, y) {
    if (ZWERK.rec('zuenden', x, y, { ref: 5 })) return;
    band(x, y, { f: 300, f1: 1800, q: 0.7, vol: 0.22, a: 0.03, d: 0.35, type: 'lowpass', ref: 5 });
  }
  function sndShatter(x, y) {
    if (!ZWERK.rec('glas', x, y, { ref: 14, wet: 0.25 })) {
      for (let i = 0; i < 6; i++)
        band(x, y, {
          f: 3800 + Math.random() * 4200,
          q: 5,
          vol: 0.5,
          a: 0.002,
          d: 0.05 + Math.random() * 0.08,
          at: i * 0.025,
          ref: 14,
        });
      for (let i = 0; i < 7; i++)
        tone(x, y, {
          f: 2600 + Math.random() * 4800,
          vol: 0.06,
          d: 0.15 + Math.random() * 0.35,
          at: 0.04 + Math.random() * 0.4,
          ref: 12,
        });
    }
    // the petrol catches: a low whoomp rising
    if (ZWERK.rec('feuer', x, y, { ref: 20, at: 0.06, wet: 0.35 })) return;
    band(x, y, { f: 140, f1: 2200, q: 0.6, vol: 0.9, a: 0.06, d: 0.75, type: 'lowpass', at: 0.05, ref: 20 });
    band(x, y, { f: 90, f1: 400, q: 0.8, vol: 0.6, a: 0.02, d: 0.5, type: 'lowpass', at: 0.04, ref: 24 });
  }
  function sndCrackle(x, y, k = 1) {
    band(x, y, { f: 1400 + Math.random() * 2600, q: 3, vol: 0.18 * k, a: 0.001, d: 0.03, ref: 10 });
  }
  // ---- throwing ----
  const can = () =>
    Z.on &&
    Z.hp > 0 &&
    P.mode === 'walk' &&
    !(VEH && VEH.cur) &&
    !PLAY.seat &&
    !HUD.open &&
    !(ZHAUS && ZHAUS.busy) &&
    !(ZWERK && ZWERK.open);
  // the left hand's way (zombie/z_fp.js FIST, camera space): from the belt up into view, the rag lit, wound back beside the head, thrown
  Object.assign(ZFP.FIST, {
    Zmolo: { p: [-0.15, -0.15, -0.37], y: [0.25, 0.95, 0.15], z: [-0.25, -0.35, 0.9] },
    Zwind: { p: [-0.25, 0.05, 0.0], y: [0.1, 0.45, 0.89], z: [-0.35, -0.85, 0.2] },
    Zthrow: { p: [-0.06, -0.07, -0.5], y: [0.05, 0.45, -0.9], z: [-0.15, -0.55, 0.82] },
  });
  ZFP.reset();
  const hp0 = new THREE.Vector3(),
    _v = new THREE.Vector3();
  S.handAt = new THREE.Vector3();
  S.handQ = new THREE.Quaternion();
  function clip() {
    const id = ZWAFFE.cur(),
      fist = id === 'faust',
      onW = !fist && ZWMOD.HANDS[id] && ZWMOD.HANDS[id].L ? 1 : 0,
      rest = fist ? 'L' : 'Llow',
      d = THROW.dur;
    return {
      kind: 'throw',
      free: true,
      dur: d,
      // the weapon in the right hand dips a little while the left throws
      w: [
        [0, 0, 0, 0, 0, 0, 0],
        [0.25, 0.02, -0.07, 0.03, -0.12, 0, 0],
        [1.0, 0.02, -0.07, 0.03, -0.12, 0, 0],
        [d, 0, 0, 0, 0, 0, 0],
      ],
      L: [
        [0, onW, rest],
        [0.16, 0, 'Lpocket'],
        [0.36, 0, 'Zmolo'],
        [0.6, 0, 'Zmolo'],
        [0.74, 0, 'Zwind'],
        [0.86, 0, 'Zthrow'],
        [0.98, 0, 'Zthrow'],
        [d, onW, rest],
      ],
      prop: heldProp,
    };
  }
  // the bottle in the left hand while the clip runs (zombie/z_fp.js calls this each frame with the hands' frames, camera space)
  function heldProp(hP, hQ, ct, rig) {
    const g = G,
      T = S.thr;
    if (!g || !T) return;
    if (g.hand.parent !== rig) rig.add(g.hand);
    const show = ct > 0.15 && !T.released;
    g.hand.visible = show;
    if (!show) {
      g.held.list.length = 0;
      writeField(g.held, 0);
      return;
    }
    g.hand.scale.setScalar(1);
    g.hand.quaternion.copy(hQ.L);
    g.hand.position.copy(hP.L).add(_v.set(0, -NECK, 0).applyQuaternion(hQ.L));
    // the rag's tip in the world, the flame on it (the overlay is drawn in world coordinates by the camera)
    rig.updateMatrixWorld(true);
    g.hand.updateMatrixWorld(true);
    hp0.set(0.006, RAG, 0).applyMatrix4(g.hand.matrixWorld);
    S.ragAt = hp0;
    T.seen = true;
    // where the bottle is in the world – the thrown one goes on from there, turned the same way
    g.hand.getWorldPosition(S.handAt);
    g.hand.getWorldQuaternion(S.handQ);
    g.held.list.length = 0;
    if (T.lit) {
      const k = Math.min(1, (T.t - T.litT) / 0.25);
      g.held.list.push({ x: hp0.x, y: hp0.y - 0.015, z: hp0.z, h: 0.14, w: 0.055, ph: 1.3, k: 0.4 + 0.6 * k });
    }
    writeField(g.held, performance.now() / 1000);
  }
  function throwIt() {
    if (!can() || S.cd > 0 || S.thr) return false;
    if (!Z.has('molotow')) {
      PLAY.think('Kein Molotow im Rucksack – an einer Werkbank bauen: Flasche, Benzin, Lappen.', 2400);
      return false;
    }
    build();
    warm();
    ZWERK.recLoad();
    Z.use('molotow', 1);
    S.cd = THROW.cd;
    const fp = !!(ZFP.shown && ZFP.play);
    S.thr = { t: 0, rel: fp ? THROW.rel : THROW.relTP, fp, lit: false, litT: 0, released: false };
    if (fp) {
      S.thr.clip = clip();
      ZFP.play(S.thr.clip);
    } else if (CAM3.on && AVATAR.ready) AVATAR.gesture('chop', 1.3);
    Z.emit('molotow', { left: Z.sup.molotow || 0 });
    return true;
  }
  // the bottle leaves the hand: from the hand (first person) or the figure's shoulder, along the view, a little up
  function release() {
    const T = S.thr;
    if (!T || T.released) return;
    T.released = true;
    const yaw = (P.yaw * Math.PI) / 180,
      pitch = (Math.max(-30, Math.min(55, P.pitch)) * Math.PI) / 180,
      fx = Math.sin(yaw) * Math.cos(pitch),
      fy = Math.cos(yaw) * Math.cos(pitch),
      fz = Math.sin(pitch);
    let x, y, z;
    const q0 = new THREE.Quaternion();
    if (T.fp && T.seen) {
      // from the hand's bottle (three → site: x, z, −y)
      x = S.handAt.x;
      y = -S.handAt.z;
      z = S.handAt.y;
      q0.copy(S.handQ);
    } else if (T.tb) {
      // third person: from the figure's hand
      x = T.tb.position.x;
      y = -T.tb.position.z;
      z = T.tb.position.y;
      q0.copy(T.tb.quaternion);
    } else {
      x = P.x + Math.sin(yaw) * 0.35 + Math.cos(yaw) * -0.2;
      y = P.y + Math.cos(yaw) * 0.35 - Math.sin(yaw) * -0.2;
      z = P.feet + (P.eyeH || 1.6) + 0.05;
    }
    // not out of a wall: start where the walker stands if the hand is beyond one
    const q = [x, y];
    collide(q, z - 0.3, true);
    if (Math.hypot(q[0] - x, q[1] - y) > 1e-4) {
      x = P.x;
      y = P.y;
    }
    const b = T.tb || flyer();
    b.userData.busy = true;
    b.visible = true;
    b.scale.setScalar(1);
    const B = {
      g: b,
      x,
      y,
      z,
      vx: fx * THROW.v + (P.mvx || 0) * 0.5,
      vy: fy * THROW.v + (P.mvy || 0) * 0.5,
      vz: fz * THROW.v + THROW.up,
      t: 0,
      // the bottle tumbles end over end about its own x, a little about z
      spin: [-(7 + Math.random() * 4), (Math.random() - 0.5) * 3],
      q0,
      ph: Math.random() * 6,
    };
    // in third person: the neck forward and up along the throw
    if (!(T.fp && T.seen) && !T.tb) q0.setFromUnitVectors(_up.set(0, 1, 0), _v.set(fx, fz + 0.4, -fy).normalize());
    S.bottles.push(B);
    S.stats.thrown++;
    ZTON.swing(P.x, P.y, 'beil');
    place(B);
  }
  const _up = new THREE.Vector3(),
    _e = new THREE.Euler(),
    _q2 = new THREE.Quaternion();
  function place(B) {
    const b = B.g;
    // turned about its middle (0.15 m up the bottle), not about its bottom
    _q2.setFromEuler(_e.set(B.t * B.spin[0], 0, B.t * B.spin[1]));
    b.quaternion.copy(B.q0).multiply(_q2);
    _v.set(0, 0.15, 0)
      .applyQuaternion(B.q0)
      .sub(_up.set(0, 0.15, 0).applyQuaternion(b.quaternion));
    b.position.set(B.x + _v.x, B.z + _v.y, -B.y + _v.z);
    b.updateMatrixWorld(true);
  }
  // ---- the flight: gravity, small steps; the ground, a wall (the walls and boxes the walker collides with), a zombie ----
  function fly(B, dt) {
    const h = 0.02,
      N = Math.max(1, Math.ceil(dt / h)),
      s = dt / N;
    for (let i = 0; i < N; i++) {
      const x0 = B.x,
        y0 = B.y,
        z0 = B.z;
      B.vz -= 9.81 * s;
      B.x += B.vx * s;
      B.y += B.vy * s;
      B.z += B.vz * s;
      B.t += s;
      // a zombie in the way: it breaks on him (and he burns at once)
      for (const e of Z.ents) {
        if (e.kind !== 'zombie' || e.dead || e.fly) continue;
        const top = e.z + (e.crawl ? 0.6 : 1.85);
        if (B.z < e.z + 0.1 || B.z > top) continue;
        if (Math.hypot(e.x - B.x, e.y - B.y) < 0.42) return { x: B.x, y: B.y, z: B.z, e };
      }
      // a wall or a box (a cupboard, a fence) at the bottle's height
      const q = [B.x, B.y];
      collide(q, B.z - 0.3, true);
      if (Math.hypot(q[0] - B.x, q[1] - B.y) > 1e-4) return { x: x0, y: y0, z: z0 };
      // a house left through its wall
      const H = ZHAUS && ZHAUS.H;
      if (H && H.inside(x0, y0, z0) && !H.inside(B.x, B.y, B.z)) return { x: x0, y: y0, z: z0 };
      // the ground (or a floor, a table, a roof)
      const fz = floorAt(B.x, B.y, B.z + 0.02);
      if (B.z <= fz + 0.03) return { x: B.x, y: B.y, z: fz };
      if (B.t > 4 || B.z < -50) return { x: B.x, y: B.y, z: floorAt(B.x, B.y, B.z + 0.5) };
    }
    return null;
  }
  function shatter(B, at) {
    B.g.visible = false;
    B.g.userData.busy = false;
    const z = at.e ? at.e.z : floorAt(at.x, at.y, at.z + 0.3);
    fire(at.x, at.y, z, false);
    if (at.e) ignite(at.e, false);
    // the other player sees and hears it too (zombie/z_netz.js passes on what it does not know itself)
    if (ZNETZ && ZNETZ.on && ZNETZ.T)
      try {
        ZNETZ.T.send('ev', { k: 'feuer', x: +at.x.toFixed(2), y: +at.y.toFixed(2), z: +z.toFixed(2) });
      } catch (e) {
        console.warn('zmolo net', e);
      }
  }
  // ---- the fire: a pool of burning petrol ----
  let FID = 0;
  function fire(x, y, z, net) {
    build();
    // at most two at once: the oldest goes out
    if (S.fires.length >= 2) end(S.fires[0]);
    const f = {
      id: ++FID,
      x,
      y,
      z,
      t: 0,
      net: !!net,
      tick: 0,
      noiseT: 0,
      crackT: 0,
      hurtSaid: false,
      tongues: [],
      slot: -1,
    };
    // the tongues: one in the middle, two rings, a little at random (three coordinates)
    const ring = (n, r, h, w) => {
      for (let i = 0; i < n; i++) {
        const a = (i / n) * Math.PI * 2 + Math.random() * 0.8,
          rr = r * (0.75 + Math.random() * 0.4);
        f.tongues.push({
          dx: Math.cos(a) * rr,
          dy: Math.sin(a) * rr,
          h: h * (0.8 + Math.random() * 0.4),
          w,
          ph: Math.random() * 9,
        });
      }
    };
    // a pool of burning petrol: wide tongues that overlap into one sheet, tall in the middle, low and licking at the rim
    f.tongues.push({ dx: 0, dy: 0, h: 1.8, w: 0.75, ph: Math.random() * 9 });
    f.tongues.push({ dx: 0.25, dy: -0.15, h: 1.4, w: 0.6, ph: Math.random() * 9 });
    f.tongues.push({ dx: -0.2, dy: 0.22, h: 1.3, w: 0.6, ph: Math.random() * 9 });
    ring(6, 0.6, 1.1, 0.6);
    ring(8, 1.05, 0.75, 0.52);
    ring(8, 1.4, 0.42, 0.44);
    // which light slot (two borrowers below)
    const used = new Set(S.fires.map(q => q.slot));
    f.slot = [0, 1].find(i => !used.has(i)) ?? 0;
    S.fires.push(f);
    S.stats.fires++;
    sndShatter(x, y);
    Z.noise(x, y, 45, 2, 'glas');
    // the crackle: the stove's recording at the fire (a loop per light slot)
    const ln = 'zmolo:f' + f.slot;
    if (audio.has('amb_stove')) {
      audio.stopLoop(ln, 0.05);
      audio.loopAt(ln, 'amb_stove', x, y, { vol: 0, ref: 9 });
      if (audio.hasLoop(ln)) f.loop = ln;
    }
    markDirty();
    return f;
  }
  function end(f) {
    const i = S.fires.indexOf(f);
    if (i >= 0) S.fires.splice(i, 1);
    if (f.loop && audio.stopLoop) audio.stopLoop(f.loop, 0.8);
    markDirty();
  }
  // how strong a fire is now: grows in 0.35 s, burns, dies down over the last 1.5 s
  // (the petrol's first whoosh: half again as high for a moment)
  const strength = f =>
    Math.min(1, f.t / 0.35) * Math.min(1, Math.max(0, (FIRE.life - f.t) / 1.5)) * (1 + 0.5 * Math.exp(-f.t * 1.6));
  // ---- burning zombies ----
  function ignite(e, net) {
    if (!e || e.kind !== 'zombie') return;
    const b = S.burn.get(e);
    if (b) {
      b.t = Math.max(b.t, e.art === 'feuerwehr' ? FIRE.burn * 0.4 : FIRE.burn);
      if (!net) b.net = false;
      return;
    }
    // the firefighter (ZDATA.KINDS, e.art) in his protective gear burns only briefly
    const t = e.art === 'feuerwehr' ? FIRE.burn * 0.4 : FIRE.burn;
    S.burn.set(e, { t, net: !!net, tick: Math.random() * 0.25, ph: Math.random() * 9 });
    S.stats.lit++;
    if (!e.dead) ZTON.snarl(e.x, e.y);
  }
  // fire damage: straight to the zombie's health – zombie/z_horde.js damage plays the sounds and the blood of a blow; the stagger, the
  // chase and the death are the same (ZHORDE.kill); the other player's zombies (puppets) get it as a hit through ZHORDE.damage
  function burnHit(e, dmg) {
    if (!e || e.dead || e.kind !== 'zombie' || !(dmg > 0)) return;
    // (his gear: the firefighter takes a third of it)
    if (e.art === 'feuerwehr') dmg *= FIRE.helmK;
    if (e.net) {
      ZHORDE.damage(e, dmg, { kind: 'fire', knock: 0, dx: 0, dy: 0, gore: 0, by: 'spieler', w: 'molotow' });
      return;
    }
    e.hp -= dmg;
    if (Math.random() < 0.35) e.stag = Math.max(e.stag || 0, 0.3 + Math.random() * 0.25);
    if (e.st !== 'chase' && e.st !== 'dead' && e.st !== 'hide') e.st = 'chase';
    if (e.hp <= 0) {
      S.stats.kills++;
      ZHORDE.kill(e, { kind: 'fire', by: 'spieler', w: 'molotow' });
    }
  }
  // ---- per frame ----
  function tick(dt) {
    if (!Z.on) return;
    dt = Math.min(dt, 0.1);
    S.cd = Math.max(0, S.cd - dt);
    // the first molotov in the backpack: build and compile now, not at the throw
    S.acc += dt;
    if (S.acc > 0.5) {
      S.acc = 0;
      if (!S.warmed && !S.warmQ && Z.has('molotow')) {
        S.warmQ = true;
        setTimeout(() => {
          S.warmQ = false;
          warm();
        }, 300);
      }
      touchBtn();
    }
    const T = S.thr;
    if (T) {
      T.t += dt;
      if (!T.lit && T.t >= (T.fp ? 0.42 : 0.1)) {
        T.lit = true;
        T.litT = T.t;
        sndLight(P.x, P.y);
      }
      // the clip was cut short (a blow, another weapon): the bottle goes now
      const cut = T.fp && !(ZFP.clipA && ZFP.clipA.c === T.clip);
      if (!T.released && (T.t >= T.rel || cut)) release();
      if (T.t >= (T.fp ? THROW.dur : 0.6) || (cut && T.released)) {
        S.thr = null;
        if (G) {
          G.hand.visible = false;
          G.held.list.length = 0;
          writeField(G.held, 0);
        }
      }
      // the rag's light on the hands (the overlay's lamp, game/play.js HELD; zombie/z_fp.js sets it before us each frame)
      if (T.lit && !T.released && T.fp && T.seen) {
        HELD.lamp = 1.3 + Math.random() * 0.5;
        HELD.lampAt = S.ragAt;
      }
      markDirty();
    }
    if (!G) return;
    const now = performance.now() / 1000,
      W = G.world;
    W.list.length = 0;
    // third person: the bottle in the figure's right hand until it goes (the rag lit), upright, the neck in the fist
    const F = AVATAR.fig;
    if (T && !T.fp && !T.released && CAM3.on && F && F.B && F.B.RightHand && F.g && F.g.visible) {
      const b = T.tb || (T.tb = flyer());
      b.userData.busy = true;
      b.visible = true;
      b.scale.setScalar(1);
      F.B.RightHand.getWorldPosition(b.position);
      b.position.y -= NECK - 0.03;
      b.quaternion.identity();
      b.updateMatrixWorld(true);
      if (T.lit) {
        _v.set(0.006, RAG, 0).applyMatrix4(b.matrixWorld);
        W.list.push({ x: _v.x, y: _v.y - 0.01, z: _v.z, h: 0.17, w: 0.075, ph: 0.7 });
      }
    }
    // the bottles in flight
    for (let i = S.bottles.length - 1; i >= 0; i--) {
      const B = S.bottles[i],
        hit = fly(B, dt);
      if (hit) {
        S.bottles.splice(i, 1);
        shatter(B, hit);
        continue;
      }
      place(B);
      // the rag burns on it (a small tongue at the neck's end)
      _v.set(0.006, RAG, 0).applyMatrix4(B.g.matrixWorld);
      W.list.push({
        x: _v.x,
        y: _v.y - 0.01,
        z: _v.z,
        h: 0.17,
        w: 0.075,
        ph: B.ph,
        lx: -B.vx * 0.012,
        lz: B.vy * 0.012,
      });
    }
    // the fires: tongues, damage, burning, the player
    for (const f of S.fires.slice()) {
      f.t += dt;
      if (f.t >= FIRE.life) {
        end(f);
        continue;
      }
      const k = strength(f),
        tx = f.x,
        ty = f.z,
        tz = -f.y;
      for (const g of f.tongues) W.list.push({ x: tx + g.dx, y: ty, z: tz - g.dy, h: g.h, w: g.w, ph: g.ph, k });
      f.tick += dt;
      if (f.tick >= 0.25) {
        const s = f.tick;
        f.tick = 0;
        for (const e of Z.ents) {
          if (e.kind !== 'zombie' || e.dead || e.fly) continue;
          if (Math.abs(e.z - f.z) > 1.3 || Math.hypot(e.x - f.x, e.y - f.y) > FIRE.r + 0.2) continue;
          ignite(e, f.net);
          if (!f.net) burnHit(e, FIRE.dps * s * k);
        }
        // the player in it
        if (Z.hp > 0 && Math.abs(P.feet - f.z) < 1.0 && Math.hypot(P.x - f.x, P.y - f.y) < FIRE.r - 0.15 && k > 0.3) {
          Z.hurt(FIRE.hurt * s * k, 'Feuer');
          if (!f.hurtSaid) {
            f.hurtSaid = true;
            PLAY.think('Au – das brennt!', 1200);
          }
        }
      }
      f.noiseT -= dt;
      if (f.noiseT <= 0) {
        f.noiseT = 1;
        Z.noise(f.x, f.y, 28, 1.2, 'feuer');
      }
      f.crackT -= dt;
      if (f.crackT <= 0) {
        f.crackT = 0.05 + Math.random() * 0.22;
        if (!f.loop) sndCrackle(f.x, f.y, k);
      }
      if (f.loop) {
        audio.loopVol(f.loop, 1.6 * k);
        audio.moveLoop(f.loop, f.x, f.y);
      }
    }
    // the burning zombies: flames on them, damage, they set the next one alight; dead ones burn out on the ground
    for (const [e, b] of S.burn) {
      b.t -= dt;
      if (b.t <= 0 || !Z.ents.includes(e)) {
        S.burn.delete(e);
        continue;
      }
      const k = Math.min(1, b.t / 1.2),
        ex = e.x,
        ez = -e.y,
        y0 = e.z;
      if (e.dead) {
        W.list.push({ x: ex + 0.3, y: y0 + 0.05, z: ez, h: 0.55, w: 0.32, ph: b.ph, k });
        W.list.push({ x: ex - 0.35, y: y0 + 0.05, z: ez + 0.1, h: 0.45, w: 0.3, ph: b.ph + 2, k });
      } else if (e.crawl) {
        W.list.push({ x: ex, y: y0 + 0.15, z: ez, h: 0.6, w: 0.34, ph: b.ph, k });
        W.list.push({ x: ex + 0.2, y: y0 + 0.1, z: ez - 0.15, h: 0.45, w: 0.28, ph: b.ph + 1.7, k });
      } else {
        W.list.push({ x: ex, y: y0 + 0.75, z: ez, h: 0.85, w: 0.4, ph: b.ph, k });
        W.list.push({ x: ex + 0.05, y: y0 + 1.3, z: ez - 0.04, h: 0.6, w: 0.3, ph: b.ph + 2.2, k });
        W.list.push({ x: ex - 0.08, y: y0 + 0.3, z: ez + 0.05, h: 0.55, w: 0.28, ph: b.ph + 4.1, k });
      }
      if (e.dead) {
        if (b.t > 3.5) b.t = 3.5;
        continue;
      }
      b.tick += dt;
      if (b.tick >= 0.25) {
        const s = b.tick;
        b.tick = 0;
        if (!b.net) burnHit(e, FIRE.bdps * s);
        if (Math.random() < 0.3) sndCrackle(e.x, e.y, 0.8);
        // the next one catches
        for (const o of Z.ents)
          if (o !== e && o.kind === 'zombie' && !o.dead && !S.burn.has(o) && Math.hypot(o.x - e.x, o.y - e.y) < 0.8)
            if (Math.random() < FIRE.spread) ignite(o, b.net);
      }
    }
    if (W.list.length || W.mesh.visible) {
      writeField(W, now);
      markDirty();
    }
    if (S.warmF > 0) warmTick();
  }
  KERN.tick(tick, 'zombie/molotow');
  // ---- the light: two of the shared point lights, one per fire (KERN.lights, core/kern.js), flickering; they go home by themselves ----
  for (const slot of [0, 1])
    KERN.lights.borrow({
      id: 'zombie:feuer' + slot,
      n: 1,
      prio: 5,
      want: () => Z.on && S.fires.some(f => f.slot === slot),
      on: ls => {
        const l = ls[0];
        l.color.setHex(0xff7a2c);
        l.distance = FIRE.lightD;
        l.decay = 1.6;
        l.intensity = 0;
      },
      tick: ls => {
        const l = ls[0],
          f = S.fires.find(q => q.slot === slot);
        if (!f) return;
        const k = strength(f),
          t = performance.now() / 1000;
        l.position.set(f.x, f.z + 1.1, -f.y);
        l.intensity =
          FIRE.light * k * (0.78 + 0.12 * Math.sin(t * 13.7 + slot) + 0.1 * Math.sin(t * 31.1) + Math.random() * 0.06);
        markDirty();
      },
      off: () => markDirty(),
    });
  // ---- the key F (in the zombie night it is the throw, not full screen) and the touch button ----
  window.addEventListener(
    'keydown',
    e => {
      if (!Z.on || (e.key !== 'f' && e.key !== 'F') || e.ctrlKey || e.metaKey || e.altKey) return;
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes(document.activeElement?.tagName)) return;
      if (P.mode !== 'walk' || (VEH && VEH.cur)) return;
      e.preventDefault();
      e.stopImmediatePropagation();
      if (!e.repeat) throwIt();
    },
    true
  );
  let TB = null;
  function touchBtn() {
    if (!COARSE || !ZHUD.touch) return;
    if (!TB) {
      TB = document.createElement('button');
      TB.className = 's';
      TB.dataset.z = 'molotow';
      TB.textContent = '🔥';
      TB.setAttribute('aria-label', 'Molotow werfen');
      TB.addEventListener('click', () => throwIt());
      ZHUD.touch.prepend(TB);
    }
    TB.hidden = !Z.has('molotow');
  }
  // ---- the other player's fire (zombie/z_netz.js passes events it does not know itself) ----
  KERN.on('znetz:ev', m => {
    const d = m && m.d;
    if (!d || d.k !== 'feuer' || !Z.on) return;
    const x = +d.x,
      y = +d.y,
      z = +d.z;
    if (![x, y, z].every(Number.isFinite)) return;
    fire(x, y, z, true);
  });
  // ---- the night ends: everything out, the meshes freed ----
  KERN.on('zombie:stop', () => {
    for (const f of S.fires.slice()) end(f);
    S.bottles.length = 0;
    S.burn.clear();
    S.thr = null;
    if (!G) return;
    for (const b of G.pool) {
      scene.remove(b);
      b.traverse(o => o.geometry && o.geometry.dispose());
    }
    for (const F of [G.world, G.held]) {
      F.mesh.parent && F.mesh.parent.remove(F.mesh);
      F.geo.dispose();
    }
    if (G.hand.parent) G.hand.parent.remove(G.hand);
    G.hand.traverse(o => o.geometry && o.geometry.dispose());
    G = null;
    S.built = false;
    S.warmed = false;
    markDirty(true);
  });
  // tests and the curious: the state in numbers
  function info() {
    return {
      built: S.built,
      warmed: S.warmed,
      thr: S.thr ? { t: +S.thr.t.toFixed(2), lit: S.thr.lit, rel: S.thr.released, fp: S.thr.fp, tb: !!S.thr.tb } : null,
      bottles: S.bottles.map(B => [+B.x.toFixed(2), +B.y.toFixed(2), +B.z.toFixed(2)]),
      fires: S.fires.map(f => ({
        x: +f.x.toFixed(2),
        y: +f.y.toFixed(2),
        z: +f.z.toFixed(2),
        t: +f.t.toFixed(2),
        net: f.net,
        slot: f.slot,
      })),
      burning: [...S.burn.keys()].map(e => e.id),
      tongues: G ? G.world.list.length : 0,
      lights: KERN.lights.status().filter(s => s.id.startsWith('zombie:feuer')),
      stats: { ...S.stats },
    };
  }
  Object.assign(S, { FIRE, THROW, throwIt, release, fire, ignite, burnHit, build, warm, info, can });
  return S;
})();
window.ZMOLO = ZMOLO;
