// ===================== feat/schleusingen-innen 2: the shop rooms behind the signs of the old town – layouts, pure (SILADEN) =====================
// A ground floor with a shop sign of the old town (welt/schleusingen.js signs()) is one room behind the house door, furnished with the kit
// of the shops (laeden/innen_plan.js LIPLAN, the layouts of laeden/innen_markt.js and innen_haus.js): a bakery (the counter with its display,
// bread on the wall, a few tables), a pharmacy (the counter, drawers behind, the free choice on the side walls), a café (the bakery café),
// an inn or restaurant (the bar with bottles behind it, tables with chairs, a coat rack), a shop with shelves (wall shelves, a low gondola,
// the counter with the till). Goods as plain packaging, no brands; a sign says only what kind of shop it is. Pure (node tests:
// viz3/test/unit/schleusingen_innen.test.mjs); schleusingen/si_innen.js draws the plan with LINNEN.drawPlan.
import { LIPLAN } from '../laeden/innen_plan.js';
import { LIMARKT } from '../laeden/innen_markt.js';
import { LIHAUS } from '../laeden/innen_haus.js';
export const SILADEN = (() => {
  const { L, rnd, hash, kit } = LIPLAN;
  const { C, PAL, wallShelf, gondola, goodsRunU, hallFrame } = LIMARKT;
  const H = LIHAUS.H;
  // the frame of the room at its door (u along the front, v into the room) and the local box
  function frameOf(u) {
    const hall = u.vols[0],
      F = hallFrame(hall, u.doors[0]),
      [U0, V0, U1, V1] = LIPLAN.bbOf(F.polyL(hall.f));
    return { hall, F, U0, V0, U1, V1 };
  }
  // a frame along a side wall of the room: u along the wall, v into the room (side −1: the wall at U0, +1: at U1)
  function sideFrame(G, side) {
    const { F, U0, U1, V1 } = G;
    if (side < 0) return LIPLAN.frame(F.W(U0, V1), [-F.ev[0], -F.ev[1]]);
    return LIPLAN.frame(F.W(U1, 0), F.ev);
  }
  // ---- a shop with shelves: wall shelves on the side walls, a low gondola where it is wide, the counter with the till at the back ----
  const PALS = ['haushalt', 'drogerie', 'suess', 'kaffee', 'backen', 'gewuerze', 'tier', 'wein'];
  function laden(P, u) {
    const R = rnd(hash(u.id) + 41),
      G = frameOf(u),
      { F, U0, U1, V1 } = G,
      K = kit(P, F, 0),
      W = U1 - U0,
      hc = Math.min(3.0, u.vols[0].h - 1.0),
      pal = PALS[Math.floor(R() * PALS.length)],
      pal2 = PALS[(PALS.indexOf(pal) + 3) % PALS.length],
      de = F.L(u.doors[0].x, u.doors[0].y);
    P.secs.push({ id: 0, vols: [0], h: hc });
    P.floor = { floorA: L(0.72, 0.68, 0.62), floorB: L(0.68, 0.64, 0.58) };
    P.cell = 0.5;
    // the counter at the back, a shelf behind it
    const vC = V1 - 1.1,
      um = (U0 + U1) / 2,
      cw = Math.min(2.4, W - 1.6);
    if (cw >= 1.2) {
      K.box(um, vC, 0, cw, 0.6, 0.95, H.wood, C.counter);
      K.box(um + cw / 2 - 0.35, vC, 0.95, 0.38, 0.32, 0.12, C.counterD); // the till
      K.glow(um + cw / 2 - 0.35, vC + 0.12, 1.07, 0.26, 0.01, 0.16, C.screen);
      K.solid(um, vC, cw, 0.65);
      K.spot('theke', um, vC + 0.6, [0, -1]);
      wallShelf(K, R, um - cw / 2, um + cw / 2, V1 - 0.02, -1, { d: 0.4, h: 2.0, pal, kinds: ['box', 'jar'] });
    }
    // the side walls: shelves from the front windows to the counter
    const v0 = 0.9,
      v1 = vC - 0.9;
    for (const sd of [-1, 1]) {
      if (v1 - v0 < 1.2) break;
      const F2 = sideFrame(G, sd),
        K2 = kit(P, F2, 0),
        // the side frame runs from the back (U0 wall) or from the front (U1 wall)
        a = sd < 0 ? V1 - v1 : v0,
        b = sd < 0 ? V1 - v0 : v1;
      wallShelf(K2, R, a, b, 0.02, 1, { d: 0.5, h: 2.0, pal: sd < 0 ? pal : pal2, kinds: ['box', 'bottle', 'jar'] });
    }
    // a low gondola down the middle where the shop is wide and deep enough (a way of 1.1 m either side, 2.6 m free behind the door)
    if (W >= 4.6 && v1 - 2.6 > 2.0)
      gondola(K, R, um, 2.6, v1 - 0.4, {
        d: 0.8,
        h: 1.4,
        levels: [0.14, 0.52, 0.9],
        aisle: ['', pal2, ['box', 'bag']],
      });
    // a basket stand at the door
    K.box(de[0] + (de[0] < um ? 0.9 : -0.9), 0.7, 0, 0.42, 0.32, 0.5, L(0.6, 0.2, 0.16));
    for (let uu = U0 + 1.2; uu < U1 - 0.8; uu += 2.2) K.light(uu, V1 / 2, hc - 0.03, 0.4, Math.max(1, V1 - 2.4));
    P.frame = F;
    return P;
  }
  // ---- an inn or a restaurant: the bar at a side wall near the back with bottles on shelves behind it, tables with chairs ----
  function gaststaette(P, u) {
    const R = rnd(hash(u.id) + 47),
      G = frameOf(u),
      { F, U0, U1, V1 } = G,
      K = kit(P, F, 0),
      W = U1 - U0,
      hc = Math.min(3.0, u.vols[0].h - 1.0),
      de = F.L(u.doors[0].x, u.doors[0].y),
      side = de[0] < (U0 + U1) / 2 ? 1 : -1; // the bar on the wall away from the door
    P.secs.push({ id: 0, vols: [0], h: hc });
    P.floor = { floorA: L(0.5, 0.36, 0.24), floorB: L(0.47, 0.34, 0.23) };
    P.cell = 0.6;
    P.wallCol = L(0.86, 0.8, 0.68);
    // the bar: along the side wall, its front 1.2 m off the wall, from the back
    const bl = Math.min(3.6, V1 - 2.4),
      ub = side > 0 ? U1 - 1.25 : U0 + 1.25,
      vb = V1 - 0.3 - bl / 2;
    if (bl >= 1.6) {
      K.box(ub, vb, 0, 0.55, bl, 1.05, H.wood, H.woodL);
      K.box(ub - side * 0.18, vb, 1.05, 0.35, bl, 0.05, H.woodL); // the bar top
      K.box(ub - side * 0.33, vb, 0.15, 0.06, bl, 0.05, C.counterD); // the foot rail
      K.solid(ub, vb, 0.7, bl);
      // the tap, glasses on the counter
      K.box(ub, vb - bl / 2 + 0.5, 1.05, 0.12, 0.3, 0.35, L(0.7, 0.71, 0.72));
      for (let k = 0; k < 4; k++)
        K.good('jar', ub + side * 0.05, vb + 0.2 + k * 0.16, 1.1, 'v', 0.08, 0.08, 0.14, L(0.75, 0.8, 0.82));
      // behind it, on the wall: shelves with bottles
      const F2 = sideFrame(G, side),
        K2 = kit(P, F2, 0),
        a = side < 0 ? V1 - (vb + bl / 2) : vb - bl / 2,
        b = a + bl;
      for (const z of [1.15, 1.5, 1.85]) {
        K2.box((a + b) / 2, 0.15, z - 0.03, bl, 0.26, 0.03, H.woodL);
        goodsRunU(K2, R, a + 0.05, b - 0.05, 0.27, 1, z, 0.33, 0.2, PAL.wein, ['bottle']);
      }
      K2.box((a + b) / 2, 0.3, 0, bl, 0.55, 0.9, H.wood, H.woodL); // the back counter
      K.spot('theke', ub + side * 0.6, vb, [-side, 0]);
    }
    // tables for four in rows, off the bar and the door
    const uMin = side > 0 ? U0 + 0.9 : U0 + 2.3,
      uMax = side > 0 ? U1 - 2.3 : U1 - 0.9;
    for (let vv = 1.4; vv < V1 - 1.0; vv += 2.3)
      for (let uu = uMin + 0.4; uu < uMax - 0.3; uu += 2.2) {
        if (Math.abs(uu - de[0]) < 1.2 && vv < 2.4) continue;
        LIHAUS.table(K, uu, vv, 0.8, 0.8, R() < 0.5 ? H.oak : H.wood, 0, 4);
        if (R() < 0.6) K.good('jar', uu, vv, 0.76, 'u', 0.07, 0.07, 0.12, L(0.85, 0.82, 0.72)); // a candle, a menu stand
      }
    // a coat rack by the door
    const cu = de[0] + (side > 0 ? -1.1 : 1.1);
    if (cu > U0 + 0.3 && cu < U1 - 0.3) {
      K.box(cu, 0.35, 0, 0.05, 0.05, 1.8, H.dark);
      for (let k = 0; k < 3; k++) K.box(cu + (k - 1) * 0.1, 0.35, 1.62, 0.04, 0.2, 0.03, H.dark);
    }
    for (let uu = U0 + 1.3; uu < U1 - 0.9; uu += 2.4)
      for (let vv = 1.5; vv < V1 - 0.8; vv += 2.6) K.light(uu, vv, hc - 0.03, 0.36, 0.36);
    void W;
    P.frame = F;
    return P;
  }
  // ---- the café: the bakery café of the shops (its counter with the display, the bread wall, tables) under a sign of its kind ----
  function cafe(P, u) {
    LIHAUS.baecker(P, u);
    for (const s of P.signs) if (s.t.length === 1 && s.t[0] === 'Bäckerei') s.t = ['Café'];
    return P;
  }
  const LAY = { baecker: LIHAUS.baecker, apotheke: LIHAUS.apotheke, cafe, gaststaette, laden };
  // everything under the house's ceiling hc (the shops' halls are higher than a town house's ground floor): what reaches above is cut,
  // a sign comes down, a light strip hangs at the ceiling
  function fit(P, hc) {
    P.boxes = P.boxes.filter(b => b.z < hc - 0.03);
    for (const b of P.boxes) if (b.z + b.sz > hc - 0.01) b.sz = Math.max(0.01, hc - 0.01 - b.z);
    P.goods = P.goods.filter(g => g.z + g.h < hc - 0.02);
    P.signs = P.signs.filter(s => {
      if (s.z + s.h > hc - 0.04) s.z = hc - 0.04 - s.h;
      return s.z > 1.5;
    });
    for (const l of P.lights) l.z = Math.min(l.z, hc - 0.01);
    for (const s of P.secs) s.h = Math.min(s.h, hc);
    return P;
  }
  // the plan of a shop room: u = { id, type, vols: [{ f (counter-clockwise outline), h }], doors: [{ x, y, nx, ny }] }, hc its ceiling
  function plan(u, hc) {
    const lay = LAY[u.type];
    if (!lay) return null;
    const P = lay(LIPLAN.newPlan(u), u);
    return fit(P, hc);
  }
  return { plan, fit, LAY, laden, gaststaette, cafe, frameOf, sideFrame };
})();
