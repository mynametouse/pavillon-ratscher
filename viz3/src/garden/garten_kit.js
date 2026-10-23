// ===================== feat/garten (Falko, 23.10.2026): furnishing kit for the garden buildings (bungalow, wooden hut, greenhouse) =====================
// Small procedural things in a building's local frame (x along its heading, y to the left, z up; see site_base.js), a few canvas
// textures and materials, and the registries the interactive part (garden/garten_in.js) reads: lamps, seats, actions.
// Randomness comes from a local generator – the global rnd() stream stays as it was, so trees, grass etc. further down do not change.
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import { V } from '../core/head.js';
import { ANISO, dimIndoor, patchSV, plain } from '../core/assets.js';
import { MAT } from '../core/mats.js';
import { tagPh } from '../core/geo.js';
import { boardMat, gB } from './site_base.js';
// ---- local random numbers (own seed per use) ----
export function rng(seed = 1) {
  let s = seed % 2147483647 || 1;
  const f = () => (s = (s * 16807) % 2147483647) / 2147483647;
  f.r = (a, b) => a + (b - a) * f();
  return f;
}
const R0 = rng(4711);
// ---- canvas textures (small: 256–512 px) ----
function ctex(w, h, draw, rep = [1, 1]) {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  draw(c.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(rep[0], rep[1]);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = ANISO;
  return t;
}
// white wall tiles 10 × 10 cm with grey joints (texture = 0.6 m)
const tileTex = ctex(
  256,
  256,
  (q, w) => {
    q.fillStyle = '#b9b6ae';
    q.fillRect(0, 0, w, w);
    const n = 6,
      s = w / n;
    for (let i = 0; i < n; i++)
      for (let j = 0; j < n; j++) {
        const k = 0.94 + R0() * 0.06;
        q.fillStyle = `rgb(${Math.round(244 * k)},${Math.round(243 * k)},${Math.round(236 * k)})`;
        q.fillRect(i * s + 2, j * s + 2, s - 3, s - 3);
        q.fillStyle = 'rgba(255,255,255,0.35)';
        q.fillRect(i * s + 3, j * s + 3, s - 8, 3);
      }
  },
  [1 / 0.6, 1 / 0.6]
);
// rag rug (Flickenteppich): woven stripes of old fabric (texture = 1 m along the weave)
const ragTex = ctex(
  128,
  512,
  (q, w, h) => {
    const cols = ['#8a3b32', '#c9b48a', '#3e5b7a', '#d8cdb8', '#6f7f4f', '#b0643e', '#e6dccb', '#5a4a6a', '#a8c0c8'];
    let y = 0;
    while (y < h) {
      const bh = 6 + R0() * 22,
        c = cols[Math.floor(R0() * cols.length)];
      q.fillStyle = c;
      q.fillRect(0, y, w, bh);
      for (let k = 0; k < bh * 3; k++) {
        q.fillStyle = `rgba(${R0() > 0.5 ? '255,255,255' : '0,0,0'},${0.06 + R0() * 0.1})`;
        q.fillRect(R0() * w, y + R0() * bh, 2 + R0() * 6, 1);
      }
      y += bh;
    }
    for (let x = 0; x < w; x += 4) {
      q.fillStyle = 'rgba(0,0,0,0.12)';
      q.fillRect(x, 0, 1, h);
    }
  },
  [1 / 0.5, 1]
);
// gingham (checked cotton): kitchen curtains red/white, bedding blue/white
function gingham(c, n = 8) {
  return ctex(
    128,
    128,
    (q, w) => {
      q.fillStyle = '#f6f3ec';
      q.fillRect(0, 0, w, w);
      const s = w / n,
        col = new THREE.Color(c);
      for (let i = 0; i < n; i++) {
        q.fillStyle = `rgba(${Math.round(col.r * 255)},${Math.round(col.g * 255)},${Math.round(col.b * 255)},0.55)`;
        if (i % 2 === 0) {
          q.fillRect(i * s, 0, s, w);
          q.fillRect(0, i * s, w, s);
        }
      }
      for (let k = 0; k < 900; k++) {
        q.fillStyle = `rgba(0,0,0,${R0() * 0.05})`;
        q.fillRect(R0() * w, R0() * w, 1, 2);
      }
    },
    [1 / 0.12, 1 / 0.12]
  );
}
// four little pictures in one image (2 × 2): Thuringian hills, flowers in a jug, a fern (botanical print), the garden with the bungalow
const artTex = ctex(512, 512, (q, w) => {
  const S = w / 2;
  // 0: hills at evening
  {
    const g = q.createLinearGradient(0, 0, 0, S);
    g.addColorStop(0, '#f1c98f');
    g.addColorStop(0.55, '#e9b07a');
    g.addColorStop(1, '#a3b07a');
    q.fillStyle = g;
    q.fillRect(0, 0, S, S);
    const hill = (y0, a, f, ph, c) => {
      q.fillStyle = c;
      q.beginPath();
      q.moveTo(0, S);
      for (let x = 0; x <= S; x += 4) q.lineTo(x, y0 + Math.sin(x * f + ph) * a + Math.sin(x * f * 2.7 + ph) * a * 0.3);
      q.lineTo(S, S);
      q.fill();
    };
    hill(120, 14, 0.02, 0.5, '#8d9a6a');
    hill(155, 12, 0.03, 2.0, '#6e8452');
    hill(195, 10, 0.025, 4.0, '#4f6a3e');
    for (let i = 0; i < 9; i++) {
      const x = 20 + i * 26 + R0() * 10,
        y = 150 + R0() * 40;
      q.fillStyle = '#34482c';
      q.beginPath();
      q.moveTo(x, y - 26);
      q.lineTo(x - 8, y);
      q.lineTo(x + 8, y);
      q.fill();
    }
    q.fillStyle = 'rgba(255,240,200,0.8)';
    q.beginPath();
    q.arc(190, 70, 16, 0, Math.PI * 2);
    q.fill();
  }
  // 1: flowers in a jug
  {
    q.fillStyle = '#e8dfcc';
    q.fillRect(S, 0, S, S);
    q.fillStyle = '#d6c8ab';
    q.fillRect(S, S * 0.72, S, S * 0.28);
    q.fillStyle = '#5d7fa3';
    q.beginPath();
    q.ellipse(S + S / 2, S * 0.7, 34, 46, 0, 0, Math.PI * 2);
    q.fill();
    q.fillRect(S + S / 2 - 18, S * 0.42, 36, 30);
    for (let i = 0; i < 26; i++) {
      const a = -Math.PI / 2 + (R0() - 0.5) * 2.2,
        r = 40 + R0() * 60,
        x = S + S / 2 + Math.cos(a) * r,
        y = S * 0.42 + Math.sin(a) * r * 0.9;
      q.strokeStyle = '#4c6b3a';
      q.lineWidth = 2;
      q.beginPath();
      q.moveTo(S + S / 2, S * 0.45);
      q.lineTo(x, y);
      q.stroke();
      q.fillStyle = ['#d8452f', '#f3c43b', '#f4f1ea', '#c8508a', '#e8873a'][i % 5];
      q.beginPath();
      q.arc(x, y, 6 + R0() * 6, 0, Math.PI * 2);
      q.fill();
    }
  }
  // 2: fern, botanical print
  {
    q.fillStyle = '#efe8d6';
    q.fillRect(0, S, S, S);
    q.strokeStyle = '#3f5f35';
    q.fillStyle = '#4f7442';
    q.lineWidth = 2;
    q.beginPath();
    q.moveTo(S / 2, S + S * 0.92);
    q.quadraticCurveTo(S / 2 + 10, S + S * 0.5, S / 2 - 6, S + S * 0.08);
    q.stroke();
    for (let i = 0; i < 18; i++) {
      const t = i / 18,
        y = S + S * (0.88 - t * 0.78),
        L = 70 * Math.sin(Math.PI * (0.15 + t * 0.85)) + 6;
      for (const sg of [-1, 1]) {
        q.beginPath();
        q.ellipse(S / 2 + sg * L * 0.5, y, L * 0.5, 4, sg * 0.25, 0, Math.PI * 2);
        q.fill();
      }
    }
    q.fillStyle = '#6b5b45';
    q.font = 'italic 14px serif';
    q.fillText('Dryopteris filix-mas', S * 0.18, S + S * 0.97);
  }
  // 3: the garden: green bungalow under trees
  {
    q.fillStyle = '#a9c7d8';
    q.fillRect(S, S, S, S * 0.5);
    q.fillStyle = '#7f9f55';
    q.fillRect(S, S * 1.5, S, S * 0.5);
    q.fillStyle = '#5c7e3e';
    for (let i = 0; i < 5; i++) {
      q.beginPath();
      q.arc(S + 20 + i * 52, S * 1.38, 34 + R0() * 10, 0, Math.PI * 2);
      q.fill();
    }
    q.fillStyle = '#8aa37c';
    q.fillRect(S + 80, S * 1.45, 100, 60);
    q.fillStyle = '#e8e6df';
    q.beginPath();
    q.moveTo(S + 70, S * 1.46);
    q.lineTo(S + 130, S * 1.3);
    q.lineTo(S + 190, S * 1.46);
    q.fill();
    q.fillStyle = '#f4f2ea';
    q.fillRect(S + 118, S * 1.52, 22, 40);
    q.fillRect(S + 92, S * 1.52, 18, 18);
    q.fillRect(S + 150, S * 1.52, 18, 18);
  }
});
// end-grain cutting board (Klingenholz): squares of maple and walnut with their growth rings (texture = 0.32 m)
const endTex = ctex(
  128,
  128,
  (q, w) => {
    const n = 4,
      s = w / n;
    for (let i = 0; i < n; i++)
      for (let j = 0; j < n; j++) {
        const dark = (i + j) % 2 === 1;
        q.fillStyle = dark ? '#5b3b26' : '#d9b98a';
        q.fillRect(i * s, j * s, s, s);
        q.strokeStyle = dark ? 'rgba(30,15,5,0.45)' : 'rgba(120,80,40,0.35)';
        const cx = i * s + (R0() < 0.5 ? -s * 0.6 : s * 1.6),
          cy = j * s + R0() * s;
        q.save();
        q.beginPath();
        q.rect(i * s, j * s, s, s);
        q.clip();
        for (let r = 4; r < s * 2.4; r += 2.5 + R0() * 2) {
          q.lineWidth = 0.6 + R0() * 0.8;
          q.beginPath();
          q.arc(cx, cy, r, 0, Math.PI * 2);
          q.stroke();
        }
        q.restore();
      }
  },
  [1 / 0.32, 1 / 0.32]
);
// solar cells: 6 × 10 dark blue cells with silver gaps and busbars (the whole module face)
const pvTex = ctex(128, 256, (q, w, h) => {
  q.fillStyle = '#b9c0c8';
  q.fillRect(0, 0, w, h);
  const nx = 6,
    ny = 10,
    cw = (w - 6) / nx,
    ch = (h - 6) / ny;
  for (let i = 0; i < nx; i++)
    for (let j = 0; j < ny; j++) {
      const x = 3 + i * cw,
        y = 3 + j * ch;
      q.fillStyle = `rgb(${22 + R0() * 6},${32 + R0() * 6},${58 + R0() * 10})`;
      q.fillRect(x + 1, y + 1, cw - 2, ch - 2);
      q.fillStyle = 'rgba(200,210,220,0.35)';
      for (const f of [0.33, 0.67]) q.fillRect(x + 1, y + ch * f, cw - 2, 1);
    }
});
// ---- materials ----
export const KM = {
  tiles: dimIndoor(plain({ map: tileTex, roughness: 0.22, metalness: 0.02 }), 0.75, 0.4),
  rag: plain({ map: ragTex, roughness: 0.96 }),
  curtainRed: plain({ map: gingham(0xb8352c), roughness: 0.9, side: THREE.DoubleSide }),
  curtainLinen: plain({ color: 0xf1ebdc, roughness: 0.92, side: THREE.DoubleSide, transparent: true, opacity: 0.86 }),
  duvet: plain({ map: gingham(0x5b7ea3, 10), roughness: 0.9 }),
  art: plain({ map: artTex, roughness: 0.75 }),
  pvCells: plain({ map: pvTex, roughness: 0.18, metalness: 0.25 }),
  endgrain: plain({ map: endTex, roughness: 0.6 }),
  curtainSage: plain({ color: 0x93a084, roughness: 0.95, side: THREE.DoubleSide }),
  wardrobe: dimIndoor(plain({ color: 0xd9e3e8, roughness: 0.55 }), 0.8, 0.3), // dove blue, almost white (Falko)
  wardrobeTrim: dimIndoor(plain({ color: 0xbccbd4, roughness: 0.5 }), 0.8, 0.3),
  front: dimIndoor(plain({ color: 0xf1ece0, roughness: 0.45 }), 0.8, 0.3), // kitchen fronts, cream
  enamel: plain({ color: 0xf4f2ec, roughness: 0.2, metalness: 0.05 }),
  enamelRed: plain({ color: 0xa8322a, roughness: 0.25, metalness: 0.1 }),
  enamelGreen: plain({ color: 0x3d6b4f, roughness: 0.3, metalness: 0.1 }),
  terracotta: plain({ color: 0xb4653f, roughness: 0.88 }),
  terracottaDark: plain({ color: 0x8f4c30, roughness: 0.9 }),
  seedling: plain({ color: 0x78b04e, roughness: 0.8, side: THREE.DoubleSide }),
  traySoil: plain({ color: 0x5a4838, roughness: 1 }),
  herb: plain({ color: 0x4f7d3a, roughness: 0.85, side: THREE.DoubleSide }),
  herbDry: plain({ color: 0x6f7a4a, roughness: 0.95 }),
  red: plain({ color: 0xc8352b, roughness: 0.6 }),
  tomato: plain({ color: 0xc2352a, roughness: 0.4 }),
  yellow: plain({ color: 0xe8b93a, roughness: 0.6 }),
  cream: plain({ color: 0xf3ead6, roughness: 0.6 }),
  blackPlastic: plain({ color: 0x1d1d1b, roughness: 0.7 }),
  twine: plain({ color: 0xc8ad7a, roughness: 0.95 }),
  straw: plain({ color: 0xd9bf7a, roughness: 0.9 }),
  bakelite: plain({ color: 0x3a2a20, roughness: 0.35 }),
  porcelain: plain({ color: 0xf2efe6, roughness: 0.3 }),
  glassJar: plain({ color: 0xcfdcd6, roughness: 0.1, metalness: 0.1, transparent: true, opacity: 0.5 }),
  cord: plain({ color: 0x2a2724, roughness: 0.6 }),
  cloth: [0x7a3b2e, 0x3f5a46, 0x2f4561, 0xcdbb9a, 0x8c6b4f, 0x5d6f86].map(c => plain({ color: c, roughness: 0.95 })),
};
KM.glassJar.depthWrite = false;
KM.wall = dimIndoor(plain({ color: 0xf6efe2, roughness: 0.85 }), 0.7, 0.45); // warm white lining of the bungalow
KM.ceil = dimIndoor(boardMat(0xd9b98c, 0.1, false, { wear: 0.05 }), 0.75, 0.25); // pine boards on the ceiling (Datsche)
KM.velvet = plain({ color: 0x55705a, roughness: 0.92 }); // bottle-green upholstery
// the same material for use indoors: less sky light (as the walls of the site buildings, dimIndoor), one copy per material
const INDOOR = new Map();
export function indoor(m, k = 0.62, desat = 0.45) {
  if (!m || !m.isMaterial) return m;
  if (!INDOOR.has(m)) {
    const c = m.clone();
    delete c.userData.svPatched;
    c.userData.svDim = [k, desat];
    if (m.userData.grime) delete c.userData.grime;
    INDOOR.set(m, patchSV(c));
  }
  return INDOOR.get(m);
}
KM.floor = indoor(MAT.oakF, 0.8, 0.25);
// a garment on a hanger: broad side facing ±y, shoulders across x (width w), hanging from zTop down by len
export function garment(g, cx, cy, zTop, w, len, d, m) {
  soft(g, cx - w / 2, cx + w / 2, cy - d / 2, cy + d / 2, zTop - 0.13, zTop, 0.05, m);
  soft(g, cx - w * 0.44, cx + w * 0.44, cy - d * 0.42, cy + d * 0.42, zTop - len, zTop - 0.08, 0.035, m);
  for (const s of [-1, 1])
    soft(
      g,
      cx + s * (w / 2 - 0.045) - 0.045,
      cx + s * (w / 2 - 0.045) + 0.045,
      cy - d * 0.35,
      cy + d * 0.35,
      zTop - len * 0.8,
      zTop - 0.06,
      0.03,
      m
    );
  put(g, new THREE.TorusGeometry(0.03, 0.004, 4, 10, Math.PI * 1.4), MAT.steel, cx, cy, zTop + 0.03, {
    rz: -0.2 * Math.PI,
    cast: false,
  });
}
// upholstered armchair (wooden legs, cushion, back and arms); the back is on the side 'back' ('-y' = towards −y …)
export function armchair(g, x0, x1, y0, y1, z, m, back = '-y') {
  const sh = z + 0.42,
    bk = 0.2,
    ar = 0.13,
    ax = back === '-y' || back === '+y';
  for (const x of [x0 + 0.06, x1 - 0.06])
    for (const y of [y0 + 0.06, y1 - 0.06])
      put(g, new THREE.CylinderGeometry(0.018, 0.013, 0.14, 8), MAT.oak, x, y, z + 0.07, { cast: false });
  soft(g, x0, x1, y0, y1, z + 0.14, sh - 0.1, 0.04, m);
  if (ax) {
    const yb0 = back === '-y' ? y0 : y1 - bk,
      yb1 = back === '-y' ? y0 + bk : y1;
    soft(
      g,
      x0 + ar - 0.02,
      x1 - ar + 0.02,
      back === '-y' ? y0 + bk - 0.02 : y0,
      back === '-y' ? y1 : y1 - bk + 0.02,
      sh - 0.12,
      sh,
      0.06,
      m,
      { puff: 0.02 }
    );
    soft(g, x0, x1, yb0, yb1, sh - 0.12, z + 0.98, 0.08, m);
    for (const [a0, a1] of [
      [x0, x0 + ar],
      [x1 - ar, x1],
    ])
      soft(g, a0, a1, y0, y1, sh - 0.14, z + 0.66, 0.05, m);
  } else {
    const xb0 = back === '-x' ? x0 : x1 - bk,
      xb1 = back === '-x' ? x0 + bk : x1;
    soft(
      g,
      back === '-x' ? x0 + bk - 0.02 : x0,
      back === '-x' ? x1 : x1 - bk + 0.02,
      y0 + ar - 0.02,
      y1 - ar + 0.02,
      sh - 0.12,
      sh,
      0.06,
      m,
      { puff: 0.02 }
    );
    soft(g, xb0, xb1, y0, y1, sh - 0.12, z + 0.98, 0.08, m);
    for (const [a0, a1] of [
      [y0, y0 + ar],
      [y1 - ar, y1],
    ])
      soft(g, x0, x1, a0, a1, sh - 0.14, z + 0.66, 0.05, m);
  }
}
// a lamp's glowing part: own material each, its emissive is switched at run time (garden/garten_in.js)
export function bulbMat(col = 0xfff2d6) {
  return new THREE.MeshStandardMaterial({ color: col, emissive: 0xffd28a, emissiveIntensity: 0, roughness: 0.3 });
}
// ---- palette: the plain-coloured parts of a building share one material (colour, roughness and metalness come from two tiny images,
// each part's UVs point at its swatch), so render/zmerge.js folds them into a few draw calls instead of one per colour ----
const PAL = (() => {
  const N = 64,
    C = 4,
    cells = new Map(),
    mk = () => {
      const c = document.createElement('canvas');
      c.width = c.height = N;
      return c;
    },
    col = mk(),
    orm = mk(),
    qc = col.getContext('2d'),
    qo = orm.getContext('2d');
  qc.fillStyle = '#ffffff';
  qc.fillRect(0, 0, N, N);
  qo.fillStyle = 'rgb(255,200,0)';
  qo.fillRect(0, 0, N, N);
  const tex = (c, srgb) => {
    const t = new THREE.CanvasTexture(c);
    t.colorSpace = srgb ? THREE.SRGBColorSpace : THREE.NoColorSpace;
    t.magFilter = t.minFilter = THREE.NearestFilter;
    t.generateMipmaps = false;
    return t;
  };
  const tc = tex(col, true),
    to = tex(orm, false);
  const mat = side => {
    const m = plain({ map: tc, roughnessMap: to, metalnessMap: to, roughness: 1, metalness: 1, side });
    m.name = 'garten-palette';
    return m;
  };
  const M = { front: mat(THREE.FrontSide), double: mat(THREE.DoubleSide) };
  function uv(m) {
    const key = m.color.getHexString() + '|' + m.roughness.toFixed(2) + '|' + m.metalness.toFixed(2);
    let i = cells.get(key);
    if (i === undefined) {
      i = cells.size;
      if (i >= (N / C) * (N / C)) return null;
      cells.set(key, i);
      const x = (i % (N / C)) * C,
        y = Math.floor(i / (N / C)) * C;
      qc.fillStyle = '#' + m.color.getHexString();
      qc.fillRect(x, y, C, C);
      qo.fillStyle = `rgb(255,${Math.round(m.roughness * 255)},${Math.round(m.metalness * 255)})`;
      qo.fillRect(x, y, C, C);
      tc.needsUpdate = to.needsUpdate = true;
    }
    return [((i % (N / C)) * C + C / 2) / N, 1 - (Math.floor(i / (N / C)) * C + C / 2) / N];
  }
  return { M, uv, cells };
})();
// give the plain-coloured meshes of a building group the palette material (not those in keep: their colour changes while playing)
export function paletteize(g, keep = []) {
  const K = new Set(keep);
  for (const l of GLAMPS) if (l.mat) K.add(l.mat);
  K.add(KM.traySoil);
  K.add(KM.tomato);
  const list = [];
  g.traverse(o => {
    if (o.isMesh && !o.isInstancedMesh && !o.userData.noMerge && !Array.isArray(o.material)) list.push(o);
  });
  let n = 0;
  for (const o of list) {
    const m = o.material;
    if (K.has(m) || !m.isMeshStandardMaterial || m.isMeshPhysicalMaterial || m.map || m.normalMap || m.transparent)
      continue;
    if (m.userData.svDim || m.userData.grime || m.vertexColors || (m.emissive && m.emissive.getHex() !== 0)) continue;
    const t = PAL.uv(m);
    if (!t) continue;
    const geo = o.geometry.clone();
    let uv = geo.attributes.uv;
    if (!uv) {
      uv = new THREE.BufferAttribute(new Float32Array(geo.attributes.position.count * 2), 2);
      geo.setAttribute('uv', uv);
    }
    for (let i = 0; i < uv.count; i++) uv.setXY(i, t[0], t[1]);
    o.geometry = geo;
    o.material = m.side === THREE.DoubleSide ? PAL.M.double : PAL.M.front;
    n++;
  }
  return n;
}
export { PAL };
// furniture under a roof casts no sun shadow (the roof and walls shade the room anyway): fewer meshes in the shadow pass and fewer
// merge buckets (cast / no cast). inside(lx, ly, z) tells which local points are in the room
export function interiorNoShadow(g, inside) {
  g.updateMatrixWorld(true);
  const inv = g.matrixWorld.clone().invert(),
    v = new THREE.Vector3();
  let n = 0;
  g.traverse(o => {
    if (!o.isMesh || !o.castShadow) return;
    if (!o.geometry.boundingSphere) o.geometry.computeBoundingSphere();
    v.copy(o.geometry.boundingSphere.center).applyMatrix4(o.matrixWorld).applyMatrix4(inv);
    if (inside(v.x, -v.z, v.y)) {
      o.castShadow = false;
      n++;
    }
  });
  return n;
}
// ---- registries for garden/garten_in.js (local coordinates; the world position follows the building when it is moved in the plan view) ----
export const GLAMPS = []; // {key, b, lx, ly, z, mat, dist, inten, color, sw: [lx, ly, z], label, room: (x, y, z) => bool}
export const GSEATS = []; // {key, b, lx, ly, eye, yaw (local compass deg), pitch, kind: 'sit'|'lie', label, r, at: [lx, ly]}
export const GACTS = []; // {key, b, lx, ly, z, r, label: () => text|null, run: ctx => …}
// ---- placing meshes in a building group (local frame) ----
export function put(g, geo, m, lx, ly, z, o = {}) {
  const me = new THREE.Mesh(geo, m);
  me.position.copy(V(lx, ly, z));
  if (o.ry) me.rotation.y = o.ry;
  if (o.rx) me.rotation.x = o.rx;
  if (o.rz) me.rotation.z = o.rz;
  if (o.order) me.rotation.order = o.order;
  if (o.s) me.scale.set(o.s[0], o.s[1], o.s[2]);
  me.castShadow = o.cast ?? true;
  me.receiveShadow = true;
  g.add(me);
  return tagPh(me);
}
// rotation about the vertical that turns three's +Z (a plane's front) towards a local direction
export const FACE = { '-y': 0, '+y': Math.PI, '+x': Math.PI / 2, '-x': -Math.PI / 2 };
// curtain with folds: width along the wall (run 'x' = wall along local x), hanging z0..z1 in front of the wall surface t, facing dir
export function curtain(g, run, a0, a1, t, z0, z1, m, dir, folds = 7, amp = 0.025) {
  const w = a1 - a0,
    h = z1 - z0,
    nx = Math.max(8, folds * 4);
  const geo = new THREE.PlaneGeometry(w, h, nx, 2);
  const p = geo.attributes.position,
    uv = geo.attributes.uv;
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i),
      y = p.getY(i);
    p.setZ(i, Math.sin(((x + w / 2) / w) * Math.PI * 2 * folds) * amp * (0.75 + 0.25 * ((y + h / 2) / h)));
    uv.setXY(i, x + w / 2, y + h / 2);
  }
  geo.computeVertexNormals();
  const c = (a0 + a1) / 2;
  const [lx, ly] = run === 'x' ? [c, t] : [t, c];
  return put(g, geo, m, lx, ly, (z0 + z1) / 2, { ry: FACE[dir], cast: false });
}
// framed picture on a wall: centre a along the wall, centre height zc, size w × h, atlas cell 0..3, frame material
export function picture(g, run, a, t, zc, w, h, cell, dir, fm = MAT.oak) {
  const geo = new THREE.PlaneGeometry(w, h),
    uv = geo.attributes.uv,
    cu = (cell % 2) * 0.5,
    cv = 0.5 - Math.floor(cell / 2) * 0.5;
  for (let i = 0; i < uv.count; i++) uv.setXY(i, cu + uv.getX(i) * 0.5, cv + uv.getY(i) * 0.5);
  const k = dir === '+x' || dir === '+y' ? 1 : -1,
    f = 0.03,
    d = 0.022;
  const [lx, ly] = run === 'x' ? [a, t + k * (d + 0.002)] : [t + k * (d + 0.002), a];
  put(g, geo, KM.art, lx, ly, zc, { ry: FACE[dir], cast: false });
  const t0 = Math.min(t, t + k * d),
    t1 = Math.max(t, t + k * d),
    b = (p0, p1, q0, q1) =>
      run === 'x'
        ? gB(g, p0, p1, t0, t1, q0, q1, fm, { cast: false })
        : gB(g, t0, t1, p0, p1, q0, q1, fm, { cast: false });
  b(a - w / 2 - f, a + w / 2 + f, t0, t1, zc - h / 2 - f, zc - h / 2);
  b(a - w / 2 - f, a + w / 2 + f, t0, t1, zc + h / 2, zc + h / 2 + f);
  b(a - w / 2 - f, a - w / 2, t0, t1, zc - h / 2, zc + h / 2);
  b(a + w / 2, a + w / 2 + f, t0, t1, zc - h / 2, zc + h / 2);
}
// terracotta pot (turned profile with rim) and soil; returns the soil height
const potGeo = (() => {
  const pts = [
    [0.0, 0],
    [0.7, 0],
    [0.74, 0.04],
    [0.92, 0.8],
    [1.04, 0.82],
    [1.04, 1.0],
    [0.95, 1.0],
    [0.88, 0.86],
    [0.0, 0.86],
  ].map(([r, h]) => new THREE.Vector2(r, h));
  return new THREE.LatheGeometry(pts, 14);
})();
export function pot(g, lx, ly, z, r, h, m = KM.terracotta) {
  put(g, potGeo, m, lx, ly, z, { s: [r, h, r] });
  return z + h * 0.86;
}
// a little plant on soil at height z: kind 'herb' (bushy), 'seedling' (two leaves), 'geranium' (leaves + red flower heads), 'spiky'
const blob = new THREE.IcosahedronGeometry(1, 0),
  leafG = (() => {
    const s = new THREE.Shape();
    s.moveTo(0, 0);
    s.quadraticCurveTo(0.5, 0.35, 0, 1);
    s.quadraticCurveTo(-0.5, 0.35, 0, 0);
    return new THREE.ShapeGeometry(s, 3);
  })(),
  // round leaf (radius 1, cupped: the rim a little raised towards its front), a thin stalk 1 m long
  discG = (() => {
    const geo = new THREE.CircleGeometry(1, 9),
      p = geo.attributes.position;
    for (let i = 0; i < p.count; i++) p.setZ(i, (p.getX(i) ** 2 + p.getY(i) ** 2) * 0.25);
    geo.computeVertexNormals();
    return geo;
  })(),
  stalkG = new THREE.CylinderGeometry(0.004, 0.005, 1, 5, 1, true);
// one leaf (pointing up and out), e.g. for climbing plants
export function leaf(g, lx, ly, z, size, yaw, tilt, m) {
  return put(g, leafG, m, lx, ly, z, { s: [size * 0.7, size, 1], ry: yaw, rx: -tilt, order: 'YXZ', cast: false });
}
export function plant(g, lx, ly, z, size, kind, rnd = R0) {
  if (kind === 'seedling') {
    for (const s of [-1, 1])
      put(g, leafG, KM.seedling, lx, ly, z + size * 0.5, {
        s: [size * 0.5, size * 0.6, 1],
        ry: rnd() * 6.28,
        rz: s * 1.0,
        order: 'YXZ',
        cast: false,
      });
    return;
  }
  if (kind === 'spiky') {
    for (let i = 0; i < 7; i++)
      put(g, leafG, KM.herb, lx, ly, z, {
        s: [size * 0.25, size * (0.8 + rnd() * 0.4), 1],
        ry: (i / 7) * 6.28 + rnd(),
        rx: -0.25 - rnd() * 0.3,
        order: 'YXZ',
        cast: false,
      });
    return;
  }
  if (kind === 'geranium') {
    // round, slightly cupped leaves in a low mound; three flower umbels on stalks above them (a dome of small florets each)
    for (let i = 0; i < 7; i++) {
      const a = (i / 7) * 6.28 + rnd() * 0.6,
        rr = size * (0.16 + rnd() * 0.12);
      // the leaf faces up and a little outwards (ry turns three's +Z to the local direction a)
      put(g, discG, KM.herb, lx + Math.cos(a) * rr, ly + Math.sin(a) * rr, z + size * (0.22 + rnd() * 0.2), {
        s: [size * 0.2, size * 0.2, size * 0.2],
        ry: a + Math.PI / 2,
        rx: -Math.PI / 2 + 0.35 + rnd() * 0.3,
        order: 'YXZ',
        cast: false,
      });
    }
    for (let i = 0; i < 3; i++) {
      const a = (i / 3) * 6.28 + rnd(),
        rr = size * 0.14,
        x = lx + Math.cos(a) * rr,
        y = ly + Math.sin(a) * rr,
        zt = z + size * (0.78 + rnd() * 0.2);
      put(g, stalkG, KM.herb, x, y, (z + size * 0.3 + zt) / 2, { s: [1, zt - z - size * 0.3, 1], cast: false });
      for (let k = 0; k < 7; k++) {
        const b = (k / 6) * 6.28,
          q = k ? size * 0.085 : 0;
        put(g, blob, KM.red, x + Math.cos(b) * q, y + Math.sin(b) * q, zt + (k ? 0 : size * 0.04), {
          s: [size * 0.058, size * 0.05, size * 0.058],
          cast: false,
        });
      }
    }
    return;
  }
  for (let i = 0; i < 4; i++) {
    const a = (i / 4) * 6.28 + rnd(),
      rr = size * 0.3;
    put(g, blob, KM.herb, lx + Math.cos(a) * rr, ly + Math.sin(a) * rr, z + size * (0.35 + rnd() * 0.25), {
      s: [size * 0.36, size * 0.3, size * 0.36],
      cast: false,
    });
  }
}
// watering can (body, spout with rose, handle over the top); yaw = local compass degrees the spout points to
export function wateringCan(g, lx, ly, z, yaw, m = MAT.zinc, s = 1) {
  const grp = new THREE.Group();
  grp.position.copy(V(lx, ly, z));
  grp.rotation.y = (-yaw * Math.PI) / 180;
  grp.scale.setScalar(s);
  g.add(grp);
  const add = (geo, x, y, zz, o = {}) => put(grp, geo, m, x, y, zz, o);
  add(new THREE.CylinderGeometry(0.1, 0.11, 0.24, 14), 0, 0, 0.12);
  add(new THREE.CylinderGeometry(0.1, 0.1, 0.012, 14), 0, 0, 0.245);
  // spout towards local +x of the group (three +X), rising
  const sp = add(new THREE.CylinderGeometry(0.012, 0.02, 0.36, 7), 0.2, 0, 0.2, { rz: -0.95 });
  sp.castShadow = false;
  add(new THREE.CylinderGeometry(0.035, 0.016, 0.05, 9), 0.355, 0, 0.31, { rz: -1.2 });
  const h = add(new THREE.TorusGeometry(0.11, 0.012, 6, 14, Math.PI), -0.01, 0, 0.25, { cast: false });
  h.rotation.x = 0;
  return grp;
}
// mug with handle
const mugB = new THREE.CylinderGeometry(0.04, 0.036, 0.09, 12),
  mugH = new THREE.TorusGeometry(0.026, 0.007, 5, 10, Math.PI * 1.3);
export function mug(g, lx, ly, z, m = KM.porcelain, yaw = 0) {
  put(g, mugB, m, lx, ly, z + 0.045, { cast: false });
  const a = (-yaw * Math.PI) / 180;
  put(g, mugH, m, lx + Math.cos(a) * 0.04, ly + Math.sin(a) * 0.04, z + 0.047, {
    ry: a,
    rz: -0.65 * Math.PI,
    cast: false,
  });
}
// jar (glass with a coloured content and a lid)
export function jar(g, lx, ly, z, r, h, fill) {
  put(g, new THREE.CylinderGeometry(r * 0.92, r * 0.92, h * 0.75, 10), fill, lx, ly, z + h * 0.375, { cast: false });
  put(g, new THREE.CylinderGeometry(r, r, h, 12, 1, true), KM.glassJar, lx, ly, z + h / 2, { cast: false });
  put(g, new THREE.CylinderGeometry(r * 1.02, r * 1.02, h * 0.1, 12), MAT.brass, lx, ly, z + h * 1.03, { cast: false });
}
// teapot: round body, spout, lid with knob, handle
export function teapot(g, lx, ly, z, m = KM.porcelain, yaw = 0) {
  const grp = new THREE.Group();
  grp.position.copy(V(lx, ly, z));
  grp.rotation.y = (-yaw * Math.PI) / 180;
  g.add(grp);
  put(grp, new THREE.SphereGeometry(0.075, 14, 10), m, 0, 0, 0.07, { s: [1, 0.85, 1], cast: false });
  put(grp, new THREE.CylinderGeometry(0.008, 0.014, 0.1, 7), m, 0.09, 0, 0.08, { rz: -0.9, cast: false });
  put(grp, new THREE.CylinderGeometry(0.035, 0.04, 0.012, 12), m, 0, 0, 0.133, { cast: false });
  put(grp, new THREE.SphereGeometry(0.012, 8, 6), m, 0, 0, 0.145, { cast: false });
  put(grp, new THREE.TorusGeometry(0.04, 0.008, 5, 10, Math.PI * 1.2), m, -0.08, 0, 0.075, {
    rz: 0.4 * Math.PI,
    cast: false,
  });
  return grp;
}
// keys of placed models (planner: 'type#n', counted in load order): the garden buildings count in their own range, so the models placed
// further down (the workshop …) keep the keys saved furniture layouts refer to (13 models were placed here before 23.10.2026)
let keyN0 = null;
export function keysBegin() {
  keyN0 = window.ITEM_N || 0;
  window.ITEM_N = 7000;
}
export function keysEnd() {
  if (keyN0 !== null) window.ITEM_N = keyN0 + 13;
  keyN0 = null;
}
// seed tray with seedlings in rows
export function seedTray(g, x0, x1, y0, y1, z, rnd = R0, nx = 6, ny = 4) {
  gB(g, x0, x1, y0, y1, z, z + 0.05, KM.blackPlastic, { cast: false });
  gB(g, x0 + 0.01, x1 - 0.01, y0 + 0.01, y1 - 0.01, z + 0.05, z + 0.052, KM.traySoil, { cast: false });
  for (let i = 0; i < nx; i++)
    for (let j = 0; j < ny; j++) {
      if (rnd() < 0.12) continue;
      const lx = x0 + ((i + 0.5) * (x1 - x0)) / nx,
        ly = y0 + ((j + 0.5) * (y1 - y0)) / ny;
      plant(g, lx, ly, z + 0.05, 0.035 + rnd() * 0.03, 'seedling', rnd);
    }
}
// books on a shelf board as one instanced mesh per building (coloured spines); call books.flush(g) once per building
export function bookRow(list, run, a0, a1, t0, t1, z, hMax, rnd = R0) {
  let a = a0;
  while (a < a1 - 0.03) {
    const w = rnd.r(0.02, 0.05),
      h = rnd.r(0.6, 0.95) * hMax,
      d = rnd.r(0.13, Math.min(0.22, t1 - t0 - 0.01));
    if (rnd() < 0.07) {
      a += rnd.r(0.04, 0.12);
      continue;
    }
    if (run === 'x') list.push([a, a + w, t0, t0 + d, z, z + h]);
    else list.push([t0, t0 + d, a, a + w, z, z + h]);
    a += w + 0.002;
  }
}
const bookCols = [
  0x7a3b2e, 0x3f5a46, 0x2f4561, 0xb08d57, 0x8c6b4f, 0xd9cdb5, 0x5b4a6e, 0x9a5b3a, 0x46524e, 0xc2a46b, 0x2b2b2b,
];
export function bookMesh(g, list, rnd = R0) {
  if (!list.length) return null;
  const im = new THREE.InstancedMesh(new RoundedBoxGeometry(1, 1, 1, 1, 0.08), plain({ roughness: 0.7 }), list.length);
  const m4 = new THREE.Matrix4(),
    q = new THREE.Quaternion();
  list.forEach(([x0, x1, y0, y1, z0, z1], i) => {
    m4.compose(V((x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2), q, new THREE.Vector3(x1 - x0, z1 - z0, y1 - y0));
    im.setMatrixAt(i, m4);
    im.setColorAt(
      i,
      new THREE.Color(bookCols[Math.floor(rnd() * bookCols.length)]).offsetHSL(0, 0, rnd.r(-0.05, 0.05))
    );
  });
  im.castShadow = true;
  im.receiveShadow = true;
  g.add(im);
  return tagPh(im);
}
// soft box with rounded edges in a building group (cushions, mattress, upholstery)
export function soft(g, x0, x1, y0, y1, z0, z1, r, m, o = {}) {
  const w = x1 - x0,
    d = y1 - y0,
    h = z1 - z0;
  r = Math.min(r, w / 2 - 1e-3, d / 2 - 1e-3, h / 2 - 1e-3);
  const geo = new RoundedBoxGeometry(w, h, d, 2, Math.max(r, 0.002));
  if (o.puff) {
    const p = geo.attributes.position;
    for (let i = 0; i < p.count; i++) {
      const a = p.getX(i) / (w / 2),
        b = p.getZ(i) / (d / 2);
      if (p.getY(i) > 0) p.setY(i, p.getY(i) + o.puff * (1 - a * a) * (1 - b * b));
    }
    geo.computeVertexNormals();
  }
  const uv = geo.attributes.uv,
    p = geo.attributes.position;
  for (let i = 0; i < p.count; i++) uv.setXY(i, p.getX(i) + p.getZ(i), p.getY(i) + p.getZ(i) * 0.5);
  return put(g, geo, m, (x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2, { ry: o.ry || 0, cast: o.cast ?? true });
}
// a bare light bulb on a cord from the ceiling (socket, bulb with its own glowing material); returns the bulb's material
export function bareBulb(g, lx, ly, zCeil, zBulb) {
  const m = bulbMat();
  put(g, new THREE.CylinderGeometry(0.035, 0.035, 0.02, 12), KM.porcelain, lx, ly, zCeil - 0.01, { cast: false });
  put(g, new THREE.CylinderGeometry(0.004, 0.004, zCeil - zBulb - 0.1, 5), KM.cord, lx, ly, (zCeil + zBulb + 0.1) / 2, {
    cast: false,
  });
  put(g, new THREE.CylinderGeometry(0.018, 0.02, 0.06, 10), KM.bakelite, lx, ly, zBulb + 0.07, { cast: false });
  const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.032, 14, 10), m);
  bulb.scale.set(1, 1.25, 1);
  bulb.position.copy(V(lx, ly, zBulb));
  bulb.castShadow = false;
  bulb.userData.noMerge = true;
  g.add(bulb);
  tagPh(bulb);
  put(g, new THREE.CylinderGeometry(0.013, 0.018, 0.03, 10), MAT.brass, lx, ly, zBulb + 0.035, { cast: false });
  return m;
}
