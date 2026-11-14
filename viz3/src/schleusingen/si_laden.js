// ===================== feat/schleusingen-innen 2: the shop rooms behind the signs of the old town – layouts, pure (SILADEN) =====================
// A ground floor with a shop sign of the old town (welt/schleusingen.js signs()) has a sales room behind the house door (at most 12 m deep and
// 60–120 m², schleusingen/si_plan.js SIPLAN.shop; the rest walled off behind a door „Nur für Personal“), furnished with the kit of the shops
// (laeden/innen_plan.js LIPLAN, pieces of laeden/innen_markt.js and innen_haus.js) as such a shop in a small German town has it: a pharmacy
// (a counter with two or three stations, shelves of goods behind it, the free choice on the side walls), a bakery and a café (the counter
// with its display near the door, bread or cakes behind it, tables along the windows), an inn or restaurant (the bar with bottles behind it,
// tables with chairs, a coat rack), a shop with shelves (the counter with the till near the door, shelves along the walls, a low gondola).
// Goods as plain packaging, no brands; a sign says only what kind of shop it is. Pure (node tests: viz3/test/unit/schleusingen_innen.test.mjs);
// schleusingen/si_innen.js draws the plan with LINNEN.drawPlan.
import { LIPLAN } from '../laeden/innen_plan.js';
import { LIMARKT } from '../laeden/innen_markt.js';
import { LIHAUS } from '../laeden/innen_haus.js';
export const SILADEN = (() => {
  const { L, rnd, hash, kit } = LIPLAN;
  const { C, PAL, wallShelf, gondola, goodsRunU, hallFrame } = LIMARKT;
  const H = LIHAUS.H;
  // ---- the room: its frame at the house door (u along the front, v into the room), its box, what stays free ----
  function room(u) {
    const hall = u.vols[0],
      F = hallFrame(hall, u.doors[0]),
      [U0, V0, U1, V1] = LIPLAN.bbOf(F.polyL(hall.f)),
      de = F.L(u.doors[0].x, u.doors[0].y),
      keep = [[de[0] - 0.85, -1, de[0] + 0.85, 2.2]]; // the way in from the house door
    let staff = null;
    if (u.staff) {
      // the door to the back rooms: where it is in the room, which wall (its inward normal in the frame), the way to it free
      const s = F.L(u.staff.x, u.staff.y),
        nu = u.staff.nx * F.eu[0] + u.staff.ny * F.eu[1],
        nv = u.staff.nx * F.ev[0] + u.staff.ny * F.ev[1];
      staff = { u: s[0], v: s[1], nu, nv, w: u.staff.w || 0.86 };
      const hw = staff.w / 2 + 0.25;
      keep.push(
        Math.abs(nv) > 0.5
          ? [s[0] - hw, Math.min(s[1], s[1] + nv * 1.2), s[0] + hw, Math.max(s[1], s[1] + nv * 1.2)]
          : [Math.min(s[0], s[0] + nu * 1.2), s[1] - hw, Math.max(s[0], s[0] + nu * 1.2), s[1] + hw]
      );
    }
    const G = { hall, F, U0, V0, U1, V1, W: U1 - U0, de, keep, staff, hc: Math.min(3.0, hall.h - 1.0) };
    // a local rect free of what must stay free
    G.free = (u0, v0, u1, v1) => !G.keep.some(k => u0 < k[2] && u1 > k[0] && v0 < k[3] && v1 > k[1]);
    return G;
  }
  // a frame along a side wall of the room: u along the wall, v into the room (side −1: the wall at U0, running from the back to the front;
  // +1: the wall at U1, from the front to the back)
  function sideFrame(G, side) {
    const { F, U0, U1, V1 } = G;
    if (side < 0) return LIPLAN.frame(F.W(U0, V1), [-F.ev[0], -F.ev[1]]);
    return LIPLAN.frame(F.W(U1, 0), F.ev);
  }
  // main-frame v ↔ the side frame's u
  const sideU = (G, side, v) => (side < 0 ? G.V1 - v : v);
  // the free stretches of [a, b] (main-frame v along a side wall, or u along the back wall) left by the keep rects at that wall
  function stretches(G, a, b, cut) {
    let out = [[a, b]];
    for (const [c0, c1] of cut) {
      const next = [];
      for (const [p, q] of out) {
        if (c1 <= p || c0 >= q) next.push([p, q]);
        else {
          if (c0 - p > 0.9) next.push([p, c0]);
          if (q - c1 > 0.9) next.push([c1, q]);
        }
      }
      out = next;
    }
    return out;
  }
  // the keep rects as intervals along a side wall (main v) or along the back wall (main u), within d of that wall
  const cutSide = (G, side, d) =>
    G.keep.filter(k => (side < 0 ? k[0] < G.U0 + d : k[2] > G.U1 - d)).map(k => [k[1] - 0.05, k[3] + 0.05]);
  const cutBack = (G, d) => G.keep.filter(k => k[3] > G.V1 - d).map(k => [k[0] - 0.05, k[2] + 0.05]);
  // shelves along a side wall in its free stretches between main v0 and v1
  function sideShelves(P, G, R, side, v0, v1, o) {
    for (const [a, b] of stretches(G, v0, v1, cutSide(G, side, (o.d || 0.5) + 0.3))) {
      if (b - a < 1.0) continue;
      const K2 = kit(P, sideFrame(G, side), 0),
        p = sideU(G, side, a),
        q = sideU(G, side, b);
      wallShelf(K2, R, Math.min(p, q), Math.max(p, q), 0.02, 1, o);
      G.keep.push(side < 0 ? [G.U0, a, G.U0 + (o.d || 0.5) + 0.05, b] : [G.U1 - (o.d || 0.5) - 0.05, a, G.U1, b]);
    }
  }
  function backShelves(P, G, R, u0, u1, o) {
    const K = kit(P, G.F, 0);
    for (const [a, b] of stretches(G, u0, u1, cutBack(G, (o.d || 0.5) + 0.3))) {
      if (b - a < 1.0) continue;
      wallShelf(K, R, a, b, G.V1 - 0.02, -1, o);
      G.keep.push([a, G.V1 - (o.d || 0.5) - 0.05, b, G.V1]);
    }
  }
  // the door to the back rooms: its leaf and frame on the wall, a small plate „Nur für Personal“ (the walker meets the wall behind it)
  function staffDoor(P, G) {
    const s = G.staff;
    if (!s) return;
    const K = kit(P, G.F, 0),
      leaf = L(0.86, 0.85, 0.82),
      fr = L(0.62, 0.62, 0.6),
      h = s.w / 2;
    if (Math.abs(s.nv) > 0.5) {
      const v = s.v + s.nv * 0.02;
      K.box(s.u, v, 0, s.w, 0.04, 2.0, leaf);
      for (const e of [-1, 1]) K.box(s.u + e * (h + 0.03), s.v + s.nv * 0.025, 0, 0.06, 0.05, 2.06, fr);
      K.box(s.u, s.v + s.nv * 0.025, 2.0, s.w + 0.12, 0.05, 0.06, fr);
      K.box(s.u + h - 0.1, s.v + s.nv * 0.06, 1.0, 0.12, 0.04, 0.03, C.counterD);
      K.sign(['Nur für', 'Personal'], s.u, s.v + s.nv * 0.045, 1.42, 0.36, 0.18, s.nv > 0 ? 1 : -1, 3);
    } else {
      const u = s.u + s.nu * 0.02;
      K.box(u, s.v, 0, 0.04, s.w, 2.0, leaf);
      for (const e of [-1, 1]) K.box(s.u + s.nu * 0.025, s.v + e * (h + 0.03), 0, 0.05, 0.06, 2.06, fr);
      K.box(s.u + s.nu * 0.025, s.v, 2.0, 0.05, s.w + 0.12, 0.06, fr);
      K.box(s.u + s.nu * 0.06, s.v + h - 0.1, 1.0, 0.04, 0.12, 0.03, C.counterD);
      K.signU(['Nur für', 'Personal'], s.u + s.nu * 0.045, s.v, 1.42, 0.36, 0.18, s.nu > 0 ? 1 : -1, 3);
    }
  }
  // a small table for two (or four) with its chairs, where it is free
  function tableAt(K, G, R, uu, vv, n, col) {
    const r = n > 2 ? [0.85, 1.55] : [0.75, 1.5];
    if (!G.free(uu - r[1] / 2, vv - r[1] / 2, uu + r[1] / 2, vv + r[1] / 2)) return false;
    if (uu - r[1] / 2 < G.U0 + 0.05 || uu + r[1] / 2 > G.U1 - 0.05 || vv - r[1] / 2 < 0.1 || vv + r[1] / 2 > G.V1 - 0.1)
      return false;
    LIHAUS.table(K, uu, vv, r[0], r[0] * 0.9, col, 0, n);
    G.keep.push([uu - r[1] / 2, vv - r[1] / 2, uu + r[1] / 2, vv + r[1] / 2]);
    return true;
  }
  // ---- the pharmacy: the counter with two or three stations across the room, shelves of goods behind it on the back wall, the free choice
  // on the side walls, a low stand in the middle where there is room, a chair to wait ----
  function apotheke(P, u) {
    const R = rnd(hash(u.id) + 83),
      G = room(u),
      { F, U0, U1, V1, W, hc } = G,
      K = kit(P, F, 0),
      um = (U0 + U1) / 2;
    P.secs.push({ id: 0, vols: [0], h: hc });
    P.floor = { floorA: L(0.85, 0.85, 0.83), floorB: L(0.82, 0.82, 0.8) };
    P.cell = 0.6;
    staffDoor(P, G);
    const n = W >= 7.5 ? 3 : 2,
      vC = V1 - (V1 > 6.5 ? 2.2 : 1.8),
      span = n * 1.3 + (n - 1) * 0.3,
      // the counter off the staff door's side when it is in the back wall (one goes round it to the back)
      uc =
        G.staff && Math.abs(G.staff.nv) > 0.5
          ? Math.min(U1 - span / 2 - 0.5, Math.max(U0 + span / 2 + 0.5, um + (G.staff.u > um ? -0.6 : 0.6)))
          : um;
    for (let i = 0; i < n; i++) {
      const uu = uc - span / 2 + 0.65 + i * 1.6;
      K.box(uu, vC, 0, 1.3, 0.7, 1.0, H.white, L(0.75, 0.82, 0.78));
      K.box(uu, vC + 0.1, 1.0, 0.35, 0.25, 0.25, C.counterD);
      K.glow(uu, vC - 0.04, 1.05, 0.3, 0.01, 0.18, C.screen);
      if (i < n - 1) K.box(uu + 0.8, vC, 0, 0.3, 0.6, 0.9, H.white, L(0.75, 0.82, 0.78)); // between the stations
    }
    K.solid(uc, vC, span + 0.1, 0.75);
    K.spot('theke', uc, vC + 0.65, [0, -1]);
    G.keep.push([uc - span / 2 - 0.1, vC - 0.4, uc + span / 2 + 0.1, V1]);
    // behind the counter: shelves of goods on the back wall (the door to the back rooms kept free)
    G.keep.pop();
    backShelves(P, G, R, U0 + 0.3, U1 - 0.3, { d: 0.42, h: 2.1, pal: 'apo', kinds: ['box', 'box', 'bottle'] });
    G.keep.push([uc - span / 2 - 0.1, vC - 0.4, uc + span / 2 + 0.1, V1]);
    K.sign(['Apotheke'], uc, V1 - 0.46, Math.min(2.2, hc - 0.4), 1.3, 0.3, -1, 0);
    // the free choice on the side walls from the front to the counter
    for (const sd of [-1, 1])
      sideShelves(P, G, R, sd, 0.9, vC - 0.8, { d: 0.45, h: 1.8, pal: 'apo', kinds: ['box', 'bottle', 'jar'] });
    // a low stand in the middle (cosmetics, tea), a chair by the window
    if (W >= 6.2 && vC - 1.2 - 2.6 >= 1.4 && G.free(um - 0.6, 2.4, um + 0.6, vC - 1.2))
      gondola(K, R, um, 2.7, vC - 1.5, {
        d: 0.7,
        h: 1.3,
        levels: [0.14, 0.55, 0.95],
        aisle: ['', 'drogerie', ['box', 'bottle']],
      });
    const cu = G.de[0] + (G.de[0] - U0 > U1 - G.de[0] ? -1.6 : 1.6);
    if (G.free(cu - 0.3, 0.3, cu + 0.3, 0.9) && cu > U0 + 0.4 && cu < U1 - 0.4) LIHAUS.chair(K, cu, 0.6, Math.PI);
    for (let uu = U0 + 1.3; uu < U1 - 0.9; uu += 2.4)
      for (let vv = 1.4; vv < V1 - 0.6; vv += 2.6) K.light(uu, vv, hc - 0.03, 0.5, 0.5);
    P.frame = F;
    return P;
  }
  // ---- a bakery or a café: the counter with its display near the door along a side wall, the bread (or the cakes and the coffee) on the
  // wall behind it, tables along the windows ----
  function backerei(P, u, cafe) {
    const R = rnd(hash(u.id) + (cafe ? 97 : 89)),
      G = room(u),
      { F, U0, U1, V1, hc, de } = G,
      K = kit(P, F, 0);
    P.secs.push({ id: 0, vols: [0], h: hc });
    P.floor = cafe
      ? { floorA: L(0.6, 0.47, 0.36), floorB: L(0.56, 0.44, 0.34) }
      : { floorA: L(0.62, 0.5, 0.38), floorB: L(0.58, 0.47, 0.36) };
    P.cell = 0.5;
    P.wallCol = L(0.88, 0.84, 0.76);
    staffDoor(P, G);
    // the counter along the side wall with more room beside the door: the shelf on the wall, a way for the staff, the counter (its
    // front 2.05 m off the wall), from 0.9 m behind the front – or behind the way in, if the door is near that wall
    const side = de[0] - U0 > U1 - de[0] ? -1 : 1,
      uw = side < 0 ? U0 : U1,
      ucF = uw - side * 2.05, // the counter's front line (customers' side)
      uc = uw - side * 1.6;
    let v0 = 0.9;
    const span = [Math.min(uw, ucF), Math.max(uw, ucF)];
    if (!G.free(span[0], v0, span[1], v0 + 1.6)) v0 = 2.4;
    const Lc = Math.max(1.4, Math.min(4.2, V1 - v0 - 1.3)),
      v1 = v0 + Lc,
      vm = (v0 + v1) / 2;
    K.box(uc, vm, 0, 0.9, Lc, 0.92, C.wood, C.counter);
    K.box(uc, vm, 0.92, 0.92, Lc, 0.04, C.shelf);
    for (const e of [-1, 1]) K.box(uc + e * 0.44, vm, 0.96, 0.03, Lc, 0.05, C.glassF);
    K.box(ucF + side * 0.02, vm, 1.3, 0.025, Lc, 0.025, C.glassF);
    for (let vv = v0 + 0.3; vv < v1 - 0.25; vv += 0.48)
      for (const [du, cl] of [
        [-0.2, R() < 0.5 ? C.bread : C.breadD],
        [0.18, cafe ? L(0.86, 0.72, 0.62) : R() < 0.5 ? C.bread : C.breadD],
      ])
        K.good('heap', uc + du, vv, 0.96, 'v', 0.42, 0.34, cafe ? 0.12 : 0.09, cl, 1, 0);
    K.box(uc + side * 0.1, v1 - 0.25, 0.96, 0.36, 0.3, 0.14, C.counterD); // the till at the far end
    K.glow(uc - side * 0.08, v1 - 0.25, 1.02, 0.01, 0.22, 0.14, C.screen);
    K.solid(uc, vm + 0.1, 0.95, Lc + 0.3);
    K.spot('theke', uw - side * 0.85, vm, [-side, 0]);
    G.keep.push([Math.min(uw, ucF - side * 0.9), v0 - 0.2, Math.max(uw, ucF - side * 0.9), v1 + 0.5]);
    // behind: the bread rack on the wall (a café: a back counter with the coffee machine, cakes on a shelf above)
    const K2 = kit(P, sideFrame(G, side), 0),
      a = sideU(G, side, v0),
      b = sideU(G, side, v1),
      p = Math.min(a, b),
      q = Math.max(a, b),
      pm = (p + q) / 2;
    if (cafe) {
      K2.box(pm, 0.32, 0, q - p, 0.6, 0.9, C.wood, C.counter);
      K2.box(pm - (q - p) / 4, 0.3, 0.9, 0.42, 0.38, 0.45, L(0.2, 0.2, 0.21)); // the coffee machine
      K2.box(pm - (q - p) / 4, 0.12, 1.12, 0.3, 0.02, 0.1, L(0.6, 0.62, 0.64));
      for (const z of [1.45, 1.8]) {
        K2.box(pm, 0.16, z - 0.03, q - p, 0.3, 0.03, C.wood);
        for (let uu = p + 0.2; uu < q - 0.15; uu += 0.32)
          K2.good('jar', uu, 0.16, z, 'u', 0.1, 0.1, 0.13, R() < 0.5 ? L(0.85, 0.82, 0.76) : L(0.55, 0.32, 0.2));
      }
    } else {
      K2.box(pm, 0.04, 0, q - p, 0.08, 2.1, C.wood, C.woodD);
      for (const z of [0.5, 0.9, 1.3, 1.7]) {
        K2.box(pm, 0.28, z - 0.03, q - p, 0.46, 0.03, C.wood);
        for (let uu = p + 0.22; uu < q - 0.18; uu += 0.3)
          K2.good('loaf', uu, 0.28, z, 'u', 0.24, 0.3, 0.13, R() < 0.5 ? C.bread : C.breadD, 1, 1);
      }
    }
    K2.sign([cafe ? 'Café' : 'Bäckerei'], pm, 0.1, Math.min(2.2, hc - 0.45), Math.min(1.8, q - p), 0.36, 1, 0);
    // tables along the windows: the front beside the door, then the other side wall, then a row inside
    const ow = side < 0 ? U1 : U0,
      col = cafe ? H.woodL : H.table;
    let n = 0;
    for (let uu = ow + side * 0.95; (side < 0 ? uu > U0 + 0.8 : uu < U1 - 0.8) && n < 4; uu += side * 1.75)
      if (tableAt(K, G, R, uu, 0.95, 2, col)) n++;
    for (let vv = 2.6; vv < V1 - 0.9 && n < (cafe ? 6 : 4); vv += 2.0)
      if (tableAt(K, G, R, ow + side * 0.95, vv, 2, col)) n++;
    // a café a few more inside (not a canteen: eight tables at most in all)
    if (cafe)
      for (let vv = 3.4; vv < V1 - 1.0 && n < 8; vv += 2.6)
        for (let uu = ow + side * 3.0; (side < 0 ? uu > U0 + 1.0 : uu < U1 - 1.0) && n < 8; uu += side * 2.4)
          if (tableAt(K, G, R, uu, vv, 4, col)) n++;
    P.tables = n;
    for (let uu = U0 + 1.2; uu < U1 - 0.8; uu += 2.3)
      for (let vv = 1.3; vv < V1 - 0.6; vv += 2.4) K.light(uu, vv, hc - 0.03, 0.42, 0.42);
    P.frame = F;
    return P;
  }
  const baecker = (P, u) => backerei(P, u, false);
  const cafe = (P, u) => backerei(P, u, true);
  // ---- a shop with shelves: the counter with the till near the door, shelves along the side walls and the back wall, a low gondola ----
  const PALS = ['haushalt', 'drogerie', 'suess', 'kaffee', 'backen', 'gewuerze', 'tier', 'wein'];
  function laden(P, u) {
    const R = rnd(hash(u.id) + 41),
      G = room(u),
      { F, U0, U1, V1, W, hc, de } = G,
      K = kit(P, F, 0),
      pal = PALS[Math.floor(R() * PALS.length)],
      pal2 = PALS[(PALS.indexOf(pal) + 3) % PALS.length],
      um = (U0 + U1) / 2;
    P.secs.push({ id: 0, vols: [0], h: hc });
    P.floor = { floorA: L(0.72, 0.68, 0.62), floorB: L(0.68, 0.64, 0.58) };
    P.cell = 0.5;
    staffDoor(P, G);
    // the counter beside the door, parallel to the side wall with more room, the till on it
    const side = de[0] - U0 > U1 - de[0] ? -1 : 1,
      uw = side < 0 ? U0 : U1,
      uc = uw - side * 1.1;
    let vS = 0.9;
    if (!G.free(Math.min(uw, uc - side * 0.9), vS, Math.max(uw, uc - side * 0.9), vS + 2.0)) vS = 2.4;
    const Lc = Math.min(2.0, V1 - vS - 1.0);
    if (Lc >= 1.2) {
      K.box(uc, vS + Lc / 2, 0, 0.6, Lc, 0.95, H.wood, C.counter);
      K.box(uc, vS + Lc - 0.3, 0.95, 0.32, 0.38, 0.12, C.counterD);
      K.glow(uc + side * 0.12, vS + Lc - 0.3, 1.07, 0.01, 0.26, 0.16, C.screen);
      K.solid(uc, vS + Lc / 2, 0.65, Lc);
      K.spot('theke', uc + side * 0.6, vS + Lc / 2, [-side, 0]);
      G.keep.push([
        Math.min(uc, uc + side * 1.2) - 0.35,
        vS - 0.3,
        Math.max(uc, uc + side * 1.2) + 0.35,
        vS + 0.1 + Lc,
      ]);
    }
    // the shelves: along both side walls (behind the counter's end) and along the back wall
    sideShelves(P, G, R, -1, 0.9, V1 - 0.7, { d: 0.5, h: 2.0, pal, kinds: ['box', 'bottle', 'jar'] });
    sideShelves(P, G, R, 1, 0.9, V1 - 0.7, { d: 0.5, h: 2.0, pal: pal2, kinds: ['box', 'bottle', 'jar'] });
    backShelves(P, G, R, U0 + 0.6, U1 - 0.6, { d: 0.45, h: 2.0, pal, kinds: ['box', 'jar', 'bag'] });
    // a low gondola down the middle where it is wide and deep enough (a way of 1.1 m either side, the door's way free)
    if (W >= 4.6 && V1 - 1.4 - 2.6 > 1.6 && G.free(um - 0.5, 2.4, um + 0.5, V1 - 1.2))
      gondola(K, R, um, 2.7, V1 - 1.5, {
        d: 0.8,
        h: 1.4,
        levels: [0.14, 0.52, 0.9],
        aisle: ['', pal2, ['box', 'bag']],
      });
    for (let uu = U0 + 1.2; uu < U1 - 0.8; uu += 2.2) K.light(uu, V1 / 2, hc - 0.03, 0.4, Math.max(1, V1 - 2.4));
    P.frame = F;
    return P;
  }
  // ---- an inn or a restaurant: the bar at a side wall near the back with bottles on shelves behind it, tables with chairs ----
  function gaststaette(P, u) {
    const R = rnd(hash(u.id) + 47),
      G = room(u),
      { F, U0, U1, V1, hc, de } = G,
      K = kit(P, F, 0),
      side0 = de[0] < (U0 + U1) / 2 ? 1 : -1; // the bar on the wall away from the door
    P.secs.push({ id: 0, vols: [0], h: hc });
    P.floor = { floorA: L(0.5, 0.36, 0.24), floorB: L(0.47, 0.34, 0.23) };
    P.cell = 0.6;
    P.wallCol = L(0.86, 0.8, 0.68);
    staffDoor(P, G);
    // the bar: along a side wall (the one away from the door first), its front 1.2 m off the wall, from the back – shorter, or on the other
    // wall, where the door to the back rooms needs its way
    let bl = 0,
      ub = 0,
      vb = 0,
      side = side0;
    for (const sd of [side0, -side0]) {
      const uw = sd > 0 ? U1 : U0,
        u1 = sd > 0 ? U1 - 1.25 : U0 + 1.25;
      for (let vB = V1 - 0.3; vB > 3.6; vB -= 0.4) {
        const l = Math.min(3.6, vB - 2.0);
        if (l >= 1.6 && G.free(Math.min(u1 - sd * 0.6, uw), vB - l, Math.max(u1 - sd * 0.6, uw), vB)) {
          bl = l;
          ub = u1;
          vb = vB - l / 2;
          side = sd;
          break;
        }
      }
      if (bl) break;
    }
    if (bl >= 1.6) {
      K.box(ub, vb, 0, 0.55, bl, 1.05, H.wood, H.woodL);
      K.box(ub - side * 0.18, vb, 1.05, 0.35, bl, 0.05, H.woodL); // the bar top
      K.box(ub - side * 0.33, vb, 0.15, 0.06, bl, 0.05, C.counterD); // the foot rail
      K.solid(ub, vb, 0.7, bl);
      // the tap, glasses on the counter
      K.box(ub, vb - bl / 2 + 0.5, 1.05, 0.12, 0.3, 0.35, L(0.7, 0.71, 0.72));
      for (let k = 0; k < 4; k++)
        K.good('jar', ub + side * 0.05, vb + 0.2 + k * 0.16, 1.1, 'v', 0.08, 0.08, 0.14, L(0.75, 0.8, 0.82));
      // behind it, on the wall: shelves with bottles, the back counter
      const K2 = kit(P, sideFrame(G, side), 0),
        a = side < 0 ? V1 - (vb + bl / 2) : vb - bl / 2,
        b = a + bl;
      for (const z of [1.15, 1.5, 1.85]) {
        K2.box((a + b) / 2, 0.15, z - 0.03, bl, 0.26, 0.03, H.woodL);
        goodsRunU(K2, R, a + 0.05, b - 0.05, 0.27, 1, z, 0.33, 0.2, PAL.wein, ['bottle']);
      }
      K2.box((a + b) / 2, 0.3, 0, bl, 0.55, 0.9, H.wood, H.woodL);
      K.spot('theke', ub + side * 0.6, vb, [-side, 0]);
      G.keep.push([
        Math.min(ub - side * 0.6, side > 0 ? U1 : U0),
        vb - bl / 2 - 0.2,
        Math.max(ub - side * 0.6, side > 0 ? U1 : U0),
        vb + bl / 2 + 0.2,
      ]);
    }
    // tables for four in rows, off the bar and the doors
    for (let vv = 1.4; vv < V1 - 1.0; vv += 2.3)
      for (let uu = U0 + 1.3; uu < U1 - 1.0; uu += 2.2) {
        if (tableAt(K, G, R, uu, vv, 4, R() < 0.5 ? H.oak : H.wood) && R() < 0.6)
          K.good('jar', uu, vv, 0.76, 'u', 0.07, 0.07, 0.12, L(0.85, 0.82, 0.72)); // a candle, a menu stand
      }
    // a coat rack by the door
    const cu = de[0] + (side > 0 ? -1.1 : 1.1);
    if (cu > U0 + 0.3 && cu < U1 - 0.3) {
      K.box(cu, 0.35, 0, 0.05, 0.05, 1.8, H.dark);
      for (let k = 0; k < 3; k++) K.box(cu + (k - 1) * 0.1, 0.35, 1.62, 0.04, 0.2, 0.03, H.dark);
    }
    for (let uu = U0 + 1.3; uu < U1 - 0.9; uu += 2.4)
      for (let vv = 1.5; vv < V1 - 0.8; vv += 2.6) K.light(uu, vv, hc - 0.03, 0.36, 0.36);
    P.frame = F;
    return P;
  }
  const LAY = { baecker, apotheke, cafe, gaststaette, laden };
  // everything under the house's ceiling hc: what reaches above is cut, a sign comes down, a light strip hangs at the ceiling
  function fit(P, hc) {
    P.boxes = P.boxes.filter(b => b.z < hc - 0.03);
    for (const b of P.boxes) if (b.z + b.sz > hc - 0.01) b.sz = Math.max(0.01, hc - 0.01 - b.z);
    P.goods = P.goods.filter(g => g.z + g.h < hc - 0.02);
    P.signs = P.signs.filter(s => {
      if (s.z + s.h > hc - 0.04) s.z = hc - 0.04 - s.h;
      return s.z > 1.2;
    });
    for (const l of P.lights) l.z = Math.min(l.z, hc - 0.01);
    for (const s of P.secs) s.h = Math.min(s.h, hc);
    return P;
  }
  // the plan of a shop room: u = { id, type, vols: [{ f (counter-clockwise outline), h }], doors: [{ x, y, nx, ny }], staff: { x, y, nx, ny,
  // w } | null (the door to the back rooms on the room's wall, n into the room) }, hc its ceiling
  function plan(u, hc) {
    const lay = LAY[u.type];
    if (!lay) return null;
    const P = lay(LIPLAN.newPlan(u), u);
    return fit(P, hc);
  }
  return { plan, fit, LAY, laden, gaststaette, cafe, baecker, apotheke, room, sideFrame };
})();
