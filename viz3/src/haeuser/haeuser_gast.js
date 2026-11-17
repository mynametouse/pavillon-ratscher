// ===================== feat/haeuser: the villager at home in his or her house (HGAST) =====================
// dorf/dorf_life.js knows where the villagers live (PIN) and when their day takes them out (the garden, the car, the evenings in the
// school or at the fire); dorf/dorf_people.js shows them outdoors. Indoors this module shows a copy of its own of the same figure (the
// same model and clips, loaded on going in, freed on coming out) – in the living room on the sofa or in the kitchen at the table; dorf's
// figures and their day stay as they are. haeuser/haeuser.js decides whether one is at home.
//   HGAST.show(key, at) → Promise<boolean>   at: { x, y, z, hd (compass °, the way the face looks), mode: 'sit' | 'stand' | 'lie',
//                       seatTop, clip (a clip of the set: 'interactLoop' at the stove …), head: [x, y] and z the mattress (lying: hd the
//                       way from the head to the feet), duvet: { x, y, hd, len, w, hex } (asleep under it) }   (feat/innen-real)
//   HGAST.hide()        the figure away, its geometry and textures freed        HGAST.f  the figure shown, or null
import * as THREE from 'three';
import { BASE, V, scene, cam, QS } from '../core/head.js';
import { markDirty } from '../core/assets.js';
import { KERN } from '../core/kern.js';
import { canonBone, decodeClip } from '../core/rig.js';
import { CHL, prepModel } from '../npc/npc_real.js';
import { DTEXT } from '../dorf/dorf_text.js';
import { ZIMOB } from '../zombie/z_innen_mob.js';
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
      // every texture of the material (the model's own: glTF materials may carry more maps than the usual few)
      for (const k of Object.keys(m)) {
        const v = m[k];
        if (v && v.isTexture) v.dispose();
      }
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
    let hips = null,
      knee = null;
    model.traverse(x => {
      if (x.isBone && !hips && canonBone(x.name) === 'Hips') hips = x;
      if (x.isBone && !knee && canonBone(x.name) === 'LeftLeg') knee = x;
    });
    // feat/innen-real: the pose by what one is doing – sitting, standing at the stove with the hands busy ('interactLoop'), lying
    const mixer = new THREE.AnimationMixer(model),
      want = at.clip || (at.mode === 'sit' ? 'sit' : at.mode === 'lie' ? 'lie' : 'idle'),
      clip = (set && set.clips && (set.clips[want] || set.clips.idle)) || null;
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
      pz = at.z,
      turn = -a;
    if (at.mode === 'sit' && hips) {
      hips.getWorldPosition(_v);
      g.worldToLocal(_v);
      pz = at.z + (at.seatTop ?? 0.47) + 0.07 - _v.y;
      let fw = -_v.z + 0.04;
      // feat/innen-real: where the seat's front edge is known (a couch: at.front metres before the spot), the knees just over it – the
      // legs hang in front of the couch, not in it (the hips stay between 15 cm behind and 25 cm before the spot)
      if (at.front != null && knee) {
        const k = knee.getWorldPosition(new THREE.Vector3());
        g.worldToLocal(k);
        fw = Math.min(-_v.z + 0.15, Math.max(-_v.z - 0.25, -k.z - (at.front + 0.03)));
      }
      px -= Math.sin(a) * fw;
      py -= Math.cos(a) * fw;
    }
    let head = null;
    model.traverse(x => {
      if (x.isBone && !head && canonBone(x.name) === 'Head') head = x;
    });
    // feat/innen-real: lying in bed – the body turned so that it runs from the pillow towards the foot of the bed (at.hd), the head
    // on the pillow (at.head), the hips just above the mattress (at.z)
    if (at.mode === 'lie' && hips && head && at.head) {
      const h = head.getWorldPosition(new THREE.Vector3()),
        q = hips.getWorldPosition(new THREE.Vector3()),
        az0 = Math.atan2(q.x - h.x, -(q.z - h.z));
      turn = -(a - az0);
      g.rotation.y = turn;
      g.updateMatrixWorld(true);
      head.getWorldPosition(_v);
      const hy = hips.getWorldPosition(new THREE.Vector3()).y,
        w = V(at.head[0], at.head[1], 0);
      g.position.set(w.x - _v.x, at.z + 0.11 - hy, w.z - _v.z);
      g.updateMatrixWorld(true);
      px = py = pz = null;
    }
    if (px !== null) g.position.copy(V(px, py, pz));
    g.rotation.y = turn;
    g.updateMatrixWorld(true);
    // feat/innen-real: asleep under the duvet – a duvet over the body from the shoulders to the feet (a soft box of the kit in its
    // palette: its own geometry only, freed on hiding; the shared material stays)
    let duvet = null;
    if (at.mode === 'lie' && at.duvet) {
      try {
        const m = new ZIMOB.Mesher(null, { soft: true, pal: ZIMOB.M.palIn || null }), // (the room's palette: the room around it, not the sky)
          d = at.duvet,
          L = d.len || 1.55,
          W = d.w || 0.95,
          zz = at.z + 0.01;
        duvet = new THREE.Group();
        // (spread flat over the mattress, and over the body a long soft hill 26 cm high – one box over everything had stood on the bed
        // like a white chest)
        const cloth = ZIMOB.col(d.hex || 0xe9e4d8, 0.95);
        m.box(cloth, -W / 2, W / 2, 0, L, zz, zz + 0.07, { r: 0.03 });
        m.box(cloth, -0.24, 0.24, 0.02, L - 0.12, zz + 0.02, zz + 0.23, { r: 0.1, puff: 0.035 });
        m.finish(duvet, false);
        const sh = V(d.x, d.y, 0);
        duvet.position.set(sh.x, 0, sh.z);
        duvet.rotation.y = -(d.hd * Math.PI) / 180;
        duvet.updateMatrixWorld(true);
        scene.add(duvet);
      } catch (e) {
        S.err = 'duvet: ' + String((e && e.message) || e).slice(0, 120);
      }
    }
    scene.add(g);
    S.f = { key, g, mixer, at, acc: 0, name: p.name, duvet };
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
    if (f.duvet) {
      scene.remove(f.duvet);
      f.duvet.traverse(o => o.geometry && o.geometry.dispose());
    }
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
