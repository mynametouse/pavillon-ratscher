// ===================== feat/laeden: the shops of Schleusingen as what they are – OBI, Mega Center, EDEKA, Shell, McDonald's, Lidl, REWE … (LAEDEN) =====================
// Falko (13.11.2026 16:42/16:50/22:05): the big shops north of the old town stood as generic halls of the ETHOS cells (gebaeude/gebaeude.js)
// or as a house of the old town (McDonald's and Lidl in welt/schleusingen.js); now each reads as what it is, at its real place: the building
// (the OSM outline, the parts and heights of ETHOS.BUILDA), its real name in plain letters on a neutral band – never a logo, a brand colour or
// a slogan –, the entrance where it is (OSM, else the vestibule of the orthophoto, else the rules of docs/plans/daten_gebaeudetypen.md) with
// a glazed front, sliding doors and a canopy, the delivery at the back, the car park with bays, kerbs, lamps and trolley shelters, the
// drive-in lane of McDonald's, the forecourt of the station; at each door a label with the opening hours (open or closed by the game clock).
// Data: tools/laeden/laeden.py → dist/laeden/laeden.json (fetched when one comes within 1.6 km). Each group of shops is built when one comes
// within 900 m and freed beyond 1150 m: the ground levelled under shop and car park (WELT.setPads), the parked cars of welt-dinge moved into
// the bays. No new shader programs: walls and roofs on the village's materials (world/village.js), everything else of vertex colours on the
// parked cars' material (DMOD.mat), the asphalt and the paving on the program of the village's paving (v16e-kit), the paint on the program of
// the road paint, the letters as one canvas atlas on the program of the town's signs, the lit windows on that of the lamps' glass.
// ?nolaeden leaves all of it out (the ETHOS halls and the old-town houses come back).
import * as THREE from 'three';
import { BASE, COARSE, QS, scene } from '../core/head.js';
import { KERN } from '../core/kern.js';
import { markDirty, texFile, texFileOf, TEXMAN } from '../core/assets.js';
import { toast } from '../audio/audio.js';
import { CLOCK } from '../time/clock.js';
import { DCAL } from '../dorf/dorf_cal.js';
import { RATSCHER } from '../world/ratscher.js';
import { VILLAGE } from '../world/village.js';
import { VPROPS } from '../world/village_props.js';
import { WELT } from '../welt/welt.js';
import { GEB } from '../gebaeude/gebaeude.js';
import { DMOD } from '../dinge/dinge_modelle.js';
export const LAEDEN = (() => {
  const S = { on: false, state: 'idle', data: null, groups: [], err: '', segs: 0, moved: 0, dropped: 0, acts: 0 };
  if (!WELT.on || !RATSCHER || !RATSCHER.on || !DMOD.on || QS.has('nolaeden')) return S;
  S.on = true;
  // ---- what the shops replace: the ETHOS buildings under them (gebaeude/gebaeude.js asks GEB.skip) and the two houses of the old town
  // (welt/schleusingen.js asks LAEDEN.skipStadt) – the lists of tools/laeden/laeden.py (laeden.json skip; the test compares them) ----
  const SKIP_ETHOS = new Set([
    'DEG_DETHL57P0000LCFC',
    'DEG_DETHL57P0000LCFD',
    'DEG_DETHL57P0000LCFG',
    'DEG_DETHL57P0000LCFS',
    'DEG_DETHL57P0000LCFT',
    'DEG_DETHL57P0000LyrC',
    'DEG_DETHL57P0000LyrQ',
    'DEG_DETHL57P0000Lyrz',
    'DEG_DETHL57P0000Lysh',
    'DEG_DETHL57P0000Lytd',
    'DEG_DETHL57P0000Lytg',
    'DEG_DETHL57P0000Lyti',
    'DEG_DETHL57P0000Lytj',
    'DEG_DETHL57P0000LzqP',
    'DEG_DETHL57P00012az2',
    'DEG_DETHL57P00012az4',
    'DEG_DETHL57P00012tG2',
    'DEG_DETHL57P00012tG4',
    'DEG_DETHL57P00012tGg',
    'DEG_DETHL57P00012tGk',
    'DEG_DETHL57P00012tGl',
    'DEG_DETHL57P00014hQB',
    'DEG_DETHL57P00014hQx',
    'DEG_DETHL57P00014hQy',
    'DEG_DETHL57P0001eBgC',
  ]);
  const SKIP_STADT = [
    ["McDonald's", 'Kurhausstraße 1a'],
    ['Lidl', 'Jägerhausstraße 8'],
  ];
  S.SKIP_ETHOS = SKIP_ETHOS;
  S.SKIP_STADT = SKIP_STADT;
  // off again when the data is missing for good (an old site without the file): the halls come back
  const skipOn = () => S.state !== 'fehlt';
  S.skipStadt = b => skipOn() && !!b && SKIP_STADT.some(([n, a]) => b.n === n && b.a === a);
  if (GEB && GEB.on) GEB.skip = b => skipOn() && !!b && typeof b.id === 'string' && SKIP_ETHOS.has(b.id);
  // ---- groups: built near, freed far ----
  const GROUPS = [
    { id: 'nord', c: [-885, 2060] },
    { id: 'mitte', c: [-1075, 1570] },
    { id: 'rewe', c: [-1765, 915] },
  ];
  const NEAR = COARSE ? 650 : 900,
    FAR = NEAR + 250,
    LOAD_R = 1600,
    DETAIL = COARSE ? 320 : 450; // the small things (paint, kerbs, lamps, trolleys, solar panels) only nearer than this
  // ---- colours (sRGB → linear) ----
  const lin = c => (c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4)),
    L = (r, g, b) => [lin(r), lin(g), lin(b)],
    k82 = c => c.map(v => v * 0.82);
  const WALL = {
      hell: k82(L(0.8, 0.81, 0.8)),
      weiss: k82(L(0.9, 0.9, 0.88)),
      dunkel: k82(L(0.33, 0.34, 0.35)),
      putz: k82(L(0.88, 0.85, 0.78)),
    },
    ANTH = L(0.17, 0.18, 0.19), // anthracite: frames, fascia, poles
    GREYM = L(0.55, 0.56, 0.56), // aluminium
    LIGHT = L(0.86, 0.86, 0.84), // light panels, canopy undersides
    WHITE_ = L(0.93, 0.93, 0.92), // never pure white (DMOD.mat tints pure white with an instance colour)
    GLASS_D = L(0.07, 0.085, 0.095),
    CONC = L(0.62, 0.61, 0.58),
    KERB = L(0.66, 0.65, 0.62),
    ASPH = L(0.36, 0.36, 0.37),
    PAVE = L(0.6, 0.58, 0.55),
    PAINT = L(0.88, 0.88, 0.86),
    YEL = L(0.85, 0.7, 0.2), // the lane edge of the drive-in and the bumpers – road paint, no brand
    PV = L(0.1, 0.13, 0.2),
    PVF = L(0.5, 0.52, 0.55),
    GREEN_GL = L(0.62, 0.72, 0.68);
  // sign styles: [band, letters] – plain, neutral
  const ST = [
    ['#2c3034', '#f4f4f2'], // white on anthracite
    ['#f1f2f0', '#2a2d30'], // anthracite on white
    ['#2f2b28', '#ffffff'], // white on dark grey-brown (inns, take-aways)
    ['#e9eae6', '#33373a'], // small plates
  ];
  const hh = n => {
    const s = Math.sin(n * 12.9898 + 4.1) * 43758.5453;
    return s - Math.floor(s);
  };
  // ---- opening hours (the forms OSM has here: "Mo-Fr 08:30-19:00; Sa 08:30-18:00", "Mo-Sa 07:00-20:00; Su off", "Mo-Su 09:00-24:00") ----
  const DAYS = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'],
    DE = { Mo: 'Mo', Tu: 'Di', We: 'Mi', Th: 'Do', Fr: 'Fr', Sa: 'Sa', Su: 'So', PH: 'Feiertag' };
  function parseOH(s) {
    if (!s) return null;
    const week = [[], [], [], [], [], [], []];
    for (const rule of s.split(';')) {
      const r = rule.trim();
      const m = r.match(/^([A-Za-z,\- ]+?)\s+(off|closed|[0-9:\-, ]+)$/);
      if (!m) continue;
      const days = new Set();
      for (const part of m[1].split(',')) {
        const p = part.trim();
        if (p === 'PH') continue;
        const [a, b] = p.split('-').map(q => DAYS.indexOf(q.trim()));
        if (a < 0) continue;
        if (b === undefined || b < 0) days.add(a);
        else
          for (let d = a; ; d = (d + 1) % 7) {
            days.add(d);
            if (d === b) break;
          }
      }
      const spans = [];
      if (m[2] !== 'off' && m[2] !== 'closed')
        for (const t of m[2].split(',')) {
          const q = t.trim().match(/^(\d\d?):(\d\d)-(\d\d?):(\d\d)$/);
          if (q) spans.push([+q[1] * 60 + +q[2], +q[3] * 60 + +q[4]]);
        }
      for (const d of days) week[d] = spans;
    }
    return week;
  }
  const isOpen = (week, t = CLOCK.t) => {
    if (!week) return null;
    const d = DCAL.wd(t),
      m = DCAL.min(t);
    return week[d].some(([a, b]) => m >= a && m < b);
  };
  const hm = m => {
    const h = Math.floor(m / 60) % 24 || (m >= 1440 ? 24 : 0),
      mi = m % 60;
    return mi ? h + ':' + String(mi).padStart(2, '0') : String(h);
  };
  // "Mo–Fr 8:30–19, Sa 8:30–18" (for the label) – days with the same hours run together
  function ohShort(s) {
    if (!s) return '';
    return s
      .split(';')
      .map(r => r.trim())
      .filter(r => r && !/\b(off|closed)\b/.test(r))
      .map(r =>
        r
          .replace(/\b(Mo|Tu|We|Th|Fr|Sa|Su|PH)\b/g, d => DE[d])
          .replace(/(\d\d?):(\d\d)/g, (q, h, mi) => (mi === '00' ? String(+h) : +h + ':' + mi))
          .replace(/-/g, '–')
      )
      .join(', ');
  }
  S.parseOH = parseOH;
  S.isOpen = isOpen;
  S.ohShort = ohShort;
  // ---- geometry: a kit of vertex-coloured faces (model metres x east, y north, z up → three x, z, −y) ----
  function kit() {
    const P = [],
      N = [],
      C = [],
      U = [];
    const K = {
      n: () => P.length / 3,
      tri(a, b, c, col) {
        const ux = b[0] - a[0],
          uy = b[1] - a[1],
          uz = b[2] - a[2],
          vx = c[0] - a[0],
          vy = c[1] - a[1],
          vz = c[2] - a[2];
        let nx = uy * vz - uz * vy,
          ny = uz * vx - ux * vz,
          nz = ux * vy - uy * vx;
        const l = Math.hypot(nx, ny, nz) || 1;
        nx /= l;
        ny /= l;
        nz /= l;
        for (const p of [a, b, c]) {
          P.push(p[0], p[2], -p[1]);
          N.push(nx, nz, -ny);
          C.push(col[0], col[1], col[2]);
          // uv in metres: along the face's main plane (the asphalt and the paving repeat by metres)
          U.push(Math.abs(nz) > 0.7 ? p[0] : p[0] * -ny + p[1] * nx, Math.abs(nz) > 0.7 ? p[1] : p[2]);
        }
      },
      // a b c d counter-clockwise seen from outside
      quad(a, b, c, d, col) {
        K.tri(a, b, c, col);
        K.tri(a, c, d, col);
      },
      // a triangle / quad lying on the ground, facing up whatever its order
      triUp(a, b, c, col) {
        if ((b[0] - a[0]) * (c[1] - a[1]) - (b[1] - a[1]) * (c[0] - a[0]) >= 0) K.tri(a, b, c, col);
        else K.tri(a, c, b, col);
      },
      quadUp(a, b, c, d, col) {
        K.triUp(a, b, c, col);
        K.triUp(a, c, d, col);
      },
      // a box from z0 to z0 + sz, sx along the direction rot (radians from east, counter-clockwise), sy across
      box(cx, cy, z0, sx, sy, sz, rot, col, top = col) {
        const c = Math.cos(rot),
          s = Math.sin(rot),
          p = (x, y, z) => [cx + x * c - y * s, cy + x * s + y * c, z];
        const x0 = -sx / 2,
          x1 = sx / 2,
          y0 = -sy / 2,
          y1 = sy / 2,
          z1 = z0 + sz;
        K.quad(p(x1, y0, z0), p(x1, y1, z0), p(x1, y1, z1), p(x1, y0, z1), col);
        K.quad(p(x1, y1, z0), p(x0, y1, z0), p(x0, y1, z1), p(x1, y1, z1), col);
        K.quad(p(x0, y1, z0), p(x0, y0, z0), p(x0, y0, z1), p(x0, y1, z1), col);
        K.quad(p(x0, y0, z0), p(x1, y0, z0), p(x1, y0, z1), p(x0, y0, z1), col);
        K.quad(p(x0, y0, z1), p(x1, y0, z1), p(x1, y1, z1), p(x0, y1, z1), top);
      },
      // a box between two points on the ground (a beam, a kerb along a line), w wide, from z0 to z1
      bar(ax, ay, bx, by, w, z0, z1, col, za, zb) {
        const L2 = Math.hypot(bx - ax, by - ay);
        if (L2 < 1e-3) return;
        const ux = (bx - ax) / L2,
          uy = (by - ay) / L2,
          nx = uy * (w / 2),
          ny = -ux * (w / 2),
          da = za === undefined ? 0 : za,
          db = zb === undefined ? 0 : zb;
        const A0 = [ax + nx, ay + ny],
          A1 = [ax - nx, ay - ny],
          B0 = [bx + nx, by + ny],
          B1 = [bx - nx, by - ny];
        K.quad([A0[0], A0[1], z0 + da], [B0[0], B0[1], z0 + db], [B0[0], B0[1], z1 + db], [A0[0], A0[1], z1 + da], col);
        K.quad([B1[0], B1[1], z0 + db], [A1[0], A1[1], z0 + da], [A1[0], A1[1], z1 + da], [B1[0], B1[1], z1 + db], col);
        K.quad([A0[0], A0[1], z1 + da], [B0[0], B0[1], z1 + db], [B1[0], B1[1], z1 + db], [A1[0], A1[1], z1 + da], col);
        K.quad([A1[0], A1[1], z0 + da], [A0[0], A0[1], z0 + da], [A0[0], A0[1], z1 + da], [A1[0], A1[1], z1 + da], col);
        K.quad([B0[0], B0[1], z0 + db], [B1[0], B1[1], z0 + db], [B1[0], B1[1], z1 + db], [B0[0], B0[1], z1 + db], col);
      },
      cyl(cx, cy, z0, z1, r, seg, col) {
        for (let k = 0; k < seg; k++) {
          const a0 = (k / seg) * Math.PI * 2,
            a1 = ((k + 1) / seg) * Math.PI * 2;
          const p0 = [cx + Math.cos(a0) * r, cy + Math.sin(a0) * r],
            p1 = [cx + Math.cos(a1) * r, cy + Math.sin(a1) * r];
          K.quad([p0[0], p0[1], z0], [p1[0], p1[1], z0], [p1[0], p1[1], z1], [p0[0], p0[1], z1], col);
          K.tri([cx, cy, z1], [p0[0], p0[1], z1], [p1[0], p1[1], z1], col);
        }
      },
      // a flat polygon (x, y pairs, any winding) at height z(x, y), facing up
      flat(f, zf, col) {
        const pts = [];
        for (let i = 0; i < f.length; i += 2) pts.push(new THREE.Vector2(f[i], f[i + 1]));
        if (pts.length < 3) return;
        const tris = THREE.ShapeUtils.triangulateShape(pts, []);
        for (const [i, j, k] of tris) {
          const a = [pts[i].x, pts[i].y, zf(pts[i].x, pts[i].y)],
            b = [pts[j].x, pts[j].y, zf(pts[j].x, pts[j].y)],
            c = [pts[k].x, pts[k].y, zf(pts[k].x, pts[k].y)];
          const up = (b[0] - a[0]) * (c[1] - a[1]) - (b[1] - a[1]) * (c[0] - a[0]) > 0;
          if (up) K.tri(a, b, c, col);
          else K.tri(a, c, b, col);
        }
      },
      empty: () => !P.length,
      geo(colors = true) {
        const g = new THREE.BufferGeometry();
        g.setAttribute('position', new THREE.Float32BufferAttribute(P, 3));
        g.setAttribute('normal', new THREE.Float32BufferAttribute(N, 3));
        g.setAttribute('uv', new THREE.Float32BufferAttribute(U, 2));
        if (colors) g.setAttribute('color', new THREE.Float32BufferAttribute(C, 3));
        g.computeBoundingSphere();
        return g;
      },
    };
    return K;
  }
  // ---- the village's wall and roof buffers (attribute layout of world/village.js, as gebaeude/gebaeude.js) ----
  function wallBuf() {
    const A = { position: [], normal: [], aW: [], aV: [], aG: [], aD: [], aC: [], aTan: [] },
      I = [];
    return {
      // one quad of a facade a → b (outward to the right seen from above): its foot at za/zb, its top at zt (absolute heights); the
      // facade's u from ua to ub; at: style, colour, door (u, width – a gate in a hall)
      quad(ax, ay, bx, by, ua, ub, za, zb, zt, at) {
        const L2 = Math.hypot(bx - ax, by - ay);
        if (L2 < 0.05) return;
        const dx = (bx - ax) / L2,
          dy = (by - ay) / L2,
          z0 = Math.min(za, zb), // the facade's base line: the shader measures heights (plinth, gate) from here
          top = zt - z0,
          n = A.position.length / 3;
        for (const [x, y, u, z] of [
          [ax, ay, ua, za - 0.4],
          [ax, ay, ua, zt],
          [bx, by, ub, zb - 0.4],
          [bx, by, ub, zt],
        ]) {
          A.position.push(x, z, -y);
          A.normal.push(dy, 0, dx);
          A.aW.push(u, z - z0, top, at.w);
          A.aV.push(u, 0.5, top, at.st);
          A.aG.push(top, top, (ua + ub) / 2, top);
          A.aD.push(at.du === undefined ? -1 : at.du, at.dw || 0, 4.5, 0);
          A.aC.push(at.col[0], at.col[1], at.col[2], 0);
          A.aTan.push(dx, 0, -dy);
        }
        I.push(n, n + 2, n + 3, n, n + 3, n + 1);
      },
      empty: () => !I.length,
      geo() {
        const g = new THREE.BufferGeometry();
        for (const [k, a] of Object.entries(A))
          g.setAttribute(
            k,
            new THREE.Float32BufferAttribute(a, k === 'position' || k === 'normal' || k === 'aTan' ? 3 : 4)
          );
        g.setIndex(I);
        g.computeBoundingSphere();
        return g;
      },
    };
  }
  function roofBuf() {
    const pos = [],
      nrm = [],
      uv = [],
      rk = [],
      tan = [];
    const R = {
      // a triangle facing n (model axes); k: [kind, r, g, b] of the roof shader (4 flat, 2 sheet, 16 plaster, 18 cap)
      tri(a, b, c, n, k, tg = [1, 0]) {
        const cr =
          ((b[1] - a[1]) * (c[2] - a[2]) - (b[2] - a[2]) * (c[1] - a[1])) * n[0] +
          ((b[2] - a[2]) * (c[0] - a[0]) - (b[0] - a[0]) * (c[2] - a[2])) * n[1] +
          ((b[0] - a[0]) * (c[1] - a[1]) - (b[1] - a[1]) * (c[0] - a[0])) * n[2];
        for (const p of cr < 0 ? [a, c, b] : [a, b, c]) {
          pos.push(p[0], p[2], -p[1]);
          nrm.push(n[0], n[2], -n[1]);
          uv.push(p[0] * tg[0] + p[1] * tg[1], Math.abs(n[2]) > 0.7 ? -p[0] * tg[1] + p[1] * tg[0] : p[2]);
          rk.push(k[0], k[1], k[2], k[3]);
          tan.push(tg[0], 0, -tg[1]);
        }
      },
      quad(a, b, c, d, n, k, tg) {
        R.tri(a, b, c, n, k, tg);
        R.tri(a, c, d, n, k, tg);
      },
      empty: () => !pos.length,
      geo() {
        const g = new THREE.BufferGeometry();
        g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
        g.setAttribute('normal', new THREE.Float32BufferAttribute(nrm, 3));
        g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
        g.setAttribute('aR', new THREE.Float32BufferAttribute(rk, 4));
        g.setAttribute('aTan', new THREE.Float32BufferAttribute(tan, 3));
        g.computeBoundingSphere();
        return g;
      },
    };
    return R;
  }
  // ---- small helpers ----
  const ring = f => {
    const r = [];
    for (let i = 0; i < f.length; i += 2) r.push([f[i], f[i + 1]]);
    return r;
  };
  const inPoly = (f, x, y) => {
    let c = false;
    for (let p = 0, q = f.length - 2; p < f.length; q = p, p += 2) {
      const xi = f[p],
        yi = f[p + 1],
        xj = f[q],
        yj = f[q + 1];
      if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) c = !c;
    }
    return c;
  };
  const edgeDist = (f, x, y) => {
    let d = 1e9;
    for (let p = 0, q = f.length - 2; p < f.length; q = p, p += 2) {
      const ax = f[q],
        ay = f[q + 1],
        dx = f[p] - ax,
        dy = f[p + 1] - ay,
        l2 = dx * dx + dy * dy || 1,
        t = Math.max(0, Math.min(1, ((x - ax) * dx + (y - ay) * dy) / l2));
      d = Math.min(d, Math.hypot(x - ax - dx * t, y - ay - dy * t));
    }
    return d;
  };
  const bbOf = f => {
    let x0 = 1e9,
      y0 = 1e9,
      x1 = -1e9,
      y1 = -1e9;
    for (let i = 0; i < f.length; i += 2) {
      x0 = Math.min(x0, f[i]);
      x1 = Math.max(x1, f[i]);
      y0 = Math.min(y0, f[i + 1]);
      y1 = Math.max(y1, f[i + 1]);
    }
    return [x0, y0, x1, y1];
  };
  const centroid = f => {
    let x = 0,
      y = 0;
    const n = f.length / 2;
    for (let i = 0; i < f.length; i += 2) {
      x += f[i] / n;
      y += f[i + 1] / n;
    }
    return [x, y];
  };
  // Sutherland–Hodgman: the polygon f (x, y pairs) cut to the convex rectangle [x0, y0, x1, y1]
  function clipRect(f, r) {
    let pts = ring(f);
    const edges = [
      [p => p[0] >= r[0], (a, b) => [r[0], a[1] + ((b[1] - a[1]) * (r[0] - a[0])) / (b[0] - a[0])]],
      [p => p[0] <= r[2], (a, b) => [r[2], a[1] + ((b[1] - a[1]) * (r[2] - a[0])) / (b[0] - a[0])]],
      [p => p[1] >= r[1], (a, b) => [a[0] + ((b[0] - a[0]) * (r[1] - a[1])) / (b[1] - a[1]), r[1]]],
      [p => p[1] <= r[3], (a, b) => [a[0] + ((b[0] - a[0]) * (r[3] - a[1])) / (b[1] - a[1]), r[3]]],
    ];
    for (const [ins, cut] of edges) {
      const out = [];
      for (let i = 0; i < pts.length; i++) {
        const a = pts[(i + pts.length - 1) % pts.length],
          b = pts[i];
        if (ins(b)) {
          if (!ins(a)) out.push(cut(a, b));
          out.push(b);
        } else if (ins(a)) out.push(cut(a, b));
      }
      pts = out;
      if (pts.length < 3) return [];
    }
    return pts;
  }
  // ---- materials ----
  let MAT = null;
  function mats() {
    if (MAT) return MAT;
    const wm = RATSCHER.bld && RATSCHER.bld[0] && RATSCHER.bld[0].material,
      rm = VILLAGE.meshes && VILLAGE.meshes[0] && VILLAGE.meshes[0].material;
    if (!wm || !rm || !VPROPS.mat || !VPROPS.mat.pave) return null;
    // the paint on the ground: the program of the road paint (feat/strassen) and of the village's painted things
    const paint = new THREE.MeshStandardMaterial({
      vertexColors: true,
      roughness: 0.75,
      metalness: 0,
      polygonOffset: true,
      polygonOffsetFactor: -3,
      polygonOffsetUnits: -3,
    });
    // the asphalt: the village's paving program (world/village_props.js texMat, tile 1.3 m) with the asphalt photo texture
    let asph = null;
    const tA = TEXMAN.asphalt ? texFile(texFileOf('asphalt', 'col'), true).tex : null;
    if (tA) {
      asph = new THREE.MeshStandardMaterial({
        vertexColors: true,
        roughness: 0.9,
        envMapIntensity: 0.6,
        polygonOffset: true,
        polygonOffsetFactor: -2,
        polygonOffsetUnits: -2,
      });
      asph.defines = { USE_UV: '' };
      asph.onBeforeCompile = sh => {
        sh.uniforms.tKit = { value: tA };
        sh.fragmentShader =
          'uniform sampler2D tKit;\n' +
          sh.fragmentShader.replace(
            '#include <map_fragment>',
            `#include <map_fragment>
      diffuseColor.rgb *= texture2D( tKit, vUv * ${(1 / 1.3).toFixed(4)} ).rgb / max( textureLod( tKit, vec2( 0.5 ), 12.0 ).rgb, vec3( 0.01 ) );`
          );
      };
      asph.customProgramCacheKey = () => 'v16e-kit1.3';
    }
    MAT = { wall: wm, roof: rm, dm: DMOD.mat, paint, asph: asph || paint, pave: VPROPS.mat.pave };
    return MAT;
  }
  // the lit windows: the program of the lamps' glass (world/village_props.js, feat/strassen), one material per shop
  const glassMat = () =>
    new THREE.MeshStandardMaterial({
      color: 0x1d2226,
      roughness: 0.15,
      metalness: 0,
      envMapIntensity: 0.9,
      emissive: 0xfff0d8,
      emissiveIntensity: 0,
    });
  // ---- the letters: one canvas atlas per group, every sign a cell of its own (band colour, the text in a plain sans-serif) ----
  const FONT = '"Helvetica Neue", Helvetica, Arial, "Liberation Sans", "DejaVu Sans", sans-serif';
  function atlas(items) {
    const W = 2048,
      PX = 56; // pixels per metre of sign height (letters stay sharp up close, the atlas small)
    let x = 0,
      y = 0,
      rowH = 0;
    for (const it of items) {
      it.pw = Math.min(W - 4, Math.max(16, Math.round(it.w * PX * (it.k === 'board' || it.k === 'plate' ? 1.6 : 1))));
      it.ph = Math.max(12, Math.round(it.h * PX * (it.k === 'board' || it.k === 'plate' ? 1.6 : 1)));
      if (it.ph > 1024) {
        const k = 1024 / it.ph;
        it.ph = 1024;
        it.pw = Math.max(16, Math.round(it.pw * k));
      }
      if (x + it.pw > W) {
        x = 0;
        y += rowH + 2;
        rowH = 0;
      }
      it.px = x;
      it.py = y;
      x += it.pw + 2;
      rowH = Math.max(rowH, it.ph);
    }
    const H = Math.min(4096, THREE.MathUtils.ceilPowerOfTwo(Math.max(64, y + rowH)));
    const cv = document.createElement('canvas');
    cv.width = W;
    cv.height = H;
    const g = cv.getContext('2d');
    for (const it of items) {
      const [bg, fg] = ST[it.st] || ST[0];
      g.fillStyle = bg;
      g.fillRect(it.px, it.py, it.pw, it.ph);
      g.fillStyle = fg;
      g.textAlign = 'center';
      g.textBaseline = 'middle';
      const lines = it.lines;
      if (it.k === 'band' || it.k === 'pylon') {
        // one line, as large as the band allows
        let fs = Math.round(it.ph * 0.66);
        g.font = `bold ${fs}px ${FONT}`;
        const tw = g.measureText(lines[0]).width,
          room = it.pw - it.ph * 0.5;
        if (tw > room) {
          fs = Math.max(8, Math.floor((fs * room) / tw));
          g.font = `bold ${fs}px ${FONT}`;
        }
        g.fillText(lines[0], it.px + it.pw / 2, it.py + it.ph / 2 + fs * 0.04);
      } else {
        // several lines: a title, then the rest (a board, a plate with opening hours, the prices of a station)
        const n = lines.length,
          lh = it.ph / (n + 0.6);
        lines.forEach((t, i) => {
          let fs = Math.round(lh * (i === 0 ? 0.62 : 0.5));
          g.font = `${i === 0 ? 'bold ' : ''}${fs}px ${FONT}`;
          const tw = g.measureText(t).width;
          if (tw > it.pw * 0.92) {
            fs = Math.max(6, Math.floor((fs * it.pw * 0.92) / tw));
            g.font = `${i === 0 ? 'bold ' : ''}${fs}px ${FONT}`;
          }
          if (i === 0 && n > 1) {
            g.fillText(t, it.px + it.pw / 2, it.py + lh * 0.8);
            g.fillRect(it.px + it.pw * 0.06, it.py + lh * 1.3, it.pw * 0.88, Math.max(1, lh * 0.04));
          } else g.fillText(t, it.px + it.pw / 2, it.py + lh * (i + 1.05));
        });
      }
      // a thin frame
      g.strokeStyle = fg;
      g.globalAlpha = 0.35;
      g.lineWidth = Math.max(1, it.ph * 0.02);
      g.strokeRect(it.px + 1, it.py + 1, it.pw - 2, it.ph - 2);
      g.globalAlpha = 1;
    }
    const tex = new THREE.CanvasTexture(cv);
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.anisotropy = 4;
    // the faces: each sign a quad facing (nx, ny), centred at (x, y), its lower edge at z
    const pos = [],
      nrm = [],
      uv = [],
      idx = [];
    for (const it of items) {
      const n = pos.length / 3,
        tx = -it.ny,
        ty = it.nx,
        u0 = it.px / W,
        u1 = (it.px + it.pw) / W,
        v0 = 1 - (it.py + it.ph) / H,
        v1 = 1 - it.py / H;
      for (const [s, v, uu, vv] of [
        [-1, 0, u0, v0],
        [1, 0, u1, v0],
        [1, 1, u1, v1],
        [-1, 1, u0, v1],
      ]) {
        const x = it.x + tx * s * (it.w / 2),
          y = it.y + ty * s * (it.w / 2);
        pos.push(x, it.z + v * it.h, -y);
        nrm.push(it.nx, 0, -it.ny);
        uv.push(uu, vv);
      }
      idx.push(n, n + 1, n + 2, n, n + 2, n + 3);
    }
    const gg = new THREE.BufferGeometry();
    gg.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    gg.setAttribute('normal', new THREE.Float32BufferAttribute(nrm, 3));
    gg.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
    gg.setIndex(idx);
    gg.computeBoundingSphere();
    // the town's signs' program (welt/schleusingen.js, feat/strassen sign faces): a standard material with a map
    const m = new THREE.MeshStandardMaterial({ map: tex, roughness: 0.7, metalness: 0 });
    return { geo: gg, mat: m, tex, W, H };
  }
  // ---- data ----
  function load() {
    S.state = 'lädt';
    fetch(BASE + 'laeden/laeden.json')
      .then(r => (r.ok ? r.json() : r.status === 404 ? 404 : Promise.reject(new Error('HTTP ' + r.status))))
      .then(j => {
        if (j === 404) {
          S.state = 'fehlt';
          unskip();
          return;
        }
        S.data = j;
        S.state = 'da';
        prepData(j);
        // cells of gebaeude/gebaeude.js built before the list was in force: set them down again (they leave the shops out then)
        unskip(true);
      })
      .catch(e => {
        S.state = 'idle';
        S.err = String(e);
        S.retry = performance.now() + 20000;
      });
  }
  // the ETHOS cells already built near the shops: built again (gebaeude/gebaeude.js re-seats a cell whose probe is off)
  function unskip() {
    if (!GEB || !GEB.Z || !GEB.Z.cells) return;
    for (const c of GEB.Z.cells.values())
      if (c.meshes && c.meshes.length && c.data && c.data.b.some(b => typeof b.id === 'string' && SKIP_ETHOS.has(b.id)))
        c.probe = [[c.data.b[0].cx || 0, c.data.b[0].cy || 0, -1e6]];
  }
  function prepData(j) {
    for (const sh of j.shops) {
      sh.week = parseOH(sh.oh);
      sh.c = centroid(sh.parts[0].f);
      for (const d of sh.doors) d.week = d.oh ? parseOH(d.oh) : sh.week;
    }
    for (const g of GROUPS) {
      g.shops = j.shops.filter(sh => nearestGroup(sh.c) === g);
      g.lots = j.lots.filter(l => g.shops.some(sh => sh.id === l.shop));
      g.props = j.props.filter(p => g.shops.some(sh => sh.id === p.shop));
      g.pads = j.pads.filter(p => g.shops.some(sh => p.shops.includes(sh.id)));
      g.houses = (j.houses || []).filter(h => nearestGroup([h.x, h.y]) === g);
      g.state = 'idle';
      g.meshes = [];
      g.near = [];
      g.segs = [];
      g.acts = [];
      g.lampsV = [];
      g.glass = [];
    }
    S.groups = GROUPS;
    // the names of the places (HUD): the car parks and the buildings
    if (!S.areas) {
      S.areas = true;
      for (const l of j.lots) {
        const sh = j.shops.find(q => q.id === l.shop);
        if (sh) KERN.area({ name: 'Parkplatz ' + sh.name + ', Schleusingen', poly: ring(l.f), prio: 32 });
      }
      for (const sh of j.shops)
        for (const p of sh.parts.concat(sh.annex))
          KERN.area({ name: sh.name + ', Schleusingen', poly: ring(p.f), prio: 33 });
    }
  }
  const nearestGroup = c => {
    let b = null,
      bd = 1e9;
    for (const g of GROUPS) {
      const d = Math.hypot(g.c[0] - c[0], g.c[1] - c[1]);
      if (d < bd) {
        bd = d;
        b = g;
      }
    }
    return b;
  };
  // ---- the ground: levelled under each shop and its car parks (one surface for pads that touch, fitted to the lower side of the raw
  // ground – the surface model has the buildings in it), blended into the raw ground over the pad's outer 5 m ----
  const BLEND = 5;
  async function groundOf(g) {
    let x0 = 1e9,
      y0 = 1e9,
      x1 = -1e9,
      y1 = -1e9;
    for (const p of g.pads) {
      const b = bbOf(p.f);
      x0 = Math.min(x0, b[0]);
      y0 = Math.min(y0, b[1]);
      x1 = Math.max(x1, b[2]);
      y1 = Math.max(y1, b[3]);
    }
    let raw = null;
    try {
      raw = await WELT.sampler(x0 - 10, y0 - 10, x1 + 10, y1 + 10);
      if (!raw || !raw.tiles) raw = null;
    } catch (e) {
      raw = null;
    }
    g.raw = raw;
    const rawAt = (x, y) => {
      const z = raw ? raw(x, y) : undefined;
      if (Number.isFinite(z)) return z;
      const k = KERN.terrain(x, y);
      return Number.isFinite(k) ? k : 0;
    };
    g.rawAt = rawAt;
    // buildings of the group (their surroundings are left out of the fit: the surface model rises over them)
    const foots = [];
    for (const sh of g.shops) for (const p of sh.parts.concat(sh.annex)) foots.push(p.f);
    const nearFoot = (x, y, m) => foots.some(f => inPoly(f, x, y) || edgeDist(f, x, y) < m);
    g.surf = [];
    for (const pad of g.pads) {
      const lots = g.lots.filter(l => pad.shops.includes(l.shop) || lotIn(l, pad));
      const pts = [];
      const add = (x, y) => {
        if (!inPoly(pad.f, x, y)) return;
        pts.push([x, y, rawAt(x, y)]);
      };
      for (const l of lots) {
        const b = bbOf(l.f);
        for (let x = b[0]; x <= b[2]; x += 4)
          for (let y = b[1]; y <= b[3]; y += 4) if (inPoly(l.f, x, y) && !nearFoot(x, y, 12)) add(x, y);
      }
      if (pts.length < 25) {
        // no car park of its own (the station): the ring between the building and the pad's edge
        const b = bbOf(pad.f);
        for (let x = b[0]; x <= b[2]; x += 3)
          for (let y = b[1]; y <= b[3]; y += 3) if (!nearFoot(x, y, 4) && edgeDist(pad.f, x, y) > 1) add(x, y);
      }
      const fit = fitSurface(pts, pad);
      g.surf.push(fit);
      pad.fit = fit;
    }
    // pads that overlap take one surface: the one of the larger fit (the shops of the Suhler Straße share their car parks)
    const pads = g.pads.map((pad, i) => {
      const fit = g.surf[i],
        bb = bbOf(pad.f);
      return {
        poly: pad.f,
        bb,
        fit,
        z: (x, y, r) => {
          const d = inPoly(pad.f, x, y) ? edgeDist(pad.f, x, y) : 0,
            w = d >= BLEND ? 1 : d <= 0 ? 0 : 0.5 - 0.5 * Math.cos((Math.PI * d) / BLEND),
            s = fit.at(x, y);
          return r + (s - r) * w;
        },
      };
    });
    g.padsW = pads;
    g.gz = (x, y) => {
      for (const p of pads)
        if (x > p.bb[0] && x < p.bb[2] && y > p.bb[1] && y < p.bb[3] && inPoly(p.poly, x, y))
          return p.z(x, y, rawAt(x, y));
      const z = KERN.ground(x, y);
      return Number.isFinite(z) ? z : rawAt(x, y);
    };
    WELT.setPads(
      'laeden:' + g.id,
      pads.map(p => ({ poly: p.poly, z: p.z }))
    );
  }
  const lotIn = (l, pad) => {
    const c = centroid(l.f);
    return inPoly(pad.f, c[0], c[1]);
  };
  // a plane through the lower side of the samples (the surface model has the buildings and the trees in it): least squares, then the
  // samples more than 0.4 m above it dropped and fitted again; the slope at most 2.5 % (a car park, not a hill)
  function fitSurface(pts, pad) {
    const c = centroid(pad.f),
      fz = q => [1, q[0] - c[0], q[1] - c[1]];
    if (pts.length < 3) {
      const z = pts.length ? pts.reduce((s, q) => s + q[2], 0) / pts.length : 0;
      return { at: () => z, z0: z, n: pts.length };
    }
    let P = pts.slice(),
      beta = null;
    for (let it = 0; it < 6; it++) {
      beta = lsq(
        P.map(fz),
        P.map(q => q[2])
      );
      if (!beta) break;
      const keep = P.filter(q => q[2] - dot(beta, fz(q)) < 0.4);
      if (keep.length < Math.max(12, pts.length * 0.3) || keep.length === P.length) break;
      P = keep;
    }
    if (!beta) {
      const z = Math.min(...pts.map(q => q[2]));
      return { at: () => z, z0: z, n: pts.length };
    }
    const gl = Math.hypot(beta[1], beta[2]);
    if (gl > 0.025) {
      // the slope limited: the plane kept through the middle of the samples it fits
      const mx = P.reduce((s, q) => s + q[0] - c[0], 0) / P.length,
        my = P.reduce((s, q) => s + q[1] - c[1], 0) / P.length,
        zm = beta[0] + beta[1] * mx + beta[2] * my;
      beta[1] *= 0.025 / gl;
      beta[2] *= 0.025 / gl;
      beta[0] = zm - beta[1] * mx - beta[2] * my;
    }
    return { at: (x, y) => dot(beta, fz([x, y])), z0: beta[0], n: P.length, beta };
  }
  const dot = (a, b) => a.reduce((s, v, i) => s + v * b[i], 0);
  // normal equations, Gauss elimination
  function lsq(A, z) {
    const n = A[0].length,
      M = [];
    for (let i = 0; i < n; i++) {
      M.push(new Array(n + 1).fill(0));
      for (let r = 0; r < A.length; r++) {
        for (let j = 0; j < n; j++) M[i][j] += A[r][i] * A[r][j];
        M[i][n] += A[r][i] * z[r];
      }
    }
    for (let i = 0; i < n; i++) {
      let p = i;
      for (let r = i + 1; r < n; r++) if (Math.abs(M[r][i]) > Math.abs(M[p][i])) p = r;
      if (Math.abs(M[p][i]) < 1e-9) return null;
      [M[i], M[p]] = [M[p], M[i]];
      for (let r = 0; r < n; r++) {
        if (r === i) continue;
        const k = M[r][i] / M[i][i];
        for (let j = i; j <= n; j++) M[r][j] -= k * M[i][j];
      }
    }
    return M.map((row, i) => row[n] / row[i]);
  }
  // ---- one group: the shops, their car parks, the props ----
  function build(g) {
    const M = mats();
    if (!M) throw new Error('village materials missing');
    const t0 = performance.now();
    const gz = g.gz;
    const WB = wallBuf(),
      RB = roofBuf(),
      KB = kit(), // the body: canopies, frames, fascia, pylons, the station – always while the group stands
      KN = kit(), // the small things – near only
      KA = kit(), // asphalt
      KP = kit(), // paving
      KL = kit(), // paint on the ground
      signs = [],
      segs = [],
      lamps = [],
      glassBy = new Map();
    const glassK = id => {
      if (!glassBy.has(id)) glassBy.set(id, kit());
      return glassBy.get(id);
    };
    // a wall segment for the walker and the cars
    const wallSeg = (ax, ay, bx, by) => segs.push([ax, ay, bx, by]);
    const boxSeg = (cx, cy, sx, sy, rot) => {
      const c = Math.cos(rot),
        s = Math.sin(rot),
        p = (x, y) => [cx + x * c - y * s, cy + x * s + y * c],
        q = [p(-sx / 2, -sy / 2), p(sx / 2, -sy / 2), p(sx / 2, sy / 2), p(-sx / 2, sy / 2)];
      for (let i = 0; i < 4; i++) wallSeg(q[i][0], q[i][1], q[(i + 1) % 4][0], q[(i + 1) % 4][1]);
    };
    let bid = 6000 + GROUPS.indexOf(g) * 300;
    for (const sh of g.shops) {
      try {
        shop(sh, g, { WB, RB, KB, KN, KA, KP, KL, signs, wallSeg, boxSeg, lamps, glassK, gz, bid: (bid += 20) });
      } catch (e) {
        console.warn('laeden', sh.id, e);
        S.err = sh.id + ': ' + e;
      }
    }
    for (const l of g.lots) {
      try {
        lot(l, g, { KN, KA, KL, boxSeg, lamps, gz });
      } catch (e) {
        console.warn('laeden lot', l.id, e);
        S.err = l.id + ': ' + e;
      }
    }
    for (const p of g.props) {
      try {
        prop(p, g, { KB, KN, signs, boxSeg, gz });
      } catch (e) {
        console.warn('laeden prop', p.t, e);
      }
    }
    for (const h of g.houses) {
      try {
        house(h, g, { KB, signs, gz });
      } catch (e) {
        console.warn('laeden house', h.id, e);
      }
    }
    // the meshes
    const add = (geo, mat, name, near) => {
      const m = new THREE.Mesh(geo, mat);
      m.name = 'laeden ' + g.id + ' ' + name;
      m.userData.noMerge = true;
      m.castShadow = false;
      m.receiveShadow = false;
      scene.add(m);
      g.meshes.push(m);
      if (near) g.near.push(m);
      return m;
    };
    if (!WB.empty()) add(WB.geo(), M.wall, 'wände');
    if (!RB.empty()) add(RB.geo(), M.roof, 'dächer');
    if (!KB.empty()) add(KB.geo(), M.dm, 'bau');
    if (!KN.empty()) add(KN.geo(), M.dm, 'dinge', true);
    if (!KA.empty()) add(KA.geo(), M.asph, 'asphalt').renderOrder = 0;
    if (!KP.empty()) add(KP.geo(), M.pave, 'pflaster');
    if (!KL.empty()) add(KL.geo(), M.paint, 'markierung', true).renderOrder = 1;
    for (const [id, K] of glassBy) {
      if (K.empty()) continue;
      const mat = glassMat(),
        m = add(K.geo(false), mat, 'glas ' + id);
      m.userData.own = true;
      g.glass.push({ id, mat, sh: g.shops.find(q => q.id === id) });
    }
    if (signs.length) {
      const A = atlas(signs),
        m = add(A.geo, A.mat, 'schrift');
      m.userData.own = true;
      m.userData.tex = A.tex;
      g.atlas = { W: A.W, H: A.H, n: signs.length, texts: signs.map(s => s.lines.join(' / ')) };
    }
    // lamps: the heads glow with the village's lamps (its glass material), light on the ground, the nearest light the facades
    if (lamps.length && VPROPS.glass) {
      const gH = new THREE.BoxGeometry(0.62, 0.06, 0.3),
        iG = new THREE.InstancedMesh(gH, VPROPS.glass, lamps.length),
        pm = VPROPS.pool ? VPROPS.pool.material : null,
        gP = new THREE.PlaneGeometry(1, 1).rotateX(-Math.PI / 2),
        iP = pm ? new THREE.InstancedMesh(gP, pm, lamps.length) : null,
        m4 = new THREE.Matrix4(),
        q = new THREE.Quaternion(),
        UP = new THREE.Vector3(0, 1, 0),
        one = new THREE.Vector3(1, 1, 1);
      lamps.forEach(([x, y, z, az], i) => {
        q.setFromAxisAngle(UP, az);
        m4.compose(new THREE.Vector3(x, z - 0.05, -y), q, one);
        iG.setMatrixAt(i, m4);
        if (iP) {
          m4.compose(new THREE.Vector3(x, gz(x, y) + 0.1, -y), q.identity(), new THREE.Vector3(14, 1, 14));
          iP.setMatrixAt(i, m4);
        }
        g.lampsV.push({ x, y, z: z - 0.3, str: true });
      });
      for (const im of [iG, iP]) {
        if (!im) continue;
        im.name = 'laeden ' + g.id + ' lampen';
        im.userData.noMerge = true;
        im.castShadow = false;
        im.receiveShadow = false;
        im.computeBoundingSphere();
        scene.add(im);
        g.meshes.push(im);
        g.near.push(im);
      }
      if (iP) {
        iP.renderOrder = 2;
        g.pool = iP;
      }
      if (VPROPS.lamps) VPROPS.lamps.push(...g.lampsV);
    }
    // collisions: the walls and the solid things, an 8 m hash (KERN.pushOut below)
    g.segs = segs;
    g.grid = new Map();
    segs.forEach((s, k) => {
      for (let i = Math.floor(Math.min(s[0], s[2]) / 8); i <= Math.floor(Math.max(s[0], s[2]) / 8); i++)
        for (let j = Math.floor(Math.min(s[1], s[3]) / 8); j <= Math.floor(Math.max(s[1], s[3]) / 8); j++) {
          const key = i + ',' + j;
          let a = g.grid.get(key);
          if (!a) g.grid.set(key, (a = []));
          a.push(k);
        }
    });
    // the doors: a label with the opening hours (the action button), going in is not part of it
    for (const sh of g.shops)
      sh.doors.forEach((d, i) => {
        if (d.k === 'liefer' || !d.who) return;
        const id = 'laeden:' + sh.id + ':' + i,
          z = gz(d.x + d.nx * 1.2, d.y + d.ny * 1.2);
        KERN.act({
          id,
          r: 3.2,
          prio: 1,
          pos: () => [d.x + d.nx * 1.2, d.y + d.ny * 1.2, z],
          label: () => doorLabel(sh, d),
          run: () => toast(doorText(sh, d), 5200),
        });
        g.acts.push(id);
      });
    g.tris = g.meshes.reduce(
      (n, m) => n + (m.geometry.index ? m.geometry.index.count : m.geometry.attributes.position.count) / 3,
      0
    );
    g.ms = Math.round(performance.now() - t0);
    g.state = 'built';
    S.segs = GROUPS.reduce((n, q) => n + (q.segs ? q.segs.length : 0), 0);
    snapCars(g);
    markDirty(true);
  }
  function drop(g) {
    for (const m of g.meshes) {
      scene.remove(m);
      if (m.isInstancedMesh) m.dispose();
      else m.geometry.dispose();
      if (m.userData.own) m.material.dispose();
      if (m.userData.tex) m.userData.tex.dispose();
    }
    g.meshes = [];
    g.near = [];
    g.glass = [];
    g.pool = null;
    g.segs = [];
    g.grid = null;
    for (const id of g.acts) KERN.unact(id);
    g.acts = [];
    if (VPROPS.lamps)
      for (const l of g.lampsV) {
        const i = VPROPS.lamps.indexOf(l);
        if (i >= 0) VPROPS.lamps.splice(i, 1);
      }
    g.lampsV = [];
    WELT.setPads('laeden:' + g.id, []);
    g.padsW = null;
    g.state = 'idle';
    S.segs = GROUPS.reduce((n, q) => n + (q.segs ? q.segs.length : 0), 0);
    markDirty(true);
  }
  // ---- the label at a door ----
  function doorLabel(sh, d) {
    const art = d.art || sh.art,
      who = d.who || sh.name,
      oh = d.oh || sh.oh,
      open = isOpen(d.week);
    return (
      who +
      ' – ' +
      art +
      (oh ? ' · ' + ohShort(oh) + (open === null ? '' : open ? ' · geöffnet' : ' · geschlossen') : '')
    );
  }
  function doorText(sh, d) {
    const who = d.who || sh.name,
      oh = d.oh || sh.oh,
      open = isOpen(d.week);
    if (!oh) return who + (sh.addr ? ', ' + sh.addr : '') + ' – Öffnungszeiten unbekannt. Hinein geht es noch nicht.';
    return (
      who +
      (open ? ' hat jetzt geöffnet' : ' hat jetzt geschlossen') +
      ' (' +
      ohShort(oh) +
      '). Hinein geht es noch nicht – das Innere fehlt.'
    );
  }
  S.doorLabel = (shopId, i) => {
    const sh = S.data && S.data.shops.find(q => q.id === shopId);
    return sh && sh.doors[i] ? doorLabel(sh, sh.doors[i]) : null;
  };
  // ---- one shop ----
  function shop(sh, g, B) {
    const { WB, RB, KB, KN, KP, signs, wallSeg, glassK, gz } = B;
    const col = WALL[sh.col] || WALL.hell;
    // the floor level: the ground at the main door (else the middle of the first part)
    const md = sh.doors.find(d => d.k === 'main') || sh.doors[0];
    const zF = md ? gz(md.x + md.nx * 0.5, md.y + md.ny * 0.5) : gz(sh.c[0], sh.c[1]);
    sh.zF = zF;
    const vols = sh.parts
      .map(p => ({ f: p.f, h: p.h, kind: 'teil', p }))
      .concat(sh.annex.map(a => ({ f: a.f, h: a.h, kind: 'anbau', p: a })));
    // the delivery gates go into the walls (the hall's gate of the village shader): which facade edge holds which door
    const gateAt = new Map();
    for (const d of sh.doors) {
      if (d.k !== 'liefer') continue;
      let best = null;
      vols.forEach((v, vi) => {
        const r = ring(v.f);
        for (let i = 0; i < r.length; i++) {
          const a = r[i],
            b = r[(i + 1) % r.length],
            L2 = Math.hypot(b[0] - a[0], b[1] - a[1]);
          if (L2 < d.w + 1) continue;
          const ux = (b[0] - a[0]) / L2,
            uy = (b[1] - a[1]) / L2,
            u = (d.x - a[0]) * ux + (d.y - a[1]) * uy,
            off = Math.abs((d.x - a[0]) * uy - (d.y - a[1]) * ux);
          if (u < d.w / 2 + 0.3 || u > L2 - d.w / 2 - 0.3 || off > 0.6) continue;
          if (!best || off < best.off) best = { key: vi + ':' + i, u, off };
        }
      });
      if (best && !gateAt.has(best.key)) gateAt.set(best.key, { u: best.u, w: d.w, d });
    }
    vols.forEach((v, vi) => {
      const r = ring(v.f),
        glassWalls = v.p.walls === 'glas',
        zt = zF + v.h;
      for (let i = 0; i < r.length; i++) {
        const a = r[i],
          b = r[(i + 1) % r.length],
          za = gz(a[0], a[1]),
          zb = gz(b[0], b[1]),
          L2 = Math.hypot(b[0] - a[0], b[1] - a[1]);
        if (L2 < 0.05) continue;
        const gate = gateAt.get(vi + ':' + i);
        if (glassWalls) glassFacade(KB, glassK(sh.id), a, b, Math.min(za, zb) - 0.3, zt - 0.05, GREEN_GL);
        else
          WB.quad(a[0], a[1], b[0], b[1], 0, L2, Math.min(za, zF), Math.min(zb, zF), zt, {
            w: 4 * (B.bid + vi) + 1,
            st: sh.col === 'putz' ? 0 : 10,
            col: v.kind === 'anbau' && !v.p.portal ? WALL.dunkel : col,
            du: gate ? gate.u : -1,
            dw: gate ? gate.w : 0,
          });
        wallSeg(a[0], a[1], b[0], b[1]);
        if (gate) {
          // the apron of the gate: bollards at its sides, a yellow-black bumper
          const ux = (b[0] - a[0]) / L2,
            uy = (b[1] - a[1]) / L2,
            nx = uy,
            ny = -ux,
            gx = a[0] + ux * gate.u,
            gy = a[1] + uy * gate.u,
            z = gz(gx + nx, gy + ny);
          for (const s of [-1, 1]) {
            const px = gx + ux * s * (gate.w / 2 + 0.45) + nx * 0.5,
              py = gy + uy * s * (gate.w / 2 + 0.45) + ny * 0.5;
            KN.cyl(px, py, z, z + 1.1, 0.09, 8, YEL);
            B.boxSeg(px, py, 0.2, 0.2, 0);
          }
        }
      }
      // the roof: flat behind an attica, or glass (the garden centre)
      roof(RB, KB, KN, v, zF, sh, g);
    });
    // the entrances: a glazed front with sliding doors and a canopy; a vestibule's front is glazed all over
    sh.doors.forEach(d => {
      if (d.k === 'liefer') return;
      entrance(sh, d, B, zF);
    });
    // the lettering
    for (const s of sh.signs) {
      const z = zF + s.z;
      // the band: a plate 0.12 m in front of the wall, the letters on it
      const tx = -s.ny,
        ty = s.nx;
      KB.box(s.x + s.nx * 0.07, s.y + s.ny * 0.07, z - 0.08, s.w + 0.16, 0.14, s.h + 0.16, Math.atan2(ty, tx), ANTH);
      signs.push({
        k: 'band',
        lines: [s.t],
        st: s.st,
        x: s.x + s.nx * 0.15,
        y: s.y + s.ny * 0.15,
        z,
        w: s.w,
        h: s.h,
        nx: s.nx,
        ny: s.ny,
      });
    }
    // annexes with a sign of their own (a portal, a tower): the name on each side that faces out, near the top
    for (const a of sh.annex) {
      if (!a.sign) continue;
      const r = ring(a.f);
      for (let i = 0; i < r.length; i++) {
        const p = r[i],
          q = r[(i + 1) % r.length],
          L2 = Math.hypot(q[0] - p[0], q[1] - p[1]);
        if (L2 < 2.5) continue;
        const nx = (q[1] - p[1]) / L2,
          ny = -(q[0] - p[0]) / L2,
          mx = (p[0] + q[0]) / 2,
          my = (p[1] + q[1]) / 2;
        // only sides that face away from the main building
        if (sh.parts.some(pt => inPoly(pt.f, mx + nx * 1.5, my + ny * 1.5))) continue;
        const h = Math.min(1.6, L2 * 0.32),
          w = Math.min(L2 - 0.4, a.sign.length * h * 0.66 + h * 0.6);
        signs.push({
          k: 'band',
          lines: [a.sign],
          st: 0,
          x: mx + nx * 0.06,
          y: my + ny * 0.06,
          z: zF + a.h - h - 0.7,
          w,
          h,
          nx,
          ny,
        });
      }
    }
    // the board of the shops in a centre, beside its main entrance
    if (sh.board) {
      const b = sh.board,
        z = zF + 0.9,
        tx = -b.ny,
        ty = b.nx,
        w = 1.5,
        h = 2.3,
        lines = [b.title].concat(b.names);
      KB.box(b.x + b.nx * 0.08, b.y + b.ny * 0.08, z - 0.9, w + 0.16, 0.12, h + 0.9 + 0.08, Math.atan2(ty, tx), ANTH);
      signs.push({ k: 'board', lines, st: 0, x: b.x + b.nx * 0.15, y: b.y + b.ny * 0.15, z, w, h, nx: b.nx, ny: b.ny });
    }
    // the station: the canopy over the pumps, the islands, the pumps
    if (sh.fuel) station(sh, g, B, zF);
    // the drive-in: the lane on asphalt with its edges, the order post, the windows on the driver's side
    if (sh.drive) drive(sh, g, B, zF);
    // the paving in front of the main entrances (3.5 m deep, the width of the front and a little more)
    for (const d of sh.doors) {
      if (d.k !== 'main') continue;
      const tx = -d.ny,
        ty = d.nx,
        hw = d.front / 2 + 1.5,
        dep = 3.5,
        f = [
          d.x + tx * hw + d.nx * 0.05,
          d.y + ty * hw + d.ny * 0.05,
          d.x + tx * hw + d.nx * dep,
          d.y + ty * hw + d.ny * dep,
          d.x - tx * hw + d.nx * dep,
          d.y - ty * hw + d.ny * dep,
          d.x - tx * hw + d.nx * 0.05,
          d.y - ty * hw + d.ny * 0.05,
        ];
      groundPoly(KP, f, gz, PAVE, 0.05, 1.5);
    }
  }
  // a glass wall: panes between mullions every ~1.4 m (the garden centre's cold house), the glass lit like the shop's windows
  function glassFacade(KB, KG, a, b, z0, z1, tint) {
    const L2 = Math.hypot(b[0] - a[0], b[1] - a[1]),
      n = Math.max(1, Math.round(L2 / 1.4)),
      ux = (b[0] - a[0]) / L2,
      uy = (b[1] - a[1]) / L2;
    KG.quad([a[0], a[1], z0], [b[0], b[1], z0], [b[0], b[1], z1], [a[0], a[1], z1], tint);
    for (let k = 0; k <= n; k++) {
      const x = a[0] + (ux * (k * L2)) / n,
        y = a[1] + (uy * (k * L2)) / n;
      KB.box(x + uy * 0.03, y - ux * 0.03, z0, 0.08, 0.08, z1 - z0, Math.atan2(uy, ux), WHITE_);
    }
    KB.bar(a[0] + uy * 0.03, a[1] - ux * 0.03, b[0] + uy * 0.03, b[1] - ux * 0.03, 0.08, z0 + 0.5, z0 + 0.58, WHITE_);
    KB.bar(a[0] + uy * 0.03, a[1] - ux * 0.03, b[0] + uy * 0.03, b[1] - ux * 0.03, 0.1, z1 - 0.1, z1, WHITE_);
  }
  // ---- roofs: flat with an attica (the parapet's inner face and its cap), solar panels and roof units on the big ones; glass roofs ----
  function roof(RB, KB, KN, v, zF, sh, g) {
    const f = v.f,
      zt = zF + v.h,
      glassRoof = v.p.roof === 'glas';
    if (glassRoof) {
      // a glass roof: two pitches along the long side in light green glass with white bars (the garden centre)
      const zr = zt + 0.05;
      KB.flat(f, () => zr, GREEN_GL);
      const r = ring(f);
      for (let i = 0; i < r.length; i++) {
        const a = r[i],
          b = r[(i + 1) % r.length];
        KB.bar(a[0], a[1], b[0], b[1], 0.12, zr - 0.15, zr + 0.06, WHITE_);
      }
      // bars across every 1.5 m (along the bounding box's long axis)
      const bb = bbOf(f),
        alongX = bb[2] - bb[0] > bb[3] - bb[1];
      for (let s = (alongX ? bb[0] : bb[1]) + 1.5; s < (alongX ? bb[2] : bb[3]); s += 1.5) {
        const pts = [];
        for (let i = 0; i < r.length; i++) {
          const a = r[i],
            b = r[(i + 1) % r.length],
            av = alongX ? a[0] : a[1],
            bv = alongX ? b[0] : b[1];
          if ((av - s) * (bv - s) < 0) {
            const t = (s - av) / (bv - av);
            pts.push([a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t]);
          }
        }
        if (pts.length >= 2) KN.bar(pts[0][0], pts[0][1], pts[1][0], pts[1][1], 0.06, zr, zr + 0.05, WHITE_);
      }
      return;
    }
    const zr = zt - 0.55, // the roof membrane behind the attica
      gc = [0.36, 0.36, 0.35];
    // the membrane
    const pts = [];
    for (let i = 0; i < f.length; i += 2) pts.push(new THREE.Vector2(f[i], f[i + 1]));
    const tris = THREE.ShapeUtils.triangulateShape(pts, []);
    for (const [i, j, k] of tris)
      RB.tri(
        [pts[i].x, pts[i].y, zr],
        [pts[j].x, pts[j].y, zr],
        [pts[k].x, pts[k].y, zr],
        [0, 0, 1],
        [4, gc[0], gc[1], gc[2]]
      );
    // the attica: inner face from the membrane up, the cap on top (0.3 m), outer face is the wall
    const r = ring(f);
    for (let i = 0; i < r.length; i++) {
      const a = r[i],
        b = r[(i + 1) % r.length],
        L2 = Math.hypot(b[0] - a[0], b[1] - a[1]);
      if (L2 < 0.05) continue;
      const ux = (b[0] - a[0]) / L2,
        uy = (b[1] - a[1]) / L2,
        nx = uy,
        ny = -ux, // outward
        ix = -nx * 0.3,
        iy = -ny * 0.3;
      RB.quad(
        [b[0] + ix, b[1] + iy, zr],
        [a[0] + ix, a[1] + iy, zr],
        [a[0] + ix, a[1] + iy, zt],
        [b[0] + ix, b[1] + iy, zt],
        [-nx, -ny, 0],
        [16, 0, 0, 0],
        [ux, uy]
      );
      RB.quad(
        [a[0], a[1], zt],
        [b[0], b[1], zt],
        [b[0] + ix, b[1] + iy, zt],
        [a[0] + ix, a[1] + iy, zt],
        [0, 0, 1],
        [18, 0, 0, 0],
        [ux, uy]
      );
      // the cap's outer lip over the wall
      RB.quad(
        [a[0] + nx * 0.04, a[1] + ny * 0.04, zt - 0.12],
        [b[0] + nx * 0.04, b[1] + ny * 0.04, zt - 0.12],
        [b[0] + nx * 0.04, b[1] + ny * 0.04, zt + 0.02],
        [a[0] + nx * 0.04, a[1] + ny * 0.04, zt + 0.02],
        [nx, ny, 0],
        [18, 0, 0, 0],
        [ux, uy]
      );
    }
    // solar panels on big roofs (the orthophoto shows them on OBI, Mega Center, EDEKA) and a few roof units
    const A = Math.abs(area(f));
    if (A > 1200 && v.kind === 'teil') {
      // rows across the longest edge, 2.2 m deep, 1.1 m apart, 2 m from the edges
      let lb = 0,
        ang = 0;
      for (let i = 0; i < r.length; i++) {
        const a = r[i],
          b = r[(i + 1) % r.length],
          L2 = Math.hypot(b[0] - a[0], b[1] - a[1]);
        if (L2 > lb) {
          lb = L2;
          ang = Math.atan2(b[1] - a[1], b[0] - a[0]);
        }
      }
      const c = Math.cos(ang),
        s = Math.sin(ang),
        toL = (x, y) => [x * c + y * s, -x * s + y * c],
        toW = (u, w) => [u * c - w * s, u * s + w * c];
      const loc = r.map(p => toL(p[0], p[1])),
        u0 = Math.min(...loc.map(p => p[0])),
        u1 = Math.max(...loc.map(p => p[0])),
        w0 = Math.min(...loc.map(p => p[1])),
        w1 = Math.max(...loc.map(p => p[1]));
      const inside = (u, w) => {
        const [x, y] = toW(u, w);
        return inPoly(f, x, y) && edgeDist(f, x, y) > 2.2;
      };
      for (let w = w0 + 3; w + 2.2 < w1 - 2; w += 3.3) {
        // the row as runs between the edges (a concave roof gives several)
        let run = null;
        const flush = () => {
          if (!run || run[1] - run[0] < 3) return;
          const [ax, ay] = toW(run[0], w),
            [bx, by] = toW(run[1], w),
            [cx2, cy2] = toW(run[1], w + 2.2),
            [dx2, dy2] = toW(run[0], w + 2.2),
            zl = zr + 0.25,
            zh = zr + 0.75;
          KN.quad([ax, ay, zl], [bx, by, zl], [cx2, cy2, zh], [dx2, dy2, zh], PV);
          KN.quad([dx2, dy2, zh], [cx2, cy2, zh], [cx2, cy2, zr + 0.05], [dx2, dy2, zr + 0.05], PVF);
        };
        for (let u = u0 + 1; u < u1 - 1; u += 1) {
          const ok = inside(u, w) && inside(u, w + 2.2);
          if (ok && !run) run = [u, u];
          else if (ok) run[1] = u;
          else {
            flush();
            run = null;
          }
        }
        flush();
      }
      // roof units: a few grey boxes
      const [cx, cy] = centroid(f);
      for (let k = 0; k < 3; k++) {
        const ox = (hh(g.c[0] + k * 7.1) - 0.5) * 18,
          oy = (hh(g.c[1] + k * 3.3) - 0.5) * 18;
        if (inPoly(f, cx + ox, cy + oy)) KN.box(cx + ox, cy + oy, zr, 3.2, 2.0, 1.6, ang, LIGHT);
      }
    }
  }
  const area = f => {
    let a = 0;
    for (let i = 0; i < f.length; i += 2) {
      const j = (i + 2) % f.length;
      a += f[i] * f[j + 1] - f[j] * f[i + 1];
    }
    return a / 2;
  };
  // ---- an entrance: glazed front (shop windows each side of the doors), sliding doors, transom, a canopy with a fascia; a plate with
  // the opening hours beside it ----
  function entrance(sh, d, B, zF) {
    const { KB, signs, glassK, gz } = B;
    const KG = glassK(sh.id);
    const main = d.k === 'main',
      tx = -d.ny,
      ty = d.nx,
      rot = Math.atan2(ty, tx);
    // the face the door is on: how wide the front may be (the wall's length around the door)
    const facade = faceAt(sh, d),
      room = facade ? Math.min(facade.u, facade.L - facade.u) * 2 - 0.4 : d.w + 2,
      front = Math.max(d.w + 0.4, Math.min(main ? d.w + 7 : d.w + 1.2, room)),
      zd = gz(d.x + d.nx * 0.6, d.y + d.ny * 0.6),
      z0 = Math.min(zF, zd),
      hG = main ? 3.1 : 2.6, // the glazing's top
      hD = 2.35; // the doors' height
    d.front = front;
    const o = 0.04, // in front of the wall
      P = (u, z, off = o) => [d.x + tx * u + d.nx * off, d.y + ty * u + d.ny * off, z];
    // the glass: one pane over the whole front (the frames go on top of it)
    KG.quad(P(-front / 2, z0), P(front / 2, z0), P(front / 2, z0 + hG), P(-front / 2, z0 + hG), [1, 1, 1]);
    // frames: posts every ~1.5 m and at the door's edges, the sill, the transom over the doors, the head
    const posts = new Set([-front / 2, front / 2, -d.w / 2, d.w / 2]);
    const nb = Math.max(0, Math.floor((front - d.w) / 2 / 1.5));
    for (let k = 1; k <= nb; k++) {
      const s = d.w / 2 + ((front - d.w) / 2 / (nb + 1)) * k;
      posts.add(s);
      posts.add(-s);
    }
    for (const u of posts)
      KB.box(d.x + tx * u + d.nx * (o + 0.04), d.y + ty * u + d.ny * (o + 0.04), z0, 0.09, 0.1, hG, rot, ANTH);
    KB.box(d.x + d.nx * (o + 0.05), d.y + d.ny * (o + 0.05), z0 + hG - 0.12, front, 0.12, 0.14, rot, ANTH);
    KB.box(d.x + d.nx * (o + 0.05), d.y + d.ny * (o + 0.05), z0 + hD, d.w, 0.14, 0.12, rot, ANTH);
    // the plinth of the shop windows (not under the doors)
    for (const sgn of [-1, 1]) {
      const a = d.w / 2,
        b = front / 2;
      if (b - a < 0.2) continue;
      const m = (a + b) / 2;
      KB.box(
        d.x + tx * sgn * m + d.nx * (o + 0.05),
        d.y + ty * sgn * m + d.ny * (o + 0.05),
        z0,
        b - a,
        0.12,
        0.35,
        rot,
        ANTH
      );
    }
    // the sliding doors: two leaves with a frame each, a little apart (the gap shows the light inside at night)
    for (const sgn of [-1, 1]) {
      const cu = (sgn * d.w) / 4;
      for (const [du, wz] of [
        [-d.w / 4 + 0.03, 0],
        [d.w / 4 - 0.03, 0],
      ])
        KB.box(
          d.x + tx * (cu + du) + d.nx * (o + 0.09),
          d.y + ty * (cu + du) + d.ny * (o + 0.09),
          z0 + wz,
          0.06,
          0.05,
          hD,
          rot,
          GREYM
        );
      KB.box(
        d.x + tx * cu + d.nx * (o + 0.09),
        d.y + ty * cu + d.ny * (o + 0.09),
        z0 + hD - 0.07,
        d.w / 2 - 0.06,
        0.05,
        0.07,
        rot,
        GREYM
      );
      KB.box(
        d.x + tx * cu + d.nx * (o + 0.09),
        d.y + ty * cu + d.ny * (o + 0.09),
        z0,
        d.w / 2 - 0.06,
        0.05,
        0.08,
        rot,
        GREYM
      );
    }
    // the canopy: 2.6 m deep at the main door (1.2 m at a side door), its fascia band, light underneath
    const cd = main ? 2.6 : 1.2,
      cw = front + (main ? 1.2 : 0.4),
      zc = z0 + hG + 0.25;
    KB.box(d.x + d.nx * (cd / 2 + 0.05), d.y + d.ny * (cd / 2 + 0.05), zc, cw, cd, 0.08, rot, LIGHT);
    KB.box(d.x + d.nx * (cd / 2 + 0.05), d.y + d.ny * (cd / 2 + 0.05), zc + 0.08, cw, cd, 0.24, rot, ANTH);
    // the plate with the opening hours, on the wall beside the doors (right of them, seen from outside)
    const oh = d.oh || sh.oh;
    if (main && oh && front - d.w > 1.4) {
      const u = -(d.w / 2 + Math.min(0.9, (front - d.w) / 4)),
        lines = [d.who || sh.name, 'Öffnungszeiten'].concat(
          oh
            .split(';')
            .map(r => r.trim())
            .filter(Boolean)
            .map(
              r =>
                ohShort(r) ||
                r.replace(/\b(Mo|Tu|We|Th|Fr|Sa|Su|PH)\b/g, q => DE[q]).replace(/off|closed/, 'geschlossen')
            )
        );
      signs.push({
        k: 'plate',
        lines,
        st: 3,
        x: d.x + tx * u + d.nx * (o + 0.06),
        y: d.y + ty * u + d.ny * (o + 0.06),
        z: z0 + 1.15,
        w: 0.5,
        h: 0.62,
        nx: d.nx,
        ny: d.ny,
      });
    }
    // the way in stays free: the walker meets the glass (a wall), the cars the posts of the canopy (none: it is cantilevered)
  }
  // the facade of the shop a door lies on: its length and the door's u along it
  function faceAt(sh, d) {
    let best = null;
    for (const p of sh.parts.concat(sh.annex)) {
      const r = ring(p.f);
      for (let i = 0; i < r.length; i++) {
        const a = r[i],
          b = r[(i + 1) % r.length],
          L2 = Math.hypot(b[0] - a[0], b[1] - a[1]);
        if (L2 < 0.5) continue;
        const ux = (b[0] - a[0]) / L2,
          uy = (b[1] - a[1]) / L2,
          u = (d.x - a[0]) * ux + (d.y - a[1]) * uy,
          off = Math.abs((d.x - a[0]) * uy - (d.y - a[1]) * ux);
        if (u < -0.2 || u > L2 + 0.2 || off > 0.3) continue;
        if (!best || off < best.off) best = { u, L: L2, off };
      }
    }
    return best;
  }
  // ---- a polygon on the ground (asphalt, paving, paint): cut into cells of `cell` m that follow the ground, `lift` above it ----
  function groundPoly(K, f, gz, col, lift, cell = 2.5) {
    const bb = bbOf(f);
    for (let x = Math.floor(bb[0] / cell) * cell; x < bb[2]; x += cell)
      for (let y = Math.floor(bb[1] / cell) * cell; y < bb[3]; y += cell) {
        const pts = clipRect(f, [x, y, x + cell, y + cell]);
        if (pts.length < 3) continue;
        const flatp = [];
        for (const p of pts) flatp.push(p[0], p[1]);
        if (Math.abs(area(flatp)) < 1e-3) continue;
        K.flat(flatp, (px, py) => gz(px, py) + lift, col);
      }
  }
  // ---- a car park: asphalt, kerbs along its edges (not where an aisle or a road runs out), the bays' lines, trolley shelters, lamps ----
  function lot(l, g, B) {
    const { KN, KA, KL, boxSeg, lamps, gz } = B;
    groundPoly(KA, l.f, gz, ASPH, 0.04, 3);
    // kerbs: along the edges, broken where an aisle leaves the car park (6 m)
    const r = ring(l.f),
      exits = [];
    for (const a of l.aisles) {
      const pr = ring(a);
      for (const p of [pr[0], pr[pr.length - 1]]) exits.push(p);
      // where an aisle crosses the edge
      for (let i = 0; i + 1 < pr.length; i++)
        for (let k = 0; k < r.length; k++) {
          const X = segX(pr[i], pr[i + 1], r[k], r[(k + 1) % r.length]);
          if (X) exits.push(X);
        }
    }
    for (let k = 0; k < r.length; k++) {
      const a = r[k],
        b = r[(k + 1) % r.length],
        L2 = Math.hypot(b[0] - a[0], b[1] - a[1]),
        n = Math.max(1, Math.round(L2 / 2));
      for (let i = 0; i < n; i++) {
        const t0 = i / n,
          t1 = (i + 1) / n,
          p0 = [a[0] + (b[0] - a[0]) * t0, a[1] + (b[1] - a[1]) * t0],
          p1 = [a[0] + (b[0] - a[0]) * t1, a[1] + (b[1] - a[1]) * t1],
          m = [(p0[0] + p1[0]) / 2, (p0[1] + p1[1]) / 2];
        if (exits.some(e => Math.hypot(e[0] - m[0], e[1] - m[1]) < 4.5)) continue;
        if (g.shops.some(sh => sh.parts.concat(sh.annex).some(p => edgeDist(p.f, m[0], m[1]) < 1.2))) continue;
        const z0 = gz(p0[0], p0[1]),
          z1 = gz(p1[0], p1[1]);
        KN.bar(p0[0], p0[1], p1[0], p1[1], 0.16, -0.05, 0.12, KERB, z0, z1);
      }
    }
    // the bays: a line along each long side and across the back, 0.12 m wide; shared lines once
    const seen = new Set(),
      line = (ax, ay, bx, by) => {
        const key = [Math.round(ax * 4), Math.round(ay * 4), Math.round(bx * 4), Math.round(by * 4)],
          k2 =
            key[0] < key[2] || (key[0] === key[2] && key[1] < key[3])
              ? key.join(',')
              : [key[2], key[3], key[0], key[1]].join(',');
        if (seen.has(k2)) return;
        seen.add(k2);
        const L2 = Math.hypot(bx - ax, by - ay),
          ux = ((bx - ax) / L2) * 0.06,
          uy = ((by - ay) / L2) * 0.06;
        const za = gz(ax, ay) + 0.06,
          zb = gz(bx, by) + 0.06;
        KL.quadUp(
          [ax + uy, ay - ux, za],
          [bx + uy, by - ux, zb],
          [bx - uy, by + ux, zb],
          [ax - uy, ay + ux, za],
          PAINT
        );
      };
    for (const [bx, by, az] of l.bays) {
      const a = (az * Math.PI) / 180,
        vx = Math.sin(a),
        vy = Math.cos(a),
        ux = vy,
        uy = -vx,
        c = (su, sv) => [bx + ux * su * 1.25 + vx * sv * 2.5, by + uy * su * 1.25 + vy * sv * 2.5],
        p00 = c(-1, -1),
        p10 = c(1, -1),
        p11 = c(1, 1),
        p01 = c(-1, 1);
      line(p00[0], p00[1], p01[0], p01[1]);
      line(p10[0], p10[1], p11[0], p11[1]);
      line(p01[0], p01[1], p11[0], p11[1]);
    }
    // trolley shelters: a frame with a roof over two bays, a row of trolleys
    for (const c of l.carts) {
      const a = (c.az * Math.PI) / 180,
        rot = Math.atan2(-Math.sin(a), Math.cos(a)), // the shelter's long side along the row (across the two bays)
        z = gz(c.x, c.y),
        co = Math.cos(rot),
        si = Math.sin(rot),
        P2 = (u, w) => [c.x + u * co - w * si, c.y + u * si + w * co];
      for (const [u, w] of [
        [-2.3, -1.1],
        [2.3, -1.1],
        [-2.3, 1.1],
        [2.3, 1.1],
      ]) {
        const [px, py] = P2(u, w);
        KN.box(px, py, z, 0.08, 0.08, 2.2, rot, GREYM);
      }
      KN.box(c.x, c.y, z + 2.2, 4.9, 2.6, 0.08, rot, LIGHT);
      // trolleys: two rows nested
      for (const w of [-0.45, 0.45])
        for (let k = 0; k < 8; k++) {
          const [px, py] = P2(-1.8 + k * 0.42, w);
          KN.box(px, py, z + 0.25, 0.5, 0.56, 0.6, rot, GREYM);
        }
      boxSeg(c.x, c.y, 4.7, 2.3, rot);
    }
    // lamps: an 8 m pole with an arm, the head lit at night
    for (const [x, y] of l.lamps) {
      const z = gz(x, y),
        az = Math.atan2(...lampDir(l, x, y));
      KN.cyl(x, y, z, z + 7.8, 0.08, 8, GREYM);
      KN.box(x, y, z, 0.3, 0.3, 0.5, 0, CONC);
      const hx = x + Math.sin(az) * 0.6,
        hy = y + Math.cos(az) * 0.6;
      KN.bar(x, y, hx, hy, 0.08, z + 7.75, z + 7.85, GREYM);
      KN.box(hx, hy, z + 7.72, 0.7, 0.36, 0.14, Math.PI / 2 - az, ANTH);
      lamps.push([hx, hy, z + 7.72, -az]);
      boxSeg(x, y, 0.3, 0.3, 0);
    }
  }
  // a lamp's arm points into the car park
  function lampDir(l, x, y) {
    const [cx, cy] = centroid(l.f),
      d = Math.hypot(cx - x, cy - y) || 1;
    return [(cx - x) / d, (cy - y) / d];
  }
  function segX(a, b, c, d) {
    const r = [b[0] - a[0], b[1] - a[1]],
      s = [d[0] - c[0], d[1] - c[1]],
      den = r[0] * s[1] - r[1] * s[0];
    if (Math.abs(den) < 1e-9) return null;
    const t = ((c[0] - a[0]) * s[1] - (c[1] - a[1]) * s[0]) / den,
      u = ((c[0] - a[0]) * r[1] - (c[1] - a[1]) * r[0]) / den;
    return t >= 0 && t <= 1 && u >= 0 && u <= 1 ? [a[0] + r[0] * t, a[1] + r[1] * t] : null;
  }
  // ---- a pylon at the edge of the car park: a slim column with the names, one under the other (both faces) ----
  function prop(p, g, B) {
    const { KB, signs, boxSeg, gz } = B;
    if (p.t !== 'pylon') return;
    const z = gz(p.x, p.y),
      w = 2.0,
      d = 0.5,
      // its faces turned to the nearest road: across the car park's long side – simply facing the group's middle
      dx = g.c[0] - p.x,
      dy = g.c[1] - p.y,
      L2 = Math.hypot(dx, dy) || 1,
      fx = dx / L2,
      fy = dy / L2,
      // the faces look along ±(−fy, fx): seen from the road along the car park
      nx = -fy,
      ny = fx,
      rot = Math.atan2(fy, fx);
    KB.box(p.x, p.y, z, d, w, p.h, rot, ANTH);
    KB.box(p.x, p.y, z, d + 0.2, w + 0.2, 0.4, rot, CONC);
    const n = p.texts.length,
      top = z + p.h - 0.35,
      hEach = Math.min(1.4, (p.h * 0.55) / n);
    for (const s of [1, -1])
      p.texts.forEach((t, i) => {
        const zz = top - (i + 1) * (hEach + 0.12);
        signs.push({
          k: 'pylon',
          lines: [t],
          st: i === 0 ? 1 : 3,
          x: p.x + nx * s * (d / 2 + 0.01),
          y: p.y + ny * s * (d / 2 + 0.01),
          z: zz,
          w: w - 0.2,
          h: hEach,
          nx: nx * s,
          ny: ny * s,
        });
      });
    boxSeg(p.x, p.y, d + 0.2, w + 0.2, rot);
  }
  // ---- a shop in a house that stays (the ETHOS house of gebaeude/gebaeude.js): a door and a sign on its facade ----
  function house(h, g, B) {
    const { KB, signs, gz } = B;
    const tx = -h.ny,
      ty = h.nx,
      rot = Math.atan2(ty, tx),
      z = gz(h.x + h.nx * 0.5, h.y + h.ny * 0.5);
    // the door: a brown leaf with a glass light, a frame, a step
    KB.box(h.x + h.nx * 0.04, h.y + h.ny * 0.04, z, 1.2, 0.06, 2.2, rot, L(0.22, 0.13, 0.08));
    KB.box(h.x + h.nx * 0.06, h.y + h.ny * 0.06, z + 1.3, 0.6, 0.04, 0.6, rot, GLASS_D);
    KB.box(h.x + h.nx * 0.3, h.y + h.ny * 0.3, z - 0.1, 1.6, 0.6, 0.12, rot, CONC);
    const w = Math.min(4.5, h.sign.length * 0.3 + 0.6);
    signs.push({
      k: 'band',
      lines: [h.sign],
      st: 2,
      x: h.x + h.nx * 0.12,
      y: h.y + h.ny * 0.12,
      z: z + 2.55,
      w,
      h: 0.55,
      nx: h.nx,
      ny: h.ny,
    });
    KB.box(h.x + h.nx * 0.07, h.y + h.ny * 0.07, z + 2.5, w + 0.1, 0.08, 0.65, rot, ANTH);
    const id = 'laeden:' + h.id;
    KERN.act({
      id,
      r: 3.0,
      prio: 1,
      pos: () => [h.x + h.nx * 1.0, h.y + h.ny * 1.0, z],
      label: () => h.name + ' – ' + h.art,
      run: () => toast(h.name + ', ' + h.addr + ' – Öffnungszeiten unbekannt. Hinein geht es noch nicht.', 5200),
    });
    g.acts.push(id);
  }
  // ---- the station: canopy (OSM building=roof) on columns, four pump islands, the kiosk is the shop's building ----
  function station(sh, g, B, zF) {
    const { KB, KN, signs, boxSeg, glassK, gz } = B;
    const F = sh.fuel,
      f = F.f,
      zc = zF + F.h,
      r = ring(f);
    // the canopy: a slab 0.9 m deep, white fascia all round with the name on two sides, lit underneath at night
    KB.flat(f, () => zc + 0.9, LIGHT);
    for (let i = 0; i < r.length; i++) {
      const a = r[i],
        b = r[(i + 1) % r.length],
        L2 = Math.hypot(b[0] - a[0], b[1] - a[1]);
      if (L2 < 0.3) continue;
      const nx = (b[1] - a[1]) / L2,
        ny = -(b[0] - a[0]) / L2;
      KB.quad([a[0], a[1], zc], [b[0], b[1], zc], [b[0], b[1], zc + 0.9], [a[0], a[1], zc + 0.9], WHITE_);
      if (L2 > 12) {
        const mx = (a[0] + b[0]) / 2,
          my = (a[1] + b[1]) / 2;
        signs.push({
          k: 'band',
          lines: [sh.name],
          st: 1,
          x: mx + nx * 0.03,
          y: my + ny * 0.03,
          z: zc + 0.15,
          w: Math.min(6, L2 * 0.3),
          h: 0.6,
          nx,
          ny,
        });
      }
    }
    // the underside: light panels, and rows of lamps in it (the glass material of the shop – lit when it is open and dark)
    const KG = glassK(sh.id),
      pts = [];
    for (let i = 0; i < f.length; i += 2) pts.push(new THREE.Vector2(f[i], f[i + 1]));
    const tris = THREE.ShapeUtils.triangulateShape(pts, []);
    for (const [i, j, k] of tris) {
      const a = [pts[i].x, pts[i].y, zc],
        b = [pts[j].x, pts[j].y, zc],
        c = [pts[k].x, pts[k].y, zc];
      const up = (b[0] - a[0]) * (c[1] - a[1]) - (b[1] - a[1]) * (c[0] - a[0]) > 0;
      if (up) KB.tri(a, c, b, LIGHT);
      else KB.tri(a, b, c, LIGHT);
    }
    const bbF = bbOf(f);
    for (let x = bbF[0] + 2; x < bbF[2] - 1.5; x += 3.5)
      for (let y = bbF[1] + 2; y < bbF[3] - 1.5; y += 3.5) {
        if (!inPoly(f, x, y) || edgeDist(f, x, y) < 1.2) continue;
        const zl = zc - 0.03;
        KG.quad(
          [x - 0.5, y + 0.25, zl],
          [x + 0.5, y + 0.25, zl],
          [x + 0.5, y - 0.25, zl],
          [x - 0.5, y - 0.25, zl],
          [1, 1, 1]
        );
      }
    // the forecourt: asphalt round the canopy (OSM's canopy, 6 m on each side, not on the road)
    if (F.court) groundPoly(B.KA, F.court, gz, ASPH, 0.04, 3);
    // islands with a pump each, a column at each island's end carrying the canopy
    for (const is of F.islands) {
      const a = (is.az * Math.PI) / 180,
        rot = Math.atan2(Math.cos(a), Math.sin(a)), // along the islands' direction
        z = gz(is.x, is.y);
      KN.box(is.x, is.y, z, 5.2, 1.3, 0.16, rot, CONC);
      KN.box(is.x, is.y, z + 0.16, 0.9, 0.55, 1.75, rot, LIGHT, ANTH);
      KN.box(is.x, is.y, z + 1.2, 0.92, 0.57, 0.45, rot, ANTH);
      for (const s of [-1, 1]) {
        const px = is.x + Math.cos(rot) * s * 2.3,
          py = is.y + Math.sin(rot) * s * 2.3;
        KB.box(px, py, z, 0.36, 0.36, zc - z, rot, WHITE_);
        boxSeg(px, py, 0.4, 0.4, rot);
      }
      boxSeg(is.x, is.y, 1.0, 0.65, rot);
    }
  }
  // ---- the drive-in: lane on asphalt, its kerb on the outer side, arrows, the order post with a board, the two windows ----
  function drive(sh, g, B, zF) {
    const { KB, KN, KA, KL, signs, boxSeg, glassK, gz } = B;
    const D = sh.drive,
      p = ring(D.p),
      hw = D.w / 2;
    // the lane's surface as quads along it
    for (let i = 0; i + 1 < p.length; i++) {
      const a = p[i],
        b = p[i + 1],
        L2 = Math.hypot(b[0] - a[0], b[1] - a[1]);
      if (L2 < 0.2) continue;
      const nx = (b[1] - a[1]) / L2,
        ny = -(b[0] - a[0]) / L2,
        f = [
          a[0] + nx * hw,
          a[1] + ny * hw,
          b[0] + nx * hw,
          b[1] + ny * hw,
          b[0] - nx * hw,
          b[1] - ny * hw,
          a[0] - nx * hw,
          a[1] - ny * hw,
        ];
      groundPoly(KA, f, gz, ASPH, 0.045, 3);
      // the yellow edge line on the right (the outer side), arrows every 9 m
      const ex = nx * (hw - 0.2),
        ey = ny * (hw - 0.2);
      const za = gz(a[0] + ex, a[1] + ey) + 0.07,
        zb = gz(b[0] + ex, b[1] + ey) + 0.07,
        ux = ((b[0] - a[0]) / L2) * 0.06,
        uy = ((b[1] - a[1]) / L2) * 0.06;
      KL.quadUp(
        [a[0] + ex - uy, a[1] + ey + ux, za],
        [b[0] + ex - uy, b[1] + ey + ux, zb],
        [b[0] + ex + uy, b[1] + ey - ux, zb],
        [a[0] + ex + uy, a[1] + ey - ux, za],
        YEL
      );
      for (let s = 3; s + 2 < L2; s += 9) {
        const cx = a[0] + ((b[0] - a[0]) * s) / L2,
          cy = a[1] + ((b[1] - a[1]) * s) / L2,
          dx = (b[0] - a[0]) / L2,
          dy = (b[1] - a[1]) / L2,
          z = gz(cx, cy) + 0.07;
        // an arrow: shaft and head
        KL.quadUp(
          [cx - dy * 0.08, cy + dx * 0.08, z],
          [cx - dy * 0.08 + dx * 1.4, cy + dx * 0.08 + dy * 1.4, z],
          [cx + dy * 0.08 + dx * 1.4, cy - dx * 0.08 + dy * 1.4, z],
          [cx + dy * 0.08, cy - dx * 0.08, z],
          PAINT
        );
        KL.triUp(
          [cx - dy * 0.35 + dx * 1.4, cy + dx * 0.35 + dy * 1.4, z],
          [cx + dx * 2.2, cy + dy * 2.2, z],
          [cx + dy * 0.35 + dx * 1.4, cy - dx * 0.35 + dy * 1.4, z],
          PAINT
        );
      }
    }
    // the order post (left of the lane, at the driver's window) and the board beside it
    const po = D.post,
      z = gz(po.x, po.y),
      a = (po.az * Math.PI) / 180,
      rot = Math.atan2(Math.cos(a), Math.sin(a));
    KN.box(po.x, po.y, z, 0.45, 0.35, 1.45, rot, ANTH);
    KN.box(po.x, po.y, z + 1.45, 0.6, 0.5, 0.08, rot, LIGHT);
    const bx = po.x + Math.cos(rot) * 2.2,
      by = po.y + Math.sin(rot) * 2.2;
    for (const s of [-0.85, 0.85]) KN.box(bx + Math.cos(rot) * s, by + Math.sin(rot) * s, z, 0.1, 0.1, 1.2, rot, ANTH);
    KB.box(bx, by, z + 1.2, 2.0, 0.18, 1.4, rot, ANTH);
    // the board's face looks at the arriving driver: back along the lane
    const fx = -Math.sin(rot),
      fy = Math.cos(rot);
    signs.push({
      k: 'plate',
      lines: ['Bestellung', 'Hier bitte bestellen', 'Weiter zur Kasse'],
      st: 0,
      x: bx + fx * 0.1,
      y: by + fy * 0.1,
      z: z + 1.3,
      w: 1.8,
      h: 1.2,
      nx: fx,
      ny: fy,
    });
    boxSeg(po.x, po.y, 0.5, 0.4, rot);
    boxSeg(bx, by, 2.1, 0.3, rot);
    // the windows: a pane at counter height, a small canopy, the name of the window
    const KG = glassK(sh.id);
    for (const w of D.win) {
      const tx = -w.ny,
        ty = w.nx,
        r2 = Math.atan2(ty, tx),
        zw = gz(w.x + w.nx, w.y + w.ny);
      KG.quad(
        [w.x - tx * 0.8 + w.nx * 0.04, w.y - ty * 0.8 + w.ny * 0.04, zw + 0.95],
        [w.x + tx * 0.8 + w.nx * 0.04, w.y + ty * 0.8 + w.ny * 0.04, zw + 0.95],
        [w.x + tx * 0.8 + w.nx * 0.04, w.y + ty * 0.8 + w.ny * 0.04, zw + 2.2],
        [w.x - tx * 0.8 + w.nx * 0.04, w.y - ty * 0.8 + w.ny * 0.04, zw + 2.2],
        [1, 1, 1]
      );
      KB.box(w.x + w.nx * 0.12, w.y + w.ny * 0.12, zw + 0.9, 1.8, 0.3, 0.08, r2, GREYM);
      KB.box(w.x + w.nx * 0.5, w.y + w.ny * 0.5, zw + 2.45, 2.2, 1.0, 0.1, r2, ANTH);
      signs.push({
        k: 'band',
        lines: [w.t],
        st: 0,
        x: w.x + w.nx * 1.01,
        y: w.y + w.ny * 1.01,
        z: zw + 2.35,
        w: 1.4,
        h: 0.32,
        nx: w.nx,
        ny: w.ny,
      });
    }
    // a height gauge over the entrance of the lane: two posts, a bar
    const p0 = p[0],
      p1 = p[1],
      L0 = Math.hypot(p1[0] - p0[0], p1[1] - p0[1]) || 1,
      nx0 = (p1[1] - p0[1]) / L0,
      ny0 = -(p1[0] - p0[0]) / L0,
      zg = gz(p0[0], p0[1]);
    for (const s of [-1, 1]) {
      KB.cyl(p0[0] + nx0 * s * (hw + 0.35), p0[1] + ny0 * s * (hw + 0.35), zg, zg + 3.0, 0.07, 8, ANTH);
      boxSeg(p0[0] + nx0 * s * (hw + 0.35), p0[1] + ny0 * s * (hw + 0.35), 0.16, 0.16, 0);
    }
    KB.bar(
      p0[0] - nx0 * (hw + 0.35),
      p0[1] - ny0 * (hw + 0.35),
      p0[0] + nx0 * (hw + 0.35),
      p0[1] + ny0 * (hw + 0.35),
      0.12,
      zg + 2.8,
      zg + 3.0,
      YEL
    );
    signs.push({
      k: 'band',
      lines: ['Drive-in · max. 2,8 m'],
      st: 0,
      x: p0[0] - ((p1[0] - p0[0]) / L0) * 0.08,
      y: p0[1] - ((p1[1] - p0[1]) / L0) * 0.08,
      z: zg + 3.05,
      w: 2.6,
      h: 0.4,
      nx: -(p1[0] - p0[0]) / L0,
      ny: -(p1[1] - p0[1]) / L0,
    });
  }
  // ---- the parked cars of welt-dinge (dinge/dinge.js) in the car parks: each into the nearest free bay; the ones that stand on a shop,
  // its drive-in lane or before a door leave their cell ----
  function snapCars(g) {
    const D = window.DINGE;
    if (!D || !D.places || !D.places.length || g.snapped === D.places.length) return;
    g.snapped = D.places.length;
    const free = [];
    for (const l of g.lots) for (const b of l.bays) free.push({ x: b[0], y: b[1], az: b[2], l: l.id, used: false });
    // bays already taken by a place moved in an earlier round
    for (const p of D.places)
      if (p.laeden === 'bucht')
        for (const b of free)
          if (!b.used && Math.abs(b.x - p.x) < 0.01 && Math.abs(b.y - p.y) < 0.01) {
            b.used = true;
            break;
          }
    const inLot = (x, y) => g.lots.find(l => inPoly(l.f, x, y));
    const onShop = (x, y) =>
      g.shops.some(
        sh =>
          sh.parts.concat(sh.annex).some(p => inPoly(p.f, x, y) || edgeDist(p.f, x, y) < 1.5) ||
          (sh.fuel && (inPoly(sh.fuel.f, x, y) || edgeDist(sh.fuel.f, x, y) < 2)) ||
          (sh.drive && driveDist(sh.drive, x, y) < sh.drive.w / 2 + 1.5) ||
          sh.doors.some(d => d.k !== 'liefer' && Math.hypot(d.x + d.nx * 2 - x, d.y + d.ny * 2 - y) < d.w / 2 + 2.5)
      );
    const touched = new Set();
    for (const p of D.places) {
      if (p.laeden || Math.hypot(p.x - g.c[0], p.y - g.c[1]) > 700) continue;
      const l = inLot(p.x, p.y);
      if (l) {
        // the nearest free bay of this car park
        let best = null,
          bd = 1e9;
        for (const b of free) {
          if (b.used || b.l !== l.id) continue;
          const d = Math.hypot(b.x - p.x, b.y - p.y);
          if (d < bd) {
            bd = d;
            best = b;
          }
        }
        if (best && bd < 40) {
          best.used = true;
          // forwards into the bay, or backed in (a few)
          const back = hh(p.seed || p.x) < 0.2;
          p.x = best.x;
          p.y = best.y;
          p.az = back ? (best.az + 180) % 360 : best.az;
          p.zc = -1e6; // dinge.js sets its cell down again (its periodic check)
          p.laeden = 'bucht';
          if (p.cell) touched.add(p.cell);
          S.moved++;
          continue;
        }
      }
      if (l || onShop(p.x, p.y)) {
        p.laeden = 'weg';
        if (p.cell) {
          const i = p.cell.places.indexOf(p);
          if (i >= 0) {
            p.cell.places.splice(i, 1);
            if (p.im) {
              // hidden at once in a cell already built (dinge.js rebuilds it with its check)
              p.on = false;
              p.hide = true;
              try {
                const m = new THREE.Matrix4().makeScale(0, 0, 0);
                p.im.setMatrixAt(p.ii, m);
                p.im.instanceMatrix.needsUpdate = true;
                if (p.sh) {
                  p.sh.setMatrixAt(p.si, m);
                  p.sh.instanceMatrix.needsUpdate = true;
                }
              } catch (e) {}
              p.im = p.sh = null;
            }
            touched.add(p.cell);
          }
        }
        S.dropped++;
      }
    }
    // a cell already built: one of its places marked as off the ground → dinge.js builds it again with the new places
    for (const c of touched) if (c.places && c.places[0]) c.places[0].zc = -1e6;
    markDirty(true);
  }
  const driveDist = (D, x, y) => {
    let d = 1e9;
    for (let i = 0; i + 3 < D.p.length; i += 2) {
      const ax = D.p[i],
        ay = D.p[i + 1],
        dx = D.p[i + 2] - ax,
        dy = D.p[i + 3] - ay,
        l2 = dx * dx + dy * dy || 1,
        t = Math.max(0, Math.min(1, ((x - ax) * dx + (y - ay) * dy) / l2));
      d = Math.min(d, Math.hypot(x - ax - dx * t, y - ay - dy * t));
    }
    return d;
  };
  // ---- walker and vehicles: out of the walls and solid things (answers only when it moved the point; the zones are asked next) ----
  function push(p, r) {
    let moved = false;
    for (const g of GROUPS) {
      if (!g.grid || Math.abs(p[0] - g.c[0]) > 450 || Math.abs(p[1] - g.c[1]) > 450) continue;
      const ci = Math.floor(p[0] / 8),
        cj = Math.floor(p[1] / 8);
      for (let i = ci - 1; i <= ci + 1; i++)
        for (let j = cj - 1; j <= cj + 1; j++) {
          const a = g.grid.get(i + ',' + j);
          if (!a) continue;
          for (const k of a) {
            const s = g.segs[k],
              ex = s[2] - s[0],
              ey = s[3] - s[1],
              l2 = ex * ex + ey * ey || 1,
              t = Math.max(0, Math.min(1, ((p[0] - s[0]) * ex + (p[1] - s[1]) * ey) / l2)),
              qx = s[0] + ex * t,
              qy = s[1] + ey * t,
              dx = p[0] - qx,
              dy = p[1] - qy,
              d = Math.hypot(dx, dy);
            if (d < r && d > 1e-6) {
              p[0] = qx + (dx / d) * r;
              p[1] = qy + (dy / d) * r;
              moved = true;
            }
          }
        }
    }
    return moved ? true : undefined;
  }
  KERN.provide('pushOut', push, 16);
  // ---- the round: load near, build and free the groups, the near things, the light ----
  let acc = 0;
  const BUSY = { g: null };
  function tick(dt) {
    acc += dt;
    if (acc < 0.5) return;
    acc = 0;
    const w = KERN.where();
    if (!w) return;
    const dMin = Math.min(...GROUPS.map(g => Math.hypot(g.c[0] - w[0], g.c[1] - w[1])));
    if (S.state === 'idle' && dMin < LOAD_R && (!S.retry || performance.now() > S.retry)) load();
    if (S.state !== 'da' || !VILLAGE.ready) return;
    for (const g of GROUPS) {
      const d = Math.hypot(g.c[0] - w[0], g.c[1] - w[1]);
      if (g.state === 'built' && d > FAR) drop(g);
      else if (g.state === 'idle' && d < NEAR && !BUSY.g) {
        BUSY.g = g;
        g.state = 'pads';
        groundOf(g)
          .then(() => {
            if (g.state !== 'pads') return;
            build(g);
          })
          .catch(e => {
            S.err = String(e);
            console.warn('laeden', g.id, e);
            g.state = 'error';
          })
          .finally(() => (BUSY.g = null));
      }
      if (g.state !== 'built') continue;
      // the small things near only
      const nearOn = d < DETAIL + 200;
      for (const m of g.near) if (m !== g.pool) m.visible = nearOn && !RATSCHER.map;
      if (g.pool) g.pool.visible = nearOn && VPROPS.pool && VPROPS.pool.visible && !RATSCHER.map;
      for (const m of g.meshes) if (!g.near.includes(m)) m.visible = !RATSCHER.map;
      // the parked cars that loaded after the group was built
      if (window.DINGE && DINGE.places && g.snapped !== DINGE.places.length && DINGE.areaState().schleusingen === 'da')
        snapCars(g);
    }
    // the windows: lit when it is dark and the shop open (dimmed when closed: the night light)
    const n = VILLAGE.night ? VILLAGE.night() : 0;
    for (const g of GROUPS)
      for (const q of g.glass || []) {
        const open = q.sh ? isOpen(q.sh.week) : null,
          k = n > 0.05 ? Math.min(1, (n - 0.05) / 0.3) * (open === false ? 0.12 : 1) : 0;
        if (Math.abs(q.mat.emissiveIntensity - k * 1.6) > 0.01) {
          q.mat.emissiveIntensity = k * 1.6;
          markDirty();
        }
      }
  }
  KERN.tick(tick, 'laeden');
  // ---- tests: numbers only ----
  S.status = () => ({
    on: S.on,
    state: S.state,
    err: S.err,
    groups: GROUPS.map(g => ({
      id: g.id,
      state: g.state,
      shops: (g.shops || []).map(s => s.id),
      meshes: (g.meshes || []).length,
      near: (g.near || []).length,
      tris: Math.round(g.tris || 0),
      ms: g.ms || 0,
      segs: (g.segs || []).length,
      acts: (g.acts || []).length,
      signs: g.atlas ? g.atlas.n : 0,
      surf: (g.surf || []).map(f => ({ z0: +f.z0.toFixed(2), n: f.n })),
    })),
    moved: S.moved,
    dropped: S.dropped,
  });
  S.shop = id => (S.data ? S.data.shops.find(s => s.id === id) || null : null);
  S.groundAt = (x, y) => {
    for (const g of GROUPS)
      if (g.state === 'built' && g.gz && Math.hypot(g.c[0] - x, g.c[1] - y) < 450) return g.gz(x, y);
    return null;
  };
  return S;
})();
window.LAEDEN = LAEDEN;
