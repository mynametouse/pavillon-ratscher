// ===================== feat/strassen 5: what stands beside the roads, built near the observer (STRASSEN) =====================
// Falko, 12.11.2026: the roads of the region more real – „Leitpfosten, Leitplanken, Schilder, Laternen“. The data (strassen/strassen_daten.js,
// from OpenStreetMap and the app's own roads): delineators along the classified roads in open country, guard rails where OpenStreetMap
// has them, traffic signs (speed limits, give way, stop, priority, roundabouts, level crossings, zebra crossings, station signs, chevrons
// in tight curves, deer crossing), street lamps along the streets of the towns and villages, power poles and towers with their lines.
// Built per cell of 128 m when the observer comes near and freed far away (power lines: cells of 512 m, seen from further): one merged
// mesh of vertex colours per cell on the material of the parked cars (no new shader program), one mesh for the sign faces, the lamps'
// glass and their light on the ground as instances with the village's lamp materials – they come on with the village's lanterns, and
// the nearest ones light the facades (VPROPS.lamps). Everything stands on the ground of the moment (KERN.ground) and is set down again
// when finer tiles arrive. Lamps, sign posts and guard rails are solid for vehicles (VEH.extra). The wetness of the weather goes to
// the road shaders here (ROADS.U / ROADS.W uRoad.y). ?nostrassen leaves all of it out.
import * as THREE from 'three';
import { COARSE, scene } from '../core/head.js';
import { KERN } from '../core/kern.js';
import { LOADLOG, markDirty } from '../core/assets.js';
import { RATSCHER } from '../world/ratscher.js';
import { ROADS } from '../world/roads.js';
import { VILLAGE } from '../world/village.js';
import { VPROPS } from '../world/village_props.js';
import { VEH } from '../vehicles/vehicle.js';
import { DMOD } from '../dinge/dinge_modelle.js';
import { WXBODEN } from '../wetter/wx_boden.js';
import { STRDAT } from './strassen_daten.js';
import { STRMOD } from './strassen_modelle.js';
export const STRASSEN = (() => {
  const S = {
    on: false,
    ready: false,
    cells: new Map(),
    big: new Map(),
    built: 0,
    builtBig: 0,
    n: { posts: 0, rails: 0, signs: 0, lamps: 0, lines: 0, masts: 0, spans: 0 },
    shown: { posts: 0, rails: 0, signs: 0, lamps: 0, masts: 0 },
    rebuilt: 0,
    ms: 0,
    msMax: 0,
    rounds: 0,
    err: null,
  };
  if (!STRDAT.on || !RATSCHER || !RATSCHER.on || !DMOD.on) return S;
  S.on = true;
  const CELL = 128,
    NEAR = COARSE ? 300 : 430,
    FAR = NEAR + 150,
    BIG = 512,
    NEAR_B = COARSE ? 900 : 1500,
    FAR_B = NEAR_B + 350,
    WIRES = COARSE ? 450 : 800, // the lines hang only between masts this near
    RAD = Math.PI / 180;
  const gz = (x, y) => {
    const z = KERN.ground(x, y);
    return Number.isFinite(z) ? z : 0;
  };
  const key = (x, y, c) => Math.floor(x / c) * 65536 + Math.floor(y / c);
  const cellOf = (M, c, x, y) => {
    const k = key(x, y, c);
    let q = M.get(k);
    if (!q) {
      q = {
        k,
        x: (Math.floor(x / c) + 0.5) * c,
        y: (Math.floor(y / c) + 0.5) * c,
        posts: [],
        rails: [],
        signs: [],
        lamps: [],
        lines: [],
        masts: [],
        built: false,
        meshes: [],
        extra: [],
        vl: [],
        ref: [],
        zT: 0,
      };
      M.set(k, q);
    }
    return q;
  };
  // ---- materials: the parked cars' for everything of vertex colours; the sign faces; the lamps' glass (the program of the village's) ----
  let matFace = null,
    matGlass = null,
    atlas = null;
  const matWire = new THREE.LineBasicMaterial({ color: 0x1b1c1e, transparent: true, opacity: 0.72 }),
    // paint lying on the road: drawn a little towards the eye, so that it does not flicker against the ground
    matPaint = new THREE.MeshStandardMaterial({
      vertexColors: true,
      roughness: 0.75,
      metalness: 0,
      polygonOffset: true,
      polygonOffsetFactor: -3,
      polygonOffsetUnits: -3,
    });
  const geoGlass = new THREE.BoxGeometry(0.17, 0.02, 0.46),
    geoPool = new THREE.PlaneGeometry(9, 9);
  geoPool.rotateX(-Math.PI / 2);
  function carriers(list) {
    const tri = new THREE.BufferGeometry();
    tri.setAttribute('position', new THREE.Float32BufferAttribute([0, -500, 0, 0.01, -500, 0, 0, -500, 0.01], 3));
    tri.setAttribute('normal', new THREE.Float32BufferAttribute([0, 1, 0, 0, 1, 0, 0, 1, 0], 3));
    tri.setAttribute('uv', new THREE.Float32BufferAttribute([0, 0, 1, 0, 0, 1], 2));
    tri.setAttribute('color', new THREE.Float32BufferAttribute([1, 1, 1, 1, 1, 1, 1, 1, 1], 3));
    for (const [m, inst] of list) {
      const o = m.isLineBasicMaterial
        ? new THREE.LineSegments(tri, m)
        : inst
          ? new THREE.InstancedMesh(tri, m, 1)
          : new THREE.Mesh(tri, m);
      o.visible = false;
      o.frustumCulled = false;
      o.castShadow = false;
      o.receiveShadow = false;
      o.userData.noMerge = true;
      o.name = 'strassen warm';
      scene.add(o);
    }
  }
  // ---- the data into cells ----
  function init() {
    const D = STRDAT.data;
    if (!STRDAT.ready || !D) return;
    const q = D.pfosten || [];
    for (let i = 0; i + 2 < q.length; i += 3) {
      const x = q[i] / 10,
        y = q[i + 1] / 10;
      cellOf(S.cells, CELL, x, y).posts.push({ x, y, az: q[i + 2] * RAD });
      S.n.posts++;
    }
    // guard rails in pieces of about 96 m (48 spans), each in the cell of its middle; only a run's true ends sink into the ground
    for (const r of D.planken || []) {
      const tw = r[0],
        np = (r.length - 1) / 2,
        STEP = 48;
      for (let a = 0; a < np - 1; a += STEP) {
        const b = Math.min(np - 1, a + STEP),
          P = [];
        for (let i = a; i <= b; i++) P.push([r[1 + i * 2] / 10, r[2 + i * 2] / 10]);
        if (P.length < 2) continue;
        const m = P[P.length >> 1];
        cellOf(S.cells, CELL, m[0], m[1]).rails.push({ P, tw, s0: a === 0, s1: b === np - 1 });
        S.n.rails++;
      }
    }
    const signs = [];
    for (const s of D.schilder || []) {
      const sg = { c: s[0], x: s[1] / 10, y: s[2] / 10, h: s[3] * RAD, t: s[4] || '' };
      signs.push(sg);
      cellOf(S.cells, CELL, sg.x, sg.y).signs.push(sg);
      S.n.signs++;
    }
    // paint across the lanes: stop and give-way lines, zebra crossings
    for (const q of D.linien || []) {
      const ln = { t: q[0], x: q[1] / 10, y: q[2] / 10, az: q[3] * RAD, hw: q[4] / 10 };
      cellOf(S.cells, CELL, ln.x, ln.y).lines.push(ln);
      S.n.lines++;
    }
    const l = D.lampen || [];
    for (let i = 0; i + 3 < l.length; i += 4) {
      const x = l[i] / 10,
        y = l[i + 1] / 10;
      cellOf(S.cells, CELL, x, y).lamps.push({ x, y, az: l[i + 2] * RAD, kind: l[i + 3] });
      S.n.lamps++;
    }
    // masts with the spans that start at them
    const m = D.masten || [],
      M = [];
    for (let i = 0; i + 3 < m.length; i += 4) {
      const mast = { x: m[i] / 10, y: m[i + 1] / 10, type: m[i + 2], az: m[i + 3] * RAD, to: [] };
      M.push(mast);
      cellOf(S.big, BIG, mast.x, mast.y).masts.push(mast);
      S.n.masts++;
    }
    for (const ln of D.leitungen || [])
      for (let i = 2; i + 1 < ln.length; i++) {
        const a = M[ln[i]],
          b = M[ln[i + 1]];
        if (a && b && Math.hypot(a.x - b.x, a.y - b.y) < 700) {
          a.to.push(b);
          S.n.spans++;
        }
      }
    // the picture of the sign faces and the materials – now, so that their programs are compiled while the loading screen is up
    atlas = STRMOD.atlas(signs, (w, h) => {
      const cv = document.createElement('canvas');
      cv.width = w;
      cv.height = h;
      return cv;
    });
    const tex = new THREE.CanvasTexture(atlas.cv);
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.anisotropy = 4;
    matFace = new THREE.MeshStandardMaterial({ map: tex, roughness: 0.55, metalness: 0 });
    matGlass = new THREE.MeshStandardMaterial({
      color: 0x2a2c2e,
      roughness: 0.15,
      metalness: 0,
      envMapIntensity: 0.9,
      emissive: 0xffe6bf,
      emissiveIntensity: 0,
    });
    carriers([
      [matFace, false],
      [matGlass, true],
      [matWire, false],
      [matPaint, false],
    ]);
    S.atlas = atlas;
    S.ready = true;
  }
  const mesh = (g, mat, name) => {
    const me = new THREE.Mesh(g, mat);
    me.castShadow = false;
    me.receiveShadow = true;
    me.userData.noMerge = true;
    me.name = name;
    scene.add(me);
    return me;
  };
  const geoOf = raw => {
    if (!raw.idx.length) return null;
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(raw.pos, 3));
    g.setAttribute('normal', new THREE.Float32BufferAttribute(raw.nrm, 3));
    if (raw.col) g.setAttribute('color', new THREE.Float32BufferAttribute(raw.col, 3));
    if (raw.uv) g.setAttribute('uv', new THREE.Float32BufferAttribute(raw.uv, 2));
    g.setIndex(raw.idx);
    g.computeBoundingSphere();
    return g;
  };
  // the distance into a hard carriageway at (x, y) – positive on it, negative beside it, −9 beside every road. In the square the road
  // map between its pixels, beyond it the roads of welt/fahrt.js themselves
  const RB = RATSCHER.box,
    edgeOf = (x, y) => {
      if (RB && x > RB[0] && x < RB[2] && y > RB[1] && y < RB[3]) {
        const r = ROADS.at(x, y);
        return r && r.surf <= 3 ? ROADS.edgeAt(x, y) : -9;
      }
      const r = KERN.surface(x, y);
      return r && r.surf <= 3 ? r.e : -9;
    };
  // a thing beside a road must not stand on its carriageway: (x, y) moved along (dx, dy) until it is `clear` metres off the edge;
  // null when it still stands on a road then (the mouth of another road – better no post than one on the asphalt)
  const off = (x, y, dx, dy, clear) => {
    for (let k = 0; k < 2; k++) {
      const e = edgeOf(x, y);
      if (e < -clear) return [x, y];
      x += dx * (e + clear + 0.05);
      y += dy * (e + clear + 0.05);
    }
    return edgeOf(x, y) < -0.25 ? [x, y] : null;
  };
  const boxAt = (x, y, h, z0, z1) => {
    const b = { c: [x, y], ax: [1, 0], ay: [0, 1], ex: h, ey: h, z0, z1 };
    return { box: () => b, strassen: true };
  };
  // lamps of others (the village's lanterns, a zone's) near (x, y)?
  const lampNear = (x, y, r) => {
    for (const l of VPROPS.lamps || []) if (!l.str && Math.abs(l.x - x) < r && Math.abs(l.y - y) < r) return true;
    return false;
  };
  const foreign = () => {
    let n = 0;
    for (const l of VPROPS.lamps || []) if (!l.str) n++;
    return n;
  };
  const _m = new THREE.Matrix4(),
    _q = new THREE.Quaternion(),
    _p = new THREE.Vector3(),
    _s = new THREE.Vector3(),
    UPV = new THREE.Vector3(0, 1, 0);
  function build(c) {
    const K = STRMOD.kit(),
      F = { pos: [], nrm: [], uv: [], idx: [] },
      heads = [];
    c.meshes = [];
    c.extra = [];
    c.vl = [];
    c.ref = [];
    c.zT = 0;
    c.nf = foreign();
    const ref = (x, y, z) => c.ref.length < 8 && c.ref.push([x, y, z]);
    let np = 0,
      ns = 0;
    for (const p of c.posts) {
      const o = off(p.x, p.y, Math.cos(p.az), -Math.sin(p.az), 0.4);
      if (!o) continue;
      const [x, y] = o,
        z = gz(x, y);
      STRMOD.post(K, x, y, z, p.az);
      np++;
      ref(x, y, z);
    }
    for (const r of c.rails) {
      const P = r.P.map(q => [q[0], q[1], gz(q[0], q[1])]),
        col = STRMOD.rail(K, P, r.tw, r.s0, r.s1);
      ref(P[0][0], P[0][1], P[0][2]);
      // colliders: about three spans (6 m) each, as thin boxes along the beam
      for (let i = 0; i < col.length; i += 3) {
        const a = col[i],
          b = col[Math.min(col.length - 1, i + 2)],
          dx = b[2] - a[0],
          dy = b[3] - a[1],
          l = Math.hypot(dx, dy);
        if (l < 0.3) continue;
        const bx = {
          c: [(a[0] + b[2]) / 2, (a[1] + b[3]) / 2],
          ax: [dy / l, -dx / l],
          ay: [dx / l, dy / l],
          ex: 0.12,
          ey: l / 2,
          z0: Math.min(a[4], b[4]),
          z1: Math.max(a[5], b[5]),
        };
        c.extra.push({ box: () => bx, strassen: true });
      }
    }
    for (const s of c.signs) {
      const o = off(s.x, s.y, Math.cos(s.h), -Math.sin(s.h), 0.7);
      if (!o) continue;
      const [x, y] = o,
        z = gz(x, y),
        cl = STRMOD.sign(K, F, atlas, s, x, y, z);
      ns++;
      c.extra.push(boxAt(cl[0], cl[1], cl[2], cl[3], cl[4]));
      ref(x, y, z);
    }
    for (const l of c.lamps) {
      // the arm points at the road: the mast steps back from it
      const o = l.kind === 1 ? [l.x, l.y] : off(l.x, l.y, -Math.sin(l.az), -Math.cos(l.az), 0.6);
      if (!o) continue;
      const [x, y] = o;
      if (lampNear(x, y, 22)) continue;
      const z = gz(x, y),
        h = STRMOD.lamp(K, x, y, z, l.az, l.kind);
      heads.push([h[0], h[1], h[2], l.az, l.kind]);
      c.extra.push(boxAt(x, y, 0.1, z, z + 4));
      ref(x, y, z);
    }
    const g = geoOf(K.raw);
    if (g) c.meshes.push(mesh(g, DMOD.mat, 'strassen ' + c.k));
    if (c.lines.length) {
      // on hard roads only (the data comes from OSM, the road from the app): a line on gravel would be wrong
      const KP = STRMOD.kit();
      for (const ln of c.lines) {
        const r = KERN.surface(ln.x, ln.y);
        if (!r || r.surf > 2 || r.e < 0.3) continue;
        STRMOD.paint(KP, ln.t, ln.x, ln.y, ln.az, ln.hw, gz);
        ref(ln.x, ln.y, gz(ln.x, ln.y));
      }
      const gp = geoOf(KP.raw);
      if (gp) {
        const me = mesh(gp, matPaint, 'strassen linien ' + c.k);
        me.renderOrder = 1;
        me.visible = !snowy;
        c.paint = me;
        c.meshes.push(me);
      }
    }
    const gf = geoOf(F);
    if (gf) c.meshes.push(mesh(gf, matFace, 'strassen schilder ' + c.k));
    if (heads.length) {
      const iG = new THREE.InstancedMesh(geoGlass, matGlass, heads.length),
        pm = VPROPS.pool ? VPROPS.pool.material : null,
        iP = pm ? new THREE.InstancedMesh(geoPool, pm, heads.length) : null;
      heads.forEach(([x, y, z, az, kind], i) => {
        _q.setFromAxisAngle(UPV, -az);
        _m.compose(_p.set(x, z - 0.012, -y), _q, _s.set(kind === 1 ? 2 : 1, 1, kind === 1 ? 0.7 : 1));
        iG.setMatrixAt(i, _m);
        if (iP) {
          const k = kind === 1 ? 1.1 : 1.75;
          _m.compose(_p.set(x, gz(x, y) + 0.14, -y), _q.identity(), _s.set(k, 1, k));
          iP.setMatrixAt(i, _m);
        }
        const vl = { x, y, z: z - 0.3, str: true };
        c.vl.push(vl);
      });
      for (const im of [iG, iP]) {
        if (!im) continue;
        im.castShadow = false;
        im.receiveShadow = false;
        im.userData.noMerge = true;
        im.computeBoundingSphere();
        im.name = 'strassen lampen ' + c.k;
        scene.add(im);
        c.meshes.push(im);
      }
      if (iP) {
        iP.renderOrder = 2;
        iP.visible = VPROPS.pool.visible;
        c.pool = iP;
      }
      if (VPROPS.lamps) VPROPS.lamps.push(...c.vl);
    }
    for (const x of c.extra) VEH.extra.push(x);
    c.cnt = { posts: np, rails: c.rails.length, signs: ns, lamps: heads.length };
    for (const k in c.cnt) S.shown[k] += c.cnt[k];
    c.built = true;
    S.built++;
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
    if (VPROPS.lamps)
      for (const l of c.vl) {
        const i = VPROPS.lamps.indexOf(l);
        if (i >= 0) VPROPS.lamps.splice(i, 1);
      }
    for (const k in c.cnt) S.shown[k] -= c.cnt[k];
    c.cnt = null;
    c.meshes = [];
    c.extra = [];
    c.vl = [];
    c.pool = null;
    c.paint = null;
    c.built = false;
    S.built--;
  }
  // ---- power lines: the masts of a cell and the spans that start at them (to masts that are near enough) ----
  const hangOf = m => STRMOD.hang(m.type, m.x, m.y, gz(m.x, m.y), m.az);
  function buildBig(c, w) {
    const K = STRMOD.kit(),
      W = [];
    c.meshes = [];
    c.ref = [];
    c.zT = 0;
    c.wires = 0;
    for (const m of c.masts) {
      const z = gz(m.x, m.y),
        A = (m.type ? STRMOD.tower : STRMOD.pole)(K, m.x, m.y, z, m.az);
      if (c.ref.length < 8) c.ref.push([m.x, m.y, z]);
      S.shown.masts++;
      for (const b of m.to) {
        if (Math.hypot((m.x + b.x) / 2 - w[0], (m.y + b.y) / 2 - w[1]) > WIRES + 250) continue;
        const B = hangOf(b),
          dx = b.x - m.x,
          dy = b.y - m.y,
          l = Math.hypot(dx, dy) || 1,
          nx = -dy / l,
          ny = dx / l,
          // the same order at both ends: by height above the foot, then across the span
          ord = (L, o, oz) =>
            L.map(p => [Math.round((p[2] - oz) * 2), (p[0] - o.x) * nx + (p[1] - o.y) * ny, p]).sort(
              (p, q) => p[0] - q[0] || p[1] - q[1]
            ),
          a2 = ord(A, m, z),
          b2 = ord(B, b, gz(b.x, b.y)),
          n = Math.min(a2.length, b2.length);
        // a tower's tip (the earth wire) only to another tip
        for (let i = 0; i < n; i++) {
          if (m.type && b.type && a2.length === b2.length) STRMOD.wire(W, a2[i][2], b2[i][2], l * 0.028, 12);
          else if (!(m.type && i === a2.length - 1)) STRMOD.wire(W, a2[i][2], b2[i][2], l * 0.02, 8);
        }
        c.wires++;
      }
    }
    const g = geoOf(K.raw);
    if (g) c.meshes.push(mesh(g, DMOD.mat, 'strassen masten ' + c.k));
    if (W.length) {
      // the conductors as thin lines: one pixel wide at every distance (ribbons of their true width break up into dots far away)
      const gw = new THREE.BufferGeometry();
      gw.setAttribute('position', new THREE.Float32BufferAttribute(W, 3));
      gw.computeBoundingSphere();
      const ls = new THREE.LineSegments(gw, matWire);
      ls.userData.noMerge = true;
      ls.name = 'strassen leitung ' + c.k;
      scene.add(ls);
      c.meshes.push(ls);
    }
    c.built = true;
    c.wx = w[0];
    c.wy = w[1];
    S.builtBig++;
  }
  function freeBig(c) {
    for (const m of c.meshes) {
      scene.remove(m);
      m.geometry.dispose();
    }
    S.shown.masts -= c.masts.length;
    c.meshes = [];
    c.built = false;
    S.builtBig--;
  }
  // ---- the round: the nearest unbuilt cells built (two per round), far ones freed; built ones near set down again when the ground
  // under them changed (finer tiles) or a zone brought its own lamps ----
  const late = c => {
    for (const r of c.ref) if (Math.abs(gz(r[0], r[1]) - r[2]) > 0.1) return true;
    return c.lamps.length > 0 && c.nf !== foreign();
  };
  function round(dt) {
    const w = KERN.where();
    if (!w) return;
    const t0 = performance.now();
    let ch = false,
      nb = 0;
    const want = [];
    for (const c of S.cells.values()) {
      const d = Math.hypot(c.x - w[0], c.y - w[1]);
      if (c.built) {
        if (d > FAR) {
          free(c);
          ch = true;
        } else if (d < 320 && (c.zT += dt) > 3) {
          c.zT = 0;
          if (late(c)) {
            free(c);
            build(c);
            S.rebuilt++;
            ch = true;
          }
        }
      } else if (d < NEAR) want.push([d, c]);
    }
    want.sort((a, b) => a[0] - b[0]);
    for (const [, c] of want) {
      if (nb >= 2) break;
      build(c);
      nb++;
      ch = true;
    }
    for (const c of S.big.values()) {
      const d = Math.hypot(c.x - w[0], c.y - w[1]);
      if (c.built) {
        // the lines come and go with the distance: built again when the observer has moved 300 m since
        if (d > FAR_B) {
          freeBig(c);
          ch = true;
        } else if (
          ((c.zT += dt) > 5 && c.ref.some(r => Math.abs(gz(r[0], r[1]) - r[2]) > 0.25)) ||
          Math.hypot(c.wx - w[0], c.wy - w[1]) > 300
        ) {
          if (nb < 2) {
            freeBig(c);
            buildBig(c, w);
            nb++;
            ch = true;
          }
        }
      } else if (d < NEAR_B && nb < 2) {
        buildBig(c, w);
        nb++;
        ch = true;
      }
    }
    if (ch) markDirty();
    const ms = performance.now() - t0;
    S.ms += ms;
    S.rounds++;
    if (ms > S.msMax) S.msMax = ms;
  }
  // ---- night and rain: the lamps' glass glows with the village's lanterns, their light lies on the ground; the wetness to the roads ----
  let onShown = -1,
    wetShown = -1,
    snowy = false;
  function light() {
    const n = VILLAGE && VILLAGE.night ? VILLAGE.night() : 0,
      on = n > 0.08 ? Math.min(1, (n - 0.08) / 0.3) : 0;
    if (matGlass && Math.abs(on - onShown) > 0.01) {
      onShown = on;
      matGlass.emissiveIntensity = 7 * on;
      markDirty();
    }
    const pv = !!(VPROPS.pool && VPROPS.pool.visible);
    // snow lies on the painted lines too
    snowy = !!(WXBODEN && WXBODEN.S && WXBODEN.S.snowShown > 0.3);
    for (const c of S.cells.values()) {
      if (!c.built) continue;
      if (c.pool && c.pool.visible !== pv) c.pool.visible = pv;
      if (c.paint && c.paint.visible === snowy) {
        c.paint.visible = !snowy;
        markDirty();
      }
    }
    // wet roads shine; under snow nothing shines
    const wet = WXBODEN && WXBODEN.S ? WXBODEN.S.shown * (1 - Math.min(1, WXBODEN.S.snowShown * 1.5)) : 0;
    if (Math.abs(wet - wetShown) > 0.015 || (wet === 0 && wetShown !== 0)) {
      wetShown = wet;
      if (ROADS.U) ROADS.U.uRoad.value.y = wet;
      if (ROADS.W) ROADS.W.uRoad.value.y = wet;
      markDirty();
    }
  }
  let acc = 0;
  KERN.tick(dt => {
    if (!S.ready) return;
    light();
    acc += dt;
    if (acc < 0.2) return;
    const d = acc;
    acc = 0;
    try {
      round(d);
    } catch (e) {
      if (!S.err) {
        S.err = String(e && e.stack ? e.stack : e);
        console.warn('strassen', e);
        LOADLOG && LOADLOG.err && LOADLOG.err(e);
      }
    }
  }, 'strassen');
  STRDAT.when(() => {
    try {
      init();
    } catch (e) {
      S.err = String(e && e.stack ? e.stack : e);
      console.warn('strassen', e);
    }
  });
  // tests: everything near built now; the state
  S.fill = (n = 400) => {
    for (let i = 0; i < n; i++) {
      const b = S.built + S.builtBig;
      round(0.2);
      if (S.built + S.builtBig === b) break;
    }
  };
  // tests: every thing of the data in the rectangle with its place after the step off the carriageway: [kind, x, y, e] (e: the road's
  // edge distance there, null beside every road)
  S.audit = (x0, y0, x1, y1) => {
    const out = [],
      at = (k, o) =>
        o &&
        out.push([
          k,
          Math.round(o[0] * 10) / 10,
          Math.round(o[1] * 10) / 10,
          Math.round(edgeOf(o[0], o[1]) * 100) / 100,
        ]);
    for (const c of S.cells.values()) {
      if (c.x < x0 - CELL || c.x > x1 + CELL || c.y < y0 - CELL || c.y > y1 + CELL) continue;
      for (const p of c.posts) at('post', off(p.x, p.y, Math.cos(p.az), -Math.sin(p.az), 0.4));
      for (const s of c.signs) at('sign', off(s.x, s.y, Math.cos(s.h), -Math.sin(s.h), 0.7));
      for (const l of c.lamps)
        at('lamp', l.kind === 1 ? [l.x, l.y] : off(l.x, l.y, -Math.sin(l.az), -Math.cos(l.az), 0.6));
      for (const r of c.rails) for (let i = 0; i < r.P.length; i += 6) at('rail', r.P[i]);
    }
    return out.filter(o => o[1] >= x0 && o[1] <= x1 && o[2] >= y0 && o[2] <= y1);
  };
  S.state = () => ({
    on: S.on,
    ready: S.ready,
    cells: S.cells.size,
    built: S.built,
    big: S.builtBig,
    n: S.n,
    shown: { ...S.shown },
    rebuilt: S.rebuilt,
    ms: S.rounds ? Math.round((S.ms / S.rounds) * 100) / 100 : 0,
    msMax: Math.round(S.msMax * 10) / 10,
    tris: [...S.cells.values(), ...S.big.values()].reduce(
      (a, c) =>
        a +
        c.meshes.reduce(
          (b, m) => b + (m.isMesh && m.geometry.index ? (m.geometry.index.count / 3) * (m.count || 1) : 0),
          0
        ),
      0
    ),
    glow: matGlass ? matGlass.emissiveIntensity : 0,
    meshes: [...S.cells.values(), ...S.big.values()].reduce(
      (a, c) => a + c.meshes.filter(m => m.parent && m.visible).length,
      0
    ),
    extra: [...S.cells.values()].reduce((a, c) => a + c.extra.length, 0),
    err: S.err,
  });
  return S;
})();
window.STRASSEN = STRASSEN;
