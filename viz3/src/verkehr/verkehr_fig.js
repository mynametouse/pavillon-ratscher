// ===================== feat/verkehr 3: the people as figures, their dogs and bags (VFIG) =====================
// Each person of verkehr/verkehr_leute.js is a Microsoft Rocketbox figure (chars/vk_*.json, MIT, ~1 MB each) with the rig of the player,
// moved by the player's clip sets (chars/pclips_m.json, pclips_f.json) through rbPerson of npc/npc_real.js – the same walking, standing,
// talking and looking at whoever comes close as Hubert and Ronald. Loaded only when the person is about to walk somewhere near the
// visitor, freed again (geometry, textures) when nobody needs it – few at a time, so a phone keeps its memory. A dog (Bettina's
// dachshund, Anja's Bruno) is a small model of vertex colours that trots beside its person; a bag hangs in the hand.
import * as THREE from 'three';
import { BASE, QS, scene } from '../core/head.js';
import { markDirty } from '../core/assets.js';
import { CHL, rbPerson } from '../npc/npc_real.js';
import { VPROPS } from '../world/village_props.js';
import { VLEUTE } from './verkehr_leute.js';
export const VFIG = (() => {
  const S = { figs: {}, loading: {}, loads: 0, drops: 0, err: null, requests: [], clips: {} };
  const CH = window.CHARMAN || {},
    PM = window.PLAYERMAN || {};
  const U = f => BASE + 'chars/' + f;
  // figures only with the clip sets, without ?lowfig (as npc/npc_real.js), and for the people whose file is there
  const avail = k => !!(PM.pclips_m && PM.pclips_f && !QS.get('lowfig') && (!k || CH[VLEUTE.P[k].fig]));
  // the material of everything made of vertex colours here (dogs, bags, the cars of verkehr/verkehr_auto.js): the same parameters as
  // the villagers' cars (dorf/dorf_cars.js) – one shader program for both
  let mat = null;
  S.mat = () =>
    (mat = mat || new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.55, envMapIntensity: 0.9 }));
  const lin = c => (c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4));
  S.col = hex => {
    const c = new THREE.Color(hex);
    return [c.r, c.g, c.b]; // THREE.Color from a hex string is already linear
  };
  S.L = (r, g, b) => [lin(r), lin(g), lin(b)];
  function clipSet(k) {
    if (S.clips[k]) return S.clips[k];
    const file = k === 'f' ? PM.pclips_f : PM.pclips_m,
      FL = new THREE.FileLoader();
    FL.setResponseType('json');
    S.requests.push(file);
    return (S.clips[k] = FL.loadAsync(U(file)).catch(e => {
      delete S.clips[k];
      throw e;
    }));
  }
  // a bag in the right hand (Sabine, Claudia) or a rucksack-like holdall (Lea, Jonas): one small box of vertex colours
  function bag(f, k) {
    const B = f.bones && f.bones.RightHand;
    if (!B) return;
    const K = VPROPS.kit(),
      c = { sabine: [0.32, 0.17, 0.1], claudia: [0.6, 0.55, 0.45], lea: [0.12, 0.13, 0.16], jonas: [0.18, 0.24, 0.35] }[
        k
      ] || [0.3, 0.25, 0.2],
      C = S.L(...c);
    K.box(0, 0, -0.34, 0.11, 0.3, 0.26, 0, C, true); // hanging below the hand (site frame of the kit: z up = the hand's y)
    K.box(0, 0.1, -0.1, 0.02, 0.02, 0.12, 0, C);
    K.box(0, -0.1, -0.1, 0.02, 0.02, 0.12, 0, C);
    const m = new THREE.Mesh(K.geo(), S.mat());
    m.userData.noMerge = true;
    const g = new THREE.Group();
    g.add(m);
    B.add(g);
    // the hand is inside the scaled rig: the bag in metres, hanging straight down along the way the figure faces, whatever the hand does
    const _q = new THREE.Quaternion(),
      _s = new THREE.Vector3();
    f.after = () => {
      B.getWorldScale(_s);
      g.scale.setScalar(1 / Math.max(1e-4, _s.x));
      B.getWorldQuaternion(_q).invert();
      g.quaternion.copy(_q).multiply(f.g.quaternion);
      g.updateMatrixWorld(true);
    };
    f.bagMesh = m;
  }
  // load the figure of a person (resolves to the figure, or null)
  function load(k) {
    if (S.figs[k]) return Promise.resolve(S.figs[k]);
    if (S.loading[k]) return S.loading[k];
    const p = VLEUTE.P[k];
    if (!p || !avail(k)) return Promise.resolve(null);
    const file = CH[p.fig];
    S.requests.push(file);
    return (S.loading[k] = Promise.all([CHL.loadAsync(U(file)), clipSet(p.clips)])
      .then(([gl, set]) => {
        delete S.loading[k];
        const f = rbPerson(gl, set, {
          h: p.h,
          stoop: p.stoop || 0,
          idleRate: 0.8 + ((k.charCodeAt(0) * 7) % 10) / 50,
        });
        f.walker = { talking: false };
        f.key = k;
        f.g.visible = false;
        f.g.name = 'verkehr ' + k;
        if (p.bag) bag(f, k);
        scene.add(f.g);
        S.figs[k] = f;
        S.loads++;
        return f;
      })
      .catch(e => {
        delete S.loading[k];
        S.err = k + ': ' + String((e && e.message) || e).slice(0, 120);
        console.warn('verkehr figure', k, e);
        return null;
      }));
  }
  function freeObj(o) {
    if (o.geometry && !o.userData.shared) o.geometry.dispose();
    if (o.userData.shared) return;
    const ms = Array.isArray(o.material) ? o.material : o.material ? [o.material] : [];
    for (const m of ms) {
      if (m === mat) continue;
      for (const t of ['map', 'normalMap', 'roughnessMap', 'metalnessMap', 'aoMap', 'emissiveMap', 'alphaMap'])
        if (m[t]) m[t].dispose();
      m.dispose();
    }
    if (o.isSkinnedMesh && o.skeleton && o.skeleton.boneTexture) o.skeleton.dispose();
  }
  function drop(k) {
    const f = S.figs[k];
    if (!f) return;
    scene.remove(f.g);
    f.g.traverse(freeObj);
    delete S.figs[k];
    S.drops++;
    markDirty();
  }
  // ---- dogs: a body of vertex colours, four legs that swing, a tail that wags ----
  const DOGS = {
    dackel: { len: 0.62, wid: 0.15, hgt: 0.16, leg: 0.12, col: [0.42, 0.22, 0.1], dark: [0.25, 0.13, 0.06], ears: 1 },
    hund: { len: 0.66, wid: 0.22, hgt: 0.24, leg: 0.32, col: [0.1, 0.09, 0.09], dark: [0.85, 0.83, 0.8], ears: 0.7 },
  };
  const dogGeo = {};
  function dog(kind) {
    const D = DOGS[kind] || DOGS.dackel,
      M = S.mat();
    if (!dogGeo[kind]) {
      const K = VPROPS.kit(),
        C = S.L(...D.col),
        Dk = S.L(...D.dark),
        z0 = D.leg,
        h = D.hgt;
      // frame of the kit: x right, y forward, z up; the dog's middle at the origin
      K.box(0, 0, z0, D.wid, D.len, h, 0, C, true); // body
      K.box(0, D.len * 0.08, z0 + 0.02, D.wid * 0.9, D.len * 0.35, h * 0.75, 0, kind === 'hund' ? Dk : C); // chest (white on Bruno)
      K.box(0, D.len / 2 + 0.03, z0 + h * 0.55, D.wid * 0.6, 0.12, h * 0.75, 0, C, true); // neck
      K.box(0, D.len / 2 + 0.1, z0 + h * 0.95, D.wid * 0.75, 0.16, h * 0.7, 0, C, true); // head
      K.box(0, D.len / 2 + 0.22, z0 + h * 0.98, D.wid * 0.42, 0.1, h * 0.38, 0, Dk, true); // muzzle
      for (const sx of [-1, 1])
        K.box(
          (sx * D.wid * 0.42) / 1,
          D.len / 2 + 0.08,
          z0 + h * (1.05 - 0.4 * D.ears),
          0.03,
          0.08,
          h * 0.6 * D.ears,
          0,
          Dk
        ); // ears
      dogGeo[kind] = { body: K.geo() };
      const L = VPROPS.kit();
      L.box(0, 0, -D.leg, 0.045, 0.05, D.leg + 0.02, 0, Dk, true);
      dogGeo[kind].leg = L.geo();
      const T = VPROPS.kit();
      T.box(0, 0.1, 0, 0.03, 0.2, 0.03, 0, C, true);
      dogGeo[kind].tail = T.geo();
    }
    const G = dogGeo[kind],
      g = new THREE.Group(),
      body = new THREE.Mesh(G.body, M);
    body.userData.shared = true;
    g.add(body);
    const legs = [];
    for (const [sx, sy] of [
      [-1, 1],
      [1, 1],
      [-1, -1],
      [1, -1],
    ]) {
      const piv = new THREE.Group();
      piv.position.set(sx * D.wid * 0.32, D.leg + 0.02, -sy * D.len * 0.36);
      const m = new THREE.Mesh(G.leg, M);
      m.userData.shared = true;
      piv.add(m);
      g.add(piv);
      legs.push(piv);
    }
    const tail = new THREE.Group();
    tail.position.set(0, D.leg + D.hgt * 0.85, D.len / 2);
    const tm = new THREE.Mesh(G.tail, M);
    tm.userData.shared = true;
    tm.rotation.y = Math.PI; // pointing backwards
    tail.add(tm);
    g.add(tail);
    for (const o of [body, ...legs.map(l => l.children[0]), tm]) {
      o.userData.noMerge = true;
      o.castShadow = false;
    }
    g.visible = false;
    scene.add(g);
    let ph = Math.random() * 6,
      wag = 0;
    return {
      g,
      kind,
      // walking speed (m/s): the legs in diagonal pairs, the tail wags (more when it stands by someone)
      anim(dt, sp) {
        const a = Math.min(1, sp / 0.4);
        ph += dt * (4 + sp * (kind === 'dackel' ? 9 : 5));
        const sw = Math.sin(ph) * 0.55 * a;
        legs[0].rotation.x = sw;
        legs[3].rotation.x = sw;
        legs[1].rotation.x = -sw;
        legs[2].rotation.x = -sw;
        wag += dt * (sp < 0.1 ? 11 : 7);
        tail.rotation.y = Math.sin(wag) * (sp < 0.1 ? 0.6 : 0.3);
        tail.rotation.x = -0.5;
      },
      free() {
        scene.remove(g);
      },
    };
  }
  Object.assign(S, { avail, load, drop, dog });
  return S;
})();
window.VFIG = VFIG;
