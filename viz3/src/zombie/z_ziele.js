// ===================== feat/zombie-ziele: objectives with way markers through the days and nights of the zombie night (ZZIEL) =====================
// Falko, 5.11.2026 17:57, chose „Ziele mit Wegweiser“ – „Aufgaben für Tag und Nacht (Flinte holen, Haus vernageln, Ronald Essen bringen)
// mit Pfeil und Entfernung“ – and „Steigende Nächte mit Ende“ (the bus at the old school: zombie/z_ziele_bus.js). Earlier that day he could
// not find the shotgun at Hubert's: the game has to lead the player.
// The objectives are tasks of the game's own task system (core/tasks.js TASKS – saved in pav-tasks-v1, listed in the journal, the task card
// of game/quests.js shows the step with an arrow and the distance to its target). One objective runs at a time, in the order of the days:
//   day 1    Huberts Flinte → Hubert fragen → Vorräte → ein Haus vernageln          (the siren: night 1)
//   day 2    Ronald hat Hunger → Benzin für die Säge → mehr Vorräte → das Haus dicht   (night 2)
//   day 3    the radio announces the bus (zombie/z_ziele_bus.js)                       (night 3: the bus at 4:00, the ending)
// What is left at dusk waits for the next day (the first day is short: four game hours, four minutes at the usual pace); the night has its
// own task – hold out until the siren, survive until the morning, with a hint where it is safest. Every step is a check of what is real
// (Z, ZBUND, the houses), so what was done out of order counts at once, and every target follows the world: the gun where it lies,
// Hubert where he walks, the nearest house not searched yet, inside a house the next cupboard or the next window without boards.
// A marker in the world over the tracked target (≤ 150 m): a soft light-yellow ring with a pulsing dot, drawn on top, small at distance,
// two sprites with the program of the task marker of game/quests.js (made once when the mode starts – no new program while playing); in
// the free view („Sicht“) it is gone like the other displays. While the mode runs the task card is shown beside the zombie panel.
import * as THREE from 'three';
import { $, R, scene, stage, V } from '../core/head.js';
import { markDirty } from '../core/assets.js';
import { KERN } from '../core/kern.js';
import { TASKS } from '../core/tasks.js';
import { P } from '../game/walkable.js';
import { QUESTS } from '../game/quests.js';
import { CLOCK } from '../time/clock.js';
import { VEH } from '../vehicles/vehicle.js';
import { NPCS } from '../npc/npc.js';
import { Z } from './z_state.js';
import { ZINNEN } from './z_innen.js';
import { ZHAUS } from './z_haus.js';
import { ZWAFFE } from './z_waffe.js';
import { ZBUND } from './z_bund.js';
export const ZZIEL = (() => {
  const S = { on: false, cur: null, acc: 0, cardAcc: 1, prevTrack: null, pick: {}, wolf: undefined, wait: 0, at: null };
  const hyp = Math.hypot;
  const WHO = 'Zombie-Nacht';
  const minute = () => ((Math.floor(CLOCK.t) % 1440) + 1440) % 1440;
  const food = () => (Z.sup.konserve || 0) + (Z.sup.glas || 0) + (Z.sup.brot || 0);
  const isAlly = who => ZBUND.list.some(a => a.who === who && !a.dead) || (Z.clan.members || []).includes(who);
  // ---- the houses (ZINNEN.list: every house with a front door) ----
  const houses = () => {
    try {
      return ZINNEN.list() || [];
    } catch (e) {
      return [];
    }
  };
  const hs = id => Z.houses[id] || null; // (read only – Z.house(id) would make an entry)
  const searched = id => !!(hs(id) && hs(id).looted && hs(id).looted.length);
  const barred = id => (hs(id) && hs(id).bar ? Object.values(hs(id).bar).filter(v => v >= 50).length : 0);
  const doorPt = h => [h.door.x + h.door.nx * 1.4, h.door.y + h.door.ny * 1.4, (h.door.z || 0) + 2.4];
  const owner = id => {
    try {
      const i = ZINNEN.info(id);
      return i && i.owner ? i.owner : null;
    } catch (e) {
      return null;
    }
  };
  // the house with the most boards: the player's safe house for the night (null: none yet)
  function safeHouse() {
    let best = null,
      bn = 0;
    for (const [id, st] of Object.entries(Z.houses)) {
      const n = st && st.bar ? Object.values(st.bar).filter(v => v >= 50).length : 0;
      if (n > bn) {
        bn = n;
        best = +id;
      }
    }
    if (!best) return null;
    const h = houses().find(q => q.id === best);
    return h ? { h, n: bn, who: owner(best) } : null;
  }
  const houseName = s => (s && s.who ? 'das Haus von ' + s.who.split(' ')[0] : 'dein vernageltes Haus');
  // the nearest house that fits (ok), kept while it fits and is not clearly farther than another (no flipping between two)
  function nearHouse(key, ok) {
    const now = performance.now(),
      c = S.pick[key];
    if (c && c.h && now - c.t < 1500 && ok(c.h)) return c.h;
    let best = null,
      bd = 1e9;
    for (const h of houses()) {
      if (!ok(h)) continue;
      const st = hs(h.id),
        d = hyp(h.door.x - P.x, h.door.y - P.y) + (st && st.lurk ? 25 : 0);
      if (d < bd) {
        bd = d;
        best = h;
      }
    }
    if (c && c.h && c.h !== best && ok(c.h) && hyp(c.h.door.x - P.x, c.h.door.y - P.y) < bd * 1.25 + 8) best = c.h;
    S.pick[key] = { h: best, t: now };
    return best;
  }
  // ---- inside a house (ZHAUS.H, the mounted interior) ----
  const inside = () => !!(ZHAUS.H && Z.on);
  function nextContainer(kinds) {
    const H = ZHAUS.H;
    if (!H) return null;
    const st = hs(ZHAUS.bid),
      looted = (st && st.looted) || [];
    let best = null,
      bd = 1e9;
    for (const c of H.containers || []) {
      if (looted.includes(c.id) || (kinds && !kinds.includes(c.kind))) continue;
      const d = hyp(c.pos[0] - P.x, c.pos[1] - P.y) + Math.abs((c.pos[2] || 0) - P.feet) * 4; // the same storey first
      if (d < bd) {
        bd = d;
        best = c;
      }
    }
    return best;
  }
  const atThing = (p, up = 0.55) => [p[0], p[1], (p[2] || 0) + up];
  const exitPt = () => (ZHAUS.H && ZHAUS.H.entry ? [ZHAUS.H.entry.x, ZHAUS.H.entry.y, ZHAUS.H.entry.z + 2.1] : null);
  // where supplies are: inside the next cupboard not searched yet (kinds first), else out again; outside the nearest house not searched
  function searchTarget(key, kinds) {
    if (inside()) {
      const c = (kinds && nextContainer(kinds)) || nextContainer(null);
      return c ? atThing(c.pos) : exitPt();
    }
    const h = nearHouse(key, q => !searched(q.id));
    return h ? doorPt(h) : null;
  }
  // inside: the next ground-floor opening without boards (from inside); outside: the safe house, else the nearest house
  function openingsOpen() {
    const H = ZHAUS.H;
    if (!H) return [];
    const st = hs(ZHAUS.bid);
    return (H.openings || []).filter(o => !o.floor && !((st && st.bar && st.bar[o.id]) >= 50));
  }
  function barTarget(key) {
    if (inside()) {
      let best = null,
        bd = 1e9;
      for (const o of openingsOpen()) {
        const x = (o.a[0] + o.b[0]) / 2 - o.n[0] * 0.6,
          y = (o.a[1] + o.b[1]) / 2 - o.n[1] * 0.6,
          d = hyp(x - P.x, y - P.y);
        if (d < bd) {
          bd = d;
          best = [x, y, (o.z0 || P.feet) + 1.9];
        }
      }
      return best;
    }
    const s = safeHouse();
    if (s) return doorPt(s.h);
    const h = nearHouse(key, () => true);
    return h ? doorPt(h) : null;
  }
  // people: where the walker is (his head), else his yard
  function personAt(who) {
    const w = NPCS[who];
    if (!w || !Number.isFinite(w.x)) return null;
    let z = P.feet;
    try {
      z = KERN.ground(w.x, w.y);
    } catch (e) {}
    return [w.x, w.y, (Number.isFinite(z) ? z : P.feet) + 2.35];
  }
  const thingAt = id => {
    const T = ZWAFFE.thing(id);
    return T && T.state === 'world' ? atThing(T.pos, 0.6) : null;
  };
  // Wolfgang, the forest worker, keeps a chainsaw (and its petrol) in his hall (zombie/z_innen_einr.js)
  function wolfHouse() {
    if (S.wolf !== undefined) return S.wolf;
    S.wolf = null;
    for (const h of houses())
      if (/^Wolfgang\b/.test(owner(h.id) || '')) {
        S.wolf = h;
        break;
      }
    return S.wolf;
  }
  // ---- the objectives of the days: one at a time, in this order; each a task with one step (a check of the world) ----
  const OBJ = [
    {
      id: 'zz-flinte',
      day: 1,
      title: 'Huberts Flinte',
      text: () =>
        'Hol dir Huberts Doppelflinte – sie liegt mit einer Schachtel Schrot auf seinem Tisch vor der Werkstatt, gleich westlich vom Garten.',
      target: () => thingAt('flinte'),
      done: () => !!Z.weap.flinte,
      fin: 'Zwei Schuss, dann nachladen (R).',
    },
    {
      id: 'zz-hubert',
      day: 1,
      title: 'Hubert fragen',
      text: () =>
        'Frag Hubert, ob er mitkommt – sprich ihn an: „Hilfst du mir gegen die Zombies?“ Zu zweit hält man die Nacht besser durch.',
      target: () => personAt('hubert'),
      done: () => isAlly('hubert'),
      fin: 'Hubert kommt mit.',
    },
    {
      id: 'zz-vorrat',
      day: 1,
      title: 'Vorräte',
      text: () => {
        const f = Math.max(0, 3 - food()),
          w = Math.max(0, 2 - (Z.sup.wasser || 0));
        const need = [f ? f + ' × Essen' : '', w ? w + ' × Wasser' : ''].filter(Boolean).join(' und ');
        return (
          'Such in den Häusern Vorräte für die Nacht' +
          (need ? ': noch ' + need + '.' : '.') +
          (inside() ? ' Schränke, Kühlschrank und Keller durchsuchen.' : ' Im Dorf: an der Haustür „Ins Haus gehen“.')
        );
      },
      target: () => searchTarget('vorrat', ['kuehlschrank', 'buefett', 'schrank', 'regal']),
      done: () => food() >= 3 && (Z.sup.wasser || 0) >= 2,
      fin: 'Genug für eine Nacht.',
    },
    {
      id: 'zz-haus',
      day: 1,
      title: 'Ein Haus vernageln',
      text: () => {
        const s = safeHouse(),
          n = s ? s.n : 0;
        if (!Z.has('brett', 2) || !Z.has('nagel'))
          return (
            'Mach ein Haus sicher für die Nacht: Fenster und Türen vernageln. Dafür brauchst du zwei Bretter und Nägel – ' +
            'such an Werkbänken und in Kisten im Keller.'
          );
        return 'Vernagle in einem Haus zwei Fenster oder Türen im Erdgeschoss (' + Math.min(n, 2) + '/2).';
      },
      target: () =>
        !Z.has('brett', 2) || !Z.has('nagel')
          ? searchTarget('bretter', ['werkbank', 'kiste', 'truhe', 'werkzeugkiste'])
          : barTarget('haus'),
      done: () => !!(safeHouse() && safeHouse().n >= 2),
      fin: 'Das Haus hält eine Weile.',
    },
    {
      id: 'zz-ronald',
      day: 2,
      title: 'Ronald hat Hunger',
      text: () =>
        food()
          ? 'Bring Ronald etwas zu essen – dann kommt er mit. Sprich ihn an: „Kommst du mit?“'
          : 'Ronald hilft erst mit vollem Magen. Such eine Konserve, ein Glas oder Brot und bring es ihm.',
      target: () =>
        food() ? personAt('ronald') : searchTarget('ronald', ['kuehlschrank', 'buefett', 'schrank', 'regal']),
      done: () => isAlly('ronald'),
      fin: 'Ronald ist dabei.',
    },
    {
      id: 'zz-benzin',
      day: 2,
      title: 'Benzin für die Säge',
      text: () => {
        if (!Z.weap.motorsaege)
          return 'Hol die Motorsäge aus der Werkstatt im Garten – und Benzin dazu: sie säuft, und nachts ist sie die beste Waffe.';
        const w = wolfHouse();
        return w && !searched(w.id)
          ? 'Such Benzin für die Motorsäge. Wolfgang, der Waldarbeiter, hat eine zweite Säge im Flur – mit Sprit.'
          : 'Such Benzin für die Motorsäge – am ehesten an Werkbänken und in Kisten im Keller.';
      },
      target: () => {
        if (!Z.weap.motorsaege) return thingAt('motorsaege');
        if (inside()) {
          const sp = (ZHAUS.H.spots || []).find(s => s.kind === 'motorsaege');
          const st = hs(ZHAUS.bid);
          if (sp && !(st && st.looted && st.looted.includes(sp.id))) return atThing(sp.pos);
          return searchTarget('benzin', ['werkbank', 'kiste', 'werkzeugkiste']);
        }
        const w = wolfHouse();
        return w && !searched(w.id) ? doorPt(w) : searchTarget('benzin', ['werkbank', 'kiste']);
      },
      done: () => !!Z.weap.motorsaege && Z.has('benzin'),
      fin: 'R tankt die Säge aus dem Rucksack nach.',
    },
    {
      id: 'zz-vorrat2',
      day: 2,
      title: 'Mehr Vorräte',
      text: () => {
        const f = Math.max(0, 4 - food()),
          w = Math.max(0, 2 - (Z.sup.wasser || 0)),
          v = Z.has('verband') ? 0 : 1;
        const need = [f ? f + ' × Essen' : '', w ? w + ' × Wasser' : '', v ? 'einen Verbandskasten' : '']
          .filter(Boolean)
          .join(', ');
        return (
          'Für zwei Nächte reicht es nicht: such ' +
          (need || 'weiter') +
          '. Verbandskästen liegen oft in Autos und Schränken.'
        );
      },
      target: () =>
        searchTarget(
          'vorrat2',
          Z.has('verband') ? ['kuehlschrank', 'buefett', 'regal'] : ['schrank', 'kleiderschrank']
        ),
      done: () => food() >= 4 && (Z.sup.wasser || 0) >= 2 && Z.has('verband'),
      fin: 'Der Rucksack ist voll.',
    },
    {
      id: 'zz-haus2',
      day: 2,
      title: 'Das Haus dicht machen',
      text: () => {
        const s = safeHouse(),
          n = s ? s.n : 0;
        if (!Z.has('brett', 2) || !Z.has('nagel'))
          return 'Die zweite Nacht wird härter. Mehr Bretter und Nägel: Werkbänke, Kisten, Truhen – dann alle Fenster und Türen unten zu.';
        return (
          'Die zweite Nacht wird härter: vernagle ' +
          (s ? houseName(s) : 'ein Haus') +
          ' ganz – mindestens vier Fenster oder Türen (' +
          Math.min(n, 4) +
          '/4).'
        );
      },
      target: () =>
        !Z.has('brett', 2) || !Z.has('nagel')
          ? searchTarget('bretter2', ['werkbank', 'kiste', 'truhe', 'werkzeugkiste'])
          : barTarget('haus2'),
      done: () => !!(safeHouse() && safeHouse().n >= 4),
      fin: 'Unten ist alles zu.',
    },
  ];
  const BYID = Object.fromEntries(OBJ.map(o => [o.id, o]));
  // more objectives of a later day (zombie/z_ziele_bus.js: the radio on day 3) – in the order they are added
  function add(o) {
    OBJ.push(o);
    BYID[o.id] = o;
    defObj(o);
  }
  // a target function that draws its own marker (game/quests.js then draws none – target.ownMark)
  const own = f => {
    const g = () => {
      try {
        return Z.on ? f() : null;
      } catch (e) {
        return null;
      }
    };
    g.ownMark = true;
    return g;
  };
  function defObj(o) {
    TASKS.define({
      id: o.id,
      title: o.title,
      who: WHO + ' · Tag ' + o.day,
      steps: [
        {
          get text() {
            try {
              return o.text();
            } catch (e) {
              return o.title;
            }
          },
          target: own(o.target),
          check: () => Z.on && o.done(),
        },
      ],
      done: o.fin,
    });
  }
  for (const o of OBJ) defObj(o);
  // ---- the nights: hold out until the siren, then survive until the morning (night 3: zombie/z_ziele_bus.js replaces it) ----
  const NIGHT = ['', 'Die erste Nacht', 'Die zweite Nacht', 'Die dritte Nacht'];
  const nightTitle = n => NIGHT[n] || 'Nacht ' + n;
  const hours = m =>
    m >= 90
      ? 'noch etwa ' + Math.round(m / 60) + ' Stunden'
      : m >= 45
        ? 'noch etwa eine Stunde'
        : 'nicht mehr lange – noch ' + Math.max(5, Math.round(m / 10) * 10) + ' Minuten';
  // where it is safest at night: the safe house (outside it: its door; inside: the weakest window), else Hubert or Ronald
  function nightTarget() {
    const s = safeHouse();
    if (inside()) {
      if (s && ZHAUS.bid === s.h.id) {
        const H = ZHAUS.H,
          st = hs(ZHAUS.bid);
        let w = null,
          wh = 60;
        for (const o of H.openings || []) {
          const hp = st && st.bar ? st.bar[o.id] : undefined;
          if (o.floor || hp === undefined || hp >= wh) continue;
          wh = hp;
          w = [(o.a[0] + o.b[0]) / 2 - o.n[0] * 0.6, (o.a[1] + o.b[1]) / 2 - o.n[1] * 0.6, (o.z0 || P.feet) + 1.9];
        }
        return w;
      }
      return null;
    }
    if (s) return doorPt(s.h);
    for (const who of ['hubert', 'ronald']) {
      const a = ZBUND.list.find(q => q.who === who);
      if (a && a.mode !== 'folgen' && !a.dead) return personAt(who);
    }
    return null;
  }
  function nightHint() {
    const s = safeHouse();
    if (inside() && s && ZHAUS.bid === s.h.id) {
      const t = nightTarget();
      return t ? ' Eine Barrikade gibt nach – ausbessern (Bretter, Nägel)!' : ' Bleib drinnen und halt die Barrikaden.';
    }
    if (s) return ' Am sichersten: ' + houseName(s) + ' – drinnen riechen sie dich, aber die Bretter halten sie auf.';
    if (ZBUND.list.length) return ' Bleib bei deinen Leuten und halt dir den Rücken frei.';
    return ' Kein vernageltes Haus – halt dich an Laternen und offene Plätze, lauf, wenn es zu viele werden.';
  }
  const timeTo = k => {
    const T = Z.times ? Z.times() : null;
    return T ? (T[k] - minute() + 1440) % 1440 : 0;
  };
  function defNight(n) {
    const id = 'zz-nacht' + n;
    if (TASKS.list().includes(id)) return id;
    TASKS.define({
      id,
      title: nightTitle(n),
      who: WHO + ' · Nacht ' + n,
      steps: [
        {
          get text() {
            return 'Halte durch, bis die Sirene heult (' + hours(timeTo('siren')) + ').' + nightHint();
          },
          target: own(nightTarget),
          on: 'zombie:siren',
          when: d => !d || !Number.isFinite(d.night) || d.night >= n,
        },
        {
          get text() {
            return 'Überlebe bis zum Morgengrauen – ' + hours(timeTo('dawn')) + '.' + nightHint();
          },
          target: own(nightTarget),
          on: 'zombie:survived',
          when: d => !d || !Number.isFinite(d.night) || d.night >= n,
        },
      ],
      done: n === 1 ? 'Die erste Nacht ist geschafft. Sie kommen wieder.' : 'Wieder eine Nacht geschafft.',
    });
    return id;
  }
  for (let n = 1; n <= 3; n++) defNight(n);
  const NIGHTS = { custom: {} }; // night n → id of its own task (z_ziele_bus.js: night 3 is the bus)
  const nightId = n => NIGHTS.custom[n] || defNight(n);
  // ---- the chain: which objective runs now, the task card follows it ----
  const mine = k => typeof k === 'string' && /^(aufgaben:)?zz-/.test(k);
  function track(id) {
    if (!id) return;
    const key = 'aufgaben:' + id;
    if (S.cur !== id) {
      S.cur = id;
      if (QUESTS.track !== key) QUESTS.track = key;
    }
  }
  function sync() {
    if (!Z.on || Z.hp <= 0) return;
    const night = Z.phase === 'nacht',
      day = night ? Z.night : Z.night + 1;
    // a night that ended without the morning's all-clear (one died and woke in the garden): its task goes quietly
    for (let n = 1; n <= Z.night; n++) {
      const id = nightId(n),
        st = TASKS.state(id);
      if (st && st.st === 'läuft' && (n < Z.night || !night) && !(NIGHTS.keep && NIGHTS.keep(n))) TASKS.reset(id);
    }
    if (S.hook && S.hook(day, night)) return; // (the ending: zombie/z_ziele_bus.js steers the chain itself)
    let cur = null;
    if (night) {
      const id = nightId(Z.night);
      let st = TASKS.state(id);
      if (!st) {
        TASKS.start(id);
        st = TASKS.state(id);
      }
      // the siren has sounded: past „hold out until the siren“
      if (st && st.st === 'läuft' && st.i === 0) TASKS.advance(id);
      cur = id;
    } else {
      for (const o of OBJ) {
        if (o.day > day) break;
        const st = TASKS.state(o.id);
        if (st && st.st === 'erledigt') continue;
        if (!st) TASKS.start(o.id);
        cur = o.id;
        break;
      }
      // all done before dusk: the night's task begins (hold out until the siren)
      if (!cur) {
        const id = nightId(day),
          st = TASKS.state(id);
        if (!st) TASKS.start(id);
        cur = id;
      }
    }
    track(cur);
  }
  function resetAll() {
    for (const id of TASKS.list()) if (mine(id)) TASKS.reset(id);
    for (let n = 1; n <= 60; n++) TASKS.reset('zz-nacht' + n);
    S.cur = null;
    S.pick = {};
  }
  KERN.on('zombie:start', d => {
    S.on = true;
    if (!mine(QUESTS.track)) S.prevTrack = QUESTS.track;
    if (d && d.fresh) {
      resetAll();
      S.wait = 2.5; // the intro first
    } else S.wait = 0.6;
    for (let n = 1; n <= Math.max(3, Z.night + 1); n++) nightId(n);
    S.cur = null;
    mkWarm();
  });
  KERN.on('zombie:stop', () => {
    S.on = false;
    resetAll();
    if (S.prevTrack && mine(QUESTS.track)) QUESTS.track = S.prevTrack;
    S.prevTrack = null;
    mkHide();
    document.body.classList.remove('zziel');
  });
  KERN.on('reset', () => resetAll());
  // a step done: at once to the next one (not half a second later)
  KERN.on('task:done', d => {
    if (d && mine(d.id) && Z.on) setTimeout(sync, 0);
  });
  // ---- the task card while the mode runs: beside the zombie panel (wide screens) or under it ----
  const CSS = `
body[data-zombie="1"]:not([data-drive]):not([data-clean="1"]) #qtrack:not([hidden]){display:grid!important;top:var(--zz-top,66px)!important;
  left:var(--zz-left,12px)!important;max-width:var(--zz-w,min(330px,40vw))!important;z-index:6}
`;
  let styled = false;
  function placeCard() {
    if (!styled) {
      const st = document.createElement('style');
      st.textContent = CSS;
      document.head.appendChild(st);
      styled = true;
    }
    const zh = $('zhud'),
      host = $('p-3d') || stage;
    if (!zh || zh.hidden || !host) return;
    const r = zh.getBoundingClientRect(),
      h = host.getBoundingClientRect(),
      wide = h.width - (r.right - h.left) >= 260;
    const left = Math.round(wide ? r.right - h.left + 10 : r.left - h.left),
      top = Math.round(wide ? r.top - h.top : r.bottom - h.top + 8),
      w = Math.round(wide ? Math.min(340, h.width - (r.right - h.left) - 24) : Math.min(380, h.width - 24)),
      k = left + ',' + top + ',' + w;
    if (k === S.cardK) return;
    S.cardK = k;
    const b = document.body.style;
    b.setProperty('--zz-left', left + 'px');
    b.setProperty('--zz-top', top + 'px');
    b.setProperty('--zz-w', w + 'px');
  }
  // ---- the marker in the world: a ring and a pulsing dot over the tracked target ----
  const MK = {
    ring: null,
    dot: null,
    on: false,
    at: new THREE.Vector3(),
    d: 0,
    warm: false,
    warming: false,
    dirtyT: 0,
    op: 0.9,
  };
  const _c = new THREE.Vector3(),
    _t = new THREE.Vector3();
  function canvasTex(draw) {
    const c = document.createElement('canvas');
    c.width = c.height = 128;
    draw(c.getContext('2d'));
    const t = new THREE.CanvasTexture(c);
    t.colorSpace = THREE.SRGBColorSpace;
    return t;
  }
  // the size on screen (radians across the ring) by the real distance: large near, small far
  const angOf = d => (d <= 15 ? 0.075 : d >= 150 ? 0.03 : 0.075 - ((d - 15) / 135) * 0.045);
  // placed on the line from the eye to the target, a few metres ahead – the size it should have, and the fog of the night does not eat it
  function place(o, camera, big) {
    _c.setFromMatrixPosition(camera.matrixWorld);
    _t.copy(MK.at).sub(_c);
    const d3 = _t.length();
    if (d3 < 1e-3) return;
    const D = Math.min(d3, 7);
    o.position.copy(_c).addScaledVector(_t, D / d3);
    const pulse = big ? 1 : 0.5 + 0.5 * Math.sin(performance.now() / 260);
    const s = ((angOf(MK.d) * D) / 0.62) * (big ? 1 : 0.42 + 0.18 * pulse);
    o.scale.set(s, s, 1);
    if (!big) o.material.opacity = (0.55 + 0.4 * pulse) * MK.op;
    o.updateMatrixWorld();
  }
  function mkBuild() {
    if (MK.ring) return;
    const ringT = canvasTex(q => {
      q.translate(64, 64);
      q.lineWidth = 15;
      q.strokeStyle = 'rgba(24,18,10,0.38)';
      q.beginPath();
      q.arc(0, 0, 40, 0, Math.PI * 2);
      q.stroke();
      q.lineWidth = 7;
      q.strokeStyle = '#ffe7a6';
      q.beginPath();
      q.arc(0, 0, 40, 0, Math.PI * 2);
      q.stroke();
      // a small point below the ring: the target is under it
      q.fillStyle = 'rgba(24,18,10,0.38)';
      q.beginPath();
      q.moveTo(-11, 46);
      q.lineTo(11, 46);
      q.lineTo(0, 62);
      q.closePath();
      q.fill();
      q.fillStyle = '#ffe7a6';
      q.beginPath();
      q.moveTo(-7, 48);
      q.lineTo(7, 48);
      q.lineTo(0, 58);
      q.closePath();
      q.fill();
    });
    const dotT = canvasTex(q => {
      const g = q.createRadialGradient(64, 64, 0, 64, 64, 62);
      g.addColorStop(0, 'rgba(255,246,214,1)');
      g.addColorStop(0.3, 'rgba(255,231,166,1)');
      g.addColorStop(0.55, 'rgba(255,214,120,0.35)');
      g.addColorStop(1, 'rgba(255,200,100,0)');
      q.fillStyle = g;
      q.fillRect(0, 0, 128, 128);
    });
    // the same material settings as the task marker of game/quests.js: the same shader program
    const mk = (map, order) => {
      const s = new THREE.Sprite(
        new THREE.SpriteMaterial({ map, depthTest: false, depthWrite: false, transparent: true, opacity: 0.9 })
      );
      s.renderOrder = order;
      s.visible = false;
      s.frustumCulled = false; // (placed in onBeforeRender with the camera that draws it)
      s.userData.noMerge = true;
      scene.add(s);
      return s;
    };
    MK.ring = mk(ringT, 1000);
    MK.dot = mk(dotT, 1001);
    MK.ring.onBeforeRender = (r, sc, camera) => place(MK.ring, camera, true);
    MK.dot.onBeforeRender = (r, sc, camera) => place(MK.dot, camera, false);
  }
  // the sprites' program made when the mode starts: shown once, invisible, in the next drawn frame
  function mkWarm() {
    mkBuild();
    if (MK.warm) return;
    MK.ring.material.opacity = 0;
    MK.at.copy(V(P.x + 3, P.y + 3, P.feet + 1.6));
    MK.d = 5;
    MK.ring.visible = true;
    MK.warming = true;
    const prev = MK.ring.onAfterRender;
    MK.ring.onAfterRender = function () {
      MK.ring.onAfterRender = prev;
      MK.warm = true;
      MK.warming = false;
      if (!MK.on) MK.ring.visible = false;
    };
    markDirty();
  }
  function mkHide() {
    if (!MK.ring) return;
    if (MK.on) markDirty();
    MK.on = false;
    MK.dot.visible = false;
    if (!MK.warming) MK.ring.visible = false;
  }
  // the tracked target, if it is one of ours: [x, y, z] or null
  function trackedTarget() {
    if (!mine(QUESTS.track)) return null;
    const e = S.entry;
    if (!e || e.status === 'erledigt' || !e.target) return null;
    try {
      return e.target();
    } catch (err) {
      return null;
    }
  }
  function mkTick(dt) {
    const clean = document.body.dataset.clean === '1',
      show0 = S.on && Z.on && !clean && (P.mode === 'walk' || (VEH && VEH.cur)) && Z.hp > 0;
    const tp = show0 ? trackedTarget() : null;
    if (!tp) return mkHide();
    const px = VEH && VEH.cur ? VEH.cur.st.x : P.x,
      py = VEH && VEH.cur ? VEH.cur.st.y : P.y,
      d = hyp(tp[0] - px, tp[1] - py);
    if (d > 150 || d < 3.5) return mkHide();
    mkBuild();
    let z = tp[2];
    if (!Number.isFinite(z)) {
      try {
        z = KERN.ground(tp[0], tp[1]) + 2.2;
      } catch (e) {
        z = P.feet + 2.2;
      }
    }
    MK.at.copy(V(tp[0], tp[1], z));
    MK.d = d;
    // night: dimmer, so it does not glare (the picture's exposure is high then); fading out near the target and the 150 m
    const ex = R.toneMappingExposure || 1,
      fade = Math.min(1, (d - 3.5) / 3, (150 - d) / 15);
    MK.op = Math.max(0, fade) * (Z.phase === 'nacht' ? 0.78 : 0.92);
    const col = Math.max(0.14, Math.min(1, 1.15 / ex));
    MK.ring.material.color.setScalar(col);
    MK.dot.material.color.setScalar(col);
    MK.ring.material.opacity = MK.op;
    if (!MK.on) {
      MK.on = true;
      MK.ring.visible = MK.dot.visible = true;
      markDirty();
    }
    // the dot pulses: a frame now and then (as the task marker of the game does)
    MK.dirtyT += dt;
    if (MK.dirtyT > 0.25) {
      MK.dirtyT = 0;
      markDirty();
    }
  }
  // ---- per frame ----
  KERN.tick(dt => {
    if (!S.on || !Z.on) {
      if (MK.on) mkHide();
      return;
    }
    if (S.wait > 0) {
      S.wait -= dt;
      if (S.wait > 0) return;
      sync();
    }
    S.acc += dt;
    if (S.acc >= 0.5) {
      S.acc = 0;
      sync();
    }
    // the tracked entry of ours (four times a second; the target itself every frame)
    S.cardAcc += dt;
    if (S.cardAcc >= 0.25) {
      S.cardAcc = 0;
      placeCard();
      S.entry = mine(QUESTS.track) ? KERN.tasks.list().find(e => e.key === QUESTS.track) || null : null;
    }
    mkTick(dt);
  }, 'zombie/ziele');
  Object.assign(S, {
    OBJ,
    BYID,
    NIGHTS,
    add,
    sync,
    resetAll,
    safeHouse,
    nearHouse,
    searchTarget,
    barTarget,
    nightTarget,
    personAt,
    wolfHouse,
    own,
    nightId,
    defNight,
    MK,
    mine,
    track,
    houses,
  });
  return S;
})();
window.ZZIEL = ZZIEL;
