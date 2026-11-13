// ===================== feat/workshop: stand-ins for ZKCHRONIK and ZKREGIE until the real ones land (WSMOCK) =====================
// The Workshop mode reads only the contracts of zeitreise-gemeinsam.md (ZKREGIE.state()/on(), ZKCHRONIK.events()/kpi()/CHAPTERS …). While
// window.ZKREGIE / window.ZKCHRONIK do not exist, these fake years, events and numbers keep the whole flow testable. They are never used once
// the real modules are there (zk_workshop.js asks `window.ZKREGIE || WSMOCK.regie`). No camera, no world: only time and data.
export const WSMOCK = (() => {
  const WORLDS = {
    allein: { id: 'allein', title: 'Allein im Sturm', klima: 'heftig', handeln: 'jeder', claim: 'Jeder für sich – und das Klima wird heftig.', color: '#d4875a' },
    gewappnet: { id: 'gewappnet', title: 'Gewappnet', klima: 'heftig', handeln: 'gemeinsam', claim: 'Gemeinsam vorbereitet – und das Klima wird heftig.', color: '#7fb4d6' },
    rueckenwind: { id: 'rueckenwind', title: 'Rückenwind', klima: 'mild', handeln: 'gemeinsam', stub: true, color: '#9bc47a' },
    glueck: { id: 'glueck', title: 'Glück gehabt', klima: 'mild', handeln: 'jeder', stub: true, color: '#c9b66a' },
  };
  const CHAPTERS = [
    { id: 'wald', title: 'Wald', from: 2026, to: 2042, places: ['hang', 'waldrand'], questions: ['Wer pflanzt, wenn der Käfer kommt – und wer zahlt?', 'Was soll aus den kahlen Hängen werden?'] },
    { id: 'wasser', title: 'Wasser', from: 2042, to: 2052, places: ['bruecke', 'strasse'], questions: ['Wer hilft nachts, wenn das Wasser steigt?'] },
    { id: 'energie', title: 'Energie', from: 2052, to: 2060, places: ['heizhaus', 'schule'], questions: ['Was brauchen wir, damit die Schule im Blackout leuchtet?'] },
  ];
  const EV = [
    { id: 'kaefer', w: 'allein', y: 2031, chapter: 'wald', kind: 'ereignis', title: 'Der Käfersommer', text: 'Die Fichten am Hang werden rotbraun.', lines: [{ id: 'm1', who: 'Manfred', text: 'So schnell habe ich die Hänge noch nie braun werden sehen.' }], halt: 6 },
    { id: 'regen', w: 'allein', y: 2046, chapter: 'wasser', kind: 'stresstest', title: 'Die Starkregennacht', text: 'Sirenen, steigendes Wasser.', lines: [{ id: 'k1', who: 'Katrin', text: 'Das Wasser steht schon an der Brücke!' }], halt: 8 },
    { id: 'blackout', w: 'allein', y: 2056, chapter: 'energie', kind: 'stresstest', title: 'Die Blackout-Nacht', text: 'Die Region liegt im Dunkeln.', lines: [{ id: 'i1', who: 'Ingrid', text: 'Nur bei Jens brennt noch Licht, er hat eine Batterie.' }], halt: 8 },
  ];
  const chronik = {
    mock: true,
    WORLDS,
    PAIRS: [['allein', 'gewappnet']],
    SPAN: [2026, 2060],
    CHAPTERS,
    events: w => EV.map(e => ({ ...e, w })),
    lines: () => EV.flatMap(e => e.lines),
    kpi: (w, ch) => [
      { id: 'k1', label: ch === 'wald' ? 'Fichtenfläche übrig' : ch === 'wasser' ? 'Schaden pro Haus' : 'Strom aus der Region', value: w === 'allein' ? 18 : 41, unit: ch === 'wasser' ? 'T€' : '%', range: [10, 55], src: [['Beispielwert (Demo)', '']], why: 'Demo' },
      { id: 'k2', label: 'Gemeinsam beschlossen', value: w === 'allein' ? 0 : 3, unit: 'Projekte', range: [0, 5], src: [], why: 'Demo' },
    ],
  };
  // ---- the regie stand-in: time runs by itself, one year in ~2.5 s; each chapter ends with a card; events halt the time ----
  const R = { on: false, pair: ['allein', 'gewappnet'], split: true, chapter: null, y: 2026, ev: null, phase: 0, playing: false, place: 'anger', card: null, speed: 1 };
  const subs = new Set();
  const emit = e => subs.forEach(f => f(e));
  let timer = 0,
    halt = 0;
  const chOf = y => CHAPTERS.find(c => y >= c.from && y < c.to) || CHAPTERS[CHAPTERS.length - 1];
  function tick() {
    if (!R.on || !R.playing || R.card) return;
    if (halt > 0) {
      halt -= 0.25 * R.speed;
      R.phase = Math.min(1, R.phase + 0.25 / 8);
      if (halt <= 0) R.ev = null;
      return emit({ type: 'tick', y: R.y });
    }
    const y0 = R.y;
    R.y += 0.1 * R.speed;
    const ch = chOf(R.y - 1e-6);
    if (R.chapter !== ch.id) {
      R.chapter = ch.id;
      emit({ type: 'chapter', chapter: ch.id });
    }
    const e = EV.find(q => q.y > y0 && q.y <= R.y);
    if (e) {
      R.y = e.y;
      R.ev = e;
      R.phase = 0;
      halt = e.halt;
      R.place = e.chapter === 'wasser' ? 'strasse' : 'waldrand';
      emit({ type: 'event', ev: e });
      e.lines.forEach(l => emit({ type: 'line', ...l }));
    }
    if (R.y >= ch.to - 1e-6 && ch.to <= chronik.SPAN[1]) {
      R.card = { chapter: ch.id };
      R.playing = false;
      emit({ type: 'card', chapter: ch.id });
    }
    if (R.y >= chronik.SPAN[1]) {
      R.y = chronik.SPAN[1];
      R.playing = false;
      emit({ type: 'end' });
    }
    emit({ type: 'tick', y: R.y });
  }
  const regie = {
    mock: true,
    start(o = {}) {
      Object.assign(R, { on: true, pair: o.pair || ['allein', 'gewappnet'], split: o.split !== false, chapter: o.chapter || 'wald', y: o.chapter ? CHAPTERS.find(c => c.id === o.chapter).from : 2026, ev: null, card: null, playing: true, phase: 0 });
      clearInterval(timer);
      timer = setInterval(tick, 250);
      emit({ type: 'chapter', chapter: R.chapter });
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
        const i = CHAPTERS.findIndex(c => c.id === R.card.chapter);
        R.card = null;
        if (CHAPTERS[i + 1]) {
          R.chapter = CHAPTERS[i + 1].id;
          R.y = CHAPTERS[i + 1].from;
          emit({ type: 'chapter', chapter: R.chapter });
        }
        R.playing = true;
      } else if (!R.playing) R.playing = true;
      else {
        halt = 0;
        R.ev = null;
        R.y = chOf(R.y).to - 0.01;
      }
    },
    prev() {
      R.card = null;
      const c = chOf(R.y);
      R.y = R.y - c.from > 1 ? c.from : (CHAPTERS[Math.max(0, CHAPTERS.indexOf(c) - 1)] || c).from;
      R.chapter = chOf(R.y).id;
      R.ev = null;
      halt = 0;
    },
    seek(y) {
      R.card = null;
      R.ev = null;
      halt = 0;
      R.y = y;
      R.chapter = chOf(y).id;
    },
    speed(s) {
      R.speed = s;
    },
    stop() {
      R.on = false;
      R.playing = false;
      R.card = null;
      clearInterval(timer);
      emit({ type: 'end' });
    },
    state: () => ({ ...R }),
    on(fn) {
      subs.add(fn);
      return () => subs.delete(fn);
    },
  };
  return { chronik, regie };
})();
