// ===================== feat/bewuchs: what grows where – the area maps for the template (BWKARTE) =====================
// The helper `bewuchs-daten` makes one small map per 400 m cell of the model grid (the cells of gebaeude/z/): an 8-bit PNG, north up,
// value = class (bits 0–4: lawn, public green, verge, hay meadow, pasture … – BWPHAENO.CLASSES) + 32 × vigour (bits 5–7), and a finer one
// over Falko's garden (0.25 m) – in dist/bewuchs/z/ and dist/bewuchs/garten.png (docs/plans/auftraege/bewuchs-daten.md). Here they are
// fetched near the observer and dropped far (decoded once to bytes), read by the blades through two textures:
//   the guide: 512² texels of 0.5 m (256 m) around the camera, moved when the camera is 32 m from its middle (a full refill, few ms);
//   the site: 368 × 400 texels of 0.25 m over the modelled site (x −50…42, y −52…48) – the garden map with what the runtime knows
//   better: no grass in the pavilion's square, the brook's ditch, on the bridge and the terrace, in the buildings' footprints (also when
//   moved in the plan view: garden/grass.js footRects), on worn patches (GRASS.bare) and – from construction phase 1 on – on the gravel paths.
// Until the helper's maps are there (or without them): a stand-in by rules – the garden lawn, a meadow in the rest of the site, public
// green elsewhere (the blades thin themselves out where the orthophoto is not green; bw_halm.js).
//   BWKARTE.codeAt(x, y)       the code (class | vigour << 5) at model point (x, y) – 0 where nothing grows or nothing is known
//   BWKARTE.want(x, y)         fetch the cells near (x, y), drop the far ones; recentre the guide (call it each frame, cheap)
//   BWKARTE.U                  uniforms of the textures: tBwG/uBwG (guide), tBwS/uBwS (site)
//   BWKARTE.siteDirty()        rebuild the site texture (buildings moved, a patch worn, the phase changed)
//   BWKARTE.state()            { index, cells, loaded, fallback, guide: [x0, y0], site }
import * as THREE from 'three';
import { BASE } from '../core/head.js';
import { markDirty } from '../core/assets.js';
import { inRect } from '../core/geo.js';
import { NOPATH, S0 } from '../garden/env.js';
import { gravelMask, GRASS, inPoly } from '../garden/grass.js';
import { STREAM } from '../garden/stream_geo.js';
import { inLocal } from '../garden/site_base.js';
export const BWKARTE = (() => {
  const S = {
    index: null,
    phase: 'idle',
    cells: new Map(),
    fallback: true,
    loaded: 0,
    dropped: 0,
    err: '',
    garden: null,
    guide: null,
    site: null,
  };
  const CELL = 400,
    NEAR = 520,
    FAR = 900;
  // ---------- the stand-in by rules (until the maps are there) ----------
  const SITE = { x0: -50, x1: 42, y0: -52, y1: 48 };
  function ruleAt(x, y) {
    if (x > SITE.x0 && x < SITE.x1 && y > SITE.y0 && y < SITE.y1) {
      if (inPoly(x, y, S0.garden) || Math.hypot(x - 2, y - 2) < 9) return 1 | (6 << 5);
      return 4 | (5 << 5);
    }
    const r = window.ROADS && ROADS.at ? ROADS.at(x, y) : null;
    if (r) return 0;
    return 2 | (5 << 5);
  }
  // ---------- the cells ----------
  // new data: the guide starts its refill again (a refill under way would keep rows read before)
  const stale = () => {
    if (S.guide) {
      S.guide.c = null;
      S.guide.job = null;
    }
  };
  const key = (i, j) => i + '_' + j;
  function loadIndex() {
    if (S.phase !== 'idle') return;
    S.phase = 'index';
    fetch(BASE + 'bewuchs/z/index.json')
      .then(r => (r.ok ? r.json() : Promise.reject(new Error('index.json ' + r.status))))
      .then(j => {
        S.index = j;
        S.fallback = false;
        S.phase = 'ok';
        if (j.garten) loadGarden(j.garten);
        stale(); // refill with the real data
      })
      .catch(e => {
        S.err = String((e && e.message) || e);
        S.phase = 'none'; // no maps: the rules
        stale();
        siteDirty();
      });
  }
  // a PNG → its red channel (bytes); size from the picture
  function decode(url) {
    return fetch(url)
      .then(r => (r.ok ? r.blob() : Promise.reject(new Error(url + ' ' + r.status))))
      .then(b => createImageBitmap(b, { premultiplyAlpha: 'none', colorSpaceConversion: 'none' }))
      .then(bm => {
        const w = bm.width,
          h = bm.height,
          cv = typeof OffscreenCanvas !== 'undefined' ? new OffscreenCanvas(w, h) : document.createElement('canvas');
        cv.width = w;
        cv.height = h;
        const cx = /** @type {any} */ (cv).getContext('2d', { willReadFrequently: true });
        cx.drawImage(bm, 0, 0);
        const d = cx.getImageData(0, 0, w, h).data,
          px = new Uint8Array(w * h);
        for (let i = 0; i < px.length; i++) px[i] = d[i * 4];
        bm.close && bm.close();
        return { w, h, px };
      });
  }
  function loadGarden(g) {
    decode(BASE + 'bewuchs/garten.png')
      .then(r => {
        S.garden = Object.assign({ x0: g.x0, y0: g.y0, res: g.res || 0.25 }, r);
        siteDirty();
      })
      .catch(e => (S.err = String((e && e.message) || e)));
  }
  function want(x, y) {
    if (S.phase === 'idle') loadIndex();
    if (S.index && S.index.cells) {
      const i0 = Math.floor((x - NEAR) / CELL),
        i1 = Math.floor((x + NEAR) / CELL),
        j0 = Math.floor((y - NEAR) / CELL),
        j1 = Math.floor((y + NEAR) / CELL);
      let busy = 0;
      for (const c of S.cells.values()) if (c.state === 'load') busy++;
      for (let i = i0; i <= i1 && busy < 2; i++)
        for (let j = j0; j <= j1 && busy < 2; j++) {
          const k = key(i, j),
            meta = S.index.cells[k];
          if (!meta || S.cells.has(k)) continue;
          const c = { k, i, j, res: meta.res || 1, state: 'load', px: null, n: 0 };
          S.cells.set(k, c);
          busy++;
          decode(BASE + 'bewuchs/z/' + k + '.png')
            .then(r => {
              c.px = r.px;
              c.n = r.w;
              c.res = CELL / r.w;
              c.state = 'ok';
              S.loaded++;
              stale();
              // a cell under the modelled site: the site texture reads it where the garden map has nothing
              if (
                (c.i + 1) * CELL > SITE.x0 &&
                c.i * CELL < SITE.x1 &&
                (c.j + 1) * CELL > SITE.y0 &&
                c.j * CELL < SITE.y1
              )
                siteDirty();
            })
            .catch(e => {
              c.state = 'err';
              S.err = String((e && e.message) || e);
            });
        }
      // far ones out of memory
      for (const [k, c] of S.cells) {
        const cx = (c.i + 0.5) * CELL,
          cy = (c.j + 0.5) * CELL;
        if (Math.max(Math.abs(cx - x), Math.abs(cy - y)) > FAR + CELL / 2 && c.state !== 'load') {
          S.cells.delete(k);
          S.dropped++;
          stale();
        }
      }
    }
    guideAt(x, y);
  }
  // the code at (x, y): the site's (garden and runtime), a cell's, or the rules
  function codeAt(x, y) {
    const st = S.site;
    if (st && st.px && x > SITE.x0 && x < SITE.x1 && y > SITE.y0 && y < SITE.y1) {
      const u = Math.floor((x - SITE.x0) / st.res),
        v = Math.floor((y - SITE.y0) / st.res);
      if (u >= 0 && v >= 0 && u < st.w && v < st.h) return st.px[v * st.w + u];
    }
    return dataAt(x, y);
  }
  function dataAt(x, y) {
    if (S.fallback) return S.phase === 'index' ? 0 : ruleAt(x, y);
    const i = Math.floor(x / CELL),
      j = Math.floor(y / CELL),
      c = S.cells.get(key(i, j));
    if (!c) return S.index && S.index.cells[key(i, j)] ? 0 : ruleOutside(x, y);
    if (c.state !== 'ok') return 0;
    const u = Math.floor((x - i * CELL) / c.res),
      v = c.n - 1 - Math.floor((y - j * CELL) / c.res); // north up
    if (u < 0 || v < 0 || u >= c.n || v >= c.n) return 0;
    return c.px[v * c.n + u];
  }
  // beyond the cells the helper has made so far: nothing (the world tiles get theirs in stage 5)
  const ruleOutside = () => 0;
  // ---------- the guide around the camera ----------
  const GN = 512,
    GR = 0.5;
  const gData = new Uint8Array(GN * GN),
    gTex = new THREE.DataTexture(gData, GN, GN, THREE.RedFormat, THREE.UnsignedByteType);
  gTex.magFilter = gTex.minFilter = THREE.NearestFilter;
  gTex.generateMipmaps = false;
  gTex.needsUpdate = true;
  const U = {
    tBwG: { value: gTex },
    uBwG: { value: new THREE.Vector4(0, 0, 1 / (GN * GR), 1 / (GN * GR)) },
    tBwS: { value: null },
    uBwS: { value: new THREE.Vector4(SITE.x0, SITE.y0, 1 / (SITE.x1 - SITE.x0), 1 / (SITE.y1 - SITE.y0)) },
  };
  S.guide = { x0: NaN, y0: NaN, c: null, job: null };
  // one row of texels from the cells: at most two cells cross a row of the window, each read in a tight loop
  function fillRow(buf, o, x0, y, n, res) {
    if (S.fallback) {
      buf.fill(S.phase === 'index' ? 0 : 2 | (5 << 5), o, o + n); // the site texture has the garden; the blades thin out off the green
      return;
    }
    const j = Math.floor(y / CELL);
    let i = 0;
    while (i < n) {
      const ci = Math.floor((x0 + (i + 0.5) * res) / CELL),
        iEnd = Math.min(n, Math.ceil(((ci + 1) * CELL - x0) / res - 0.5)),
        c = S.cells.get(key(ci, j));
      if (!c || c.state !== 'ok') buf.fill(0, o + i, o + iEnd);
      else {
        const v = c.n - 1 - Math.floor((y - j * CELL) / c.res);
        if (v < 0 || v >= c.n) buf.fill(0, o + i, o + iEnd);
        else {
          const ro = v * c.n,
            bx = ci * CELL;
          for (let k = i; k < iEnd; k++)
            buf[o + k] = c.px[ro + Math.min(c.n - 1, Math.floor((x0 + (k + 0.5) * res - bx) / c.res))];
        }
      }
      i = Math.max(iEnd, i + 1);
    }
  }
  function guideAt(x, y) {
    const G = S.guide,
      half = (GN * GR) / 2;
    const fresh = !(Math.abs(x - (G.x0 + half)) < 32 && Math.abs(y - (G.y0 + half)) < 32);
    if (!fresh && G.c && !G.job) return;
    // a new window, or new data: refilled within ~3 ms a frame
    if (!G.job || fresh) {
      const x0 = Math.floor((x - half) / 8) * 8,
        y0 = Math.floor((y - half) / 8) * 8;
      if (G.job && G.job.x0 === x0 && G.job.y0 === y0) {
        // the same window: go on
      } else G.job = { x0, y0, row: 0, buf: new Uint8Array(GN * GN) };
    }
    const J = G.job,
      t0 = performance.now();
    while (J.row < GN && performance.now() - t0 < 3) {
      const r1 = Math.min(GN, J.row + 32);
      for (let j = J.row; j < r1; j++) fillRow(J.buf, j * GN, J.x0, J.y0 + (j + 0.5) * GR, GN, GR);
      J.row = r1;
    }
    if (J.row < GN) return;
    gData.set(J.buf);
    gTex.needsUpdate = true;
    G.x0 = J.x0;
    G.y0 = J.y0;
    G.c = true;
    G.job = null;
    U.uBwG.value.set(G.x0, G.y0, 1 / (GN * GR), 1 / (GN * GR));
    markDirty();
  }
  // ---------- the site: the garden map with what the runtime knows ----------
  const SR = 0.25,
    SW = Math.round((SITE.x1 - SITE.x0) / SR),
    SH = Math.round((SITE.y1 - SITE.y0) / SR);
  const sData = new Uint8Array(SW * SH),
    sTex = new THREE.DataTexture(sData, SW, SH, THREE.RedFormat, THREE.UnsignedByteType);
  sTex.magFilter = sTex.minFilter = THREE.NearestFilter;
  sTex.generateMipmaps = false;
  U.tBwS.value = sTex;
  S.site = { res: SR, w: SW, h: SH, px: null, job: null, n: 0 };
  function siteDirty() {
    S.site.job = { row: 0, buf: new Uint8Array(SW * SH), R: GRASS.footRects ? GRASS.footRects() : [] };
  }
  function siteCode(x, y, R) {
    // the garden map (or the rules) …
    let c;
    const g = S.garden;
    if (g) {
      const u = Math.floor((x - g.x0) / g.res),
        v = g.h - 1 - Math.floor((y - g.y0) / g.res);
      c = u >= 0 && v >= 0 && u < g.w && v < g.h ? g.px[v * g.w + u] : dataAt(x, y);
    } else c = S.fallback ? ruleAt(x, y) : dataAt(x, y);
    if (!(c & 31)) return 0;
    // … and nothing where the runtime knows better
    if (x > -1.0 && x < 6.8 && y > -1.0 && y < 5.0) return 0;
    if (STREAM.inDitch(x, y, 0.2) || STREAM.onBridge(x, y)) return 0;
    for (const f of window.SITE_FOOT || []) if (inLocal(f.b, x, y, f.hx, f.hy, f.ox, f.oy)) return 0;
    if (!NOPATH.value && gravelMask(x, y) > 0.08) return 0;
    for (const q of R) if (x > q.x0 && x < q.x1 && y > q.y0 && y < q.y1 && inRect(q.r, x, y, 0.12)) return 0;
    // a lawn inside Falko's garden is his own (class 18): it grows until he mows it
    if ((c & 31) === 1 && inPoly(x, y, S0.garden)) c = (c & 0xe0) | 18;
    const T = STREAM.TERR;
    if (T) {
      const [t, o] = STREAM.loc(x, y);
      if (t > T.t - T.ht - 0.85 && t < T.t + T.ht + 0.25 && o > T.o - T.ho - 0.9 && o < T.o + T.ho + 0.25) return 0;
    }
    return c;
  }
  // built within ~3 ms a frame (the first time and after each change)
  function siteTick() {
    const st = S.site,
      J = st.job;
    if (!J) return false;
    const t0 = performance.now();
    while (J.row < SH && performance.now() - t0 < 3) {
      const v = J.row++,
        y = SITE.y0 + (v + 0.5) * SR,
        o = v * SW;
      for (let u = 0; u < SW; u++) J.buf[o + u] = siteCode(SITE.x0 + (u + 0.5) * SR, y, J.R);
    }
    if (J.row < SH) return true;
    sData.set(J.buf);
    st.px = sData;
    st.job = null;
    st.n++;
    sTex.needsUpdate = true;
    markDirty();
    return false;
  }
  let lastPath = -1;
  function tick() {
    if (NOPATH.value !== lastPath) {
      lastPath = NOPATH.value;
      siteDirty();
    }
    siteTick();
  }
  const state = () => ({
    index: S.phase,
    fallback: S.fallback,
    cells: S.cells.size,
    loaded: S.loaded,
    dropped: S.dropped,
    garden: !!S.garden,
    guide: [S.guide.x0, S.guide.y0],
    site: S.site.n,
    err: S.err,
  });
  Object.assign(S, { codeAt, dataAt, want, U, siteDirty, tick, state, SITE, ruleAt });
  return S;
})();
if (typeof window !== 'undefined') window.BWKARTE = BWKARTE;
