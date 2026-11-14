// ===================== feat/grenzland: the night and the church bell of the mode – real recordings (GLNACHT) =====================
// Falko, 13.11.2026 23:57: „bitte erstmal nur das, was creditsparend schnell umsetzbar ist …“ – clicked „Nacht und Glocken“: real, freely
// licensed recordings (viz3/extra/grenzland-nacht/, credits in its manifest):
//   - field crickets on summer nights (May–September of the game's date, 21:30–4:30, today only): one seamless stereo loop on the
//     ambience bus, quieter in Schleusingen's old town, in a vehicle and indoors – it fades in and out over a few seconds;
//   - St. Johannis in Schleusingen strikes the full hour (1–12 strikes, about two seconds apart), heard with distance and direction over
//     the map (audio.at: panning, distance, air absorption) – loud on the market, faint in Ratscher.
// The base game's owls, distant bells and synthesised chirps stay as they are. Only while the mode runs; gone after „Beenden“. A file
// that cannot be loaded leaves silence, no error.
//   GLNACHT.tick(dt) (gl_modus.js) · stop() · schlag(n) (strike now – tests) · stand() (tests)
import { BASE } from '../core/head.js';
import { audio } from '../audio/audio.js';
import { CLOCK } from '../time/clock.js';
import { DN } from '../time/daynight.js';
import { VEH } from '../vehicles/vehicle.js';
import { GL } from './gl_state.js';
export const GLNACHT = (() => {
  // the tower of St. Johannis (welt/schleusingen.js, the church's props) and the old town around the market
  const KIRCHE = [-1246.0, 1213.2];
  const ALTSTADT = { pos: [-1300, 1230], r: 380 };
  const GRILLEN = 0.55; // gain of the cricket loop outdoors
  const S = {
    buf: {},
    lade: {},
    src: null,
    g: null,
    ziel: 0,
    an: 0,
    aus: 0,
    stunde: -1,
    min: -1,
    schlaege: 0,
    timer: [],
    acc: 0,
    fehl: 0,
  };
  const raw = () => {
    try {
      return audio.raw ? audio.raw() : null;
    } catch (e) {
      return null;
    }
  };
  // a recording of the extra, decoded once (null while loading or when it cannot be had)
  function buf(name) {
    if (name in S.buf) return S.buf[name];
    const R = raw();
    if (!R || S.lade[name]) return null;
    S.lade[name] = fetch(BASE + 'snd/nacht/' + name + '.mp3')
      .then(r => (r.ok ? r.arrayBuffer() : Promise.reject(new Error('HTTP ' + r.status))))
      .then(ab => new Promise((res, rej) => R.ctx.decodeAudioData(ab, res, rej)))
      .then(b => (S.buf[name] = b))
      .catch(() => {
        S.fehl++;
        S.buf[name] = null;
      });
    return null;
  }
  const minute = () => ((Math.floor(CLOCK.t) % 1440) + 1440) % 1440;
  const nacht = m => m >= 21 * 60 + 30 || m < 4 * 60 + 30;
  const sommer = () => {
    try {
      return DN && DN.summer ? !!DN.summer() : true;
    } catch (e) {
      return true;
    }
  };
  // how loud the crickets should be where one is now (0 … GRILLEN)
  function grillenZiel() {
    if (!GL.on || GL.era !== 'heute' || !sommer() || !nacht(minute())) return 0;
    let v = GRILLEN;
    try {
      const sp = audio.spatial ? audio.spatial(ALTSTADT.pos[0], ALTSTADT.pos[1]) : null;
      if (sp && sp.dist < ALTSTADT.r) v *= 0.25 + 0.75 * Math.max(0, (sp.dist - ALTSTADT.r * 0.6) / (ALTSTADT.r * 0.4));
      if (VEH.cur) v *= 0.3;
      if (audio.inside && audio.inside()) v *= 0.15;
    } catch (e) {}
    return v;
  }
  function grillenStart(R, b) {
    const s = R.ctx.createBufferSource(),
      g = R.ctx.createGain();
    s.buffer = b;
    s.loop = true;
    g.gain.value = 0.0001;
    s.connect(g);
    g.connect(R.amb || R.sfx);
    // (somewhere in the loop, so a new night does not always begin at the same chirp)
    s.start(R.ctx.currentTime + 0.05, Math.random() * Math.max(0, b.duration - 1));
    S.src = s;
    S.g = g;
  }
  function grillenStop() {
    if (!S.src) return;
    try {
      S.src.stop();
      S.src.disconnect();
      S.g.disconnect();
    } catch (e) {}
    S.src = S.g = null;
  }
  // the hour strikes: n strikes from the tower, about two seconds apart, each placed and filtered by distance where one is then
  function schlag(n) {
    const b = buf('glocke_schlag');
    if (!b || !GL.on) return false;
    const R = raw();
    for (let i = 0; i < n; i++)
      S.timer.push(
        setTimeout(() => {
          if (!GL.on) return;
          S.schlaege++;
          audio.at(null, KIRCHE[0], KIRCHE[1], { buf: b, ref: 600, vol: 0.9, dest: (R && R.amb) || undefined });
        }, i * 2100)
      );
    return true;
  }
  function tick(dt) {
    if (!GL.on) return;
    S.acc += dt;
    if (S.acc < 0.25) return;
    const step = S.acc;
    S.acc = 0;
    const R = raw();
    if (!R) return;
    // crickets
    S.ziel = grillenZiel();
    if (S.ziel > 0) {
      const b = buf('grillen');
      if (b && !S.src) grillenStart(R, b);
    }
    if (S.g) {
      const now = R.ctx.currentTime;
      S.g.gain.setTargetAtTime(Math.max(0.0001, S.ziel), now, S.ziel > 0 ? 1.6 : 1.2);
      S.aus = S.ziel > 0 ? 0 : S.aus + step;
      if (S.aus > 8) grillenStop();
    }
    // the full hour (not after a jump of the clock – sleeping, the time-lapse, a mission's new time of day)
    if (GL.era === 'heute') buf('glocke_schlag');
    const m = minute(),
      h = Math.floor(m / 60);
    if (S.min >= 0 && h !== S.stunde && m % 60 < 3 && (m - S.min + 1440) % 1440 <= 3 && GL.era === 'heute')
      schlag(h % 12 || 12);
    if (h !== S.stunde) S.stunde = h;
    S.min = m;
  }
  function stop() {
    for (const t of S.timer) clearTimeout(t);
    S.timer.length = 0;
    grillenStop();
    S.ziel = 0;
    S.stunde = S.min = -1;
  }
  return {
    tick,
    stop,
    schlag,
    stand: () => ({
      grillen: !!S.src,
      ziel: +S.ziel.toFixed(3),
      gain: S.g ? +S.g.gain.value.toFixed(3) : 0,
      schlaege: S.schlaege,
      geladen: Object.keys(S.buf).filter(k => S.buf[k]),
      fehl: S.fehl,
    }),
  };
})();
if (typeof window !== 'undefined') window.GLNACHT = GLNACHT;
