// ===================== feat/grenzland-alltag: festivals by the calendar in the world (GLFESTE) =====================
// Falko, 17.11.2026 12:26 (clicked „Feste im Kalender“): „Kirmes in Ratscher, Weihnachtsmarkt in Schleusingen, Feuerwehrfest – Musik,
// Menge, Deckung für Missionen.“ The dates and what there is: grenzland/gl_feste_data.js (pure). While one is open and the player is
// within ~450 m it stands in the world:
//   Kirmes          round the Dorflinde on the Anger (under the lime one used to dance): the Kirmesbaum, stalls facing the lime
//   Weihnachtsmarkt round the fountain on the Markt of Schleusingen: wooden huts with fir garlands (snow on the roofs in winter), a tree
//   Feuerwehrfest   on the lawn before the old school (the fire brigade's club house in the game)
// Stalls of the props kit in the traffic's vertex-colour material (no new shader program), their places found on free ground round the
// middle; strings of bulbs that glow at night (a copy of the cars' lamp material, as grenzland/gl_orte.js lights its bulbs – no new lamp);
// the crowd are the village people of grenzland/gl_alltag.js – most of the village comes for a while, who works at a stall stands
// behind it all the time; music: a polka of the Kirmeswelle (GLRDATA.LIEDER.kirmes) through one media element, louder the nearer one is
// (never decoded into a buffer); for the Christmas market a music box played by the synthesiser until a free recording is there.
// At the stalls (E): a Rostbratwurst, a beer or Fassbrause, Kirmeskuchen, Glühwein or Kinderpunsch, Stollen, a ticket of the tombola.
// Only in the mode, only today; gone after „Beenden“.
//   GLFESTE.offen() → { id, ort, von, bis, dienst } (open now) · aktiv() → { id, name, ort, x, y, r, bis } | null · kalender(t) ·
//   platz(personId, slot) (where somebody stands at the festival) · deckung(x, y) → 0 … 1 (a crowd to hide in) · tick · stop · linien()
//   KERN.emit('grenzland:fest', { id, an }) when one opens or closes · debug.zu(id, min) (date and clock to its next opening), stand()
import * as THREE from 'three';
import { BASE, scene } from '../core/head.js';
import { KERN } from '../core/kern.js';
import { markDirty } from '../core/assets.js';
import { P } from '../game/walkable.js';
import { PLAY } from '../game/play.js';
import { VEH } from '../vehicles/vehicle.js';
import { STIMME } from '../audio/stimme.js';
import { audio } from '../audio/audio.js';
import { CLOCK } from '../time/clock.js';
import { DN } from '../time/daynight.js';
import { VPROPS } from '../world/village_props.js';
import { VFIG } from '../verkehr/verkehr_fig.js';
import { VAUTO } from '../verkehr/verkehr_auto.js';
import { SCHL } from '../welt/schleusingen.js';
import { DKDATA } from '../world/dorfkern_data.js';
import { GL } from './gl_state.js';
import { GLHUD } from './gl_hud.js';
import { GLKARTE } from './gl_karte.js';
import { GLORTE } from './gl_orte.js';
import { GLRDATA } from './gl_radio_data.js';
import { GLFDATA } from './gl_feste_data.js';
import { GLALDATA } from './gl_alltag_data.js';
export const GLFESTE = (() => {
  const D = GLFDATA;
  const S = {
    auf: null,
    bau: null,
    an: '',
    acc: 0,
    err: null,
    plaetze: {},
    ton: null,
    n: { kauf: 0, los: 0, bau: 0 },
    lauf: 0,
  };
  const hyp = Math.hypot;
  const L = (r, g, b) => [Math.pow(r / 255, 2.2), Math.pow(g / 255, 2.2), Math.pow(b / 255, 2.2)];
  const FARBE = { rot: L(196, 38, 36), blau: L(36, 76, 168), gelb: L(226, 182, 40), gruen: L(40, 112, 58) };
  const heute = () => GL.on && GL.era === 'heute';
  const eday = (t = CLOCK.t) => DN.e0 + Math.floor(t / 1440);
  const minOf = (t = CLOCK.t) => ((Math.floor(t) % 1440) + 1440) % 1440;
  // ---- the festival open now (the calendar, pure) ----
  function offen() {
    if (!heute()) return null;
    const o = D.offen(eday(), minOf());
    if (!o) return null;
    return Object.assign(o, { dienst: D.FESTE[o.id].dienst });
  }
  // the middle of each festival in the world
  function mitte(id) {
    if (id === 'weihnachtsmarkt')
      return SCHL && SCHL.fountain ? [SCHL.fountain[0], SCHL.fountain[1]] : [-1084.7, 1241.9];
    if (id === 'kirmes') return (DKDATA && DKDATA.open && DKDATA.open.linde) || [217, -109];
    return [229.5, -97.5];
  }
  // ---- free ground for a stall: its footprint (w × d metres, turned hd) not in a wall, not indoors ----
  function frei(x, y, r = 0.4) {
    try {
      const z = KERN.ground(x, y);
      if (!Number.isFinite(z)) return false;
      if (KERN.inside && KERN.inside(x, y, z + 1)) return false;
      const q = [x, y];
      if (KERN.pushOut(q, r) && hyp(q[0] - x, q[1] - y) > 0.05) return false;
      const s = KERN.surface ? KERN.surface(x, y) : null;
      // (not on a through road: a lane of the village is fine, the main street is not)
      if (s && s.kind <= 3 && s.e > 0.5) return false;
    } catch (e) {
      return false;
    }
    return true;
  }
  function fusspunkte(x, y, hd, w, d) {
    const c = Math.cos(hd),
      s = Math.sin(hd),
      P2 = [[0, 0]];
    for (const a of [-1, 1]) for (const b of [-1, 1]) P2.push([(a * w) / 2, (b * d) / 2]);
    return P2.map(([u, v]) => [x + u * c + v * s, y - u * s + v * c]);
  }
  const platzFrei = (x, y, hd, w, d, belegt) =>
    fusspunkte(x, y, hd, w, d).every(q => frei(q[0], q[1], 0.35)) &&
    belegt.every(b => hyp(b[0] - x, b[1] - y) > b[2] + Math.max(w, d) / 2 + 0.6);
  // ---- where everything stands: a ring of free places round the middle, each stall facing it ----
  function anordnen(id) {
    const F = D.FESTE[id],
      c = mitte(id),
      belegt = [];
    // the lime's trunk and its ring of benches, the fountain's basin
    if (id === 'kirmes') belegt.push([c[0], c[1], 3.3]);
    if (id === 'weihnachtsmarkt') belegt.push([c[0], c[1], 3.8]);
    const R = id === 'weihnachtsmarkt' ? [10, 12, 8.5, 14] : id === 'kirmes' ? [7.5, 9, 6.5, 10.5] : [6, 7.5, 5, 9];
    const out = { mitte: c, staende: [], baum: null, plaetze: [] };
    const n = F.staende.length,
      a0 = F.hd || 0;
    F.staende.forEach((st, k) => {
      const w = st.art === 'huette' ? 3.2 : 3.4,
        d = st.art === 'huette' ? 2.3 : 1.6;
      let found = null;
      for (const r of R) {
        for (let s = 0; s < 12 && !found; s++) {
          const a = a0 + (k / n) * Math.PI * 2 + (s % 2 ? 1 : -1) * Math.ceil(s / 2) * 0.16;
          const x = c[0] + Math.sin(a) * r,
            y = c[1] + Math.cos(a) * r,
            face = Math.atan2(c[0] - x, c[1] - y);
          if (platzFrei(x, y, face, w, d, belegt)) found = { x, y, face, r };
        }
        if (found) break;
      }
      if (!found) return;
      belegt.push([found.x, found.y, Math.max(w, d) / 2]);
      out.staende.push(Object.assign({}, st, found, { w, d }));
    });
    // the tree: the Kirmesbaum by the lime, the Christmas tree by the fountain – between the stalls
    if (F.baum)
      for (const r of [5, 6, 4.5, 7]) {
        for (let s = 0; s < 16 && !out.baum; s++) {
          const a = a0 + Math.PI / Math.max(1, n) + s * 0.39,
            x = c[0] + Math.sin(a) * r,
            y = c[1] + Math.cos(a) * r;
          if (frei(x, y, 0.8) && belegt.every(b => hyp(b[0] - x, b[1] - y) > b[2] + 1.6)) out.baum = [x, y];
        }
        if (out.baum) break;
      }
    // where the visitors stand: two before each stall's counter, round the tree, round the middle
    for (const s of out.staende) {
      const fx = Math.sin(s.face),
        fy = Math.cos(s.face),
        rx = Math.cos(s.face),
        ry = -Math.sin(s.face);
      for (const [f, l] of [
        [1.7, -0.6],
        [1.9, 0.7],
        [2.9, 0.1],
      ])
        out.plaetze.push({
          x: s.x + fx * (s.d / 2 + f) + rx * l,
          y: s.y + fy * (s.d / 2 + f) + ry * l,
          hd: s.face + Math.PI,
          an: s.id,
        });
    }
    const um = out.baum || c;
    for (let k = 0; k < 8; k++) {
      const a = (k / 8) * Math.PI * 2 + 0.3,
        r = out.baum ? 2.2 : 4.6;
      out.plaetze.push({ x: um[0] + Math.sin(a) * r, y: um[1] + Math.cos(a) * r, hd: a + Math.PI, an: 'mitte' });
    }
    out.plaetze = out.plaetze.filter(q => frei(q.x, q.y, 0.3));
    return out;
  }
  // ---- the meshes: stalls, tree, strings of bulbs ----
  function mesh(build, x, y, hd, mat) {
    const K = VPROPS.kit();
    build(K);
    if (K.empty && K.empty()) return null;
    const m = new THREE.Mesh(K.geo(), mat || VFIG.mat());
    m.userData.noMerge = true;
    m.castShadow = false;
    m.position.set(x, KERN.ground(x, y) || 0, -y);
    m.rotation.y = -(hd || 0);
    m.name = 'grenzland fest';
    scene.add(m);
    S.bau.meshes.push(m);
    return m;
  }
  const HOLZ = L(150, 110, 70),
    HELL = L(236, 232, 222),
    DUNKEL = L(52, 40, 30),
    TANNE = L(34, 74, 40);
  // a stall in its own frame: the counter at the front (−y), the keeper behind it (+y); roof and sign over the counter
  function bude(K, st, winter) {
    const C = FARBE[st.farbe] || FARBE.rot,
      w = st.w,
      d = st.d;
    if (st.art === 'huette') {
      // a wooden hut of the Christmas market: walls of boards, the front open above the counter, a gable roof, a fir garland
      K.box(0, d / 2 - 0.05, 0, w, 0.1, 2.25, 0, HOLZ);
      for (const sx of [-1, 1]) K.box((sx * (w - 0.1)) / 2, 0, 0, 0.1, d, 2.25, 0, HOLZ);
      K.box(0, -d / 2 + 0.05, 0, w, 0.1, 1.0, 0, HOLZ);
      K.box(0, -d / 2 - 0.12, 1.0, w + 0.1, 0.36, 0.06, 0, L(170, 128, 84));
      K.box(0, -d / 2 + 0.05, 2.0, w, 0.1, 0.28, 0, HOLZ);
      for (const sy of [-1, 1]) {
        K.box(0, (sy * d) / 4, 2.25 + 0.32, w + 0.4, d / 2 + 0.35, 0.08, 0, L(96, 60, 40));
        if (winter) K.box(0, (sy * d) / 4, 2.25 + 0.38, w + 0.36, d / 2 + 0.3, 0.06, 0, L(240, 242, 246));
      }
      K.box(0, 0, 2.25, w + 0.2, 0.2, 0.7, 0, HOLZ);
      // the garland along the front edge, red bows
      for (let i = 0; i < 9; i++) K.ball(-w / 2 + (i + 0.5) * (w / 9), -d / 2 - 0.25, 2.18, 0.13, TANNE, 6);
      for (const sx of [-1, 1]) K.ball(sx * (w / 2 - 0.1), -d / 2 - 0.3, 2.12, 0.09, C, 6);
      K.box(0, -d / 2 - 0.06, 2.02, w * 0.72, 0.03, 0.22, 0, L(240, 236, 226));
      GLORTE.tafelText(K, st.schild, [0, -d / 2 - 0.08, 1.98], Math.PI, 0.03, C);
      // goods on the counter
      for (let i = 0; i < 5; i++)
        K.box(-w / 2 + 0.4 + i * 0.55, -d / 2 - 0.02, 1.06, 0.3, 0.22, 0.14, 0, i % 2 ? C : L(210, 170, 110));
      return;
    }
    if (st.art === 'tisch') {
      // a table of cakes under a parasol
      K.box(0, 0, 0.72, 2.0, 0.8, 0.04, 0, HELL);
      for (const sx of [-0.9, 0.9]) for (const sy of [-0.32, 0.32]) K.box(sx, sy, 0, 0.05, 0.05, 0.72, 0, DUNKEL);
      for (let i = 0; i < 4; i++)
        K.cyl(-0.7 + i * 0.47, -0.05, 0.76, 0.82, 0.19, 0.19, 12, i % 2 ? L(198, 150, 84) : L(120, 74, 44));
      K.cyl(0.95, 0.3, 0, 2.3, 0.025, 0.025, 6, DUNKEL);
      K.cyl(0.95, 0.3, 2.0, 2.5, 1.3, 0.05, 12, C, true);
      GLORTE.tafelText(K, st.schild, [0, -0.42, 0.62], Math.PI, 0.026, C);
      return;
    }
    // a stall of the fair: counter, posts, a striped roof, a sign
    K.box(0, 0, 0, w - 0.2, d * 0.5, 1.05, 0, HOLZ);
    K.box(0, 0, 1.05, w - 0.1, d * 0.56, 0.05, 0, L(200, 190, 170));
    for (const [x, y] of [
      [-(w - 0.2) / 2, -d * 0.28],
      [(w - 0.2) / 2, -d * 0.28],
      [-(w - 0.2) / 2, d * 0.75],
      [(w - 0.2) / 2, d * 0.75],
    ])
      K.box(x, y, 0, 0.08, 0.08, 2.4, 0, HOLZ);
    for (let i = 0; i < 6; i++)
      K.box(
        -w / 2 + 0.25 + i * ((w - 0.5) / 6) + (w - 0.5) / 12,
        d * 0.24,
        2.4,
        (w - 0.5) / 6,
        d * 1.4,
        0.06,
        0,
        i % 2 ? HELL : C
      );
    K.box(0, -d * 0.3, 1.92, w - 0.3, 0.03, 0.34, 0, C);
    GLORTE.tafelText(K, st.schild, [0, -d * 0.32, 2.05], Math.PI, 0.032, HELL);
  }
  // the Kirmesbaum (as the random event of grenzland/gl_ereignis.js has it): a tall peeled trunk, the green top, a wreath with ribbons
  function kirmesbaum(K) {
    K.cyl(0, 0, 0, 14, 0.17, 0.08, 10, L(196, 168, 126));
    for (const [z0, z1, r] of [
      [12.6, 14.6, 1.25],
      [14.0, 15.8, 0.9],
      [15.3, 17.0, 0.55],
    ])
      K.cyl(0, 0, z0, z1, r, 0.08, 10, L(52, 96, 46), false);
    K.cyl(0, 0, 10.2, 10.55, 1.05, 1.05, 18, L(66, 112, 52), false);
    const C = [L(220, 40, 40), L(244, 244, 240), L(40, 90, 200), L(240, 200, 40)];
    for (let i = 0; i < 12; i++) {
      const a = (i / 12) * Math.PI * 2;
      K.box(Math.sin(a) * 1.02, Math.cos(a) * 1.02, 7.2, 0.08, 0.02, 3.0, a, C[i % 4]);
    }
  }
  // a Christmas tree of some six metres: trunk, tiers of fir, a star
  function tanne(K) {
    K.cyl(0, 0, 0, 1.0, 0.16, 0.14, 8, DUNKEL);
    for (const [z0, z1, r] of [
      [0.8, 2.6, 1.9],
      [2.0, 3.8, 1.5],
      [3.2, 4.9, 1.1],
      [4.3, 5.8, 0.7],
      [5.3, 6.4, 0.35],
    ])
      K.cyl(0, 0, z0, z1, r, 0.06, 12, TANNE, false);
    K.ball(0, 0, 6.55, 0.22, L(250, 210, 60), 8);
  }
  // strings of bulbs: from the top of the tree (or a pole in the middle) to each stall's roof, sagging
  function lichter(K, B) {
    if (!B.baum && !B.mast) return;
    const top = B.baum ? [B.baum[0], B.baum[1], B.baumH] : [B.mitte[0], B.mitte[1], 5.2];
    const z0 = KERN.ground(B.ref[0], B.ref[1]) || 0;
    for (const st of B.staende) {
      const fx = Math.sin(st.face),
        fy = Math.cos(st.face);
      const end = [st.x + fx * (st.d / 2 + 0.2), st.y + fy * (st.d / 2 + 0.2), (KERN.ground(st.x, st.y) || 0) + 2.45];
      const a = [top[0] - B.ref[0], top[1] - B.ref[1], (KERN.ground(top[0], top[1]) || 0) + top[2] - z0],
        b = [end[0] - B.ref[0], end[1] - B.ref[1], end[2] - z0];
      const n = Math.max(8, Math.round(hyp(b[0] - a[0], b[1] - a[1]) / 0.7));
      for (let k = 1; k < n; k++) {
        const u = k / n;
        K.ball(
          a[0] + (b[0] - a[0]) * u,
          a[1] + (b[1] - a[1]) * u,
          a[2] + (b[2] - a[2]) * u - Math.sin(Math.PI * u) * 0.8,
          0.055,
          L(255, 240, 200),
          5
        );
      }
    }
    // the tree's own bulbs (Christmas): a spiral round it
    if (B.baum && B.id === 'weihnachtsmarkt') {
      const bz = (KERN.ground(B.baum[0], B.baum[1]) || 0) - z0;
      for (let k = 0; k < 60; k++) {
        const u = k / 60,
          z = 1.0 + u * 5.0,
          r = 1.8 * (1 - u) + 0.25,
          a = u * Math.PI * 9;
        K.ball(
          B.baum[0] - B.ref[0] + Math.sin(a) * r,
          B.baum[1] - B.ref[1] + Math.cos(a) * r,
          bz + z,
          0.06,
          L(255, 236, 190),
          5
        );
      }
    }
  }
  function bauen(id) {
    const F = D.FESTE[id];
    const A = anordnen(id);
    S.bau = {
      id,
      meshes: [],
      lampe: null,
      staende: A.staende,
      baum: A.baum,
      mitte: A.mitte,
      plaetze: A.plaetze,
      ref: A.mitte,
      baumH: 0,
    };
    S.plaetze = {};
    const winter = GLALDATA.winterM(GLALDATA.ymd(eday()).m);
    try {
      for (const st of A.staende) mesh(K => bude(K, st, winter), st.x, st.y, st.face + Math.PI);
      // no tree: a mast in the middle carries the strings of bulbs
      if (!A.baum && frei(A.mitte[0], A.mitte[1], 0.3)) {
        mesh(K => K.cyl(0, 0, 0, 5.4, 0.07, 0.05, 8, DUNKEL), A.mitte[0], A.mitte[1], 0);
        S.bau.mast = true;
      }
      if (A.baum) {
        if (F.baum === 'tanne') {
          mesh(tanne, A.baum[0], A.baum[1], 0);
          S.bau.baumH = 6.2;
        } else {
          mesh(kirmesbaum, A.baum[0], A.baum[1], 0);
          S.bau.baumH = 7.4;
        }
      }
      // the bulbs: one mesh in a copy of the cars' lamp material (its own colour and glow, the same program)
      const lm = VAUTO.LM && VAUTO.LM.head ? VAUTO.LM.head.clone() : new THREE.MeshStandardMaterial();
      lm.color.setHex(0xf6ead0);
      if (lm.emissive) lm.emissive.setHex(0xffd49a);
      lm.metalness = 0;
      lm.roughness = 0.4;
      S.bau.lampe = lm;
      S.bau.id = id;
      mesh(K => lichter(K, S.bau), S.bau.ref[0], S.bau.ref[1], 0, lm);
      glimmen(true);
      S.n.bau++;
    } catch (e) {
      S.err = 'bauen: ' + ((e && e.message) || e);
    }
    markDirty(true);
  }
  function abbauen() {
    const B = S.bau;
    if (!B) return;
    for (const m of B.meshes) {
      if (m.parent) m.parent.remove(m);
      if (m.geometry) m.geometry.dispose();
    }
    if (B.lampe) B.lampe.dispose();
    S.bau = null;
    S.plaetze = {};
    markDirty(true);
  }
  function glimmen(force) {
    const B = S.bau;
    if (!B || !B.lampe) return;
    const dark = !!(VAUTO.dark && VAUTO.dark());
    if (force || dark !== B.dark) {
      B.dark = dark;
      B.lampe.emissiveIntensity = dark ? 2.4 : 0.25;
      markDirty();
    }
  }
  // ---- where somebody of the village stands at the festival (grenzland/gl_alltag.js asks): behind the own stall, or a free place ----
  function platz(pid, j) {
    const B = S.bau;
    if (!B || !S.auf || B.id !== S.auf.id) return null;
    if (j && j.stand) {
      // behind the counter: in a hut just inside its front, at a stall or a table behind it
      const st = B.staende.find(s => s.id === j.stand);
      if (!st) return null;
      const fx = Math.sin(st.face),
        fy = Math.cos(st.face),
        hinten = st.art === 'huette' ? -(st.d / 2 - 0.75) : st.art === 'tisch' ? 0.8 : 0.9;
      return { x: st.x - fx * hinten, y: st.y - fy * hinten, hd: st.face, dienst: true };
    }
    let k = S.plaetze[pid];
    if (k == null) {
      const used = new Set(Object.values(S.plaetze));
      const P0 = GLALDATA.BY[pid] ? GLALDATA.BY[pid].i : 0;
      for (let i = 0; i < B.plaetze.length; i++) {
        const c = (P0 * 5 + i) % B.plaetze.length;
        if (!used.has(c)) {
          k = c;
          break;
        }
      }
      if (k == null) return null;
      S.plaetze[pid] = k;
    }
    const q = B.plaetze[k];
    return { x: q.x, y: q.y, hd: q.hd };
  }
  // ---- the music: one media element (a polka of the Kirmeswelle), positional by its loudness; the music box ----
  function raw() {
    try {
      return audio.raw ? audio.raw() : null;
    } catch (e) {
      return null;
    }
  }
  function musik(dt) {
    const B = S.bau,
      F = B && D.FESTE[B.id],
      R = raw();
    if (!R) return;
    const w = VEH.cur && VEH.cur.st ? [VEH.cur.st.x, VEH.cur.st.y] : [P.x, P.y],
      d = B && S.auf ? hyp(w[0] - B.mitte[0], w[1] - B.mitte[1]) : 1e9,
      g =
        d < 170
          ? 0.5 * Math.pow(Math.max(0, 1 - Math.max(0, d - 12) / 160), 1.4) * (VEH.cur && GL.radio > 0 ? 0.35 : 1)
          : 0;
    const T = S.ton || (S.ton = { el: null, node: null, gain: null, i: 0, box: 0, fehl: {} });
    const lieder = F && F.musik && F.musik.lieder ? F.musik.lieder : [];
    if (g > 0.001 && lieder.length) {
      try {
        if (!T.el) {
          const a = new Audio();
          a.preload = 'auto';
          a.crossOrigin = 'anonymous';
          T.node = R.ctx.createMediaElementSource(a);
          T.gain = R.ctx.createGain();
          T.gain.gain.value = 0;
          T.node.connect(T.gain);
          T.gain.connect(R.amb || R.sfx);
          a.addEventListener('ended', () => naechstes(T, lieder));
          a.addEventListener('error', () => {
            T.fehl[T.datei] = 1;
            naechstes(T, lieder);
          });
          T.el = a;
          T.ctx = R.ctx;
        }
        if (!T.datei || !lieder.includes(T.datei)) naechstes(T, lieder);
        if (T.el.paused && T.datei) {
          const p = T.el.play();
          if (p && p.catch) p.catch(() => {});
        }
        T.gain.gain.setTargetAtTime(g, R.ctx.currentTime, 0.4);
      } catch (e) {
        S.err = 'musik: ' + ((e && e.message) || e);
      }
    } else if (T.el) {
      try {
        T.gain.gain.setTargetAtTime(0, R.ctx.currentTime, 0.3);
        if (g <= 0.001 && !T.el.paused && d > 200) T.el.pause();
      } catch (e) {}
    }
    // the music box of the Christmas market (no recording yet): a gentle tune in bells, note by note
    if (F && F.musik && F.musik.spieluhr && g > 0.001) spieluhr(R, g, dt);
  }
  function naechstes(T, lieder) {
    const frei = lieder.filter(x => !T.fehl[x]);
    if (!frei.length || !T.el) {
      T.datei = null;
      return;
    }
    T.i = (T.i + 1) % frei.length;
    // (a song of the radio's lists; one that is in none of them lies in the sound repository)
    const datei = frei[T.i],
      l = Object.values(GLRDATA.LIEDER || {})
        .flat()
        .find(x => x && x.datei === datei),
      imRepo = !l || !!l.ton;
    T.datei = datei;
    const base = imRepo ? GLRDATA.ton() : '';
    T.el.src = imRepo ? (base ? base + 'radio/' + datei : '') : BASE + 'snd/radio/' + datei;
    if (imRepo && !base) {
      T.fehl[datei] = 1;
      return naechstes(T, lieder);
    }
    const p = T.el.play();
    if (p && p.catch) p.catch(() => {});
  }
  // G major, three-four: a bell tune over I–IV–V–I, one note each 0.36 s (no carol – our own little tune)
  const MEL = [7, 11, 14, 11, 12, 16, 12, 9, 7, 11, 14, 19, 17, 14, 11, 7, 9, 12, 16, 12, 14, 11, 7, 2];
  function spieluhr(R, g, dt) {
    const T = S.ton;
    T.box -= dt;
    if (T.box > 0) return;
    T.box = 0.36;
    T.k = ((T.k || 0) + 1) % MEL.length;
    try {
      const ctx = R.ctx,
        t = ctx.currentTime + 0.02,
        f = 392 * Math.pow(2, (MEL[T.k] - 7) / 12),
        o = ctx.createOscillator(),
        o2 = ctx.createOscillator(),
        v = ctx.createGain();
      o.type = 'sine';
      o2.type = 'sine';
      o.frequency.value = f;
      o2.frequency.value = f * 2.76;
      v.gain.setValueAtTime(0.0001, t);
      v.gain.exponentialRampToValueAtTime(0.16 * g, t + 0.01);
      v.gain.exponentialRampToValueAtTime(0.0001, t + 1.1);
      o.connect(v);
      o2.connect(v);
      v.connect(R.amb || R.sfx);
      o.start(t);
      o2.start(t);
      o.stop(t + 1.15);
      o2.stop(t + 1.15);
    } catch (e) {}
  }
  function stille() {
    const T = S.ton;
    if (T && T.el) {
      try {
        T.el.pause();
        T.gain.gain.value = 0;
      } catch (e) {}
    }
  }
  // ---- buying at the stalls (E) ----
  function verkaufNah() {
    const B = S.bau;
    if (!B || !S.auf || B.id !== S.auf.id || VEH.cur || !heute()) return null;
    const F = D.FESTE[B.id];
    let best = null,
      bd = 2.6;
    for (const st of B.staende) {
      const fx = Math.sin(st.face),
        fy = Math.cos(st.face),
        x = st.x + fx * (st.d / 2 + 0.7),
        y = st.y + fy * (st.d / 2 + 0.7),
        d = hyp(P.x - x, P.y - y);
      if (d < bd) {
        bd = d;
        best = { st, x, y, v: F.verkauf.filter(v => v.stand === st.id) };
      }
    }
    return best && best.v.length ? best : null;
  }
  function wer(st) {
    const B = S.bau,
      id = B && D.FESTE[B.id].dienst[st.id];
    return id && GLALDATA.BY[id] ? GLALDATA.BY[id] : null;
  }
  function kaufen(v, st) {
    if (!GL.pay(v.eur, v.label.replace(/ \(.*$/, ''))) return PLAY.think('Dafür reicht das Geld nicht.', 2000);
    S.n.kauf++;
    const p = wer(st);
    GLHUD.sub(p ? p.name : 'Am Stand', v.sagt, Math.max(2200, v.sagt.length * 62));
    try {
      if (p) {
        const q = platz(p.id, { stand: st.id });
        STIMME.say('gl_al_' + p.id, v.sagt, { at: q ? [q.x, q.y] : [st.x, st.y] });
      }
    } catch (e) {}
    GL.emit('kauf', { k: v.k, fest: S.bau.id });
    if (v.k === 'los') {
      const l = D.los(Math.random());
      S.n.los++;
      setTimeout(() => {
        PLAY.think(l.text, 3600);
        if (l.geld) GL.earn(l.geld, 'Tombola');
      }, 1800);
    }
  }
  for (let k = 0; k < 2; k++)
    KERN.act({
      id: 'gl-fest-' + k,
      prio: 4,
      r: 2.6,
      label: () => {
        const q = verkaufNah();
        return q && q.v[k] ? q.v[k].label : null;
      },
      pos: () => {
        const q = verkaufNah();
        return q && q.v[k] ? [q.x + k * 0.01, q.y, (KERN.ground(q.x, q.y) || 0) + 1] : [0, 0, -999];
      },
      run: () => {
        const q = verkaufNah();
        if (q && q.v[k]) kaufen(q.v[k], q.st);
      },
    });
  // the radar: where the festival is
  GLKARTE.src(out => {
    const B = S.bau;
    if (B && S.auf && heute()) out.push({ x: B.mitte[0], y: B.mitte[1], k: 'ort', name: D.FESTE[B.id].kurz });
  });
  // ---- per frame ----
  function lauf(dt) {
    S.acc -= dt;
    if (S.acc <= 0) {
      S.acc = 1;
      const o = offen();
      // opens, closes: the event (missions use the crowd as cover)
      const id = o ? o.id : '';
      if (id !== S.an) {
        if (S.an) KERN.emit('grenzland:fest', { id: S.an, an: false });
        if (id) KERN.emit('grenzland:fest', { id, an: true });
        S.an = id;
      }
      S.auf = o;
      // built while it is open and the player within ~450 m (and the town is there for the Christmas market)
      const w = VEH.cur && VEH.cur.st ? [VEH.cur.st.x, VEH.cur.st.y] : [P.x, P.y];
      const want =
        o &&
        hyp(w[0] - mitte(o.id)[0], w[1] - mitte(o.id)[1]) < 450 &&
        (o.id !== 'weihnachtsmarkt' || (SCHL && SCHL.state === 'ready'))
          ? o.id
          : null;
      if (S.bau && S.bau.id !== want) abbauen();
      if (want && !S.bau) bauen(want);
      glimmen(false);
    }
    musik(dt);
  }
  function tick(dt) {
    if (!GL.on) return;
    try {
      if (GL.era !== 'heute') {
        if (S.bau) abbauen();
        stille();
        return;
      }
      lauf(Math.min(dt, 0.25));
    } catch (e) {
      if (!S.err) console.warn('grenzland feste', e);
      S.err = String((e && e.message) || e).slice(0, 200);
    }
  }
  function stop() {
    abbauen();
    stille();
    if (S.an) KERN.emit('grenzland:fest', { id: S.an, an: false });
    S.an = '';
    S.auf = null;
  }
  KERN.tick(tick, 'grenzland/feste');
  KERN.on('grenzland:stop', () => stop());
  // ---- the API ----
  function aktiv() {
    const o = offen();
    if (!o) return null;
    const F = D.FESTE[o.id],
      c = S.bau && S.bau.id === o.id ? S.bau.mitte : mitte(o.id);
    return {
      id: o.id,
      name: F.name,
      ort: F.ort,
      x: c[0],
      y: c[1],
      r: F.r,
      bis: Math.floor(CLOCK.t / 1440) * 1440 + o.bis,
    };
  }
  function kalender(t = CLOCK.t) {
    return D.kalender(eday(t), minOf(t), 4);
  }
  // how much crowd there is to hide in at (x, y): 0 … 1 (inside the festival's reach while open)
  function deckung(x, y) {
    const a = aktiv();
    if (!a) return 0;
    const d = hyp(x - a.x, y - a.y);
    return d > a.r ? 0 : Math.min(1, 0.4 + 0.6 * (1 - d / a.r));
  }
  Object.assign(S, {
    offen,
    aktiv,
    kalender,
    platz,
    deckung,
    tick,
    stop,
    linien: () => D.linien(),
    debug: {
      // date and clock to the next opening of a festival (min: the minute of that day, default two hours after it opens)
      zu(id, min) {
        const n = D.naechster(id, eday(), minOf());
        if (!n) return null;
        const d = Math.floor(CLOCK.t / 1440);
        DN.e0 = n.eday - d;
        if (GL.on && GL.e0neu) GL.e0neu = DN.e0;
        CLOCK.t = d * 1440 + (min != null ? min : n.von + 120);
        try {
          if (DN.active) DN.update(true);
        } catch (e) {}
        S.acc = 0;
        return { eday: n.eday, t: CLOCK.t };
      },
      stand: () => ({
        auf: S.auf ? S.auf.id : null,
        bau: S.bau ? S.bau.id : null,
        staende: S.bau ? S.bau.staende.map(s => [s.id, Math.round(s.x * 10) / 10, Math.round(s.y * 10) / 10]) : [],
        baum: S.bau ? S.bau.baum : null,
        plaetze: S.bau ? S.bau.plaetze.length : 0,
        meshes: S.bau ? S.bau.meshes.length : 0,
        musik: S.ton ? { datei: S.ton.datei || null, spielt: !!(S.ton.el && !S.ton.el.paused) } : null,
        n: Object.assign({}, S.n),
        err: S.err,
      }),
    },
  });
  return S;
})();
window.GLFESTE = GLFESTE;
