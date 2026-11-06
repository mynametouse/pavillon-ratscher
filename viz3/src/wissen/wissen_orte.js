// ===================== feat/wissen 4: places of history – information boards at the real places, as in reality (WORTE) =====================
// Small boards on two posts with a little roof (one merged mesh in the village props' own material – no new shader program, no light),
// built once the village stands: at the old school of 1828, under the Dorflinde of 1888, at the slab terrace by the brook, at the forest
// kit of the Untere Klinge and on the dam of the Talsperre Ratscher (its position from Structurae, UTM → site with GEOMAN.xf). „Tafel lesen“
// (action button) opens the book on the board's entry and finds what it tells (WDATA.BOARDS). In the towns' zones a board each at the
// Bertholdsburg (Schleusingen) and the Henneberger Kapelle (Kloster Veßra): made when the zone stands, freed with it (TOWN).
import * as THREE from 'three';
import { scene } from '../core/head.js';
import { KERN } from '../core/kern.js';
import { markDirty, whenLoaded } from '../core/assets.js';
import { P } from '../game/walkable.js';
import { STREAM } from '../garden/stream_geo.js';
import { RATSCHER } from '../world/ratscher.js';
import { VPROPS } from '../world/village_props.js';
import { FELL } from '../world/fell.js';
import { DKDATA } from '../world/dorfkern_data.js';
import { WDATA } from './wissen_data.js';
import { WISSEN } from './wissen.js';
export const WORTE = (() => {
  const D = WDATA;
  const S = { boards: [], mesh: null, ready: false, err: '' };
  const lin = c => Math.pow(c, 2.2),
    L = (r, g, b) => [lin(r), lin(g), lin(b)];
  const POST = L(0.3, 0.2, 0.13),
    FRAME = L(0.4, 0.27, 0.17),
    FACE = L(0.86, 0.82, 0.7),
    INK = L(0.24, 0.21, 0.17),
    PIC = L(0.42, 0.55, 0.36),
    ROOF = L(0.27, 0.2, 0.14);
  const norm = (x, y) => {
    const l = Math.hypot(x, y) || 1;
    return [x / l, y / l];
  };
  // site metres from UTM 32N (the inverse of GEOMAN.xf: E = ex + a·x − b·y, N = ey + b·x + a·y; world/ratscher.js)
  function siteOfUTM(E, N) {
    const xf = window.GEOMAN && window.GEOMAN.xf;
    if (!xf) return null;
    const dE = E - xf.ex,
      dN = N - xf.ey,
      d = xf.a * xf.a + xf.b * xf.b;
    return [(xf.a * dE + xf.b * dN) / d, (-xf.b * dE + xf.a * dN) / d];
  }
  // the board at the old school: along the wall with the door (world/village.js building 215, the facade dorf/dorf_school.js opens), out of
  // the ways people walk – ≥ 2 m from the door, ≥ 2 m from the way from the door to the school bus stop (its shelter, where the bus and the
  // zombie night's evacuation bus stop: world/dorfkern_data.js open.shelter), clear of the beer table the village evening sets out beside
  // the door (dorf_school.js: 4.2 m along the wall, 2 m out) – as close to the wall as that allows, at the end away from the bus stop
  const dSeg = (p, a, b) => {
    const dx = b[0] - a[0],
      dy = b[1] - a[1],
      L2 = dx * dx + dy * dy || 1,
      t = Math.max(0, Math.min(1, ((p[0] - a[0]) * dx + (p[1] - a[1]) * dy) / L2));
    return Math.hypot(p[0] - a[0] - dx * t, p[1] - a[1] - dy * t);
  };
  function schoolSpot() {
    const V = window.VILLAGE,
      b = V && V.byId && V.byId.get(215),
      f = b && b.fac && b.fac.find(q => q.door);
    if (!f || !(f.L > 4)) return null;
    // the room's frame of dorf_school.js: x along the wall from the end where the inside lies to the left, y into the house
    let ox = f.ax,
      oy = f.ay,
      c = f.dx,
      sn = f.dy,
      du = f.door.u;
    if (-sn * -f.nx + c * -f.ny < 0) {
      ox = f.bx;
      oy = f.by;
      c = -c;
      sn = -sn;
      du = f.L - du;
    }
    const toW = (x, y) => [ox + x * c - y * sn, oy + x * sn + y * c],
      dw = f.door.w || 1.1,
      door = toW(du, 0),
      out = toW(du, -8),
      SH = (DKDATA && DKDATA.open && DKDATA.open.shelter && DKDATA.open.shelter.c) || [248.8, -100.8];
    let best = null;
    for (let x = 0.9; x <= f.L - 0.9; x += 0.25)
      for (const y of [-1.6, -2.0, -2.5]) {
        const posts = [toW(x - 0.56, y), toW(x + 0.56, y)],
          m = {
            door: Math.min(...posts.map(q => Math.hypot(q[0] - door[0], q[1] - door[1]))) - dw / 2,
            walk: Math.min(...posts.map(q => dSeg(q, door, SH))),
            axis: Math.min(...posts.map(q => dSeg(q, door, out))),
            shelter: Math.min(...posts.map(q => Math.hypot(q[0] - SH[0], q[1] - SH[1]))),
            table: Math.min(
              ...[x - 0.56, x + 0.56].map(px => Math.max(Math.abs(px - (du + 4.2)) - 1.1, Math.abs(y + 2.0) - 0.8))
            ),
          };
        if (m.door < 2 || m.walk < 2 || m.axis < 1.8 || m.shelter < 6 || m.table < 0.9) continue;
        // never against a wall, a trunk or a post of the village
        const c0 = toW(x, y),
          q = [c0[0], c0[1]];
        try {
          if (KERN.pushOut(q, 0.7) && Math.hypot(q[0] - c0[0], q[1] - c0[1]) > 0.05) continue;
        } catch (e) {}
        const sc = m.walk + 0.5 * Math.min(m.door, 6) + y * 1.5; // away from the walk to the bus, near the wall
        if (!best || sc > best.sc) best = { sc, c: c0, m };
      }
    if (!best) return null;
    S.schoolCheck = best.m;
    // the face looks out of the house (−y of the frame)
    const n = [sn, -c];
    return [best.c[0], best.c[1], n[0], n[1]];
  }
  // where each board stands: [x, y, nx, ny] – n is the way its face looks (the reader stands in front of it)
  function where(at) {
    if (at === 'school') {
      const r = schoolSpot();
      if (r) return r;
      const s = VPROPS.school;
      if (!s) return null;
      const f = [Math.cos(s.rot), Math.sin(s.rot)],
        A = VPROPS.ANGER || [222, -108];
      // in front of the school on the side of the Anger, beside the door's axis
      const toA = norm(A[0] - s.cx, A[1] - s.cy),
        side = f[0] * toA[0] + f[1] * toA[1] >= 0 ? f : [-f[0], -f[1]];
      return [s.cx + side[0] * 10.5 - side[1] * 3.2, s.cy + side[1] * 10.5 + side[0] * 3.2, side[0], side[1]];
    }
    if (at === 'linde') {
      const l = VPROPS.LINDE;
      if (!l) return null;
      const F = VPROPS.FOUNTAIN || [l[0] - 20, l[1] - 8],
        d = norm(F[0] - l[0], F[1] - l[1]);
      return [l[0] + d[0] * 5.2, l[1] + d[1] * 5.2, d[0], d[1]];
    }
    if (at === 'bach') {
      const T = STREAM.TERR;
      if (!T) return null;
      const p = STREAM.wpt(T.t + T.ht + 0.7, T.o + T.ho * 0.4),
        c = STREAM.wpt(T.t, T.o),
        d = norm(c[0] - p[0], c[1] - p[1]);
      return [p[0], p[1], d[0], d[1]];
    }
    if (at === 'klinge') {
      const k = FELL.kitPos ? FELL.kitPos() : null;
      if (!k) return null;
      const psi = k[2] || 0,
        f = [Math.sin(psi), Math.cos(psi)];
      // beside the forest kit, facing the track
      return [k[0] - f[0] * 3.2, k[1] - f[1] * 3.2, f[0], f[1]];
    }
    if (at === 'talsperre') {
      const c = siteOfUTM(D.DAM_UTM[0], D.DAM_UTM[1]);
      if (!c || !RATSCHER.hAt) return null;
      // on the crest: the highest ground within 45 m of the point Structurae gives, facing the village
      let best = c,
        bz = -1e9;
      for (let r = 0; r <= 45; r += 7.5)
        for (let a = 0; a < 12; a++) {
          const x = c[0] + Math.cos((a / 12) * Math.PI * 2) * r,
            y = c[1] + Math.sin((a / 12) * Math.PI * 2) * r,
            z = RATSCHER.hAt(x, y);
          if (Number.isFinite(z) && z > bz + 0.05) {
            bz = z;
            best = [x, y];
          }
          if (r === 0) break;
        }
      const A = VPROPS.ANGER || [222, -108],
        d = norm(A[0] - best[0], A[1] - best[1]);
      return [best[0], best[1], d[0], d[1]];
    }
    return null;
  }
  function boardGeo(K, x, y, nx, ny) {
    const z = KERN.ground(x, y),
      u = [-ny, nx],
      rot = Math.atan2(u[1], u[0]);
    for (const s of [-0.56, 0.56]) K.box(x + u[0] * s, y + u[1] * s, z - 0.1, 0.09, 0.09, 1.86, rot, POST);
    K.box(x, y, z + 0.86, 1.28, 0.05, 0.86, rot, FRAME);
    const f = (d, z0, sx, sz, col, du = 0) =>
      K.box(x + nx * d + u[0] * du, y + ny * d + u[1] * du, z + z0, sx, 0.012, sz, rot, col);
    f(0.031, 0.93, 1.14, 0.72, FACE);
    f(0.04, 1.54, 0.62, 0.05, INK, -0.2);
    for (let i = 0; i < 6; i++) f(0.04, 1.43 - i * 0.075, 0.64, 0.022, INK, -0.18);
    f(0.04, 1.06, 0.3, 0.34, PIC, 0.36);
    K.box(x - nx * 0.02, y - ny * 0.02, z + 1.76, 1.46, 0.34, 0.035, rot, ROOF, true);
  }
  function build() {
    if (S.ready || !VPROPS.ready || !VPROPS.kit || !VPROPS.mat || !VPROPS.mat.paint) return false;
    const K = VPROPS.kit();
    for (const b of D.BOARDS) {
      let w = null;
      try {
        w = where(b.at);
      } catch (e) {
        S.err = String((e && e.message) || e);
      }
      if (!w || !w.every(Number.isFinite)) continue;
      const p = [w[0], w[1]];
      // never inside a wall or a trunk (outside the modelled garden square)
      try {
        KERN.pushOut(p, 0.9);
      } catch (e) {}
      boardGeo(K, p[0], p[1], w[2], w[3]);
      const B = { id: b.id, x: p[0], y: p[1], z: KERN.ground(p[0], p[1]), n: [w[2], w[3]], def: b };
      S.boards.push(B);
      KERN.act({
        id: 'wi:tafel:' + b.id,
        r: 2.4,
        prio: 0.02,
        label: () => (P.mode === 'walk' ? 'Tafel lesen: ' + b.title : null),
        pos: () => [B.x + B.n[0] * 0.6, B.y + B.n[1] * 0.6, B.z + 1.3],
        run: () => read(b.id),
      });
    }
    if (!K.empty()) {
      const me = new THREE.Mesh(K.geo(), VPROPS.mat.paint);
      me.userData.noMerge = true;
      me.castShadow = false;
      me.receiveShadow = false;
      me.name = 'wissen-tafeln';
      scene.add(me);
      S.mesh = me;
      markDirty(true);
    }
    S.ready = true;
    return true;
  }
  // reading a board: its entries are found, the book opens on the first
  function read(id) {
    const b = D.BOARDS.find(q => q.id === id) || TOWN.find(q => q.id === id);
    if (!b) return false;
    for (const e of [b.entry, ...(b.also || [])]) WISSEN.found(e, 'tafel:' + b.title);
    WISSEN.open(b.entry);
    KERN.emit('wissen:tafel', { id });
    return true;
  }
  // ---- boards in the towns' zones (welt/schleusingen.js, welt/vessra.js): made when the zone stands, dropped with it ----
  const TOWN = [
    {
      id: 'burg',
      title: 'Schloss Bertholdsburg',
      entry: 'g_burg',
      also: ['g_henneberg'],
      Z: () => window.SCHL,
      lm: ['burg'],
      to: () => {
        const sp = KERN.spot('schleusingen');
        return sp && sp.pos ? sp.pos : [-1100.5, 1214.5];
      },
    },
    {
      id: 'kloster',
      title: 'Kloster Veßra',
      entry: 'g_vessra',
      also: ['o_vessra', 'g_henneberg'],
      Z: () => window.VESSRA,
      lm: ['henneberg', 'hchor', 'torkirche'],
      to: () => {
        const V = window.VESSRA,
          sp = KERN.spot('vessra');
        return (V && V.START) || (sp && sp.pos) || null;
      },
    },
  ];
  const inFlat = (f, x, y) => {
    let c = false;
    for (let i = 0, j = f.length - 2; i < f.length; j = i, i += 2)
      if (f[i + 1] > y !== f[j + 1] > y && x < ((f[j] - f[i]) * (y - f[i + 1])) / (f[j + 1] - f[i + 1]) + f[i]) c = !c;
    return c;
  };
  const areaFlat = f => {
    let a = 0;
    for (let i = 0, j = f.length - 2; i < f.length; j = i, i += 2) a += f[j] * f[i + 1] - f[i] * f[j + 1];
    return Math.abs(a) / 2;
  };
  function townSpot(T) {
    const Z = T.Z();
    if (!Z || Z.state !== 'ready' || !Z.bld) return null;
    const bs = Z.bld.filter(b => T.lm.includes(b.lm) && b.f && b.f.length >= 6);
    if (!bs.length) return null;
    const b = bs.sort((p, q) => areaFlat(q.f) - areaFlat(p.f))[0],
      to = T.to();
    if (!to) return null;
    const d = norm(to[0] - b.cx, to[1] - b.cy);
    let t = 0;
    while (t < 150 && inFlat(b.f, b.cx + d[0] * t, b.cy + d[1] * t)) t += 1;
    const p = [b.cx + d[0] * (t + 5), b.cy + d[1] * (t + 5)];
    try {
      KERN.pushOut(p, 0.9);
    } catch (e) {}
    return [p[0], p[1], d[0], d[1]];
  }
  const TS = {};
  function townTick() {
    if (!VPROPS.mat || !VPROPS.mat.paint || !VPROPS.kit) return;
    for (const T of TOWN) {
      const Z = T.Z(),
        ready = !!(Z && Z.state === 'ready'),
        st = TS[T.id];
      if (ready && !st) {
        const w = townSpot(T);
        if (!w || !w.every(Number.isFinite)) continue;
        const K = VPROPS.kit();
        boardGeo(K, w[0], w[1], w[2], w[3]);
        const me = new THREE.Mesh(K.geo(), VPROPS.mat.paint);
        me.userData.noMerge = true;
        me.castShadow = me.receiveShadow = false;
        me.name = 'wissen-tafel-' + T.id;
        scene.add(me);
        const B = {
          id: T.id,
          x: w[0],
          y: w[1],
          z: KERN.ground(w[0], w[1]),
          n: [w[2], w[3]],
          def: T,
          mesh: me,
          town: true,
        };
        TS[T.id] = B;
        S.boards.push(B);
        KERN.act({
          id: 'wi:tafel:' + T.id,
          r: 2.4,
          prio: 0.02,
          label: () => (P.mode === 'walk' ? 'Tafel lesen: ' + T.title : null),
          pos: () => [B.x + B.n[0] * 0.6, B.y + B.n[1] * 0.6, B.z + 1.3],
          run: () => read(T.id),
        });
        markDirty();
      } else if (!ready && st) {
        scene.remove(st.mesh);
        st.mesh.geometry.dispose();
        KERN.unact('wi:tafel:' + T.id);
        S.boards.splice(S.boards.indexOf(st), 1);
        delete TS[T.id];
      }
    }
  }
  // the two posts of every board stop a walker outside the modelled garden square (there the walls and trunks come through
  // KERN.pushOut too; inside it game/walkable.js has its own colliders – the board at the brook stays walk-through)
  KERN.provide(
    'pushOut',
    (p, r) => {
      let hit = false;
      for (const B of S.boards) {
        const dx0 = p[0] - B.x,
          dy0 = p[1] - B.y;
        if (dx0 * dx0 + dy0 * dy0 > 4) continue;
        const u = [-B.n[1], B.n[0]];
        for (const sgn of [-0.56, 0.56]) {
          const qx = B.x + u[0] * sgn,
            qy = B.y + u[1] * sgn,
            ex = p[0] - qx,
            ey = p[1] - qy,
            rr = r + 0.07,
            d = Math.hypot(ex, ey);
          if (d < rr && d > 1e-6) {
            p[0] = qx + (ex / d) * rr;
            p[1] = qy + (ey / d) * rr;
            hit = true;
          }
        }
      }
      // undefined passes the question on (walls, trunks, the towns' own providers)
      return hit ? true : undefined;
    },
    20
  );
  let tacc = 0;
  KERN.tick(dt => {
    tacc += dt;
    if (tacc < 2) return;
    tacc = 0;
    try {
      townTick();
    } catch (e) {
      if (!S.townErr) {
        S.townErr = String((e && e.message) || e);
        console.warn('wissen: Tafeln in der Stadt', e);
      }
    }
  }, 'wissen/orte');
  whenLoaded(() => {
    try {
      if (!build()) KERN.until(() => VPROPS.ready, 120).then(build, () => {});
    } catch (e) {
      S.err = String((e && e.message) || e);
      console.warn('wissen: Tafeln', e);
    }
  });
  return { S, read, build, where, siteOfUTM, TOWN, townSpot };
})();
window.WORTE = WORTE;
