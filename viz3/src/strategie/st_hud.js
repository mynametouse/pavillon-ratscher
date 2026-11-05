// ===================== feat/strategie: the lens of „Ratscher von oben“ – HUD, overlay over the plan view, steering (STHUD) =====================
// German HUD of its own (built by the module, shown only while the mode is on): the resource bar (Euro, logs, boards, firewood, power,
// petrol, diesel), the people with their availability, needs, levels; time (Pause, 1×, 5×, 30×, the calendar, a time-lapse to the next
// moment); notices with „Warum?“ (the rule, its reason, its source); panels for places (stock, jobs, queue, who works there, what is missing)
// and people (skills, courses, abilities, needs); the layers one can switch. The overlay is an SVG over the plan view (world/siteplan.js):
// places, people (symbols; close up their figures), their ways (Settlers' carriers on the real tracks), the selection frame.
// Mouse: click selects (a frame for several), right click sends/assigns, right drag or the arrow keys pan, wheel zooms; double click on a
// person: take her over (U: back up). Touch: tap selects, tap on the ground sends, drag pans, two fingers zoom, „Rahmen“ for a frame.
import * as THREE from 'three';
import { $, cam, COARSE, stage, V } from '../core/head.js';
import { markDirty } from '../core/assets.js';
import { P } from '../game/walkable.js';
import { applyCam } from '../game/camera.js';
import { cv } from '../game/input.js';
import { SITEPLAN } from '../world/siteplan.js';
import { toast } from '../audio/audio.js';
import { CLOCK } from '../time/clock.js';
import { STDATA } from './st_data.js';
import { STCORE } from './st_core.js';
import { STRAT } from './st_modus.js';
import { STJOBS } from './st_jobs.js';
import { STAUSBAU } from './st_ausbau.js';
export const STHUD = (() => {
  const D = STDATA,
    C = STCORE,
    S = STRAT.S,
    W = STRAT.W;
  const H = {
    built: false,
    sel: [],
    place: null,
    panel: null,
    frame: null,
    rframe: false,
    drag: null,
    last: 0,
    txt: 0,
    open: null,
  };
  const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
  const de = (v, n = 1) => (+v).toLocaleString('de-DE', { minimumFractionDigits: n, maximumFractionDigits: n });
  const CSS = `
body[data-strat="1"] #sitebar,body[data-strat="1"] #qtrack,body[data-strat="1"] .ov.where,body[data-strat="1"] #topscale b{display:none!important}
#sthud,#stppl,#stpan,#stnotes,#sttime,#stcard{position:absolute;z-index:6;font:400 12px/1.35 var(--f-body,system-ui);color:#f3efe6;user-select:none}
#sthud[hidden],#stppl[hidden],#stpan[hidden],#stnotes[hidden],#sttime[hidden],#stcard[hidden],#stsvg[hidden]{display:none!important}
.stbox{background:rgba(24,28,22,.78);border-radius:9px;box-shadow:0 2px 10px rgba(0,0,0,.25)}
#sthud{top:10px;left:max(10px,env(safe-area-inset-left,0px));display:flex;flex-wrap:wrap;gap:4px;max-width:min(660px,calc(100vw - 230px))}
#sthud .r{display:flex;align-items:center;gap:5px;padding:5px 9px;cursor:default}
#sthud .r b{font:600 12.5px/1 var(--f-mono,monospace);letter-spacing:.01em}
#sthud .r i{font-style:normal;opacity:.85}
#sthud .r.low b{color:#ffb38a}
#sttime{top:58px;right:max(10px,env(safe-area-inset-right,0px));padding:7px 9px;display:flex;flex-direction:column;gap:5px;align-items:flex-end}
#sttime .d{font:600 13px/1.2 var(--f-mono,monospace)} #sttime .d small{font:400 11px/1 var(--f-body,system-ui);opacity:.8;margin-left:6px}
#sttime .sp{display:flex;gap:3px}
.stb{font:600 11.5px/1 var(--f-body,system-ui);color:#f3efe6;background:rgba(255,255,255,.12);border:0;border-radius:999px;padding:6px 9px;cursor:pointer}
.stb:hover{background:rgba(255,255,255,.22)} .stb[aria-pressed="true"]{background:#e8c26a;color:#2a2412} .stb.acc{background:#9fc46a;color:#1d2612}
.stb:disabled{opacity:.4;cursor:default}
#stppl{top:52px;left:max(10px,env(safe-area-inset-left,0px));width:218px;display:flex;flex-direction:column;gap:4px}
#stppl .p{display:grid;grid-template-columns:22px 1fr;gap:2px 7px;padding:6px 8px;cursor:pointer;border:1.5px solid transparent}
#stppl .p.on{border-color:#ffe08a} #stppl .p.away{opacity:.55}
#stppl .p .dot{width:20px;height:20px;border-radius:50%;display:grid;place-items:center;font:700 11px/1 var(--f-body,system-ui);color:#fff;grid-row:span 2}
#stppl .p .n{display:flex;justify-content:space-between;gap:4px} #stppl .p .n b{font-weight:600} #stppl .p .n em{font:500 10.5px/1.3 var(--f-mono,monospace);font-style:normal;opacity:.8}
#stppl .p .s{font-size:11px;opacity:.88;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
#stppl .p .nd{grid-column:2;display:grid;grid-template-columns:repeat(3,1fr);gap:3px;margin-top:2px}
#stppl .p .nd i{display:block;height:4px;border-radius:2px;background:rgba(255,255,255,.15);overflow:hidden} #stppl .p .nd i u{display:block;height:100%}
#stppl .tools{display:flex;gap:4px;flex-wrap:wrap}
#stpan{top:132px;right:max(10px,env(safe-area-inset-right,0px));width:min(320px,44vw);max-height:calc(100% - 200px);overflow:auto;padding:9px 11px 11px}
#stpan h3{margin:0 0 2px;font:600 14px/1.25 var(--f-display,Georgia,serif);display:flex;justify-content:space-between;gap:8px}
#stpan h3 button{background:none;border:0;color:inherit;font-size:16px;cursor:pointer;padding:0 2px}
#stpan h4{margin:9px 0 3px;font:600 10.5px/1.2 var(--f-mono,monospace);letter-spacing:.06em;text-transform:uppercase;color:#cfe3a8}
#stpan .sub{opacity:.8;font-size:11.5px} #stpan ul{margin:0;padding:0;list-style:none} #stpan li{padding:2px 0;display:flex;justify-content:space-between;gap:8px}
#stpan li span{opacity:.85} #stpan .job{display:grid;grid-template-columns:1fr auto;gap:2px 8px;padding:5px 0;border-top:1px solid rgba(255,255,255,.08)}
#stpan .job small{grid-column:1/3;opacity:.75;font-size:11px} #stpan .bar{height:5px;border-radius:3px;background:rgba(255,255,255,.14);grid-column:1/3;overflow:hidden}
#stpan .bar u{display:block;height:100%;background:#9fc46a}
#stpan .why{grid-column:1/3;font-size:11px;color:#ffcf9a}
#stpan .learn{margin-top:6px;font-size:11px;opacity:.8;border-left:2px solid #9fc46a;padding-left:7px}
#stpan .ab{display:flex;justify-content:space-between;gap:8px;align-items:center;padding:4px 0}
#stnotes{left:50%;transform:translateX(-50%);bottom:calc(14px + env(safe-area-inset-bottom,0px));width:min(560px,90vw);display:flex;flex-direction:column;gap:4px;pointer-events:none}
#stnotes .n{padding:6px 10px;pointer-events:auto;display:flex;gap:8px;align-items:baseline;justify-content:space-between}
#stnotes .n.no{border-left:3px solid #ff9f6a} #stnotes .n button{flex:none}
#stnotes .n .w{display:block;margin-top:3px;font-size:11px;opacity:.9} #stnotes .n .w small{display:block;opacity:.75;margin-top:2px}
#stcard{left:max(10px,env(safe-area-inset-left,0px));bottom:calc(14px + env(safe-area-inset-bottom,0px));width:218px;padding:7px 9px}
#stcard b{display:block;font:600 12px/1.3 var(--f-display,Georgia,serif)} #stcard .o{margin-top:4px;font-size:11px;opacity:.9}
#stcard .st{margin-top:5px;font-size:11px} #stcard .st u{text-decoration:none;font-weight:600}
#stlayers{position:absolute;z-index:7;right:max(10px,env(safe-area-inset-right,0px));top:132px;width:230px;padding:8px 10px}
#stlayers[hidden]{display:none} #stlayers label{display:flex;gap:7px;align-items:flex-start;padding:3px 0;cursor:pointer} #stlayers small{display:block;opacity:.7}
#stsvg{position:absolute;inset:0;width:100%;height:100%;z-index:4;pointer-events:none;overflow:visible}
#stsvg .pl circle{fill:rgba(20,24,18,.72);stroke:#e9e2c8;stroke-width:1.4} #stsvg .pl text{fill:#fbf6e8;font:600 11px var(--f-body,system-ui);paint-order:stroke;stroke:rgba(0,0,0,.65);stroke-width:3px}
#stsvg .pl .ic{font-size:13px;stroke-width:0} #stsvg .pl.on circle{stroke:#ffe08a;stroke-width:2.4} #stsvg .pl .badge{font:500 10px var(--f-mono,monospace)}
#stsvg .pp circle.b{stroke:#fff;stroke-width:1.6} #stsvg .pp.on circle.b{stroke:#ffe08a;stroke-width:3} #stsvg .pp text{fill:#fff;font:700 10.5px var(--f-body,system-ui);text-anchor:middle;dominant-baseline:central;pointer-events:none}
#stsvg .pp .lv{font:600 8.5px var(--f-mono,monospace);fill:#ffe08a;paint-order:stroke;stroke:#000;stroke-width:2px}
#stsvg .pp .nb{stroke:none} #stsvg .way{fill:none;stroke-width:2;stroke-dasharray:4 5;opacity:.85} #stsvg .frame{fill:rgba(255,224,138,.12);stroke:#ffe08a;stroke-width:1.2;stroke-dasharray:4 3}
#stsvg .ring{fill:none;stroke:#9fc46a;stroke-width:3} #stsvg .ringbg{fill:none;stroke:rgba(255,255,255,.2);stroke-width:3}
#stsvg .wx{fill:#e8f1ff;font:500 11px var(--f-body,system-ui);paint-order:stroke;stroke:rgba(0,0,0,.6);stroke-width:3px}
@media (max-width:720px){
  #sthud{max-width:calc(100vw - 20px);top:auto;bottom:calc(64px + env(safe-area-inset-bottom,0px));left:10px;right:10px}
  #sthud .r{padding:4px 7px} #sthud .r i{display:none}
  #stppl{top:auto;bottom:calc(108px + env(safe-area-inset-bottom,0px));left:10px;right:10px;width:auto;flex-direction:row;overflow-x:auto}
  #stppl .p{min-width:132px} #stppl .p .s{max-width:96px}
  #sttime{top:54px} #stpan{top:auto;bottom:calc(196px + env(safe-area-inset-bottom,0px));left:10px;right:10px;width:auto;max-height:42vh}
  #stnotes{bottom:auto;top:96px} #stcard{display:none!important} #stlayers{top:auto;bottom:200px}
}`;
  // ---------------- building the elements ----------------
  function build() {
    if (H.built) return;
    H.built = true;
    const st = document.createElement('style');
    st.textContent = CSS;
    document.head.appendChild(st);
    const root = $('p-3d') || stage.parentElement || document.body;
    const mk = (tag, id, cls, html) => {
      const e = document.createElement(tag);
      if (id) e.id = id;
      if (cls) e.className = cls;
      if (html) e.innerHTML = html;
      e.hidden = true;
      root.appendChild(e);
      return e;
    };
    H.svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    H.svg.id = 'stsvg';
    H.svg.setAttribute('aria-hidden', 'true');
    H.svg.hidden = true;
    root.appendChild(H.svg);
    H.res = mk('div', 'sthud', '');
    H.time = mk(
      'div',
      'sttime',
      'stbox',
      `<div class="d" id="stdate"></div><div class="sp">${STRAT.SPEEDS.map(
        v =>
          `<button type="button" class="stb" data-sp="${v}" title="${v ? v + '× – ' + (v === 1 ? 'eine Stunde in einer Minute' : v * 1 + ' Spielminuten je Sekunde') : 'Pause (Leertaste)'}">${v ? v + '×' : '⏸'}</button>`
      ).join(
        ''
      )}</div><div class="sp"><button type="button" class="stb" data-sk="auftrag" title="Zeitraffer, bis der nächste Auftrag fertig ist">⏩ Auftrag</button><button type="button" class="stb" data-sk="kommen" title="Zeitraffer, bis deine Leute wieder im Garten sind">⏩ Wochenende</button><button type="button" class="stb" data-sk="morgen" title="Zeitraffer bis morgen 7 Uhr">⏩ Morgen</button></div><div class="sp"><button type="button" class="stb" data-a="layers" title="Ebenen ein- und ausblenden">Ebenen</button><button type="button" class="stb" data-a="ledger" title="Kasse: Einnahmen und Ausgaben">Kasse</button><button type="button" class="stb" data-a="wissen" title="Wissen und Ausbau: Lehrgänge, Maschinen, Stufen">Wissen</button><button type="button" class="stb acc" data-a="exit" title="Zurück in die Welt (U)">Zur Welt ⤓</button></div>`
    );
    H.ppl = mk('div', 'stppl', '');
    H.pan = mk('div', 'stpan', 'stbox');
    H.notes = mk('div', 'stnotes', '');
    H.card = mk('div', 'stcard', 'stbox');
    H.layers = mk('div', 'stlayers', 'stbox');
    H.time.addEventListener('click', e => {
      const b = e.target.closest('button');
      if (!b) return;
      if (b.dataset.sp != null) STRAT.setSpeed(+b.dataset.sp);
      else if (b.dataset.sk) {
        const m = STRAT.skip(b.dataset.sk);
        if (!m) say('Gerade gibt es nichts, worauf man warten müsste.');
        else say(`Zeitraffer: ${CLOCK.dur(m)}.`);
      } else if (b.dataset.a === 'exit') STRAT.stop();
      else if (b.dataset.a === 'layers') {
        H.layers.hidden = !H.layers.hidden;
        if (!H.layers.hidden) renderLayers();
      } else if (b.dataset.a === 'ledger') openLedger();
      else if (b.dataset.a === 'wissen') openKnow();
      b.blur();
    });
    H.ppl.addEventListener('click', e => {
      const t = e.target.closest('[data-p]'),
        b = e.target.closest('button');
      if (b && b.dataset.a === 'none') return select([]);
      if (b && b.dataset.a === 'frame') {
        H.rframe = !H.rframe;
        b.setAttribute('aria-pressed', H.rframe ? 'true' : 'false');
        return;
      }
      if (!t) return;
      const id = t.dataset.p;
      if (e.shiftKey || e.ctrlKey) select(H.sel.includes(id) ? H.sel.filter(x => x !== id) : H.sel.concat(id));
      else select([id]);
      openPerson(id);
    });
    H.ppl.addEventListener('dblclick', e => {
      const t = e.target.closest('[data-p]');
      if (t) takeOver(t.dataset.p);
    });
    H.pan.addEventListener('click', panelClick);
    H.notes.addEventListener('click', e => {
      const b = e.target.closest('button[data-why]');
      if (!b) return;
      const n = b.closest('.n'),
        w = n.querySelector('.w');
      if (w) w.hidden = !w.hidden;
    });
    H.layers.addEventListener('change', e => {
      const i = e.target.closest('input[data-l]');
      if (i) STRAT.layer.set(i.dataset.l, i.checked);
    });
  }
  // ---------------- show / hide ----------------
  function show(on) {
    build();
    for (const e of [H.res, H.time, H.ppl, H.notes, H.card, H.svg]) e.hidden = !on;
    if (!on) {
      H.pan.hidden = true;
      H.layers.hidden = true;
      H.svg.innerHTML = '';
    } else {
      refresh();
      draw();
    }
  }
  function intro() {
    note({
      text: 'Ratscher von oben: Personen anklicken (Rahmen für mehrere), Rechtsklick schickt sie hin oder gibt einen Auftrag. Orte anklicken: Vorrat und Aufträge. Doppelklick: selbst übernehmen.',
      kind: 'info',
    });
  }
  // ---------------- per frame (only while the mode is on) ----------------
  function tick() {
    const t = performance.now();
    if (t - H.last > 50) {
      H.last = t;
      draw();
    }
    if (t - H.txt > 400) {
      H.txt = t;
      texts();
    }
  }
  // ---------------- the texts: resources, time, people, the open panel, the card ----------------
  function texts() {
    if (!H.built) return;
    let h = '';
    for (const r of STRAT.res.list()) {
      const v = STRAT.res.val(r.id),
        tip = typeof r.tip === 'function' ? r.tip() : r.tip || '';
      const low = (r.id === 'strom' && v < 15) || (r.id === 'benzin' && v < 1) || (r.id === 'eur' && v < 100);
      h += `<div class="r stbox${low ? ' low' : ''}" title="${esc(r.label + (tip ? ' – ' + tip : ''))}"><span>${r.icon || ''}</span><i>${esc(r.label)}</i><b>${esc(r.fmt ? r.fmt(v) : de(v))}</b></div>`;
    }
    if (h !== H.resH) {
      H.res.innerHTML = h;
      H.resH = h;
    }
    const t = CLOCK.t,
      dy = W.day(t, S.plan),
      wx = W.wx(t);
    const dtxt = `${dy.label} ${CLOCK.hm()}<small>${dy.hol ? esc(dy.hol) + ' · ' : ''}${wxText(wx)}</small>`;
    const de0 = $('stdate');
    if (de0 && de0.innerHTML !== dtxt) de0.innerHTML = dtxt;
    H.time
      .querySelectorAll('[data-sp]')
      .forEach(b => b.setAttribute('aria-pressed', +b.dataset.sp === S.speed ? 'true' : 'false'));
    people();
    card();
    if (H.panel) H.panel();
  }
  const wxText = wx =>
    (wx.storm
      ? 'Sturm'
      : wx.rain > 0.2
        ? 'Regen'
        : wx.cloud > 0.75
          ? 'bedeckt'
          : wx.cloud > 0.4
            ? 'wolkig'
            : 'sonnig') +
    ' · Wind ' +
    Math.round(wx.wind) +
    ' km/h';
  function statusOf(id) {
    const p = S.people[id],
      pr = STRAT.present(id);
    if (STRAT.isOwn(id) && !pr.ok) {
      const t = CLOCK.t,
        m = C.nextArrival(W.dateOf(t), W.minOf(t), S.plan);
      return {
        away: true,
        text:
          m > 0
            ? 'weg – kommt ' +
              W.day(t + m).label.replace(/^\w+ /, m < 1440 * 7 ? W.day(t + m).label.slice(0, 2) + ' ' : '') +
              ' ' +
              CLOCK.hm(t + m)
            : 'weg',
      };
    }
    const j = p.job ? STRAT.job.of(p.job) : null;
    if (j) {
      const J = STRAT.job.get(j.def);
      if (j.st === 'go') return { text: 'unterwegs: ' + J.label };
      if (j.st === 'wait') return { text: 'wartet: ' + (j.need || ''), wait: true };
      return { text: J.label + ' ' + Math.round((100 * j.done) / Math.max(1, j.dur)) + ' %' };
    }
    if (p.path) return { text: 'unterwegs' };
    if (!STRAT.isOwn(id))
      return {
        text: pr.ok ? 'auf seinem Hof – frei für einen Gefallen' : pr.why === 'ruhe_sonntag' ? 'Sonntag' : 'Feierabend',
      };
    return { text: 'frei' };
  }
  function people() {
    let h = '';
    const ndOn = STRAT.layer.on('beduerfnisse');
    for (const id of Object.keys(S.people)) {
      const d = D.PEOPLE[id],
        p = S.people[id],
        s = statusOf(id),
        lv = STRAT.level(id);
      h += `<div class="p stbox${H.sel.includes(id) ? ' on' : ''}${s.away ? ' away' : ''}" data-p="${id}" title="${esc(d.name + ' – ' + d.role)}"><span class="dot" style="background:${d.col}">${d.short}</span><span class="n"><b>${d.name}</b><em>St. ${lv}${d.own ? '' : ' · ♥' + S.favours[id]}</em></span><span class="s">${esc(s.text)}</span>${ndOn && !s.away ? `<span class="nd" title="Kraft ${Math.round(p.nd.energy)} · Essen ${Math.round(p.nd.food)} · Stimmung ${Math.round(p.nd.mood)}"><i><u style="width:${p.nd.energy}%;background:#e6c84a"></u></i><i><u style="width:${p.nd.food}%;background:#e48b2c"></u></i><i><u style="width:${p.nd.mood}%;background:#7cc0e8"></u></i></span>` : ''}</div>`;
    }
    h += `<div class="tools"><button type="button" class="stb" data-a="none">Auswahl leeren</button>${COARSE ? `<button type="button" class="stb" data-a="frame" aria-pressed="${H.rframe}">Rahmen</button>` : ''}</div>`;
    if (h !== H.pplH) {
      H.ppl.innerHTML = h;
      H.pplH = h;
    }
  }
  function card() {
    const ch = STRAT.chapter.cur(),
      o = S.orders.find(x => x.st === 'offen') || null,
      sv = S.style;
    const ag = STAUSBAU.age(),
      gl = STAUSBAU.goals();
    const h = `${ch ? `<b>${esc(ch.title)}</b>` : ''}${gl.length ? `<div class="o">${gl.map(g => `${g.done ? '☑' : '☐'} ${esc(g.text)}`).join('<br>')}</div>` : ''}${o ? `<div class="o">Bestellung: ${esc(o.title)} · bis ${W.day(o.due).label}${o.got ? ` · ${o.got}/${o.n} geliefert` : ''}</div>` : ''}<div class="st" title="${esc(ag.text)}">Zeitalter: <u>${esc(ag.name)}</u></div><div class="st" title="${esc(D.STYLE.text)}">Dein Stil: <u>${C.styleName(sv)}</u> (${sv > 0 ? '+' : ''}${Math.round(sv)})</div>`;
    if (h !== H.cardH) {
      H.card.innerHTML = h;
      H.cardH = h;
    }
  }
  // ---------------- notices ----------------
  function note(n) {
    build();
    const el = document.createElement('div');
    el.className = 'n stbox' + (n.kind === 'nein' ? ' no' : '');
    el.innerHTML = `<span>${esc(n.text)}${n.why ? `<span class="w" hidden>${esc(n.why)}${n.src ? `<small>Quelle: ${esc(n.src)}</small>` : ''}</span>` : ''}</span>${n.why ? '<button type="button" class="stb" data-why="1">Warum?</button>' : ''}`;
    H.notes.appendChild(el);
    while (H.notes.children.length > 4) H.notes.firstChild.remove();
    const life = n.why ? 14000 : 6500;
    setTimeout(() => el.remove(), life);
  }
  const say = text => note({ text, kind: 'info' });
  function no(q) {
    if (!q) return;
    STRAT.note(q.text, { kind: 'nein', why: q.why, src: q.src });
  }
  // ---------------- selection ----------------
  function select(ids) {
    H.sel = ids.filter(id => S.people[id]);
    S.sel = H.sel.slice();
    texts();
    draw();
  }
  function takeOver(id) {
    const r = STRAT.takeOver(id);
    if (r && r.no) no(r);
  }
  // ---------------- panels ----------------
  function openPanel(fn) {
    H.panel = fn;
    H.pan.hidden = false;
    H.layers.hidden = true;
    fn();
  }
  function closePanel() {
    H.panel = null;
    H.place = null;
    H.pan.hidden = true;
    draw();
  }
  function setPan(h) {
    if (h !== H.panH) {
      H.pan.innerHTML = h;
      H.panH = h;
    }
  }
  const head = (t, sub) =>
    `<h3><span>${esc(t)}</span><button type="button" data-a="close" aria-label="Schließen">×</button></h3>${sub ? `<div class="sub">${sub}</div>` : ''}`;
  function jobRow(j) {
    const J = STRAT.job.get(j.def),
      k = j.done / Math.max(1, j.dur),
      who = j.who.map(w => D.PEOPLE[w].name).join(', ');
    const left = j.st === 'work' ? ' · noch ' + CLOCK.dur((j.dur - j.done) / Math.max(0.2, STRAT.teamEff(j))) : '';
    return `<div class="job"><span>${esc(J.label)}</span><span><button type="button" class="stb" data-cancel="${j.id}" title="Abbrechen">✕</button></span><small>${esc(who)} · ${j.st === 'go' ? 'unterwegs' : j.st === 'wait' ? 'wartet' : 'läuft'}${left}</small><span class="bar"><u style="width:${Math.round(k * 100)}%"></u></span>${j.st === 'wait' && j.need ? `<span class="why">${esc(j.need)}</span>` : ''}</div>`;
  }
  function openPlace(id) {
    H.place = id;
    const Pl = STRAT.place.get(id);
    if (!Pl) return;
    openPanel(() => {
      let h = head(Pl.name, Pl.sub ? Pl.sub() : '');
      if (Pl.stock) {
        const st = Pl.stock();
        if (st && st.length)
          h += `<h4>Vorrat</h4><ul>${st.map(r => `<li><span>${esc(r[0])}</span><b>${esc(r[1])}</b></li>`).join('')}</ul>`;
      }
      if (Pl.info) h += Pl.info();
      const run = STRAT.job.running().filter(j => j.place === id);
      if (run.length) h += `<h4>Aufträge hier</h4>${run.map(jobRow).join('')}`;
      const jobs = STRAT.job.at(id);
      if (jobs.length) {
        const who = H.sel.length ? H.sel : [];
        h += `<h4>Auftrag geben${who.length ? ' an ' + esc(who.map(w => D.PEOPLE[w].name).join(', ')) : ''}</h4>`;
        for (const J of jobs) {
          const q = who.length
            ? STRAT.job.check(J, who)
            : { no: true, text: 'Erst jemanden auswählen (links oder auf der Karte).' };
          h += `<div class="job"><span>${esc(J.label)}</span><span><button type="button" class="stb${q ? '' : ' acc'}" data-job="${J.id}"${who.length ? '' : ' disabled'}>Los</button></span><small>${esc(J.text || '')}</small>${q && who.length ? `<span class="why">${esc(q.text)}${q.why ? ` <button type="button" class="stb" data-whyj="${J.id}">Warum?</button>` : ''}</span>` : ''}${J.learn ? `<span class="learn" style="grid-column:1/3">${esc(J.learn)}</span>` : ''}</div>`;
        }
      }
      const here = Object.keys(S.people).filter(p => {
        const q = STRAT.pos(p);
        const c = STRAT.place.pos(id);
        return q && c && Math.hypot(q[0] - c[0], q[1] - c[1]) < (Pl.r || 5) + 4 && STRAT.present(p).ok;
      });
      h += `<h4>Hier</h4><div class="sub">${here.length ? here.map(p => D.PEOPLE[p].name).join(', ') : 'niemand'}</div>`;
      if (Pl.missing) {
        const m = Pl.missing();
        if (m && m.length) h += `<h4>Es fehlt</h4><ul>${m.map(x => `<li><span>${esc(x)}</span></li>`).join('')}</ul>`;
      }
      setPan(h);
    });
    draw();
  }
  function openPerson(id) {
    const d = D.PEOPLE[id],
      Hd = D.HEROES[id];
    openPanel(() => {
      const p = S.people[id],
        lv = STRAT.level(id),
        nx = D.XP_LEVEL(lv + 1),
        s = statusOf(id);
      let h = head(
        d.name,
        `${esc(Hd ? Hd.title + ' · ' : '')}Stufe ${lv} · ${Math.round(p.xp)}/${nx} Erfahrung<br>${esc(d.role)}`
      );
      h += `<h4>Jetzt</h4><div class="sub">${esc(s.text)}</div>`;
      h += `<h4>Können</h4><ul>${Object.entries(D.SKILL)
        .map(
          ([k, n]) =>
            `<li><span>${n}</span><b>${'●'.repeat(Math.floor(STRAT.skillOf(id, k)))}${STRAT.skillOf(id, k) % 1 >= 0.5 ? '◐' : ''}</b></li>`
        )
        .join('')}</ul>`;
      h += `<h4>Lehrgänge</h4><div class="sub">${p.certs.length ? p.certs.map(c => esc((D.KNOW[c] || { title: c }).title)).join(', ') : 'noch keine'}</div>`;
      h += `<h4>Bedürfnisse</h4><ul><li><span>Kraft</span><b>${Math.round(p.nd.energy)}</b></li><li><span>Essen</span><b>${Math.round(p.nd.food)}</b></li><li><span>Stimmung</span><b>${Math.round(p.nd.mood)}</b></li><li><span>Arbeitstempo</span><b>${Math.round(C.eff(p.nd) * 100)} %</b></li></ul>`;
      if (Hd) {
        h += `<h4>Fähigkeiten</h4>`;
        for (const A of Hd.abilities) {
          const left = (p.cd[A.id] || 0) - CLOCK.t;
          h += `<div class="ab"><span title="${esc(A.text)}"><b>${esc(A.label)}</b><br><small>${esc(A.text)}</small></span><button type="button" class="stb" data-ab="${A.id}"${left > 0 ? ' disabled' : ''}>${left > 0 ? CLOCK.dur(left) : 'Los'}</button></div>`;
        }
        h += `<div class="learn">${esc(Hd.passive)}</div>`;
      }
      if (!d.own)
        h += `<div class="learn">Gefallen: ${S.favours[id]} – jede Hilfe kostet einen; du gewinnst sie zurück, wenn du ihm hilfst.</div>`;
      if (d.own) h += `<p><button type="button" class="stb acc" data-take="${id}">Selbst übernehmen</button></p>`;
      setPan(h);
    });
  }
  function openLedger() {
    openPanel(() => {
      let h = head('Kasse', 'Kontostand ' + C.eur(S.eur));
      const L = S.ledger.slice(-30).reverse();
      h += `<ul>${L.length ? L.map(e => `<li><span>${W.day(e.t).label} · ${esc(e.text)}</span><b>${e.eur > 0 ? '+' : ''}${C.eur(e.eur)}</b></li>`).join('') : '<li><span>Noch keine Buchung.</span></li>'}</ul>`;
      h += `<h4>Preise</h4><ul>${Object.values(D.PRICES)
        .map(p => `<li title="${esc(p.src)}"><span>${esc(p.label)}</span><b>${C.eur(p.eur)}/${esc(p.unit)}</b></li>`)
        .join('')}</ul>`;
      setPan(h);
    });
  }
  function openKnow() {
    openPanel(() => {
      let h = head('Wissen und Ausbau', 'Lehrgänge, Maschinen, Stufen – was man lernt und was es möglich macht');
      const KIND = { kurs: 'Lehrgang', maschine: 'Maschine', stufe: 'Stufe' };
      for (const k of STAUSBAU.tree()) {
        const act = k.has
          ? '<b>✓</b>'
          : k.kind === 'maschine'
            ? `<button type="button" class="stb" data-buy="${k.id}">${C.eur(k.eur)}</button>`
            : k.kind === 'kurs'
              ? `<span class="sub">${k.eur ? C.eur(k.eur) + ' · ' : ''}Auftrag in Schleusingen</span>`
              : '<span class="sub">Bauphase</span>';
        h += `<div class="job"><span><b>${esc(k.title)}</b> <small>(${KIND[k.kind] || k.kind})</small></span><span>${act}</span><small>${esc(k.text)}${k.unlocks ? ' → ' + esc(k.unlocks) : ''}</small><span class="learn" style="grid-column:1/3">Quelle: ${esc(k.src)}</span></div>`;
      }
      setPan(h);
    });
  }
  function renderLayers() {
    H.layers.innerHTML =
      '<b>Ebenen</b>' +
      STRAT.layer
        .list()
        .map(
          L =>
            `<label><input type="checkbox" data-l="${L.id}"${STRAT.layer.on(L.id) ? ' checked' : ''}><span>${esc(L.label)}<small>${esc(L.text || '')}</small></span></label>`
        )
        .join('');
  }
  function panelClick(e) {
    const b = e.target.closest('button');
    if (!b) return;
    if (b.dataset.a === 'close') return closePanel();
    if (b.dataset.job) {
      const r = STRAT.job.add(b.dataset.job, H.sel, { place: H.place });
      if (r && r.no) no(r);
      H.panH = '';
      if (H.panel) H.panel();
    } else if (b.dataset.whyj) {
      const q = STRAT.job.check(b.dataset.whyj, H.sel);
      if (q) no(q);
    } else if (b.dataset.cancel) {
      STRAT.job.cancel(b.dataset.cancel, 'abgebrochen');
      H.panH = '';
    } else if (b.dataset.ab) {
      const id = H.sel[0],
        r = STRAT.ability.use(id, b.dataset.ab);
      if (r && r.no) no(r);
      else if (r && r.text) say(r.text);
      H.panH = '';
    } else if (b.dataset.take) takeOver(b.dataset.take);
    else if (b.dataset.buy) {
      const r = STAUSBAU.buy(b.dataset.buy);
      if (r && r.no) no(r);
      else if (r && r.text) say(r.text);
      H.panH = '';
    }
  }
  // ---------------- the overlay ----------------
  const _p = new THREE.Vector3();
  function pr(x, y, z = 0) {
    _p.copy(V(x, y, z)).project(cam);
    return [((_p.x + 1) / 2) * stage.clientWidth, ((1 - _p.y) / 2) * stage.clientHeight, _p.z];
  }
  const onScreen = (q, m = 40) =>
    q[2] < 1 && q[0] > -m && q[1] > -m && q[0] < stage.clientWidth + m && q[1] < stage.clientHeight + m;
  function draw() {
    if (!H.built || !S.on || P.mode !== 'top') {
      if (H.svg && H.svg.innerHTML) H.svg.innerHTML = '';
      return;
    }
    applyCam();
    cam.updateMatrixWorld();
    const Wd = stage.clientWidth,
      Ht = stage.clientHeight;
    H.svg.setAttribute('viewBox', `0 0 ${Wd} ${Ht}`);
    let h = '';
    const mpp = P.th / Math.max(1, Ht); // metres per pixel
    // ways (Settlers: who carries what where, on the real tracks)
    if (STRAT.layer.on('wege'))
      for (const id of Object.keys(S.people)) {
        const p = S.people[id];
        if (!p.path) continue;
        const q = STRAT.pos(id),
          pts = p.path.pts;
        let L = C.pathLen(pts),
          d = (CLOCK.t - p.path.t0) * p.path.v;
        void L;
        const out = [[q[0], q[1]]];
        let s = 0;
        for (let i = 1; i < pts.length; i++) {
          s += Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]);
          if (s > d) out.push(pts[i]);
        }
        const sp = out.map(v => pr(v[0], v[1], 0.3)).map(v => v[0].toFixed(1) + ',' + v[1].toFixed(1));
        h += `<polyline class="way" stroke="${D.PEOPLE[id].col}" points="${sp.join(' ')}"/>`;
      }
    // places
    if (STRAT.layer.on('orte'))
      for (const Pl of STRAT.place.list()) {
        const c = STRAT.place.pos(Pl.id);
        if (!c) continue;
        const q = pr(c[0], c[1], 1);
        if (!onScreen(q)) continue;
        const run = STRAT.job.running().filter(j => j.place === Pl.id && j.st === 'work');
        const r = 13;
        h += `<g class="pl${H.place === Pl.id ? ' on' : ''}"><circle cx="${q[0].toFixed(1)}" cy="${q[1].toFixed(1)}" r="${r}"/>`;
        if (run.length) {
          const k = run[0].done / Math.max(1, run[0].dur),
            a = k * Math.PI * 2,
            R = r + 4,
            x1 = q[0] + Math.sin(a) * R,
            y1 = q[1] - Math.cos(a) * R;
          h += `<circle class="ringbg" cx="${q[0].toFixed(1)}" cy="${q[1].toFixed(1)}" r="${R}"/><path class="ring" d="M${q[0].toFixed(1)} ${(q[1] - R).toFixed(1)} A${R} ${R} 0 ${k > 0.5 ? 1 : 0} 1 ${x1.toFixed(1)} ${y1.toFixed(1)}"/>`;
        }
        h += `<text class="ic" x="${q[0].toFixed(1)}" y="${(q[1] + 4.5).toFixed(1)}" text-anchor="middle">${Pl.icon}</text><text x="${(q[0] + r + 5).toFixed(1)}" y="${(q[1] + 4).toFixed(1)}">${esc(Pl.name)}</text>`;
        if (STRAT.layer.on('wirtschaft') && Pl.badge) {
          const b = Pl.badge();
          if (b)
            h += `<text class="badge" x="${(q[0] + r + 5).toFixed(1)}" y="${(q[1] + 17).toFixed(1)}">${esc(b)}</text>`;
        }
        h += '</g>';
      }
    // people (symbols; close up the world's figures – the neighbours are their own walkers)
    if (STRAT.layer.on('leute'))
      for (const id of Object.keys(S.people)) {
        const d = D.PEOPLE[id];
        if (STRAT.isOwn(id) && !STRAT.present(id).ok) continue;
        const q0 = STRAT.pos(id);
        if (!q0) continue;
        const q = pr(q0[0], q0[1], 1.8);
        if (!onScreen(q)) continue;
        const r = mpp < 0.06 ? 7 : 10,
          on = H.sel.includes(id);
        h += `<g class="pp${on ? ' on' : ''}"><circle class="b" cx="${q[0].toFixed(1)}" cy="${q[1].toFixed(1)}" r="${r}" fill="${d.col}"/><text x="${q[0].toFixed(1)}" y="${q[1].toFixed(1)}">${d.short}</text><text class="lv" x="${(q[0] + r).toFixed(1)}" y="${(q[1] - r).toFixed(1)}">${STRAT.level(id)}</text>`;
        if (STRAT.layer.on('beduerfnisse')) {
          const p = S.people[id],
            w = 18,
            x0 = q[0] - w / 2,
            y0 = q[1] + r + 3;
          [
            [p.nd.energy, '#e6c84a'],
            [p.nd.food, '#e48b2c'],
            [p.nd.mood, '#7cc0e8'],
          ].forEach(([v, c], i) => {
            h += `<rect class="nb" x="${x0.toFixed(1)}" y="${(y0 + i * 3.4).toFixed(1)}" width="${w}" height="2.4" fill="rgba(0,0,0,.45)"/><rect class="nb" x="${x0.toFixed(1)}" y="${(y0 + i * 3.4).toFixed(1)}" width="${((w * v) / 100).toFixed(1)}" height="2.4" fill="${c}"/>`;
          });
        }
        h += '</g>';
      }
    // the weather where one looks
    if (STRAT.layer.on('wetter')) {
      const wx = W.wx(CLOCK.t);
      h += `<text class="wx" x="${(Wd / 2).toFixed(0)}" y="${(Ht - 8).toFixed(0)}" text-anchor="middle">${esc(wxText(wx))} · ${esc(wx.src)}</text>`;
    }
    if (H.frame) {
      const f = H.frame,
        x = Math.min(f.x0, f.x1),
        y = Math.min(f.y0, f.y1);
      h += `<rect class="frame" x="${x}" y="${y}" width="${Math.abs(f.x1 - f.x0)}" height="${Math.abs(f.y1 - f.y0)}"/>`;
    }
    for (const L of STRAT.layer.list()) if (L.draw && STRAT.layer.on(L.id)) h += L.draw(pr, Wd, Ht) || '';
    if (h !== H.svgH) {
      H.svg.innerHTML = h;
      H.svgH = h;
    }
  }
  // ---------------- picking ----------------
  const rel = e => {
    const r = cv.getBoundingClientRect();
    return [e.clientX - r.left, e.clientY - r.top];
  };
  function pickPerson(sx, sy, rad = 16) {
    let best = null,
      bd = rad;
    for (const id of Object.keys(S.people)) {
      if (STRAT.isOwn(id) && !STRAT.present(id).ok) continue;
      const q0 = STRAT.pos(id);
      if (!q0) continue;
      const q = pr(q0[0], q0[1], 1.8),
        d = Math.hypot(q[0] - sx, q[1] - sy);
      if (d < bd) {
        bd = d;
        best = id;
      }
    }
    return best;
  }
  function pickPlace(sx, sy, rad = 20) {
    let best = null,
      bd = rad;
    for (const Pl of STRAT.place.list()) {
      const c = STRAT.place.pos(Pl.id);
      if (!c) continue;
      const q = pr(c[0], c[1], 1),
        d = Math.hypot(q[0] - sx, q[1] - sy);
      if (d < bd) {
        bd = d;
        best = Pl.id;
      }
    }
    return best;
  }
  const _rc = new THREE.Raycaster(),
    _pl = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0),
    _v = new THREE.Vector3();
  function ground(e) {
    applyCam();
    cam.updateMatrixWorld();
    const r = cv.getBoundingClientRect();
    _rc.setFromCamera(
      new THREE.Vector2(((e.clientX - r.left) / r.width) * 2 - 1, (-(e.clientY - r.top) / r.height) * 2 + 1),
      cam
    );
    return _rc.ray.intersectPlane(_pl, _v) ? [_v.x, -_v.z] : null;
  }
  // a command: right click (mouse) or a tap on the ground with people selected (touch) – a place gets a job, the ground a walk
  function command(e, gp) {
    if (!H.sel.length) return false;
    const [sx, sy] = rel(e),
      pl = pickPlace(sx, sy);
    if (pl) {
      openPlace(pl);
      const jobs = STRAT.job.at(pl).filter(J => !STRAT.job.check(J, H.sel));
      if (jobs.length === 1) {
        const r = STRAT.job.add(jobs[0].id, H.sel, { place: pl });
        if (r && r.no) no(r);
      } else if (!jobs.length) {
        for (const id of H.sel) STRAT.send(id, STRAT.place.pos(pl), { place: pl });
        say(`${H.sel.map(id => D.PEOPLE[id].name).join(' und ')} gehen zu: ${STRAT.place.get(pl).name}.`);
      } else say('Mehrere Aufträge möglich – im Feld rechts auswählen.');
      return true;
    }
    if (!gp) return false;
    for (const id of H.sel) {
      if (STRAT.isOwn(id) && !STRAT.present(id).ok) {
        no(STRAT.refuse('weg', D.PEOPLE[id].name));
        continue;
      }
      const p = S.people[id];
      if (p.job) STRAT.job.cancel(p.job, 'neuer Weg');
      if (!STRAT.isOwn(id)) {
        say(`${D.PEOPLE[id].name} hat einen eigenen Willen – gib ihm einen Auftrag an einem Ort.`);
        continue;
      }
      const k = H.sel.indexOf(id);
      STRAT.send(id, [gp[0] + (k % 2) * 1.2, gp[1] - Math.floor(k / 2) * 1.2]);
    }
    return true;
  }
  // a tap or click: a person (select; with shift: add), a place (its panel), else nothing (touch with a selection: the command)
  function tap(e, gp) {
    const [sx, sy] = rel(e),
      id = pickPerson(sx, sy);
    if (id) {
      if (e.shiftKey || e.ctrlKey || e.metaKey)
        select(H.sel.includes(id) ? H.sel.filter(x => x !== id) : H.sel.concat(id));
      else select([id]);
      openPerson(id);
      return true;
    }
    const pl = pickPlace(sx, sy);
    if (pl) {
      if (e.pointerType !== 'mouse' && H.sel.length) return command(e, gp);
      openPlace(pl);
      return true;
    }
    if (e.pointerType !== 'mouse' && H.sel.length) return command(e, gp);
    if (H.sel.length) select([]);
    closePanel();
    return true;
  }
  // the plan view's hooks (world/siteplan.js): we take the left mouse button (a frame) and taps; buildings are not moved from up here
  SITEPLAN.hooks.push({
    down: e => {
      if (!S.on) return false;
      if (e.pointerType === 'mouse' || H.rframe) {
        const [x, y] = rel(e);
        H.frame = { x0: x, y0: y, x1: x, y1: y, moved: false };
        return 'take';
      }
      return 'keep';
    },
    move: e => {
      if (!S.on || !H.frame) return;
      const [x, y] = rel(e);
      H.frame.x1 = x;
      H.frame.y1 = y;
      if (Math.hypot(x - H.frame.x0, y - H.frame.y0) > 6) H.frame.moved = true;
      draw();
    },
    up: (e, gp, isTap) => {
      if (!S.on) return;
      const f = H.frame;
      H.frame = null;
      if (f && f.moved && !isTap) {
        const x0 = Math.min(f.x0, f.x1),
          x1 = Math.max(f.x0, f.x1),
          y0 = Math.min(f.y0, f.y1),
          y1 = Math.max(f.y0, f.y1),
          ids = [];
        for (const id of Object.keys(S.people)) {
          if (STRAT.isOwn(id) && !STRAT.present(id).ok) continue;
          const q0 = STRAT.pos(id),
            q = pr(q0[0], q0[1], 1.8);
          if (q[0] >= x0 && q[0] <= x1 && q[1] >= y0 && q[1] <= y1) ids.push(id);
        }
        select(e.shiftKey ? [...new Set(H.sel.concat(ids))] : ids);
        if (ids.length === 1) openPerson(ids[0]);
        draw();
        return;
      }
      tap(e, gp || ground(e));
      draw();
    },
    tap: (e, gp) => (S.on ? tap(e, gp) : false),
  });
  // right button: a command on release (a drag with it pans); the context menu stays away while the mode is on
  let rd = null;
  cv.addEventListener('contextmenu', e => {
    if (S.on && P.mode === 'top') e.preventDefault();
  });
  cv.addEventListener(
    'pointerdown',
    e => {
      if (!S.on || P.mode !== 'top' || e.button !== 2) return;
      rd = { x: e.clientX, y: e.clientY, lx: e.clientX, ly: e.clientY, moved: false };
      try {
        cv.setPointerCapture(e.pointerId);
      } catch (er) {}
      e.preventDefault();
    },
    { capture: true }
  );
  cv.addEventListener(
    'pointermove',
    e => {
      if (!rd || !S.on) return;
      if (Math.hypot(e.clientX - rd.x, e.clientY - rd.y) > 5) rd.moved = true;
      if (rd.moved) {
        const k = P.th / Math.max(1, stage.clientHeight);
        P.tx -= (e.clientX - rd.lx) * k;
        P.ty += (e.clientY - rd.ly) * k;
        rd.lx = e.clientX;
        rd.ly = e.clientY;
        markDirty();
      }
    },
    { capture: true }
  );
  cv.addEventListener(
    'pointerup',
    e => {
      if (!rd || e.button !== 2) return;
      const r = rd;
      rd = null;
      if (!S.on || r.moved) return;
      command(e, ground(e));
    },
    { capture: true }
  );
  cv.addEventListener('dblclick', e => {
    if (!S.on || P.mode !== 'top') return;
    const [sx, sy] = rel(e),
      id = pickPerson(sx, sy);
    if (id) {
      e.preventDefault();
      takeOver(id);
    }
  });
  function refresh() {
    H.resH = H.pplH = H.cardH = H.panH = '';
    texts();
    if (H.layers && !H.layers.hidden) renderLayers();
  }
  // a refusal coming from elsewhere (the API: STRAT.note with kind 'nein')
  const UI = {
    show,
    tick,
    note,
    refresh,
    intro,
    openPlace,
    openPerson,
    select,
    draw,
    H,
    pickPerson,
    pickPlace,
    pr,
    toast,
  };
  STRAT.ui = UI;
  void STJOBS;
  return UI;
})();
window.STHUD = STHUD;
