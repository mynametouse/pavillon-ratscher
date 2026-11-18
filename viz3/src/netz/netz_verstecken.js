// ===================== feat/mehrspieler: the first game for friends – hide and seek in the village („Verstecken im Dorf“, NVERSTECK) =====================
// The host starts a round in the room (netz/netz.js): one seeks, the others hide – in the 230 houses one can enter, behind sheds, in the
// wood of the Klinge. 30 s the seeker counts (the screen dark, he cannot move), then he has five minutes; when he stands by somebody
// (3 m, both outside or in the same house) the action button says „Sarah gefunden!“. While seeking nobody's name hangs over his head.
// The host keeps the round (netz/netz_logik.js vsNew … – pure, tested in node) and sends it to all with the seconds left; a claim of
// the seeker is checked on the host against both players' last states. All found or the time up: who won, and „Nochmal“ – the first
// found seeks next.
//   NVERSTECK.start(seekerPid?) (host) · stop() · st (the round as this browser has it) · claim(pid)
import { KERN } from '../core/kern.js';
import { markDirty } from '../core/assets.js';
import { stage } from '../core/head.js';
import { P } from '../game/walkable.js';
import { PLAY } from '../game/play.js';
import { NETZLOGIK as L } from './netz_logik.js';
import { NETZ } from './netz.js';
import { NAVATAR } from './netz_avatar.js';
export const NVERSTECK = (() => {
  const S = { st: null, lock: null, el: null, dark: null, lastTxt: '', claims: 0, err: null, sendT: 0, endT: 0 };
  const meId = () => NAVATAR.pid;
  const nameOf = pid => (pid === meId() ? NAVATAR.name() : (NETZ.byPid(pid) || {}).name || 'Jemand');
  const isHost = () => NETZ.on && NETZ.role === 'host';
  const t = () => Date.now();
  // ---- the host: start, keep, end ----
  // o: { zaehlen, suchen } in seconds (the tests count shorter)
  function start(seekerPid, o = {}) {
    if (!isHost()) return false;
    const pids = [meId(), ...NETZ.list().map(p => p.pid)];
    if (pids.length < 2) {
      PLAY.think('Zum Verstecken braucht es mindestens zwei.', 2600);
      return false;
    }
    const seeker = seekerPid && pids.includes(seekerPid) ? seekerPid : L.vsNext(S.st, pids);
    S.st = L.vsNew(pids, seeker, t(), { n: S.st ? S.st.n : 0, zaehlen: o.zaehlen, suchen: o.suchen });
    send();
    apply();
    return true;
  }
  function stop() {
    if (!S.st) return;
    if (isHost()) {
      S.st.phase = 'ende';
      S.st.end = { alle: false, weg: true, s: 0 };
      send();
    }
    S.st = null;
    apply();
  }
  const send = () => NETZ.spiel(L.vsWire(S.st, t()));
  // the seeker's claim: checked here with the two states the host has
  function judge(by, pid) {
    if (!S.st || S.st.phase !== 'suchen' || by !== S.st.seeker) return;
    const a = NETZ.stateOf(by),
      b = NETZ.stateOf(pid);
    // (a little more room than the seeker's own 3 m: the host's copy of the two lags a tenth of a second)
    const ok =
      a &&
      b &&
      (a.inn || null) === (b.inn || null) &&
      Math.hypot(a.x - b.x, a.y - b.y) <= 4.5 &&
      Math.abs(a.z - b.z) <= 3;
    if (ok && L.vsFound(S.st, pid, t())) {
      send();
      apply();
    }
  }
  KERN.on('netz:spiel', e => {
    if (!e || !e.d) return;
    const d = e.d;
    if (d.fund && isHost()) return judge(e.from, String(d.fund));
    if (d.v === 1 && !isHost()) {
      const st = L.vsFromWire(d, t());
      if (!st) return;
      S.st = st;
      apply();
    }
  });
  // somebody left: out of the round (the host tells the others)
  KERN.on('netz:peer', e => {
    if (!S.st || !e || e.k !== 'weg' || !isHost()) return;
    L.vsLeave(S.st, e.pid, t());
    send();
    apply();
  });
  KERN.on('netz:close', () => {
    S.st = null;
    apply();
  });
  // ---- every browser: what the round means here ----
  const role = () =>
    !S.st ? null : S.st.seeker === meId() ? 'sucher' : S.st.hiders.includes(meId()) ? 'versteckt' : 'zuschauer';
  const found = pid => !!(S.st && S.st.found.some(f => f.pid === pid));
  // the names: none while seeking, except the found ones' and the seeker's for those already found
  NETZ.labelRule = p => {
    if (!S.st || S.st.phase !== 'suchen') return true;
    if (found(p.pid)) return true;
    return found(meId()) || role() === 'zuschauer' ? true : false;
  };
  // the seeker: near somebody not yet found → the action button
  function nearest() {
    if (role() !== 'sucher' || S.st.phase !== 'suchen') return null;
    const a = L.stClean(NETZ.me());
    let best = null,
      bd = 1e9;
    for (const q of NETZ.list()) {
      if (!S.st.hiders.includes(q.pid) || found(q.pid) || !q.st) continue;
      if (!L.vsCanFind(a, q.st)) continue;
      const d = Math.hypot(a.x - q.st.x, a.y - q.st.y);
      if (d < bd) {
        bd = d;
        best = q;
      }
    }
    return best;
  }
  KERN.act({
    id: 'netz:verstecken',
    r: 3.4,
    prio: 0.97,
    pos: () => {
      const q = nearest();
      return q ? [q.st.x, q.st.y, q.st.z + 1] : [0, 0, -9999];
    },
    label: () => {
      const q = nearest();
      return q ? q.name + ' gefunden!' : null;
    },
    run: () => {
      const q = nearest();
      if (q) claim(q.pid);
    },
  });
  function claim(pid) {
    S.claims++;
    if (isHost()) judge(meId(), pid);
    else NETZ.spiel({ fund: pid }, NETZ.hostPid);
    PLAY.think('Gefunden: ' + nameOf(pid) + '!', 2000);
  }
  // ---- the screen: a bar at the top, dark while the seeker counts ----
  const CSS = `#nzvs{position:absolute;left:50%;top:58px;transform:translateX(-50%);z-index:30;pointer-events:none;max-width:min(92vw,560px);
    background:rgba(18,28,40,.82);color:#fff;border-radius:12px;padding:9px 14px;font:600 14px/1.35 var(--f-body,system-ui);text-align:center;
    box-shadow:0 6px 24px rgba(0,0,0,.25)} #nzvs small{display:block;font-weight:500;opacity:.82;font-size:12.5px;margin-top:2px}
    #nzvs[hidden],#nzvsd[hidden]{display:none} #nzvs .nzvb{pointer-events:auto;margin:8px 4px 0;font:600 13px/1 var(--f-body,system-ui);padding:8px 12px;border-radius:8px;border:0;background:#2f88d8;color:#fff;cursor:pointer}
    #nzvsd{position:absolute;inset:0;z-index:29;background:#05080c;color:#fff;display:flex;align-items:center;justify-content:center;flex-direction:column;
    font:600 22px/1.3 var(--f-body,system-ui);text-align:center;pointer-events:auto} #nzvsd b{font-size:56px;display:block;margin:8px 0}`;
  function ui() {
    if (S.el) return;
    const st = document.createElement('style');
    st.textContent = CSS;
    document.head.appendChild(st);
    const host = document.getElementById('p-3d') || stage || document.body;
    S.el = document.createElement('div');
    S.el.id = 'nzvs';
    S.el.hidden = true;
    S.dark = document.createElement('div');
    S.dark.id = 'nzvsd';
    S.dark.hidden = true;
    host.appendChild(S.dark);
    host.appendChild(S.el);
    S.el.addEventListener('click', e => {
      const b = e.target.closest('button');
      if (!b) return;
      if (b.dataset.vs === 'nochmal') start();
      else if (b.dataset.vs === 'ende') stop();
    });
  }
  function apply() {
    ui();
    markDirty();
    S.lastTxt = '';
    render();
  }
  function render() {
    const st = S.st,
      r = role();
    if (!st) {
      S.el.hidden = true;
      S.dark.hidden = true;
      S.lock = null;
      return;
    }
    const left = L.vsLeft(st, t()),
      seekerName = nameOf(st.seeker),
      nH = st.hiders.length,
      nF = st.found.length;
    let html = '',
      dark = false;
    if (st.phase === 'zaehlen') {
      if (r === 'sucher') {
        dark = true;
        html = '';
        S.dark.innerHTML = 'Augen zu und zählen!<b>' + left + '</b>Die anderen verstecken sich.';
      } else html = 'Versteck dich! Noch ' + left + ' s<small>' + seekerName + ' zählt – dann wird gesucht.</small>';
    } else if (st.phase === 'suchen') {
      const m = L.mmss(left);
      if (r === 'sucher')
        html = 'Such sie! ' + m + '<small>' + nF + ' von ' + nH + ' gefunden – stell dich daneben und drück E.</small>';
      else if (found(meId()))
        html = 'Gefunden! ' + m + '<small>' + seekerName + ' sucht noch ' + (nH - nF) + '.</small>';
      else if (r === 'versteckt')
        html = 'Gut versteckt? ' + m + '<small>' + seekerName + ' sucht – ' + nF + ' von ' + nH + ' gefunden.</small>';
      else html = 'Verstecken läuft ' + m + '<small>' + seekerName + ' sucht.</small>';
    } else {
      const E = st.end || {};
      const rest = st.hiders.filter(p => !found(p)).map(nameOf);
      const head = E.weg
        ? 'Verstecken beendet.'
        : E.alle
          ? seekerName + ' hat alle gefunden – in ' + L.mmss(Math.max(0, E.s)) + '!'
          : 'Zeit um! Nicht gefunden: ' + rest.join(', ') + '.';
      html =
        head +
        '<small>' +
        (st.found.length ? 'Zuerst gefunden: ' + nameOf(st.found[0].pid) + ' – sucht als Nächstes.' : '') +
        '</small>';
      if (isHost())
        html +=
          '<button class="nzvb" data-vs="nochmal">Nochmal</button><button class="nzvb" data-vs="ende">Fertig</button>';
    }
    if (html !== S.lastTxt) {
      S.el.innerHTML = html;
      S.lastTxt = html;
    }
    S.el.hidden = !html;
    S.dark.hidden = !dark;
    // the seeker stays where he counts
    if (dark && !S.lock) S.lock = [P.x, P.y, P.feet];
    if (!dark) S.lock = null;
  }
  KERN.tick(
    dt => {
      if (!S.st) return;
      if (isHost()) {
        const was = S.st.phase;
        L.vsStep(S.st, t());
        S.sendT -= dt;
        if (S.st.phase !== was || S.sendT <= 0) {
          S.sendT = 5;
          send();
        }
      } else L.vsStep(S.st, t()); // (the guest's copy moves on with its own clock; the host's next message settles it)
      // the end stays a while: 15 s for the others, a minute for the host's buttons; a round stopped by the host goes at once
      if (S.st.phase === 'ende') {
        if (!S.endT) S.endT = t();
        const keepFor = S.st.end && S.st.end.weg && S.st.end.s === 0 ? 4000 : isHost() ? 60000 : 15000;
        if (t() - S.endT > keepFor) {
          S.st = null;
          S.endT = 0;
          return apply();
        }
      } else S.endT = 0;
      render();
      if (S.lock) {
        P.x = S.lock[0];
        P.y = S.lock[1];
        P.feet = S.lock[2];
      }
    },
    'netz/verstecken',
    { late: true }
  );
  return Object.assign(S, { start, stop, claim, role });
})();
window.NVERSTECK = NVERSTECK;
