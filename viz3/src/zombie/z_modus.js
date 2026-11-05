// ===================== feat/zombie: the zombie night as a mode of the game (ZOMBIE) – start, day and night, the siren, death, the end =====================
// Falko, 4.11.2026 22:59: „Es gibt Personen, die sich bei Ertönen der Silent Hill-Sirene in Zombies verwandeln und nachts herumstreifen und
// mich angreifen. Ich muss aber auch die Möglichkeit haben, sie mit einer Motorsäge oder anderen Waffen, die ich finden kann, zu töten. …
// tagsüber vorzubereiten, Vorräte zu sammeln und Häuser zu verbarrikadieren …“
// Started from the menu (Erleben → Szenen → „Zombie-Nacht“, ?szenario=zombie): the clock goes to 16:30, the sun follows it, the player
// stands in the garden, the weapons lie about (zombie/z_waffe.js). The day runs as usual (the villagers in their gardens, a car now and
// then); at 20:30 the sun sets, at 21:00 the siren on the old school howls (zombie/z_ton.js), the villagers out of doors turn and more come
// out of the houses (zombie/z_horde.js), the streets empty; at 5:30 the long tone of the all-clear, the zombies go back into the houses, the
// night is survived. Dying: the morning after, in the garden, some supplies lost. The state is kept (zombie/z_state.js, pav-zombie-v1);
// a reload goes on where one was. „Beenden“ (the panel) leaves the mode and puts everything back.
import { scene } from '../core/head.js';
import { KERN } from '../core/kern.js';
import { markDirty, whenLoaded } from '../core/assets.js';
import { P } from '../game/walkable.js';
import { go } from '../game/player.js';
import { PLAY } from '../game/play.js';
import { keys } from '../game/input.js';
import { MODE, setMode } from '../render/modes.js';
import { CLOCK } from '../time/clock.js';
import { DN } from '../time/daynight.js';
import { TASKS } from '../core/tasks.js';
import { VEH } from '../vehicles/vehicle.js';
import { DORF } from '../dorf/dorf.js';
import { DPEOPLE } from '../dorf/dorf_people.js';
import { VERKEHR } from '../verkehr/verkehr.js';
import { ZDATA } from './z_data.js';
import { Z } from './z_state.js';
import { ZTON } from './z_ton.js';
import { ZFX } from './z_fx.js';
import { ZFIG } from './z_fig.js';
import { ZINNEN } from './z_innen.js';
import { ZHORDE } from './z_horde.js';
import { ZWAFFE } from './z_waffe.js';
import { ZHUD } from './z_hud.js';
import { ZNETZ } from './z_netz.js';
export const ZOMBIE = (() => {
  const TX = ZDATA.T;
  const S = { prevMode: null, offs: [], deadT: 0, started: 0, tday: null, tcache: null, lamp: false };
  const minute = () => ((Math.floor(CLOCK.t) % 1440) + 1440) % 1440;
  // the times of the day after the sun of the game day (time/daynight.js): the siren when it is dark (50 min after sunset), the
  // all-clear in the first light (25 min before sunrise); without the sun's course the fixed times of ZDATA.TIME
  function times() {
    const d = Math.floor(CLOCK.t / 1440);
    if (S.tday === d && S.tcache) return S.tcache;
    let t = Object.assign({}, ZDATA.TIME);
    try {
      const r = DN && DN.riseSet ? DN.riseSet(CLOCK.t, 'sun') : null;
      if (r && r.down != null && r.up != null) {
        const siren = Math.round(Math.min(22 * 60 + 30, Math.max(17 * 60, r.down + 50))),
          dawn = Math.round(Math.min(7 * 60 + 30, Math.max(4 * 60, r.up - 25)));
        t = { warn: siren - 30, siren, dawn, start: siren - 240 }; // (four hours of day to get ready – four minutes at the usual pace)
      }
    } catch (e) {}
    S.tday = d;
    S.tcache = t;
    return t;
  }
  Z.times = times;
  const phaseOf = m => {
    const T = times();
    return m >= T.siren || m < T.dawn ? 'nacht' : m >= T.warn ? 'abend' : 'tag';
  };
  // ---- on ----
  function begin(fresh) {
    if (fresh) Z.reset();
    Z.on = true;
    if (fresh) Z.t0 = CLOCK.t;
    S.prevMode = MODE === 'auto' || MODE === 'night' ? null : MODE;
    if (MODE !== 'auto') setMode('auto');
    ZFX.build();
    ZHUD.show(true);
    ZWAFFE.placeAll();
    ZTON.load();
    // the houses' shaders compiled now, not at the first door (zombie/z_innen.js; one frame)
    if (ZINNEN.warm) setTimeout(() => Z.on && ZINNEN.warm(), 1200);
    // the villagers keep away from evenings and gardens at night; the streets empty
    DORF.S.hold = () => Z.on && (Z.phase === 'nacht' || Z.phase === 'morgen');
    Z.phase = phaseOf(minute());
    if (Z.phase === 'nacht') {
      // a reload in the night: it goes on, without a new siren
      nightStreets(true);
      ZHORDE.night(Math.max(1, Z.night));
    }
    Z.lit = () => Z.phase !== 'nacht' || S.lamp;
    Z.save(true);
    Z.emit('start', { fresh: !!fresh });
    markDirty(true);
  }
  function nightStreets(night) {
    try {
      VERKEHR.autoOn(!night);
      if (night) VERKEHR.clear();
    } catch (e) {}
    if (night) for (const k of Object.keys((DPEOPLE && DPEOPLE.figs) || {})) DPEOPLE.hide(k);
  }
  // ---- the scenario: a fresh start at 16:30 in the garden ----
  function start() {
    if (Z.on) stop(true);
    const d = Math.floor(CLOCK.t / 1440);
    // the 31st of October (this year's, or last year's before it): long evenings, autumn colours – the game day today becomes that date
    try {
      const now = new Date(),
        y = now.getMonth() < 9 ? now.getFullYear() - 1 : now.getFullYear();
      DN.e0 = Date.UTC(y, 9, 31) / 864e5 - d;
    } catch (e) {}
    S.tday = null;
    CLOCK.t = d * 1440 + times().start;
    if (DN && DN.active) DN.update(true);
    go('garten');
    P.yaw = P.body = 200;
    begin(true);
    ZHUD.say('Zombie-Nacht', TX.intro, 11);
  }
  // ---- off: everything back as it was ----
  function stop(quiet) {
    if (!Z.on) return;
    Z.on = false;
    Z.phase = 'aus';
    ZWAFFE.sawOff();
    ZHORDE.clear();
    ZWAFFE.hideAll();
    for (const T2 of Object.values(ZWAFFE.things)) if (PLAY.has(T2)) T2.gone();
    ZTON.stopSiren(1);
    ZFX.dispose();
    ZFIG.disposeAll();
    ZHUD.show(false);
    fogHook(false);
    DORF.S.hold = null;
    nightStreets(false);
    if (S.prevMode) setMode(S.prevMode);
    Z.save(true);
    Z.emit('stop', {});
    if (!quiet) PLAY.think('Die Zombie-Nacht ist vorbei – das Dorf ist wieder, wie es war.', 3500);
    markDirty(true);
  }
  // ---- the night ----
  function siren() {
    Z.night++;
    Z.save(true);
    ZTON.load().then(() => ZTON.siren('heulton'));
    ZHUD.say('Die Sirene heult.', 'Irgendetwas stimmt mit den Leuten nicht …', 7);
    Z.emit('siren', { night: Z.night });
    nightStreets(true);
    // the siren rises for a few seconds before they turn
    setTimeout(() => {
      if (!Z.on || Z.phase !== 'nacht') return;
      const turned = ZHORDE.night(Z.night);
      ZTON.sting(1);
      if (turned.length) PLAY.think(TX.turn(turned[0]), 4000);
      Z.emit('night', { night: Z.night, turned });
    }, 6500);
  }
  function morning() {
    ZTON.load().then(() => ZTON.siren('morgen'));
    ZHORDE.dawn();
    if (Z.hp > 0) {
      Z.survived++;
      ZHUD.say(TX.survived(Z.night), TX.dawn, 8);
      Z.emit('survived', { night: Z.night });
    }
    Z.save(true);
    setTimeout(() => {
      if (Z.on && Z.phase !== 'nacht') nightStreets(false);
    }, 60000);
  }
  // ---- dying and coming to again ----
  function dead() {
    if (!Z.on) return;
    Z.deaths++;
    S.deadT = 0;
    ZWAFFE.sawOff();
    ZTON.heart = 0;
    ZHUD.died('Nacht ' + Z.night + ' · ' + Z.kills + ' erledigt. ' + TX.respawn);
    Z.save(true);
  }
  function revive() {
    // the next dawn, in the garden; a third of the supplies gone (two playing: the clock goes on, one wakes in the garden at once)
    const m = minute(),
      add = ZNETZ.on ? 0 : (times().dawn + 15 - m + 1440) % 1440;
    CLOCK.t += add;
    if (DN && DN.active) DN.update(true);
    for (const k of Object.keys(Z.sup)) {
      const n = Math.floor(Z.sup[k] * 0.33);
      if (n > 0) Z.use(k, n);
    }
    Z.hp = 60;
    Z.stam = 60;
    Z.food = Math.max(Z.food, 40);
    if (!ZNETZ.on) {
      ZHORDE.clear();
      Z.phase = 'tag';
    }
    go('garten');
    ZWAFFE.placeAll();
    nightStreets(false);
    Z.save(true);
    ZHUD.say('Morgengrauen', TX.respawn, 6);
  }
  ZHUD.onRevive = revive;
  ZHUD.acts.end = () => {
    if (S.endAsk && performance.now() - S.endAsk < 4000) {
      S.endAsk = 0;
      stop();
    } else {
      S.endAsk = performance.now();
      PLAY.think('Noch einmal „Beenden“ tippen, um die Zombie-Nacht zu verlassen.', 3800);
    }
  };
  ZHUD.acts.wait = () => {
    if (Z.phase === 'nacht') return PLAY.think('Nachts wartet man nicht einfach ab – sie kommen.', 2500);
    const left = (times().warn - minute() + 1440) % 1440;
    if (left < 15) return PLAY.think('Die Sonne geht schon unter.', 1800);
    CLOCK.wait(left - 10, 'Bis zum Abend');
  };
  // ---- the torch (T): one of the shared point lights, a few metres ahead of the player at chest height ----
  KERN.lights.borrow({
    id: 'zombie:lampe',
    n: 1,
    prio: 6,
    want: () => Z.on && S.lamp && P.mode === 'walk' && !(VEH && VEH.cur),
    on: ls => {
      const l = ls[0];
      l.color.setHex(0xfff0d8);
      l.distance = 18;
      l.decay = 1.5;
      l.intensity = 0;
    },
    tick: ls => {
      const l = ls[0],
        a = (P.yaw * Math.PI) / 180,
        k = Math.cos((P.pitch * Math.PI) / 180);
      l.position.set(
        P.x + Math.sin(a) * 2.6 * k,
        P.feet + 1.3 + Math.sin((P.pitch * Math.PI) / 180) * 2,
        -(P.y + Math.cos(a) * 2.6 * k)
      );
      l.intensity = 14 * (0.96 + Math.random() * 0.04);
      markDirty();
    },
  });
  window.addEventListener('keydown', e => {
    if (!Z.on || e.repeat || e.key.toLowerCase() !== 't' || (VEH && VEH.cur)) return;
    if (['INPUT', 'TEXTAREA', 'SELECT'].includes(document.activeElement?.tagName)) return;
    S.lamp = !S.lamp;
    PLAY.think(S.lamp ? 'Taschenlampe an.' : 'Taschenlampe aus.', 900);
  });
  // ---- per frame ----
  // ---- the night's fog (Silent Hill): the village sinks into the dark beyond 40–80 m. The scene's own fog (its program stays), only
  //      its density – and that the day-and-night light sets anew whenever the sky moves (time/daynight.js); so while the mode is on
  //      the density reads as the larger of the light's value and ours ----
  let fogBase = null,
    fogZ = 0;
  function fogHook(on) {
    const F = scene.fog;
    if (!F || !F.isFogExp2) return;
    if (on && fogBase === null) {
      fogBase = F.density;
      Object.defineProperty(F, 'density', {
        configurable: true,
        enumerable: true,
        get: () => Math.max(fogBase, fogZ),
        set: v => {
          fogBase = v;
        },
      });
    } else if (!on && fogBase !== null) {
      const v = fogBase;
      delete F.density;
      F.density = v;
      fogBase = null;
      fogZ = 0;
    }
  }
  function fog(dt) {
    fogHook(true);
    const want = P.mode === 'top' ? 0 : Z.phase === 'nacht' ? 0.016 : Z.phase === 'abend' ? 0.0055 : 0;
    fogZ = P.mode === 'top' ? 0 : fogZ + (want - fogZ) * Math.min(1, dt * 0.35);
  }
  function tick(dt) {
    if (!Z.on) return;
    dt = Math.min(dt, 0.25);
    Z.tick(dt);
    Z.noiseTick(dt);
    fog(dt);
    const ph = phaseOf(minute());
    if (ph !== Z.phase) {
      const was = Z.phase;
      Z.phase = ph;
      Z.emit('phase', { phase: ph, was });
      if (ph === 'abend') ZHUD.say(TX.warn, '', 5);
      else if (ph === 'nacht' && was !== 'aus') siren();
      else if (ph === 'tag' && was === 'nacht') morning();
    }
    if (Z.hp > 0 && P.mode === 'walk') {
      const run = keys.has('shift') && P.speed > 3.2;
      Z.body(dt, run);
      if (run && Z.stam <= 0) keys.delete('shift');
      if (Z.food < 15 && (S.hungryT = (S.hungryT || 0) - dt) <= 0) {
        S.hungryT = 90;
        PLAY.think(Z.food <= 0 ? TX.starving : TX.hungry, 3000);
      }
    }
    // the engine of a car is heard
    const v = VEH && VEH.cur;
    if (v && Math.abs(v.st.u) > 0.5) Z.noise(v.st.x, v.st.y, 35 + Math.abs(v.st.u) * 3, 0.4, 'motor');
  }
  KERN.tick(tick, 'zombie/modus');
  KERN.on('zombie:hurt', d => {
    ZHUD.hurt(Math.min(1.5, d.dmg / 12));
    P.yaw += (Math.random() - 0.5) * 4;
    P.pitch += Math.random() * 2;
  });
  KERN.on('zombie:dead', dead);
  KERN.on('reset', () => {
    if (Z.on) stop(true);
    Z.reset();
  });
  // ---- the scenario in the menu (Erleben → Szenen) ----
  KERN.scenario('zombie', {
    label: 'Zombie-Nacht',
    order: 5,
    ask: 'stellt Kalender und Spieluhr auf den Nachmittag des 31. Oktober – wenn es dunkel ist, heult die Sirene',
    run: start,
  });
  // ---- the journal: what the first night asks of you ----
  TASKS.define({
    id: 'zombie-1',
    title: 'Die erste Nacht',
    who: 'Zombie-Nacht',
    start: { on: 'zombie:start' },
    steps: [
      {
        text: 'Such dir eine Waffe – einen Spaten an der alten Garage, eine Axt bei Hubert, eine Motorsäge in der Werkstatt …',
        on: 'zombie:weapon',
      },
      { text: 'Halte durch, bis die Sirene heult – kurz nach Einbruch der Dunkelheit.', on: 'zombie:siren' },
      { text: 'Überlebe die Nacht bis zum Morgengrauen.', on: 'zombie:survived' },
    ],
    done: 'Du hast die erste Nacht überlebt. Sie kommen wieder – sammle Vorräte, verbarrikadiere ein Haus.',
  });
  // a reload during the night mode: it goes on
  whenLoaded(() =>
    setTimeout(() => {
      try {
        // (already started – ?szenario=zombie, a link to a room – the scene's fresh start stands)
        if (!Z.on && Z.load() && Z.on) begin(false);
      } catch (e) {
        console.warn('zombie resume', e);
      }
    }, 1500)
  );
  Object.assign(S, {
    start,
    stop,
    begin,
    siren,
    morning,
    dead,
    revive,
    phaseOf,
    times,
    torch: v => (S.lamp = v === undefined ? !S.lamp : !!v),
  });
  return S;
})();
window.ZOMBIE = ZOMBIE;
