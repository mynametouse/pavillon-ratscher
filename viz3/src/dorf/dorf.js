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
export const DORF = (() => {
  const T = DTEXT,
    NAME = k => (T.P[k] ? T.P[k].name : k);
  // ---- the saved task ----
  const KEY = 'pav-dorf-v1',
    STEPS = ['none', 'invite', 'greet', 'sit', 'story', 'play', 'fire', 'done'];
  const ST = { v: 1, step: 'none', visits: 0, played: 0, best: 0, fires: 0 };
  {
    const s = SAVE.get(KEY);
    if (s && typeof s === 'object') {
      if (STEPS.includes(s.step)) ST.step = s.step;
      for (const k of ['visits', 'played', 'best', 'fires'])
        if (Number.isFinite(s[k])) ST[k] = Math.max(0, Math.min(1e6, s[k] | 0));
    }
  }
  const save = () => SAVE.set(KEY, ST);
  const stepI = s => STEPS.indexOf(s);
  function setStep(s, quiet) {
    if (stepI(s) <= stepI(ST.step)) return;
    ST.step = s;
    save();
    UI.task();
    if (!quiet && T.TASK.steps[s]) PLAY.think((s === 'done' ? 'Geschafft: ' : 'Aufgabe: ') + T.TASK.steps[s], 6500);
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
  };
  const school = () => {
    if (S.sc) return S.sc;
    const b = window.VILLAGE && VILLAGE.byId && VILLAGE.byId.get(215);
    if (b) S.sc = [b.cx, b.cy];
    return S.sc;
  };
  const camXY = () => [cam.position.x, -cam.position.z];
  const dist = (a, b) => (a && b ? Math.hypot(a[0] - b[0], a[1] - b[1]) : 1e9);
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
        on = stepI(s) >= 1 && s !== 'done';
      task.hidden = !on;
      if (on) task.innerHTML = '<b>' + T.TASK.title + '</b> – ' + T.TASK.steps[s];
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
      for (const [id, [label]] of Object.entries(p.topics)) button(label, () => ask(k, id));
      button('Tschüss', () => U.close(), 'bye');
    }
    function ask(k, id) {
      const lines = T.P[k].topics[id].slice(1),
        n = (U.n[k + id] = (U.n[k + id] || 0) + 1);
      say.textContent = lines[(n - 1) % lines.length];
      talkFig(k, say.textContent);
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
      role.textContent = p.age + ' · ' + p.role;
      el.hidden = false;
      U.task();
      const g = p.greet,
        n = (U.n[k] = (U.n[k] || 0) + 1);
      say.textContent = g[(n - 1) % g.length];
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
          setTimeout(() => UI.open('katrin'), 900);
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
  const FIREPEOPLE = ['wolfgang', 'uwe', 'manfred', 'katrin', 'gerhard', 'ingrid'];
  function placeSchool() {
    for (const k of DPEOPLE.KEYS) {
      const st = DSCHOOL.seats[k];
      if (!st || !DPEOPLE.figs[k]) continue;
      const back = st.stand ? 0 : 0.07,
        [x, y, z] = DSCHOOL.at(st.x - Math.cos(st.a) * back, st.y - Math.sin(st.a) * back);
      DPEOPLE.place(k, x, y, z, DSCHOOL.az(Math.cos(st.a), Math.sin(st.a)), st.stand ? 'stand' : 'sit', st.top || 0.47);
    }
  }
  function placeFire() {
    const sp = DFIRE.spots(),
      stand = sp.filter(s => s.stand),
      sit = sp.filter(s => s.sit);
    FIREPEOPLE.forEach((k, i) => {
      if (!DPEOPLE.figs[k]) return;
      const s = i < 4 ? stand[i] : sit[i - 4];
      if (!s) return;
      const z = KERN.terrain(s.x, s.y);
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
  PLAY.act({
    id: 'dorf:notice',
    r: 1.6,
    prio: 0.1,
    label: () => (DSCHOOL.built && DSCHOOL.noticeAt ? 'Aushang lesen' : null),
    pos: () => [DSCHOOL.noticeAt[0], DSCHOOL.noticeAt[1], DSCHOOL.F.zF + 1.2],
    run: () => {
      toast(T.NOTICE.replace(/\n+/g, ' · '), 9000);
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
      const st = DSCHOOL.seats.player,
        [x, y, z] = DSCHOOL.at(st.x, st.y);
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
          setTimeout(() => play(T.STORY, true), 1200);
        }
      },
    });
  }
  // ---- per frame ----
  let acc = 0;
  function tick(dt) {
    dt = Math.min(dt, 0.25);
    acc += dt;
    S.t += dt;
    const sc = school();
    if (!sc) return;
    const me = P.mode === 'walk' ? [P.x, P.y] : camXY(),
      dS = dist(me, sc),
      dF = dist(me, DFIRE.at);
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
    const skatCal = DCAL.on('skat'),
      fireCal = DCAL.on('fire');
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
    // who is needed where (the figures load shortly before an evening, only near it)
    let want = null;
    const soon = S.skat || DCAL.until('skat') < 40;
    if (soon && dS < 170 && DSCHOOL.built) want = 'school';
    else if (S.fire && dF < 260 && DFIRE.built) want = 'fire';
    if (want) {
      S.dropT = 0;
      const keys = want === 'school' ? DPEOPLE.KEYS : FIREPEOPLE;
      if (keys.some(k => !DPEOPLE.figs[k]) && !DPEOPLE.busy) DPEOPLE.ensure(keys).then(() => (S.placed = null));
    } else if (Object.keys(DPEOPLE.figs).length) {
      S.dropT += dt;
      if (S.dropT > 25) DPEOPLE.dropAll();
    }
    const show = want === 'school' ? (S.skat ? 'school' : null) : want;
    if (show !== S.placed || (show && acc > 2)) {
      if (acc > 2) acc = 0;
      if (show === 'school') placeSchool();
      else if (show === 'fire') placeFire();
      for (const k of Object.keys(DPEOPLE.figs))
        if (!show || (show === 'fire' && !FIREPEOPLE.includes(k))) DPEOPLE.hide(k);
      S.placed = show;
      markDirty();
    }
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
