// ===================== feat/wissen 4: places of history – information boards at the real places, as in reality (WORTE) =====================
// Small boards on two posts with a little roof (one merged mesh in the village props' own material – no new shader program, no light),
// built once the village stands: at the old school of 1828, under the Dorflinde of 1888, at the slab terrace by the brook, at the forest
// kit of the Untere Klinge and on the dam of the Talsperre Ratscher (its position from Structurae, UTM → site with GEOMAN.xf). „Tafel lesen“
// (action button) opens the book on the board's entry and finds what it tells (WDATA.BOARDS). Boards in the towns' zones (Schleusingen,
// Veßra) need no mesh: their places find the entries when one walks there.
import * as THREE from 'three';
import { scene } from '../core/head.js';
import { KERN } from '../core/kern.js';
import { markDirty, whenLoaded } from '../core/assets.js';
import { P } from '../game/walkable.js';
import { STREAM } from '../garden/stream_geo.js';
import { RATSCHER } from '../world/ratscher.js';
import { VPROPS } from '../world/village_props.js';
import { FELL } from '../world/fell.js';
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
  // where each board stands: [x, y, nx, ny] – n is the way its face looks (the reader stands in front of it)
  function where(at) {
    if (at === 'school') {
      // beside the door of the facade that looks to the Anger (world/village.js: facades with outward normals, the school = building 215)
      const V = window.VILLAGE,
        b = V && V.byId && V.byId.get(215),
        A0 = VPROPS.ANGER || [222, -108];
      if (b && b.fac && b.fac.length) {
        let best = null,
          bs = -9;
        for (const f of b.fac) {
          if (!(f.L > 3)) continue;
          const mx = (f.ax + f.bx) / 2,
            my = (f.ay + f.by) / 2,
            to = norm(A0[0] - mx, A0[1] - my),
            sc = f.nx * to[0] + f.ny * to[1] + (f.door ? 0.35 : 0);
          if (sc > bs) {
            bs = sc;
            best = f;
          }
        }
        if (best) {
          const f = best,
            u = f.door ? f.door.u : f.L / 2,
            off = u + 2.8 <= f.L - 0.5 ? 2.8 : -2.8,
            px = f.ax + f.dx * (u + off),
            py = f.ay + f.dy * (u + off);
          return [px + f.nx * 3.4, py + f.ny * 3.4, f.nx, f.ny];
        }
      }
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
