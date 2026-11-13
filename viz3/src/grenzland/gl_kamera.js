// ===================== feat/grenzland-kino: talks as cutscenes – a camera that frames the speakers, letterbox, cuts (GLKAMERA) =====================
// Falko (13.11.2026 11:25, package B „Kino-Gefühl“). When a talk of the missions runs and the player stands (GLMISSION decides with
// darf()), the follow camera gives way to a film camera: a two-shot of the group to open – side-on, at eye height –, then for each line
// a cut to the speaker: over the shoulder of the listener, or a medium close-up of the speaker's face; the camera stays on one side of
// the line between the player's party and the people they talk to (the 180° rule), long lines get a slow push-in. Black bars come from
// GLHUD.kino (the lead) – drawn here as long as that is missing. The player cannot walk away (walk keys and the touch stick are held,
// the position is kept after the walk physics); Space, Enter, E or a tap say the next line, Esc skips the rest of the talk. People face
// whom they talk to; the others look at the speaker (GLFIG.blick, agent figuren, when it is there). Afterwards the camera blends back to
// the follow camera in 0.6 s.
// The camera is set where the game sets it: the game's applyCam (game/camera.js) asks the vehicles first (VEH.applyCam) – that hook is
// wrapped while the mode runs and handed back on stop; nothing of the base files changes.
//   GLKAMERA.darf(lines, key, figOf) → may this talk be a cutscene · start({ lines, key, figOf, weiter, skip }) → true when it runs
//   zeile(i, who, sec) a line begins (the cut) · ende() the talk is over · tick(dt) after the walk physics · weg() the player was put
//   elsewhere (no blend) · stop() everything back · on() · info() (tests) · BARK: talks that never become cutscenes (shouts of the action)
import * as THREE from 'three';
import { cam, COARSE, stage, V } from '../core/head.js';
import { KERN } from '../core/kern.js';
import { markDirty } from '../core/assets.js';
import { P } from '../game/walkable.js';
import { CAM3 } from '../game/player.js';
import { applyCam } from '../game/camera.js';
import { PLAY } from '../game/play.js';
import { VEH } from '../vehicles/vehicle.js';
import { GLDATA } from './gl_data.js';
import { GL } from './gl_state.js';
import { GLLOGIK } from './gl_logik.js';
import { GLFIG } from './gl_fig.js';
import { GLHUD } from './gl_hud.js';
import { GLFAHNDUNG } from './gl_fahndung.js';
export const GLKAMERA = (() => {
  const hyp = Math.hypot,
    PI = Math.PI;
  // talks that are shouts in the middle of the action: never a cutscene (the guards, the battery, the flare)
  const BARK = new Set([
    'knall',
    'entdeckt',
    'verlorenWache',
    'leucht',
    'batterie',
    'wacheSieht',
    'wacheFunk',
    'verloren',
    'bus',
    'anhalter',
    'radio',
    'kisteDa',
    'stroh',
    'tuerAuf',
    'karteDa',
  ]);
  const S = {
    on: false, // a cutscene runs
    talk: null, // { lines, key, figOf, weiter, skip }
    who: [], // the people in the picture: { id, F ('P': the player), party: 0 the player's, 1 the others, hd0 }
    ax: [0, 1], // the line between the parties (unit, compass plane): from the player's party to the others
    N: [1, 0], // the camera's side of it
    shot: null, // { kind, p0, p1, t0, t1, fov, T, t }
    lock: null, // { x, y, body }
    lastWho: '',
    run: 0, // tight shots in a row
    n: 0, // cuts in this cutscene
    endT: -1, // the talk ended: the cutscene ends after this (a talk that follows at once goes on in the same cutscene)
    blend: null, // { p, q, fov, t } back to the follow camera
    inner: false,
    hook: null, // the vehicles' own applyCam while ours is in
    view: null, // the player's view setting while the cutscene shows his figure
    bars: null,
    tipp: null,
    css: false,
    keys: false,
    lineT: 0, // seconds since the line began (taps right after a cut are not counted)
    insertT: 0, // an insert's seconds left
    cur: null, // the line said now: { i, who, sec }
    turn: [], // figures turning smoothly: { F, hd }
    stats: { cuts: 0, kinds: {}, n: 0 },
    nein: '', // why the last talk was no cutscene (tests)
  };
  // ---------------- who is where ----------------
  const _h = new THREE.Vector3();
  const playerId = () => (GL.era === '1989' ? '' : GL.wer === 'f' ? 'sarah' : 'falko');
  // the eyes of somebody (site metres): the head bone where the figure has one, else from the height of the cast
  function kopf(F) {
    if (F === 'P') {
      const A = window.AVATAR,
        f = A && A.fig,
        H = f && f.B && f.B.Head;
      if (H)
        try {
          H.getWorldPosition(_h);
          if (Number.isFinite(_h.x) && hyp(_h.x - P.x, -_h.z - P.y) < 1.5) return [_h.x, -_h.z, _h.y + 0.07];
        } catch (e) {}
      return [P.x, P.y, P.feet + (P.eyeH || 1.6)];
    }
    const H = F.f && F.f.bones && F.f.bones.Head;
    if (H)
      try {
        H.getWorldPosition(_h);
        if (Number.isFinite(_h.x) && hyp(_h.x - F.x, -_h.z - F.y) < 1.5) return [_h.x, -_h.z, _h.y + 0.07];
      } catch (e) {}
    const c = GLDATA.CAST[F.id];
    return [F.x, F.y, F.z + ((c && c.h) || 1.75) * (F.sitzt ? 0.62 : 0.93)];
  }
  const posOf = F => (F === 'P' ? [P.x, P.y] : [F.x, F.y]);
  const sterne = () => {
    try {
      return GLLOGIK.stars(GL.W) | 0;
    } catch (e) {
      return 0;
    }
  };
  // ---------------- may a talk be a cutscene? ----------------
  // the player stands (or sits still on his moped: he gets off), no chase, nothing else on the screen, two lines or more, and somebody
  // of the talk stands near enough to be filmed
  function darf(lines, key, figOf) {
    const nein = w => {
      S.nein = w;
      return false;
    };
    try {
      if (!GL.on || window.GLKINO_AUS) return nein('aus');
      if (!lines || lines.length < 2 || (key && BARK.has(key))) return nein('ruf');
      if (P.mode !== 'walk') return nein('modus');
      if (PLAY.seated()) return nein('sitzt');
      if (sterne() > 0) return nein('sterne');
      const v = VEH.cur;
      if (v && (v.id !== 'gl-moped' || hyp(v.st.u || 0, v.st.v || 0) > 1.2)) return nein('faehrt');
      const fade = document.getElementById('glfade'),
        bust = document.getElementById('glbust'),
        wahl = document.getElementById('glwahl');
      if (fade && fade.classList.contains('on')) return nein('blende');
      if ((bust && !bust.hidden) || (wahl && !wahl.hidden)) return nein('tafel');
      const me = playerId();
      const w = GLFAHNDUNG.wo();
      // (on a moped standing still the other one of the two rides along: she gets off with the player)
      let mit = null;
      try {
        mit = v && window.GRENZLAND && window.GRENZLAND.partnerOf ? window.GRENZLAND.partnerOf() : null;
      } catch (e) {}
      const da = lines.some(([who]) => {
        if (!who || who === me) return false;
        if (mit && mit.rides && mit.id === who) return true;
        const F = figOf(who);
        return !!F && !!F.g && F.g.visible && hyp(F.x - w.x, F.y - w.y) < 14;
      });
      S.nein = da ? '' : 'niemand';
      return da;
    } catch (e) {
      return nein('fehler ' + ((e && e.message) || e));
    }
  }
  // ---------------- the stage of a cutscene ----------------
  function besetzen(lines, figOf) {
    const me = playerId(),
      who = [{ id: me || 'ich', F: 'P', party: 0 }],
      seen = new Set([me]);
    // the other one of the two, if near
    let partner = null;
    try {
      partner = window.GRENZLAND && window.GRENZLAND.partnerOf ? window.GRENZLAND.partnerOf() : null;
    } catch (e) {}
    if (partner && partner.g && partner.g.visible && !partner.rides && hyp(partner.x - P.x, partner.y - P.y) < 12) {
      who.push({ id: partner.id, F: partner, party: 0 });
      seen.add(partner.id);
    }
    for (const [id] of lines) {
      if (!id || seen.has(id)) continue;
      seen.add(id);
      const F = figOf(id);
      if (F && F.g && F.g.visible && !F.partner && hyp(F.x - P.x, F.y - P.y) < 14) who.push({ id, F, party: 1 });
    }
    // only the two of them talk: the partner is the other side
    if (!who.some(q => q.party === 1) && who.length > 1) who[1].party = 1;
    for (const q of who) q.hd0 = q.F === 'P' ? P.body : q.F.hd;
    return who;
  }
  const mitte = (L, party) => {
    const q = L.filter(e => e.party === party);
    if (!q.length) return null;
    let x = 0,
      y = 0;
    for (const e of q) {
      const p = posOf(e.F);
      x += p[0];
      y += p[1];
    }
    return [x / q.length, y / q.length];
  };
  // the player at talking distance: walked up too close or stopped too far, he is put two metres off the main person (the cut hides it)
  function aufstellen(main) {
    const m = posOf(main.F),
      d = hyp(P.x - m[0], P.y - m[1]);
    if (d > 1.3 && d < 3.2) return;
    if (d > 9) return;
    const ux = d > 0.01 ? (P.x - m[0]) / d : 0,
      uy = d > 0.01 ? (P.y - m[1]) / d : 1,
      q = [m[0] + ux * 2.1, m[1] + uy * 2.1];
    try {
      KERN.pushOut(q, 0.4);
    } catch (e) {}
    const z = KERN.ground(q[0], q[1], P.feet + 0.5);
    if (!Number.isFinite(z) || Math.abs(z - P.feet) > 0.8) return;
    P.x = q[0];
    P.y = q[1];
    P.feet = z;
  }
  // the camera's side: the one with the freer view (and nearer the follow camera, which is where the eye was)
  function seiteWaehlen() {
    const a = mitte(S.who, 0),
      b = mitte(S.who, 1) || a,
      d = hyp(b[0] - a[0], b[1] - a[1]) || 1;
    S.ax = [(b[0] - a[0]) / d, (b[1] - a[1]) / d];
    const n = [-S.ax[1], S.ax[0]],
      c = [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2],
      cp = [cam.position.x, -cam.position.z];
    let best = 1,
      bs = -1e9;
    for (const s of [1, -1]) {
      let sc = 0;
      for (const r of [2.5, 4, 6]) {
        const q = [c[0] + n[0] * s * r, c[1] + n[1] * s * r];
        if (frei(c, q)) sc += 1;
      }
      sc += ((cp[0] - c[0]) * n[0] * s + (cp[1] - c[1]) * n[1] * s > 0 ? 0.6 : 0) + (s > 0 ? 0.01 : 0);
      if (sc > bs) {
        bs = sc;
        best = s;
      }
    }
    S.N = [n[0] * best, n[1] * best];
  }
  // a wall between two points (site metres)? (only walls: the walkers' push-out would count a bench under the camera as one)
  function frei(a, b) {
    try {
      return GLFAHNDUNG.los(a[0], a[1], b[0], b[1]);
    } catch (e) {
      return true;
    }
  }
  // ---------------- the shots ----------------
  const norm = v => {
    const l = hyp(v[0], v[1]) || 1;
    return [v[0] / l, v[1] / l];
  };
  // the normal of a direction that lies on the camera's side of the line
  function seite(d) {
    let n = [-d[1], d[0]];
    if (n[0] * S.N[0] + n[1] * S.N[1] < 0) n = [-n[0], -n[1]];
    // (a direction along the camera's side itself – two of one party: lean the normal towards the side)
    if (Math.abs(n[0] * S.N[0] + n[1] * S.N[1]) < 0.35) n = norm([n[0] + S.N[0], n[1] + S.N[1]]);
    return n;
  }
  const vfov = () => (stage.clientWidth < 760 || stage.clientWidth < stage.clientHeight ? 46 : 38);
  // the horizontal half angle's tangent for a vertical field of view
  const tanH = fov => Math.tan(((fov / 2) * PI) / 180) * Math.max(0.4, cam.aspect || 1.6);
  const kurz = (p, t, min = 0.9) => {
    // pulled towards the target until the view is free
    if (frei([t[0], t[1]], [p[0], p[1]])) return p;
    const L = hyp(p[0] - t[0], p[1] - t[1]);
    for (let k = 0.85; k > 0.15; k -= 0.12) {
      const q = [t[0] + (p[0] - t[0]) * k, t[1] + (p[1] - t[1]) * k, p[2]];
      if (L * k < min) break;
      if (frei([t[0], t[1]], [q[0], q[1]])) return q;
    }
    return null;
  };
  function boden(p) {
    const g = KERN.ground(p[0], p[1], p[2]);
    if (Number.isFinite(g) && p[2] < g + 0.45) p[2] = g + 0.45;
    return p;
  }
  // a shot: kind 'zwei' (the group), 'ots' (over the listener's shoulder), 'nah' (the speaker's face); null when it cannot be had
  function shot(kind, X, L, sec) {
    const fov0 = vfov();
    if (kind === 'zwei') {
      // the speaker and whom he talks to; without them (a narrator's line) the whole group
      const hs = (X && L ? [X, L] : S.who).map(e => kopf(e.F));
      let cx = 0,
        cy = 0,
        cz = 0;
      for (const h of hs) {
        cx += h[0];
        cy += h[1];
        cz += h[2];
      }
      cx /= hs.length;
      cy /= hs.length;
      cz /= hs.length;
      let half = 0.5;
      for (const h of hs) half = Math.max(half, Math.abs((h[0] - cx) * S.ax[0] + (h[1] - cy) * S.ax[1]) + 0.45);
      const fov = fov0 + 8,
        D = Math.max(2.4, Math.min(9, half / tanH(fov) + 0.4));
      // a little from the side of the player's party: a three-quarter view of the group
      const dir = norm([S.N[0] - S.ax[0] * 0.28, S.N[1] - S.ax[1] * 0.28]);
      let p = [cx + dir[0] * D, cy + dir[1] * D, cz - 0.05];
      p = kurz(p, [cx, cy, cz], 1.8);
      if (!p) return null;
      const t = [cx, cy, cz - 0.28];
      return mk('zwei', boden(p), t, fov, sec, 0.07);
    }
    const x = kopf(X.F),
      l = kopf(L.F);
    if (kind === 'ots') {
      // (far apart, the shoulder is a long way off; behind somebody seated there is his bench or his tree: then the face instead)
      if (hyp(x[0] - l[0], x[1] - l[1]) > 2.9 || (L.F !== 'P' && (L.F.sitzt || L.F.reitet))) return null;
      const d = norm([x[0] - l[0], x[1] - l[1]]),
        n = seite(d),
        b = 0.8 + (S.n % 3) * 0.08;
      // (not closer than 0.8 m to the listener: the mode hides the other one of the two when the camera comes that close)
      let p = [l[0] - d[0] * b + n[0] * 0.52, l[1] - d[1] * b + n[1] * 0.52, l[2] + 0.04];
      p = kurz(p, x, 1.4);
      if (!p) return null;
      return mk('ots', boden(p), [x[0] - n[0] * 0.14, x[1] - n[1] * 0.14, x[2] - 0.13], fov0 - 6, sec, 0.06);
    }
    // 'nah': in front of the speaker, turned some thirty degrees off the listener towards the camera's side ('frei': close to the
    // line between the two, where nothing stands – they look at each other – and without asking the walls)
    const d = norm([l[0] - x[0], l[1] - x[1]]),
      n = seite(d),
      fr = kind === 'frei',
      a = (fr ? 14 : 30 + (S.n % 2) * 8) * (PI / 180),
      r = fr ? Math.max(0.9, Math.min(1.4, 0.6 * hyp(l[0] - x[0], l[1] - x[1]))) : 1.55,
      dir = [d[0] * Math.cos(a) + n[0] * Math.sin(a), d[1] * Math.cos(a) + n[1] * Math.sin(a)];
    let p = [x[0] + dir[0] * r, x[1] + dir[1] * r, x[2] - 0.06];
    if (!fr) p = kurz(p, x, 0.95);
    if (!p) return null;
    // the face a little off the middle, towards the side the speaker looks to (the listener's side of the picture)
    const t = [x[0] + d[0] * 0.18, x[1] + d[1] * 0.18, x[2] - 0.1];
    return mk('nah', boden(p), t, fov0 - 10, sec, 0.1);
  }
  // a shot with its push-in: from p0 towards the target by k of the way over the line (only on lines of 3.5 s and more)
  function mk(kind, p0, t, fov, sec, k) {
    const push = sec >= 3.5 ? k : 0.02,
      p1 = [p0[0] + (t[0] - p0[0]) * push, p0[1] + (t[1] - p0[1]) * push, p0[2] + (t[2] - p0[2]) * push * 0.5];
    return { kind, p0, p1, t0: t, t1: t, fov, T: Math.max(1, sec), t: 0 };
  }
  // ---------------- a line begins: the cut ----------------
  function zeile(i, who, sec) {
    if (!S.on) return;
    S.lineT = 0;
    S.cur = { i, who, sec };
    const X = who ? S.who.find(e => e.id === who) : null;
    // the listener: for the others the player, for the player's party the first of the others
    let L = null;
    if (X) L = X.party === 1 ? S.who[0] : S.who.find(e => e.party === 1 && e !== X) || S.who.find(e => e !== X);
    let kind;
    if (!X || !L) kind = S.shot ? (S.shot.kind === 'zwei' ? '' : 'zwei') : 'zwei';
    else if (S.n === 0) kind = 'zwei';
    else if (who === S.lastWho) kind = S.shot && S.shot.kind === 'ots' ? 'nah' : 'ots';
    else if (S.run >= 4) kind = 'zwei';
    else {
      const prev = S.who.find(e => e.id === S.lastWho);
      kind = prev && prev.party === X.party ? 'nah' : 'ots';
    }
    let s = null;
    if (kind) {
      // what to try when the view is blocked; at last the face from the free space between the two (they see each other)
      const alt =
        kind === 'zwei'
          ? ['zwei', 'nah', 'ots', 'frei']
          : kind === 'ots'
            ? ['ots', 'nah', 'zwei', 'frei']
            : ['nah', 'ots', 'zwei', 'frei'];
      for (const k of X && L ? alt : ['gruppe']) {
        s = k === 'gruppe' ? shot('zwei', null, null, sec) : shot(k, X, L, sec);
        if (s) break;
      }
    }
    if (s) {
      S.shot = s;
      S.n++;
      S.run = s.kind === 'zwei' ? 0 : S.run + 1;
      S.stats.cuts++;
      S.stats.kinds[s.kind] = (S.stats.kinds[s.kind] || 0) + 1;
    } else if (S.shot) {
      // the same picture goes on: a little more push for the new line
      S.shot.T += sec;
    }
    if (who) S.lastWho = who;
    // who speaks turns to whom he talks to; the others look at him
    if (X && L) {
      const lp = posOf(L.F);
      if (X.F !== 'P' && !X.F.sitzt && !X.F.reitet && X.F.st !== 'geht') wende(X.F, lp[0], lp[1]);
      const xh = kopf(X.F);
      for (const e of S.who) {
        if (e === X || e.F === 'P') continue;
        try {
          if (GLFIG.blick) GLFIG.blick(e.F, xh[0], xh[1], xh[2]);
        } catch (err) {}
      }
      // the player's head goes to the speaker (the figure turns its head within its limits)
      if (X.F !== 'P') P.yaw = (Math.atan2(xh[0] - P.x, xh[1] - P.y) * 180) / PI;
      try {
        if (GLFIG.geste && X.F !== 'P' && sec > 4.2 && (S.n + i) % 3 === 1)
          GLFIG.geste(X.F, i % 2 ? 'achsel' : 'nicken');
      } catch (err) {}
    }
    markDirty(true);
  }
  // turn a figure towards a point, smoothly (in the tick)
  function wende(F, x, y) {
    const hd = Math.atan2(x - F.x, y - F.y);
    const e = S.turn.find(q => q.F === F);
    if (e) e.hd = hd;
    else S.turn.push({ F, hd });
  }
  // the player was put elsewhere while a talk runs: the same people, a new side, a fresh cut on the line that is said
  function umstellen() {
    if (S.insertT > 0 || !S.cur || S.who.some(e => e.F !== 'P' && (e.F.gone || hyp(e.F.x - P.x, e.F.y - P.y) > 14))) {
      aus(false);
      return;
    }
    S.lock = { x: P.x, y: P.y, body: P.body };
    seiteWaehlen();
    const m = mitte(S.who, 1);
    if (m) P.body = S.lock.body = (Math.atan2(m[0] - P.x, m[1] - P.y) * 180) / PI;
    S.n = 0;
    S.shot = null;
    S.lastWho = '';
    zeile(S.cur.i, S.cur.who, S.cur.sec);
  }
  // ---------------- begin and end ----------------
  function start(o) {
    if (!GL.on) return false;
    // a talk that follows the last one at once: the same cutscene goes on
    const weiter = S.on && S.endT >= 0;
    S.talk = o;
    S.endT = -1;
    // (an insert that runs gives way to the talk)
    if (S.on && S.insertT > 0) aus(false);
    if (weiter) {
      const add = besetzen(o.lines, o.figOf);
      for (const q of add) if (!S.who.some(e => e.id === q.id)) S.who.push(q);
      return true;
    }
    if (S.on) return true;
    // off the moped first (standing still: the cutscene shows him beside it); the other one of the two gets off with him
    try {
      if (VEH.cur) {
        VEH.exit();
        const F = window.GRENZLAND && window.GRENZLAND.partnerOf ? window.GRENZLAND.partnerOf() : null;
        if (F && F.rides && !VEH.cur) {
          F.rides = false;
          const a = ((P.yaw - 100) * PI) / 180;
          GLFIG.place(F, P.x + Math.sin(a) * 1.3, P.y + Math.cos(a) * 1.3, (P.yaw * PI) / 180);
        }
      }
    } catch (e) {}
    if (VEH.cur) return false;
    S.who = besetzen(o.lines, o.figOf);
    const main = S.who.find(e => e.party === 1);
    if (!main) return false;
    // at talking distance: the player goes to the person he talks to – only the other one of the two comes to him instead
    if (main.F !== 'P' && main.F.partner) {
      const F = main.F,
        d = hyp(F.x - P.x, F.y - P.y);
      if ((d > 3.2 || d < 1.0) && F.st !== 'geht' && !F.sitzt) {
        const ux = d > 0.01 ? (F.x - P.x) / d : 0,
          uy = d > 0.01 ? (F.y - P.y) / d : 1,
          q = [P.x + ux * 1.7, P.y + uy * 1.7];
        try {
          KERN.pushOut(q, 0.35);
          GLFIG.place(F, q[0], q[1], Math.atan2(P.x - q[0], P.y - q[1]));
        } catch (e) {}
      }
    } else aufstellen(main);
    seiteWaehlen();
    S.on = true;
    S.n = 0;
    S.run = 0;
    S.shot = null;
    S.lastWho = '';
    S.blend = null;
    S.turn = [];
    S.stats.n++;
    // the player faces the others; the others face him; the partner faces them too
    const m = mitte(S.who, 1);
    P.body = (Math.atan2(m[0] - P.x, m[1] - P.y) * 180) / PI;
    P.yaw = P.body;
    P.pitch = -4;
    P.speed = 0;
    for (const e of S.who) {
      if (e.F === 'P' || e.F.sitzt || e.F.reitet || e.F.st === 'geht') continue;
      const to = e.party === 1 ? [P.x, P.y] : m;
      e.F.hd = Math.atan2(to[0] - e.F.x, to[1] - e.F.y);
      if (e.party === 0 && hyp(e.F.x - P.x, e.F.y - P.y) > 3.5) {
        // the partner beside the player, on the far side from the camera
        const q = [P.x - S.N[0] * 1.0 - S.ax[0] * 0.35, P.y - S.N[1] * 1.0 - S.ax[1] * 0.35];
        try {
          KERN.pushOut(q, 0.35);
          GLFIG.place(e.F, q[0], q[1], Math.atan2(m[0] - q[0], m[1] - q[1]));
        } catch (err) {}
      }
    }
    S.lock = { x: P.x, y: P.y, body: P.body };
    // the player's own figure must be seen: the view from behind while the cutscene runs
    S.view = { want: CAM3.want, cur: CAM3.cur };
    CAM3.want = true;
    if (CAM3.cur < 1.2) CAM3.cur = 2.2;
    haken(true);
    tasten(true);
    balken(true);
    try {
      if (window.GLSCORE && window.GLSCORE.szene) window.GLSCORE.szene(true);
    } catch (e) {}
    markDirty(true);
    return true;
  }
  // a single picture without a talk (an insert, e.g. into the office when its door gives way): from p looking at t ([x, y, z] in
  // site metres) for sec seconds – bars, the walk held; Space, a tap or Esc end it sooner
  function einstellung(p, t, sec = 3, fov = 42) {
    if (S.on || !GL.on || sterne() > 0 || VEH.cur || P.mode !== 'walk' || PLAY.seated()) return false;
    S.who = [{ id: 'ich', F: 'P', party: 0, hd0: P.body }];
    S.ax = [0, 1];
    S.N = [1, 0];
    S.on = true;
    S.n = 1;
    S.run = 0;
    S.lastWho = '';
    S.blend = null;
    S.lineT = 0;
    S.shot = mk('insert', boden([p[0], p[1], p[2]]), [t[0], t[1], t[2]], fov, sec, 0.2);
    S.insertT = sec;
    S.talk = { weiter: () => ende(), skip: () => ende() };
    S.lock = { x: P.x, y: P.y, body: P.body };
    S.view = { want: CAM3.want, cur: CAM3.cur };
    CAM3.want = true;
    haken(true);
    tasten(true);
    balken(true);
    S.stats.kinds.insert = (S.stats.kinds.insert || 0) + 1;
    markDirty(true);
    return true;
  }
  // the talk is over: the cutscene ends in the next tick unless another talk begins at once
  function ende() {
    if (!S.on) return;
    if (S.endT < 0) S.endT = 0.05;
  }
  function aus(blend) {
    if (!S.on) return;
    S.on = false;
    S.endT = -1;
    S.insertT = 0;
    S.cur = null;
    S.talk = null;
    S.lock = null;
    tasten(false);
    balken(false);
    try {
      if (window.GLSCORE && window.GLSCORE.szene) window.GLSCORE.szene(false);
    } catch (e) {}
    // the figures look where they looked before; the listeners' eyes are free again
    for (const e of S.who) {
      if (e.F === 'P') continue;
      try {
        if (GLFIG.blick) GLFIG.blick(e.F, null);
      } catch (err) {}
      if (!e.F.gone && e.F.st !== 'geht' && !e.F.sitzt && !e.F.reitet && e.party === 1 && Number.isFinite(e.hd0))
        S.turn.push({ F: e.F, hd: e.hd0, nach: true });
    }
    S.turn = S.turn.filter(q => q.nach);
    // back to the follow camera: the player looks the way he faces
    P.yaw = P.body;
    P.pitch = -6;
    if (blend && S.shot) {
      S.blend = { p: cam.position.clone(), q: cam.quaternion.clone(), fov: cam.fov, t: 0 };
    } else S.blend = null;
    S.shot = null;
    S.who = [];
    if (!S.blend) viewZurueck();
    markDirty(true);
  }
  function viewZurueck() {
    if (S.view) {
      CAM3.want = S.view.want;
      S.view = null;
    }
  }
  // the player was put elsewhere (the mission, a test): no cutscene, no blend
  function weg() {
    if (S.on) aus(false);
    S.blend = null;
    viewZurueck();
  }
  function stop() {
    weg();
    S.turn = [];
    haken(false);
    tasten(false);
    balken(false);
  }
  // ---------------- per frame, after the walk physics ----------------
  function tick(dt) {
    if (S.endT >= 0 && (S.endT -= dt) < 0) aus(true);
    if (S.on && S.insertT > 0 && (S.insertT -= dt) <= 0) ende();
    if (S.on) {
      S.lineT += dt;
      if (S.shot) S.shot.t += dt;
      const L = S.lock;
      if (L) {
        if (hyp(P.x - L.x, P.y - L.y) > 1.2) {
          // put elsewhere (not by the mission – that ends the scene itself): the scene goes on there if the people are near, else it ends
          umstellen();
        } else {
          P.x = L.x;
          P.y = L.y;
          P.speed = 0;
          P.body = L.body;
        }
      }
      // the end of a cutscene by the world: a chase began, somebody got into a vehicle, the mode stopped
      if (S.on && (!GL.on || VEH.cur || sterne() > 0 || P.mode !== 'walk')) aus(false);
      markDirty();
    }
    for (let i = S.turn.length - 1; i >= 0; i--) {
      const q = S.turn[i],
        F = q.F;
      if (!F || F.gone || F.st === 'geht') {
        S.turn.splice(i, 1);
        continue;
      }
      let d = q.hd - F.hd;
      while (d > PI) d -= 2 * PI;
      while (d < -PI) d += 2 * PI;
      if (Math.abs(d) < 0.02) {
        F.hd = q.hd;
        S.turn.splice(i, 1);
      } else F.hd += Math.sign(d) * Math.min(Math.abs(d), dt * 3.2);
      markDirty();
    }
    if (S.blend && (S.blend.t += dt / 0.6) >= 1) {
      S.blend = null;
      viewZurueck();
    }
  }
  // ---------------- the camera: our applyCam before the game's ----------------
  const _p = new THREE.Vector3(),
    _t = new THREE.Vector3(),
    _q = new THREE.Quaternion();
  const ease = k => k * k * (3 - 2 * k);
  function setzen() {
    const s = S.shot,
      k = ease(Math.min(1, s.t / s.T));
    _p.copy(V(s.p0[0] + (s.p1[0] - s.p0[0]) * k, s.p0[1] + (s.p1[1] - s.p0[1]) * k, s.p0[2] + (s.p1[2] - s.p0[2]) * k));
    _t.copy(V(s.t0[0], s.t0[1], s.t0[2]));
    cam.near = 0.08;
    cam.fov = s.fov;
    cam.updateProjectionMatrix();
    cam.position.copy(_p);
    cam.up.set(0, 1, 0);
    cam.lookAt(_t);
  }
  function anwenden() {
    if (S.on && S.shot) {
      setzen();
      return true;
    }
    if (S.blend) {
      // where the follow camera is now, then the way there from the cutscene's last picture
      S.inner = true;
      try {
        applyCam();
      } finally {
        S.inner = false;
      }
      const B = S.blend,
        k = ease(Math.min(1, B.t));
      _q.copy(cam.quaternion);
      cam.position.lerpVectors(B.p, cam.position, k);
      cam.quaternion.slerpQuaternions(B.q, _q, k);
      cam.fov = B.fov + (cam.fov - B.fov) * k;
      cam.updateProjectionMatrix();
      markDirty();
      return true;
    }
    return false;
  }
  function haken(on) {
    const H = VEH;
    if (!H) return;
    if (on && !S.hook) {
      const orig = H.applyCam;
      if (typeof orig !== 'function') return;
      S.hook = { H, orig };
      H.applyCam = function () {
        if (S.inner) return orig.apply(this, arguments);
        if (anwenden()) return true;
        return orig.apply(this, arguments);
      };
    } else if (!on && S.hook) {
      S.hook.H.applyCam = S.hook.orig;
      S.hook = null;
    }
  }
  // ---------------- keys, taps: next line, skip ----------------
  const MOVE = new Set([
    'w',
    'a',
    's',
    'd',
    'arrowup',
    'arrowdown',
    'arrowleft',
    'arrowright',
    'shift',
    'c',
    'x',
    'z',
    'v',
    'q',
  ]);
  const STILL = new Set(['tab', 't', 'r', 'g', 'b', 'f', 'l', 'h']);
  function onKey(e) {
    if (!S.on) return;
    if (['INPUT', 'TEXTAREA', 'SELECT'].includes(document.activeElement && document.activeElement.tagName)) return;
    if (e.ctrlKey || e.metaKey || e.altKey) return;
    const k = String(e.key || '').toLowerCase();
    if (k === ' ' || k === 'enter' || k === 'e') {
      e.preventDefault();
      e.stopPropagation();
      if (!e.repeat && S.lineT > 0.3 && S.talk && S.talk.weiter) S.talk.weiter();
    } else if (k === 'escape') {
      e.preventDefault();
      e.stopPropagation();
      if (!e.repeat && S.talk && S.talk.skip) S.talk.skip();
    } else if (MOVE.has(k) || STILL.has(k)) {
      e.preventDefault();
      e.stopPropagation();
    }
  }
  function onTap(e) {
    if (!S.on || (e.button != null && e.button > 0)) return;
    const t = e.target;
    const cv = stage.querySelector('canvas');
    if (t !== cv && t !== stage && !(S.bars && S.bars.contains(t))) return;
    e.stopPropagation();
    if (S.lineT > 0.3 && S.talk && S.talk.weiter) S.talk.weiter();
  }
  function tasten(on) {
    if (on === S.keys) return;
    S.keys = on;
    if (on) {
      window.addEventListener('keydown', onKey, true);
      window.addEventListener('pointerdown', onTap, true);
    } else {
      window.removeEventListener('keydown', onKey, true);
      window.removeEventListener('pointerdown', onTap, true);
    }
    document.body.dataset.glSchnitt = on ? '1' : '';
    // the way out, small in the corner of the top bar (the subtitles sit in the bottom one)
    if (!S.css) {
      S.css = true;
      const st = document.createElement('style');
      st.textContent = CSS;
      document.head.appendChild(st);
    }
    if (!S.tipp && on) {
      const d = document.createElement('div');
      d.id = 'glkinotipp';
      d.innerHTML = COARSE ? 'Tippen: weiter' : '<kbd>Leertaste</kbd>weiter · <kbd>Esc</kbd>überspringen';
      (stage || document.body).appendChild(d);
      S.tipp = d;
      void d.offsetWidth;
    }
    if (S.tipp) S.tipp.classList.toggle('on', !!on);
  }
  // ---------------- the black bars: the lead's GLHUD.kino, else our own ----------------
  const CSS = `
#glkinobar{position:absolute;inset:0;pointer-events:none;z-index:6}
#glkinobar i{position:absolute;left:0;right:0;height:0;background:#000;transition:height .45s ease}
#glkinobar i:first-child{top:0} #glkinobar i:last-child{bottom:0}
#glkinobar.on i{height:11vh}
body[data-gl-schnitt="1"] :is(#joy,.pad,#actrow,.hint){display:none!important}
#glkinotipp{position:absolute;right:max(16px,env(safe-area-inset-right,0px));top:calc(4vh + env(safe-area-inset-top,0px));z-index:10;
  pointer-events:none;color:#fff;opacity:0;transition:opacity .6s;font:500 11px/1.3 var(--f-mono,monospace);letter-spacing:.06em}
#glkinotipp.on{opacity:.55} #glkinotipp kbd{font:inherit;border:1px solid rgba(255,255,255,.5);border-radius:4px;padding:0 4px;margin:0 3px}
body[data-gl-schnitt-eigen="1"] :is(#glhud,#gltouch,#glmap,#glmaplab,#qtrack,#glort,#glfunk){visibility:hidden!important}
body[data-gl-schnitt-eigen="1"] #glsub{bottom:calc(11vh + 12px + env(safe-area-inset-bottom,0px));background:rgba(0,0,0,.35)}
`;
  function balken(on) {
    const lead = GLHUD.kino && typeof GLHUD.kino === 'function';
    if (lead) {
      try {
        GLHUD.kino(!!on);
      } catch (e) {}
      if (!on && S.bars) S.bars.classList.remove('on');
      return;
    }
    if (!S.css) {
      S.css = true;
      const st = document.createElement('style');
      st.textContent = CSS;
      document.head.appendChild(st);
    }
    if (!S.bars && on) {
      const d = document.createElement('div');
      d.id = 'glkinobar';
      d.innerHTML = '<i></i><i></i>';
      (stage || document.body).appendChild(d);
      S.bars = d;
      void d.offsetWidth;
    }
    if (S.bars) S.bars.classList.toggle('on', !!on);
    document.body.dataset.glSchnittEigen = on ? '1' : '';
  }
  // ---------------- tests ----------------
  // where somebody's eyes are in the picture (−1 … 1 across and up) and how far they are from the camera
  function bild(who) {
    const e = S.who.find(q => q.id === who);
    if (!e) return null;
    const h = kopf(e.F),
      v = V(h[0], h[1], h[2]),
      d = v.distanceTo(cam.position);
    cam.updateMatrixWorld();
    v.project(cam);
    return [v.x, v.y, d];
  }
  function info() {
    const s = S.shot;
    return {
      on: S.on,
      kind: s ? s.kind : '',
      blend: !!S.blend,
      cam: [cam.position.x, -cam.position.z, cam.position.y],
      who: S.who.map(e => e.id + ':' + e.party),
      bars: !!((S.bars && S.bars.classList.contains('on')) || (document.body.dataset.glKino === '1' && GLHUD.kino)),
      lock: S.lock ? [S.lock.x, S.lock.y] : null,
      n: S.n,
      stats: S.stats,
      hook: !!S.hook,
      nein: S.nein || '',
      kopf: who => {
        const e = S.who.find(q => q.id === who);
        return e ? kopf(e.F) : null;
      },
    };
  }
  return {
    BARK,
    darf,
    start,
    zeile,
    ende,
    einstellung,
    tick,
    weg,
    stop,
    on: () => S.on,
    info,
    bild,
    kopf,
    S,
  };
})();
window.GLKAMERA = GLKAMERA;
