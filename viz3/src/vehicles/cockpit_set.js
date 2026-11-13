// ===================== feat/cockpit: the settings – graphics while moving, the frame-rate counter (CPSET) =====================
// Menü → Einstellungen → Grafik (shell/menu.html). Falko 13.11.2026 15:54: „… wenn ich fahre … dass dann die Grafik ein Stück weit reduziert
// wird … Ich möchte es zumindest optional ein- und ausschalten können oder die Stärke einstellen können“. While the view moves, frames come
// from a cheaper path (render/render.js MOTION: lower resolution, no ambient occlusion, no SMAA); „Beim Bewegen“ picks how much cheaper:
// Automatisch (the level follows the frame rate, as before – the default), Volle Qualität (no reduction), Leicht, Mittel, Stark. „Bildrate“
// shows a small counter of the frames drawn per second and the level while moving. Saved per browser (pav-cockpit-v1, core/save.js); the
// cockpit's own settings (mirrors, the corner map beside the navi) live in the same record.
//   CPSET.S → { mot, fps, mir, nav } · CPSET.mot(name) · CPSET.fps(on) · CPSET.MOT · CPSET.info() · CPSET.save() · CPSET.ui()
import { $, COARSE } from '../core/head.js';
import { SAVE } from '../core/save.js';
import { MLEVELS, MOTION, setMotionUser } from '../render/render.js';
export const CPSET = (() => {
  const KEY = 'pav-cockpit-v1';
  // the stages: a level of render/render.js MLEVELS (null: automatic), the name, one line of explanation
  const MOT = {
    auto: {
      lv: null,
      name: 'Automatisch',
      txt: 'passt sich der Bildrate an (Ziel: mindestens 50 Bilder je Sekunde)',
    },
    voll: {
      lv: 0,
      name: 'Volle Qualität',
      txt: 'auch in Bewegung jedes Bild mit allen Effekten – für starke Grafikkarten',
    },
    leicht: { lv: 1, name: 'Leicht', txt: 'in Bewegung ohne weiche Eckschatten und Kantenglättung, volle Auflösung' },
    mittel: { lv: 3, name: 'Mittel', txt: 'in Bewegung ohne Effekte, etwa drei Viertel der Auflösung' },
    stark: { lv: 5, name: 'Stark', txt: 'in Bewegung ohne Effekte, halbe Auflösung – für schwache Geräte' },
  };
  // mir: real mirrors (null: by device – on for computers, off for phones); nav: the corner map hides while the navi is in view;
  // odo: the estate's odometer (km, vehicles/cockpit.js)
  const S = { mot: 'auto', fps: false, mir: null, nav: true, odo: null };
  {
    // each field on its own: nonsense in one (test/savefuzz.py) leaves its default
    const v = SAVE.get(KEY);
    if (v && typeof v === 'object') {
      if (typeof v.mot === 'string' && Object.prototype.hasOwnProperty.call(MOT, v.mot)) S.mot = v.mot;
      if (typeof v.fps === 'boolean') S.fps = v.fps;
      if (typeof v.mir === 'boolean') S.mir = v.mir;
      if (typeof v.nav === 'boolean') S.nav = v.nav;
      if (typeof v.odo === 'number' && Number.isFinite(v.odo) && v.odo >= 0 && v.odo < 1e7) S.odo = v.odo;
    }
  }
  const save = () =>
    SAVE.set(KEY, {
      v: 1,
      mot: S.mot,
      fps: S.fps,
      mir: S.mir,
      nav: S.nav,
      odo: S.odo == null ? null : Math.round(S.odo * 10) / 10,
    });
  // the mirrors' default: on for computers, off for phones and tablets
  const mirOn = () => (S.mir != null ? S.mir : !COARSE);
  // what a motion level means, in words
  const desc = l => (l > 0 ? Math.round((MLEVELS[l] || 1) * 100) + ' % Auflösung, ohne Effekte' : 'volle Qualität');
  function mot(name) {
    if (!Object.prototype.hasOwnProperty.call(MOT, name)) return;
    S.mot = name;
    setMotionUser(MOT[name].lv);
    save();
    ui();
  }
  // ---- the counter: frames drawn in the last second (render/render.js counts them in MOTION.frames), the level while moving ----
  let box = null,
    timer = 0;
  const ring = [];
  function counter() {
    const now = performance.now();
    ring.push([now, MOTION.frames]);
    while (ring.length > 2 && now - ring[1][0] >= 1000) ring.shift();
    const a = ring[0],
      dt = (now - a[0]) / 1000,
      n = MOTION.frames - a[1],
      fps = dt > 0.3 ? Math.round(n / dt) : 0;
    const l = MOTION.level;
    return {
      fps,
      lv:
        'Bewegen: ' +
        (l > 0 ? Math.round((MLEVELS[l] || 1) * 100) + ' %' : 'voll') +
        (MOTION.user == null ? ' (auto)' : ''),
    };
  }
  function tickBox() {
    if (!box) return;
    const c = counter();
    box.innerHTML = '<b>' + (c.fps ? c.fps + ' Bilder/s' : 'Bild steht') + '</b> · ' + c.lv;
    box.dataset.fps = String(c.fps);
    // the note under „Beim Bewegen“ follows the automatic's level
    if (S.mot === 'auto') note();
  }
  function fps(on) {
    S.fps = !!on;
    if (S.fps && !box) {
      box = document.createElement('div');
      box.className = 'ov';
      box.id = 'fpsbox';
      box.setAttribute('aria-live', 'off');
      ($('p-3d') || document.body).appendChild(box);
    }
    if (box) box.hidden = !S.fps;
    clearInterval(timer);
    ring.length = 0;
    if (S.fps) {
      tickBox();
      timer = setInterval(tickBox, 500);
    }
    ui();
  }
  function note() {
    const n = $('motnote');
    if (!n) return;
    const m = MOT[S.mot],
      t = m.name + ': ' + m.txt + (S.mot === 'auto' ? ' – gerade ' + desc(MOTION.level) + '.' : '.');
    if (n.textContent !== t) n.textContent = t;
  }
  function ui() {
    document.querySelectorAll('#motseg [data-mot]').forEach(b => {
      const m = MOT[b.dataset.mot];
      if (!m) return;
      b.setAttribute('aria-pressed', String(b.dataset.mot === S.mot));
      b.title = m.name + ': ' + m.txt;
    });
    note();
    const tog = (id, on) => {
      const b = $(id);
      if (!b) return;
      b.setAttribute('aria-pressed', String(on));
      const sp = b.querySelector('span');
      if (sp) sp.textContent = on ? 'an' : 'aus';
    };
    tog('fpsbtn', S.fps);
    tog('mirbtn', mirOn());
    tog('navmapbtn', S.nav);
  }
  // the look of the counter and of the five buttons (they fit a phone's menu sheet)
  {
    const st = document.createElement('style');
    st.textContent =
      '#fpsbox{left:50%;transform:translateX(-50%);top:calc(6px + env(safe-area-inset-top,0px));padding:4px 10px;border-radius:999px;' +
      'background:var(--ov-bg);font:500 11px/1.25 var(--f-mono);white-space:nowrap;pointer-events:none;z-index:4;' +
      'font-variant-numeric:tabular-nums;backdrop-filter:blur(6px);max-width:calc(100% - 24px);overflow:hidden;text-overflow:ellipsis}' +
      '#fpsbox b{font-weight:600}#motseg button{padding:8px 11px}' +
      '@media (max-width:560px){#motseg button{padding:7px 8px;font-size:12.5px}}';
    document.head.appendChild(st);
  }
  document.querySelectorAll('#motseg [data-mot]').forEach(b => b.addEventListener('click', () => mot(b.dataset.mot)));
  $('fpsbtn')?.addEventListener('click', () => {
    fps(!S.fps);
    save();
  });
  $('mirbtn')?.addEventListener('click', () => {
    S.mir = !mirOn();
    save();
    ui();
  });
  $('navmapbtn')?.addEventListener('click', () => {
    S.nav = !S.nav;
    save();
    ui();
  });
  // at load: the saved stage (render/render.js applies it at the end of its preparation, after the motion path is compiled)
  setMotionUser(MOT[S.mot].lv);
  if (S.fps) fps(true);
  ui();
  const info = () => ({
    mot: S.mot,
    level: MOTION.level,
    user: MOTION.user,
    auto: MOTION.auto,
    frames: MOTION.frames,
    fps: S.fps,
    box: box ? { shown: !box.hidden, text: box.textContent } : null,
  });
  return { S, MOT, mot, fps, info, save, ui, counter, mirOn };
})();
