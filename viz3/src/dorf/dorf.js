// ===================== feat/dorf village life 6: the evening in the school, the fire, talking to the villagers, the task (DORF) =====================
// Ties dorf/dorf_cal.js (when), dorf/dorf_school.js (the room), dorf/dorf_fire.js (the fire), dorf/dorf_people.js (the figures) and
// dorf/dorf_text.js (what they say) together: builds the room and the fire place when one comes near, opens the school on Friday evenings,
// loads the villagers only for an evening one is close to and seats them (Skat table, Rummy table, bar) or stands them around the fire,
// a talk panel in the look of the neighbours' (#dorfpanel, shell/css/dorf.css), table talk and stories as subtitles (#dorfsub), the free
// chair, the card game „Höher oder tiefer“, the task „Freitagabend in der alten Schule“ (saved: pav-dorf-v1). An evening one is part of
// does not end under one's feet: it goes on while one stays inside or at the fire. Test hooks: window.DORF, ?dorf=freitag|feuer.
import { $, cam, QS } from '../core/head.js';
import { SAVE } from '../core/save.js';
import { KERN } from '../core/kern.js';
import { markDirty, whenLoaded } from '../core/assets.js';
import { floorAt, P } from '../game/walkable.js';
import { CAM3 } from '../game/player.js';
import { PLAY } from '../game/play.js';
import { news, toast } from '../audio/audio.js';
import { VILLAGE } from '../world/village.js';
import { DCAL } from './dorf_cal.js';
import { DTEXT } from './dorf_text.js';
import { DPEOPLE } from './dorf_people.js';
import { DSCHOOL } from './dorf_school.js';
import { DFIRE } from './dorf_fire.js';
import { DLIFE } from './dorf_life.js';
import { DCARS } from './dorf_cars.js';
export const DORF = (() => {
  const T = DTEXT,
    NAME = k => (T.P[k] ? T.P[k].name : k);
  // ---- the saved task ----
  const KEY = 'pav-dorf-v1',
    STEPS = ['none', 'invite', 'greet', 'sit', 'story', 'play', 'fire', 'done'];
  const ST = { v: 1, step: 'none', visits: 0, played: 0, best: 0, fires: 0, err: {} };
  {
    const s = SAVE.get(KEY);
    if (s && typeof s === 'object') {
      if (STEPS.includes(s.step)) ST.step = s.step;
      for (const k of ['visits', 'played', 'best', 'fires'])
        if (Number.isFinite(s[k])) ST[k] = Math.max(0, Math.min(1e6, s[k] | 0));
      // the errands: { id: { st: 'open' | 'done', i: step, n0 } } – only known ones, checked field by field
      if (s.err && typeof s.err === 'object')
        for (const [id, e] of Object.entries(s.err))
          if (T.ERRANDS[id] && e && (e.st === 'open' || e.st === 'done'))
            ST.err[id] = {
              st: e.st,
              i: Math.max(0, Math.min(T.ERRANDS[id].steps.length - 1, e.i | 0)),
              n0: Number.isFinite(e.n0) ? e.n0 : 0,
            };
    }
  }
  const save = () => SAVE.set(KEY, ST);
  const stepI = s => STEPS.indexOf(s);
  // the role as the matter stands: amt/amt.js knows when Ingrid has handed over the office (its roleOf first, if it has one)
  function roleOf(k) {
    try {
      const A = window.AMT;
      if (A && typeof A.roleOf === 'function') {
        const r = A.roleOf(k);
        if (r) return r;
      }
    } catch (e) {}
    if (k === 'ingrid' && DLIFE.retired()) return 'war elf Jahre Ortsteilbürgermeisterin';
    return T.P[k].role;
  }
  const stepText = s =>
    DLIFE.retired()
      ? T.TASK.steps[s].replace('die Ortsteilbürgermeisterin', 'die frühere Ortsteilbürgermeisterin')
      : T.TASK.steps[s];
  function setStep(s, quiet) {
    if (stepI(s) <= stepI(ST.step)) return;
    ST.step = s;
    save();
    UI.task();
    if (!quiet && T.TASK.steps[s]) PLAY.think((s === 'done' ? 'Geschafft: ' : 'Aufgabe: ') + stepText(s), 6500);
  }
  // ---- where things are ----
  const S = {
    want: null,
    dropT: 0,
    skat: false,
    fire: false,
    skatStick: false,
    fireStick: false,
    sc: null,
    inside: false,
    t: 0,
    calT: 0,
    skatCal: false,
    fireCal: false,
    skatSoon: false,
    need: new Set(),
    idle: {},
    life: {},
    near: {},
    out: {},
    lifeT: 0,
    talkTo: null,
    carNeed: {}, // owners whose car is about to leave or coming home near the visitor: their figure is wanted (S.t of the last ask)
  };
  const school = () => {
    if (S.sc) return S.sc;
    const b = window.VILLAGE && VILLAGE.byId && VILLAGE.byId.get(215);
    if (b) S.sc = [b.cx, b.cy];
    return S.sc;
  };
  // ---- the talk panel and the subtitles ----
  const UI = (() => {
    const host = ($('npcpanel') && $('npcpanel').parentNode) || $('stage') || document.body;
    const el = document.createElement('aside');
    el.id = 'dorfpanel';
    el.hidden = true;
    el.setAttribute('aria-label', 'Gespräch im Dorf');
    el.innerHTML =
      '<header><div class="who"><h3></h3><span class="role"></span></div><button type="button" class="x" aria-label="Schließen">×</button></header>' +
      '<div class="task" hidden></div><div class="say"></div><div class="topics"></div>';
    host.appendChild(el);
    const sub = document.createElement('div');
    sub.id = 'dorfsub';
    sub.hidden = true;
    host.appendChild(sub);
    const h3 = el.querySelector('h3'),
      role = el.querySelector('.role'),
      task = el.querySelector('.task'),
      say = el.querySelector('.say'),
      tp = el.querySelector('.topics');
    const U = { cur: null, n: {}, el, sub };
    let subT = null;
    U.subtitle = (who, text, ms) => {
      sub.textContent = (who ? NAME(who) + ': ' : '') + text;
      sub.hidden = false;
      clearTimeout(subT);
      const f = DPEOPLE.figs[who];
      if (f) f.walker.talking = f.mode !== 'sit';
      subT = setTimeout(
        () => {
          sub.hidden = true;
          if (f) f.walker.talking = false;
        },
        ms || Math.max(2600, text.length * 62)
      );
    };
    U.task = () => {
      const s = ST.step,
        er = errandOf(U.cur) || errandOf(null);
      let html = '';
      if (er) html = '<b>' + er.E.title + '</b> – ' + er.E.steps[er.e.i].text;
      else if (stepI(s) >= 1 && s !== 'done') html = '<b>' + T.TASK.title + '</b> – ' + stepText(s);
      task.hidden = !html;
      if (html) task.innerHTML = html;
    };
    function button(label, fn, cls) {
      const b = document.createElement('button');
      b.type = 'button';
      b.textContent = label;
      if (cls) b.className = cls;
      b.addEventListener('click', fn);
      tp.appendChild(b);
      return b;
    }
    // the topics of a person; the task's topic first
    function topics(k) {
      tp.innerHTML = '';
      const p = T.P[k];
      const q = questTopic(k);
      if (q) button(q.label, q.run, 'quest');
      for (const e of errandTopics(k)) button(e.label, e.run, 'quest');
      for (const [id, [label]] of Object.entries(p.topics)) button(label, () => ask(k, id));
      button('Tschüss', () => U.close(), 'bye');
    }
    function ask(k, id) {
      const lines = T.P[k].topics[id].slice(1),
        n = (U.n[k + id] = (U.n[k + id] || 0) + 1);
      say.textContent = lines[(n - 1) % lines.length];
      talkFig(k, say.textContent);
      if (k === 'uwe' && id === 'trinken' && DSCHOOL.drink && !DSCHOOL.drink.visible) {
        DSCHOOL.drink.visible = true; // the glass stands on the counter
        markDirty();
      }
    }
    function talkFig(k, text) {
      const f = DPEOPLE.figs[k];
      if (!f) return;
      f.walker.talking = f.mode !== 'sit';
      clearTimeout(f._tt);
      f._tt = setTimeout(() => (f.walker.talking = false), Math.max(2500, text.length * 60));
    }
    U.open = (k, mode) => {
      if (!T.P[k]) return;
      U.cur = k;
      const p = T.P[k];
      h3.textContent = p.full;
      role.textContent = p.age + ' · ' + roleOf(k);
      el.hidden = false;
      U.task();
      // the evening greeting at the school and the fire, otherwise one of the day (good morning / hello / good evening by the clock)
      const ev = S.placed === 'school' || S.placed === 'fire',
        g = ev || !p.day ? p.greet : p.dayRetired && DLIFE.retired() ? p.dayRetired : p.day,
        n = (U.n[k] = (U.n[k] || 0) + 1),
        hr = window.CLOCK ? (window.CLOCK.t % 1440) / 60 : 12;
      say.textContent = g[(n - 1) % g.length].replace(
        '{gruss}',
        hr < 4 || hr >= 18 ? 'Guten Abend' : hr < 11 ? 'Guten Morgen' : 'Hallo'
      );
      talkFig(k, say.textContent);
      if (mode === 'game') game.start();
      else topics(k);
      onTalk(k);
      markDirty();
    };
    U.close = () => {
      if (!U.cur) return;
      const f = DPEOPLE.figs[U.cur];
      if (f) f.walker.talking = false;
      U.cur = null;
      el.hidden = true;
      game.on = false;
    };
    U.say = (k, text) => {
      if (U.cur !== k) return;
      say.textContent = text;
      talkFig(k, text);
    };
    U.buttons = list => {
      tp.innerHTML = '';
      for (const [label, fn, cls] of list) button(label, fn, cls);
    };
    U.topics = topics;
    el.querySelector('.x').addEventListener('click', () => U.close());
    window.addEventListener('keydown', e => {
      if (e.key === 'Escape' && U.cur) {
        U.close();
        e.stopPropagation();
      }
    });
    return U;
  })();
  // ---- the card game „Höher oder tiefer“ with a Skat deck (Katrin) ----
  const game = (() => {
    const SU = ['Kreuz', 'Pik', 'Herz', 'Karo'],
      RK = ['Sieben', 'Acht', 'Neun', 'Zehn', 'Bube', 'Dame', 'König', 'Ass'];
    const G = { on: false, deck: [], cur: null, round: 0, score: 0, N: 5 };
    const name = c => SU[c.s] + ' ' + RK[c.r];
    function start() {
      G.on = true;
      G.deck = [];
      for (let s = 0; s < 4; s++) for (let r = 0; r < 8; r++) G.deck.push({ s, r });
      for (let i = G.deck.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [G.deck[i], G.deck[j]] = [G.deck[j], G.deck[i]];
      }
      G.cur = G.deck.pop();
      G.round = 0;
      G.score = 0;
      UI.say(
        'katrin',
        'Ganz einfach: Ich decke eine Karte auf, du sagst, ob die nächste höher oder tiefer ist. Sieben ist die kleinste, Ass die größte – gleich zählt für dich. Fünf Runden. Erste Karte: ' +
          name(G.cur) +
          '.'
      );
      ask();
    }
    function ask() {
      UI.buttons([
        ['Höher', () => guess(1), 'quest'],
        ['Tiefer', () => guess(-1), 'quest'],
        ['Lieber nicht', () => stop(), 'bye'],
      ]);
    }
    function guess(d) {
      if (!G.on) return;
      const nx = G.deck.pop(),
        ok = d > 0 ? nx.r >= G.cur.r : nx.r <= G.cur.r;
      G.round++;
      if (ok) G.score++;
      G.cur = nx;
      if (G.round >= G.N) return end(nx, ok);
      UI.say(
        'katrin',
        name(nx) + ' – ' + (ok ? 'richtig!' : 'daneben.') + ' Das sind ' + G.score + ' von ' + G.round + '. Und jetzt?'
      );
    }
    function end(nx, ok) {
      G.on = false;
      ST.played++;
      ST.best = Math.max(ST.best, G.score);
      const c =
        G.score >= 4
          ? 'Du hast ja Glück! Nächsten Freitag setzt du dich an den Skattisch.'
          : G.score >= 2
            ? 'Nicht schlecht für den Anfang. Ingrid hat am ersten Abend nur eine Karte erraten.'
            : 'Macht nichts – beim Kartenspielen gewinnt am Ende immer das Dorf.';
      const nf = DCAL.next('fire'),
        fire =
          nf != null
            ? ' Und übrigens: Am ' + DCAL.dateOf(nf) + ' ist Feuer am Acker Richtung Klinge. Komm vorbei!'
            : '';
      UI.say(
        'katrin',
        name(nx) +
          ' – ' +
          (ok ? 'richtig! ' : 'daneben. ') +
          G.score +
          ' von ' +
          G.N +
          '. ' +
          c +
          (ST.step === 'play' ? fire : '')
      );
      save();
      if (ST.step === 'play') setStep('fire');
      UI.buttons([
        ['Noch eine Runde', () => start(), 'quest'],
        ['Danke, Katrin', () => UI.close(), 'bye'],
      ]);
    }
    function stop() {
      G.on = false;
      UI.say('katrin', 'Auch gut. Zum Zuschauen ist der Stuhl genauso bequem.');
      UI.topics('katrin');
    }
    return Object.assign(G, { start, guess });
  })();
  // ---- the task: a topic for the person it is about ----
  function questTopic(k) {
    const s = ST.step;
    if (k === 'ingrid' && (s === 'none' || s === 'invite' || s === 'greet') && S.skat)
      return {
        label: 'Hallo, ich bin neu hier',
        run: () => {
          UI.say(
            'ingrid',
            'Wie schön! Dann gehörst du ab heute zum Freitagabend. Setz dich an unseren Tisch – der Stuhl am Fenster ist frei. Und hör Gerhard zu, wenn er erzählt.'
          );
          setStep('sit');
          UI.topics('ingrid');
        },
      };
    if (k === 'katrin' && (s === 'play' || stepI(s) >= stepI('fire')) && S.skat)
      return {
        label: s === 'play' ? 'Eine Runde spielen' : 'Noch eine Runde „Höher oder tiefer“',
        run: () => game.start(),
      };
    if (k === 'wolfgang' && s === 'fire' && S.fire)
      return {
        label: 'Ingrid hat mich eingeladen',
        run: () => {
          UI.say(
            'wolfgang',
            'Dann bist du hier richtig. Stell dich ans Feuer, das Holz ist aus der Klinge. Freitags in der Schule, manchmal samstags hier – jetzt gehörst du dazu.'
          );
          ST.fires++;
          setStep('done');
          UI.topics('wolfgang');
        },
      };
    return null;
  }
  function onTalk(k) {
    if (k === 'ingrid' && S.skat && stepI(ST.step) < stepI('greet')) setStep('greet', true);
  }
  // ---- errands of the villagers (DTEXT.ERRANDS): offer, steps (go somewhere, have something, come back), thanks ----
  function errandOf(k) {
    for (const [id, E] of Object.entries(T.ERRANDS)) {
      const e = ST.err[id];
      if (!e || e.st !== 'open') continue;
      if (k === null || E.who === k || E.steps[e.i].talk === k) return { id, E, e };
    }
    return null;
  }
  const have = {
    board: () => !!(window.WERK && window.WERK.hasFinished && window.WERK.hasFinished()),
    log: e => !!(window.FELL && Array.isArray(window.FELL.logs) && window.FELL.logs.length > (e.n0 || 0)),
  };
  function errandTopics(k) {
    const out = [];
    for (const [id, E] of Object.entries(T.ERRANDS)) {
      const e = ST.err[id];
      if (!e && E.who === k)
        out.push({
          label: E.offer[0],
          run: () => {
            ST.err[id] = {
              st: 'open',
              i: 0,
              n0: window.FELL && Array.isArray(window.FELL.logs) ? window.FELL.logs.length : 0,
            };
            save();
            UI.say(k, E.offer[1]);
            PLAY.think('Aufgabe „' + E.title + '“: ' + E.steps[0].text, 6500);
            UI.task();
            UI.topics(k);
          },
        });
      else if (e && e.st === 'open') {
        const st = E.steps[e.i];
        if (st.talk === k)
          out.push({
            label: st.label,
            run: () => {
              if (st.give === 'board') {
                if (!have.board()) {
                  UI.say(k, 'Das Brett musst du schon in der Hand haben – fertig geölt.');
                  return;
                }
                const c = window.WERK.handOver();
                if (c) {
                  c.where = 'dorf'; // given to the village, not to Ronald (werk/werk.js hands over to him by default)
                  if (window.WERK.save) window.WERK.save();
                }
              }
              errandNext(id, k);
            },
          });
      }
    }
    return out;
  }
  function errandNext(id, k) {
    const E = T.ERRANDS[id],
      e = ST.err[id];
    if (!e) return;
    e.i++;
    if (e.i >= E.steps.length) {
      e.st = 'done';
      e.i = E.steps.length - 1;
      save();
      if (k && UI.cur === k) UI.say(k, E.thanks);
      PLAY.think('Geschafft: „' + E.title + '“', 4500);
    } else {
      save();
      PLAY.think('Aufgabe „' + E.title + '“: ' + E.steps[e.i].text, 6500);
    }
    UI.task();
    if (k && UI.cur === k) UI.topics(k);
  }
  // goto and have steps are checked twice a second
  function errandPlace(n) {
    if (n === 'linde') return VPROPS_AT('LINDE');
    if (n === 'brunnen') return VPROPS_AT('FOUNTAIN');
    if (n === 'schule')
      return window.VPROPS && window.VPROPS.school ? [window.VPROPS.school.cx, window.VPROPS.school.cy] : null;
    const N = window.NPC && window.NPC.NPCS && window.NPC.NPCS[n];
    return N && Number.isFinite(N.x) ? [N.x, N.y] : null;
  }
  const VPROPS_AT = k => (window.VPROPS && window.VPROPS[k] ? window.VPROPS[k] : null);
  function errandTick() {
    for (const [id, E] of Object.entries(T.ERRANDS)) {
      const e = ST.err[id];
      if (!e || e.st !== 'open') continue;
      const st = E.steps[e.i];
      if (st.goto) {
        const p = errandPlace(st.goto);
        if (p && P.mode === 'walk' && Math.hypot(P.x - p[0], P.y - p[1]) < st.r) {
          const clk = window.VPROPS && window.VPROPS.clock && window.VPROPS.clock();
          const uhr = clk
            ? Math.floor(clk.h) + ':' + String(Math.floor(clk.m)).padStart(2, '0') + ' Uhr'
            : 'die Zeit des Dorfes';
          later(0.2, () => PLAY.think(st.at.replace('{uhr}', uhr), 5500));
          errandNext(id, null);
        }
      } else if (st.have && have[st.have] && have[st.have](e)) errandNext(id, null);
    }
  }
  // ---- table talk, stories ----
  const TALKQ = { lines: null, i: 0, t: 0, story: false, wait: 8, last: -1 };
  function play(lines, story) {
    TALKQ.lines = lines;
    TALKQ.i = 0;
    TALKQ.t = 0;
    TALKQ.story = !!story;
  }
  function talkTick(dt, where) {
    const Q = TALKQ;
    if (Q.lines) {
      Q.t -= dt;
      if (Q.t > 0) return;
      if (Q.i >= Q.lines.length) {
        const wasStory = Q.story;
        Q.lines = null;
        Q.wait = 16 + Math.random() * 18;
        if (wasStory && ST.step === 'story') {
          setStep('play');
          later(0.9, () => UI.cur !== 'katrin' && UI.open('katrin'));
        }
        return;
      }
      const [who, text] = Q.lines[Q.i++],
        ms = Math.max(2800, text.length * 62);
      UI.subtitle(who, text, ms);
      Q.t = ms / 1000 + 0.5;
      return;
    }
    if (!where || UI.cur) return;
    Q.wait -= dt;
    if (Q.wait > 0) return;
    const pool = where === 'school' ? [...T.TALK, ...T.STORIES] : T.FIRE;
    let i = Math.floor(Math.random() * pool.length);
    if (i === Q.last) i = (i + 1) % pool.length;
    Q.last = i;
    play(pool[i].filter(([w]) => DPEOPLE.figs[w] && DPEOPLE.figs[w].g.visible));
  }
  // ---- the villagers: where they are this evening ----
  const FIREPEOPLE = ['wolfgang', 'uwe', 'manfred', 'katrin', 'jens', 'gerhard', 'ingrid', 'heike'];
  // a mild evening (May to September): Jens and Heike sit outside before the school, else at the long table inside
  const mild = () => {
    const mo = new Date(DCAL.eday() * 864e5).getUTCMonth();
    return mo >= 4 && mo <= 8 && DCAL.min() < 22 * 60;
  };
  function placeSchool() {
    for (const k of DPEOPLE.KEYS) {
      const st = DSCHOOL.seats[k] || DSCHOOL.seats[k + (mild() ? 'Out' : 'In')];
      if (!st || !DPEOPLE.figs[k]) continue;
      const [x, y, z] = DSCHOOL.at(st.x, st.y);
      DPEOPLE.place(
        k,
        x,
        y,
        z + (st.hg || 0),
        DSCHOOL.az(Math.cos(st.a), Math.sin(st.a)),
        st.stand ? 'stand' : 'sit',
        st.top || 0.47
      );
    }
  }
  function placeFire() {
    const sp = DFIRE.spots(),
      stand = sp.filter(s => s.stand),
      sit = sp.filter(s => s.sit);
    FIREPEOPLE.forEach((k, i) => {
      if (!DPEOPLE.figs[k]) return;
      const s = i < 5 ? stand[i] : sit[i - 5];
      if (!s) return;
      const z = KERN.terrain(s.x, s.y) + (s.sit ? 0 : DFIRE.PATCH); // standing on the trampled ground round the fire
      DPEOPLE.place(k, s.x, s.y, z, s.hd, s.sit ? 'sit' : 'stand', 0.42);
    });
  }
  // ---- actions: talking, the door, the notice, the free chair ----
  for (const k of Object.keys(T.P))
    PLAY.act({
      id: 'dorf:' + k,
      r: 2.4,
      prio: -0.25,
      label: () => {
        const f = DPEOPLE.figs[k];
        return f && f.g.visible && UI.cur !== k ? 'Mit ' + NAME(k) + ' sprechen' : null;
      },
      pos: () => DPEOPLE.head(k),
      run: () => UI.open(k),
    });
  PLAY.act({
    id: 'dorf:door',
    r: 1.7,
    label: () => (DSCHOOL.built && DSCHOOL.want < 0.5 && !DSCHOOL.inside() ? 'Tür der alten Schule' : null),
    pos: () => {
      if (!DSCHOOL.built) return null; // the candidates are asked every frame: nothing before the room exists
      const [x, y] = DSCHOOL.toW(DSCHOOL.F.du, -0.3);
      return [x, y, DSCHOOL.F.zF + 1.0];
    },
    run: () => {
      const u = DCAL.until('skat'),
        when = Number.isFinite(u) ? ' – wieder am ' + DCAL.dateOf(CLOCK_T() + u) + ' ab 19 Uhr' : '';
      PLAY.think('Abgeschlossen. Freitags ab 19 Uhr ist hier Skat- und Rommé-Abend' + when + '.', 5200);
      if (stepI(ST.step) < 1) setStep('invite');
    },
  });
  const CLOCK_T = () => (window.CLOCK ? window.CLOCK.t : 0);
  // locked in (the door shut behind one, or one got in some other way): out through the door
  PLAY.act({
    id: 'dorf:out',
    r: 1.8,
    label: () => (DSCHOOL.built && DSCHOOL.want < 0.5 && DSCHOOL.inside() ? 'Hinausgehen' : null),
    pos: () => {
      if (!DSCHOOL.built) return null;
      const [x, y] = DSCHOOL.toW(DSCHOOL.F.du, 0.6);
      return [x, y, DSCHOOL.F.zF + 1.0];
    },
    run: () => {
      const [x, y] = DSCHOOL.toW(DSCHOOL.F.du, -1.4);
      putPlayer(x, y, DSCHOOL.az(0, -1), DSCHOOL.F.zF - 0.3);
    },
  });
  PLAY.act({
    id: 'dorf:notice',
    r: 1.6,
    prio: 0.1,
    label: () => (DSCHOOL.built && DSCHOOL.noticeAt ? 'Aushang lesen' : null),
    pos: () =>
      DSCHOOL.built && DSCHOOL.noticeAt ? [DSCHOOL.noticeAt[0], DSCHOOL.noticeAt[1], DSCHOOL.F.zF + 1.2] : null,
    run: () => {
      toast(T.NOTICE.replace(/\n+/g, ' · '), 14000);
      if (stepI(ST.step) < 1) {
        setStep('invite');
        news(
          'Neu im Dorf: freitags Skat- und Rommé-Abend in der alten Schule, manchmal samstags ein Feuer am Acker Richtung Klinge.',
          9000
        );
      }
    },
  });
  PLAY.act({
    id: 'dorf:seat',
    r: 1.3,
    prio: 0.05,
    label: () => (S.skat && DSCHOOL.built && !PLAY.seat && DSCHOOL.inside() ? 'Hinsetzen' : null),
    pos: () => {
      const st = DSCHOOL.built && DSCHOOL.seats.player;
      if (!st) return null;
      const [x, y, z] = DSCHOOL.at(st.x, st.y);
      return [x, y, z + 0.5];
    },
    run: () => sitDown(),
  });
  function sitDown() {
    const st = DSCHOOL.seats.player;
    if (!st) return false;
    const [x, y, z] = DSCHOOL.at(st.x - Math.cos(st.a) * 0.05, st.y - Math.sin(st.a) * 0.05);
    return PLAY.sit({
      x,
      y,
      eye: z + st.top + 0.78,
      yaw: DSCHOOL.az(Math.cos(st.a), Math.sin(st.a)),
      pitch: -10,
      leaveLabel: 'Aufstehen',
      onSit: () => {
        if (ST.step === 'sit') {
          setStep('story');
          later(1.2, () => play(T.STORY, true));
        }
      },
    });
  }
  // things to do a little later, in the frame loop's time (no timers: tests step the world, timers would race them)
  const LATER = [];
  function later(sec, fn) {
    LATER.push({ t: S.t + sec, fn });
  }
  // ---- per frame ----
  let acc = 0;
  function tick(dt) {
    dt = Math.min(dt, 0.25);
    acc += dt;
    S.t += dt;
    for (let i = LATER.length - 1; i >= 0; i--)
      if (LATER[i].t <= S.t) {
        const f = LATER.splice(i, 1)[0].fn;
        try {
          f();
        } catch (e) {
          console.warn('dorf', e);
        }
      }
    const sc = school();
    if (!sc) return;
    const mx = P.mode === 'walk' ? P.x : cam.position.x,
      my = P.mode === 'walk' ? P.y : -cam.position.z,
      dS = Math.hypot(mx - sc[0], my - sc[1]),
      dF = Math.hypot(mx - DFIRE.at[0], my - DFIRE.at[1]);
    if (!DSCHOOL.built && dS < 170 && !DSCHOOL.err) DSCHOOL.build();
    if (!DFIRE.built && dF < 420 && !DFIRE.err) DFIRE.build();
    // the evenings (an evening one is part of goes on while one stays)
    const inside = DSCHOOL.built && P.mode === 'walk' && DSCHOOL.inside();
    if (inside && !S.inside && S.skat) {
      ST.visits++;
      if (stepI(ST.step) < stepI('greet')) setStep('greet');
      else save();
    }
    S.inside = inside;
    if (S.calT <= 0) {
      // the calendar twice a second (not every frame)
      S.calT = 0.5;
      S.skatCal = DCAL.on('skat');
      S.fireCal = DCAL.on('fire');
      S.skatSoon = S.skatCal || DCAL.until('skat') < 40;
      errandTick();
    }
    S.calT -= dt;
    const skatCal = S.skatCal,
      fireCal = S.fireCal;
    // an evening is on and one is around (garden, village): a hint once per evening
    const ev = skatCal ? 'skat' : fireCal ? 'fire' : null;
    if (ev && P.mode === 'walk' && S.hinted !== ev + DCAL.eday()) {
      const d = ev === 'skat' ? dS : dF;
      if (d > 60 && d < 900) {
        S.hinted = ev + DCAL.eday();
        toast(
          ev === 'skat'
            ? 'Freitagabend: In der alten Schule brennt Licht – Skat- und Rommé-Abend, das Dorf trifft sich.'
            : 'Samstagabend: Auf dem Acker Richtung Klinge brennt ein Feuer – das Dorf kommt zusammen.',
          7000
        );
      }
    }
    if (skatCal && (inside || dS < 30)) S.skatStick = true;
    if (!inside && dS > 30) S.skatStick = false;
    if (fireCal && dF < 25) S.fireStick = true;
    if (dF > 40) S.fireStick = false;
    S.skat = skatCal || S.skatStick;
    S.fire = fireCal || S.fireStick;
    if (DSCHOOL.built) {
      if (DSCHOOL.want > 0.5 !== S.skat) DSCHOOL.setOpen(S.skat);
      DSCHOOL.tick(dt, S.skat, dS < 45);
    }
    if (DFIRE.built) DFIRE.tick(dt, S.fire, dF);
    // who is needed where: an evening near the school or the fire (all of them, loaded shortly before), else the ones whose day brings
    // them out of the house near the visitor (garden, fence) – few at a time
    let want = null;
    const soon = S.skat || S.skatSoon;
    if (soon && dS < 170 && DSCHOOL.built) want = 'school';
    else if (S.fire && dF < 260 && DFIRE.built) want = 'fire';
    const show = want === 'school' ? (S.skat ? 'school' : null) : want;
    const need = S.need;
    need.clear();
    if (want) for (const k of DPEOPLE.KEYS) need.add(k);
    else if (S.lifeT <= 0) {
      S.lifeT = 0.5;
      const H = DLIFE.homes(),
        t = window.CLOCK ? window.CLOCK.t : 0;
      if (H)
        for (const k of DPEOPLE.KEYS) {
          const h = H[k];
          S.life[k] = h ? DLIFE.routine(k, t) : null;
          if (S.life[k] && Math.hypot(mx - h.spot[0], my - h.spot[1]) < 140) S.near[k] = true;
          else S.near[k] = false;
        }
    }
    S.lifeT -= dt;
    if (!want) {
      for (const k of DPEOPLE.KEYS) if (S.life[k] && S.near[k]) need.add(k);
      for (const k in S.carNeed) if (S.t - S.carNeed[k] < 4) need.add(k);
    }
    const miss = [...need].filter(k => !DPEOPLE.figs[k]);
    if (miss.length && !DPEOPLE.busy) DPEOPLE.ensure(miss).then(() => (S.placed = null));
    for (const k of Object.keys(DPEOPLE.figs)) {
      // figures nobody needs go after a while (memory on the phone)
      if (need.has(k)) S.idle[k] = 0;
      else if ((S.idle[k] = (S.idle[k] || 0) + dt) > 25) DPEOPLE.drop(k);
    }
    if (DPEOPLE.fresh) {
      DPEOPLE.fresh = false; // a figure has just arrived: its place now, not only after the last one
      if (show) S.placed = null;
    }
    if (show !== S.placed || (show && acc > 2)) {
      if (acc > 2) acc = 0;
      if (show === 'school') placeSchool();
      else if (show === 'fire') placeFire();
      if (S.placed && !show) for (const k of Object.keys(DPEOPLE.figs)) DPEOPLE.hide(k); // the evening is over: everybody home
      if (show) for (const k in S.out) S.out[k] = 'in';
      S.placed = show;
      markDirty();
    }
    if (!show) lifeTick(mx, my);
    // the cars: built when one comes near the village, driving by the timetable
    if (!DCARS.ready && Math.hypot(mx - 222, my + 108) < 450 && DLIFE.homes()) {
      DCARS.build();
      DLIFE.beds(); // the front-garden beds go with them
    }
    if (DCARS.ready) DCARS.tick(dt, window.CLOCK ? window.CLOCK.t : 0, mx, my, CARHOOKS);
    if (DPEOPLE.tick(dt) && (dS < 40 || dF < 40)) markDirty();
    // talk: the panel closes when one walks away; table talk while one is there
    if (UI.cur) {
      const h = DPEOPLE.head(UI.cur);
      if (!h || Math.hypot(h[0] - P.x, h[1] - P.y) > 4.5 || !DPEOPLE.figs[UI.cur] || !DPEOPLE.figs[UI.cur].g.visible)
        UI.close();
    }
    const where = show === 'school' && inside ? 'school' : show === 'fire' && dF < 14 ? 'fire' : null;
    talkTick(dt, where);
  }
  (window.TICKS || (window.TICKS = [])).push(tick);
  // the owner walks from the door to the car before it leaves, and back into the house when it is home again (if the figure is there)
  const CARHOOKS = {
    // the owner's figure is wanted (true when it is there)
    want(k) {
      S.carNeed[k] = S.t;
      return !!DPEOPLE.figs[k];
    },
    // out of the door to the driver's door; returns how long the car waits for her or him (s)
    board(k, p) {
      const h = DLIFE.homes() && DLIFE.homes()[k],
        f = DPEOPLE.figs[k];
      if (!h || !f || S.placed) return 0;
      DPEOPLE.place(k, h.step[0], h.step[1], KERN.terrain(h.step[0], h.step[1]), 0, 'stand');
      S.out[k] = 'car';
      DPEOPLE.walkTo(k, p[0], p[1], 1.1, zAt, () => {
        DPEOPLE.hide(k);
        S.out[k] = 'in';
      });
      return Math.hypot(p[0] - h.step[0], p[1] - h.step[1]) / 1.1 + 2;
    },
    // home again: from the driver's door into the house
    alight(k, p) {
      const h = DLIFE.homes() && DLIFE.homes()[k],
        f = DPEOPLE.figs[k];
      if (!h || !f || S.placed) return;
      DPEOPLE.place(k, p[0], p[1], KERN.terrain(p[0], p[1]), 0, 'stand');
      S.out[k] = 'car';
      DPEOPLE.walkTo(k, h.step[0], h.step[1], 1.0, zAt, () => {
        DPEOPLE.hide(k);
        S.out[k] = 'in';
      });
    },
  };
  // ---- the everyday: out of the door, a few steps to the bed, work, back in; standing up to talk ----
  const zAt = (x, y) => KERN.terrain(x, y);
  function lifeTick(mx, my) {
    const H = DLIFE.homes();
    if (!H) return;
    for (const k of DPEOPLE.KEYS) {
      const f = DPEOPLE.figs[k],
        h = H[k],
        r = S.life[k];
      if (!f || !h) {
        if (!r) S.out[k] = 'in';
        continue;
      }
      const st = S.out[k] || 'in';
      if (st === 'car') continue; // on the way to or from the car (CARHOOKS)
      if (UI.cur === k) {
        // talking: standing, turned to the visitor
        if (f.g.visible && f.at && S.talkTo !== k) {
          S.talkTo = k;
          DPEOPLE.place(k, f.at.x, f.at.y, f.at.z, (Math.atan2(P.x - f.at.x, P.y - f.at.y) * 180) / Math.PI, 'stand');
        }
        continue;
      }
      if (S.talkTo === k) {
        S.talkTo = null;
        if (st === 'there' && r) {
          const w = DLIFE.where(k, r);
          if (w) DPEOPLE.place(k, w.x, w.y, w.z, w.hd, r.mode);
        }
      }
      if (r) {
        const w = DLIFE.where(k, r);
        if (!w) continue;
        if (st === 'in' || st === 'back' || !f.g.visible) {
          // out of the house: from the doorstep to the spot
          DPEOPLE.place(k, h.step[0], h.step[1], zAt(h.step[0], h.step[1]), 0, 'stand');
          DPEOPLE.walkTo(k, w.x, w.y, 0.9, zAt, () => {
            DPEOPLE.place(k, w.x, w.y, w.z, w.hd, r.mode);
            S.out[k] = 'there';
          });
          S.out[k] = 'going';
        }
        if (r.fence && st === 'there') f.walker.talking = Math.floor(S.t / 3.2) % 2 === (k === 'heike' ? 0 : 1);
      } else if (st === 'going' || st === 'there') {
        f.walker.talking = false;
        DPEOPLE.walkTo(k, h.step[0], h.step[1], 0.9, zAt, () => {
          DPEOPLE.hide(k);
          S.out[k] = 'in';
        });
        S.out[k] = 'back';
      }
    }
    void mx;
    void my;
  }
  // ---- test hooks and the start with ?dorf=freitag | ?dorf=feuer ----
  function putPlayer(x, y, yaw, z) {
    if (PLAY.seated && PLAY.seated()) PLAY.stand(true);
    P.mode = 'walk';
    document.body.dataset.mode = 'walk';
    P.x = x;
    P.y = y;
    P.feet = floorAt(x, y, (z ?? KERN.terrain(x, y)) + 0.3);
    P.vz = 0;
    P.yaw = P.body = yaw;
    P.pitch = 0;
    P.air = false;
    P.stance = 'stand';
    CAM3.cur = Math.min(CAM3.cur, 1.4);
    markDirty(true);
  }
  function atDoor() {
    const sc = school();
    if (!sc) return false;
    if (!DSCHOOL.built) DSCHOOL.build();
    const [x, y] = DSCHOOL.toW(DSCHOOL.F.du, -2.6);
    putPlayer(x, y, DSCHOOL.az(0, 1), DSCHOOL.F.zF - 0.3);
    return true;
  }
  function enter() {
    if (!DSCHOOL.built) DSCHOOL.build();
    const [x, y] = DSCHOOL.toW(DSCHOOL.F.du + 0.3, 1.6);
    putPlayer(x, y, DSCHOOL.az(1, 0.6), DSCHOOL.F.zF);
    return true;
  }
  function toFire() {
    if (!DFIRE.built) DFIRE.build();
    const [x, y] = DFIRE.at;
    putPlayer(x - 4.5, y - 5.5, (Math.atan2(4.5, 5.5) * 180) / Math.PI);
    return true;
  }
  const state = () => ({
    step: ST.step,
    visits: ST.visits,
    played: ST.played,
    skat: S.skat,
    fire: S.fire,
    cal: { wd: DCAL.wd(), skat: DCAL.on('skat'), fire: DCAL.on('fire'), date: DCAL.dateOf(CLOCK_T()) },
    school: {
      built: DSCHOOL.built,
      err: DSCHOOL.err,
      cut: !!DSCHOOL.cut,
      open: +DSCHOOL.open.toFixed(2),
      lit: DSCHOOL.lit,
      inside: S.inside,
    },
    fireBuilt: DFIRE.built,
    fireK: +DFIRE.k.toFixed(2),
    figs: Object.keys(DPEOPLE.figs),
    shown: Object.keys(DPEOPLE.figs).filter(k => DPEOPLE.figs[k].g.visible),
    loads: DPEOPLE.loads,
    drops: DPEOPLE.drops,
    requests: DPEOPLE.requests.slice(),
    figErr: DPEOPLE.err,
    cars: DCARS.ready ? DCARS.state() : null,
    homes: DLIFE.homes() ? Object.keys(DLIFE.homes()).length : 0,
    homesErr: DLIFE.err,
    talk: UI.cur,
    sub: UI.sub.hidden ? null : UI.sub.textContent,
  });
  whenLoaded(() => {
    const q = QS.get('dorf');
    if (!q) return;
    setTimeout(() => {
      try {
        if (/^(feuer|fire)$/.test(q)) {
          DCAL.jump('fire');
          toFire();
        } else {
          DCAL.jump('skat');
          atDoor();
        }
      } catch (e) {
        console.warn('dorf start', e);
      }
    }, 1500);
  });
  return {
    ST,
    S,
    UI,
    game,
    state,
    jump: DCAL.jump,
    atDoor,
    enter,
    toFire,
    sitDown,
    play,
    setStep,
    cal: DCAL,
    school: DSCHOOL,
    fire: DFIRE,
    people: DPEOPLE,
  };
})();
window.DORF = DORF;
