// Suhl runtime: the streets, the simplest way that lets one walk and drive (stage 2) – all of it in this one file.
// The real street space is not Suhl's to draw: the road system of the region (feat/strassen, not in src yet) will draw asphalt, kerbs,
// pavements and lines from the drive data once Suhl's roads are in them (hook F1, FAHRT.add/drop). Until then the ways and squares of
// the street tiles (product s, tools/suhl/strassen: level-10 tiles, positions in decimetres from the tile's centre o) are painted
// into the one overlay of the tiled world (WELT.setOverlay: r = cover, g/r = surface – asphalt with a kerb, sett, paving slabs,
// gravel), a window of 768 m that follows the observer. No geometry, no new program. The ground itself (with the road cut) comes from
// suhl-boden's terrain tiles. Also from these tiles: the street name under the walker (KERN.place) and the ways for traffic
// (SUHL.ways, the format of VNETZ.graph).
// As soon as the drive offers FAHRT.add(name, json, opts) / FAHRT.drop(name) (round 2 of the roads system, docs/features/strassen.md;
// feature-detected here), every street tile is handed over to it as a set of its own in the drive-data layout – absolute model
// decimetres, { carve: false }: Suhl's ground carries the road cut; { places: false }: Suhl names its places itself – and the built-up
// areas of the index once as the set 'suhl/orte' (they make the style „Stadt“). Nothing is painted here then: the region's road map
// draws Suhl's streets. A tile the drive does not take (FAHRT off, an error) keeps the painting below.
// Furniture (product m, the same level-10 tiles): street lamps, traffic signs, delineators, guard rails, power masts and lines, stop
// and give-way lines and zebra crossings go tile by tile to the roads system's furniture (STRDAT.add, round 2 – its models, built
// near the observer); traffic lights, crossings, stops and street-name signs (Suhl's own lists of the tile) stay with Suhl.
// Frames: the contract writes positions in whole decimetres relative to the tile's centre o; the sample of 13.11.2026 02:28 wrote
// absolute model decimetres and said so in its index (unit „… absolute model coordinates …“) – read as declared, never guessed.
const SIZE = 768, // the window (m) and its picture (px)
  N = 1024,
  MOVE = 150, // painted again when the observer is this far from the window's centre
  LOAD = 620, // street tiles within this distance of the observer are fetched …
  DROP = 1100; // … and dropped beyond this
export function strassen(ctx, G, IX) {
  const { THREE, WELT } = ctx,
    sp = IX.prod.s,
    mp = IX.prod.m && IX.prod.m.index && IX.prod.m.sets[10] ? IX.prod.m : null,
    S = {
      on: !!(sp && sp.index && sp.sets[10]),
      tiles: new Map(),
      n: { req: 0, ok: 0, err: 0, paint: 0, given: 0, furn: 0, furnErr: 0 },
      ms: 0,
      lastErr: '',
    };
  if (!S.on) return S;
  const set = sp.sets[10],
    ABS = /absolute/.test(String(sp.index.unit || '')),
    // a flat ring [x, y, …] with its heights → [x, y, z, …]
    xyz = (f, fz, z) => {
      const p = [];
      for (let k = 0; k + 1 < f.length; k += 2) p.push(f[k], f[k + 1], fz ? fz[k >> 1] : z || 0);
      return p;
    },
    // an area as the row of the contract [type, surf, fl, name, osm, home, q, xyz, holes]; that sample wrote objects
    rowOf = (a, types) =>
      Array.isArray(a)
        ? a
        : [
            Math.max(0, (types || []).indexOf(a.k)),
            a.surf,
            a.fl || 0,
            a.n || 0,
            a.osm,
            a.home,
            a.q,
            xyz(a.f || [], a.fz, a.z),
            (a.h || []).map((h, i) => xyz(h, a.hz && a.hz[i], a.z)),
          ];
  let cv = null,
    tex = null,
    win = null, // [x0, y0] of the window painted last
    stale = false;
  function fetchTile(x, y) {
    const k = x + '/' + y,
      t = { k, x, y, st: 'load', d: null, used: performance.now() };
    S.tiles.set(k, t);
    S.n.req++;
    fetch(sp.path + '10/' + x + '/' + y + '.json')
      .then(r => (r.ok ? r.json() : Promise.reject(new Error('HTTP ' + r.status))))
      .then(j => {
        if (t.st === 'gone') return;
        t.d = j;
        j.ways = j.ways || [];
        j.areas = (j.areas || []).map(a => rowOf(a, j.atypes));
        j.names = j.names || [''];
        // the origin the positions count from: the tile's centre, or the model's origin where the file says absolute
        t.o =
          /relative to o/.test(String(j.unit || '')) || !ABS
            ? j.o || [G.tile(10, x, y).cx, G.tile(10, x, y).cy]
            : [0, 0];
        t.st = 'ok';
        S.n.ok++;
        stale = true;
        give(t);
        furnish(t);
      })
      .catch(e => {
        t.st = 'err';
        S.n.err++;
        S.lastErr = String((e && e.message) || e);
      });
  }
  // ---- the region's road system takes the tile (when it can): the layout of fahrt/strassen.json, positions absolute decimetres ----
  const F = () =>
    window.FAHRT && typeof window.FAHRT.add === 'function' && typeof window.FAHRT.drop === 'function'
      ? window.FAHRT
      : null;
  let orte = false;
  function give(t) {
    const fa = F();
    if (!fa) return;
    const ox = Math.round(t.o[0] * 10),
      oy = Math.round(t.o[1] * 10),
      abs = p => {
        const q = new Array(p.length);
        for (let k = 0; k + 2 < p.length; k += 3) {
          q[k] = ox + p[k];
          q[k + 1] = oy + p[k + 1];
          q[k + 2] = p[k + 2];
        }
        return q;
      },
      W = t.d.ways;
    try {
      // the built-up areas (and the place names for the drive's display) once, as a set of their own – not with every tile
      if (!orte && sp.index.orte) {
        orte =
          fa.add('suhl/orte', { ways: [], places: sp.index.places || [], orte: sp.index.orte }, { carve: false }) !==
          false;
      }
      t.given =
        fa.add(
          'suhl/s/' + t.k,
          {
            kinds: t.d.kinds,
            surf: t.d.surf,
            names: t.d.names,
            // [kind, surface, width dm, flags, name, ref, x y z …] – the first seven fields of a street row are the drive's own
            ways: W.map(w => [w[0], w[1], w[2], w[3], w[4], w[5], abs(w[6])]),
            s0: W.map(w => w[8] || 0),
            lanes: W.map(w => w[9] || null),
            // an area lies in every tile it touches: handed over by the tile of its reference point (home) only
            areas: t.d.areas.filter(a => a[5]).map(a => [a[1], a[2], a[3], abs(a[7]), (a[8] || []).map(abs), a[0]]),
          },
          { carve: false, places: false }
        ) !== false;
      if (t.given) S.n.given++;
    } catch (e) {
      t.given = false;
      S.lastErr = 'FAHRT.add: ' + String((e && e.message) || e);
    }
  }
  // ---- the furniture of the tile (product m) to the roads system's STRDAT: the lists of strassen/ausstattung.json in absolute dm ----
  const D = () => (window.STRDAT && typeof window.STRDAT.add === 'function' ? window.STRDAT : null);
  function furnish(t) {
    const sd = D();
    if (!sd || !mp || !mp.sets[10].has(t.x, t.y) || t.furn) return;
    t.furn = 'load';
    fetch(mp.path + '10/' + t.x + '/' + t.y + '.json')
      .then(r => (r.ok ? r.json() : Promise.reject(new Error('HTTP ' + r.status))))
      .then(j => {
        if (t.st === 'gone' || t.furn !== 'load') return;
        const o = j.o || [G.tile(10, t.x, t.y).cx, G.tile(10, t.x, t.y).cy],
          ox = Math.round(o[0] * 10),
          oy = Math.round(o[1] * 10),
          // flat lists of n numbers per thing, x and y first: delineators [x, y, az], lamps [x, y, az, kind]
          flat = (f, n) => (f || []).map((v, k) => (k % n === 0 ? v + ox : k % n === 1 ? v + oy : v)),
          at = (rows, i) => (rows || []).map(r => r.map((v, k) => (k === i ? v + ox : k === i + 1 ? v + oy : v))), // x, y at i, i + 1
          line = rows => (rows || []).map(r => [r[0]].concat(r.slice(1).map((v, k) => v + (k & 1 ? oy : ox)))), // [kind, x, y, x, y …]
          // masts: the tile writes rows [x, y, type, az, [x, y of the next mast]] (a line may leave the tile); STRDAT reads flat
          // [x, y, type, az] and lines as chains of mast indices of the same set – a span to a mast of another tile is left out
          mr = j.masten || [],
          masten = [],
          leitungen = [];
        for (const r of mr) masten.push(r[0] + ox, r[1] + oy, r[2], r[3]);
        mr.forEach((r, i) => {
          const nx = r[4];
          if (!nx) return;
          const k = mr.findIndex(q => Math.abs(q[0] - nx[0]) < 2 && Math.abs(q[1] - nx[1]) < 2);
          if (k >= 0 && k !== i) leitungen.push([0, 0, i, k]);
        });
        const set = {
          pfosten: flat(j.pfosten, 3),
          lampen: flat(j.lampen, 4),
          masten,
          leitungen,
          schilder: at(j.schilder, 1),
          linien: at(j.linien, 1),
          planken: line(j.planken),
        };
        t.furn = sd.add('suhl/m/' + t.k, set) !== false ? 'in' : 'off';
        if (t.furn === 'in') S.n.furn++;
        t.own = { ampeln: j.ampeln || [], querungen: j.querungen || [], halte: j.halte || [], namen: j.namen || [], o };
        ownRev++;
      })
      .catch(e => {
        t.furn = 'err';
        S.n.furnErr++;
        S.lastErr = 'm: ' + String((e && e.message) || e);
      });
  }
  let ownRev = 0; // counts the tiles whose own lists (traffic lights, street names …) came or went
  S.rev = () => ownRev;
  function unfurnish(t) {
    if (t.own) ownRev++;
    t.own = null;
    const sd = D();
    if (t.furn === 'in' && sd) sd.drop('suhl/m/' + t.k);
    t.furn = null;
  }
  function take(t) {
    unfurnish(t);
    const fa = F();
    if (!t.given || !fa) return;
    t.given = false;
    try {
      fa.drop('suhl/s/' + t.k);
    } catch (e) {
      S.lastErr = 'FAHRT.drop: ' + String((e && e.message) || e);
    }
  }
  function takeOrte() {
    const fa = F();
    if (!orte || !fa) return;
    orte = false;
    try {
      fa.drop('suhl/orte');
    } catch (e) {
      S.lastErr = 'FAHRT.drop: ' + String((e && e.message) || e);
    }
  }
  // surface of the overlay (g of 255): asphalt 40, sett 120, paving slabs 200, gravel 240; -1: the photo shows it well enough
  const code = (surf, fl, foot) =>
    surf <= 1 ? 40 : surf === 2 ? (fl & 64 || foot ? 200 : 120) : surf === 3 ? 240 : -1;
  function paint(cx, cy) {
    const t0 = performance.now();
    if (!cv) {
      cv = document.createElement('canvas');
      cv.width = cv.height = N;
    }
    const g = cv.getContext('2d'),
      x0 = Math.round(cx - SIZE / 2),
      y0 = Math.round(cy - SIZE / 2),
      sc = N / SIZE;
    g.fillStyle = '#000';
    g.fillRect(0, 0, N, N);
    g.lineCap = 'round';
    g.lineJoin = 'round';
    const list = [];
    for (const t of S.tiles.values()) {
      if (t.st !== 'ok') continue;
      const X = x => (t.o[0] + x / 10 - x0) * sc,
        Y = y => (y0 + SIZE - t.o[1] - y / 10) * sc,
        path = (p, close) => {
          g.beginPath();
          for (let k = 0; k + 2 < p.length; k += 3) (k ? g.lineTo : g.moveTo).call(g, X(p[k]), Y(p[k + 1]));
          if (close) g.closePath();
        };
      // squares, car parks, bus bays first: the ways lie on them
      for (const a of t.d.areas || []) {
        const c = code(a[1], 64, a[0] === 0);
        if (c < 0) continue;
        g.fillStyle = `rgb(255,${c},0)`;
        path(a[7], true);
        for (const h of a[8] || []) {
          for (let k = 0; k + 2 < h.length; k += 3) (k ? g.lineTo : g.moveTo).call(g, X(h[k]), Y(h[k + 1]));
          g.closePath();
        }
        g.fill('evenodd');
      }
      for (const w of t.d.ways || []) {
        // bridges, tunnels and passages through houses are no ground; earth and grass paths stay as the photo shows them
        const c = w[3] & (1 | 2 | 2048) ? -1 : code(w[1], w[3], w[0] === 8);
        if (c >= 0) list.push([w[2] / 10, c, w[6], path]);
      }
    }
    // wide first: a path painted later lies on the road it crosses
    list.sort((a, b) => b[0] - a[0]);
    for (const [wd, c, p, path] of list) {
      g.strokeStyle = `rgb(255,${c},0)`;
      g.lineWidth = Math.max(1.2, wd) * sc;
      path(p, false);
      g.stroke();
    }
    if (!tex) {
      tex = new THREE.CanvasTexture(cv);
      tex.colorSpace = THREE.NoColorSpace;
      tex.anisotropy = 4;
    } else tex.needsUpdate = true;
    win = [x0, y0];
    // the one overlay of the tiled world: a zone lays its streets there and the drive (welt/fahrt.js) steps back when it sees them
    // (as for Schleusingen and Kloster Veßra, which are never near at the same time)
    if (WELT.setOverlay) WELT.setOverlay(tex, x0, y0, SIZE);
    S.n.paint++;
    S.ms = Math.round((performance.now() - t0) * 10) / 10;
    stale = false;
  }
  let acc = 1;
  S.tick = (dt, o, near) => {
    acc += dt;
    if (acc < 0.5) return;
    acc = 0;
    if (!near) return S.clear();
    const [E, N2] = G.toU(o[0], o[1]),
      now = performance.now(),
      [tx, ty] = G.at(10, o[0], o[1]);
    for (let x = tx - 2; x <= tx + 2; x++)
      for (let y = ty - 2; y <= ty + 2; y++) {
        if (!set.has(x, y)) continue;
        const d = G.dist(10, x, y, E, N2) * G.k,
          t = S.tiles.get(x + '/' + y);
        if (d < LOAD && !t) fetchTile(x, y);
        else if (t && d < DROP) t.used = now;
      }
    for (const t of [...S.tiles.values()])
      if (now - t.used > 4000 && t.st !== 'load') {
        take(t);
        t.st = 'gone';
        S.tiles.delete(t.k);
      }
    const L = [...S.tiles.values()].filter(t => t.st === 'ok');
    if (!L.length) return;
    // every tile is with the region's road system: its map draws the streets, nothing is painted here
    if (F() && L.every(t => t.given)) {
      if (tex) {
        if (WELT.setOverlay && WELT.overlay && WELT.overlay() === tex) WELT.setOverlay(null);
        else tex.dispose();
        tex = cv = win = null;
      }
      return;
    }
    if (!win || stale || Math.hypot(o[0] - win[0] - SIZE / 2, o[1] - win[1] - SIZE / 2) > MOVE) paint(o[0], o[1]);
  };
  S.clear = () => {
    for (const t of S.tiles.values()) {
      take(t);
      t.st = 'gone';
    }
    S.tiles.clear();
    takeOrte();
    if (tex) {
      if (WELT.setOverlay && WELT.overlay && WELT.overlay() === tex) WELT.setOverlay(null);
      else tex.dispose();
    }
    tex = null;
    cv = null;
    win = null;
  };
  // ---- the named way nearest a point (within its width and a few metres): „Steinweg, Suhl“ ----
  let last = [1e9, 0, null];
  S.nameAt = (x, y) => {
    if (Math.hypot(x - last[0], y - last[1]) < 2) return last[2];
    const [tx, ty] = G.at(10, x, y),
      t = S.tiles.get(tx + '/' + ty);
    let best = null,
      bd = 1e9;
    if (t && t.st === 'ok') {
      const lx = (x - t.o[0]) * 10,
        ly = (y - t.o[1]) * 10;
      for (const w of t.d.ways) {
        if (!w[4]) continue;
        const p = w[6],
          lim = w[2] / 2 + 60;
        for (let k = 0; k + 5 < p.length; k += 3) {
          const ex = p[k + 3] - p[k],
            ey = p[k + 4] - p[k + 1],
            l2 = ex * ex + ey * ey || 1,
            u = Math.max(0, Math.min(1, ((lx - p[k]) * ex + (ly - p[k + 1]) * ey) / l2)),
            d = Math.hypot(lx - p[k] - ex * u, ly - p[k + 1] - ey * u);
          if (d < lim && d - w[2] / 2 < bd) {
            bd = d - w[2] / 2;
            best = t.d.names[w[4]];
          }
        }
      }
      // no named way under the walker: a named square he stands on (an area lies in every tile it touches)
      if (!best)
        for (const a of t.d.areas) {
          if (!a[3]) continue;
          const p = a[7],
            n = p.length - (p.length % 3);
          let inside = false;
          for (let k = 0; k < n; k += 3) {
            const m = (k + 3) % n,
              y1 = p[k + 1],
              y2 = p[m + 1];
            if (y1 > ly !== y2 > ly && lx < p[k] + ((ly - y1) * (p[m] - p[k])) / (y2 - y1)) inside = !inside;
          }
          if (inside) {
            best = t.d.names[a[3]];
            break;
          }
        }
    }
    last = [x, y, best];
    return best;
  };
  // ---- the ways around a point for traffic: [{ kind, w, p: [x, y, …] (model metres), name, surf, fl }] ----
  S.ways = (cx, cy, r) => {
    const out = [];
    for (const t of S.tiles.values()) {
      if (t.st !== 'ok') continue;
      for (const w of t.d.ways) {
        const p = [];
        let near = false;
        for (let k = 0; k + 2 < w[6].length; k += 3) {
          const x = t.o[0] + w[6][k] / 10,
            y = t.o[1] + w[6][k + 1] / 10;
          p.push(x, y);
          if (Math.hypot(x - cx, y - cy) <= r) near = true;
        }
        if (near)
          out.push({
            kind: t.d.kinds[w[0]],
            w: w[2] / 10,
            p,
            name: t.d.names[w[4]] || '',
            surf: t.d.surf[w[1]],
            fl: w[3],
          });
      }
    }
    return out;
  };
  S.state = () => ({
    tiles: [...S.tiles.values()].filter(t => t.st === 'ok').length,
    ways: [...S.tiles.values()].reduce((n, t) => n + (t.st === 'ok' ? t.d.ways.length : 0), 0),
    overlay: !!tex && !!WELT.overlay && WELT.overlay() === tex,
    given: [...S.tiles.values()].filter(t => t.given).length,
    furn: [...S.tiles.values()].filter(t => t.furn === 'in').length,
    furnErr: S.n.furnErr,
    orte,
    frame: ABS ? 'absolut' : 'kachel',
    paints: S.n.paint,
    paintMs: S.ms,
    req: S.n.req,
    err: S.n.err,
    lastErr: S.lastErr,
  });
  return S;
}
