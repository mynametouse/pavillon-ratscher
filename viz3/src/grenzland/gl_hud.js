// ===================== feat/grenzland: what one sees of the mode – stars, money, who plays, messages, choices, the look of 1989 (GLHUD) =====================
// Like GTA: little on the screen (Falko 13.11.2026 10:59 „gta6 vibes und immersivität“ → package A, ~11:25). Top right only the five stars of
// the wanted level – hollow while the police only have a description, filled once they know who it is, fading while the search runs out –,
// the money under them and, while wanted, what the police know (face, clothing, vehicle: GLFAHNDUNG.stand().wissen); a tap on stars or money
// (or ⋯) opens the panel with who plays and the buttons (Wechseln, Handy, Radio, Folgen/Warten, Böller, Beenden), it folds again by itself.
// The page's header, the bar of things, the dog's buttons, the game's hints and notices are hidden while the mode runs (CSS on
// body[data-gl]); the game's free view (the eye at the top right, key O in the mode) hides the mode's panel and radar too.
// Cards: a mission's title (titel, queued), „Mission bestanden“ (passed), big lines (say), a fade for the journeys in time; kino(on) puts
// black bars over and under the picture and hides the rest (the talks as scenes, agent kino); ruhig() resolves when no card shows.
// Subtitles: one line at a time – people before the police radio, which waits; the car radio's words only while nobody speaks.
// In 1989 the picture is graded like a faded colour photograph of the time (less colour, a brownish cast, soft dark corners, grain) – a CSS
// filter on the stage's canvas and two overlays; nothing of the renderer changes. Built into the page by the module itself (style and
// elements), shown only while GL.on; the game's own task card (game/quests.js) stays and shows the mission.
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
    subPrio: 1, // 1: people speak, 0: the police radio (waits for people)
    subQ: [], // lines that wait: { name, text, dur, prio, at }
    passT: 0,
    ortT: 0,
    funkT: 0,
    titelT: 0,
    titelQ: [], // mission titles that wait for the one shown
    openT: 0, // the opened panel folds again after a while
    vollT: 0,
    kinoOn: false,
    spielT: 0, // game seconds while shown (ruhig() gives up after max of them)
    ask: null,
    tip: '',
    xl: '',
    neu: 0, // unread messages on the phone (the mode feeds it)
    pol: null, // what the police are doing: { offen: [{ wer, t }], fz, hidden, heli, wissen } (the mode feeds it from GLFAHNDUNG.stand())
  };
  const CSS = `
body[data-gl-era="1989"] #glhud .gt b{color:#d8c79a}
#glmsg{position:absolute;left:50%;top:22%;transform:translateX(-50%);z-index:7;max-width:min(740px,88vw);text-align:center;pointer-events:none;
  color:#fff7e6;font:700 clamp(19px,3.3vw,32px)/1.25 var(--f-display,Georgia,serif);text-shadow:0 2px 14px rgba(0,0,0,.9);letter-spacing:.01em}
#glmsg small{display:block;margin-top:8px;font:400 clamp(13px,1.8vw,16px)/1.4 var(--f-body,system-ui);opacity:.92}
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
#glhud{position:absolute;top:calc(54px + env(safe-area-inset-top,0px));right:max(14px,env(safe-area-inset-right,0px));z-index:6;display:flex;flex-direction:column;
  align-items:flex-end;gap:3px;color:#fff;font:400 12px/1.35 var(--f-body,system-ui);pointer-events:auto;user-select:none;text-shadow:0 1px 5px rgba(0,0,0,.9)}
#glhud[hidden],#glmsg[hidden],#glsub[hidden],#glwahl[hidden],#glfade[hidden],#gltouch[hidden],#glbust[hidden],#glpass[hidden],#glmtitel[hidden],#glvoll[hidden],#glhud [hidden]{display:none!important}
#glhud .gs{display:flex;align-items:center;gap:2px;font-size:23px;line-height:1;letter-spacing:1px;cursor:pointer}
#glhud .gs i{font-style:normal;color:rgba(255,255,255,.16);transition:color .2s,opacity .3s}
#glhud .gs i.on{color:#f3c64f} #glhud .gs i.hohl{color:transparent;-webkit-text-stroke:1.5px #f3c64f}
#glhud .gs i.blink{animation:glbl .7s steps(2) infinite}
@keyframes glbl{50%{opacity:.25}}
#glhud .gm{display:flex;align-items:center;gap:8px}
#glhud .gm em{font:700 18px/1.15 var(--f-mono,monospace);font-style:normal;color:#8fe08a;cursor:pointer;letter-spacing:.02em}
#glhud .gm em:empty{display:none}
#glhud .gdot{border:0;background:rgba(14,18,22,.42);color:#fff;border-radius:999px;width:26px;height:20px;padding:0;font:700 13px/1 system-ui;cursor:pointer}
#glhud .gk{display:flex;gap:5px;margin-top:2px}
#glhud .gk i{display:grid;place-items:center;width:24px;height:24px;border-radius:50%;background:rgba(14,18,22,.5);opacity:.38;transition:opacity .3s,background .3s}
#glhud .gk i.an{opacity:1;background:rgba(190,40,30,.78)} #glhud .gk svg{width:15px;height:15px;fill:none;stroke:#fff;stroke-width:1.8;stroke-linecap:round;stroke-linejoin:round}
#glhud .gw{max-width:230px;text-align:right;font:500 11.5px/1.35 var(--f-body,system-ui);opacity:.95}
#glhud .gw:empty,#glhud .gh:empty{display:none}
#glhud .gxtra{border:0;border-radius:999px;background:#f3c64f;color:#1d1b16;font:600 12px/1 var(--f-body,system-ui);padding:7px 11px;cursor:pointer;text-shadow:none}
#glhud .gh{max-width:230px;text-align:right;font:500 11.5px/1.35 var(--f-body,system-ui);color:#f3c64f}
#glhud .gmore{display:none;align-self:stretch;margin-top:5px;padding-top:6px;border-top:1px solid rgba(255,255,255,.14)}
#glhud.gopen{background:rgba(14,18,22,.8);border-radius:10px;padding:8px 10px 9px;width:min(250px,64vw);backdrop-filter:blur(5px);text-shadow:none}
#glhud.gopen .gmore{display:block} #glhud.gopen .gw,#glhud.gopen .gh{text-align:left;align-self:stretch;max-width:none}
#glhud .gt{display:flex;justify-content:space-between;align-items:baseline;gap:8px}
#glhud .gt b{font:700 11px/1.3 var(--f-mono,monospace);letter-spacing:.09em;text-transform:uppercase;color:#f3c64f}
#glhud .gn{margin-top:3px;display:flex;justify-content:space-between;gap:6px}
#glhud .gn b{font-weight:600} #glhud .gn span{opacity:.8;font:500 11px/1.3 var(--f-mono,monospace)}
#glhud .gx{margin-top:6px;display:flex;gap:5px;flex-wrap:wrap}
#glhud .gx button{font:500 11px/1 var(--f-body,system-ui);color:#eef1f2;background:rgba(255,255,255,.13);border:0;border-radius:999px;padding:6px 9px;cursor:pointer}
#glhud .gx button:hover{background:rgba(255,255,255,.24)} #glhud .gx button[data-g="end"]{opacity:.7}
#glhud .gx button b{font:600 10px/1 var(--f-mono,monospace);opacity:.65;margin-left:4px}
@media (orientation:landscape) and (max-height:500px){#glhud{top:calc(46px + env(safe-area-inset-top,0px))} #glhud .gs{font-size:19px}}
/* subtitles: one stack at the bottom – the car radio's words above, what people say below; they never cover each other */
#glzeilen{position:absolute;left:50%;bottom:calc(150px + env(safe-area-inset-bottom,0px));transform:translateX(-50%);z-index:10;width:min(680px,90vw);
  display:flex;flex-direction:column;align-items:center;gap:6px;pointer-events:none;transition:bottom .5s}
#glsub{background:rgba(10,12,14,.72);color:#fff;border-radius:8px;padding:8px 13px;font:400 15px/1.4 var(--f-body,system-ui);text-align:center;max-width:100%}
#glsub b{color:#f3c64f;font-weight:600;margin-right:6px}
#glsub.funk b{color:#9cc8ff}
#glfunk{color:#f4ecd6;font:italic 400 13px/1.4 var(--f-body,system-ui);text-align:center;text-shadow:0 1px 6px rgba(0,0,0,.95);max-width:92%}
#glfunk b{font-style:normal;font-weight:600;color:#f3c64f;margin-right:6px} #glfunk[hidden]{display:none!important}
@media (orientation:landscape) and (max-height:500px){#glzeilen{bottom:calc(64px + env(safe-area-inset-bottom,0px))}}
/* a mission's title, as GTA shows it */
#glmtitel{position:absolute;left:50%;top:34%;transform:translate(-50%,-50%);z-index:8;width:min(900px,92vw);text-align:center;pointer-events:none;color:#fff;
  opacity:0;transition:opacity .8s}
#glmtitel.on{opacity:1}
#glmtitel::before{content:'';position:absolute;inset:-46px -8%;z-index:-1;background:radial-gradient(ellipse at center,rgba(0,0,0,.5),rgba(0,0,0,0) 68%)}
#glmtitel small{display:block;margin-bottom:10px;font:600 clamp(11px,1.4vw,14px)/1.3 var(--f-mono,monospace);letter-spacing:.34em;text-transform:uppercase;
  color:#f3c64f;text-shadow:0 1px 8px rgba(0,0,0,.95)}
#glmtitel b{display:block;font:800 clamp(30px,6.2vw,66px)/1.04 var(--f-display,Georgia,serif);letter-spacing:.01em;text-shadow:0 4px 26px rgba(0,0,0,.95)}
#glmtitel.on b{animation:gltit 1.6s ease-out}
#glmtitel em{display:block;margin-top:12px;font:400 clamp(12px,1.6vw,15px)/1.4 var(--f-body,system-ui);font-style:normal;opacity:.9;text-shadow:0 1px 8px rgba(0,0,0,.95)}
@keyframes gltit{from{letter-spacing:.14em;opacity:0;filter:blur(3px)}to{letter-spacing:.01em;opacity:1;filter:blur(0)}}
/* scenes: black bars over and under the picture, the rest of the screen out of the way */
/* a title during a scene: small at the lower left above the bar, like a film's credit – the faces stay free */
body[data-gl-kino="1"] #glmtitel{left:max(4vw,16px);top:auto;bottom:calc(12vh + 14px);transform:none;width:auto;max-width:62vw;text-align:left}
body[data-gl-kino="1"] #glmtitel b{font-size:clamp(22px,3.3vw,38px)} body[data-gl-kino="1"] #glmtitel em{display:none}
body[data-gl-kino="1"] #glmtitel::before{inset:-30px -60px -30px -40px;background:radial-gradient(ellipse at 30% 50%,rgba(0,0,0,.55),rgba(0,0,0,0) 70%)}
#glbars{position:absolute;inset:0;z-index:9;pointer-events:none}
#glbars i{position:absolute;left:0;right:0;height:12vh;background:#000;transition:transform .6s ease}
#glbars i:first-child{top:0;transform:translateY(-101%)} #glbars i:last-child{bottom:0;transform:translateY(101%)}
body[data-gl-kino="1"] #glbars i{transform:none}
body[data-gl-kino="1"] :is(#glhud,#glmap,#glmaplab,#gltouch,#qtrack,#hudtr,.where,#glort,#vhud,#gldatum,#glvoll,#glfunk){opacity:0!important;pointer-events:none!important}
body[data-gl-kino="1"] #glzeilen{bottom:calc(6vh - 20px + env(safe-area-inset-bottom,0px))}
body[data-gl-kino="1"] #glsub{background:none;text-shadow:0 1px 5px #000;font-size:16px}
/* full screen, offered at the start where the browser can */
#glvoll{position:absolute;left:50%;top:calc(12px + env(safe-area-inset-top,0px));transform:translateX(-50%);z-index:8;border:0;border-radius:999px;
  background:rgba(14,18,22,.72);color:#fff;font:500 13px/1 var(--f-body,system-ui);padding:9px 14px;cursor:pointer;backdrop-filter:blur(4px)}
/* the game's own things that do not belong into the mode: the page header, the bar of things, the dog's buttons, hints, notices, the time,
   the view chips (keys stay: V for the view); the eye and the menu stay as small round buttons */
body[data-gl="1"] header.top,body[data-gl="1"] #hotbar,body[data-gl="1"] #hbname,body[data-gl="1"] #hund-panel,body[data-gl="1"] #winote,
body[data-gl="1"] #toast,body[data-gl="1"] #qbanner,body[data-gl="1"] #vkeys,body[data-gl="1"] .hint,body[data-gl="1"] #clockbtn,
body[data-gl="1"] #camtog,body[data-gl="1"] #gearbtn,body[data-gl="1"] #stancetag{display:none!important}
body[data-gl="1"] #hudtr{gap:6px}
body[data-gl="1"] #hudtr .hb{background:rgba(14,18,22,.4);min-height:34px;padding:7px 9px}
body[data-gl="1"] #hudtr .hb .hbt{display:none}
body[data-gl="1"] #vhud{background:none;box-shadow:none;backdrop-filter:none;-webkit-backdrop-filter:none;text-shadow:0 1px 5px rgba(0,0,0,.9)}
body[data-gl="1"] #vhud .vrpm{display:none}
@media (pointer:fine){body[data-gl="1"] #vhud .vbtns{display:none}}
/* the game's free view (the eye, key O): the mode's panel goes too */
body[data-gl="1"][data-clean="1"] :is(#glhud,#glort,#glvoll){display:none!important}
/* the phone's body shares the class name .hb with the game's round buttons (shell/css/hud.css: display:flex) – its entries stood side by
   side; stacked again (found by agent welt; the shared phone of agent handy replaces this panel) */
#glhandy .hb{display:block;gap:0;min-height:0;font:inherit;color:inherit;cursor:auto;backdrop-filter:none;-webkit-backdrop-filter:none}
/* the game's own speech line (a villager, a thought) gives way while a subtitle of the mode shows */
body[data-gl="1"]:has(#glsub:not([hidden])) #npcsub{visibility:hidden}
body:has(#npcpanel:not([hidden])) :is(#gltouch,#glmsg,#glzeilen),body:has(#dorfpanel:not([hidden])) :is(#gltouch,#glmsg,#glzeilen),
body:has(#verkehrpanel:not([hidden])) :is(#gltouch,#glmsg,#glzeilen){display:none!important}

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
    // what the police know (GLFAHNDUNG.stand().wissen): the face, the clothing, the vehicle – lit when they know it
    const ICON = {
      gesicht: '<circle cx="12" cy="9" r="4.2"/><path d="M4.5 20.5c1.4-3.6 4.2-5.4 7.5-5.4s6.1 1.8 7.5 5.4"/>',
      kleidung:
        '<path d="M8.5 3.8 4 6.4l1.8 4 2-1V20.2h8.4V9.4l2 1 1.8-4-4.5-2.6c-.6 1.6-1.9 2.5-3.5 2.5s-2.9-.9-3.5-2.5z"/>',
      fahrzeug:
        '<circle cx="6" cy="16.5" r="3"/><circle cx="18" cy="16.5" r="3"/><path d="M6 16.5 9.5 9h4l2.5 7.5M13.5 9l1-3h2.5M9 12.5h6"/>',
    };
    const icon = k =>
      `<i data-w="${k}" title="${{ gesicht: 'Gesicht', kleidung: 'Kleidung', fahrzeug: 'Fahrzeug' }[k]}"><svg viewBox="0 0 24 24" aria-hidden="true">${ICON[k]}</svg></i>`;
    S.el = div(
      'glhud',
      `<div class="gs" id="glsterne" aria-label="Fahndung"><i>★</i><i>★</i><i>★</i><i>★</i><i>★</i></div>
       <div class="gm"><button type="button" class="gdot" data-g="mehr" aria-label="Aktionen" title="Aktionen">⋯</button><em id="glgeld"></em></div>
       <div class="gk" id="glwissen" hidden aria-label="Was die Polizei weiß">${icon('gesicht')}${icon('kleidung')}${icon('fahrzeug')}</div>
       <div class="gw" id="glwas"></div>
       <div class="gh" id="glhint"></div>
       <button type="button" class="gxtra" data-g="extra" id="glextra" hidden></button>
       <div class="gmore"><div class="gt"><b id="gltitel">Grenzland</b></div>
       <div class="gn"><b id="glwer"></b><span id="glanderer"></span></div>
       <div class="gx"><button data-g="wechsel">Wechseln<b>Tab</b></button><button data-g="handy">Handy<span id="glhandyn"></span><b>T</b></button><button data-g="radio">Radio<b>R</b></button>` +
        `<button data-g="folgen" id="glfolgen">Folgen</button><button data-g="boeller" id="glboeller">Böller</button><button data-g="schlag">Stoßen<b>G</b></button>` +
        `<button data-g="aus">Anzeigen<b>O</b></button><button data-g="end">Beenden</button></div></div>`
    );
    S.msg = div('glmsg');
    S.pass = div('glpass');
    S.titelEl = div('glmtitel');
    S.ortEl = div('glort');
    S.ortEl.hidden = false;
    // the subtitles: one stack (the car radio's words above what people say)
    S.zeilen = div('glzeilen');
    S.zeilen.hidden = false;
    S.funkEl = div('glfunk');
    S.subEl = div('glsub');
    S.zeilen.append(S.funkEl, S.subEl);
    S.askEl = div('glwahl');
    S.bars = div('glbars', '<i></i><i></i>');
    S.bars.hidden = false;
    S.fadeEl = div('glfade');
    S.fadeEl.hidden = false;
    S.bust = div('glbust', `<div id="glbustt"></div><small id="glbusts"></small><button id="glbustb">Weiter</button>`);
    S.vig = div('glvig');
    S.vig.hidden = false;
    S.korn = div('glkorn');
    S.korn.hidden = false;
    S.datum = div('gldatum');
    S.datum.hidden = false;
    S.vollEl = div('glvoll', '⛶ Vollbild', 'button');
    S.vollEl.type = 'button';
    S.vollEl.addEventListener('click', () => {
      S.vollEl.hidden = true;
      S.vollT = 0;
      try {
        const r = document.documentElement.requestFullscreen({ navigationUI: 'hide' });
        if (r && r.catch) r.catch(() => {});
      } catch (e) {}
    });
    S.touch = div(
      'gltouch',
      `<button data-g="wechsel" aria-label="Figur wechseln">⇄</button><button data-g="handy" aria-label="Handy">☎</button><button data-g="schlag" aria-label="Stoßen">✊</button>` +
        `<button data-g="mehr" aria-label="Aktionen">⋯</button>`
    );
    S.acts.mehr = () => auf(!S.el.classList.contains('gopen'));
    S.acts.aus = () => {
      const b = document.getElementById('cleanbtn');
      if (b) b.click();
    };
    const click = e => {
      if (e.target.closest('.gs') || e.target.closest('#glgeld')) {
        auf(!S.el.classList.contains('gopen'));
        return;
      }
      const b = e.target.closest('button');
      if (!b) return;
      const f = S.acts[b.dataset.g];
      if (f) f();
      if (b.dataset.g !== 'mehr' && S.el.classList.contains('gopen')) S.openT = 6;
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
      kino(false);
      S.msg.hidden =
        S.subEl.hidden =
        S.funkEl.hidden =
        S.askEl.hidden =
        S.bust.hidden =
        S.pass.hidden =
        S.vollEl.hidden =
          true;
      S.titelEl.hidden = true;
      S.titelEl.classList.remove('on');
      S.titelQ.length = S.subQ.length = 0;
      S.titelT = S.subT = S.funkT = S.passT = S.msgT = S.vollT = 0;
      S.ortEl.classList.remove('on');
      S.fadeEl.classList.remove('on');
      if (S.ask) {
        const w = S.ask;
        S.ask = null;
        w.res(-1);
      }
    }
    auf(false);
    S.last = '';
    if (on) refresh();
  }
  // the panel with who plays and the buttons: opened by a tap on stars or money (or ⋯), folds again after a while
  function auf(on) {
    if (!S.el) return;
    S.el.classList.toggle('gopen', !!on);
    S.openT = on ? 8 : 0;
    S.last = '';
  }
  // the browser's full screen, offered at the start (a button for a few seconds; the browser wants a tap for it)
  function voll(sec = 12) {
    build();
    let ok = false;
    try {
      ok = !!document.fullscreenEnabled && !document.fullscreenElement && !window.FREEZE;
    } catch (e) {}
    S.vollEl.hidden = !ok;
    S.vollT = ok ? sec : 0;
    return ok;
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
    const o = (L.offen || [])[0],
      w = L.wissen;
    return [
      L.fz ? 1 : 0,
      L.hidden ? 1 : 0,
      L.heli ? 1 : 0,
      o ? (o.wer || '') + Math.ceil(o.t || 0) : '',
      w ? (w.gesicht ? 1 : 0) + '' + (w.kleidung ? 1 : 0) + (w.fahrzeug ? 1 : 0) : '',
    ].join(',');
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
        S.el.className,
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
      tel = (L.offen || [])[0],
      wi = L.wissen && typeof L.wissen === 'object' ? L.wissen : null;
    // what the police know: as signs while wanted (the words then only say where they are)
    const wk = q('glwissen');
    wk.hidden = !(wi && n > 0 && GL.era !== '1989');
    if (wi) for (const i of wk.children) i.classList.toggle('an', !!wi[i.dataset.w]);
    q('glwas').textContent =
      n > 0
        ? (W.state === 'verfolgt' ? STATE.verfolgt : L.hidden ? STATE.versteckt : STATE.gesucht) +
          (wi ? '' : (W.known ? '' : ' · sie haben nur eine Beschreibung') + (L.fz ? ' · das Moped kennen sie' : '')) +
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
  // a mission is done: „Mission bestanden“, its title, what it brought (a mission title still waiting comes after it)
  function passed(titel, lohn, sec = 7) {
    build();
    S.pass.innerHTML =
      '<b>Mission bestanden</b>' +
      (titel ? '<em>' + esc(titel) + '</em>' : '') +
      (lohn ? '<span>' + esc(lohn) + '</span>' : '');
    S.pass.hidden = false;
    S.passT = sec;
    S.msg.hidden = true;
    S.msgT = 0;
    if (S.titelT > 0) titelAus();
  }
  // a mission's title, big in the middle (GTA): the name, a small line over it (the chapter), one under it (keys, a hint).
  // Queued: a title that comes while another or „Mission bestanden“ shows waits for it.
  function titel(name, ueber, sec = 4.5, unter = '') {
    build();
    if (!name) return;
    S.titelQ.push({ name, ueber: ueber || '', sec: Math.max(1.5, sec || 4.5), unter: unter || '' });
    if (S.titelQ.length > 3) S.titelQ.shift();
    if (!(S.titelT > 0) && !(S.passT > 0)) titelNext();
  }
  function titelNext() {
    const t = S.titelQ.shift();
    if (!t) return;
    S.titelEl.innerHTML =
      (t.ueber ? '<small>' + esc(t.ueber) + '</small>' : '') +
      '<b>' +
      esc(t.name) +
      '</b>' +
      (t.unter ? '<em>' + esc(t.unter) + '</em>' : '');
    S.titelEl.hidden = false;
    S.titelEl.classList.remove('on');
    void S.titelEl.offsetWidth;
    S.titelEl.classList.add('on');
    S.titelT = t.sec;
    S.msg.hidden = true;
    S.msgT = 0;
  }
  function titelAus() {
    S.titelT = 0;
    S.titelEl.classList.remove('on');
    setTimeout(() => {
      if (!(S.titelT > 0)) S.titelEl.hidden = true;
    }, 850);
  }
  // a scene (agent kino): black bars over and under the picture, the panel, the radar and the game's things out of the way
  function kino(on) {
    build();
    on = !!on && S.shown;
    if (on === S.kinoOn) return;
    S.kinoOn = on;
    if (on) document.body.dataset.glKino = '1';
    else delete document.body.dataset.glKino;
    if (on) auf(false);
  }
  // is something on the screen that a thought or a hint should not cover (a subtitle, a card, a scene)?
  const busy = () =>
    !!S.shown &&
    (S.subT > 0.05 ||
      S.titelT > 0 ||
      S.passT > 0 ||
      S.msgT > 0 ||
      S.kinoOn ||
      (S.fadeEl && S.fadeEl.classList.contains('on')));
  // resolves when no card shows (a title, „Mission bestanden“, a big line, a fade) – e.g. before the chapter's end card; at the latest
  // after max seconds of game time
  function ruhig(max = 20) {
    const t0 = S.spielT;
    return new Promise(res => {
      const look = () => {
        const frei =
          !S.shown ||
          window.FREEZE ||
          (!(S.titelT > 0) &&
            !S.titelQ.length &&
            !(S.passT > 0) &&
            !(S.msgT > 0) &&
            !(S.fadeEl && S.fadeEl.classList.contains('on')));
        if (frei || S.spielT - t0 > max) res(true);
        else setTimeout(look, 150);
      };
      look();
    });
  }
  // a name for a moment under the map: what one has just got onto or into
  function ort(name, small, sec = 4.5) {
    build();
    S.ortEl.innerHTML = esc(name) + (small ? '<small>' + esc(small) + '</small>' : '');
    S.ortEl.classList.add('on');
    S.ortT = sec;
  }
  // what somebody says (a subtitle); ms: how long it stays. One line at a time: people come first – a line of the police radio
  // ('Funk', 'Radio', 'Zentrale') waits while somebody speaks and shows after (it is dropped when it waited more than 9 s of game time). Returns the
  // seconds until the line is gone (with the wait).
  const prioOf = name => (/^(Funk|Polizeifunk|Zentrale|Radio)$/i.test(String(name || '').trim()) ? 0 : 1);
  function sub(name, text, ms = 0) {
    build();
    text = String(text == null ? '' : text);
    const dur = (ms || Math.max(2200, 900 + text.length * 62)) / 1000,
      prio = prioOf(name);
    if (S.subT > 0.4 && prio < S.subPrio) {
      let wait = S.subT;
      for (const l of S.subQ) wait += l.dur;
      S.subQ.push({ name, text, dur, prio, age: 0 });
      if (S.subQ.length > 3) S.subQ.shift();
      return wait + dur;
    }
    zeige(name, text, dur, prio);
    return dur;
  }
  function zeige(name, text, dur, prio) {
    S.subEl.innerHTML = (name ? '<b>' + esc(name) + '</b>' : '') + esc(text);
    S.subEl.classList.toggle('funk', prio === 0);
    S.subEl.hidden = false;
    S.subT = dur;
    S.subPrio = prio;
    // the car radio's words step back while somebody speaks
    if (!S.funkEl.hidden) {
      S.funkEl.hidden = true;
      S.funkT = 0;
    }
  }
  function subNext() {
    while (S.subQ.length) {
      const l = S.subQ.shift();
      if (l.age < 9) return zeige(l.name, l.text, l.dur, l.prio);
    }
  }
  // what the car radio says: a line of its own above the subtitles – only while nobody speaks (GTA does not write the radio over a talk)
  function funk(name, text, ms = 0) {
    build();
    const dur = text ? (ms || Math.max(2600, 1200 + String(text).length * 62)) / 1000 : 0;
    S.funkEl.innerHTML = '<b>♪ ' + esc(name || 'Radio') + '</b>' + esc(text || '');
    S.funkEl.hidden = !text || S.subT > 0.05 || S.kinoOn;
    S.funkT = S.funkEl.hidden ? 0 : dur;
    return dur;
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
    S.spielT += dt;
    if (S.msgT > 0 && (S.msgT -= dt) <= 0) S.msg.hidden = true;
    for (const l of S.subQ) l.age += dt;
    if (S.subT > 0 && (S.subT -= dt) <= 0) {
      S.subEl.hidden = true;
      subNext();
    }
    if (S.passT > 0 && (S.passT -= dt) <= 0) {
      S.pass.hidden = true;
      if (S.titelQ.length) titelNext();
    }
    if (S.titelT > 0 && (S.titelT -= dt) <= 0) {
      titelAus();
      if (S.titelQ.length) setTimeout(() => S.shown && !(S.titelT > 0) && !(S.passT > 0) && titelNext(), 900);
    }
    if (S.funkT > 0 && (S.funkT -= dt) <= 0) S.funkEl.hidden = true;
    if (S.ortT > 0 && (S.ortT -= dt) <= 0) S.ortEl.classList.remove('on');
    if (S.openT > 0 && (S.openT -= dt) <= 0) auf(false);
    if (S.vollT > 0 && (S.vollT -= dt) <= 0) S.vollEl.hidden = true;
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
    titel,
    kino,
    busy,
    ruhig,
    auf,
    voll,
  });
  return S;
})();
window.GLHUD = GLHUD;
