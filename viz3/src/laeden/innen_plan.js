// ===================== feat/laeden-innen 1: the shops of Schleusingen from inside – units, walls, the kit of fixtures (LIPLAN) =====================
// Pure logic on plain objects (no three.js, no DOM – tested in node: viz3/test/unit/laeden_innen.test.mjs). From the data of the shops
// outside (laeden/laeden.js, laeden.json: outline parts, heights, doors, hours) it makes the enterable units – EDEKA, Lidl and its bakery,
// REWE, OBI with its garden centre, the Mega Center (the mall, Aldi, Mega-Möbel, the restaurant, the pharmacy), the Getränkequelle, the
// strip (kebab house, laundry service), Shell, McDonald's – each inside its own outline, and for each unit a plan: the walls facing in with
// the openings of the glazed fronts and doors, the parts (sections) with their floors and ceilings, and what stands inside (boxes in
// vertex colours, goods as instances of a few prototypes, signs, ceiling lights, collision segments). The types' layouts live in
// laeden/innen_markt.js, laeden/innen_bau.js and laeden/innen_haus.js; laeden/innen.js (LINNEN) builds and shows them.
// Coordinates: model metres, x east, y north, z up (heights relative to the floor in a plan; the runtime adds the floor level).
export const LIPLAN = (() => {
  // ---- small geometry ----
  const ring = f => {
    const r = [];
    for (let i = 0; i < f.length; i += 2) r.push([f[i], f[i + 1]]);
    return r;
  };
  const flat = r => r.flatMap(p => [p[0], p[1]]);
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
  function edgeDist(f, x, y) {
    let d = 1e9;
    for (let p = 0, q = f.length - 2; p < f.length; q = p, p += 2) {
      const ax = f[q],
        ay = f[q + 1],
        dx = f[p] - ax,
        dy = f[p + 1] - ay,
        l2 = dx * dx + dy * dy || 1,
        t = Math.max(0, Math.min(1, ((x - ax) * dx + (y - ay) * dy) / l2));
      d = Math.min(d, Math.hypot(x - ax - dx * t, y - ay - dy * t));
    }
    return d;
  }
  function area(f) {
    let a = 0;
    for (let i = 0; i < f.length; i += 2) {
      const j = (i + 2) % f.length;
      a += f[i] * f[j + 1] - f[j] * f[i + 1];
    }
    return a / 2;
  }
  function bbOf(f) {
    let x0 = 1e9,
      y0 = 1e9,
      x1 = -1e9,
      y1 = -1e9;
    for (let i = 0; i < f.length; i += 2) {
      x0 = Math.min(x0, f[i]);
      x1 = Math.max(x1, f[i]);
      y0 = Math.min(y0, f[i + 1]);
      y1 = Math.max(y1, f[i + 1]);
    }
    return [x0, y0, x1, y1];
  }
  // counter-clockwise (the data's outlines are; a part cut from one keeps it)
  const ccw = f => (area(f) < 0 ? flat(ring(f).reverse()) : f);
  // Sutherland–Hodgman: polygon f cut by the half-plane a·x + b·y <= c (keeps that side)
  function clipHalf(f, a, b, c) {
    const pts = ring(f),
      out = [];
    for (let i = 0; i < pts.length; i++) {
      const P = pts[(i + pts.length - 1) % pts.length],
        Q = pts[i],
        dp = a * P[0] + b * P[1] - c,
        dq = a * Q[0] + b * Q[1] - c;
      if (dq <= 1e-9) {
        if (dp > 1e-9) {
          const t = dp / (dp - dq);
          out.push([P[0] + (Q[0] - P[0]) * t, P[1] + (Q[1] - P[1]) * t]);
        }
        out.push(Q);
      } else if (dp <= 1e-9) {
        const t = dp / (dp - dq);
        out.push([P[0] + (Q[0] - P[0]) * t, P[1] + (Q[1] - P[1]) * t]);
      }
    }
    // drop points that repeat
    const clean = [];
    for (const p of out) {
      const q = clean[clean.length - 1];
      if (!q || Math.hypot(p[0] - q[0], p[1] - q[1]) > 0.02) clean.push(p);
    }
    if (
      clean.length > 2 &&
      Math.hypot(clean[0][0] - clean[clean.length - 1][0], clean[0][1] - clean[clean.length - 1][1]) < 0.02
    )
      clean.pop();
    return clean.length >= 3 ? flat(clean) : [];
  }
  // ---- a local frame: u along a wall (unit vector eu), v into the room (ev, its left side for a counter-clockwise outline), origin o ----
  function frame(o, eu) {
    const L = Math.hypot(eu[0], eu[1]) || 1,
      ux = eu[0] / L,
      uy = eu[1] / L,
      vx = -uy,
      vy = ux;
    const F = {
      o: [o[0], o[1]],
      eu: [ux, uy],
      ev: [vx, vy],
      rot: Math.atan2(uy, ux), // the direction of +u (radians from east, counter-clockwise)
      // world → local and back
      L: (x, y) => [(x - o[0]) * ux + (y - o[1]) * uy, (x - o[0]) * vx + (y - o[1]) * vy],
      W: (u, v) => [o[0] + ux * u + vx * v, o[1] + uy * u + vy * v],
      // a polygon in local coordinates
      polyL: f => {
        const out = [];
        for (let i = 0; i < f.length; i += 2) out.push(...F.L(f[i], f[i + 1]));
        return out;
      },
      polyW: f => {
        const out = [];
        for (let i = 0; i < f.length; i += 2) out.push(...F.W(f[i], f[i + 1]));
        return out;
      },
      // cut a world polygon to the local rectangle [u0, v0, u1, v1]
      cut: (f, r) => {
        let g = f;
        g = clipHalf(g, -ux, -uy, -(r[0] + o[0] * ux + o[1] * uy)); // u >= u0
        if (g.length) g = clipHalf(g, ux, uy, r[2] + o[0] * ux + o[1] * uy); // u <= u1
        if (g.length) g = clipHalf(g, -vx, -vy, -(r[1] + o[0] * vx + o[1] * vy)); // v >= v0
        if (g.length) g = clipHalf(g, vx, vy, r[3] + o[0] * vx + o[1] * vy); // v <= v1
        return g;
      },
    };
    return F;
  }
  // the interior intervals of a polygon (local coordinates) on the line u = c: sorted [v0, v1] pairs
  function spans(fl, c) {
    const vs = [];
    for (let p = 0, q = fl.length - 2; p < fl.length; q = p, p += 2) {
      const ua = fl[q],
        va = fl[q + 1],
        ub = fl[p],
        vb = fl[p + 1];
      if (ua > c !== ub > c) vs.push(va + ((vb - va) * (c - ua)) / (ub - ua));
    }
    vs.sort((a, b) => a - b);
    const out = [];
    for (let i = 0; i + 1 < vs.length; i += 2) out.push([vs[i], vs[i + 1]]);
    return out;
  }
  // the same for a band u0..u1 (what is inside on its whole width): the intersection of the spans at a few u
  function bandSpans(fl, u0, u1) {
    let cur = null;
    const n = Math.max(2, Math.ceil((u1 - u0) / 0.5));
    for (let k = 0; k <= n; k++) {
      const s = spans(fl, u0 + ((u1 - u0) * k) / n + (k === 0 ? 0.01 : k === n ? -0.01 : 0));
      if (cur === null) cur = s;
      else {
        const nx = [];
        for (const a of cur)
          for (const b of s)
            if (Math.min(a[1], b[1]) - Math.max(a[0], b[0]) > 0.05)
              nx.push([Math.max(a[0], b[0]), Math.min(a[1], b[1])]);
        cur = nx;
      }
      if (!cur.length) break;
    }
    return cur || [];
  }
  // the same over several polygons that touch (a store of two parts): the union of their spans, joined where they meet
  function spansMulti(fls, c) {
    const all = [];
    for (const fl of fls) all.push(...spans(fl, c));
    return merge(all);
  }
  function bandMulti(fls, u0, u1) {
    let cur = null;
    const n = Math.max(2, Math.ceil((u1 - u0) / 0.5));
    for (let k = 0; k <= n; k++) {
      const s = spansMulti(fls, u0 + ((u1 - u0) * k) / n + (k === 0 ? 0.01 : k === n ? -0.01 : 0));
      if (cur === null) cur = s;
      else {
        const nx = [];
        for (const a of cur)
          for (const b of s)
            if (Math.min(a[1], b[1]) - Math.max(a[0], b[0]) > 0.05)
              nx.push([Math.max(a[0], b[0]), Math.min(a[1], b[1])]);
        cur = nx;
      }
      if (!cur.length) break;
    }
    return cur || [];
  }
  // intervals [a, b] less the intervals in cut
  function subtract(iv, cut) {
    let cur = iv.map(x => x.slice());
    for (const [c0, c1] of cut) {
      const nx = [];
      for (const [a, b] of cur) {
        if (c1 <= a || c0 >= b) nx.push([a, b]);
        else {
          if (c0 > a) nx.push([a, c0]);
          if (c1 < b) nx.push([c1, b]);
        }
      }
      cur = nx;
    }
    return cur.filter(([a, b]) => b - a > 0.05);
  }
  // the bounding box of a local polygon
  const bbL = fl => bbOf(fl);
  // a small deterministic random (the same shop looks the same each time)
  function rnd(seed) {
    let s = (Math.abs(Math.floor(seed)) % 2147483646) + 1;
    return () => (s = (s * 16807) % 2147483647) / 2147483647;
  }
  const hash = str => {
    let h = 7;
    for (const ch of String(str)) h = (h * 31 + ch.charCodeAt(0)) % 2147483647;
    return h;
  };
  // colours (linear RGB as the vertex colours of laeden/laeden.js)
  const lin = c => (c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4));
  const L = (r, g, b) => [lin(r), lin(g), lin(b)];
  const hex = h => L(((h >> 16) & 255) / 255, ((h >> 8) & 255) / 255, (h & 255) / 255);

  // ---- the units: which part of which shop is one room one can walk into, its doors, its type ----
  // type: supermarkt | discounter | baumarkt | moebel | mall | restaurant | imbiss | tankstelle | getraenke | apotheke | baecker | waesche
  const TYPE = {
    edeka: 'supermarkt',
    rewe: 'supermarkt',
    lidl: 'discounter',
    obi: 'baumarkt',
    getraenke: 'getraenke',
    shell: 'tankstelle',
    mcd: 'restaurant',
  };
  // the parts of a shop's data that stay closed (storage, staff rooms): by the kind of volume and index
  function shopVols(sh) {
    return sh.parts
      .map((p, i) => ({ f: ccw(p.f), h: p.h, what: 'teil', i, glas: p.walls === 'glas', roof: p.roof || 'flach' }))
      .concat(
        sh.annex.map((a, i) => ({
          f: ccw(a.f),
          h: a.h,
          what: a.what || 'anbau',
          i: sh.parts.length + i,
          glas: a.walls === 'glas',
          roof: a.roof || 'flach',
          portal: !!a.portal,
        }))
      );
  }
  // the facade a door lies on (as laeden.js faceAt): the volume, the edge, the door's u along it
  function doorEdge(vols, d) {
    let best = null;
    for (const v of vols) {
      const r = ring(v.f);
      for (let i = 0; i < r.length; i++) {
        const a = r[i],
          b = r[(i + 1) % r.length],
          L2 = Math.hypot(b[0] - a[0], b[1] - a[1]);
        if (L2 < 0.5) continue;
        const ux = (b[0] - a[0]) / L2,
          uy = (b[1] - a[1]) / L2,
          u = (d.x - a[0]) * ux + (d.y - a[1]) * uy,
          off = Math.abs((d.x - a[0]) * uy - (d.y - a[1]) * ux);
        if (u < -0.2 || u > L2 + 0.2 || off > 0.6) continue;
        if (!best || off < best.off) best = { v, i, a, b, u, L: L2, off };
      }
    }
    return best;
  }
  // the edge of an outline a door looks out of (its outward normal along the door's), the nearest such edge – also when the door stands
  // in front of it (a portal, a vestibule)
  function edgeFacing(f, d) {
    const r = ring(f);
    let best = null;
    for (let i = 0; i < r.length; i++) {
      const a = r[i],
        b = r[(i + 1) % r.length],
        L2 = Math.hypot(b[0] - a[0], b[1] - a[1]);
      if (L2 < 2) continue;
      const ux = (b[0] - a[0]) / L2,
        uy = (b[1] - a[1]) / L2,
        face = uy * d.nx - ux * d.ny, // the outward normal (uy, −ux) · the door's normal
        t = Math.max(0, Math.min(L2, (d.x - a[0]) * ux + (d.y - a[1]) * uy)),
        dist = Math.hypot(d.x - a[0] - ux * t, d.y - a[1] - uy * t);
      if (face < 0.8) continue;
      if (!best || dist < best.dist) best = { a, b, i, L: L2, dist, u: t };
    }
    return best;
  }
  // a part of a polygon in a local frame: the rectangle [u0, v0, u1, v1] of frame F cut out of f
  const part = (F, f, r) => ccw(F.cut(f, r));
  // the Mega Center: one building of 16 000 m² – the mall behind the south portal, Aldi behind the north portal, the restaurant under the
  // tower, Mega-Möbel in the north wing, the pharmacy beside it (a frame along the west front: u to the north-north-east, v into the house)
  function megaUnits(sh, vols) {
    const main = vols[0],
      door = who => sh.doors.find(d => d.who === who);
    const M = door('Mega Center'),
      A = door('Aldi'),
      R = door('Mega-Restaurant'),
      MB = door('Mega-Möbel'),
      AP = door('Spangenberg-Apotheke');
    if (!M) return [];
    // the frame of the long west front (the main door's edge, its north end; u runs south along it, v east into the house): the main
    // block is u 0 … 146, v 0 … 84; the north wing lies at u < 0 (the restaurant under the tower, Mega-Möbel, the pharmacy at the court)
    const e = edgeFacing(main.f, M),
      Fm = frame(e.a, [e.b[0] - e.a[0], e.b[1] - e.a[1]]),
      dl = d => Fm.L(d.x, d.y),
      U1 = e.L; // the block's length along the front
    const units = [];
    const uM = dl(M)[0],
      uA = A ? dl(A)[0] : 26;
    // Aldi: the block's north end behind the north portal, 34 m deep
    const aldiU1 = Math.min(uM - 14, uA + 18);
    const fa = part(Fm, main.f, [-0.01, -2, aldiU1, 34]);
    // the mall: the entrance hall from the south portal to the corridor, the corridor along the block (the tenants' fronts on both
    // sides: their rooms stay behind the glass)
    const fm1 = part(Fm, main.f, [uM - 6, -2, uM + 6, 30.01]),
      fm2 = part(Fm, main.f, [aldiU1 + 2, 30, U1 - 4, 37]);
    // the restaurant: north of the block under the tower, its door faces north (−u)
    const uR = R ? dl(R)[0] : -22.6;
    const fr = part(Fm, main.f, [uR - 0.6, -2, 0.01, 31.75]);
    // the pharmacy: 12 × 7.5 m at its door on the court; Mega-Möbel: the rest of the north wing
    const uAp = AP ? dl(AP)[0] : -38.4,
      vAp = AP ? dl(AP)[1] : 31.7;
    const fap = part(Fm, main.f, [uAp - 6, vAp - 1, uAp + 6, vAp + 7.5]);
    const fmb = part(Fm, main.f, [-99, vAp + 7.5, 0.01, 100]),
      fmb2 = part(Fm, main.f, [-99, vAp - 1, uAp - 6, vAp + 7.51]),
      fmb3 = part(Fm, main.f, [uAp + 6, vAp - 1, 0.01, vAp + 7.51]);
    const mk = (id, name, type, polys, doors, extra) =>
      units.push(
        Object.assign(
          {
            id,
            shop: sh.id,
            name,
            type,
            vols: polys
              .filter(f => f && (f.f || f).length >= 6)
              .map((f, i) => (f.f ? f : { f, h: main.h, what: i ? 'flügel' : 'teil', i })),
            doors: doors.filter(Boolean),
            frame: Fm,
          },
          extra || {}
        )
      );
    const portal = d => vols.find(v => v.portal && d && inPoly(v.f, d.x - d.nx * 0.6, d.y - d.ny * 0.6));
    mk('mega', 'Mega Center', 'mall', [fm1, fm2, portal(M)], [M], {
      board: sh.board,
      hall: [uM - 6, uM + 6, 0, 30],
      corr: [aldiU1 + 2, U1 - 4, 30, 37],
    });
    mk('aldi', 'Aldi', 'discounter', [fa, portal(A)], [A]);
    mk('megarest', 'Mega-Restaurant', 'restaurant', [fr], [R]);
    mk('megamoebel', 'Mega-Möbel', 'moebel', [fmb, fmb2, fmb3], [MB]);
    mk('apotheke', 'Spangenberg-Apotheke', 'apotheke', [fap], [AP]);
    return units;
  }
  // a shop of two doors in a row on one facade (the strip at the Suhler Straße 40): split between them
  function splitUnits(sh, vols, defs) {
    const v = vols[0],
      d0 = sh.doors.find(d => d.who === defs[0].who),
      d1 = sh.doors.find(d => d.who === defs[1].who);
    if (!d0 || !d1) return [];
    const e = doorEdge(vols, d0);
    const F = frame(e.a, [e.b[0] - e.a[0], e.b[1] - e.a[1]]);
    const u0 = F.L(d0.x, d0.y)[0],
      u1 = F.L(d1.x, d1.y)[0],
      um = (u0 + u1) / 2;
    const lo = u0 < u1 ? [defs[0], d0] : [defs[1], d1],
      hi = u0 < u1 ? [defs[1], d1] : [defs[0], d0];
    return [
      [lo, [-1, -1, um, 99]],
      [hi, [um, -1, 999, 99]],
    ].map(([[def, d], rc]) => ({
      id: def.id,
      shop: sh.id,
      name: def.who,
      type: def.type,
      vols: [{ f: part(F, v.f, rc), h: v.h, what: 'teil', i: 0 }],
      doors: [d],
      frame: F,
    }));
  }
  // Lidl: the bakery takes the north corner at its own door (10 × 8 m), the rest is the store
  function lidlUnits(sh, vols) {
    const v = vols[0],
      dL = sh.doors.find(d => d.who === 'Lidl'),
      dB = sh.doors.find(d => /Backshop/.test(d.who || ''));
    if (!dL) return [];
    const e = doorEdge(vols, dL),
      F = frame(e.a, [e.b[0] - e.a[0], e.b[1] - e.a[1]]);
    const out = [];
    if (dB) {
      const ub = F.L(dB.x, dB.y)[0],
        ul = F.L(dL.x, dL.y)[0],
        // the bakery's side of the line between the two doors
        s = ub > ul ? 1 : -1,
        cut = (ul + ub) / 2 + s * 1.2;
      const fb = part(F, v.f, s > 0 ? [cut, -1, 999, 8.5] : [-999, -1, cut, 8.5]);
      out.push({
        id: 'lidlbaecker',
        shop: sh.id,
        name: dB.who,
        type: 'baecker',
        vols: [{ f: fb, h: v.h, what: 'teil', i: 0 }],
        doors: [dB],
        frame: F,
      });
      // the store: everything but the bakery's rectangle (two pieces: beside it and behind it)
      const f1 = part(F, v.f, s > 0 ? [-999, -1, cut, 999] : [cut, -1, 999, 999]),
        f2 = part(F, v.f, s > 0 ? [cut - 0.01, 8.5, 999, 999] : [-999, 8.5, cut + 0.01, 999]);
      out.push({
        id: 'lidl',
        shop: sh.id,
        name: 'Lidl',
        type: 'discounter',
        vols: [f1, f2].filter(f => f.length >= 6).map((f, i) => ({ f, h: v.h, what: i ? 'flügel' : 'teil', i })),
        doors: [dL],
        frame: F,
      });
    } else out.push({ id: 'lidl', shop: sh.id, name: 'Lidl', type: 'discounter', vols: [v], doors: [dL], frame: F });
    return out;
  }
  // every unit of the data (closed parts are left out: they stay solid behind a wall)
  function units(data) {
    const out = [];
    for (const sh0 of data.shops || []) {
      const sh = Object.assign({}, sh0);
      if (!sh.c) {
        const f = sh.parts[0].f;
        let x = 0,
          y = 0;
        for (let i = 0; i < f.length; i += 2) {
          x += f[i] / (f.length / 2);
          y += f[i + 1] / (f.length / 2);
        }
        sh.c = [x, y];
      }
      const vols = shopVols(sh),
        mains = sh.doors.filter(d => d.k !== 'liefer');
      let list = [];
      try {
        if (sh.id === 'mega') list = megaUnits(sh, vols);
        else if (sh.id === 'lidl') list = lidlUnits(sh, vols);
        else if (sh.id === 'zeile40')
          list = splitUnits(sh, vols, [
            { id: 'turan', who: 'Turan Kebap Haus', type: 'imbiss' },
            { id: 'waesche', who: 'Wäscheservice', type: 'waesche' },
          ]);
        else if (TYPE[sh.id]) {
          const md = mains.find(d => d.k === 'main') || mains[0];
          const e = md ? doorEdge(vols, md) : null;
          // which volumes one walks in: the hall(s) and the vestibule – not the storage behind (EDEKA's 5.5 m part, Shell's back
          // room, McDonald's side room, OBI keeps everything: the parts of the store and the garden centre)
          const keep = vols.filter(v => {
            if (sh.id === 'edeka') return v.i !== 1;
            if (sh.id === 'shell') return v.i === 0;
            if (sh.id === 'mcd') return v.i === 0;
            return true;
          });
          list = [
            {
              id: sh.id,
              shop: sh.id,
              name: sh.name,
              type: TYPE[sh.id],
              vols: keep,
              closed: vols.filter(v => !keep.includes(v)),
              doors: mains,
              frame: e ? frame(e.a, [e.b[0] - e.a[0], e.b[1] - e.a[1]]) : null,
            },
          ];
        }
      } catch (err) {
        list = [];
      }
      for (const u of list) {
        u.vols = u.vols.filter(v => v.f && v.f.length >= 6 && Math.abs(area(v.f)) > 4);
        if (!u.vols.length || !u.doors.length) continue;
        u.oh = u.doors[0].oh || sh.oh || null;
        u.art = u.doors[0].art || sh.art;
        u.addr = sh.addr;
        u.allVols = vols;
        u.shopName = sh.name;
        out.push(u);
      }
    }
    return out;
  }

  // ---- walls facing in: every edge of a unit's volumes, open where it runs along another volume of the same unit (an opening between
  // two parts of one store), with the openings of the glazed fronts (a door's front: its width and glazing height from laeden.js) ----
  // a run: { a, b, L, n (inward normal), open: [[u0, u1]] (no wall), holes: [{ u0, u1, z0, z1, door }] (glass in the wall), vol }
  function walls(u, fronts) {
    const runs = [];
    u.vols.forEach((v, vi) => {
      const r = ring(v.f);
      for (let i = 0; i < r.length; i++) {
        const a = r[i],
          b = r[(i + 1) % r.length],
          L2 = Math.hypot(b[0] - a[0], b[1] - a[1]);
        if (L2 < 0.05) continue;
        const ux = (b[0] - a[0]) / L2,
          uy = (b[1] - a[1]) / L2,
          n = [-uy, ux]; // inward: the left side of a counter-clockwise outline
        // collinear overlaps with the other volumes of the unit: open
        const open = [];
        u.vols.forEach((w, wi) => {
          if (wi === vi) return;
          const q = ring(w.f);
          for (let k = 0; k < q.length; k++) {
            const c = q[k],
              d = q[(k + 1) % q.length];
            const oc = (c[0] - a[0]) * uy - (c[1] - a[1]) * ux,
              od = (d[0] - a[0]) * uy - (d[1] - a[1]) * ux;
            if (Math.abs(oc) > 0.35 || Math.abs(od) > 0.35) continue;
            const tc = (c[0] - a[0]) * ux + (c[1] - a[1]) * uy,
              td = (d[0] - a[0]) * ux + (d[1] - a[1]) * uy,
              t0 = Math.max(0, Math.min(tc, td)),
              t1 = Math.min(L2, Math.max(tc, td));
            if (t1 - t0 > 0.3) open.push([t0, t1]);
          }
        });
        // a volume's edge that lies inside another volume of the unit (a part drawn over another): open too
        if (!open.length) {
          const mx = (a[0] + b[0]) / 2 + n[0] * 0.4,
            my = (a[1] + b[1]) / 2 + n[1] * 0.4,
            ox = (a[0] + b[0]) / 2 - n[0] * 0.4,
            oy = (a[1] + b[1]) / 2 - n[1] * 0.4;
          if (u.vols.some((w, wi) => wi !== vi && inPoly(w.f, ox, oy) && inPoly(v.f, mx, my) && L2 < 3))
            open.push([0, L2]);
        }
        // the glazed fronts on this edge
        const holes = [];
        for (const fr of fronts || []) {
          const ox = (fr.x - a[0]) * uy - (fr.y - a[1]) * ux;
          if (Math.abs(ox) > 0.6 || fr.nx * -n[0] + fr.ny * -n[1] < 0.8) continue;
          const t = (fr.x - a[0]) * ux + (fr.y - a[1]) * uy;
          if (t < -0.5 || t > L2 + 0.5) continue;
          holes.push({
            u0: Math.max(0, t - fr.front / 2),
            u1: Math.min(L2, t + fr.front / 2),
            z0: fr.z0,
            z1: fr.z0 + fr.hG,
            door: { u0: t - fr.w / 2, u1: t + fr.w / 2, h: fr.hD, id: fr.id },
          });
        }
        runs.push({ a, b, L: L2, ux, uy, n, open: merge(open), holes, vol: vi, h: v.h });
      }
    });
    return runs;
  }
  function merge(iv) {
    const s = iv.slice().sort((p, q) => p[0] - q[0]),
      out = [];
    for (const x of s) {
      const l = out[out.length - 1];
      if (l && x[0] <= l[1] + 0.05) l[1] = Math.max(l[1], x[1]);
      else out.push([x[0], x[1]]);
    }
    return out;
  }
  // the pieces of [0, L] that are not in the intervals
  function rest(L, iv) {
    const out = [];
    let t = 0;
    for (const [a, b] of merge(iv)) {
      if (a > t + 0.02) out.push([t, Math.min(a, L)]);
      t = Math.max(t, b);
    }
    if (L > t + 0.02) out.push([t, L]);
    return out;
  }

  // ---- a store's floor seen from its front: the largest volume is the hall, its edge towards the main door the front (v = 0, v into
  // the store); volumes lying in front of that line are vestibules; the outline's walls classified (front, back, side, slanted), the
  // edges between the store's own volumes left out ----
  function store(u, door, hallFrameOf) {
    let hall = u.vols[0];
    for (const v of u.vols) if (Math.abs(area(v.f)) > Math.abs(area(hall.f))) hall = v;
    const F = hallFrameOf(hall, door),
      loc = u.vols.map(v => F.polyL(v.f)),
      isVest = loc.map((fl, i) => u.vols[i] !== hall && bbOf(fl)[3] < 0.6),
      polys = loc.filter((fl, i) => !isVest[i]),
      vest = loc.map((fl, i) => (isVest[i] ? { fl, i } : null)).filter(Boolean);
    let U0 = 1e9,
      U1 = -1e9,
      V1 = -1e9;
    for (const fl of polys) {
      const b = bbOf(fl);
      U0 = Math.min(U0, b[0]);
      U1 = Math.max(U1, b[2]);
      V1 = Math.max(V1, b[3]);
    }
    const de = F.L(door.x, door.y);
    // the walls: every edge of the store's volumes that is not shared with another of its volumes (vestibules included)
    const edges = [];
    polys.forEach((fl, pi) => {
      const r = ring(fl);
      for (let i = 0; i < r.length; i++) {
        const a = r[i],
          b = r[(i + 1) % r.length],
          len = Math.hypot(b[0] - a[0], b[1] - a[1]);
        if (len < 0.3) continue;
        const tx = (b[0] - a[0]) / len,
          ty = (b[1] - a[1]) / len,
          n = [-ty, tx];
        // shared with another polygon of the unit: its free pieces only
        const shared = [];
        loc.forEach(g => {
          if (g === fl) return;
          const q = ring(g);
          for (let k = 0; k < q.length; k++) {
            const c = q[k],
              d = q[(k + 1) % q.length],
              oc = (c[0] - a[0]) * ty - (c[1] - a[1]) * tx,
              od = (d[0] - a[0]) * ty - (d[1] - a[1]) * tx;
            if (Math.abs(oc) > 0.35 || Math.abs(od) > 0.35) continue;
            const t0 = (c[0] - a[0]) * tx + (c[1] - a[1]) * ty,
              t1 = (d[0] - a[0]) * tx + (d[1] - a[1]) * ty;
            shared.push([Math.max(0, Math.min(t0, t1)), Math.min(len, Math.max(t0, t1))]);
          }
        });
        for (const [t0, t1] of rest(len, shared)) {
          if (t1 - t0 < 0.3) continue;
          const A = [a[0] + tx * t0, a[1] + ty * t0],
            B = [a[0] + tx * t1, a[1] + ty * t1];
          const kind =
            Math.abs(A[1]) < 0.6 && Math.abs(B[1]) < 0.6 && n[1] > 0.7
              ? 'front'
              : n[1] < -0.7
                ? 'back'
                : Math.abs(n[0]) > 0.7
                  ? 'side'
                  : 'slant';
          edges.push({
            a: A,
            b: B,
            len: t1 - t0,
            t: [tx, ty],
            n,
            kind,
            aw: F.W(A[0], A[1]),
            bw: F.W(B[0], B[1]),
            poly: pi,
          });
        }
      }
    });
    return { hall, F, loc, polys, vest, U0, U1, V1, de, edges };
  }
  // an occupancy list of local rectangles (what stands, with its clearance): rows of shelves keep out of it
  function occ() {
    const L = [];
    return {
      list: L,
      add: (u0, v0, u1, v1) => L.push([Math.min(u0, u1), Math.min(v0, v1), Math.max(u0, u1), Math.max(v0, v1)]),
      // the v-intervals a band u0..u1 loses to what stands
      cutV: (u0, u1) => L.filter(r => r[2] > u0 && r[0] < u1).map(r => [r[1], r[3]]),
      hit: (u0, v0, u1, v1) => L.some(r => r[2] > u0 && r[0] < u1 && r[3] > v0 && r[1] < v1),
    };
  }
  // ---- the plan: what a type's layout fills in (the kit below helps) ----
  function newPlan(u) {
    return {
      unit: u.id,
      type: u.type,
      boxes: [], // { x, y, z, sx, sy, sz, rot, col, top?, sec, glow? } – vertex-coloured boxes (rot: radians of the box's x axis)
      quads: [], // { p: [[x, y, z] × 4], col, sec } – flat faces (counter-clockwise seen from the side they face)
      goods: [], // { k: prototype, x, y, z, sx, sy, sz, rot, col, sec }
      signs: [], // { t: lines, x, y, z, w, h, nx, ny, st: style, sec, two? } – a text on a board (two: both sides, hanging)
      lights: [], // { x, y, z, w, l, rot, sec } – ceiling panels (glow)
      segs: [], // [ax, ay, bx, by] – what stops the walker
      secs: [], // { id, f (outline), h (ceiling), floor: colour, near: [ids] }
      spots: [], // { k, x, y, z, yaw } – where people stand (a cashier), where the trolleys are
      trolleys: [], // { x, y, rot } – trolleys standing (pushable ones are picked from these)
      notes: [],
    };
  }
  // the kit: things in a local frame F (u, v; z from the floor), each written into the plan in world coordinates
  function kit(P, F, sec) {
    const K = {
      F,
      sec,
      // a box with its centre at (u, v), sizes along u (su), v (sv), height sz from z0
      box(u, v, z0, su, sv, sz, col, top, ang = 0) {
        const [x, y] = F.W(u, v);
        P.boxes.push({ x, y, z: z0, sx: su, sy: sv, sz, rot: F.rot + ang, col, top: top || col, sec: K.sec });
      },
      glow(u, v, z0, su, sv, sz, col, ang = 0) {
        const [x, y] = F.W(u, v);
        P.boxes.push({ x, y, z: z0, sx: su, sy: sv, sz, rot: F.rot + ang, col, top: col, sec: K.sec, glow: true });
      },
      // a block of n products side by side: centre (u, v), lined up along the local axis ('u' or 'v') over len, dep deep, h high
      // from z0; front: ±1 – the side of the other axis its fronts face (0: none, a heap); ang turns the block
      good(k, u, v, z0, axis, len, dep, h, col, n = 1, front = 0, ang = 0) {
        const [x, y] = F.W(u, v),
          a0 = axis === 'v' ? F.ev : F.eu,
          f0 = axis === 'v' ? F.eu : F.ev,
          c = Math.cos(ang),
          s = Math.sin(ang),
          // the along and front directions turned by ang (counter-clockwise)
          ax = a0[0] * c - a0[1] * s,
          ay = a0[0] * s + a0[1] * c,
          fs = front || 1,
          fx = (f0[0] * c - f0[1] * s) * fs,
          fy = (f0[0] * s + f0[1] * c) * fs;
        P.goods.push({ k, x, y, z: z0, ax, ay, len, fx, fy, dep, h, col, n, front: front ? 1 : 0, sec: K.sec });
      },
      // a sign facing direction ang (relative to +v: 0 faces −v … the text readable from v < its v); two: both sides
      sign(lines, u, v, z0, w, h, faceV, st = 0, two = false) {
        const [x, y] = F.W(u, v),
          nx = F.ev[0] * faceV,
          ny = F.ev[1] * faceV;
        P.signs.push({ t: Array.isArray(lines) ? lines : [lines], x, y, z: z0, w, h, nx, ny, st, two, sec: K.sec });
      },
      // a sign facing along ±u
      signU(lines, u, v, z0, w, h, faceU, st = 0, two = false) {
        const [x, y] = F.W(u, v),
          nx = F.eu[0] * faceU,
          ny = F.eu[1] * faceU;
        P.signs.push({ t: Array.isArray(lines) ? lines : [lines], x, y, z: z0, w, h, nx, ny, st, two, sec: K.sec });
      },
      light(u, v, z, su, sv) {
        const [x, y] = F.W(u, v);
        P.lights.push({ x, y, z, w: su, l: sv, rot: F.rot, sec: K.sec });
      },
      // collision: a rectangle (local), a segment (local)
      solid(u, v, su, sv, ang = 0) {
        const c = Math.cos(ang),
          s = Math.sin(ang),
          q = [
            [-su / 2, -sv / 2],
            [su / 2, -sv / 2],
            [su / 2, sv / 2],
            [-su / 2, sv / 2],
          ].map(([a, b]) => F.W(u + a * c - b * s, v + a * s + b * c));
        for (let i = 0; i < 4; i++) P.segs.push([q[i][0], q[i][1], q[(i + 1) % 4][0], q[(i + 1) % 4][1]]);
      },
      seg(u0, v0, u1, v1) {
        const [ax, ay] = F.W(u0, v0),
          [bx, by] = F.W(u1, v1);
        P.segs.push([ax, ay, bx, by]);
      },
      spot(k, u, v, yawU) {
        const [x, y] = F.W(u, v);
        P.spots.push({
          k,
          x,
          y,
          z: 0,
          dir: [F.eu[0] * yawU[0] + F.ev[0] * yawU[1], F.eu[1] * yawU[0] + F.ev[1] * yawU[1]],
          sec: K.sec,
        });
      },
      trolley(u, v, ang = 0) {
        const [x, y] = F.W(u, v);
        P.trolleys.push({ x, y, rot: F.rot + ang, sec: K.sec });
      },
    };
    return K;
  }

  return {
    ring,
    flat,
    inPoly,
    edgeDist,
    area,
    bbOf,
    ccw,
    clipHalf,
    frame,
    spans,
    bandSpans,
    spansMulti,
    bandMulti,
    subtract,
    bbL,
    rnd,
    hash,
    L,
    hex,
    lin,
    units,
    doorEdge,
    edgeFacing,
    walls,
    merge,
    rest,
    newPlan,
    kit,
    store,
    occ,
  };
})();
