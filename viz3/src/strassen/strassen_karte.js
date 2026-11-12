// ===================== feat/strassen 3: the road map of a window around the observer beyond the square (STRKARTE) =====================
// In the 2.4 km square the ground shader reads the road map of world/roads.js: asphalt with its wear, shoulders, kerbs, markings. Beyond
// it the tiles of welt/welt.js showed the roads of welt/fahrt.js only as a dark band from a canvas – no centre line, no edge. Here the same
// kind of map (strassen/strassen_stil.js) is rastered for a window around the observer from those roads and handed to the tiles' shader
// (ROADS.W): the country roads look like the ones in the square, and the streets a zone has laid itself (Schleusingen) get the markings.
// The window follows the observer: a new map is rastered a few ways per frame into a second buffer and swapped in when done (in a town a
// whole raster would take tens of milliseconds – too long for one frame). The roads end 70 m before the window's nearest edge (uRoad.z);
// further out the plain band of welt/fahrt.js remains. ?nostrassen leaves the map out.
import * as THREE from 'three';
import { COARSE } from '../core/head.js';
import { KERN } from '../core/kern.js';
import { ANISO, markDirty } from '../core/assets.js';
import { ROADS } from '../world/roads.js';
import { WELT } from '../welt/welt.js';
import { FAHRT } from '../welt/fahrt.js';
import { STRSTIL } from './strassen_stil.js';
import { STRDAT } from './strassen_daten.js';
export const STRKARTE = (() => {
  const S = { on: false, active: false, n: 0, ms: 0, msMax: 0, x0: 0, y0: 0, busy: false };
  if (!ROADS.W || !FAHRT.on || !WELT.on || !STRDAT.on) return S;
  S.on = true;
  // the window: 1536 m at 1.5 m per pixel; on phones and tablets 1024 m at 2 m (a quarter of the memory)
  const SZ = COARSE ? 1024 : 1536,
    RES = COARSE ? 2 : 1.5,
    N = SZ / RES,
    MOVE = COARSE ? 170 : 250, // a new map when the observer is this far from the middle
    FAR = SZ / 2 - MOVE - 18, // where the roads end: before the nearest edge the window can have
    BUDGET = 2.5; // ms of raster per frame
  S.SZ = SZ;
  S.RES = RES;
  S.FAR = FAR;
  let front = null, // the bytes of the map shown
    back = null,
    tex = null,
    job = null;
  const U = ROADS.W;
  function styleOf(w) {
    if (!w.st) w.st = STRSTIL.styles(w.p, 3, w.n, w.kind, STRDAT.ready ? STRDAT.placeAt : null);
    return w.st;
  }
  function start(cx, cy) {
    const x0 = Math.round(cx - SZ / 2),
      y0 = Math.round(cy - SZ / 2),
      list = [];
    for (const w of FAHRT.data.ways) {
      if (w.fl & 3) continue; // bridges get their deck (welt/fahrt.js), tunnels nothing
      if (w.bb[2] < x0 - 12 || w.bb[0] > x0 + SZ + 12 || w.bb[3] < y0 - 12 || w.bb[1] > y0 + SZ + 12) continue;
      list.push(w);
    }
    if (!back) back = new Uint8Array(N * N * 4);
    STRSTIL.clear(back);
    job = { x0, y0, list, i: 0, t0: performance.now(), ms: 0 };
    S.busy = true;
  }
  function work(budget) {
    const t0 = performance.now(),
      J = job;
    while (J.i < J.list.length) {
      const w = J.list[J.i++];
      STRSTIL.raster(back, N, N, J.x0, J.y0, RES, {
        p: w.p,
        stride: 3,
        n: w.n,
        hw: w.hw,
        kind: w.kind,
        surf: w.surf,
        st: styleOf(w),
      });
      if (performance.now() - t0 > budget) break;
    }
    J.ms += performance.now() - t0;
    if (J.i < J.list.length) return;
    // done: the buffers change places, the texture takes the new one
    const b = front;
    front = back;
    back = b;
    if (!tex) {
      tex = new THREE.DataTexture(front, N, N, THREE.RGBAFormat, THREE.UnsignedByteType);
      tex.colorSpace = THREE.NoColorSpace;
      tex.wrapS = tex.wrapT = THREE.ClampToEdgeWrapping;
      tex.magFilter = THREE.LinearFilter;
      tex.minFilter = THREE.LinearMipmapLinearFilter;
      tex.generateMipmaps = true;
      tex.anisotropy = Math.min(ANISO, 4);
      tex.flipY = false;
      U.tRoad.value = tex;
    } else tex.image.data = front;
    tex.needsUpdate = true;
    U.bRoad.value.set(J.x0, J.y0, 1 / SZ, 1 / SZ);
    U.uRoad.value.x = 1;
    U.uRoad.value.z = FAR;
    S.x0 = J.x0;
    S.y0 = J.y0;
    S.n++;
    S.ways = J.list.length;
    S.ms = Math.round(J.ms * 10) / 10;
    S.msMax = Math.max(S.msMax, S.ms);
    S.active = true;
    S.busy = false;
    job = null;
    markDirty(true);
  }
  function off() {
    if (!S.active && !job) return;
    job = null;
    S.busy = false;
    S.active = false;
    U.uRoad.value.x = 0;
    markDirty(true);
  }
  let acc = 1;
  KERN.tick(dt => {
    if (job) return work(BUDGET);
    acc += dt;
    if (acc < 0.3) return;
    acc = 0;
    if (!FAHRT.ready || !WELT.active || !FAHRT.data || !FAHRT.data.ways.length) return off();
    const w = KERN.where();
    if (!w) return;
    if (!S.active || Math.abs(w[0] - S.x0 - SZ / 2) > MOVE || Math.abs(w[1] - S.y0 - SZ / 2) > MOVE) start(w[0], w[1]);
  }, 'strassen-karte');
  // the map at a point (tests, the furniture): { e, kind, surf, style, lat } or null
  S.at = (x, y) => (S.active && front ? STRSTIL.read(front, N, N, S.x0, S.y0, RES, x, y) : null);
  // tests: finish the running raster now
  S.flush = () => {
    while (job) work(1e9);
  };
  return S;
})();
window.STRKARTE = STRKARTE;
