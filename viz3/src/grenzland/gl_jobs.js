// ===================== feat/grenzland-ruf: side jobs and small side quests in the world (GLJOBS) =====================
// Falko, 17.11.2026 12:26 („Nebenjobs“: Brennholz fahren, Brötchen ausliefern, bei der Feuerwehr helfen – kleines Geld und guter Ruf) and
// ~13:30 (realism first; a few side quests in Ratscher and Schleusingen). The rules, times, pay and words are grenzland/gl_jobs_data.js
// (GLJOBSDATA, unit-tested); here they happen:
//   offers     an SMS from whoever asks (the bakery, Wolfgang, Manfred, Ingrid, Katrin, Gerhard) at a fitting hour, one after another;
//              every offer stands in the journal (J) and in the phone's „Aufträge“ (gl_handy.js) with when and where; a job begins at
//              its place by the action button (or „Annehmen“ in the phone: the way there first), a side quest runs from its offer on
//   Brötchen   the crate of the (invented) Backstube Schleusetal stands at the shop on wheels from 5:30 (Monday to Saturday); with it
//              strapped on the moped's carrier, six paper bags go on six doors (the villagers' houses, dorf/dorf_life.js) – the clock
//              runs in real time meanwhile; a hard knock squashes a bag; paid by GLJOBSDATA.lohnBroetchen (tip, deduction, complaint)
//   Brennholz  Wolfgang's stack of split beech at the forest track to the Klinge; the estate car of the game (vehicles/car.js, its load
//              space) takes one load: load (held), drive to Gerhard, unload (a neat stack by his door), again for Katrin
//   Feuerwehr  Saturday 9:00 at the old school (the fire brigade's house): two volunteers (Steffen, Anja – invented; Manfred is away),
//              a folding water tank, the portable pump, the target; suction hose, pump, the hose line unrolling behind the player,
//              water on the target against the clock – then coffee and cake at the beer table
//   quests     Ingrid's yellow bin to the road (lid to the road), Katrin's parcel from Gerhard's doorstep to hers, Milchreis from the
//              shop on wheels for Gerhard, Gerhard's photographs to the town hall in Schleusingen at its opening hours (OEFFNUNG of
//              `laeden-leben` when it is there)
// Never while a mission runs (a mission that begins breaks a job off), never in 1989; everything gone with „Beenden“. What was offered
// and done is saved under 'pav-gl-jobs-v1'; a job that runs is not (a reload offers it again). Pay through GL.earn, the village's
// opinion through GLRUF.add (and what it gossips through GLRUF.merke). Runs in GLRUF's tick (GLRUF.dazu).
//   GLJOBS.angebote() → [{ id, titel, art, von, text, wann, ort, st, jetzt }] · start(id) · abbrechen() · aktiv() · tick(dt) · stop() ·
//   linien() · debug
// Events: 'grenzland:job' { id, st: 'angeboten' | 'läuft' | 'erledigt' | 'abgebrochen', lohn, ruf }.
import * as THREE from 'three';
import { scene } from '../core/head.js';
import { KERN } from '../core/kern.js';
import { SAVE } from '../core/save.js';
import { markDirty } from '../core/assets.js';
import { P } from '../game/walkable.js';
import { PLAY } from '../game/play.js';
import { QUESTS } from '../game/quests.js';
import { CLOCK } from '../time/clock.js';
import { DN } from '../time/daynight.js';
import { VEH } from '../vehicles/vehicle.js';
import { ROADS } from '../world/roads.js';
import { STIMME } from '../audio/stimme.js';
import { GL } from './gl_state.js';
import { GLDATA } from './gl_data.js';
import { GLTON } from './gl_ton.js';
import { GLFIG } from './gl_fig.js';
import { GLAUTO } from './gl_auto.js';
import { GLHUD } from './gl_hud.js';
import { GLKARTE } from './gl_karte.js';
import { GLHANDY } from './gl_handy.js';
import { GLORTE } from './gl_orte.js';
import { GLRUF } from './gl_ruf.js';
import { GLJOBSDATA } from './gl_jobs_data.js';
export const GLJOBS = (() => {
  const D = GLJOBSDATA,
    T = D.T,
    hyp = Math.hypot;
  const obj = v => !!v && typeof v === 'object' && !Array.isArray(v);
  const KEY = SAVE.key('pav-gl-jobs-v1', {
    owner: 'grenzland-ruf',
    kind: 'json',
    def: null,
    check: v =>
      v === null ||
      (obj(v) &&
        v.v === 1 &&
        obj(v.gesehen) &&
        obj(v.erledigt) &&
        obj(v.zuletzt) &&
        obj(v.auf) &&
        Object.values(v.auf).every(q => obj(q) && (q.st === 'läuft' || q.st === 'erledigt') && Number.isInteger(q.i))),
  });
  const leer = () => ({ v: 1, gesehen: {}, erledigt: {}, zuletzt: {}, auf: {} });
  const S = {
    sv: leer(), // what is kept: offered (id → 1), done (id → times), last done (id → day), side quests (id → { st, i })
    akt: null, // the job that runs: { id, i, sek, … }
    welt: [], // meshes of the jobs and quests in the world (removed when they are no longer needed)
    figs: [], // figures of the exercise
    tueten: [], // the paper bags on the doors (until the next round)
    stapelM: null, // Wolfgang's stack (stays while the mode runs)
    raeumen: null, // a job done whose things go once the player is away: { A, t }
    acc: 0,
    freiT: 0, // seconds of free play (offers wait a little)
    angebotT: 0, // until the next offer may come
    questT: 0,
    prevTrack: null,
    err: null,
    n: { angebot: 0, start: 0, fertig: 0 },
  };
  const save = () => SAVE.set(KEY, S.sv);
  const eday = () => (DN && Number.isFinite(DN.e0) ? DN.e0 : 0) + Math.floor(CLOCK.t / 1440);
  const wd = () => D.wochentag(eday());
  const minute = () => D.minOf(CLOCK.t);
  const heute = () => GL.on && GL.era === 'heute';
  const mission = () => !!GL.cur || !!(window.GLMISSION && GLMISSION.cur && GLMISSION.cur());
  const frei = () => heute() && !mission();
  const kino = () => document.body.dataset.glKino === '1';
  const zu = p => (KERN.where() ? hyp(KERN.where()[0] - p[0], KERN.where()[1] - p[1]) : 1e9);
  const gnd = (x, y) => GLORTE.gnd(x, y);
  const zuFuss = () => !VEH.cur && P.mode === 'walk' && !PLAY.seated();
  const pause = s => new Promise(res => setTimeout(res, window.FREEZE ? 0 : Math.round(s * 1000)));
  // ---------------- places ----------------
  // the villagers' houses (dorf/dorf_life.js): door, doorstep, the way out (n), along the front (d)
  const haus = k => {
    try {
      const H = window.DLIFE && DLIFE.homes ? DLIFE.homes() : null;
      return (H && H[k]) || null;
    } catch (e) {
      return null;
    }
  };
  const KUNDEN = ['gerhard', 'ingrid', 'heike', 'katrin', 'manfred', 'wolfgang', 'jens'];
  const NAME = k => {
    const n = {
      gerhard: 'Gerhard',
      ingrid: 'Ingrid',
      heike: 'Heike',
      katrin: 'Katrin',
      manfred: 'Manfred',
      wolfgang: 'Wolfgang',
      jens: 'Jens',
    };
    return n[k] || k;
  };
  // a point a step beside the door, against the wall (side: +1 / −1 along the front)
  const neben = (h, side, out = 0.45, along = 1.5) => [
    h.door[0] + h.d[0] * along * side + h.n[0] * out,
    h.door[1] + h.d[1] * along * side + h.n[1] * out,
  ];
  // the road beside a house: out of the door until just beside the road's edge (ROADS.edge > −1.2 is on or at the road)
  // free ground: off the road (ROADS.edgeAt: metres to the road's edge, negative outside), not in a wall, a fence or a house, not under
  // a tree's crown or the lime tree of the Anger
  function freiGrund(p, r = 0.8, rand = 1.5) {
    const x = p[0],
      y = p[1];
    try {
      if (ROADS && ROADS.edgeAt && ROADS.edgeAt(x, y) > -rand) return false;
      if (window.WCOL && WCOL.pushCircle && WCOL.pushCircle([x, y], r)) return false;
      if (KERN.inside && KERN.inside(x, y, gnd(x, y) + 1)) return false;
      const L = GLDATA.ORTE.linde && GLDATA.ORTE.linde.pos;
      if (L && hyp(x - L[0], y - L[1]) < 11) return false;
      const T = window.RATSCHER && RATSCHER.treeRecs;
      if (T)
        for (const t of T)
          if (Math.abs(t.x - x) < 9 && Math.abs(t.y - y) < 9 && hyp(t.x - x, t.y - y) < (t.r || 2.5) + 0.6)
            return false;
    } catch (e) {}
    return true;
  }
  // the kerb nearest a house's door (any direction – through the gate): the spot a step short of the road's edge, and the way to the road
  function strasse(h) {
    let best = null;
    try {
      for (let a = 0; a < 360; a += 10) {
        const r = (a * Math.PI) / 180,
          dx = Math.sin(r),
          dy = Math.cos(r);
        for (let w = 1; w < 32; w += 0.25) {
          const x = h.door[0] + dx * w,
            y = h.door[1] + dy * w;
          if (ROADS.edgeAt(x, y) > -0.9) {
            const q = [x - dx * 0.45, y - dy * 0.45];
            if ((!best || w < best[2]) && freiGrund(q, 0.35, 0.5)) best = [q[0], q[1], w, a];
            break;
          }
        }
      }
    } catch (e) {}
    return best || [h.door[0] + h.n[0] * 3, h.door[1] + h.n[1] * 3, 3, (Math.atan2(h.n[0], h.n[1]) * 180) / Math.PI];
  }
  // the shop on wheels: the crate stands on the ground beside the customers' spot
  let kisteP = null;
  function kistenPlatz() {
    if (kisteP) return kisteP;
    const W = GLORTE.WG;
    if (!W || !W.kunde) return GLDATA.ORTE.wagen.pos.slice();
    const o = W.o || W.kunde,
      dx = W.kunde[0] - o[0],
      dy = W.kunde[1] - o[1],
      l = hyp(dx, dy) || 1,
      p = [W.kunde[0] - (dy / l) * 1.4, W.kunde[1] + (dx / l) * 1.4];
    try {
      KERN.pushOut(p, 0.35);
    } catch (e) {}
    return (kisteP = p);
  }
  // Wolfgang's stack: beside the forest track to the Klinge, three quarters of the way, a few metres off the track
  let stapelP = null;
  function stapelPlatz() {
    if (stapelP) return stapelP;
    const R = ROADS && ROADS.routes && ROADS.routes.klinge;
    if (!R || R.length < 3) return (stapelP = { p: [-300, -380], hd: 0 });
    const L = [0];
    for (let i = 1; i < R.length; i++) L.push(L[i - 1] + hyp(R[i][0] - R[i - 1][0], R[i][1] - R[i - 1][1]));
    const s = L[L.length - 1] * 0.72;
    let i = 1;
    while (i < R.length - 1 && L[i] < s) i++;
    const a = R[i - 1],
      b = R[i],
      k = (s - L[i - 1]) / (L[i] - L[i - 1] || 1),
      x = a[0] + (b[0] - a[0]) * k,
      y = a[1] + (b[1] - a[1]) * k,
      hd = Math.atan2(b[0] - a[0], b[1] - a[1]),
      // to the left of the way out
      nx = -Math.cos(hd),
      ny = Math.sin(hd);
    const p = [x + nx * 4.2, y + ny * 4.2];
    try {
      KERN.pushOut(p, 1.2);
    } catch (e) {}
    return (stapelP = { p, hd, weg: [x, y] });
  }
  // the exercise in front of the old school: the tank and the pump by the house, the target out on the Anger
  let fwP = null;
  function fwPlatz() {
    if (fwP) return fwP;
    // the yard behind the fire brigade's house (the old school) first, then round the house, then the Anger's green: the first layout
    // whose every spot is free ground (the best one else)
    const O = GLDATA.ORTE,
      sc = O.schule.pos,
      mitten = [
        O.schulhof ? O.schulhof.pos : sc,
        [sc[0] - 14, sc[1] + 10],
        [sc[0] + 14, sc[1] + 12],
        [sc[0], sc[1] + 18],
        O.anger.pos,
      ];
    let best = null;
    for (const c of mitten) {
      for (let a = 0; a < 360; a += 30) {
        const r = (a * Math.PI) / 180,
          ux = Math.sin(r),
          uy = Math.cos(r),
          px = Math.cos(r),
          py = -Math.sin(r),
          at = (u, v) => [c[0] + ux * u + px * v, c[1] + uy * u + py * v];
        const L = {
          becken: at(-2, -3.2),
          pumpe: at(-2, -0.8),
          marke: at(12, 0),
          ziel: at(18, 0),
          tisch: at(-4.5, 5),
          leute: [at(-0.5, -0.6), at(-3.6, -2)],
          hd: r,
        };
        const pts = [
          L.becken,
          L.pumpe,
          L.marke,
          L.ziel,
          L.tisch,
          L.leute[0],
          L.leute[1],
          at(2, -0.4),
          at(6, -0.2),
          at(9, 0),
          at(15, 0),
          at(-4.5, 6.2),
          at(-4.5, 3.8),
        ];
        let n = 0;
        for (const p of pts) if (freiGrund(p, p === L.becken ? 1.4 : 0.6)) n++;
        if (!best || n > best.n) best = { n, L };
        if (n === pts.length) return (fwP = L);
      }
    }
    return (fwP = best.L);
  }
  // ---------------- things in the world (merged meshes of vertex colours in the village props' material) ----------------
  const C = {
    papier: GLORTE.L(196, 158, 108),
    papierD: GLORTE.L(160, 124, 80),
    kiste: GLORTE.L(46, 112, 168),
    holz: GLORTE.L(150, 112, 70),
    hirn: GLORTE.L(214, 182, 128),
    gelb: GLORTE.L(232, 196, 40),
    gelbD: GLORTE.L(190, 156, 24),
    schwarz: GLORTE.L(30, 30, 30),
    karton: GLORTE.L(178, 136, 90),
    band: GLORTE.L(220, 200, 150),
    rot: GLORTE.L(176, 34, 30),
    blau: GLORTE.L(60, 110, 170),
    wasser: GLORTE.L(70, 118, 150),
    grau: GLORTE.L(110, 110, 112),
    weiss: GLORTE.L(232, 230, 224),
    schlauch: GLORTE.L(214, 206, 190),
    bank: GLORTE.L(150, 104, 62),
    mappe: GLORTE.L(46, 74, 120),
  };
  const mat = () => GLORTE.mat().paint;
  // a thing built at (x, y) turned by hd, as one mesh in the scene
  function bau(name, x, y, hd, fn, z) {
    const K = GLORTE.kit(),
      F = GLORTE.frame(K, x, y, hd || 0, z != null ? z : gnd(x, y));
    fn(F, K);
    const m = GLORTE.mesh(K, mat(), 'gl job ' + name);
    if (m) {
      S.welt.push(m);
      markDirty();
    }
    return m;
  }
  // a thing hung on a vehicle (its model frame: x right, y ahead, z up)
  function bauAn(g, name, fn) {
    if (!g) return null;
    const K = GLORTE.kit(),
      F = GLORTE.frame(K, 0, 0, 0, 0);
    fn(F, K);
    if (K.empty()) return null;
    const m = new THREE.Mesh(K.geo(), mat());
    m.name = 'gl job ' + name;
    m.userData.noMerge = true;
    m.castShadow = true;
    g.add(m);
    S.welt.push(m);
    markDirty();
    return m;
  }
  function weg(m) {
    if (!m) return;
    m.removeFromParent();
    try {
      m.geometry.dispose();
    } catch (e) {}
    const i = S.welt.indexOf(m);
    if (i >= 0) S.welt.splice(i, 1);
    markDirty();
  }
  function wegAlle() {
    for (const m of S.welt.slice()) weg(m);
  }
  // the bakery's crate with its paper bags
  const kiste = (F, n) => {
    F.box(0, 0, 0, 0.5, 0.36, 0.22, C.kiste, true);
    F.box(0, 0, 0.2, 0.46, 0.32, 0.02, GLORTE.shade(C.kiste, 0.7), false);
    for (let i = 0; i < n; i++)
      F.box(-0.16 + (i % 3) * 0.16, -0.08 + Math.floor(i / 3) * 0.16, 0.2, 0.13, 0.12, 0.14, C.papier, false);
  };
  // a paper bag on the door handle, its top folded over
  const tuete = F => {
    F.box(0, 0, 0, 0.17, 0.1, 0.26, C.papier, true);
    F.box(0, 0.0, 0.26, 0.17, 0.11, 0.04, C.papierD, false);
  };
  // split logs in a stack: rows of rough cylinders, the end grain light (one face of the stack shows it)
  function scheite(F, w, h, dp, R) {
    const r = 0.075,
      rows = Math.max(1, Math.round(h / (r * 1.8))),
      per = Math.max(1, Math.round(w / (r * 2.05)));
    for (let l = 0; l < rows; l++)
      for (let i = 0; i < per - (l % 2); i++) {
        const x = -w / 2 + r + i * r * 2.05 + (l % 2) * r,
          z = r + l * r * 1.75,
          col = GLORTE.shade(C.holz, 0.78 + R() * 0.4);
        F.rolle([x, -dp / 2, z], [x + (R() - 0.5) * 0.04, dp / 2 - R() * 0.06, z], r * (0.85 + R() * 0.3), col, 6, {
          capCol: GLORTE.shade(C.hirn, 0.9 + R() * 0.2),
        });
      }
  }
  // the yellow wheelie bin (240 l: 0.58 × 0.73 m, 1.07 m high), wheels and handle at the back (f −)
  const tonne = F => {
    F.box(0, 0.02, 0.05, 0.56, 0.66, 0.95, C.gelb, true);
    F.box(0, 0, 1.0, 0.6, 0.73, 0.05, C.gelbD, false);
    F.box(0, -0.38, 0.92, 0.5, 0.05, 0.05, C.schwarz, false);
    for (const s of [-1, 1]) F.cyl(s * 0.27, -0.3, 0, 0.2, 0.1, 0.1, 10, C.schwarz, true);
  };
  const paket = F => {
    F.box(0, 0, 0, 0.42, 0.32, 0.26, C.karton, true);
    F.box(0, 0, 0.26, 0.06, 0.33, 0.005, C.band, false);
  };
  // ---------------- the vehicles ----------------
  const auto = () => (VEH.by && VEH.by.car) || null;
  const moped = () => (GLAUTO.moped && GLAUTO.moped.g ? GLAUTO.moped : null);
  const steht = v => !!v && hyp(v.st.u, v.st.v) < 0.6;
  const heck = v => {
    const C0 = v.model && v.model.cargo;
    return VEH.toW(v, 0, (C0 ? C0.y0 : -2.3) - 0.75);
  };
  // ---------------- messages ----------------
  function sms(von, text, sek) {
    if (sek) return later(sek, () => heute() && GLHANDY.sms(von, text));
    try {
      GLHANDY.sms(von, text);
    } catch (e) {}
  }
  const Q = [];
  const later = (t, fn) => Q.push({ t, fn });
  function emit(id, st, o) {
    KERN.emit('grenzland:job', Object.assign({ id, st }, o || {}));
  }
  const sagt = async (lines, F) => {
    for (const [who, text] of lines) {
      if (!GL.on) return;
      const N = (D.LEUTE[who] && D.LEUTE[who].name) || (GLDATA.CAST[who] && GLDATA.CAST[who].name) || who,
        Fi = F && F[who];
      try {
        if (Fi) GLFIG.talking(Fi, true);
      } catch (e) {}
      const dur = GLHUD.sub(N, text);
      try {
        STIMME.say('gl_' + who, text, Fi ? { at: [Fi.x, Fi.y] } : {});
      } catch (e) {}
      await pause(dur + 0.25);
      try {
        if (Fi) GLFIG.talking(Fi, false);
      } catch (e) {}
    }
  };
  const track = id => {
    try {
      if (QUESTS.track && !String(QUESTS.track).startsWith('grenzland-jobs:') && S.prevTrack == null)
        S.prevTrack = QUESTS.track;
      QUESTS.track = 'grenzland-jobs:' + id;
    } catch (e) {}
  };
  const untrack = () => {
    try {
      if (String(QUESTS.track).startsWith('grenzland-jobs:')) QUESTS.track = S.prevTrack || '';
    } catch (e) {}
    S.prevTrack = null;
  };
  // ================================================================ the jobs ================================================================
  const JOB = {};
  // the crate strapped on the moped's carrier (Simson S 51: the carrier 0.75 m up, 0.8–0.97 m behind the axle centre), a little smaller
  const korb = n => {
    const m = moped();
    if (!m) return null;
    return bauAn(m.g, 'korb', F =>
      kiste(
        {
          box: (r, f, z, a, b, c, col, bot) =>
            F.box(r * 0.7, f * 0.75 - 0.88, z * 0.8 + 0.76, a * 0.7, b * 0.75, c * 0.8, col, bot),
        },
        n
      )
    );
  };
  // ---- Brötchen ausliefern ----
  JOB.broetchen = {
    an(A) {
      for (const m of S.tueten.splice(0)) weg(m);
      A.kiste = kistenPlatz();
      A.kunden = KUNDEN.filter(k => k !== 'uwe' && haus(k)).slice(0, D.JOBS.broetchen.n);
      A.done = {};
      A.platt = 0;
      A.lastV = 0;
      A.kisteM = bau('kiste', A.kiste[0], A.kiste[1], 0.3, F => kiste(F, A.kunden.length));
    },
    text(A) {
      if (A.i === 0) return T.broetchen.zum;
      const n = A.kunden.length - Object.keys(A.done).length;
      return T.broetchen.runde(n, D.mmss(A.sek));
    },
    ziel(A) {
      if (A.i === 0) return A.kiste;
      const p = KERN.where() || [P.x, P.y];
      let best = null,
        bd = 1e9;
      for (const k of A.kunden)
        if (!A.done[k]) {
          const h = haus(k),
            d = h ? hyp(h.step[0] - p[0], h.step[1] - p[1]) : 1e9;
          if (d < bd) {
            bd = d;
            best = h.step;
          }
        }
      return best;
    },
    ziele(A) {
      return A.i === 0 ? [] : A.kunden.filter(k => !A.done[k]).map(k => haus(k).step);
    },
    wo(A) {
      if (A.i === 0) return D.JOBS.broetchen.ort;
      const z = JOB.broetchen.ziel(A),
        k = z && A.kunden.find(q => haus(q) && haus(q).step === z);
      return k ? 'Tür von ' + NAME(k) : 'Ratscher';
    },
    // take the crate: on the moped's carrier when the moped is there
    nehmen(A) {
      weg(A.kisteM);
      A.kisteM = null;
      A.i = 1;
      A.sek = 0;
      CLOCK.focus('gl-jobs');
      A.korb = korb(A.kunden.length);
      GLTON.fx('tick');
      PLAY.think('Sechs Tüten. Sechs Türen. Die Uhr läuft.', 3000);
    },
    haengen(A, k) {
      const h = haus(k);
      if (!h || A.done[k]) return;
      A.done[k] = true;
      const p = [h.door[0] + h.d[0] * 0.42 + h.n[0] * 0.08, h.door[1] + h.d[1] * 0.42 + h.n[1] * 0.08];
      S.tueten.push(bau('tuete', p[0], p[1], Math.atan2(h.n[0], h.n[1]), tuete, gnd(h.step[0], h.step[1]) + 0.82));
      GLTON.fx('tick');
      if (A.korb) {
        weg(A.korb);
        const rest = A.kunden.length - Object.keys(A.done).length;
        A.korb = rest > 0 ? korb(rest) : null;
      }
      if (Object.keys(A.done).length >= A.kunden.length) fertig(A);
    },
    tick(A, dt) {
      if (A.i < 1) return;
      A.sek += dt;
      if (!A.zuSpaet && minute() >= D.JOBS.broetchen.ende) {
        A.zuSpaet = true;
        PLAY.think(T.broetchen.zuSpaet, 3200);
      }
      // a hard knock on the moped squashes a bag (the vehicle loses much speed at once)
      const v = VEH.cur && VEH.cur.id === 'gl-moped' ? hyp(VEH.cur.st.u, VEH.cur.st.v) : 0;
      const rest = A.kunden.length - Object.keys(A.done).length;
      if (VEH.cur && VEH.cur.id === 'gl-moped' && A.lastV - v > 5.5 && dt < 0.2 && rest > A.platt) {
        A.platt++;
        GLTON.fx('bruch');
        PLAY.think(T.broetchen.platt, 2600);
      }
      A.lastV = v;
    },
    ende(A) {
      const L = D.lohnBroetchen({ sek: A.sek, platt: A.platt, zuSpaet: A.zuSpaet });
      GL.earn(L.summe, D.JOBS.broetchen.von);
      GLRUF.add('ratscher', L.ruf, 'job:broetchen');
      GLRUF.merke(A.platt ? 'broetchen_platt' : 'broetchen', 'ratscher', { chatIn: 30 });
      if (A.platt) sms('Wolfgang', T.broetchen.beschwerde, 25);
      else sms('Heike', T.broetchen.danke, 35);
      GLHUD.say(
        T.broetchen.fertig,
        '+' +
          L.summe +
          ' € · Trinkgeld ' +
          L.trinkgeld +
          ' €' +
          (A.platt ? ' · ' + A.platt + ' zerdrückt (−' + L.abzug + ' €)' : '') +
          ' · ' +
          D.mmss(A.sek),
        6
      );
      return { lohn: L.summe, ruf: L.ruf, trinkgeld: L.trinkgeld, platt: A.platt };
    },
    aus(A) {
      weg(A.kisteM);
      weg(A.korb);
      A.kisteM = A.korb = null;
    },
  };
  for (const k of KUNDEN)
    KERN.act({
      id: 'gl-job-tuete-' + k,
      r: 2.2,
      prio: 0.5,
      hold: 0.6,
      label: () => {
        const A = S.akt;
        return A && A.id === 'broetchen' && A.i === 1 && A.kunden.includes(k) && !A.done[k] && zuFuss()
          ? T.broetchen.haengen
          : null;
      },
      pos: () => {
        const h = haus(k);
        return h ? [h.step[0], h.step[1], gnd(h.step[0], h.step[1]) + 1] : [0, 0, -999];
      },
      run: () => S.akt && S.akt.id === 'broetchen' && JOB.broetchen.haengen(S.akt, k),
    });
  KERN.act({
    id: 'gl-job-kiste',
    r: 2.4,
    prio: 0.55,
    hold: 0.8,
    label: () => {
      if (!frei() || !zuFuss()) return null;
      const A = S.akt;
      if (A && A.id === 'broetchen' && A.i === 0) return T.broetchen.kiste;
      return !A && D.offenAm(D.JOBS.broetchen, wd(), minute()) && S.sv.gesehen.broetchen ? T.broetchen.kiste : null;
    },
    pos: () => {
      const p = S.akt && S.akt.kiste ? S.akt.kiste : kistenPlatz();
      return [p[0], p[1], gnd(p[0], p[1]) + 0.6];
    },
    run: () => {
      if (!S.akt && !start('broetchen')) return;
      if (S.akt && S.akt.id === 'broetchen' && S.akt.i === 0) JOB.broetchen.nehmen(S.akt);
    },
  });
  // ---- Brennholz fahren ----
  JOB.holz = {
    an(A) {
      const SP = stapelPlatz();
      A.stapel = SP.p;
      A.ziele = ['gerhard', 'katrin'].filter(k => haus(k));
      A.fuhre = 0; // loads delivered
      A.geladen = false;
      A.i = 0;
      // (the stack stays where it is – two loads do not take a stack of two metres away)
      if (!S.stapelM || !S.stapelM.parent)
        S.stapelM = bau('stapel', SP.p[0], SP.p[1], SP.hd + Math.PI / 2, (F, K) => {
          const R = GLORTE.rnd(7);
          for (const s of [-1, 1]) F.box(s * 1.05, 0, 0, 0.08, 0.08, 1.25, GLORTE.shade(C.holz, 0.7), true);
          scheite(F, 2.0, 1.0, 0.95, R);
        });
    },
    text(A) {
      if (!auto()) return T.holz.auto;
      if (!A.geladen) return A.fuhre === 0 ? T.holz.zum : T.holz.zurueck;
      return T.holz.zu(NAME(A.ziele[A.fuhre]));
    },
    ziel(A) {
      if (!A.geladen) return A.stapel;
      const h = haus(A.ziele[A.fuhre]);
      return h ? h.step : null;
    },
    wo(A) {
      return A.geladen ? 'Haus von ' + NAME(A.ziele[A.fuhre]) : 'Holzstapel am Waldweg';
    },
    laden(A) {
      const v = auto();
      if (!v || A.geladen) return;
      A.geladen = true;
      A.sek = A.sek || 0;
      const C0 = v.model.cargo || { y0: -2.3, y1: -1.4, z: 0.63, hw: 0.68, h: 0.88 };
      A.ladung = bauAn(v.g, 'ladung', F => {
        const R = GLORTE.rnd(11 + A.fuhre),
          w = C0.hw * 1.7,
          dp = (C0.y1 - C0.y0) * 0.9,
          K2 = {
            rolle: (a, b, r, col, seg, o) =>
              F.rolle(
                [a[0], a[1] + (C0.y0 + C0.y1) / 2, a[2] + C0.z],
                [b[0], b[1] + (C0.y0 + C0.y1) / 2, b[2] + C0.z],
                r,
                col,
                seg,
                o
              ),
          };
        scheite(K2, w, Math.min(0.55, C0.h * 0.6), dp, R);
      });
      GLTON.fx('rolle');
      PLAY.think('Eine Fuhre Buche. Der Kombi liegt tiefer.', 2600);
    },
    abladen(A) {
      const v = auto(),
        k = A.ziele[A.fuhre],
        h = haus(k);
      if (!v || !A.geladen || !h) return;
      weg(A.ladung);
      A.ladung = null;
      A.geladen = false;
      const p = neben(h, A.fuhre % 2 ? -1 : 1, 0.55, 2.2);
      bau('holz ' + k, p[0], p[1], Math.atan2(h.n[0], h.n[1]), F =>
        scheite(F, 1.4, 0.8, 0.35, GLORTE.rnd(23 + A.fuhre))
      );
      GLTON.fx('rolle');
      A.fuhre++;
      const L = D.lohnHolz(1);
      GL.earn(L.summe, 'Wolfgang');
      GLRUF.add('ratscher', L.ruf, 'job:holz');
      sms(NAME(k), T.holz[k] || T.holz.gerhard, 20);
      if (A.fuhre >= A.ziele.length) fertig(A);
      else PLAY.think(T.holz.zurueck, 2600);
    },
    ende(A) {
      const L = D.lohnHolz(A.fuhre);
      GLRUF.merke('holz', 'ratscher', { chatIn: 30 });
      GLHUD.say(T.holz.fertig, '+' + L.summe + ' € · ' + A.fuhre + (A.fuhre === 1 ? ' Fuhre' : ' Fuhren'), 6);
      return { lohn: L.summe, ruf: L.ruf };
    },
    aus(A) {
      weg(A.ladung);
      A.ladung = null;
    },
  };
  const holzBereit = (A, nah) => {
    const v = auto();
    if (!A || A.id !== 'holz' || !v || !steht(v) || !zuFuss()) return false;
    const p = A.geladen ? haus(A.ziele[A.fuhre]) && haus(A.ziele[A.fuhre]).step : A.stapel;
    return !!p && hyp(v.st.x - p[0], v.st.y - p[1]) < nah && zu(heck(v)) < 3;
  };
  KERN.act({
    id: 'gl-job-holz',
    r: 2.6,
    prio: 0.55,
    hold: 3,
    label: () => {
      const A = S.akt;
      if (!A || A.id !== 'holz') return null;
      if (!A.geladen && holzBereit(A, 12)) return T.holz.laden;
      if (A.geladen && holzBereit(A, 26)) return T.holz.abladen;
      return null;
    },
    pos: () => {
      const v = auto();
      if (!v) return [0, 0, -999];
      const p = heck(v);
      return [p[0], p[1], v.st.z + 0.9];
    },
    run: () => {
      const A = S.akt;
      if (!A || A.id !== 'holz') return;
      if (A.geladen) JOB.holz.abladen(A);
      else JOB.holz.laden(A);
    },
  });
  // ---- the fire brigade's exercise ----
  const FWCAST = {
    fw_steffen: {
      name: 'Steffen',
      fig: 'vk_m02',
      clips: 'm',
      h: 1.8,
      kleid: 'fw_einsatz',
      hut: 'basecap',
      voice: { g: 'm', age: 44 },
    },
    fw_anja: { name: 'Anja', fig: 'vk_f14', clips: 'f', h: 1.69, kleid: 'fw_einsatz', voice: { g: 'f', age: 31 } },
  };
  // the protective suit of the volunteer fire brigades: dark blue with yellow-silver reflective bands
  if (GLDATA.KLEID && !GLDATA.KLEID.fw_einsatz)
    GLDATA.KLEID.fw_einsatz = {
      ober: [28, 40, 78],
      unter: [28, 40, 78],
      schuh: [18, 18, 18],
      arm: true,
      streifen: [214, 206, 90],
    };
  for (const [k, v] of Object.entries(FWCAST)) if (!GLDATA.CAST[k]) GLDATA.CAST[k] = v;
  try {
    for (const [k, v] of Object.entries(FWCAST)) STIMME.person('gl_' + k, Object.assign({ name: v.name }, v.voice));
  } catch (e) {}
  function fwBauen(A) {
    const W = fwPlatz();
    A.W = W;
    // the folding tank (5000 l: Ø 2.6 m, 0.85 m high) with water in it
    A.beckenM = bau('becken', W.becken[0], W.becken[1], W.hd, F => {
      F.cyl(0, 0, 0, 0.85, 1.3, 1.3, 20, C.rot, false);
      F.cyl(0, 0, 0.82, 0.86, 1.32, 1.32, 20, GLORTE.shade(C.rot, 0.7), true);
      F.cyl(0, 0, 0.6, 0.62, 1.26, 1.26, 20, C.wasser, true);
    });
    // the portable pump (TS 8/8): a red frame with carrying handles, the engine block, the outlets
    A.pumpeM = bau('pumpe', W.pumpe[0], W.pumpe[1], W.hd, F => {
      F.box(0, 0, 0.12, 0.62, 0.82, 0.5, C.rot, true);
      F.box(0, 0, 0.62, 0.5, 0.6, 0.12, GLORTE.shade(C.rot, 0.75), false);
      for (const s of [-1, 1]) F.box(s * 0.38, 0, 0.3, 0.04, 1.0, 0.04, C.grau, false);
      for (const s of [-1, 1]) F.box(s * 0.22, 0.46, 0.3, 0.1, 0.1, 0.1, C.grau, false);
      F.box(0, -0.46, 0.25, 0.14, 0.12, 0.14, C.grau, false);
    });
    // the target: a board on two posts with a round hole and a flap that falls when it is hit
    A.zielM = bau('ziel', W.ziel[0], W.ziel[1], W.hd + Math.PI, F => {
      for (const s of [-1, 1]) F.box(s * 0.7, 0, 0, 0.08, 0.08, 1.6, C.grau, true);
      F.box(0, 0, 0.5, 1.5, 0.04, 1.0, C.weiss, false);
      F.box(0, -0.025, 0.85, 0.4, 0.01, 0.4, C.rot, false);
    });
    A.klappeM = bau('klappe', W.ziel[0], W.ziel[1], W.hd + Math.PI, F =>
      F.box(0, -0.05, 1.5, 0.5, 0.03, 0.34, C.rot, false)
    );
    // the marker on the ground where the hose line must reach
    A.markeM = bau('marke', W.marke[0], W.marke[1], W.hd, F => F.box(0, 0, 0.005, 1.0, 0.12, 0.01, C.weiss, false));
    // the beer table with coffee and cake
    A.tischM = bau('tisch', W.tisch[0], W.tisch[1], W.hd, F => {
      F.box(0, 0, 0.73, 2.2, 0.5, 0.04, C.bank, false);
      for (const s of [-1, 1]) F.box(s * 0.9, 0, 0, 0.05, 0.4, 0.73, C.grau, true);
      for (const b of [-0.55, 0.55]) {
        F.box(0, b, 0.44, 2.2, 0.25, 0.04, C.bank, false);
        for (const s of [-1, 1]) F.box(s * 0.9, b, 0, 0.05, 0.2, 0.44, C.grau, true);
      }
      F.box(-0.5, 0, 0.77, 0.4, 0.3, 0.03, C.weiss, false);
      F.box(-0.5, 0, 0.8, 0.34, 0.24, 0.05, GLORTE.L(200, 150, 80), false);
      for (const x of [0.2, 0.45, 0.7]) F.cyl(x, 0.1, 0.77, 0.87, 0.04, 0.04, 8, C.weiss, true);
    });
  }
  async function fwLeute(A) {
    const W = A.W;
    for (const [i, id] of ['fw_steffen', 'fw_anja'].entries()) {
      const F = await GLFIG.make(id, {});
      if (!F) continue;
      if (!S.akt || S.akt !== A) {
        GLFIG.drop(F);
        return;
      }
      const p = W.leute[i].slice();
      try {
        KERN.pushOut(p, 0.4);
      } catch (e) {}
      GLFIG.place(F, p[0], p[1], W.hd + Math.PI);
      F.sees = false;
      F.job = true;
      A.F[id] = F;
      S.figs.push(F);
    }
  }
  // the hose line: from the pump along the way the player walked, on the ground
  function schlauchNeu(A) {
    weg(A.schlauchM);
    const pts = A.weg;
    if (!pts || pts.length < 2) return;
    A.schlauchM = bau(
      'schlauch',
      0,
      0,
      0,
      F => {
        for (let i = 1; i < pts.length; i++)
          F.rolle(
            [pts[i - 1][0], pts[i - 1][1], gnd(pts[i - 1][0], pts[i - 1][1]) + 0.04],
            [pts[i][0], pts[i][1], gnd(pts[i][0], pts[i][1]) + 0.04],
            0.035,
            C.schlauch,
            6
          );
      },
      0
    );
  }
  // the jet: a thin arc of water from the nozzle to the target while it runs
  function strahl(A, on) {
    weg(A.strahlM);
    A.strahlM = null;
    if (!on) return;
    const a = KERN.where() || A.W.marke,
      b = A.W.ziel,
      z0 = gnd(a[0], a[1]) + 1.15,
      z1 = gnd(b[0], b[1]) + 0.9;
    A.strahlM = bau(
      'strahl',
      0,
      0,
      0,
      F => {
        let q = null;
        for (let i = 0; i <= 12; i++) {
          const k = i / 12,
            p = [a[0] + (b[0] - a[0]) * k, a[1] + (b[1] - a[1]) * k, z0 + (z1 - z0) * k + Math.sin(k * Math.PI) * 1.1];
          if (q) F.rolle(q, p, 0.03 + k * 0.05, GLORTE.L(214, 232, 246), 6);
          q = p;
        }
      },
      0
    );
  }
  JOB.feuerwehr = {
    an(A) {
      A.F = {};
      A.i = 0;
      fwBauen(A);
      fwLeute(A);
    },
    text(A) {
      if (A.i === 0) return T.feuerwehr.zum;
      if (A.i >= 1 && A.i <= 4) return T.feuerwehr.schritte[A.i - 1] + ' · ' + D.mmss(A.sek || 0);
      return T.feuerwehr.kaffee;
    },
    ziel(A) {
      const W = A.W || fwPlatz();
      return A.i === 0 ? W.leute[0] : A.i <= 2 ? W.pumpe : A.i <= 4 ? W.marke : W.tisch;
    },
    wo: A =>
      A.i === 0 ? 'Alte Schule' : A.i <= 2 ? 'Tragkraftspritze' : A.i <= 4 ? 'Markierung vor dem Ziel' : 'Kaffeetafel',
    async melden(A) {
      if (A.i !== 0 || A.busy) return;
      A.busy = true;
      try {
        const F = A.F.fw_steffen;
        if (F) GLFIG.face(F, P.x, P.y);
        await sagt(D.FW.begruessung, A.F);
        if (S.akt !== A) return;
        A.i = 1;
        A.sek = 0;
        CLOCK.focus('gl-jobs');
        track('feuerwehr');
      } finally {
        A.busy = false;
      }
    },
    saug(A) {
      const W = A.W;
      A.saugM = bau(
        'saug',
        0,
        0,
        0,
        F =>
          F.rolle(
            [W.becken[0], W.becken[1], gnd(W.becken[0], W.becken[1]) + 0.7],
            [W.pumpe[0], W.pumpe[1], gnd(W.pumpe[0], W.pumpe[1]) + 0.3],
            0.06,
            C.schwarz,
            8
          ),
        0
      );
      A.i = 2;
      GLTON.fx('kanister');
      sagt([D.FW.saug], A.F);
    },
    starten(A) {
      A.i = 3;
      A.weg = [A.W.pumpe.slice()];
      GLTON.fx('schlag');
      sagt([D.FW.pumpe], A.F);
    },
    async wasser(A) {
      if (A.busy) return;
      A.busy = true;
      try {
        A.i = 5;
        A.zeit = A.sek;
        strahl(A, true);
        GLTON.fx('platsch', zu(A.W.ziel));
        await pause(2.2);
        weg(A.klappeM);
        A.klappeM = bau('klappe', A.W.ziel[0], A.W.ziel[1], A.W.hd + Math.PI, F =>
          F.box(0, -0.25, 1.32, 0.5, 0.34, 0.03, C.rot, false)
        );
        await sagt([D.FW.wasser, D.FW.zeit[D.urteil(A.zeit)]], A.F);
        strahl(A, false);
        CLOCK.unfocus('gl-jobs');
        if (S.akt !== A) return;
        // coffee and cake: the two sit down at the table
        // (the benches lie along the table, 0.55 m to either side; each sits facing the table)
        const W = A.W,
          fx = Math.sin(W.hd),
          fy = Math.cos(W.hd),
          rx = Math.cos(W.hd),
          ry = -Math.sin(W.hd);
        for (const [i, id] of ['fw_steffen', 'fw_anja'].entries()) {
          const F = A.F[id];
          if (!F) continue;
          try {
            const b = i ? 0.55 : -0.55,
              r = i ? -0.5 : 0.5,
              x = W.tisch[0] + rx * r + fx * b,
              y = W.tisch[1] + ry * r + fy * b;
            if (GLFIG.sitz) GLFIG.sitz(F, x, y, W.hd + (i ? Math.PI : 0), 0.46);
            else GLFIG.place(F, x, y, W.hd);
          } catch (e) {}
        }
        await sagt(D.FW.kaffee, A.F);
        if (S.akt === A) fertig(A);
      } finally {
        A.busy = false;
      }
    },
    tick(A, dt) {
      if (A.i >= 1 && A.i <= 4) A.sek = (A.sek || 0) + dt;
      if (A.i === 3) {
        // the hose line unrolls behind the player
        const p = KERN.where(),
          l = A.weg[A.weg.length - 1];
        if (p && hyp(p[0] - l[0], p[1] - l[1]) > 1.4) {
          A.weg.push([p[0], p[1]]);
          if (A.weg.length > 60) A.weg.splice(1, 1);
          schlauchNeu(A);
        }
        if (p && hyp(p[0] - A.W.marke[0], p[1] - A.W.marke[1]) < 1.8) {
          A.i = 4;
          A.weg.push([A.W.marke[0], A.W.marke[1]]);
          schlauchNeu(A);
          sagt([D.FW.schlauch], A.F);
        }
      }
      // the volunteers watch the player
      for (const F of Object.values(A.F || {}))
        try {
          if (GLFIG.blick && !F.sitzt && A.i < 5) GLFIG.blick(F, 'spieler');
        } catch (e) {}
    },
    ende(A) {
      const J = D.JOBS.feuerwehr;
      GL.earn(J.lohn, 'Kameradschaftskasse FF Ratscher');
      GLRUF.add('ratscher', J.ruf, 'job:feuerwehr');
      GLRUF.merke('feuerwehr', 'ratscher', { chatIn: 40 });
      GLHUD.say(T.feuerwehr.fertig, 'Wasser am Ziel nach ' + D.mmss(A.zeit || 0) + ' · +' + J.lohn + ' € · Kuchen', 6);
      return { lohn: J.lohn, ruf: J.ruf, zeit: Math.round(A.zeit || 0) };
    },
    aus(A) {
      CLOCK.unfocus('gl-jobs');
      for (const k of ['beckenM', 'pumpeM', 'zielM', 'klappeM', 'markeM', 'tischM', 'saugM', 'schlauchM', 'strahlM']) {
        weg(A[k]);
        A[k] = null;
      }
      for (const F of Object.values(A.F || {}))
        try {
          GLFIG.drop(F);
        } catch (e) {}
      S.figs = S.figs.filter(F => !Object.values(A.F || {}).includes(F));
      A.F = {};
    },
  };
  KERN.act({
    id: 'gl-job-feuerwehr',
    r: 2.6,
    prio: 0.6,
    label: () => {
      if (!zuFuss() || !frei()) return null;
      const A = S.akt;
      if (A && A.id === 'feuerwehr') {
        if (A.busy) return null;
        if (A.i === 0) return T.feuerwehr.melden;
        if (A.i === 1) return T.feuerwehr.saug;
        if (A.i === 2) return T.feuerwehr.starten;
        if (A.i === 4) return T.feuerwehr.rohr;
        return null;
      }
      return !A && S.sv.gesehen.feuerwehr && D.offenAm(D.JOBS.feuerwehr, wd(), minute()) ? T.feuerwehr.melden : null;
    },
    pos: () => {
      const A = S.akt,
        W = (A && A.W) || fwPlatz(),
        p = !A || A.i === 0 ? W.leute[0] : A.i <= 2 ? W.pumpe : W.marke;
      return [p[0], p[1], gnd(p[0], p[1]) + 1];
    },
    hold: 1.2,
    run: () => {
      if (!S.akt && !start('feuerwehr')) return;
      const A = S.akt;
      if (!A || A.id !== 'feuerwehr') return;
      if (A.i === 0) JOB.feuerwehr.melden(A);
      else if (A.i === 1) JOB.feuerwehr.saug(A);
      else if (A.i === 2) JOB.feuerwehr.starten(A);
      else if (A.i === 4) JOB.feuerwehr.wasser(A);
    },
  });
  // ================================================================ the runner ================================================================
  const aktiv = () => (S.akt ? S.akt.id : '');
  // a job may begin now (or within the hour – the way there first): not in a mission, not in 1989, one at a time
  function start(id) {
    const J = D.JOBS[id];
    if (!J || !JOB[id]) return false;
    if (!frei()) {
      if (heute()) PLAY.think(T.nichtJetzt, 2400);
      return false;
    }
    if (S.akt) return S.akt.id === id;
    if (id === 'broetchen' && KUNDEN.filter(k => haus(k)).length < 4) return false;
    if (id === 'holz' && !auto()) {
      PLAY.think(T.holz.auto, 2600);
      return false;
    }
    if (D.bis(J, CLOCK.t, eday()) > 60) return false;
    const A = { id, i: 0, sek: 0, t0: CLOCK.t };
    S.akt = A;
    try {
      JOB[id].an(A);
    } catch (e) {
      S.err = 'an ' + id + ': ' + String((e && e.message) || e).slice(0, 200);
    }
    S.sv.gesehen[id] = 1;
    save();
    S.n.start++;
    try {
      GLHANDY.freischalten('auftraege');
    } catch (e) {}
    track(id);
    GLHUD.ort(J.titel, T.angenommen, 3.5);
    emit(id, 'läuft');
    return true;
  }
  function fertig(A) {
    if (!A || S.akt !== A) return;
    let r = {};
    try {
      r = JOB[A.id].ende(A) || {};
    } catch (e) {
      S.err = 'ende ' + A.id + ': ' + String((e && e.message) || e).slice(0, 200);
    }
    S.sv.erledigt[A.id] = (S.sv.erledigt[A.id] || 0) + 1;
    S.sv.zuletzt[A.id] = eday();
    save();
    S.n.fertig++;
    S.akt = null;
    CLOCK.unfocus('gl-jobs');
    untrack();
    GLTON.fx('geld');
    emit(A.id, 'erledigt', r);
    // what the job left in the world stays a while (the bags on the doors, the stacks of wood); the exercise is cleared when one goes
    if (A.id === 'feuerwehr') S.raeumen = { A, t: 900 };
    else
      later(2, () => {
        try {
          JOB[A.id].aus(A);
        } catch (e) {}
      });
    S.zuletztA = A;
  }
  // the clock runs to a job's beginning (a time lapse, as the game's own waiting does) – not in a mission, not more than 16 hours ahead
  function warten(id) {
    const J = D.JOBS[id];
    if (!J || !frei() || S.akt || CLOCK.warp) return false;
    const n = D.bis(J, CLOCK.t, eday());
    if (!(n > 0) || n > 16 * 60) return false;
    CLOCK.wait(n + 1, 'Warten: ' + J.titel, () => GL.on && PLAY.think(J.titel + ': ' + J.kurz, 3600));
    return true;
  }
  function abbrechen(quiet) {
    const A = S.akt;
    if (!A) return false;
    S.akt = null;
    try {
      JOB[A.id].aus(A);
    } catch (e) {}
    CLOCK.unfocus('gl-jobs');
    untrack();
    if (!quiet && GL.on) GLHUD.ort(D.JOBS[A.id].titel, T.abgebrochen, 3);
    emit(A.id, 'abgebrochen');
    return true;
  }
  // ================================================================ the side quests ================================================================
  const AUF = D.AUFGABEN;
  const auf = id => S.sv.auf[id] || null;
  const QA = {}; // per quest: the world's things (meshes), not saved
  const QW = {
    tonne: {
      haus: () => haus('ingrid'),
      an(q, W) {
        const h = haus('ingrid');
        if (!h) return;
        // at the house its back to the wall; at the kerb its handle (and the lid's hinge) to the road – „Deckel zur Straße“
        const p = q.i === 0 ? neben(h, -1, 0.55, 2.2) : strasse(h),
          hd = q.i === 0 ? Math.atan2(-h.n[0], -h.n[1]) : (p[3] * Math.PI) / 180 + Math.PI;
        W.m = bau('tonne', p[0], p[1], hd, tonne);
        W.p = p;
      },
      text: () => T.tonne.zum,
      ziel: (q, W) => W.p || null,
    },
    paket: {
      an(q, W) {
        const h = haus(q.i === 0 ? 'gerhard' : 'katrin');
        if (!h || q.i > 1) return;
        if (q.i === 0) {
          const p = neben(h, 1, 0.6, 0.9);
          W.m = bau('paket', p[0], p[1], Math.atan2(h.d[0], h.d[1]), paket, gnd(h.step[0], h.step[1]));
          W.p = p;
        } else W.p = haus('katrin').step;
      },
      text: q => (q.i === 0 ? T.paket.zum : T.paket.zu),
      ziel: (q, W) => W.p || null,
    },
    einkauf: {
      an(q, W) {
        W.p = GL.has(AUF.einkauf.ware)
          ? haus('gerhard') && haus('gerhard').step
          : GLORTE.WG && GLORTE.WG.kunde
            ? GLORTE.WG.kunde
            : GLDATA.ORTE.wagen.pos;
      },
      text: () => (GL.has(AUF.einkauf.ware) ? T.einkauf.bringen : T.einkauf.kaufen),
      ziel: (q, W) => (GL.has(AUF.einkauf.ware) ? haus('gerhard') && haus('gerhard').step : W.p),
    },
    hund: {
      an(q, W) {
        const h = hundHeim();
        W.home = h;
        W.x = h[0];
        W.y = h[1];
        W.az = 0;
        W.v = 0;
        W.t = 0;
        W.mode = 'frei';
        W.A = hundBauen();
        if (q.i > 0) {
          const p = KERN.where() || [P.x, P.y];
          W.x = p[0] - 1.5;
          W.y = p[1] - 1.5;
        }
      },
      text: q => (q.i === 0 ? T.hund.such : T.hund.heim),
      ziel: (q, W) => (q.i === 0 ? W.home : haus('heike') && haus('heike').step),
    },
    chronik: {
      an(q, W) {
        W.p = q.i === 0 ? haus('gerhard') && haus('gerhard').step : rathaus();
      },
      text: q => (q.i === 0 ? T.chronik.zum : T.chronik.zu(rathausZeiten())),
      ziel: (q, W) => (q.i === 0 ? haus('gerhard') && haus('gerhard').step : rathaus()),
    },
  };
  // the town hall of Schleusingen: the counter of its hall (welt/schleusingen.js) when the town is built, else its door on the Markt
  function rathaus() {
    const R = window.SCHL && SCHL.rathaus;
    if (R && R.inside) return R.inside.slice();
    if (R && R.door) return R.door.slice();
    return [-1124.5, 1201.5];
  }
  const rathausOffen = () => {
    const O = window.OEFFNUNG;
    try {
      if (O && O.offen) {
        const r = O.offen('rathaus', CLOCK.t);
        if (typeof r === 'boolean') return r;
      }
    } catch (e) {}
    return D.zeitOffen(AUF.chronik.zeiten, wd(), minute());
  };
  const rathausZeiten = () => {
    const O = window.OEFFNUNG;
    try {
      if (O && O.zeiten) {
        const z = O.zeiten('rathaus');
        if (typeof z === 'string' && z) return z;
      }
    } catch (e) {}
    return D.zeitenText(AUF.chronik.zeiten);
  };
  // ---- Heike's dog Krümel: a small brown-and-white dog (the animals' own bodies, tiere/tiere_koerper.js, with a coat of its own) ----
  // (after the bang he crept into the field barn by the track – dogs hide where it is dim and smells of straw)
  const hundHeim = () => {
    const p = GLORTE.P && GLORTE.P.scheune ? GLORTE.P.scheune.slice() : GLDATA.ORTE.treff.pos.slice();
    try {
      KERN.pushOut(p, 0.6);
    } catch (e) {}
    return p;
  };
  function hundBauen() {
    const TK = window.TKOERPER;
    if (!TK || !TK.PLANS || !TK.PLANS.hund || !TK.make) return null;
    if (!TK.PLANS.gl_kruemel) {
      const c3 = h => {
          const c = new THREE.Color(h);
          return [c.r, c.g, c.b];
        },
        braun = c3(0x8a5a30),
        dunkel = c3(0x4a2e18),
        weiss = c3(0xe6e0d2);
      TK.PLANS.gl_kruemel = Object.assign({}, TK.PLANS.hund, {
        coat(q) {
          const c = Math.cos(q.th || 0);
          if (q.part === 'hleg' || q.part === 'fleg') return weiss;
          if (q.part === 'ear') return dunkel;
          if (q.part === 'tail') return (q.u || 0) > 0.6 ? weiss : braun;
          if (q.part === 'neck') return q.z > 0.6 && c < 0.8 ? weiss : braun;
          return c > 0.35 ? braun : weiss;
        },
      });
    }
    try {
      const A = TK.make('gl_kruemel', {});
      A.g.scale.setScalar(0.68);
      A.g.name = 'gl job hund';
      scene.add(A.g);
      return A;
    } catch (e) {
      S.err = 'hund: ' + String((e && e.message) || e).slice(0, 160);
      return null;
    }
  }
  // he sniffs about near his spot; whoever runs (or rides) at him scares him off; on the lead he trots behind the player
  function hundTick(q, W, dt) {
    if (!W.A) return;
    const p = KERN.where() || [P.x, P.y],
      d = hyp(p[0] - W.x, p[1] - W.y),
      sp = VEH.cur ? hyp(VEH.cur.st.u, VEH.cur.st.v) : P.speed || 0,
      o = {};
    let tx = W.x,
      ty = W.y,
      v = 0;
    if (W.warn > 0) W.warn -= dt;
    if (q.i === 0) {
      if (d < 10 && sp > 2.4) {
        W.mode = 'flieht';
        W.t = 3;
        if (!(W.warn > 0)) {
          PLAY.think(T.hund.flieht, 2200);
          W.warn = 8;
        }
      }
      if (W.mode === 'flieht' && (W.t -= dt) > 0) {
        const l = d || 1;
        tx = W.x + ((W.x - p[0]) / l) * 5;
        ty = W.y + ((W.y - p[1]) / l) * 5;
        v = 4.2;
        o.flee = 1;
      } else {
        W.mode = 'frei';
        if (d < 7) o.alert = 0.6;
        else {
          if (!W.ziel || hyp(W.ziel[0] - W.x, W.ziel[1] - W.y) < 0.5) {
            const a = Math.random() * Math.PI * 2,
              r = 1 + Math.random() * 3;
            W.ziel = [W.home[0] + Math.sin(a) * r, W.home[1] + Math.cos(a) * r];
          }
          tx = W.ziel[0];
          ty = W.ziel[1];
          v = 0.8;
          o.graze = 0.4;
        }
      }
    } else {
      const r = ((P.yaw || 0) * Math.PI) / 180,
        sx = p[0] - Math.sin(r) * 1.7 + Math.cos(r) * 0.6,
        sy = p[1] - Math.cos(r) * 1.7 - Math.sin(r) * 0.6,
        l = hyp(sx - W.x, sy - W.y);
      tx = sx;
      ty = sy;
      v = l < 0.4 ? 0 : Math.min(6, 0.6 + l * 1.6);
    }
    const dx = tx - W.x,
      dy = ty - W.y,
      l = hyp(dx, dy);
    if (l > 0.05 && v > 0) {
      const st = Math.min(l, v * dt);
      W.x += (dx / l) * st;
      W.y += (dy / l) * st;
      W.az = Math.atan2(dx, dy);
      W.v = v;
    } else W.v = 0;
    const pp = [W.x, W.y];
    try {
      KERN.pushOut(pp, 0.3);
    } catch (e) {}
    W.x = pp[0];
    W.y = pp[1];
    W.A.g.position.set(W.x, KERN.ground(W.x, W.y), -W.y);
    W.A.g.rotation.y = Math.PI - W.az;
    W.A.anim(dt, W.v, o);
  }
  function qAn(id) {
    const q = auf(id);
    if (!q || q.st !== 'läuft' || !heute()) return;
    qAus(id);
    const W = (QA[id] = {});
    try {
      QW[id].an(q, W);
    } catch (e) {
      S.err = 'quest ' + id + ': ' + String((e && e.message) || e).slice(0, 160);
    }
  }
  function qAus(id) {
    const W = QA[id];
    if (W && W.m) weg(W.m);
    if (W && W.A)
      try {
        W.A.dispose();
      } catch (e) {}
    delete QA[id];
  }
  function qAnbieten(id) {
    const A = AUF[id];
    if (!A || auf(id)) return false;
    S.sv.auf[id] = { st: 'läuft', i: 0 };
    S.sv.gesehen[id] = 1;
    save();
    sms(A.von, A.angebot);
    qAn(id);
    S.n.angebot++;
    emit(id, 'angeboten');
    return true;
  }
  function qWeiter(id) {
    const q = auf(id);
    if (!q) return;
    q.i++;
    save();
    qAn(id);
  }
  function qFertig(id) {
    const q = auf(id),
      A = AUF[id];
    if (!q || q.st !== 'läuft') return;
    q.st = 'erledigt';
    S.sv.erledigt[id] = (S.sv.erledigt[id] || 0) + 1;
    save();
    if (A.lohn) GL.earn(A.lohn, A.von);
    GLRUF.add(id === 'chronik' ? 'schleusingen' : 'ratscher', A.ruf, 'aufgabe:' + id);
    if (id === 'chronik') GLRUF.add('ratscher', 1, 'aufgabe:' + id);
    sms(A.von, A.danke, 6);
    if (A.chat) later(40, () => heute() && GLHANDY.chat(A.chat[0], A.chat[1]));
    GLTON.fx(A.lohn ? 'geld' : 'tick');
    GLHUD.ort(A.titel, 'Erledigt' + (A.lohn ? ' · +' + A.lohn + ' €' : ''), 4);
    emit(id, 'erledigt', { lohn: A.lohn, ruf: A.ruf });
    if (id !== 'tonne' && id !== 'paket') qAus(id);
  }
  // the actions of the side quests
  KERN.act({
    id: 'gl-auf-tonne',
    r: 2.2,
    prio: 0.5,
    hold: 1.4,
    label: () =>
      heute() && zuFuss() && auf('tonne') && auf('tonne').st === 'läuft' && QA.tonne && QA.tonne.p
        ? T.tonne.schieben
        : null,
    pos: () =>
      QA.tonne && QA.tonne.p ? [QA.tonne.p[0], QA.tonne.p[1], gnd(QA.tonne.p[0], QA.tonne.p[1]) + 1] : [0, 0, -999],
    run: () => {
      const q = auf('tonne');
      if (!q || q.st !== 'läuft') return;
      q.i = 1;
      save();
      qAn('tonne');
      qFertig('tonne');
    },
  });
  KERN.act({
    id: 'gl-auf-paket',
    r: 2.2,
    prio: 0.5,
    hold: 0.6,
    label: () => {
      const q = auf('paket');
      if (!heute() || !zuFuss() || !q || q.st !== 'läuft' || !QA.paket || !QA.paket.p) return null;
      return q.i === 0 ? T.paket.holen : T.paket.ablegen;
    },
    pos: () =>
      QA.paket && QA.paket.p ? [QA.paket.p[0], QA.paket.p[1], gnd(QA.paket.p[0], QA.paket.p[1]) + 0.8] : [0, 0, -999],
    run: () => {
      const q = auf('paket');
      if (!q || q.st !== 'läuft') return;
      if (q.i === 0) {
        qWeiter('paket');
        PLAY.think('Katrins Paket. Es klappert leise.', 2400);
      } else {
        const h = haus('katrin');
        if (h) {
          const p = neben(h, 1, 0.6, 0.9);
          QA.paket.m = bau('paket', p[0], p[1], Math.atan2(h.d[0], h.d[1]), paket, gnd(h.step[0], h.step[1]));
        }
        q.i = 2;
        qFertig('paket');
      }
    },
  });
  KERN.act({
    id: 'gl-auf-einkauf',
    r: 2.2,
    prio: 0.5,
    hold: 0.6,
    label: () => {
      const q = auf('einkauf'),
        h = haus('gerhard');
      return heute() && zuFuss() && q && q.st === 'läuft' && h && GL.has(AUF.einkauf.ware) ? T.einkauf.geben : null;
    },
    pos: () => {
      const h = haus('gerhard');
      return h ? [h.step[0], h.step[1], gnd(h.step[0], h.step[1]) + 1] : [0, 0, -999];
    },
    run: () => {
      if (!GL.use(AUF.einkauf.ware)) return;
      qFertig('einkauf');
    },
  });
  KERN.act({
    id: 'gl-auf-hund',
    r: 2.6,
    prio: 0.55,
    hold: 0.8,
    label: () => {
      const q = auf('hund'),
        W = QA.hund;
      if (!heute() || !zuFuss() || !q || q.st !== 'läuft' || !W) return null;
      if (q.i === 0) return zu([W.x, W.y]) < 2.6 ? T.hund.anleinen : null;
      const h = haus('heike');
      return h && zu(h.step) < 5 && hyp(W.x - h.step[0], W.y - h.step[1]) < 7 ? T.hund.abgeben : null;
    },
    pos: () => {
      const q = auf('hund'),
        W = QA.hund,
        h = haus('heike');
      if (!q || !W) return [0, 0, -999];
      const p = q.i === 0 ? [W.x, W.y] : h ? h.step : [W.x, W.y];
      return [p[0], p[1], gnd(p[0], p[1]) + 0.6];
    },
    run: () => {
      const q = auf('hund');
      if (!q || q.st !== 'läuft') return;
      if (q.i === 0) {
        q.i = 1;
        save();
        GLTON.fx('tick');
        PLAY.think('Krümel ist an der Leine. Er riecht nach Feld.', 2600);
      } else qFertig('hund');
    },
  });
  KERN.act({
    id: 'gl-auf-chronik',
    r: 2.4,
    prio: 0.5,
    hold: 0.8,
    label: () => {
      const q = auf('chronik');
      if (!heute() || !zuFuss() || !q || q.st !== 'läuft') return null;
      return q.i === 0 ? T.chronik.holen : T.chronik.abgeben;
    },
    pos: () => {
      const q = auf('chronik'),
        p = q && q.i > 0 ? rathaus() : haus('gerhard') && haus('gerhard').step;
      return p ? [p[0], p[1], gnd(p[0], p[1]) + 1] : [0, 0, -999];
    },
    run: () => {
      const q = auf('chronik');
      if (!q || q.st !== 'läuft') return;
      if (q.i === 0) {
        qWeiter('chronik');
        PLAY.think('Die Mappe mit den Fotos. Vorsichtig – das ist Geschichte.', 2600);
      } else if (!rathausOffen()) PLAY.think(T.chronik.geschlossen(rathausZeiten()), 3600);
      else qFertig('chronik');
    },
  });
  // ================================================================ offers ================================================================
  // a job's offer comes some hours before its first window (the evening before, the morning of); the side quests one after another
  const VORLAUF = { broetchen: 13 * 60, feuerwehr: 16 * 60, holz: 60 };
  const QREIHE = ['tonne', 'hund', 'paket', 'einkauf', 'chronik'];
  function anbieten() {
    if (!frei() || kino() || S.freiT < 20 || S.angebotT > 0) return;
    const t = CLOCK.t,
      e = eday();
    for (const id of ['feuerwehr', 'broetchen', 'holz']) {
      const J = D.JOBS[id];
      if (S.sv.gesehen[id] || (id === 'holz' && !auto())) continue;
      if (D.bis(J, t, e) <= VORLAUF[id]) {
        S.sv.gesehen[id] = 1;
        save();
        sms(J.von, J.angebot);
        S.angebotT = 45;
        S.n.angebot++;
        emit(id, 'angeboten');
        return;
      }
    }
    // a side quest when none of them runs and the last one is a while ago
    if (S.questT > 0 || QREIHE.some(id => auf(id) && auf(id).st === 'läuft')) return;
    for (const id of QREIHE) {
      if (auf(id)) continue;
      if (D.offenAm(AUF[id], wd(), minute()) && qAnbieten(id)) {
        S.angebotT = 45;
        S.questT = 300;
        return;
      }
      break;
    }
  }
  // what can be done: the jobs that were offered (with when and where), the side quests that run
  function angebote() {
    if (!GL.on) return [];
    const t = CLOCK.t,
      e = eday(),
      out = [];
    for (const [id, J] of Object.entries(D.JOBS)) {
      if (!S.sv.gesehen[id]) continue;
      const lauf = S.akt && S.akt.id === id;
      out.push({
        id,
        titel: J.titel,
        art: 'job',
        von: J.von,
        text: lauf ? JOB[id].text(S.akt) : J.kurz,
        wann: lauf ? 'läuft' : D.wann(J, t, e),
        ort: lauf && JOB[id].wo ? JOB[id].wo(S.akt) : J.ort,
        st: lauf ? 'läuft' : 'offen',
        jetzt: !lauf && D.bis(J, t, e) === 0,
        erledigt: S.sv.erledigt[id] || 0,
        ziel: lauf ? JOB[id].ziel(S.akt) : jobStart(id),
      });
    }
    for (const id of QREIHE) {
      const q = auf(id);
      if (!q) continue;
      const A = AUF[id];
      out.push({
        id,
        titel: A.titel,
        art: 'aufgabe',
        von: A.von,
        text: q.st === 'erledigt' ? 'Erledigt.' : QW[id].text(q),
        wann: q.st === 'erledigt' ? '' : id === 'chronik' && q.i > 0 ? 'Rathaus: ' + rathausZeiten() : '',
        ort: A.ort,
        st: q.st,
        jetzt: q.st === 'läuft',
        ziel: q.st === 'läuft' && QA[id] ? QW[id].ziel(q, QA[id]) : null,
      });
    }
    return out;
  }
  // where a job begins
  function jobStart(id) {
    if (id === 'broetchen') return kistenPlatz();
    if (id === 'holz') return stapelPlatz().p;
    if (id === 'feuerwehr') return fwPlatz().leute[0];
    return null;
  }
  // ---------------- the journal and the radar ----------------
  KERN.tasks.source({
    id: 'grenzland-jobs',
    order: 6,
    list() {
      if (!GL.on || GL.era !== 'heute') return [];
      return angebote()
        .filter(a => a.st !== 'erledigt' || a.art === 'aufgabe')
        .map(a => {
          const p = a.st !== 'erledigt' ? a.ziel : null;
          return {
            id: a.id,
            title: a.titel,
            who: a.von,
            status: a.st === 'läuft' ? 'läuft' : a.st === 'erledigt' ? 'erledigt' : 'offen',
            text:
              a.text +
              (a.st === 'offen' && a.wann
                ? ' (' + a.wann + ')'
                : a.wann && a.st === 'läuft' && a.art === 'aufgabe'
                  ? ' ' + a.wann
                  : ''),
            target: p ? () => p : undefined,
            ort: a.ort,
            z: p ? gnd(p[0], p[1]) : undefined,
          };
        });
    },
  });
  GLKARTE.src(out => {
    if (!GL.on || GL.era !== 'heute') return;
    const A = S.akt;
    if (A) {
      try {
        const z = JOB[A.id].ziel(A);
        if (z) out.push({ x: z[0], y: z[1], k: 'ziel', name: D.JOBS[A.id].titel });
        if (JOB[A.id].ziele)
          for (const p of JOB[A.id].ziele(A)) if (p && p !== z) out.push({ x: p[0], y: p[1], k: 'ziel2' });
      } catch (e) {}
    }
    for (const id of QREIHE) {
      const q = auf(id);
      if (q && q.st === 'läuft' && QA[id]) {
        const z = QW[id].ziel(q, QA[id]);
        if (z) out.push({ x: z[0], y: z[1], k: 'punkt', name: AUF[id].titel });
      }
    }
  });
  // ---------------- what happens ----------------
  KERN.on('grenzland:boeller', () => {
    if (!frei() || auf('hund') || QREIHE.some(id => auf(id) && auf(id).st === 'läuft')) return;
    if (!D.offenAm(AUF.hund, wd(), minute())) return;
    later(60, () => frei() && !auf('hund') && qAnbieten('hund'));
  });
  KERN.on('grenzland:mission', d => {
    if (d && d.st === 'läuft' && S.akt) abbrechen();
  });
  KERN.on('grenzland:era', d => {
    if (d && d.era === '1989') {
      abbrechen(true);
      for (const id of Object.keys(QA)) qAus(id);
    } else for (const id of QREIHE) qAn(id);
  });
  KERN.on('grenzland:start', d => {
    const v = d && d.fresh ? null : SAVE.get(KEY);
    S.sv = v || leer();
    if (!v) save();
    S.akt = null;
    S.freiT = 0;
    S.angebotT = 0;
    S.questT = 120;
    Q.length = 0;
    stapelP = fwP = kisteP = null;
    // the side quests that run come back into the world once the village is there
    later(3, () => {
      for (const id of QREIHE) qAn(id);
    });
  });
  // ---------------- per frame (GLRUF's tick, gl_modus.js) ----------------
  function tick(dt) {
    if (!GL.on) return;
    try {
      lauf(dt);
    } catch (e) {
      if (!S.err) console.warn('grenzland jobs', e);
      S.err = String((e && e.stack) || e).slice(0, 300);
    }
  }
  function lauf(dt) {
    for (let i = Q.length - 1; i >= 0; i--)
      if ((Q[i].t -= dt) <= 0) {
        const f = Q[i].fn;
        Q.splice(i, 1);
        f();
      }
    if (frei()) S.freiT += dt;
    if (S.angebotT > 0) S.angebotT -= dt;
    if (S.questT > 0 && frei()) S.questT -= dt;
    const A = S.akt;
    if (A) {
      if (!heute() || mission()) abbrechen();
      else if (JOB[A.id].tick) JOB[A.id].tick(A, dt);
    }
    if (S.raeumen) {
      const R = S.raeumen,
        W = R.A.W;
      if ((R.t -= dt) <= 0 || !W || zu(W.tisch) > 70) {
        S.raeumen = null;
        try {
          JOB[R.A.id].aus(R.A);
        } catch (e) {}
      }
    }
    const qh = auf('hund');
    if (qh && qh.st === 'läuft' && QA.hund) hundTick(qh, QA.hund, dt);
    if ((S.acc += dt) < 2) return;
    S.acc = 0;
    anbieten();
    // a job not begun in its window is let go (the way there was too long)
    if (
      S.akt &&
      !S.akt.debug &&
      S.akt.i === 0 &&
      D.bis(D.JOBS[S.akt.id], CLOCK.t, eday()) > 60 &&
      !D.offenAm(D.JOBS[S.akt.id], wd(), minute())
    )
      abbrechen();
    // the shopping for Gerhard: the target moves once the Milchreis is bought
    if (QA.einkauf && auf('einkauf') && auf('einkauf').st === 'läuft') QW.einkauf.an(auf('einkauf'), QA.einkauf);
  }
  function stop() {
    abbrechen(true);
    for (const id of Object.keys(QA)) qAus(id);
    wegAlle();
    for (const F of S.figs)
      try {
        GLFIG.drop(F);
      } catch (e) {}
    S.figs.length = 0;
    S.tueten.length = 0;
    S.stapelM = null;
    if (S.raeumen)
      try {
        JOB[S.raeumen.A.id].aus(S.raeumen.A);
      } catch (e) {}
    S.raeumen = null;
    Q.length = 0;
    CLOCK.unfocus('gl-jobs');
    untrack();
  }
  GLRUF.dazu({ tick, stop });
  // every spoken line (the recordings)
  const linien = () => D.linien();
  Object.assign(S, {
    KEY,
    JOB,
    angebote,
    warten,
    start,
    abbrechen,
    aktiv,
    tick,
    stop,
    linien,
    rathaus,
    rathausOffen,
    QA,
    debug: {
      // offer a job or a side quest now
      angebot(id) {
        if (D.JOBS[id]) {
          S.sv.gesehen[id] = 1;
          save();
          sms(D.JOBS[id].von, D.JOBS[id].angebot);
          return true;
        }
        return qAnbieten(id);
      },
      // begin a job now, whatever the clock says, at step i
      go(id, i = 0) {
        if (!D.JOBS[id] || !frei()) return false;
        abbrechen(true);
        const A = { id, i: 0, sek: 0, t0: CLOCK.t, debug: true };
        S.akt = A;
        S.sv.gesehen[id] = 1;
        JOB[id].an(A);
        if (id === 'broetchen' && i >= 1) JOB.broetchen.nehmen(A);
        else A.i = i;
        if (id === 'feuerwehr' && i >= 3) A.weg = [A.W.pumpe.slice()];
        track(id);
        return true;
      },
      info: () => ({
        akt: S.akt
          ? {
              id: S.akt.id,
              i: S.akt.i,
              sek: Math.round(S.akt.sek || 0),
              done: S.akt.done ? Object.keys(S.akt.done) : undefined,
              platt: S.akt.platt,
              fuhre: S.akt.fuhre,
              geladen: S.akt.geladen,
              zeit: S.akt.zeit,
            }
          : null,
        sv: JSON.parse(JSON.stringify(S.sv)),
        welt: S.welt.length,
        figs: S.figs.length,
        n: Object.assign({}, S.n),
        err: S.err,
      }),
      // the jet for a picture (it lasts two seconds in the game)
      strahl: on => S.akt && S.akt.id === 'feuerwehr' && (strahl(S.akt, on), true),
      haus,
      strasse,
      stapelPlatz,
      fwPlatz,
      kistenPlatz,
    },
  });
  return S;
})();
window.GLJOBS = GLJOBS;
