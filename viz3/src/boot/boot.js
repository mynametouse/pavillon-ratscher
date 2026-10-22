// ---------------- boot ----------------
// V16a: the light follows the game clock unless a fixed mood was chosen (new key: the old default 'gold' is not carried over)
let l0 = 'auto'; try { l0 = localStorage.getItem('pav-light2') || l0; } catch (e) {} if (!MODES[l0] && l0 !== 'auto' && l0 !== 'night') l0 = 'auto';
setMode(l0); document.querySelectorAll('[data-light]').forEach(x => x.setAttribute('aria-pressed', x.dataset.light === l0 ? 'true' : 'false')); if (l0 !== 'auto' && l0 !== 'night') audio.setTime(l0);
resize(); setVariant(VARIANT, { save: false }); go('modell'); setCollide(true); soundLabel(); qualLabel(); setPhase(PHASES.length - 1);
for (const k of ['hatch', 'roofhatch']) setDoorNow(k, true);   // the trapdoor and the roof hatch usually stand open
requestAnimationFrame(frame);
const hideLoading = () => { const ld = $('loading'); if (ld) ld.hidden = true; LOAD.ready = true; markDirty(true); qualLabel(); };
const sayLoading = t => { const ld = $('loading'); if (ld && !ld.hidden) ld.textContent = t; };
// show the model only when every shader is compiled and every texture is on the GPU – otherwise the first minute stutters
// V16b2: without a graphics card (software rendering) say once per visit why it is slow and what helps
const softHint = () => { if (!window.GLINFO || !GLINFO.soft || OFFLINE) return; let seen = false; try { seen = sessionStorage.getItem('pav-soft') === '1'; sessionStorage.setItem('pav-soft', '1'); } catch (e) {} if (seen) return;
  setTimeout(() => toast('Dieser Browser zeichnet ohne Grafikkarte (Software-Grafik' + (/basic render/i.test(GLINFO.renderer) ? ': „Microsoft Basic Render Driver“' : '') + '), deshalb läuft das Modell auf „schnell“ und eher ruckelig. Abhilfe: in Chrome unter Einstellungen → System „Grafikbeschleunigung verwenden, wenn verfügbar“ einschalten und den Browser neu starten – oder den Grafiktreiber aktualisieren.', 15000), 2500); };
whenLoaded(() => { LOAD.prepStart = performance.now(); prepareGPU(sayLoading).catch(e => console.warn('prepare', e)).then(() => { hideLoading(); softHint(); }); });
// the browser may drop the GPU context (driver reset, too little memory): say so instead of a frozen picture; three.js rebuilds it
R.domElement.addEventListener('webglcontextlost', () => { const ld = $('loading'); if (ld) { ld.hidden = false; ld.textContent = 'Die Grafik wurde vom Browser zurückgesetzt – sie wird neu aufgebaut …'; } }, false);
R.domElement.addEventListener('webglcontextrestored', () => { const ld = $('loading'); if (ld && LOAD.ready) ld.hidden = true; markDirty(true); }, false);
setTimeout(() => { if (!LOAD.ready) hideLoading(); }, OFFLINE ? 900000 : 90000);
window.GAME = { R, scene, cam, MAT, MODES, PHASES, setPhase, phase: () => PHASE, P, go, DOOR, toggleDoor, floorAt, setCollide, nearDoor, setMode, setQuality, audio, setSound, COL, WALK, RENDER, SV, MERGED: window.MERGED,
  setVariant, variant: () => VARIANT, perfTest, GEO, render: () => markDirty(), loaded: () => !!LOAD.ready, assetsLoaded: () => LOAD.finished, perf: () => ({ tier: RENDER.tier, bench: RENDER.bench, prepMs: RENDER.prepMs, pr: R.getPixelRatio(), programs: R.info.programs.length }), doorsAll: v => { for (const k of DKEYS()) setDoorNow(k, v); }, setDoorNow,
  sim(f, turn, side, secs, run = 1) { for (let t = 0; t < secs - 1e-9; t += 0.025) physics(0.025, f, turn, side, run); return { x: +P.x.toFixed(2), y: +P.y.toFixed(2), feet: +P.feet.toFixed(2), where: placeName() }; },
  shot() { applyCam(); adaptExposure(0, true); if (_shadowDirty) { R.shadowMap.needsUpdate = true; _shadowDirty = false; } renderFrame(); },
  film(dt, snap) { applyCam(); if (window.VEG) VEG.update(cam.position); adaptExposure(dt, !!snap); if (_shadowDirty) { R.shadowMap.needsUpdate = true; _shadowDirty = false; } renderFrame(); },   // one frame of a recorded film (test/tour.py)
  view(x, y, z, yaw, pitch, fov) { P.mode = 'walk'; P.x = x; P.y = y; P.feet = z - EYE; sunFollow(x, y); P.yaw = yaw; P.pitch = pitch; document.body.dataset.mode = 'walk'; applyCam(); if (fov) { cam.fov = fov; cam.updateProjectionMatrix(); } },
  step(secs, f = 0, turn = 0, side = 0, run = 1) { for (let t = 0; t < secs - 1e-9; t += 0.025) { physics(0.025, f, turn, side, run); if (P.mode === 'walk' && !(window.VEH && VEH.cur)) cam3Update(0.025); adaptExposure(0.025); for (const fn of (window.TICKS || [])) fn(0.025); } return { x: +P.x.toFixed(2), y: +P.y.toFixed(2), feet: +P.feet.toFixed(2), best: window.PLAY && PLAY.best ? PLAY.best.label() : null }; },
  CAM3, setView3, MOVE: window.MOVE, look,
  orbit(az, el, r, tgt) { P.mode = 'orbit'; P.az = az; P.el = el; P.r = r; if (tgt) P.tgt = tgt; applyCam(); } };
