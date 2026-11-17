// ===================== feat/laeden-leben 10: the Naturhistorisches Museum in the Bertholdsburg – ticket desk and one exhibition room (MUSEUM) =====================
// The brief (realismus1-laeden.md): „the Bertholdsburg with its museum (the real Naturhistorisches Museum – an entrance hall, a ticket desk,
// one exhibition room with a few exhibits and a text each)“. The real museum (museum-schleusingen.de, 11/2026): Tuesday to Friday 9–17,
// weekends 10–18 (OEFFNUNG 'museum'), adults 6 €, reduced 4 €, the tower 2 €; its themes – minerals and rocks of Thuringia with the
// „Schneekopfkugeln“, „300 Millionen Jahre Thüringen“ (fossils, the landscapes of the past), the history of the castle and the counts of
// Henneberg. Here: at the castle's door towards the town (the facade nearest the information board east of it) one goes in (a short
// fade, as into the houses); inside, within the castle's walls, an entrance hall with the ticket desk (the cashier at the museum's
// hours, LLEBEN.posten), and through an opening the exhibition room – vitrines with minerals and the Schneekopfkugeln, a slab of
// Muschelkalk with ceratites, a painting of Thuringia 300 million years ago, the Henneberg arms with the castle's story; each with a
// text (the action button: „Ansehen …“). Without a ticket the attendant sends one back to the desk. Drawn with the shops' kit
// (laeden/innen.js LINNEN.drawPlan: unlit, light baked in) and pictures from a canvas on the printed goods' program – nothing new to
// compile; built within 70 m of the door, freed beyond 130 m.
//   MUSEUM.status() · MUSEUM.betreten() · MUSEUM.verlassen() · MUSEUM.karte() (buy a ticket) · MUSEUM.EXPONATE · events KERN 'museum'
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
import { INVENTAR } from './inventar.js';
import { WAREN } from './waren.js';
import { LIPLAN } from '../laeden/innen_plan.js';
import { LINNEN } from '../laeden/innen.js';
import { LLEBEN } from '../laeden/leben.js';
import { LKAUF } from '../laeden/kauf.js';
export const MUSEUM = (() => {
  const S = {
    built: false,
    inside: false,
    err: '',
    segs: [],
    meshes: [],
    F: null,
    door: null,
    z: 0,
    rooms: [],
    busy: false,
  };
  const { L } = LIPLAN;
  const C = {
    floor: L(0.62, 0.52, 0.4), // old oak boards
    floorB: L(0.58, 0.48, 0.37),
    wall: L(0.9, 0.88, 0.82),
    skirt: L(0.32, 0.28, 0.24),
    ceil: L(0.93, 0.92, 0.88),
    beam: L(0.4, 0.3, 0.22),
    desk: L(0.45, 0.33, 0.24),
    deskTop: L(0.78, 0.76, 0.72),
    plinth: L(0.22, 0.24, 0.27),
    glass: L(0.55, 0.6, 0.62),
    vit: L(0.85, 0.85, 0.83),
    lamp: [2.4, 2.35, 2.2],
    bench: L(0.3, 0.22, 0.16),
    stone: L(0.66, 0.62, 0.55),
  };
  // ---- the exhibits: what one sees and reads (the museum's themes; the texts general, as on a museum's board) ----
  const EXPONATE = [
    {
      id: 'minerale',
      titel: 'Mineralien aus Thüringen',
      text: 'Rund tausend Minerale und Gesteine zeigt das Museum – viele aus Thüringen: Flussspat, Quarz und Amethyst, Kalkspat, Erze aus dem Thüringer Wald. Sie erzählen, wie das Gebirge entstanden ist: aus Vulkanen, aus heißen Lösungen in Spalten, aus Meeren, die kamen und gingen.',
    },
    {
      id: 'kugeln',
      titel: 'Schneekopfkugeln',
      text: 'Die Schneekopfkugeln stammen aus dem vulkanischen Gestein am Schneekopf im Thüringer Wald. Außen unscheinbar und rau, zeigen sie aufgeschnitten Achat, Quarz und Hohlräume mit Kristallen – Blasen in erkalteter Lava, die sich über lange Zeit gefüllt haben.',
    },
    {
      id: 'ceratiten',
      titel: 'Muschelkalk mit Ceratiten',
      text: 'Vor rund 240 Millionen Jahren lag über Thüringen ein flaches, warmes Meer. In seinem Kalkschlamm wurden Muscheln und Ceratiten – Verwandte der Ammoniten mit gekammertem Gehäuse – zu Stein. Der Muschelkalk prägt bis heute viele Hänge in Thüringen.',
    },
    {
      id: 'landschaft',
      titel: '300 Millionen Jahre Thüringen',
      text: 'Vor etwa 300 Millionen Jahren, im Karbon und Perm, wuchsen hier in feuchten Senken Baumfarne und Schachtelhalme, so hoch wie Bäume. Aus ihnen wurde Kohle; in Seen und Sümpfen lebten Amphibien und frühe Reptilien. Später folgten Wüsten, Meere und die Zeit der Saurier.',
    },
    {
      id: 'henneberg',
      titel: 'Die Bertholdsburg und die Grafen von Henneberg',
      text: 'Die Bertholdsburg war über Jahrhunderte Sitz der Grafen von Henneberg-Schleusingen; ihren Namen hat sie von Graf Berthold VII. Im Wappen der Henneberger steht eine schwarze Henne auf einem grünen Dreiberg. Heute sind in den alten Räumen das Naturhistorische Museum und die Geschichte der Burg zu Hause.',
    },
  ];
  // ---- the pictures: one canvas, drawn once ----
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
    // the painting: Thuringia 300 million years ago (a swamp, tree ferns, horsetails, a lake, a low sun)
    cell('landschaft', 0, 0, 0.5, 0.375, (w, h) => {
      const g = q.createLinearGradient(0, 0, 0, h);
      g.addColorStop(0, '#e9d7a8');
      g.addColorStop(0.55, '#c9c08a');
      g.addColorStop(1, '#4d5a2c');
      q.fillStyle = g;
      q.fillRect(0, 0, w, h);
      q.fillStyle = '#f6e7b8';
      q.beginPath();
      q.arc(w * 0.72, h * 0.3, h * 0.08, 0, Math.PI * 2);
      q.fill();
      q.fillStyle = '#6f8f86';
      q.fillRect(0, h * 0.62, w, h * 0.12);
      for (let i = 0; i < 9; i++) {
        const x = (i + 0.5) * (w / 9) + Math.sin(i * 3.1) * 18,
          top = h * (0.18 + 0.12 * ((i * 7) % 3));
        q.strokeStyle = '#3d3122';
        q.lineWidth = 7;
        q.beginPath();
        q.moveTo(x, h * 0.78);
        q.lineTo(x + 6, top);
        q.stroke();
        q.strokeStyle = '#2f4a1e';
        q.lineWidth = 5;
        for (let k = 0; k < 9; k++) {
          const a = (k / 9) * Math.PI * 2;
          q.beginPath();
          q.moveTo(x + 6, top);
          q.quadraticCurveTo(
            x + 6 + Math.cos(a) * 40,
            top - 20 + Math.sin(a) * 10,
            x + 6 + Math.cos(a) * 70,
            top + 25 + Math.abs(Math.sin(a)) * 30
          );
          q.stroke();
        }
      }
      q.fillStyle = '#3a4a22';
      for (let i = 0; i < 40; i++) q.fillRect((i / 40) * w, h * 0.74 - (i % 4) * 9, 6, 60);
      q.fillStyle = '#2a2a20';
      q.beginPath();
      q.ellipse(w * 0.42, h * 0.8, 46, 12, 0, 0, Math.PI * 2);
      q.fill();
      q.fillRect(w * 0.42 + 36, h * 0.8 - 4, 40, 6);
      q.strokeStyle = '#6b5532';
      q.lineWidth = 14;
      q.strokeRect(7, 7, w - 14, h - 14);
    });
    // a slab of Muschelkalk with ceratites
    cell('ceratiten', 0.5, 0, 0.25, 0.25, (w, h) => {
      q.fillStyle = '#b8ad96';
      q.fillRect(0, 0, w, h);
      for (let i = 0; i < 400; i++) {
        q.fillStyle = `rgba(${90 + ((i * 37) % 60)},${84 + ((i * 17) % 50)},${70 + ((i * 29) % 40)},0.25)`;
        q.fillRect((i * 97) % w, (i * 53) % h, 3, 3);
      }
      for (const [cx, cy, r] of [
        [70, 80, 48],
        [180, 150, 38],
        [90, 190, 26],
      ]) {
        q.strokeStyle = '#6e6252';
        q.lineWidth = 4;
        for (let k = 0; k < 4; k++) {
          q.beginPath();
          q.arc(cx, cy, r * (1 - k * 0.22), 0.2, Math.PI * 2 - 0.2);
          q.stroke();
        }
        q.lineWidth = 2;
        for (let k = 0; k < 14; k++) {
          const a = (k / 14) * Math.PI * 2;
          q.beginPath();
          q.moveTo(cx + Math.cos(a) * r * 0.35, cy + Math.sin(a) * r * 0.35);
          q.lineTo(cx + Math.cos(a) * r, cy + Math.sin(a) * r);
          q.stroke();
        }
      }
    });
    // a Schneekopfkugel cut open: agate rings, a cavity with crystals
    cell('kugel', 0.75, 0, 0.25, 0.25, (w, h) => {
      q.fillStyle = '#2b2b2e';
      q.fillRect(0, 0, w, h);
      const cx = w / 2,
        cy = h / 2;
      const cols = ['#7b5a4a', '#c9b8a6', '#8e7a6e', '#e2d9cf', '#6f8a9a', '#d8e4ea', '#a07a5e'];
      for (let k = 0; k < 7; k++) {
        q.fillStyle = cols[k];
        q.beginPath();
        q.ellipse(cx, cy, w * 0.45 * (1 - k * 0.12), h * 0.42 * (1 - k * 0.12), 0.3, 0, Math.PI * 2);
        q.fill();
      }
      q.fillStyle = '#f4f7fa';
      for (let i = 0; i < 18; i++) {
        const a = (i / 18) * Math.PI * 2;
        q.beginPath();
        q.moveTo(cx, cy);
        q.lineTo(cx + Math.cos(a) * 26, cy + Math.sin(a) * 20);
        q.lineTo(cx + Math.cos(a + 0.15) * 14, cy + Math.sin(a + 0.15) * 10);
        q.fill();
      }
    });
    // the Henneberg arms: on gold a black hen on a green triple mount
    cell('wappen', 0.5, 0.25, 0.25, 0.25, (w, h) => {
      q.fillStyle = '#e8e2d2';
      q.fillRect(0, 0, w, h);
      q.fillStyle = '#d6a922';
      q.beginPath();
      q.moveTo(w * 0.15, h * 0.1);
      q.lineTo(w * 0.85, h * 0.1);
      q.lineTo(w * 0.85, h * 0.55);
      q.quadraticCurveTo(w * 0.85, h * 0.85, w * 0.5, h * 0.95);
      q.quadraticCurveTo(w * 0.15, h * 0.85, w * 0.15, h * 0.55);
      q.closePath();
      q.fill();
      q.fillStyle = '#2e7a2e';
      for (const [x, r] of [
        [0.33, 0.13],
        [0.5, 0.17],
        [0.67, 0.13],
      ]) {
        q.beginPath();
        q.arc(w * x, h * 0.86, w * r, Math.PI, 0);
        q.fill();
      }
      q.fillStyle = '#141414';
      q.beginPath();
      q.ellipse(w * 0.5, h * 0.55, w * 0.15, h * 0.11, -0.2, 0, Math.PI * 2);
      q.fill();
      q.beginPath();
      q.arc(w * 0.64, h * 0.38, w * 0.055, 0, Math.PI * 2);
      q.fill();
      q.beginPath();
      q.moveTo(w * 0.36, h * 0.5);
      q.quadraticCurveTo(w * 0.24, h * 0.32, w * 0.3, h * 0.26);
      q.quadraticCurveTo(w * 0.38, h * 0.4, w * 0.42, h * 0.48);
      q.fill();
      q.fillStyle = '#c0281d';
      q.fillRect(w * 0.62, h * 0.31, w * 0.05, h * 0.03);
      q.fillStyle = '#d6a922';
      q.beginPath();
      q.moveTo(w * 0.69, h * 0.38);
      q.lineTo(w * 0.75, h * 0.39);
      q.lineTo(w * 0.69, h * 0.41);
      q.fill();
      q.strokeStyle = '#141414';
      q.lineWidth = 5;
      q.beginPath();
      q.moveTo(w * 0.47, h * 0.65);
      q.lineTo(w * 0.46, h * 0.73);
      q.moveTo(w * 0.55, h * 0.65);
      q.lineTo(w * 0.56, h * 0.73);
      q.stroke();
    });
    // the boards with the texts: title and paragraph, as on a museum's wall
    const board = (k, x, y, ex) =>
      cell(k, x, y, 0.25, 0.25, (w, h) => {
        q.fillStyle = '#f3efe6';
        q.fillRect(0, 0, w, h);
        q.fillStyle = '#5b2a1a';
        q.fillRect(0, 0, w, 10);
        q.fillStyle = '#2a2420';
        q.font = '700 19px ' + FONT;
        q.textBaseline = 'top';
        let yy = 22;
        for (const line of wrap(q, ex.titel, w - 28)) {
          q.fillText(line, 14, yy);
          yy += 23;
        }
        q.font = '400 12.5px ' + FONT;
        yy += 6;
        for (const line of wrap(q, ex.text, w - 28)) {
          if (yy > h - 16) break;
          q.fillText(line, 14, yy);
          yy += 16;
        }
      });
    EXPONATE.forEach((ex, i) => board('text_' + ex.id, (i % 4) * 0.25, 0.5 + Math.floor(i / 4) * 0.25, ex));
    // the opening hours at the desk
    cell('preise', 0.75, 0.25, 0.25, 0.25, (w, h) => {
      q.fillStyle = '#2d2a27';
      q.fillRect(0, 0, w, h);
      q.fillStyle = '#f2ece0';
      q.font = '700 22px ' + FONT;
      q.textBaseline = 'top';
      q.fillText('Eintritt', 18, 18);
      q.font = '400 16px ' + FONT;
      const L2 = [
        'Erwachsene  6,00 €',
        'Ermäßigt  4,00 €',
        'Familienkarte  14,00 €',
        'Turm  2,00 €',
        '',
        'Di–Fr  9–17 Uhr',
        'Sa, So  10–18 Uhr',
      ];
      L2.forEach((t, i) => q.fillText(t, 18, 56 + i * 24));
    });
    TEX = new THREE.CanvasTexture(cv);
    TEX.colorSpace = THREE.SRGBColorSpace;
    TEX.anisotropy = 4;
    return TEX;
  }
  function wrap(q, t, w) {
    const out = [];
    let line = '';
    for (const word of t.split(' ')) {
      const test = line ? line + ' ' + word : word;
      if (q.measureText(test).width > w && line) {
        out.push(line);
        line = word;
      } else line = test;
    }
    if (line) out.push(line);
    return out;
  }
  // ---- where: the castle's outer facade nearest the information board east of it (towards the town) ----
  const castle = () => (SCHL && SCHL.state === 'ready' ? (SCHL.bld || []).find(b => b.lm === 'burg') : null);
  const BOARD = [-1260.0, 1179.0];
  function site(b) {
    // the outline's edge nearest the board, its middle part; inward = towards the outline's centre side
    const f = b.f,
      n = f.length / 2;
    let best = null;
    for (let i = 0; i < n; i++) {
      const ax = f[2 * i],
        ay = f[2 * i + 1],
        bx = f[(2 * i + 2) % f.length],
        by = f[(2 * i + 3) % f.length],
        Lg = Math.hypot(bx - ax, by - ay);
      if (Lg < 9) continue;
      const t = Math.max(0.3, Math.min(0.7, ((BOARD[0] - ax) * (bx - ax) + (BOARD[1] - ay) * (by - ay)) / (Lg * Lg))),
        px = ax + (bx - ax) * t,
        py = ay + (by - ay) * t,
        d = Math.hypot(BOARD[0] - px, BOARD[1] - py);
      if (!best || d < best.d) best = { d, px, py, ux: (bx - ax) / Lg, uy: (by - ay) / Lg, L: Lg };
    }
    if (!best) return null;
    // inward: the side where the outline is
    let ix = -best.uy,
      iy = best.ux;
    if (!LIPLAN.inPoly(f, best.px + ix * 1.5, best.py + iy * 1.5)) {
      ix = -ix;
      iy = -iy;
    }
    const F = LIPLAN.frame([best.px, best.py], [iy, -ix]);
    return { F, door: [best.px, best.py], n: [-ix, -iy] };
  }
  // the rooms in the frame (u along the facade, v inward): fit them between the facade and the courtyard
  function fitRooms(b, F) {
    const ok = (u, v) => {
      const [x, y] = F.W(u, v);
      return LIPLAN.inPoly(b.f, x, y) && !(b.h || []).some(h => LIPLAN.inPoly(h, x, y));
    };
    let D = 0.5;
    while (D < 10 && ok(0, D + 0.5) && ok(-3, D + 0.5) && ok(3, D + 0.5)) D += 0.5;
    D = Math.min(9, D - 0.4);
    if (D < 5) return null;
    // the exhibition room to whichever side has room for 11 m
    const side = [1, -1].find(s => [4, 8, 12, 15].every(u => ok(s * u, 0.6) && ok(s * u, D - 0.2))) || 0;
    if (!side) return null;
    const hall = side > 0 ? [-3.4, 0.35, 3.4, Math.min(D, 6.2)] : [-3.4, 0.35, 3.4, Math.min(D, 6.2)],
      room = side > 0 ? [3.65, 0.35, 15.2, D] : [-15.2, 0.35, -3.65, D];
    return { D, side, hall, room };
  }
  // ---- building ----
  const MATS = [];
  function build() {
    const b = castle();
    if (!b) return false;
    const st = site(b);
    if (!st) return ((S.err = 'no facade'), false);
    const R = fitRooms(b, st.F);
    if (!R) return ((S.err = 'no room in the wing'), false);
    const F = st.F,
      zOut = KERN.ground(st.door[0] + st.n[0] * 1.2, st.door[1] + st.n[1] * 1.2);
    // the floor over the ground inside the wing (the castle stands on a spur: the ground rises towards the courtyard – CI picture
    // museum_halle showed grass through the floor), a step up from the door
    let zIn = Number.isFinite(zOut) ? zOut : b.z0;
    for (const [u0, v0, u1, v1] of [R.hall, R.room])
      for (let i = 0; i <= 4; i++)
        for (let j = 0; j <= 3; j++) {
          const g = KERN.ground(...F.W(u0 + ((u1 - u0) * i) / 4, v0 + ((v1 - v0) * j) / 3));
          if (Number.isFinite(g) && g > zIn) zIn = g;
        }
    const z = zIn + 0.15,
      H = 3.7;
    S.F = F;
    S.z = z;
    S.R = R;
    S.door = st.door;
    S.n = st.n;
    const Pl = LIPLAN.newPlan({ id: 'museum', type: 'museum' });
    Pl.floor = { floorA: C.floor, floorB: C.floorB };
    Pl.cell = 0.9;
    const K = LIPLAN.kit(Pl, F, 0);
    const segs = [];
    const seg = (u0, v0, u1, v1) => {
      const [ax, ay] = F.W(u0, v0),
        [bx, by] = F.W(u1, v1);
      segs.push([ax, ay, bx, by]);
    };
    // walls of the two rooms (boxes 0.2 thick inside the rectangles), the door gap in the facade wall, the opening between them
    const wall = (u0, v0, u1, v1, gaps = []) => {
      const alongU = Math.abs(v1 - v0) < 1e-6,
        a0 = alongU ? u0 : v0,
        a1 = alongU ? u1 : v1;
      let cur = a0;
      for (const [g0, g1] of gaps.concat([[a1, a1]])) {
        if (g0 > cur + 0.05) {
          const m = (cur + g0) / 2,
            l = g0 - cur;
          if (alongU) {
            K.box(m, v0, 0, l, 0.2, H, C.wall, C.wall);
            K.box(m, v0, 0, l, 0.22, 0.12, C.skirt);
            seg(cur, v0, g0, v0);
          } else {
            K.box(u0, m, 0, 0.2, l, H, C.wall, C.wall);
            K.box(u0, m, 0, 0.22, l, 0.12, C.skirt);
            seg(u0, cur, u0, g0);
          }
        }
        // a lintel over the gap
        if (g1 > g0 + 0.05 && g1 < a1 + 1e-6) {
          const m = (g0 + g1) / 2,
            l = g1 - g0;
          if (alongU) K.box(m, v0, 2.4, l, 0.2, H - 2.4, C.wall, C.wall);
          else K.box(u0, m, 2.4, 0.2, l, H - 2.4, C.wall, C.wall);
        }
        cur = g1;
      }
    };
    const [h0, hv0, h1, hv1] = R.hall,
      [r0, rv0, r1, rv1] = R.room;
    const between = R.side > 0 ? h1 + 0.125 : h0 - 0.125;
    wall(h0, hv0, h1, hv0, [[-0.75, 0.75]]);
    // the door itself stops one (out through the action button, as at the houses)
    seg(-0.75, hv0, 0.75, hv0);
    wall(h0, hv1, h1, hv1);
    wall(R.side > 0 ? h0 : h1, hv0, R.side > 0 ? h0 : h1, hv1);
    wall(between, hv0, between, Math.max(hv1, rv1), [[1.4, 3.4]]);
    wall(r0, rv0, r1, rv0);
    wall(r0, rv1, r1, rv1);
    wall(R.side > 0 ? r1 : r0, rv0, R.side > 0 ? r1 : r0, rv1);
    // ceilings with beams, light panels
    for (const [u0, v0, u1, v1] of [R.hall, R.room]) {
      K.box((u0 + u1) / 2, (v0 + v1) / 2, H, u1 - u0, v1 - v0, 0.12, C.ceil, C.ceil);
      for (let u = u0 + 1.2; u < u1 - 0.6; u += 1.8) K.box(u, (v0 + v1) / 2, H - 0.22, 0.18, v1 - v0, 0.22, C.beam);
      for (let u = u0 + 2.1; u < u1 - 1; u += 3.6) K.light(u, (v0 + v1) / 2, H - 0.25, 0.3, Math.min(4, v1 - v0 - 1.5));
    }
    // ---- the entrance hall: the ticket desk, the price board, a bench, a coat stand, postcards ----
    const du = R.side > 0 ? h0 + 1.6 : h1 - 1.6,
      dv = hv1 - 1.6;
    K.box(du, dv, 0, 2.2, 0.7, 1.0, C.desk, C.deskTop);
    K.box(du, dv - 0.05, 1.0, 2.3, 0.8, 0.04, C.deskTop);
    // the till's screen on its foot, turned to the cashier, and a card terminal
    K.box(du + 0.55, dv + 0.12, 1.04, 0.16, 0.12, 0.08, L(0.1, 0.1, 0.11));
    K.box(du + 0.55, dv + 0.12, 1.12, 0.42, 0.035, 0.28, L(0.1, 0.1, 0.11), L(0.1, 0.1, 0.11), 0.12);
    K.box(du - 0.35, dv - 0.15, 1.04, 0.09, 0.16, 0.04, L(0.16, 0.16, 0.17), L(0.3, 0.32, 0.35));
    K.solid(du, dv, 2.3, 0.8);
    K.spot('kasse', du, dv + 0.75, [0, -1]);
    K.spot('kunde', du, dv - 0.85, [0, 1]);
    K.box(R.side > 0 ? h1 - 1.2 : h0 + 1.2, hv0 + 1.2, 0, 1.6, 0.42, 0.45, C.bench, C.bench);
    K.solid(R.side > 0 ? h1 - 1.2 : h0 + 1.2, hv0 + 1.2, 1.6, 0.45);
    const cu = R.side > 0 ? h1 - 0.5 : h0 + 0.5;
    K.box(cu, hv1 - 0.6, 0, 0.5, 0.9, 1.5, L(0.36, 0.3, 0.24));
    K.solid(cu, hv1 - 0.6, 0.55, 0.95);
    K.sign(['Naturhistorisches Museum', 'Schloss Bertholdsburg'], 0, hv1 - 0.12, 2.3, 3.2, 0.7, -1, 1);
    K.sign(['Ausstellung →'], between - (R.side > 0 ? 0.6 : -0.6), 2.4, 2.6, 1.3, 0.3, -1, 3);
    // ---- the exhibition room: vitrines on plinths, the slab, the painting, the arms, the boards ----
    const RU = (k, n) => r0 + ((r1 - r0) * (k + 0.5)) / n;
    const vits = [];
    const vitrine = (u, v, w, d, what) => {
      K.box(u, v, 0, w, d, 0.82, C.plinth, C.vit);
      // the glass's edges only (a pane would hide what lies behind it, as at the shops' counters)
      for (const [su, sv] of [
        [-1, -1],
        [1, -1],
        [-1, 1],
        [1, 1],
      ])
        K.box(u + (su * (w - 0.03)) / 2, v + (sv * (d - 0.03)) / 2, 0.82, 0.025, 0.025, 0.5, C.glass);
      K.box(u, v, 1.32, w, d, 0.025, C.glass, C.glass);
      K.solid(u, v, w + 0.1, d + 0.1);
      vits.push({ u, v, w, d, what });
    };
    vitrine(RU(0, 3), rv0 + 2.6, 1.6, 0.9, 'minerale');
    vitrine(RU(1, 3), rv0 + 2.6, 1.6, 0.9, 'minerale');
    vitrine(RU(2, 3), rv0 + 2.6, 1.6, 0.9, 'kugeln');
    // minerals: crystals on little stands (amethyst, fluorite, pyrite, quartz, calcite)
    const MIN = [
      L(0.45, 0.25, 0.6),
      L(0.3, 0.6, 0.45),
      L(0.8, 0.68, 0.25),
      L(0.92, 0.92, 0.95),
      L(0.85, 0.75, 0.6),
      L(0.5, 0.3, 0.55),
    ];
    for (const vt of vits.filter(q => q.what === 'minerale'))
      for (let i = 0; i < 6; i++) {
        const u = vt.u - vt.w / 2 + 0.2 + (i % 3) * ((vt.w - 0.4) / 2),
          v = vt.v + (i < 3 ? -0.2 : 0.2),
          c = MIN[(i + Math.round(vt.u)) % MIN.length];
        K.box(u, v, 0.82, 0.12, 0.12, 0.04, L(0.2, 0.2, 0.2));
        K.box(u, v, 0.86, 0.09, 0.07, 0.12, c, c, 0.4 + i);
        K.box(u + 0.02, v + 0.01, 0.86, 0.05, 0.05, 0.17, c, c, 0.9 + i);
      }
    // the room's exhibits on the back wall: the painting, the slab, the arms, a board beside each
    const back = rv1 - 0.12;
    const wallPics = [
      ['landschaft', RU(1, 3), 2.1, 1.25, 1.75],
      ['ceratiten', RU(0, 3) - 0.6, 0.95, 0.9, 1.6],
      ['wappen', RU(2, 3) + 0.3, 1.0, 1.0, 1.7],
    ];
    // the boards (texts) on the front wall's inside, opposite their exhibits, and one at each vitrine
    const boards = [
      ['text_landschaft', RU(1, 3) + 1.5, back],
      ['text_ceratiten', RU(0, 3) + 0.5, back],
      ['text_henneberg', RU(2, 3) + 1.35, back],
    ];
    // the hall's floor and the room's: the plan's floor for both outlines (one call each)
    const fW = r => F.polyW([r[0], r[1], r[2], r[1], r[2], r[3], r[0], r[3]]);
    const zf = () => z;
    const geoA = LINNEN.drawPlan ? LINNEN.drawPlan(Pl, fW(R.hall), zf) : null,
      Pl2 = LIPLAN.newPlan({ id: 'museum2', type: 'museum' });
    Pl2.floor = Pl.floor;
    Pl2.cell = 0.9;
    const geoB = LINNEN.drawPlan ? LINNEN.drawPlan(Pl2, fW(R.room), zf) : null;
    // the walls between: the gap under the opening's floor
    const mat = new THREE.MeshBasicMaterial({ vertexColors: true });
    MATS.push(mat);
    for (const g of [geoA, geoB]) {
      if (!g) continue;
      const me = new THREE.Mesh(g.geo, mat);
      me.name = 'museum';
      me.userData.noMerge = true;
      me.matrixAutoUpdate = false;
      me.updateMatrix();
      scene.add(me);
      S.meshes.push(me);
    }
    // the pictures: quads on the walls and in the vitrine (the Schneekopfkugel lies under the glass), on the printed goods' program
    const PIC = pictures(),
      Pp = [],
      Cc = [],
      UV = [],
      I = [];
    let nv = 0;
    const quad = (k, u0, u1, v, z0, z1, face, flat) => {
      const uv = PICS[k];
      if (!uv) return;
      let pts;
      if (flat) {
        const [a, b2] = [F.W(u0, v - flat), F.W(u1, v + flat)];
        pts = [
          [a[0], a[1], z0],
          [F.W(u1, v - flat)[0], F.W(u1, v - flat)[1], z0],
          [b2[0], b2[1], z0],
          [F.W(u0, v + flat)[0], F.W(u0, v + flat)[1], z0],
        ];
      } else {
        const a = F.W(u0, v),
          b2 = F.W(u1, v);
        // on a wall facing −v (the room's back wall) one looks along +v: the viewer's right is +u (v is u turned to the left);
        // on a wall facing +v the other way round
        const r = face > 0;
        pts = r
          ? [
              [b2[0], b2[1], z0],
              [a[0], a[1], z0],
              [a[0], a[1], z1],
              [b2[0], b2[1], z1],
            ]
          : [
              [a[0], a[1], z0],
              [b2[0], b2[1], z0],
              [b2[0], b2[1], z1],
              [a[0], a[1], z1],
            ];
      }
      const [U0, V0, U1, V1] = uv,
        uvs = [
          [U0, V0],
          [U1, V0],
          [U1, V1],
          [U0, V1],
        ];
      pts.forEach((p, i) => {
        Pp.push(p[0], p[2], -p[1]);
        Cc.push(1, 1, 1);
        UV.push(...uvs[i]);
      });
      I.push(nv, nv + 1, nv + 2, nv, nv + 2, nv + 3, nv, nv + 2, nv + 1, nv, nv + 3, nv + 2);
      nv += 4;
    };
    for (const [k, u, w, h, z0] of wallPics) quad(k, u - w / 2, u + w / 2, back - 0.02, z + z0, z + z0 + h, -1);
    for (const [k, u, v] of boards) quad(k, u - 0.35, u + 0.35, v - 0.02, z + 1.25, z + 1.95, -1);
    // the Schneekopfkugeln: two cut halves under the glass, the board in front
    const kv = vits.find(q => q.what === 'kugeln');
    if (kv) {
      quad('kugel', kv.u - 0.55, kv.u - 0.15, kv.v, z + 0.83, 0, 0, 0.2);
      quad('kugel', kv.u + 0.05, kv.u + 0.45, kv.v, z + 0.83, 0, 0, 0.2);
    }
    // the price board behind the desk, the minerals' board on the room's front wall
    quad('preise', du - 0.45, du + 0.45, hv1 - 0.13, z + 1.3, z + 2.2, -1);
    quad('text_minerale', RU(0, 3) - 0.35, RU(0, 3) + 0.35, rv0 + 0.13, z + 1.25, z + 1.95, 1);
    quad('text_kugeln', RU(2, 3) - 0.35, RU(2, 3) + 0.35, rv0 + 0.13, z + 1.25, z + 1.95, 1);
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(Pp, 3));
    g.setAttribute('color', new THREE.Float32BufferAttribute(Cc, 3));
    g.setAttribute('uv', new THREE.Float32BufferAttribute(UV, 2));
    g.setIndex(I);
    g.computeBoundingSphere();
    const pm = new THREE.MeshBasicMaterial({ vertexColors: true, map: PIC });
    MATS.push(pm);
    const pmesh = new THREE.Mesh(g, pm);
    pmesh.name = 'museum bilder';
    pmesh.userData.noMerge = true;
    scene.add(pmesh);
    S.meshes.push(pmesh);
    // collisions: the walls, the plan's fixtures
    S.segs = segs.concat(Pl.segs, Pl2.segs);
    // the places to stand: the desk, each exhibit
    S.spots = Pl.spots;
    const W = (u, v) => F.W(u, v);
    S.exp = [
      { id: 'minerale', at: W(RU(0, 3), rv0 + 1.6), look: W(RU(0, 3), rv0 + 2.6) },
      { id: 'kugeln', at: W(RU(2, 3), rv0 + 1.6), look: W(RU(2, 3), rv0 + 2.6) },
      { id: 'landschaft', at: W(RU(1, 3), back - 1.6), look: W(RU(1, 3), back) },
      { id: 'ceratiten', at: W(RU(0, 3) - 0.3, back - 1.5), look: W(RU(0, 3) - 0.6, back) },
      { id: 'henneberg', at: W(RU(2, 3) + 0.6, back - 1.5), look: W(RU(2, 3) + 0.3, back) },
    ];
    S.inDoor = W(0, hv0 + 0.9);
    S.gate = [W(between, 1.4), W(between, 3.4)];
    S.room = R.room;
    S.hall = R.hall;
    // the cashier at the museum's hours; a visitor or two at the exhibits
    const kp = Pl.spots.find(q => q.k === 'kasse');
    if (kp)
      LLEBEN.posten({
        id: 'museum',
        x: kp.x,
        y: kp.y,
        hd: Math.atan2(kp.dir[0], kp.dir[1]),
        z: () => z,
        fig: 'vk_m11',
        near: 30,
        arbeit: 'interactLoop',
        offen: () => OEFFNUNG.offen('museum') === true && S.built,
      });
    S.exp.slice(0, 2).forEach((e, i) =>
      LLEBEN.posten({
        id: 'museum:besuch' + i,
        // beside the place one looks from (not on it: CI picture museum_minerale showed a visitor's head)
        x: e.at[0] + F.eu[0] * (i ? 0.8 : -0.8),
        y: e.at[1] + F.eu[1] * (i ? 0.8 : -0.8),
        hd: Math.atan2(e.look[0] - e.at[0], e.look[1] - e.at[1]),
        z: () => z,
        fig: i ? 'vk_f14' : 'vk_m07',
        kleid: null,
        near: 30,
        offen: () => OEFFNUNG.offen('museum') === true && S.built && DCALwd() !== 2,
      })
    );
    S.built = true;
    markDirty(true);
    KERN.emit('museum', { was: 'gebaut' });
    return true;
  }
  const DCALwd = () => DCAL.wd();
  function drop() {
    for (const me of S.meshes) {
      scene.remove(me);
      me.geometry.dispose();
    }
    S.meshes = [];
    for (const m of MATS) m.dispose();
    MATS.length = 0;
    S.segs = [];
    S.built = false;
    markDirty(true);
  }
  // ---- inside: walls, floor, the place's name ----
  const inRect = (r, u, v, m = 0) => u > r[0] - m && u < r[2] + m && v > r[1] - m && v < r[3] + m;
  function where(x, y) {
    if (!S.built) return null;
    const [u, v] = S.F.L(x, y);
    if (inRect(S.hall, u, v)) return 'hall';
    if (inRect(S.room, u, v)) return 'room';
    if (Math.abs(u - (S.gate[0] ? S.F.L(...S.gate[0])[0] : 0)) < 0.4 && v > 1.3 && v < 3.5) return 'gate';
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
      // without a ticket the attendant keeps one in the hall
      if (!INVENTAR.has('museumskarte') && S.gate && S.F) {
        const [u, v] = S.F.L(p[0], p[1]),
          gu = S.F.L(...S.gate[0])[0],
          s2 = S.R.side;
        if ((s2 > 0 ? u > gu - 0.15 : u < gu + 0.15) && v > 1.2 && v < 3.6) {
          const [x, y] = S.F.W(gu - s2 * 0.2, v);
          p[0] = x;
          p[1] = y;
          moved = true;
          if (!S.warned) {
            S.warned = true;
            toast('„Ihre Eintrittskarte bitte!“ – die gibt es vorn an der Kasse.', 3500);
            setTimeout(() => (S.warned = false), 6000);
          }
        }
      }
      return moved;
    },
    18
  );
  KERN.provide('ground', (x, y) => (S.inside && where(x, y) ? S.z + 0.004 : undefined), 12);
  KERN.provide('inside', (x, y) => (S.inside && where(x, y) ? true : undefined), 12);
  KERN.provide(
    'place',
    (x, y) => {
      const w = S.inside ? where(x, y) : null;
      return w ? (w === 'room' ? 'Ausstellung · ' : '') + 'Naturhistorisches Museum, Schloss Bertholdsburg' : undefined;
    },
    36
  );
  // ---- in and out: a short fade, as into the houses ----
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
  async function betreten() {
    if (S.busy || !S.built) return false;
    if (!OEFFNUNG.offen('museum')) {
      toast('Das Museum hat geschlossen – ' + OEFFNUNG.text('museum') + ' (' + OEFFNUNG.zeiten('museum') + ').', 4200);
      return false;
    }
    S.busy = true;
    await fade(true);
    S.inside = true;
    const yaw = (Math.atan2(-S.n[0], -S.n[1]) * 180) / Math.PI;
    put(S.inDoor[0], S.inDoor[1], S.z, (yaw + 360) % 360);
    await fade(false);
    S.busy = false;
    KERN.emit('museum', { was: 'betreten' });
    return true;
  }
  async function verlassen() {
    if (S.busy) return false;
    S.busy = true;
    await fade(true);
    S.inside = false;
    const ox = S.door[0] + S.n[0] * 1.6,
      oy = S.door[1] + S.n[1] * 1.6,
      zz = KERN.ground(ox, oy);
    put(ox, oy, Number.isFinite(zz) ? zz : S.z, ((Math.atan2(S.n[0], S.n[1]) * 180) / Math.PI + 360) % 360);
    LKAUF.close();
    await fade(false);
    S.busy = false;
    KERN.emit('museum', { was: 'verlassen' });
    return true;
  }
  function karte(art = 'erwachsen') {
    const c = art === 'ermaessigt' ? 400 : art === 'turm' ? 200 : 600,
      id = art === 'turm' ? 'turmkarte' : 'museumskarte';
    if (!GELD.zahlen(c, 'Museum Bertholdsburg')) {
      toast('Das Geld reicht nicht für die Karte.', 3000);
      return false;
    }
    INVENTAR.add(id, 1);
    KERN.emit('museum', { was: 'karte', art });
    return true;
  }
  function kasse() {
    const post = (LLEBEN.posts || []).find(q => q.id === 'museum');
    const staffed = post && post.p;
    if (post) post.redet = true;
    LKAUF.zeige(
      '<h3>Museumskasse<button type="button" aria-label="Schließen">×</button></h3><div class="say">' +
        (staffed
          ? '„Herzlich willkommen im Naturhistorischen Museum! Eine Karte?“'
          : 'Die Kasse ist gerade nicht besetzt.') +
        '</div><div class="btns">' +
        (staffed
          ? '<button type="button" class="b main" data-k="erwachsen">Erwachsene · 6,00 €</button><button type="button" class="b" data-k="ermaessigt">Ermäßigt · 4,00 €</button><button type="button" class="b" data-k="turm">Turm · 2,00 €</button>'
          : '') +
        '<button type="button" class="b" data-k="weg">Danke</button></div><div class="say">In der Geldbörse: ' +
        GELD.text() +
        (INVENTAR.has('museumskarte') ? ' · Eintrittskarte vorhanden' : '') +
        '</div>',
      p => {
        for (const b of p.querySelectorAll('button[data-k]'))
          b.onclick = () => {
            if (b.dataset.k === 'weg') {
              if (post) post.redet = false;
              LKAUF.close();
              return;
            }
            if (karte(b.dataset.k)) {
              toast('Die Eintrittskarte ist im Inventar. Die Ausstellung ist gleich nebenan.', 3200);
              if (post) post.redet = false;
              LKAUF.close();
            }
          };
      }
    );
  }
  function ansehen(id) {
    const ex = EXPONATE.find(q => q.id === id);
    if (!ex) return;
    LKAUF.zeige(
      '<h3>' +
        ex.titel +
        '<button type="button" aria-label="Schließen">×</button></h3><div class="say">' +
        ex.text +
        '</div>'
    );
    KERN.emit('museum', { was: 'exponat', id });
    S.seen = S.seen || new Set();
    S.seen.add(id);
  }
  // ---- the action button ----
  const zAt = () => S.z + 1.1;
  KERN.act({
    id: 'museum:tuer',
    r: 2.6,
    prio: 0.5,
    pos: () => (S.built && !S.inside ? [S.door[0] + S.n[0] * 0.4, S.door[1] + S.n[1] * 0.4, zAt()] : null),
    label: () =>
      !S.built || S.inside
        ? null
        : OEFFNUNG.offen('museum')
          ? 'Naturhistorisches Museum – hineingehen'
          : 'Museum – geschlossen (' + OEFFNUNG.zeiten('museum') + ')',
    run: () => betreten(),
  });
  KERN.act({
    id: 'museum:raus',
    r: 1.6,
    prio: 0.5,
    pos: () => (S.inside ? [S.inDoor[0], S.inDoor[1], zAt()] : null),
    label: () => (S.inside && !S.busy ? 'Hinausgehen' : null),
    run: () => verlassen(),
  });
  KERN.act({
    id: 'museum:kasse',
    r: 1.6,
    prio: 0.6,
    pos: () => {
      const k = S.inside && S.spots ? S.spots.find(q => q.k === 'kunde') : null;
      return k ? [k.x, k.y, zAt()] : null;
    },
    label: () => (S.inside ? 'Museumskasse: Eintrittskarte' : null),
    run: () => kasse(),
  });
  for (const ex of EXPONATE)
    KERN.act({
      id: 'museum:' + ex.id,
      r: 1.7,
      prio: 0.3,
      pos: () => {
        const e = S.inside && S.exp ? S.exp.find(q => q.id === ex.id) : null;
        return e ? [e.look[0], e.look[1], zAt() + 0.3] : null;
      },
      label: () => (S.inside ? 'Ansehen: ' + ex.titel : null),
      run: () => ansehen(ex.id),
    });
  // ---- the round: build near the door, free far away ----
  let acc = 0;
  KERN.tick(dt => {
    acc += dt;
    if (acc < 1) return;
    acc = 0;
    try {
      const b = castle();
      if (!b) {
        if (S.built && !S.inside) drop();
        return;
      }
      const near = Math.hypot(P.x - b.cx, P.y - b.cy);
      // moved out some other way (the menu's places, a scene): no longer inside
      if (S.inside && !S.busy && !where(P.x, P.y)) S.inside = false;
      if (!S.built && near < 90) build();
      else if (S.built && !S.inside && near > 150) drop();
    } catch (e) {
      S.err = String((e && e.message) || e).slice(0, 120);
    }
  }, 'museum');
  S.status = () => ({
    built: S.built,
    inside: S.inside,
    err: S.err,
    door: S.door ? S.door.map(v => +v.toFixed(2)) : null,
    side: S.R ? S.R.side : null,
    depth: S.R ? S.R.D : null,
    meshes: S.meshes.length,
    karte: INVENTAR.has('museumskarte'),
    seen: S.seen ? [...S.seen] : [],
  });
  Object.assign(S, { betreten, verlassen, karte, kasse, ansehen, EXPONATE, where, build, drop });
  void WAREN;
  return S;
})();
window.MUSEUM = MUSEUM;
