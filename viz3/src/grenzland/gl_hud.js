// ===================== feat/grenzland: what one sees of the mode – stars, money, who plays, messages, choices, the look of 1989 (GLHUD) =====================
// A small panel (top right on wide screens, folded on a phone): who plays (Falko or Sarah), the money, the five stars of the wanted level –
// hollow while the police only have a description, filled once they know who it is, fading while the search runs out –, what the police
// are doing, and the buttons (Wechseln, Handy, Radio, Folgen/Warten, Böller, Beenden). Big lines for a chapter or an arrest, subtitles for
// what people say, a panel of choices (a talk's answers, the shop, a plan), a fade for the journeys in time. In 1989 the picture is graded
// like a faded colour photograph of the time (less colour, a brownish cast, soft dark corners, grain) – a CSS filter on the stage's canvas
// and two overlays; nothing of the renderer changes. Built into the page by the module itself (style and elements), shown only while GL.on;
// the game's own task card (game/quests.js) stays and shows the mission.
import { COARSE, stage } from '../core/head.js';
import { KERN } from '../core/kern.js';
import { GLLOGIK } from './gl_logik.js';
import { GLDATA } from './gl_data.js';
import { GL } from './gl_state.js';
export const GLHUD = (() => {
  const S = {
    el: null,
    shown: false,
    acts: {},
    last: '',
    msgT: 0,
    subT: 0,
    passT: 0,
    ortT: 0,
    funkT: 0,
    ask: null,
    folded: false,
    tip: '',
    xl: '',
    neu: 0, // unread messages on the phone (the mode feeds it)
    pol: null, // what the police are doing: { offen: [{ wer, t }], fz, hidden, heli } (the mode feeds it from GLFAHNDUNG.stand())
  };
  const CSS = `
#glhud{position:absolute;top:66px;right:max(12px,env(safe-area-inset-right,0px));z-index:6;width:min(250px,44vw);background:rgba(14,18,22,.66);color:#eef1f2;
  border-radius:10px;padding:8px 10px 9px;font:400 12px/1.35 var(--f-body,system-ui);backdrop-filter:blur(5px);pointer-events:auto;user-select:none}
#glhud[hidden],#glmsg[hidden],#glsub[hidden],#glwahl[hidden],#glfade[hidden],#gltouch[hidden],#glbust[hidden],#glpass[hidden]{display:none!important}
#glhud .gt{display:flex;justify-content:space-between;align-items:baseline;gap:8px;cursor:pointer}
#glhud .gt b{font:700 11px/1.3 var(--f-mono,monospace);letter-spacing:.09em;text-transform:uppercase;color:#f3c64f}
#glhud .gt em{font:600 13px/1.2 var(--f-mono,monospace);font-style:normal;color:#8fe08a}
#glhud .gs{display:flex;align-items:center;gap:3px;margin-top:5px;font-size:19px;line-height:1;letter-spacing:1px}
#glhud .gs i{font-style:normal;color:rgba(255,255,255,.2);transition:color .2s,opacity .3s}
#glhud .gs i.on{color:#f3c64f} #glhud .gs i.hohl{color:transparent;-webkit-text-stroke:1.4px #f3c64f}
#glhud .gs i.blink{animation:glbl .7s steps(2) infinite}
@keyframes glbl{50%{opacity:.25}}
#glhud .gw{margin-top:3px;min-height:15px;font:500 11px/1.35 var(--f-body,system-ui);opacity:.9}
#glhud .gn{margin-top:5px;padding-top:5px;border-top:1px solid rgba(255,255,255,.13);display:flex;justify-content:space-between;gap:6px}
#glhud .gn b{font-weight:600} #glhud .gn span{opacity:.8;font:500 11px/1.3 var(--f-mono,monospace)}
#glhud .gx{margin-top:6px;display:flex;gap:5px;flex-wrap:wrap}
#glhud .gx button{font:500 11px/1 var(--f-body,system-ui);color:#eef1f2;background:rgba(255,255,255,.13);border:0;border-radius:999px;padding:6px 9px;cursor:pointer}
#glhud .gx button:hover{background:rgba(255,255,255,.24)} #glhud .gx button[data-g="end"]{opacity:.7}
#glhud .gx button b{font:600 10px/1 var(--f-mono,monospace);opacity:.65;margin-left:4px}
#glhud.gmin .gw,#glhud.gmin .gn,#glhud.gmin .gx{display:none!important}
#glhud .gh{margin-top:5px;font:500 11px/1.35 var(--f-body,system-ui);color:#f3c64f}
#glhud .gh:empty{display:none}
body[data-gl-era="1989"] #glhud .gt b{color:#d8c79a}
#glmsg{position:absolute;left:50%;top:22%;transform:translateX(-50%);z-index:7;max-width:min(740px,88vw);text-align:center;pointer-events:none;
  color:#fff7e6;font:700 clamp(19px,3.3vw,32px)/1.25 var(--f-display,Georgia,serif);text-shadow:0 2px 14px rgba(0,0,0,.9);letter-spacing:.01em}
#glmsg small{display:block;margin-top:8px;font:400 clamp(13px,1.8vw,16px)/1.4 var(--f-body,system-ui);opacity:.92}
#glsub{position:absolute;left:50%;bottom:calc(150px + env(safe-area-inset-bottom,0px));transform:translateX(-50%);z-index:7;max-width:min(680px,90vw);
  background:rgba(10,12,14,.72);color:#fff;border-radius:8px;padding:8px 13px;font:400 15px/1.4 var(--f-body,system-ui);text-align:center;pointer-events:none}
#glsub b{color:#f3c64f;font-weight:600;margin-right:6px}
#glfunk{position:absolute;left:50%;bottom:calc(206px + env(safe-area-inset-bottom,0px));transform:translateX(-50%);z-index:6;max-width:min(620px,86vw);
  color:#f4ecd6;font:italic 400 13px/1.4 var(--f-body,system-ui);text-align:center;pointer-events:none;text-shadow:0 1px 6px rgba(0,0,0,.95)}
#glfunk b{font-style:normal;font-weight:600;color:#f3c64f;margin-right:6px} #glfunk[hidden]{display:none!important}
#glwahl{position:absolute;left:50%;bottom:calc(150px + env(safe-area-inset-bottom,0px));transform:translateX(-50%);z-index:8;width:min(460px,92vw);
  background:rgba(14,18,22,.9);color:#eef1f2;border-radius:12px;padding:12px;font:400 14px/1.4 var(--f-body,system-ui);pointer-events:auto;
  max-height:calc(100% - 190px - env(safe-area-inset-bottom,0px));overflow:auto;-webkit-overflow-scrolling:touch}
@media (orientation:landscape) and (max-height:500px){#glwahl{bottom:calc(64px + env(safe-area-inset-bottom,0px));max-height:calc(100% - 84px)}}
#glwahl h4{margin:0 0 4px;font:600 15px/1.3 var(--f-body,system-ui);color:#f3c64f}
#glwahl p{margin:0 0 9px;opacity:.9;font-size:13px}
#glwahl button{display:block;width:100%;text-align:left;margin-top:6px;font:500 14px/1.3 var(--f-body,system-ui);color:#eef1f2;background:rgba(255,255,255,.12);
  border:0;border-radius:8px;padding:10px 12px;cursor:pointer}
#glwahl button:hover{background:rgba(255,255,255,.22)} #glwahl button small{display:block;opacity:.72;font-size:12px;margin-top:2px}
#glwahl button[disabled]{opacity:.45;cursor:default}
#glfade{position:absolute;inset:0;z-index:20;background:#000;opacity:0;transition:opacity .7s;pointer-events:none;display:flex;align-items:center;justify-content:center;
  flex-direction:column;gap:10px;color:#efe6d0;text-align:center;font:600 clamp(20px,3.6vw,34px)/1.3 var(--f-display,Georgia,serif);padding:0 6vw}
#glfade.on{opacity:1;pointer-events:auto} #glfade small{font:400 clamp(13px,1.9vw,17px)/1.45 var(--f-body,system-ui);opacity:.85;max-width:620px}
#glbust{position:absolute;inset:0;z-index:19;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:14px;background:rgba(8,14,34,.8);
  color:#eaf0ff;font:700 clamp(24px,4.4vw,44px)/1.2 var(--f-display,Georgia,serif);text-align:center;padding:0 6vw}
#glbust small{font:400 15px/1.45 var(--f-body,system-ui);opacity:.92;max-width:520px}
#glbust button{font:600 15px/1 var(--f-body,system-ui);padding:12px 22px;border-radius:999px;border:0;background:#eaf0ff;color:#0c1430;cursor:pointer}
#glpass{position:absolute;left:50%;top:27%;transform:translateX(-50%);z-index:7;width:min(760px,90vw);text-align:center;pointer-events:none;color:#fff;
  animation:glpa .5s ease-out}
#glpass b{display:block;font:800 clamp(24px,4.6vw,48px)/1.1 var(--f-display,Georgia,serif);color:#f3c64f;letter-spacing:.05em;text-transform:uppercase;
  text-shadow:0 3px 18px rgba(0,0,0,.95)}
#glpass em{display:block;font-style:normal;margin-top:7px;font:600 clamp(15px,2.2vw,20px)/1.3 var(--f-body,system-ui);text-shadow:0 2px 10px rgba(0,0,0,.95)}
#glpass span{display:block;margin-top:9px;font:600 clamp(13px,1.8vw,16px)/1.3 var(--f-mono,monospace);color:#8fe08a;text-shadow:0 2px 8px rgba(0,0,0,.95)}
@keyframes glpa{from{opacity:0;transform:translateX(-50%) scale(1.12)}to{opacity:1;transform:translateX(-50%) scale(1)}}
#glort{position:absolute;left:max(16px,env(safe-area-inset-left,0px));bottom:calc(246px + env(safe-area-inset-bottom,0px));z-index:5;max-width:46vw;pointer-events:none;
  color:#fff;font:italic 700 clamp(15px,2vw,21px)/1.2 var(--f-display,Georgia,serif);text-shadow:0 2px 10px rgba(0,0,0,.95);opacity:0;transition:opacity .7s}
#glort.on{opacity:1} #glort small{display:block;margin-top:2px;font:500 11px/1.3 var(--f-mono,monospace);font-style:normal;opacity:.88;letter-spacing:.04em}
@media (pointer:coarse),(max-width:720px){#glort{bottom:auto;top:calc(256px + env(safe-area-inset-top,0px))}}
@media (max-width:560px){#glort{top:calc(294px + env(safe-area-inset-top,0px))}}
#gltouch{position:absolute;right:max(14px,env(safe-area-inset-right,0px));bottom:calc(150px + env(safe-area-inset-bottom,0px));z-index:6;display:flex;flex-direction:column;gap:9px;align-items:flex-end}
#gltouch button{width:48px;height:48px;border-radius:50%;border:0;background:rgba(20,26,32,.74);color:#fff;font:700 17px/1 system-ui;touch-action:manipulation}
/* 1989: a faded colour print – on the picture only, the panels stay as they are */
body[data-gl-era="1989"] #stage canvas:first-of-type{filter:sepia(.34) saturate(.6) contrast(1.07) brightness(.97) hue-rotate(-6deg)}
#glvig,#glkorn{position:absolute;inset:0;pointer-events:none;z-index:2;display:none}
body[data-gl-era="1989"] #glvig{display:block;background:radial-gradient(ellipse at center,rgba(40,24,6,0) 52%,rgba(40,24,6,.5) 100%)}
body[data-gl-era="1989"] #glkorn{display:block;opacity:.13;mix-blend-mode:overlay;background-repeat:repeat;background-size:256px 256px}
#gldatum{position:absolute;left:max(16px,env(safe-area-inset-left,0px));bottom:calc(222px + env(safe-area-inset-bottom,0px));z-index:6;pointer-events:none;display:none;
  color:#f0e3c0;font:600 13px/1.3 var(--f-mono,monospace);letter-spacing:.06em;text-shadow:0 1px 6px rgba(0,0,0,.9)}
body[data-gl-era="1989"] #gldatum{display:block}
@media (pointer:coarse),(max-width:720px){#gldatum{left:max(14px,env(safe-area-inset-left,0px));bottom:calc(14px + env(safe-area-inset-bottom,0px))}}
@media (min-width:721px) and (min-height:501px){body[data-gl="1"] .toast{top:var(--gl-bottom,60px)}}
@media (min-width:721px) and (pointer:coarse){#glhud{right:calc(max(14px,env(safe-area-inset-right,0px)) + 60px)}}
@media (orientation:landscape) and (max-height:500px){#glhud{top:48px}}
@media (max-width:720px){#glhud{top:58px;width:min(190px,50vw);padding:6px 8px}}
body:has(#npcpanel:not([hidden])) :is(#gltouch,#glmsg,#glsub),body:has(#dorfpanel:not([hidden])) :is(#gltouch,#glmsg,#glsub),
body:has(#verkehrpanel:not([hidden])) :is(#gltouch,#glmsg,#glsub){display:none!important}
`;
  const esc = t => String(t).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
  const q = id => document.getElementById(id);
  function build() {
    if (S.el) return;
    const st = document.createElement('style');
    st.textContent = CSS;
    document.head.appendChild(st);
    const root = stage || document.body;
    const div = (id, html, tag = 'div') => {
      const d = document.createElement(tag);
      d.id = id;
      d.hidden = true;
      if (html) d.innerHTML = html;
      root.appendChild(d);
      return d;
    };
    S.el = div(
      'glhud',
      `<div class="gt"><b id="gltitel">Grenzland</b><em id="glgeld"></em></div>
       <div class="gs" id="glsterne" aria-label="Fahndung"><i>★</i><i>★</i><i>★</i><i>★</i><i>★</i></div>
       <div class="gw" id="glwas"></div>
       <div class="gn"><b id="glwer"></b><span id="glanderer"></span></div>
       <div class="gh" id="glhint"></div>
       <div class="gx"><button data-g="wechsel">Wechseln<b>Tab</b></button><button data-g="handy">Handy<span id="glhandyn"></span><b>T</b></button><button data-g="radio">Radio<b>R</b></button>` +
        `<button data-g="folgen" id="glfolgen">Folgen</button><button data-g="boeller" id="glboeller">Böller</button><button data-g="schlag">Stoßen<b>G</b></button>` +
        `<button data-g="extra" id="glextra" hidden></button><button data-g="end">Beenden</button></div>`
    );
    S.msg = div('glmsg');
    S.pass = div('glpass');
    S.ortEl = div('glort');
    S.ortEl.hidden = false;
    S.subEl = div('glsub');
    S.funkEl = div('glfunk');
    S.askEl = div('glwahl');
    S.fadeEl = div('glfade');
    S.fadeEl.hidden = false;
    S.bust = div('glbust', `<div id="glbustt"></div><small id="glbusts"></small><button id="glbustb">Weiter</button>`);
    S.vig = div('glvig');
    S.vig.hidden = false;
    S.korn = div('glkorn');
    S.korn.hidden = false;
    S.datum = div('gldatum');
    S.datum.hidden = false;
    S.touch = div(
      'gltouch',
      `<button data-g="wechsel" aria-label="Figur wechseln">⇄</button><button data-g="handy" aria-label="Handy">☎</button><button data-g="schlag" aria-label="Stoßen">✊</button>`
    );
    if (COARSE && Math.min(innerWidth, innerHeight) < 700) {
      S.el.classList.add('gmin');
      S.folded = true;
    }
    const click = e => {
      if (e.target.closest('.gt')) {
        S.el.classList.toggle('gmin');
        return;
      }
      const b = e.target.closest('button');
      if (!b) return;
      const f = S.acts[b.dataset.g];
      if (f) f();
      b.blur();
    };
    S.el.addEventListener('click', click);
    S.touch.addEventListener('click', click);
    S.askEl.addEventListener('click', e => {
      const b = e.target.closest('button');
      if (!b || b.disabled || !S.ask) return;
      const w = S.ask;
      S.ask = null;
      S.askEl.hidden = true;
      w.res(+b.dataset.i);
    });
    q('glbustb').addEventListener('click', () => {
      S.bust.hidden = true;
      if (S.onBust) S.onBust();
    });
  }
  // the grain of the old print: a small canvas of noise, stretched over the picture
  function korn() {
    if (S.kornOk) return;
    S.kornOk = true;
    // a tile of fine noise, repeated at its own size (stretched over the picture it would be blocks)
    const c = document.createElement('canvas');
    c.width = c.height = 256;
    const g = c.getContext('2d'),
      im = g.createImageData(256, 256);
    let s = 9731;
    for (let i = 0; i < im.data.length; i += 4) {
      s = (s * 1664525 + 1013904223) | 0;
      const v = 128 + (((s >>> 9) % 160) - 80);
      im.data[i] = im.data[i + 1] = im.data[i + 2] = v;
      im.data[i + 3] = 255;
    }
    g.putImageData(im, 0, 0);
    try {
      S.korn.style.backgroundImage = 'url(' + c.toDataURL('image/png') + ')';
    } catch (e) {}
  }
  function show(on) {
    build();
    S.shown = !!on;
    S.el.hidden = !on;
    S.touch.hidden = !on || !COARSE;
    if (on) document.body.dataset.gl = '1';
    else {
      delete document.body.dataset.gl;
      delete document.body.dataset.glEra;
      S.msg.hidden = S.subEl.hidden = S.funkEl.hidden = S.askEl.hidden = S.bust.hidden = S.pass.hidden = true;
      S.ortEl.classList.remove('on');
      S.fadeEl.classList.remove('on');
      if (S.ask) {
        const w = S.ask;
        S.ask = null;
        w.res(-1);
      }
    }
    S.last = '';
    if (on) refresh();
  }
  // the picture of the time: '1989' or 'heute'
  function era(e, datum) {
    build();
    if (e === '1989') {
      korn();
      document.body.dataset.glEra = '1989';
      S.datum.textContent = datum || '';
    } else delete document.body.dataset.glEra;
  }
  const STATE = {
    ruhe: '',
    gesucht: 'Gesucht – außer Sicht',
    versteckt: 'Gesucht – du bist versteckt',
    verfolgt: 'Sie sehen dich!',
  };
  const polKey = () => {
    const L = S.pol;
    if (!L) return '';
    const o = (L.offen || [])[0];
    return [L.fz ? 1 : 0, L.hidden ? 1 : 0, L.heli ? 1 : 0, o ? (o.wer || '') + Math.ceil(o.t || 0) : ''].join(',');
  };
  function refresh() {
    if (!S.shown) return;
    const W = GL.W,
      n = GLLOGIK.stars(W),
      fade = GLLOGIK.fade(W),
      key = [
        GL.wer,
        GL.geld,
        n,
        W.known,
        W.state,
        Math.round(fade * 10),
        GL.era,
        S.tip,
        GL.folgt,
        GL.inv.boeller || 0,
        S.xl || '',
        S.neu,
        polKey(),
      ].join('|');
    if (key === S.last) return;
    S.last = key;
    q('gltitel').textContent = GL.era === '1989' ? '1989' : GLDATA.T.titel;
    q('glgeld').textContent = GL.era === '1989' ? '' : GL.geld + ' €';
    const st = q('glsterne').children;
    for (let i = 0; i < 5; i++) {
      const on = i < n;
      st[i].className = on
        ? (W.known ? 'on' : 'hohl') + (W.state === 'gesucht' && i === n - 1 && fade > 0.55 ? ' blink' : '')
        : '';
    }
    const L = S.pol || {},
      tel = (L.offen || [])[0];
    q('glwas').textContent =
      n > 0
        ? (W.state === 'verfolgt' ? STATE.verfolgt : L.hidden ? STATE.versteckt : STATE.gesucht) +
          (W.known ? '' : ' · sie haben nur eine Beschreibung') +
          (L.fz ? ' · das Moped kennen sie' : '') +
          (L.heli ? ' · Hubschrauber' : '') +
          (W.split ? ' · getrennt' : '')
        : tel
          ? (tel.wer || 'Jemand') + ' telefoniert' + (tel.t > 0 ? ' (' + Math.ceil(tel.t) + ' s)' : '') + ' …'
          : '';
    q('glwer').textContent = GL.era === '1989' ? 'Gerhard, 35' : GL.name();
    q('glanderer').textContent = GL.era === '1989' ? '' : GL.name(GL.other()) + (GL.folgt ? ' kommt mit' : ' wartet');
    q('glhint').textContent = S.tip || '';
    q('glfolgen').textContent = GL.folgt ? 'Warte hier' : 'Komm mit';
    q('glboeller').hidden = !(GL.inv.boeller > 0) || GL.era === '1989';
    q('glboeller').textContent = 'Böller (' + (GL.inv.boeller || 0) + ')';
    for (const b of S.el.querySelectorAll('[data-g="wechsel"],[data-g="handy"],[data-g="folgen"]'))
      b.hidden = GL.era === '1989';
    q('glhandyn').textContent = S.neu > 0 ? ' (' + S.neu + ')' : '';
    const ex = q('glextra');
    ex.hidden = !S.xl;
    ex.textContent = S.xl || '';
    // where the game's notes may go (under the panel)
    try {
      document.body.style.setProperty('--gl-bottom', Math.round(S.el.getBoundingClientRect().bottom + 8) + 'px');
    } catch (e) {}
  }
  // an extra button of the panel (a mission's shortcut): label and what it does; null takes it away
  function extra(label, fn) {
    S.xl = label || '';
    S.acts.extra = fn || null;
    S.last = '';
  }
  const hint = t => {
    S.tip = t || '';
  };
  // a big line with a smaller one under it
  function say(a, b, sec = 6) {
    build();
    S.msg.innerHTML = esc(a) + (b ? '<small>' + esc(b) + '</small>' : '');
    S.msg.hidden = false;
    S.msgT = sec;
  }
  // a mission is done: „Mission bestanden“, its title, what it brought
  function passed(titel, lohn, sec = 7) {
    build();
    S.pass.innerHTML =
      '<b>Mission bestanden</b>' +
      (titel ? '<em>' + esc(titel) + '</em>' : '') +
      (lohn ? '<span>' + esc(lohn) + '</span>' : '');
    S.pass.hidden = false;
    S.passT = sec;
    S.msg.hidden = true;
  }
  // a name for a moment under the map: what one has just got onto or into
  function ort(name, small, sec = 4.5) {
    build();
    S.ortEl.innerHTML = esc(name) + (small ? '<small>' + esc(small) + '</small>' : '');
    S.ortEl.classList.add('on');
    S.ortT = sec;
  }
  // what somebody says (a subtitle); ms: how long it stays
  function sub(name, text, ms = 0) {
    build();
    S.subEl.innerHTML = (name ? '<b>' + esc(name) + '</b>' : '') + esc(text);
    S.subEl.hidden = false;
    S.subT = (ms || Math.max(2200, 900 + text.length * 62)) / 1000;
    return S.subT;
  }
  // what the radio says: a line of its own above the subtitles, so that it never covers what people say
  function funk(name, text, ms = 0) {
    build();
    S.funkEl.innerHTML = '<b>♪ ' + esc(name || 'Radio') + '</b>' + esc(text || '');
    S.funkEl.hidden = !text;
    S.funkT = text ? (ms || Math.max(2600, 1200 + text.length * 62)) / 1000 : 0;
    return S.funkT;
  }
  // choices: resolves to the index picked (−1: closed by the mode's end). opts: [{ t: label, s: small line, off: disabled }]
  function wahl(titel, text, opts) {
    build();
    if (S.ask) S.ask.res(-1);
    S.askEl.innerHTML =
      (titel ? '<h4>' + esc(titel) + '</h4>' : '') +
      (text ? '<p>' + esc(text) + '</p>' : '') +
      opts
        .map(
          (o, i) =>
            `<button data-i="${i}"${o.off ? ' disabled' : ''}>${esc(o.t)}${o.s ? '<small>' + esc(o.s) + '</small>' : ''}</button>`
        )
        .join('');
    S.askEl.hidden = false;
    try {
      if (document.pointerLockElement) document.exitPointerLock();
    } catch (e) {}
    return new Promise(res => {
      S.ask = { res, n: opts.length };
    });
  }
  // tests and keys: answer the open choice
  function pick(i) {
    if (!S.ask) return false;
    const w = S.ask;
    S.ask = null;
    S.askEl.hidden = true;
    w.res(i);
    return true;
  }
  // black out (with words), resolve when it is dark; fade(false) lights up again
  function fade(on, a, b) {
    build();
    S.fadeEl.innerHTML = on && a ? esc(a) + (b ? '<small>' + esc(b) + '</small>' : '') : '';
    S.fadeEl.classList.toggle('on', !!on);
    return new Promise(res => setTimeout(res, window.FREEZE ? 0 : on ? 800 : 500));
  }
  function busted(a, b, then) {
    build();
    q('glbustt').textContent = a;
    q('glbusts').textContent = b || '';
    S.onBust = then || null;
    S.bust.hidden = false;
    try {
      if (document.pointerLockElement) document.exitPointerLock();
    } catch (e) {}
  }
  function tick(dt) {
    if (!S.shown) return;
    if (S.msgT > 0 && (S.msgT -= dt) <= 0) S.msg.hidden = true;
    if (S.subT > 0 && (S.subT -= dt) <= 0) S.subEl.hidden = true;
    if (S.passT > 0 && (S.passT -= dt) <= 0) S.pass.hidden = true;
    if (S.funkT > 0 && (S.funkT -= dt) <= 0) S.funkEl.hidden = true;
    if (S.ortT > 0 && (S.ortT -= dt) <= 0) S.ortEl.classList.remove('on');
    S.acc = (S.acc || 0) + dt;
    if (S.acc > 0.25) {
      S.acc = 0;
      refresh();
    }
  }
  KERN.on('grenzland:geld', () => {
    S.last = '';
  });
  Object.assign(S, {
    build,
    show,
    era,
    refresh,
    say,
    sub,
    funk,
    wahl,
    pick,
    fade,
    busted,
    tick,
    hint,
    extra,
    passed,
    ort,
  });
  return S;
})();
window.GLHUD = GLHUD;
