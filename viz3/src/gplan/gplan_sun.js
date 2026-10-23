// ===================== garden planner 2: sun and shade (GPSUN) =====================
// Pure (tested in node: viz3/test/unit/gplan_sun.test.mjs). The sun over the garden at Ratscher (50.4991° N, 10.7692° E) for a date and a
// local time (CET, CEST from the last Sunday in March to the last Sunday in October) – the same NOAA formulas with refraction as
// time/daynight.js (DN). Shadows on level ground: a crown is an ellipsoid over its trunk, its shadow an ellipse (an affine image of the
// ellipsoid); a building is a box, its shadow the hull of its foot and its roof moved along the sun. shadeShare samples a day.
// Coordinates of the site: x east, y north (m); azimuth from north over east (degrees).
export const GPSUN = (() => {
  const LAT = 50.4991,
    LON = 10.7692,
    D2R = Math.PI / 180,
    R2D = 180 / Math.PI,
    { sin, cos, asin, atan2, tan } = Math;
  // ---- calendar: local civil time → Julian day ----
  const lastSunday = (y, mo) => {
    const d = new Date(Date.UTC(y, mo + 1, 0));
    return Date.UTC(y, mo, d.getUTCDate() - d.getUTCDay()) / 864e5;
  };
  // offset of the local time from UTC (hours) on a day (1 = CET, 2 = CEST)
  function tz(y, m, d) {
    const e = Date.UTC(y, m - 1, d) / 864e5;
    return e >= lastSunday(y, 2) && e < lastSunday(y, 9) ? 2 : 1;
  }
  const jdOf = (y, m, d, hour) => Date.UTC(y, m - 1, d) / 864e5 + 2440587.5 + (hour - tz(y, m, d)) / 24;
  // ---- the sun (as time/daynight.js) ----
  function sunEq(jd) {
    const T = (jd - 2451545) / 36525,
      L0 = (280.46646 + T * (36000.76983 + T * 0.0003032)) % 360,
      M = (357.52911 + T * (35999.05029 - 0.0001537 * T)) * D2R;
    const C =
        sin(M) * (1.914602 - T * (0.004817 + 0.000014 * T)) +
        sin(2 * M) * (0.019993 - 0.000101 * T) +
        sin(3 * M) * 0.000289,
      om = (125.04 - 1934.136 * T) * D2R;
    const lam = (L0 + C - 0.00569 - 0.00478 * sin(om)) * D2R,
      eps = (23.439291 - 0.0130042 * T + 0.00256 * cos(om)) * D2R;
    return { ra: atan2(cos(eps) * sin(lam), cos(lam)), dec: asin(sin(eps) * sin(lam)) };
  }
  const gmst = jd => {
    const d = jd - 2451545,
      T = d / 36525;
    return (((280.46061837 + 360.98564736629 * d + T * T * (0.000387933 - T / 38710000)) % 360) + 360) % 360;
  };
  const refr = el => {
    const h = Math.max(el, -1),
      r = 1.02 / tan((h + 10.3 / (h + 5.11)) * D2R) / 60;
    return el >= -1 ? r : r * Math.max(0, 1 + (el + 1) / 3);
  };
  // sun at a Julian day: azimuth (0 = north, 90 = east) and apparent elevation (degrees)
  function sunJD(jd) {
    const s = sunEq(jd),
      lst = (gmst(jd) + LON) % 360,
      H = lst * D2R - s.ra,
      la = LAT * D2R;
    const el = asin(sin(la) * sin(s.dec) + cos(la) * cos(s.dec) * cos(H)) * R2D;
    const az = (((atan2(sin(H), cos(H) * sin(la) - tan(s.dec) * cos(la)) * R2D + 180) % 360) + 360) % 360;
    return { az, el: el + refr(el) };
  }
  // sun on a calendar day at a local hour (10.5 = 10:30)
  const sun = (y, m, d, hour) => sunJD(jdOf(y, m, d, hour));
  // ---- shadows on a level plane at height z0 ----
  // crown ellipsoid (x, y, zc, horizontal radius r, half height a) → ellipse { cx, cy, A along the shadow, B across, ux, uy }
  function crownShadow(x, y, c, az, el, z0 = 0) {
    if (el <= 0.5) return null;
    const top = c.zc + c.a;
    if (top <= z0) return null;
    const ct = 1 / tan(el * D2R),
      ux = -sin(az * D2R),
      uy = -cos(az * D2R);
    const zc = Math.max(0, c.zc - z0),
      a = c.zc - z0 < c.a ? Math.min(c.a, top - z0) : c.a;
    const A = Math.hypot(c.r, a * ct);
    return { cx: x + ux * zc * ct, cy: y + uy * zc * ct, A, B: c.r, ux, uy };
  }
  function inEllipse(e, px, py) {
    const dx = px - e.cx,
      dy = py - e.cy,
      u = (dx * e.ux + dy * e.uy) / e.A,
      v = (-dx * e.uy + dy * e.ux) / e.B;
    return u * u + v * v <= 1;
  }
  function ellipsePoly(e, n = 28) {
    const out = [];
    for (let i = 0; i < n; i++) {
      const t = (i / n) * Math.PI * 2,
        a = cos(t) * e.A,
        b = sin(t) * e.B;
      out.push([e.cx + e.ux * a - e.uy * b, e.cy + e.uy * a + e.ux * b]);
    }
    return out;
  }
  // trunk as a thin box from the ground to the crown base: its shadow as a quad (or null)
  function trunkShadow(x, y, zTop, r, az, el, z0 = 0) {
    if (el <= 0.5 || zTop <= z0 || r <= 0) return null;
    const L = (zTop - z0) / tan(el * D2R),
      ux = -sin(az * D2R),
      uy = -cos(az * D2R),
      nx = -uy * r,
      ny = ux * r;
    return [
      [x + nx, y + ny],
      [x + nx + ux * L, y + ny + uy * L],
      [x - nx + ux * L, y - ny + uy * L],
      [x - nx, y - ny],
    ];
  }
  // convex hull (Andrew's monotone chain), counter-clockwise
  function hull(pts) {
    const P = pts.slice().sort((a, b) => a[0] - b[0] || a[1] - b[1]);
    if (P.length < 3) return P;
    const cr = (o, a, b) => (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]);
    const lo = [],
      up = [];
    for (const p of P) {
      while (lo.length >= 2 && cr(lo[lo.length - 2], lo[lo.length - 1], p) <= 0) lo.pop();
      lo.push(p);
    }
    for (let i = P.length - 1; i >= 0; i--) {
      const p = P[i];
      while (up.length >= 2 && cr(up[up.length - 2], up[up.length - 1], p) <= 0) up.pop();
      up.push(p);
    }
    up.pop();
    lo.pop();
    return lo.concat(up);
  }
  // box of height h over a foot polygon (a building): shadow polygon on the plane z0 (convex hull), or null
  function boxShadow(foot, h, az, el, z0 = 0) {
    if (el <= 0.5 || h <= z0) return null;
    const L = (h - z0) / tan(el * D2R),
      ux = -sin(az * D2R) * L,
      uy = -cos(az * D2R) * L;
    return hull(foot.concat(foot.map(p => [p[0] + ux, p[1] + uy])));
  }
  // point in a convex polygon (counter-clockwise, as hull returns it)
  function inConvex(poly, px, py) {
    const n = poly.length;
    if (n < 3) return false;
    let s = 0;
    for (let i = 0; i < n; i++) {
      const a = poly[i],
        b = poly[(i + 1) % n],
        c = (b[0] - a[0]) * (py - a[1]) - (b[1] - a[1]) * (px - a[0]);
      if (c === 0) continue;
      const sg = c > 0 ? 1 : -1;
      if (s && sg !== s) return false;
      s = sg;
    }
    return true;
  }
  // is the point (px, py) at height z in the shadow of a caster? caster: { x, y, c: crown } (a plant) or { foot, h } (a box)
  function shaded(cs, px, py, z, az, el) {
    for (const k of cs) {
      if (k.c) {
        // quick reject: farther than the longest possible shadow
        const e = crownShadow(k.x, k.y, k.c, az, el, z);
        if (e && Math.abs(px - e.cx) <= e.A + 0.01 && Math.abs(py - e.cy) <= e.A + 0.01 && inEllipse(e, px, py))
          return true;
      } else if (k.foot) {
        const p = boxShadow(k.foot, k.h, az, el, z);
        if (p && inConvex(p, px, py)) return true;
      }
    }
    return false;
  }
  // share of the daylight (sun above 3°) in which the point lies in shade, sampled every stepMin minutes of the day
  function shadeShare(px, py, z, casters, y, m, d, stepMin = 30) {
    let n = 0,
      sh = 0;
    for (let t = 3; t <= 22; t += stepMin / 60) {
      const s = sun(y, m, d, t);
      if (s.el < 3) continue;
      n++;
      if (shaded(casters, px, py, z, s.az, s.el)) sh++;
    }
    return { share: n ? sh / n : 0, n };
  }
  // sunrise and sunset (local hours, to 10 minutes) – for labels
  function dayLight(y, m, d) {
    let rise = null,
      set = null;
    for (let t = 2; t <= 23; t += 1 / 6) {
      const up = sun(y, m, d, t).el > -0.83;
      if (up && rise === null) rise = t;
      if (!up && rise !== null && set === null) set = t;
    }
    return { rise, set };
  }
  return {
    LAT,
    LON,
    tz,
    jdOf,
    sunJD,
    sun,
    crownShadow,
    inEllipse,
    ellipsePoly,
    trunkShadow,
    hull,
    boxShadow,
    inConvex,
    shaded,
    shadeShare,
    dayLight,
  };
})();
