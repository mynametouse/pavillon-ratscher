// ===================== feat/zombie-innen: the floor plan of a village house from its footprint (ZIPLAN) =====================
// Pure planning, no meshes: for one building of world/village.js (VILLAGE.bld) the house frame (x along the facade with the front door, y into
// the house), the largest rectangle of the footprint that starts at that facade and holds the door (the rest of an L-shaped plan stays solid),
// the storeys (2.75 m each, as the facade shader draws them), the windows exactly where the facade shader paints them (world/village.js
// wallMat: plinth, storey, bays of L / nb), and the layout of a central German Ernhaus (docs/plans/zombie_einrichtung.md): the Ern (hall)
// through the house with the stairs, Stube at the street corner with the Küche behind it (the tiled stove is fed from the kitchen), Kammer and
// the former stable (Bad, Vorratskammer) on the other side; bedrooms upstairs; a cellar under the kitchen (trapdoor), the attic under the roof.
// Everything is deterministic: the same house gets the same plan, look and furniture seed every time.
import { VILLAGE } from '../world/village.js';
export const ZIPLAN = (() => {
  const ST = 2.75, // storey height (the facade shader: stH)
    SLAB = 0.22, // floor thickness (joists and boards)
    PW = 0.12, // partition thickness
    G = 0.25; // raster of the largest-rectangle search
  // a small deterministic random generator per seed (garden/garten_kit.js rng: the same stream, no global state)
  function rng(seed = 1) {
    let s = Math.abs(Math.floor(seed)) % 2147483647 || 1;
    const f = () => (s = (s * 16807) % 2147483647) / 2147483647;
    f.r = (a, b) => a + (b - a) * f();
    f.pick = a => a[Math.floor(f() * a.length) % a.length];
    f.chance = p => f() < p;
    return f;
  }
  const hh = n => {
    const s = Math.sin(n * 12.9898 + 4.1) * 43758.5453;
    return s - Math.floor(s);
  };
  // the look of a facade as the facade shader sees it (world/village.js faceLook: a facade facing an azimuth of the table's `faces`)
  function faceLook(o, f) {
    if (!o || !o.faces) return o || {};
    const az = (Math.atan2(f.nx, f.ny) * 180) / Math.PI;
    for (const [a, F] of o.faces) if (Math.abs(((az - a + 540) % 360) - 180) < 50) return Object.assign({}, o, F);
    return o;
  }
  // ---- the house frame: origin at the start of the front facade (outer line), x along it, y into the house ----
  function frameOf(b) {
    const f = b && b.fac && b.fac.find(q => q.door);
    if (!f || !f.door) return null;
    let ox = f.ax,
      oy = f.ay,
      c = f.dx,
      s = f.dy,
      du = f.door.u;
    if (-s * -f.nx + c * -f.ny < 0) {
      ox = f.bx;
      oy = f.by;
      c = -c;
      s = -s;
      du = f.L - du;
    }
    return { f, ox, oy, c, s, du, dw: f.door.w || 1.05 };
  }
  const toL = (F, x, y) => [(x - F.ox) * F.c + (y - F.oy) * F.s, -(x - F.ox) * F.s + (y - F.oy) * F.c];
  const toW = (F, lx, ly) => [F.ox + lx * F.c - ly * F.s, F.oy + lx * F.s + ly * F.c];
  const inPoly = (x, y, poly) => {
    let c = false;
    for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
      const a = poly[i],
        q = poly[j];
      if (a[1] > y !== q[1] > y && x < ((q[0] - a[0]) * (y - a[1])) / (q[1] - a[1]) + a[0]) c = !c;
    }
    return c;
  };
  // ---- the largest rectangle that starts at the front line (y = 0) and spans the door ----
  function rectOf(b, F) {
    const poly = b.fac.map(q => toL(F, q.ax, q.ay));
    let xmin = 1e9,
      xmax = -1e9,
      ymax = 0;
    for (const [x, y] of poly) {
      xmin = Math.min(xmin, x);
      xmax = Math.max(xmax, x);
      ymax = Math.max(ymax, y);
    }
    const nx = Math.max(1, Math.round((xmax - xmin) / G)),
      ny = Math.max(1, Math.round(ymax / G)),
      gx = (xmax - xmin) / nx,
      gy = ymax / ny,
      run = [];
    for (let i = 0; i < nx; i++) {
      let j = 0;
      while (j < ny && inPoly(xmin + (i + 0.5) * gx, (j + 0.5) * gy, poly)) j++;
      run.push(j);
    }
    const d0 = Math.max(0, Math.floor((F.du - 0.6 - xmin) / gx)),
      d1 = Math.min(nx - 1, Math.floor((F.du + 0.6 - xmin) / gx));
    let best = null;
    for (let i0 = d0; i0 >= 0; i0--) {
      let h = 1e9;
      for (let i = i0; i <= d1; i++) h = Math.min(h, run[i]);
      for (let i1 = d1; i1 < nx; i1++) {
        h = Math.min(h, run[i1]);
        if (!h) break;
        const a = (i1 - i0 + 1) * gx * h * gy;
        if (!best || a > best.a + 0.01) best = { a, i0, i1, h };
      }
    }
    if (!best) return null;
    let X0 = xmin + best.i0 * gx,
      X1 = xmin + (best.i1 + 1) * gx,
      D = best.h * gy;
    // snap to facade lines nearby (the walls of a rectangular house are its facades)
    for (const q of b.fac) {
      const [ax, ay] = toL(F, q.ax, q.ay),
        [bx, by] = toL(F, q.bx, q.by);
      if (Math.abs(ax - bx) < 0.12) {
        const x = (ax + bx) / 2;
        if (Math.abs(x - X0) < 0.4) X0 = x;
        if (Math.abs(x - X1) < 0.4) X1 = x;
      }
      if (Math.abs(ay - by) < 0.12) {
        const y = (ay + by) / 2;
        if (Math.abs(y - D) < 0.4) D = y;
      }
    }
    return { X0, X1, D, poly, solid: best.a < Math.abs(b.area) * 0.85 };
  }
  // ---- the windows of one facade as the facade shader paints them (world/village.js wallMat) ----
  function facadeWindows(b, f) {
    const o = faceLook(b.st, f),
      st = o.style,
      house = st < 6.5 || st > 12.5,
      raised = !!o.raised,
      plH = house ? (raised ? 0.6 : 0.35) : 0,
      LF = f.L,
      eave = b.eave,
      sp = o.sp || 3,
      out = [];
    let ww = st === 1 ? 1.25 : 0.95,
      wh0 = st === 1 ? 1.4 : 1.3;
    if (!house) return out;
    let nb = Math.max(1, Math.floor((LF - 0.6) / sp));
    if (LF < ww + 0.7) nb = 0;
    const bw = nb ? LF / nb : LF;
    const topAt = u =>
      u < f.uA
        ? f.t0 + (f.tA - f.t0) * Math.min(1, Math.max(0, u / Math.max(f.uA, 0.01)))
        : f.tA + (f.t1 - f.tA) * Math.min(1, Math.max(0, (u - f.uA) / Math.max(LF - f.uA, 0.01)));
    const isGable = f.kind === 'gable';
    for (let fi = 0; fi < 5; fi++) {
      const fb = plH + fi * ST;
      if (fb > Math.max(f.tA, f.t0, f.t1)) break;
      for (let bi = 0; bi < nb; bi++) {
        const bc = (bi + 0.5) * bw;
        let sill = 0.85,
          wh = wh0,
          w = ww;
        if (fi === 0) {
          const fit = eave - 0.25 - fb - sill;
          if (fit < wh && fit > 0.75) wh = fit;
          else if (fit <= 0.75) {
            sill = Math.max(0.5, eave - 0.25 - fb - 0.9);
            wh = 0.9;
          }
        }
        let lo = [bc - w / 2, fb + sill],
          hi = [bc + w / 2, fb + sill + wh];
        const attic = fb + sill > eave - 0.2;
        if (attic) {
          w = 0.8;
          lo = [bc - 0.4, fb + sill];
          hi = [bc + 0.4, fb + sill + 1.0];
        }
        const room = Math.min(topAt(lo[0]), topAt(hi[0])) - hi[1];
        if (!(room > (attic ? 0.4 : 0.18) && (!attic || isGable))) continue;
        if (
          f.door &&
          f.door.w > 0 &&
          Math.abs(bc - f.door.u) < Math.max(bw * 0.5, f.door.w * 0.5 + w * 0.5 + 0.1) &&
          fi < 1
        )
          continue;
        out.push({ u0: lo[0], u1: hi[0], z0: lo[1], z1: hi[1], fi, attic });
      }
    }
    return out;
  }
  // ---- the roof over a point: the fitted roof of world/ratscher.js (with the measured heights of feat/dorfkern) or a rebuilt house's ----
  function roofOf(b) {
    const tris = [];
    const part = VILLAGE.parts && VILLAGE.parts.get(b.id);
    if (part && part.tris) for (const t of part.tris) tris.push(t.map(v => [v.x, v.y, v.z]));
    else if (VILLAGE.roof0 && b.tris && b.tris.length) {
      const g = VILLAGE.roof0.geometry,
        RP = g.attributes.position.array,
        RI = g.index.array,
        rm = VILLAGE.remap && VILLAGE.remap.get(b.id),
        P = i => [RP[i * 3], -RP[i * 3 + 2], rm ? b.foot + rm(RP[i * 3 + 1] - b.foot) : RP[i * 3 + 1]];
      for (const t of b.tris) tris.push([P(RI[t * 3]), P(RI[t * 3 + 1]), P(RI[t * 3 + 2])]);
    }
    const at = (x, y) => {
      let best = null,
        bd = 1e9;
      for (const [a, c, d] of tris) {
        const v0x = c[0] - a[0],
          v0y = c[1] - a[1],
          v1x = d[0] - a[0],
          v1y = d[1] - a[1],
          v2x = x - a[0],
          v2y = y - a[1],
          den = v0x * v1y - v1x * v0y;
        if (Math.abs(den) < 1e-9) continue;
        const u = (v2x * v1y - v1x * v2y) / den,
          v = (v0x * v2y - v2x * v0y) / den,
          out = Math.max(0, -u) + Math.max(0, -v) + Math.max(0, u + v - 1);
        if (out < bd) {
          bd = out;
          best = a[2] + u * (c[2] - a[2]) + v * (d[2] - a[2]);
        }
        if (out === 0) break;
      }
      return best;
    };
    return { tris, at };
  }
  // ---- which house is whose: the named villagers live in fixed houses (dorf/dorf_life.js PIN) ----
  const OWNERS = {
    247: 'gerhard',
    219: 'manfred',
    220: 'wolfgang',
    260: 'uwe',
    198: 'katrin',
    214: 'ingrid',
    246: 'jens',
    191: 'heike',
  };
  const OWNER_LOOK = {
    gerhard: 'alt',
    manfred: 'ddr',
    wolfgang: 'alt',
    uwe: 'nachwende',
    katrin: 'nachwende',
    ingrid: 'ddr',
    jens: 'nachwende',
    heike: 'alt',
  };
  function lookOf(b, R) {
    const own = OWNERS[b.id];
    if (own) return OWNER_LOOK[own];
    const st = b.st ? b.st.style : 0,
      S = VILLAGE.ST || {},
      old = st === S.FW || st === S.FW_UP || st === S.SLATE || st === S.SLATE_UP || st === S.SLATE_FWG,
      modern = st === S.MODERN,
      k = R();
    if (modern) return k < 0.55 ? 'nachwende' : 'ddr';
    if (old) return k < 0.45 ? 'alt' : k < 0.8 ? 'ddr' : 'nachwende';
    return k < 0.3 ? 'alt' : k < 0.7 ? 'ddr' : 'nachwende';
  }
  const NAMES = {
    flur: 'Flur',
    stube: 'Stube',
    wohnzimmer: 'Wohnzimmer',
    kueche: 'Küche',
    kammer: 'Kammer',
    bad: 'Bad',
    vorrat: 'Vorratskammer',
    waschkueche: 'Waschküche',
    schlafzimmer: 'Schlafzimmer',
    kinderzimmer: 'Kinderzimmer',
    keller: 'Keller',
    boden: 'Dachboden',
  };
  // ---- the plan of one house ----
  const CACHE = new Map();
  function plan(id) {
    if (CACHE.has(id)) return CACHE.get(id);
    const b = VILLAGE.byId && VILLAGE.byId.get(id);
    const P = b ? make(b) : null;
    CACHE.set(id, P);
    return P;
  }
  function enterable(b) {
    return !!b && b.typ === 0 && b.id !== 215 && !!b.st && b.fac.some(f => f.door) && b.eave > 2.4;
  }
  function make(b) {
    if (!enterable(b)) return null;
    const F = frameOf(b);
    if (!F) return null;
    const RC = rectOf(b, F);
    if (!RC) return null;
    const { X0, X1, D } = RC,
      W = X1 - X0;
    if (W < 4.2 || D < 4.2 || W > 26 || D > 22) return null;
    const R = rng(b.id * 7919 + 17),
      o = faceLook(b.st, F.f),
      plH = o.raised ? 0.6 : 0.35,
      foot = b.foot,
      zG = foot + plH,
      eaveZ = foot + b.eave,
      old = lookOf(b, R),
      t = 0.4;
    let nSt = 1;
    while (nSt < 3 && zG + (nSt + 1) * ST - SLAB <= eaveZ + 0.3) nSt++;
    const roof = roofOf(b),
      xi0 = X0 + t,
      xi1 = X1 - t,
      yi0 = t,
      yi1 = D - t;
    // the hall (Ern) at the door, the two sides of the house
    const du = Math.min(Math.max(F.du, X0 + 0.7), X1 - 0.7),
      FW = W < 7 ? 1.6 : W < 10 ? 1.9 : 2.2;
    let fa = du - FW / 2,
      fb = du + FW / 2;
    if (fa - PW / 2 - xi0 < 1.9) fa = xi0 - PW / 2; // no room on the left: the hall reaches the outer wall
    if (xi1 - fb - PW / 2 < 1.9) fb = xi1 + PW / 2;
    const sides = [];
    if (fa > xi0) sides.push({ k: 'L', x0: xi0, x1: fa - PW / 2, wall: fa });
    if (fb < xi1) sides.push({ k: 'R', x0: fb + PW / 2, x1: xi1, wall: fb });
    const hx0 = Math.max(xi0, fa + PW / 2),
      hx1 = Math.min(xi1, fb - PW / 2);
    // the chimney decides where the Stube with the tiled stove and the kitchen are (else: the wider side)
    let chimL = null;
    if (b.chim) chimL = toL(F, b.chim[0], b.chim[1]);
    for (const s of sides) s.w = s.x1 - s.x0;
    let big = sides[0] || null;
    for (const s of sides) {
      const sc = s.w + (chimL && chimL[0] > s.x0 - 0.5 && chimL[0] < s.x1 + 0.5 ? 1.2 : 0);
      if (!big || sc > big.sc) {
        big = s;
        big.sc = sc;
      } else s.sc = sc;
    }
    const small = sides.find(s => s !== big) || null;
    const depth = yi1 - yi0,
      split = depth >= 6.0;
    // the stairs: along the hall wall of the small side (or the free wall), rising to the back
    let stair = null;
    {
      const n = Math.max(12, Math.round(ST / 0.19)),
        rise = ST / n;
      let tread = 0.25,
        y0 = yi0 + 1.7;
      const fit = () => y0 + (n - 1) * tread <= yi1 - 0.15;
      if (!fit()) {
        tread = 0.22;
        y0 = yi0 + 1.3;
      }
      if (!fit()) {
        tread = Math.max(0.19, (yi1 - 0.15 - (yi0 + 1.15)) / (n - 1));
        y0 = yi0 + 1.15;
      }
      const sw = Math.min(0.9, (hx1 - hx0) * 0.48);
      if (fit() && hx1 - hx0 >= 1.45) {
        const onR = small ? small.k === 'R' : fb >= xi1;
        const sx1 = onR ? hx1 : hx0 + sw,
          sx0 = onR ? hx1 - sw : hx0;
        // the opening upstairs begins where the head would touch the slab
        const holeK = Math.max(2, Math.ceil((ST - SLAB - 1.9) / rise) - 1);
        stair = { x0: sx0, x1: sx1, y0, y1: y0 + (n - 1) * tread, n, rise, tread, side: onR ? 'R' : 'L', fl: 0, holeK };
      }
    }
    if (!stair) nSt = 1;
    // rooms per storey
    const rooms = [],
      add = r => (rooms.push(r), r);
    const kindsGF = () => {
      const out = [];
      if (big) {
        const ys = split ? yi0 + depth * 0.56 : yi1 + PW / 2;
        out.push({ side: big, kind: 'stube', y0: yi0, y1: ys - PW / 2 });
        if (split) out.push({ side: big, kind: 'kueche', y0: ys + PW / 2, y1: yi1, kitchenOfStube: true });
      }
      if (small) {
        const ys = split ? yi0 + depth * 0.5 : yi1 + PW / 2;
        const back = old === 'alt' ? R.pick(['vorrat', 'bad', 'waschkueche']) : 'bad';
        if (!split && big) out.push({ side: small, kind: 'kueche', y0: yi0, y1: yi1 });
        else {
          out.push({ side: small, kind: 'kammer', y0: yi0, y1: ys - PW / 2 });
          if (split) out.push({ side: small, kind: back, y0: ys + PW / 2, y1: yi1 });
        }
      }
      return out;
    };
    const kindsUp = hasBad => {
      const out = [];
      if (big) {
        const ys = split ? yi0 + depth * 0.56 : yi1 + PW / 2;
        out.push({ side: big, kind: 'schlafzimmer', y0: yi0, y1: ys - PW / 2 });
        if (split) out.push({ side: big, kind: R.chance(0.6) ? 'kinderzimmer' : 'kammer', y0: ys + PW / 2, y1: yi1 });
      }
      if (small) {
        const ys = split ? yi0 + depth * 0.5 : yi1 + PW / 2;
        out.push({ side: small, kind: split ? 'kammer' : hasBad ? 'kammer' : 'bad', y0: yi0, y1: ys - PW / 2 });
        if (split) out.push({ side: small, kind: hasBad ? 'kinderzimmer' : 'bad', y0: ys + PW / 2, y1: yi1 });
      }
      return out;
    };
    const zF = [],
      zC = [];
    for (let k = 0; k < nSt; k++) {
      zF.push(zG + k * ST);
      zC.push(zG + (k + 1) * ST - SLAB);
    }
    const zA = zG + nSt * ST; // the attic floor
    let hasBad = false;
    for (let k = 0; k < nSt; k++) {
      const list = k === 0 ? kindsGF() : kindsUp(hasBad);
      for (const q of list) if (q.kind === 'bad') hasBad = true;
      add({ kind: 'flur', fl: k, x0: hx0, x1: hx1, y0: yi0, y1: yi1, z0: zF[k], z1: zC[k] });
      for (const q of list)
        add({
          kind: q.kind,
          fl: k,
          x0: q.side.x0,
          x1: q.side.x1,
          y0: q.y0,
          y1: q.y1,
          z0: zF[k],
          z1: zC[k],
          side: q.side.k,
        });
    }
    // the cellar under the kitchen (or the Stube), reached by a trapdoor with a steep stair
    let cellar = null,
      hatch = null;
    {
      const host =
        rooms.find(r => r.fl === 0 && r.kind === 'kueche') || rooms.find(r => r.fl === 0 && r.kind === 'stube');
      if (host && host.x1 - host.x0 >= 2.4 && host.y1 - host.y0 >= 2.6) {
        const zK = zG - SLAB - 2.15,
          n = Math.round((zG - zK) / 0.2),
          rise = (zG - zK) / n,
          tread = 0.16,
          run = (n - 1) * tread,
          // the hatch half a metre off the far wall of the host room; one steps in at its front end and goes down towards the back
          hx = host.side === 'L' ? [host.x0 + 0.45, host.x0 + 1.25] : [host.x1 - 1.25, host.x1 - 0.45];
        const y0h = host.y0 + 0.75,
          y1h = y0h + run;
        if (y1h < host.y1 - 0.85) {
          hatch = { x0: hx[0], x1: hx[1], y0: y0h, y1: y1h, z: zG, n, rise, tread, room: host };
          cellar = { x0: host.x0, x1: host.x1, y0: host.y0, y1: host.y1, z0: zK, z1: zG - SLAB };
          add({ kind: 'keller', fl: -1, x0: host.x0, x1: host.x1, y0: host.y0, y1: host.y1, z0: zK, z1: zG - SLAB });
        }
      }
    }
    // the attic: one room under the roof
    let attic = null;
    {
      const mid = roof.at(...toW(F, (xi0 + xi1) / 2, (yi0 + yi1) / 2));
      if (mid !== null && mid - zA > 1.7) {
        attic = { z0: zA, top: mid };
        add({ kind: 'boden', fl: nSt, x0: xi0, x1: xi1, y0: yi0, y1: yi1, z0: zA, z1: mid - 0.25 });
      }
    }
    rooms.forEach((r, i) => {
      r.id = r.kind + (r.fl < 0 ? 'K' : r.fl) + '_' + i;
      r.name = NAMES[r.kind] || r.kind;
    });
    // inner doors: each room from the hall (the stair keeps its wall free); else through the room in front of it
    const doors = [];
    for (const r of rooms) {
      if (r.kind === 'flur' || r.kind === 'keller' || r.kind === 'boden') continue;
      const wx = r.side === 'L' ? r.x1 + PW / 2 : r.x0 - PW / 2;
      let lo = r.y0 + 0.2,
        hi = r.y1 - 0.2;
      const st = stair && stair.side === r.side ? stair : null,
        free = [];
      if (st) {
        const s0 = r.fl === 0 ? st.y0 - 0.05 : st.y0 - 0.25,
          s1 = st.y1 + 0.15;
        if (s0 - lo >= 0.95) free.push([lo, Math.min(hi, s0)]);
        if (hi - s1 >= 0.95) free.push([Math.max(lo, s1), hi]);
      } else free.push([lo, hi]);
      const w = 0.86;
      let d = null;
      for (const [a, z] of free) {
        if (z - a < w + 0.1) continue;
        const front = r.y0 < yi0 + 0.5;
        const yc = front ? a + 0.12 + w / 2 + 0.25 : z - 0.12 - w / 2 - 0.25;
        d = {
          x: wx,
          y: Math.min(Math.max(yc, a + w / 2 + 0.06), z - w / 2 - 0.06),
          axis: 'y',
          w,
          room: r.id,
          fl: r.fl,
        };
        break;
      }
      if (!d) {
        // through the room in front of it (a Durchgangszimmer)
        const fr = rooms.find(q => q.fl === r.fl && q.side === r.side && q !== r && q.y1 < r.y0 + 0.01);
        if (fr) d = { x: (r.x0 + r.x1) / 2, y: r.y0 - PW / 2, axis: 'x', w, room: r.id, from: fr.id, fl: r.fl };
      }
      if (d) {
        d.id = 'tuer_' + r.id;
        d.z0 = r.z0;
        d.z1 = r.z0 + 2.0;
        doors.push(d);
      }
    }
    // windows on the rectangle's edges, per storey
    const windows = [];
    for (const f of b.fac) {
      const A = toL(F, f.ax, f.ay),
        B = toL(F, f.bx, f.by);
      let edge = null;
      if (Math.abs(A[1]) < 0.25 && Math.abs(B[1]) < 0.25) edge = 'front';
      else if (Math.abs(A[1] - D) < 0.25 && Math.abs(B[1] - D) < 0.25) edge = 'back';
      else if (Math.abs(A[0] - X0) < 0.25 && Math.abs(B[0] - X0) < 0.25) edge = 'left';
      else if (Math.abs(A[0] - X1) < 0.25 && Math.abs(B[0] - X1) < 0.25) edge = 'right';
      if (!edge) continue;
      const along = edge === 'front' || edge === 'back' ? 0 : 1,
        lo = along ? yi0 + 0.15 : xi0 + 0.15,
        hi = along ? yi1 - 0.15 : xi1 - 0.15;
      for (const w of facadeWindows(b, f)) {
        const p0 = A[along] + ((B[along] - A[along]) * w.u0) / f.L,
          p1 = A[along] + ((B[along] - A[along]) * w.u1) / f.L,
          a = Math.min(p0, p1),
          c = Math.max(p0, p1);
        if (a < lo || c > hi) continue;
        const z0 = foot + w.z0,
          z1 = foot + w.z1;
        let fl = -1;
        for (let k = 0; k < nSt; k++) if (z0 >= zF[k] - 0.1 && z0 < zF[k] + ST - 0.3) fl = k;
        if (fl < 0 && attic && z0 >= zA - 0.1) fl = nSt;
        if (fl < 0) continue;
        windows.push({ edge, a, b: c, z0, z1, fl, attic: w.attic });
      }
    }
    // the front door in the house frame
    const front = { x: du, w: F.dw, z0: zG, z1: zG + 2.15 };
    return {
      id: b.id,
      b,
      F,
      X0,
      X1,
      D,
      W,
      t,
      solid: RC.solid,
      foot,
      plH,
      zG,
      zF,
      zC,
      zA,
      nSt,
      eaveZ,
      look: old,
      owner: OWNERS[b.id] || null,
      seed: b.id * 7919 + 17,
      xi0,
      xi1,
      yi0,
      yi1,
      fa,
      fb,
      hx0,
      hx1,
      rooms,
      doors,
      windows,
      stair,
      hatch,
      cellar,
      attic,
      front,
      roof,
      chimL,
      toW: (x, y) => toW(F, x, y),
      toL: (x, y) => toL(F, x, y),
      rot: { cx: F.ox, cy: F.oy, c: F.c, s: F.s },
    };
  }
  return { plan, rng, hh, frameOf, enterable, facadeWindows, faceLook, toL, toW, ST, SLAB, PW, NAMES, OWNERS };
})();
window.ZIPLAN = ZIPLAN;
