// ===================== feat/dorf village life 4: the villagers as figures (DPEOPLE) =====================
// The people of dorf/dorf_text.js as Microsoft Rocketbox figures (chars/dorf_<key>.json, ≤ 1.2 MB each, built by
// tools/player/build_villagers.sh) with the rig of the player, moved by the player's clip sets (chars/pclips_m.json, pclips_f.json):
// standing, walking, talking, really sitting (the clip, not bent bones), kneeling in the bed to weed, watering with a can – the hips of
// each pose are measured once, so they land on the seat. They look at whoever comes close. Loaded only when they are needed (an evening
// or their garden work near the visitor), one after the other with a pause; dropped again (geometry, textures freed) after a while.
import * as THREE from 'three';
import { BASE, cam, QS, scene, V } from '../core/head.js';
import { markDirty } from '../core/assets.js';
import { canonBone, decodeClip } from '../core/rig.js';
import { boneTurn, CHL, prepModel } from '../npc/npc_real.js';
import { DTEXT } from './dorf_text.js';
export const DPEOPLE = (() => {
  const S = { figs: {}, busy: false, clips: {}, loads: 0, drops: 0, err: null, requests: [] };
  const CH = window.CHARMAN || {},
    PM = window.PLAYERMAN || {};
  const U = f => BASE + 'chars/' + f;
  const KEYS = Object.keys(DTEXT.P);
  const avail = () => !!(PM.pclips_m && KEYS.every(k => CH[DTEXT.P[k].fig])) && !QS.get('lowfig'); // ?lowfig: no figures (as npc/npc_real.js)
  async function clipSet(k) {
    if (S.clips[k]) return S.clips[k];
    const file = k === 'f' && PM.pclips_f ? PM.pclips_f : PM.pclips_m,
      FL = new THREE.FileLoader();
    FL.setResponseType('json');
    S.requests.push(file);
    S.clips[k] = await FL.loadAsync(U(file));
    return S.clips[k];
  }
  const pause = ms => new Promise(r => setTimeout(r, ms));
  const _v = new THREE.Vector3(),
    _v2 = new THREE.Vector3(),
    _q = new THREE.Quaternion();
  // the clip of each pose (the player's clip set)
  const CLIP = { stand: 'idle', walk: 'walk', talk: 'talk', sit: 'sit', weed: 'kneelIdle', water: 'pour' };
  function can() {
    const g = new THREE.Group(),
      m = new THREE.MeshStandardMaterial({ color: 0x2f6b3a, roughness: 0.5, metalness: 0.3 }),
      body = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.08, 0.2, 10), m),
      spout = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.016, 0.3, 6), m);
    body.position.set(0, -0.14, 0.04);
    spout.position.set(0, -0.12, 0.2);
    spout.rotation.x = 1.0;
    g.add(body, spout);
    return g;
  }
  // a figure: g (group, origin at the feet), setMode(m), anim(dt, speed), the measured hips per pose
  function person(gl, set, o) {
    const model = gl.scene,
      g = new THREE.Group(),
      inner = new THREE.Group();
    inner.rotation.y = Math.PI;
    g.add(inner);
    inner.add(model); // models face +z; figures walk along local −z (as npc/npc_real.js)
    const s = prepModel(model, o.h);
    const B = {};
    model.traverse(x => {
      if (x.isBone) {
        const c = canonBone(x.name);
        if (c && !B[c]) B[c] = x;
      }
    });
    const mixer = new THREE.AnimationMixer(model),
      A = {},
      W = {};
    for (const k of new Set(Object.values(CLIP))) {
      const c = set && set.clips && set.clips[k];
      if (!c) continue;
      const a = mixer.clipAction(decodeClip(c));
      a.play();
      a.setEffectiveWeight(0);
      A[k] = a;
      W[k] = 0;
    }
    const walkSp = ((set.clips.walk && set.clips.walk.speed) || 1.25) * s;
    // the hips of each pose, measured once in the figure's own frame (y up, f forward): seats put them where they belong
    const hips = {};
    g.updateMatrixWorld(true);
    for (const [mode, k] of Object.entries(CLIP)) {
      const a = A[k];
      if (!a || !B.Hips) continue;
      for (const n in A) A[n].setEffectiveWeight(n === k ? 1 : 0);
      a.time = 0;
      mixer.update(0);
      model.updateMatrixWorld(true);
      B.Hips.getWorldPosition(_v);
      g.worldToLocal(_v);
      hips[mode] = { y: _v.y, f: -_v.z }; // local −z is forward
    }
    for (const n in A) {
      A[n].setEffectiveWeight(n === 'idle' ? 1 : 0);
      A[n].time = Math.random() * A[n].getClip().duration;
    }
    if (A.idle) A.idle.timeScale = o.idleRate ?? 0.85;
    W.idle = 1;
    let prop = null;
    const sv = new Map();
    let acc = 0,
      look = 0,
      lookT = 0,
      lookTo = 0;
    const self = {
      g,
      model,
      bones: B,
      hips,
      mode: 'stand',
      walker: { talking: false },
      setMode(m) {
        if (self.mode === m) return;
        self.mode = m;
        if (m === 'water' && B.RightHand && !prop) {
          prop = can(); // the watering can in the right hand
          B.RightHand.add(prop);
          B.RightHand.getWorldScale(_v2);
          prop.scale.setScalar(1 / Math.max(1e-4, _v2.x)); // the hand is inside the scaled rig: the can in metres
        }
        if (prop) prop.visible = m === 'water';
      },
      anim(dt, speed) {
        acc += dt;
        if (!g.visible) return;
        g.getWorldPosition(_v);
        if (_v.distanceToSquared(cam.position) > 70 * 70) return; // far away: no pose updates
        let want = CLIP[self.mode] || 'idle';
        if (speed > 0.05) want = 'walk';
        else if (self.mode === 'stand' && self.walker.talking && A.talk) want = 'talk';
        if (!A[want]) want = 'idle';
        let sum = 0;
        const k = Math.min(1, dt * 4);
        for (const n in A) {
          W[n] += ((n === want ? 1 : 0) - W[n]) * k;
          if (W[n] < 1e-3 && n !== want) W[n] = 0;
          sum += W[n];
        }
        for (const n in A) A[n].setEffectiveWeight(sum > 0 ? W[n] / sum : 0);
        if (A.walk) A.walk.timeScale = speed > 0.05 ? THREE.MathUtils.clamp(speed / walkSp, 0.55, 1.6) : 1;
        for (const [b, q] of sv) b.quaternion.copy(q);
        sv.clear();
        mixer.update(acc);
        acc = 0;
        model.updateMatrixWorld(true);
        // somebody close by gets looked at (standing and sitting); otherwise now and then a slow look around
        if (self.mode === 'weed' || self.mode === 'water' || !B.Head || !B.Neck) return;
        model.getWorldQuaternion(_q).invert();
        let seen = false;
        if (_v.distanceToSquared(cam.position) < 49) {
          _v2.copy(cam.position);
          model.worldToLocal(_v2);
          const yaw = Math.atan2(_v2.x, _v2.z);
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
        const lk = speed > 0.05 ? 0.3 : seen ? 1 : 0.6;
        boneTurn(sv, _q, B.Neck, 0, 1, 0, look * 0.4 * lk);
        boneTurn(sv, _q, B.Head, 0, 1, 0, look * 0.6 * lk);
        if (o.stoop && self.mode === 'stand') boneTurn(sv, _q, B.Spine1 || B.Spine, 1, 0, 0, o.stoop);
      },
    };
    return self;
  }
  async function loadOne(key) {
    const p = DTEXT.P[key],
      file = CH[p.fig];
    S.requests.push(file);
    const [gl, set] = await Promise.all([CHL.loadAsync(U(file)), clipSet(p.clips)]);
    const f = person(gl, set, { h: p.h, stoop: p.stoop, idleRate: 0.8 + ((key.charCodeAt(0) * 7) % 10) / 50 });
    f.key = key;
    f.g.visible = false;
    scene.add(f.g);
    S.figs[key] = f;
    S.loads++;
    S.fresh = true; // dorf/dorf.js places it right away (not only when all are there)
    return f;
  }
  // make sure these figures are there (resolves when all are loaded); a failed one is noted and skipped
  let queue = Promise.resolve();
  function ensure(keys) {
    if (!avail()) return Promise.resolve(false);
    const miss = keys.filter(k => !S.figs[k]);
    if (!miss.length) return Promise.resolve(true);
    queue = queue.then(async () => {
      S.busy = true;
      for (const k of miss) {
        if (S.figs[k]) continue;
        try {
          await loadOne(k);
        } catch (e) {
          S.err = k + ': ' + String((e && e.message) || e).slice(0, 120);
          console.warn('dorf figure', k, e);
        }
        await pause(120);
      }
      S.busy = false;
      markDirty();
      return true;
    });
    return queue;
  }
  function freeObj(o) {
    if (o.geometry) o.geometry.dispose();
    const ms = Array.isArray(o.material) ? o.material : o.material ? [o.material] : [];
    for (const m of ms) {
      for (const k of ['map', 'normalMap', 'roughnessMap', 'metalnessMap', 'aoMap', 'emissiveMap', 'alphaMap'])
        if (m[k]) m[k].dispose();
      m.dispose();
    }
    if (o.isSkinnedMesh && o.skeleton && o.skeleton.boneTexture) o.skeleton.dispose();
  }
  function drop(key) {
    const f = S.figs[key];
    if (!f) return;
    scene.remove(f.g);
    f.g.traverse(freeObj);
    delete S.figs[key];
    S.drops++;
    markDirty();
  }
  const dropAll = () => {
    for (const k of Object.keys(S.figs)) drop(k);
  };
  // put a figure somewhere: x, y (site), z of the floor, heading (deg, 0 = north), mode ('stand', 'sit', 'weed', 'water');
  // sitting: seatTop above the floor – the measured hips of the sitting pose go onto the seat
  function place(key, x, y, z, hd, mode = 'stand', seatTop = 0.47) {
    const f = S.figs[key];
    if (!f) return null;
    f.setMode(mode);
    f.go = null;
    const a = (hd * Math.PI) / 180;
    let px = x,
      py = y,
      pz = z;
    if (mode === 'sit' && f.hips.sit) {
      pz = z + seatTop + 0.07 - f.hips.sit.y; // the thighs' thickness under the hip joint
      const fw = f.hips.sit.f + 0.04; // the hips a little behind the seat's middle
      px -= Math.sin(a) * fw;
      py -= Math.cos(a) * fw;
    }
    f.g.position.copy(V(px, py, pz));
    f.g.rotation.y = -a;
    f.g.visible = true;
    f.at = { x, y, z, hd };
    f.g.updateMatrixWorld(true);
    return f;
  }
  const hide = key => {
    const f = S.figs[key];
    if (f && f.g.visible) {
      f.g.visible = false;
      f.go = null;
      f.walker.talking = false;
      markDirty();
    }
  };
  // per frame: the poses of the visible figures; walking ones move towards their target
  function tick(dt) {
    let any = false;
    for (const k in S.figs) {
      const f = S.figs[k];
      if (!f.g.visible) continue;
      let sp = 0;
      const g = f.go;
      if (g) {
        const dx = g.x - f.at.x,
          dy = g.y - f.at.y,
          d = Math.hypot(dx, dy);
        if (d < 0.05) {
          f.go = null;
          if (g.done) g.done(f);
        } else {
          const st = Math.min(d, (g.v || 1.0) * dt);
          f.at.x += (dx / d) * st;
          f.at.y += (dy / d) * st;
          f.at.hd = (Math.atan2(dx, dy) * 180) / Math.PI;
          if (g.zAt) f.at.z = g.zAt(f.at.x, f.at.y);
          f.g.position.copy(V(f.at.x, f.at.y, f.at.z));
          f.g.rotation.y = (-f.at.hd * Math.PI) / 180;
          sp = g.v || 1.0;
        }
      }
      f.anim(dt, sp);
      any = true;
    }
    return any;
  }
  // walk a figure (standing) to x, y (site) at v m/s; zAt(x, y) gives the ground; done(f) when there
  function walkTo(key, x, y, v, zAt, done) {
    const f = S.figs[key];
    if (!f || !f.at) return;
    f.setMode('stand');
    f.go = { x, y, v, zAt, done };
  }
  // the head of a figure (for the action button and the panel)
  function head(key) {
    const f = S.figs[key];
    if (!f || !f.at || !f.g.visible) return null;
    const b = f.bones && f.bones.Head;
    if (b) {
      b.getWorldPosition(_v);
      return [_v.x, -_v.z, _v.y];
    }
    return [f.at.x, f.at.y, f.at.z + 1.5];
  }
  Object.assign(S, { KEYS, avail, ensure, drop, dropAll, place, hide, tick, head, walkTo });
  return S;
})();
window.DPEOPLE = DPEOPLE;
