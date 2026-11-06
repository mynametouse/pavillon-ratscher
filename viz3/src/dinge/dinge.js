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
import { RATSCHER } from '../world/ratscher.js';
import { WELT } from '../welt/welt.js';
import { DMOD } from './dinge_modelle.js';
import { DZEIT } from './dinge_zeit.js';
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
    // the areas with their data (dist/dinge/<id>.json), loaded when the observer comes within r of the centre
    areas: [
      { id: 'ratscher', c: [150, -150], r: 2200, cell: 120 },
      { id: 'schleusingen', c: [-1000, 1150], r: 1300, cell: 200 },
      { id: 'geisenhoehn', c: [-860, -520], r: 900, cell: 120 },
      { id: 'talsperre', c: [1270, -700], r: 700, cell: 120 },
      { id: 'vessra', c: [-8850, -150], r: 1100, cell: 150 },
      { id: 'zollbrueck', c: [-5430, -990], r: 700, cell: 120 },
    ],
    err: null,
  };
  if (!DMOD.on || !RATSCHER || !RATSCHER.on) return S;
  S.on = true;
  const CELL = 120,
    NEAR = COARSE ? 260 : 380,
    FAR = NEAR + 160,
    SEE = 320; // beyond this a change goes unseen even in view
  // colours of the data (sRGB, tools/welt-dinge/prep.py PAL) → linear for the instance colour
  const PAL = [
    [26, 26, 28],
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
  const ROUND = new Set(['tank', 'pool_rund', 'trampolin']), // an oval pool takes its box
    TYPES = ['klein', 'kompakt', 'kombi', 'suv', 'van'],
    // the kinds of places in the data (tools/welt-dinge/prep.py KINDS, same order); the last ones are car parks of OSM
    KINDS = [
      'hof',
      'strasse',
      'betrieb',
      'stadt',
      'laden',
      'kirche',
      'schule',
      'dienst',
      'gaststaette',
      'sport',
      'friedhof',
      'allgemein',
    ];
  // ---- occupancy (dinge/dinge_zeit.js): the share of a kind at the hour of the weekday, a place's habit and the day's chance ----
  const wdOf = t => (DCAL && DCAL.wd ? DCAL.wd(t) : 1);
  S.share = (kind, t = CLOCK.t) => DZEIT.share(kind, t, wdOf(t));
  const want = (p, t = CLOCK.t) => DZEIT.want(p.seed, p.habit, p.kind, t, wdOf(t));
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
  function load(A) {
    const area = A.id;
    A.st = 'lädt';
    return fetch(BASE + 'dinge/' + area + '.json')
      .then(r => (r.ok ? r.json() : null))
      .then(j => {
        A.st = j ? 'da' : 'fehlt';
        if (!j) return;
        const i0 = S.places.length,
          k0 = S.things.length;
        for (const a of j.autos || []) {
          const [x, y, az, ty, col, kind] = a,
            i = S.places.length,
            // a seed from the place itself (not the load order of the areas): the same habits in every session
            seed = (((Math.round(x * 10) * 7919 + Math.round(y * 10) * 104729) % 99991) + 99991) % 99991;
          S.places.push({
            i,
            area,
            x,
            y,
            az,
            type: TYPES[ty] || 'kompakt',
            col: PAL[col] || PAL[1],
            kind: KINDS[kind] || 'hof',
            seed,
            habit: DZEIT.hash(seed + 1, 3.7),
            on: false,
            cell: null,
            z: 0,
          });
        }
        for (const d of j.dinge || []) {
          const [t, x, y, az, l, w, h, rgb] = d,
            c = Array.isArray(rgb) && rgb.length === 3 ? DMOD.L(rgb[0], rgb[1], rgb[2]) : undefined;
          S.things.push({ i: S.things.length, area, t, x, y, az, l, w, h, c, cell: null });
        }
        index(i0, k0, A);
      })
      .catch(e => {
        A.st = 'fehler';
        S.err = String(e);
      });
  }
  // cells per area (a town's are bigger: fewer draw calls for its many cars)
  function cellOf(x, y, A) {
    const CS = (A && A.cell) || CELL,
      cx = Math.floor(x / CS),
      cy = Math.floor(y / CS),
      k = (A ? A.id : '') + ':' + cx + ',' + cy;
    let c = S.cells.get(k);
    if (!c)
      S.cells.set(
        k,
        (c = { k, x: (cx + 0.5) * CS, y: (cy + 0.5) * CS, half: CS * 0.71, places: [], things: [], built: false })
      );
    return c;
  }
  function index(i0, k0, A) {
    for (let i = i0; i < S.places.length; i++) {
      const p = S.places[i];
      (p.cell = cellOf(p.x, p.y, A)).places.push(p);
    }
    for (let k = k0; k < S.things.length; k++) {
      const d = S.things[k];
      (d.cell = cellOf(d.x, d.y, A)).things.push(d);
    }
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
    p.zc = gz(p.x, p.y);
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
  function build(c, keep) {
    const t = CLOCK.t,
      byType = {};
    c.meshes = [];
    c.extra = [];
    c.zT = 0;
    for (const p of c.places) {
      poseOf(p);
      if (!keep) {
        p.on = want(p, t);
        p.hide = taken(p);
      }
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
        d.zc = d.z;
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
        if (ROUND.has(d.t)) {
          // round things: a ring of thin walls along the rim (a box would stand out at its corners)
          const r = d.w / 2,
            n = r > 6 ? 16 : 10;
          for (let i = 0; i < n; i++) {
            const a0 = (i / n) * Math.PI * 2,
              a1 = ((i + 1) / n) * Math.PI * 2,
              mx = d.x + (Math.sin(a0) + Math.sin(a1)) * r * 0.5,
              my = d.y + (Math.cos(a0) + Math.cos(a1)) * r * 0.5,
              ux = Math.sin(a1) - Math.sin(a0),
              uy = Math.cos(a1) - Math.cos(a0),
              ul = Math.hypot(ux, uy) || 1,
              wb = {
                c: [mx, my],
                ax: [-uy / ul, ux / ul],
                ay: [ux / ul, uy / ul],
                ex: 0.15,
                ey: (ul * r) / 2 + 0.05,
                z0: bx.z0,
                z1: bx.z1,
              };
            c.extra.push({ box: () => wb, dinge: d });
          }
        } else if (d.t !== 'pool_eckig') c.extra.push({ box: () => bx, dinge: d });
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
  const inSquare = (x, y) => {
    const b = RATSCHER.box;
    return !b || (x >= b[0] && x <= b[2] && y >= b[1] && y <= b[3]);
  };
  const late = c =>
    c.places.some(p => Math.abs(gz(p.x, p.y) - p.zc) > 0.12) ||
    c.things.some(d => Math.abs(gz(d.x, d.y) - d.zc) > 0.12);
  function round(dt = 0.25) {
    const w = KERN.where();
    if (!w) return;
    for (const A of S.areas) if (!A.st && Math.hypot(A.c[0] - w[0], A.c[1] - w[1]) < A.r) load(A);
    // the ground under a built cell nearby may have come later (the town's tiles): set it down again, every few seconds one cell
    for (const c of S.cells.values())
      if (c.built && (c.zT += dt) > 4 && Math.hypot(c.x - w[0], c.y - w[1]) < 260) {
        c.zT = 0;
        if (late(c)) {
          free(c);
          build(c, true);
          S.reposed = (S.reposed || 0) + 1;
        }
        break;
      }
    let todo = null,
      bd = 1e9;
    for (const c of S.cells.values()) {
      const d = Math.hypot(c.x - w[0], c.y - w[1]) - c.half;
      // beyond the square the ground comes with the world's tiles: build a cell only when its middle has one
      if (!c.built && d < NEAR && d < bd && (inSquare(c.x, c.y) || Number.isFinite(WELT.heightAt(c.x, c.y)))) {
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
  whenLoaded(() => (S.ready = true));
  // ---- the traffic (verkehr/verkehr_auto.js): the cars standing in the built cells as obstacles, three circles along each ----
  S.obstacles = OB => {
    if (!S.ready) return;
    for (const c of S.cells.values()) {
      if (!c.built) continue;
      for (const p of c.places) {
        if (!p.on || p.hide || !p.box) continue;
        const f = p.box.ay,
          o = p.box.ey - p.box.ex;
        for (const t of [-1, 0, 1])
          OB.push({ x: p.x + f[0] * o * t, y: p.y + f[1] * o * t, r: p.box.ex, kind: 'dcar', moving: false });
      }
    }
  };
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
      areas: S.areaState(),
      tris: DMOD.tris,
      drawn: [...S.cells.values()].reduce((n, c) => n + (c.built ? c.meshes.length : 0), 0),
      reposed: S.reposed || 0,
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
  S.areaState = () => Object.fromEntries(S.areas.map(A => [A.id, A.st || null]));
  return S;
})();
window.DINGE = DINGE;
