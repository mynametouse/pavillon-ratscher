// ===================== REPORT: error report by click (refactor plan, phase 2 – for Falko's devices) =====================
// Most bugs of 22.10.2026 happened only on Falko's devices (16 textures, Direct3D, a saved state, iPhone memory). One click collects what a
// diagnosis needs – build, device, graphics, quality tier, the load log of this and of a broken last attempt, errors, saved keys (names only,
// never values), where one stands – and offers it to copy (into the chat with Claude) or as a prefilled GitHub issue.
// Menu → Einstellungen → „Fehlerbericht“, and on the loading screen next to „Protokoll“ (boot/boot.js). Works even when parts failed:
// every source is read in its own try.
import { SAVE } from '../core/save.js';
import { DPR, HQ0 } from '../core/head.js';
import { LOADLOG } from '../core/assets.js';
import { GLINFO, RENDER } from '../render/render.js';
import { P } from '../game/walkable.js';
import { placeName } from '../game/player.js';

export const REPORT = (() => {
  const ISSUES = 'https://github.com/mynametouse/pavillon-ratscher/issues/new';
  const get = (f, d = '?') => {
    try {
      const v = f();
      return v == null || v === '' ? d : v;
    } catch (e) {
      return d;
    }
  };
  const sec = t => (t / 1000).toFixed(1) + ' s';
  function text() {
    const L = [];
    const B = window.PAV_BUILD || {};
    L.push('Pavillon Ratscher – Fehlerbericht');
    L.push('Zeit: ' + get(() => new Date().toLocaleString('de-DE')));
    L.push('Seite: ' + get(() => location.origin + location.pathname + location.search));
    L.push('Stand: ' + (B.src || '?') + (B.t ? ' (gebaut ' + B.t + ')' : ''));
    L.push('Gerät: ' + get(() => navigator.userAgent));
    L.push(
      'Bildschirm: ' +
        get(() => innerWidth + '×' + innerHeight + ' @' + DPR) +
        ' · Touch ' +
        get(() => (matchMedia('(pointer: coarse)').matches ? 'ja' : 'nein')) +
        ' · Speicher ' +
        get(() => (navigator.deviceMemory ? navigator.deviceMemory + ' GB' : '?'))
    );
    L.push('Grafik: ' + get(() => GLINFO.renderer) + (get(() => GLINFO.soft, false) ? ' (Software)' : ''));
    L.push(
      'Stufe: ' +
        get(() => RENDER.tier) +
        (get(() => SAVE.raw('pav-tier'), '') ? ' (selbst gewählt)' : '') +
        ' · HQ ' +
        get(() => (HQ0 ? 'ja' : 'nein')) +
        ' · Texturen ' +
        get(() => (window.TEXHALF && window.TEXHALF.level ? '1/' + 2 ** window.TEXHALF.level + ' Kante' : 'voll'))
    );
    L.push(
      'Geladen: ' +
        get(() => (window.PAV_LOADED ? 'ja' : 'nein')) +
        ' · JS-Speicher ' +
        get(() => (performance.memory ? Math.round(performance.memory.usedJSHeapSize / 1e6) + ' MB' : '?'))
    );
    L.push(
      'Ort: ' +
        get(() => placeName()) +
        ' · ' +
        get(() => `x ${P.x.toFixed(1)} y ${P.y.toFixed(1)} z ${P.feet.toFixed(2)} ${P.mode}`)
    );
    const errs = get(() => LOADLOG.errs, []);
    L.push('', 'Fehler (' + errs.length + '):');
    for (const e of errs.slice(-6)) L.push('  ' + String(e).replace(/\s+/g, ' ').slice(0, 300));
    const prev = get(() => LOADLOG.prev, null);
    if (prev && prev.steps)
      L.push(
        '',
        'Letzter Ladeversuch brach ab (' + sec(prev.t || 0) + '):',
        ...prev.steps.slice(-8).map(s => '  ' + sec(s[0]) + '  ' + s[1]),
        ...(prev.errs || []).map(e => '  Fehler: ' + String(e).slice(0, 200))
      );
    const steps = get(() => LOADLOG.steps, []);
    L.push('', 'Ladeprotokoll (' + steps.length + ' Schritte, die letzten 15):');
    for (const s of steps.slice(-15)) L.push('  ' + sec(s[0]) + '  ' + s[1]);
    const keys = get(() => SAVE.keys().filter(k => !k.secret && SAVE.raw(k.key) != null), []);
    L.push(
      '',
      'Gespeichert: ' +
        (keys.map(k => k.key).join(', ') || 'nichts') +
        get(() => (SAVE.persistent() ? '' : ' (Browser speichert nicht)'), '')
    );
    const probs = get(() => SAVE.problems, []);
    if (probs.length)
      L.push(
        'Speicherprobleme: ' +
          probs
            .slice(-5)
            .map(p => p.key + ' ' + p.what)
            .join('; ')
      );
    return L.join('\n');
  }
  function issueUrl(t) {
    const first = (get(() => LOADLOG.errs.slice(-1)[0], '') || '').replace(/\s+/g, ' ').slice(0, 70);
    const title = 'Fehlerbericht: ' + (first || get(() => navigator.platform, 'Gerät'));
    return (
      ISSUES +
      '?title=' +
      encodeURIComponent(title) +
      '&body=' +
      encodeURIComponent('```\n' + t.slice(0, 5500) + '\n```')
    );
  }
  let box = null;
  function show() {
    const t = text();
    if (box) box.remove();
    box = document.createElement('div');
    box.id = 'reportbox';
    box.setAttribute('role', 'dialog');
    box.setAttribute('aria-label', 'Fehlerbericht');
    box.style.cssText =
      'position:fixed;inset:0;z-index:60;display:flex;align-items:center;justify-content:center;background:rgba(0,0,0,.35);padding:max(12px,env(safe-area-inset-top,0px)) max(12px,env(safe-area-inset-right,0px)) max(12px,env(safe-area-inset-bottom,0px)) max(12px,env(safe-area-inset-left,0px))';
    const card = document.createElement('div');
    card.style.cssText =
      'width:min(680px,100%);max-height:100%;display:flex;flex-direction:column;gap:10px;background:var(--paper);color:var(--ink);border:1px solid var(--line);border-radius:12px;padding:14px;box-shadow:0 10px 40px rgba(0,0,0,.3)';
    const h = document.createElement('div');
    h.style.cssText = 'font:600 15px/1.3 var(--f-body)';
    h.textContent = 'Fehlerbericht';
    const p = document.createElement('div');
    p.style.cssText = 'font:400 13px/1.45 var(--f-body);color:var(--muted)';
    p.textContent =
      'Kopieren und an Claude schicken – oder als Meldung auf GitHub öffnen. Enthält Gerät, Grafik, Ladeprotokoll und Fehler, keine gespeicherten Inhalte.';
    const ta = document.createElement('textarea');
    ta.readOnly = true;
    ta.value = t;
    ta.style.cssText =
      'flex:1;min-height:180px;height:46vh;resize:vertical;font:400 11.5px/1.45 var(--f-mono);color:var(--ink);background:var(--plate);border:1px solid var(--line);border-radius:8px;padding:8px';
    const row = document.createElement('div');
    row.style.cssText = 'display:flex;flex-wrap:wrap;gap:8px;justify-content:flex-end';
    const btn = (label, fn, primary) => {
      const b = document.createElement('button');
      b.type = 'button';
      b.textContent = label;
      b.style.cssText =
        'font:500 13px/1 var(--f-body);border-radius:999px;padding:10px 14px;cursor:pointer;border:1px solid var(--line);' +
        (primary ? 'background:var(--ink);color:var(--paper)' : 'background:var(--plate);color:var(--ink)');
      b.onclick = fn;
      row.appendChild(b);
      return b;
    };
    const copy = btn(
      'Kopieren',
      () => {
        const done = ok => (copy.textContent = ok ? 'Kopiert' : 'Text markiert – jetzt kopieren');
        try {
          navigator.clipboard.writeText(t).then(
            () => done(true),
            () => (ta.select(), done(false))
          );
        } catch (e) {
          ta.select();
          done(false);
        }
      },
      true
    );
    const a = document.createElement('a');
    a.href = issueUrl(t);
    a.target = '_blank';
    a.rel = 'noopener';
    a.textContent = 'Auf GitHub melden';
    a.style.cssText =
      'font:500 13px/1 var(--f-body);border-radius:999px;padding:10px 14px;border:1px solid var(--line);background:var(--plate);color:var(--ink);text-decoration:none';
    row.appendChild(a);
    btn('Schließen', () => close());
    card.append(h, p, ta, row);
    box.appendChild(card);
    box.addEventListener('click', e => {
      if (e.target === box) close();
    });
    document.body.appendChild(box);
  }
  function close() {
    if (box) box.remove();
    box = null;
  }
  addEventListener(
    'keydown',
    e => {
      if (box && e.key === 'Escape') {
        e.stopImmediatePropagation(); // only the report closes, not the menu behind it
        close();
      }
    },
    true
  );
  const mb = document.getElementById('reportbtn');
  if (mb) mb.addEventListener('click', () => show());
  return { text, show, close };
})();
window.REPORT = REPORT; // test interface
