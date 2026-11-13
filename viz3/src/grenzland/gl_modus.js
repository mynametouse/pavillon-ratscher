// ===================== feat/grenzland: „Grenzland“ as a mode of the game (GRENZLAND) – start, the two to switch between, keys, the end =====================
// Falko, 13.11.2026 0:21: „… wie wir eine Variante reinbringen können … die letztendlich GTA 6 Vibes reinbekommen, um auch Spielspaß und
// ähnliche Stories, aber passend zur Region und zur Karte …“ – 0:30 chosen: the story „Grenzland“ (smuggling towards Bavaria, flashbacks
// to 1989), Falko and Sarah to switch between like Jason and Lucia, the tone of GTA, adults only (docs/plans/plan_grenzland.md).
// Started from the menu (Erleben → Szenen → „Grenzland“, ?szenario=grenzland): a world of its own like the zombie night – its own save
// (grenzland/gl_state.js, pav-grenzland-v1), nothing of it runs before, „Beenden“ (the panel) puts everything back. While it runs:
//   Tab   the other of the two (who is not played walks along as a figure, or waits where one left him: „Warte hier“ / „Komm mit“ –
//         apart, one star less is shown, as in GTA 6)
//   T     the phone (grenzland/gl_handy.js)        R   the radio (grenzland/gl_radio.js)
//   G     a shove or a punch at whoever stands in front (a deed, if somebody sees it)
//   O     the screen free (the game's free view, the eye at the top right): no panel, no radar – O again brings them back
// Quiet like GTA (Falko 13.11. 10:59 → package A): while it runs the game's own garden tasks, its thoughts about animals and tasks and
// its hints stay out (the journal lists the mode's tasks only), Hasso stays at home, the page's header and bars are hidden (gl_hud.js).
// Bangers (the panel's button) are thrown a few metres ahead: a bang is heard far – a deed in the village, a distraction elsewhere.
// Caught by the police: a fine, the next morning in the garden. A reload goes on where one stood.
import { cam, COARSE } from '../core/head.js';
import { KERN } from '../core/kern.js';
import { markDirty, whenLoaded } from '../core/assets.js';
import { P } from '../game/walkable.js';
import { go } from '../game/player.js';
import { PLAY } from '../game/play.js';
import { AVATAR } from '../game/avatar.js';
import { QUESTS } from '../game/quests.js';
import { MODE, setMode } from '../render/modes.js';
import { CLOCK } from '../time/clock.js';
import { DN } from '../time/daynight.js';
import { VEH } from '../vehicles/vehicle.js';
import { STIMME } from '../audio/stimme.js';
import { Z } from '../zombie/z_state.js';
import { GLDATA } from './gl_data.js';
import { GL } from './gl_state.js';
import { GLTON } from './gl_ton.js';
import { GLFIG } from './gl_fig.js';
import { GLAUTO } from './gl_auto.js';
import { GLCOCKPIT } from './gl_cockpit.js';
import { GLHUD } from './gl_hud.js';
import { GLKARTE } from './gl_karte.js';
import { GLRADIO } from './gl_radio.js';
import { GLHANDY } from './gl_handy.js';
import { GLFAHNDUNG } from './gl_fahndung.js';
import { GLHELI } from './gl_heli.js';
import { GLORTE } from './gl_orte.js';
import { GL89 } from './gl_1989.js';
import { GLLAGER } from './gl_lager.js';
import { GLMISSION } from './gl_mission.js';
// the story's first day: Friday, 4 September 2026 (days since 1970)
const DAY0 = Date.UTC(2026, 8, 4) / 864e5;
export const GRENZLAND = (() => {
  const T = GLDATA.T;
  const S = {
    prevMode: null,
    prevTrack: null,
    partner: null,
    loading: false,
    endAsk: 0,
    posT: 0,
    fuseT: [],
    voices: false,
    tasksList: null, // the journal's own list() while the mode filters it
    think: null, // PLAY.think of the game while the mode filters it
    denkP: null, // a thought being decided (a game event in the same moment can still drop it)
    denkH: null, // a thought that waits for a subtitle or a card
  };
  const hyp = Math.hypot;
  // ---- put the player somewhere (walking) ----
  function hin(x, y, yaw = 0, z) {
    KERN.spot('gl-hin', { mode: 'walk', pos: [x, y], z: z ?? KERN.ground(x, y), yaw, pitch: -4, label: T.titel });
    go('gl-hin');
  }
  // ---- the other of the two: a figure that walks along or waits ----
  async function partnerMake() {
    if (S.loading) return;
    S.loading = true;
    const id = GL.other() === 'm' ? 'falko' : 'sarah';
    if (S.partner && S.partner.id !== id) {
      GLFIG.drop(S.partner);
      S.partner = null;
    }
    if (!S.partner) {
      const F = await GLFIG.make(id, {});
      if (F && GL.on && !S.partner) {
        F.partner = true;
        F.sees = false;
        S.partner = F;
        const a = ((P.yaw + 150) * Math.PI) / 180;
        GLFIG.place(F, P.x + Math.sin(a) * 1.4, P.y + Math.cos(a) * 1.4, (P.yaw * Math.PI) / 180);
      } else if (F) GLFIG.drop(F);
    }
    S.loading = false;
  }
  function partnerTick(dt) {
    const F = S.partner;
    if (!F || GL.era !== 'heute') {
      if (F) F.g.visible = false;
      GL.getrennt = false;
      return;
    }
    const v = VEH.cur,
      d = hyp(F.x - P.x, F.y - P.y);
    if (v && GL.folgt) {
      // rides along: out of sight while one drives, beside the vehicle again when one gets out
      if (d < 9 || F.rides) {
        F.rides = true;
        F.g.visible = false;
        F.x = v.st.x;
        F.y = v.st.y;
      }
    } else if (F.rides) {
      F.rides = false;
      const a = ((P.yaw - 100) * Math.PI) / 180;
      GLFIG.place(F, P.x + Math.sin(a) * 1.3, P.y + Math.cos(a) * 1.3, (P.yaw * Math.PI) / 180);
    } else {
      F.g.visible = true;
      if (GL.folgt) {
        // far behind and out of sight: catches up round the corner
        if (d > 45) {
          const a = ((P.yaw + 180) * Math.PI) / 180;
          GLFIG.place(F, P.x + Math.sin(a) * 6, P.y + Math.cos(a) * 6, (P.yaw * Math.PI) / 180);
        } else if (d > 3.2 && (F.st !== 'geht' || (F.aimT = (F.aimT || 0) + dt) > 0.7)) {
          F.aimT = 0;
          const k = (d - 1.8) / d;
          GLFIG.go(F, [F.x + (P.x - F.x) * k, F.y + (P.y - F.y) * k], d > 9 ? 2.2 : 1.5);
        } else if (d < 1.6 && F.st === 'geht') GLFIG.stop(F);
      }
    }
    GL.getrennt = !F.rides && d > 60;
    nahCam(F);
  }
  // the other one is played now: places and figures swap
  function wechsel() {
    if (!GL.on) return false;
    if (GL.era !== 'heute') return (PLAY.think(T.wechsel89, 2200), false);
    if (VEH.cur || PLAY.seated() || P.mode !== 'walk' || !S.partner) return (PLAY.think(T.wechselNein, 2200), false);
    const F = S.partner,
      was = [P.x, P.y, P.feet, P.yaw],
      to = F.rides ? null : [F.x, F.y, F.z, (F.hd * 180) / Math.PI];
    GL.wer = GL.other();
    GLFIG.drop(F);
    S.partner = null;
    AVATAR.setKind(GL.wer);
    if (to) hin(to[0], to[1], to[3], to[2]);
    // the one played until now stays where he stood (and comes along if told to)
    partnerMake().then(() => {
      if (S.partner) GLFIG.place(S.partner, was[0], was[1], (was[3] * Math.PI) / 180);
    });
    GL.save(true);
    GLTON.fx('tick');
    PLAY.think(T.wechsel(GL.name()), 2000);
    GL.emit('wer', { wer: GL.wer });
    markDirty(true);
    return true;
  }
  function folgen(v) {
    GL.folgt = v === undefined ? !GL.folgt : !!v;
    if (!GL.folgt && S.partner) GLFIG.stop(S.partner);
    PLAY.think(GL.folgt ? T.folgt(GL.name(GL.other())) : T.wartet(GL.name(GL.other())), 2000);
    GL.emit('folgt', { folgt: GL.folgt });
  }
  // ---- a shove or a punch at whoever stands in front ----
  function schlag() {
    if (!GL.on || VEH.cur || PLAY.seated() || P.mode !== 'walk') return false;
    const a = (P.yaw * Math.PI) / 180,
      fx = Math.sin(a),
      fy = Math.cos(a);
    let best = null,
      bd = 1.7;
    for (const F of GLFIG.figs) {
      if (!F.g.visible || F.partner || F.downT > 0) continue;
      const dx = F.x - P.x,
        dy = F.y - P.y,
        d = hyp(dx, dy);
      if (d < bd && dx * fx + dy * fy > d * 0.5) {
        bd = d;
        best = F;
      }
    }
    GLTON.fx('schlag');
    if (!best) return (PLAY.think(T.schlagLuft, 900), false);
    GLFIG.down(best, 7);
    GL.emit('schlag', { id: best.id });
    GLFAHNDUNG.tat(best.cop ? 'widerstand' : 'schlag', best.cop ? { force: [{ name: best.name, police: true }] } : {});
    return true;
  }
  // ---- a banger: lit, thrown a few metres ahead, bang ----
  function boeller() {
    if (!GL.on || GL.era !== 'heute') return false;
    if (!GL.use('boeller')) return (PLAY.think(T.keinBoeller, 1500), false);
    const a = (P.yaw * Math.PI) / 180,
      x = P.x + Math.sin(a) * 7,
      y = P.y + Math.cos(a) * 7;
    GLTON.fx('lunte');
    S.fuseT.push({ t: 2.1, x, y });
    return true;
  }
  function bang(x, y) {
    GLTON.fx('boeller', hyp(x - P.x, y - P.y), 500);
    GL.emit('boeller', { x, y });
    // in the village a bang is a deed for whoever hears it and sees who it was
    if (/Ratscher|Anger|Dorf|Schleusingen/.test(String(KERN.place(x, y, 0) || '')))
      GLFAHNDUNG.tat('boeller', { quiet: false });
  }
  // ---- caught ----
  KERN.on('grenzland:erwischt', d => {
    if (!GL.on) return;
    if (VEH.cur) VEH.exit();
    if (d.era === '1989') {
      GLHUD.busted(T.erwischt, T.erwischt89, () => GL.emit('nochmal', { era: '1989' }));
      return;
    }
    GL.geld = Math.max(0, GL.geld - d.busse);
    GL.save(true);
    GLHUD.busted(T.erwischt, T.erwischtSub(d.busse, '€'), async () => {
      await GLHUD.fade(true, 'Am nächsten Morgen', '');
      const m = ((Math.floor(CLOCK.t) % 1440) + 1440) % 1440;
      CLOCK.t += (7 * 60 + 30 - m + 1440) % 1440 || 1440;
      if (DN && DN.active) DN.update(true);
      GL.tage++;
      go('garten');
      GLAUTO.mopedAt(GLDATA.ORTE.moped.pos[0], GLDATA.ORTE.moped.pos[1], (GLDATA.ORTE.moped.az * Math.PI) / 180);
      if (S.partner) GLFIG.place(S.partner, P.x + 1.2, P.y + 0.8, 0);
      GL.emit('nochmal', { era: 'heute' });
      await GLHUD.fade(false);
    });
  });
  // ---- quiet like GTA: the game's own tasks, thoughts and the dog stay out while the mode runs ----
  // A thought of the game: shown a moment later – unless a game event of the same moment says where it came from (an animal seen for
  // the book, a step of a garden task) – and not over a subtitle or a card (it waits for them a few seconds).
  function denk(text, ms) {
    const f = S.think;
    if (!f) return;
    if (!GL.on) return f(text, ms);
    // the dog, the book, the game's hints about its new features („Neu: …“) do not belong into the story
    if (/^Neu:|Hasso|Entdeckerbuch/.test(String(text))) return;
    const p = { text, ms, ok: true };
    S.denkP = p;
    queueMicrotask(() => {
      if (S.denkP === p) S.denkP = null;
      if (!p.ok || !S.think) return;
      if (GLHUD.busy && GLHUD.busy()) S.denkH = { text, ms, age: 0 };
      else S.think(text, ms);
    });
  }
  const denkWeg = () => {
    if (S.denkP) S.denkP.ok = false;
  };
  KERN.on('tiere:gesehen', denkWeg);
  KERN.on('task:step', denkWeg);
  KERN.on('task:start', denkWeg);
  function ruhe(on) {
    const TK = KERN.tasks;
    if (on && !S.tasksList) {
      S.tasksList = TK.list;
      TK.list = () => S.tasksList.call(TK).filter(e => String(e.src).startsWith('grenzland'));
    } else if (!on && S.tasksList) {
      TK.list = S.tasksList;
      S.tasksList = null;
    }
    if (on && !S.think && PLAY.think) {
      S.think = PLAY.think;
      PLAY.think = denk;
    } else if (!on && S.think) {
      PLAY.think = S.think;
      S.think = null;
      S.denkP = S.denkH = null;
    }
    // Hasso stays at home (tiere/tiere_hund.js: optional; if he was with the walker he comes back at the end)
    const H = window.HUND;
    try {
      if (on && H && H.on && H.show) {
        GL.hund = true;
        H.show(false);
      } else if (!on && GL.hund) {
        GL.hund = false;
        if (H && H.show) H.show(true);
      }
    } catch (e) {}
  }
  // the camera close to the other one (after a ride, in a narrow place): he steps out of the picture instead of filling it with hair
  function nahCam(F) {
    const c = cam && cam.position;
    if (!c || !F || !F.g) return;
    const near = F.g.visible && Math.hypot(F.x - c.x, F.y + c.z) < 0.8 && c.y > F.z - 0.3 && c.y < F.z + 2.4;
    if (near && !F.camAus) {
      F.camAus = F.g.children.filter(ch => ch.visible);
      for (const ch of F.camAus) ch.visible = false;
    } else if (!near && F.camAus) {
      for (const ch of F.camAus) ch.visible = true;
      F.camAus = null;
    }
  }
  // ---- on ----
  function begin(fresh) {
    if (fresh) GL.reset();
    GL.on = true;
    GL.era = 'heute';
    GL.folgt = true;
    if (fresh) {
      GL.t0 = CLOCK.t;
      GL.fig0 = AVATAR.kind || 'm';
      GL.wer = 'm';
      GL.inv.boeller = 0;
    }
    // the story's calendar: it begins on a Friday in late summer (4 September 2026); the game's own date comes back at the end
    try {
      const d = Math.floor(CLOCK.t / 1440);
      if (fresh || !GL.e0neu) {
        GL.e0alt = DN.e0;
        GL.e0neu = DAY0 - d;
      }
      DN.e0 = GL.e0neu;
    } catch (e) {}
    S.prevMode = MODE === 'auto' || MODE === 'night' ? null : MODE;
    if (MODE !== 'auto') setMode('auto');
    S.prevTrack = QUESTS.track;
    if (AVATAR.kind !== GL.wer) AVATAR.setKind(GL.wer);
    if (!S.voices) {
      S.voices = true;
      try {
        for (const [id, c] of Object.entries(GLDATA.CAST))
          if (c.voice) STIMME.person('gl_' + id, Object.assign({ name: c.name }, c.voice));
      } catch (e) {}
    }
    GLHUD.show(true);
    GLKARTE.show(true);
    ruhe(true);
    GLHUD.voll();
    S.vehWas = VEH.cur || null;
    GLORTE.build();
    GLAUTO.netz();
    partnerMake();
    GL.save(true);
    GL.emit('start', { fresh: !!fresh });
    markDirty(true);
  }
  // ---- the scenario: a fresh start ----
  function start() {
    if (Z.on) return (PLAY.think(T.zombie, 3000), false);
    if (GL.on) stop(true);
    // started by the link (?szenario=grenzland): the address without it, so that a reload goes on instead of starting afresh
    try {
      const u = new URL(location.href);
      if (u.searchParams.get('szenario') === 'grenzland') {
        u.searchParams.delete('szenario');
        history.replaceState(history.state, '', u.pathname + u.search + u.hash);
      }
    } catch (e) {}
    begin(true);
    // the first mission puts the player where the story begins; without missions yet: the garden, a Friday evening
    const d = Math.floor(CLOCK.t / 1440);
    CLOCK.t = d * 1440 + 17 * 60 + 20;
    if (DN && DN.active) DN.update(true);
    go('garten');
    GLAUTO.mopedAt(GLDATA.ORTE.moped.pos[0], GLDATA.ORTE.moped.pos[1], (GLDATA.ORTE.moped.az * Math.PI) / 180);
    GLMISSION.neu();
    GLHUD.titel(T.titel, T.introKap, 5.5, COARSE ? T.introTouch : T.introKeys);
    PLAY.think(T.adult, 6000);
    return true;
  }
  // ---- off: everything back as it was ----
  function stop(quiet) {
    if (!GL.on) return;
    if (VEH.cur && VEH.cur.id === 'gl-moped') VEH.exit();
    GL89.stop();
    GLMISSION.stop();
    GLFAHNDUNG.clear();
    GLHELI.stop();
    GLRADIO.stop();
    GLHANDY.stop();
    GLCOCKPIT.stop();
    GLLAGER.drop();
    GLORTE.drop();
    GLFIG.dropAll();
    S.partner = null;
    GLAUTO.removeAll();
    GLAUTO.mopedHide();
    GLTON.stop();
    GLHUD.show(false);
    GLKARTE.show(false);
    ruhe(false);
    try {
      if (GL.e0neu && Number.isFinite(GL.e0alt)) DN.e0 = GL.e0alt;
    } catch (e) {}
    GL.e0neu = 0;
    GL.on = false;
    GL.era = 'heute';
    S.fuseT.length = 0;
    if (S.prevMode) setMode(S.prevMode);
    if (GL.fig0 && AVATAR.kind !== GL.fig0) AVATAR.setKind(GL.fig0);
    if (S.prevTrack && String(QUESTS.track).startsWith('grenzland:')) QUESTS.track = S.prevTrack;
    GL.save(true);
    GL.emit('stop', {});
    if (!quiet) PLAY.think(T.ende, 3500);
    markDirty(true);
  }
  // ---- the panel's buttons and the keys ----
  GLHUD.acts.wechsel = wechsel;
  GLHUD.acts.handy = () => GLHANDY.toggle();
  GLHUD.acts.radio = () => GLRADIO.next();
  GLHUD.acts.folgen = () => folgen();
  GLHUD.acts.boeller = boeller;
  GLHUD.acts.schlag = schlag;
  GLHUD.acts.end = () => {
    if (S.endAsk && performance.now() - S.endAsk < 4000) {
      S.endAsk = 0;
      stop();
    } else {
      S.endAsk = performance.now();
      PLAY.think(T.endAsk, 3800);
    }
  };
  window.addEventListener('keydown', e => {
    if (!GL.on || e.repeat || e.ctrlKey || e.metaKey || e.altKey) return;
    if (['INPUT', 'TEXTAREA', 'SELECT'].includes(document.activeElement?.tagName)) return;
    const k = e.key.toLowerCase();
    if (k === 'tab') {
      e.preventDefault();
      wechsel();
    } else if (k === 't') GLHANDY.toggle();
    else if (k === 'r' && !(VEH.cur && VEH.cur.id === 'tractor')) GLRADIO.next();
    else if (k === 'g' && !VEH.cur) schlag();
    else if (k === 'o') GLHUD.acts.aus && GLHUD.acts.aus();
  });
  // ---- per frame ----
  function tick(dt) {
    if (!GL.on) return;
    dt = Math.min(dt, 0.25);
    GL.tick(dt);
    const p = GLFAHNDUNG.wo();
    partnerTick(dt);
    GLFIG.tick(dt);
    GLAUTO.tick(dt, p.x, p.y);
    GLFAHNDUNG.tick(dt);
    GLHELI.tick(dt);
    GLORTE.tick(dt);
    GLLAGER.tick(dt);
    GL89.tick(dt);
    GLMISSION.tick(dt);
    GLRADIO.tick(dt);
    GLHANDY.tick(dt);
    GLCOCKPIT.tick(dt);
    GLHUD.tick(dt);
    GLKARTE.tick(dt);
    // a thought that waited for a subtitle or a card
    if (S.denkH && S.think && !GLHUD.busy()) {
      const h = S.denkH;
      S.denkH = null;
      if (h.age < 9) S.think(h.text, h.ms);
    } else if (S.denkH) S.denkH.age += dt;
    // getting onto or into something: its name for a moment, as GTA shows it
    if ((VEH.cur || null) !== S.vehWas) {
      S.vehWas = VEH.cur || null;
      if (S.vehWas && S.vehWas.name) GLHUD.ort(S.vehWas.name, S.vehWas.gl && S.vehWas.gl.sub);
    }
    // bangers
    for (const f of S.fuseT.slice())
      if ((f.t -= dt) <= 0) {
        S.fuseT.splice(S.fuseT.indexOf(f), 1);
        bang(f.x, f.y);
      }
    // the moped's tank: 2.6 l per 100 km; empty, it stops
    const v = VEH.cur;
    if (v && v.id === 'gl-moped') {
      const sp = Math.abs(v.st.u);
      GL.tank = Math.max(0, GL.tank - sp * dt * 0.000026);
      GL.stats.km += (sp * dt) / 1000;
      if (GL.tank <= 0 && sp < 1) {
        VEH.exit();
        PLAY.think(T.tank, 3000);
      } else if (GL.tank <= 0) v.st.thr = 0;
    }
    // where one stands outdoors, every few seconds: a reload goes on there
    if ((S.posT += dt) > 4) {
      S.posT = 0;
      if (P.mode === 'walk' && !VEH.cur && !PLAY.seated() && GL.era === 'heute') {
        const r = q => Math.round(q * 100) / 100,
          a = [r(P.x), r(P.y), r(P.feet), Math.round(P.yaw)];
        if (a.some((q, i) => q !== GL.pos[i])) {
          GL.pos = a;
          GL.save();
        }
      }
    }
  }
  // ---- the moped's tank in free play: at home from the canister in the garden, elsewhere from a canister one carries (the shop on
  // wheels sells it). Fuel matters, as in GTA 6. ----
  const tankWo = () => {
    const m = GLAUTO.moped;
    if (!GL.on || GL.era !== 'heute' || !m || VEH.cur || PLAY.seated() || GL.tank > 4.4) return null;
    const h = GLDATA.ORTE.moped.pos;
    return Math.hypot(m.st.x - h[0], m.st.y - h[1]) < 14 ? 'heim' : GL.has('kanister') ? 'kanister' : null;
  };
  KERN.act({
    id: 'gl:tanken',
    r: 2.3,
    prio: 0.2,
    pos: () => {
      const m = GLAUTO.moped;
      return m && GL.on ? [m.st.x, m.st.y, KERN.ground(m.st.x, m.st.y) + 0.8] : [1e6, 1e6, 0];
    },
    label: () => {
      const w = tankWo();
      return w === 'heim' ? T.tankHeim : w === 'kanister' ? T.tankKan : null;
    },
    hold: () => 2.4,
    run: () => {
      const w = tankWo();
      if (!w) return;
      if (w === 'kanister') GL.use('kanister');
      GL.tank = 5;
      GL.save();
      GLTON.fx('kanister');
      PLAY.think(T.getankt, 2600);
      GL.emit('getankt', { wo: w });
    },
  });
  // ---- the radar's marks: the mission's targets, the other one of the two, the police, the garden ----
  GLKARTE.src(out => {
    const now = performance.now();
    if (!S.zielT || now - S.zielT > 500) {
      S.zielT = now;
      S.ziele = [];
      S.pol = null;
      try {
        const tr = String(QUESTS.track || '');
        for (const e of KERN.tasks.list()) {
          if (!String(e.src).startsWith('grenzland') || e.status === 'erledigt' || !e.target) continue;
          const t = typeof e.target === 'function' ? e.target() : e.target;
          if (t && Number.isFinite(t[0]) && Number.isFinite(t[1]))
            S.ziele.push({ x: t[0], y: t[1], k: e.key === tr ? 'ziel' : 'ziel2', name: e.ort || '' });
        }
      } catch (e) {}
      try {
        S.pol = GLFAHNDUNG.stand();
        // the panel: who is on the phone to the police, what they know, the helicopter; the phone's unread messages
        GLHUD.pol = S.pol;
        GLHUD.neu = GLHANDY.unread ? GLHANDY.unread() | 0 : 0;
      } catch (e) {}
    }
    for (const z of S.ziele) out.push(z);
    const st = S.pol;
    if (st) {
      if (st.last && st.sterne > 0 && st.state !== 'verfolgt')
        out.push({ x: st.last[0], y: st.last[1], k: 'such', r: 70 });
      // like GTA 6: a patrol is on the radar only while it sees you or saw you a moment ago (gesehen; without that field: always)
      for (const c of st.cars || []) if (c.gesehen !== false) out.push({ x: c.x, y: c.y, k: 'polizei' });
      for (const c of st.cops || []) if (c.gesehen !== false) out.push({ x: c.x, y: c.y, k: 'beamter' });
      if (st.block) out.push({ x: st.block[0], y: st.block[1], k: 'sperre' });
      if (st.heli) out.push({ x: st.heli[0], y: st.heli[1], k: 'heli' });
    }
    // a place sent to the phone (a message's „Zum Ziel“): a waypoint, gone when one is there
    const z = S.punkt;
    if (z) {
      const p = GLFAHNDUNG.wo();
      if (Math.hypot(p.x - z.x, p.y - z.y) < 14) S.punkt = null;
      else out.push(z);
    }
    const F = S.partner;
    if (F && GL.era === 'heute' && !F.rides) out.push({ x: F.x, y: F.y, k: 'partner' });
    if (GL.era === 'heute') out.push({ x: 2, y: 2, k: 'ort', name: 'Garten' });
  });
  KERN.on('grenzland:ziel', d => {
    const p = d && d.pos;
    S.punkt =
      p && Number.isFinite(p[0]) && Number.isFinite(p[1]) ? { x: p[0], y: p[1], k: 'punkt', name: d.name || '' } : null;
  });
  KERN.on('grenzland:stop', () => {
    S.punkt = null;
    GLHUD.pol = null;
    GLHUD.neu = 0;
  });
  // a mission is done: the big line, the reward, the jingle
  KERN.on('grenzland:mission', d => {
    if (!GL.on || !d || d.st !== 'erledigt') return;
    GLHUD.passed(d.titel || d.title || '', d.lohn || d.reward || '');
    if (window.GLSCORE && window.GLSCORE.stich) window.GLSCORE.stich('bestanden');
    else GLTON.fx('frei');
  });
  KERN.tick(tick, 'grenzland/modus');
  KERN.on('reset', () => {
    if (GL.on) stop(true);
    GL.reset();
  });
  KERN.scenario('grenzland', {
    label: 'Grenzland',
    order: 6,
    ask: 'eine eigene Welt für Erwachsene mit eigener Geschichte und eigenem Spielstand – stellt Kalender und Spieluhr auf einen Freitagabend im September',
    run: start,
  });
  // a reload while the mode runs: it goes on
  whenLoaded(() =>
    setTimeout(() => {
      try {
        if (!GL.on && !Z.on && GL.load() && GL.on) {
          begin(false);
          if (P.mode !== 'walk') {
            const a = GL.pos;
            if (a.length === 4) hin(a[0], a[1], a[3], a[2]);
            else go('garten');
            PLAY.think(T.weiter, 3500);
          }
          GLMISSION.start(GL.cur);
        }
      } catch (e) {
        console.warn('grenzland resume', e);
      }
    }, 1700)
  );
  return Object.assign(S, {
    start,
    stop,
    begin,
    wechsel,
    folgen,
    schlag,
    boeller,
    bang,
    hin,
    tick,
    partnerOf: () => S.partner,
  });
})();
window.GRENZLAND = GRENZLAND;
