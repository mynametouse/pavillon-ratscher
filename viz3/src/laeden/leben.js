// ===================== feat/laeden-leben 6: people in the shops – cashiers, the baker, the DIY store's staff, customers (LLEBEN) =====================
// Falko (17.11.2026 13:27): „Die Geschäfte sollen zum Beispiel auch belebt sein … natürlich braucht es auch der Menschen, die im Supermarkt
// rumlaufen, Kassierer und all das.“ While the shop is open and the walker is in it or about to go in (its rooms stand: laeden/innen.js),
// the shop has its people: cashiers sitting at the tills that are open, the baker behind the counter, someone filling shelves in the quiet
// hours, in the DIY store the information desk and the wood cutting; customers with a basket or a trolley who walk between the shelves,
// stop, take something, queue at an open till, pay and go out through the sliding door – how many by the hour and the weekday
// (laeden/leben_plan.js: Saturday morning full, Tuesday afternoon quiet). Closed: nobody (half an hour before opening one fills shelves).
// The people are the Rocketbox figures of the streets (chars/vk_*.json, MIT) with the player's clip sets through rbPerson of
// npc/npc_real.js – walking, standing, sitting, reaching, talking as Hubert and Ronald do; each file is loaded once and cloned
// (SkeletonUtils), everything is freed again when the walker has gone (geometry, textures). Baskets and trolleys are small meshes of
// vertex colours in the material of the traffic's things (the same parameters – no new shader program). Inside, the figures are lit by
// one borrowed lamp (KERN.lights.borrow) near the walker, as the houses' fill light – the rooms themselves are unlit with the light
// baked in, so only the people take it. No new point lights.
//   LLEBEN.leute(id?) → [{ wer, art, st, x, y, kasse? }] · status() · aktiv() → the shop id or null · zahlen(u) (laeden/kauf.js: the
//   walker pays at a till – its cashier scans) · LLEBEN.FIGS · ?noleben leaves it all out
import * as THREE from 'three';
import { clone as skelClone } from 'three/examples/jsm/utils/SkeletonUtils.js';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { BASE, COARSE, QS, V, cam, scene } from '../core/head.js';
import { markDirty } from '../core/assets.js';
import { KERN } from '../core/kern.js';
import { CHL, boneTurn, rbPerson } from '../npc/npc_real.js';
import { P } from '../game/walkable.js';
import { CLOCK } from '../time/clock.js';
import { DCAL } from '../dorf/dorf_cal.js';
import { VPROPS } from '../world/village_props.js';
import { OEFFNUNG } from '../einkauf/oeffnung.js';
import { LIPLAN } from './innen_plan.js';
import { LLPLAN } from './leben_plan.js';
import { LINNEN } from './innen.js';
export const LLEBEN = (() => {
  const S = {
    on: false,
    shop: null,
    M: null,
    units: [],
    people: [],
    loads: 0,
    frees: 0,
    err: '',
    built: 0,
    phone: false,
  };
  if (!LINNEN.on || QS.has('noleben')) return S;
  const CH = window.CHARMAN || {},
    PM = window.PLAYERMAN || {};
  if (!PM.pclips_m || !PM.pclips_f || QS.get('lowfig')) return S;
  S.on = true;
  const phone = () => COARSE || !!S.phone;
  // the people of the streets (verkehr/verkehr_leute.js: age, height) – the working ages behind the counters, everyone in front
  const FIGS = [
    { f: 'vk_f02', c: 'f', h: 1.68, age: 44, staff: 1 },
    { f: 'vk_f07', c: 'f', h: 1.7, age: 35, staff: 1 },
    { f: 'vk_f15', c: 'f', h: 1.67, age: 41, staff: 1 },
    { f: 'vk_m11', c: 'm', h: 1.79, age: 38, staff: 1 },
    { f: 'vk_m20', c: 'm', h: 1.82, age: 31, staff: 1 },
    { f: 'vk_m16', c: 'm', h: 1.8, age: 22, staff: 1 },
    { f: 'vk_f14', c: 'f', h: 1.64, age: 63, stoop: 0.06 },
    { f: 'vk_m02', c: 'm', h: 1.8, age: 54, stoop: 0.03 },
    { f: 'vk_m07', c: 'm', h: 1.78, age: 48 },
    { f: 'vk_f12', c: 'f', h: 1.65, age: 19 },
  ].filter(q => CH[q.f]);
  S.FIGS = FIGS;
  // what kind of shop has which people
  const CFG = {
    supermarkt: { korb: 0.55 },
    discounter: { korb: 0.45 },
    baumarkt: { korb: 0.35 },
    baecker: { korb: 1, ohne: true },
    getraenke: { korb: 0, ohne: true },
    tankstelle: { korb: 1, ohne: true },
    apotheke: { korb: 1, ohne: true },
  };
  const U = f => BASE + 'chars/' + f;
  // ---- the models: each file once (its scene is the template of the clones), the clip sets once ----
  const BASES = new Map(),
    CLIPS = {};
  // the figure's parts by material in one skinned mesh each: a Rocketbox file has 8 parts on 3 materials (body, head, hair and lashes) –
  // 8 draw calls and 8 skeletons to update a person, now 3 (the clones inherit it). Parts with other attributes or transforms stay apart.
  function mergeParts(root) {
    root.updateMatrixWorld(true);
    const G = new Map();
    root.traverse(o => {
      if (!o.isSkinnedMesh || Array.isArray(o.material) || !o.parent || !o.skeleton) return;
      const k = o.parent.uuid + ':' + o.material.uuid + ':' + o.skeleton.uuid;
      if (!G.has(k)) G.set(k, []);
      G.get(k).push(o);
    });
    const sig = g =>
      Object.keys(g.attributes).sort().join() + '|' + !!g.index + '|' + Object.keys(g.morphAttributes || {}).length;
    let n = 0;
    for (const L of G.values()) {
      if (L.length < 2) continue;
      const a = L[0];
      if (
        L.some(
          m => sig(m.geometry) !== sig(a.geometry) || !m.matrix.equals(a.matrix) || !m.bindMatrix.equals(a.bindMatrix)
        )
      )
        continue;
      const geo = mergeGeometries(
        L.map(m => m.geometry),
        false
      );
      if (!geo) continue;
      const sm = new THREE.SkinnedMesh(geo, a.material);
      sm.name = a.name;
      sm.position.copy(a.position);
      sm.quaternion.copy(a.quaternion);
      sm.scale.copy(a.scale);
      sm.castShadow = a.castShadow;
      sm.receiveShadow = a.receiveShadow;
      sm.frustumCulled = a.frustumCulled;
      sm.renderOrder = a.renderOrder;
      Object.assign(sm.userData, a.userData);
      a.parent.add(sm);
      sm.bind(a.skeleton, a.bindMatrix);
      for (const m of L) {
        m.parent.remove(m);
        m.geometry.dispose();
      }
      n += L.length - 1;
    }
    return n;
  }
  function base(file) {
    let b = BASES.get(file);
    if (!b) {
      b = { file, gl: null, p: null, users: 0 };
      b.p = CHL.loadAsync(U(CH[file])).then(gl => {
        // (S.teile false: the parts as they come – for the before/after numbers of the test)
        if (S.teile !== false)
          try {
            b.merged = mergeParts(gl.scene);
          } catch (e) {
            S.err = 'merge: ' + String((e && e.message) || e).slice(0, 80);
          }
        b.gl = gl;
        S.loads++;
        return b;
      });
      BASES.set(file, b);
    }
    return b.p;
  }
  function clips(k) {
    if (!CLIPS[k]) {
      const FL = new THREE.FileLoader();
      FL.setResponseType('json');
      CLIPS[k] = FL.loadAsync(U(k === 'f' ? PM.pclips_f : PM.pclips_m)).catch(e => {
        delete CLIPS[k];
        throw e;
      });
    }
    return CLIPS[k];
  }
  function freeBase(b) {
    if (!b.gl) return;
    // the textures the dressing replaced (grenzland/gl_fig.js keeps them in the restore list)
    for (const [, t] of b.restore || []) if (t && t.isTexture) t.dispose();
    b.gl.scene.traverse(o => {
      if (o.geometry) o.geometry.dispose();
      for (const m of Array.isArray(o.material) ? o.material : o.material ? [o.material] : []) {
        for (const k of Object.keys(m)) if (m[k] && m[k].isTexture) m[k].dispose();
        m.dispose();
      }
    });
    BASES.delete(b.file);
    S.frees++;
  }
  // ---- work clothes: painted into the figure's own textures by body zone (grenzland/gl_fig.js GLFIG.dress, when the mode's module is
  // there – else they keep their own clothes): plain colours of no chain – a navy polo at the tills, a white top and an apron at the
  // bakery's counter, a dark green work jacket in the DIY store, a grey cardigan at a public counter ----
  const KLEID = {
    kasse: { ober: [38, 52, 82], unter: [34, 34, 38], schuh: [26, 26, 28], arm: false },
    auff: { ober: [38, 52, 82], unter: [44, 46, 52], schuh: [30, 30, 32], arm: true },
    theke: { ober: [236, 232, 222], unter: [48, 46, 44], schuh: [36, 36, 36], rock: 0.42, arm: false },
    baumarkt: { ober: [52, 72, 58], unter: [44, 48, 56], schuh: [52, 40, 30], arm: true },
    amt: { ober: [92, 96, 104], unter: [40, 40, 46], schuh: [30, 28, 26], arm: true },
  };
  const kleidOf = (art, typ) =>
    art === 'kunde'
      ? null
      : typ === 'baumarkt'
        ? KLEID.baumarkt
        : art === 'posten'
          ? KLEID.amt
          : KLEID[art] || KLEID.kasse;
  async function dress(p, K) {
    const G = window.GLFIG;
    if (!K || !G || typeof G.dress !== 'function' || typeof G.pixels !== 'function') return false;
    try {
      // one frame's breath before the painting (it takes a moment): the figure stands meanwhile in its own clothes
      await new Promise(r => setTimeout(r, 30));
      if (!p.f || !p.f.model.parent) return false;
      const b = p.bd.b;
      b.restore = b.restore || [];
      if (b.dressed) return true;
      await G.pixels(p.f.model, CH[FIGS[p.fi].f]);
      if (!p.f.model.parent) return false;
      const t0 = performance.now();
      G.dress(p.f.model, K, b.restore);
      if (typeof G.forget === 'function') G.forget(p.f.model);
      b.dressed = true;
      S.dressMs = Math.round(performance.now() - t0);
      S.dressed = (S.dressed || 0) + 1;
      markDirty();
      return true;
    } catch (e) {
      S.err = 'dress: ' + String((e && e.message) || e).slice(0, 100);
      return false;
    }
  }
  // ---- the things they carry and push: vertex colours in the traffic's material (verkehr/verkehr_fig.js: same parameters, one program) ----
  let MAT = null;
  const mat = () =>
    (MAT = MAT || new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.55, envMapIntensity: 0.9 }));
  const lin = c => (c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4));
  const Lc = (r, g, b) => [lin(r), lin(g), lin(b)];
  const GEO = {};
  // a shopping basket (red or blue plastic, two handles up): the kit's frame x right, y forward, z up; hangs below the hand
  function basketGeo(k) {
    if (GEO['korb' + k]) return GEO['korb' + k];
    const K = VPROPS.kit(),
      C = k ? Lc(0.12, 0.28, 0.62) : Lc(0.7, 0.1, 0.1),
      D = [C[0] * 0.6, C[1] * 0.6, C[2] * 0.6];
    const z0 = -0.44,
      H = 0.22,
      W = 0.3,
      Ln = 0.42;
    K.box(0, 0, z0, W, Ln, 0.02, 0, D, true);
    for (const s of [-1, 1]) {
      K.box((s * W) / 2, 0, z0, 0.015, Ln, H, 0, C, true);
      K.box(0, (s * Ln) / 2, z0, W, 0.015, H, 0, C, true);
    }
    // the handles from the long sides up into the hand
    for (const s of [-1, 1]) K.box((s * W) / 2.2, 0, z0 + H, 0.015, 0.03, -z0 - H, 0, D, true);
    K.box(0, 0, -0.02, W * 0.9, 0.035, 0.03, 0, D, true);
    return (GEO['korb' + k] = K.geo());
  }
  // a trolley: the wire basket's frame and sides, the child seat flap, the tray, chassis, castors, the handle (frame: y forward)
  function trolleyGeo() {
    if (GEO.wagen) return GEO.wagen;
    const K = VPROPS.kit(),
      M = Lc(0.72, 0.73, 0.75),
      D = Lc(0.25, 0.25, 0.27),
      R = Lc(0.6, 0.12, 0.1),
      W = 0.52,
      L0 = -0.42,
      L1 = 0.42;
    // the basket: bottom, two sides and the front as thin panels (wire seen from afar), the rim
    K.box(0, 0, 0.42, W, L1 - L0, 0.015, 0, M, true);
    for (const s of [-1, 1]) K.box((s * W) / 2, 0, 0.42, 0.012, L1 - L0, 0.46, 0, M, true);
    K.box(0, L1, 0.42, W, 0.012, 0.46, 0, M, true);
    K.box(0, L0, 0.55, W, 0.012, 0.33, 0, M, true);
    K.box(0, 0, 0.88, W + 0.02, L1 - L0, 0.012, 0, M, true);
    // the tray below and the chassis
    K.box(0, 0.05, 0.14, W * 0.85, 0.7, 0.012, 0, M, true);
    for (const s of [-1, 1]) K.box((s * W) / 2.4, 0.02, 0.06, 0.025, 0.86, 0.025, 0, M, true);
    for (const [x, y] of [
      [-0.22, 0.38],
      [0.22, 0.38],
      [-0.2, -0.36],
      [0.2, -0.36],
    ])
      K.box(x, y, 0, 0.04, 0.09, 0.1, 0, D, true);
    // the handle at the back with its red grip
    for (const s of [-1, 1]) K.box((s * W) / 2.1, L0 - 0.08, 0.86, 0.02, 0.16, 0.12, 0, M, true);
    K.box(0, L0 - 0.16, 0.97, W + 0.04, 0.04, 0.04, 0, R, true);
    return (GEO.wagen = K.geo());
  }
  // a roll cage of goods beside the one who fills the shelves: a frame with cartons
  function cageGeo() {
    if (GEO.cage) return GEO.cage;
    const K = VPROPS.kit(),
      M = Lc(0.6, 0.61, 0.63),
      Ct = [Lc(0.62, 0.5, 0.36), Lc(0.7, 0.58, 0.42), Lc(0.55, 0.45, 0.33)];
    K.box(0, 0, 0.1, 0.7, 0.8, 0.03, 0, M, true);
    for (const s of [-1, 1]) K.box((s * 0.7) / 2, 0, 0.1, 0.02, 0.8, 1.5, 0, M, true);
    K.box(0, -0.4, 0.1, 0.7, 0.02, 1.5, 0, M, true);
    for (let l = 0; l < 3; l++)
      for (let i = 0; i < 2; i++)
        K.box(-0.17 + i * 0.34, 0.05, 0.13 + l * 0.33, 0.32, 0.6, 0.3, 0, Ct[(l + i) % 3], true);
    for (const [x, y] of [
      [-0.3, 0.35],
      [0.3, 0.35],
      [-0.3, -0.35],
      [0.3, -0.35],
    ])
      K.box(x, y, 0, 0.05, 0.08, 0.1, 0, Lc(0.2, 0.2, 0.22), true);
    return (GEO.cage = K.geo());
  }
  const propMesh = geo => {
    const m = new THREE.Mesh(geo, mat());
    m.name = 'laeden-leben ding';
    m.userData.noMerge = true;
    m.castShadow = false;
    m.receiveShadow = true;
    m.matrixAutoUpdate = true;
    return m;
  };
  // ---- a person: a clone of a base figure, rbPerson's motion ----
  const _q = new THREE.Quaternion(),
    _s = new THREE.Vector3(),
    _v = new THREE.Vector3();
  async function body(fi) {
    const F = FIGS[fi],
      [b, set] = await Promise.all([base(F.f), clips(F.c)]);
    const sc = skelClone(b.gl.scene);
    const f = rbPerson({ scene: sc }, set, {
      h: F.h * (0.98 + ((fi * 37) % 5) * 0.01),
      stoop: F.stoop || 0,
      idleRate: 0.8 + ((fi * 7) % 10) / 50,
    });
    f.walker = { talking: false };
    f.g.name = 'laeden-leben ' + F.f;
    b.users++;
    return { f, b, F };
  }
  function hangBasket(p, k) {
    const B = p.f.bones && p.f.bones.RightHand;
    if (!B) return;
    const m = propMesh(basketGeo(k)),
      g = new THREE.Group();
    g.add(m);
    B.add(g);
    p.korbG = g;
    p.f.after = () => {
      B.getWorldScale(_s);
      g.scale.setScalar(1 / Math.max(1e-4, _s.x));
      B.getWorldQuaternion(_q).invert();
      g.quaternion.copy(_q).multiply(p.f.g.quaternion);
      g.updateMatrixWorld(true);
    };
  }
  // ---- the shop the walker is in (or about to go into) and its units ----
  function pick() {
    const ua = LINNEN.where(P.x, P.y);
    if (ua && ua.M.state === 'ready') return ua.M;
    let best = null,
      bd = 30;
    for (const st of LINNEN.status().mounted) {
      const M = LINNEN.shopM(st.shop);
      if (!M || M.state !== 'ready') continue;
      for (const d of M.sh.doors) {
        if (d.k === 'liefer') continue;
        const dd = Math.hypot(d.x - P.x, d.y - P.y);
        if (dd < bd) {
          bd = dd;
          best = M;
        }
      }
    }
    return best;
  }
  // a unit's ways and places: the raster, the shelves, the tills with their pay places and queues, the counters, the doors
  function prepUnit(M, u) {
    const t0 = performance.now(),
      Uu = u.U,
      bb = [1e9, 1e9, -1e9, -1e9];
    for (const v of Uu.vols) {
      const b = LIPLAN.bbOf(v.f);
      bb[0] = Math.min(bb[0], b[0]);
      bb[1] = Math.min(bb[1], b[1]);
      bb[2] = Math.max(bb[2], b[2]);
      bb[3] = Math.max(bb[3], b[3]);
    }
    const segs = M.segs.filter(
      s =>
        Math.max(s[0], s[2]) > bb[0] - 1 &&
        Math.min(s[0], s[2]) < bb[2] + 1 &&
        Math.max(s[1], s[3]) > bb[1] - 1 &&
        Math.min(s[1], s[3]) < bb[3] + 1
    );
    const doors = Uu.doors.filter(d => d.k !== 'liefer');
    const G = LLPLAN.grid(
      Uu.vols.map(v => v.f),
      segs,
      { cell: 0.4, rad: 0.3, doors: doors.map(d => [d.x - d.nx * 0.6, d.y - d.ny * 0.6]) }
    );
    const spots = u.spots || [],
      goods = u.goods || [];
    // the tills: a 'kasse' spot and the 'zahlen', 'anstellen' or two 'ende' spots its layout wrote right after it (pairing by nearness
    // would take the neighbour's pay place: the checkouts stand 2.7 m apart, a counter is 1.8 m across)
    const kassen = [];
    spots.forEach((s, j) => {
      if (s.k !== 'kasse') return;
      let z = null,
        an = null;
      const ends = [];
      for (let k = j + 1; k < spots.length && spots[k].k !== 'kasse'; k++) {
        const q = spots[k];
        if (q.k === 'zahlen' && !z) z = q;
        else if (q.k === 'anstellen' && !an) an = q;
        else if (q.k === 'ende') ends.push(q);
      }
      const d0 = doors[0];
      if (!an && ends.length && d0)
        an = ends.sort((a, b) => Math.hypot(b.x - d0.x, b.y - d0.y) - Math.hypot(a.x - d0.x, a.y - d0.y))[0];
      if (z) kassen.push({ i: kassen.length + 1, s, z, an, staff: null, queue: [], payer: null, open: false });
    });
    const theken = spots
      .filter(s => s.k === 'theke')
      .map(s => {
        const k = spots
          .filter(q => q.k === 'kunde')
          .sort((a, b) => Math.hypot(a.x - s.x, a.y - s.y) - Math.hypot(b.x - s.x, b.y - s.y))[0];
        return { s, k: k && Math.hypot(k.x - s.x, k.y - s.y) < 4 ? k : null, staff: null, queue: [], payer: null };
      });
    // behind a counter only the staff: the cells near a counter's staff place are no way for customers, nor its goods a place to stand
    for (const T of theken) {
      const i0 = Math.floor((T.s.x - 1.6 - G.x0) / G.C),
        i1 = Math.floor((T.s.x + 1.6 - G.x0) / G.C),
        j0 = Math.floor((T.s.y - 1.6 - G.y0) / G.C),
        j1 = Math.floor((T.s.y + 1.6 - G.y0) / G.C);
      for (let j = Math.max(0, j0); j <= Math.min(G.ny - 1, j1); j++)
        for (let i = Math.max(0, i0); i <= Math.min(G.nx - 1, i1); i++) {
          const x = G.x0 + (i + 0.5) * G.C,
            y = G.y0 + (j + 0.5) * G.C;
          // the staff's side of the counter: closer to the staff place than the customer's place is
          const dS = Math.hypot(x - T.s.x, y - T.s.y),
            dK = T.k ? Math.hypot(x - T.k.x, y - T.k.y) : 9;
          if (dS < 1.6 && dS < dK) G.free[j * G.nx + i] = 0;
        }
    }
    const shelves = LLPLAN.regalPlaetze(G, goods, phone() ? 24 : 60, (Uu.id.length * 977) | 1).filter(
      sp => !theken.some(T => Math.hypot(sp.x - T.s.x, sp.y - T.s.y) < 2.4)
    );
    const R = {
      u,
      U: Uu,
      typ: Uu.type,
      G,
      kassen,
      theken,
      shelves,
      doors,
      info: spots.find(s => s.k === 'info') || null,
      zuschnitt: spots.find(s => s.k === 'zuschnitt') || null,
      ms: Math.round(performance.now() - t0),
    };
    return R;
  }
  // the trolley's middle in front of its pusher (its handle 0.58 m behind that: in the hands)
  const WAGEN_D = 0.95;
  // the arms forward and down to the handle (over the walk: as npc/npc_real.js lays its work poses over the clips)
  function pushArms(p) {
    if (!p.hands) return;
    const B = p.f.bones || {};
    p.f.model.getWorldQuaternion(_q).invert();
    for (const sd of ['Left', 'Right']) {
      boneTurn(p.sv2, _q, B[sd + 'Arm'], 1, 0, 0, -0.62);
      boneTurn(p.sv2, _q, B[sd + 'Arm'], 0, 1, 0, (sd === 'Left' ? -1 : 1) * 0.28);
      boneTurn(p.sv2, _q, B[sd + 'ForeArm'], 1, 0, 0, -0.72);
    }
  }
  // the trolley: pushed in front while its customer walks, left in the aisle while one looks at a shelf or pays
  const PUSH = new Set(['rein', 'geht', 'raus', 'zurKasse', 'wartet']);
  function cart(p, dt) {
    const walking = PUSH.has(p.st) && (p.v > 0.05 || p.st === 'wartet');
    if (walking) {
      const tx = p.x + Math.sin(p.hd) * WAGEN_D,
        ty = p.y + Math.cos(p.hd) * WAGEN_D,
        d = Math.hypot(tx - p.wx, ty - p.wy),
        k = d > 1.2 ? 1 : Math.min(1, dt * 7);
      p.wx += (tx - p.wx) * k;
      p.wy += (ty - p.wy) * k;
      p.whd += angD(p.whd, p.hd) * k;
    }
    p.hands =
      walking && Math.hypot(p.x + Math.sin(p.hd) * WAGEN_D - p.wx, p.y + Math.cos(p.hd) * WAGEN_D - p.wy) < 0.35;
  }
  // ---- placing a person ----
  function place(p) {
    const f = p.f,
      zf = S.M ? S.M.zf : () => 0,
      inUnit = p.unit && LLPLAN.frei(p.unit.G, p.x, p.y);
    let z = inUnit || LINNEN.where(p.x, p.y) ? zf(p.x, p.y) : KERN.ground(p.x, p.y);
    if (!Number.isFinite(z)) z = zf(p.x, p.y);
    let x = p.x,
      y = p.y;
    if (p.sit) {
      // the hips onto the seat: a little behind its middle (npc/life.js: the seat's top minus the standing hips plus the thighs)
      z += p.sit - (f.hipH || 0.9) + 0.1;
      x -= Math.sin(p.hd) * 0.06;
      y -= Math.cos(p.hd) * 0.06;
    }
    f.g.position.copy(V(x, y, z));
    f.g.rotation.y = -p.hd;
    if (p.wagen) {
      p.wagen.position.copy(V(p.wx, p.wy, zf(p.wx, p.wy) + 0.005));
      p.wagen.rotation.y = -p.whd;
    }
    if (p.cage) {
      const cx = p.x + Math.sin(p.hd + 1.9) * 0.75,
        cy = p.y + Math.cos(p.hd + 1.9) * 0.75;
      p.cage.position.copy(V(cx, cy, zf(cx, cy) + 0.005));
      p.cage.rotation.y = -p.hd + 0.4;
    }
  }
  let seq = 0;
  // a person of the shop: art 'kunde' | 'kasse' | 'theke' | 'auff' | 'info' | 'zuschnitt'
  async function add(R, art, fi, at) {
    const run = S.built;
    let bd;
    try {
      bd = await body(fi);
    } catch (e) {
      S.err = 'figure ' + (FIGS[fi] && FIGS[fi].f) + ': ' + String((e && e.message) || e).slice(0, 100);
      return null;
    }
    // the shop changed meanwhile: not needed
    if (run !== S.built || !S.M) {
      dropBody(bd);
      return null;
    }
    const p = {
      id: ++seq,
      art,
      unit: R,
      f: bd.f,
      bd,
      fi,
      x: at.x,
      y: at.y,
      hd: at.hd || 0,
      v: 0,
      path: null,
      k: 0,
      st: at.st || 'steht',
      t: at.t || 0,
      sit: at.sit || 0,
      wait: 0,
      todo: at.todo || 0,
      post: at.post || null,
      korb: 0,
    };
    if (art === 'kunde') {
      const cf = CFG[R.typ] || CFG.supermarkt;
      if (!cf.ohne) {
        if (Math.random() < cf.korb) hangBasket(p, p.id % 2);
        else {
          p.wagen = propMesh(trolleyGeo());
          scene.add(p.wagen);
          p.sv2 = new Map();
          p.f.after = () => pushArms(p);
          p.whd = p.hd;
          p.wx = p.x + Math.sin(p.hd) * WAGEN_D;
          p.wy = p.y + Math.cos(p.hd) * WAGEN_D;
          // standing at a shelf from the start: the trolley beside, in the aisle
          if (p.st === 'schaut') {
            p.whd = p.hd + Math.PI / 2;
            p.wx = p.x - Math.sin(p.hd) * 0.55 + Math.sin(p.whd) * 0.3;
            p.wy = p.y - Math.cos(p.hd) * 0.55 + Math.cos(p.whd) * 0.3;
          }
        }
      }
      p.speed = 0.82 + Math.random() * 0.25 - (FIGS[fi].age > 60 ? 0.18 : 0);
    }
    if (art === 'auff') {
      p.cage = propMesh(cageGeo());
      scene.add(p.cage);
    }
    if (p.sit) p.f.mode = 'sit';
    place(p);
    scene.add(p.f.g);
    p.f.anim(0.01, 0);
    S.people.push(p);
    if (art !== 'kunde') dress(p, kleidOf(art, R.typ));
    markDirty();
    return p;
  }
  function dropBody(bd) {
    if (!bd) return;
    scene.remove(bd.f.g);
    bd.f.g.traverse(o => {
      if (o.isSkinnedMesh && o.skeleton && o.skeleton.boneTexture) o.skeleton.dispose();
    });
    bd.b.users--;
  }
  function remove(p) {
    const i = S.people.indexOf(p);
    if (i >= 0) S.people.splice(i, 1);
    for (const K of p.unit.kassen) {
      K.queue = K.queue.filter(q => q !== p);
      if (K.payer === p) K.payer = null;
      if (K.staff === p) K.staff = null;
    }
    for (const T of p.unit.theken) {
      T.queue = T.queue.filter(q => q !== p);
      if (T.payer === p) T.payer = null;
      if (T.staff === p) T.staff = null;
    }
    if (p.wagen) scene.remove(p.wagen);
    if (p.cage) scene.remove(p.cage);
    dropBody(p.bd);
    markDirty();
  }
  function dropAll() {
    for (const p of S.people.slice()) remove(p);
    S.people = [];
    S.units = [];
    S.M = null;
    S.shop = null;
    S.built++;
    for (const b of [...BASES.values()]) if (b.users <= 0 && b.gl) freeBase(b);
    KERN.emit('laeden:leben', { shop: null });
  }
  // ---- how many of whom, now ----
  const nowA = R => {
    const t = CLOCK.t;
    return LINNEN.openU(R.U) ? LLPLAN.andrang(R.typ, DCAL.wd(t), DCAL.min(t)) : 0;
  };
  function soon(R) {
    const n = OEFFNUNG.naechste(R.U.id);
    return !!n && !n.offen && n.min <= 45;
  }
  // which figures are free (no twins in one shop while there are others), staff from the working ages
  function freeFig(staff) {
    const used = new Set(S.people.map(p => p.fi).concat(S.pending));
    const order = FIGS.map((F, i) => i).filter(i => !staff || FIGS[i].staff);
    // a customer never in a figure that wears work clothes (a dressed file is shared by its clones)
    const free = order.filter(i => !used.has(i) && (staff || !(BASES.get(FIGS[i].f) || {}).dressed));
    if (free.length) return free[Math.floor(Math.random() * free.length)];
    return null;
  }
  S.pending = [];
  async function want(R, art, at) {
    const fi = freeFig(art !== 'kunde');
    if (fi === null) return null;
    S.pending.push(fi);
    const p = await add(R, art, fi, at);
    S.pending = S.pending.filter(q => q !== fi);
    return p;
  }
  const MAXP = () => (phone() ? 5 : 10);
  // the start: staff at their posts, customers already between the shelves (kunden: false – only the staff)
  async function populateUnit(R, kunden = true) {
    const run = S.built,
      open = LINNEN.openU(R.U),
      a = nowA(R),
      B = LLPLAN.besetzung(R.typ, a, { kassen: R.kassen.length, theken: R.theken.length, phone: phone() });
    R.B = B;
    R.a = a;
    R.staffed = open;
    // tills open from the first ones: the first B.kassen
    R.kassen.forEach((K, i) => (K.open = open && i < B.kassen));
    const jobs = [];
    if (open) {
      for (const K of R.kassen.filter(q => q.open))
        jobs.push(['kasse', { x: K.s.x, y: K.s.y, hd: Math.atan2(K.s.dir[0], K.s.dir[1]), sit: 0.55, post: K }]);
      R.theken
        .slice(0, B.theke)
        .forEach(T => jobs.push(['theke', { x: T.s.x, y: T.s.y, hd: Math.atan2(T.s.dir[0], T.s.dir[1]), post: T }]));
      if (B.info && R.info)
        jobs.push(['info', { x: R.info.x, y: R.info.y, hd: Math.atan2(R.info.dir[0], R.info.dir[1]) }]);
      if (B.zuschnitt && R.zuschnitt)
        jobs.push([
          'zuschnitt',
          { x: R.zuschnitt.x, y: R.zuschnitt.y, hd: Math.atan2(R.zuschnitt.dir[0], R.zuschnitt.dir[1]) },
        ]);
    }
    // half an hour before opening and in the quiet hours someone fills the shelves (not on a closed day)
    const markt = R.typ === 'supermarkt' || R.typ === 'discounter';
    if (((open && B.auff) || (!open && soon(R) && markt)) && R.shelves.length) {
      const sp = R.shelves[Math.floor(Math.random() * R.shelves.length)];
      jobs.push(['auff', { x: sp.x, y: sp.y, hd: sp.hd, st: 'fuellt', t: 3 }]);
    }
    for (const [art, at] of jobs) {
      if (run !== S.built || S.people.length + S.pending.length >= MAXP()) break;
      const p = await want(R, art, at);
      if (p && at.post) at.post.staff = p;
    }
    if (!kunden || !open) return;
    // customers already inside: at the shelves
    const nk = Math.min(B.kunden, MAXP() - S.people.length - S.pending.length);
    for (let i = 0; i < nk && R.shelves.length; i++) {
      if (run !== S.built) return;
      const sp = R.shelves[Math.floor(Math.random() * R.shelves.length)];
      await want(R, 'kunde', {
        x: sp.x,
        y: sp.y,
        hd: sp.hd,
        st: 'schaut',
        t: 2 + Math.random() * 8,
        todo: 1 + Math.floor(Math.random() * 4),
      });
    }
  }
  async function populate() {
    for (const R of S.units) await populateUnit(R, true);
  }
  // ---- moving: along the path, turning smoothly, waiting for whoever stands in the way ----
  function go(p, x, y) {
    const path = p.unit ? LLPLAN.pfad(p.unit.G, p.x, p.y, x, y) : null;
    p.path = path || [
      [p.x, p.y],
      [x, y],
    ];
    p.k = 1;
    return !!path;
  }
  const angD = (a, b) => {
    let d = b - a;
    while (d > Math.PI) d -= Math.PI * 2;
    while (d < -Math.PI) d += Math.PI * 2;
    return d;
  };
  function blocked(p, dx, dy) {
    const r = p.wagen ? 1.35 : 0.75;
    for (const q of S.people) {
      if (q === p || q.sit) continue;
      const ox = q.x - p.x,
        oy = q.y - p.y,
        d = Math.hypot(ox, oy);
      if (d < r && (ox * dx + oy * dy) / (d || 1) > 0.55 && (q.v < 0.05 || q.id < p.id)) return true;
    }
    const ox = P.x - p.x,
      oy = P.y - p.y,
      d = Math.hypot(ox, oy);
    return P.mode === 'walk' && d < r + 0.1 && (ox * dx + oy * dy) / (d || 1) > 0.5;
  }
  // true when the end of the path is reached
  function walk(p, dt) {
    if (!p.path || p.k >= p.path.length) {
      p.v = Math.max(0, p.v - dt * 2.5);
      return true;
    }
    const [tx, ty] = p.path[p.k],
      dx = tx - p.x,
      dy = ty - p.y,
      d = Math.hypot(dx, dy);
    if (d < 0.12) {
      p.k++;
      if (p.k >= p.path.length) return true;
      return false;
    }
    const want = Math.atan2(dx, dy),
      da = angD(p.hd, want);
    p.hd += Math.max(-dt * 4.5, Math.min(dt * 4.5, da));
    const fx = Math.sin(p.hd),
      fy = Math.cos(p.hd);
    const stop = blocked(p, fx, fy);
    if (stop) p.wait += dt;
    else p.wait = 0;
    const vmax = (p.speed || 0.95) * (Math.abs(da) > 1.2 ? 0.3 : 1) * (stop && p.wait < 3 ? 0 : 1),
      endSlow = p.k === p.path.length - 1 ? Math.min(1, d / 0.6 + 0.25) : 1;
    p.v += (vmax * endSlow - p.v) * Math.min(1, dt * 3);
    const step = Math.min(d, p.v * dt);
    p.x += fx * step * (Math.abs(da) < 1.2 ? 1 : 0.4) + (dx / d) * step * (Math.abs(da) < 1.2 ? 0 : 0.6);
    p.y += fy * step * (Math.abs(da) < 1.2 ? 1 : 0.4) + (dy / d) * step * (Math.abs(da) < 1.2 ? 0 : 0.6);
    return false;
  }
  function turnTo(p, hd, dt) {
    const da = angD(p.hd, hd);
    p.hd += Math.max(-dt * 3, Math.min(dt * 3, da));
    return Math.abs(da) < 0.05;
  }
  // ---- what the customers do ----
  const doorOf = R => R.doors.find(d => d.k === 'main') || R.doors[0];
  function toTill(p) {
    const R = p.unit,
      open = R.kassen.filter(K => K.open && K.staff);
    if (!open.length) {
      // no till here (a counter shop or the bakery): its counter, else out
      const T = R.theken.find(q => q.staff && q.k);
      if (T) {
        T.queue.push(p);
        p.post = T;
        p.st = 'zurTheke';
        const n = T.queue.length - 1;
        go(p, T.k.x - T.k.dir[0] * n * 0.85, T.k.y - T.k.dir[1] * n * 0.85);
        return;
      }
      out(p);
      return;
    }
    const K = open.sort((a, b) => a.queue.length - b.queue.length)[0];
    K.queue.push(p);
    p.post = K;
    p.st = 'zurKasse';
    queueGo(p);
  }
  // the place in the queue: the pay place for the first, then back from the queue's start along it
  function queueSpot(K, n) {
    if (n === 0) return [K.z.x, K.z.y];
    const a = K.an || K.z,
      bx = -(a.dir ? a.dir[0] : 0),
      by = -(a.dir ? a.dir[1] : 1),
      gap = 0.95;
    return [a.x + bx * (n - 1) * gap, a.y + by * (n - 1) * gap];
  }
  function queueGo(p) {
    const K = p.post,
      n = K.queue.indexOf(p),
      [x, y] = queueSpot(K, n);
    p.qn = n;
    go(p, x, y);
  }
  function out(p) {
    const d = doorOf(p.unit);
    p.st = 'raus';
    p.post = null;
    if (!d) {
      remove(p);
      return;
    }
    go(p, d.x - d.nx * 1.0, d.y - d.ny * 1.0);
    p.path.push([d.x + d.nx * 1.5, d.y + d.ny * 1.5], [d.x + d.nx * 6, d.y + d.ny * 6]);
    p.outside = true;
  }
  function browse(p) {
    const R = p.unit;
    // at a counter shop (the bakery) one goes to the counter
    if (!R.shelves.length || p.todo <= 0 || (R.theken.length && !R.kassen.length)) return toTill(p);
    const sp = R.shelves[Math.floor(Math.random() * R.shelves.length)];
    p.ziel = sp;
    p.st = 'geht';
    go(p, sp.x, sp.y);
  }
  // a new customer through the main door
  async function arrive(R) {
    const d = doorOf(R);
    if (!d) return;
    const p = await want(R, 'kunde', {
      x: d.x + d.nx * 6,
      y: d.y + d.ny * 6,
      hd: Math.atan2(-d.nx, -d.ny),
      st: 'rein',
      todo: 2 + Math.floor(Math.random() * 4),
    });
    if (!p) return;
    p.path = [
      [p.x, p.y],
      [d.x + d.nx * 1.5, d.y + d.ny * 1.5],
      [d.x - d.nx * 1.4, d.y - d.ny * 1.4],
    ];
    p.k = 1;
  }
  function custTick(p, dt) {
    const done = walk(p, dt);
    if (p.st === 'rein') {
      if (done) browse(p);
    } else if (p.st === 'geht') {
      if (done) {
        p.st = 'schaut';
        p.t = 4 + Math.random() * 9;
        p.reach = 1 + Math.random() * 2.5;
      }
    } else if (p.st === 'schaut') {
      if (p.ziel) turnTo(p, p.ziel.hd, dt);
      p.t -= dt;
      p.reach -= dt;
      // now and then a hand to the shelf (low shelves bending down)
      if (p.reach <= 0 && !p.f.over) {
        const low = p.ziel && p.ziel.z < 0.6;
        p.f.over = { k: low ? 'pickupLow' : 'interact', w: 1 };
        p.overT = low ? 1.6 : 1.3;
        p.reach = 4 + Math.random() * 5;
        p.korb++;
      }
      if (p.t <= 0) {
        p.todo--;
        browse(p);
      }
    } else if (p.st === 'zurKasse' || p.st === 'wartet') {
      const K = p.post;
      if (!K || !K.open) return toTill(p);
      const n = K.queue.indexOf(p);
      if (n !== p.qn) queueGo(p);
      if (done) {
        p.st = 'wartet';
        // the first faces the cashier, the others the way the queue goes (towards the till)
        const a = n === 0 || !K.an ? K.z.dir : K.an.dir;
        turnTo(p, Math.atan2(a[0], a[1]), dt);
        if (n === 0 && !K.payer && !K.walker && Math.hypot(p.x - K.z.x, p.y - K.z.y) < 0.5) {
          K.payer = p;
          p.st = 'zahlt';
          p.t = 6 + Math.min(14, p.korb * 2.2) + Math.random() * 4;
        }
      }
    } else if (p.st === 'zahlt') {
      const K = p.post;
      turnTo(p, Math.atan2(K.z.dir[0], K.z.dir[1]), dt);
      p.f.walker.talking = p.t < 3;
      p.t -= dt;
      if (p.t <= 0) {
        p.f.walker.talking = false;
        K.queue = K.queue.filter(q => q !== p);
        K.payer = null;
        for (const q of K.queue) q.qn = -1;
        out(p);
      }
    } else if (p.st === 'zurTheke') {
      const T = p.post;
      if (done) {
        p.st = 'bestellt';
        p.t = 8 + Math.random() * 8;
      }
      if (T && T.k) turnTo(p, Math.atan2(T.k.dir[0], T.k.dir[1]), dt);
    } else if (p.st === 'bestellt') {
      const T = p.post;
      const first = T && T.queue[0] === p;
      if (first) {
        T.payer = p;
        p.f.walker.talking = true;
        p.t -= dt;
      }
      if (T && T.k) turnTo(p, Math.atan2(T.k.dir[0], T.k.dir[1]), dt);
      if (p.t <= 0) {
        p.f.walker.talking = false;
        if (T) {
          T.queue = T.queue.filter(q => q !== p);
          T.payer = null;
          T.queue.forEach((q, i) => {
            if (q.st === 'bestellt' && i >= 0) go(q, T.k.x - T.k.dir[0] * i * 0.85, T.k.y - T.k.dir[1] * i * 0.85);
          });
        }
        out(p);
      }
    } else if (p.st === 'raus') {
      if (done) remove(p);
    }
  }
  function staffTick(p, dt) {
    if (p.art === 'kasse') {
      const K = p.post;
      // scanning while somebody pays (the walker too: laeden/kauf.js sets K.walker)
      const busy = !!(K && (K.payer || K.walker));
      p.f.speak = busy;
      p.f.walker.talking = false;
      return;
    }
    if (p.art === 'theke') {
      const T = p.post;
      p.f.walker.talking = !!(T && (T.payer || T.walker));
      return;
    }
    if (p.art === 'zuschnitt' || p.art === 'info') {
      p.t -= dt;
      if (p.t <= 0) {
        p.f.over = p.f.over ? null : { k: p.art === 'zuschnitt' ? 'interactLoop' : 'talk', w: 1 };
        p.t = 3 + Math.random() * 6;
      }
      return;
    }
    if (p.art === 'auff') {
      p.t -= dt;
      if (p.t <= 0) {
        p.f.over = p.f.over ? null : { k: Math.random() < 0.5 ? 'pickupLow' : 'interactLoop', w: 1 };
        p.t = p.f.over ? 2.2 : 1.5 + Math.random() * 2;
      }
    }
  }
  // ---- posts: one person at a public building's counter or desk while it is open and the walker is near (einkauf/oeffentlich.js) ----
  //   LLEBEN.posten({ id, x, y, hd (rad, compass), z: () => floor, sit: seat's top | 0, offen: () => bool, fig: 'vk_f02', near: 25,
  //   innen: true (the borrowed lamp lights it), arbeit: 'interactLoop' | null })
  const POSTS = [];
  S.posts = POSTS;
  S.posten = def => {
    const q = Object.assign({ near: 25, sit: 0, innen: true, fig: 'vk_f02', arbeit: null }, def, {
      p: null,
      loading: false,
      t: 0,
    });
    const i = POSTS.findIndex(o => o.id === q.id);
    if (i >= 0) {
      dropPost(POSTS[i]);
      POSTS.splice(i, 1, q);
    } else POSTS.push(q);
    return q;
  };
  function dropPost(q) {
    if (!q.p) return;
    scene.remove(q.p.f.g);
    dropBody(q.p.bd);
    q.p = null;
    for (const b of [...BASES.values()]) if (b.users <= 0 && b.gl && !S.M) freeBase(b);
    markDirty();
  }
  async function makePost(q) {
    q.loading = true;
    const fi = Math.max(
      0,
      FIGS.findIndex(F => F.f === q.fig)
    );
    try {
      const bd = await body(fi);
      q.loading = false;
      const zf = typeof q.z === 'function' ? q.z() : q.z || 0;
      const p = { f: bd.f, bd, fi, x: q.x, y: q.y, hd: q.hd || 0, sit: q.sit, v: 0, acc: 0, art: 'posten' };
      if (q.sit) p.f.mode = 'sit';
      let x = p.x,
        y = p.y,
        z = zf;
      if (p.sit) {
        z += p.sit - (p.f.hipH || 0.9) + 0.1;
        x -= Math.sin(p.hd) * 0.06;
        y -= Math.cos(p.hd) * 0.06;
      }
      p.f.g.position.copy(V(x, y, z));
      p.f.g.rotation.y = -p.hd;
      scene.add(p.f.g);
      p.f.anim(0.01, 0);
      q.p = p;
      markDirty();
      if (q.kleid) dress(p, q.kleid === true ? KLEID.amt : q.kleid);
    } catch (e) {
      q.loading = false;
      S.err = 'post ' + q.id + ': ' + String((e && e.message) || e).slice(0, 100);
    }
  }
  function postTick(dt) {
    for (const q of POSTS) {
      let want = false;
      try {
        want = Math.hypot(P.x - q.x, P.y - q.y) < q.near && !!q.offen();
      } catch (e) {
        want = false;
      }
      if (want && !q.p && !q.loading) makePost(q);
      else if (!want && q.p && Math.hypot(P.x - q.x, P.y - q.y) > q.near + 8) dropPost(q);
      else if (!want && q.p && !q.offen()) dropPost(q);
      const p = q.p;
      if (!p) continue;
      // at work now and then (typing, sorting, the till)
      q.t -= dt;
      if (q.t <= 0) {
        p.f.over = p.f.over || !q.arbeit ? null : { k: q.arbeit, w: 1 };
        q.t = 3 + Math.random() * 5;
      }
      p.f.walker.talking = !!q.redet;
      p.f.speak = !!q.redet && !!p.sit;
      p.acc += dt;
      p.f.g.getWorldPosition(_v);
      const d2 = _v.distanceToSquared(cam.position);
      if (d2 < 22 * 22 || p.acc > 0.25) {
        p.f.anim(p.acc, 0);
        p.acc = 0;
        if (d2 < 30 * 30) markDirty();
      }
    }
  }
  // ---- the people the eye cannot see: behind the tall shelves (gondolas, racks with back panels, the empties' counter) while the eye is
  // below their tops – not drawn, posed less often. From inside a supermarket most of them are in other aisles. Three lines of sight
  // (to the middle and 0.3 m either side): hidden only when all three cross something tall. ----
  const TALL = { M: null, list: [] };
  function tallOf(M) {
    if (TALL.M === M) return TALL.list;
    TALL.M = M;
    TALL.list = [];
    for (const u of M.units || [])
      for (const B of u.tall || [])
        TALL.list.push({ x: B[0], y: B[1], c: Math.cos(B[4]), s: Math.sin(B[4]), hx: B[2] / 2, hy: B[3] / 2 });
    return TALL.list;
  }
  // the segment a→b through the box (in the box's frame, the slab test)
  function cuts(B, ax, ay, bx, by) {
    const x0 = (ax - B.x) * B.c + (ay - B.y) * B.s,
      y0 = -(ax - B.x) * B.s + (ay - B.y) * B.c,
      dx = (bx - B.x) * B.c + (by - B.y) * B.s - x0,
      dy = -(bx - B.x) * B.s + (by - B.y) * B.c - y0;
    let t0 = 0,
      t1 = 1;
    if (Math.abs(dx) < 1e-9) {
      if (x0 < -B.hx || x0 > B.hx) return false;
    } else {
      let a = (-B.hx - x0) / dx,
        b = (B.hx - x0) / dx;
      if (a > b) [a, b] = [b, a];
      t0 = Math.max(t0, a);
      t1 = Math.min(t1, b);
      if (t0 > t1) return false;
    }
    if (Math.abs(dy) < 1e-9) return y0 >= -B.hy && y0 <= B.hy;
    let a = (-B.hy - y0) / dy,
      b = (B.hy - y0) / dy;
    if (a > b) [a, b] = [b, a];
    return Math.max(t0, a) <= Math.min(t1, b);
  }
  const holds = (B, x, y) => {
    const lx = (x - B.x) * B.c + (y - B.y) * B.s,
      ly = -(x - B.x) * B.s + (y - B.y) * B.c;
    return Math.abs(lx) <= B.hx + 0.05 && Math.abs(ly) <= B.hy + 0.05;
  };
  function behind(T, ex, ey, px, py) {
    const dx = px - ex,
      dy = py - ey,
      L = Math.hypot(dx, dy) || 1,
      nx = (-dy / L) * 0.45,
      ny = (dx / L) * 0.45;
    for (let k = -1; k <= 1; k++) {
      const qx = px + nx * k,
        qy = py + ny * k;
      let blocked = false;
      for (const B of T)
        if (cuts(B, ex, ey, qx, qy)) {
          blocked = true;
          break;
        }
      if (!blocked) return false;
    }
    return true;
  }
  let cullT = 0,
    cullX = 1e9,
    cullY = 1e9;
  function cullPeople(dt) {
    const ex = cam.position.x,
      ey = -cam.position.z;
    // at once when the eye has moved (a cut, a door, a fade – CI picture markt_kasse showed the cashiers still hidden from the view
    // before), else a dozen times a second for the people walking out from behind a shelf
    cullT -= dt;
    if (cullT > 0 && Math.hypot(ex - cullX, ey - cullY) < 0.25) return;
    cullT = 0.08;
    cullX = ex;
    cullY = ey;
    const M = S.M;
    let T = S.cull === false || !M ? null : tallOf(M);
    if (T && T.length) {
      const zf = M.zf ? M.zf(ex, ey) : P.feet;
      T = Number.isFinite(zf) && cam.position.y - zf < 1.75 ? T.filter(B => !holds(B, ex, ey)) : null;
    }
    let ch = false,
      hid = 0;
    for (const p of S.people) {
      const vis = !T || !T.length || !behind(T, ex, ey, p.x, p.y);
      if (!vis) hid++;
      if (p.f.g.visible !== vis) {
        p.f.g.visible = vis;
        if (p.wagen) p.wagen.visible = vis;
        if (p.cage) p.cage.visible = vis;
        ch = true;
      }
    }
    S.hid = hid;
    if (ch) markDirty();
  }
  // ---- the round ----
  let acc = 0,
    arriveT = 4,
    staffT = 2,
    lostT = 0;
  const BUSY = { arrive: false };
  function tick(dt) {
    if (!S.on) return;
    if (POSTS.length)
      try {
        postTick(dt);
      } catch (e) {
        S.err = 'posts: ' + String((e && e.message) || e).slice(0, 120);
      }
    acc += dt;
    if (acc >= 0.5) {
      acc = 0;
      const M = pick();
      if (M !== S.M) {
        if (!M) lostT += 0.5;
        if (M || lostT > 3) {
          lostT = 0;
          dropAll();
          if (M) start(M);
        }
      } else lostT = 0;
    }
    if (!S.M) return lightAsk(POSTS.some(q => q.p && q.innen && Math.hypot(P.x - q.x, P.y - q.y) < 14));
    // a unit that opens while the walker is there gets its staff
    staffT -= dt;
    if (staffT <= 0) {
      staffT = 2;
      for (const R of S.units)
        if (!R.staffed && LINNEN.openU(R.U) && !BUSY.arrive) {
          R.staffed = true;
          populateUnit(R, false).catch(e => (S.err = 'staff: ' + String((e && e.message) || e).slice(0, 120)));
        }
    }
    // customers come while the shop is open and has fewer than it should (one every few seconds)
    arriveT -= dt;
    if (arriveT <= 0 && !BUSY.arrive) {
      arriveT = 5 + Math.random() * 9;
      for (const R of S.units) {
        const a = nowA(R),
          B = LLPLAN.besetzung(R.typ, a, { kassen: R.kassen.length, theken: R.theken.length, phone: phone() }),
          n = S.people.filter(p => p.unit === R && p.art === 'kunde').length;
        if (a > 0 && n < B.kunden && S.people.length + S.pending.length < MAXP()) {
          BUSY.arrive = true;
          arrive(R).finally(() => (BUSY.arrive = false));
          break;
        }
      }
    }
    try {
      cullPeople(dt);
    } catch (e) {
      S.err = 'cull: ' + String((e && e.message) || e).slice(0, 120);
    }
    let moving = false;
    for (const p of S.people.slice()) {
      try {
        if (p.art === 'kunde') custTick(p, dt);
        else staffTick(p, dt);
        if (p.overT !== undefined) {
          p.overT -= dt;
          if (p.overT <= 0) {
            p.f.over = null;
            delete p.overT;
          }
        }
        if (S.people.includes(p)) {
          if (p.wagen) cart(p, dt);
          place(p);
          // the pose: every frame near the camera, a few times a second further away
          p.f.g.getWorldPosition(_v);
          const d2 = _v.distanceToSquared(cam.position);
          p.acc = (p.acc || 0) + dt;
          if ((d2 < 22 * 22 && p.f.g.visible) || p.acc > 0.25) {
            // the arms' own turns of the last pose back first (then the clips, rbPerson's poses, ours again)
            if (p.sv2) {
              for (const [b, q] of p.sv2) b.quaternion.copy(q);
              p.sv2.clear();
            }
            p.f.anim(p.acc, p.v);
            p.acc = 0;
            if (d2 < 40 * 40) moving = true;
          }
        }
      } catch (e) {
        S.err = 'tick: ' + String((e && e.message) || e).slice(0, 120);
      }
    }
    if (moving) markDirty();
    lightAsk(true);
  }
  function start(M) {
    S.M = M;
    S.shop = M.sh.id;
    S.built++;
    const t0 = performance.now();
    S.units = [];
    for (const u of M.units) {
      if (!CFG[u.U.type]) continue;
      try {
        S.units.push(prepUnit(M, u));
      } catch (e) {
        S.err = 'prep ' + u.U.id + ': ' + String((e && e.message) || e).slice(0, 120);
      }
    }
    S.prepMs = Math.round(performance.now() - t0);
    if (!S.units.length) return;
    populate().catch(e => (S.err = 'populate: ' + String((e && e.message) || e).slice(0, 120)));
    KERN.emit('laeden:leben', { shop: S.shop });
  }
  KERN.tick(tick, 'laeden-leben');
  // ---- the doors open for them, they stand in the way ----
  LINNEN.doorWant = D => {
    if (!S.M || D.sh !== S.M.sh) return false;
    for (const p of S.people)
      if ((p.st === 'rein' || p.st === 'raus') && Math.hypot(p.x - D.d.x, p.y - D.d.y) < 3.6) return true;
    return false;
  };
  LINNEN.pushFigs = (pt, r) => {
    let moved = false;
    for (const p of S.people) {
      const dx = pt[0] - p.x,
        dy = pt[1] - p.y,
        d = Math.hypot(dx, dy),
        rr = r + (p.sit ? 0.2 : 0.24);
      if (d < rr && d > 1e-4) {
        pt[0] = p.x + (dx / d) * rr;
        pt[1] = p.y + (dy / d) * rr;
        moved = true;
      }
      if (p.wagen) {
        const wx = p.wx,
          wy = p.wy,
          ex = pt[0] - wx,
          ey = pt[1] - wy,
          e = Math.hypot(ex, ey);
        if (e < r + 0.4 && e > 1e-4) {
          pt[0] = wx + (ex / e) * (r + 0.4);
          pt[1] = wy + (ey / e) * (r + 0.4);
          moved = true;
        }
      }
    }
    return moved;
  };
  // ---- one borrowed lamp near the walker while the shop's people are around him (the rooms are unlit: only the people take it) ----
  let lampWant = false;
  const _lp = new THREE.Vector3();
  function lightAsk(v) {
    lampWant = v && P.mode === 'walk' && (S.M ? !!LINNEN.where(P.x, P.y) : true);
  }
  function lampAt(l, force) {
    if (!l) return;
    const zf = S.M ? S.M.zf(P.x, P.y) : P.feet;
    _lp.set(P.x, zf + 2.6, -P.y).lerp(cam.position, 0.35);
    if (force) {
      l.color.setHex(0xfff1df);
      l.distance = 28;
      l.decay = 0;
      l.intensity = 1.25;
    } else if (_lp.distanceToSquared(l.position) < 0.01) return;
    l.position.copy(_lp);
    markDirty();
  }
  KERN.lights.borrow({
    id: 'laeden:leben',
    n: 1,
    prio: 1,
    want: () => lampWant,
    on: ls => lampAt(ls[0], true),
    tick: ls => lampAt(ls[0], false),
    off: () => markDirty(),
  });
  // ---- for the shopping (laeden/kauf.js) and the tests ----
  S.aktiv = () => S.shop;
  S.leute = id =>
    S.people
      .filter(p => !id || p.unit.U.id === id || S.shop === id)
      .map(p => ({
        wer: FIGS[p.fi].f,
        art: p.art,
        st: p.st,
        x: +p.x.toFixed(2),
        y: +p.y.toFixed(2),
        unit: p.unit.U.id,
        sitzt: !!p.sit,
        kasse: p.art === 'kasse' && p.post ? p.post.i : undefined,
        korb: p.korbG ? 'korb' : p.wagen ? 'wagen' : '',
        verdeckt: !p.f.g.visible,
      }));
  S.kassen = () =>
    S.units.flatMap(R =>
      R.kassen.map(K => ({
        unit: R.U.id,
        i: K.i,
        open: K.open && !!K.staff,
        queue: K.queue.length,
        z: [+K.z.x.toFixed(2), +K.z.y.toFixed(2)],
        seat: [+K.s.x.toFixed(2), +K.s.y.toFixed(2)],
      }))
    );
  // the till or counter at a place (within r m of its pay place), for the walker
  S.kasseAt = (x, y, r = 1.2) => {
    for (const R of S.units) {
      for (const K of R.kassen) if (K.z && Math.hypot(K.z.x - x, K.z.y - y) < r) return { R, K, theke: false };
      for (const T of R.theken) if (T.k && Math.hypot(T.k.x - x, T.k.y - y) < r) return { R, K: T, theke: true };
    }
    return null;
  };
  S.status = () => ({
    on: S.on,
    shop: S.shop,
    units: S.units.map(R => ({
      id: R.U.id,
      typ: R.typ,
      a: R.a === undefined ? null : +R.a.toFixed(2),
      B: R.B || null,
      cells: R.G.n,
      shelves: R.shelves.length,
      kassen: R.kassen.length,
      theken: R.theken.length,
      ms: R.ms,
    })),
    people: S.people.length,
    pending: S.pending.length,
    bases: BASES.size,
    loads: S.loads,
    frees: S.frees,
    lamp: lampWant,
    err: S.err,
    prepMs: S.prepMs,
    dressed: S.dressed || 0,
    dressMs: S.dressMs || 0,
    // people not drawn behind tall shelves now; parts merged per figure file (8 → 3)
    hid: S.hid || 0,
    merged: [...BASES.values()].reduce((a, b) => a + (b.merged || 0), 0),
  });
  S.dropAll = dropAll;
  return S;
})();
window.LLEBEN = LLEBEN;
