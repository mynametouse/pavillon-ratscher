// ===================== feat/grenzland-kapitel2: chapter 2 „Kolonnenweg“ – its opening and missions for the runner (GLKAP2) =====================
// Plan: docs/plans/plan_kapitel2.md (stage 2). Texts and talks: grenzland/gl_kapitel2_data.js (GLK2DATA). The runner: grenzland/gl_mission.js.
//   the opening   after chapter 1, in free play: the panel's „Kapitel 2 beginnen“, coming to the field barn, or a few minutes of play.
//                 Black: „Drei Monate später“ – the story's calendar jumps to Friday, 4 December 2026, 16:40, snow (WETTER.preset, this
//                 visit only); at the barn the clique and Gerhard: the crate was evidence with Westgeld from a car of the Stasi's district
//                 office, its driver was the young Krähwinkel; the stranger has asked for Lutz (he hunts the crate himself); the chapter's
//                 card. The traitor's first trace: a lorry of the haulier on the field track, a message „Schöne Grüße in die Feldscheune“
//                 – who it is stays open until mission 4. The night in the garden.
//   mission 1     „Grünes Band“ (k2m1, the opening is its first three steps; its own title card at „aufbruch“): by Simson to the Grünes
//                 Band at Eisfeld (the panel's „Hinfahren“: half an hour later at the car park by the border tower), Sarah on the crossing
//                 point of 1973 and the Grünes Band of 9 December 1989, along the Kolonnenweg into the Görsdorfer Heide, the bunker under an
//                 old foundation – Krähwinkel's men are there already (they see with their eyes: ducking helps, a moped is heard): two photos
//                 from cover; the stranger at the edge of the heath; the retreat – the men's van drives the Kolonnenweg, keep away from it;
//                 no signal in the zone, his message comes when there is one again: „Ich will die Akte, nicht das Geld.“ Home.
//   mission 2     „Ein Auto für die Nacht“ (k2m2): see below (Paket D: grenzland/gl_knacken.js).
// The zone is agent zone's GLZONE (da, ort(name), weg, anfahrt); until it is there a stand-in with the same interface on a gravel track
// west of Ratscher (GLK2DATA.ERSATZ; the bunker then drawn here as an old foundation with an iron hatch).
//   GLKAP2.tick(dt) · stop() · linien() · zone() · ort(name) · weg() · ersatz() · debug: { beginn(), frei(s), info(), zone(obj | null) }
// Events: 'grenzland:kapitel' { kap: 2, st: 'beginnt' } when it opens.
import { KERN } from '../core/kern.js';
import { markDirty } from '../core/assets.js';
import * as THREE from 'three';
import { P } from '../game/walkable.js';
import { VEH } from '../vehicles/vehicle.js';
import { VPROPS } from '../world/village_props.js';
import { VFIG } from '../verkehr/verkehr_fig.js';
import { CLOCK } from '../time/clock.js';
import { DN } from '../time/daynight.js';
import { GLDATA } from './gl_data.js';
import { GL } from './gl_state.js';
import { GLLOGIK } from './gl_logik.js';
import { GLTON } from './gl_ton.js';
import { GLFIG } from './gl_fig.js';
import { GLAUTO } from './gl_auto.js';
import { GLHUD } from './gl_hud.js';
import { GLHANDY } from './gl_handy.js';
import { GLFAHNDUNG } from './gl_fahndung.js';
import { GLORTE } from './gl_orte.js';
import { GLMDATA, GLMLOGIK } from './gl_mission_data.js';
import { GLKAMERA } from './gl_kamera.js';
import { GLSCORE } from './gl_score.js';
import { GLMISSION as MI } from './gl_mission.js';
import { GLK2DATA, GLK2LOGIK, GLKNLOGIK } from './gl_kapitel2_data.js';
import { GLKNACKEN } from './gl_knacken.js';
export const GLKAP2 = (() => {
  const D = GLK2DATA,
    L = GLK2LOGIK,
    T = D.T,
    TX = D.S,
    K = D.KAP,
    O = GLDATA.ORTE,
    hyp = Math.hypot,
    St = MI.St;
  // the preview of 18.11.2026 (GLK2DATA.KAP.vorab): mission 1 not in yet; the browser test of mission 1 switches it on before the page
  // loads (window.GLK2_M1) – then the chapter is as it will be: mission 1 first
  const VORAB = !!K.vorab && !(typeof window !== 'undefined' && window.GLK2_M1);
  const S = {
    frei: 0, // seconds of calm free play after chapter 1
    angebot: false,
    knopf: false,
    xl: false, // the panel's extra button is ours (free play)
    weg: false, // the player was away from the barn (coming back to it opens the chapter)
    wetter: '', // the preset we set ('' none) and the one before it
    wetterVor: null,
    pause: false,
    direkt: false, // the mode began with ?kapitel=2: chapter 2 opens on the next frame
    zoneTest: undefined, // tests: a zone object instead of window.GLZONE (null: the stand-in)
  };
  // shouts in the action and whispers: never a cutscene
  for (const k of [
    'k2bunkerDa',
    'k2fremderDa',
    'k2entdeckt',
    'k2verloren',
    'k2abzug',
    'k2alarm',
    'k2besitzer',
    'k2drin',
  ])
    GLKAMERA.BARK.add(k);
  const sleep = ms => new Promise(res => setTimeout(res, window.FREEZE ? 0 : ms));
  // black with words, and light again – a sequence whose step has gone meanwhile lights up only its own dark
  let fadeN = 0;
  async function dunkel(a, b) {
    const n = ++fadeN;
    await GLHUD.fade(true, a, b);
    return n;
  }
  const hell = n => (n === fadeN ? GLHUD.fade(false) : null);
  function sag(S, key) {
    if (!S.r) {
      S.r = 1;
      MI.rede(key, { done: () => (S.r = 2) });
    }
    return S.r === 2;
  }
  const sms = key => {
    const [von, text] = D.SMS[key];
    if (GL.sms.some(q => q.text === text)) return false;
    GLHANDY.sms(von, text);
    return true;
  };
  const chat = key => {
    for (const [w, t] of D.CHAT[key] || []) GLHANDY.chat(w, t);
  };
  const yawTo = (a, b) => (Math.atan2(b[0] - a[0], b[1] - a[1]) * 180) / Math.PI;
  const dark = () => {
    try {
      return !!(window.VAUTO && window.VAUTO.dark && window.VAUTO.dark());
    } catch (e) {
      return false;
    }
  };
  const sneak = () => (GLFAHNDUNG.sneak ? !!GLFAHNDUNG.sneak() : !VEH.cur && P.stance !== 'stand');
  const stars = () => GLLOGIK.stars(GL.W);
  // ---------------- the zone: agent zone's GLZONE, or the stand-in with the same interface ----------------
  const ZONE0 = {
    ersatz: true,
    da: () => true,
    ort(name) {
      const p = D.ERSATZ.orte[name];
      if (!p) return null;
      const z = KERN.ground(p[0], p[1]);
      return { x: p[0], y: p[1], z: Number.isFinite(z) ? z : 0, name };
    },
    weg: () => D.ERSATZ.weg,
    anfahrt: () => D.ERSATZ.anfahrt,
  };
  function zone() {
    if (S.zoneTest !== undefined) return S.zoneTest || ZONE0;
    const Z = window.GLZONE;
    return Z && typeof Z.ort === 'function' && Z.ort('bunker') ? Z : ZONE0;
  }
  const ersatz = () => zone() === ZONE0;
  // a place of the zone [x, y]; what a zone does not name is taken from its neighbours (heide → bunker, parkplatz → start of the way)
  const ERSATZNAME = { heide: 'bunker', museum: 'parkplatz', parkplatz: 'kolonnenweg_a', kolonnenweg_b: 'bunker' };
  function ort(name) {
    const Z = zone();
    for (let n = name, k = 0; n && k < 4; n = ERSATZNAME[n], k++) {
      let p = null;
      try {
        p = Z.ort(n);
      } catch (e) {}
      if (p && Number.isFinite(p.x) && Number.isFinite(p.y)) return [p.x, p.y];
    }
    const q = ZONE0.ort(name);
    return q ? [q.x, q.y] : [0, 0];
  }
  // the Kolonnenweg as points [[x, y], …] – from kolonnenweg_a (the car park's side) to kolonnenweg_b
  let WEG = null;
  function weg() {
    const Z = zone();
    if (WEG && WEG.z === Z) return WEG.p;
    let p = null;
    try {
      p = L.punkte(Z.weg && Z.weg());
    } catch (e) {}
    if (!p) p = [ort('kolonnenweg_a'), ort('kolonnenweg_b')];
    // (it runs from the car park's end)
    const a = ort('parkplatz');
    if (hyp(p[0][0] - a[0], p[0][1] - a[1]) > hyp(p[p.length - 1][0] - a[0], p[p.length - 1][1] - a[1]))
      p = p.slice().reverse();
    WEG = { z: Z, p };
    return p;
  }
  const zoneDa = () => {
    try {
      const Z = zone();
      return !Z.da || !!Z.da();
    } catch (e) {
      return true;
    }
  };
  // ask agent zone to load its tiles while a step needs them (GLZONE.need(id, on) of feat/grenzland-zone)
  function zoneLaden(on) {
    try {
      const Z = window.GLZONE;
      if (!Z) return;
      if (typeof Z.need === 'function') Z.need('gl-k2', !!on);
      else if (typeof Z.lade === 'function') Z.lade(!!on);
    } catch (e) {}
  }
  // agent zone's own helpers while its zone is the one in use (feat/grenzland-zone after V19g: ort('foto' | 'fremder'), netz(x, y) …) –
  // undefined without them
  function zhelp(fn, ...a) {
    const Z = zone();
    if (Z === ZONE0 || !Z || typeof Z[fn] !== 'function') return undefined;
    try {
      return Z[fn](...a);
    } catch (e) {
      return undefined;
    }
  }
  const zort = name => {
    const p = zhelp('ort', name);
    return p && Number.isFinite(p.x) && Number.isFinite(p.y) ? [p.x, p.y] : null;
  };
  // the Simson's way there by the Landstraße (L 3004 through Eisfeld) on the radar, while one rides there
  function zoneRoute(on) {
    try {
      const Z = window.GLZONE;
      if (Z && typeof Z.route === 'function' && S.zoneTest === undefined) Z.route(!!on, 'land');
    } catch (e) {}
  }
  // a signal for the phone (agent zone: -1 in the heath, 4 at the car park); without the zone's netz: always
  const netzDa = () => {
    const n = zhelp('netz', P.x, P.y);
    return n === undefined || n === null || n > 0;
  };
  // agent zone's real zone, when there is one (not in tests that give their own zone object): it brings its own ground and the cut there
  const echteZone = () => {
    const Z = window.GLZONE;
    return S.zoneTest === undefined && Z && typeof Z.hin === 'function' ? Z : null;
  };
  // ---------------- the bunker and its watchers ----------------
  // where things stand: the bunker, the nearest point of the Kolonnenweg (the van stands there), where one approaches from
  function bunkerPlan() {
    const b = ort('bunker'),
      W = weg(),
      n = L.abstand(W, b[0], b[1]),
      on = L.entlang(W, n.s),
      // the side of the heath (away from the way)
      ox = b[0] - on.x,
      oy = b[1] - on.y,
      od = Math.max(1, hyp(ox, oy)),
      ux = ox / od,
      uy = oy / od,
      a = L.entlang(W, Math.max(0, n.s - 110)),
      // across the way from the approach: a few metres into the heath – at most 75 m from the bunker (agent zone's lies ~95 m off the way)
      v0 = [a.x + ux * 9, a.y + uy * 9],
      vd = hyp(v0[0] - b[0], v0[1] - b[1]),
      vk = vd > 75 ? 75 / vd : 1,
      vorn = [b[0] + (v0[0] - b[0]) * vk, b[1] + (v0[1] - b[1]) * vk];
    try {
      KERN.pushOut(vorn, 0.5);
    } catch (e) {}
    const wp = zhelp('punkte', 'wachen'),
      wachen =
        Array.isArray(wp) && wp.length >= 3 && wp.slice(0, 3).every(q => Number.isFinite(q[0]) && Number.isFinite(q[1]))
          ? ['w1', 'w2', 'w3'].map((k, i) => [
              k,
              'wache' + (i + 1),
              [wp[i][0], wp[i][1]],
              ['pick', 'saw', null][i],
              Number.isFinite(wp[i][2]) ? (wp[i][2] * Math.PI) / 180 : null,
            ])
          : null;
    return {
      b,
      s: n.s,
      // how far the bunker lies off the way
      ab: n.d,
      van: [on.x, on.y],
      // (facing back along the way, the way out)
      vanHd: on.hd + Math.PI,
      vorn,
      vornHd: yawTo(vorn, b),
      // [key, cast, [x, y], pose, heading or null: towards the bunker] – agent zone's spots round its bunker when it has them
      men: wachen || [
        ['w1', 'wache1', [b[0] - ux * 1.3 + uy * 0.6, b[1] - uy * 1.3 - ux * 0.6], 'pick', null],
        ['w2', 'wache2', [b[0] - ux * 1.1 - uy * 1.2, b[1] - uy * 1.1 + ux * 1.2], 'saw', null],
        ['w3', 'wache3', [on.x + ux * 3.2 + uy * 2.5, on.y + uy * 3.2 - ux * 2.5], null, null],
      ],
      // the stranger: at the edge of the heath, beyond the bunker (the zone's own place for him, when it has one)
      fremder: zort('fremder') || [b[0] + ux * 58 - uy * 16, b[1] + uy * 58 + ux * 16],
    };
  }
  let BP = null;
  const bp = () => {
    // (agent zone's spots round its bunker follow the bunker it builds: again once the zone is built)
    const zs = zhelp('state'),
      k = ort('bunker').join() + '|' + weg().length + '|' + !!(zs && zs.an);
    if (!BP || BP.k !== k) BP = Object.assign(bunkerPlan(), { k });
    return BP;
  };
  // the stand-in's bunker (agent zone draws the real one): a cracked concrete foundation half in the ground, a raised frame with an iron
  // hatch and a padlock, snow on the flat parts – vertex colours in the traffic's material
  const lin = c => (c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4));
  const LC = (r, g, b) => [lin(r / 255), lin(g / 255), lin(b / 255)];
  function ding(fn, x, y, hd = 0) {
    const k = VPROPS.kit();
    fn(k);
    const m = new THREE.Mesh(k.geo(), VFIG.mat());
    m.userData.noMerge = true;
    m.castShadow = m.receiveShadow = false;
    const g = KERN.ground(x, y);
    m.position.set(x, Number.isFinite(g) ? g : 0, -y);
    m.rotation.y = -hd;
    m.name = 'grenzland ding';
    return m;
  }
  const bunkerForm = k => {
    const beton = LC(128, 126, 118),
      dunkel = LC(92, 90, 84),
      moos = LC(74, 86, 58),
      schnee = LC(236, 238, 242),
      eisen = LC(62, 48, 40),
      rost = LC(112, 64, 38);
    // the old foundation: two slabs, one broken off and tilted, edges just over the ground (the shaft's hatch at the origin)
    k.box(-1.6, -0.6, -0.25, 7.2, 4.6, 0.42, 0, beton, true);
    k.box(-4.2, 0.8, -0.2, 1.6, 1.4, 0.3, 0.12, dunkel, true);
    k.box(1.3, -2.2, -0.3, 1.2, 1.0, 0.36, -0.2, moos, true);
    k.box(-1.2, -0.8, 0.17, 6.6, 4.0, 0.03, 0, schnee, false);
    // the frame of the shaft and the iron hatch (shut, a padlock at its edge)
    k.box(0, 0, 0.12, 1.5, 1.5, 0.42, 0, beton, false);
    k.box(0, 0, 0.54, 1.12, 1.12, 0.05, 0, eisen, false);
    k.box(0, 0, 0.59, 1.0, 0.08, 0.03, 0, rost, false);
    k.box(0, 0, 0.59, 0.08, 1.0, 0.03, 0, rost, false);
    k.box(0.52, 0, 0.48, 0.06, 0.16, 0.12, 0, LC(150, 140, 110), false);
    // the snow on the frame, a few bricks of a wall that was
    k.box(0, -0.55, 0.54, 1.5, 0.3, 0.03, 0, schnee, false);
    for (let i = 0; i < 5; i++)
      k.box(-4.9 + i * 0.26, -2.6, 0.17, 0.24, 0.12, 0.08 + (i % 2) * 0.07, 0, LC(140, 74, 58), false);
  };
  // the men's attention (as at the Klinge in chapter 1): they see with their eyes – the dark and ducking help, a moped is heard
  const K1 = { W: [], job: 'arbeit', n: 0, ft: 0, fremder: false, fremderGesehen: false };
  // where a man of the plan looks: his own heading, or towards the bunker
  const blick = (B, m) => (m[4] != null ? m[4] : Math.atan2(B.b[0] - m[2][0], B.b[1] - m[2][1]));
  function maennerHeim(B) {
    K1.job = 'arbeit';
    for (const m of B.men) {
      const [key, , p, pk] = m,
        f = MI.F(key);
      if (f && !f.gone)
        GLFIG.go(f, p, 1.4, q => {
          q.hd = blick(B, m);
          GLFIG.pose(q, pk);
        });
    }
  }
  function maenner(dt, S) {
    const B = bp(),
      w = MI.wo(),
      dk = dark(),
      snk = sneak();
    let alarm = false,
      near = 1e9;
    B.men.forEach(([key, , , pk], i) => {
      const f = MI.F(key);
      if (!f) return;
      // the guard by the van looks round now and then
      if (!pk && K1.job === 'arbeit' && f.st !== 'geht') {
        f.lookT = (f.lookT || 0) - dt;
        if (f.lookT <= 0) {
          f.lookT = 3.5 + ((i * 7) % 3);
          f.hd += f.lookL ? -1.1 : 1.1;
          f.lookL = !f.lookL;
        }
      }
      const W = K1.W[i] || (K1.W[i] = GLMLOGIK.wache()),
        d = hyp(f.x - w.x, f.y - w.y),
        sees = w.veh
          ? d < 45
          : GLLOGIK.sieht({ x: f.x, y: f.y, hd: f.hd, r: L.BUNKER.r }, w.x, w.y, { dark: dk, sneak: snk }) &&
            GLFAHNDUNG.los(f.x, f.y, w.x, w.y);
      near = Math.min(near, d);
      if (GLMLOGIK.wachsam(W, dt, { sees, d }) === 'alarm' && K1.job !== 'jagt') {
        K1.job = 'jagt';
        S.aim = 9;
        for (const [k2] of B.men) {
          const q = MI.F(k2);
          if (q) GLFIG.pose(q, null);
        }
        MI.rede('k2entdeckt');
        GLHUD.say(T.gesehen, T.gesehenSub, 3.5);
      }
      if (W.st === 'alarm') alarm = true;
    });
    if (K1.job !== 'jagt') return;
    if (!alarm) {
      MI.rede('k2verloren');
      maennerHeim(B);
      return;
    }
    if ((S.aim = (S.aim || 0) + dt) > 0.5) {
      S.aim = 0;
      for (const [key] of B.men) {
        const f = MI.F(key);
        if (f) GLFIG.go(f, [w.x, w.y], 2.3);
      }
    }
    if (near < L.BUNKER.fang && !w.veh && !S.aus) {
      S.aus = true;
      MI.fehl(T.geschnappt, T.geschnapptSub);
    }
  }
  // the photos: from cover, the bunker within 40 m in sight (E, or the phone's camera)
  function fotoAn() {
    const B = bp();
    try {
      GLHANDY.kamera({
        ziel: B.b,
        r: 40,
        n: Math.max(1, 2 - K1.n),
        sicht: () => GLFAHNDUNG.los(P.x, P.y, B.b[0], B.b[1]),
        done: () => (K1.n = 2),
      });
    } catch (e) {}
    KERN.act({
      id: 'gl:k2foto',
      label: () => (GL.on && K1.n < 2 && !VEH.cur && MI.fern(bp().b) < 60 ? T.foto + ' (' + K1.n + '/2)' : null),
      pos: () => [P.x, P.y, P.feet],
      r: 2,
      prio: 2,
      gest3: '',
      run() {
        const b = bp().b;
        if (K1.ft > 0) return;
        if (MI.fern(b) > 40) return void MI.denk(T.fotoFern, 1800);
        if (!GLFAHNDUNG.los(P.x, P.y, b[0], b[1])) return void MI.denk(T.fotoSicht, 1800);
        K1.n++;
        K1.ft = 1.1;
        GLTON.fx('foto');
        GL.emit('foto', { n: K1.n, von: 'mission' });
        if (K1.n < 2) MI.denk(T.fotoN(K1.n), 1500);
      },
    });
  }
  function fotoAus() {
    KERN.unact('gl:k2foto');
    try {
      GLHANDY.kamera(null);
    } catch (e) {}
  }
  // the men walk to their van and get in (a figure still loading – after a fresh start of the step – is sent when it is there)
  function einsteigen(S, B) {
    if (!S.drin) S.drin = new Set();
    for (const [key] of B.men) {
      const f = MI.F(key);
      if (f && !f.k2ein && !S.drin.has(key)) {
        f.k2ein = true;
        GLFIG.pose(f, null);
        GLFIG.go(f, [B.van[0], B.van[1]], 1.6, () => {
          S.drin.add(key);
          MI.figWeg(key);
        });
      }
    }
  }
  // ---------------- the van on the Kolonnenweg: along the way's points, on the ground, wheels turning ----------------
  const V1 = { s: 0, v: 0, fahrt: false };
  function vanTick(dt) {
    const c = MI.C('k2van');
    if (!c || !V1.fahrt) return;
    const W = weg();
    V1.v = Math.min(L.WAGEN.v, V1.v + 1.8 * dt);
    V1.s = Math.max(0, V1.s - V1.v * dt);
    const a = L.entlang(W, V1.s);
    GLAUTO.park(c, a.x, a.y, a.hd + Math.PI);
    c.v = V1.v;
    c.spin = (c.spin || 0) + (V1.v * dt) / (c.T.rw || 0.3);
    if (c.parts.axF) {
      c.parts.axF.rotation.x = -c.spin;
      c.parts.axR.rotation.x = -c.spin;
    }
    if (V1.s <= 0.5) {
      V1.fahrt = false;
      MI.autoWeg('k2van');
    }
  }
  // the van's driver sees one ahead in its lights (the snow shortens it)
  function vanSieht() {
    const c = MI.C('k2van');
    if (!c || !V1.fahrt) return false;
    const w = MI.wo();
    return (
      GLLOGIK.sieht({ x: c.x, y: c.y, hd: c.hd, r: L.WAGEN.r }, w.x, w.y, { sneak: sneak() }) &&
      GLFAHNDUNG.los(c.x, c.y, w.x, w.y)
    );
  }
  // ---------------- the journeys nobody has to ride: a fade, half an hour later there ----------------
  async function fahrt(was) {
    const g = St.gen;
    if (St.busy) return;
    if (MI.redet()) return void MI.denk('Gleich – erst ausreden lassen.', 2000);
    St.busy = true;
    let n = 0;
    try {
      const hin = was === 'hin';
      n = await dunkel(hin ? T.hinA : T.heimA, hin ? T.hinB : T.heimB);
      if (St.gen === g && GL.on) {
        CLOCK.t += 30;
        try {
          if (DN && DN.active) DN.update(true);
        } catch (e) {}
        if (hin) {
          zoneLaden(true);
          // the real zone: its own cut (it loads and builds the ground first, then puts one on the Simson at the car park)
          const Z = echteZone();
          let da = false;
          if (Z)
            try {
              da = !!(await Z.hin({ ort: 'parkplatz', mit: 'moped', fade: false }));
            } catch (e) {}
          if (!da && St.gen === g) {
            const p = ort('parkplatz'),
              W = weg(),
              hd = Math.atan2(W[0][0] - p[0], W[0][1] - p[1]);
            if (VEH.cur) VEH.exit();
            GLAUTO.mopedAt(p[0], p[1], hd);
            MI.hin(p[0] - Math.cos(hd) * 1.2, p[1] + Math.sin(hd) * 1.2, (hd * 180) / Math.PI);
            try {
              await KERN.until(() => zoneDa() || St.gen !== g, 60);
            } catch (e) {}
            // (the ground may have come with the zone: stand on it again)
            if (St.gen === g) {
              GLAUTO.mopedAt(p[0], p[1], hd);
              MI.hin(p[0] - Math.cos(hd) * 1.2, p[1] + Math.sin(hd) * 1.2, (hd * 180) / Math.PI);
            }
          }
        } else {
          const m = O.moped;
          if (VEH.cur) VEH.exit();
          GLAUTO.mopedAt(m.pos[0], m.pos[1], ((m.az || 0) * Math.PI) / 180);
          MI.hin(O.garten.pos[0], O.garten.pos[1] - 4, 0);
        }
        GL.emit('k2fahrt', { was });
      }
      await sleep(700);
      await hell(n);
    } finally {
      St.busy = false;
    }
  }
  // ---------------- December: the story's calendar and the weather ----------------
  // the calendar jumps to Friday, 4 December 2026 (plus: days after it), at h:m of the next game day (once: a reload keeps GL.e0neu)
  function dezember(h, m, plus = 0) {
    const d0 = Math.floor(CLOCK.t / 1440) + 1;
    CLOCK.t = d0 * 1440 + h * 60 + m;
    try {
      DN.e0 = L.e0(d0) + plus;
      GL.e0neu = DN.e0;
      if (DN.active) DN.update(true);
    } catch (e) {}
    GL.save(true);
    markDirty(true);
  }
  const imDezember = () => {
    try {
      return DN.e0 + Math.floor(CLOCK.t / 1440) >= L.DEZ;
    } catch (e) {
      return false;
    }
  };
  // snow while the chapter runs (WETTER.preset: this visit only) – the player's own choice comes back after it
  function wetter(on) {
    const W = window.WETTER;
    if (!W || typeof W.preset !== 'function') return;
    let cur = null;
    try {
      cur = W.state ? W.state().preset : null;
    } catch (e) {}
    if (on && !S.wetter) {
      S.wetterVor = cur || null;
      S.wetter = L.WETTER;
      try {
        W.preset(L.WETTER);
      } catch (e) {}
    } else if (!on && S.wetter) {
      if (cur === S.wetter)
        try {
          W.preset(S.wetterVor);
        } catch (e) {}
      S.wetter = '';
      S.wetterVor = null;
    }
  }
  // ---------------- the night: black, the next morning, light (S.n: 0 not yet, 1 running, 2 done) ----------------
  function schlaf(S, a, b, h, m) {
    if (!S.n) {
      S.n = 1;
      const g = St.gen;
      try {
        if (GLHUD.subAus) GLHUD.subAus();
      } catch (e) {}
      (async () => {
        const n = await dunkel(a, b);
        if (St.gen !== g) return void hell(n);
        MI.uhr(h, m);
        GL.tage++;
        GL.save();
        await sleep(1200);
        await hell(n);
        if (St.gen === g) S.n = 2;
      })();
    }
    return S.n === 2;
  }
  // ---------------- the field barn: where the clique stands, the field track beside it ----------------
  const scheune = () => (GLORTE.P && GLORTE.P.scheune) || O.treff.pos;
  const hof = () => (GLORTE.P && GLORTE.P.treff) || O.treff.pos;
  // the barn's yard frame: u from the barn to the yard, r to its right
  function amHof() {
    const s = scheune(),
      t = hof(),
      d = Math.max(1, hyp(t[0] - s[0], t[1] - s[1])),
      ux = (t[0] - s[0]) / d,
      uy = (t[1] - s[1]) / d,
      at = (u, r) => [t[0] + ux * u + uy * r, t[1] + uy * u - ux * r],
      ich = at(2.4, 0.2),
      hd = p => Math.atan2(ich[0] - p[0], ich[1] - p[1]);
    const P0 = {
      jule: at(-0.9, -0.9),
      timo: at(-0.4, 1.5),
      basti: at(-1.6, 2.5),
      gerhard: at(-0.7, -2.4),
    };
    return { ich, ichYaw: yawTo(ich, at(-0.8, 0)), P: P0, hd, ux, uy, at };
  }
  // which way a road runs at a place (the compass heading along it), and a road point within r of p
  function richtung(x, y) {
    let best = 0,
      bn = -1;
    for (let k = 0; k < 16; k++) {
      const a = (k / 16) * Math.PI;
      let n = 0;
      for (const r of [-12, -6, 6, 12]) {
        let q = null;
        try {
          q = KERN.surface(x + Math.sin(a) * r, y + Math.cos(a) * r);
        } catch (e) {}
        if (q && q.e > -0.6) n++;
      }
      if (n > bn) {
        bn = n;
        best = a;
      }
    }
    return best;
  }
  function strasseBei(p, r0, r1) {
    for (let r = r0; r <= r1; r += 3)
      for (let a = 0; a < 360; a += 12) {
        const q = [p[0] + Math.sin((a * Math.PI) / 180) * r, p[1] + Math.cos((a * Math.PI) / 180) * r];
        let s = null;
        try {
          s = KERN.surface(q[0], q[1]);
        } catch (e) {}
        if (s && s.kind <= 6 && s.e > 0.8) return { p: q, hd: richtung(q[0], q[1]) };
      }
    return null;
  }
  let LKW = null;
  function lkwPlatz() {
    const s = scheune();
    if (LKW && LKW.k === s.join()) return LKW;
    const q = strasseBei(s, 30, 60) || { p: [s[0] + 40, s[1]], hd: 0 };
    return (LKW = { k: s.join(), p: q.p, hd: q.hd });
  }
  // ================================================================ the chapter's opening (the first steps of the chapter's first mission) ================================================================
  // the barn at dusk in December, the clique and Gerhard, the traitor's trace, the night – in the preview (VORAB) before mission 2,
  // later before mission 1. Both missions begin with these three steps (their step lists stay the same from the preview on – a save keeps
  // its step); the opening is played once: a mission whose partner of the chapter is done goes past them
  // (how often the chapter's card was shown – tests)
  let karteN = 0;
  const auftaktWeg = () => {
    const o = GL.cur === 'k2m1' ? 'k2m2' : 'k2m1';
    return !!(MI.R && MI.R.by(o) && MI.R.st(o) === 'erledigt');
  };
  const AUFTAKT = [
    {
      id: 'scheune',
      text: TX.k2m1.scheune,
      ort: 'Feldscheune',
      ziel: () => hof(),
      // black: three months later, December, the barn at dusk in the snow; the chapter's card
      an(S, why) {
        if ((S.weg = auftaktWeg())) return void wetter(true);
        const g = St.gen;
        (async () => {
          const n = await dunkel(K.blendeA, K.blendeB);
          if (St.gen !== g) return void hell(n);
          if (!imDezember() || why === 'start' || why === 'debug') dezember(16, 40);
          wetter(true);
          const H = amHof();
          MI.hin(H.ich[0], H.ich[1], H.ichYaw);
          const m = H.at(3.5, 6.5);
          GLAUTO.mopedAt(m[0], m[1], Math.atan2(H.ux, H.uy));
          await sleep(1200);
          await hell(n);
          if (St.gen !== g) return;
          S.da = true;
          try {
            GLHUD.titel(K.titel, VORAB ? K.ueberVorab : K.ueber, 5.5, K.unter);
            karteN++;
          } catch (e) {}
          GLSCORE.stich('start');
          GL.emit('kapitel', { kap: 2, st: 'beginnt' });
        })();
      },
      tick(dt, S) {
        if (S.weg) return true;
        if (!S.da) return false;
        // (the talk waits a moment for the figures – it should be a scene with them)
        if (!S.r && !MI.F('jule') && S.t < 9) return false;
        return sag(S, 'k2auftakt');
      },
    },
    {
      id: 'spur',
      text: TX.k2m1.spur,
      ort: 'Feldweg',
      ziel: () => lkwPlatz().p,
      an(S) {
        if ((S.weg = auftaktWeg())) return;
        S.smsT = 2.5;
        S.auf0 = GLHANDY.isOpen();
      },
      ev: {
        'grenzland:handy': (d, S) => {
          S.auf = true;
        },
      },
      tick(dt, S) {
        if (S.weg) return true;
        if (S.smsT > 0 && (S.smsT -= dt) <= 0) {
          sms('unbekannt');
          chat('lkw');
        }
        if (GLHANDY.isOpen()) S.auf = true;
        // the lorry leaves once they talk about it – over the field track out of the square
        if (S.r && !S.fort) {
          S.fort = true;
          try {
            const c = MI.C('k2lkw'),
              l = lkwPlatz(),
              Z = GLAUTO.zufahrten().sort(
                (a, b) => hyp(a[0] - l.p[0], a[1] - l.p[1]) - hyp(b[0] - l.p[0], b[1] - l.p[1])
              ),
              line = Z[0] && GLAUTO.route(l.p, Z[0], { k: 1.2 });
            if (c && line) {
              GLAUTO.onLine(c, line, 0, 0);
              S.fahrt = true;
            }
          } catch (e) {}
        }
        const c = MI.C('k2lkw');
        if (c && S.fahrt) {
          GLAUTO.drive(c, dt, { k: 1, acc: 1.6 });
          if (c.ende || MI.fern([c.x, c.y]) > 320) MI.autoWeg('k2lkw');
        }
        const gelesen = S.smsT <= 0 && ((S.auf && !GLHANDY.isOpen()) || S.t > 30);
        return (S.r || gelesen) && sag(S, 'k2spur');
      },
    },
    {
      id: 'nacht',
      text: TX.k2m1.nacht,
      ort: 'Garten',
      ziel: () => O.garten.pos,
      an(S) {
        MI.autoWeg('k2lkw');
        S.weg = auftaktWeg();
      },
      // (the preview: mission 1 is not in yet – Saturday a little later, and the morning says so; past the opening: mission 2 goes on the
      // same day, mission 1 after the night of a preview's mission 2 the next morning)
      tick(dt, S) {
        if (S.weg) {
          const m = GLMLOGIK.tag(CLOCK.t);
          return GL.cur !== 'k2m1' || (m >= 7 * 60 && m < 12 * 60) || schlaf(S, T.spaetA, T.spaetB, 9, 40);
        }
        return (
          (S.n || (MI.zuFuss() && MI.fern(O.garten.pos) < 14)) &&
          (VORAB ? schlaf(S, T.morgenA, T.morgenVorab, 10, 20) : schlaf(S, T.morgenA, T.morgenB, 9, 40))
        );
      },
      ab(S) {
        if (!S.weg) chat('schnee');
      },
    },
  ];
  function auftaktSzene(id, A) {
    if (id !== 'scheune' && id !== 'spur' && id !== 'nacht') return false;
    if (id === 'nacht' || auftaktWeg()) return true;
    const H = amHof(),
      hut = { jule: 'strickblau', timo: 'schiebergrau', basti: 'basecap', gerhard: 'hut' };
    for (const k of ['jule', 'timo', 'basti', 'gerhard'])
      A.fig(k, k, H.P[k][0], H.P[k][1], H.hd(H.P[k]), {
        karte: k === 'gerhard' ? undefined : 'clique',
        hut: hut[k],
        era: 'heute',
      });
    if (id === 'spur') {
      const l = lkwPlatz();
      A.auto('k2lkw', 'koffer', l.p[0], l.p[1], l.hd, { text: 'Spedition Krähwinkel', band: '#7a1f24' });
    }
    return true;
  }
  // ================================================================ mission 1 · Grünes Band (with the chapter's opening) ================================================================
  // (the preview of 18.11.2026 – VORAB – has the zone's mission not yet: the opening goes before mission 2 then)
  if (!VORAB)
    MI.def({
      id: 'k2m1',
      kap: 2,
      titelBei: 'aufbruch',
      lohn: T.lohn1,
      pause: 6,
      gabe() {
        if (!GL.has('k2fotos')) GL.add('k2fotos', 2);
      },
      abbruch() {
        fotoAus();
        zoneLaden(false);
        zoneRoute(false);
        V1.fahrt = false;
      },
      szene(i, A) {
        // the barn: the clique and Gerhard in winter
        const sid = this.steps[i].id;
        if (auftaktSzene(sid, A)) return;
        if (!['kolonnenweg', 'bunker', 'fotos', 'rueckzug', 'heim'].includes(sid)) return;
        i = { kolonnenweg: 5, bunker: 6, fotos: 7, rueckzug: 8, heim: 9 }[sid];
        const B = bp();
        if (ersatz()) A.ding('k2bunker', () => ding(bunkerForm, B.b[0], B.b[1], B.vanHd));
        if (i <= 8) {
          A.auto('k2van', 'kasten', B.van[0], B.van[1], B.vanHd, { col: '#d9d9d2' });
          for (const m of B.men) {
            const [key, cast, p, pk] = m;
            A.fig(key, cast, p[0], p[1], blick(B, m), {
              karte: 'feind',
              hut: key === 'w3' ? 'strick' : undefined,
              ready: F => GLFIG.pose(F, pk),
            });
          }
          if (i >= 7 && K1.fremder)
            A.fig(
              'fremder',
              'fremder',
              B.fremder[0],
              B.fremder[1],
              Math.atan2(B.b[0] - B.fremder[0], B.b[1] - B.fremder[1]),
              {
                hut: 'hut',
              }
            );
        }
      },
      steps: [
        ...AUFTAKT,
        {
          id: 'aufbruch',
          text: TX.k2m1.aufbruch,
          ort: 'Grünes Band',
          ziel: () => ort('parkplatz'),
          an(S, why) {
            // (jumped straight here: the story's December all the same – Saturday, 5 December)
            if (!imDezember()) dezember(9, 40, 1);
            wetter(true);
            zoneLaden(true);
            zoneRoute(true);
            sms('jule1');
            // the moped in the garden (unless one sits on it or it stands near); full
            const m = O.moped,
              v = GLAUTO.moped;
            if (!(VEH.cur && VEH.cur.id === 'gl-moped') && !(v && v.g.visible && MI.fern([v.st.x, v.st.y]) < 30))
              GLAUTO.mopedAt(m.pos[0], m.pos[1], ((m.az || 0) * Math.PI) / 180);
            if (GL.tank < 3) {
              GL.tank = 5;
              GL.save();
              if (why !== 'reload') MI.denk(T.tank, 3500);
            }
            MI.extra(T.hinfahren, () => fahrt('hin'));
            if (why === 'weiter') MI.rede('k2morgen');
          },
          tick: () => MI.fern(ort('parkplatz')) < 45,
        },
        {
          id: 'museum',
          text: TX.k2m1.museum,
          ort: 'Grenzturm-Museum',
          ziel: () => ort('museum'),
          an() {
            zoneRoute(false);
          },
          tick(dt, S) {
            const w = MI.wo();
            return (S.r || (w.v < 1.5 && MI.fern(ort('parkplatz')) < 60) || S.t > 25) && sag(S, 'k2museum');
          },
        },
        {
          id: 'kolonnenweg',
          text: TX.k2m1.kolonnenweg,
          ort: 'Görsdorfer Heide',
          ziel: () => ort('heide'),
          an() {
            MI.denk(T.funkloch, 3500);
          },
          tick(dt, S) {
            const w = MI.wo();
            if (!S.platten && L.abstand(weg(), w.x, w.y).d < 6 && !MI.redet()) {
              S.platten = true;
              MI.rede('k2platten');
            }
            // (passing it on the way is enough, however far off the way the bunker lies)
            const B = bp();
            return MI.fern(B.b) < Math.max(115, B.ab + 60);
          },
        },
        {
          id: 'bunker',
          text: TX.k2m1.bunker,
          ort: 'Bunker',
          nochmal: [T.geschnappt, T.geschnapptSub],
          ziel: () => bp().b,
          // (also where one starts again: at the edge of the heath, the men calm at their work)
          an(S, why) {
            K1.W = [];
            K1.job = 'arbeit';
            K1.n = 0;
            K1.ft = 0;
            K1.fremder = false;
            K1.fremderGesehen = false;
            const B = bp();
            for (const m of B.men) {
              const f = MI.F(m[0]);
              if (f) {
                GLFIG.place(f, m[2][0], m[2][1], blick(B, m));
                GLFIG.pose(f, m[3]);
              }
            }
            if (why === 'nochmal') {
              const m = L.entlang(weg(), Math.max(0, B.s - 125));
              if (VEH.cur) VEH.exit();
              GLAUTO.mopedAt(m.x, m.y, m.hd);
              MI.hin(B.vorn[0], B.vorn[1], B.vornHd);
            }
          },
          tick(dt, S) {
            maenner(dt, S);
            return MI.zuFuss() && MI.fern(bp().b) < 55 && K1.job !== 'jagt';
          },
          ab() {
            MI.rede('k2bunkerDa');
          },
        },
        {
          id: 'fotos',
          cp: 'bunker',
          text: () => TX.k2m1.fotos(K1.n),
          ort: 'Bunker',
          nochmal: [T.geschnappt, T.geschnapptSub],
          // (agent zone's place to take them from, when it has one)
          ziel: () => zort('foto') || bp().b,
          an() {
            K1.ft = 0;
            fotoAn();
          },
          aus() {
            fotoAus();
          },
          ev: {
            'grenzland:foto': d => {
              if (d.von !== 'mission' && d.n > K1.n) K1.n = Math.min(2, d.n);
            },
          },
          tick(dt, S) {
            if (K1.ft > 0) K1.ft -= dt;
            maenner(dt, S);
            GLHUD.hint('Fotos: ' + K1.n + ' von 2');
            // the stranger at the edge of the heath, from the first photo on (or when one comes close)
            const B = bp();
            if (!K1.fremder && (K1.n >= 1 || MI.fern(B.b) < 30)) {
              K1.fremder = true;
              MI.A.fig(
                'fremder',
                'fremder',
                B.fremder[0],
                B.fremder[1],
                Math.atan2(B.b[0] - B.fremder[0], B.b[1] - B.fremder[1]),
                {
                  hut: 'hut',
                }
              );
            }
            const f = MI.F('fremder');
            if (
              f &&
              !K1.fremderGesehen &&
              MI.fern([f.x, f.y]) < L.FREMDER_R &&
              GLFAHNDUNG.los(P.x, P.y, f.x, f.y) &&
              !MI.redet()
            ) {
              K1.fremderGesehen = true;
              MI.rede('k2fremderDa');
            }
            return K1.n >= 2;
          },
          ab() {
            K1.n = 2;
            if (!GL.has('k2fotos')) GL.add('k2fotos', 2);
          },
        },
        {
          id: 'rueckzug',
          text: TX.k2m1.rueckzug,
          ort: 'Simson',
          nochmal: [T.gesehenWeg, T.gesehenWegSub],
          ziel: () => {
            const v = GLAUTO.moped;
            return v && v.g.visible ? [v.st.x, v.st.y] : ort('parkplatz');
          },
          // the men pack up and get into the van, which drives the Kolonnenweg out; the stranger goes
          an(S, why) {
            const B = bp(),
              c = MI.C('k2van');
            if (why === 'nochmal') {
              MI.hin(B.vorn[0] + (B.b[0] - B.vorn[0]) * 0.55, B.vorn[1] + (B.b[1] - B.vorn[1]) * 0.55, B.vornHd);
              if (c) GLAUTO.park(c, B.van[0], B.van[1], B.vanHd);
            }
            V1.s = B.s;
            V1.v = 0;
            V1.fahrt = false;
            if (!MI.redet()) MI.rede('k2abzug');
            // they walk to their van and get in; it leaves when all are in (at the latest when the farthest could be)
            S.drin = new Set();
            let weit = 0;
            for (const [key, , p] of B.men) {
              const f = MI.F(key),
                q = f ? [f.x, f.y] : p;
              weit = Math.max(weit, hyp(q[0] - B.van[0], q[1] - B.van[1]));
            }
            einsteigen(S, B);
            S.einT = Math.max(4.5, weit / 1.6 + 4);
            const f = MI.F('fremder');
            if (f)
              GLFIG.go(
                f,
                [B.fremder[0] + (B.fremder[0] - B.b[0]) * 0.8, B.fremder[1] + (B.fremder[1] - B.b[1]) * 0.8],
                1.5,
                () => MI.figWeg('fremder')
              );
          },
          aus() {
            V1.fahrt = false;
          },
          tick(dt, S) {
            const B = bp();
            if (!V1.fahrt && S.einT > 0) {
              einsteigen(S, B);
              if ((S.einT -= dt) <= 0 || B.men.every(([k]) => S.drin.has(k))) {
                S.einT = 0;
                for (const [key] of B.men) MI.figWeg(key);
                V1.fahrt = true;
              }
            }
            vanTick(dt);
            if (vanSieht() && !S.aus) {
              S.aus = true;
              MI.fehl(T.gesehenWeg, T.gesehenWegSub);
              return false;
            }
            const c = MI.C('k2van'),
              w = MI.wo(),
              fern = MI.fern(B.b) > 280,
              frei = !c || hyp(c.x - w.x, c.y - w.y) > 100;
            return fern && frei;
          },
          ab() {
            MI.autoWeg('k2van');
            V1.fahrt = false;
          },
        },
        {
          id: 'heim',
          text: TX.k2m1.heim,
          ort: 'Garten',
          ziel: () => O.garten.pos,
          // a signal again (agent zone's netz: out of the heath): the stranger's message
          an(S) {
            zoneLaden(false);
            // (sms() sends a message once: after a reload it comes only if it had not come yet)
            S.sms = true;
            MI.extra(T.heimfahren, () => fahrt('heim'));
          },
          tick(dt, S) {
            if (S.sms && netzDa()) {
              S.sms = false;
              if (sms('fremder')) MI.denk(T.netz, 2600);
              S.redeT = 1.2;
            }
            if (S.redeT > 0 && (S.redeT -= dt) <= 0 && !MI.redet()) MI.rede('k2fremderSms');
            const w = MI.wo();
            return (S.r || (MI.fern(O.garten.pos) < 22 && w.v < 3 && !MI.redet())) && sag(S, 'k2heim1');
          },
        },
      ],
    });
  // ================================================================ mission 2 · Ein Auto für die Nacht ================================================================
  // Fiedler's Wartburg at the edge of the old town of Schleusingen (by the Zentralhaltestelle), Fiedler at the Christmas market (or, when it
  // is shut, in the inn at the Markt); crack it (grenzland/gl_knacken.js), he sees it go and calls the police; to the field barn; a new
  // paint, the plates of Basti's old Golf, the haulier's work jacket. The market's crowd is cover for whoever is on foot in it.
  const A2 = D.AUTO;
  const markt = () => {
    try {
      const a = window.GLFESTE && window.GLFESTE.aktiv && window.GLFESTE.aktiv();
      if (a && a.id === 'weihnachtsmarkt') return { p: [a.x, a.y], r: a.r || 34, offen: true };
    } catch (e) {}
    return { p: [-1084.7, 1241.9], r: 34, offen: false };
  };
  // a kerb near the bus station: a street's edge (KERN.surface: inside a road, a metre from its edge), along it – else free ground beside it
  let PARK = null;
  function parkplatz() {
    const z = O.zh.pos;
    if (PARK && PARK.k === z.join()) return PARK;
    let best = null;
    for (let r = 8; r <= 46 && !best; r += 2)
      for (let a = 0; a < 360 && !best; a += 10) {
        const q = [z[0] + Math.sin((a * Math.PI) / 180) * r, z[1] + Math.cos((a * Math.PI) / 180) * r];
        let s = null;
        try {
          s = KERN.surface(q[0], q[1]);
        } catch (e) {}
        if (s && s.kind >= 3 && s.kind <= 5 && s.e > 0.85 && s.e < 1.5) best = { p: q, hd: richtung(q[0], q[1]) };
      }
    let fb = false;
    if (!best) {
      // (the town's streets are not there yet: free ground beside the bus station – asked again once the town stands)
      fb = true;
      const q = [z[0] + 11, z[1] - 7];
      try {
        KERN.pushOut(q, 1.6);
      } catch (e) {}
      best = { p: q, hd: (O.zh.yaw || 0) * (Math.PI / 180) };
    }
    const f = [Math.sin(best.hd), Math.cos(best.hd)];
    return (PARK = {
      k: z.join(),
      fb,
      p: best.p,
      hd: best.hd,
      hinter: [best.p[0] - f[0] * 6.4, best.p[1] - f[1] * 6.4],
    });
  }
  function autosStellen(neu) {
    const P0 = parkplatz(),
      c = GLKNACKEN.auto(A2.id);
    if (neu || !c || !c.gestohlen)
      GLKNACKEN.stelle(A2.id, {
        typ: A2.typ,
        alt: true,
        x: P0.p[0],
        y: P0.p[1],
        hd: P0.hd,
        farbe: A2.farbe,
        kz: A2.kz,
        neu: true,
      });
    GLKNACKEN.stelle(A2.neu.id, {
      typ: A2.neu.typ,
      alt: false,
      x: P0.hinter[0],
      y: P0.hinter[1],
      hd: P0.hd,
      farbe: A2.neu.farbe,
      kz: A2.neu.kz,
      neu: true,
    });
  }
  const stadtDa = () => {
    try {
      const z = KERN.zones().find(q => q.id === 'schleusingen');
      return !z || z.state === 'ready';
    } catch (e) {
      return true;
    }
  };
  // the town stands now: the kerb is found again (while the car is still shut and nobody is at it)
  function nachStellen() {
    if (!PARK || !PARK.fb || !stadtDa() || GLKNACKEN.offen(A2.id) || MI.fern(PARK.p) < 10) return;
    PARK = null;
    autosStellen(true);
  }
  const wartburg = () => GLKNACKEN.fz(A2.id);
  const imWagen = () => GLKNACKEN.drin(A2.id);
  // where Fiedler stands at the market: by the mulled wine, facing the stalls
  const fiedlerPlatz = () => {
    const m = markt();
    return [m.p[0] + 7, m.p[1] - 5];
  };
  // the market's crowd hides whoever is on foot in it (the wanted level's hiding places)
  const DECK = { e: null };
  function deckung(on) {
    const ex = GLFAHNDUNG.extra;
    if (!ex) return;
    if (on && !DECK.e) {
      const m = markt();
      DECK.e = { x: m.p[0], y: m.p[1], r: m.r * 0.8 };
      ex.push(DECK.e);
    } else if (!on && DECK.e) {
      const i = ex.indexOf(DECK.e);
      if (i >= 0) ex.splice(i, 1);
      DECK.e = null;
    }
  }
  function marktDeckung() {
    const m = markt();
    deckung(m.offen && MI.zuFuss() && MI.fern(m.p) < m.r * 0.8);
  }
  const clique2 = A => {
    const H = amHof(),
      hut = { jule: 'strickblau', timo: 'schiebergrau', basti: 'basecap' };
    for (const k of ['jule', 'timo', 'basti'])
      A.fig(k, k, H.P[k][0], H.P[k][1], H.hd(H.P[k]), { karte: 'clique', hut: hut[k], era: 'heute' });
  };
  const nahJule = (S, r = 6.5) => {
    const f = MI.F('jule'),
      w = MI.wo();
    return w.v < 2 && MI.zuFuss() && (f ? hyp(f.x - w.x, f.y - w.y) < r : MI.fern(hof()) < 10 || S.t > 8);
  };
  const unterDach = () => {
    const v = wartburg();
    if (!v || !v.g.visible) return false;
    return (
      (GLORTE.inScheune && GLORTE.inScheune(v.st.x, v.st.y)) || hyp(v.st.x - scheune()[0], v.st.y - scheune()[1]) < 8
    );
  };
  const amWagen = (r = 3.2) => {
    const v = wartburg();
    return !!v && !VEH.cur && hyp(P.x - v.st.x, P.y - v.st.y) < r;
  };
  function m2Ende() {
    KERN.unact('gl:k2lack');
    KERN.unact('gl:k2schild');
    KERN.unact('gl:k2jacke');
    try {
      CLOCK.unfocus('gl-k2');
    } catch (e) {}
    deckung(false);
    if (window.GLALLTAG) window.GLALLTAG.mitMission = false;
  }
  const GLKNLOGIK_LACK = () => GLKNLOGIK.LACK;
  MI.def({
    id: 'k2m2',
    kap: 2,
    titelBei: 'treff',
    lohn: T.lohn2,
    pause: 6,
    gabe() {
      if (!GL.has('arbeitsjacke')) GL.add('arbeitsjacke');
    },
    abbruch() {
      m2Ende();
      const c = GLKNACKEN.auto(A2.id);
      if (!c || !c.gestohlen) GLKNACKEN.weg(A2.id);
      GLKNACKEN.weg(A2.neu.id);
    },
    szene(i, A) {
      const sid = this.steps[i].id;
      if (auftaktSzene(sid, A)) return;
      if (['treff', 'lackieren', 'schilder', 'jacke', 'ende'].includes(sid)) clique2(A);
      if ((sid === 'knacken' || sid === 'weg') && markt().offen) {
        const f = fiedlerPlatz(),
          m = markt().p;
        A.fig('fiedler', 'fiedler', f[0], f[1], Math.atan2(m[0] - f[0], m[1] - f[1]), {
          sees: true,
          knows: false,
          r: 30,
        });
      }
    },
    steps: [
      ...AUFTAKT,
      {
        id: 'treff',
        text: TX.k2m2.scheune,
        ort: 'Feldscheune',
        ziel: () => {
          const f = MI.F('jule');
          return f ? [f.x, f.y] : hof();
        },
        an(S, why) {
          wetter(true);
          // (jumped straight here: Saturday, 5 December, the morning after the opening)
          if (!imDezember()) dezember(10, 20, 1);
          if (why !== 'reload') sms('jule2');
        },
        tick: (dt, S) => (S.r || nahJule(S)) && sag(S, 'k2auto'),
        ab() {
          if (!GL.has('draht')) GL.add('draht');
          if (!GL.has('arbeitsjacke')) GL.add('arbeitsjacke');
          MI.denk('Draht und Arbeitsjacke sind dabei.', 2600);
        },
      },
      {
        id: 'abend',
        text: TX.k2m2.abend,
        ort: 'Schleusingen',
        nochmal: [T.zuSpaet, T.zuSpaetSub],
        ziel: () => parkplatz().p,
        an(S, why) {
          if (why === 'nochmal') CLOCK.t -= 60;
          autosStellen(why !== 'reload');
          if (window.GLALLTAG) window.GLALLTAG.mitMission = true;
          MI.extra(T.abend, () => {
            const m = GLMLOGIK.tag(CLOCK.t);
            if (m < 17 * 60 + 30 && !CLOCK.warp) CLOCK.wait(GLMLOGIK.bis(CLOCK.t, 17, 50), 'Warten');
          });
        },
        tick(dt, S) {
          nachStellen();
          const m = GLMLOGIK.tag(CLOCK.t),
            abends = m >= 17 * 60 + 30 || m < 60;
          if (MI.fern(parkplatz().p) > 75) return false;
          if (abends) return true;
          if (!S.hell) {
            S.hell = true;
            MI.denk(T.nochHell, 3500);
          }
          return false;
        },
      },
      {
        id: 'knacken',
        cp: 'abend',
        text: () => TX.k2m2.knacken(markt().offen ? 'markt' : 'gast'),
        ort: 'Wartburg',
        nochmal: [T.zuSpaet, T.zuSpaetSub],
        ziel: () => {
          const p = GLKNACKEN.tuer(A2.id);
          return p ? [p[0], p[1]] : parkplatz().p;
        },
        an(S, why) {
          try {
            CLOCK.focus('gl-k2');
          } catch (e) {}
          // Fiedler stays at the market a while (real time): then he comes back for his car
          S.bis = 150;
          if (why !== 'reload') MI.rede(markt().offen ? 'k2markt' : 'k2gaststaette');
        },
        ev: {
          'grenzland:knacken': (d, S) => {
            if (d.id === A2.neu.id && d.st === 'alarm' && !MI.redet()) MI.rede('k2alarm');
          },
        },
        tick(dt, S) {
          marktDeckung();
          nachStellen();
          if (imWagen()) return true;
          const f = MI.F('fiedler'),
            P0 = parkplatz();
          if ((S.bis -= dt) <= 0) {
            if (!S.kommt) {
              S.kommt = true;
              MI.denk(T.fiedlerKommt, 2600);
              if (f) GLFIG.go(f, [P0.p[0] + 2, P0.p[1] + 2], 1.3);
            }
            // he is at his car (or, from the inn, after a minute): too late
            if ((f && hyp(f.x - P0.p[0], f.y - P0.p[1]) < 6) || (!f && S.bis < -60)) {
              if (!S.aus) {
                S.aus = true;
                MI.fehl(T.zuSpaet, T.zuSpaetSub);
              }
            }
          }
          return false;
        },
      },
      {
        id: 'weg',
        text: TX.k2m2.weg,
        ort: 'Feldscheune',
        ziel: () => scheune(),
        // Fiedler sees his car go – he shouts and calls the police: the wanted level knows the car
        an(S, why) {
          try {
            CLOCK.unfocus('gl-k2');
          } catch (e) {}
          S.meldT = why === 'reload' ? -1 : 2.6;
          const f = MI.F('fiedler'),
            P0 = parkplatz();
          if (f && why !== 'reload') {
            const d = hyp(f.x - P0.p[0], f.y - P0.p[1]);
            if (d > 45)
              GLFIG.place(f, P0.p[0] + ((f.x - P0.p[0]) / d) * 40, P0.p[1] + ((f.y - P0.p[1]) / d) * 40, f.hd);
            GLFIG.go(f, [P0.p[0] + 1.5, P0.p[1] + 1.5], 2.0);
          }
        },
        tick(dt, S) {
          marktDeckung();
          if (S.meldT > 0 && (S.meldT -= dt) <= 0) {
            const f = MI.F('fiedler');
            if (f) {
              GLFIG.stop(f);
              if (GLFIG.geste) GLFIG.geste(f, 'telefon', { sec: 6 });
            }
            MI.rede('k2besitzer');
            GLKNACKEN.melde(A2.id, D.AUTO.besitzer);
          }
          const v = wartburg();
          return !!v && unterDach() && hyp(v.st.u, v.st.v) < 1;
        },
        ab() {
          deckung(false);
          chat('wartburg');
          try {
            GLHANDY.feed(D.FEED.wartburg[0], D.FEED.wartburg[1], '');
          } catch (e) {}
        },
      },
      {
        id: 'lackieren',
        text: TX.k2m2.lackieren,
        ort: 'Feldscheune',
        ziel: () => {
          const v = wartburg();
          return v ? [v.st.x, v.st.y] : scheune();
        },
        an(S) {
          if (window.GLALLTAG) window.GLALLTAG.mitMission = false;
          const g = St.gen;
          KERN.act({
            id: 'gl:k2lack',
            label: () => (GL.on && amWagen() && !S.fertig && !S.wahl ? T.lack : null),
            pos: () => [P.x, P.y, P.feet],
            r: 2,
            prio: 3,
            run() {
              if (stars() > 0) return void MI.denk(T.lackSterne, 2600);
              if (!unterDach()) return void MI.denk(T.lackDach, 2600);
              S.wahl = true;
              GLHUD.wahl(
                T.lackTitel,
                T.lackText,
                GLKNLOGIK_LACK().map(k => ({ t: GLKNACKEN.FARBEN[k].name, s: '' }))
              ).then(async i => {
                S.wahl = false;
                if (St.gen !== g || i < 0) return;
                const farbe = GLKNLOGIK_LACK()[i];
                const n = await dunkel(T.lackA, T.lackB);
                if (St.gen !== g) return void hell(n);
                CLOCK.t += 180;
                try {
                  if (DN && DN.active) DN.update(true);
                } catch (e) {}
                GLKNACKEN.lackieren(A2.id, farbe);
                await sleep(900);
                await hell(n);
                if (St.gen === g) S.fertig = true;
              });
            },
          });
        },
        aus() {
          KERN.unact('gl:k2lack');
        },
        tick(dt, S) {
          if (!S.r0 && MI.zuFuss() && MI.fern(scheune()) < 14 && !MI.redet()) {
            S.r0 = true;
            MI.rede('k2scheune2');
          }
          return !!S.fertig && sag(S, 'k2lack');
        },
      },
      {
        id: 'schilder',
        text: TX.k2m2.schilder,
        ort: 'Feldscheune',
        ziel: () => {
          const v = wartburg();
          return v ? [v.st.x, v.st.y] : scheune();
        },
        an(S) {
          KERN.act({
            id: 'gl:k2schild',
            label: () => (GL.on && amWagen() && !S.fertig ? T.schild : null),
            pos: () => [P.x, P.y, P.feet],
            r: 2,
            hold: 4,
            prio: 3,
            gest3: 'pickupLow',
            work(k) {
              const n = Math.floor(k * 4);
              if (n !== S.dreh) {
                S.dreh = n;
                GLTON.fx('tick');
              }
            },
            run() {
              GLKNACKEN.schildern(A2.id, A2.kzNeu);
              MI.denk(T.schildOk, 2600);
              S.fertig = true;
            },
          });
        },
        aus() {
          KERN.unact('gl:k2schild');
        },
        tick: (dt, S) => !!S.fertig && sag(S, 'k2schild'),
        ab() {
          const c = GLKNACKEN.auto(A2.id);
          if (c && c.kz !== A2.kzNeu) GLKNACKEN.schildern(A2.id, A2.kzNeu);
        },
      },
      {
        id: 'jacke',
        text: TX.k2m2.jacke,
        ort: 'Jule',
        ziel: () => {
          const f = MI.F('jule');
          return f ? [f.x, f.y] : hof();
        },
        an(S) {
          const an = () => (GLFAHNDUNG.kleidVon || {})[GL.wer] === 'warn';
          S.an = an();
          KERN.act({
            id: 'gl:k2jacke',
            label: () => (GL.on && !VEH.cur && GL.has('arbeitsjacke') && !an() ? T.jacke : null),
            pos: () => [P.x, P.y, P.feet],
            r: 2,
            prio: 2.5,
            run() {
              const r = GLFAHNDUNG.umziehen ? GLFAHNDUNG.umziehen() : '';
              if (r === 'gesehen') return;
              if (an()) {
                S.an = true;
                MI.denk(T.jackeAn, 3600);
              }
            },
          });
        },
        aus() {
          KERN.unact('gl:k2jacke');
        },
        tick: (dt, S) => (S.r || (S.an && nahJule(S, 7))) && sag(S, 'k2jacke'),
      },
      {
        id: 'ende',
        text: TX.k2m2.ende,
        ort: 'Jule',
        ziel: () => {
          const f = MI.F('jule');
          return f ? [f.x, f.y] : hof();
        },
        tick: (dt, S) => (S.r || nahJule(S, 7)) && sag(S, 'k2ende'),
        ab() {
          m2Ende();
          GLKNACKEN.weg(A2.neu.id);
        },
      },
    ],
  });
  // the chapter's first mission (the preview: mission 2)
  const ERSTE = () => (VORAB ? 'k2m2' : 'k2m1');
  // ================================================================ free play after chapter 1: when chapter 2 begins ================================================================
  const kap1Ids = () => (MI.R ? GLMDATA.ORDER.filter(id => MI.R.by(id) && !((GLMDATA.M[id] || {}).kap > 1)) : []);
  const kap1Fertig = () => {
    const ids = kap1Ids();
    return ids.length > 0 && ids.every(id => MI.R.st(id) === 'erledigt');
  };
  function knopf(on) {
    if (on && !S.xl) {
      S.xl = true;
      GLHUD.extra(K.knopf, () => {
        S.knopf = true;
      });
    } else if (!on && S.xl) {
      S.xl = false;
      // (only while the button is still ours: a mission's step may have set its own meanwhile)
      if (GLHUD.xl === K.knopf) GLHUD.extra(null, null);
    }
  }
  function beginn() {
    knopf(false);
    S.knopf = false;
    S.frei = 0;
    GL.kap = 2;
    GL.save(true);
    MI.start(ERSTE());
  }
  function freiTick(dt) {
    const k2 = !!(MI.R.by(ERSTE()) && MI.R.st(ERSTE()) !== 'offen');
    if (!kap1Fertig() || k2 || (GL.kap || 1) > 1) {
      knopf(false);
      S.frei = 0;
      return;
    }
    const ende = document.getElementById('glende'),
      fade = document.getElementById('glfade'),
      w = MI.wo(),
      ds = hyp(w.x - scheune()[0], w.y - scheune()[1]);
    if (ds > 60) S.weg = true;
    const o = {
      on: GL.on,
      era: GL.era,
      kap1: true,
      k2: k2,
      mission: !!MI.cur(),
      ende: !!(ende && !ende.hidden),
      sterne: stars(),
      job: !!(window.GLJOBS && window.GLJOBS.aktiv && window.GLJOBS.aktiv()),
      handy: GLHANDY.isOpen(),
      blende: !!(fade && fade.classList.contains('on')),
      knopf: S.knopf,
      scheune: S.weg && ds < 30,
      fahrt: !!VEH.cur && w.v > 1,
      frei: S.frei,
    };
    const ruhig = !o.mission && !o.ende && !o.sterne && !o.job && !o.blende && o.era === 'heute';
    if (ruhig) S.frei += dt;
    knopf(ruhig && !o.mission);
    if (ruhig && !S.angebot && S.frei > 8) {
      S.angebot = true;
      MI.denk(K.angebot, 6500);
    }
    // (never in the first seconds after the closing screen: a moment of free play first)
    const wie = S.frei > 3 || o.knopf ? L.beginnt(o) : '';
    if (wie) beginn();
  }
  // ---------------- per frame (grenzland/gl_modus.js, after the place beds) ----------------
  // the direct way into chapter 2 (Falko, 18.11.2026 20:28 over the lead – his save may not have chapter 1 done): ?kapitel=2 in the
  // address, with ?szenario=grenzland or the menu's Szenen → Grenzland. On the mode's start – a frame later, after its own fresh start
  // has begun chapter 1 – chapter 1 is marked done if it is not (as the browser test's KAP1), and chapter 2 opens at once; once
  // chapter 2 has begun, nothing. Without the parameter nothing changes.
  const kapitelUrl = () => {
    try {
      return new URL(location.href).searchParams.get('kapitel') === '2';
    } catch (e) {
      return false;
    }
  };
  KERN.on('grenzland:start', () => {
    if (kapitelUrl()) S.direkt = true;
  });
  function direkt() {
    S.direkt = false;
    if (!MI.R) return;
    const was = L.direkt({
      kap: GL.kap,
      kap1: kap1Ids().map(id => MI.R.st(id)),
      k2: ['k2m1', 'k2m2'].map(id => (MI.R.by(id) ? MI.R.st(id) : 'offen')),
    });
    if (was === 'nichts') return;
    if (was === 'kap1') {
      MI.stop();
      for (const id of kap1Ids()) GL.m[id] = { st: 'erledigt', i: 0, n: 0 };
      for (const id of ['k2m1', 'k2m2']) delete GL.m[id];
      GL.cur = '';
      GL.kap = 1;
      GL.kap1 = true;
      GL.save(true);
    }
    beginn();
  }
  function tick(dt) {
    if (!GL.on) return;
    try {
      if (GL.era !== 'heute') return;
      if (S.direkt) direkt();
      freiTick(dt);
      GLKNACKEN.tick(dt);
      // the snow belongs to the story's December while chapter 2 runs
      const k2 = (GL.kap || 1) > 1 && imDezember();
      if (k2 && !S.wetter) wetter(true);
      else if (!k2 && S.wetter) wetter(false);
    } catch (e) {
      if (!S.err) console.warn('grenzland kapitel2', e);
      S.err = String((e && e.message) || e);
    }
  }
  function stop() {
    S.direkt = false;
    knopf(false);
    wetter(false);
    fotoAus();
    V1.fahrt = false;
    S.frei = 0;
    S.knopf = false;
    S.weg = false;
    S.angebot = false;
    S.pause = false;
  }
  KERN.on('grenzland:stop', () => stop());
  // after the last mission of chapter 2 so far: what follows
  KERN.on('grenzland:kapitel', d => {
    if (!GL.on || !d || d.kap !== 2 || d.st !== 'pause' || S.pause) return;
    S.pause = true;
    try {
      GLHUD.titel(K.weiter, K.weiterUeber, 6, K.weiterUnter);
    } catch (e) {}
  });
  const linien = () => D.linien();
  const debug = {
    // tests: the panel's button pressed / free play counted on
    beginn: () => {
      S.knopf = true;
      S.weg = true;
      S.frei = Math.max(S.frei, 4);
    },
    frei: s => (S.frei = s),
    // tests: a zone object (the interface of GLZONE) – null: the stand-in; undefined: window.GLZONE again
    zone: z => {
      S.zoneTest = z;
      WEG = null;
      BP = null;
    },
    info: () => ({
      frei: Math.round(S.frei * 10) / 10,
      knopf: S.xl,
      kap: GL.kap,
      dez: imDezember(),
      wetter: S.wetter,
      ersatz: ersatz(),
      fotos: K1.n,
      job: K1.job,
      fremder: K1.fremder,
      van: { s: Math.round(V1.s), fahrt: V1.fahrt },
      err: S.err || '',
      erste: ERSTE(),
      karte: karteN,
    }),
    bp: () => bp(),
    lkw: () => lkwPlatz(),
    park: () => parkplatz(),
    hof: () => amHof(),
  };
  return { S, tick, stop, linien, zone, ort, weg, ersatz, fahrt, debug, K1, V1 };
})();
window.GLKAP2 = GLKAP2;
