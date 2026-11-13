// ===================== handy: one phone for every world of the game (HANDY) =====================
// Falko, 13.11.2026 13:09: the phone should look like a real one, be held up in front of the face, chats from top to bottom, apps to start and
// close, calls, functions unlocked later – „ein sehr gutes Modell, dann kann das … auch die anderen Chats nutzen“. This module is the device and
// its little operating system; it knows no world. A world (Grenzland now, the Zukunft chat's time-lapse later) makes its phone current with
// HANDY.welt(id, cfg) and brings the content: contacts, threads, posts, the clock, which apps in which order, its own apps, what a call says.
// The standard apps (Nachrichten, Telefon, Kamera, Fotos, Karte, Feed, Bank, Notizen, Einstellungen, Uhr) are in handy/handy_apps.js, the
// hold (the figure raises it, the thumb taps, a call goes to the ear) in handy/handy_pose.js. Everything is DOM and CSS (classes hy-…, nothing
// generic: the base game's CSS styles .hb and others), sizes in container units so the same phone works small at the lower right, large in the
// middle of a phone's screen, sideways on a phone in landscape and big at the right edge of a presentation (layout 'gross').
//   HANDY.welt(id, cfg) · welt(null)   make a world's phone current (none: no phone). cfg (all optional): name; ids { root, sucher } (element
//       ids its old tests know); tapeten [css] or tapete; zeit() → minutes of the day; datum() → 'Freitag, 13. November'; netz() → bars 0–4
//       (-1: „Kein Netz“); akku() → 0–100; apps [ids in the home screen's order]; dock [ids]; gesperrt { id: 'kommt später' }; layout 'auto' |
//       'gross'; halten (the player's figure holds it); peek (a banner at the screen's corner while it is put away); darf() → true | text
//       (why not); badge(app) → n; daten { kontakte(), favoriten(), threads(), nachrichten(id), gelesen(id), feed(), bank(), notizen(),
//       orte(), wo() → [x, y] }; aktionen { antworten(id) → [{ id, text }], antwort(id, a), anruf(kontakt, ctl, art) → Promise, sag(wer, text)
//       → Promise, foto(img), ziel(ort), sucher() → { n, text, gut }, ausloesen() → false (no picture) | anything }
//   HANDY.app(id, def)                 an app: { name, icon (24-unit SVG path), farbe [c1, c2], render(el, ctx, view, arg) → { titel, sub },
//       fuss(el, ctx, view, arg), tick(dt, ctx), oeffnen(ctx) → false (it opened something else) }; a world's own or a standard one
//   HANDY.freischalten(id) · sperren(id, text) · frei(id)   unlocking later: a locked app is shown greyed, a tap says why
//   HANDY.open(app?, arg?) → bool · close() · toggle() · isOpen() · home() · back() · zeige(app, view, arg) · refresh() · zu() → Promise
//   HANDY.mitteilung({ app, von, titel, text, bild, ziel, still }) → a banner (sound, a tap opens the app), on the lock screen, a badge
//   HANDY.anruf(kontakt, o) · eingehend(kontakt, o) · auflegen()   the call screen: calling / ringing / incoming / talking; o.szene(ctl) for a
//       scripted call (ctl.sag(wer, text), ctl.warte(s), ctl.aktiv()), o.annehmen: seconds until it is taken by itself (a presentation)
//   HANDY.sucher(on, o) · ausloesen() · schnapp(w) → dataURL   the camera's viewfinder over the real picture, a real frame of the renderer
//   HANDY.alarm({ absender, titel, text, marke }) · layout('auto' | 'gross') · ton(art) · S (state, for tests and the pose)
// Keys while it is up: Esc puts it away, Backspace goes back, 1–9 open the n-th app on the home screen or choose a reply; touch: swipe up
// from the bottom bar → home, from the left edge → back. Events (KERN): 'handy:auf' { app }, 'handy:zu', 'handy:app' { app, view }, 'handy:tipp',
// 'handy:mitteilung' { app }, 'handy:anruf' { st, wer }, 'handy:foto' { img }.
import { COARSE, stage, R as RENDERER } from '../core/head.js';
import { KERN } from '../core/kern.js';
import { HUD } from '../game/hud.js';
import { audio } from '../audio/audio.js';
import { STIMME } from '../audio/stimme.js';
import { SAVE } from '../core/save.js';
export const HANDY = (() => {
  // the phone's own settings (sounds, read aloud, wallpaper) – the same in every world
  const KEY = SAVE.key('pav-handy-v1', {
    owner: 'handy',
    kind: 'json',
    def: null,
    check: v => v === null || (typeof v === 'object' && !Array.isArray(v)),
  });
  const S = {
    el: null,
    wid: null,
    cfg: null,
    open: false,
    k: 0,
    sperre: -1,
    app: null,
    stack: [],
    sucher: false,
    sucherVon: '',
    anruf: null,
    apps: {},
    std: [],
    frei: {},
    mitt: [],
    banner: null,
    bannerT: 0,
    peekT: 0,
    fotos: [],
    tipp: 0,
    layout: 'auto',
    einst: { toene: true, vorlesen: false, tapete: 0 },
    unlocked: false,
    res: [],
    acc: 0,
    dirty: false,
    alarm: null,
    n: 0,
  };
  const esc = t =>
    String(t == null ? '' : t).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
  const hhmm = t => {
    const m = ((Math.floor(t) % 1440) + 1440) % 1440;
    return String(Math.floor(m / 60)).padStart(2, '0') + ':' + String(m % 60).padStart(2, '0');
  };
  try {
    const v = SAVE.get(KEY);
    if (v && typeof v === 'object') {
      if (typeof v.toene === 'boolean') S.einst.toene = v.toene;
      if (typeof v.vorlesen === 'boolean') S.einst.vorlesen = v.vorlesen;
      if (Number.isInteger(v.tapete) && v.tapete >= 0 && v.tapete < 8) S.einst.tapete = v.tapete;
    }
  } catch (e) {}
  const speichern = () => {
    try {
      SAVE.set(KEY, Object.assign({}, S.einst));
    } catch (e) {}
  };
  const W = () => S.cfg || {};
  const D = () => W().daten || {};
  const A = () => W().aktionen || {};
  const call = (f, ...a) => {
    try {
      return typeof f === 'function' ? f(...a) : undefined;
    } catch (e) {
      console.warn('handy', e);
      return undefined;
    }
  };
  const now = () => {
    const z = call(W().zeit);
    if (Number.isFinite(z)) return z;
    const d = new Date();
    return d.getHours() * 60 + d.getMinutes();
  };
  const WD = ['Sonntag', 'Montag', 'Dienstag', 'Mittwoch', 'Donnerstag', 'Freitag', 'Samstag'],
    MO = [
      'Januar',
      'Februar',
      'März',
      'April',
      'Mai',
      'Juni',
      'Juli',
      'August',
      'September',
      'Oktober',
      'November',
      'Dezember',
    ];
  const datum = () => {
    const d = call(W().datum);
    if (d) return String(d);
    const x = new Date();
    return WD[x.getDay()] + ', ' + x.getDate() + '. ' + MO[x.getMonth()];
  };
  // ---------------- the look ----------------
  // the hills at dusk, the wallpaper of the first world (an SVG, no picture to load)
  const HILLS =
    "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 200' preserveAspectRatio='none'%3E%3Cpath d='M0 128 C18 112 30 118 46 108 S78 98 100 112 V200 H0Z' fill='%23382a4a'/%3E%3Cpath d='M0 146 C20 132 38 140 56 130 S86 124 100 134 V200 H0Z' fill='%23231c33'/%3E%3Cpath d='M0 164 C24 152 44 160 64 150 S90 148 100 154 V200 H0Z' fill='%23120f1c'/%3E%3C/svg%3E\") center/100% 100% no-repeat";
  const TAPETEN = [
    HILLS + ',radial-gradient(130% 70% at 72% 18%,#ffd08a 0%,#f59d62 16%,#b9506a 36%,#4b2a5c 58%,#1a1630 80%)',
    'radial-gradient(120% 90% at 20% 0%,#3d6f8f 0%,#1d3a52 45%,#0c1622 100%)',
    'linear-gradient(160deg,#2f4a34 0%,#1c2e22 50%,#0d1510 100%)',
    'radial-gradient(100% 80% at 80% 100%,#6a4fb3 0%,#2b2353 50%,#0f0d1d 100%)',
  ];
  const IC = {
    lock: 'M7 10V7a5 5 0 0110 0v3h1a1 1 0 011 1v10a1 1 0 01-1 1H6a1 1 0 01-1-1V11a1 1 0 011-1zm2 0h6V7a3 3 0 00-6 0z',
    hoerer:
      'M6.6 10.8c1.4 2.8 3.8 5.1 6.6 6.6l2.2-2.2c.3-.3.7-.4 1-.2 1.1.4 2.3.6 3.6.6.6 0 1 .4 1 1V20c0 .6-.4 1-1 1C10.6 21 3 13.4 3 4c0-.6.4-1 1-1h3.5c.6 0 1 .4 1 1 0 1.3.2 2.5.6 3.6.1.3 0 .7-.2 1z',
    stumm:
      'M12 3a3 3 0 013 3v5a3 3 0 01-6 0V6a3 3 0 013-3zM6 11h2a4 4 0 008 0h2a6 6 0 01-5 5.9V20h3v2H8v-2h3v-3.1A6 6 0 016 11z',
    laut: 'M4 9h4l5-4v14l-5-4H4zM16 8.5a5 5 0 010 7l-1.4-1.4a3 3 0 000-4.2zM18.5 6a8.5 8.5 0 010 12l-1.4-1.4a6.5 6.5 0 000-9.2z',
    tasten:
      'M6 4h2v2H6zm5 0h2v2h-2zm5 0h2v2h-2zM6 9h2v2H6zm5 0h2v2h-2zm5 0h2v2h-2zM6 14h2v2H6zm5 0h2v2h-2zm5 0h2v2h-2zm-5 5h2v2h-2z',
    zurueck: 'M15.4 4.6L8 12l7.4 7.4-1.4 1.4L5.2 12 14 3.2z',
    kreuz: 'M6.4 5L12 10.6 17.6 5 19 6.4 13.4 12l5.6 5.6-1.4 1.4-5.6-5.6L6.4 19 5 17.6 10.6 12 5 6.4z',
  };
  const svg = (d, cls) =>
    `<svg class="${cls || ''}" viewBox="0 0 24 24" aria-hidden="true" fill-rule="evenodd"><path d="${d}"/></svg>`;
  const CSS = `
.hy{position:absolute;z-index:14;right:max(18px,env(safe-area-inset-right,0px));bottom:calc(12px + env(safe-area-inset-bottom,0px));
  height:min(620px,calc(100% - 84px));aspect-ratio:71.6/147.6;max-width:calc(100% - 24px);--hy-e:1;--hy-x:0%;
  transform:translate(var(--hy-x),calc((1 - var(--hy-e)) * 116%)) rotate(calc((1 - var(--hy-e)) * -5deg));transform-origin:70% 100%;
  pointer-events:auto;user-select:none;-webkit-user-select:none;touch-action:none;color:#f2f3f5;
  font-family:var(--hy-font,system-ui,-apple-system,"Segoe UI",Roboto,"Helvetica Neue",sans-serif);-webkit-font-smoothing:antialiased}
.hy[hidden]{display:none!important}
.hy *{box-sizing:border-box}
:where(.hy) button{appearance:none;-webkit-appearance:none;border:0;margin:0;padding:0;background:none;color:inherit;font:inherit;text-align:inherit;cursor:pointer;
  border-radius:0;box-shadow:none;backdrop-filter:none;min-height:0;letter-spacing:inherit;text-transform:none}
.hy-geh{position:absolute;inset:0;border-radius:14.6% / 7.1%;padding:2.3%;
  background:linear-gradient(140deg,#5b616b 0%,#23272d 18%,#1a1d22 50%,#30353d 78%,#0d0f12 100%);
  box-shadow:0 22px 55px rgba(0,0,0,.55),0 6px 16px rgba(0,0,0,.45),inset 0 0 0 1px rgba(255,255,255,.14),inset 0 0 0 2.5px #08090b}
.hy-geh>i{position:absolute;width:1.3%;border-radius:2px;background:linear-gradient(90deg,#15181c,#5a606a 60%,#22262c)}
.hy-geh>i.hy-k1{left:-1.1%;top:18%;height:5%}
.hy-geh>i.hy-k2{left:-1.1%;top:25.5%;height:9.5%}
.hy-geh>i.hy-k3{left:-1.1%;top:36.5%;height:9.5%}
.hy-geh>i.hy-k4{right:-1.1%;left:auto;top:27%;height:14%;background:linear-gradient(270deg,#15181c,#5a606a 60%,#22262c)}
.hy-glas{position:absolute;inset:1.12% 2.3%;border-radius:12.6% / 6.1%;overflow:hidden;background:#000;container-type:size;isolation:isolate}
.hy-glas::after{content:'';position:absolute;inset:0;border-radius:inherit;pointer-events:none;z-index:60;
  background:linear-gradient(118deg,rgba(255,255,255,.13) 0%,rgba(255,255,255,.035) 26%,rgba(255,255,255,0) 40%,rgba(255,255,255,0) 72%,rgba(255,255,255,.05) 100%);
  box-shadow:inset 0 0 0 1px rgba(255,255,255,.05)}
.hy-tap{position:absolute;inset:0;background-size:cover;transition:filter .3s,transform .35s}
.hy[data-ort="app"] .hy-tap{filter:brightness(.55) blur(2px);transform:scale(1.06)}
.hy-insel{position:absolute;z-index:58;top:1.45cqh;left:50%;width:31cqmin;height:9.4cqmin;margin-left:-15.5cqmin;border-radius:99px;background:#000;
  box-shadow:0 0 0 .4cqmin rgba(255,255,255,.04)}
.hy-insel::after{content:'';position:absolute;right:3cqmin;top:2.7cqmin;width:4cqmin;height:4cqmin;border-radius:50%;
  background:radial-gradient(circle at 35% 35%,#3a4a6a 0,#121826 45%,#05060a 70%)}
.hy-stat{position:absolute;z-index:57;left:0;right:0;top:0;height:12.5cqmin;display:flex;align-items:center;justify-content:space-between;
  padding:1.2cqmin 7.5cqmin 0 9cqmin;font-size:4.7cqmin;font-weight:600;letter-spacing:.01em;pointer-events:none;text-shadow:0 0 6px rgba(0,0,0,.25)}
.hy-stat .hy-rechts{display:flex;align-items:center;gap:1.6cqmin}
.hy-stat svg{height:3.9cqmin;fill:currentColor;display:block}
.hy-stat .hy-kn{font-size:3.6cqmin;font-weight:600;opacity:.9}
.hy-stat .hy-ak{position:relative;width:7.2cqmin;height:3.6cqmin;border:.45cqmin solid rgba(255,255,255,.55);border-radius:1.1cqmin;padding:.4cqmin}
.hy-stat .hy-ak::after{content:'';position:absolute;right:-1.3cqmin;top:1cqmin;width:.7cqmin;height:1.6cqmin;border-radius:0 1cqmin 1cqmin 0;background:rgba(255,255,255,.55)}
.hy-stat .hy-ak b{display:block;height:100%;border-radius:.5cqmin;background:#fff}
.hy-stat .hy-ak.lo b{background:#ff453a}
.hy-heim{position:absolute;z-index:59;left:0;right:0;bottom:0;height:6.5cqmin;display:flex;align-items:center;justify-content:center;cursor:pointer}
.hy-heim i{display:block;width:36cqmin;height:1.45cqmin;border-radius:9px;background:rgba(255,255,255,.88);box-shadow:0 0 3px rgba(0,0,0,.35)}
.hy-home{position:absolute;inset:0;padding:15cqmin 5cqmin 6cqmin;display:flex;flex-direction:column}
.hy-wid{display:flex;justify-content:space-between;align-items:flex-end;padding:3cqmin 2.5cqmin 5cqmin}
.hy-wid b{font-size:15cqmin;font-weight:300;letter-spacing:-.02em;line-height:1}
.hy-wid span{font-size:3.8cqmin;font-weight:500;opacity:.88;text-align:right;line-height:1.35}
.hy-raster{display:grid;grid-template-columns:repeat(auto-fill,minmax(20.5cqmin,1fr));gap:4.2cqmin 1cqmin;align-content:start;flex:1;min-height:0;
  overflow-y:auto;overscroll-behavior:contain;scrollbar-width:none;touch-action:pan-y}
.hy-ic>b{font-weight:500;display:block;max-width:19cqmin;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.hy-raster::-webkit-scrollbar{display:none}
.hy-ic{position:relative;display:flex;flex-direction:column;align-items:center;gap:1.4cqmin;font-size:3.25cqmin;font-weight:500;line-height:1.1;
  text-shadow:0 1px 3px rgba(0,0,0,.6);text-align:center;transition:transform .12s}
.hy-ic:active{transform:scale(.92)}
.hy-ic>span:first-child{position:relative;display:flex;align-items:center;justify-content:center;width:14.6cqmin;height:14.6cqmin;border-radius:3.6cqmin;
  box-shadow:0 1.2cqmin 2.6cqmin rgba(0,0,0,.35),inset 0 .3cqmin 0 rgba(255,255,255,.22),inset 0 -.5cqmin 1cqmin rgba(0,0,0,.18)}
.hy-ic>span:first-child svg{width:8cqmin;height:8cqmin;fill:#fff;filter:drop-shadow(0 .3cqmin .4cqmin rgba(0,0,0,.25))}
.hy-ic em{position:absolute;top:-1.6cqmin;right:-1.8cqmin;min-width:5.2cqmin;height:5.2cqmin;border-radius:3cqmin;background:#ff3b30;color:#fff;font:700 3.3cqmin/5.2cqmin system-ui;
  font-style:normal;padding:0 1.2cqmin;text-align:center;box-shadow:0 0 0 .5cqmin rgba(0,0,0,.15)}
.hy-ic.hy-zu>span:first-child{filter:grayscale(1) brightness(.62)}
.hy-ic.hy-zu>span:first-child::after{content:'';position:absolute;right:-1.2cqmin;bottom:-1.2cqmin;width:5.4cqmin;height:5.4cqmin;border-radius:50%;
  background:#2c2c2e url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24'%3E%3Cpath fill='%23ddd' fill-rule='evenodd' d='${IC.lock}'/%3E%3C/svg%3E") center/62% no-repeat;
  box-shadow:0 0 0 .5cqmin rgba(0,0,0,.4)}
.hy-ic.hy-zu{opacity:.82}
.hy-dock{display:grid;grid-template-columns:repeat(auto-fit,minmax(18cqmin,1fr));gap:1cqmin;margin:2cqmin -1cqmin 0;padding:3.2cqmin 2.6cqmin;border-radius:7.5cqmin;
  background:rgba(255,255,255,.17);backdrop-filter:blur(14px) saturate(1.3);-webkit-backdrop-filter:blur(14px) saturate(1.3)}
.hy-dock .hy-ic>b{display:none}
.hy-app{position:absolute;inset:0;z-index:20;background:#000;display:flex;flex-direction:column;padding-top:12.5cqmin;padding-bottom:6cqmin;transform-origin:var(--ox,50%) var(--oy,50%)}
.hy-app[hidden]{display:none}
.hy-app.hy-auf{animation:hyAuf .3s cubic-bezier(.2,.8,.25,1)}
.hy-app.hy-ab{animation:hyAb .24s cubic-bezier(.4,0,.8,.4) forwards}
@keyframes hyAuf{from{transform:scale(.16);opacity:0;border-radius:30%}to{transform:none;opacity:1;border-radius:0}}
@keyframes hyAb{from{transform:none;opacity:1}to{transform:scale(.16);opacity:0;border-radius:30%}}
.hy-kopf{display:flex;align-items:center;gap:1cqmin;min-height:12.5cqmin;padding:0 3cqmin;border-bottom:.3cqmin solid rgba(255,255,255,.07);flex:none}
.hy-kopf .hy-zur{display:flex;align-items:center;color:var(--hy-ak,#4da3ff);font-size:4.6cqmin;padding:2cqmin 1cqmin;min-width:16cqmin}
.hy-kopf .hy-zur svg{width:6cqmin;height:6cqmin;fill:currentColor;margin-right:-.4cqmin}
.hy-kopf .hy-zur[hidden]{visibility:hidden;display:flex}
.hy-kopf>div{flex:1;min-width:0;text-align:center}
.hy-kopf>div b{display:block;font-size:4.7cqmin;font-weight:650;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.hy-kopf>div small{display:block;font-size:3.1cqmin;opacity:.6;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;margin-top:.3cqmin}
.hy-kopf .hy-akt{min-width:16cqmin;text-align:right;color:var(--hy-ak,#4da3ff);font-size:4.3cqmin}
.hy-body{flex:1;min-height:0;overflow-y:auto;overflow-x:hidden;overscroll-behavior:contain;-webkit-overflow-scrolling:touch;touch-action:pan-y;
  padding:2.4cqmin 3.4cqmin 4cqmin;font-size:4.1cqmin;line-height:1.36;scrollbar-width:thin;scrollbar-color:rgba(255,255,255,.18) transparent}
.hy-body.hy-vr{animation:hyVr .26s cubic-bezier(.2,.8,.25,1)} .hy-body.hy-vl{animation:hyVl .26s cubic-bezier(.2,.8,.25,1)}
@keyframes hyVr{from{transform:translateX(38%);opacity:.2}to{transform:none;opacity:1}}
@keyframes hyVl{from{transform:translateX(-30%);opacity:.2}to{transform:none;opacity:1}}
.hy-fuss{flex:none;padding:0 3cqmin 2cqmin}
.hy-fuss:empty{display:none}
.hy-fuss .hy-chips{display:flex;flex-wrap:wrap;gap:1.8cqmin;justify-content:flex-end;padding-top:2.4cqmin;border-top:.3cqmin solid rgba(255,255,255,.08)}
.hy-chip{border-radius:99px!important;border:.35cqmin solid var(--hy-ak,#4da3ff)!important;color:var(--hy-ak,#4da3ff);padding:2cqmin 3.6cqmin!important;font-size:3.8cqmin;
  line-height:1.15;max-width:100%}
.hy-chip kbd{font:600 2.8cqmin/1 ui-monospace,monospace;opacity:.6;margin-right:1.2cqmin}
.hy-sperre{position:absolute;inset:0;z-index:45;display:flex;flex-direction:column;align-items:center;padding:16cqmin 5cqmin 9cqmin;
  box-shadow:inset 0 0 0 200cqmax rgba(0,0,0,.2);
  transition:transform .32s cubic-bezier(.4,0,.2,1),opacity .32s}
.hy-sperre.hy-weg{transform:translateY(-100%);opacity:0;pointer-events:none}
.hy-sperre .hy-zl{width:7cqmin;height:7cqmin;fill:#fff;opacity:.9;margin-bottom:1cqmin;transition:transform .2s}
.hy-sperre.hy-offen .hy-zl{transform:translateY(-1cqmin) rotate(-12deg)}
.hy-sperre>small{font-size:4.6cqmin;font-weight:500;opacity:.9}
.hy-sperre>b{font-size:22cqmin;font-weight:250;line-height:1.02;letter-spacing:-.02em;margin:.5cqmin 0 6cqmin}
.hy-sperre .hy-ml{width:100%;display:flex;flex-direction:column;gap:2cqmin;overflow:hidden;flex:1;min-height:0}
.hy-sperre>p{margin:auto 0 0;font-size:3.4cqmin;opacity:.65}
.hy-mk{display:flex;gap:2.4cqmin;align-items:flex-start;width:100%;text-align:left;padding:2.8cqmin 3.2cqmin;border-radius:5cqmin;
  background:rgba(40,40,46,.62);backdrop-filter:blur(16px) saturate(1.4);-webkit-backdrop-filter:blur(16px) saturate(1.4);font-size:3.7cqmin;line-height:1.3}
.hy-mk>i{flex:none;width:8.4cqmin;height:8.4cqmin;border-radius:2.2cqmin;display:flex;align-items:center;justify-content:center}
.hy-mk>i svg{width:5cqmin;height:5cqmin;fill:#fff}
.hy-mk>div{flex:1;min-width:0}
.hy-mk b{display:flex;justify-content:space-between;gap:2cqmin;font-weight:650}
.hy-mk b time{font-weight:400;opacity:.6;font-size:3.2cqmin;flex:none}
.hy-mk span{display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden;opacity:.92}
.hy-ban{position:absolute;z-index:56;left:2.6cqmin;right:2.6cqmin;top:12cqmin;transition:transform .34s cubic-bezier(.2,.9,.3,1.15),opacity .3s;cursor:pointer}
.hy-ban.hy-weg{transform:translateY(-140%);opacity:0;pointer-events:none}
.hy-ban .hy-mk{background:rgba(44,44,50,.86);box-shadow:0 2cqmin 6cqmin rgba(0,0,0,.45)}
.hy-anr{position:absolute;inset:0;z-index:48;display:flex;flex-direction:column;align-items:center;padding:20cqmin 7cqmin 12cqmin;
  background:radial-gradient(120% 70% at 50% 18%,#3a4660 0%,#1c2131 45%,#0b0d13 100%)}
.hy-anr[hidden]{display:none}
.hy-anr .hy-av{width:27cqmin;height:27cqmin;font-size:10.5cqmin;margin-bottom:4cqmin;box-shadow:0 0 0 1.6cqmin rgba(255,255,255,.06)}
.hy-anr.hy-klingelt .hy-av{animation:hyPuls 1.3s ease-out infinite}
@keyframes hyPuls{0%{box-shadow:0 0 0 0 rgba(255,255,255,.28)}100%{box-shadow:0 0 0 6cqmin rgba(255,255,255,0)}}
.hy-anr>b{font-size:7.4cqmin;font-weight:500;text-align:center;line-height:1.15}
.hy-anr>small{font-size:4.1cqmin;opacity:.72;margin-top:1.6cqmin;font-variant-numeric:tabular-nums}
.hy-anr .hy-cap{margin-top:5cqmin;min-height:16cqmin;max-width:100%;font-size:3.8cqmin;line-height:1.35;text-align:center;opacity:.92}
.hy-anr .hy-cap i{display:block;font-style:normal;font-size:3cqmin;opacity:.6;margin-bottom:.6cqmin;letter-spacing:.06em;text-transform:uppercase}
.hy-anr .hy-tg{display:grid;grid-template-columns:repeat(3,1fr);gap:5cqmin 6cqmin;margin-top:auto;margin-bottom:7cqmin}
.hy-anr .hy-tg button{display:flex;flex-direction:column;align-items:center;gap:1.4cqmin;font-size:3.1cqmin;opacity:.92}
.hy-anr .hy-tg button span{display:flex;align-items:center;justify-content:center;width:16cqmin;height:16cqmin;border-radius:50%;background:rgba(255,255,255,.15)}
.hy-anr .hy-tg button[aria-pressed="true"] span{background:#fff}
.hy-anr .hy-tg button[aria-pressed="true"] svg{fill:#111}
.hy-anr .hy-tg svg{width:7cqmin;height:7cqmin;fill:#fff}
.hy-anr .hy-ja{display:flex;gap:22cqmin}
.hy-rund{display:flex;align-items:center;justify-content:center;width:18cqmin;height:18cqmin;border-radius:50%!important;background:#ff3b30!important}
.hy-rund svg{width:8cqmin;height:8cqmin;fill:#fff}
.hy-rund.hy-ab svg{transform:rotate(135deg)}
.hy-rund.hy-gruen{background:#30d158!important}
.hy-av{flex:none;display:inline-flex;align-items:center;justify-content:center;width:10.5cqmin;height:10.5cqmin;border-radius:50%;font-weight:600;font-size:4.2cqmin;
  color:#fff;background:linear-gradient(160deg,var(--a1,#8e8e93),var(--a2,#5b5b60));background-size:cover;background-position:center;text-transform:uppercase}
.hy-alarm{position:absolute;inset:0;z-index:52;display:flex;flex-direction:column;padding:16cqmin 6cqmin 10cqmin;background:rgba(18,18,22,.94);
  backdrop-filter:blur(10px);-webkit-backdrop-filter:blur(10px)}
.hy-alarm[hidden]{display:none}
.hy-alarm>i{font-style:normal;align-self:flex-start;font-size:3cqmin;font-weight:700;letter-spacing:.08em;text-transform:uppercase;background:#ffcc00;color:#111;
  padding:1cqmin 2.4cqmin;border-radius:1.4cqmin;margin-bottom:3cqmin}
.hy-alarm>small{font-size:3.4cqmin;opacity:.7}
.hy-alarm>b{font-size:6.6cqmin;line-height:1.15;margin:1.6cqmin 0 3cqmin;color:#ff9f0a}
.hy-alarm>p{font-size:4.1cqmin;line-height:1.42;margin:0;flex:1;overflow-y:auto}
.hy-alarm>button{margin-top:4cqmin;padding:3.4cqmin!important;border-radius:4cqmin!important;background:rgba(255,255,255,.14)!important;text-align:center!important;font-weight:600;font-size:4.3cqmin}
.hy.hy-vib .hy-geh{animation:hyVib .5s linear 2}
@keyframes hyVib{0%,100%{transform:none}10%,50%,90%{transform:translateX(-1.2%) rotate(-.6deg)}30%,70%{transform:translateX(1.2%) rotate(.6deg)}}
.hy[data-lay="gross"]{height:min(72vh,calc(100% - 40px));right:max(3.5vw,24px);bottom:auto;top:50%;--hy-x:0%;margin-top:calc(min(72vh,calc(100% - 40px)) / -2)}
@media (max-width:640px) and (orientation:portrait){
  .hy:not([data-lay="gross"]){right:auto;left:50%;--hy-x:-50%;bottom:calc(10px + env(safe-area-inset-bottom,0px));height:min(calc(100% - 22px),calc(94vw * 147.6 / 71.6))}}
@media (orientation:landscape) and (max-height:500px){
  .hy:not([data-lay="gross"]){height:auto;width:min(66vw,calc((100vh - 16px) * 147.6 / 71.6));aspect-ratio:147.6/71.6;bottom:6px}
  .hy:not([data-lay="gross"]) .hy-geh{border-radius:7.1% / 14.6%}
  .hy:not([data-lay="gross"]) .hy-glas{border-radius:6.1% / 12.6%;inset:2.3% 1.12%}
  .hy:not([data-lay="gross"]) .hy-insel{top:50%;left:1.2cqh;width:9.4cqmin;height:31cqmin;margin:-15.5cqmin 0 0}
  .hy:not([data-lay="gross"]) .hy-insel::after{right:auto;top:auto;left:2.7cqmin;bottom:3cqmin}
  .hy:not([data-lay="gross"]) .hy-stat{display:none}
  .hy:not([data-lay="gross"]) .hy-app{padding-top:2.5cqmin;padding-left:12cqmin}
  .hy:not([data-lay="gross"]) .hy-ban{top:3cqmin;left:14cqmin}
  .hy:not([data-lay="gross"]) .hy-home{padding:4cqmin 5cqmin 6cqmin 14cqmin}
  .hy:not([data-lay="gross"]) .hy-wid{display:none}
  .hy:not([data-lay="gross"]) .hy-sperre{padding-top:5cqmin}
  .hy:not([data-lay="gross"]) .hy-anr{padding-top:4cqmin}}
.hy-peek{position:absolute;z-index:13;right:max(18px,env(safe-area-inset-right,0px));bottom:calc(14px + env(safe-area-inset-bottom,0px));width:min(330px,calc(100% - 28px));
  transition:transform .38s cubic-bezier(.2,.9,.3,1.1),opacity .3s;pointer-events:auto;cursor:pointer;color:#f2f3f5;container-type:inline-size;
  font-family:var(--hy-font,system-ui,-apple-system,"Segoe UI",Roboto,sans-serif)}
.hy-peek.hy-weg{transform:translateY(130%);opacity:0;pointer-events:none}
.hy-peek .hy-mk{font-size:13px;padding:10px 12px;border-radius:18px;background:rgba(30,30,34,.9);box-shadow:0 10px 30px rgba(0,0,0,.45);gap:10px}
.hy-peek .hy-mk>i{width:30px;height:30px;border-radius:8px} .hy-peek .hy-mk>i svg{width:18px;height:18px}
.hy-peek .hy-mk b time{font-size:11px}
.hy-sucher{position:absolute;inset:0;z-index:12;pointer-events:none;color:#fff;font-family:var(--hy-font,system-ui,-apple-system,"Segoe UI",Roboto,sans-serif)}
.hy-sucher[hidden]{display:none!important}
.hy-sucher .hy-so,.hy-sucher .hy-su{position:absolute;left:0;right:0;background:rgba(0,0,0,.62);backdrop-filter:blur(4px);-webkit-backdrop-filter:blur(4px)}
.hy-sucher .hy-so{top:0;height:46px;display:flex;align-items:center;justify-content:space-between;padding:0 18px;font:600 12px/1 system-ui;letter-spacing:.06em}
.hy-sucher .hy-so span{opacity:.85}
.hy-sucher .hy-su{bottom:0;height:calc(118px + env(safe-area-inset-bottom,0px));padding-bottom:env(safe-area-inset-bottom,0px)}
.hy-sucher .hy-mo{position:absolute;left:0;right:0;top:12px;display:flex;justify-content:center;gap:20px;font:600 11px/1 system-ui;letter-spacing:.1em;opacity:.75}
.hy-sucher .hy-mo b{color:#ffd60a;opacity:1}
.hy-sucher .hy-ra{position:absolute;inset:64px 14% 136px;border:1px solid rgba(255,255,255,.2)}
.hy-sucher .hy-ra::before,.hy-sucher .hy-ra::after{content:'';position:absolute;background:rgba(255,255,255,.14)}
.hy-sucher .hy-ra::before{left:33.3%;right:33.3%;top:0;bottom:0;border-left:1px solid rgba(255,255,255,.14);border-right:1px solid rgba(255,255,255,.14);background:none}
.hy-sucher .hy-ra::after{top:33.3%;bottom:33.3%;left:0;right:0;border-top:1px solid rgba(255,255,255,.14);border-bottom:1px solid rgba(255,255,255,.14);background:none}
.hy-sucher .hy-fo{position:absolute;left:50%;top:50%;width:64px;height:64px;margin:-32px;border:1.5px solid #ffd60a;opacity:.85;transition:border-color .2s}
.hy-sucher.gut .hy-fo{border-color:#30d158}
.hy-sucher .hy-si{position:absolute;left:50%;top:58px;transform:translateX(-50%);background:rgba(10,12,14,.72);border-radius:99px;padding:7px 14px;white-space:nowrap;
  font:500 13px/1.2 system-ui}
.hy-sucher .hy-si:empty{display:none}
.hy-sucher .hy-si b{color:#ffd60a;margin-right:8px;font:700 12px/1 ui-monospace,monospace;letter-spacing:.06em}
.hy-sucher.gut .hy-si b{color:#30d158}
.hy-sucher .hy-sb{position:absolute;left:0;right:0;bottom:calc(16px + env(safe-area-inset-bottom,0px));display:flex;align-items:center;justify-content:space-between;
  padding:0 max(24px,calc(50% - 170px));pointer-events:auto}
.hy-sucher :where(.hy-sb) button{appearance:none;border:0;padding:0;background:none;color:#fff;cursor:pointer;font:inherit}
.hy-sucher .hy-ausl{width:70px;height:70px;border-radius:50%;border:4px solid #fff!important;padding:4px!important;display:flex;align-items:center;justify-content:center}
.hy-sucher .hy-ausl i{display:block;width:100%;height:100%;border-radius:50%;background:#fff;transition:transform .1s}
.hy-sucher .hy-ausl:active i{transform:scale(.88)}
.hy-sucher .hy-th{width:46px;height:46px;border-radius:9px;background:#222 center/cover no-repeat;border:1.5px solid rgba(255,255,255,.7)!important}
.hy-sucher .hy-x{width:46px;height:46px;border-radius:50%;background:rgba(255,255,255,.16)!important;display:flex;align-items:center;justify-content:center;font:400 13px/1 system-ui}
.hy-sucher .hy-x kbd,.hy-sucher .hy-ausl kbd{position:absolute;margin-top:92px;font:600 10px/1 ui-monospace,monospace;opacity:.55}
.hy-sucher .hy-bl{position:absolute;inset:0;background:#fff;opacity:0}
.hy-sucher.blitz .hy-bl{animation:hyBlitz .3s ease-out}
@keyframes hyBlitz{0%{opacity:.85}100%{opacity:0}}
`;
  // ---------------- the apps ----------------
  // def: { name, icon, farbe: [c1, c2], render, fuss, tick, oeffnen, views }
  function app(id, def) {
    if (!id || !def) return null;
    const old = S.apps[id];
    S.apps[id] = Object.assign({ id, name: id, icon: '', farbe: ['#636366', '#3a3a3c'] }, old || {}, def);
    S.dirty = true;
    return S.apps[id];
  }
  // a standard app (handy/handy_apps.js): there for every world that lists it
  function std(id, def) {
    app(id, Object.assign({ std: true }, def));
    if (!S.std.includes(id)) S.std.push(id);
  }
  const liste = () => {
    const l = W().apps;
    return (Array.isArray(l) ? l : S.std).filter(id => S.apps[id]);
  };
  const gesperrt = id => {
    const g = W().gesperrt || {};
    return !S.frei[id] && g[id] != null ? String(g[id] || 'Kommt später.') : '';
  };
  function freischalten(id) {
    if (!S.wid) return false;
    const was = !!gesperrt(id);
    S.frei[id] = true;
    S.dirty = true;
    if (was) {
      const a = S.apps[id];
      mitteilung({
        app: 'einstellungen',
        von: 'System',
        text: (a ? a.name : id) + ' ist jetzt verfügbar.',
        still: !S.open,
      });
      KERN.emit('handy:frei', { app: id });
    }
    return was;
  }
  function sperren(id, text) {
    const c = W();
    c.gesperrt = Object.assign({}, c.gesperrt || {}, { [id]: text || 'Kommt später.' });
    delete S.frei[id];
    S.dirty = true;
  }
  // ---------------- the world ----------------
  function welt(id, cfg) {
    if (!id) {
      stop();
      S.wid = null;
      S.cfg = null;
      return null;
    }
    if (S.wid !== id) stop();
    S.wid = id;
    S.cfg = cfg || {};
    S.frei = {};
    S.mitt = [];
    S.fotos = [];
    if (S.cfg.layout) S.layout = S.cfg.layout;
    if (S.el) {
      // the element's name and the look of a world
      S.el.id = (S.cfg.ids && S.cfg.ids.root) || 'handy';
      S.suEl.id = (S.cfg.ids && S.cfg.ids.sucher) || 'handysucher';
      lay();
    }
    S.dirty = true;
    return S.cfg;
  }
  // ---------------- building it ----------------
  const $ = sel => S.el.querySelector(sel);
  function build() {
    if (S.el) return;
    const st = document.createElement('style');
    st.id = 'hy-css';
    st.textContent = CSS;
    document.head.appendChild(st);
    const root = stage || document.body,
      el = document.createElement('div');
    el.className = 'hy';
    el.id = (W().ids && W().ids.root) || 'handy';
    el.hidden = true;
    el.setAttribute('role', 'dialog');
    el.setAttribute('aria-label', 'Handy');
    el.innerHTML =
      '<div class="hy-geh"><i class="hy-k1"></i><i class="hy-k2"></i><i class="hy-k3"></i><i class="hy-k4"></i><div class="hy-glas">' +
      '<div class="hy-tap"></div>' +
      '<div class="hy-stat"><span class="hy-zeit"></span><span class="hy-rechts"><span class="hy-kn"></span><span class="hy-netz"></span><span class="hy-ak"><b></b></span></span></div>' +
      '<div class="hy-insel"></div>' +
      '<div class="hy-home"><div class="hy-wid"><b class="hy-wz"></b><span class="hy-wd"></span></div><div class="hy-raster"></div><div class="hy-dock"></div></div>' +
      '<div class="hy-app" hidden><header class="hy-kopf"><button type="button" class="hy-zur" aria-label="Zurück">' +
      svg(IC.zurueck) +
      '<span>Zurück</span></button><div><b id="hytitel"></b><small id="hysub"></small></div><span class="hy-akt"></span></header>' +
      '<div class="hy-body" id="hybody"></div><div class="hy-fuss"></div></div>' +
      '<div class="hy-anr" hidden></div><div class="hy-alarm" hidden></div>' +
      '<div class="hy-sperre hy-weg">' +
      svg(IC.lock, 'hy-zl') +
      '<small class="hy-sd"></small><b class="hy-sz"></b><div class="hy-ml"></div><p>Zum Entsperren hochwischen</p></div>' +
      '<div class="hy-ban hy-weg"></div>' +
      '<div class="hy-heim" title="Startbildschirm"><i></i></div></div></div>';
    root.appendChild(el);
    S.el = el;
    const pk = document.createElement('div');
    pk.className = 'hy-peek hy-weg';
    root.appendChild(pk);
    S.peekEl = pk;
    const su = document.createElement('div');
    su.className = 'hy-sucher';
    su.id = (W().ids && W().ids.sucher) || 'handysucher';
    su.hidden = true;
    su.innerHTML =
      '<div class="hy-bl"></div><div class="hy-so"><span>⚡︎ AUTO</span><span>HD · 30</span><span class="hy-sz2"></span></div><div class="hy-ra"></div><div class="hy-fo"></div>' +
      '<div class="hy-si"></div><div class="hy-su"><div class="hy-mo"><span>ZEITLUPE</span><span>VIDEO</span><b>FOTO</b><span>PORTRÄT</span><span>PANO</span></div></div>' +
      '<div class="hy-sb"><button type="button" class="hy-th" data-c="fotos" aria-label="Fotos"></button>' +
      '<button type="button" class="hy-ausl" data-c="foto" aria-label="Foto aufnehmen"><i></i><kbd>E</kbd></button>' +
      '<button type="button" class="hy-x" data-c="zu" aria-label="Kamera schließen">✕</button></div>';
    root.appendChild(su);
    S.suEl = su;
    // what happens on the phone stays on the phone: the game's wheel zoom, clicks to act and the mouse look get nothing of it
    for (const t of ['wheel', 'pointerdown', 'mousedown', 'touchstart', 'click', 'dblclick', 'contextmenu'])
      for (const x of [el, pk]) x.addEventListener(t, e => e.stopPropagation(), { passive: t !== 'contextmenu' });
    el.addEventListener('contextmenu', e => e.preventDefault());
    el.addEventListener('click', onClick);
    pk.addEventListener('click', () => {
      const m = S.peekM;
      peek(null);
      if (m) open(m.app, m.ziel);
    });
    su.addEventListener('click', e => {
      const b = e.target.closest('button');
      if (!b) return;
      e.stopPropagation();
      if (b.dataset.c === 'foto') ausloesen();
      else if (b.dataset.c === 'fotos') {
        sucher(false, { heim: false });
        open('fotos');
      } else sucher(false);
      b.blur();
    });
    gesten(el.querySelector('.hy-glas'));
    lay();
  }
  const tapete = i => {
    const l = W().tapeten || TAPETEN;
    return W().tapete && i == null ? W().tapete : l[(i == null ? S.einst.tapete : i) % l.length] || TAPETEN[0];
  };
  function lay() {
    if (!S.el) return;
    S.el.dataset.lay = S.layout === 'gross' ? 'gross' : 'auto';
    $('.hy-tap').style.background = tapete();
    // the lock screen lies over the home screen: the same picture, a little darker
    $('.hy-sperre').style.background = tapete();
    $('.hy-sperre').style.backgroundSize = 'cover';
    S.el.style.setProperty('--hy-ak', W().farbe || '#4da3ff');
  }
  function layout(l) {
    S.layout = l === 'gross' ? 'gross' : 'auto';
    lay();
    return S.layout;
  }
  // ---------------- the screens ----------------
  const icon = (id, dock) => {
    const a = S.apps[id];
    if (!a) return '';
    const n = gesperrt(id) ? 0 : badge(id),
      f = a.farbe || [];
    return (
      `<button type="button" class="hy-ic${gesperrt(id) ? ' hy-zu' : ''}" data-app="${esc(id)}" aria-label="${esc(a.name)}${n ? ', ' + n + ' neu' : ''}">` +
      `<span style="background:linear-gradient(160deg,${f[0] || '#636366'},${f[1] || f[0] || '#3a3a3c'})">${a.glyph || svg(a.icon)}${n ? '<em>' + (n > 99 ? '99+' : n) + '</em>' : ''}</span>` +
      (dock ? '<b></b>' : '<b>' + esc(a.kurz || a.name) + '</b>') +
      '</button>'
    );
  };
  function badge(id) {
    const n = call(W().badge, id);
    return Number.isFinite(n) && n > 0 ? n | 0 : 0;
  }
  function homeRender() {
    if (!S.el) return;
    const dock = (W().dock || []).filter(id => S.apps[id]),
      rest = liste().filter(id => !dock.includes(id));
    $('.hy-raster').innerHTML = rest.map(id => icon(id)).join('');
    $('.hy-dock').innerHTML = dock.map(id => icon(id, true)).join('');
    $('.hy-dock').hidden = !dock.length;
    $('.hy-wz').textContent = hhmm(now());
    $('.hy-wd').innerHTML = esc(datum()).replace(', ', ',<br>') + (W().ort ? '<br>' + esc(call(W().ort) || '') : '');
  }
  // the context an app renders with
  function ctx() {
    return {
      S,
      cfg: W(),
      daten: D(),
      akt: A(),
      esc,
      hhmm,
      svg,
      IC,
      zeit: now,
      zu: (view, arg) => nav(view, arg),
      zurueck: back,
      neu: () => render(),
      open,
      anruf,
      sucher,
      mitteilung,
      ton,
      schnapp,
      fotos: () => S.fotos,
      tipp,
      av,
    };
  }
  // a person's round picture: initials on a colour of their name, or the world's picture
  const AVC = [
    ['#ff9f0a', '#c25f00'],
    ['#64d2ff', '#0a7ea8'],
    ['#30d158', '#1a7f37'],
    ['#bf5af2', '#7a2ca8'],
    ['#ff375f', '#a8163a'],
    ['#ffd60a', '#a88a00'],
    ['#5e5ce6', '#2d2b9c'],
    ['#ac8e68', '#6b5638'],
  ];
  function av(name, o = {}) {
    const n = String(name || '?'),
      c = AVC[(n.charCodeAt(0) + n.length * 7 + (n.charCodeAt(n.length - 1) || 0)) % AVC.length],
      ini =
        n
          .replace(/[^A-Za-zÄÖÜäöüß0-9 ]/g, '')
          .split(/\s+/)
          .filter(Boolean)
          .slice(0, 2)
          .map(w => w[0])
          .join('') || '#';
    return o.bild
      ? `<span class="hy-av ${o.cls || ''}" style="background-image:url('${esc(o.bild)}')"></span>`
      : `<span class="hy-av ${o.cls || ''}" style="--a1:${c[0]};--a2:${c[1]}">${esc(ini)}</span>`;
  }
  // the current app's screen
  function render(dir) {
    if (!S.el) return;
    S.dirty = false;
    statusLine();
    if (!S.app) {
      homeRender();
      S.el.dataset.ort = 'home';
      return;
    }
    const a = S.apps[S.app];
    if (!a) {
      S.app = null;
      return render();
    }
    S.el.dataset.ort = 'app';
    S.el.dataset.app = S.app;
    const top = S.stack[S.stack.length - 1] || { v: '', arg: null },
      body = $('#hybody'),
      keep = dir ? 0 : body.scrollTop,
      atEnd = body.scrollHeight - body.scrollTop - body.clientHeight < 8;
    let r = null;
    try {
      r = a.render ? a.render(body, ctx(), top.v, top.arg) : null;
    } catch (e) {
      console.warn('handy app ' + S.app, e);
      body.innerHTML = '<p class="hy-leer">Die App ist abgestürzt.</p>';
    }
    r = r || {};
    $('#hytitel').textContent = r.titel != null ? r.titel : a.name;
    $('#hysub').textContent = r.sub || '';
    $('.hy-akt').innerHTML = r.akt || '';
    const zur = $('.hy-zur');
    zur.hidden = false;
    zur.querySelector('span').textContent = S.stack.length > 1 ? r.zurueck || 'Zurück' : 'Start';
    const fu = $('.hy-fuss');
    fu.innerHTML = '';
    if (a.fuss)
      try {
        a.fuss(fu, ctx(), top.v, top.arg);
      } catch (e) {
        console.warn('handy fuss', e);
      }
    if (dir) {
      body.classList.remove('hy-vr', 'hy-vl');
      if (dir !== 2) {
        void body.offsetWidth;
        body.classList.add(dir > 0 ? 'hy-vr' : 'hy-vl');
      }
      body.scrollTop = r.unten ? body.scrollHeight : 0;
    } else body.scrollTop = r.unten && (atEnd || r.unten === 'immer') ? body.scrollHeight : keep;
  }
  // a view inside the app (a thread from the list, a note, a photo)
  function nav(view, arg) {
    S.stack.push({ v: view, arg });
    tipp();
    render(1);
    KERN.emit('handy:app', { app: S.app, view });
  }
  // back: one view, else out of the app (home), else put away
  function back() {
    if (S.anruf) return true;
    if (S.alarm) return alarmZu();
    if (!S.app) return (close(), false);
    if (S.stack.length > 1) {
      S.stack.pop();
      tipp();
      render(-1);
      KERN.emit('handy:app', { app: S.app, view: S.stack[S.stack.length - 1].v });
      return true;
    }
    return home();
  }
  // out of the app: it shrinks back into its icon
  function home() {
    if (!S.el || !S.app) return false;
    const ap = $('.hy-app'),
      from = S.app;
    S.app = null;
    S.stack = [];
    tipp();
    render();
    const ic = $(`.hy-ic[data-app="${from}"]`);
    origin(ap, ic);
    ap.classList.remove('hy-auf');
    void ap.offsetWidth;
    ap.classList.add('hy-ab');
    clearTimeout(S.abT);
    S.abT = setTimeout(
      () => {
        if (!S.app) ap.hidden = true;
        ap.classList.remove('hy-ab');
      },
      window.FREEZE ? 0 : 240
    );
    KERN.emit('handy:app', { app: null });
    return true;
  }
  // where the app grows out of: its icon's middle on the screen
  function origin(ap, ic) {
    if (!ic) {
      ap.style.setProperty('--ox', '50%');
      ap.style.setProperty('--oy', '60%');
      return;
    }
    const g = $('.hy-glas').getBoundingClientRect(),
      r = ic.getBoundingClientRect();
    if (!g.width) return;
    ap.style.setProperty('--ox', (((r.left + r.width / 2 - g.left) / g.width) * 100).toFixed(1) + '%');
    ap.style.setProperty('--oy', (((r.top + r.width / 2 - g.top) / g.height) * 100).toFixed(1) + '%');
  }
  // an app starts: from its icon, the screen grows out of it
  function start(id, view, arg) {
    const a = S.apps[id];
    if (!a) return false;
    const why = gesperrt(id);
    if (why) {
      mitteilung({ app: id, von: a.name, text: why, still: true, kurz: true });
      ton('nein');
      return false;
    }
    if (a.oeffnen && call(a.oeffnen, ctx(), view, arg) === false) return true;
    const same = S.app === id;
    S.app = id;
    S.stack = [{ v: '', arg: null }];
    if (view) S.stack.push({ v: view, arg });
    const ap = $('.hy-app');
    clearTimeout(S.abT);
    ap.classList.remove('hy-ab');
    ap.hidden = false;
    if (!same) {
      homeRender();
      origin(ap, $(`.hy-ic[data-app="${id}"]`));
      ap.classList.remove('hy-auf');
      void ap.offsetWidth;
      ap.classList.add('hy-auf');
    }
    render(view ? 1 : 2);
    KERN.emit('handy:app', { app: id, view: view || '' });
    return true;
  }
  // a direct way into an app's view (a notification, a world's button)
  function zeige(id, view, arg) {
    if (!S.open && !open()) return false;
    entsperren(true);
    return start(id, view, arg);
  }
  // ---------------- taking it out, putting it away ----------------
  function open(id, arg) {
    if (!S.wid) return false;
    const why = call(W().darf);
    if (why !== undefined && why !== true) {
      if (typeof why === 'string' && A().hinweis) call(A().hinweis, why);
      return false;
    }
    build();
    if (S.sucher) sucher(false, { heim: false });
    const was = S.open;
    if (!was) {
      S.open = true;
      S.el.hidden = false;
      S.el.classList.remove('hy-vib');
      lay();
      // the lock screen while it comes up, then it unlocks by itself (the face)
      S.sperre = W().sperre === false ? -1 : 0.62;
      const sp = $('.hy-sperre');
      sp.classList.toggle('hy-weg', S.sperre < 0);
      sp.classList.remove('hy-offen');
      sperreRender();
      if (document.pointerLockElement) {
        S.unlocked = true;
        try {
          HUD.unlock();
        } catch (e) {}
      }
      ton('auf');
      if (S.peekEl) peek(null);
      KERN.emit('handy:auf', { app: id || '' });
    }
    if (id && S.apps[id]) {
      if (S.app !== id || arg != null) start(id, arg && arg.view, arg && arg.arg);
      else render();
    } else if (!was) {
      // back where one left it (an app stays open while the phone is away), else home
      if (S.app && S.apps[S.app]) {
        $('.hy-app').hidden = false;
        render();
      } else {
        S.app = null;
        $('.hy-app').hidden = true;
        render();
      }
    }
    if (!was) tick(0);
    return true;
  }
  function entsperren(fast) {
    if (S.sperre < 0 || !S.el) return;
    S.sperre = -1;
    const sp = $('.hy-sperre');
    sp.classList.add('hy-offen');
    if (fast) sp.classList.add('hy-weg');
    else setTimeout(() => sp.classList.add('hy-weg'), window.FREEZE ? 0 : 140);
  }
  const zu = () =>
    new Promise(res => {
      if (!S.open) res();
      else S.res.push(res);
    });
  function close(o) {
    if (!S.open) return false;
    if (S.anruf && S.anruf.st !== 'ende' && !(o && o.auchAnruf)) {
      // a call goes on in the pocket only when it is ended – putting it away ends it
      auflegen();
    }
    S.open = false;
    S.sperre = -1;
    ton('zu');
    for (const r of S.res.splice(0)) r();
    if (S.unlocked) {
      S.unlocked = false;
      if (!S.sucher)
        try {
          if (!COARSE) HUD.lockNow();
        } catch (e) {}
    }
    KERN.emit('handy:zu', {});
    if (o && o.sofort) hideNow();
    return true;
  }
  function hideNow() {
    S.k = 0;
    if (S.el) {
      S.el.hidden = true;
      S.el.style.setProperty('--hy-e', '0');
    }
  }
  const toggle = () => {
    if (S.sucher) return (sucher(false, { heim: false }), false);
    return S.open ? (close(), false) : open();
  };
  // ---------------- the status bar and the lock screen ----------------
  function statusLine() {
    if (!S.el) return;
    $('.hy-zeit').textContent = hhmm(now());
    let n = call(W().netz);
    n = Number.isFinite(n) ? Math.max(-1, Math.min(4, Math.round(n))) : 4;
    const kn = $('.hy-kn'),
      ne = $('.hy-netz');
    if (n < 0) {
      kn.textContent = 'Kein Netz';
      ne.innerHTML = '';
    } else {
      kn.textContent = n <= 1 ? (W().netzName ? W().netzName + ' ' : '') + 'E' : n >= 3 ? '5G' : '4G';
      ne.innerHTML =
        '<svg viewBox="0 0 17 11">' +
        [0, 1, 2, 3]
          .map(
            i =>
              `<rect x="${i * 4.5}" y="${8 - i * 2.6}" width="3" height="${3 + i * 2.6}" rx=".8" opacity="${i < n ? 1 : 0.28}"/>`
          )
          .join('') +
        '</svg>';
    }
    let ak = call(W().akku);
    ak = Number.isFinite(ak) ? Math.max(1, Math.min(100, ak)) : 82;
    const a = $('.hy-ak');
    a.classList.toggle('lo', ak <= 20);
    a.firstChild.style.width = Math.round(ak) + '%';
    a.title = Math.round(ak) + ' %';
  }
  const mkHtml = (m, cls) => {
    const a = S.apps[m.app] || {},
      f = a.farbe || ['#636366', '#3a3a3c'];
    return (
      `<div class="hy-mk ${cls || ''}" data-app="${esc(m.app || '')}"><i style="background:linear-gradient(160deg,${f[0]},${f[1] || f[0]})">${a.glyph || svg(a.icon || IC.lock)}</i>` +
      `<div><b><span>${esc(m.von || a.name || '')}</span><time>${m.kurz ? '' : esc(hhmm(m.t))}</time></b><span>${esc(m.titel ? m.titel + ' – ' : '')}${esc(m.text)}</span></div></div>`
    );
  };
  function sperreRender() {
    if (!S.el) return;
    $('.hy-sd').textContent = datum();
    $('.hy-sz').textContent = hhmm(now());
    $('.hy-ml').innerHTML = S.mitt
      .slice(-4)
      .reverse()
      .map(m => mkHtml(m))
      .join('');
  }
  // ---------------- notifications ----------------
  // { app, von, titel, text, bild, ziel, still (no sound), kurz } – a banner on the phone, the peek beside it while it is away
  function mitteilung(m) {
    if (!S.wid || !m) return false;
    m = Object.assign({ t: now() }, m);
    if (!m.kurz) {
      S.mitt.push(m);
      if (S.mitt.length > 12) S.mitt.shift();
    }
    S.dirty = true;
    // not while one looks at the very thread it belongs to
    const hier =
      S.open && S.app === m.app && (!m.ziel || JSON.stringify(m.ziel) === JSON.stringify(S.stack[S.stack.length - 1]));
    if (!m.still) ton(m.ton || (hier ? 'empfang' : 'mitteilung'));
    if (S.open) {
      if (!hier) {
        build();
        const b = $('.hy-ban');
        b.innerHTML = mkHtml(m);
        b.classList.remove('hy-weg');
        S.banner = m;
        S.bannerT = m.kurz ? 2.2 : 3.6;
      }
    } else if (!m.kurz && W().peek !== false) peek(m);
    if (!m.kurz) KERN.emit('handy:mitteilung', { app: m.app || '' });
    if (S.einst.vorlesen && !m.still && !m.kurz && m.text && STIMME.say)
      try {
        STIMME.say(W().stimme || 'erzaehler', (m.von ? m.von + ': ' : '') + m.text);
      } catch (e) {}
    return true;
  }
  function peek(m) {
    build();
    S.peekM = m;
    if (!m) {
      S.peekEl.classList.add('hy-weg');
      S.peekT = 0;
      return;
    }
    S.peekEl.innerHTML = mkHtml(m);
    S.peekEl.classList.remove('hy-weg');
    S.peekT = 4.2;
  }
  // ---------------- sounds, synthesised ----------------
  function ton(art) {
    if (!S.einst.toene) return;
    let R = null;
    try {
      R = audio.raw ? audio.raw() : null;
    } catch (e) {}
    if (!R || !R.ctx) return;
    const c = R.ctx,
      t = c.currentTime + 0.01,
      out = R.sfx || R.master;
    const tone = (f, t0, d, peak, type = 'sine', f1 = 0) => {
      const o = c.createOscillator(),
        g = c.createGain();
      o.type = type;
      o.frequency.setValueAtTime(f, t0);
      if (f1) o.frequency.exponentialRampToValueAtTime(f1, t0 + d);
      g.gain.setValueAtTime(0.0001, t0);
      g.gain.exponentialRampToValueAtTime(peak, t0 + 0.006);
      g.gain.exponentialRampToValueAtTime(0.0001, t0 + d);
      o.connect(g);
      g.connect(out);
      o.start(t0);
      o.stop(t0 + d + 0.03);
    };
    const klick = (t0, f, peak) => {
      const n = Math.floor(c.sampleRate * 0.025),
        b = c.createBuffer(1, n, c.sampleRate),
        d = b.getChannelData(0);
      for (let i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / n, 6);
      const s = c.createBufferSource(),
        bp = c.createBiquadFilter(),
        g = c.createGain();
      s.buffer = b;
      bp.type = 'bandpass';
      bp.frequency.value = f;
      bp.Q.value = 1.2;
      g.gain.value = peak;
      s.connect(bp);
      bp.connect(g);
      g.connect(out);
      s.start(t0);
    };
    switch (art) {
      case 'tipp':
        tone(2100, t, 0.028, 0.035);
        break;
      case 'auf':
        klick(t, 2400, 0.25);
        break;
      case 'zu':
        klick(t, 1300, 0.3);
        break;
      case 'nein':
        tone(330, t, 0.09, 0.05, 'triangle');
        tone(262, t + 0.1, 0.12, 0.05, 'triangle');
        break;
      case 'senden':
        tone(700, t, 0.16, 0.05, 'sine', 1500);
        break;
      case 'empfang':
        tone(1046.5, t, 0.12, 0.06);
        tone(1568, t + 0.09, 0.18, 0.05);
        break;
      case 'mitteilung':
        // a soft marimba-like rise: two notes and their octave
        for (const [f, d] of [
          [1174.7, 0],
          [1568, 0.13],
        ]) {
          tone(f, t + d, 0.32, 0.09);
          tone(f * 2, t + d, 0.12, 0.025);
        }
        break;
      case 'klingel':
        // an arpeggio that rises and falls (the phone's own ringtone, not a known one)
        [1046.5, 1318.5, 1568, 2093, 1568, 1318.5].forEach((f, i) => {
          tone(f, t + i * 0.12, 0.26, 0.085);
          tone(f / 2, t + i * 0.12, 0.2, 0.03, 'triangle');
        });
        break;
      case 'tuut':
        // the German ringing tone: 425 Hz, a second long
        tone(425, t, 1.0, 0.045, 'sine');
        break;
      case 'besetzt':
        for (let i = 0; i < 3; i++) tone(425, t + i * 0.32, 0.16, 0.05);
        break;
      case 'ende':
        tone(784, t, 0.1, 0.05);
        tone(587, t + 0.12, 0.1, 0.05);
        tone(392, t + 0.24, 0.16, 0.05);
        break;
      case 'ausloeser':
        klick(t, 3200, 0.5);
        klick(t + 0.07, 2000, 0.4);
        break;
      case 'alarm':
        // a scenario's alert: clearly not the official warning tone (no 853/960 Hz chord) – a falling third, three times
        for (let i = 0; i < 3; i++) {
          tone(988, t + i * 0.7, 0.3, 0.08, 'triangle');
          tone(784, t + i * 0.7 + 0.32, 0.3, 0.08, 'triangle');
        }
        break;
    }
  }
  // a tap on the phone: the sound and, for the hold, the thumb
  function tipp() {
    S.tipp = performance.now();
    ton('tipp');
    KERN.emit('handy:tipp', {});
  }
  // ---------------- clicks ----------------
  function onClick(e) {
    const t = e.target;
    if (S.sperre >= 0) {
      entsperren();
      return;
    }
    const ic = t.closest('.hy-ic');
    if (ic && ic.dataset.app) {
      tipp();
      start(ic.dataset.app);
      return;
    }
    if (t.closest('.hy-heim')) {
      if (S.anruf) return;
      if (S.alarm) alarmZu();
      else if (S.app) home();
      else {
        tipp();
        close();
      }
      return;
    }
    if (t.closest('.hy-zur')) {
      back();
      return;
    }
    const mk = t.closest('.hy-ban .hy-mk');
    if (mk) {
      const m = S.banner;
      $('.hy-ban').classList.add('hy-weg');
      S.banner = null;
      if (m && m.app && S.apps[m.app]) {
        tipp();
        start(m.app, m.ziel && m.ziel.v, m.ziel && m.ziel.arg);
      }
      return;
    }
    if (t.closest('.hy-alarm button')) return alarmZu();
    const an = t.closest('.hy-anr button');
    if (an) return anrufKnopf(an.dataset.k, an);
    const b = t.closest('[data-hy]');
    if (b && S.app) {
      const a = S.apps[S.app];
      if (a && a.klick) {
        const r = call(a.klick, b.dataset.hy, b, ctx(), e);
        if (r !== false) tipp();
      }
    }
  }
  // ---------------- touch: the bottom bar and the left edge ----------------
  function gesten(g) {
    let st = null;
    g.addEventListener('pointerdown', e => {
      const r = g.getBoundingClientRect();
      st = {
        x: e.clientX,
        y: e.clientY,
        unten: e.clientY > r.bottom - Math.max(18, r.height * 0.05),
        links: e.clientX < r.left + Math.max(14, r.width * 0.05),
        done: false,
      };
    });
    g.addEventListener('pointermove', e => {
      if (!st || st.done) return;
      const dx = e.clientX - st.x,
        dy = e.clientY - st.y;
      if (st.unten && dy < -34) {
        st.done = true;
        if (S.sperre >= 0) entsperren();
        else if (S.app) home();
      } else if (st.links && dx > 46 && Math.abs(dy) < 40) {
        st.done = true;
        back();
      } else if (S.sperre >= 0 && dy < -40) {
        st.done = true;
        entsperren();
      }
    });
    const end = () => (st = null);
    g.addEventListener('pointerup', end);
    g.addEventListener('pointercancel', end);
  }
  // ---------------- keys ----------------
  window.addEventListener(
    'keydown',
    e => {
      if (!S.wid || e.ctrlKey || e.metaKey || e.altKey) return;
      const tg = e.target;
      if (tg && (tg.tagName === 'INPUT' || tg.tagName === 'TEXTAREA' || tg.isContentEditable)) return;
      const k = e.key;
      let hit = false;
      if (S.sucher) {
        hit = true;
        if (k === 'Escape' || k === 'Backspace') sucher(false);
        else if (k === 'e' || k === 'E' || k === 'Enter' || k === ' ') {
          if (!e.repeat) ausloesen();
        } else hit = false;
      } else if (S.open) {
        hit = true;
        if (k === 'Escape') {
          if (S.alarm) alarmZu();
          else close();
        } else if (k === 'Backspace') back();
        else if (S.sperre >= 0 && (k === 'Enter' || k === ' ' || k === 'ArrowUp')) entsperren();
        else if (S.anruf && S.anruf.st === 'eingehend' && (k === 'Enter' || k === 'e' || k === 'E')) annehmen();
        else if (/^[1-9]$/.test(k)) {
          const i = +k - 1;
          if (!S.app) {
            const l = [...S.el.querySelectorAll('.hy-home .hy-ic')];
            if (l[i]) {
              tipp();
              start(l[i].dataset.app);
            }
          } else {
            const ch = S.el.querySelectorAll('.hy-fuss .hy-chip');
            if (ch[i]) ch[i].click();
            else hit = false;
          }
        } else if (k === 'ArrowDown' || k === 'ArrowUp' || k === 'PageDown' || k === 'PageUp') {
          const b = S.app && $('#hybody');
          if (b) b.scrollBy({ top: (k === 'ArrowDown' ? 1 : k === 'ArrowUp' ? -1 : k === 'PageDown' ? 4 : -4) * 60 });
          else hit = false;
        } else hit = false;
      }
      if (hit) {
        e.preventDefault();
        e.stopImmediatePropagation();
      }
    },
    true
  );
  // the mouse back in the picture: the phone is put away (the viewfinder wants the mouse look)
  document.addEventListener('pointerlockchange', () => {
    if (document.pointerLockElement && S.open) {
      S.unlocked = false;
      close();
    }
  });
  // ---------------- calls ----------------
  // k: { id, name, nummer, bild, rolle } – o: { szene(ctl) → Promise, klingeln: s, annehmen: s (incoming taken by itself), app: back to }
  function anrufStart(k, o, st) {
    if (!S.wid || !k) return null;
    if (S.anruf && S.anruf.st !== 'ende') auflegen(true);
    if (!S.open && !open()) return null;
    entsperren(true);
    S.anruf = { k, o: o || {}, st, t: 0, d: 0, stumm: false, laut: false, id: ++S.n, cap: '', capW: '', ring: 0 };
    anrufRender();
    KERN.emit('handy:anruf', { st, wer: k.name });
    return S.anruf;
  }
  function anruf(k, o) {
    const c = anrufStart(k, o, 'waehlt');
    if (c) tipp();
    return !!c;
  }
  function eingehend(k, o) {
    const c = anrufStart(k, o, 'eingehend');
    if (!c) return false;
    S.el.classList.remove('hy-vib');
    void S.el.offsetWidth;
    S.el.classList.add('hy-vib');
    return true;
  }
  const ctlOf = c => ({
    aktiv: () => S.anruf === c && c.st === 'aktiv',
    // a line of the other side (or one's own): the world's voice and subtitles, the call screen's caption
    sag(wer, text, o) {
      if (S.anruf !== c || c.st !== 'aktiv') return Promise.resolve(false);
      c.cap = String(text || '');
      c.capW = String((o && o.name) || wer || '');
      anrufRender();
      const done = () => {
        if (S.anruf === c && c.cap === String(text || '')) {
          c.cap = '';
          anrufRender();
        }
      };
      const f = A().sag;
      let p = null;
      try {
        p = f ? f(wer, text, Object.assign({ telefon: true }, o || {})) : STIMME.say(wer, text);
      } catch (e) {}
      const dauer = Math.max(1.6, 0.5 + String(text || '').length * 0.062);
      return Promise.race([
        Promise.resolve(p).then(r => (r === false ? warte(dauer) : r)),
        new Promise(res => setTimeout(res, (dauer + 6) * 1000)),
      ]).then(() => {
        done();
        return S.anruf === c && c.st === 'aktiv';
      });
    },
    warte: s => warte(s),
    ende: () => S.anruf === c && auflegen(),
    kontakt: c.k,
  });
  const warte = s => new Promise(res => setTimeout(res, Math.max(0, s) * 1000));
  function verbinden() {
    const c = S.anruf;
    if (!c) return;
    c.st = 'aktiv';
    c.d = 0;
    anrufRender();
    KERN.emit('handy:anruf', { st: 'aktiv', wer: c.k.name });
    const f = c.o.szene || A().anruf,
      p = f ? call(f, c.k, ctlOf(c), c.o.art || (c.ein ? 'ein' : 'aus')) : null;
    if (p === false) {
      c.st = 'besetzt';
      ton('besetzt');
      anrufRender();
      setTimeout(() => S.anruf === c && auflegen(), 1500);
      return;
    }
    if (!p || typeof p.then !== 'function') {
      // nobody there: the mailbox says so
      if (!f) {
        c.cap = 'Die Person ist gerade nicht erreichbar.';
        c.capW = 'Mailbox';
        anrufRender();
      }
      setTimeout(() => S.anruf === c && auflegen(), f ? 1500 : 2600);
      return;
    }
    Promise.resolve(p).then(
      () => S.anruf === c && c.st === 'aktiv' && setTimeout(() => S.anruf === c && auflegen(), 700),
      () => S.anruf === c && auflegen()
    );
  }
  function annehmen() {
    const c = S.anruf;
    if (!c || c.st !== 'eingehend') return;
    c.ein = true;
    tipp();
    verbinden();
  }
  function auflegen(still) {
    const c = S.anruf;
    if (!c || c.st === 'ende') return false;
    const war = c.st;
    c.st = 'ende';
    c.endT = 1.1;
    try {
      if (war === 'aktiv' && STIMME.stop) STIMME.stop();
    } catch (e) {}
    if (!still) ton('ende');
    // the recents
    const f = A().anrufListe || A().protokoll;
    call(f, {
      wer: c.k.name,
      id: c.k.id,
      art: c.ein ? 'ein' : war === 'eingehend' ? 'verpasst' : 'aus',
      d: Math.round(c.d),
      t: now(),
    });
    anrufRender();
    KERN.emit('handy:anruf', { st: 'ende', wer: c.k.name, d: c.d });
    return true;
  }
  function anrufKnopf(k, b) {
    const c = S.anruf;
    if (!c) return;
    if (k === 'ab' || k === 'ende') return auflegen();
    if (k === 'an') return annehmen();
    tipp();
    if (k === 'stumm') c.stumm = !c.stumm;
    if (k === 'laut') c.laut = !c.laut;
    anrufRender();
    if (b) b.blur();
  }
  function anrufRender() {
    if (!S.el) return;
    const el = $('.hy-anr'),
      c = S.anruf;
    if (!c) {
      el.hidden = true;
      el.innerHTML = '';
      return;
    }
    el.hidden = false;
    const zeit = Math.floor(c.d / 60) + ':' + String(Math.floor(c.d % 60)).padStart(2, '0'),
      txt =
        c.st === 'waehlt'
          ? 'Anruf wird aufgebaut …'
          : c.st === 'klingelt'
            ? 'Klingelt …'
            : c.st === 'eingehend'
              ? (c.k.rolle ? c.k.rolle + ' · ' : '') + 'ruft an …'
              : c.st === 'aktiv'
                ? zeit
                : c.st === 'besetzt'
                  ? 'Besetzt'
                  : 'Anruf beendet' + (c.d > 0.5 ? ' · ' + zeit : '');
    el.className = 'hy-anr' + (c.st === 'eingehend' || c.st === 'klingelt' ? ' hy-klingelt' : '');
    const knopf = (k, ic, n, p) =>
      `<button type="button" data-k="${k}"${p != null ? ` aria-pressed="${p}"` : ''}><span>${svg(ic)}</span>${n}</button>`;
    el.innerHTML =
      av(c.k.name, { bild: c.k.bild }) +
      `<b>${esc(c.k.name)}</b><small>${esc(txt)}</small>` +
      `<div class="hy-cap">${c.cap ? '<i>' + esc(c.capW) + '</i>' + esc(c.cap) : ''}</div>` +
      (c.st === 'eingehend'
        ? `<div class="hy-ja"><button type="button" class="hy-rund hy-ab" data-k="ab" aria-label="Ablehnen">${svg(IC.hoerer)}</button>` +
          `<button type="button" class="hy-rund hy-gruen" data-k="an" aria-label="Annehmen">${svg(IC.hoerer)}</button></div>`
        : `<div class="hy-tg">${knopf('stumm', IC.stumm, 'Stumm', c.stumm)}${knopf('tasten', IC.tasten, 'Tasten')}${knopf('laut', IC.laut, 'Lautspr.', c.laut)}</div>` +
          (c.st === 'ende'
            ? '<div style="height:18cqmin"></div>'
            : `<button type="button" class="hy-rund hy-ab" data-k="ende" aria-label="Auflegen">${svg(IC.hoerer)}</button>`));
  }
  function anrufTick(dt) {
    const c = S.anruf;
    if (!c) return;
    c.t += dt;
    if (c.st === 'aktiv') {
      const s0 = Math.floor(c.d);
      c.d += dt;
      if (Math.floor(c.d) !== s0) {
        const sm = S.el && S.el.querySelector('.hy-anr>small');
        if (sm) sm.textContent = Math.floor(c.d / 60) + ':' + String(Math.floor(c.d % 60)).padStart(2, '0');
      }
    } else if (c.st === 'waehlt' && c.t > 0.7) {
      c.st = 'klingelt';
      c.t = 0;
      c.ring = 0;
      anrufRender();
    } else if (c.st === 'klingelt') {
      if ((c.ring -= dt) <= 0) {
        c.ring = 4.2;
        ton('tuut');
      }
      if (c.t > (c.o.klingeln != null ? c.o.klingeln : 2.6)) verbinden();
    } else if (c.st === 'eingehend') {
      if ((c.ring -= dt) <= 0) {
        c.ring = 1.9;
        ton('klingel');
      }
      if (c.o.annehmen != null && c.t > c.o.annehmen) annehmen();
      else if (c.t > (c.o.dauer || 24)) auflegen();
    } else if (c.st === 'ende' && (c.endT -= dt) <= 0) {
      S.anruf = null;
      anrufRender();
      if (S.app) render();
      else homeRender();
    }
  }
  // ---------------- the camera ----------------
  // a real frame of the renderer (the 3D picture without the page's panels), 4:3 from the middle, w pixels wide
  function schnapp(w = 480) {
    try {
      if (window.GAME && GAME.shot) GAME.shot();
      const src = RENDERER.domElement,
        sw = src.width,
        sh = src.height;
      if (!sw || !sh) return '';
      let cw = sw,
        ch = Math.round((sw * 3) / 4);
      if (ch > sh) {
        ch = sh;
        cw = Math.round((sh * 4) / 3);
      }
      const cv = document.createElement('canvas');
      cv.width = w;
      cv.height = Math.round((w * 3) / 4);
      cv.getContext('2d').drawImage(src, (sw - cw) / 2, (sh - ch) / 2, cw, ch, 0, 0, cv.width, cv.height);
      return cv.toDataURL('image/jpeg', 0.82);
    } catch (e) {
      return '';
    }
  }
  // the viewfinder: on – the phone up to the eyes, the mouse looks around; off – back to the phone (o.heim) or away
  function sucher(on, o = {}) {
    on = !!on;
    if (on === S.sucher) return false;
    if (on && !S.wid) return false;
    build();
    if (on) {
      S.sucherVon = o.von != null ? o.von : S.open ? 'handy' : '';
      if (S.open) close({ auchAnruf: true });
      S.sucher = true;
      if (S.peekEl) peek(null);
      S.suEl.hidden = false;
      S.suEl.classList.remove('blitz');
      sucherStatus();
      thumb();
      try {
        if (!COARSE) HUD.lockNow();
      } catch (e) {}
      KERN.emit('handy:sucher', { on: true });
    } else {
      S.sucher = false;
      S.suEl.hidden = true;
      KERN.emit('handy:sucher', { on: false });
      if (S.sucherVon === 'handy' && o.heim !== false) {
        S.sucherVon = '';
        open();
        if (S.app === 'kamera') home();
      }
    }
    return true;
  }
  function sucherStatus() {
    if (!S.sucher) return;
    const s = call(A().sucher) || {};
    S.suEl.classList.toggle('gut', !!s.gut);
    const si = S.suEl.querySelector('.hy-si');
    si.innerHTML = s.n || s.text ? (s.n ? '<b>' + esc(s.n) + '</b>' : '') + esc(s.text || '') : '';
    S.suEl.querySelector('.hy-sz2').textContent = hhmm(now());
  }
  function thumb() {
    const f = S.fotos[S.fotos.length - 1];
    if (S.suEl) S.suEl.querySelector('.hy-th').style.backgroundImage = f ? `url('${f.img}')` : '';
  }
  // the shutter: the world decides whether it counts (false: no picture), the picture is real
  function ausloesen() {
    if (!S.sucher) return false;
    const r = call(A().ausloesen);
    if (r === false) {
      ton('nein');
      sucherStatus();
      return false;
    }
    ton('ausloeser');
    S.suEl.classList.remove('blitz');
    void S.suEl.offsetWidth;
    S.suEl.classList.add('blitz');
    const img = schnapp(480);
    if (img) {
      const f = { img, t: now(), ort: call(D().ortName) || '' };
      S.fotos.push(f);
      if (S.fotos.length > 24) S.fotos.shift();
      thumb();
      call(A().foto, img, f);
      KERN.emit('handy:foto', { n: S.fotos.length });
    }
    sucherStatus();
    return r === undefined ? true : r;
  }
  // ---------------- an alert (a scenario's warning) ----------------
  function alarm(o) {
    if (!S.wid || !o) return false;
    if (!S.open) open();
    build();
    entsperren(true);
    S.alarm = o;
    const el = $('.hy-alarm');
    el.hidden = false;
    el.innerHTML =
      (o.marke ? `<i>${esc(o.marke)}</i>` : '') +
      `<small>${esc(o.absender || 'Warnung')} · ${esc(hhmm(now()))}</small><b>${esc(o.titel || '')}</b><p>${esc(o.text || '')}</p>` +
      '<button type="button">OK</button>';
    ton('alarm');
    S.el.classList.remove('hy-vib');
    void S.el.offsetWidth;
    S.el.classList.add('hy-vib');
    KERN.emit('handy:alarm', { titel: o.titel || '' });
    return true;
  }
  function alarmZu() {
    if (!S.alarm || !S.el) return false;
    S.alarm = null;
    $('.hy-alarm').hidden = true;
    tipp();
    return true;
  }
  // ---------------- per frame ----------------
  const ease = u => 1 - Math.pow(1 - Math.max(0, Math.min(1, u)), 3);
  function tick(dt) {
    if (!S.el) return;
    // up and down: game time, so the tests see it where it ends
    const k0 = S.k;
    S.k = Math.max(0, Math.min(1, S.k + (S.open ? 1 : -1) * dt * (1 / 0.34)));
    if (S.k !== k0 || dt === 0) {
      S.el.style.setProperty('--hy-e', ease(S.k).toFixed(4));
      if (!S.open && S.k <= 0) S.el.hidden = true;
    }
    if (S.sperre >= 0 && S.open) {
      S.sperre -= dt;
      if (S.sperre < 0) {
        S.sperre = 0;
        entsperren();
      }
    }
    if (S.bannerT > 0 && (S.bannerT -= dt) <= 0) {
      $('.hy-ban').classList.add('hy-weg');
      S.banner = null;
    }
    if (S.peekT > 0 && (S.peekT -= dt) <= 0) peek(null);
    anrufTick(dt);
    if ((S.acc += dt) < 0.25) return;
    const a = S.acc;
    S.acc = 0;
    if (S.open) {
      if (S.dirty) render();
      else statusLine();
      if (S.sperre >= 0) sperreRender();
      const ap = S.app && S.apps[S.app];
      if (ap && ap.tick) call(ap.tick, a, ctx());
    }
    if (S.sucher) sucherStatus();
  }
  KERN.tick(dt => tick(dt), 'handy');
  // everything away (a world ends, „Beenden“)
  function stop() {
    if (S.anruf) {
      try {
        if (S.anruf.st === 'aktiv' && STIMME.stop) STIMME.stop();
      } catch (e) {}
      S.anruf = null;
    }
    if (S.sucher) {
      S.sucher = false;
      if (S.suEl) S.suEl.hidden = true;
    }
    S.sucherVon = '';
    if (S.open) close({ sofort: true });
    hideNow();
    S.app = null;
    S.stack = [];
    S.alarm = null;
    S.banner = null;
    S.bannerT = 0;
    if (S.el) {
      $('.hy-app').hidden = true;
      $('.hy-anr').hidden = true;
      $('.hy-alarm').hidden = true;
      $('.hy-ban').classList.add('hy-weg');
    }
    if (S.peekEl) peek(null);
  }
  return {
    welt,
    app,
    std,
    freischalten,
    sperren,
    frei: id => !gesperrt(id),
    open,
    close,
    toggle,
    isOpen: () => S.open,
    home,
    back,
    zeige,
    zu,
    refresh: () => {
      S.dirty = true;
      if (S.open && S.el) render();
    },
    mitteilung,
    anruf,
    eingehend,
    annehmen,
    auflegen,
    sucher,
    ausloesen,
    schnapp,
    alarm,
    layout,
    tapete,
    speichern,
    ton,
    tipp,
    av,
    esc,
    hhmm,
    tick,
    stop,
    el: () => S.el,
    app_: () => S.app,
    view: () => (S.stack.length ? S.stack[S.stack.length - 1].v : ''),
    S,
  };
})();
window.HANDY = HANDY;
