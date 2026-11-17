// ===================== feat/grenzland: how the places sound – real recordings of village, lake, forest, ravine and town (GLUMGEBUNG) =====================
// Falko, 14.11.2026 1:45 („Orte klingen“) and 17.11.2026 11:26 („Alle drei mit Repo“) – free recordings only (radio aporee, public domain), in the sound
// repository pavillon-ton/orte/ (credits in the radio extra's manifest): a seamless loop of 24 s per kind of place, chosen by the place
// name under the player (KERN.place, as the phone's calls do) –
//   dorf       Ratscher and the garden: starlings, a car, voices far off (Spreewald village, Peter Cusack)
//   talsperre  the reservoir: water at the shore, ducks (Essen, Frank Schulte)
//   wald       the forest: summer birds, the wind (Bavarian Forest, dschulz)
//   klinge     the Klinge: a brook under spruces (Hoellegrundsbach, blackhole-factory)
//   stadt      Schleusingen: a market square, people, a van (Leipzig, oriolus)
// Crossfades of about three seconds; quieter at night (the crickets and the bell of GLNACHT come on top), in a vehicle and indoors.
// Today only, only while the mode runs; gone after „Beenden“. The base game's birds and wind stay. No file, no connection: silence.
//   GLUMGEBUNG.tick(dt) (gl_modus.js) · stop() · stand() · zone(x, y) · fest(kind | null) – tests: one kind of place wherever one is
import { audio } from '../audio/audio.js';
import { CLOCK } from '../time/clock.js';
import { KERN } from '../core/kern.js';
import { VEH } from '../vehicles/vehicle.js';
import { P } from '../game/walkable.js';
import { GL } from './gl_state.js';
import { GLRDATA } from './gl_radio_data.js';
export const GLUMGEBUNG = (() => {
  // gain by day and by night (21:30–5:00)
  const ART = {
    dorf: { tag: 0.42, nacht: 0.16 },
    talsperre: { tag: 0.5, nacht: 0.4 },
    wald: { tag: 0.48, nacht: 0.22 },
    klinge: { tag: 0.55, nacht: 0.5 },
    stadt: { tag: 0.5, nacht: 0.14 },
  };
  // (the names as grenzland/gl_reaktion.js reads them – but „… bei Ratscher“ is the open land, not the village –, the reservoir by its
  // shore in the map data, then the distance to the village's and the town's middle)
  const ORTE = [
    [/Schleusingen|Markt|Bertholdsburg/, 'stadt'],
    [/Talsperre|Staudamm|Staumauer|Damm|Angelstelle|Stausee/, 'talsperre'],
    [/Wald an der Klinge/, 'wald'],
    [/Klinge/, 'klinge'],
    [/Wald|Forst|Kamm/, 'wald'],
    [/^Ratscher|Ratschner|Anger|Dorf|Garten|Linde/, 'dorf'],
  ];
  // the reservoir: on its water or within 150 m of its shore (the triangles of „Talsperre Ratscher“ in the map data, as world/ratscher.js
  // draws them – the outline holds an island as a second ring, so the test goes by the triangles, not by the outline)
  let SEE;
  const seg = (x, y, X, Y, a, b) => {
    const dx = X[b] - X[a],
      dy = Y[b] - Y[a],
      L = dx * dx + dy * dy,
      t = L ? Math.max(0, Math.min(1, ((x - X[a]) * dx + (y - Y[a]) * dy) / L)) : 0,
      ex = X[a] + t * dx - x,
      ey = Y[a] + t * dy - y;
    return ex * ex + ey * ey;
  };
  function amSee(x, y) {
    if (SEE === undefined) {
      const W = (typeof window !== 'undefined' && window.GEOMAN && window.GEOMAN.water) || [];
      SEE = W.find(w => /Talsperre/.test(w.name || '') && w.tri) || null;
    }
    if (!SEE) return false;
    const X = SEE.x,
      Y = SEE.y,
      T = SEE.tri;
    let d2 = Infinity;
    for (let t = 0; t < T.length; t += 3) {
      const a = T[t],
        b = T[t + 1],
        c = T[t + 2],
        s1 = (X[b] - X[a]) * (y - Y[a]) - (Y[b] - Y[a]) * (x - X[a]),
        s2 = (X[c] - X[b]) * (y - Y[b]) - (Y[c] - Y[b]) * (x - X[b]),
        s3 = (X[a] - X[c]) * (y - Y[c]) - (Y[a] - Y[c]) * (x - X[c]);
      if ((s1 >= 0 && s2 >= 0 && s3 >= 0) || (s1 <= 0 && s2 <= 0 && s3 <= 0)) return true;
      d2 = Math.min(d2, seg(x, y, X, Y, a, b), seg(x, y, X, Y, b, c), seg(x, y, X, Y, c, a));
    }
    return d2 < 150 * 150;
  }
  const S = { buf: {}, lade: {}, an: {}, art: '', acc: 0, fehl: 0, fest: null };
  const raw = () => {
    try {
      return audio.raw ? audio.raw() : null;
    } catch (e) {
      return null;
    }
  };
  function zone(x, y) {
    if (Math.hypot(x, y) < 70) return 'dorf';
    let n = '';
    try {
      n = String(KERN.place(x, y, 0) || '');
    } catch (e) {}
    if (ORTE[0][0].test(n)) return 'stadt';
    if (amSee(x, y)) return 'talsperre';
    for (const [rx, k] of ORTE) if (rx.test(n)) return k;
    if (Math.hypot(x - 222, y + 108) < 900) return 'dorf';
    if (Math.hypot(x + 1340, y - 1243) < 900) return 'stadt';
    return '';
  }
  function buf(k) {
    if (k in S.buf) return S.buf[k];
    const R = raw();
    if (!R || S.lade[k]) return null;
    S.lade[k] = fetch(GLRDATA.ton() + 'orte/' + k + '.mp3')
      .then(r => (r.ok ? r.arrayBuffer() : Promise.reject(new Error('HTTP ' + r.status))))
      .then(ab => new Promise((res, rej) => R.ctx.decodeAudioData(ab, res, rej)))
      .then(b => (S.buf[k] = b))
      .catch(() => {
        S.fehl++;
        S.buf[k] = null;
      });
    return null;
  }
  const nacht = () => {
    const m = ((Math.floor(CLOCK.t) % 1440) + 1440) % 1440;
    return m >= 21 * 60 + 30 || m < 5 * 60;
  };
  function ziel(k) {
    if (!k || !ART[k]) return 0;
    let v = nacht() ? ART[k].nacht : ART[k].tag;
    try {
      if (VEH.cur) v *= 0.35;
      if (audio.inside && audio.inside()) v *= 0.2;
    } catch (e) {}
    return v;
  }
  function start(R, k, b) {
    const s = R.ctx.createBufferSource(),
      g = R.ctx.createGain();
    s.buffer = b;
    s.loop = true;
    g.gain.value = 0.0001;
    s.connect(g);
    g.connect(R.amb || R.sfx);
    s.start(R.ctx.currentTime + 0.05, Math.random() * Math.max(0, b.duration - 1));
    return (S.an[k] = { s, g, aus: 0 });
  }
  function ende(k) {
    const a = S.an[k];
    if (!a) return;
    try {
      a.s.stop();
      a.s.disconnect();
      a.g.disconnect();
    } catch (e) {}
    delete S.an[k];
  }
  function tick(dt) {
    if (!GL.on) return;
    S.acc += dt;
    if (S.acc < 0.3) return;
    const step = S.acc;
    S.acc = 0;
    const R = raw();
    if (!R) return;
    const k = GL.era !== 'heute' ? '' : S.fest !== null ? S.fest : zone(P.x, P.y);
    S.art = k;
    if (k) {
      const b = buf(k);
      if (b && !S.an[k]) start(R, k, b);
    }
    // this kind of place up, every other one down – and away once silent for a while
    const now = R.ctx.currentTime;
    for (const [n, a] of Object.entries(S.an)) {
      const v = n === k ? ziel(n) : 0;
      a.g.gain.setTargetAtTime(Math.max(0.0001, v), now, v > 0 ? 1.2 : 1.0);
      a.aus = v > 0 ? 0 : a.aus + step;
      if (a.aus > 7) ende(n);
    }
  }
  function stop() {
    for (const k of Object.keys(S.an)) ende(k);
    S.art = '';
  }
  return {
    tick,
    stop,
    zone,
    fest: k => void (S.fest = k === null || k === undefined ? null : ART[k] ? k : ''),
    stand: () => ({
      art: S.art,
      spielt: Object.keys(S.an),
      geladen: Object.keys(S.buf).filter(k => S.buf[k]),
      fehl: S.fehl,
    }),
  };
})();
if (typeof window !== 'undefined') window.GLUMGEBUNG = GLUMGEBUNG;
