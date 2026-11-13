// ===================== feat/grenzland: Grenzland's phone – the world adapter on the shared phone (GLHANDY on HANDY) =====================
// Since 13.11.2026 (Falko 13:09: a realistic phone, apps to open and close, chats from top to bottom, calls) the device and its system are
// the shared phone of viz3/src/handy/ (HANDY, docs/features/handy.md); this module is Grenzland's world on it: HANDY.welt('grenzland', …)
// at the mode's start brings the content –
//   Nachrichten  the story's messages as threads per sender (GLHANDY.sms(von, text)), answers as chips, a short answer back now and then;
//                the village chat „Ratscher aktuell“ (satire, the invented villagers only) as a muted group that reacts to what happens:
//                a patrol car in the village, a banger, a deed somebody saw, a road block, an arrest
//   Telefon      Sarah or Falko, the clique, Yuki, Gerhard – calls with fixed lines (STIMME.say 'gl_<who>', subtitles GLHUD.sub); GLHANDY.ruf
//                for a call that comes in (a mission's scene)
//   Kamera       the viewfinder over the picture; a mission asks for photos with GLHANDY.kamera({ ziel, r, n, sicht, done, name }); the
//                pictures (real frames) go to Fotos and can be shared in the feed
//   Karte        the mode's places and a waypoint ('grenzland:ziel' { pos, name })
//   Feed         regional posts and „livestreams“ – also what witnesses filmed (GLHANDY.feed(wer, text, ort, { img, live, likes, kom }) or
//                GLHANDY.post({ … }), agent welt): the picture, LIVE, the likes and comments counting up, „Auf der Karte zeigen“
//   Bank         the money and its movements ('grenzland:geld', the fine of an arrest) · Notizen with sources (GLHANDY.note, the true story
//                „Sushi in Suhl“ once the radio told it, the radio of 10 November 1989) · Radio (the stations of gl_radio.js) · Aufträge (locked:
//                „Kommt mit Kapitel 2.“ – GLHANDY.freischalten(id))
// The figure holds the phone (handy/handy_pose.js). In 1989 nobody has a phone. „Beenden“ takes it away. Saved through GL: GL.sms (incoming
// and, with aus: true, one's answers), GL.feed (chat, feed, bank, note, call and unlock entries by k); pictures stay in memory.
// Interface (the core's, kept): GLHANDY.sms(von, text) · chat(wer, text) · feed(wer, text, ort, o) · post(o) · posts() · note(titel, zeilen,
//   quellen) · unlock(id) · open(tab) → true | false · close() · toggle() · tab(k) · isOpen() · unread() · badge(k) · tick(dt) · stop() ·
//   kamera(o | null) · foto() · fotoUI() · sucher(on) · cam() · ziel() · zu() → Promise · ruf(wer, zeilen, o) · freischalten(id) · linien()
// Events: 'grenzland:sms' { von, text }, 'grenzland:foto' { n }, 'grenzland:handy' { gelesen }, 'grenzland:ziel' { pos, name },
//   'grenzland:feedpost' { wer, live, bild }.
import { KERN } from '../core/kern.js';
import { P } from '../game/walkable.js';
import { PLAY } from '../game/play.js';
import { CLOCK } from '../time/clock.js';
import { VEH } from '../vehicles/vehicle.js';
import { STIMME } from '../audio/stimme.js';
import { HANDY } from '../handy/handy.js';
import { HANDYAPPS } from '../handy/handy_apps.js';
import { HANDYPOSE } from '../handy/handy_pose.js';
import { GLDATA } from './gl_data.js';
import { GL } from './gl_state.js';
import { GLTON } from './gl_ton.js';
import { GLHUD } from './gl_hud.js';
import { GLRDATA } from './gl_radio_data.js';
import { GLRADIO } from './gl_radio.js';
export const GLHANDY = (() => {
  const D = GLRDATA;
  const S = {
    tab: 'sms',
    cam: null,
    notes: [],
    note: -1,
    q: [],
    chatT: 25,
    feedT: 70,
    evI: {},
    evT: {},
    acc: 0,
    ziel: null,
    zielId: '',
    frei: 0,
    bilder: new Map(),
    uhr: 0,
    fotoT: 0,
    imgT: -1e9,
    zaehlT: 0,
    tippt: {},
    gelesen: 0,
    compat: null,
    get camOn() {
      return !!HANDY.S.sucher;
    },
    get open() {
      return HANDY.S.open && HANDY.S.wid === 'grenzland';
    },
  };
  const ICON = {
    radio:
      'M4 9h16v11H4zM6.4 8.2l10-4 .6 1.4-10 4zM7.5 14.5a3 3 0 106 0 3 3 0 00-6 0zM15.5 12h3v1.5h-3zM15.5 15h3v1.5h-3z',
    auftraege: 'M9 3h6v2h5v16H4V5h5zm1 2v1h4V5zM7 10h10v1.6H7zm0 3.5h10v1.6H7zm0 3.5h6v1.6H7z',
  };
  const esc = HANDY.esc;
  // ---------------- what is kept (GL.sms, GL.feed) ----------------
  const of = k => GL.feed.filter(q => q.k === k);
  const CAP = { chat: 16, feed: 10, bank: 8, note: 4, anruf: 8, frei: 6 };
  const dirty = () => (HANDY.S.dirty = true);
  function push(k, o) {
    GL.feed.push(Object.assign({ k, t: Math.round(CLOCK.t) }, o));
    // each kind keeps its newest (the save holds forty entries in all)
    let n = of(k).length;
    for (let i = 0; i < GL.feed.length && n > CAP[k]; i++)
      if (GL.feed[i].k === k) {
        GL.feed.splice(i--, 1);
        n--;
      }
    GL.save();
    dirty();
  }
  const ich = () => (GL.wer === 'f' ? 'sarah' : 'falko');
  const partner = () => (GL.wer === 'f' ? 'falko' : 'sarah');
  const nameOf = w => (GLDATA.CAST[w] ? GLDATA.CAST[w].name : String(w));
  // a thread is open on the screen
  const sieht = id =>
    HANDY.S.open &&
    HANDY.S.app === 'nachrichten' &&
    HANDY.view() === 'faden' &&
    HANDY.S.stack[HANDY.S.stack.length - 1].arg === id;
  function sms(von, text) {
    von = String(von);
    text = String(text);
    const id = 'p:' + von,
      jetzt = sieht(id);
    GL.sms.push({ von, text, t: Math.round(CLOCK.t), neu: !jetzt });
    if (GL.sms.length > 40) GL.sms.shift();
    GL.save();
    GL.emit('sms', { von, text });
    HANDY.mitteilung({ app: 'nachrichten', von, text, ziel: { v: 'faden', arg: id } });
    if (!HANDY.S.open && GL.on && !HANDY.S.cfg) PLAY.think('Nachricht von ' + von + ' (Handy: T)', 3200);
    dirty();
  }
  const chat = (wer, text, o) =>
    push('chat', Object.assign({ wer: String(wer), text: String(text), neu: !sieht('dorf') }, o));
  // a post: o = { img (data URL, kept in memory only), live, likes, kom: [[wer, text]] } – what witnesses filmed (agent welt)
  function feed(wer, text, ort, o = {}) {
    let bild = '';
    if (o.img && typeof o.img === 'string') {
      bild = 'b' + (S.bilder.size + 1) + '_' + Math.round(S.uhr * 10);
      S.bilder.set(bild, o.img);
      // (the newest dozen pictures)
      if (S.bilder.size > 12) S.bilder.delete(S.bilder.keys().next().value);
      S.imgT = S.uhr;
    }
    const t = (o.live && !/^LIVE/.test(String(text)) ? 'LIVE: ' : '') + String(text);
    push(
      'feed',
      Object.assign(
        { wer: String(wer), text: t, ort: ort || '', neu: !(HANDY.S.open && HANDY.S.app === 'feed') },
        { i: o.i != null ? o.i : -1 },
        bild || o.likes ? { bild, likes: o.likes | 0, kom: (o.kom || []).slice(0, 5), t0: Math.round(S.uhr) } : {}
      )
    );
    if (bild || o.live) {
      // (the one who posts plays its own sound – gl_reaktion.js)
      HANDY.mitteilung({ app: 'feed', von: String(wer), text: t.replace(/^LIVE:\s*/, o.live ? 'LIVE · ' : ''), still: !!bild });
      GL.emit('feedpost', { wer, live: !!o.live, bild: !!bild });
    }
    return bild;
  }
  function post(o = {}) {
    S.fotoT = 0;
    return feed(o.wer || 'ratscher_rudi', o.text || '', o.ort || '', o);
  }
  function note(titel, zeilen, quellen) {
    if (S.notes.some(n => n.titel === titel)) return false;
    S.notes.push({ titel, zeilen: [].concat(zeilen || []), quellen: quellen || [] });
    dirty();
    return true;
  }
  // a note the phone knows by itself (kept over a reload by its id)
  function unlock(id, quiet) {
    const N = D.NOTIZ[id];
    if (!N || !note(N.titel, N.zeilen, N.quellen)) return false;
    if (!of('note').some(q => q.text === id)) push('note', { wer: 'Notiz', text: id });
    if (!quiet) {
      GLTON.fx('tick');
      HANDY.mitteilung({ app: 'notizen', von: 'Notizen', text: N.titel, still: true });
    }
    return true;
  }
  const unread = () => GL.sms.filter(q => q.neu && !q.aus).length;
  const badge = k => (k === 'sms' ? unread() : k === 'chat' || k === 'feed' ? of(k).filter(q => q.neu).length : 0);
  // ---------------- the data for the phone's apps ----------------
  const thr = () => {
    const by = new Map();
    for (const q of GL.sms) {
      const id = 'p:' + q.von;
      if (!by.has(id)) by.set(id, { id, name: q.von, neu: 0, letzte: null });
      const t = by.get(id);
      if (q.neu && !q.aus) t.neu++;
      t.letzte = { text: q.text, t: q.t, aus: !!q.aus };
    }
    const l = [...by.values()];
    const c = of('chat'),
      last = c[c.length - 1];
    l.push({
      id: 'dorf',
      name: 'Ratscher aktuell',
      gruppe: true,
      stumm: true,
      mitglieder: 43,
      neu: c.filter(q => q.neu).length,
      letzte: last ? { text: last.text, t: last.t, von: last.wer } : { text: '', t: 0 },
    });
    return l;
  };
  const KONT = [
    ['jule', 'Clique · Moped', true],
    ['timo', 'Clique'],
    ['basti', 'Clique'],
    ['yuki', 'Köchin, Suhl'],
    ['gerhard', 'Nachbar, Ratscher'],
  ];
  const kontakte = () => {
    const p = partner();
    return [
      { id: p, name: nameOf(p), rolle: GL.wer === 'f' ? 'Mann' : 'Frau', fav: true, chat: 'p:' + nameOf(p) },
    ].concat(KONT.map(([id, rolle, fav]) => ({ id, name: nameOf(id), rolle, fav: !!fav, chat: 'p:' + nameOf(id) })));
  };
  // calls: fixed lines (stimmen records them; 'ich' is the one who plays)
  const RUF = {
    sarah: [
      ['sarah', 'Ja? Ich bin noch im Garten.'],
      ['ich', 'Brauchst du was vom Wagen am Anger?'],
      ['sarah', 'Milch. Und komm nicht wieder mit Blaulicht hinter dir heim.'],
    ],
    falko: [
      ['falko', 'Na? Ich steh an der Werkstatt.'],
      ['ich', 'Wollte nur hören, wo du steckst.'],
      ['falko', 'Hier. Mit Sägespänen bis zum Hals. Bis nachher.'],
    ],
    jule: [
      ['jule', 'Was gibt’s? Ich schraub gerade, mach’s kurz.'],
      ['ich', 'Läuft alles?'],
      ['jule', 'Läuft. Wie ’ne Schwalbe nach dem Vergaserputzen.'],
    ],
    timo: [['timo', 'Jo. Kann grad nicht, Mutti steht daneben. Später.']],
    basti: [
      ['basti', 'Ey! Nee, ich hab nix gesehen.'],
      ['basti', 'Und wenn, dann nicht von hier.'],
    ],
    yuki: [
      ['yuki', 'Ach, du bist’s! Ich stehe am Herd.'],
      ['yuki', 'Ruf später nochmal an, ja?'],
    ],
    gerhard: [
      ['gerhard', 'Gerhard. Wer ist da?'],
      ['ich', 'Ich bin’s.'],
      ['gerhard', 'Ach so. Am Telefon hör ich schlecht, Junge. Komm vorbei, dann reden wir.'],
    ],
  };
  const wer = w => (w === 'ich' ? ich() : w);
  // what the phone says aloud: the person's voice, the mode's subtitle
  function sag(w, text) {
    const ms = Math.max(1600, 900 + String(text).length * 62);
    try {
      GLHUD.sub(nameOf(w), text, ms + 300);
    } catch (e) {}
    try {
      if (!window.FREEZE && STIMME.speaks('gl_' + w, text))
        return STIMME.say('gl_' + w, text).then(
          r => r,
          () => false
        );
    } catch (e) {}
    return new Promise(res => setTimeout(() => res(true), ms));
  }
  async function gespraech(zeilen, ctl) {
    for (const [w, text] of zeilen) {
      if (!ctl.aktiv()) return;
      await ctl.sag(wer(w), text, { name: nameOf(wer(w)) });
      await ctl.warte(0.25);
    }
  }
  // a call that comes in (a mission's scene): wer = cast id, zeilen = [[who ('ich' = the player), text]], o.annehmen: seconds
  function ruf(w, zeilen, o = {}) {
    if (!GL.on || GL.era !== 'heute') return false;
    const K = kontakte().find(k => k.id === w) || { id: w, name: nameOf(w), rolle: o.rolle || '' };
    return HANDY.eingehend(K, Object.assign({}, o, { szene: (k, ctl) => gespraech(zeilen || RUF[w] || [], ctl) }));
  }
  // short answers to one's chips (now and then, after the typing dots)
  const ANTW = {
    ok: 'Alles klar 👍',
    spaeter: 'Melde mich später.',
    wer: 'Wer ist da?',
    unterwegs: 'Bin unterwegs.',
  };
  const ZURUECK = {
    Jule: ['👍', 'Gut so.'],
    Yuki: ['Danke! 🙏', 'Bis bald!'],
    Sarah: ['❤️', 'Pass auf dich auf.'],
    Falko: ['👍', 'Bis nachher.'],
    Timo: ['jo'],
    Basti: ['😎'],
  };
  // the place under one's feet, and the place's bars – thin in the woods
  const hier = () => {
    const w = KERN.where() || [P.x, P.y];
    return String(KERN.place(w[0], w[1], 0) || '');
  };
  const DATEN = {
    threads: thr,
    nachrichten(id) {
      if (id === 'dorf') return of('chat').map(q => ({ von: q.wer, text: q.text, t: q.t, neu: !!q.neu }));
      const von = String(id).slice(2);
      return GL.sms
        .filter(q => q.von === von)
        .map(q => ({ von, text: q.text, t: q.t, neu: !!q.neu, aus: !!q.aus, gelesen: true }));
    },
    gelesen(id) {
      let n = 0;
      if (id === 'dorf') {
        for (const q of of('chat')) if (q.neu) ((q.neu = false), n++);
      } else for (const q of GL.sms) if (q.neu && 'p:' + q.von === id) ((q.neu = false), n++);
      if (n) GL.save();
    },
    tippt: id => S.tippt[id] > 0,
    hinweis: id => (id === 'dorf' ? 'Schreiben darf hier nur, wer seit drei Generationen im Dorf wohnt.' : 'Nachricht'),
    kontakte,
    anrufe: () => of('anruf').map(q => ({ wer: q.wer, id: q.id, art: q.text, d: q.d | 0, t: q.t })),
    feed() {
      return of('feed')
        .slice()
        .reverse()
        .map(q => {
          const live = /^LIVE/.test(q.text),
            O = q.ort && GLDATA.ORTE[q.ort],
            age = q.t0 > S.uhr ? 1e9 : S.uhr - (q.t0 || 0);
          return {
            wer: q.wer,
            text: q.text.replace(/^LIVE:\s*/, ''),
            t: q.t,
            live,
            ort: O ? q.ort : '',
            ortName: O ? O.name : '',
            img: q.bild ? S.bilder.get(q.bild) || '' : '',
            likes: q.likes ? Math.round(q.likes * (1 - Math.exp(-age / 22))) : undefined,
            kom: (q.kom || []).filter((k, i) => age > 7 + i * 9),
          };
        });
    },
    feedGelesen() {
      for (const q of of('feed')) q.neu = false;
    },
    bank: () => ({
      name: D.BANK.name,
      claim: D.BANK.claim,
      stand: GL.geld,
      waehrung: '€',
      buchungen: of('bank').slice().reverse(),
    }),
    notizen: () => S.notes,
    orte: () =>
      Object.entries(GLDATA.ORTE || {})
        .filter(([id, o]) => o && Array.isArray(o.pos) && id !== 'moped')
        .map(([id, o]) => ({ id, name: o.name, pos: o.pos, art: o.art || o.typ || 'Ort' })),
    wo: () => KERN.where() || [P.x, P.y],
    ziel: () => S.zielId,
    ortName: hier,
  };
  const AKT = {
    antworten(id) {
      if (id === 'dorf') return [];
      const l = GL.sms.filter(q => 'p:' + q.von === id),
        last = l[l.length - 1];
      if (!last || last.aus) return [];
      const bekannt = kontakte().some(k => 'p:' + k.name === id);
      return bekannt
        ? [
            { id: 'ok', text: ANTW.ok },
            { id: 'unterwegs', text: ANTW.unterwegs },
            { id: 'spaeter', text: ANTW.spaeter },
          ]
        : [
            { id: 'ok', text: ANTW.ok },
            { id: 'wer', text: ANTW.wer },
          ];
    },
    antwort(id, a) {
      const von = String(id).slice(2);
      GL.sms.push({ von, text: a.text, t: Math.round(CLOCK.t), neu: false, aus: true });
      if (GL.sms.length > 40) GL.sms.shift();
      GL.save();
      GL.emit('antwort', { von, id: a.id });
      const z = ZURUECK[von];
      if (z && Math.random() < 0.75) {
        S.tippt[id] = 2.4 + Math.random() * 1.6;
        S.q.push({
          t: S.tippt[id],
          fn: () => {
            S.tippt[id] = 0;
            GL.sms.push({ von, text: z[(Math.random() * z.length) | 0], t: Math.round(CLOCK.t), neu: !sieht(id) });
            GL.save();
            if (sieht(id)) HANDY.ton('empfang');
            else
              HANDY.mitteilung({
                app: 'nachrichten',
                von,
                text: GL.sms[GL.sms.length - 1].text,
                ziel: { v: 'faden', arg: id },
              });
            dirty();
          },
        });
      }
      dirty();
    },
    anruf(k, ctl, art) {
      if (art === 'ein') return null;
      const L = RUF[k.id];
      if (!L) return null;
      return gespraech(L, ctl);
    },
    anrufListe(a) {
      push('anruf', { wer: a.wer, id: a.id, text: a.art, d: a.d | 0 });
    },
    sag,
    hinweis: why => PLAY.think(why, 3600),
    zeigOrt: id => zeig(id),
    ziel: o => zeig(o.id, true),
    sucher() {
      const c = S.cam;
      if (!c) return { n: '', text: '', gut: false };
      const s = camSee(),
        ok = !!s && s.nah && s.vorn && s.sicht;
      return {
        n: 'FOTO ' + c.got + '/' + c.n,
        gut: ok,
        text: ok
          ? 'Motiv im Bild – auslösen'
          : !s.nah
            ? 'Zu weit weg (' + Math.round(s.d) + ' m)'
            : !s.sicht
              ? 'Von hier sieht man nichts'
              : s.a > 0
                ? 'Motiv weiter rechts'
                : 'Motiv weiter links',
      };
    },
    ausloesen: () => ausloesenW(),
    teilen(img) {
      post({
        wer: nameOf(ich()),
        text: 'Gerade eben, ' + (hier() || 'irgendwo') + '.',
        img,
        likes: 3 + ((Math.random() * 20) | 0),
      });
    },
  };
  // ---------------- Grenzland's own apps ----------------
  HANDY.app('radio', {
    name: 'Radio',
    icon: ICON.radio,
    farbe: ['#ffb340', '#d35400'],
    render(el) {
      const n = GLRADIO.now(),
        cur = GLRADIO.cur();
      el.innerHTML =
        `<p style="opacity:.85;margin:0 0 3cqmin">${n.id ? '<b>' + esc(n.name) + '</b> · ' + esc(n.text || '…') : 'Das Radio ist aus.'}</p>` +
        GLRADIO.stations()
          .map(
            s =>
              `<button type="button" class="hy-zeile${s.id === cur ? ' hy-ung' : ''}" data-hy="s:${esc(s.id)}"><div><b><span>${esc(s.name)}</span><time>${esc(s.freq)}</time></b><small>${esc(s.art)}</small></div><span class="hy-pf">${s.id === cur ? '♪' : ''}</span></button>`
          )
          .join('') +
        `<button type="button" class="hy-zeile" data-hy="s:"><div><b><span>Radio aus</span></b></div><span class="hy-pf">${cur ? '' : '■'}</span></button>` +
        `<button type="button" class="hy-ein" data-hy="stimme" aria-pressed="${!!GLRADIO.spricht()}"><span>Sprecher vorlesen<small style="display:block;opacity:.55;font-size:3.2cqmin">mit deinen Stimmen${STIMME.engineName === 'eleven' ? ' – kostet Guthaben' : ''}</small></span><i></i></button>`;
      return { titel: 'Radio', sub: 'R: nächster Sender' };
    },
    klick(k, b, c) {
      if (k === 'stimme') {
        const on = !GLRADIO.spricht();
        GLRADIO.stimme(on, on);
      } else if (k.startsWith('s:')) GLRADIO.tune(k.slice(2) || null);
      c.neu();
      return true;
    },
  });
  HANDY.app('auftraege', {
    name: 'Aufträge',
    icon: ICON.auftraege,
    farbe: ['#8e8e93', '#3a3a3c'],
    render(el) {
      el.innerHTML = '<p class="hy-leer">Keine Aufträge.<br>Wer fragt, bekommt welche.</p>';
      return { titel: 'Aufträge' };
    },
  });
  // ---------------- the world ----------------
  const APPS = [
    'karte',
    'feed',
    'bank',
    'notizen',
    'fotos',
    'radio',
    'uhr',
    'einstellungen',
    'auftraege',
    'telefon',
    'nachrichten',
    'kamera',
  ];
  function weltAn() {
    HANDY.welt('grenzland', {
      name: 'Grenzland',
      ids: { root: 'glhandy', sucher: 'glcam' },
      farbe: '#5aa9ff',
      glanz: '#e8915f',
      zeit: () => CLOCK.t,
      datum: () => {
        try {
          if (window.DN && DN.dateStr) return String(DN.dateStr(CLOCK.t, true)).replace(/\s\d{4}$/, '');
        } catch (e) {}
        return '';
      },
      ort: () => hier().replace(/^(.{0,22}).*$/, '$1'),
      netz: () => {
        const o = hier();
        return /Klinge|Wald|Forst/.test(o) ? 1 : /Schleusingen|Ratscher|Anger|Dorf/.test(o) ? 4 : 3;
      },
      akku: () => Math.max(9, 81 - Math.floor(S.uhr / 300)),
      apps: APPS,
      dock: ['telefon', 'nachrichten', 'kamera', 'feed'],
      gesperrt: { auftraege: 'Kommt mit Kapitel 2.' },
      halten: true,
      peek: true,
      feedName: 'Feed',
      feedSub: 'Südthüringen, ungefiltert',
      notizenLeer: 'Noch keine Notizen. Wer Radio hört, erfährt mehr.',
      darf: () => {
        if (!GL.on) return false;
        if (GL.era === '1989')
          return '1989 hat hier niemand ein Telefon in der Tasche. Die nächste Zelle steht am Konsum.';
        return true;
      },
      badge: id => (id === 'nachrichten' ? unread() : id === 'feed' ? of('feed').filter(q => q.neu).length : 0),
      daten: DATEN,
      aktionen: AKT,
    });
    // what was unlocked stays so
    for (const q of of('frei')) HANDY.S.frei[q.text] = true;
  }
  function freischalten(id) {
    const r = HANDY.freischalten(id);
    if (r && !of('frei').some(q => q.text === id)) push('frei', { wer: 'system', text: id });
    return r;
  }
  // ---------------- the old tabs (the tests know them): a strip on the phone's lower edge, invisible ----------------
  const TABS = ['sms', 'chat', 'feed', 'bank', 'notiz', 'kamera', 'radio'];
  function compat() {
    const el = HANDY.el();
    if (!el || (S.compat && S.compat.parentNode === el)) return;
    const nav = document.createElement('nav');
    nav.className = 'hn';
    nav.setAttribute('aria-hidden', 'true');
    nav.style.cssText = 'position:absolute;left:14%;right:14%;bottom:0;height:5px;display:flex;opacity:0;z-index:70';
    nav.innerHTML = TABS.map(
      k => `<button type="button" data-tab="${k}" tabindex="-1" style="flex:1;height:100%;cursor:default"></button>`
    ).join('');
    nav.addEventListener('click', e => {
      const b = e.target.closest('button');
      if (b) tab(b.dataset.tab);
    });
    el.appendChild(nav);
    S.compat = nav;
    sel();
  }
  function sel() {
    if (!S.compat) return;
    for (const b of S.compat.querySelectorAll('button'))
      b.setAttribute('aria-selected', b.dataset.tab === S.tab ? 'true' : 'false');
  }
  // which old tab the current app is
  KERN.on('handy:app', d => {
    if (HANDY.S.wid !== 'grenzland' || !d) return;
    const a = d.app,
      v = HANDY.S.stack[HANDY.S.stack.length - 1];
    if (a === 'nachrichten') S.tab = v && v.arg === 'dorf' ? 'chat' : 'sms';
    else if (a === 'feed') S.tab = 'feed';
    else if (a === 'bank') S.tab = 'bank';
    else if (a === 'notizen') S.tab = 'notiz';
    else if (a === 'radio') S.tab = 'radio';
    else if (a === 'fotos' && S.tab !== 'kamera') S.tab = 'kamera';
    sel();
  });
  function tab(k) {
    if (!TABS.includes(k)) k = 'sms';
    if (!S.open && !open()) return false;
    const ziel = {
      sms: ['nachrichten'],
      chat: ['nachrichten', 'faden', 'dorf'],
      feed: ['feed'],
      bank: ['bank'],
      notiz: ['notizen'],
      kamera: ['fotos'],
      radio: ['radio'],
    }[k];
    HANDY.zeige(ziel[0], ziel[1], ziel[2]);
    S.tab = k;
    S.note = -1;
    sel();
    return true;
  }
  // a post's place as a goal: the event for whoever draws markers, and a word on where it is
  function zeig(ort, still) {
    const O = GLDATA.ORTE[ort];
    if (!O) return;
    S.ziel = { pos: O.pos.slice(), name: O.name };
    S.zielId = ort;
    GL.emit('ziel', { pos: O.pos.slice(), name: O.name });
    const w = KERN.where() || [P.x, P.y],
      dx = O.pos[0] - w[0],
      dy = O.pos[1] - w[1],
      d = Math.hypot(dx, dy),
      dir = ['Norden', 'Nordosten', 'Osten', 'Südosten', 'Süden', 'Südwesten', 'Westen', 'Nordwesten'][
        Math.round((((Math.atan2(dx, dy) * 180) / Math.PI + 360) % 360) / 45) % 8
      ];
    if (!still)
      HANDY.mitteilung({
        app: 'karte',
        von: O.name,
        text:
          (d < 950 ? Math.round(d / 10) * 10 + ' m' : (d / 1000).toFixed(1).replace('.', ',') + ' km') +
          ' nach ' +
          dir +
          '.',
        kurz: true,
        still: true,
      });
    GLTON.fx('tick');
  }
  // ---------------- taking it out, putting it away ----------------
  // true when it came out – false in 1989 or when the mode is off. (No promise: a test's evaluate would wait for it forever.)
  function open(t) {
    if (!GL.on) return false;
    if (HANDY.S.wid !== 'grenzland') weltAn();
    if (t === 'kamera') return kameraAuf();
    const was = HANDY.S.open;
    if (!was) S.gelesen = unread();
    let ok;
    if (typeof t === 'string' && TABS.includes(t)) {
      ok = HANDY.open() && tab(t);
    } else if (typeof t === 'string' && HANDY.S.apps[t]) {
      ok = HANDY.open(t);
    } else if (!was && unread()) {
      // what came in: straight into the thread (one sender) or the list
      const ids = [...new Set(GL.sms.filter(q => q.neu && !q.aus).map(q => 'p:' + q.von))];
      ok = ids.length === 1 ? HANDY.open('nachrichten', { view: 'faden', arg: ids[0] }) : HANDY.open('nachrichten');
      S.tab = 'sms';
    } else ok = HANDY.open();
    if (ok) compat();
    sel();
    return !!ok;
  }
  function kameraAuf() {
    if (!GL.on || GL.era !== 'heute') return false;
    if (HANDY.S.wid !== 'grenzland') weltAn();
    compat();
    return HANDY.sucher(true, { von: HANDY.S.open ? 'handy' : '' }) || HANDY.S.sucher;
  }
  const close = () => HANDY.close();
  const toggle = () => {
    if (HANDY.S.sucher) return (HANDY.sucher(false, { heim: false }), false);
    return S.open ? (close(), false) : open();
  };
  // a scene with black bars (the lead's GLHUD.kino: body[data-gl-kino="1"]): the phone goes into the pocket, the peek too
  if (typeof MutationObserver !== 'undefined' && document.body)
    new MutationObserver(() => {
      if (document.body.dataset.glKino !== '1' || HANDY.S.wid !== 'grenzland') return;
      if (HANDY.S.sucher) HANDY.sucher(false, { heim: false });
      if (HANDY.S.open && !HANDY.S.anruf) close();
      const pk = document.querySelector('.hy-peek');
      if (pk) pk.classList.add('hy-weg');
    }).observe(document.body, { attributes: true, attributeFilter: ['data-gl-kino'] });
  KERN.on('handy:zu', () => {
    if (HANDY.S.wid === 'grenzland' && GL.on) GL.emit('handy', { gelesen: S.gelesen || 0 });
  });
  // ---------------- the camera ----------------
  function kamera(o) {
    S.cam = o ? Object.assign({ got: 0, n: 1, r: 40 }, o) : null;
    if (!o) HANDY.sucher(false, { heim: false });
    dirty();
  }
  // where the target is from here: distance, in reach, in front, in sight
  function camSee() {
    const c = S.cam;
    if (!c) return null;
    const dx = c.ziel[0] - P.x,
      dy = c.ziel[1] - P.y,
      d = Math.hypot(dx, dy);
    let a = (Math.atan2(dx, dy) * 180) / Math.PI - P.yaw;
    a = ((a + 540) % 360) - 180;
    return { d, nah: d <= c.r, vorn: Math.abs(a) < 42 || d < 3, a, sicht: !c.sicht || !!c.sicht() };
  }
  // a photo for the mission (the core's rule: the target within reach and in sight) – counted, without the shutter
  function zaehle() {
    const c = S.cam;
    if (!c) return false;
    const s = camSee();
    if (!s.nah || !s.sicht) {
      PLAY.think('Von hier sieht man nichts.', 1800);
      return false;
    }
    c.got++;
    GL.emit('foto', { n: c.got });
    if (c.got >= c.n) {
      S.cam = null;
      PLAY.think('Alle Fotos im Kasten.', 2200);
      setTimeout(() => HANDY.sucher(false, { heim: false }), window.FREEZE ? 0 : 700);
      if (c.done) c.done();
    } else PLAY.think('Foto ' + c.got + ' von ' + c.n + '.', 1500);
    dirty();
    return true;
  }
  function foto() {
    const r = zaehle();
    if (r) HANDY.ton('ausloeser');
    return r;
  }
  // the shutter's rule: without a mission a snapshot; with one the target must be in the picture
  function ausloesenW() {
    if (!S.cam) {
      S.frei++;
      return true;
    }
    const s = camSee();
    if (s.nah && s.sicht && !s.vorn) {
      PLAY.think('Das Motiv ist nicht im Bild.', 1600);
      return false;
    }
    return zaehle();
  }
  const fotoUI = () => (HANDY.S.sucher ? HANDY.ausloesen() : ausloesenW());
  // ---------------- what happens ----------------
  const later = (sec, fn) => S.q.push({ t: sec, fn });
  // a reaction of the chat and the feed to an event (not twice within a while; the feed's not right after a filmed post)
  function react(ev, delay) {
    if (!GL.on || GL.era !== 'heute') return;
    if (S.evT[ev] > 0) return;
    S.evT[ev] = 25;
    const i = (S.evI[ev] = (S.evI[ev] || 0) + 1) - 1,
      c = D.CHATEV[ev],
      f = D.FEEDEV[ev];
    if (c) {
      const a = c[i % c.length];
      later(delay, () => chat(a[0], a[1], { i: -1 }));
      // (somebody always answers)
      if (c.length > 1 && i % c.length === 0) later(delay + 5, () => chat(c[1][0], c[1][1], { i: -1 }));
    }
    const frisch = () => S.fotoT > 0 || S.uhr - S.imgT < 30;
    if (f && !frisch()) {
      const a = f[i % f.length];
      later(delay + 3, () => !frisch() && feed(a[0], a[1], a[2], { i: -1 }));
    }
  }
  KERN.on('grenzland:streife', () => react('streife', 6));
  KERN.on('grenzland:boeller', () => react('boeller', 3));
  KERN.on('grenzland:tat', d => d && d.zeugen > 0 && react('tat', 8));
  KERN.on('grenzland:sperre', () => react('sperre', 5));
  KERN.on('grenzland:entkommen', () => react('entkommen', 6));
  KERN.on('grenzland:erwischt', d => {
    if (!GL.on || GL.era !== 'heute') return;
    react('erwischt', 4);
    if (d && d.busse > 0) push('bank', { wer: 'Geldbuße, Landkreis', text: '−' + d.busse + ' €' });
  });
  KERN.on('grenzland:geld', d => {
    if (!GL.on || !d || !d.d) return;
    push('bank', {
      wer: d.why || (d.d > 0 ? 'Eingang' : 'Ausgabe'),
      text: (d.d > 0 ? '+' : '−') + Math.abs(d.d) + ' €',
    });
    if (d.d > 0)
      HANDY.mitteilung({
        app: 'bank',
        von: D.BANK.name,
        text: 'Eingang: +' + d.d + ' € · ' + (d.why || ''),
        still: true,
      });
  });
  KERN.on('grenzland:radio:feature', d => d && d.id === 'sushi' && unlock('sushi'));
  KERN.on('grenzland:era', d => {
    if (!GL.on || !d) return;
    if (d.era === '1989') {
      HANDY.sucher(false, { heim: false });
      close();
    } else unlock('nov89');
  });
  KERN.on('grenzland:radio', d => {
    dirty();
    // a car radio in the village does not go unnoticed (once in a while)
    if (!GL.on || !d || !d.id || !VEH.cur || VEH.cur.id === 'gl-moped' || S.evT.radio > 0) return;
    if (!/Ratscher|Anger|Dorf/.test(hier())) return;
    react('radio', 14);
    S.evT.radio = 300;
  });
  KERN.on('grenzland:radio:sendung', () => {
    if (HANDY.S.app === 'radio') dirty();
  });
  // a fresh game: the chat and the feed have a past; a reload: the notes one had
  KERN.on('grenzland:start', d => {
    S.notes.length = 0;
    S.q.length = 0;
    S.evI = {};
    S.evT = {};
    S.tippt = {};
    if (d && d.fresh && !GL.feed.length) {
      const t = Math.round(CLOCK.t);
      D.CHAT.slice(0, 5).forEach((a, i) => GL.feed.push({ k: 'chat', wer: a[0], text: a[1], t: t - 190 + i * 37, i }));
      D.FEED.slice(0, 3).forEach((a, i) =>
        GL.feed.push({ k: 'feed', wer: a[0], text: a[1], ort: a[2], t: t - 150 + i * 55, i })
      );
      GL.save();
    }
    weltAn();
    for (const q of of('note')) unlock(q.text, true);
    S.chatT = 30;
    S.feedT = 80;
  });
  // ---------------- per frame (the mode's tick; the phone itself runs on its own) ----------------
  function tick(dt) {
    if (!GL.on) return;
    for (let i = S.q.length - 1; i >= 0; i--)
      if ((S.q[i].t -= dt) <= 0) {
        const f = S.q[i].fn;
        S.q.splice(i, 1);
        f();
      }
    if (GL.era === 'heute') {
      // the village talks on: the next line of the chat every minute or so, a post now and then
      if ((S.chatT -= dt) <= 0) {
        S.chatT = 45 + 40 * Math.random();
        const l = of('chat').filter(q => q.i >= 0),
          i = ((l.length ? l[l.length - 1].i : -1) + 1) % D.CHAT.length;
        chat(D.CHAT[i][0], D.CHAT[i][1], { i });
      }
      if ((S.feedT -= dt) <= 0) {
        S.feedT = 110 + 80 * Math.random();
        const l = of('feed').filter(q => q.i >= 0),
          i = ((l.length ? l[l.length - 1].i : -1) + 1) % D.FEED.length;
        feed(D.FEED[i][0], D.FEED[i][1], D.FEED[i][2], { i });
      }
    }
    S.uhr += dt;
    for (const k in S.tippt) if (S.tippt[k] > 0) S.tippt[k] -= dt;
    if ((S.acc += dt) < 0.25) return;
    for (const k in S.evT) if (S.evT[k] > 0) S.evT[k] -= S.acc;
    if (S.fotoT > 0) S.fotoT -= S.acc;
    // the likes and comments of fresh posts count up while one looks; the typing dots
    if (S.open && (S.zaehlT += S.acc) > 1) {
      S.zaehlT = 0;
      if (HANDY.S.app === 'feed' && of('feed').some(q => q.likes && S.uhr - (q.t0 || 0) < 120)) dirty();
      if (HANDY.S.app === 'nachrichten' && Object.values(S.tippt).some(v => v > 0)) dirty();
    }
    S.acc = 0;
  }
  function stop() {
    HANDY.stop();
    if (HANDY.S.wid === 'grenzland') HANDY.welt(null);
    S.cam = null;
    S.q.length = 0;
    S.notes.length = 0;
    S.ziel = null;
    S.zielId = '';
    S.note = -1;
    S.tab = 'sms';
    S.bilder.clear();
    S.fotoT = 0;
    S.imgT = -1e9;
    S.tippt = {};
  }
  // every line the phone speaks (agent stimmen records them)
  function linien() {
    const out = [];
    for (const L of Object.values(RUF))
      for (const [w, text] of L)
        for (const x of w === 'ich' ? ['falko', 'sarah'] : [w])
          if (!out.some(q => q[0] === x && q[1] === text)) out.push([x, text]);
    return out;
  }
  return {
    sms,
    chat: (wer, text) => chat(wer, text, { i: -1 }),
    feed: (wer, text, ort, o) => feed(wer, text, ort, Object.assign({ i: -1 }, o || {})),
    post,
    posts: () => of('feed').map(q => Object.assign({}, q, { img: q.bild ? S.bilder.get(q.bild) || '' : '' })),
    note,
    unlock,
    open,
    close,
    zu: () => HANDY.zu(),
    toggle,
    tab,
    isOpen: () => S.open,
    unread,
    badge,
    kamera,
    foto,
    fotoUI,
    sucher: on => (on ? kameraAuf() : HANDY.sucher(false, { heim: false })),
    cam: () => S.cam,
    ziel: () => S.ziel,
    ruf,
    freischalten,
    kontakte,
    linien,
    tick,
    stop,
    S,
    HANDY,
    HANDYAPPS,
    HANDYPOSE,
  };
})();
window.GLHANDY = GLHANDY;
