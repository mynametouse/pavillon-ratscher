// ===================== feat/haeuser: the look „heute“ of the village houses in the normal game (HHEUTE) =====================
// The normal game is today (2026). The zombie night's kit (zombie/z_innen*.js: ZIPLAN, ZIMOB, ZIEINR) builds every house of Ratscher from
// inside in three looks of the past; this module adds the looks of today as an extension of the kit (ZIEINR.looks – its marked hooks
// call room, mats, ceiling, furnish, deko, curtains, tv, leaf of the house's look):
//   'heute'      most houses: fitted kitchen, laminate and large tiles, a corner sofa, a flat TV on a lowboard, the router with its little
//                lights, a laptop or a tablet, LED ceiling lights, a children's room with a desk, a bathroom with a shower
//   'heute-90'   furnished after 1990 and kept (rustic oak, leather couch – the kit's 'nachwende'), with today's flat set and a router
//   'heute-ddr'  old people: the DDR living room and bedroom kept (wall unit, three-piece suite), the kitchen of the nineties, a new bath
// Everything is invented and generic (real houses of real people: no names, no photos of people). Plain colours go into the garden
// palette, textures are canvases drawn once (shared by all houses, their GPU copies freed with the kit's), the materials are twins of
// the kit's (the same shader programs): no new program. Nothing moves and nothing can be searched – the furniture is one or two meshes
// per material like the kit's.
import { plain, dimIndoor, ANISO } from '../core/assets.js';
import * as THREE from 'three';
import { KM, twin } from '../garden/garten_kit.js';
import { VILLAGE } from '../world/village.js';
import { ZIMOB } from '../zombie/z_innen_mob.js';
import { ZIEINR } from '../zombie/z_innen_einr.js';
export const HHEUTE = (() => {
  const { frame, L, DK, top, onWall } = ZIEINR;
  const S = { T: null };
  // ---- canvas textures (drawn at the first house, shared; ZIMOB.release frees their GPU copies with the kit's) ----
  let R0s = 4711;
  const R0 = () => (R0s = (R0s * 16807) % 2147483647) / 2147483647;
  function ctex(w, h, draw, srgb = true) {
    const c = document.createElement('canvas');
    c.width = w;
    c.height = h;
    draw(c.getContext('2d'), w, h);
    const t = new THREE.CanvasTexture(c);
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    t.colorSpace = srgb ? THREE.SRGBColorSpace : THREE.NoColorSpace;
    t.anisotropy = ANISO;
    ZIMOB.TEX.push(t);
    return t;
  }
  const scaled = (t, mx, my) => (t.repeat.set(1 / mx, 1 / my), t);
  const DRAW = {
    // wide planks of light oak (laminate or vinyl of today): 8 rows over the image, joints staggered
    laminat(q, w, h) {
      for (let r = 0; r < 8; r++) {
        let x = -R0() * w;
        while (x < w) {
          const L0 = w * (0.4 + R0() * 0.35),
            k = 0.92 + R0() * 0.14;
          q.fillStyle = `rgb(${Math.round(214 * k)},${Math.round(186 * k)},${Math.round(146 * k)})`;
          q.fillRect(x, (r * h) / 8, L0, h / 8);
          for (let s = 0; s < 9; s++) {
            q.fillStyle = `rgba(${R0() > 0.5 ? '150,110,70' : '240,225,200'},0.16)`;
            q.fillRect(x, (r * h) / 8 + R0() * (h / 8), L0, 1 + R0());
          }
          q.fillStyle = 'rgba(90,70,45,0.35)';
          q.fillRect(x, (r * h) / 8, 1, h / 8);
          x += L0;
        }
        q.fillStyle = 'rgba(90,70,45,0.28)';
        q.fillRect(0, (r * h) / 8, w, 1);
      }
    },
    // large floor tiles 60 × 60 (two by two over the image), light grey stone look, thin joints
    fliesen(q, w, h) {
      q.fillStyle = '#9c9b97';
      q.fillRect(0, 0, w, h);
      for (let j = 0; j < 2; j++)
        for (let i = 0; i < 2; i++) {
          const k = 0.94 + R0() * 0.08;
          q.fillStyle = `rgb(${Math.round(196 * k)},${Math.round(194 * k)},${Math.round(188 * k)})`;
          q.fillRect((i * w) / 2 + 1, (j * h) / 2 + 1, w / 2 - 2, h / 2 - 2);
          for (let n = 0; n < 160; n++) {
            q.fillStyle = `rgba(${R0() > 0.5 ? '255,255,255' : '90,90,85'},${R0() * 0.08})`;
            q.fillRect((i * w) / 2 + R0() * (w / 2), (j * h) / 2 + R0() * (h / 2), 2 + R0() * 6, 1 + R0() * 3);
          }
        }
    },
    // wall tiles 30 × 60 laid across, white with light grey joints (the bath of today)
    badWand(q, w, h) {
      q.fillStyle = '#c9cac6';
      q.fillRect(0, 0, w, h);
      for (let j = 0; j < 4; j++)
        for (let i = 0; i < 2; i++) {
          const k = 0.97 + R0() * 0.03;
          q.fillStyle = `rgb(${Math.round(246 * k)},${Math.round(246 * k)},${Math.round(243 * k)})`;
          q.fillRect((i * w) / 2 + 1, (j * h) / 4 + 1, w / 2 - 2, h / 4 - 2);
        }
    },
    // floor tiles 30 × 60 of the bath: anthracite stone look
    badBoden(q, w, h) {
      q.fillStyle = '#2c2d2e';
      q.fillRect(0, 0, w, h);
      for (let j = 0; j < 4; j++)
        for (let i = 0; i < 2; i++) {
          const k = 0.9 + R0() * 0.16;
          q.fillStyle = `rgb(${Math.round(78 * k)},${Math.round(78 * k)},${Math.round(76 * k)})`;
          q.fillRect((i * w) / 2 + 1, (j * h) / 4 + 1, w / 2 - 2, h / 4 - 2);
          for (let n = 0; n < 60; n++) {
            q.fillStyle = `rgba(200,200,195,${R0() * 0.06})`;
            q.fillRect((i * w) / 2 + R0() * (w / 2), (j * h) / 4 + R0() * (h / 4), 2 + R0() * 4, 1);
          }
        }
    },
    // a rug of today: off-white with a grey lattice (Berber look), tiling
    teppich(q, w, h) {
      q.fillStyle = '#e4dfd4';
      q.fillRect(0, 0, w, h);
      for (let i = 0; i < 3000; i++) {
        q.fillStyle = `rgba(${R0() > 0.5 ? '255,255,250' : '150,140,125'},${0.08 + R0() * 0.1})`;
        q.fillRect(R0() * w, R0() * h, 1 + R0() * 2, 1 + R0() * 2);
      }
      q.strokeStyle = 'rgba(70,68,64,0.55)';
      q.lineWidth = 3;
      for (let k = -4; k <= 4; k++) {
        q.beginPath();
        q.moveTo((k * w) / 4, 0);
        q.lineTo((k * w) / 4 + w / 2, h / 2);
        q.lineTo((k * w) / 4, h);
        q.stroke();
      }
    },
    // the children's rug: coloured circles on light blue, tiling
    kinder(q, w, h) {
      q.fillStyle = '#bcd6e2';
      q.fillRect(0, 0, w, h);
      const C = ['#f2c14e', '#ef8a62', '#7fc29b', '#f7f4ea', '#6f9ccf'];
      for (let j = 0; j < 4; j++)
        for (let i = 0; i < 4; i++) {
          q.fillStyle = C[(i + j * 2) % C.length];
          q.beginPath();
          q.arc((i + 0.5) * (w / 4) + (j % 2 ? w / 8 : 0), (j + 0.5) * (h / 4), w / 13, 0, 6.3);
          q.fill();
        }
    },
    // four prints of today in one image: abstract arcs, mountain lines at dusk, a botanical leaf, a rocket for the children's room
    art(q, w) {
      const S2 = w / 2;
      {
        q.fillStyle = '#efe9df';
        q.fillRect(0, 0, S2, S2);
        q.fillStyle = '#c86e4b';
        q.beginPath();
        q.arc(S2 * 0.38, S2 * 0.6, S2 * 0.26, 0, 6.3);
        q.fill();
        q.fillStyle = '#2f4858';
        q.fillRect(S2 * 0.55, S2 * 0.18, S2 * 0.2, S2 * 0.62);
        q.strokeStyle = '#d9a441';
        q.lineWidth = 10;
        q.beginPath();
        q.arc(S2 * 0.62, S2 * 0.36, S2 * 0.2, Math.PI, 2 * Math.PI);
        q.stroke();
      }
      {
        const g = q.createLinearGradient(0, 0, 0, S2);
        g.addColorStop(0, '#f4d9b8');
        g.addColorStop(1, '#e6b98e');
        q.fillStyle = g;
        q.fillRect(S2, 0, S2, S2);
        for (const [y, c] of [
          [S2 * 0.55, '#a7b4b8'],
          [S2 * 0.68, '#71858d'],
          [S2 * 0.82, '#3e5059'],
        ]) {
          q.fillStyle = c;
          q.beginPath();
          q.moveTo(S2, S2);
          for (let x = 0; x <= S2; x += 6)
            q.lineTo(S2 + x, y + Math.sin(x * 0.025 + y) * 18 - Math.abs(Math.sin(x * 0.011)) * 22);
          q.lineTo(2 * S2, S2);
          q.fill();
        }
        q.fillStyle = '#fff4e0';
        q.beginPath();
        q.arc(S2 * 1.7, S2 * 0.3, S2 * 0.08, 0, 6.3);
        q.fill();
      }
      {
        q.fillStyle = '#f3f1ea';
        q.fillRect(0, S2, S2, S2);
        q.strokeStyle = '#3f6a4a';
        q.fillStyle = '#4f7d57';
        q.lineWidth = 4;
        q.beginPath();
        q.moveTo(S2 * 0.5, S2 * 1.9);
        q.quadraticCurveTo(S2 * 0.45, S2 * 1.5, S2 * 0.5, S2 * 1.12);
        q.stroke();
        for (let i = 0; i < 6; i++) {
          const y = S2 * (1.2 + i * 0.11),
            l = S2 * (0.28 - i * 0.025);
          for (const sx of [-1, 1]) {
            q.beginPath();
            q.ellipse(S2 * 0.5 + (sx * l) / 2, y, l / 2, l / 7, sx * -0.5, 0, 6.3);
            q.fill();
          }
        }
      }
      {
        q.fillStyle = '#1f2f4f';
        q.fillRect(S2, S2, S2, S2);
        q.fillStyle = '#f7f4ea';
        for (let i = 0; i < 40; i++) q.fillRect(S2 + R0() * S2, S2 + R0() * S2, 2, 2);
        q.fillStyle = '#f2c14e';
        q.beginPath();
        q.arc(S2 * 1.25, S2 * 1.25, S2 * 0.09, 0, 6.3);
        q.fill();
        // the rocket
        q.fillStyle = '#e8e4da';
        q.beginPath();
        q.moveTo(S2 * 1.62, S2 * 1.18);
        q.quadraticCurveTo(S2 * 1.72, S2 * 1.4, S2 * 1.68, S2 * 1.72);
        q.lineTo(S2 * 1.56, S2 * 1.72);
        q.quadraticCurveTo(S2 * 1.52, S2 * 1.4, S2 * 1.62, S2 * 1.18);
        q.fill();
        q.fillStyle = '#ef6a4c';
        q.fillRect(S2 * 1.5, S2 * 1.62, S2 * 0.24, S2 * 0.06);
        q.fillStyle = '#6f9ccf';
        q.beginPath();
        q.arc(S2 * 1.62, S2 * 1.4, S2 * 0.035, 0, 6.3);
        q.fill();
        q.fillStyle = '#f2a541';
        q.beginPath();
        q.moveTo(S2 * 1.57, S2 * 1.73);
        q.lineTo(S2 * 1.62, S2 * 1.88);
        q.lineTo(S2 * 1.67, S2 * 1.73);
        q.fill();
      }
    },
  };
  // ---- materials (made at the first house of today; the kit's programs: twins and the same constructors) ----
  const WARM = new THREE.Color(1.0, 0.8, 0.58);
  function mats() {
    if (S.T) return S.T;
    const M = ZIMOB.mats(),
      T = {},
      tx = (name, w, mx, my) => scaled(ctex(w, w, DRAW[name]), mx, my),
      room = (t, rough = 0.85) => dimIndoor(plain({ map: t, roughness: rough }), 0.75, 0.4);
    T.laminat = room(tx('laminat', 256, 2.4, 1.6), 0.5);
    T.fliesen = room(tx('fliesen', 256, 1.2, 1.2), 0.35);
    T.badWand = room(tx('badWand', 256, 1.2, 1.2), 0.2);
    T.badBoden = room(tx('badBoden', 256, 1.2, 1.2), 0.4);
    // walls: white mostly, now and then a quiet colour (twins of the garden's wall: one program)
    T.wand = {
      weiss: M.putz,
      salbei: twin(KM.wall, { color: 0xd3dccb }),
      greige: twin(KM.wall, { color: 0xe4dccf }),
      blau: twin(KM.wall, { color: 0xd2dde4 }),
      grau: twin(KM.wall, { color: 0xdedfdc }),
      rosa: twin(KM.wall, { color: 0xf0dcd6 }),
      mint: twin(KM.wall, { color: 0xd4e9df }),
    };
    // wood of today: light oak and walnut veneer (the kit's veneer image, its program)
    T.eiche = plain({ map: M.furnier.map, color: 0xe2c49a, roughness: 0.5 });
    T.nuss = plain({ map: M.furnier.map, color: 0x8f6a4c, roughness: 0.5 });
    T.art = plain({ map: ctex(512, 512, DRAW.art), roughness: 0.7 });
    T.teppich = plain({ map: tx('teppich', 256, 0.9, 0.9), roughness: 0.98 });
    T.kinder = plain({ map: tx('kinder', 256, 1.4, 1.4), roughness: 0.98 });
    // the devices' little lights (router, TV standby): the program of the lamp shades (ZIMOB.glowMat), always on
    T.led = ZIMOB.glowMat(0xbff5c8);
    T.led.emissive.set(0x5cff86);
    T.led.emissiveIntensity = 1.6;
    // the TV's screen: dark glass; on, a cool glow (haeuser/haeuser.js switches it) – one for all houses (one is mounted at a time)
    T.screen = ZIMOB.glowMat(0x101216);
    T.screen.roughness = 0.25;
    T.screen.emissive.set(0x8fb4e6);
    T.screen.emissiveIntensity = 0;
    // the daylight thrown back inside (zombie/z_innen_mob.js daylight): ours take part
    const own = [
      [T.laminat, 0.06],
      [T.fliesen, 0.05],
      [T.badWand, 0.07],
      [T.badBoden, 0.04],
      [T.eiche, 0.05],
      [T.nuss, 0.04],
      [T.art, 0.04],
      [T.teppich, 0.05],
      [T.kinder, 0.05],
      ...Object.values(T.wand)
        .filter(m => m !== M.putz)
        .map(m => [m, 0.1]),
    ];
    const k = 1 - Math.min(1, Math.max(0, VILLAGE.night ? VILLAGE.night() : 0));
    for (const [m, f] of own) {
      m.emissive
        .copy(m.color)
        .multiply(WARM)
        .multiplyScalar(f * k);
      M.bounce.push([m, f]);
    }
    S.T = T;
    return T;
  }
  // ---- small helpers ----
  const col = (C, hex, rough = 0.6, metal = 0) => C.col(hex, rough, metal);
  const WHITE = 0xf2f2ef,
    BLACK = 0x1d1e20,
    STEEL = 0xbfc3c6;
  // the facing of an item frame as a compass of the house frame: its along (a) and into-the-room (n) axes
  const ang = (F, face) => {
    const d = [F.a[0] * Math.cos(face) + F.n[0] * Math.sin(face), F.a[1] * Math.cos(face) + F.n[1] * Math.sin(face)];
    return { d, a: Math.atan2(d[1], d[0]) };
  };
  // a triangle turned to face n (the mesher keeps the order it is given)
  function ftri(m, mat, a, b, c, n) {
    const e1 = [b[0] - a[0], b[1] - a[1], b[2] - a[2]],
      e2 = [c[0] - a[0], c[1] - a[1], c[2] - a[2]],
      d =
        (e1[1] * e2[2] - e1[2] * e2[1]) * n[0] +
        (e1[2] * e2[0] - e1[0] * e2[2]) * n[1] +
        (e1[0] * e2[1] - e1[1] * e2[0]) * n[2];
    if (d >= 0) m.tri(mat, a, b, c, n);
    else m.tri(mat, a, c, b, n);
  }
  // a disc standing in the plane of a frame's wall (along a, up z), facing n, at (u, v, z), radius r
  function disc(m, mat, F, u, v, z, r, seg = 16) {
    const c = F.P(u, v, z),
      n = [F.n[0], F.n[1], 0];
    for (let k = 0; k < seg; k++) {
      const t0 = (k / seg) * Math.PI * 2,
        t1 = ((k + 1) / seg) * Math.PI * 2;
      ftri(
        m,
        mat,
        c,
        F.P(u + Math.cos(t0) * r, v, z + Math.sin(t0) * r),
        F.P(u + Math.cos(t1) * r, v, z + Math.sin(t1) * r),
        n
      );
    }
  }
  // a leaf: a flat diamond from p along d (house frame, unit), w wide, seen from both sides
  function leaf(m, mat, p, d, len, w, lift = 0.25) {
    const q = [p[0] + d[0] * len, p[1] + d[1] * len, p[2] + len * lift],
      mid = [p[0] + d[0] * len * 0.5, p[1] + d[1] * len * 0.5, p[2] + len * lift * 0.6],
      s = [-d[1] * w * 0.5, d[0] * w * 0.5],
      a = [mid[0] + s[0], mid[1] + s[1], mid[2] + 0.02],
      b = [mid[0] - s[0], mid[1] - s[1], mid[2] + 0.02];
    for (const up of [1, -1]) {
      ftri(m, mat, p, a, q, [0, 0, up]);
      ftri(m, mat, p, q, b, [0, 0, up]);
    }
  }
  // a pot plant of today standing on the floor (a Monstera, a fig, a strelitzia): pot, stems, leaves
  function bigPlant(C, x, y, z, h = 1.2) {
    const m = C.m,
      R = C.R,
      pot = col(C, R.pick([0xf0eeea, 0x5a5d60, 0xc9b9a2, 0xb4653f]), 0.7),
      green = [col(C, 0x3f6b3a, 0.7), col(C, 0x557f45, 0.7), col(C, 0x2f5530, 0.7)];
    m.lathe(
      pot,
      x,
      y,
      [
        [0.13, z],
        [0.17, z + 0.32],
        [0.18, z + 0.34],
      ],
      12,
      { caps: true }
    );
    m.cyl(col(C, 0x3a2a1e, 0.95), x, y, z + 0.3, z + 0.31, 0.165, 0.165, 10);
    const n = 9;
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2 + R.r(-0.3, 0.3),
        r = R.r(0.12, 0.34),
        zt = z + 0.32 + h * R.r(0.45, 0.95),
        tip = [x + Math.cos(a) * r, y + Math.sin(a) * r, zt];
      m.rod(green[2], [x + Math.cos(a) * 0.03, y + Math.sin(a) * 0.03, z + 0.32], tip, 0.008, 3);
      leaf(m, green[i % 2], tip, [Math.cos(a), Math.sin(a)], R.r(0.22, 0.34), R.r(0.18, 0.26), R.r(-0.2, 0.3));
    }
  }
  // a small plant in a pot on a top (a succulent, a herb)
  function smallPlant(C, x, y, z) {
    const m = C.m,
      R = C.R;
    m.cyl(col(C, R.pick([0xf0eeea, 0x5a5d60, 0xb4653f, 0xd8cbb5]), 0.7), x, y, z, z + 0.09, 0.045, 0.055, 9);
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2 + R.r(0, 0.5);
      leaf(m, col(C, R.pick([0x4f7d57, 0x6a9a5a]), 0.7), [x, y, z + 0.08], [Math.cos(a), Math.sin(a)], 0.09, 0.05, 0.9);
    }
  }
  // which print: one of the wished cells not yet hung in this room (else any not yet hung, else the first wish)
  function artCell(C, wish) {
    const used = C.arts || (C.arts = new Set()),
      free = wish.filter(c => !used.has(c)),
      any = [0, 1, 2].filter(c => !used.has(c)),
      c = free.length ? C.R.pick(free) : any.length ? C.R.pick(any) : wish[0];
    used.add(c);
    return c;
  }
  // an art print with a thin frame on the wall (cell of the four prints), registered so others keep off it
  function print(C, F, u, z, w, h, cell, frameHex) {
    const m = C.m,
      T = mats();
    F.box(
      m,
      col(C, frameHex, 0.5),
      u - w / 2 - 0.025,
      u + w / 2 + 0.025,
      0,
      0.022,
      z - h / 2 - 0.025,
      z + h / 2 + 0.025
    );
    F.box(
      m,
      col(C, 0xf6f4ee, 0.8),
      u - w / 2 - 0.004,
      u + w / 2 + 0.004,
      0.021,
      0.023,
      z - h / 2 - 0.004,
      z + h / 2 + 0.004
    );
    F.pic(m, T.art, u, 0.024, z, w - 0.06, h - 0.06, cell);
    onWall(C, F, u - w / 2 - 0.04, u + w / 2 + 0.04, z - h / 2 - 0.04, z + h / 2 + 0.04);
  }
  // the stairs a hall's walls run along (nothing is hung over the steps): the main one in every hall, the attic one in its own
  const overlap = (a, b) => a[0] < b[1] && a[1] > b[0] && a[2] < b[3] && a[3] > b[2];
  function stairsOf(C) {
    const P = C.P,
      r = C.room,
      out = [];
    if (!P || !r || r.kind !== 'flur') return out;
    for (const st of [P.stair, P.astair && P.astair.fl === r.fl ? P.astair : null])
      if (st)
        out.push([
          Math.min(st.x0, st.x1) - 0.15,
          Math.max(st.x0, st.x1) + 0.15,
          Math.min(st.y0, st.y1) - 0.3,
          Math.max(st.y0, st.y1) + 0.3,
        ]);
    return out;
  }
  // a free place on any wall for a thing hung there (pictures, a mirror, a clock): the first that fits
  function hang(C, Pl, sidesList, w, h, zc, fn) {
    const R = C.R,
      stairs = stairsOf(C);
    for (const sd of R.shuffle(sidesList.slice())) {
      const W = Pl.S[sd];
      if (!W) continue;
      const Fw = frame(W.O, W.a, W.n);
      for (const f of R.shuffle([0.25, 0.4, 0.5, 0.6, 0.75])) {
        const u = W.L * f,
          u0 = u - w / 2 - 0.1,
          u1 = u + w / 2 + 0.1;
        if (u0 < 0.15 || u1 > W.L - 0.15) continue;
        if (!Pl.wallFree(sd, u0, u1, zc - h / 2, zc + h / 2) || Pl.tallAt(sd, u0, u1)) continue;
        const rs = Fw.rect(u0, u1, -0.02, 0.5);
        if (stairs.some(s => overlap(rs, s))) continue;
        const rr = Fw.rect(u0, u1, -0.02, 0.15);
        if (
          (C.wallItems || []).some(
            q =>
              q.z0 < zc + h / 2 + 0.1 &&
              q.z1 > zc - h / 2 - 0.1 &&
              rr[0] < q.r[1] &&
              rr[1] > q.r[0] &&
              rr[2] < q.r[3] &&
              rr[3] > q.r[2]
          )
        )
          continue;
        fn(Fw, u, sd);
        return true;
      }
    }
    return false;
  }
  // ---- devices ----
  // the router: standing, white, its little lights on the front (they glow day and night)
  function router(C, F, u, v, z) {
    const T = mats();
    F.box(C.m, col(C, 0xf4f4f2, 0.4), u - 0.09, u + 0.09, v, v + 0.05, z, z + 0.2);
    F.box(C.m, col(C, 0xd8d8d4, 0.5), u - 0.07, u + 0.07, v + 0.01, v + 0.04, z, z + 0.012);
    for (let i = 0; i < 4; i++)
      F.box(C.m, T.led, u - 0.055 + i * 0.03, u - 0.041 + i * 0.03, v + 0.05, v + 0.055, z + 0.15, z + 0.162);
    // its cable down behind
    F.box(C.m, col(C, 0x2a2a2a, 0.6), u + 0.05, u + 0.058, v + 0.015, v + 0.023, z - 0.4, z + 0.02);
  }
  // a flat TV on its foot (centre u, front at v, bottom z): w wide, the screen material switched by haeuser/haeuser.js
  function flatTV(C, F, u, v, z, w) {
    const T = mats(),
      h = w * 0.58,
      m = C.m;
    F.box(m, col(C, 0x26272a, 0.35, 0.4), u - 0.16, u + 0.16, v - 0.08, v + 0.1, z, z + 0.012);
    F.box(m, col(C, 0x26272a, 0.35, 0.4), u - 0.03, u + 0.03, v - 0.02, v + 0.01, z, z + 0.1);
    F.box(m, col(C, 0x111214, 0.3), u - w / 2, u + w / 2, v - 0.035, v, z + 0.07, z + 0.07 + h);
    F.box(m, T.screen, u - w / 2 + 0.012, u + w / 2 - 0.012, v, v + 0.003, z + 0.082, z + 0.058 + h);
    F.box(m, T.led, u + w / 2 - 0.05, u + w / 2 - 0.045, v, v + 0.004, z + 0.075, z + 0.079);
    return h;
  }
  // a laptop (open) or a tablet lying on a top at (u, v), facing −v (towards the one using it at the front)
  function laptop(C, F, u, v, z, open = true) {
    const m = C.m;
    F.box(m, col(C, 0xb8bcc0, 0.35, 0.6), u - 0.17, u + 0.17, v - 0.12, v + 0.11, z, z + 0.015);
    F.box(m, col(C, 0x2a2b2e, 0.5), u - 0.15, u + 0.15, v - 0.09, v + 0.03, z + 0.015, z + 0.017);
    if (open) {
      F.box(m, col(C, 0xb8bcc0, 0.35, 0.6), u - 0.17, u + 0.17, v + 0.11, v + 0.125, z + 0.01, z + 0.23);
      F.box(m, col(C, 0x1c2a3c, 0.2), u - 0.15, u + 0.15, v + 0.105, v + 0.11, z + 0.03, z + 0.215);
    }
  }
  function tablet(C, F, u, v, z) {
    F.box(C.m, col(C, 0x1c1d1f, 0.3), u - 0.12, u + 0.12, v - 0.085, v + 0.085, z, z + 0.008);
    F.box(C.m, col(C, 0x22344a, 0.15), u - 0.11, u + 0.11, v - 0.075, v + 0.075, z + 0.008, z + 0.009);
  }
  const phone = (C, F, u, v, z) =>
    F.box(C.m, col(C, 0x1c1d1f, 0.3), u - 0.04, u + 0.04, v - 0.075, v + 0.075, z, z + 0.009);
  // ---- seats ----
  // a modern chair (shell or upholstered) at (u, v) of frame F, the one on it looking towards `face` (0 = +a, π/2 = +n)
  function chair(C, F, u, v, face, seatHex, legHex = BLACK) {
    const m = C.m,
      z = C.z,
      { d, a } = ang(F, face),
      p = F.P(u, v, 0),
      seat = col(C, seatHex, 0.6),
      leg = col(C, legHex, 0.5, legHex === BLACK ? 0.3 : 0);
    m.box(seat, p[0] - 0.22, p[0] + 0.22, p[1] - 0.22, p[1] + 0.22, z + 0.44, z + 0.48, { a });
    const bx = p[0] - d[0] * 0.21,
      by = p[1] - d[1] * 0.21;
    m.box(seat, bx - 0.02, bx + 0.02, by - 0.21, by + 0.21, z + 0.5, z + 0.86, { a });
    const s = [-d[1], d[0]];
    for (const [f, l] of [
      [0.17, 0.17],
      [0.17, -0.17],
      [-0.17, 0.17],
      [-0.17, -0.17],
    ])
      m.cyl(leg, p[0] + d[0] * f + s[0] * l, p[1] + d[1] * f + s[1] * l, z, z + 0.44, 0.013, 0.011, 5);
  }
  // an office or desk chair: five feet, a column, seat and back
  function swivel(C, F, u, v, face, hex) {
    const m = C.m,
      z = C.z,
      { d, a } = ang(F, face),
      p = F.P(u, v, 0),
      c = col(C, hex, 0.8),
      blk = col(C, 0x26272a, 0.5, 0.3);
    for (let i = 0; i < 5; i++) {
      const t = (i / 5) * Math.PI * 2;
      m.rod(blk, [p[0], p[1], z + 0.07], [p[0] + Math.cos(t) * 0.3, p[1] + Math.sin(t) * 0.3, z + 0.04], 0.014, 4);
    }
    m.cyl(blk, p[0], p[1], z + 0.06, z + 0.42, 0.025, 0.025, 6);
    m.box(c, p[0] - 0.24, p[0] + 0.24, p[1] - 0.23, p[1] + 0.23, z + 0.42, z + 0.5, { a });
    const bx = p[0] - d[0] * 0.24,
      by = p[1] - d[1] * 0.24;
    m.box(c, bx - 0.03, bx + 0.03, by - 0.22, by + 0.22, z + 0.56, z + 1.05, { a });
    m.rod(blk, [p[0] - d[0] * 0.12, p[1] - d[1] * 0.12, z + 0.46], [bx, by, z + 0.62], 0.012, 4);
  }
  // ---- the living room ----
  // the corner sofa: the long part with its back at the wall (u0 … u0 + w), the chaise at one end reaching into the room
  function sofa(C, F, w, chaiseEnd, R) {
    const m = C.m,
      z = C.z,
      u0 = F.u0,
      u1 = u0 + w,
      fab = col(C, R.pick([0x8b8e91, 0x55585c, 0xc3b6a0, 0x51647a, 0x667a64, 0xa9a39a]), 0.92),
      dark = col(C, 0x2a2a2a, 0.6),
      D = 0.95,
      CL = 1.62,
      cu0 = chaiseEnd === 1 ? u1 - 0.95 : u0,
      cu1 = chaiseEnd === 1 ? u1 : u0 + 0.95;
    // feet, base, the seat cushions
    for (const [pu, pv] of [
      [u0 + 0.08, 0.08],
      [u1 - 0.1, 0.08],
      [u0 + 0.08, D - 0.12],
      [u1 - 0.1, D - 0.12],
    ])
      F.box(m, dark, pu, pu + 0.04, pv, pv + 0.04, z, z + 0.1);
    F.box(m, fab, u0, u1, 0, D, z + 0.1, z + 0.38);
    const arm = 0.2,
      a0 = chaiseEnd === 1 ? u0 + arm : u0,
      a1 = chaiseEnd === 1 ? u1 : u1 - arm;
    const nS = Math.max(2, Math.round((a1 - a0) / 0.75));
    for (let k = 0; k < nS; k++) {
      const s0 = a0 + ((a1 - a0) * k) / nS + 0.006,
        s1 = a0 + ((a1 - a0) * (k + 1)) / nS - 0.006;
      F.box(m, fab, s0, s1, 0.22, D - 0.01, z + 0.38, z + 0.47);
    }
    // the back and its cushions, the arm at the end without the chaise
    F.box(m, fab, u0, u1, 0, 0.22, z + 0.38, z + 0.78);
    for (let k = 0; k < nS; k++) {
      const s0 = a0 + ((a1 - a0) * k) / nS + 0.01,
        s1 = a0 + ((a1 - a0) * (k + 1)) / nS - 0.01;
      F.box(m, fab, s0, s1, 0.2, 0.36, z + 0.47, z + 0.82);
    }
    if (chaiseEnd === 1) F.box(m, fab, u0, u0 + arm, 0, D, z + 0.38, z + 0.62);
    else F.box(m, fab, u1 - arm, u1, 0, D, z + 0.38, z + 0.62);
    // the chaise
    F.box(m, fab, cu0, cu1, D, CL, z + 0.1, z + 0.38);
    F.box(m, fab, cu0 + 0.006, cu1 - 0.006, D - 0.01, CL - 0.01, z + 0.38, z + 0.47);
    for (const pu of [cu0 + 0.08, cu1 - 0.12]) F.box(m, dark, pu, pu + 0.04, CL - 0.12, CL - 0.08, z, z + 0.1);
    // throw cushions in an accent colour, a blanket over the arm
    const acc = col(C, R.pick([0xc0952f, 0xb0563a, 0x2f4858, 0xe8e2d4, 0x6e8b74, 0xa34d5a]), 0.95),
      acc2 = col(C, R.pick([0xe8e2d4, 0x3b3e42, 0xc9b38f]), 0.95);
    const cs = [a0 + 0.3, a0 + 0.62, a1 - 0.6, a1 - 0.3];
    cs.forEach((cu, i) => F.box(m, i % 2 ? acc2 : acc, cu - 0.2, cu + 0.2, 0.3, 0.44, z + 0.47, z + 0.86));
    const bu = chaiseEnd === 1 ? u0 : u1 - arm;
    F.box(m, acc2, bu - 0.01, bu + arm + 0.01, 0.25, 0.7, z + 0.62, z + 0.66);
    F.box(
      m,
      acc2,
      chaiseEnd === 1 ? bu - 0.02 : bu + arm,
      chaiseEnd === 1 ? bu : bu + arm + 0.02,
      0.25,
      0.7,
      z + 0.3,
      z + 0.66
    );
    C.solid(F.rect(u0, u1, 0, D), z, z + 0.82);
    C.solid(F.rect(cu0, cu1, D, CL), z, z + 0.47);
    // two seats: in the middle of the long part, and lying on the chaise
    const mid = (a0 + (chaiseEnd === 1 ? cu0 : cu1)) / 2;
    C.seat(F.P((a0 + a1) / 2 + (chaiseEnd === 1 ? -0.35 : 0.35), 0.5, z), F, 'Aufs Sofa setzen');
    C.spot('bett', F.P((cu0 + cu1) / 2, CL - 0.45, z), F, 'Aufs Sofa legen', {
      lie: true,
      head: F.P((cu0 + cu1) / 2, 0.35, z + 0.6),
      eye: 0.62,
    });
    return { u0, u1, cu0, cu1, D, CL, mid };
  }
  // the low table before the sofa: oak or white top on black legs, round or long
  function couchtisch(C, F, u0, u1, v0, v1, R) {
    const m = C.m,
      z = C.z,
      T = mats(),
      topM = R.pick([T.eiche, col(C, WHITE, 0.4), T.nuss]),
      leg = col(C, BLACK, 0.5, 0.3);
    if (R.chance(0.4)) {
      const cu = (u0 + u1) / 2,
        cv = (v0 + v1) / 2,
        r = Math.min(u1 - u0, v1 - v0) / 2;
      F.cyl(m, topM, cu, cv, z + 0.38, z + 0.42, r, r, 20);
      F.cyl(m, leg, cu, cv, z, z + 0.38, 0.03, 0.03, 6);
      F.cyl(m, leg, cu, cv, z, z + 0.02, r * 0.5, r * 0.5, 12);
      C.solid(F.rect(cu - r, cu + r, cv - r, cv + r), z, z + 0.42);
      top(C, F, cu - r * 0.6, cu + r * 0.6, cv, z + 0.42, 'couch');
      return;
    }
    F.box(m, topM, u0, u1, v0, v1, z + 0.38, z + 0.42);
    for (const [pu, pv] of [
      [u0 + 0.04, v0 + 0.04],
      [u1 - 0.07, v0 + 0.04],
      [u0 + 0.04, v1 - 0.07],
      [u1 - 0.07, v1 - 0.07],
    ])
      F.box(m, leg, pu, pu + 0.03, pv, pv + 0.03, z, z + 0.38);
    F.box(m, topM, u0 + 0.06, u1 - 0.06, v0 + 0.06, v1 - 0.06, z + 0.12, z + 0.14);
    C.solid(F.rect(u0, u1, v0, v1), z, z + 0.42);
    top(C, F, u0 + 0.1, u1 - 0.1, (v0 + v1) / 2, z + 0.42, 'couch');
  }
  // the TV wall: a lowboard with the flat set, the router, a sound bar; the place to watch from
  function tvWand(C, F, w, R) {
    const m = C.m,
      z = C.z,
      u0 = F.u0,
      T = mats(),
      body = R.pick([col(C, WHITE, 0.35), col(C, 0x3b3e42, 0.45), T.eiche]),
      topM = R.chance(0.5) ? T.eiche : body,
      d = 0.42;
    F.box(m, col(C, BLACK, 0.5, 0.3), u0 + 0.06, u0 + w - 0.06, 0.04, d - 0.06, z, z + 0.1);
    F.box(m, body, u0, u0 + w, 0, d, z + 0.1, z + 0.46);
    F.box(m, topM, u0 - 0.005, u0 + w + 0.005, 0, d + 0.005, z + 0.46, z + 0.49);
    const n = Math.max(2, Math.round(w / 0.6));
    for (let k = 0; k < n; k++)
      F.box(m, body, u0 + (w * k) / n + 0.004, u0 + (w * (k + 1)) / n - 0.004, d, d + 0.012, z + 0.11, z + 0.455);
    const tw = Math.min(1.25, w - 0.5);
    flatTV(C, F, u0 + w / 2, 0.22, z + 0.49, tw);
    F.box(m, col(C, 0x232427, 0.5), u0 + w / 2 - 0.45, u0 + w / 2 + 0.45, 0.26, 0.36, z + 0.49, z + 0.56);
    router(C, F, u0 + w - 0.16, 0.1, z + 0.49);
    C.spot('tv', F.P(u0 + w / 2, 2.4, z), F, null);
    C.solid(F.rect(u0, u0 + w, 0, d + 0.02), z, z + 0.49);
    top(C, F, u0 + 0.06, u0 + w / 2 - tw / 2 - 0.05, 0.22, z + 0.49, 'low');
  }
  // a shelf of cubes (white, 2 or 4 wide) with books, boxes and things
  function regal(C, F, cols, rows, R, kids = false) {
    const m = C.m,
      z = C.z,
      u0 = F.u0,
      cw = 0.37,
      w = cols * cw + 0.04,
      h = rows * cw + 0.04,
      d = 0.39,
      wh = col(C, WHITE, 0.45);
    for (let i = 0; i <= cols; i++) F.box(m, wh, u0 + i * cw, u0 + i * cw + 0.04, 0, d, z, z + h);
    for (let j = 0; j <= rows; j++) F.box(m, wh, u0, u0 + w, 0, d, z + j * cw, z + j * cw + 0.04);
    F.box(m, col(C, 0xe6e6e2, 0.6), u0, u0 + w, 0, 0.01, z, z + h);
    const boxes = kids ? [0xef8a62, 0x6f9ccf, 0xf2c14e, 0x7fc29b] : [0xb9b1a3, 0x5a5d60, 0xd8cbb5, 0x8a9a8a];
    for (let j = 0; j < rows; j++)
      for (let i = 0; i < cols; i++) {
        const a = u0 + i * cw + 0.04,
          b = a + cw - 0.04,
          zz = z + j * cw + 0.04,
          k = R();
        if (k < 0.3) F.box(m, col(C, R.pick(boxes), 0.9), a + 0.02, b - 0.02, 0.04, d - 0.02, zz, zz + cw - 0.08);
        else if (k < 0.65) L.books(C, F, a + 0.01, b - 0.08, 0.05, zz, cw - 0.06);
        else if (k < 0.8) smallPlant(C, ...F.P((a + b) / 2, d / 2, 0).slice(0, 2), zz);
        else if (kids) toy(C, F, (a + b) / 2, d / 2, zz);
      }
    C.solid(F.rect(u0, u0 + w, 0, d), z, z + h);
    if (h < 1.0) top(C, F, u0 + 0.05, u0 + w - 0.05, d / 2, z + h, 'regal');
    return w;
  }
  // a toy: a teddy, a stack of bricks, a ball
  function toy(C, F, u, v, z) {
    const m = C.m,
      R = C.R,
      k = R();
    const p = F.P(u, v, 0);
    if (k < 0.4) {
      const fur = col(C, R.pick([0xa07850, 0xd8c8a8, 0x8a8a8a]), 0.95);
      m.lathe(
        fur,
        p[0],
        p[1],
        [
          [0.0, z],
          [0.07, z + 0.03],
          [0.08, z + 0.1],
          [0.05, z + 0.15],
          [0.0, z + 0.16],
        ],
        8
      );
      m.lathe(
        fur,
        p[0],
        p[1],
        [
          [0.0, z + 0.15],
          [0.055, z + 0.18],
          [0.05, z + 0.24],
          [0.0, z + 0.26],
        ],
        8
      );
    } else if (k < 0.75) {
      for (let i = 0; i < 4; i++)
        m.box(
          col(C, R.pick([0xd8352b, 0xf2c14e, 0x3a6aa0, 0x4f9a4a]), 0.5),
          p[0] - 0.05 + (i % 2) * 0.05,
          p[0] + (i % 2) * 0.05,
          p[1] - 0.03,
          p[1] + 0.03,
          z + i * 0.03,
          z + i * 0.03 + 0.03
        );
    } else
      m.lathe(
        col(C, R.pick([0xd8352b, 0x3a6aa0, 0xf2c14e]), 0.5),
        p[0],
        p[1],
        [
          [0.0, z],
          [0.07, z + 0.03],
          [0.09, z + 0.09],
          [0.07, z + 0.15],
          [0.0, z + 0.18],
        ],
        10
      );
  }
  // a floor lamp (reading light): base, pole, a drum shade – a lamp of the room
  function stehlampe(C, F, u, v) {
    const m = C.m,
      z = C.z;
    F.cyl(m, col(C, BLACK, 0.5, 0.3), u, v, z, z + 0.025, 0.15, 0.15, 12);
    F.cyl(m, col(C, 0x8a8c8e, 0.35, 0.8), u, v, z + 0.025, z + 1.42, 0.012, 0.012, 6);
    C.lamp(F.P(u, v, z + 1.5), 'shade', 0.2);
  }
  // a sideboard (a long low cupboard) with its fronts
  function sideboard(C, F, w, R) {
    const m = C.m,
      z = C.z,
      u0 = F.u0,
      T = mats(),
      body = R.pick([col(C, WHITE, 0.4), T.eiche, T.nuss, col(C, 0x6e7f72, 0.5)]),
      d = 0.45,
      h = 0.8;
    for (const pu of [u0 + 0.05, u0 + w - 0.08])
      for (const pv of [0.05, d - 0.08]) F.box(m, col(C, BLACK, 0.5, 0.3), pu, pu + 0.03, pv, pv + 0.03, z, z + 0.16);
    F.box(m, body, u0, u0 + w, 0, d, z + 0.16, z + h);
    const n = Math.max(2, Math.round(w / 0.5));
    for (let k = 0; k < n; k++) {
      const a = u0 + (w * k) / n + 0.004,
        b = u0 + (w * (k + 1)) / n - 0.004;
      F.box(m, body, a, b, d, d + 0.012, z + 0.18, z + h - 0.02);
      F.box(
        m,
        col(C, 0x8a8c8e, 0.35, 0.8),
        (a + b) / 2 - 0.06,
        (a + b) / 2 + 0.06,
        d + 0.012,
        d + 0.025,
        z + h - 0.1,
        z + h - 0.085
      );
    }
    C.solid(F.rect(u0, u0 + w, 0, d), z, z + h);
    top(C, F, u0 + 0.06, u0 + w - 0.06, d / 2, z + h, 'board');
  }
  // a place for the dining table in the middle of the room (or aside): the table and its chairs inside the rectangle kept for them
  function essplatz(C, Pl, R, lamp = true) {
    for (const [w, d] of [
      [1.6, 1.95],
      [1.95, 1.6],
      [1.25, 1.9],
      [1.9, 1.25],
    ]) {
      const rc = Pl.mid(w, d);
      if (rc) {
        esstisch(C, rc, R, lamp);
        return true;
      }
    }
    return false;
  }
  // the dining table of today: oak top on black or white legs, chairs on both long sides; the pendant above it. The rectangle r holds
  // table and chairs: the chairs stand on its long sides (0.52 m from the table's edge to the chair's back)
  function esstisch(C, r, R, lamp = true) {
    const T = mats(),
      z = C.z,
      Fq = frame([r[0], r[2]], [1, 0], [0, 1]),
      w = r[1] - r[0],
      d = r[3] - r[2],
      along = d >= w, // chairs on the v sides: the table long along u
      tw = along ? w - 0.1 : w - 1.1,
      td = along ? d - 1.1 : d - 0.1,
      u0 = (w - tw) / 2,
      v0 = (d - td) / 2,
      legHex = R.pick([BLACK, WHITE]),
      seatHex = R.pick([0xf2f0ea, 0x3b3e42, 0xc9b38f, 0x8b8e91, 0x6e8b74]);
    const topM = R.pick([T.eiche, T.eiche, T.nuss, col(C, WHITE, 0.4)]);
    Fq.box(C.m, topM, u0, u0 + tw, v0, v0 + td, z + 0.72, z + 0.76);
    for (const [pu, pv] of [
      [u0 + 0.06, v0 + 0.06],
      [u0 + tw - 0.1, v0 + 0.06],
      [u0 + 0.06, v0 + td - 0.1],
      [u0 + tw - 0.1, v0 + td - 0.1],
    ])
      Fq.box(C.m, col(C, legHex, 0.5, legHex === BLACK ? 0.3 : 0), pu, pu + 0.04, pv, pv + 0.04, z, z + 0.72);
    if (along) {
      for (const k of tw > 1.2 ? [0.27, 0.73] : [0.5]) {
        chair(C, Fq, u0 + tw * k, v0 - 0.3, Math.PI / 2, seatHex, legHex);
        chair(C, Fq, u0 + tw * k, v0 + td + 0.3, -Math.PI / 2, seatHex, legHex);
      }
      C.spot(
        'tisch',
        Fq.P(u0 + tw * (tw > 1.2 ? 0.73 : 0.5), v0 + td + 0.35, z),
        { n: [0, 1] },
        'Am Tisch Platz nehmen'
      );
    } else {
      for (const k of td > 1.2 ? [0.27, 0.73] : [0.5]) {
        chair(C, Fq, u0 - 0.3, v0 + td * k, 0, seatHex, legHex);
        chair(C, Fq, u0 + tw + 0.3, v0 + td * k, Math.PI, seatHex, legHex);
      }
      C.spot(
        'tisch',
        Fq.P(u0 + tw + 0.35, v0 + td * (td > 1.2 ? 0.73 : 0.5), z),
        { n: [1, 0] },
        'Am Tisch Platz nehmen'
      );
    }
    C.solidW(Fq.rect(u0, u0 + tw, v0, v0 + td), z, z + 0.76);
    top(C, Fq, u0 + tw * 0.25, u0 + tw * 0.75, v0 + td / 2, z + 0.76, 'tisch');
    if (lamp) {
      const p = Fq.P(u0 + tw / 2, v0 + td / 2, 0),
        zc = C.room.z1;
      C.m.cyl(col(C, 0x2a2826, 0.6), p[0], p[1], zc - 0.75, zc, 0.004, 0.004, 4);
      C.lamp([p[0], p[1], zc - 0.8], R.pick(['pendant', 'kugel', 'tuete']), R.pick([0.22, 0.18, 0.15]));
    }
  }
  function wohnen(C, room, Pl, inner, outer, all) {
    const R = C.R,
      T = mats(),
      z = C.z;
    // the TV wall: inner walls first (no window behind the screen), as long as it can be
    let tvF = null,
      tvSide = null;
    for (const w of [2.0, 1.8, 1.6, 1.4]) {
      for (const sd of inner.concat(outer).sort((p, q) => Pl.S[q].L - Pl.S[p].L)) {
        if (Pl.S[sd].L < w + 0.3) continue;
        tvF = Pl.place(sd, w, 0.45, 1.3, 0.5);
        if (tvF) {
          tvSide = sd;
          break;
        }
      }
      if (tvF) break;
    }
    if (tvF) tvWand(C, tvF, tvF.w, R);
    // the sofa across from it (else beside it): the corner sofa where it fits, else a straight one
    const opp = { y0: 'y1', y1: 'y0', x0: 'x1', x1: 'x0' }[tvSide || 'y1'],
      cands = [opp].concat(all.filter(s => s !== opp && s !== tvSide));
    let sF = null,
      shape = null;
    for (const [w, d, kind] of [
      [2.75, 1.75, 'eck'],
      [2.45, 1.75, 'eck'],
      [2.2, 1.6, 'gerade'],
      [1.8, 1.6, 'gerade'],
    ]) {
      for (const c of cands) {
        if (!Pl.S[c] || Pl.S[c].L < w + 0.1) continue;
        sF = Pl.place(c, w, d, 0.85, 0.5);
        if (sF) {
          shape = kind;
          break;
        }
      }
      if (sF) break;
    }
    if (sF) {
      const end = R.chance(0.5) ? 1 : -1;
      if (shape === 'eck') {
        const s = sofa(C, sF, sF.w, end, R);
        // the table before the long part, beside the chaise; a rug under both
        const t0 = end === 1 ? s.u0 + 0.45 : s.cu1 + 0.25,
          t1 = end === 1 ? s.cu0 - 0.25 : s.u1 - 0.45;
        if (t1 - t0 > 0.6) couchtisch(C, sF, t0, Math.min(t1, t0 + 1.1), 1.2, 1.75, R);
        rug(C, sF, s.u0 - 0.1, s.u1 + 0.1, 0.75, 2.6, R);
      } else {
        // a straight sofa: no chaise (CL = D)
        const w = sF.w,
          m = C.m,
          u0 = sF.u0,
          fab = col(C, R.pick([0x8b8e91, 0x55585c, 0xc3b6a0, 0x51647a, 0x667a64]), 0.92);
        sF.box(m, fab, u0, u0 + w, 0, 0.92, z + 0.1, z + 0.4);
        sF.box(m, fab, u0, u0 + w, 0, 0.22, z + 0.4, z + 0.8);
        for (const a of [u0, u0 + w - 0.2]) sF.box(m, fab, a, a + 0.2, 0, 0.92, z + 0.4, z + 0.62);
        for (let k = 0; k < 2; k++)
          sF.box(
            m,
            fab,
            u0 + 0.2 + k * ((w - 0.4) / 2) + 0.005,
            u0 + 0.2 + (k + 1) * ((w - 0.4) / 2) - 0.005,
            0.2,
            0.91,
            z + 0.4,
            z + 0.48
          );
        const acc = col(C, R.pick([0xc0952f, 0xb0563a, 0x2f4858, 0xe8e2d4]), 0.95);
        for (const cu of [u0 + 0.45, u0 + w - 0.45]) sF.box(m, acc, cu - 0.2, cu + 0.2, 0.26, 0.4, z + 0.48, z + 0.86);
        for (const pu of [u0 + 0.06, u0 + w - 0.1])
          for (const pv of [0.06, 0.82]) sF.box(m, col(C, 0x2a2a2a, 0.6), pu, pu + 0.04, pv, pv + 0.04, z, z + 0.1);
        C.solid(sF.rect(u0, u0 + w, 0, 0.92), z, z + 0.8);
        C.seat(sF.P(u0 + w / 2, 0.5, z), sF, 'Aufs Sofa setzen');
        couchtisch(C, sF, u0 + w / 2 - 0.5, u0 + w / 2 + 0.5, 1.15, 1.6, R);
        rug(C, sF, u0 - 0.1, u0 + w + 0.1, 0.7, 2.4, R);
      }
    }
    // a shelf and a sideboard on the walls left, the reading lamp by the sofa, a big plant in a corner
    let F = Pl.any(R.shuffle(all.slice()), 0.78, 0.4, 1.5, R.r(0.1, 0.9));
    if (F) regal(C, F, 2, 4, R);
    F = Pl.any(R.shuffle(all.slice()), 1.6, 0.46, 0.8, 0.5);
    if (F) sideboard(C, F, 1.6, R);
    F = Pl.any(cands.concat(all), 0.4, 0.4, 1.7, 0.98);
    if (F) stehlampe(C, F, F.u0 + 0.2, 0.2);
    F = Pl.any(R.shuffle(all.slice()), 0.5, 0.5, 1.6, R.pick([0.02, 0.98]));
    if (F) bigPlant(C, ...F.P(F.u0 + 0.25, 0.25, 0).slice(0, 2), z, R.r(0.9, 1.4));
    // a big room: the dining table in it
    const area = (room.x1 - room.x0) * (room.y1 - room.y0);
    if (area > 24) essplatz(C, Pl, R, true);
    // the art over the sofa (one big print), more on free walls
    if (sF) {
      const W = Pl.S[sF.side];
      if (Pl.wallFree(sF.side, sF.u0 + 0.3, sF.u0 + sF.w - 0.3, z + 1.1, z + 1.75))
        print(
          C,
          frame(W.O, W.a, W.n),
          sF.u0 + sF.w / 2,
          z + 1.45,
          R.pick([0.9, 1.1]),
          0.62,
          artCell(C, [0, 1, 2]),
          R.pick([BLACK, WHITE, 0xb08d57])
        );
    }
    void T;
    return true;
  }
  // a rug in frame F (u0 … u1, v0 … v1), kept inside the room
  function rug(C, F, u0, u1, v0, v1, R) {
    const T = mats(),
      r = F.rect(u0, u1, v0, v1),
      room = C.room,
      q = [
        Math.max(r[0], room.x0 + 0.15),
        Math.min(r[1], room.x1 - 0.15),
        Math.max(r[2], room.y0 + 0.15),
        Math.min(r[3], room.y1 - 0.15),
      ];
    if (q[1] - q[0] < 0.8 || q[3] - q[2] < 0.8) return;
    const mat = R.pick([T.teppich, T.teppich, col(C, R.pick([0x9a9690, 0x6f6b66, 0xc8bba5, 0x55647a]), 1.0)]);
    C.m.box(mat, q[0], q[1], q[2], q[3], C.z + 0.002, C.z + 0.014);
  }
  // ---- the kitchen ----
  // a fitted kitchen along one wall: n units of 60 cm – sink, hob over the oven, dishwasher, drawers; wall units, the hood
  function zeile(C, F, n, R, frontHex) {
    const m = C.m,
      z = C.z,
      u0 = F.u0,
      T = mats(),
      w = n * 0.6,
      front = col(C, frontHex, 0.35),
      carcass = col(C, 0xe4e4e0, 0.6),
      worktop = R.pick([T.eiche, col(C, 0x3a3b3d, 0.35), col(C, 0xe8e6e0, 0.3), T.nuss]),
      handle = col(C, frontHex === BLACK || frontHex === 0x3b3e42 ? 0x9a9c9e : 0x2a2b2d, 0.35, 0.8),
      steel = col(C, STEEL, 0.3, 0.9);
    F.box(m, col(C, 0x3a3a38, 0.8), u0, u0 + w, 0, 0.52, z, z + 0.1);
    F.box(m, carcass, u0, u0 + w, 0, 0.58, z + 0.1, z + 0.88);
    F.box(m, worktop, u0 - 0.01, u0 + w + 0.01, 0, 0.63, z + 0.88, z + 0.92);
    // which unit is what: the sink in the second, the hob in the fourth (or the last), the dishwasher beside the sink
    const sinkK = n === 2 ? 0 : Math.min(1, n - 1),
      hobK = n >= 4 ? 3 : n - 1,
      dwK = n >= 3 ? 2 : -1;
    for (let k = 0; k < n; k++) {
      const a = u0 + k * 0.6 + 0.003,
        b = u0 + (k + 1) * 0.6 - 0.003;
      if (k === hobK) {
        // the oven under the hob: black glass with a steel bar
        F.box(m, col(C, 0x16171a, 0.15), a, b, 0.58, 0.6, z + 0.12, z + 0.7);
        F.box(m, steel, a + 0.06, b - 0.06, 0.6, 0.625, z + 0.64, z + 0.655);
        F.box(m, front, a, b, 0.58, 0.6, z + 0.71, z + 0.865);
      } else if (k === dwK) F.box(m, front, a, b, 0.58, 0.6, z + 0.12, z + 0.865);
      else if (k % 2 === 0) {
        for (const [za, zb] of [
          [0.12, 0.38],
          [0.385, 0.62],
          [0.625, 0.865],
        ]) {
          F.box(m, front, a, b, 0.58, 0.6, z + za, z + zb);
          F.box(m, handle, (a + b) / 2 - 0.13, (a + b) / 2 + 0.13, 0.6, 0.618, z + zb - 0.05, z + zb - 0.04);
        }
      } else {
        F.box(m, front, a, b, 0.58, 0.6, z + 0.12, z + 0.865);
        F.box(m, handle, (a + b) / 2 - 0.13, (a + b) / 2 + 0.13, 0.6, 0.618, z + 0.81, z + 0.82);
      }
    }
    // the sink: a black or steel basin in the worktop, the tap
    const su = u0 + sinkK * 0.6 + 0.3,
      sinkM = R.pick([steel, col(C, 0x2a2a2a, 0.5)]);
    F.box(m, sinkM, su - 0.24, su + 0.24, 0.1, 0.5, z + 0.92, z + 0.923);
    F.cyl(m, steel, su, 0.06, z + 0.92, z + 1.22, 0.016, 0.016, 8);
    F.rod(m, steel, [su, 0.06, z + 1.22], [su, 0.3, z + 1.18], 0.014, 6);
    C.spot('spuele', F.P(su, 0.95, z), F, 'Wasser aufdrehen');
    // the induction hob: black glass with four rings
    const hu = u0 + hobK * 0.6 + 0.3;
    F.box(m, col(C, 0x0f1012, 0.1), hu - 0.29, hu + 0.29, 0.06, 0.56, z + 0.92, z + 0.926);
    for (const [du, dv, r] of [
      [-0.14, 0.18, 0.09],
      [0.14, 0.18, 0.07],
      [-0.14, 0.42, 0.07],
      [0.14, 0.42, 0.1],
    ])
      F.cyl(m, col(C, 0x3a3c40, 0.3), hu + du, dv, z + 0.926, z + 0.927, r, r, 16);
    C.spot('herd', F.P(hu, 0.95, z), F, 'Herd anmachen');
    // the backsplash and the wall units (not over the hob: the hood)
    F.box(m, R.pick([col(C, WHITE, 0.3), col(C, 0x3a3b3d, 0.3), worktop]), u0, u0 + w, 0, 0.012, z + 0.92, z + 1.45);
    F.box(m, carcass, u0, u0 + w, 0, 0.35, z + 1.45, z + 2.15);
    for (let k = 0; k < n; k++) {
      const a = u0 + k * 0.6 + 0.003,
        b = u0 + (k + 1) * 0.6 - 0.003;
      if (k === hobK) continue;
      F.box(m, front, a, b, 0.35, 0.37, z + 1.453, z + 2.147);
      F.box(m, handle, (a + b) / 2 - 0.1, (a + b) / 2 + 0.1, 0.37, 0.388, z + 1.5, z + 1.51);
    }
    // the hood: a slim steel chimney hood over the hob
    F.box(m, steel, hu - 0.3, hu + 0.3, 0.0, 0.5, z + 1.55, z + 1.6);
    F.box(m, steel, hu - 0.13, hu + 0.13, 0.0, 0.25, z + 1.6, C.room.z1);
    F.box(m, carcass, hu - 0.3, hu - 0.13, 0, 0.35, z + 1.6, z + 2.15, { skip: 'b' });
    F.box(m, carcass, hu + 0.13, hu + 0.3, 0, 0.35, z + 1.6, z + 2.15, { skip: 'b' });
    C.solid(F.rect(u0, u0 + w, 0, 0.63), z, z + 0.92);
    // on the worktop: coffee machine, kettle, a board, the bread bin or a fruit bowl, herbs
    const free = [];
    for (let k = 0; k < n; k++) if (k !== sinkK && k !== hobK) free.push(u0 + k * 0.6 + 0.3);
    const things = R.shuffle(['kaffee', 'kessel', 'brett', 'obst', 'kraeuter', 'toaster']);
    free.forEach((u, i) => {
      const t = things[i % things.length],
        zz = z + 0.92;
      if (t === 'kaffee') {
        F.box(m, col(C, 0x1f2023, 0.35), u - 0.13, u + 0.13, 0.12, 0.47, zz, zz + 0.36);
        F.box(m, steel, u - 0.05, u + 0.05, 0.47, 0.49, zz + 0.12, zz + 0.2);
        F.cyl(m, col(C, 0xf2f0ea, 0.3), u, 0.42, zz + 0.02, zz + 0.1, 0.035, 0.03, 8);
      } else if (t === 'kessel')
        F.lathe(
          m,
          R.pick([steel, col(C, WHITE, 0.3), col(C, 0x3b3e42, 0.4)]),
          u,
          0.3,
          [
            [0.075, zz],
            [0.085, zz + 0.12],
            [0.05, zz + 0.24],
            [0.0, zz + 0.25],
          ],
          12
        );
      else if (t === 'brett') {
        F.box(m, T.eiche, u - 0.22, u + 0.18, 0.02, 0.05, zz, zz + 0.32, { a: 0 });
        F.box(m, col(C, 0x2a2b2d, 0.4), u + 0.2, u + 0.28, 0.25, 0.38, zz, zz + 0.2);
      } else if (t === 'obst') DK.schale(C, F, u, 0.3, zz);
      else if (t === 'kraeuter')
        for (const du of [-0.12, 0, 0.12]) smallPlant(C, ...F.P(u + du, 0.3, 0).slice(0, 2), zz);
      else {
        F.box(m, R.pick([steel, col(C, 0xc83a2a, 0.4)]), u - 0.14, u + 0.14, 0.2, 0.36, zz, zz + 0.19);
        F.box(m, col(C, BLACK, 0.5), u - 0.1, u + 0.1, 0.24, 0.32, zz + 0.19, zz + 0.192);
      }
    });
  }
  // the tall fridge (steel or white, a freezer drawer below)
  function kuehl(C, F, R) {
    const m = C.m,
      z = C.z,
      u0 = F.u0,
      body = R.pick([col(C, STEEL, 0.35, 0.7), col(C, WHITE, 0.3), col(C, 0x2a2b2d, 0.35)]),
      h = 1.86;
    F.box(m, body, u0, u0 + 0.6, 0, 0.62, z, z + h);
    F.box(m, col(C, 0x1a1a1a, 0.6), u0 + 0.01, u0 + 0.59, 0.62, 0.625, z + 0.62, z + 0.63);
    F.box(m, col(C, 0x8a8c8e, 0.35, 0.8), u0 + 0.52, u0 + 0.54, 0.625, 0.66, z + 0.9, z + 1.4);
    F.box(m, col(C, 0x8a8c8e, 0.35, 0.8), u0 + 0.52, u0 + 0.54, 0.625, 0.66, z + 0.3, z + 0.55);
    C.solid(F.rect(u0, u0 + 0.6, 0, 0.66), z, z + h);
  }
  function kochen(C, room, Pl, inner, outer, all) {
    const R = C.R,
      z = C.z,
      frontHex = R.pick([WHITE, WHITE, 0xf7f7f5, 0x3b3e42, 0x8ea18c, 0xd9cdb8, 0x26303c]);
    let F = null;
    for (const n of [6, 5, 4, 3]) {
      F = Pl.any(inner.concat(outer), n * 0.6, 0.63, 2.2, room.stovePref ?? 0.3);
      if (F) {
        zeile(C, F, n, R, frontHex);
        break;
      }
    }
    if (!F) {
      F = Pl.any(all, 1.2, 0.63, 2.2, 0.5);
      if (F) zeile(C, F, 2, R, frontHex);
    }
    const Fz = F;
    F = Pl.any(all, 0.62, 0.66, 1.9, 0.98);
    if (F) kuehl(C, F, R);
    // the table in the middle (or aside): four chairs, the pendant over it
    const table = essplatz(C, Pl, R, true);
    // a flat LED over the kitchen line (and in the middle if nothing else lights the room)
    if (Fz || !table) {
      const p = Fz ? Fz.P(Fz.u0 + Fz.w / 2, 1.2, 0) : [(room.x0 + room.x1) / 2, (room.y0 + room.y1) / 2];
      C.lamp([p[0], p[1], room.z1 - 0.025], 'fluter', 0.2);
    }
    // the bin (two sorts), a tea towel on a hook, the clock and the calendar on the wall
    F = Pl.any(all, 0.42, 0.32, 0.6, 0.02);
    if (F) {
      F.box(C.m, col(C, 0xb8bcc0, 0.35, 0.6), F.u0, F.u0 + 0.2, 0.02, 0.32, z, z + 0.55);
      F.box(C.m, col(C, 0x3b3e42, 0.5), F.u0 + 0.21, F.u0 + 0.41, 0.02, 0.32, z, z + 0.55);
      C.solid(F.rect(F.u0, F.u0 + 0.42, 0, 0.34), z, z + 0.55);
    }
    // a round wall clock (its hands at ten past ten, as in the catalogues)
    hang(C, Pl, all, 0.32, 0.32, z + 1.9, (Fw, u) => {
      disc(C.m, col(C, R.pick([WHITE, BLACK, 0xb08d57]), 0.4), Fw, u, 0.012, z + 1.9, 0.16, 20);
      disc(C.m, col(C, 0xf6f4ee, 0.5), Fw, u, 0.022, z + 1.9, 0.14, 20);
      Fw.box(C.m, col(C, BLACK, 0.5), u - 0.005, u + 0.005, 0.024, 0.028, z + 1.9, z + 2.0);
      Fw.box(C.m, col(C, BLACK, 0.5), u - 0.005, u + 0.075, 0.024, 0.028, z + 1.895, z + 1.905);
      onWall(C, Fw, u - 0.17, u + 0.17, z + 1.73, z + 2.07);
    });
    hang(C, Pl, all, 0.32, 0.47, z + 1.5, (Fw, u) => DK.kalender(C, Fw, u, z + 1.5));
    return true;
  }
  // ---- sleeping ----
  // the bed of today: upholstered frame and headboard, a high mattress, duvets and pillows, a runner across the foot
  function bett(C, F, w, R, kid = false) {
    const m = C.m,
      z = C.z,
      u0 = F.u0,
      Lb = 2.05,
      fab = col(
        C,
        R.pick(kid ? [WHITE, 0xd8e4ea, 0xe8d8c8] : [0x8b8e91, 0xc3b6a0, 0x55585c, 0x51647a, 0xe0dcd4]),
        0.92
      ),
      linen = col(
        C,
        R.pick(kid ? [0x9cc3e0, 0xf2c14e, 0xe8a0a8, 0x9ad0b0] : [0xf4f2ec, 0xe8e6e0, 0xc9ced3, 0xd9cdb8, 0x9aa8b4]),
        0.95
      ),
      pillow = col(C, 0xf6f4ee, 0.95);
    F.box(m, fab, u0, u0 + w, 0, 0.1, z, kid ? z + 0.85 : z + 1.15);
    F.box(m, fab, u0, u0 + w, 0.1, Lb, z + 0.08, z + 0.42);
    for (const pu of [u0 + 0.06, u0 + w - 0.1])
      F.box(m, col(C, 0x2a2a2a, 0.6), pu, pu + 0.04, Lb - 0.1, Lb - 0.06, z, z + 0.08);
    F.box(m, col(C, 0xf0eeea, 0.9), u0 + 0.03, u0 + w - 0.03, 0.12, Lb - 0.03, z + 0.42, z + 0.58);
    const halves = w > 1.3 ? 2 : 1;
    for (let k = 0; k < halves; k++) {
      const a = u0 + 0.04 + ((w - 0.08) * k) / halves + (k ? 0.01 : 0),
        b = u0 + 0.04 + ((w - 0.08) * (k + 1)) / halves - (k < halves - 1 ? 0.01 : 0);
      F.box(m, linen, a, b, 0.62, Lb - 0.02, z + 0.58, z + 0.7);
      F.box(m, linen, a, b, 0.55, 0.75, z + 0.58, z + 0.74);
      F.box(m, pillow, a + 0.06, b - 0.06, 0.14, 0.52, z + 0.58, z + 0.72);
    }
    if (!kid)
      F.box(
        m,
        col(C, R.pick([0xc0952f, 0x2f4858, 0xb0563a, 0x6e8b74, 0x3b3e42]), 0.95),
        u0 + 0.02,
        u0 + w - 0.02,
        Lb - 0.55,
        Lb - 0.1,
        z + 0.7,
        z + 0.715
      );
    C.spot('bett', F.P(u0 + w / 2, Lb * 0.55, z), F, 'Ins Bett legen', {
      lie: true,
      head: F.P(u0 + (halves > 1 ? w * 0.3 : w / 2), 0.35, z + 0.7),
    });
    C.solid(F.rect(u0, u0 + w, 0, Lb), z, z + 0.72);
  }
  // a bedside table with a lamp (a lamp of the room), a phone or a book on it
  function nachttisch(C, F, u0, R, withPhone) {
    const m = C.m,
      z = C.z,
      T = mats(),
      body = R.pick([col(C, WHITE, 0.4), T.eiche, T.nuss]);
    F.box(m, body, u0, u0 + 0.45, 0, 0.38, z + 0.12, z + 0.52);
    for (const pu of [u0 + 0.03, u0 + 0.39]) F.box(m, body, pu, pu + 0.03, 0.03, 0.06, z, z + 0.12);
    F.box(m, body, u0 + 0.01, u0 + 0.44, 0.38, 0.392, z + 0.3, z + 0.5);
    F.cyl(m, col(C, R.pick([WHITE, 0xc9b38f, 0x3b3e42]), 0.4), u0 + 0.13, 0.17, z + 0.52, z + 0.72, 0.05, 0.04, 10);
    C.lamp(F.P(u0 + 0.13, 0.17, z + 0.78), 'small', 0.11);
    if (withPhone) phone(C, F, u0 + 0.33, 0.2, z + 0.52);
    else
      F.box(
        m,
        col(C, R.pick([0x2f4561, 0x7a3b2e, 0x3f5a46]), 0.7),
        u0 + 0.26,
        u0 + 0.42,
        0.08,
        0.3,
        z + 0.52,
        z + 0.55
      );
    C.solid(F.rect(u0, u0 + 0.45, 0, 0.4), z, z + 0.55);
  }
  // the wardrobe of today: sliding doors (white, grey or oak), one with a mirror
  function schrank(C, F, w, R, h = 2.2) {
    const m = C.m,
      z = C.z,
      u0 = F.u0,
      T = mats(),
      body = R.pick([col(C, WHITE, 0.4), col(C, WHITE, 0.4), col(C, 0x9a9c9c, 0.45), T.eiche]),
      d = 0.62;
    F.box(m, body, u0, u0 + w, 0, d - 0.06, z, z + h);
    const n = w > 1.6 ? 3 : 2,
      mirror = R.chance(0.6) ? Math.floor(R() * n) : -1;
    for (let k = 0; k < n; k++) {
      const a = u0 + 0.02 + ((w - 0.04) * k) / n,
        b = u0 + 0.02 + ((w - 0.04) * (k + 1)) / n,
        vv = k % 2 ? d - 0.06 : d - 0.03;
      F.box(m, body, a - 0.005, b + 0.005, vv, vv + 0.025, z + 0.06, z + h - 0.04);
      if (k === mirror)
        F.box(m, col(C, 0xb8c4c8, 0.22, 0.85), a + 0.04, b - 0.04, vv + 0.025, vv + 0.03, z + 0.2, z + h - 0.2);
      else F.box(m, col(C, 0x8a8c8e, 0.35, 0.8), b - 0.06, b - 0.04, vv + 0.025, vv + 0.04, z + 0.9, z + 1.3);
    }
    F.box(m, col(C, 0x8a8c8e, 0.35, 0.8), u0, u0 + w, d - 0.035, d, z + h - 0.04, z + h - 0.01);
    C.solid(F.rect(u0, u0 + w, 0, d), z, z + h);
  }
  // a chest of drawers with things on it
  function kommode(C, F, w, R) {
    const m = C.m,
      z = C.z,
      u0 = F.u0,
      T = mats(),
      body = R.pick([col(C, WHITE, 0.4), T.eiche, T.nuss]),
      d = 0.45;
    F.box(m, body, u0, u0 + w, 0, d, z + 0.1, z + 0.82);
    for (const pu of [u0 + 0.04, u0 + w - 0.07])
      for (const pv of [0.04, d - 0.07]) F.box(m, body, pu, pu + 0.03, pv, pv + 0.03, z, z + 0.1);
    for (let k = 0; k < 3; k++) {
      F.box(m, body, u0 + 0.01, u0 + w - 0.01, d, d + 0.012, z + 0.12 + k * 0.235, z + 0.34 + k * 0.235);
      F.box(
        m,
        col(C, 0x8a8c8e, 0.35, 0.8),
        u0 + w / 2 - 0.08,
        u0 + w / 2 + 0.08,
        d + 0.012,
        d + 0.024,
        z + 0.31 + k * 0.235,
        z + 0.32 + k * 0.235
      );
    }
    C.solid(F.rect(u0, u0 + w, 0, d), z, z + 0.82);
    top(C, F, u0 + 0.06, u0 + w - 0.06, d / 2, z + 0.82, 'board');
  }
  function schlafen(C, room, Pl, inner, outer, all) {
    const R = C.R,
      z = C.z,
      wide = room.x1 - room.x0 > 2.9 && room.y1 - room.y0 > 2.9,
      bw = wide ? 1.8 : 1.4;
    let F = Pl.any(inner.concat(outer), bw + 1.0, 2.05, 1.2, 0.5) || Pl.any(inner.concat(outer), bw, 2.05, 1.2, 0.5);
    if (F) {
      const withTables = F.w > bw + 0.5;
      const Fb = frame(F.O, F.a, F.n);
      Object.assign(Fb, { u0: F.u0 + (withTables ? 0.5 : 0), w: bw, side: F.side });
      bett(C, Fb, bw, R);
      if (withTables) {
        nachttisch(C, F, F.u0 + 0.02, R, true);
        nachttisch(C, F, F.u0 + 0.5 + bw + 0.03, R, false);
      }
      rug(C, Fb, Fb.u0 - 0.5, Fb.u0 + bw + 0.5, 1.1, 2.6, R);
      const W = Pl.S[F.side];
      if (Pl.wallFree(F.side, Fb.u0 + 0.1, Fb.u0 + bw - 0.1, z + 1.2, z + 1.85))
        print(
          C,
          frame(W.O, W.a, W.n),
          Fb.u0 + bw / 2,
          z + 1.55,
          Math.min(1.1, bw - 0.4),
          0.55,
          artCell(C, [1, 2, 0]),
          R.pick([WHITE, 0xb08d57, BLACK])
        );
    }
    for (const w of [2.4, 2.0, 1.6, 1.2]) {
      F = Pl.any(inner.concat(outer), w, 0.62, 2.2, 0.5);
      if (F) {
        schrank(C, F, w, R);
        break;
      }
    }
    F = Pl.any(all, 1.1, 0.46, 0.82, 0.5);
    if (F) kommode(C, F, 1.1, R);
    F = Pl.any(all, 0.5, 0.5, 1.6, R.pick([0.02, 0.98]));
    if (F && R.chance(0.6)) bigPlant(C, ...F.P(F.u0 + 0.25, 0.25, 0).slice(0, 2), z, R.r(0.7, 1.1));
    return true;
  }
  // ---- the children's room: a bed, the desk with the lamp and a laptop or tablet, a shelf with toys, a rug ----
  function schreibtisch(C, F, w, R, kid) {
    const m = C.m,
      z = C.z,
      u0 = F.u0,
      T = mats(),
      topM = R.pick([col(C, WHITE, 0.4), T.eiche]),
      leg = col(C, R.pick([WHITE, 0x8a8c8e]), 0.4, 0.2);
    F.box(m, topM, u0, u0 + w, 0, 0.65, z + 0.72, z + 0.75);
    for (const pu of [u0 + 0.03, u0 + w - 0.07]) {
      F.box(m, leg, pu, pu + 0.04, 0.04, 0.08, z, z + 0.72);
      F.box(m, leg, pu, pu + 0.04, 0.57, 0.61, z, z + 0.72);
      F.box(m, leg, pu, pu + 0.04, 0.08, 0.57, z + 0.05, z + 0.08);
    }
    // the lamp on its arm (a lamp of the room), the laptop or tablet, a cup of pens, a stack of exercise books
    F.cyl(m, col(C, R.pick([WHITE, BLACK, 0xf2c14e]), 0.4), u0 + 0.15, 0.12, z + 0.75, z + 0.77, 0.07, 0.07, 10);
    F.rod(m, col(C, 0x8a8c8e, 0.35, 0.8), [u0 + 0.15, 0.12, z + 0.77], [u0 + 0.2, 0.18, z + 1.15], 0.01, 4);
    F.rod(m, col(C, 0x8a8c8e, 0.35, 0.8), [u0 + 0.2, 0.18, z + 1.15], [u0 + 0.35, 0.3, z + 1.05], 0.01, 4);
    C.lamp(F.P(u0 + 0.37, 0.32, z + 1.02), 'small', 0.07);
    if (kid && R.chance(0.5)) tablet(C, F, u0 + w * 0.55, 0.35, z + 0.75);
    else laptop(C, F, u0 + w * 0.55, 0.38, z + 0.75, true);
    F.cyl(
      m,
      col(C, R.pick([0xef8a62, 0x6f9ccf, 0x7fc29b]), 0.5),
      u0 + w - 0.15,
      0.12,
      z + 0.75,
      z + 0.85,
      0.035,
      0.035,
      8
    );
    for (let k = 0; k < 4; k++)
      F.box(
        m,
        col(C, R.pick([0x6f9ccf, 0xef8a62, 0xf2c14e, 0xf4f2ec]), 0.8),
        u0 + w - 0.42,
        u0 + w - 0.2,
        0.1,
        0.4,
        z + 0.75 + k * 0.008,
        z + 0.757 + k * 0.008
      );
    swivel(
      C,
      F,
      u0 + w * 0.55,
      0.95,
      -Math.PI / 2,
      R.pick(kid ? [0x6f9ccf, 0xef8a62, 0x7fc29b, 0x3b3e42] : [0x3b3e42, 0x55585c])
    );
    C.seat(F.P(u0 + w * 0.55, 0.95, z), { n: [-F.n[0], -F.n[1]] }, 'Am Schreibtisch sitzen');
    C.solid(F.rect(u0, u0 + w, 0, 0.65), z, z + 0.76);
  }
  function kinder(C, room, Pl, inner, outer, all) {
    const R = C.R,
      z = C.z,
      T = mats();
    let F = Pl.any(inner.concat(outer), 0.95, 2.05, 0.9, 0.2);
    if (F) bett(C, F, 0.95, R, true);
    if (F) {
      const p = F.P(F.u0 + 0.45, 0.3, 0);
      toy(C, frame([p[0], p[1]], F.a, F.n), 0, 0, z + 0.72);
    }
    F = Pl.any(outer.concat(inner), 1.2, 1.1, 0.8, 0.5);
    if (F) schreibtisch(C, F, 1.2, R, true);
    F = Pl.any(all, 0.78, 0.4, 1.5, 0.5);
    if (F) regal(C, F, 2, R.chance(0.5) ? 4 : 2, R, true);
    for (const w of [1.2, 1.0]) {
      F = Pl.any(inner.concat(outer), w, 0.62, 2.0, 0.5);
      if (F) {
        schrank(C, F, w, R, 2.0);
        break;
      }
    }
    // the round rug, toys on it, a poster
    const rr = Pl.floorFree(1.6, 1.6);
    if (rr) {
      const cx = (rr[0] + rr[1]) / 2,
        cy = (rr[2] + rr[3]) / 2;
      C.m.cyl(T.kinder, cx, cy, z + 0.002, z + 0.014, 0.75, 0.75, 24);
      const Ft = frame([cx, cy], [1, 0], [0, 1]);
      toy(C, Ft, 0.3, 0.1, z + 0.014);
      toy(C, Ft, -0.25, -0.2, z + 0.014);
    }
    hang(C, Pl, all, 0.5, 0.65, z + 1.5, (Fw, u) => print(C, Fw, u, z + 1.5, 0.5, 0.65, 3, R.pick([WHITE, 0x6f9ccf])));
    return true;
  }
  // ---- a Kammer of today: a study (desk, screen, shelves of folders) or a guest room (a sofa bed) ----
  function kammer(C, room, Pl, inner, outer, all) {
    const R = C.R,
      z = C.z,
      T = mats(),
      office = R.chance(0.55);
    room.name2 = office ? 'Arbeitszimmer' : 'Gästezimmer'; // haeuser/haeuser.js names the room after it
    if (office) {
      let F = Pl.any(outer.concat(inner), 1.4, 1.1, 0.8, 0.5);
      if (F) {
        const m = C.m,
          u0 = F.u0;
        schreibtisch(C, F, 1.4, R, false);
        // the screen, keyboard and mouse beside the laptop
        F.box(m, col(C, 0x26272a, 0.4), u0 + 0.3, u0 + 0.5, 0.08, 0.2, z + 0.75, z + 0.76);
        F.box(m, col(C, 0x26272a, 0.4), u0 + 0.38, u0 + 0.42, 0.1, 0.13, z + 0.76, z + 0.95);
        F.box(m, col(C, 0x111214, 0.3), u0 + 0.05, u0 + 0.75, 0.12, 0.15, z + 0.92, z + 1.32);
        F.box(m, col(C, 0x26272a, 0.5), u0 + 0.2, u0 + 0.62, 0.38, 0.52, z + 0.75, z + 0.765);
      }
      F = Pl.any(all, 0.78, 0.4, 1.5, 0.5);
      if (F) {
        const w = regal(C, F, 2, 4, R);
        // folders on the lower shelves
        for (let k = 0; k < 8; k++)
          F.box(
            C.m,
            col(C, R.pick([0x2a4a8a, 0x8a2a2a, 0x2a6a3a, 0xc8a030, 0x3b3e42]), 0.6),
            F.u0 + 0.05 + k * 0.085,
            F.u0 + 0.125 + k * 0.085,
            0.06,
            0.34,
            z + 0.04,
            z + 0.36
          );
        void w;
      }
      F = Pl.any(all, 0.5, 0.45, 0.7, 0.5);
      if (F) {
        // the printer on a little cabinet
        F.box(C.m, col(C, WHITE, 0.4), F.u0, F.u0 + 0.5, 0, 0.45, z, z + 0.55);
        F.box(C.m, col(C, 0x3b3e42, 0.4), F.u0 + 0.05, F.u0 + 0.45, 0.04, 0.4, z + 0.55, z + 0.75);
        C.solid(F.rect(F.u0, F.u0 + 0.5, 0, 0.45), z, z + 0.75);
      }
    } else {
      // the sofa bed and a little table, a clothes rail
      let F = Pl.any(inner.concat(outer), 1.9, 1.0, 0.85, 0.5);
      if (F) {
        const m = C.m,
          u0 = F.u0,
          fab = col(C, R.pick([0x8b8e91, 0x51647a, 0xc3b6a0, 0x667a64]), 0.92);
        F.box(m, fab, u0, u0 + 1.9, 0, 0.9, z + 0.1, z + 0.42);
        F.box(m, fab, u0, u0 + 1.9, 0, 0.2, z + 0.42, z + 0.8);
        F.box(m, fab, u0 + 0.01, u0 + 1.89, 0.2, 0.89, z + 0.42, z + 0.5);
        F.box(m, col(C, 0xf4f2ec, 0.95), u0 + 0.1, u0 + 0.6, 0.22, 0.6, z + 0.5, z + 0.62);
        F.box(m, col(C, R.pick([0xd9cdb8, 0x9aa8b4]), 0.95), u0 + 0.7, u0 + 1.8, 0.25, 0.85, z + 0.5, z + 0.56);
        C.solid(F.rect(u0, u0 + 1.9, 0, 0.9), z, z + 0.8);
        C.seat(F.P(u0 + 0.95, 0.5, z), F, 'Aufs Sofa setzen');
      }
      F = Pl.any(all, 1.1, 0.46, 0.82, 0.5);
      if (F) kommode(C, F, 1.1, R);
      F = Pl.any(all, 1.0, 0.45, 1.6, 0.5);
      if (F) {
        const m = C.m,
          u0 = F.u0,
          steel = col(C, 0x8a8c8e, 0.35, 0.8);
        for (const pu of [u0 + 0.02, u0 + 0.96]) F.cyl(m, steel, pu, 0.22, z, z + 1.6, 0.012, 0.012, 5);
        F.rod(m, steel, [u0 + 0.02, 0.22, z + 1.58], [u0 + 0.96, 0.22, z + 1.58], 0.012, 5);
        for (let k = 0; k < 4; k++)
          F.box(
            m,
            col(C, R.pick([0x7a3b2e, 0x3f5a46, 0x2f4561, 0xcdbb9a, 0x5d6f86]), 0.95),
            u0 + 0.15 + k * 0.2,
            u0 + 0.3 + k * 0.2,
            0.1,
            0.34,
            z + 0.8,
            z + 1.55
          );
        C.solid(F.rect(u0, u0 + 1.0, 0, 0.45), z, z + 1.6);
      }
    }
    // a big room: a reading corner and a rug
    if ((room.x1 - room.x0) * (room.y1 - room.y0) > 11) {
      const F = Pl.any(R.shuffle(all.slice()), 1.25, 0.85, 1.7, R.pick([0.05, 0.95]));
      if (F) sessel(C, F, R);
      const rr = Pl.floorFree(1.7, 1.2);
      if (rr)
        C.m.box(
          R.pick([T.teppich, col(C, R.pick([0x9a9690, 0x55647a, 0xc8bba5]), 1.0)]),
          rr[0],
          rr[1],
          rr[2],
          rr[3],
          z + 0.002,
          z + 0.014
        );
    }
    F0(C, Pl, all);
    return true;
  }
  // an armchair of today (upholstered on wooden legs) and a round side table with a book and a mug
  function sessel(C, F, R) {
    const m = C.m,
      z = C.z,
      u0 = F.u0,
      T = mats(),
      fab = col(C, R.pick([0xc0952f, 0x51647a, 0x8b8e91, 0x6e8b74, 0xb0563a, 0xd9cdb8]), 0.92),
      wood = T.eiche;
    for (const [pu, pv] of [
      [u0 + 0.08, 0.1],
      [u0 + 0.66, 0.1],
      [u0 + 0.08, 0.7],
      [u0 + 0.66, 0.7],
    ])
      F.box(m, wood, pu, pu + 0.04, pv, pv + 0.04, z, z + 0.18);
    F.box(m, fab, u0 + 0.02, u0 + 0.78, 0.04, 0.8, z + 0.18, z + 0.42);
    F.box(m, fab, u0 + 0.04, u0 + 0.76, 0.22, 0.8, z + 0.42, z + 0.48);
    F.box(m, fab, u0 + 0.02, u0 + 0.78, 0.0, 0.22, z + 0.42, z + 0.92);
    for (const a of [u0, u0 + 0.7]) F.box(m, fab, a, a + 0.1, 0.04, 0.8, z + 0.42, z + 0.6);
    F.box(
      m,
      col(C, R.pick([0xe8e2d4, 0x3b3e42, 0xc9b38f]), 0.95),
      u0 + 0.22,
      u0 + 0.58,
      0.24,
      0.36,
      z + 0.48,
      z + 0.78
    );
    // the side table with a book and a mug
    F.cyl(m, wood, u0 + 1.03, 0.3, z + 0.5, z + 0.53, 0.2, 0.2, 14);
    F.cyl(m, col(C, BLACK, 0.5, 0.3), u0 + 1.03, 0.3, z, z + 0.5, 0.02, 0.02, 6);
    F.cyl(m, col(C, BLACK, 0.5, 0.3), u0 + 1.03, 0.3, z, z + 0.015, 0.14, 0.14, 10);
    F.box(m, col(C, R.pick([0x7a3b2e, 0x2f4561, 0x3f5a46]), 0.7), u0 + 0.95, u0 + 1.12, 0.22, 0.36, z + 0.53, z + 0.56);
    F.cyl(m, col(C, R.pick([WHITE, 0xc83a2a, 0x6f9ccf]), 0.4), u0 + 1.12, 0.42, z + 0.53, z + 0.62, 0.04, 0.04, 10);
    C.seat(F.P(u0 + 0.4, 0.45, z), F, 'In den Sessel setzen');
    C.solid(F.rect(u0, u0 + 0.8, 0, 0.82), z, z + 0.92);
    C.solid(F.rect(u0 + 0.83, u0 + 1.23, 0.1, 0.5), z, z + 0.55);
  }
  // a big plant in a free corner of a room (if one is left)
  function F0(C, Pl, all) {
    const F = Pl.any(C.R.shuffle(all.slice()), 0.5, 0.5, 1.6, C.R.pick([0.02, 0.98]));
    if (F) bigPlant(C, ...F.P(F.u0 + 0.25, 0.25, 0).slice(0, 2), C.z, C.R.r(0.8, 1.2));
  }
  // ---- the bath: shower, (tub), WC, vanity with the mirror cabinet, towel radiator, washing machine where there is no utility room ----
  function dusche(C, Pl, all, R) {
    const z = C.z,
      m = C.m,
      w = 0.9,
      d = 0.9;
    for (const sd of R.shuffle(all.slice())) {
      const L0 = Pl.S[sd].L;
      for (const [u, end] of [
        [0.02, false],
        [L0 - w - 0.02, true],
      ]) {
        const F = Pl.at(sd, u, w, d, 2.1);
        if (!F) continue;
        Pl.used.push(F.rect(u, u + w, 0, d));
        const glass = C.M.glas,
          prof = col(C, STEEL, 0.3, 0.9);
        F.box(m, col(C, 0xf4f4f2, 0.25), u, u + w, 0, d, z, z + 0.04);
        F.box(
          m,
          col(C, 0x8a8c8e, 0.3, 0.9),
          u + w / 2 - 0.04,
          u + w / 2 + 0.04,
          d / 2 - 0.04,
          d / 2 + 0.04,
          z + 0.04,
          z + 0.045
        );
        // glass in front (v = d) and on the open end; thin steel edges
        F.box(m, glass, u, u + w, d - 0.012, d, z + 0.04, z + 2.0);
        const ue = end ? u : u + w;
        F.box(m, glass, ue - 0.006, ue + 0.006, 0, d, z + 0.04, z + 2.0);
        F.box(m, prof, u, u + w, d - 0.02, d + 0.005, z + 1.98, z + 2.0);
        F.box(m, prof, ue - 0.01, ue + 0.01, 0, d, z + 1.98, z + 2.0);
        // the rain shower, the hand shower on its bar, a shelf with bottles
        const hu = u + w / 2;
        F.cyl(m, prof, hu, 0.03, z + 0.9, z + 2.05, 0.012, 0.012, 6);
        F.rod(m, prof, [hu, 0.03, z + 2.05], [hu, 0.4, z + 2.05], 0.012, 6);
        F.cyl(m, prof, hu, 0.42, z + 2.02, z + 2.04, 0.13, 0.13, 16);
        F.box(m, prof, hu - 0.08, hu + 0.08, 0.0, 0.06, z + 1.05, z + 1.12);
        F.box(m, prof, u + 0.08, u + 0.4, 0, 0.11, z + 1.2, z + 1.21);
        for (let k = 0; k < 3; k++)
          F.cyl(
            m,
            col(C, R.pick([0xf4f2ec, 0x6f9ccf, 0xef8a62, 0x7fc29b]), 0.4),
            u + 0.13 + k * 0.1,
            0.06,
            z + 1.21,
            z + 1.38,
            0.025,
            0.025,
            8
          );
        C.solid(F.rect(u, u + w, 0, d), z, z + 2.0);
        C.spot('dusche', F.P(hu, d + 0.5, z), F, 'Dusche aufdrehen');
        return true;
      }
    }
    return false;
  }
  function wanne(C, F, R) {
    const m = C.m,
      z = C.z,
      u0 = F.u0,
      w = 1.7,
      d = 0.75,
      wh = col(C, 0xf6f6f4, 0.2);
    F.box(m, mats().badWand, u0, u0 + w, 0, d, z, z + 0.56, { skip: 't' });
    F.box(m, wh, u0, u0 + w, 0, 0.06, z + 0.56, z + 0.58);
    F.box(m, wh, u0, u0 + w, d - 0.06, d, z + 0.56, z + 0.58);
    F.box(m, wh, u0, u0 + 0.06, 0.06, d - 0.06, z + 0.56, z + 0.58);
    F.box(m, wh, u0 + w - 0.06, u0 + w, 0.06, d - 0.06, z + 0.56, z + 0.58);
    F.box(m, col(C, 0xc8d8e0, 0.15), u0 + 0.08, u0 + w - 0.08, 0.08, d - 0.08, z + 0.32, z + 0.33);
    F.box(m, col(C, STEEL, 0.3, 0.9), u0 + w / 2 - 0.08, u0 + w / 2 + 0.08, 0, 0.1, z + 0.62, z + 0.66);
    C.spot('wanne', F.P(u0 + w / 2, d + 0.4, z), F, 'Wasser einlassen');
    C.solid(F.rect(u0, u0 + w, 0, d), z, z + 0.58);
    void R;
  }
  function wc(C, F) {
    const m = C.m,
      z = C.z,
      u = F.u0 + 0.3,
      wh = col(C, 0xf6f6f4, 0.2),
      el = Math.abs(F.n[0]) > 0.5 ? { sx: 1.2, sy: 0.85 } : { sx: 0.85, sy: 1.2 }; // the bowl long into the room
    F.box(m, mats().badWand, F.u0, F.u0 + 0.6, 0, 0.2, z, z + 1.1);
    F.box(m, wh, F.u0 - 0.005, F.u0 + 0.605, 0, 0.205, z + 1.1, z + 1.12);
    F.box(m, col(C, 0xe8e8e6, 0.3, 0.4), u - 0.12, u + 0.12, 0.2, 0.205, z + 0.92, z + 1.07);
    F.lathe(
      m,
      wh,
      u,
      0.47,
      [
        [0.12, z + 0.3],
        [0.18, z + 0.36],
        [0.19, z + 0.41],
      ],
      12,
      el
    );
    F.box(m, wh, u - 0.17, u + 0.17, 0.2, 0.42, z + 0.3, z + 0.41);
    F.lathe(
      m,
      col(C, 0xf9f9f7, 0.3),
      u,
      0.47,
      [
        [0.16, z + 0.41],
        [0.18, z + 0.43],
      ],
      12,
      el
    );
    F.box(m, col(C, STEEL, 0.3, 0.9), F.u0 + 0.62, F.u0 + 0.66, 0, 0.08, z + 0.7, z + 0.72);
    F.cyl(m, col(C, 0xfafaf8, 0.9), F.u0 + 0.64, 0.1, z + 0.62, z + 0.72, 0.055, 0.055, 10);
    C.solid(F.rect(F.u0, F.u0 + 0.6, 0, 0.68), z, z + 0.45);
  }
  function waschtisch(C, F, R) {
    const m = C.m,
      z = C.z,
      u0 = F.u0,
      w = 0.8,
      T = mats(),
      body = R.pick([col(C, WHITE, 0.35), T.eiche, col(C, 0x3b3e42, 0.4), T.nuss]),
      wh = col(C, 0xf6f6f4, 0.2),
      steel = col(C, STEEL, 0.3, 0.9);
    F.box(m, body, u0, u0 + w, 0, 0.46, z + 0.3, z + 0.8);
    F.box(m, body, u0 + 0.005, u0 + w - 0.005, 0.46, 0.47, z + 0.32, z + 0.55);
    F.box(m, body, u0 + 0.005, u0 + w - 0.005, 0.46, 0.47, z + 0.56, z + 0.79);
    F.box(m, wh, u0 - 0.01, u0 + w + 0.01, 0, 0.48, z + 0.8, z + 0.86);
    F.box(m, col(C, 0xe8eef0, 0.15), u0 + 0.12, u0 + w - 0.12, 0.12, 0.4, z + 0.86, z + 0.862);
    F.cyl(m, steel, u0 + w / 2, 0.07, z + 0.86, z + 1.0, 0.014, 0.014, 6);
    F.rod(m, steel, [u0 + w / 2, 0.07, z + 1.0], [u0 + w / 2, 0.18, z + 0.99], 0.012, 6);
    // the mirror cabinet with its light strip (a lamp of the room)
    F.box(m, col(C, 0xe8e8e6, 0.4), u0, u0 + w, 0, 0.14, z + 1.2, z + 1.9);
    F.box(m, col(C, 0xb8c4c8, 0.22, 0.85), u0 + 0.005, u0 + w - 0.005, 0.14, 0.145, z + 1.22, z + 1.88);
    C.lamp(F.P(u0 + w / 2, 0.08, z + 1.96), 'small', 0.05);
    for (let k = 0; k < 3; k++)
      F.cyl(
        m,
        col(C, R.pick([0xf4f2ec, 0x6f9ccf, 0xef8a62, 0x7fc29b, 0xd8cbb5]), 0.4),
        u0 + w - 0.12 - k * 0.06,
        0.08,
        z + 0.86,
        z + 1.0 - k * 0.02,
        0.022,
        0.022,
        8
      );
    F.cyl(m, col(C, R.pick([0xf2c14e, 0x6f9ccf, 0x7fc29b]), 0.5), u0 + 0.1, 0.08, z + 0.86, z + 0.97, 0.03, 0.025, 8);
    C.spot('waschbecken', F.P(u0 + w / 2, 0.85, z), F, 'Hände waschen');
    C.solid(F.rect(u0, u0 + w, 0, 0.48), z, z + 0.86);
  }
  function heizkoerper(C, F, R) {
    const m = C.m,
      z = C.z,
      u0 = F.u0,
      wh = col(C, 0xf4f4f2, 0.35);
    for (const pu of [u0, u0 + 0.55]) F.box(m, wh, pu, pu + 0.04, 0.04, 0.08, z + 0.3, z + 1.5);
    for (let k = 0; k < 10; k++)
      F.box(m, wh, u0 + 0.04, u0 + 0.55, 0.05, 0.07, z + 0.35 + k * 0.12, z + 0.37 + k * 0.12);
    F.box(
      m,
      col(C, R.pick([0xf4f2ec, 0x6f9ccf, 0xd8a0a8, 0x7aa07a, 0x3b3e42]), 0.95),
      u0 + 0.06,
      u0 + 0.5,
      0.07,
      0.1,
      z + 0.75,
      z + 1.33
    );
    C.solid(F.rect(u0, u0 + 0.6, 0, 0.12), z, z + 1.5);
  }
  function waschmaschine(C, F, u0, R, dryer = false) {
    const m = C.m,
      z = C.z,
      wh = col(C, 0xf4f4f2, 0.3);
    F.box(m, wh, u0, u0 + 0.6, 0, 0.6, z, z + 0.85);
    F.box(m, col(C, 0xdcdcd8, 0.4), u0 + 0.02, u0 + 0.58, 0.6, 0.605, z + 0.72, z + 0.83);
    F.box(m, col(C, 0x2a3a4a, 0.3), u0 + 0.38, u0 + 0.52, 0.605, 0.608, z + 0.75, z + 0.8);
    F.box(m, mats().led, u0 + 0.36, u0 + 0.365, 0.605, 0.609, z + 0.77, z + 0.775);
    // the round door: a steel ring, the dark glass
    disc(m, col(C, 0x8a8c8e, 0.35, 0.8), F, u0 + 0.3, 0.607, z + 0.4, 0.19, 18);
    disc(m, col(C, dryer ? 0x3a4a5a : 0x2a3a4a, 0.1), F, u0 + 0.3, 0.612, z + 0.4, 0.14, 18);
    C.solid(F.rect(u0, u0 + 0.6, 0, 0.64), z, z + 0.85);
    void R;
  }
  function baden(C, room, Pl, inner, outer, all) {
    const R = C.R,
      z = C.z,
      area = (room.x1 - room.x0) * (room.y1 - room.y0);
    dusche(C, Pl, all, R);
    let F;
    if (area > 7) {
      F = Pl.any(R.shuffle(all.slice()), 1.7, 0.75, 0.6, R.pick([0.02, 0.98]));
      if (F) wanne(C, F, R);
    }
    F = Pl.any(R.shuffle(all.slice()), 0.8, 0.5, 1.95, 0.5);
    if (F) waschtisch(C, F, R);
    F = Pl.any(R.shuffle(all.slice()), 0.72, 0.7, 1.1, 0.5);
    if (F) wc(C, F);
    F = Pl.any(R.shuffle(all.slice()), 0.6, 0.12, 1.5, 0.5);
    if (F) heizkoerper(C, F, R);
    // a washing machine here if the house has no utility room
    if (!C.P.rooms.some(r => r.kind === 'waschkueche')) {
      F = Pl.any(R.shuffle(all.slice()), 0.6, 0.64, 0.85, 0.98);
      if (F) waschmaschine(C, F, F.u0, R);
    }
    const r = Pl.floorFree(0.8, 0.55);
    if (r)
      C.m.box(
        col(C, R.pick([0x9aa8b4, 0xd8cbb5, 0x3b3e42, 0xc9ced3]), 1.0),
        r[0],
        r[1],
        r[2],
        r[3],
        z + 0.002,
        z + 0.014
      );
    return true;
  }
  // ---- the hall: hooks with jackets over a shoe bench, a shoe cabinet with the keys, a mirror, a runner ----
  function flur(C, room, Pl, inner, outer, all) {
    const R = C.R,
      z = C.z,
      T = mats(),
      m = C.m;
    let F = Pl.any(['x0', 'x1'], 1.0, 0.36, 1.85, 0.15);
    if (F) {
      const u0 = F.u0,
        panel = R.pick([col(C, WHITE, 0.4), T.eiche]);
      F.box(m, panel, u0, u0 + 1.0, 0, 0.02, z + 1.15, z + 1.85);
      for (let i = 0; i < 4; i++) {
        F.box(m, col(C, 0x3b3e42, 0.4, 0.3), u0 + 0.15 + i * 0.23, u0 + 0.17 + i * 0.23, 0.02, 0.09, z + 1.68, z + 1.7);
        if (R() < 0.8)
          F.box(
            m,
            col(C, R.pick([0x2a3a4a, 0x55585c, 0x7a3b2e, 0xc9b38f, 0x3f5a46, 0xd8352b]), 0.95),
            u0 + 0.06 + i * 0.23,
            u0 + 0.27 + i * 0.23,
            0.03,
            0.17,
            z + 0.95,
            z + 1.69
          );
      }
      // the bench with shoes under it
      F.box(m, panel, u0, u0 + 1.0, 0, 0.36, z + 0.44, z + 0.48);
      for (const pu of [u0 + 0.02, u0 + 0.94])
        F.box(m, col(C, BLACK, 0.5, 0.3), pu, pu + 0.04, 0.02, 0.34, z, z + 0.44);
      for (let i = 0; i < 3; i++)
        F.box(
          m,
          col(C, R.pick([0x1a1a1a, 0xf2f2ef, 0x5a3a26, 0x3a5a8a]), 0.6),
          u0 + 0.1 + i * 0.28,
          u0 + 0.22 + i * 0.28,
          0.06,
          0.32,
          z,
          z + 0.1
        );
      C.solid(F.rect(u0, u0 + 1.0, 0, 0.36), z, z + 0.48);
    }
    F = Pl.any(['x1', 'x0', 'y1'], 0.9, 0.3, 1.0, 0.7);
    if (F) {
      const u0 = F.u0,
        body = R.pick([col(C, WHITE, 0.35), col(C, 0x9a9c9c, 0.4), T.eiche]);
      F.box(m, body, u0, u0 + 0.9, 0, 0.3, z + 0.05, z + 0.95);
      F.box(m, body, u0 + 0.005, u0 + 0.445, 0.3, 0.31, z + 0.07, z + 0.93);
      F.box(m, body, u0 + 0.455, u0 + 0.895, 0.3, 0.31, z + 0.07, z + 0.93);
      DK.schale(C, F, u0 + 0.25, 0.15, z + 0.95);
      C.solid(F.rect(u0, u0 + 0.9, 0, 0.31), z, z + 0.95);
      if (Pl.wallFree(F.side, u0 + 0.1, u0 + 0.8, z + 1.15, z + 1.95)) {
        F.box(
          m,
          col(C, R.pick([BLACK, 0xb08d57, WHITE]), 0.4, 0.3),
          u0 + 0.15,
          u0 + 0.75,
          0,
          0.025,
          z + 1.15,
          z + 1.95
        );
        F.box(m, col(C, 0xb8c4c8, 0.22, 0.85), u0 + 0.17, u0 + 0.73, 0.025, 0.03, z + 1.17, z + 1.93);
        onWall(C, F, u0 + 0.1, u0 + 0.8, z + 1.1, z + 2.0);
      }
    }
    const cx = (room.x0 + room.x1) / 2;
    m.box(
      col(C, R.pick([0x55585c, 0x3b3e42, 0x8a8478]), 1.0),
      cx - 0.4,
      cx + 0.4,
      room.y0 + 0.4,
      Math.min(room.y1 - 0.4, room.y0 + 2.6),
      z + 0.002,
      z + 0.012
    );
    return true;
  }
  // ---- the utility room: washing machine and dryer, a shelf, the basket, a clothes horse ----
  function wirtschaft(C, room, Pl, inner, outer, all) {
    const R = C.R,
      z = C.z,
      m = C.m;
    let F = Pl.any(all, 1.24, 0.64, 0.9, 0.2);
    if (F) {
      waschmaschine(C, F, F.u0, R);
      waschmaschine(C, F, F.u0 + 0.64, R, true);
    }
    F = Pl.any(all, 0.9, 0.4, 1.8, 0.8);
    if (F) {
      const steel = col(C, 0xc8cacc, 0.4, 0.5);
      for (const pu of [F.u0, F.u0 + 0.87]) F.box(m, steel, pu, pu + 0.03, 0, 0.4, z, z + 1.8);
      for (const zz of [0.3, 0.75, 1.2, 1.65]) {
        F.box(m, steel, F.u0, F.u0 + 0.9, 0, 0.4, z + zz - 0.02, z + zz);
        for (let k = 0; k < 5; k++)
          if (R() < 0.7)
            F.box(
              m,
              col(C, R.pick([0xf4f2ec, 0x6f9ccf, 0xef8a62, 0x7fc29b, 0xd8352b, 0xc9b38f]), 0.5),
              F.u0 + 0.06 + k * 0.16,
              F.u0 + 0.18 + k * 0.16,
              0.08,
              0.3,
              z + zz,
              z + zz + R.r(0.14, 0.3)
            );
      }
      C.solid(F.rect(F.u0, F.u0 + 0.9, 0, 0.4), z, z + 1.8);
    }
    const r = Pl.floorFree(0.5, 0.4);
    if (r) {
      const cx = (r[0] + r[1]) / 2,
        cy = (r[2] + r[3]) / 2;
      m.lathe(
        col(C, R.pick([0xf4f2ec, 0x9aa8b4, 0xc9b38f]), 0.8),
        cx,
        cy,
        [
          [0.17, z],
          [0.22, z + 0.38],
        ],
        14,
        { caps: false }
      );
      m.cyl(col(C, R.pick([0x7a3b2e, 0x2f4561, 0xf4f2ec]), 0.95), cx, cy, z + 0.25, z + 0.33, 0.19, 0.2, 12);
    }
    room.name2 = 'Hauswirtschaftsraum';
    return true;
  }
  // ---- the cellar of today: the heating, the shelf of preserves, the workbench, bicycles, crates ----
  function keller(C, room, Pl, inner, outer, all) {
    const R = C.R,
      z = C.z,
      m = C.m;
    let F = Pl.any(all, Math.min(1.6, Math.max(Pl.S.y1.L, Pl.S.x0.L) - 0.3), 0.4, 1.9, 0.0);
    if (F) L.regal(C, F, F.w, 'Regal mit Eingemachtem durchsuchen');
    F = Pl.any(all, 1.3, 0.75, 1.9, 1.0);
    if (F) {
      // the boiler and the hot water tank, pipes into the ceiling
      const u0 = F.u0,
        wh = col(C, 0xf2f2ef, 0.35),
        pipe = col(C, 0xb87333, 0.35, 0.9);
      F.box(m, wh, u0, u0 + 0.6, 0, 0.6, z, z + 1.7);
      F.box(m, col(C, 0x2a3a4a, 0.3), u0 + 0.2, u0 + 0.4, 0.6, 0.605, z + 1.3, z + 1.42);
      F.box(m, mats().led, u0 + 0.42, u0 + 0.43, 0.6, 0.606, z + 1.35, z + 1.36);
      F.cyl(m, wh, u0 + 0.98, 0.35, z, z + 1.6, 0.3, 0.3, 14);
      for (const pu of [u0 + 0.15, u0 + 0.3, u0 + 0.45]) F.cyl(m, pipe, pu, 0.15, z + 1.7, C.room.z1, 0.018, 0.018, 6);
      F.rod(m, pipe, [u0 + 0.98, 0.35, z + 1.6], [u0 + 0.98, 0.35, C.room.z1], 0.018, 6);
      C.solid(F.rect(u0, u0 + 1.3, 0, 0.7), z, z + 1.7);
    }
    F = Pl.any(all, 1.6, 0.7, 1.7, 0.5);
    if (F) L.werkbank(C, F);
    F = Pl.any(all, 1.8, 0.4, 1.0, 0.5);
    if (F) {
      fahrrad(C, F, F.u0 + 0.1, 0.12, R);
      if (F.w > 1.7 && R.chance(0.6)) fahrrad(C, F, F.u0 + 0.1, 0.32, R);
      C.solid(F.rect(F.u0, F.u0 + 1.8, 0, 0.4), z, z + 1.0);
    }
    F = Pl.any(all, 0.8, 0.4, 0.7, 0.5);
    if (F)
      for (let k = 0; k < 2; k++)
        for (let j = 0; j < 2; j++) {
          const a = F.u0 + k * 0.4,
            zz = z + j * 0.32;
          F.box(m, col(C, R.pick([0x2a6a3a, 0x8a2a2a, 0x2a4a8a]), 0.6), a, a + 0.38, 0, 0.3, zz, zz + 0.3, {
            skip: 't',
          });
          for (let b = 0; b < 4; b++)
            F.cyl(m, col(C, 0x5a3a1a, 0.15), a + 0.08 + b * 0.075, 0.15, zz + 0.3, zz + 0.33, 0.025, 0.025, 6);
        }
    if (F) C.solid(F.rect(F.u0, F.u0 + 0.8, 0, 0.3), z, z + 0.64);
    return true;
  }
  // a bicycle leaning on the wall (its wheels as rings of rods), along the frame's u
  function fahrrad(C, F, u0, v, R) {
    const m = C.m,
      z = C.z,
      tyre = col(C, 0x1c1c1c, 0.8),
      fr = col(C, R.pick([0x2a4a8a, 0xd8352b, 0x2a2b2d, 0x6e8b74, 0xe8e6e0]), 0.4, 0.3),
      rr = 0.33,
      w0 = u0 + rr + 0.02,
      w1 = w0 + 1.05,
      P = (u, h) => F.P(u, v, z + h);
    for (const wu of [w0, w1]) {
      let prev = null;
      for (let k = 0; k <= 16; k++) {
        const t = (k / 16) * Math.PI * 2,
          p = P(wu + Math.cos(t) * rr, rr + Math.sin(t) * rr);
        if (prev) m.rod(tyre, prev, p, 0.018, 4);
        prev = p;
      }
      m.rod(col(C, 0x9a9c9e, 0.4, 0.8), P(wu - rr, rr), P(wu + rr, rr), 0.004, 3);
    }
    const bb = [w0 + 0.45, 0.3],
      st = [w0 + 0.32, 0.88],
      hd = [w1 - 0.18, 0.92];
    for (const [a, b] of [
      [[w0, rr], bb],
      [[w0, rr], st],
      [bb, st],
      [bb, hd],
      [st, hd],
      [hd, [w1, rr]],
    ])
      m.rod(fr, P(a[0], a[1]), P(b[0], b[1]), 0.018, 4);
    m.box(
      col(C, 0x1c1c1c, 0.7),
      ...(() => {
        const p = P(st[0], 0.94);
        return [p[0] - 0.1, p[0] + 0.1, p[1] - 0.05, p[1] + 0.05, p[2] - 0.03, p[2] + 0.02];
      })()
    );
    m.rod(col(C, 0x2a2a2a, 0.5), P(hd[0] - 0.02, 1.02), F.P(hd[0] - 0.02, v + 0.25, z + 1.02), 0.012, 4);
    m.rod(col(C, 0x2a2a2a, 0.5), P(hd[0] - 0.02, 1.02), F.P(hd[0] - 0.02, v - 0.25, z + 1.02), 0.012, 4);
    m.rod(fr, P(hd[0], 0.92), P(hd[0] - 0.02, 1.02), 0.016, 4);
  }
  // ---- the hooks of the look (zombie/z_innen*.js call them) ----
  // which look a room takes: the house's own ('heute'), or one of the kit's (kept old rooms)
  const KEEP90 = { bad: 'heute', kinderzimmer: 'heute' },
    KEEPDDR = {
      stube: 'ddr',
      wohnzimmer: 'ddr',
      schlafzimmer: 'ddr',
      kammer: 'ddr',
      bad: 'heute',
      kinderzimmer: 'heute',
    };
  function roomLook(P, r) {
    if (P.look === 'heute') return r.kind === 'boden' || r.kind === 'vorrat' ? 'nachwende' : 'heute';
    if (P.look === 'heute-90') return KEEP90[r.kind] || 'nachwende';
    if (P.look === 'heute-ddr') return KEEPDDR[r.kind] || 'nachwende';
    return null;
  }
  // the materials of a room of today (the kit's for the kept ones)
  function roomMats(P, r, M, R, look) {
    if (look !== 'heute') return null;
    const T = mats(),
      k = r.kind,
      wall =
        k === 'bad' || k === 'kueche' || k === 'keller' || k === 'waschkueche'
          ? M.putz
          : k === 'kinderzimmer'
            ? R.pick([T.wand.weiss, T.wand.mint, T.wand.rosa, T.wand.blau])
            : R.pick([
                T.wand.weiss,
                T.wand.weiss,
                T.wand.weiss,
                T.wand.salbei,
                T.wand.greige,
                T.wand.blau,
                T.wand.grau,
              ]);
    if (k === 'keller') return { wall: M.stein, floor: M.beton || M.stein, ceil: M.decke };
    if (k === 'bad') return { wall: M.putz, floor: T.badBoden, ceil: M.decke, tiles: T.badWand };
    if (k === 'kueche' || k === 'waschkueche')
      return { wall, floor: R.chance(0.7) ? T.fliesen : T.laminat, ceil: M.decke };
    if (k === 'flur') return { wall, floor: R.chance(0.6) ? T.fliesen : T.laminat, ceil: M.decke };
    return { wall, floor: T.laminat, ceil: M.decke };
  }
  // LED lights of today: flat round panels at the ceiling; bulbs where one stores things
  function ceiling(C, room, cx, cy, zc) {
    if (C.look !== 'heute') return false;
    const k = room.kind;
    if (k === 'kueche') return true; // the kitchen hangs its own (zeile, esstisch)
    if (k === 'keller' || k === 'waschkueche' || k === 'vorrat' || k === 'boden') {
      L.deckenlampe(C, cx, cy, zc, 'bulb');
      return true;
    }
    if (k === 'flur') {
      // one or two panels along the hall
      const n = room.y1 - room.y0 > 4.5 ? 2 : 1;
      for (let i = 0; i < n; i++)
        C.lamp([cx, room.y0 + ((room.y1 - room.y0) * (i + 0.5)) / n, zc - 0.025], 'fluter', 0.2);
      return true;
    }
    if (k === 'schlafzimmer' || k === 'kinderzimmer' || k === 'kammer') {
      if (C.R.chance(0.4)) {
        C.m.cyl(col(C, 0x2a2826, 0.6), cx, cy, zc - 0.5, zc, 0.004, 0.004, 4);
        C.lamp([cx, cy, zc - 0.55], C.R.pick(['pendant', 'kugel']), 0.2);
        return true;
      }
    }
    C.lamp([cx, cy, zc - 0.025], 'fluter', k === 'bad' ? 0.17 : 0.27);
    return true;
  }
  function furnish(C, room, Pl, inner, outer, all) {
    if (C.look !== 'heute') return false;
    mats();
    C.arts = new Set();
    const k = room.kind;
    if (k === 'stube' || k === 'wohnzimmer') return wohnen(C, room, Pl, inner, outer, all);
    if (k === 'kueche') return kochen(C, room, Pl, inner, outer, all);
    if (k === 'schlafzimmer') return schlafen(C, room, Pl, inner, outer, all);
    if (k === 'kinderzimmer') return kinder(C, room, Pl, inner, outer, all);
    if (k === 'kammer') return kammer(C, room, Pl, inner, outer, all);
    if (k === 'bad') return baden(C, room, Pl, inner, outer, all);
    if (k === 'flur') return flur(C, room, Pl, inner, outer, all);
    if (k === 'waschkueche') return wirtschaft(C, room, Pl, inner, outer, all);
    if (k === 'keller') return keller(C, room, Pl, inner, outer, all);
    return false;
  }
  // the finishing pass of a room of today: prints on free walls, small things on every top; the kept rooms get the kit's, with a
  // tablet on the coffee table of the old living room
  function deko(C, Pl, room, inner, outer) {
    if (C.look !== 'heute') {
      if ((room.kind === 'stube' || room.kind === 'wohnzimmer') && C.tops) {
        const t = C.tops.find(q => q.kind === 'couchtisch' && q.u1 - q.u0 > 0.35);
        if (t) {
          tablet(C, t.F, t.u0 + 0.14, t.v, t.z);
          t.u0 += 0.3;
        }
      }
      return false;
    }
    const R = C.R,
      z = C.z,
      k = room.kind,
      all = inner.concat(outer),
      area = (room.x1 - room.x0) * (room.y1 - room.y0);
    if (k === 'stube' || k === 'wohnzimmer' || k === 'schlafzimmer' || k === 'kammer' || k === 'flur') {
      const n = area > 14 ? 2 : 1;
      for (let i = 0; i < n; i++)
        hang(C, Pl, all, 0.5, 0.7, z + 1.55, (Fw, u) =>
          print(C, Fw, u, z + 1.55, 0.5, 0.7, artCell(C, [0, 1, 2]), R.pick([BLACK, WHITE, 0xb08d57]))
        );
    }
    fill(C, R);
    return true;
  }
  // small things of today on the registered tops: candles, a vase, photo frames, books, a plant, the tablet or the remote
  function fill(C, R) {
    for (const t of C.tops || []) {
      const list =
        t.kind === 'couch'
          ? [R.pick(['tablet', 'laptop']), 'fernbedienung', R.pick(['kerze', 'schale', 'buecher'])]
          : t.kind === 'tisch'
            ? [R.pick(['schale', 'kerze', 'pflanze']), 'zeitung']
            : t.kind === 'low'
              ? ['pflanze', 'kerze']
              : t.kind === 'board'
                ? ['foto', 'vase', 'kerze', 'buecher']
                : t.kind === 'regal'
                  ? ['pflanze', 'foto']
                  : ['foto', 'pflanze'];
      let u = t.u0;
      // (the tablet or laptop first: it must find its place)
      const order = t.kind === 'couch' ? [list[0]].concat(R.shuffle(list.slice(1))) : R.shuffle(list.slice());
      for (const it of order) {
        const need =
          it === 'laptop'
            ? 0.4
            : it === 'tablet' || it === 'zeitung' || it === 'schale'
              ? 0.32
              : it === 'buecher'
                ? 0.3
                : 0.18;
        if (u + need > t.u1) continue;
        const c = u + need / 2,
          F = t.F,
          zz = t.z;
        if (it === 'laptop') laptop(C, F, c, t.v, zz, R.chance(0.5));
        else if (it === 'tablet') tablet(C, F, c, t.v, zz);
        else if (it === 'fernbedienung')
          F.box(C.m, col(C, 0x1c1d1f, 0.4), c - 0.025, c + 0.025, t.v - 0.09, t.v + 0.09, zz, zz + 0.018);
        else if (it === 'kerze') {
          F.cyl(
            C.m,
            col(C, R.pick([0xf4f0e0, 0xd8cbb5, 0x9aa8b4]), 0.6),
            c,
            t.v,
            zz,
            zz + R.r(0.08, 0.15),
            0.035,
            0.035,
            10
          );
          F.cyl(C.m, col(C, R.pick([0xc8a050, 0x3b3e42]), 0.4, 0.5), c, t.v, zz, zz + 0.012, 0.06, 0.06, 12);
        } else if (it === 'buecher')
          for (let b = 0; b < 3; b++)
            F.box(
              C.m,
              col(C, R.pick([0x7a3b2e, 0x3f5a46, 0x2f4561, 0xd9cdb5, 0x5b4a6e]), 0.7),
              c - 0.13 + b * 0.01,
              c + 0.11 - b * 0.01,
              t.v - 0.09,
              t.v + 0.09 - b * 0.01,
              zz + b * 0.03,
              zz + b * 0.03 + 0.03
            );
        else if (it === 'pflanze') smallPlant(C, ...F.P(c, t.v, 0).slice(0, 2), zz);
        else if (DK[it]) DK[it](C, F, c, t.v, zz);
        u += need + 0.05;
      }
    }
    C.tops = [];
  }
  // the curtains of a room of today: drapes at the sides, a plain net curtain, or a pleated blind in the reveal; kitchen and bath barer
  function curtains(C, s, h, P, folds) {
    if (C.look !== 'heute') return false;
    const kind = C.room.kind,
      R = C.R,
      fm = C.furn,
      w = h.u1 - h.u0,
      cz1 = h.z1 + 0.15,
      k = R();
    const blind = frac => {
      // a pleated blind on the frame, pulled down part of the way
      const z1 = h.z1 - 0.06,
        z0 = z1 - (h.z1 - h.z0 - 0.1) * frac,
        p = P(h.u0 + 0.07, 0, (C.P.t || 0.4) - 0.13),
        q = P(h.u1 - 0.07, 0, (C.P.t || 0.4) - 0.11);
      fm.box(
        col(C, R.pick([0xf0ebe0, 0xe4dccf, 0xd2d6d8]), 0.95),
        Math.min(p[0], q[0]),
        Math.max(p[0], q[0]),
        Math.min(p[1], q[1]),
        Math.max(p[1], q[1]),
        z0,
        z1
      );
    };
    if (kind === 'bad' || kind === 'waschkueche') {
      if (k < 0.6) blind(0.55);
      return true;
    }
    if (kind === 'kueche') {
      if (k < 0.5) blind(0.3);
      return true;
    }
    if (k < 0.5) {
      const side = col(
        C,
        R.pick(
          kind === 'kinderzimmer'
            ? [0x9cc3e0, 0xf2c14e, 0xe8a0a8, 0x9ad0b0]
            : [0xd9d4ca, 0x9a9690, 0x6e7f72, 0x51647a, 0xc9b38f, 0xe8e2d4]
        ),
        0.95
      );
      folds(fm, side, P, h.u0 - 0.5, h.u0 - 0.05, -0.1, Math.max(C.room.z0 + 0.02, h.z0 - 0.75), cz1, s.n, 4);
      folds(fm, side, P, h.u1 + 0.05, h.u1 + 0.5, -0.1, Math.max(C.room.z0 + 0.02, h.z0 - 0.75), cz1, s.n, 4);
      const r0 = P(h.u0 - 0.6, 0, -0.12),
        r1 = P(h.u1 + 0.6, 0, -0.12);
      fm.rod(
        col(C, R.pick([BLACK, 0x8a8c8e]), 0.4, 0.5),
        [r0[0], r0[1], cz1 + 0.03],
        [r1[0], r1[1], cz1 + 0.03],
        0.01,
        5
      );
    } else if (k < 0.75) {
      folds(fm, C.M.stores, P, h.u0 - 0.1, h.u1 + 0.1, -0.06, h.z0 - 0.02, cz1, s.n);
      const r0 = P(h.u0 - 0.2, 0, -0.08),
        r1 = P(h.u1 + 0.2, 0, -0.08);
      fm.rod(col(C, 0xd8d0b8, 0.4, 0.3), [r0[0], r0[1], cz1 + 0.03], [r1[0], r1[1], cz1 + 0.03], 0.01, 5);
    } else blind(R.r(0.15, 0.4));
    void w;
    return true;
  }
  // the old wall unit's TV niche with today's set: a small flat TV and the router beside it
  function tv(C, F, u, v, z) {
    flatTV(C, F, u - 0.08, v + 0.05, z, 0.52);
    router(C, F, u + 0.27, v - 0.05, z);
    C.spot('tv', F.P(u, v + 1.4, z - 0.76), F, null);
    return true;
  }
  const HEUTE = { room: roomLook, mats: roomMats, ceiling, furnish, deko, curtains, tv, leaf: 0xf2f1ec };
  ZIEINR.looks.heute = HEUTE;
  ZIEINR.looks['heute-90'] = { room: roomLook, mats: roomMats, ceiling, furnish, deko, curtains, tv };
  ZIEINR.looks['heute-ddr'] = { room: roomLook, mats: roomMats, ceiling, furnish, deko, curtains, tv, leaf: 0xf0ece0 };
  Object.assign(S, { mats, roomLook, LOOKS: ['heute', 'heute-90', 'heute-ddr'] });
  return S;
})();
window.HHEUTE = HHEUTE;
