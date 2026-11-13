// ===================== feat/grenzland: fishing at the reservoir (GLANGELN) =====================
// „Angeln“ on the jetty at the foot of the dam (grenzland/gl_orte.js builds it): one sits on the stool at its end, the rod in the hands
// (seen with one's own eyes and over the shoulder alike – the rod, the line and the float are things in the world).
//   bait  – corn, a lobworm or a spinner from the shop on wheels; one per cast
//   cast  – the float lies on the water and bobs; how long until something happens comes from the month, the hour and the bait
//           (GLNLOGIK: carp on corn in the evening, perch on the worm, pike on the spinner in autumn …); sometimes it only twitches
//   bite  – the float goes under: strike („Anhieb!“) within a second and a half; too early scares the fish, too late the bait is gone
//   fight – hold the reel („Kurbeln“: the button, the space bar or E, held) and keep the line's tension in the green band: when the
//           fish pulls, let go, or the line breaks; too slack for too long and it is off the hook. Heavy fish pull harder.
//   catch – the fish with its weight, into the rucksack (a carp of two kilos or more is its own thing: the cook from Suhl asks for one);
//           the shop on wheels buys fish.
// As in real life one needs a permit for the water (in Thuringia: a Fischereischein and the permit of the water's tenant) – here the
// guest permit from the shop on wheels. Fishing without it is a deed if somebody sees it (grenzland/gl_fahndung.js).
// Interface: GLANGELN.angeln(koeder, o) → Promise<catch | null>   o: { seed, biss: seconds until the bite, fisch: { art, kg },
//   auto: strike and reel by themselves (tests) } · GLANGELN.on · anhieb() · kurbel(on) · stand()
import * as THREE from 'three';
import { cam, scene } from '../core/head.js';
import { KERN } from '../core/kern.js';
import { markDirty } from '../core/assets.js';
import { P } from '../game/walkable.js';
import { PLAY } from '../game/play.js';
import { CLOCK } from '../time/clock.js';
import { DN } from '../time/daynight.js';
import { VAUTO } from '../verkehr/verkehr_auto.js';
import { GLLOGIK } from './gl_logik.js';
import { GLNLOGIK } from './gl_neben_logik.js';
import { GL } from './gl_state.js';
import { GLTON } from './gl_ton.js';
import { GLHUD } from './gl_hud.js';
import { GLHANDY } from './gl_handy.js';
import { GLFAHNDUNG } from './gl_fahndung.js';
import { GLORTE } from './gl_orte.js';
import { GLSPIEL } from './gl_kegeln.js';
export const GLANGELN = (() => {
  const N = GLNLOGIK,
    S = {
      on: false,
      ph: '', // 'wurf' | 'warten' | 'biss' | 'drill' | 'fang' | 'leer' | ''
      t: 0,
      koeder: '',
      w: null, // the wait: { sek, zupfer }
      f: null, // what bites
      D: null, // the fight
      reel: false,
      seed: 1,
      o: {},
      res: null,
      letzter: null,
      meshes: null,
      pose: [0, 0, 0], // where the float is
      ang: 0,
      n: 0,
      zupf: 0,
      karteGesagt: false,
    };
  const lin = c => (c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4));
  const Lc = (r, g, b) => [lin(r / 255), lin(g / 255), lin(b / 255)];
  const kg = v => String(v.toFixed(2)).replace('.', ',') + ' kg';
  const monat = () => {
    try {
      return new Date((DN.e0 + Math.floor(CLOCK.t / 1440)) * 864e5).getUTCMonth() + 1;
    } catch (e) {
      return 9;
    }
  };
  const stunde = () => Math.floor(N.minOf(CLOCK.t) / 60);
  const FARBE = {
    karpfen: 0xb89a52,
    karpfen_gross: 0xb89a52,
    silberkarpfen: 0xc8ccd0,
    schleie: 0x6a7040,
    rotauge: 0xc0c4c8,
    barsch: 0x8a9a58,
    hecht: 0x6e8a4e,
    zander: 0x9aa08a,
  };
  // ------------------------------------------------------------------ rod, line, float, the fish ------------------------------------------------------------------
  function bauen() {
    if (S.meshes || !GLORTE.AN.F) return;
    const MT = GLORTE.mat(),
      M = { geos: [], mats: [] },
      add = (K, mat, shadow) => {
        const g = K.geo(),
          m = new THREE.Mesh(g, mat);
        M.geos.push(g);
        m.userData.noMerge = true;
        m.castShadow = !!shadow;
        m.receiveShadow = false;
        m.visible = false;
        m.frustumCulled = false;
        scene.add(m);
        return m;
      };
    // the rod: 2.9 m, tapering, a cork grip and a reel – along the mesh's own up axis
    let K = GLORTE.kit();
    K.cyl(0, 0, 0.36, 2.9, 0.011, 0.003, 6, Lc(40, 44, 40), true);
    K.cyl(0, 0, 0, 0.38, 0.017, 0.015, 8, Lc(176, 140, 96), true);
    K.cyl(0.035, 0, 0.26, 0.33, 0.035, 0.035, 10, Lc(60, 62, 66), true);
    K.box(0.06, 0, 0.285, 0.05, 0.012, 0.012, 0, Lc(20, 20, 22), false);
    for (const z of [0.9, 1.5, 2.1, 2.6]) K.cyl(0.012, 0, z, z + 0.012, 0.012, 0.012, 6, Lc(150, 152, 156), false);
    M.rute = add(K, MT.paint, true);
    // the float: white below, red above, a thin tip
    K = GLORTE.kit();
    K.lathe(
      0,
      0,
      -0.07,
      [
        [0.002, 0],
        [0.013, 0.025],
        [0.022, 0.07],
      ],
      8,
      Lc(236, 232, 220)
    );
    K.lathe(
      0,
      0,
      -0.07,
      [
        [0.022, 0.07],
        [0.014, 0.105],
        [0.004, 0.12],
        [0.004, 0.2],
        [0, 0.2],
      ],
      8,
      Lc(214, 44, 34)
    );
    M.pose = add(K, MT.paint, false);
    M.pose.scale.setScalar(2.2); // a float one can read from the stool
    // the fish: a body with a darker back and a pale belly, a tail and fins; tinted by its kind (a clone of the material: the same program)
    K = GLORTE.kit();
    const back = Lc(96, 98, 92),
      side = Lc(214, 212, 204),
      belly = Lc(240, 238, 228),
      n = 9,
      prof = t => Math.pow(Math.sin(Math.PI * Math.min(1, t * 1.06)), 0.75) * (1 - 0.35 * t); // how thick along its length
    for (let i = 0; i < n; i++) {
      const y0 = -0.5 + i / n,
        y1 = -0.5 + (i + 1) / n,
        r0 = prof(1 - i / n) * 0.16,
        r1 = prof(1 - (i + 1) / n) * 0.16;
      for (let k = 0; k < 8; k++) {
        const a0 = (k / 8) * Math.PI * 2,
          a1 = ((k + 1) / 8) * Math.PI * 2,
          pt = (y, r, a) => [Math.cos(a) * r * 0.42, y, Math.sin(a) * r],
          col = Math.sin((a0 + a1) / 2) > 0.45 ? back : Math.sin((a0 + a1) / 2) < -0.5 ? belly : side;
        K.quad(pt(y0, r0, a1), pt(y0, r0, a0), pt(y1, r1, a0), pt(y1, r1, a1), col);
      }
    }
    for (const sx of [-1, 1]) {
      const fin = Lc(150, 110, 84);
      if (sx > 0) {
        K.tri([0, -0.5, 0], [0, -0.66, 0.11], [0, -0.66, -0.11], fin);
        K.tri([0, 0.0, 0.14], [0, -0.18, 0.2], [0, -0.26, 0.12], back);
      } else {
        K.tri([0, -0.5, 0], [0, -0.66, -0.11], [0, -0.66, 0.11], fin);
        K.tri([0, 0.0, 0.14], [0, -0.26, 0.12], [0, -0.18, 0.2], back);
      }
      K.tri([sx * 0.05, 0.2, -0.06], [sx * 0.12, 0.08, -0.12], [sx * 0.05, 0.1, -0.08], fin);
      K.tri([sx * 0.05, 0.2, -0.06], [sx * 0.05, 0.1, -0.08], [sx * 0.12, 0.08, -0.12], fin);
      K.box(sx * 0.052, 0.36, 0.03, 0.01, 0.022, 0.022, 0, Lc(20, 20, 20), false);
    }
    const fm = MT.paint.clone();
    M.mats.push(fm);
    M.fisch = add(K, fm, false);
    // the line: a thin strip from the rod's tip to the float or the fish, turned to the eye every frame
    const g = new THREE.BufferGeometry(),
      nor = new Float32Array(12);
    for (let i = 0; i < 4; i++) nor[i * 3 + 1] = 1;
    g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(12), 3));
    g.setAttribute('normal', new THREE.BufferAttribute(nor, 3));
    g.setAttribute('uv', new THREE.BufferAttribute(new Float32Array(8), 2));
    g.setIndex([0, 1, 2, 1, 3, 2, 0, 2, 1, 1, 2, 3]);
    const lm = VAUTO.LM.head.clone();
    lm.color.setHex(0xe8ecee);
    lm.emissive.setHex(0xdfe8ee);
    lm.emissiveIntensity = 0.35;
    lm.metalness = 0;
    lm.roughness = 0.8;
    M.mats.push(lm);
    M.schnur = new THREE.Mesh(g, lm);
    M.schnur.userData.noMerge = true;
    M.schnur.frustumCulled = false;
    M.schnur.castShadow = M.schnur.receiveShadow = false;
    M.schnur.visible = false;
    M.geos.push(g);
    scene.add(M.schnur);
    S.meshes = M;
  }
  function weg() {
    const M = S.meshes;
    if (!M) return;
    for (const m of [M.rute, M.pose, M.fisch, M.schnur]) scene.remove(m);
    for (const g of M.geos) g.dispose();
    for (const m of M.mats) m.dispose();
    S.meshes = null;
  }
  const _a = new THREE.Vector3(),
    _b = new THREE.Vector3(),
    _c = new THREE.Vector3(),
    _d = new THREE.Vector3(),
    _e = new THREE.Vector3(),
    _up = new THREE.Vector3(0, 1, 0);
  const V3 = (v, p) => v.set(p[0], p[2], -p[1]); // a site point as a three vector
  // put rod, line and float where they belong; zug: how hard the fish pulls (0 … 1), ziel: where the line ends (site point)
  function stellen(zug, ziel, hebt = 0) {
    const M = S.meshes,
      A = GLORTE.AN,
      F = A.F,
      hand = F.P(0.42, A.sB - 0.42, A.z + 0.66),
      // the rod's tip: up and ahead; under load it comes down towards the fish
      dx = ziel[0] - hand[0],
      dy = ziel[1] - hand[1],
      dl = Math.hypot(dx, dy) || 1,
      el = (58 - 30 * zug + 22 * hebt) * (Math.PI / 180),
      tip = [
        hand[0] + (dx / dl) * Math.cos(el) * 2.9,
        hand[1] + (dy / dl) * Math.cos(el) * 2.9,
        hand[2] + Math.sin(el) * 2.9,
      ];
    V3(_a, hand);
    V3(_b, tip);
    M.rute.position.copy(_a);
    M.rute.quaternion.setFromUnitVectors(_up, _c.copy(_b).sub(_a).normalize());
    M.rute.visible = true;
    // the line, as wide as a pixel or two whatever the distance
    V3(_c, ziel);
    const p = M.schnur.geometry.attributes.position,
      side = _d.copy(_c).sub(_b).cross(_e.copy(cam.position).sub(_b)).normalize(),
      w0 = Math.max(0.0025, cam.position.distanceTo(_b) * 0.0011),
      w1 = Math.max(0.0025, cam.position.distanceTo(_c) * 0.0011);
    p.setXYZ(0, _b.x - side.x * w0, _b.y - side.y * w0, _b.z - side.z * w0);
    p.setXYZ(1, _b.x + side.x * w0, _b.y + side.y * w0, _b.z + side.z * w0);
    p.setXYZ(2, _c.x - side.x * w1, _c.y - side.y * w1, _c.z - side.z * w1);
    p.setXYZ(3, _c.x + side.x * w1, _c.y + side.y * w1, _c.z + side.z * w1);
    p.needsUpdate = true;
    M.schnur.visible = true;
    return tip;
  }
  // ------------------------------------------------------------------ the panel ------------------------------------------------------------------
  const koederN = k => GL.inv[k] || 0;
  function panel() {
    const K = [];
    let text = '',
      balken = null;
    const rechts = N.KOEDER[S.koeder] + ' · noch ' + koederN(S.koeder);
    if (S.ph === 'wurf') text = 'Ausgeworfen …';
    else if (S.ph === 'warten') {
      text = 'Die Pose liegt auf dem Wasser. Warten – und erst anschlagen, wenn sie abtaucht (Leertaste oder E).';
      K.push({ k: 'los', t: 'Anhieb!', cls: 'haupt' }, { k: 'aus', t: 'Einholen', cls: 'aus' });
    } else if (S.ph === 'biss') {
      text = 'BISS! Anhieb!';
      K.push({ k: 'los', t: 'Anhieb!', cls: 'haupt' });
    } else if (S.ph === 'drill') {
      text =
        'Drill: Kurbel halten (Knopf, Leertaste oder E) und die Spannung im grünen Feld halten. Zieht der Fisch, loslassen.';
      balken = { v: S.D ? S.D.sp : 0.5, band: N.BAND };
      K.push({ k: 'kurbel', t: 'Kurbeln (halten)', cls: 'haupt' });
    } else if (S.ph === 'fang' || S.ph === 'leer') {
      text = S.letzter ? S.letzter : '';
      if (koederN(S.koeder) > 0) K.push({ k: 'neu', t: 'Noch einmal auswerfen', cls: 'haupt' });
      K.push({ k: 'aus', t: 'Zusammenpacken', cls: 'aus' });
    }
    GLSPIEL.set({ titel: 'Angeln', rechts, text, balken, knoepfe: K });
  }
  // ------------------------------------------------------------------ the steps ------------------------------------------------------------------
  function auswerfen() {
    if (!GL.use(S.koeder)) {
      S.letzter = 'Kein Köder mehr.';
      S.ph = 'leer';
      panel();
      return false;
    }
    S.n++;
    const A = GLORTE.AN,
      sd = (S.seed + S.n * 7919) >>> 0,
      R = N.rng(sd),
      mon = monat(),
      h = stunde();
    S.w = N.warte(mon, h, S.koeder, sd);
    if (S.o.biss != null) S.w = { sek: S.o.biss, zupfer: [] };
    S.f = S.o.fisch
      ? (() => {
          const q = N.FISCH[S.o.fisch.art],
            w = S.o.fisch.kg;
          return {
            art: S.o.fisch.art,
            name: q.name,
            kg: w,
            eur: Math.round(w * q.eur * 100) / 100,
            zug: q.zug * (0.7 + 0.6 * (w / q.kg[1])),
            ding: N.ding(S.o.fisch.art, w),
          };
        })()
      : N.fang(mon, h, S.koeder, sd);
    const p = A.F.xy((R() - 0.5) * 3, A.sB + 3.2 + R() * 2.2);
    S.pose = [p[0], p[1], Math.max(A.w, GLORTE.gnd(p[0], p[1]))]; // the water one sees: the reservoir's level, or the ground model's lake surface
    S.ph = 'wurf';
    S.t = 0;
    S.zupf = 0;
    S.D = null;
    S.reel = false;
    GLTON.fx('wurf', 0, 200);
    // without a permit it is poaching – if somebody sees it
    if (!GL.has('angelkarte')) {
      const Z = GLFAHNDUNG.zeugen();
      if (Z.length) {
        if (GLLOGIK.CRIMES.angeln) GLFAHNDUNG.tat('angeln', { quiet: true });
        else GLFAHNDUNG.tat('rempeln', { k: 0.8, quiet: true });
        PLAY.think(Z[0].name + ' hat es gesehen: Angeln ohne Erlaubnisschein.', 3600);
      } else if (!S.karteGesagt) {
        S.karteGesagt = true;
        PLAY.think('Ohne Gastkarte ist das Fischwilderei. Wenn es einer sieht …', 3600);
      }
    }
    GL.emit('angelwurf', { koeder: S.koeder, karte: GL.has('angelkarte') });
    panel();
    return true;
  }
  // strike: only a bite makes a fight of it
  function anhieb() {
    if (!S.on) return false;
    if (S.ph === 'biss') {
      S.D = N.drillNeu(S.f, S.seed + S.n);
      S.ph = 'drill';
      S.t = 0;
      S.ang = 0;
      GLTON.fx('rolle');
      GLHUD.say('Hängt!', 'Kurbeln – aber mit Gefühl.', 2);
      panel();
      return true;
    }
    if (S.ph === 'warten') {
      // too early: the float jumps, the fish is gone, so is the bait
      aus('Zu früh angeschlagen – der Köder ist ab, der Fisch gewarnt.');
      return false;
    }
    return false;
  }
  function aus(text) {
    S.letzter = text;
    S.ph = 'leer';
    S.t = 0;
    S.f = null;
    panel();
  }
  function gelandet() {
    const f = S.f;
    GL.stats.fische = (GL.stats.fische || 0) + 1;
    GL.stats.best = Math.max(GL.stats.best || 0, f.kg);
    GL.add(f.ding, 1);
    GLTON.fx('platsch');
    S.letzter =
      f.name +
      ', ' +
      kg(f.kg) +
      (f.ding === 'karpfen_gross'
        ? ' – ein Prachtkerl.'
        : f.art === 'silberkarpfen'
          ? ' – den fängt man sonst nie.'
          : '.');
    GLHUD.say(f.name + ', ' + kg(f.kg), 'In den Rucksack. Der Verkaufswagen kauft Fisch.', 4);
    S.fang = f;
    S.ph = 'fang';
    S.t = 0;
    const M = S.meshes;
    M.fisch.material.color.setHex(FARBE[f.art] || 0xb0b0a8);
    const len = Math.min(0.95, 0.36 * Math.cbrt(f.kg) + 0.08);
    M.fisch.scale.set(len, len, len);
    M.pose.visible = false;
    if (f.kg >= 5)
      GLHANDY.feed(
        'Angel_Andi',
        'Am Steg hat einer einen ' + f.name + ' von ' + kg(f.kg) + ' gezogen. Ich sag ja nichts mehr.',
        'damm'
      );
    GL.emit('fang', f);
    panel();
  }
  function taste(k, down = true) {
    if (!S.on) return;
    if (k === 'kurbel') return kurbel(down);
    if (!down) return;
    if (k === 'los') anhieb();
    else if (k === 'neu') {
      if (S.ph === 'fang' || S.ph === 'leer') auswerfen();
    } else if (k === 'aus') PLAY.stand(true);
  }
  const kurbel = on => {
    if (S.reel !== !!on && on && S.ph === 'drill') GLTON.fx('rolle');
    S.reel = !!on;
  };
  function primary() {
    if (S.ph === 'warten' || S.ph === 'biss') anhieb();
    else if ((S.ph === 'fang' || S.ph === 'leer') && koederN(S.koeder) > 0) auswerfen();
  }
  const HOLD = [' ', 'e', 'enter'];
  function onKey(e) {
    if (!S.on || e.ctrlKey || e.metaKey || e.altKey) return;
    const k = e.key.toLowerCase();
    if (!HOLD.includes(k)) return;
    if (S.ph === 'drill') {
      e.preventDefault();
      e.stopPropagation();
      kurbel(e.type === 'keydown');
    } else if (k === ' ' && e.type === 'keydown' && !e.repeat) {
      e.preventDefault();
      primary();
    }
  }
  // ------------------------------------------------------------------ per frame ------------------------------------------------------------------
  function tick(dt) {
    if (!S.on || !S.meshes) return;
    dt = Math.min(dt, 0.1);
    S.t += dt;
    const M = S.meshes,
      A = GLORTE.AN,
      end = A.F.P(0, A.sB, A.z);
    let zug = 0,
      ziel = S.pose,
      heb = 0;
    if (S.ph === 'wurf') {
      // the float flies out in a bow
      const k = Math.min(1, S.t / 0.9),
        a = A.F.P(0.5, A.sB + 0.8, A.z + 2.6);
      ziel = [
        a[0] + (S.pose[0] - a[0]) * k,
        a[1] + (S.pose[1] - a[1]) * k,
        a[2] + (S.pose[2] - a[2]) * k + Math.sin(k * Math.PI) * 1.4,
      ];
      heb = 1 - k;
      M.pose.visible = S.koeder !== 'blinker';
      if (k >= 1) {
        S.ph = 'warten';
        S.t = 0;
        GLTON.fx('platsch', 6, 200);
        panel();
      }
    } else if (S.ph === 'warten') {
      // it bobs; now and then it only twitches; then it goes under – if something bites at all
      let dz = Math.sin(S.t * 2.1) * 0.008;
      for (const z of S.w.zupfer) {
        const q = S.t - z;
        if (q > 0 && q < 0.5) {
          dz -= Math.sin((q / 0.5) * Math.PI) * 0.03;
          if (S.zupf < z) {
            S.zupf = z;
            GLTON.fx('tick', 6, 200);
          }
        }
      }
      ziel = [S.pose[0], S.pose[1], S.pose[2] + dz];
      if (S.t >= S.w.sek) {
        if (S.f) {
          S.ph = 'biss';
          S.t = 0;
          GLTON.fx('biss');
          GLHUD.say('Biss!', '', 1.2);
        } else aus('Nichts beißt. Der Köder ist abgefressen.');
        panel();
      } else if (S.o.auto === 'früh' && S.t > 0.5) anhieb();
    } else if (S.ph === 'biss') {
      const k = Math.min(1, S.t / 0.35);
      ziel = [S.pose[0], S.pose[1], S.pose[2] - 0.16 * k];
      zug = 0.25;
      if (S.o.auto === true && S.t > 0.3) anhieb();
      else if (S.t > N.ANHIEB) aus('Zu spät – der Köder ist weg.');
    } else if (S.ph === 'drill') {
      const D = S.D,
        reel = S.o.auto === true ? D.sp < 0.6 : S.o.auto === 'reissen' ? true : S.reel,
        st = N.drill(D, dt, reel);
      // the fish out there: as far as the line is out, wandering to and fro
      S.ang += dt * (D.ruck ? 1.3 : 0.5) * (Math.sin(D.t * 0.6) > 0 ? 1 : -1);
      S.ang = Math.max(-0.7, Math.min(0.7, S.ang));
      const q = A.F.xy(Math.sin(S.ang) * D.dist, A.sB + 0.4 + Math.cos(S.ang) * D.dist);
      ziel = [q[0], q[1], Math.max(A.w, GLORTE.gnd(q[0], q[1])) - 0.03];
      S.pose = ziel;
      zug = Math.min(1, D.sp);
      M.pose.visible = false;
      GLSPIEL.set({
        balken: { v: D.sp / 1.05, band: [N.BAND[0] / 1.05, N.BAND[1] / 1.05], rot: D.sp > 0.9 || D.sp < 0.16 },
      });
      if (reel && Math.floor(D.t * 3) !== Math.floor((D.t - dt) * 3)) GLTON.fx('rolle');
      if (D.ruck && !S.ruckWar) GLTON.fx('platsch', D.dist, 60);
      S.ruckWar = D.ruck;
      if (st === 'gelandet') gelandet();
      else if (st === 'riss') {
        GLTON.fx('schlag');
        aus('Die Schnur ist gerissen. Der ' + S.f.name + ' schwimmt mit dem Haken davon.');
      } else if (st === 'ab') aus('Ausgeschlitzt – der ' + S.f.name + ' ist weg.');
    } else if (S.ph === 'fang') {
      // the catch hangs on the line for a moment
      const tip = A.F.P(0.5, A.sB + 1.2, A.z + 2.0);
      ziel = [tip[0], tip[1], tip[2] - 0.5];
      heb = 0.6;
      M.fisch.visible = S.t < 3.2;
      if (M.fisch.visible) {
        M.fisch.position.set(ziel[0], ziel[2] - 0.5 * M.fisch.scale.x, -ziel[1]);
        M.fisch.rotation.set(Math.PI / 2, 0, S.t * 1.4);
      }
    } else if (S.ph === 'leer') {
      ziel = [end[0] + Math.sin(A.hd) * 1.2, end[1] + Math.cos(A.hd) * 1.2, A.z + 0.9];
      heb = 0.5;
      M.pose.visible = false;
    }
    if (S.ph !== 'fang') M.fisch.visible = false;
    stellen(zug, ziel, heb);
    if (M.pose.visible) M.pose.position.set(ziel[0], ziel[2], -ziel[1]);
    markDirty();
  }
  function ende() {
    if (!S.on) return;
    S.on = false;
    S.ph = '';
    window.removeEventListener('keydown', onKey, true);
    window.removeEventListener('keyup', onKey, true);
    GLSPIEL.hide();
    const M = S.meshes;
    if (M) for (const m of [M.rute, M.pose, M.fisch, M.schnur]) m.visible = false;
    const res = S.res,
      f = S.fang || null;
    S.res = null;
    GL.save();
    if (PLAY.seat && PLAY.seat.kind === 'gl-angeln') PLAY.stand(true);
    if (res) res(f);
    markDirty();
  }
  // which bait: asked when none is named
  async function wahl() {
    const have = Object.keys(N.KOEDER).filter(k => koederN(k) > 0);
    if (!have.length) {
      PLAY.think('Kein Köder. Mais, Würmer und Blinker hat der Verkaufswagen am Anger.', 4200);
      return null;
    }
    // what takes this bait best at this month and hour
    const jetzt = k => {
      const W = N.biss(monat(), stunde(), k),
        top = Object.keys(W).sort((a, b) => W[b] - W[a])[0];
      return W[top] >= 0.5 ? 'jetzt am ehesten: ' + N.FISCH[top].name : 'gerade beißt darauf wenig';
    };
    const opts = have.map(k => ({ t: N.KOEDER[k] + ' (' + koederN(k) + ')', s: jetzt(k) }));
    opts.push({ t: 'Lieber nicht' });
    const i = await GLHUD.wahl(
      'Angeln an der Talsperre',
      (GL.has('angelkarte')
        ? 'Die Gastkarte steckt in der Tasche.'
        : 'Ohne Gastkarte – wer erwischt wird, hat Ärger.') + ' Womit?',
      opts
    );
    return i >= 0 && i < have.length ? have[i] : null;
  }
  async function angeln(koeder, o = {}) {
    if (S.on || !GL.on || !GLORTE.built || PLAY.seated()) return null;
    bauen();
    if (!S.meshes) return null;
    if (!koeder) koeder = await wahl();
    if (!koeder || S.on || !GL.on) return null;
    if (!(koederN(koeder) > 0)) {
      PLAY.think('Kein Köder.', 2000);
      return null;
    }
    const A = GLORTE.AN,
      sitz = A.F.xy(0.22, A.sB - 0.62);
    Object.assign(S, {
      on: true,
      koeder,
      o,
      seed: (o.seed ?? Math.floor(Math.random() * 1e9)) >>> 0,
      n: 0,
      fang: null,
      letzter: '',
      reel: false,
      ruckWar: false,
    });
    PLAY.sit({
      kind: 'gl-angeln',
      x: sitz[0],
      y: sitz[1],
      eye: A.z + 1.2,
      yaw: (A.hd * 180) / Math.PI,
      pitch: -9,
      keepKeys: true,
      primary,
      // (the panel has the buttons; the game's own stay away, E and Q work all the same)
      primaryLabel: () => '',
      leaveLabel: '',
      onLeave: ende,
    });
    window.addEventListener('keydown', onKey, true);
    window.addEventListener('keyup', onKey, true);
    GLSPIEL.show({ titel: 'Angeln' }, taste);
    const pr = new Promise(res => {
      S.res = res;
    });
    auswerfen();
    return pr;
  }
  const stand = () => ({
    on: S.on,
    ph: S.ph,
    t: S.t,
    koeder: S.koeder,
    w: S.w,
    f: S.f,
    D: S.D ? { dist: S.D.dist, sp: S.D.sp, st: S.D.st, t: S.D.t } : null,
    letzter: S.letzter,
  });
  GLORTE.hook({
    build() {
      KERN.act({
        id: 'gl:angeln',
        r: 2.2,
        prio: 0.3,
        label: () => (GL.on && P.mode === 'walk' && !S.on && !PLAY.seated() && GL.era === 'heute' ? 'Angeln' : null),
        pos: () => [GLORTE.P.angel[0], GLORTE.P.angel[1], GLORTE.AN.z + 1],
        run: () => {
          angeln();
        },
      });
    },
    drop() {
      KERN.unact('gl:angeln');
      if (S.on) ende();
      weg();
    },
    tick,
    era: e => {
      if (S.on && e !== 'heute') ende();
    },
  });
  return Object.assign(S, { angeln, anhieb, kurbel, taste, stand });
})();
window.GLANGELN = GLANGELN;
