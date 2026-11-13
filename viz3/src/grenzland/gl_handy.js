// ===================== feat/grenzland: the phone (GLHANDY) – messages, the village chat, the feed, bank, notes, camera, radio =====================
// T (or the panel's button) takes the phone out: a phone-shaped panel with seven tabs –
//   Nachrichten  the story's messages (GLHANDY.sms(von, text)): newest first, unread ones marked, a badge on the tab, the sound
//   Dorf-Chat    „Ratscher aktuell“ – satire; the invented villagers only. Lines arrive over time and react to what happens: a patrol
//                car in the village, a banger, a deed somebody saw, a road block, an arrest
//   Feed         regional posts and „livestreams“ that point to places: „Auf der Karte zeigen“ emits 'grenzland:ziel' { pos, name }
//   Bank         the money and its last movements (events 'grenzland:geld', the fine of an arrest)
//   Notizen      notes with sources as links (GLHANDY.note): the true story „Sushi in Suhl“ once the radio has told it, what the radio
//                of 10 November 1989 really reported once one is back from there
//   Kamera       a viewfinder over the picture; a mission asks for photos with GLHANDY.kamera({ ziel, r, n, sicht, done, name })
//   Radio        the stations (grenzland/gl_radio.js) to tap, and whether the presenters are read aloud
// It closes with T, Esc, the cross, or when the mouse goes back into the picture. In 1989 nobody has a phone. Built into the page by the
// module itself when first opened; „Beenden“ takes it away. Saved through GL: GL.sms, GL.feed (chat, feed, bank and note entries by k).
// Interface (the core's, kept): GLHANDY.sms(von, text) · chat(wer, text) · feed(wer, text, ort) · note(titel, zeilen, quellen) ·
//   open(tab) → true | false · close() · toggle() · isOpen() · unread() · tick(dt) · stop() · kamera(o | null) · foto() · cam() ·
//   zu() → a promise that resolves when the phone is put away
// Events: 'grenzland:sms' { von, text }, 'grenzland:foto' { n }, 'grenzland:handy' { gelesen }, 'grenzland:ziel' { pos, name }.
import { COARSE, stage } from '../core/head.js';
import { KERN } from '../core/kern.js';
import { P } from '../game/walkable.js';
import { PLAY } from '../game/play.js';
import { HUD } from '../game/hud.js';
import { CLOCK } from '../time/clock.js';
import { VEH } from '../vehicles/vehicle.js';
import { STIMME } from '../audio/stimme.js';
import { GLDATA } from './gl_data.js';
import { GL } from './gl_state.js';
import { GLTON } from './gl_ton.js';
import { GLRDATA } from './gl_radio_data.js';
import { GLRADIO } from './gl_radio.js';
export const GLHANDY = (() => {
  const D = GLRDATA;
  const S = {
    open: false,
    tab: 'sms',
    el: null,
    camEl: null,
    camOn: false,
    cam: null,
    notes: [],
    note: -1,
    q: [],
    chatT: 25,
    feedT: 70,
    evI: {},
    evT: {},
    res: [],
    dirty: false,
    acc: 0,
    ziel: null,
    frei: 0,
    unlocked: false,
  };
  const TABS = [
    ['sms', 'Nachrichten', 'SMS', 'M4 5h16v11H9l-5 4z'],
    ['chat', 'Dorf-Chat', 'Chat', 'M3 4h12v8H8l-3 3v-3H3zM17 9h4v8h-2v3l-3-3h-5v-3h6z'],
    ['feed', 'Feed', 'Feed', 'M4 5h16v3H4zM4 10.5h16v3H4zM4 16h10v3H4z'],
    ['bank', 'Bank', 'Bank', 'M12 3l9 5v2H3V8zM5 11h2v6H5zM9 11h2v6H9zM13 11h2v6h-2zM17 11h2v6h-2zM3 18h18v3H3z'],
    ['notiz', 'Notizen', 'Notizen', 'M6 3h9l4 4v14H6zM8 10h8v1.6H8zM8 13.5h8v1.6H8zM8 17h5v1.6H8z'],
    ['kamera', 'Kamera', 'Kamera', 'M4 7h4l1.5-2h5L16 7h4v12H4zM12 9.5a3.5 3.5 0 100 7 3.5 3.5 0 000-7z'],
    [
      'radio',
      'Radio',
      'Radio',
      'M4 9h16v11H4zM6.4 8.2l10-4 .6 1.4-10 4zM7.5 14.5a3 3 0 106 0 3 3 0 00-6 0zM15.5 12h3v1.5h-3zM15.5 15h3v1.5h-3z',
    ],
  ];
  const CSS = `
#glhandy{position:absolute;right:max(16px,env(safe-area-inset-right,0px));bottom:calc(16px + env(safe-area-inset-bottom,0px));z-index:9;width:300px;
  height:min(570px,calc(100% - 140px));display:flex;flex-direction:column;background:#0c0e12;color:#eef0f2;border:2px solid #343942;border-radius:30px;
  box-shadow:0 14px 40px rgba(0,0,0,.55),inset 0 0 0 3px #15181d;padding:10px 9px 9px;font:400 13px/1.38 var(--f-body,system-ui);pointer-events:auto;user-select:none}
#glhandy[hidden],#glcam[hidden]{display:none!important}
#glhandy .ht{display:flex;justify-content:space-between;align-items:center;padding:0 12px 4px;font:600 11px/1 var(--f-mono,monospace);opacity:.85}
#glhandy .ht i{font-style:normal;letter-spacing:1px}
#glhandy .hk{display:flex;align-items:center;justify-content:space-between;gap:8px;padding:6px 10px 8px}
#glhandy .hk b{font:700 17px/1.2 var(--f-body,system-ui)} #glhandy .hk small{display:block;font:400 11px/1.3 var(--f-body,system-ui);opacity:.65}
#glhandy .hk button{width:30px;height:30px;border-radius:50%;border:0;background:rgba(255,255,255,.12);color:#fff;font:400 19px/1 system-ui;cursor:pointer;flex:none}
#glhandy .hb{flex:1;min-height:0;overflow-y:auto;overscroll-behavior:contain;-webkit-overflow-scrolling:touch;border-radius:14px;background:#151920;padding:8px}
#glhandy .hn{display:flex;gap:1px;padding-top:7px}
#glhandy .hn button{position:relative;flex:1;min-width:0;overflow:hidden;white-space:nowrap;border:0;background:none;color:#aab0b8;padding:5px 0 3px;border-radius:9px;cursor:pointer;font:500 9px/1.2 var(--f-body,system-ui)}
#glhandy .hn button svg{display:block;width:21px;height:21px;margin:0 auto 2px;fill:currentColor}
#glhandy .hn button[aria-selected="true"]{color:#fff;background:rgba(255,255,255,.12)}
#glhandy .hn button em{position:absolute;top:0;right:calc(50% - 19px);min-width:15px;height:15px;border-radius:8px;background:#e5484d;color:#fff;font:700 10px/15px system-ui;font-style:normal;padding:0 3px}
#glhandy .leer{opacity:.6;text-align:center;padding:26px 10px}
#glhandy .msg{background:#202630;border-radius:12px;padding:8px 10px;margin-bottom:7px}
#glhandy .msg.neu{background:#263649;box-shadow:inset 3px 0 0 #5aa2ff}
#glhandy .msg h5{margin:0 0 2px;display:flex;justify-content:space-between;gap:8px;font:600 12px/1.3 var(--f-body,system-ui);color:#9cc4ff}
#glhandy .msg h5 time{font:400 10px/1.5 var(--f-mono,monospace);color:#8d949d}
#glhandy .ch{margin:0 28px 6px 0;background:#1f2a22;border-radius:4px 12px 12px 12px;padding:6px 9px}
#glhandy .ch b{display:block;font:600 11px/1.3 var(--f-body,system-ui)}
#glhandy .ch time{float:right;font:400 9px/1.6 var(--f-mono,monospace);opacity:.55;margin-left:8px}
#glhandy .zu{margin-top:8px;padding:7px 10px;border-radius:16px;background:#202630;font-size:11px;opacity:.6}
#glhandy .po{background:#202630;border-radius:12px;padding:9px 10px;margin-bottom:8px}
#glhandy .po h5{margin:0 0 4px;display:flex;align-items:center;gap:7px;font:600 12px/1.2 var(--f-body,system-ui)}
#glhandy .po h5 i{flex:none;width:22px;height:22px;border-radius:50%;background:#3c6e58;color:#fff;font:700 11px/22px system-ui;text-align:center;font-style:normal}
#glhandy .po h5 u{text-decoration:none;margin-left:auto;background:#e5484d;color:#fff;border-radius:4px;padding:1px 5px;font:700 9px/1.5 system-ui;letter-spacing:.06em}
#glhandy .po button,#glhandy .kn{margin-top:7px;border:0;border-radius:999px;background:rgba(255,255,255,.14);color:#fff;padding:7px 12px;font:500 12px/1 var(--f-body,system-ui);cursor:pointer}
#glhandy .bk{text-align:center;padding:14px 6px 10px}
#glhandy .bk strong{display:block;font:700 30px/1.2 var(--f-mono,monospace);color:#8fe08a}
#glhandy .bk small{opacity:.65}
#glhandy .bw{display:flex;justify-content:space-between;gap:10px;padding:7px 4px;border-top:1px solid rgba(255,255,255,.09)}
#glhandy .bw span:last-child{font:600 12px/1.4 var(--f-mono,monospace);white-space:nowrap} #glhandy .bw .plus{color:#8fe08a} #glhandy .bw .minus{color:#ff9a8f}
#glhandy .nt{display:block;width:100%;text-align:left;border:0;background:#202630;color:inherit;border-radius:12px;padding:10px;margin-bottom:7px;font:600 13px/1.3 var(--f-body,system-ui);cursor:pointer}
#glhandy .nz p{margin:0 0 8px} #glhandy .nz h6{margin:10px 0 4px;font:600 11px/1.3 var(--f-body,system-ui);opacity:.7;text-transform:uppercase;letter-spacing:.06em}
#glhandy .nz a{display:block;color:#9cc4ff;font-size:12px;margin-bottom:6px;word-break:break-word}
#glhandy .rs{display:flex;width:100%;gap:9px;align-items:baseline;text-align:left;border:0;background:#202630;color:inherit;border-radius:10px;padding:9px 10px;margin-bottom:6px;font:500 13px/1.25 var(--f-body,system-ui);cursor:pointer}
#glhandy .rs span{font:600 12px/1 var(--f-mono,monospace);color:#ffb648;min-width:40px} #glhandy .rs small{display:block;opacity:.6;font-size:11px}
#glhandy .rs[aria-current="true"]{background:#3a3020;box-shadow:inset 3px 0 0 #ffb648}
#glhandy .jetzt{padding:4px 4px 10px;font-size:12px;opacity:.85}
#glhandy label.sw{display:flex;align-items:center;gap:8px;padding:8px 4px;font-size:12px;cursor:pointer}
#glcam{position:absolute;inset:0;z-index:9;pointer-events:none;color:#fff;font:500 13px/1.3 var(--f-body,system-ui)}
#glcam .ra{position:absolute;inset:9% 12%;border:1px solid rgba(255,255,255,.25)}
#glcam .ra i{position:absolute;width:34px;height:34px;border:3px solid #fff;filter:drop-shadow(0 0 3px rgba(0,0,0,.8))}
#glcam .ra i:nth-child(1){left:-2px;top:-2px;border-right:0;border-bottom:0} #glcam .ra i:nth-child(2){right:-2px;top:-2px;border-left:0;border-bottom:0}
#glcam .ra i:nth-child(3){left:-2px;bottom:-2px;border-right:0;border-top:0} #glcam .ra i:nth-child(4){right:-2px;bottom:-2px;border-left:0;border-top:0}
#glcam .ra b{position:absolute;left:50%;top:50%;width:26px;height:26px;margin:-13px;border:2px solid rgba(255,255,255,.85);border-radius:50%}
#glcam.gut .ra i,#glcam.gut .ra b{border-color:#8fe08a}
#glcam .ci{position:absolute;left:50%;top:calc(9% + 10px);transform:translateX(-50%);background:rgba(10,12,14,.72);border-radius:8px;padding:6px 12px;text-align:center;white-space:nowrap}
#glcam .ci b{color:#ffd36a;margin-right:8px;font:700 13px/1 var(--f-mono,monospace)}
#glcam .cb{position:absolute;left:50%;bottom:calc(86px + env(safe-area-inset-bottom,0px));transform:translateX(-50%);display:flex;gap:12px;pointer-events:auto}
#glcam .cb button{border:0;border-radius:999px;padding:13px 22px;font:600 15px/1 var(--f-body,system-ui);cursor:pointer;background:rgba(20,24,30,.82);color:#fff}
#glcam .cb button:first-child{background:#fff;color:#111}
#glcam .cb button kbd{font:600 11px/1 var(--f-mono,monospace);opacity:.6;margin-left:6px}
#glcam .bl{position:absolute;inset:0;background:#fff;opacity:0}
#glcam.blitz .bl{animation:glblitz .28s ease-out}
@keyframes glblitz{0%{opacity:.9}100%{opacity:0}}
@media (max-width:720px){#glhandy{right:50%;transform:translateX(50%);bottom:calc(8px + env(safe-area-inset-bottom,0px));width:min(350px,95vw);height:min(600px,calc(100% - 70px))}}
@media (orientation:landscape) and (max-height:500px){#glhandy{right:max(8px,env(safe-area-inset-right,0px));transform:none;bottom:6px;width:min(400px,56vw);height:calc(100% - 12px);border-radius:22px;padding:7px}
  #glhandy .ht{display:none} #glhandy .hk{padding:2px 8px 5px} #glhandy .hn button{font-size:0} #glhandy .hn button svg{margin-bottom:0}}
`;
  const esc = t => String(t).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
  const hhmm = t => {
    const m = ((Math.floor(t) % 1440) + 1440) % 1440;
    return String(Math.floor(m / 60)).padStart(2, '0') + ':' + String(m % 60).padStart(2, '0');
  };
  const NAMEC = ['#8fd3a0', '#9cc4ff', '#ffb648', '#ff9a8f', '#d7a8ff', '#7fe0d8', '#f0e27a', '#ffa6d0'];
  const colOf = n => NAMEC[(n.charCodeAt(0) + n.length * 3) % NAMEC.length];
  // ---------------- what is kept (GL.sms, GL.feed) ----------------
  const of = k => GL.feed.filter(q => q.k === k);
  const CAP = { chat: 16, feed: 10, bank: 8, note: 4 };
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
    S.dirty = true;
  }
  function sms(von, text) {
    GL.sms.push({ von: String(von), text: String(text), t: Math.round(CLOCK.t), neu: true });
    if (GL.sms.length > 40) GL.sms.shift();
    GL.save();
    GLTON.fx('sms');
    if (!(S.open && S.tab === 'sms')) PLAY.think('Nachricht von ' + von + ' (Handy: T)', 3200);
    GL.emit('sms', { von, text });
    S.dirty = true;
  }
  const chat = (wer, text, o) =>
    push('chat', Object.assign({ wer: String(wer), text: String(text), neu: !(S.open && S.tab === 'chat') }, o));
  const feed = (wer, text, ort, o) =>
    push(
      'feed',
      Object.assign({ wer: String(wer), text: String(text), ort: ort || '', neu: !(S.open && S.tab === 'feed') }, o)
    );
  function note(titel, zeilen, quellen) {
    if (S.notes.some(n => n.titel === titel)) return false;
    S.notes.push({ titel, zeilen: [].concat(zeilen || []), quellen: quellen || [] });
    S.dirty = true;
    return true;
  }
  // a note the phone knows by itself (kept over a reload by its id)
  function unlock(id, quiet) {
    const N = D.NOTIZ[id];
    if (!N || !note(N.titel, N.zeilen, N.quellen)) return false;
    if (!of('note').some(q => q.text === id)) push('note', { wer: 'Notiz', text: id });
    if (!quiet) {
      GLTON.fx('tick');
      PLAY.think('Notiz im Handy: ' + N.titel, 3600);
    }
    return true;
  }
  const unread = () => GL.sms.filter(q => q.neu).length;
  const badge = k => (k === 'sms' ? unread() : k === 'chat' || k === 'feed' ? of(k).filter(q => q.neu).length : 0);

  // ---------------- the panel ----------------
  function build() {
    if (S.el) return;
    const st = document.createElement('style');
    st.textContent = CSS;
    document.head.appendChild(st);
    const root = stage || document.body,
      el = document.createElement('div');
    el.id = 'glhandy';
    el.hidden = true;
    el.setAttribute('role', 'dialog');
    el.setAttribute('aria-label', 'Handy');
    el.innerHTML =
      '<div class="ht"><span id="hyzeit"></span><i id="hynetz"></i></div>' +
      '<div class="hk"><div><b id="hytitel"></b><small id="hysub"></small></div><button type="button" data-x aria-label="Handy weglegen">×</button></div>' +
      '<div class="hb" id="hybody"></div><nav class="hn" role="tablist">' +
      TABS.map(
        ([k, n, kurz, d]) =>
          `<button type="button" role="tab" data-tab="${k}" aria-label="${n}" title="${n}"><svg viewBox="0 0 24 24" fill-rule="evenodd"><path d="${d}"/></svg>${kurz}</button>`
      ).join('') +
      '</nav>';
    root.appendChild(el);
    S.el = el;
    el.addEventListener('click', onClick);
    el.addEventListener('change', e => {
      if (e.target && e.target.id === 'hystimme') GLRADIO.stimme(e.target.checked, e.target.checked);
    });
    const cam = document.createElement('div');
    cam.id = 'glcam';
    cam.hidden = true;
    cam.innerHTML =
      '<div class="bl"></div><div class="ra"><i></i><i></i><i></i><i></i><b></b></div><div class="ci"><b id="glcamn"></b><span id="glcamt"></span></div>' +
      '<div class="cb"><button type="button" data-c="foto">Foto<kbd>E</kbd></button><button type="button" data-c="zu">Schließen<kbd>T</kbd></button></div>';
    root.appendChild(cam);
    S.camEl = cam;
    cam.addEventListener('click', e => {
      const b = e.target.closest('button');
      if (!b) return;
      if (b.dataset.c === 'foto') fotoUI();
      else camShow(false);
      b.blur();
    });
  }
  function onClick(e) {
    const t = e.target.closest('button, a');
    if (!t) return;
    if (t.tagName === 'A') return;
    if (t.dataset.x !== undefined) return close();
    if (t.dataset.tab) return tab(t.dataset.tab);
    if (t.dataset.ort) return zeig(t.dataset.ort);
    if (t.dataset.note !== undefined) {
      S.note = +t.dataset.note;
      return render();
    }
    if (t.dataset.s !== undefined) {
      GLRADIO.tune(t.dataset.s || null);
      return render();
    }
    if (t.dataset.cam !== undefined) return camShow(true);
  }
  // a post's place as a goal: the event for whoever draws markers, and a word on where it is
  function zeig(ort) {
    const O = GLDATA.ORTE[ort];
    if (!O) return;
    S.ziel = { pos: O.pos.slice(), name: O.name };
    GL.emit('ziel', { pos: O.pos.slice(), name: O.name });
    const w = KERN.where(),
      dx = O.pos[0] - w[0],
      dy = O.pos[1] - w[1],
      d = Math.hypot(dx, dy),
      dir = ['Norden', 'Nordosten', 'Osten', 'Südosten', 'Süden', 'Südwesten', 'Westen', 'Nordwesten'][
        Math.round((((Math.atan2(dx, dy) * 180) / Math.PI + 360) % 360) / 45) % 8
      ];
    PLAY.think(
      O.name +
        ': ' +
        (d < 950 ? Math.round(d / 10) * 10 + ' m' : (d / 1000).toFixed(1).replace('.', ',') + ' km') +
        ' nach ' +
        dir +
        '.',
      4200
    );
    GLTON.fx('tick');
  }
  function tab(k) {
    if (!TABS.some(q => q[0] === k)) k = 'sms';
    S.tab = k;
    S.note = -1;
    render();
  }
  const BODY = {
    sms() {
      const l = GL.sms.slice().reverse();
      const h = l.length
        ? l
            .map(
              q =>
                `<div class="msg${q.neu ? ' neu' : ''}"><h5>${esc(q.von)}<time>${hhmm(q.t || 0)}</time></h5>${esc(q.text)}</div>`
            )
            .join('')
        : '<div class="leer">Keine Nachrichten.<br>Ruhe ist auch eine Nachricht.</div>';
      for (const q of GL.sms) q.neu = false;
      return [h, 'Nachrichten', l.length + (l.length === 1 ? ' Nachricht' : ' Nachrichten')];
    },
    chat() {
      const l = of('chat');
      const h =
        l
          .map(
            q =>
              `<div class="ch"><time>${hhmm(q.t || 0)}</time><b style="color:${colOf(q.wer)}">${esc(q.wer)}</b>${esc(q.text)}</div>`
          )
          .join('') + '<div class="zu">Schreiben darf hier nur, wer seit drei Generationen im Dorf wohnt.</div>';
      for (const q of l) q.neu = false;
      return [h, 'Ratscher aktuell', 'Dorf-Chat · 43 Mitglieder · stumm'];
    },
    feed() {
      const l = of('feed').slice().reverse();
      const h = l
        .map(q => {
          const live = /^LIVE/.test(q.text),
            O = q.ort && GLDATA.ORTE[q.ort];
          return (
            `<div class="po"><h5><i>${esc(q.wer.charAt(0).toUpperCase())}</i>${esc(q.wer)}${live ? '<u>LIVE</u>' : ''}</h5>${esc(q.text.replace(/^LIVE:\s*/, ''))}` +
            (O
              ? `<div><button type="button" data-ort="${esc(q.ort)}">Auf der Karte zeigen · ${esc(O.name)}</button></div>`
              : '') +
            '</div>'
          );
        })
        .join('');
      for (const q of l) q.neu = false;
      return [h || '<div class="leer">Nichts los im Landkreis.</div>', 'Feed', 'Südthüringen, ungefiltert'];
    },
    bank() {
      const l = of('bank').slice().reverse();
      const h =
        `<div class="bk"><small>Kontostand</small><strong>${GL.geld} €</strong><small>${esc(D.BANK.claim)}</small></div>` +
        (l.length
          ? l
              .map(
                q =>
                  `<div class="bw"><span>${esc(q.wer)}<br><small>${hhmm(q.t || 0)} Uhr</small></span><span class="${/^\+/.test(q.text) ? 'plus' : 'minus'}">${esc(q.text)}</span></div>`
              )
              .join('')
          : '<div class="leer">Noch keine Bewegungen.</div>');
      return [h, 'Bank', D.BANK.name];
    },
    notiz() {
      const N = S.notes[S.note];
      if (N)
        return [
          '<div class="nz">' +
            N.zeilen.map(z => `<p>${esc(z)}</p>`).join('') +
            (N.quellen.length
              ? '<h6>Quellen</h6>' +
                N.quellen
                  .map(q => `<a href="${esc(q[1])}" target="_blank" rel="noopener noreferrer">${esc(q[0])}</a>`)
                  .join('')
              : '') +
            '<button type="button" class="kn" data-note="-1">Alle Notizen</button></div>',
          N.titel,
          'Notiz',
        ];
      return [
        S.notes.length
          ? S.notes.map((n, i) => `<button type="button" class="nt" data-note="${i}">${esc(n.titel)}</button>`).join('')
          : '<div class="leer">Noch keine Notizen.<br>Wer Radio hört, erfährt mehr.</div>',
        'Notizen',
        S.notes.length + (S.notes.length === 1 ? ' Notiz' : ' Notizen'),
      ];
    },
    kamera() {
      const c = S.cam;
      return [
        '<div class="leer">' +
          (c ? `Auftrag: ${esc(c.name || 'Fotos')} – ${c.got} von ${c.n}.` : 'Kein Auftrag. Fotos gehen trotzdem.') +
          '<br><button type="button" class="kn" data-cam>Kamera öffnen</button></div>',
        'Kamera',
        c ? 'Sucher: Motiv in die Mitte, dann auslösen' : '',
      ];
    },
    radio() {
      const n = GLRADIO.now(),
        cur = GLRADIO.cur();
      return [
        `<div class="jetzt">${n.id ? '<b>' + esc(n.name) + '</b> · ' + esc(n.text || '…') : 'Das Radio ist aus.'}</div>` +
          GLRADIO.stations()
            .map(
              s =>
                `<button type="button" class="rs" data-s="${s.id}" aria-current="${s.id === cur}"><span>${esc(s.freq)}</span><div>${esc(s.name)}<small>${esc(s.art)}</small></div></button>`
            )
            .join('') +
          `<button type="button" class="rs" data-s="" aria-current="${!cur}"><span>–</span><div>Radio aus</div></button>` +
          `<label class="sw"><input type="checkbox" id="hystimme"${GLRADIO.spricht() ? ' checked' : ''}> Sprecher vorlesen (mit deinen Stimmen` +
          (STIMME.engineName === 'eleven' ? ' – kostet Guthaben' : '') +
          ')</label>',
        'Radio',
        'R: nächster Sender',
      ];
    },
  };
  function render() {
    if (!S.el) return;
    S.dirty = false;
    const [h, titel, sub] = BODY[S.tab]();
    const body = S.el.querySelector('#hybody'),
      keep = S.tab === 'chat' ? 1e9 : S.lastTab === S.tab ? body.scrollTop : 0;
    body.innerHTML = h;
    body.scrollTop = keep;
    S.lastTab = S.tab;
    S.el.querySelector('#hytitel').textContent = titel;
    S.el.querySelector('#hysub').textContent = sub || '';
    for (const b of S.el.querySelectorAll('.hn button')) {
      const k = b.dataset.tab,
        n = badge(k);
      b.setAttribute('aria-selected', k === S.tab ? 'true' : 'false');
      let em = b.querySelector('em');
      if (n && !em) em = b.appendChild(document.createElement('em'));
      if (em) {
        if (n) em.textContent = n > 9 ? '9+' : n;
        else em.remove();
      }
    }
    status();
    GL.save();
  }
  // the top line: the game's time, and the bars – thin in the woods
  function status() {
    if (!S.el) return;
    S.el.querySelector('#hyzeit').textContent = hhmm(CLOCK.t);
    const w = KERN.where(),
      ort = String(KERN.place(w[0], w[1], 0) || ''),
      n = /Klinge|Wald|Forst/.test(ort) ? 1 : /Schleusingen|Ratscher|Anger|Dorf/.test(ort) ? 4 : 3;
    S.el.querySelector('#hynetz').textContent = '▂▃▅▇'.slice(0, n) + '·'.repeat(4 - n) + (n === 1 ? ' Funkloch' : '');
  }
  // takes the phone out (true) – unless it is 1989 or the mode is off (false). (No promise: a test's evaluate would wait for it forever.)
  function open(t) {
    if (!GL.on) return false;
    if (GL.era === '1989') {
      PLAY.think('1989 hat hier niemand ein Telefon in der Tasche. Die nächste Zelle steht am Konsum.', 3600);
      return false;
    }
    build();
    camShow(false);
    if (typeof t === 'string' && TABS.some(q => q[0] === t)) S.tab = t;
    else if (!S.open && unread()) S.tab = 'sms';
    else if (!S.open && S.cam) S.tab = 'kamera';
    S.note = -1;
    S.gelesen = unread();
    if (S.tab === 'kamera' && S.cam && t === 'kamera') {
      camShow(true);
      return true;
    }
    S.open = true;
    S.el.hidden = false;
    render();
    if (document.pointerLockElement) {
      S.unlocked = true;
      try {
        HUD.unlock();
      } catch (e) {}
    }
    return true;
  }
  // a promise for whoever wants to go on when the phone is put away (at once if it is not out)
  const zu = () =>
    new Promise(res => {
      if (!S.open) res();
      else S.res.push(res);
    });
  function close() {
    if (!S.open) return;
    S.open = false;
    if (S.el) S.el.hidden = true;
    GL.save();
    for (const r of S.res.splice(0)) r();
    if (S.unlocked) {
      S.unlocked = false;
      if (!S.camOn)
        try {
          HUD.lockNow();
        } catch (e) {}
    }
    GL.emit('handy', { gelesen: S.gelesen || 0 });
  }
  const toggle = () => {
    if (S.camOn) return camShow(false);
    return S.open ? close() : open();
  };
  // ---------------- the camera ----------------
  function kamera(o) {
    S.cam = o ? Object.assign({ got: 0, n: 1, r: 40 }, o) : null;
    if (!o) camShow(false);
    S.dirty = true;
  }
  function camShow(on) {
    if (!on && !S.camOn) return;
    build();
    if (on && S.open) close();
    S.camOn = !!on;
    S.camEl.hidden = !on;
    S.camEl.classList.remove('blitz');
    if (on) {
      camStatus();
      // the mouse looks around again
      try {
        if (!COARSE) HUD.lockNow();
      } catch (e) {}
    }
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
  function camStatus() {
    if (!S.camOn) return;
    const c = S.cam,
      s = camSee(),
      ok = !!s && s.nah && s.vorn && s.sicht;
    S.camEl.classList.toggle('gut', ok);
    S.camEl.querySelector('#glcamn').textContent = c ? 'FOTO ' + c.got + '/' + c.n : 'FOTO';
    S.camEl.querySelector('#glcamt').textContent = !c
      ? 'Kein Auftrag – einfach knipsen'
      : ok
        ? 'Motiv im Bild – auslösen'
        : !s.nah
          ? 'Zu weit weg (' + Math.round(s.d) + ' m)'
          : !s.sicht
            ? 'Von hier sieht man nichts'
            : s.a > 0
              ? 'Motiv weiter rechts'
              : 'Motiv weiter links';
  }
  function knips() {
    GLTON.fx('foto');
    if (S.camEl && S.camOn) {
      S.camEl.classList.remove('blitz');
      void S.camEl.offsetWidth;
      S.camEl.classList.add('blitz');
    }
  }
  // a photo for the mission (the core's rule: the target within reach and in sight)
  function foto() {
    const c = S.cam;
    if (!c) return false;
    const s = camSee();
    if (!s.nah || !s.sicht) {
      PLAY.think('Von hier sieht man nichts.', 1800);
      return false;
    }
    c.got++;
    knips();
    GL.emit('foto', { n: c.got });
    if (c.got >= c.n) {
      S.cam = null;
      PLAY.think('Alle Fotos im Kasten.', 2200);
      setTimeout(() => camShow(false), window.FREEZE ? 0 : 700);
      if (c.done) c.done();
    } else PLAY.think('Foto ' + c.got + ' von ' + c.n + '.', 1500);
    camStatus();
    S.dirty = true;
    return true;
  }
  // the viewfinder's button: the target must be in the picture; without a mission a snapshot
  function fotoUI() {
    if (!S.cam) {
      knips();
      S.frei++;
      PLAY.think('Foto gespeichert. Künstlerisch wertvoll.', 1600);
      return true;
    }
    const s = camSee();
    if (s.nah && s.sicht && !s.vorn) {
      PLAY.think('Das Motiv ist nicht im Bild.', 1600);
      return false;
    }
    return foto();
  }
  // ---------------- keys ----------------
  window.addEventListener(
    'keydown',
    e => {
      if (!GL.on || (!S.open && !S.camOn) || e.ctrlKey || e.metaKey || e.altKey) return;
      const k = e.key;
      let hit = true;
      if (k === 'Escape') S.camOn ? camShow(false) : close();
      else if (S.camOn && (k === 'e' || k === 'E' || k === 'Enter' || k === ' ')) {
        if (!e.repeat) fotoUI();
      } else if (S.open && /^[1-7]$/.test(k)) tab(TABS[+k - 1][0]);
      else hit = false;
      if (hit) {
        e.preventDefault();
        e.stopImmediatePropagation();
      }
    },
    true
  );
  // the mouse back in the picture: the phone is put away
  document.addEventListener('pointerlockchange', () => {
    if (document.pointerLockElement && S.open) {
      S.unlocked = false;
      close();
    }
  });
  // ---------------- what happens ----------------
  const later = (sec, fn) => S.q.push({ t: sec, fn });
  // a reaction of the chat and the feed to an event (not twice within a while)
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
    if (f) {
      const a = f[i % f.length];
      later(delay + 3, () => feed(a[0], a[1], a[2], { i: -1 }));
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
  });
  KERN.on('grenzland:radio:feature', d => d && d.id === 'sushi' && unlock('sushi'));
  KERN.on('grenzland:era', d => {
    if (!GL.on || !d) return;
    if (d.era === '1989') {
      close();
      camShow(false);
    } else unlock('nov89');
  });
  KERN.on('grenzland:radio', d => {
    S.dirty = true;
    // a car radio in the village does not go unnoticed (once in a while)
    if (!GL.on || !d || !d.id || !VEH.cur || VEH.cur.id === 'gl-moped' || S.evT.radio > 0) return;
    const w = KERN.where();
    if (!/Ratscher|Anger|Dorf/.test(String(KERN.place(w[0], w[1], 0) || ''))) return;
    react('radio', 14);
    S.evT.radio = 300;
  });
  KERN.on('grenzland:radio:sendung', () => {
    if (S.tab === 'radio') S.dirty = true;
  });
  // a fresh game: the chat and the feed have a past; a reload: the notes one had
  KERN.on('grenzland:start', d => {
    S.notes.length = 0;
    S.q.length = 0;
    S.evI = {};
    S.evT = {};
    if (d && d.fresh && !GL.feed.length) {
      const t = Math.round(CLOCK.t);
      D.CHAT.slice(0, 5).forEach((a, i) => GL.feed.push({ k: 'chat', wer: a[0], text: a[1], t: t - 190 + i * 37, i }));
      D.FEED.slice(0, 3).forEach((a, i) =>
        GL.feed.push({ k: 'feed', wer: a[0], text: a[1], ort: a[2], t: t - 150 + i * 55, i })
      );
      GL.save();
    }
    for (const q of of('note')) unlock(q.text, true);
    S.chatT = 30;
    S.feedT = 80;
  });
  // ---------------- per frame ----------------
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
    if ((S.acc += dt) < 0.25) return;
    for (const k in S.evT) if (S.evT[k] > 0) S.evT[k] -= S.acc;
    S.acc = 0;
    if (S.open) {
      if (S.dirty) render();
      else status();
    }
    if (S.camOn) camStatus();
  }
  function stop() {
    close();
    camShow(false);
    S.cam = null;
    S.q.length = 0;
    S.notes.length = 0;
    S.ziel = null;
    S.note = -1;
    S.tab = 'sms';
  }
  return {
    sms,
    chat: (wer, text) => chat(wer, text, { i: -1 }),
    feed: (wer, text, ort) => feed(wer, text, ort, { i: -1 }),
    note,
    unlock,
    open,
    close,
    zu,
    toggle,
    tab,
    isOpen: () => S.open,
    unread,
    badge,
    kamera,
    foto,
    fotoUI,
    sucher: camShow,
    cam: () => S.cam,
    ziel: () => S.ziel,
    tick,
    stop,
    S,
  };
})();
window.GLHANDY = GLHANDY;
