// @ts-check
// ===================== KERN: services every feature uses (refactor phase 1 and 2) =====================
// Features ask KERN instead of reaching into other modules. The world modules register themselves as providers when they load
// (world/ratscher.js, world/roads.js, world/worldcol.js, world/village_props.js, welt/welt.js); the frame loop calls KERN.update(dt).
// Phase 1 – the world:
//   KERN.ground(x, y, z?)  height (m) of the ground one stands or drives on: terrain, modelled site, bridge decks (z: the current height –
//                          a deck counts only when coming from its level)
//   KERN.terrain(x, y)     height of the terrain itself (no decks)          KERN.surface(x, y) → { e, kind, surf, lat } of a road, or null
//   KERN.pushOut(p, r)     moves the point p = [x, y] out of walls and trunks (radius r, outside the modelled square)
//   KERN.free(x, y)        true where a provider (the tiled world, welt/welt.js) lets one walk beyond the 2.4 km square
//   KERN.provide(name, fn, prio = 0)   for the world modules;  KERN.providers() lists what is registered (tests)
//   A provider that returns undefined passes the question on to the next one (a zone answers only inside itself).
// Phase 2 – services for extensions instead of hooks into other modules (docs/plans/plan_phase2.md, building block 1):
//   KERN.place(x, y, z?)   name of the place, or null – the providers from the highest priority down (null/undefined: the next one);
//                          KERN.area({ name, rect | circle | poly, z, prio, inside }) adds a named area; KERN.inside(x, y, z) indoor acoustics
//   KERN.spot(name, def)   a place to jump to (menu Orte, data-spot="name"): { mode, pos, z, yaw, pitch, label } – merged into an existing one;
//                          KERN.spots() is the registry itself (game/player.js SPOTS is the same object)
//   KERN.scenario(name, { label, run, order }) a start situation – ?szenario=name runs it after loading (boot/boot.js), tests use the same;
//                          KERN.scenarios() lists them (garten, dorf, freitag, feuer, schleusingen, wald, brief, wahlkampf, wahltag, stadtrat …)
//   KERN.tasks.source({ id, order, list }) / KERN.tasks.list()   one journal for the tasks of every feature (game/quests.js shows it, key J):
//                          an entry { id, title, who, status: 'offen' | 'läuft' | 'erledigt', text, target: () => [x, y] | null, z }
//   KERN.act(a) / KERN.unact(id) / KERN.acts()   entries of the action button (game/play.js picks the nearest and runs it):
//                          { id, label: () => text | null, pos: () => [x, y, z], r, run, prio, hold, gauge, need, start, cancel, gest3 }
//   KERN.on(name, fn) → off, KERN.emit(name, data)   events for tasks and statistics (list below), KERN.events() the last ones
//   KERN.zone({ id, x, y, near, far, build, drop, tick, keep })   build near (async allowed), drop far (hysteresis), time per zone in the
//                          load log; KERN.zones() their state; KERN.until(cond, s) → promise when cond() holds (checked each update)
//   KERN.lights.pool(list, { home, restore }) / KERN.lights.borrow({ id, n, prio, want, on, tick, off }) / KERN.lights.status()
//                          the pavilion's point lights lent by need – no new lamps, so no newly compiled shaders
//   KERN.where()           [x, y] of the observer (the walker, else the camera) – zones and lights measure from it
// Events (data): 'place' { name, prev }, 'talk' { who }, 'act' { id }, 'take' { id }, 'zone' { id, state, ms }, 'fell' { id },
//   'load' { what, n }, 'spot' { name } – a feature may add its own with a prefix ('dorf:…', 'amt:…').
/**
 * A road under a point (KERN.surface).
 * @typedef {object} RoadAt
 * @property {number} e     distance to the road edge (m, larger = further inside)
 * @property {number} kind  road class, index into GEOMAN.roads.kinds (motorway, main, county, street, lane, service, track, path, foot)
 * @property {number} surf  surface, index into GEOMAN.roads.surf (asphalt, concrete, paving, gravel, ground, grass)
 * @property {number} lat   lateral offset from the centre line (m)
 */
/**
 * A named area (KERN.area): one of rect [x0, y0, x1, y1], circle [x, y, r] or poly [[x, y], …]; z [z0, z1] limits the height.
 * @typedef {object} Area
 * @property {string} name
 * @property {number[]} [rect]
 * @property {number[]} [circle]
 * @property {number[][]} [poly]
 * @property {number[]} [z]
 * @property {number} [prio]    priority among the place providers (default 30: above the village and the roads, below the garden)
 * @property {boolean} [inside] counts as indoors (acoustics, lamps)
 */
/**
 * A zone that is built near and dropped far (KERN.zone).
 * @typedef {object} Zone
 * @property {string} id
 * @property {number} x
 * @property {number} y
 * @property {number} near   build when the observer comes closer (m)
 * @property {number} far    drop when the observer goes farther (m, > near)
 * @property {() => any} build   may return a promise; an error leaves the zone in state 'error' (named in the load log)
 * @property {() => any} drop
 * @property {(dt: number, d: number) => void} [tick]  every frame while ready (d = distance of the observer)
 * @property {number} [keep]  seconds to wait beyond 'far' before dropping (default 0)
 */
/**
 * A wish for shared lights (KERN.lights.borrow).
 * @typedef {object} Borrow
 * @property {string} id
 * @property {number} n
 * @property {number} [prio]
 * @property {() => boolean} want  checked each update; true while the lights are wanted
 * @property {(ls: any[]) => void} [on]   the lights came (the borrower sets colour, distance, decay, position, intensity)
 * @property {(ls: any[], dt: number) => void} [tick]  every frame while held
 * @property {() => void} [off]  the lights went back home
 */
/**
 * @typedef {'ground' | 'terrain' | 'surface' | 'pushOut' | 'place' | 'free' | 'inside' | 'observer'} KernService
 * @typedef {object} Kern
 * @property {(name: KernService, fn: (...a: any[]) => any, prio?: number) => void} provide  for the world modules (highest prio answers)
 * @property {() => Record<string, number>} providers  how many providers each service has (tests)
 * @property {(x: number, y: number, z?: number) => number} ground  height (m) one stands or drives on; z: current height (bridge decks)
 * @property {(x: number, y: number) => number} terrain  height of the terrain itself
 * @property {(x: number, y: number) => RoadAt | null} surface  the road at a point, or null
 * @property {(p: number[], r: number) => boolean} pushOut  moves p = [x, y] (in place) out of walls and trunks; true if it moved
 * @property {(x: number, y: number, z?: number) => string | null} place  name of the place or road, highest priority first
 * @property {(x: number, y: number) => boolean} free  one may walk there although it lies beyond the 2.4 km square
 * @property {(a: Area) => Area} area  a named area for KERN.place (and KERN.inside)
 * @property {(x: number, y: number, z?: number) => boolean} inside  indoors (areas with inside: true, providers 'inside')
 * @property {(name: string, def?: object) => any} spot  a place to jump to; without def: the one registered
 * @property {() => Record<string, any>} spots  the registry of places to jump to
 * @property {(name: string, def?: { label?: string, run: () => any, order?: number }) => any} scenario  a start situation; without def: the one registered or null
 * @property {() => any[]} scenarios  all start situations by order (tests, menu)
 * @property {{ source: (src: { id: string, order?: number, list: () => any[] }) => any, list: () => any[] }} tasks  the journal's sources and
 *   their entries { id, title, who, status: 'offen' | 'läuft' | 'erledigt', text, target?: () => number[] | null, z?: number } (+ src, key)
 * @property {(a: any) => any} act  an entry of the action button (replaces one with the same id)
 * @property {(id: string) => void} unact
 * @property {() => any[]} acts
 * @property {(name: string, fn: (data: any, name?: string) => void) => () => void} on  '*' hears everything (data, name)
 * @property {(name: string, data?: any) => void} emit
 * @property {() => Array<{ name: string, t: number, data: any }>} events  the last events (tests, error report)
 * @property {(z: Zone) => Zone} zone
 * @property {() => Array<{ id: string, state: string, d: number, ms: number, err: string, built: number, dropped: number }>} zones
 * @property {(cond: () => any, s?: number) => Promise<any>} until  resolves when cond() is truthy, rejects after s seconds (default 60)
 * @property {{ pool: (list: any[], o?: { home?: () => boolean, restore?: () => void }) => void, borrow: (b: Borrow) => Borrow, status: () => Array<{ id: string, n: number, has: number }> }} lights
 * @property {() => number[] | null} where  where the observer is: [x, y] of the walker, else of the camera (provider 'observer', game/player.js)
 * @property {(dt: number) => void} update  once per frame from the frame loop (game/game.js): zones, lights, waits
 */
/** @type {Kern} – type-checked (// @ts-check above; tools/check/tsconfig.json, run by tools/check.sh) */
export const KERN = (() => {
  const W = /** @type {any} */ (globalThis).window || {};
  const now = () => (typeof performance !== 'undefined' ? performance.now() : Date.now());
  const log = (m, err) => {
    const L = W.LOADLOG;
    if (L) err ? L.err(m) : L.note(m, true);
  };
  const P = {};
  function provide(name, fn, prio = 0) {
    (P[name] = P[name] || []).push({ fn, prio });
    P[name].sort((a, b) => b.prio - a.prio);
  }
  // the highest priority answers; undefined passes on to the next provider
  const first =
    (name, fallback) =>
    (...a) => {
      const L = P[name];
      if (L)
        for (let i = 0; i < L.length; i++) {
          const v = L[i].fn(...a);
          if (v !== undefined) return v;
        }
      return fallback;
    };

  // ---- places: providers and named areas ----
  const inPoly = (x, y, poly) => {
    let c = false;
    for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
      const a = poly[i],
        q = poly[j];
      if (a[1] > y !== q[1] > y && x < ((q[0] - a[0]) * (y - a[1])) / (q[1] - a[1]) + a[0]) c = !c;
    }
    return c;
  };
  const inArea = (A, x, y, z) => {
    if (A.z && z !== undefined && (z < A.z[0] || z > A.z[1])) return false;
    if (A.rect) return x >= A.rect[0] && x <= A.rect[2] && y >= A.rect[1] && y <= A.rect[3];
    if (A.circle) return Math.hypot(x - A.circle[0], y - A.circle[1]) <= A.circle[2];
    if (A.poly) return inPoly(x, y, A.poly);
    return false;
  };
  const AREAS = [];
  function area(A) {
    AREAS.push(A);
    provide('place', (x, y, z) => (inArea(A, x, y, z) ? A.name : undefined), A.prio === undefined ? 30 : A.prio);
    return A;
  }
  function place(x, y, z) {
    for (const p of P.place || []) {
      const n = p.fn(x, y, z);
      if (n) return n;
    }
    return null;
  }
  function inside(x, y, z) {
    for (const A of AREAS) if (A.inside && inArea(A, x, y, z)) return true;
    for (const p of P.inside || []) if (p.fn(x, y, z)) return true;
    return false;
  }
  const SPOTS = {};
  function spot(name, def) {
    if (def === undefined) return SPOTS[name];
    SPOTS[name] = Object.assign(SPOTS[name] || {}, def);
    return SPOTS[name];
  }

  // ---- scenarios: a start situation (place, time, state) – ?szenario=name at the start (boot/boot.js), the tests (lib.boot query) ----
  const SCEN = {};
  function scenario(name, def) {
    if (def === undefined) return SCEN[name] || null;
    SCEN[name] = Object.assign({ name, label: name, order: 50 }, SCEN[name], def);
    return SCEN[name];
  }

  // ---- tasks of every feature in one journal (phase 2, building block 2): a source lists its entries when asked ----
  const TSRC = [];
  const tasks = {
    source(src) {
      const i = TSRC.findIndex(t => t.id === src.id);
      if (i >= 0) TSRC[i] = src;
      else TSRC.push(src);
      TSRC.sort((a, b) => (a.order || 50) - (b.order || 50));
      return src;
    },
    list() {
      const out = [];
      for (const src of TSRC) {
        let l = [];
        try {
          l = src.list() || [];
        } catch (e) {
          console.warn('tasks', src.id, e);
        }
        for (const e of l) out.push(Object.assign({ src: src.id, key: src.id + ':' + e.id }, e));
      }
      return out;
    },
  };

  // ---- the action button ----
  const ACTS = [];
  function act(a) {
    a.r = a.r || 1.6;
    const i = a.id ? ACTS.findIndex(b => b.id === a.id) : -1;
    if (i >= 0) ACTS[i] = a;
    else ACTS.push(a);
    return a;
  }
  function unact(id) {
    const i = ACTS.findIndex(a => a.id === id);
    if (i >= 0) ACTS.splice(i, 1);
  }

  // ---- events ----
  const EV = {},
    HIST = [];
  function on(name, fn) {
    (EV[name] = EV[name] || []).push(fn);
    return () => {
      const L = EV[name],
        i = L ? L.indexOf(fn) : -1;
      if (i >= 0) L.splice(i, 1);
    };
  }
  function emit(name, data) {
    HIST.push({ name, t: Math.round(now()), data });
    if (HIST.length > 60) HIST.shift();
    for (const k of [name, '*'])
      for (const fn of (EV[k] || []).slice())
        try {
          fn(data, name);
        } catch (e) {
          console.warn('KERN event', name, e);
          log('Ereignis ' + name + ': ' + ((e && e.message) || e), true);
        }
  }

  // ---- waits: KERN.until(cond) is checked in update ----
  const WAITS = [];
  function until(cond, s = 60) {
    return new Promise((res, rej) => {
      let v;
      try {
        v = cond();
      } catch (e) {
        return rej(e);
      }
      if (v) return res(v);
      WAITS.push({ cond, res, rej, t: s });
    });
  }

  // ---- zones: build near, drop far ----
  const ZONES = [];
  function zone(z) {
    const Z = /** @type {any} */ (z);
    Z._s = { state: 'idle', d: 1e9, ms: 0, err: '', built: 0, dropped: 0, away: 0, run: 0 };
    ZONES.push(Z);
    return z;
  }
  function zoneBuild(Z) {
    const S = Z._s,
      t0 = now(),
      run = ++S.run;
    S.state = 'building';
    const done = ok => e => {
      if (run !== S.run) return;
      if (!ok) {
        S.state = 'error';
        S.err = String((e && e.message) || e);
        console.warn('zone', Z.id, e);
        log('Zone ' + Z.id + ': ' + S.err, true);
        return;
      }
      S.ms = Math.round(now() - t0);
      S.built++;
      S.state = 'ready';
      log('Zone ' + Z.id + ' gebaut in ' + S.ms + ' ms');
      emit('zone', { id: Z.id, state: 'ready', ms: S.ms });
      if (S.d > Z.far) zoneDrop(Z);
    };
    try {
      Promise.resolve(Z.build()).then(done(true), done(false));
    } catch (e) {
      done(false)(e);
    }
  }
  function zoneDrop(Z) {
    const S = Z._s;
    S.run++;
    try {
      Z.drop();
    } catch (e) {
      console.warn('zone drop', Z.id, e);
      log('Zone ' + Z.id + ' freigeben: ' + ((e && e.message) || e), true);
    }
    S.state = 'idle';
    S.dropped++;
    S.away = 0;
    emit('zone', { id: Z.id, state: 'idle' });
  }
  const observer = first('observer', null);

  // ---- shared point lights ----
  const POOL = { list: [], home: () => true, restore: () => {} },
    BORROW = [],
    LENT = new Map();
  const keep = l => ({ p: l.position.clone(), d: l.distance, dec: l.decay, c: l.color.getHex(), i: l.intensity });
  const back = (l, s) => {
    l.position.copy(s.p);
    l.distance = s.d;
    l.decay = s.dec;
    l.color.setHex(s.c);
    l.intensity = s.i;
  };
  const lights = {
    pool(list, o = {}) {
      POOL.list = list.slice();
      if (o.home) POOL.home = o.home;
      if (o.restore) POOL.restore = o.restore;
    },
    borrow(b) {
      const B = /** @type {any} */ (b);
      B.ls = null;
      BORROW.push(B);
      BORROW.sort((a, c) => (c.prio || 0) - (a.prio || 0));
      return b;
    },
    status: () => BORROW.map(b => ({ id: b.id, n: b.n, has: /** @type {any} */ (b.ls || []).length })),
  };
  function lightUpdate(dt) {
    if (!BORROW.length) return;
    let home = true;
    try {
      home = POOL.home();
    } catch (e) {}
    let gave = false;
    for (const B of BORROW) {
      let w = false;
      if (!home)
        try {
          w = !!B.want();
        } catch (e) {}
      if (w && !B.ls) {
        const free = POOL.list.filter(l => !LENT.has(l));
        if (free.length >= B.n) {
          B.ls = free.slice(0, B.n);
          for (const l of B.ls) LENT.set(l, keep(l));
          try {
            B.on && B.on(B.ls);
          } catch (e) {
            console.warn('lights on', B.id, e);
          }
        }
      } else if (!w && B.ls) {
        for (const l of B.ls) {
          back(l, LENT.get(l));
          LENT.delete(l);
        }
        B.ls = null;
        gave = true;
        try {
          B.off && B.off();
        } catch (e) {
          console.warn('lights off', B.id, e);
        }
      }
      if (B.ls && B.tick)
        try {
          B.tick(B.ls, dt);
        } catch (e) {
          console.warn('lights tick', B.id, e);
        }
    }
    if (gave)
      try {
        POOL.restore();
      } catch (e) {}
  }

  // ---- once per frame ----
  let acc = 0;
  function update(dt) {
    for (let i = WAITS.length - 1; i >= 0; i--) {
      const w = WAITS[i];
      w.t -= dt;
      let v;
      try {
        v = w.cond();
      } catch (e) {
        WAITS.splice(i, 1);
        w.rej(e);
        continue;
      }
      if (v) {
        WAITS.splice(i, 1);
        w.res(v);
      } else if (w.t < 0) {
        WAITS.splice(i, 1);
        w.rej(new Error('KERN.until: Zeit abgelaufen'));
      }
    }
    lightUpdate(dt);
    acc += dt;
    const check = acc >= 0.25;
    if (check) acc = 0;
    const o = ZONES.length ? observer() : null;
    for (const Z of ZONES) {
      const S = Z._s;
      if (check && o) {
        S.d = Math.hypot(o[0] - Z.x, o[1] - Z.y);
        if (S.d < Z.near && S.state === 'idle') zoneBuild(Z);
        else if (S.d > Z.far && S.state === 'ready') {
          S.away += 0.25;
          if (S.away >= (Z.keep || 0)) zoneDrop(Z);
        } else S.away = 0;
      }
      if (S.state === 'ready' && Z.tick)
        try {
          Z.tick(dt, S.d);
        } catch (e) {
          if (!S.tickErr) {
            S.tickErr = 1;
            console.warn('zone tick', Z.id, e);
            log('Zone ' + Z.id + ' Takt: ' + ((e && e.message) || e), true);
          }
        }
    }
  }

  return {
    provide,
    providers: () => Object.fromEntries(Object.entries(P).map(([k, l]) => [k, l.length])),
    ground: first('ground', 0),
    terrain: first('terrain', 0),
    surface: first('surface', null),
    pushOut: first('pushOut', undefined),
    free: first('free', false),
    place,
    area,
    inside,
    spot,
    spots: () => SPOTS,
    scenario,
    scenarios: () => Object.values(SCEN).sort((a, b) => a.order - b.order),
    tasks,
    act,
    unact,
    acts: () => ACTS,
    on,
    emit,
    events: () => HIST.slice(),
    zone,
    zones: () =>
      ZONES.map(Z => ({
        id: Z.id,
        state: Z._s.state,
        d: Math.round(Z._s.d),
        ms: Z._s.ms,
        err: Z._s.err,
        built: Z._s.built,
        dropped: Z._s.dropped,
      })),
    until,
    lights,
    where: () => observer(),
    update,
  };
})();
window.KERN = KERN;
