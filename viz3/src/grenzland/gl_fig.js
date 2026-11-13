// ===================== feat/grenzland: the people of the mode as figures – cast, clothes painted by body zone, headwear, walking (GLFIG) =====================
// The cast of grenzland/gl_data.js as Microsoft Rocketbox figures (the files of the streets' and the village's people: chars/vk_*.json,
// chars/dorf_*.json – our own copies, so the village keeps its people as they are), moved by the player's clip sets through rbPerson of
// npc/npc_real.js. What makes them the stranger, the clique, the police – and above all the people of 1989 (Falko, 13.11.2026 0:32:
// „achte bei den Rückblenden auf 1989 auch auf entsprechende Anpassungen von Umfeld, Kleidung, Stil, Fashion“) – is painted into each
// figure's own textures once at load: the triangles of the bind pose are sorted into body zones (torso, arms, legs, shoes; an apron dress
// or a coat reaches down over the thighs), the zones are drawn into a mask in texture space, and every cloth pixel of a zone takes the
// colour of the garment while keeping its own light and shade (folds, seams); bare arms and legs get sleeves and trousers; on top a
// weave or print (flowers of a Dederon apron, the quilting of a Wattejacke, corduroy, knitting, stone-washed denim). Uniforms get their
// marks (collar patches, the cuff band of the border troops, the yellow stripe of today's police). Headwear (peaked caps, flat cap,
// headscarf, bobble hat, moped helmet) is a small mesh of vertex colours on the head bone – no new shader program.
// Loaded only when a mission needs somebody, freed again (geometry, textures) when it lets them go.
import * as THREE from 'three';
import { BASE, COARSE, QS, scene } from '../core/head.js';
import { markDirty } from '../core/assets.js';
import { KERN } from '../core/kern.js';
import { CHL, rbPerson } from '../npc/npc_real.js';
import { VPROPS } from '../world/village_props.js';
import { VFIG } from '../verkehr/verkehr_fig.js';
import { GLDATA } from './gl_data.js';
export const GLFIG = (() => {
  const S = { figs: [], loads: 0, drops: 0, err: null, clips: {}, paints: 0 };
  const CH = window.CHARMAN || {},
    PM = window.PLAYERMAN || {};
  const U = f => BASE + 'chars/' + f;
  const fileOf = c => (c.fig === 'player_m' || c.fig === 'player_f' ? PM[c.fig] : CH[c.fig]);
  const avail = id => {
    const c = GLDATA.CAST[id];
    return !!(c && PM.pclips_m && PM.pclips_f && fileOf(c) && !QS.get('lowfig'));
  };
  function clipSet(k) {
    if (S.clips[k]) return S.clips[k];
    const FL = new THREE.FileLoader();
    FL.setResponseType('json');
    return (S.clips[k] = FL.loadAsync(U(k === 'f' ? PM.pclips_f : PM.pclips_m)).catch(e => {
      delete S.clips[k];
      throw e;
    }));
  }
  const lin = c => (c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4));
  const L = (r, g, b) => [lin(r / 255), lin(g / 255), lin(b / 255)];
  // ------------------------------------------------------------------ clothes ------------------------------------------------------------------
  const _p = new THREE.Vector3();
  const isSkin = (r, g, b) => r > 55 && r >= g && g >= b * 0.9 && r - b > 18 && r - b < 130 && g > r * 0.48;
  // a fixed grain per pixel (no Math.random: the same person looks the same every time)
  const hash = (x, y) => {
    let h = (x * 374761393 + y * 668265263) | 0;
    h = (h ^ (h >>> 13)) * 1274126177;
    return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
  };
  const vnoise = (x, y) => {
    const xi = Math.floor(x),
      yi = Math.floor(y),
      fx = x - xi,
      fy = y - yi,
      sx = fx * fx * (3 - 2 * fx),
      sy = fy * fy * (3 - 2 * fy),
      a = hash(xi, yi),
      b = hash(xi + 1, yi),
      c = hash(xi, yi + 1),
      d = hash(xi + 1, yi + 1);
    return a + (b - a) * sx + (c - a) * sy + (a - b - c + d) * sx * sy;
  };
  // the weave or print at a pixel: [factor on the cloth's colour, or null] and optionally another colour to take instead
  // (x, y in pixels of a 1024 texture – smaller textures are scaled)
  const MUSTER = {
    steppung(x, y) {
      const a = (x + y) % 34,
        b = (x - y + 4096) % 34;
      return a < 2 || b < 2 ? 0.72 : 1 + (vnoise(x / 9, y / 9) - 0.5) * 0.1;
    },
    cord(x, y) {
      return 0.86 + 0.24 * Math.abs(((x % 5) - 2) / 2) + (hash(x, y) - 0.5) * 0.06;
    },
    strick(x, y) {
      const r = y % 6,
        s = (x + (Math.floor(y / 6) % 2) * 3) % 6;
      return 0.84 + 0.2 * (r < 3 ? 1 : 0.5) + (Math.abs(s - 3) < 1 ? -0.1 : 0);
    },
    stonewash(x, y) {
      return 0.82 + vnoise(x / 22, y / 22) * 0.34 + vnoise(x / 4, y / 4) * 0.12 + (hash(x, y) - 0.5) * 0.08;
    },
    karo(x, y) {
      const a = x % 44 < 8,
        b = y % 44 < 8;
      return a && b ? 0.62 : a || b ? 0.8 : 1;
    },
    streifen(x, y) {
      return y % 90 < 7 || (y + 14) % 90 < 7 ? [2.4, [236, 236, 230]] : 1;
    },
    leder(x, y) {
      return 0.8 + vnoise(x / 30, y / 30) * 0.5 + (hash(x, y) - 0.5) * 0.05;
    },
    // small blossoms scattered on the cloth (the print of a Dederon apron)
    blumen(x, y) {
      const cx = Math.floor(x / 26),
        cy = Math.floor(y / 26),
        ox = 6 + hash(cx, cy) * 14,
        oy = 6 + hash(cy, cx + 7) * 14,
        d = Math.hypot((x % 26) - ox, (y % 26) - oy);
      if (d < 2) return [1, [236, 206, 96]];
      if (d < 5.2) return [1, hash(cx + 3, cy) < 0.5 ? [228, 226, 216] : [214, 130, 150]];
      return 1 + (vnoise(x / 6, y / 6) - 0.5) * 0.08;
    },
  };
  // zones: 0 nothing, 1 torso, 2 legs, 3 arms, 4 shoes, 5 … marks (stripe, collar, cuff band)
  function zoneOf(K, h, ax, fz, H, maxX) {
    if (h > 0.865) return 0;
    if (h < 0.06) return 4;
    if (ax > 0.82 * maxX && h > 0.3) return 0; // hands
    if (h > 0.83 && ax < 0.055 * H) return 0; // neck
    const legsTop = 0.5;
    if (h < legsTop) {
      if (K.rock && h >= K.rock && ax < 0.19 * H) return 1; // the dress or coat over the thighs
      return ax > 0.2 * H ? 0 : 2;
    }
    const arm = ax > 0.118 * H;
    if (K.streifen && h > 0.7 && h < 0.728) return 5;
    if (K.kragen && !arm && h > 0.805 && h < 0.845 && ax > 0.02 * H && ax < 0.075 * H && fz > 0) return 6;
    if (K.band && arm && ax > 0.6 * maxX && ax < 0.66 * maxX) return 7;
    return arm ? 3 : 1;
  }
  // paint the clothes K into the textures of a figure's model (bind pose). Returns the textures made (to free them later).
  function dress(model, K, restore) {
    const made = [];
    if (!K) return made;
    model.updateMatrixWorld(true);
    const box = new THREE.Box3(),
      parts = [];
    model.traverse(x => {
      if (!x.isMesh || !x.geometry || !x.geometry.attributes.position || !x.geometry.attributes.uv) return;
      const pa = x.geometry.attributes.position,
        n = pa.count,
        Wp = new Float32Array(n * 3);
      for (let i = 0; i < n; i++) {
        if (x.isSkinnedMesh) x.getVertexPosition(i, _p);
        else _p.fromBufferAttribute(pa, i);
        _p.applyMatrix4(x.matrixWorld);
        Wp[i * 3] = _p.x;
        Wp[i * 3 + 1] = _p.y;
        Wp[i * 3 + 2] = _p.z;
        box.expandByPoint(_p);
      }
      parts.push({ x, Wp });
    });
    if (!parts.length) return made;
    const H = Math.max(0.5, box.max.y - box.min.y),
      y0 = box.min.y,
      cx = (box.min.x + box.max.x) / 2,
      cz = (box.min.z + box.max.z) / 2,
      maxX = Math.max(0.3, (box.max.x - box.min.x) / 2);
    // which way the figure faces in this frame: the toes are in front of the heels (the lowest vertices' mean against the centre)
    let fzs = 0,
      fzn = 0;
    for (const { Wp } of parts)
      for (let i = 0; i < Wp.length; i += 3)
        if ((Wp[i + 1] - y0) / H < 0.03) {
          fzs += Wp[i + 2] - cz;
          fzn++;
        }
    const front = fzn && fzs / fzn < 0 ? -1 : 1;
    // triangles per material in texture space with their zone
    const jobs = new Map();
    for (const { x, Wp } of parts) {
      const g = x.geometry,
        ua = g.attributes.uv,
        idx = g.index,
        list = Array.isArray(x.material) ? x.material : [x.material],
        nt = (idx ? idx.count : g.attributes.position.count) / 3,
        groups =
          g.groups && g.groups.length && list.length > 1 ? g.groups : [{ start: 0, count: nt * 3, materialIndex: 0 }];
      for (const gr of groups) {
        const m = list[gr.materialIndex] || list[0];
        if (!m || !m.map || !m.map.image || !(m.map.image.width > 8)) continue;
        if (!jobs.has(m.map)) jobs.set(m.map, { tris: [], mats: new Set() });
        const J = jobs.get(m.map);
        J.mats.add(m);
        for (let t = gr.start; t + 2 < gr.start + gr.count; t += 3) {
          const a = idx ? idx.getX(t) : t,
            b = idx ? idx.getX(t + 1) : t + 1,
            c = idx ? idx.getX(t + 2) : t + 2,
            mx = (Wp[a * 3] + Wp[b * 3] + Wp[c * 3]) / 3 - cx,
            my = (Wp[a * 3 + 1] + Wp[b * 3 + 1] + Wp[c * 3 + 1]) / 3,
            mz = ((Wp[a * 3 + 2] + Wp[b * 3 + 2] + Wp[c * 3 + 2]) / 3 - cz) * front,
            z = zoneOf(K, (my - y0) / H, Math.abs(mx), mz, H, maxX);
          if (z) J.tris.push(z, ua.getX(a), ua.getY(a), ua.getX(b), ua.getY(b), ua.getX(c), ua.getY(c));
        }
      }
    }
    const MAX = COARSE ? 512 : 1024;
    for (const [tex, J] of jobs) {
      if (!J.tris.length) continue;
      let t2 = null;
      try {
        t2 = paint(tex, J.tris, K, MAX);
      } catch (e) {
        console.warn('grenzland dress', e);
      }
      if (!t2) continue;
      made.push(t2);
      S.paints++;
      for (const m of J.mats) {
        if (restore) restore.push([m, m.map]);
        m.map = t2;
        m.needsUpdate = true;
      }
    }
    return made;
  }
  function paint(tex, tris, K, MAX) {
    const img = tex.image,
      k = Math.min(1, MAX / Math.max(img.width, img.height)),
      W = Math.max(8, Math.round(img.width * k)),
      Hh = Math.max(8, Math.round(img.height * k)),
      sc = 1024 / Math.max(W, Hh);
    const cv = document.createElement('canvas');
    cv.width = W;
    cv.height = Hh;
    const c2 = cv.getContext('2d', { willReadFrequently: true });
    c2.drawImage(img, 0, 0, W, Hh);
    // the mask: every triangle in the grey of its zone (a little wider, so that the seams of the texture are covered)
    const mk = document.createElement('canvas');
    mk.width = W;
    mk.height = Hh;
    const m2 = mk.getContext('2d', { willReadFrequently: true });
    m2.fillStyle = '#000';
    m2.fillRect(0, 0, W, Hh);
    m2.lineWidth = 2;
    m2.lineJoin = 'round';
    const flip = tex.flipY ? 1 : 0;
    const py = v => (flip ? 1 - (v - Math.floor(v)) : v - Math.floor(v)) * Hh;
    const px = u => (u - Math.floor(u)) * W;
    for (let i = 0; i < tris.length; i += 7) {
      const g = tris[i] * 30;
      m2.fillStyle = m2.strokeStyle = 'rgb(' + g + ',' + g + ',' + g + ')';
      m2.beginPath();
      m2.moveTo(px(tris[i + 1]), py(tris[i + 2]));
      m2.lineTo(px(tris[i + 3]), py(tris[i + 4]));
      m2.lineTo(px(tris[i + 5]), py(tris[i + 6]));
      m2.closePath();
      m2.fill();
      m2.stroke();
    }
    const D = c2.getImageData(0, 0, W, Hh),
      p = D.data,
      Z = m2.getImageData(0, 0, W, Hh).data;
    // the mean light of the cloth and of the skin per zone (what the garment's colour is multiplied by keeps the folds)
    const sum = new Float64Array(16),
      cnt = new Float64Array(16);
    for (let i = 0; i < p.length; i += 4) {
      const z = Math.round(Z[i] / 30);
      if (!z || z > 7) continue;
      const sk = isSkin(p[i], p[i + 1], p[i + 2]) ? 8 : 0;
      sum[z + sk] += 0.3 * p[i] + 0.59 * p[i + 1] + 0.11 * p[i + 2];
      cnt[z + sk]++;
    }
    const ref = z => (cnt[z] > 20 ? sum[z] / cnt[z] : 110);
    const colOf = z =>
      z === 1
        ? K.ober
        : z === 2
          ? K.unter
          : z === 3
            ? K.armC || K.ober
            : z === 4
              ? K.schuh
              : z === 5
                ? K.streifen
                : z === 6
                  ? K.kragen
                  : K.band;
    const musterOf = z => MUSTER[z === 2 ? K.unterM : z === 1 || z === 3 ? K.oberM : ''] || null;
    for (let y = 0; y < Hh; y++)
      for (let x = 0; x < W; x++) {
        const i = (y * W + x) * 4,
          z = Math.round(Z[i] / 30);
        if (!z || z > 7) continue;
        const col = colOf(z);
        if (!col) continue;
        const r = p[i],
          g = p[i + 1],
          b = p[i + 2],
          sk = isSkin(r, g, b);
        // bare skin stays bare where the garment has no sleeves (arms of a summer apron); legs, torso and shoes are always covered
        if (sk && z === 3 && !K.arm) continue;
        const l = 0.3 * r + 0.59 * g + 0.11 * b,
          lr = ref(z + (sk ? 8 : 0));
        let f = 1 + (l / lr - 1) * (sk ? 0.45 : 0.7);
        f = Math.max(0.42, Math.min(1.5, f));
        let c = col;
        const M = z <= 3 ? musterOf(z) : null;
        if (M) {
          const q = M(Math.round(x * sc), Math.round(y * sc));
          if (Array.isArray(q)) {
            f *= q[0] > 1.5 ? 1 : q[0];
            c = q[1];
          } else f *= q;
        }
        p[i] = Math.min(255, c[0] * f);
        p[i + 1] = Math.min(255, c[1] * f);
        p[i + 2] = Math.min(255, c[2] * f);
      }
    c2.putImageData(D, 0, 0);
    const t = tex.clone();
    t.source = new THREE.Source(cv);
    t.needsUpdate = true;
    return t;
  }
  // ------------------------------------------------------------------ headwear ------------------------------------------------------------------
  // the crown of the head in the frame the model stands in at load (three: y up, the figure faces −z): centre, top, radius
  function headOf(model) {
    const box = new THREE.Box3(),
      pts = [];
    model.traverse(x => {
      if (!x.isSkinnedMesh || !x.geometry.attributes.position) return;
      const n = x.geometry.attributes.position.count,
        st = Math.max(1, Math.floor(n / 4000));
      for (let i = 0; i < n; i += st) {
        x.getVertexPosition(i, _p);
        _p.applyMatrix4(x.matrixWorld);
        box.expandByPoint(_p);
        pts.push(_p.x, _p.y, _p.z);
      }
    });
    const H = box.max.y - box.min.y,
      y1 = box.min.y + H * 0.9;
    let x0 = 1e9,
      x1 = -1e9,
      z0 = 1e9,
      z1 = -1e9,
      n = 0;
    for (let i = 0; i < pts.length; i += 3)
      if (pts[i + 1] > y1) {
        x0 = Math.min(x0, pts[i]);
        x1 = Math.max(x1, pts[i]);
        z0 = Math.min(z0, pts[i + 2]);
        z1 = Math.max(z1, pts[i + 2]);
        n++;
      }
    if (n < 20) return null;
    return { x: (x0 + x1) / 2, z: (z0 + z1) / 2, top: box.max.y, rx: (x1 - x0) / 2, rz: (z1 - z0) / 2 };
  }
  // a dome from the top down to the angle `to` (rad from the top), radii rx (across) and ry (along), in the kit's frame (z up)
  function dome(K, z0, rx, ry, rz, to, col, seg = 14, rings = 6, from = 0) {
    for (let j = 0; j < rings; j++) {
      const t0 = from + ((to - from) * j) / rings,
        t1 = from + ((to - from) * (j + 1)) / rings;
      for (let i = 0; i < seg; i++) {
        const a0 = (i / seg) * Math.PI * 2,
          a1 = ((i + 1) / seg) * Math.PI * 2,
          P = (a, t) => [Math.cos(a) * Math.sin(t) * rx, Math.sin(a) * Math.sin(t) * ry, z0 + Math.cos(t) * rz];
        if (j === 0 && from === 0) K.tri(P(a0, t1), P(a1, t1), P(a0, t0), col);
        else K.quad(P(a0, t1), P(a1, t1), P(a1, t0), P(a0, t0), col);
      }
    }
  }
  const HUT = {
    // the peaked cap of a uniform: band, a top wider than the band, the peak
    schirm(K, R, c) {
      const r = R * 1.02;
      K.lathe(
        0,
        0,
        -0.058,
        [
          [r, 0],
          [r, 0.04],
          [r * 1.34, 0.085],
          [r * 1.3, 0.1],
          [0, 0.104],
        ],
        16,
        c.top
      );
      K.lathe(
        0,
        0,
        -0.06,
        [
          [r * 1.015, 0],
          [r * 1.015, 0.03],
        ],
        16,
        c.band
      );
      K.box(0, r + 0.03, -0.058, 0.15, 0.085, 0.012, 0, c.peak, true);
      K.box(0, r + 0.004, -0.02, 0.03, 0.01, 0.03, 0, c.badge || c.band);
    },
    schieber(K, R, c) {
      dome(K, -0.085, R * 1.12, R * 1.22, 0.1, 1.25, c.top, 14, 4);
      K.box(0, R + 0.03, -0.062, 0.13, 0.07, 0.012, 0, c.top, true);
    },
    kopftuch(K, R, c) {
      dome(K, -R * 0.95, R * 1.12, R * 1.16, R * 1.12, 2.05, c.top, 14, 7);
      K.tri([-0.07, -R * 0.9, -0.12], [0.07, -R * 0.9, -0.12], [0, -R * 1.25, -0.25], c.top);
      K.tri([0.07, -R * 0.9, -0.12], [-0.07, -R * 0.9, -0.12], [0, -R * 1.25, -0.25], c.top);
      K.box(0, R * 0.55, -R * 2.02, 0.05, 0.04, 0.04, 0, c.band); // the knot under the chin
    },
    strick(K, R, c) {
      dome(K, -R * 0.9, R * 1.1, R * 1.14, R * 1.12, 1.45, c.top, 14, 6);
      K.lathe(
        0,
        0,
        -R * 0.9 + Math.cos(1.45) * R * 1.12 - 0.02,
        [
          [R * 1.13, 0],
          [R * 1.15, 0.035],
        ],
        14,
        c.band
      );
      dome(K, 0.045, 0.036, 0.036, 0.036, Math.PI, c.band, 8, 5);
    },
    basecap(K, R, c) {
      dome(K, -R * 0.9, R * 1.08, R * 1.12, R * 1.06, 1.42, c.top, 14, 6);
      K.box(0, R + 0.045, -R * 0.9 + 0.012, 0.15, 0.11, 0.012, 0, c.band, true);
    },
    // a moped helmet (jet shape): a shell down to the ears, a darker edge
    helm(K, R, c) {
      dome(K, -R * 0.78, R * 1.3, R * 1.36, R * 1.3, 1.95, c.top, 16, 8);
      K.lathe(
        0,
        0,
        -R * 0.78 + Math.cos(1.95) * R * 1.3 - 0.012,
        [
          [R * 1.24, 0],
          [R * 1.27, 0.02],
        ],
        16,
        c.band
      );
      K.box(0, R * 1.32, -R * 0.55, 0.19, 0.03, 0.014, 0, c.band, true);
    },
  };
  const HUTC = {
    vopo: ['schirm', { top: L(104, 116, 100), band: L(52, 96, 62), peak: L(16, 16, 16), badge: L(190, 170, 70) }],
    grenzer: ['schirm', { top: L(122, 122, 112), band: L(58, 118, 70), peak: L(16, 16, 16), badge: L(190, 170, 70) }],
    polizei: ['schirm', { top: L(236, 236, 232), band: L(22, 34, 66), peak: L(14, 14, 16), badge: L(210, 210, 215) }],
    schieber: ['schieber', { top: L(72, 66, 58) }],
    kopftuch: ['kopftuch', { top: L(150, 54, 60), band: L(150, 54, 60) }],
    strick: ['strick', { top: L(196, 70, 150), band: L(236, 232, 224) }],
    basecap: ['basecap', { top: L(30, 34, 40), band: L(30, 34, 40) }],
    helm: ['helm', { top: L(222, 220, 212), band: L(26, 26, 28) }],
    helmrot: ['helm', { top: L(170, 30, 28), band: L(26, 26, 28) }],
    helmschwarz: ['helm', { top: L(24, 24, 26), band: L(60, 60, 62) }],
  };
  const hutGeo = {};
  const _q = new THREE.Quaternion(),
    _s = new THREE.Vector3();
  // put a hat on a model's head bone (the model in its load frame, nothing animated yet); returns the group (remove it to take it off)
  function hatOn(model, head, kind) {
    const def = HUTC[kind];
    if (!def || !head) return null;
    model.updateMatrixWorld(true);
    const hd = headOf(model);
    if (!hd) return null;
    const R = Math.max(0.085, Math.min(0.125, (hd.rx + hd.rz) / 2));
    const gk = kind + ':' + R.toFixed(3);
    if (!hutGeo[gk]) {
      const K = VPROPS.kit();
      HUT[def[0]](K, R, def[1]);
      hutGeo[gk] = K.geo();
    }
    const g = new THREE.Group(),
      m = new THREE.Mesh(hutGeo[gk], VFIG.mat());
    m.userData.noMerge = true;
    m.userData.shared = true;
    m.castShadow = false;
    g.add(m);
    // the crown's top in the head bone's space; upright in the model's frame whatever the bone's rest rotation; in metres
    _p.set(hd.x, hd.top, hd.z);
    head.worldToLocal(_p);
    g.position.copy(_p);
    head.getWorldQuaternion(_q).invert();
    g.quaternion.copy(_q);
    head.getWorldScale(_s);
    g.scale.setScalar(1 / Math.max(1e-5, _s.x));
    head.add(g);
    return g;
  }
  // ------------------------------------------------------------------ people ------------------------------------------------------------------
  const hyp = Math.hypot;
  // one person of the cast (o: { kleid, hut } to override). Resolves to the figure F, or null when the files are missing.
  async function make(id, o = {}) {
    const c = GLDATA.CAST[id];
    if (!c || !avail(id)) return null;
    try {
      const [gl, set] = await Promise.all([CHL.loadAsync(U(fileOf(c))), clipSet(c.clips)]);
      const f = rbPerson(gl, set, { h: c.h, stoop: c.stoop || 0, idleRate: 0.8 + ((id.charCodeAt(0) * 7) % 10) / 50 });
      f.walker = { talking: false };
      f.g.updateMatrixWorld(true);
      const kleid = o.kleid || c.kleid,
        tex = dress(f.model, GLDATA.KLEID[kleid]),
        hut = o.hut === undefined ? c.hut : o.hut,
        hat = hut ? hatOn(f.model, f.bones.Head, hut) : null;
      f.g.visible = false;
      f.g.name = 'grenzland ' + id;
      scene.add(f.g);
      const F = {
        id,
        name: c.name,
        c,
        f,
        g: f.g,
        tex,
        hat,
        x: 0,
        y: 0,
        z: 0,
        hd: 0,
        v: 0,
        st: 'steht',
        path: null,
        done: null,
        downT: 0,
        tilt: 0,
        stuck: 0,
        r: 28, // how far this one sees (a witness)
        sees: true,
        era: o.era || 'heute',
      };
      S.figs.push(F);
      S.loads++;
      return F;
    } catch (e) {
      S.err = id + ': ' + String((e && e.message) || e).slice(0, 140);
      console.warn('grenzland figure', id, e);
      return null;
    }
  }
  function freeObj(o) {
    if (o.userData && o.userData.shared) return;
    if (o.geometry) o.geometry.dispose();
    const ms = Array.isArray(o.material) ? o.material : o.material ? [o.material] : [];
    for (const m of ms) {
      for (const t of ['map', 'normalMap', 'roughnessMap', 'metalnessMap', 'aoMap', 'emissiveMap', 'alphaMap'])
        if (m[t]) m[t].dispose();
      m.dispose();
    }
    if (o.isSkinnedMesh && o.skeleton && o.skeleton.boneTexture) o.skeleton.dispose();
  }
  function drop(F) {
    if (!F) return;
    const i = S.figs.indexOf(F);
    if (i < 0) return;
    S.figs.splice(i, 1);
    scene.remove(F.g);
    F.g.traverse(freeObj);
    for (const t of F.tex || []) t.dispose();
    F.gone = true;
    S.drops++;
    markDirty();
  }
  const dropAll = () => {
    for (const F of S.figs.slice()) drop(F);
  };
  function place(F, x, y, hd = 0) {
    F.x = x;
    F.y = y;
    F.z = KERN.ground(x, y);
    if (!Number.isFinite(F.z)) F.z = 0;
    F.hd = hd;
    F.v = 0;
    F.st = 'steht';
    F.path = null;
    F.done = null;
    F.g.visible = true;
    pose(F);
    markDirty(true);
  }
  function pose(F) {
    F.g.position.set(F.x, F.z + (F.tilt > 0.01 ? 0.12 * F.tilt : 0), -F.y);
    F.g.rotation.set(0, -F.hd, 0);
    if (F.tilt > 0.01) F.g.rotateX(-F.tilt * 1.45);
  }
  // walk to a point, or along points; v in m/s (the walk clip carries up to about 2.2); done() on arrival
  function go(F, pts, v = 1.3, done = null) {
    F.path = (Array.isArray(pts[0]) ? pts : [pts]).map(q => [q[0], q[1]]);
    F.v = v;
    F.st = 'geht';
    F.done = done;
    F.stuck = 0;
  }
  function stop(F) {
    F.path = null;
    F.st = F.downT > 0 ? 'liegt' : 'steht';
    F.done = null;
  }
  // knocked down for a while
  function down(F, sec = 6) {
    F.downT = sec;
    F.st = 'liegt';
    F.path = null;
  }
  const face = (F, x, y) => {
    F.hd = Math.atan2(x - F.x, y - F.y);
  };
  const turn = (a, b, k) => {
    let d = b - a;
    while (d > Math.PI) d -= 2 * Math.PI;
    while (d < -Math.PI) d += 2 * Math.PI;
    return a + d * Math.min(1, k);
  };
  const _w = [0, 0];
  function step(F, dt) {
    if (F.downT > 0) {
      F.downT -= dt;
      F.tilt += (1 - F.tilt) * Math.min(1, dt * 6);
      if (F.downT <= 0) F.st = 'steht';
    } else if (F.tilt > 0) F.tilt = Math.max(0, F.tilt - dt * 1.4);
    let sp = 0;
    if (F.st === 'geht' && F.path && F.path.length && F.tilt < 0.05) {
      const [tx, ty] = F.path[0],
        dx = tx - F.x,
        dy = ty - F.y,
        d = hyp(dx, dy);
      if (d < Math.max(0.35, F.v * dt * 1.5)) {
        F.path.shift();
        if (!F.path.length) {
          F.st = 'steht';
          const fn = F.done;
          F.done = null;
          if (fn) fn(F);
        }
      } else {
        const s = Math.min(d, F.v * dt);
        _w[0] = F.x + (dx / d) * s;
        _w[1] = F.y + (dy / d) * s;
        try {
          KERN.pushOut(_w, 0.28);
        } catch (e) {}
        const moved = hyp(_w[0] - F.x, _w[1] - F.y);
        // pushed aside by a wall: slide along it; no way on: a step to the side
        if (moved < s * 0.25) {
          F.stuck += dt;
          if (F.stuck > 0.6) {
            const a = Math.atan2(dx, dy) + (F.id.length % 2 ? 1.3 : -1.3);
            _w[0] = F.x + Math.sin(a) * F.v * dt * 2;
            _w[1] = F.y + Math.cos(a) * F.v * dt * 2;
            try {
              KERN.pushOut(_w, 0.28);
            } catch (e) {}
          }
        } else F.stuck = Math.max(0, F.stuck - dt);
        if (Number.isFinite(_w[0]) && Number.isFinite(_w[1])) {
          F.hd = turn(F.hd, Math.atan2(_w[0] - F.x, _w[1] - F.y), dt * 7);
          F.x = _w[0];
          F.y = _w[1];
        }
        const z = KERN.ground(F.x, F.y, F.z + 0.6);
        if (Number.isFinite(z)) F.z = z;
        sp = F.v;
      }
    }
    pose(F);
    F.f.anim(dt, sp);
    return sp;
  }
  function tick(dt) {
    let any = false;
    for (const F of S.figs) {
      if (!F.g.visible) continue;
      const sp = step(F, dt);
      if (sp > 0 || F.tilt > 0 || F.f.walker.talking) any = true;
    }
    if (any) markDirty();
  }
  const talking = (F, on) => {
    if (F && F.f.walker) F.f.walker.talking = !!on;
  };
  const near = (x, y, r, era) =>
    S.figs.filter(F => F.g.visible && (!era || F.era === era) && hyp(F.x - x, F.y - y) < r);
  Object.assign(S, {
    avail,
    make,
    drop,
    dropAll,
    place,
    go,
    stop,
    down,
    face,
    tick,
    talking,
    near,
    dress,
    hatOn,
    MUSTER,
    HUTC,
  });
  return S;
})();
window.GLFIG = GLFIG;
