// ===================== feat/dorf village life 4: the villagers as figures (DPEOPLE) =====================
// The six people of dorf/dorf_text.js as Microsoft Rocketbox figures (chars/dorf_<key>.json, ≤ 1.2 MB each, built by
// tools/player/build_villagers.sh) with the rig and the clips of the player (chars/pclips_m.json, pclips_f.json) – npc/npc_real.js rbPerson.
// Loaded only when they are needed (the evening runs or is about to, and one is near the school or the fire), one after the other with a
// pause between (no long stall); dropped again (geometry, textures freed) when nobody needs them for a while.
import * as THREE from 'three';
import { BASE, scene, V } from '../core/head.js';
import { markDirty } from '../core/assets.js';
import { CHL, rbPerson } from '../npc/npc_real.js';
import { DTEXT } from './dorf_text.js';
export const DPEOPLE = (() => {
  const S = { figs: {}, busy: false, clips: {}, loads: 0, drops: 0, err: null, requests: [] };
  const CH = window.CHARMAN || {},
    PM = window.PLAYERMAN || {};
  const U = f => BASE + 'chars/' + f;
  const KEYS = Object.keys(DTEXT.P);
  const avail = () => !!(PM.pclips_m && KEYS.every(k => CH[DTEXT.P[k].fig]));
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
  async function loadOne(key) {
    const p = DTEXT.P[key],
      file = CH[p.fig];
    S.requests.push(file);
    const [gl, set] = await Promise.all([CHL.loadAsync(U(file)), clipSet(p.clips)]);
    const f = rbPerson(gl, set, { h: p.h, stoop: p.stoop, idleRate: 0.8 + ((key.charCodeAt(0) * 7) % 10) / 50 });
    f.key = key;
    f.walker = { talking: false };
    f.g.visible = false;
    f.g.traverse(o => {
      if (o.isMesh) o.frustumCulled = true;
    });
    scene.add(f.g);
    S.figs[key] = f;
    S.loads++;
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
  // put a figure somewhere: x, y (site), z of the floor or seat, heading (deg, 0 = north), 'stand' or 'sit' (seat top z)
  function place(key, x, y, z, hd, mode = 'stand', seatTop = 0.47) {
    const f = S.figs[key];
    if (!f) return null;
    f.mode = mode;
    const zz = mode === 'sit' ? z + seatTop - (f.hipH || 0.9) + 0.1 : z;
    f.g.position.copy(V(x, y, zz));
    f.g.rotation.y = (-hd * Math.PI) / 180;
    f.g.visible = true;
    f.at = { x, y, z, hd };
    f.g.updateMatrixWorld(true);
    return f;
  }
  const hide = key => {
    const f = S.figs[key];
    if (f && f.g.visible) {
      f.g.visible = false;
      f.walker.talking = false;
      markDirty();
    }
  };
  // per frame: the poses of the visible figures (npc_real.js skips far ones itself)
  function tick(dt) {
    let any = false;
    for (const f of Object.values(S.figs)) {
      if (!f.g.visible) continue;
      f.anim(dt, 0);
      any = true;
    }
    return any;
  }
  // the head of a figure (for the action button and the panel)
  const _h = new THREE.Vector3();
  function head(key) {
    const f = S.figs[key];
    if (!f || !f.at) return null;
    const b = f.bones && f.bones.Head;
    if (b) {
      b.getWorldPosition(_h);
      return [_h.x, -_h.z, _h.y];
    }
    return [f.at.x, f.at.y, f.at.z + 1.5];
  }
  Object.assign(S, { KEYS, avail, ensure, drop, dropAll, place, hide, tick, head });
  return S;
})();
window.DPEOPLE = DPEOPLE;
