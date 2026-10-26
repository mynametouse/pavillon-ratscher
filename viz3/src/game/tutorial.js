// ===================== the introduction for beginners (TUT) – Falko, 26.10.2026: „Überlege dir ein Konzept für ein Tutorial“ =====================
// A card at the top of the picture leads through the first minutes, one step at a time, and notices by itself when a step is done:
// in (from the model to the garden) – walk – look around – the menu – go somewhere quickly (Hingehen → Hubert) – talk to him – the talk –
// the tasks – done. Each step can be skipped, the whole introduction closed; the text fits the device (keys and mouse, or touch). What is
// meant lights up (class tut-hi). Shown by itself once, to someone new (not under test automation, not with ?notut); always again from
// the menu (start page „Neu hier?“ until done, Hilfe → Einführung). Saved: pav-tut-v1 { seen, done, closed }. Concept: docs/features/tutorial.md.
import { $, COARSE } from '../core/head.js';
import { SAVE } from '../core/save.js';
import { KERN } from '../core/kern.js';
import { LOAD } from '../core/assets.js';
import { P } from './walkable.js';
import { NPCS, NPCUI } from '../npc/npc.js';
import { HUD } from './hud.js';

export const TUT = (() => {
  const KS = SAVE.key('pav-tut-v1', {
    owner: 'tut',
    def: { seen: false, done: false, closed: false },
    check: s => !!s && typeof s === 'object',
  });
  const st = Object.assign({ seen: false, done: false, closed: false }, SAVE.get(KS));
  const keep = () => SAVE.set(KS, st);
  const shown = el => !!el && !el.hidden && el.getClientRects().length > 0;
  const kbd = k => `<kbd>${k}</kbd>`;
  // the last place chosen in the menu, the talk seen open
  let spot = null;
  KERN.on('spot', d => (spot = d && d.name));
  const hubert = () => NPCS.hubert;
  const away = () => !!(hubert() && hubert().away);
  // ---------------- the steps: title, text (now – it may change while one waits), what lights up, done? ----------------
  // a step may have begin(c) (c: its own memory), skip() (nothing to do here), done(c), next (a label: the step is passed by a button)
  const STEPS = [
    {
      id: 'hinein',
      title: 'Hineingehen',
      skip: () => P.mode === 'walk',
      text: () =>
        P.mode === 'top'
          ? 'Du siehst den Garten von oben. Öffne das Menü (☰ oben rechts) → <b>Hingehen</b> → <b>Garten</b>.'
          : `Du schaust gerade von außen auf das Modell. ${COARSE ? 'Tippe' : 'Klicke'} unten rechts auf <b>Losgehen</b> – dann stehst du im Garten.`,
      hi: () => [P.mode === 'top' ? $('menubtn') : document.querySelector('#orbithud .ogo')],
      done: () => P.mode === 'walk',
    },
    {
      id: 'gehen',
      title: 'Gehen',
      begin: c => {
        c.x = P.x;
        c.y = P.y;
      },
      text: () =>
        COARSE
          ? 'Leg den Daumen auf den <b>Kreis links unten</b> und schieb ihn in die Richtung, in die du gehen willst.'
          : `Geh ein paar Schritte – mit ${kbd('W')}${kbd('A')}${kbd('S')}${kbd('D')} oder den Pfeiltasten. Mit ${kbd('Shift')} rennst du.`,
      hi: () => (COARSE ? [$('joy')] : []),
      done: c => P.mode === 'walk' && Math.hypot(P.x - c.x, P.y - c.y) > 3,
    },
    {
      id: 'umschauen',
      title: 'Umschauen',
      begin: c => {
        c.last = P.yaw;
        c.turned = 0;
      },
      text: () =>
        COARSE
          ? 'Wisch mit einem Finger über das Bild – so schaust du dich um. Mit zwei Fingern holst du die Kamera näher heran.'
          : HUD.LOCK.want
            ? `Klick einmal ins Bild – dann dreht die Maus deinen Blick. Mit ${kbd('Esc')} bekommst du die Maus wieder frei.`
            : 'Halte die Maustaste gedrückt und zieh – so schaust du dich um.',
      done: c => {
        const d = ((((P.yaw - c.last) % 360) + 540) % 360) - 180;
        c.turned += Math.abs(d);
        c.last = P.yaw;
        return c.turned > 70;
      },
    },
    {
      id: 'menue',
      title: 'Das Menü',
      text: () =>
        `Oben rechts ist das <b>Menü</b> (☰${COARSE ? '' : ', Taste ' + kbd('M')}). Dort findest du alles: Orte, Aufgaben, Einstellungen und Hilfe. Öffne es jetzt.`,
      hi: () => [$('menubtn')],
      done: () => HUD.open,
    },
    {
      id: 'hingehen',
      title: 'Schnell hingehen',
      begin: () => (spot = null),
      text: () => {
        const pg = HUD.page;
        if (!pg) return 'Öffne das Menü wieder (☰ oben rechts).';
        if (pg === 'start')
          return `Unter <b>Hingehen</b> stehen alle Orte – vom Dachgarten bis Schleusingen. ${COARSE ? 'Tippe' : 'Klicke'} darauf.`;
        if (pg === 'orte') return `${COARSE ? 'Tippe' : 'Klicke'} auf <b>Hubert</b> – er ist dein Nachbar.`;
        return `${COARSE ? 'Tippe' : 'Klicke'} oben links auf ‹ – zurück zur Übersicht – und dann auf <b>Hingehen</b>.`;
      },
      hi: () => {
        const pg = HUD.page;
        if (!pg) return [$('menubtn')];
        if (pg === 'start') return [document.querySelector('#menu [data-go="orte"]')];
        if (pg === 'orte') return [document.querySelector('#menu [data-spot="hubert"]')];
        return [$('mback')];
      },
      done: () => spot === 'hubert',
    },
    {
      id: 'sprechen',
      title: 'Mit Hubert reden',
      skip: () => !hubert(),
      text: () =>
        away()
          ? 'Hubert ist gerade zu Hause – nachts von 22 bis 6 Uhr. Besuch ihn tagsüber: An der <b>Uhr oben rechts</b> kannst du die Zeit vorstellen.'
          : `Das ist Hubert. Geh nah an ihn heran, bis unten <b>Sprechen</b> erscheint – dann ${COARSE ? 'tippe darauf' : 'klick darauf oder drück ' + kbd('E')}.`,
      hi: () => [$('talkbtn'), /Sprech/.test(($('doorbtn') || {}).textContent || '') ? $('doorbtn') : null],
      next: () => (away() ? 'Weiter' : ''),
      done: () => !!NPCUI.cur(),
    },
    {
      id: 'gespraech',
      title: 'Im Gespräch',
      skip: () => !NPCUI.cur(),
      text: () =>
        (window.KI && window.KI.ready
          ? 'Sag einfach etwas – Hubert hört zu und antwortet. Oder schreib unten ins Feld.'
          : `${COARSE ? 'Tippe' : 'Klicke'} auf ein Thema – Hubert antwortet. Frag ihn ruhig, ob er Hilfe braucht.`) +
        ' Mit <b>Tschüss</b> oder × beendest du das Gespräch.',
      hi: () => [$('np-topics')],
      done: () => !NPCUI.cur(),
    },
    {
      id: 'aufgaben',
      title: 'Aufgaben',
      text: () =>
        `Was die Nachbarn sich wünschen, steht unter <b>Aufgaben</b>: im Menü${COARSE ? '' : ' oder mit ' + kbd('J')}. Die Aufgabe, an der du gerade bist, steht oben links – antippen zeigt alle. Öffne jetzt die Aufgaben.`,
      hi: () => (HUD.open ? [$('questbtn')] : [$('qtrack'), $('menubtn')]),
      done: () => shown($('quests')),
    },
    {
      id: 'fertig',
      title: 'Geschafft!',
      text: () =>
        'Mehr findest du im Menü: <b>Gestalten</b> – Möbel, Garten und Fassade planen; <b>Erleben</b> – besondere Abende im Dorf; ' +
        '<b>Einstellungen</b> – Ton, Spielfigur und KI-Gespräche. Die Einführung gibt es jederzeit wieder unter Menü → <b>Hilfe</b>.',
      next: () => 'Los geht’s',
      done: () => false,
    },
  ];
  // ---------------- the card ----------------
  const host = $('p-3d') || document.body;
  const el = document.createElement('aside');
  el.id = 'tutcard';
  el.hidden = true;
  el.setAttribute('role', 'dialog');
  el.setAttribute('aria-labelledby', 'tut-h');
  el.innerHTML =
    '<div class="tut-top"><span class="tut-n"></span><button type="button" class="x" data-tut="close" aria-label="Einführung beenden">×</button></div>' +
    '<h3 id="tut-h"></h3><p class="tut-t" aria-live="polite"></p>' +
    '<div class="tut-b"><button type="button" class="tut-skip" data-tut="skip"></button><button type="button" class="tut-go" data-tut="go"></button></div>';
  host.appendChild(el);
  const nEl = el.querySelector('.tut-n'),
    hEl = el.querySelector('h3'),
    tEl = el.querySelector('.tut-t'),
    sk = el.querySelector('.tut-skip'),
    go = el.querySelector('.tut-go');
  const S = { on: false, i: -1, c: {}, lit: [], timer: 0, welcome: false, t: '' };
  function light(list) {
    const now = (list || []).filter(shown);
    for (const e of S.lit) if (!now.includes(e)) e.classList.remove('tut-hi');
    for (const e of now) e.classList.add('tut-hi');
    S.lit = now;
  }
  function draw() {
    if (S.welcome) return;
    const s = STEPS[S.i];
    if (!s) return;
    nEl.textContent = `Einführung · ${S.i + 1} von ${STEPS.length}`;
    if (hEl.textContent !== s.title) hEl.textContent = s.title;
    const t = s.text(S.c);
    if (S.t !== t) tEl.innerHTML = S.t = t;
    const nx = s.next ? s.next(S.c) : '';
    go.textContent = nx;
    go.hidden = !nx;
    sk.textContent = 'Überspringen';
    sk.hidden = s.id === 'fertig';
    light(s.hi ? s.hi(S.c) : []);
  }
  function to(i) {
    // steps with nothing to do here are passed
    while (i < STEPS.length && STEPS[i].skip && STEPS[i].skip()) i++;
    if (i >= STEPS.length) return finish();
    S.i = i;
    S.c = {};
    if (STEPS[i].begin) STEPS[i].begin(S.c);
    KERN.emit('tut:step', { id: STEPS[i].id });
    draw();
  }
  function check() {
    if (!S.on || S.welcome) return;
    const s = STEPS[S.i];
    if (s && s.done(S.c)) to(S.i + 1);
    else draw();
  }
  function show(v) {
    S.on = v;
    el.hidden = !v;
    document.body.dataset.tut = v ? '1' : '';
    clearInterval(S.timer);
    if (v) {
      S.timer = setInterval(check, 250);
      // a „Neu: …“ hint showing now goes (audio/audio.js holds back the next ones while the card is there)
      const t = $('toast');
      if (t && !t.hidden) t.hidden = true;
    } else light([]);
    sync();
  }
  // the welcome: what this is, and the choice
  function welcome() {
    S.welcome = true;
    st.seen = true;
    keep();
    nEl.textContent = 'Willkommen';
    hEl.textContent = 'Willkommen im Garten bei Ratscher!';
    S.t = '';
    tEl.innerHTML =
      'Hier gehst du durch Falkos Garten mit dem geplanten Pavillon, redest mit den Nachbarn Hubert und Ronald, erledigst Aufgaben und ' +
      'besuchst das Dorf. Eine kurze Einführung zeigt dir in etwa zwei Minuten, wie alles geht.';
    sk.textContent = 'Selbst erkunden';
    sk.hidden = false;
    go.textContent = 'Einführung starten';
    go.hidden = false;
    show(true);
    light([]);
  }
  function start() {
    if (HUD.open) HUD.setMenu(false);
    S.welcome = false;
    st.seen = true;
    keep();
    show(true);
    to(0);
  }
  function finish() {
    st.done = true;
    keep();
    KERN.emit('tut:done', {});
    stop();
  }
  function stop() {
    S.welcome = false;
    S.i = -1;
    show(false);
  }
  el.addEventListener('click', e => {
    const b = e.target instanceof Element ? e.target.closest('[data-tut]') : null;
    if (!b) return;
    const k = b.dataset.tut;
    if (k === 'close') {
      st.closed = true;
      keep();
      return stop();
    }
    if (S.welcome) {
      if (k === 'go') return start();
      st.closed = false;
      keep();
      return stop();
    }
    const s = STEPS[S.i];
    if (k === 'go' && s && s.id === 'fertig') return finish();
    to(S.i + 1);
  });
  // the menu: „Neu hier?“ on the start page until done or closed; Hilfe → Einführung always
  function sync() {
    const b = $('tutbtn');
    if (b) b.hidden = st.done || st.closed || S.on;
  }
  for (const id of ['tutbtn', 'tutbtn2']) $(id)?.addEventListener('click', start);
  sync();
  // by itself once, for someone new – when the model stands (not under test automation, not with ?notut)
  const auto = !st.seen && !st.done && !navigator.webdriver && !/[?&]notut\b/.test(location.search);
  if (auto) {
    const wait = setInterval(() => {
      if (!LOAD.ready) return;
      clearInterval(wait);
      setTimeout(() => !S.on && welcome(), 1200);
    }, 500);
  }
  return {
    start,
    stop,
    welcome,
    // tests: the step now, the state saved
    get step() {
      return S.on ? (S.welcome ? 'willkommen' : STEPS[S.i] && STEPS[S.i].id) : null;
    },
    get state() {
      return Object.assign({}, st);
    },
    check,
    steps: STEPS.map(s => s.id),
  };
})();
window.TUT = TUT;
