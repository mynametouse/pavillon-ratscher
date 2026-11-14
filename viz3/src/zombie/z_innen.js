// ===================== feat/zombie-innen: the village houses from inside (ZINNEN) – contract, filled in by the helper agent 'zombie-innen' =====================
// The zombie night (Falko, 4.11.2026) needs every house of Ratscher to be enterable, furnished in the style of a Thuringian Forest village
// (built after real photos: docs/plans/zombie_einrichtung.md). This module builds ONE house's interior inside the house's own footprint
// (world/village.js VILLAGE.bld – the facade quads stay; seen from inside they are back faces and not drawn) and takes it away again.
// Nothing happens at load time: every call comes from zombie/z_haus.js (ZHAUS) while the zombie night runs, or from the test scenario.
//
// API (site coordinates: x east, y north, z up, metres; yaw as compass degrees, 0 = north):
//   ZINNEN.list()        → [{ id, cx, cy, door: { x, y, z, nx, ny, w } }]   every enterable building (houses with a door; later barns),
//                          door = the middle of the front door on the facade, n = outward normal, z = the floor level outside (foot)
//   ZINNEN.info(id)      → { id, storeys, cellar, attic, style, owner, rooms: [{ id, kind, floor, name }] }   cheap, deterministic, builds nothing
//   ZINNEN.mount(id)     → Promise<H>   builds the interior (meshes, COL boxes, WALK slabs, doors, lights, actions) – H, the handle:
//     H.entry  { x, y, z, yaw }          where one stands inside after coming through the front door (facing into the house)
//     H.exit   { x, y, z, yaw }          outside in front of the front door (facing away from it)
//     H.openings [{ id, kind: 'door' | 'window', floor, a: [x, y], b: [x, y], z0, z1, n: [nx, ny], room, front }]
//                                        the openings of the outer walls a barricade can close (front/back door, the windows of the ground
//                                        floor; a → b along the inner face, n pointing out of the house)
//     H.containers [{ id, kind, room, pos: [x, y, z], label }]   searchable furniture (kinds: 'schublade', 'schrank', 'kuehlschrank', 'buefett',
//                                        'regal', 'truhe', 'kleiderschrank', 'nachttisch', 'werkbank', 'waffenschrank', 'kiste' …)
//     H.spots  [{ id, kind, room, pos: [x, y, z], yaw }]   things the game uses: 'bett', 'ofen', 'herd', 'radio', 'tv', 'spuele', 'wanne', 'tisch' …
//     H.rooms  [{ id, kind, floor, name, poly: [[x, y] …], z0, z1 }]
//     H.graph  { nodes: [{ x, y, z, room }], edges: [[i, j] …] }   waypoints through the doorways and stairs (zombies walk along them)
//     H.inside(x, y, z) → boolean          is this point inside the interior (any room, any storey)
//     H.onSearch = (container, H) => { items, text } | null   set by ZHAUS: called when the player searches a container (open it, show text)
//     H.onUse = (spot, H) => boolean        set by ZHAUS: called for 'bett', 'radio', 'ofen' … (the module offers the action, ZHAUS decides)
//     H.stats  { ms, meshes, draws, tris }
//   ZINNEN.unmount(H)    removes it all (meshes disposed, COL/WALK entries neutralised, doors and actions gone, lights given back)
//   ZINNEN.mounted()     → the handles built now (normally one)
// Additions of feat/zombie-innen (beyond the contract):
//   H.roomAt(x, y, z) → the room id there or null   H.light(roomId, on?) → switch a room's light (no argument: toggle), returns the state
//   H.doors [{ id, key, room, pos: [x, y, z] }]     the inner doors (DOORS keys: open/close with GAME.toggleDoor or setDoorNow)
//   H.hatch { key, pos } | null                     the cellar trapdoor (a DOORS flap)   H.plan   the floor plan (zombie/z_innen_plan.js)
//   H.route(x, y, z, tx, ty, tz) → { x, y, z }      where one inside heads next to get to the target (feet z): the target in the same room,
//                                                    else the next waypoint along H.graph (for the zombies in the house)
//   ZINNEN.pick(x, y)  → the id of the enterable house nearest to (x, y)
//   ZINNEN.warm()      makes the one shader program of the terrain cut-out ahead (call it when the zombie night starts): entering a
//                      house then compiles no program at all
import * as THREE from 'three';
import { scene, V, QS } from '../core/head.js';
import { KERN } from '../core/kern.js';
import { markDirty } from '../core/assets.js';
import { COL, WALK, hingeDoor, flapDoor, DOORS } from '../core/geo.js';
import { P as WALKER, rebuildGrids } from '../game/walkable.js';
import { go, setView3 } from '../game/player.js';
import { PLAY } from '../game/play.js';
import { RATSCHER } from '../world/ratscher.js';
import { VILLAGE } from '../world/village.js';
import { ZIPLAN } from './z_innen_plan.js';
import { ZIMOB } from './z_innen_mob.js';
import { ZIEINR } from './z_innen_einr.js';
import { audio } from '../audio/audio.js';
export const ZINNEN = (() => {
  const S = { ready: false, built: [], wired: false, poolCol: [], poolWalk: [] };
  const PW = ZIPLAN.PW,
    SLAB = ZIPLAN.SLAB,
    TAG = 'zinnen';
  const tick0 = () => new Promise(r => setTimeout(r, 0));
  // ---- the enterable houses ----
  let LIST = null;
  S.list = () => {
    if (LIST) return LIST.map(o => Object.assign({}, o, { door: Object.assign({}, o.door) }));
    if (!VILLAGE.ready) return [];
    LIST = [];
    for (const b of VILLAGE.bld) {
      if (!ZIPLAN.enterable(b)) continue;
      const P = ZIPLAN.plan(b.id);
      if (!P) continue;
      const f = P.F.f,
        d = P.toW(P.front.x, 0);
      LIST.push({
        id: b.id,
        cx: b.cx,
        cy: b.cy,
        door: { x: d[0], y: d[1], z: P.foot, nx: f.nx, ny: f.ny, w: P.front.w },
      });
    }
    return S.list();
  };
  S.info = id => {
    const P = ZIPLAN.plan(id);
    if (!P) return null;
    return {
      id,
      storeys: P.nSt,
      cellar: !!P.cellar,
      attic: !!P.attic,
      style: P.look,
      owner: P.owner,
      rooms: P.rooms.map(r => ({ id: r.id, kind: r.kind, floor: r.fl, name: r.name })),
    };
  };
  S.pick = (x, y) => {
    let best = null,
      bd = 1e9;
    for (const o of S.list()) {
      const d = Math.hypot(o.cx - x, o.cy - y);
      if (d < bd) {
        bd = d;
        best = o.id;
      }
    }
    return best;
  };
  // ---- the sides of a room: line, inward normal, outer edge, what is cut into it ----
  function roomSides(P, r) {
    const out = {
      y0: { A: [r.x0, r.y0], B: [r.x1, r.y0], n: [0, 1], outer: Math.abs(r.y0 - P.yi0) < 0.02 ? 'front' : null },
      x1: { A: [r.x1, r.y0], B: [r.x1, r.y1], n: [-1, 0], outer: Math.abs(r.x1 - P.xi1) < 0.02 ? 'right' : null },
      y1: { A: [r.x1, r.y1], B: [r.x0, r.y1], n: [0, -1], outer: Math.abs(r.y1 - P.yi1) < 0.02 ? 'back' : null },
      x0: { A: [r.x0, r.y1], B: [r.x0, r.y0], n: [1, 0], outer: Math.abs(r.x0 - P.xi0) < 0.02 ? 'left' : null },
    };
    if (r.kind === 'keller') for (const k in out) out[k].outer = null;
    for (const k of Object.keys(out)) {
      const s = out[k];
      s.L = Math.hypot(s.B[0] - s.A[0], s.B[1] - s.A[1]);
      s.d = [(s.B[0] - s.A[0]) / s.L, (s.B[1] - s.A[1]) / s.L];
      s.u = (x, y) => (x - s.A[0]) * s.d[0] + (y - s.A[1]) * s.d[1];
      s.holes = [];
    }
    if (r.kind === 'keller') return out;
    // windows on outer sides
    for (const w of P.windows) {
      if (w.fl !== r.fl) continue;
      for (const k of Object.keys(out)) {
        const s = out[k];
        if (s.outer !== w.edge) continue;
        const along = k === 'y0' || k === 'y1' ? 0 : 1,
          lo = Math.min(s.A[along], s.B[along]),
          hi = Math.max(s.A[along], s.B[along]);
        if (w.a < lo + 0.05 || w.b > hi - 0.05) continue;
        const pa = along ? [s.A[0], w.a] : [w.a, s.A[1]],
          pb = along ? [s.A[0], w.b] : [w.b, s.A[1]],
          u0 = Math.min(s.u(...pa), s.u(...pb)),
          u1 = Math.max(s.u(...pa), s.u(...pb));
        s.holes.push({ kind: 'window', u0, u1, z0: w.z0, z1: w.z1, w });
      }
    }
    // inner doors (in the partition beside the side), the front door
    for (const d of P.doors) {
      if (d.fl !== r.fl) continue;
      for (const k of Object.keys(out)) {
        const s = out[k],
          vert = k === 'x0' || k === 'x1';
        if (vert !== (d.axis === 'y')) continue;
        const wallC = vert ? s.A[0] + s.n[0] * -PW * 0.5 : s.A[1] + s.n[1] * -PW * 0.5,
          dc = vert ? d.x : d.y;
        if (Math.abs(wallC - dc) > 0.09) continue;
        const along = vert ? d.y : d.x,
          lo = vert ? Math.min(s.A[1], s.B[1]) : Math.min(s.A[0], s.B[0]),
          hi = vert ? Math.max(s.A[1], s.B[1]) : Math.max(s.A[0], s.B[0]);
        if (along < lo || along > hi) continue;
        const pa = vert ? [s.A[0], along - d.w / 2] : [along - d.w / 2, s.A[1]],
          pb = vert ? [s.A[0], along + d.w / 2] : [along + d.w / 2, s.A[1]];
        s.holes.push({
          kind: 'door',
          u0: Math.min(s.u(...pa), s.u(...pb)),
          u1: Math.max(s.u(...pa), s.u(...pb)),
          z0: d.z0,
          z1: d.z1,
          d,
        });
      }
    }
    if (r.kind === 'flur' && r.fl === 0) {
      const s = out.y0,
        u = s.u(P.front.x, s.A[1]);
      s.holes.push({ kind: 'front', u0: u - P.front.w / 2, u1: u + P.front.w / 2, z0: P.front.z0, z1: P.front.z1 });
    }
    return out;
  }
  // feat/haeuser: a look of ZIEINR.looks (the normal game's houses of 2026, haeuser/haeuser_heute.js) may give a room a look of its own
  // (the DDR living room kept, the kitchen of the nineties) and its own materials; the zombie night's looks have none – as before
  const lookOf = (P, r) => {
    const X = ZIEINR.looks[P.look];
    return (X && X.room && X.room(P, r)) || P.look;
  };
  // ---- materials of a room after the look ----
  function roomMats(P, r, M, R, look = P.look) {
    const X = ZIEINR.looks[P.look], // feat/haeuser
      own = X && X.mats && X.mats(P, r, M, R, look);
    if (own) return own;
    const k = r.kind;
    let wall = M.putz,
      floor = M.dielen,
      ceil = M.decke,
      wainscot = null;
    if (k === 'keller') return { wall: M.stein, floor: M.stein, ceil: M.holzdecke };
    if (k === 'boden') return { wall: M.holzdecke, floor: M.dielen, ceil: M.holzdecke };
    if (k === 'bad')
      return {
        wall: M.putz,
        floor: M.fliesen,
        ceil: M.decke,
        tiles: look === 'alt' ? M.fliesenWand : M.fliesen, // tiles to 1.4 m (bad-3: light blue and white in the DDR)
      };
    if (look === 'alt') {
      if (k === 'stube') {
        wall = R.pick([M.tapete.streifen, M.tapete.schablone, M.putz]);
        ceil = M.holzdecke;
        wainscot = true;
      } else if (k === 'kammer' || k === 'schlafzimmer' || k === 'kinderzimmer')
        wall = R.pick([M.tapete.schablone, M.putz, M.tapete.streifen]);
      if (k === 'flur' || k === 'kueche' || k === 'vorrat' || k === 'waschkueche') floor = M.platten;
      if (k === 'kammer' || k === 'schlafzimmer') ceil = R.chance(0.5) ? M.holzdecke : M.decke;
    } else if (look === 'ddr') {
      if (k === 'stube' || k === 'wohnzimmer') wall = R.pick([M.tapete.ddr, M.tapete.blume]);
      else if (k === 'schlafzimmer' || k === 'kammer' || k === 'kinderzimmer')
        wall = R.pick([M.tapete.blume, M.tapete.streifen, M.putz]);
      if (k === 'kueche' || k === 'flur') floor = M.linoleum;
    } else {
      if (k !== 'kueche') floor = M.laminat;
      else floor = M.platten;
    }
    return { wall, floor, ceil, wainscot };
  }
  // ---- a wall face with rectangular holes (grid of cells), facing n; A → B along u ----
  function wallFace(m, mat, A, d, L, z0, z1, n, holes) {
    const us = [0, L],
      zs = [z0, z1];
    for (const h of holes) {
      us.push(Math.max(0, Math.min(L, h.u0)), Math.max(0, Math.min(L, h.u1)));
      zs.push(Math.max(z0, Math.min(z1, h.z0)), Math.max(z0, Math.min(z1, h.z1)));
    }
    const U = [...new Set(us.map(v => +v.toFixed(4)))].sort((a, b) => a - b),
      Z = [...new Set(zs.map(v => +v.toFixed(4)))].sort((a, b) => a - b),
      P = (u, z) => [A[0] + d[0] * u, A[1] + d[1] * u, z],
      nn = [n[0], n[1], 0];
    for (let i = 0; i < U.length - 1; i++)
      for (let j = 0; j < Z.length - 1; j++) {
        const um = (U[i] + U[i + 1]) / 2,
          zm = (Z[j] + Z[j + 1]) / 2;
        if (U[i + 1] - U[i] < 1e-3 || Z[j + 1] - Z[j] < 1e-3) continue;
        if (holes.some(h => um > h.u0 && um < h.u1 && zm > h.z0 && zm < h.z1)) continue;
        m.quad(mat, P(U[i], Z[j]), P(U[i + 1], Z[j]), P(U[i + 1], Z[j + 1]), P(U[i], Z[j + 1]), nn, [
          [U[i], Z[j]],
          [U[i + 1], Z[j]],
          [U[i + 1], Z[j + 1]],
          [U[i], Z[j + 1]],
        ]);
      }
  }
  // the reveal of a hole through the outer wall (depth t outwards), the window frame, glass, sill; or the front door's leaf
  const FRAME = [0xe8e8e2, 0x4a3020, 0x2a4a34, 0x8a8c8c];
  function opening(C, s, h, t, house) {
    const m = C.shell,
      M = C.M,
      o = [-s.n[0], -s.n[1]],
      P = (u, z, k) => [s.A[0] + s.d[0] * u + o[0] * k, s.A[1] + s.d[1] * u + o[1] * k, z],
      revealMat = C.mats.wall === M.fliesen ? M.putz : C.mats.wall;
    // jambs, head, sill of the reveal
    m.quad(revealMat, P(h.u0, h.z0, 0), P(h.u0, h.z0, t), P(h.u0, h.z1, t), P(h.u0, h.z1, 0), [s.d[0], s.d[1], 0]);
    m.quad(revealMat, P(h.u1, h.z0, 0), P(h.u1, h.z1, 0), P(h.u1, h.z1, t), P(h.u1, h.z0, t), [-s.d[0], -s.d[1], 0]);
    m.quad(revealMat, P(h.u0, h.z1, 0), P(h.u0, h.z1, t), P(h.u1, h.z1, t), P(h.u1, h.z1, 0), [0, 0, -1]);
    m.quad(revealMat, P(h.u0, h.z0, 0), P(h.u1, h.z0, 0), P(h.u1, h.z0, t), P(h.u0, h.z0, t), [0, 0, 1]);
    const k = t - 0.07,
      fc = C.col(FRAME[house.frame] || FRAME[0], 0.5),
      bar = (u0, u1, z0, z1) => {
        const p = P(u0, 0, k - 0.03),
          q = P(u1, 0, k + 0.03);
        C.furn.box(fc, Math.min(p[0], q[0]), Math.max(p[0], q[0]), Math.min(p[1], q[1]), Math.max(p[1], q[1]), z0, z1);
      };
    if (h.kind === 'front') {
      // the front door from inside: a panelled leaf in the reveal (the game leaves the house through it), its frame and handle
      const leaf = C.col(0x5a3a22, 0.6);
      const p = P(h.u0, 0, k - 0.02),
        q = P(h.u1, 0, k + 0.03);
      C.furn.box(
        leaf,
        Math.min(p[0], q[0]),
        Math.max(p[0], q[0]),
        Math.min(p[1], q[1]),
        Math.max(p[1], q[1]),
        h.z0,
        h.z1
      );
      for (const [za, zb] of [
        [h.z0 + 0.15, h.z0 + 0.95],
        [h.z0 + 1.1, h.z1 - 0.15],
      ]) {
        const p2 = P(h.u0 + 0.14, 0, k - 0.04),
          q2 = P(h.u1 - 0.14, 0, k - 0.02);
        C.furn.box(
          C.col(0x4a2e1a, 0.65),
          Math.min(p2[0], q2[0]),
          Math.max(p2[0], q2[0]),
          Math.min(p2[1], q2[1]),
          Math.max(p2[1], q2[1]),
          za,
          zb
        );
      }
      const hp = P(h.u1 - 0.12, 0, k - 0.08);
      C.furn.box(M.messing, hp[0] - 0.03, hp[0] + 0.03, hp[1] - 0.03, hp[1] + 0.03, h.z0 + 1.0, h.z0 + 1.08);
      return;
    }
    // window: frame, mullion and transom as the facade paints them, glass, the sill board inside, curtains
    const w = h.u1 - h.u0,
      fw = 0.065;
    bar(h.u0, h.u0 + fw, h.z0, h.z1);
    bar(h.u1 - fw, h.u1, h.z0, h.z1);
    bar(h.u0, h.u1, h.z0, h.z0 + fw);
    bar(h.u0, h.u1, h.z1 - fw, h.z1);
    const zt = h.z0 + (h.z1 - h.z0) * 0.7;
    if (!h.w.attic) {
      bar(h.u0 + w / 2 - 0.03, h.u0 + w / 2 + 0.03, h.z0, zt);
      bar(h.u0, h.u1, zt - 0.025, zt + 0.025);
    }
    m.quad(
      M.glas,
      P(h.u0, h.z0, k + 0.035),
      P(h.u1, h.z0, k + 0.035),
      P(h.u1, h.z1, k + 0.035),
      P(h.u0, h.z1, k + 0.035),
      [s.n[0], s.n[1], 0]
    );
    const p = P(h.u0 - 0.05, 0, -0.14),
      q = P(h.u1 + 0.05, 0, 0.05);
    C.furn.box(
      C.mats.sill || C.M.holz,
      Math.min(p[0], q[0]),
      Math.max(p[0], q[0]),
      Math.min(p[1], q[1]),
      Math.max(p[1], q[1]),
      h.z0 - 0.04,
      h.z0
    );
    // flower pots on the sills: geraniums, a spider plant, in the DDR a cactus – on most sills of the rooms one lives in
    const lived = ['stube', 'kueche', 'schlafzimmer', 'kammer', 'kinderzimmer', 'wohnzimmer'].includes(C.room.kind);
    if (C.R() < (lived ? 0.8 : 0.3) && h.z0 - C.room.z0 < 1.2) {
      const kinds = C.look === 'ddr' ? ['geranie', 'kaktus', 'gruenlilie'] : ['geranie', 'geranie', 'gruenlilie'],
        nP = w > 0.9 && lived ? 2 : 1;
      for (let k = 0; k < nP; k++) {
        const pp = P(h.u0 + w * (nP > 1 ? 0.25 + k * 0.5 : C.R.r(0.3, 0.7)), 0, -0.04);
        ZIEINR.DK.pflanze(C, pp[0], pp[1], h.z0, C.R.pick(kinds));
      }
    }
    // curtains: net curtains (Stores) over the window in the DDR and later looks, a checked half curtain in old kitchens
    const kind = C.room.kind,
      look = C.look;
    if (kind === 'keller' || kind === 'boden' || kind === 'flur') return;
    if (C.ext && C.ext.curtains && C.ext.curtains(C, s, h, P, folds)) return; // feat/haeuser: the look's own (drapes, blinds)
    const cz1 = h.z1 + 0.12,
      cz0 = look === 'alt' && kind === 'kueche' ? h.z0 + 0.05 : h.z0 - 0.02;
    if (kind !== 'bad' || C.R() < 0.5) {
      const mat = look === 'alt' && kind === 'kueche' ? M.gingham : M.stores,
        top = look === 'alt' && kind === 'kueche' ? h.z0 + (h.z1 - h.z0) * 0.55 : cz1;
      folds(C.furn, mat, P, h.u0 - 0.1, h.u1 + 0.1, -0.06, cz0, top, s.n);
      if ((look === 'ddr' || (look === 'nachwende' && C.R() < 0.5)) && kind !== 'kueche' && kind !== 'bad') {
        const side = C.col(
          C.R.pick(look === 'ddr' ? [0xa8562a, 0x7a3a28, 0x6a7a4a, 0xc89a4a] : [0x8a7a6a, 0x5a6a7a, 0xb8a888]),
          0.95
        );
        folds(C.furn, side, P, h.u0 - 0.45, h.u0 - 0.05, -0.1, h.z0 - 0.3, cz1, s.n, 3);
        folds(C.furn, side, P, h.u1 + 0.05, h.u1 + 0.45, -0.1, h.z0 - 0.3, cz1, s.n, 3);
      }
      const r0 = P(h.u0 - 0.5, 0, -0.08),
        r1 = P(h.u1 + 0.5, 0, -0.08);
      C.furn.rod(C.col(0xd8d0b8, 0.4, 0.3), [r0[0], r0[1], cz1 + 0.03], [r1[0], r1[1], cz1 + 0.03], 0.012, 5);
    }
  }
  // a curtain with folds: a zig-zag strip from u0 to u1 at offset k (inside: negative), z0..z1
  function folds(m, mat, P, u0, u1, k, z0, z1, n, nf) {
    const N = nf || Math.max(4, Math.round((u1 - u0) / 0.09));
    for (let i = 0; i < N; i++) {
      const a = u0 + ((u1 - u0) * i) / N,
        b = u0 + ((u1 - u0) * (i + 1)) / N,
        ka = k - (i % 2 ? 0.025 : 0),
        kb = k - ((i + 1) % 2 ? 0.025 : 0);
      m.quad(
        mat,
        P(a, z0, ka),
        P(b, z0, kb),
        P(b, z1, kb),
        P(a, z1, ka),
        [n[0], n[1], 0],
        [
          [a, z0],
          [b, z0],
          [b, z1],
          [a, z1],
        ]
      );
    }
  }
  // rect minus a hole (axis-aligned, all in the house frame): up to four rects
  function minus(r, h) {
    if (!h || h[0] >= r[1] || h[1] <= r[0] || h[2] >= r[3] || h[3] <= r[2]) return [r];
    const out = [],
      a = Math.max(r[0], h[0]),
      b = Math.min(r[1], h[1]);
    if (h[2] > r[2]) out.push([r[0], r[1], r[2], h[2]]);
    if (h[3] < r[3]) out.push([r[0], r[1], h[3], r[3]]);
    const y0 = Math.max(r[2], h[2]),
      y1 = Math.min(r[3], h[3]);
    if (a > r[0]) out.push([r[0], a, y0, y1]);
    if (b < r[1]) out.push([b, r[1], y0, y1]);
    return out.filter(q => q[1] - q[0] > 1e-3 && q[3] - q[2] > 1e-3);
  }
  const minusAll = (r, holes) => holes.reduce((list, h) => list.flatMap(q => minus(q, h)), [r]);
  function hFloor(m, mat, r, z, up) {
    const P = (x, y) => [x, y, z];
    if (up)
      m.quad(
        mat,
        P(r[0], r[2]),
        P(r[1], r[2]),
        P(r[1], r[3]),
        P(r[0], r[3]),
        [0, 0, 1],
        [
          [r[0], r[2]],
          [r[1], r[2]],
          [r[1], r[3]],
          [r[0], r[3]],
        ]
      );
    else
      m.quad(
        mat,
        P(r[0], r[2]),
        P(r[0], r[3]),
        P(r[1], r[3]),
        P(r[1], r[2]),
        [0, 0, -1],
        [
          [r[0], r[2]],
          [r[0], r[3]],
          [r[1], r[3]],
          [r[1], r[2]],
        ]
      );
  }
  // ---- mounting ----
  let NEXT = 1;
  S.mount = async (id, o) => {
    const t0 = performance.now();
    if (!VILLAGE.ready) return null;
    const P0 = ZIPLAN.plan(id);
    if (!P0) return null;
    // feat/haeuser: the normal game (haeuser/haeuser.js) passes a look of its own – a copy of the plan in that look; the zombie night
    // passes none and builds from the plan itself, as before
    const P = o && o.look && o.look !== P0.look ? Object.assign({}, P0, { look: o.look }) : P0;
    S.err = null; // the last furnishing error, of this house
    const M = ZIMOB.mats(),
      R = ZIPLAN.rng(P.seed),
      mem0 = window.GAME && GAME.R ? { g: GAME.R.info.memory.geometries, t: GAME.R.info.memory.textures } : null;
    const H = {
      id,
      n: NEXT++,
      plan: P,
      cols: [],
      walks: [],
      doors: [],
      doorKeys: [],
      acts: [],
      lamps: [],
      parts: [],
      containers: [],
      spots: [],
      openings: [],
      rooms: [],
      onSearch: null,
      onUse: null,
      lit: {},
    };
    const G = new THREE.Group();
    G.name = 'zinnen-' + id;
    G.position.copy(V(P.F.ox, P.F.oy, 0));
    G.rotation.y = Math.atan2(P.F.s, P.F.c);
    G.updateMatrixWorld(true);
    H.group = G;
    // colliders and walk surfaces in the house frame (rotated boxes, game/walkable.js index 9); the slots of an earlier house are used again
    const rot = P.rot,
      fill = (e, v) => {
        for (let i = 0; i < 11; i++) e[i] = v[i];
        e.length = v.length;
        return e;
      },
      col = (x0, x1, y0, y1, z0, z1) => {
        const v = [x0, x1, y0, y1, z0, z1, TAG, null, null, rot],
          e = S.poolCol.length ? fill(S.poolCol.pop(), v) : (COL.push(v), v);
        H.cols.push(e);
      },
      walk = (x0, x1, y0, y1, z, typ = 'wood', key = null) => {
        const v = [x0, x1, y0, y1, z, typ, null, null, key, rot],
          e = S.poolWalk.length ? fill(S.poolWalk.pop(), v) : (WALK.push(v), v);
        H.walks.push(e);
      };
    const shell = new ZIMOB.Mesher(),
      furn = new ZIMOB.Mesher(),
      // moving parts (one draw call each): ten, fewer in big houses with many doors (each door leaf is one too); none when nothing is
      // searched (feat/haeuser: the normal game, o.still – every leaf is part of its furniture)
      PARTS_MAX = o && o.still ? 0 : Math.max(3, Math.min(10, 17 - P.doors.length));
    const house = { frame: (P.b.st && P.b.st.frame) || 0 };
    // the context for the furniture (zombie/z_innen_einr.js)
    const C = {
      P,
      M,
      R,
      look: P.look,
      owner: P.owner,
      shell,
      furn,
      m: furn,
      col: ZIMOB.col,
      z: P.zG,
      room: null,
      mats: {},
      found: {},
    };
    C.ext = ZIEINR.looks[P.look] || null; // feat/haeuser: the look's hooks (none in the zombie night)
    C.find = kind => C.found[kind] || null;
    C.solid = (r, z0, z1) => col(r[0], r[1], r[2], r[3], z0, z1);
    C.solidW = C.solid;
    C.container = (kind, label, pos) => {
      const c = {
        id: kind + '_' + H.containers.length,
        kind,
        room: C.room.id,
        pos: P.toW(pos[0], pos[1]).concat(pos[2]),
        label,
        parts: [],
        t: 0,
        want: 0,
      };
      c.lp = pos;
      H.containers.push(c);
      return c;
    };
    C.part = o => {
      // one moving part each and ten in a house at most (draw calls); the others are searched without moving
      if (o.container && (o.container.parts.length >= 1 || H.parts.length >= PARTS_MAX))
        o = Object.assign({}, o, { container: null });
      if (!o.container) {
        // a leaf that never opens: part of the furniture
        const F = o.F,
          hp = F.P(o.hinge[0], o.hinge[1], 0),
          PF = ZIEINR.frame([hp[0], hp[1]], F.a, F.n);
        const zf = o.kind === 'lid' ? o.z : 0;
        const PP = Object.assign({}, PF, { P: (u, v, z) => PF.P(u, v, z + zf) });
        if (o.kind === 'lid')
          PP.box = (m, mat, u0, u1, v0, v1, z0, z1, oo) => PF.box(m, mat, u0, u1, v0, v1, z0 + zf, z1 + zf, oo);
        o.build(furn, o.kind === 'lid' ? PP : PF);
        return null;
      }
      const F = o.F,
        hp = F.P(o.hinge[0], o.hinge[1], o.kind === 'lid' ? o.z : 0),
        pm = new ZIMOB.Mesher(hp),
        PF = ZIEINR.frame([hp[0], hp[1]], F.a, F.n);
      if (o.kind === 'lid') {
        const PP = Object.assign({}, PF);
        PP.box = (m, mat, u0, u1, v0, v1, z0, z1, oo) => PF.box(m, mat, u0, u1, v0, v1, z0 + hp[2], z1 + hp[2], oo);
        o.build(pm, PP);
      } else o.build(pm, PF);
      const pivot = new THREE.Group();
      pivot.position.copy(V(hp[0], hp[1], hp[2]));
      G.add(pivot);
      const meshes = pm.finish(pivot, false);
      for (const me of meshes) me.matrixAutoUpdate = true;
      // the opening: a leaf turns into the room (its free edge towards n), a drawer slides out, a lid turns up about its back edge
      // a leaf from its hinge along dir·a: turned counter-clockwise its free edge goes to (−a_y, a_x)·dir – into the room if that is n
      const dir = o.dir || 1,
        turn = Math.sign(dir * (-F.a[1] * F.n[0] + F.a[0] * F.n[1])) || 1,
        part = { pivot, kind: o.kind, F, turn, set: null };
      part.set = e => {
        if (o.kind === 'hinge') pivot.rotation.y = turn * 1.75 * e;
        else if (o.kind === 'drawer')
          pivot.position.copy(V(hp[0] + F.n[0] * 0.32 * e, hp[1] + F.n[1] * 0.32 * e, hp[2]));
        else {
          const ax = new THREE.Vector3(F.a[0], 0, -F.a[1]).normalize();
          pivot.quaternion.setFromAxisAngle(ax, 1.6 * e); // a × n is up: the front edge rises
        }
      };
      o.container.parts.push(part);
      H.parts.push(part);
      return part;
    };
    C.spot = (kind, pos, F, label, o = {}) => {
      // the compass heading of one facing the thing (towards its wall: −n turned into the site)
      const w = P.toW(pos[0], pos[1]),
        az = F
          ? (Math.atan2(-(F.n[0] * P.F.c - F.n[1] * P.F.s), -(F.n[0] * P.F.s + F.n[1] * P.F.c)) * 180) / Math.PI
          : 0;
      const sp = {
        id: kind + '_' + H.spots.length,
        kind,
        room: C.room.id,
        pos: [w[0], w[1], pos[2]],
        yaw: az,
        label,
        o,
      };
      if (o.head) sp.head = P.toW(o.head[0], o.head[1]).concat(o.head[2]);
      H.spots.push(sp);
      C.found[kind] = pos;
      return sp;
    };
    C.seat = (pos, F, label) => C.spot('sitz', pos, F, label);
    // a lamp: its shade in the room's furniture (a palette colour), and a glowing copy a hair larger that is only in the scene while the
    // room's light is on (an unlit lamp costs no draw call of its own)
    C.lamp = (pos, kind, r) => {
      const shadeCol =
          kind === 'bulb' || kind === 'kugel' || kind === 'schale' || kind === 'fluter'
            ? 0xfff2d6
            : kind === 'tuete'
              ? C.R.pick([0xe8742a, 0xd8b030, 0xc83a2a, 0xf0e0c0])
              : C.R.pick([0xf3ead8, 0xe8c890, 0xf0e0c0]),
        mat = ZIMOB.glowMat(shadeCol),
        pm = new ZIMOB.Mesher(pos),
        x = pos[0],
        y = pos[1],
        z = pos[2],
        prof =
          kind === 'bulb'
            ? [
                [0.0, z - 0.04],
                [0.035, z - 0.02],
                [0.03, z + 0.03],
                [0.012, z + 0.06],
              ]
            : kind === 'small'
              ? [
                  [r, z - 0.1],
                  [r * 0.6, z + 0.08],
                ]
              : kind === 'schale'
                ? [
                    [0.0, z - 0.1],
                    [r * 0.75, z - 0.07],
                    [r, z],
                  ]
                : kind === 'kugel'
                  ? [
                      [0.0, z - 0.2],
                      [r * 0.7, z - 0.17],
                      [r, z - 0.1],
                      [r * 0.7, z - 0.03],
                      [0.035, z],
                    ]
                  : kind === 'tuete'
                    ? [
                        [r, z - 0.24],
                        [r * 0.55, z - 0.08],
                        [0.025, z + 0.02],
                      ]
                    : kind === 'fluter'
                      ? [
                          [r, z - 0.03],
                          [r * 0.95, z + 0.01],
                          [0.03, z + 0.02],
                        ]
                      : [
                          [r, z - 0.06],
                          [r * 0.85, z],
                          [r * 0.35, z + 0.12],
                          [0.03, z + 0.16],
                        ],
        seg = kind === 'bulb' ? 8 : kind === 'small' ? 10 : 12;
      furn.lathe(C.col(shadeCol, 0.9), x, y, prof, seg, { caps: false });
      pm.lathe(
        mat,
        x,
        y,
        prof.map(([pr, pz]) => [pr * 1.03 + 0.002, pz]),
        seg,
        { caps: false }
      );
      const g = new THREE.Group();
      g.position.copy(V(x, y, z));
      pm.finish(g, false);
      H.lamps.push({ room: C.room.id, mat, pos: P.toW(x, y).concat(z), kind, g });
    };
    // ---- holes: the main stair's in every upper floor, the attic stair's in the attic floor, the hatch in the ground floor ----
    const holeOf = st => {
      const dir = st.y1 >= st.y0 ? 1 : -1,
        ya = st.y0 + dir * st.holeK * st.tread;
      return [st.x0, st.x1, Math.min(ya, st.y1), Math.max(ya, st.y1)];
    };
    const floorHoles = k => {
      const out = [];
      if (P.stair && k >= 1 && k <= P.nSt - 1) out.push(holeOf(P.stair));
      if (P.astair && k === P.nSt) out.push(holeOf(P.astair));
      if (P.hatch && k === 0) out.push([P.hatch.x0, P.hatch.x1, P.hatch.y0, P.hatch.y1]);
      return out;
    };
    const ceilHoles = k => {
      const out = [];
      if (k < 0) return P.hatch ? [[P.hatch.x0, P.hatch.x1, P.hatch.y0, P.hatch.y1]] : out;
      if (P.stair && k < P.nSt - 1) out.push(holeOf(P.stair));
      if (P.astair && k === P.nSt - 1) out.push(holeOf(P.astair));
      return out;
    };
    // ---- the rooms: walls, floors, ceilings, openings ----
    const rooms = P.rooms;
    const blocksOf = {};
    for (const r of rooms) {
      C.room = r;
      C.R = ZIPLAN.rng(P.seed + r.fl * 101 + r.x0 * 7 + r.y0 * 13);
      C.look = lookOf(P, r); // feat/haeuser
      const mats = (C.mats = roomMats(P, r, M, C.R, C.look)),
        attic = r.kind === 'boden';
      const sd = roomSides(P, r),
        blocks = [];
      r.outer = {};
      for (const k of Object.keys(sd)) {
        const s = sd[k];
        r.outer[k] = !!s.outer;
        const z0 = r.z0,
          z1 = attic ? r.z0 + 2.3 : r.z1;
        if (attic) roofWall(shell, mats.wall, s, z0, s.holes);
        else wallFace(shell, mats.wall, s.A, s.d, s.L, z0, z1, s.n, s.holes);
        if (mats.tiles)
          wallFace(
            shell,
            mats.tiles,
            [s.A[0] + s.n[0] * 0.005, s.A[1] + s.n[1] * 0.005],
            s.d,
            s.L,
            z0,
            z0 + 1.4,
            s.n,
            s.holes
          );
        for (const h of s.holes) {
          if (s.outer && (h.kind === 'window' || h.kind === 'front')) opening(C, s, h, P.t, house);
          blocks.push({ side: k, u0: h.u0 - 0.1, u1: h.u1 + 0.1, z0: h.z0, door: h.kind !== 'window' });
        }
        // the wainscot of an old Stube (Lambris, stube-2): boards to 1 m
        if (mats.wainscot) {
          const wm = C.col(C.R.pick([0x6a4a30, 0x8a6a48, 0x4a5a48]), 0.6),
            hs = s.holes.filter(h => h.z0 < z0 + 1.05).map(h => ({ u0: h.u0, u1: h.u1 }));
          let u = 0;
          for (const h of hs.sort((a, b) => a.u0 - b.u0).concat([{ u0: s.L, u1: s.L }])) {
            if (h.u0 - u > 0.05) {
              const p = [s.A[0] + s.d[0] * u, s.A[1] + s.d[1] * u],
                q = [s.A[0] + s.d[0] * h.u0 + s.n[0] * 0.025, s.A[1] + s.d[1] * h.u0 + s.n[1] * 0.025];
              furn.box(
                wm,
                Math.min(p[0], q[0]),
                Math.max(p[0], q[0]),
                Math.min(p[1], q[1]),
                Math.max(p[1], q[1]),
                z0,
                z0 + 1.0
              );
            }
            u = Math.max(u, h.u1);
          }
        }
        // colliders: the partition beside an inner side (both rooms add theirs), the outer wall out to the facade line; doorways stay free
        const al = k === 'y0' || k === 'y1' ? 0 : 1,
          c0 = al ? s.A[0] : s.A[1],
          cs = al ? -s.n[0] : -s.n[1],
          off = s.outer ? P.t + 0.05 : PW,
          cA = Math.min(c0, c0 + cs * off),
          cB = Math.max(c0, c0 + cs * off),
          ext = s.outer ? P.t : 0,
          lo = Math.min(s.A[al], s.B[al]) - ext,
          hi = Math.max(s.A[al], s.B[al]) + ext,
          gaps = s.holes
            .filter(h => h.kind === 'door')
            .map(h => [s.A[al] + s.d[al] * h.u0, s.A[al] + s.d[al] * h.u1])
            .map(([p, q]) => [Math.min(p, q), Math.max(p, q)])
            .sort((p, q) => p[0] - q[0]),
          seg = (a, b) => {
            if (b - a < 0.01) return;
            if (al) col(cA, cB, a, b, z0 - 0.05, z1 + 0.05);
            else col(a, b, cA, cB, z0 - 0.05, z1 + 0.05);
          };
        let a = lo;
        for (const [g0, g1] of gaps) {
          seg(a, g0);
          a = Math.max(a, g1);
        }
        seg(a, hi);
      }
      r.blocks = blocks;
      blocksOf[r.id] = blocks;
      // floor and ceiling (minus the stair holes and the hatch); the floor reaches under the partitions and into the door gaps
      const rect = [r.x0, r.x1, r.y0, r.y1],
        holesF = r.kind === 'keller' ? [] : floorHoles(r.fl),
        holesC = r.kind === 'keller' ? ceilHoles(-1) : attic ? [] : ceilHoles(r.fl);
      const ext = [
        r.x0 - (r.outer.x0 ? 0 : PW / 2),
        r.x1 + (r.outer.x1 ? 0 : PW / 2),
        r.y0 - (r.outer.y0 ? 0 : PW / 2),
        r.y1 + (r.outer.y1 ? 0 : PW / 2),
      ];
      for (const q of minusAll(r.kind === 'keller' || attic ? rect : ext, holesF))
        hFloor(shell, mats.floor, q, r.z0, true);
      if (attic) roofInside(r);
      else {
        const cext = [
          r.x0 - (r.outer.x0 ? P.t : PW / 2),
          r.x1 + (r.outer.x1 ? P.t : PW / 2),
          r.y0 - (r.outer.y0 ? P.t : PW / 2),
          r.y1 + (r.outer.y1 ? P.t : PW / 2),
        ];
        for (const q of minusAll(r.kind === 'keller' ? rect : cext, holesC)) hFloor(shell, mats.ceil, q, r.z1, false);
      }
      await tick0();
    }
    // a wall under the roof: up from z0 to the roof's underside (sampled along it), holes for the gable windows
    function roofWall(m, mat, s, z0, holes) {
      const top = u => {
        const z = P.under(s.A[0] + s.d[0] * u, s.A[1] + s.d[1] * u);
        return z === null ? z0 : Math.max(z0, z);
      };
      const us = [0, s.L];
      for (let u = 0.6; u < s.L; u += 0.6) us.push(u);
      for (const h of holes) us.push(Math.max(0, Math.min(s.L, h.u0)), Math.max(0, Math.min(s.L, h.u1)));
      const zs = [z0, z0 + 30];
      for (const h of holes) zs.push(h.z0, h.z1);
      const U = [...new Set(us.map(v => +v.toFixed(4)))].sort((a, b) => a - b),
        Z = [...new Set(zs.map(v => +v.toFixed(4)))].sort((a, b) => a - b),
        Pp = (u, z) => [s.A[0] + s.d[0] * u, s.A[1] + s.d[1] * u, z],
        nn = [s.n[0], s.n[1], 0];
      for (let i = 0; i < U.length - 1; i++) {
        const ua = U[i],
          ub = U[i + 1],
          ta = top(ua),
          tb = top(ub);
        if (ub - ua < 1e-3) continue;
        for (let j = 0; j < Z.length - 1; j++) {
          const za = Z[j],
            zb = Z[j + 1],
            ha = Math.min(zb, ta),
            hb = Math.min(zb, tb);
          if (ha <= za + 1e-3 && hb <= za + 1e-3) continue;
          const um = (ua + ub) / 2,
            zm = (za + Math.min(zb, (ta + tb) / 2)) / 2;
          if (holes.some(h => um > h.u0 && um < h.u1 && zm > h.z0 && zm < h.z1)) continue;
          m.quad(mat, Pp(ua, za), Pp(ub, za), Pp(ub, Math.max(za, hb)), Pp(ua, Math.max(za, ha)), nn, [
            [ua, za],
            [ub, za],
            [ub, hb],
            [ua, ha],
          ]);
        }
      }
    }
    // the attic's ceiling: the roof's triangles from below (boards), rafters along the slope, collar beams, the chimney
    function roofInside(r) {
      for (const t of P.roof.tris) {
        const q = t.map(p => P.toL(p[0], p[1]).concat(p[2] - 0.22)),
          e1 = [q[1][0] - q[0][0], q[1][1] - q[0][1], q[1][2] - q[0][2]],
          e2 = [q[2][0] - q[0][0], q[2][1] - q[0][1], q[2][2] - q[0][2]],
          nz = e1[0] * e2[1] - e1[1] * e2[0];
        let n = [e1[1] * e2[2] - e1[2] * e2[1], e1[2] * e2[0] - e1[0] * e2[2], nz];
        const L = Math.hypot(...n) || 1;
        n = n.map(v => v / L);
        if (n[2] > 0) n = n.map(v => -v);
        const uv = p => [p[0], p[1]];
        if (nz > 0) shell.tri(M.holzdecke, q[0], q[2], q[1], n, uv(q[0]), uv(q[2]), uv(q[1]));
        else shell.tri(M.holzdecke, q[0], q[1], q[2], n, uv(q[0]), uv(q[1]), uv(q[2]));
      }
      // which way the roof falls: the gradient of its biggest triangle
      let gx = 0,
        gy = 0,
        best = 0;
      for (const t of P.roof.tris) {
        const q = t.map(p => P.toL(p[0], p[1]).concat(p[2])),
          e1 = [q[1][0] - q[0][0], q[1][1] - q[0][1], q[1][2] - q[0][2]],
          e2 = [q[2][0] - q[0][0], q[2][1] - q[0][1], q[2][2] - q[0][2]],
          n = [e1[1] * e2[2] - e1[2] * e2[1], e1[2] * e2[0] - e1[0] * e2[2], e1[0] * e2[1] - e1[1] * e2[0]],
          a = Math.abs(n[2]);
        if (a > best && Math.abs(n[2]) > 1e-6) {
          best = a;
          gx = -n[0] / n[2];
          gy = -n[1] / n[2];
        }
      }
      const alongY = Math.abs(gy) >= Math.abs(gx),
        beam = M.holz,
        zr = (x, y) => {
          const z = P.under(x, y);
          return z === null ? null : z - 0.07;
        };
      if (alongY)
        for (let x = r.x0 + 0.35; x < r.x1 - 0.2; x += 0.9) {
          let prev = null;
          for (let y = r.y0 - 0.02; y <= r.y1 + 0.03; y += 0.5) {
            const yy = Math.min(y, r.y1),
              z = zr(x, yy);
            if (z !== null && prev) furn.rod(beam, prev, [x, yy, z], 0.06, 4);
            prev = z === null ? null : [x, yy, z];
          }
          // the collar beam where the roof is high enough
          let a = null,
            b = null;
          for (let y = r.y0; y <= r.y1; y += 0.1) {
            const z = zr(x, y);
            if (z !== null && z > r.z0 + 2.15) {
              if (a === null) a = y;
              b = y;
            }
          }
          if (a !== null && b - a > 0.6) furn.box(beam, x - 0.05, x + 0.05, a, b, r.z0 + 2.0, r.z0 + 2.14);
        }
      else
        for (let y = r.y0 + 0.35; y < r.y1 - 0.2; y += 0.9) {
          let prev = null;
          for (let x = r.x0 - 0.02; x <= r.x1 + 0.03; x += 0.5) {
            const xx = Math.min(x, r.x1),
              z = zr(xx, y);
            if (z !== null && prev) furn.rod(beam, prev, [xx, y, z], 0.06, 4);
            prev = z === null ? null : [xx, y, z];
          }
          let a = null,
            b = null;
          for (let x = r.x0; x <= r.x1; x += 0.1) {
            const z = zr(x, y);
            if (z !== null && z > r.z0 + 2.15) {
              if (a === null) a = x;
              b = x;
            }
          }
          if (a !== null && b - a > 0.6) furn.box(beam, a, b, y - 0.05, y + 0.05, r.z0 + 2.0, r.z0 + 2.14);
        }
      // the chimney through the attic, and the smoke chamber beside it (Räucherkammer, Wikipedia)
      // (not where the attic stair had to come up beside it – the chimney stands on the roof outside all the same)
      const ch = P.astair && P.astair.chimClash ? null : P.chimL;
      if (ch && ch[0] > r.x0 + 0.5 && ch[0] < r.x1 - 0.5 && ch[1] > r.y0 + 0.5 && ch[1] < r.y1 - 0.5) {
        const top = (P.under(ch[0], ch[1]) || r.z0 + 2.5) + 0.25,
          brick = C.col(0x8a4a34, 0.9);
        shell.box(brick, ch[0] - 0.26, ch[0] + 0.26, ch[1] - 0.21, ch[1] + 0.21, r.z0, top);
        col(ch[0] - 0.26, ch[0] + 0.26, ch[1] - 0.21, ch[1] + 0.21, r.z0, r.z0 + 2.5);
        r.chim = ch;
      }
    }
    // ---- walk surfaces: one slab per storey and the attic floor (minus holes), the cellar floor ----
    for (let k = 0; k < P.nSt; k++)
      for (const q of minusAll([P.xi0, P.xi1, P.yi0, P.yi1], floorHoles(k)))
        walk(q[0], q[1], q[2], q[3], P.zF[k], 'wood');
    const att = rooms.find(r => r.kind === 'boden');
    if (att)
      for (const q of minusAll([att.x0, att.x1, att.y0, att.y1], floorHoles(P.nSt)))
        walk(q[0], q[1], q[2], q[3], P.zA, 'wood');
    if (P.cellar) walk(P.cellar.x0, P.cellar.x1, P.cellar.y0, P.cellar.y1, P.cellar.z0, 'stone');
    // ---- stairs (in the hall): steps, stringers, a handrail; the opening above gets a railing ----
    const stairWood = P.look === 'alt' ? M.holz : P.look === 'ddr' ? M.hell : M.eiche,
      STAIR_GAP = 0.45,
      PASS = 0.5;
    // cont: another flight goes on up from the top (stacked stairs): the opening's lower end then has no rail – that flight runs over it
    function buildStair(st, z0, cont = false) {
      const dir = st.y1 >= st.y0 ? 1 : -1,
        wood = stairWood,
        ztop = z0 + st.n * st.rise;
      for (let k = 1; k < st.n; k++) {
        const ya = st.y0 + dir * (k - 1) * st.tread,
          yb = st.y0 + dir * k * st.tread,
          lo = Math.min(ya, yb),
          hi = Math.max(ya, yb),
          zt = z0 + k * st.rise;
        furn.box(wood, st.x0, st.x1, lo - 0.02, hi + 0.02, zt - 0.04, zt);
        const ry = dir > 0 ? lo : hi;
        furn.box(wood, st.x0 + 0.03, st.x1 - 0.03, ry - 0.01, ry + 0.01, zt - st.rise, zt - 0.04);
        walk(st.x0, st.x1, lo, hi, zt, 'wood');
      }
      const open = st.side === 'R' ? st.x0 : st.x1,
        oS = st.side === 'R' ? -1 : 1,
        yA = st.y0 - dir * 0.25,
        yB = st.y1,
        zB = z0 + (st.n - 1) * st.rise;
      // the stringers: sloped boards under the nosing line, on both sides
      for (const [x, nx] of [
        [open + oS * 0.0, oS],
        [st.side === 'R' ? st.x1 - 0.005 : st.x0 + 0.005, -oS],
      ]) {
        shell.quad(wood, [x, yA, z0], [x, yB, zB - 0.25], [x, yB, zB + 0.1], [x, yA, z0 + 0.25], [nx, 0, 0]);
        shell.quad(
          wood,
          [x - nx * 0.04, yA, z0],
          [x - nx * 0.04, yB, zB - 0.25],
          [x - nx * 0.04, yB, zB + 0.1],
          [x - nx * 0.04, yA, z0 + 0.25],
          [-nx, 0, 0]
        );
      }
      // (the railing's colliders begin 0.3 m above the floor upstairs: they stop one walking there, not one climbing below them)
      // the handrail and the railing above end at a newel post STAIR_GAP before the top: there one steps off sideways (the walker
      // is 0.42 m wide; the strip behind the last step can be narrow), so nothing is drawn where one walks
      const hx = open + oS * 0.03,
        yE = st.y1 - dir * STAIR_GAP,
        zE = zB - (STAIR_GAP / st.tread) * st.rise;
      furn.rod(wood, [hx, st.y0, z0 + 0.95], [hx, yE, zE + 0.95], 0.025, 6);
      for (let k = 1; (k - 0.5) * st.tread < (st.n - 1) * st.tread - STAIR_GAP - 0.1; k += 4) {
        const yy = st.y0 + dir * (k - 0.5) * st.tread;
        furn.box(wood, hx - 0.02, hx + 0.02, yy - 0.02, yy + 0.02, z0 + k * st.rise, z0 + k * st.rise + 0.95);
      }
      // above: the railing round the opening (its open side up to the newel and its lower end), the slab's edges
      const h = holeOf(st),
        yh = dir > 0 ? h[2] : h[3],
        rl = dir > 0 ? [h[2], yE] : [yE, h[3]];
      if (rl[1] - rl[0] > 0.2) {
        furn.rod(wood, [hx, rl[0], ztop + 0.95], [hx, rl[1], ztop + 0.95], 0.025, 6);
        for (let y = rl[0] + 0.06; y < rl[1] - 0.05; y += 0.12)
          furn.box(wood, hx - 0.012, hx + 0.012, y - 0.012, y + 0.012, ztop, ztop + 0.95);
        col(hx - 0.04, hx + 0.04, rl[0] - (dir > 0 ? 0.05 : 0), rl[1] + (dir > 0 ? 0 : 0.05), ztop + 0.3, ztop + 1.0);
      }
      furn.box(wood, hx - 0.04, hx + 0.04, yE - 0.04, yE + 0.04, zE, ztop + 1.02);
      if (!cont) {
        furn.rod(wood, [st.x0, yh, ztop + 0.95], [st.x1, yh, ztop + 0.95], 0.025, 6);
        col(st.x0, st.x1, yh - 0.04, yh + 0.04, ztop + 0.3, ztop + 1.0);
      }
      shell.quad(
        M.decke,
        [st.x0, yh, ztop - SLAB],
        [st.x1, yh, ztop - SLAB],
        [st.x1, yh, ztop],
        [st.x0, yh, ztop],
        [0, dir, 0]
      );
      shell.quad(
        M.decke,
        [hx, h[2], ztop - SLAB],
        [hx, h[3], ztop - SLAB],
        [hx, h[3], ztop],
        [hx, h[2], ztop],
        [-oS, 0, 0]
      );
    }
    if (P.stair) for (let k = 0; k < P.nSt - 1; k++) buildStair(P.stair, P.zF[k], k + 1 < P.nSt - 1);
    if (P.astair && att) buildStair(P.astair, P.zF[P.nSt - 1]);
    // ---- the cellar: steep steps under the trapdoor in the kitchen ----
    if (P.hatch) {
      const h = P.hatch,
        z0 = P.zG;
      for (let k = 1; k < h.n; k++) {
        const ya = h.y0 + (k - 1) * h.tread,
          yb = ya + h.tread,
          zt = z0 - k * h.rise;
        furn.box(M.hell, h.x0 + 0.05, h.x1 - 0.05, ya, yb + 0.03, zt - 0.04, zt);
        walk(h.x0, h.x1, ya, yb, zt, 'wood');
      }
      // the two stringers, each a board seen from both sides
      for (const x of [h.x0 + 0.02, h.x1 - 0.06])
        for (const [xx, nx] of [
          [x, -1],
          [x + 0.04, 1],
        ])
          shell.quad(
            M.hell,
            [xx, h.y0 - 0.05, z0 - 0.15],
            [xx, h.y1 + 0.05, z0 - h.n * h.rise],
            [xx, h.y1 + 0.05, z0 - h.n * h.rise + 0.25],
            [xx, h.y0 - 0.05, z0 + 0.0],
            [nx, 0, 0]
          );
      // the hole's edges and the lid (a DOORS flap: closed it is floor, open it stands up)
      for (const [a, b, n] of [
        [
          [h.x0, h.y0],
          [h.x1, h.y0],
          [0, 1],
        ],
        [
          [h.x1, h.y1],
          [h.x0, h.y1],
          [0, -1],
        ],
        [
          [h.x0, h.y1],
          [h.x0, h.y0],
          [1, 0],
        ],
        [
          [h.x1, h.y0],
          [h.x1, h.y1],
          [-1, 0],
        ],
      ])
        shell.quad(
          M.hell,
          [a[0], a[1], z0 - SLAB],
          [b[0], b[1], z0 - SLAB],
          [b[0], b[1], z0],
          [a[0], a[1], z0],
          [n[0], n[1], 0]
        );
      const key = 'zinnen:' + id + ':luke',
        lg = new THREE.Group(),
        lm = new ZIMOB.Mesher([h.x0, h.y1, z0]),
        lid = C.col(0x6a4a30, 0.7);
      lm.box(lid, h.x0, h.x1, h.y0, h.y1, z0 - 0.03, z0 + 0.005);
      for (const yy of [h.y0 + 0.15, h.y1 - 0.2])
        lm.box(C.col(0x3a2a1a, 0.5), h.x0 + 0.05, h.x1 - 0.05, yy, yy + 0.05, z0 - 0.06, z0 - 0.03);
      lm.box(
        M.schwarz,
        (h.x0 + h.x1) / 2 - 0.08,
        (h.x0 + h.x1) / 2 + 0.08,
        h.y0 + 0.06,
        h.y0 + 0.12,
        z0 + 0.005,
        z0 + 0.02
      ); // the grip at the free end
      const hw = P.toW(h.x0, h.y1), // the hinge at the far end: the lid opens away from the one who goes down
        pw = P.toW((h.x0 + h.x1) / 2, h.y0 - 0.5);
      const inner = new THREE.Group();
      lg.add(inner);
      lm.finish(inner, false);
      const D = flapDoor(key, lg, { hx: hw[0], hy: hw[1], z: z0, rot: 'x', open: -1.75, pos: pw, label: 'Luke' });
      lg.rotation.order = 'YXZ';
      lg.rotation.y = Math.atan2(P.F.s, P.F.c);
      D.ph = null;
      D.r = 1.5;
      lg.traverse(o => {
        delete o.userData.ph;
        delete o.userData.phEnd;
      });
      walk(h.x0, h.x1, h.y0, h.y1, z0, 'wood', key);
      H.doorKeys.push(key);
      H.hatch = { key, pos: P.toW((h.x0 + h.x1) / 2, (h.y0 + h.y1) / 2).concat(z0) };
      // from below: the lid can be opened from the steps
      const below = P.toW((h.x0 + h.x1) / 2, h.y0 + 0.9);
      act({
        id: 'luke-unten',
        label: () => (DOORS[key] && DOORS[key].target < 0.5 && WALKER.feet < z0 - 0.5 ? 'Luke aufdrücken' : null),
        pos: [below[0], below[1], z0 - 1.0],
        r: 1.4,
        run: () => (DOORS[key].target = 1),
      });
    }
    // ---- inner doors: hinged leaves (DOORS: the action button and the colliders know them), frames ----
    for (const d of P.doors) {
      const r = P.rooms.find(q => q.id === d.room);
      if (!r || r.kind === 'boden') continue;
      const vert = d.axis === 'y',
        w = d.w,
        hgt = d.z1 - d.z0,
        // hinge at one end of the opening, the leaf along the wall
        hA = vert ? [d.x, d.y - w / 2] : [d.x - w / 2, d.y],
        aL = vert ? [0, 1] : [1, 0],
        into = vert ? [Math.sign((r.x0 + r.x1) / 2 - d.x), 0] : [0, Math.sign((r.y0 + r.y1) / 2 - d.y)];
      // the leaf sits at the room's face of the partition and opens into the room
      const hp = [hA[0] + into[0] * (PW / 2 - 0.03), hA[1] + into[1] * (PW / 2 - 0.03)],
        hw = P.toW(hp[0], hp[1]),
        aw = [aL[0] * P.F.c - aL[1] * P.F.s, aL[0] * P.F.s + aL[1] * P.F.c],
        iw = [into[0] * P.F.c - into[1] * P.F.s, into[0] * P.F.s + into[1] * P.F.c],
        sign = -aw[1] * iw[0] + aw[0] * iw[1] > 0 ? 1 : -1;
      const key = 'zinnen:' + id + ':' + d.id,
        g = new THREE.Group(),
        lm = new ZIMOB.Mesher(),
        leafCol =
          (C.ext && C.ext.leaf) || // feat/haeuser
          (P.look === 'alt' ? C.R.pick([0x7a5a3a, 0xe8e0cc, 0x5a3a22]) : P.look === 'ddr' ? 0xf0ece0 : 0x9a7a52),
        lc = C.col(leafCol, 0.55);
      lm.box(lc, 0.01, w - 0.01, -0.02, 0.02, 0, hgt - 0.01);
      for (const [za, zb] of [
        [0.15, 0.9],
        [1.05, hgt - 0.15],
      ])
        for (const sgn of [-1, 1])
          lm.box(C.col(leafCol, 0.6), 0.12, w - 0.12, sgn > 0 ? 0.02 : -0.028, sgn > 0 ? 0.028 : -0.02, za, zb);
      for (const sgn of [-1, 1])
        lm.box(M.messing, w - 0.11, w - 0.05, sgn * 0.02 - 0.012, sgn * 0.02 + 0.012 + sgn * 0.03, 1.0, 1.03);
      lm.finish(g, false);
      const Dd = hingeDoor(key, g, { hx: hw[0], hy: hw[1], a: aw, w, sign, z0: d.z0, z1: d.z1, thick: 0.05 });
      Dd.ph = null;
      g.traverse(o => {
        delete o.userData.ph;
        delete o.userData.phEnd;
      });
      Dd.r = 1.4;
      H.doorKeys.push(key);
      H.doors.push({ id: d.id, key, room: d.room, pos: P.toW(d.x, d.y).concat(d.z0) });
      // the frame (Zarge) through the partition
      const fz = C.col(leafCol, 0.5),
        t0 = vert ? d.x - PW / 2 - 0.02 : d.y - PW / 2 - 0.02,
        t1 = vert ? d.x + PW / 2 + 0.02 : d.y + PW / 2 + 0.02;
      if (vert) {
        furn.box(fz, t0, t1, d.y - w / 2 - 0.05, d.y - w / 2, d.z0, d.z1 + 0.05);
        furn.box(fz, t0, t1, d.y + w / 2, d.y + w / 2 + 0.05, d.z0, d.z1 + 0.05);
        furn.box(fz, t0, t1, d.y - w / 2 - 0.05, d.y + w / 2 + 0.05, d.z1, d.z1 + 0.05);
      } else {
        furn.box(fz, d.x - w / 2 - 0.05, d.x - w / 2, t0, t1, d.z0, d.z1 + 0.05);
        furn.box(fz, d.x + w / 2, d.x + w / 2 + 0.05, t0, t1, d.z0, d.z1 + 0.05);
        furn.box(fz, d.x - w / 2 - 0.05, d.x + w / 2 + 0.05, t0, t1, d.z1, d.z1 + 0.05);
      }
      // the wall above the door in the gap between both faces (closed from both sides)
      // (feat/haeuser: in the normal game a few millimetres inside both faces – flush with them the white plaster flickered through a
      // wallpaper above the door; the zombie night's as before)
      const ins = o && o.still ? 0.004 : 0;
      if (vert) furn.box(M.putz, d.x - PW / 2 + ins, d.x + PW / 2 - ins, d.y - w / 2, d.y + w / 2, d.z1 + 0.05, r.z1);
      else furn.box(M.putz, d.x - w / 2, d.x + w / 2, d.y - PW / 2 + ins, d.y + PW / 2 - ins, d.z1 + 0.05, r.z1);
    }
    await tick0();
    // ---- furniture ----
    // the way past a stair (and its opening upstairs) stays free: a strip PASS wide along its open side
    const passBy = st => {
      const open = st.side === 'R' ? st.x0 : st.x1,
        oS = st.side === 'R' ? -1 : 1;
      return [
        Math.min(open, open + oS * PASS),
        Math.max(open, open + oS * PASS),
        Math.min(st.y0, st.y1) - 0.3,
        Math.max(st.y0, st.y1) + 0.3,
      ];
    };
    for (const r of rooms) {
      C.R = ZIPLAN.rng(P.seed * 3 + r.fl * 31 + Math.round(r.x0 * 10) + Math.round(r.y0 * 100));
      C.room = r;
      C.look = lookOf(P, r); // feat/haeuser
      // keep the doorways free (a square in front of each door), the stair and the hatch
      r.keep = [];
      for (const d of P.doors)
        if (d.fl === r.fl) {
          const vert = d.axis === 'y';
          r.keep.push(
            vert
              ? [d.x - 1.0, d.x + 1.0, d.y - d.w / 2 - 0.1, d.y + d.w / 2 + 0.1]
              : [d.x - d.w / 2 - 0.1, d.x + d.w / 2 + 0.1, d.y - 1.0, d.y + 1.0]
          );
        }
      if (r.fl === 0 && r.kind === 'flur') r.keep.push([P.front.x - 0.8, P.front.x + 0.8, P.yi0, P.yi0 + 1.4]);
      if (P.stair && r.kind === 'flur')
        r.keep.push([P.stair.x0 - 0.1, P.stair.x1 + 0.1, P.stair.y0 - 1.0, P.stair.y1 + 1.0], passBy(P.stair));
      if (P.astair && r.kind === 'flur' && r.fl === P.astair.fl)
        r.keep.push(
          [
            P.astair.x0 - 0.1,
            P.astair.x1 + 0.1,
            Math.min(P.astair.y0, P.astair.y1) - 1.0,
            Math.max(P.astair.y0, P.astair.y1) + 1.0,
          ],
          passBy(P.astair)
        );
      if (P.astair && r.kind === 'boden')
        r.keep.push((h => [h[0] - 0.8, h[1] + 0.8, h[2] - 0.9, h[3] + 0.9])(holeOf(P.astair)));
      if (P.hatch && r.id === P.hatch.room.id)
        r.keep.push([P.hatch.x0 - 0.25, P.hatch.x1 + 0.25, P.hatch.y0 - 0.8, P.hatch.y1 + 0.1]);
      if (P.hatch && r.kind === 'keller')
        r.keep.push([P.hatch.x0 - 0.1, P.hatch.x1 + 0.1, P.hatch.y0 - 0.3, P.hatch.y1 + 1.2]);
      // a room one walks through (two doors or more, or a door and the trapdoor): a way 0.9 m wide from door to door stays free
      if (r.kind !== 'flur') {
        const ins = [];
        for (const d of P.doors) {
          if (d.fl !== r.fl || (d.room !== r.id && d.from !== r.id)) continue;
          const vert = d.axis === 'y',
            into = vert ? Math.sign((r.x0 + r.x1) / 2 - d.x) : Math.sign((r.y0 + r.y1) / 2 - d.y);
          ins.push(vert ? [d.x + into * 0.6, d.y] : [d.x, d.y + into * 0.6]);
        }
        if (P.hatch && r.id === P.hatch.room.id) ins.push([(P.hatch.x0 + P.hatch.x1) / 2, P.hatch.y0 - 0.5]);
        for (let i = 0; i < ins.length; i++)
          for (let j = i + 1; j < ins.length; j++) {
            const [p, q] = [ins[i], ins[j]];
            r.keep.push(
              [Math.min(p[0], q[0]) - 0.45, Math.max(p[0], q[0]) + 0.45, p[1] - 0.45, p[1] + 0.45],
              [q[0] - 0.45, q[0] + 0.45, Math.min(p[1], q[1]) - 0.45, Math.max(p[1], q[1]) + 0.45]
            );
          }
      }
      // the tiled stove of the Stube stands at the wall to the kitchen, near the hall
      if (r.kind === 'stube' || r.kind === 'kueche') {
        const k = r.kind === 'stube' ? 'y1' : 'y0',
          hallLeft = r.side === 'R';
        r.stoveSide = k;
        r.stovePref = k === 'y1' ? (hallLeft ? 0.95 : 0.05) : hallLeft ? 0.05 : 0.95;
      }
      try {
        ZIEINR.furnish(C, r);
      } catch (e) {
        console.warn('zinnen furnish', r.id, e);
        S.err = String((e && e.stack) || e);
      }
      await tick0();
    }
    // ---- meshes ----
    const shellMeshes = shell.finish(G, true),
      furnMeshes = furn.finish(G, false);
    scene.add(G);
    G.traverse(o => {
      if (o.userData) {
        delete o.userData.ph;
        delete o.userData.phEnd;
      }
    });
    // ---- the handle: entry, exit, openings, rooms, graph ----
    const fr = P.F,
      yawIn = (Math.atan2(-fr.s, fr.c) * 180) / Math.PI,
      ent = P.toW(P.front.x, P.yi0 + 0.9),
      ex = P.toW(P.front.x, -1.3);
    H.entry = { x: ent[0], y: ent[1], z: P.zG, yaw: yawIn };
    H.exit = { x: ex[0], y: ex[1], z: KERN.ground(ex[0], ex[1]), yaw: (yawIn + 180) % 360 };
    for (const r of rooms) {
      const poly = [P.toW(r.x0, r.y0), P.toW(r.x1, r.y0), P.toW(r.x1, r.y1), P.toW(r.x0, r.y1)];
      H.rooms.push({ id: r.id, kind: r.kind, floor: r.fl, name: r.name, poly, z0: r.z0, z1: r.z1 });
    }
    const outN = { front: [0, -1], back: [0, 1], left: [-1, 0], right: [1, 0] },
      wN = n => [n[0] * fr.c - n[1] * fr.s, n[0] * fr.s + n[1] * fr.c];
    {
      const a = P.toW(P.front.x - P.front.w / 2, P.yi0),
        b = P.toW(P.front.x + P.front.w / 2, P.yi0);
      H.openings.push({
        id: 'haustuer',
        kind: 'door',
        floor: 0,
        a,
        b,
        z0: P.zG,
        z1: P.zG + 2.15,
        n: wN(outN.front),
        room: rooms.find(r => r.kind === 'flur' && r.fl === 0).id,
        front: true,
      });
    }
    P.windows.forEach((w, i) => {
      if (w.fl !== 0) return;
      const inner = { front: P.yi0, back: P.yi1, left: P.xi0, right: P.xi1 }[w.edge],
        horiz = w.edge === 'front' || w.edge === 'back',
        a = horiz ? P.toW(w.a, inner) : P.toW(inner, w.a),
        b = horiz ? P.toW(w.b, inner) : P.toW(inner, w.b),
        mid = horiz ? [(w.a + w.b) / 2, inner] : [inner, (w.a + w.b) / 2],
        rm = rooms.find(
          r =>
            r.fl === 0 &&
            mid[0] >= r.x0 - 0.05 &&
            mid[0] <= r.x1 + 0.05 &&
            mid[1] >= r.y0 - 0.05 &&
            mid[1] <= r.y1 + 0.05
        );
      H.openings.push({
        id: 'fenster' + i,
        kind: 'window',
        floor: 0,
        a,
        b,
        z0: w.z0,
        z1: w.z1,
        n: wN(outN[w.edge]),
        room: rm ? rm.id : null,
        front: w.edge === 'front',
      });
    });
    // waypoints: both sides of every door, the stairs, the trapdoor, the entry – and in every room one more, the free spot nearest to
    // its middle that can be reached from where one comes in (furniture, a stair or its opening may stand in the middle)
    const nodes = [],
      edges = [],
      node = (x, y, z, room) => (
        nodes.push(Object.assign({ x: 0, y: 0 }, (([a, b]) => ({ x: a, y: b }))(P.toW(x, y)), { z, room })),
        nodes.length - 1
      ),
      centre = {},
      links = [], // [node, room]: joined to the room's own waypoint below
      seeds = {}, // room id → where one comes in [x, y] (house frame)
      link = (n, r, x, y) => {
        links.push([n, r.id]);
        (seeds[r.id] = seeds[r.id] || []).push([x, y]);
      };
    // x of the way past a stair, between its railing and the furniture beyond the kept strip
    const pastX = st => (st.side === 'R' ? st.x0 - PASS * 0.57 : st.x1 + PASS * 0.57);
    for (const d of P.doors) {
      const r = rooms.find(q => q.id === d.room);
      if (!r) continue;
      const vert = d.axis === 'y',
        into = vert ? Math.sign((r.x0 + r.x1) / 2 - d.x) : Math.sign((r.y0 + r.y1) / 2 - d.y),
        other = d.from ? rooms.find(q => q.id === d.from) : rooms.find(q => q.kind === 'flur' && q.fl === d.fl);
      if (!other) continue;
      const pa = vert ? [d.x + into * 0.5, d.y] : [d.x, d.y + into * 0.5],
        pb = vert ? [d.x - into * 0.5, d.y] : [d.x, d.y - into * 0.5],
        a = node(pa[0], pa[1], d.z0, r.id),
        b = node(pb[0], pb[1], d.z0, other.id);
      edges.push([a, b]);
      link(a, r, ...pa);
      link(b, other, ...pb);
    }
    // a stair from room ra (floor za) up to room rb (floor zb): in front of the first step, on the last one, and beside it
    // upstairs, where one steps off through the railing's gap
    const flights = [];
    const stairNodes = (st, ra, za, rb, zb) => {
      const dir = st.y1 >= st.y0 ? 1 : -1,
        cx = (st.x0 + st.x1) / 2,
        pa = [cx, st.y0 - dir * 0.45],
        pw = [pastX(st), st.y0 - dir * 0.45],
        pb = [pastX(st), st.y1 - dir * 0.2],
        a = node(pa[0], pa[1], za, ra.id),
        w = node(pw[0], pw[1], za, ra.id),
        t = node(cx, st.y1 - dir * 0.15, zb - st.rise, rb.id),
        b = node(pb[0], pb[1], zb, rb.id);
      nodes[t].step = true;
      // to the foot of the stair by the way past it (straight from the room's spot one could run into the steps)
      edges.push([w, a], [a, t], [t, b]);
      link(w, ra, ...pw);
      seeds[ra.id].push(pa);
      link(b, rb, ...pb);
      flights.push({ st, za, zb, ids: [w, a, t, b] });
    };
    const flur0 = rooms.find(r => r.kind === 'flur' && r.fl === 0);
    for (let k = 0; P.stair && k < P.nSt - 1; k++) {
      const fa = rooms.find(r => r.kind === 'flur' && r.fl === k),
        fb = rooms.find(r => r.kind === 'flur' && r.fl === k + 1);
      if (fa && fb) stairNodes(P.stair, fa, P.zF[k], fb, P.zF[k + 1]);
    }
    const kel = rooms.find(r => r.kind === 'keller');
    if (P.hatch && kel) {
      const h = P.hatch,
        cx = (h.x0 + h.x1) / 2,
        pa = [cx, h.y0 - 0.4],
        // below: in front of the last step, or beside it where the stair comes down close to the wall
        pb =
          h.y1 + 0.5 <= kel.y1 - 0.3
            ? [cx, h.y1 + 0.5]
            : [h.x1 + 0.45 < kel.x1 - 0.3 ? h.x1 + 0.45 : h.x0 - 0.45, h.y1 - 0.3],
        a = node(pa[0], pa[1], P.zG, h.room.id),
        b = node(pb[0], pb[1], kel.z0, kel.id);
      edges.push([a, b]);
      link(a, h.room, ...pa);
      link(b, kel, ...pb);
    }
    const flurTop = rooms.find(r => r.kind === 'flur' && r.fl === P.nSt - 1);
    if (P.astair && att && flurTop) stairNodes(P.astair, flurTop, P.zF[P.nSt - 1], att, P.zA);
    const en = node(P.front.x, P.yi0 + 0.6, P.zG, flur0.id);
    link(en, flur0, P.front.x, P.yi0 + 0.6);
    // can one stand at (x, y) on the floor z: no collider within the walker's radius, a floor there, no step over it (a waypoint stands
    // on the plain floor, not on the lowest step of a stair)
    const RW = 0.24,
      over = (w, x, y) => x >= w[0] && x <= w[1] && y >= w[2] && y <= w[3];
    for (const r of rooms) {
      const z = r.z0,
        cs = H.cols.filter(
          c =>
            z + 1.7 > c[4] &&
            z + 0.25 < c[5] &&
            c[0] - RW < r.x1 &&
            c[1] + RW > r.x0 &&
            c[2] - RW < r.y1 &&
            c[3] + RW > r.y0
        ),
        ws = H.walks.filter(w => w[0] < r.x1 && w[1] > r.x0 && w[2] < r.y1 && w[3] > r.y0),
        freeAt = (x, y) =>
          !cs.some(c => x > c[0] - RW && x < c[1] + RW && y > c[2] - RW && y < c[3] + RW) &&
          ws.some(w => over(w, x, y) && Math.abs(w[4] - z) < 0.05) &&
          !ws.some(w => over(w, x, y) && w[4] > z + 0.05 && w[4] < z + 1.8);
      // a 15 cm grid over the room, flooded from where one comes in; the reached cell nearest to the middle
      const g = 0.15,
        nx = Math.max(1, Math.floor((r.x1 - r.x0) / g)),
        ny = Math.max(1, Math.floor((r.y1 - r.y0) / g)),
        X = i => r.x0 + (i + 0.5) * ((r.x1 - r.x0) / nx),
        Y = j => r.y0 + (j + 0.5) * ((r.y1 - r.y0) / ny),
        mx = (r.x0 + r.x1) / 2,
        my = (r.y0 + r.y1) / 2,
        seen = new Uint8Array(nx * ny),
        q = [];
      for (const [sx, sy] of seeds[r.id] || []) {
        const i = Math.min(nx - 1, Math.max(0, Math.floor(((sx - r.x0) / (r.x1 - r.x0)) * nx))),
          j = Math.min(ny - 1, Math.max(0, Math.floor(((sy - r.y0) / (r.y1 - r.y0)) * ny)));
        if (!seen[j * nx + i]) {
          seen[j * nx + i] = 1;
          q.push(j * nx + i);
        }
      }
      let best = null,
        bd = 1e9;
      while (q.length) {
        const k = q.pop(),
          i = k % nx,
          j = (k - i) / nx,
          x = X(i),
          y = Y(j);
        if (freeAt(x, y)) {
          const dd = Math.hypot(x - mx, y - my);
          if (dd < bd) {
            bd = dd;
            best = [x, y];
          }
        }
        for (const [di, dj] of [
          [1, 0],
          [-1, 0],
          [0, 1],
          [0, -1],
        ]) {
          const ii = i + di,
            jj = j + dj;
          if (ii < 0 || jj < 0 || ii >= nx || jj >= ny || seen[jj * nx + ii]) continue;
          if (!freeAt(X(ii), Y(jj))) continue;
          seen[jj * nx + ii] = 1;
          q.push(jj * nx + ii);
        }
      }
      if (!best) best = (seeds[r.id] || [[mx, my]])[0];
      centre[r.id] = node(best[0], best[1], z, r.id);
    }
    for (const [n, rid] of links) if (centre[rid] !== undefined) edges.push([n, centre[rid]]);
    H.graph = { nodes, edges, entry: en };
    // inside: the rectangle, from the cellar floor to the top storey's ceiling
    const zLo = P.cellar ? P.cellar.z0 : P.zG,
      zHi = att ? P.attic.top : P.zC[P.nSt - 1];
    H.inside = (x, y, z) => {
      const [lx, ly] = P.toL(x, y);
      if (lx < P.xi0 - 0.05 || lx > P.xi1 + 0.05 || ly < P.yi0 - 0.05 || ly > P.yi1 + 0.05) return false;
      if (z === undefined) return true;
      if (z < zLo - 0.3 || z > zHi + 0.3) return false;
      if (z < P.zG - 0.3)
        return !!P.cellar && lx >= P.cellar.x0 && lx <= P.cellar.x1 && ly >= P.cellar.y0 && ly <= P.cellar.y1;
      return true;
    };
    H.roomAt = (x, y, z) => {
      const [lx, ly] = P.toL(x, y);
      for (const r of rooms)
        if (
          lx >= r.x0 - 0.06 &&
          lx <= r.x1 + 0.06 &&
          ly >= r.y0 - 0.06 &&
          ly <= r.y1 + 0.06 &&
          z >= r.z0 - 0.5 &&
          z <= r.z1
        )
          return r.id;
      return null;
    };
    H.zLo = zLo;
    // the way through the house for one at (x, y, z) (feet) who wants to get to (tx, ty, tz): the target itself when both are in the same
    // room (or there is no way), else the next waypoint of the shortest way along H.graph (Dijkstra over the few nodes, kept per target)
    const adj = nodes.map(() => []),
      toTarget = new Map();
    for (const [a, b] of edges) {
      const p = nodes[a],
        q = nodes[b],
        w = Math.hypot(p.x - q.x, p.y - q.y, p.z - q.z);
      adj[a].push([b, w]);
      adj[b].push([a, w]);
    }
    // the waypoints one can head for straight away: those of one's room (not the one on a top step), on or at a stair all of its own
    const reachable = (x, y, z, rid) => {
      const [lx, ly] = P.toL(x, y),
        out = new Set();
      nodes.forEach((n, i) => {
        if (n.room === rid && !n.step) out.add(i);
      });
      for (const f of flights) {
        const st = f.st,
          lo = Math.min(st.y0, st.y1),
          hi = Math.max(st.y0, st.y1);
        // on the steps (above the floor below, below the floor above): only the flight's own waypoints
        if (lx > st.x0 - 0.1 && lx < st.x1 + 0.1 && ly > lo - 0.1 && ly < hi + 0.1 && z > f.za + 0.1 && z < f.zb - 0.1)
          return f.ids.slice();
        if (lx > st.x0 - 0.7 && lx < st.x1 + 0.7 && ly > lo - 0.7 && ly < hi + 0.4 && z > f.za - 0.3 && z < f.zb + 0.3)
          for (const i of f.ids) out.add(i);
      }
      if (!out.size) nodes.forEach((n, i) => out.add(i));
      return [...out];
    };
    const nearNode = (x, y, z, rid) => {
      let best = -1,
        bd = 1e9;
      nodes.forEach((n, i) => {
        const d = Math.hypot(n.x - x, n.y - y) + Math.abs(n.z - z) * 3 + (rid && n.room !== rid ? 2 : 0);
        if (d < bd) {
          bd = d;
          best = i;
        }
      });
      return best;
    };
    const distTo = t => {
      let d = toTarget.get(t);
      if (d) return d;
      d = new Float64Array(nodes.length).fill(Infinity);
      d[t] = 0;
      const done = new Uint8Array(nodes.length);
      for (;;) {
        let u = -1;
        for (let i = 0; i < nodes.length; i++) if (!done[i] && d[i] < Infinity && (u < 0 || d[i] < d[u])) u = i;
        if (u < 0) break;
        done[u] = 1;
        for (const [v, w] of adj[u]) if (d[u] + w < d[v]) d[v] = d[u] + w;
      }
      toTarget.set(t, d);
      return d;
    };
    H.route = (x, y, z, tx, ty, tz) => {
      const goal = { x: tx, y: ty, z: tz },
        ra = H.roomAt(x, y, z + 0.3),
        rb = H.roomAt(tx, ty, tz + 0.3);
      if (ra && ra === rb) return goal;
      const t = nearNode(tx, ty, tz, rb);
      if (t < 0) return goal;
      const d = distTo(t);
      // the nearest waypoint one can head for now (of nearly equally near ones the one further on), then along the graph
      const cand = reachable(x, y, z, ra)
        .filter(i => isFinite(d[i]))
        .map(i => [i, Math.hypot(nodes[i].x - x, nodes[i].y - y) + Math.abs(nodes[i].z - z) * 1.5]);
      if (!cand.length) return goal;
      const dmin = Math.min(...cand.map(c => c[1]));
      let u = -1;
      for (const [i, c] of cand) if (c < dmin + 0.6 && (u < 0 || d[i] < d[u])) u = i;
      // reached it already (closer than 0.45 m): the next one along the way
      for (let k = 0; k <= nodes.length; k++) {
        const n = nodes[u];
        if (Math.hypot(n.x - x, n.y - y) > 0.45 || Math.abs(n.z - z) > 0.6) return { x: n.x, y: n.y, z: n.z };
        let nx = -1;
        for (const [v] of adj[u]) if (d[v] < d[u] - 1e-9 && (nx < 0 || d[v] < d[nx])) nx = v;
        if (nx < 0) return goal;
        u = nx;
      }
      return goal;
    };
    // ---- lights, containers, spots: the action button ----
    function act(a) {
      const full = Object.assign({}, a, { id: 'zinnen:' + id + ':' + a.id });
      if (!full.label.call) full.label = () => a.label;
      KERN.act(full);
      H.acts.push(full.id);
    }
    H.light = (roomId, on) => {
      const v = on === undefined ? !H.lit[roomId] : !!on;
      H.lit[roomId] = v;
      for (const l of H.lamps)
        if (l.room === roomId) {
          l.mat.emissiveIntensity = v ? (l.kind === 'bulb' ? 2.2 : 1.4) : 0;
          if (v) G.add(l.g);
          else G.remove(l.g);
        }
      S.lightDirty = true;
      markDirty();
      return v;
    };
    const inRoom = (roomId, slack = 0) => {
      const r = rooms.find(q => q.id === roomId),
        [lx, ly] = P.toL(WALKER.x, WALKER.y);
      return (
        !!r &&
        lx >= r.x0 - slack &&
        lx <= r.x1 + slack &&
        ly >= r.y0 - slack &&
        ly <= r.y1 + slack &&
        WALKER.feet > r.z0 - 0.4 &&
        WALKER.feet < r.z1 - 0.5
      );
    };
    for (const r of rooms) {
      if (!H.lamps.some(l => l.room === r.id)) continue;
      // the switch beside the room's door (inside), else in the middle
      const d = P.doors.find(q => q.room === r.id);
      let sp = [(r.x0 + r.x1) / 2, (r.y0 + r.y1) / 2];
      if (d) {
        const vert = d.axis === 'y',
          into = vert ? Math.sign((r.x0 + r.x1) / 2 - d.x) : Math.sign((r.y0 + r.y1) / 2 - d.y);
        sp = vert ? [d.x + into * 0.3, d.y + d.w / 2 + 0.2] : [d.x + d.w / 2 + 0.2, d.y + into * 0.3];
      } else if (r.kind === 'flur' && r.fl === 0) sp = [P.front.x + P.front.w / 2 + 0.25, P.yi0 + 0.3];
      const w = P.toW(sp[0], sp[1]);
      act({
        id: 'licht:' + r.id,
        label: () => (inRoom(r.id, 0.3) && !PLAY.seat ? (H.lit[r.id] ? 'Licht aus' : 'Licht an') : null),
        pos: [w[0], w[1], r.z0 + 1.2],
        r: 1.3,
        prio: -0.25,
        run: () => H.light(r.id),
      });
    }
    for (const c of H.containers) {
      act({
        id: 'c:' + c.id,
        label: () => (inRoom(c.room, 0.4) && !PLAY.seat ? (c.want > 0.5 ? 'Schließen' : c.label) : null),
        pos: c.pos,
        r: 1.35,
        prio: -0.05,
        run: () => {
          c.want = c.want > 0.5 ? 0 : 1;
          S.anim = true;
          // a sound from the game's own (synthesized or sampled) door sounds: a drawer slides, a door or a lid clicks
          try {
            const pk = c.parts[0] && c.parts[0].kind;
            if (audio && audio.door) audio.door(pk === 'drawer' ? 'og' : 'eg', c.want > 0.5);
          } catch (e) {
            void e;
          }
          if (c.want > 0.5) {
            let res = null;
            try {
              res = H.onSearch ? H.onSearch(c, H) : null;
            } catch (e) {
              console.warn('zinnen onSearch', e);
            }
            const txt =
              res && res.text
                ? res.text
                : res
                  ? null
                  : c.searched
                    ? 'Hier habe ich schon nachgesehen.'
                    : DEFAULT_FIND[c.kind] || 'Nichts Brauchbares.';
            if (txt && PLAY.think) PLAY.think(txt);
            c.searched = true;
            KERN.emit('zinnen:search', { house: id, id: c.id, kind: c.kind });
          }
        },
      });
    }
    for (const sp of H.spots) {
      const label = sp.label || SPOT_LABEL[sp.kind];
      if (!label) continue;
      act({
        id: 's:' + sp.id,
        label: () => (inRoom(sp.room, 0.4) && !PLAY.seat ? label : null),
        pos: sp.pos,
        r: 1.5,
        prio: -0.12,
        run: () => useSpot(H, sp),
      });
    }
    // ---- done ----
    H.stats = {
      ms: Math.round(performance.now() - t0),
      meshes: shellMeshes.length + furnMeshes.length + H.parts.length + H.lamps.length + H.doorKeys.length,
      draws: 0,
      tris: shell.tris + furn.tris,
      cols: H.cols.length,
      walks: H.walks.length,
      mem0,
      terrain: (() => {
        // how far the terrain rises above the ground floor inside the house (it would show through the floor) – for the log
        let mx = -1e9;
        for (let x = P.xi0 + 0.2; x < P.xi1; x += 1)
          for (let y = P.yi0 + 0.2; y < P.yi1; y += 1) mx = Math.max(mx, KERN.terrain(...P.toW(x, y)));
        return +(mx - P.zG).toFixed(2);
      })(),
    };
    G.traverse(o => {
      if (o.isMesh) {
        H.stats.draws++;
        if (o.geometry !== undefined && !o.geometry.boundingSphere) o.geometry.computeBoundingSphere();
      }
    });
    for (const k of H.doorKeys)
      DOORS[k].group.traverse(o => {
        if (o.isMesh) H.stats.draws++;
      });
    S.built.push(H);
    terrainHole(H);
    wire();
    rebuildGrids();
    markDirty(true);
    KERN.emit('zinnen:mount', { id, ms: H.stats.ms });
    return H;
  };
  const DEFAULT_FIND = {
    buefett: 'Teller, Tassen, eine Dose Kaffee – nichts für die Nacht.',
    schrank: 'Nur Geschirr und alte Zeitungen.',
    schublade: 'Besteck, Bindfaden, ein Bleistift.',
    kuehlschrank: 'Eine Flasche Milch, Butter, ein Glas Gurken.',
    kleiderschrank: 'Kleider, Bettwäsche, ganz unten ein Schuhkarton.',
    nachttisch: 'Eine Taschenlampe ohne Batterien, ein Buch.',
    truhe: 'Alte Decken und ein Stapel Briefe.',
    regal: 'Eingewecktes: Kirschen, Gurken, Apfelmus.',
    werkbank: 'Schrauben, Nägel, eine Zange.',
    kiste: 'Alte Zeitungen und Weihnachtsschmuck aus Lauscha.',
    raeucherkammer: 'Zwei Hartwürste und ein Schinken – Vorrat für Wochen.',
  };
  const SPOT_LABEL = {
    bett: 'Ins Bett legen',
    ofen: 'Ofen anheizen',
    herd: 'Herd anmachen',
    radio: 'Radio einschalten',
    tv: 'Fernseher einschalten',
    spuele: 'Wasser aufdrehen',
    wanne: 'Wasser einlassen',
    tisch: 'Am Tisch setzen',
  };
  function useSpot(H, sp) {
    let done = false;
    try {
      done = H.onUse ? !!H.onUse(sp, H) : false;
    } catch (e) {
      console.warn('zinnen onUse', e);
    }
    KERN.emit('zinnen:use', { house: H.id, id: sp.id, kind: sp.kind });
    if (done) return;
    if (sp.kind === 'bett' || sp.kind === 'sitz' || sp.kind === 'tisch') {
      const lie = sp.kind === 'bett',
        hp = sp.head || sp.pos;
      PLAY.sit({
        x: lie ? hp[0] : sp.pos[0],
        y: lie ? hp[1] : sp.pos[1],
        eye: sp.pos[2] + (lie ? 0.75 : 1.2),
        yaw: sp.kind === 'tisch' ? sp.yaw : sp.yaw + 180, // at the table one faces it; on a bench, a couch or in bed away from the wall
        pitch: lie ? 60 : -5,
        kind: lie ? 'lie' : 'sit',
        leaveLabel: 'Aufstehen',
      });
      return;
    }
    const T = {
      ofen: 'Ohne Holz und Kohlen wird das nichts.',
      herd: 'Die Platte wird langsam warm.',
      spuele: 'Das Wasser läuft – kalt.',
      wanne: 'Für ein Bad ist jetzt keine Zeit.',
      tv: 'Nur Rauschen.',
      radio: 'Rauschen, dann leise Musik.',
    };
    if (T[sp.kind] && PLAY.think) PLAY.think(T[sp.kind]);
  }
  // ---- per frame: open/close animations, the borrowed light follows the lit room the walker is in ----
  const ease = t => t * t * (3 - 2 * t);
  let offTick = null,
    borrow = null;
  function wire() {
    if (S.wired) return;
    S.wired = true;
    offTick = KERN.tick(dt => {
      if (!S.built.length) return;
      let moving = false;
      for (const H of S.built)
        for (const c of H.containers) {
          if (Math.abs(c.t - c.want) < 1e-3) continue;
          c.t += Math.sign(c.want - c.t) * Math.min(Math.abs(c.want - c.t), dt * 2.6);
          for (const p of c.parts) p.set(ease(c.t));
          moving = true;
        }
      if (moving) markDirty();
      // by day the rooms get a little light of their own (zombie/z_innen_mob.js daylight), checked twice a second
      S.dayAcc = (S.dayAcc || 0) + dt;
      if (S.dayAcc > 0.5) {
        S.dayAcc = 0;
        if (ZIMOB.daylight(1 - Math.min(1, Math.max(0, VILLAGE.night())))) markDirty();
      }
    }, 'zombie/z_innen');
    // the ground inside a mounted house is ours: only its floors and steps count (the terrain may cross the cellar or the floor)
    KERN.provide(
      'ground',
      (x, y) => {
        for (const H of S.built) if (H.inside(x, y)) return H.zLo - 3;
        return undefined;
      },
      90
    );
    KERN.provide('inside', (x, y, z) => S.built.some(H => H.inside(x, y, z)));
    KERN.provide(
      'place',
      (x, y, z) => {
        for (const H of S.built)
          if (H.inside(x, y, z)) {
            const r = H.roomAt(x, y, z);
            const rr = r && H.rooms.find(q => q.id === r);
            const own = H.plan.owner ? ' – bei ' + H.plan.owner.charAt(0).toUpperCase() + H.plan.owner.slice(1) : '';
            return (rr ? rr.name : 'Im Haus') + own;
          }
        return undefined;
      },
      95
    );
    borrow = KERN.lights.borrow({
      id: 'zinnen',
      n: 1,
      prio: 4,
      want: () =>
        S.built.some(
          H => (Object.values(H.lit).some(Boolean) || dayNow() > 0.05) && H.inside(WALKER.x, WALKER.y, WALKER.feet + 1)
        ),
      on: ls => place(ls, true),
      tick: ls => place(ls, false),
      off: () => markDirty(),
    });
  }
  let lastRoom = null;
  const dayNow = () => 1 - Math.min(1, Math.max(0, VILLAGE.night()));
  // by day, with no lamp lit: a soft warm light a metre in from the room's window (or under its ceiling)
  function dayFill(H, rid) {
    const P = H.plan,
      r = rid && P.rooms.find(q => q.id === rid);
    if (!r) return null;
    let best = null,
      bd = 1e9;
    const mid = [(r.x0 + r.x1) / 2, (r.y0 + r.y1) / 2];
    for (const w of P.windows) {
      if (w.fl !== r.fl) continue;
      const c = (w.a + w.b) / 2,
        p =
          w.edge === 'front'
            ? [c, P.yi0 + 1.0]
            : w.edge === 'back'
              ? [c, P.yi1 - 1.0]
              : w.edge === 'left'
                ? [P.xi0 + 1.0, c]
                : [P.xi1 - 1.0, c];
      if (p[0] < r.x0 || p[0] > r.x1 || p[1] < r.y0 || p[1] > r.y1) continue;
      const d = Math.hypot(p[0] - mid[0], p[1] - mid[1]);
      if (d < bd) {
        bd = d;
        best = P.toW(p[0], p[1]).concat((w.z0 + w.z1) / 2);
      }
    }
    return best || P.toW(mid[0], mid[1]).concat(r.z1 - 0.4);
  }
  function place(ls, force) {
    const l = ls && ls[0];
    if (!l) return;
    let best = null,
      fill = null,
      fillKey = null;
    const k = dayNow();
    for (const H of S.built) {
      if (!H.inside(WALKER.x, WALKER.y, WALKER.feet + 1)) continue;
      const here = H.roomAt(WALKER.x, WALKER.y, WALKER.feet + 1);
      const lamps = H.lamps.filter(q => H.lit[q.room]);
      best =
        lamps.find(q => q.room === here) ||
        lamps.sort(
          (a, b) =>
            Math.hypot(a.pos[0] - WALKER.x, a.pos[1] - WALKER.y) - Math.hypot(b.pos[0] - WALKER.x, b.pos[1] - WALKER.y)
        )[0] ||
        null;
      if (!best && k > 0.05) {
        fill = dayFill(H, here);
        fillKey = 'day:' + here + ':' + Math.round(k * 10);
      }
    }
    const key = best ? best.room + best.pos.join(',') : fillKey;
    if (!force && key === lastRoom && !S.lightDirty) return;
    lastRoom = key;
    S.lightDirty = false;
    if (best) {
      l.position.copy(V(best.pos[0], best.pos[1], best.pos[2] - 0.15));
      l.color.set(0xffd6a0);
      l.distance = 7.5;
      l.decay = 2;
      l.intensity = best.kind === 'bulb' ? 5 : 7;
    } else if (fill) {
      l.position.copy(V(fill[0], fill[1], fill[2]));
      l.color.set(0xffe2b4);
      l.distance = 8;
      l.decay = 2;
      l.intensity = 3.2 * k;
    } else l.intensity = 0;
    markDirty();
  }
  // ---- unmounting ----
  S.unmount = H => {
    if (!H) return;
    const i = S.built.indexOf(H);
    if (i >= 0) S.built.splice(i, 1);
    for (const e of H.cols) {
      e[0] = 1e9;
      e[1] = -1e9;
      e[4] = -99;
      e[5] = -99;
      e[9] = undefined;
    }
    for (const e of H.walks) {
      e[0] = 1e9;
      e[1] = -1e9;
      e[4] = -99;
      e[8] = null;
      e[9] = undefined;
    }
    for (const a of H.acts) KERN.unact(a);
    for (const k of H.doorKeys) {
      const d = DOORS[k];
      if (!d) continue;
      scene.remove(d.group);
      d.group.traverse(o => o.isMesh && o.geometry.dispose());
      delete DOORS[k];
    }
    for (const l of H.lamps) H.group.remove(l.g);
    H.group.traverse(o => {
      if (o.isMesh) o.geometry.dispose();
    });
    for (const l of H.lamps) {
      l.g.traverse(o => o.isMesh && o.geometry.dispose());
      l.mat.dispose();
    }
    scene.remove(H.group);
    terrainHole(S.built[S.built.length - 1] || null);
    // the neutralised slots stay in COL and WALK (other modules keep indices into them) and serve the next house
    S.poolCol.push(...H.cols);
    S.poolWalk.push(...H.walks);
    if (!S.built.length) ZIMOB.release();
    rebuildGrids();
    markDirty(true);
    KERN.emit('zinnen:unmount', { id: H.id });
  };
  S.mounted = () => S.built.slice();
  // ---- the terrain under a mounted house: on slopes the terrain (world/ratscher.js, a 10 m grid) runs through the ground floor and the
  // cellar. While a house is mounted its terrain meshes take a copy of the terrain material that leaves out the house's rectangle (the
  // walls hide the cut). One program more – ZINNEN.warm() makes it ahead (at the start of the zombie night), else the first house does
  // (behind the fade in); the terrain's own program stays without discard (Apple GPUs draw it cheaper). ----
  const HOLE = { r: { value: new THREE.Vector4() }, b: { value: new THREE.Vector4(1, -1, 1, -1) } };
  let holeMat = null,
    holeMeshes = null;
  function holeReady() {
    const tm = RATSCHER && RATSCHER.terrainMat;
    if (!tm) return false;
    if (!holeMat) {
      holeMat = tm.clone();
      const prev = tm.onBeforeCompile;
      holeMat.onBeforeCompile = (sh, r) => {
        prev(sh, r);
        sh.uniforms.uZHole = HOLE.r;
        sh.uniforms.uZHoleB = HOLE.b;
        sh.fragmentShader =
          'uniform vec4 uZHole, uZHoleB;\n' +
          sh.fragmentShader.replace(
            'void main() {',
            `void main() {
          { vec2 hd = vGeo - uZHole.xy, hl = vec2( dot( hd, uZHole.zw ), dot( hd, vec2( -uZHole.w, uZHole.z ) ) );
            if ( hl.x > uZHoleB.x && hl.x < uZHoleB.y && hl.y > uZHoleB.z && hl.y < uZHoleB.w ) discard; }`
          );
      };
      holeMat.customProgramCacheKey = () => 'geoterrain|zinnen-hole';
    }
    if (!holeMeshes) {
      holeMeshes = [];
      scene.traverse(o => {
        if (o.isMesh && o.material === tm) holeMeshes.push(o);
      });
    }
    return holeMeshes.length > 0;
  }
  function terrainHole(H) {
    if (!holeReady()) return;
    if (H) {
      const P = H.plan;
      HOLE.r.value.set(P.F.ox, P.F.oy, P.F.c, P.F.s);
      // out to just behind the facade: the terrain must not show in the window reveals either
      HOLE.b.value.set(P.xi0 - P.t + 0.02, P.xi1 + P.t - 0.02, P.yi0 - P.t + 0.02, P.yi1 + P.t - 0.02);
      for (const o of holeMeshes) o.material = holeMat;
    } else {
      HOLE.b.value.set(1, -1, 1, -1);
      for (const o of holeMeshes) o.material = RATSCHER.terrainMat;
    }
    markDirty();
  }
  // the cut-out's program made ahead: for one drawn frame the terrain wears the copy with an empty rectangle (it cuts nothing), then
  // its own material again – so the program is compiled in the real render state, and entering a house compiles nothing
  S.warm = () => {
    if (!holeReady()) return false;
    if (S.built.length) return true;
    HOLE.b.value.set(1, -1, 1, -1);
    for (const o of holeMeshes) o.material = holeMat;
    const m0 = holeMeshes[0],
      prev = m0.onAfterRender;
    m0.onAfterRender = function (...a) {
      m0.onAfterRender = prev;
      if (!S.built.length) for (const o of holeMeshes) o.material = RATSCHER.terrainMat;
      return prev.apply(this, a);
    };
    markDirty();
    return true;
  };
  S.terrainHole = () => (holeMeshes ? holeMeshes.length : 0);
  // ---- the test scenario: ?szenario=zombie-innen (&haus=<id>) goes into a house near the Anger (or the given one), third person ----
  S.enter = H => {
    KERN.spot('zinnen', {
      mode: 'walk',
      pos: [H.entry.x, H.entry.y],
      z: H.entry.z,
      yaw: H.entry.yaw,
      pitch: -4,
      label: 'Haus von innen',
    });
    go('zinnen');
    setView3(true, true);
  };
  KERN.scenario('zombie-innen', {
    label: 'Haus von innen (Test)',
    menu: false,
    order: 99,
    run: () => {
      const want = +QS.get('haus') || 0,
        id = want && ZIPLAN.plan(want) ? want : S.pick(VILLAGE.ANGER[0] + 25, VILLAGE.ANGER[1] + 10);
      return S.mount(id).then(H => {
        if (H) S.enter(H);
        S.scen = H;
        return H;
      });
    },
  });
  S.ready = true;
  void offTick;
  void borrow;
  return S;
})();
window.ZINNEN = ZINNEN;
