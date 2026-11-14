// ===================== feat/zombie-innen: furniture of the village houses – Thuringian village style in three layers (ZIEINR) =====================
// What stands where (docs/plans/zombie_einrichtung.md, after the photos on ref/zombie-innen-fotos): per room kind and per look – 'alt' (farmhouse
// before 1960: tiled stove with its bench, corner bench, kitchen dresser, coal range, feather beds), 'ddr' (1965–1990: wall unit, three-piece
// suite, table cloth, Persian rug, CRT set, coal stove, linoleum, bath heater) and 'nachwende' (1990–2010: rustic oak, leather couch, laminate,
// fitted kitchen). Each item is built in its own frame at a wall (u along the wall, v into the room, z up) and turned into the house frame;
// what can be searched gets a moving part (door, drawer, lid) and a container entry, what can be used a spot (bed, stove, radio …).
import { ZIPLAN } from './z_innen_plan.js';
export const ZIEINR = (() => {
  // ---- an item frame at a wall: origin O, along a, into the room n (unit vectors in the house frame, axis-aligned) ----
  function frame(O, a, n) {
    const P = (u, v, z) => [O[0] + a[0] * u + n[0] * v, O[1] + a[1] * u + n[1] * v, z];
    return {
      O,
      a,
      n,
      P,
      // a box u0..u1, v0..v1, z0..z1 in the item frame (axis-aligned in the house frame)
      box(m, mat, u0, u1, v0, v1, z0, z1, o) {
        const p = P(u0, v0, 0),
          q = P(u1, v1, 0);
        m.box(mat, Math.min(p[0], q[0]), Math.max(p[0], q[0]), Math.min(p[1], q[1]), Math.max(p[1], q[1]), z0, z1, o);
      },
      cyl(m, mat, u, v, z0, z1, r0, r1, seg) {
        const p = P(u, v, 0);
        m.cyl(mat, p[0], p[1], z0, z1, r0, r1, seg);
      },
      lathe(m, mat, u, v, prof, seg, o) {
        const p = P(u, v, 0);
        m.lathe(mat, p[0], p[1], prof, seg, o);
      },
      rod(m, mat, p0, p1, r, seg) {
        m.rod(mat, P(...p0), P(...p1), r, seg);
      },
      // a flat picture on the wall (facing n), centre (u, z), uv cell of the 2 × 2 atlas
      pic(m, mat, u, v, z, w, h, cell) {
        const cu = (cell % 2) * 0.5,
          cv = 0.5 - Math.floor(cell / 2) * 0.5;
        m.panel(mat, P(u, v, z), a, [n[0], n[1], 0], w, h, [cu, cv, cu + 0.5, cv + 0.5]);
      },
      // house-frame AABB of a footprint (for the occupancy and the colliders)
      rect(u0, u1, v0, v1) {
        const p = P(u0, v0, 0),
          q = P(u1, v1, 0);
        return [Math.min(p[0], q[0]), Math.max(p[0], q[0]), Math.min(p[1], q[1]), Math.max(p[1], q[1])];
      },
    };
  }
  // ---- the walls of a room: sides with their frames and what is in the way (doors, windows) ----
  function sides(room) {
    const { x0, x1, y0, y1 } = room;
    return {
      y0: { L: x1 - x0, O: [x0, y0], a: [1, 0], n: [0, 1] }, // front side, seen from inside: left → right along +x
      x1: { L: y1 - y0, O: [x1, y0], a: [0, 1], n: [-1, 0] },
      y1: { L: x1 - x0, O: [x1, y1], a: [-1, 0], n: [0, -1] },
      x0: { L: y1 - y0, O: [x0, y1], a: [0, -1], n: [1, 0] },
    };
  }
  // ---- the placer: a free stretch of a wall for an item w wide and d deep, h high (windows only block what reaches their sill) ----
  function placer(room, blocks) {
    const S = sides(room),
      used = [],
      tall = [];
    const hit = (r, list) => list.some(q => r[0] < q[1] && r[1] > q[0] && r[2] < q[3] && r[3] > q[2]);
    function at(side, u0, w, d, h) {
      const s = S[side];
      if (!s || u0 < 0.02 || u0 + w > s.L - 0.02) return null;
      const F = frame(s.O, s.a, s.n),
        r = F.rect(u0, u0 + w, 0, d);
      for (const b of blocks)
        if (b.side === side && u0 < b.u1 && u0 + w > b.u0 && (b.door || h > b.z0 - room.z0 - 0.04)) return null;
      // keep doorways free in front of doors on the neighbouring walls too
      if (hit(r, used) || hit(r, room.keep || [])) return null;
      return F;
    }
    function place(side, w, d, h, pref = 0.5) {
      const s = S[side];
      if (!s) return null;
      const span = s.L - w;
      if (span < 0.04) return null;
      const tries = [];
      for (let k = 0; k <= 12; k++) tries.push(0.02 + (span - 0.04) * (k / 12));
      tries.sort((p, q) => Math.abs(p / span - pref) - Math.abs(q / span - pref));
      for (const u0 of tries) {
        const F = at(side, u0, w, d, h);
        if (F) {
          F.u0 = u0;
          F.w = w;
          F.d = d;
          F.side = side;
          used.push(F.rect(u0, u0 + w, 0, d));
          if (h > 1.2) tall.push({ side, u0, u1: u0 + w });
          F.uOff = u0;
          return F;
        }
      }
      return null;
    }
    // the first side (of a preference list) where it fits
    function any(list, w, d, h, pref) {
      for (const sd of list) {
        const F = place(sd, w, d, h, pref);
        if (F) return F;
      }
      return null;
    }
    // a free spot in the middle (rugs, tables): rect in the house frame
    function mid(w, d) {
      const cx = (room.x0 + room.x1) / 2,
        cy = (room.y0 + room.y1) / 2;
      // the middle, else a little aside (the ways from door to door stay free: room.keep)
      for (const [ox, oy] of [
        [0, 0],
        [0.4, 0],
        [-0.4, 0],
        [0, 0.4],
        [0, -0.4],
        [0.8, 0],
        [-0.8, 0],
        [0, 0.8],
        [0, -0.8],
        [0.6, 0.6],
        [-0.6, 0.6],
        [0.6, -0.6],
        [-0.6, -0.6],
      ]) {
        const r = [cx + ox - w / 2, cx + ox + w / 2, cy + oy - d / 2, cy + oy + d / 2];
        if (r[0] < room.x0 + 0.5 || r[1] > room.x1 - 0.5 || r[2] < room.y0 + 0.5 || r[3] > room.y1 - 0.5) continue;
        if (hit(r, used) || hit(r, room.keep || [])) continue;
        used.push(r);
        return r;
      }
      return null;
    }
    // is a stretch of a wall free of doors and windows between heights z0 and z1 (things hung on the wall above the furniture)
    function wallFree(side, u0, u1, z0, z1) {
      const s = S[side];
      if (!s || u0 < 0.02 || u1 > s.L - 0.02) return false;
      return !blocks.some(b => b.side === side && u0 < b.u1 && u1 > b.u0 && (b.door || z1 > b.z0));
    }
    // a free stretch of floor for a rug near the middle (rugs may lie in the ways; only furniture is in the way)
    function floorFree(w, d) {
      const cx = (room.x0 + room.x1) / 2,
        cy = (room.y0 + room.y1) / 2;
      for (const [ox, oy] of [
        [0, 0],
        [0.5, 0],
        [-0.5, 0],
        [0, 0.5],
        [0, -0.5],
        [0.9, 0.4],
        [-0.9, -0.4],
        [0.9, -0.4],
        [-0.9, 0.4],
      ]) {
        const r = [cx + ox - w / 2, cx + ox + w / 2, cy + oy - d / 2, cy + oy + d / 2];
        if (r[0] < room.x0 + 0.3 || r[1] > room.x1 - 0.3 || r[2] < room.y0 + 0.3 || r[3] > room.y1 - 0.3) continue;
        if (!hit(r, used)) return r;
      }
      return null;
    }
    const tallAt = (side, u0, u1) => tall.some(t => t.side === side && u0 < t.u1 && u1 > t.u0);
    return { S, place, any, mid, used, at, wallFree, tall, tallAt, floorFree };
  }
  // ---- furniture (F: an item frame from the placer, u from F.u0) ----
  const L = {}; // the catalogue
  // what the room's small things go on and where the wall is taken (filled in by the furniture, used by deko() at the end)
  const top = (C, F, u0, u1, v, z, kind) => (C.tops || (C.tops = [])).push({ F, u0, u1, v, z, kind });
  const onWall = (C, F, u0, u1, z0, z1) =>
    (C.wallItems || (C.wallItems = [])).push({ r: F.rect(u0, u1, -0.02, 0.15), z0, z1 });
  // a cabinet body with plinth and top; doors: n leaves across its width (the moving part is made by ctx.door)
  L.cabinet = (C, F, w, d, h, body, o = {}) => {
    const u0 = F.u0,
      m = C.m;
    F.box(m, body, u0, u0 + w, 0, d, C.z + 0.08, C.z + h - 0.03); // carcass
    F.box(m, o.plinth || body, u0 + 0.03, u0 + w - 0.03, 0.03, d - 0.04, C.z, C.z + 0.08);
    F.box(m, o.top || body, u0 - 0.02, u0 + w + 0.02, -0.0, d + 0.02, C.z + h - 0.03, C.z + h);
  };
  // a hinged front leaf of a cabinet: hinge at u (left edge if dir = 1), width lw, z0..z1, its front at v = d; the leaf turns into the room
  L.leaf = (C, F, uH, dir, lw, d, z0, z1, mat, knob, container) =>
    C.part({
      kind: 'hinge',
      F,
      hinge: [uH, d],
      dir,
      build: (m, P) => {
        const a = Math.min(0, dir * lw),
          b = Math.max(0, dir * lw);
        P.box(m, mat, a, b, 0, 0.022, z0, z1);
        if (knob)
          P.box(
            m,
            knob,
            dir > 0 ? b - 0.07 : a + 0.05,
            dir > 0 ? b - 0.05 : a + 0.07,
            0.022,
            0.045,
            (z0 + z1) / 2 - 0.05,
            (z0 + z1) / 2 + 0.05
          );
      },
      container,
    });
  // a drawer front at u0..u1, z0..z1 (pulled out along v)
  L.drawer = (C, F, u0, u1, d, z0, z1, mat, knob, container) =>
    C.part({
      kind: 'drawer',
      F,
      hinge: [0, 0],
      build: (m, P) => {
        P.box(m, mat, u0, u1, d, d + 0.022, z0, z1);
        P.box(m, C.M.holz, u0 + 0.03, u1 - 0.03, d - 0.4, d, z0 + 0.02, z0 + 0.04);
        if (knob)
          P.box(
            m,
            knob,
            (u0 + u1) / 2 - 0.05,
            (u0 + u1) / 2 + 0.05,
            d + 0.022,
            d + 0.04,
            (z0 + z1) / 2 - 0.012,
            (z0 + z1) / 2 + 0.012
          );
      },
      container,
    });
  // the tiled stove (Kachelofen) with its bench (Ofenbank) and the wooden rail (ofen-1, ofen-4 Kloster Veßra, ofen-14)
  L.kachelofen = (C, F) => {
    const m = C.m,
      M = C.M,
      z = C.z,
      u0 = F.u0,
      w = 0.95,
      d = 0.75,
      glaze = C.R.pick([M.kachel.gruen, M.kachel.braun, M.kachel.creme, M.kachel.gruen]);
    F.box(m, C.col(0x4a4038, 0.9), u0 + 0.06, u0 + w - 0.06, 0.04, d - 0.06, z, z + 0.25); // plinth
    F.box(m, glaze, u0, u0 + w, 0, d, z + 0.25, z + 1.05); // fire box
    F.box(m, C.col(0x3a3430, 0.6), u0 - 0.03, u0 + w + 0.03, -0.03, d + 0.03, z + 1.05, z + 1.12); // ledge
    F.box(m, glaze, u0 + 0.08, u0 + w - 0.08, 0, d - 0.12, z + 1.12, z + 1.8); // top part
    F.box(m, C.col(0x3a3430, 0.6), u0 + 0.05, u0 + w - 0.05, -0.02, d - 0.09, z + 1.8, z + 1.86);
    F.box(m, M.messing, u0 + w / 2 - 0.16, u0 + w / 2 + 0.16, d, d + 0.015, z + 0.45, z + 0.72); // the brass door (fed from the kitchen in old houses – here a warming oven)
    // the bench around two sides and a rail to dry things on
    F.box(m, M.holz, u0 - 0.45, u0, 0, d + 0.35, z + 0.4, z + 0.45);
    F.box(m, M.holz, u0, u0 + w + 0.1, d, d + 0.35, z + 0.4, z + 0.45);
    for (const [pu, pv] of [
      [u0 - 0.4, 0.05],
      [u0 - 0.4, d + 0.3],
      [u0 + w + 0.05, d + 0.3],
    ])
      F.box(m, M.holz, pu, pu + 0.05, pv - 0.025, pv + 0.025, z, z + 0.4);
    F.rod(m, M.holz, [u0 - 0.05, d + 0.12, z + 1.5], [u0 + w + 0.05, d + 0.12, z + 1.5], 0.02, 5);
    C.spot('ofen', F.P(u0 + w / 2, d + 0.6, z), F, 'Ofen anheizen');
    C.solid(F.rect(u0 - 0.45, u0 + w + 0.1, 0, d + 0.35), z, z + 0.45);
    C.solid(F.rect(u0, u0 + w, 0, d), z, z + 1.9);
  };
  // an iron coal stove with its pipe into the wall (DDR rooms)
  L.kohleofen = (C, F) => {
    const m = C.m,
      z = C.z,
      u = F.u0 + 0.3,
      bl = C.col(0x2a2826, 0.5, 0.4);
    F.box(m, bl, u - 0.25, u + 0.25, 0.08, 0.5, z + 0.1, z + 0.95);
    F.box(m, C.col(0x6a5a4a, 0.4, 0.3), u - 0.27, u + 0.27, 0.06, 0.52, z + 0.95, z + 1.0);
    for (const [pu, pv] of [
      [u - 0.22, 0.1],
      [u + 0.18, 0.1],
      [u - 0.22, 0.44],
      [u + 0.18, 0.44],
    ])
      F.box(m, bl, pu, pu + 0.04, pv, pv + 0.04, z, z + 0.1);
    F.box(m, C.M.messing, u - 0.12, u + 0.12, 0.5, 0.515, z + 0.45, z + 0.7);
    F.cyl(m, bl, u, 0.28, z + 1.0, z + 1.75, 0.065, 0.065, 8);
    F.rod(m, bl, [u, 0.28, z + 1.75], [u, -0.05, z + 1.75], 0.065, 8);
    C.spot('ofen', F.P(u, 0.95, z), F, 'Ofen anheizen');
    C.solid(F.rect(u - 0.27, u + 0.27, 0, 0.52), z, z + 1.0);
  };
  // the corner bench (Eckbank) with a table and two chairs (stube-2, stube-4, hohenfelden-3); F at the window wall, corner at u0
  L.eckbank = (C, F, room, cornerSide, end) => {
    const m = C.m,
      M = C.M,
      z = C.z,
      wood = C.look === 'alt' ? M.holz : M.hell,
      LA = Math.min(2.2, F.w),
      cushion = C.look === 'alt' ? M.karo : C.R.pick([M.velours, M.karo]);
    // leg along this wall from u0 (the corner) over LA
    const u0 = F.u0;
    F.box(m, wood, u0, u0 + LA, 0, 0.48, z + 0.38, z + 0.44);
    F.box(m, wood, u0, u0 + LA, 0, 0.06, z + 0.44, z + 0.92);
    F.box(m, wood, u0, u0 + LA, 0.04, 0.46, z, z + 0.38, { skip: 't' });
    F.box(m, cushion, u0 + 0.02, u0 + LA - 0.02, 0.06, 0.46, z + 0.44, z + 0.5);
    // the second leg along the corner wall (towards +v), at the start or the end of this wall
    const LB = Math.min(1.8, (cornerSide ? cornerSide : 1.8) - 0.1),
      ub = end ? u0 + LA - 0.48 : u0,
      wb = end ? u0 + LA - 0.06 : u0;
    F.box(m, wood, ub, ub + 0.48, 0.48, 0.48 + LB, z + 0.38, z + 0.44);
    F.box(m, wood, wb, wb + 0.06, 0.48, 0.48 + LB, z + 0.44, z + 0.92);
    F.box(m, wood, ub + 0.04, ub + 0.44, 0.48, 0.48 + LB, z, z + 0.38, { skip: 't' });
    F.box(m, cushion, ub + 0.04, ub + 0.42, 0.48, 0.48 + LB - 0.02, z + 0.44, z + 0.5);
    // the table in the corner, two chairs opposite
    const tu = end ? u0 + LA - 0.62 - Math.min(1.25, LA - 0.7) : u0 + 0.62,
      tv = 0.62,
      tw = Math.min(1.25, LA - 0.7),
      td = 0.8;
    L.table(C, F, tu, tu + tw, tv, tv + td, wood, C.look === 'ddr' ? M.tischdecke : C.R.chance(0.6) ? M.karo : null);
    L.chair(C, F, tu + tw * 0.3, tv + td + 0.32, Math.PI, wood);
    L.chair(C, F, tu + tw * 0.75, tv + td + 0.32, Math.PI, wood);
    C.spot('tisch', F.P(tu + tw / 2, tv + td + 0.55, z), F, null);
    C.seat(F.P(u0 + LA * 0.6, 0.25, z), F, 'Auf die Eckbank setzen');
    C.solid(F.rect(u0, u0 + LA, 0, 0.48), z, z + 0.92);
    C.solid(F.rect(ub, ub + 0.48, 0.48, 0.48 + LB), z, z + 0.92);
    C.solid(F.rect(tu, tu + tw, tv, tv + td), z, z + 0.76);
    return { u1: u0 + LA, v1: 0.48 + LB };
  };
  L.table = (C, F, u0, u1, v0, v1, wood, cloth) => {
    const m = C.m,
      z = C.z;
    F.box(m, wood, u0, u1, v0, v1, z + 0.72, z + 0.76);
    for (const [pu, pv] of [
      [u0 + 0.05, v0 + 0.05],
      [u1 - 0.1, v0 + 0.05],
      [u0 + 0.05, v1 - 0.1],
      [u1 - 0.1, v1 - 0.1],
    ])
      F.box(m, wood, pu, pu + 0.05, pv, pv + 0.05, z, z + 0.72);
    F.box(m, wood, u0 + 0.08, u1 - 0.08, v0 + 0.08, v1 - 0.08, z + 0.62, z + 0.72, { skip: 't' });
    if (cloth) {
      F.box(m, cloth, u0 - 0.06, u1 + 0.06, v0 - 0.06, v1 + 0.06, z + 0.762, z + 0.768);
      F.box(m, cloth, u0 - 0.065, u1 + 0.065, v0 - 0.065, v1 + 0.065, z + 0.6, z + 0.762, { skip: 'tb' });
    }
    if (u1 - u0 > 0.6) top(C, F, u0 + 0.15, u1 - 0.15, (v0 + v1) / 2, z + (cloth ? 0.768 : 0.76), 'tisch');
  };
  // a board chair (Brettstuhl) at (u, v) facing angle a (radians in the item frame: 0 = +u, π/2 = +v)
  L.chair = (C, F, u, v, a, wood) => {
    const m = C.m,
      z = C.z,
      c = Math.cos(a),
      s = Math.sin(a),
      Q = (du, dv) => [u + du * c - dv * s, v + du * s + dv * c];
    const p = F.P(u, v, 0),
      ang = Math.atan2(F.a[1], F.a[0]) + a;
    m.box(wood, p[0] - 0.2, p[0] + 0.2, p[1] - 0.2, p[1] + 0.2, z + 0.43, z + 0.47, { a: ang });
    for (const [du, dv] of [
      [-0.17, -0.17],
      [-0.17, 0.17],
      [0.17, -0.17],
      [0.17, 0.17],
    ]) {
      const q = F.P(...Q(du, dv), 0);
      m.box(wood, q[0] - 0.02, q[0] + 0.02, q[1] - 0.02, q[1] + 0.02, z, z + 0.43);
    }
    const bk = F.P(...Q(-0.19, 0), 0);
    m.box(wood, bk[0] - 0.02, bk[0] + 0.02, bk[1] - 0.19, bk[1] + 0.19, z + 0.47, z + 0.95, { a: ang });
  };
  // the kitchen dresser (Küchenbüfett, stube-8/14): base with two doors and two drawers, a set-back top with glass doors, tins on top
  L.buefett = (C, F, label) => {
    const m = C.m,
      M = C.M,
      z = C.z,
      u0 = F.u0,
      w = 1.3,
      body =
        C.look === 'alt'
          ? C.R.pick([C.col(0x5a3a24, 0.55), C.col(0xe6dcc4, 0.5), C.col(0x8a9a8a, 0.55)])
          : C.col(0xe8e0c8, 0.5),
      knob = M.messing;
    L.cabinet(C, F, w, 0.55, 0.9, body, { top: M.holz });
    F.box(m, body, u0 + 0.05, u0 + w - 0.05, 0, 0.32, z + 1.25, z + 2.0); // top part
    F.box(m, body, u0 + 0.05, u0 + w - 0.05, 0, 0.38, z + 1.98, z + 2.04);
    F.box(m, M.holz, u0 + 0.05, u0 + w - 0.05, 0, 0.3, z + 0.9, z + 1.25, { skip: 'y1' }); // the open niche
    F.box(m, M.glas, u0 + 0.08, u0 + w - 0.08, 0.32, 0.325, z + 1.3, z + 1.95);
    for (const k of [0, 1, 2])
      F.box(
        m,
        body,
        u0 + 0.05 + k * (w / 2 - 0.05) - 0.02,
        u0 + 0.07 + k * (w / 2 - 0.05),
        0.32,
        0.34,
        z + 1.25,
        z + 2.0
      );
    F.box(m, M.porzellan, u0 + 0.12, u0 + w - 0.12, 0.05, 0.25, z + 1.55, z + 1.56);
    for (let i = 0; i < 5; i++)
      F.cyl(
        m,
        C.col([0xd04030, 0x3a6aa0, 0xe8e0d0, 0x5a8a4a][i % 4], 0.5),
        u0 + 0.2 + i * 0.22,
        0.15,
        z + 1.56,
        z + 1.72,
        0.05,
        0.05,
        8
      );
    for (let i = 0; i < 4; i++)
      F.cyl(m, C.col(0xcfcfc8, 0.4, 0.5), u0 + 0.2 + i * 0.28, 0.17, z + 2.04, z + 2.2, 0.06, 0.06, 8);
    // the moving parts: two base doors and a drawer (the one searched)
    const cont = C.container('buefett', label || 'Küchenbüfett durchsuchen', F.P(u0 + w / 2, 0.75, z + 0.8));
    L.leaf(C, F, u0 + 0.03, 1, w / 2 - 0.04, 0.55, z + 0.1, z + 0.62, body, knob, cont);
    L.leaf(C, F, u0 + w - 0.03, -1, w / 2 - 0.04, 0.55, z + 0.1, z + 0.62, body, knob, cont);
    L.drawer(C, F, u0 + 0.04, u0 + w - 0.04, 0.53, z + 0.64, z + 0.84, body, knob, cont);
    C.solid(F.rect(u0, u0 + w, 0, 0.56), z, z + 2.04);
    top(C, F, u0 + 0.62, u0 + w - 0.08, 0.44, z + 0.9, 'schrank');
  };
  // the coal range (Kohleherd): iron top with rings, enamel front, brass rail, pipe into the wall (kueche-11) – or an electric stove (DDR, later)
  L.herd = (C, F) => {
    const m = C.m,
      M = C.M,
      z = C.z,
      u0 = F.u0,
      w = C.look === 'alt' ? 0.95 : 0.6,
      d = 0.6;
    if (C.look === 'alt') {
      F.box(m, C.col(0xe8e2d4, 0.25, 0.1), u0, u0 + w, 0, d, z + 0.1, z + 0.8);
      F.box(m, C.col(0x24221f, 0.5, 0.5), u0 - 0.02, u0 + w + 0.02, -0.0, d + 0.02, z + 0.8, z + 0.86);
      for (const k of [0.3, 0.7])
        F.cyl(m, C.col(0x3a3836, 0.4, 0.6), u0 + w * k, d * 0.55, z + 0.86, z + 0.875, 0.11, 0.11, 12);
      F.rod(m, M.messing, [u0 - 0.03, d + 0.06, z + 0.74], [u0 + w + 0.03, d + 0.06, z + 0.74], 0.012, 6);
      F.box(m, C.col(0x24221f, 0.5, 0.5), u0 + 0.1, u0 + 0.42, d, d + 0.012, z + 0.4, z + 0.66);
      F.box(m, C.col(0x24221f, 0.5, 0.5), u0 + 0.5, u0 + 0.85, d, d + 0.012, z + 0.15, z + 0.66);
      F.cyl(m, C.col(0x24221f, 0.5, 0.5), u0 + 0.18, 0.12, z + 0.86, z + 1.6, 0.06, 0.06, 8);
      F.rod(m, C.col(0x24221f, 0.5, 0.5), [u0 + 0.18, 0.12, z + 1.6], [u0 + 0.18, -0.05, z + 1.6], 0.06, 8);
      F.cyl(m, M.emaille, u0 + w * 0.7, d * 0.55, z + 0.875, z + 1.05, 0.11, 0.1, 10); // a pot
    } else {
      F.box(m, C.col(0xf2f0ea, 0.3, 0.1), u0, u0 + w, 0, d, z, z + 0.85);
      F.box(m, C.col(0x1d1d1b, 0.4), u0 + 0.04, u0 + w - 0.04, d, d + 0.01, z + 0.15, z + 0.6);
      for (const [a, b] of [
        [0.25, 0.2],
        [0.75, 0.2],
        [0.25, 0.42],
        [0.75, 0.42],
      ])
        F.cyl(m, C.col(0x2a2a2a, 0.4, 0.4), u0 + w * a, b, z + 0.85, z + 0.865, 0.085, 0.085, 10);
    }
    C.spot('herd', F.P(u0 + w / 2, d + 0.5, z), F, null);
    C.solid(F.rect(u0, u0 + w, 0, d), z, z + 0.9);
  };
  // kitchen units (DDR Anbauküche kueche-23, after 1990 a fitted kitchen kueche-24): base units with doors and drawers, a sink, wall units
  L.kuechenzeile = (C, F, n) => {
    const m = C.m,
      M = C.M,
      z = C.z,
      u0 = F.u0,
      ddr = C.look === 'ddr',
      front = ddr ? C.col(0xece6b8, 0.4) : M.birke,
      edge = ddr ? C.col(0xd86a28, 0.4) : C.col(0xd8d0c0, 0.5),
      w = n * 0.6;
    F.box(m, C.col(0xdedad0, 0.6), u0, u0 + w, 0, 0.56, z + 0.08, z + 0.86);
    F.box(m, C.col(0x5a5650, 0.8), u0 + 0.02, u0 + w - 0.02, 0.0, 0.5, z, z + 0.08);
    F.box(m, ddr ? C.col(0xe8e4dc, 0.35) : C.col(0x8a8378, 0.35), u0 - 0.01, u0 + w + 0.01, 0, 0.6, z + 0.86, z + 0.9);
    F.box(m, edge, u0 - 0.01, u0 + w + 0.01, 0.6, 0.62, z + 0.86, z + 0.9);
    // the sink in the second unit
    F.box(m, M.stahl, u0 + 0.66, u0 + 1.14, 0.08, 0.5, z + 0.9, z + 0.905);
    F.cyl(m, M.stahl, u0 + 0.9, 0.06, z + 0.9, z + 1.15, 0.015, 0.015, 6);
    F.rod(m, M.stahl, [u0 + 0.9, 0.06, z + 1.15], [u0 + 0.9, 0.25, z + 1.15], 0.013, 6);
    C.spot('spuele', F.P(u0 + 0.9, 0.9, z), F, null);
    // two of the units can be searched (a drawer, a cupboard), the wall units as one
    const wall = C.container('schrank', 'Hängeschrank öffnen', F.P(u0 + w / 2, 0.5, z + 1.6)),
      drawer = C.container('schublade', 'Schublade durchsuchen', F.P(u0 + 0.3, 0.75, z + 0.75)),
      under = n > 2 ? C.container('schrank', 'Unterschrank öffnen', F.P(u0 + 1.5, 0.75, z + 0.5)) : null;
    for (let i = 0; i < n; i++) {
      const a = u0 + i * 0.6;
      L.drawer(C, F, a + 0.02, a + 0.58, 0.56, z + 0.68, z + 0.84, front, M.stahl, i === 0 ? drawer : null);
      L.leaf(C, F, a + 0.02, 1, 0.56, 0.56, z + 0.1, z + 0.66, front, M.stahl, i === 2 ? under : null);
    }
    // wall units
    F.box(m, C.col(0xdedad0, 0.6), u0, u0 + w, 0, 0.33, z + 1.45, z + 2.15);
    for (let i = 0; i < n; i++)
      L.leaf(C, F, u0 + i * 0.6 + 0.02, 1, 0.56, 0.33, z + 1.47, z + 2.13, front, M.stahl, i < 2 ? wall : null);
    C.solid(F.rect(u0, u0 + w, 0, 0.6), z, z + 0.9);
    // the worktop beside the sink (under the wall units: low things only)
    top(C, F, u0 + 0.05, u0 + 0.6, 0.3, z + 0.9, 'arbeit');
    if (n > 2) top(C, F, u0 + 1.25, u0 + w - 0.05, 0.3, z + 0.9, 'arbeit');
  };
  // the fridge (DDR „Kristall“ type, small, white; later a tall one)
  L.kuehlschrank = (C, F) => {
    const m = C.m,
      z = C.z,
      u0 = F.u0,
      h = C.look === 'ddr' ? 0.86 : 1.45,
      wh = C.col(0xf4f3ee, 0.3, 0.05);
    F.box(m, wh, u0, u0 + 0.56, 0, 0.58, z + 0.02, z + h);
    const cont = C.container('kuehlschrank', 'Kühlschrank öffnen', F.P(u0 + 0.28, 0.8, z + h * 0.7));
    L.leaf(C, F, u0 + 0.01, 1, 0.54, 0.58, z + 0.05, z + h - 0.03, wh, C.col(0xb8b8b8, 0.3, 0.6), cont);
    C.solid(F.rect(u0, u0 + 0.56, 0, 0.6), z, z + h);
  };
  // the wall unit (Schrankwand, ddr-5/6/7/13/15): closed cupboards, a glass cabinet with glasses and bottles, books, the TV niche, drawers
  L.schrankwand = (C, F, w) => {
    const m = C.m,
      M = C.M,
      z = C.z,
      u0 = F.u0,
      ver = C.look === 'nachwende' ? M.eiche : M.furnier,
      d = 0.48,
      h = 2.35,
      nM = Math.max(3, Math.floor(w / 0.9)),
      mw = w / nM,
      // feat/haeuser: a kept wall unit of today (a look with its own TV) opens its niches – the carcass without its front face (the
      // item's front, not the house frame's +y), a dark back behind the gaps; the zombie night's stays closed as before
      open = C.ext && C.ext.tv ? (F.n[1] > 0.5 ? 'y1' : F.n[0] < -0.5 ? 'x0' : F.n[1] < -0.5 ? 'y0' : 'x1') : null;
    F.box(m, ver, u0, u0 + w, 0, d, z + 0.06, z + h, open ? { skip: open } : undefined);
    if (open) F.box(m, C.col(0x2a2018, 0.8), u0, u0 + w, 0, 0.02, z + 0.06, z + h);
    F.box(m, C.col(0x2a2018, 0.8), u0 + 0.02, u0 + w - 0.02, 0, d - 0.04, z, z + 0.06);
    const cont = C.container('schrank', 'Schrankwand durchsuchen', F.P(u0 + w / 2, 0.8, z + 1.0));
    for (let i = 0; i < nM; i++) {
      const a = u0 + i * mw,
        kind = i === 1 ? 'tv' : i === nM - 2 ? 'vitrine' : i === 0 ? 'books' : 'closed';
      // lower doors in every module
      L.leaf(C, F, a + 0.02, 1, mw - 0.04, d, z + 0.1, z + 0.72, ver, M.messing, cont);
      if (kind === 'tv') {
        F.box(m, C.col(0x3a2a1c, 0.8), a + 0.02, a + mw - 0.02, 0.02, d - 0.02, z + 0.74, z + 1.5, {
          skip: open || 'y1',
        });
        L.tv(C, F, a + mw / 2, 0.2, z + 0.76);
        F.box(m, ver, a + 0.02, a + mw - 0.02, 0.0, d, z + 1.5, z + 1.52);
        L.leaf(C, F, a + 0.02, 1, mw - 0.04, d, z + 1.55, z + h - 0.05, ver, M.messing, null);
      } else if (kind === 'vitrine') {
        F.box(m, C.col(0x3a2a1c, 0.8), a + 0.02, a + mw - 0.02, 0.02, d - 0.02, z + 0.74, z + 1.9, {
          skip: open || 'y1',
        });
        F.box(m, M.glas, a + 0.03, a + mw - 0.03, d - 0.01, d - 0.005, z + 0.75, z + 1.88);
        for (let k = 0; k < 5; k++)
          F.cyl(m, M.glas, a + 0.12 + k * ((mw - 0.24) / 4), 0.25, z + 1.32, z + 1.45, 0.03, 0.035, 8);
        L.radio(C, F, a + mw / 2, 0.08, z + 1.52);
        for (let k = 0; k < 3; k++)
          F.cyl(
            m,
            C.col([0x3a5a2a, 0xd8c890, 0x6a2a1a][k], 0.15),
            a + 0.15 + k * 0.2,
            0.2,
            z + 0.76,
            z + 1.05,
            0.04,
            0.04,
            8
          );
        L.leaf(C, F, a + 0.02, 1, mw - 0.04, d, z + 1.92, z + h - 0.05, ver, M.messing, null);
      } else if (kind === 'books') {
        F.box(m, C.col(0x3a2a1c, 0.8), a + 0.02, a + mw - 0.02, 0.02, d - 0.02, z + 0.74, z + h - 0.05, {
          skip: open || 'y1',
        });
        for (const zz of [0.75, 1.15, 1.55, 1.95]) L.books(C, F, a + 0.04, a + mw - 0.04, 0.06, z + zz, 0.32);
      } else {
        L.drawer(C, F, a + 0.02, a + mw - 0.02, d, z + 0.75, z + 0.95, ver, M.messing, cont);
        L.leaf(C, F, a + 0.02, 1, mw - 0.04, d, z + 0.98, z + h - 0.05, ver, M.messing, null);
      }
    }
    C.solid(F.rect(u0, u0 + w, 0, d), z, z + h);
    top(C, F, u0 + 0.15, u0 + w - 0.15, 0.24, z + h, 'oben');
  };
  // a row of book spines on a shelf (colours from a fixed set)
  L.books = (C, F, u0, u1, v0, z, hMax) => {
    let u = u0;
    const cols = [0x7a3b2e, 0x3f5a46, 0x2f4561, 0xb08d57, 0x8c6b4f, 0xd9cdb5, 0x5b4a6e, 0x9a5b3a, 0x46524e];
    while (u < u1 - 0.03) {
      const w = C.R.r(0.025, 0.05),
        h = C.R.r(0.6, 0.95) * hMax;
      F.box(C.m, C.col(C.R.pick(cols), 0.7), u, u + w, v0, v0 + C.R.r(0.15, 0.22), z, z + h);
      u += w + 0.003;
    }
  };
  // a CRT set (RFT) in a wooden case
  L.tv = (C, F, u, v, z) => {
    if (C.ext && C.ext.tv && C.ext.tv(C, F, u, v, z)) return; // feat/haeuser: a flat set of today in the old wall unit
    const m = C.m;
    F.box(m, C.col(0x5a3a22, 0.5), u - 0.3, u + 0.3, v, v + 0.42, z, z + 0.48);
    F.box(m, C.col(0x1a2024, 0.15), u - 0.24, u + 0.12, v + 0.42, v + 0.425, z + 0.08, z + 0.42);
    for (const k of [0.15, 0.25])
      F.cyl(m, C.col(0xc8c0b0, 0.4), u + 0.21, v + 0.43, z + k * 1.6, z + k * 1.6 + 0.02, 0.018, 0.018, 6);
    C.spot('tv', F.P(u, v + 1.4, z - 0.76 + 0.0), F, null);
    if (C.look !== 'nachwende') L.deckchen(C, ...F.P(u, v + 0.21, 0).slice(0, 2), z + 0.481, 0.15);
  };
  // the three-piece suite: couch and two armchairs around a low table on a rug (ddr-4/6/13/21; after 1990 a leather couch)
  L.sitzgruppe = (C, F, room, arms = 2) => {
    const m = C.m,
      M = C.M,
      z = C.z,
      u0 = F.u0 + (arms === 2 ? 0.95 : 0),
      leather = C.look === 'nachwende',
      fab = leather
        ? C.col(0x5a3a26, 0.45)
        : C.R.pick([M.velours, C.col(0x3f5a3a, 0.9), C.col(0xa8361e, 0.85), C.col(0xb8a07a, 0.9)]),
      w = 2.0;
    // couch with its back to the wall
    F.box(m, fab, u0, u0 + w, 0.0, 0.88, z + 0.12, z + 0.42);
    F.box(m, fab, u0, u0 + w, 0.0, 0.24, z + 0.42, z + 0.82);
    F.box(m, fab, u0 - 0.02, u0 + 0.16, 0.0, 0.88, z + 0.42, z + 0.62);
    F.box(m, fab, u0 + w - 0.16, u0 + w + 0.02, 0.0, 0.88, z + 0.42, z + 0.62);
    for (let k = 0; k < 3; k++)
      F.box(
        m,
        fab,
        u0 + 0.18 + k * ((w - 0.36) / 3),
        u0 + 0.16 + (k + 1) * ((w - 0.36) / 3),
        0.24,
        0.86,
        z + 0.42,
        z + 0.52
      );
    F.box(m, C.col(0x2a1c12, 0.6), u0 + 0.05, u0 + w - 0.05, 0.05, 0.8, z, z + 0.12);
    // the table and the rug
    const tv0 = 1.25,
      tv1 = 1.9;
    F.box(m, M.perser, u0 - 0.4, u0 + w + 0.4, 0.95, 2.95, z + 0.003, z + 0.012);
    F.box(m, leather ? M.eiche : M.furnier, u0 + 0.35, u0 + w - 0.35, tv0, tv1, z + 0.46, z + 0.5);
    F.box(m, leather ? M.eiche : M.furnier, u0 + 0.4, u0 + w - 0.4, tv0 + 0.05, tv1 - 0.05, z + 0.012, z + 0.46, {
      skip: 't',
    });
    if (!leather) F.box(m, M.tischdecke, u0 + 0.6, u0 + w - 0.6, tv0 - 0.05, tv1 + 0.05, z + 0.5, z + 0.505);
    F.cyl(m, C.col(0x2a4aa8, 0.1), u0 + w / 2, (tv0 + tv1) / 2, z + 0.505, z + 0.53, 0.09, 0.07, 10); // the blue glass ashtray (ddr-6)
    top(C, F, u0 + 0.45, u0 + w / 2 - 0.14, (tv0 + tv1) / 2, z + 0.505, 'couchtisch');
    top(C, F, u0 + w / 2 + 0.14, u0 + w - 0.45, (tv0 + tv1) / 2, z + 0.505, 'couchtisch');
    // cushions with the chop in the top (the 'Knick') against the back; doilies over the back in the DDR
    const kis = C.col(C.R.pick([0xc8a050, 0x7a2a2a, 0x3a5a7a, 0xd8c8a8, 0x5a6a3a]), 0.95);
    for (const cu of [u0 + 0.38, u0 + w - 0.38]) {
      F.box(m, kis, cu - 0.2, cu - 0.03, 0.24, 0.36, z + 0.52, z + 0.9);
      F.box(m, kis, cu + 0.03, cu + 0.2, 0.24, 0.36, z + 0.52, z + 0.9);
      F.box(m, kis, cu - 0.03, cu + 0.03, 0.25, 0.35, z + 0.52, z + 0.8);
    }
    if (C.look === 'ddr')
      for (const k of [0.3, 0.7]) L.deckchen(C, ...F.P(u0 + w * k, 0.12, 0).slice(0, 2), z + 0.822, 0.15);
    // two armchairs facing the couch's ends
    for (const [cu, a] of [
      [u0 - 0.55, 0],
      [u0 + w + 0.55, Math.PI],
    ].slice(arms === 2 ? 0 : 1, arms ? 2 : 0)) {
      const p = F.P(cu, 1.55, 0),
        ang = Math.atan2(F.a[1], F.a[0]) + a;
      m.box(fab, p[0] - 0.42, p[0] + 0.42, p[1] - 0.42, p[1] + 0.42, z + 0.12, z + 0.44, { a: ang });
      const bp = F.P(cu + (a ? 0.32 : -0.32), 1.55, 0);
      m.box(fab, bp[0] - 0.1, bp[0] + 0.1, bp[1] - 0.42, bp[1] + 0.42, z + 0.44, z + 0.95, { a: ang });
      C.solidW([p[0] - 0.42, p[0] + 0.42, p[1] - 0.42, p[1] + 0.42], z, z + 0.6);
    }
    C.seat(F.P(u0 + w / 2, 0.45, z), F, 'Auf die Couch setzen');
    C.solid(F.rect(u0, u0 + w, 0, 0.88), z, z + 0.82);
    C.solid(F.rect(u0 + 0.35, u0 + w - 0.35, tv0, tv1), z, z + 0.5);
    void room;
  };
  // a floor lamp with a fabric shade (ddr-21)
  L.stehlampe = (C, F, u, v) => {
    const m = C.m,
      z = C.z;
    F.cyl(m, C.col(0x3a2a1c, 0.5), u, v, z, z + 0.03, 0.16, 0.16, 10);
    F.cyl(m, C.M.messing, u, v, z + 0.03, z + 1.45, 0.012, 0.012, 6);
    C.lamp(F.P(u, v, z + 1.55), 'shade', 0.22);
  };
  // a bed (Bett): frame with head and foot boards, a feather bed (white or checked), a pillow; head at the wall (v = 0), u0..u0+w
  L.bett = (C, F, w, label) => {
    const m = C.m,
      M = C.M,
      z = C.z,
      u0 = F.u0,
      Lb = 2.0,
      wood = C.look === 'ddr' ? M.birke : C.look === 'nachwende' ? M.eiche : M.holz,
      bed = C.R.pick(
        C.look === 'alt'
          ? [M.karo, M.duvet, C.col(0xf4f2ec, 0.9)]
          : [M.duvet, C.col(0xd8e8c8, 0.9), C.col(0xf4f2ec, 0.9)]
      );
    F.box(m, wood, u0, u0 + w, 0, 0.06, z, z + 1.05);
    F.box(m, wood, u0, u0 + w, Lb - 0.06, Lb, z, z + 0.62);
    F.box(m, wood, u0, u0 + 0.05, 0.06, Lb - 0.06, z + 0.2, z + 0.42);
    F.box(m, wood, u0 + w - 0.05, u0 + w, 0.06, Lb - 0.06, z + 0.2, z + 0.42);
    F.box(m, C.col(0xe8e2d4, 0.9), u0 + 0.05, u0 + w - 0.05, 0.06, Lb - 0.06, z + 0.3, z + 0.48);
    F.box(m, bed, u0 + 0.06, u0 + w - 0.06, 0.5, Lb - 0.08, z + 0.48, z + 0.66);
    F.box(m, C.col(0xf4f2ec, 0.9), u0 + 0.12, u0 + w - 0.12, 0.1, 0.48, z + 0.48, z + 0.6);
    C.spot('bett', F.P(u0 + w / 2, Lb * 0.55, z), F, label || 'Ins Bett legen', {
      lie: true,
      head: F.P(u0 + w / 2, 0.3, z + 0.7),
    });
    C.solid(F.rect(u0, u0 + w, 0, Lb), z, z + 0.66);
  };
  // the wardrobe (Kleiderschrank, kammer-5/7): two doors, a cornice
  L.kleiderschrank = (C, F, w) => {
    const m = C.m,
      M = C.M,
      z = C.z,
      u0 = F.u0,
      d = 0.58,
      h = 1.95,
      body =
        C.look === 'ddr'
          ? M.birke
          : C.look === 'nachwende'
            ? M.eiche
            : C.R.pick([M.holz, C.col(0x6a4a30, 0.55), C.col(0x8aa0a8, 0.6)]);
    L.cabinet(C, F, w, d, h, body);
    F.box(m, body, u0 - 0.04, u0 + w + 0.04, -0.0, d + 0.05, z + h, z + h + 0.08);
    const cont = C.container('kleiderschrank', 'Kleiderschrank durchsuchen', F.P(u0 + w / 2, 0.85, z + 1.2));
    L.leaf(C, F, u0 + 0.02, 1, w / 2 - 0.03, d, z + 0.1, z + h - 0.05, body, M.messing, cont);
    L.leaf(C, F, u0 + w - 0.02, -1, w / 2 - 0.03, d, z + 0.1, z + h - 0.05, body, M.messing, cont);
    // clothes inside (seen when open)
    for (let i = 0; i < 5; i++)
      F.box(
        m,
        C.col(C.R.pick([0x7a3b2e, 0x3f5a46, 0x2f4561, 0xcdbb9a, 0x5d6f86]), 0.95),
        u0 + 0.1 + i * ((w - 0.2) / 5),
        u0 + 0.08 + (i + 1) * ((w - 0.2) / 5),
        0.15,
        0.45,
        z + 0.9,
        z + 1.75
      );
    C.solid(F.rect(u0, u0 + w, 0, d), z, z + h);
  };
  // a bedside table with a drawer
  L.nachttisch = (C, F) => {
    const m = C.m,
      z = C.z,
      u0 = F.u0,
      body = C.look === 'ddr' ? C.M.birke : C.M.holz;
    F.box(m, body, u0, u0 + 0.45, 0, 0.4, z + 0.05, z + 0.62);
    F.box(m, body, u0 - 0.01, u0 + 0.46, 0, 0.41, z + 0.62, z + 0.65);
    const cont = C.container('nachttisch', 'Nachttisch durchsuchen', F.P(u0 + 0.22, 0.6, z + 0.55));
    L.drawer(C, F, u0 + 0.03, u0 + 0.42, 0.4, z + 0.45, z + 0.6, body, C.M.messing, cont);
    C.lamp(F.P(u0 + 0.22, 0.2, z + 0.85), 'small', 0.12);
    F.cyl(m, C.M.messing, u0 + 0.22, 0.2, z + 0.65, z + 0.78, 0.015, 0.015, 6);
    C.solid(F.rect(u0, u0 + 0.45, 0, 0.4), z, z + 0.65);
  };
  // a chest (Truhe, stube-13: red with panels) – the lid opens
  L.truhe = (C, F, label) => {
    const m = C.m,
      z = C.z,
      u0 = F.u0,
      w = 1.0,
      d = 0.5,
      body = C.R.pick([C.col(0x8a2a1e, 0.6), C.col(0x5a3a24, 0.6), C.col(0x3a5a6a, 0.6)]);
    F.box(m, body, u0, u0 + w, 0, d, z + 0.05, z + 0.5);
    F.box(m, C.col(0x2a2018, 0.6), u0 + 0.02, u0 + w - 0.02, 0.02, d - 0.02, z, z + 0.05);
    const cont = C.container('truhe', label || 'Truhe öffnen', F.P(u0 + w / 2, d + 0.35, z + 0.5));
    C.part({
      kind: 'lid',
      F,
      hinge: [u0, 0.0],
      z: z + 0.5,
      build: (mm, P) => {
        P.box(mm, body, 0, w, 0, d + 0.02, 0, 0.08);
        P.box(mm, C.M.schwarz, w / 2 - 0.06, w / 2 + 0.06, d + 0.02, d + 0.035, -0.08, 0.04);
      },
      container: cont,
    });
    C.solid(F.rect(u0, u0 + w, 0, d), z, z + 0.58);
  };
  // shelves with preserving jars (Einweckgläser) – cellar and pantry (keller, Wikipedia „Einkochen“)
  L.regal = (C, F, w, label, kind = 'regal') => {
    const m = C.m,
      z = C.z,
      u0 = F.u0,
      d = 0.4,
      wood = C.M.hell,
      fills = [0x7a1a22, 0x6f7a3a, 0x4a2a40, 0xc8a060, 0xd86a2a];
    for (const pu of [u0, u0 + w - 0.04]) F.box(m, wood, pu, pu + 0.04, 0, d, z, z + 1.9);
    for (const zz of [0.3, 0.75, 1.2, 1.65]) {
      F.box(m, wood, u0, u0 + w, 0, d, z + zz - 0.025, z + zz);
      for (let u = u0 + 0.1; u < u0 + w - 0.1; u += 0.12)
        if (C.R() < 0.8) {
          const f = C.col(C.R.pick(fills), 0.3);
          F.cyl(m, f, u, 0.2, z + zz, z + zz + 0.13, 0.042, 0.042, 7);
          F.cyl(m, C.col(0xd8d8d0, 0.3, 0.6), u, 0.2, z + zz + 0.13, z + zz + 0.15, 0.046, 0.046, 7);
        }
    }
    C.container(kind, label || 'Regal durchsuchen', F.P(u0 + w / 2, d + 0.4, z + 1.0));
    C.solid(F.rect(u0, u0 + w, 0, d), z, z + 1.9);
  };
  // the potato crate (Kartoffelhorde), the coal heap with briquettes (keller-18), a workbench (werkbank)
  L.kartoffeln = (C, F) => {
    const m = C.m,
      z = C.z,
      u0 = F.u0;
    for (let k = 0; k < 6; k++)
      F.box(m, C.M.hell, u0, u0 + 1.2, 0, 0.9, z + 0.05 + k * 0.1, z + 0.09 + k * 0.1, { skip: 'tb' });
    F.box(m, C.col(0x9a7a4a, 0.95), u0 + 0.05, u0 + 1.15, 0.05, 0.85, z + 0.05, z + 0.42);
    C.solid(F.rect(u0, u0 + 1.2, 0, 0.9), z, z + 0.6);
  };
  L.kohlen = (C, F) => {
    const m = C.m,
      z = C.z,
      u0 = F.u0;
    F.box(m, C.col(0x6a6660, 0.95), u0, u0 + 1.4, 0.9, 0.96, z, z + 0.7);
    F.lathe(
      m,
      C.col(0x1a1816, 0.85),
      u0 + 0.7,
      0.45,
      [
        [0.75, z],
        [0.55, z + 0.25],
        [0.2, z + 0.45],
        [0.02, z + 0.5],
      ],
      9,
      { sx: 1, sy: 0.65 }
    );
    C.solid(F.rect(u0, u0 + 1.4, 0, 0.96), z, z + 0.5);
  };
  L.werkbank = (C, F) => {
    const m = C.m,
      z = C.z,
      u0 = F.u0,
      w = 1.6;
    F.box(m, C.M.holz, u0, u0 + w, 0, 0.7, z + 0.82, z + 0.9);
    for (const pu of [u0 + 0.05, u0 + w - 0.12])
      for (const pv of [0.05, 0.58]) F.box(m, C.M.holz, pu, pu + 0.07, pv, pv + 0.07, z, z + 0.82);
    F.box(m, C.M.holz, u0 + 0.05, u0 + w - 0.05, 0.05, 0.65, z + 0.2, z + 0.24);
    F.box(m, C.col(0x3a4a5a, 0.4, 0.6), u0 + w - 0.35, u0 + w - 0.15, 0.6, 0.78, z + 0.9, z + 1.02); // a vice
    F.box(m, C.col(0x6a5a40, 0.9), u0, u0 + w, 0.0, 0.03, z + 1.0, z + 1.7); // tool board
    for (let i = 0; i < 6; i++)
      F.box(
        m,
        C.col(C.R.pick([0x8a2a1e, 0x3a3a3a, 0xc8a040]), 0.5, 0.4),
        u0 + 0.15 + i * 0.22,
        u0 + 0.19 + i * 0.22,
        0.03,
        0.06,
        z + 1.15,
        z + 1.5
      );
    const cont = C.container('werkbank', 'Werkbank durchsuchen', F.P(u0 + w / 2, 0.95, z + 0.9));
    L.drawer(C, F, u0 + 0.2, u0 + 0.8, 0.7, z + 0.66, z + 0.8, C.M.holz, C.M.schwarz, cont);
    C.solid(F.rect(u0, u0 + w, 0, 0.7), z, z + 0.95);
  };
  // the bath: tub on feet or tiled in, the bath heater (Badeofen: a copper cylinder on a fire box, bad-9), WC with high cistern, basin
  L.wanne = (C, F) => {
    const m = C.m,
      z = C.z,
      u0 = F.u0,
      w = 1.7,
      d = 0.75,
      wh = C.col(0xf4f2ec, 0.2, 0.05);
    F.box(m, wh, u0, u0 + w, 0, d, z + 0.12, z + 0.56, { skip: 't' });
    F.box(m, wh, u0, u0 + w, 0, 0.06, z + 0.56, z + 0.6);
    F.box(m, wh, u0, u0 + w, d - 0.06, d, z + 0.56, z + 0.6);
    F.box(m, wh, u0, u0 + 0.06, 0.06, d - 0.06, z + 0.56, z + 0.6);
    F.box(m, wh, u0 + w - 0.06, u0 + w, 0.06, d - 0.06, z + 0.56, z + 0.6);
    F.box(m, C.col(0xbcd0d8, 0.15), u0 + 0.08, u0 + w - 0.08, 0.08, d - 0.08, z + 0.3, z + 0.31);
    for (const [pu, pv] of [
      [u0 + 0.1, 0.1],
      [u0 + w - 0.16, 0.1],
      [u0 + 0.1, d - 0.16],
      [u0 + w - 0.16, d - 0.16],
    ])
      F.box(m, C.M.messing, pu, pu + 0.06, pv, pv + 0.06, z, z + 0.12);
    C.spot('wanne', F.P(u0 + w / 2, d + 0.4, z), F, null);
    C.solid(F.rect(u0, u0 + w, 0, d), z, z + 0.6);
  };
  L.badeofen = (C, F) => {
    const m = C.m,
      z = C.z,
      u = F.u0 + 0.25;
    F.box(m, C.col(0x2a2826, 0.5, 0.4), u - 0.22, u + 0.22, 0.04, 0.44, z, z + 0.55);
    F.cyl(m, C.col(0xb8703a, 0.3, 0.8), u, 0.24, z + 0.55, z + 1.85, 0.19, 0.19, 12);
    F.cyl(m, C.col(0xb8703a, 0.3, 0.8), u, 0.24, z + 1.85, z + 1.95, 0.19, 0.08, 12);
    F.cyl(m, C.col(0x2a2826, 0.5, 0.4), u, 0.24, z + 1.95, z + 2.4, 0.05, 0.05, 8);
    F.rod(m, C.M.messing, [u + 0.12, 0.42, z + 1.0], [u + 0.12, 0.6, z + 1.0], 0.015, 6);
    C.spot('ofen', F.P(u, 0.85, z), F, 'Badeofen anheizen');
    C.solid(F.rect(u - 0.22, u + 0.22, 0, 0.44), z, z + 1.95);
  };
  L.wc = (C, F) => {
    const m = C.m,
      z = C.z,
      u = F.u0 + 0.25,
      wh = C.col(C.look === 'ddr' ? 0x8aa8c8 : 0xf4f2ec, 0.2, 0.05);
    F.lathe(
      m,
      wh,
      u,
      0.35,
      [
        [0.12, z],
        [0.16, z + 0.3],
        [0.2, z + 0.4],
      ],
      10
    );
    F.box(m, C.col(0x5a3a22, 0.5), u - 0.2, u + 0.2, 0.15, 0.58, z + 0.4, z + 0.43);
    F.box(m, C.look === 'alt' ? C.M.holz : wh, u - 0.2, u + 0.2, 0, 0.18, z + 1.75, z + 2.0); // the high cistern
    F.cyl(m, C.M.stahl, u, 0.1, z + 0.4, z + 1.75, 0.015, 0.015, 6);
    C.solid(F.rect(u - 0.2, u + 0.2, 0, 0.6), z, z + 0.45);
  };
  L.waschbecken = (C, F) => {
    const m = C.m,
      z = C.z,
      u = F.u0 + 0.3;
    F.box(m, C.col(0xf4f2ec, 0.2, 0.05), u - 0.27, u + 0.27, 0, 0.42, z + 0.72, z + 0.85);
    F.cyl(m, C.col(0xf4f2ec, 0.2, 0.05), u, 0.15, z, z + 0.72, 0.07, 0.09, 8);
    F.cyl(m, C.M.stahl, u, 0.05, z + 0.85, z + 1.0, 0.012, 0.012, 6);
    F.box(m, C.col(0x9ab0b8, 0.05, 0.8), u - 0.25, u + 0.25, 0, 0.02, z + 1.15, z + 1.6); // mirror
    const cont = C.container('schrank', 'Spiegelschrank öffnen', F.P(u, 0.6, z + 1.4));
    void cont;
    C.solid(F.rect(u - 0.27, u + 0.27, 0, 0.42), z, z + 0.9);
  };
  // the washing corner of a Waschküche: kettle, tub, washboard, a line with washing
  L.waschkessel = (C, F) => {
    const m = C.m,
      z = C.z,
      u = F.u0 + 0.4;
    F.box(m, C.col(0x8a5a40, 0.9), u - 0.38, u + 0.38, 0.02, 0.72, z, z + 0.75);
    F.cyl(m, C.col(0x9aa1a4, 0.4, 0.6), u, 0.37, z + 0.75, z + 0.8, 0.32, 0.32, 12);
    F.cyl(m, C.col(0x9a7a50, 0.8), u + 0.9, 0.4, z, z + 0.6, 0.32, 0.38, 12);
    C.spot('ofen', F.P(u, 1.0, z), F, 'Waschkessel anheizen');
    C.solid(F.rect(u - 0.4, u + 1.3, 0, 0.8), z, z + 0.8);
  };
  // the coat rack in the hall: a board with hooks, jackets, a shoe bench
  L.garderobe = (C, F) => {
    const m = C.m,
      z = C.z,
      u0 = F.u0;
    F.box(m, C.M.holz, u0, u0 + 1.0, 0, 0.03, z + 1.6, z + 1.72);
    for (let i = 0; i < 4; i++) {
      F.box(m, C.M.messing, u0 + 0.12 + i * 0.25, u0 + 0.14 + i * 0.25, 0.03, 0.09, z + 1.62, z + 1.64);
      if (C.R() < 0.75)
        F.box(
          m,
          C.col(C.R.pick([0x3a4a3a, 0x5a3a2a, 0x2a3a5a, 0x7a6a50]), 0.95),
          u0 + 0.03 + i * 0.25,
          u0 + 0.25 + i * 0.25,
          0.04,
          0.16,
          z + 0.85,
          z + 1.6
        );
    }
    F.box(m, C.M.holz, u0, u0 + 0.9, 0, 0.32, z + 0.42, z + 0.46);
    for (const pu of [u0 + 0.02, u0 + 0.84]) F.box(m, C.M.holz, pu, pu + 0.04, 0.02, 0.3, z, z + 0.42);
    for (let i = 0; i < 3; i++)
      F.box(
        m,
        C.col(C.R.pick([0x2a1a10, 0x3a2a1a, 0x1a1a1a]), 0.6),
        u0 + 0.1 + i * 0.26,
        u0 + 0.22 + i * 0.26,
        0.05,
        0.3,
        z,
        z + 0.1
      );
    C.solid(F.rect(u0, u0 + 1.0, 0, 0.32), z, z + 0.5);
  };
  // the smoke chamber beside the chimney in the attic (Räucherkammer): a plastered box with a sheet-metal door, sausages and a ham inside
  L.raeucherkammer = (C, F) => {
    const m = C.m,
      z = C.z,
      w = 0.9,
      d = 0.75,
      h = 1.85,
      wall = C.col(0xb8b0a0, 0.9);
    F.box(m, wall, 0, w, 0, 0.05, z, z + h);
    F.box(m, wall, 0, 0.05, 0.05, d, z, z + h);
    F.box(m, wall, w - 0.05, w, 0.05, d, z, z + h);
    F.box(m, wall, 0, w, 0, d, z + h, z + h + 0.05);
    F.box(m, C.col(0x1a1612, 0.9), 0.05, w - 0.05, 0.05, d - 0.03, z + 0.02, z + 0.03);
    for (let i = 0; i < 5; i++)
      F.cyl(
        m,
        C.col(i === 2 ? 0x7a3a22 : 0x5a2a1a, 0.6),
        0.18 + i * 0.13,
        0.35,
        z + h - 0.75,
        z + h - 0.12,
        i === 2 ? 0.08 : 0.035,
        i === 2 ? 0.06 : 0.035,
        7
      );
    F.rod(m, C.M.schwarz, [0.05, 0.35, z + h - 0.1], [w - 0.05, 0.35, z + h - 0.1], 0.012, 4);
    const cont = C.container('raeucherkammer', 'Räucherkammer öffnen', F.P(w / 2, d + 0.5, z + 1.1));
    L.leaf(C, F, 0.06, 1, w - 0.12, d, z + 0.15, z + h - 0.1, C.col(0x3a3a38, 0.5, 0.6), C.M.schwarz, cont);
    C.solid(F.rect(0, w, 0, d), z, z + h);
  };
  // a wooden box (Kiste) with a lid
  L.kiste = (C, F) => {
    const m = C.m,
      z = C.z,
      u0 = F.u0,
      w = 0.8,
      d = 0.55,
      wood = C.M.hell;
    for (let k = 0; k < 3; k++) F.box(m, wood, u0, u0 + w, 0, d, z + 0.02 + k * 0.15, z + 0.15 + k * 0.15);
    const cont = C.container('kiste', 'Kiste öffnen', F.P(u0 + w / 2, d + 0.35, z + 0.45));
    C.part({
      kind: 'lid',
      F,
      hinge: [u0, 0.0],
      z: z + 0.47,
      build: (mm, P) => P.box(mm, wood, 0, w, 0, d, 0, 0.03),
      container: cont,
    });
    C.solid(F.rect(u0, u0 + w, 0, d), z, z + 0.5);
  };
  // a crocheted doily (Häkeldeckchen) on a surface at z: a thin white disc with a scalloped edge
  L.deckchen = (C, x, y, z, r = 0.16) => {
    const m = C.m,
      w = C.col(0xf6f2e8, 0.95),
      n = 14;
    for (let k = 0; k < n; k++) {
      const a0 = (k / n) * Math.PI * 2,
        a1 = ((k + 1) / n) * Math.PI * 2,
        rr = k % 2 ? r : r * 0.88;
      m.tri(
        w,
        [x, y, z],
        [x + Math.cos(a0) * rr, y + Math.sin(a0) * rr, z],
        [x + Math.cos(a1) * rr, y + Math.sin(a1) * rr, z],
        [0, 0, 1]
      );
    }
  };
  // the washstand of an old bedroom (Waschtisch, kammer-7): marble top, a bowl and a jug, a towel
  L.waschtisch = (C, F) => {
    const m = C.m,
      z = C.z,
      u0 = F.u0,
      wood = C.M.holz;
    F.box(m, wood, u0, u0 + 0.8, 0, 0.45, z + 0.05, z + 0.76);
    F.box(m, C.col(0xe8e6e0, 0.25), u0 - 0.01, u0 + 0.81, 0, 0.46, z + 0.76, z + 0.8);
    F.lathe(
      m,
      C.M.porzellan,
      u0 + 0.3,
      0.23,
      [
        [0.05, z + 0.8],
        [0.15, z + 0.86],
        [0.17, z + 0.9],
        [0.0, z + 0.9],
      ],
      12,
      { caps: false }
    );
    F.lathe(
      m,
      C.M.porzellan,
      u0 + 0.62,
      0.22,
      [
        [0.05, z + 0.8],
        [0.08, z + 0.9],
        [0.06, z + 1.02],
        [0.045, z + 1.1],
      ],
      10
    );
    F.box(m, C.col(0xf2eee4, 0.9), u0 + 0.78, u0 + 0.82, 0.05, 0.4, z + 0.45, z + 0.74);
    const cont = C.container('schublade', 'Waschtisch durchsuchen', F.P(u0 + 0.4, 0.75, z + 0.6));
    L.drawer(C, F, u0 + 0.03, u0 + 0.77, 0.45, z + 0.56, z + 0.72, wood, C.M.messing, cont);
    C.solid(F.rect(u0, u0 + 0.8, 0, 0.46), z, z + 0.9);
  };
  // a bunk bed (DDR children's room, ddr-11): two berths, a ladder, checked bedding
  L.stockbett = (C, F) => {
    const m = C.m,
      z = C.z,
      u0 = F.u0,
      w = 0.95,
      wood = C.M.hell,
      bed = C.R.pick([C.M.karo, C.M.duvet, C.col(0xd8e8c8, 0.9)]);
    for (const pu of [u0, u0 + w - 0.06])
      for (const pv of [0, 1.94]) F.box(m, wood, pu, pu + 0.06, pv, pv + 0.06, z, z + 1.7);
    for (const zz of [0.3, 1.25]) {
      F.box(m, wood, u0, u0 + w, 0.0, 2.0, z + zz, z + zz + 0.06);
      F.box(m, C.col(0xe8e2d4, 0.9), u0 + 0.05, u0 + w - 0.05, 0.06, 1.94, z + zz + 0.06, z + zz + 0.2);
      F.box(m, bed, u0 + 0.06, u0 + w - 0.06, 0.5, 1.92, z + zz + 0.2, z + zz + 0.32);
    }
    F.box(m, wood, u0 + w - 0.03, u0 + w, 0.1, 1.9, z + 1.45, z + 1.55);
    for (let k = 1; k < 5; k++) F.box(m, wood, u0 + w, u0 + w + 0.03, 1.5, 1.85, z + k * 0.3, z + k * 0.3 + 0.03);
    C.spot('bett', F.P(u0 + w / 2, 1.1, z), F, 'Ins Bett legen', { lie: true, head: F.P(u0 + w / 2, 0.3, z + 0.45) });
    C.solid(F.rect(u0, u0 + w, 0, 2.0), z, z + 1.7);
  };
  // a rack with ladles and a whisk (Hakenleiste, stube-8)
  L.kellen = (C, F, u, z) => {
    const m = C.m,
      st = C.M.stahl;
    F.box(m, C.M.holz, u - 0.4, u + 0.4, 0, 0.03, z - 0.05, z + 0.05);
    for (let i = 0; i < 4; i++) {
      const x = u - 0.3 + i * 0.2;
      F.rod(m, st, [x, 0.04, z - 0.02], [x, 0.04, z - 0.45], 0.008, 4);
      if (i % 2)
        F.lathe(
          m,
          st,
          x,
          0.06,
          [
            [0.0, z - 0.55],
            [0.045, z - 0.52],
            [0.04, z - 0.47],
            [0.0, z - 0.45],
          ],
          8
        );
      else F.cyl(m, C.col(0x6a5a40, 0.6), x, 0.05, z - 0.62, z - 0.45, 0.03, 0.01, 6);
    }
  };
  // a picture frame on the wall: cell 0 stag, 1 Bible verse, 2 wall cloth, 3 landscape
  L.bild = (C, F, u, z, w, h, cell, frameCol = 0x5a3a22) => {
    const m = C.m;
    F.box(
      m,
      C.col(frameCol, 0.5),
      u - w / 2 - 0.035,
      u + w / 2 + 0.035,
      0,
      0.025,
      z - h / 2 - 0.035,
      z + h / 2 + 0.035
    );
    F.pic(m, C.M.bilder, u, 0.027, z, w, h, cell);
    onWall(C, F, u - w / 2 - 0.04, u + w / 2 + 0.04, z - h / 2 - 0.04, z + h / 2 + 0.04);
  };
  // a wall clock (pendulum) and a cuckoo clock (Kuckucksuhr)
  L.uhr = (C, F, u, z) => {
    const m = C.m;
    F.box(m, C.M.holz, u - 0.16, u + 0.16, 0, 0.12, z - 0.5, z + 0.25);
    F.cyl(m, C.col(0xf2ecdc, 0.5), u, 0.125, z, z + 0.001, 0.12, 0.12, 12);
    F.box(m, C.M.messing, u - 0.03, u + 0.03, 0.12, 0.13, z - 0.45, z - 0.15);
    onWall(C, F, u - 0.17, u + 0.17, z - 0.5, z + 0.25);
  };
  // a pendant lamp at the ceiling (the room's light; glow switched with the light)
  L.deckenlampe = (C, x, y, zc, kind) => {
    if (kind === 'fluter') {
      // a flat dish close to the ceiling
      C.m.cyl(C.col(0xd8d4cc, 0.4, 0.6), x, y, zc - 0.12, zc, 0.012, 0.012, 6);
      C.lamp([x, y, zc - 0.14], kind, 0.22);
      return;
    }
    C.m.cyl(C.col(0x2a2826, 0.6), x, y, zc - 0.45, zc, 0.006, 0.006, 4);
    C.lamp([x, y, zc - 0.55], kind || 'pendant', kind === 'kugel' ? 0.18 : kind === 'tuete' ? 0.14 : 0.24);
  };
  // ---- personal touches of the named villagers (dorf/dorf_text.js) ----
  // a radio (RFT in the DDR, an older valve set before): a box with a dial and two knobs; a spot 'radio'
  L.radio = (C, F, u, v, z) => {
    const m = C.m,
      old = C.look === 'alt';
    F.box(m, old ? C.M.holz : C.col(0x3a3430, 0.5), u - 0.22, u + 0.22, v, v + 0.2, z, z + (old ? 0.3 : 0.16));
    F.box(
      m,
      C.col(old ? 0xd8c8a0 : 0x1a1a1a, 0.4),
      u - 0.18,
      u + 0.05,
      v + 0.2,
      v + 0.205,
      z + 0.04,
      z + (old ? 0.24 : 0.12)
    );
    for (const k of [0.1, 0.17]) F.cyl(m, C.col(0xc8c0b0, 0.4), u + k, v + 0.21, z + 0.05, z + 0.08, 0.015, 0.015, 6);
    C.spot('radio', F.P(u, v + 0.9, z - 0.8), F, 'Radio einschalten');
  };
  // a cuckoo clock (Kuckucksuhr): a little house of dark wood with a gable, the dial, two pine-cone weights on chains
  L.kuckucksuhr = (C, F, u, z) => {
    const m = C.m,
      dk = C.col(0x3a2414, 0.6);
    F.box(m, dk, u - 0.15, u + 0.15, 0, 0.13, z - 0.2, z + 0.15);
    F.box(m, dk, u - 0.19, u + 0.19, 0, 0.16, z + 0.15, z + 0.19);
    F.cyl(m, C.col(0xf2ecdc, 0.5), u, 0.135, z - 0.08, z - 0.079, 0.07, 0.07, 10);
    for (const k of [-0.06, 0.06]) {
      F.box(m, C.M.messing, u + k - 0.003, u + k + 0.003, 0.05, 0.056, z - 0.75, z - 0.2);
      F.cyl(m, dk, u + k, 0.055, z - 0.95, z - 0.75, 0.03, 0.03, 6);
    }
    onWall(C, F, u - 0.2, u + 0.2, z - 0.95, z + 0.19);
  };
  // a desk (Schreibtisch) with a drawer and a chair; folders on it at Ingrid's
  L.schreibtisch = (C, F, folders) => {
    const m = C.m,
      z = C.z,
      u0 = F.u0,
      w = 1.2,
      wood = C.look === 'ddr' ? C.M.birke : C.M.holz;
    F.box(m, wood, u0, u0 + w, 0, 0.65, z + 0.72, z + 0.76);
    F.box(m, wood, u0, u0 + 0.45, 0.02, 0.63, z, z + 0.72);
    F.box(m, wood, u0 + w - 0.04, u0 + w, 0.02, 0.63, z, z + 0.72);
    const cont = C.container('schublade', 'Schreibtisch durchsuchen', F.P(u0 + 0.22, 0.95, z + 0.6));
    L.drawer(C, F, u0 + 0.02, u0 + 0.43, 0.63, z + 0.5, z + 0.7, wood, C.M.messing, cont);
    L.chair(C, F, u0 + w * 0.6, 0.95, -Math.PI / 2, wood);
    if (folders)
      for (let i = 0; i < 6; i++)
        F.box(
          m,
          C.col([0x2a4a8a, 0x8a2a2a, 0x2a6a3a, 0xc8a030][i % 4], 0.6),
          u0 + 0.5 + i * 0.09,
          u0 + 0.57 + i * 0.09,
          0.05,
          0.33,
          z + 0.76,
          z + 1.08
        );
    C.solid(F.rect(u0, u0 + w, 0, 0.65), z, z + 0.76);
  };
  // a gun cabinet (Waffenschrank, steel, locked by law – here it opens): the game decides what is inside
  L.waffenschrank = (C, F) => {
    const m = C.m,
      z = C.z,
      u0 = F.u0,
      grey = C.col(0x4a5048, 0.5, 0.5);
    F.box(m, grey, u0, u0 + 0.55, 0, 0.42, z, z + 1.6);
    const cont = C.container('waffenschrank', 'Waffenschrank öffnen', F.P(u0 + 0.27, 0.75, z + 1.1));
    L.leaf(C, F, u0 + 0.02, 1, 0.51, 0.42, z + 0.03, z + 1.57, grey, C.M.schwarz, cont);
    C.solid(F.rect(u0, u0 + 0.55, 0, 0.42), z, z + 1.6);
  };
  // a first-aid box on the wall (Verbandskasten: white with a red cross, stube-9 DRK)
  L.verbandskasten = (C, F, u, z) => {
    const m = C.m;
    F.box(m, C.col(0xf2f2ee, 0.4), u - 0.18, u + 0.18, 0, 0.12, z - 0.12, z + 0.12);
    F.box(m, C.col(0xc81e1e, 0.5), u - 0.08, u + 0.08, 0.12, 0.125, z - 0.025, z + 0.025);
    F.box(m, C.col(0xc81e1e, 0.5), u - 0.025, u + 0.025, 0.12, 0.125, z - 0.08, z + 0.08);
    C.container('verbandskasten', 'Verbandskasten öffnen', F.P(u, 0.6, z));
  };
  // a chainsaw and an axe lying ready (Wolfgang, the forest worker): spots the game can turn into weapons
  L.motorsaege = (C, F, u, v) => {
    const m = C.m,
      z = C.z,
      or = C.col(0xe0641e, 0.5),
      bl = C.col(0x2a2a28, 0.5, 0.3);
    F.box(m, or, u - 0.18, u + 0.18, v, v + 0.24, z, z + 0.24);
    F.box(m, bl, u + 0.18, u + 0.62, v + 0.1, v + 0.13, z + 0.06, z + 0.16);
    F.rod(m, bl, [u - 0.05, v + 0.02, z + 0.24], [u - 0.05, v + 0.22, z + 0.3], 0.015, 5);
    C.spot('motorsaege', F.P(u, v + 0.7, z), F, 'Motorsäge nehmen');
  };
  L.axt = (C, F, u, v) => {
    const m = C.m,
      z = C.z;
    F.rod(m, C.M.hell, [u, v, z + 0.02], [u + 0.75, v + 0.05, z + 0.02], 0.02, 5);
    F.box(m, C.col(0x5a5c60, 0.4, 0.7), u + 0.68, u + 0.8, v - 0.02, v + 0.12, z, z + 0.04);
    C.spot('axt', F.P(u + 0.4, v + 0.6, z), F, 'Axt nehmen');
  };
  // ---- personal touches of the named villagers (dorf/dorf_text.js), in whichever room they belong to ----
  const PERSONAL = {
    gerhard: (C, Pl, room) => {
      if (room.kind !== 'stube') return;
      // the chronicle and the Skat evening: a pack of cards and the score pad on the table, books
      const t = C.find('tisch');
      if (t) {
        C.m.box(C.col(0x2a3a8a, 0.6), t[0] - 0.05, t[0] + 0.03, t[1] - 0.05, t[1] + 0.07, C.z + 0.77, C.z + 0.8);
        C.m.box(C.col(0xf4f0e0, 0.9), t[0] + 0.12, t[0] + 0.3, t[1] - 0.1, t[1] + 0.12, C.z + 0.77, C.z + 0.775);
        C.m.box(C.col(0x6a2a1a, 0.6), t[0] - 0.35, t[0] - 0.12, t[1] - 0.1, t[1] + 0.2, C.z + 0.77, C.z + 0.82);
      }
      const F = Pl.any(['x0', 'x1', 'y1', 'y0'], 1.2, 0.35, 2.0, 0.5);
      if (F) {
        for (const pu of [F.u0, F.u0 + 1.16]) F.box(C.m, C.M.holz, pu, pu + 0.04, 0, 0.32, C.z, C.z + 2.0);
        for (const zz of [0.05, 0.45, 0.85, 1.25, 1.65]) {
          F.box(C.m, C.M.holz, F.u0, F.u0 + 1.2, 0, 0.32, C.z + zz - 0.02, C.z + zz);
          L.books(C, F, F.u0 + 0.05, F.u0 + 1.15, 0.04, C.z + zz, 0.33);
        }
        C.container('regal', 'Bücherregal durchsuchen', F.P(F.u0 + 0.6, 0.7, C.z + 1.0));
        C.solid(F.rect(F.u0, F.u0 + 1.2, 0, 0.32), C.z, C.z + 2.0);
      }
    },
    manfred: (C, Pl, room) => {
      if (room.kind === 'flur') {
        // the fire helmet on the coat rack, an extinguisher by the door
        const F = Pl.any(['x0', 'x1'], 0.3, 0.3, 1.0, 0.1);
        if (F) {
          F.lathe(
            C.m,
            C.col(0xe8e4d8, 0.3, 0.1),
            F.u0 + 0.15,
            0.15,
            [
              [0.16, C.z + 0.6],
              [0.16, C.z + 0.7],
              [0.13, C.z + 0.82],
              [0.02, C.z + 0.88],
            ],
            10
          );
          F.box(C.m, C.col(0x5a5a5a, 0.6), F.u0 + 0.02, F.u0 + 0.28, 0.02, 0.28, C.z, C.z + 0.6);
          F.cyl(C.m, C.col(0xc81e1e, 0.4, 0.2), F.u0 + 0.15, 0.4, C.z, C.z + 0.55, 0.08, 0.08, 10);
        }
      }
    },
    wolfgang: (C, Pl, room) => {
      // the chainsaw and the axe: in the hall, else in the cellar, the Stube or a Kammer (whichever room has a free wall first)
      if (!C.found.saege && ['flur', 'keller', 'stube', 'kammer'].includes(room.kind)) {
        const F = Pl.any(['y1', 'x0', 'x1', 'y0'], 0.9, 0.6, 0.4, 0.5);
        if (F) {
          L.motorsaege(C, F, F.u0 + 0.25, 0.05);
          L.axt(C, F, F.u0, 0.45);
          C.found.saege = true;
        }
      }
      if (room.kind === 'stube' || room.kind === 'kammer' || room.kind === 'schlafzimmer') {
        if (!C.found.waffenschrank) {
          const F = Pl.any(['x0', 'x1', 'y1', 'y0'], 0.55, 0.42, 1.6, 0.9);
          if (F) {
            L.waffenschrank(C, F);
            C.found.waffenschrank = true;
          }
        }
        if (room.kind === 'stube') {
          // antler boards on the wall (jaeger-3)
          const W = Pl.S.y1;
          for (let i = 0; i < 3; i++) {
            const Fw = frame(W.O, W.a, W.n),
              u = W.L * (0.3 + i * 0.2),
              z = C.z + 1.9 + (i % 2) * 0.15;
            Fw.box(C.m, C.col(0x4a2a14, 0.5), u - 0.1, u + 0.1, 0, 0.025, z - 0.12, z + 0.12);
            for (const sx of [-1, 1])
              Fw.rod(C.m, C.col(0xd8cbb0, 0.6), [u, 0.03, z + 0.05], [u + sx * 0.14, 0.08, z + 0.28], 0.012, 4);
          }
        }
      }
    },
    uwe: (C, Pl, room) => {
      if (room.kind === 'flur') {
        const F = Pl.any(['x0', 'x1', 'y1'], 0.35, 0.3, 0.45, 0.05);
        if (F)
          for (const k of [0, 0.17])
            F.box(C.m, C.col(0x2a4a2a, 0.5), F.u0 + k, F.u0 + k + 0.13, 0.02, 0.3, C.z, C.z + 0.42);
      }
      if (room.kind === 'kueche') {
        const F = Pl.any(['x0', 'x1', 'y1', 'y0'], 0.4, 0.3, 0.3, 0.9);
        if (F) {
          F.box(C.m, C.col(0x2a6a3a, 0.6), F.u0, F.u0 + 0.4, 0, 0.3, C.z, C.z + 0.28);
          for (let i = 0; i < 4; i++)
            for (let j = 0; j < 3; j++)
              F.cyl(
                C.m,
                C.col(0x5a3a1a, 0.15),
                F.u0 + 0.06 + i * 0.095,
                0.05 + j * 0.1,
                C.z + 0.28,
                C.z + 0.38,
                0.028,
                0.028,
                6
              );
        }
      }
    },
    katrin: (C, Pl, room) => {
      if (room.kind === 'bad' || (room.kind === 'flur' && room.fl === 0)) {
        if (C.found.verband) return;
        const W = Pl.S[room.kind === 'bad' ? 'y1' : 'x0'];
        if (W) {
          L.verbandskasten(C, frame(W.O, W.a, W.n), W.L * 0.5, C.z + 1.5);
          C.found.verband = true;
        }
      }
    },
    ingrid: (C, Pl, room) => {
      if (room.kind === 'kammer' || room.kind === 'kinderzimmer') {
        if (C.found.desk) return;
        const F = Pl.any(['y0', 'x0', 'x1', 'y1'], 1.2, 1.0, 0.8, 0.5);
        if (F) {
          L.schreibtisch(C, F, true);
          C.found.desk = true;
        }
      }
    },
    jens: (C, Pl, room) => {
      if (room.kind === 'flur' || room.kind === 'keller') {
        if (C.found.toolbox) return;
        const F = Pl.any(['y1', 'x0', 'x1'], 0.55, 0.3, 0.3, 0.6);
        if (F) {
          F.box(C.m, C.col(0xb82a1e, 0.4, 0.3), F.u0, F.u0 + 0.55, 0, 0.26, C.z, C.z + 0.24);
          F.rod(C.m, C.M.schwarz, [F.u0 + 0.15, 0.13, C.z + 0.3], [F.u0 + 0.4, 0.13, C.z + 0.3], 0.012, 4);
          C.container('werkzeugkiste', 'Werkzeugkiste öffnen', F.P(F.u0 + 0.27, 0.6, C.z + 0.25));
          C.found.toolbox = true;
        }
      }
    },
    heike: (C, Pl, room) => {
      if (room.kind === 'kueche') {
        const t = C.find('tisch');
        if (t)
          for (let i = 0; i < 2; i++)
            C.m.box(
              C.col(0xb8a888, 0.9),
              t[0] - 0.3 + i * 0.32,
              t[0] - 0.02 + i * 0.32,
              t[1] - 0.06,
              t[1] + 0.06,
              C.z + 0.77,
              C.z + 0.84
            );
      }
      if (room.kind === 'keller' || room.kind === 'vorrat') {
        const F = Pl.any(['x0', 'x1', 'y0', 'y1'], 1.2, 0.4, 1.9, 0.5);
        if (F) L.regal(C, F, 1.2, 'Noch ein Regal mit Eingemachtem');
      }
    },
  };
  // ---- a room: what stands where, after its kind and the house's look ----
  function furnish(C, room) {
    const Pl = placer(room, room.blocks),
      look = C.look,
      R = C.R,
      M = C.M;
    C.room = room;
    C.z = room.z0;
    const cx = (room.x0 + room.x1) / 2,
      cy = (room.y0 + room.y1) / 2,
      zc = room.z1;
    const kind = room.kind;
    // the ceiling lamp of every room but the hall's own (it has one too) – the light switch is by the door
    // by the era: a glass bowl or a fabric shade (alt), the cone or the globe (DDR), a flat ceiling dish (later)
    if (!(C.ext && C.ext.ceiling && C.ext.ceiling(C, room, cx, cy, zc)))
      // (feat/haeuser: a look may hang its own lamps)
      L.deckenlampe(
        C,
        cx,
        cy,
        zc,
        kind === 'keller' || kind === 'vorrat' || kind === 'boden' || kind === 'waschkueche'
          ? 'bulb'
          : look === 'alt'
            ? R.pick(['schale', 'pendant'])
            : look === 'ddr'
              ? R.pick(['kugel', 'tuete', 'pendant'])
              : R.pick(['fluter', 'pendant'])
      );
    C.tops = [];
    C.wallItems = [];
    const outer = ['y0', 'x1', 'y1', 'x0'].filter(s => room.outer && room.outer[s]);
    const inner = ['y0', 'x1', 'y1', 'x0'].filter(s => !(room.outer && room.outer[s]));
    const all = ['y1', 'x0', 'x1', 'y0'];
    let F;
    if (C.ext && C.ext.furnish && C.ext.furnish(C, room, Pl, inner, outer, all)) {
      // feat/haeuser: furnished by the look (haeuser/haeuser_heute.js)
    } else if (kind === 'stube' || kind === 'wohnzimmer') {
      // the stove at the wall to the kitchen (it is fed from there), near the hall
      const sw = room.stoveSide || inner[0] || 'y1';
      F =
        look === 'ddr' && R.chance(0.5)
          ? Pl.place(sw, 0.6, 0.55, 1.8, room.stovePref ?? 0.85)
          : Pl.place(sw, 1.45, 1.1, 1.9, room.stovePref ?? 0.85);
      if (F) {
        if (F.w < 1) L.kohleofen(C, F);
        else {
          F.u0 += 0.45;
          L.kachelofen(C, F);
        }
      }
      if (look === 'alt') {
        // the corner bench in the window corner (two window walls meet at the street corner)
        // the corner bench only in a corner: at the start or the end of a window wall
        for (const ws of outer.length ? outer : ['y0']) {
          const L0 = Pl.S[ws].L,
            wB = Math.min(2.3, L0 - 0.1);
          let Fb = Pl.at(ws, 0.02, wB, 2.3, 0.6),
            end = false;
          if (!Fb && L0 > wB + 0.1) {
            Fb = Pl.at(ws, L0 - wB - 0.02, wB, 2.3, 0.6);
            end = true;
          }
          if (Fb) {
            Fb.u0 = end ? L0 - wB - 0.02 : 0.02;
            Fb.w = wB;
            Pl.used.push(Fb.rect(Fb.u0, Fb.u0 + wB, 0, 2.3));
            L.eckbank(C, Fb, room, 2.0, end);
            break;
          }
        }
        F = Pl.any(inner.concat(outer), 1.3, 0.56, 2.05, 0.5);
        if (F) {
          L.buefett(C, F, 'Vertiko durchsuchen');
          L.radio(C, F, F.u0 + 0.4, 0.06, C.z + 0.9);
        }
        F = Pl.any(all, 0.9, 0.5, 0.6, 0.5);
        if (F) L.truhe(C, F);
        const W = Pl.S[inner[0] || 'y1'];
        if (W) {
          const Fp = frame(W.O, W.a, W.n);
          L.bild(C, Fp, W.L * 0.35, C.z + 1.75, 0.6, 0.45, 0, 0x6a4a2a);
          if (C.R.chance(0.5)) L.uhr(C, Fp, W.L * 0.7, C.z + 1.85);
          else L.kuckucksuhr(C, Fp, W.L * 0.7, C.z + 1.85);
        }
      } else {
        // the wall unit on the longest free wall: inner walls first, as wide as it goes (3.6 m in the DDR, 2.4 m later)
        let ws = inner[0] || 'x1';
        F = null;
        const widths = look === 'ddr' ? [3.6, 3.0, 2.4, 1.8] : [2.4, 1.8];
        for (const wdt of widths) {
          for (const sd of inner.concat(outer).sort((p, q) => Pl.S[q].L - Pl.S[p].L)) {
            if (F || Pl.S[sd].L < wdt + 0.2) continue;
            F = Pl.place(sd, wdt, 0.5, 2.4, 0.5);
            if (F) ws = sd;
          }
          if (F) break;
        }
        if (F) L.schrankwand(C, F, F.w);
        // the couch faces the wall unit (its TV) from the opposite wall if it can, else from a window wall
        const opp = { y0: 'y1', y1: 'y0', x0: 'x1', x1: 'x0' }[ws],
          cands = [opp].concat(
            outer.filter(s => s !== ws && s !== opp),
            inner.filter(s => s !== ws && s !== opp)
          );
        F = null;
        let cs = null;
        // the whole suite (3.9 m with both armchairs) where it fits, else with one armchair, else the couch and its table
        let arms = 2;
        for (const [wd, na] of [
          [3.9, 2],
          [2.95, 1],
          [2.0, 0],
        ])
          for (const c of cands)
            if (!F && Pl.S[c] && Pl.S[c].L >= wd + 0.1) {
              F = Pl.place(c, wd, 2.2, 0.8, 0.5);
              if (F) {
                cs = c;
                arms = na;
              }
            }
        if (F) L.sitzgruppe(C, F, room, arms);
        F = Pl.any(all, 0.4, 0.4, 1.7, 0.95);
        if (F) L.stehlampe(C, F, F.u0 + 0.2, 0.2);
        const W = Pl.S[outer.find(s => s !== cs) || inner[1] || 'y1'];
        if (W) L.bild(C, frame(W.O, W.a, W.n), W.L * 0.5, C.z + 1.7, 0.7, 0.5, look === 'ddr' ? 3 : 0, 0xb08d57);
      }
    } else if (kind === 'kueche') {
      const sw = room.stoveSide || inner[0] || 'y0';
      F = Pl.place(sw, look === 'alt' ? 1.0 : 0.62, 0.62, 0.9, room.stovePref ?? 0.85);
      if (F) L.herd(C, F);
      const Fh = F;
      if (look === 'alt') {
        F = Pl.any(inner.concat(outer), 1.3, 0.56, 2.05, 0.3);
        if (F) L.buefett(C, F);
        F = Pl.any(outer.concat(inner), 1.0, 0.55, 0.85, 0.5);
        if (F) {
          // the sink stone with a bucket
          F.box(C.m, C.col(0x8a8478, 0.9), F.u0, F.u0 + 1.0, 0, 0.55, C.z + 0.75, C.z + 0.85);
          F.box(C.m, C.col(0x6a6458, 0.9), F.u0 + 0.05, F.u0 + 0.95, 0.05, 0.5, C.z, C.z + 0.75);
          F.cyl(C.m, M.zink, F.u0 + 0.5, 0.3, C.z, C.z + 0.3, 0.14, 0.16, 10);
          C.spot('spuele', F.P(F.u0 + 0.5, 0.95, C.z), F, null);
          C.solid(F.rect(F.u0, F.u0 + 1.0, 0, 0.55), C.z, C.z + 0.85);
        }
      } else {
        F = Pl.any(inner.concat(outer), 2.4, 0.62, 2.2, 0.2) || Pl.any(all, 1.8, 0.62, 2.2, 0.2);
        if (F) L.kuechenzeile(C, F, Math.round(F.w / 0.6));
        F = Pl.any(all, 0.58, 0.62, 1.5, 0.95);
        if (F) L.kuehlschrank(C, F);
      }
      // the table with a chair on each long side (the room's middle or aside, off the ways between the doors)
      const rc = Pl.mid(1.1, 1.85),
        r = rc && [rc[0], rc[1], rc[2] + 0.55, rc[3] - 0.55];
      if (r) {
        const T = frame([r[0], r[2]], [1, 0], [0, 1]);
        L.table(
          C,
          T,
          0,
          r[1] - r[0],
          0,
          r[3] - r[2],
          look === 'alt' ? M.holz : M.hell,
          look === 'ddr' ? M.tischdecke : M.karo
        );
        L.chair(C, T, 0.3, -0.35, Math.PI / 2, look === 'alt' ? M.holz : M.hell);
        L.chair(C, T, r[1] - r[0] - 0.3, r[3] - r[2] + 0.35, -Math.PI / 2, look === 'alt' ? M.holz : M.hell);
        // the place at the table: on the far chair, facing the table (−n)
        C.spot('tisch', [r[1] - 0.3, r[3] + 0.35, C.z], { n: [0, 1] }, null);
        C.solidW(r, C.z, C.z + 0.76);
      }
      // the embroidered wall cloth (Wandschoner) behind the range, beside its pipe – else on an inner wall
      const W = Pl.S[inner[1] || inner[0] || 'y1'],
        uh = Fh ? Fh.u0 + (look === 'alt' ? 0.6 : 0.31) : 0;
      if (look !== 'nachwende') {
        if (Fh && Pl.wallFree(Fh.side, uh - 0.3, uh + 0.3, C.z + 1.1, C.z + 1.6))
          L.bild(C, Fh, uh, C.z + 1.36, 0.55, 0.42, 2, 0xf0ece0);
        else if (W) L.bild(C, frame(W.O, W.a, W.n), W.L * 0.5, C.z + 1.6, 0.55, 0.42, 2, 0xf0ece0);
      }
      // the rack with ladles over the range or on a free wall (stube-8)
      if (look !== 'nachwende')
        for (const sd of inner.concat(outer)) {
          const Wk = Pl.S[sd],
            uk = [0.25, 0.5, 0.75]
              .map(f => Wk.L * f)
              .find(u => Pl.wallFree(sd, u - 0.45, u + 0.45, C.z + 0.9, C.z + 1.65));
          if (uk !== undefined) {
            L.kellen(C, frame(Wk.O, Wk.a, Wk.n), uk, C.z + 1.55);
            break;
          }
        }
    } else if (kind === 'kammer' || kind === 'schlafzimmer' || kind === 'kinderzimmer') {
      const dbl = kind === 'schlafzimmer' && room.x1 - room.x0 > 3.2 && room.y1 - room.y0 > 3.2,
        bunk = kind === 'kinderzimmer' && look !== 'alt' && R.chance(0.7);
      F = bunk
        ? Pl.any(inner.concat(outer), 1.0, 2.0, 1.75, 0.2)
        : Pl.any(inner.concat(outer), dbl ? 1.9 : 1.0, 2.0, 1.1, 0.5);
      if (F && bunk) L.stockbett(C, F);
      else if (F) {
        // the DDR bed bridge: a shelf unit over the head end with a light (ddr-12)
        if (look === 'ddr' && dbl) {
          F.box(C.m, M.birke, F.u0 - 0.05, F.u0 + F.w + 0.05, 0, 0.32, C.z + 1.35, C.z + 1.65);
          for (const pu of [F.u0 - 0.05, F.u0 + F.w]) F.box(C.m, M.birke, pu, pu + 0.05, 0, 0.32, C.z, C.z + 1.35);
          L.deckchen(C, ...F.P(F.u0 + F.w / 2, 0.16, 0).slice(0, 2), C.z + 1.651, 0.14);
        }
        L.bett(C, F, F.w);
        const N = Pl.at(F.side, F.u0 + F.w + 0.05, 0.45, 0.4, 0.7);
        if (N) {
          N.u0 = F.u0 + F.w + 0.05;
          L.nachttisch(C, N);
        }
        const W = Pl.S[F.side];
        if (look === 'alt') L.bild(C, frame(W.O, W.a, W.n), F.u0 + F.w / 2, C.z + 1.55, 0.6, 0.42, 1, 0x3a2a1a);
      }
      F = Pl.any(inner.concat(outer), 1.3, 0.6, 2.05, 0.5);
      if (F) L.kleiderschrank(C, F, F.w);
      if (look === 'alt' && kind !== 'kinderzimmer') {
        F = Pl.any(outer.concat(inner), 0.82, 0.46, 0.9, 0.5);
        if (F) L.waschtisch(C, F);
      }
      if (kind === 'kinderzimmer') {
        F = Pl.any(outer.concat(inner), 1.2, 1.0, 0.8, 0.5);
        if (F) L.schreibtisch(C, F, false);
      }
      if (kind === 'kammer' && R.chance(0.6)) {
        F = Pl.any(all, 1.0, 0.5, 0.6, 0.5);
        if (F) L.truhe(C, F);
      }
    } else if (kind === 'bad') {
      F = Pl.any(outer.concat(inner), 1.7, 0.75, 0.6, 0.0);
      if (F) L.wanne(C, F);
      F = Pl.any(inner.concat(outer), 0.5, 0.45, 2.4, 0.9);
      if (F) L.badeofen(C, F);
      F = Pl.any(all, 0.5, 0.62, 0.5, 0.2);
      if (F) L.wc(C, F);
      F = Pl.any(all, 0.6, 0.45, 1.6, 0.6);
      if (F) L.waschbecken(C, F);
    } else if (kind === 'vorrat' || kind === 'keller') {
      F = Pl.any(all, Math.min(2.0, Math.max(Pl.S.y1.L, Pl.S.x0.L) - 0.3), 0.4, 1.9, 0.0);
      if (F) L.regal(C, F, F.w, 'Regal mit Eingemachtem durchsuchen');
      F = Pl.any(all, 1.2, 0.9, 0.6, 1.0);
      if (F) L.kartoffeln(C, F);
      if (kind === 'keller') {
        F = Pl.any(all, 1.4, 0.96, 0.7, 0.5);
        if (F) L.kohlen(C, F);
        F = Pl.any(all, 1.6, 0.7, 1.7, 0.5);
        if (F) L.werkbank(C, F);
      }
    } else if (kind === 'waschkueche') {
      F = Pl.any(all, 1.4, 0.8, 0.8, 0.2);
      if (F) L.waschkessel(C, F);
      F = Pl.any(all, 1.0, 0.4, 1.9, 0.8);
      if (F) L.regal(C, F, F.w, 'Regal durchsuchen');
    } else if (kind === 'flur') {
      F = Pl.any(['x0', 'x1'], 1.0, 0.32, 1.75, 0.15);
      if (F) {
        L.garderobe(C, F);
        // a mirror beside the coat rack, where the wall is free
        if (Pl.at(F.side, F.u0 + 1.05, 0.5, 0.04, 1.9)) {
          F.box(C.m, C.col(0x6a4a30, 0.5), F.u0 + 1.05, F.u0 + 1.55, 0, 0.03, C.z + 1.2, C.z + 1.85);
          F.box(C.m, C.col(0xa8b8c0, 0.05, 0.9), F.u0 + 1.09, F.u0 + 1.51, 0.03, 0.035, C.z + 1.24, C.z + 1.81);
        }
      }
      F = Pl.any(['x1', 'x0', 'y1'], 1.0, 0.5, 0.6, 0.8);
      if (F) L.truhe(C, F, 'Truhe im Flur öffnen');
      // a runner rug along the hall
      C.m.box(
        M.rag,
        cx - 0.45,
        cx + 0.45,
        room.y0 + 0.5,
        Math.min(room.y1 - 0.3, room.y0 + 3.0),
        C.z + 0.002,
        C.z + 0.01
      );
    } else if (kind === 'boden') {
      // the attic (boden-1/2/8/12): low things along the knee walls, the smoke chamber at the chimney, a line with washing
      const low = all,
        tall = outer.length ? outer : all;
      if (room.chim && !(C.P.astair && C.P.astair.chimClash)) {
        const ch = room.chim,
          Fr = frame([ch[0] + 0.26, ch[1] - 0.45], [0, 1], [1, 0]);
        Fr.u0 = 0;
        L.raeucherkammer(C, Fr);
      }
      F = Pl.any(low, 1.0, 0.5, 0.6, 0.3);
      if (F) L.truhe(C, F, 'Alte Truhe öffnen');
      F = Pl.any(low, 0.8, 0.6, 0.5, 0.7);
      if (F) L.kiste(C, F);
      F = Pl.any(tall, 1.3, 0.6, 2.05, 0.5);
      if (F && C.R.chance(0.6)) L.kleiderschrank(C, F, F.w);
      F = Pl.any(low, 0.5, 0.5, 0.95, 0.5);
      if (F) L.chair(C, F, F.u0 + 0.25, 0.3, Math.PI / 2 + C.R.r(-0.5, 0.5), C.M.holz);
      // the washing line along the middle
      const lx = room.x1 - room.x0 > room.y1 - room.y0;
      const a = lx ? [room.x0 + 0.4, cy + 0.6] : [cx + 0.6, room.y0 + 0.4],
        b = lx ? [room.x1 - 0.4, cy + 0.6] : [cx + 0.6, room.y1 - 0.4],
        zl = Math.min(C.z + 1.85, zc - 0.3);
      C.m.rod(C.col(0xd8d0c0, 0.9), [a[0], a[1], zl], [b[0], b[1], zl], 0.006, 4);
      const nW = Math.floor(Math.hypot(b[0] - a[0], b[1] - a[1]) / 0.7);
      for (let i = 1; i < nW; i++) {
        if (C.R() < 0.35) continue;
        const t = i / nW,
          p = [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t],
          w = C.R.r(0.35, 0.6),
          h = C.R.r(0.4, 0.8),
          d = lx ? [1, 0] : [0, 1],
          cloth = C.R.pick([M.karo, C.col(0xf4f2ec, 0.95), C.col(0x8aa0c8, 0.95), M.duvet]);
        C.m.panel(cloth, [p[0], p[1], zl - h / 2], d, lx ? [0, 1, 0] : [1, 0, 0], w, h);
        C.m.panel(cloth, [p[0], p[1], zl - h / 2], d, lx ? [0, -1, 0] : [-1, 0, 0], w, h);
      }
    }
    if (C.owner && PERSONAL[C.owner]) PERSONAL[C.owner](C, Pl, room);
    if (!(C.ext && C.ext.deko && C.ext.deko(C, Pl, room, inner, outer))) deko(C, Pl, room, inner, outer); // feat/haeuser
  }
  // ---- the small things (the lead's review 5.11.2026: rooms looked large and bare): all palette colours or the room's own
  // materials, merged into the room's meshes – no draw call of their own ----
  const DK = {};
  // a collector's cup on its saucer (Sammeltasse): white or coloured with a gold rim
  DK.tasse = (C, F, u, v, z) => {
    const m = C.m,
      c = C.col(C.R.pick([0xf4efe4, 0xf0e4e8, 0xe4ecf4, 0xf4ecd8]), 0.25),
      gold = C.col(0xc8a050, 0.3, 1.0);
    F.cyl(m, c, u, v, z, z + 0.008, 0.07, 0.07, 10);
    F.cyl(m, c, u, v, z + 0.008, z + 0.065, 0.03, 0.042, 10);
    F.cyl(m, gold, u, v, z + 0.065, z + 0.071, 0.043, 0.043, 10);
    return 0.16;
  };
  // a vase with flowers (or dried ones in the DDR)
  DK.vase = (C, F, u, v, z) => {
    const m = C.m,
      c = C.col(C.R.pick([0x3a5a7a, 0xc8b89a, 0x7a2a22, 0x2a6a5a, 0xe8e0d0]), 0.3, 0.1);
    F.lathe(
      m,
      c,
      u,
      v,
      [
        [0.04, z],
        [0.06, z + 0.06],
        [0.045, z + 0.17],
        [0.03, z + 0.22],
        [0.035, z + 0.24],
      ],
      9,
      { caps: false }
    );
    const fl = [0xc8352b, 0xe8c840, 0xf4f0f0, 0xb04a8a];
    for (let k = 0; k < 3; k++) {
      const a = k * 2.1 + C.R.r(0, 0.5),
        du = Math.cos(a) * 0.07,
        dv = Math.sin(a) * 0.07;
      F.rod(m, C.col(0x4f7d3a, 0.8), [u, v, z + 0.2], [u + du, v + dv, z + 0.38], 0.005, 4);
      F.cyl(m, C.col(C.R.pick(fl), 0.7), u + du, v + dv, z + 0.37, z + 0.41, 0.025, 0.03, 6);
    }
    return 0.18;
  };
  // a candlestick of brass with a white candle
  DK.leuchter = (C, F, u, v, z) => {
    const m = C.m;
    F.cyl(m, C.M.messing, u, v, z, z + 0.015, 0.05, 0.05, 8);
    F.cyl(m, C.M.messing, u, v, z + 0.015, z + 0.16, 0.012, 0.018, 6);
    F.cyl(m, C.M.messing, u, v, z + 0.16, z + 0.18, 0.03, 0.025, 8);
    F.cyl(m, C.col(0xf4f0e0, 0.6), u, v, z + 0.18, z + 0.36, 0.011, 0.011, 6);
    return 0.12;
  };
  // a framed photograph standing on its foot (sepia or a colour snapshot)
  DK.foto = (C, F, u, v, z) => {
    const m = C.m,
      fr = C.col(C.R.pick([0x5a3a22, 0xc8a050, 0x2a2a2a]), 0.4, 0.3);
    F.box(m, fr, u - 0.08, u + 0.08, v - 0.012, v + 0.012, z, z + 0.21);
    F.box(
      m,
      C.col(C.R.pick([0xa08060, 0x8a9aa0, 0xb89a70]), 0.6),
      u - 0.06,
      u + 0.06,
      v + 0.012,
      v + 0.015,
      z + 0.02,
      z + 0.19
    );
    F.box(m, fr, u - 0.01, u + 0.01, v - 0.08, v - 0.012, z, z + 0.12);
    return 0.2;
  };
  // a fruit bowl with apples
  DK.schale = (C, F, u, v, z) => {
    const m = C.m;
    F.lathe(
      m,
      C.col(C.R.pick([0xe8e0d0, 0x8a5a3a, 0x3a5a3a]), 0.35),
      u,
      v,
      [
        [0.05, z],
        [0.12, z + 0.05],
        [0.13, z + 0.07],
      ],
      12,
      { caps: true }
    );
    for (let k = 0; k < 4; k++) {
      const a = k * 1.6,
        pu = u + Math.cos(a) * 0.05,
        pv = v + Math.sin(a) * 0.05;
      F.lathe(
        m,
        C.col(C.R.pick([0xb8302a, 0x8ab040, 0xd8a030]), 0.5),
        pu,
        pv,
        [
          [0.01, z + 0.04],
          [0.035, z + 0.06],
          [0.035, z + 0.09],
          [0.01, z + 0.11],
        ],
        7,
        { caps: true }
      );
    }
    return 0.3;
  };
  // a newspaper or the TV guide (Fernsehzeitung), folded
  DK.zeitung = (C, F, u, v, z) => {
    const m = C.m;
    F.box(m, C.col(0xe8e4d8, 0.9), u - 0.15, u + 0.15, v - 0.11, v + 0.11, z, z + 0.012);
    F.box(m, C.col(0x5a5a5a, 0.9), u - 0.12, u + 0.02, v - 0.08, v + 0.02, z + 0.012, z + 0.013);
    F.box(m, C.col(C.R.pick([0xb8302a, 0x2a4a8a]), 0.8), u - 0.13, u + 0.13, v + 0.06, v + 0.09, z + 0.012, z + 0.013);
    return 0.34;
  };
  // lead crystal (Bleikristall): a cut bowl on a foot
  DK.kristall = (C, F, u, v, z) => {
    F.lathe(
      C.m,
      C.col(0xdce6ec, 0.05, 0.6),
      u,
      v,
      [
        [0.04, z],
        [0.02, z + 0.04],
        [0.09, z + 0.08],
        [0.1, z + 0.14],
      ],
      8,
      { caps: false }
    );
    return 0.22;
  };
  // a house plant: a geranium, a spider plant (Grünlilie) or a cactus (on the sills of the DDR)
  DK.pflanze = (C, x, y, z, kind) => {
    const m = C.m;
    m.cyl(C.col(0xb4653f, 0.88), x, y, z, z + 0.12, 0.055, 0.07, 8);
    if (kind === 'gruenlilie') {
      for (let k = 0; k < 9; k++) {
        const a = (k / 9) * Math.PI * 2,
          l = 0.16 + (k % 3) * 0.04;
        m.rod(
          C.col(k % 2 ? 0x6a9a3a : 0xd8e0b0, 0.8),
          [x, y, z + 0.11],
          [x + Math.cos(a) * l, y + Math.sin(a) * l, z + 0.2 - (k % 3) * 0.05],
          0.006,
          3
        );
      }
    } else if (kind === 'kaktus') {
      m.cyl(C.col(0x4a7a3a, 0.7), x, y, z + 0.12, z + 0.3, 0.035, 0.03, 8);
      m.cyl(C.col(0xd8486a, 0.6), x, y, z + 0.3, z + 0.33, 0.018, 0.005, 6);
    } else {
      m.lathe(
        C.col(0x4f7d3a, 0.85),
        x,
        y,
        [
          [0.08, z + 0.11],
          [0.12, z + 0.19],
          [0.0, z + 0.27],
        ],
        7,
        { caps: false }
      );
      m.lathe(
        C.col(C.R.pick([0xc8352b, 0xe05a8a, 0xd8302a]), 0.6),
        x,
        y,
        [
          [0.04, z + 0.25],
          [0.06, z + 0.29],
          [0.0, z + 0.32],
        ],
        6,
        { caps: false }
      );
    }
  };
  // a triangle turned to face n (the mesher's tri keeps the order it is given)
  const ftri = (m, mat, a, b, c, n) => {
    const e1 = [b[0] - a[0], b[1] - a[1], b[2] - a[2]],
      e2 = [c[0] - a[0], c[1] - a[1], c[2] - a[2]],
      d =
        (e1[1] * e2[2] - e1[2] * e2[1]) * n[0] +
        (e1[2] * e2[0] - e1[0] * e2[2]) * n[1] +
        (e1[0] * e2[1] - e1[1] * e2[0]) * n[2];
    if (d >= 0) m.tri(mat, a, b, c, n);
    else m.tri(mat, a, c, b, n);
  };
  // on the wall: a plate (Wandteller) – a disc facing the room with a coloured rim
  DK.teller = (C, F, u, z, r) => {
    const m = C.m,
      w = C.col(0xf4f0e8, 0.3),
      rim = C.col(C.R.pick([0x2a4a8a, 0x8a2a2a, 0x3a6a3a, 0xc8a050]), 0.3),
      n = 14,
      N = [F.n[0], F.n[1], 0];
    for (let k = 0; k < n; k++) {
      const a0 = (k / n) * Math.PI * 2,
        a1 = ((k + 1) / n) * Math.PI * 2;
      ftri(
        m,
        w,
        F.P(u, 0.03, z),
        F.P(u + Math.cos(a0) * r * 0.75, 0.03, z + Math.sin(a0) * r * 0.75),
        F.P(u + Math.cos(a1) * r * 0.75, 0.03, z + Math.sin(a1) * r * 0.75),
        N
      );
      // the painted middle (a flower or a blue Zwiebelmuster ring), so the plate reads on a light wall
      if (k % 2 === 0)
        ftri(
          m,
          rim,
          F.P(u, 0.032, z),
          F.P(u + Math.cos(a0) * r * 0.4, 0.032, z + Math.sin(a0) * r * 0.4),
          F.P(u + Math.cos(a1) * r * 0.4, 0.032, z + Math.sin(a1) * r * 0.4),
          N
        );
      m.quad(
        rim,
        F.P(u + Math.cos(a0) * r * 0.75, 0.031, z + Math.sin(a0) * r * 0.75),
        F.P(u + Math.cos(a0) * r, 0.025, z + Math.sin(a0) * r),
        F.P(u + Math.cos(a1) * r, 0.025, z + Math.sin(a1) * r),
        F.P(u + Math.cos(a1) * r * 0.75, 0.031, z + Math.sin(a1) * r * 0.75),
        N
      );
    }
    onWall(C, F, u - r, u + r, z - r, z + r);
  };
  // a mirror with a wooden or gilt frame
  DK.spiegel = (C, F, u, z, w, h) => {
    const m = C.m;
    F.box(
      m,
      C.col(C.R.pick([0x6a4a30, 0xc8a050, 0xe8e0d0]), 0.5, 0.2),
      u - w / 2,
      u + w / 2,
      0,
      0.03,
      z - h / 2,
      z + h / 2
    );
    F.box(
      m,
      C.col(0xa8b8c0, 0.05, 0.9),
      u - w / 2 + 0.04,
      u + w / 2 - 0.04,
      0.03,
      0.035,
      z - h / 2 + 0.04,
      z + h / 2 - 0.04
    );
    onWall(C, F, u - w / 2, u + w / 2, z - h / 2, z + h / 2);
  };
  // a calendar in the kitchen: a picture above, the month below
  DK.kalender = (C, F, u, z) => {
    const m = C.m;
    F.box(m, C.col(0xf4f2ec, 0.9), u - 0.15, u + 0.15, 0, 0.008, z - 0.25, z + 0.2);
    F.box(m, C.col(C.R.pick([0x5a8aa8, 0x6a8a4a, 0xb89a6a]), 0.8), u - 0.13, u + 0.13, 0.008, 0.01, z + 0.0, z + 0.18);
    F.box(m, C.col(0xb8302a, 0.8), u - 0.13, u + 0.13, 0.008, 0.01, z - 0.04, z - 0.01);
    for (let k = 0; k < 4; k++)
      F.box(m, C.col(0x8a8a8a, 0.9), u - 0.12, u + 0.12, 0.008, 0.01, z - 0.22 + k * 0.045, z - 0.21 + k * 0.045);
    onWall(C, F, u - 0.16, u + 0.16, z - 0.26, z + 0.21);
  };
  // kitchen things on the worktop: storage tins (Vorratsdosen), a kettle, a bread bin, a coffee grinder in the old houses
  DK.dosen = (C, F, u, v, z) => {
    const c = C.col(C.R.pick([0xe8e0d0, 0xd8402a, 0x3a6aa0, 0xe8c840]), 0.35, 0.3);
    for (let k = 0; k < 3; k++) {
      F.cyl(C.m, c, u - 0.1 + k * 0.1, v, z, z + 0.16 - k * 0.02, 0.042, 0.042, 10);
      F.cyl(
        C.m,
        C.col(0xd8d8d0, 0.3, 0.7),
        u - 0.1 + k * 0.1,
        v,
        z + 0.16 - k * 0.02,
        z + 0.175 - k * 0.02,
        0.044,
        0.044,
        10
      );
    }
    return 0.3;
  };
  DK.kessel = (C, F, u, v, z) => {
    const c = C.col(C.R.pick([0xe8e4dc, 0xc85a30, 0x9aa1a4]), 0.3, 0.4);
    F.lathe(
      C.m,
      c,
      u,
      v,
      [
        [0.08, z],
        [0.095, z + 0.08],
        [0.06, z + 0.17],
        [0.02, z + 0.19],
      ],
      12,
      { caps: true }
    );
    F.rod(C.m, C.col(0x2a2a2a, 0.5), [u - 0.06, v, z + 0.2], [u + 0.06, v, z + 0.2], 0.008, 4);
    return 0.22;
  };
  DK.brot = (C, F, u, v, z) => {
    F.box(
      C.m,
      C.col(C.R.pick([0xe8e0d0, 0x8a6a48, 0xc8402a]), 0.5, 0.2),
      u - 0.17,
      u + 0.17,
      v - 0.12,
      v + 0.1,
      z,
      z + 0.16
    );
    F.box(C.m, C.col(0x5a4a3a, 0.6), u - 0.17, u + 0.17, v + 0.1, v + 0.105, z + 0.11, z + 0.13);
    return 0.36;
  };
  DK.muehle = (C, F, u, v, z) => {
    F.box(C.m, C.M.holz, u - 0.06, u + 0.06, v - 0.06, v + 0.06, z, z + 0.13);
    F.cyl(C.m, C.M.messing, u, v, z + 0.13, z + 0.17, 0.045, 0.035, 8);
    F.rod(C.m, C.col(0x2a2a2a, 0.5, 0.6), [u, v, z + 0.17], [u + 0.08, v, z + 0.2], 0.005, 4);
    return 0.15;
  };
  // a chest of drawers (Kommode) with a top for the small things
  L.kommode = (C, F) => {
    const body = C.look === 'ddr' ? C.M.furnier : C.look === 'nachwende' ? C.M.eiche : C.M.holz;
    L.cabinet(C, F, 1.0, 0.48, 0.86, body, { top: body });
    for (let k = 0; k < 3; k++) {
      F.box(C.m, body, F.u0 + 0.04, F.u0 + 0.96, 0.48, 0.5, C.z + 0.14 + k * 0.23, C.z + 0.33 + k * 0.23);
      F.box(C.m, C.M.messing, F.u0 + 0.45, F.u0 + 0.55, 0.5, 0.52, C.z + 0.22 + k * 0.23, C.z + 0.24 + k * 0.23);
    }
    C.solid(F.rect(F.u0, F.u0 + 1.0, 0, 0.5), C.z, C.z + 0.86);
    top(C, F, F.u0 + 0.1, F.u0 + 0.9, 0.24, C.z + 0.86, 'schrank');
    C.container('schublade', 'Kommode durchsuchen', F.P(F.u0 + 0.5, 0.8, C.z + 0.6));
  };
  // a sewing table with its machine (Nähmaschine: black with gold lettering, the wheel at the side) and a chair
  L.naehtisch = (C, F) => {
    const m = C.m,
      z = C.z,
      u0 = F.u0,
      wood = C.look === 'ddr' ? C.M.furnier : C.M.holz,
      blk = C.col(0x1a1a1a, 0.3, 0.2);
    L.table(C, F, u0, u0 + 0.9, 0, 0.5, wood, null);
    C.tops.pop();
    F.box(m, blk, u0 + 0.25, u0 + 0.65, 0.15, 0.32, z + 0.76, z + 0.82);
    F.box(m, blk, u0 + 0.55, u0 + 0.63, 0.17, 0.3, z + 0.82, z + 1.02);
    F.box(m, blk, u0 + 0.3, u0 + 0.63, 0.18, 0.29, z + 0.96, z + 1.06);
    F.box(m, C.col(0xc8a050, 0.3, 1.0), u0 + 0.36, u0 + 0.5, 0.29, 0.292, z + 0.99, z + 1.03);
    F.cyl(m, C.col(0x9aa1a4, 0.3, 0.8), u0 + 0.68, 0.24, z + 0.9, z + 0.92, 0.06, 0.06, 10);
    L.chair(C, F, u0 + 0.45, 0.85, -Math.PI / 2, wood);
    C.solid(F.rect(u0, u0 + 0.9, 0, 0.5), z, z + 0.78);
    C.container('schublade', 'Nähkasten durchsuchen', F.P(u0 + 0.45, 0.85, z + 0.7));
  };
  // an armchair with a side table and (alt, DDR) a lamp on it
  L.sesselecke = (C, F) => {
    const m = C.m,
      z = C.z,
      u0 = F.u0,
      fab =
        C.look === 'nachwende' ? C.col(0x5a3a26, 0.45) : C.col(C.R.pick([0x3f5a3a, 0xa8361e, 0xb8a07a, 0x5a4a6a]), 0.9);
    F.box(m, fab, u0, u0 + 0.8, 0.0, 0.8, z + 0.12, z + 0.44);
    F.box(m, fab, u0, u0 + 0.8, 0.0, 0.2, z + 0.44, z + 0.95);
    F.box(m, fab, u0 - 0.02, u0 + 0.12, 0.0, 0.8, z + 0.44, z + 0.62);
    F.box(m, fab, u0 + 0.68, u0 + 0.82, 0.0, 0.8, z + 0.44, z + 0.62);
    F.box(m, C.col(0x2a1c12, 0.6), u0 + 0.05, u0 + 0.75, 0.05, 0.75, z, z + 0.12);
    const wood = C.look === 'ddr' ? C.M.furnier : C.look === 'nachwende' ? C.M.eiche : C.M.holz;
    F.box(m, wood, u0 + 0.95, u0 + 1.4, 0.05, 0.5, z + 0.55, z + 0.58);
    F.cyl(m, wood, u0 + 1.175, 0.275, z, z + 0.55, 0.03, 0.03, 6);
    C.seat(F.P(u0 + 0.4, 0.45, z), F, 'In den Sessel setzen');
    C.solid(F.rect(u0, u0 + 1.4, 0, 0.8), z, z + 0.95);
    top(C, F, u0 + 1.0, u0 + 1.35, 0.27, z + 0.58, 'beistell');
  };
  // the kitchen of an old house: coal box, enamel bucket, towel rail, pots on a rail, a calendar
  L.kuechenkram = (C, Pl, look, sidesList) => {
    const m = C.m,
      z = C.z;
    let F = Pl.any(sidesList, 0.5, 0.4, 0.5, 0.15);
    if (F) {
      F.box(m, C.col(0x3a3a3a, 0.5, 0.6), F.u0, F.u0 + 0.45, 0.02, 0.38, z, z + 0.42);
      F.box(m, C.col(0x141414, 0.95), F.u0 + 0.03, F.u0 + 0.42, 0.05, 0.35, z + 0.42, z + 0.47);
      F.cyl(m, C.col(0xe8e4dc, 0.25, 0.1), F.u0 + 0.22, 0.6, z, z + 0.28, 0.12, 0.14, 12);
      F.rod(m, C.col(0x6a6a6a, 0.4, 0.8), [F.u0 + 0.09, 0.6, z + 0.3], [F.u0 + 0.35, 0.6, z + 0.3], 0.004, 4);
      C.solid(F.rect(F.u0, F.u0 + 0.45, 0, 0.75), z, z + 0.47);
    }
    for (const sd of sidesList) {
      const W = Pl.S[sd];
      if (!W) continue;
      const Fw = frame(W.O, W.a, W.n),
        u = [0.3, 0.5, 0.7]
          .map(f => W.L * f)
          .find(q => Pl.wallFree(sd, q - 0.5, q + 0.5, z + 1.3, z + 1.95) && !Pl.tallAt(sd, q - 0.5, q + 0.5));
      if (u === undefined) continue;
      // a rail with pots and a ladle hanging from hooks
      Fw.rod(m, C.M.messing, [u - 0.45, 0.06, z + 1.75], [u + 0.45, 0.06, z + 1.75], 0.008, 4);
      for (const [k, r, c] of [
        [-0.3, 0.09, 0xe8e4dc],
        [0.0, 0.11, 0x6a6a6a],
        [0.3, 0.08, 0xc85a30],
      ]) {
        Fw.cyl(m, C.col(c, 0.3, c === 0x6a6a6a ? 0.8 : 0.1), u + k, 0.06 + r, z + 1.4, z + 1.4 + r * 1.4, r, r, 10);
        Fw.rod(
          m,
          C.col(0x3a3a3a, 0.5, 0.8),
          [u + k, 0.06, z + 1.75],
          [u + k, 0.06 + r * 0.2, z + 1.4 + r * 1.4],
          0.004,
          3
        );
      }
      onWall(C, Fw, u - 0.5, u + 0.5, z + 1.35, z + 1.8);
      break;
    }
    // the towel rail by the sink or the stove, with a checked towel
    for (const sd of sidesList) {
      const W = Pl.S[sd];
      if (!W) continue;
      const Fw = frame(W.O, W.a, W.n),
        u = [0.2, 0.8, 0.4, 0.6]
          .map(f => W.L * f)
          .find(q => Pl.wallFree(sd, q - 0.3, q + 0.3, z + 0.9, z + 1.3) && !Pl.tallAt(sd, q - 0.3, q + 0.3));
      if (u === undefined) continue;
      Fw.rod(m, C.M.messing, [u - 0.25, 0.08, z + 1.2], [u + 0.25, 0.08, z + 1.2], 0.008, 4);
      Fw.box(m, C.M.karo || C.col(0xd04040, 0.9), u - 0.15, u + 0.12, 0.07, 0.09, z + 0.85, z + 1.21);
      onWall(C, Fw, u - 0.3, u + 0.3, z + 0.85, z + 1.25);
      break;
    }
    void look;
  };
  // the finishing pass of a room: a second group in big rooms, rugs, things on the walls, small things on every top
  function deko(C, Pl, room, inner, outer) {
    const kind = room.kind,
      look = C.look,
      R = C.R,
      area = (room.x1 - room.x0) * (room.y1 - room.y0),
      living = ['stube', 'wohnzimmer', 'schlafzimmer', 'kammer', 'kinderzimmer'].includes(kind),
      all = inner.concat(outer);
    if (kind === 'bad') {
      // a bath mat and a towel on a rail where the wall is free
      const r = Pl.floorFree(0.8, 0.5);
      if (r)
        C.m.box(
          C.col(C.R.pick([0x6a8ab0, 0xd8a0a8, 0xe8e0d0, 0x7aa07a]), 0.95),
          r[0],
          r[1],
          r[2],
          r[3],
          C.z + 0.002,
          C.z + 0.012
        );
      for (const sd of C.R.shuffle(all.slice())) {
        const W = Pl.S[sd],
          Fw = frame(W.O, W.a, W.n),
          u = [0.3, 0.5, 0.7]
            .map(f => W.L * f)
            .find(q => Pl.wallFree(sd, q - 0.35, q + 0.35, C.z + 0.9, C.z + 1.3) && !Pl.tallAt(sd, q - 0.35, q + 0.35));
        if (u === undefined) continue;
        Fw.rod(C.m, C.M.stahl || C.M.messing, [u - 0.3, 0.08, C.z + 1.2], [u + 0.3, 0.08, C.z + 1.2], 0.01, 5);
        Fw.box(
          C.m,
          C.col(C.R.pick([0xf4f2ec, 0x6a8ab0, 0xd8a0a8, 0xe8c840]), 0.95),
          u - 0.22,
          u + 0.18,
          0.065,
          0.095,
          C.z + 0.75,
          C.z + 1.21
        );
        onWall(C, Fw, u - 0.35, u + 0.35, C.z + 0.75, C.z + 1.25);
        break;
      }
    }
    if (
      kind === 'keller' ||
      kind === 'boden' ||
      kind === 'flur' ||
      kind === 'bad' ||
      kind === 'vorrat' ||
      kind === 'waschkueche'
    ) {
      fillTops(C, look);
      return;
    }
    // a big room gets a second group instead of empty floor
    if (living && area > 15) {
      const pick = R.pick(look === 'nachwende' ? ['sessel', 'kommode'] : ['naeh', 'sessel', 'kommode']);
      let F = null;
      if (pick === 'naeh') {
        F = Pl.any(outer.concat(inner), 0.9, 1.2, 1.05, 0.5);
        if (F) L.naehtisch(C, F);
      } else if (pick === 'sessel') {
        F = Pl.any(all, 1.4, 0.85, 0.95, 0.5);
        if (F) L.sesselecke(C, F);
      }
      if (!F) {
        F = Pl.any(all, 1.0, 0.5, 0.86, 0.5);
        if (F) L.kommode(C, F);
      }
    } else if (living && area > 9 && R.chance(0.6)) {
      const F = Pl.any(all, 1.0, 0.5, 0.86, 0.5);
      if (F) L.kommode(C, F);
    }
    if (kind === 'kueche' && look !== 'nachwende') L.kuechenkram(C, Pl, look, inner.concat(outer));
    // after 1990: a floor uplight (Deckenfluter) in the living room
    if (look === 'nachwende' && (kind === 'stube' || kind === 'wohnzimmer')) {
      const F = Pl.any(all, 0.4, 0.4, 1.9, 0.95);
      if (F) {
        const u = F.u0 + 0.2,
          z = C.z;
        F.cyl(C.m, C.col(0x2a2a2a, 0.4, 0.6), u, 0.2, z, z + 0.03, 0.16, 0.16, 10);
        F.cyl(C.m, C.col(0x8a8a8a, 0.3, 0.8), u, 0.2, z + 0.03, z + 1.75, 0.012, 0.012, 6);
        F.lathe(
          C.m,
          C.col(0xe8e0d0, 0.4),
          u,
          0.2,
          [
            [0.03, z + 1.75],
            [0.17, z + 1.82],
            [0.19, z + 1.86],
          ],
          12,
          { caps: false }
        );
      }
    }
    // a rag rug (Flickenteppich) in the old houses, by the bed or in the middle
    if (look === 'alt' || (look === 'ddr' && kind !== 'stube' && R.chance(0.5))) {
      const r = Pl.floorFree(kind === 'kueche' ? 1.0 : 1.5, kind === 'kueche' ? 0.6 : 0.8);
      if (r) C.m.box(C.M.rag, r[0], r[1], r[2], r[3], C.z + 0.002, C.z + 0.009);
    }
    // the walls: two to four things, pictures, plates, a mirror, a calendar in the kitchen
    const want =
      kind === 'kueche'
        ? ['kalender', 'teller', 'bild']
        : kind === 'stube' || kind === 'wohnzimmer'
          ? look === 'nachwende'
            ? ['bild', 'bild', 'spiegel']
            : ['bild', 'teller', 'teller', 'bild']
          : ['bild', 'spiegel', 'bild'];
    const n = Math.min(want.length, area > 14 ? 4 : area > 8 ? 3 : 2),
      z = C.z;
    let hung = 0;
    for (const it of want) {
      if (hung >= n) break;
      const w = it === 'teller' ? 0.3 : it === 'spiegel' ? 0.5 : it === 'kalender' ? 0.32 : 0.55,
        h = it === 'teller' ? 0.3 : it === 'spiegel' ? 0.7 : it === 'kalender' ? 0.47 : 0.42,
        zc = it === 'spiegel' ? z + 1.55 : it === 'kalender' ? z + 1.5 : z + 1.65 + R.r(-0.08, 0.1);
      let done = false;
      for (const sd of R.shuffle(all.slice())) {
        const W = Pl.S[sd];
        if (!W || done) continue;
        const Fw = frame(W.O, W.a, W.n);
        for (const f of R.shuffle([0.2, 0.35, 0.5, 0.65, 0.8])) {
          const u = W.L * f,
            u0 = u - w / 2 - 0.1,
            u1 = u + w / 2 + 0.1;
          if (u0 < 0.15 || u1 > W.L - 0.15) continue;
          if (!Pl.wallFree(sd, u0, u1, zc - h / 2, zc + h / 2) || Pl.tallAt(sd, u0, u1)) continue;
          const rr = Fw.rect(u0, u1, -0.02, 0.15);
          if (
            (C.wallItems || []).some(
              q =>
                q.z0 < zc + h / 2 + 0.1 &&
                q.z1 > zc - h / 2 - 0.1 &&
                rr[0] < q.r[1] &&
                rr[1] > q.r[0] &&
                rr[2] < q.r[3] &&
                rr[3] > q.r[2]
            )
          )
            continue;
          if (it === 'teller') DK.teller(C, Fw, u, zc, 0.14);
          else if (it === 'spiegel') DK.spiegel(C, Fw, u, zc, w, h);
          else if (it === 'kalender') DK.kalender(C, Fw, u, zc);
          else
            L.bild(
              C,
              Fw,
              u,
              zc,
              w,
              h,
              look === 'ddr' ? R.pick([3, 0, 3]) : look === 'alt' ? R.pick([0, 1, 0]) : R.pick([3, 0]),
              R.pick([0x5a3a22, 0xc8a050, 0x2a2a2a, 0x8a6a48])
            );
          done = true;
          hung++;
          break;
        }
      }
    }
    fillTops(C, look);
  }
  // small things on every registered top, spaced along it (a doily under the first one in the DDR)
  function fillTops(C, look) {
    const R = C.R;
    for (const t of C.tops || []) {
      const list =
        t.kind === 'arbeit'
          ? look === 'alt'
            ? ['muehle', 'dosen', 'brot']
            : ['kessel', 'dosen', 'brot']
          : t.kind === 'tisch'
            ? ['schale', 'zeitung']
            : t.kind === 'couchtisch'
              ? [R.pick(['zeitung', 'schale']), 'kristall']
              : t.kind === 'oben'
                ? ['vase', 'kristall']
                : t.kind === 'beistell'
                  ? [R.pick(['zeitung', 'vase', 'foto'])]
                  : look === 'alt'
                    ? ['tasse', 'tasse', 'foto', 'leuchter', 'vase']
                    : look === 'ddr'
                      ? ['kristall', 'tasse', 'vase', 'foto']
                      : ['foto', 'vase', 'leuchter'];
      let u = t.u0;
      let first = true;
      for (const it of R.shuffle(list.slice())) {
        const need =
          it === 'zeitung' || it === 'brot'
            ? 0.36
            : it === 'schale' || it === 'dosen'
              ? 0.32
              : it === 'kristall' || it === 'kessel'
                ? 0.22
                : it === 'foto'
                  ? 0.2
                  : 0.17;
        if (u + need > t.u1) continue;
        const c = u + need / 2;
        if (first && look === 'ddr' && t.kind !== 'tisch' && t.kind !== 'oben')
          L.deckchen(C, ...t.F.P(c, t.v, 0).slice(0, 2), t.z + 0.001, 0.12);
        DK[it](C, t.F, c, t.v, t.z + (first && look === 'ddr' ? 0.002 : 0));
        first = false;
        u += need + 0.04;
      }
    }
    C.tops = [];
  }
  // feat/haeuser: more looks – look → { room, mats, ceiling, furnish, deko, curtains, tv, leaf } (haeuser/haeuser_heute.js fills it for the
  // normal game; the zombie night's looks are not in it), and the helpers its furniture shares with the kit
  const looks = {};
  return { frame, sides, placer, furnish, L, DK, PERSONAL, ZIPLAN, looks, top, onWall, fillTops, deko };
})();
window.ZIEINR = ZIEINR;
