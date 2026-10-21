// ===================== Draufsicht: plan view from above – move and turn the buildings, draw fences; the plan is kept per browser =====================
// and can be published for everyone (website: plan.json in the GitHub repo, written with the owner's token; every visitor loads it as the default).
const SITEPLAN = (() => {
  const BKEYS = Object.keys(BUILD);
  const S = { on: false, sel: null, fsel: null, drag: null, down: null, ptr: new Map(), pinch: null, draw: null, kind: 'mesh', trees: true, undo: [], published: null, warn: false, dirty: false };
  const PUB = { site: 'https://mynametouse.github.io/pavillon-ratscher/', repo: 'mynametouse/pavillon-ratscher', branch: 'gh-pages' };
  const ON_SITE = /github\.io$/i.test(location.hostname);
  const r2 = v => Math.round(v * 100) / 100, de = (v, d = 1) => (+v).toFixed(d).replace('.', ','), fmt = ts => new Date(ts).toLocaleString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  const LS = { get(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }, set(k, v) { try { localStorage.setItem(k, v); } catch (e) {} }, del(k) { try { localStorage.removeItem(k); } catch (e) {} } };
  // ---------- site state: building offsets and fences ----------
  const fenceSpec = f => { const o = { kind: f.kind, pts: f.pts.map(p => [r2(p[0]), r2(p[1])]), gate: f.gate != null ? r2(f.gate) : null }; if (f.builtin) { o.id = f.id; o.builtin = true; o.doorKey = f.doorKey; } return o; };
  const sameSpec = (a, b) => JSON.stringify([a.kind, a.pts, a.gate]) === JSON.stringify([b.kind, b.pts.map(p => [r2(p[0]), r2(p[1])]), b.gate != null ? r2(b.gate) : null]);
  function siteState() { const bld = {}; for (const k of BKEYS) { const B = BUILD[k]; if (B.dx || B.dy || B.da) bld[k] = { dx: r2(B.dx), dy: r2(B.dy), da: r2(B.da) }; }
    const isDef = FENCES.length === 1 && FENCES[0].builtin && sameSpec(fenceSpec(FENCES[0]), FENCE_DEFAULT);
    return { v: 1, bld, fences: isDef ? null : FENCES.map(fenceSpec) }; }
  // move a building; furniture added by hand that stands inside it moves along
  function moveBld(k, dx, dy, da) { const B = BUILD[k]; const R = bldRects(B); B.extra = PLANNER.ITEMS.filter(it => it.added && !it.removed && R.some(r => inRect(r, it.x, it.y)));
    bldSet(k, dx, dy, da); B.extra = null; }
  function applySite(st, { save = true } = {}) { st = st && st.v === 1 ? st : { v: 1, bld: {}, fences: null };
    for (const k of BKEYS) { const q = (st.bld || {})[k] || { dx: 0, dy: 0, da: 0 }, B = BUILD[k]; if (B.dx !== q.dx || B.dy !== q.dy || B.da !== q.da) moveBld(k, q.dx || 0, q.dy || 0, q.da || 0); }
    const want = st.fences || [FENCE_DEFAULT], have = FENCES.map(fenceSpec);
    if (JSON.stringify(have) !== JSON.stringify(want.map(fenceSpec))) { S.fsel = null; for (const f of FENCES.slice()) rmFence(f); for (const sp of want) mkFence(sp); }
    after(save); }
  function after(save = true) { rebuildGrids(); if (window.footHideApply) footHideApply(); if (save) { LS.set('pav-site', JSON.stringify(siteState())); if (window.PLANNER) PLANNER.saveLayout(); } changed(); selInfo(); drawOverlay(); markDirty(true); }
  function pushUndo() { S.undo.push(JSON.stringify(siteState())); if (S.undo.length > 40) S.undo.shift(); }
  function undo() { if (!S.undo.length) { toast('Nichts mehr rückgängig zu machen'); return; } applySite(JSON.parse(S.undo.pop())); }
  function changed() { S.dirty = true; updateShare(); }
  // ---------- whole plan (published or as text code): variant, facade, site, furniture ----------
  function fullState() { return { v: 1, ts: Date.now(), variant: VARIANT, facade: FACADE.state(), style: window.STYLE ? STYLE.state() : undefined, site: siteState(), layout: PLANNER.layoutState() }; }
  function applyFull(pl) { if (!pl || pl.v !== 1) return false;
    if (pl.variant && pl.variant !== VARIANT) setVariant(pl.variant);
    if (pl.facade) for (const t of ['house', 'tower', 'frame']) if (pl.facade[t] && pl.facade[t] !== FACADE.state()[t]) FACADE.apply(t, pl.facade[t]);
    if (pl.style && window.STYLE) STYLE.applyAll(pl.style);
    if (pl.site) applySite(pl.site);
    if (pl.layout) { LS.set('pav-layout', JSON.stringify(pl.layout)); PLANNER.applyLayout(pl.layout); }
    return true; }
  // ---------- picking ----------
  const _rc = new THREE.Raycaster(), _pl = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0), _v = new THREE.Vector3(), _p = new THREE.Vector3();
  function ndc(e) { const r = cv.getBoundingClientRect(); return new THREE.Vector2((e.clientX - r.left) / r.width * 2 - 1, -(e.clientY - r.top) / r.height * 2 + 1); }
  function ground(e) { applyCam(); cam.updateMatrixWorld(); _rc.setFromCamera(ndc(e), cam); return _rc.ray.intersectPlane(_pl, _v) ? [_v.x, -_v.z] : null; }
  function pickBld(e, gp) { _rc.setFromCamera(ndc(e), cam); const hits = _rc.intersectObjects(BKEYS.map(k => BUILD[k].root), true);
    for (const h of hits) { for (let o = h.object; o; o = o.parent) if (o.userData && o.userData.bldRoot) return o.userData.bldRoot; }
    if (gp) for (const k of BKEYS) if (bldRects(BUILD[k]).some(r => inRect(r, gp[0], gp[1]))) return k; return null; }
  function segDist(p, a, b) { const dx = b[0] - a[0], dy = b[1] - a[1], L2 = dx * dx + dy * dy || 1e-9; const t = Math.max(0, Math.min(1, ((p[0] - a[0]) * dx + (p[1] - a[1]) * dy) / L2)); return [Math.hypot(p[0] - a[0] - dx * t, p[1] - a[1] - dy * t), t]; }
  function pickFence(gp) { const tol = Math.max(0.35, wpp() * 10); let best = null;
    for (const f of FENCES) { let s = 0; for (let i = 0; i < f.pts.length - 1; i++) { const a = f.pts[i], b = f.pts[i + 1], L = Math.hypot(b[0] - a[0], b[1] - a[1]); const [d, t] = segDist(gp, a, b);
        if (d < tol && (!best || d < best.d)) best = { f, d, at: s + t * L }; s += L; } }
    return best; }
  const fenceLen = f => { let s = 0; for (let i = 0; i < f.pts.length - 1; i++) s += Math.hypot(f.pts[i + 1][0] - f.pts[i][0], f.pts[i + 1][1] - f.pts[i][1]); return s; };
  const wpp = () => P.th / Math.max(1, stage.clientHeight);   // metres per screen pixel on the ground
  // ---------- selection, checks ----------
  const PAV = { c: [2.95, 2], az: 90, hx: 3.95, hy: 3.05 };   // pavilion with cantilevers (and tower)
  function rectsOverlap(a, b) { const A = rectCorners(a), Bc = rectCorners(b);
    for (const poly of [A, Bc]) for (let i = 0; i < 4; i++) { const p = poly[i], q = poly[(i + 1) % 4], nx = q[1] - p[1], ny = p[0] - q[0];
      const pa = A.map(c => c[0] * nx + c[1] * ny), pb = Bc.map(c => c[0] * nx + c[1] * ny); if (Math.max(...pa) < Math.min(...pb) || Math.max(...pb) < Math.min(...pa)) return false; }
    return true; }
  function checks(k) { const B = BUILD[k], R = bldRects(B), out = []; let warn = false;
    const hit = []; if (R.some(r => rectsOverlap(r, PAV))) hit.push('Pavillon');
    for (const o of BKEYS) if (o !== k && bldRects(BUILD[o]).some(q => R.some(r => rectsOverlap(r, q)))) hit.push(BUILD[o].short);
    if (hit.length) { out.push('überschneidet ' + hit.join(', ')); warn = true; }
    const G = S0.garden; let dmin = 1e9, outside = false;
    for (const r of R) for (const c of rectCorners(r)) { if (!inPoly(c[0], c[1], G)) outside = true; for (let i = 0; i < G.length; i++) dmin = Math.min(dmin, segDist(c, G[i], G[(i + 1) % G.length])[0]); }
    if (outside) { out.push('ragt über die Grundstücksgrenze'); warn = true; } else out.push('Abstand zur Grenze ' + de(dmin) + ' m');
    let wet = false; for (const r of R) { const cs = rectCorners(r); for (const p of [...cs, r.c, ...cs.map((c, i) => [(c[0] + cs[(i + 1) % 4][0]) / 2, (c[1] + cs[(i + 1) % 4][1]) / 2])]) if (STREAM.inDitch(p[0], p[1], 0)) wet = true; }
    if (wet) { out.push('steht im Bachgraben'); warn = true; }
    const trees = S0.trees.filter(t => R.some(r => inRect(r, t[0], t[1], 0.3))).length; if (trees) { out.push(trees === 1 ? '1 Baum im Weg' : trees + ' Bäume im Weg'); warn = true; }
    return { text: out.join(' · '), warn }; }
  function selInfo() { const nm = $('sb-name'), bg = $('sb-bld'), fg = $('sb-fence'), dg = $('sb-draw'), mg = $('sb-main'), wn = $('sb-warn'); if (!nm) return;
    bg.hidden = !S.sel || !!S.draw; fg.hidden = !S.fsel || !!S.draw; dg.hidden = !S.draw; mg.hidden = !!S.draw; S.warn = false; $('sitebar').dataset.sel = (S.sel || S.fsel) && !S.draw ? '1' : '';
    if (S.draw) { const n = S.draw.pts.length; let L = 0; for (let i = 1; i < n; i++) L += Math.hypot(S.draw.pts[i][0] - S.draw.pts[i - 1][0], S.draw.pts[i][1] - S.draw.pts[i - 1][1]);
      nm.textContent = n ? `Zaun: ${n} Punkte, ${de(L)} m – weiter antippen, Doppelklick oder „Fertig“ beendet` : 'Zaun ziehen: Anfangspunkt antippen';
      dg.querySelectorAll('[data-sa^="kind-"]').forEach(b => b.setAttribute('aria-pressed', b.dataset.sa === 'kind-' + S.kind ? 'true' : 'false')); wn.hidden = true; return; }
    if (S.sel) { const B = BUILD[S.sel], c = checks(S.sel); S.warn = c.warn; nm.textContent = B.label + (B.dims ? ` · ${de(B.dims[0])} × ${de(B.dims[1])} m` : '');
      const set = (id, v) => { const el = $(id); if (el && document.activeElement !== el) el.value = v; }; set('sb-dx', r2(B.dx)); set('sb-dy', r2(B.dy)); set('sb-da', r2(-B.da || 0));
      wn.hidden = false; wn.textContent = c.text; wn.classList.toggle('bad', c.warn); return; }
    if (S.fsel) { const f = S.fsel.f; nm.textContent = `${FENCE_KINDS[f.kind].label}, ${de(fenceLen(f))} m${f.gate != null ? ', mit Tür' : ''}`; $('sb-gate').textContent = f.gate != null ? 'Tür entfernen' : 'Tür hier'; wn.hidden = true; return; }
    nm.textContent = stage.clientWidth < 560 ? 'Gebäude ziehen oder antippen · Zaun antippen' : 'Gebäude ziehen zum Verschieben, antippen zum Drehen · Zaun antippen zum Bearbeiten'; wn.hidden = true; }
  function select(k) { S.sel = k; S.fsel = null; selInfo(); drawOverlay(); markDirty(); }
  function turnSel(deg) { if (!S.sel) return; const B = BUILD[S.sel]; pushUndo(); moveBld(S.sel, B.dx, B.dy, r2(B.da - deg)); after(); }
  function setFromInputs() { if (!S.sel) return; const B = BUILD[S.sel], n = id => { const v = parseFloat(String($(id).value).replace(',', '.')); return isFinite(v) ? v : 0; };
    const dx = THREE.MathUtils.clamp(n('sb-dx'), -80, 80), dy = THREE.MathUtils.clamp(n('sb-dy'), -80, 80), da = -n('sb-da'); if (dx === B.dx && dy === B.dy && da === B.da) return; pushUndo(); moveBld(S.sel, dx, dy, da); after(); }
  // ---------- fences ----------
  function replaceFence(f, spec) { const i = FENCES.indexOf(f); rmFence(f); const nf = mkFence(spec); if (nf && i >= 0) { FENCES.splice(FENCES.indexOf(nf), 1); FENCES.splice(i, 0, nf); } return nf; }
  function toggleGate() { if (!S.fsel) return; const f = S.fsel.f, sp = Object.assign(fenceSpec(f), { doorKey: f.doorKey, builtin: f.builtin, id: f.id }); const L = fenceLen(f);
    if (f.gate != null) sp.gate = null; else { if (L < 1.4) { toast('Für eine Tür ist der Zaun zu kurz'); return; } sp.gate = THREE.MathUtils.clamp(S.fsel.at, 0.6, L - 0.6); }
    pushUndo(); const nf = replaceFence(f, sp); S.fsel = nf ? { f: nf, at: S.fsel.at } : null; after(); }
  function deleteFence() { if (!S.fsel) return; pushUndo(); rmFence(S.fsel.f); S.fsel = null; after(); toast('Zaun entfernt (Rückgängig holt ihn zurück)'); }
  function startDraw() { S.sel = null; S.fsel = null; S.draw = { pts: [], hover: null }; selInfo(); drawOverlay(); }
  function snap(p) { const tol = Math.max(0.3, wpp() * 9); let best = null, bd = tol;
    const cands = []; for (const f of FENCES) { cands.push(f.pts[0], f.pts[f.pts.length - 1]); } for (const g of S0.garden) cands.push(g); if (S.draw && S.draw.pts.length > 2) cands.push(S.draw.pts[0]);
    for (const c of cands) { const d = Math.hypot(c[0] - p[0], c[1] - p[1]); if (d < bd) { bd = d; best = c; } }
    return best ? [best[0], best[1]] : [Math.round(p[0] * 20) / 20, Math.round(p[1] * 20) / 20]; }
  function finishDraw() { const D = S.draw; if (!D) return; S.draw = null; if (D.pts.length >= 2) { pushUndo(); const f = mkFence({ kind: S.kind, pts: D.pts }); S.fsel = f ? { f, at: fenceLen(f) / 2 } : null; after(); toast(`${FENCE_KINDS[S.kind].label} gesetzt, ${de(fenceLen(f))} m. „Tür hier“ setzt eine Gartentür an die angetippte Stelle.`, 5200); } else { selInfo(); drawOverlay(); } }
  // ---------- overlay (SVG): labels, outlines, the fence being drawn ----------
  const svg = $('topsvg'), sc = $('topscale');
  function pr(x, y, z = 0) { _p.copy(V(x, y, z)).project(cam); return [(_p.x + 1) / 2 * stage.clientWidth, (1 - _p.y) / 2 * stage.clientHeight]; }
  const poly = (pts, cls) => `<polygon class="${cls}" points="${pts.map(p => p[0].toFixed(1) + ',' + p[1].toFixed(1)).join(' ')}"/>`;
  const pline = (pts, cls) => `<polyline class="${cls}" points="${pts.map(p => p[0].toFixed(1) + ',' + p[1].toFixed(1)).join(' ')}"/>`;
  const txt = (p, s, cls) => `<text class="${cls}" x="${p[0].toFixed(1)}" y="${p[1].toFixed(1)}">${s}</text>`;
  function drawOverlay() { if (!svg) return; if (!S.on) { svg.innerHTML = ''; return; } const W = stage.clientWidth, H = stage.clientHeight; svg.setAttribute('viewBox', `0 0 ${W} ${H}`); cam.updateMatrixWorld(); let h = '';
    h += poly(S0.garden.map(p => pr(p[0], p[1], 0.05)), 'bound');
    if (S.sel) { const B = BUILD[S.sel]; if (B.dx || B.dy || B.da) for (const q of B.rects) h += poly(rectCorners({ c: q.c0, az: q.az0, hx: q.hx, hy: q.hy }).map(p => pr(p[0], p[1])), 'ghost');
      for (const r of bldRects(B)) h += poly(rectCorners(r).map(p => pr(p[0], p[1], 0.05)), S.warn ? 'out bad' : 'out'); }
    for (const f of FENCES) for (const L of (f.lines || [f.pts])) if (L.length > 1) h += pline(L.map(p => pr(p[0], p[1], 0.05)), 'fence ' + f.kind + (S.fsel && S.fsel.f === f ? ' on' : ''));
    for (const f of FENCES) if (f.gateSeg) { const [a, b] = f.gateSeg.map(p => pr(p[0], p[1], 0.05)); h += `<circle class="gate" cx="${((a[0] + b[0]) / 2).toFixed(1)}" cy="${((a[1] + b[1]) / 2).toFixed(1)}" r="4.5"/>`; }
    if (S.draw) { const pts = S.draw.pts.concat(S.draw.hover ? [S.draw.hover] : []); if (pts.length > 1) h += pline(pts.map(p => pr(p[0], p[1], 0.05)), 'draw');
      for (const p of S.draw.pts) { const q = pr(p[0], p[1], 0.05); h += `<circle class="dv" cx="${q[0].toFixed(1)}" cy="${q[1].toFixed(1)}" r="4"/>`; }
      if (pts.length > 1) { const a = pts[pts.length - 2], b = pts[pts.length - 1], q = pr((a[0] + b[0]) / 2, (a[1] + b[1]) / 2, 0.05); h += txt([q[0], q[1] - 8], de(Math.hypot(b[0] - a[0], b[1] - a[1])) + ' m', 'len'); } }
    const L = []; if (S.sel) L.push([S.sel, 'bl sel']); L.push(['_pav', 'bl pav']); for (const k of BKEYS.slice().sort((a, b) => BUILD[b].rects.reduce((s, q) => s + q.hx * q.hy, 0) - BUILD[a].rects.reduce((s, q) => s + q.hx * q.hy, 0))) if (k !== S.sel) L.push([k, 'bl']);
    const placed = [], W0 = stage.clientWidth, H0 = stage.clientHeight;
    const put = (p, s, cls, ang, fs = 12.5) => { const w = s.length * fs * 0.6 + 8, hh = fs * 0.75, r = [p[0] - w / 2, p[1] - hh, p[0] + w / 2, p[1] + hh]; if (r[2] < 0 || r[0] > W0 || r[3] < 0 || r[1] > H0) return false;
      if (!/sel/.test(cls) && placed.some(q => r[0] < q[2] && r[2] > q[0] && r[1] < q[3] && r[3] > q[1])) return false; placed.push(r);
      h += ang ? `<text class="${cls}" x="${p[0].toFixed(1)}" y="${p[1].toFixed(1)}" transform="rotate(${ang.toFixed(1)} ${p[0].toFixed(1)} ${p[1].toFixed(1)})">${s}</text>` : txt(p, s, cls); return true; };
    for (const [k, cls] of L) { if (k === '_pav') { put(pr(2.2, 2, 7.5), 'Pavillon', cls); continue; } const B = BUILD[k], R = bldRects(B); if (R.length) put(pr(R[0].c[0], R[0].c[1], 2.6), B.short, cls); }
    put(pr(-20, 2), 'Hubert', 'nb'); put(pr(24, -6), 'Ronald', 'nb');
    { const t = STREAM.TB + 16, q = STREAM.wpt(t, STREAM.cOff(t)); put(pr(q[0], q[1], -1), 'Bach', 'nb water'); }
    if (window.RATSCHER && RATSCHER.ready) RATSCHER.overlay(pr, put, W, H);   // places, hills, roads and water of the real surroundings
    svg.innerHTML = h;
    if (sc) { const m = wpp(); let L = 1; for (const c of [1, 2, 5, 10, 20, 50, 100, 200, 500, 1000, 2000, 5000]) { if (c / m >= 60) { L = c; break; } L = c; } sc.querySelector('i').style.width = (L / m).toFixed(0) + 'px'; sc.querySelector('span').textContent = L >= 1000 ? (L / 1000) + ' km' : L + ' m'; } }
  // ---------- enter / leave ----------
  function onMode(mode) { const on = mode === 'top'; if (on === S.on) return; S.on = on; document.body.dataset.top = on ? '1' : '';
    $('sitebar').hidden = !on; svg.toggleAttribute('hidden', !on); if (sc) sc.hidden = !on;
    { const M = MODES[MODE]; sunDir = on ? dirFromAz(205, 52) : dirFromAz(M.az, M.el); placeSun(V(sunC[0], sunC[1], 3)); if (window.giApply) giApply();
      sun.color.set(on ? 0xfff4e6 : M.sunC); sun.intensity = on ? 3.3 : M.sun;   // plan view: neutral midday light, not the evening glow
      if (scene.fog && scene.fog.isFogExp2) scene.fog.density = on ? 0 : M.fogD || 3e-5; if (window.RATSCHER && RATSCHER.topMode) RATSCHER.topMode(on); if (window.DN && DN.active) DN.update(true); }   // plan view: a high sun, short shadows (no baked light)
    if (on) { if (window.PLANNER && PLANNER.PLAN.on) PLANNER.setPlan(false); selInfo(); toast('Draufsicht: Gebäude ziehen zum Verschieben, antippen und ↺ ↻ zum Drehen. „Zaun ziehen“ setzt Punkt für Punkt einen Zaun. Mausrad / zwei Finger: Zoom' + (window.RATSCHER && RATSCHER.ready ? ' – ganz hinaus bis Ratscher und ins Tal, „Karte“ statt Luftbild.' : '.'), 7500); }
    else { S.draw = null; S.sel = null; S.fsel = null; S.drag = null; S.ptr.clear(); setTrees(true, false); }
    drawOverlay(); markDirty(true); }
  function onCam() { if (S.on) drawOverlay(); }
  function setTrees(v, remember = true) { if (remember) S.trees = v; if (window.TREEG) TREEG.visible = v; const b = document.querySelector('#sitebar [data-sa="trees"]'); if (b) b.setAttribute('aria-pressed', S.trees ? 'true' : 'false'); markDirty(true); }
  // ---------- pointer input in the plan view (capture: runs before the walk / orbit handlers and stops them) ----------
  const isTop = () => P.mode === 'top' && S.on;
  cv.addEventListener('pointerdown', e => { if (!isTop() || e.button > 0) return; e.stopImmediatePropagation(); try { cv.setPointerCapture(e.pointerId); } catch (er) {}
    S.ptr.set(e.pointerId, [e.clientX, e.clientY]);
    if (S.ptr.size === 2) { const [a, b] = [...S.ptr.values()]; S.pinch = { d: Math.hypot(a[0] - b[0], a[1] - b[1]), th: P.th, m: [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2] }; if (S.drag) { if (S.drag.started) { BUILD[S.drag.key].extra = null; after(); } S.drag = null; } S.down = null; return; }
    const gp = ground(e); S.down = { id: e.pointerId, x: e.clientX, y: e.clientY, t: performance.now(), gp, moved: false, last: [e.clientX, e.clientY] };
    if (S.draw || !gp) return;
    const k = pickBld(e, gp); if (k) { if (S.sel !== k) select(k); const B = BUILD[k]; S.drag = { key: k, gp0: gp, dx0: B.dx, dy0: B.dy, started: false }; } }, { capture: true });
  cv.addEventListener('pointermove', e => { if (!isTop()) return;
    if (!S.ptr.has(e.pointerId)) { if (S.draw && e.pointerType === 'mouse') { const gp = ground(e); if (gp) { S.draw.hover = snap(gp); drawOverlay(); } } return; }
    e.stopImmediatePropagation(); S.ptr.set(e.pointerId, [e.clientX, e.clientY]);
    if (S.ptr.size === 2 && S.pinch) { const [a, b] = [...S.ptr.values()], d = Math.hypot(a[0] - b[0], a[1] - b[1]), m = [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];
      P.th = THREE.MathUtils.clamp(S.pinch.th * S.pinch.d / Math.max(20, d), 14, TOPMAX()); const k = wpp(); P.tx -= (m[0] - S.pinch.m[0]) * k; P.ty += (m[1] - S.pinch.m[1]) * k; S.pinch.m = m; markDirty(); return; }
    const D = S.down; if (!D || D.id !== e.pointerId) return; const mv = Math.hypot(e.clientX - D.x, e.clientY - D.y); if (mv > 5) D.moved = true;
    if (S.drag && D.moved) { const gp = ground(e); if (!gp) return; const B = BUILD[S.drag.key]; if (!S.drag.started) { S.drag.started = true; pushUndo(); const R = bldRects(B); B.extra = PLANNER.ITEMS.filter(it => it.added && !it.removed && R.some(r => inRect(r, it.x, it.y))); }
      const dx = Math.round((S.drag.dx0 + gp[0] - S.drag.gp0[0]) * 20) / 20, dy = Math.round((S.drag.dy0 + gp[1] - S.drag.gp0[1]) * 20) / 20; if (dx !== B.dx || dy !== B.dy) { bldSet(S.drag.key, dx, dy, B.da); selInfo(); drawOverlay(); } return; }
    if (D.moved) { const k = wpp(); P.tx -= (e.clientX - D.last[0]) * k; P.ty += (e.clientY - D.last[1]) * k; D.last = [e.clientX, e.clientY]; markDirty(); }
    if (S.draw && e.pointerType !== 'mouse') { /* touch: no hover line while panning */ } }, { capture: true });
  const up = e => { if (!isTop() || !S.ptr.has(e.pointerId)) return; e.stopImmediatePropagation(); S.ptr.delete(e.pointerId); if (S.ptr.size < 2) S.pinch = null;
    const D = S.down; if (!D || D.id !== e.pointerId) return; S.down = null;
    if (S.drag) { const g = S.drag; S.drag = null; if (g.started) { BUILD[g.key].extra = null; after(); return; } }
    if (D.moved || performance.now() - D.t > 600 || e.type === 'pointercancel') return;
    // a tap
    const gp = ground(e); if (!gp) return;
    if (S.draw) { const p = snap(gp), L = S.draw.pts; if (L.length && Math.hypot(p[0] - L[L.length - 1][0], p[1] - L[L.length - 1][1]) < 0.05) return; L.push(p); if (L.length > 2 && p[0] === L[0][0] && p[1] === L[0][1]) { finishDraw(); return; } S.draw.hover = null; selInfo(); drawOverlay(); return; }
    if (pickBld(e, gp)) return;   // selected on pointerdown
    const fh = pickFence(gp); if (fh) { S.sel = null; S.fsel = { f: fh.f, at: fh.at }; selInfo(); drawOverlay(); markDirty(); return; }
    S.sel = null; S.fsel = null; selInfo(); drawOverlay(); markDirty(); };
  cv.addEventListener('pointerup', up, { capture: true }); cv.addEventListener('pointercancel', up, { capture: true });
  cv.addEventListener('dblclick', e => { if (isTop() && S.draw) { e.preventDefault(); const L = S.draw.pts; if (L.length > 2) { const a = L[L.length - 1], b = L[L.length - 2]; if (Math.hypot(a[0] - b[0], a[1] - b[1]) < 0.5) L.pop(); } finishDraw(); } });
  cv.addEventListener('wheel', e => { if (!isTop()) return; e.preventDefault(); e.stopImmediatePropagation(); const r = cv.getBoundingClientRect(), px = e.clientX - r.left - r.width / 2, py = e.clientY - r.top - r.height / 2, k0 = wpp();
    const gx = P.tx + px * k0, gy = P.ty - py * k0; P.th = THREE.MathUtils.clamp(P.th * Math.exp(e.deltaY * 0.0012), 14, TOPMAX()); const k1 = wpp(); P.tx = gx - px * k1; P.ty = gy + py * k1; markDirty(); }, { passive: false, capture: true });
  window.addEventListener('keydown', e => { if (!isTop() || ['INPUT', 'TEXTAREA', 'SELECT'].includes(document.activeElement?.tagName)) return; const k = e.key;
    if ((k === 'r' || k === 'R') && S.sel) { turnSel(e.shiftKey ? -15 : 15); e.preventDefault(); }
    else if ((k === 'Delete' || k === 'Backspace') && S.fsel) { deleteFence(); e.preventDefault(); }
    else if (k === 'Escape') { if (S.draw) { S.draw = null; selInfo(); drawOverlay(); } else select(null); }
    else if (k === 'Enter' && S.draw) finishDraw();
    else if ((k === 'z' || k === 'Z') && (e.ctrlKey || e.metaKey)) { undo(); e.preventDefault(); } });
  // ---------- toolbar ----------
  document.querySelectorAll('#sitebar [data-sa]').forEach(b => b.addEventListener('click', () => { const a = b.dataset.sa;
    if (a === 'rotl') turnSel(-15); else if (a === 'rotr') turnSel(15);
    else if (a === 'home' && S.sel) { pushUndo(); moveBld(S.sel, 0, 0, 0); after(); }
    else if (a === 'gate') toggleGate(); else if (a === 'fdel') deleteFence(); else if (a === 'desel') select(null);
    else if (a === 'draw') startDraw(); else if (a === 'finish') finishDraw(); else if (a === 'cancel') { S.draw = null; selInfo(); drawOverlay(); }
    else if (a === 'back' && S.draw) { S.draw.pts.pop(); selInfo(); drawOverlay(); }
    else if (a.startsWith('kind-')) { S.kind = a.slice(5); selInfo(); }
    else if (a === 'trees') setTrees(!S.trees);
    else if (a === 'undo') undo();
    else if (a === 'reset') { pushUndo(); applySite(null); select(null); toast('Gebäude und Zäune stehen wieder wie ursprünglich (Rückgängig holt deinen Stand zurück)', 5200); }
    else if (a === 'share') openShare(true);
    else if (a === 'done') go('modell'); }));
  for (const id of ['sb-dx', 'sb-dy', 'sb-da']) { const el = $(id); if (el) { el.addEventListener('change', setFromInputs); el.addEventListener('keydown', e => { if (e.key === 'Enter') { setFromInputs(); el.blur(); } e.stopPropagation(); }); } }
  // ---------- share: public link, publish for everyone (website), plan code ----------
  const tok = () => LS.get('pav-gh-token');
  function b64(s) { const u = new TextEncoder().encode(s); let bin = ''; for (let i = 0; i < u.length; i += 0x8000) bin += String.fromCharCode.apply(null, u.subarray(i, i + 0x8000)); return btoa(bin); }
  async function fetchPlan() { try { const r = await fetch('plan.json?t=' + Date.now(), { cache: 'no-store' }); if (!r.ok) return null; const j = await r.json(); return j && j.v === 1 && j.ts ? j : null; } catch (e) { return null; } }
  function shareMsg(t, bad) { const m = $('sh-msg'); if (m) { m.textContent = t; m.classList.toggle('bad', !!bad); m.hidden = !t; } }
  async function publish() { const T = tok(); if (!T) return; const pl = fullState(); const btn = $('sh-pub'); if (btn) btn.disabled = true; shareMsg('Wird veröffentlicht …');
    const api = `https://api.github.com/repos/${PUB.repo}/contents/plan.json`, H = { Authorization: 'Bearer ' + T, Accept: 'application/vnd.github+json' };
    try { let sha = null; const g = await fetch(api + '?ref=' + PUB.branch + '&t=' + Date.now(), { headers: H, cache: 'no-store' });
      if (g.status === 200) sha = (await g.json()).sha; else if (g.status === 401) throw new Error('auth'); else if (g.status !== 404) throw new Error('http ' + g.status);
      const body = { message: 'Planstand vom ' + fmt(pl.ts), content: b64(JSON.stringify(pl, null, 1) + '\n'), branch: PUB.branch }; if (sha) body.sha = sha;
      const r = await fetch(api, { method: 'PUT', headers: Object.assign({ 'Content-Type': 'application/json' }, H), body: JSON.stringify(body) });
      if (r.status === 401) throw new Error('auth'); if (r.status === 403 || r.status === 404) throw new Error('perm'); if (!r.ok) throw new Error('http ' + r.status);
      S.published = pl; LS.set('pav-plan-ts', String(pl.ts)); S.dirty = false; shareMsg('Veröffentlicht. In ein, zwei Minuten sehen alle Besucher diesen Stand.'); }
    catch (e) { shareMsg(e.message === 'auth' ? 'Der Schlüssel wird nicht angenommen (falsch oder abgelaufen).' : e.message === 'perm' ? 'Der Schlüssel darf im Repo pavillon-ratscher nicht schreiben (Contents: Read and write fehlt).' : 'Hat nicht geklappt (' + e.message + '). Internetverbindung?', true); }
    if (btn) btn.disabled = false; updateShare(true); }
  function updateShare(keepMsg) { const box = $('sharebox'); if (!box || box.hidden) return; const pubTxt = S.published ? 'Veröffentlichter Stand: ' + fmt(S.published.ts) : 'Noch kein Planstand veröffentlicht – alle sehen den Grundstand.';
    const st = $('sh-state'); if (st) st.textContent = pubTxt; const rb = $('sh-revert'); if (rb) rb.hidden = !S.published; }
  function openShare(v) { const box = $('sharebox'); if (!box) return; box.hidden = !v; const b = $('sharebtn'); if (b) b.setAttribute('aria-pressed', v ? 'true' : 'false'); if (!v) return; buildShare(); }
  function buildShare() { const body = $('sh-body'); if (!body) return; const T = tok();
    let h = `<p>Öffentlicher Link, ohne Claude-Konto:<br><a href="${PUB.site}" target="_blank" rel="noopener">${PUB.site.replace('https://', '')}</a> <button type="button" id="sh-copy">Link kopieren</button></p>`;
    h += `<h4>Dein Planstand für alle</h4><p class="st" id="sh-state"></p>`;
    if (ON_SITE && T) h += `<p>Veröffentlicht, was du hier eingestellt hast: Variante, Fassade, Einrichtung, Gebäude und Zäune aus der Draufsicht, Möbel aus „Planen“.</p><div class="acts"><button type="button" class="acc" id="sh-pub">Für alle veröffentlichen</button><button type="button" id="sh-revert">Zurück zum veröffentlichten Stand</button></div><p class="small"><button type="button" class="lnk" id="sh-forget">Schlüssel in diesem Browser löschen</button></p>`;
    else if (ON_SITE) h += `<p>Zum Veröffentlichen einmal einen GitHub-Schlüssel hinterlegen. Er bleibt nur in diesem Browser.</p><ol><li><a href="https://github.com/settings/personal-access-tokens/new" target="_blank" rel="noopener">Neuen Schlüssel anlegen</a> (Fine-grained token), Ablauf nach Wunsch.</li><li>Repository access: <b>Only select repositories</b> → <b>pavillon-ratscher</b>.</li><li>Permissions → Repository → <b>Contents: Read and write</b>. Erzeugen, kopieren, hier einfügen:</li></ol><div class="acts"><input type="password" id="sh-tok" placeholder="github_pat_…" autocomplete="off"><button type="button" class="acc" id="sh-save">Speichern</button></div><div class="acts"><button type="button" id="sh-revert">Zurück zum veröffentlichten Stand</button></div>`;
    else h += `<p>Veröffentlichen geht auf der Website (dort mit deinem GitHub-Schlüssel). Deinen Stand von hier nimmst du mit dem Plan-Code mit: hier kopieren, dort einfügen.</p><div class="acts"><button type="button" id="sh-revert">Zurück zum veröffentlichten Stand</button></div>`;
    h += `<p class="msg" id="sh-msg" hidden></p><h4>Plan-Code</h4><p class="small">Der ganze Planstand als Text, zum Mitnehmen in einen anderen Browser oder zum Schicken.</p><div class="acts"><button type="button" id="sh-export">Plan-Code kopieren</button><button type="button" id="sh-import">Plan-Code einfügen</button></div><textarea id="sh-code" rows="4" hidden spellcheck="false"></textarea><div class="acts" id="sh-apply-row" hidden><button type="button" class="acc" id="sh-apply">Übernehmen</button></div>`;
    body.innerHTML = h; updateShare();
    const copy = (text, okMsg) => { const done = () => shareMsg(okMsg); try { navigator.clipboard.writeText(text).then(done, () => { showCode(text); shareMsg('Kopieren ging nicht – Text unten markieren und kopieren.'); }); } catch (e) { showCode(text); shareMsg('Text unten markieren und kopieren.'); } };
    const showCode = t => { const ta = $('sh-code'); ta.hidden = false; ta.value = t; ta.select(); };
    $('sh-copy').onclick = () => copy(PUB.site, 'Link kopiert.');
    $('sh-export').onclick = () => copy(JSON.stringify(fullState()), 'Plan-Code kopiert.');
    $('sh-import').onclick = () => { const ta = $('sh-code'); ta.hidden = false; ta.value = ''; ta.placeholder = 'Plan-Code hier einfügen'; ta.focus(); $('sh-apply-row').hidden = false; };
    $('sh-apply').onclick = () => { let pl = null; try { pl = JSON.parse($('sh-code').value.trim()); } catch (e) {} if (!pl || pl.v !== 1) { shareMsg('Das ist kein gültiger Plan-Code.', true); return; } pushUndo(); applyFull(pl); $('sh-apply-row').hidden = true; $('sh-code').hidden = true; shareMsg('Plan-Code übernommen.'); };
    const rv = $('sh-revert'); if (rv) rv.onclick = () => { if (!S.published) return; pushUndo(); applyFull(S.published); LS.set('pav-plan-ts', String(S.published.ts)); shareMsg('Veröffentlichter Stand geladen.'); };
    const pb = $('sh-pub'); if (pb) pb.onclick = publish;
    const fg = $('sh-forget'); if (fg) fg.onclick = () => { LS.del('pav-gh-token'); buildShare(); };
    const sv = $('sh-save'); if (sv) sv.onclick = async () => { const v = ($('sh-tok').value || '').trim(); if (!/^(github_pat_|ghp_)/.test(v)) { shareMsg('Das sieht nicht wie ein GitHub-Schlüssel aus (beginnt mit github_pat_).', true); return; }
      shareMsg('Prüfe den Schlüssel …'); try { const r = await fetch(`https://api.github.com/repos/${PUB.repo}`, { headers: { Authorization: 'Bearer ' + v, Accept: 'application/vnd.github+json' } }); if (r.status === 401) { shareMsg('Der Schlüssel wird nicht angenommen.', true); return; } } catch (e) { shareMsg('Keine Verbindung zu GitHub.', true); return; }
      LS.set('pav-gh-token', v); buildShare(); shareMsg('Gespeichert. Jetzt „Für alle veröffentlichen“.'); }; }
  { const b = $('sharebtn'); if (b) b.addEventListener('click', () => openShare($('sharebox').hidden)); const x = document.querySelector('#sharebox .x'); if (x) x.addEventListener('click', () => openShare(false)); }
  // ---------- start: this browser's plan, then the published plan if it is newer than the one this browser last took over ----------
  { let st = null; try { st = JSON.parse(LS.get('pav-site') || 'null'); } catch (e) {} if (st && st.v === 1) applySite(st, { save: false }); }
  fetchPlan().then(pl => { S.published = pl; if (pl) { const seen = +(LS.get('pav-plan-ts') || 0); if (pl.ts > seen) { applyFull(pl); LS.set('pav-plan-ts', String(pl.ts)); if (seen) toast('Neuer Planstand vom ' + fmt(pl.ts) + ' geladen.', 5000); } } S.dirty = false; updateShare(); });
  return { onMode, onCam, applySite, siteState, fullState, applyFull, select, changed, undo, S, PUB, ON_SITE, drawOverlay, setTrees, publish };
})();
window.SITEPLAN = SITEPLAN; window.GEOH = { V, bldRects, rectCorners, inRect, bldSet, mkFence, rmFence };   // for tests
