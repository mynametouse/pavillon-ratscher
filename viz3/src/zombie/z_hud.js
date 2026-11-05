// ===================== feat/zombie: what the player sees of the zombie night – bars, the weapon, supplies, the clock to the siren (ZHUD) =====================
// A small panel top left (instead of the task tracker while the night mode runs): health, stamina, hunger; the time and how long until the
// siren or the morning; the weapon with its condition, fuel or shells; the supplies; the count of the dead. A red flash when hit, a dark
// edge when badly hurt (and the heartbeat, zombie/z_ton.js), big lines for the siren and the morning, the screen when one dies. On touch
// screens buttons for the blow, R, eating and the bandage. Built into the page by the module itself (style and elements), shown only while
// Z.on.
import { $, COARSE, stage } from '../core/head.js';
import { KERN } from '../core/kern.js';
import { PLAY } from '../game/play.js';
import { CLOCK } from '../time/clock.js';
import { ZDATA } from './z_data.js';
import { Z } from './z_state.js';
import { ZTON } from './z_ton.js';
import { ZWAFFE } from './z_waffe.js';
import { ZBUND } from './z_bund.js';
export const ZHUD = (() => {
  const S = { el: null, shown: false, msgT: 0, flash: 0, last: '', acts: {} };
  const CSS = `
body[data-zombie="1"] #qtrack{display:none!important}
#zhud{position:absolute;top:66px;left:max(12px,env(safe-area-inset-left,0px));z-index:6;width:min(290px,46vw);background:rgba(18,12,12,.62);color:#f2e9e4;
  border-radius:9px;padding:8px 10px 9px;font:400 12px/1.35 var(--f-body,system-ui);backdrop-filter:blur(5px);pointer-events:auto;user-select:none}
#zhud[hidden],#zmsg[hidden],#zdead[hidden],#ztouch[hidden]{display:none!important}
#zhud .zt:first-child{cursor:pointer}
#zhud.zmin .zw,#zhud.zmin .zs,#zhud.zmin .zk,#zhud.zmin .zx,#zhud.zmin .zq,#zhud.zmin .znet{display:none!important}
#zhud.zmin .zt:first-child span::after{content:' ▸';opacity:.7}
#zhud .zt{display:flex;justify-content:space-between;gap:8px;font:600 11px/1.3 var(--f-mono,monospace);letter-spacing:.04em;color:#ffb3a1;text-transform:uppercase}
#zhud .zt em{font-style:normal;color:#f2e9e4;text-transform:none;letter-spacing:0;font-weight:500}
#zhud .zb{display:grid;grid-template-columns:52px 1fr 30px;align-items:center;gap:6px;margin-top:4px}
#zhud .zb span{font:500 10.5px/1 var(--f-mono,monospace);opacity:.85}
#zhud .zb b{display:block;height:7px;border-radius:4px;background:rgba(255,255,255,.14);overflow:hidden}
#zhud .zb b i{display:block;height:100%;width:50%;border-radius:4px;transition:width .2s}
#zhud .zb em{font:500 10.5px/1 var(--f-mono,monospace);font-style:normal;text-align:right;opacity:.85}
#zhud .hp i{background:linear-gradient(90deg,#8e0f0f,#e0392b)} #zhud .st i{background:linear-gradient(90deg,#7c6a12,#e6c84a)} #zhud .fd i{background:linear-gradient(90deg,#6b3d10,#e48b2c)}
#zhud .zw{margin-top:6px;padding-top:5px;border-top:1px solid rgba(255,255,255,.12);display:flex;justify-content:space-between;gap:6px}
#zhud .zw b{font-weight:600} #zhud .zw span{opacity:.85;font:500 11px/1.3 var(--f-mono,monospace)}
#zhud .zwk{margin-top:2px;opacity:.7;font:500 10.5px/1.35 var(--f-body,system-ui)}
#zhud .zs{margin-top:4px;font-size:12.5px;letter-spacing:.02em;word-spacing:2px}
#zhud .zk{margin-top:3px;font:500 10.5px/1.2 var(--f-mono,monospace);opacity:.75}
#zhud .zx{margin-top:5px;display:flex;gap:6px;flex-wrap:wrap}
#zhud .zx button{font:500 11px/1 var(--f-body,system-ui);color:#f2e9e4;background:rgba(255,255,255,.12);border:0;border-radius:999px;padding:6px 9px;cursor:pointer}
#zhud .zx button:hover{background:rgba(255,255,255,.22)}
#zhud .zq{margin-top:6px;display:flex;gap:6px} #zhud .zq[hidden]{display:none}
#zhud .zq input{flex:1;min-width:0;font:500 12px/1 var(--f-body,system-ui);padding:6px 8px;border-radius:6px;border:0;background:rgba(255,255,255,.9);color:#222}
#zhud .zq button{font:600 11px/1 var(--f-body,system-ui);border:0;border-radius:999px;padding:6px 10px;background:#ffb3a1;color:#2a0b0b;cursor:pointer}
#zflash{position:absolute;inset:0;pointer-events:none;z-index:5;opacity:0;background:radial-gradient(ellipse at center,rgba(120,0,0,0) 35%,rgba(150,0,0,.75) 100%);transition:opacity .25s}
#zmsg{position:absolute;left:50%;top:24%;transform:translateX(-50%);z-index:7;max-width:min(720px,88vw);text-align:center;pointer-events:none;
  color:#fbe7df;font:600 clamp(18px,3.2vw,30px)/1.3 var(--f-display,Georgia,serif);text-shadow:0 2px 14px rgba(0,0,0,.85);letter-spacing:.01em}
#zmsg small{display:block;margin-top:8px;font:400 clamp(13px,1.8vw,16px)/1.4 var(--f-body,system-ui);opacity:.9}
#zdead{position:absolute;inset:0;z-index:9;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:14px;background:rgba(40,0,0,.72);
  color:#fbe7df;font:600 clamp(22px,4vw,40px)/1.2 var(--f-display,Georgia,serif);text-align:center}
#zdead small{font:400 15px/1.4 var(--f-body,system-ui);opacity:.9;max-width:520px}
#zdead button{font:600 15px/1 var(--f-body,system-ui);padding:12px 22px;border-radius:999px;border:0;background:#f2e9e4;color:#2a0b0b;cursor:pointer}
#ztouch{position:absolute;right:max(14px,env(safe-area-inset-right,0px));bottom:calc(150px + env(safe-area-inset-bottom,0px));z-index:6;display:flex;flex-direction:column;gap:10px;align-items:flex-end}
#ztouch button{width:64px;height:64px;border-radius:50%;border:0;background:rgba(150,20,20,.78);color:#fff;font:700 22px/1 system-ui;touch-action:none}
#ztouch button.s{width:46px;height:46px;font-size:16px;background:rgba(30,24,22,.7)}
#zcross{position:absolute;left:50%;top:50%;width:26px;height:26px;margin:-13px 0 0 -13px;z-index:5;pointer-events:none;border:2px solid rgba(255,230,220,.8);border-radius:50%}
#zcross[hidden]{display:none}
/* wide screens: the panel on the right (Falko 5.11. 21:48 – on the left it lay over the talk panel, its topics and its microphone);
   on touch screens left of the column of buttons; the notes (toasts) under it */
@media (min-width:721px){#zhud{left:auto;right:max(12px,env(safe-area-inset-right,0px))}}
@media (min-width:721px) and (min-height:501px){body[data-zombie="1"] .toast{top:var(--zh-bottom,60px)}}
@media (min-width:721px) and (pointer:coarse){#zhud{right:calc(max(14px,env(safe-area-inset-right,0px)) + 76px)}}
@media (orientation:landscape) and (max-height:500px){#zhud{top:48px}}
/* while one talks (the neighbours', the villagers' talk panel): no fighting buttons and no big message over its topics */
body:has(#npcpanel:not([hidden])) :is(#ztouch,#zmsg),body:has(#dorfpanel:not([hidden])) :is(#ztouch,#zmsg){display:none!important}
@media (max-width:720px){body[data-zombie="1"]:has(#npcpanel:not([hidden])) :is(#zhud,#qtrack),
body[data-zombie="1"]:has(#dorfpanel:not([hidden])) :is(#zhud,#qtrack){display:none!important}}
`;
  function build() {
    if (S.el) return;
    const st = document.createElement('style');
    st.textContent = CSS;
    document.head.appendChild(st);
    const root = stage || document.body;
    const div = (id, html) => {
      const d = document.createElement('div');
      d.id = id;
      d.hidden = true;
      d.innerHTML = html || '';
      root.appendChild(d);
      return d;
    };
    S.el = div(
      'zhud',
      `<div class="zt"><span>Zombie-Nacht</span><em id="zclock"></em></div>
       <div class="zt"><span id="zphase"></span><em id="znext"></em></div>
       <div class="zb hp"><span>Leben</span><b><i id="zhp"></i></b><em id="zhpn"></em></div>
       <div class="zb st"><span>Kraft</span><b><i id="zst"></i></b><em id="zstn"></em></div>
       <div class="zb fd"><span>Hunger</span><b><i id="zfd"></i></b><em id="zfdn"></em></div>
       <div class="zw"><b id="zwn"></b><span id="zwi"></span></div>
       <div class="zwk" id="zwk"></div>
       <div class="zs" id="zsup"></div>
       <div class="zk" id="zkills"></div>
       <div class="zk" id="zclan"></div>
       <div class="zq" id="zclanq" hidden><input id="zclanin" maxlength="28" placeholder="Name eures Clans"><button data-z="clan">Gründen</button></div>
       <div class="zx"><button data-z="diff" id="zdiffb"></button></div>
       <div class="zx"><button data-z="eat">Essen</button><button data-z="drink">Trinken</button><button data-z="heal">Verbinden</button><button data-z="wait">Warten</button><button data-z="netz">Zu zweit</button><button data-z="end">Beenden</button></div>`
    );
    S.flashEl = div('zflash');
    S.flashEl.hidden = false;
    S.msg = div('zmsg');
    S.dead = div(
      'zdead',
      `<div id="zdeadt">Sie haben dich erwischt.</div><small id="zdeads"></small><button id="zdeadb">Weiter</button>`
    );
    S.touch = div(
      'ztouch',
      `<button class="s" data-z="lampe" aria-label="Taschenlampe">🔦</button><button class="s" data-z="tritt" aria-label="Treten">🦶</button>` +
        `<button class="s" data-z="r" aria-label="Nachladen, nachtanken">R</button><button data-z="atk" aria-label="Schlagen">✊</button>`
    );
    S.cross = div('zcross');
    // on a small touch screen the panel starts folded (title, clock, bars); a tap on the title opens it
    if (COARSE && Math.min(innerWidth, innerHeight) < 700) S.el.classList.add('zmin');
    S.el.addEventListener('click', e => {
      if (e.target.closest('.zt:first-child')) {
        S.el.classList.toggle('zmin');
        return;
      }
      const b = e.target.closest('button');
      if (!b) return;
      act(b.dataset.z);
      b.blur();
    });
    const atk = S.touch.querySelector('[data-z="atk"]');
    atk.addEventListener('pointerdown', e => {
      e.preventDefault();
      ZWAFFE.press();
    });
    for (const ev of ['pointerup', 'pointercancel', 'pointerleave']) atk.addEventListener(ev, () => ZWAFFE.release());
    S.touch.querySelector('[data-z="r"]').addEventListener('click', () => ZWAFFE.reload());
    S.touch.querySelector('[data-z="tritt"]').addEventListener('click', () => ZWAFFE.kick());
    S.touch.querySelector('[data-z="lampe"]').addEventListener('click', () => window.ZOMBIE && window.ZOMBIE.torch());
    $('zdeadb').addEventListener('click', () => {
      S.dead.hidden = true;
      if (S.onRevive) S.onRevive();
    });
  }
  // the buttons of the panel (zombie/z_modus.js gives wait and end)
  function act(k) {
    if (k === 'eat') {
      const f = ['konserve', 'glas', 'brot'].find(x => Z.has(x));
      if (!f) return PLAY.think('Ich habe nichts zu essen.', 1500);
      Z.eat(f);
      PLAY.think(ZDATA.ITEMS[f].name + ' – besser.', 1300);
    } else if (k === 'drink') {
      if (!Z.has('wasser')) return PLAY.think('Kein Wasser mehr.', 1500);
      Z.eat('wasser');
      PLAY.think('Ein paar Schlucke Wasser.', 1200);
    } else if (k === 'heal') {
      const f = ['verband', 'schmerz', 'schnaps'].find(x => Z.has(x));
      if (!f) return PLAY.think('Kein Verbandszeug.', 1500);
      if (Z.hp >= 100) return PLAY.think('Mir fehlt nichts.', 1200);
      Z.eat(f);
      PLAY.think(f === 'verband' ? 'Verbunden.' : ZDATA.ITEMS[f].name + '.', 1300);
    } else if (k === 'diff') {
      // how hard: leicht → normal → schwer (Falko 5.11.: „Schwierigkeit wählbar“) – the zombies of the next spawns and nights
      const ks = Object.keys(ZDATA.DIFF);
      Z.diff = ks[(ks.indexOf(Z.diff) + 1) % ks.length];
      Z.save(true);
      diffLabel();
      PLAY.think(
        Z.diff === 'leicht'
          ? 'Leicht: weniger Zombies, sie halten weniger aus und treffen schwächer.'
          : Z.diff === 'schwer'
            ? 'Schwer: mehr Zombies, zäher, schneller, sie sehen weiter und treffen härter.'
            : 'Normal.',
        2600
      );
    } else if (k === 'clan') {
      const v = ($('zclanin').value || '').trim() || 'Die Ratscher';
      Z.clan.name = v.slice(0, 28);
      Z.save();
      $('zclanq').hidden = true;
      PLAY.think('Euer Clan heißt jetzt „' + Z.clan.name + '“.', 2500);
    } else if (S.acts[k]) S.acts[k]();
  }
  // the first ally: the clan gets a name (zombie/z_bund.js asks)
  ZBUND.askName = () => {
    build();
    $('zclanq').hidden = false;
    setTimeout(() => $('zclanin').focus(), 50);
  };
  const diffLabel = () => {
    const b = $('zdiffb');
    if (b) b.textContent = 'Schwierigkeit: ' + ZDATA.diffOf(Z.diff).name;
  };
  function show(on) {
    build();
    diffLabel();
    S.shown = on;
    document.body.dataset.zombie = on ? '1' : '';
    S.el.hidden = !on;
    S.touch.hidden = !(on && COARSE);
    if (!on) {
      S.msg.hidden = true;
      S.dead.hidden = true;
      S.cross.hidden = true;
      S.flashEl.style.opacity = 0;
      ZTON.heart = 0;
    }
  }
  // a big line (the siren, the morning): t seconds
  function say(text, sub = '', t = 5) {
    build();
    S.msg.innerHTML = text + (sub ? '<small>' + sub + '</small>' : '');
    S.msg.hidden = false;
    S.msgT = t;
  }
  function hurt(k = 1) {
    S.flash = Math.min(1, S.flash + 0.55 * k);
  }
  function died(sub) {
    build();
    $('zdeads').textContent = sub || '';
    S.dead.hidden = false;
  }
  const pct = v => Math.round(Math.max(0, Math.min(100, v)));
  const mm = m => {
    m = Math.max(0, Math.round(m));
    return m >= 60 ? Math.floor(m / 60) + ' h ' + (m % 60) + ' min' : m + ' min';
  };
  function tick(dt) {
    if (!S.shown) return;
    if (S.msgT > 0 && (S.msgT -= dt) <= 0) S.msg.hidden = true;
    S.flash = Math.max(0, S.flash - dt * 1.4);
    const low = Z.hp < 35 ? (35 - Z.hp) / 35 : 0;
    S.flashEl.style.opacity = String(Math.min(1, S.flash + low * (0.45 + 0.15 * Math.sin(performance.now() / 260))));
    ZTON.heart = Z.hp > 0 ? low : 0;
    S.acc = (S.acc || 0) + dt;
    if (S.acc < 0.2) return;
    S.acc = 0;
    // (where the panel ends: the notes go under it on wide screens – CSS above)
    const zb = Math.round(S.el.offsetTop + S.el.offsetHeight + 8);
    if (zb !== S.zb && zb > 8) {
      S.zb = zb;
      document.body.style.setProperty('--zh-bottom', zb + 'px');
    }
    $('zhp').style.width = pct(Z.hp) + '%';
    $('zst').style.width = pct(Z.stam) + '%';
    $('zfd').style.width = pct(Z.food) + '%';
    $('zhpn').textContent = pct(Z.hp);
    $('zstn').textContent = pct(Z.stam);
    $('zfdn').textContent = pct(Z.food);
    const m = ((Math.floor(CLOCK.t) % 1440) + 1440) % 1440,
      T = Z.times();
    $('zclock').textContent = CLOCK.hm();
    const night = Z.phase === 'nacht';
    $('zphase').textContent = night
      ? 'Nacht ' + Z.night
      : Z.phase === 'morgen'
        ? 'Morgengrauen'
        : 'Tag ' + (Z.night + 1);
    const toSiren = (T.siren - m + 1440) % 1440,
      toDawn = (T.dawn - m + 1440) % 1440;
    $('znext').textContent = night ? 'Morgen in ' + mm(toDawn) : 'Sirene in ' + mm(toSiren);
    const w = ZWAFFE.info();
    // feat/zombie-werk: what zombie/z_werk.js adds – the condition of saw and gun, a sharpened edge, the molotov's key
    const wm = S.wmore ? S.wmore(w) : null;
    $('zwn').textContent = w.name;
    $('zwi').textContent =
      (w.id === 'motorsaege'
        ? (w.run ? 'läuft · ' : '') + 'Tank ' + Math.round((w.fuel / w.tank) * 100) + ' %'
        : w.id === 'flinte'
          ? (w.reload ? 'lädt … ' : '') + w.ammo + ' / 2 · Patronen ' + (Z.sup.schrot || 0)
          : w.cond !== null
            ? 'Zustand ' + w.cond + ' %'
            : '') + (wm ? wm.info : '');
    // how to fight with it (Falko 5.11.: „Wie kann ich schlagen oder kämpfen?“ – „ich muss natürlich auch schießen können“)
    const atk = COARSE ? '✊' : 'Klick/Y',
      kick = COARSE ? '🦶 treten' : 'G: treten';
    $('zwk').textContent =
      (w.id === 'flinte'
        ? atk + ': schießen · R: nachladen · ' + kick
        : w.id === 'motorsaege'
          ? atk + ' halten: sägen · R: tanken'
          : atk + ': zuschlagen · ' + kick) + (wm ? wm.keys : '');
    const sup = Object.entries(Z.sup)
      .filter(([, n]) => n > 0)
      .map(([k, n]) => (ZDATA.ITEMS[k] ? ZDATA.ITEMS[k].icon + ' ' + n : ''))
      .join('  ');
    $('zsup').textContent = sup || 'Rucksack leer';
    $('zkills').textContent = '☠ ' + Z.kills + ' erledigt · Nächte überlebt: ' + Z.survived;
    const al = ZBUND.list.map(
      a => a.name + (a.down ? ' (verletzt)' : a.dead ? ' †' : a.mode === 'wachen' ? ' (wacht)' : '')
    );
    $('zclan').textContent = al.length
      ? (Z.clan.name ? 'Clan „' + Z.clan.name + '“: ' : 'Mit dir: ') + al.join(', ')
      : '';
    S.cross.hidden = !(w.id === 'flinte');
    if (COARSE) {
      const ab = S.touch.querySelector('[data-z="atk"]'),
        ic = w.id === 'flinte' ? '💥' : w.id === 'motorsaege' ? '⚙' : '✊';
      if (ab.textContent !== ic) ab.textContent = ic;
    }
  }
  KERN.tick(tick, 'zombie/hud');
  Object.assign(S, { build, show, say, hurt, died, act });
  return S;
})();
window.ZHUD = ZHUD;
