// feat/grenzland-auto: pictures of the vehicle models without a browser – a small software renderer (z-buffer, smooth normals, a sky to
// reflect) for looking at shapes while building them. The browser test (viz3/test/grenzland_auto.py) shows the real thing.
//   node viz3/extra/grenzland-auto/werkzeug/bild.mjs trabant out/karosse/trabant.png [--views v34,h34,seite,front] [--col '#9fc3d4']
//        [--opt '{"bar":"rundum"}'] [--w 900 --h 600] [--eye x,y,z --look x,y,z --fov 70]   (eye/look in the vehicle frame: cockpits)
import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';
import { GLTYPEN } from '../../../src/grenzland/gl_typen.js';
import { GLZWEIRAD } from '../../../src/grenzland/gl_zweirad.js';

const args = process.argv.slice(2);
const typ = args[0] || 'trabant';
const out = args[1] && !args[1].startsWith('--') ? args[1] : `out/karosse/${typ}.png`;
const opt = n => {
  const i = args.indexOf('--' + n);
  return i >= 0 ? args[i + 1] : null;
};
const W = +(opt('w') || 900),
  H = +(opt('h') || 600),
  SS = 2;
const O = Object.assign({}, opt('opt') ? JSON.parse(opt('opt')) : {});
if (opt('col')) O.col = opt('col');
const views = (opt('views') || 'v34,h34,seite,front').split(',');

const srgb = c => (c <= 0.0031308 ? c * 12.92 : 1.055 * Math.pow(c, 1 / 2.4) - 0.055);
const sky = (rx, ry, rz) => {
  // a soft sky: bright near the horizon, blue above, the ground warm grey below
  const t = Math.max(-1, Math.min(1, ry));
  if (t < 0) {
    const k = Math.min(1, -t * 3);
    return [0.42 - 0.2 * k, 0.4 - 0.19 * k, 0.36 - 0.17 * k];
  }
  const k = Math.pow(t, 0.5),
    sun = Math.pow(Math.max(0, rx * 0.45 + ry * 0.7 + rz * 0.55), 40) * 3;
  return [0.85 - 0.5 * k + sun, 0.9 - 0.4 * k + sun, 1.0 - 0.22 * k + sun];
};
const Ld = (() => {
  const v = [0.45, 0.7, 0.55],
    l = Math.hypot(...v);
  return v.map(x => x / l);
})();

function render(M, cam) {
  const w = W * SS,
    h = H * SS,
    col = new Float32Array(w * h * 3),
    zb = new Float32Array(w * h).fill(1e9);
  // background
  for (let y = 0; y < h; y++) {
    const t = y / h;
    for (let x = 0; x < w; x++) {
      const i = (y * w + x) * 3;
      col[i] = 0.62 - 0.2 * t;
      col[i + 1] = 0.66 - 0.2 * t;
      col[i + 2] = 0.7 - 0.22 * t;
    }
  }
  // camera basis (three's frame: x right, y up, z = −vehicle y)
  const e = cam.eye,
    f = norm(sub(cam.look, e)),
    r = norm(cross(f, [0, 1, 0])),
    u = cross(r, f),
    fl = h / 2 / Math.tan(((cam.fov || 32) * Math.PI) / 360);
  const proj = p => {
    const d = sub(p, e),
      z = dot(d, f);
    return [w / 2 + (dot(d, r) / z) * fl, h / 2 - (dot(d, u) / z) * fl, z];
  };
  const tris = [];
  for (const piece of M) {
    const o = piece.at || [0, 0, 0],
      off = [o[0], o[2], -o[1]];
    for (const [name, q] of Object.entries(piece.parts)) {
      const kind = name.startsWith('lack') ? 'lack' : name;
      const base = name.startsWith('lack') ? piece.paint[+name.slice(4)] || piece.paint[0] : null;
      for (let t = 0; t < q.n; t++) tris.push({ q, t, off, kind, base, alpha: kind === 'glas' ? 0.3 : 1 });
    }
  }
  tris.sort((a, b) => b.alpha - a.alpha);
  const ground = { y: 0 };
  // ground: a big quad shaded flat with a soft contact shadow under the vehicle (drawn first, analytically per pixel)
  for (let y = 0; y < h; y++)
    for (let x = 0; x < w; x++) {
      const dx = (x - w / 2) / fl,
        dy = -(y - h / 2) / fl,
        d = [f[0] + r[0] * dx + u[0] * dy, f[1] + r[1] * dx + u[1] * dy, f[2] + r[2] * dx + u[2] * dy];
      if (d[1] >= -1e-4) continue;
      const t = (ground.y - e[1]) / d[1],
        px = e[0] + d[0] * t,
        pz = e[2] + d[2] * t,
        z = t * dot(d, f);
      const i = y * w + x,
        sh = Math.exp(-Math.pow(Math.abs(px) / 0.95, 4) - Math.pow(Math.abs(pz + (cam.cy || 0)) / (cam.hl || 2.1), 6)),
        g = 0.33 * (1 - 0.62 * sh) * (0.9 + 0.1 * (((Math.floor(px * 2) + Math.floor(pz * 2)) & 1) ? 1 : 0.85));
      col[i * 3] = g;
      col[i * 3 + 1] = g * 0.98;
      col[i * 3 + 2] = g * 0.94;
      zb[i] = z;
    }
  for (const T of tris) {
    const { q, t, off, kind } = T,
      P = [],
      N = [],
      C = [],
      S = [];
    for (let k = 0; k < 3; k++) {
      const i = (t * 3 + k) * 3,
        p = [q.pos[i] + off[0], q.pos[i + 1] + off[1], q.pos[i + 2] + off[2]];
      P.push(p);
      N.push([q.nor[i], q.nor[i + 1], q.nor[i + 2]]);
      C.push([q.col[i], q.col[i + 1], q.col[i + 2]]);
      S.push(proj(p));
    }
    if (S[0][2] < 0.03 || S[1][2] < 0.03 || S[2][2] < 0.03) continue;
    const area = (S[1][0] - S[0][0]) * (S[2][1] - S[0][1]) - (S[2][0] - S[0][0]) * (S[1][1] - S[0][1]);
    if (kind !== 'glas' && area >= 0) continue; // back face (screen y points down: front faces have negative area)
    if (Math.abs(area) < 1e-9) continue;
    const x0 = Math.max(0, Math.floor(Math.min(S[0][0], S[1][0], S[2][0]))),
      x1 = Math.min(w - 1, Math.ceil(Math.max(S[0][0], S[1][0], S[2][0]))),
      y0 = Math.max(0, Math.floor(Math.min(S[0][1], S[1][1], S[2][1]))),
      y1 = Math.min(h - 1, Math.ceil(Math.max(S[0][1], S[1][1], S[2][1])));
    const iz = [1 / S[0][2], 1 / S[1][2], 1 / S[2][2]];
    for (let y = y0; y <= y1; y++)
      for (let x = x0; x <= x1; x++) {
        const px = x + 0.5,
          py = y + 0.5,
          w0 = ((S[1][0] - px) * (S[2][1] - py) - (S[2][0] - px) * (S[1][1] - py)) / area,
          w1 = ((S[2][0] - px) * (S[0][1] - py) - (S[0][0] - px) * (S[2][1] - py)) / area,
          w2 = 1 - w0 - w1;
        if (w0 < 0 || w1 < 0 || w2 < 0) continue;
        const k0 = w0 * iz[0],
          k1 = w1 * iz[1],
          k2 = w2 * iz[2],
          ks = k0 + k1 + k2,
          z = 1 / ks,
          i = y * w + x;
        if (z >= zb[i]) continue;
        const b0 = k0 / ks,
          b1 = k1 / ks,
          b2 = k2 / ks;
        let n = norm([
          N[0][0] * b0 + N[1][0] * b1 + N[2][0] * b2,
          N[0][1] * b0 + N[1][1] * b1 + N[2][1] * b2,
          N[0][2] * b0 + N[1][2] * b1 + N[2][2] * b2,
        ]);
        const p = [
            P[0][0] * b0 + P[1][0] * b1 + P[2][0] * b2,
            P[0][1] * b0 + P[1][1] * b1 + P[2][1] * b2,
            P[0][2] * b0 + P[1][2] * b1 + P[2][2] * b2,
          ],
          v = norm(sub(e, p));
        if (dot(n, v) < 0) n = [-n[0], -n[1], -n[2]];
        const nv = Math.max(0, dot(n, v)),
          rf = sub(scale(n, 2 * dot(n, v)), v),
          env = sky(rf[0], rf[1], rf[2]),
          fres = 0.04 + 0.96 * Math.pow(1 - nv, 5),
          dif = Math.max(0, dot(n, Ld)) * 0.95 + 0.28 + 0.2 * n[1];
        let c;
        if (kind === 'lack') {
          const b = T.base;
          c = [0, 1, 2].map(k => b[k] * dif + env[k] * (fres * 0.9 + 0.035));
        } else if (kind === 'chrom') c = env.map(x => x * 0.82 + 0.02);
        else if (kind === 'glas') c = env.map(x => x * (0.25 + fres) * 0.9);
        else if (kind === 'head') c = [0.9, 0.9, 0.85].map((x, k) => x * (0.5 + 0.5 * dif) + env[k] * 0.25);
        else if (kind === 'tail' || kind === 'brems') c = [0.5, 0.03, 0.02].map((x, k) => x * dif + env[k] * 0.06);
        else if (kind === 'blau' || kind === 'blau2') c = [0.05, 0.16, 0.6].map((x, k) => x * dif + env[k] * 0.12);
        else if (kind === 'blink') c = [0.8, 0.36, 0.04].map((x, k) => x * dif + env[k] * 0.06);
        else if (kind === 'schrift') c = [0.9, 0.9, 0.9].map(x => x * dif);
        else {
          const cc = [C[0][0] * b0 + C[1][0] * b1 + C[2][0] * b2, C[0][1] * b0 + C[1][1] * b1 + C[2][1] * b2, C[0][2] * b0 + C[1][2] * b1 + C[2][2] * b2];
          c = cc.map((x, k) => x * dif + env[k] * fres * 0.25);
        }
        if (T.alpha < 1) {
          const a = Math.min(1, T.alpha + fres * 0.6);
          col[i * 3] = col[i * 3] * (1 - a) + c[0] * a;
          col[i * 3 + 1] = col[i * 3 + 1] * (1 - a) + c[1] * a;
          col[i * 3 + 2] = col[i * 3 + 2] * (1 - a) + c[2] * a;
        } else {
          col[i * 3] = c[0];
          col[i * 3 + 1] = c[1];
          col[i * 3 + 2] = c[2];
          zb[i] = z;
        }
      }
  }
  // downsample, tone map
  const img = Buffer.alloc(W * H * 3);
  for (let y = 0; y < H; y++)
    for (let x = 0; x < W; x++) {
      const a = [0, 0, 0];
      for (let sy = 0; sy < SS; sy++)
        for (let sx = 0; sx < SS; sx++) {
          const i = ((y * SS + sy) * w + x * SS + sx) * 3;
          a[0] += col[i];
          a[1] += col[i + 1];
          a[2] += col[i + 2];
        }
      for (let k = 0; k < 3; k++) {
        const v = a[k] / (SS * SS);
        img[(y * W + x) * 3 + k] = Math.round(255 * Math.min(1, srgb(v / (1 + v * 0.25))));
      }
    }
  return img;
}
const sub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]],
  dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2],
  cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]],
  scale = (a, s) => [a[0] * s, a[1] * s, a[2] * s],
  norm = a => {
    const l = Math.hypot(...a) || 1;
    return [a[0] / l, a[1] / l, a[2] / l];
  };
function png(img, w, h) {
  const raw = Buffer.alloc((w * 3 + 1) * h);
  for (let y = 0; y < h; y++) {
    raw[y * (w * 3 + 1)] = 0;
    img.copy(raw, y * (w * 3 + 1) + 1, y * w * 3, (y + 1) * w * 3);
  }
  const chunk = (t, d) => {
    const b = Buffer.alloc(8 + d.length + 4);
    b.writeUInt32BE(d.length, 0);
    b.write(t, 4, 'ascii');
    d.copy(b, 8);
    b.writeUInt32BE(zlib.crc32(b.subarray(4, 8 + d.length)) >>> 0, 8 + d.length);
    return b;
  };
  const ih = Buffer.alloc(13);
  ih.writeUInt32BE(w, 0);
  ih.writeUInt32BE(h, 4);
  ih[8] = 8;
  ih[9] = 2;
  return Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    chunk('IHDR', ih),
    chunk('IDAT', zlib.deflateSync(raw, { level: 6 })),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

const t0 = Date.now();
const model0 = GLTYPEN.bau(typ, O) || GLZWEIRAD.bau(typ, O);
const model = model0 && { T: model0.T, pieces: model0.pieces.filter(p => !p.dial) };
if (!model0) {
  console.error('unknown type', typ, '– known:', Object.keys(GLTYPEN.TYP).concat(Object.keys(GLZWEIRAD.TYP)).join(' '));
  process.exit(1);
}
const T = model.T,
  cy = (T.yf + T.yr) / 2,
  hl = (T.yf - T.yr) / 2,
  size = Math.max(hl * 2, 1.6);
let ntri = 0;
for (const p of model.pieces) for (const q of Object.values(p.parts)) ntri += q.n;
const veh = (x, y, z) => [x, z, -y]; // vehicle frame → three's
const CAMS = {
  v34: { az: 33, el: 13 },
  h34: { az: 147, el: 14 },
  seite: { az: 90, el: 4 },
  front: { az: 0, el: 6 },
  heck: { az: 180, el: 6 },
  oben: { az: 30, el: 55 },
  v34l: { az: -35, el: 12 },
  nah: { az: 28, el: 10, k: 0.55 },
};
const imgs = [];
for (const v of views) {
  let cam;
  if (v === 'eye') {
    const E = (opt('eye') || '0,0,1').split(',').map(Number),
      Lk = (opt('look') || '0,5,0.8').split(',').map(Number);
    cam = { eye: veh(...E), look: veh(...Lk), fov: +(opt('fov') || 70), cy, hl };
  } else {
    const c = CAMS[v] || CAMS.v34,
      az = (c.az * Math.PI) / 180,
      el = (c.el * Math.PI) / 180,
      d = size * 1.7 * (c.k || 1),
      zt = (T.h || 1.5) * 0.45;
    cam = {
      eye: veh(Math.sin(az) * Math.cos(el) * d, cy + Math.cos(az) * Math.cos(el) * d, zt + Math.sin(el) * d),
      look: veh(0, cy, zt),
      fov: 30,
      cy,
      hl,
    };
  }
  imgs.push(render(model.pieces, cam));
}
// a sheet: two columns
const cols = imgs.length > 1 ? 2 : 1,
  rows = Math.ceil(imgs.length / cols),
  sheet = Buffer.alloc(W * cols * H * rows * 3, 40);
imgs.forEach((im, k) => {
  const ox = (k % cols) * W,
    oy = Math.floor(k / cols) * H;
  for (let y = 0; y < H; y++) im.copy(sheet, ((oy + y) * W * cols + ox) * 3, y * W * 3, (y + 1) * W * 3);
});
fs.mkdirSync(path.dirname(out), { recursive: true });
fs.writeFileSync(out, png(sheet, W * cols, H * rows));
console.log(`${typ}: ${ntri} triangles, ${model.pieces.length} pieces → ${out} (${Date.now() - t0} ms)`);
