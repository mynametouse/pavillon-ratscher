// ===================== feat/grenzland-welt: things that happen on the way (GLEREIGNIS) – one at a time, in free play =====================
// GTA's random events, from the region: every few minutes of driving (GLLOGIK.plan – pure, unit-tested), never while a mission runs,
// never in 1989, each where it fits, each with a point on the radar (GLKARTE.src), a small reward or consequence, cleared away when it is
// over or left behind (and with „Beenden“):
//   blitzer      a mobile speed camera in a parked estate at the roadside: past it faster than 50 km/h – a white flash, and a minute
//                later a letter in the phone (30 €)
//   traktorstau  the harvest lorry of the agricultural cooperative (an IFA W 50 – the mode has no tractor model) crawling along the
//                country road, two cars queueing behind it and honking; overtake it, or wait
//   kirmes       the fair on the Anger: the Kirmesbaum, a stall with Rostbratwurst (3 €), two young people of the fair, a polka
//   korso        a wedding convoy – four cars with white bows, honking through the town; who follows it a while gets a tenner from the
//                bride's father
//   boeller      a man sells bangers out of season from the boot of his car (5 € for three) – „Knallkörper im September“
//   wildunfall   at dusk a deer crosses the country road ahead: brake, or it bumps the vehicle and runs off into the wood (no harm)
// The people are figures of grenzland/gl_fig.js (their cast and clothes are added to GLDATA at load – nothing of the lead's data
// changes), the cars of grenzland/gl_auto.js, the props merged meshes in the traffic's material (no new shader program, no lamp).
//   GLEREIGNIS.start(name) · stop() · aktiv() → name | '' · linien() → [[who, text], …] · debug.start(name) (tests: at the player)
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
    stau: 'Stau hinter dem Erntewagen',
    stauSub: 'Die Agrargenossenschaft fährt Ernte ein',
    ueberholt: 'Überholt. Der Fahrer des Erntewagens tippt sich an die Mütze.',
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
    // ---- the harvest lorry crawling along, two cars behind it, honking ----
    traktorstau: {
      titel: TX.stau,
      sub: TX.stauSub,
      radar: 'Stau',
      wo: () => vorn(170, 320),
      start(E, A) {
        const line = linie(A, 700);
        E.x = A.x;
        E.y = A.y;
        if (!line) return false;
        const w = auto(E, 'w50', { col: '#5d6b45', col2: '#3a3f33' }),
          a = auto(E, 'trabant', { col: '#d8d2bf' }),
          b = auto(E, 'kombi', { col: '#7a2a2a' });
        const row = [w, a, b].filter(Boolean);
        row.forEach((c, i) => GLAUTO.onLine(c, line, 34 - i * 11, i ? 4.5 : 5));
        E.row = row;
        E.hornT = 2;
      },
      tick(E, dt, p) {
        const row = E.row || [];
        if (!row.length) return true;
        row.forEach((c, i) => {
          const ahead = row[i - 1];
          GLAUTO.drive(c, dt, {
            vmax: i ? 12 : 5.2,
            k: 1,
            halt: ahead ? [{ x: ahead.x, y: ahead.y, r: 0.6, gap: 3.5 }] : [],
          });
          c.horn = false;
        });
        if ((E.hornT -= dt) <= 0) {
          E.hornT = 3 + Math.random() * 5;
          E.hupe = row[1 + Math.floor(Math.random() * (row.length - 1))];
          E.hupeT = 0.6;
        }
        if (E.hupe && (E.hupeT -= dt) > 0) E.hupe.horn = true;
        const L0 = row[0];
        E.x = L0.x;
        E.y = L0.y;
        // overtaken: he is ahead of the lorry on its way
        const along = (p.x - L0.x) * Math.sin(L0.hd) + (p.y - L0.y) * Math.cos(L0.hd);
        if (!E.vorbei && VEH.cur && along > 6 && hyp(p.x - L0.x, p.y - L0.y) < 30) {
          E.vorbei = true;
          E.ende = 'ueberholt';
          PLAY.think(TX.ueberholt, 3000);
        }
        return L0.ende || E.t > 240 || (E.vorbei && hyp(p.x - L0.x, p.y - L0.y) > 220);
      },
    },
    // ---- the fair on the Anger ----
    kirmes: {
      titel: TX.kirmes,
      sub: TX.kirmesSub,
      radar: 'Kirmes',
      wo: () => {
        const p = where(),
          a = GLDATA.ORTE.anger.pos;
        return hyp(p.x - a[0], p.y - a[1]) < 700 ? { x: a[0] - 2, y: a[1] + 14, hd: 0.3 } : null;
      },
      start(E, A) {
        E.x = A.x;
        E.y = A.y;
        const hd = A.hd;
        // the Kirmesbaum: a tall bare trunk, a green crown of birch, ribbons, a wreath
        E.meshes.push(
          mesh(
            K => {
              K.cyl(0, 0, 0, 13.5, 0.16, 0.09, 8, L(188, 160, 120));
              K.cyl(0, 0, 13.2, 16.4, 0.05, 0.02, 6, L(110, 90, 60));
              for (let i = 0; i < 9; i++) {
                const a = (i / 9) * Math.PI * 2;
                K.box(Math.sin(a) * 0.6, Math.cos(a) * 0.6, 13.4 + (i % 3) * 0.5, 0.5, 1.4, 1.1, a, L(70, 120, 50));
              }
              K.cyl(0, 0, 9.6, 9.9, 0.95, 0.95, 16, L(60, 110, 50), false);
              const C = [L(220, 40, 40), L(240, 240, 240), L(40, 90, 200), L(240, 200, 40)];
              for (let i = 0; i < 8; i++) {
                const a = (i / 8) * Math.PI * 2;
                K.box(Math.sin(a) * 0.5, Math.cos(a) * 0.5, 7.4, 0.06, 0.02, 2.2, a, C[i % 4]);
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
        if (d < 90 && (E.musT -= dt) <= 0) E.musT = Math.max(4, GLTON.musik('polka', 8) - 0.2) || 8;
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
          ['trabant', { col: '#e8e4d8' }],
          ['kombi', { col: '#2d3a55' }],
          ['kasten', { col: '#d9d9d6' }],
        ];
        E.row = [];
        looks.forEach(([t, o], i) => {
          const c = auto(E, t, o);
          if (!c) return;
          GLAUTO.onLine(c, line, 46 - i * 11, 6);
          schleife(c);
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
        const [x, y] = rechts(A, 4.4);
        const c = auto(E, 'kombi', { col: '#3e4a3a' });
        if (c) GLAUTO.park(c, x, y, A.hd);
        // the crates behind the car, the boot's lid up
        const bx = x - Math.sin(A.hd) * 3.3,
          by = y - Math.cos(A.hd) * 3.3;
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
        figur(
          E,
          'boellermann',
          bx + Math.cos(A.hd) * 1.1,
          by - Math.sin(A.hd) * 1.1,
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
  // white bows on a wedding car: on the roof and on the bonnet, two ribbons from the bow to the mirrors
  function schleife(c) {
    const T = c.T || {},
      h = T.h || 1.45,
      a = T.a ?? 1.2,
      b = T.b ?? -1.2,
      yf = T.yf ?? 2.0,
      w = L(246, 246, 244);
    const K = VPROPS.kit();
    const bow = (y, z, s) => {
      K.box(0, y, z, 0.42 * s, 0.1 * s, 0.1 * s, 0.6, w);
      K.box(0, y, z, 0.42 * s, 0.1 * s, 0.1 * s, -0.6, w);
      K.box(0, y, z - 0.02, 0.1 * s, 0.1 * s, 0.12 * s, 0, w);
    };
    bow((a + b) / 2, h + 0.01, 1.2);
    bow(yf - 0.55, h * 0.66, 1);
    for (const s of [-1, 1]) K.box(s * 0.36, yf - 1.05, h * 0.68, 0.035, 1.0, 0.02, s * 0.5, w);
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
      if (c.schleife && c.schleife.parent) c.schleife.parent.remove(c.schleife);
      c.horn = false;
      GLAUTO.remove(c);
    }
    for (const F of E.figs) if (!F.gone) GLFIG.drop(F);
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
        E.verkauft = true;
        E.ende = 'gekauft';
      }
    },
  });
  // the radar: where it is (a letter on the map)
  GLKARTE.src(out => {
    const E = S.E;
    if (E && heute()) out.push({ x: E.x, y: E.y, k: 'ort', name: E.def.radar });
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
