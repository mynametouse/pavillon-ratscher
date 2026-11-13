// ===================== feat/grenzland: the vehicles' models as meshes – bodies, wheels, lamps, the player's moped (GLMOD) =====================
// What a vehicle of the mode looks like; grenzland/gl_auto.js drives them. The shapes are pure geometry: cars, vans and the lorry in
// grenzland/gl_typen.js (bodies lofted from cross-sections by grenzland/gl_karosse.js), the mopeds in grenzland/gl_zweirad.js. Here
// they become meshes without a new shader program: the paint is a copy of the player's car's paint (vehicles/car.js: clear-coated, one
// copy per colour), glass and chrome copies of its glass and chrome, the small parts of vertex colours in the traffic's material
// (verkehr/verkehr_fig.js VFIG.mat), the lamps copies of the traffic's lamp materials, switched by grenzland/gl_auto.js. Without the
// player's car everything falls back to the traffic's material.
//   GLMOD.TYP[typ]            measures: yf, yr, hw, a, b, rw, hl, cy, wb, form ('moped' for two wheels)
//                             types: trabant, trabant_kombi, wartburg, barkas, w50, streife, kombi, kasten, s51, schwalbe –
//                             the first version's names still work: limo89 (wartburg), klein89 (trabant), lkw89 (w50), moped (s51);
//                             lada is the Wartburg until it has a body of its own
//   GLMOD.bau(typ, o) → { g, T, parts: { axF, axR } | { wf, wr }, tilt, seat, steer, axis }
//                             o: { col, col2, band, band2, bar: 'balken' | 'rundum', plane }
//   GLMOD.spielerMoped() → { model, T }   the model of the player's moped for vehicles/vehicle.js VEH.add (the cockpit's parts in
//                             model.cockpit: { needle, dial, face, steer, max, tank })
//   GLMOD.spielerTrabi() → { model, T, TC }   the Trabant the player drives in 1989, with its cockpit (model.cockpit: { needle, dial,
//                             face, wheel, radio: { mat, draw }, max })
import * as THREE from 'three';
import { scene } from '../core/head.js';
import { VEH } from '../vehicles/vehicle.js';
import { VFIG } from '../verkehr/verkehr_fig.js';
import { VAUTO } from '../verkehr/verkehr_auto.js';
import { GLTYPEN } from './gl_typen.js';
import { GLZWEIRAD } from './gl_zweirad.js';
export const GLMOD = (() => {
  // ---- measures by type: cars, vans and the lorry, the mopeds, and the first version's names ----
  const NEU = typ => GLTYPEN.ALIAS[typ] || (typ === 'moped' ? 's51' : typ);
  const TYP = Object.assign({}, GLTYPEN.TYP, GLZWEIRAD.TYP);
  for (const alt of Object.keys(GLTYPEN.ALIAS)) TYP[alt] = GLTYPEN.TYP[GLTYPEN.ALIAS[alt]];
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
  // a word on a door (the authority's name – no badge, no crest): drawn once per word and colours
  const WORT = new Map();
  function schrift(S) {
    const key = S.text + '|' + S.fg + '|' + S.bg;
    let m = WORT.get(key);
    if (m) return m;
    const cv = document.createElement('canvas');
    cv.width = 512;
    cv.height = 96;
    const x = cv.getContext('2d');
    x.fillStyle = S.bg;
    x.fillRect(0, 0, 512, 96);
    x.fillStyle = S.fg;
    x.textAlign = 'center';
    x.textBaseline = 'middle';
    let px = 74;
    x.font = 'bold ' + px + 'px "Arial Narrow", "Helvetica Neue", Arial, sans-serif';
    const w = x.measureText(S.text).width;
    if (w > 480) {
      px = Math.floor((px * 480) / w);
      x.font = 'bold ' + px + 'px "Arial Narrow", "Helvetica Neue", Arial, sans-serif';
    }
    x.fillText(S.text, 256, 51);
    const tex = new THREE.CanvasTexture(cv);
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.anisotropy = 4;
    m = textured(tex, { roughness: 0.45 });
    m.name = 'grenzland schrift';
    WORT.set(key, m);
    return m;
  }
  // ---- the shadow under a vehicle: a soft dark patch on the ground (the sun's shadow map is not asked for – as with the traffic's
  //      cars – but without any shadow a car seems to hover). It takes light away (subtractive blending), so it needs no alpha;
  //      an unlit textured material like the traffic's pools of light ----
  const SCHATTEN = { mat: null, geo: new Map() };
  function schatten(T) {
    if (!SCHATTEN.mat) {
      const cv = document.createElement('canvas');
      cv.width = cv.height = 64;
      const x = cv.getContext('2d'),
        im = x.createImageData(64, 64);
      for (let j = 0; j < 64; j++)
        for (let i = 0; i < 64; i++) {
          const u = Math.abs(i / 31.5 - 1),
            v = Math.abs(j / 31.5 - 1),
            e = t => Math.max(0, Math.min(1, (1 - t) / 0.3)),
            a = e(u) * e(v),
            q = (j * 64 + i) * 4,
            g = Math.round(255 * a * a * (3 - 2 * a));
          im.data[q] = im.data[q + 1] = im.data[q + 2] = g;
          im.data[q + 3] = 255;
        }
      x.putImageData(im, 0, 0);
      SCHATTEN.mat = new THREE.MeshBasicMaterial({
        map: new THREE.CanvasTexture(cv),
        color: 0x6e6e6e,
        transparent: true,
        blending: THREE.SubtractiveBlending,
        depthWrite: false,
        polygonOffset: true,
        polygonOffsetFactor: -2,
        polygonOffsetUnits: -2,
        toneMapped: false,
      });
      SCHATTEN.mat.name = 'grenzland schatten';
    }
    const moped = T.form === 'moped',
      w = moped ? 0.75 : 2 * T.hw + 0.5,
      l = T.yf - T.yr + (moped ? 0.3 : 0.5),
      key = w.toFixed(2) + '|' + l.toFixed(2) + '|' + T.cy.toFixed(2);
    let g = SCHATTEN.geo.get(key);
    if (!g) {
      g = new THREE.PlaneGeometry(w, l);
      g.rotateX(-Math.PI / 2);
      g.translate(0, 0.035, -T.cy);
      SCHATTEN.geo.set(key, g);
    }
    const m = own(new THREE.Mesh(g, SCHATTEN.mat));
    m.renderOrder = 1;
    m.name = 'schatten';
    return m;
  }
  // the control lamps of a cockpit: copies of the lamp material in their colours, dark until they are used
  function kontroll() {
    const L = {};
    for (const [k, col, em] of [
      ['k_rot', 0x5a1410, 0xff2a18],
      ['k_gruen', 0x12401c, 0x30ff60],
      ['k_blau', 0x101c50, 0x3070ff],
    ]) {
      const m = LM.tail.clone();
      m.color.setHex(col);
      m.emissive.setHex(em);
      m.emissiveIntensity = 0;
      L[k] = m;
    }
    return L;
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
    const out = { T, tilt, steer, wf, wr, axis: v3(T.axis).normalize(), needle: null, hands: null, tap: null };
    if (P('haende')) {
      // the rider's hands on the grips (shown from the saddle only) and the fuel tap's lever (it turns to „Reserve“)
      out.hands = meshes(P('haende'), T, lamps);
      out.hands.visible = false;
      steer.add(out.hands);
      out.tap = meshes(P('hahn'), T, lamps);
      out.tap.position.copy(v3(T.hahn));
      tilt.add(out.tap);
    }
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
      const Z = mopedModel(NEU(typ), o, LM);
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
      if (!N) return null;
      const P = name => N.pieces.find(p => p.name === name),
        axF = meshes(P('axF'), T),
        axR = meshes(P('axR'), T);
      g.add(meshes(P('body'), T, LM, N.schrift ? { schrift: schrift(N.schrift) } : {}));
      axF.position.set(0, T.rw, -T.a);
      axR.position.set(0, T.rw, -T.b);
      g.add(axF, axR);
      M.parts = { axF, axR };
    }
    g.add(schatten(T));
    g.name = 'grenzland ' + typ;
    g.visible = false;
    scene.add(g);
    return M;
  }
  // ---- the speedometer's face: scale, numbers and the odometer – drawn again when the odometer moves on (every 100 m) ----
  function tachoBild(max = 100) {
    const cv = document.createElement('canvas');
    cv.width = cv.height = 256;
    const x = cv.getContext('2d'),
      tex = new THREE.CanvasTexture(cv);
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.anisotropy = 4;
    const draw = km => {
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
      // the mark at 60: the moped's limit
      if (max === 100) {
        const m = P(225 - (270 * 60) / max, 122);
        x.fillStyle = '#d6401c';
        x.beginPath();
        x.arc(m[0], m[1], 5, 0, 7);
        x.fill();
      }
      x.fillStyle = '#b9b6aa';
      x.font = '17px Arial, sans-serif';
      x.textAlign = 'center';
      x.fillText('km/h', c, c + 40);
      // the odometer's window: five wheels of whole kilometres, the tenths in red
      const n = Math.max(0, km || 0),
        whole = String(Math.floor(n) % 100000).padStart(5, '0'),
        tenth = String(Math.floor(n * 10) % 10);
      x.fillStyle = '#e6e2d2';
      x.fillRect(c - 40, c + 58, 66, 20);
      x.fillStyle = '#c9392a';
      x.fillRect(c + 27, c + 58, 14, 20);
      x.font = 'bold 16px "Courier New", monospace';
      x.textAlign = 'center';
      x.textBaseline = 'middle';
      x.fillStyle = '#111';
      for (let i = 0; i < 5; i++) x.fillText(whole[i], c - 33 + i * 13, c + 69);
      x.fillStyle = '#fff';
      x.fillText(tenth, c + 34, c + 69);
      tex.needsUpdate = true;
    };
    draw(0);
    return { tex, draw };
  }
  // ---- the radio's dial: a lit scale with the stations' marks, the pointer at the one that plays ----
  function radioBild() {
    const cv = document.createElement('canvas');
    cv.width = 256;
    cv.height = 64;
    const x = cv.getContext('2d'),
      tex = new THREE.CanvasTexture(cv);
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.anisotropy = 4;
    const fx = f => 14 + ((Math.max(87, Math.min(108, f)) - 87) / 21) * 228;
    // list: [{ id, name, freq }] (grenzland/gl_radio.js stations()), cur: id | null. The scale in megahertz with a mark for every
    // station; the name and frequency of the one that plays stand over the scale, the red pointer at its place
    const draw = (list, cur) => {
      x.fillStyle = cur ? '#e8dcae' : '#8d8873';
      x.fillRect(0, 0, 256, 64);
      x.strokeStyle = '#2a2622';
      x.fillStyle = '#2a2622';
      x.lineWidth = 1;
      x.textAlign = 'center';
      x.textBaseline = 'middle';
      x.font = '10px Arial, sans-serif';
      for (let f = 88; f <= 108; f += 1) {
        const px = Math.round(fx(f)) + 0.5;
        x.beginPath();
        x.moveTo(px, 34);
        x.lineTo(px, f % 4 === 0 ? 44 : 39);
        x.stroke();
        if (f % 4 === 0) x.fillText(String(f), px, 52);
      }
      let pf = 87.2,
        on = null;
      (list || []).forEach((st, i) => {
        const n = parseFloat(String(st.freq == null ? '' : st.freq).replace(',', '.')),
          f = Number.isFinite(n) && n > 80 ? n : 89 + i * 3.2;
        x.fillRect(Math.round(fx(f)) - 1, 24, 3, 9);
        if (st.id === cur) {
          pf = f;
          on = st;
        }
      });
      x.font = 'bold 13px Arial, sans-serif';
      const fq = on && on.freq != null && String(on.freq) ? String(on.freq).replace(/\s*MHz$/i, '') + ' MHz · ' : '';
      x.fillText(on ? (fq + String(on.name || '')).slice(0, 34) : 'UKW', 128, 12);
      x.fillStyle = '#c62a1a';
      x.fillRect(Math.round(fx(pf)) - 1, 20, 3, 42);
      tex.needsUpdate = true;
    };
    draw([], null);
    return { tex, draw };
  }
  // ---- the model of the Trabant the player drives (vehicles/vehicle.js VEH.add): the body with its cockpit, four wheels on their
  //      pivots, the steering wheel and the needle as groups that turn ----
  function spielerTrabi(o = {}) {
    const N = GLTYPEN.bau('trabant', { col: o.col || '#9fc1d2', innen: 'cockpit', einzel: true }),
      T = N.T,
      TC = N.cockpit,
      lamps = { head: LM.head.clone(), tail: LM.tail.clone(), blau: LM.blau, blau2: LM.blau2, blink: LM.blink },
      face = tachoBild(TC.dial.max),
      dial = new THREE.MeshBasicMaterial({ map: face.tex }),
      radio = radioBild(),
      radioM = new THREE.MeshBasicMaterial({ map: radio.tex }),
      ctl = kontroll(),
      g = new THREE.Group(),
      body = new THREE.Group(),
      P = name => N.pieces.find(p => p.name === name);
    dial.name = 'grenzland tacho';
    radioM.name = 'grenzland radio';
    g.add(body);
    body.add(meshes(P('body'), T, lamps, Object.assign({ tacho: dial, radio: radioM }, ctl)));
    // the steering wheel: its frame is x right, the column (away from the driver), up in the wheel's plane
    const wheelG = new THREE.Group(),
      wheelS = new THREE.Group(),
      Ly = v3(TC.col).multiplyScalar(-1).normalize(),
      Lx = new THREE.Vector3(1, 0, 0),
      Lz = new THREE.Vector3().crossVectors(Lx, Ly);
    wheelG.position.copy(v3(TC.hub));
    wheelG.quaternion.setFromRotationMatrix(new THREE.Matrix4().makeBasis(Lx, Lz, Ly.clone().multiplyScalar(-1)));
    wheelS.add(meshes(P('lenkrad'), T, lamps));
    // the driver's hands (shown from the driver's seat only): they go with the wheel for a quarter of a turn
    const hands = meshes(P('haende'), T, lamps);
    hands.visible = false;
    wheelG.add(wheelS, hands);
    body.add(wheelG);
    // the needle on the dial
    const nd = new THREE.Group(),
      spin = new THREE.Group(),
      D = TC.dial;
    nd.position.copy(v3([D.c[0] + D.d[0] * 0.006, D.c[1] + D.d[1] * 0.006, D.c[2] + D.d[2] * 0.006]));
    nd.quaternion.setFromRotationMatrix(new THREE.Matrix4().makeBasis(v3(D.r), v3(D.d), v3(D.up).multiplyScalar(-1)));
    spin.add(meshes(P('nadel'), T, lamps));
    spin.rotation.y = GLZWEIRAD.nadelWinkel(0, D.max);
    nd.add(spin);
    body.add(nd);
    const wheels = [];
    for (const [x, y, steer, drive, pc] of [
      [-T.track / 2, T.a, 1, 1, 'radL'],
      [T.track / 2, T.a, 1, 1, 'radR'],
      [-T.trackR / 2, T.b, 0, 0, 'radL'],
      [T.trackR / 2, T.b, 0, 0, 'radR'],
    ]) {
      const piv = new THREE.Group(),
        node = new THREE.Group();
      piv.position.set(x, T.rw, -y);
      piv.add(node);
      g.add(piv);
      node.add(meshes(P(pc), T, lamps));
      wheels.push({ x, y, r: T.rw, w: T.tw, steer, drive, piv, node });
    }
    const model = {
      g,
      body,
      wheels,
      lamps: { head: [lamps.head], tail: [], brake: [lamps.tail], rev: [] },
      beam: [0, T.yf - 0.1, 0.66],
      cockpit: {
        needle: spin,
        dial,
        face,
        wheel: wheelS,
        hands,
        radio: { mat: radioM, draw: radio.draw },
        max: D.max,
        km0: 86302.6,
        lampen: ctl,
        T,
      },
      // the steering wheel turns about three times from lock to lock
      update(v) {
        wheelS.rotation.z = -v.st.steer * 15;
        hands.rotation.z = Math.max(-0.6, Math.min(0.6, wheelS.rotation.z));
      },
    };
    return { model, T, TC };
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
      ctl = kontroll(),
      Z = mopedModel('s51', { col: o.col || '#3d6b4a', fahrer: true }, lamps, Object.assign({ tacho: dial }, ctl)),
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
      cockpit: {
        needle: Z.needle,
        dial,
        face,
        steer: Z.steer,
        max: 100,
        tank: 8.7,
        km0: 27418.3,
        lampen: ctl,
        hands: Z.hands,
        tap: Z.tap,
        T,
      },
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
  return {
    TYP,
    LM,
    MAT,
    SCHATTEN,
    bau,
    spielerMoped,
    spielerTrabi,
    paint,
    glass,
    chrome,
    textured,
    meshes,
    tachoBild,
    own,
  };
})();
window.GLMOD = GLMOD;
