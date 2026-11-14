// ===================== feat/haeuser: the houses of Ratscher from inside in the normal game (HAEUSER) =====================
// Falko, 13.11.2026 23:56: „wann kann ich alle Gebäude begehen?“ – every house of the village with a front door can be entered in the
// normal game, by day and by night. The interiors are the zombie night's (zombie/z_innen*.js, ZINNEN): built on going in inside the house's
// own footprint, freed on coming out. Here only the going in and out (the action at the front door, a short fade), the look of 2026
// (haeuser/haeuser_heute.js: most houses of today, some kept after 1990, old people's with the DDR living room, one or two as they were
// before 1960 – from the house number, always the same), the lamps at night, the TV and the radio, sitting and lying; none of the zombie
// machinery (searching, barricades, weapons, break-ins). The interiors are invented and generic: these are real houses of real people.
//   HAEUSER.list()          the enterable houses (ZINNEN.list(), worked out in slices after loading)
//   HAEUSER.lookOf(id)      'heute' | 'heute-90' | 'heute-ddr' | 'alt'
//   HAEUSER.enter(id)       → Promise (in, as at the door)          HAEUSER.leave() → Promise (out in front of the door)
//   HAEUSER.H               the handle of the house one is in (ZINNEN's), or null;  HAEUSER.near  the door the action offers
// Saved: 'pav-haeuser-v1' { v: 1, id, out: [x, y, z, yaw] } while one is inside – a reload puts one in front of that door outside.
// ?szenario=haeuser (&haus=<id>, &drin=1): in front of a house near the Anger (or inside it).
import * as THREE from 'three';
import { stage, QS, cam } from '../core/head.js';
import { markDirty, whenLoaded } from '../core/assets.js';
import { KERN } from '../core/kern.js';
import { SAVE } from '../core/save.js';
import { P, floorAt } from '../game/walkable.js';
import { go } from '../game/player.js';
import { PLAY } from '../game/play.js';
import { CLOCK } from '../time/clock.js';
import { DN } from '../time/daynight.js';
import { audio } from '../audio/audio.js';
import { VILLAGE } from '../world/village.js';
import { PAL } from '../garden/garten_kit.js';
import { DTEXT } from '../dorf/dorf_text.js';
import { DLIFE } from '../dorf/dorf_life.js';
import { DCAL } from '../dorf/dorf_cal.js';
import { Z } from '../zombie/z_state.js';
import { ZIPLAN } from '../zombie/z_innen_plan.js';
import { ZINNEN } from '../zombie/z_innen.js';
import { HHEUTE } from './haeuser_heute.js';
import { HGAST } from './haeuser_gast.js';
export const HAEUSER = (() => {
  const S = {
    H: null,
    id: null,
    busy: false,
    near: null,
    grid: null,
    doors: null,
    todo: null,
    gl: false,
    tv: false,
    radio: false,
  };
  const hyp = Math.hypot;
  const KEY = SAVE.key('pav-haeuser-v1', {
    owner: 'Häuser von innen',
    kind: 'json',
    def: null,
    check: v =>
      v === null ||
      (typeof v === 'object' &&
        v.v === 1 &&
        Number.isFinite(v.id) &&
        Array.isArray(v.out) &&
        v.out.length === 4 &&
        v.out.every(q => Number.isFinite(q) && Math.abs(q) < 1e5)),
  });
  SAVE.key('pav-haeuser-hinweis', {
    owner: 'Häuser von innen: Hinweis „Ausgedacht“ gezeigt',
    kind: 'flag',
    def: false,
  });
  // the normal game: not in the zombie night (its own houses, zombie/z_haus.js) nor in the Grenzland (a world of its own)
  const on = () => !Z.on && !S.gl;
  KERN.on('grenzland:start', () => {
    S.gl = true;
    if (S.H) out(true);
  });
  KERN.on('grenzland:stop', () => (S.gl = false));
  KERN.on('zombie:start', () => S.H && out(true));
  // ---- the enterable houses: the plans worked out a few per frame after loading (all at once took ~140 ms), then a grid of doors ----
  const CELL = 8;
  function index(list) {
    const g = new Map();
    for (const h of list) {
      const k = Math.floor(h.door.x / CELL) + ',' + Math.floor(h.door.y / CELL);
      if (!g.has(k)) g.set(k, []);
      g.get(k).push(h);
    }
    S.doors = list;
    S.byId = new Map(list.map(h => [h.id, h]));
    S.grid = g;
  }
  function warm(ms) {
    if (S.doors || !VILLAGE.ready) return !!S.doors;
    if (!S.todo) S.todo = VILLAGE.bld.filter(b => ZIPLAN.enterable(b)).map(b => b.id);
    const t0 = performance.now();
    while (S.todo.length && performance.now() - t0 < ms) ZIPLAN.plan(S.todo.pop());
    if (!S.todo.length) index(ZINNEN.list());
    return !!S.doors;
  }
  S.list = () => (warm(1e9) ? S.doors : []);
  // the door one stands at: the nearest within reach in front of it (a grid lookup, a few times a second)
  function nearDoor(x, y, feet) {
    if (!S.grid) return null;
    const cx = Math.floor(x / CELL),
      cy = Math.floor(y / CELL);
    let best = null,
      bd = 1.9;
    for (let i = -1; i <= 1; i++)
      for (let j = -1; j <= 1; j++)
        for (const h of S.grid.get(cx + i + ',' + (cy + j)) || []) {
          const d = hyp(h.door.x + h.door.nx * 0.6 - x, h.door.y + h.door.ny * 0.6 - y);
          if (d < bd && Math.abs((h.door.z || 0) - feet) < 1.6) {
            bd = d;
            best = h;
          }
        }
    return best;
  }
  // the house whose inner rectangle holds a point (a jump or a resumed save put one there – no interior is built: out to its door)
  function houseAt(x, y) {
    if (!S.grid) return null;
    const cx = Math.floor(x / CELL),
      cy = Math.floor(y / CELL);
    for (let i = -3; i <= 3; i++)
      for (let j = -3; j <= 3; j++)
        for (const h of S.grid.get(cx + i + ',' + (cy + j)) || []) {
          const Pl = ZIPLAN.plan(h.id);
          if (!Pl) continue;
          const [lx, ly] = Pl.toL(x, y);
          if (lx > Pl.xi0 && lx < Pl.xi1 && ly > Pl.yi0 && ly < Pl.yi1) return h;
        }
    return null;
  }
  // ---- the look of a house in 2026 (from its number, always the same) ----
  // the villagers of dorf/dorf_text.js in their houses (dorf/dorf_life.js PIN): Gerhard (72) keeps the DDR living room, Manfred and
  // Wolfgang have kept the oak of the nineties, the younger ones live as today
  const VILLAGERS = {
    247: 'heute-ddr',
    219: 'heute-90',
    220: 'heute-90',
    260: 'heute',
    198: 'heute',
    214: 'heute',
    246: 'heute',
    191: 'heute',
  };
  let ALT = null;
  const oldStyle = id => {
    const b = VILLAGE.byId && VILLAGE.byId.get(id),
      st = b && b.st ? b.st.style : -1,
      T = VILLAGE.ST || {};
    return st === T.FW || st === T.FW_UP || st === T.SLATE || st === T.SLATE_UP || st === T.SLATE_FWG;
  };
  // the one or two houses kept as they were before 1960: half-timbered or slated ones, picked by their number
  function altIds() {
    if (ALT) return ALT;
    const ids = S.list()
      .map(h => h.id)
      .filter(id => !VILLAGERS[id] && oldStyle(id))
      .sort((a, b) => ZIPLAN.hh(a * 3.71 + 0.5) - ZIPLAN.hh(b * 3.71 + 0.5));
    return (ALT = new Set(ids.slice(0, 2)));
  }
  function lookOf(id) {
    if (VILLAGERS[id]) return VILLAGERS[id];
    if (altIds().has(id)) return 'alt';
    const h = ZIPLAN.hh(id * 1.913 + 0.37),
      old = oldStyle(id);
    if (h < (old ? 0.24 : 0.12)) return 'heute-ddr';
    if (h < (old ? 0.44 : 0.3)) return 'heute-90';
    return 'heute';
  }
  // the room names of today (the kit says Stube and Kammer; a room furnished by the look may name itself – room.name2)
  function names(H) {
    const P0 = H.plan;
    for (const r of H.rooms) {
      const pr = P0.rooms.find(q => q.id === r.id),
        rl = HHEUTE.roomLook(P0, pr || r);
      if (pr && pr.name2 && rl === 'heute') r.name = pr.name2;
      else if (r.kind === 'stube' && P0.look !== 'alt') r.name = 'Wohnzimmer';
    }
  }
  // ---- the fade (black), as in the zombie night ----
  let fadeD = null;
  function fadeEl() {
    if (fadeD) return fadeD;
    const d = document.createElement('div');
    d.id = 'hfade';
    d.style.cssText =
      'position:absolute;inset:0;background:#000;opacity:0;pointer-events:none;z-index:8;transition:opacity .3s';
    (stage || document.body).appendChild(d);
    return (fadeD = d);
  }
  const wait = ms => new Promise(r => setTimeout(r, ms));
  async function fade(v) {
    fadeEl().style.opacity = v ? '1' : '0';
    if (!window.FREEZE) await wait(320);
  }
  function put(p) {
    if (PLAY.seated()) PLAY.stand(true);
    P.mode = 'walk';
    P.x = p.x;
    P.y = p.y;
    P.feet = floorAt(p.x, p.y, (p.z ?? P.feet) + 0.3);
    P.vz = 0;
    if (p.yaw !== undefined) P.yaw = P.body = p.yaw;
    P.air = false;
    markDirty(true);
  }
  const whose = id => {
    const o = ZIPLAN.OWNERS[id];
    return o && DTEXT.P[o] ? o : null;
  };
  // ---- going in ----
  async function enter(h) {
    if (S.busy || S.H || !on()) return false;
    if (typeof h === 'number') h = S.byId ? S.byId.get(h) : null;
    if (!h) return false;
    S.busy = true;
    try {
      try {
        audio.door('eg', true);
      } catch (e) {
        void e;
      }
      await fade(true);
      const H = await ZINNEN.mount(h.id, { look: lookOf(h.id), still: true });
      if (!H) {
        await fade(false);
        PLAY.think('Die Tür ist verschlossen.', 1800);
        return false;
      }
      S.H = H;
      S.id = h.id;
      H.onUse = use;
      H.onSearch = () => null;
      strip(H);
      names(H);
      put(H.entry);
      S.auto = [];
      S.lastRoom = null;
      tvOff();
      if (dark()) light(H.rooms.find(r => r.kind === 'flur' && r.floor === 0));
      SAVE.set(KEY, {
        v: 1,
        id: h.id,
        out: [H.exit.x, H.exit.y, H.exit.z, H.exit.yaw].map(q => Math.round(q * 100) / 100),
      });
      villager(H);
      KERN.emit('haeuser:enter', { id: h.id, look: H.plan.look });
      await fade(false);
      const o = whose(h.id),
        home = S.guest
          ? DTEXT.P[S.guest].name + ' ist zu Hause.'
          : S.asleep
            ? DTEXT.P[S.asleep].name + ' schläft schon – ganz leise.'
            : null;
      if (SAVE.once('pav-haeuser-hinweis'))
        PLAY.think(
          'Ausgedacht: so könnte es heute in einem Haus in Ratscher aussehen – die echten Bewohner kennt das Spiel nicht.',
          6000
        );
      else if (o) PLAY.think(home || 'Bei ' + DTEXT.P[o].name + ' – niemand zu Hause.', 2600);
      return true;
    } catch (e) {
      console.warn('haeuser enter', e);
      fadeEl().style.opacity = '0';
      return false;
    } finally {
      S.busy = false;
    }
  }
  // the zombie night's things the normal game leaves alone: the cupboards to search, the weapons lying ready; the TV and the radio
  // get actions of their own (on and off)
  function strip(H) {
    for (const c of H.containers) KERN.unact('zinnen:' + H.id + ':c:' + c.id);
    for (const sp of H.spots)
      if (sp.kind === 'motorsaege' || sp.kind === 'axt' || sp.kind === 'tv' || sp.kind === 'radio')
        KERN.unact('zinnen:' + H.id + ':s:' + sp.id);
    S.tvSpot = H.spots.find(sp => sp.kind === 'tv') || null;
    S.radioSpot = H.spots.find(sp => sp.kind === 'radio') || null;
  }
  // ---- coming out ----
  async function leave() {
    const H = S.H;
    if (!H || S.busy) return false;
    S.busy = true;
    try {
      await fade(true);
      try {
        audio.door('eg', false);
      } catch (e) {
        void e;
      }
      out(false);
      await fade(false);
      return true;
    } finally {
      S.busy = false;
    }
  }
  // out at once (the fade's other half, or a mode that starts while one is inside)
  function out(hard) {
    const H = S.H;
    if (!H) return;
    tvOff();
    guestAway();
    put(H.exit);
    ZINNEN.unmount(H);
    S.H = null;
    S.id = null;
    SAVE.set(KEY, null);
    KERN.emit('haeuser:leave', { id: H.id });
    if (hard) fadeEl().style.opacity = '0';
  }
  // ---- inside: the lamps at night, the TV, the radio, a bed, the taps ----
  const dark = () => Math.min(1, Math.max(0, VILLAGE.night ? VILLAGE.night() : 0)) > 0.35;
  // at night the room one walks into lights up (as somebody at home would have it); the two last rooms stay lit, the older go out
  function light(r) {
    const H = S.H;
    if (!H || !r || !H.lamps.some(l => l.room === r.id)) return;
    if (!H.lit[r.id]) {
      H.light(r.id, true);
      S.auto.push(r.id);
    }
    while (S.auto.length > 2) {
      const id = S.auto.shift();
      if (id !== r.id && H.lit[id]) H.light(id, false);
    }
  }
  // at night, while the lamp of the room one is in burns: a soft warm light between the eye and the head – the lamp's light thrown back
  // by the walls and the ceiling (with the night sky's blue alone, every side turned away from the lamp looked moonlit). Even within a
  // few metres (decay 0), so no bright spot on the wall next to one; one of the pavilion's pool lights (KERN.lights: no new lamp, no new
  // program), asked for last (prio 0) and given back on going out
  const FILL = 0.6;
  const _fp = new THREE.Vector3();
  const fillWant = () => {
    const H = S.H;
    if (!H || S.busy || !dark()) return false;
    const rid = H.roomAt(P.x, P.y, P.feet + 1);
    return !!rid && !!H.lit[rid];
  };
  function fillAt(l, force) {
    if (!l) return;
    _fp.set(P.x, P.feet + 1.5, -P.y).lerp(cam.position, 0.6);
    if (force) {
      l.color.setHex(0xffd9a8);
      l.distance = 6;
      l.decay = 0;
      l.intensity = FILL;
    } else if (_fp.distanceToSquared(l.position) < 0.0025) return;
    l.position.copy(_fp);
    markDirty();
  }
  KERN.lights.borrow({
    id: 'haeuser:fill',
    n: 1,
    prio: 0,
    want: fillWant,
    on: ls => fillAt(ls[0], true),
    tick: ls => fillAt(ls[0], false),
    off: () => markDirty(),
  });
  const NEWS = [
    'Im Fernsehen: eine Naturdokumentation über den Thüringer Wald.',
    'Im Fernsehen laufen die Nachrichten.',
    'Im Fernsehen: eine Kochsendung – Klöße mit Rotkohl.',
    'Im Fernsehen: ein Krimi am Vorabend.',
    'Im Fernsehen: Fußball, zweite Halbzeit.',
    'Im Fernsehen: der Wetterbericht für Thüringen.',
  ];
  const RADIO = [
    'Im Radio läuft Musik, dann der Verkehrsfunk: frei auf der A 73.',
    'Im Radio: Schlager, dann die Nachrichten aus Thüringen.',
    'Im Radio läuft ein Hörspiel.',
    'Im Radio: Wetter und Verkehr für Südthüringen.',
  ];
  function tvSet(v) {
    const T = HHEUTE.mats();
    S.tv = v;
    T.screen.emissiveIntensity = v ? 1.15 : 0;
    T.screen.color.setHex(v ? 0x2a3442 : 0x101216);
    markDirty();
  }
  function tvOff() {
    if (S.tv || (HHEUTE.T && HHEUTE.T.screen && HHEUTE.T.screen.emissiveIntensity)) tvSet(false);
  }
  const inRoom = (H, rid) => !!H && H.roomAt(P.x, P.y, P.feet + 1) === rid;
  KERN.act({
    id: 'haeuser:tv',
    r: 2.2,
    prio: -0.1,
    pos: () => (S.H && S.tvSpot ? S.tvSpot.pos : null),
    label: () =>
      S.H && S.tvSpot && inRoom(S.H, S.tvSpot.room) ? (S.tv ? 'Fernseher ausschalten' : 'Fernseher einschalten') : null,
    run: () => {
      tvSet(!S.tv);
      if (S.tv) PLAY.think(NEWS[Math.floor(CLOCK.t / 7) % NEWS.length], 3200);
    },
  });
  KERN.act({
    id: 'haeuser:radio',
    r: 1.8,
    prio: -0.1,
    pos: () => (S.H && S.radioSpot ? S.radioSpot.pos : null),
    label: () =>
      S.H && S.radioSpot && inRoom(S.H, S.radioSpot.room)
        ? S.radio
          ? 'Radio ausschalten'
          : 'Radio einschalten'
        : null,
    run: () => {
      S.radio = !S.radio;
      if (S.radio) PLAY.think(RADIO[Math.floor(CLOCK.t / 5) % RADIO.length], 3200);
    },
  });
  // using a thing: lying on a bed or the sofa (and at night sleeping till seven, as in the garden), the taps, the stove
  function use(sp) {
    const k = sp.kind;
    if (k === 'bett') {
      const hp = sp.head || sp.pos,
        eye = (sp.o && sp.o.eye) || 0.75;
      PLAY.sit({
        x: hp[0],
        y: hp[1],
        eye: sp.pos[2] + eye,
        yaw: sp.yaw + 180,
        pitch: 60,
        kind: 'lie',
        leaveLabel: 'Aufstehen',
        primary: () => DN.canSleep() && DN.sleep(),
        primaryLabel: () => (DN.canSleep() ? 'Schlafen bis 7 Uhr' : ''),
      });
      return true;
    }
    const T = {
      ofen: 'Der Ofen ist aus – drinnen ist es warm genug.',
      herd: 'Die Platte bleibt aus – hier kocht ein anderer.',
      spuele: 'Ein Schluck Wasser aus der Leitung.',
      waschbecken: 'Kurz die Hände gewaschen.',
      wanne: 'Ein Bad nehmen? Vielleicht ein andermal.',
      dusche: 'Die Regendusche rauscht kurz – dann wieder zu.',
    };
    if (T[k]) {
      PLAY.think(T[k], 2200);
      return true;
    }
    return false;
  }
  // ---- a villager at home (dorf/dorf_life.js knows the homes and the day – read only): on the sofa or at the kitchen table, a figure of
  // its own (haeuser/haeuser_gast.js); out with the car, in the garden, at the evenings in the school or by the fire: not at home; late
  // at night asleep (not shown) ----
  S.guest = null;
  const atHome = (key, H) => {
    const t = CLOCK.t,
      Hs = DLIFE.homes && DLIFE.homes(),
      h = Hs && Hs[key];
    return (
      !!h && h.id === H.id && !DLIFE.away(key, t) && !DLIFE.routine(key, t) && !DCAL.on('skat') && !DCAL.on('fire')
    );
  };
  const awake = () => {
    const m = ((CLOCK.t % 1440) + 1440) % 1440;
    return m >= 6.5 * 60 && m < 22.5 * 60;
  };
  function villager(H) {
    S.guest = null;
    S.asleep = null;
    const key = whose(H.id);
    if (!key || !atHome(key, H)) return;
    if (!awake()) {
      S.asleep = key;
      return;
    }
    // in the living room on the sofa (or a chair there), else at the kitchen table
    const liv = H.rooms.find(r => r.kind === 'stube' && r.floor === 0),
      sp =
        (liv && H.spots.find(q => q.kind === 'sitz' && q.room === liv.id)) ||
        H.spots.find(q => q.kind === 'tisch') ||
        H.spots.find(q => q.kind === 'sitz');
    if (!sp) return;
    S.guest = key;
    S.guestSpot = sp;
    KERN.unact('zinnen:' + H.id + ':s:' + sp.id); // the place is taken
    HGAST.show(key, {
      x: sp.pos[0],
      y: sp.pos[1],
      z: sp.pos[2],
      hd: sp.kind === 'tisch' ? sp.yaw : (sp.yaw + 180) % 360,
      mode: 'sit',
      seatTop: sp.kind === 'tisch' ? 0.48 : 0.47,
    });
  }
  function guestAway() {
    S.guest = null;
    S.guestSpot = null;
    HGAST.hide();
  }
  const HELLO = [
    '„Komm rein, setz dich ruhig!“',
    '„Na, schaust du mal vorbei? Schön!“',
    '„Der Kaffee ist gleich fertig.“',
    '„Mach’s dir bequem – ich bleib noch ein bisschen sitzen.“',
    '„Schön, dass du da bist. Was gibt’s Neues im Garten?“',
  ];
  KERN.act({
    id: 'haeuser:gast',
    r: 2.4,
    prio: 0.05,
    pos: () => (S.H && S.guest && HGAST.f ? HGAST.head() : null),
    label: () => (S.H && S.guest && HGAST.f ? DTEXT.P[S.guest].name + ' grüßen' : null),
    gest3: 'greet',
    run: () => {
      S.hello = ((S.hello || 0) + 1) % HELLO.length;
      PLAY.think(DTEXT.P[S.guest].name + ': ' + HELLO[S.hello], 3600);
    },
  });
  // ---- the action at the front door, outside and inside ----
  KERN.act({
    id: 'haeuser:rein',
    r: 2.0,
    prio: 0.3,
    pos: () => {
      const h = S.near;
      return h ? [h.door.x + h.door.nx * 0.3, h.door.y + h.door.ny * 0.3, (h.door.z || P.feet) + 1] : null;
    },
    label: () => (S.near && !S.H && !S.busy && on() ? 'Hineingehen' : null),
    gest3: 'interact',
    run: () => S.near && enter(S.near),
  });
  KERN.act({
    id: 'haeuser:raus',
    r: 1.6,
    prio: 0.3,
    pos: () => (S.H && S.H.entry ? [S.H.entry.x, S.H.entry.y, S.H.entry.z + 1] : null),
    label: () => (S.H && !S.busy && !PLAY.seated() ? 'Hinausgehen' : null),
    gest3: 'interact',
    run: () => leave(),
  });
  // ---- per frame: the door nearby (5 times a second), inside the lamps and the TV, the way out by other means ----
  let acc = 0,
    flick = 0;
  KERN.tick(dt => {
    acc += dt;
    if (!S.doors) {
      if (S.go) warm(3);
      return;
    }
    if (acc < 0.2) return;
    const a = acc;
    acc = 0;
    if (!S.H) {
      S.near = on() && P.mode === 'walk' && !S.busy ? nearDoor(P.x, P.y, P.feet) : null;
      return;
    }
    const H = S.H;
    if (S.busy) return;
    // left without the door (a jump in the menu, a ride): the interior goes
    if (!H.inside(P.x, P.y, P.feet) && hyp(P.x - H.entry.x, P.y - H.entry.y) > 25) {
      tvOff();
      guestAway();
      ZINNEN.unmount(H);
      S.H = null;
      S.id = null;
      SAVE.set(KEY, null);
      return;
    }
    if (!on()) return out(true);
    if (S.guest && (S.guestT = (S.guestT || 0) + a) > 5) {
      S.guestT = 0;
      if (!atHome(S.guest, H) || !awake()) {
        PLAY.think(DTEXT.P[S.guest].name + ' ist hinausgegangen.', 2200);
        guestAway();
      }
    }
    const rid = H.roomAt(P.x, P.y, P.feet + 1);
    if (rid && rid !== S.lastRoom) {
      S.lastRoom = rid;
      if (dark()) light(H.rooms.find(r => r.id === rid));
    }
    // the TV's light flickers a little with the pictures (a few changes a second, not every frame)
    if (S.tv) {
      flick += a;
      if (flick > 0.6) {
        flick = 0;
        const T = HHEUTE.mats();
        T.screen.emissiveIntensity = 0.85 + Math.random() * 0.5;
        T.screen.emissive.setHSL(0.58 + Math.random() * 0.06, 0.35, 0.55 + Math.random() * 0.15);
        markDirty();
      }
    }
  }, 'haeuser');
  // ---- a jump (or a mode's resumed save) that lands inside a house without its interior: out in front of its door ----
  function rescue() {
    if (S.H || !S.doors || P.mode !== 'walk') return false;
    if (ZINNEN.mounted().some(H => H.inside(P.x, P.y, P.feet))) return false; // the test scene's house (?szenario=zombie-innen)
    const h = houseAt(P.x, P.y);
    if (!h) return false;
    const Pl = ZIPLAN.plan(h.id),
      e = Pl.toW(Pl.front.x, -1.3),
      yaw = ((((Math.atan2(-Pl.F.s, Pl.F.c) * 180) / Math.PI + 180) % 360) + 360) % 360;
    put({ x: e[0], y: e[1], z: KERN.terrain(e[0], e[1]), yaw });
    return true;
  }
  KERN.on('spot', () => setTimeout(() => rescue() && PLAY.think('Wieder draußen vor dem Haus.', 2200), 0));
  // ---- after loading: the plans in slices; a save from inside a house: in front of its door ----
  whenLoaded(() =>
    setTimeout(() => {
      S.go = true;
      try {
        const s = SAVE.get(KEY);
        if (!s) return;
        SAVE.set(KEY, null);
        // a scene was asked for, or the view is already somewhere else: that stands
        if (QS.get('szenario') || P.mode === 'walk' || Z.on || S.gl) return;
        KERN.spot('haeuser-weiter', {
          mode: 'walk',
          pos: [s.out[0], s.out[1]],
          z: s.out[2],
          yaw: s.out[3],
          pitch: -4,
          label: 'Vor dem Haus',
        });
        go('haeuser-weiter');
        PLAY.think('Wieder vor dem Haus, in dem du warst.', 3000);
      } catch (e) {
        console.warn('haeuser resume', e);
      }
    }, 1600)
  );
  // ---- the scene: in front of a house near the Anger (?szenario=haeuser, &haus=<id>, &drin=1 goes in) ----
  KERN.scenario('haeuser', {
    label: 'Häuser von innen',
    order: 22,
    run: () => {
      S.go = true;
      warm(1e9);
      const want = +QS.get('haus') || 0,
        h = (want && S.byId.get(want)) || S.byId.get(ZINNEN.pick(VILLAGE.ANGER[0] + 25, VILLAGE.ANGER[1] + 10));
      if (!h) return null;
      const yaw = ((Math.atan2(-h.door.nx, -h.door.ny) * 180) / Math.PI + 360) % 360,
        x = h.door.x + h.door.nx * 1.6,
        y = h.door.y + h.door.ny * 1.6;
      KERN.spot('haeuser', {
        mode: 'walk',
        pos: [x, y],
        z: KERN.terrain(x, y),
        yaw,
        pitch: -4,
        label: 'Vor einem Haus',
      });
      go('haeuser');
      S.scen = h.id;
      if (QS.get('drin')) return enter(h);
      return h;
    },
  });
  Object.assign(S, {
    lookOf,
    enter,
    leave,
    out,
    use,
    rescue,
    houseAt,
    warm,
    tvSet,
    pal: () => PAL.cells.size,
    KEY,
  });
  return S;
})();
window.HAEUSER = HAEUSER;
