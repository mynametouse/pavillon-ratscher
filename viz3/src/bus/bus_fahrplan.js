// ===================== feat/bus 1: the real timetable – service days, departures, where a bus is at a minute (BUSPLAN) =====================
// Falko, 5.11.2026 23:02 (chosen): „Busse nach echtem Fahrplan – einsteigen und mitfahren (z. B. Ratscher – Schleusingen)“; 23:17:
// „Wichtig ist natürlich trotzdem immer der Realismus.“ The data (viz3/extra/bus/quellen/fahrplan.py → dist/bus/fahrplan.json) is the
// free Germany feed of gtfs.de (DELFI e.V., CC BY 4.0) cut to the world: the stops on its roads, the bus trips between them with their
// minutes, the way each pattern of stops drives (the quickest way on the world's road network), on which weekdays of a reference week
// a trip runs. Here, without a scene: the service day of a date (weekday; Thuringian public holidays count as Sunday; on Thuringian
// school holidays the trips from or to a school stay out – the feed does not mark school days), the departures at a station, the
// lane a pattern drives (right-hand side, corners rounded, every metre: limit, profile height), and a trip's run through the minutes:
// each leg driven with a bus's acceleration, braking and curve speed at the pace the timetable asks (early buses wait at the stop,
// late ones stay late), standing at each stop at least DWELL. Times are game minutes (time/clock.js CLOCK.t: minutes since day 1, 0:00).
import { VNETZ } from '../verkehr/verkehr_netz.js';
export const BUSPLAN = (() => {
  const S = {
    state: 'idle',
    err: '',
    data: null,
    pats: [],
    trips: [],
    stations: [],
    lines: {},
    ferien: [],
    runs: new Map(),
  };
  // a bus: acceleration, braking, sideways in curves (m/s²); the slowest cruise it keeps between stops (m/s); standing at a stop (min)
  const BUS = { acc: 0.95, brk: 1.15, lat: 1.35, vMin: 6, dwell: 0.25, lane: 1.55 };
  // ---------------- calendar ----------------
  // epoch day (days since 1.1.1970, UTC) → { y, m (1–12), d, wd (0 Monday … 6 Sunday) }
  const ymd = e => {
    const D = new Date(e * 864e5);
    return { y: D.getUTCFullYear(), m: D.getUTCMonth() + 1, d: D.getUTCDate(), wd: (D.getUTCDay() + 6) % 7 };
  };
  const eOf = (y, m, d) => Math.round(Date.UTC(y, m - 1, d) / 864e5);
  // Easter Sunday (Gregorian, Meeus/Jones/Butcher)
  function easter(y) {
    const a = y % 19,
      b = Math.floor(y / 100),
      c = y % 100,
      d = Math.floor(b / 4),
      e = b % 4,
      f = Math.floor((b + 8) / 25),
      g = Math.floor((b - f + 1) / 3),
      h = (19 * a + b - d - g + 15) % 30,
      i = Math.floor(c / 4),
      k = c % 4,
      l = (32 + 2 * e + 2 * i - h - k) % 7,
      m = Math.floor((a + 11 * h + 22 * l) / 451),
      mo = Math.floor((h + l - 7 * m + 114) / 31),
      da = ((h + l - 7 * m + 114) % 31) + 1;
    return eOf(y, mo, da);
  }
  // the public holidays of Thuringia: Neujahr, Karfreitag, Ostermontag, 1. Mai, Christi Himmelfahrt, Pfingstmontag, Weltkindertag (20.9.,
  // since 2019), Tag der Deutschen Einheit, Reformationstag, 1. and 2. Weihnachtstag (Fronleichnam only in parts of the Eichsfeld)
  const HOL = new Map();
  function holidays(y) {
    let h = HOL.get(y);
    if (h) return h;
    const E = easter(y);
    h = new Map([
      [eOf(y, 1, 1), 'Neujahr'],
      [E - 2, 'Karfreitag'],
      [E + 1, 'Ostermontag'],
      [eOf(y, 5, 1), 'Tag der Arbeit'],
      [E + 39, 'Christi Himmelfahrt'],
      [E + 50, 'Pfingstmontag'],
      [eOf(y, 9, 20), 'Weltkindertag'],
      [eOf(y, 10, 3), 'Tag der Deutschen Einheit'],
      [eOf(y, 10, 31), 'Reformationstag'],
      [eOf(y, 12, 25), '1. Weihnachtstag'],
      [eOf(y, 12, 26), '2. Weihnachtstag'],
    ]);
    HOL.set(y, h);
    return h;
  }
  const WDN = ['Montag', 'Dienstag', 'Mittwoch', 'Donnerstag', 'Freitag', 'Samstag', 'Sonntag'];
  // the service day of an epoch day: bit of the reference week (Sunday for holidays), school holidays
  function day(e) {
    const q = ymd(e),
      hol = holidays(q.y).get(e) || null,
      fe = S.ferien.some(([a, b]) => e >= a && e <= b),
      bit = hol ? 6 : q.wd;
    const kind = hol
      ? 'Sonn- und Feiertag (' + hol + ')'
      : q.wd === 6
        ? 'Sonntag'
        : q.wd === 5
          ? 'Samstag'
          : fe
            ? WDN[q.wd] + ', Ferien in Thüringen'
            : WDN[q.wd] + ', Schultag';
    return { e, wd: q.wd, hol, ferien: fe && q.wd < 5, bit, kind };
  }
  // ---------------- data ----------------
  function parse(j) {
    if (!j || j.v !== 1 || !Array.isArray(j.pats) || !Array.isArray(j.trips) || !Array.isArray(j.stations))
      throw new Error('Fahrplan: unbekanntes Format');
    S.data = j;
    S.ferien = (j.ferien || []).map(([a, b]) => {
      const [y0, m0, d0] = a.split('-').map(Number),
        [y1, m1, d1] = b.split('-').map(Number);
      return [eOf(y0, m0, d0), eOf(y1, m1, d1)];
    });
    S.lines = j.lines || {};
    S.stations = j.stations.map((st, i) => ({
      i,
      n: st.n,
      short: st.n.replace(/^Schleusingen, /, '').replace(/^Ratscher, /, ''),
      x: st.x / 10,
      y: st.y / 10,
      // platforms: the point on the road (where the bus stops), the road's direction there (compass °), the side of the GTFS point
      pl: st.pl.map(p => ({ x: p[0] / 10, y: p[1] / 10, az: p[2], side: p[3], gx: p[4] / 10, gy: p[5] / 10 })),
      pats: [],
    }));
    S.pats = j.pats.map((p, i) => {
      const n = p.p.length >> 1,
        X = new Float32Array(n),
        Y = new Float32Array(n),
        Z = new Float32Array(n),
        Vl = new Float32Array(n);
      for (let k = 0; k < n; k++) {
        X[k] = p.p[2 * k] / 10;
        Y[k] = p.p[2 * k + 1] / 10;
        Z[k] = p.z[k] === -9999 ? NaN : p.z[k] / 10;
        Vl[k] = p.v[k] || 13.9;
      }
      // stops: a station's platform, or the edge of the world (s = -1: where a bus comes from or goes to beyond it – no halt there)
      const P = { i, n, X, Y, Z, Vl, st: p.st.map(([s, q]) => ({ s, q })), s: p.s.slice(), L: p.L, R: null };
      P.first = P.st.findIndex(o => o.s >= 0);
      P.last = P.st.length - 1 - [...P.st].reverse().findIndex(o => o.s >= 0);
      P.st.forEach((o, k) => o.s >= 0 && S.stations[o.s] && S.stations[o.s].pats.push([i, k]));
      return P;
    });
    S.trips = j.trips.map((t, i) => ({
      i,
      line: t[0],
      head: t[1],
      pat: t[2],
      days: t[3],
      t0: t[4],
      a: t[5],
      d: t[6],
      school: !!t[7],
      von: t[8],
      nach: t[9],
      vor: t[10],
      weiter: t[11],
    }));
    S.byStation = S.stations.map(() => []);
    for (const t of S.trips) {
      const P = S.pats[t.pat];
      if (P) P.st.forEach((o, k) => o.s >= 0 && S.byStation[o.s] && S.byStation[o.s].push([t.i, k]));
    }
    S.runs = new Map();
    S.state = 'ready';
  }
  // ---------------- the runs of a service day ----------------
  // the trips that run on epoch day e (cached): their absolute game minutes come from the day index (CLOCK.t / 1440) of that date
  function tripsOn(e) {
    let r = S.runs.get(e);
    if (r) return r;
    const D = day(e),
      b = 1 << D.bit;
    r = S.trips.filter(t => t.days & b && !(D.ferien && t.school));
    S.runs.set(e, r);
    if (S.runs.size > 12) S.runs.delete(S.runs.keys().next().value);
    return r;
  }
  // departures at a station from game minute T on: [{ t (absolute min), trip, k (stop index in its pattern), di (day index) }];
  // e0: the epoch day of game day 1 (time/daynight.js DN.e0). A trip's last stop in the world is a departure only if it drives on.
  function departures(st, T, e0, n = 8, back = 1) {
    if (S.state !== 'ready') return [];
    const out = [],
      di0 = Math.floor(T / 1440);
    for (let di = di0 - 1; di <= di0 + 1; di++) {
      const on = new Set(tripsOn(e0 + di).map(t => t.i));
      for (const [ti, k] of S.byStation[st] || []) {
        if (!on.has(ti)) continue;
        const t = S.trips[ti],
          P = S.pats[t.pat];
        if (k === P.last && !t.weiter) continue;
        const at = di * 1440 + t.t0 + t.d[k];
        if (at >= T - back) out.push({ t: at, trip: t, k, di });
      }
    }
    out.sort((a, b) => a.t - b.t || (a.trip.line < b.trip.line ? -1 : 1));
    return out.slice(0, n);
  }
  // arrivals of every trip at a station near minute T (the buses to wait for, to see come in): same shape as departures
  function calls(st, T0, T1, e0) {
    if (S.state !== 'ready') return [];
    const out = [];
    for (let di = Math.floor(T0 / 1440) - 1; di <= Math.floor(T1 / 1440); di++) {
      const on = new Set(tripsOn(e0 + di).map(t => t.i));
      for (const [ti, k] of S.byStation[st] || []) {
        if (!on.has(ti)) continue;
        const t = S.trips[ti],
          at = di * 1440 + t.t0 + t.a[k];
        if (at >= T0 && at <= T1) out.push({ t: at, trip: t, k, di });
      }
    }
    return out.sort((a, b) => a.t - b.t);
  }
  // the trips on the road at minute T (one entry per trip and service day): { trip, di, t0 (absolute first departure), t1 (last arrival) }
  function active(T, e0, lead = 0, tail = 0) {
    if (S.state !== 'ready') return [];
    const out = [];
    for (let di = Math.floor(T / 1440) - 1; di <= Math.floor(T / 1440); di++) {
      for (const t of tripsOn(e0 + di)) {
        const a = di * 1440 + t.t0,
          b = a + t.a[t.a.length - 1];
        if (T >= a - lead && T <= b + tail) out.push({ trip: t, di, t0: a, t1: b });
      }
    }
    return out;
  }
  // where the timetable puts a trip at minute T (straight between the minutes; for choosing what to draw): s along its way
  function roughS(trip, di, T) {
    const P = S.pats[trip.pat],
      T0 = di * 1440 + trip.t0,
      n = P.st.length;
    if (T <= T0) return P.s[0];
    for (let k = 0; k < n - 1; k++) {
      const d = T0 + trip.d[k],
        a = T0 + trip.a[k + 1];
      if (T < d) return P.s[k];
      if (T < a) return P.s[k] + ((P.s[k + 1] - P.s[k]) * (T - d)) / Math.max(0.01, a - d);
    }
    return P.s[n - 1];
  }
  // a point of a pattern's way (the centre line, before the lane): s → x, y
  function centreAt(P, s, out = {}) {
    let acc = 0;
    for (let k = 1; k < P.n; k++) {
      const l = Math.hypot(P.X[k] - P.X[k - 1], P.Y[k] - P.Y[k - 1]);
      if (acc + l >= s || k === P.n - 1) {
        const t = l > 1e-6 ? Math.max(0, Math.min(1, (s - acc) / l)) : 0;
        out.x = P.X[k - 1] + (P.X[k] - P.X[k - 1]) * t;
        out.y = P.Y[k - 1] + (P.Y[k] - P.Y[k - 1]) * t;
        out.hd = Math.atan2(P.X[k] - P.X[k - 1], P.Y[k] - P.Y[k - 1]);
        return out;
      }
      acc += l;
    }
    out.x = P.X[0];
    out.y = P.Y[0];
    out.hd = 0;
    return out;
  }
  // ---------------- the lane a pattern drives ----------------
  // right-hand lane (BUS.lane m right of the centre), corners rounded, every metre: x, y, limit (m/s), profile height (NaN inside the
  // square: the app asks the ground there), the stops' s on this line; built on first need
  function lane(P) {
    if (P.R) return P.R;
    const C = [];
    for (let k = 0; k < P.n; k++) C.push({ x: P.X[k], y: P.Y[k], o: BUS.lane, v: k });
    const F = VNETZ.fillet(VNETZ.offset(C), 5);
    // resample every metre, the source index interpolated (limit and height follow it)
    const X = [],
      Y = [],
      I = [];
    X.push(F[0].x);
    Y.push(F[0].y);
    I.push(F[0].v);
    let acc = 0,
      next = 1;
    for (let k = 1; k < F.length; k++) {
      const a = F[k - 1],
        b = F[k],
        l = Math.hypot(b.x - a.x, b.y - a.y);
      while (acc + l >= next && l > 1e-9) {
        const t = (next - acc) / l;
        X.push(a.x + (b.x - a.x) * t);
        Y.push(a.y + (b.y - a.y) * t);
        I.push(a.v + (b.v - a.v) * t);
        next += 1;
      }
      acc += l;
    }
    const last = F[F.length - 1];
    if (Math.hypot(last.x - X[X.length - 1], last.y - Y[Y.length - 1]) > 0.05) {
      X.push(last.x);
      Y.push(last.y);
      I.push(last.v);
    }
    const n = X.length,
      R = { X: Float32Array.from(X), Y: Float32Array.from(Y), n, step: 1, L: n - 1 };
    R.V = new Float32Array(n);
    R.Zp = new Float32Array(n);
    for (let i = 0; i < n; i++) {
      const f = Math.max(0, Math.min(P.n - 1, I[i])),
        k = Math.min(P.n - 2, Math.floor(f)),
        t = f - k;
      R.V[i] = Math.min(P.Vl[k], P.Vl[k + 1]);
      const z0 = P.Z[k],
        z1 = P.Z[k + 1];
      R.Zp[i] = Number.isFinite(z0) && Number.isFinite(z1) ? z0 + (z1 - z0) * t : Number.isFinite(z0) ? z0 : z1;
    }
    // the curve limit per metre (a bus leans: BUS.lat), the way's own limit
    const cap = new Float32Array(n);
    for (let i = 0; i < n; i++) {
      const a = Math.max(0, i - 4),
        c = Math.min(n - 1, i + 4);
      let lim = R.V[i] || 13.9;
      if (c - a >= 6) {
        const h1 = Math.atan2(R.X[i] - R.X[a], R.Y[i] - R.Y[a]),
          h2 = Math.atan2(R.X[c] - R.X[i], R.Y[c] - R.Y[i]);
        let d = h2 - h1;
        while (d > Math.PI) d -= 2 * Math.PI;
        while (d < -Math.PI) d += 2 * Math.PI;
        const kk = Math.abs(d) / Math.max(1, (c - a) / 2);
        if (kk > 1e-4) lim = Math.min(lim, Math.max(2.5, Math.sqrt(BUS.lat / kk)));
      }
      cap[i] = lim;
    }
    R.cap = cap;
    // the stops on this line: near where the centre line has them (the lane is a little longer or shorter in curves)
    R.st = P.s.map(s => {
      const pr = VNETZ.project(R, ...xyOf(P, s), Math.max(0, s - 40), s + 40);
      return pr ? pr.s : s;
    });
    P.R = R;
    return R;
  }
  const _c = {};
  const xyOf = (P, s) => {
    centreAt(P, s, _c);
    return [_c.x, _c.y];
  };
  // ---------------- a trip's run through the minutes ----------------
  // one leg (stop k → k+1) on the lane R: speeds per metre (curves, limit, starting and stopping), capped so it takes `T` seconds when the
  // timetable gives more time than needed; → { s0, s1, t: cumulative seconds per metre, T (seconds it takes) }
  function leg(R, s0, s1, T) {
    const i0 = Math.max(0, Math.round(s0)),
      i1 = Math.min(R.n - 1, Math.max(i0 + 1, Math.round(s1))),
      m = i1 - i0,
      v = new Float32Array(m + 1);
    for (let j = 0; j <= m; j++) v[j] = R.cap[i0 + j];
    v[0] = 0;
    for (let j = 1; j <= m; j++) v[j] = Math.min(v[j], Math.sqrt(v[j - 1] * v[j - 1] + 2 * BUS.acc));
    v[m] = 0;
    for (let j = m - 1; j >= 0; j--) v[j] = Math.min(v[j], Math.sqrt(v[j + 1] * v[j + 1] + 2 * BUS.brk));
    const time = c => {
      let t = 0;
      for (let j = 1; j <= m; j++) t += 2 / Math.max(0.3, Math.min(v[j - 1], c) + Math.min(v[j], c));
      return t;
    };
    let c = 99;
    const tFast = time(c);
    if (T > tFast) {
      // slower to keep to the timetable, but not crawling: below BUS.vMin it arrives early and waits
      let lo = BUS.vMin,
        hi = 40;
      if (time(lo) <= T) c = lo;
      else {
        for (let it = 0; it < 22; it++) {
          const mid = (lo + hi) / 2;
          if (time(mid) > T) lo = mid;
          else hi = mid;
        }
        c = hi;
      }
    }
    const tt = new Float32Array(m + 1);
    for (let j = 1; j <= m; j++) tt[j] = tt[j - 1] + 2 / Math.max(0.3, Math.min(v[j - 1], c) + Math.min(v[j], c));
    for (let j = 0; j <= m; j++) v[j] = Math.min(v[j], c);
    return { s0: i0, s1: i1, t: tt, v, T: tt[m] };
  }
  // the run of a trip on service day di: arrival and departure (absolute minutes) at each stop and the legs between, built once
  function run(trip, di) {
    const P = S.pats[trip.pat],
      R = lane(P),
      n = P.st.length,
      T0 = di * 1440 + trip.t0,
      A = new Float64Array(n),
      D = new Float64Array(n),
      legs = [];
    // at its first stop it stands a little before its minute (doors open); from the edge of the world it drives on at once
    A[0] = T0 + trip.a[0] - (P.st[0].s >= 0 ? BUS.dwell : 0);
    D[0] = Math.max(T0 + trip.d[0], A[0] + (P.st[0].s >= 0 ? BUS.dwell : 0));
    for (let k = 0; k < n - 1; k++) {
      const want = (T0 + trip.a[k + 1] - D[k]) * 60,
        L = leg(R, R.st[k], R.st[k + 1], want);
      legs.push(L);
      A[k + 1] = D[k] + L.T / 60;
      // at the edge of the world no halt; at the last stop it stands a little; else at least BUS.dwell and until its minute
      D[k + 1] =
        P.st[k + 1].s < 0
          ? A[k + 1]
          : k + 1 === n - 1
            ? A[k + 1] + BUS.dwell
            : Math.max(T0 + trip.d[k + 1], A[k + 1] + BUS.dwell);
    }
    return { trip, di, P, R, A, D, legs, n, key: trip.i + ':' + di };
  }
  // where a run is at minute T: { st: 'vor' | 'halt' | 'fahrt' | 'ende', k (the stop it stands at or left last), s, v (m/s) }
  function at(Rn, T, out = {}) {
    const { A, D, legs, n, R } = Rn;
    out.v = 0;
    if (T < A[0]) {
      out.st = 'vor';
      out.k = 0;
      out.s = R.st[0];
      return out;
    }
    for (let k = 0; k < n; k++) {
      if (T < D[k] || k === n - 1) {
        out.st = k === n - 1 && T >= D[k] ? 'ende' : 'halt';
        out.k = k;
        out.s = R.st[k];
        return out;
      }
      if (T < A[k + 1]) {
        const L = legs[k],
          sec = (T - D[k]) * 60;
        let lo = 0,
          hi = L.t.length - 1;
        while (hi - lo > 1) {
          const mid = (lo + hi) >> 1;
          if (L.t[mid] <= sec) lo = mid;
          else hi = mid;
        }
        const f = L.t[hi] > L.t[lo] ? (sec - L.t[lo]) / (L.t[hi] - L.t[lo]) : 0;
        out.st = 'fahrt';
        out.k = k;
        out.s = L.s0 + lo + Math.max(0, Math.min(1, f));
        out.v = L.v[lo] + (L.v[hi] - L.v[lo]) * Math.max(0, Math.min(1, f));
        return out;
      }
    }
    return out;
  }
  // a time as the board shows it
  const hm = T => {
    const m = ((Math.round(T) % 1440) + 1440) % 1440;
    return Math.floor(m / 60) + ':' + String(m % 60).padStart(2, '0');
  };
  return {
    S,
    BUS,
    parse,
    day,
    holidays,
    easter,
    ymd,
    eOf,
    tripsOn,
    departures,
    calls,
    active,
    roughS,
    centreAt,
    lane,
    leg,
    run,
    at,
    hm,
    get ready() {
      return S.state === 'ready';
    },
  };
})();
