// ===================== feat/laeden-leben 4: St. Johannis by day – the town church open and quiet, a candle to light (KIRCHE) =====================
// The brief: „St. Johannis by day“. Its hours from OEFFNUNG ('johannis', assumed: an open church by day, Sundays after the service).
// Through the portal in the middle of the south wall (where welt/schleusingen.js draws it) one goes in – a short fade, as into the
// museum – and stands within the church's own walls (landmark 'kirche', its outline 1 m in for the walls): a hall of three aisles –
// pillars in the windows' rhythm, pews in blocks with the middle aisle and the cross aisle from the portal, galleries along the north
// and the west wall with the organ, the raised choir with altar, cross and candles, the communion rail, the pulpit at the tower's foot,
// the font, the hymn board, epitaphs, brass chandeliers, tall windows of pale leaded glass where the outside has its windows. By the
// door a candle stand (light one, 1 €), the welcome board, the guest book; one may sit down in a pew. Weekends a warden sits by the
// door, now and then someone sits quietly in a pew. A generic Protestant town church of Thuringia – no claim on the real interior.
// Drawn with the shops' kit (laeden/innen.js LINNEN.drawPlan: unlit, light baked in) and a canvas of pictures on the printed goods'
// program – no new shader; built within 90 m of the church, freed beyond 150 m, its meshes shown only while one is inside (outside,
// the church's walls hide it anyway).
//   KIRCHE.status() · betreten() · verlassen() · kerze() · sitzen() · events KERN 'kirche' { was }
import * as THREE from 'three';
import { COARSE, scene } from '../core/head.js';
import { markDirty } from '../core/assets.js';
import { KERN } from '../core/kern.js';
import { toast } from '../audio/audio.js';
import { P } from '../game/walkable.js';
import { PLAY } from '../game/play.js';
import { SCHL } from '../welt/schleusingen.js';
import { DCAL } from '../dorf/dorf_cal.js';
import { OEFFNUNG } from './oeffnung.js';
import { GELD } from './geld.js';
import { LIPLAN } from '../laeden/innen_plan.js';
import { LINNEN } from '../laeden/innen.js';
import { LLEBEN } from '../laeden/leben.js';
import { LKAUF } from '../laeden/kauf.js';
export const KIRCHE = (() => {
  const S = {
    built: false,
    failed: false,
    inside: false,
    busy: false,
    err: '',
    meshes: [],
    segs: [],
    kerzen: 0,
    gesessen: 0,
  };
  const { L } = LIPLAN;
  const C = {
    wall: L(0.93, 0.91, 0.86),
    plinth: L(0.66, 0.62, 0.55),
    ceil: L(0.95, 0.93, 0.88),
    beam: L(0.55, 0.42, 0.3),
    stone: L(0.76, 0.71, 0.62),
    joint: L(0.6, 0.56, 0.49),
    pillar: L(0.86, 0.83, 0.76),
    wood: L(0.44, 0.31, 0.2),
    woodL: L(0.6, 0.46, 0.31),
    pew: L(0.47, 0.34, 0.22),
    pewTop: L(0.55, 0.41, 0.27),
    cream: L(0.92, 0.88, 0.77),
    gold: L(0.8, 0.63, 0.28),
    cloth: L(0.96, 0.96, 0.94),
    green: L(0.2, 0.42, 0.26),
    red: L(0.5, 0.12, 0.1),
    pipe: L(0.8, 0.82, 0.84),
    iron: L(0.18, 0.18, 0.19),
    candle: L(0.96, 0.94, 0.86),
    flame: [2.3, 1.35, 0.5],
    bulb: [2.3, 2.1, 1.7],
    slab: L(0.58, 0.56, 0.52),
  };
  // the tower's shaft as welt/schleusingen.js draws it (props: the tower by the choir, centre and width) – inside, its foot is walled
  const TOWER = [-1246.0, 1213.2, 6.6];
  // ---- pictures: the leaded windows, the welcome board, the hymn board, the cross, the door, a plain white for flat colour ----
  let TEX = null;
  const PICS = {};
  function pictures() {
    if (TEX) return TEX;
    const N = COARSE ? 512 : 1024,
      cv = document.createElement('canvas');
    cv.width = cv.height = N;
    const q = cv.getContext('2d'),
      FONT = '"Helvetica Neue", Helvetica, Arial, "Liberation Sans", sans-serif';
    const cell = (k, x, y, w, h, draw) => {
      q.save();
      q.translate(x * N, y * N);
      q.scale(N / 1024, N / 1024);
      draw(w * 1024, h * 1024);
      q.restore();
      PICS[k] = [x, 1 - (y + h), x + w, 1 - y];
    };
    // a tall window: pale diamond panes in lead under a pointed arch, a narrow coloured border
    const fenster = (w, h, bunt) => {
      q.fillStyle = '#d9d5c8';
      q.fillRect(0, 0, w, h);
      q.save();
      q.beginPath();
      q.moveTo(4, h);
      q.lineTo(4, w * 0.55);
      q.quadraticCurveTo(4, 4, w / 2, 4);
      q.quadraticCurveTo(w - 4, 4, w - 4, w * 0.55);
      q.lineTo(w - 4, h);
      q.closePath();
      q.clip();
      const g = q.createLinearGradient(0, 0, 0, h);
      g.addColorStop(0, '#fffdf2');
      g.addColorStop(1, '#eef0e4');
      q.fillStyle = g;
      q.fillRect(0, 0, w, h);
      if (bunt) {
        // the choir's windows: a little colour in the middle field
        const cols = ['#c9b25a', '#8aa3c8', '#b8705a', '#9cb88a'];
        for (let k = 0; k < 10; k++) {
          q.fillStyle = cols[k % 4];
          q.globalAlpha = 0.55;
          q.fillRect(w * 0.22, h * (0.3 + k * 0.045), w * 0.56, h * 0.04);
        }
        q.globalAlpha = 1;
      }
      q.strokeStyle = 'rgba(70,65,58,0.5)';
      q.lineWidth = 2;
      const s = 26;
      for (let k = -h; k < h + w; k += s) {
        q.beginPath();
        q.moveTo(0, k);
        q.lineTo(w, k + w * 0.7);
        q.stroke();
        q.beginPath();
        q.moveTo(0, k + w * 0.7);
        q.lineTo(w, k);
        q.stroke();
      }
      q.strokeStyle = '#b28a3a';
      q.lineWidth = 7;
      q.strokeRect(10, 10, w - 20, h - 20);
      q.restore();
      // the mullion and two iron bars
      q.fillStyle = '#5b574f';
      q.fillRect(w / 2 - 3, w * 0.35, 6, h);
      q.fillRect(0, h * 0.42, w, 4);
      q.fillRect(0, h * 0.72, w, 4);
    };
    cell('fenster', 0, 0, 0.25, 0.75, (w, h) => fenster(w, h, false));
    cell('apsis', 0.375, 0.25, 0.125, 0.5, (w, h) => fenster(w, h, true));
    // the welcome board by the door
    cell('willkommen', 0.25, 0, 0.25, 0.25, (w, h) => {
      q.fillStyle = '#efe8d8';
      q.fillRect(0, 0, w, h);
      q.fillStyle = '#4a3a2a';
      q.fillRect(0, 0, w, 10);
      q.fillStyle = '#2a2420';
      q.textBaseline = 'top';
      q.font = '700 24px ' + FONT;
      q.fillText('Stadtkirche', 18, 24);
      q.fillText('St. Johannis', 18, 52);
      q.font = '400 15px ' + FONT;
      [
        'Herzlich willkommen!',
        'Die Kirche ist tagsüber offen –',
        'zur Stille, zum Gebet',
        'und zum Anschauen.',
        '',
        'Bitte nehmen Sie Rücksicht',
        'auf Betende.',
        '',
        'Gottesdienst sonntags 10 Uhr',
      ].forEach((t, i) => q.fillText(t, 18, 92 + i * 17));
    });
    // the hymn board: dark wood, the numbers in white
    cell('lieder', 0.5, 0, 0.125, 0.25, (w, h) => {
      q.fillStyle = '#3a2a1c';
      q.fillRect(0, 0, w, h);
      q.strokeStyle = '#b8892e';
      q.lineWidth = 6;
      q.strokeRect(4, 4, w - 8, h - 8);
      q.fillStyle = '#f4efe4';
      q.font = '700 30px ' + FONT;
      q.textAlign = 'center';
      q.textBaseline = 'middle';
      ['412', '503', '316', '170'].forEach((t, i) => q.fillText(t, w / 2, h * (0.17 + i * 0.22)));
    });
    // the altarpiece's middle: a gilded cross on a dark ground
    cell('kreuz', 0.625, 0, 0.125, 0.25, (w, h) => {
      const g = q.createLinearGradient(0, 0, 0, h);
      g.addColorStop(0, '#3a2c1e');
      g.addColorStop(1, '#22190f');
      q.fillStyle = g;
      q.fillRect(0, 0, w, h);
      q.strokeStyle = '#b8892e';
      q.lineWidth = 5;
      q.strokeRect(5, 5, w - 10, h - 10);
      q.fillStyle = '#d4ad55';
      q.fillRect(w * 0.45, h * 0.1, w * 0.1, h * 0.78);
      q.fillRect(w * 0.2, h * 0.28, w * 0.6, w * 0.1);
    });
    // the door's inside: planks and iron bands
    cell('tuer', 0.25, 0.25, 0.125, 0.25, (w, h) => {
      q.fillStyle = '#4b3220';
      q.fillRect(0, 0, w, h);
      q.fillStyle = '#3a2618';
      for (let x = 0; x < w; x += 16) q.fillRect(x, 0, 2, h);
      q.fillStyle = '#26221e';
      for (const y of [0.18, 0.5, 0.82]) q.fillRect(0, h * y, w, 7);
      q.fillRect(w * 0.82, h * 0.48, 10, 26);
    });
    // a plain white field: flat colours (the ceiling) through the vertex colours
    cell('weiss', 0.75, 0, 0.0625, 0.0625, (w, h) => {
      q.fillStyle = '#ffffff';
      q.fillRect(0, 0, w, h);
    });
    TEX = new THREE.CanvasTexture(cv);
    TEX.colorSpace = THREE.SRGBColorSpace;
    TEX.anisotropy = 4;
    return TEX;
  }
  // ---- geometry in the frame of the portal's wall: u along it (west → east), v into the church ----
  const church = () => (SCHL && SCHL.state === 'ready' ? (SCHL.bld || []).find(b => b.lm === 'kirche') : null);
  // the polygon moved t inwards (counter-clockwise rings; each edge shifted to its left, the corners where shifted edges meet)
  function inset(R, t) {
    const n = R.length,
      out = [];
    for (let i = 0; i < n; i++) {
      const a = R[(i + n - 1) % n],
        b = R[i],
        c = R[(i + 1) % n],
        l1 = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1,
        l2 = Math.hypot(c[0] - b[0], c[1] - b[1]) || 1,
        d1 = [(b[0] - a[0]) / l1, (b[1] - a[1]) / l1],
        d2 = [(c[0] - b[0]) / l2, (c[1] - b[1]) / l2],
        p1 = [b[0] - d1[1] * t, b[1] + d1[0] * t],
        p2 = [b[0] - d2[1] * t, b[1] + d2[0] * t],
        den = d1[0] * d2[1] - d1[1] * d2[0];
      if (Math.abs(den) < 1e-6) {
        out.push(p1);
        continue;
      }
      const s = ((p2[0] - p1[0]) * d2[1] - (p2[1] - p1[1]) * d2[0]) / den;
      out.push([p1[0] + d1[0] * s, p1[1] + d1[1] * s]);
    }
    return out;
  }
  // the polygon's extent across at u (its lowest and highest v)
  function spanV(Q, u) {
    let lo = 1e9,
      hi = -1e9;
    for (let i = 0; i < Q.length; i++) {
      const a = Q[i],
        b = Q[(i + 1) % Q.length];
      if ((a[0] - u) * (b[0] - u) > 0 || a[0] === b[0]) continue;
      const v = a[1] + ((b[1] - a[1]) * (u - a[0])) / (b[0] - a[0]);
      lo = Math.min(lo, v);
      hi = Math.max(hi, v);
    }
    return [lo, hi];
  }
  const flat = R => R.flatMap(p => p);
  function site(b) {
    // the portal's wall: the long facade nearest the street (as the props choose it), the door in its middle
    let fp = null;
    for (const f of b.F || []) if (Math.hypot(f[2] - f[0], f[3] - f[1]) > 6 && (!fp || f[9] < fp[9])) fp = f;
    if (!fp) return null;
    const Lw = Math.hypot(fp[2] - fp[0], fp[3] - fp[1]);
    let F = LIPLAN.frame([fp[0], fp[1]], [fp[2] - fp[0], fp[3] - fp[1]]);
    if (!LIPLAN.inPoly(b.f, ...F.W(Lw / 2, 1.5))) F = LIPLAN.frame([fp[2], fp[3]], [fp[0] - fp[2], fp[1] - fp[3]]);
    let R = [];
    for (let i = 0; i < b.f.length; i += 2) R.push(F.L(b.f[i], b.f[i + 1]));
    let A = 0;
    for (let i = 0; i < R.length; i++) {
      const p = R[i],
        q2 = R[(i + 1) % R.length];
      A += p[0] * q2[1] - q2[0] * p[1];
    }
    if (A < 0) R = R.reverse();
    return { F, Lw, R };
  }
  // ---- building ----
  const MATS = [];
  function build() {
    const b = church();
    if (!b) return false;
    const st = site(b);
    if (!st) return ((S.err = 'no portal wall'), (S.failed = true), false);
    const { F, Lw, R } = st,
      T = 1.0,
      Q = inset(R, T),
      Qf = flat(Q),
      du = Lw / 2;
    let uW = 1e9,
      uMax = -1e9;
    for (const p of Q) {
      uW = Math.min(uW, p[0]);
      uMax = Math.max(uMax, p[0]);
    }
    const uE = Lw - T,
      vS = T,
      vN0 = spanV(Q, uW + 0.5)[1],
      vN1 = spanV(Q, uE - 0.5)[1],
      vN = Math.min(vN0, vN1),
      vNx = Math.max(vN0, vN1);
    // the choir beyond the nave's east wall (if the outline has one)
    const cs = spanV(Q, uE + 0.6),
      choir = uMax > uE + 2 && cs[1] - cs[0] > 3,
      cv0 = choir ? cs[0] : vS + (vN - vS) * 0.3,
      cv1 = choir ? cs[1] : vS + (vN - vS) * 0.7,
      vm = (cv0 + cv1) / 2;
    if (uE - uW < 12 || vN - vS < 9) return ((S.err = 'church too small'), (S.failed = true), false);
    // heights: the floor over the ground inside (and the door's step), windows and ceiling as the outside has them
    const zDoor = KERN.ground(...F.W(du, -1.2));
    let zIn = Number.isFinite(zDoor) ? zDoor : b.z0;
    for (let u = uW + 1; u < uMax; u += 3)
      for (let v = vS + 1; v < vNx; v += 3) {
        if (!LIPLAN.inPoly(Qf, u, v)) continue;
        const g = KERN.ground(...F.W(u, v));
        if (Number.isFinite(g) && g > zIn) zIn = g;
      }
    const z = Math.max(zIn, b.z0) + 0.12,
      zw = b.z0 + 3.6 - z,
      H = Math.max(8, b.z0 + Math.min(11, (b.e || 12.5) - 1.2) - z),
      ZC = 0.18;
    // the tower's foot in the nave's north-east corner (a box in the frame, if the tower stands in the outline)
    const tc = F.L(TOWER[0], TOWER[1]),
      th = TOWER[2] / 2,
      tw =
        LIPLAN.inPoly(Qf, tc[0], tc[1]) || LIPLAN.inPoly(Qf, tc[0] - th + 0.3, tc[1] - th + 0.3)
          ? [tc[0] - th, tc[1] - th]
          : null;
    const inTower = (u, v, m = 0) => tw && u > tw[0] - m && v > tw[1] - m;
    Object.assign(S, { F, z, du, vS, vN, uW, uE, uMax, cv0, cv1, vm, H, Q, Qf, door: F.W(du, 0), tw });
    // the ground before the portal (the door's button stands there; the floor inside may be a step higher)
    S.zOut = Number.isFinite(zDoor) ? zDoor : b.z0;
    const Pl = LIPLAN.newPlan({ id: 'kirche', type: 'kirche' });
    Pl.floor = { floorA: C.stone, floorB: C.stone };
    Pl.cell = 1.0;
    const K = LIPLAN.kit(Pl, F, 0),
      segs = [];
    const seg = (a0, b0, a1, b1) => {
      const [ax, ay] = F.W(a0, b0),
        [bx, by] = F.W(a1, b1);
      segs.push([ax, ay, bx, by]);
    };
    // walls along the inner outline: 0.3 thick behind its line, longer at outer corners, a stone plinth
    const n = Q.length;
    const convex = i => {
      const a = Q[(i + n - 1) % n],
        p = Q[i],
        c = Q[(i + 1) % n];
      return (p[0] - a[0]) * (c[1] - p[1]) - (p[1] - a[1]) * (c[0] - p[0]) > 0;
    };
    for (let i = 0; i < n; i++) {
      const a = Q[i],
        c = Q[(i + 1) % n],
        l = Math.hypot(c[0] - a[0], c[1] - a[1]);
      if (l < 0.05) continue;
      const dx = (c[0] - a[0]) / l,
        dy = (c[1] - a[1]) / l,
        e0 = convex(i) ? 0.3 : 0,
        e1 = convex((i + 1) % n) ? 0.3 : 0,
        mid = (e1 - e0) / 2,
        ang = Math.atan2(dy, dx);
      // the outward side is the right of the edge
      const cu = (a[0] + c[0]) / 2 + dx * mid + dy * 0.15,
        cvv = (a[1] + c[1]) / 2 + dy * mid - dx * 0.15;
      K.box(cu, cvv, 0, l + e0 + e1, 0.3, H, C.wall, C.wall, ang);
      K.box(cu - dy * 0.03, cvv + dx * 0.03, 0, l + e0 + e1, 0.36, 0.55, C.plinth, C.plinth, ang);
      seg(a[0], a[1], c[0], c[1]);
    }
    // the tower's foot: plastered walls before its shaft, the sacristy's door in it
    if (tw) {
      const tS = tw[1] - 0.22,
        tW = tw[0] - 0.22;
      K.box((tW + uE + 0.3) / 2, tS + 0.125, 0, uE + 0.3 - tW, 0.25, H, C.wall, C.wall);
      K.box(tW + 0.125, (tS + vNx + 0.3) / 2, 0, 0.25, vNx + 0.3 - tS, H, C.wall, C.wall);
      K.box((tW + uE + 0.3) / 2, tS + 0.1, 0, uE + 0.3 - tW, 0.31, 0.55, C.plinth);
      K.box(tW + 0.1, (tS + vNx + 0.3) / 2, 0, 0.31, vNx + 0.3 - tS, 0.55, C.plinth);
      seg(tW, tS, uE, tS);
      seg(tW, tS, tW, vNx + 0.3);
      S.sakristei = [tW - 0.02, tS + 2.6];
      K.signU(['Sakristei'], tW - 0.03, tS + 2.6, 2.4, 0.8, 0.18, -1, 3);
    }
    // the ceiling's beams over the nave, two along the pillars
    const bay = Lw / Math.max(1, Math.floor(Lw / 5.5));
    for (let u = uW + 2.8; u < uE - 0.5; u += 2.8) K.box(u, (vS + vNx) / 2, H - 0.3, 0.26, vNx - vS, 0.3, C.beam);
    const vA = choir ? cv0 - 0.25 : vS + (vN - vS) * 0.33,
      vB = choir ? cv1 + 0.25 : vS + (vN - vS) * 0.67;
    for (const v of [vA, vB]) K.box((uW + uE) / 2, v, H - 0.34, uE - uW, 0.3, 0.34, C.beam);
    // pillars between the windows: octagonal, plinth and capital
    const pillars = [];
    for (const v of [vA, vB])
      for (let k = 1; k * bay < uE - 1.5; k++) {
        const u = k * bay;
        if (u < uW + 2 || inTower(u, v, 1.0)) continue;
        for (const a of [0, Math.PI / 4]) {
          K.box(u, v, 0, 0.78, 0.78, H, C.pillar, C.pillar, a);
          K.box(u, v, 0, 1.0, 1.0, 0.5, C.plinth, C.plinth, a);
          K.box(u, v, H - 0.75, 1.0, 1.0, 0.4, C.pillar, C.pillar, a);
        }
        K.solid(u, v, 1.0, 1.0);
        pillars.push([u, v]);
      }
    // the galleries at 4 m: along the west wall (the organ) and the north wall up to the tower, painted parapets, wooden posts
    const gz = 3.8,
      uG = uW + 3.4,
      vG = vN - 3.0,
      gE = tw ? tw[0] - 0.22 : uE;
    K.box((uW + uG) / 2, (vS + vNx) / 2, gz, uG - uW, vNx - vS + 0.3, 0.22, C.wood, C.woodL);
    K.box(uG, (vS + vG) / 2, gz + 0.22, 0.12, vG - vS, 1.0, C.cream, C.cream);
    K.box(uG + 0.04, (vS + vG) / 2, gz + 1.18, 0.1, vG - vS, 0.06, C.gold);
    K.box(uG + 0.07, (vS + vG) / 2, gz - 0.25, 0.06, vG - vS, 0.25, C.wood);
    K.box((uG + gE) / 2, (vG + vNx + 0.3) / 2, gz, gE - uG, vNx + 0.3 - vG, 0.22, C.wood, C.woodL);
    K.box((uG + gE) / 2, vG, gz + 0.22, gE - uG, 0.12, 1.0, C.cream, C.cream);
    K.box((uG + gE) / 2, vG - 0.04, gz + 1.18, gE - uG, 0.1, 0.06, C.gold);
    K.box((uG + gE) / 2, vG - 0.07, gz - 0.25, gE - uG, 0.06, 0.25, C.wood);
    // the parapets' panels (darker fields)
    for (let u = uG + 0.9; u < gE - 0.5; u += 1.5) K.box(u, vG - 0.07, gz + 0.38, 1.1, 0.02, 0.62, C.woodL);
    for (let v = vS + 0.9; v < vG - 0.5; v += 1.5) K.box(uG + 0.07, v, gz + 0.38, 0.02, 1.1, 0.62, C.woodL);
    for (let v = vS + 2.2; v < vNx - 1; v += 3.4) {
      K.box(uG, v, 0, 0.24, 0.24, gz, C.wood);
      K.solid(uG, v, 0.34, 0.34);
    }
    for (let u = uG + 3.6; u < gE - 0.6; u += 3.6) {
      K.box(u, vG, 0, 0.24, 0.24, gz, C.wood);
      K.solid(u, vG, 0.34, 0.34);
    }
    // the organ on the west gallery: a cream case with gilt edges, three fields of pipes
    const oz = gz + 0.22;
    K.box(uW + 0.8, vm, oz, 1.4, 5.4, 3.9, C.cream, C.gold);
    for (const [dv, wv, hh] of [
      [-1.8, 1.3, 2.7],
      [0, 1.7, 3.3],
      [1.8, 1.3, 2.7],
    ]) {
      const m = wv > 1.5 ? 9 : 7;
      for (let k = 0; k < m; k++) {
        const vv = vm + dv - wv / 2 + (k + 0.5) * (wv / m),
          ph = hh * (0.6 + 0.4 * Math.sin(((k + 0.5) / m) * Math.PI));
        K.box(uW + 1.55, vv, oz + 0.9, 0.12, 0.12, ph, C.pipe, C.pipe);
      }
      K.box(uW + 1.58, vm + dv, oz + 0.9 + hh + 0.05, 0.22, wv + 0.12, 0.3, C.gold);
      K.box(uW + 1.55, vm + dv, oz + 0.55, 0.2, wv + 0.1, 0.35, C.cream, C.gold);
    }
    // pews facing the altar: blocks with the middle aisle and the cross aisle from the portal
    const uP0 = uG + 1.5,
      uP1 = uE - 4.2,
      blocks = [
        [vA + 0.55, vm - 0.8, 'mitte'],
        [vm + 0.8, vB - 0.55, 'mitte'],
        [vS + 1.1, vA - 0.55, 'sued'],
        [vB + 0.55, vG - 0.6, 'nord'],
      ];
    const rows = [],
      seats = [];
    for (const [a, c, k] of blocks) {
      if (c - a < 1.2) continue;
      let run = null;
      const close = () => {
        if (run) K.solid((run[0] + run[1]) / 2 - 0.07, (a + c) / 2, run[1] - run[0] + 0.62, c - a + 0.1);
        run = null;
      };
      for (let u = uP0; u <= uP1; u += 0.95) {
        if (Math.abs(u - du) < 1.6 || (k === 'nord' && inTower(u, c, 0.8))) {
          close();
          continue;
        }
        K.box(u, (a + c) / 2, 0.41, 0.44, c - a, 0.05, C.pewTop, C.pewTop);
        K.box(u, (a + c) / 2, 0.08, 0.04, c - a, 0.33, C.pew);
        K.box(u - 0.24, (a + c) / 2, 0.42, 0.05, c - a, 0.52, C.pew, C.pewTop);
        K.box(u - 0.34, (a + c) / 2, 0.76, 0.17, c - a, 0.03, C.pewTop);
        for (const v of [a, c]) K.box(u - 0.06, v, 0, 0.62, 0.06, 0.98, C.pew, C.pewTop);
        rows.push([u, a, c, k]);
        if (k === 'mitte') seats.push([u, a > vm ? a + 0.32 : c - 0.32]);
        run = run ? [run[0], u] : [u, u];
      }
      close();
    }
    // a runner down the middle aisle and from the portal to it
    K.box((uG + 0.8 + uE - 0.8) / 2, vm, 0, uE - uG - 1.6, 1.15, 0.012, C.red, C.red);
    K.box(du, (vS + 0.4 + vm - 0.6) / 2, 0, 1.1, vm - vS - 1.0, 0.0105, C.red, C.red);
    // the floor's joints (stone slabs of 1.2 m in the nave)
    for (let v = vS + 1.2; v < vNx - 0.2; v += 1.2) K.box((uW + uE) / 2, v, 0, uE - uW, 0.025, 0.006, C.joint, C.joint);
    for (let u = uW + 1.2; u < uE - 0.2; u += 1.2)
      K.box(u, (vS + vNx) / 2, 0, 0.025, vNx - vS, 0.006, C.joint, C.joint);
    // ---- the choir: a step, the altar with cloth, candles and Bible, the altarpiece, the communion rail, the lectern ----
    const uSt = uE - 0.6;
    let choirF = null;
    if (choir) {
      let g = Qf;
      g = LIPLAN.clipHalf(g, -1, 0, -uSt);
      if (g.length) g = LIPLAN.clipHalf(g, 0, -1, -cv0);
      if (g.length) g = LIPLAN.clipHalf(g, 0, 1, cv1);
      choirF = g.length >= 6 ? g : null;
      K.box((uSt + uE) / 2 + 0.02, vm, 0, uE - uSt + 0.04, cv1 - cv0, ZC - 0.006, C.stone, C.stone);
      K.box(uSt + 0.01, vm, ZC - 0.03, 0.04, cv1 - cv0, 0.03, C.joint);
    }
    const aEnd = choir ? uMax : uE,
      aU = aEnd - 1.7,
      az = choir ? ZC : 0;
    K.box(aU, vm, az, 1.0, 2.2, 0.95, C.stone, C.stone);
    K.box(aU, vm, az + 0.95, 1.08, 2.32, 0.025, C.cloth, C.cloth);
    K.box(aU - 0.545, vm, az + 0.6, 0.015, 2.32, 0.375, C.cloth);
    K.box(aU - 0.555, vm, az + 0.18, 0.012, 0.9, 0.62, C.green);
    K.box(aU - 0.56, vm, az + 0.5, 0.012, 0.16, 0.16, C.gold);
    for (const s2 of [-1, 1]) {
      K.box(aU + 0.2, vm + s2 * 0.85, az + 0.975, 0.12, 0.12, 0.05, C.gold);
      K.box(aU + 0.2, vm + s2 * 0.85, az + 1.025, 0.04, 0.04, 0.3, C.gold);
      K.box(aU + 0.2, vm + s2 * 0.85, az + 1.325, 0.05, 0.05, 0.32, C.candle);
      K.glow(aU + 0.2, vm + s2 * 0.85, az + 1.645, 0.03, 0.03, 0.06, C.flame);
    }
    K.box(aU - 0.15, vm - 0.3, az + 0.975, 0.26, 0.36, 0.035, C.red, C.cloth);
    K.solid(aU, vm, 1.2, 2.4);
    // the altarpiece: a wooden frame with pilasters and a gilt crown; its middle the cross (a picture)
    const rU = aEnd - 0.55;
    K.box(rU, vm, az, 0.5, 2.8, 0.95, C.wood, C.woodL);
    for (const s2 of [-1, 1]) {
      K.box(rU - 0.05, vm + s2 * 1.15, az + 0.95, 0.3, 0.32, 2.9, C.woodL, C.gold);
      K.box(rU - 0.1, vm + s2 * 1.15, az + 3.85, 0.36, 0.42, 0.22, C.gold);
    }
    K.box(rU + 0.05, vm, az + 0.95, 0.2, 2.0, 3.12, C.wood, C.gold);
    K.box(rU - 0.05, vm, az + 4.07, 0.36, 2.9, 0.3, C.wood, C.gold);
    K.box(rU - 0.05, vm, az + 4.37, 0.3, 1.2, 0.5, C.gold, C.gold);
    // the communion rail: two halves with a gap, balusters, a red kneeling cushion
    const kU = aU - 1.7;
    for (const [v0, v1] of [
      [vm - 2.4, vm - 0.6],
      [vm + 0.6, vm + 2.4],
    ]) {
      if (choir && (v0 < cv0 + 0.3 || v1 > cv1 - 0.3)) continue;
      K.box(kU, (v0 + v1) / 2, az + 0.8, 0.14, v1 - v0, 0.06, C.woodL, C.woodL);
      K.box(kU, (v0 + v1) / 2, az, 0.12, v1 - v0, 0.08, C.wood);
      for (let v = v0 + 0.1; v < v1; v += 0.22) K.box(kU, v, az + 0.08, 0.05, 0.05, 0.72, C.wood);
      K.box(kU - 0.3, (v0 + v1) / 2, az, 0.34, v1 - v0, 0.14, C.red, C.red);
      K.solid(kU, (v0 + v1) / 2, 0.3, v1 - v0);
    }
    // the lectern at the step's south end, its green cloth
    const lU = uE - 1.0,
      lV = cv0 + 1.0;
    K.box(lU, lV, 0, 0.42, 0.42, 1.0, C.wood);
    K.box(lU, lV, 1.0, 0.56, 0.48, 0.05, C.woodL, C.woodL);
    K.box(lU - 0.23, lV, 0.6, 0.01, 0.44, 0.42, C.green);
    K.box(lU + 0.02, lV, 1.05, 0.3, 0.42, 0.03, C.cloth, C.cloth);
    K.solid(lU, lV, 0.55, 0.55);
    // ---- the pulpit: against the tower's foot (or the last northern pillar), its stair, the sounding board ----
    const pp = tw ? [tw[0] + 2.3, tw[1] - 0.22 - 0.95] : pillars.filter(p => p[1] === vB).pop() || [uE - 3, vB];
    const pU = pp[0],
      pV = tw ? pp[1] : pp[1] - 0.95,
      backV = tw ? tw[1] - 0.22 : pp[1] - 0.4;
    K.box(pU, pV, 0, 0.26, 0.26, 1.7, C.wood);
    K.box(pU, pV, 1.6, 0.5, 0.5, 0.45, C.woodL, C.wood, Math.PI / 4);
    for (let k = 0; k < 3; k++) K.box(pU, pV, 2.05, 1.05, 0.62, 1.0, C.woodL, C.wood, (k * Math.PI) / 3);
    for (let k = 0; k < 3; k++) K.box(pU, pV, 2.95, 1.12, 0.66, 0.08, C.gold, C.gold, (k * Math.PI) / 3);
    K.box(pU, (pV + backV) / 2, 2.05, 0.7, Math.abs(backV - pV), 2.7, C.wood, C.wood);
    for (let k = 0; k < 3; k++) K.box(pU, pV + 0.15, 4.75, 1.35, 0.8, 0.2, C.woodL, C.gold, (k * Math.PI) / 3);
    K.box(pU, pV + 0.15, 4.95, 0.3, 0.3, 0.35, C.gold, C.gold);
    for (let k = 0; k < 7; k++) K.box(pU - 0.85 - k * 0.3, backV - 0.45, 0, 0.3, 0.8, (7 - k) * 0.29, C.wood, C.woodL);
    K.solid(pU, pV, 1.2, 1.2);
    K.solid(pU - 1.75, backV - 0.45, 2.2, 0.85);
    // ---- the font on the south side before the choir: an octagonal basin, its brass lid ----
    const fU = uE - 2.6,
      fV = (choir ? cv0 : vA) + 1.3;
    for (const a of [0, Math.PI / 4]) {
      K.box(fU, fV, 0, 0.72, 0.72, 0.12, C.slab, C.slab, a);
      K.box(fU, fV, 0.12, 0.38, 0.38, 0.62, C.stone, C.stone, a);
      K.box(fU, fV, 0.74, 0.84, 0.84, 0.22, C.stone, L(0.62, 0.6, 0.55), a);
    }
    K.box(fU, fV, 0.96, 0.64, 0.64, 0.04, C.gold, C.gold, Math.PI / 8);
    K.box(fU, fV, 1.0, 0.08, 0.08, 0.12, C.gold);
    K.solid(fU, fV, 0.95, 0.95);
    // ---- by the door: the candle stand, the warden's table with the guest book, the chair ----
    const kU2 = du + 2.3,
      kV = vS + 0.85;
    K.box(kU2, kV, 0, 0.09, 0.09, 0.84, C.iron);
    K.box(kU2, kV, 0, 0.5, 0.36, 0.05, C.iron);
    K.box(kU2, kV, 0.84, 0.96, 0.52, 0.06, C.iron, L(0.74, 0.67, 0.5));
    S.kerzePos = [];
    for (let k = 0; k < 12; k++) S.kerzePos.push([kU2 - 0.38 + (k % 6) * 0.15, kV - 0.12 + Math.floor(k / 6) * 0.24]);
    for (let k = 0; k < 5; k++) {
      const [cu, cvv] = S.kerzePos[2 * k + (k % 2)];
      const hc = 0.08 + (k % 3) * 0.03;
      K.box(cu, cvv, 0.9, 0.045, 0.045, hc, C.candle);
      K.glow(cu, cvv, 0.9 + hc, 0.022, 0.022, 0.045, C.flame);
    }
    K.box(kU2 + 0.62, kV, 0, 0.26, 0.22, 0.95, C.wood, C.gold);
    K.solid(kU2 + 0.15, kV, 1.4, 0.65);
    const tU = du - 2.5,
      tV = vS + 0.75;
    K.box(tU, tV, 0, 1.0, 0.55, 0.74, C.woodL, C.woodL);
    K.box(tU + 0.12, tV, 0.74, 0.34, 0.26, 0.04, C.red, C.cloth);
    for (let k = 0; k < 3; k++)
      K.box(tU - 0.3 + k * 0.03, tV - 0.05, 0.74 + k * 0.006, 0.15, 0.21, 0.006, C.cloth, C.cream);
    K.solid(tU, tV, 1.05, 0.6);
    const chU = tU - 0.85;
    K.box(chU, tV + 0.05, 0, 0.44, 0.44, 0.46, C.wood, C.woodL);
    K.box(chU - 0.2, tV + 0.05, 0.46, 0.05, 0.44, 0.5, C.wood);
    // ---- epitaphs between the south windows: stone slabs with a darker frame ----
    const epitaph = (u, v, f) => {
      K.box(u, v + f * 0.05, 1.15, 1.14, 0.1, 1.76, C.joint, C.joint);
      K.box(u, v + f * 0.12, 1.22, 1.0, 0.06, 1.6, C.slab, C.slab);
      K.box(u, v + f * 0.16, 2.2, 0.5, 0.03, 0.42, C.joint, C.joint);
    };
    for (const k of [1, 3, 4]) {
      const u = k * bay;
      if (u > uG - 0.5 && Math.abs(u - du) > 2.5 && Math.abs(u - kU2) > 1.2 && Math.abs(u - tU) > 1.4 && u < uE - 1)
        epitaph(u, vS, 1);
    }
    for (const k of [1, 2]) if (!inTower(k * bay, vN, 1)) epitaph(k * bay, spanV(Q, k * bay)[1], -1);
    // ---- brass chandeliers over the middle aisle: a ring of candle lights on a rod ----
    for (let k = 1; k + 0.5 < Lw / bay - 1; k++) {
      const u = (k + 0.5) * bay;
      if (u < uG + 1 || u > uE - 1) continue;
      const cz = 5.2;
      K.box(u, vm, cz + 0.1, 0.035, 0.035, H - cz - 0.1, C.iron);
      K.box(u, vm, cz - 0.15, 0.16, 0.16, 0.4, C.gold, C.gold, Math.PI / 4);
      for (let j = 0; j < 8; j++) {
        const a = (j / 8) * Math.PI * 2,
          r = 0.62;
        K.box(u + Math.cos(a) * r, vm + Math.sin(a) * r, cz, 0.06, 0.5, 0.04, C.gold, C.gold, a);
        K.box(u + Math.cos(a) * r * 0.5, vm + Math.sin(a) * r * 0.5, cz + 0.02, r, 0.03, 0.03, C.gold, C.gold, a);
        K.glow(u + Math.cos(a + 0.39) * r, vm + Math.sin(a + 0.39) * r, cz + 0.04, 0.05, 0.05, 0.11, C.bulb);
      }
    }
    // ---- the floors: the nave's (one stone colour, shaded where things stand) and the raised choir's ----
    const zf = () => z,
      A0 = LINNEN.drawPlan ? LINNEN.drawPlan(Pl, F.polyW(Qf), zf) : null;
    const meshes = [];
    const mat = new THREE.MeshBasicMaterial({ vertexColors: true });
    MATS.push(mat);
    if (A0) meshes.push(new THREE.Mesh(A0.geo, mat));
    if (choirF) {
      const Pc = LIPLAN.newPlan({ id: 'kirche-chor', type: 'kirche' });
      Pc.floor = Pl.floor;
      Pc.cell = 1.0;
      const B0 = LINNEN.drawPlan ? LINNEN.drawPlan(Pc, F.polyW(choirF), () => z + ZC) : null;
      if (B0) meshes.push(new THREE.Mesh(B0.geo, mat));
    }
    // ---- the pictures and the ceiling: one mesh on the canvas ----
    pictures();
    const Pp = [],
      Cc = [],
      UV = [],
      I = [];
    let nv = 0;
    const W3 = (u, v, h) => {
      const [x, y] = F.W(u, v);
      return [x, z + h, -y];
    };
    // a picture on a wall: its centre (cu, cv), the way it faces (nu, nv) in the frame, its width and its heights over the floor
    const pic = (k, cu, cvv, nu, nvv, w, h0, h1, glow = 1) => {
      const uv = PICS[k];
      if (!uv) return;
      // the viewer's right (looking at it from the side it faces): (−n_v, n_u)
      const ru = -nvv,
        rv = nu,
        a = [cu - (ru * w) / 2, cvv - (rv * w) / 2],
        c = [cu + (ru * w) / 2, cvv + (rv * w) / 2],
        [U0, V0, U1, V1] = uv;
      for (const [p, h, uu, vv] of [
        [a, h0, U0, V0],
        [c, h0, U1, V0],
        [c, h1, U1, V1],
        [a, h1, U0, V1],
      ]) {
        Pp.push(...W3(p[0], p[1], h));
        Cc.push(glow, glow, glow);
        UV.push(uu, vv);
      }
      I.push(nv, nv + 1, nv + 2, nv, nv + 2, nv + 3);
      nv += 4;
    };
    // the windows where the outside has them (facades over 8 m, every ~5.5 m – as welt/schleusingen.js draws them), on the inner face
    const wins = [];
    for (const f of b.F || []) {
      const Lf = Math.hypot(f[2] - f[0], f[3] - f[1]);
      if (Lf < 8) continue;
      const a = F.L(f[0], f[1]),
        c = F.L(f[2], f[3]),
        du2 = (c[0] - a[0]) / Lf,
        dv2 = (c[1] - a[1]) / Lf,
        nW = Math.floor(Lf / 5.5);
      // inwards: towards the inner outline (the left of a counter-clockwise ring)
      let iu = -dv2,
        iv = du2;
      const m = [(a[0] + c[0]) / 2, (a[1] + c[1]) / 2];
      if (!LIPLAN.inPoly(Qf, m[0] + iu * (T + 0.5), m[1] + iv * (T + 0.5))) {
        iu = -iu;
        iv = -iv;
      }
      for (let k = 0; k < nW; k++) {
        const t = (k + 0.5) * (Lf / nW),
          cu = a[0] + du2 * t + iu * (T + 0.02),
          cvv = a[1] + dv2 * t + iv * (T + 0.02);
        if (inTower(cu, cvv, 0.6)) continue;
        // behind the organ the west windows stay (light behind the case), behind the door's lintel the one over the portal
        wins.push([cu, cvv]);
        pic('fenster', cu, cvv, iu, iv, 1.5, zw, zw + 5.2, 1.3);
      }
    }
    // the choir's windows (the apse's slanting sides), coloured
    if (choir)
      for (let i = 0; i < n; i++) {
        const a = Q[i],
          c = Q[(i + 1) % n],
          l = Math.hypot(c[0] - a[0], c[1] - a[1]);
        if (Math.min(a[0], c[0]) < uE + 1.2 || l < 2.2) continue;
        const du2 = (c[0] - a[0]) / l,
          dv2 = (c[1] - a[1]) / l;
        if (Math.abs(dv2) > 0.95) continue;
        pic(
          'apsis',
          (a[0] + c[0]) / 2 - dv2 * 0.02,
          (a[1] + c[1]) / 2 + du2 * 0.02,
          -dv2,
          du2,
          1.0,
          2.4 + ZC,
          7.6,
          1.3
        );
      }
    // the portal's inside: the door leaf in a stone frame (boxes), the welcome board beside it
    pic('tuer', du, vS + 0.02, 0, 1, 2.0, Math.max(0, b.z0 - z), 3.4 + b.z0 - z, 0.95);
    K.box(du - 1.12, vS + 0.06, 0, 0.24, 0.12, 3.5 + b.z0 - z, C.slab, C.slab);
    K.box(du + 1.12, vS + 0.06, 0, 0.24, 0.12, 3.5 + b.z0 - z, C.slab, C.slab);
    K.box(du, vS + 0.06, 3.4 + b.z0 - z, 2.48, 0.12, 0.3, C.slab, C.slab);
    pic('willkommen', du - 4.0, vS + 0.03, 0, 1, 0.9, 1.15, 2.05);
    if (S.sakristei) pic('tuer', S.sakristei[0], S.sakristei[1], -1, 0, 1.1, 0, 2.25, 0.9);
    // the hymn board on the last southern pillar, towards the pews
    const hp = pillars.filter(p => p[1] === vA).pop();
    if (hp) pic('lieder', hp[0] - 0.58, hp[1], -1, 0, 0.55, 2.4, 3.5);
    // the altarpiece's cross
    pic('kreuz', rU - 0.21, vm, -1, 0, 1.3, az + 1.25, az + 3.85, 1.0);
    // the ceiling: the inner outline as one flat face, seen from below
    {
      const wv = PICS.weiss,
        cu0 = (wv[0] + wv[2]) / 2,
        cv0w = (wv[1] + wv[3]) / 2;
      const tris = THREE.ShapeUtils.triangulateShape(
        Q.map(p => new THREE.Vector2(p[0], p[1])),
        []
      );
      for (const t of tris) {
        let [i0, i1, i2] = t;
        const p0 = Q[i0],
          p1 = Q[i1],
          p2 = Q[i2];
        // seen from below: clockwise in the frame
        if ((p1[0] - p0[0]) * (p2[1] - p0[1]) - (p1[1] - p0[1]) * (p2[0] - p0[0]) > 0) [i1, i2] = [i2, i1];
        for (const i of [i0, i1, i2]) {
          Pp.push(...W3(Q[i][0], Q[i][1], H));
          Cc.push(C.ceil[0], C.ceil[1], C.ceil[2]);
          UV.push(cu0, cv0w);
        }
        I.push(nv, nv + 1, nv + 2);
        nv += 3;
      }
    }
    const g2 = new THREE.BufferGeometry();
    g2.setAttribute('position', new THREE.Float32BufferAttribute(Pp, 3));
    g2.setAttribute('color', new THREE.Float32BufferAttribute(Cc, 3));
    g2.setAttribute('uv', new THREE.Float32BufferAttribute(UV, 2));
    g2.setIndex(I);
    g2.computeBoundingSphere();
    const pm = new THREE.MeshBasicMaterial({ vertexColors: true, map: TEX });
    MATS.push(pm);
    meshes.push(new THREE.Mesh(g2, pm));
    for (const me of meshes) {
      me.name = 'kirche';
      me.userData.noMerge = true;
      me.matrixAutoUpdate = false;
      me.updateMatrix();
      me.visible = S.inside;
      scene.add(me);
      S.meshes.push(me);
    }
    S.segs = segs.concat(Pl.segs);
    S.choirF = choirF;
    S.inDoor = F.W(du, vS + 1.0);
    S.kerzeAt = F.W(kU2, kV + 0.75);
    S.buchAt = F.W(tU, tV + 0.75);
    S.seats = seats.map(([u, v]) => F.W(u, v));
    S.rows = rows.length;
    S.wins = wins.length;
    S.hdU = Math.atan2(F.eu[0], F.eu[1]);
    // ---- people: the warden by the door at weekends; someone sitting quietly now and then; Sundays 10–11 the service ----
    const nearDoor = () => S.inside || Math.hypot(P.x - S.door[0], P.y - S.door[1]) < 14;
    const gd = gottesdienst;
    const [wx, wy] = F.W(chU + 0.02, tV + 0.05);
    LLEBEN.posten({
      id: 'kirche:aufsicht',
      x: wx,
      y: wy,
      hd: S.hdU,
      z: () => z,
      sit: 0.46,
      fig: 'vk_f14',
      near: 40,
      kleid: null,
      offen: () => S.built && nearDoor() && OEFFNUNG.offen('johannis') === true && [0, 6].includes(DCAL.wd()) && !gd(),
    });
    const sr = rows.filter(r => r[3] === 'sued');
    const r0 = sr[Math.floor(sr.length * 0.6)] || rows[Math.floor(rows.length / 2)];
    if (r0) {
      const [bx, by] = F.W(r0[0] - 0.02, (r0[1] + r0[2]) / 2 + 0.4);
      LLEBEN.posten({
        id: 'kirche:stille',
        x: bx,
        y: by,
        hd: S.hdU,
        z: () => z,
        sit: 0.46,
        fig: 'vk_m02',
        near: 40,
        kleid: null,
        offen: () => S.built && nearDoor() && OEFFNUNG.offen('johannis') === true && DCAL.min() % 120 < 75 && !gd(),
      });
    }
    // the service: the pastor at the altar in black, facing the pews; people in the front rows (each figure once)
    const mS = rows.filter(r => r[3] === 'mitte' && r[1] < vm),
      mN = rows.filter(r => r[3] === 'mitte' && r[1] > vm),
      sS = rows.filter(r => r[3] === 'sued'),
      at = (R2, back, side, off) => {
        const r = R2[R2.length - 1 - Math.min(back, R2.length - 1)];
        return r ? F.W(r[0] - 0.02, side > 0 ? r[1] + off : r[2] - off) : null;
      };
    const GD = [
      ['vk_f14', at(mS, 1, -1, 0.45)],
      ['vk_m02', at(mS, 1, -1, 1.05)],
      ['vk_f02', at(mN, 2, 1, 0.5)],
      ['vk_m07', at(mN, 4, 1, 1.2)],
      ['vk_f12', at(mS, 5, 1, 0.6)],
      ['vk_m16', at(sS, 3, 1, 1.6)],
    ];
    GD.forEach(([fig, p], i) => {
      if (!p) return;
      LLEBEN.posten({
        id: 'kirche:gd' + i,
        x: p[0],
        y: p[1],
        hd: S.hdU,
        z: () => z,
        sit: 0.46,
        fig,
        near: 40,
        kleid: null,
        offen: () => S.built && nearDoor() && gd(),
      });
    });
    const [px, py] = F.W(aU - 0.8, vm);
    LLEBEN.posten({
      id: 'kirche:pfarrerin',
      x: px,
      y: py,
      hd: Math.atan2(-F.eu[0], -F.eu[1]),
      z: () => z + az,
      fig: 'vk_f07',
      near: 40,
      kleid: { ober: [26, 26, 30], unter: [26, 26, 30], schuh: [22, 22, 22], arm: true },
      redet: true,
      offen: () => S.built && nearDoor() && gd(),
    });
    S.built = true;
    markDirty(true);
    KERN.emit('kirche', { was: 'gebaut' });
    return true;
  }
  function drop() {
    for (const me of S.meshes) {
      scene.remove(me);
      me.geometry.dispose();
    }
    S.meshes = [];
    if (S.kerzeMesh) {
      scene.remove(S.kerzeMesh);
      S.kerzeMesh.geometry.dispose();
      S.kerzeMesh = null;
    }
    for (const m of MATS) m.dispose();
    MATS.length = 0;
    if (TEX) {
      TEX.dispose();
      TEX = null;
    }
    S.segs = [];
    S.kerzen = 0;
    S.built = false;
    markDirty(true);
  }
  const show = v => {
    for (const me of S.meshes) me.visible = v;
    if (S.kerzeMesh) S.kerzeMesh.visible = v;
    markDirty(true);
  };
  // Sundays 10–11 (the welcome board says so)
  function gottesdienst() {
    return DCAL.wd() === 0 && DCAL.min() >= 600 && DCAL.min() < 660;
  }
  // ---- a candle lit: one more flame in the tray (they burn on while the church stands) ----
  function kerze() {
    if (!S.built || !S.inside) return false;
    if (S.kerzen >= 7) {
      toast('Der Ständer ist voll – es brennen schon viele Kerzen.', 2600);
      return false;
    }
    if (!GELD.zahlen(100, 'Kerze in St. Johannis')) {
      toast('Für eine Kerze fehlt das Kleingeld.', 2600);
      return false;
    }
    S.kerzen++;
    const Pk = LIPLAN.newPlan({ id: 'kerzen', type: 'kirche' }),
      K = LIPLAN.kit(Pk, S.F, 0),
      free = S.kerzePos.filter((p, k) => ![0, 3, 4, 7, 8].includes(k));
    for (let k = 0; k < S.kerzen && k < free.length; k++) {
      const [u, v] = free[k];
      K.box(u, v, 0.9, 0.045, 0.045, 0.13, C.candle);
      K.glow(u, v, 1.03, 0.022, 0.022, 0.045, C.flame);
    }
    const g = LINNEN.drawPlan ? LINNEN.drawPlan(Pk, null, () => S.z) : null;
    if (S.kerzeMesh) {
      scene.remove(S.kerzeMesh);
      S.kerzeMesh.geometry.dispose();
      S.kerzeMesh = null;
    }
    if (g && MATS[0]) {
      S.kerzeMesh = new THREE.Mesh(g.geo, MATS[0]);
      S.kerzeMesh.userData.noMerge = true;
      S.kerzeMesh.visible = S.inside;
      scene.add(S.kerzeMesh);
    }
    KERN.emit('kirche', { was: 'kerze', n: S.kerzen });
    markDirty(true);
    return true;
  }
  // ---- sitting down in a pew (at the middle aisle) ----
  function seatNear(r) {
    if (!S.built || !S.inside || !S.seats) return null;
    let best = null,
      bd = r;
    for (const s of S.seats) {
      const d = Math.hypot(P.x - s[0], P.y - s[1]);
      if (d < bd) {
        bd = d;
        best = s;
      }
    }
    return best;
  }
  function sitzen(s) {
    s = s || seatNear(3);
    if (!s || PLAY.seated()) return false;
    const yaw = ((S.hdU * 180) / Math.PI + 360) % 360;
    const ok = PLAY.sit({
      x: s[0],
      y: s[1],
      eye: S.z + 0.46 + 0.78,
      yaw,
      pitch: -2,
      kind: 'sit',
      onSit: () => {
        S.gesessen++;
        KERN.emit('kirche', { was: 'sitzen' });
      },
    });
    return !!ok;
  }
  // ---- inside: where, walls, floor, the place's name ----
  function where(x, y) {
    if (!S.built) return null;
    const [u, v] = S.F.L(x, y);
    if (S.choirF && LIPLAN.inPoly(S.choirF, u, v)) return 'chor';
    if (LIPLAN.inPoly(S.Qf, u, v)) return 'schiff';
    return null;
  }
  KERN.provide(
    'pushOut',
    (p, r) => {
      if (!S.built || !S.inside) return undefined;
      let moved = false;
      for (const s of S.segs) {
        const ex = s[2] - s[0],
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
      return moved;
    },
    18
  );
  KERN.provide(
    'ground',
    (x, y) => {
      if (!S.inside) return undefined;
      const w = where(x, y);
      return w ? S.z + (w === 'chor' ? 0.184 : 0.004) : undefined;
    },
    12
  );
  KERN.provide('inside', (x, y) => (S.inside && where(x, y) ? true : undefined), 12);
  KERN.provide('place', (x, y) => (S.inside && where(x, y) ? 'Stadtkirche St. Johannis, Schleusingen' : undefined), 36);
  // ---- in and out ----
  let fadeD = null;
  const fade = async v => {
    if (!fadeD) {
      fadeD = document.createElement('div');
      fadeD.style.cssText =
        'position:absolute;inset:0;background:#000;opacity:0;pointer-events:none;z-index:8;transition:opacity .3s';
      (document.getElementById('stage') || document.body).appendChild(fadeD);
    }
    fadeD.style.opacity = v ? '1' : '0';
    if (!window.FREEZE) await new Promise(r => setTimeout(r, 320));
  };
  function put(x, y, z, yaw) {
    if (PLAY.seated()) PLAY.stand(true);
    P.mode = 'walk';
    P.x = x;
    P.y = y;
    P.feet = z;
    P.vz = 0;
    P.yaw = P.body = yaw;
    P.air = false;
    markDirty(true);
  }
  const deg = (dx, dy) => ((Math.atan2(dx, dy) * 180) / Math.PI + 360) % 360;
  async function betreten() {
    if (S.busy || !S.built) return false;
    if (!OEFFNUNG.offen('johannis')) {
      toast('St. Johannis ist jetzt zu – ' + OEFFNUNG.text('johannis') + '.', 3600);
      return false;
    }
    S.busy = true;
    await fade(true);
    S.inside = true;
    show(true);
    put(S.inDoor[0], S.inDoor[1], S.z, deg(S.F.ev[0], S.F.ev[1]));
    await fade(false);
    S.busy = false;
    KERN.emit('kirche', { was: gottesdienst() ? 'gottesdienst' : 'betreten' });
    return true;
  }
  async function verlassen() {
    if (S.busy || !S.built) return false;
    S.busy = true;
    await fade(true);
    S.inside = false;
    show(false);
    const [ox, oy] = S.F.W(S.du, -1.8),
      zz = KERN.ground(ox, oy);
    put(ox, oy, Number.isFinite(zz) ? zz : S.z, deg(-S.F.ev[0], -S.F.ev[1]));
    LKAUF.close();
    await fade(false);
    S.busy = false;
    KERN.emit('kirche', { was: 'verlassen' });
    return true;
  }
  // ---- the action buttons ----
  const zAt = () => S.z + 1.1;
  KERN.act({
    id: 'kirche:tuer',
    r: 2.6,
    prio: 0.5,
    pos: () => {
      if (!S.built || S.inside) return null;
      const [x, y] = S.F.W(S.du, -0.7);
      return [x, y, S.zOut + 1.1];
    },
    label: () =>
      !S.built || S.inside
        ? null
        : OEFFNUNG.offen('johannis')
          ? gottesdienst()
            ? 'St. Johannis – Gottesdienst, leise hineingehen'
            : 'Stadtkirche St. Johannis – hineingehen'
          : 'St. Johannis – geschlossen (' + OEFFNUNG.zeiten('johannis') + ')',
    run: () => betreten(),
  });
  KERN.act({
    id: 'kirche:raus',
    r: 1.6,
    prio: 0.5,
    pos: () => (S.inside ? [S.inDoor[0], S.inDoor[1], zAt()] : null),
    label: () => (S.inside && !S.busy ? 'Hinausgehen' : null),
    run: () => verlassen(),
  });
  KERN.act({
    id: 'kirche:kerze',
    r: 1.5,
    prio: 0.6,
    pos: () => (S.inside ? [S.kerzeAt[0], S.kerzeAt[1], zAt()] : null),
    label: () => (S.inside ? 'Eine Kerze anzünden · 1,00 €' : null),
    run: () => {
      if (kerze()) toast('Die Kerze brennt.', 2200);
    },
  });
  KERN.act({
    id: 'kirche:gaestebuch',
    r: 1.4,
    prio: 0.4,
    pos: () => (S.inside ? [S.buchAt[0], S.buchAt[1], zAt()] : null),
    label: () => (S.inside ? 'Ins Gästebuch schreiben' : null),
    run: () => {
      toast('Ein paar Zeilen ins Gästebuch: „Danke für die offene Kirche.“', 3600);
      KERN.emit('kirche', { was: 'gaestebuch' });
    },
  });
  KERN.act({
    id: 'kirche:sitzen',
    r: 1.3,
    prio: 0.3,
    pos: () => {
      const s = PLAY.seated() ? null : seatNear(2.0);
      return s ? [s[0], s[1], S.z + 0.9] : null;
    },
    label: () => (S.inside && !PLAY.seated() ? 'In die Bank setzen – einen Moment Ruhe' : null),
    run: () => sitzen(),
  });
  // ---- the round ----
  let acc = 0;
  KERN.tick(dt => {
    acc += dt;
    if (acc < 1) return;
    acc = 0;
    try {
      const b = church();
      if (!b) {
        if (S.built && !S.inside) drop();
        return;
      }
      const near = Math.hypot(P.x - b.cx, P.y - b.cy);
      if (S.inside && !S.busy && !PLAY.seated() && !where(P.x, P.y)) {
        S.inside = false;
        show(false);
      }
      if (!S.built && !S.failed && near < 90) {
        // a build that fails half-way is cleared and not tried again (no meshes stacked up each second)
        try {
          build();
        } catch (e) {
          S.failed = true;
          drop();
          throw e;
        }
      } else if (S.built && !S.inside && near > 150) drop();
    } catch (e) {
      S.err = String((e && e.message) || e).slice(0, 120);
    }
  }, 'kirche');
  S.status = () => ({
    built: S.built,
    failed: S.failed,
    inside: S.inside,
    err: S.err,
    meshes: S.meshes.length,
    visible: S.meshes.some(m => m.visible),
    kerzen: S.kerzen,
    rows: S.rows || 0,
    wins: S.wins || 0,
    seats: S.seats ? S.seats.length : 0,
    tower: !!S.tw,
    gottesdienst: gottesdienst(),
    door: S.door ? S.door.map(v => +v.toFixed(2)) : null,
  });
  Object.assign(S, { betreten, verlassen, kerze, sitzen, where, build, drop, gottesdienst });
  return S;
})();
window.KIRCHE = KIRCHE;
