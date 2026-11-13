// ===================== feat/grenzland: the vehicles' models as meshes – bodies, wheels, lamps, the player's moped (GLMOD) =====================
// What a vehicle of the mode looks like; grenzland/gl_auto.js drives them. The shapes are pure geometry: cars, vans and the lorry in
// grenzland/gl_typen.js (bodies lofted from cross-sections by grenzland/gl_karosse.js), the mopeds in grenzland/gl_zweirad.js. Here
// they become meshes without a new shader program: the paint is a copy of the player's car's paint (vehicles/car.js: clear-coated, one
// copy per colour), glass and chrome copies of its glass and chrome, the small parts of vertex colours in the traffic's material
// (verkehr/verkehr_fig.js VFIG.mat), the lamps copies of the traffic's lamp materials, switched by grenzland/gl_auto.js. Without the
// player's car everything falls back to the traffic's material.
//   GLMOD.TYP[typ]            measures: yf, yr, hw, a, b, rw, hl, cy, wb, form ('moped' for two wheels)
//                             types: trabant, trabant_kombi, wartburg, barkas, w50, streife, kombi, kasten, s51, schwalbe –
//                             the first version's names still work: limo89 (wartburg), klein89 (trabant), lkw89 (w50), moped (s51)
//   GLMOD.bau(typ, o) → { g, T, parts: { axF, axR } | { wf, wr }, tilt, seat, steer, axis }
//                             o: { col, col2, band, band2, bar: 'balken' | 'rundum', plane }
//   GLMOD.spielerMoped() → { model, T }   the model of the player's moped for vehicles/vehicle.js VEH.add (the cockpit's parts in
//                             model.cockpit: { needle, dial, steer })
import * as THREE from 'three';
import { scene } from '../core/head.js';
import { VPROPS } from '../world/village_props.js';
import { VEH } from '../vehicles/vehicle.js';
import { VFIG } from '../verkehr/verkehr_fig.js';
import { VAUTO } from '../verkehr/verkehr_auto.js';
import { GLTYPEN } from './gl_typen.js';
import { GLZWEIRAD } from './gl_zweirad.js';
export const GLMOD = (() => {
  // ---- the first version's bodies (boxes of vertex colours): still used for the types that have no body of their own yet ----
  const ALT = (() => {
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
        for (const sx of [-1, 1])
          k.box(sx * (hw - 0.03), yr + 2.25, 1.12, 0.05, 4.5, 0.5, 0, hexL(o.plane || '#6a6f58'));
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
    return { TYP, bodyGeo, axleGeo, lampGeo };
  })();
  // ---- measures by type: the new types, the first version's for what is not rebuilt yet, the old names ----
  const TYP = Object.assign({}, ALT.TYP, GLTYPEN.TYP, GLZWEIRAD.TYP);
  const NEU = typ => GLTYPEN.ALIAS[typ] || (typ === 'moped' ? 's51' : typ);
  const ERSATZ = { wartburg: 'limo89', lada: 'limo89', w50: 'lkw89', barkas: 'kasten' }, // what stands in for a type without a body
    ALTOF = {};
  for (const typ of Object.keys(TYP)) {
    const neu = NEU(typ);
    if (GLZWEIRAD.TYP[neu]) TYP[typ] = GLZWEIRAD.has(neu) ? GLZWEIRAD.TYP[neu] : GLZWEIRAD.TYP.s51;
    else if (GLTYPEN.has(neu)) TYP[typ] = GLTYPEN.TYP[neu];
    else {
      ALTOF[typ] = ALT.TYP[typ] ? typ : ERSATZ[neu];
      TYP[typ] = ALT.TYP[ALTOF[typ]];
    }
  }
  TYP.moped = TYP.s51;
  // ---- lamps: our own copies of the traffic's lamp materials (the same shader program), switched by the hour ----
  const LM = {
    head: VAUTO.LM.head.clone(),
    tail: VAUTO.LM.tail.clone(),
    blau: VAUTO.LM.head.clone(),
    blau2: VAUTO.LM.head.clone(),
    blink: VAUTO.LM.tail.clone(),
  };
  for (const m of [LM.blau, LM.blau2]) {
    m.color.setHex(0x16357a);
    m.emissive.setHex(0x1f5cff);
    m.emissiveIntensity = 0;
  }
  LM.blink.color.setHex(0xd9781a);
  LM.blink.emissive.setHex(0xff8a10);
  LM.blink.emissiveIntensity = 0;
  // ---- materials: copies of what the player's car is made of (a copy keeps the shader program) ----
  const MAT = { base: null, paint: new Map(), glass: null, chrome: null };
  function base() {
    if (MAT.base) return MAT.base;
    const B = {},
      car = VEH && VEH.by && VEH.by.car;
    if (car)
      car.g.traverse(o => {
        const m = o.material;
        if (!m || Array.isArray(m)) return;
        if (m.isMeshPhysicalMaterial && m.transparent) B.glass = B.glass || m;
        else if (m.isMeshPhysicalMaterial && m.side === THREE.FrontSide) B.paint = B.paint || m;
        else if (m.isMeshPhysicalMaterial) return;
        else if (m.isMeshStandardMaterial && m.map) B.map = B.map || m;
        else if (m.isMeshStandardMaterial && m.metalness === 1) B.chrome = B.chrome || m;
      });
    return (MAT.base = B);
  }
  // the paint of one colour (linear rgb): clear-coated like the player's car; metal: how metallic (0 for the plain paints of 1989)
  function paint(c, metal = 0) {
    const key = c.map(v => v.toFixed(3)).join() + '|' + metal;
    let m = MAT.paint.get(key);
    if (m) return m;
    const B = base();
    if (B.paint) {
      m = B.paint.clone();
      m.color.setRGB(c[0], c[1], c[2]);
      m.metalness = metal;
      m.roughness = metal ? 0.36 : 0.42;
      m.clearcoat = 1;
      m.clearcoatRoughness = metal ? 0.08 : 0.16;
      m.envMapIntensity = 0.9;
    } else {
      m = VFIG.mat().clone();
      m.color.setRGB(c[0], c[1], c[2]);
    }
    m.name = 'grenzland lack';
    MAT.paint.set(key, m);
    return m;
  }
  function glass() {
    if (MAT.glass) return MAT.glass;
    const B = base();
    if (B.glass) {
      MAT.glass = B.glass.clone();
      MAT.glass.color.setHex(0x1b2428);
      MAT.glass.opacity = 0.34;
    } else MAT.glass = VFIG.mat();
    return MAT.glass;
  }
  function chrome() {
    if (MAT.chrome) return MAT.chrome;
    const B = base();
    if (B.chrome) {
      MAT.chrome = B.chrome.clone();
      MAT.chrome.color.setHex(0xd2d5d8);
      MAT.chrome.roughness = 0.14;
    } else MAT.chrome = VFIG.mat();
    return MAT.chrome;
  }
  // a textured face (the speedometer, lettering): the program of the car's number plate
  function textured(tex, o = {}) {
    const B = base(),
      m = B.map ? B.map.clone() : new THREE.MeshStandardMaterial({ roughness: 0.5, metalness: 0.1 });
    m.map = tex;
    m.roughness = o.roughness ?? 0.5;
    m.metalness = o.metalness ?? 0.05;
    m.color.setHex(0xffffff);
    return m;
  }
  const own = m => {
    m.userData.noMerge = true;
    m.userData.shared = true;
    m.castShadow = false;
    m.receiveShadow = false;
    return m;
  };
  // ---- the geometry of a piece's parts (made once, shared by every vehicle of the type) ----
  function geos(piece) {
    if (piece.geo) return piece.geo;
    const G = {};
    for (const [name, q] of Object.entries(piece.parts)) {
      const g = new THREE.BufferGeometry();
      g.setAttribute('position', new THREE.BufferAttribute(q.pos, 3));
      g.setAttribute('normal', new THREE.BufferAttribute(q.nor, 3));
      g.setAttribute('color', new THREE.BufferAttribute(q.col, 3));
      if (q.uv) g.setAttribute('uv', new THREE.BufferAttribute(q.uv, 2));
      g.computeBoundingSphere();
      G[name] = g;
    }
    return (piece.geo = G);
  }
  // the meshes of a piece under a group; lamps: the materials for 'head', 'tail', 'blau', 'blau2', 'blink' (default: the shared ones);
  // mats: more by part name
  function meshes(piece, T, lamps = LM, mats = {}) {
    const grp = new THREE.Group(),
      G = geos(piece);
    for (const [name, geo] of Object.entries(G)) {
      let mat;
      if (mats[name]) mat = mats[name];
      else if (name.startsWith('lack')) mat = paint(piece.paint[+name.slice(4)] || piece.paint[0], T.metal || 0);
      else if (name === 'glas') mat = glass();
      else if (name === 'chrom') mat = chrome();
      else if (lamps[name]) mat = lamps[name];
      else if (name === 'brems') mat = lamps.tail;
      else mat = VFIG.mat();
      const me = own(new THREE.Mesh(geo, mat));
      if (name === 'glas') me.renderOrder = 2;
      me.name = name;
      grp.add(me);
    }
    return grp;
  }
  const v3 = p => new THREE.Vector3(p[0], p[2], -p[1]); // the vehicle's frame (x right, y forward, z up) → three's
  // ---- a moped's model: the frame under `tilt`, what steers under `steer`, two wheels; returns the groups ----
  function mopedModel(typ, o, lamps, mats) {
    const Z = GLZWEIRAD.bau(typ, o),
      T = Z.T,
      tilt = new THREE.Group(),
      steer = new THREE.Group(),
      P = name => Z.pieces.find(p => p.name === name),
      wf = meshes(P('rad'), T, lamps),
      wr = meshes(P('rad'), T, lamps);
    tilt.add(meshes(P('rahmen'), T, lamps, mats));
    steer.position.copy(v3(T.pivot));
    steer.add(meshes(P('lenkung'), T, lamps, mats));
    wf.position.copy(v3([0, T.a - T.pivot[1], T.rw - T.pivot[2]]));
    steer.add(wf);
    wr.position.set(0, T.rw, -T.b);
    tilt.add(steer, wr);
    const out = { T, tilt, steer, wf, wr, axis: v3(T.axis).normalize(), needle: null };
    if (T.dial && P('nadel')) {
      // the needle on the dial: its frame is the dial's right, the way it faces, and down
      const nd = new THREE.Group(),
        spin = new THREE.Group(),
        X = v3(T.dial.r),
        Y = v3(T.dial.d),
        Zc = v3(T.dial.up).multiplyScalar(-1),
        c = T.dial.c,
        d = T.dial.d;
      nd.position.copy(
        v3([c[0] + d[0] * 0.0055 - T.pivot[0], c[1] + d[1] * 0.0055 - T.pivot[1], c[2] + d[2] * 0.0055 - T.pivot[2]])
      );
      nd.quaternion.setFromRotationMatrix(new THREE.Matrix4().makeBasis(X, Y, Zc));
      spin.add(meshes(P('nadel'), T, lamps));
      spin.rotation.y = GLZWEIRAD.nadelWinkel(0);
      nd.add(spin);
      steer.add(nd);
      out.needle = spin;
    }
    return out;
  }
  // ---- one vehicle's model, added to the scene (hidden) ----
  function bau(typ, o = {}) {
    const T = TYP[typ];
    if (!T) return null;
    const g = new THREE.Group(),
      M = { g, T, parts: {}, tilt: null, seat: null };
    if (T.form === 'moped') {
      const Z = mopedModel(GLZWEIRAD.has(NEU(typ)) ? NEU(typ) : 's51', o, LM);
      g.add(Z.tilt);
      M.tilt = Z.tilt;
      M.steer = Z.steer;
      M.axis = Z.axis;
      M.parts = { wf: Z.wf, wr: Z.wr };
      // where a rider sits (a figure of grenzland/gl_fig.js is hung in here)
      M.seat = new THREE.Group();
      M.seat.position.set(0, 0.0, 0.3);
      Z.tilt.add(M.seat);
    } else {
      const N = GLTYPEN.bau(typ, o);
      if (N) {
        const P = name => N.pieces.find(p => p.name === name),
          axF = meshes(P('axF'), T),
          axR = meshes(P('axR'), T);
        g.add(meshes(P('body'), T));
        axF.position.set(0, T.rw, -T.a);
        axR.position.set(0, T.rw, -T.b);
        g.add(axF, axR);
        M.parts = { axF, axR };
      } else if (!ALTOF[typ]) return null;
      else {
        // not rebuilt yet: the first version's body
        const alt = ALTOF[typ],
          body = own(new THREE.Mesh(ALT.bodyGeo(alt, o), VFIG.mat())),
          axF = own(new THREE.Mesh(ALT.axleGeo(alt), VFIG.mat())),
          axR = own(new THREE.Mesh(ALT.axleGeo(alt), VFIG.mat()));
        axF.position.set(0, T.rw, -T.a);
        axR.position.set(0, T.rw, -T.b);
        g.add(
          body,
          axF,
          axR,
          own(new THREE.Mesh(ALT.lampGeo(alt, 'head'), LM.head)),
          own(new THREE.Mesh(ALT.lampGeo(alt, 'tail'), LM.tail))
        );
        M.parts = { axF, axR };
        if (o.bar === 'balken')
          g.add(
            own(new THREE.Mesh(ALT.lampGeo(alt, 'balken'), LM.blau)),
            own(new THREE.Mesh(ALT.lampGeo(alt, 'balken2'), LM.blau2))
          );
        if (o.bar === 'rundum') g.add(own(new THREE.Mesh(ALT.lampGeo(alt, 'rundum'), LM.blau)));
      }
    }
    g.name = 'grenzland ' + typ;
    g.visible = false;
    scene.add(g);
    return M;
  }
  // ---- the speedometer's face: drawn once, the tank's mark drawn again when the tank changes ----
  function tachoBild(max = 100) {
    const cv = document.createElement('canvas');
    cv.width = cv.height = 256;
    const x = cv.getContext('2d'),
      tex = new THREE.CanvasTexture(cv);
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.anisotropy = 4;
    const draw = tank => {
      const c = 128,
        P = (deg, r) => [c + Math.cos((deg * Math.PI) / 180) * r, c - Math.sin((deg * Math.PI) / 180) * r];
      x.fillStyle = '#0c0c0d';
      x.fillRect(0, 0, 256, 256);
      x.beginPath();
      x.arc(c, c, 124, 0, 7);
      x.fillStyle = '#141516';
      x.fill();
      x.strokeStyle = '#e9e6da';
      x.fillStyle = '#e9e6da';
      x.lineCap = 'butt';
      for (let v = 0; v <= max; v += 5) {
        const a = 225 - (270 * v) / max,
          big = v % 20 === 0,
          mid = v % 10 === 0,
          p = P(a, 118),
          q = P(a, big ? 96 : mid ? 103 : 109);
        x.lineWidth = big ? 6 : mid ? 4 : 2;
        x.beginPath();
        x.moveTo(p[0], p[1]);
        x.lineTo(q[0], q[1]);
        x.stroke();
        if (big) {
          const t = P(a, 76);
          x.font = 'bold 27px "DIN Alternate", "Arial Narrow", Arial, sans-serif';
          x.textAlign = 'center';
          x.textBaseline = 'middle';
          x.fillText(String(v), t[0], t[1]);
        }
      }
      // the 60 mark of the type's limit
      const m = P(225 - (270 * 60) / max, 122);
      x.fillStyle = '#d6401c';
      x.beginPath();
      x.arc(m[0], m[1], 5, 0, 7);
      x.fill();
      x.fillStyle = '#b9b6aa';
      x.font = '17px Arial, sans-serif';
      x.textAlign = 'center';
      x.fillText('km/h', c, c + 40);
      // the odometer's window
      x.fillStyle = '#e6e2d2';
      x.fillRect(c - 34, c + 58, 68, 20);
      x.fillStyle = '#111';
      x.font = 'bold 16px "Courier New", monospace';
      x.fillText('2 7 4 1 8', c, c + 69);
      // the tank's mark (the real one has none: a small scale under the hub, the reserve in red)
      if (tank != null) {
        const w = 72,
          x0 = c - w / 2,
          y0 = c + 92;
        x.fillStyle = '#2a2b2c';
        x.fillRect(x0, y0, w, 9);
        x.fillStyle = '#d6401c';
        x.fillRect(x0, y0, w * 0.1, 9);
        x.fillStyle = tank < 0.1 ? '#d6401c' : '#e9e6da';
        x.fillRect(x0, y0 + 2, Math.max(2, w * Math.max(0, Math.min(1, tank))), 5);
      }
      tex.needsUpdate = true;
    };
    draw(null);
    return { tex, draw };
  }
  // ---- the model of the player's moped (vehicles/vehicle.js VEH.add): four contact points for the physics, two wheels to see ----
  function spielerMoped(o = {}) {
    const lamps = {
        head: LM.head.clone(),
        tail: LM.tail.clone(),
        blau: LM.blau,
        blau2: LM.blau2,
        blink: LM.blink,
      },
      face = tachoBild(100),
      dial = new THREE.MeshBasicMaterial({ map: face.tex }),
      Z = mopedModel('s51', { col: o.col || '#3d6b4a' }, lamps, { tacho: dial }),
      T = Z.T,
      g = new THREE.Group(),
      body = new THREE.Group();
    dial.name = 'grenzland tacho';
    g.add(body);
    body.add(Z.tilt);
    // four contact points for the physics (two per wheel, a hand apart); the wheels one sees turn in update()
    const wheels = [];
    for (const [x, y, steer, dr] of [
      [-0.11, T.a, 1, 0],
      [0.11, T.a, 1, 0],
      [-0.11, T.b, 0, 1],
      [0.11, T.b, 0, 1],
    ]) {
      const piv = new THREE.Group(),
        node = new THREE.Group();
      piv.position.set(0, T.rw, -y);
      piv.add(node);
      body.add(piv);
      wheels.push({ x, y, r: T.rw, w: 0.07, steer, drive: dr, piv, node });
    }
    let lean = 0;
    const model = {
      g,
      body,
      wheels,
      lamps: { head: [lamps.head], tail: [], brake: [lamps.tail], rev: [] },
      beam: T.beam,
      cockpit: { needle: Z.needle, dial, face, steer: Z.steer, T },
      lean: () => lean,
      // after the vehicle's own pose: lean into the curve instead of out of it, the handlebar turns the fork, the wheels roll
      update(v, dt) {
        const want = Math.max(-0.6, Math.min(0.6, Math.atan(((v.st.ay || 0) * 0.92) / 9.81)));
        lean += (want - lean) * Math.min(1, (dt || 0.016) * 5);
        body.rotation.z = -lean;
        Z.steer.quaternion.setFromAxisAngle(Z.axis, -v.st.steer);
        Z.wf.rotation.x = -v.W[0].spin;
        Z.wr.rotation.x = -v.W[2].spin;
      },
    };
    return { model, T };
  }
  return { TYP, LM, MAT, bau, spielerMoped, paint, glass, chrome, textured, meshes, tachoBild, own };
})();
window.GLMOD = GLMOD;
