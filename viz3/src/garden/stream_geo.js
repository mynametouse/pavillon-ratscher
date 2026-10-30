// ---------- the stream (Bach) along the north boundary: shared geometry for ground painting, terrain, walking and meshes ----------
// It runs parallel to the field path through all three plots (Hubert – owner – Ronald), 1.5 m below the meadow, and flows from east to west.
// Cross-section: gravel bed with ~1 m of water (15–21 cm deep), banks rising steeply from the water and rounding off into the meadow 2.25 m
// from the centre (4.5 m wide at the top). Asphalt bridge 2.5 m wide (no railing) north of the pavilion; on the garden side a stair of
// oak sleepers to a stone landing at the water, 3 m left and right of the bridge.
import { LATE } from '../core/late.js';
export const STREAM = (() => {
  const S = window.SITE,
    P1 = S.path[0],
    P2 = S.path[1],
    L0 = Math.hypot(P2[0] - P1[0], P2[1] - P1[1]);
  const U = [(P2[0] - P1[0]) / L0, (P2[1] - P1[1]) / L0];
  let N = [-U[1], U[0]];
  if (N[1] > 0) N = [-N[0], -N[1]]; // N: from the field path into the gardens
  const OFF = 4.6,
    WT = 2.25,
    WB = 0.4,
    D = 1.5,
    WZ = -D + 0.15,
    WW = 0.52; // centre line from the path axis, half width top / bed, depth, water level, water half width
  const loc = (x, y) => {
    const dx = x - P1[0],
      dy = y - P1[1];
    return [dx * U[0] + dy * U[1], dx * N[0] + dy * N[1]];
  }; // → [t along the path, o towards the garden]
  const wpt = (t, o) => [P1[0] + U[0] * t + N[0] * o, P1[1] + U[1] * t + N[1] * o];
  const TB = (2.8 - (P1[0] + N[0] * OFF)) / U[0]; // the bridge: where the centre line crosses x = 2.8, due north of the pavilion
  const ss = (a, b, x) => {
    const u = Math.min(1, Math.max(0, (x - a) / (b - a)));
    return u * u * (3 - 2 * u);
  };
  // east of the garden the field path bends south towards the village (OSM track, orthophoto) and the brook keeps to its south side
  // (Falko, 30.10.2026: no bridge there): the centre line follows the path's offset from the straight axis, [t, o] of the track's points
  const BEND = [
    [52, 0],
    [56, 0.4],
    [63.4, 3.3],
    [76.8, 12.1],
    [92.6, 23.1],
    [108.3, 31.8],
    [130, 45],
  ];
  const bend = t => {
    if (t <= BEND[0][0]) return 0;
    for (let i = 1; i < BEND.length; i++)
      if (t <= BEND[i][0]) {
        const [t0, o0] = BEND[i - 1],
          [t1, o1] = BEND[i];
        return o0 + ((o1 - o0) * (t - t0)) / (t1 - t0);
      }
    const [t0, o0] = BEND[BEND.length - 2],
      [t1, o1] = BEND[BEND.length - 1];
    return o1 + ((o1 - o0) * (t - t1)) / (t1 - t0);
  };
  const cOff = t =>
    OFF + bend(t) + ss(6.5, 13, Math.abs(t - TB)) * (0.45 * Math.sin(t / 6.3 + 1.1) + 0.22 * Math.sin(t / 2.6 + 0.4)); // gentle meander, straight at the bridge
  function prof(a) {
    a = Math.abs(a);
    if (a >= WT) return 0;
    if (a <= WB) return -D - 0.06 * (1 - (a / WB) * (a / WB));
    const u = (a - WB) / (WT - WB);
    return -D + D * (1 - (1 - u) * (1 - u));
  }
  // stairs (garden side): landing YL0..YL1 from the centre, 6 treads of TG up to YT, 7 risers of RH; terrain under them is cut to a straight ramp
  const SR = 7,
    ZL = WZ + 0.08,
    RH = -ZL / SR,
    TG = 0.26,
    YL0 = 0.55,
    YL1 = 1.05,
    YT = YL1 + (SR - 1) * TG,
    SW = 0.55;
  const STAIRS = [-3.0, 3.0].map(dx => ({ t: TB + dx, side: Math.sign(dx) }));
  function stairCut(t, a) {
    if (a < YL0 - 0.1 || a > YT + 0.05) return null;
    for (const s of STAIRS) {
      const dt = Math.abs(t - s.t);
      if (dt > SW + 0.45) continue;
      const k = 1 - ss(SW + 0.05, SW + 0.45, dt);
      const r = a <= YL1 ? ZL - 0.03 : ZL + ((a - YL1) / TG) * RH - 0.012;
      return [k, r];
    }
    return null;
  }
  const tLim = (() => {
    let a = -400,
      b = 400;
    const inside = t => {
      const p = wpt(t, cOff(t));
      return Math.abs(p[0]) < 119 && Math.abs(p[1]) < 119;
    };
    while (!inside(a)) a += 0.5;
    while (!inside(b)) b -= 0.5;
    return [a, b];
  })();
  const kD = t => ss(tLim[0], tLim[0] + 15, t) * (1 - ss(tLim[1] - 15, tLim[1], t));
  function zAtTA(t, o) {
    const a = o - cOff(t);
    let z = prof(a);
    if (a > 0 && z < 0) {
      const c = stairCut(t, a);
      if (c) z += (Math.min(z, c[1]) - z) * c[0];
    }
    return z * kD(t);
  }
  const zAt = (x, y) => {
    const [t, o] = loc(x, y);
    const a = o - cOff(t);
    if (a <= -WT || a >= WT + 0.05) return 0;
    return zAtTA(t, o);
  };
  const across = (x, y) => {
    const [t, o] = loc(x, y);
    return o - cOff(t);
  }; // signed distance from the centre line (+ towards the garden)
  const inDitch = (x, y, pad = 0) => Math.abs(across(x, y)) < WT + pad;
  const inWater = (x, y) => Math.abs(across(x, y)) < WW;
  // the bridge in its own frame: x along the stream (U), y across towards the field path (−N); deck 2.5 × 6.2 m
  const ang = Math.atan2(U[1], U[0]),
    BR = {
      t: TB,
      c: wpt(TB, OFF),
      w: 1.25,
      l: 3.1,
      ang,
      rot: { cx: wpt(TB, OFF)[0], cy: wpt(TB, OFF)[1], c: Math.cos(ang), s: Math.sin(ang) },
    };
  const onBridge = (x, y) => {
    const [t, o] = loc(x, y);
    return Math.abs(t - TB) < BR.w && Math.abs(o - OFF) < BR.l;
  };
  // trees from the aerial photo that would stand in the ditch move to the top of the nearer bank; none on the bridge or the stairs
  for (const tr of S.trees) {
    const [t, o] = loc(tr[0], tr[1]);
    const a = o - cOff(t);
    if (Math.abs(a) >= WT + 0.5) continue;
    let t2 = t;
    const a2 = (a < 0 ? -1 : 1) * (WT + 0.55 + 0.25 * Math.abs(Math.sin(t * 7.3)));
    if (Math.abs(t2 - TB) < 5.2) t2 = TB + (t2 < TB ? -5.2 : 5.2);
    const p = wpt(t2, cOff(t2) + a2);
    tr[0] = +p[0].toFixed(2);
    tr[1] = +p[1].toFixed(2);
  }
  // trees from the aerial photo that stand where the workshop and its log store are now (south end) are left out – not the trees of today
  // that carry a last phase (site.js [5]: there until the hall is built, garden/trees.js)
  for (let i = S.trees.length - 1; i >= 0; i--) {
    const [x, y] = S.trees[i];
    if (S.trees[i][5] != null) continue;
    if ((x > -7.8 && x < 4.8 && y > -41.8 && y < -35.4) || (x > -11.6 && x < -6.4 && y > -41.2 && y < -36.0))
      S.trees.splice(i, 1);
  }
  // garden path from the bridge to the pavilion
  const bridgeGardenEnd = wpt(TB, OFF + BR.l);
  // ground painting (colour map and detail mask of the 240 m ground): bands between two offsets from the meandering centre line
  function band(g, toPx, a0, a1, step = 1) {
    const L = [],
      R = [];
    for (let t = tLim[0]; t <= tLim[1] + step; t += step) {
      const tt = Math.min(t, tLim[1]);
      L.push(toPx(...wpt(tt, cOff(tt) + a0)));
      R.push(toPx(...wpt(tt, cOff(tt) + a1)));
    }
    g.beginPath();
    L.forEach((q, i) => (i ? g.lineTo(...q) : g.moveTo(...q)));
    for (let i = R.length - 1; i >= 0; i--) g.lineTo(...R[i]);
    g.closePath();
    g.fill();
  }
  function paint(g, toPx) {
    // banks shaded green, lower banks earthy, wet margin at the water
    for (const [w, c] of [
      [WT + 0.25, '#78904c'],
      [WT - 0.35, '#6c8546'],
      [1.25, '#66703f'],
      [0.85, '#5f5f3f'],
      [0.6, '#56523f'],
      [WW, '#4f4b3c'],
    ]) {
      g.fillStyle = c;
      band(g, toPx, -w, w, 0.7);
    }
  }
  function paintMask(g, toPx) {
    const op = g.globalCompositeOperation;
    g.globalCompositeOperation = 'lighter';
    g.fillStyle = 'rgb(0,255,0)';
    band(g, toPx, -(WT + 0.4), WT + 0.4, 0.7); // near detail on the banks
    g.fillStyle = 'rgb(255,0,0)';
    band(g, toPx, -0.62, 0.62, 0.5); // gravel bed
    g.fillStyle = 'rgb(0,0,255)';
    band(g, toPx, -(WT - 0.08), WT - 0.08, 0.5); // the flat ground is cut away here (the ditch mesh takes over)
    for (const s of STAIRS) {
      const c = cOff(s.t),
        q = [
          [-SW - 0.4, WT - 0.2],
          [SW + 0.4, WT - 0.2],
          [SW + 0.4, YT + 0.12],
          [-SW - 0.4, YT + 0.12],
        ].map(([dt, a]) => toPx(...wpt(s.t + dt, c + a))); // and over the notch of each stair
      g.beginPath();
      q.forEach((p, i) => (i ? g.lineTo(...p) : g.moveTo(...p)));
      g.closePath();
      g.fill();
    }
    g.globalCompositeOperation = op;
  }
  // the brook's sound: one loop that follows the listener along the stream (always at the nearest point of the water)
  function listen(x, y) {
    try {
      const [t] = loc(x, y),
        p = wpt(t, cOff(t));
      if (!LATE.audio.hasLoop('brook')) LATE.audio.loopAt('brook', 'stream', p[0], p[1], { vol: 0.9, ref: 4.5 });
      else LATE.audio.moveLoop('brook', p[0], p[1]);
    } catch (e) {}
  }
  return {
    listen,
    tLim,
    kD,
    band,
    paint,
    paintMask,
    U,
    N,
    L0,
    OFF,
    WT,
    WB,
    D,
    WZ,
    WW,
    TB,
    loc,
    wpt,
    cOff,
    prof,
    zAt,
    zAtTA,
    across,
    inDitch,
    inWater,
    onBridge,
    BR,
    STAIRS,
    SR,
    ZL,
    RH,
    TG,
    YL0,
    YL1,
    YT,
    SW,
    bridgeGardenEnd,
  };
})();
window.STREAM = STREAM;
