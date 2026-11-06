// ===================== feat/bus 2: the regional bus and the stop sign as models (BUSMOD) =====================
// A 12 m two-axle low-floor bus as the Werrabus lines in the Landkreis Hildburghausen drive them – without any brand: 12.0 × 2.55 × 3.1 m,
// wheelbase 5.95 m, a front door before the front axle and a middle door, low floor 0.36 m, two plus two seats, yellow poles, the driver's
// place on the left, an air-conditioning box on the roof; tinted windows one sees through (the lit inside at night), a destination display
// (LED, line and destination) at the front, beside the front door and the line at the back. Built from the village kit
// (world/village_props.js VPROPS.kit) with vertex colours in the material of the traffic (verkehr/verkehr_fig.js VFIG.mat) – the same
// shader programs as the cars; glass, lamps and the display have their own few materials, made at load and compiled with everything else
// (an invisible carrier each), so a bus that comes later needs no new program. The geometry is built on first need and shared; each bus
// has its own display (a canvas) and its passengers. Local frame of the kit: x right, y forward, z up (three: forward is −z).
// The stop sign: a pole with the green H on the yellow disc (Zeichen 224), the stop's name, the timetable case.
import * as THREE from 'three';
import { scene } from '../core/head.js';
import { VPROPS } from '../world/village_props.js';
import { VFIG } from '../verkehr/verkehr_fig.js';
export const BUSMOD = (() => {
  const S = { built: 0, signs: 0 };
  const L = 12.0,
    W = 2.55,
    HW = W / 2,
    H = 3.08,
    FL = 0.36,
    AF = 3.25,
    AR = -2.7,
    RW = 0.5,
    DOOR_F = [4.45, 5.65],
    DOOR_M = [-0.2, 1.0];
  const col = h => VFIG.col(h);
  // ---- materials: made now (they are compiled while the loading screen is up), used later ----
  const M = {
    body: VFIG.mat(),
    glass: new THREE.MeshStandardMaterial({
      color: 0x2a3a42,
      roughness: 0.06,
      metalness: 0.3,
      transparent: true,
      opacity: 0.4,
      depthWrite: false,
    }),
    head: new THREE.MeshStandardMaterial({
      color: 0xdfe3e6,
      metalness: 0.3,
      roughness: 0.12,
      emissive: 0xfff2d6,
      emissiveIntensity: 0,
    }),
    tail: new THREE.MeshStandardMaterial({
      color: 0x6d0a0a,
      roughness: 0.25,
      emissive: 0xff1a0c,
      emissiveIntensity: 0,
    }),
    cabin: new THREE.MeshStandardMaterial({
      color: 0xf4f1e8,
      roughness: 0.6,
      emissive: 0xfff4dc,
      emissiveIntensity: 0,
    }),
    disp: new THREE.MeshBasicMaterial({ color: 0xffffff }),
    // the soft shadow under the bus (it casts none into the sun's map – a moving caster would ask for a new map each frame, as the cars
    // of the traffic do not either): a dark gradient on the road
    shade: new THREE.MeshBasicMaterial({
      color: 0x000000,
      transparent: true,
      opacity: 0.55,
      depthWrite: false,
      polygonOffset: true,
      polygonOffsetFactor: -2,
      polygonOffsetUnits: -2,
    }),
  };
  {
    const cv = document.createElement('canvas');
    cv.width = 64;
    cv.height = 128;
    const c = cv.getContext('2d'),
      img = c.createImageData(64, 128);
    for (let j = 0; j < 128; j++)
      for (let i = 0; i < 64; i++) {
        // a rounded rectangle, soft at the edges
        const u = Math.abs(i - 31.5) / 32,
          v = Math.abs(j - 63.5) / 64,
          d = Math.max(0, Math.max((u - 0.62) / 0.38, (v - 0.86) / 0.14)),
          a = Math.max(0, 1 - d) ** 1.6;
        // (three reads an alphaMap from the green channel, not from alpha)
        const o = (j * 64 + i) * 4,
          g = Math.round(a * 255);
        img.data[o] = img.data[o + 1] = img.data[o + 2] = g;
        img.data[o + 3] = 255;
      }
    c.putImageData(img, 0, 0);
    M.shade.alphaMap = new THREE.CanvasTexture(cv);
  }
  // (named, so a test can tell the bus's programs from others: viz3/test/bus.py)
  for (const [k, m] of Object.entries(M)) if (m !== M.body) m.name = 'bus ' + k;
  {
    // the carriers: one tiny invisible mesh per material, so render/render.js compileShown compiles their programs at load
    const g = new THREE.PlaneGeometry(0.01, 0.01);
    for (const m of Object.values(M)) {
      const c = new THREE.Mesh(g, m);
      c.visible = false;
      c.userData.noMerge = true;
      c.name = 'bus carrier';
      scene.add(c);
    }
    const t = new THREE.CanvasTexture(document.createElement('canvas'));
    const dm = M.disp.clone();
    dm.map = t;
    dm.name = 'bus display';
    const c = new THREE.Mesh(g, dm);
    c.visible = false;
    c.userData.noMerge = true;
    c.name = 'bus carrier display';
    scene.add(c);
    M.dispMap = dm;
  }
  // ---- the shared geometry ----
  let G = null;
  function geos() {
    if (G) return G;
    const kB = VPROPS.kit(),
      kG = VPROPS.kit(),
      kH = VPROPS.kit(),
      kT = VPROPS.kit(),
      kC = VPROPS.kit(),
      kD = VPROPS.kit();
    const WHITE = col(0xeceeed),
      GREY = col(0x8d9396),
      DARK = col(0x202326),
      BLACK = col(0x0e0f10),
      BAND = col(0x2f5d7c),
      FLOOR = col(0x3c3f42),
      INNER = col(0xd9d6cc),
      SEAT = col(0x2a3a66),
      SEAT2 = col(0x3d4f86),
      YEL = col(0xf2c400),
      SKIN = col(0xd7a98a),
      SHIRT = col(0x2b3f63);
    // a box between two corners (x0, y0, z0) – (x1, y1, z1)
    const bx = (k, x0, y0, z0, x1, y1, z1, c, bottom) =>
      k.box((x0 + x1) / 2, (y0 + y1) / 2, z0, Math.abs(x1 - x0), Math.abs(y1 - y0), z1 - z0, 0, c, bottom);
    const ZW0 = 1.12,
      ZW1 = 2.55;
    // the lower sides with the wheel arches and the door openings (right side), a dark skirt, the band over the arches
    const arch = (y, a) => [y - 0.68, y + 0.68];
    for (const sx of [-1, 1]) {
      const x0 = sx * HW - (sx > 0 ? 0.05 : -0.05),
        x1 = sx * HW;
      const cuts = [arch(AF), arch(AR)];
      if (sx > 0) cuts.push(DOOR_F, DOOR_M);
      cuts.sort((a, b) => a[0] - b[0]);
      let y = -L / 2;
      for (const [c0, c1] of cuts) {
        if (c0 > y) {
          bx(kB, x0, y, 0.3, x1, c0, ZW0, WHITE);
          bx(kB, x0 + sx * 0.01, y, 0.3, x1 + sx * 0.01, c0, 0.5, BAND);
        }
        y = Math.max(y, c1);
      }
      bx(kB, x0, y, 0.3, x1, L / 2 - 0.05, ZW0, WHITE);
      bx(kB, x0 + sx * 0.01, y, 0.3, x1 + sx * 0.01, L / 2 - 0.05, 0.5, BAND);
      // above the arches up to the windows
      for (const [c0, c1] of [arch(AF), arch(AR)]) bx(kB, x0, c0, 1.0, x1, c1, ZW0, WHITE);
      // the wheelhouses inside the arches
      for (const a of [AF, AR]) bx(kB, sx * (HW - 0.38), a - 0.68, 0.25, sx * (HW - 0.06), a + 0.68, 1.02, DARK);
      // window band: glass with black pillars (the doors: their own leaves)
      const gy0 = -L / 2 + 0.35,
        gy1 = L / 2 - 0.3;
      let gy = gy0;
      const gaps = sx > 0 ? [DOOR_F, DOOR_M] : [];
      for (const [d0, d1] of [...gaps, [gy1, gy1]].sort((a, b) => a[0] - b[0])) {
        if (d0 > gy) bx(kG, x0 + sx * 0.02, gy, ZW0, x1 - sx * 0.01, d0, ZW1, BLACK);
        gy = Math.max(gy, d1);
      }
      for (let p = gy0; p <= gy1 + 0.01; p += 1.42) {
        if (sx > 0 && gaps.some(([d0, d1]) => p > d0 - 0.1 && p < d1 + 0.1)) continue;
        bx(kB, x1 - sx * 0.005, p - 0.06, ZW0, x1 + sx * 0.012, p + 0.06, ZW1, BLACK);
      }
      bx(kB, x0, -L / 2, ZW0, x1, gy0, ZW1, WHITE);
      // over the doors: the frame; the band above the windows, the rounded roof edge
      if (sx > 0) for (const [d0, d1] of gaps) bx(kB, x0, d0 - 0.06, 2.45, x1, d1 + 0.06, ZW1, BLACK);
      bx(kB, x0, -L / 2, ZW1, x1, L / 2 - 0.05, 2.95, WHITE);
      kB.quad(
        [x1, -L / 2, 2.95],
        [x1, L / 2 - 0.05, 2.95],
        [sx * (HW - 0.12), L / 2 - 0.05, H],
        [sx * (HW - 0.12), -L / 2, H],
        WHITE
      );
      if (sx < 0)
        kB.quad(
          [sx * (HW - 0.12), -L / 2, H],
          [sx * (HW - 0.12), L / 2 - 0.05, H],
          [x1, L / 2 - 0.05, 2.95],
          [x1, -L / 2, 2.95],
          WHITE
        );
      // inside: the lower wall, the ceiling cove
      bx(kB, sx * (HW - 0.08), -L / 2 + 0.2, FL, sx * (HW - 0.05), L / 2 - 0.3, ZW0, INNER);
    }
    // roof, air conditioning, ceiling with the light strips
    bx(kB, -HW + 0.12, -L / 2, H - 0.06, HW - 0.12, L / 2 - 0.05, H, WHITE);
    bx(kB, -0.85, -1.6, H, 0.85, 1.8, H + 0.26, col(0xd8dbdc));
    // (the ceiling in the cabin's material: by day it takes a little of the light that comes through the windows – lit only by the sky
    // from below it read dark brown from the seat)
    bx(kC, -HW + 0.06, -L / 2 + 0.1, 2.86, HW - 0.06, L / 2 - 0.2, 2.9, col(0xe4e2dc), true);
    for (const sx of [-1, 1])
      bx(kC, sx * 0.62 - 0.08, -L / 2 + 0.6, 2.84, sx * 0.62 + 0.08, L / 2 - 1.2, 2.86, INNER, true);
    // floor and the dark underbody
    bx(kB, -HW + 0.05, -L / 2 + 0.1, FL - 0.06, HW - 0.05, L / 2 - 0.1, FL, FLOOR);
    bx(kB, -HW + 0.1, -L / 2 + 0.2, 0.26, HW - 0.1, L / 2 - 0.2, FL - 0.06, DARK, true);
    // the front: bumper, panel with the head lamps, windscreen (raked a little), the display box above it
    const YF = L / 2;
    bx(kB, -HW, YF - 0.12, 0.28, HW, YF + 0.04, 0.55, DARK);
    bx(kB, -HW, YF - 0.1, 0.55, HW, YF, 0.95, WHITE);
    bx(kB, -HW + 0.05, YF - 0.08, 0.55, -HW + 0.4, YF + 0.01, 0.62, BLACK);
    for (const sx of [-1, 1]) {
      // head lamps in the outer corners of the front, the indicator above them
      bx(kH, sx * (HW - 0.3) - 0.2, YF - 0.02, 0.64, sx * (HW - 0.3) + 0.2, YF + 0.015, 0.8, WHITE);
      bx(kB, sx * (HW - 0.3) - 0.2, YF - 0.02, 0.81, sx * (HW - 0.3) + 0.2, YF + 0.012, 0.86, col(0xd98a1c));
      bx(kT, sx * (HW - 0.02) - 0.05, -L / 2 - 0.02, 0.65, sx * (HW - 0.02) + 0.05, -L / 2 + 0.02, 1.55, WHITE);
      // the mirrors on their arms
      bx(kB, sx * HW, YF - 0.25, 2.45, sx * (HW + 0.32), YF - 0.2, 2.5, BLACK);
      bx(kB, sx * (HW + 0.25), YF - 0.28, 1.95, sx * (HW + 0.33), YF - 0.14, 2.45, BLACK);
    }
    kG.quad(
      [-HW + 0.05, YF, 0.95],
      [HW - 0.05, YF, 0.95],
      [HW - 0.05, YF - 0.1, 2.72],
      [-HW + 0.05, YF - 0.1, 2.72],
      BLACK
    );
    kG.quad(
      [HW - 0.05, YF - 0.02, 0.95],
      [-HW + 0.05, YF - 0.02, 0.95],
      [-HW + 0.05, YF - 0.12, 2.72],
      [HW - 0.05, YF - 0.12, 2.72],
      BLACK
    );
    bx(kB, -HW, YF - 0.2, 2.72, HW, YF - 0.08, H, BLACK);
    // the rear: engine panel, a small window, the line display
    bx(kB, -HW, -L / 2, 0.28, HW, -L / 2 + 0.1, ZW0 + 0.4, WHITE);
    bx(kB, -HW, -L / 2 - 0.03, 0.28, HW, -L / 2 + 0.02, 0.5, DARK);
    bx(kB, -HW, -L / 2, 2.45, HW, -L / 2 + 0.1, H, WHITE);
    bx(kG, -HW + 0.1, -L / 2 - 0.005, ZW0 + 0.4, HW - 0.1, -L / 2 + 0.02, 2.45, BLACK);
    for (const sx of [-1, 1])
      bx(kB, sx * HW - 0.1, -L / 2, ZW0 + 0.4, sx * HW + (sx > 0 ? 0 : 0.1), -L / 2 + 0.1, 2.45, WHITE);
    // inside: seats two plus two (the space at the middle door free for prams and wheelchairs, on the left side), poles, the driver
    const seat = (x, y, c, fwd = 1) => {
      bx(kB, x - 0.22, y - 0.22, FL + 0.42, x + 0.22, y + 0.22, FL + 0.5, c);
      bx(kB, x - 0.22, y - 0.27 * fwd - 0.04, FL + 0.5, x + 0.22, y - 0.27 * fwd + 0.04, FL + 1.12, c);
      bx(kB, x - 0.03, y - 0.03, FL, x + 0.03, y + 0.03, FL + 0.42, GREY);
    };
    S.seats = [];
    const rows = [2.35, 1.55, -1.25, -2.05, -2.85, -3.65, -4.45];
    for (const y of rows)
      for (const x of [-0.98, -0.52, 0.52, 0.98]) {
        if (y > 1 && y < 2 && x < 0) continue;
        if (y < 0 && y > -1.5 && x < 0) continue;
        const c = (Math.round(y * 3 + x * 7) & 1) === 0 ? SEAT : SEAT2;
        seat(x, y, c);
        S.seats.push([x, y]);
      }
    // the last row across
    for (const x of [-0.98, -0.5, 0, 0.5, 0.98]) {
      seat(x, -5.3, SEAT);
      S.seats.push([x, -5.3]);
    }
    bx(kB, -HW + 0.08, -5.75, FL, HW - 0.08, -5.0, FL + 0.38, INNER);
    const pole = (x, y) => kB.cyl(x, y, FL, 2.86, 0.02, 0.02, 6, YEL);
    for (const [x, y] of [
      [0.75, DOOR_F[0] - 0.05],
      [0.75, DOOR_M[0] - 0.08],
      [0.75, DOOR_M[1] + 0.08],
      [0.28, 2.75],
      [-0.28, 0.4],
      [0.28, -1.65],
      [-0.28, -3.25],
      [0.28, -4.85],
    ])
      pole(x, y);
    for (const sx of [-1, 1]) bx(kB, sx * 0.3 - 0.015, -5.0, 2.0, sx * 0.3 + 0.015, 3.9, 2.03, YEL);
    // the driver's place: cab wall, seat, wheel, dashboard and the driver
    bx(kB, -HW + 0.06, 4.15, FL, -0.25, 4.2, 1.45, INNER);
    seat(-0.75, 4.75, DARK);
    bx(kB, -HW + 0.08, 5.45, FL, 0.3, 5.85, 1.05, DARK);
    kB.disc(-0.75, 5.3, 1.25, 0, 1, 0.22, BLACK, 14);
    bx(kB, -0.92, 4.6, FL + 0.5, -0.58, 4.85, FL + 1.05, SHIRT);
    kB.ball(-0.75, 4.78, FL + 1.22, 0.11, SKIN, 8);
    // the passengers' places (a few sit there per bus: one more mesh each, see passengers below)
    // the door leaves (glass with a dark frame): front door two leaves, middle door two leaves – each its own mesh to slide
    const leaf = (k, y0, y1) => {
      bx(k, HW - 0.04, y0, 0.36, HW, y1, 2.44, BLACK);
    };
    leaf(kD, 0, 0.6);
    // the wheels: one axle with both wheels (tyre, rim, hub) about the axle's centre, the axle along the kit's x (right)
    const kW = VPROPS.kit(),
      ring = (x, r, t) => [x, Math.cos(t) * r, Math.sin(t) * r];
    for (const sx of [-1, 1]) {
      const xc = sx * (HW - 0.38),
        x0 = xc - 0.16,
        x1 = xc + 0.16,
        xo = xc + sx * 0.165,
        NS = 18;
      for (let i = 0; i < NS; i++) {
        const t0 = (i / NS) * Math.PI * 2,
          t1 = ((i + 1) / NS) * Math.PI * 2;
        kW.quad(ring(x0, RW, t0), ring(x0, RW, t1), ring(x1, RW, t1), ring(x1, RW, t0), BLACK);
        kW.quad(ring(x1, RW, t0), ring(x1, RW, t1), ring(x0, RW, t1), ring(x0, RW, t0), BLACK);
        for (const [r0, r1, c] of [
          [0.31, RW, BLACK],
          [0.1, 0.31, GREY],
          [0, 0.1, DARK],
        ]) {
          kW.quad(ring(xo, r0, t0), ring(xo, r1, t0), ring(xo, r1, t1), ring(xo, r0, t1), c);
          kW.quad(ring(xo, r0, t1), ring(xo, r1, t1), ring(xo, r1, t0), ring(xo, r0, t0), c);
        }
      }
    }
    const gW = kW.geo();
    G = {
      body: kB.geo(),
      glass: kG.geo(),
      head: kH.geo(),
      tail: kT.geo(),
      cabin: kC.geo(),
      leaf: kD.geo(),
      wheel: gW,
      shade: new THREE.PlaneGeometry(W + 0.9, L + 1.2).rotateX(-Math.PI / 2).translate(0, 0.04, 0),
    };
    // the displays: front (above the windscreen), right side (behind the front door), back (the line)
    const pl = (w, h, x, y, z, ry, u0, u1) => {
      const g = new THREE.PlaneGeometry(w, h);
      const uv = g.attributes.uv;
      for (let i = 0; i < uv.count; i++) uv.setX(i, u0 + (u1 - u0) * uv.getX(i));
      g.rotateY(ry);
      g.translate(x, z, -y);
      return g;
    };
    G.disp = mergeAll([
      pl(1.9, 0.2, 0, YF - 0.065, 2.86, Math.PI, 0, 1),
      pl(1.5, 0.16, HW + 0.012, DOOR_F[0] - 1.15, 2.72, Math.PI / 2, 0, 1),
      pl(0.5, 0.18, 0, -L / 2 - 0.035, 2.72, 0, 0, 0.25),
    ]);
    return G;
  }
  function mergeAll(gs) {
    let n = 0;
    for (const g of gs) n += g.attributes.position.count;
    const P = new Float32Array(n * 3),
      N = new Float32Array(n * 3),
      U = new Float32Array(n * 2),
      I = [];
    let o = 0;
    for (const g of gs) {
      const gi = g.index ? g.index.array : null,
        c = g.attributes.position.count;
      P.set(g.attributes.position.array, o * 3);
      N.set(g.attributes.normal.array, o * 3);
      U.set(g.attributes.uv.array, o * 2);
      if (gi) for (const i of gi) I.push(i + o);
      o += c;
    }
    const m = new THREE.BufferGeometry();
    m.setAttribute('position', new THREE.BufferAttribute(P, 3));
    m.setAttribute('normal', new THREE.BufferAttribute(N, 3));
    m.setAttribute('uv', new THREE.BufferAttribute(U, 2));
    m.setIndex(I);
    m.computeBoundingSphere();
    return m;
  }
  // ---- a bus: its group, the moving parts, its display ----
  const own = (m, shadow) => {
    m.userData.noMerge = true;
    m.castShadow = !!shadow;
    m.receiveShadow = false;
    return m;
  };
  function build(seed = 1) {
    const g0 = geos(),
      g = new THREE.Group();
    g.name = 'bus';
    const body = own(new THREE.Mesh(g0.body, M.body)),
      glass = own(new THREE.Mesh(g0.glass, M.glass)),
      head = own(new THREE.Mesh(g0.head, M.head)),
      tail = own(new THREE.Mesh(g0.tail, M.tail)),
      cabin = own(new THREE.Mesh(g0.cabin, M.cabin)),
      shade = own(new THREE.Mesh(g0.shade, M.shade));
    glass.renderOrder = 2;
    shade.renderOrder = 1;
    // the display: its own canvas
    const cv = document.createElement('canvas');
    cv.width = 512;
    cv.height = 64;
    const tex = new THREE.CanvasTexture(cv);
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.anisotropy = 4;
    const dm = M.dispMap.clone();
    dm.map = tex;
    const disp = own(new THREE.Mesh(g0.disp, dm));
    // wheels: two axles, turned by the distance driven
    const wF = own(new THREE.Mesh(g0.wheel, M.body)),
      wR = own(new THREE.Mesh(g0.wheel, M.body));
    wF.position.set(0, RW, -AF);
    wR.position.set(0, RW, -AR);
    // the door leaves: two per door, they swing out and slide along (plug doors)
    const doors = [];
    for (const [d0, d1] of [DOOR_F, DOOR_M]) {
      const w2 = (d1 - d0) / 2;
      for (const side of [0, 1]) {
        const m = own(new THREE.Mesh(g0.leaf, M.glass));
        m.renderOrder = 2;
        m.scale.z = w2 / 0.6;
        const y0 = side ? d0 + w2 : d0;
        m.userData.home = -y0;
        m.userData.dir = side ? 1 : -1;
        m.userData.w = w2;
        m.position.set(0, 0, -y0);
        doors.push(m);
      }
    }
    // a few passengers sitting (one mesh), different for each bus
    const kP = VPROPS.kit();
    let r = seed * 9301 + 49297;
    const rnd = () => (r = (r * 9301 + 49297) % 233280) / 233280;
    const tops = [0x7a2b2b, 0x2f4f2f, 0x4a4a6a, 0x8c6d3f, 0x5b5b5b, 0x2d2d2d, 0x9a8a70, 0x3e5a7a];
    // (the seat one takes – right at the window, bus/bus.js SEAT – stays free)
    const seats = S.seats.filter(([x, y]) => !(Math.abs(y + 2.05) < 0.1 && x > 0));
    const nP = 2 + Math.floor(rnd() * 5);
    S.lastSeats = [];
    for (let i = 0; i < nP && seats.length; i++) {
      const [x, y] = seats.splice(Math.floor(rnd() * seats.length), 1)[0];
      if (y > 0.6 && y < 2.6 && x > 0) continue;
      const c = col(tops[Math.floor(rnd() * tops.length)]);
      kP.box(x, y - 0.05, FL + 0.5, 0.36, 0.24, 0.55, 0, c);
      kP.ball(x, y - 0.04, FL + 1.18, 0.105, col(rnd() < 0.5 ? 0xd7a98a : 0xc69373), 8);
      kP.box(x, y + 0.12, FL + 0.42, 0.34, 0.36, 0.12, 0, col(0x25272a));
    }
    const pax = own(new THREE.Mesh(kP.empty() ? new THREE.BufferGeometry() : kP.geo(), M.body));
    g.add(shade, body, glass, head, tail, cabin, disp, wF, wR, pax, ...doors);
    g.visible = false;
    scene.add(g);
    S.built++;
    const B = { g, body, glass, disp, tex, cv, wF, wR, doors, pax, dm, open: 0, text: '' };
    B.sign = (line, dest) => {
      const t = line + '|' + dest;
      if (B.text === t) return;
      B.text = t;
      const c = cv.getContext('2d');
      c.fillStyle = '#050505';
      c.fillRect(0, 0, 512, 64);
      c.fillStyle = '#ffb12a';
      c.font = 'bold 46px Arial, Helvetica, sans-serif';
      c.textBaseline = 'middle';
      c.textAlign = 'center';
      c.fillText(line, 64, 34);
      c.font = 'bold 40px Arial, Helvetica, sans-serif';
      // too long for the display: the town alone („Schleusingen, Zentralhaltestelle“ → „Schleusingen“), then shortened
      let d = dest;
      if (c.measureText(d).width > 370 && d.includes(',')) d = d.split(',')[0];
      while (c.measureText(d).width > 370 && d.length > 4) d = d.slice(0, -2) + '…';
      c.textAlign = 'left';
      c.fillText(d, 136, 35);
      c.fillStyle = '#1a1206';
      c.fillRect(126, 6, 3, 52);
      tex.needsUpdate = true;
    };
    // the doors: 0 shut … 1 open (out by 6 cm, then sideways by the leaf's width)
    B.setOpen = k => {
      k = Math.max(0, Math.min(1, k));
      if (Math.abs(k - B.open) < 1e-3) return;
      B.open = k;
      const out = Math.min(1, k * 3) * 0.06,
        side = Math.max(0, (k - 0.25) / 0.75);
      for (const m of doors) {
        m.position.x = out;
        m.position.z = m.userData.home - m.userData.dir * side * m.userData.w * 0.92;
      }
    };
    B.dispose = () => {
      scene.remove(g);
      tex.dispose();
      dm.dispose();
      if (pax.geometry) pax.geometry.dispose();
    };
    return B;
  }
  // lamps by day and night (shared by every bus): head lamps and the lit inside after dusk, tail lamps dim
  function lamps(night) {
    M.head.emissiveIntensity = night ? 2.4 : 0.15;
    M.tail.emissiveIntensity = night ? 1.4 : 0.25;
    M.cabin.emissiveIntensity = night ? 1.1 : 0.22;
  }
  // ---- the stop sign: pole, H disc, name plate, timetable case (site frame: at x, y, the sign's face towards azimuth az) ----
  // draw(ctx, w, h): the printed timetable in the case (bus/bus.js paints the departures of this kerb)
  function sign(x, y, z, az, name, draw) {
    const k = VPROPS.kit(),
      a = ((90 - az) * Math.PI) / 180,
      fx = Math.cos(a),
      fy = Math.sin(a),
      rx = fy,
      ry = -fx;
    const GREY = col(0x8e9295),
      YELLOW = col(0xf3c300),
      GREEN = col(0x0f7a3c),
      WHITE = col(0xf2f2ef);
    k.cyl(x, y, z, z + 2.75, 0.035, 0.035, 8, GREY, true);
    // the disc on both faces, the H on both
    const cz = z + 2.42,
      rot = Math.atan2(ry, rx);
    for (const s of [1, -1]) {
      const ox = x + fx * 0.045 * s,
        oy = y + fy * 0.045 * s;
      k.disc(ox, oy, cz, fx * s, fy * s, 0.225, YELLOW, 20, false);
      const hx = ox + fx * 0.006 * s,
        hy = oy + fy * 0.006 * s;
      for (const [u, w, h] of [
        [-0.07, 0.034, 0.22],
        [0.07, 0.034, 0.22],
        [0, 0.14, 0.034],
      ])
        k.box(hx + rx * u, hy + ry * u, cz - h / 2, w, 0.008, h, rot, GREEN);
    }
    // the timetable case below the sign, facing the road
    k.box(x + fx * 0.07, y + fy * 0.07, z + 1.15, 0.44, 0.06, 0.58, rot, WHITE);
    k.box(x + fx * 0.101, y + fy * 0.101, z + 1.19, 0.38, 0.004, 0.48, rot, col(0xfdfdfb));
    const grp = new THREE.Group();
    const m = own(new THREE.Mesh(k.geo(), M.body), true);
    grp.add(m);
    // the printed timetable behind the glass of the case
    let tt = null;
    if (draw) {
      const cv2 = document.createElement('canvas');
      cv2.width = 256;
      cv2.height = 320;
      draw(cv2.getContext('2d'), 256, 320);
      const t2 = new THREE.CanvasTexture(cv2);
      t2.colorSpace = THREE.SRGBColorSpace;
      t2.anisotropy = 4;
      const m2 = M.dispMap.clone();
      m2.map = t2;
      const g2 = new THREE.PlaneGeometry(0.37, 0.462);
      const pm = own(new THREE.Mesh(g2, m2));
      pm.position.set(x + fx * 0.106, z + 1.43, -(y + fy * 0.106));
      pm.lookAt(x + fx * 2, z + 1.43, -(y + fy * 2));
      grp.add(pm);
      tt = { t2, m2, g2 };
    }
    // the name plate: a canvas
    const cv = document.createElement('canvas');
    cv.width = 512;
    cv.height = 96;
    const c = cv.getContext('2d');
    c.fillStyle = '#f4f4f1';
    c.fillRect(0, 0, 512, 96);
    c.fillStyle = '#0f7a3c';
    c.fillRect(0, 0, 512, 10);
    c.fillStyle = '#111';
    c.textAlign = 'center';
    c.textBaseline = 'middle';
    let fs = 44;
    c.font = 'bold ' + fs + 'px Arial, Helvetica, sans-serif';
    while (c.measureText(name).width > 490 && fs > 20) c.font = 'bold ' + (fs -= 2) + 'px Arial, Helvetica, sans-serif';
    c.fillText(name, 256, 54);
    const tex = new THREE.CanvasTexture(cv);
    tex.colorSpace = THREE.SRGBColorSpace;
    const dm = M.dispMap.clone();
    dm.map = tex;
    const pg = new THREE.PlaneGeometry(0.62, 0.12);
    for (const s of [1, -1]) {
      const p = own(new THREE.Mesh(pg, dm));
      p.position.set(x + fx * 0.04 * s, z + 2.1, -(y + fy * 0.04 * s));
      p.lookAt(x + fx * 2 * s, z + 2.1, -(y + fy * 2 * s));
      grp.add(p);
    }
    scene.add(grp);
    S.signs++;
    return {
      grp,
      dispose: () => {
        scene.remove(grp);
        m.geometry.dispose();
        pg.dispose();
        tex.dispose();
        dm.dispose();
        if (tt) {
          tt.t2.dispose();
          tt.m2.dispose();
          tt.g2.dispose();
        }
      },
    };
  }
  return { S, M, build, lamps, sign, geos, DIM: { L, W, H, FL, AF, AR, RW, DOOR_F, DOOR_M } };
})();
window.BUSMOD = BUSMOD;
