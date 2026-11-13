// ===================== feat/grenzland-welt: things that happen on the way (GLEREIGNIS) – one at a time, in free play =====================
// GTA's random events, from the region: every few minutes of driving (GLLOGIK.plan – pure, unit-tested), never while a mission runs,
// never in 1989, each where it fits, each with a point on the radar (GLKARTE.src), a small reward or consequence, cleared away when it is
// over or left behind (and with „Beenden“):
//   blitzer      a mobile speed camera in a parked estate at the roadside: past it faster than 50 km/h – a white flash, and a minute
//                later a letter in the phone (30 €)
//   traktorstau  a tractor of the agricultural cooperative with a trailer of straw bales crawling along the road (built here of the
//                props kit and driven along the road's line), two cars queueing behind it and honking; overtake it, or wait
//   kirmes       the fair on the Anger: the Kirmesbaum, a stall with Rostbratwurst (3 €), two young people of the fair, a polka
//   korso        a wedding convoy – four cars with white bows, honking through the town; who follows it a while gets a tenner from the
//                bride's father
//   boeller      a man sells bangers out of season from the boot of his car (5 € for three) – „Knallkörper im September“
//   wildunfall   at dusk a deer crosses the country road ahead: brake, or it bumps the vehicle and runs off into the wood (no harm)
// The people are figures of grenzland/gl_fig.js (their cast and clothes are added to GLDATA at load – nothing of the lead's data
// changes), the cars of grenzland/gl_auto.js, the props merged meshes in the traffic's material (no new shader program, no lamp).
//   GLEREIGNIS.start(name) · stop() · aktiv() → name | '' · linien() → [[who, text], …] · debug.start(name) (tests: at the player)
//   The radar gets { x, y, k: 'ereignis', name } (the lead's radar draws its own sign for it).
import * as THREE from 'three';
import { scene } from '../core/head.js';
import { KERN } from '../core/kern.js';
import { markDirty } from '../core/assets.js';
import { P } from '../game/walkable.js';
import { PLAY } from '../game/play.js';
import { VEH } from '../vehicles/vehicle.js';
import { VPROPS } from '../world/village_props.js';
import { VFIG } from '../verkehr/verkehr_fig.js';
import { VAUTO } from '../verkehr/verkehr_auto.js';
import { VNETZ } from '../verkehr/verkehr_netz.js';
import { WCOL } from '../world/worldcol.js';
import { STIMME } from '../audio/stimme.js';
import { GLLOGIK } from './gl_logik.js';
import { GLDATA } from './gl_data.js';
import { GL } from './gl_state.js';
import { GLTON } from './gl_ton.js';
import { GLFIG } from './gl_fig.js';
import { GLAUTO } from './gl_auto.js';
import { GLHUD } from './gl_hud.js';
import { GLKARTE } from './gl_karte.js';
import { GLHANDY } from './gl_handy.js';
import { GLFAHNDUNG } from './gl_fahndung.js';
import { GLORTE } from './gl_orte.js';
import { GLREAKTION } from './gl_reaktion.js';
export const GLEREIGNIS = (() => {
  const S = {
    E: null, // the event that runs: { name, def, x, y, hd, t, cars, figs, meshes, ... }
    plan: GLLOGIK.planNeu(),
    planT: 0,
    uhr: 0, // seconds of play (the plan's clock)
    blitz: null, // the white flash (a page element)
    briefe: [], // letters to come: { t, von, text, geld, why }
    err: null,
    n: {}, // events started, by name
    ende: {}, // how they ended, by name
  };
  const hyp = Math.hypot;
  const L = (r, g, b) => [Math.pow(r / 255, 2.2), Math.pow(g / 255, 2.2), Math.pow(b / 255, 2.2)];
  const rnd = a => a[Math.floor(Math.random() * a.length)];
  // ---- the people of the events: cast and clothes added to the mode's data (only if not there already) ----
  const KLEID = {
    el_ballonseide: { ober: [92, 50, 120], oberM: 'streifen', unter: [40, 96, 112], schuh: [230, 230, 226], arm: true },
    el_wirt: { ober: [238, 236, 230], unter: [52, 52, 56], schuh: [30, 30, 30], rock: 0.38, arm: false },
    el_bursche: { ober: [240, 240, 236], unter: [26, 26, 30], schuh: [20, 20, 20], arm: true, kragen: [30, 30, 34] },
    el_maedchen: {
      ober: [176, 40, 54],
      oberM: 'blumen',
      unter: [176, 40, 54],
      schuh: [40, 30, 26],
      rock: 0.5,
      arm: false,
    },
  };
  const CAST = {
    boellermann: {
      name: 'Der Böller-Mann',
      fig: 'vk_m11',
      clips: 'm',
      h: 1.77,
      kleid: 'el_ballonseide',
      hut: 'basecap',
      voice: { g: 'm', age: 47 },
    },
    wirt: { name: 'Bratwurst-Uwe', fig: 'vk_m16', clips: 'm', h: 1.8, kleid: 'el_wirt', voice: { g: 'm', age: 56 } },
    bursche: {
      name: 'Kirmesbursche',
      fig: 'vk_m02',
      clips: 'm',
      h: 1.82,
      kleid: 'el_bursche',
      voice: { g: 'm', age: 21 },
    },
    maedchen: {
      name: 'Kirmesmädchen',
      fig: 'vk_f07',
      clips: 'f',
      h: 1.68,
      kleid: 'el_maedchen',
      voice: { g: 'f', age: 20 },
    },
  };
  for (const [k, v] of Object.entries(KLEID)) if (GLDATA.KLEID && !GLDATA.KLEID[k]) GLDATA.KLEID[k] = v;
  for (const [k, v] of Object.entries(CAST)) if (!GLDATA.CAST[k]) GLDATA.CAST[k] = v;
  // (they notice the player and can be answered like the mode's own people: grenzland/gl_reaktion.js)
  if (GLREAKTION.REDNER) for (const k of Object.keys(CAST)) GLREAKTION.REDNER.add(k);
  // what they say (fixed lines: `stimmen` records them – linien())
  const SAGT = {
    boellermann: {
      hallo: 'Psst. Böller? Beste Qualität. Hast du nicht von mir.',
      kauf: 'Drei Stück, fünf Euro. Und nicht vor Silvester zünden. Haha.',
      haube: 'Eine Sturmhaube gibt es gratis dazu. Für den Winter. Oder für was auch immer.',
      weg: 'Ich bin dann mal weg. Die Polizei mag keine Kofferraumgeschäfte.',
    },
    wirt: {
      hallo: 'Rostbratwurst! Frisch vom Rost, mit Senf, drei Euro!',
      kauf: 'Mit Senf. Natürlich mit Senf. Alles andere wäre eine Beleidigung.',
    },
    bursche: { hallo: 'Kirmes ist nur einmal im Jahr! Komm, tanz mit!' },
    maedchen: { hallo: 'Hast du den Kirmesbaum gesehen? Den haben wir die ganze Nacht bewacht.' },
  };
  const TX = {
    blitzer: 'Blitzer',
    blitzerSub: 'Mobile Geschwindigkeitsmessung',
    geblitzt: kmh => 'Geblitzt! ' + kmh + ' km/h, erlaubt sind 50.',
    brav: 'Am Blitzer vorbei mit Tempo 50. Vorbildlich.',
    brief: (kmh, ort) =>
      'Verwarnungsgeld: ' +
      kmh +
      ' km/h statt 50 km/h bei ' +
      ort +
      '. 30 € wurden abgebucht. Das Foto ist übrigens gut geworden.',
    briefVon: 'Bußgeldstelle',
    stau: 'Traktorstau',
    stauSub: 'Die Agrargenossenschaft fährt Stroh ein',
    ueberholt: 'Überholt. Der Traktorfahrer tippt sich an die Mütze.',
    kirmes: 'Kirmes in Ratscher',
    kirmesSub: 'Mit Kirmesbaum, Rostbratwurst und Blasmusik',
    wurst: 'Rostbratwurst kaufen (3 €)',
    korso: 'Hochzeitskorso',
    korsoSub: 'Hupen erlaubt, heute jedenfalls',
    korsoLohn: 'Der Brautvater drückt dir einen Zehner in die Hand: „Für den Sprit!“',
    boeller: 'Böller aus dem Kofferraum',
    boellerSub: 'Knallkörper im September',
    kaufen: 'Böller kaufen (3 für 5 €)',
    wild: 'Wildwechsel',
    wildSub: 'Achtung, Rehe auf der Fahrbahn',
    gebremst: 'Gerade noch gebremst. Das Reh schaut beleidigt und trabt in den Wald.',
    rums: 'Rums! Das Reh rappelt sich auf und springt davon. Glück gehabt – ihr beide.',
    kein: 'Dafür reicht das Geld nicht.',
  };
  const heute = () => GL.on && GL.era === 'heute';
  const where = () => {
    const v = VEH.cur;
    return v
      ? { x: v.st.x, y: v.st.y, hd: v.st.psi, v: hyp(v.st.u, v.st.v) }
      : { x: P.x, y: P.y, hd: (P.yaw * Math.PI) / 180, v: P.speed || 0 };
  };
  // ---- the roads: the nearest road point (with its direction) of the network the police use there ----
  function strasse(x, y, max = 60) {
    const N = GLFAHNDUNG.netz(x, y);
    if (!N) return null;
    const A = N.nah(x, y, max, e => (e.kind ?? 3) <= 4);
    return A ? Object.assign(A, { N, hd: Math.atan2(A.dx, A.dy) }) : null;
  }
  // a road point ahead of the player (d0 … d1 metres along his way)
  function vorn(d0, d1) {
    const p = where();
    for (let d = d0; d <= d1; d += 20) {
      const A = strasse(p.x + Math.sin(p.hd) * d, p.y + Math.cos(p.hd) * d, 40);
      if (A && hyp(A.x - p.x, A.y - p.y) > d0 * 0.7) {
        // the way he goes along it
        if (Math.cos(A.hd - p.hd) < 0) A.hd += Math.PI;
        A.dx = Math.sin(A.hd);
        A.dy = Math.cos(A.hd);
        return A;
      }
    }
    return null;
  }
  // beside the road, on the right (as one drives): off metres
  const rechts = (A, off) => [A.x + A.dy * off, A.y - A.dx * off];
  // ---- a free place: off the roads (2.5 m from their edge), not indoors, no wall or trunk within r metres (world/worldcol.js) ----
  function frei(x, y, r) {
    try {
      const s = KERN.surface(x, y);
      if (s && s.kind <= 7 && s.e > -2.5) return false;
      if (KERN.inside(x, y, (KERN.ground(x, y) || 0) + 1)) return false;
    } catch (e) {}
    // (the walls' segments [x1, y1, x2, y2] and the trunks [x, y, r] of the grid cells near: measured, not just found)
    let hit = false;
    try {
      if (WCOL && WCOL.ready)
        WCOL.each(
          x - r,
          y - r,
          x + r,
          y + r,
          (k, A) => {
            if (hit) return;
            const ax = A[k * 4],
              ay = A[k * 4 + 1],
              dx = A[k * 4 + 2] - ax,
              dy = A[k * 4 + 3] - ay,
              l2 = dx * dx + dy * dy || 1e-9,
              u = Math.max(0, Math.min(1, ((x - ax) * dx + (y - ay) * dy) / l2));
            if (hyp(x - ax - dx * u, y - ay - dy * u) < r) hit = true;
          },
          (k, A) => {
            if (!hit && A[k * 3 + 2] > 0 && hyp(A[k * 3] - x, A[k * 3 + 1] - y) < Math.min(r, 6)) hit = true;
          }
        );
    } catch (e) {}
    return !hit;
  }
  function freierPlatz(cx, cy, r, weg) {
    for (const d of [0, 6, 10, 14, 18, 24, 30, 38, 46])
      for (let i = 0; i < (d ? 12 : 1); i++) {
        const a = (i / 12) * Math.PI * 2,
          x = cx + Math.sin(a) * d,
          y = cy + Math.cos(a) * d;
        if (weg && hyp(x - weg[0], y - weg[1]) < weg[2]) continue;
        if (frei(x, y, r)) return [x, y];
      }
    return null;
  }
  // ---- props: merged meshes in the traffic's material ----
  function mesh(build, x, y, hd, z) {
    const K = VPROPS.kit();
    build(K);
    const m = new THREE.Mesh(K.geo(), VFIG.mat());
    m.userData.noMerge = true;
    m.castShadow = false;
    m.position.set(x, z ?? KERN.ground(x, y) ?? 0, -y);
    m.rotation.y = -(hd || 0);
    m.name = 'grenzland ereignis';
    scene.add(m);
    return m;
  }
  function figur(E, id, x, y, hd, then) {
    const gen = E.gen;
    GLFIG.make(id, { era: 'heute' }).then(F => {
      if (!F) return;
      if (S.E !== E || E.gen !== gen || !GL.on) return GLFIG.drop(F);
      F.knows = false;
      F.sees = true;
      F.r = 30;
      F.ereignis = E.name;
      GLFIG.place(F, x, y, hd);
      E.figs.push(F);
      if (then) then(F);
    });
  }
  function auto(E, typ, o) {
    const c = GLAUTO.spawn(typ, o || {});
    if (c) {
      c.ereignis = E.name;
      E.cars.push(c);
    }
    return c;
  }
  function sag(F, text) {
    if (!F || F.gone) return;
    GLHUD.sub(F.name, text, Math.max(2400, text.length * 62));
    try {
      GLFIG.talking(F, true);
      setTimeout(() => !F.gone && GLFIG.talking(F, false), Math.max(1800, text.length * 60));
    } catch (e) {}
    try {
      STIMME.say('gl_' + F.id, text, { at: [F.x, F.y] });
    } catch (e) {}
  }
  // a line on a road: from where the car stands, the way it faces, to a point further on
  function linie(A, weit) {
    const N = A.N;
    if (!N) return null;
    // (as far as the network goes: shorter if the far point is off it)
    for (const w of [weit, weit * 0.6, weit * 0.35]) {
      const B = strasse(A.x + Math.sin(A.hd) * w, A.y + Math.cos(A.hd) * w, 120);
      if (!B) continue;
      const R = N.linie({ x: A.x, y: A.y, hd: A.hd }, [B.x, B.y], { k: 1, aLat: 3.3, vEnd: 0 });
      if (R && R.line && R.line.L > 60) return R.line;
    }
    return null;
  }
  // ------------------------------------------------------------------ the events ------------------------------------------------------------------
  const DEF = {
    // ---- a mobile speed camera: an estate at the roadside, the camera on its tripod beside it ----
    blitzer: {
      titel: TX.blitzer,
      sub: TX.blitzerSub,
      radar: 'Blitzer',
      wo: () => vorn(110, 260),
      start(E, A) {
        const [x, y] = rechts(A, 4.6);
        const c = auto(E, 'kombi', { col: '#5b6066' });
        if (c) GLAUTO.park(c, x, y, A.hd);
        const [tx, ty] = rechts(A, 2.6);
        E.meshes.push(
          mesh(
            K => {
              const dk = L(28, 28, 30),
                gr = L(70, 72, 76);
              for (const a of [0, 2.1, 4.2]) K.box(Math.sin(a) * 0.22, Math.cos(a) * 0.22, 0, 0.03, 0.03, 0.95, a, dk);
              K.box(0, 0, 0.92, 0.36, 0.26, 0.24, 0, gr);
              K.box(0, -0.14, 0.97, 0.12, 0.04, 0.12, 0, dk);
              K.disc(0, -0.165, 1.03, 0, -1, 0.045, L(150, 160, 190), 12);
              K.box(0.12, -0.14, 1.12, 0.1, 0.04, 0.06, 0, L(200, 40, 30));
            },
            tx,
            ty,
            A.hd
          )
        );
        E.x = tx;
        E.y = ty;
        E.dir = A.hd;
        E.blitzAn = [tx, ty];
      },
      tick(E, dt, p) {
        const d = hyp(p.x - E.x, p.y - E.y);
        if (!E.vorbei && VEH.cur && d < 16) {
          E.vorbei = true;
          const kmh = Math.round(p.v * 3.6);
          if (p.v > 13.9) {
            blitzen();
            GLTON.fx('foto');
            PLAY.think(TX.geblitzt(kmh), 3400);
            const ort = hyp(E.x + 1340, E.y - 1243) < 900 ? 'Schleusingen' : 'Ratscher';
            S.briefe.push({ t: 60, von: TX.briefVon, text: TX.brief(kmh, ort), geld: 30, why: 'Verwarnungsgeld' });
            E.ende = 'geblitzt';
            GL.emit('geblitzt', { kmh });
          } else {
            PLAY.think(TX.brav, 2600);
            E.ende = 'brav';
          }
        }
        if (E.vorbei && d > 260) return true;
        return E.t > 300;
      },
    },
    // ---- a tractor with a trailer of straw crawling along the road, two cars behind it, honking ----
    traktorstau: {
      titel: TX.stau,
      sub: TX.stauSub,
      radar: 'Traktor',
      wo: () => vorn(170, 320),
      start(E, A) {
        const line = linie(A, 700);
        E.x = A.x;
        E.y = A.y;
        if (!line) return false;
        E.line = line;
        E.s = 40;
        E.v = 4;
        E.zug = mesh(traktor, A.x, A.y, A.hd);
        E.anh = mesh(haenger, A.x, A.y, A.hd);
        E.meshes.push(E.zug, E.anh);
        // solid for the player's vehicle and the walker, as the mode's cars are (vehicles/vehicle.js VEH.extra)
        E.boxes = [
          { q: E.zug, ey: 1.9, ex: 1.05, cy: 0.9 },
          { q: E.anh, ey: 2.5, ex: 1.15, cy: -3.4 },
        ].map(b => ({
          box: () => {
            const m = b.q,
              hd = -m.rotation.y;
            return m.parent
              ? {
                  c: [m.position.x + Math.sin(hd) * b.cy, -m.position.z + Math.cos(hd) * b.cy],
                  ax: [Math.cos(hd), -Math.sin(hd)],
                  ay: [Math.sin(hd), Math.cos(hd)],
                  ex: b.ex,
                  ey: b.ey,
                  z0: m.position.y,
                  z1: m.position.y + 2.4,
                }
              : null;
          },
          grenzland: { ereignis: true },
        }));
        if (VEH.extra) VEH.extra.push(...E.boxes);
        const a = auto(E, 'trabant', { col: '#d8d2bf' }),
          b = auto(E, 'kombi', { col: '#7a2a2a' });
        E.row = [a, b].filter(Boolean);
        E.row.forEach((c, i) => GLAUTO.onLine(c, line, E.s - 15 - i * 11, 4));
        E.hornT = 2;
        zugSetzen(E);
      },
      tick(E, dt, p) {
        // the tractor: 19 km/h, a gentle start
        E.v = Math.min(5.2, E.v + dt * 0.8);
        E.s = Math.min(E.line.L - 2, E.s + E.v * dt);
        zugSetzen(E);
        const tail = E.tail;
        E.row.forEach((c, i) => {
          const ahead = i ? E.row[i - 1] : null;
          GLAUTO.drive(c, dt, {
            vmax: 12,
            k: 1,
            halt: [ahead ? { x: ahead.x, y: ahead.y, r: 0.6, gap: 3.5 } : { x: tail[0], y: tail[1], r: 0.6, gap: 3 }],
          });
          c.horn = false;
        });
        if ((E.hornT -= dt) <= 0) {
          E.hornT = 3 + Math.random() * 5;
          E.hupe = E.row[Math.floor(Math.random() * E.row.length)];
          E.hupeT = 0.6;
        }
        if (E.hupe && (E.hupeT -= dt) > 0) E.hupe.horn = true;
        // overtaken: he is ahead of the tractor on its way
        const along = (p.x - E.x) * Math.sin(E.hd) + (p.y - E.y) * Math.cos(E.hd);
        if (!E.vorbei && VEH.cur && along > 6 && hyp(p.x - E.x, p.y - E.y) < 30) {
          E.vorbei = true;
          E.ende = 'ueberholt';
          PLAY.think(TX.ueberholt, 3000);
        }
        return E.s >= E.line.L - 3 || E.t > 240 || (E.vorbei && hyp(p.x - E.x, p.y - E.y) > 220);
      },
    },
    // ---- the fair on the Anger ----
    kirmes: {
      titel: TX.kirmes,
      sub: TX.kirmesSub,
      radar: 'Kirmes',
      wo: () => {
        const p = where(),
          a = GLDATA.ORTE.anger.pos,
          L0 = (GLDATA.ORTE.linde && GLDATA.ORTE.linde.pos) || [213.5, -112.5];
        if (hyp(p.x - a[0], p.y - a[1]) > 700) return null;
        // on the green by the Anger: room for the tree, the stall and a bench (9 m free all round), not under the Linde's crown
        const q = freierPlatz(a[0], a[1], 9, [L0[0], L0[1], 18]) ||
          freierPlatz(a[0], a[1], 6, [L0[0], L0[1], 16]) || [a[0] + 10, a[1] + 8];
        // the stall faces where the player comes from
        return { x: q[0], y: q[1], hd: Math.atan2(p.x - q[0], p.y - q[1]) + Math.PI };
      },
      start(E, A) {
        E.x = A.x;
        E.y = A.y;
        const hd = A.hd;
        // the Kirmesbaum: a tall bare trunk, a green crown of birch, ribbons, a wreath
        E.meshes.push(
          mesh(
            K => {
              // the trunk, peeled, and the green top of the spruce left on it (a cone of three tiers)
              K.cyl(0, 0, 0, 14, 0.17, 0.08, 10, L(196, 168, 126));
              for (const [z0, z1, r] of [
                [12.6, 14.6, 1.25],
                [14.0, 15.8, 0.9],
                [15.3, 17.0, 0.55],
              ])
                K.cyl(0, 0, z0, z1, r, 0.08, 10, L(52, 96, 46), false);
              // the wreath and its ribbons in the colours of the fair
              K.cyl(0, 0, 10.2, 10.55, 1.05, 1.05, 18, L(66, 112, 52), false);
              const C = [L(220, 40, 40), L(244, 244, 240), L(40, 90, 200), L(240, 200, 40)];
              for (let i = 0; i < 12; i++) {
                const a = (i / 12) * Math.PI * 2;
                K.box(Math.sin(a) * 1.02, Math.cos(a) * 1.02, 7.2, 0.08, 0.02, 3.0, a, C[i % 4]);
              }
            },
            A.x,
            A.y,
            0
          )
        );
        // the stall: counter, posts, a striped roof, a sign
        const sx = A.x + Math.sin(hd + 1.5) * 7,
          sy = A.y + Math.cos(hd + 1.5) * 7;
        E.stand = [sx, sy];
        E.meshes.push(
          mesh(
            K => {
              const wood = L(150, 110, 70),
                red = L(200, 40, 40),
                wh = L(240, 238, 230);
              K.box(0, 0, 0, 3.0, 0.8, 1.05, 0, wood);
              K.box(0, 0, 1.05, 3.1, 0.9, 0.05, 0, L(200, 190, 170));
              for (const [x, y] of [
                [-1.5, -0.45],
                [1.5, -0.45],
                [-1.5, 1.2],
                [1.5, 1.2],
              ])
                K.box(x, y, 0, 0.08, 0.08, 2.4, 0, wood);
              for (let i = 0; i < 6; i++) K.box(-1.35 + i * 0.54, 0.38, 2.4, 0.54, 2.2, 0.06, 0, i % 2 ? wh : red);
              K.box(1.0, -0.05, 1.1, 0.7, 0.4, 0.04, 0, L(40, 40, 40));
              GLORTE.tafelText(K, 'ROSTBRATWURST', [0, -0.52, 2.05], Math.PI, 0.034, wh);
              K.box(0, -0.5, 1.92, 3.0, 0.03, 0.34, 0, red);
            },
            sx,
            sy,
            hd
          )
        );
        // a bench and table of the fair
        E.meshes.push(
          mesh(
            K => {
              const w = L(130, 96, 60);
              K.box(0, 0, 0.7, 2.2, 0.6, 0.05, 0, w);
              K.box(0, 0.75, 0.42, 2.2, 0.26, 0.05, 0, w);
              K.box(0, -0.75, 0.42, 2.2, 0.26, 0.05, 0, w);
              for (const x of [-0.9, 0.9]) {
                K.box(x, 0, 0, 0.06, 0.5, 0.7, 0, w);
                K.box(x, 0.75, 0, 0.06, 0.2, 0.42, 0, w);
                K.box(x, -0.75, 0, 0.06, 0.2, 0.42, 0, w);
              }
            },
            A.x + Math.sin(hd - 1.4) * 6,
            A.y + Math.cos(hd - 1.4) * 6,
            hd
          )
        );
        // bunting from the tree to the stall's roof and to the table (pennants in the fair's colours along a sagging line)
        const tx = A.x + Math.sin(hd - 1.4) * 6,
          ty = A.y + Math.cos(hd - 1.4) * 6;
        E.meshes.push(
          mesh(
            K => {
              const C = [L(220, 40, 40), L(244, 244, 240), L(40, 90, 200), L(240, 200, 40), L(60, 150, 70)];
              const kette = (a, b) => {
                const n = Math.max(6, Math.round(hyp(b[0] - a[0], b[1] - a[1]) / 0.45));
                for (let k = 0; k < n; k++) {
                  const u0 = k / n,
                    u1 = (k + 0.8) / n,
                    P = u => [
                      a[0] + (b[0] - a[0]) * u,
                      a[1] + (b[1] - a[1]) * u,
                      a[2] + (b[2] - a[2]) * u - Math.sin(Math.PI * u) * 0.9,
                    ],
                    p0 = P(u0),
                    p1 = P(u1),
                    m = P((u0 + u1) / 2),
                    tip = [m[0], m[1], m[2] - 0.26],
                    c = C[k % C.length];
                  K.tri(p0, p1, tip, c);
                  K.tri(p1, p0, tip, c);
                }
              };
              const st = [sx - A.x, sy - A.y],
                ta = [tx - A.x, ty - A.y];
              // (in the mesh's own frame: the tree at the origin, the mesh unturned)
              kette([0, 0, 5.2], [st[0] - Math.cos(hd) * 1.5, st[1] + Math.sin(hd) * 1.5, 2.45]);
              kette([0, 0, 5.2], [st[0] + Math.cos(hd) * 1.5, st[1] - Math.sin(hd) * 1.5, 2.45]);
              kette([0, 0, 4.8], [ta[0], ta[1], 1.9]);
              // a pole at the table for its end
              K.cyl(ta[0], ta[1], 0, 2.0, 0.035, 0.03, 6, L(150, 120, 80));
            },
            A.x,
            A.y,
            0
          )
        );
        const sv = [sx - Math.sin(hd) * 0.9, sy - Math.cos(hd) * 0.9];
        figur(E, 'wirt', sx + Math.sin(hd) * 0.9, sy + Math.cos(hd) * 0.9, hd + Math.PI, F => (E.wirt = F));
        figur(E, 'bursche', A.x + 3.2, A.y - 1.5, -1.2, F => (E.bursche = F));
        figur(E, 'maedchen', A.x + 4.1, A.y - 2.6, 2.2, F => (E.maedchen = F));
        E.kauf = sv;
        E.musT = 0;
      },
      tick(E, dt, p) {
        const d = hyp(p.x - E.x, p.y - E.y);
        // the band plays while one is near (bars of a polka on the music bus)
        // (not over the radio of a vehicle he sits in)
        if (d < 90 && !(VEH.cur && GL.radio > 0) && (E.musT -= dt) <= 0)
          E.musT = Math.max(4, GLTON.musik('polka', 8) - 0.2) || 8;
        if (!E.gruss && d < 14) {
          E.gruss = true;
          const F = E.bursche || E.maedchen;
          if (F) sag(F, SAGT[F.id].hallo);
        }
        if (!E.ruf && E.wirt && d < 9) {
          E.ruf = true;
          setTimeout(() => S.E === E && sag(E.wirt, SAGT.wirt.hallo), 2600);
        }
        for (const F of [E.bursche, E.maedchen])
          if (F && !F.gone && F.st !== 'geht' && Math.random() < dt * 0.3)
            GLFIG.face(F, F.x + Math.random() - 0.5, F.y + Math.random() - 0.5);
        return E.t > 420;
      },
    },
    // ---- a wedding convoy: four cars with white bows, honking ----
    korso: {
      titel: TX.korso,
      sub: TX.korsoSub,
      radar: 'Korso',
      wo: () => vorn(60, 180),
      start(E, A) {
        // (they come towards the player: from further on, the other way)
        const B = Object.assign({}, A, { hd: A.hd + Math.PI });
        B.dx = Math.sin(B.hd);
        B.dy = Math.cos(B.hd);
        // (towards him; where the road does not go on behind him, they drive on ahead)
        const line = linie(B, 600) || linie(A, 600);
        E.x = A.x;
        E.y = A.y;
        if (!line) return false;
        const looks = [
          ['wartburg', { col: '#f2f0ea' }],
          ['trabant', { col: '#5d7f9e' }],
          ['kombi', { col: '#2d3a55' }],
          ['trabant_kombi', { col: '#a33a2c' }],
        ];
        E.row = [];
        looks.forEach(([t, o], i) => {
          const c = auto(E, t, o);
          if (!c) return;
          GLAUTO.onLine(c, line, 46 - i * 11, 6);
          // (white ribbons on dark cars, pink ones on light cars; the bride's car with a sign and tin cans behind)
          schleife(c, /^#[def]/i.test(o.col) ? L(236, 140, 172) : L(248, 248, 246), i === 0);
          E.row.push(c);
        });
        E.hornT = 0.5;
        E.folgT = 0;
      },
      tick(E, dt, p) {
        const row = E.row || [];
        if (!row.length) return true;
        row.forEach((c, i) => {
          const ahead = row[i - 1];
          GLAUTO.drive(c, dt, { vmax: 7.5, k: 1, halt: ahead ? [{ x: ahead.x, y: ahead.y, r: 0.6, gap: 4 }] : [] });
        });
        // honking in turns, the leading car most
        if ((E.hornT -= dt) <= 0) {
          E.hornT = 0.4 + Math.random() * 1.6;
          for (const c of row) c.horn = Math.random() < 0.45;
        }
        const L0 = row[0];
        E.x = L0.x;
        E.y = L0.y;
        // who rides along with them a while gets a tenner
        const near = row.some(c => hyp(p.x - c.x, p.y - c.y) < 35);
        if (near && VEH.cur) E.folgT += dt;
        if (!E.lohn && E.folgT > 20) {
          E.lohn = true;
          E.ende = 'lohn';
          GL.earn(10, 'Hochzeitskorso');
          PLAY.think(TX.korsoLohn, 3800);
        }
        if (L0.ende || E.t > 200) {
          for (const c of row) c.horn = false;
          return true;
        }
        return false;
      },
    },
    // ---- bangers out of a car boot ----
    boeller: {
      titel: TX.boeller,
      sub: TX.boellerSub,
      radar: 'Böller',
      wo: () => {
        const p = where();
        for (const d of [45, 70, 30, 100]) {
          const A = strasse(p.x + Math.sin(p.hd) * d, p.y + Math.cos(p.hd) * d, 30);
          if (A) return A;
        }
        return null;
      },
      start(E, A) {
        // (parked on the right of the way he comes)
        const p0 = where();
        if (Math.cos(A.hd - p0.hd) < 0) A.hd += Math.PI;
        A.dx = Math.sin(A.hd);
        A.dy = Math.cos(A.hd);
        const [x, y] = rechts(A, 4.4);
        const c = auto(E, 'kombi', { col: '#3e4a3a' });
        if (c) GLAUTO.park(c, x, y, A.hd);
        // the crates at the open boot, on the pavement side
        const bx = x - Math.sin(A.hd) * 3.2 + Math.cos(A.hd) * 0.9,
          by = y - Math.cos(A.hd) * 3.2 - Math.sin(A.hd) * 0.9;
        E.meshes.push(
          mesh(
            K => {
              const cols = [L(200, 30, 30), L(240, 200, 30), L(40, 120, 200), L(220, 90, 20)];
              for (let i = 0; i < 5; i++)
                K.box(
                  (i % 3) * 0.42 - 0.42,
                  Math.floor(i / 3) * 0.36,
                  0,
                  0.38,
                  0.3,
                  0.26 + (i % 2) * 0.1,
                  0.1 * i,
                  cols[i % 4]
                );
              K.box(0, -0.2, 0.36, 0.5, 0.36, 0.06, 0.2, L(200, 30, 30));
            },
            bx,
            by,
            A.hd
          )
        );
        E.x = bx;
        E.y = by;
        E.kauf = [bx, by];
        // the lid of the boot, up (a dark slab over the rear) – and the man beside his crates, facing the road
        E.meshes.push(
          mesh(
            K => {
              K.box(0, 0, 1.85, 1.3, 0.08, 0.04, 0, L(52, 64, 50));
              K.box(0, 0.02, 1.62, 1.24, 0.03, 0.42, 0, L(40, 48, 40));
            },
            x - Math.sin(A.hd) * 2.55,
            y - Math.cos(A.hd) * 2.55,
            A.hd
          )
        );
        figur(
          E,
          'boellermann',
          bx - Math.sin(A.hd) * 1.0,
          by - Math.cos(A.hd) * 1.0,
          A.hd - Math.PI / 2,
          F => (E.mann = F)
        );
      },
      tick(E, dt, p) {
        const d = hyp(p.x - E.x, p.y - E.y);
        if (!E.gruss && E.mann && d < 10) {
          E.gruss = true;
          sag(E.mann, SAGT.boellermann.hallo);
        }
        if (E.verkauft && (E.wegT = (E.wegT || 0) + dt) > 12 && !E.gesagt) {
          E.gesagt = true;
          sag(E.mann, SAGT.boellermann.weg);
        }
        return E.t > 300 || (E.verkauft && E.wegT > 20);
      },
    },
    // ---- a deer crosses the country road ahead at dusk ----
    wildunfall: {
      titel: TX.wild,
      sub: TX.wildSub,
      radar: 'Reh',
      wo: () => vorn(70, 120),
      start(E, A) {
        // from the left edge of the road to the right, across the player's way
        const [lx, ly] = rechts(A, -9);
        E.weg = [A.dy, -A.dx]; // (to the right)
        E.x = lx;
        E.y = ly;
        E.a = A;
        E.reh = mesh(reh, lx, ly, Math.atan2(E.weg[0], E.weg[1]));
        E.meshes.push(E.reh);
        E.v = 0;
        E.warte = 1.2;
      },
      tick(E, dt, p) {
        const A = E.a,
          m = E.reh;
        // it waits at the edge until he is near, then bounds across
        const dp = hyp(p.x - E.x, p.y - E.y);
        if (E.warte > 0 && dp < 70) E.warte -= dt;
        if (E.warte <= 0) {
          E.v = E.lauf ? 9 : 6.5;
          E.x += E.weg[0] * E.v * dt;
          E.y += E.weg[1] * E.v * dt;
          E.sprung = (E.sprung || 0) + dt * 7;
        }
        const z = KERN.ground(E.x, E.y) || 0;
        m.position.set(E.x, z + Math.abs(Math.sin(E.sprung || 0)) * 0.35, -E.y);
        markDirty();
        // on the road (within 4 m of its middle): did he brake?
        const mitte = Math.abs((E.x - A.x) * E.weg[0] + (E.y - A.y) * E.weg[1]);
        if (!E.lauf && VEH.cur && mitte < 4 && dp < 4.5 && p.v > 5) {
          E.lauf = true;
          E.ende = 'rums';
          GLTON.fx('wurf', 0, 200);
          PLAY.think(TX.rums, 3600);
          GL.emit('wildunfall', { v: p.v });
        } else if (!E.lauf && !E.ende && mitte < 4 && dp < 25 && p.v < 3.5) {
          E.ende = 'gebremst';
          PLAY.think(TX.gebremst, 3200);
        }
        return mitte > 30 || E.t > 60;
      },
    },
  };
  // the tractor and its trailer on the line: the tractor's rear axle at E.s, the trailer's drawbar eye just behind it, the trailer
  // turned along the road behind
  const _p = {},
    _q = {};
  function zugSetzen(E) {
    VNETZ.at(E.line, E.s, _p);
    VNETZ.at(E.line, E.s + 1.2, _q);
    const hd = Math.atan2(_q.x - _p.x, _q.y - _p.y),
      z = KERN.ground(_p.x, _p.y) || 0;
    E.zug.position.set(_p.x, z, -_p.y);
    E.zug.rotation.y = -hd;
    E.x = _p.x;
    E.y = _p.y;
    E.hd = hd;
    const ex = _p.x - Math.sin(hd) * 0.9,
      ey = _p.y - Math.cos(hd) * 0.9;
    VNETZ.at(E.line, Math.max(0, E.s - 4.3), _q);
    const ha = Math.atan2(ex - _q.x, ey - _q.y);
    E.anh.position.set(ex, KERN.ground(ex, ey) || z, -ey);
    E.anh.rotation.y = -ha;
    E.tail = [ex - Math.sin(ha) * 5.7, ey - Math.cos(ha) * 5.7];
    markDirty();
  }
  // a tractor of the East (after the Fortschritt ZT 300: the red bonnet, the big rear wheels, an open cab) – kit frame: x right, y
  // ahead, z up; the rear axle at the origin
  function traktor(K) {
    const rot = L(178, 40, 30),
      dk = L(28, 28, 30),
      grau = L(96, 98, 100),
      fel = L(196, 174, 70),
      R = GLORTE.rolle;
    for (const s of [-1, 1]) {
      R(K, [s * 0.6, 0, 0.74], [s * 1.0, 0, 0.74], 0.74, dk, 16);
      R(K, [s * 0.58, 0, 0.74], [s * 0.6, 0, 0.74], 0.44, fel, 12);
      R(K, [s * 0.52, 2.3, 0.44], [s * 0.8, 2.3, 0.44], 0.44, dk, 12);
      R(K, [s * 0.5, 2.3, 0.44], [s * 0.52, 2.3, 0.44], 0.24, fel, 10);
      K.box(s * 0.8, 0, 1.4, 0.46, 1.3, 0.06, 0, rot);
    }
    K.box(0, 1.45, 0.62, 0.78, 2.0, 0.8, 0, rot);
    K.box(0, 2.46, 0.66, 0.7, 0.04, 0.72, 0, dk);
    K.box(0, 0.05, 0.55, 1.1, 0.9, 0.4, 0, grau);
    for (const [x, y] of [
      [-0.62, -0.42],
      [0.62, -0.42],
      [-0.62, 0.5],
      [0.62, 0.5],
    ])
      K.box(x, y, 0.95, 0.05, 0.05, 1.55, 0, dk);
    K.box(0, 0.04, 2.5, 1.36, 1.05, 0.07, 0, rot);
    K.box(0, -0.12, 0.95, 0.5, 0.45, 0.42, 0, dk);
    K.cyl(0.28, 1.9, 1.42, 2.6, 0.045, 0.04, 8, dk, true);
    K.box(0, -0.72, 0.5, 0.14, 0.5, 0.1, 0, grau);
  }
  // its trailer with straw bales – the drawbar eye at the origin, the bed behind it
  function haenger(K) {
    const gr = L(72, 104, 66),
      dk = L(28, 28, 30),
      holz = L(150, 116, 80),
      stroh = L(216, 188, 112);
    K.box(0, -0.6, 0.5, 0.1, 1.2, 0.08, 0, dk);
    K.box(0, -3.4, 0.95, 2.2, 4.4, 0.12, 0, holz);
    for (const s of [-1, 1]) K.box(s * 1.08, -3.4, 1.07, 0.05, 4.4, 0.5, 0, gr);
    K.box(0, -5.58, 1.07, 2.2, 0.05, 0.5, 0, gr);
    K.box(0, -1.22, 1.07, 2.2, 0.05, 0.5, 0, gr);
    for (const y of [-2.1, -4.6])
      for (const s of [-1, 1]) GLORTE.rolle(K, [s * 0.78, y, 0.46], [s * 1.06, y, 0.46], 0.46, dk, 12);
    for (let i = 0; i < 4; i++)
      for (let j = 0; j < 2; j++)
        for (let l = 0; l < 2; l++) K.box(-0.5 + j * 1.0, -1.8 - i * 1.05, 1.07 + l * 0.48, 0.95, 1.0, 0.46, 0, stroh);
  }
  // a deer of boxes (it is seen at dusk and from a vehicle): body, legs, neck, head with ears, the white rump
  function reh(K) {
    const b = L(122, 84, 52),
      dk = L(70, 48, 30),
      w = L(232, 226, 214);
    K.box(0, 0, 0.62, 0.3, 0.95, 0.34, 0, b);
    for (const [x, y] of [
      [-0.1, 0.36],
      [0.1, 0.36],
      [-0.1, -0.36],
      [0.1, -0.36],
    ])
      K.box(x, y, 0, 0.05, 0.05, 0.64, 0, dk);
    K.box(0, 0.52, 0.86, 0.11, 0.14, 0.38, 0, b);
    K.box(0, 0.62, 1.16, 0.13, 0.26, 0.13, 0, b);
    K.box(0, 0.76, 1.14, 0.07, 0.08, 0.07, 0, dk);
    K.box(-0.07, 0.56, 1.26, 0.03, 0.05, 0.12, 0, b);
    K.box(0.07, 0.56, 1.26, 0.03, 0.05, 0.12, 0, b);
    K.box(0, -0.49, 0.72, 0.2, 0.04, 0.2, 0, w);
  }
  // a wedding car: white ribbons from both mirrors down to a bow on the front of the bonnet, a little bouquet in it
  function schleife(c, w, braut) {
    const T = c.T || {},
      h = T.h || 1.45,
      hw = T.hw || 0.8,
      yf = T.yf ?? 2.0,
      yr = T.yr ?? -2.0,
      K = VPROPS.kit();
    const band = (a, b, br) => {
      const dx = b[0] - a[0],
        dy = b[1] - a[1],
        l = hyp(dx, dy) || 1,
        px = (-dy / l) * br,
        py = (dx / l) * br;
      const q = [
        [a[0] + px, a[1] + py, a[2]],
        [a[0] - px, a[1] - py, a[2]],
        [b[0] - px, b[1] - py, b[2]],
        [b[0] + px, b[1] + py, b[2]],
      ];
      K.quad(q[0], q[1], q[2], q[3], w);
      K.quad(q[3], q[2], q[1], q[0], w);
    };
    const front = [0, yf - 0.32, h * 0.6 + 0.03];
    for (const s of [-1, 1]) band([s * (hw + 0.04), yf - 1.55, h * 0.72], [s * 0.05, front[1], front[2]], 0.035);
    // the bow: two loops and two tails
    for (const s of [-1, 1]) {
      K.box(s * 0.11, front[1], front[2] + 0.04, 0.2, 0.05, 0.1, s * 0.5, w);
      band([s * 0.03, front[1] + 0.02, front[2]], [s * 0.2, front[1] + 0.22, front[2] - 0.04], 0.025);
    }
    K.box(0, front[1], front[2] + 0.03, 0.07, 0.07, 0.08, 0, w);
    for (const [x, y, col] of [
      [-0.05, -0.08, L(220, 60, 90)],
      [0.05, -0.08, L(240, 200, 220)],
      [0, -0.14, L(90, 150, 70)],
    ])
      K.box(x, front[1] + y, front[2] + 0.02, 0.07, 0.07, 0.07, 0.4, col);
    if (braut) {
      // the sign on the boot lid, and tin cans on strings behind
      const wb = L(250, 250, 248),
        red = L(200, 30, 50),
        y0 = yr + 0.12,
        z0 = h * 0.62;
      K.box(0, y0 + 0.02, z0, 1.12, 0.02, 0.15, 0, wb);
      GLORTE.tafelText(K, 'FRISCH VERHEIRATET', [0, y0, z0 + 0.075], Math.PI, 0.0095, red);
      for (let i = 0; i < 5; i++) {
        const x = -0.5 + i * 0.25,
          y = yr - 0.9 - (i % 2) * 0.35;
        K.cyl(x, y, 0.02, 0.15, 0.045, 0.045, 8, L(176, 180, 186), true);
        const a = [x * 0.5, yr + 0.02, 0.32],
          b = [x, y + 0.04, 0.12];
        K.quad(
          [a[0] - 0.006, a[1], a[2]],
          [a[0] + 0.006, a[1], a[2]],
          [b[0] + 0.006, b[1], b[2]],
          [b[0] - 0.006, b[1], b[2]],
          L(220, 220, 214)
        );
        K.quad(
          [b[0] - 0.006, b[1], b[2]],
          [b[0] + 0.006, b[1], b[2]],
          [a[0] + 0.006, a[1], a[2]],
          [a[0] - 0.006, a[1], a[2]],
          L(220, 220, 214)
        );
      }
    }
    const m = new THREE.Mesh(K.geo(), VFIG.mat());
    m.userData.noMerge = true;
    m.castShadow = false;
    c.g.add(m);
    c.schleife = m;
  }
  // the white flash of the camera over the picture (a page element: nothing of the renderer changes)
  function blitzen() {
    try {
      if (!S.blitz) {
        const d = document.createElement('div');
        d.id = 'glblitzer';
        d.style.cssText =
          'position:absolute;inset:0;z-index:8;pointer-events:none;background:#fff;opacity:0;transition:opacity .45s ease-out';
        (document.getElementById('stage') || document.body).appendChild(d);
        S.blitz = d;
      }
      const d = S.blitz;
      d.style.transition = 'none';
      d.style.opacity = '0.92';
      void d.offsetWidth;
      d.style.transition = 'opacity .45s ease-out';
      d.style.opacity = '0';
    } catch (e) {}
  }
  // ------------------------------------------------------------------ running one ------------------------------------------------------------------
  let gen = 0;
  function start(name, o = {}) {
    const def = DEF[name];
    if (!def || !heute()) return false;
    if (S.E) stop('neu');
    const A = o.at || def.wo();
    if (!A) return false;
    const E = (S.E = {
      name,
      def,
      gen: ++gen,
      x: A.x,
      y: A.y,
      hd: A.hd || 0,
      t: 0,
      cars: [],
      figs: [],
      meshes: [],
      fern: 0,
    });
    let ok = true;
    try {
      ok = def.start(E, A) !== false;
    } catch (e) {
      S.err = name + ': ' + String((e && e.message) || e).slice(0, 200);
      ok = false;
    }
    if (!ok) {
      stop('fehler');
      return false;
    }
    S.n[name] = (S.n[name] || 0) + 1;
    try {
      GLHUD.ort(def.titel, def.sub, 4);
    } catch (e) {}
    GL.emit('ereignis', { name, x: Math.round(E.x), y: Math.round(E.y) });
    markDirty(true);
    return true;
  }
  // everything of it away
  function stop(warum) {
    const E = S.E;
    if (!E) return;
    S.E = null;
    for (const c of E.cars) {
      if (c.schleife) {
        if (c.schleife.parent) c.schleife.parent.remove(c.schleife);
        c.schleife.geometry.dispose();
        c.schleife = null;
      }
      c.horn = false;
      GLAUTO.remove(c);
    }
    for (const F of E.figs) if (!F.gone) GLFIG.drop(F);
    for (const b of E.boxes || []) {
      const j = VEH.extra ? VEH.extra.indexOf(b) : -1;
      if (j >= 0) VEH.extra.splice(j, 1);
    }
    for (const m of E.meshes) {
      if (m.parent) m.parent.remove(m);
      if (m.geometry) m.geometry.dispose();
    }
    E.cars.length = E.figs.length = E.meshes.length = 0;
    S.ende[E.name] = E.ende || warum || 'aus';
    GL.emit('ereignis', { name: E.name, ende: S.ende[E.name] });
    markDirty(true);
  }
  // the actions at the stalls: buy a sausage, buy bangers
  KERN.act({
    id: 'gl-ereignis',
    prio: 5,
    r: 2.8,
    label: () => {
      const E = S.E;
      if (!E || !heute() || VEH.cur || !E.kauf) return null;
      if (E.name === 'kirmes' && E.wirt) return TX.wurst;
      if (E.name === 'boeller' && E.mann && !E.verkauft) return TX.kaufen;
      return null;
    },
    pos: () => {
      const E = S.E;
      return E && E.kauf ? [E.kauf[0], E.kauf[1], KERN.ground(E.kauf[0], E.kauf[1]) + 1] : [0, 0, -999];
    },
    run: () => {
      const E = S.E;
      if (!E) return;
      if (E.name === 'kirmes') {
        if (!GL.pay(3, 'Rostbratwurst')) return PLAY.think(TX.kein, 2000);
        GLTON.fx('geld');
        sag(E.wirt, SAGT.wirt.kauf);
        E.ende = 'wurst';
      } else if (E.name === 'boeller') {
        if (!GL.pay(5, 'Böller aus dem Kofferraum')) return PLAY.think(TX.kein, 2000);
        GL.add('boeller', 3);
        GLTON.fx('geld');
        sag(E.mann, SAGT.boellermann.kauf);
        // (and a balaclava for free – on while wanted: GLFAHNDUNG.haubeAn)
        if (!GL.has('haube')) {
          GL.add('haube');
          setTimeout(() => S.E === E && sag(E.mann, SAGT.boellermann.haube), 3600);
        }
        E.verkauft = true;
        E.ende = 'gekauft';
      }
    },
  });
  // the radar: where it is (a letter on the map)
  GLKARTE.src(out => {
    const E = S.E;
    if (E && heute()) out.push({ x: E.x, y: E.y, k: 'ereignis', name: E.def.radar });
  });
  // ------------------------------------------------------------------ per frame ------------------------------------------------------------------
  // where the player is, for the plan: in the town, in a village, out on the land
  function ortArt(x, y) {
    if (hyp(x + 1340, y - 1243) < 900) return 'stadt';
    const p = String(KERN.place(x, y, 0) || '');
    if (/Ratscher ·|Anger|Dorf|Hinternah|Schleusingerneundorf|Gethles|Erlau|Kloster/.test(p)) return 'dorf';
    return 'land';
  }
  function tick(dt) {
    if (!GL.on) return;
    try {
      lauf(dt);
    } catch (e) {
      if (!S.err) console.warn('grenzland events', e);
      S.err = String((e && e.stack) || e).slice(0, 300);
      try {
        stop('fehler');
      } catch (e2) {}
    }
  }
  function lauf(dt) {
    // letters to come (the fine of the speed camera)
    for (let i = S.briefe.length - 1; i >= 0; i--)
      if ((S.briefe[i].t -= dt) <= 0) {
        const b = S.briefe.splice(i, 1)[0];
        if (b.geld && GL.geld >= b.geld) GL.pay(b.geld, b.why);
        GLHANDY.sms(b.von, b.text);
      }
    const E = S.E,
      p = where();
    if (E) {
      // a mission began or the time changed: it goes
      if (GL.era !== 'heute' || (GL.cur && !E.debug)) return stop('mission');
      E.t += dt;
      const d = hyp(p.x - E.x, p.y - E.y);
      E.fern = d > 650 ? E.fern + dt : 0;
      let fertig = false;
      fertig = E.def.tick(E, dt, p);
      if (fertig || E.fern > 20) stop(fertig ? 'fertig' : 'zurückgelassen');
      return;
    }
    // the plan: a few times a second
    if ((S.planT -= dt) > 0) return;
    const dtp = 0.5 - S.planT;
    S.planT = 0.5;
    S.uhr += dtp;
    const name = GLLOGIK.plan(S.plan, {
      t: S.uhr,
      dt: dtp,
      frei: GL.era === 'heute' && !GL.cur,
      fahrt: !!VEH.cur && p.v > 3,
      ort: ortArt(p.x, p.y),
      dunkel: !!(VAUTO.dark && VAUTO.dark()),
      laeuft: !!S.E,
    });
    if (name && !start(name)) S.plan.fahrt = S.plan.next - 20; // (no place for it here: try again in a little while)
  }
  KERN.tick(tick, 'grenzland/ereignis');
  KERN.on('grenzland:stop', () => {
    stop('beendet');
    S.briefe.length = 0;
    S.plan = GLLOGIK.planNeu();
    if (S.blitz) {
      S.blitz.remove();
      S.blitz = null;
    }
  });
  KERN.on('grenzland:era', () => S.E && stop('zeit'));
  // every line spoken here, for the recordings (grenzland/gl_stimmen.js)
  function linien() {
    const L2 = [];
    for (const [who, o] of Object.entries(SAGT)) for (const t of Object.values(o)) L2.push([who, t]);
    return L2;
  }
  Object.assign(S, {
    DEF,
    TX,
    SAGT,
    start,
    stop,
    linien,
    aktiv: () => (S.E ? S.E.name : ''),
    tick,
    debug: {
      // tests: start one at the player whatever the plan says (on the road ahead, or where it belongs)
      start: (name, at) => {
        const ok = start(name, at ? { at } : {});
        if (ok && S.E) S.E.debug = true;
        return ok;
      },
      info: () => {
        const E = S.E;
        return E
          ? {
              name: E.name,
              x: Math.round(E.x),
              y: Math.round(E.y),
              t: Math.round(E.t * 10) / 10,
              cars: E.cars.length,
              figs: E.figs.length,
              meshes: E.meshes.length,
              ende: E.ende || '',
            }
          : null;
      },
    },
  });
  return S;
})();
window.GLEREIGNIS = GLEREIGNIS;
