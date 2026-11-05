// ===================== feat/welt-dinge 2: parking places and things from the aerial photo in 3D (DINGE) =====================
// Falko, 5.11.2026 22:52 / 23:02: the cars of the aerial photo as parking places, occupied by the time of day (more at night, fewer by day);
// 23:17: „Wichtig ist natürlich trotzdem immer der Realismus.“ Every car the photo of 07.04.2024 shows (found by a detector, checked by
// eye – tools/welt-dinge) is a place: a private drive or yard ('hof'), the kerb of a street ('strasse') or a works yard ('betrieb'). Whether
// a car stands there follows the weekday and the hour (commuters leave in the morning and come back in the afternoon, works yards fill on
// workdays, Sundays most stay home) – the same places tend to be the commuters', the rest changes from day to day. A car appears or leaves
// only where nobody sees it: behind the camera, or far away. The car keeps the body type (from its length) and the colour of the photo.
// The other things (pools, trailers, a lorry …) stand still. Built per 120-m cell when the observer comes near (instanced cars – one draw
// call per body type and cell – and the things merged), freed far away; solid for the walker and for vehicles (VEH.extra boxes).
// Data: dist/dinge/<area>.json (viz3/extra/welt-dinge, made by tools/welt-dinge/prep.py).
import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { BASE, COARSE, cam, scene } from '../core/head.js';
import { KERN } from '../core/kern.js';
import { LOADLOG, markDirty, whenLoaded } from '../core/assets.js';
import { CLOCK } from '../time/clock.js';
import { VEH } from '../vehicles/vehicle.js';
import { DCAL } from '../dorf/dorf_cal.js';
import { DCARS } from '../dorf/dorf_cars.js';
import { DMOD } from './dinge_modelle.js';
export const DINGE = (() => {
  const S = {
    on: false,
    ready: false,
    places: [],
    things: [],
    cells: new Map(),
    built: 0,
    changes: 0,
    held: 0,
    frozen: false,
    areas: ['ratscher'],
    err: null,
  };
  if (!DMOD.on || !window.RATSCHER || !RATSCHER.on) return S;
  S.on = true;
  const CELL = 120,
    NEAR = COARSE ? 260 : 380,
    FAR = NEAR + 160,
    SEE = 320; // beyond this a change goes unseen even in view
  // colours of the data (sRGB, tools/welt-dinge/prep.py PAL) → linear for the instance colour
  const PAL = [
    [18, 18, 20],
    [58, 60, 64],
    [150, 152, 155],
    [225, 225, 220],
    [25, 38, 72],
    [52, 92, 160],
    [150, 22, 20],
    [30, 62, 40],
    [160, 135, 100],
    [210, 160, 30],
  ].map(c => new THREE.Color().setRGB(c[0] / 255, c[1] / 255, c[2] / 255, THREE.SRGBColorSpace));
  const TYPES = ['klein', 'kompakt', 'kombi', 'suv', 'van'],
    KINDS = ['hof', 'strasse', 'betrieb'];
  const frac = v => v - Math.floor(v),
    hash = (a, b) => frac(Math.sin(a * 12.9898 + b * 78.233 + 0.5) * 43758.5453);
  // ---- occupancy: the share of the places of a kind with a car, over the hours of a workday, a Saturday, a Sunday ----
  // [hour, share] keyframes, linear between (a village in Thuringia: most commute by car, out 6–8 h, back 15:30–18:30)
  const CURVES = {
    hof: {
      werktag: [
        [0, 0.95],
        [5.5, 0.95],
        [6.5, 0.8],
        [8, 0.52],
        [12, 0.5],
        [13, 0.55],
        [15, 0.55],
        [17, 0.78],
        [18.5, 0.9],
        [20, 0.86],
        [22, 0.93],
        [24, 0.95],
      ],
      samstag: [
        [0, 0.93],
        [8, 0.92],
        [9.5, 0.68],
        [12, 0.66],
        [14, 0.78],
        [17, 0.75],
        [19, 0.78],
        [22, 0.9],
        [24, 0.93],
      ],
      sonntag: [
        [0, 0.92],
        [9, 0.92],
        [11, 0.82],
        [14, 0.68],
        [17, 0.72],
        [19, 0.88],
        [24, 0.93],
      ],
    },
    strasse: {
      werktag: [
        [0, 0.88],
        [6, 0.86],
        [8, 0.48],
        [16, 0.45],
        [18.5, 0.78],
        [24, 0.88],
      ],
      samstag: [
        [0, 0.86],
        [9, 0.8],
        [11, 0.6],
        [16, 0.7],
        [20, 0.8],
        [24, 0.86],
      ],
      sonntag: [
        [0, 0.86],
        [12, 0.8],
        [14, 0.9],
        [18, 0.85],
        [24, 0.86],
      ],
    },
    betrieb: {
      werktag: [
        [0, 0.15],
        [5.5, 0.15],
        [7, 0.92],
        [15.5, 0.9],
        [17.5, 0.25],
        [24, 0.15],
      ],
      samstag: [
        [0, 0.15],
        [7, 0.15],
        [8, 0.4],
        [12, 0.4],
        [13, 0.15],
        [24, 0.15],
      ],
      sonntag: [
        [0, 0.12],
        [24, 0.12],
      ],
    },
  };
  function curve(K, h) {
    for (let i = 1; i < K.length; i++)
      if (h <= K[i][0]) {
        const [h0, v0] = K[i - 1],
          [h1, v1] = K[i];
        return v0 + ((v1 - v0) * (h - h0)) / Math.max(1e-6, h1 - h0);
      }
    return K[K.length - 1][1];
  }
  const dayType = wd => (wd === 0 ? 'sonntag' : wd === 6 ? 'samstag' : 'werktag');
  S.share = (kind, t = CLOCK.t) => {
    const wd = DCAL && DCAL.wd ? DCAL.wd(t) : 1,
      m = ((t % 1440) + 1440) % 1440;
    return curve(CURVES[kind][dayType(wd)], m / 60);
  };
  // a place has a car at game time t: its habit (fixed: the same drives empty every morning) and the day's chance, against the share
  function want(p, t = CLOCK.t) {
    const day = Math.floor(t / 1440),
      r = 0.65 * p.habit + 0.35 * hash(p.i + 17, day);
    return r < S.share(p.kind, t);
  }
  S.want = (i, t) => want(S.places[i], t);
  // ---- seen: in the camera's view and not far, or right behind one ----
  const _fr = new THREE.Frustum(),
    _pm = new THREE.Matrix4(),
    _sp = new THREE.Sphere(),
    _v = new THREE.Vector3();
  function seenSetup() {
    cam.updateMatrixWorld();
    _pm.multiplyMatrices(cam.projectionMatrix, cam.matrixWorldInverse);
    _fr.setFromProjectionMatrix(_pm);
  }
  function seen(p) {
    _v.set(p.x, p.z + 0.8, -p.y);
    const d = _v.distanceTo(cam.position);
    if (d > SEE) return false;
    if (d < 14) return true;
    _sp.center.copy(_v);
    _sp.radius = 3.5;
    return _fr.intersectsSphere(_sp);
  }
  S.seen = i => {
    seenSetup();
    return seen(S.places[i]);
  };
  // ---- a villager's car of dorf/dorf_cars.js parked on the same spot: theirs stands there, ours not ----
  function taken(p) {
    if (!DCARS || !DCARS.cars) return false;
    for (const k in DCARS.cars) {
      const d = DCARS.cars[k];
      if (d && d.g && d.g.visible && d.at && Math.hypot(d.at[0] - p.x, d.at[1] - p.y) < 4) return true;
    }
    return false;
  }
  // ---- data ----
  function load(area) {
    return fetch(BASE + 'dinge/' + area + '.json')
      .then(r => (r.ok ? r.json() : null))
      .then(j => {
        if (!j) return;
        for (const a of j.autos || []) {
          const [x, y, az, ty, col, kind] = a,
            i = S.places.length;
          S.places.push({
            i,
            area,
            x,
            y,
            az,
            type: TYPES[ty] || 'kompakt',
            col: PAL[col] || PAL[1],
            kind: KINDS[kind] || 'hof',
            habit: hash(i + 1, 3.7),
            on: false,
            cell: null,
            z: 0,
          });
        }
        for (const d of j.dinge || []) {
          const [t, x, y, az, l, w, h] = d;
          S.things.push({ i: S.things.length, area, t, x, y, az, l, w, h, cell: null });
        }
      });
  }
  function cellOf(x, y) {
    const cx = Math.floor(x / CELL),
      cy = Math.floor(y / CELL),
      k = cx + ',' + cy;
    let c = S.cells.get(k);
    if (!c)
      S.cells.set(k, (c = { k, x: (cx + 0.5) * CELL, y: (cy + 0.5) * CELL, places: [], things: [], built: false }));
    return c;
  }
  function index() {
    for (const p of S.places) (p.cell = cellOf(p.x, p.y)).places.push(p);
    for (const d of S.things) (d.cell = cellOf(d.x, d.y)).things.push(d);
  }
  // ---- building a cell ----
  const _m = new THREE.Matrix4(),
    _q = new THREE.Quaternion(),
    _e = new THREE.Euler(0, 0, 0, 'YXZ'),
    _p = new THREE.Vector3(),
    ONE = new THREE.Vector3(1, 1, 1),
    ZERO = new THREE.Vector3(0, 0, 0);
  const gz = (x, y) => {
    const z = KERN.ground(x, y);
    return Number.isFinite(z) ? z : 0;
  };
  // the pose of a parked car: on the ground under its middle, pitched and rolled with the ground under its wheels
  function poseOf(p) {
    const T = DMOD.CARS[p.type],
      a = (p.az * Math.PI) / 180,
      f = [Math.sin(a), Math.cos(a)],
      r = [f[1], -f[0]],
      hb = T.wb / 2,
      ht = T.W / 2 - 0.15,
      zF = gz(p.x + f[0] * hb, p.y + f[1] * hb),
      zR = gz(p.x - f[0] * hb, p.y - f[1] * hb),
      zL = gz(p.x - r[0] * ht, p.y - r[1] * ht),
      zRi = gz(p.x + r[0] * ht, p.y + r[1] * ht);
    p.z = (zF + zR + zL + zRi) / 4;
    const pitch = THREE.MathUtils.clamp(Math.atan2(zF - zR, T.wb), -0.25, 0.25),
      roll = THREE.MathUtils.clamp(Math.atan2(zRi - zL, 2 * ht), -0.2, 0.2);
    _e.set(pitch, -a, -roll, 'YXZ');
    p.q = new THREE.Quaternion().setFromEuler(_e);
    p.box = {
      c: [p.x, p.y],
      ax: r,
      ay: f,
      ex: T.W / 2,
      ey: T.L / 2,
      z0: p.z,
      z1: p.z + T.H,
    };
  }
  function setInst(p) {
    const show = p.on && !p.hide;
    _p.set(p.x, p.z, -p.y);
    _m.compose(_p, p.q, show ? ONE : ZERO);
    p.im.setMatrixAt(p.ii, _m);
    p.im.instanceMatrix.needsUpdate = true;
  }
  function build(c) {
    const t = CLOCK.t,
      byType = {};
    c.meshes = [];
    c.extra = [];
    for (const p of c.places) {
      poseOf(p);
      p.on = want(p, t);
      p.hide = taken(p);
      (byType[p.type] = byType[p.type] || []).push(p);
    }
    for (const ty in byType) {
      const L = byType[ty],
        im = new THREE.InstancedMesh(DMOD.car(ty), DMOD.mat, L.length);
      L.forEach((p, j) => {
        p.im = im;
        p.ii = j;
        im.setColorAt(j, p.col);
        setInst(p);
      });
      im.instanceColor.needsUpdate = true;
      im.computeBoundingSphere();
      im.castShadow = false;
      im.receiveShadow = true;
      im.userData.noMerge = true;
      im.name = 'welt-dinge autos ' + c.k + ' ' + ty;
      scene.add(im);
      c.meshes.push(im);
      for (const p of L) {
        const x = { box: () => (p.on && !p.hide ? p.box : null), dinge: p };
        c.extra.push(x);
      }
    }
    if (c.things.length) {
      const G = [];
      for (const d of c.things) {
        d.z = gz(d.x, d.y);
        const g = DMOD.thingGeo(d, d.z);
        if (g) G.push(g);
        const a = (d.az * Math.PI) / 180,
          f = [Math.sin(a), Math.cos(a)],
          bx = {
            c: [d.x, d.y],
            ax: [f[1], -f[0]],
            ay: f,
            ex: d.w / 2,
            ey: d.l / 2,
            z0: d.z,
            z1: d.z + Math.max(0.3, d.h || 1),
          };
        if (d.t !== 'pool_eckig') c.extra.push({ box: () => bx, dinge: d });
      }
      if (G.length) {
        const g = mergeGeometries(G);
        for (const q of G) q.dispose();
        if (g) {
          g.computeBoundingSphere();
          const me = new THREE.Mesh(g, DMOD.mat);
          me.castShadow = false;
          me.receiveShadow = true;
          me.userData.noMerge = true;
          me.name = 'welt-dinge dinge ' + c.k;
          scene.add(me);
          c.meshes.push(me);
        }
      }
    }
    for (const x of c.extra) VEH.extra.push(x);
    c.built = true;
    S.built++;
    markDirty();
  }
  function free(c) {
    for (const m of c.meshes) {
      scene.remove(m);
      if (m.isInstancedMesh) m.dispose();
      else m.geometry.dispose();
    }
    for (const x of c.extra) {
      const i = VEH.extra.indexOf(x);
      if (i >= 0) VEH.extra.splice(i, 1);
    }
    for (const p of c.places) p.im = null;
    c.meshes = [];
    c.extra = [];
    c.built = false;
    S.built--;
    markDirty();
  }
  // ---- the round: cells near the observer built (one per round), far ones freed; built places checked against the clock ----
  let acc = 0,
    rr = 0;
  function round() {
    const w = KERN.where();
    if (!w) return;
    let todo = null,
      bd = 1e9;
    for (const c of S.cells.values()) {
      const d = Math.hypot(c.x - w[0], c.y - w[1]) - CELL * 0.71;
      if (!c.built && d < NEAR && d < bd) {
        bd = d;
        todo = c;
      } else if (c.built && d > FAR) free(c);
    }
    if (todo) build(todo);
    if (S.frozen) return;
    // the clock: every built place now and then (all within ~2 s), a change only where nobody sees it
    const L = S.places,
      n = Math.min(L.length, 40),
      t = CLOCK.t;
    if (!n) return;
    seenSetup();
    let dirty = false;
    for (let k = 0; k < n; k++) {
      const p = L[(rr + k) % L.length];
      if (!p.im) continue;
      const on = want(p, t),
        hide = taken(p);
      if (on === p.on && hide === p.hide) continue;
      if (seen(p)) {
        S.held++;
        continue;
      }
      p.on = on;
      p.hide = hide;
      setInst(p);
      p.im.computeBoundingSphere();
      S.changes++;
      dirty = true;
    }
    rr = (rr + n) % L.length;
    if (dirty) markDirty();
  }
  KERN.tick(dt => {
    if (!S.ready) return;
    acc += dt;
    if (acc < 0.25) return;
    acc = 0;
    try {
      round();
    } catch (e) {
      if (!S.err) {
        S.err = String(e);
        LOADLOG.err && LOADLOG.err(e);
      }
    }
  }, 'welt-dinge');
  // the zombie night: the cars stay where they are
  KERN.on('zombie:start', () => (S.frozen = true));
  KERN.on('zombie:stop', () => (S.frozen = false));
  whenLoaded(() =>
    Promise.all(S.areas.map(load))
      .then(() => {
        index();
        S.ready = true;
      })
      .catch(e => {
        S.err = String(e);
        console.warn('welt-dinge', e);
      })
  );
  // ---- tests: numbers only ----
  S.state = () => {
    const by = {},
      on = {};
    for (const p of S.places) {
      by[p.type] = (by[p.type] || 0) + 1;
      if (p.im && p.on && !p.hide) on[p.kind] = (on[p.kind] || 0) + 1;
    }
    const kinds = {};
    for (const p of S.places) kinds[p.kind] = (kinds[p.kind] || 0) + 1;
    const things = {};
    for (const d of S.things) things[d.t] = (things[d.t] || 0) + 1;
    return {
      ready: S.ready,
      places: S.places.length,
      types: by,
      kinds,
      onBuilt: on,
      built: S.built,
      cells: S.cells.size,
      builtPlaces: S.places.filter(p => p.im).length,
      changes: S.changes,
      held: S.held,
      things,
      frozen: S.frozen,
      err: S.err,
    };
  };
  S.info = i => {
    const p = S.places[i];
    return p
      ? { x: p.x, y: p.y, z: p.z, az: p.az, type: p.type, kind: p.kind, on: p.on, hide: !!p.hide, built: !!p.im }
      : null;
  };
  // build and settle everything near the observer now (tests, the picture tool)
  S.settle = () => {
    for (let k = 0; k < 60; k++) round();
  };
  return S;
})();
window.DINGE = DINGE;
