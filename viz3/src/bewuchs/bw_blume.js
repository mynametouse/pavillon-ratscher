// ===================== feat/bewuchs stage 2: wildflowers among the blades – near as small plants, their year from the species table (BWBLUME) =====================
// Falko, 17.11.2026: „… Büsche mit Beeren, Gräser, Blumen und was so üblicherweise dort wächst auf Wiesen“; 21:30: lawn and meadows at once.
// The flowers stand in the same tiles as the blades (the near and the mid ring of bw_halm.js share their lists): each tile carries F slots of
// a small plant – two crossed quads with a picture of the atlas (the helper bewuchs-pflanzen draws it: 8 × 8 cells of 128 px, one plant
// in side view per cell, its foot at the bottom middle). On the card a slot takes the kind of area at its foot, draws a species from that
// area's mix (the daisies, white clover and dandelions of a lawn; margerites, buttercups, bellflowers, red clover of a hay meadow; poppies and
// cornflowers at a field's edge …) and shows it only if the species is out now (its frame of the day – bud, bloom, seed head – from the
// calendar) and the grass there has not just been cut (a mown meadow has no flowers for a few weeks). One draw call per ring.
// Until the helper's atlas and table are merged: a stand-in atlas drawn here (simple stems, leaves and heads) and the lead's mixes.
//   BWBLUME.build()      (re)make the meshes on the rings of BWHALM (bw_halm.js calls it after its build)
//   BWBLUME.day(doy)     the species' frames and amounts of the day → texture
//   BWBLUME.fromArten(A, base)  the helper's species (BWARTEN) and its atlases (base + bewuchs/blumen.png, beete.png, acker.png with their
//                        .json) – S.ver counts up. Stage 5b: the crops' plants on their fields (maize, potatoes, rape, the cereals' ears …)
//   BWBLUME.phaseAt(s, doy, k)  [frame, share, began] of the plants of group k (0–3: earlier … later by the species' spread), or null
//   BWBLUME.stats()      { rings: [{ tiles, slots }], species: { id: [[cell, share] × 4 groups] }, standin, arten }
import * as THREE from 'three';
import { scene } from '../core/head.js';
import { markDirty, patchSV } from '../core/assets.js';
import { WXWIND } from '../wetter/wx_wind.js';
import { BWKARTE } from './bw_karte.js';
import { BWHALM } from './bw_halm.js';
import { BWPHAENO } from './bw_phaeno.js';
export const BWBLUME = (() => {
  const S = { meshes: [], err: '', standin: true, doy: NaN, ver: 0 };
  // ---------- species: height (m), colour, the calendar of one plant (frames of the atlas by day of year) ----------
  // (the lead's first estimates for southern Thuringia, ~450 m – stand-ins with a drawn stand-in atlas until the helper's table BWARTEN.blumen
  // and its atlas are loaded: fromArten replaces them)
  const SP = [
    { id: 'loewenzahn', h: [0.1, 0.3], bluete: [[100, 140]], samen: [[141, 160]], col: '#f2c40c' },
    { id: 'gaensebluemchen', h: [0.05, 0.1], bluete: [[70, 300]], col: '#f4f1ea' },
    { id: 'weissklee', h: [0.06, 0.14], bluete: [[140, 265]], col: '#eeeadf' },
    { id: 'rotklee', h: [0.15, 0.35], bluete: [[140, 255]], col: '#c2477a' },
    { id: 'hahnenfuss', h: [0.3, 0.7], bluete: [[125, 180]], col: '#f2d21c' },
    { id: 'margerite', h: [0.3, 0.6], bluete: [[150, 200]], col: '#f6f4ec' },
    { id: 'glockenblume', h: [0.3, 0.6], bluete: [[140, 200]], col: '#7a5fc0' },
    { id: 'storchschnabel', h: [0.3, 0.6], bluete: [[160, 200]], col: '#6f72c8' },
    { id: 'flockenblume', h: [0.3, 0.7], bluete: [[175, 270]], col: '#b04f9a' },
    { id: 'schafgarbe', h: [0.25, 0.6], bluete: [[165, 285]], col: '#efe9dc' },
    { id: 'wiesenkerbel', h: [0.6, 1.2], bluete: [[120, 162]], col: '#f2f1e8' },
    { id: 'wildemoehre', h: [0.4, 0.9], bluete: [[180, 260]], col: '#efede2' },
    { id: 'rainfarn', h: [0.6, 1.2], bluete: [[195, 270]], col: '#e8b81a' },
    { id: 'wegwarte', h: [0.4, 1.0], bluete: [[190, 260]], col: '#7d9ae0' },
    { id: 'mohn', h: [0.3, 0.7], bluete: [[155, 200]], col: '#d8261c' },
    { id: 'kornblume', h: [0.3, 0.7], bluete: [[160, 225]], col: '#3f62d0' },
    { id: 'kamille', h: [0.15, 0.4], bluete: [[160, 240]], col: '#f5f3ea' },
    { id: 'herbstzeitlose', h: [0.08, 0.18], bluete: [[235, 280]], col: '#c49ad8' },
  ];
  // the stand-ins in the shape of the helper's species: frames (atlas cell n = row · 8 + column, height share), the calendar of one plant,
  // its spread, how it comes back after a cut (as a daisy: flowers again after 3 days)
  SP.forEach((s, i) => {
    s.frames = { bluete: { cell: i, k: 1 } };
    s.jahr = (s.bluete || []).map(([a, b]) => ['bluete', a, b]);
    if (s.samen) {
      s.frames.samen = { cell: SP.length, k: 1.1 };
      s.jahr.push(...s.samen.map(([a, b]) => ['samen', a, b]));
    }
    s.jahr.sort((p, q) => p[1] - q[1]);
    Object.assign(s, { streu: 6, wuchs: null, bt: 1, nst: 3, nbb: 366, bloomLen: 60 });
  });
  let IDX = Object.fromEntries(SP.map((s, i) => [s.id, i]));
  const STANDIN = SP.slice();
  // per area class: the species and their shares (the stand-ins'; fromArten: the plants per m² of the helper's areas)
  let MIX = {
    1: { gaensebluemchen: 0.5, weissklee: 0.3, loewenzahn: 0.2 },
    2: { gaensebluemchen: 0.25, weissklee: 0.2, loewenzahn: 0.2, schafgarbe: 0.15, rotklee: 0.2 },
    3: {
      wiesenkerbel: 0.22,
      schafgarbe: 0.18,
      rainfarn: 0.12,
      wegwarte: 0.14,
      wildemoehre: 0.14,
      loewenzahn: 0.1,
      rotklee: 0.1,
    },
    4: {
      margerite: 0.16,
      hahnenfuss: 0.16,
      glockenblume: 0.1,
      storchschnabel: 0.08,
      rotklee: 0.14,
      flockenblume: 0.1,
      wiesenkerbel: 0.08,
      loewenzahn: 0.08,
      schafgarbe: 0.06,
      herbstzeitlose: 0.04,
    },
    5: { loewenzahn: 0.35, weissklee: 0.3, gaensebluemchen: 0.2, hahnenfuss: 0.15 },
    6: {
      margerite: 0.18,
      hahnenfuss: 0.18,
      rotklee: 0.16,
      glockenblume: 0.1,
      loewenzahn: 0.12,
      schafgarbe: 0.1,
      flockenblume: 0.1,
    },
    7: { rainfarn: 0.25, schafgarbe: 0.2, wegwarte: 0.15, flockenblume: 0.15, wildemoehre: 0.15, wiesenkerbel: 0.1 },
    8: { hahnenfuss: 0.3, wiesenkerbel: 0.25, storchschnabel: 0.2, rainfarn: 0.25 },
    10: { mohn: 0.45, kornblume: 0.3, kamille: 0.25 },
    12: { wiesenkerbel: 0.5, rainfarn: 0.5 },
    15: { schafgarbe: 0.4, weissklee: 0.3, loewenzahn: 0.3 },
    16: { gaensebluemchen: 0.6, weissklee: 0.4 },
    17: { weissklee: 0.6, gaensebluemchen: 0.4 },
    18: { gaensebluemchen: 0.4, loewenzahn: 0.35, weissklee: 0.25 },
  };
  // ---------- the stand-in atlas (until the helper's): 8 × 8 cells of 128 px, drawn on a canvas ----------
  function standin() {
    const N = 1024,
      C = 128,
      cv = document.createElement('canvas');
    // (8 × 16 cells like the real atlas – the wildflowers' half above, the beds' below)
    cv.width = N;
    cv.height = 2 * N;
    const x = cv.getContext('2d');
    x.clearRect(0, 0, N, N);
    let cell = 0;
    const at = n => [(n % 8) * C, Math.floor(n / 8) * C];
    const stem = (ox, oy, top, lean = 0) => {
      x.strokeStyle = '#3f6a22';
      x.lineWidth = 3;
      x.beginPath();
      x.moveTo(ox + C / 2, oy + C);
      x.quadraticCurveTo(ox + C / 2 + lean * 0.5, oy + (C + top) / 2, ox + C / 2 + lean, oy + top);
      x.stroke();
      x.fillStyle = '#4a7a2a';
      for (const s of [-1, 1]) {
        x.beginPath();
        x.ellipse(ox + C / 2 + s * 10, oy + C - 18, 12, 4, s * 0.6, 0, 6.2832);
        x.fill();
      }
    };
    for (const s of STANDIN) {
      const n = cell++,
        [ox, oy] = at(n),
        top = 18,
        cx = ox + C / 2,
        cy = oy + top;
      stem(ox, oy, top + 6);
      x.fillStyle = s.col;
      const umbel = ['wiesenkerbel', 'wildemoehre', 'schafgarbe'].includes(s.id),
        cup = ['glockenblume', 'herbstzeitlose', 'mohn'].includes(s.id);
      if (umbel) {
        for (let k = 0; k < 14; k++) {
          x.beginPath();
          x.arc(cx + Math.cos(k * 0.45) * 22 * (k / 14), cy + Math.sin(k * 0.9) * 5, 6, 0, 6.2832);
          x.fill();
        }
      } else if (cup) {
        x.beginPath();
        x.ellipse(cx, cy, 14, 18, 0, 0, 6.2832);
        x.fill();
      } else {
        for (let k = 0; k < 10; k++) {
          const a = (k / 10) * 6.2832;
          x.beginPath();
          x.ellipse(cx + Math.cos(a) * 12, cy + Math.sin(a) * 6, 9, 4, a, 0, 6.2832);
          x.fill();
        }
        x.fillStyle = ['margerite', 'gaensebluemchen', 'kamille'].includes(s.id) ? '#f0c020' : s.col;
        x.beginPath();
        x.arc(cx, cy, 7, 0, 6.2832);
        x.fill();
      }
    }
    // the dandelion's seed head (its cell: STANDIN.length)
    {
      const n = cell++,
        [ox, oy] = at(n);
      stem(ox, oy, 26);
      x.fillStyle = 'rgba(245,245,240,0.92)';
      x.beginPath();
      x.arc(ox + C / 2, oy + 22, 18, 0, 6.2832);
      x.fill();
    }
    const t = new THREE.CanvasTexture(cv);
    t.colorSpace = THREE.SRGBColorSpace;
    t.anisotropy = 4;
    return t;
  }
  // ---------- per day: the frames of every species → the texture SPT (8 × (NS + 8) texels) ----------
  // row i < NS, species i:
  //   x 0  after a cut: days until its leaves show again, until it flowers again (−1: not this year), no re-bloom starting after this day
  //        of the year, how long a re-bloom lasts (60 % of its bloom)
  //   x 1  its bloom's cell (−1: none) and height share today, its leaves' cell (−1: none) and height share today
  //   x 2  its height (m): min, max
  //   x 3–6  its plants in four groups, ¾ … ¼ of its spread earlier and ¼ … ¾ later than the table: the cell of their frame today (−1:
  //        nothing above the grass), its height share (negative: a seed or fruit frame), the share of the plants in it (the others in leaf),
  //        the day it began (for the cuts)
  //   x 7, 8  the colour its bloom and its seed frames are multiplied with (1 – the grass heads are drawn light and neutral: their
  //        colour over the cell's); x 2 .z: 1 for a grass head (it stands its height above the sward)
  // rows NS … NS + 7: the atlas' cells (cell n at (n % 8, NS + n / 8)): how high the drawing reaches in its cell, how wide it is
  const NS = 128, // species at most (wildflowers, grass heads, bed plants, crops)
    NCELL = 192, // the atlas' cells: wildflowers 0–63, bed plants 64–127, crops 128–191 (8 a row)
    NCR = NCELL / 8,
    NOFF = 4,
    OFF = [-0.75, -0.25, 0.25, 0.75];
  const SPW = 10;
  const SPT = new THREE.DataTexture(
    new Float32Array(SPW * (NS + NCR) * 4),
    SPW,
    NS + NCR,
    THREE.RGBAFormat,
    THREE.FloatType
  );
  SPT.magFilter = SPT.minFilter = THREE.NearestFilter;
  SPT.generateMipmaps = false;
  // per class: 12 entries (species index, cumulative share); a bed class: its templates (−1 − template, cumulative share); rows 32 + t: the
  // plants of template t in today's phase (stage 4: bw_arten.js beetvorlagen)
  // feat/fotorealismus (foto-wald): columns NMX + k – where entry k of a wood's class stands (its patches): the values of the soft
  // field (bw_halm.js bwField) it stands between (from, to), which field (0: the grasses' own), its patches' size (× the class's);
  // column 0 .z: how many times denser than the table's mean of the area the plants stand inside their patches (0: no patches)
  const NMX = 12,
    MXW = 2 * NMX,
    NTPL = 16;
  const MXT = new THREE.DataTexture(
    new Float32Array(MXW * (32 + NTPL) * 4),
    MXW,
    32 + NTPL,
    THREE.RGBAFormat,
    THREE.FloatType
  );
  MXT.magFilter = MXT.minFilter = THREE.NearestFilter;
  MXT.generateMipmaps = false;
  // the atlas' cells: [oben, breite, mean colour (linear rgb)] – how high the plant reaches in its cell (the card is height / oben tall),
  // how much of the width it covers (the card that wide, the cell's middle only: less drawn for nothing); the stand-in's end ~0.86 up
  let CELLINFO = Array.from({ length: NCELL }, () => [0.86, 1, null]);
  const lin = v => (v <= 0.04045 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4));
  const hexLin = h =>
    typeof h === 'string' && /^#[0-9a-f]{6}$/i.test(h)
      ? [1, 3, 5].map(i => lin(parseInt(h.slice(i, i + 2), 16) / 255))
      : null;
  // the tint of a grass head: its colour over the cell's mean colour (both linear), kept in reason
  const tintOf = (hex, cell) => {
    const c = hexLin(hex),
      m = (CELLINFO[cell] && CELLINFO[cell][2]) || [0.58, 0.59, 0.48];
    return c ? c.map((v, i) => Math.max(0.15, Math.min(1.3, (0.72 * v) / Math.max(0.05, m[i])))) : [1, 1, 1];
  };
  // feat/fotorealismus (foto-wald): a wood's herb layer stands in patches (BWARTEN flaechen[c].flecken → PATCH[c]: { grass: the
  // share of the area with its grasses, arten: { id: [share of the area with its patches, their size] } }). Each species has a soft
  // field of its own (its number from its name: the patches stay where they are whatever else grows there); the grasses' heads
  // stand where the blades do (field 0, bw_halm.js).
  let PATCH = {};
  const fieldNo = id => {
    let h = 0;
    for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) % 97;
    return 1 + (h % 11);
  };
  function mixes() {
    const D = MXT.image.data;
    D.fill(0);
    for (const [c, m] of Object.entries(MIX)) {
      const P = PATCH[c],
        A = (P && P.arten) || {},
        share = id => (!P ? 1 : id.startsWith('gras:') ? P.grass : A[id] ? A[id][0] : 1),
        carpet = P ? Object.keys(A)[0] : null,
        // (in a wood: by how dense each stands inside its own patches – the table's plants per m² are the mean of the area –, the
        // carpet plant first: inside its patches nothing else)
        e = Object.entries(m)
          .filter(([id, w]) => (IDX[id] !== undefined || /^tpl:\d+$/.test(id)) && w > 0)
          .map(([id, w]) => [id, w / Math.max(0.01, share(id)), w])
          .sort((p, q) => (q[0] === carpet ? 1 : 0) - (p[0] === carpet ? 1 : 0) || q[1] - p[1])
          .slice(0, NMX),
        sum = e.reduce((a, [, w]) => a + w, 0) || 1,
        mean = e.reduce((a, q) => a + q[2], 0) || 1;
      let acc = 0;
      e.forEach(([id, w], k) => {
        acc += w / sum;
        const o = (+c * MXW + k) * 4;
        D[o] = id.startsWith('tpl:') ? -1 - +id.slice(4) : IDX[id];
        D[o + 1] = k === e.length - 1 ? 1.0001 : acc;
        if (P)
          D.set(
            id.startsWith('gras:')
              ? [BWPHAENO.fieldT(1 - P.grass), 2, 0, 1]
              : A[id]
                ? [-1, BWPHAENO.fieldT(A[id][0]), fieldNo(id), A[id][1] || 1]
                : [-1, 2, 0, 1],
            (+c * MXW + NMX + k) * 4
          );
      });
      if (P) D[+c * MXW * 4 + 2] = sum / mean;
    }
    tplRows(S.doy);
    MXT.needsUpdate = true;
  }
  // the bed templates' plants on day d (their phase: the spring, summer and autumn bedding, the vegetables growing)
  let TPL = [];
  function tplRows(d) {
    const D = MXT.image.data;
    D.fill(0, 32 * MXW * 4);
    if (!Number.isFinite(d)) return;
    TPL.forEach((t, ti) => {
      if (ti >= NTPL) return;
      const ph = (t.phasen || []).find(p => d >= p.von && d < p.bis + 1);
      if (!ph) return;
      const e = Object.entries(ph.pflanzen || {})
          .filter(([id, w]) => IDX['beet:' + id] !== undefined && w > 0)
          .sort((p, q) => q[1] - p[1])
          .slice(0, NMX),
        sum = e.reduce((a, [, w]) => a + w, 0) || 1;
      let acc = 0;
      e.forEach(([id, w], k) => {
        acc += w / sum;
        const o = ((32 + ti) * MXW + k) * 4;
        D[o] = IDX['beet:' + id];
        D[o + 1] = k === e.length - 1 ? 1.0001 : acc;
      });
    });
    MXT.needsUpdate = true;
  }
  const MD = [0, 31, 59, 90, 120, 151, 181, 212, 243, 273, 304, 334];
  const monthOf = d => {
    let m = 0;
    while (m < 11 && d > MD[m + 1] + 0.999) m++;
    return m;
  };
  const LIVING = { blatt: 1, knospe: 1, bluete: 1 };
  // one plant's phase on day d of the table (the year wraps): [frame, share, the day it began] or null (nothing above the grass)
  function phaseOf(s, d) {
    while (d < 1) d += 365;
    while (d >= 367) d -= 365;
    for (const ph of s.jahr || []) {
      const [fr, a, b, share] = ph;
      if (d >= a && d < b + 1) return [fr, Number.isFinite(share) ? share : 1, a];
    }
    return null;
  }
  // the plants of group k (0–3: earlier … later by the species' spread) on day doy
  const phaseAt = (s, doy, k) => phaseOf(s, doy - OFF[k] * (s.streu || 0));
  function day(doy) {
    S.doy = doy;
    const D = SPT.image.data;
    D.fill(0);
    const m = monthOf(doy);
    SP.forEach((s, i) => {
      if (i >= NS) return;
      const o = i * SPW * 4,
        F = s.frames || {},
        wu = s.wuchs ? s.wuchs[m] : 1,
        hk = (fr, f) => (f.k || 1) * (LIVING[fr] ? wu : 1),
        bl = F.bluete,
        lf = F.blatt;
      D.set([s.bt, s.nst, s.nbb, s.bloomLen * 0.6], o);
      D.set([bl ? bl.cell : -1, bl ? hk('bluete', bl) : 0, lf ? lf.cell : -1, lf ? hk('blatt', lf) : 0], o + 4);
      D.set([s.h[0], s.h[1], s.grass ? 1 : 0, 0], o + 8);
      // a crop: as tall as it stands today (BWPHAENO.cropNow – the blades' height); cut, its stubble's picture that low (or nothing)
      if (s.crop) {
        const N = BWPHAENO.cropNow(s.crop, doy),
          hh = N ? Math.max(0.02, N.h) : 0;
        D.set([hh * 0.9, hh * 1.04, 0, 0], o + 8);
        D[o + 7] = lf && N ? Math.min(1, N.stub / Math.max(0.05, hh)) : 0;
      }
      for (let k = 0; k < NOFF; k++) {
        const p = phaseAt(s, doy, k),
          f = p && F[p[0]],
          q = o + (3 + k) * 4,
          seed = p && (p[0] === 'samen' || p[0] === 'frucht');
        if (!f || !(f.cell >= 0)) D.set([-1, 0, 0, 9999], q);
        else D.set([f.cell, hk(p[0], f) * (seed ? -1 : 1), p[1], p[2] + OFF[k] * (s.streu || 0)], q);
      }
      const tb = s.grass && F.bluete ? tintOf(s.col, F.bluete.cell) : [1, 1, 1],
        ts = s.grass && F.samen ? tintOf(s.colSeed, F.samen.cell) : [1, 1, 1];
      D.set([...tb, 1], o + 28);
      D.set([...ts, 1], o + 32);
    });
    tplRows(doy);
    for (let n = 0; n < NCELL; n++) {
      const o = ((NS + (n >> 3)) * SPW + (n & 7)) * 4,
        c = CELLINFO[n] || [0.97, 1];
      D.set([c[0], c[1], 0, 0], o);
    }
    SPT.needsUpdate = true;
    markDirty();
  }
  // the helper's species table (BWARTEN, bewuchs/bw_arten.js): its wildflowers (heights, atlas frames, the year of one plant, its spread,
  // its growth by month, how it comes back after a cut) and the mixes of its areas (plants per m² by species – the twelve most frequent of
  // each); its atlas dist/bewuchs/blumen.png with the cells' measures from blumen.json
  function fromArten(A, base) {
    if (!A || !A.blumen) return 0;
    const L = [];
    // the wildflowers (atlas blumen.png, cells 0–63) and the bed plants (beete.png, cells 64–127; ids 'beet:<id>')
    const plants = Object.entries(A.blumen).concat(Object.entries(A.beet || {}).map(([id, b]) => ['beet:' + id, b]));
    for (const [id, b] of plants) {
      if (!b || !Array.isArray(b.hoehe_m) || !Array.isArray(b.jahr)) continue;
      const frames = {},
        c0 = id.startsWith('beet:') ? 64 : 0;
      for (const [fr, q] of Object.entries(b.bilder || {}))
        if (q && Array.isArray(q.zelle))
          frames[fr] = { cell: c0 + q.zelle[1] * 8 + q.zelle[0], k: Number.isFinite(q.hoehe) ? q.hoehe : 1 };
      const blooms = b.jahr.filter(p => p[0] === 'bluete');
      L.push({
        id,
        h: b.hoehe_m.slice(0, 2),
        frames,
        jahr: b.jahr.slice().sort((p, q) => p[1] - q[1]),
        streu: Number.isFinite(b.streuung_tage) ? b.streuung_tage : 0,
        wuchs: Array.isArray(b.wuchs) && b.wuchs.length === 12 ? b.wuchs.slice() : null,
        // after a cut: no leaves for blatt_tage (null: not again this year), flowers again after nach_schnitt_tage (null: not this year)
        bt: Number.isFinite(b.blatt_tage) ? b.blatt_tage : 999,
        nst: Number.isFinite(b.nach_schnitt_tage) ? b.nach_schnitt_tage : -1,
        nbb: Number.isFinite(b.nachbluete_bis) ? b.nachbluete_bis : 366,
        bloomLen: blooms.length ? Math.max(...blooms.map(p => p[2] - p[1] + 1)) : 20,
        col: b.farbe,
        colSeed: b.farbe_samen,
      });
    }
    if (!L.length) return 0;
    // the grasses' heads (ear or panicle): green in flower from aehre.von to bis, ripe and straw coloured to reif_bis, standing ueber_m
    // above the sward; anteil of the tufts carries one – as plants per m² of the area: its share of the grass × anteil × HEADS
    const HEADS = 10;
    for (const [gid, g] of Object.entries(A.gras || {})) {
      const a = g && g.aehre;
      if (!a || !Array.isArray(a.zelle) || !Number.isFinite(a.von) || !Number.isFinite(a.bis)) continue;
      const rz = Array.isArray(a.reif_zelle) ? a.reif_zelle : a.zelle,
        um = Array.isArray(a.ueber_m) ? a.ueber_m : [0.1, 0.3];
      L.push({
        id: 'gras:' + gid,
        grass: true,
        anteil: Number.isFinite(a.anteil) ? a.anteil : 0.25,
        h: [um[0], um[1]],
        frames: { bluete: { cell: a.zelle[1] * 8 + a.zelle[0], k: 1 }, samen: { cell: rz[1] * 8 + rz[0], k: 1 } },
        jahr: [
          ['bluete', a.von, a.bis],
          ['samen', a.bis + 1, Number.isFinite(a.reif_bis) ? a.reif_bis : a.bis + 30],
        ],
        streu: 6,
        wuchs: null,
        bt: 999, // cut: gone (the aftermath carries few)
        nst: -1,
        nbb: 366,
        bloomLen: a.bis - a.von + 1,
        col: a.farbe,
        colSeed: a.reif_farbe || a.farbe,
      });
    }
    // stage 5b: the crops (BWPHAENO.CROPS, rows CROP0 + i of the class table) – their plants from the acker atlas (cells 128–191): a
    // phase's picture (bilder) or the cereals' ears (kopf.zellen); in the harvest days the picture of the phase before until its field is
    // cut (bw_halm.js: each field on its own day), then the stubble's picture (as the 'blatt' frame: what is left after a cut) or nothing
    const crops = [];
    BWPHAENO.CROPS.forEach((cid, i) => {
      const F = A.feldfruechte && A.feldfruechte[cid];
      if (!F || !Array.isArray(F.jahr)) return;
      const cellOf = z => (Array.isArray(z) ? 128 + z[1] * 8 + z[0] : -1),
        picOf = q =>
          cellOf(
            q && q.bild && F.bilder && F.bilder[q.bild]
              ? F.bilder[q.bild].zelle
              : q && q.kopf && F.kopf && F.kopf.zellen
                ? F.kopf.zellen[q.kopf]
                : null
          ),
        ie = F.jahr.findIndex(q => q.name === 'ernte'),
        frames = {},
        jahr = [];
      F.jahr.forEach((q, k) => {
        const c = picOf(k === ie && ie > 0 ? F.jahr[ie - 1] : q);
        if (c < 0 || !Number.isFinite(q.von) || !Number.isFinite(q.bis)) return;
        frames[q.name] = { cell: c, k: 1 };
        jahr.push([q.name, q.von, q.bis, 1]);
      });
      const st = F.bilder && F.bilder.stoppel;
      if (st) frames.blatt = { cell: cellOf(st.zelle), k: 1 };
      if (!jahr.length) return;
      crops.push([BWPHAENO.CROP0 + i, 'acker:' + cid]);
      L.push({
        id: 'acker:' + cid,
        crop: F,
        h: [0.5, 1],
        frames,
        jahr,
        streu: 2,
        wuchs: null,
        bt: 0, // cut: its stubble at once (or nothing), never again this year
        nst: -1,
        nbb: 0,
        bloomLen: 1,
        col: null,
        colSeed: null,
      });
    });
    const M = {};
    const ids = new Set(L.slice(0, NS).map(s => s.id));
    for (const [c, id] of crops) if (ids.has(id)) M[c] = { [id]: 1 };
    for (const [c, e] of Object.entries(A.flaechen || {})) {
      const heads = Object.entries((e && e.gras) || {})
        .map(([gid, sh]) => {
          const s = L.find(q => q.id === 'gras:' + gid);
          return s && sh > 0
            ? ['gras:' + gid, sh * s.anteil * HEADS * (Number.isFinite(e.dichte) ? e.dichte : 1)]
            : null;
        })
        .filter(Boolean);
      const top = Object.entries((e && e.blumen) || {})
        .concat(heads)
        .filter(([id, v]) => ids.has(id) && v > 0)
        .sort((a, b) => b[1] - a[1])
        .slice(0, NMX);
      if (top.length) M[c] = Object.fromEntries(top);
    }
    if (M[1]) M[18] = M[1]; // the garden's own lawn: the lawn's flowers
    // feat/fotorealismus (foto-wald): the areas whose herb layer stands in patches (a wood's floor)
    const PT = {};
    for (const [c, e] of Object.entries(A.flaechen || {})) {
      const f = e && e.flecken;
      if (!f || !(f.groesse_m > 0) || !M[c]) continue;
      PT[c] = {
        grass: Number.isFinite(f.gras) ? Math.max(0.05, Math.min(1, f.gras)) : 1,
        arten: Object.fromEntries(
          Object.entries(f.arten || {})
            .filter(([id, v]) => ids.has(id) && Array.isArray(v) && v[0] > 0)
            .map(([id, v]) => [id, [Math.min(1, v[0]), v[1] > 0 ? v[1] : 1]])
        ),
      };
    }
    // stage 4: the bed classes take their templates (a bed one template, chosen by the place)
    TPL = Object.values(A.beetvorlagen || {});
    const tix = Object.fromEntries(Object.keys(A.beetvorlagen || {}).map((k, i) => [k, i]));
    for (const [c, e] of Object.entries(A.flaechen || {})) {
      const B = Object.entries((e && e.beete) || {}).filter(
        ([t, sh]) => tix[t] !== undefined && tix[t] < NTPL && sh > 0
      );
      if (B.length) M[c] = Object.fromEntries(B.map(([t, sh]) => ['tpl:' + tix[t], sh]));
    }
    // species and atlas together (the stand-in's cells are elsewhere): once the picture is there
    const apply = (tex, cells, rows) => {
      if (rows) U.uFlRows.value = rows;
      SP.length = 0;
      SP.push(...L.slice(0, NS));
      IDX = Object.fromEntries(SP.map((s, i) => [s.id, i]));
      MIX = M;
      S.MIX = M;
      PATCH = PT;
      S.PATCH = PT;
      if (cells) CELLINFO = cells;
      mixes();
      atlas(tex);
      S.arten = true;
      S.ver++;
      markDirty();
    };
    if (base == null) {
      apply(null, null);
      return L.length;
    }
    // the cells' measures (blumen.json; without it: the drawings reach the top, full width)
    const C = Array.from({ length: NCELL }, () => [0.97, 1]);
    const table = (file, c0) =>
      fetch(base + 'bewuchs/' + file)
        .then(r => (r.ok ? r.json() : null))
        .then(j => {
          if (!j || !Array.isArray(j.zellen)) return null;
          for (const z of j.zellen) {
            if (!z || !Array.isArray(z.zelle)) continue;
            const n = c0 + z.zelle[1] * 8 + z.zelle[0];
            if (n >= c0 && n < c0 + 64)
              C[n] = [
                Number.isFinite(z.oben) ? Math.max(0.3, Math.min(1, z.oben)) : 0.97,
                Number.isFinite(z.breite) ? Math.max(0.2, Math.min(1, z.breite)) : 1,
                hexLin(z.farbe),
              ];
          }
          return true;
        })
        .catch(() => null);
    const img = file =>
      new Promise(res => {
        const im = new Image();
        im.onload = () => res(im);
        im.onerror = () => res(null);
        im.src = base + 'bewuchs/' + file;
      });
    // one picture of 8 × 24 cells: the wildflowers above, the bed plants below them, the crops at the bottom (one material, one draw call
    // per ring); on phones and tablets at the texture level of every other image (core/assets.js TEXHALF: half or a quarter the size)
    Promise.all([
      img('blumen.png'),
      img('beete.png'),
      img('acker.png'),
      table('blumen.json', 0),
      table('beete.json', 64),
      table('acker.json', 128),
    ]).then(([a, b, c]) => {
      if (!a) {
        S.err = 'blumen.png nicht geladen';
        return;
      }
      const L2 = (typeof window !== 'undefined' && window.TEXHALF && window.TEXHALF.level) || 0,
        w = Math.max(64, a.width >> L2),
        h = Math.max(64, a.height >> L2),
        cv = document.createElement('canvas');
      cv.width = w;
      cv.height = h * 3;
      const g = cv.getContext('2d');
      g.drawImage(a, 0, 0, w, h);
      if (b) g.drawImage(b, 0, h, w, h);
      if (c) g.drawImage(c, 0, h * 2, w, h);
      const t = new THREE.CanvasTexture(cv);
      t.colorSpace = THREE.SRGBColorSpace;
      t.anisotropy = 4;
      S.atlasPx = [cv.width, cv.height];
      apply(t, C, NCR);
    });
    return L.length;
  }

  // ---------- the flower patch: F slots per tile, each two crossed quads ----------
  function patch(F, ring) {
    const nv = 8,
      pos = new Float32Array(F * nv * 3),
      aF = new Float32Array(F * nv * 4),
      aQ = new Float32Array(F * nv * 3),
      idx = new Uint32Array(F * 12);
    let a = 1234567 + F;
    const R = () => {
      a = (a * 16807) % 2147483647;
      return (a - 1) / 2147483646;
    };
    for (let f = 0; f < F; f++) {
      const fx = R(),
        fy = R(),
        rS = R(),
        rZ = R(),
        rot = R();
      for (let q = 0; q < 2; q++)
        for (let v = 0; v < 4; v++) {
          const o = f * nv + q * 4 + v;
          aF.set([fx, fy, rS, rZ], o * 4);
          aQ.set([v & 1 ? 1 : -1, v & 2 ? 1 : 0, q + rot * 0.5], o * 3);
        }
      for (let q = 0; q < 2; q++) {
        const b = f * nv + q * 4;
        idx.set([b, b + 1, b + 2, b + 1, b + 3, b + 2], f * 12 + q * 6);
      }
    }
    const g = new THREE.InstancedBufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    g.setAttribute('aF', new THREE.BufferAttribute(aF, 4));
    g.setAttribute('aQ', new THREE.BufferAttribute(aQ, 3));
    g.setIndex(new THREE.BufferAttribute(idx, 1));
    g.setAttribute('iT', ring.P.iT); // the ring's tiles (shared: uploaded once)
    g.setAttribute('iU', ring.P.iU);
    g.instanceCount = 0;
    g.boundingSphere = new THREE.Sphere(new THREE.Vector3(), 1e5);
    return g;
  }
  const VS = `uniform highp sampler2D tBwK, tBwG, tBwS, tBwM, tBwSp, tBwMx;
uniform vec4 uBwG, uBwS, uBwM, uBwP, uBwFr;
uniform float uFlRows;
uniform vec4 wxSw; uniform vec2 wxSwD; uniform vec2 wxGr;
attribute vec4 aF; attribute vec3 aQ; attribute vec4 iT; attribute vec4 iU;
varying vec2 vFlUv, vFlL; varying vec4 vFlTint;
float flHash( vec2 p ) { return fract( sin( dot( p, vec2( 127.1, 311.7 ) ) ) * 43758.5453 ); }
${BWHALM.cropGlsl('flHash')}
${BWHALM.woodGlsl('flHash')}
// feat/fotorealismus (foto-wald): does a plant of a wood's floor stand at q? pm: its patches (the mix texture's columns ${NMX} …) –
// the values of its soft field it stands between, which field, their size; s: the size of the class's patches (m); jit: its own
// small offset (the patches thin out towards their edge)
bool flIn( vec2 q, float s, vec4 pm, float jit ) {
  float f = bwField( q, s * pm.w, vec2( 23.7, 7.1 ) + pm.z * vec2( 17.3, 5.9 ) ) + jit;
  return f > pm.x && f < pm.y;
}
float flCode( vec2 q ) {
  vec2 s = ( q - uBwS.xy ) * uBwS.zw;
  if ( s.x > 0.0 && s.y > 0.0 && s.x < 1.0 && s.y < 1.0 ) return floor( texture( tBwS, s ).r * 255.0 + 0.5 );
  vec2 g = ( q - uBwG.xy ) * uBwG.zw;
  if ( g.x <= 0.0 || g.y <= 0.0 || g.x >= 1.0 || g.y >= 1.0 ) return 0.0;
  return floor( texture( tBwG, g ).r * 255.0 + 0.5 );
}
// this field's last cut before today (−1: none this year) and the grass's height now – the same fields as the blades' (bw_halm.js bwHeight)
float flLast( int c, vec2 q, out float h ) {
  vec4 k0 = texelFetch( tBwK, ivec2( 0, c ), 0 ), k1 = texelFetch( tBwK, ivec2( 1, c ), 0 ), k4 = texelFetch( tBwK, ivec2( 4, c ), 0 );
  float hs = k0.y, doy = uBwP.x, g = k0.z, last = -1.0;
  float sc = k1.x > 0.5 && k1.x < 12.0 ? 17.0 : 65.0;
  vec2 fw = q / sc + 0.4 * vec2( sin( q.y * 0.043 ), sin( q.x * 0.037 ) );
  vec2 fc = floor( fw ) + float( c ) * 7.13;
  float fh = flHash( fc ), fs = flHash( fc + 17.7 );
  h = hs;
  if ( k1.x > 0.5 ) {
    float a = k1.y + ( fh - 0.5 ) * 4.0, age = max( mod( doy - a + fh * k1.x, k1.x ), 0.05 );
    h = min( hs, k0.x + g * age );
    if ( doy - age >= a - 0.5 ) last = doy - age;
  } else if ( k1.y > 0.5 ) {
    float off = ( fh - 0.5 ) * 2.0 * k1.w;
    if ( doy >= k1.y + off && fs < k4.y ) last = k1.y + off;
    if ( k1.z > 0.5 && doy >= k1.z + off && fs < k4.z ) last = k1.z + off;
    if ( k4.x > 0.5 && doy >= k4.x + off && fs < k4.w ) last = k4.x + off;
    if ( last > 0.0 ) h = min( hs, k0.x + g * ( doy - last ) );
  }
  return last;
}
void flPlant( out vec3 P ) {
  float Sz = iU.z;
  vec2 t0 = iT.xy;
  float th = flHash( t0 * 0.913 + 1.7 );
  vec2 b = fract( aF.xy + vec2( th, flHash( t0 + 9.1 ) ) );
  vec2 q = t0 + b * Sz;
  float zr = mix( mix( iT.z, iT.w, b.x ), mix( iU.x, iU.y, b.x ), b.y );
  P = vec3( q.x, zr - 0.05, - q.y );
  vFlUv = vec2( 0.0 );
  vFlTint = vec4( 1.0, 1.0, 1.0, 0.0 );
  vFlL = vec2( 1.0 );
  float code = flCode( q );
  int cls = int( mod( code, 32.0 ) );
  if ( cls == 0 || uBwP.z > 0.3 ) return;   // no flowers under snow
  // a field: its crop (the blades' choice) – a crop sown in rows has its plants on them
  if ( cls == 9 || ( cls >= 19 && cls <= 22 ) ) cls = bwCrop( cls, q );
  float vig = floor( code / 32.0 ) / 7.0;
  vec4 k3 = texelFetch( tBwK, ivec2( 3, cls ), 0 ), k6 = texelFetch( tBwK, ivec2( 6, cls ), 0 );
  if ( cls >= ${BWPHAENO.CROP0} && k6.w > 0.1 ) { q = bwCropRow( q, k6.w ); P.x = q.x; P.z = - q.y; }
  // slots used: plants per m² at peak (fewer on rich ground) × the tile's area / slots, by the ring's fade
  vec2 cm = vec2( cameraPosition.x, - cameraPosition.z );
  float d = distance( q, cm );
  float fade = 1.0 - smoothstep( uBwFr.x, uBwFr.y, d );
  float rS = fract( aF.z + th * 3.3 ), rZ = fract( aF.w + th * 5.7 );
  float use = k3.z * mix( k6.x, k6.y, vig ) * Sz * Sz / uBwFr.z * fade * uBwP.y;
  // the species from the class's mix
  // (a bed class: its template chosen by the place – one bed, one template – then a plant of the template's phase today)
  vec4 m0 = texelFetch( tBwMx, ivec2( 0, cls ), 0 );
  float rP = m0.x < -0.5 ? flHash( floor( q / 3.0 ) + 17.3 ) : rS, mx = -999.0;
  // feat/fotorealismus (foto-wald): under trees. The stand's light at the plant (a wood's floor: its row's; in the forest at the
  // Klinge the canopy map's), and a wood's herb layer in patches instead of evenly: inside a patch of its carpet plant (the first
  // of its mix – bilberry) that one, as dense as it stands there; elsewhere one of the others, if it has a patch of its own here –
  // so most of the floor stays bare litter. Little grows under closed crowns.
  vec4 k7 = texelFetch( tBwK, ivec2( 7, cls ), 0 );
  vec3 wl = bwLight( q, k7.xy, iU.w );
  float wood = m0.z > 0.0 && k7.z > 0.0 ? 1.0 : 0.0, jit = ( fract( rS * 143.7 + th * 1.9 ) - 0.5 ) * 0.1;
  int k0 = 0, ke = 0;
  use *= 1.0 - 0.6 * smoothstep( 0.72, 1.0, wl.z );
  if ( wood > 0.5 ) {
    use *= m0.z;
    if ( flIn( q, k7.z, texelFetch( tBwMx, ivec2( ${NMX}, cls ), 0 ), jit ) ) { use *= m0.y; mx = m0.x; }
    else { use *= 1.0 - m0.y; k0 = 1; rP = m0.y + rP * ( 1.0 - m0.y ); }
  }
  if ( rZ > use ) return;
  if ( mx < -900.0 ) for ( int k = k0; k < ${NMX}; k++ ) { vec4 m = texelFetch( tBwMx, ivec2( k, cls ), 0 ); if ( m.y <= 0.0 ) break; if ( rP <= m.y ) { mx = m.x; ke = k; break; } }
  if ( k0 > 0 && ! flIn( q, k7.z, texelFetch( tBwMx, ivec2( ${NMX} + ke, cls ), 0 ), jit ) ) return;
  if ( mx < -0.5 && mx > -900.0 ) {
    int tr = 32 + int( -mx + 0.5 ) - 1;
    float r2 = fract( rS * 7.31 + th );
    mx = -999.0;
    for ( int k = 0; k < ${NMX}; k++ ) { vec4 m = texelFetch( tBwMx, ivec2( k, tr ), 0 ); if ( m.y <= 0.0 ) break; if ( r2 <= m.y ) { mx = m.x; break; } }
  }
  if ( mx < -0.5 ) return;
  int sp = int( mx + 0.5 );
  vec4 s0 = texelFetch( tBwSp, ivec2( 0, sp ), 0 ), s1 = texelFetch( tBwSp, ivec2( 1, sp ), 0 ), s2 = texelFetch( tBwSp, ivec2( 2, sp ), 0 );
  // this plant's group (earlier or later than the table by the species' spread) and its frame today; a share of them in leaf
  vec4 ph = texelFetch( tBwSp, ivec2( 3 + int( fract( rS * 29.3 + th ) * 3.999 ), sp ), 0 );
  float cell = ph.x, hk = abs( ph.y ), seed = step( ph.y, -1e-6 );
  if ( cell < 0.0 ) return;
  if ( fract( rS * 17.1 ) > ph.z ) { if ( s1.z < 0.0 || abs( cell - s1.z ) < 0.5 ) return; cell = s1.z; hk = s1.w; seed = 0.0; }
  // cut since its phase began: nothing for a few days, then its leaves, its flowers again after a while (if its season allows)
  float hc, last = flLast( cls, q, hc );
  if ( last > 1.5 && ph.w <= last ) {
    float ds = uBwP.x - last;
    if ( ds < s0.x ) return;
    if ( s0.y >= 0.0 && last + s0.y <= s0.z && ds >= s0.y && ds < s0.y + s0.w ) { cell = s1.x; hk = s1.y; }
    else { cell = s1.z; hk = s1.w; }
    seed = 0.0;
    if ( cell < 0.0 ) return;
  }
  // its height (by its frame and the month); in a short sward not far above the grass – a grass head stands its own height above it
  // (feat/fotorealismus, foto-wald: under trees smaller the less light there is; in a wood most are small, few reach their full height)
  float rh = fract( rZ * 13.7 + rS * 71.3 );
  // (by the crowns over it, not by wl.x: that changes where the sun's shadow box ends, which follows the walker)
  float hf = mix( s2.x, s2.y, mix( rh, rh * rh, wood ) ) * hk * mix( 0.62, 1.0, min( 1.0, ( iU.w > 0.5 ? 1.0 - 0.86 * wl.z : k7.x ) * 1.5 ) ), zb = 0.0;
  // a grass head: the card's upper part (the head, ~45 % of the drawing) over the sward, its stem down into it
  if ( s2.z > 0.5 ) { zb = max( 0.0, hc - 0.5 * hf ); hf = hc + hf - zb; }
  else if ( hc > 0.02 ) hf = min( hf, max( hc * 2.2, 0.08 ) );
  if ( hf < 0.012 ) return;
  // the colour of a grass head (drawn neutral): the bloom's or the ripe one's
  vFlTint.rgb = texelFetch( tBwSp, ivec2( seed > 0.5 ? 8 : 7, sp ), 0 ).rgb;
  // feat/fotorealismus (foto-wald): no two plants one green – each a little lighter or darker; in a wood more: dark and light
  // ones, some yellowing, a few fronds brown with age (a: how much of the drawing's colour turns to that brown)
  float rc = fract( rS * 191.7 + th * 3.1 ), ry = fract( rS * 357.3 + th * 7.7 );
  vFlTint.rgb *= mix( vec3( mix( 0.9, 1.08, rc ) ), mix( 0.62, 1.1, rc ) * mix( vec3( 0.9, 1.0, 0.84 ), vec3( 1.13, 1.0, 0.72 ), ry * ry ), wood );
  vFlTint.a = wood * step( fract( rS * 517.3 + th * 2.3 ), 0.06 ) * mix( 0.55, 0.9, ry );
  vFlL = wl.xy;
  // the card: as tall as the plant over how high the drawing reaches in its cell, as wide as the drawing (the cell's middle only)
  vec4 cd = texelFetch( tBwSp, ivec2( int( mod( cell, 8.0 ) ), ${NS} + int( cell / 8.0 ) ), 0 );
  float H = hf / max( cd.x, 0.3 ), hw = 0.5 * cd.y * H;
  // the two quads, turned; the head sways with the wind
  float a = ( aQ.z + th ) * 3.1416;
  vec2 dir = vec2( cos( a ), sin( a ) );
  if ( aQ.z >= 1.0 ) dir = vec2( - dir.y, dir.x );
  float t = aQ.y;
  vec2 wd = vec2( wxSwD.x, - wxSwD.y );
  float wb = wxGr.x * ( 0.7 + 0.3 * sin( wxSw.z * 1.9 - dot( q, wd ) * 0.7 ) ) + wxGr.y * sin( wxSw.z * 7.3 + q.x * 3.1 + q.y * 2.3 );
  vec2 xy = q + dir * aQ.x * hw + wd * wb * H * t * t;
  P = vec3( xy.x, zr + zb + H * t, - xy.y );
  float col = mod( cell, 8.0 ), row = floor( cell / 8.0 );
  vFlUv = vec2( ( col + 0.5 + aQ.x * 0.5 * cd.y ) / 8.0, 1.0 - ( row + 1.0 - t ) / uFlRows );
}
`;
  const U = {
    tBwSp: { value: SPT },
    tBwMx: { value: MXT },
    uFlRows: { value: 16 }, // the atlas' rows of cells: the stand-in's 16, the helper's three pictures 24
    map: null,
  };
  function material(F) {
    const m = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      map: U.map,
      alphaTest: 0.5,
      side: THREE.DoubleSide,
      roughness: 0.75,
      metalness: 0,
      envMapIntensity: 0.6,
    });
    m.userData.leak = true;
    const ringU = { uBwFr: { value: new THREE.Vector4(10, 14, F, 0) } };
    m.onBeforeCompile = sh => {
      Object.assign(sh.uniforms, BWHALM.U, BWKARTE.U, BWHALM.WU, U, ringU, {
        wxSw: WXWIND.U.wxSw,
        wxSwD: WXWIND.U.wxSwD,
        wxGr: WXWIND.UG.wxGr,
      });
      sh.vertexShader =
        VS +
        sh.vertexShader
          .replace('#include <beginnormal_vertex>', 'vec3 objectNormal = vec3( 0.0, 1.0, 0.0 );')
          .replace('#include <begin_vertex>', 'vec3 transformed; flPlant( transformed );\n  vMapUv = vFlUv;');
      sh.fragmentShader = ('varying vec4 vFlTint; varying vec2 vFlL;\n' + sh.fragmentShader)
        .replace(
          '#include <normal_fragment_begin>',
          'float faceDirection = gl_FrontFacing ? 1.0 : - 1.0;\n  vec3 normal = normalize( vNormal );\n  vec3 nonPerturbedNormal = normal;'
        )
        // the grass heads' colour (their cells are drawn light and neutral; every other plant: 1)
        // (feat/fotorealismus, foto-wald: and each plant's own shade of green; an old frond brown)
        .replace(
          '#include <map_fragment>',
          '#include <map_fragment>\n  diffuseColor.rgb *= vFlTint.rgb;\n  diffuseColor.rgb = mix( diffuseColor.rgb, dot( diffuseColor.rgb, vec3( 0.3, 0.59, 0.11 ) ) * vec3( 2.0, 1.0, 0.38 ), vFlTint.a );'
        )
        // feat/fotorealismus: no mirror of the sky on the plants. Their cards stand upright but are lit as ground (the normal points
        // up), so seen from a walker's height every card is seen at a grazing angle – and reflected the bright sky at the horizon
        // nearly in full: ferns in a wood pale mint, grass heads like milk glass. Leaves scatter; a little sheen stays.
        .replace(
          '#include <lights_fragment_end>',
          '#include <lights_fragment_end>\n  reflectedLight.indirectSpecular *= 0.12; reflectedLight.directSpecular *= 0.3;\n  ' +
            BWHALM.woodLight('vFlL') // feat/fotorealismus (foto-wald): under trees
        );
    };
    m.customProgramCacheKey = () => 'bwblume';
    m.userData.ringU = ringU;
    return patchSV(m);
  }
  // ---------- on the rings of BWHALM ----------
  function build() {
    for (const M of S.meshes) {
      scene.remove(M.mesh);
      M.mesh.geometry.dispose();
      M.mesh.material.dispose();
    }
    S.meshes = [];
    if (!U.map) U.map = standin();
    for (const R of BWHALM.rings) {
      if (R.tag === 'dicht') continue;
      const F = R.near ? 14 : 24,
        g = patch(F, R),
        mat = material(F),
        mesh = new THREE.Mesh(g, mat);
      mat.map = U.map;
      // the near ring's flowers to its edge, the mid ring's from there out to ~26 m (they thin out)
      const rF = R.near ? R.r : Math.min(R.r, 26);
      if (R.near) mat.userData.ringU.uBwFr.value.set(R.r * 0.75, R.r, F, 0);
      else mat.userData.ringU.uBwFr.value.set(rF * 0.8, rF, F, 0);
      mesh.frustumCulled = false;
      mesh.castShadow = false;
      mesh.receiveShadow = true;
      mesh.userData.noMerge = true;
      mesh.name = 'bewuchs-blumen-' + R.tag;
      // the tiles of the ring (nearest first) as far as flowers stand
      mesh.onBeforeRender = () => {
        g.instanceCount = R.within ? R.within(rF + R.size * 0.75) : R.P.g.instanceCount;
      };
      scene.add(mesh);
      S.meshes.push({ mesh, R, F });
    }
    mixes();
    if (Number.isFinite(S.doy)) day(S.doy);
    markDirty();
  }
  function atlas(tex) {
    if (tex) {
      U.map = tex;
      for (const M of S.meshes) M.mesh.material.map = tex;
      S.standin = false;
    }
    if (Number.isFinite(S.doy)) day(S.doy);
  }
  // for tests: per species the frame of each of its four groups today (cell, share)
  const stats = () => ({
    rings: S.meshes.map(M => ({ tag: M.R.tag, tiles: M.R.n, slots: M.R.n * M.F })),
    species: Object.fromEntries(
      SP.map((s, i) => {
        const D = SPT.image.data,
          o = i * SPW * 4;
        return [s.id, [0, 1, 2, 3].map(k => [D[o + 12 + k * 4], +D[o + 14 + k * 4].toFixed(2)])];
      })
    ),
    standin: S.standin,
    arten: !!S.arten,
    // stage 4: the bed templates and the classes planted with them
    tpl: TPL.length,
    // stage 5b: the crops with plants from the acker atlas, the atlas' size
    acker: SP.filter(s => s.crop).map(s => s.id),
    atlasPx: S.atlasPx || null,
    beds: Object.keys(MIX).filter(c => Object.keys(MIX[c]).some(id => id.startsWith('tpl:'))),
  });
  Object.assign(S, { build, day, atlas, stats, fromArten, phaseAt, mixes, fieldNo, SP, MIX, U });
  BWHALM.onBuild = build;
  return S;
})();
if (typeof window !== 'undefined') window.BWBLUME = BWBLUME;
