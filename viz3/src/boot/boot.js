// ---------------- boot ----------------
// V16a: the light follows the game clock unless a fixed mood was chosen (new key: the old default 'gold' is not carried over)
// V16b4: every start step on its own – one that throws (a saved setting this version does not expect, a driver quirk) is logged and shown
// under the loading text, the others and the GPU preparation still run (before, the rest of the start was skipped and the page stayed at
// „Modell wird aufgebaut …“ for ever)
import { SAVE } from '../core/save.js';
import { $, cam, OFFLINE, QS, R, scene, VARIANT } from '../core/head.js';
import { KERN } from '../core/kern.js';
import { DIRTY, LOAD, LOADLOG, markDirty, SV, VEG, whenLoaded } from '../core/assets.js';
import { MAT } from '../core/mats.js';
import { COL, WALK } from '../core/geo.js';
import { sunFollow } from '../garden/env.js';
import { GLINFO, prepareGPU, RENDER, renderFrame, setQuality } from '../render/render.js';
import { adaptExposure, MODES, setMode } from '../render/modes.js';
import { DKEYS, DOOR, EYE, floorAt, nearDoor, P, PHASE, setDoorNow, setPhase, toggleDoor } from '../game/walkable.js';
import { CAM3, go, placeName, setView3 } from '../game/player.js';
import { applyCam, cam3Update, resize } from '../game/camera.js';
import { look, qualLabel, setCollide } from '../game/input.js';
import { audio, setSound, soundLabel, toast } from '../audio/audio.js';
import { PHASES } from '../pavilion/phases.js';
import { setVariant } from '../pavilion/variant.js';
import { perfTest } from '../render/perf.js';
import { PLAY } from '../game/play.js';
import { VEH } from '../vehicles/vehicle.js';
import { frame, physics } from '../game/game.js';
import { REPORT } from './report.js';
const bootStep = (name, f) => {
  try {
    f();
  } catch (e) {
    console.error('Start: ' + name, e);
    LOADLOG.err('Start (' + name + '): ' + ((e && e.message) || e));
  }
};
let l0 = 'auto';
try {
  l0 = SAVE.raw('pav-light2') || l0;
} catch (e) {}
if (!MODES[l0] && l0 !== 'auto' && l0 !== 'night') l0 = 'auto';
bootStep('Licht', () => {
  try {
    setMode(l0);
  } catch (e) {
    LOADLOG.err('Licht „' + l0 + '“: ' + ((e && e.message) || e));
    l0 = 'auto';
    try {
      SAVE.setRaw('pav-light2', 'auto');
    } catch (e2) {}
    setMode('auto');
  }
  document
    .querySelectorAll('[data-light]')
    .forEach(x => x.setAttribute('aria-pressed', x.dataset.light === l0 ? 'true' : 'false'));
  if (l0 !== 'auto' && l0 !== 'night') audio.setTime(l0);
});
bootStep('Größe', () => resize());
bootStep('Variante', () => setVariant(VARIANT, { save: false }));
bootStep('Ansicht', () => go('modell'));
bootStep('Kollision', () => setCollide(true));
bootStep('Ton', () => soundLabel());
bootStep('Grafikstufe', () => qualLabel());
bootStep('Bauphase', () => setPhase(PHASES.length - 1));
bootStep('Luken', () => {
  for (const k of ['hatch', 'roofhatch']) setDoorNow(k, true);
}); // the trapdoor and the roof hatch usually stand open
requestAnimationFrame(frame);
// phase 2: ?szenario=name starts in a situation a feature registered (KERN.scenario, core/kern.js) – once the model is up
{
  const sz = QS.get('szenario');
  if (sz)
    KERN.until(() => LOAD.ready, 3600).then(
      () =>
        setTimeout(() => {
          const s = KERN.scenario(sz);
          if (!s)
            return LOADLOG.err(
              'Szenario „' +
                sz +
                '“ gibt es nicht (' +
                KERN.scenarios()
                  .map(x => x.name)
                  .join(', ') +
                ')'
            );
          try {
            s.run();
            KERN.emit('scenario', { name: sz });
          } catch (e) {
            LOADLOG.err('Szenario ' + sz + ': ' + ((e && e.message) || e));
          }
        }, 400),
      () => {}
    );
}
const hideLoading = () => {
  const ld = $('loading');
  if (ld) ld.hidden = true;
  const li = $('loadinfo');
  if (li) li.remove();
  LOAD.ready = true;
  window.PAV_LOADED = true;
  LOADLOG.end();
  markDirty(true);
  qualLabel();
};
// V16b5: an error after loading (in a frame, a click) no longer covers the model with „konnte nicht geladen werden“ (build.py says that only
// while loading, game.js keeps the frames going): the model runs on, the error is in the log (pav-loadlog) and named now and then
{
  let shownT = -1e9;
  window.addEventListener('error', e => {
    const m = String(e.message || (e.error && e.error.message) || '');
    if (!window.PAV_LOADED || /ResizeObserver|^Script error/i.test(m)) return;
    const now = performance.now();
    if (now - shownT < 30000) return;
    shownT = now;
    toast(
      'Kurzer Fehler im Modell (' +
        (m.replace(/^Uncaught\s*/, '').slice(0, 90) || 'unbekannt') +
        ') – es läuft weiter. Falls etwas hängt: Seite neu laden.',
      7000
    );
  });
}
const sayLoading = t => {
  LOAD.alive = performance.now();
  LOADLOG.note(t);
  const ld = $('loading');
  if (ld && !ld.hidden && ld.textContent !== t) ld.textContent = t;
};
// V16b4: under the loading text – the seconds since the start (when they stand still, one step keeps the page busy), where the last attempt
// stopped if it did not finish (crash or hang), and after 25 s (or with ?diag=1) the last steps of the load log; „Protokoll“ shows all of it
{
  const ld = $('loading');
  if (ld && !OFFLINE) {
    const el = document.createElement('div'),
      t0 = performance.now(),
      diag = /[?&]diag=1/.test(location.search);
    let all = false;
    el.id = 'loadinfo';
    el.style.cssText =
      'position:absolute;left:50%;transform:translateX(-50%);bottom:calc(16px + env(safe-area-inset-bottom,0px));z-index:6;width:min(620px,calc(100% - 24px));max-height:46%;overflow:auto;font:400 11.5px/1.45 var(--f-mono);color:var(--muted);text-align:center';
    ld.parentNode.appendChild(el);
    const line = (txt, strong) => {
      const d = document.createElement('div');
      d.textContent = txt;
      if (strong) d.style.color = 'var(--ink)';
      el.appendChild(d);
    };
    const P0 = LOADLOG.prev,
      prev =
        P0 && P0.steps && P0.steps.length
          ? 'Der letzte Ladeversuch' +
            (P0.at ? ' (vor ' + Math.max(1, Math.round((Date.now() - P0.at) / 60000)) + ' min)' : '') +
            ' brach ab bei „' +
            P0.steps[P0.steps.length - 1][1] +
            '“ nach ' +
            Math.round(P0.t / 1000) +
            ' s.'
          : '';
    if (P0) LOADLOG.note('vorheriger Versuch offen: ' + (prev || '?'), true);
    const draw = () => {
      const s = Math.round((performance.now() - t0) / 1000);
      el.textContent = '';
      line(s + ' s');
      if (prev) line(prev, true);
      if (!LOAD.allIn && s > 20 && LOAD.pending && LOAD.pending.size) {
        const now = performance.now(),
          slow = [...LOAD.pending]
            .filter(([u, t]) => now - t > 15000)
            .map(([u]) => String(u).split('?')[0].split('/').slice(-2).join('/'));
        if (slow.length) {
          line(
            'Noch nicht da: ' + slow.slice(0, 3).join(', ') + (slow.length > 3 ? ' (+' + (slow.length - 3) + ')' : ''),
            true
          );
          if (!el.dataset.slow) {
            el.dataset.slow = '1';
            LOADLOG.note('wartet auf: ' + slow.slice(0, 4).join(', '), true);
          }
        }
      }
      for (const e of LOADLOG.errs.slice(-3)) line('Fehler: ' + e.slice(0, 160), true);
      if (diag || all || s > 25) {
        const st = all ? LOADLOG.steps : LOADLOG.steps.slice(-6);
        for (const x of st) line((x[0] / 1000).toFixed(1) + ' s  ' + x[1]);
        if (all) {
          line(String(window.GLINFO ? GLINFO.renderer : '') + ' · ' + navigator.userAgent.slice(0, 110));
        }
        const b = document.createElement('button');
        b.textContent = all ? 'weniger' : 'Protokoll';
        b.style.cssText =
          'margin-top:6px;border:1px solid var(--line);background:var(--plate);color:var(--ink);border-radius:999px;font:500 12px/1 var(--f-body);padding:7px 11px;cursor:pointer';
        b.onclick = () => {
          all = !all;
          draw();
        };
        el.appendChild(b);
        const rb = document.createElement('button'); // the whole report to copy or to report on GitHub (boot/report.js)
        rb.textContent = 'Bericht';
        rb.style.cssText = b.style.cssText + ';margin-left:6px';
        rb.onclick = () => REPORT.show();
        el.appendChild(rb);
      }
    };
    const iv = setInterval(() => {
      if (LOAD.ready || ld.hidden) {
        clearInterval(iv);
        el.remove();
        return;
      }
      draw();
    }, 1000);
    draw();
  }
}
// show the model only when every shader is compiled and every texture is on the GPU – otherwise the first minute stutters
// V16b2: without a graphics card (software rendering) say once per visit why it is slow and what helps
const softHint = () => {
  if (!window.GLINFO || !GLINFO.soft || OFFLINE) return;
  let seen = false;
  try {
    seen = sessionStorage.getItem('pav-soft') === '1';
    sessionStorage.setItem('pav-soft', '1');
  } catch (e) {}
  if (seen) return;
  setTimeout(
    () =>
      toast(
        'Dieser Browser zeichnet ohne Grafikkarte (Software-Grafik' +
          (/basic render/i.test(GLINFO.renderer) ? ': „Microsoft Basic Render Driver“' : '') +
          '), deshalb läuft das Modell auf „schnell“ und eher ruckelig. Abhilfe: in Chrome unter Einstellungen → System „Grafikbeschleunigung verwenden, wenn verfügbar“ einschalten und den Browser neu starten – oder den Grafiktreiber aktualisieren.',
        15000
      ),
    2500
  );
};
whenLoaded(() => {
  LOAD.prepStart = performance.now();
  prepareGPU(sayLoading)
    .catch(e => console.warn('prepare', e))
    .then(() => {
      hideLoading();
      softHint();
    });
});
// the browser may drop the GPU context (driver reset, too little memory): say so instead of a frozen picture; three.js rebuilds it
// V16b4: lost while loading – logged (the next visit then loads the light way); restored while loading – open at once, the frames upload what
// is missing; not restored after 15 s – say what happened and what helps
let glLost = 0;
R.domElement.addEventListener(
  'webglcontextlost',
  () => {
    glLost = performance.now();
    LOADLOG.err('WebGL-Kontext verloren' + (LOAD.ready ? '' : ' beim Laden'));
    const ld = $('loading');
    if (ld) {
      ld.hidden = false;
      ld.textContent = 'Die Grafik wurde vom Browser zurückgesetzt – sie wird neu aufgebaut …';
    }
    setTimeout(() => {
      const l2 = $('loading');
      if (glLost && R.getContext().isContextLost() && l2 && !l2.hidden)
        l2.textContent =
          'Die Grafik des Browsers ist abgestürzt (vermutlich zu wenig Grafikspeicher). Bitte die Seite neu laden – der nächste Versuch lädt sparsamer.';
    }, 15000);
  },
  false
);
R.domElement.addEventListener(
  'webglcontextrestored',
  () => {
    glLost = 0;
    LOADLOG.note('Grafik wiederhergestellt', true);
    const ld = $('loading');
    if (ld && LOAD.ready) ld.hidden = true;
    else if (LOAD.finished) hideLoading();
    markDirty(true);
  },
  false
);
// V16b3: the page opens by itself only when nothing has moved for two minutes (a stuck driver) – never in the middle of a running step
// (the old fixed 90 s opened it while shaders were still compiling: every frame then waited for them and the page froze)
LOAD.alive = performance.now();
{
  const iv = setInterval(() => {
    if (LOAD.ready) {
      clearInterval(iv);
      return;
    }
    if (performance.now() - LOAD.alive > (OFFLINE ? 900000 : 120000)) {
      clearInterval(iv);
      console.warn('loading: no progress for 2 min, opening');
      hideLoading();
    }
  }, 5000);
}
window.GAME = {
  R,
  scene,
  cam,
  MAT,
  MODES,
  PHASES,
  setPhase,
  phase: () => PHASE,
  P,
  go,
  DOOR,
  toggleDoor,
  floorAt,
  setCollide,
  nearDoor,
  setMode,
  setQuality,
  audio,
  setSound,
  COL,
  WALK,
  RENDER,
  SV,
  MERGED: window.MERGED,
  setVariant,
  variant: () => VARIANT,
  perfTest,
  GEO,
  render: () => markDirty(),
  loaded: () => !!LOAD.ready,
  assetsLoaded: () => LOAD.finished,
  perf: () => ({
    tier: RENDER.tier,
    bench: RENDER.bench,
    prepMs: RENDER.prepMs,
    pr: R.getPixelRatio(),
    programs: R.info.programs.length,
  }),
  doorsAll: v => {
    for (const k of DKEYS()) setDoorNow(k, v);
  },
  setDoorNow,
  sim(f, turn, side, secs, run = 1) {
    for (let t = 0; t < secs - 1e-9; t += 0.025) physics(0.025, f, turn, side, run);
    return { x: +P.x.toFixed(2), y: +P.y.toFixed(2), feet: +P.feet.toFixed(2), where: placeName() };
  },
  shot() {
    applyCam();
    adaptExposure(0, true);
    if (DIRTY.shadow) {
      R.shadowMap.needsUpdate = true;
      DIRTY.shadow = false;
    }
    renderFrame();
  },
  film(dt, snap) {
    applyCam();
    if (window.VEG) VEG.update(cam.position);
    adaptExposure(dt, !!snap);
    if (DIRTY.shadow) {
      R.shadowMap.needsUpdate = true;
      DIRTY.shadow = false;
    }
    renderFrame();
  }, // one frame of a recorded film (test/tour.py)
  view(x, y, z, yaw, pitch, fov) {
    P.mode = 'walk';
    P.x = x;
    P.y = y;
    P.feet = z - EYE;
    sunFollow(x, y);
    P.yaw = yaw;
    P.pitch = pitch;
    document.body.dataset.mode = 'walk';
    applyCam();
    if (fov) {
      cam.fov = fov;
      cam.updateProjectionMatrix();
    }
  },
  step(secs, f = 0, turn = 0, side = 0, run = 1) {
    for (let t = 0; t < secs - 1e-9; t += 0.025) {
      physics(0.025, f, turn, side, run);
      if (P.mode === 'walk' && !(window.VEH && VEH.cur)) cam3Update(0.025);
      adaptExposure(0.025);
      KERN.update(0.025); // zones, borrowed lights, waits – as in the frame loop (game/game.js)
      for (const fn of window.TICKS || []) fn(0.025);
    }
    return {
      x: +P.x.toFixed(2),
      y: +P.y.toFixed(2),
      feet: +P.feet.toFixed(2),
      best: window.PLAY && PLAY.best ? PLAY.best.label() : null,
    };
  },
  CAM3,
  setView3,
  MOVE: window.MOVE,
  look,
  orbit(az, el, r, tgt) {
    P.mode = 'orbit';
    P.az = az;
    P.el = el;
    P.r = r;
    if (tgt) P.tgt = tgt;
    applyCam();
  },
};
