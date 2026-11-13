// ===================== feat/grenzland: the vehicles' models – bodies, wheels, lamps, the moped (GLMOD) =====================
// What a vehicle of the mode looks like; grenzland/gl_auto.js drives them. Bodies of vertex colours in the material of the traffic
// (verkehr/verkehr_fig.js VFIG.mat – one shader program for all), built from a few measures per type: today's patrol car (an estate,
// silver and blue with the yellow-green stripe, a light bar), a panel van, a small estate; for 1989 a three-box saloon (also as the
// Volkspolizei's, with one blue beacon), a small two-door two-stroke, a flatbed lorry; a moped of the kind built in Suhl. The lamps are
// our own copies of the traffic's lamp materials (the same program), switched by grenzland/gl_auto.js.
//   GLMOD.bau(typ, o) → { g, T, parts: { axF, axR } | { wf, wr }, tilt, seat }   o: { col, col2, band, band2, bar: 'balken' | 'rundum' }
//   GLMOD.spielerMoped() → { model, T }   the model of the player's moped for vehicles/vehicle.js VEH.add
import * as THREE from 'three';
import { scene } from '../core/head.js';
import { VPROPS } from '../world/village_props.js';
import { VFIG } from '../verkehr/verkehr_fig.js';
import { VAUTO } from '../verkehr/verkehr_auto.js';
export const GLMOD = (() => {
  const lin = c => (c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4));
  const L = (r, g, b) => [lin(r / 255), lin(g / 255), lin(b / 255)];
  const hexL = h => {
    const c = new THREE.Color(h);
    return [c.r, c.g, c.b];
  };
  const DARK = L(18, 19, 21),
    GLASS = L(24, 30, 36),
    TRIM = L(42, 42, 44),
    INNER = L(34, 34, 36),
    CHROME = L(150, 152, 155),
    PLATE = L(220, 220, 210);
  // ---- types: yf/yr front and rear end, hw half width, a/b front and rear axle (y), rw wheel radius, heights ----
  const TYP = {
    streife: {
      yf: 2.047,
      yr: -2.426,
      hw: 0.87,
      a: 1.25,
      b: -1.655,
      rw: 0.31,
      belt: 0.84,
      roof: 1.5,
      ws: 1.0,
      form: 'kombi',
    },
    kombi: {
      yf: 2.047,
      yr: -2.426,
      hw: 0.87,
      a: 1.25,
      b: -1.655,
      rw: 0.31,
      belt: 0.84,
      roof: 1.5,
      ws: 1.0,
      form: 'kombi',
    },
    kasten: {
      yf: 2.35,
      yr: -2.95,
      hw: 0.99,
      a: 1.55,
      b: -1.95,
      rw: 0.34,
      belt: 1.02,
      roof: 2.25,
      ws: 1.5,
      form: 'kasten',
    },
    limo89: {
      yf: 1.98,
      yr: -2.24,
      hw: 0.8,
      a: 1.22,
      b: -1.24,
      rw: 0.3,
      belt: 0.82,
      roof: 1.42,
      ws: 0.83,
      tail: -1.35,
      rake: 0.58,
      trake: 0.4,
      form: 'limo',
    },
    klein89: {
      yf: 1.63,
      yr: -1.92,
      hw: 0.75,
      a: 1.06,
      b: -0.96,
      rw: 0.27,
      belt: 0.8,
      roof: 1.4,
      ws: 0.72,
      tail: -1.36,
      rake: 0.5,
      trake: 0.36,
      form: 'klein',
    },
    lkw89: { yf: 2.5, yr: -3.9, hw: 1.2, a: 1.7, b: -2.3, rw: 0.48, belt: 1.25, roof: 2.45, ws: 2.2, form: 'lkw' },
    moped: { yf: 0.92, yr: -0.92, hw: 0.32, a: 0.62, b: -0.58, rw: 0.29, form: 'moped' },
  };
  for (const T of Object.values(TYP)) {
    T.hl = (T.yf - T.yr) / 2;
    T.cy = (T.yf + T.yr) / 2;
    T.wb = T.a - T.b;
  }
  // a prism between a rectangle at z0 and one at z1 (the bodies' sloping parts) – as in verkehr/verkehr_auto.js
  function prism(k, b, t, z0, z1, col, top = true) {
    const [bx0, bx1, by0, by1] = b,
      [tx0, tx1, ty0, ty1] = t;
    k.quad([bx1, by0, z0], [bx1, by1, z0], [tx1, ty1, z1], [tx1, ty0, z1], col);
    k.quad([bx1, by1, z0], [bx0, by1, z0], [tx0, ty1, z1], [tx1, ty1, z1], col);
    k.quad([bx0, by1, z0], [bx0, by0, z0], [tx0, ty0, z1], [tx0, ty1, z1], col);
    k.quad([bx0, by0, z0], [bx1, by0, z0], [tx1, ty0, z1], [tx0, ty0, z1], col);
    if (top) k.quad([tx0, ty0, z1], [tx1, ty0, z1], [tx1, ty1, z1], [tx0, ty1, z1], col);
  }
  // a wheel: a short cylinder along x at (x, 0, 0) of its own frame
  function wheel(k, x, r, w = 0.19, rimC = CHROME) {
    const tyre = L(14, 14, 14),
      s = Math.sign(x) || 1,
      n = 14;
    for (let i = 0; i < n; i++) {
      const a0 = (i / n) * Math.PI * 2,
        a1 = ((i + 1) / n) * Math.PI * 2,
        p = (a, rr, xx) => [xx, Math.cos(a) * rr, Math.sin(a) * rr];
      k.quad(p(a0, r, x - w / 2), p(a1, r, x - w / 2), p(a1, r, x + w / 2), p(a0, r, x + w / 2), tyre);
    }
    k.disc(x + (s * w) / 2, 0, 0, s, 0, r, tyre, n, true);
    k.disc(x + s * (w / 2 + 0.003), 0, 0, s, 0, r * 0.6, rimC, 10, false);
    k.disc(x - (s * w) / 2, 0, 0, -s, 0, r * 0.9, tyre, n, false);
  }
  // ---- the body of a car type in its colours: o = { col, col2 (bonnet, boot and roof of a two-tone car), band (a stripe along the
  //      sides), band2 (a second, thin stripe), bar: 'balken' | 'rundum' (lights on the roof, made as separate meshes) } ----
  const geoCache = {};
  function bodyGeo(typ, o) {
    const key = typ + '|' + [o.col, o.col2, o.band, o.band2, o.plane].join('|');
    if (geoCache[key]) return geoCache[key];
    const T = TYP[typ],
      k = VPROPS.kit(),
      c = hexL(o.col || '#888888'),
      c2 = o.col2 ? hexL(o.col2) : c,
      { yf, yr, hw, belt, roof, ws } = T,
      len = yf - yr;
    if (T.form === 'lkw') {
      // a flatbed lorry: cab, frame, bed with boards, a tarpaulin frame
      k.box(0, yf - 0.95, 0.75, 2 * hw - 0.1, 1.9, belt - 0.2, 0, c, true);
      prism(
        k,
        [-hw + 0.05, hw - 0.05, yf - 1.9, yf],
        [-hw + 0.12, hw - 0.12, yf - 1.85, yf - 0.35],
        belt + 0.55,
        roof,
        GLASS
      );
      k.box(0, yf - 1.1, roof, 2 * hw - 0.3, 1.5, 0.06, 0, c);
      k.box(0, T.cy - 0.6, 0.62, 0.9, len - 0.6, 0.18, 0, DARK, true);
      k.box(0, yr + 2.25, 1.02, 2 * hw, 4.5, 0.1, 0, L(96, 78, 56), true);
      for (const sx of [-1, 1]) k.box(sx * (hw - 0.03), yr + 2.25, 1.12, 0.05, 4.5, 0.5, 0, hexL(o.plane || '#6a6f58'));
      k.box(0, yr + 0.03, 1.12, 2 * hw, 0.05, 0.5, 0, hexL(o.plane || '#6a6f58'));
      k.box(0, yr + 4.47, 1.12, 2 * hw, 0.05, 0.8, 0, hexL(o.plane || '#6a6f58'));
      k.box(0, yf - 0.01, 0.95, 1.5, 0.04, 0.35, 0, DARK);
      k.box(0, yf + 0.02, 0.55, 2 * hw, 0.12, 0.16, 0, DARK, true);
    } else {
      const zs = 0.3; // the sill
      k.box(0, T.cy, zs, 2 * hw, len - 0.06, belt - 0.04 - zs, 0, c); // lower body
      if (o.band) k.box(0, T.cy - 0.1, belt - 0.33, 2 * hw + 0.012, len - 0.9, 0.2, 0, hexL(o.band));
      if (o.band2) k.box(0, T.cy - 0.1, belt - 0.12, 2 * hw + 0.014, len - 0.9, 0.06, 0, hexL(o.band2));
      const bon = T.form === 'kasten' ? 0.5 : 0.08; // how far the bonnet falls to the front
      prism(
        k,
        [-hw, hw, ws, yf - 0.03],
        [-hw + 0.04, hw - 0.04, ws + 0.1, yf - 0.12],
        belt - 0.04,
        belt + 0.06 - bon * 0.1,
        c2
      ); // bonnet
      const gy1 = ws, // base of the windscreen
        gy0 = T.tail != null ? T.tail : yr + 0.1, // base of the rear window
        ry1 = ws - (T.rake || (T.form === 'kasten' ? 0.5 : 1.05)), // front edge of the roof
        ry0 = T.tail != null ? T.tail + (T.trake || 0.5) : yr + 0.2,
        gi = T.form === 'kasten' ? 0.05 : 0.15; // how far the glass leans in
      prism(
        k,
        [-hw, hw, gy0 - 0.07, gy1],
        [-hw + 0.02, hw - 0.02, gy0 - 0.05, gy1],
        belt - 0.04,
        belt + 0.02,
        c,
        false
      ); // the waist
      if (T.form === 'kasten') {
        // a panel van: the load space closed in the body's colour, glass only around the cab
        k.box(0, (yr + 0.05 + ws - 1.2) / 2, belt, 2 * hw - 0.04, ws - 1.2 - yr - 0.05, roof - belt, 0, c);
        prism(
          k,
          [-hw + 0.04, hw - 0.04, ws - 1.2, gy1],
          [-hw + gi, hw - gi, ws - 1.2, ry1],
          belt + 0.02,
          roof - 0.05,
          GLASS
        );
        k.box(0, (ws - 1.2 + ry1) / 2, roof - 0.05, 2 * hw - 0.18, ry1 - ws + 1.2, 0.05, 0, c);
      } else {
        prism(k, [-hw + 0.06, hw - 0.06, gy0, gy1], [-hw + gi, hw - gi, ry0, ry1], belt + 0.02, roof - 0.07, GLASS); // glasshouse
        prism(
          k,
          [-hw + gi - 0.01, hw - gi + 0.01, ry0 - 0.01, ry1 + 0.01],
          [-hw + gi + 0.02, hw - gi - 0.02, ry0 + 0.03, ry1 - 0.05],
          roof - 0.07,
          roof,
          c2
        ); // roof
        if (T.tail != null)
          k.box(0, (yr + 0.04 + T.tail) / 2, belt - 0.04, 2 * hw - 0.04, T.tail - yr - 0.04, 0.06, 0, c2, false); // boot lid
      }
      k.box(
        0,
        T.cy,
        0.17,
        2 * hw - 0.1,
        len + 0.05,
        0.16,
        0,
        T.form === 'limo' || T.form === 'klein' ? CHROME : DARK,
        true
      ); // sills and bumpers
      k.box(0, yf - 0.02, 0.46, hw * 1.0, 0.04, 0.17, 0, DARK); // grille
      for (const sx of [-1, 1]) {
        k.box(sx * (hw - 0.01), ws - 0.5, belt - 0.2, 0.02, 0.05, 0.03, 0, CHROME); // door handle
        k.box(sx * (hw + 0.06), ws - 0.3, belt + 0.08, 0.1, 0.05, 0.07, 0, DARK); // mirror
      }
      // inside, as far as one sees through the glass: a dark floor, the dashboard, seats
      k.box(0, (gy0 + gy1) / 2, belt - 0.04, 2 * hw - 0.1, gy1 - gy0 - 0.1, 0.03, 0, INNER);
      k.box(0, ws - 0.28, belt - 0.04, 2 * hw - 0.14, 0.45, 0.2, 0, INNER, true);
      for (const sx of [-0.36, 0.36]) k.box(sx, ws - 1.25, belt - 0.2, 0.46, 0.14, 0.62, 0, INNER, true);
      k.box(0, yf + 0.006, 0.34, 0.5, 0.01, 0.11, 0, PLATE);
      k.box(0, yr - 0.006, 0.52, 0.5, 0.01, 0.11, 0, PLATE);
    }
    const g = k.geo();
    g.computeBoundingSphere();
    return (geoCache[key] = g);
  }
  const axleCache = {};
  function axleGeo(typ) {
    if (axleCache[typ]) return axleCache[typ];
    const T = TYP[typ],
      k = VPROPS.kit(),
      tr = T.hw - 0.12,
      rim = T.form === 'limo' || T.form === 'klein' || T.form === 'lkw' ? L(70, 72, 74) : CHROME;
    wheel(k, -tr, T.rw, T.form === 'lkw' ? 0.28 : 0.18, rim);
    wheel(k, tr, T.rw, T.form === 'lkw' ? 0.28 : 0.18, rim);
    return (axleCache[typ] = k.geo());
  }
  // ---- lamps: our own copies of the traffic's lamp materials (the same shader program), switched by the hour ----
  const LM = {
    head: VAUTO.LM.head.clone(),
    tail: VAUTO.LM.tail.clone(),
    blau: VAUTO.LM.head.clone(),
    blau2: VAUTO.LM.head.clone(),
  };
  for (const m of [LM.blau, LM.blau2]) {
    m.color.setHex(0x16357a);
    m.emissive.setHex(0x1f5cff);
    m.emissiveIntensity = 0;
  }
  const lampCache = {};
  function lampGeo(typ, which) {
    const key = typ + which;
    if (lampCache[key]) return lampCache[key];
    const T = TYP[typ],
      k = VPROPS.kit(),
      round = T.form === 'limo' || T.form === 'klein' || T.form === 'lkw';
    if (which === 'head')
      for (const sx of [-1, 1])
        if (round)
          k.disc(
            sx * (T.hw - 0.2),
            T.yf + 0.002,
            0.62 + (T.form === 'lkw' ? 0.35 : 0),
            0,
            1,
            0.085,
            [1, 1, 1],
            10,
            false
          );
        else k.box(sx * (T.hw - 0.25), T.yf - 0.04, 0.64, 0.34, 0.06, 0.13, 0, [1, 1, 1]);
    if (which === 'tail')
      for (const sx of [-1, 1])
        k.box(
          sx * (T.hw - 0.17),
          T.yr + 0.03,
          T.form === 'kasten' ? 1.0 : T.belt - 0.14,
          0.2,
          0.06,
          T.form === 'kombi' ? 0.3 : 0.12,
          0,
          [1, 1, 1]
        );
    if (which === 'balken') {
      k.box(-0.3, T.ws - 1.6, T.roof + 0.06, 0.5, 0.26, 0.12, 0, [1, 1, 1], true);
    }
    if (which === 'balken2') {
      k.box(0.3, T.ws - 1.6, T.roof + 0.06, 0.5, 0.26, 0.12, 0, [1, 1, 1], true);
    }
    if (which === 'rundum') k.cyl(-0.28, T.ws - 1.35, T.roof, T.roof + 0.17, 0.075, 0.07, 10, [1, 1, 1], true);
    return (lampCache[key] = k.geo());
  }
  const own = m => {
    m.userData.noMerge = true;
    m.userData.shared = true;
    m.castShadow = false;
    m.receiveShadow = false;
    return m;
  };
  // ---- the moped: frame, tank, long seat, round lamp, handlebar, engine, exhaust, mudguards, carrier ----
  const mopedCache = {};
  function mopedGeo(col) {
    if (mopedCache[col]) return mopedCache[col];
    const k = VPROPS.kit(),
      c = hexL(col),
      T = TYP.moped,
      r = T.rw;
    const bar = (a, b, t, cc) => {
      const d = [b[0] - a[0], b[1] - a[1], b[2] - a[2]],
        l = Math.hypot(...d) || 1,
        u = [1, 0, 0],
        w = [0, -d[2] / l, d[1] / l];
      const P = (o, su, sw) => [
        o[0] + (u[0] * su * t) / 2 + (w[0] * sw * t) / 2,
        o[1] + (w[1] * sw * t) / 2,
        o[2] + (w[2] * sw * t) / 2,
      ];
      const C = [
        [1, 1],
        [-1, 1],
        [-1, -1],
        [1, -1],
      ];
      for (let i = 0; i < 4; i++) {
        const [s0, w0] = C[i],
          [s1, w1] = C[(i + 1) % 4];
        k.quad(P(a, s0, w0), P(a, s1, w1), P(b, s1, w1), P(b, s0, w0), cc);
        k.quad(P(a, s0, w0), P(b, s0, w0), P(b, s1, w1), P(a, s1, w1), cc);
      }
    };
    bar([0, T.b + 0.05, r + 0.02], [0, 0.18, 0.5], 0.05, DARK); // swing arm and frame
    bar([0, 0.18, 0.5], [0, 0.42, 0.86], 0.06, c); // down tube
    bar([0, -0.52, 0.56], [0, 0.4, 0.86], 0.05, c); // top tube under tank and seat
    bar([0, T.a + 0.02, r], [0, 0.44, 0.98], 0.055, CHROME); // fork
    bar([0, T.b + 0.02, r + 0.03], [0, -0.42, 0.62], 0.035, CHROME); // rear struts
    k.box(0, 0.17, 0.72, 0.22, 0.42, 0.2, 0, c, true); // tank
    k.box(0, 0.2, 0.92, 0.06, 0.06, 0.02, 0, CHROME); // filler cap
    k.box(0, -0.32, 0.76, 0.24, 0.62, 0.09, 0, L(22, 22, 24), true); // the long seat
    k.box(0, -0.72, 0.72, 0.2, 0.26, 0.02, 0, CHROME, true); // carrier
    k.box(0, 0.02, 0.3, 0.2, 0.34, 0.24, 0, L(120, 122, 124), true); // engine
    k.cyl(0, 0.1, 0.52, 0.66, 0.07, 0.06, 8, L(100, 100, 102), true); // cylinder with fins
    bar([0.1, 0.1, 0.34], [0.12, -0.75, 0.3], 0.06, CHROME); // exhaust
    k.box(0, T.a - 0.02, r * 2 + 0.02, 0.1, 0.5, 0.02, 0, c); // front mudguard
    k.box(0, T.b - 0.05, r * 2 + 0.03, 0.11, 0.5, 0.02, 0, c); // rear mudguard
    k.box(0, 0.47, 1.02, 0.6, 0.03, 0.03, 0, CHROME); // handlebar
    for (const sx of [-1, 1]) k.box(sx * 0.3, 0.44, 1.02, 0.1, 0.035, 0.035, 0, DARK);
    k.box(0, 0.5, 0.87, 0.14, 0.2, 0.14, 0, c, true); // lamp housing (its glass is a lamp mesh)
    k.box(0, T.yr + 0.06, 0.6, 0.12, 0.01, 0.1, 0, PLATE);
    return (mopedCache[col] = k.geo());
  }
  let mopedWheel = null,
    mopedHead = null,
    mopedTail = null;
  function mopedParts() {
    if (mopedWheel) return;
    let k = VPROPS.kit();
    wheel(k, 0, TYP.moped.rw, 0.07, L(160, 162, 165));
    mopedWheel = k.geo();
    k = VPROPS.kit();
    k.disc(0, 0.602, 0.94, 0, 1, 0.07, [1, 1, 1], 10, false);
    mopedHead = k.geo();
    k = VPROPS.kit();
    k.box(0, TYP.moped.yr + 0.07, 0.66, 0.07, 0.02, 0.05, 0, [1, 1, 1]);
    mopedTail = k.geo();
  }
  // ---- one vehicle's model, added to the scene (hidden) ----
  function bau(typ, o = {}) {
    const T = TYP[typ];
    if (!T) return null;
    const g = new THREE.Group(),
      M = { g, T, parts: {}, tilt: null, seat: null };
    if (T.form === 'moped') {
      mopedParts();
      const tilt = new THREE.Group();
      g.add(tilt);
      M.tilt = tilt;
      tilt.add(own(new THREE.Mesh(mopedGeo(o.col || '#a23a2a'), VFIG.mat())));
      const wf = own(new THREE.Mesh(mopedWheel, VFIG.mat())),
        wr = own(new THREE.Mesh(mopedWheel, VFIG.mat()));
      wf.position.set(0, T.rw, -T.a);
      wr.position.set(0, T.rw, -T.b);
      tilt.add(wf, wr, own(new THREE.Mesh(mopedHead, LM.head)), own(new THREE.Mesh(mopedTail, LM.tail)));
      M.parts = { wf, wr };
      // where a rider sits (a figure of grenzland/gl_fig.js is hung in here)
      M.seat = new THREE.Group();
      M.seat.position.set(0, 0.0, 0.3);
      tilt.add(M.seat);
    } else {
      const body = own(new THREE.Mesh(bodyGeo(typ, o), VFIG.mat())),
        axF = own(new THREE.Mesh(axleGeo(typ), VFIG.mat())),
        axR = own(new THREE.Mesh(axleGeo(typ), VFIG.mat()));
      axF.position.set(0, T.rw, -T.a);
      axR.position.set(0, T.rw, -T.b);
      g.add(
        body,
        axF,
        axR,
        own(new THREE.Mesh(lampGeo(typ, 'head'), LM.head)),
        own(new THREE.Mesh(lampGeo(typ, 'tail'), LM.tail))
      );
      M.parts = { axF, axR };
      if (o.bar === 'balken')
        g.add(
          own(new THREE.Mesh(lampGeo(typ, 'balken'), LM.blau)),
          own(new THREE.Mesh(lampGeo(typ, 'balken2'), LM.blau2))
        );
      if (o.bar === 'rundum') g.add(own(new THREE.Mesh(lampGeo(typ, 'rundum'), LM.blau)));
    }
    g.name = 'grenzland ' + typ;
    g.visible = false;
    scene.add(g);
    return M;
  }
  // ---- the model of the player's moped (vehicles/vehicle.js VEH.add): four contact points for the physics, two wheels to see ----
  function spielerMoped() {
    mopedParts();
    const T = TYP.moped,
      g = new THREE.Group(),
      body = new THREE.Group();
    g.add(body);
    const frame = own(new THREE.Mesh(mopedGeo('#2d5a8c'), VFIG.mat()));
    body.add(frame);
    const lamps = { head: [LM.head.clone()], tail: [LM.tail.clone()], brake: [LM.tail.clone()], rev: [] };
    body.add(own(new THREE.Mesh(mopedHead, lamps.head[0])), own(new THREE.Mesh(mopedTail, lamps.brake[0])));
    // four contact points for the physics (two per wheel, a hand apart), two wheels to see
    const wheels = [];
    for (const [x, y, steer, dr, show] of [
      [-0.11, T.a, 1, 0, true],
      [0.11, T.a, 1, 0, false],
      [-0.11, T.b, 0, 1, true],
      [0.11, T.b, 0, 1, false],
    ]) {
      const piv = new THREE.Group(),
        node = new THREE.Group();
      piv.position.set(0, T.rw, -y);
      piv.add(node);
      body.add(piv);
      if (show) node.add(own(new THREE.Mesh(mopedWheel, VFIG.mat())));
      wheels.push({ x, y, r: T.rw, w: 0.07, steer, drive: dr, piv, node });
    }
    let lean = 0;
    const model = {
      g,
      body,
      wheels,
      lamps,
      beam: [0, 0.62, 0.94],
      frame,
      // after the vehicle's own pose: lean into the curve instead of out of it; the wheels stay under the frame
      update(v, dt) {
        const want = Math.max(-0.55, Math.min(0.55, Math.atan(((v.st.ay || 0) * 0.9) / 9.81)));
        lean += (want - lean) * Math.min(1, (dt || 0.016) * 5);
        body.rotation.z = lean;
        for (const w of v.W) w.piv.position.x = 0;
      },
    };
    return { model, T };
  }
  return { TYP, LM, bau, spielerMoped };
})();
window.GLMOD = GLMOD;
