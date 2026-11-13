// ===================== feat/workshop: stand-ins for ZKCHRONIK and ZKREGIE until the real ones land (WSMOCK) =====================
// The Workshop mode reads only the contracts of zeitreise-gemeinsam.md (ZKREGIE.state()/on(), ZKCHRONIK.events()/kpi()/CHAPTERS …). While
// window.ZKREGIE / window.ZKCHRONIK do not exist, these fake years, events and numbers keep the whole flow testable. They are never used once
// the real modules are there (zk_workshop.js asks `window.ZKREGIE || WSMOCK.regie`). No camera, no world: only time and data.
export const WSMOCK = (() => {
  const WORLDS = {
    allein: {
      id: 'allein',
      title: 'Allein im Sturm',
      klima: 'heftig',
      handeln: 'jeder',
      claim: 'Jeder für sich – und das Klima wird heftig.',
      color: '#d4875a',
    },
    gewappnet: {
      id: 'gewappnet',
      title: 'Gewappnet',
      klima: 'heftig',
      handeln: 'gemeinsam',
      claim: 'Gemeinsam vorbereitet – und das Klima wird heftig.',
      color: '#7fb4d6',
    },
    rueckenwind: {
      id: 'rueckenwind',
      title: 'Rückenwind',
      klima: 'mild',
      handeln: 'gemeinsam',
      stub: true,
      color: '#9bc47a',
    },
    glueck: { id: 'glueck', title: 'Glück gehabt', klima: 'mild', handeln: 'jeder', stub: true, color: '#c9b66a' },
  };
  const CHAPTERS = [
    {
      id: 'wald',
      title: 'Wald',
      from: 2026,
      to: 2050,
      places: ['hang', 'waldrand'],
      questions: ['Wer pflanzt, wenn der Käfer kommt – und wer zahlt?', 'Was soll aus den kahlen Hängen werden?'],
    },
    {
      id: 'wasser',
      title: 'Wasser',
      from: 2026,
      to: 2050,
      places: ['bruecke', 'strasse'],
      questions: ['Wer hilft nachts, wenn das Wasser steigt?'],
    },
    {
      id: 'energie',
      title: 'Energie',
      from: 2026,
      to: 2060,
      places: ['heizhaus', 'schule'],
      questions: ['Was brauchen wir, damit die Schule im Blackout leuchtet?'],
    },
  ];
  const EV = [
    {
      id: 'kaefer',
      w: 'allein',
      y: 2031,
      chapter: 'wald',
      kind: 'ereignis',
      title: 'Der Käfersommer',
      text: 'Die Fichten am Hang werden rotbraun.',
      lines: [{ id: 'm1', who: 'Manfred', text: 'So schnell habe ich die Hänge noch nie braun werden sehen.' }],
      halt: 6,
    },
    {
      id: 'regen',
      w: 'allein',
      y: 2046,
      chapter: 'wasser',
      kind: 'stresstest',
      title: 'Die Starkregennacht',
      text: 'Sirenen, steigendes Wasser.',
      lines: [{ id: 'k1', who: 'Katrin', text: 'Das Wasser steht schon an der Brücke!' }],
      halt: 8,
    },
    {
      id: 'blackout',
      w: 'allein',
      y: 2056,
      chapter: 'energie',
      kind: 'stresstest',
      title: 'Die Blackout-Nacht',
      text: 'Die Region liegt im Dunkeln.',
      lines: [{ id: 'i1', who: 'Ingrid', text: 'Nur bei Jens brennt noch Licht, er hat eine Batterie.' }],
      halt: 8,
    },
  ];
  const EVT = e => ({ ...e, t: e.y + 0.5 / 12, dur: 4 });
  const chronik = {
    mock: true,
    WORLDS,
    PAIRS: [['allein', 'gewappnet']],
    SPAN: [2026, 2060],
    CHAPTERS,
    events: w => EV.map(e => ({ ...EVT(e), w })),
    lines: () => EV.flatMap(e => e.lines),
    kpi: (w, ch) => [
      {
        id: 'k1',
        label: ch === 'wald' ? 'Fichtenfläche übrig' : ch === 'wasser' ? 'Schaden pro Haus' : 'Strom aus der Region',
        value: w === 'allein' ? 18 : 41,
        unit: ch === 'wasser' ? 'T€' : '%',
        range: [10, 55],
        src: [['Beispielwert (Demo)', '']],
        why: 'Demo',
      },
      {
        id: 'k2',
        label: 'Gemeinsam beschlossen',
        value: w === 'allein' ? 0 : 3,
        unit: 'Projekte',
        range: [0, 5],
        src: [],
        why: 'Demo',
      },
    ],
  };
  // ---- the regie stand-in: time runs by itself (one year in ~2.5 s) through each chapter's own years; events halt it; each chapter ends with a card.
  // It reads the real chronicle when that exists (window.ZKCHRONIK), so the workshop is tested against real data before the real regie lands.
  const CH = () => window.ZKCHRONIK || chronik;
  const R = {
    on: false,
    pair: ['allein', 'gewappnet'],
    split: true,
    chapter: null,
    y: 2026,
    ev: null,
    phase: 0,
    playing: false,
    place: 'anger',
    card: null,
    speed: 1,
  };
  const subs = new Set();
  const emit = e => subs.forEach(f => f(e));
  let timer = 0,
    halt = 0,
    seen = new Set();
  const chap = () => CH().CHAPTERS.find(c => c.id === R.chapter) || CH().CHAPTERS[0];
  function enterChapter(id) {
    R.chapter = id;
    R.y = chap().from;
    R.ev = null;
    R.card = null;
    halt = 0;
    seen = new Set();
    emit({ type: 'chapter', chapter: id });
  }
  function tick() {
    if (!R.on || !R.playing || R.card) return;
    if (halt > 0) {
      halt -= 0.25 * R.speed;
      R.phase = Math.min(1, R.phase + 0.25 / 8);
      if (halt <= 0) R.ev = null;
      return emit({ type: 'tick', y: R.y });
    }
    R.y += 0.1 * R.speed;
    const c = chap(),
      e = CH()
        .events(R.pair[0])
        .find(q => q.chapter === c.id && !seen.has(q.id) && q.halt > 0 && q.t <= R.y);
    if (e) {
      seen.add(e.id);
      R.y = Math.floor(e.y);
      R.ev = e;
      R.phase = 0;
      halt = Math.min(e.halt, 8);
      R.place = e.place || 'anger';
      emit({ type: 'event', ev: e });
      (e.lines || []).forEach(l =>
        emit({ type: 'line', id: l.id, who: l.who.charAt(0).toUpperCase() + l.who.slice(1), text: l.text })
      );
      return;
    }
    if (R.y >= c.to) {
      R.y = c.to;
      R.card = { chapter: c.id };
      R.playing = false;
      emit({ type: 'card', chapter: c.id });
    }
    emit({ type: 'tick', y: R.y });
  }
  const idx = () => CH().CHAPTERS.findIndex(c => c.id === R.chapter);
  const regie = {
    mock: true,
    start(o = {}) {
      Object.assign(R, {
        on: true,
        pair: o.pair || ['allein', 'gewappnet'],
        split: o.split !== false,
        playing: true,
        phase: 0,
      });
      clearInterval(timer);
      timer = setInterval(tick, 250);
      enterChapter(o.chapter || CH().CHAPTERS[0].id);
    },
    play() {
      R.card = null;
      R.playing = true;
    },
    pause() {
      R.playing = false;
    },
    toggle() {
      R.playing ? regie.pause() : regie.play();
    },
    next() {
      if (R.card) {
        const n = CH().CHAPTERS[idx() + 1];
        if (n) {
          enterChapter(n.id);
          R.playing = true;
        } else {
          R.card = null;
          R.playing = false;
          emit({ type: 'end' });
        }
      } else if (!R.playing) R.playing = true;
      else {
        halt = 0;
        R.ev = null;
        R.y = chap().to - 0.01;
      }
    },
    prev() {
      const c = chap();
      if (R.y - c.from > 1) enterChapter(c.id);
      else if (idx() > 0) enterChapter(CH().CHAPTERS[idx() - 1].id);
    },
    seek(y, chapter) {
      if (chapter && chapter !== R.chapter) enterChapter(chapter);
      R.card = null;
      R.ev = null;
      halt = 0;
      R.y = y;
    },
    speed(s) {
      R.speed = s;
    },
    stop() {
      R.on = false;
      R.playing = false;
      R.card = null;
      clearInterval(timer);
    },
    state: () => ({ ...R }),
    on(fn) {
      subs.add(fn);
      return () => subs.delete(fn);
    },
  };
  return { chronik, regie };
})();
