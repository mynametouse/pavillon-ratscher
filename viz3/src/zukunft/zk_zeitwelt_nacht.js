// ===================== feat/zeitreise-welt: the heavy-rain night, the morning after, the blackout night, signs from the future (ZKNACHT) =====================
// The heavy-rain night (STATE water): brown water flowing and rising in the street by the brook („In der Straße am Bach“: the street west of
// the Anger, the lowest of the village) with the level of the state, a fire engine with blue lights at the junction; the morning after:
// mud on the street, bulky waste in front of the houses (sofas, mattresses, carpets, a fridge) where the village was not prepared, sandbags
// and a mobile barrier where it was; flood marks on a house wall (plates with the years of the state's marks, at their heights).
// The blackout night (STATE energy.blackout, the same moment in both worlds): every lamp and window of the village goes out (the one
// switch they all read, VILLAGE.night, is held at 0), the glow of the towns on the horizon is gone; „Gewappnet“ lights the old school
// warmly as the emergency point with the village battery in a container beside it, in „Allein im Sturm“ a few houses have their own light.
// Signs from the future (ZKCHRONIK.SIGNS, marked „Mögliche Zukunft“) stand at the clearing, the heating house, the turbine, the school.
// No lights (the regie's rule: lights change programs) – windows and lamps are unlit colours, the glow is additive, nothing casts shadows.
import * as THREE from 'three';
import { ZKKIT as K } from './zk_zeitwelt_kit.js';
import { ZKDINGE } from './zk_zeitwelt_dinge.js';

export const ZKNACHT = (() => {
  const G = w => window[w];
  const C = K.col;
  const PAL = {
    red: C(0xb3261e),
    white: C(0xebebe8),
    dark: C(0x262728),
    glass: C(0x1c2226),
    tyre: C(0x1e1e1f),
    blue: [0.25, 0.45, 2.6],
    head: [2.2, 2.1, 1.8],
    win: [2.1, 1.35, 0.62],
    winIsl: [1.6, 0.95, 0.42],
    sand: C(0xc9b98a),
    sandDk: C(0xa89a72),
    alu: C(0xa7adb3),
    sofa: C(0x6b5a4c),
    sofa2: C(0x4e5a6a),
    mattress: C(0xd9d6cc),
    carpet: C(0x8a3d32),
    carpet2: C(0xb59a6e),
    bag: C(0x1d1d1e),
    container: C(0x5f6b5d),
    grille: C(0x3f463e),
    plate: C(0xe8e6df),
  };
  const S = { sites: null, dark: false, nightFn: null, atlas: null, err: null };
  // ---------- the sign atlas (canvas, made once in warm): 8 slots of 512 × 256 ----------
  const SLOT = { pflanzung: 0, heizhaus: 1, windbau: 2, buergerwind: 3, notpunkt: 4, m2023: 5, m2034: 6, m2046: 7 };
  function atlas() {
    if (S.atlas) return S.atlas;
    const cv = document.createElement('canvas');
    cv.width = 1024;
    cv.height = 1024;
    const x = cv.getContext('2d');
    const CH = G('ZKCHRONIK'),
      SIGNS = (CH && CH.SIGNS) || {},
      NOTE = (CH && CH.SIGN_NOTE) || 'Mögliche Zukunft';
    const wrap = (text, maxW) => {
      const words = String(text).split(/\s+/),
        lines = [];
      let cur = '';
      for (const w of words) {
        const t = cur ? cur + ' ' + w : w;
        if (x.measureText(t).width > maxW && cur) {
          lines.push(cur);
          cur = w;
        } else cur = t;
      }
      if (cur) lines.push(cur);
      return lines;
    };
    for (const [id, slot] of Object.entries(SLOT)) {
      const ox = (slot % 2) * 512,
        oy = Math.floor(slot / 2) * 256;
      if (id.startsWith('m')) {
        // a flood-mark plate: white enamel, a blue wave line at the top edge, the year
        x.fillStyle = '#e8e6df';
        x.fillRect(ox, oy, 512, 256);
        x.fillStyle = '#1f4f8f';
        x.fillRect(ox, oy, 512, 26);
        x.beginPath();
        for (let i = 0; i <= 512; i += 8) x.lineTo(ox + i, oy + 26 + 10 * Math.sin(i / 26));
        x.lineTo(ox + 512, oy);
        x.lineTo(ox, oy);
        x.fill();
        x.fillStyle = '#1f2a3a';
        x.font = 'bold 54px sans-serif';
        x.textAlign = 'center';
        x.fillText(id === 'm2023' ? 'Hochwasser' : id === 'm2034' ? 'Starkregen' : 'Hochwasser', ox + 256, oy + 120);
        x.font = 'bold 86px sans-serif';
        x.fillText(id.slice(1), ox + 256, oy + 214);
        continue;
      }
      const sg = SIGNS[id] || { text: id };
      // a board: dark green, white letters, the yellow band „Mögliche Zukunft“ along the bottom
      x.fillStyle = id === 'notpunkt' ? '#1f5a8a' : '#2f4a3a';
      x.fillRect(ox, oy, 512, 256);
      x.strokeStyle = '#e9e4d4';
      x.lineWidth = 6;
      x.strokeRect(ox + 8, oy + 8, 496, 240);
      x.fillStyle = '#f4f1e8';
      x.textAlign = 'left';
      const parts = String(sg.text).split(' · ');
      let y = oy + 58;
      x.font = 'bold 34px sans-serif';
      for (const l of wrap(parts[0], 470).slice(0, 3)) {
        x.fillText(l, ox + 22, y);
        y += 40;
      }
      x.font = '26px sans-serif';
      for (const l of wrap(parts.slice(1).join(' · '), 470).slice(0, 2)) {
        x.fillText(l, ox + 22, y + 2);
        y += 31;
      }
      x.fillStyle = '#f2c230';
      x.fillRect(ox + 8, oy + 206, 496, 42);
      x.fillStyle = '#1d1d1d';
      x.font = 'bold 28px sans-serif';
      x.fillText(NOTE, ox + 22, oy + 237);
    }
    const t = new THREE.CanvasTexture(cv);
    t.colorSpace = THREE.SRGBColorSpace;
    t.anisotropy = 4;
    t.generateMipmaps = true;
    t.minFilter = THREE.LinearMipmapLinearFilter;
    S.atlas = t;
    K.mats().sign.map = t;
    return t;
  }
  const uvOf = slot => {
    const ox = (slot % 2) * 0.5,
      oy = 1 - (Math.floor(slot / 2) + 1) * 0.25;
    return [ox + 0.002, oy + 0.004, ox + 0.498, oy + 0.246];
  };
  // ---------- sites ----------
  function sites() {
    if (S.sites) return S.sites;
    const st = {};
    // the street by the brook: the village street west of the Anger (its lowest stretch)
    const streets = K.ways(['street']);
    const n = K.nearestOn(streets, 165, -108);
    let path = [];
    if (n) {
      const w = n.w,
        p = w.p,
        pts = [];
      for (let i = 0; i < p.length; i += 2) pts.push([p[i], p[i + 1]]);
      path = K.resample(pts, 2).filter(q => Math.hypot(q[0] - 160, q[1] + 104) < 75);
      // flow: towards the lower end
      if (path.length > 1 && K.gnd(path[0][0], path[0][1]) < K.gnd(path[path.length - 1][0], path[path.length - 1][1]))
        path.reverse();
      let s = 0;
      for (let i = 0; i < path.length; i++) {
        if (i) s += Math.hypot(path[i][0] - path[i - 1][0], path[i][1] - path[i - 1][1]);
        path[i][2] = s;
      }
    }
    st.flood = path;
    // the houses along it: facades facing the street within 14 m
    const fronts = [];
    for (const b of K.houses()) {
      if (Math.hypot(b.cx - 160, b.cy + 104) > 110) continue;
      let best = null;
      for (const f of K.facadesOf(b)) {
        if (f.L < 4) continue;
        const q = K.nearestOn([{ p: Float32Array.from(path.flatMap(r => [r[0], r[1]])) }], f.mx, f.my);
        if (!q || q.d > 14) continue;
        // facing the street
        if ((q.x - f.mx) * f.nx + (q.y - f.my) * f.ny < 0) continue;
        if (!best || q.d < best.d) best = { b, f, d: q.d, qx: q.x, qy: q.y };
      }
      if (best) fronts.push(best);
    }
    st.fronts = fronts.sort((a, b) => a.d - b.d);
    // the fire engine: at the upper (Anger) end of the stretch, on the street
    // the fire engine 42 % along the street (the camera stands at 72 %): near enough for its blue lights to read
    const ie = Math.round(path.length * 0.42),
      top = path.length ? path[ie] : [205, -118, 0],
      nx = path.length > ie + 3 ? path[ie + 3] : top;
    st.engine = { x: top[0], y: top[1], a: Math.atan2(nx[1] - top[1], nx[0] - top[0]) || Math.PI };
    // the camera on the pavement: from the lower part looking up the street towards the Anger
    const low = path.length ? path[Math.min(path.length - 1, Math.round(path.length * 0.72))] : [150, -104];
    st.cam = { x: low[0], y: low[1] };
    // the old school (building 215 by the Anger): its facades for the lit windows, the container on its free side
    const V = G('VILLAGE');
    const sch = V && V.bld ? V.bld.find(b => b.id === 215) || nearestHouse(236, -121) : null;
    st.school = sch;
    if (sch) {
      const fs = K.facadesOf(sch).sort((a, b) => b.L - a.L);
      st.schoolFront = fs.reduce((best, f) => {
        const d = Math.hypot(f.mx + f.nx * 4 - 222, f.my + f.ny * 4 + 108);
        return !best || d < best.d ? Object.assign({ d }, f) : best;
      }, null);
      const side =
        fs.find(f => f !== st.schoolFront && !K.nearHouse(f.mx + f.nx * 5, f.my + f.ny * 5, 2.5)) || fs[1] || fs[0];
      // along the wall, its door side (the box's −v side) facing away from the school
      st.container = { x: side.mx + side.nx * 4.2, y: side.my + side.ny * 4.2, a: side.face + Math.PI / 2 };
    }
    S.sites = st;
    return st;
  }
  function nearestHouse(x, y) {
    let best = null;
    for (const b of K.houses()) {
      const d = Math.hypot(b.cx - x, b.cy - y);
      if (!best || d < best.d) best = { b, d };
    }
    return best ? best.b : null;
  }
  // ---------- the street flood ----------
  function flut() {
    const P = sites().flood,
      g = new THREE.Group();
    if (P.length < 2) return g;
    const B = K.GB();
    // a sheet as wide as the lowest neighbourhood: where the drawn ground is higher the depth test cuts it (the shore follows the ground)
    K.strip(
      B,
      P,
      11,
      11,
      (x, y, s) => groundAlong(P, s),
      () => [1, 1, 1],
      true
    );
    const m = K.inst(B.geo(), K.mats().water, 1, 'zeitreise flut');
    m.userData.base = 0;
    g.add(m);
    g.userData.sheet = m;
    return g;
  }
  // the street's own height along the path (the water follows the street's fall)
  function groundAlong(P, s) {
    let i = 1;
    while (i < P.length - 1 && P[i][2] < s) i++;
    const a = P[i - 1],
      b = P[i],
      k = Math.max(0, Math.min(1, (s - a[2]) / Math.max(0.01, b[2] - a[2])));
    return K.gnd(a[0], a[1]) * (1 - k) + K.gnd(b[0], b[1]) * k;
  }
  function flutLevel(o, d) {
    const m = o.userData.sheet;
    if (!m) return false;
    m.position.y = Math.max(0.02, d.lv);
    return true;
  }
  // ---------- the fire engine with blue lights ----------
  function feuerwehr() {
    const s = sites().engine,
      g = new THREE.Group(),
      B = K.GB(),
      a = s.a,
      c = Math.cos(a),
      sn = Math.sin(a),
      x = s.x - sn * 1.2,
      y = s.y + c * 1.2,
      z = K.gnd(x, y),
      at = (u, v) => [x + u * c - v * sn, y + u * sn + v * c];
    for (const u of [-2.6, 2.2])
      for (const v of [-1.0, 1.0])
        B.tube([...at(u, v - 0.2), z + 0.55], [...at(u, v + 0.2), z + 0.55], 0.55, 10, PAL.tyre);
    B.box(...at(0, 0), z + 0.6, 8.2, 2.4, 0.5, a, PAL.dark);
    B.box(...at(2.7, 0), z + 1.05, 2.3, 2.5, 2.1, a, PAL.red);
    B.box(...at(3.5, 0), z + 2.05, 0.7, 2.3, 0.85, a, PAL.glass, PAL.red);
    B.box(...at(-1.4, 0), z + 1.05, 5.4, 2.5, 2.3, a, PAL.red);
    B.box(...at(-1.4, 0), z + 1.9, 5.42, 2.52, 0.18, a, PAL.white);
    B.box(...at(-1.6, 0), z + 3.35, 4.2, 0.6, 0.25, a, C(0x9a9ea2));
    g.add(K.mesh(B, K.mats().kit, 'zeitreise feuerwehr'));
    // blue lights (two on the cab, two at the rear), headlights; colours set by anim
    const L = K.GB();
    for (const [u, v] of [
      [3.5, -0.7],
      [3.5, 0.7],
      [-4.0, -0.9],
      [-4.0, 0.9],
    ])
      L.box(...at(u, v), z + (u > 0 ? 3.15 : 3.4), 0.3, 0.3, 0.22, a, [1, 1, 1]);
    const lights = K.inst(L.geo(), K.mats().glow, 1, 'zeitreise blaulicht');
    const H = K.GB();
    for (const v of [-0.85, 0.85]) H.panel(...at(3.88, v), z + 0.95, 0.32, 0.18, a + Math.PI / 2, [1, 1, 1]);
    const head = K.inst(H.geo(), K.mats().glow, 1, 'zeitreise scheinwerfer');
    head.setColorAt(0, new THREE.Color(...PAL.head));
    g.add(lights, head);
    g.userData.lights = lights;
    return g;
  }
  const _c = new THREE.Color();
  function blink(o, t) {
    const l = o.userData.lights;
    if (!l) return false;
    // two flashes per half second, alternating sides (the rhythm of German blue lights)
    const ph = (t * 2) % 1,
      on = ph < 0.12 || (ph > 0.22 && ph < 0.34) ? 1 : 0.04;
    _c.setRGB(PAL.blue[0] * on, PAL.blue[1] * on, PAL.blue[2] * on);
    l.setColorAt(0, _c);
    l.instanceColor.needsUpdate = true;
    // the flash on the flood (the water's shader)
    K.U.uZkBlue.value = on > 0.5 ? 1 : 0;
    // where the engine stands (three's x, z: the water's vWp)
    const e = sites().engine;
    K.U.uZkBlueP.value.set(e.x, -e.y);
  }
  // ---------- the morning after: mud, bulky waste; the prepared street: sandbags and a barrier ----------
  function schlamm(d) {
    const P = sites().flood,
      g = new THREE.Group();
    if (P.length < 2) return g;
    const B = K.GB(true);
    for (let i = 0; i + 1 < P.length; i++) {
      // the mud lies thicker in the middle of the street and in patches; ragged at its edges
      const seg = [P[i], P[i + 1]];
      for (let k = -3; k <= 3; k++) {
        const nz = K.hash(i * 17 + k * 131),
          a = d.m * (k === -3 || k === 3 ? 0.35 : 0.85) * (0.55 + 0.6 * nz);
        if (a < 0.05) continue;
        const off = k * 1.5;
        K.strip(
          B,
          seg.map(p => [p[0], p[1], p[2]]),
          -off + 0.85,
          off + 0.85,
          (x, y) => K.gnd(x, y) + 0.03,
          () => [0.075 + 0.02 * nz, 0.058 + 0.012 * nz, 0.038, Math.min(0.95, a)]
        );
      }
    }
    g.add(K.inst(B.geo(), K.mats().decal, 1, 'zeitreise schlamm'));
    return g;
  }
  function sperrmuell(d) {
    const g = new THREE.Group(),
      B = K.GB(),
      F = sites().fronts.slice(0, d.n);
    F.forEach((fr, k) => {
      const f = fr.f,
        h = K.hash(fr.b.id * 7),
        // the pile between the house and the street, 1.6 m from the wall
        x = f.mx + f.nx * 1.8 + f.f.dx * (h - 0.5) * f.L * 0.5,
        y = f.my + f.ny * 1.8 + f.f.dy * (h - 0.5) * f.L * 0.5,
        z = K.gnd(x, y),
        a = f.a;
      const c = Math.cos(a),
        s = Math.sin(a),
        at = (u, v) => [x + u * c - v * s, y + u * s + v * c];
      // a sofa (seat, back, arms), a mattress leaning, a rolled carpet, a fridge, black bags, a chair
      const sc = h < 0.5 ? PAL.sofa : PAL.sofa2;
      B.box(...at(0, 0), z, 2.0, 0.9, 0.45, a, sc);
      B.box(...at(0, -0.36), z + 0.45, 2.0, 0.2, 0.42, a, sc);
      for (const u of [-0.95, 0.95]) B.box(...at(u, 0), z + 0.45, 0.14, 0.9, 0.2, a, sc);
      B.box(...at(1.9, 0.1), z, 1.95, 1.35, 0.2, a + 0.2, PAL.mattress);
      B.box(...at(1.85, 0.2), z + 0.2, 1.9, 1.3, 0.18, a + 0.15, k % 2 ? PAL.mattress : C(0xb8c4cf));
      B.tube([...at(-1.6, 0.6), z + 0.2], [...at(1.4, 0.9), z + 0.2], 0.2, 8, h < 0.4 ? PAL.carpet : PAL.carpet2);
      if (h > 0.3) B.box(...at(-1.9, -0.2), z, 0.62, 0.62, 1.7, a + 0.1, PAL.white);
      for (let b = 0; b < 3; b++) B.cyl(...at(-0.6 + b * 0.55, 0.85), z, 0.3, 0.12, 0.55, 6, PAL.bag);
      if (h < 0.7) {
        B.box(...at(0.9, 1.1), z, 0.45, 0.45, 0.45, a + 0.6, C(0x7a5a3a));
        B.box(...at(0.9, 0.9), z + 0.45, 0.45, 0.06, 0.45, a + 0.6, C(0x7a5a3a));
      }
    });
    if (B.n()) g.add(K.mesh(B, K.mats().kit, 'zeitreise sperrmuell'));
    return g;
  }
  // the morning after: the flood's dirty line on the walls along the street, up to the height the water stood
  function schmutzrand(d) {
    const g = new THREE.Group(),
      B = K.GB(true);
    for (const fr of sites().fronts) {
      const f = fr.f,
        z = K.gnd(fr.qx, fr.qy),
        n = Math.max(1, Math.round(f.L / 1.5));
      for (let i = 0; i < n; i++) {
        const u0 = -f.L / 2 + (i * f.L) / n,
          u1 = u0 + f.L / n,
          hh = d.h * (0.9 + 0.2 * K.hash(fr.b.id * 31 + i)),
          p = (u, zz) => [f.mx + f.f.dx * u + f.nx * 0.04, f.my + f.f.dy * u + f.ny * 0.04, z + zz];
        // a dark wet band below the line, a sharper dirt edge at it
        B.quad(p(u0, -0.1), p(u1, -0.1), p(u1, hh), p(u0, hh), [0.09, 0.075, 0.055, 0.42]);
        B.quad(p(u0, hh - 0.03), p(u1, hh - 0.03), p(u1, hh + 0.02), p(u0, hh + 0.02), [0.07, 0.055, 0.04, 0.7]);
      }
    }
    if (B.n()) g.add(K.inst(B.geo(), K.mats().decal, 1, 'zeitreise schmutzrand'));
    return g;
  }
  function sandsaecke() {
    const g = new THREE.Group(),
      B = K.GB(),
      F = sites().fronts.slice(0, 6);
    F.forEach(fr => {
      const f = fr.f,
        a = f.a,
        c = Math.cos(a),
        s = Math.sin(a),
        x0 = f.mx + f.nx * 0.55,
        y0 = f.my + f.ny * 0.55,
        z = K.gnd(x0, y0);
      // a wall of bags along the door (three layers, staggered), 2.6 m
      for (let l = 0; l < 3; l++)
        for (let i = 0; i < 5 - l; i++) {
          const u = -1.2 + i * 0.6 + l * 0.3;
          B.box(
            x0 + c * u,
            y0 + s * u,
            z + l * 0.15,
            0.58,
            0.36,
            0.15,
            a + (K.hash(i * 7 + l) - 0.5) * 0.15,
            l % 2 ? PAL.sandDk : PAL.sand
          );
        }
    });
    // a mobile barrier across the lower end of the street: aluminium beams between posts, 0.6 m
    const P = sites().flood;
    if (P.length > 6) {
      const q = P[P.length - 3],
        r = P[P.length - 1],
        a = Math.atan2(r[1] - q[1], r[0] - q[0]) + Math.PI / 2,
        c = Math.cos(a),
        s = Math.sin(a);
      for (let u = -5; u <= 5; u += 2.5) {
        const x = q[0] + c * u,
          y = q[1] + s * u,
          z = K.gnd(x, y);
        B.box(x, y, z, 0.12, 0.12, 0.75, a, PAL.alu);
        if (u < 5)
          for (let l = 0; l < 4; l++)
            B.box(x + c * 1.25, y + s * 1.25, z + l * 0.15, 2.4, 0.08, 0.14, a, l % 2 ? PAL.alu : C(0x8d9399));
      }
    }
    g.add(K.mesh(B, K.mats().kit, 'zeitreise sandsaecke'));
    return g;
  }
  // flood marks: plates on the wall of the house nearest the camera, their wave line at street level + the mark's height
  function marken(d) {
    const g = new THREE.Group(),
      st = sites(),
      fr = st.fronts
        .slice()
        .sort(
          (a, b) => Math.hypot(a.f.mx - st.cam.x, a.f.my - st.cam.y) - Math.hypot(b.f.mx - st.cam.x, b.f.my - st.cam.y)
        )[0];
    if (!fr) return g;
    const f = fr.f,
      B = K.GB(),
      z = K.gnd(fr.qx, fr.qy);
    d.m.forEach(([y, h], i) => {
      const slot = SLOT['m' + y] !== undefined ? SLOT['m' + y] : 5,
        x = f.mx + f.nx * 0.05 + f.f.dx * (-0.9 + i * 0.75),
        yy = f.my + f.ny * 0.05 + f.f.dy * (-0.9 + i * 0.75);
      B.panel(x, yy, z + h - 0.16, 0.5, 0.25, f.face + Math.PI / 2, [1, 1, 1], uvOf(slot));
    });
    if (B.n()) g.add(K.mesh(B, K.mats().sign, 'zeitreise hochwassermarken'));
    return g;
  }
  // ---------- the blackout ----------
  function windowsOf(b, perFacade, upper) {
    const out = [];
    const fs = K.facadesOf(b)
      .filter(f => f.L > 3)
      .sort((a, c) => c.L - a.L)
      .slice(0, 4);
    for (const f of fs) {
      const n = Math.max(1, Math.min(perFacade, Math.floor(f.L / 2.4)));
      for (let i = 0; i < n; i++) {
        const u = (i + 0.5) / n - 0.5;
        const x = f.mx + f.f.dx * u * f.L * 0.8 + f.nx * 0.06,
          y = f.my + f.f.dy * u * f.L * 0.8 + f.ny * 0.06;
        out.push([x, y, (b.foot || K.gnd(b.cx, b.cy)) + 1.55, f.face + Math.PI / 2]);
        // under the gables an upper floor (the attic rooms)
        if (upper && f.f.kind === 'gable' && Math.abs(u) < 0.3)
          out.push([x, y, (b.foot || 0) + 4.6, f.face + Math.PI / 2]);
      }
    }
    return out;
  }
  function inseln(d) {
    const g = new THREE.Group(),
      B = K.GB(),
      st = sites();
    const H = K.houses()
      .filter(b => b.typ === 0 && b !== st.school && Math.hypot(b.cx - 260, b.cy + 160) < 420)
      .sort((a, b) => K.hash(a.id * 13 + 5) - K.hash(b.id * 13 + 5));
    const k = Math.round(H.length * d.k);
    for (const b of H.slice(0, k))
      for (const [x, y, z, a] of windowsOf(b, 1, false).slice(0, 2)) B.panel(x, y, z, 0.95, 1.1, a, PAL.winIsl);
    if (B.n()) g.add(K.mesh(B, K.mats().glow, 'zeitreise inselfenster'));
    g.userData.n = k;
    return g;
  }
  function schule() {
    const g = new THREE.Group(),
      st = sites(),
      b = st.school;
    if (!b) return g;
    const B = K.GB();
    for (const [x, y, z, a] of windowsOf(b, 5, true)) B.panel(x, y, z, 1.0, 1.25, a, PAL.win);
    g.add(K.mesh(B, K.mats().glow, 'zeitreise schulfenster'));
    // warm light on the ground in front of the main facade (the doors stand open)
    const f = st.schoolFront;
    if (f) {
      const D = K.GB(true),
        cx = f.mx + f.nx * 3.2,
        cy = f.my + f.ny * 3.2,
        z = K.gnd(cx, cy) + 0.04;
      for (let r = 0; r < 4; r++) {
        const rr = 2.2 + r * 1.6,
          al = 0.32 - r * 0.07,
          n = 18;
        for (let i = 0; i < n; i++) {
          const a0 = (i / n) * Math.PI * 2,
            a1 = ((i + 1) / n) * Math.PI * 2;
          D.tri(
            [cx, cy, z],
            [cx + Math.cos(a0) * rr * 1.4, cy + Math.sin(a0) * rr, z],
            [cx + Math.cos(a1) * rr * 1.4, cy + Math.sin(a1) * rr, z],
            [0.95, 0.68, 0.36, al]
          );
        }
      }
      g.add(K.inst(D.geo(), K.mats().decal, 1, 'zeitreise lichtschein'));
    }
    return g;
  }
  function speicher(d) {
    const g = new THREE.Group(),
      s = sites().container;
    if (!s) return g;
    const B = K.GB(),
      z = K.gnd(s.x, s.y),
      a = s.a,
      c = Math.cos(a),
      sn = Math.sin(a),
      at = (u, v) => [s.x + u * c - v * sn, s.y + u * sn + v * c];
    B.box(s.x, s.y, z, 6.06, 2.44, 2.59, a, PAL.container);
    for (let i = 0; i < 4; i++) B.panel(...at(-2.2 + i * 1.2, -1.23), z + 1.4, 0.8, 1.2, a, PAL.grille);
    B.box(...at(2.4, -1.25), z, 0.9, 0.06, 2.1, a, PAL.grille);
    B.tube([...at(-3.03, 0), z + 0.3], [...at(-6.5, 0.4), z + 0.05], 0.06, 6, PAL.dark);
    g.add(K.mesh(B, K.mats().kit, 'zeitreise dorfspeicher'));
    if (d.lit) {
      const L = K.GB();
      L.panel(...at(2.4, -1.32), z + 2.35, 0.35, 0.18, a, [2.4, 2.2, 1.8]);
      g.add(K.mesh(L, K.mats().glow, 'zeitreise speicherlampe'));
    }
    return g;
  }
  // the glow of the towns on the horizon (Schleusingen to the north-west, Suhl beyond to the north, Hildburghausen to the south-west):
  // additive bands low over the horizon, seen only at night – and gone in the blackout
  const TOWNS = [
    [-1100, 1230, 3.5, 1.0],
    [-2800, 9800, 9, 0.7],
    [-6800, -7200, 10, 0.55],
    [5200, 3400, 8, 0.35],
  ];
  function stadtlicht() {
    const g = new THREE.Group(),
      B = K.GB(true),
      R = 9000,
      c0 = [222, -108];
    for (const [tx, ty, w, k] of TOWNS) {
      const az = Math.atan2(ty - c0[1], tx - c0[0]),
        half = (w * 6 * Math.PI) / 180,
        n = 10;
      for (let i = 0; i < n; i++) {
        const a0 = az - half + (2 * half * i) / n,
          a1 = az - half + (2 * half * (i + 1)) / n,
          e0 = Math.sin(((i / n) * Math.PI) / 1),
          e1 = Math.sin((((i + 1) / n) * Math.PI) / 1),
          p = (a, h) => [c0[0] + Math.cos(a) * R, c0[1] + Math.sin(a) * R, h];
        const hb = 60,
          hm = 260 + 260 * k,
          ht = 700 + 900 * k,
          cb = (e, al) => [0.55 * k, 0.33 * k, 0.16 * k, al * e];
        B.quadC(p(a1, hb), p(a0, hb), p(a0, hm), p(a1, hm), [cb(e1, 0.5), cb(e0, 0.5), cb(e0, 0.32), cb(e1, 0.32)]);
        B.quadC(p(a1, hm), p(a0, hm), p(a0, ht), p(a1, ht), [cb(e1, 0.32), cb(e0, 0.32), cb(e0, 0), cb(e1, 0)]);
      }
    }
    const m = K.inst(B.geo(), K.mats().band, 1, 'zeitreise stadtlicht');
    m.frustumCulled = false;
    g.add(m);
    g.userData.band = m;
    return g;
  }
  function stadtAnim(o) {
    const V = G('VILLAGE'),
      n = S.nightFn ? S.nightFn() : V && V.night ? V.night() : 0;
    const m = o.userData.band;
    if (!m) return false;
    const k = Math.max(0, Math.min(1, (n - 0.2) / 0.6));
    if (Math.abs(m.material.opacity - k) < 0.02 && m.visible === k > 0.01) return false;
    m.visible = k > 0.01;
    // one material for every band: the opacity is the material's (only these bands use it)
    m.material.opacity = k;
  }
  // ---------- signs from the future ----------
  function schilder(d) {
    const g = new THREE.Group(),
      st = ZKDINGE.sites(),
      nt = sites(),
      CH = G('ZKCHRONIK'),
      B = K.GB(),
      P = K.GB();
    for (const id of d.ids) {
      const sg = CH && CH.SIGNS && CH.SIGNS[id];
      if (!sg || SLOT[id] === undefined) continue;
      let x, y, face;
      if (sg.place === 'kahlflaeche') {
        // ten metres in front of the clearing's camera (zk_zeitwelt.js place), facing it
        x = st.kahl.x + 1;
        y = st.kahl.y + 33;
        face = Math.PI / 2;
      } else if (sg.place === 'heizhaus') {
        const h = st.heiz;
        x = h.road[0] + (h.x - h.road[0]) * 0.3;
        y = h.road[1] + (h.y - h.road[1]) * 0.3;
        face = Math.atan2(h.road[1] - h.y, h.road[0] - h.x);
      } else if (sg.place === 'windrad') {
        // the building board at the edge of the clearing where the camera stands, facing it
        x = st.wind.x - 14;
        y = st.wind.y + 288;
        face = Math.PI / 2;
      } else if (sg.place === 'schule' && nt.schoolFront) {
        const f = nt.schoolFront;
        x = f.mx + f.nx * 2.2 + f.f.dx * 3.5;
        y = f.my + f.ny * 2.2 + f.f.dy * 3.5;
        face = f.face;
      } else continue;
      const z = K.gnd(x, y),
        a = face + Math.PI / 2;
      B.panel(x, y, z + 1.55, 2.0, 1.0, a, [1, 1, 1], uvOf(SLOT[id]));
      // the back of the board and its two posts
      const c = Math.cos(a),
        s = Math.sin(a),
        bx = -Math.cos(face) * 0.04,
        by = -Math.sin(face) * 0.04;
      P.box(x + bx * 1.5, y + by * 1.5, z + 1.04, 2.04, 0.05, 1.04, a, C(0x3a3a38));
      for (const u of [-0.8, 0.8]) P.box(x + c * u + bx * 3, y + s * u + by * 3, z, 0.08, 0.08, 2.05, a, C(0x6b6e70));
    }
    if (B.n())
      g.add(K.mesh(B, K.mats().sign, 'zeitreise schilder'), K.mesh(P, K.mats().kit, 'zeitreise schildpfosten'));
    return g;
  }
  // ---------- the village's lights in the blackout: every lamp and window reads VILLAGE.night – held at 0 ----------
  function dark(on) {
    const V = G('VILLAGE');
    if (!V || !V.night) return;
    if (on && !S.dark) {
      S.nightFn = V.night;
      const orig = V.night;
      V.night = () => {
        if (flickering()) {
          const k = Math.floor((performance.now() - S.flickT) / 110);
          return k % 2 || k > 6 ? 0 : orig.call(V);
        }
        return 0;
      };
      S.dark = true;
    } else if (!on && S.dark) {
      V.night = S.nightFn;
      S.nightFn = null;
      S.dark = false;
    }
  }
  // ---------- the things ----------
  const q = (v, s = 0.1) => Math.round((+v || 0) / s) * s;
  const W = st => st.water || {};
  const BO = st => (st.energy && st.energy.blackout) || null;
  K.thing({
    id: 'flut',
    want: st => (+W(st).level > 0.004 ? { lv: q(W(st).level, 0.01) } : null),
    build: d => {
      const o = flut();
      flutLevel(o, d);
      return o;
    },
    update: (o, d) => flutLevel(o, d),
  });
  K.thing({
    id: 'feuerwehr',
    want: (st, side) => ((W(st).rain || +W(st).level > 0.03) && K.cue(side, 'blaulicht', true) ? { on: 1 } : null),
    build: () => feuerwehr(),
    anim: (o, d, t) => blink(o, t),
  });
  K.thing({
    id: 'schlamm',
    want: st => (+W(st).mud > 0.03 ? { m: q(W(st).mud, 0.1) } : null),
    build: d => schlamm(d),
  });
  K.thing({
    id: 'sperrmuell',
    want: st => (+W(st).debris > 0.05 ? { n: Math.max(1, Math.round(+W(st).debris * 8)) } : null),
    build: d => sperrmuell(d),
  });
  K.thing({
    id: 'schmutzrand',
    // where the water came into the houses: the highest level of the night (its mark) when the mud is still there
    want: st => {
      const w = W(st),
        m = (w.marks || []).filter(k => k.y >= 2030).map(k => +k.h || 0);
      const h = Math.max(+w.level || 0, ...m, 0);
      return +w.mud > 0.4 && h > 0.15 ? { h: q(h, 0.05) } : null;
    },
    build: d => schmutzrand(d),
  });
  K.thing({
    id: 'sandsaecke',
    want: st => {
      const w = W(st);
      return +w.prepared >= 0.5 && (w.rain || +w.level > 0 || +w.mud > 0.01 || +w.debris > 0.01) ? { on: 1 } : null;
    },
    build: () => sandsaecke(),
  });
  K.thing({
    id: 'marken',
    want: st => {
      const m = (W(st).marks || []).map(k => [k.y, q(k.h, 0.01)]);
      return m.length ? { m } : null;
    },
    build: d => marken(d),
  });
  K.thing({
    id: 'inseln',
    want: st => (BO(st) && +BO(st).islands > 0.005 ? { k: q(BO(st).islands, 0.02) } : null),
    build: d => inseln(d),
  });
  K.thing({
    id: 'schule',
    want: (st, side) => (BO(st) && BO(st).school && K.cue(side, 'schule-licht', true) ? { on: 1 } : null),
    build: () => schule(),
  });
  K.thing({
    id: 'speicher',
    want: st => (st.energy && +st.energy.battery > 0.4 ? { lit: BO(st) && BO(st).school ? 1 : 0 } : null),
    build: d => speicher(d),
  });
  K.thing({
    id: 'stadtlicht',
    want: st => (BO(st) ? null : { on: 1 }),
    build: () => stadtlicht(),
    anim: o => stadtAnim(o),
  });
  K.thing({
    id: 'schilder',
    want: st => (st.signs && st.signs.length ? { ids: st.signs.slice().sort() } : null),
    build: d => schilder(d),
  });
  K.thing({
    id: 'pumpe',
    want: (st, side) => {
      const w = W(st);
      return K.cue(side, 'pumpe', +w.level > 0.15) || (+w.mud > 0.5 && !w.rain && !(+w.level > 0.01))
        ? { on: 1 }
        : null;
    },
    build: () => pumpe(),
  });
  K.thing({
    id: 'oel',
    want: (st, side) => (+W(st).level > 0.02 && K.cue(side, 'oel', false) ? { lv: q(W(st).level, 0.01) } : null),
    build: d => {
      const o = oelfilm();
      flutLevel(o, d);
      return o;
    },
    update: (o, d) => flutLevel(o, d),
  });
  K.thing({
    id: 'fw-aggregat',
    want: (st, side) => (BO(st) && K.cue(side, 'aggregat-feuerwehr', false) ? { on: 1 } : null),
    build: () => fwAggregat(),
  });
  // a portable pump by a house: the suction hose into the cellar window, the outflow along the gutter
  function pumpe() {
    const g = new THREE.Group(),
      st = sites(),
      fr = st.fronts[1] || st.fronts[0];
    if (!fr) return g;
    const f = fr.f,
      B = K.GB(),
      x = f.mx + f.nx * 2.4,
      y = f.my + f.ny * 2.4,
      z = K.gnd(x, y),
      a = f.a;
    B.box(x, y, z, 0.9, 0.6, 0.55, a, PAL.red);
    B.box(x, y, z + 0.55, 0.5, 0.4, 0.25, a, PAL.dark);
    B.tube([x, y, z + 0.3], [f.mx + f.nx * 0.1, f.my + f.ny * 0.1, z + 0.25], 0.06, 6, PAL.dark);
    B.tube(
      [x + f.f.dx * 0.5, y + f.f.dy * 0.5, z + 0.2],
      [x + f.f.dx * 9 + f.nx * 2.5, y + f.f.dy * 9 + f.ny * 2.5, z + 0.05],
      0.07,
      6,
      C(0xd9d4c4)
    );
    g.add(K.mesh(B, K.mats().kit, 'zeitreise pumpe'));
    return g;
  }
  // a film of heating oil on the flood: shimmering streaks over the water (a decal just above it)
  function oelfilm() {
    const P = sites().flood,
      g = new THREE.Group();
    if (P.length < 2) return g;
    const B = K.GB(true),
      tints = [
        [0.32, 0.12, 0.38],
        [0.12, 0.3, 0.26],
        [0.36, 0.3, 0.08],
        [0.18, 0.16, 0.34],
      ];
    for (let i = 0; i + 1 < P.length; i++)
      for (let k = -4; k <= 4; k++) {
        const h = K.hash(i * 37 + k * 11);
        if (h > 0.45) continue;
        const c = tints[(i + k + 8) % 4];
        K.strip(
          B,
          [P[i], P[i + 1]],
          -k * 1.6 + 0.7,
          k * 1.6 + 0.7,
          (x, y, s) => groundAlong(P, s) + 0.012,
          () => [c[0], c[1], c[2], 0.3 + 0.25 * h]
        );
      }
    const m = K.inst(B.geo(), K.mats().decal, 1, 'zeitreise oelfilm');
    g.add(m);
    g.userData.sheet = m;
    return g;
  }
  // the fire station's generator (in the old school): a red unit by the door, a work light
  function fwAggregat() {
    const g = new THREE.Group(),
      f = sites().schoolFront;
    if (!f) return g;
    const B = K.GB(),
      x = f.mx + f.nx * 2.0 - f.f.dx * 3,
      y = f.my + f.ny * 2.0 - f.f.dy * 3,
      z = K.gnd(x, y);
    B.box(x, y, z, 1.1, 0.75, 0.8, f.a, PAL.red);
    B.box(x, y, z + 0.8, 0.9, 0.6, 0.12, f.a, PAL.dark);
    B.tube(
      [x + f.nx * 0.2, y + f.ny * 0.2, z + 0.5],
      [f.mx + f.nx * 0.1 - f.f.dx * 2, f.my + f.ny * 0.1 - f.f.dy * 2, z + 0.4],
      0.04,
      5,
      PAL.dark
    );
    // a work light on a stand
    B.cyl(x + f.f.dx * 2, y + f.f.dy * 2, z, 0.03, 0.03, 2.2, 5, PAL.dark);
    g.add(K.mesh(B, K.mats().kit, 'zeitreise fw-aggregat'));
    const L = K.GB();
    L.panel(
      x + f.f.dx * 2 + f.nx * 0.05,
      y + f.f.dy * 2 + f.ny * 0.05,
      z + 2.25,
      0.4,
      0.3,
      f.face + Math.PI / 2,
      [2.6, 2.5, 2.2]
    );
    g.add(K.mesh(L, K.mats().glow, 'zeitreise arbeitslicht'));
    return g;
  }
  // the lights go out with a flicker (the cue 'licht-aus'): for 0.8 s the village's night switch jumps between on and off
  function flicker() {
    S.flickT = performance.now();
  }
  const flickering = () => !!S.flickT && performance.now() - S.flickT < 900;
  function set(L, R) {
    dark(!!((L && BO(L)) || (R && BO(R))));
  }
  function clear() {
    dark(false);
  }
  function warm() {
    atlas();
  }
  return { S, sites, set, clear, warm, atlas, flicker, flickering, SLOT };
})();
