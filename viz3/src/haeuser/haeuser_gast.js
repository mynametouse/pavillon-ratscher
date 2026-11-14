// ===================== feat/haeuser: the villager at home in his or her house (HGAST) =====================
// dorf/dorf_life.js knows where the villagers live (PIN) and when their day takes them out (the garden, the car, the evenings in the
// school or at the fire); dorf/dorf_people.js shows them outdoors. Indoors this module shows a copy of its own of the same figure (the
// same model and clips, loaded on going in, freed on coming out) – in the living room on the sofa or in the kitchen at the table; dorf's
// figures and their day stay as they are. haeuser/haeuser.js decides whether one is at home.
//   HGAST.show(key, at) → Promise<boolean>   at: { x, y, z, hd (compass °, the way the face looks), mode: 'sit' | 'stand', seatTop }
//   HGAST.hide()        the figure away, its geometry and textures freed        HGAST.f  the figure shown, or null
import * as THREE from 'three';
import { BASE, V, scene, cam, QS } from '../core/head.js';
import { markDirty } from '../core/assets.js';
import { KERN } from '../core/kern.js';
import { canonBone, decodeClip } from '../core/rig.js';
import { CHL, prepModel } from '../npc/npc_real.js';
import { DTEXT } from '../dorf/dorf_text.js';
export const HGAST = (() => {
  const S = { f: null, run: 0, clips: {}, err: null, loads: 0, frees: 0 };
  const U = f => BASE + 'chars/' + f;
  const avail = key => {
    const CH = window.CHARMAN || {},
      PM = window.PLAYERMAN || {},
      p = DTEXT.P[key];
    return !!(p && PM.pclips_m && CH[p.fig]) && !QS.get('lowfig');
  };
  async function clipSet(k) {
    if (S.clips[k]) return S.clips[k];
    const PM = window.PLAYERMAN || {},
      file = k === 'f' && PM.pclips_f ? PM.pclips_f : PM.pclips_m,
      FL = new THREE.FileLoader();
    FL.setResponseType('json');
    S.clips[k] = await FL.loadAsync(U(file));
    return S.clips[k];
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
  const _v = new THREE.Vector3();
  async function show(key, at) {
    hide();
    if (!avail(key)) return false;
    const run = ++S.run,
      p = DTEXT.P[key],
      CH = window.CHARMAN || {};
    let gl, set;
    try {
      [gl, set] = await Promise.all([CHL.loadAsync(U(CH[p.fig])), clipSet(p.clips)]);
    } catch (e) {
      S.err = key + ': ' + String((e && e.message) || e).slice(0, 120);
      return false;
    }
    // gone out again meanwhile (or another house): the model is not needed
    if (run !== S.run) {
      gl.scene.traverse(freeObj);
      return false;
    }
    const model = gl.scene,
      g = new THREE.Group(),
      inner = new THREE.Group();
    inner.rotation.y = Math.PI; // models face +z; the figures walk along local −z (as dorf/dorf_people.js)
    g.add(inner);
    inner.add(model);
    prepModel(model, p.h);
    let hips = null;
    model.traverse(x => {
      if (x.isBone && !hips && canonBone(x.name) === 'Hips') hips = x;
    });
    const mixer = new THREE.AnimationMixer(model),
      clip = (set && set.clips && (set.clips[at.mode === 'sit' ? 'sit' : 'idle'] || set.clips.idle)) || null;
    if (clip) {
      const a = mixer.clipAction(decodeClip(clip));
      a.play();
      a.time = Math.random() * a.getClip().duration;
    }
    mixer.update(0);
    g.updateMatrixWorld(true);
    // sitting: the hips of the pose onto the seat (as dorf/dorf_people.js place)
    const a = (at.hd * Math.PI) / 180;
    let px = at.x,
      py = at.y,
      pz = at.z;
    if (at.mode === 'sit' && hips) {
      hips.getWorldPosition(_v);
      g.worldToLocal(_v);
      pz = at.z + (at.seatTop ?? 0.47) + 0.07 - _v.y;
      const fw = -_v.z + 0.04;
      px -= Math.sin(a) * fw;
      py -= Math.cos(a) * fw;
    }
    g.position.copy(V(px, py, pz));
    g.rotation.y = -a;
    g.updateMatrixWorld(true);
    scene.add(g);
    S.f = { key, g, mixer, at, acc: 0, name: p.name };
    S.loads++;
    markDirty();
    return true;
  }
  function hide() {
    S.run++;
    const f = S.f;
    if (!f) return;
    S.f = null;
    scene.remove(f.g);
    f.mixer.stopAllAction();
    f.g.traverse(freeObj);
    S.frees++;
    markDirty();
  }
  // breathing in the pose: a few updates a second while one is near (not every frame: the picture is drawn only when asked)
  KERN.tick(dt => {
    const f = S.f;
    if (!f) return;
    f.acc += dt;
    if (f.acc < 0.15) return;
    f.g.getWorldPosition(_v);
    if (_v.distanceToSquared(cam.position) < 64) {
      f.mixer.update(f.acc);
      markDirty();
    }
    f.acc = 0;
  }, 'haeuser/gast');
  // the head of the figure shown (for the action button)
  S.head = () => {
    const f = S.f;
    if (!f) return null;
    return [f.at.x, f.at.y, f.at.z + (f.at.mode === 'sit' ? 1.15 : 1.6)];
  };
  S.show = show;
  S.hide = hide;
  return S;
})();
window.HGAST = HGAST;
