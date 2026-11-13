// ===================== feat/grenzland: the wanted level in the world – witnesses, patrol cars, officers on foot, the road block, hiding (GLFAHNDUNG) =====================
// The rules and every decision of the police are grenzland/gl_logik.js (pure, tested without a browser on the real road graph: GLLOGIK.
// einsatz). Here is the world side: who sees (the people of the mode, the villagers, the walkers and drivers of the traffic, the police
// themselves, cameras a mission adds) and what a witness does – a villager knows Falko and Sarah by name, a stranger gives only a
// description; a witness takes out the phone, and the report reaches the police after a few seconds (talk to him in that time and a
// small thing is forgotten; knocked down, he reports that as well when he is up again – hurting people never pays). Then the police as
// in the country: a patrol car comes over the roads from where they leave the square (it takes its time), with blue light and horn, to
// where one was last seen; it looks around there, cruises the roads near it, follows on the road what it sees – a moped off the road it
// cannot follow –, stops near somebody on foot, and two officers get out and walk after him (whoever runs, gets away; whoever stands, is
// caught), go to where he was last seen, come back and get in again. From three stars a road block stands ahead on the road one drives;
// passing it is another deed. Out of sight the stars go (sooner under the trees of a forest, indoors, in the barn; sooner while they
// have only a description; new clothes at the bungalow end a description at once); while Falko and Sarah are apart, one star less.
// In 1989 the Volkspolizei comes in its saloon with one blue beacon, and the ABV on foot knows everybody.
//   GLFAHNDUNG.tat(id, { force, laut, quiet, k, sofort }) → stars gained now · zeugen(o) · wo() · los(ax, ay, bx, by) · versteckt(x, y, z)
//   clear() · stand() · erwischt() · umziehen() · off · extra: [{ x, y, r }] · hooks.zeuge: () => [{ x, y, hd, r, name, knows, police }]
//   ist() → the facts the police can know { wer, kleid, kopf, fz } · stand().wissen { gesicht, kleidung, fahrzeug } (what they know that
//   still fits: GLLOGIK.sicht / wissen) · stand().cars[i].gesehen (that car sees him now or did within 4 s) · linien() (the radio's lines)
//   Events: grenzland:tat, :zeuge, :sterne, :erwischt, :entkommen, :streife, :sperre, :funk, :wissen
import * as THREE from 'three';
import { COARSE, scene } from '../core/head.js';
import { KERN } from '../core/kern.js';
import { markDirty } from '../core/assets.js';
import { P } from '../game/walkable.js';
import { PLAY } from '../game/play.js';
import { AVATAR } from '../game/avatar.js';
import { WCOL } from '../world/worldcol.js';
import { RATSCHER } from '../world/ratscher.js';
import { FOREST } from '../world/forest.js';
import { VPROPS } from '../world/village_props.js';
import { SCHL } from '../welt/schleusingen.js';
import { VEH } from '../vehicles/vehicle.js';
import { DTEXT } from '../dorf/dorf_text.js';
import { DPEOPLE } from '../dorf/dorf_people.js';
import { VLEUTE } from '../verkehr/verkehr_leute.js';
import { VFIG } from '../verkehr/verkehr_fig.js';
import { VAUTO } from '../verkehr/verkehr_auto.js';
import { VERKEHR } from '../verkehr/verkehr.js';
import { CLOCK } from '../time/clock.js';
import { STIMME } from '../audio/stimme.js';
import { GLLOGIK } from './gl_logik.js';
import { GLDATA } from './gl_data.js';
import { GL } from './gl_state.js';
import { GLTON } from './gl_ton.js';
import { GLFIG } from './gl_fig.js';
import { GLAUTO } from './gl_auto.js';
import { GLHUD } from './gl_hud.js';
export const GLFAHNDUNG = (() => {
  const S = {
    cars: [], // the units of the police (GLLOGIK.einsatz): { st: 'anfahrt' | 'suche' | 'verfolgt' | 'steht' | 'abzug', x, y, v, c (GLAUTO car) … }
    cops: [], // the officers on foot: { st, x, y, F (figure of GLFIG) … }
    block: null, // the road block: { x, y, hd, cars: [c, c] … }
    last: null, // where the player was last seen or reported: [x, y]
    wait: 0, // seconds until the next car is sent
    seen: false,
    close: false,
    hidden: false, // indoors or in a hiding place a mission named
    cover: false, // in a wood (crowns overhead and all round)
    krone: false, // under a tree's crown (the helicopter does not see one there)
    off: false, // missions may switch the police off (the flashback's first minute)
    extra: [], // further places that hide (the barn): [{ x, y, r }]
    hooks: { zeuge: null }, // a mission may add witnesses (cameras)
    luft: null, // what the helicopter sees (grenzland/gl_heli.js): { seen } – read each frame
    heli: null, // where it flies: [x, y] (for the radar)
    err: null, // an error of the police's frame (tests: must stay null)
    zeugeT: 0,
    coverT: 0,
    speedT: 0,
    helmT: 0,
    funkT: 0,
    kleidVon: { m: '', f: '' }, // what each of the two wears over the own clothes: '' | 'warn' (the warning jacket from the bungalow)
    haube: false, // the balaclava is worn (GL.inv.haube: one has it – the man with the bangers gives one away)
    haubeG: null, // its mesh on the player's head: { g, model, F }
    helmG: null, // the moped helmet on the player's head: { g, model }
    warnAn: false, // the warning jacket is shown on the player's figure
    wissen: { gesicht: false, kleidung: false, fahrzeug: false },
    wissenT: 0,
  };
  const T = GLDATA.T;
  // texts of this module (the core's are GLDATA.T)
  const TX = {
    ruft: (wer, was) => wer + ' hat es gesehen (' + was + ') und greift zum Telefon.',
    ruftNicht: wer => wer + ' steckt das Telefon wieder ein.',
    reden: wer => 'Mit ' + wer + ' reden',
    redeIch: ['War keine Absicht. Wirklich.', 'Das bleibt unter uns, ja?', 'Ich bring das in Ordnung. Versprochen.'],
    redeEr: [
      'Na gut. Aber ich hab dich im Auge.',
      'Beim nächsten Mal ruf ich an.',
      'Schon gut. Mach, dass du weiterkommst.',
    ],
    redeNein: 'Das melde ich. Da gibt es nichts zu reden.',
    opfer: wer => wer + ' ist wieder auf den Beinen – und ruft die Polizei.',
    fahrzeug: 'Jetzt kennen sie das Moped.',
    umziehen: 'Umziehen',
    warnAn: 'Warnjacke anziehen',
    warnAus: 'Warnjacke ausziehen',
    warnJa: 'Warnjacke an. Wer Orange trägt, gehört zum Forst – da schaut keiner zweimal hin.',
    warnNein: 'Wieder in den eigenen Sachen.',
    umFrei: 'Andere Jacke, andere Mütze – die Beschreibung passt nicht mehr.',
    umBekannt: 'Andere Jacke – aber sie wissen, wer du bist.',
    haubeAuf: 'Sturmhaube aufsetzen',
    haubeAb: 'Sturmhaube abnehmen',
    haubeJa: 'Sturmhaube auf. Jetzt erkennt dich keiner – aber jeder schaut.',
    haubeNein: 'Sturmhaube ab. Die Haare sind ruiniert.',
    helmNimm: 'Helm vom Haken nehmen',
    helmTipp: 'Ohne Helm? Der hängt im Carport am Haken.',
    helmOk: 'Der Helm ist dabei – auf dem Moped setzt du ihn auf.',
    umGesehen: 'Nicht jetzt – da schaut jemand zu.',
    schild: 'Kennzeichen tauschen',
    schildOk: 'Das Versicherungskennzeichen vom Vorjahr dran: Dieses Moped kennt keiner.',
    halt: 'Halt! Polizei!',
    halt89: 'Stehenbleiben!',
    haltSek: 'Polizei! Auf den Boden!',
    helm: 'Ohne Helm – und die Streife hat es gesehen.',
    durch: 'Durch die Sperre!',
    zuFuss: 'Zwei Beamte zu Fuß – sie kommen um die Ecke.',
    abv: 'Der ABV ist unterwegs. Der kennt hier jeden.',
  };
  // the police radio as subtitles (invented call signs: „Rennsteig“ is the control room, „Schleuse“ the patrol cars)
  const FUNK = {
    los: [
      'Rennsteig für Schleuse 12: Hinweis aus Ratscher. Fahren Sie mal hin.',
      'Schleuse 12 verstanden. Wir brauchen ein bisschen – Landstraße.',
    ],
    ort: ['Schleuse 12 am Ort. Wir schauen uns um.', 'Rennsteig von Schleuse 12: vor Ort. Bisher nur Hühner.'],
    sicht: ['Schleuse 12: Sichtkontakt!', 'Rennsteig, wir haben ihn. Fahren nach.'],
    verloren: ['Schleuse 12: Sicht verloren. Suchen den Bereich ab.', 'Rennsteig, der ist weg. Wir drehen eine Runde.'],
    sperre: [
      'Rennsteig an alle: Kontrollstelle auf der Landstraße einrichten.',
      'Schleuse 14 steht quer. Hier kommt keiner durch. Hoffentlich.',
    ],
    durch: ['Schleuse 14: Der ist über den Acker! Der Bauer wird sich freuen.'],
    heli: [
      'Rennsteig für Bussard 1: Sie haben Freigabe. Suchgebiet Ratscher.',
      'Bussard 1 im Anflug. Bleiben Sie, wo Sie sind – das gilt nicht Ihnen, Rennsteig.',
    ],
    sek: ['Rennsteig an alle: Spezialkräfte übernehmen. Zufahrten dicht machen.'],
    ende: [
      'Rennsteig an alle: Fahndung eingestellt. Kaffee ist fertig.',
      'Schleuse 12 rückt ein. War wohl wieder nichts.',
    ],
    vopo: [
      'Hier Zentrale. Genosse Hauptwachtmeister, klären Sie das in Ratscher.',
      'Verstanden. Bin mit dem Wartburg unterwegs.',
    ],
  };
  const hyp = Math.hypot;
  const dark = () => !!(VAUTO.dark && VAUTO.dark());
  const era89 = () => GL.era === '1989';
  // ---- where the player is: on foot, or his vehicle ----
  function wo() {
    const v = VEH && VEH.cur;
    if (v) return { x: v.st.x, y: v.st.y, v: hyp(v.st.u, v.st.v), veh: v, hd: v.st.psi };
    return { x: P.x, y: P.y, v: P.speed || 0, veh: null, hd: (P.yaw * Math.PI) / 180 };
  }
  const inSquare = (x, y) => {
    const B = RATSCHER && RATSCHER.box;
    return !!B && x > B[0] + 30 && x < B[2] - 30 && y > B[1] + 30 && y < B[3] - 30;
  };
  // ---- nothing solid between two points: the walls of the buildings (the square: WCOL; the town: its own segments) – and no forest:
  //      a few trunks do not hide anybody, a wood does ----
  let townW = null,
    townN = -1;
  function town() {
    if (!SCHL || SCHL.state !== 'ready' || !SCHL.segs || !SCHL.segs.length) return null;
    if (townN !== SCHL.segs.length) {
      townN = SCHL.segs.length;
      townW = GLLOGIK.waende(SCHL.segs);
    }
    return townW;
  }
  function los(ax, ay, bx, by) {
    if (!inSquare(ax, ay) || !inSquare(bx, by)) {
      const Wd = town();
      return Wd ? Wd.frei(ax, ay, bx, by) : true;
    }
    if (!WCOL || !WCOL.ready) return true;
    let free = true;
    const sx = bx - ax,
      sy = by - ay,
      L = Math.hypot(sx, sy);
    try {
      WCOL.each(Math.min(ax, bx), Math.min(ay, by), Math.max(ax, bx), Math.max(ay, by), (s, A) => {
        if (free && GLLOGIK.kreuzt(ax, ay, sx, sy, A[s * 4], A[s * 4 + 1], A[s * 4 + 2], A[s * 4 + 3])) free = false;
      });
    } catch (e) {
      return true;
    }
    if (!free || L < 30) return free;
    // through a wood: more than some twenty metres under crowns on the way (a tree or a row of them hides nobody; along a road
    // that runs through a wood one sees as far as the road is straight)
    let wald = 0;
    for (let d = 8; d < L - 6; d += 8) {
      const x = ax + (sx * d) / L,
        y = ay + (sy * d) / L;
      if (unterKrone(x, y) && !aufStrasse(x, y) && ++wald >= 3) return false;
    }
    return true;
  }
  // on a real road (not a track or a path)
  const aufStrasse = (x, y) => {
    try {
      const s = KERN.surface(x, y);
      return !!s && s.kind <= 5 && s.e > -0.5;
    } catch (e) {
      return false;
    }
  };
  // ---- the canopy: the measured crowns of the square (world/ratscher.js: place, height, crown radius) in a grid, and the forest at
  //      the Klinge (world/forest.js) ----
  let KR = null;
  function kronen() {
    if (KR) return KR;
    const R = RATSCHER && RATSCHER.treeRecs;
    if (!R || !R.length) return null;
    KR = new Map();
    for (const t of R) {
      if (!(t.h > 4) || !(t.r > 0.8)) continue;
      const k = (Math.floor(t.x / 16) + 512) * 4096 + Math.floor(t.y / 16) + 512;
      let a = KR.get(k);
      if (!a) KR.set(k, (a = []));
      a.push(t.x, t.y, t.r);
    }
    return KR;
  }
  // under a tree's crown (what the helicopter cannot look through)
  function unterKrone(x, y) {
    try {
      if (FOREST && FOREST.owns && FOREST.owns(x, y)) return true;
    } catch (e) {}
    const K = kronen();
    if (!K) return false;
    for (let i = Math.floor((x - 8) / 16); i <= Math.floor((x + 8) / 16); i++)
      for (let j = Math.floor((y - 8) / 16); j <= Math.floor((y + 8) / 16); j++) {
        const a = K.get((i + 512) * 4096 + j + 512);
        if (a) for (let k = 0; k < a.length; k += 3) if (hyp(a[k] - x, a[k + 1] - y) < a[k + 2]) return true;
      }
    return false;
  }
  // in a wood: crowns overhead and all round (a patrol sees one there only from close by) – not under a single tree, not on a road
  const WIND = [
    [7, 0],
    [-7, 0],
    [0, 7],
    [0, -7],
  ];
  function unterBaeumen(x, y) {
    if (!inSquare(x, y) || !unterKrone(x, y) || aufStrasse(x, y)) return false;
    let n = 0;
    for (const [dx, dy] of WIND) if (unterKrone(x + dx, y + dy)) n++;
    return n >= 3;
  }
  // indoors, or a place a mission names (the barn)
  function drinnen(x, y, z) {
    try {
      if (KERN.inside(x, y, (z || 0) + 1)) return true;
    } catch (e) {}
    return S.extra.some(q => hyp(q.x - x, q.y - y) < q.r);
  }
  // a hiding place: indoors, the forest, a place a mission names
  function versteckt(x, y, z) {
    if (drinnen(x, y, z)) return true;
    return unterBaeumen(x, y);
  }
  const sneak = () => !VEH.cur && (P.stance === 'crouch' || P.stance === 'crawl' || P.stance === 'prone');
  // ---- what the player is like now – what the police can know of him: who, the clothes, headwear, the vehicle ----
  const EIGEN = { m: 'karo', f: 'dunkel' }; // Falko's red checked shirt, Sarah's dark jacket
  const fzArt = v =>
    !v ? '' : v.id === 'gl-moped' ? 'moped' : v.id === 'gl-trabi' ? 'trabant' : v.id === 'tractor' ? 'traktor' : 'auto';
  // the moped helmet: once taken from the moped's place in the garden it is worn on the moped (as GTA's riders do)
  const helmAuf = () => GL.era === 'heute' && GL.has('helm') && !!VEH.cur && VEH.cur.id === 'gl-moped';
  function ist() {
    if (era89()) return { wer: 'm', kleid: 'parka', kopf: '', fz: fzArt(VEH.cur) };
    const g = window.GEAR && window.GEAR.on;
    return {
      wer: GL.wer,
      kleid: S.kleidVon[GL.wer] || (g && g.body === 'warnjacke' ? 'warn' : EIGEN[GL.wer] || 'dunkel'),
      kopf: S.haube ? 'haube' : helmAuf() || (g && g.head === 'forsthelm') ? 'helm' : '',
      fz: fzArt(VEH.cur),
    };
  }
  // the player's figure as the facts say: the warning jacket (the game's own recolouring of the jacket: game/avatar.js wear), the
  // helmet (a moped helmet of grenzland/gl_fig.js on the head bone; the hair and cap under it squashed as the game does for its forest
  // helmet)
  function aussehen() {
    const heute = GL.on && GL.era === 'heute',
      warn = heute && S.kleidVon[GL.wer] === 'warn';
    if (warn !== S.warnAn) {
      S.warnAn = warn;
      try {
        const on = Object.assign({}, (window.GEAR && window.GEAR.on) || {});
        if (warn) on.body = 'warnjacke';
        AVATAR.wear(on);
      } catch (e) {}
      markDirty();
    }
    const F = AVATAR.fig,
      model = F && F.model,
      want = heute && helmAuf() && !!model,
      H = S.helmG;
    if (H && (!want || H.model !== model)) {
      if (H.g && H.g.parent) H.g.parent.remove(H.g);
      if (H.F && H.F.helmU) H.F.helmU.value = H.u0;
      S.helmG = null;
      markDirty();
    }
    if (want && !S.helmG) {
      let g = null;
      try {
        g = GLFIG.hatOn(model, null, 'helmrot');
      } catch (e) {}
      S.helmG = { g, model, F, u0: F.helmU ? F.helmU.value : 0 };
      if (g && F.helmU) F.helmU.value = 1;
      markDirty();
    }
    // the balaclava
    const wantH = heute && S.haube && !!model,
      B = S.haubeG;
    if (B && (!wantH || B.model !== model)) {
      if (B.g && B.g.parent) B.g.parent.remove(B.g);
      if (B.F && B.F.helmU && !S.helmG) B.F.helmU.value = B.u0;
      S.haubeG = null;
      markDirty();
    }
    if (wantH && !S.haubeG) {
      let g = null;
      try {
        g = sturmhaube(model);
      } catch (e) {}
      S.haubeG = { g, model, F, u0: S.helmG ? S.helmG.u0 : F.helmU ? F.helmU.value : 0 };
      if (g && F.helmU) F.helmU.value = 1;
      markDirty();
    }
  }
  // a balaclava of dark knit over the head down to the neck, an eye slit – in the head's own frame (GLFIG.headOf: the crown at the
  // origin, x right, y ahead, z up), the traffic's material
  let haubeGeo = null;
  function sturmhaube(model) {
    const H = GLFIG.headOf && GLFIG.headOf(model);
    if (!H) return null;
    if (!haubeGeo) {
      const K = VPROPS.kit(),
        col = [0.016, 0.016, 0.02],
        col2 = [0.03, 0.03, 0.036],
        rx = Math.max(0.075, Math.min(0.1, H.rx)) * 1.13 + 0.006,
        ry = Math.max(0.085, Math.min(0.115, H.rz)) * 1.12 + 0.008,
        rz = 0.128,
        z0 = -0.112,
        eye = Math.max(-0.14, Math.min(-0.07, (H.nose ? H.nose[1] : -0.11) + 0.036)),
        seg = 22,
        rings = 16,
        to = 2.85;
      const Pt = (a, t) => [Math.cos(a) * Math.sin(t) * rx, Math.sin(a) * Math.sin(t) * ry, z0 + Math.cos(t) * rz];
      for (let j = 0; j < rings; j++) {
        const t0 = (to * j) / rings,
          t1 = (to * (j + 1)) / rings,
          zm = z0 + Math.cos((t0 + t1) / 2) * rz;
        for (let i = 0; i < seg; i++) {
          const a0 = (i / seg) * Math.PI * 2,
            a1 = ((i + 1) / seg) * Math.PI * 2;
          let am = (a0 + a1) / 2 - Math.PI / 2;
          while (am > Math.PI) am -= 2 * Math.PI;
          // (the eye slit: in front, at the eyes' height)
          if (Math.abs(am) < 0.62 && Math.abs(zm - eye) < 0.019) continue;
          // (the knit: ribs in two tones)
          const c = (i + (j >> 1)) % 2 ? col : col2;
          if (j === 0) K.tri(Pt(a0, t1), Pt(a1, t1), Pt(a0, t0), c);
          else K.quad(Pt(a0, t1), Pt(a1, t1), Pt(a1, t0), Pt(a0, t0), c);
        }
      }
      haubeGeo = K.geo();
    }
    const m = new THREE.Mesh(haubeGeo, VFIG.mat()),
      g = new THREE.Group();
    m.userData.noMerge = true;
    m.userData.shared = true;
    m.castShadow = false;
    m.frustumCulled = false;
    g.add(m);
    g.position.copy(H.pos);
    g.quaternion.copy(H.quat);
    g.scale.setScalar(H.k);
    H.head.add(g);
    return g;
  }
  // on or off: while wanted, or to take it off (the lowest of the action buttons: anything near comes first)
  function haube(an) {
    if (!GL.on || GL.era !== 'heute' || !GL.has('haube')) return false;
    S.haube = an ?? !S.haube;
    aussehen();
    GLTON.fx('tick');
    PLAY.think(S.haube ? TX.haubeJa : TX.haubeNein, 3000);
    GL.emit('kleid', { wer: GL.wer, kopf: ist().kopf });
    return S.haube;
  }
  KERN.act({
    id: 'gl-haube',
    prio: -3,
    r: 3,
    label: () =>
      GL.on && GL.era === 'heute' && !VEH.cur && GL.has('haube') && (S.haube || GLLOGIK.stars(GL.W) > 0)
        ? S.haube
          ? TX.haubeAb
          : TX.haubeAuf
        : null,
    pos: () => [P.x, P.y, (P.feet || 0) + 1.2],
    run: () => haube(),
  });
  // the helmet hangs on a hook in the carport (not at the moped: there the button mounts it)
  const HAKEN = [-1.0, 14.0];
  KERN.act({
    id: 'gl-helm',
    prio: 4,
    r: 2.6,
    label: () => (GL.on && GL.era === 'heute' && !VEH.cur && !GL.has('helm') ? TX.helmNimm : null),
    pos: () => [HAKEN[0], HAKEN[1], KERN.ground(HAKEN[0], HAKEN[1]) + 1.4],
    run: () => {
      if (GL.has('helm')) return;
      GL.add('helm');
      PLAY.think(TX.helmOk, 3200);
      GLTON.fx('tick');
    },
  });
  // on the moped without it: once a word where it is
  KERN.on('grenzland:wer', () => (S.helmTipp = false));
  // ---- the roads the police can come by: the square's graph, the town's (the traffic's network there) ----
  let netSq = null,
    netTown = null,
    netTownG = null;
  function netz(x, y) {
    if (inSquare(x, y)) {
      if (!netSq) {
        const G = GLAUTO.netz();
        if (!G || !G.edges.length) return null;
        netSq = GLLOGIK.netz(G, { box: RATSCHER.box });
      }
      return netSq.exits.length ? netSq : null;
    }
    const Pl = VERKEHR && VERKEHR.places && VERKEHR.places.stadt;
    if (!Pl || !Pl.on || !Pl.G || !Pl.exits || hyp(x - Pl.c[0], y - Pl.c[1]) > Pl.carR - 40) return null;
    if (netTownG !== Pl.G) {
      netTownG = Pl.G;
      netTown = GLLOGIK.netz(Pl.G, { exits: Pl.exits, vmax: [14, 13.9, 13.9, 9, 8, 5.6, 5] });
    }
    return netTown.exits.length ? netTown : null;
  }
  // ---- who sees the player right now (o.laut: a bang – heard through walls within o.laut metres) ----
  // the crooks of the story do not call the police (a mission may still make one a witness: F.zeuge = true)
  const STUMM = new Set(['fremder', 'jule', 'timo', 'basti', 'kraeh', 'wache1', 'wache2', 'lutz']);
  function zeugen(o = {}) {
    const p = wo(),
      dk = dark(),
      opt = { dark: dk, sneak: sneak() },
      out = [];
    const sees = (w, name, knows, police, ref) => {
      const d = hyp(w.x - p.x, w.y - p.y);
      if (o.laut ? d < o.laut : GLLOGIK.sieht(w, p.x, p.y, opt) && los(w.x, w.y, p.x, p.y))
        out.push({ name, knows: !!knows, police: !!police, d, ref: ref || null });
    };
    for (const F of GLFIG.figs) {
      if (!F.g.visible || F.era !== GL.era || F.partner || F.downT > 0 || !F.sees) continue;
      if (STUMM.has(F.id) && !F.zeuge) continue;
      sees({ x: F.x, y: F.y, hd: F.st === 'geht' ? F.hd : null, r: F.r }, F.name, F.knows ?? era89(), !!F.cop, {
        k: 'fig',
        F,
      });
    }
    for (const u of S.cars)
      if (u.c && u.c.g.visible && u.st !== 'abzug')
        sees({ x: u.x, y: u.y, hd: null, r: 60 }, era89() ? 'Die Volkspolizei' : 'Die Streife', false, true);
    if (S.block) sees({ x: S.block.x, y: S.block.y, hd: null, r: 60 }, 'Die Sperre', false, true);
    if (GL.era === 'heute') {
      for (const k in (DPEOPLE && DPEOPLE.figs) || {}) {
        const f = DPEOPLE.figs[k];
        if (f && f.g.visible && f.at)
          sees(
            { x: f.at.x, y: f.at.y, hd: null, r: 30 },
            (DTEXT.P[k] && DTEXT.P[k].name) || 'Jemand aus dem Dorf',
            true,
            false,
            { k: 'dorf', id: k, at: f.at }
          );
      }
      for (const d of (VERKEHR && VERKEHR.S && VERKEHR.S.peds) || [])
        if (d.f && d.f.g.visible)
          sees(
            { x: d.x, y: d.y, hd: d.hd, r: 28 },
            (VLEUTE.P[d.key] && VLEUTE.P[d.key].name) || 'Eine Passantin',
            false,
            false,
            { k: 'ped', id: d.key, at: d }
          );
      for (const c of (VAUTO && VAUTO.cars) || [])
        if (c.g.visible && c.st !== 'geliehen')
          sees({ x: c.x, y: c.y, hd: c.hd, r: 34 }, 'Ein Autofahrer', false, false, { k: 'auto', id: 'auto' + c.id });
    }
    if (S.hooks.zeuge)
      for (const w of S.hooks.zeuge() || []) sees(w, w.name, w.knows, w.police, { k: 'hook', id: w.name });
    out.sort((a, b) => a.d - b.d);
    return out;
  }
  const keyOf = z => (z.ref ? z.ref.k + ':' + (z.ref.F ? z.ref.F.id : z.ref.id) : 'x:' + z.name);
  const tatName = id => GLDATA.TATEN[id] || (GLLOGIK.CRIMES[id] || {}).name || id;
  // ---- a deed: counted if somebody saw it. o: { laut, quiet, k, force: [{ name, knows, police }], sofort } → the stars gained now.
  //      The police see for themselves and a forced witness has reported already: these count at once. Anybody else takes out the
  //      phone first – the stars come when the call is through (GLLOGIK.meldeZeit: a few seconds). ----
  function tat(id, o = {}) {
    if (!GL.on) return 0;
    const W = GL.W,
      Z = o.force || zeugen(o),
      p = wo(),
      police = Z.some(z => z.police),
      now = !!o.force || !!o.sofort || police || !Z.length;
    GL.stats.taten++;
    GL.save();
    let gained = 0;
    if (now) gained = zaehlen(id, Z, p, o);
    else {
      // the nearest witness makes the call (what he reports, all of them saw)
      const z = Z[0],
        key = keyOf(z);
      if (!W.offen.some(q => q.key === key && q.id === id)) {
        const q = GLLOGIK.melden(W, id, {
          seen: Z.length,
          knows: Z.some(a => a.knows),
          k: o.k,
          t: CLOCK.t,
          fz: !!p.veh,
          key,
        });
        if (q) {
          q.name = z.name;
          q.ref = z.ref;
          q.x = p.x;
          q.y = p.y;
          // (what he will describe: how the player looked then, from how far, by daylight or not)
          q.ist = ist();
          q.d = z.d;
          q.dark = dark();
          q.hd = p.v > 0.5 ? p.hd : null;
          q.quiet = !!o.quiet;
          if (z.ref && z.ref.F && z.ref.F.st !== 'geht') GLFIG.face(z.ref.F, p.x, p.y);
          // (the phone at the ear while the call is made – the figures of round 2)
          try {
            if (z.ref && z.ref.F && GLFIG.geste) GLFIG.geste(z.ref.F, 'telefon', { sec: q.t + 0.8 });
          } catch (e) {}
          if (!o.quiet) PLAY.think(TX.ruft(z.name, tatName(id)), 3600);
          GL.emit('zeuge', { id, wer: z.name, sek: Math.round(q.t * 10) / 10, beredbar: GLLOGIK.beredbar(id) });
        }
      }
    }
    if (!Z.length && !o.quiet) PLAY.think(T.keinZeuge, 2200);
    GL.emit('tat', { id, zeugen: Z.length, wer: Z[0] ? Z[0].name : '', sterne: GLLOGIK.stars(W), bekannt: W.known });
    return gained;
  }
  // the deed reaches the police: the level, where to come, what one is told
  function zaehlen(id, Z, p, o = {}) {
    const W = GL.W,
      before = GLLOGIK.stars(W);
    const gained = GLLOGIK.crime(W, id, {
      seen: Z.filter(z => !z.police).length,
      police: Z.some(z => z.police),
      knows: Z.some(z => z.knows),
      k: o.k,
      t: CLOCK.t,
      fz: !!p.veh,
    });
    if (Z.length) {
      // the description: what the nearest witness could make out (a report the police make themselves: from where they stand)
      const z = Z[0];
      beschrieben(
        GLLOGIK.sicht(W, o.ist || ist(), {
          d: o.d ?? (z.d > 0 ? z.d : undefined),
          dark: o.dark ?? dark(),
          knows: Z.some(a => a.knows),
          x: p.x,
          y: p.y,
          hd: o.hd !== undefined ? o.hd : p.v > 0.5 ? p.hd : null,
        })
      );
      const full = GLLOGIK.starsOf(W.heat);
      E.melde(p.x, p.y, GLLOGIK.kraefte(full, GL.era).delay);
      S.last = E.last;
      S.wait = Math.max(0, E.wait);
      if (!o.quiet) PLAY.think(T.zeuge(Z[0].name, tatName(id)), 3600);
      if (GLLOGIK.stars(W) > before) {
        GLTON.fx('stern');
        funkBild('stufe');
        if (before === 0) {
          setTimeout(() => GL.on && GLLOGIK.stars(GL.W) > 0 && PLAY.think(T.streife, 3800), 3800);
          funk(era89() ? 'vopo' : 'los', 6);
        }
      }
    }
    if (gained) GL.emit('sterne', { n: GLLOGIK.stars(W), bekannt: W.known });
    return gained;
  }
  // ---- a witness on the phone can be talked to (small things only) – the action button near him ----
  const ortVon = q => {
    const r = q.ref;
    if (!r) return null;
    if (r.F) return r.F.gone ? null : [r.F.x, r.F.y, r.F.z];
    if (r.at) return [r.at.x, r.at.y, KERN.ground(r.at.x, r.at.y)];
    return null;
  };
  const reden = () => GL.W.offen.find(q => !q.quiet && GLLOGIK.beredbar(q.id) && ortVon(q));
  KERN.act({
    id: 'gl-zeuge',
    prio: 6,
    r: 2.6,
    label: () => {
      if (!GL.on || VEH.cur) return null;
      const q = reden();
      return q ? TX.reden(q.name) : null;
    },
    pos: () => {
      const q = GL.on ? reden() : null;
      return q ? ortVon(q) : [0, 0, -999];
    },
    run: () => {
      const q = reden();
      if (!q) return;
      const i = Math.floor(Math.random() * TX.redeIch.length);
      GLLOGIK.still(GL.W, q.key);
      // (the phone goes down; a nod)
      try {
        if (q.ref && q.ref.F && GLFIG.geste) {
          GLFIG.geste(q.ref.F, null);
          setTimeout(() => !q.ref.F.gone && GLFIG.geste(q.ref.F, 'nicken'), 2400);
        }
      } catch (e) {}
      GLHUD.sub(GL.name(), TX.redeIch[i], 2200);
      setTimeout(() => GL.on && GLHUD.sub(q.name, TX.redeEr[i], 2600), 2300);
      GL.emit('zeuge', { id: q.id, wer: q.name, still: true });
    },
  });
  // somebody knocked down reports it himself when he is up again (GTA 6: victims report) – unless he is one of the story's crooks
  KERN.on('grenzland:schlag', d => {
    if (!GL.on || !d) return;
    const F = GLFIG.figs.find(f => f.id === d.id);
    if (!F || F.cop || STUMM.has(F.id)) return;
    const key = 'fig:' + F.id,
      cut = GLLOGIK.still(GL.W, key); // the call he was making is cut short …
    const q = GLLOGIK.melden(GL.W, 'schlag', {
      seen: 1,
      knows: F.knows ?? era89(),
      key,
      sec: Math.max(6, F.downT || 7) + 4, // … and made again with more to tell, once he is up
      t: CLOCK.t,
    });
    if (q) {
      q.name = F.name;
      q.ref = { k: 'fig', F };
      q.x = F.x;
      q.y = F.y;
      q.opfer = true;
      q.quiet = false;
      // (he was close: he saw the face – unless a helmet hid it)
      q.ist = ist();
      q.d = 1.5;
      q.dark = dark();
    }
    if (cut) PLAY.think(TX.ruftNicht(F.name), 2200);
  });
  // ---- new clothes at the bungalow: a description is worth nothing any more; the moped's plate at the carport ----
  // the warning jacket from the bungalow over the own clothes, or off again: what the police describe does not fit any more
  function umziehen() {
    if (!GL.on || GL.era !== 'heute') return '';
    const seen = S.seen || zeugen().length > 0;
    if (seen && GLLOGIK.stars(GL.W) > 0) {
      PLAY.think(TX.umGesehen, 2600);
      return 'gesehen';
    }
    S.kleidVon[GL.wer] = S.kleidVon[GL.wer] === 'warn' ? '' : 'warn';
    aussehen();
    GLTON.fx('tick');
    const r = GLLOGIK.umziehen(GL.W, { seen });
    if (r === 'frei') {
      // (the police drive home by themselves once the level is calm: GLLOGIK.einsatz)
      PLAY.think(TX.umFrei, 3600);
      GLTON.fx('frei');
      GL.emit('entkommen', { umgezogen: true });
      GL.emit('sterne', { n: 0, bekannt: false });
    } else if (r === 'bekannt') PLAY.think(TX.umBekannt, 3000);
    else PLAY.think(S.kleidVon[GL.wer] ? TX.warnJa : TX.warnNein, 3400);
    GL.emit('kleid', { wer: GL.wer, kleid: ist().kleid });
    return r;
  }
  const BUNG = [9.6, 12.4],
    PORT = [-1.8, 14.4];
  KERN.act({
    id: 'gl-umziehen',
    prio: 4,
    r: 3.2,
    label: () =>
      GL.on && GL.era === 'heute' && !VEH.cur ? (S.kleidVon[GL.wer] === 'warn' ? TX.warnAus : TX.warnAn) : null,
    pos: () => [BUNG[0], BUNG[1], KERN.ground(BUNG[0], BUNG[1])],
    run: umziehen,
  });
  KERN.act({
    id: 'gl-kennzeichen',
    prio: 4,
    r: 4,
    label: () =>
      GL.on &&
      GL.era === 'heute' &&
      !VEH.cur &&
      GL.W.fz &&
      GLAUTO.moped &&
      hyp(GLAUTO.moped.st.x - PORT[0], GLAUTO.moped.st.y - PORT[1]) < 14
        ? TX.schild
        : null,
    pos: () => [PORT[0], PORT[1], KERN.ground(PORT[0], PORT[1])],
    run: () => {
      if (GLLOGIK.umkennzeichnen(GL.W)) {
        PLAY.think(TX.schildOk, 3600);
        GLTON.fx('tick');
      }
    },
  });
  // ---- what the police know: their description grows with every sighting (GLLOGIK.sicht); what of it still fits him (GLLOGIK.wissen)
  //      changes when he changes – both are told on the radio (funkBild below) ----
  function beschrieben(neu) {
    if (!neu || !neu.length) return;
    S.bildNeu = (S.bildNeu || 0) + 1;
    GL.emit('wissen', { neu, wissen: Object.assign({}, S.wissen) });
    funkBild('neu');
  }
  function wissenNeu(fakt, dt) {
    const w = GLLOGIK.wissen(GL.W, fakt),
      a = S.wissen;
    if (w.gesicht === a.gesicht && w.kleidung === a.kleidung && w.fahrzeug === a.fahrzeug) return;
    // what went is what he changed (the police know what they knew: the radio still gives the old description)
    const weg = ['gesicht', 'kleidung', 'fahrzeug'].filter(k => a[k] && !w[k]);
    S.wissen = w;
    S.wissenT = 0;
    GL.emit('wissen', { wissen: Object.assign({}, w), weg });
    if (weg.length && GLLOGIK.stars(GL.W) > 0) funkBild('alt');
  }
  // ---- the radio describes him: fixed fragments said one after another (`stimmen` records each one – linien()); the subtitle shows
  //      the sentence once. On a new wanted level, when the description grows – and when he changed: then the radio still gives the
  //      old description („Weiterhin gesucht …“), and he knows they look for somebody else ----
  const BILD = {
    an: 'Zentrale an alle Streifen.',
    wer: {
      neu: { p: 'Gesucht wird eine Person,', m: 'Gesucht wird Falko,', f: 'Gesucht wird Sarah,' },
      alt: {
        p: 'Weiterhin gesucht wird eine Person,',
        m: 'Weiterhin gesucht wird Falko,',
        f: 'Weiterhin gesucht wird Sarah,',
      },
    },
    sex: { m: 'männlich,', f: 'weiblich,' },
    kleid: {
      karo: 'rotes Karohemd,',
      dunkel: 'dunkle Jacke,',
      hell: 'helle Jacke,',
      warn: 'orange Warnjacke,',
      parka: 'grüner Parka,',
    },
    kopf: { helm: 'mit Helm,', haube: 'mit Sturmhaube,' },
    fz: {
      moped: 'auf einem Moped.',
      trabant: 'in einem Trabant.',
      auto: 'in einem Auto.',
      traktor: 'auf einem Traktor.',
      fuss: 'zu Fuß.',
    },
    dir: {
      schleusingen: 'Richtung Schleusingen.',
      ratscher: 'Richtung Ratscher.',
      talsperre: 'Richtung Talsperre.',
      klinge: 'Richtung Klinge.',
    },
    bei: {
      schleusingen: 'Zuletzt gesehen in Schleusingen.',
      ratscher: 'Zuletzt gesehen in Ratscher.',
      talsperre: 'Zuletzt gesehen an der Talsperre.',
      klinge: 'Zuletzt gesehen an der Klinge.',
      '': 'Letzter Standort unbekannt.',
    },
    kommen: 'Kommen.',
  };
  // the places a direction is given by (the town's bus station, the Anger, the dam, the lower Klinge)
  const RICHT = [
    ['schleusingen', [-1340, 1243], 700],
    ['ratscher', [222, -108], 380],
    ['talsperre', [853, -817], 320],
    ['klinge', [-548, -566], 260],
  ];
  // where he went: the place ahead (within 50° of his way, not the one he is in) – or the place he was last seen at
  function richtung(B) {
    const w = B.wo;
    if (!w) return BILD.bei[''];
    let best = null,
      bd = 1e9;
    for (const [k, c, r] of RICHT) {
      const d = hyp(c[0] - w[0], c[1] - w[1]);
      if (d < r) return BILD.bei[k];
      if (B.hd == null) continue;
      let a = Math.atan2(c[0] - w[0], c[1] - w[1]) - B.hd;
      while (a > Math.PI) a -= 2 * Math.PI;
      while (a < -Math.PI) a += 2 * Math.PI;
      if (Math.abs(a) < 0.87 && d < bd) {
        bd = d;
        best = k;
      }
    }
    if (best) return BILD.dir[best];
    // standing, or nothing ahead: the nearest place
    let nk = '',
      nd = 2600;
    for (const [k, c] of RICHT) {
      const d = hyp(c[0] - w[0], c[1] - w[1]);
      if (d < nd) {
        nd = d;
        nk = k;
      }
    }
    return BILD.bei[nk];
  }
  // the sentence as fragments: alt – the old description, given again after he changed
  function bildTeile(alt) {
    const W = GL.W,
      B = W.bild || GLLOGIK.bildLeer(),
      wer = W.known || B.gesicht ? B.wer || GL.wer : '',
      L = [BILD.an, BILD.wer[alt ? 'alt' : 'neu'][wer || 'p']];
    if (!wer && BILD.sex[B.wer]) L.push(BILD.sex[B.wer]);
    if (BILD.kleid[B.kleid]) L.push(BILD.kleid[B.kleid]);
    if (BILD.kopf[B.kopf]) L.push(BILD.kopf[B.kopf]);
    if (B.fuss) L.push(BILD.fz.fuss);
    else if (W.fz && BILD.fz[B.fz]) L.push(BILD.fz[B.fz]);
    L.push(richtung(B), BILD.kommen);
    return L;
  }
  // the description in words (the HUD, tests)
  const beschreibung = () => (GL.W.state === 'ruhe' ? '' : bildTeile(false).slice(1, -1).join(' '));
  // ask for a description on the radio: art 'stufe' (a new level), 'neu' (the description grew), 'alt' (he changed)
  function funkBild(art) {
    if (!GL.on || GL.era !== 'heute' || GLLOGIK.stars(GL.W) < 1) return;
    const R = S.rf || (S.rf = { want: '', wait: 0, t: 99, busy: false, n: 0, last: '' });
    // (a new level at once; the description at most every 20 s, the old one again at most every 15 s – later, not lost; a moment's
    // wait in any case, so that what they see now is in it)
    if (R.want === 'stufe') return;
    R.want = art;
    R.wait = art === 'stufe' ? 2.5 : Math.max(art === 'alt' ? 1.5 : 2.5, (art === 'alt' ? 15 : 20) - R.t);
  }
  async function funkSprich(alt) {
    const R = S.rf;
    R.busy = true;
    R.t = 0;
    R.n++;
    const L = bildTeile(alt),
      satz = L.join(' ');
    R.last = satz;
    try {
      const ms = Math.max(4200, satz.length * 58),
        // (the subtitles take one line at a time: the radio waits its turn – the voice with it)
        sek = GLHUD.sub('Funk', satz, ms),
        warte = Math.max(0, (Number(sek) || 0) - ms / 1000);
      if (warte > 0.05) await new Promise(res => setTimeout(res, window.FREEZE ? 0 : warte * 1000));
      GLTON.fx('funk');
      GL.emit('funk', { k: alt ? 'bild-alt' : 'bild', text: satz, teile: L });
      for (const t of L) {
        if (!GL.on) break;
        let ok = false;
        try {
          ok = await STIMME.say('gl_funk', t);
        } catch (e) {}
        if (!ok) break; // (no voice to hear: the subtitle says it)
      }
    } finally {
      R.busy = false;
    }
  }
  function funkTick(dt) {
    const R = S.rf;
    if (!R) return;
    R.t += dt;
    if (!R.want || R.busy) return;
    if ((R.wait -= dt) > 0) return;
    // (not in a cut scene, not while another line of the radio is shown)
    if (document.body.dataset.glKino === '1' || S.funkT > 0) return;
    // (the old description only while it is old: seen again since, he is described as he is)
    const w = S.wissen,
      alt = R.want === 'alt' && !(w.kleidung && (w.fahrzeug || !ist().fz));
    R.want = '';
    if (!GL.on || GL.era !== 'heute' || GLLOGIK.stars(GL.W) < 1) return;
    S.funkT = 6;
    funkSprich(alt);
  }
  // every line this module speaks, for the recordings (grenzland/gl_stimmen.js): [who, text]
  function linien() {
    const L = [],
      add = t => L.push(['funk', t]);
    add(BILD.an);
    for (const k of ['neu', 'alt']) for (const w of ['p', 'm', 'f']) add(BILD.wer[k][w]);
    for (const g of ['sex', 'kleid', 'kopf', 'fz', 'dir', 'bei']) for (const t of Object.values(BILD[g])) add(t);
    add(BILD.kommen);
    for (const a of Object.values(FUNK)) for (const t of a) add(t);
    for (const [who, t] of [
      ['polizei1', TX.halt],
      ['polizei2', TX.halt],
      ['polizei1', TX.haltSek],
      ['vopo', TX.halt89],
      ['abv', TX.halt89],
    ])
      L.push([who, t]);
    return L.filter((q, i) => L.findIndex(r => r[0] === q[0] && r[1] === q[1]) === i);
  }
  // ---- the police radio: a line now and then as a subtitle (never while somebody speaks) ----
  function funk(k, pause = 9) {
    const L = FUNK[k];
    if (!L || S.funkT > 0 || !GL.on) return;
    S.funkT = pause;
    const line = L[Math.floor(Math.random() * L.length)],
      sek = GLHUD.sub('Funk', line, 3400),
      warte = Math.max(0, (Number(sek) || 0) - 3.4);
    GL.emit('funk', { k, text: line });
    // (the voice when the subtitle comes: it may wait while somebody speaks)
    setTimeout(
      () => {
        if (!GL.on) return;
        GLTON.fx('funk');
        try {
          STIMME.say('gl_funk', line);
        } catch (e) {}
      },
      window.FREEZE ? 0 : warte * 1000
    );
  }
  // ---- the world the police act in (GLLOGIK.einsatz) ----
  const LOOK = {
    streife: ['streife', { col: '#c9cdd2', band: '#1f4fa8', band2: '#cfe23c', bar: 'balken' }],
    vopo: ['limo89', { col: '#f1f0e8', band: '#2f6b3a', bar: 'rundum' }],
    sek: ['kasten', { col: '#23272c', band: '#3a4048', bar: 'balken' }],
  };
  const WHO = {
    streife: ['polizei1', 'polizei2'],
    vopo: ['vopo', 'vopo'],
    abv: ['abv', 'abv'],
    sek: ['polizei1', 'polizei2'],
  };
  // ---- the officers' figures: made once per search and kept (hidden while they sit in the car), freed when it is over ----
  const pool = [], // { key, F, busy }
    POOL = { pool: true };
  let pending = 0;
  const wer = (kind, i) => {
    const ids = WHO[kind] || WHO.streife,
      id = ids[i % ids.length],
      sek = kind === 'sek';
    return [
      id,
      sek ? { era: GL.era, kleid: 'wache', hut: 'helmschwarz' } : { era: GL.era },
      id + '|' + GL.era + (sek ? '|sek' : ''),
    ];
  };
  // a figure for an officer: a free one of the pool, or a new one (resolves to the pool's entry, taken; null without the files)
  function figur(id, o, key) {
    const q = pool.find(a => a.key === key && !a.busy && a.F && !a.F.gone);
    if (q) {
      q.busy = true;
      return Promise.resolve(q);
    }
    pending++;
    return GLFIG.make(id, o).then(F => {
      pending--;
      if (!F) return null;
      if (!GL.on) {
        GLFIG.drop(F);
        return null;
      }
      F.cop = POOL;
      F.g.visible = false;
      const e = { key, F, busy: true };
      pool.push(e);
      return e;
    });
  }
  function poolDrop() {
    for (const q of pool) if (q.F && !q.F.gone) GLFIG.drop(q.F);
    pool.length = 0;
  }
  const carOf = u => {
    const c = u.c;
    return c && !c.gone ? c : null;
  };
  const back = u => {
    const c = u.c;
    u.s = c.s;
    u.v = c.v;
    u.x = c.x;
    u.y = c.y;
    u.hd = c.hd;
    u.ende = !!c.ende;
  };
  const world = {
    netz,
    los,
    rnd: Math.random,
    maxCops: COARSE ? 2 : 4,
    frei: q => {
      try {
        KERN.pushOut(q, 0.4);
      } catch (e) {}
      return Number.isFinite(q[0] + q[1]);
    },
    spawn(u) {
      const L = LOOK[u.kind] || LOOK.streife;
      u.c = GLAUTO.spawn(L[0], L[1]) || GLAUTO.spawn('streife', LOOK.streife[1]);
      if (u.c) u.c.pol = true; // (the police's own: other modules have vehicles of the mode too)
      // its crew's figures are loaded now, while it is still far (loading and painting a figure takes a moment)
      if (u.st !== 'riegel')
        for (let i = 0; i < (era89() ? 1 : 2); i++) {
          const [id, o, key] = wer(u.kind, i);
          if (pool.length + pending < 4 && !pool.some(q => q.key === key && !q.busy))
            figur(id, o, key).then(q => q && (q.busy = false));
        }
    },
    remove(u) {
      if (u.c) GLAUTO.remove(u.c);
      u.c = null;
      markDirty();
    },
    onLine(u, line, s, v) {
      const c = carOf(u);
      if (!c) return;
      GLAUTO.onLine(c, line, s, v);
      u.line = line;
      back(u);
    },
    drive(u, dt, o) {
      const c = carOf(u);
      if (!c || !c.line) return;
      c.lat = u.lat || 0;
      // the traffic ahead on the same lane, going the same way: the police do not drive through it (a car that stands is passed)
      if (o.halt && GL.era === 'heute')
        for (const a of (VAUTO && VAUTO.cars) || [])
          if (
            a.g.visible &&
            a.v > 2 &&
            Math.abs(a.x - c.x) < 50 &&
            Math.abs(a.y - c.y) < 50 &&
            Math.cos(a.hd - c.hd) > 0.5
          )
            o.halt.push({ x: a.x, y: a.y, r: 0.7, gap: 4 });
      GLAUTO.drive(c, dt, o);
      if (c.ende) c.v = 0; // (at the end of a line that does not end with speed 0 it stands all the same)
      back(u);
    },
    park(u, x, y, hd) {
      const c = carOf(u);
      if (!c) return;
      GLAUTO.park(c, x, y, hd);
      u.line = null;
      back(u);
    },
    copMake(c) {
      const [id, o, key] = wer(c.kind, c.i);
      c.name = (GLDATA.CAST[id] || {}).name || 'Polizist';
      figur(id, o, key).then(q => {
        const F = q && q.F;
        if (!F) {
          // (no figure to show – a phone without the files: he is there all the same, as a voice)
          c.da = !c.gone;
          return;
        }
        if (c.gone || !GL.on) {
          q.busy = false;
          return;
        }
        F.era = GL.era;
        F.cop = c;
        F.r = 38;
        F.knows = !!c.knows;
        F.downT = 0;
        c.F = F;
        // where he was to stand by now (the car has stopped; without a car: where he came round the corner)
        const at = c.unit
          ? [c.unit.x + Math.cos(c.unit.hd) * (c.i ? 1.6 : -1.6), c.unit.y - Math.sin(c.unit.hd) * (c.i ? 1.6 : -1.6)]
          : [c.x, c.y];
        GLFIG.place(F, at[0], at[1], c.hd);
        c.x = F.x;
        c.y = F.y;
        c.da = true;
        GLTON.fx('funk', hyp(F.x - P.x, F.y - P.y), 60);
      });
    },
    copDrop(c) {
      // back into the car: the figure is kept (hidden) while the search lasts – getting out again costs nothing
      const q = c.F && pool.find(a => a.F === c.F);
      if (q) {
        q.busy = false;
        GLFIG.stop(c.F);
        c.F.g.visible = false;
        c.F.cop = POOL;
        markDirty();
      } else if (c.F) GLFIG.drop(c.F);
      c.F = null;
    },
    copStep(c, dt) {
      const F = c.F;
      if (!F) {
        // without a figure: he moves as a point
        if (c.goal) {
          const d = hyp(c.goal[0] - c.x, c.goal[1] - c.y);
          if (d > 0.3) {
            const s = Math.min(d, c.v * dt);
            c.x += ((c.goal[0] - c.x) / d) * s;
            c.y += ((c.goal[1] - c.y) / d) * s;
          }
        }
        return;
      }
      if (F.downT > 0) return;
      if (c.goal) {
        const far = hyp(c.goal[0] - F.x, c.goal[1] - F.y),
          // after him: they run (the figures' run of round 2, GLFIG.go(F, pts, { renn }) – with the old figures they walk fast)
          renn = c.st === 'jagt' && !!GLFIG.geste,
          v = renn ? Math.max(c.v, 3.2) : c.v;
        if (far > 0.5 && (F.st !== 'geht' || !c.went || hyp(c.goal[0] - c.went[0], c.goal[1] - c.went[1]) > 0.45)) {
          c.went = [c.goal[0], c.goal[1]];
          if (renn) GLFIG.go(F, c.goal, { renn: true, v });
          else GLFIG.go(F, c.goal, c.v);
        } else if (F.st === 'geht') F.v = v;
      } else {
        if (F.st === 'geht') GLFIG.stop(F);
        if (c.lookT > 0) F.hd = c.hd;
      }
      c.x = F.x;
      c.y = F.y;
      if (F.st === 'geht' || !(c.lookT > 0)) c.hd = F.hd;
    },
    tat: (id, name) => tat(id, { force: [{ name, police: true }], quiet: true }),
    block: B => blockBuild(B),
    unblock: B => blockDrop(B),
  };
  const E = GLLOGIK.einsatz(world);
  S.cars = E.units;
  S.cops = E.cops;
  // ---- the road block: two cars across the road, cones before them, a sign – put up where GLLOGIK says ----
  let coneGeo = null;
  function cones() {
    if (coneGeo) return coneGeo;
    const k = VPROPS.kit(),
      red = [0.72, 0.09, 0.03],
      white = [0.85, 0.85, 0.82],
      dk = [0.03, 0.03, 0.035];
    // five cones across the road 14 m before the cars, three more narrowing it; a sign on a stand in the middle
    const cone = (x, y) => {
      k.box(x, y, 0.015, 0.36, 0.36, 0.03, 0, dk);
      k.cyl(x, y, 0.03, 0.2, 0.13, 0.1, 8, red, false);
      k.cyl(x, y, 0.2, 0.34, 0.1, 0.075, 8, white, false);
      k.cyl(x, y, 0.34, 0.52, 0.075, 0.035, 8, red, true);
    };
    for (let i = -2; i <= 2; i++) cone(i * 1.5, 14);
    cone(-2.6, 9);
    cone(2.6, 9);
    cone(-2.9, 4.5);
    cone(2.9, 4.5);
    // the sign: a red disc with a white bar, on a post with a foot
    k.box(0, 6.5, 0.03, 0.6, 0.5, 0.06, 0, dk);
    k.cyl(0, 6.5, 0.06, 1.35, 0.025, 0.025, 6, [0.5, 0.5, 0.52], false);
    k.disc(0, 6.52, 1.62, 0, 1, 0.3, red, 16, false);
    k.disc(0, 6.48, 1.62, 0, -1, 0.3, [0.45, 0.45, 0.47], 16, false);
    k.box(0, 6.535, 1.62, 0.42, 0.012, 0.09, 0, white);
    return (coneGeo = k.geo());
  }
  function blockBuild(B) {
    const hd = B.hd,
      cars = [];
    for (const s of [-1, 1]) {
      const c = GLAUTO.spawn('streife', LOOK.streife[1]);
      if (!c) continue;
      GLAUTO.park(
        c,
        B.x + Math.cos(hd) * s * 1.6 - Math.sin(hd) * s * 1.2,
        B.y - Math.sin(hd) * s * 1.6 - Math.cos(hd) * s * 1.2,
        hd + Math.PI / 2 + s * 0.35
      );
      c.blau = true;
      c.pol = true;
      cars.push(c);
    }
    const m = new THREE.Mesh(cones(), VFIG.mat());
    m.userData.noMerge = true;
    m.userData.shared = true;
    m.castShadow = false;
    m.position.set(B.x, KERN.ground(B.x, B.y) || 0, -B.y);
    m.rotation.y = -hd;
    m.name = 'grenzland sperre';
    scene.add(m);
    B.cars = cars;
    B.mesh = m;
    S.block = B;
    // an officer beside the sign, facing the way one comes (not on a phone: every figure costs memory)
    if (!COARSE)
      GLFIG.make('polizei2', { era: 'heute' }).then(F => {
        if (!F) return;
        if (S.block !== B || !GL.on) return GLFIG.drop(F);
        F.cop = { block: true };
        F.r = 45;
        F.knows = false;
        GLFIG.place(
          F,
          B.x + Math.sin(hd) * 6.5 + Math.cos(hd) * 1.5,
          B.y + Math.cos(hd) * 6.5 - Math.sin(hd) * 1.5,
          hd
        );
        B.F = F;
      });
    PLAY.think(T.sperre, 3500);
    funk('sperre', 7);
    GL.emit('sperre', { x: B.x, y: B.y });
    markDirty(true);
  }
  function blockDrop(B) {
    for (const c of B.cars || []) GLAUTO.remove(c);
    if (B.mesh) scene.remove(B.mesh);
    if (B.F) GLFIG.drop(B.F);
    B.cars = [];
    B.mesh = B.F = null;
    if (S.block === B) S.block = null;
    markDirty(true);
  }
  // ---- a flash of blue on the walls at night: one of the game's shared point lights at the nearest beacon (no new lamp) ----
  KERN.lights.borrow({
    id: 'grenzland:blau',
    n: 1,
    prio: 4,
    want: () => GL.on && !!S.blauU && dark(),
    on: ls => {
      const l = ls[0];
      l.color.setHex(0x2a5cff); // (feat/grenzland-licht finds this light by its colour)
      l.distance = 12;
      l.decay = 2;
      l.intensity = 0;
    },
    tick: ls => {
      const l = ls[0],
        u = S.blauU;
      if (!u || !u.c) {
        l.intensity = 0;
        return;
      }
      l.position.set(u.x, (u.c.z || 0) + 2.1, -u.y);
      // (the beacons' own rhythm, feat/grenzland-licht: twice left, twice right)
      l.intensity = GLAUTO.blauPuls
        ? 46 * Math.max(...GLAUTO.blauPuls(GLAUTO.blink || 0))
        : Math.floor((GLAUTO.blink || 0) * 5.5) % 2
          ? 30
          : 4;
    },
  });
  // ---- caught ----
  function erwischt() {
    const W = GL.W,
      n = GLLOGIK.busse(W, GL.geld);
    GL.stats.erwischt++;
    GL.emit('erwischt', { busse: n, sterne: GLLOGIK.stars(W), era: GL.era });
    clear(true);
    GL.W.fz = false; // (the moped is on record now – and given back)
  }
  function clearWorld() {
    S.blauU = null;
    S.last = null;
    S.seen = S.close = false;
    S.wait = 0;
    GLTON.siren(false);
    markDirty();
  }
  // everything of the police away, the level calm (the mode's end, an arrest, a mission's reset)
  function clear(keepLog) {
    E.clear();
    poolDrop();
    // (whatever a restart of the page or an error left behind)
    for (const F of GLFIG.figs.slice()) if (F.cop) GLFIG.drop(F);
    if (S.block) blockDrop(S.block);
    GLLOGIK.clear(GL.W);
    if (!keepLog) GL.W.log.length = 0;
    clearWorld();
  }
  // the mode's end: the own clothes again, no helmet (the figures of the mode are gone already)
  KERN.on('grenzland:stop', () => {
    S.kleidVon = { m: '', f: '' };
    S.haube = false;
    S.wissen = { gesicht: false, kleidung: false, fahrzeug: false };
    if (S.rf) S.rf.want = '';
    try {
      aussehen();
    } catch (e) {}
  });
  // another time, another police: a search does not go on through a flashback (nor out of it)
  KERN.on('grenzland:era', () => {
    if (GL.on && (S.cars.length || S.cops.length || S.block || GLLOGIK.starsOf(GL.W.heat) > 0)) clear(true);
  });
  // ---- what the police did: tell it ----
  function erzaehlen(ev) {
    const [n, d] = ev,
      W = GL.W;
    if (n === 'gesehen') {
      GLHUD.say(T.gesehen, '', 2.5);
      GLTON.fx('stern');
    } else if (n === 'erkannt') PLAY.think(T.erkannt, 3000);
    else if (n === 'verloren') PLAY.think(d.hidden ? T.versteck : T.verloren, 3000);
    else if (n === 'stern') {
      PLAY.think(T.stern, 2400);
      GL.emit('sterne', { n: GLLOGIK.stars(W), bekannt: W.known });
    } else if (n === 'entkommen') {
      GL.stats.entkommen++;
      GL.save();
      GLHUD.say(T.entkommen, '', 4);
      GLTON.fx('frei');
      funk('ende', 6);
      GL.emit('entkommen', {});
      GL.emit('sterne', { n: 0, bekannt: false });
    } else if (n === 'streife') {
      GL.emit('streife', { n: d.n, kind: d.kind });
      if (d.kind === 'sek') funk('sek', 6);
    } else if (n === 'ruf') {
      const c = S.cops.find(q => q.id === d.id);
      GLHUD.sub(
        c && c.name ? c.name : 'Polizist',
        d.kind === 'abv' || d.kind === 'vopo' ? TX.halt89 : d.kind === 'sek' ? TX.haltSek : TX.halt,
        2200
      );
    } else if (n === 'funk') funk(d.was, 10);
    else if (n === 'fahrzeug') PLAY.think(TX.fahrzeug, 2800);
    else if (n === 'durchbruch') {
      GLHUD.say(TX.durch, '', 2.5);
      funk('durch', 5);
    } else if (n === 'zufuss') PLAY.think(d.kind === 'abv' ? TX.abv : TX.zuFuss, 3200);
    else if (n === 'fest') console.warn('grenzland: a patrol car stood for ever and was taken away', JSON.stringify(d));
  }
  // ---- per frame ----
  // (an error in here must not stop the frame for the modules that tick after this one: it is noted once, and the police are called off)
  function tick(dt) {
    if (!GL.on) return;
    try {
      lauf(dt);
    } catch (e) {
      if (!S.err) console.warn('grenzland police', e);
      S.err = String((e && e.stack) || e).slice(0, 400);
      try {
        clear(true);
      } catch (e2) {}
    }
  }
  function lauf(dt) {
    const W = GL.W,
      q = wo(),
      n = GLLOGIK.stars(W),
      full = GLLOGIK.starsOf(W.heat);
    if (S.funkT > 0) S.funkT -= dt;
    if (!S.stimme) {
      S.stimme = true;
      try {
        // (the dispatcher is a woman – as the recordings of feat/grenzland-stimmen have her)
        STIMME.person('gl_funk', { name: 'Funk', g: 'f', age: 41 });
      } catch (e) {}
    }
    // (the looks and the radio's description must never stop the police)
    try {
      aussehen();
      funkTick(dt);
    } catch (e) {
      if (!S.errW) console.warn('grenzland: looks or radio', e);
      S.errW = String((e && e.stack) || e).slice(0, 300);
    }
    // where he is, for the police: indoors, under trees (looked up a few times a second)
    if ((S.coverT -= dt) <= 0) {
      S.coverT = 0.3;
      S.hidden = drinnen(q.x, q.y, P.feet);
      S.cover = !S.hidden && unterBaeumen(q.x, q.y);
      S.krone = !S.hidden && inSquare(q.x, q.y) && unterKrone(q.x, q.y) && !aufStrasse(q.x, q.y);
    }
    // the reports that are through
    for (const r of GLLOGIK.reif(W, dt)) {
      const F = r.ref && r.ref.F;
      if (F && (F.gone || F.downT > 0) && !r.opfer) continue; // (he lies on the ground: this call is not made – his own follows)
      if (r.opfer && !r.quiet) PLAY.think(TX.opfer(r.name), 3200);
      // (what a bystander has reported already is not counted twice in full: the victim adds his word – and whether he knows the two)
      const doppelt = r.opfer && W.log.some(q => q.id === r.id && q.wit > 0 && Math.abs(q.t - CLOCK.t) < 1.5);
      zaehlen(
        r.id,
        [{ name: r.name, knows: r.o.knows }],
        { x: r.x, y: r.y, veh: r.o.fz, v: 0, hd: 0 },
        { quiet: r.quiet || r.opfer, k: doppelt ? 0.25 : r.o.k, ist: r.ist, d: r.d, dark: r.dark, hd: r.hd ?? null }
      );
    }
    // deeds one does by driving: speeding through the village in front of somebody, no helmet in front of the police
    S.speedT -= dt;
    S.helmT -= dt;
    if (q.veh && GL.era === 'heute') {
      if (q.v > 15.5 && S.speedT <= 0 && /Ratscher ·|Anger|Dorf/.test(String(KERN.place(q.x, q.y, 0) || ''))) {
        S.speedT = 25;
        if (zeugen().length) tat('raserei', { quiet: n > 0 });
      }
      if (q.veh.id === 'gl-moped' && !GL.has('helm') && !S.helmTipp && q.v > 2) {
        S.helmTipp = true;
        PLAY.think(TX.helmTipp, 3200);
      }
      if (S.helmT <= 0 && q.veh.id === 'gl-moped' && q.v > 3 && !helmAuf()) {
        S.helmT = 4;
        // only the police mind – and only once per ride past them
        if (S.cars.some(u => u.st !== 'abzug' && hyp(u.x - q.x, u.y - q.y) < 30 && los(u.x, u.y, q.x, q.y))) {
          S.helmT = 90;
          if (tat('helm', { force: [{ name: 'Die Streife', police: true }], quiet: true, k: 0.6 }) && n === 0)
            PLAY.think(TX.helm, 3000);
        }
      }
    }
    // the officers who were shoved over lie for a while (they get up again); a figure another module took away is made again
    for (const c of S.cops)
      if (c.F && c.F.gone) {
        c.F = null;
        c.da = false;
        world.copMake(c);
      } else if (c.F) {
        c.da = !(c.F.downT > 0);
        c.x = c.F.x;
        c.y = c.F.y;
      }
    // the police
    const p = {
      x: q.x,
      y: q.y,
      v: q.v,
      hd: q.hd,
      veh: !!q.veh,
      hidden: S.hidden,
      cover: S.cover,
      sneak: sneak(),
    };
    const fk = ist(),
      wn = GLLOGIK.wissen(W, fk);
    E.tick(dt, p, {
      W,
      era: GL.era,
      dark: dark(),
      off: S.off,
      split: !!GL.getrennt,
      air: S.luft,
      maske: !!fk.kopf,
      fremd: W.look && !wn.gesicht && !wn.kleidung && !wn.fahrzeug,
    });
    for (const ev of E.ev.splice(0)) {
      if (ev[0] === 'erwischt') {
        erwischt();
        return;
      }
      erzaehlen(ev);
    }
    // what the police see now goes into their description; what they know that still fits him
    const fakt = fk;
    if (E.seen && full > 0)
      beschrieben(
        GLLOGIK.sicht(W, fakt, {
          d: E.sichtD,
          dark: dark(),
          fz: W.fz ? undefined : false,
          x: q.x,
          y: q.y,
          hd: q.v > 0.5 ? q.hd : null,
        })
      );
    wissenNeu(fakt, dt);
    // lights and horns; the vans at the far road ends are only drawn from near; the nearest beacon (for its flash on the walls at night)
    let nb = null,
      nd = 70;
    for (const u of S.cars)
      if (u.c) {
        const d = hyp(u.x - q.x, u.y - q.y);
        u.c.blau = !!u.blau;
        u.c.horn = !!u.horn;
        if (u.st === 'riegel') u.c.g.visible = d < 450;
        if (u.blau && u.c.g.visible && d < nd) {
          nd = d;
          nb = u;
        }
      }
    S.blauU = nb;
    GLAUTO.hornAlt = era89();
    // the search is over and everybody has gone: the officers' figures are freed
    if (pool.length && full === 0 && !S.cars.length && !S.cops.length) poolDrop();
    S.seen = E.seen;
    S.close = E.close;
    S.last = E.last;
    S.wait = Math.max(0, E.wait);
    if (full > 0 || S.cars.length || S.cops.length) markDirty();
  }
  // what the display says (the radar of the core reads cars, cops, block, last, heli)
  const stand = () => ({
    sterne: GLLOGIK.stars(GL.W),
    hitze: Math.round(GL.W.heat * 100) / 100,
    bekannt: GL.W.known,
    state: GL.W.state,
    seen: S.seen,
    voll: GLLOGIK.starsOf(GL.W.heat),
    hidden: S.hidden || S.cover,
    drinnen: S.hidden,
    wald: S.cover,
    krone: S.krone,
    fz: GL.W.fz,
    offen: GL.W.offen.map(r => ({ id: r.id, wer: r.name, t: Math.round(r.t * 10) / 10 })),
    // what the police know that still fits him (the HUD's icons) and their description (the radio's words)
    wissen: Object.assign({}, S.wissen),
    bild: Object.assign({}, GL.W.bild || {}),
    beschreibung: beschreibung(),
    cars: S.cars.map(u => ({
      st: u.st,
      kind: u.kind,
      x: Math.round(u.x),
      y: Math.round(u.y),
      v: Math.round(u.v * 10) / 10,
      crew: u.crew !== 'drin',
      // (it sees him now or did within the last four seconds: the radar shows it)
      gesehen: u.lost < 4,
    })),
    cops: S.cops.map(c => ({
      id: c.F ? c.F.id : c.kind,
      x: Math.round(c.x),
      y: Math.round(c.y),
      st: c.st,
      da: !!c.da,
      gesehen: (c.lost ?? 99) < 4,
    })),
    block: S.block ? [Math.round(S.block.x), Math.round(S.block.y)] : null,
    wait: Math.round(S.wait * 10) / 10,
    last: S.last ? S.last.map(Math.round) : null,
    heli: S.heli ? S.heli.map(Math.round) : null,
  });
  Object.assign(S, {
    wo,
    los,
    versteckt,
    unterBaeumen,
    unterKrone,
    drinnen,
    zeugen,
    tat,
    send: () => (S.last ? E.send(era89() ? 'vopo' : 'streife', wo()) : null),
    clear,
    tick,
    stand,
    erwischt,
    umziehen,
    inSquare,
    sneak,
    netz,
    funk,
    E,
    TX,
    ist,
    aussehen,
    haubeAn: haube,
    funkBild,
    bildTeile,
    beschreibung,
    linien,
    BILD,
  });
  return S;
})();
window.GLFAHNDUNG = GLFAHNDUNG;
