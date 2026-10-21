// ---------------- construction phase UI ----------------
const fmtE = v => v.toLocaleString('de-DE', { maximumFractionDigits: 0 }) + ' €';
const esc = t => String(t).replace(/[&<>]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]));
let ppTab = 'how';
function phaseLabel() { const p = PHASES[PHASE]; const n = $('ph-name'), sub = $('ph-sub'), r = $('ph-range'); if (n) n.textContent = p.name; if (sub) sub.textContent = `Phase ${PHASE} von ${PHASES.length - 1} · ${p.short}`; if (r) { r.max = PHASES.length - 1; if (+r.value !== PHASE) r.value = PHASE; }
  const pv = $('ph-prev'), nx = $('ph-next'); if (pv) pv.disabled = PHASE === 0; if (nx) nx.disabled = PHASE === PHASES.length - 1; renderPanel(); }
function renderPanel() { const pan = $('ppanel'); if (!pan || pan.hidden) return; const p = PHASES[PHASE];
  $('pp-title').textContent = `${PHASE}. ${p.name}`; $('pp-sub').textContent = `${p.short} · Aufwand ca. ${p.days} zu zweit`;
  pan.querySelectorAll('[data-pt]').forEach(b => b.setAttribute('aria-selected', b.dataset.pt === ppTab ? 'true' : 'false'));
  let h = '';
  if (ppTab === 'how') { h += '<h4>So wird gebaut</h4><ul>' + p.how.map(t => '<li>' + esc(t) + '</li>').join('') + '</ul>';
    if (p.check && p.check.length) h += '<h4>Statik und Prüfpunkte</h4><ul>' + p.check.map(t => '<li>' + esc(t) + '</li>').join('') + '</ul>'; }
  else if (ppTab === 'mat') { h += '<table><thead><tr><th>Material</th><th class="n">Menge</th></tr></thead><tbody>' + p.items.map(it => `<tr><td>${esc(it[0])}${it[1] ? '<div class="spec">' + esc(it[1]) + '</div>' : ''}</td><td class="n">${it[2].toLocaleString('de-DE')} ${esc(it[3])}</td></tr>`).join('') + '</tbody></table>';
    h += '<p class="note">Querschnitte als Breite/Höhe in cm (6/14 = 60 × 140 mm). KVH = Konstruktionsvollholz C24, technisch getrocknet; bei Eigenholz luftgetrocknet unter 18 % Holzfeuchte, sonst Schwund und Risse im Lehmputz.</p>'; }
  else { h += '<table><thead><tr><th>Position</th><th class="n">Kauf</th><th class="n">Eigenholz</th></tr></thead><tbody>' + p.items.map(it => { const k = it[2] * it[4], e = it[2] * (it[5] ?? it[4]); return `<tr><td>${esc(it[0])}</td><td class="n">${k ? fmtE(k) : '–'}</td><td class="n">${e ? fmtE(e) : '–'}</td></tr>`; }).join('') + `<tr class="sum"><td>Phase ${PHASE}</td><td class="n">${fmtE(p.kauf)}</td><td class="n">${fmtE(p.eigen)}</td></tr></tbody></table>`;
    const upK = PHASES.slice(0, PHASE + 1).reduce((s, q) => s + q.kauf, 0), upE = PHASES.slice(0, PHASE + 1).reduce((s, q) => s + q.eigen, 0), allK = PHASES.reduce((s, q) => s + q.kauf, 0), allE = PHASES.reduce((s, q) => s + q.eigen, 0);
    h += `<div class="tot"><span>Bis hierher (Phase 0–${PHASE})</span><b>${fmtE(upK)}</b><b>${fmtE(upE)}</b><span>Gesamt alle Phasen</span><b>${fmtE(allK)}</b><b>${fmtE(allE)}</b></div>`;
    h += '<p class="note">Netto-Richtwerte 2026 für Selbstbau, ohne Arbeitszeit, ±25 %. „Kauf“: alles aus dem Handel, Fenster fertig. „Eigenholz“: Lärche und Fichte aus dem eigenen Wald (Sägen, Trocknen, Hobeln mit ca. 25 % des Kaufpreises angesetzt), Fenster im Eigenbau mit gekauftem Isolierglas. Ohne Genehmigung, Statiker, Schornsteinfeger und Werkzeug.</p>'; }
  $('pp-body').innerHTML = h; }
$('ph-prev')?.addEventListener('click', () => setPhase(PHASE - 1)); $('ph-next')?.addEventListener('click', () => setPhase(PHASE + 1));
$('ph-range')?.addEventListener('input', e => setPhase(+e.target.value));
$('ph-info')?.addEventListener('click', () => { const pan = $('ppanel'); pan.hidden = !pan.hidden; $('ph-info').setAttribute('aria-expanded', pan.hidden ? 'false' : 'true'); renderPanel(); });
$('pp-close')?.addEventListener('click', () => { $('ppanel').hidden = true; $('ph-info').setAttribute('aria-expanded', 'false'); });
document.querySelectorAll('#ppanel [data-pt]').forEach(b => b.addEventListener('click', () => { ppTab = b.dataset.pt; renderPanel(); }));
window.addEventListener('keydown', e => { if (['INPUT', 'TEXTAREA', 'SELECT'].includes(document.activeElement?.tagName)) return; if (e.key === 'PageUp') { setPhase(PHASE + 1); e.preventDefault(); } if (e.key === 'PageDown') { setPhase(PHASE - 1); e.preventDefault(); } });
