// ===================== feat/tiere 4: the companion dog – follows, is called and sent, and learns from you (HUND) =====================
// Hasso, an Altdeutscher Hütehund of the type Gelbbacke (the central German herding dog: 55–60 cm, black with tan cheeks, a long-stock
// coat) – fitting a garden with goats and a forest. He follows the walker a few metres behind on the left, walking, trotting or galloping
// to keep up; waits, sits, lies down after a while; wags; rides along in the car and jumps out with you; comes along to another place.
// Like the creature in Black & White he does things of his own accord and learns from you: what he did last (herding Ronald's goats,
// driving game out of the garden, chasing game far into the fields, finding a sign for you, barking at a neighbour or staying calm) is
// what your praise (+) or scolding (−) is about – the tendency to do it again rises or falls, a little each time, and his bond with you
// grows with praise. Called with P (whistle), sent with U to where you look. Character and what he learned: pav-hund-v1.
import { $, scene } from '../core/head.js';
import { SAVE } from '../core/save.js';
import { KERN } from '../core/kern.js';
import { markDirty, whenLoaded } from '../core/assets.js';
import { collide, P } from '../game/walkable.js';
import { PLAY } from '../game/play.js';
import { RENDER } from '../render/render.js';
import { GOATLURE, GOATS, inView, NPCS, PAD } from '../npc/npc.js';
import { VEH } from '../vehicles/vehicle.js';
import { TARTEN } from './tiere_arten.js';
import { TKOERPER } from './tiere_koerper.js';
import { TTON } from './tiere_ton.js';
import { TIERE } from './tiere.js';
import { TEINFLUSS } from './tiere_einfluss.js';
export const HUND = (() => {
  const LSK = 'pav-hund-v1';
  // what he tends to do, 0..1 – learned from praise and scolding
  const DEF = { hueten: 0.45, vertreiben: 0.45, suchen: 0.4, ruhe: 0.5, jagen: 0.35 };
  // the words for what he did (what praise or scolding is about) and which tendency it moves (and which way praise moves it)
  const ACTS = {
    hueten: { k: 'hueten', s: 1, txt: 'die Ziegen zusammengetrieben' },
    vertreiben: { k: 'vertreiben', s: 1, txt: 'das Wild aus dem Garten getrieben' },
    jagen: { k: 'jagen', s: 1, txt: 'dem Wild weit hinterhergejagt' },
    suchen: { k: 'suchen', s: 1, txt: 'eine Spur gefunden' },
    bellen: { k: 'ruhe', s: -1, txt: 'einen Nachbarn angebellt' },
    ruhig: { k: 'ruhe', s: 1, txt: 'bei den Leuten ruhig geblieben' },
    kommen: { k: null, s: 1, txt: 'auf den Pfiff gekommen' },
  };
  const D = {
    on: true,
    name: 'Hasso',
    x: 4,
    y: 12,
    z: 0,
    az: 180,
    v: 0,
    mode: 'follow',
    t: 0,
    still: 0,
    wag: 0.4,
    model: null,
    home: [8.5, 11.5],
    learn: Object.assign({}, DEF),
    char: { mut: 0.6, eifer: 0.7, sanft: 0.55, bindung: 0.5 },
    recent: null,
    log: [],
    drawT: 0,
    rideOn: false,
    task: null,
    decideT: 0,
    mood: 0,
    barkT: 0,
  };
  const clamp01 = v => Math.max(0, Math.min(1, v));
  function load() {
    const v = SAVE.get(LSK);
    if (!v || typeof v !== 'object') return;
    if (typeof v.name === 'string' && v.name.length > 0 && v.name.length < 24) D.name = v.name;
    if (v.learn && typeof v.learn === 'object')
      for (const k of Object.keys(DEF)) if (Number.isFinite(v.learn[k])) D.learn[k] = clamp01(v.learn[k]);
    if (v.char && typeof v.char === 'object')
      for (const k of Object.keys(D.char)) if (Number.isFinite(v.char[k])) D.char[k] = clamp01(v.char[k]);
    if (v.mode === 'home' || v.mode === 'follow') D.mode = v.mode;
  }
  function save() {
    SAVE.set(LSK, { v: 1, name: D.name, learn: D.learn, char: D.char, mode: D.mode === 'home' ? 'home' : 'follow' });
  }
  // the model, made the first time he is needed
  function model() {
    if (D.model) return D.model;
    D.model = TKOERPER.make('hund', {});
    D.model.g.name = 'Hund ' + D.name;
    scene.add(D.model.g);
    return D.model;
  }
  // where he wants to be: behind and to the side of the walker (left, the side a dog is led on)
  function slot() {
    const r = (P.body * Math.PI) / 180,
      fx = Math.sin(r),
      fy = Math.cos(r);
    return [P.x - fx * 2.2 - fy * 1.1, P.y - fy * 2.2 + fx * 1.1];
  }
  const GARDEN = [2, 0],
    inGarden = (x, y) => Math.hypot(x - GARDEN[0], y - GARDEN[1]) < 60;
  // ---------- what he does of his own accord ----------
  function act(kind) {
    D.recent = { kind, t: D.t };
    D.log.push({ kind, t: D.t });
    if (D.log.length > 30) D.log.shift();
    KERN.emit('hund:tat', { tat: kind, x: D.x, y: D.y });
  }
  function bark(n = 1) {
    if (D.t - D.barkT < 0.8) return;
    D.barkT = D.t;
    TTON.play('bellen', D.x, D.y, { n, vol: 0.9 });
    // barking is noise: game nearby goes
    TIERE.addNoise(D.x, D.y, 45, 2);
  }
  function decide() {
    const L = D.learn,
      R = Math.random;
    // wildlife near: in and by the garden he drives it off, out in the fields he may chase it far
    let wild = null;
    for (const a of TIERE.live) {
      if (a.bird || a.mode === 'lie') continue;
      const d = Math.hypot(a.x - D.x, a.y - D.y);
      if (d < 90 && (!wild || d < wild.d)) wild = { a, d };
    }
    if (wild) {
      const garden = inGarden(wild.a.x, wild.a.y) || inGarden(P.x, P.y);
      const p = garden ? L.vertreiben : L.jagen;
      if (R() < p * (0.6 + D.char.eifer * 0.4)) {
        D.task = { kind: garden ? 'vertreiben' : 'jagen', a: wild.a, t0: D.t };
        D.mode = D.task.kind;
        bark(2);
        return;
      }
    }
    // the goats out on the paddock and you near them: he gathers them by the shelter
    const pad = [(PAD.x0 + PAD.x1) / 2, (PAD.y0 + PAD.y1) / 2];
    if (Math.hypot(P.x - pad[0], P.y - pad[1]) < 45 && GOATS.length && R() < L.hueten * 0.7) {
      D.task = { kind: 'hueten', t0: D.t, ang: 0 };
      D.mode = 'hueten';
      return;
    }
    // a neighbour close: bark at him, or stay calm
    for (const k of ['hubert', 'ronald']) {
      const w = NPCS[k];
      if (!w || !Number.isFinite(w.x)) continue;
      if (Math.hypot(w.x - D.x, w.y - D.y) < 7 && D.t - (D.metAt || -99) > 40) {
        D.metAt = D.t;
        if (R() > L.ruhe) {
          D.task = { kind: 'bellen', who: w, t0: D.t };
          D.mode = 'bellen';
          bark(3);
        } else act('ruhig');
        return;
      }
    }
    // a sign near that you have not found: he noses it out and shows you
    if (TEINFLUSS.E.signs && R() < L.suchen * 0.5) {
      let best = null;
      for (const s of TEINFLUSS.E.signs) {
        if (TIERE.found[s.kind] !== undefined || s.kind === 'horst' || s.kind === 'kaeferbaum') continue;
        const d = Math.hypot(s.x - D.x, s.y - D.y);
        if (d < 30 && (!best || d < best.d)) best = { s, d };
      }
      if (best) {
        D.task = { kind: 'suchen', s: best.s, t0: D.t };
        D.mode = 'suchen';
      }
    }
  }
  // ---------- commands ----------
  function cmdRufen() {
    // a dog chasing game comes back when the bond is strong and the hunting urge weak
    const chasing = D.mode === 'jagen' || D.mode === 'vertreiben';
    const obeys = !chasing || Math.random() < 0.45 + D.char.bindung * 0.5 - D.learn.jagen * 0.3;
    TTON.play('pfiff', P.x, P.y, { vol: 0.7 });
    if (obeys) {
      if (chasing) act('kommen');
      D.mode = 'follow';
      D.task = null;
      say(chasing ? D.name + ' lässt ab und kommt.' : D.name + ' kommt.');
    } else say(D.name + ' hört nicht – er ist auf der Spur.');
    KERN.emit('hund:befehl', { befehl: 'rufen', folgt: obeys });
    return obeys;
  }
  // sent to a point: what is there decides what he does
  function cmdSchicken(x, y) {
    if (!Number.isFinite(x)) {
      const r = (P.yaw * Math.PI) / 180;
      x = P.x + Math.sin(r) * 25;
      y = P.y + Math.cos(r) * 25;
    }
    D.task = { kind: 'gehen', x, y, t0: D.t };
    D.mode = 'gehen';
    say(D.name + ', voran!');
    KERN.emit('hund:befehl', { befehl: 'schicken', x, y });
  }
  // praise or scolding: about what he did in the last quarter minute
  function lob(sign) {
    const r = D.recent && D.t - D.recent.t < 15 ? D.recent : null;
    D.mood = sign > 0 ? 1 : -1;
    D.moodT = D.t;
    D.char.bindung = clamp01(D.char.bindung + (sign > 0 ? 0.03 : -0.02));
    let txt;
    if (r && ACTS[r.kind]) {
      const A = ACTS[r.kind];
      if (A.k) {
        const k = A.k,
          up = sign * A.s > 0,
          v = D.learn[k];
        D.learn[k] = clamp01(up ? v + 0.14 * (1 - v) : v - 0.16 * v);
        txt =
          (sign > 0 ? 'Gelobt' : 'Getadelt') +
          ': ' +
          D.name +
          ' hat ' +
          A.txt +
          ' – ' +
          (up ? 'das macht er jetzt öfter.' : 'das lässt er künftig eher.');
      } else
        txt =
          sign > 0
            ? D.name + ' freut sich – er kommt gern zu dir.'
            : D.name + ' versteht nicht, was er falsch gemacht hat.';
      KERN.emit('hund:gelernt', { tat: r.kind, lob: sign > 0, learn: Object.assign({}, D.learn) });
    } else txt = sign > 0 ? D.name + ' wedelt.' : D.name + ' legt die Ohren an.';
    save();
    say(txt);
    return txt;
  }
  function say(t) {
    if (PLAY.think) PLAY.think(t, 3800);
    const el = $('#hund-st');
    if (el) el.textContent = t;
  }
  // ---------- the frame ----------
  let lastP = null;
  function update(dt) {
    if (!D.on || !ready) return;
    dt = Math.min(dt, 0.1);
    D.t += dt;
    const car = VEH && VEH.cur;
    // in a vehicle he rides along (out of sight) and jumps out with you
    if (car) {
      if (D.mode !== 'home') D.rideOn = true;
      if (D.model) D.model.g.visible = false;
      lastP = null;
      panel(false);
      return;
    }
    if (P.mode !== 'walk') {
      panel(false);
      return;
    }
    const A = model();
    A.g.visible = true;
    // a jump to another place (menu, scene) or getting out of the car: he comes along
    if (D.mode !== 'home' && (D.rideOn || (lastP && Math.hypot(P.x - lastP[0], P.y - lastP[1]) > 40))) {
      const s = slot();
      D.x = s[0];
      D.y = s[1];
      D.v = 0;
      D.rideOn = false;
      D.mode = 'follow';
      D.task = null;
    }
    lastP = [P.x, P.y];
    let tx = D.x,
      ty = D.y,
      want = 0;
    const dP = Math.hypot(P.x - D.x, P.y - D.y);
    const T = D.task;
    if (D.mode === 'follow') {
      const s = slot(),
        dS = Math.hypot(s[0] - D.x, s[1] - D.y);
      tx = s[0];
      ty = s[1];
      // the walker's pace plus a catch-up for the gap (no hurry close by, a gallop far behind)
      want = dS < 0.6 && P.speed < 0.3 ? 0 : Math.min(9, (P.speed || 0) + 1.3 * Math.max(0, dS - 0.4));
      if (dS > 12) want = Math.max(want, 7);
      if (dP < 1.0) want = 0;
      D.decideT += dt;
      if (D.decideT > 2.5) {
        D.decideT = 0;
        decide();
      }
    } else if (D.mode === 'home') {
      tx = D.home[0];
      ty = D.home[1];
      const dH = Math.hypot(tx - D.x, ty - D.y);
      want = dH < 0.5 ? 0 : dH < 5 ? 1.2 : 3.5;
    } else if ((D.mode === 'vertreiben' || D.mode === 'jagen') && T) {
      // after the animal, barking; driving off ends when it is out of the garden, a chase when it is far or after a while
      const a = T.a;
      tx = a.x;
      ty = a.y;
      want = 9.5;
      if (Math.random() < dt * 1.5) bark(1);
      const away =
        D.mode === 'vertreiben' ? !inGarden(a.x, a.y) && Math.hypot(a.x - GARDEN[0], a.y - GARDEN[1]) > 80 : false;
      const gone = !TIERE.live.includes(a) || Math.hypot(a.x - D.x, a.y - D.y) > 70;
      if (away || gone || D.t - T.t0 > (D.mode === 'jagen' ? 16 : 12)) {
        act(D.mode);
        D.mode = 'follow';
        D.task = null;
      }
    } else if (D.mode === 'hueten' && T) {
      // round the goats in wide arcs, crouching; they gather at the hay rack by the shelter
      const gx = GOATS.reduce((s, g) => s + g.x, 0) / GOATS.length,
        gy = GOATS.reduce((s, g) => s + g.y, 0) / GOATS.length;
      T.ang += dt * 0.55;
      tx = gx + Math.cos(T.ang) * 7;
      ty = gy + Math.sin(T.ang) * 7;
      want = 4;
      GOATLURE.x = PAD.rack[0];
      GOATLURE.y = PAD.rack[1];
      GOATLURE.r = 2.5;
      GOATLURE.until = performance.now() / 1000 + 4;
      if (D.t - T.t0 > 22) {
        act('hueten');
        D.mode = 'follow';
        D.task = null;
      }
    } else if (D.mode === 'bellen' && T) {
      tx = T.who.x + 1.2;
      ty = T.who.y;
      want = 2;
      if (Math.random() < dt * 2) bark(1);
      if (D.t - T.t0 > 4) {
        act('bellen');
        D.mode = 'follow';
        D.task = null;
      }
    } else if (D.mode === 'suchen' && T) {
      // nose down to the sign, then sits by it and barks once: look here
      tx = T.s.x;
      ty = T.s.y;
      const d = Math.hypot(tx - D.x, ty - D.y);
      want = d > 2 ? 3 : 0;
      if (d <= 2 && !T.found) {
        T.found = D.t;
        bark(1);
        const sp = TARTEN.SPUREN[T.s.kind];
        say(D.name + ' hat etwas gefunden' + (sp ? ': ' + sp.title + '.' : '.') + ' Geh hin und schau es dir an.');
        act('suchen');
      }
      if ((T.found && D.t - T.found > 8 && dP < 6) || D.t - T.t0 > 40) {
        D.mode = 'follow';
        D.task = null;
      }
    } else if (D.mode === 'gehen' && T) {
      // sent: at the point he looks what is there – game to drive off, the goats, else he searches round about
      tx = T.x;
      ty = T.y;
      const d = Math.hypot(tx - D.x, ty - D.y);
      want = d > 1.5 ? 6 : 0;
      if (d <= 3) {
        let a = null;
        for (const b of TIERE.live) if (!b.bird && Math.hypot(b.x - D.x, b.y - D.y) < 60) a = b;
        if (a) {
          D.task = { kind: inGarden(a.x, a.y) ? 'vertreiben' : 'jagen', a, t0: D.t };
          D.mode = D.task.kind;
        } else if (Math.hypot(T.x - PAD.rack[0], T.y - PAD.rack[1]) < 30 && GOATS.length) {
          D.task = { kind: 'hueten', t0: D.t, ang: 0 };
          D.mode = 'hueten';
        } else {
          let best = null;
          for (const s of TEINFLUSS.E.signs || []) {
            const ds = Math.hypot(s.x - D.x, s.y - D.y);
            if (ds < 25 && s.kind !== 'horst' && (!best || ds < best.d)) best = { s, d: ds };
          }
          if (best) {
            D.task = { kind: 'suchen', s: best.s, t0: D.t };
            D.mode = 'suchen';
          } else {
            say(D.name + ' schnüffelt herum – hier ist nichts.');
            D.mode = 'follow';
            D.task = null;
          }
        }
      }
      if (T && D.t - T.t0 > 45) {
        D.mode = 'follow';
        D.task = null;
      }
    }
    // steering and speed
    const dx = tx - D.x,
      dy = ty - D.y,
      dist = Math.hypot(dx, dy);
    if (dist > 0.25 && want > 0) {
      const az = (Math.atan2(dx, dy) * 180) / Math.PI;
      const d = ((az - D.az + 540) % 360) - 180,
        turn = (D.v > 3 ? 220 : 300) * dt;
      D.az += Math.max(-turn, Math.min(turn, d));
    } else if (want === 0 && dP < 6) {
      // standing: he looks to you
      const az = (Math.atan2(P.x - D.x, P.y - D.y) * 180) / Math.PI;
      const d = ((az - D.az + 540) % 360) - 180;
      if (Math.abs(d) > 50) D.az += Math.max(-90 * dt, Math.min(90 * dt, d));
    }
    D.v += Math.max(-10 * dt, Math.min(6 * dt, want - D.v));
    if (D.v < 0.02) D.v = 0;
    const r = (D.az * Math.PI) / 180,
      nx = D.x + Math.sin(r) * D.v * dt,
      ny = D.y + Math.cos(r) * D.v * dt;
    const p = [nx, ny];
    const gz = KERN.ground(nx, ny);
    if (Math.abs(nx) < 50 && Math.abs(ny) < 55) collide(p, gz, true);
    else if (KERN.pushOut) KERN.pushOut(p, 0.28);
    D.x = p[0];
    D.y = p[1];
    // still: sit after a few seconds, lie down after half a minute; praised he wags hard, scolded he lies flat with the ears back
    D.still = D.v < 0.05 ? D.still + dt : 0;
    const moodNow = D.moodT !== undefined && D.t - D.moodT < 4 ? D.mood : 0;
    const sit = (D.still > 2.5 && D.still < 28) || D.mode === 'suchen' ? 1 : 0,
      lie = D.still >= 28 || moodNow < 0 ? 1 : 0;
    D.wag = moodNow > 0 ? 1 : lie ? 0.15 : dP < 4 ? 0.9 : D.v > 3 ? 0.25 : 0.5;
    // a little life when he waits: looking round, now and then
    const look = D.v < 0.05 ? Math.sin(D.t * 0.37) * 0.5 * (Math.sin(D.t * 0.11) > 0.3 ? 1 : 0.2) : 0;
    const L = 0.35,
      fx = D.x + Math.sin(r) * L,
      fy = D.y + Math.cos(r) * L,
      bx = D.x - Math.sin(r) * L,
      by = D.y - Math.cos(r) * L,
      zf = KERN.ground(fx, fy),
      zb = KERN.ground(bx, by);
    D.z = (zf + zb) / 2;
    A.g.position.set(D.x, D.z, -D.y);
    A.g.rotation.order = 'YXZ';
    A.g.rotation.y = Math.PI - r;
    A.g.rotation.x = -Math.atan2(zf - zb, 2 * L);
    A.anim(dt, D.v, {
      sit,
      lie,
      wag: D.wag,
      look,
      graze: D.mode === 'suchen' && D.v > 0.2 ? 0.7 : 0,
      alert: D.v < 0.05 && !lie ? 0.4 : D.mode === 'bellen' ? 1 : 0,
      flee: moodNow < 0 ? 0.8 : 0,
    });
    if ((D.v > 0.05 || D.wag > 0.3) && dP < 60 && inView(D.x, D.y, D.z + 0.4)) {
      const now = performance.now() / 1000;
      if (now - D.drawT > (RENDER.hq ? 1 / 40 : 1 / 20)) {
        D.drawT = now;
        markDirty();
      }
    }
    panel(dP < 40 && !(window.ZSTATE && ZSTATE.on));
  }
  // ---------- the buttons (keys P, U, +, −; on a phone these four) ----------
  let pEl = null;
  function panel(show) {
    if (!show) {
      if (pEl) pEl.hidden = true;
      return;
    }
    if (!pEl) {
      const st = document.createElement('style');
      st.textContent =
        '#hund-panel{position:fixed;right:10px;bottom:120px;z-index:30;display:flex;flex-direction:column;gap:6px;align-items:flex-end;' +
        'font:13px/1.25 system-ui,sans-serif;pointer-events:none}#hund-panel .hb{display:flex;gap:6px;pointer-events:auto}' +
        '#hund-panel button{min-width:44px;min-height:40px;border-radius:10px;border:1px solid rgba(255,255,255,.35);' +
        'background:rgba(20,22,18,.62);color:#fff;font:600 13px system-ui,sans-serif;padding:4px 10px;cursor:pointer}' +
        '#hund-panel button:active{background:rgba(80,90,60,.8)}#hund-st{max-width:260px;background:rgba(20,22,18,.55);color:#f2efe6;' +
        'padding:4px 8px;border-radius:8px;text-align:right}#hund-st:empty{display:none}' +
        'body[data-clean="1"] #hund-panel{display:none}';
      document.head.appendChild(st);
      pEl = document.createElement('div');
      pEl.id = 'hund-panel';
      pEl.innerHTML =
        '<div id="hund-st"></div><div class="hb"><button data-h="rufen" title="Rufen (P)">Rufen</button>' +
        '<button data-h="schicken" title="Schicken (U): dahin, wo du hinschaust">Schicken</button></div>' +
        '<div class="hb"><button data-h="lob" title="Loben (+)">Loben</button><button data-h="tadel" title="Tadeln (−)">Tadeln</button></div>';
      pEl.addEventListener('click', e => {
        const b = e.target.closest('button');
        if (!b) return;
        e.stopPropagation();
        const h = b.dataset.h;
        if (h === 'rufen') cmdRufen();
        else if (h === 'schicken') cmdSchicken();
        else lob(h === 'lob' ? 1 : -1);
      });
      document.body.appendChild(pEl);
    }
    pEl.hidden = false;
  }
  window.addEventListener('keydown', e => {
    if (['INPUT', 'TEXTAREA', 'SELECT'].includes(document.activeElement?.tagName)) return;
    if (!D.on || P.mode !== 'walk' || (VEH && VEH.cur) || !D.model || !D.model.g.visible) return;
    if (window.ZSTATE && ZSTATE.on) return;
    const k = e.key;
    if (k === 'p' || k === 'P') cmdRufen();
    else if (k === 'u' || k === 'U') cmdSchicken();
    else if (k === '+' || e.code === 'NumpadAdd') lob(1);
    else if (k === '-' || e.code === 'NumpadSubtract') lob(-1);
  });
  let ready = false;
  whenLoaded(() => {
    load();
    // he starts beside the walker
    D.x = P.x - 1.6;
    D.y = P.y - 1.2;
    ready = true;
  });
  KERN.tick(update, 'hund');
  // wildlife flees from him (tiere/tiere.js): at heel he counts with the walker, running free or chasing on his own
  TIERE.dog = () => (D.model && D.model.g.visible ? [D.x, D.y, D.mode === 'jagen' || D.mode === 'vertreiben'] : null);
  KERN.on('reset', () => {
    D.learn = Object.assign({}, DEF);
    D.char.bindung = 0.5;
    save();
  });
  Object.assign(D, {
    update,
    save,
    lob,
    rufen: cmdRufen,
    schicken: cmdSchicken,
    act,
    decide,
    state: () => ({
      name: D.name,
      x: +D.x.toFixed(2),
      y: +D.y.toFixed(2),
      z: +D.z.toFixed(2),
      v: +D.v.toFixed(2),
      mode: D.mode,
      still: +D.still.toFixed(1),
      visible: !!(D.model && D.model.g.visible),
      learn: Object.fromEntries(Object.entries(D.learn).map(([k, v]) => [k, +v.toFixed(3)])),
      bindung: +D.char.bindung.toFixed(3),
      recent: D.recent ? D.recent.kind : null,
      dist: +Math.hypot(P.x - D.x, P.y - D.y).toFixed(2),
    }),
  });
  return D;
})();
window.HUND = HUND;
