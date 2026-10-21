// ===================== V15b game time and protective gear =====================
// The clock runs while playing (walk mode, menu closed): by default one game hour per real minute, adjustable (real time, 1 h = 1 min,
// 1 h = 10 s). Glue, oil and fuming take game time; while gluing the clock runs in real time ("focus"), so the open time of the glue is honest;
// waiting is a short time-lapse. Since V16a sun, moon and stars follow the clock (34_daynight.js).
// GEAR: personal protective equipment from the board in the workshop – goggles, ear defenders, FFP2 mask, half mask with ABEK filter, gloves.
phase(null);
const CLOCK = (() => {
  const LSK = 'pav-clock-v1';
  const RATES = { real: { r: 1 / 60, n: 'Echtzeit' }, min: { r: 1, n: '1 Std = 1 Min' }, fast: { r: 6, n: '1 Std = 10 s' } };
  const S = { t: 7 * 60 + 30, rate: 'min', focus: new Set(), warp: null, saveAcc: 0, shown: '', jobs: [] };
  try { const s = JSON.parse(localStorage.getItem(LSK) || 'null'); if (s && isFinite(s.t)) S.t = s.t; if (s && RATES[s.rate]) S.rate = s.rate; } catch (e) {}
  const save = () => { try { localStorage.setItem(LSK, JSON.stringify({ t: S.t, rate: S.rate })); } catch (e) {} };
  const pad = n => String(n).padStart(2, '0');
  const day = (t = S.t) => Math.floor(t / 1440) + 1;
  const hm = (t = S.t) => { const m = ((Math.floor(t) % 1440) + 1440) % 1440; return pad(Math.floor(m / 60)) + ':' + pad(m % 60); };
  function dur(min) { min = Math.max(0, Math.ceil(min - 1e-6)); if (min < 60) return min + ' min'; const d = Math.floor(min / 1440), h = Math.floor((min % 1440) / 60), m = min % 60;
    if (d) return d + (d === 1 ? ' Tag' : ' Tage') + (h ? ' ' + h + ' h' : ''); return h + ' h' + (m ? ' ' + m + ' min' : ''); }
  const running = () => typeof P !== 'undefined' && P.mode === 'walk' && !(window.HUD && HUD.open);
  const rate = () => S.warp ? S.warp.r : (S.focus.size ? 1 / 60 : RATES[S.rate].r);
  const fns = [];
  function tick(dt) { if (!running()) return; dt = Math.min(dt, 0.25); const t0 = S.t; S.t += dt * rate();
    if (S.warp && S.t >= S.warp.until) { S.t = S.warp.until; const w = S.warp; S.warp = null; ui(); try { w.done && w.done(); } catch (e) { console.warn(e); } }
    for (const f of fns) try { f(S.t, S.t - t0); } catch (e) { console.warn('clock', e); }
    S.saveAcc += dt; if (S.saveAcc > 4) { S.saveAcc = 0; save(); } ui(); }
  window.TICKS.push(tick);
  // waiting: the clock races ahead (1.5–8 s real time); everything that takes time in the world goes on meanwhile
  function wait(min, label, done) { if (!(min > 0)) { done && done(); return; } const secs = Math.max(1.5, Math.min(8, 1.2 + Math.sqrt(min) * 0.32));
    S.warp = { from: S.t, until: S.t + min, r: min / secs, label: label || 'Zeitraffer', done }; ui(); markDirty(); }
  function cancel() { if (!S.warp) return; S.warp = null; ui(); }
  const focus = k => { S.focus.add(k); ui(); }, unfocus = k => { if (S.focus.delete(k)) ui(); };
  // minutes until the next time of day h:m
  const until = (h, m = 0) => { const now = ((S.t % 1440) + 1440) % 1440, tgt = h * 60 + m; let d = tgt - now; if (d <= 1) d += 1440; return d; };
  // ---- HUD: the clock button and its window ----
  const btn = $('clockbtn'), win = $('clockwin');
  function ui() { if (!btn) return; const txt = (COARSE ? '' : (window.DN ? DN.dateShort() : 'Tag ' + day()) + ' · ') + hm() + (S.warp ? ' ⏩' : '');
    if (txt !== S.shown) { S.shown = txt; btn.querySelector('.hbt').textContent = txt; btn.title = 'Spielzeit: ' + (window.DN ? DN.dateStr(S.t, true) : 'Tag ' + day()) + ', ' + hm() + ' Uhr' + (S.focus.size ? ' (läuft in Echtzeit)' : '') + ' – antippen: Tempo, Warten'; }
    btn.classList.toggle('focus', S.focus.size > 0); btn.classList.toggle('warp', !!S.warp); if (win && !win.hidden) renderWin(true); }
  let winAcc = 0;
  function renderWin(soft) { if (!win || win.hidden) return; if (soft) { const now = performance.now(); if (now - winAcc < 400) return; winAcc = now; }
    const jobs = []; for (const f of S.jobs) { try { jobs.push(...(f() || [])); } catch (e) {} }
    win.innerHTML = `<h3>Spielzeit<button type="button" class="x" aria-label="Schließen">×</button></h3>
      <div class="cknow"><b>Tag ${day()}</b><span>${hm()} Uhr</span>${S.focus.size ? '<em>Echtzeit – Leim offen</em>' : S.warp ? '<em>' + (S.warp.label === 'Schlafen' ? 'Schlafen …' : 'Zeitraffer …') + '</em>' : ''}</div>${window.DN ? DN.winHTML() : ''}
      <div class="mrow"><span>Tempo</span><div class="mseg">${Object.entries(RATES).map(([k, r]) => `<button type="button" data-rate="${k}" aria-pressed="${S.rate === k}">${r.n}</button>`).join('')}</div></div>
      <h4>Warten (Zeitraffer)</h4><div class="ckw">${[[15, '15 min'], [60, '1 Std'], [240, '4 Std']].map(([m, l]) => `<button type="button" data-wait="${m}">${l}</button>`).join('')}<button type="button" data-wait="morgen">Bis morgen 7:00</button>${S.warp ? '<button type="button" data-wait="stop" class="acc">Zeitraffer stoppen</button>' : ''}</div>
      ${jobs.length ? `<h4>Läuft gerade</h4><ul class="ckj">${jobs.map(j => `<li><b>${j.label}</b><span>${j.left > 0 ? 'noch ' + dur(j.left) : 'fertig'}</span></li>`).join('')}</ul>` : ''}
      <p class="mnote">Leim, Öl und Räuchern brauchen Spielzeit. Beim Verleimen läuft die Uhr in Echtzeit – die offene Zeit des Leims ist echt. Sonne, Mond und Sterne stehen, wo sie über Ratscher zu dieser Stunde wirklich stehen. Nachts: auf das Tagesbett legen und bis zum Morgen schlafen.</p>`;
    win.querySelector('.x').addEventListener('click', () => setWin(false)); if (window.DN) DN.winBind(win);
    win.querySelectorAll('[data-rate]').forEach(b => b.addEventListener('click', () => setRate(b.dataset.rate)));
    win.querySelectorAll('[data-wait]').forEach(b => b.addEventListener('click', () => { const w = b.dataset.wait; if (w === 'stop') cancel(); else if (S.focus.size) PLAY.think('Nicht jetzt – der Leim ist offen.'); else wait(w === 'morgen' ? until(7) : +w, 'Warten'); renderWin(); })); }
  function setWin(v) { if (!win) return; win.hidden = !v; if (v) { if (window.HUD) HUD.unlock(); renderWin(); } }
  function setRate(k) { if (!RATES[k]) return; S.rate = k; save(); ui(); renderWin(); document.querySelectorAll('[data-crate]').forEach(b => b.setAttribute('aria-pressed', b.dataset.crate === k ? 'true' : 'false')); }
  btn?.addEventListener('click', () => { setWin(win.hidden); btn.blur(); });
  document.querySelectorAll('[data-crate]').forEach(b => { b.setAttribute('aria-pressed', b.dataset.crate === S.rate ? 'true' : 'false'); b.addEventListener('click', () => setRate(b.dataset.crate)); });
  ui();
  return { get t() { return S.t; }, set t(v) { S.t = v; ui(); save(); }, get rate() { return S.rate; }, setRate, RATES, wait, cancel, get warp() { return S.warp; }, focus, unfocus, get focused() { return S.focus.size > 0; },
    day, hm, dur, fmt: t => 'Tag ' + day(t) + ' · ' + hm(t), on: f => fns.push(f), jobs: f => S.jobs.push(f), save, ui, until, setWin, get winOpen() { return !!(win && !win.hidden); } };
})();
window.CLOCK = CLOCK;
// ---- personal protective equipment (PSA): taken once from the board in the workshop, then put on and off in its window (anywhere) ----
const GEAR = (() => {
  const LSK = 'pav-gear-v1';
  const IT = {
    brille: { slot: 'eyes', n: 'Schutzbrille', d: 'EN 166: gegen Späne und Splitter an Säge, Hobel und Schleifer.' },
    korb: { slot: 'eyes', n: 'Korbbrille (dicht)', d: 'Dicht anliegend: gegen Ammoniakdampf beim Räuchern und gegen Spritzer.' },
    ohr: { slot: 'ears', n: 'Kapselgehörschutz', d: 'SNR 30 dB: Tischkreissäge und Dickenhobel erreichen 95–100 dB(A) – ab 85 dB(A) Pflicht.' },
    ffp2: { slot: 'resp', n: 'FFP2-Maske', d: 'Eichen- und Buchenholzstaub gilt als krebserzeugend – beim Schleifen immer, auch mit Absaugung.' },
    abek: { slot: 'resp', n: 'Halbmaske ABEK1', d: 'Der grüne Filterteil K hält Ammoniak zurück – nur damit ans offene Räucherzelt.' },
    nitril: { slot: 'hands', n: 'Nitrilhandschuhe', d: 'Gegen Ammoniak, Leim und Öl auf der Haut. Nie an Maschinen mit drehendem Werkzeug – sie können eingezogen werden.' } };
  const SLOTS = ['eyes', 'ears', 'resp', 'hands'];
  const S = { have: false, on: { eyes: null, ears: null, resp: null, hands: null } };
  try { const s = JSON.parse(localStorage.getItem(LSK) || 'null'); if (s) { S.have = !!s.have; for (const k of SLOTS) if (s.on && IT[s.on[k]] && IT[s.on[k]].slot === k) S.on[k] = s.on[k]; } } catch (e) {}
  const save = () => { try { localStorage.setItem(LSK, JSON.stringify({ have: S.have, on: S.on })); } catch (e) {} };
  const worn = id => !!IT[id] && S.on[IT[id].slot] === id;
  // req: list of ids; 'a|b' = one of them
  const missing = req => (req || []).filter(r => !r.split('|').some(worn)).map(r => r.split('|').map(id => IT[id].n).join(' oder '));
  function wear(id, v) { const it = IT[id]; if (!it) return; if (v === undefined) v = !worn(id); if (v) S.on[it.slot] = id; else if (worn(id)) S.on[it.slot] = null; SFX.cloth(); changed(); }
  function changed() { save(); try { if (window.AVATAR && AVATAR.wear) AVATAR.wear(S.on); } catch (e) {} try { if (audio.muffle) audio.muffle(S.on.ears ? 1 : 0); } catch (e) {}
    const fx = $('gearfx'); if (fx) { fx.dataset.eyes = S.on.eyes || ''; fx.dataset.resp = S.on.resp || ''; }
    renderBtn(); renderWin(); if (window.WUI) WUI.refresh(); markDirty(); }
  const ICO = {
    eyes: '<svg viewBox="0 0 24 24"><path d="M3 10.5h18M4 10.5c0 3.4 1.6 5 4 5s3.2-1.8 4-3.4c.8 1.6 1.6 3.4 4 3.4s4-1.6 4-5"/></svg>',
    ears: '<svg viewBox="0 0 24 24"><path d="M5.5 13V11a6.5 6.5 0 0 1 13 0v2"/><rect x="3.5" y="12.5" width="4" height="7" rx="2"/><rect x="16.5" y="12.5" width="4" height="7" rx="2"/></svg>',
    resp: '<svg viewBox="0 0 24 24"><path d="M5 9.5c2.3-1.4 4.6-2 7-2s4.7.6 7 2c-.4 5.2-3.2 8.5-7 8.5S5.4 14.7 5 9.5Z"/><path d="M8.5 12.5h7"/></svg>',
    hands: '<svg viewBox="0 0 24 24"><path d="M8 20v-5.5L5.6 11a1.4 1.4 0 0 1 2.3-1.6L9 11V5.2a1.3 1.3 0 0 1 2.6 0V10V4.4a1.3 1.3 0 0 1 2.6 0V10V5.6a1.3 1.3 0 0 1 2.6 0V14c0 3-1.6 6-4.6 6Z"/></svg>' };
  const btn = $('gearbtn'), win = $('gearwin');
  function renderBtn() { if (!btn) return; btn.hidden = !S.have; const on = SLOTS.filter(k => S.on[k]);
    btn.querySelector('.gi').innerHTML = on.length ? on.map(k => `<i class="g-${k}">${ICO[k]}</i>`).join('') : `<i class="g-off">${ICO.eyes}</i>`;
    btn.querySelector('.hbt').textContent = on.length ? 'PSA' : 'PSA ab'; btn.setAttribute('aria-label', 'Schutzausrüstung: ' + (on.length ? on.map(k => IT[S.on[k]].n).join(', ') : 'nichts angelegt')); }
  function renderWin() { if (!win || win.hidden) return;
    let h = '<h3>Schutzausrüstung<button type="button" class="x" aria-label="Schließen">×</button></h3>';
    if (!S.have) h += '<p class="gnote">Deine Schutzausrüstung hängt am PSA-Brett in der Werkstatt (Rückwand, neben dem Holzregal).</p>';
    else { h += '<div class="gl">' + Object.entries(IT).map(([id, it]) => `<button type="button" class="gitem${worn(id) ? ' on' : ''}" data-g="${id}" aria-pressed="${worn(id)}"><i>${ICO[it.slot]}</i><span><b>${it.n}</b><small>${it.d}</small></span><em>${worn(id) ? 'angelegt' : 'anlegen'}</em></button>`).join('') + '</div>';
      h += '<p class="gnote">Säge und Hobel: Schutzbrille und Gehörschutz, keine Handschuhe. Schleifen: dazu die FFP2-Maske. Räuchern: Korbbrille, ABEK-Halbmaske, Nitrilhandschuhe.</p>'; }
    win.innerHTML = h; win.querySelector('.x').addEventListener('click', () => setWin(false));
    win.querySelectorAll('[data-g]').forEach(b => b.addEventListener('click', () => wear(b.dataset.g))); }
  function setWin(v) { if (!win) return; win.hidden = !v; if (v) { if (window.HUD) HUD.unlock(); renderWin(); } }
  btn?.addEventListener('click', () => { setWin(win.hidden); btn.blur(); });
  whenLoaded(() => setTimeout(changed, 1200));
  renderBtn();
  return { IT, worn, missing, wear, get have() { return S.have; }, give() { if (!S.have) { S.have = true; changed(); } }, on: S.on, setWin, get winOpen() { return !!(win && !win.hidden); },
    reset() { S.have = false; for (const k of SLOTS) S.on[k] = null; changed(); setWin(false); },
    // a check before work: false (and a thought) when something is missing; gloves are refused at machines with rotating tools
    check(req, noGloves, what) { if (noGloves && S.on.hands) { PLAY.think('Handschuhe aus! An der ' + (what || 'Maschine') + ' können sie vom Werkzeug eingezogen werden.', 4200); return false; }
      const m = missing(req); if (!m.length) return true; PLAY.think((S.have ? 'Erst ' : 'Erst die Schutzausrüstung vom PSA-Brett holen: ') + m.join(', ') + (S.have ? ' anlegen (PSA oben rechts).' : '.'), 4600); return false; } };
})();
window.GEAR = GEAR;
