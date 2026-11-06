// ===================== feat/strategie: „Ratscher von oben“ – the mode, its state, the simulation and the API for extensions (STRAT) =====================
// The same world seen from above and steered like Die Siedler 3 / Age of Empires / Warcraft 3 (Falko 5.11.2026 23:11–23:30): people
// (heroes with levels, abilities and needs), places with stocks and jobs, jobs over the real processes (they change the same state as the
// first-person game – STWELT), time from a pause to a time-lapse, Euro with a ledger, power, rules that say why, events, exploration,
// orders and chapters. The simulation runs whenever the game clock runs – also while one walks (jobs go on when nobody looks); the lens
// (HUD, overlay, steering: strategie/st_hud.js) only while the mode is on. API: docs/features/strategie.md „API für Erweiterungen“.
import { SAVE } from '../core/save.js';
import { KERN } from '../core/kern.js';
import { markDirty, whenLoaded } from '../core/assets.js';
import { P } from '../game/walkable.js';
import { go } from '../game/player.js';
import { AVATAR } from '../game/avatar.js';
import { PLAY } from '../game/play.js';
import { CLOCK } from '../time/clock.js';
import { DN } from '../time/daynight.js';
import { STDATA } from './st_data.js';
import { STCORE } from './st_core.js';
import { STWELT } from './st_welt.js';
export const STRAT = (() => {
  const D = STDATA,
    C = STCORE,
    WL = STWELT;
  const KS = SAVE.key('pav-strat-v1', {
    owner: 'strategie',
    kind: 'json',
    def: null,
    check: v => v === null || (!!v && typeof v === 'object' && v.v === 1),
  });
  const num = (v, a, b, d) => (Number.isFinite(v) ? Math.max(a, Math.min(b, v)) : d);
  // ---------------- registries: what content adds (the API) ----------------
  const REG = { place: {}, res: {}, job: {}, event: {}, ability: {}, layer: {}, chapter: [], goal: {} };
  const ORD = (a, b) => (a.order || 50) - (b.order || 50);
  // ---------------- the state (saved in pav-strat-v1) ----------------
  const S = {
    on: false,
    speed: 1,
    t: null,
    eur: D.START_EUR,
    ledger: [],
    style: 0,
    styleLog: [],
    people: {},
    jobs: [],
    nj: 0,
    orders: [],
    happened: [],
    known: {},
    plan: { urlaub: [] },
    power: { soc: 1.4, gen: false },
    favours: { hubert: 2, ronald: 2 },
    chapter: 'k1',
    goals: {},
    layers: {},
    sel: [],
    notes: [],
    ext: {},
  };
  const SPEEDS = [0, 1, 5, 30]; // game minutes per real second (1×: the game's own pace, one hour a minute)
  // ---------------- people ----------------
  function person0(id) {
    const d = D.PEOPLE[id];
    return {
      id,
      pos: null,
      path: null,
      at: null,
      job: null,
      xp: 0,
      nd: { energy: 85, food: 80, mood: 70 },
      certs: (d.certs || []).slice(),
      gear: (d.gear || []).slice(),
      cd: {},
      buff: {},
      away: false,
    };
  }
  for (const id of Object.keys(D.PEOPLE)) S.people[id] = person0(id);
  const PD = id => D.PEOPLE[id] || {};
  const isOwn = id => !!PD(id).own;
  // personal protective gear: 'werkstatt' (ear muffs, glasses, FFP2), 'forst' (helmet with visor and ear muffs, chainsaw trousers and boots)
  const gearOf = id => (S.people[id] && S.people[id].gear) || PD(id).gear || [];
  // the game time: while the simulation catches up (a time-lapse: many steps in one frame) the time of the step it is at
  let simT = null;
  const now = () => (simT != null ? simT : CLOCK.t);
  // home spots on site: your people by the bungalow, the neighbours in their yards
  const HOME = { falko: [7.2, 12.4], sarah: [11.2, 12.6], christoph: [9.4, 9.6] };
  const ARRIVE = [3.6, 19.0]; // the car under the carport
  const PRES = {},
    WILL = [];
  function present(id, t = now()) {
    const p = S.people[id];
    if (!p) return { ok: false, why: 'weg' };
    if (PRES[id]) return PRES[id](t);
    if (isOwn(id)) return C.ownPresent(WL.dateOf(t), WL.minOf(t), S.plan) ? { ok: true } : { ok: false, why: 'weg' };
    return C.npcPresent(WL.dateOf(t), WL.minOf(t));
  }
  // where a person is at game time t: on her way (the path by time), at her place, at home; a neighbour is his walker
  function pos(id, t = now()) {
    const p = S.people[id];
    if (!p) return null;
    if (p.path) {
      const L = C.pathLen(p.path.pts),
        d = (t - p.path.t0) * p.path.v;
      if (d >= L) {
        p.pos = p.path.pts[p.path.pts.length - 1].slice(0, 2);
        p.path = null;
        emit('angekommen', { who: id, pos: p.pos });
      } else {
        const q = C.pathAt(p.path.pts, d);
        return [q[0], q[1], q[2]];
      }
    }
    // a job that moves its people while they work (J.move – a tractor on the field track): where the job has them now
    if (p.job && p.at === p.job) {
      const j = job.of(p.job),
        J = j && j.st === 'work' ? REG.job[j.def] : null;
      if (J && J.move) {
        const c = spotOf(j, id);
        p.pos = [c[0], c[1]];
        return p.pos;
      }
    }
    if (!isOwn(id) && !p.job && !p.goTo) {
      const w = WL.npcPos(id);
      if (w) return w;
    }
    if (p.pos) return p.pos;
    if (isOwn(id)) return (p.pos = (HOME[id] || ARRIVE).slice());
    return WL.npcPos(id) || (D.PLACES[id] ? D.PLACES[id].pos.slice() : [0, 0]);
  }
  // walking or driving: on foot inside the garden and the village, by car or tractor beyond 220 m (the field track to the Klinge)
  function send(id, to, o = {}) {
    const p = S.people[id];
    if (!p) return false;
    const from = pos(id).slice(0, 2),
      pts = WL.path(from, to),
      L = C.pathLen(pts),
      drive = L > 260;
    p.path = { pts, t0: now(), v: drive ? 250 : 70, drive };
    p.goTo = o.place || null;
    p.at = null;
    emit('unterwegs', { who: id, to, place: o.place || null, m: Math.round(L), drive });
    if (!isOwn(id)) npcSteer(id);
    return { m: L, min: L / p.path.v, drive };
  }
  const arrived = id => !S.people[id].path;
  // a neighbour who helps: his walker follows the person's path (npc/npc.js Walker.ctl), his day waits (npc/life.js)
  function npcSteer(id) {
    WL.npcTake(id, (dt, w) => {
      const p = S.people[id];
      if (!p || (!p.job && !p.goTo && !p.path)) return false;
      const q = pos(id);
      const dx = q[0] - w.x,
        dy = q[1] - w.y,
        d = Math.hypot(dx, dy);
      if (d > 30) {
        w.x = q[0];
        w.y = q[1];
      } else if (d > 0.05) {
        const k = Math.min(1, (dt * 4) / Math.max(0.3, d));
        w.x += dx * k;
        w.y += dy * k;
        w.az = Math.atan2(dx, dy);
      }
      if (w.fig && w.fig.anim) w.fig.anim(dt, p.path ? Math.min(2.2, d / Math.max(dt, 1e-3)) : 0);
      // at work: the job's work pose (npc/npc_real.js POSE); on the tractor's seat (J.ride) not to be seen walking
      const j = p.job ? job.of(p.job) : null,
        J = j && j.st === 'work' ? REG.job[j.def] : null,
        ride = !!(J && J.ride && J.ride(j, id)),
        k = J && J.pose && !p.path && !ride ? J.pose : null;
      if (w.fig && w.fig.g && (ride || w.stRide)) {
        if (ride) w.fig.g.visible = false;
        else if (w.stRide) w.fig.g.visible = true;
        w.stRide = ride;
      }
      if (w.fig) {
        if (k && (!w.fig.pose || w.fig.pose.k !== k)) w.fig.pose = { k, t: 0 };
        else if (!k && w.fig.pose) w.fig.pose = null;
      }
      return true;
    });
  }
  function npcRelease(id) {
    const p = S.people[id];
    if (p) {
      p.goTo = null;
      p.pos = null;
    }
    const w = WL.npc(id);
    if (w && w.fig && w.fig.pose) w.fig.pose = null;
    WL.npcFree(id);
  }
  // ---------------- money, style, knowledge, notices ----------------
  function book(eur, text, cat = 'sonst') {
    S.eur = Math.round((S.eur + eur) * 100) / 100;
    S.ledger.push({ t: Math.round(now()), eur: Math.round(eur * 100) / 100, text, cat });
    if (S.ledger.length > 300) S.ledger.splice(0, S.ledger.length - 300);
    emit('buchung', { eur, text, cat, saldo: S.eur });
    dirty();
    return S.eur;
  }
  function style(delta, why) {
    S.style = num(S.style + delta, D.STYLE.min, D.STYLE.max, 0);
    S.styleLog.push({ t: Math.round(now()), d: delta, why });
    if (S.styleLog.length > 120) S.styleLog.shift();
    emit('stil', { delta, why, value: S.style });
    dirty();
  }
  // exploration (instead of a fog of war): what is known about a place comes from someone who went and looked; kind: 'wald', 'kontakt' …
  function reveal(kind, id, data, by, o = {}) {
    const k = kind + ':' + id,
      first = !S.known[k];
    S.known[k] = { t: Math.round(now()), by: by || null, data: data || {} };
    if (first) {
      const ev = { kind, id, title: o.title || id, source: o.source || '', text: o.text || '', by };
      emit('entdeckt', ev);
      if (o.title) note(o.title + (o.text ? ' – ' + o.text : ''), { kind: 'entdeckt', src: o.source });
    }
    dirty();
    return S.known[k];
  }
  const known = (kind, id) => S.known[kind + ':' + id] || null;
  function note(text, o = {}) {
    const n = { t: Math.round(now()), text, kind: o.kind || 'info', why: o.why || null, src: o.src || null };
    S.notes.push(n);
    if (S.notes.length > 60) S.notes.shift();
    if (STRAT.ui && STRAT.ui.note) STRAT.ui.note(n, o.acts);
    return n;
  }
  // a refusal: the rule, why it exists, its source (Falko 23:28: „Warum?“ on every refusal)
  function refuse(id, extra) {
    const R = C.why(id);
    return { no: true, rule: id, text: (extra ? extra + ': ' : '') + R.text, why: R.why, src: R.src };
  }
  // ---------------- events of the mode (KERN, prefix strategie:) ----------------
  function emit(name, data) {
    KERN.emit('strategie:' + name, data);
  }
  // ---------------- registries ----------------
  const place = {
    define(p) {
      REG.place[p.id] = Object.assign({ order: 50, r: 5, icon: '•' }, REG.place[p.id], p);
      return REG.place[p.id];
    },
    get: id => REG.place[id] || null,
    list: () => Object.values(REG.place).sort(ORD),
    pos: id => {
      const p = REG.place[id];
      return p && p.pos ? p.pos() : WL.placePos(id);
    },
  };
  const res = {
    define(r) {
      REG.res[r.id] = Object.assign({ order: 50, unit: '', dec: 1 }, r);
      return REG.res[r.id];
    },
    get: id => REG.res[id] || null,
    list: () => Object.values(REG.res).sort(ORD),
    val(id) {
      const r = REG.res[id];
      try {
        return r && r.get ? r.get() : 0;
      } catch (e) {
        return 0;
      }
    },
  };
  // ---------------- jobs ----------------
  // a job: { id, def, place, who: [person ids], st: 'go' | 'work' | 'wait' | 'done' | 'stop', why (the rule it waits for), done (minutes
  // of work done), dur (minutes needed), t0, t1, d (the definition's own data) }
  const job = {
    define(j) {
      REG.job[j.id] = Object.assign({ people: [1, 1], order: 50, xp: 1, heavy: 0.3, where: 'dorf' }, j);
      return REG.job[j.id];
    },
    get: id => REG.job[id] || null,
    list: () => Object.values(REG.job).sort(ORD),
    at: pid =>
      Object.values(REG.job)
        .filter(j => j.place === pid && (!j.show || j.show()))
        .sort(ORD),
    // what stops a job before it starts (or while it runs): null, or a refusal { rule, text, why, src }
    check(def, who, t = now(), jb = null) {
      const J = typeof def === 'string' ? REG.job[def] : def;
      if (!J) return { no: true, text: 'Unbekannter Auftrag' };
      const n = who.length;
      if (n < J.people[0])
        return J.people[0] >= 2 && J.cert === 'motorsaege'
          ? refuse('allein')
          : { no: true, text: `Dafür braucht es ${J.people[0]} Leute.` };
      if (n > J.people[1]) return { no: true, text: `Höchstens ${J.people[1]} Leute.` };
      for (const id of who) {
        const pd = PD(id),
          p = S.people[id];
        if (J.skill && (pd.skills[J.skill] || 0) + skillUp(id, J.skill) < (J.min || 1))
          return { no: true, text: `${pd.name} kann das noch nicht (${D.SKILL[J.skill]} ${J.min} nötig).` };
        void p;
      }
      // a neighbour who has helped a lot wants something back first (favours: STRAT.favour)
      for (const id of who)
        if (!isOwn(id) && (S.favours[id] ?? 0) <= -3 - Math.max(0, S.style) / 25)
          return {
            no: true,
            text: `${PD(id).name} hat schon viel geholfen – erst etwas für ihn tun.`,
            why: 'Nachbarschaftshilfe auf dem Dorf lebt vom Geben und Nehmen: Holz, Diesel, ein Brett, eine helfende Hand.',
            src: 'Ihre Gefallen (♥ in der Liste)',
          };
      // a course: everyone needs it, or one of the team (certOne: the one who fells; the second person helps and watches)
      if (J.cert) {
        const has = who.filter(w => S.people[w].certs.includes(J.cert));
        if (J.certOne ? !has.length : has.length < who.length)
          return refuse('lehrgang', PD(who.find(w => !S.people[w].certs.includes(J.cert))).name);
      }
      // forest gear (DGUV Information 214-046): J.psa people of the team need a full set – their own, or the one in the Forstkiste at the
      // tractor (world/fell.js: one set and the saw)
      if (J.psa) {
        const need = Math.min(J.psa, n),
          own = who.filter(w => gearOf(w).includes('forst')).length;
        if (own + 1 < need) return refuse('psa_forst', PD(who.filter(w => !gearOf(w).includes('forst'))[1]).name);
      }
      const day = WL.day(t, S.plan),
        m = WL.minOf(t);
      const r = C.rule(WL.dateOf(t), m, { loud: !!J.loud, where: J.where, saw: !!J.saw, sun: WL.sun(t) });
      if (r) return refuse(r);
      if (J.can) {
        const q = J.can({ t, day, m, date: WL.dateOf(t), who, wx: WL.wx(t), S, STRAT, job: jb });
        if (q) return typeof q === 'string' ? refuse(q) : q;
      }
      return null;
    },
    add(def, who, o = {}) {
      const J = REG.job[def];
      if (!J) return null;
      const q = job.check(J, who);
      if (q && !o.queue) return q;
      const j = {
        id: 'j' + ++S.nj,
        def,
        place: o.place || J.place,
        who: who.slice(),
        st: 'go',
        why: q ? q.rule || null : null,
        done: 0,
        dur: 0,
        t0: Math.round(now()),
        t1: null,
        d: {},
      };
      if (J.init) J.init(j, ctxOf(now(), j));
      j.dur = typeof J.dur === 'function' ? J.dur(j, ctxOf(now(), j)) : J.dur || 60;
      S.jobs.push(j);
      for (const id of who) {
        const p = S.people[id];
        if (p.job && p.job !== j.id) {
          const old = S.jobs.find(x => x.id === p.job);
          if (old && old.st !== 'done') old.who = old.who.filter(w => w !== id);
        }
        p.job = j.id;
        send(id, spotOf(j, id), { place: j.place });
        // Sarah's passive: on site, a favour costs half (she knows how to ask, and she gives back)
        if (!isOwn(id)) favour(id, -(J.favour ?? 1) * (present('sarah').ok ? 0.5 : 1), J.label);
      }
      emit('auftrag', { id: j.id, def, who, place: j.place, state: 'neu' });
      note(`${who.map(w => PD(w).name).join(' und ')}: ${J.label}`, { kind: 'auftrag' });
      dirty();
      return j;
    },
    cancel(id, why) {
      const j = S.jobs.find(x => x.id === id);
      if (!j || j.st === 'done' || j.st === 'stop') return;
      j.st = 'stop';
      j.t1 = Math.round(now());
      free(j);
      const J = REG.job[j.def];
      if (J && J.stop) J.stop(j, ctxOf(now(), j));
      emit('auftrag', { id, def: j.def, state: 'abgebrochen', why });
      dirty();
    },
    running: () => S.jobs.filter(j => j.st !== 'done' && j.st !== 'stop'),
    of: id => S.jobs.find(j => j.id === id) || null,
  };
  // where a person stands at a job: around its place (a little apart from each other)
  function spotOf(j, id) {
    const J = REG.job[j.def],
      c = (J && J.spot ? J.spot(j, id) : null) || place.pos(j.place) || [0, 0],
      k = j.who.indexOf(id);
    return [c[0] + (k > 0 ? (k % 2 ? 1.6 : -1.6) : 0), c[1] + (k > 1 ? 1.4 : 0)];
  }
  // the job is over: the people are free; a neighbour walks home first, then his own day goes on
  function free(j) {
    for (const id of j.who) {
      const p = S.people[id];
      if (!p) continue;
      if (p.job === j.id) p.job = null;
      p.at = null;
      if (!isOwn(id)) {
        const h = D.PLACES[id] ? D.PLACES[id].pos : null;
        if (h && Math.hypot(pos(id)[0] - h[0], pos(id)[1] - h[1]) > 6) {
          send(id, h);
          p.goTo = 'heim';
        } else npcRelease(id);
      }
    }
  }
  // practice makes better: half a point of skill per level above 1 in the hero's own fields (Warcraft 3: the level counts)
  function skillUp(id, sk) {
    const p = S.people[id];
    if (!p) return 0;
    const lv = C.level(p.xp);
    const H = (PD(id).skills || {})[sk] >= 3 ? 0.5 : 0.25;
    return Math.min(1.5, (lv - 1) * H);
  }
  function favour(id, d, what) {
    if (!(id in S.favours)) return;
    S.favours[id] = num(S.favours[id] + d, -5, 10, 0);
    emit('gefallen', { who: id, d, what, balance: S.favours[id] });
  }
  // the context handed to job and event functions
  function ctxOf(t, j) {
    return {
      t,
      m: WL.minOf(t),
      day: WL.day(t, S.plan),
      date: WL.dateOf(t),
      sun: WL.sun(t),
      wx: WL.wx(t),
      job: j || null,
      who: j ? j.who : [],
      S,
      STRAT,
      W: WL,
      eff: j ? teamEff(j) : 1,
      skill: j ? teamSkill(j) : 1,
    };
  }
  function teamEff(j) {
    if (!j.who.length) return 0;
    let e = 0;
    for (const id of j.who) e += C.eff(S.people[id].nd) * (1 + 0.04 * (C.level(S.people[id].xp) - 1));
    return e / j.who.length;
  }
  function teamSkill(j) {
    const J = REG.job[j.def];
    if (!J || !J.skill || !j.who.length) return 3;
    return Math.max(...j.who.map(id => (PD(id).skills[J.skill] || 1) + skillUp(id, J.skill)));
  }
  // ---------------- the simulation: from S.t to the clock, in steps of up to 10 game minutes ----------------
  let lastDay = null;
  function sim(t1) {
    if (S.t == null) S.t = t1;
    let t = S.t;
    if (t1 < t - 1) {
      // the clock went back (a scene set it, a new game): no simulation backwards
      S.t = t1;
      return;
    }
    let n = 0;
    try {
      while (t < t1 - 1e-6 && n < 30000) {
        const dt = Math.min(10, t1 - t);
        simT = t;
        stepAt(t, dt);
        t += dt;
        n++;
      }
    } finally {
      simT = null;
    }
    S.t = t1;
  }
  function stepAt(t, dt) {
    const d = Math.floor(t / 1440);
    if (d !== lastDay) {
      if (lastDay != null) newDay(t);
      lastDay = d;
    }
    // presence: who comes, who goes
    for (const id of Object.keys(S.people)) {
      const p = S.people[id];
      const pr = present(id, t),
        away = !pr.ok;
      if (isOwn(id) && away !== p.away) {
        p.away = away;
        if (away) {
          p.path = null;
          p.pos = null;
          note(`${PD(id).name} ist abgereist – unter der Woche sind Hubert und Ronald da.`, { kind: 'leute' });
        } else {
          p.pos = ARRIVE.slice();
          note(`${PD(id).name} ist angekommen.`, { kind: 'leute' });
          emit('da', { who: id });
        }
      }
      // needs: working, asleep (your people at night on site), awake
      const j = p.job ? job.of(p.job) : null,
        m = WL.minOf(t),
        night = m < 6 * 60 + 30 || m >= 22 * 60 + 30;
      C.needs(
        p.nd,
        dt,
        j && j.st === 'work' ? 'arbeit' : night ? 'schlaf' : 'wach',
        REG.job[j && j.def] ? REG.job[j.def].heavy : 0
      );
      // meals on site: breakfast, lunch, supper (food from the stores – STRAT.res 'essen' when content defines it)
      if (!away && isOwn(id) && p.nd.food < 35 && !night) eat(id);
    }
    // free will (The Sims): once a game hour, people on site without a job may choose one themselves (STRAT.will handlers)
    if (WILL.length && Math.floor((t + dt) / 60) !== Math.floor(t / 60))
      for (const id of Object.keys(S.people)) {
        const p = S.people[id];
        if (p.job || p.path || !present(id, t).ok) continue;
        for (const fn of WILL) {
          let w = null;
          try {
            w = fn(id, ctxOf(t, null));
          } catch (e) {
            console.warn('strategie will', e);
          }
          if (w && w.def) {
            const r = job.add(w.def, w.who || [id], { place: w.place });
            if (r && !r.no) break;
          }
        }
      }
    // power: PV into the station, the load of the running machines
    powerStep(t, dt);
    // jobs
    for (const j of S.jobs) if (j.st !== 'done' && j.st !== 'stop') jobStep(j, t, dt);
    if (S.jobs.length > 80)
      S.jobs = S.jobs.filter(j => (j.st !== 'done' && j.st !== 'stop') || now() - j.t1 < 14 * 1440);
  }
  function eat(id) {
    const p = S.people[id];
    const f = REG.res.essen;
    if (f && f.take && !f.take(1)) return;
    p.nd.food = Math.min(100, p.nd.food + 45);
    p.nd.mood = Math.min(100, p.nd.mood + 3);
  }
  function jobStep(j, t, dt) {
    const J = REG.job[j.def];
    if (!J) return;
    if (!j.who.length) {
      j.st = 'wait';
      j.why = 'leer';
      return;
    }
    // everyone there?
    const away = j.who.find(id => !present(id, t).ok);
    if (away) {
      const pr = present(away, t);
      // after work the helpers go home (and come back in the morning: the job sends them again)
      for (const id of j.who) goHome(id, j);
      setWait(
        j,
        pr.why === 'feierabend' ? null : pr.why,
        `${PD(away).name}: ${pr.why === 'feierabend' ? 'Feierabend' : C.why(pr.why).text}`
      );
      return;
    }
    // hurt (lost days after an accident, strategie/st_ereignis.js): the job waits
    const hurt = j.who.find(id => (S.people[id].hurt || 0) > t);
    if (hurt) {
      setWait(j, 'verletzt', `${PD(hurt).name} ist verletzt – noch ${CLOCK.dur(S.people[hurt].hurt - t)} Pause`);
      return;
    }
    // working hours of your people on site (8–19 h; a job may say otherwise: hours [from, to] or anytime) – the neighbours keep theirs
    const mm = WL.minOf(t),
      hrs = J.hours || D.PRESENCE.work;
    if (!J.anytime && j.who.some(isOwn) && (mm < hrs[0] || mm >= hrs[1])) {
      for (const id of j.who) goHome(id, j);
      setWait(
        j,
        null,
        `Feierabend – gearbeitet wird von ${Math.floor(hrs[0] / 60)} bis ${Math.floor(hrs[1] / 60)} Uhr`
      );
      return;
    }
    const playing = j.who.find(id => WL.playing(id) && P.mode === 'walk' && !S.on);
    if (playing) {
      setWait(j, null, `${PD(playing).name} spielst du gerade selbst`);
      return;
    }
    // everyone at the place? (on the way: wait; arrived somewhere else – after a reload, after arriving on Friday: go there)
    let going = false;
    for (const id of j.who) {
      const p = S.people[id];
      if (p.path) pos(id, t + dt);
      if (p.path) {
        going = true;
        continue;
      }
      if (p.at !== j.id) {
        const s = spotOf(j, id),
          q = pos(id, t);
        if (Math.hypot(q[0] - s[0], q[1] - s[1]) < 3) p.at = j.id;
        else {
          send(id, s, { place: j.place });
          going = true;
        }
      }
    }
    if (going) {
      if (j.st !== 'go') {
        j.st = 'go';
        j.need = null;
      }
      return;
    }
    const q = job.check(J, j.who, t, j);
    if (q) {
      setWait(j, q.rule || null, q.text);
      return;
    }
    if (j.st !== 'work') {
      j.st = 'work';
      j.why = null;
      j.need = null;
      if (!j.started) {
        j.started = Math.round(t);
        const cx = ctxOf(t, j);
        if (J.start) J.start(j, cx);
        if (J.look) J.look(j, cx);
        emit('auftrag', { id: j.id, def: j.def, who: j.who, state: 'begonnen', t });
      }
    }
    const cx = ctxOf(t, j),
      e = cx.eff * (J.speed ? J.speed(j, cx) : 1) * passive(j, J),
      w = dt * e;
    const before = j.done;
    j.done = Math.min(j.dur, j.done + w);
    for (const id of j.who) S.people[id].xp += dt * (J.xp || 1);
    if (J.step) J.step(j, cx, j.done - before, j.done / Math.max(1, j.dur));
    if (j.done >= j.dur - 1e-6) finish(j, t + dt);
  }
  // the heroes' passive effects and lasting abilities on a job's pace (Warcraft 3: auras – here real: planning, care, know-how)
  function passive(j, J) {
    let k = 1;
    if (Object.keys(S.people).some(id => buff(id, 'planen')) && j.who.some(isOwn)) k *= 1.1;
    if (J.bau && j.who.includes('christoph')) k *= 1.15;
    return k;
  }
  // Black & White: what your style does to the world – friendliness of the village, nature, reputation (0..1 each; 0.5 neutral). For the
  // modules that show it (more birds, friendlier people, a greener village): STRAT.styleFx()
  function styleFx() {
    const v = S.style / 100;
    return {
      freundlich: 0.5 + v * 0.5,
      natur: 0.5 + v * 0.4,
      ruf: 0.5 + v * 0.5,
      wert: S.style,
      name: C.styleName(S.style),
    };
  }
  // a person at a job that waits for the next working day: home for the evening (your people to the bungalow, a neighbour to his yard)
  function goHome(id, j) {
    const p = S.people[id];
    if (!p || p.path || p.at !== j.id) return;
    const h = isOwn(id) ? HOME[id] : D.PLACES[id] && D.PLACES[id].pos;
    if (!h) return;
    const q = pos(id);
    if (Math.hypot(q[0] - h[0], q[1] - h[1]) < 4) return;
    send(id, h);
    p.at = null;
  }
  function setWait(j, rule, text) {
    if (j.st !== 'wait' || j.why !== rule || j.need !== text) {
      j.st = 'wait';
      j.why = rule;
      j.need = text;
      emit('auftrag', { id: j.id, def: j.def, state: 'wartet', why: rule, text });
    }
  }
  function finish(j, t) {
    const J = REG.job[j.def];
    j.st = 'done';
    j.t1 = Math.round(t);
    const cx = ctxOf(t, j);
    let out = null;
    try {
      out = J.finish ? J.finish(j, cx) : null;
    } catch (e) {
      console.warn('strategie finish', j.def, e);
    }
    free(j);
    for (const id of j.who) {
      const p = S.people[id],
        lv0 = C.level(p.xp - j.dur * (J.xp || 1)),
        lv1 = C.level(p.xp);
      if (lv1 > lv0) {
        note(`${PD(id).name} ist jetzt Stufe ${lv1}.`, { kind: 'stufe' });
        emit('stufe', { who: id, level: lv1 });
      }
      if (isOwn(id) && !p.path) send(id, HOME[id] || ARRIVE);
    }
    note(`Fertig: ${J.label}${out && out.text ? ' – ' + out.text : ''}`, { kind: 'fertig' });
    emit('auftrag', { id: j.id, def: j.def, who: j.who, state: 'fertig', out, t: j.t1 });
    dirty();
  }
  // ---------------- power: the station takes the PV, the machines draw; the generator when it is empty ----------------
  function powerStep(t, dt) {
    const mo = WL.dateOf(t).getUTCMonth(),
      m = WL.minOf(t) + dt / 2,
      wx = WL.wx(t),
      kwp = D.POWER.kwp * (S.known['ausbau:pv2'] ? 2 : 1),
      cap = D.POWER.kwh * (S.known['ausbau:speicher2'] ? 2 : 1);
    const pv = C.pvW(mo, m, WL.sun(t), wx.cloud, kwp);
    let load = 0;
    for (const j of S.jobs)
      if (j.st === 'work') load += REG.job[j.def] && REG.job[j.def].watt ? REG.job[j.def].watt : 0;
    const b = C.battery(S.power.soc, cap, pv, load, dt);
    S.power.soc = b.soc;
    S.power.pv = Math.round(pv);
    S.power.load = Math.round(load);
    S.power.short = Math.round(b.short);
    S.power.cap = cap;
    // the station runs empty while machines draw: the petrol generator starts, carries the machines and charges the station (its AC input
    // ~1,5 kW) up to 80 %, then stops – petrol from its tank, refilled from the red can (garden/garage_play.js, the same litres as on foot)
    const P0 = S.power;
    if (!P0.gen && b.short > 1 && load > 0) P0.gen = true;
    if (P0.gen) {
      const need = (D.POWER.genL * dt) / 60;
      let got = WL.fuelUse('gen', need);
      if (got < need - 1e-6 && WL.fuelFill('gen') > 0) got += WL.fuelUse('gen', need - got);
      if (got < need - 1e-6) {
        P0.gen = false;
        P0.none = load > 0;
      } else {
        P0.none = false;
        P0.genL = (P0.genL || 0) + got;
        const chg = Math.max(0, Math.min(1500, D.POWER.genW - load));
        P0.soc = Math.min(cap, P0.soc + ((chg + Math.min(load, b.short)) / 1000) * (dt / 60) * 0.92);
        if (P0.soc >= 0.8 * cap || load <= 0) P0.gen = false;
      }
    } else P0.none = b.short > 1 && load > 0 && WL.fuel().gen + WL.fuel().can < 0.05;
  }
  // ---------------- each new game day: events, abilities, orders ----------------
  function newDay(t) {
    const cx = ctxOf(t, null),
      r = C.rng(((DN.e0 + Math.floor(t / 1440)) * 2654435761) | 0);
    for (const E of Object.values(REG.event)) {
      try {
        const p = E.chance ? E.chance(cx) : 0;
        if (p > 0 && r() < p) fire(E.id, cx);
      } catch (e) {
        console.warn('strategie event', E.id, e);
      }
    }
    for (const o of S.orders) if (o.st === 'offen' && t > o.due) orderLate(o);
    emit('tag', { t, day: cx.day });
  }
  function fire(id, cx) {
    const E = REG.event[id];
    if (!E) return null;
    cx = cx || ctxOf(now(), null);
    const out = E.run ? E.run(cx) : null;
    if (out === false) return null;
    const h = { id, t: Math.round(now()), text: (out && out.text) || E.label };
    S.happened.push(h);
    if (S.happened.length > 80) S.happened.shift();
    note(h.text, { kind: 'ereignis', why: E.why || null, src: E.src || null });
    emit('ereignis', { id, text: h.text, data: out });
    dirty();
    return h;
  }
  // ---------------- orders ----------------
  function orderAdd(o) {
    const x = Object.assign({ id: 'o' + ++S.nj, st: 'offen', t0: Math.round(now()), got: 0 }, o);
    if (!x.due) x.due = Math.round(now() + (o.days || 14) * 1440);
    S.orders.push(x);
    emit('bestellung', { id: x.id, state: 'neu', title: x.title });
    note(`Neue Bestellung: ${x.title} bis ${WL.day(x.due).label}`, { kind: 'bestellung' });
    dirty();
    return x;
  }
  function orderLate(o) {
    o.st = 'verspätet';
    style(-4, 'Bestellung zu spät: ' + o.title);
    note(`Zu spät: ${o.title} – die Kundin wartet.`, { kind: 'bestellung' });
    emit('bestellung', { id: o.id, state: 'verspätet' });
  }
  // ---------------- abilities (heroes) ----------------
  function abilityOf(id, ab) {
    const H = D.HEROES[id];
    return H ? H.abilities.find(a => a.id === ab) || null : null;
  }
  function useAbility(id, ab) {
    const p = S.people[id],
      A = abilityOf(id, ab);
    if (!p || !A) return { no: true, text: 'Diese Fähigkeit gibt es nicht.' };
    const left = (p.cd[ab] || 0) - now();
    if (left > 0) return { no: true, text: `${A.label}: wieder in ${CLOCK.dur(left)}.` };
    if (!present(id).ok) return refuse('weg', PD(id).name);
    const R = REG.ability[ab];
    const out = R && R.run ? R.run({ who: id, S, STRAT, t: now() }) : null;
    if (out && out.no) return out;
    p.cd[ab] = Math.round(now() + A.cd * 1440);
    p.buff[ab] = Math.round(now() + (R && R.lasts ? R.lasts : A.cd) * 1440);
    note(`${PD(id).name}: ${A.label}`, { kind: 'held' });
    emit('faehigkeit', { who: id, id: ab });
    dirty();
    return out || { ok: true };
  }
  const buff = (id, ab) => (S.people[id] && (S.people[id].buff[ab] || 0) > now() ? true : false);
  // ---------------- saving: one key, written a second after a change and every 20 s of play ----------------
  let saveT = null,
    saveAcc = 0;
  function dirty() {
    clearTimeout(saveT);
    saveT = setTimeout(save, 1000);
  }
  function save() {
    clearTimeout(saveT);
    const people = {};
    for (const [id, p] of Object.entries(S.people))
      people[id] = {
        pos: p.pos ? p.pos.map(v => +(+v).toFixed(2)) : null,
        path: p.path
          ? { pts: p.path.pts.map(q => [+q[0].toFixed(1), +q[1].toFixed(1)]), t0: p.path.t0, v: p.path.v }
          : null,
        goTo: p.goTo || null,
        job: p.job,
        xp: Math.round(p.xp),
        nd: { energy: Math.round(p.nd.energy), food: Math.round(p.nd.food), mood: Math.round(p.nd.mood) },
        certs: p.certs,
        gear: p.gear,
        cd: p.cd,
        buff: p.buff,
        away: p.away,
        hurt: p.hurt || 0,
      };
    SAVE.set(KS, {
      v: 1,
      on: S.on,
      speed: S.speed,
      t: S.t,
      eur: S.eur,
      ledger: S.ledger.slice(-200),
      style: S.style,
      styleLog: S.styleLog.slice(-60),
      people,
      jobs: S.jobs.slice(-60),
      nj: S.nj,
      orders: S.orders,
      happened: S.happened.slice(-40),
      known: S.known,
      plan: S.plan,
      power: { soc: +S.power.soc.toFixed(3) },
      favours: S.favours,
      chapter: S.chapter,
      goals: S.goals,
      layers: S.layers,
      notes: S.notes.slice(-20),
      ext: S.ext,
      brennholz: S.brennholz,
      diesel: S.diesel,
      mowI: S.mowI,
      essen: S.essen,
      broken: S.broken || [],
    });
  }
  function load() {
    const s = SAVE.get(KS);
    if (!s) return false;
    try {
      S.speed = SPEEDS.includes(s.speed) ? s.speed : 1;
      S.t = Number.isFinite(s.t) ? s.t : null;
      S.eur = num(s.eur, -1e7, 1e8, D.START_EUR);
      S.ledger = Array.isArray(s.ledger) ? s.ledger.filter(e => e && Number.isFinite(e.eur)) : [];
      S.style = num(s.style, -100, 100, 0);
      S.styleLog = Array.isArray(s.styleLog) ? s.styleLog : [];
      for (const [id, q] of Object.entries(s.people || {})) {
        const p = S.people[id];
        if (!p || !q || typeof q !== 'object') continue;
        const pt = v => Array.isArray(v) && v.length >= 2 && v.every(Number.isFinite);
        p.pos = pt(q.pos) ? q.pos.slice(0, 2) : null;
        p.path =
          q.path &&
          Array.isArray(q.path.pts) &&
          q.path.pts.length > 1 &&
          q.path.pts.every(pt) &&
          Number.isFinite(q.path.t0)
            ? { pts: q.path.pts, t0: q.path.t0, v: num(q.path.v, 1, 2000, 70) }
            : null;
        p.goTo = typeof q.goTo === 'string' ? q.goTo : null;
        p.job = typeof q.job === 'string' ? q.job : null;
        p.xp = num(q.xp, 0, 1e7, 0);
        if (q.nd && typeof q.nd === 'object')
          p.nd = {
            energy: num(q.nd.energy, 0, 100, 80),
            food: num(q.nd.food, 0, 100, 80),
            mood: num(q.nd.mood, 0, 100, 70),
          };
        if (Array.isArray(q.certs)) p.certs = q.certs.filter(c => typeof c === 'string');
        if (Array.isArray(q.gear)) p.gear = q.gear.filter(c => typeof c === 'string');
        if (q.cd && typeof q.cd === 'object') p.cd = q.cd;
        if (q.buff && typeof q.buff === 'object') p.buff = q.buff;
        p.away = !!q.away;
        p.hurt = num(q.hurt, 0, 1e9, 0);
      }
      S.jobs = Array.isArray(s.jobs)
        ? s.jobs.filter(
            j =>
              j &&
              typeof j.id === 'string' &&
              REG.job[j.def] &&
              Array.isArray(j.who) &&
              j.who.length &&
              j.who.every(id => S.people[id]) &&
              Number.isFinite(j.done) &&
              Number.isFinite(j.dur) &&
              j.d &&
              typeof j.d === 'object'
          )
        : [];
      S.nj = num(s.nj, 0, 1e9, S.jobs.length);
      S.orders = Array.isArray(s.orders)
        ? s.orders.filter(
            o =>
              o &&
              typeof o.id === 'string' &&
              typeof o.title === 'string' &&
              Number.isFinite(o.due) &&
              Number.isFinite(o.n) &&
              typeof o.st === 'string'
          )
        : [];
      S.happened = Array.isArray(s.happened) ? s.happened : [];
      S.known = s.known && typeof s.known === 'object' ? s.known : {};
      S.plan = {
        urlaub:
          s.plan && Array.isArray(s.plan.urlaub)
            ? s.plan.urlaub.filter(r => r && typeof r.from === 'string' && typeof r.to === 'string')
            : [],
      };
      S.power.soc = num(s.power && s.power.soc, 0, 8, 1.4);
      if (s.favours && typeof s.favours === 'object')
        for (const k of Object.keys(S.favours)) S.favours[k] = num(s.favours[k], -5, 10, 2);
      S.chapter = typeof s.chapter === 'string' ? s.chapter : 'k1';
      S.goals = s.goals && typeof s.goals === 'object' ? s.goals : {};
      S.layers = s.layers && typeof s.layers === 'object' ? s.layers : {};
      S.notes = Array.isArray(s.notes) ? s.notes.filter(n => n && typeof n.text === 'string') : [];
      S.ext = s.ext && typeof s.ext === 'object' && !Array.isArray(s.ext) ? s.ext : {};
      // the core's own entries in it, checked (a theme checks its own)
      for (const k of ['sturm', 'kaefer']) {
        const E = S.ext[k];
        if (E && (typeof E !== 'object' || !Array.isArray(E.ids) || !E.ids.every(Number.isFinite))) delete S.ext[k];
      }
      if (S.ext.termin && !(typeof S.ext.termin === 'object' && Number.isFinite(S.ext.termin.t))) delete S.ext.termin;
      if (S.ext.parts != null && !Number.isFinite(S.ext.parts)) S.ext.parts = 0;
      for (const k of ['brennholz', 'diesel', 'mowI', 'essen']) if (Number.isFinite(s[k])) S[k] = s[k];
      S.broken = Array.isArray(s.broken) ? s.broken.filter(m => typeof m === 'string') : [];
      // a job whose people were sent off before the reload: the neighbours are steered again
      for (const j of S.jobs)
        if (j.st !== 'done' && j.st !== 'stop') for (const id of j.who) if (!isOwn(id)) npcSteer(id);
      return !!s.on;
    } catch (e) {
      console.warn('strategie load', e);
      return false;
    }
  }
  // ---------------- the mode: on and off ----------------
  // the clock runs from above at the chosen pace (time/clock.js CLOCK.drive), the menu or a pause stops it
  CLOCK.drive(() => (S.on && P.mode === 'top' ? (CLOCK.warp ? 1 : S.speed) : 0));
  const VIEW = { tx: -2, ty: -8, th: 120 };
  function start(o = {}) {
    if (S.on) return;
    ensure();
    S.on = true;
    // the first time: the simulation begins now (before, the normal game never ran it – no catching up on what came before)
    if (S.t == null || !S.used) {
      S.t = now();
      lastDay = Math.floor(S.t / 1440);
    }
    S.used = true;
    // who you are now stands where you stand (the figure of the first-person game)
    const me = Object.keys(D.PEOPLE).find(id => WL.playing(id));
    if (P.mode === 'walk') {
      S.back = { pos: [P.x, P.y], z: P.feet, yaw: P.yaw };
      if (me && !S.people[me].job && present(me).ok) S.people[me].pos = [P.x, P.y];
    }
    document.body.dataset.strat = '1';
    WL.warm();
    go('draufsicht');
    if (!o.keepView) {
      P.tx = VIEW.tx;
      P.ty = VIEW.ty;
      P.th = VIEW.th;
    }
    if (STRAT.ui) STRAT.ui.show(true);
    emit('modus', { on: true });
    save();
    markDirty(true);
  }
  // back into the world: as the person chosen (one of yours, on site), where she is now – else as before
  function stop(o = {}) {
    if (!S.on) return;
    S.on = false;
    document.body.dataset.strat = '';
    if (STRAT.ui) STRAT.ui.show(false);
    const id = o.as || S.sel.find(x => isOwn(x) && present(x).ok) || null;
    walkAs(id);
    emit('modus', { on: false });
    save();
    markDirty(true);
  }
  // take a person over in the first-person view (double click from above): the figure, the place, the walk
  function walkAs(id) {
    const p = id ? S.people[id] : null;
    if (p && isOwn(id)) {
      const q = pos(id);
      if (PD(id).fig && AVATAR.kind !== PD(id).fig) AVATAR.setKind(PD(id).fig);
      KERN.spot('strategie-person', { mode: 'walk', pos: [q[0], q[1]], z: 0, yaw: 180, pitch: -3, label: PD(id).name });
      go('strategie-person');
      P.feet = KERN.ground(P.x, P.y, 0.5);
      if (p.job) {
        const j = job.of(p.job);
        if (j && j.st !== 'done')
          PLAY.think(`Du bist jetzt ${PD(id).name}. ${REG.job[j.def].label} wartet, solange du selbst gehst.`, 4200);
      } else PLAY.think(`Du bist jetzt ${PD(id).name}. Taste U: zurück nach oben.`, 3200);
      return true;
    }
    if (P.mode !== 'walk') {
      const b = S.back;
      if (b) {
        KERN.spot('strategie-zurueck', { mode: 'walk', pos: b.pos, z: b.z, yaw: b.yaw, pitch: -3, label: 'Garten' });
        go('strategie-zurueck');
      } else go('garten');
    }
    return false;
  }
  function takeOver(id) {
    if (!isOwn(id))
      return { no: true, text: `${PD(id).name} hat einen eigenen Willen – frag ihn, statt ihn zu steuern.` };
    if (!present(id).ok) return refuse('weg', PD(id).name);
    S.sel = [id];
    stop({ as: id });
    return { ok: true };
  }
  // ---------------- per frame: the simulation follows the clock; the lens draws ----------------
  let acc = 0;
  KERN.tick(dt => {
    // only once the mode was used (the normal game is not touched by it before: no simulation, no notices, no figures)
    if (S.t == null || !S.used) return;
    const t = now();
    if (t !== S.t) sim(t);
    if (S.on && STRAT.ui) STRAT.ui.tick(dt);
    acc += dt;
    saveAcc += dt;
    if (acc > 0.5) {
      acc = 0;
      // feat/tiere: a loud job at work frightens the animals around it (deer and boar flee a chainsaw, a mower, a tractor) – the noise
      // lasts real seconds there (TIERE.addNoise(x, y, r, s)), so it is renewed twice a second whatever the speed of the clock
      const TI = window.TIERE;
      if (TI && typeof TI.addNoise === 'function')
        for (const j of S.jobs) {
          const J = j.st === 'work' ? REG.job[j.def] : null;
          if (!J || !J.loud) continue;
          const c = spotOf(j, j.who[0]);
          try {
            if (c) TI.addNoise(c[0], c[1], J.where === 'wald' ? 250 : 150, 1.5);
          } catch (e) {}
        }
      for (const id of Object.keys(S.people)) {
        const p = S.people[id];
        if (isOwn(id)) continue;
        if (p.path) pos(id);
        if (!p.path && p.goTo === 'heim' && !p.job) npcRelease(id);
      }
    }
    if (saveAcc > 20) {
      saveAcc = 0;
      if (S.on) save();
    }
  }, 'strategie/modus');
  window.addEventListener('keydown', e => {
    if (['INPUT', 'TEXTAREA', 'SELECT'].includes(document.activeElement?.tagName) || e.repeat || e.ctrlKey || e.metaKey)
      return;
    const k = e.key.toLowerCase();
    // U: up into the strategy view, and from there back down (once the mode was started – Erleben → Szenen)
    if (k === 'u' && (S.on || S.used)) {
      e.preventDefault();
      if (S.on) stop();
      else start({ keepView: true });
    } else if (S.on && P.mode === 'top' && k === ' ') {
      e.preventDefault();
      setSpeed(S.speed ? 0 : S.lastSpeed || 1);
    }
  });
  function setSpeed(v) {
    if (!SPEEDS.includes(v)) return;
    if (S.speed) S.lastSpeed = S.speed;
    S.speed = v;
    if (STRAT.ui) STRAT.ui.refresh();
    dirty();
  }
  // a time-lapse to a moment: minutes, or 'kommen' (your people's next arrival), 'auftrag' (the next job's end), 'morgen' (7:00)
  function skip(what) {
    let min = 0;
    const t = now();
    if (typeof what === 'number') min = what;
    else if (what === 'kommen') min = C.nextArrival(WL.dateOf(t), WL.minOf(t), S.plan);
    else if (what === 'morgen') min = CLOCK.until(7);
    else if (what === 'auftrag') {
      let best = 1e12;
      for (const j of job.running())
        if (j.st === 'work') best = Math.min(best, (j.dur - j.done) / Math.max(0.1, teamEff(j)));
      min = best < 1e12 ? Math.ceil(best) + 1 : 0;
    }
    if (!(min > 0)) return false;
    CLOCK.wait(min, 'Zeitraffer');
    return min;
  }
  // ---------------- the scene ----------------
  KERN.scenario('strategie', {
    label: 'Ratscher von oben',
    order: 4,
    run: () => {
      start(); // (marks the mode used – the first time the simulation begins now)
      if (STRAT.ui && STRAT.ui.intro) STRAT.ui.intro();
    },
  });
  // the saved state comes in as soon as the model is up (before a scene can start the mode)
  let loaded = false,
    wasOn = false;
  function ensure() {
    if (loaded) return;
    loaded = true;
    try {
      wasOn = load();
    } catch (e) {
      console.warn('strategie load', e);
    }
    if (S.t == null) S.t = now();
    lastDay = Math.floor(S.t / 1440);
    S.used = S.used || wasOn || !!SAVE.get(KS);
    for (const f of STRAT.onLoad) f();
  }
  whenLoaded(() => {
    ensure();
    // a reload while the mode was on: it goes on from above
    setTimeout(() => {
      if (wasOn && !S.on && !/szenario=/.test(location.search)) start({ keepView: false });
    }, 1600);
  });
  // tests and the „what if“ of later: put the calendar on a date (ISO) and the clock on a time (minutes) without simulating the jump
  function setDate(isoDate, min = 10 * 60) {
    const d = Math.floor(CLOCK.t / 1440),
      e = Math.round(Date.parse(isoDate + 'T00:00:00Z') / 864e5);
    DN.e0 = e - d;
    CLOCK.t = d * 1440 + min;
    S.t = CLOCK.t;
    lastDay = d;
    for (const id of Object.keys(S.people)) {
      const p = S.people[id];
      p.away = isOwn(id) ? !present(id).ok : false;
      if (p.away) {
        p.path = null;
        p.pos = null;
      }
    }
    if (DN.active) DN.update(true);
    if (STRAT.ui) STRAT.ui.refresh();
    dirty();
    return WL.day(CLOCK.t, S.plan);
  }
  KERN.on('reset', () => {
    if (S.on) stop();
    SAVE.del(KS);
  });
  // feat/tiere: what the animals' module discovers is told from above too
  KERN.on('tiere:entdeckt', d => {
    if (d && d.title) note('Entdeckt: ' + d.title, { kind: 'entdeckt', src: d.source || null });
  });
  const STRAT = {
    S,
    REG,
    D,
    C,
    W: WL,
    SPEEDS,
    get on() {
      return S.on;
    },
    start,
    stop,
    takeOver,
    walkAs,
    setSpeed,
    skip,
    sim,
    save,
    load,
    present,
    pos,
    send,
    arrived,
    isOwn,
    book,
    style,
    reveal,
    known,
    note,
    refuse,
    emit,
    place,
    res,
    job,
    fire,
    event: {
      define(E) {
        REG.event[E.id] = E;
        return E;
      },
      list: () => Object.values(REG.event),
      fire,
    },
    order: { add: orderAdd, list: () => S.orders },
    ability: {
      define(A) {
        REG.ability[A.id] = A;
        return A;
      },
      use: useAbility,
      of: abilityOf,
      buff,
    },
    layer: {
      define(L) {
        REG.layer[L.id] = Object.assign({ order: 50, on: true }, REG.layer[L.id], L);
        if (!(L.id in S.layers)) S.layers[L.id] = REG.layer[L.id].on;
        return REG.layer[L.id];
      },
      list: () => Object.values(REG.layer).sort(ORD),
      on: id => S.layers[id] !== false,
      set(id, v) {
        S.layers[id] = !!v;
        dirty();
        if (STRAT.ui) STRAT.ui.refresh();
      },
    },
    chapter: {
      define(Ch) {
        REG.chapter.push(Ch);
        REG.chapter.sort(ORD);
        return Ch;
      },
      list: () => REG.chapter,
      cur: () => REG.chapter.find(c => c.id === S.chapter) || REG.chapter[0] || null,
      set(id) {
        S.chapter = id;
        emit('kapitel', { id });
        dirty();
      },
    },
    favour,
    styleFx,
    // free will: fn(personId, cx) → { def, who?, place? } or null, asked once a game hour for each idle person on site
    will: fn => WILL.push(fn),
    teamEff,
    setDate,
    level: id => C.level(S.people[id] ? S.people[id].xp : 0),
    skillOf: (id, sk) => (PD(id).skills[sk] || 0) + skillUp(id, sk),
    gearOf,
    onLoad: [],
    // people beyond the five (whom one invites, villagers who help): { id, name, short, col, own, fig, npc, role, skills, certs, gear,
    // presence(t) → { ok, why } } – data in STDATA.PEOPLE, state in S.people
    person: {
      define(d) {
        D.PEOPLE[d.id] = Object.assign(
          { short: d.name[0], col: '#9a9a9a', skills: {}, certs: [], gear: [] },
          D.PEOPLE[d.id],
          d
        );
        if (!S.people[d.id]) S.people[d.id] = person0(d.id);
        if (d.presence) PRES[d.id] = d.presence;
        return D.PEOPLE[d.id];
      },
      list: () => Object.keys(S.people),
      get: id => D.PEOPLE[id] || null,
    },
    // beds (The Sims / StarCraft's supply, Falko 23:30): how many can stay overnight – the places that have beds
    beds: () => Object.values(REG.place).reduce((n, p) => n + (p.beds || 0), 0),
    ui: null,
    HOME,
    ARRIVE,
  };
  window.STRAT = STRAT;
  return STRAT;
})();
