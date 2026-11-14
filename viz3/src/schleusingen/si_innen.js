// ===================== feat/schleusingen-innen 3: the houses of Schleusingen from inside in the normal game (SINNEN) =====================
// Falko (13.11.2026 23:56): „wann kann ich alle Gebäude begehen?“ – the houses of the old town can be entered as Ratscher's can since V18p:
// at the street door „Hineingehen · E“ (haeuser/haeuser.js, HAEUSER: its door, its fade, its lamps at night, the TV, sitting and lying), a
// moment of black, one stands inside; at that door inside „Hinausgehen · E“. The interiors are the zombie night's kit (zombie/z_innen*.js:
// the plan in the house's own outline, the windows where the facade paints them, the furniture of the looks of 2026 of haeuser/
// haeuser_heute.js); this module only adapts the town's buildings (schleusingen/si_plan.js, SIPLAN: records in an id range of their own)
// and adds what a town house has and a village house has not: the stairwell of a bigger or taller house with letter boxes and bells
// without names, one flat per storey to go into and the others locked („Verschlossen“), and behind a shop sign of the old town a shop room
// furnished with the kit of the shops (schleusingen/si_laden.js on laeden/innen*.js, drawn by LINNEN.drawPlan), open by its hours.
// Built on going in behind the fade, freed on coming out (ZINNEN); the ground of the tiled world under the house is left out while it
// stands (a copy of the tiles' material that discards the house's rectangle – one program, made behind the first fade). No new lamps.
//   SINNEN.status()   state, how many houses (by kind), why the others are not      SINNEN.list()   the doors (id, kind, door)
//   SINNEN.info(id)   kind, look, storeys, rooms, flats      SINNEN.pick(kind, x, y)   the nearest house of a kind
//   SINNEN.phone      true: the budget of a phone (one flat in a stairwell house, the shops' small parts left out)
// ?szenario=schleusingen-innen (&haus=<id> | &art=haus|treppenhaus|laden, &drin=1): in front of a house of the old town (or inside it).
import * as THREE from 'three';
import { COARSE, QS, R as RENDERER } from '../core/head.js';
import { markDirty } from '../core/assets.js';
import { KERN } from '../core/kern.js';
import { DOORS } from '../core/geo.js';
import { SAVE } from '../core/save.js';
import { P as WK } from '../game/walkable.js';
import { go } from '../game/player.js';
import { PLAY } from '../game/play.js';
import { warmUp } from '../render/render.js';
import { VILLAGE } from '../world/village.js';
import { WELT } from '../welt/welt.js';
import { SCHL } from '../welt/schleusingen.js';
import { LAEDEN } from '../laeden/laeden.js';
import { LINNEN } from '../laeden/innen.js';
import { LIPLAN } from '../laeden/innen_plan.js';
import { ZIPLAN } from '../zombie/z_innen_plan.js';
import { ZIEINR } from '../zombie/z_innen_einr.js';
import { ZINNEN } from '../zombie/z_innen.js';
import { Z } from '../zombie/z_state.js';
import { HAEUSER } from '../haeuser/haeuser.js';
import { SIPLAN } from './si_plan.js';
import { SILADEN } from './si_laden.js';
export const SINNEN = (() => {
  const S = {
    on: false,
    state: 'idle',
    recs: new Map(),
    doors: new Map(),
    grid: null,
    why: {},
    kinds: {},
    ms: 0,
    phone: false,
    err: '',
    shut: null,
  };
  if (!SCHL.on || !WELT.on) return S;
  S.on = true;
  const hyp = Math.hypot,
    PW = SIPLAN.PW,
    CELL = 8;
  const phone = () => COARSE || !!S.phone;
  const HINT = SAVE.key('pav-schl-innen-hinweis', {
    owner: 'Schleusingen von innen: Hinweis „Ausgedacht“ gezeigt',
    kind: 'flag',
    def: false,
  });
  // ---- the index of the enterable houses: when the town stands, its buildings planned a few per frame (each ~1 ms) ----
  let gen = null;
  function reset() {
    for (const id of S.recs.keys()) ZIPLAN.forget(id);
    S.recs.clear();
    S.doors.clear();
    S.grid = null;
    S.todo = null;
    S.why = {};
    S.kinds = {};
    S.state = 'idle';
    gen = null;
  }
  function begin() {
    reset();
    gen = SCHL.bld;
    S.state = 'planning';
    S.ms = 0;
    // the shops behind the signs the town draws (the same rows as welt/schleusingen.js signs(); checked against its list)
    S.signs = SIPLAN.signed(gen, !!(SCHL.rathaus && SCHL.rathaus.counterSign));
    const drawn = new Set(SCHL.signs || []);
    for (const [i, nm] of [...S.signs]) if (!drawn.has(nm)) S.signs.delete(i);
    S.todo = [];
    for (const b of gen) {
      const w = SIPLAN.rules(b);
      if (w) S.why[w] = (S.why[w] || 0) + 1;
      else S.todo.push(b);
    }
    S.todo.reverse();
  }
  function planOne(b) {
    const rec = SIPLAN.record(b),
      sname = S.signs.get(b.i) || null,
      shop = sname && LINNEN.drawPlan ? SIPLAN.shopOf(b, SCHL.data && SCHL.data.poi, sname) : null;
    rec.sign = sname;
    rec.shop = shop;
    rec.post = Pl => post(rec, Pl);
    S.recs.set(rec.id, rec);
    let Pl = null;
    try {
      Pl = ZIPLAN.plan(rec.id);
    } catch (e) {
      S.err = rec.id + ': ' + e;
    }
    if (!Pl) {
      S.recs.delete(rec.id);
      ZIPLAN.forget(rec.id);
      S.why.grundriss = (S.why.grundriss || 0) + 1;
      return;
    }
    const f = Pl.F.f,
      d = Pl.toW(Pl.front.x, 0);
    S.doors.set(rec.id, {
      id: rec.id,
      i: b.i,
      cx: rec.cx,
      cy: rec.cy,
      kind: Pl.kind,
      shop: Pl.shopType || null,
      door: { x: d[0], y: d[1], z: Pl.foot, nx: f.nx, ny: f.ny, w: Pl.front.w },
    });
    S.kinds[Pl.kind] = (S.kinds[Pl.kind] || 0) + 1;
  }
  function finish() {
    const g = new Map();
    for (const h of S.doors.values()) {
      const k = Math.floor(h.door.x / CELL) + ',' + Math.floor(h.door.y / CELL);
      if (!g.has(k)) g.set(k, []);
      g.get(k).push(h);
    }
    S.grid = g;
    S.todo = null;
    S.state = 'ready';
    S.ms = Math.round(S.ms);
    KERN.emit('schleusingen-innen:ready', { n: S.doors.size });
  }
  // what a house is after its plan (SIPLAN.kindOf): a shop room, a stairwell with flats, or the whole house (as Ratscher's)
  function post(rec, Pl) {
    const kind = SIPLAN.kindOf(Pl, rec.shop);
    if (kind === 'laden') {
      SIPLAN.shop(Pl, rec.shop);
      furnishers(Pl);
      return Pl;
    }
    if (kind === 'treppenhaus') {
      if (SIPLAN.flats(Pl, { phone: phone(), seed: rec.id })) {
        furnishers(Pl);
        return Pl;
      }
      if (Pl.nSt > 3) return null; // too tall to be one family's house
    }
    Pl.kind = 'haus';
    Pl.locked = [];
    Pl.open = [];
    return Pl;
  }
  // the rooms the kit leaves to us (zombie/z_innen_einr.js furnish: room.own)
  function furnishers(Pl) {
    for (const r of Pl.rooms) {
      if (r.trep) r.own = (C, room, Pl2) => stairwell(C, room, Pl2);
      else if (r.kind === 'diele') r.own = (C, room, Pl2) => hall(C, room, Pl2);
      else if (r.shop) r.own = (C, room, Pl2) => shopRoom(C, room, Pl2);
    }
  }
  // the phone's budget asked for again: the plans made anew
  S.setPhone = v => {
    S.phone = !!v;
    if (S.state === 'ready' || S.state === 'planning') S.again = true;
  };
  // ---- the door one stands at (as HAEUSER's for Ratscher: within reach in front of it, at its height) ----
  function nearDoor(x, y, feet, closed) {
    if (!S.grid) return null;
    const cx = Math.floor(x / CELL),
      cy = Math.floor(y / CELL);
    let best = null,
      bd = 1.9;
    for (let i = -1; i <= 1; i++)
      for (let j = -1; j <= 1; j++)
        for (const h of S.grid.get(cx + i + ',' + (cy + j)) || []) {
          const d = hyp(h.door.x + h.door.nx * 0.6 - x, h.door.y + h.door.ny * 0.6 - y);
          if (d < bd && Math.abs(h.door.z - feet) < 1.6 && !!closed === !!(h.shop && !shopOpen(h.shop))) {
            bd = d;
            best = h;
          }
        }
    return best;
  }
  // ---- the shops' hours (OSM knows none of these: what such a shop usually has – assumed) ----
  const OH = {
    baecker: 'Mo-Sa 06:00-18:00; Su 07:30-11:00',
    apotheke: 'Mo-Fr 08:00-18:30; Sa 08:00-12:00',
    cafe: 'Mo-Su 09:00-18:00',
    gaststaette: 'Mo-Su 11:00-22:00',
    laden: 'Mo-Fr 09:00-18:00; Sa 09:00-13:00',
  };
  const WEEK = {};
  function shopOpen(type) {
    if (!LAEDEN.parseOH || !LAEDEN.isOpen) return true;
    if (!WEEK[type]) WEEK[type] = LAEDEN.parseOH(OH[type] || OH.laden);
    return LAEDEN.isOpen(WEEK[type]) !== false;
  }
  S.shopOpen = shopOpen;
  // ---- the sources: the planner's buildings, HAEUSER's doors ----
  ZIPLAN.source({ has: SIPLAN.has, get: id => S.recs.get(id) || null });
  HAEUSER.addSource({
    has: SIPLAN.has,
    get: id => S.doors.get(id) || null,
    near: (x, y, feet) => (S.state === 'ready' ? nearDoor(x, y, feet, false) : null),
    lookOf: id => {
      const h = S.doors.get(id);
      return SIPLAN.lookOf(id, h ? h.kind : null);
    },
    hintKey: HINT,
    hint: h =>
      h && h.kind === 'laden'
        ? 'Ausgedacht: so könnte ein Laden in der Altstadt von Schleusingen innen aussehen – mit dem echten Geschäft hat er nichts zu tun.'
        : 'Ausgedacht: so könnte es heute in einem Haus in Schleusingen aussehen – die echten Bewohner kennt das Spiel nicht.',
  });
  // ======================================= the rooms of our own =======================================
  const box = (C, x0, x1, y0, y1, z0, z1, hex, rough = 0.6, metal = 0) =>
    C.furn.box(
      C.col(hex, rough, metal),
      Math.min(x0, x1),
      Math.max(x0, x1),
      Math.min(y0, y1),
      Math.max(y0, y1),
      z0,
      z1
    );
  // the ceiling light: the look's (LED panels of today), else a globe or a dish of the kit
  function lamp(C, room, kind) {
    const cx = (room.x0 + room.x1) / 2,
      cy = (room.y0 + room.y1) / 2;
    if (C.ext && C.ext.ceiling && C.ext.ceiling(C, room, cx, cy, room.z1)) return;
    ZIEINR.L.deckenlampe(C, cx, cy, room.z1, kind);
  }
  const MATCOL = [0x4a4440, 0x3a3f46, 0x5a4a3a, 0x6a2e2a, 0x3d4a3a];
  // the stairwell: its lamps; at each flat's door a mat, the bell with a blank plate; a locked flat's door on the wall; on the ground
  // floor the letter boxes (one per flat, no names) and the mat inside the house door
  function stairwell(C, room, Pl) {
    const P = C.P,
      z = room.z0,
      fl = room.fl,
      R = C.R,
      leafHex = (C.ext && C.ext.leaf) || 0x9a7a52;
    lamp(C, room, 'kugel');
    const all = (P.open || []).map(d => Object.assign({ open: true }, d)).concat(P.locked || []);
    for (const d of all) {
      if (d.fl !== fl) continue;
      const into = d.side === 'L' ? 1 : -1, // from the partition into the stairwell
        face = d.side === 'L' ? room.x0 : room.x1,
        y0 = d.y - d.w / 2,
        y1 = d.y + d.w / 2;
      box(C, face, face + into * 0.5, d.y - 0.36, d.y + 0.36, z + 0.002, z + 0.014, R.pick(MATCOL), 1.0);
      // the bell and its plate beside the frame (the side with more wall), the name plate above it blank
      const yb = y1 + 0.2 < room.y1 - 0.05 ? y1 + 0.17 : y0 - 0.17;
      box(C, face, face + into * 0.02, yb - 0.04, yb + 0.04, z + 1.28, z + 1.4, 0xe8e6e0, 0.4);
      box(C, face, face + into * 0.032, yb - 0.013, yb + 0.013, z + 1.31, z + 1.34, 0x2a2a2a, 0.4);
      box(C, face, face + into * 0.012, yb - 0.05, yb + 0.05, z + 1.45, z + 1.51, 0xf4f2ea, 0.5);
      if (d.open) continue;
      // a locked flat: its leaf and frame on the wall (there is no hole – nobody goes in), the handle, the spy hole
      box(C, face, face + into * 0.04, y0, y1, z, z + 2.0, leafHex, 0.55);
      box(C, face, face + into * 0.055, y0 - 0.06, y0, z, z + 2.06, leafHex, 0.5);
      box(C, face, face + into * 0.055, y1, y1 + 0.06, z, z + 2.06, leafHex, 0.5);
      box(C, face, face + into * 0.055, y0 - 0.06, y1 + 0.06, z + 2.0, z + 2.06, leafHex, 0.5);
      const yh = into > 0 ? y1 - 0.09 : y0 + 0.09;
      box(C, face + into * 0.04, face + into * 0.1, yh - 0.012, yh + 0.012, z + 1.02, z + 1.05, 0xc8b070, 0.3, 0.7);
      box(C, face + into * 0.04, face + into * 0.046, d.y - 0.012, d.y + 0.012, z + 1.5, z + 1.53, 0x2a2a2a, 0.3, 0.6);
    }
    if (fl === 0) {
      // the mat inside the house door
      box(
        C,
        P.front.x - 0.45,
        P.front.x + 0.45,
        room.y0 + 0.04,
        room.y0 + 0.64,
        z + 0.002,
        z + 0.014,
        R.pick(MATCOL),
        1.0
      );
      // the letter boxes on a side wall near the door: one per flat (at least two), each a front of 32 × 38 cm and 10 cm deep, in one row
      // (up to five) or two, their middles 1.0–1.6 m high; a slot, a small lock, a blank label – no names
      const n = Math.max(2, all.length + (P.nSt > 1 ? 0 : 1)),
        cols = n <= 5 ? n : Math.ceil(n / 2),
        rows = Math.ceil(n / cols),
        BW = 0.32,
        BH = 0.38,
        BD = 0.1,
        wB = cols * (BW + 0.01) + 0.02,
        F =
          Pl.place('x1', wB, 0.12, 1.8, 0.05) ||
          Pl.place('x0', wB, 0.12, 1.8, 0.95) ||
          Pl.any(['y1'], wB, 0.12, 1.8, 0.5);
      if (F) {
        const zb = z + (rows > 1 ? 0.92 : 1.2), // the lowest row's bottom edge
          body = R.pick([0x3b3e42, 0x8a8e92, 0xb8bcbe, 0x6a5a4a]);
        for (let i = 0; i < n; i++) {
          const c = i % cols,
            r = Math.floor(i / cols),
            u0 = F.u0 + 0.01 + c * (BW + 0.01),
            za = zb + (rows - 1 - r) * (BH + 0.02);
          F.box(C.m, C.col(body, 0.4, 0.5), u0, u0 + BW, 0, BD, za, za + BH);
          F.box(C.m, C.col(0x1a1a1a, 0.5), u0 + 0.05, u0 + BW - 0.05, BD, BD + 0.004, za + BH - 0.09, za + BH - 0.065);
          F.box(C.m, C.col(0xf4f2ea, 0.6), u0 + 0.08, u0 + BW - 0.08, BD, BD + 0.003, za + 0.17, za + 0.215);
          F.box(
            C.m,
            C.col(0xc0c2c4, 0.3, 0.8),
            u0 + BW / 2 - 0.012,
            u0 + BW / 2 + 0.012,
            BD,
            BD + 0.008,
            za + 0.08,
            za + 0.11
          );
        }
        C.solid(F.rect(F.u0, F.u0 + wB, 0, BD + 0.02), zb, zb + rows * (BH + 0.02));
      }
    } else if (R() < 0.6) {
      // a plant on the landing where there is room
      const F = Pl.any(['x0', 'x1', 'y1'], 0.45, 0.45, 1.2, R());
      if (F) {
        F.cyl(C.m, C.col(R.pick([0xb8693e, 0x3b3e42, 0xe8e4dc]), 0.8), F.u0 + 0.22, 0.22, z, z + 0.36, 0.16, 0.2, 10);
        F.cyl(C.m, C.col(0x3f6a3a, 0.9), F.u0 + 0.22, 0.22, z + 0.36, z + 0.95, 0.24, 0.12, 8);
        C.solid(F.rect(F.u0, F.u0 + 0.45, 0, 0.45), z, z + 0.9);
      }
    }
    return true;
  }
  // a flat's hall: its light, a coat rack with the shoes under it, a shoe cupboard with a mirror, a runner
  function hall(C, room, Pl) {
    const z = room.z0,
      R = C.R;
    lamp(C, room, 'fluter');
    let F = Pl.any(['x0', 'x1', 'y1', 'y0'], 1.0, 0.34, 1.75, 0.3);
    if (F) ZIEINR.L.garderobe(C, F);
    F = Pl.any(['x1', 'x0', 'y0', 'y1'], 0.8, 0.32, 1.0, 0.6);
    if (F) {
      const body = C.col(R.pick([0xf2f2ef, 0x9a9c9c, 0xc9a77a]), 0.4);
      F.box(C.m, body, F.u0, F.u0 + 0.8, 0, 0.32, z + 0.05, z + 0.9);
      if (Pl.wallFree(F.side, F.u0 + 0.1, F.u0 + 0.7, z + 1.1, z + 1.9)) {
        F.box(C.m, C.col(0x1d1e20, 0.4, 0.3), F.u0 + 0.12, F.u0 + 0.68, 0, 0.025, z + 1.15, z + 1.85);
        F.box(C.m, C.col(0xb8c4c8, 0.22, 0.85), F.u0 + 0.14, F.u0 + 0.66, 0.025, 0.03, z + 1.17, z + 1.83);
      }
      C.solid(F.rect(F.u0, F.u0 + 0.8, 0, 0.32), z, z + 0.9);
    }
    const lx = room.x1 - room.x0 > room.y1 - room.y0,
      cx = (room.x0 + room.x1) / 2,
      cy = (room.y0 + room.y1) / 2,
      hl = 0.4;
    if (lx) box(C, room.x0 + 0.4, room.x1 - 0.4, cy - hl, cy + hl, z + 0.002, z + 0.012, R.pick(MATCOL), 1.0);
    else box(C, cx - hl, cx + hl, room.y0 + 0.4, room.y1 - 0.4, z + 0.002, z + 0.012, R.pick(MATCOL), 1.0);
    return true;
  }
  // the door to the back rooms (SIPLAN.shop: on the sales room's back or side wall) in model metres, its normal into the room
  function staffW(P) {
    const s = P.staff;
    if (!s) return null;
    const n = s.side === 'y1' ? [0, -1] : s.side === 'x0' ? [1, 0] : [-1, 0],
      p = P.toW(s.x, s.y);
    return { x: p[0], y: p[1], nx: n[0] * P.F.c - n[1] * P.F.s, ny: n[0] * P.F.s + n[1] * P.F.c, w: s.w };
  }
  // a shop room: the layout of its kind (schleusingen/si_laden.js) in the room's outline, what stops one as colliders of the house; the
  // fixtures are drawn when the house stands (shopMesh) – of the kit of the shops, in vertex colours with the light baked in
  function shopRoom(C, room) {
    const P = C.P;
    lamp(C, room, 'fluter');
    const corners = [
        [room.x0, room.y0],
        [room.x1, room.y0],
        [room.x1, room.y1],
        [room.x0, room.y1],
      ].map(([x, y]) => P.toW(x, y)),
      f = LIPLAN.ccw(corners.flat()),
      dw = P.toW(P.front.x, room.y0),
      u = {
        id: 'si' + P.id,
        type: room.shop,
        name: room.name,
        vols: [{ f, h: room.z1 - room.z0 + 1.0 }],
        doors: [{ x: dw[0], y: dw[1], nx: P.F.f.nx, ny: P.F.f.ny, k: 'main' }],
        staff: staffW(P),
      };
    let L = null;
    try {
      L = SILADEN.plan(u, room.z1 - room.z0);
    } catch (e) {
      S.err = 'laden ' + P.id + ': ' + e;
    }
    room.shopPlan = L;
    room.shopF = f;
    if (!L) return true;
    for (const s of L.segs) {
      const a = P.toL(s[0], s[1]),
        b = P.toL(s[2], s[3]);
      C.solid(
        [
          Math.min(a[0], b[0]) - 0.03,
          Math.max(a[0], b[0]) + 0.03,
          Math.min(a[1], b[1]) - 0.03,
          Math.max(a[1], b[1]) + 0.03,
        ],
        room.z0,
        room.z0 + 1.1
      );
    }
    return true;
  }
  // the fixtures' material: unlit vertex colours (the program of the Rathaus hall and the shops' rooms), its colour the light of the moment
  let SHOPMAT = null;
  const shopMat = () => SHOPMAT || (SHOPMAT = new THREE.MeshBasicMaterial({ vertexColors: true }));
  function shopMesh(H) {
    const r = H.plan.rooms.find(q => q.shop && q.shopPlan);
    if (!r || !LINNEN.drawPlan) return null;
    const z = r.z0,
      out = LINNEN.drawPlan(r.shopPlan, r.shopF, () => z);
    if (!out) return null;
    const me = new THREE.Mesh(out.geo, shopMat());
    me.name = 'schleusingen-innen laden ' + H.id;
    me.userData.noMerge = true;
    me.castShadow = false;
    me.receiveShadow = false;
    me.matrixAutoUpdate = false;
    H.group.updateMatrixWorld(true);
    me.matrix.copy(H.group.matrixWorld).invert(); // the kit draws in model metres: undo the house's frame
    H.group.add(me);
    me.updateMatrixWorld(true);
    H.siShop = { me, tris: out.tris, type: r.shop };
    shopLight(H, true);
    return me;
  }
  function shopLight(H, now) {
    if (!H || !H.siShop) return;
    const open = shopOpen(H.siShop.type),
      ex = RENDERER.toneMappingExposure || 1.3,
      night = VILLAGE.night ? VILLAGE.night() : 0,
      base = open ? 0.8 : 0.16 + 0.3 * (1 - Math.min(1, night / 0.3)),
      k = (base * 1.3) / Math.max(0.5, ex),
      m = shopMat();
    if (now || Math.abs(m.color.r - k) > 0.004) {
      m.color.setScalar(k);
      markDirty();
    }
  }
  // ======================================= while a house of ours stands =======================================
  // ---- the ground of the tiled world under the house left out (the walls hide the cut): the tiles over the house wear a copy of their
  // material that discards the house's rectangle; a tile that comes meanwhile gets it too; one program for all copies, made behind the
  // first fade (a copy is kept so that it stays) ----
  const HOLE = { r: { value: new THREE.Vector4() }, b: { value: new THREE.Vector4(1, -1, 1, -1) } };
  const COPY = new Map(), // the tile's material → its copy
    WORN = new Map(); // a tile's mesh → its own material
  let KEEP = null,
    holeBB = null;
  function copyOf(m) {
    let c = COPY.get(m);
    if (c) return c;
    c = m.clone();
    const prev = m.onBeforeCompile;
    c.onBeforeCompile = (sh, r) => {
      prev.call(m, sh, r);
      sh.uniforms.uSIH = HOLE.r;
      sh.uniforms.uSIHB = HOLE.b;
      sh.fragmentShader =
        'uniform vec4 uSIH, uSIHB;\n' +
        sh.fragmentShader.replace(
          'void main() {',
          `void main() {
          { vec2 hd = vGeo - uSIH.xy, hl = vec2( dot( hd, uSIH.zw ), dot( hd, vec2( -uSIH.w, uSIH.z ) ) );
            if ( hl.x > uSIHB.x && hl.x < uSIHB.y && hl.y > uSIHB.z && hl.y < uSIHB.w ) discard; }`
        );
    };
    const key = m.customProgramCacheKey.bind(m);
    c.customProgramCacheKey = () => key() + '|si-loch';
    c.userData.siOwn = m;
    COPY.set(m, c);
    return c;
  }
  const tsize = L => 409600 / (1 << L);
  function tileOver(t, bb) {
    const s = tsize(t.L),
      cs = [WELT.toM(t.e0, t.n0), WELT.toM(t.e0 + s, t.n0), WELT.toM(t.e0, t.n0 + s), WELT.toM(t.e0 + s, t.n0 + s)];
    return !(
      Math.max(...cs.map(c => c[0])) < bb[0] ||
      Math.min(...cs.map(c => c[0])) > bb[2] ||
      Math.max(...cs.map(c => c[1])) < bb[1] ||
      Math.min(...cs.map(c => c[1])) > bb[3]
    );
  }
  function holeSync() {
    if (!holeBB || !WELT.tiles) return;
    for (const t of WELT.tiles.values()) {
      const me = t.mesh;
      if (!me || WORN.has(me) || !tileOver(t, holeBB)) continue;
      const m = me.material;
      if (!m || !m.onBeforeCompile || (m.userData && m.userData.siOwn)) continue;
      WORN.set(me, m);
      me.material = copyOf(m);
      markDirty();
    }
    // a tile freed meanwhile took its copy with it (WELT disposes the mesh's material): its own material goes too
    for (const [me, m] of [...WORN])
      if (!me.parent) {
        WORN.delete(me);
        if (COPY.get(m) !== KEEP) {
          COPY.delete(m);
          m.dispose();
        }
      }
  }
  function holeOn(Pl) {
    HOLE.r.value.set(Pl.F.ox, Pl.F.oy, Pl.F.c, Pl.F.s);
    HOLE.b.value.set(Pl.xi0 - Pl.t + 0.02, Pl.xi1 + Pl.t - 0.02, Pl.yi0 - Pl.t + 0.02, Pl.yi1 + Pl.t - 0.02);
    const cs = [
      [Pl.X0, 0],
      [Pl.X1, 0],
      [Pl.X1, Pl.D],
      [Pl.X0, Pl.D],
    ].map(([x, y]) => Pl.toW(x, y));
    holeBB = [
      Math.min(...cs.map(c => c[0])) - 1,
      Math.min(...cs.map(c => c[1])) - 1,
      Math.max(...cs.map(c => c[0])) + 1,
      Math.max(...cs.map(c => c[1])) + 1,
    ];
    holeSync();
    // the program made now, behind the fade: the first copy is kept (its program stays when the others are freed)
    if (!KEEP) {
      const first = [...WORN.values()][0];
      if (first) {
        KEEP = COPY.get(first);
        try {
          const g = new THREE.Group(),
            geo = new THREE.BoxGeometry(0.01, 0.01, 0.01);
          g.add(new THREE.Mesh(geo, KEEP));
          warmUp(g);
          geo.dispose();
        } catch (e) {
          console.warn('schleusingen-innen warm', e);
        }
      }
    }
  }
  function holeOff() {
    for (const [me, m] of WORN) {
      const c = me.material;
      me.material = m;
      if (c !== m && c !== KEEP) {
        COPY.delete(m);
        c.dispose();
      }
    }
    WORN.clear();
    holeBB = null;
    HOLE.b.value.set(1, -1, 1, -1);
    markDirty(true);
  }
  // ---- a locked flat's door: „Verschlossen“ ----
  function lockActs(H) {
    const Pl = H.plan;
    H.siActs = [];
    (Pl.locked || []).forEach((d, i) => {
      const into = d.side === 'L' ? 1 : -1,
        p = Pl.toW(d.x + into * (PW / 2 + 0.3), d.y),
        z = Pl.zF[d.fl],
        id = 'si:zu:' + H.id + ':' + i;
      KERN.act({
        id,
        r: 1.3,
        prio: 0.15,
        pos: [p[0], p[1], z + 1.1],
        label: () => (HAEUSER.H === H && !PLAY.seated() && Math.abs(WK.feet - z) < 1.2 ? 'Verschlossen' : null),
        gest3: 'interact',
        run: () => PLAY.think('Die Wohnungstür ist verschlossen – hier wohnt jemand anderes.', 2400),
      });
      H.siActs.push(id);
    });
    const sw = Pl.staff && staffW(Pl);
    if (sw) {
      const id = 'si:personal:' + H.id,
        z = Pl.zF[0];
      KERN.act({
        id,
        r: 1.3,
        prio: 0.15,
        pos: [sw.x + sw.nx * 0.3, sw.y + sw.ny * 0.3, z + 1.1],
        label: () => (HAEUSER.H === H && !PLAY.seated() ? 'Nur für Personal' : null),
        gest3: 'interact',
        run: () => PLAY.think('Nur für Personal – dahinter sind das Lager und das Büro.', 2400),
      });
      H.siActs.push(id);
    }
  }
  // ---- going in and out (ZINNEN's events, behind HAEUSER's fade) ----
  let cur = null;
  KERN.on('zinnen:mount', e => {
    if (!e || !SIPLAN.has(e.id)) return;
    const H = ZINNEN.mounted().find(q => q.id === e.id);
    if (!H) return;
    cur = H;
    try {
      holeOn(H.plan);
      shopMesh(H);
      lockActs(H);
      if (H.siShop) {
        const g = new THREE.Group();
        g.add(new THREE.Mesh(new THREE.BoxGeometry(0.01, 0.01, 0.01), shopMat()));
        warmUp(g);
        g.children[0].geometry.dispose();
      }
      H.siTris = trisOf(H);
    } catch (err) {
      S.err = 'mount ' + e.id + ': ' + err;
      console.warn('schleusingen-innen mount', err);
    }
  });
  KERN.on('zinnen:unmount', e => {
    if (!e || !SIPLAN.has(e.id) || !cur || cur.id !== e.id) return;
    for (const id of cur.siActs || []) KERN.unact(id);
    holeOff();
    cur = null;
  });
  // every triangle the house draws: its shell and furniture, the door leaves, the shop's fixtures (the glowing copies of lit lamps aside)
  function trisOf(H) {
    let n = 0;
    const count = o => {
      if (!o.isMesh || !o.geometry) return;
      const g = o.geometry;
      n += g.index ? g.index.count / 3 : g.attributes.position.count / 3;
    };
    H.group.traverse(count);
    for (const k of H.doorKeys) {
      const D = DOORS[k];
      if (D && D.group) D.group.traverse(count);
    }
    return Math.round(n);
  }
  // ---- the place on the HUD: the room, in Schleusingen ----
  KERN.provide(
    'place',
    (x, y, z) => {
      const H = cur;
      if (!H || !H.inside(x, y, z)) return undefined;
      const rid = H.roomAt(x, y, z),
        r = rid && H.rooms.find(q => q.id === rid);
      return (r ? r.name : 'Im Haus') + ', Schleusingen';
    },
    96
  );
  // ---- a shop closed: the label at its door ----
  KERN.act({
    id: 'si:geschlossen',
    r: 2.0,
    prio: 0.3,
    pos: () => {
      const h = S.shut;
      return h ? [h.door.x + h.door.nx * 0.3, h.door.y + h.door.ny * 0.3, h.door.z + 1] : null;
    },
    label: () => (S.shut && !HAEUSER.H && !HAEUSER.busy ? 'Geschlossen' : null),
    gest3: 'interact',
    run: () => {
      const h = S.shut;
      if (!h) return;
      PLAY.think(
        (SIPLAN.SHOPNAME[h.shop] || 'Laden') +
          ': geschlossen' +
          (LAEDEN.ohShort ? ' – geöffnet ' + LAEDEN.ohShort(OH[h.shop] || OH.laden) + '.' : '.'),
        3000
      );
    },
  });
  // ---- per frame: the planning in slices, the doors nearby (5 times a second), the shop's light ----
  let acc = 0,
    acc2 = 0;
  KERN.tick(dt => {
    // the town came, went, or was built anew
    const ready = SCHL.state === 'ready' && SCHL.bld && SCHL.bld.length;
    if (!ready) {
      if (S.state !== 'idle' && !cur) reset();
      return;
    }
    if (SCHL.bld !== gen || (S.again && !cur)) {
      S.again = false;
      begin();
    }
    if (S.todo) {
      const t0 = performance.now();
      while (S.todo.length && performance.now() - t0 < 3) planOne(S.todo.pop());
      S.ms += performance.now() - t0;
      if (!S.todo.length) finish();
      return;
    }
    acc += dt;
    acc2 += dt;
    if (acc >= 0.2) {
      acc = 0;
      S.shut = !HAEUSER.H && WK.mode === 'walk' && !Z.on ? nearDoor(WK.x, WK.y, WK.feet, true) : null;
    }
    if (cur && acc2 >= 0.5) {
      acc2 = 0;
      holeSync();
      shopLight(cur, false);
    }
  }, 'schleusingen-innen');
  // ======================================= the scene and the API =======================================
  S.status = () => ({
    on: S.on,
    state: S.state,
    town: SCHL.state,
    n: S.doors.size,
    kinds: Object.assign({}, S.kinds),
    why: Object.assign({}, S.why),
    signs: S.signs ? [...S.signs.values()] : [],
    shops: [...S.doors.values()].filter(h => h.shop).map(h => ({ id: h.id, shop: h.shop })),
    ms: Math.round(S.ms),
    err: S.err,
    phone: phone(),
    mounted: cur
      ? { id: cur.id, kind: cur.plan.kind, tris: cur.siTris || 0, shopTris: cur.siShop ? cur.siShop.tris : 0 }
      : null,
  });
  S.list = () => [...S.doors.values()].map(h => Object.assign({}, h, { door: Object.assign({}, h.door) }));
  S.info = id => {
    const Pl = ZIPLAN.plan(id),
      h = S.doors.get(id);
    if (!Pl || !h) return null;
    return {
      id,
      kind: Pl.kind,
      shop: Pl.shopType || null,
      sign: (S.recs.get(id) || {}).sign || null,
      look: SIPLAN.lookOf(id, Pl.kind),
      storeys: Pl.nSt,
      attic: !!Pl.attic,
      cellar: !!Pl.cellar,
      rooms: Pl.rooms.map(r => ({ id: r.id, kind: r.kind, floor: r.fl, name: r.name })),
      open: (Pl.open || []).length,
      locked: (Pl.locked || []).length,
      check: SIPLAN.check(Pl),
    };
  };
  S.pick = (kind, x, y) => {
    let best = null,
      bd = 1e9;
    for (const h of S.doors.values()) {
      if (kind && h.kind !== kind) continue;
      const d = hyp(h.door.x - x, h.door.y - y);
      if (d < bd) {
        bd = d;
        best = h.id;
      }
    }
    return best;
  };
  S.nearDoor = () => nearDoor(WK.x, WK.y, WK.feet, false);
  S.H = () => cur;
  // in front of a house's door, facing it
  function before(h) {
    const x = h.door.x + h.door.nx * 1.6,
      y = h.door.y + h.door.ny * 1.6,
      yaw = ((Math.atan2(-h.door.nx, -h.door.ny) * 180) / Math.PI + 360) % 360;
    KERN.spot('schleusingen-innen', {
      mode: 'walk',
      pos: [x, y],
      z: KERN.ground(x, y),
      yaw,
      pitch: -4,
      label: 'Vor einem Haus in Schleusingen',
    });
    go('schleusingen-innen');
  }
  S.before = id => {
    const h = S.doors.get(id);
    if (h) before(h);
    return !!h;
  };
  KERN.scenario('schleusingen-innen', {
    label: 'Schleusingen von innen',
    order: 31,
    run: () => {
      go('schleusingen');
      S.scenWait = KERN.until(() => S.state === 'ready', 900).then(() => {
        const want = +QS.get('haus') || 0,
          art = QS.get('art') || 'haus',
          M = SCHL.MARKT,
          id = want && S.doors.has(want) ? want : S.pick(art, M[0], M[1]) || S.pick(null, M[0], M[1]),
          h = S.doors.get(id);
        if (!h) return null;
        before(h);
        S.scen = id;
        if (QS.get('drin')) return HAEUSER.enter(h);
        return id;
      });
      return S.scenWait;
    },
  });
  return S;
})();
window.SINNEN = SINNEN;
window.SIPLAN = SIPLAN; // the pure parts, for tests and the console
window.SILADEN = SILADEN;
