// ===================== feat/schleusingen-innen 1: the town houses of Schleusingen as plans of the kit – pure (SIPLAN) =====================
// Falko (13.11.2026 23:56): „wann kann ich alle Gebäude begehen?“ – after the houses of Ratscher and the shops: the houses of Schleusingen.
// Pure logic on plain objects (no three.js, no DOM – node tests: viz3/test/unit/schleusingen_innen.test.mjs). A building of
// welt/schleusingen.js (stadt.json, as the town built it: facades with their top lines, the door on the facade towards the nearest street,
// the foot, the roof faces, the style) becomes a record in the shape the zombie night's planner reads (zombie/z_innen_plan.js ZIPLAN: VILLAGE.bld's
// fields), in an id range of its own (900000 + the building's index: never a house of Ratscher). Which buildings (rules), what they are
// (a small house: the whole house as in Ratscher; a bigger or taller one: a stairwell with one flat per floor to enter; a ground floor with a
// shop sign: a shop room), the look of 2026 per id, and the plans of the stairwell house and of the shop as reworkings of the kit's plan.
// Everything is invented and generic: no names on bells or letter boxes, no brands; a shop room shows only what kind of shop it is.
export const SIPLAN = (() => {
  const ID0 = 900000,
    PW = 0.12, // partitions (zombie/z_innen_plan.js PW)
    ST = 2.75; // storey (ZIPLAN.ST)
  const hh = n => {
    const s = Math.sin(n * 12.9898 + 4.1) * 43758.5453;
    return s - Math.floor(s);
  };
  const has = id => Number.isFinite(id) && id >= ID0 && id < ID0 + 100000;
  const idOf = i => ID0 + i;
  const iOf = id => id - ID0;
  const r3 = v => Math.round(v * 1000) / 1000;
  function area(f) {
    let a = 0;
    for (let i = 0; i < f.length; i += 2) {
      const j = (i + 2) % f.length;
      a += f[i] * f[j + 1] - f[j] * f[i + 1];
    }
    return a / 2;
  }
  function inPoly(f, x, y) {
    let c = false;
    for (let p = 0, q = f.length - 2; p < f.length; q = p, p += 2) {
      const xi = f[p],
        yi = f[p + 1],
        xj = f[q],
        yj = f[q + 1];
      if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) c = !c;
    }
    return c;
  }
  // ---- which buildings: houses (kind 0 of the data) with a street door; not the landmarks (churches, the castle, the Rathaus with its
  // hall, the tower), not sheds, garages and halls, not the named buildings (schools, mills, the fire station, offices – not homes), not
  // the shops of laeden/ (the town does not build those: LAEDEN.skipStadt) ----
  function rules(b) {
    if (!b) return 'fehlt';
    if (b.lm) return 'wahrzeichen';
    if (b.k === 2) return 'schuppen';
    if (b.k === 1) return 'halle';
    if (b.k !== 0) return 'kirche';
    if (b.n) return 'name';
    if (!b.doorFac || !(b.doorFac.w > 0)) return 'keine tür';
    if (b.doorFac.w > 1.3) return 'tor';
    if (!(b.e > 2.4)) return 'zu niedrig';
    return null;
  }
  // ---- the facades as the planner reads them (VILLAGE.bld fac: a → b, the outward normal to the right, the top line, the door) ----
  function facades(b) {
    const d = b.doorFac;
    return b.F.map(f => {
      const [ax, ay, bx, by, t0, uA0, tA0, t1, fl] = f,
        Lg = Math.hypot(bx - ax, by - ay) || 1e-6,
        dx = (bx - ax) / Lg,
        dy = (by - ay) / Lg,
        gable = tA0 > Math.max(t0, t1) + 0.6 && uA0 > 0.3 && uA0 < Lg - 0.3,
        blind = !!(fl & 1),
        isDoor = !!d && Math.abs(ax - d.ax) < 1e-6 && Math.abs(ay - d.ay) < 1e-6;
      return {
        ax,
        ay,
        bx,
        by,
        dx,
        dy,
        nx: dy,
        ny: -dx,
        // as the facade shader is fed (welt/schleusingen.js at.LF): a party wall has no bays – and so no windows
        L: blind ? 0.5 : Lg,
        Lg,
        t0,
        tA: gable ? tA0 : (t0 + t1) / 2,
        uA: gable ? uA0 : Lg / 2,
        t1,
        kind: gable ? 'gable' : 'eave',
        blind,
        door: isDoor ? { u: d.u, w: d.w } : null,
      };
    });
  }
  // the chimney on the ridge as welt/schleusingen.js puts it (building(): most houses with a ridge), or null
  function chimney(b) {
    if (b.k !== 0 || b.fl || b.lm || !(hh(b.i + 31) < 0.7) || !b.rv || !b.rv.length) return null;
    const V3 = [];
    for (let k = 0; k < b.rv.length; k += 3) V3.push([b.rv[k], b.rv[k + 1], b.rv[k + 2]]);
    const zm = Math.max(...V3.map(v => v[2])),
      top = V3.filter(v => v[2] > zm - 0.12);
    let A = null,
      C = null,
      dm = 0;
    for (const p of top)
      for (const q of top) {
        const d = Math.hypot(p[0] - q[0], p[1] - q[1]);
        if (d > dm) {
          dm = d;
          A = p;
          C = q;
        }
      }
    if (!A || dm <= 3) return null;
    const f = 0.25 + hh(b.i + 37) * 0.5;
    return [A[0] + (C[0] - A[0]) * f, A[1] + (C[1] - A[1]) * f];
  }
  // the roof faces in model metres with absolute heights (the town's b.roofT, else from rv/rt and the foot)
  function roofTris(b) {
    if (b.roofT && b.roofT.length) return b.roofT.map(t => t.v.map(p => [p[0], p[1], p[2]]));
    const V3 = [];
    for (let k = 0; k < b.rv.length; k += 3) V3.push([b.rv[k], b.rv[k + 1], b.rv[k + 2] + (b.z0 || 0)]);
    const out = [];
    for (let k = 0; k < b.rt.length; k += 3) out.push([V3[b.rt[k]], V3[b.rt[k + 1]], V3[b.rt[k + 2]]]);
    return out;
  }
  // ---- the record for the planner (VILLAGE.bld's fields: id, typ, st, eave, foot, fac, area, cx, cy, chim; the roof faces of its own) ----
  function record(b) {
    let cx = b.cx,
      cy = b.cy;
    if (cx === undefined) {
      cx = 0;
      cy = 0;
      const n = b.f.length / 2;
      for (let k = 0; k < b.f.length; k += 2) {
        cx += b.f[k] / n;
        cy += b.f[k + 1] / n;
      }
    }
    return {
      id: idOf(b.i),
      i: b.i,
      typ: 0,
      st: b.st,
      eave: b.e,
      foot: b.z0 || 0,
      fac: facades(b),
      area: Math.abs(area(b.f)),
      cx,
      cy,
      chim: chimney(b),
      roofTris: roofTris(b),
      maxSt: 5, // four or five storeys at the Markt (the facade paints them all)
      lv: b.lv,
      f: b.f,
    };
  }
  // ---- the shops behind the existing signs (welt/schleusingen.js signs(): one row each in a canvas of 16, in the order of the town's
  // buildings, the Bürgerbüro's first): which buildings have one drawn ----
  function signed(bld, counter) {
    const list = [];
    for (const b of bld) {
      const name = b.lm === 'rathaus' ? 'RATHAUS' : b.s && b.s[0];
      if (name && b.doorFac) list.push(b);
    }
    const rows = Math.min(16, list.length + (counter ? 1 : 0)),
      out = new Map();
    list.slice(0, rows - (counter ? 1 : 0)).forEach(b => {
      if (b.lm !== 'rathaus') out.set(b.i, b.s[0]);
    });
    return out;
  }
  // what kind of shop a sign is (the type of the place in OSM, else from its name): a bakery, a pharmacy, a café, an inn or restaurant, a
  // shop with shelves – or none that fits (a doctor, a bank, an office, a hairdresser: the ground floor is a flat then)
  const SHOP = {
    bakery: 'baecker',
    pastry: 'baecker',
    confectionery: 'baecker',
    pharmacy: 'apotheke',
    chemist: 'laden',
    cafe: 'cafe',
    ice_cream: 'cafe',
    restaurant: 'gaststaette',
    fast_food: 'gaststaette',
    pub: 'gaststaette',
    bar: 'gaststaette',
    biergarten: 'gaststaette',
    hotel: 'gaststaette',
    guest_house: 'gaststaette',
  };
  const SHELVES = new Set([
    'books',
    'gift',
    'shoes',
    'clothes',
    'fashion',
    'boutique',
    'optician',
    'electronics',
    'computer',
    'mobile_phone',
    'florist',
    'garden_centre',
    'butcher',
    'deli',
    'convenience',
    'supermarket',
    'variety_store',
    'jewelry',
    'watches',
    'toys',
    'tea',
    'coffee',
    'alcohol',
    'wine',
    'beverages',
    'interior_decoration',
    'stationery',
    'art',
    'craft',
    'hardware',
    'doityourself',
    'houseware',
    'kitchen',
    'radiotechnics',
    'hifi',
    'second_hand',
    'charity',
    'farm',
    'health_food',
    'organic',
    'cosmetics',
    'perfumery',
    'bag',
    'leather',
    'sports',
    'bicycle',
    'music',
    'photo',
    'antiques',
    'frame',
    'tobacco',
    'newsagent',
    'kiosk',
    'pet',
    'fabric',
    'sewing',
    'baby_goods',
    'hearing_aids',
    'medical_supply',
    'honey',
    'cheese',
    'spices',
    'confectionery_shop',
    'shop',
  ]);
  const NAMEHINT = [
    [/bäcker|backhaus|backshop|backstube/i, 'baecker'],
    [/apotheke/i, 'apotheke'],
    [/café|cafe|eis|konditorei/i, 'cafe'],
    [/gasthaus|gaststätte|restaurant|grill|imbiss|stube|zum |zur /i, 'gaststaette'],
  ];
  function shopType(name, t) {
    if (t && SHOP[t]) return SHOP[t];
    if (t && SHELVES.has(t)) return 'laden';
    if (!t && name) for (const [re, k] of NAMEHINT) if (re.test(name)) return k;
    return null;
  }
  // the type of a building's sign from the places of the data (the first named place inside or right at the footprint)
  function shopOf(b, pois, name) {
    let t = null;
    for (const p of pois || [])
      if (p.n === name && (inPoly(b.f, p.x, p.y) || Math.hypot(p.x - b.cx, p.y - b.cy) < 25)) {
        t = p.t;
        break;
      }
    return shopType(name, t);
  }
  const SHOPNAME = {
    baecker: 'Bäckerei',
    apotheke: 'Apotheke',
    cafe: 'Café',
    gaststaette: 'Gaststätte',
    laden: 'Laden',
  };
  // ---- what a house is: a shop on the ground floor, a stairwell house (taller than two storeys, or big), or a small house (whole) ----
  function kindOf(P, shop) {
    if (shop) return 'laden';
    const inner = (P.xi1 - P.xi0) * (P.yi1 - P.yi0);
    if (P.nSt >= 3 || (P.nSt >= 2 && inner >= 140)) return 'treppenhaus';
    return 'haus';
  }
  // ---- the look of 2026, fixed per id: mostly today, some kept after 1990, few old people's with the DDR living room, rarely as before
  // 1960 (the zombie night's 'alt'); a shop room is of today ----
  function lookOf(id, kind) {
    if (kind === 'laden') return 'heute';
    const h = hh(id * 2.731 + 0.19);
    if (h < 0.03) return 'alt';
    if (h < 0.13) return 'heute-ddr';
    if (h < 0.31) return 'heute-90';
    return 'heute';
  }
  // ---- rooms: ids and names as the planner gives them ----
  const NAMES = {
    flur: 'Treppenhaus',
    diele: 'Flur',
    wohnzimmer: 'Wohnzimmer',
    kueche: 'Küche',
    bad: 'Bad',
    schlafzimmer: 'Schlafzimmer',
    kinderzimmer: 'Kinderzimmer',
    kammer: 'Kammer',
    boden: 'Dachboden',
  };
  function name(rooms) {
    rooms.forEach((r, i) => {
      r.id = r.kind + (r.fl < 0 ? 'K' : r.fl) + '_' + i;
      if (!r.name) r.name = NAMES[r.kind] || r.kind;
    });
  }
  // ---- the stairwell house: the kit's hall on every storey is the stairwell (its stairs stacked, the attic stair at the top); on each
  // side of it a flat; per storey one of them can be entered (its door from the stairwell, a hall inside, the rooms), the others are
  // locked ----
  // the stretches of the hall's partition on one side where a door may go (the kit's rule: not beside the stairs, the top storey only
  // beside its opening; not where the attic stair runs) – centre lines of free wall, as [lo, hi]
  function stretches(P, side, fl) {
    const lo = P.yi0 + 0.2,
      hi = P.yi1 - 0.2,
      st = P.stair;
    let out = [];
    if (st && st.side === side) {
      const top = fl > 0 && fl === P.nSt - 1,
        s0 = fl === 0 ? st.y0 - 0.05 : top ? st.y0 + st.holeK * st.tread - 0.05 : st.y0 - 0.25,
        s1 = st.y1 + 0.15;
      if (s0 - lo >= 0.82) out.push([lo, Math.min(hi, s0)]);
      if (hi - s1 >= 0.82) out.push([Math.max(lo, s1), hi]);
    } else out.push([lo, hi]);
    const a = P.astair;
    if (a && a.fl === fl && a.side === side) {
      const c0 = Math.min(a.y0, a.y1) - 0.9,
        c1 = Math.max(a.y0, a.y1) + 0.4;
      out = out.flatMap(([p, q]) => {
        const r = [];
        if (c0 - p >= 0.82) r.push([p, Math.min(q, c0)]);
        if (q - c1 >= 0.82) r.push([Math.max(p, c1), q]);
        if (c1 <= p || c0 >= q) return [[p, q]];
        return r;
      });
    }
    return out;
  }
  // a door's centre in a stretch, as near to `want` as it goes (w wide, 6 cm of wall at either end)
  function doorIn(iv, w, want) {
    let best = null;
    for (const [a, b] of iv) {
      const p = a + w / 2 + 0.06,
        q = b - w / 2 - 0.06;
      if (q < p) continue;
      const y = Math.min(q, Math.max(p, want));
      if (best === null || Math.abs(y - want) < Math.abs(best - want)) best = y;
    }
    return best;
  }
  // the flat on one side of the stairwell: its hall (Flur) where the door from the stairwell comes in, the rooms around it
  //   side { k: 'L' | 'R', x0, x1 (the rooms' extent), wall (the partition's centre line) }; returns { rooms, doors, door } or null
  function flatOf(P, side, fl, seed) {
    const Y0 = P.yi0,
      Y1 = P.yi1,
      x0 = side.x0,
      x1 = side.x1,
      W = x1 - x0,
      D = Y1 - Y0,
      z0 = P.zF[fl],
      z1 = P.zC[fl],
      atHall = side.k === 'L' ? 1 : -1, // +1: the hall is at x1 (side L), −1: at x0
      iv = stretches(P, side.k, fl);
    if (W < 2.5 || D < 4.6 || !iv.length) return null;
    const w = iv.some(([a, b]) => b - a >= 1.1) ? 0.86 : 0.72,
      rooms = [],
      doors = [],
      R = n => hh(seed * 1.37 + fl * 7.1 + n * 3.3);
    const room = (kind, xa, xb, ya, yb, extra) => {
      const r = Object.assign(
        { kind, fl, x0: r3(xa), x1: r3(xb), y0: r3(ya), y1: r3(yb), z0, z1, side: side.k, flat: true },
        extra
      );
      rooms.push(r);
      return r;
    };
    // a door between two rooms (or from the stairwell when `from` is null): on the partition between them, centred in their overlap
    const link = (r, from, axis, c, a, b) => {
      const lo = a + w / 2 + 0.08,
        hi = b - w / 2 - 0.08;
      if (hi < lo) return false;
      const t = (lo + hi) / 2;
      doors.push(
        axis === 'x'
          ? { x: r3(t), y: r3(c), axis: 'x', w, room: r, from, fl }
          : { x: r3(c), y: r3(t), axis: 'y', w, room: r, from, fl }
      );
      return true;
    };
    const ovl = (a, b) => [Math.max(a.x0, b.x0), Math.min(a.x1, b.x1)];
    // the door from the stairwell: as near the middle of the depth as the stairs allow
    let dy = doorIn(iv, w, Y0 + D * 0.46);
    if (dy === null) return null;
    let F = null,
      B = null,
      dl = null,
      bad = null;
    const longHall = D < 7.6;
    if (!longHall) {
      // the hall across the side at the door; rooms in front of it (the street side) and behind it
      const bath = W >= 3.75,
        DH = bath ? 2.0 : 1.6;
      let yD0 = dy - DH / 2,
        yD1 = dy + DH / 2;
      if (yD0 - PW - Y0 < 2.5) {
        yD0 = Y0;
        yD1 = Math.max(yD1, Y0 + DH);
      }
      if (Y1 - yD1 - PW < 2.5) {
        yD1 = Y1;
        yD0 = Math.min(yD0, Y1 - DH);
      }
      if (yD0 <= Y0 + 1e-6 && yD1 >= Y1 - 1e-6) return null;
      if (dy - w / 2 - 0.08 < yD0 || dy + w / 2 + 0.08 > yD1)
        dy = Math.min(yD1 - w / 2 - 0.1, Math.max(yD0 + w / 2 + 0.1, dy));
      // in the hall's band: the hall at the stairwell's side, the bath at the outer wall (if the side is wide enough)
      const dW = bath ? Math.min(1.75, W - 2.0 - PW) : W,
        hx0 = atHall > 0 ? x1 - dW : x0,
        hx1 = atHall > 0 ? x1 : x0 + dW;
      dl = room('diele', hx0, hx1, yD0, yD1);
      if (bath) {
        bad = atHall > 0 ? room('bad', x0, hx0 - PW, yD0, yD1) : room('bad', hx1 + PW, x1, yD0, yD1);
        link(bad, dl, 'y', atHall > 0 ? hx0 - PW / 2 : hx1 + PW / 2, yD0, yD1);
      }
      // a band split at the stairwell's side (the room there is entered from the hall, the outer one through it)
      const band = (ya, yb, kinds, toHall) => {
        const out = [];
        if (yb - ya < 2.3) return out;
        if (W >= 5.6 && kinds.length > 1) {
          const wi = Math.max(2.6, Math.min(W - 2.4 - PW, W * 0.55)),
            sx = atHall > 0 ? x1 - wi : x0 + wi;
          const a = atHall > 0 ? room(kinds[0], sx, x1, ya, yb) : room(kinds[0], x0, sx, ya, yb),
            b = atHall > 0 ? room(kinds[1], x0, sx - PW, ya, yb) : room(kinds[1], sx + PW, x1, ya, yb);
          out.push(a, b);
          const [o0, o1] = ovl(a, dl);
          link(a, dl, 'x', toHall, o0, o1);
          const [p0, p1] = ovl(b, dl);
          if (!link(b, dl, 'x', toHall, p0, p1)) link(b, a, 'y', atHall > 0 ? sx - PW / 2 : sx + PW / 2, ya, yb);
        } else {
          const a = room(kinds[0], x0, x1, ya, yb);
          out.push(a);
          const [o0, o1] = ovl(a, dl);
          link(a, dl, 'x', toHall, o0, o1);
        }
        return out;
      };
      const hasF = yD0 - PW - Y0 >= 2.3,
        hasB = Y1 - yD1 - PW >= 2.3;
      F = hasF
        ? band(Y0, yD0 - PW, hasB ? ['wohnzimmer', 'schlafzimmer'] : ['wohnzimmer', 'kueche'], yD0 - PW / 2)
        : [];
      B = hasB
        ? band(
            yD1 + PW,
            Y1,
            hasF ? ['kueche', R(1) < 0.5 ? 'kinderzimmer' : 'schlafzimmer'] : ['wohnzimmer', 'kueche'],
            yD1 + PW / 2
          )
        : [];
      // no kitchen yet (one band only, not wide enough to split): the band split in its depth, the kitchen nearer the hall
      if (!rooms.some(r => r.kind === 'kueche')) {
        const one = (F.length ? F : B)[0],
          front = !!F.length,
          dep = one ? one.y1 - one.y0 : 0;
        if (one && dep >= 5.4) {
          const cut = front ? one.y1 - 2.6 : one.y0 + 2.6; // the kitchen 2.6 m deep at the hall
          const k = front
            ? room('kueche', one.x0, one.x1, cut + PW / 2, one.y1)
            : room('kueche', one.x0, one.x1, one.y0, cut - PW / 2);
          if (front) one.y1 = r3(cut - PW / 2);
          else one.y0 = r3(cut + PW / 2);
          // the door of the cut room went to its kitchen part: the kitchen from the hall, the room through the kitchen
          const d = doors.find(q => q.room === one);
          if (d) d.room = k;
          link(one, k, 'x', cut, Math.max(one.x0, k.x0), Math.min(one.x1, k.x1));
        }
      }
      // no bath yet (a narrow side): the kitchen's band gives one at its far end, through the kitchen
      if (!bad) {
        const k = rooms.find(r => r.kind === 'kueche');
        if (k && k.y1 - k.y0 >= 4.6) {
          const farBack = k.y0 > dl.y0,
            cut = farBack ? k.y1 - 2.0 : k.y0 + 2.0;
          bad = farBack ? room('bad', k.x0, k.x1, cut + PW / 2, k.y1) : room('bad', k.x0, k.x1, k.y0, cut - PW / 2);
          if (farBack) k.y1 = r3(cut - PW / 2);
          else k.y0 = r3(cut + PW / 2);
          link(bad, k, 'x', cut, k.x0, k.x1);
        }
      }
    } else {
      // a shallow side: the hall along the stairwell's partition, the rooms beside it one behind the other, each from the hall
      if (W < 4.1) return null;
      const dW = 1.3,
        hx0 = atHall > 0 ? x1 - dW : x0,
        hx1 = atHall > 0 ? x1 : x0 + dW,
        rx0 = atHall > 0 ? x0 : hx1 + PW,
        rx1 = atHall > 0 ? hx0 - PW : x1,
        wallR = atHall > 0 ? hx0 - PW / 2 : hx1 + PW / 2;
      dl = room('diele', hx0, hx1, Y0, Y1);
      // the living room at the street, the bath (1.8 m) in the middle, the kitchen at the back; deeper: a bedroom too
      const kinds =
          D >= 9.4
            ? ['wohnzimmer', 'bad', 'kueche', 'schlafzimmer']
            : D >= 6.2
              ? ['wohnzimmer', 'bad', 'kueche']
              : ['wohnzimmer', 'kueche'],
        n = kinds.length,
        dBad = kinds.includes('bad') ? 1.8 : 0,
        rest = (D - (n - 1) * PW - dBad) / (n - (dBad ? 1 : 0));
      if (rest < 1.9) return null;
      let y = Y0;
      for (const k of kinds) {
        const dep = k === 'bad' ? dBad : rest,
          r = room(k, rx0, rx1, y, k === kinds[n - 1] ? Y1 : Math.min(Y1, y + dep));
        if (k === 'bad') bad = r;
        link(r, dl, 'y', wallR, r.y0, r.y1);
        y = r.y1 + PW;
      }
    }
    // every room reached (from the hall, or through the room in front of it); the door from the stairwell on free wall, inside its hall
    for (const r of rooms) if (r !== dl && !doors.some(d => d.room === r)) return null;
    if (!iv.some(([a, b]) => dy - w / 2 >= a - 1e-6 && dy + w / 2 <= b + 1e-6)) return null;
    if (dy - w / 2 < dl.y0 + 0.05 || dy + w / 2 > dl.y1 - 0.05) return null;
    doors.push({ x: r3(side.wall), y: r3(dy), axis: 'y', w, room: dl, from: null, fl, flatDoor: true });
    return { rooms, doors, door: { x: side.wall, y: dy, w, fl, side: side.k }, bath: !!bad };
  }
  function flats(P, o = {}) {
    if (!P.stair || P.nSt < 2) return null;
    const seed = (o.seed || P.id || 1) % 100003,
      sides = [];
    if (P.fa > P.xi0 + 0.01) sides.push({ k: 'L', x0: P.xi0, x1: P.fa - PW / 2, wall: P.fa });
    if (P.fb < P.xi1 - 0.01) sides.push({ k: 'R', x0: P.fb + PW / 2, x1: P.xi1, wall: P.fb });
    if (!sides.length) return null;
    const rooms = [],
      doors = [],
      locked = [],
      open = [];
    for (let k = 0; k < P.nSt; k++)
      rooms.push({
        kind: 'flur',
        fl: k,
        x0: P.hx0,
        x1: P.hx1,
        y0: P.yi0,
        y1: P.yi1,
        z0: P.zF[k],
        z1: P.zC[k],
        trep: true,
        name: 'Treppenhaus',
      });
    // the storey whose flat can be entered on a phone (its budget: one flat in the house)
    const phoneFl = P.nSt > 1 ? 1 : 0;
    for (let k = 0; k < P.nSt; k++) {
      const cand = sides.map(s => ({ s, F: flatOf(P, s, k, seed + k * 13) })).filter(c => c.F);
      const lockedSides = sides.filter(s => !cand.some(c => c.s === s));
      let pick = cand.length ? cand[Math.floor(hh(seed * 0.71 + k * 5.3) * cand.length) % cand.length] : null;
      if (o.phone && k !== phoneFl) pick = null;
      for (const c of cand) {
        if (c === pick) {
          rooms.push(...c.F.rooms);
          doors.push(...c.F.doors);
          open.push(c.F.door);
        } else locked.push(c.F.door);
      }
      // a side too small for a flat of ours: a locked door all the same (somebody's flat), where the wall allows one
      for (const s of lockedSides) {
        const iv = stretches(P, s.k, k),
          y = doorIn(iv, 0.86, P.yi0 + (P.yi1 - P.yi0) * 0.46);
        if (y !== null) locked.push({ x: s.wall, y, w: 0.86, fl: k, side: s.k });
      }
    }
    // the attic stays (reached from the top storey's stairwell), the cellar of the kit goes (it is reached through a kitchen)
    const att = P.rooms.find(r => r.kind === 'boden');
    if (att) rooms.push(Object.assign({}, att, { name: 'Dachboden' }));
    name(rooms);
    for (const d of doors) {
      d.room = d.room.id;
      if (d.from) d.from = d.from.id;
      else delete d.from;
      d.id = 'tuer_' + d.room;
      d.z0 = P.zF[d.fl];
      d.z1 = P.zF[d.fl] + 2.0;
    }
    return Object.assign(P, {
      rooms,
      doors,
      cellar: null,
      hatch: null,
      kind: 'treppenhaus',
      locked,
      open,
      flats: { open: open.length, locked: locked.length },
    });
  }
  // ---- the shop: a sales room behind the house door, as a shop of the old town has it – at most 12 m deep from the front and 60–120 m²
  // (narrower round the door where the front is long); the rest of the ground floor is walled off: the back rooms (store, office) behind
  // a closed door „Nur für Personal“, and the stairwell to the flats above, which have their own way in (not built) ----
  const SALES = { maxD: 12, maxW: 12.5, maxA: 120, minA: 60, minD: 4.5 };
  function salesRoom(P) {
    const W = P.xi1 - P.xi0,
      D = P.yi1 - P.yi0,
      fx = Math.min(P.xi1 - 0.8, Math.max(P.xi0 + 0.8, P.front.x));
    // the whole floor if it is small; else as deep as fits the area (not under 4.5 m, not over 12 m), then narrower round the door
    if (W * D <= SALES.maxA && D <= SALES.maxD) return { x0: P.xi0, x1: P.xi1, y0: P.yi0, y1: P.yi1 };
    let d = Math.min(D, SALES.maxD, Math.max(SALES.minD, SALES.maxA / W)),
      w = Math.min(W, SALES.maxA / d, SALES.maxW);
    if (w * d < SALES.minA) w = Math.min(W, SALES.minA / d);
    // a strip left over that is too narrow for a room goes to the sales room (then a little narrower, the area kept)
    if (D - d < 1.6 && D <= SALES.maxD + 1.6) {
      d = D;
      w = Math.min(w, Math.max(SALES.minA / d, SALES.maxA / d));
    }
    let x0 = Math.max(P.xi0, fx - w / 2),
      x1 = Math.min(P.xi1, x0 + w);
    x0 = Math.max(P.xi0, x1 - w);
    if (x0 - P.xi0 < 1.6) x0 = P.xi0;
    if (P.xi1 - x1 < 1.6) x1 = P.xi1;
    return { x0: r3(x0), x1: r3(x1), y0: P.yi0, y1: r3(P.yi0 + d) };
  }
  function shop(P, type) {
    if (!P) return null;
    const z0 = P.zF[0],
      z1 = P.zC[0],
      q = salesRoom(P);
    const rooms = [Object.assign({ kind: 'flur', fl: 0, z0, z1, shop: type, name: SHOPNAME[type] || 'Laden' }, q)];
    name(rooms);
    // the door to the back rooms: in the back wall (towards the side with more floor behind it), else in a side wall
    let staff = null;
    const w = 0.86;
    if (q.y1 < P.yi1 - 1e-3) {
      const lw = q.x1 - q.x0,
        u = lw > 3.2 ? (P.front.x < (q.x0 + q.x1) / 2 ? q.x1 - 0.9 - w / 2 : q.x0 + 0.9 + w / 2) : (q.x0 + q.x1) / 2;
      staff = { side: 'y1', x: r3(u), y: q.y1, w };
    } else if (q.x0 > P.xi0 + 1e-3 || q.x1 < P.xi1 - 1e-3) {
      const left = q.x0 > P.xi0 + 1e-3;
      staff = { side: left ? 'x0' : 'x1', x: left ? q.x0 : q.x1, y: r3(Math.max(q.y0 + 2.0, q.y1 - 0.9 - w / 2)), w };
    }
    return Object.assign(P, {
      rooms,
      doors: [],
      windows: P.windows.filter(w2 => w2.fl === 0),
      stair: null,
      astair: null,
      attic: null,
      cellar: null,
      hatch: null,
      nSt: 1,
      zF: [z0],
      zC: [z1],
      kind: 'laden',
      shopType: type,
      staff,
      locked: [],
      open: [],
    });
  }
  // ---- checks of a plan (the unit tests and the browser test): rooms inside the house and apart, doors on partitions, every room reached ----
  function check(P) {
    const bad = [];
    const rs = P.rooms.filter(r => r.kind !== 'boden');
    for (const r of rs) {
      if (r.x1 - r.x0 < 1.2 || r.y1 - r.y0 < 1.2) bad.push(r.id + ': too small');
      if (r.x0 < P.xi0 - 1e-3 || r.x1 > P.xi1 + 1e-3 || r.y0 < P.yi0 - 1e-3 || r.y1 > P.yi1 + 1e-3)
        bad.push(r.id + ': outside');
    }
    for (let i = 0; i < rs.length; i++)
      for (let j = i + 1; j < rs.length; j++) {
        const a = rs[i],
          b = rs[j];
        if (a.fl !== b.fl) continue;
        if (a.x0 < b.x1 - 0.05 && a.x1 > b.x0 + 0.05 && a.y0 < b.y1 - 0.05 && a.y1 > b.y0 + 0.05)
          bad.push(a.id + ' overlaps ' + b.id);
      }
    const byId = new Map(P.rooms.map(r => [r.id, r]));
    for (const d of P.doors) {
      const r = byId.get(d.room),
        f = d.from ? byId.get(d.from) : P.rooms.find(q => q.kind === 'flur' && q.fl === d.fl);
      if (!r || !f) {
        bad.push(d.id + ': rooms');
        continue;
      }
      // the door's line is a partition between the two rooms, and it lies within both rooms' sides
      const on = (q, ax) =>
        ax === 'y'
          ? (Math.abs(q.x1 + PW / 2 - d.x) < 0.09 || Math.abs(q.x0 - PW / 2 - d.x) < 0.09) &&
            d.y - d.w / 2 >= q.y0 - 1e-3 &&
            d.y + d.w / 2 <= q.y1 + 1e-3
          : (Math.abs(q.y1 + PW / 2 - d.y) < 0.09 || Math.abs(q.y0 - PW / 2 - d.y) < 0.09) &&
            d.x - d.w / 2 >= q.x0 - 1e-3 &&
            d.x + d.w / 2 <= q.x1 + 1e-3;
      if (!on(r, d.axis)) bad.push(d.id + ': not in its room’s wall');
      if (!on(f, d.axis)) bad.push(d.id + ': not in the wall of ' + f.id);
    }
    // reached: from the stairwell (the house door) through the doors and the stairs
    const seen = new Set(P.rooms.filter(r => r.kind === 'flur').map(r => r.id));
    for (let it = 0; it < 12; it++)
      for (const d of P.doors) {
        const f = d.from || (P.rooms.find(q => q.kind === 'flur' && q.fl === d.fl) || {}).id;
        if (seen.has(f)) seen.add(d.room);
        if (seen.has(d.room) && d.from) seen.add(d.from);
      }
    // the cellar through the trapdoor of its room (the kit's whole house)
    if (P.hatch && P.hatch.room && seen.has(P.hatch.room.id))
      for (const r of P.rooms) if (r.kind === 'keller') seen.add(r.id);
    for (const r of P.rooms) if (r.kind !== 'boden' && !seen.has(r.id)) bad.push(r.id + ': not reached');
    return bad;
  }
  return {
    ID0,
    has,
    idOf,
    iOf,
    hh,
    area,
    inPoly,
    rules,
    facades,
    chimney,
    roofTris,
    record,
    signed,
    shopType,
    shopOf,
    SHOPNAME,
    kindOf,
    lookOf,
    stretches,
    doorIn,
    flatOf,
    flats,
    shop,
    salesRoom,
    SALES,
    check,
    NAMES,
    PW,
    ST,
  };
})();
