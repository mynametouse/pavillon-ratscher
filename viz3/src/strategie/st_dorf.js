// ===================== feat/strategie-dorf: the village in „Ratscher von oben“ (STDORF) =====================
// Falko 5.11.2026 23:14/23:30, plan section 6 chapter 5 and section 13: village projects with the villagers – each with its real steps
// (who decides, what it costs, who helps, how long) and its result standing in the one world; reputation that grows by helping and keeping
// one's word; the Ortsteil's small budget and the town council for bigger things; exploration: what the people need is known only after
// someone went and talked to them. Built on the core's API (strategie/st_modus.js STRAT, docs/features/strategie.md) and on the
// Ortsvorsteher system: the villagers' opinions are AMT.ST.rep (amt/amt_model.js – never a second copy), the Ortsteil's money AMT.ST.budget,
// the concerns AMT.ST.anl, what stands in the village AMT.ST.built (amt/amt_world.js builds it: the Mitfahrbank, the bus shelter's roof,
// the lamp, the Kirmes poster, the board). State of the projects: STRAT.S.ext.dorf (saved with pav-strat-v1). docs/features/strategie-dorf.md
import { SAVE } from '../core/save.js';
import { KERN } from '../core/kern.js';
import { markDirty } from '../core/assets.js';
import { CLOCK } from '../time/clock.js';
import { AMT } from '../amt/amt.js';
import { AMTMODEL } from '../amt/amt_model.js';
import { AMTDATA } from '../amt/amt_data.js';
import { AMTWORLD } from '../amt/amt_world.js';
import { DCAL } from '../dorf/dorf_cal.js';
import { DTEXT } from '../dorf/dorf_text.js';
import { GPLAY } from '../garden/garage_play.js';
import { PLAY } from '../game/play.js';
import { STDATA } from './st_data.js';
import { STCORE } from './st_core.js';
import { STRAT } from './st_modus.js';
import { STDDATA } from './st_dorf_data.js';
export const STDORF = (() => {
  const D = STDDATA,
    A = AMTDATA,
    M = AMTMODEL,
    S = STRAT.S,
    W = STRAT.W;
  const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
  const eur = v => STCORE.eur(v);
  const now = () => CLOCK.t;
  const dayOf = t => Math.floor(t / 1440);
  const nameOf = k =>
    DTEXT.P && DTEXT.P[k] ? DTEXT.P[k].name : A.P[k] ? A.P[k].name : STDATA.PEOPLE[k] ? STDATA.PEOPLE[k].name : k;
  const names = ks =>
    ks
      .map(nameOf)
      .join(', ')
      .replace(/, ([^,]*)$/, ' und $1');
  const pname = id => (STDATA.PEOPLE[id] ? STDATA.PEOPLE[id].name : id);
  // the rules of the village get their „Warum?“ like the core's (STRAT.refuse reads STDATA.RULES)
  for (const [k, R] of Object.entries(D.RULES)) if (!STDATA.RULES[k]) STDATA.RULES[k] = R;
  // ---------------- the state: STRAT.S.ext.dorf, checked field by field (a saved value can be anything – test/savefuzz.py) ----------------
  const PST = ['laeuft', 'fertig', 'abgelehnt', 'vertagt'];
  const own = (o, k) => typeof k === 'string' && Object.prototype.hasOwnProperty.call(o, k);
  const fin = (v, d) => (Number.isFinite(v) ? v : d);
  function fresh() {
    return { v: 1, proj: {}, hh: [], city: { year: null, spent: 0 }, talked: {}, land: {}, built: {}, hilfe: {} };
  }
  function sanitize(s) {
    const o = fresh();
    if (!s || typeof s !== 'object' || Array.isArray(s)) return o;
    if (s.proj && typeof s.proj === 'object')
      for (const [id, p] of Object.entries(s.proj)) {
        if (!own(D.PROJ, id) || !p || typeof p !== 'object' || !PST.includes(p.st)) continue;
        const n = D.PROJ[id].steps.length;
        o.proj[id] = {
          st: p.st,
          i: Math.max(0, Math.min(n, fin(p.i, 0) | 0)),
          t0: fin(p.t0, 0),
          t: fin(p.t, 0),
          due: Number.isFinite(p.due) ? p.due : null,
          prep: p.prep === true,
          una: p.una === true,
          offer: p.offer === 'knapp' ? 'knapp' : 'fair',
          fs: ['einreichen', 'auswahl', 'bewilligung'].includes(p.fs) ? p.fs : null,
          pts: Number.isFinite(p.pts) ? p.pts : null,
          door: Number.isFinite(p.door) ? Math.max(0, Math.min(0.5, p.door)) : 0,
          why: typeof p.why === 'string' ? p.why.slice(0, 400) : '',
          log: Array.isArray(p.log)
            ? p.log
                .filter(e => Array.isArray(e) && Number.isFinite(e[0]) && typeof e[1] === 'string')
                .map(e => [e[0], e[1].slice(0, 300)])
                .slice(-12)
            : [],
        };
      }
    if (Array.isArray(s.hh))
      o.hh = s.hh
        .filter(e => Array.isArray(e) && Number.isFinite(e[0]) && Number.isFinite(e[1]) && typeof e[2] === 'string')
        .map(e => [e[0], e[1], e[2].slice(0, 120)])
        .slice(-40);
    if (s.city && typeof s.city === 'object')
      o.city = {
        year: Number.isFinite(s.city.year) ? s.city.year | 0 : null,
        spent: Math.max(0, Math.min(1e6, fin(s.city.spent, 0))),
      };
    if (s.talked && typeof s.talked === 'object')
      for (const [k, v] of Object.entries(s.talked)) if (own(D.PEOPLE, k) && Number.isFinite(v)) o.talked[k] = v | 0;
    if (s.land && typeof s.land === 'object')
      for (const [k, v] of Object.entries(s.land))
        if (own(D.LAND, k) && v && typeof v === 'object' && (v.st === 'pacht' || v.st === 'eigen'))
          o.land[k] = { st: v.st, t: fin(v.t, 0), eur: Math.max(0, Math.min(1e6, fin(v.eur, 0))) };
    if (s.built && typeof s.built === 'object')
      for (const [k, v] of Object.entries(s.built)) if (/^[a-z]{2,16}$/.test(k) && Number.isFinite(v)) o.built[k] = v;
    if (s.hilfe && typeof s.hilfe === 'object')
      for (const [k, v] of Object.entries(s.hilfe)) if (own(D.HILFE, k) && Number.isFinite(v)) o.hilfe[k] = v;
    return o;
  }
  const st = () => {
    const x = S.ext.dorf;
    if (!x || x.v !== 1 || !x.proj || !Array.isArray(x.hh) || !x.city || !x.talked || !x.land || !x.built || !x.hilfe)
      S.ext.dorf = sanitize(x);
    return S.ext.dorf;
  };
  STRAT.onLoad.push(() => {
    S.ext.dorf = sanitize(S.ext.dorf);
    sync();
  });
  // ---------------- the Ortsvorsteher system: the one state of opinions, money, concerns and built things ----------------
  const AST = () => AMT.ST;
  // amt/amt.js keeps its state in pav-amt-v1 and has no exported save; the same write it does (SAVE.set(KEY, ST))
  const amtSave = () => {
    try {
      SAVE.set('pav-amt-v1', AMT.ST);
      if (AMT.renderBook) AMT.renderBook();
    } catch (e) {
      console.warn('strategie-dorf amt save', e);
    }
  };
  const rep = k => {
    const r = AST().rep;
    return r && Number.isFinite(r[k]) ? r[k] : 50;
  };
  const avail = k => !!(AMT.avail && AMT.avail(k));
  // opinions move only through the model (amt/amt_model.js change/effects) – with the reason, into the same log the folder shows
  const L = (k, d, why) => M.change(AST(), k, d, why, now());
  const E = (eff, why) => M.effects(AST(), eff, why, now());
  const office = () => AST().phase === 'office';
  const chair = () => (office() ? 'du' : 'Ingrid');
  // the Ortsteil's money: 600 € a year (§ 45 (6) ThürKO); a new year brings it new (as amt/amt.js does at a session)
  const yearOf = t => W.dateOf(t).getUTCFullYear();
  function budget(t = now()) {
    const s = AST();
    if (yearOf(t) !== s.byear) {
      s.byear = yearOf(t);
      s.budget = A.BUDGET;
    }
    return s.budget;
  }
  function bookOrt(eurV, text, t = now()) {
    const s = AST();
    budget(t);
    s.budget = Math.round((s.budget + eurV) * 100) / 100;
    const h = st().hh;
    h.push([Math.round(t), eurV, text]);
    if (h.length > 40) h.shift();
    STRAT.emit('dorfbuchung', { eur: eurV, text, saldo: s.budget });
    return s.budget;
  }
  // the town's money for small matters (simplified as in amt/amt.js: 12 000 € a year for all its villages), here saved
  function cityLeft(t = now()) {
    const c = st().city;
    if (c.year !== yearOf(t)) {
      c.year = yearOf(t);
      c.spent = 0;
    }
    return D.CITY - c.spent;
  }
  // ---------------- exploration: who one knows (STRAT.reveal 'kontakt'), what they need ----------------
  const knownP = k => !!STRAT.known('kontakt', k);
  const ORDER = ['ingrid', 'gerhard', 'manfred', 'katrin', 'wolfgang', 'heike', 'jens', 'uwe'];
  function meet(k, by, t = now()) {
    const Pp = D.PEOPLE[k];
    if (!Pp) return false;
    const first = !knownP(k);
    STRAT.reveal(
      'kontakt',
      k,
      { need: Pp.need, knows: Pp.knows },
      by,
      first
        ? {
            title: 'Kennengelernt: ' + nameOf(k) + (DTEXT.P && DTEXT.P[k] ? ' (' + DTEXT.P[k].role + ')' : ''),
            source: 'Gespräch im Dorf',
            text: Pp.tip,
          }
        : {}
    );
    // being asked and listened to: once a day a little more trust (as in amt/amt.js „Wie geht’s“)
    const tk = st().talked;
    if (tk[k] !== dayOf(t)) {
      tk[k] = dayOf(t);
      if (avail(k)) L(k, first ? 2 : 1, 'Ihr habt euch unterhalten');
    }
    return first;
  }
  // an idea is known when the one who wishes it is known (her need) – or someone else names it
  const idea = id =>
    (!!D.PROJ[id] && knownP(D.PROJ[id].from)) ||
    Object.entries(D.PEOPLE).some(([k, Pp]) => (Pp.need === id || Pp.need2 === id) && knownP(k));
  // ---------------- land: what is yours (leased or owned), its prices ----------------
  const land = k => st().land[k] || null;
  const haOf = kind => Object.entries(st().land).reduce((s, [k, v]) => s + (v.st === kind ? D.LAND[k].ha : 0), 0);
  const rentOf = k => Math.round(D.LAND[k].pacht * D.LAND[k].ha * 100) / 100;
  const priceOf = k => Math.round(D.LAND[k].kauf * D.LAND[k].ha * 10000);
  // what a land deal costs at its signature: a year's rent, or the price with the land transfer tax and the notary
  function dealCost(id) {
    const Pj = P0(id),
      k = Pj.land,
      off = (pst(id) && pst(id).offer) === 'knapp' ? 0.8 : 1;
    if (Pj.deal === 'pacht')
      return { total: rentOf(k) * off, parts: [[rentOf(k) * off, `Pacht ${D.LAND[k].name} (1. Jahr)`]] };
    const pr = priceOf(k) * off,
      tax = Math.round(pr * D.KAUF.grest),
      no = Math.round(pr * D.KAUF.notar);
    return {
      total: pr + tax + no,
      parts: [
        [pr, `Kaufpreis ${D.LAND[k].name}`],
        [tax, 'Grunderwerbsteuer 5 %'],
        [no, 'Notar und Grundbuch'],
      ],
    };
  }
  // the owner's and the neighbours' consent: trust (their opinion of you) and a fair price
  function consent(id) {
    const Pj = P0(id),
      Ld = D.LAND[Pj.land],
      off = pst(id) ? pst(id).offer : 'fair',
      o = Ld.owner;
    if (o) {
      const need = Pj.deal === 'kauf' ? 50 : 40;
      if (rep(o) < need)
        return {
          no: true,
          text: `${nameOf(o)} will noch nicht – er kennt dich zu wenig (Meinung ${Math.round(rep(o))}, nötig ${need}).`,
          why: 'Land gibt man im Dorf nicht an Fremde: erst kennenlernen, helfen, Wort halten.',
          src: 'Dorfleben; Meinung aus dem Ortsvorsteher-Spiel',
        };
      if (off === 'knapp' && rep(o) < 70) {
        L(o, -4, 'Zu wenig geboten für ' + Ld.name);
        return Object.assign(STRAT.refuse('preis_fair'), {
          text: `${nameOf(o)}: „Für so wenig? Nee.“ – ` + D.RULES.preis_fair.text,
        });
      }
    }
    for (const k of Ld.neighbours || [])
      if (avail(k) && rep(k) < 35)
        return {
          no: true,
          text: `${nameOf(k)} hat Bedenken – mit den Nachbarn erst reden (Meinung ${Math.round(rep(k))}).`,
          why: 'Wer neben dem Nachbarn Bäume pflanzt oder Land bewirtschaftet, spricht vorher mit ihm – Grenzabstände, Schatten, Zufahrt.',
          src: 'Thüringer Nachbarrechtsgesetz; Dorfleben',
        };
    return null;
  }
  // ---------------- the projects ----------------
  const P0 = id => D.PROJ[id];
  const pst = id => st().proj[id] || null;
  const step = id => {
    const p = pst(id);
    return p && p.st === 'laeuft' ? P0(id).steps[p.i] || null : null;
  };
  function log(id, text, t = now()) {
    const p = pst(id);
    if (!p) return;
    p.log.push([Math.round(t), text]);
    if (p.log.length > 12) p.log.shift();
  }
  // the built things of the Ortsvorsteher system already stand (a decision in the first-person game): the project is done
  function sync() {
    const s = AST();
    if (!s || !s.built) return;
    for (const [id, Pj] of Object.entries(D.PROJ)) {
      const p = pst(id);
      if (Pj.build && s.built[Pj.build] != null && (!p || p.st !== 'fertig'))
        st().proj[id] = {
          st: 'fertig',
          i: Pj.steps.length,
          t0: p ? p.t0 : s.built[Pj.build],
          t: s.built[Pj.build],
          due: null,
          prep: p ? p.prep : false,
          why: 'In der Ich-Sicht beschlossen',
          log: p ? p.log : [],
        };
    }
  }
  function can(id) {
    const Pj = P0(id),
      p = pst(id);
    if (!Pj) return { no: true, text: 'Das Projekt gibt es nicht.' };
    if (p && p.st === 'laeuft') return { no: true, text: 'Läuft schon.' };
    if (p && p.st === 'fertig') return { no: true, text: 'Schon fertig.' };
    if (!idea(id))
      return {
        no: true,
        text: 'Davon weißt du noch nichts – erst mit den Leuten im Dorf reden.',
        why: 'Erkunden statt Nebel: Was die Leute brauchen, weiß nur, wer hingeht und zuhört.',
        src: 'Falkos Wahl (5.11.2026, C&C/StarCraft): Erkunden',
      };
    if (Pj.needLand && !land(Pj.needLand)) return STRAT.refuse('land_kein', D.LAND[Pj.needLand].name);
    if (Pj.land) {
      const l = land(Pj.land);
      if (l && (l.st === 'eigen' || Pj.deal === 'pacht'))
        return { no: true, text: l.st === 'eigen' ? 'Das gehört dir schon.' : 'Das hast du schon gepachtet.' };
      const other = Object.keys(D.PROJ).find(
        x => x !== id && P0(x).land === Pj.land && pst(x) && pst(x).st === 'laeuft'
      );
      if (other) return { no: true, text: 'Über dieses Stück verhandelst du schon.' };
    }
    if (p && p.st === 'abgelehnt' && now() - p.t < 14 * 1440)
      return {
        no: true,
        text: 'Gerade erst abgelehnt – frühestens in zwei Wochen wieder einbringen, mit besseren Argumenten.',
        why: 'Wer einen abgelehnten Antrag sofort wieder stellt, verärgert den Rat. Besser: mit den Leuten reden, Kosten klären, Unterstützer gewinnen.',
        src: 'Kommunalpolitische Praxis',
      };
    return null;
  }
  // start a project: its first step (Falko 23:14: Dorfprojekte und Ansehen)
  function start(id, o = {}) {
    const q = can(id);
    if (q) return q;
    const Pj = P0(id),
      t = now(),
      prev = pst(id);
    st().proj[id] = {
      st: 'laeuft',
      i: 0,
      t0: Math.round(t),
      t: Math.round(t),
      due: null,
      prep: !!(prev && prev.prep),
      una: false,
      offer: o.offer === 'knapp' ? 'knapp' : 'fair',
      fs: null,
      pts: null,
      why: '',
      log: prev ? prev.log : [],
    };
    if (Pj.anl) {
      const s = AST();
      if (!s.anl[Pj.anl] || ['no', 'later'].includes(s.anl[Pj.anl].st))
        s.anl[Pj.anl] = { st: 'open', t, why: '', d: '' };
      amtSave();
    }
    log(id, 'Angefangen');
    enter(id, t);
    STRAT.note(`Dorfprojekt: ${Pj.title} – ${stepText(id)}`, { kind: 'auftrag' });
    STRAT.emit('dorfprojekt', { id, state: 'begonnen', t });
    STRAT.save();
    return { ok: true, text: Pj.title };
  }
  // the next Friday or Saturday evening at least three days on (the Ortsteilrat), the next Thursday (the town council), n working days
  function nextRat(t) {
    for (let d = dayOf(t) + D.RAT.lead; d < dayOf(t) + 40; d++) {
      const wd = W.day(d * 1440 + 600).wd;
      if (wd === 5 || wd === 6) return d * 1440 + D.RAT.hour;
    }
    return t + 7 * 1440;
  }
  function nextStadt(t) {
    for (let d = dayOf(t) + 2; d < dayOf(t) + 40; d++)
      if (W.day(d * 1440 + 600).wd === D.STADT.wd) return d * 1440 + D.STADT.hour;
    return t + 7 * 1440;
  }
  // the next deadline of a funding call at least a week on (time to write the outline), at noon
  function nextCall(F, t) {
    const d0 = W.dateOf(t + F.prep * 1440),
      y = d0.getUTCFullYear();
    const cand = [];
    for (const yy of [y, y + 1]) for (const [m, d] of F.calls) cand.push(Date.UTC(yy, m - 1, d));
    const ok = cand.filter(v => v >= d0.getTime()).sort((a, b) => a - b)[0];
    const days = Math.round((ok - W.dateOf(t).getTime()) / 864e5);
    return (dayOf(t) + days) * 1440 + 12 * 60;
  }
  // the action group's scoring matrix (assumption, typical criteria): participation, the council's backing, preparation, the
  // project's own value for community and climate, volunteer work promised by people who think well of you
  function points(id) {
    const Pj = P0(id),
      p = pst(id),
      helpers = [...new Set(Pj.steps.flatMap(s => s.help || []))].filter(avail),
      mean = helpers.length ? helpers.reduce((a, k) => a + rep(k), 0) / helpers.length : 50;
    const rows = [
      ['Passt zur Entwicklungsstrategie (Beratung)', 4],
      ['Beteiligung der Leute im Dorf', ORDER.filter(knownP).length >= 5 ? 6 : 2],
      [
        'Dorfversammlung (Sarah)',
        STRAT.ability.buff('sarah', 'dorfversammlung') ||
        (S.people.sarah && S.people.sarah.cd.dorfversammlung > now() - 30 * 1440)
          ? 3
          : 0,
      ],
      ['Ortsteilrat einstimmig', p.una ? 3 : 0],
      ['Vorbereitung (drei Angebote)', p.prep ? 3 : 0],
      ['Gemeinschaft und Demografie', 6],
      ['Klima (Ladesäule, Radverkehr)', 3],
      ['Eigenleistung zugesagt', mean >= 55 ? 4 : 1],
    ];
    return { rows, sum: rows.reduce((a, r) => a + r[1], 0) };
  }
  function workDays(t, n) {
    let d = dayOf(t),
      k = 0;
    while (k < n && d < dayOf(t) + 60) {
      d++;
      const dy = W.day(d * 1440 + 600);
      if (dy.wd >= 1 && dy.wd <= 5 && !dy.hol) k++;
    }
    return d * 1440 + 15 * 60;
  }
  // a step begins: a job waits for people (the place's panel offers it), a council or the building yard gets a date
  function enter(id, t) {
    const p = pst(id),
      s = step(id);
    if (!s) return finish(id, t);
    p.due = null;
    if (s.k === 'rat') {
      p.due = nextRat(t);
      const Pj = P0(id);
      if (Pj.anl) {
        AST().anl[Pj.anl] = Object.assign(AST().anl[Pj.anl] || {}, { st: 'open', t });
        amtSave();
      }
      STRAT.note(
        `Ortsteilrat am ${W.day(p.due).label}, ${Math.floor(D.RAT.hour / 60)} Uhr in der alten Schule – auf der Tagesordnung: ${Pj.title}. Vorsitz: ${chair()}.`,
        {
          kind: 'ereignis',
          why: 'Der Ortsteilrat berät alles, was den Ortsteil betrifft, und entscheidet über sein eigenes kleines Budget; eingeladen wird mit Tagesordnung, die Sitzung ist öffentlich.',
          src: D.RAT.src,
        }
      );
    } else if (s.k === 'stadt') p.due = nextStadt(t);
    else if (s.k === 'foerder') {
      const F = D.FOERDER[P0(id).foerder];
      p.fs = 'einreichen';
      p.pts = null;
      p.due = nextCall(F, t);
      STRAT.note(
        `${P0(id).title}: die Projektskizze geht bis zum Stichtag ${W.day(p.due).label} an die ${F.title.split(' – ')[1] || F.title}.`,
        { kind: 'ereignis', why: F.learn, src: F.src }
      );
    } else if (s.k === 'quote') p.due = Math.round(t + (s.days || 42) * 1440);
    else if (s.k === 'bauhof') p.due = workDays(t, s.days || 3);
    else if (s.k === 'warten') p.due = Math.round(t + (s.days || 1) * 1440);
    p.t = Math.round(t);
  }
  function next(id, t, text) {
    const p = pst(id);
    if (!p || p.st !== 'laeuft') return;
    if (text) log(id, text, t);
    p.i++;
    enter(id, t);
    STRAT.save();
  }
  function finish(id, t) {
    const p = pst(id),
      Pj = P0(id);
    if (!p || p.st === 'fertig') return;
    p.st = 'fertig';
    p.i = Pj.steps.length;
    p.due = null;
    p.t = Math.round(t);
    log(id, 'Fertig', t);
    const s = AST();
    // what the Ortsvorsteher system places in the village stands now (amt/amt_world.js builds it at its next refresh); the village's
    // own things of this mode (the orchard, the meeting place) in STRAT.S.ext.dorf.built (strategie/st_dorf_welt.js)
    if (Pj.build && Pj.anl) s.built[Pj.build] = Math.round(t);
    else if (Pj.build) st().built[Pj.build] = Math.round(t);
    if (Pj.build === 'kirmes') kirmesDate(t);
    if (Pj.land) {
      st().land[Pj.land] = { st: Pj.deal === 'kauf' ? 'eigen' : 'pacht', t: Math.round(t), eur: dealCost(id).total };
      const o = D.LAND[Pj.land].owner;
      if (o)
        L(
          o,
          pst(id).offer === 'knapp' ? -2 : 3,
          (pst(id).offer === 'knapp' ? 'Knapp verhandelt: ' : 'Fairer Handel: ') + Pj.title
        );
      if (pst(id).offer === 'knapp') styleSelf(-2, 'Knapp verhandelt: ' + Pj.title);
    }
    if (Pj.fans) E(Pj.fans, 'Fertig: ' + Pj.title);
    if (Pj.anl) {
      s.anl[Pj.anl] = Object.assign(s.anl[Pj.anl] || {}, { st: 'built', t, why: 'Fertig: ' + Pj.title, d: 'built' });
      const An = A.ANLIEGEN[Pj.anl];
      if (An) {
        E(An.fans, 'Fertig: ' + Pj.title);
        E(An.foes, 'Fertig: ' + Pj.title);
        // a promise on its issue kept (amt/amt.js keep): those who heard it trust a little more
        const pr = An.issue && s.pos[An.issue];
        if (pr && pr.o !== 'nein') for (const k of pr.told) L(k, 3, 'Versprechen gehalten: ' + Pj.title);
      }
    }
    amtSave();
    try {
      AMTWORLD.refresh(s, now());
    } catch (e) {}
    styleSelf(3, 'Dorfprojekt fertig: ' + Pj.title);
    STRAT.note(`Fertig im Dorf: ${Pj.title}${Pj.build ? ' – es steht jetzt in der Welt' : ''}.`, { kind: 'fertig' });
    STRAT.emit('dorfprojekt', { id, state: 'fertig', t });
    markDirty(true);
    STRAT.save();
  }
  // the Kirmes: the first Saturday at least ten days on (time for tent, band, cakes – as amt/amt.js kirmesDate)
  function kirmesDate(t) {
    let d = dayOf(t) + 10;
    while (DCAL.wd(d * 1440 + 600) !== 6) d++;
    AST().kd = d * 1440;
    try {
      AMTWORLD.T.kirmes = DCAL.dateOf(AST().kd + 600);
    } catch (e) {}
  }
  // ---------------- the councils decide ----------------
  // whether one of your people sits in the public session (present in Ratscher that evening): she speaks in the residents' question time
  const ownThere = t => Object.keys(S.people).filter(id => STRAT.isOwn(id) && STRAT.present(id, t).ok);
  // the model's state with the effect of a good presentation: those who heard you argue it well lean a little more your way (not saved)
  function heard(t, prep) {
    const s = AST(),
      there = ownThere(t).length > 0,
      b = (there ? 3 : 0) + (prep ? 3 : 0);
    return {
      there,
      st: b ? Object.assign({}, s, { rep: Object.fromEntries(Object.entries(s.rep).map(([k, v]) => [k, v + b])) }) : s,
    };
  }
  function ratDecide(id, t) {
    const Pj = P0(id),
      p = pst(id),
      s = AST(),
      key = Pj.anl || id;
    const h = heard(t, p.prep);
    const r = M.ortsrat(h.st, key, true);
    const tally = r.votes
      .map(([k, v]) => (k === 'chair' ? (office() ? 'du' : 'Ingrid') : nameOf(k)) + (v ? ' ja' : ' nein'))
      .join(', ');
    const lead = h.there
      ? `${names(ownThere(t).map(pname))} ${ownThere(t).length > 1 ? 'sitzen' : 'sitzt'} im Publikum und ${ownThere(t).length > 1 ? 'erklären' : 'erklärt'} das Vorhaben in der Einwohnerfragestunde. `
      : '';
    if (!r.pass) {
      p.st = 'abgelehnt';
      p.t = Math.round(t);
      p.due = null;
      p.why = `Der Ortsteilrat hat abgelehnt (${r.yes} zu ${r.no}${r.yes === r.no ? ' – bei Gleichstand ist ein Antrag abgelehnt' : ''}).`;
      if (Pj.anl) s.anl[Pj.anl] = Object.assign(s.anl[Pj.anl] || {}, { st: 'no', t, why: p.why, d: 'no' });
      const An = Pj.anl && A.ANLIEGEN[Pj.anl];
      if (An)
        for (const [k, d] of Object.entries(An.fans)) L(k, -Math.ceil(d / 2), 'Abgelehnt im Ortsteilrat: ' + Pj.title);
      log(id, p.why, t);
      amtSave();
      STRAT.note(`Ortsteilrat: ${Pj.title} abgelehnt. ${lead}Abstimmung: ${tally}.`, {
        kind: 'nein',
        why: D.RULES.gleichstand.why,
        src: D.RULES.gleichstand.src,
      });
      STRAT.emit('dorfprojekt', { id, state: 'abgelehnt', t, rat: r });
      STRAT.save();
      return;
    }
    if (Pj.by === 'ortsteil') {
      if (budget(t) < Pj.cost) {
        p.st = 'vertagt';
        p.t = Math.round(t);
        p.due = null;
        p.why = `Der Ortsteilrat ist dafür, aber das Geld des Ortsteils reicht dieses Jahr nicht mehr (${eur(budget(t))} übrig, nötig ${eur(Pj.cost)}). Ab Januar wieder.`;
        if (Pj.anl) s.anl[Pj.anl] = Object.assign(s.anl[Pj.anl] || {}, { st: 'later', t, why: p.why, d: 'later' });
        log(id, p.why, t);
        amtSave();
        STRAT.note('Ortsteilrat: ' + p.why, {
          kind: 'nein',
          why: D.RULES.ortsteil_geld.why,
          src: D.RULES.ortsteil_geld.src,
        });
        STRAT.emit('dorfprojekt', { id, state: 'vertagt', t });
        STRAT.save();
        return;
      }
      bookOrt(-Pj.cost, Pj.title, t);
      if (Pj.anl)
        s.anl[Pj.anl] = Object.assign(s.anl[Pj.anl] || {}, {
          st: 'yes',
          t,
          why: 'Beschlossen im Ortsteilrat',
          d: 'yes',
          una: r.unanimous ? 1 : 0,
        });
      amtSave();
      STRAT.note(
        `Ortsteilrat beschließt ${Pj.title} (${r.yes} zu ${r.no}) – bezahlt aus dem Geld des Ortsteils: ${eur(Pj.cost)}, übrig ${eur(budget(t))}. ${lead}Abstimmung: ${tally}.`,
        { kind: 'fertig', why: D.RULES.ortsteil_geld.why, src: D.RULES.ortsteil_geld.src }
      );
    } else {
      if (Pj.anl)
        s.anl[Pj.anl] = Object.assign(s.anl[Pj.anl] || {}, {
          st: 'stadt',
          t,
          why: 'Vom Ortsteilrat empfohlen',
          d: 'stadt',
          una: r.unanimous ? 1 : 0,
        });
      p.una = r.unanimous;
      amtSave();
      STRAT.note(
        `Ortsteilrat empfiehlt der Stadt: ${Pj.title} (${r.yes} zu ${r.no}). ${office() ? 'Du trägst' : 'Ingrid trägt'} es im Stadtrat vor. ${lead}`,
        { kind: 'fertig', why: D.RULES.stadt_entscheidet.why, src: D.RULES.stadt_entscheidet.src }
      );
    }
    STRAT.emit('dorfprojekt', { id, state: 'beschlossen', t, rat: r });
    next(id, t, `Ortsteilrat: ${r.yes} zu ${r.no}`);
  }
  function stadtDecide(id, t) {
    const Pj = P0(id),
      p = pst(id),
      s = AST(),
      key = Pj.anl || id;
    // the council's view of the one who brings it: the Ortsvorsteher's standing (sworn in), else Ingrid's after eleven years
    const base = Object.assign({}, s, { council: office() ? s.council : Math.max(s.council || 0, 35) });
    const pos =
      A.ANLIEGEN[key] && A.ANLIEGEN[key].issue && s.pos[A.ANLIEGEN[key].issue] ? s.pos[A.ANLIEGEN[key].issue].o : null;
    const res = !A.ANLIEGEN[key]
      ? councilLike(base, Pj, p, cityLeft(t))
      : M.council(base, key, {
          rat: { pass: true, unanimous: !!p.una },
          prepared: !!p.prep,
          budget: cityLeft(t),
          pos,
        });
    if (!res) return next(id, t);
    if (res.d === 'yes' || res.d === 'kreis') {
      st().city.spent += res.pay || Pj.cost;
      if (office()) s.council = Math.min(100, (s.council || 0) + 6);
      if (Pj.anl) s.anl[Pj.anl] = Object.assign(s.anl[Pj.anl] || {}, { st: 'yes', t, why: res.why, d: 'yes' });
      amtSave();
      STRAT.note(`Stadtrat Schleusingen: ${res.why}`, {
        kind: 'fertig',
        why: D.RULES.stadt_entscheidet.why,
        src: D.RULES.stadt_entscheidet.src,
      });
      STRAT.emit('dorfprojekt', { id, state: 'stadt', t, d: res.d });
      next(id, t, 'Stadtrat: beschlossen');
      return;
    }
    p.st = res.d === 'no' ? 'abgelehnt' : 'vertagt';
    p.t = Math.round(t);
    p.due = null;
    p.why = res.why;
    if (Pj.anl)
      s.anl[Pj.anl] = Object.assign(s.anl[Pj.anl] || {}, {
        st: res.d === 'no' ? 'no' : 'later',
        t,
        why: res.why,
        d: res.d,
      });
    if (res.d === 'no') {
      const An = A.ANLIEGEN[key];
      if (An)
        for (const [k, d] of Object.entries(An.fans)) L(k, -Math.ceil(d / 3), 'Abgelehnt in Schleusingen: ' + Pj.title);
    }
    log(id, res.why, t);
    amtSave();
    STRAT.note(`Stadtrat Schleusingen: ${res.why}`, {
      kind: 'nein',
      why: D.RULES.stadt_entscheidet.why,
      src: D.RULES.stadt_entscheidet.src,
    });
    STRAT.emit('dorfprojekt', { id, state: p.st, t });
    STRAT.save();
  }
  // the town council on a project that is no concern of the Ortsvorsteher system: the rule of amt/amt_model.js council (the Ortsteilrat's
  // backing, unanimity, preparation, the standing in the council) – the town pays its share (with funding: the own share)
  function councilLike(base, Pj, p, money) {
    const F = Pj.foerder ? D.FOERDER[Pj.foerder] : null,
      pay = Math.round(Pj.cost * (F ? 1 - F.rate : 1));
    const score = 40 + 15 + (p.una ? 5 : 0) + (p.prep ? 10 : 0) + ((base.council || 0) - 30) / 4;
    if (pay > money)
      return {
        d: 'later',
        why: `Vertagt: Für den Eigenanteil von ${eur(pay)} ist im Haushalt dieses Jahres kein Geld mehr – der Stadtrat nimmt ihn in den nächsten Haushalt.`,
      };
    if (score >= (Pj.need || 60))
      return {
        d: 'yes',
        pay,
        why: F
          ? `Beschlossen: Die Stadt trägt den Eigenanteil von ${eur(pay)} (${Math.round((1 - F.rate) * 100)} %) und stellt den Förderantrag.`
          : 'Beschlossen: Die Stadt bezahlt es und setzt es um.',
      };
    if (score >= (Pj.need || 60) - 15)
      return { d: 'later', why: 'Vertagt: Der Stadtrat will erst Angebote und eine Kostenschätzung sehen.' };
    return { d: 'no', why: 'Abgelehnt: Der Nutzen steht für die Mehrheit in keinem Verhältnis zu den Kosten.' };
  }
  // the funding programme's dates come: the outline is in, the action group scores, the state office approves
  function foerderStep(id, t) {
    const Pj = P0(id),
      p = pst(id),
      F = D.FOERDER[Pj.foerder];
    if (p.fs === 'einreichen') {
      p.fs = 'auswahl';
      p.due = Math.round(t + F.select * 1440);
      log(id, 'Projektskizze eingereicht', t);
      STRAT.note(
        `${Pj.title}: eingereicht zum Stichtag. Das Entscheidungsgremium der Aktionsgruppe bewertet in drei Wochen.`,
        {
          kind: 'ereignis',
          why: F.learn,
          src: F.src,
        }
      );
    } else if (p.fs === 'auswahl') {
      const P = points(id);
      p.pts = P.sum;
      if (P.sum < F.min) {
        p.st = 'vertagt';
        p.fs = null;
        p.due = null;
        p.why = `Nicht ausgewählt: ${P.sum} von mindestens ${F.min} Punkten (${
          P.rows
            .filter(r => !r[1])
            .map(r => r[0])
            .join(', ') || 'zu wenig'
        } fehlte). Zum nächsten Stichtag neu einreichen.`;
        log(id, p.why, t);
        STRAT.note(`${Pj.title}: ${p.why}`, { kind: 'nein', why: F.learn, src: F.src });
        STRAT.emit('dorfprojekt', { id, state: 'vertagt', t, pts: P.sum });
        STRAT.save();
        return;
      }
      p.fs = 'bewilligung';
      p.due = Math.round(t + F.approve * 1440);
      log(id, `Ausgewählt mit ${P.sum} Punkten`, t);
      STRAT.note(
        `${Pj.title}: von der Aktionsgruppe ausgewählt (${P.sum} Punkte, nötig ${F.min}). Jetzt der Förderantrag beim Land – erst mit dem Bescheid darf es losgehen.`,
        {
          kind: 'fertig',
          why: D.RULES.vorhabenbeginn.why,
          src: D.RULES.vorhabenbeginn.src,
        }
      );
      STRAT.emit('dorfprojekt', { id, state: 'ausgewaehlt', t, pts: P.sum });
    } else {
      p.fs = null;
      const g = Math.round(Pj.cost * F.rate);
      STRAT.note(
        `Bewilligungsbescheid für ${Pj.title}: ${eur(g)} Förderung (${Math.round(F.rate * 100)} %) – ausgezahlt nach dem Verwendungsnachweis.`,
        {
          kind: 'fertig',
          why: F.learn,
          src: F.rule,
        }
      );
      STRAT.emit('dorfprojekt', { id, state: 'bewilligt', t, eur: g });
      next(id, t, 'Bewilligt: ' + eur(g));
    }
    STRAT.save();
  }
  // fibre: how many households sign before the deadline – those who would anyway, the information evening, the door-to-door round (the
  // better the talker, the more), and everyone who thinks well of you tells the neighbours
  function quota(id) {
    const Pj = P0(id),
      p = pst(id),
      fr = ORDER.filter(k => knownP(k) && avail(k));
    const q =
      0.18 +
      0.08 +
      ((p && p.door) || 0) +
      fr.reduce((a, k) => a + (rep(k) >= 55 ? 0.025 : rep(k) >= 45 ? 0.01 : -0.01), 0);
    const n = Math.round(Math.max(0, Math.min(0.85, q)) * Pj.hh);
    return { n, share: n / Pj.hh };
  }
  function quoteDecide(id, t) {
    const Pj = P0(id),
      p = pst(id),
      Q = quota(id);
    const txt = `${Q.n} von ${Pj.hh} Haushalten (${Math.round(Q.share * 100)} %, nötig ${Math.round(Pj.quota * 100)} %)`;
    if (Q.share < Pj.quota) {
      p.st = 'vertagt';
      p.due = null;
      p.t = Math.round(t);
      p.why = `Quote verfehlt: ${txt}. Der Anbieter baut nicht – mehr Leute überzeugen und neu starten, oder auf den geförderten Ausbau hoffen.`;
      log(id, p.why, t);
      STRAT.note(`${Pj.title}: ${p.why}`, { kind: 'nein', why: Pj.learn, src: Pj.src });
      STRAT.emit('dorfprojekt', { id, state: 'vertagt', t });
      STRAT.save();
      return;
    }
    STRAT.note(`${Pj.title}: Quote erreicht – ${txt}. Der Anbieter baut.`, {
      kind: 'fertig',
      why: Pj.learn,
      src: Pj.src,
    });
    next(id, t, 'Quote: ' + txt);
  }
  // a postponed project goes back to the step it stopped at (a new year's money, a cost estimate)
  function retry(id) {
    const p = pst(id);
    if (!p || (p.st !== 'vertagt' && p.st !== 'abgelehnt')) return { no: true, text: 'Nichts zu wiederholen.' };
    const q = p.st === 'abgelehnt' ? can(id) : null;
    if (q) return q;
    const Pj = P0(id);
    if (p.st === 'abgelehnt')
      p.i = Math.max(
        0,
        Pj.steps.findIndex(s => s.k === 'rat')
      );
    // a fibre round that missed its quota: from the door-to-door round again
    if (Pj.steps[p.i] && Pj.steps[p.i].k === 'quote')
      p.i = Math.max(
        0,
        Pj.steps.findIndex(s => s.door)
      );
    p.st = 'laeuft';
    p.why = '';
    log(id, 'Neu eingebracht');
    enter(id, now());
    STRAT.note(`Neu eingebracht: ${Pj.title} – ${stepText(id)}`, { kind: 'auftrag' });
    STRAT.save();
    return { ok: true };
  }
  // ---------------- the jobs of the projects' steps (offered at their place while the step is due) ----------------
  for (const [id, Pj] of Object.entries(D.PROJ))
    Pj.steps.forEach((s, i) => {
      if (s.k !== 'job' && s.k !== 'deal') return;
      STRAT.job.define({
        id: `dp_${id}_${i}`,
        label: s.label,
        place: s.place || Pj.place,
        order: 30 + i,
        people: s.people || [1, 2],
        skill: s.skill || 'reden',
        min: s.min || 1,
        heavy: s.heavy ?? 0.25,
        xp: 1,
        loud: !!s.loud,
        where: s.where || 'dorf',
        text:
          s.text + (s.help ? ` Es helfen: ${names(s.help)}.` : '') + (s.pay ? ` Kosten: ${eur(payOf(id, s))}.` : ''),
        learn: s.learn || Pj.learn,
        dur: s.dur || 60,
        show: () => {
          const p = pst(id);
          return !!p && p.st === 'laeuft' && p.i === i && !STRAT.job.running().some(j => j.def === `dp_${id}_${i}`);
        },
        can: cx => {
          const p = pst(id);
          if (!p || p.st !== 'laeuft' || p.i !== i) return { no: true, text: 'Das steht gerade nicht an.' };
          // money from your purse (a year's rent, a price with tax and notary, the trees)
          if (s.pay && S.eur < payOf(id, s) && !(cx.job && cx.job.started))
            return { no: true, text: `Nicht genug Geld in der Kasse (${eur(payOf(id, s))} nötig).` };
          // planting bare-root trees: mid-October to the end of March
          if (s.season === 'pflanzen') {
            const d = cx.date,
              mo = d.getUTCMonth();
            if (!(mo >= 10 || mo <= 2 || (mo === 9 && d.getUTCDate() >= 15))) return 'pflanzzeit';
          }
          return null;
        },
        anytime: !!s.anytime,
        pose: s.skill === 'bauen' ? 'place' : null,
        bau: s.skill === 'bauen',
        finish: (j, cx) => {
          const t = cx.t;
          // the villagers who helped: working together is the best way to get to know each other
          for (const k of s.help || []) {
            if (avail(k)) L(k, 2, 'Ihr habt zusammen angepackt: ' + s.label);
            if (!knownP(k)) meet(k, j.who[0], t);
          }
          if (s.prep) pst(id).prep = true;
          if (s.door) pst(id).door = 0.06 + 0.02 * Math.max(...j.who.map(w => STRAT.skillOf(w, 'reden')));
          // the owner's and the neighbours' word on a land deal
          if (s.k === 'deal') {
            const q = consent(id);
            if (q) {
              reject(id, q, t);
              return { text: q.text };
            }
          }
          if (s.pay) for (const [v, txt] of payParts(id, s)) STRAT.book(-v, txt, s.pay === 'land' ? 'land' : 'dorf');
          // a compromise said to both sides (the lamp: shielded, warm white, a motion sensor) – a promise in the model
          if (s.pos && A.ANLIEGEN[Pj.anl] && A.ANLIEGEN[Pj.anl].issue) {
            for (const k of s.help || []) M.promise(AST(), A.ANLIEGEN[Pj.anl].issue, s.pos, k, t);
            amtSave();
          }
          amtSave();
          next(id, t, `${s.label}: ${names(j.who.map(pname))}`);
          return { text: `${P0(id).title}: ${stepText(id)}` };
        },
      });
    });
  // what a step costs from your purse
  const payParts = (id, s) => (s.pay === 'land' ? dealCost(id).parts : [[P0(id).cost || 0, P0(id).title]]);
  const payOf = (id, s) => payParts(id, s).reduce((a, r) => a + r[0], 0);
  // a deal refused: the project stops with the reason (try again later with more trust or a fair price)
  function reject(id, q, t) {
    const p = pst(id);
    p.st = 'abgelehnt';
    p.t = Math.round(t);
    p.due = null;
    p.why = q.text;
    log(id, q.text, t);
    amtSave();
    STRAT.note(q.text, { kind: 'nein', why: q.why || null, src: q.src || null });
    STRAT.emit('dorfprojekt', { id, state: 'abgelehnt', t });
    STRAT.save();
  }
  // ---------------- neighbourly help (once properly, then again every two weeks for a little) ----------------
  for (const [k, Hh] of Object.entries(D.HILFE))
    STRAT.job.define({
      id: 'hilfe_' + k,
      label: Hh.label,
      place: Hh.place,
      order: 20,
      people: [1, 2],
      skill: Hh.skill,
      min: 1,
      heavy: 0.35,
      xp: 1,
      where: 'dorf',
      text: Hh.text,
      learn: Hh.learn,
      dur: Hh.dur,
      show: () => knownP(k) && avail(k) && !(st().hilfe[k] != null && now() - st().hilfe[k] < 14 * 1440),
      can: () =>
        st().hilfe[k] != null && now() - st().hilfe[k] < 14 * 1440
          ? { no: true, text: `${nameOf(k)} braucht gerade keine Hilfe.` }
          : null,
      finish: (j, cx) => {
        const first = st().hilfe[k] == null;
        st().hilfe[k] = Math.round(cx.t);
        if (first) E(Hh.eff, 'Geholfen: ' + Hh.label);
        else L(k, 2, 'Wieder geholfen: ' + Hh.label);
        if (first) styleSelf(1, 'Nachbarschaftshilfe: ' + Hh.label);
        if (Hh.find)
          STRAT.reveal('geschichte', 'alte_schule', {}, j.who[0], {
            title: 'Dachboden der alten Schule',
            source: 'Dorfchronik (Gerhard)',
            text: 'ein Schulbuch von 1910, Zeugnisse, ein Foto der letzten Schulklasse',
          });
        amtSave();
        STRAT.save();
        return { text: `${nameOf(k)} freut sich${first ? '' : ' wieder'}` };
      },
    });
  // the fire brigade's basic training: your people become members – alarmed with the others, better at a mission
  if (!STDATA.KNOW.feuerwehr)
    STDATA.KNOW.feuerwehr = {
      kind: 'kurs',
      title: D.KURS_FW.title,
      days: D.KURS_FW.days,
      text: D.KURS_FW.text,
      src: D.KURS_FW.src,
      unlocks: 'mit der Feuerwehr ausrücken, im Einsatz mehr ausrichten',
    };
  STRAT.job.define({
    id: 'kurs_fw',
    label: D.KURS_FW.title,
    place: 'schule',
    order: 15,
    people: [1, 2],
    heavy: 0.4,
    xp: 1.2,
    text: 'Bei der Kreisausbildung, Manfred bildet mit aus – danach gehörst du zur Feuerwehr Ratscher.',
    learn: D.KURS_FW.text,
    dur: D.KURS_FW.days * 8 * 60,
    show: () => knownP('manfred'),
    can: cx => {
      const have = cx.who.filter(id => S.people[id].certs.includes('feuerwehr'));
      if (have.length) return { no: true, text: `${names(have.map(pname))} ist schon bei der Feuerwehr.` };
      if (cx.who.some(id => !STRAT.isOwn(id)))
        return { no: true, text: 'Hubert und Ronald sind alte Hasen – das ist für euch.' };
      return null;
    },
    finish: (j, cx) => {
      for (const id of j.who) if (!S.people[id].certs.includes('feuerwehr')) S.people[id].certs.push('feuerwehr');
      STRAT.reveal('ausbau', 'feuerwehr', { who: j.who }, j.who[0], {
        title: 'Grundausbildung bestanden',
        source: D.KURS_FW.src,
        text: names(j.who.map(pname)) + ' gehört jetzt zur Freiwilligen Feuerwehr Ratscher',
      });
      L('manfred', 6, 'Neue Leute für die Feuerwehr');
      L('jens', 3, 'Neue Leute für die Feuerwehr');
      styleSelf(2, 'Bei der Feuerwehr eingetreten');
      amtSave();
      void cx;
      return { text: names(j.who.map(pname)) + ' gehört jetzt zur Feuerwehr' };
    },
  });
  // ---------------- exploration jobs: listen in the village, read the notice board ----------------
  STRAT.job.define({
    id: 'dorf_reden',
    label: 'Im Dorf herumhören',
    place: 'anger',
    order: 10,
    people: [1, 2],
    skill: 'reden',
    min: 1,
    heavy: 0.1,
    xp: 1,
    where: 'dorf',
    hours: [9 * 60, 19 * 60],
    text: 'Über den Anger gehen, an Gartenzäunen stehen bleiben, fragen, zuhören: wer wer ist, was die Leute brauchen, wer mit wem kann.',
    learn:
      'Im Dorf erfährt man am meisten, wenn man zuhört statt erzählt – und wiederkommt. Wer gefragt wird, fühlt sich ernst genommen.',
    dur: 100,
    can: () =>
      ORDER.every(knownP)
        ? { no: true, text: 'Du kennst schon alle, die man hier kennen kann – jetzt die Projekte angehen.' }
        : null,
    finish: (j, cx) => {
      // how many one gets to know: the better talker learns more (Sarah: 3, Falko: 2)
      const best = Math.max(...j.who.map(id => STRAT.skillOf(id, 'reden'))),
        n = 1 + Math.floor(best / 2);
      const got = [];
      for (const k of ORDER) {
        if (got.length >= n) break;
        if (!knownP(k) && meet(k, j.who[0], cx.t)) got.push(k);
      }
      // the ones one meets also tell who they know: a hint where to go next
      const hint = [...new Set(got.flatMap(k => D.PEOPLE[k].knows))].filter(k => !knownP(k) && D.PEOPLE[k]);
      amtSave();
      STRAT.save();
      return {
        text: got.length
          ? `kennengelernt: ${names(got)}${hint.length ? ' – sie erzählen von ' + names(hint.slice(0, 3)) : ''}`
          : 'niemanden Neues getroffen',
      };
    },
  });
  STRAT.job.define({
    id: 'dorf_aushang',
    label: 'Aushang lesen',
    place: 'schule',
    order: 11,
    people: [1, 1],
    skill: 'reden',
    min: 1,
    heavy: 0,
    xp: 0.3,
    where: 'dorf',
    anytime: true,
    text: 'Der Aushangkasten an der alten Schule: Bekanntmachungen der Stadt, Termine, die Feuerwehr, Zettel der Nachbarn.',
    learn:
      'Öffentliche Bekanntmachungen der Stadt (Sitzungen, Wahlen, Satzungen) hängen im Aushangkasten des Ortsteils und stehen im Amtsblatt.',
    dur: 15,
    show: () => !STRAT.known('dorf', 'aushang'),
    finish: (j, cx) => {
      STRAT.reveal('dorf', 'aushang', {}, j.who[0], {
        title: 'Am Aushang',
        source: 'Aushangkasten an der alten Schule',
        text: 'Die Feuerwehr sucht Mitglieder (Grundausbildung beim Landkreis), freitags Skat und Rommé in der alten Schule, der Ortsteilrat tagt öffentlich.',
      });
      meet('manfred', j.who[0], cx.t);
      amtSave();
      return { text: 'Die Feuerwehr sucht Leute – Ansprechpartner: Manfred, der Wehrführer.' };
    },
  });
  // ---------------- places of the village ----------------
  const schoolPos = () => {
    const b = window.VILLAGE && VILLAGE.byId && VILLAGE.byId.get(215);
    return b ? [b.cx, b.cy] : D.PLACES.schule.pos.slice();
  };
  const POS = {
    anger: () => D.PLACES.anger.pos.slice(),
    schule: schoolPos,
    haltestelle: () => D.PLACES.haltestelle.pos.slice(),
    rathaus: () => {
      const s = window.KERN && KERN.spot ? KERN.spot('schleusingen') : null;
      return s && s.pos ? [s.pos[0] + 40, s.pos[1] + 36] : D.PLACES.rathaus.pos.slice();
    },
    flur: () => D.LAND.hangwiese.c.slice(),
    baumschule: () => {
      const s = window.KERN && KERN.spot ? KERN.spot('baumschule') : null;
      return s && s.pos ? s.pos.slice(0, 2) : D.PLACES.baumschule.pos.slice();
    },
  };
  const projAt = pl =>
    Object.keys(D.PROJ).filter(
      id => (P0(id).place === pl || (step(id) && step(id).place === pl)) && (pst(id) || idea(id))
    );
  function stepText(id) {
    const p = pst(id),
      Pj = P0(id);
    if (!p) return idea(id) ? 'eine Idee – noch nicht angegangen' : 'unbekannt';
    if (p.st === 'fertig') return 'fertig';
    if (p.st !== 'laeuft') return (p.st === 'abgelehnt' ? 'abgelehnt' : 'vertagt') + (p.why ? ': ' + p.why : '');
    const s = Pj.steps[p.i];
    if (!s) return 'fast fertig';
    const when = p.due != null ? ` (${W.day(p.due).label}, ${hm(p.due)} Uhr)` : '';
    if (s.k === 'job')
      return `nächster Schritt: ${s.label} – Leute hinschicken (${STDATA.SKILL[s.skill || 'reden']} ${s.min || 1}, ${(s.people || [1, 2]).join('–')} Personen)`;
    if (s.k === 'rat') return `Ortsteilrat${when}`;
    if (s.k === 'stadt') return `Stadtrat in Schleusingen${when}`;
    if (s.k === 'quote') return `${s.text} Bisher etwa ${quota(id).n} von ${Pj.hh} Haushalten${when}`;
    if (s.k === 'foerder')
      return (
        ({
          einreichen: 'Förderung: Projektskizze zum Stichtag',
          auswahl: 'Förderung: die Aktionsgruppe bewertet',
          bewilligung: 'Förderung: Antrag beim Land, warten auf den Bescheid',
        }[p.fs] || 'Förderung') + when
      );
    if (s.k === 'bauhof') return `${s.text || 'Der Bauhof setzt es um'}${when}`;
    if (s.k === 'warten') return `${s.text || 'Warten'}${when}`;
    return '';
  }
  const hm = t => {
    const m = ((Math.floor(t) % 1440) + 1440) % 1440;
    return String(Math.floor(m / 60)).padStart(2, '0') + ':' + String(m % 60).padStart(2, '0');
  };
  const moodCls = r => (r >= 60 ? 'gut' : r >= 45 ? 'mittel' : 'schlecht');
  function projHtml(id) {
    const Pj = P0(id),
      p = pst(id),
      q = can(id);
    let act = '';
    if (!p || p.st === 'abgelehnt' || p.st === 'vertagt') {
      if (!p && Pj.land)
        act = `<button type="button" class="stb${q ? '' : ' acc'}" data-dorf="start:${id}"${q ? ' disabled' : ''} title="zum ortsüblichen Preis">Fair anbieten</button> <button type="button" class="stb" data-dorf="knapp:${id}"${q ? ' disabled' : ''} title="20 % unter dem ortsüblichen Preis">Knapp</button>`;
      else if (!p)
        act = `<button type="button" class="stb${q ? '' : ' acc'}" data-dorf="start:${id}"${q ? ' disabled' : ''}>Angehen</button>`;
      else act = `<button type="button" class="stb" data-dorf="retry:${id}">Neu einbringen</button>`;
    } else if (p.st === 'fertig') act = '<b>✓</b>';
    const k = p ? p.i / Math.max(1, Pj.steps.length) : 0;
    const who =
      { ortsteil: 'Ortsteilrat (eigenes Geld)', stadt: 'Stadtrat Schleusingen', privat: 'du selbst' }[Pj.by] || '';
    const cost = Pj.land
      ? Pj.deal === 'pacht'
        ? `Pacht ${eur(rentOf(Pj.land))} im Jahr (${eur(D.LAND[Pj.land].pacht)}/ha)`
        : `Kaufpreis ${eur(priceOf(Pj.land))} + 5 % Grunderwerbsteuer + Notar`
      : Pj.foerder
        ? `Kosten ${eur(Pj.cost)}, davon ${Math.round(D.FOERDER[Pj.foerder].rate * 100)} % Förderung`
        : `Kosten ${eur(Pj.cost || 0)}`;
    const from = Pj.land
      ? 'Eigentümer: ' + (D.LAND[Pj.land].owner ? nameOf(D.LAND[Pj.land].owner) : D.LAND[Pj.land].ownerName)
      : 'Wunsch von ' + nameOf(Pj.from);
    return `<div class="job"><span><b>${esc(Pj.title)}</b></span><span>${act}</span><small>${esc(Pj.text)}<br>Entscheidet: ${esc(who)} · ${esc(cost)} · ${esc(from)}</small><span class="bar"><u style="width:${Math.round(k * 100)}%"></u></span><span class="why">${esc(stepText(id))}</span><span class="learn" style="grid-column:1/3">${esc(Pj.learn)} <small>Quelle: ${esc(Pj.src)}</small></span></div>`;
  }
  function peopleHtml() {
    const ks = ORDER.filter(k => avail(k) || D.PEOPLE[k]);
    const known = ks.filter(knownP);
    let h = `<h4>Ansehen im Dorf</h4>`;
    if (!known.length)
      return (
        h +
        '<div class="sub">Noch kennst du hier niemanden – schick jemanden zum Herumhören (Sarah redet am besten).</div>'
      );
    h += '<ul>';
    for (const k of known) {
      const r = Math.round(rep(k));
      // who knows whom (exploration: where to go next) and what they would like
      const kn = D.PEOPLE[k].knows.filter(x => x !== k),
        wish = [D.PEOPLE[k].need, D.PEOPLE[k].need2].filter(x => D.PROJ[x]).map(x => D.PROJ[x].title);
      h += `<li title="${esc(D.PEOPLE[k].tip)}"><span>${esc(nameOf(k))} <small>${esc(DTEXT.P && DTEXT.P[k] ? DTEXT.P[k].role : '')}${wish.length ? ' · wünscht sich: ' + esc(wish.join(', ')) : ''} · kennt ${esc(names(kn))}</small></span><b class="dm ${moodCls(r)}">${esc(M.mood(r))} ${r}</b></li>`;
    }
    h += '</ul>';
    const rest = ks.length - known.length;
    if (rest) h += `<div class="sub">${rest} weitere kennst du noch nicht.</div>`;
    const lg = (AST().log || []).slice(-4).reverse();
    if (lg.length)
      h += `<div class="learn">${lg.map(e => esc(nameOf(e[1]) + ' ' + (e[2] > 0 ? '+' : '') + Math.round(e[2]) + ': ' + e[3])).join('<br>')}</div>`;
    return h;
  }
  function ratHtml() {
    const s = AST(),
      mem = A.ORTSRAT.filter(k => avail(k));
    let h = `<h4>Ortsteilrat</h4><div class="sub">Vorsitz: ${office() ? 'du (Ortsvorsteher)' : 'Ingrid Hartung, Ortsteilbürgermeisterin'} · Mitglieder: ${esc(names(mem))}</div>`;
    const due = Object.keys(D.PROJ).filter(id => step(id) && step(id).k === 'rat' && pst(id).due != null);
    h += due.length
      ? `<ul>${due.map(id => `<li><span>${esc(W.day(pst(id).due).label)} ${hm(pst(id).due)}</span><b>${esc(P0(id).title)}</b></li>`).join('')}</ul>`
      : '<div class="sub">Keine Sitzung angesetzt.</div>';
    h += `<h4>Geld des Ortsteils ${yearOf(now())}</h4><ul><li><span>übrig</span><b>${eur(budget())}</b></li>${st()
      .hh.slice(-5)
      .reverse()
      .map(e => `<li><span>${esc(W.day(e[0]).label)} · ${esc(e[2])}</span><b>${eur(e[1])}</b></li>`)
      .join(
        ''
      )}</ul><div class="learn">${esc(D.RULES.ortsteil_geld.why)} <small>Quelle: ${esc(D.RULES.ortsteil_geld.src)}</small></div>`;
    void s;
    return h;
  }
  STRAT.place.define({
    id: 'anger',
    name: D.PLACES.anger.name,
    icon: D.PLACES.anger.icon,
    order: D.PLACES.anger.order,
    r: D.PLACES.anger.r,
    pos: POS.anger,
    sub: () => 'Dorfplatz von Ratscher · Linde von 1888 · Projekte und Ansehen',
    info: () => {
      let h = peopleHtml();
      const ids = Object.keys(D.PROJ).filter(id => (pst(id) || idea(id)) && P0(id).place !== 'flur');
      h += `<h4>Dorfprojekte</h4>`;
      h += ids.length
        ? ids.map(projHtml).join('')
        : '<div class="sub">Noch keine Ideen – erst zuhören, was die Leute brauchen.</div>';
      return h;
    },
    badge: () => {
      const n = Object.values(st().proj).filter(p => p.st === 'laeuft').length;
      return n ? n + (n > 1 ? ' Projekte' : ' Projekt') : '';
    },
  });
  STRAT.place.define({
    id: 'schule',
    name: D.PLACES.schule.name,
    icon: D.PLACES.schule.icon,
    order: D.PLACES.schule.order,
    r: D.PLACES.schule.r,
    pos: POS.schule,
    sub: () => 'Erbaut 1828 · Ortsteilrat, Feuerwehr, freitags Skat',
    info: () => ratHtml() + projAt('schule').map(projHtml).join(''),
    badge: () => {
      const due = Object.keys(D.PROJ).filter(id => step(id) && step(id).k === 'rat' && pst(id).due != null);
      return due.length ? 'Sitzung ' + W.day(pst(due[0]).due).label.split(' ')[0] : '';
    },
  });
  STRAT.place.define({
    id: 'haltestelle',
    name: D.PLACES.haltestelle.name,
    icon: D.PLACES.haltestelle.icon,
    order: D.PLACES.haltestelle.order,
    r: D.PLACES.haltestelle.r,
    pos: POS.haltestelle,
    sub: () => 'Schulbus 7:12 · am Wochenende selten ein Bus',
    info: () => projAt('haltestelle').map(projHtml).join(''),
  });
  STRAT.place.define({
    id: 'rathaus',
    name: D.PLACES.rathaus.name,
    icon: D.PLACES.rathaus.icon,
    order: D.PLACES.rathaus.order,
    r: D.PLACES.rathaus.r,
    pos: POS.rathaus,
    sub: () => 'Stadtrat donnerstags (im Spiel; wirklich etwa einmal im Monat)',
    info: () => {
      const due = Object.keys(D.PROJ).filter(id => step(id) && step(id).k === 'stadt' && pst(id).due != null);
      return `<h4>Stadtrat</h4>${due.length ? `<ul>${due.map(id => `<li><span>${esc(W.day(pst(id).due).label)} ${hm(pst(id).due)}</span><b>${esc(P0(id).title)}</b></li>`).join('')}</ul>` : '<div class="sub">Nichts aus Ratscher auf der Tagesordnung.</div>'}<ul><li><span>Mittel der Stadt für kleine Maßnahmen ${yearOf(now())}</span><b>${eur(cityLeft())}</b></li></ul><div class="learn">${esc(D.RULES.stadt_entscheidet.why)} <small>Quelle: ${esc(D.RULES.stadt_entscheidet.src)}</small></div>`;
    },
  });
  function landHtml() {
    const ha = haOf('pacht'),
      he = haOf('eigen');
    let h = `<h4>Dein Land</h4><ul><li><span>Garten (Pacht, seit Jahren)</span><b>ca. 0,4 ha</b></li><li><span>dazu gepachtet</span><b>${ha.toLocaleString('de-DE', { maximumFractionDigits: 2 })} ha</b></li><li><span>dazu gekauft</span><b>${he.toLocaleString('de-DE', { maximumFractionDigits: 2 })} ha</b></li></ul>`;
    h += '<h4>Flächen</h4><ul>';
    for (const [k, Ld] of Object.entries(D.LAND)) {
      const l = land(k);
      h += `<li><span>${esc(Ld.name)} · ${esc(Ld.kind)} · ${Ld.ha.toLocaleString('de-DE')} ha<br><small>${esc(Ld.use)}</small></span><b>${l ? (l.st === 'eigen' ? 'gehört dir' : 'gepachtet') : Ld.owner && !knownP(Ld.owner) ? '?' : eur(Ld.kauf).replace(' €', '') + ' €/m²'}</b></li>`;
    }
    h += '</ul>';
    const ids = Object.keys(D.PROJ).filter(id => P0(id).place === 'flur' && (pst(id) || idea(id)));
    h += ids.length
      ? ids.map(projHtml).join('')
      : '<div class="sub">Wem was gehört, erfährst du im Dorf (Uwe bewirtschaftet die Wiesen, Wolfgang kennt den Wald).</div>';
    return h;
  }
  STRAT.place.define({
    id: 'flur',
    name: D.PLACES.flur.name,
    icon: D.PLACES.flur.icon,
    order: D.PLACES.flur.order,
    r: D.PLACES.flur.r,
    pos: POS.flur,
    sub: () => 'Wiesen, Äcker, Wald um Ratscher – pachten oder kaufen statt erobern',
    info: landHtml,
    badge: () =>
      haOf('pacht') + haOf('eigen') > 0
        ? '+' + (haOf('pacht') + haOf('eigen')).toLocaleString('de-DE', { maximumFractionDigits: 2 }) + ' ha'
        : '',
  });
  STRAT.place.define({
    id: 'baumschule',
    name: D.PLACES.baumschule.name,
    icon: D.PLACES.baumschule.icon,
    order: D.PLACES.baumschule.order,
    r: D.PLACES.baumschule.r,
    pos: POS.baumschule,
    sub: () => 'Obstbäume, Hecken, Wildgehölze – Hochstämme alter Sorten',
    info: () => projAt('baumschule').map(projHtml).join(''),
  });
  // the rent is due at Martini (11 November), as it has been for centuries
  KERN.on('strategie:tag', d => {
    try {
      const dy = d && d.day;
      if (!dy || !/-11-11$/.test(dy.iso)) return;
      for (const [k, l] of Object.entries(st().land))
        if (l.st === 'pacht' && dayOf(l.t) !== dayOf(d.t))
          STRAT.book(-rentOf(k), `Pacht ${D.LAND[k].name} (Martini)`, 'land');
    } catch (e) {}
  });
  // ---------------- the bar: the village in one box (the mean opinion of the people one knows, the Ortsteil's money) ----------------
  const meanRep = () => {
    const ks = ORDER.filter(k => knownP(k) && avail(k));
    return ks.length ? ks.reduce((s, k) => s + rep(k), 0) / ks.length : null;
  };
  STRAT.res.define({
    id: 'dorf',
    label: 'Dorf',
    icon: '♧',
    order: 65,
    get: () => meanRep() ?? 0,
    fmt: v => (meanRep() == null ? '?' : 'Ø ' + Math.round(v)) + ' · ' + eur(budget()).replace(',00', ''),
    tip: () =>
      `Ansehen: Ø Meinung der Leute, die du kennst (0–100, aus dem Ortsvorsteher-Spiel) · Geld des Ortsteils ${yearOf(now())}: ${eur(budget())} von ${eur(A.BUDGET)}`,
  });
  // ---------------- the layer: the villagers' homes with what they think of you (only those one knows), projects at their places ----------------
  STRAT.layer.define({
    id: 'dorf',
    label: 'Dorf',
    text: 'Wo die Leute wohnen und was sie von dir halten; laufende Projekte',
    order: 9,
    on: true,
    draw: pr => {
      let h = '';
      for (const [k, Ld] of Object.entries(D.LAND)) {
        const l = land(k),
          a = 0,
          c = Math.cos(a),
          sn = Math.sin(a),
          pts = [
            [-1, -1],
            [1, -1],
            [1, 1],
            [-1, 1],
          ].map(([u, v]) =>
            pr(
              Ld.c[0] + (u * Ld.w * c) / 2 - (v * Ld.h * sn) / 2,
              Ld.c[1] + (u * Ld.w * sn) / 2 + (v * Ld.h * c) / 2,
              0.3
            )
          );
        if (pts.some(q => q[2] >= 1)) continue;
        const col = l ? '#9fe070' : 'rgba(240,235,210,.55)';
        h += `<polygon points="${pts.map(q => q[0].toFixed(1) + ',' + q[1].toFixed(1)).join(' ')}" fill="${l ? 'rgba(140,210,90,.16)' : 'none'}" stroke="${col}" stroke-width="${l ? 2 : 1.2}"${l && l.st === 'pacht' ? ' stroke-dasharray="7 4"' : !l ? ' stroke-dasharray="3 4"' : ''}><title>${esc(Ld.name + (l ? (l.st === 'eigen' ? ' – gehört dir' : ' – gepachtet') : ''))}</title></polygon>`;
      }
      const H = AMT.homes ? AMT.homes() : null;
      if (!H) return h;
      const COL = { gut: '#8fd16a', mittel: '#e8c26a', schlecht: '#e0705a' };
      for (const [k, o] of Object.entries(H)) {
        if (!o || !o.door) continue;
        const q = pr(o.door[0], o.door[1], 2);
        if (q[2] >= 1) continue;
        const kn = knownP(k),
          r = rep(k);
        h += `<g class="dh"><circle cx="${q[0].toFixed(1)}" cy="${q[1].toFixed(1)}" r="6" fill="${kn ? COL[moodCls(r)] : 'rgba(200,200,200,.55)'}" stroke="rgba(0,0,0,.6)" stroke-width="1"><title>${esc(kn ? nameOf(k) + ': ' + M.mood(r) + ' (' + Math.round(r) + ')' : 'noch unbekannt')}</title></circle><text x="${q[0].toFixed(1)}" y="${(q[1] + 3.5).toFixed(1)}" text-anchor="middle" font-size="9" fill="#1d2214">${kn ? esc(nameOf(k)[0]) : '?'}</text></g>`;
      }
      return h;
    },
  });
  // ---------------- the chapter: Das Dorf (plan section 6, chapter 5) with goals that notice themselves ----------------
  STRAT.chapter.define(Object.assign({ order: 5 }, D.CHAPTER));
  if (STRAT.chapter.goal) {
    STRAT.chapter.goal('k5', {
      id: 'kennen',
      text: 'Fünf Leute im Dorf kennenlernen',
      check: () => ORDER.filter(knownP).length >= 5,
    });
    STRAT.chapter.goal('k5', {
      id: 'rat',
      text: 'Ein Projekt durch den Ortsteilrat bringen',
      on: 'dorfprojekt',
      when: d => d.state === 'beschlossen',
    });
    STRAT.chapter.goal('k5', {
      id: 'fertig',
      text: 'Ein Dorfprojekt fertigstellen',
      on: 'dorfprojekt',
      when: d => d.state === 'fertig',
    });
  }
  // ---------------- your style and the village: the core's measure (Black & White) is fed by what one does for the village; and what the
  // village hears of your conduct (a late order, beetles left in the forest) costs a little trust with everyone ----------------
  let selfStyle = false;
  function styleSelf(d, why) {
    selfStyle = true;
    try {
      STRAT.style(d, why);
    } finally {
      selfStyle = false;
    }
  }
  const heardDay = {};
  KERN.on('strategie:stil', d => {
    if (selfStyle || !d || !Number.isFinite(d.delta) || Math.abs(d.delta) < 3) return;
    const k = String(d.why || '').slice(0, 40),
      day = dayOf(now());
    if (heardDay[k] === day) return;
    heardDay[k] = day;
    const dd = d.delta > 0 ? 1 : -1;
    for (const p of ORDER) if (knownP(p) && avail(p)) L(p, dd, 'Im Dorf spricht sich herum: ' + d.why);
    amtSave();
  });
  // ---------------- quiet hours kept or not (also on foot): the petrol mower in the garden on a Sunday, a holiday or after 20 h is heard
  // next door – Hubert, Ronald and Heike think less of you, and so does your style (once a day; the rule's reason in the notice) ----------------
  let noisyDay = null;
  function quiet(t) {
    if (!GPLAY || !GPLAY.M || !GPLAY.M.run) return;
    const dy = W.day(t),
      m = W.minOf(t),
      rule = dy.rest ? 'ruhe_sonntag' : m < 7 * 60 || m >= 20 * 60 ? 'ruhe_nacht' : null;
    if (!rule || noisyDay === dayOf(t)) return;
    noisyDay = dayOf(t);
    for (const k of ['hubert', 'ronald', 'heike']) if (avail(k)) L(k, -2, 'Rasenmähen in der Ruhezeit');
    amtSave();
    styleSelf(-2, 'Rasenmähen in der Ruhezeit');
    const R = STDATA.RULES[rule];
    STRAT.note('Ronald ruft über den Zaun: „' + (dy.rest ? 'Heute ist Ruhe!' : 'Um die Zeit?') + '“ – ' + R.text, {
      kind: 'nein',
      why: R.why,
      src: R.src,
    });
    try {
      if (!S.on && PLAY && PLAY.think)
        PLAY.think(
          'Ronald ruft über den Zaun: „' +
            (dy.rest ? 'Heute ist Ruhe, Nachbar!' : 'Um die Zeit? Die Leute schlafen!') +
            '“',
          5200
        );
    } catch (e) {}
  }
  // ---------------- the councils' dates come (also in a time-lapse and while one walks) ----------------
  let acc = 0;
  KERN.tick(dt => {
    if ((acc += dt) < 0.5 || S.t == null) return;
    acc = 0;
    const t = now();
    quiet(t);
    for (const id of Object.keys(st().proj)) {
      const p = pst(id),
        s = step(id);
      if (!p || p.st !== 'laeuft' || !s || p.due == null || t < p.due) continue;
      const due = p.due;
      try {
        if (s.k === 'rat') ratDecide(id, due);
        else if (s.k === 'stadt') stadtDecide(id, due);
        else if (s.k === 'foerder') foerderStep(id, due);
        else if (s.k === 'quote') quoteDecide(id, due);
        else next(id, due, s.text || s.k);
      } catch (e) {
        console.warn('strategie-dorf', id, e);
        p.due = null;
      }
    }
  }, 'strategie/dorf');
  // ---------------- the panel's own buttons (data-dorf="start:id" …) – the core's panel ignores them ----------------
  const css = document.createElement('style');
  css.textContent =
    '#stpan .dm.gut{color:#a8e07a}#stpan .dm.mittel{color:#e8c26a}#stpan .dm.schlecht{color:#f08a70}#stpan .dm{white-space:nowrap}';
  document.head.appendChild(css);
  document.addEventListener(
    'click',
    e => {
      const b = e.target && e.target.closest && e.target.closest('#stpan [data-dorf]');
      if (!b) return;
      e.preventDefault();
      const [a, id] = String(b.dataset.dorf).split(':');
      let r = null;
      if (a === 'start') r = start(id);
      else if (a === 'knapp') r = start(id, { offer: 'knapp' });
      else if (a === 'retry') r = retry(id);
      if (r && r.no) STRAT.note(r.text, { kind: 'nein', why: r.why || null, src: r.src || null });
      const U = STRAT.ui;
      if (U && U.H) {
        U.H.panH = '';
        if (U.H.panel) U.H.panel();
      }
    },
    true
  );
  KERN.on('reset', () => {
    S.ext.dorf = fresh();
  });
  // state for tests and the lead (window.STDORF)
  const state = () => ({
    known: ORDER.filter(knownP),
    ideas: Object.keys(D.PROJ).filter(idea),
    proj: Object.fromEntries(
      Object.entries(st().proj).map(([k, p]) => [k, { st: p.st, i: p.i, due: p.due, step: stepText(k) }])
    ),
    budget: budget(),
    city: cityLeft(),
    rep: Object.fromEntries(ORDER.map(k => [k, Math.round(rep(k))])),
    built: Object.keys(AST().built || {}),
    world: AMTWORLD.state ? AMTWORLD.state().items : [],
    hh: st().hh.slice(-5),
  });
  return { D, st, state, start, retry, meet, idea, can, step, stepText, budget, cityLeft, nextRat, nextStadt, sync };
})();
window.STDORF = STDORF;
