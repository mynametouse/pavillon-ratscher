// ===================== feat/grenzland: the flashback to November 1989 (GL89) – into it and back, the people of the afternoon, the young Gerhard, the sound =====================
// Ratscher, Friday, 10 November 1989, the afternoon after the border was opened (Falko, 13.11.2026 0:32: „achte bei den Rückblenden auf
// 1989 auch auf entsprechende Anpassungen von Umfeld, Kleidung, Stil, Fashion und sonstigen, sodass es wirklich gut ankommt und
// realistisch wirkt“). A fade, the date; the village of the time (grenzland/gl_1989_welt.js: what is newer hidden, the street of 1989
// added, haze, dusk coming); the player's own figure repainted as the young Gerhard, 35, teacher – parka, corduroy, the glasses and the
// moustache of the time (Sarah's player becomes the man for the memory and herself again after it); the people of the afternoon
// (grenzland/gl_1989_data.js) in the clothes and with the hair of 1989, each at what one did that day: queueing at the Konsum, sweeping
// the pavement, shovelling briquettes, bent over a moped, reading the notice board, walking home with the briefcase. Who comes near is
// told what was true that day (the visa stamp at the Volkspolizeikreisamt, the queue at Eisfeld, 100 DM in Coburg, the table at the
// „Waffenschmied“ in Suhl). They are witnesses of the wanted level (they see, and they know the teacher). The nearest few are loaded as
// figures, the others freed (a phone's memory). Sounds, synthesised: the school's bell on the hour, a dog, a two-stroke somewhere, the
// shovel in the coal, the broom, the radio through the shop's door. Leaving – or the mode's end in the middle of it – puts everything back.
//   GL89.enter({ uhr, pos: [x, y], yaw }) → Promise (resolves when the world stands) · GL89.leave() → Promise · GL89.on
//   GL89.leute → { id: figure of gl_fig.js } (those standing right now) · GL89.hol(id, x, y, hdDeg) → Promise<figure> (somebody of the
//   cast for a mission: made, kept, placed) · tick(dt) · stop() · state()
// Events: 'grenzland:era' { era }.
import { COARSE } from '../core/head.js';
import { KERN } from '../core/kern.js';
import { markDirty } from '../core/assets.js';
import { P } from '../game/walkable.js';
import { go } from '../game/player.js';
import { AVATAR } from '../game/avatar.js';
import { CLOCK } from '../time/clock.js';
import { DN } from '../time/daynight.js';
import { STIMME } from '../audio/stimme.js';
import { GLDATA } from './gl_data.js';
import { GL } from './gl_state.js';
import { GLTON } from './gl_ton.js';
import { GLFIG } from './gl_fig.js';
import { GLHUD } from './gl_hud.js';
import { GL89DATA } from './gl_1989_data.js';
import { GL89WELT } from './gl_1989_welt.js';
export const GL89 = (() => {
  const S = {
    on: false,
    leute: {},
    back: null,
    gen: 0,
    busy: false,
    who: {},
    loading: false,
    spieler: null,
    sayT: 0,
    radioT: 6,
    radioI: 0,
    hundT: 14,
    motT: 30,
    stunde: -1,
    glocke: [],
    err: '',
    t: 0,
  };
  const J = GLDATA.J89,
    D = GL89DATA,
    hyp = Math.hypot,
    rad = d => (d * Math.PI) / 180,
    MAXF = COARSE ? 3 : 6;
  // ------------------------------------------------------------------ the sounds of the afternoon ------------------------------------------------------------------
  let tonReady = false;
  function ton() {
    if (tonReady) return;
    tonReady = true;
    // the bell in the school's turret: a strike and its partials dying away
    GLTON.add('glocke89', (R, t, k) => {
      for (const [f, p, d] of [
        [392, 0.3, 3.2],
        [392 * 2.01, 0.16, 2.2],
        [392 * 2.76, 0.1, 1.5],
        [392 * 0.5, 0.14, 3.6],
        [392 * 4.1, 0.05, 0.8],
      ])
        GLTON.tone(R, t, { f0: f, peak: p * k, a: 0.004, d });
      GLTON.noise(R, t, { f: 2600, q: 1.2, peak: 0.1 * k, d: 0.05 });
    });
    GLTON.add('hund89', (R, t, k) => {
      for (const o of [0, 0.34, 1.1]) {
        GLTON.tone(R, t + o, { f0: 330, f1: 170, type: 'sawtooth', peak: 0.16 * k, a: 0.01, d: 0.14 });
        GLTON.noise(R, t + o, { f: 760, f1: 420, q: 1.4, peak: 0.26 * k, a: 0.008, d: 0.16 });
      }
    });
    GLTON.add('schaufel89', (R, t, k) => {
      GLTON.noise(R, t, { f: 2300, f1: 1500, q: 0.9, peak: 0.2 * k, a: 0.03, d: 0.22 });
      GLTON.noise(R, t + 0.5, { type: 'lowpass', f: 420, peak: 0.26 * k, d: 0.16 });
      for (let i = 0; i < 5; i++)
        GLTON.tone(R, t + 0.52 + i * 0.045, {
          f0: 520 + ((i * 97) % 240),
          f1: 300,
          type: 'triangle',
          peak: 0.05 * k,
          d: 0.05,
        });
    });
    GLTON.add('besen89', (R, t, k) => {
      GLTON.noise(R, t, { type: 'highpass', f: 2600, peak: 0.07 * k, a: 0.08, d: 0.3 });
    });
    // a two-stroke somewhere in the village: coming, rattling past, going
    GLTON.add('zweitakt89', (R, t, k) => {
      GLTON.tone(R, t, { f0: 58, f1: 104, type: 'sawtooth', peak: 0.1 * k, a: 1.4, d: 1.6 });
      GLTON.tone(R, t + 2.6, { f0: 104, f1: 66, type: 'sawtooth', peak: 0.1 * k, a: 0.3, d: 2.8 });
      for (let i = 0; i < 44; i++) GLTON.noise(R, t + 0.5 + i * 0.11, { f: 520, q: 2.5, peak: 0.05 * k, d: 0.03 });
    });
    // the radio through an open door: a few bars, thin and muffled
    GLTON.add('radio89', (R, t, k) => {
      const c = R.ctx,
        f = c.createBiquadFilter(),
        g = c.createGain();
      f.type = 'bandpass';
      f.frequency.value = 1100;
      f.Q.value = 0.8;
      g.gain.value = 0.5 * k;
      f.connect(g);
      g.connect(R.sfx);
      [0, 4, 7, 12, 11, 7, 9, 5, 4, 0].forEach((n, i) =>
        GLTON.tone(R, t + i * 0.24, { f0: 330 * Math.pow(2, n / 12), type: 'square', peak: 0.1, a: 0.01, d: 0.2 }, f)
      );
    });
  }
  // ------------------------------------------------------------------ the player as the young Gerhard ------------------------------------------------------------------
  async function gerhard(gen) {
    const R = (S.spieler = { restore: [], tex: [], extra: [], kind: AVATAR.kind, done: false });
    if (!window.PLAYERMAN || AVATAR.failed) return;
    try {
      if (AVATAR.kind !== 'm') await AVATAR.setKind('m');
      else if (!AVATAR.fig) await AVATAR.load('m');
    } catch (e) {
      return;
    }
    const F = AVATAR.figs && AVATAR.figs.m;
    if (gen !== S.gen || !F || !F.model) return;
    const G = D.GERHARD;
    // (the figure's images may be GPU-compressed textures: their pixels come from the figure's file once more)
    await GLFIG.pixels(F.model, window.PLAYERMAN[AVATAR.FIGS.m.file]);
    if (gen !== S.gen) return GLFIG.forget(F.model);
    R.tex = GLFIG.dress(F.model, GLDATA.KLEID[G.kleid], R.restore);
    R.extra = GLFIG.kopf(F.model, { bart: G.bart, brille: G.brille, gestell: G.gestell, haar: G.haar });
    GLFIG.forget(F.model);
    R.done = R.tex.length > 0;
    markDirty(true);
  }
  function gerhardBack() {
    const R = S.spieler;
    S.spieler = null;
    if (!R) return;
    for (const [m, map] of R.restore) {
      m.map = map;
      m.needsUpdate = true;
    }
    for (const t of R.tex) t.dispose();
    for (const g of R.extra) if (g.parent) g.parent.remove(g);
    if (AVATAR.kind !== R.kind) AVATAR.setKind(R.kind);
  }
  // ------------------------------------------------------------------ the people ------------------------------------------------------------------
  const here = () => KERN.where() || [P.x, P.y];
  // who should stand as a figure right now: the nearest few (those standing stay a little longer: no flicker at the edge)
  function wanted() {
    const w = here(),
      L = Object.keys(D.LEUTE).map(id => {
        const q = S.who[id],
          p = q && q.F ? [q.F.x, q.F.y] : D.LEUTE[id].pos;
        return [hyp(p[0] - w[0], p[1] - w[1]) - (q && q.F ? 14 : 0), id];
      });
    L.sort((a, b) => a[0] - b[0]);
    return L.filter(q => q[0] < 150)
      .slice(0, MAXF)
      .map(q => q[1]);
  }
  async function bring(id, gen) {
    const d = D.LEUTE[id],
      F = await GLFIG.make(id, { era: '1989' });
    if (!F) return null;
    if (gen !== S.gen || !S.on || S.who[id]) {
      GLFIG.drop(F);
      return null;
    }
    F.knows = true;
    F.r = d.r || 20;
    GLFIG.place(F, d.pos[0], d.pos[1], rad(d.hd));
    S.who[id] = { id, F, d, t: 1 + (id.length % 3), ph: 0, i: 0, said: -99, n: 0 };
    S.leute[id] = F;
    return F;
  }
  function send(id) {
    const q = S.who[id];
    if (!q) return;
    delete S.who[id];
    delete S.leute[id];
    GLFIG.drop(q.F);
  }
  async function crowd(gen, all) {
    if (S.loading) return;
    S.loading = true;
    try {
      const W = wanted();
      for (const id of Object.keys(S.who)) if (S.who[id].d && !W.includes(id)) send(id);
      for (const id of W) {
        if (gen !== S.gen || !S.on) break;
        if (!S.who[id]) {
          await bring(id, gen);
          if (!all) break; // one at a time while one plays
        }
      }
    } catch (e) {
      S.err = String((e && e.message) || e).slice(0, 140);
    }
    S.loading = false;
  }
  // somebody of the cast for a mission (Lutz, the ABV …): made, kept until the flashback ends, placed
  async function hol(id, x, y, hdDeg = 0) {
    if (!S.on) return null;
    if (S.leute[id]) {
      GLFIG.place(S.leute[id], x, y, rad(hdDeg));
      if (S.who[id]) S.who[id].d = null;
      return S.leute[id];
    }
    const gen = S.gen,
      F = await GLFIG.make(id, { era: '1989' });
    if (!F) return null;
    if (gen !== S.gen || !S.on) {
      GLFIG.drop(F);
      return null;
    }
    F.knows = true;
    GLFIG.place(F, x, y, rad(hdDeg));
    S.who[id] = { id, F, d: null, t: 0, ph: 0, i: 0, said: -99, n: 0 };
    S.leute[id] = F;
    return F;
  }
  // what each one does (d.tun), in the frame's time
  function act(q, dt, w) {
    const F = q.F,
      d = q.d;
    if (!d || F.downT > 0) return;
    q.t -= dt;
    const dist = hyp(F.x - w[0], F.y - w[1]);
    switch (d.tun) {
      case 'kehren':
        // a few strokes, a step along the house, on
        if (F.st === 'geht') break;
        GLFIG.pose(F, 'saw');
        if (q.t <= 0) {
          q.t = 0.9;
          if (dist < 30) GLTON.fx('besen89', dist, 34);
          if (++q.n % 7 === 0) {
            q.ph ^= 1;
            GLFIG.pose(F, null);
            GLFIG.go(F, [d.pos[0] + (q.ph ? 1.6 : 0), d.pos[1] - (q.ph ? 0.8 : 0)], 0.5, f => {
              f.hd = rad(d.hd);
            });
          }
        }
        break;
      case 'kohlen':
        // the shovel into the heap, up, into the bucket – and a breath
        if (q.t <= 0) {
          q.ph = (q.ph + 1) % 4;
          q.t = q.ph === 3 ? 2.6 : 1.5;
          GLFIG.pose(F, q.ph === 0 || q.ph === 2 ? 'pick' : null);
          if (q.ph === 0 && dist < 45) GLTON.fx('schaufel89', dist, 50);
        }
        break;
      case 'moped':
        if (q.t <= 0) {
          q.ph ^= 1;
          q.t = q.ph ? 7 + (q.n++ % 3) * 2 : 2.4;
          GLFIG.pose(F, q.ph ? 'bonnet' : null);
        }
        break;
      case 'gehen':
        if (F.st !== 'geht' && q.t <= 0) {
          q.i = (q.i + 1) % d.weg.length;
          GLFIG.go(F, d.weg[q.i], 1.1, () => {
            q.t = q.i % 3 === 0 ? 7 : 0.2;
          });
          q.t = 60;
        }
        break;
      default:
        // standing, queueing: a word with the neighbour now and then
        if (q.t <= 0) {
          q.ph ^= 1;
          q.t = q.ph ? 3.5 : 5 + (q.n++ % 4) * 2;
          if (d.zu && S.sayT <= 0) GLFIG.talking(F, !!q.ph);
        }
    }
  }
  // who comes near is spoken to: one line after the other, with a pause
  function talk(dt, w) {
    if (S.sayT > 0) {
      S.sayT -= dt;
      if (S.sayT <= 0 && S.speaker) {
        GLFIG.talking(S.speaker, false);
        S.speaker = null;
      }
      return;
    }
    if (P.mode !== 'walk') return;
    let best = null,
      bd = 5.2;
    for (const q of Object.values(S.who)) {
      const L = D.SAGT[q.id];
      if (!L || !q.d || S.t - q.said < 24 || q.F.downT > 0) continue;
      const dd = hyp(q.F.x - w[0], q.F.y - w[1]);
      if (dd < bd) {
        bd = dd;
        best = q;
      }
    }
    if (!best) return;
    const L = D.SAGT[best.id],
      line = L[best.line || 0];
    best.line = ((best.line || 0) + 1) % L.length;
    best.said = S.t;
    S.sayT = GLHUD.sub(best.F.name, line) + 1.5;
    S.speaker = best.F;
    GLFIG.talking(best.F, true);
    if (best.F.st !== 'geht' && best.d.tun !== 'kehren' && best.d.tun !== 'kohlen' && best.d.tun !== 'moped')
      GLFIG.face(best.F, w[0], w[1]);
    GL.emit('sagt', { id: best.id, text: line });
  }
  // the bell, the dog, a two-stroke, the radio at the shop
  function sounds(dt, w) {
    const h = Math.floor((((CLOCK.t % 1440) + 1440) % 1440) / 60);
    if (S.stunde < 0) S.stunde = h;
    else if (h !== S.stunde) {
      S.stunde = h;
      for (let i = 0; i < (h % 12 || 12); i++) S.glocke.push(i * 1.9);
    }
    for (let i = S.glocke.length - 1; i >= 0; i--)
      if ((S.glocke[i] -= dt) <= 0) {
        S.glocke.splice(i, 1);
        GLTON.fx('glocke89', hyp(w[0] - 228.7, w[1] + 83.1), 520);
      }
    if ((S.hundT -= dt) <= 0) {
      S.hundT = 22 + ((S.t * 7.3) % 30);
      GLTON.fx('hund89', hyp(w[0] - 262, w[1] + 150), 300);
    }
    if ((S.motT -= dt) <= 0) {
      S.motT = 48 + ((S.t * 3.1) % 50);
      GLTON.fx('zweitakt89', 70 + ((S.t * 1.7) % 60), 260);
    }
    // the radio in the shop: heard at its door
    const g = D.LEUTE.gisela.pos,
      dr = hyp(w[0] - g[0], w[1] - g[1]);
    if ((S.radioT -= dt) <= 0 && dr < 11 && S.sayT <= 0) {
      const R = (GLDATA.J89.radio89 && GLDATA.J89.radio89.length ? GLDATA.J89.radio89 : null) || D.RADIO;
      S.radioT = 17;
      GLTON.fx('radio89', dr, 26);
      const line = R[S.radioI++ % R.length];
      S.sayT = GLHUD.sub('Radio', line) + 1;
      // the recorded voice of the set (agent stimmen: Radio Republik), heard at the shop's door
      try {
        if (STIMME.speaks('gl_r_republik', line)) STIMME.say('gl_r_republik', line, { at: [g[0], g[1]] });
      } catch (e) {}
    }
  }
  // ------------------------------------------------------------------ in and out ------------------------------------------------------------------
  async function enter(o = {}) {
    if (S.on || S.busy) return;
    S.busy = true;
    const gen = ++S.gen;
    ton();
    GLTON.fx('damals');
    await GLHUD.fade(true, J.datum, J.intro);
    if (gen !== S.gen) return;
    S.back = { t: CLOCK.t, e0: DN.e0, pos: [P.x, P.y, P.feet, P.yaw] };
    // the game day becomes the 10th of November 1989, the afternoon
    const d = Math.floor(CLOCK.t / 1440);
    try {
      DN.e0 = Date.UTC(J.tag[0], J.tag[1] - 1, J.tag[2]) / 864e5 - d;
    } catch (e) {}
    CLOCK.t = d * 1440 + (o.uhr ?? D.BILD.uhr ?? J.uhr);
    S.on = true;
    S.t = 0;
    S.stunde = -1;
    S.sayT = 2;
    S.radioT = 5;
    GL.era = '1989';
    GLHUD.era('1989', J.datum);
    GL89WELT.enter();
    if (DN && DN.active) DN.update(true);
    if (o.pos) {
      KERN.spot('gl-1989', {
        mode: 'walk',
        pos: o.pos,
        z: KERN.ground(o.pos[0], o.pos[1]),
        yaw: o.yaw || 0,
        pitch: -3,
        label: 'Ratscher 1989',
      });
      go('gl-1989');
    }
    try {
      await gerhard(gen);
      if (gen === S.gen) await crowd(gen, true);
    } catch (e) {
      S.err = String((e && e.message) || e).slice(0, 140);
    }
    if (gen !== S.gen) return;
    S.busy = false;
    GL.emit('era', { era: '1989' });
    await GLHUD.fade(false);
  }
  function restore() {
    const b = S.back;
    S.gen++;
    S.busy = false;
    S.loading = false;
    for (const id of Object.keys(S.who)) send(id);
    S.speaker = null;
    S.glocke.length = 0;
    gerhardBack();
    GL89WELT.leave();
    S.on = false;
    S.back = null;
    GL.era = 'heute';
    GLHUD.era('heute');
    if (!b) return;
    try {
      DN.e0 = b.e0;
    } catch (e) {}
    CLOCK.t = b.t;
    if (DN && DN.active) DN.update(true);
    KERN.spot('gl-zurueck', {
      mode: 'walk',
      pos: [b.pos[0], b.pos[1]],
      z: b.pos[2],
      yaw: b.pos[3],
      pitch: -3,
      label: 'Ratscher',
    });
    go('gl-zurueck');
    GL.emit('era', { era: 'heute' });
    markDirty(true);
  }
  async function leave() {
    if (!S.on) return;
    await GLHUD.fade(true, 'Heute', '');
    restore();
    await GLHUD.fade(false);
  }
  function tick(dt) {
    if (!S.on) return;
    S.t += dt;
    GL89WELT.tick(dt);
    const w = here();
    if ((S.crowdT = (S.crowdT || 0) + dt) > 1.5 && !S.busy) {
      S.crowdT = 0;
      crowd(S.gen, false);
    }
    for (const q of Object.values(S.who)) act(q, dt, w);
    talk(dt, w);
    sounds(dt, w);
  }
  const state = () => ({
    on: S.on,
    busy: S.busy,
    err: S.err || GL89WELT.err || GLFIG.err || '',
    leute: Object.keys(S.leute),
    spieler: S.spieler
      ? {
          tex: S.spieler.tex.length,
          extra: S.spieler.extra.length,
          restore: S.spieler.restore.length,
          kind: S.spieler.kind,
        }
      : null,
    welt: GL89WELT.state(),
    datum: DN && DN.dateShort ? DN.dateShort() : '',
    jahr: new Date((DN.e0 + Math.floor(CLOCK.t / 1440)) * 864e5).getUTCFullYear(),
    m: ((Math.floor(CLOCK.t) % 1440) + 1440) % 1440,
  });
  return Object.assign(S, { enter, leave, tick, hol, state, stop: () => (S.on || S.busy) && restore() });
})();
window.GL89 = GL89;
