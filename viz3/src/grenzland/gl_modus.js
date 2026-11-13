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
// Bangers (the panel's button) are thrown a few metres ahead: a bang is heard far – a deed in the village, a distraction elsewhere.
// Caught by the police: a fine, the next morning in the garden. A reload goes on where one stood.
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
import { GLRADIO } from './gl_radio.js';
import { GLHANDY } from './gl_handy.js';
import { GLFAHNDUNG } from './gl_fahndung.js';
import { GLHELI } from './gl_heli.js';
import { GLORTE } from './gl_orte.js';
import { GL89 } from './gl_1989.js';
import { GLLAGER } from './gl_lager.js';
import { GLMISSION } from './gl_mission.js';
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
    GLHUD.say(T.titel, T.introSub, 9);
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
  KERN.tick(tick, 'grenzland/modus');
  KERN.on('reset', () => {
    if (GL.on) stop(true);
    GL.reset();
  });
  KERN.scenario('grenzland', {
    label: 'Grenzland',
    order: 6,
    ask: 'eine eigene Welt für Erwachsene mit eigener Geschichte und eigenem Spielstand – stellt die Spieluhr auf Freitagabend',
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
