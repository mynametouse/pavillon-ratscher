// ===================== feat/grenzland-mission: chapter 1 of „Grenzland“ – five missions (GLKAP1) =====================
// 1 „Ein Gefallen“            Friday evening at Schleusingen's Zentralhaltestelle: a stranger presses a parcel into the two's hands – to
//                             Ratscher, the old school (bus, a lift, on foot, or the panel's „Mitfahrgelegenheit“). Nobody waits there.
//                             Sarah has opened it: half of a border map of 1989 with a cross. The phone (T), the radio (R), the garden.
// 2 „Die Clique“              fill the moped from the canister, ride to the field barn, a race along the roads to the dam against Jule.
// 3 „Gerhards Geschichte“     under the Dorflinde Gerhard remembers 10 November 1989: carry Lutz's crate unseen from the school to the
//                             barn, hide it under the straw, wait until the Volkspolizei is gone.
// 4 „Nachts an der Klinge“    the haulier's men reload in the forest at night: one distracts with a banger, the other takes three photos;
//                             a flare, three hollow stars, home over the field tracks.
// 5 „Der Coup“                the other half of the map hangs in the haulier's yard (grenzland/gl_lager.js): plan it quietly or loudly,
//                             break the office open, take the map, bring it to the barn. The closing screen of the chapter.
// The missions are data for the runner (grenzland/gl_mission.js); texts in grenzland/gl_mission_data.js. Places are asked at run time
// (GLDATA.ORTE, GLORTE.P, the village's own data) – another agent's barn or bench may stand a little elsewhere.
import * as THREE from 'three';
import { KERN } from '../core/kern.js';
import { stage } from '../core/head.js';
import { markDirty } from '../core/assets.js';
import { P } from '../game/walkable.js';
import { VEH } from '../vehicles/vehicle.js';
import { VPROPS } from '../world/village_props.js';
import { VFIG } from '../verkehr/verkehr_fig.js';
import { VNETZ } from '../verkehr/verkehr_netz.js';
import { VAUTO } from '../verkehr/verkehr_auto.js';
import { DPEOPLE } from '../dorf/dorf_people.js';
import { CLOCK } from '../time/clock.js';
import { DN } from '../time/daynight.js';
import { DKDATA } from '../world/dorfkern_data.js';
import { DSCHOOL } from '../dorf/dorf_school.js';
import { GLDATA } from './gl_data.js';
import { GL } from './gl_state.js';
import { GLLOGIK } from './gl_logik.js';
import { GLTON } from './gl_ton.js';
import { GLFIG } from './gl_fig.js';
import { GLAUTO } from './gl_auto.js';
import { GLHUD } from './gl_hud.js';
import { GLRADIO } from './gl_radio.js';
import { GLHANDY } from './gl_handy.js';
import { GLFAHNDUNG } from './gl_fahndung.js';
import { GLORTE } from './gl_orte.js';
import { GL89 } from './gl_1989.js';
import { GLLAGER } from './gl_lager.js';
import { GLMDATA, GLMLOGIK } from './gl_mission_data.js';
import { GLMISSION as MI } from './gl_mission.js';
export const GLKAP1 = (() => {
  const O = GLDATA.ORTE,
    T = GLMDATA.T,
    TX = GLMDATA.S,
    hyp = Math.hypot,
    rad = d => (d * Math.PI) / 180;
  const St = MI.St;
  // ---------------- places (asked when needed) ----------------
  const ORT = {
    zh: () => O.zh.pos,
    garten: () => O.garten.pos,
    // two metres in front of the old school's door (dorf/dorf_school.js knows its frame), else the place of the core's data
    schule() {
      try {
        const f = DSCHOOL.frame(),
          u = f.du + (f.dw || 1.1) / 2;
        return [f.ox + f.c * u + f.s * 2, f.oy + f.s * u - f.c * 2];
      } catch (e) {
        return O.schule.pos;
      }
    },
    // in front of the school bus stop's shelter in Ratscher
    halt() {
      const s = DKDATA && DKDATA.open && DKDATA.open.shelter;
      if (!s) return [O.schule.pos[0] + 6, O.schule.pos[1] - 6];
      return [s.c[0] + Math.sin(rad(s.az)) * 2.6, s.c[1] + Math.cos(rad(s.az)) * 2.6];
    },
  };
  const yawTo = (a, b) => (Math.atan2(b[0] - a[0], b[1] - a[1]) * 180) / Math.PI;
  // a point r metres from p towards compass deg, moved out of walls
  function vor(p, deg, r) {
    const q = [p[0] + Math.sin(rad(deg)) * r, p[1] + Math.cos(rad(deg)) * r];
    try {
      KERN.pushOut(q, 0.45);
    } catch (e) {}
    return q;
  }
  const zoneDa = id => {
    try {
      const z = KERN.zones().find(q => q.id === id);
      return !z || z.state === 'ready' || z.state === 'error';
    } catch (e) {
      return true;
    }
  };
  const sleep = ms => new Promise(res => setTimeout(res, window.FREEZE ? 0 : ms));
  // black with words, and light again – a sequence whose step has gone meanwhile (the debug jump, the end) lights up only its own dark
  let fadeN = 0;
  async function dunkel(a, b) {
    const n = ++fadeN;
    await GLHUD.fade(true, a, b);
    return n;
  }
  const hell = n => (n === fadeN ? GLHUD.fade(false) : null);
  // (what the wanted system offers beyond its named interface is asked carefully: another agent rebuilds it tonight)
  const sneak = () => (GLFAHNDUNG.sneak ? !!GLFAHNDUNG.sneak() : !VEH.cur && P.stance !== 'stand');
  const gesehen = () => {
    try {
      return !!GLFAHNDUNG.stand().seen;
    } catch (e) {
      return !!GLFAHNDUNG.seen;
    }
  };
  // the weight that makes a deed worth n stars at once
  const gewicht = (id, n) => {
    try {
      const k = (GLLOGIK.STEPS[n - 1] + 0.05) / GLLOGIK.CRIMES[id].h;
      return Number.isFinite(k) && k > 0 ? k : 3.7;
    } catch (e) {
      return 3.7;
    }
  };
  // a talk as part of a step: starts once, the step goes on when it is over. S.r: 0 not yet, 1 running, 2 done
  function sag(S, key) {
    if (!S.r) {
      S.r = 1;
      MI.rede(key, { done: () => (S.r = 2) });
    }
    return S.r === 2;
  }
  const weg = k => GL.inv[k] > 0 && GL.use(k, GL.inv[k]);
  const morgen = () => {
    MI.uhr(8, 10);
    GL.tage++;
    GL.save();
  };
  // the night passes: black, the next morning, light – true once it is over (S.n: 0 not yet, 1 running, 2 done)
  function schlaf(S, a = T.morgenA, b = T.morgenB) {
    if (!S.n) {
      S.n = 1;
      const g = St.gen;
      (async () => {
        const n = await dunkel(a, b);
        if (St.gen !== g) return void hell(n);
        morgen();
        await sleep(1200);
        await hell(n);
        if (St.gen === g) S.n = 2;
      })();
    }
    return S.n === 2;
  }
  // ================================================================ 1 · Ein Gefallen ================================================================
  // where the stranger waits: some fifteen metres off on open ground, in plain sight of where the two arrive
  function fremderPos() {
    const p = ORT.zh(),
      y0 = O.zh.yaw || 0;
    for (const r of [15, 10, 6])
      for (const da of [-35, 35, -75, 75, 0, -120, 120, 180]) {
        const q = [p[0] + Math.sin(rad(y0 + da)) * r, p[1] + Math.cos(rad(y0 + da)) * r],
          q2 = [q[0], q[1]];
        try {
          KERN.pushOut(q2, 0.7);
        } catch (e) {}
        if (hyp(q2[0] - q[0], q2[1] - q[1]) < 0.05 && GLFAHNDUNG.los(p[0], p[1], q[0], q[1])) return q;
      }
    return vor(p, y0 - 35, 5);
  }
  // the journey nobody has to wait for: a fade, half an hour later at the school bus stop of Ratscher
  async function mitfahren() {
    const g = St.gen;
    if (St.busy) return;
    if (MI.redet()) return void MI.denk('Gleich – erst ausreden lassen.', 2000);
    St.busy = true;
    let n = 0;
    try {
      n = await dunkel(T.mitfahrA, T.mitfahrB);
      if (St.gen === g && GL.on) {
        CLOCK.t += 30;
        try {
          if (DN && DN.active) DN.update(true);
        } catch (e) {}
        const h = ORT.halt();
        MI.hin(h[0], h[1], yawTo(h, ORT.schule()));
        GL.emit('mitfahrt', {});
      }
      await sleep(700);
      await hell(n);
    } finally {
      St.busy = false;
    }
  }
  MI.def({
    id: 'gefallen',
    lohn: '+50 €',
    pause: 5,
    gabe() {
      if (!GL.has('karte1')) GL.add('karte1');
      weg('paket');
    },
    szene(i, A) {
      if (i <= 2) {
        const p = fremderPos();
        A.fig('fremder', 'fremder', p[0], p[1], Math.atan2(ORT.zh()[0] - p[0], ORT.zh()[1] - p[1]));
      }
    },
    steps: [
      {
        id: 'ankunft',
        text: TX.gefallen.ankunft,
        ort: 'Zentralhaltestelle',
        // Friday evening in Schleusingen: black, the town stands, light
        an(S) {
          const g = St.gen,
            zh = ORT.zh();
          (async () => {
            const n = await dunkel('Freitagabend', GLDATA.T.intro);
            if (St.gen !== g) return void hell(n);
            MI.hin(zh[0], zh[1], O.zh.yaw || 0);
            try {
              await KERN.until(() => zoneDa('schleusingen') || St.gen !== g, 90);
            } catch (e) {}
            if (St.gen !== g) return void hell(n);
            // the ground may have changed with the town: stand on it again, the stranger too
            MI.hin(zh[0], zh[1], O.zh.yaw || 0);
            const p = fremderPos();
            MI.A.fig('fremder', 'fremder', p[0], p[1], Math.atan2(zh[0] - p[0], zh[1] - p[1]), { neu: true });
            await sleep(900);
            await hell(n);
            if (St.gen === g) S.da = true;
          })();
        },
        tick: (dt, S) => !!S.da && sag(S, 'ankunft'),
      },
      {
        id: 'fremder',
        cp: 'ankunft',
        text: TX.gefallen.fremder,
        ort: 'Der Fremde',
        ziel: () => {
          const f = MI.F('fremder');
          return f ? [f.x, f.y] : null;
        },
        tick(dt, S) {
          const f = MI.F('fremder');
          if (S.r) return S.r === 2;
          if (!f) {
            // (no figures on this device: the talk alone)
            if (S.t > 5) sag(S, 'fremder');
            return false;
          }
          const d = hyp(f.x - P.x, f.y - P.y);
          if (d < 2.6) {
            GLFIG.stop(f);
            GLFIG.face(f, P.x, P.y);
            sag(S, 'fremder');
          } else if ((S.aim = (S.aim || 0) + dt) > 0.6 || f.st !== 'geht') {
            S.aim = 0;
            const k = (d - 1.7) / d;
            GLFIG.go(f, [f.x + (P.x - f.x) * k, f.y + (P.y - f.y) * k], 1.55);
          }
          return false;
        },
        ab() {
          if (!GL.has('paket')) GL.add('paket');
          GL.earn(50, 'Ein Gefallen');
          MI.denk(T.paket, 4000);
        },
      },
      {
        id: 'heim',
        text: TX.gefallen.heim,
        ort: 'Alte Schule',
        ziel: () => ORT.schule(),
        an(S) {
          MI.extra(T.mitfahr, mitfahren);
          // the stranger is off – he does not look back
          const f = MI.F('fremder');
          if (f) GLFIG.go(f, vor([f.x, f.y], (O.zh.yaw || 0) + 60, 45), 1.8, () => MI.figWeg('fremder'));
          if (S.why === 'weiter') MI.rede('fremderWeg');
        },
        ev: {
          'bus:ein': (d, S) => {
            if (!S.bus && !MI.redet()) {
              S.bus = true;
              MI.rede('bus');
            }
          },
          'verkehr:mitfahrt': (d, S) => {
            if (!S.lift && d.phase === 'ein' && !MI.redet()) {
              S.lift = true;
              MI.rede('anhalter');
            }
          },
        },
        tick: () => MI.zuFuss() && MI.fern(ORT.schule()) < 70,
      },
      {
        id: 'schule',
        text: TX.gefallen.schule,
        ort: 'Alte Schule',
        ziel: () => ORT.schule(),
        tick: (dt, S) => (S.r || (MI.zuFuss() && MI.fern(ORT.schule()) < 5.5)) && sag(S, 'schule'),
      },
      {
        id: 'wechsel',
        text: S => TX.gefallen.wechsel(GL.name(S.wer === GL.wer ? GL.other() : GL.wer)),
        an(S) {
          S.wer = GL.wer;
        },
        // (no second figure on this device: the story goes on without the switch)
        tick: (dt, S) => (S.r || GL.wer !== S.wer || (!MI.partner() && S.t > 14)) && sag(S, 'karte'),
        ab() {
          weg('paket');
          if (!GL.has('karte1')) GL.add('karte1');
        },
      },
      {
        id: 'handy',
        text: TX.gefallen.handy,
        an(S) {
          const [von, text] = GLMDATA.SMS.unbekannt;
          if (!GL.sms.some(q => q.text === text)) {
            GLHANDY.sms(von, text);
            for (const [w, t] of GLMDATA.CHAT.paket) GLHANDY.chat(w, t);
          }
          S.offen0 = GLHANDY.isOpen();
        },
        ev: {
          'grenzland:handy': (d, S) => {
            S.auf = true;
          },
        },
        tick(dt, S) {
          if (GLHANDY.isOpen()) S.auf = true;
          return !!S.auf && !GLHANDY.isOpen() && sag(S, 'sms');
        },
      },
      {
        id: 'radio',
        text: TX.gefallen.radio,
        tick: (dt, S) => (S.r || !!GLRADIO.cur()) && sag(S, 'radio'),
      },
      {
        id: 'nacht',
        text: TX.gefallen.nacht,
        ort: 'Garten',
        ziel: () => ORT.garten(),
        tick: (dt, S) => (S.n || (MI.zuFuss() && MI.fern(ORT.garten()) < 14)) && schlaf(S),
      },
    ],
  });
  // ---------------- small things of the stage: vertex colours in the traffic's material ----------------
  const lin = c => (c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4));
  const L = (r, g, b) => [lin(r / 255), lin(g / 255), lin(b / 255)];
  // a mesh built around the origin by fn(kit), set down at x, y (z: the ground), turned to compass hd
  function ding(fn, x, y, hd = 0, z) {
    const k = VPROPS.kit();
    fn(k);
    const m = new THREE.Mesh(k.geo(), VFIG.mat());
    m.userData.noMerge = true;
    m.castShadow = m.receiveShadow = false;
    const g = z != null ? z : KERN.ground(x, y);
    m.position.set(x, Number.isFinite(g) ? g : 0, -y);
    m.rotation.y = -hd;
    m.name = 'grenzland ding';
    return m;
  }
  const legen = (o, x, y, z, hd) => {
    if (!o) return;
    o.position.set(x, z, -y);
    o.rotation.y = -hd;
    markDirty();
  };
  const sms = key => {
    const [von, text] = GLMDATA.SMS[key];
    if (GL.sms.some(q => q.text === text)) return false;
    GLHANDY.sms(von, text);
    return true;
  };
  const chat = key => {
    for (const [w, t] of GLMDATA.CHAT[key]) GLHANDY.chat(w, t);
  };
  // ================================================================ 2 · Die Clique ================================================================
  ORT.scheune = () => (GLORTE.P && GLORTE.P.scheune) || O.treff.pos;
  ORT.damm = () => O.damm.pos;
  // the race's course: along the roads from the barn to the dam (GLAUTO.route), a checkpoint every two hundred metres
  let RENN = null;
  function renn() {
    const a = ORT.scheune(),
      b = ORT.damm(),
      key = a.join() + '|' + b.join();
    if (RENN && RENN.key === key) return RENN.line ? RENN : null;
    let line = null;
    try {
      line = GLAUTO.route(a, b, { k: 2.2, aLat: 3.4, vEnd: 6 });
    } catch (e) {}
    if (!line || !(line.L > 150)) {
      RENN = { key, line: null };
      return null;
    }
    const at = s => VNETZ.at(line, Math.max(0, Math.min(line.L, s)), {}),
      n = Math.max(3, Math.round(line.L / 200)),
      cps = [];
    for (let i = 1; i <= n; i++) {
      const s = (line.L * i) / n,
        p = at(s);
      cps.push({ s, x: p.x, y: p.y });
    }
    const p0 = at(1.5);
    RENN = { key, line, L: line.L, cps, start: [p0.x, p0.y], hd: p0.hd, end: [cps[n - 1].x, cps[n - 1].y], at };
    return RENN;
  }
  // a rival has reached the end of the course (a line slows down towards its end: the last metres count as there)
  const amZiel = (c, R) => !c || !c.line || !!c.ende || c.s >= R.L - 3.5;
  const CLIQUE = [
    ['jule', 'mj', '#a23a2a', 0, 0],
    ['timo', 'mt', '#2f6b4f', 1.7, 0.5],
    ['basti', 'mb', '#c9a227', -1.6, 1.0],
  ];
  // where the three stand at the barn: off it towards the start of the course, their mopeds behind them
  function amTreff() {
    const s = ORT.scheune(),
      R = renn(),
      t = R ? R.start : [s[0] + 8, s[1] + 8],
      d = Math.max(1, hyp(t[0] - s[0], t[1] - s[1])),
      ux = (t[0] - s[0]) / d,
      uy = (t[1] - s[1]) / d,
      b = Math.min(12, d * 0.45),
      hd = Math.atan2(-ux, -uy);
    return CLIQUE.map(([id, car, col, q, f], i) => ({
      id,
      car,
      col,
      p: [s[0] + ux * (b + f) - uy * q, s[1] + uy * (b + f) + ux * q],
      m: [s[0] + ux * (b + 3) - uy * (i - 1) * 1.4, s[1] + uy * (b + 3) + ux * (i - 1) * 1.4],
      hd,
    }));
  }
  const kanister = k => {
    k.box(0, 0, 0, 0.16, 0.34, 0.42, 0, L(52, 84, 50), true);
    k.box(0, 0.1, 0.42, 0.05, 0.05, 0.05, 0, L(30, 30, 30), true);
    k.box(0, -0.05, 0.42, 0.03, 0.16, 0.03, 0, L(40, 62, 38), true);
  };
  // the rivals onto the course's start, the player's moped behind them
  function aufstellen(S, spieler) {
    const R = renn();
    if (!R) return;
    for (const [key, s, lat] of [
      ['mj', 7.5, -0.8],
      ['mt', 4, 0.8],
    ]) {
      const c = MI.C(key);
      if (!c) continue;
      GLAUTO.onLine(c, R.line, s, 0);
      c.lat = lat;
      GLAUTO.pose(c);
    }
    if (spieler) {
      const p = R.at(0.5);
      GL.tank = Math.max(GL.tank, 2.5);
      if (VEH.cur && VEH.cur.id === 'gl-moped') VEH.place('gl-moped', p.x, p.y, p.hd);
      else {
        if (VEH.cur) VEH.exit();
        GLAUTO.mopedAt(p.x, p.y, p.hd);
        MI.hin(p.x - Math.cos(p.hd) * 1.1, p.y + Math.sin(p.hd) * 1.1, (p.hd * 180) / Math.PI);
      }
    }
  }
  MI.def({
    id: 'clique',
    lohn: '+80 € · 4 Böller',
    pause: 6,
    gabe() {
      if (!GL.has('boeller', 4)) GL.add('boeller', 4 - (GL.inv.boeller || 0));
    },
    szene(i, A) {
      if (i === 0) {
        const m = O.moped,
          a = rad(m.az || 0);
        A.ding('kanister', () => ding(kanister, m.pos[0] + Math.cos(a) * 0.8, m.pos[1] - Math.sin(a) * 0.8, a));
        return;
      }
      const R = renn();
      if (i <= 2 || !R) {
        for (const c of amTreff()) {
          A.fig(c.id, c.id, c.p[0], c.p[1], c.hd, { karte: 'clique' });
          A.auto(c.car, 'moped', c.m[0], c.m[1], c.hd + 1.2, { col: c.col });
        }
      } else if (i <= 4) {
        // start and race: Jule and Timo ride, Basti counts down beside the line
        const T0 = amTreff(),
          b = [R.start[0] + Math.cos(R.hd) * 3.4, R.start[1] - Math.sin(R.hd) * 3.4];
        for (const c of T0) {
          const st = c.id === 'basti';
          A.fig(c.id, c.id, st ? b[0] : c.p[0], st ? b[1] : c.p[1], st ? R.hd - Math.PI / 2 : c.hd, {
            karte: 'clique',
            neu: st && i === 3,
          });
          A.auto(
            c.car,
            'moped',
            st ? b[0] + Math.sin(R.hd) * 1.5 : c.m[0],
            st ? b[1] + Math.cos(R.hd) * 1.5 : c.m[1],
            R.hd,
            { col: c.col }
          );
        }
        A.reiter('jule', 'mj');
        A.reiter('timo', 'mt');
      } else {
        // at the dam
        const e = R.at(R.L - 1.5);
        CLIQUE.slice(0, 2).forEach(([id, car, col], k) => {
          const q = k ? 1 : -1;
          A.fig(id, id, e.x + Math.cos(e.hd) * 2.2 * q, e.y - Math.sin(e.hd) * 2.2 * q, e.hd + Math.PI, {
            karte: 'clique',
          });
          A.auto(car, 'moped', e.x + Math.cos(e.hd) * 1.1 * q, e.y - Math.sin(e.hd) * 1.1 * q, e.hd, { col });
        });
      }
    },
    steps: [
      {
        id: 'tanken',
        text: TX.clique.tanken,
        ort: 'Moped',
        ziel: () => O.moped.pos,
        an(S) {
          sms('jule1');
          // the moped at its place in the garden (unless one sits on it or it stands near already)
          const m = O.moped,
            v = GLAUTO.moped;
          if (
            !(VEH.cur && VEH.cur.id === 'gl-moped') &&
            !(v && v.g.visible && hyp(v.st.x - m.pos[0], v.st.y - m.pos[1]) < 14)
          )
            GLAUTO.mopedAt(m.pos[0], m.pos[1], rad(m.az || 0));
          // refuelling is an action of the mode itself (gl:tanken); a tree without it gets this one
          if (!KERN.acts().some(a => a.id === 'gl:tanken')) {
            S.act = true;
            KERN.act({
              id: 'gl:kanister',
              label: () => (GL.on && GL.tank < 4.4 && !VEH.cur ? T.kanister : null),
              pos: () => {
                const q = GLAUTO.moped;
                return q ? [q.st.x, q.st.y, P.feet] : [m.pos[0], m.pos[1], P.feet];
              },
              r: 2.2,
              hold: 2.4,
              prio: 2,
              run() {
                GL.tank = 5;
                GL.save();
                GLTON.fx('kanister');
                MI.denk(GLDATA.T.tankVoll, 3000);
                GL.emit('getankt', { wo: 'heim' });
              },
            });
          }
        },
        aus(S) {
          if (S.act) KERN.unact('gl:kanister');
        },
        ev: { 'grenzland:getankt': () => true },
        tick: () => GL.tank > 4.5,
      },
      {
        id: 'fahrt',
        text: TX.clique.fahrt,
        ort: 'Feldscheune',
        ziel: () => ORT.scheune(),
        tick: () => MI.fern(ORT.scheune()) < 22,
      },
      {
        id: 'treff',
        text: TX.clique.treff,
        ort: 'Jule',
        ziel: () => {
          const f = MI.F('jule');
          return f ? [f.x, f.y] : ORT.scheune();
        },
        tick(dt, S) {
          const f = MI.F('jule'),
            w = MI.wo();
          return (S.r || (w.v < 2 && (f ? hyp(f.x - w.x, f.y - w.y) < 6.5 : S.t > 6))) && sag(S, 'clique');
        },
      },
      {
        id: 'start',
        text: TX.clique.start,
        ort: 'Startlinie',
        ziel: () => (renn() ? RENN.start : null),
        an(S, why) {
          aufstellen(S, why !== 'weiter');
          if (why === 'nochmal') MI.rede('verloren');
        },
        tick(dt, S) {
          const R = renn();
          // (no roads to race on: the story goes on without the race)
          if (!R) return true;
          const v = VEH.cur,
            w = MI.wo();
          if (S.cd == null) {
            if (v && v.id === 'gl-moped' && hyp(w.x - R.start[0], w.y - R.start[1]) < 12 && w.v < 2.5) {
              S.cd = 3.6;
              S.p0 = [w.x, w.y];
              S.n = -1;
            }
            return false;
          }
          S.cd -= dt;
          const n = Math.min(3, Math.floor(3.6 - S.cd));
          if (n !== S.n) {
            S.n = n;
            GLHUD.say(T.start3[n], n === 3 ? T.startSub : '', n === 3 ? 2.6 : 1.1);
            GLTON.fx(n === 3 ? 'stern' : 'tick');
          }
          if (n < 3 && hyp(w.x - S.p0[0], w.y - S.p0[1]) > 6) {
            S.cd = null;
            GLHUD.say(T.fehlstart, '', 2.5);
            return false;
          }
          return n >= 3;
        },
        ab() {
          chat('rennen');
        },
      },
      {
        id: 'rennen',
        cp: 'start',
        text: TX.clique.rennen,
        ort: 'Staumauer',
        nochmal: [T.verloren, 'Noch einmal von der Scheune.'],
        ziel: S => {
          const R = renn(),
            c = R && R.cps[Math.min(R.cps.length - 1, S.cp || 0)];
          return c ? [c.x, c.y] : null;
        },
        an(S) {
          S.cp = 0;
          S.s = 0;
        },
        tick(dt, S) {
          const R = renn();
          if (!R) return true;
          const w = MI.wo(),
            cp = R.cps[S.cp];
          if (cp && hyp(w.x - cp.x, w.y - cp.y) < 22) {
            S.cp++;
            GLTON.fx('tick');
          }
          const nx = R.cps[S.cp],
            prev = S.cp > 0 ? R.cps[S.cp - 1].s : 0;
          S.s = nx ? Math.max(prev, nx.s - hyp(w.x - nx.x, w.y - nx.y)) : R.L;
          const riv = ['mj', 'mt'].map(MI.C).filter(Boolean);
          riv.forEach((c, k) => GLAUTO.drive(c, dt, { vmax: GLMLOGIK.gummi(c.s - S.s, k ? 12.1 : 12.8), acc: 3 }));
          if ((S.h = (S.h || 0) + dt) > 0.4) {
            S.h = 0;
            GLHUD.hint(
              T.platz(
                GLMLOGIK.platz(
                  S.s,
                  riv.map(c => c.s)
                ),
                riv.length + 1,
                Math.max(0, R.L - S.s)
              )
            );
          }
          if (S.cp >= R.cps.length) {
            GLHUD.say(T.gewonnen, '', 3);
            return true;
          }
          const j = MI.C('mj');
          if (j && amZiel(j, R) && !S.aus) {
            S.aus = true;
            MI.fehl(T.verloren, 'Noch einmal von der Scheune.');
          }
          return false;
        },
      },
      {
        id: 'damm',
        text: TX.clique.damm,
        ort: 'Staumauer',
        ziel: () => (renn() ? RENN.end : ORT.damm()),
        tick(dt, S) {
          // the rivals ride up and get off
          let da = true;
          for (const k of ['mj', 'mt']) {
            const c = MI.C(k);
            if (c && renn() && !amZiel(c, RENN)) {
              GLAUTO.drive(c, dt, { vmax: 16, acc: 3.5 });
              if (k === 'mj') da = false;
            } else if (c && !S[k]) {
              S[k] = true;
              MI.absteigen(k);
            }
          }
          const w = MI.wo();
          return (S.r || (da && w.v < 1.5 && MI.fern(renn() ? RENN.end : ORT.damm()) < 20)) && sag(S, 'damm');
        },
        ab() {
          GL.earn(80, 'Die Clique');
          GL.add('boeller', 4);
          MI.denk(T.lohn2, 4000);
          sms('nebenbei');
        },
      },
    ],
  });
  // ================================================================ 3 · Gerhards Geschichte (1989) ================================================================
  ORT.linde = () => (DKDATA && DKDATA.open && DKDATA.open.linde) || O.linde.pos;
  // Gerhard's place on the round bench of the lime: on its side towards the Anger
  function bank() {
    const l = ORT.linde(),
      a = O.anger.pos,
      hd = Math.atan2(a[0] - l[0], a[1] - l[1]);
    return {
      p: [l[0] + Math.sin(hd) * 1.05, l[1] + Math.cos(hd) * 1.05],
      hd,
      vor: [l[0] + Math.sin(hd) * 2.9, l[1] + Math.cos(hd) * 2.9],
    };
  }
  // the crate stands by the school, on the side of the yard one starts in
  function kistePos() {
    const h = O.schulhof.pos,
      s = O.schule.pos,
      d = Math.max(1, hyp(s[0] - h[0], s[1] - h[1])),
      q = [h[0] + ((s[0] - h[0]) / d) * 3.2, h[1] + ((s[1] - h[1]) / d) * 3.2];
    try {
      KERN.pushOut(q, 0.5);
    } catch (e) {}
    return q;
  }
  const kiste = k => {
    const c = L(74, 82, 62),
      e = L(48, 52, 44);
    k.box(0, 0, 0, 0.62, 0.4, 0.3, 0, c, true);
    k.box(0, 0, 0.3, 0.64, 0.42, 0.035, 0, e, true);
    for (const sx of [-1, 1]) {
      k.box(sx * 0.3, 0, 0.02, 0.03, 0.42, 0.3, 0, e);
      k.box(sx * 0.325, 0, 0.17, 0.02, 0.14, 0.03, 0, L(30, 30, 28), true);
    }
  };
  const stroh = k => {
    const c = L(196, 168, 92),
      c2 = L(170, 142, 74);
    k.box(0, 0, 0, 1.3, 1.0, 0.34, 0.2, c, true);
    k.box(0.1, 0.05, 0.3, 1.0, 0.8, 0.22, -0.3, c2, true);
    k.box(-0.15, -0.1, 0.48, 0.6, 0.5, 0.14, 0.5, c, true);
  };
  const K89 = { trag: false, lx: 0, ly: 0, warn: 0, hide: null, stroh: null };
  const leute = () => (GL89 && GL89.leute) || {};
  // the crate in both arms: it goes where Gerhard goes, he walks slowly and does not run
  function tragen(dt) {
    const o = MI.D('kiste');
    if (!K89.trag) return;
    const dx = P.x - K89.lx,
      dy = P.y - K89.ly,
      d = hyp(dx, dy),
      max = 1.9 * dt;
    if (d > max && d < 3 && dt > 0) {
      P.x = K89.lx + (dx / d) * max;
      P.y = K89.ly + (dy / d) * max;
      if (P.speed > 2) P.speed = 1.9;
      if (d > 2.8 * dt && (K89.warn -= dt) < 0) {
        K89.warn = 12;
        MI.denk(T.kisteLaeuft, 2400);
      }
    }
    K89.lx = P.x;
    K89.ly = P.y;
    const a = rad(Number.isFinite(P.body) ? P.body : P.yaw),
      low = P.stance === 'stand' ? 0.92 : P.stance === 'crouch' ? 0.52 : 0.12;
    legen(o, P.x + Math.sin(a) * 0.42, P.y + Math.cos(a) * 0.42, P.feet + low, a);
  }
  // who sees the crate reports it (the wanted system's own witnesses: the people of 1989, the ABV, the Volkspolizei)
  function zeugen89(dt, S) {
    if ((S.zt = (S.zt || 0) + dt) < 0.5) return;
    S.zt = 0;
    if (S.cool > 0) S.cool -= 0.5;
    if (GLFAHNDUNG.off || S.cool > 0 || !K89.trag) return;
    let Z = [];
    try {
      Z = GLFAHNDUNG.zeugen();
    } catch (e) {}
    if (Z.length) {
      GLFAHNDUNG.tat('kiste');
      S.cool = 14;
    }
  }
  // the ABV on his way: school, yard, Anger, lime – and round again
  function abvTick(dt, S) {
    const f = MI.F('abv');
    if (!f || f.st === 'geht' || f.downT > 0) return;
    const W = [ORT.schule(), O.schulhof.pos, O.anger.pos, O.linde.pos];
    S.ai = ((S.ai || 0) + 1) % W.length;
    GLFIG.go(f, W[S.ai], 1.2);
  }
  const gerhardWeg = S => {
    if ((S.gt = (S.gt || 0) + 1) % 20 === 1)
      try {
        DPEOPLE.hide('gerhard');
      } catch (e) {}
  };
  const stars = () => GLLOGIK.stars(GL.W);
  MI.def({
    id: 'gerhard',
    lohn: 'Gerhards Geschichte',
    pause: 6,
    abbruch() {
      GLFAHNDUNG.off = false;
      K89.trag = false;
      // broken off inside the memory: back to today
      try {
        if (GL.era !== 'heute') GL89.stop();
      } catch (e) {}
      if (K89.hide) {
        const i = GLFAHNDUNG.extra.indexOf(K89.hide);
        if (i >= 0) GLFAHNDUNG.extra.splice(i, 1);
        K89.hide = null;
      }
      KERN.unact('gl:kiste');
      KERN.unact('gl:stroh');
    },
    szene(i, A) {
      // (he stays on his bench until the picture is dark: the memory takes him away, not the step)
      if (i === 0 || i === 6 || (i === 1 && GL.era === 'heute')) {
        const b = bank();
        A.fig('gerhard', 'gerhard', b.p[0], b.p[1], b.hd, { sitz: 0.47, era: 'heute' });
        if (i !== 1) return;
      }
      // 1989: the crate, the ABV, and – while the village of the time has no people of its own – two neighbours as witnesses
      if (i <= 4) {
        const q = kistePos();
        A.ding('kiste', () => ding(kiste, q[0], q[1], 0.4));
      } else if (K89.stroh) A.ding('stroh', () => ding(stroh, K89.stroh[0], K89.stroh[1], K89.stroh[2]));
      const o = { era: '1989', sees: true, knows: true };
      if (!leute().abv) {
        const a = O.anger.pos;
        A.fig('abv', 'abv', a[0] + 6, a[1] - 4, 0, Object.assign({ r: 34, ready: F => (F.lampe = true) }, o));
      }
      if (Object.keys(leute()).length < 2) {
        const l = O.linde.pos,
          w = O.wagen.pos;
        A.fig('erna', 'erna', l[0] + 3, l[1] - 3, 1, o);
        A.fig('horst', 'horst', w[0] - 2, w[1] + 3, 4, o);
      }
    },
    steps: [
      {
        id: 'linde',
        text: TX.gerhard.linde,
        ort: 'Dorflinde',
        ziel: () => bank().vor,
        tick(dt, S) {
          gerhardWeg(S);
          return (S.r || (MI.zuFuss() && MI.fern(bank().p) < 3.6)) && sag(S, 'gerhard1');
        },
      },
      {
        id: 'damals',
        text: TX.gerhard.damals,
        // into the memory (or, caught in it, back to its beginning)
        an(S, why) {
          const g = St.gen,
            h = O.schulhof.pos,
            q = kistePos(),
            yaw = yawTo(h, q);
          K89.trag = false;
          GLFAHNDUNG.clear();
          GLFAHNDUNG.off = true;
          legen(MI.D('kiste'), q[0], q[1], KERN.ground(q[0], q[1]), 0.4);
          if (GL.era === '1989') {
            MI.hin(h[0], h[1], yaw);
            S.da = true;
            if (why === 'nochmal') S.r = 2;
            return;
          }
          (async () => {
            try {
              await GL89.enter({ pos: h, yaw });
            } catch (e) {
              console.warn('grenzland 1989', e);
            }
            if (St.gen !== g) return;
            MI.figWeg('gerhard');
            S.da = true;
          })();
        },
        tick: (dt, S) => !!S.da && sag(S, 'damals'),
      },
      {
        id: 'kiste',
        cp: 'damals',
        text: TX.gerhard.kiste,
        ort: 'Kiste',
        ziel: () => kistePos(),
        an(S) {
          KERN.act({
            id: 'gl:kiste',
            label: () => (GL.on && !K89.trag ? T.kisteNimm : null),
            pos: () => {
              const q = kistePos();
              return [q[0], q[1], P.feet];
            },
            r: 1.9,
            hold: 1.6,
            prio: 3,
            run() {
              K89.trag = true;
              K89.lx = P.x;
              K89.ly = P.y;
              GLTON.fx('wurf');
            },
          });
        },
        aus() {
          KERN.unact('gl:kiste');
        },
        tick: () => K89.trag,
        ab() {
          if (!K89.trag) {
            K89.trag = true;
            K89.lx = P.x;
            K89.ly = P.y;
          }
          MI.rede('kisteDa');
        },
      },
      {
        id: 'weg',
        cp: 'damals',
        text: TX.gerhard.weg,
        ort: 'Feldscheune',
        ziel: () => ORT.scheune(),
        tick(dt, S) {
          tragen(dt);
          // the first minute is quiet: everybody listens to the radio
          if (GLFAHNDUNG.off && S.t > 60) GLFAHNDUNG.off = false;
          zeugen89(dt, S);
          abvTick(dt, S);
          return MI.fern(ORT.scheune()) < 7;
        },
      },
      {
        id: 'stroh',
        cp: 'damals',
        text: TX.gerhard.stroh,
        ort: 'Feldscheune',
        ziel: () => ORT.scheune(),
        an(S) {
          GLFAHNDUNG.off = false;
          KERN.act({
            id: 'gl:stroh',
            label: () => (GL.on && K89.trag && MI.fern(ORT.scheune()) < 8 ? T.kisteStroh : null),
            pos: () => [P.x, P.y, P.feet],
            r: 2,
            hold: 2.5,
            prio: 3,
            gest3: 'pickupLow',
            run() {
              if (gesehen()) return void MI.denk(T.kisteSicht, 2500);
              S.fertig = true;
            },
          });
        },
        aus() {
          KERN.unact('gl:stroh');
        },
        tick(dt, S) {
          tragen(dt);
          zeugen89(dt, S);
          abvTick(dt, S);
          return !!S.fertig;
        },
        ab() {
          // the crate on the ground where he stands, straw over it
          K89.trag = false;
          const a = rad(P.yaw),
            x = P.x + Math.sin(a) * 0.7,
            y = P.y + Math.cos(a) * 0.7;
          MI.dingWeg('kiste');
          K89.stroh = [x, y, a];
          MI.A.ding('stroh', () => ding(stroh, x, y, a));
          K89.hide = { x: ORT.scheune()[0], y: ORT.scheune()[1], r: 9 };
          GLFAHNDUNG.extra.push(K89.hide);
          GLTON.fx('wurf');
          MI.rede('stroh');
        },
      },
      {
        id: 'warten',
        cp: 'damals',
        text: TX.gerhard.warten,
        ort: 'Feldscheune',
        ziel: () => ORT.scheune(),
        tick(dt, S) {
          abvTick(dt, S);
          if (MI.fern(ORT.scheune()) > 10) S.ruhe = 0;
          else if (stars() === 0 && !MI.redet()) S.ruhe = (S.ruhe || 0) + dt;
          return S.ruhe > 6;
        },
        aus() {
          if (K89.hide) {
            const i = GLFAHNDUNG.extra.indexOf(K89.hide);
            if (i >= 0) GLFAHNDUNG.extra.splice(i, 1);
            K89.hide = null;
          }
        },
        ab() {
          MI.denk(T.luftRein, 2500);
        },
      },
      {
        id: 'heute',
        text: TX.gerhard.heute,
        ort: 'Dorflinde',
        // back under the lime, today
        an(S) {
          const g = St.gen,
            b = bank();
          GLFAHNDUNG.off = false;
          K89.trag = false;
          (async () => {
            try {
              if (GL.era !== 'heute') await GL89.leave();
            } catch (e) {
              console.warn('grenzland 1989', e);
            }
            if (St.gen !== g) return;
            GLFAHNDUNG.clear();
            MI.hin(b.vor[0], b.vor[1], yawTo(b.vor, b.p));
            S.da = true;
          })();
        },
        tick(dt, S) {
          gerhardWeg(S);
          return !!S.da && sag(S, 'gerhard2');
        },
      },
    ],
  });
  // ================================================================ 4 · Nachts an der Klinge ================================================================
  ORT.klinge = () => O.klinge.pos;
  const dark = () => !!(VAUTO.dark && VAUTO.dark());
  // which way a track runs at a place: the compass heading along which the road goes on, both ways
  function wegRichtung(x, y) {
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
  // the van on the forest track, its three men behind and beside it, the crates
  let K4 = { n: 0, W: [], job: 'laden', lure: null };
  function szeneKlinge() {
    const v = ORT.klinge();
    if (K4.key === v.join()) return K4;
    const hd = wegRichtung(v[0], v[1]),
      f = [Math.sin(hd), Math.cos(hd)],
      r = [Math.cos(hd), -Math.sin(hd)],
      at = (a, b) => [v[0] + f[0] * a + r[0] * b, v[1] + f[1] * a + r[1] * b],
      g = O.garten.pos,
      d = Math.max(1, hyp(g[0] - v[0], g[1] - v[1]));
    K4 = Object.assign(K4, {
      key: v.join(),
      van: v,
      hd,
      men: [
        ['w1', 'wache1', at(-4.4, 1.2), hd + 2.6],
        ['w2', 'wache2', at(-5.0, -1.3), hd - 2.4],
        ['w3', 'wache3', at(1.0, 1.9), hd + 1.6],
      ],
      kisten: at(-5.6, 0),
      // where one comes from (and starts again): seventy metres off, on the side of the garden
      vorn: vor([v[0] + ((g[0] - v[0]) / d) * 70, v[1] + ((g[1] - v[1]) / d) * 70], 0, 0),
    });
    return K4;
  }
  const stapel = k => {
    const c = L(74, 82, 62),
      e = L(48, 52, 44);
    for (const [x, y, z, a] of [
      [0, 0, 0, 0.1],
      [0.72, 0.1, 0, -0.2],
      [0.3, 0.05, 0.34, 0.3],
    ]) {
      k.box(x, y, z, 0.62, 0.4, 0.3, a, c, true);
      k.box(x, y, z + 0.3, 0.64, 0.42, 0.035, a, e, true);
    }
  };
  function maennerHeim() {
    K4.job = 'laden';
    K4.lure = null;
    for (const [key, , p, hd] of K4.men) {
      const f = MI.F(key);
      if (f && !f.gone) GLFIG.go(f, p, 1.4, q => (q.hd = hd));
    }
  }
  // the men at the van: they see with their eyes (the dark and ducking help), a bang draws two of them away, who is seen is chased
  function maenner(dt, S) {
    const w = MI.wo(),
      dk = dark(),
      snk = sneak();
    let alarm = false,
      near = 1e9;
    K4.men.forEach(([key], i) => {
      const f = MI.F(key);
      if (!f) return;
      const W = K4.W[i] || (K4.W[i] = GLMLOGIK.wache()),
        d = hyp(f.x - w.x, f.y - w.y),
        // a rattling moped is heard long before it is seen
        sees = w.veh
          ? d < 45
          : GLLOGIK.sieht({ x: f.x, y: f.y, hd: f.hd, r: 36 }, w.x, w.y, { dark: dk, sneak: snk }) &&
            GLFAHNDUNG.los(f.x, f.y, w.x, w.y);
      near = Math.min(near, d);
      if (GLMLOGIK.wachsam(W, dt, { sees, d }) === 'alarm' && K4.job !== 'jagt') {
        K4.job = 'jagt';
        K4.lure = null;
        S.aim = 9;
        MI.rede('entdeckt');
        GLHUD.say(T.gesehen, T.gesehenSub, 3.5);
      }
      if (W.st === 'alarm') alarm = true;
    });
    if (K4.job === 'jagt') {
      if (!alarm) {
        MI.rede('verlorenWache');
        maennerHeim();
      } else {
        if ((S.aim = (S.aim || 0) + dt) > 0.5) {
          S.aim = 0;
          for (const [key] of K4.men) {
            const f = MI.F(key);
            if (f) GLFIG.go(f, [w.x, w.y], 2.3);
          }
        }
        if (near < 1.5 && !w.veh && !S.aus) {
          S.aus = true;
          MI.fehl(T.geschnappt, T.geschnapptSub);
        }
      }
    } else if (K4.lure && (K4.lure.t -= dt) <= 0) maennerHeim();
  }
  // a bang near the van: two go and look, the third turns his head that way
  function knall(d, S) {
    if (K4.job === 'jagt' || !K4.van) return;
    const dv = hyp(d.x - K4.van[0], d.y - K4.van[1]);
    if (dv > 170) return;
    K4.lure = { x: d.x, y: d.y, t: 46 };
    K4.men.forEach(([key], i) => {
      const f = MI.F(key);
      if (!f) return;
      if (i < 2 && dv > 22) GLFIG.go(f, [d.x + (i ? 1.5 : -1.5), d.y + (i ? -1 : 1)], 1.8);
      else GLFIG.face(f, d.x, d.y);
    });
    if (dv > 22) S.gelenkt = true;
    if (!MI.redet()) MI.rede('knall');
  }
  // ---------------- (feat/grenzland-kino) the viewfinder while one aims at the van: frame, focus, counter; a flash on each photo ----------------
  const SUCHER_CSS = `
#glsucher{position:absolute;inset:0;z-index:5;pointer-events:none;opacity:0;transition:opacity .25s;color:#fff}
#glsucher.on{opacity:1}
#glsucher .sr{position:absolute;inset:15% 19%;border:1px solid rgba(255,255,255,.18)}
#glsucher .sr i{position:absolute;width:30px;height:30px;border:2px solid rgba(255,255,255,.92);filter:drop-shadow(0 0 2px rgba(0,0,0,.9))}
#glsucher .sr i:nth-child(1){left:-2px;top:-2px;border-right:0;border-bottom:0} #glsucher .sr i:nth-child(2){right:-2px;top:-2px;border-left:0;border-bottom:0}
#glsucher .sr i:nth-child(3){left:-2px;bottom:-2px;border-right:0;border-top:0} #glsucher .sr i:nth-child(4){right:-2px;bottom:-2px;border-left:0;border-top:0}
#glsucher .sm{position:absolute;left:50%;top:50%;width:24px;height:24px;margin:-12px;border:1.5px solid rgba(255,255,255,.85);border-radius:50%}
#glsucher .sm::after{content:'';position:absolute;left:50%;top:50%;width:4px;height:4px;margin:-2px;border-radius:50%;background:#fff}
#glsucher.gut .sr i,#glsucher.gut .sm{border-color:#8fe08a} #glsucher.gut .sm::after{background:#8fe08a}
#glsucher .si{position:absolute;left:50%;top:calc(15% + 9px);transform:translateX(-50%);font:600 12px/1 var(--f-mono,monospace);letter-spacing:.09em;
  background:rgba(0,0,0,.5);padding:6px 10px;border-radius:6px;white-space:nowrap}
#glsucher .si b{color:#ff5a4a;margin-right:6px}
#glsucher .sb{position:absolute;inset:0;background:#fff;opacity:0}
#glsucher.klick .sb{animation:glsblitz .4s ease-out}
@keyframes glsblitz{0%{opacity:.9}100%{opacity:0}}
`;
  const SU = { el: null, on: false, t: 0 };
  function sucherEl() {
    if (SU.el) return SU.el;
    const st = document.createElement('style');
    st.textContent = SUCHER_CSS;
    document.head.appendChild(st);
    const d = document.createElement('div');
    d.id = 'glsucher';
    d.innerHTML =
      '<div class="sr"><i></i><i></i><i></i><i></i></div><div class="sm"></div><div class="si"></div><div class="sb"></div>';
    (stage || document.body).appendChild(d);
    return (SU.el = d);
  }
  // aiming: in the photo steps, on foot, the van ahead (within 35° of the view) and not too far
  function sucher(dt) {
    if ((SU.t += dt) < 0.12) return;
    SU.t = 0;
    const v = K4.van,
      phone = window.GLHANDY && GLHANDY.S && GLHANDY.S.camOn;
    let on = false,
      gut = false,
      d = 0;
    if (v && K4.n < 3 && !VEH.cur && !phone && GL.on) {
      d = MI.fern(v);
      let a = (Math.atan2(v[0] - P.x, v[1] - P.y) * 180) / Math.PI - P.yaw;
      a = ((a + 540) % 360) - 180;
      on = d < 60 && Math.abs(a) < 35;
      gut = on && d <= 40 && GLFAHNDUNG.los(P.x, P.y, v[0], v[1]);
    }
    if (!on && !SU.on) return;
    const el = sucherEl();
    SU.on = on;
    el.classList.toggle('on', on);
    el.classList.toggle('gut', gut);
    if (on)
      el.querySelector('.si').innerHTML =
        '<b>●</b>FOTO ' + K4.n + '/3 · ' + Math.round(d) + ' m' + (gut ? '' : d > 40 ? ' · zu weit' : ' · keine Sicht');
  }
  function sucherAus() {
    SU.on = false;
    if (SU.el) SU.el.classList.remove('on', 'gut');
  }
  // the shutter: a flash on the viewfinder, and the picture for the phone's gallery where the phone keeps one (agent welt)
  function klick() {
    const el = sucherEl();
    el.classList.remove('klick');
    void el.offsetWidth;
    el.classList.add('klick');
    const H = window.GLHANDY,
      put = H && (H.bild || H.galerie);
    if (typeof put !== 'function' || window.FREEZE) return;
    try {
      if (window.GAME && GAME.shot) GAME.shot();
      const cv = stage.querySelector('canvas'),
        c = document.createElement('canvas'),
        w = 320,
        h = Math.round((w * cv.height) / Math.max(1, cv.width));
      c.width = w;
      c.height = h;
      c.getContext('2d').drawImage(cv, 0, 0, w, h);
      put.call(H, c.toDataURL('image/jpeg', 0.72), { titel: 'Untere Klinge', n: K4.n, von: 'mission' });
    } catch (e) {}
  }
  KERN.on('grenzland:foto', () => {
    if (GL.on && SU.el) klick();
  });
  function fotoAn(S) {
    try {
      GLHANDY.kamera({
        ziel: K4.van,
        r: 40,
        n: Math.max(1, 3 - K4.n),
        sicht: () => GLFAHNDUNG.los(P.x, P.y, K4.van[0], K4.van[1]),
        done: () => (K4.n = 3),
      });
    } catch (e) {}
    KERN.act({
      id: 'gl:foto',
      label: () => (GL.on && K4.n < 3 && !VEH.cur && MI.fern(K4.van) < 60 ? T.foto + ' (' + K4.n + '/3)' : null),
      pos: () => [P.x, P.y, P.feet],
      r: 2,
      prio: 2,
      gest3: '',
      run() {
        if (K4.ft > 0) return;
        if (MI.fern(K4.van) > 40) return void MI.denk(T.fotoFern, 1800);
        if (!GLFAHNDUNG.los(P.x, P.y, K4.van[0], K4.van[1])) return void MI.denk(T.fotoSicht, 1800);
        K4.n++;
        K4.ft = 1.1;
        GLTON.fx('foto');
        GL.emit('foto', { n: K4.n, von: 'mission' });
        if (K4.n < 3) MI.denk(T.fotoN(K4.n), 1500);
      },
    });
  }
  function fotoAus() {
    KERN.unact('gl:foto');
    sucherAus();
    try {
      GLHANDY.kamera(null);
    } catch (e) {}
  }
  const leuchtkugel = () => {
    const k = VPROPS.kit();
    k.ball(0, 0, 0, 0.5, [1, 1, 1], 8);
    const mat = VAUTO.LM.tail.clone();
    mat.emissive.setHex(0xff3a20);
    mat.emissiveIntensity = 9;
    const m = new THREE.Mesh(k.geo(), mat);
    m.userData.noMerge = true;
    m.castShadow = m.receiveShadow = false;
    m.userData.mat = mat;
    m.name = 'grenzland leuchtkugel';
    return m;
  };
  MI.def({
    id: 'klinge',
    lohn: '3 Fotos',
    pause: 5,
    gabe() {
      if (!GL.has('fotos')) GL.add('fotos', 3);
    },
    abbruch() {
      fotoAus();
    },
    szene(i, A) {
      if (i < 1 || i > 4) return;
      const K = szeneKlinge();
      A.auto('van', 'kasten', K.van[0], K.van[1], K.hd, { col: '#d9d9d2' });
      if (i <= 3) {
        for (const [key, cast, p, hd] of K.men)
          A.fig(key, cast, p[0], p[1], hd, { karte: 'feind', ready: F => (F.lampe = true) });
        A.ding('kisten', () => ding(stapel, K.kisten[0], K.kisten[1], K.hd));
      }
    },
    steps: [
      {
        id: 'abend',
        text: TX.klinge.abend,
        ort: 'Untere Klinge',
        ziel: () => ORT.klinge(),
        an() {
          sms('jule2');
          MI.extra(T.abend, () => {
            if (!GLMLOGIK.nacht(CLOCK.t) && !CLOCK.warp) CLOCK.wait(GLMLOGIK.bis(CLOCK.t, 22, 30), 'Warten');
          });
          if (!GL.has('boeller')) {
            GL.add('boeller', 2);
            MI.denk(T.boellerDa, 3500);
          }
        },
        tick(dt, S) {
          if (MI.fern(ORT.klinge()) > 95) return false;
          if (dark()) return true;
          if (!S.hell) {
            S.hell = true;
            MI.denk(T.nochHell, 4000);
          }
          return false;
        },
      },
      {
        id: 'ansehen',
        text: TX.klinge.ansehen,
        ort: 'Untere Klinge',
        ziel: () => ORT.klinge(),
        an() {
          K4.n = 0;
          K4.W = [];
          K4.job = 'laden';
          K4.lure = null;
        },
        tick: (dt, S) => (S.r || MI.fern(ORT.klinge()) < 62) && sag(S, 'klinge'),
      },
      {
        id: 'ablenken',
        text: () => TX.klinge.ablenken(GL.name(GL.other())),
        ort: 'Untere Klinge',
        nochmal: [T.geschnappt, T.geschnapptSub],
        ziel: () => ORT.klinge(),
        // (also where one starts again: at the forest's edge, the photos gone, the men calm at the van)
        an(S, why) {
          const K = szeneKlinge();
          if (why !== 'weiter') {
            K4.n = 0;
            K4.W = [];
            K4.job = 'laden';
            K4.lure = null;
            if (!dark()) MI.uhr(23, 5);
            MI.hin(K.vorn[0], K.vorn[1], yawTo(K.vorn, K.van));
            for (const [key, , p, hd] of K.men) {
              const f = MI.F(key);
              if (f) GLFIG.place(f, p[0], p[1], hd);
            }
            if (!GL.has('boeller')) GL.add('boeller', 2);
          }
          K4.ft = 0;
          fotoAn(S);
        },
        aus(S, why) {
          if (why !== 'fertig' && why !== 'skip') fotoAus();
        },
        ev: {
          'grenzland:boeller': (d, S) => void knall(d, S),
          'grenzland:foto': d => {
            if (d.von !== 'mission' && d.n > K4.n) K4.n = d.n;
          },
        },
        tick(dt, S) {
          if (K4.ft > 0) K4.ft -= dt;
          maenner(dt, S);
          sucher(dt);
          return !!S.gelenkt || K4.n > 0;
        },
      },
      {
        id: 'fotos',
        cp: 'ablenken',
        text: () => TX.klinge.fotos(K4.n),
        ort: 'Untere Klinge',
        nochmal: [T.geschnappt, T.geschnapptSub],
        ziel: () => ORT.klinge(),
        an(S) {
          if (!KERN.acts().some(a => a.id === 'gl:foto')) fotoAn(S);
        },
        aus() {
          fotoAus();
        },
        ev: {
          'grenzland:boeller': (d, S) => void knall(d, S),
          'grenzland:foto': d => {
            if (d.von !== 'mission' && d.n > K4.n) K4.n = d.n;
          },
        },
        tick(dt, S) {
          if (K4.ft > 0) K4.ft -= dt;
          maenner(dt, S);
          sucher(dt);
          GLHUD.hint('Fotos: ' + K4.n + ' von 3');
          return K4.n >= 3;
        },
        ab() {
          K4.n = 3;
          if (!GL.has('fotos')) GL.add('fotos', 3);
        },
      },
      {
        id: 'flucht',
        text: S => (S.frei ? TX.klinge.heim : TX.klinge.flucht),
        ort: 'Garten',
        nochmal: [T.nochmal, T.nochmalKlinge],
        ziel: () => ORT.garten(),
        // the flare, the men off in their van, the neighbours on the phone: three hollow stars
        an(S, why) {
          const K = szeneKlinge();
          if (why !== 'weiter') {
            if (!dark()) MI.uhr(23, 10);
            MI.hin(K.vorn[0], K.vorn[1], yawTo(K.vorn, K.van));
          }
          MI.rede('leucht');
          GLTON.fx('boeller', MI.fern(K.van), 600);
          S.z0 = KERN.ground(K.van[0], K.van[1]) + 2;
          // (feat/grenzland-kino) the flare is agent licht's picture (grenzland/gl_licht.js); the small ball only while that is missing
          GL.emit('flare', { x: K.van[0], y: K.van[1], z: S.z0 });
          if (!window.GLLICHT) {
            MI.A.ding('leucht', leuchtkugel);
            legen(MI.D('leucht'), K.van[0], K.van[1], S.z0, 0);
          }
          GLHUD.say(T.leucht, '', 4);
          // the van leaves over the tracks towards the road out of the square
          try {
            const c = MI.C('van'),
              Z = GLAUTO.zufahrten().sort(
                (a, b) => hyp(a[0] - K.van[0], a[1] - K.van[1]) - hyp(b[0] - K.van[0], b[1] - K.van[1])
              ),
              line = Z[0] && GLAUTO.route(K.van, Z[0], { k: 1.5 });
            if (c && line) {
              const pr = VNETZ.project(line, c.x, c.y);
              GLAUTO.onLine(c, line, pr ? Math.max(0, Math.min(line.L - 2, pr.s)) : 0, 0);
              S.fahrt = true;
            }
          } catch (e) {}
        },
        aus() {
          const o = MI.D('leucht');
          if (o && o.userData.mat) o.userData.mat.dispose();
          MI.dingWeg('leucht');
          MI.autoWeg('van');
        },
        tick(dt, S) {
          // the flare climbs, hangs, sinks
          const o = MI.D('leucht'),
            K = K4;
          if (o) {
            const h = S.t < 3.5 ? 55 * (1 - Math.pow(1 - S.t / 3.5, 2)) : 55 - (S.t - 3.5) * 1.8;
            if (h < 6 && S.t > 4) {
              if (o.userData.mat) o.userData.mat.dispose();
              MI.dingWeg('leucht');
            } else legen(o, K.van[0] + S.t * 0.6, K.van[1], S.z0 + h, 0);
          }
          if (!S.ruf && S.t > 2.5) {
            S.ruf = true;
            chat('klinge');
            GLFAHNDUNG.tat('hausfrieden', {
              force: [{ name: T.anwohner, knows: false }],
              k: gewicht('hausfrieden', 3),
            });
          }
          const c = MI.C('van');
          if (c && S.fahrt && S.t > 3) {
            GLAUTO.drive(c, dt, { k: 1, acc: 2.6 });
            if (c.ende || MI.fern([c.x, c.y]) > 380) MI.autoWeg('van');
          }
          if (!S.frei && S.ruf && stars() === 0) {
            S.frei = true;
            MI.denk(TX.klinge.heim, 4000);
          }
          return !!S.frei && MI.fern(ORT.garten()) < 24 && MI.wo().v < 3;
        },
      },
      {
        id: 'heim',
        text: TX.klinge.heim,
        tick: (dt, S) => sag(S, 'heim4') && schlaf(S, T.morgenA, 'Die Fotos sind scharf. Der Kaffee ist es nicht.'),
      },
    ],
  });
  // ================================================================ 5 · Der Coup ================================================================
  const Y = () => (GLLAGER.on ? GLLAGER.Y : null);
  ORT.lager = () => (Y() ? Y().hinten : O.lager.pos);
  const K5 = { plan: '', tuer: false, gem: {} };
  const plan = () => K5.plan || (GL.m.coup && GL.m.coup.plan) || 'leise';
  // a guard has seen somebody inside: he reports it – trespassing before the door is broken, burglary after (each once)
  function gemeldet() {
    const id = K5.tuer ? 'einbruch' : 'hausfrieden';
    if (K5.gem[id]) return;
    K5.gem[id] = K5.gem.hausfrieden = true;
    GLFAHNDUNG.tat(id, { force: [{ name: T.wachmann, knows: false }] });
    if (!MI.redet()) MI.rede('wacheFunk');
    coupChat();
  }
  function coupChat() {
    if (K5.gem.chat) return;
    K5.gem.chat = true;
    chat('coup');
  }
  const lagerEv = {
    'grenzland:lager': d => {
      if (d.was === 'alarm') gemeldet();
    },
  };
  function hofAn(S, why) {
    K5.plan = plan();
    GLLAGER.hooks.gefasst = () => {
      MI.fehl(T.wacheHat, T.wacheHatSub);
      return true;
    };
    if (why !== 'weiter') {
      GLLAGER.reset();
      K5.tuer = false;
      K5.gem = {};
      weg('karte2');
      const y = Y();
      if (y) MI.hin(y.hinten[0], y.hinten[1], yawTo(y.hinten, y.drin));
      if (plan() === 'leise' && !dark()) MI.uhr(23, 0);
    }
  }
  // (feat/grenzland-kino) the door gives way: a short look through it at the back wall, where the framed half of the map hangs
  function blickInsBuero() {
    const y = Y();
    if (!y || !window.GLKAMERA || (GLLAGER.wachen || []).some(w => w.job === 'jagt')) return;
    const B = y.H.buero,
      bb = B.b - B.w / 2,
      bf = B.b + B.w / 2,
      z = Number.isFinite(GLLAGER.zF) ? GLLAGER.zF : KERN.ground(y.vorTuer[0], y.vorTuer[1]),
      p = y.w(B.tuer - 0.05, bb - 1.15),
      t = y.w(B.tuer + 0.2, bf - 0.12);
    try {
      window.GLKAMERA.einstellung([p[0], p[1], z + 1.62], [t[0], t[1], z + 1.45], 3.4, 46);
    } catch (e) {}
  }
  MI.def({
    id: 'coup',
    lohn: '+250 € · die ganze Karte',
    pause: 5,
    gabe() {
      if (!GL.has('karte2')) GL.add('karte2');
    },
    abbruch() {
      GLLAGER.hooks.gefasst = null;
      for (const k of ['gl:zeichen', 'gl:tuer', 'gl:karte']) KERN.unact(k);
    },
    szene(i, A) {
      if (i <= 1 || i >= 7)
        for (const c of amTreff()) {
          A.fig(c.id, c.id, c.p[0], c.p[1], c.hd, { karte: 'clique' });
          A.auto(c.car, 'moped', c.m[0], c.m[1], c.hd + 1.2, { col: c.col });
        }
    },
    steps: [
      {
        id: 'jule',
        text: TX.coup.jule,
        ort: 'Feldscheune',
        ziel: () => {
          const f = MI.F('jule');
          return f ? [f.x, f.y] : ORT.scheune();
        },
        an() {
          sms('jule3');
        },
        tick(dt, S) {
          const f = MI.F('jule'),
            w = MI.wo();
          return (
            (S.r || (w.v < 2 && (f ? hyp(f.x - w.x, f.y - w.y) < 6.5 : MI.fern(ORT.scheune()) < 14))) && sag(S, 'plan')
          );
        },
      },
      {
        id: 'plan',
        text: TX.coup.plan,
        an(S) {
          const g = St.gen;
          GLHUD.wahl(T.planTitel, T.planText, [
            { t: T.planLeise[0], s: T.planLeise[1] },
            { t: T.planLaut[0], s: T.planLaut[1] },
          ]).then(i => {
            if (St.gen !== g || i < 0) return;
            K5.plan = i === 1 ? 'laut' : 'leise';
            if (GL.m.coup) GL.m.coup.plan = K5.plan;
            GL.save();
            S.gewaehlt = true;
          });
        },
        tick: (dt, S) => !!S.gewaehlt && sag(S, plan() === 'laut' ? 'planLaut' : 'planLeise'),
      },
      {
        id: 'hin',
        text: () => (plan() === 'laut' ? TX.coup.hinLaut : TX.coup.hinLeise),
        ort: 'Außenlager',
        ziel: () => ORT.lager(),
        an() {
          K5.plan = plan();
          GLLAGER.reset();
          if (plan() === 'leise')
            MI.extra(T.nachtW, () => {
              if (!dark() && !CLOCK.warp) CLOCK.wait(GLMLOGIK.bis(CLOCK.t, 22, 30), 'Warten');
            });
        },
        tick(dt, S) {
          if (!Y()) return S.t > 3;
          if (MI.fern(ORT.lager()) > 16 || !MI.zuFuss()) return false;
          if (plan() === 'laut' || dark()) return true;
          if (!S.hell) {
            S.hell = true;
            MI.denk('Zu hell für leise. Warte bis zur Nacht.', 4000);
          }
          return false;
        },
      },
      {
        id: 'rein',
        text: () => (plan() === 'laut' ? TX.coup.reinLaut : TX.coup.reinLeise),
        ort: 'Lücke im Zaun',
        nochmal: [T.wacheHat, T.wacheHatSub],
        ziel: () => (Y() ? Y().drin : null),
        ev: lagerEv,
        an(S, why) {
          hofAn(S, why);
          if (plan() !== 'laut') return;
          KERN.act({
            id: 'gl:zeichen',
            label: () => (GL.on && !S.bat ? T.zeichen : null),
            pos: () => [P.x, P.y, P.feet],
            r: 2,
            prio: 2,
            gest3: 'greet',
            run() {
              if (MI.fern(ORT.lager()) > 22) return void MI.denk(T.zeichenFern, 2200);
              S.bat = { t: 0.6, n: 0 };
            },
          });
        },
        aus() {
          KERN.unact('gl:zeichen');
        },
        tick(dt, S) {
          const y = Y();
          if (!y) return true;
          // the clique's battery at the gate: a string of bangs, both guards run there
          const b = S.bat;
          if (b && b.n < 8 && (b.t -= dt) <= 0) {
            b.t = 0.55 + ((b.n * 7) % 5) * 0.12;
            b.n++;
            GLTON.fx('boeller', MI.fern(y.vorTor), 600);
            if (b.n === 1) {
              GLLAGER.lenke(y.vorTor[0], y.vorTor[1], 48);
              MI.rede('batterie');
            }
            if (b.n === 8) {
              GLFAHNDUNG.tat('boeller', { force: [{ name: T.anwohner, knows: false }], k: 2.2, quiet: true });
              coupChat();
            }
          }
          return y.innen(P.x, P.y, 0.4) && MI.zuFuss();
        },
      },
      {
        id: 'tuer',
        cp: 'rein',
        text: TX.coup.tuer,
        ort: 'Bürocontainer',
        nochmal: [T.wacheHat, T.wacheHatSub],
        ziel: () => (Y() ? Y().vorTuer : null),
        ev: lagerEv,
        an(S) {
          KERN.act({
            id: 'gl:tuer',
            label: () => (GL.on && Y() && !GLLAGER.offen ? T.tuer : null),
            pos: () => {
              const q = Y().vorTuer;
              return [q[0], q[1], P.feet];
            },
            r: 1.8,
            hold: 4,
            prio: 3,
            // every blow is heard: on the quiet way whoever is near comes to look
            work(k) {
              const n = Math.floor(k * 5);
              if (n !== S.hieb) {
                S.hieb = n;
                GLTON.fx('schlag');
                // (the quiet way: only whoever passes close by hears it – wait until the round is at the far side)
                GLLAGER.laerm(P.x, P.y, plan() === 'laut' ? 24 : 7.5);
              }
            },
            run() {
              GLLAGER.tuerAuf();
              K5.tuer = true;
              GLTON.fx('bruch');
              S.auf = true;
            },
          });
        },
        aus() {
          KERN.unact('gl:tuer');
        },
        tick: (dt, S) => !!S.auf || (!Y() && S.t > 2),
        ab() {
          if (Y() && !GLLAGER.offen) GLLAGER.tuerAuf();
          K5.tuer = true;
          MI.rede('tuerAuf');
          blickInsBuero();
        },
      },
      {
        id: 'karte',
        cp: 'rein',
        text: TX.coup.karte,
        ort: 'Bürocontainer',
        nochmal: [T.wacheHat, T.wacheHatSub],
        ziel: () => (Y() ? Y().imBuero : null),
        ev: lagerEv,
        an(S) {
          KERN.act({
            id: 'gl:karte',
            label: () => (GL.on && Y() && GLLAGER.karte ? T.karteNimm : null),
            pos: () => {
              const q = Y().karte;
              return [q[0], q[1], P.feet];
            },
            r: 2.1,
            hold: 1.2,
            prio: 3,
            run() {
              S.hat = true;
            },
          });
        },
        aus() {
          KERN.unact('gl:karte');
        },
        tick: (dt, S) => !!S.hat || (!Y() && S.t > 2),
        ab() {
          GLLAGER.karteWeg();
          if (!GL.has('karte2')) GL.add('karte2');
          GLTON.fx('geld');
          MI.rede('karteDa');
        },
      },
      {
        id: 'raus',
        cp: 'rein',
        text: TX.coup.flucht,
        ort: 'Feldscheune',
        nochmal: [T.wacheHat, T.wacheHatSub],
        ziel: () => (Y() ? Y().hinten : ORT.scheune()),
        ev: lagerEv,
        tick: () => !Y() || !Y().innen(P.x, P.y, -1.2),
      },
      {
        id: 'flucht',
        text: TX.coup.flucht,
        ort: 'Feldscheune',
        nochmal: [T.nochmal, 'Noch einmal – vom Zaun des Außenlagers.'],
        ziel: () => ORT.scheune(),
        ev: lagerEv,
        an(S, why) {
          GLLAGER.hooks.gefasst = null;
          if (!GL.has('karte2')) GL.add('karte2');
          const y = Y();
          if (why !== 'weiter' && y) MI.hin(y.hinten[0], y.hinten[1], yawTo(y.drin, y.hinten));
        },
        tick: () => MI.fern(ORT.scheune()) < 16 && !gesehen() && MI.wo().v < 3,
      },
      {
        id: 'ende',
        text: TX.coup.ende,
        ort: 'Jule',
        ziel: () => {
          const f = MI.F('jule');
          return f ? [f.x, f.y] : ORT.scheune();
        },
        tick(dt, S) {
          const f = MI.F('jule'),
            w = MI.wo();
          return (S.r || (w.v < 2 && (f ? hyp(f.x - w.x, f.y - w.y) < 7 : S.t > 10))) && sag(S, 'ende');
        },
        ab() {
          GL.earn(250, 'Der Coup');
          MI.denk(T.lohn5, 4000);
        },
      },
    ],
  });
  markDirty();
  return { ORT, mitfahren, renn, bank, kistePos, K89, szeneKlinge, K4: () => K4, K5, SU };
})();
window.GLKAP1 = GLKAP1;
