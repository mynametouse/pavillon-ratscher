// ===================== feat/grenzland-kapitel2: cracking old cars, repainting, other plates (GLKNACKEN) – Paket D of chapter 2 =====================
// Plan: docs/plans/plan_kapitel2.md, section 4 („Autos knacken: alte Autos mit Draht oder Scheibe, neue gar nicht; Alarm; Besitzer als
// Zeuge; umlackieren in der Feldscheune, Kennzeichen tauschen“). The rules are pure (GLKNLOGIK in grenzland/gl_kapitel2_data.js); here the
// world: a car of the story is set down somewhere (stelle) – an old one is a drivable vehicle of vehicles/vehicle.js (a Wartburg 353,
// 50 PS three-cylinder two-stroke, the body of grenzland/gl_typen.js, its own plates with lettering), locked until it is cracked: the
// wire (E held, quiet; one needs one – GL.inv.draht) or the window (quick, loud: who is near hears it, glass on the ground, then the
// wires of the ignition). A car of today (o.alt false) is a parked vehicle of the mode: whoever tries it sets off its alarm (hazard
// lights, the horn's whoop – heard far). What the police know of a stolen car: the owner's report (melde) – a deed witnessed by the
// owner while one sits in it (the wanted level knows the vehicle), else kept until one drives it again while it still looks the same.
// Repainting (lackieren) and other plates (schildern): the car's own look changes and the police lose the vehicle
// (GLLOGIK.umkennzeichnen: the wanted level's knowledge of the vehicle is cleared). Saved (pav-gl-knacken-v1); a stolen car is set up
// again where it was left when the mode starts – for the missions that follow (4–6).
//   GLKNACKEN.stelle(id, o) → state · auto(id) · fz(id) → the VEH vehicle or null · offen(id) · melde(id, name) · lackieren(id, farbe)
//   schildern(id, kz) · weg(id) · drin(id) · start() · stop() · tick(dt) · stand() · FARBEN
//   o: { typ: 'wartburg' | 'kombi' …, alt, x, y, hd (compass rad), farbe, kz }
// Events: 'grenzland:knacken' { id, st: 'versuch' | 'offen' | 'alarm' | 'drin' | 'gemeldet' | 'lackiert' | 'schilder', weg }
import * as THREE from 'three';
import { scene } from '../core/head.js';
import { KERN } from '../core/kern.js';
import { SAVE } from '../core/save.js';
import { markDirty } from '../core/assets.js';
import { P } from '../game/walkable.js';
import { PLAY } from '../game/play.js';
import { VEH } from '../vehicles/vehicle.js';
import { GL } from './gl_state.js';
import { GLLOGIK } from './gl_logik.js';
import { GLTON } from './gl_ton.js';
import { GLTYPEN } from './gl_typen.js';
import { GLKAROSSE } from './gl_karosse.js';
import { GLMOD } from './gl_modelle.js';
import { GLAUTO } from './gl_auto.js';
import { GLFAHNDUNG } from './gl_fahndung.js';
import { GLKNLOGIK as N } from './gl_kapitel2_data.js';
export const GLKNACKEN = (() => {
  const KEY = SAVE.key('pav-gl-knacken-v1', { owner: 'grenzland-kapitel2', kind: 'json', def: null, check: N.check });
  const VID = 'gl-wartburg',
    HIDE = [GLAUTO.HIDE[0] + 28, GLAUTO.HIDE[1]];
  const S = {
    autos: {}, // id → the state of GLKNLOGIK
    welt: {}, // id → { v: VEH vehicle | null, c: GLAUTO car | null, alarm: 0, splitter: mesh | null }
    veh: null, // the drivable Wartburg (one; made when first needed)
    loaded: false,
    t: 0,
    err: null,
  };
  const TX = {
    draht: 'Mit Draht öffnen',
    drahtFehlt: 'Ohne Draht geht das nicht – die Scheibe ginge.',
    scheibe: 'Scheibe einschlagen',
    kurz: 'Kurzschließen',
    neu: 'Auto aufbrechen',
    alarm: 'Wegfahrsperre und Alarmanlage – der hier ist zu neu.',
    offen: 'Offen. Jetzt die Drähte unter dem Lenkrad.',
    laeuft: 'Er läuft.',
    gesehen: 'Nicht jetzt – da schaut jemand zu.',
  };
  const emit = (st, id, o = {}) => GL.emit('knacken', Object.assign({ id, st }, o));
  // ---- saving ----
  function save() {
    try {
      for (const [id, c] of Object.entries(S.autos)) {
        const w = S.welt[id];
        if (w && w.v && w.v.g.visible) c.pos = [round(w.v.st.x), round(w.v.st.y), round(w.v.st.psi)];
      }
      SAVE.set(KEY, { v: 1, autos: S.autos });
    } catch (e) {}
  }
  const round = q => Math.round(q * 100) / 100;
  function load() {
    if (S.loaded) return;
    S.loaded = true;
    const v = SAVE.get(KEY);
    if (v && v.autos) for (const [id, c] of Object.entries(v.autos)) S.autos[id] = c;
  }
  // ---- the paint of a car's meshes (copies of the player's car's paint: no new shader program) ----
  const lack = farbe => GLMOD.paint(GLKAROSSE.hex(N.FARBEN[farbe] ? N.FARBEN[farbe].hex : '#888888'), 0);
  function anmalen(g, farbe) {
    if (!g) return;
    const m = lack(farbe);
    g.traverse(o => {
      if (o.isMesh && /^lack[01]$/.test(o.name)) o.material = m;
    });
    markDirty(true);
  }
  // ---- the plates: lettering on a white field with the blue band, drawn once per plate (the program of a textured face) ----
  const SCHILD = new Map();
  function schildMat(kz) {
    let m = SCHILD.get(kz);
    if (m) return m;
    const cv = document.createElement('canvas');
    cv.width = 512;
    cv.height = 112;
    const x = cv.getContext('2d');
    x.fillStyle = '#f4f4ef';
    x.fillRect(0, 0, 512, 112);
    x.fillStyle = '#1b3f9a';
    x.fillRect(0, 0, 58, 112);
    x.fillStyle = '#f2d23c';
    for (let i = 0; i < 12; i++) {
      const a = (i / 12) * Math.PI * 2;
      x.beginPath();
      x.arc(29 + Math.sin(a) * 15, 38 + Math.cos(a) * 15, 2.6, 0, Math.PI * 2);
      x.fill();
    }
    x.fillStyle = '#ffffff';
    x.font = 'bold 34px Arial, sans-serif';
    x.textAlign = 'center';
    x.fillText('D', 29, 98);
    x.strokeStyle = '#111111';
    x.lineWidth = 5;
    x.strokeRect(2.5, 2.5, 507, 107);
    x.fillStyle = '#111111';
    x.textBaseline = 'middle';
    let px = 84;
    x.font = 'bold ' + px + 'px "DIN Alternate", "Arial Narrow", Arial, sans-serif';
    const w = x.measureText(kz).width;
    if (w > 430) {
      px = Math.floor((px * 430) / w);
      x.font = 'bold ' + px + 'px "DIN Alternate", "Arial Narrow", Arial, sans-serif';
    }
    x.fillText(kz, 285, 60);
    const tex = new THREE.CanvasTexture(cv);
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.anisotropy = 4;
    m = GLMOD.textured(tex, { roughness: 0.45 });
    m.name = 'grenzland kennzeichen';
    SCHILD.set(kz, m);
    return m;
  }
  // the plate faces of the Wartburg (grenzland/gl_typen.js: 0.46 × 0.105 m, in front at y 2.036, z 0.43; behind at the body's end, z 0.7)
  const SCHILDGEO = new THREE.PlaneGeometry(0.46, 0.105);
  function schilder(g, kz, T) {
    if (!g) return;
    for (const s of g.children.filter(o => o.name === 'kennzeichen')) g.remove(s);
    if (!kz) return;
    const m = schildMat(kz);
    for (const [y, z, dir] of [
      [2.036 + 0.012, 0.43, 1],
      [T.yRm - 0.0155, 0.7, -1],
    ]) {
      const me = GLMOD.own(new THREE.Mesh(SCHILDGEO, m));
      me.name = 'kennzeichen';
      me.position.set(0, z, -y);
      // (a plane faces +z – backwards in the vehicle's frame: the front plate is turned round)
      if (dir > 0) me.rotation.y = Math.PI;
      g.add(me);
    }
    markDirty(true);
  }
  // the rear plate's place: the body's end at 0.7 m (measured once from the body's white plate field)
  function yHinten(N0) {
    let yMin = Infinity;
    try {
      const body = N0.pieces.find(p => p.name === 'body'),
        q = body.parts.matt;
      if (q && q.pos && q.col)
        for (let i = 0; i < q.pos.length; i += 3) {
          const z = q.pos[i + 2],
            y = q.pos[i + 1],
            r = q.col[i];
          if (Math.abs(z - 0.7) < 0.06 && y < -1.5 && r > 0.7) yMin = Math.min(yMin, y);
        }
    } catch (e) {}
    return Number.isFinite(yMin) ? yMin + 0.004 : -2.17;
  }
  // ---- the drivable Wartburg 353: 993 cm³, three cylinders, two strokes, 37 kW (50 PS) at 4250/min, 98 Nm, four gears, front drive,
  //      about 920 kg, some 130 km/h. A two-stroke triple fires three times a turn – the vehicle's sound counts a four-stroke four (two a
  //      turn): every engine speed here is 1.5 × the real one, every torque ÷ 1.5, the final drive × 1.5 – the forces are the real ones,
  //      the note is right (as grenzland/gl_auto.js does for the Simson) ----
  function wartburg(farbe, kz) {
    if (S.veh) return S.veh;
    const base = VEH && VEH.by && VEH.by.car;
    if (!base) return null;
    const N0 = GLTYPEN.bau('wartburg', { col: N.FARBEN[farbe] ? N.FARBEN[farbe].hex : '#e9e6da', einzel: true }),
      T = Object.assign({}, N0.T),
      LM = GLMOD.LM,
      lamps = {
        head: LM.head89.clone(),
        tail: LM.tail.clone(),
        blau: LM.blau,
        blau2: LM.blau2,
        blink: LM.blink.clone(),
      },
      g = new THREE.Group(),
      body = new THREE.Group(),
      Pc = name => N0.pieces.find(p => p.name === name);
    T.yRm = yHinten(N0);
    // (its own lamps start dark: the vehicle switches them with its engine – a copy taken at night would glow while it is parked)
    for (const m of [lamps.head, lamps.tail, lamps.blink]) m.emissiveIntensity = 0;
    g.add(body);
    body.add(GLMOD.meshes(Pc('body'), T, lamps));
    const wheels = [];
    for (const [x, y, steer, drive, pc] of [
      [-T.track / 2, T.a, 1, 1, 'radL'],
      [T.track / 2, T.a, 1, 1, 'radR'],
      [-T.trackR / 2, T.b, 0, 0, 'radL'],
      [T.trackR / 2, T.b, 0, 0, 'radR'],
    ]) {
      const piv = new THREE.Group(),
        node = new THREE.Group();
      piv.position.set(x, T.rw, -y);
      piv.add(node);
      g.add(piv);
      node.add(GLMOD.meshes(Pc(pc), T, lamps));
      wheels.push({ x, y, r: T.rw, w: T.tw, steer, drive, piv, node });
    }
    const model = {
      g,
      body,
      wheels,
      lamps: { head: [lamps.head], tail: [], brake: [lamps.tail], rev: [] },
      beam: [0, T.yf - 0.1, 0.62],
      T,
      update() {},
    };
    const spec = Object.assign({}, base.spec, {
      id: VID,
      name: 'Wartburg 353',
      enterLabel: 'In den Wartburg steigen',
      mass: 990,
      Iz: 1250,
      a: T.a,
      b: -T.b,
      track: T.track,
      hcg: 0.52,
      rw: T.rw,
      mu: 0.92,
      Cf: 46000,
      Cr: 50000,
      steerMax: 0.55,
      steerV: 14,
      steerRate: 2.3,
      steerBack: 4,
      eng: {
        idle: 1200,
        red: 6900,
        launch: 3000,
        drag: 7,
        curve: [
          [1200, 50],
          [2700, 60],
          [4500, 65],
          [6400, 54],
          [7000, 40],
          [7300, 0],
        ],
      },
      gears: [3.46, 2.06, 1.36, 0.97],
      rev: 3.56,
      final: 6.33,
      eff: 0.9,
      split: 1,
      shift: 0.5,
      upAt: t => 3000 + 3300 * t,
      downAt: t => 1800 + 1500 * t,
      brake: 6500,
      brakeF: 0.64,
      hand: true,
      cdA: 0.82,
      dive: 0.009,
      lean: 0.012,
      travel: 0.11,
      susp: 34,
      suspD: 7,
      box: { hw: T.hw, hl: T.hl, cy: T.cy, h: 1.48 },
      eye: [-0.36, -0.28, 1.14],
      door: [-1.2, -0.15],
      reach: 2.2,
      beam: 220,
      beamAngle: 0.5,
      sound: 'petrol',
      cam: { dist: 5.6, height: 1.9, look: 1.1 },
      home: () => [HIDE[0], HIDE[1], 0, false],
    });
    delete spec.L;
    const v = VEH.add(spec, model);
    v.gl = { typ: 'wartburg', zweitakt: 130, sub: 'Dreizylinder-Zweitakter · 50 PS · Baujahr 1987 · Lenkradschaltung' };
    g.traverse(o => {
      if (o.isMesh) o.castShadow = /^lack|^matt$/.test(o.name) && o.geometry.attributes.position.count > 600;
    });
    // locked until it is cracked: the door's label of the vehicle is ours while the car is shut
    const a = KERN.acts().find(q => q.id === 'veh:' + VID);
    if (a) {
      const L0 = a.label;
      KERN.act(
        Object.assign({}, a, {
          label: () => {
            const id = vonVeh(v);
            if (!id || !S.autos[id] || !S.autos[id].offen || !GL.on) return null;
            return L0();
          },
          run: () => {
            const id = vonVeh(v);
            if (!id || !S.autos[id] || !S.autos[id].offen) return;
            VEH.enter(VID);
          },
        })
      );
    }
    anmalen(g, farbe);
    schilder(g, kz, T);
    VEH.place(VID, HIDE[0], HIDE[1], 0);
    g.visible = false;
    S.veh = v;
    return v;
  }
  const vonVeh = v => Object.keys(S.welt).find(id => S.welt[id].v === v) || null;
  // ---- the alarm of a car of today: the hazard lights blink, the horn whoops – synthesised ----
  GLTON.add('k2alarm', (R, t, k) => {
    for (let i = 0; i < 10; i++) {
      GLTON.tone(R, t + i * 0.5, { f0: 1350, f1: 760, type: 'square', peak: 0.09 * k, a: 0.01, d: 0.42 });
      GLTON.tone(R, t + i * 0.5, { f0: 680, f1: 380, type: 'sawtooth', peak: 0.05 * k, a: 0.01, d: 0.42 });
    }
  });
  GLTON.add('k2draht', (R, t, k) => {
    for (let i = 0; i < 6; i++)
      GLTON.tone(R, t + i * 0.11 + Math.random() * 0.04, {
        f0: 2400 + Math.random() * 900,
        type: 'square',
        peak: 0.03 * k,
        d: 0.03,
      });
  });
  GLTON.add('k2glas', (R, t, k) => {
    GLTON.noise(R, t, { peak: 0.5 * k, d: 0.25, f: 4200 });
    for (let i = 0; i < 14; i++)
      GLTON.tone(R, t + 0.05 + i * 0.03 + Math.random() * 0.05, {
        f0: 2600 + Math.random() * 3200,
        type: 'sine',
        peak: 0.06 * k,
        d: 0.08 + Math.random() * 0.12,
      });
  });
  // ---- glass on the ground by the driver's door: small shards in the glass's material ----
  function splitter(v) {
    const pos = [],
      nor = [];
    let s = 9137;
    const r = () => (s = (Math.imul(s, 1664525) + 1013904223) >>> 0) / 4294967296;
    for (let i = 0; i < 46; i++) {
      const cx = -1.05 - r() * 0.7,
        cy = -0.6 + r() * 1.3,
        a = r() * Math.PI,
        l = 0.012 + r() * 0.028;
      for (const [dx, dy] of [
        [0, 0],
        [Math.cos(a) * l, Math.sin(a) * l],
        [Math.cos(a + 1.9) * l * 0.8, Math.sin(a + 1.9) * l * 0.8],
      ]) {
        pos.push(cx + dx, 0.012 + r() * 0.004, -(cy + dy));
        nor.push(0, 1, 0);
      }
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    geo.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3));
    const m = new THREE.Mesh(geo, GLMOD.glass());
    m.name = 'k2splitter';
    m.userData.noMerge = true;
    m.castShadow = m.receiveShadow = false;
    const st = v.st,
      g = new THREE.Group();
    g.add(m);
    g.position.set(st.x, st.z, -st.y);
    g.rotation.y = -st.psi;
    g.name = 'grenzland splitter';
    return g;
  }
  // ---- setting a car down ----
  function stelle(id, o = {}) {
    load();
    let c = S.autos[id];
    if (!c || o.neu) {
      c = N.neu({ id, typ: o.typ, alt: o.alt, farbe: o.farbe, kz: o.kz });
      S.autos[id] = c;
    }
    const w = S.welt[id] || (S.welt[id] = { v: null, c: null, alarm: 0, splitter: null });
    const x = o.x ?? (c.pos ? c.pos[0] : 0),
      y = o.y ?? (c.pos ? c.pos[1] : 0),
      hd = o.hd ?? (c.pos ? c.pos[2] : 0);
    if (c.alt && c.typ === 'wartburg') {
      const v = wartburg(c.farbe, c.kz);
      if (v) {
        // (one drivable Wartburg: another car's world gives it up)
        for (const k of Object.keys(S.welt)) if (k !== id && S.welt[k].v === v) S.welt[k].v = null;
        w.v = v;
        anmalen(v.g, c.farbe);
        schilder(v.g, c.kz, v.model.T);
        VEH.place(VID, x, y, hd);
        v.g.visible = true;
        v.st.engine = false;
        v.st.hand = true;
        markDirty(true);
      }
    } else if (!w.c || w.c.gone) {
      w.c = GLAUTO.spawn(GLAUTO.TYP[c.typ] ? c.typ : 'kombi', {
        col: N.FARBEN[c.farbe] ? N.FARBEN[c.farbe].hex : '#3b3f44',
      });
      if (w.c) {
        GLAUTO.park(w.c, x, y, hd);
        // its own blinkers (the shared ones blink for every car of the mode)
        const bl = GLMOD.LM.blink.clone();
        bl.emissiveIntensity = 0;
        w.c.g.traverse(q => {
          if (q.isMesh && q.name === 'blink') q.material = bl;
        });
        w.blink = bl;
      }
    }
    c.pos = [x, y, hd];
    akte(id);
    save();
    return c;
  }
  // the door of a car: where one stands to crack it (the driver's side, left)
  function tuer(id) {
    const w = S.welt[id];
    if (!w) return null;
    if (w.v) {
      const p = VEH.toW(w.v, -1.2, -0.15);
      return [p[0], p[1], w.v.st.z];
    }
    if (w.c && !w.c.gone) {
      const c = w.c,
        r = [Math.cos(c.hd), -Math.sin(c.hd)];
      return [c.x - r[0] * 1.25, c.y - r[1] * 1.25, c.z];
    }
    return null;
  }
  const nah = id => {
    const p = tuer(id);
    return p && !VEH.cur && !PLAY.seated() && Math.hypot(P.x - p[0], P.y - p[1]) < 1.9 ? p : null;
  };
  // the actions at a car (E): wire, window, the wires; at a car of today one try – and its alarm
  function akte(id) {
    const c = S.autos[id];
    if (!c) return;
    const pos = () => {
      const p = tuer(id);
      return p ? [p[0], p[1], P.feet] : [0, 0, -999];
    };
    if (!c.alt) {
      KERN.act({
        id: 'gl:kn:' + id + ':neu',
        label: () => (GL.on && GL.era === 'heute' && nah(id) && !(S.welt[id] && S.welt[id].alarm > 0) ? TX.neu : null),
        pos,
        r: 1.9,
        hold: 1.2,
        prio: 3,
        run: () => versuch(id, 'draht'),
      });
      return;
    }
    KERN.act({
      id: 'gl:kn:' + id + ':draht',
      label: () => (GL.on && GL.era === 'heute' && !c.offen && !c.scheibe && nah(id) ? TX.draht : null),
      pos,
      r: 1.9,
      hold: () => (GL.has('draht') ? N.WEGE.draht.t : 0.3),
      prio: 3,
      work(k) {
        const n = Math.floor(k * 6);
        if (n !== S.kl) {
          S.kl = n;
          GLTON.fx('k2draht');
        }
      },
      run: () => {
        if (!GL.has('draht')) return void PLAY.think(TX.drahtFehlt, 2400);
        versuch(id, 'draht');
      },
    });
    KERN.act({
      id: 'gl:kn:' + id + ':scheibe',
      label: () => (GL.on && GL.era === 'heute' && !c.offen && !c.scheibe && nah(id) ? TX.scheibe : null),
      pos,
      r: 1.9,
      hold: N.WEGE.scheibe.t,
      prio: 2.9,
      run: () => versuch(id, 'scheibe'),
    });
    KERN.act({
      id: 'gl:kn:' + id + ':kurz',
      label: () => (GL.on && GL.era === 'heute' && c.scheibe && !c.offen && nah(id) ? TX.kurz : null),
      pos,
      r: 1.9,
      hold: N.KURZ.t,
      prio: 3,
      run: () => {
        c.offen = true;
        save();
        rein(id);
      },
    });
  }
  // a try: the rules say what happens; the world shows it and the wanted level hears it
  function versuch(id, weg) {
    const c = S.autos[id],
      w = S.welt[id];
    if (!c || !w) return false;
    const v = N.versuch(c, weg);
    emit('versuch', id, { weg });
    if (v.alarm) {
      w.alarm = N.ALARM.sek;
      GLTON.fx('k2alarm', 0, 300);
      PLAY.think(TX.alarm, 3200);
      GLFAHNDUNG.tat('autoklau', { laut: N.ALARM.laut, k: 0.7 });
      emit('alarm', id, { weg });
      return false;
    }
    if (!v.ok) return false;
    N.oeffnen(c, weg);
    if (v.bruch) {
      GLTON.fx('bruch');
      GLTON.fx('k2glas');
      if (w.v && !w.splitter) {
        w.splitter = splitter(w.v);
        scene.add(w.splitter);
        markDirty(true);
      }
      // (only the glass is open: the wires still have to be found – then it is open and runs)
      c.offen = false;
      GLFAHNDUNG.tat('autoklau', { laut: v.laut });
      PLAY.think(TX.offen, 2600);
    } else {
      // the wire: quiet – only who sees it reports it
      GLFAHNDUNG.tat('autoklau', { quiet: true });
    }
    save();
    emit('offen', id, { weg, scheibe: c.scheibe });
    if (c.offen) rein(id);
    return true;
  }
  // in and the engine on
  function rein(id) {
    const w = S.welt[id],
      c = S.autos[id];
    if (!w || !w.v || !c) return;
    c.gestohlen = true;
    VEH.enter(VID);
    PLAY.think(TX.laeuft, 1800);
    emit('drin', id);
    save();
  }
  const drin = id => !!(VEH.cur && S.welt[id] && VEH.cur === S.welt[id].v);
  // ---- the owner reports the theft: what the police know of the car (colour, plate); a deed now when one sits in it ----
  function melde(id, name) {
    const c = S.autos[id];
    if (!c) return false;
    N.anzeige(c);
    c.melder = String(name || 'Der Besitzer');
    save();
    emit('gemeldet', id, { wer: c.melder });
    if (drin(id)) {
      c.offenMeldung = false;
      GLFAHNDUNG.tat('autoklau', { force: [{ name: c.melder, knows: false }] });
    } else c.offenMeldung = true;
    return true;
  }
  // ---- repaint, plates: the car looks different – the police lose it ----
  function lackieren(id, farbe) {
    const c = S.autos[id],
      w = S.welt[id];
    if (!c || !N.lackieren(c, farbe)) return false;
    if (w && w.v) anmalen(w.v.g, farbe);
    GLLOGIK.umkennzeichnen(GL.W);
    save();
    emit('lackiert', id, { farbe });
    return true;
  }
  function schildern(id, kz) {
    const c = S.autos[id],
      w = S.welt[id];
    if (!c || !N.schildern(c, kz)) return false;
    if (w && w.v) schilder(w.v.g, kz, w.v.model.T);
    GLLOGIK.umkennzeichnen(GL.W);
    save();
    emit('schilder', id, { kz });
    return true;
  }
  // ---- away (the mode stops, a mission sets its stage again): the drivable car far out, a parked one removed ----
  function weg(id) {
    const w = S.welt[id];
    if (!w) return;
    if (w.v) {
      const c = S.autos[id];
      if (c && w.v.g.visible) c.pos = [round(w.v.st.x), round(w.v.st.y), round(w.v.st.psi)];
      if (VEH.cur === w.v) VEH.exit();
      VEH.place(VID, HIDE[0], HIDE[1], 0);
      w.v.g.visible = false;
    }
    if (w.c) GLAUTO.remove(w.c);
    if (w.splitter) {
      scene.remove(w.splitter);
      w.splitter.traverse(q => q.geometry && q.geometry.dispose());
    }
    for (const k of ['draht', 'scheibe', 'kurz', 'neu']) KERN.unact('gl:kn:' + id + ':' + k);
    delete S.welt[id];
    save();
  }
  // a car taken and kept (stolen, cracked) stands where it was left, for the missions that follow
  function start() {
    load();
    for (const [id, c] of Object.entries(S.autos)) if (c.gestohlen && c.alt && c.pos && !S.welt[id]) stelle(id, {});
  }
  function stop() {
    for (const id of Object.keys(S.welt)) weg(id);
    save();
  }
  function boden() {
    for (const w of Object.values(S.welt)) {
      const v = w.v;
      if (v && v.g.visible && VEH.cur !== v && Math.hypot(v.st.u, v.st.v) < 0.2) {
        const z = KERN.ground(v.st.x, v.st.y, v.st.z + 0.5);
        if (Number.isFinite(z) && Math.abs(z - v.st.z) > 0.25) VEH.place(VID, v.st.x, v.st.y, v.st.psi);
      }
      const c = w.c;
      if (c && !c.gone) {
        const z = KERN.ground(c.x, c.y);
        if (Number.isFinite(z) && Math.abs(z - c.z) > 0.25) GLAUTO.park(c, c.x, c.y, c.hd);
      }
    }
  }
  function tick(dt) {
    if (!GL.on) return;
    try {
      for (const [id, w] of Object.entries(S.welt)) {
        // the alarm: hazard lights blink for its seconds
        if (w.alarm > 0) {
          w.alarm -= dt;
          if (w.blink) w.blink.emissiveIntensity = w.alarm > 0 && w.alarm % 0.8 > 0.4 ? 6 : 0;
          markDirty();
        }
        const c = S.autos[id];
        // a report kept until one drives the car again while it still looks the same
        if (c && c.offenMeldung && drin(id) && Math.hypot(VEH.cur.st.u, VEH.cur.st.v) > 2) {
          c.offenMeldung = false;
          const p = N.passt(c);
          if (p.farbe || p.kz)
            GLFAHNDUNG.tat('autoklau', { force: [{ name: c.melder || 'Der Besitzer', knows: false }], k: 0.6 });
        }
      }
      // the ground under a parked car changes when a town's detail comes (a car set down on the coarse ground would hover): once a
      // second, a car nobody drives is set onto the ground again where it stands
      if ((S.bt = (S.bt || 0) + dt) > 1) {
        S.bt = 0;
        boden();
      }
      if ((S.t += dt) > 5) {
        S.t = 0;
        if (Object.keys(S.welt).length) save();
      }
    } catch (e) {
      if (!S.err) console.warn('grenzland knacken', e);
      S.err = String((e && e.message) || e);
    }
  }
  KERN.on('grenzland:start', () => setTimeout(() => GL.on && start(), 0));
  KERN.on('grenzland:stop', () => stop());
  const stand = () => ({
    autos: JSON.parse(JSON.stringify(S.autos)),
    welt: Object.fromEntries(
      Object.entries(S.welt).map(([id, w]) => [
        id,
        {
          fahrbar: !!w.v,
          sichtbar: !!((w.v && w.v.g.visible) || (w.c && !w.c.gone && w.c.g.visible)),
          alarm: Math.max(0, Math.round((w.alarm || 0) * 10) / 10),
          splitter: !!w.splitter,
          x: w.v ? round(w.v.st.x) : w.c ? round(w.c.x) : null,
          y: w.v ? round(w.v.st.y) : w.c ? round(w.c.y) : null,
        },
      ])
    ),
    drin: Object.keys(S.welt).filter(drin),
    err: S.err,
  });
  return {
    S,
    stelle,
    auto: id => S.autos[id] || null,
    fz: id => (S.welt[id] ? S.welt[id].v || null : null),
    wagen: id => (S.welt[id] ? S.welt[id].c || null : null),
    offen: id => !!(S.autos[id] && S.autos[id].offen),
    tuer,
    drin,
    melde,
    lackieren,
    schildern,
    weg,
    start,
    stop,
    tick,
    stand,
    save,
    FARBEN: N.FARBEN,
    VID,
  };
})();
window.GLKNACKEN = GLKNACKEN;
