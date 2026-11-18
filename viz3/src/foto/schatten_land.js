// ===================== feat/fotorealismus: the hills' shadows at a low sun – the field of heights (SCHLAND, foto/schatten.js) =====================
// At a sun of 5° a hill 150 m above the valley throws a shadow of 1.7 km. On the first of June the sun rises at 5:10, but the garden lies
// in the shadow of the hills north-east of it until 6:00 (the sun 6° high by then) and again from 20:55 until the sun sets at 21:19; in
// winter the noon sun stands 16° high and whole slopes stay in the shade. Without that the low sun shone into every valley at full
// strength (the light's keys of time/daynight.js give a sun of 6° nearly its noon strength). The tiles of the sun's atlas
// (foto/schatten.js) cannot show it – they hold trees and houses within ±640 m, and the terrain casts nothing into them: drawn into a
// shadow map it is hundreds of thousands of triangles for an edge that is tens of metres soft anyway.
// The land is a height field, so its shadow is one number per place: the height below which the land towards the sun hides it. Here that
// number is worked out on the CPU for a field of 256 × 256 cells of 24 m (±3 km around the walker):
//   – a raster of the terrain's heights (KERN.terrain: the square of Ratscher, the land beyond, the tiles and zones of the world as they
//     load) is kept around the walker, ±7.7 km, sampled a little every frame – first once from the middle outwards, afterwards a cell
//     here and there, faster for a while when one has changed (a tile of the world arrived) or the raster has moved with the walker;
//   – for a sun direction the field's cells are laid out along it (its columns point at the sun, 128 cells more towards it for the land
//     that casts into the field), the heights are read from the raster, and one sweep down each column gives the shadow's height:
//     S(j) = max(H(j + 1), S(j + 1)) − cell · tan(elevation). Twice, for the sun's upper and lower edge: below the lower height nothing
//     of the sun is seen, above the upper one all of it – the shadow's edge is as soft as the sun is wide, more so the further the hill.
//     A column takes half of its two neighbours' heights (the land is sampled at points 24 m apart: the shadow's end would jump from
//     column to column). A field takes a millisecond or two, spread over a few frames.
//   The land right at a place is left out (the first cell that counts is the next one towards the sun): what faces away from the sun is
//   dark by its own slope, and the terrain as drawn is finer than this raster.
// The field is a texture of bytes (two heights of 16 bit, steps of 2 cm above a floor) that foto/schatten.js copies into a strip of the
// sun's shadow atlas; every lit material reads it there (foto/schatten_glsl.js sunLand) – no new texture for any program.
//   SCHLAND.work(ms, x, y)      a frame's share of sampling the raster around (x, y) → true while cells are still missing
//   SCHLAND.begin(dir, x, y)    a field for the light from dir (world, towards the sun) around (x, y) is set up, and
//   SCHLAND.step(ms)            worked on for a frame's share → true when it is through: its texture SCHLAND.tex, its matrix SCHLAND.Lw
//   SCHLAND.state()             { ready, missing, changed, pass, field: { n, ms, shaded, el, az } }
import * as THREE from 'three';
import { KERN } from '../core/kern.js';
export const SCHLAND = (() => {
  const G = 256, // the field: cells a side (what the shaders read)
    E = 128, // cells further towards the sun: land that casts into the field
    C = 24, // a cell (m) – the field reaches ±3072 m
    HN = 640, // the raster of heights: cells a side (±7680 m)
    HALF = HN >> 1,
    BLOCK = 32, // the raster's middle moves in steps of this many cells
    DRIFT = 64, // … once the walker is this many cells from it
    IDLE = 64, // cells sampled anew in a frame when none is missing
    FLOOR = -300, // the packed heights' floor (m, the model's heights: 0 is the garden) and
    STEP = 0.02, // their step: 16 bit reach 1010 m above the garden
    SUNR = 0.00465, // the sun's radius (rad)
    J = G + E;
  const LOW = FLOOR - 1; // „no shadow“: below every height that is packed
  // the arrays only once the far shadows are on (4 MB; a phone or a machine without graphics card never asks)
  let hz = null,
    tmp = null,
    fLo = null, // the field's two heights before they are packed
    fHi = null,
    data = null,
    tex = null;
  function init() {
    if (hz) return;
    hz = new Float32Array(HN * HN).fill(NaN);
    fLo = new Float32Array(G * G);
    fHi = new Float32Array(G * G);
    data = new Uint8Array(G * G * 4);
    tex = new THREE.DataTexture(data, G, G, THREE.RGBAFormat, THREE.UnsignedByteType);
    tex.name = 'schatten-land';
    tex.needsUpdate = true;
  }
  const S = {
    ox: 0, // the raster's first cell on the world's lattice of 24 m (cell k: k · 24 … (k + 1) · 24 m)
    oy: 0,
    set: false,
    missing: HN * HN, // cells not sampled yet
    ready: false, // sampled once all through
    changed: 0, // cells that changed since the last field
    pass: 0,
    boost: false, // sampling fast until the round is through
    r: 0, // where the sampling stands: ring r around the middle, cell k of it
    k: 0,
    field: { n: 0, ms: 0, shaded: 0, el: 0, az: 0, x: 0, y: 0 },
  };
  const Lw = new THREE.Matrix4();
  // ---- the raster follows the walker: what overlaps is kept, the rest sampled anew ----
  function centre(x, y) {
    const cx = Math.round(x / C),
      cy = Math.round(y / C);
    if (S.set && Math.abs(cx - (S.ox + HALF)) <= DRIFT && Math.abs(cy - (S.oy + HALF)) <= DRIFT) return;
    const ox = Math.round(cx / BLOCK) * BLOCK - HALF,
      oy = Math.round(cy / BLOCK) * BLOCK - HALF;
    if (S.set) {
      const dx = ox - S.ox,
        dy = oy - S.oy;
      if (!tmp) tmp = new Float32Array(HN * HN);
      tmp.set(hz);
      let miss = 0;
      for (let j = 0; j < HN; j++) {
        const sj = j + dy,
          row = j * HN;
        if (sj < 0 || sj >= HN) {
          hz.fill(NaN, row, row + HN);
          miss += HN;
          continue;
        }
        for (let i = 0; i < HN; i++) {
          const si = i + dx,
            v = si < 0 || si >= HN ? NaN : tmp[sj * HN + si];
          hz[row + i] = v;
          if (v !== v) miss++;
        }
      }
      S.missing = miss;
      // the new cells lie at the rim: the sampling goes on there
      S.r = Math.max(0, HALF - Math.max(Math.abs(dx), Math.abs(dy)) - 1);
      S.k = 0;
      S.changed += miss;
    }
    S.ox = ox;
    S.oy = oy;
    S.set = true;
    S.boost = true;
  }
  // ---- sampling: ring by ring around the middle, as long as the frame's share lasts ----
  // (cell k of ring r: along the top from the left, down the right, back along the bottom, up the left)
  function cellOf(r, k) {
    if (r === 0) return HALF * HN + HALF;
    const s = (k / (2 * r)) | 0,
      t = k - s * 2 * r;
    let dx, dy;
    if (s === 0) {
      dx = -r + t;
      dy = r;
    } else if (s === 1) {
      dx = r;
      dy = r - t;
    } else if (s === 2) {
      dx = r - t;
      dy = -r;
    } else {
      dx = -r;
      dy = -r + t;
    }
    const i = HALF + dx,
      j = HALF + dy;
    return i < 0 || j < 0 || i >= HN || j >= HN ? -1 : j * HN + i;
  }
  function work(ms, x, y) {
    init();
    centre(x, y);
    // cells are missing or have changed: for the frame's share of time; else a few dozen cells a frame (a round in a minute or two –
    // counted, not timed: a browser's clock may tick only every tenth of a millisecond)
    const t0 = performance.now(),
      fast = S.boost || S.missing > 0;
    let n = 0;
    for (;;) {
      const c = cellOf(S.r, S.k);
      if (c >= 0) {
        const i = c % HN,
          j = (c / HN) | 0;
        let h = 0;
        try {
          h = KERN.terrain((S.ox + i + 0.5) * C, (S.oy + j + 0.5) * C);
        } catch (e) {}
        if (!(h === h)) h = 0;
        const o = hz[c];
        if (o !== o) {
          S.missing--;
          S.changed++;
        } else if (Math.abs(o - h) > 0.3) {
          S.changed++;
          S.boost = true;
        }
        hz[c] = h;
      }
      if (++S.k >= Math.max(1, 8 * S.r)) {
        S.k = 0;
        if (++S.r > HALF) {
          // a round is through
          S.r = 0;
          S.pass++;
          S.boost = false;
          if (S.missing <= 0) S.ready = true;
          if (!S.ready) S.boost = true;
          break;
        }
      }
      n++;
      if (fast ? (n & 31) === 0 && performance.now() - t0 > ms : n >= IDLE) break;
    }
    return S.missing > 0;
  }
  // ---- the field for a light: the shadow's lower and upper height in every cell ----
  // begin(dir, x, y) sets a field up – dir: towards the light (world); (x, y): its middle (model) – and step(ms) works on it, a few
  // columns a frame, until it returns true: then the texture and the matrix are the new field's. begin returns false when the light
  // stands overhead (no direction to sweep along – and no hill's shadow).
  const W = {
    on: false,
    i: 0,
    sx: 0,
    sy: 0,
    tx: 0,
    ty: 0,
    u00: 0,
    v00: 0,
    dLo: 0,
    dHi: 0,
    el: 0,
    x: 0,
    y: 0,
    shaded: 0,
    ms: 0,
  };
  function begin(dir, x, y) {
    const hl = Math.hypot(dir.x, dir.z);
    if (hl < 0.02 || !hz) return false;
    const el = Math.atan2(dir.y, hl);
    W.sx = dir.x / hl; // towards the light in the model's plane (its y is the world's −z)
    W.sy = -dir.z / hl;
    W.tx = -W.sy; // across
    W.ty = W.sx;
    W.el = el;
    W.dLo = C * Math.tan(el + SUNR); // per cell: the height under which nothing of the sun is seen sinks faster …
    W.dHi = C * Math.tan(Math.max(0.0015, el - SUNR)); // … than the one above which all of it is
    W.u00 = x / C - 0.5 - S.ox + (0.5 - G / 2) * (W.tx + W.sx); // cell (0, 0) in the raster's cells
    W.v00 = y / C - 0.5 - S.oy + (0.5 - G / 2) * (W.ty + W.sy);
    W.x = x;
    W.y = y;
    W.i = 0;
    W.shaded = 0;
    W.ms = 0;
    W.on = true;
    S.changed = 0;
    return true;
  }
  function step(ms) {
    if (!W.on) return true;
    const t0 = performance.now(),
      { sx, sy, tx, ty, u00, v00, dLo, dHi } = W,
      top = HN - 1.001,
      inv = 1 / STEP;
    const i0 = W.i;
    let shaded = 0,
      i = i0;
    for (; i < G; i++) {
      // the column from its end towards the sun (cell J − 1) back to the field's far side (cell 0)
      let u = u00 + i * tx + (J - 1) * sx,
        v = v00 + i * ty + (J - 1) * sy,
        mLo = -1e9,
        mHi = -1e9,
        j = J - 1;
      const u1 = u - j * sx,
        v1 = v - j * sy,
        // all of it inside the raster (a straight line: both ends are): no test per cell
        inside = u >= 0 && v >= 0 && u < top && v < top && u1 >= 0 && v1 >= 0 && u1 < top && v1 < top;
      if (inside) {
        for (; j >= G; j--) {
          const iu = u | 0,
            iv = v | 0,
            k = iv * HN + iu,
            fu = u - iu,
            a = hz[k],
            c = hz[k + HN],
            p = a + (hz[k + 1] - a) * fu,
            h = p + (c + (hz[k + HN + 1] - c) * fu - p) * (v - iv);
          // (a cell not sampled yet: h is NaN and no comparison holds – no land there)
          if (h > mLo) mLo = h;
          if (h > mHi) mHi = h;
          mLo -= dLo;
          mHi -= dHi;
          u -= sx;
          v -= sy;
        }
        for (; j >= 0; j--) {
          const o = j * G + i;
          fLo[o] = mLo > LOW ? mLo : LOW;
          fHi[o] = mHi > LOW ? mHi : LOW;
          const iu = u | 0,
            iv = v | 0,
            k = iv * HN + iu,
            fu = u - iu,
            q = hz[k],
            c = hz[k + HN],
            p = q + (hz[k + 1] - q) * fu,
            h = p + (c + (hz[k + HN + 1] - c) * fu - p) * (v - iv);
          if (mLo > h) shaded++;
          if (h > mLo) mLo = h;
          if (h > mHi) mHi = h;
          mLo -= dLo;
          mHi -= dHi;
          u -= sx;
          v -= sy;
        }
      } else
        for (; j >= 0; j--) {
          if (j < G) {
            const o = j * G + i;
            fLo[o] = mLo > LOW ? mLo : LOW;
            fHi[o] = mHi > LOW ? mHi : LOW;
          }
          if (u >= 0 && v >= 0 && u < top && v < top) {
            const iu = u | 0,
              iv = v | 0,
              k = iv * HN + iu,
              fu = u - iu,
              q = hz[k],
              c = hz[k + HN],
              p = q + (hz[k + 1] - q) * fu,
              h = p + (c + (hz[k + HN + 1] - c) * fu - p) * (v - iv);
            if (j < G && mLo > h) shaded++;
            if (h > mLo) mLo = h;
            if (h > mHi) mHi = h;
          }
          mLo -= dLo;
          mHi -= dHi;
          u -= sx;
          v -= sy;
        }
      if ((i & 7) === 7 && performance.now() - t0 > ms) {
        i++;
        break;
      }
    }
    W.i = i;
    W.shaded += shaded;
    const t1 = performance.now();
    W.ms += t1 - t0;
    // (the bytes in a frame of their own when the columns have taken this one's share)
    if (i < G || (i0 < G && t1 - t0 > ms * 0.5)) return false;
    // the heights into bytes, each with half of its two neighbours across the sun: a column is 24 m wide and the land along it
    // sampled at points – from column to column the shadow's end would jump by tens of metres at a low sun (teeth along its edge)
    for (let j = 0, k = 0, o = 0; j < G; j++)
      for (let c = 0; c < G; c++, k++, o += 4) {
        const l = c > 0 ? k - 1 : k,
          r = c < G - 1 ? k + 1 : k,
          lo = 0.25 * (fLo[l] + fLo[r]) + 0.5 * fLo[k];
        let a = (lo - FLOOR) * inv,
          b = (0.25 * (fHi[l] + fHi[r]) + 0.5 * fHi[k] - lo) * inv;
        a = a > 0 ? (a < 65535 ? a | 0 : 65535) : 0;
        b = b > 0 ? (b < 65535 ? b | 0 : 65535) : 0;
        data[o] = a >> 8;
        data[o + 1] = a & 255;
        data[o + 2] = b >> 8;
        data[o + 3] = b & 255;
      }
    W.ms += performance.now() - t1;
    W.on = false;
    tex.needsUpdate = true;
    // world → the field: x, y in its cells (a cell's middle at i + 0.5), z the height above the floor
    Lw.set(
      tx / C,
      0,
      -ty / C,
      G / 2 - (W.x * tx + W.y * ty) / C,
      sx / C,
      0,
      -sy / C,
      G / 2 - (W.x * sx + W.y * sy) / C,
      0,
      1,
      0,
      -FLOOR,
      0,
      0,
      0,
      1
    );
    const F = S.field;
    F.n++;
    F.ms = +W.ms.toFixed(2);
    F.shaded = +(W.shaded / (G * G)).toFixed(4); // the share of the field's ground that lies in a hill's shadow
    F.el = +((W.el * 180) / Math.PI).toFixed(2);
    F.az = +(((Math.atan2(sx, sy) * 180) / Math.PI + 360) % 360).toFixed(1);
    F.x = W.x;
    F.y = W.y;
    return true;
  }
  // tests: the shadow's two heights at a model point as the shaders work them out (bilinear between the cells), or null outside
  const _p = new THREE.Vector3();
  function at(x, y) {
    if (!data || !S.field.n) return null;
    _p.set(x, 0, -y).applyMatrix4(Lw);
    const qx = _p.x - 0.5,
      qy = _p.y - 0.5;
    if (qx < 0 || qy < 0 || qx > G - 1 || qy > G - 1) return null;
    const i = Math.min(G - 2, Math.floor(qx)),
      j = Math.min(G - 2, Math.floor(qy)),
      fx = qx - i,
      fy = qy - j,
      rd = (o, k) => (data[o + k] * 256 + data[o + k + 1]) * STEP,
      mix = k => {
        const o = (j * G + i) << 2;
        return (
          (rd(o, k) * (1 - fx) + rd(o + 4, k) * fx) * (1 - fy) +
          (rd(o + G * 4, k) * (1 - fx) + rd(o + G * 4 + 4, k) * fx) * fy
        );
      },
      lo = mix(0);
    return { lo: +(lo + FLOOR).toFixed(2), hi: +(lo + mix(2) + FLOOR).toFixed(2) };
  }
  const state = () => ({
    ready: S.ready,
    missing: S.missing,
    changed: S.changed,
    pass: S.pass,
    origin: [S.ox * C, S.oy * C],
    field: Object.assign({}, S.field),
  });
  return {
    G,
    C,
    STEP,
    FLOOR,
    Lw,
    S,
    W,
    work,
    begin,
    step,
    at,
    state,
    get tex() {
      return tex;
    },
  };
})();
window.SCHLAND = SCHLAND;
