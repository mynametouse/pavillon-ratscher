// ===================== feat/bewuchs stage 2b: the vegetation far away – in the ground's own colour (BWFERNE) =====================
// The flowers of bw_blume.js stand as small plants out to ~25 m, the blades of bw_halm.js to 40 m; beyond, a meadow in June would turn
// plain green and a field of wheat would be the bare ground of the aerial photo. Here the ground shaders (world/roads.js landDetail,
// marked hook `feat/bewuchs`: they call bwFar( p, c, dist ) at the end) get both from one texture of 512 × 1024 texels around the camera
// (texels of 2 m, 1 km):
// - the upper half the bloom of each place: the colour of a flower in bloom there (drawn by its hash from the species of its kind of
//   area, weighted by how many of them flower today, half way to the mean of them) and in alpha how much of the ground they cover.
//   feat/fotorealismus (18.11.2026): the ground takes that share as a tint – more of it the flatter the view (the heads stand before
//   the grass behind them), in drifts (denser here, thinner there); single heads as dots of 12 cm only where a pixel is finer than
//   that (looking down from close by). Before, dots of 0.4–3 m in the flower's full colour: confetti from any raised point.
// - the lower half the class of each place (BWKARTE's code, read without filtering). feat/fotorealismus: on a field of the crop classes
//   the ground shows its crop – the same one the blades stand in (the same choice per field, BWHALM.cropGlsl with the blades' hash):
//   the stand as one surface in its colour of today by how much of the soil it covers (closed the flatter the view; looking down
//   into it the soil of its phase, BWARTEN.ackerboden), in its harvest days each field cut on its own day.
//   Out to ~340 m around the camera, and only below ~70 m above the ground: from high up a field keeps the photo (the window is 1 km).
// - feat/ferne (19.11.2026, Falko: „die Felder auch von größerer Ferne aus sehen … und nicht dann plötzlich auftauchen“): a third band
//   of 512² texels of 10 m (5 km) around the camera, the classes of the fields from a coarse copy of the maps (8 m, tools/ferne/
//   felder.py → dist/ferne/felder.bin, 30 KB – the maps themselves are loaded only within ~520 m): the crops go on from where the
//   fine band hands over (260–340 m) out to 1.5–2 km, in the same colour of the same day, then fade into the photo. Not on phones.
// Fields cut in the last weeks carry fewer flowers (the share of the fields of a class that flower again after the cuts, from its care).
//   BWFERNE.shader(sh)       for world/roads.js S.shader: the uniforms into sh, the GLSL of bwFar
//   BWFERNE.day(doy)         the bloom of each class and the crops' rows today – refills the texture
//   BWFERNE.want(x, y, alt)  recentre the window (moved > 96 m) and go on with a refill (≤ 3 ms a frame); alt: the camera above the ground
//   BWFERNE.refill()         the maps changed: fill again
//   BWFERNE.state()          { on, x0, y0, n, classes: { id: share }, crops: [{ id, cover, cut }] }
import * as THREE from 'three';
import { markDirty } from '../core/assets.js';
import { BASE, COARSE } from '../core/head.js';
import { DETAIL } from '../core/detail.js';
import { FOREST } from '../world/forest.js';
import { BWKARTE } from './bw_karte.js';
import { BWPHAENO } from './bw_phaeno.js';
import { BWBLUME } from './bw_blume.js';
import { BWHALM } from './bw_halm.js';
import { BWARTEN } from './bw_arten.js';
export const BWFERNE = (() => {
  const N = 512,
    RES = 2,
    SPAN = N * RES,
    MOVE = 96, // the window follows the camera in steps of this (m)
    // the crops fade out before the window's edge can come into sight: half the window less a step and what a vehicle drives in a refill
    RC1 = SPAN / 2 - MOVE - 76,
    RC0 = RC1 - 80,
    NC = 8,
    // feat/ferne: the coarse band of the fields (not on phones: their texture keeps its two bands)
    FAR = !COARSE,
    RES2 = 10,
    SPAN2 = N * RES2,
    MOVE2 = 384,
    RF0 = 1500, // the far crops fade into the photo between these (m): inside the band wherever the camera stands in it
    RF1 = 2000;
  // rows 0 … N − 1 the bloom (filtered), rows N … 2N − 1 the class codes (read texel by texel) – one texture, one sampler: the ground
  // near the pavilion is at its 16
  const data = new Uint8Array(N * N * (FAR ? 12 : 8)),
    tex = new THREE.DataTexture(data, N, (FAR ? 3 : 2) * N, THREE.RGBAFormat, THREE.UnsignedByteType);
  tex.magFilter = THREE.LinearFilter;
  tex.minFilter = THREE.LinearFilter;
  tex.generateMipmaps = false;
  tex.needsUpdate = true;
  const U = {
    tBwFar: { value: tex },
    uBwFarB: { value: new THREE.Vector4(0, 0, 1 / SPAN, 0) }, // x0, y0, 1/size, on
    uBwFarE: { value: new THREE.Vector4(0, 0, 1 / SPAN2, 0) }, // feat/ferne: the coarse band of the fields – x0, y0, 1/size, on
    // feat/fotorealismus: the crops in the ground – x, y: they fade out between these distances (m; inside the window wherever the
    // camera stands in it), z: their strength (0 from high above), w: the day of the year
    uBwFarC: { value: new THREE.Vector4(RC0, RC1, 0, 150) },
    // feat/fotorealismus (foto-wald): the woods' floor under its trees – x: the share of the light that reaches it (the class's
    // row, BWARTEN flaechen[11].schirm: what its plants get, bw_halm.js bwLight)
    // y: the size (m) of the soft patches its herb layer stands in (0: none), z: how much of the herb layer shows in the floor
    uBwFarW: { value: new THREE.Vector4(1, 0, 0, 0) },
    // the herb layer in the floor's colour – 0 its carpet plant (bilberry), 1 its grasses: where each stands (the soft field's
    // values from, to; which field; the patches' size – as the mix texture of bw_blume.js has them), and its colour and cover
    uBwFarH: { value: [new THREE.Vector4(-1, -1, 0, 1), new THREE.Vector4(2, 2, 0, 1)] },
    uBwFarHc: { value: [new THREE.Vector4(0.05, 0.1, 0.03, 0), new THREE.Vector4(0.08, 0.14, 0.04, 0)] },
    // per crop (the rows CROP0 … of BWPHAENO): the stand's colour and how much of the soil it covers; the soil's colour; its harvest
    // (the day, ± days per field; 0: not in its harvest days); the stubble's colour and cover
    uBwFc: { value: Array.from({ length: NC }, () => new THREE.Vector4(0.1, 0.2, 0.05, 0)) },
    uBwFs: { value: Array.from({ length: NC }, () => new THREE.Vector4(0.2, 0.13, 0.08, 0)) },
    uBwFh: { value: Array.from({ length: NC }, () => new THREE.Vector4(0, 0, 0, 0)) },
    uBwFt: { value: Array.from({ length: NC }, () => new THREE.Vector4(0.57, 0.46, 0.2, 0)) },
  };
  const S = {
    x0: NaN,
    y0: NaN,
    job: null,
    n: 0,
    bloom: [],
    crops: [],
    doy: NaN,
    far: { x0: NaN, y0: NaN, job: null, n: 0, cells: null },
  };
  const lin = v => (v <= 0.04045 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4));
  const hexLin = h =>
    typeof h === 'string' && h[0] === '#' ? [1, 3, 5].map(i => lin(parseInt(h.slice(i, i + 2), 16) / 255)) : null;
  // the share of a class's fields not cut in the last ~4 weeks (flowers come back after that) – from its care
  function uncut(k, doy) {
    const m = k && k.mow;
    if (!m || !m.cuts) return 1;
    let cut = 0;
    m.cuts.forEach((c, i) => {
      const sp = Math.max(1, m.spread || 1),
        sh = m.share && Number.isFinite(m.share[i]) ? m.share[i] : 1,
        // fields cut between doy − 28 and doy: their cut day c + off, off uniform in ±sp
        a = Math.max(c - sp, doy - 28),
        b = Math.min(c + sp, doy);
      if (b > a) cut += (sh * (b - a)) / (2 * sp);
    });
    return Math.max(0, 1 - cut);
  }
  // the bloom of each class today: up to six species (cumulative weight, linear colour) and the share of ground their flowers cover
  function day(doy) {
    S.doy = doy;
    const SP = BWBLUME.SP,
      MIX = BWBLUME.MIX || {},
      out = [];
    for (let c = 0; c < 32; c++) {
      const k = BWPHAENO.K[c],
        m = MIX[c];
      if (!k || !m || !(k.flowers > 0)) {
        out[c] = null;
        continue;
      }
      const L = [];
      let sum = 0;
      for (const [id, w] of Object.entries(m)) {
        const s = SP.find(q => q.id === id);
        // (the grasses' heads are no coloured dots from afar, nor the crops' plants: a field's colour from afar is the photo's)
        if (!s || s.grass || s.crop) continue;
        const a = bloomOf(s, doy);
        if (!(a.amount > 0) || !a.col) continue;
        sum += w * a.amount;
        L.push([w * a.amount, a.col]);
      }
      if (!L.length || !(sum > 0)) {
        out[c] = null;
        continue;
      }
      L.sort((p, q) => q[0] - p[0]);
      const top = L.slice(0, 6);
      let acc = 0;
      const tot = top.reduce((p, q) => p + q[0], 0);
      // flowers per m² × their share in bloom × a head of ~3 cm² … as ground covered (a June meadow ~25 %), the cut fields fewer
      const share =
        Math.min(0.45, k.flowers * (sum / Object.values(m).reduce((p, q) => p + q, 0)) * 0.014) * uncut(k, doy);
      out[c] = {
        share,
        // the mean of them: each place's colour goes half way to it (a meadow is no patchwork of pure colours)
        mean: [0, 1, 2].map(i => top.reduce((p, q) => p + (q[0] / tot) * q[1][i], 0)),
        list: top.map(([w, col]) => {
          acc += w / tot;
          return [acc, col];
        }),
      };
    }
    S.bloom = out;
    // feat/fotorealismus (foto-wald): the light on a wood's floor (as on its plants)
    const kw = BWPHAENO.K[WOOD],
      ws = kw && kw.schirm;
    U.uBwFarW.value.x = ws ? ws.sun : 1;
    woodDay(doy, kw);
    cropsDay(doy);
    S.job = null; // refill
    S.x0 = NaN;
  }
  // feat/fotorealismus (foto-wald): a wood's herb layer in its floor's colour. The plants of bw_blume.js stand out to ~26 m, the
  // blades to 40 m – beyond, a carpet of bilberry would end in a straight line. So the floor carries the same patches (the same soft
  // fields): the carpet plant's and the grasses', each in its colour of today by how much of the floor it covers.
  function woodDay(doy, kw) {
    const W = U.uBwFarW.value,
      H = U.uBwFarH.value,
      C = U.uBwFarHc.value,
      P = BWBLUME.PATCH && BWBLUME.PATCH[WOOD],
      id = P && Object.keys(P.arten || {})[0],
      sp = id && BWBLUME.SP.find(q => q.id === id);
    W.y = 0;
    W.z = 0;
    S.wood = null;
    if (!kw || !kw.patch || !P) return;
    W.y = kw.patch.size;
    W.z = 0.85;
    // the carpet plant: in leaf today? (the mean of its four groups of plants); its patches as the plants take them
    let leaf = 0;
    if (sp) for (let k = 0; k < 4; k++) if (BWBLUME.phaseAt(sp, doy, k)) leaf += 0.25;
    const a = id ? P.arten[id] : null,
      cc = (sp && hexLin(sp.col)) || [0.08, 0.19, 0.03];
    if (a) H[0].set(-1, BWPHAENO.fieldT(a[0]), BWBLUME.fieldNo(id), a[1] || 1);
    else H[0].set(-1, -1, 0, 1);
    // (seen from above a carpet is leaves and the dark between them: its colour a little darker than the leaf's)
    // (… and a quarter of the litter's brown in it: twigs and the floor between the leaves – warm, not the grey-green of paint)
    const LIT = [0.139, 0.071, 0.017],
      dull = (c, k, g) => c.map((v, i) => v * k * (1 - g) + LIT[i] * g);
    const c0 = dull(cc, 0.62, 0.25);
    C[0].set(c0[0], c0[1], c0[2], a ? 0.8 * leaf : 0);
    // the grasses: their colour of today, as dense as the blades stand in their patches (thin tussocks: seen from above mostly litter)
    const gc = BWPHAENO.colour(kw, doy).map(lin);
    H[1].set(BWPHAENO.fieldT(1 - kw.patch.grass), 2, 0, 1);
    const c1 = dull(gc, 0.7, 0.2);
    C[1].set(c1[0], c1[1], c1[2], Math.min(0.5, 0.7 * kw.dens));
    S.wood = { size: W.y, carpet: id || '', leaf, cover: [+C[0].w.toFixed(2), +C[1].w.toFixed(2)] };
  }
  // feat/fotorealismus: the crops' rows today for the ground – the stand's colour and cover of its phase, the soil of that phase, in its
  // harvest days the day and its spread (each field is cut on its own day, as the blades are) and the stubble left
  function cropsDay(doy) {
    const AB = BWARTEN.ackerboden || {},
      soilOf = p => hexLin(AB[(p && p.boden_art) || 'saatbett']) || hexLin(AB.saatbett) || [0.2, 0.13, 0.08];
    S.crops = [];
    U.uBwFarC.value.w = doy;
    for (let i = 0; i < NC; i++) {
      const k = BWPHAENO.K[BWPHAENO.CROP0 + i],
        F = k && k.crop,
        Nw = F ? BWPHAENO.cropNow(F, doy) : null,
        fc = U.uBwFc.value[i],
        fs = U.uBwFs.value[i],
        fh = U.uBwFh.value[i],
        ft = U.uBwFt.value[i];
      if (!Nw) {
        // before its year (or no such crop): worked soil
        const so = hexLin(AB.pflug) || [0.11, 0.07, 0.04];
        fc.set(0.1, 0.2, 0.05, 0);
        fs.set(so[0], so[1], so[2], 0);
        fh.set(0, 0, 0, 0);
        S.crops.push({ id: k ? k.id : '', cover: 0, cut: false });
        continue;
      }
      const p = Nw.p,
        col = hexLin(p.farbe) || [0.1, 0.18, 0.05],
        soil = soilOf(p),
        cover = Nw.h > 0.01 ? 1 - Math.max(0, Math.min(1, Number.isFinite(p.boden) ? p.boden : 0.3)) : 0,
        st = (F.jahr || []).find(q => q.name === 'stoppel'),
        sc = (st && hexLin(st.farbe)) || hexLin(AB.stoppel_getreide) || [0.57, 0.46, 0.2],
        E = F.ernte || {};
      fc.set(col[0], col[1], col[2], cover);
      fs.set(soil[0], soil[1], soil[2], 0);
      fh.set(Nw.inH ? E.doy : 0, Nw.inH ? Math.max(0.01, Nw.sp) : 0, 0, 0);
      ft.set(sc[0], sc[1], sc[2], st && Number.isFinite(st.boden) ? 1 - st.boden : 0.6);
      S.crops.push({ id: k.id, phase: p.name, cover: +cover.toFixed(2), cut: !!Nw.inH });
    }
  }
  // a species on doy: the colour seen from afar (the bloom; the seed head where it is light, like a dandelion clock) and how many show it –
  // the mean of its four groups of plants (earlier … later by its spread, as bw_blume.js draws them near)
  function bloomOf(s, doy) {
    let bl = 0,
      sd = 0;
    for (let k = 0; k < 4; k++) {
      const p = BWBLUME.phaseAt(s, doy, k);
      if (!p) continue;
      if (p[0] === 'bluete') bl += p[1] / 4;
      else if (p[0] === 'samen' && s.colSeed) sd += (p[1] * 0.7) / 4;
    }
    if (bl <= 0 && sd <= 0) return { amount: 0 };
    return bl >= sd ? { amount: bl, col: hexLin(s.col) } : { amount: sd, col: hexLin(s.colSeed) };
  }
  const hash = (x, y) => {
    const s = Math.sin(x * 127.1 + y * 311.7) * 43758.5453;
    return s - Math.floor(s);
  };
  function want(x, y, alt) {
    // from high above a field keeps the photo: the crops reach only RC1 around the camera, and a disc of them would show
    const z = Number.isFinite(alt) ? 1 - Math.min(1, Math.max(0, (alt - 30) / 40)) : 1,
      zz = z * z * (3 - 2 * z);
    if (Math.abs(zz - U.uBwFarC.value.z) > 0.004) {
      U.uBwFarC.value.z = zz;
      markDirty();
    }
    // (feat/fotorealismus, foto-wald: the forest at the Klinge built since the last fill – the woods' floor again, it carries where)
    const kl = !!(FOREST && FOREST.ready);
    if (kl !== S.klinge) {
      S.klinge = kl;
      refill();
    }
    if (!S.bloom.length) return;
    wantFar(x, y);
    const half = SPAN / 2;
    if (!S.job && Math.abs(x - (S.x0 + half)) < MOVE && Math.abs(y - (S.y0 + half)) < MOVE) return;
    if (!S.job) {
      const x0 = Math.floor((x - half) / 16) * 16,
        y0 = Math.floor((y - half) / 16) * 16;
      S.job = { x0, y0, row: 0, buf: new Uint8Array(N * N * 8) };
    }
    const J = S.job,
      t0 = performance.now(),
      klinge = !!(FOREST && FOREST.ready && FOREST.owns);
    while (J.row < N && performance.now() - t0 < 3) {
      const j = J.row++,
        yy = J.y0 + (j + 0.5) * RES;
      for (let i = 0; i < N; i++) {
        const xx = J.x0 + (i + 0.5) * RES,
          code = BWKARTE.codeAt(xx, yy),
          b = S.bloom[code & 31];
        // the class of the place (lower half, for the crops of the fields)
        J.buf[((j + N) * N + i) * 4] = code & 255;
        // (feat/fotorealismus, foto-wald: green – a wood's floor inside the forest at the Klinge, which has its own light from its
        // canopy map, world/forest.js S.LIGHT; every other wood's floor is dimmed here)
        if (klinge && (code & 31) === WOOD && FOREST.owns(xx, yy)) J.buf[((j + N) * N + i) * 4 + 1] = 255;
        if (!b) continue;
        const r = hash(xx, yy);
        let col = b.list[b.list.length - 1][1];
        for (const [cw, c] of b.list)
          if (r <= cw) {
            col = c;
            break;
          }
        const o = (j * N + i) * 4,
          vig = 0.45 + 0.55 * ((code >> 5) / 7),
          a = Math.min(1, b.share * vig),
          m = b.mean;
        // premultiplied: the colour times its share (bilinear filtering between texels stays clean)
        J.buf[o] = Math.round(Math.min(1, (col[0] + m[0]) / 2) * a * 255);
        J.buf[o + 1] = Math.round(Math.min(1, (col[1] + m[1]) / 2) * a * 255);
        J.buf[o + 2] = Math.round(Math.min(1, (col[2] + m[2]) / 2) * a * 255);
        J.buf[o + 3] = Math.round(a * 255);
      }
    }
    if (J.row < N) return;
    data.set(J.buf);
    tex.needsUpdate = true;
    S.x0 = J.x0;
    S.y0 = J.y0;
    S.job = null;
    S.n++;
    U.uBwFarB.value.set(S.x0, S.y0, 1 / SPAN, 1);
    markDirty();
  }
  // ---- feat/ferne: the coarse band – the classes of the fields within ~2.5 km (one fill per 384 m moved, ≤ 3 ms a frame) ----
  async function loadFar() {
    const F = S.far;
    F.cells = new Map();
    try {
      const r = await fetch(BASE + 'ferne/felder.bin');
      if (!r.ok) throw new Error('felder.bin ' + r.status);
      const buf = await new Response(r.body.pipeThrough(new DecompressionStream('deflate'))).arrayBuffer(),
        dv = new DataView(buf),
        n = dv.getUint32(4, true),
        o0 = 8 + n * 4;
      for (let k = 0; k < n; k++)
        F.cells.set(
          dv.getInt16(8 + k * 4, true) + '_' + dv.getInt16(10 + k * 4, true),
          new Uint8Array(buf, o0 + k * 2500, 2500)
        );
      F.ready = true;
    } catch (e) {
      F.err = String(e);
    }
  }
  function wantFar(x, y) {
    const F = S.far;
    if (!FAR) return;
    if (!F.cells) loadFar();
    if (!F.ready) return;
    const half = SPAN2 / 2;
    if (!F.job && Math.abs(x - (F.x0 + half)) < MOVE2 && Math.abs(y - (F.y0 + half)) < MOVE2) return;
    if (!F.job)
      F.job = {
        x0: Math.floor((x - half) / 40) * 40,
        y0: Math.floor((y - half) / 40) * 40,
        row: 0,
        buf: new Uint8Array(N * N * 4),
      };
    const J = F.job,
      t0 = performance.now();
    let key = '',
      cm = null;
    while (J.row < N && performance.now() - t0 < 3) {
      const j = J.row++,
        yy = J.y0 + (j + 0.5) * RES2,
        cj = Math.floor(yy / 400),
        sj = Math.floor((yy - cj * 400) / 8) * 50;
      for (let i = 0; i < N; i++) {
        const xx = J.x0 + (i + 0.5) * RES2,
          ci = Math.floor(xx / 400),
          k = ci + '_' + cj;
        if (k !== key) {
          key = k;
          cm = F.cells.get(k) || null;
        }
        if (cm) J.buf[(j * N + i) * 4] = cm[sj + Math.floor((xx - ci * 400) / 8)];
      }
    }
    if (J.row < N) return;
    data.set(J.buf, N * N * 8);
    tex.needsUpdate = true;
    F.x0 = J.x0;
    F.y0 = J.y0;
    F.job = null;
    F.n++;
    U.uBwFarE.value.set(F.x0, F.y0, 1 / SPAN2, 1);
    markDirty();
  }
  // the woods' floor: the class of the maps and the layers of the ground's detail textures (core/detail.js) it is made of
  const WOOD = BWPHAENO.CLASSES.indexOf('waldboden'),
    LF = DETAIL.L.forestfloor.toFixed(1),
    LM = DETAIL.L.mossfloor.toFixed(1),
    TL = (DETAIL.tile.forestfloor || 2).toFixed(2),
    TM = (DETAIL.tile.mossfloor || 2).toFixed(2);
  // the ground shaders' part (the derivatives first: they must not sit after a branch that differs from pixel to pixel)
  const GLSL = `
uniform sampler2D tBwFar; uniform vec4 uBwFarB, uBwFarE, uBwFarC, uBwFarW, uBwFarH[ 2 ], uBwFarHc[ 2 ];
uniform vec4 uBwFc[ ${NC} ], uBwFs[ ${NC} ], uBwFh[ ${NC} ], uBwFt[ ${NC} ];
float bwFH( vec2 p ) { return fract( sin( dot( p, vec2( 41.3, 289.1 ) ) ) * 45758.5453 ); }
// feat/fotorealismus (foto-wald): the herb layer of a wood's floor at this pixel – its colour and how much of the floor it covers
// (set by bwFar; world/forest.js lays it over its own litter under the crowns, which would hide it)
vec4 bwHerb = vec4( 0.0 );
// the blades' own hash (bw_halm.js bwHash): a field carries here the crop it carries there
float bwFHc( vec2 p ) { return fract( sin( dot( p, vec2( 127.1, 311.7 ) ) ) * 43758.5453 ); }
${BWHALM.cropGlsl('bwFHc')}
${BWHALM.fieldGlsl('bwFHc')}
// soft blotches of ~1 / f metres, 0 … 1 (four sines – no texture, no hash)
float bwFB( vec2 p ) { return 0.5 + 0.5 * sin( p.x + 1.7 * sin( p.y * 0.73 + 1.1 ) ) * sin( p.y * 1.13 + 1.3 * sin( p.x * 0.61 + 2.3 ) ); }
// a field's crop as one surface in its colour of today (cls: its class; c: the photo's colour there) – the full tint, weighted by the caller
vec3 bwCropT( int cls, vec2 p, vec3 c, float dist, float sinEl ) {
  int row = bwCrop( cls, p ) - ${BWPHAENO.CROP0};
  if ( row >= 0 && row < ${NC} ) {
    vec4 fc = uBwFc[ row ], fh = uBwFh[ row ];
    vec3 soil = uBwFs[ row ].rgb, can = fc.rgb; float cover = fc.a;
    if ( fh.y > 0.0 ) {
      // its harvest days: this field on its own day (as the blades' bwHeight: fields of 65 m, the same hash)
      vec2 fq = floor( p / 65.0 + 0.4 * vec2( sin( p.y * 0.043 ), sin( p.x * 0.037 ) ) ) + float( row + ${BWPHAENO.CROP0} ) * 7.13;
      if ( uBwFarC.w >= fh.x + ( bwFHc( fq ) - 0.5 ) * 2.0 * fh.y ) { can = uBwFt[ row ].rgb; cover = uBwFt[ row ].a; }
    }
    // the photo's light and dark stay (tramlines, wet hollows, the one field paler than the next), its colour only a little
    float l = dot( c, vec3( 0.3, 0.59, 0.11 ) ), m = clamp( sqrt( l / 0.14 ), 0.78, 1.28 );
    soil *= m; can *= m * ( 0.9 + 0.2 * bwFB( p * 0.045 + 3.1 ) );
    // the stand as one surface, closed the flatter the view (the plants stand before the soil behind them); looking down into it
    // the soil between the plants, in their shade
    // (only from where the plants are too small to see one by one: close by they stand there themselves, on their soil)
    float app = 1.0 - pow( 1.0 - cover, mix( 1.0, min( 1.0 / sinEl, 6.0 ), smoothstep( 8.0, 45.0, dist ) ) );
    return mix( mix( soil * ( 1.0 - 0.35 * cover ), can, app ), c, 0.15 );
  }
  return c;
}
vec3 bwFar( vec2 p, vec3 c, float dist ) {
  vec2 dx = dFdx( p ), dy = dFdy( p );
  if ( uBwFarB.w < 0.5 ) return c;
  vec2 u = ( p - uBwFarB.xy ) * uBwFarB.z;
  bool inF = u.x > 0.0 && u.y > 0.0 && u.x < 1.0 && u.y < 1.0;
  // the pixel on the ground: its long side (m) and how steeply the view meets the ground (1 from straight above; the ratio of the
  // footprint's two axes)
  float ja = dot( dx, dx ), jb = dot( dx, dy ), jd = dot( dy, dy ), jt = 0.5 * ( ja + jd ), jq = sqrt( max( jt * jt - ( ja * jd - jb * jb ), 0.0 ) );
  float fw = sqrt( jt + jq ), sinEl = clamp( sqrt( max( jt - jq, 0.0 ) ) / max( fw, 1e-6 ), 0.04, 1.0 );
  // ---- the crops of the fields, the floor of the woods ----
  float wC = ( 1.0 - smoothstep( uBwFarC.x, uBwFarC.y, dist ) ) * uBwFarC.z;
  float wW = ( 1.0 - smoothstep( 110.0, 240.0, dist ) ) * uBwFarC.z;
  vec3 t1 = c, t2 = c; float a1 = 0.0, a2 = 0.0;
  if ( inF && max( wC, wW ) > 0.001 ) {
    // (the classes are texels of 2 m: read a little beside the point, so a field's edge is no staircase)
    vec2 pw = p + 0.8 * vec2( sin( p.y * 0.83 + 1.7 * sin( p.x * 0.31 ) ), sin( p.x * 0.77 + 1.3 * sin( p.y * 0.37 ) ) );
    ivec2 ti = ivec2( clamp( ( pw - uBwFarB.xy ) * uBwFarB.z, 0.0, 0.9999 ) * ${N}.0 );
    vec4 ct = texelFetch( tBwFar, ivec2( ti.x, ti.y + ${N} ), 0 );
    int code = int( ct.r * 255.0 + 0.5 ), cls = code - ( code / 32 ) * 32;
    if ( cls == ${WOOD} && wW > 0.001 ) {
      // Under trees the aerial photo shows their crowns from above – dark blue-green, as ground a slate floor. Where the maps say
      // wood the ground is what lies under trees: litter with moss and herbs in patches (the detail layers of the forest at the
      // Klinge, world/forest.js – its own floor comes on top there). Close by and from the walker's height only: from above and far
      // away the photo's crowns are what one sees.
      vec3 lf = textureGrad( tDet, vec3( p / ${TL}, ${LF} ), dx / ${TL}, dy / ${TL} ).rgb, ms = textureGrad( tDet, vec3( p / ${TM} + 0.37, ${LM} ), dx / ${TM}, dy / ${TM} ).rgb;
      float mz = smoothstep( 0.4, 0.72, bwFB( p * 0.13 + 3.1 ) ) * ( 0.55 + 0.45 * bwFB( p * 0.9 + 1.7 ) );
      vec3 fl = mix( lf * vec3( 0.5, 0.43, 0.36 ), ms * vec3( 0.55, 0.66, 0.46 ), mz * 0.8 ) * ( 0.82 + 0.36 * bwFB( p * 0.31 + 7.0 ) );
      // (the photo's light and dark a little: a clearing stays lighter than the stand)
      fl *= clamp( 0.78 + 2.4 * dot( c, vec3( 0.3, 0.59, 0.11 ) ), 0.78, 1.22 );
      // feat/fotorealismus (foto-wald): its herb layer in its colour – the carpets of bilberry and the patches of grass where the
      // plants and blades themselves stand (bw_blume.js, bw_halm.js: the same soft fields): under them the dark of a carpet, beyond
      // them (26 m, 40 m) their colour instead of bare litter. Seen flat the plants stand before the floor behind them.
      if ( uBwFarW.z > 0.0 ) {
        float f0 = bwField( p, uBwFarW.y * uBwFarH[ 0 ].w, vec2( 23.7, 7.1 ) + uBwFarH[ 0 ].z * vec2( 17.3, 5.9 ) );
        float in0 = smoothstep( -0.05, 0.05, uBwFarH[ 0 ].y - f0 ) * smoothstep( -0.05, 0.05, f0 - uBwFarH[ 0 ].x );
        float in1 = smoothstep( -0.05, 0.05, bwField( p, uBwFarW.y, vec2( 23.7, 7.1 ) ) - uBwFarH[ 1 ].x ) * ( 1.0 - in0 );
        // (mottled – no carpet is closed: tufts of a foot or two, the litter between them; and no two of one green)
        float fl2 = min( 1.0 / sinEl, 3.0 ), mo = bwFn( p / 1.25 + 4.1 ) * ( 0.45 + 0.55 * bwFn( p / 0.42 + 1.3 ) ), fine = 0.7 + 0.6 * bwFB( p * 1.1 + 2.7 );
        float c0 = uBwFarHc[ 0 ].a * in0 * smoothstep( 0.05, 0.5, mo ), c1 = uBwFarHc[ 1 ].a * in1 * smoothstep( 0.1, 0.6, mo ) * smoothstep( 6.0, 30.0, dist );
        float a0 = ( 1.0 - pow( 1.0 - c0, fl2 ) ) * uBwFarW.z, a1 = ( 1.0 - pow( 1.0 - c1, fl2 ) ) * uBwFarW.z;
        vec3 hc = ( uBwFarHc[ 0 ].rgb * a0 + uBwFarHc[ 1 ].rgb * a1 ) / max( a0 + a1, 1e-4 ) * fine;
        // (the grain of the litter's picture stays in it – its mean brightness is 0.19 –: leaves over the same ground, not paint)
        hc *= clamp( 0.5 + 0.5 * dot( lf, vec3( 0.3, 0.59, 0.11 ) ) / 0.19, 0.55, 1.6 );
        fl = mix( fl, hc, max( a0, a1 ) );
        bwHerb = vec4( hc, max( a0, a1 ) * wW * 0.92 );
      }
      // … and it lies in the shade of its trees. Only the forest at the Klinge knows its crowns (its canopy map dims the light on
      // its ground: ct.g) – every other wood's floor would lie in the open sun between a few trunks. So here it takes the share of
      // the light its plants get (their row of the class table), as its colour: the ground's light is not this function's to change.
      fl *= mix( uBwFarW.x, 1.0, ct.g );
      c = mix( c, fl, wW * 0.92 );
    } else if ( wC > 0.001 && ( cls == 9 || ( cls >= 19 && cls <= 22 ) ) ) {
      t1 = bwCropT( cls, p, c, dist, sinEl );
      a1 = wC;
    }
  }
${
  FAR
    ? `  // feat/ferne: beyond the fine band the coarse one (10 m texels, read a little beside the point: no staircase at a field's edge)
  float wF = smoothstep( uBwFarC.x, uBwFarC.y, dist ) * ( 1.0 - smoothstep( ${RF0}.0, ${RF1}.0, dist ) ) * uBwFarC.z * uBwFarE.w;
  if ( wF > 0.001 ) {
    vec2 pf = p + 4.0 * vec2( sin( p.y * 0.21 + 1.7 * sin( p.x * 0.077 ) ), sin( p.x * 0.19 + 1.3 * sin( p.y * 0.093 ) ) ),
      uf = ( pf - uBwFarE.xy ) * uBwFarE.z;
    if ( uf.x > 0.0 && uf.y > 0.0 && uf.x < 1.0 && uf.y < 1.0 ) {
      int cf = int( texelFetch( tBwFar, ivec2( uf * ${N}.0 ) + ivec2( 0, ${2 * N} ), 0 ).r * 255.0 + 0.5 );
      if ( cf == 9 || ( cf >= 19 && cf <= 22 ) ) {
        t2 = bwCropT( cf, p, c, dist, sinEl );
        a2 = wF;
      }
    }
  }
`
    : ''
}  if ( a1 + a2 > 0.001 ) c = mix( c, ( t1 * a1 + t2 * a2 ) / ( a1 + a2 ), min( 1.0, a1 + a2 ) );
  // ---- the flowers of the meadows, verges and lawns ----
  if ( !inF || dist < 20.0 ) return c;
  vec4 f = texture( tBwFar, vec2( u.x, clamp( u.y, ${(0.5 / N).toFixed(6)}, ${(1 - 0.5 / N).toFixed(6)} ) * ${FAR ? '0.333333' : '0.5'} ) );
  if ( f.a < 0.004 ) return c;
  // in from where the flowers of bw_blume.js end, out before the window's edge
  float fade = smoothstep( 20.0, 34.0, dist ) * ( 1.0 - smoothstep( uBwFarC.x + 20.0, uBwFarC.y + 40.0, dist ) );
  // how much of the ground the heads cover seen from above, in drifts: denser here, thinner there (mean ~1)
  float share = f.a * 0.35 * ( 0.25 + 1.5 * bwFB( p * 0.06 ) * ( 0.6 + 0.8 * bwFB( p * 0.21 + 5.7 ) ) );
  // seen flat over the meadow the heads stand before the grass behind them: the flatter the view, the more of the pixel is flower
  // (their share by 1 / sin of the view's angle, each hiding the next – until the grass before them hides as many)
  float app = 1.0 - exp( - share * min( 1.0 / sinEl, 10.0 ) );
  // single heads (tufts of 12 cm) only where a pixel is finer than they are; beyond, their share of the pixel
  float dots = step( bwFH( floor( p / 0.12 ) ), app );
  float k = mix( dots, app, smoothstep( 0.05, 0.16, fw ) );
  // the colour stored with its share multiplied in (so the texels blend cleanly): undone here
  return mix( c, min( f.rgb / f.a, vec3( 1.0 ) ), k * fade * 0.85 );
}
`;
  function shader(sh) {
    // (uBwCr: the crops a field of each class may carry – the blades' own uniform, the same object)
    Object.assign(sh.uniforms, U, { uBwCr: BWHALM.U.uBwCr });
    return GLSL;
  }
  const state = () => ({
    far: {
      on: FAR,
      ready: !!S.far.ready,
      n: S.far.n,
      x0: S.far.x0,
      y0: S.far.y0,
      cells: S.far.cells ? S.far.cells.size : 0,
      err: S.far.err || '',
    },
    on: U.uBwFarB.value.w > 0.5,
    x0: S.x0,
    y0: S.y0,
    n: S.n,
    classes: Object.fromEntries(S.bloom.map((b, c) => [c, b ? +b.share.toFixed(3) : 0]).filter(([, v]) => v > 0)),
    crops: S.crops,
    reach: [RC0, RC1],
    high: +U.uBwFarC.value.z.toFixed(2),
    // (feat/fotorealismus, foto-wald) the woods' floor: the share of the light on it, its herb layer's patches
    wood: Object.assign({ light: +U.uBwFarW.value.x.toFixed(2) }, S.wood || {}),
  });
  // the maps changed (cells loaded, the garden's site rebuilt): fill again
  const refill = () => {
    S.job = null;
    S.x0 = NaN;
  };
  Object.assign(S, { U, shader, day, want, refill, state });
  return S;
})();
if (typeof window !== 'undefined') window.BWFERNE = BWFERNE;
