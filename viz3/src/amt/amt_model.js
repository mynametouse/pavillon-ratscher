// ===================== feat/ortsvorsteher 2: the model – opinions, promises, signatures, the vote, the councils (AMTMODEL) =====================
// Pure logic on a plain state object (no DOM, no three.js – tested in node: viz3/test/unit/amt.test.mjs). Every resident has an opinion of
// the player (rep 0–100). It moves with what one does for them, with presence, with promises – and with keeping them. Changing one's word
// costs trust with everyone who heard the first one. The vote: every household and circle of a resident votes after the resident's
// opinion against the other candidate's standing, the rest after the general mood; turnout grows with strong feelings and with having been
// spoken to. The count is drawn ballot by ballot with a seeded random generator (the same seed, the same result). The Ortsteilrat votes
// member by member (a tie rejects a motion, § 39 ThürKO); the town council decides yes, no or later – always with a reason.
import { AMTDATA } from './amt_data.js';
export const AMTMODEL = (() => {
  const D = AMTDATA;
  const PHASES = ['none', 'asked', 'candidate', 'nominated', 'office', 'lost', 'missed'];
  const AST = ['open', 'rat', 'stadt', 'yes', 'no', 'later', 'kreis', 'built', 'privat'];
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const num = (v, d, a, b) => (Number.isFinite(v) ? clamp(v, a, b) : d);
  // ---- a small seeded random generator (mulberry32) ----
  function rng(seed) {
    let a = seed >>> 0 || 1;
    return () => {
      a |= 0;
      a = (a + 0x6d2b79f5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  // ---- the state ----
  function fresh(bonus) {
    const rep = {};
    for (const k of D.KEYS) rep[k] = clamp(D.P[k].rep0 + ((bonus && bonus[k]) || 0), 0, 100);
    return {
      v: 1,
      phase: 'none',
      t0: null, // game minute the matter started (the letter)
      eday: null, // game day (0-based) of the election Sunday
      deadline: null, // game minute: nominations until then
      letter: false, // the letter read
      rep,
      sig: [], // who signed (keys)
      extra: 0, // signatures a supporter gathered among neighbours
      pos: {}, // issue → { o: option, told: [keys] }
      flips: 0,
      tasks: {}, // task → step (number) or 'done'
      met: {}, // key → last game day talked about the election
      seen: [], // presence events counted ('skat:day', 'fire:day')
      log: [], // [game minute, key, delta, why] – the last 40
      vote: null, // the result: { me, opp, inv, eligible, turnout, won, tie, counted, seed }
      voted: false, // the player has voted
      tries: 0,
      since: null, // in office since (game minute)
      anl: {}, // concern → { st, t, why, d }
      budget: D.BUDGET, // the Ortsteil's own money left this year
      byear: null,
      built: {}, // thing → game minute it stands
      sworn: false, // sworn in at the town council
      council: 0, // standing in the town council (0–100)
      retry: null, // game minute a new chance comes (after a lost or missed election)
    };
  }
  // a saved state, checked field by field: broken values fall back to fresh ones (the page must start whatever is stored)
  function sanitize(s, bonus) {
    const o = fresh(bonus);
    if (!s || typeof s !== 'object' || Array.isArray(s)) return o;
    if (PHASES.includes(s.phase)) o.phase = s.phase;
    for (const k of ['t0', 'deadline', 'since', 'retry']) if (Number.isFinite(s[k])) o[k] = s[k];
    if (Number.isFinite(s.eday)) o.eday = Math.floor(s.eday);
    o.letter = s.letter === true;
    o.voted = s.voted === true ? true : s.voted === 'opp' ? 'opp' : false;
    o.sworn = s.sworn === true;
    if (s.rep && typeof s.rep === 'object') for (const k of D.KEYS) o.rep[k] = num(s.rep[k], o.rep[k], 0, 100);
    if (Array.isArray(s.sig)) o.sig = [...new Set(s.sig.filter(k => D.P[k]))];
    o.extra = num(s.extra, 0, 0, 40) | 0;
    if (s.pos && typeof s.pos === 'object')
      for (const [i, p] of Object.entries(s.pos))
        if (D.ISSUES[i] && p && D.ISSUES[i].opts[p.o])
          o.pos[i] = { o: p.o, told: Array.isArray(p.told) ? [...new Set(p.told.filter(k => D.P[k]))] : [] };
    o.flips = num(s.flips, 0, 0, 99) | 0;
    if (s.tasks && typeof s.tasks === 'object')
      for (const [k, v] of Object.entries(s.tasks))
        if (D.TASKS[k] && (v === 'done' || Number.isFinite(v)))
          o.tasks[k] = v === 'done' ? 'done' : clamp(v | 0, 0, 20);
    if (s.met && typeof s.met === 'object')
      for (const [k, v] of Object.entries(s.met)) if (D.P[k] && Number.isFinite(v)) o.met[k] = v | 0;
    if (Array.isArray(s.seen)) o.seen = s.seen.filter(x => typeof x === 'string').slice(-60);
    if (Array.isArray(s.log))
      o.log = s.log
        .filter(e => Array.isArray(e) && e.length === 4 && Number.isFinite(e[0]) && Number.isFinite(e[2]))
        .map(e => [e[0], String(e[1]).slice(0, 20), e[2], String(e[3]).slice(0, 140)])
        .slice(-40);
    if (s.vote && typeof s.vote === 'object') {
      const v = s.vote;
      if (['me', 'opp', 'inv', 'eligible', 'turnout'].every(k => Number.isFinite(v[k])))
        o.vote = {
          me: v.me | 0,
          opp: v.opp | 0,
          inv: v.inv | 0,
          eligible: v.eligible | 0,
          turnout: v.turnout | 0,
          won: v.won === true,
          tie: v.tie === true,
          counted: v.counted === true,
          accepted: v.accepted === true,
          seed: Number.isFinite(v.seed) ? v.seed : 1,
        };
    }
    o.tries = num(s.tries, 0, 0, 99) | 0;
    if (s.anl && typeof s.anl === 'object')
      for (const [k, a] of Object.entries(s.anl))
        if (D.ANLIEGEN[k] && a && AST.includes(a.st))
          o.anl[k] = {
            st: a.st,
            t: Number.isFinite(a.t) ? a.t : 0,
            why: typeof a.why === 'string' ? a.why.slice(0, 400) : '',
            d: typeof a.d === 'string' ? a.d.slice(0, 10) : '',
            est: a.est === 1 ? 1 : 0, // the building office's cost estimate is there
            una: a.una === 1 ? 1 : 0, // the Ortsteilrat was unanimous
          };
    o.budget = num(s.budget, D.BUDGET, -1e5, 1e5);
    if (Number.isFinite(s.byear)) o.byear = s.byear | 0;
    if (s.built && typeof s.built === 'object')
      for (const [k, t] of Object.entries(s.built))
        if (typeof k === 'string' && k.length < 20 && Number.isFinite(t)) o.built[k] = t;
    o.council = num(s.council, 0, 0, 100);
    return o;
  }
  // ---- opinions ----
  function change(S, k, d, why, t) {
    if (!D.P[k] || !d) return 0;
    const a = S.rep[k],
      b = clamp(a + d, 0, 100);
    S.rep[k] = b;
    S.log.push([Number.isFinite(t) ? t : 0, k, b - a, String(why || '').slice(0, 140)]);
    if (S.log.length > 40) S.log.shift();
    return b - a;
  }
  function effects(S, eff, why, t) {
    for (const [k, d] of Object.entries(eff || {})) change(S, k, d, why, t);
  }
  const mood = r =>
    r >= 75 ? 'begeistert' : r >= 60 ? 'wohlwollend' : r >= 45 ? 'unentschieden' : r >= 30 ? 'skeptisch' : 'verärgert';
  // ---- promises: an option of an issue said to someone ----
  // the first word on an issue sets it; saying the same again adds the listener; another option is a flip: everyone who heard the
  // old one loses trust (D.FLIP), then the new option counts with its effects
  function promise(S, issue, o, who, t) {
    const I = D.ISSUES[issue];
    if (!I || !I.opts[o]) return null;
    const p = S.pos[issue];
    if (p && p.o === o) {
      if (who && !p.told.includes(who)) p.told.push(who);
      return 'same';
    }
    let res = 'new';
    if (p) {
      res = 'flip';
      S.flips++;
      for (const k of p.told) change(S, k, D.FLIP, 'Du hast deine Meinung zu „' + I.title + '“ geändert', t);
      effects(
        S,
        Object.fromEntries(Object.entries(I.opts[p.o].eff).map(([k, d]) => [k, -d])),
        'zurückgenommen: ' + I.title,
        t
      );
    }
    S.pos[issue] = { o, told: who ? [who] : [] };
    effects(S, I.opts[o].eff, I.title + ': ' + I.opts[o].say, t);
    return res;
  }
  // ---- signatures ----
  const sigCount = S => S.sig.reduce((n, k) => n + (D.P[k] ? D.P[k].hh : 0), 0) + S.extra;
  // asking k to sign: 'done' (already), 'yes', 'more' (signs and gathers among the neighbours), 'no' (not yet)
  function trySign(S, k) {
    const p = D.P[k];
    if (!p || p.opp) return 'no';
    if (S.sig.includes(k)) return 'done';
    const r = S.rep[k];
    if (r < 45) return 'no';
    S.sig.push(k);
    if (r >= 65) {
      S.extra = Math.min(40, S.extra + Math.min(4, p.circle >> 2));
      return 'more';
    }
    return 'yes';
  }
  // ---- the vote ----
  const sig = x => 1 / (1 + Math.exp(-x));
  // the voter groups: { k, n, r: opinion of the player, o: standing of the rival, met } – avail(k): the person exists in this build
  function groups(S, avail) {
    const ok = k => !avail || avail(k);
    const ks = D.KEYS.filter(ok);
    const avg =
      ks.filter(k => !D.P[k].opp).reduce((s, k) => s + S.rep[k], 0) / Math.max(1, ks.filter(k => !D.P[k].opp).length);
    const out = [];
    let rest = D.REST;
    for (const k of D.KEYS) {
      const p = D.P[k];
      if (!ok(k)) {
        rest += p.hh + p.circle;
        continue;
      }
      const met = S.met[k] != null;
      // the rival's household votes for him; the rest of his circle like any other
      // away on election day (Hubert at his sister's): his own vote only by post – the task that makes it possible
      const post = p.away ? S.tasks[p.away] === 'done' : null;
      out.push({
        k,
        n: post === false ? 0 : p.hh,
        r: p.opp ? 0 : S.rep[k],
        o: p.opp ? 100 : p.rival,
        met,
        hh: true,
        sure: post === true,
      });
      out.push({ k, n: p.circle, r: 0.6 * S.rep[k] + 0.4 * avg, o: p.rival, met: false, hh: false });
    }
    out.push({ k: null, n: rest, r: avg, o: 50, met: false, hh: false });
    return out;
  }
  const pMe = g => sig((g.r - g.o) / 9);
  const pTurn = (g, S) =>
    g.sure ? 0.97 : clamp(0.42 + 0.005 * Math.abs(g.r - g.o) + (g.met ? 0.15 : 0) + (S.flips ? -0.02 : 0), 0.2, 0.93);
  // expected share of the valid votes (the mood in the village, for the journal)
  function expect(S, avail) {
    let me = 0,
      opp = 0;
    for (const g of groups(S, avail)) {
      const t = pTurn(g, S) * g.n,
        p = pMe(g);
      me += t * p;
      opp += t * (1 - p);
    }
    return me / Math.max(1, me + opp);
  }
  // the election: every voter drawn; the ballots in counting order; the player's own vote if cast
  function simulate(S, seed, avail) {
    const R = rng(seed);
    const ballots = [];
    let eligible = 0;
    for (const g of groups(S, avail)) {
      eligible += g.n;
      const pt = pTurn(g, S),
        pm = pMe(g);
      for (let i = 0; i < g.n; i++) {
        if (R() > pt) continue;
        if (R() < 0.015) ballots.push('x');
        else ballots.push(R() < pm ? 'me' : 'opp');
      }
    }
    eligible += 1; // the player
    if (S.voted) ballots.push('me');
    for (let i = ballots.length - 1; i > 0; i--) {
      const j = Math.floor(R() * (i + 1));
      [ballots[i], ballots[j]] = [ballots[j], ballots[i]];
    }
    const me = ballots.filter(b => b === 'me').length,
      opp = ballots.filter(b => b === 'opp').length,
      inv = ballots.length - me - opp;
    // more than half of the valid votes (§ 24 ThürKWG); with two candidates a tie means a run-off – drawn by lot here (simplified)
    const tie = me === opp;
    const won = tie ? R() < 0.5 : me > (me + opp) / 2;
    return { ballots, me, opp, inv, eligible, turnout: ballots.length, won, tie, seed };
  }
  // ---- the Ortsteilrat: the four members and the chair (the player) vote; a tie rejects ----
  function ortsrat(S, id, chairYes = true) {
    const lean = D.LEAN[id] || {};
    const votes = [];
    for (const k of D.ORTSRAT) {
      const r = S.rep[k] != null ? S.rep[k] : 50;
      // the member's lean on the matter, plus a little of the mood towards the chair
      const x = (lean[k] || 0) * 6 + (r - 50) * 0.25;
      votes.push([k, x > -2]);
    }
    votes.push(['chair', !!chairYes]);
    const yes = votes.filter(v => v[1]).length,
      no = votes.length - yes;
    return { votes, yes, no, pass: yes > no, unanimous: no === 0 };
  }
  // ---- the town council: yes / no / later / kreis, with the reason ----
  // ctx: { rat: result of ortsrat, prepared: cost estimate and site visit, budget: what the town has left for small matters this year,
  // pos: the option the player promised on the issue (the compromise often carries more weight) }
  function council(S, id, ctx) {
    const A = D.ANLIEGEN[id];
    if (!A) return null;
    const c = ctx || {};
    if (A.by === 'privat')
      return {
        d: 'privat',
        why: 'Das ist keine Sache des Stadtrats: Streit unter Nachbarn klärt man miteinander – im Notfall vor der Schiedsstelle.',
      };
    if (A.by === 'ortsteil')
      return {
        d: 'ortsteil',
        why: 'Darüber entscheidet der Ortsteilrat selbst – mit dem Geld, das Ratscher jedes Jahr für Kultur, Soziales und Brauchtum hat.',
      };
    let score = 40 + (c.rat && c.rat.pass ? 15 : -20) + (c.rat && c.rat.unanimous ? 5 : 0) + (c.prepared ? 10 : 0);
    score += ((S.council || 0) - 30) / 4;
    if (c.pos === 'mitte') score += 8;
    const money = Number.isFinite(c.budget) ? c.budget : 20000;
    if (A.by === 'kreis') {
      if (A.cost > money)
        return {
          d: 'later',
          why: 'Tempo 30 kann die Stadt nicht selbst anordnen – das entscheidet die Straßenverkehrsbehörde im Landratsamt. Für eine Geschwindigkeitsanzeige ist dieses Jahr kein Geld mehr da; der Stadtrat nimmt sie in den nächsten Haushalt.',
        };
      return {
        d: 'kreis',
        why: 'Tempo 30 auf der Durchgangsstraße kann die Stadt nicht selbst anordnen – zuständig ist die Straßenverkehrsbehörde im Landratsamt Hildburghausen. Beschluss: Die Stadt stellt dort den Antrag und kauft eine Geschwindigkeitsanzeige für den Ortseingang. Deren Messwerte gehören zum Antrag.',
      };
    }
    if (A.cost > money)
      return {
        d: 'later',
        why:
          'Vertagt: Für ' +
          A.cost.toLocaleString('de-DE') +
          ' Euro ist im Haushalt dieses Jahres kein Geld mehr. Der Stadtrat nimmt es in den Haushalt des nächsten Jahres auf' +
          (id === 'feldweg' ? '; bis dahin füllt der Bauhof die schlimmsten Löcher mit Schotter.' : '.'),
      };
    if (score >= A.need)
      return {
        d: 'yes',
        why:
          'Beschlossen: ' +
          (id === 'laterne'
            ? c.pos === 'mitte'
              ? 'eine abgeschirmte, warmweiße Leuchte mit Bewegungsmelder – sie stört weder Nachbarn noch Insekten. '
              : 'eine neue Laterne am Gartenweg. '
            : '') +
          'Der Bauhof setzt es in den nächsten Tagen um.',
      };
    if (score >= A.need - 15)
      return {
        d: 'later',
        why: c.prepared
          ? 'Vertagt: Der Stadtrat will erst sehen, wie dringend es ist – nächstes Jahr wieder auf die Tagesordnung.'
          : 'Vertagt: Erst soll der Bauhof die Kosten schätzen und sich die Stelle ansehen. Mit einer Kostenschätzung kommt es wieder auf die Tagesordnung.',
      };
    return {
      d: 'no',
      why:
        c.rat && !c.rat.pass
          ? 'Abgelehnt: Schon der Ortsteilrat war dagegen – dann sieht der Stadtrat keinen Grund.'
          : 'Abgelehnt: Der Nutzen steht für die Mehrheit in keinem Verhältnis zu den Kosten.',
    };
  }
  return {
    PHASES,
    AST,
    rng,
    fresh,
    sanitize,
    change,
    effects,
    mood,
    promise,
    sigCount,
    trySign,
    groups,
    expect,
    simulate,
    ortsrat,
    council,
    clamp,
  };
})();
