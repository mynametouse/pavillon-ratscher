// ===================== feat/wissen 5: data views on the plan view – learning by seeing, as in SimCity (WDATEN) =====================
// Switchable coloured overlays from the world's own data, with a legend: Lärm (roads by their class from OpenStreetMap, machines while they
// run, the quiet hours of today), Verkehr (the roads by class, the cars and buses driving now), Sonne (sun hours of the game's day over the
// garden – the garden planner's sun and shadows of buildings and trees), Naturwert (the forest, the brook's riparian strip, old trees, the
// Dorflinde, the animals one has seen, beetle trees and the stork's quiet zone when they are known – feat/tiere), Stimmung (what the
// villagers think of you – „Wahl und Amt“). On the plan view (Hingehen → Draufsicht) a small panel switches them; in the strategy mode
// (feat/strategie) they are layers of its own panel „Ebenen“ (STRAT.layer.define). SVG only: no shader program, no mesh; drawn when the
// overlay is drawn, the sun grid computed once per day and layout.
import { KERN } from '../core/kern.js';
import { $ } from '../core/head.js';
import { CLOCK } from '../time/clock.js';
import { DN } from '../time/daynight.js';
import { SITEPLAN } from '../world/siteplan.js';
import { ROADS } from '../world/roads.js';
import { VPROPS } from '../world/village_props.js';
import { STREAM } from '../garden/stream_geo.js';
import { GPLAN } from '../gplan/gplan.js';
import { GPSUN } from '../gplan/gplan_sun.js';
import { AMT } from '../amt/amt.js';
import { WISSEN } from './wissen.js';
export const WDATEN = (() => {
  const S = { on: {}, strat: false, sun: null, sunKey: '', el: null, shown: false };
  const f1 = v => v.toFixed(1);
  const esc = s =>
    String(s == null ? '' : s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
  // ---- the game's day ----
  function today() {
    const e = (DN && Number.isFinite(DN.e0) ? DN.e0 : 20393) + Math.floor(((CLOCK && CLOCK.t) || 0) / 1440),
      d = new Date(e * 864e5);
    return {
      y: d.getUTCFullYear(),
      m: d.getUTCMonth() + 1,
      d: d.getUTCDate(),
      wd: d.getUTCDay(),
      min: ((CLOCK && CLOCK.t) || 0) % 1440,
    };
  }
  // public holidays in Thuringia (Easter after Gauss; Weltkindertag 20.9. and Reformationstag 31.10. are Thuringian holidays)
  function holiday(y, m, d) {
    const fixed = ['1.1', '1.5', '20.9', '3.10', '31.10', '25.12', '26.12'];
    if (fixed.includes(d + '.' + m)) return true;
    const a = y % 19,
      b = Math.floor(y / 100),
      c = y % 100,
      dd = Math.floor(b / 4),
      e = b % 4,
      f = Math.floor((b + 8) / 25),
      g = Math.floor((b - f + 1) / 3),
      h = (19 * a + b - dd - g + 15) % 30,
      i = Math.floor(c / 4),
      k = c % 4,
      l = (32 + 2 * e + 2 * i - h - k) % 7,
      mm = Math.floor((a + 11 * h + 22 * l) / 451),
      em = Math.floor((h + l - 7 * mm + 114) / 31),
      ed = ((h + l - 7 * mm + 114) % 31) + 1;
    const easter = Date.UTC(y, em - 1, ed) / 864e5,
      t = Date.UTC(y, m - 1, d) / 864e5;
    return [-2, 1, 39, 50].includes(t - easter);
  }
  function quiet() {
    const T = today(),
      hr = T.min / 60;
    if (T.wd === 0 || holiday(T.y, T.m, T.d))
      return {
        id: 'ruhe_sonntag',
        loud: false,
        text: (T.wd === 0 ? 'Sonntag' : 'Feiertag') + ': laute Geräte bleiben aus.',
      };
    if (hr < 7 || hr >= 20)
      return { id: 'ruhe_nacht', loud: false, text: 'Ruhezeit (20–7 Uhr): laute Geräte bleiben aus.' };
    const lb = (hr >= 7 && hr < 9) || (hr >= 13 && hr < 15) || (hr >= 17 && hr < 20);
    return {
      id: lb ? 'laubblaeser' : 'ruhe_nacht',
      loud: true,
      text: 'Werktag, 7–20 Uhr: laute Geräte erlaubt' + (lb ? ' – Laubbläser und Freischneider gerade nicht.' : '.'),
    };
  }
  // ---- projection: STRAT gives pr(x, y, dz above the ground) → [px, py, depth]; the plan view pr(x, y, z) → [px, py] ----
  const wrapPlan =
    pr =>
    (x, y, dz = 0) => {
      const q = pr(x, y, (KERN.ground(x, y) || 0) + dz);
      return [q[0], q[1], 0];
    };
  const onScr = (q, W, H, m = 40) => q[2] < 1 && q[0] > -m && q[1] > -m && q[0] < W + m && q[1] < H + m;
  const pxPerM = (pr, x, y) => {
    const a = pr(x, y, 0.2),
      b = pr(x + 10, y, 0.2);
    return Math.hypot(b[0] - a[0], b[1] - a[1]) / 10;
  };
  const line = (pts, st) => `<polyline points="${pts.join(' ')}" fill="none" style="${st}"/>`;
  // a polyline of site points (flat array) projected, split where it leaves the screen
  function project(pr, p, W, H, step = 1) {
    const runs = [];
    let cur = [];
    for (let i = 0; i < p.length; i += 2 * step) {
      const q = pr(p[i], p[i + 1], 0.3);
      if (onScr(q, W, H, 200)) cur.push(f1(q[0]) + ',' + f1(q[1]));
      else if (cur.length) {
        if (cur.length > 1) runs.push(cur);
        cur = [];
      }
    }
    if (cur.length > 1) runs.push(cur);
    return runs;
  }
  const label = (q, t, col = '#f3efe6', sz = 11) =>
    `<text x="${f1(q[0])}" y="${f1(q[1])}" style="fill:${col};font:600 ${sz}px system-ui;paint-order:stroke;stroke:rgba(0,0,0,.72);stroke-width:3px">${esc(t)}</text>`;
  // ---- the roads by class (OpenStreetMap, world/roads.js) ----
  const KIND = () => (ROADS && ROADS.KINDS) || [];
  function ways(min, max) {
    const out = [],
      K = KIND();
    for (const w of (ROADS && ROADS.ways) || []) {
      const k = K[w.kind] || '';
      const r = RCL[k];
      if (r && r.rank >= min && r.rank <= max) out.push({ w, k, r });
    }
    return out;
  }
  // road classes: rank, colour (traffic), level at 25 m in dB(A) – a rough estimate by class, no measurement
  const RCL = {
    motorway: { rank: 6, col: '#d8322a', L25: 72, de: 'Autobahn' },
    main: { rank: 5, col: '#e8572a', L25: 64, de: 'Bundes-/Landesstraße' },
    county: { rank: 4, col: '#f0962b', L25: 59, de: 'Kreisstraße' },
    street: { rank: 3, col: '#f2c94c', L25: 52, de: 'Dorfstraße' },
    lane: { rank: 2, col: '#d9d3c2', L25: 46, de: 'Nebenstraße' },
    service: { rank: 2, col: '#d9d3c2', L25: 44, de: 'Zufahrt' },
    track: { rank: 1, col: '#a98a5a', L25: 38, de: 'Feld- und Waldweg' },
  };
  // distance (m) at which a line source of level L25 (at 25 m) falls to L: −4.5 dB per doubling over soft ground
  const dLine = (L25, L) => (L25 <= L ? 0 : Math.min(320, 25 * Math.pow(10, (L25 - L) / 15)));
  // point sources (sound pressure at 1 m, dB(A)): −6 dB per doubling
  const dPoint = (L1, L) => (L1 <= L ? 0 : Math.min(700, Math.pow(10, (L1 - L) / 20)));
  function machines() {
    const out = [];
    try {
      const G = window.GPLAY;
      if (G && G.M && G.M.run) out.push({ x: G.M.x, y: G.M.y, L1: 92, de: 'Rasenmäher (Benzin)' });
    } catch (e) {}
    try {
      const F = window.FELL,
        P = window.GAME && window.GAME.P;
      if (F && F.saw && F.saw.run && P) out.push({ x: P.x, y: P.y, L1: 105, de: 'Motorsäge' });
    } catch (e) {}
    try {
      const H = window.HOLZSAW,
        sp = KERN.spot('werkstatt');
      if (H && H.busy && sp && sp.pos) out.push({ x: sp.pos[0], y: sp.pos[1], L1: 95, de: 'Blockbandsäge' });
    } catch (e) {}
    // the strategy mode's loud jobs (feat/strategie) at their places
    try {
      const ST = window.STRAT;
      if (ST && ST.job && ST.place)
        for (const j of ST.job.running() || [])
          if (j && j.def && j.def.loud && j.st === 'work') {
            const c = ST.place.pos(j.place);
            if (c) out.push({ x: c[0], y: c[1], L1: 95, de: j.def.label || 'Maschine' });
          }
    } catch (e) {}
    return out;
  }
  function drawLaerm(pr, W, H) {
    let h = '';
    for (const { w, r } of ways(2, 6)) {
      const k = pxPerM(pr, w.p[0], w.p[1]);
      if (!(k > 0)) continue;
      const d55 = dLine(r.L25, 55),
        d45 = dLine(r.L25, 45);
      const runs = project(pr, w.p, W, H, k < 0.4 ? 3 : 1);
      for (const pts of runs) {
        if (d45 > 0)
          h += line(
            pts,
            `stroke:#f2c94c;stroke-opacity:.16;stroke-width:${f1(Math.max(2, 2 * d45 * k))}px;stroke-linecap:round;stroke-linejoin:round`
          );
        if (d55 > 0)
          h += line(
            pts,
            `stroke:#e8572a;stroke-opacity:.26;stroke-width:${f1(Math.max(2, 2 * d55 * k))}px;stroke-linecap:round;stroke-linejoin:round`
          );
      }
    }
    for (const m of machines()) {
      const q = pr(m.x, m.y, 0.5);
      if (!onScr(q, W, H, 400)) continue;
      const k = pxPerM(pr, m.x, m.y);
      h += `<circle cx="${f1(q[0])}" cy="${f1(q[1])}" r="${f1(dPoint(m.L1, 45) * k)}" style="fill:#f2c94c;fill-opacity:.14;stroke:#f2c94c;stroke-opacity:.5"/>`;
      h += `<circle cx="${f1(q[0])}" cy="${f1(q[1])}" r="${f1(dPoint(m.L1, 55) * k)}" style="fill:#e8572a;fill-opacity:.22;stroke:#e8572a;stroke-opacity:.7"/>`;
      h += label([q[0] + 8, q[1] - 6], '🔊 ' + m.de + ' · ' + m.L1 + ' dB(A) in 1 m');
    }
    return h;
  }
  function drawVerkehr(pr, W, H) {
    let h = '';
    for (const { w, r } of ways(1, 6)) {
      const k = pxPerM(pr, w.p[0], w.p[1]);
      const wd = Math.max(1.5, Math.min(9, (r.rank >= 4 ? 7 : r.rank === 3 ? 5.5 : 4) * Math.max(0.35, k)));
      for (const pts of project(pr, w.p, W, H, k < 0.4 ? 3 : 1))
        h += line(
          pts,
          `stroke:${r.col};stroke-opacity:.85;stroke-width:${f1(wd)}px;stroke-linecap:round${r.rank === 1 ? ';stroke-dasharray:6 5' : ''}`
        );
    }
    const car = (x, y, col) => {
      const q = pr(x, y, 0.8);
      if (onScr(q, W, H))
        h += `<circle cx="${f1(q[0])}" cy="${f1(q[1])}" r="4.2" style="fill:${col};stroke:#222;stroke-width:1.2"/>`;
    };
    let n = 0;
    try {
      for (const c of (window.VAUTO && window.VAUTO.cars) || [])
        if (Number.isFinite(c.x)) {
          car(c.x, c.y, '#ffffff');
          n++;
        }
    } catch (e) {}
    try {
      const DC = window.DCARS;
      for (const c of Object.values((DC && DC.cars) || {}))
        if (c && Number.isFinite(c.x)) {
          car(c.x, c.y, '#cfe3ff');
          n++;
        }
    } catch (e) {}
    try {
      const B = window.BUS;
      const list = B
        ? typeof B.list === 'function'
          ? B.list()
          : typeof B.state === 'function'
            ? B.state().inst
            : []
        : [];
      for (const b of list || [])
        if (b && Number.isFinite(b.x)) {
          car(b.x, b.y, '#f2c500');
          n++;
        }
    } catch (e) {}
    S.cars = n;
    return h;
  }
  // ---- sun hours over the garden: the planner's sun (GPSUN) and shadows of the buildings and trees (GPLAN.site), once per day ----
  function sunGrid() {
    const T = today(),
      site = GPLAN && GPLAN.site ? GPLAN.site() : null;
    if (!site) return null;
    const key =
      T.y + '-' + T.m + '-' + T.d + '|' + site.buildings.length + '|' + site.trees.length + '|' + (window.PHASE | 0);
    if (S.sun && S.sunKey === key) return S.sun;
    const t0 = performance.now();
    const B = site.boundary;
    let x0 = 1e9,
      y0 = 1e9,
      x1 = -1e9,
      y1 = -1e9;
    for (const p of B) {
      x0 = Math.min(x0, p[0]);
      y0 = Math.min(y0, p[1]);
      x1 = Math.max(x1, p[0]);
      y1 = Math.max(y1, p[1]);
    }
    x0 -= 6;
    y0 -= 6;
    x1 += 6;
    y1 += 6;
    const cell = 3,
      nx = Math.ceil((x1 - x0) / cell),
      ny = Math.ceil((y1 - y0) / cell),
      shade = new Float32Array(nx * ny);
    const cs = [];
    for (const b of site.buildings) cs.push({ foot: b.foot, h: b.h });
    for (const t of site.trees)
      cs.push({ x: t[0], y: t[1], c: { zb: t[3] * 0.35, zc: t[3] * 0.65, a: t[3] * 0.32, r: t[2] } });
    let n = 0;
    const stepH = 0.5;
    for (let hr = 3; hr <= 22; hr += stepH) {
      const s = GPSUN.sun(T.y, T.m, T.d, hr);
      if (s.el < 3) continue;
      n++;
      // the shadows of this moment, once for all cells
      const sh = [];
      for (const k of cs) {
        if (k.c) {
          const e = GPSUN.crownShadow(k.x, k.y, k.c, s.az, s.el, 0.3);
          if (e) sh.push({ e });
        } else {
          const p = GPSUN.boxShadow(k.foot, k.h, s.az, s.el, 0.3);
          if (p) sh.push({ p });
        }
      }
      for (let j = 0; j < ny; j++)
        for (let i = 0; i < nx; i++) {
          const px = x0 + (i + 0.5) * cell,
            py = y0 + (j + 0.5) * cell;
          for (const q of sh)
            if (
              q.e
                ? Math.abs(px - q.e.cx) <= q.e.A && Math.abs(py - q.e.cy) <= q.e.A && GPSUN.inEllipse(q.e, px, py)
                : GPSUN.inConvex(q.p, px, py)
            ) {
              shade[j * nx + i]++;
              break;
            }
        }
    }
    const hours = new Float32Array(nx * ny);
    for (let i = 0; i < hours.length; i++) hours[i] = (n - shade[i]) * stepH;
    const dl = GPSUN.dayLight(T.y, T.m, T.d);
    S.sun = { x0, y0, cell, nx, ny, hours, n, max: n * stepH, dl, T, ms: Math.round(performance.now() - t0) };
    S.sunKey = key;
    return S.sun;
  }
  const sunCol = h => {
    // 0 h deep blue → 4 h teal → 8 h yellow → 12 h orange
    const st = [
      [0, [52, 66, 112]],
      [4, [62, 140, 150]],
      [8, [242, 201, 76]],
      [12, [240, 130, 40]],
    ];
    let a = st[0],
      b = st[st.length - 1];
    for (let i = 0; i + 1 < st.length; i++)
      if (h >= st[i][0] && h <= st[i + 1][0]) {
        a = st[i];
        b = st[i + 1];
        break;
      }
    const t = b[0] === a[0] ? 0 : Math.max(0, Math.min(1, (h - a[0]) / (b[0] - a[0])));
    return `rgb(${a[1].map((v, i) => Math.round(v + (b[1][i] - v) * t)).join(',')})`;
  };
  function drawSonne(pr, W, H) {
    const G = sunGrid();
    if (!G) return '';
    let h = '';
    for (let j = 0; j < G.ny; j++)
      for (let i = 0; i < G.nx; i++) {
        const x = G.x0 + i * G.cell,
          y = G.y0 + j * G.cell,
          a = pr(x, y, 0.1),
          b = pr(x + G.cell, y, 0.1),
          c = pr(x + G.cell, y + G.cell, 0.1),
          d = pr(x, y + G.cell, 0.1);
        if (!onScr(a, W, H) && !onScr(c, W, H)) continue;
        h += `<polygon points="${f1(a[0])},${f1(a[1])} ${f1(b[0])},${f1(b[1])} ${f1(c[0])},${f1(c[1])} ${f1(d[0])},${f1(d[1])}" style="fill:${sunCol(G.hours[j * G.nx + i])};fill-opacity:.5"/>`;
      }
    return h;
  }
  // ---- nature value ----
  function drawNatur(pr, W, H) {
    let h = '';
    const FO = window.FOREST;
    if (FO && FO.LOBE) {
      const pts = [];
      for (const p of FO.LOBE) {
        const q = pr(p[0], p[1], 0.5);
        pts.push(f1(q[0]) + ',' + f1(q[1]));
      }
      h += `<polygon points="${pts.join(' ')}" style="fill:#3f8f3a;fill-opacity:.22;stroke:#7fd36f;stroke-width:1.6;stroke-dasharray:5 4"/>`;
      const c = FO.LOBE.reduce((s, p) => [s[0] + p[0] / FO.LOBE.length, s[1] + p[1] / FO.LOBE.length], [0, 0]),
        q = pr(c[0], c[1], 2);
      if (onScr(q, W, H)) h += label([q[0] - 40, q[1]], 'Wald an der Klinge · Fichte, Lärche, Kiefer', '#d8f5cf');
    }
    // the brook and its riparian strip (5 m each side, § 38 WHG)
    try {
      const SI = window.SITE;
      if (SI && SI.path && STREAM && STREAM.wpt) {
        const L = Math.hypot(SI.path[1][0] - SI.path[0][0], SI.path[1][1] - SI.path[0][1]),
          flat = [];
        for (let t = -10; t <= L + 10; t += 3) {
          const p = STREAM.wpt(t, STREAM.cOff(t));
          flat.push(p[0], p[1]);
        }
        const k = pxPerM(pr, flat[0], flat[1]);
        for (const pts of project(pr, flat, W, H))
          h +=
            line(
              pts,
              `stroke:#4fb3d9;stroke-opacity:.28;stroke-width:${f1(Math.max(3, 10 * k))}px;stroke-linecap:round`
            ) + line(pts, 'stroke:#4fb3d9;stroke-width:2px');
      }
    } catch (e) {}
    // old trees of the garden and the Dorflinde
    try {
      const site = GPLAN && GPLAN.site ? GPLAN.site() : null;
      for (const t of (site && site.trees) || [])
        if (t[3] >= 12 || t[2] >= 4) {
          const q = pr(t[0], t[1], 0.5),
            k = pxPerM(pr, t[0], t[1]);
          if (onScr(q, W, H))
            h += `<circle cx="${f1(q[0])}" cy="${f1(q[1])}" r="${f1(Math.max(3, t[2] * k))}" style="fill:#2f7d32;fill-opacity:.35;stroke:#a5e39a;stroke-width:1.4"/>`;
        }
      if (VPROPS && VPROPS.LINDE) {
        const q = pr(VPROPS.LINDE[0], VPROPS.LINDE[1], 1);
        if (onScr(q, W, H))
          h +=
            `<circle cx="${f1(q[0])}" cy="${f1(q[1])}" r="6" style="fill:#2f7d32;stroke:#e9f7c8;stroke-width:2"/>` +
            label([q[0] + 9, q[1] + 4], 'Dorflinde (1888)', '#e9f7c8');
      }
    } catch (e) {}
    // what one has seen of the animals (feat/tiere): where the groups live, beetle trees and the stork's quiet zone when known
    try {
      const TI = window.TIERE,
        A = window.TARTEN && window.TARTEN.A;
      if (TI && TI.groupList)
        for (const g of TI.groupList() || []) {
          if (!g || !g.home || !WISSEN.has('tier:' + g.art)) continue;
          const q = pr(g.home[0], g.home[1], 0.5);
          if (onScr(q, W, H))
            h += label([q[0] - 6, q[1] + 4], '🐾 ' + ((A && A[g.art] && A[g.art].name) || g.art), '#f6e7c1', 10.5);
        }
      const TE = window.TEINFLUSS;
      if (TE && TE.kaefer && WISSEN.has('n_kaefer'))
        for (const b of TE.kaefer.list() || [])
          if (b && b.stage > 0 && Number.isFinite(b.x)) {
            const q = pr(b.x, b.y, 0.5);
            if (onScr(q, W, H))
              h += `<circle cx="${f1(q[0])}" cy="${f1(q[1])}" r="3.6" style="fill:#e0312b;stroke:#300;stroke-width:1"/>`;
          }
      const st = TI && TI.groups && TI.groups.find(q => q.art === 'schwarzstorch' && q.nest);
      if (st && (WISSEN.has('n_horst') || WISSEN.has('tier:schwarzstorch'))) {
        const q = pr(st.nest[0], st.nest[1], 1),
          k = pxPerM(pr, st.nest[0], st.nest[1]);
        if (onScr(q, W, H, 300))
          h +=
            `<circle cx="${f1(q[0])}" cy="${f1(q[1])}" r="${f1(300 * k)}" style="fill:none;stroke:#e86a5a;stroke-width:1.5;stroke-dasharray:6 5"/>` +
            `<circle cx="${f1(q[0])}" cy="${f1(q[1])}" r="${f1(100 * k)}" style="fill:#e86a5a;fill-opacity:.18;stroke:#e86a5a;stroke-width:1.5"/>` +
            label([q[0] + 6, q[1] - 6], 'Ruhezone Schwarzstorch', '#ffd2c9');
      }
    } catch (e) {}
    return h;
  }
  // ---- what the villagers think of you (amt/amt_model.js: 0–100) at their front doors ----
  const moodCol = v => (v >= 65 ? '#5cbf5a' : v >= 45 ? '#f2c94c' : v >= 30 ? '#f0962b' : '#e0312b');
  function drawStimmung(pr, W, H) {
    let h = '';
    try {
      const st = AMT.state(),
        homes = AMT.homes() || {};
      for (const [k, v] of Object.entries(st.rep || {})) {
        const hm = homes[k],
          P0 = hm && (hm.step || hm.door);
        let pos = P0;
        if (!pos) {
          const N = window.NPC && window.NPC.NPCS && window.NPC.NPCS[k];
          if (N && Number.isFinite(N.x)) pos = [N.x, N.y];
        }
        if (!pos) continue;
        const q = pr(pos[0], pos[1], 1);
        if (!onScr(q, W, H)) continue;
        const nm = (AMT.data && AMT.data.P && AMT.data.P[k] && AMT.data.P[k].name) || k;
        h +=
          `<circle cx="${f1(q[0])}" cy="${f1(q[1])}" r="7" style="fill:${moodCol(v)};stroke:#1d1b18;stroke-width:1.5"/>` +
          label([q[0] + 10, q[1] + 4], nm + ' ' + v, '#fff');
      }
    } catch (e) {}
    return h;
  }
  // ---- the layers ----
  const LAYERS = [
    {
      id: 'w_laerm',
      icon: '🔊',
      label: 'Lärm',
      text: 'Straßen nach ihrer Klasse, laufende Maschinen, die Ruhezeiten von heute',
      draw: drawLaerm,
      entry: 'p_laerm',
      legend: () => {
        const q = quiet();
        return (
          `<p class="wd-q${q.loud ? '' : ' no'}">${esc(q.text)} ${WISSEN.whyHTML(q.id)}</p>` +
          '<div class="wd-k"><i style="background:rgba(232,87,42,.55)"></i>über 55 dB(A) <i style="background:rgba(242,201,76,.4)"></i>über 45 dB(A)</div>' +
          '<small>Näherung nach Straßenklasse (OpenStreetMap) und typischem Schallpegel der Maschinen – keine Messung. Eine amtliche Lärmkarte gibt es nur für Straßen mit mehr als 3 Mio. Fahrzeugen im Jahr.</small>'
        );
      },
    },
    {
      id: 'w_verkehr',
      icon: '🚗',
      label: 'Verkehr',
      text: 'Die Straßen nach Klasse, die Autos und Busse, die gerade fahren',
      draw: drawVerkehr,
      entry: 'p_verkehr',
      legend: () =>
        '<div class="wd-k">' +
        ['main', 'county', 'street', 'lane', 'track']
          .map(k => `<i style="background:${RCL[k].col}"></i>${RCL[k].de}`)
          .join(' ') +
        `</div><p>Gerade unterwegs: <b>${S.cars | 0}</b> Fahrzeuge (weiß: Verkehr, hellblau: Autos der Dorfbewohner, gelb: Bus).</p>` +
        '<small>Straßenklassen aus OpenStreetMap. Zählwerte für die Straßen um Ratscher liegen hier nicht vor – das Spiel zeigt, was gerade fährt.</small>',
    },
    {
      id: 'w_sonne',
      icon: '☀️',
      label: 'Sonne',
      text: 'Sonnenstunden des Spieltags im Garten – Schatten von Gebäuden und Bäumen',
      draw: drawSonne,
      entry: 'n_sonne',
      legend: () => {
        const G = sunGrid();
        if (!G) return '<p>Erst wenn der Garten geladen ist.</p>';
        const hh = v => (v == null ? '–' : Math.floor(v) + ':' + String(Math.round((v % 1) * 60)).padStart(2, '0'));
        return (
          `<div class="wd-g" style="background:linear-gradient(90deg,${sunCol(0)},${sunCol(4)},${sunCol(8)},${sunCol(12)})"></div><div class="wd-gl"><span>0 h</span><span>4</span><span>8</span><span>12 h</span></div>` +
          `<p>Am ${G.T.d}.${G.T.m}.${G.T.y}: Sonne über dem Horizont von ${hh(G.dl.rise)} bis ${hh(G.dl.set)} Uhr; mehr als 3° hoch rund ${f1(G.max)} h.</p>` +
          '<small>Sonnenstand über Ratscher (NOAA-Formeln) und die Schatten von Gebäuden und Baumkronen – dieselbe Rechnung wie im Gartenplaner.</small>'
        );
      },
    },
    {
      id: 'w_natur',
      icon: '🌿',
      label: 'Naturwert',
      text: 'Wald, Bach mit Uferstreifen, alte Bäume, gesehene Tiere, Ruhezonen',
      draw: drawNatur,
      entry: 'n_naturwert',
      legend: () => {
        const TE = window.TEINFLUSS;
        let nw = '';
        try {
          if (TE && TE.naturwert)
            nw = `<p>Naturwert der Gegend (seltene Arten, Ruhezonen, Gesundheit des Walds): <b>${TE.naturwert()}</b> von 100.</p>`;
        } catch (e) {}
        return (
          '<div class="wd-k"><i style="background:rgba(63,143,58,.6)"></i>Wald <i style="background:#4fb3d9"></i>Bach mit 5 m Uferstreifen <i style="background:#2f7d32"></i>alte Bäume <i style="background:#e0312b"></i>Käferbäume</div>' +
          nw +
          '<small>Tiere erscheinen, sobald du sie gesehen hast; Käferbäume und die Ruhezone am Horst, wenn du von ihnen weißt.</small>'
        );
      },
    },
    {
      id: 'w_stimmung',
      icon: '🙂',
      label: 'Stimmung',
      text: 'Was die Leute im Dorf von dir halten (Wahl und Amt)',
      draw: drawStimmung,
      entry: 'p_stimmung',
      legend: () => {
        let st = '';
        try {
          const ST = window.STRAT;
          if (ST && ST.S && Number.isFinite(ST.S.style))
            st = `<p>Dein Stil (Strategie-Modus): <b>${Math.round(ST.S.style)}</b> (−100 rücksichtslos … +100 vorbildlich).</p>`;
        } catch (e) {}
        return (
          '<div class="wd-k"><i style="background:#5cbf5a"></i>gut (ab 65) <i style="background:#f2c94c"></i>offen <i style="background:#f0962b"></i>skeptisch <i style="background:#e0312b"></i>verärgert (unter 30)</div>' +
          st +
          '<small>Meinungen 0–100 aus „Wahl und Amt“: Reden, Versprechen halten, Ruhezeiten, Hilfe – an der Haustür der Leute.</small>'
        );
      },
    },
  ];
  const BYID = Object.fromEntries(LAYERS.map(L => [L.id, L]));
  // entries one finds by switching a view on (learning by seeing)
  const ENT = [
    {
      id: 'p_laerm',
      ch: 'politik',
      icon: '🔊',
      title: 'Lärm und Ruhe',
      text: 'Lärm nimmt mit dem Abstand ab: bei einer einzelnen Maschine um etwa 6 dB je Verdopplung der Entfernung, bei einer Straße um 3 bis 4,5 dB. 10 dB mehr hören wir etwa als doppelt so laut.',
      here: 'Amtliche Lärmkarten gibt es nur für Hauptverkehrsstraßen mit mehr als drei Millionen Fahrzeugen im Jahr – nicht für die Straßen um Ratscher. Für laute Geräte gelten Ruhezeiten: werktags 20 bis 7 Uhr und sonn- und feiertags ganz.',
      src: [
        [
          '32. BImSchV (Geräte- und Maschinenlärmschutzverordnung) § 7',
          'https://www.gesetze-im-internet.de/bimschv_32/__7.html',
        ],
        [
          '§ 47b Bundes-Immissionsschutzgesetz – Lärmkartierung (Hauptverkehrsstraßen)',
          'https://www.gesetze-im-internet.de/bimschg/__47b.html',
        ],
        ['Schallpegel (Wikipedia)', 'https://de.wikipedia.org/wiki/Schalldruckpegel'],
      ],
      hint: 'Auf der Draufsicht die Daten-Ansicht „Lärm“ einschalten.',
      find: { ev: [['wissen:ansicht', d => d && d.id === 'w_laerm' && d.on]] },
    },
    {
      id: 'p_verkehr',
      ch: 'politik',
      icon: '🚗',
      title: 'Straßen und ihre Klassen',
      text: 'Bundesstraßen, Landesstraßen und Kreisstraßen gehören dem Bund, dem Land oder dem Landkreis – sie bauen und unterhalten sie. Gemeindestraßen und Feldwege sind Sache der Stadt.',
      here: 'Durch das Tal führt die Landesstraße L 1625 nach Schleusingen und Kloster Veßra. Wer auf ihr Tempo 30 will, fragt nicht die Stadt, sondern die Straßenverkehrsbehörde im Landratsamt.',
      src: [
        ['Straßenklasse (Wikipedia)', 'https://de.wikipedia.org/wiki/Straßenklasse'],
        ['Im Spiel: „Wahl und Amt“ – wer entscheidet was', 'https://landesrecht.thueringen.de/'],
      ],
      hint: 'Auf der Draufsicht die Daten-Ansicht „Verkehr“ einschalten.',
      find: { ev: [['wissen:ansicht', d => d && d.id === 'w_verkehr' && d.on]] },
    },
    {
      id: 'n_sonne',
      ch: 'natur',
      icon: '☀️',
      title: 'Sonne und Schatten im Garten',
      text: 'Wie viel Sonne ein Fleck Erde bekommt, hängt vom Tag im Jahr (Sonnenhöhe und Tageslänge) und von allem ab, was Schatten wirft. Im Dezember steht die Sonne über Ratscher mittags nur gut 16° hoch, im Juni über 62°.',
      here: 'Obstbäume und Gemüse brauchen mindestens sechs Sonnenstunden; im Schatten der Erle und der Gebäude wachsen besser Farne, Waldmeister oder Johannisbeeren. Der Gartenplaner rechnet dasselbe für jede Pflanze.',
      src: [
        ['Sonnenstand (Wikipedia)', 'https://de.wikipedia.org/wiki/Sonnenstand'],
        ['NOAA Solar Calculator (Formeln für den Sonnenstand)', 'https://gml.noaa.gov/grad/solcalc/'],
      ],
      hint: 'Auf der Draufsicht die Daten-Ansicht „Sonne“ einschalten.',
      find: { ev: [['wissen:ansicht', d => d && d.id === 'w_sonne' && d.on]] },
    },
    {
      id: 'n_naturwert',
      ch: 'natur',
      icon: '🌿',
      title: 'Was Natur wertvoll macht',
      text: 'Vielfalt entsteht an Übergängen: Waldrand, Hecke, Bach und Wiese bieten auf kleinem Raum Nahrung, Deckung und Brutplätze. Alte Bäume mit Höhlen und Totholz sind Wohnungen für Spechte, Fledermäuse und Käfer.',
      here: 'Um Ratscher treffen Wald, Wiesen und der Bach aufeinander. Uferstreifen und Ruhezonen am Horst sind deshalb im Gesetz geschützt; Hecken darf man im Sommer nicht roden.',
      src: [
        ['Biodiversität (Wikipedia)', 'https://de.wikipedia.org/wiki/Biodiversität'],
        ['§ 39 Bundesnaturschutzgesetz', 'https://www.gesetze-im-internet.de/bnatschg_2009/__39.html'],
      ],
      hint: 'Auf der Draufsicht die Daten-Ansicht „Naturwert“ einschalten.',
      find: { ev: [['wissen:ansicht', d => d && d.id === 'w_natur' && d.on]] },
    },
    {
      id: 'p_stimmung',
      ch: 'politik',
      icon: '🙂',
      title: 'Ansehen im Dorf',
      text: 'Auf dem Dorf kennt man sich: Wer zuhört, hilft und Versprechen hält, gewinnt Vertrauen; wer laut ist, wenn andere Ruhe wollen, verliert es. Vertrauen ist die Währung des Ehrenamts.',
      here: 'Im Spiel bewegt sich die Meinung jedes Menschen in Ratscher zwischen 0 und 100 – sie entscheidet über Unterschriften, Stimmen und Hilfe bei Dorfprojekten.',
      src: [
        ['Sozialkapital (Wikipedia)', 'https://de.wikipedia.org/wiki/Sozialkapital'],
        ['Im Spiel: „Wahl und Amt“ (feat/ortsvorsteher)', 'https://landesrecht.thueringen.de/'],
      ],
      hint: 'Auf der Draufsicht die Daten-Ansicht „Stimmung“ einschalten.',
      find: { ev: [['wissen:ansicht', d => d && d.id === 'w_stimmung' && d.on]] },
    },
  ];
  for (const e of ENT) WISSEN.add(e);
  // ---- the plan view: its overlay (world/siteplan.js hooks) and a small panel with the switches and the legend ----
  const stratOn = () => !!(window.STRAT && window.STRAT.on);
  SITEPLAN.hooks.push({
    draw(pr, W, H) {
      if (stratOn()) return '';
      let h = '';
      const p = wrapPlan(pr);
      for (const L of LAYERS)
        if (S.on[L.id])
          try {
            h += L.draw(p, W, H) || '';
          } catch (e) {
            if (!L.err) {
              L.err = 1;
              console.warn('wissen: Ansicht', L.id, e);
            }
          }
      return h;
    },
  });
  const CSS = `
#widaten{position:absolute;z-index:7;left:max(12px,env(safe-area-inset-left,0px));bottom:calc(64px + env(safe-area-inset-bottom,0px));width:min(320px,calc(100% - 24px));max-height:calc(100% - 200px);overflow:auto;background:rgba(24,23,20,.86);color:#f3efe6;border-radius:10px;padding:8px 10px;font:400 12.5px/1.4 var(--f-body);box-shadow:0 6px 22px rgba(0,0,0,.35)}
#widaten[hidden]{display:none}
#widaten b.t{display:block;font:700 13px/1.2 var(--f-display);margin-bottom:6px}
#widaten .wd-c{display:flex;flex-wrap:wrap;gap:5px}
#widaten .wd-c button{border:1px solid rgba(255,255,255,.28);background:transparent;color:#f3efe6;border-radius:999px;font:500 12px/1 var(--f-body);padding:6px 9px;cursor:pointer}
#widaten .wd-c button[aria-pressed=true]{background:#f3e2b8;color:#2b2420;border-color:#f3e2b8;font-weight:700}
#widaten .wd-l{margin-top:8px;border-top:1px solid rgba(255,255,255,.16);padding-top:6px}
#widaten .wd-l h6{margin:4px 0 2px;font:700 12px/1.2 var(--f-body)}
#widaten .wd-l p{margin:3px 0}
#widaten .wd-l small{display:block;opacity:.72;font-size:11px;line-height:1.35;margin-top:2px}
#widaten .wd-k{display:flex;flex-wrap:wrap;gap:3px 8px;align-items:center;font-size:11.5px}
#widaten .wd-k i{display:inline-block;width:14px;height:9px;border-radius:2px;margin-right:3px;vertical-align:-1px}
#widaten .wd-g{height:9px;border-radius:3px}
#widaten .wd-gl{display:flex;justify-content:space-between;font-size:10.5px;opacity:.8}
#widaten .wd-q.no{color:#ffc9bd}
#widaten .wi-q{background:transparent;color:#f3e2b8;border-color:#f3e2b8}
@media (max-width:560px){#widaten{bottom:calc(120px + env(safe-area-inset-bottom,0px));max-height:40%}}
`;
  function mkPanel() {
    const st = document.createElement('style');
    st.textContent = CSS;
    document.head.appendChild(st);
    const el = document.createElement('div');
    el.id = 'widaten';
    el.hidden = true;
    el.setAttribute('aria-label', 'Daten-Ansichten');
    ($('p-3d') || document.body).appendChild(el);
    el.addEventListener('click', e => {
      const b = e.target.closest('[data-wd]');
      if (b) set(b.dataset.wd, !isOn(b.dataset.wd));
    });
    S.el = el;
  }
  const isOn = id => (stratOn() && window.STRAT.layer ? window.STRAT.layer.on(id) && !!S.strat : !!S.on[id]);
  function render() {
    if (!S.el) return;
    const strat = stratOn();
    const act = LAYERS.filter(L => isOn(L.id));
    let h = '';
    if (!strat)
      h +=
        '<b class="t">Daten-Ansichten</b><div class="wd-c">' +
        LAYERS.map(
          L =>
            `<button type="button" data-wd="${L.id}" aria-pressed="${!!S.on[L.id]}" title="${esc(L.text)}">${L.icon} ${esc(L.label)}</button>`
        ).join('') +
        '</div>';
    if (act.length) {
      h += '<div class="wd-l">';
      for (const L of act) {
        let lg = '';
        try {
          lg = L.legend();
        } catch (e) {}
        h += `<h6>${L.icon} ${esc(L.label)}</h6>${lg}`;
      }
      h += '</div>';
    }
    S.el.innerHTML = h;
  }
  function set(id, v) {
    const L = BYID[id];
    if (!L) return false;
    if (stratOn() && window.STRAT.layer && S.strat) window.STRAT.layer.set(id, !!v);
    else S.on[id] = !!v;
    if (v && L.entry) WISSEN.found(L.entry, 'tun:die Daten-Ansicht „' + L.label + '“ eingeschaltet');
    KERN.emit('wissen:ansicht', { id, on: !!v });
    try {
      if (SITEPLAN.S.on) SITEPLAN.drawOverlay();
    } catch (e) {}
    render();
    return true;
  }
  // the strategy mode (feat/strategie): the views as layers of its panel „Ebenen“, off at first
  function stratLayers() {
    const ST = window.STRAT;
    if (S.strat || !ST || !ST.layer || typeof ST.layer.define !== 'function') return;
    S.strat = true;
    LAYERS.forEach((L, i) =>
      ST.layer.define({
        id: L.id,
        label: L.icon + ' ' + L.label + ' (Daten)',
        text: L.text,
        order: 90 + i,
        on: false,
        draw: (pr, W, H) => {
          try {
            return L.draw(pr, W, H) || '';
          } catch (e) {
            return '';
          }
        },
      })
    );
  }
  // shown with the plan view (and in the strategy mode while one of the views is on); the legend follows the clock and the cars
  let acc = 0,
    last = '';
  KERN.tick(dt => {
    acc += dt;
    if (acc < 0.5) return;
    acc = 0;
    stratLayers();
    const strat = stratOn(),
      plan = !!(SITEPLAN.S && SITEPLAN.S.on);
    const any = LAYERS.some(L => isOn(L.id));
    const show = (plan && !strat) || (strat && any);
    if (show && !S.el) mkPanel();
    if (S.el && S.el.hidden === show) S.el.hidden = !show;
    S.shown = show;
    if (!show) return;
    const key =
      LAYERS.map(L => +isOn(L.id)).join('') +
      '|' +
      strat +
      '|' +
      Math.floor(((CLOCK && CLOCK.t) || 0) / 10) +
      '|' +
      (S.cars | 0);
    if (key !== last) {
      last = key;
      render();
    }
    // the moving things (cars, running machines) need the overlay drawn now and then – once a second, only then
    S.redraw = (S.redraw || 0) + 1;
    if (!strat && plan && S.redraw % 2 === 0 && (S.on.w_verkehr || (S.on.w_laerm && machines().length)))
      try {
        SITEPLAN.drawOverlay();
      } catch (e) {}
  }, 'wissen/daten');
  return {
    LAYERS,
    set,
    isOn,
    sunGrid,
    quiet,
    holiday,
    state: () => ({
      on: LAYERS.filter(L => isOn(L.id)).map(L => L.id),
      shown: S.shown,
      strat: S.strat,
      sun: S.sun
        ? {
            nx: S.sun.nx,
            ny: S.sun.ny,
            max: S.sun.max,
            ms: S.sun.ms,
            min: Math.min(...S.sun.hours),
            maxH: Math.max(...S.sun.hours),
          }
        : null,
      cars: S.cars | 0,
    }),
    S,
  };
})();
window.WDATEN = WDATEN;
