// ===================== V15b workshop windows: machine settings, the workpiece card, the workshop book =====================
// The machine window holds what a real machine is set to (fence, blade height, depth of cut …), choices and a check list (protective gear).
// The card in the HUD shows the workpiece one is working on and its next step; the book (B) the whole way to the board with the reasons.
phase(null);
const WUI = (() => {
  const mw = $('machwin'), card = $('wpcard'), bk = $('werkbuch');
  const esc = t => String(t).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const de = v => (Math.round(v * 100) / 100).toLocaleString('de-DE'), de1 = v => (Math.round(v * 10) / 10).toLocaleString('de-DE');
  const S = { spec: null, vals: {}, cardOff: (() => { try { return localStorage.getItem('pav-wpcard') === '0'; } catch (e) { return false; } })(), cardT: null, bookOpen: false };
  // ---------------- the machine window ----------------
  function machine(spec) { if (!mw) return; S.spec = spec; S.vals = {}; for (const r of spec.rows || []) S.vals[r.k] = r.val; for (const c of spec.choices || []) S.vals[c.k] = c.val; for (const c of spec.checks || []) if (c.k) S.vals[c.k] = !!c.val;
    keys.clear(); if (window.HUD) HUD.unlock(); renderM(); mw.hidden = false; setTimeout(() => { const b = mw.querySelector('.go'); if (b && !mw.hidden) try { b.focus({ preventScroll: true }); } catch (e) {} }, 40); }
  function renderM() { const sp = S.spec; if (!sp) return; let h = `<h3>${esc(sp.title)}<button type="button" class="x" aria-label="Schließen">×</button></h3>` + (sp.sub ? `<div class="msub">${esc(sp.sub)}</div>` : '') + (sp.fig ? `<div class="mfig">${sp.fig}</div>` : '');   // V16c2: a drawing (world/fell.js)
    for (const r of sp.rows || []) { const v = S.vals[r.k];
      h += `<div class="mrw"><div class="mlb"><span>${esc(r.label)}</span><b>${de(v)} ${esc(r.unit || '')}</b></div><div class="mct"><button type="button" class="st" data-st="${r.k}" data-d="-1" aria-label="weniger">−</button><input type="range" data-k="${r.k}" min="${r.min}" max="${r.max}" step="${r.step}" value="${v}" aria-label="${esc(r.label)}"><button type="button" class="st" data-st="${r.k}" data-d="1" aria-label="mehr">+</button></div>${r.hint ? `<small>${esc(r.hint)}</small>` : ''}</div>`; }
    for (const c of sp.choices || []) h += `<div class="mrw"><div class="mlb"><span>${esc(c.label)}</span></div><div class="mseg mch">${c.opts.map(([v, t]) => `<button type="button" data-ch="${c.k}" data-v="${esc(String(v))}" aria-pressed="${String(S.vals[c.k]) === String(v)}">${esc(t)}</button>`).join('')}</div>${c.hint ? `<small>${esc(c.hint)}</small>` : ''}</div>`;
    const ed = (sp.checks || []).filter(c => c.k), ro = sp.gear ? [...sp.gear.req.map(r => ({ ok: r.split('|').some(GEAR.worn), label: r.split('|').map(id => GEAR.IT[id].n).join(' / ') })), ...(sp.gear.ng ? [{ ok: !GEAR.on.hands, label: 'keine Handschuhe' }] : [])] : [];
    if (ed.length) h += '<div class="mchk">' + ed.map(c => `<button type="button" class="ck${S.vals[c.k] ? ' on' : ''}" data-ck="${c.k}" aria-pressed="${!!S.vals[c.k]}"><i></i><span><b>${esc(c.label)}</b>${c.hint ? `<small>${esc(c.hint)}</small>` : ''}</span></button>`).join('') + '</div>';
    if (ro.length) h += '<div class="mgear"><span>Schutz:</span>' + ro.map(c => `<em class="${c.ok ? 'ok' : 'no'}">${c.ok ? '✓' : '✗'} ${esc(c.label)}</em>`).join('') + (ro.some(c => !c.ok) ? '<button type="button" class="gearlink">PSA</button>' : '') + '</div>';
    if (sp.info) h += `<p class="minfo">${esc(sp.info)}</p>`;
    h += `<div class="mbtn"><button type="button" class="go acc">${esc(sp.go || 'Los')}</button><button type="button" class="cn">Abbrechen</button></div>`;
    mw.innerHTML = h;
    mw.querySelector('.x').addEventListener('click', () => close(true)); mw.querySelector('.cn').addEventListener('click', () => close(true)); mw.querySelector('.go').addEventListener('click', go);
    mw.querySelectorAll('input[type=range]').forEach(i => i.addEventListener('input', () => { S.vals[i.dataset.k] = +i.value; const b = i.closest('.mrw').querySelector('.mlb b'); const r = sp.rows.find(r => r.k === i.dataset.k); b.textContent = de(+i.value) + ' ' + (r.unit || ''); }));
    mw.querySelectorAll('[data-st]').forEach(b => b.addEventListener('click', () => { const r = sp.rows.find(r => r.k === b.dataset.st); let v = S.vals[r.k] + (+b.dataset.d) * r.step; v = Math.round(Math.max(r.min, Math.min(r.max, v)) * 1000) / 1000; S.vals[r.k] = v; renderM(); }));
    mw.querySelectorAll('[data-ch]').forEach(b => b.addEventListener('click', () => { const c = sp.choices.find(c => c.k === b.dataset.ch), o = c.opts.find(([v]) => String(v) === b.dataset.v); S.vals[c.k] = o ? o[0] : b.dataset.v; renderM(); }));
    mw.querySelectorAll('[data-ck]').forEach(b => b.addEventListener('click', () => { S.vals[b.dataset.ck] = !S.vals[b.dataset.ck]; renderM(); }));
    mw.querySelector('.gearlink')?.addEventListener('click', () => GEAR.setWin(true)); }
  function go() { const sp = S.spec; if (!sp) return; const v = Object.assign({}, S.vals); close(false); try { sp.onGo && sp.onGo(v); } catch (e) { console.warn('machine', e); } card_(); }
  function close(cancel) { if (!mw || mw.hidden) return; mw.hidden = true; const sp = S.spec; S.spec = null; if (cancel && sp && sp.onClose) try { sp.onClose(); } catch (e) {} }
  mw?.addEventListener('keydown', e => { if (e.key === 'Enter' && !e.target.matches('button')) { e.preventDefault(); go(); } });
  // ---------------- the workpiece card ----------------
  let lastCard = '';
  function card_() { clearTimeout(S.cardT); S.cardT = setTimeout(renderCard, 60); }
  function nearWorkshop() { if (typeof P === 'undefined' || P.mode !== 'walk' || !window.WERK) return false; const [x, y] = WERK.WT(-1.0, -37.5); return Math.hypot(P.x - x, P.y - y) < 13; }
  function renderCard() { if (!card || !window.WERK || !WERK.on) return; const c = WERK.carriedWP(), wp = c || (nearWorkshop() ? WERK.current() : null), show = !!wp && P.mode === 'walk' && !(window.HUD && HUD.open);
    if (!show) { if (!card.hidden) { card.hidden = true; lastCard = ''; } return; }
    const nx = WERK.nextStep(wp), jobs = []; for (const j of (window.CLOCK ? clockJobs() : [])) jobs.push(j);
    const h = S.cardOff ? `<button type="button" class="wc-t" aria-expanded="false"><b>${esc(WERK.nameOf(wp))}</b><i>›</i></button>`
      : `<button type="button" class="wc-t" aria-expanded="true"><b>${esc(WERK.nameOf(wp))}</b><i>‹</i></button><div class="wc-d">${esc(WERK.dimsOf(wp))} · ${de1(wp.mc)} % Holzfeuchte${wp.fum && WERK.fumeH(wp) > 3 ? ' · geräuchert ' + Math.round(WERK.fumeH(wp)) + ' h' : ''}</div>`
        + (nx ? `<div class="wc-n"><span>Nächster Schritt</span>${esc(nx.t)}</div>` : '') + (jobs.length ? `<div class="wc-j">${jobs.map(j => esc(j)).join('<br>')}</div>` : '') + (wp.done && wp.stars ? `<div class="wc-s">${'★'.repeat(wp.stars)}${'☆'.repeat(5 - wp.stars)}</div>` : '')
        + `<button type="button" class="wc-b">Werkstattbuch${COARSE ? '' : ' · B'}</button>`;
    if (h === lastCard && !card.hidden) return; lastCard = h; card.innerHTML = h; card.hidden = false;
    card.querySelector('.wc-t').addEventListener('click', () => { S.cardOff = !S.cardOff; try { localStorage.setItem('pav-wpcard', S.cardOff ? '0' : '1'); } catch (e) {} lastCard = ''; renderCard(); });
    card.querySelector('.wc-b')?.addEventListener('click', () => book(true)); }
  function clockJobs() { const out = []; try { const ST = WERK.ST, gw = ST.glue.wp; if (gw && (gw.st === 'clamp1' || gw.st === 'clamp2')) { const l = (gw.tc || (gw.g && gw.g.tc) || 0) + 30 - CLOCK.t; if (gw.g && l > 0) out.push('In den Zwingen: noch ' + CLOCK.dur(l)); }
    if (gw && gw.g && gw.g.t0 != null && !gw.g.tc) out.push('Leim offen: noch ' + Math.max(0, Math.ceil(gw.g.t0 + 12 - CLOCK.t)) + ' min'); } catch (e) {} return out; }
  let acc = 0; window.TICKS.push(dt => { acc += dt; if (acc < 0.5) return; acc = 0; renderCard(); if (S.bookOpen) renderBook(true); });
  // ---------------- the workshop book ----------------
  function book(v) { if (!bk) return; S.bookOpen = v === undefined ? !S.bookOpen : !!v; bk.hidden = !S.bookOpen; if (S.bookOpen) { if (window.HUD) HUD.unlock(); renderBook(); } }
  let lastBook = '';
  function renderBook(soft) { if (!bk || bk.hidden || !window.WERK) return; const wp = WERK.current(), ord = wp ? (WERK.ORDER[wp.st] ?? 0) : -1, B = WERK.BOOK;
    let h = '<h3>Werkstattbuch<button type="button" class="x" aria-label="Schließen">×</button></h3><p class="bk-i">Ein Stirnholz-Schneidebrett aus Leimholz Eiche – Schritt für Schritt. ' + (wp ? 'Dein Werkstück: <b>' + esc(WERK.nameOf(wp)) + '</b>.' : 'Leimholzplatten liegen im Regal an der Rückwand.') + '</p><ol class="bk">';
    B.forEach(([k, t, d], i) => { const st = !wp ? '' : k === 'psa' ? (GEAR.have ? 'ok' : '') : k === 'fume' ? (WERK.fumeH(wp) > 3 ? 'ok' : 'opt') : i < ord ? 'ok' : i === ord ? 'cur' : '';
      h += `<li class="${st}"><b>${esc(t)}</b><span>${esc(d)}</span></li>`; });
    h += '</ol>'; const fin = WERK.finished();
    if (fin.length) h += '<h4>Fertige Bretter</h4><ul class="bk-f">' + fin.map(w => `<li><b>${esc(WERK.nameOf(w))}</b> ${'★'.repeat(w.stars || 0)}${'☆'.repeat(5 - (w.stars || 0))}<span>${esc(w.where === 'ronald' ? 'bei Ronald' : w.where === 'shelf' ? 'im Regal' : 'dabei')}${w.notes.length ? ' · ' + esc(w.notes.join('; ')) : ''}</span></li>`).join('') + '</ul>';
    h += '<p class="bk-n">Spielzeit läuft (Uhr oben rechts: Tempo, Warten). Schutzausrüstung: PSA oben rechts. Q mit freien Händen: Werkstück von der Station nehmen.</p>';
    if (soft && h === lastBook) return; lastBook = h; bk.innerHTML = h; bk.querySelector('.x').addEventListener('click', () => book(false)); }
  window.addEventListener('keydown', e => { if (['INPUT', 'TEXTAREA', 'SELECT'].includes(document.activeElement?.tagName) || e.ctrlKey || e.metaKey || e.altKey || e.repeat) return; if ((e.key === 'b' || e.key === 'B') && P.mode === 'walk' && !(window.HUD && HUD.open) && !(window.PIANO && PIANO.on)) { book(); e.preventDefault(); } });
  return { machine, close, get open() { return !!(mw && !mw.hidden); }, refresh: () => { if (mw && !mw.hidden) renderM(); }, card: card_, book, renderCard };
})();
window.WUI = WUI;
