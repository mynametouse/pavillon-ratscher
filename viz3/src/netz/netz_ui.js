// ===================== feat/mehrspieler: the window „Zusammen spielen“, the menu entry, the button in the bar, the keys (NETZUI) =====================
// Menü → „Zusammen spielen“ opens a window: the room (open one, join with a code, the link to send, leave), who is there (where, how far,
// „Hin“ jumps to them), the games (Verstecken im Dorf – the host starts it), gestures (Winken, Nicken, Kopf schütteln, Zeigen) and one's
// own avatar (name, figure, colours of top and trousers, pattern, shoes, hat, glasses, moustache, one's colour, „Zufall“). In a room a
// button in the bar at the top right shows how many play (on a phone also „Zeigen“). Keys: G or the middle mouse button points.
import { $, COARSE, stage } from '../core/head.js';
import { markDirty } from '../core/assets.js';
import { KERN } from '../core/kern.js';
import { P } from '../game/walkable.js';
import { setView3 } from '../game/player.js';
import { VEH } from '../vehicles/vehicle.js';
import { NETZLOGIK as L } from './netz_logik.js';
import { NETZ } from './netz.js';
import { NAVATAR } from './netz_avatar.js';
import { NVERSTECK } from './netz_verstecken.js';
export const NETZUI = (() => {
  const S = { win: null, hb: null, pb: null, open: false, listT: 0, avT: null, msg: '' };
  const esc = t =>
    String(t == null ? '' : t).replace(
      /[&<>"']/g,
      c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]
    );
  const CSS = `
  .nzlab{position:absolute;z-index:6;transform:translate(-50%,-100%);pointer-events:none;white-space:nowrap;
    font:600 12px/1 var(--f-body,system-ui);color:#fff;background:var(--nzc,#2f88d8);padding:4px 8px;border-radius:999px;
    box-shadow:0 1px 6px rgba(0,0,0,.28);opacity:.94}
  .nzping{position:absolute;z-index:7;transform:translate(-50%,-100%);pointer-events:none;white-space:nowrap;
    font:700 13px/1 var(--f-body,system-ui);color:#fff;background:var(--nzc,#2f88d8);padding:5px 9px;border-radius:8px;
    box-shadow:0 2px 10px rgba(0,0,0,.3);display:none}
  .nzping::after{content:'';position:absolute;left:50%;bottom:-6px;transform:translateX(-50%);border:6px solid transparent;
    border-bottom:0;border-top-color:var(--nzc,#2f88d8)}
  #netzwin{position:absolute;right:12px;top:64px;z-index:40;width:min(380px,calc(100vw - 24px));max-height:calc(100% - 84px);overflow:auto;
    background:rgba(250,249,246,.97);color:#1d232a;border-radius:14px;box-shadow:0 10px 40px rgba(0,0,0,.28);
    font:500 13.5px/1.4 var(--f-body,system-ui);padding:12px 14px 14px}
  #netzwin[hidden]{display:none}
  #netzwin h2{font:700 16px/1.2 var(--f-body,system-ui);margin:0 0 6px;display:flex;align-items:center;justify-content:space-between}
  #netzwin h3{font:700 12px/1.2 var(--f-body,system-ui);text-transform:uppercase;letter-spacing:.04em;color:#5b6570;margin:14px 0 6px}
  #netzwin .nzx{border:0;background:transparent;font-size:20px;line-height:1;cursor:pointer;color:#5b6570;padding:2px 6px}
  #netzwin .nzst{margin:2px 0 8px;color:#2d3946}
  #netzwin .nznote{color:#8a4b0f;font-size:12.5px;margin:4px 0}
  #netzwin .nzrow{display:flex;gap:6px;flex-wrap:wrap;align-items:center;margin:4px 0}
  #netzwin button.nzb{font:600 13px/1 var(--f-body,system-ui);padding:8px 11px;border-radius:8px;border:1px solid #c9ced4;background:#fff;
    color:#1d232a;cursor:pointer} #netzwin button.nzb.nzp{background:#2f88d8;border-color:#2f88d8;color:#fff}
  #netzwin button.nzb:disabled{opacity:.45;cursor:default}
  #netzwin input[type=text]{font:500 14px/1 var(--f-body,system-ui);padding:7px 8px;border-radius:8px;border:1px solid #c9ced4;
    min-width:0;flex:1;background:#fff;color:#1d232a}
  #netzwin input.nzcode{text-transform:uppercase;max-width:110px;font-family:var(--f-mono,monospace);letter-spacing:.08em}
  #netzwin .nzlink{font-size:11.5px;flex:1 1 100%}
  #netzwin .nzlist{display:flex;flex-direction:column;gap:4px}
  #netzwin .nzpl{display:flex;align-items:center;gap:8px;padding:5px 6px;border-radius:8px;background:#f0f1f3}
  #netzwin .nzdot{width:12px;height:12px;border-radius:50%;flex:0 0 12px;background:var(--nzc)}
  #netzwin .nzpl span{flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
  #netzwin .nzpl small{color:#5b6570}
  #netzwin .nzchips{display:flex;flex-wrap:wrap;gap:5px}
  #netzwin .nzc{font:600 12px/1 var(--f-body,system-ui);padding:6px 8px;border-radius:999px;border:1px solid #c9ced4;background:#fff;cursor:pointer;color:#1d232a}
  #netzwin .nzc[aria-pressed=true]{background:#1d232a;border-color:#1d232a;color:#fff}
  #netzwin .nzsw{width:26px;height:26px;border-radius:50%;border:2px solid #fff;box-shadow:0 0 0 1px #c9ced4;cursor:pointer;padding:0}
  #netzwin .nzsw[aria-pressed=true]{box-shadow:0 0 0 2px #1d232a}
  #netzwin .nzoff{opacity:.4;pointer-events:none}
  #netzwin label.nzl{display:block;font-size:12px;color:#5b6570;margin:8px 0 3px}
  #netzhb .hbc{display:inline-block;min-width:16px;padding:0 4px;margin-left:4px;border-radius:999px;background:#2f88d8;color:#fff;font-size:11px;line-height:16px;text-align:center}
  `;
  function css() {
    if ($('netzcss')) return;
    const st = document.createElement('style');
    st.id = 'netzcss';
    st.textContent = CSS;
    document.head.appendChild(st);
  }
  // ---- the window ----
  function build() {
    if (S.win) return S.win;
    css();
    const w = document.createElement('div');
    w.id = 'netzwin';
    w.hidden = true;
    w.setAttribute('role', 'dialog');
    w.setAttribute('aria-label', 'Zusammen spielen');
    (document.getElementById('p-3d') || stage || document.body).appendChild(w);
    w.addEventListener('click', onClick);
    w.addEventListener('input', onInput);
    w.addEventListener('change', onInput);
    w.addEventListener('keydown', e => {
      if (e.key === 'Escape') {
        show(false);
        e.stopPropagation();
      }
      if (e.key === 'Enter' && e.target && e.target.classList.contains('nzcode')) join();
      e.stopPropagation(); // (no game keys while typing in here)
    });
    S.win = w;
    return w;
  }
  const pressed = on => (on ? 'true' : 'false');
  function avatarHtml() {
    const a = NAVATAR.av,
      base = L.avBase(a),
      off = base.haupt ? ' nzoff' : '';
    const chips = (list, key, cur, lab = x => x.n) =>
      list
        .map(
          (x, i) =>
            `<button type="button" class="nzc" data-av="${key}" data-i="${i}" aria-pressed="${pressed(i === cur)}">${esc(lab(x))}</button>`
        )
        .join('');
    const sw = (list, key, cur, col = x => 'rgb(' + x.rgb.join(',') + ')') =>
      list
        .map(
          (x, i) =>
            `<button type="button" class="nzsw" data-av="${key}" data-i="${i}" title="${esc(x.n)}" aria-label="${esc(x.n)}" aria-pressed="${pressed(i === cur)}" style="background:${col(x)}"></button>`
        )
        .join('');
    return `<h3>Dein Avatar</h3>
      <label class="nzl" for="nzname">Name für die anderen</label>
      <div class="nzrow"><input type="text" id="nzname" maxlength="20" placeholder="${esc(NAVATAR.name())}" value="${esc(NAVATAR.nm)}"></div>
      <label class="nzl">Figur</label>
      <div class="nzchips">${L.BASEN.map((b, i) => `<button type="button" class="nzc" data-av="b" data-i="${i}" aria-pressed="${pressed(b.k === a.b)}">${esc(b.name)}</button>`).join('')}</div>
      ${base.haupt ? '<p class="nznote">Falko, Sarah und Christoph bleiben, wie sie sind – Farben, Hut und Brille gibt es für die anderen Figuren.</p>' : ''}
      <div class="${off}">
        <label class="nzl">Oberteil</label><div class="nzchips">${sw(L.OBER, 'o', a.o)}</div>
        <div class="nzchips" style="margin-top:5px">${chips(L.MUSTER_O, 'om', a.om)}</div>
        <label class="nzl">Hose</label><div class="nzchips">${sw(L.UNTER, 'u', a.u)}</div>
        <div class="nzchips" style="margin-top:5px">${chips(L.MUSTER_U, 'um', a.um)}</div>
        <label class="nzl">Schuhe</label><div class="nzchips">${sw(L.SCHUH, 's', a.s)}</div>
        <label class="nzl">Kopf</label><div class="nzchips">${chips(L.HUETE, 'h', a.h)}
          <button type="button" class="nzc" data-av="br" aria-pressed="${pressed(!!a.br)}">Brille</button>
          ${base.g === 'm' ? `<button type="button" class="nzc" data-av="ba" aria-pressed="${pressed(!!a.ba)}">Schnauzer</button>` : ''}</div>
      </div>
      <label class="nzl">Deine Farbe (Name und Zeigen)</label><div class="nzchips">${sw(L.FARBEN, 'c', a.c, x => x.css)}</div>
      <div class="nzrow" style="margin-top:8px"><button type="button" class="nzb" data-n="zufall">Zufall</button>
        <button type="button" class="nzb" data-n="ansehen">Ansehen (V)</button></div>`;
  }
  function roomHtml() {
    const on = NETZ.on,
      host = on && NETZ.role === 'host';
    let h = `<p class="nzst">${esc(NETZ.status || 'Spiel mit Freunden in derselben Welt – über das Internet, ohne Anmeldung.')}</p>`;
    if (NETZ.note) h += `<p class="nznote">${esc(NETZ.note)}</p>`;
    if (!on)
      h += `<div class="nzrow"><button type="button" class="nzb nzp" data-n="host">Raum erstellen</button></div>
        <div class="nzrow"><input type="text" class="nzcode" maxlength="8" placeholder="Code"><button type="button" class="nzb" data-n="join">Beitreten</button></div>`;
    else {
      if (host)
        h += `<div class="nzrow"><b style="font-family:var(--f-mono,monospace);letter-spacing:.08em">${esc(NETZ.code)}</b>
          <button type="button" class="nzb" data-n="copy">Link kopieren</button>${navigator.share ? '<button type="button" class="nzb" data-n="share">Teilen</button>' : ''}</div>
          <div class="nzrow"><input type="text" class="nzlink" readonly value="${esc(NETZ.link())}"></div>`;
      h += `<div class="nzrow"><button type="button" class="nzb" data-n="leave">Raum verlassen</button></div>`;
      h += `<p class="nznote" style="color:#5b6570">${host ? 'Du bist Gastgeber: Uhr und Datum kommen von dir.' : 'Uhr und Datum kommen vom Gastgeber; danach hast du deine wieder.'} Jeder sieht seinen eigenen Garten.</p>`;
    }
    return h;
  }
  function peopleHtml() {
    if (!NETZ.on) return '';
    const L2 = NETZ.list();
    const rows = L2.map(p => {
      const where = p.place ? esc(p.place) : '';
      const d = p.d != null ? (p.d < 1000 ? p.d + ' m' : (p.d / 1000).toFixed(1) + ' km') : '';
      return `<div class="nzpl" style="--nzc:${esc(p.color)}"><i class="nzdot"></i><span>${esc(p.name)}${p.role === 'host' ? ' <small>(Gastgeber)</small>' : ''}<br><small>${where}${where && d ? ' · ' : ''}${d}</small></span>
        <button type="button" class="nzb" data-n="hin" data-pid="${esc(p.pid)}"${p.st ? '' : ' disabled'}>Hin</button></div>`;
    }).join('');
    return `<h3>Mitspieler</h3><div class="nzlist">${rows || '<p class="nzst">Noch niemand da – schick den Link.</p>'}</div>`;
  }
  function gamesHtml() {
    if (!NETZ.on) return '';
    const host = NETZ.role === 'host',
      st = NVERSTECK.st,
      n = NETZ.list().length;
    let h =
      '<h3>Spiele</h3><p class="nzst"><b>Verstecken im Dorf</b> – einer zählt, die anderen verstecken sich in Häusern, hinter Schuppen, im Wald. Gefunden ist, neben wem der Suchende steht (E).</p>';
    if (st && st.phase !== 'ende')
      h += `<p class="nzst">Läuft gerade.</p>${host ? '<div class="nzrow"><button type="button" class="nzb" data-n="vsstop">Abbrechen</button></div>' : ''}`;
    else if (host) {
      const opts = [`<option value="">Zufall</option>`, `<option value="${esc(NAVATAR.pid)}">ich</option>`]
        .concat(NETZ.list().map(p => `<option value="${esc(p.pid)}">${esc(p.name)}</option>`))
        .join('');
      h += `<div class="nzrow"><label class="nzl" style="margin:0">Wer sucht?</label><select class="nzseek">${opts}</select>
        <button type="button" class="nzb nzp" data-n="vs"${n ? '' : ' disabled'}>Starten</button></div>`;
    } else h += '<p class="nzst">Der Gastgeber startet die Runde.</p>';
    return h;
  }
  function gestHtml() {
    return `<h3>Zeigen und Gesten</h3><div class="nzrow">
      <button type="button" class="nzb" data-g="zeigen" title="Wohin du schaust – auch mit G oder der mittleren Maustaste">Zeigen (G)</button>
      <button type="button" class="nzb" data-g="winken">Winken</button><button type="button" class="nzb" data-g="nicken">Nicken</button>
      <button type="button" class="nzb" data-g="kopf">Kopf schütteln</button><button type="button" class="nzb" data-g="achsel">Schulterzucken</button></div>`;
  }
  function render() {
    if (!S.win || S.win.hidden) return;
    const focus = document.activeElement,
      fid = focus && S.win.contains(focus) ? focus.id || focus.className : null,
      code = S.win.querySelector('.nzcode'),
      seek = S.win.querySelector('.nzseek');
    const codeVal = code ? code.value : '',
      seekVal = seek ? seek.value : '';
    S.win.innerHTML = `<h2>Zusammen spielen <button type="button" class="nzx" data-n="close" aria-label="Schließen">×</button></h2>
      ${roomHtml()}${peopleHtml()}${gamesHtml()}${gestHtml()}${avatarHtml()}`;
    const c2 = S.win.querySelector('.nzcode'),
      s2 = S.win.querySelector('.nzseek');
    if (c2) c2.value = codeVal;
    if (s2 && seekVal && [...s2.options].some(o => o.value === seekVal)) s2.value = seekVal; // (who seeks: kept over the refresh)
    if (fid === 'nzname') {
      const i = $('nzname');
      if (i) {
        i.focus();
        i.selectionStart = i.selectionEnd = i.value.length;
      }
    } else if (fid && String(fid).includes('nzcode') && c2) c2.focus();
  }
  function show(on = true) {
    build();
    S.open = !!on;
    S.win.hidden = !on;
    if (on) render();
    markDirty();
  }
  const toggle = () => show(!S.open);
  function join() {
    const i = S.win && S.win.querySelector('.nzcode'),
      c = L.clean(i ? i.value : '');
    if (c.length < 4) {
      NETZ.status = 'Bitte den Code eingeben (sechs Zeichen).';
      return render();
    }
    NETZ.open('gast', c, new URLSearchParams(location.search).get('lokal') === '1');
  }
  function setAv(patch) {
    const a = Object.assign({}, NAVATAR.av, patch);
    NAVATAR.set({ av: a });
    render();
  }
  function onClick(e) {
    const b = e.target.closest('button');
    if (!b) return;
    const n = b.dataset.n;
    if (b.dataset.g) NETZ.geste(b.dataset.g);
    else if (b.dataset.av) {
      const k = b.dataset.av,
        i = +b.dataset.i;
      if (k === 'b') setAv({ b: L.BASEN[i].k });
      else if (k === 'br' || k === 'ba') setAv({ [k]: NAVATAR.av[k] ? 0 : 1 });
      else setAv({ [k]: i });
    } else if (n === 'close') show(false);
    else if (n === 'host') NETZ.open('host', '', new URLSearchParams(location.search).get('lokal') === '1');
    else if (n === 'join') join();
    else if (n === 'leave') NETZ.close();
    else if (n === 'copy') copy(NETZ.link());
    else if (n === 'share')
      navigator
        .share({
          title: 'Pavillon Ratscher – zusammen spielen',
          text: 'Komm in meinen Raum ' + NETZ.code + ':',
          url: NETZ.link(),
        })
        .catch(() => {});
    else if (n === 'hin') NETZ.jumpTo(b.dataset.pid).then(() => show(false));
    else if (n === 'vs') {
      const sel = S.win.querySelector('.nzseek');
      NVERSTECK.start(sel && sel.value ? sel.value : null);
      show(false);
    } else if (n === 'vsstop') NVERSTECK.stop();
    else if (n === 'zufall') {
      NAVATAR.set({ av: L.avRandom() });
      render();
    } else if (n === 'ansehen') {
      setView3(true);
      show(false);
    }
    b.blur && b.blur();
  }
  function onInput(e) {
    if (e.target && e.target.id === 'nzname') {
      clearTimeout(S.avT);
      const v = e.target.value;
      S.avT = setTimeout(() => NAVATAR.set({ name: v }), e.type === 'change' ? 0 : 600);
    }
  }
  function copy(t) {
    const done = () => {
      NETZ.status = 'Link kopiert – schick ihn deinen Mitspielern.';
      render();
    };
    try {
      navigator.clipboard.writeText(t).then(done, () => {
        const i = S.win.querySelector('.nzlink');
        if (i) {
          i.select();
          document.execCommand && document.execCommand('copy');
        }
        done();
      });
    } catch (e) {}
  }
  // ---- the menu entry (start page, beside Aufgaben and Inventar) and the bar's buttons ----
  function mount() {
    css();
    const list = document.querySelector('#menu [data-page="start"] .msec .mlist');
    if (list && !$('netzbtn')) {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'tog';
      b.id = 'netzbtn';
      b.setAttribute('aria-pressed', 'false');
      b.title = 'Mit Freunden in derselben Welt spielen – über das Internet';
      b.innerHTML = 'Zusammen spielen<span>mit Freunden</span>';
      b.addEventListener('click', () => {
        if (window.HUD && window.HUD.setMenu) window.HUD.setMenu(false);
        show(true);
      });
      list.appendChild(b);
    }
    const bar = $('hudtr'),
      mb = $('menubtn');
    if (bar && !$('netzhb')) {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'hb';
      b.id = 'netzhb';
      b.hidden = true;
      b.title = 'Zusammen spielen';
      b.innerHTML =
        '<span class="hbi"><svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="8.5" cy="8" r="3"/><circle cx="16" cy="9" r="2.5"/>' +
        '<path d="M3 19c0-3 2.5-5.2 5.5-5.2S14 16 14 19M13.5 15.2c.7-.6 1.6-1 2.6-1 2.3 0 4 1.8 4 4.4"/></svg></span><span class="hbt">Zusammen<i class="hbc">1</i></span>';
      b.addEventListener('click', toggle);
      bar.insertBefore(b, mb || null);
      S.hb = b;
      const p = document.createElement('button');
      p.type = 'button';
      p.className = 'hb';
      p.id = 'netzping';
      p.hidden = true;
      p.title = 'Zeigen, wohin du schaust';
      p.innerHTML =
        '<span class="hbi"><svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="7"/><circle cx="12" cy="12" r="2.2"/></svg></span><span class="hbt">Zeigen</span>';
      p.addEventListener('click', () => NETZ.ping());
      bar.insertBefore(p, b);
      S.pb = p;
    }
    bars();
  }
  function bars() {
    if (S.hb) {
      S.hb.hidden = !NETZ.on;
      const c = S.hb.querySelector('.hbc');
      if (c) c.textContent = String(NETZ.list().length + 1);
      S.hb.setAttribute('aria-pressed', S.open ? 'true' : 'false');
    }
    if (S.pb) S.pb.hidden = !(NETZ.on && COARSE);
    const mb = $('netzbtn');
    if (mb) {
      mb.setAttribute('aria-pressed', NETZ.on ? 'true' : 'false');
      const sp = mb.querySelector('span');
      if (sp) sp.textContent = NETZ.on ? (NETZ.role === 'host' ? 'Raum ' + NETZ.code : 'im Raum') : 'mit Freunden';
    }
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', mount);
  else mount();
  NETZ.watch(() => {
    bars();
    render();
  });
  KERN.on('netz:avatar', () => render());
  // the list's distances: once a second while the window is open
  KERN.tick(dt => {
    if (!S.open || !NETZ.on) return;
    S.listT -= dt;
    if (S.listT > 0) return;
    S.listT = 1;
    const f = document.activeElement;
    if (!(f && S.win.contains(f) && f.tagName === 'INPUT') && !(f && f.tagName === 'SELECT')) render();
  }, 'netz/ui');
  // ---- keys: G points (walking, not in a vehicle, not typing), the middle mouse button points where it is ----
  const typing = () =>
    ['INPUT', 'TEXTAREA', 'SELECT'].includes(document.activeElement && document.activeElement.tagName);
  const canPoint = () => P.mode === 'walk' && !(VEH && VEH.cur) && !(window.HUD && window.HUD.open);
  window.addEventListener('keydown', e => {
    if (e.repeat || typing() || e.ctrlKey || e.metaKey || e.altKey) return;
    if ((e.key === 'g' || e.key === 'G') && NETZ.on && canPoint()) NETZ.ping();
  });
  (stage || document.body).addEventListener('mousedown', e => {
    if (e.button !== 1 || !NETZ.on || !canPoint()) return;
    e.preventDefault();
    if (document.pointerLockElement) NETZ.ping();
    else {
      const r = stage.getBoundingClientRect();
      NETZ.ping([((e.clientX - r.left) / r.width) * 2 - 1, -(((e.clientY - r.top) / r.height) * 2 - 1)]);
    }
  });
  return Object.assign(S, { show, toggle, render, mount });
})();
window.NETZUI = NETZUI;
