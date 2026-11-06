// ===================== feat/wissen 2: the discovery book („Entdeckerbuch“), „Warum?“ for every rule, found by doing and seeing (WISSEN) =====================
// One German book for every mode (menu → Entdeckerbuch, key N, a button in the strategy mode's bar): chapters Natur, Handwerk, Geschichte,
// Politik & Soziales, Orte (wissen/wissen_data.js) plus the rules one has had explained. Entries are found by what happens in the world –
// places reached (KERN 'place'), the events of the other features (tiere:entdeckt, strategie:entdeckt, einrichtung:*, gplan:*, garage:*,
// fell, act …), the talk topics of the teachers (wissen/wissen_lehrer.js), information boards (wissen/wissen_orte.js) and a few states the
// book looks at every 1.5 s (felling steps, the workshop's workpieces, the saw, the drying stack, the office). A soft notice tells what is
// new. Saved in pav-wissen-v1 (SAVE, checked). The API for every feature (docs/features/wissen.md):
//   WISSEN.add({ id, ch, title, text, here, src: [[title, url]], icon, hint }) → the entry (a feature's own entries)
//   WISSEN.found(id, how) → true when it is new · WISSEN.has(id) · WISSEN.open(id | chapter) · WISSEN.close() · WISSEN.progress()
//   WISSEN.why(id) → { id, title, text, src } | null · WISSEN.explain(id, anchorEl) shows it · WISSEN.whyHTML(id) a small „?“ for any panel
// Events: 'wissen:neu' { id, ch, how }, 'wissen:warum' { id }, 'wissen:offen' { on }.
import { KERN } from '../core/kern.js';
import { SAVE } from '../core/save.js';
import { $, BASE } from '../core/head.js';
import { P, PHASE } from '../game/walkable.js';
import { HUD } from '../game/hud.js';
import { CLOCK } from '../time/clock.js';
import { VEH } from '../vehicles/vehicle.js';
import { FELL } from '../world/fell.js';
import { WERK } from '../werk/werk.js';
import { HOLZSAW } from '../werk/holz_saw.js';
import { AMT } from '../amt/amt.js';
import { GPLAN } from '../gplan/gplan.js';
import { WDATA } from './wissen_data.js';
export const WISSEN = (() => {
  const D = WDATA;
  const obj = v => !!v && typeof v === 'object' && !Array.isArray(v);
  const esc = s =>
    String(s == null ? '' : s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
  const CHS = D.CH.map(c => c.id);
  // ---- the registry: the book's own entries plus those other features add ----
  const REG = new Map(),
    ORDER = [];
  const PLACE_RULES = [],
    EV_RULES = {},
    TALK_RULES = {},
    LOOK_RULES = {};
  function compile(e) {
    const f = e.find || {};
    for (const p of f.place || []) PLACE_RULES.push([new RegExp(p, 'i'), e.id]);
    for (const [name, when] of f.ev || []) (EV_RULES[name] = EV_RULES[name] || []).push([when || null, e.id]);
    for (const t of f.talk || []) (TALK_RULES[t] = TALK_RULES[t] || []).push(e.id);
    for (const l of f.look || []) (LOOK_RULES[l] = LOOK_RULES[l] || []).push(e.id);
  }
  function add(def) {
    if (!def || typeof def.id !== 'string' || !def.title) return null;
    const e = Object.assign({ icon: '•', text: '', here: '', src: [] }, def);
    if (!CHS.includes(e.ch)) e.ch = 'natur';
    e.src = (Array.isArray(e.src) ? e.src : [e.src])
      .filter(Boolean)
      .map(s => (Array.isArray(s) ? [String(s[0] || ''), s[1] ? String(s[1]) : null] : [String(s), null]));
    const had = REG.has(e.id);
    REG.set(e.id, e);
    if (!had) ORDER.push(e.id);
    compile(e);
    for (const [name] of (e.find && e.find.ev) || []) listen(name);
    if (U.open) render();
    return e;
  }
  // ---- saved: { v: 1, f: { id: [game minute, how] }, w: { whyId: 1 }, r: { id: 1 }, d: { id: def of an entry made from an event } } ----
  const KS = SAVE.key('pav-wissen-v1', {
    owner: 'wissen',
    kind: 'json',
    def: null,
    check: v => v === null || (obj(v) && v.v === 1 && obj(v.f)),
  });
  const S = { f: {}, w: {}, r: {}, d: {}, tab: 'natur', cur: null };
  function load() {
    const s = SAVE.get(KS);
    S.f = {};
    S.w = {};
    S.r = {};
    S.d = {};
    if (!s) return;
    for (const [id, v] of Object.entries(s.f || {}))
      if (typeof id === 'string' && id.length < 80 && Array.isArray(v) && Number.isFinite(+v[0]))
        S.f[id] = [+v[0], typeof v[1] === 'string' ? v[1].slice(0, 120) : ''];
    if (obj(s.w)) for (const k of Object.keys(s.w)) if (D.WHY[k]) S.w[k] = 1;
    if (obj(s.r)) for (const k of Object.keys(s.r)) if (typeof k === 'string' && k.length < 80) S.r[k] = 1;
    if (obj(s.d))
      for (const [id, d] of Object.entries(s.d))
        if (obj(d) && typeof d.title === 'string' && CHS.includes(d.ch))
          S.d[id] = {
            ch: d.ch,
            title: d.title.slice(0, 120),
            text: String(d.text || '').slice(0, 900),
            icon: typeof d.icon === 'string' ? d.icon.slice(0, 8) : '•',
            src: Array.isArray(d.src)
              ? d.src
                  .slice(0, 4)
                  .filter(Array.isArray)
                  .map(q => [String(q[0] || '').slice(0, 200), q[1] ? String(q[1]).slice(0, 400) : null])
              : [],
          };
    for (const [id, d] of Object.entries(S.d)) if (!REG.has(id)) add(Object.assign({ id, dyn: true }, d));
  }
  let saveT = 0;
  function save() {
    clearTimeout(saveT);
    saveT = setTimeout(() => SAVE.set(KS, { v: 1, f: S.f, w: S.w, r: S.r, d: S.d }), 200);
  }
  const saveNow = () => {
    clearTimeout(saveT);
    SAVE.set(KS, { v: 1, f: S.f, w: S.w, r: S.r, d: S.d });
  };
  // ---- found ----
  const has = id => !!S.f[id];
  function found(id, how) {
    if (!id || S.f[id]) return false;
    S.f[id] = [Math.round((CLOCK && CLOCK.t) || 0), String(how || '').slice(0, 120)];
    save();
    const e = REG.get(id);
    if (e) notice(e);
    KERN.emit('wissen:neu', { id, ch: e ? e.ch : null, how: how || '' });
    if (U.open) render();
    return true;
  }
  // an entry made from another feature's event (an animal of feat/tiere, a discovery of the strategy mode) – kept in the saved state, so it
  // is still in the book after a reload (those features announce a discovery only once)
  function dyn(id, def, how) {
    if (!REG.has(id)) {
      const d = {
        ch: CHS.includes(def.ch) ? def.ch : 'natur',
        title: String(def.title || id).slice(0, 120),
        text: String(def.text || '').slice(0, 900),
        icon: def.icon || '•',
        src: (def.src || []).slice(0, 4),
      };
      S.d[id] = d;
      add(Object.assign({ id, dyn: true }, d));
    }
    return found(id, how);
  }
  // ---- the soft notice: „Neu im Entdeckerbuch: …“ with „Lesen“ (in the strategy mode its own notices, STRAT.note) ----
  const NQ = { list: [], t: 0, el: null };
  function notice(e) {
    NQ.list.push(e);
    clearTimeout(NQ.t);
    NQ.t = setTimeout(flushNotice, 400);
  }
  function flushNotice() {
    const L = NQ.list.splice(0);
    if (!L.length) return;
    const first = L[0],
      more = L.length - 1,
      text =
        'Neu im Entdeckerbuch: ' +
        first.title +
        (more ? ' und ' + more + (more === 1 ? ' weiterer Eintrag' : ' weitere') : '');
    const ST = window.STRAT;
    if (ST && ST.on && typeof ST.note === 'function') {
      try {
        ST.note('📖 ' + text, { kind: 'wissen', acts: [{ label: 'Lesen', fn: () => (open(first.id), null) }] });
        return;
      } catch (err) {}
    }
    // the open book shows what is new itself
    if (U.open) {
      if (NQ.el) NQ.el.hidden = true;
      return;
    }
    const el = NQ.el || mkNotice();
    el.querySelector('.ic').textContent = first.icon || '📖';
    el.querySelector('.tx').innerHTML =
      'Neu im Entdeckerbuch: <b>' + esc(first.title) + '</b>' + (more ? ' <small>+' + more + '</small>' : '');
    el.dataset.id = first.id;
    el.hidden = false;
    // on a phone the data views' panel (wissen_daten.js) fills the lower half of the plan view: the notice goes above it
    el.style.bottom = '';
    const dp = $('widaten');
    if (dp && !dp.hidden && innerWidth <= 560 && el.offsetParent) {
      const hb = el.offsetParent.getBoundingClientRect().bottom,
        top = dp.getBoundingClientRect().top;
      el.style.bottom = Math.round(hb - top + 8) + 'px';
    }
    clearTimeout(el._t);
    el._t = setTimeout(() => (el.hidden = true), 7000);
  }
  function mkNotice() {
    initUI();
    const el = document.createElement('div');
    el.id = 'winote';
    el.hidden = true;
    el.setAttribute('role', 'status');
    el.innerHTML =
      '<span class="ic" aria-hidden="true"></span><span class="tx"></span><button type="button">Lesen</button>';
    el.querySelector('button').addEventListener('click', () => {
      el.hidden = true;
      open(el.dataset.id);
    });
    ($('p-3d') || document.body).appendChild(el);
    NQ.el = el;
    return el;
  }
  // ---- „Warum?“ ----
  function why(id) {
    const w = D.WHY[id];
    if (w) return { id, title: w.title, text: w.text, src: w.src.map(s => [s[0], s[1]]) };
    // the strategy mode's own rules (strategie/st_data.js RULES, reached as STRAT.D) when the book does not know the id
    const RS = stRules(),
      R = RS && RS[id];
    if (R) return { id, title: R.text || id, text: R.why || R.text || '', src: R.src ? [[String(R.src), null]] : [] };
    return null;
  }
  function stRules() {
    const ST = window.STRAT;
    return (ST && ST.D && ST.D.RULES) || (window.STDATA && window.STDATA.RULES) || null;
  }
  // the strategy mode's own „Warum?“ (a refusal's note, a job that waits): the rule counts as understood here too, and its reason
  // gets the book's „?“ with the linked sources. The note carries the reason's text, not the rule's id – found again by that text.
  function stWhy(btn) {
    const RS = stRules();
    if (!RS) return;
    const n = btn.closest('.n') || btn.closest('.job') || btn.parentElement,
      w = n && n.querySelector('.w'),
      txt = ((w && w.firstChild && w.firstChild.textContent) || (n && n.textContent) || '').trim();
    if (!txt) return;
    let id = null;
    for (const k in RS) {
      const R = RS[k];
      if ((R.why && txt.indexOf(R.why) >= 0) || (R.text && txt.indexOf(R.text) >= 0)) {
        id = k;
        break;
      }
    }
    if (!id) return;
    if (!S.w[id]) {
      S.w[id] = 1;
      save();
      KERN.emit('wissen:warum', { id });
    }
    if (w && !w.querySelector('[data-wiwhy]') && D.WHY[id])
      w.insertAdjacentHTML('beforeend', ' ' + whyHTML(id, 'Quellen ›'));
  }
  const whyHTML = (id, label) =>
    why(id)
      ? `<button type="button" class="wi-q" data-wiwhy="${esc(id)}" title="Warum? – Grund und Quelle" aria-label="Warum?">${esc(label || '?')}</button>`
      : '';
  const W2 = { el: null };
  function explain(id, anchor) {
    const w = why(id);
    if (!w) return null;
    if (!W2.el) {
      initUI();
      const el = document.createElement('div');
      el.id = 'wiwhy';
      el.hidden = true;
      el.setAttribute('role', 'dialog');
      el.setAttribute('aria-label', 'Warum?');
      ($('p-3d') || document.body).appendChild(el);
      el.addEventListener('click', e => {
        if (e.target.closest('.x')) el.hidden = true;
        const b = e.target.closest('[data-wibook]');
        if (b) {
          el.hidden = true;
          open('regeln');
        }
      });
      W2.el = el;
    }
    const el = W2.el;
    el.innerHTML =
      `<div class="wh"><b>Warum? ${esc(w.title)}</b><button type="button" class="x" aria-label="Schließen">×</button></div><p>${esc(w.text)}</p>` +
      `<p class="src">Quelle: ${w.src.map(srcLink).join(' · ') || '–'}</p><button type="button" class="wb" data-wibook>Alle Regeln im Entdeckerbuch</button>`;
    el.hidden = false;
    // beside the anchor when there is one (kept on the screen), else above the bottom controls
    const host = el.parentNode.getBoundingClientRect();
    el.style.left = el.style.top = el.style.bottom = '';
    if (anchor && anchor.getBoundingClientRect) {
      const r = anchor.getBoundingClientRect(),
        w0 = Math.min(340, host.width - 24);
      el.style.left = Math.round(Math.max(12, Math.min(r.left - host.left - 20, host.width - w0 - 12))) + 'px';
      const below = r.bottom - host.top + 8;
      if (below + 180 < host.height) el.style.top = Math.round(below) + 'px';
      else el.style.bottom = Math.round(host.bottom - r.top + 8) + 'px';
    }
    clearTimeout(el._t);
    el._t = setTimeout(() => (el.hidden = true), 20000);
    if (!S.w[id] && D.WHY[id]) {
      S.w[id] = 1;
      save();
    }
    KERN.emit('wissen:warum', { id });
    return w;
  }
  const srcLink = s =>
    s[1] ? `<a href="${esc(s[1])}" target="_blank" rel="noopener">${esc(s[0])}</a>` : `<span>${esc(s[0])}</span>`;
  // any „?“ of any panel (WISSEN.whyHTML) – in the capture phase, so a panel's own click handlers do not take it first
  if (typeof document !== 'undefined')
    document.addEventListener(
      'click',
      e => {
        const b = e.target && e.target.closest && e.target.closest('[data-wiwhy]');
        if (!b) {
          // the strategy mode's „Warum?“ on a note: its own handler shows the reason, the book follows right after
          const sw =
            window.STRAT && window.STRAT.on && e.target && e.target.closest && e.target.closest('button[data-why]');
          if (sw)
            setTimeout(() => {
              try {
                stWhy(sw);
              } catch (er) {}
            }, 0);
          return;
        }
        e.preventDefault();
        e.stopPropagation();
        explain(b.dataset.wiwhy, b);
      },
      true
    );
  // ---- a thought that names a rule (PLAY.think: refusals like the Sunday rest or the boundary distance) gets a small „?“ beside it ----
  const TH = { el: null, id: null, obs: null };
  function watchThoughts() {
    const sb = $('npcsub');
    if (!sb || TH.obs || typeof MutationObserver === 'undefined') return;
    const chip = document.createElement('button');
    chip.type = 'button';
    chip.id = 'withink';
    chip.hidden = true;
    chip.textContent = '?';
    chip.title = 'Warum? – Grund und Quelle';
    chip.addEventListener('click', e => {
      e.stopPropagation();
      if (TH.id) explain(TH.id, chip);
    });
    sb.parentNode.appendChild(chip);
    TH.el = chip;
    const check = () => {
      const t = sb.hidden || !sb.classList.contains('think') ? '' : sb.textContent || '';
      let id = null;
      if (t)
        for (const [re, w] of D.THINK)
          if (re.test(t)) {
            id = w;
            break;
          }
      TH.id = id;
      if (!id) {
        chip.hidden = true;
        return;
      }
      const r = sb.getBoundingClientRect(),
        h = sb.parentNode.getBoundingClientRect();
      chip.style.left = Math.round(Math.min(r.right - h.left + 6, h.width - 40)) + 'px';
      chip.style.top = Math.round(r.top - h.top + (r.height - 30) / 2) + 'px';
      chip.hidden = false;
    };
    TH.obs = new MutationObserver(check);
    TH.obs.observe(sb, {
      childList: true,
      characterData: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['hidden', 'class'],
    });
    TH.check = check;
  }
  // ---- the book ----
  const U = { open: false, el: null, view: null, ui: false };
  const CSS = `
#wibook{position:absolute;z-index:8;top:60px;right:max(12px,env(safe-area-inset-right,0px));width:min(470px,calc(100% - 24px));max-height:calc(100% - 110px);display:flex;flex-direction:column;background:var(--paper);color:var(--ink);border-radius:12px;box-shadow:0 8px 30px rgba(0,0,0,.32);font:400 13.5px/1.5 var(--f-body)}
#wibook[hidden]{display:none}
#wibook header{display:flex;align-items:flex-start;gap:10px;padding:12px 14px 6px}
#wibook header h3{margin:0;font:700 17px/1.2 var(--f-display)}
#wibook header small{display:block;color:var(--muted);font-size:12px;margin-top:2px}
#wibook header .x{margin-left:auto;border:0;background:transparent;color:var(--muted);font:400 24px/1 var(--f-body);cursor:pointer;padding:2px 6px}
#wibook .wi-bar{height:6px;border-radius:3px;background:var(--plate);overflow:hidden;margin:4px 0 0}
#wibook .wi-bar i{display:block;height:100%;background:var(--larch)}
#wibook nav{display:flex;flex-wrap:wrap;gap:4px;padding:6px 12px 8px;border-bottom:1px solid var(--line)}
#wibook nav button{border:1px solid var(--line);background:transparent;color:var(--ink);border-radius:999px;font:500 12.5px/1 var(--f-body);padding:7px 10px;cursor:pointer;white-space:nowrap}
#wibook nav button[aria-selected=true]{background:var(--plate);border-color:var(--larch);font-weight:700}
#wibook nav button em{font-style:normal;color:var(--muted);font-weight:400;margin-left:4px}
#wibook .wi-body{overflow:auto;padding:8px 14px 14px;flex:1;min-height:0}
#wibook .wi-lead{color:var(--muted);margin:2px 0 8px;font-size:12.5px}
#wibook ul.wi-list{list-style:none;margin:0;padding:0}
#wibook ul.wi-list li{border-bottom:1px dotted var(--line)}
#wibook ul.wi-list button{display:flex;gap:10px;align-items:flex-start;width:100%;text-align:left;border:0;background:transparent;color:var(--ink);padding:8px 2px;cursor:pointer;font:inherit}
#wibook ul.wi-list .ic{flex:none;width:28px;height:28px;border-radius:7px;background:var(--plate);display:grid;place-items:center;font-size:16px}
#wibook ul.wi-list b{display:block;font-weight:600}
#wibook ul.wi-list small{display:block;color:var(--muted);font-size:12px;line-height:1.35}
#wibook ul.wi-list li.no button{cursor:default}
#wibook ul.wi-list li.no .ic{filter:grayscale(1);opacity:.45}
#wibook ul.wi-list li.no b{color:var(--muted);font-weight:500}
#wibook ul.wi-list .new{display:inline-block;margin-left:6px;font-size:10.5px;font-weight:700;color:#fff;background:var(--larch);border-radius:999px;padding:1px 6px;vertical-align:1px}
#wibook .wi-back{border:0;background:transparent;color:var(--larch);font:600 13px/1 var(--f-body);cursor:pointer;padding:6px 0 8px}
#wibook .wi-e h4{display:flex;gap:10px;align-items:center;margin:2px 0 8px;font:700 16px/1.25 var(--f-display)}
#wibook .wi-e h4 span{font-size:24px}
#wibook .wi-e h5{margin:12px 0 2px;font:700 12.5px/1.3 var(--f-body);text-transform:uppercase;letter-spacing:.04em;color:var(--muted)}
#wibook .wi-e p{margin:4px 0}
#wibook .wi-e .how{font-size:12px;color:var(--muted)}
#wibook .wi-e ul.src{margin:4px 0;padding-left:18px;font-size:12px}
#wibook .wi-e ul.src a{color:var(--larch)}
#wibook .wi-more{display:flex;flex-wrap:wrap;gap:6px;margin-top:4px}
#wibook .wi-more button{border:1px solid var(--line);background:var(--plate);color:var(--ink);border-radius:999px;font:500 12.5px/1.2 var(--f-body);padding:6px 10px;cursor:pointer}
#wibook .wi-more button.no{color:var(--muted);cursor:default}
#wibook .wi-rule{display:flex;gap:8px;align-items:flex-start;padding:7px 0;border-bottom:1px dotted var(--line)}
#wibook .wi-rule.no{color:var(--muted)}
.wi-q{display:inline-grid;place-items:center;width:22px;height:22px;border-radius:50%;border:1px solid var(--larch);background:var(--paper);color:var(--larch);font:700 13px/1 var(--f-body);cursor:pointer;padding:0;flex:none;vertical-align:middle}
#withink{position:absolute;z-index:9;width:30px;height:30px;border-radius:50%;border:2px solid #f3e2b8;background:rgba(30,26,20,.78);color:#f3e2b8;font:700 16px/1 var(--f-body);cursor:pointer;pointer-events:auto}
#withink[hidden]{display:none}
#wiwhy{position:absolute;z-index:12;left:50%;bottom:calc(150px + env(safe-area-inset-bottom,0px));transform:none;width:min(340px,calc(100% - 24px));background:var(--paper);color:var(--ink);border-radius:10px;box-shadow:0 8px 26px rgba(0,0,0,.35);padding:10px 12px;font:400 13px/1.45 var(--f-body)}
#wiwhy:not([style*="left"]){left:max(12px,calc(50% - 170px))}
#wiwhy[hidden]{display:none}
#wiwhy .wh{display:flex;gap:8px;align-items:flex-start}
#wiwhy .wh b{flex:1;font:700 13.5px/1.3 var(--f-display)}
#wiwhy .x{border:0;background:transparent;color:var(--muted);font:400 20px/1 var(--f-body);cursor:pointer;padding:0 2px}
#wiwhy p{margin:6px 0 0}
#wiwhy .src{font-size:11.5px;color:var(--muted)}
#wiwhy .src a{color:var(--larch)}
#wiwhy .wb{margin-top:8px;border:1px solid var(--line);background:var(--plate);color:var(--ink);border-radius:999px;font:500 12px/1 var(--f-body);padding:6px 10px;cursor:pointer}
#winote{position:absolute;z-index:9;top:62px;left:50%;transform:translateX(-50%);display:flex;align-items:center;gap:10px;max-width:min(520px,calc(100% - 24px));background:rgba(28,26,22,.86);color:#f3efe6;border-radius:999px;padding:7px 8px 7px 14px;font:400 13px/1.3 var(--f-body);box-shadow:0 4px 18px rgba(0,0,0,.3)}
#winote[hidden]{display:none}
body[data-top="1"] #winote{top:178px}
#winote .ic{font-size:17px}
#winote b{font-weight:700}
#winote small{opacity:.8}
#winote button{border:0;border-radius:999px;background:#f3e2b8;color:#2b2420;font:700 12.5px/1 var(--f-body);padding:8px 12px;cursor:pointer;flex:none}
@media (max-width:560px){#wibook{top:56px;right:8px;left:8px;width:auto;max-height:calc(100% - 140px)} #winote{top:auto;bottom:calc(320px + env(safe-area-inset-bottom,0px));left:8px;right:8px;transform:none;max-width:none;border-radius:16px}}
`;
  // at load: the style, the menu entry, the „?“ beside thoughts (the book itself is made on first use)
  function initUI() {
    if (typeof document === 'undefined' || U.ui) return;
    U.ui = true;
    const st = document.createElement('style');
    st.textContent = CSS;
    document.head.appendChild(st);
    // the menu's start page, beside Inventar and Aufgaben (as the office does, amt/amt.js)
    const ml = $('invbtn') && $('invbtn').parentNode;
    if (ml) {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'tog';
      b.id = 'wibookbtn';
      b.title = 'Was du über Natur, Handwerk, Geschichte und Politik schon herausgefunden hast (Taste N)';
      b.innerHTML = 'Entdeckerbuch<span>N</span>';
      b.addEventListener('click', () => {
        if (HUD && HUD.setMenu) HUD.setMenu(false);
        open();
      });
      ml.appendChild(b);
      U.mbtn = b;
    }
    watchThoughts();
  }
  function mkBook() {
    initUI();
    const el = document.createElement('aside');
    el.id = 'wibook';
    el.hidden = true;
    el.setAttribute('aria-label', 'Entdeckerbuch');
    el.innerHTML =
      '<header><div style="flex:1;min-width:0"><h3>Entdeckerbuch</h3><small class="wi-sum"></small><div class="wi-bar"><i></i></div></div><button type="button" class="x" aria-label="Schließen">×</button></header><nav role="tablist" aria-label="Kapitel"></nav><div class="wi-body"></div>';
    ($('p-3d') || document.body).appendChild(el);
    el.querySelector('.x').addEventListener('click', () => close());
    el.addEventListener('click', e => {
      const t = e.target.closest('[data-wtab],[data-went],[data-wback]');
      if (!t) return;
      if (t.dataset.wtab) {
        S.tab = t.dataset.wtab;
        U.view = null;
      } else if (t.dataset.went) {
        if (!has(t.dataset.went)) return;
        U.view = t.dataset.went;
      } else U.view = null;
      render();
    });
    U.el = el;
  }
  const count = ch => {
    let n = 0,
      of = 0;
    for (const id of ORDER) {
      const e = REG.get(id);
      if (ch && e.ch !== ch) continue;
      of++;
      if (S.f[id]) n++;
    }
    return [n, of];
  };
  function progress() {
    const out = { all: count(null) };
    for (const c of CHS) out[c] = count(c);
    out.regeln = [Object.keys(S.w).length, Object.keys(D.WHY).length];
    return out;
  }
  function howText(h) {
    if (!h) return '';
    const [k, v] = [h.split(':')[0], h.slice(h.indexOf(':') + 1)];
    if (k === 'ort') return 'Gefunden an diesem Ort: ' + v;
    if (k === 'gespraech') return 'Erzählt von ' + v;
    if (k === 'tafel') return 'Gelesen auf der Tafel: ' + v;
    if (k === 'tun') return 'Gelernt beim Tun: ' + v;
    if (k === 'gesehen') return 'Selbst gesehen: ' + v;
    if (k === 'erkundet') return 'Erkundet: ' + v;
    return h;
  }
  function render() {
    const el = U.el;
    if (!el || el.hidden) return;
    const pr = progress(),
      [n, of] = pr.all;
    el.querySelector('.wi-sum').textContent =
      `${n} von ${of} Einträgen entdeckt · ${pr.regeln[0]} von ${pr.regeln[1]} Regeln verstanden`;
    el.querySelector('.wi-bar i').style.width = (of ? Math.round((100 * n) / of) : 0) + '%';
    const tabs = D.CH.map(c => [c.id, c.icon + ' ' + c.label, pr[c.id]]).concat([['regeln', '❓ Regeln', pr.regeln]]);
    el.querySelector('nav').innerHTML = tabs
      .map(
        ([id, label, p]) =>
          `<button type="button" role="tab" data-wtab="${id}" aria-selected="${S.tab === id}">${esc(label)}<em>${p[0]}/${p[1]}</em></button>`
      )
      .join('');
    const body = el.querySelector('.wi-body');
    if (U.view && REG.has(U.view)) body.innerHTML = entryHTML(REG.get(U.view));
    else if (S.tab === 'regeln') body.innerHTML = rulesHTML();
    else body.innerHTML = listHTML(S.tab);
    if (U.view && !S.r[U.view]) {
      S.r[U.view] = 1;
      save();
    }
  }
  function listHTML(ch) {
    const C = D.CH.find(c => c.id === ch) || D.CH[0];
    let h = `<p class="wi-lead">${esc(C.text)}</p><ul class="wi-list">`;
    const ids = ORDER.filter(id => REG.get(id).ch === C.id);
    // found first (newest on top), then the rest with a hint
    ids.sort((a, b) => (S.f[b] ? S.f[b][0] + 1e9 : 0) - (S.f[a] ? S.f[a][0] + 1e9 : 0));
    for (const id of ids) {
      const e = REG.get(id);
      if (S.f[id])
        h += `<li><button type="button" data-went="${esc(id)}"><span class="ic">${esc(e.icon)}</span><span><b>${esc(e.title)}${S.r[id] ? '' : '<span class="new">neu</span>'}</b><small>${esc(short(e.text))}</small></span></button></li>`;
      else
        h += `<li class="no"><button type="button" disabled><span class="ic">${esc(e.icon)}</span><span><b>Noch nicht entdeckt</b><small>${esc(e.hint || hintOf(e))}</small></span></button></li>`;
    }
    return h + '</ul>';
  }
  const short = t => {
    const s = String(t || '');
    const i = s.indexOf('. ');
    return i > 20 && i < 150 ? s.slice(0, i + 1) : s.length > 140 ? s.slice(0, 137) + '…' : s;
  };
  function hintOf(e) {
    const f = e.find || {};
    if (f.talk && f.talk.length) {
      const who = f.talk[0].split(':')[0];
      return 'Vielleicht weiß ' + ((D.ROLE[who] || who).split(',')[0] || who) + ' mehr.';
    }
    if (f.place && f.place.length) return 'Irgendwo in der Gegend zu finden.';
    return 'Wird beim Tun entdeckt.';
  }
  // an animal's profile from feat/tiere (TARTEN: size, when, food, signs, protection) and its sources beside the book's own
  function profileHTML(e) {
    const T = window.TARTEN;
    if (!T || !T.A || typeof e.id !== 'string' || !e.id.startsWith('tier:')) return '';
    const A = T.A[e.id.slice(5)];
    if (!A || !A.profile) return '';
    const p = A.profile,
      rows = [
        ['Größe', A.size],
        ['Wann', p.wann],
        ['Nahrung', p.nahrung],
        ['Spuren', p.spuren],
        ['Schutz', p.schutz],
      ].filter(r => r[1]);
    if (!rows.length) return '';
    let h = '<h5>Steckbrief' + (A.latin ? ' · <i>' + esc(A.latin) + '</i>' : '') + '</h5>';
    for (const [k, v] of rows) h += `<p><b>${esc(k)}:</b> ${esc(v)}</p>`;
    const have = new Set((e.src || []).map(s => s[1]));
    const more = (A.sources || []).filter(s => s && s[1] && !have.has(s[1]));
    if (more.length) e.src = (e.src || []).concat(more.map(s => [s[0], s[1]]));
    return h;
  }
  // every species feat/tiere knows becomes an entry to discover (once its data is there – it loads after the book)
  let tierDone = false;
  function tierEntries() {
    const T = window.TARTEN;
    if (tierDone || !T || !T.A) return;
    tierDone = true;
    // the book tells these already in its own entries (the goats as landscape keepers, the beetle and the forest conversion)
    const SKIP = { ziege: 'n_ziegen', borkenkaefer: 'n_kaefer' };
    for (const [id, A] of Object.entries(T.A)) {
      const key = 'tier:' + id;
      if (SKIP[id] || (REG.has(key) && !REG.get(key).dyn)) continue;
      const p = A.profile || {};
      add({
        id: key,
        ch: 'natur',
        icon: A.group === 'selten' ? '✨' : A.group === 'schaedling' ? '🪲' : A.group === 'nutz' ? '🐐' : '🐾',
        title: A.name || id,
        text: [p.wo, p.rolle].filter(Boolean).join('\n'),
        src: (A.sources || []).map(s => [s[0], s[1]]),
        // the dog (tiere/tiere_hund.js) is not „seen“ like the wild ones: he is found when one calls or sends him
        find: {
          ev:
            id === 'hund'
              ? [['tiere:entdeckt', d => d && d.id === id], ['hund:befehl']]
              : [['tiere:entdeckt', d => d && d.id === id]],
        },
        hint: p.wann ? 'Wann: ' + String(p.wann).split('.')[0] + '.' : 'Draußen in der Gegend unterwegs sein.',
      });
    }
  }
  function entryHTML(e) {
    const C = D.CH.find(c => c.id === e.ch) || D.CH[0];
    let h = `<button type="button" class="wi-back" data-wback>‹ ${esc(C.label)}</button><div class="wi-e"><h4><span aria-hidden="true">${esc(e.icon)}</span>${esc(e.title)}</h4>`;
    for (const para of String(e.text || '').split('\n')) if (para) h += `<p>${esc(para)}</p>`;
    if (e.here) h += `<h5>${e.ch === 'orte' ? 'Gut zu wissen' : 'Hier bei Ratscher'}</h5><p>${esc(e.here)}</p>`;
    h += profileHTML(e);
    const more = (e.more || []).filter(id => REG.has(id));
    if (more.length)
      h +=
        '<h5>Mehr dazu</h5><div class="wi-more">' +
        more
          .map(id =>
            S.f[id]
              ? `<button type="button" data-went="${esc(id)}">${esc(REG.get(id).icon + ' ' + REG.get(id).title)}</button>`
              : `<button type="button" class="no" disabled>? noch nicht entdeckt</button>`
          )
          .join('') +
        '</div>';
    if (e.src && e.src.length)
      h += '<h5>Quellen</h5><ul class="src">' + e.src.map(s => '<li>' + srcLink(s) + '</li>').join('') + '</ul>';
    const f = S.f[e.id];
    if (f && f[1]) h += `<p class="how">${esc(howText(f[1]))}</p>`;
    return h + '</div>';
  }
  function rulesHTML() {
    let h =
      '<p class="wi-lead">Regeln des Spiels mit ihrem echten Grund. Ein kleines „?“ an einer Absage erklärt sie – hier stehen alle; verstanden ist, was du schon einmal geöffnet hast.</p>';
    const ids = Object.keys(D.WHY).sort((a, b) => (S.w[b] || 0) - (S.w[a] || 0));
    for (const id of ids) {
      const w = D.WHY[id];
      h += `<div class="wi-rule${S.w[id] ? '' : ' no'}">${whyHTML(id)}<span><b>${esc(w.title)}</b>${S.w[id] ? '<br><small>' + esc(w.text) + '</small>' : ''}</span></div>`;
    }
    return h;
  }
  function open(what) {
    if (!U.el) mkBook();
    if (what && REG.has(what)) {
      S.tab = REG.get(what).ch;
      U.view = has(what) ? what : null;
    } else if (what && (CHS.includes(what) || what === 'regeln')) {
      S.tab = what;
      U.view = null;
    }
    const was = U.open;
    U.el.hidden = false;
    U.open = true;
    if (NQ.el) NQ.el.hidden = true;
    try {
      if (document.pointerLockElement && document.exitPointerLock) document.exitPointerLock();
    } catch (e) {}
    render();
    if (!was) KERN.emit('wissen:offen', { on: true });
    return true;
  }
  function close() {
    if (!U.el || U.el.hidden) return;
    U.el.hidden = true;
    U.open = false;
    KERN.emit('wissen:offen', { on: false });
  }
  const toggle = () => (U.open ? close() : open());
  window.addEventListener('keydown', e => {
    if (e.ctrlKey || e.metaKey || e.altKey || e.repeat) return;
    if (['INPUT', 'TEXTAREA', 'SELECT'].includes(document.activeElement?.tagName) || (window.PIANO && window.PIANO.on))
      return;
    if (e.key === 'Escape') {
      if (W2.el && !W2.el.hidden) {
        W2.el.hidden = true;
        e.stopPropagation();
      } else if (U.open) {
        close();
        e.stopPropagation();
      }
      return;
    }
    // N: the book – not while driving (the tractor's winch uses N there)
    if ((e.key === 'n' || e.key === 'N') && !(VEH && VEH.cur)) {
      toggle();
      e.preventDefault();
    }
  });
  // ---- found by the world: places, events, talk, things looked at ----
  let lastPlace = '';
  function onPlace(name) {
    if (!name || name === lastPlace) return;
    lastPlace = name;
    for (const [re, id] of PLACE_RULES) if (re.test(name)) found(id, 'ort:' + name);
  }
  KERN.on('place', d => onPlace(d && d.name));
  const LISTENING = new Set();
  function listen(name) {
    if (LISTENING.has(name)) return;
    LISTENING.add(name);
    KERN.on(name, d => {
      for (const [when, id] of EV_RULES[name] || [])
        try {
          if (!when || when(d)) found(id, evHow(name, d));
        } catch (e) {}
    });
  }
  const evHow = (name, d) => {
    if (name === 'tiere:entdeckt') return 'gesehen:' + ((d && d.title) || 'ein Tier');
    if (name === 'strategie:entdeckt') return 'erkundet:' + ((d && d.title) || '');
    return 'tun:' + (EVTXT[name] || name);
  };
  const EVTXT = {
    fell: 'einen Baum gefällt',
    act: 'mit eigenen Händen',
    'garage:gemaeht': 'den Rasen gemäht',
    'garage:start': 'den Mäher gestartet',
    'einrichtung:schale': 'eine Schale gedreht',
    'hund:befehl': 'den Hund gerufen',
    'hund:gelernt': 'den Hund gelobt oder getadelt',
    'einrichtung:brand': 'im Brennofen gebrannt',
    'einrichtung:glasur': 'glasiert',
    'gplan:gepflanzt': 'einen Baum gepflanzt',
    'gplan:geschnitten': 'einen Obstbaum geschnitten',
    'einrichtung:bild': 'ein Bild gemalt',
    'gplan:gemulcht': 'gemulcht',
    'verkehr:mitfahrt': 'mitgefahren',
    'verkehr:angehalten': 'ein Auto angehalten',
    'zinnen:mount': 'in einem Haus des Dorfs',
  };
  function talk(who, topic, name) {
    const key = who + ':' + topic;
    const ids = TALK_RULES[key] || [];
    const nm = name || (D.ROLE[who] || who).split(',')[0];
    let any = false;
    for (const id of ids) any = found(id, 'gespraech:' + nm) || any;
    return any;
  }
  // animals (feat/tiere) and the strategy mode's exploration (feat/strategie): their discoveries become entries even when the book has none
  // an event an entry of the book already answers (its find.ev) makes no second, generated entry
  const ruled = (name, d) =>
    (EV_RULES[name] || []).some(([when]) => {
      try {
        return !when || !!when(d);
      } catch (e) {
        return false;
      }
    });
  KERN.on('tiere:entdeckt', d => {
    if (!d || !d.id || ruled('tiere:entdeckt', d)) return;
    const T = window.TARTEN,
      kind = d.kind === 'spur' ? 'spur' : 'tier',
      id = kind + ':' + d.id;
    if (REG.has(id)) return found(id, 'gesehen:' + (d.title || d.id));
    let text = '',
      title = d.title || d.id,
      src = [];
    try {
      if (kind === 'tier' && T && T.A && T.A[d.id]) {
        const A = T.A[d.id],
          p = A.profile || {};
        title = A.name || title;
        text = [p.wo, p.wann, p.rolle].filter(Boolean).join('\n');
        src = (A.sources || []).map(s => [s[0], s[1]]);
      } else if (kind === 'spur' && T && T.SPUREN && T.SPUREN[d.id]) {
        const Sp = T.SPUREN[d.id];
        title = Sp.name || Sp.title || title;
        text = Sp.text || '';
      }
    } catch (e) {}
    if (!src.length && d.source) src = [Array.isArray(d.source) ? d.source : [String(d.source), null]];
    dyn(id, { ch: 'natur', title, text, icon: kind === 'spur' ? '🐾' : '🐾', src }, 'gesehen:' + title);
  });
  KERN.on('strategie:entdeckt', d => {
    if (!d || !d.id || ruled('strategie:entdeckt', d)) return;
    const id = 'st:' + (d.kind || 'x') + ':' + d.id;
    if (REG.has(id)) return found(id, 'erkundet:' + (d.title || d.id));
    const ch =
      d.kind === 'wald'
        ? 'natur'
        : d.kind === 'ausbau' || d.kind === 'wissen'
          ? 'handwerk'
          : d.kind === 'ort'
            ? 'orte'
            : 'natur';
    dyn(
      id,
      {
        ch,
        title: d.title || d.id,
        text: d.text || '',
        icon: d.kind === 'wald' ? '🌲' : '🔎',
        src: d.source ? [Array.isArray(d.source) ? d.source : [String(d.source), null]] : [],
      },
      'erkundet:' + (d.title || d.id) + (d.by ? ' (' + d.by + ')' : '')
    );
  });
  // a plant set with the garden planner (gplan/*): its own entry from the planner's database – what it is, its care, its sources
  const PL = { db: null, p: null };
  function plantDB() {
    if (PL.p) return PL.p;
    PL.p = fetch(BASE + 'gartenplaner/pflanzen.json')
      .then(r => (r.ok ? r.json() : null))
      .then(d => (PL.db = d && Array.isArray(d.arten) ? d : null))
      .catch(() => null);
    return PL.p;
  }
  KERN.on('gplan:gepflanzt', d => {
    if (!d || typeof d.id !== 'string') return;
    const id = 'pflanze:' + d.id;
    if (REG.has(id)) return found(id, 'tun:gepflanzt');
    plantDB().then(db => {
      const a = db && db.arten.find(q => q.id === d.id);
      if (!a) return;
      const Qs = db.quellen || {},
        src = (a.quellen || [])
          .map(k => Qs[k])
          .filter(Boolean)
          .slice(0, 4)
          .map(q => [q.titel + (q.herausgeber ? ' (' + q.herausgeber + ')' : ''), q.url || null]);
      dyn(
        id,
        {
          ch: 'natur',
          icon: a.schicht === 'baum' || a.schicht === 'kleinbaum' ? '🌳' : '🌱',
          title: a.name + (a.sorte ? ' ‘' + a.sorte + '’' : '') + (a.art ? ' (' + a.art + ')' : ''),
          text: [a.text, a.pflege].filter(Boolean).join('\n'),
          src,
        },
        'tun:gepflanzt'
      );
    });
  });
  KERN.on('reset', () => reset());
  // ---- what the book looks at (every 1.5 s; cheap): felling steps, the workshop, the saw and the stack, the office, the planner ----
  const FELLST = {
    sole: 'fell:fallkerb',
    roof: 'fell:fallkerb',
    back: 'fell:fallkerb',
    call1: 'fell:fallkerb',
    wedge: 'fell:fallkerb',
    call2: 'fell:fallkerb',
    retreat: 'fell:fallkerb',
    falling: 'fell:fallkerb',
    down: 'fell:fallkerb',
    delimb: 'fell:entasten',
    top: 'fell:ablaengen',
    trim: 'fell:ablaengen',
    buck: 'fell:ablaengen',
    measure: 'fell:vermessen',
    done: 'fell:vermessen',
  };
  const WERKG = {
    glue1: 'werk:leimen',
    clamp1: 'werk:leimen',
    panel1: 'werk:leimen',
    slice: 'werk:hirnholz',
    slices: 'werk:hirnholz',
    lay2: 'werk:hirnholz',
    glue2: 'werk:hirnholz',
    clamp2: 'werk:hirnholz',
    finish: 'werk:oel',
    done: 'werk:oel',
  };
  const LOOKTXT = {
    'fell:start': 'die Forstkiste geöffnet',
    'fell:fallkerb': 'einen Baum gefällt',
    'fell:entasten': 'einen Stamm entastet',
    'fell:ablaengen': 'einen Stamm abgelängt',
    'fell:vermessen': 'einen Stamm vermessen',
    'werk:leimen': 'in der Werkstatt geleimt',
    'werk:hirnholz': 'ein Stirnholzbrett gebaut',
    'werk:oel': 'ein Brett geölt',
    'holz:saegen': 'Bretter gesägt',
    'holz:trocknen': 'einen Trockenstapel gesetzt',
    'amt:brief': 'Ingrids Brief gelesen',
    'amt:wahl': 'zur Wahl angetreten',
    'amt:amt': 'im Amt',
    'gplan:offen': 'den Garten geplant',
    'jahr:wechsel': 'einen Monat im Spiel erlebt',
    'wetter:regen': 'Regen erlebt',
    'wetter:schnee': 'Schnee erlebt',
    'wetter:gewitter': 'ein Gewitter erlebt',
    'wetter:sturm': 'einen Sturm erlebt',
    'bau:phase': 'eine Bauphase des Pavillons angesehen',
  };
  const lookHit = new Set();
  function look(key) {
    if (lookHit.has(key)) return;
    const ids = LOOK_RULES[key];
    if (!ids) return;
    let all = true;
    for (const id of ids) {
      found(id, 'tun:' + (LOOKTXT[key] || key));
      all = all && !!S.f[id];
    }
    if (all) lookHit.add(key);
  }
  function lookAll() {
    try {
      if (FELL) {
        if (FELL.kit) look('fell:start');
        for (const rec of Object.values(FELL.trees || {})) {
          const k = rec && FELLST[rec.st];
          if (k) {
            look(k);
            if (k === 'fell:vermessen') (look('fell:ablaengen'), look('fell:entasten'), look('fell:fallkerb'));
          }
        }
      }
    } catch (e) {}
    try {
      for (const wp of (WERK && WERK.W && WERK.W.list) || []) {
        const k = wp && WERKG[wp.g];
        if (k) look(k);
        if (wp && wp.done) look('werk:oel');
      }
    } catch (e) {}
    try {
      if (HOLZSAW && ((HOLZSAW.boards && HOLZSAW.boards.length) || HOLZSAW.n > 0)) look('holz:saegen');
      const HD = window.HOLZDRY;
      if (HD && HD.stack) look('holz:trocknen');
    } catch (e) {}
    try {
      const ph = AMT && AMT.ST && AMT.ST.phase;
      if (ph && ph !== 'none') look('amt:brief');
      if (ph === 'candidate' || ph === 'nominated' || ph === 'office' || ph === 'lost') look('amt:wahl');
      if (ph === 'office') look('amt:amt');
    } catch (e) {}
    try {
      if (GPLAN && GPLAN.ui && GPLAN.ui.open) look('gplan:offen');
    } catch (e) {}
    // the weather of the moment (feat/wetter: live from Open-Meteo or by the calendar)
    try {
      // the record itself (WETTER.S.w: rain mm/h, snow cm/h, wind and gust m/s); state() would copy a lot every time
      const WX = window.WETTER,
        w = WX && WX.S ? WX.S.w : null;
      if (w) {
        if (w.rain > 0.2) look('wetter:regen');
        if (w.snow > 0.05) look('wetter:schnee');
        if (w.thunder) look('wetter:gewitter');
        // a storm gust from Beaufort 9 (75 km/h), or a mean wind from Beaufort 8
        if (w.gust >= 20.8 || w.wind >= 17.2) look('wetter:sturm');
      }
    } catch (e) {}
    // a month of the game's calendar went by while playing
    try {
      const DNx = window.DN;
      if (DNx && Number.isFinite(DNx.e0)) {
        const mo = new Date((DNx.e0 + Math.floor(((CLOCK && CLOCK.t) || 0) / 1440)) * 864e5).getUTCMonth();
        if (MO0 === null) MO0 = mo;
        else if (mo !== MO0) look('jahr:wechsel');
      }
    } catch (e) {}
    // a construction phase of the pavilion looked at: the phase changed after the start (the start may be in any phase)
    if (PH0 === null) PH0 = PHASE;
    else if (PHASE !== PH0) look('bau:phase');
  }
  let PH0 = null,
    MO0 = null;
  let acc = 0,
    first = true;
  KERN.tick(dt => {
    acc += dt;
    if (acc < 1.5) return;
    acc = 0;
    if (first) {
      first = false;
      const w = KERN.where && KERN.where();
      if (w && P.mode === 'walk') onPlace(KERN.place(w[0], w[1], P.feet));
    }
    lookAll();
    if (TH.check && TH.el && !TH.el.hidden) TH.check();
    for (const f of [stratBtn, tierEntries])
      try {
        f();
      } catch (e) {
        if (!S.err) {
          S.err = String((e && e.message) || e);
          console.warn('wissen', e);
        }
      }
  }, 'wissen/wissen');
  // ---- the strategy mode's bar (feat/strategie): a button „Entdeckerbuch“ beside its own „Wissen“ (the tech tree) ----
  function stratBtn() {
    const ST = window.STRAT;
    if (!ST || !ST.on || typeof document === 'undefined') return;
    const w = document.querySelector('.stb[data-a="wissen"]') || document.querySelector('.stb[data-a="layers"]');
    if (!w || (w.parentNode && w.parentNode.querySelector('[data-wibook-st]'))) return;
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'stb';
    b.dataset.wibookSt = '1';
    b.title = 'Entdeckerbuch: Natur, Handwerk, Geschichte, Politik – mit Quellen (N)';
    b.textContent = '📖 Buch';
    b.addEventListener('click', e => {
      e.stopPropagation();
      toggle();
    });
    w.after(b);
  }
  KERN.on('strategie:modus', () => setTimeout(stratBtn, 50));
  function reset() {
    S.f = {};
    S.w = {};
    S.r = {};
    S.d = {};
    lookHit.clear();
    lastPlace = '';
    saveNow();
    if (U.open) render();
  }
  // ---- start: the book's own entries, the saved state ----
  for (const e of D.E) add(e);
  for (const name of Object.keys(EV_RULES)) listen(name);
  load();
  initUI();
  return {
    add,
    found,
    has,
    why,
    whyHTML,
    explain,
    open,
    close,
    toggle,
    talk,
    dyn,
    progress,
    get isOpen() {
      return U.open;
    },
    list: ch => ORDER.filter(id => !ch || REG.get(id).ch === ch).map(id => REG.get(id)),
    get: id => REG.get(id) || null,
    state: () => ({
      found: Object.keys(S.f),
      how: Object.fromEntries(Object.entries(S.f).map(([k, v]) => [k, v[1]])),
      why: Object.keys(S.w),
      read: Object.keys(S.r),
      dyn: Object.keys(S.d),
      n: ORDER.length,
      open: U.open,
      tab: S.tab,
      view: U.view,
      progress: progress(),
    }),
    reset,
    saveNow,
    data: D,
  };
})();
window.WISSEN = WISSEN;
