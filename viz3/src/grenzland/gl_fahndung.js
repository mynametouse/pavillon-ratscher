// ===================== feat/grenzland: the wanted level in the world – witnesses, patrol cars, officers on foot, the road block, hiding (GLFAHNDUNG) =====================
// The rules are grenzland/gl_logik.js (GTA 6: a deed counts only when somebody sees it; hollow stars until the police know who it is).
// Here is who sees: the people of the mode (grenzland/gl_fig.js), the villagers and the walkers and drivers of the traffic – a villager
// knows Falko and Sarah by name, a stranger gives only a description –, and the police themselves. And what the police do, as in the
// country: a patrol car comes over the roads from where they leave the square (it takes its time), with blue light and horn, to where
// one was last seen; it searches there, follows on the road what it sees, stops near somebody on foot and two officers get out and walk
// after him (they do not run – whoever runs, gets away; whoever stands, is caught). From three stars a road block of two cars stands on
// the road ahead; driving past it is another deed. Out of sight the stars go (sooner in a hiding place: the forest, a building, the
// barn; sooner while they have only a description); while Falko and Sarah are apart, one star less. In 1989 the Volkspolizei comes
// in its saloon with one blue beacon, and the ABV on foot knows everybody.
import { KERN } from '../core/kern.js';
import { markDirty } from '../core/assets.js';
import { P } from '../game/walkable.js';
import { PLAY } from '../game/play.js';
import { WCOL } from '../world/worldcol.js';
import { RATSCHER } from '../world/ratscher.js';
import { VEH } from '../vehicles/vehicle.js';
import { DTEXT } from '../dorf/dorf_text.js';
import { DPEOPLE } from '../dorf/dorf_people.js';
import { VLEUTE } from '../verkehr/verkehr_leute.js';
import { VAUTO } from '../verkehr/verkehr_auto.js';
import { VERKEHR } from '../verkehr/verkehr.js';
import { CLOCK } from '../time/clock.js';
import { GLLOGIK } from './gl_logik.js';
import { GLDATA } from './gl_data.js';
import { GL } from './gl_state.js';
import { GLTON } from './gl_ton.js';
import { GLFIG } from './gl_fig.js';
import { GLAUTO } from './gl_auto.js';
import { GLHUD } from './gl_hud.js';
export const GLFAHNDUNG = (() => {
  const S = {
    cars: [], // { c (GLAUTO car), st: 'anfahrt' | 'suche' | 'verfolgt' | 'steht' | 'abzug', t, routeT, crew: bool (the officers are out) }
    cops: [], // officers on foot: figures of GLFIG with .cop = { car, st }
    block: null, // the road block: { cars: [c, c], x, y, passed }
    last: null, // where the player was last seen or reported: [x, y]
    lastT: 0,
    wait: 0, // seconds until the next car is sent
    sent: 0,
    seen: false,
    close: false,
    catchT: 0,
    speedT: 0,
    chaseT: 0,
    hidden: false,
    busy: false, // officers are being loaded
    off: false, // missions may switch the police off (the flashback's first minute)
    extra: [], // further places that hide (the barn): [{ x, y, r }]
    hooks: { zeuge: null }, // a mission may add witnesses
  };
  const T = GLDATA.T;
  const hyp = Math.hypot;
  const dark = () => !!(VAUTO.dark && VAUTO.dark());
  // where the player is: on foot, or his vehicle
  function wo() {
    const v = VEH && VEH.cur;
    if (v) return { x: v.st.x, y: v.st.y, v: hyp(v.st.u, v.st.v), veh: v, hd: v.st.psi };
    return { x: P.x, y: P.y, v: P.speed || 0, veh: null, hd: (P.yaw * Math.PI) / 180 };
  }
  const inSquare = (x, y) => {
    const B = RATSCHER && RATSCHER.box;
    return !!B && x > B[0] + 30 && x < B[2] - 30 && y > B[1] + 30 && y < B[3] - 30;
  };
  // nothing solid between two points (the walls of the buildings)
  function los(ax, ay, bx, by) {
    if (!WCOL || !WCOL.ready) return true;
    let free = true;
    const sx = bx - ax,
      sy = by - ay;
    try {
      WCOL.each(Math.min(ax, bx), Math.min(ay, by), Math.max(ax, bx), Math.max(ay, by), (s, A) => {
        if (!free) return;
        const cx = A[s * 4],
          cy = A[s * 4 + 1],
          dx = A[s * 4 + 2] - cx,
          dy = A[s * 4 + 3] - cy,
          den = sx * dy - sy * dx;
        if (Math.abs(den) < 1e-9) return;
        const t = ((cx - ax) * dy - (cy - ay) * dx) / den,
          u = ((cx - ax) * sy - (cy - ay) * sx) / den;
        if (t > 0.02 && t < 0.98 && u >= 0 && u <= 1) free = false;
      });
    } catch (e) {
      return true;
    }
    return free;
  }
  // a hiding place: indoors, the forest, a place a mission names
  function versteckt(x, y, z) {
    try {
      if (KERN.inside(x, y, (z || 0) + 1)) return true;
      const pl = String(KERN.place(x, y, z || 0) || '');
      if (/Wald|Klinge|Forst/.test(pl)) return true;
    } catch (e) {}
    return S.extra.some(q => hyp(q.x - x, q.y - y) < q.r);
  }
  const sneak = () => !VEH.cur && (P.stance === 'crouch' || P.stance === 'crawl' || P.stance === 'prone');
  // ---- who sees the player right now (o.laut: a bang – heard through walls within o.laut metres) ----
  function zeugen(o = {}) {
    const p = wo(),
      dk = dark(),
      opt = { dark: dk, sneak: sneak() },
      out = [];
    const sees = (w, name, knows, police) => {
      const d = hyp(w.x - p.x, w.y - p.y);
      if (o.laut ? d < o.laut : GLLOGIK.sieht(w, p.x, p.y, opt) && los(w.x, w.y, p.x, p.y))
        out.push({ name, knows: !!knows, police: !!police, d });
    };
    for (const F of GLFIG.figs) {
      if (!F.g.visible || F.era !== GL.era || F.partner || F.downT > 0 || !F.sees) continue;
      sees(
        { x: F.x, y: F.y, hd: F.st === 'geht' ? F.hd : null, r: F.r },
        F.name,
        F.knows ?? GL.era === '1989',
        !!F.cop
      );
    }
    for (const u of S.cars)
      if (u.c.g.visible)
        sees(
          { x: u.c.x, y: u.c.y, hd: null, r: 60 },
          GL.era === '1989' ? 'Die Volkspolizei' : 'Die Streife',
          false,
          true
        );
    if (GL.era === 'heute') {
      for (const k in (DPEOPLE && DPEOPLE.figs) || {}) {
        const f = DPEOPLE.figs[k];
        if (f && f.g.visible && f.at)
          sees(
            { x: f.at.x, y: f.at.y, hd: null, r: 30 },
            (DTEXT.P[k] && DTEXT.P[k].name) || 'Jemand aus dem Dorf',
            true
          );
      }
      for (const d of (VERKEHR && VERKEHR.S && VERKEHR.S.peds) || [])
        if (d.f && d.f.g.visible)
          sees(
            { x: d.x, y: d.y, hd: d.hd, r: 28 },
            (VLEUTE.P[d.key] && VLEUTE.P[d.key].name) || 'Eine Passantin',
            false
          );
      for (const c of (VAUTO && VAUTO.cars) || [])
        if (c.g.visible && c.st !== 'geliehen') sees({ x: c.x, y: c.y, hd: c.hd, r: 34 }, 'Ein Autofahrer', false);
    }
    if (S.hooks.zeuge) for (const w of S.hooks.zeuge() || []) sees(w, w.name, w.knows, w.police);
    out.sort((a, b) => a.d - b.d);
    return out;
  }
  // ---- a deed: counted if somebody saw it. o: { laut, quiet, k, force: [{ name, knows, police }] } → the stars gained ----
  function tat(id, o = {}) {
    if (!GL.on) return 0;
    const W = GL.W,
      Z = o.force || zeugen(o),
      p = wo(),
      before = GLLOGIK.stars(W);
    const gained = GLLOGIK.crime(W, id, {
      seen: Z.filter(z => !z.police).length,
      police: Z.some(z => z.police),
      knows: Z.some(z => z.knows),
      k: o.k,
      t: CLOCK.t,
    });
    GL.stats.taten++;
    GL.save();
    if (Z.length) {
      S.last = [p.x, p.y];
      S.lastT = 0;
      if (!S.cars.length && S.wait <= 0)
        S.wait = GLLOGIK.antwort(GLLOGIK.stars(W)).delay * (GL.era === '1989' ? 0.6 : 1);
      if (!o.quiet) PLAY.think(T.zeuge(Z[0].name, GLDATA.TATEN[id] || id), 3600);
      if (GLLOGIK.stars(W) > before) {
        GLTON.fx('stern');
        if (before === 0) setTimeout(() => GL.on && GLLOGIK.stars(GL.W) > 0 && PLAY.think(T.streife, 3800), 3800);
      }
    } else if (!o.quiet) PLAY.think(T.keinZeuge, 2200);
    GL.emit('tat', { id, zeugen: Z.length, wer: Z[0] ? Z[0].name : '', sterne: GLLOGIK.stars(W), bekannt: W.known });
    if (gained) GL.emit('sterne', { n: GLLOGIK.stars(W), bekannt: W.known });
    return gained;
  }
  // ---- the cars ----
  const LOOK = {
    streife: { col: '#c9cdd2', band: '#1f4fa8', band2: '#cfe23c', bar: 'balken' },
    vopo: { col: '#f1f0e8', band: '#2f6b3a', bar: 'rundum' },
  };
  function send(to) {
    // from the road end with the shortest way that nobody looks at (not within 150 m of the player)
    const p = wo();
    let best = null,
      bl = 1e9;
    for (const z of GLAUTO.zufahrten()) {
      if (hyp(z[0] - p.x, z[1] - p.y) < 150) continue;
      const line = GLAUTO.route(z, to, { k: 1.3, aLat: 3.2 });
      if (line && line.L < bl) {
        bl = line.L;
        best = line;
      }
    }
    if (!best) return null;
    const era = GL.era === '1989',
      c = GLAUTO.spawn(era ? 'limo89' : 'streife', era ? LOOK.vopo : LOOK.streife);
    GLAUTO.onLine(c, best, 2, 14);
    c.blau = true;
    c.horn = true;
    GLAUTO.hornAlt = era;
    const u = { c, st: 'anfahrt', t: 0, routeT: 0, crew: false, lost: 0 };
    S.cars.push(u);
    S.sent++;
    GL.emit('streife', { n: S.cars.length });
    return u;
  }
  function reroute(u, to, k) {
    const line = GLAUTO.route([u.c.x, u.c.y], to, { k, aLat: 3.4 });
    if (!line || line.L < 6) return false;
    // from where it stands: the nearest point of the new line ahead of it
    const pr = VNETZproject(line, u.c.x, u.c.y);
    GLAUTO.onLine(u.c, line, pr ? Math.min(line.L - 2, pr.s) : 2, u.c.v);
    u.routeT = 0;
    return true;
  }
  // (the line functions come with GLAUTO's network: verkehr/verkehr_netz.js)
  const VNETZproject = (line, x, y) => (VERKEHR.net && VERKEHR.net.project ? VERKEHR.net.project(line, x, y) : null);
  function carSees(u, p) {
    const d = hyp(u.c.x - p.x, u.c.y - p.y),
      r = (dark() ? 42 : 80) * (p.veh ? 1.25 : sneak() ? 0.5 : 1);
    return d < r && !S.hidden && los(u.c.x, u.c.y, p.x, p.y);
  }
  async function crewOut(u) {
    if (u.crew || S.busy) return;
    u.crew = true;
    S.busy = true;
    const ids = GL.era === '1989' ? ['abv', 'vopo'] : ['polizei1', 'polizei2'];
    for (let i = 0; i < ids.length; i++) {
      if (S.cops.some(F => F.id === ids[i])) continue;
      const F = await GLFIG.make(ids[i], { era: GL.era });
      if (!F) continue;
      if (!GL.on || u.gone) {
        GLFIG.drop(F);
        continue;
      }
      const side = i ? 1 : -1,
        hd = u.c.hd;
      F.era = GL.era;
      F.cop = { car: u, st: 'jagt' };
      F.r = 38;
      F.knows = false;
      GLFIG.place(F, u.c.x + Math.cos(hd) * side * 1.6, u.c.y - Math.sin(hd) * side * 1.6, hd);
      S.cops.push(F);
      GLTON.fx('funk', hyp(F.x - P.x, F.y - P.y), 60);
    }
    S.busy = false;
  }
  function crewIn(u) {
    for (const F of S.cops.slice())
      if (F.cop.car === u) {
        S.cops.splice(S.cops.indexOf(F), 1);
        GLFIG.drop(F);
      }
    u.crew = false;
  }
  function leave(u) {
    crewIn(u);
    const ex = GLAUTO.zufahrten()
      .map(z => [hyp(z[0] - u.c.x, z[1] - u.c.y), z])
      .sort((a, b) => a[0] - b[0])[0];
    u.st = 'abzug';
    u.c.horn = false;
    u.c.blau = false;
    if (!ex || !reroute(u, ex[1], 1)) drop(u);
  }
  function drop(u) {
    crewIn(u);
    u.gone = true;
    GLAUTO.remove(u.c);
    const i = S.cars.indexOf(u);
    if (i >= 0) S.cars.splice(i, 1);
  }
  // ---- the road block: two cars across the road some hundred metres ahead on the way out ----
  function sperre(p) {
    if (S.block || GL.era === '1989' || !inSquare(p.x, p.y)) return;
    const G = GLAUTO.netz();
    let best = null,
      bd = 1e9;
    for (const e of G.edges) {
      if (e.kind > 2 || e.len < 40) continue;
      const m = e.pts[Math.floor(e.pts.length / 2)],
        d = hyp(m[0] - p.x, m[1] - p.y);
      if (d > 220 && d < 520 && Math.abs(d - 330) < bd && !los(m[0], m[1], p.x, p.y) === false) {
        // (in sight is fine at that distance: it is put up while one is far)
        bd = Math.abs(d - 330);
        best = e;
      }
    }
    if (!best) return;
    const i = Math.floor(best.pts.length / 2),
      a = best.pts[Math.max(0, i - 1)],
      b = best.pts[i],
      hd = Math.atan2(b[0] - a[0], b[1] - a[1]),
      cars = [];
    for (const s of [-1, 1]) {
      const c = GLAUTO.spawn('streife', LOOK.streife);
      GLAUTO.park(
        c,
        b[0] + Math.cos(hd) * s * 1.6 + Math.sin(hd) * s * 1.2,
        b[1] - Math.sin(hd) * s * 1.6 + Math.cos(hd) * s * 1.2,
        hd + Math.PI / 2 + s * 0.35
      );
      c.blau = true;
      cars.push(c);
    }
    S.block = { cars, x: b[0], y: b[1], passed: false, near: false };
    PLAY.think(T.sperre, 3500);
    GL.emit('sperre', { x: b[0], y: b[1] });
  }
  function blockOff() {
    if (!S.block) return;
    for (const c of S.block.cars) GLAUTO.remove(c);
    S.block = null;
  }
  // ---- caught ----
  function erwischt() {
    const W = GL.W,
      n = GLLOGIK.busse(W, GL.geld);
    GL.stats.erwischt++;
    GL.emit('erwischt', { busse: n, sterne: GLLOGIK.stars(W), era: GL.era });
    clear(true);
  }
  // everything of the police away, the level calm (the mode's end, an arrest, a mission's reset)
  function clear(keepLog) {
    for (const u of S.cars.slice()) drop(u);
    for (const F of S.cops.slice()) GLFIG.drop(F);
    S.cops.length = 0;
    blockOff();
    GLLOGIK.clear(GL.W);
    if (!keepLog) GL.W.log.length = 0;
    S.wait = 0;
    S.sent = 0;
    S.seen = S.close = false;
    S.catchT = S.chaseT = 0;
    S.last = null;
    GLTON.siren(false);
    markDirty();
  }
  // ---- per frame ----
  let acc = 0;
  function tick(dt) {
    if (!GL.on) return;
    const W = GL.W,
      p = wo(),
      n = GLLOGIK.stars(W),
      full = GLLOGIK.starsOf(W.heat);
    S.hidden = versteckt(p.x, p.y, P.feet);
    // speeding through the village in front of somebody (at most now and then)
    S.speedT -= dt;
    if (
      p.veh &&
      p.v > 15.5 &&
      S.speedT <= 0 &&
      GL.era === 'heute' &&
      /Ratscher ·|Anger|Dorf/.test(String(KERN.place(p.x, p.y, 0) || ''))
    ) {
      S.speedT = 25;
      if (zeugen().length) tat('raserei', { quiet: n > 0 });
    }
    // the cars
    let seen = false,
      close = false;
    const halt = p.veh ? [] : [{ x: p.x, y: p.y, r: 0.4, gap: 3.5 }];
    for (const F of S.cops) halt.push({ x: F.x, y: F.y, r: 0.4, gap: 2 });
    for (const u of S.cars.slice()) {
      const c = u.c,
        d = hyp(c.x - p.x, c.y - p.y);
      u.t += dt;
      u.routeT += dt;
      const sees = u.st !== 'abzug' && !S.off && carSees(u, p);
      if (sees) {
        seen = true;
        if (d < 26) close = true;
        S.last = [p.x, p.y];
        S.lastT = 0;
        u.lost = 0;
      } else u.lost += dt;
      if (u.st === 'abzug') {
        GLAUTO.drive(c, dt, { k: 0.9, halt });
        if (c.ende || (d > 260 && u.t > 20)) drop(u);
        continue;
      }
      if (sees && u.st !== 'verfolgt' && u.st !== 'steht') {
        u.st = 'verfolgt';
        c.horn = true;
        u.routeT = 9;
      }
      if (u.st === 'verfolgt') {
        if (!sees && u.lost > 6) {
          u.st = 'suche';
          c.horn = false;
          u.routeT = 9;
        } else if (!p.veh && d < 22) {
          // somebody on foot close by: stop, out of the car
          u.st = 'steht';
          c.horn = false;
          crewOut(u);
        } else if (u.routeT > 2.2 || c.ende) reroute(u, S.last || [p.x, p.y], 1.55);
        GLAUTO.drive(c, dt, { k: 1, acc: 3.4, halt, vmax: u.st === 'steht' ? 0 : undefined });
      } else if (u.st === 'steht') {
        GLAUTO.drive(c, dt, { vmax: 0 });
        // back into the car when the one on foot is far or has a vehicle again
        if (p.veh && sees) {
          crewIn(u);
          u.st = 'verfolgt';
          c.horn = true;
          u.routeT = 9;
        } else if (u.lost > 28) {
          crewIn(u);
          u.st = 'suche';
          u.routeT = 9;
        }
      } else {
        // on the way to where the player was last seen; then round the roads near it
        if (c.ende || u.routeT > 40) {
          u.st = 'suche';
          c.horn = false;
          const G = GLAUTO.netz(),
            o = S.last || [p.x, p.y],
            cand = G.nodes.filter(q => hyp(q.x - o[0], q.y - o[1]) < 260 && hyp(q.x - c.x, q.y - c.y) > 50);
          const q = cand[Math.floor(Math.random() * cand.length)];
          if (!q || !reroute(u, [q.x, q.y], 0.75)) u.routeT = 30;
        }
        GLAUTO.drive(c, dt, { k: 1, acc: 2.8, halt });
      }
      // boxed in: the car right behind somebody who stands in his vehicle
      if (p.veh && sees && d < 9 && p.v < 1.5) S.catchT += dt * 0.5;
    }
    // the officers on foot: after the player while they see him, else to where he was last seen
    for (const F of S.cops) {
      const d = hyp(F.x - p.x, F.y - p.y),
        sees =
          !S.off &&
          !S.hidden &&
          GLLOGIK.sieht({ x: F.x, y: F.y, hd: F.hd, r: F.r }, p.x, p.y, { dark: dark(), sneak: sneak() }) &&
          los(F.x, F.y, p.x, p.y);
      if (sees) {
        seen = true;
        if (d < 26) close = true;
        S.last = [p.x, p.y];
        S.lastT = 0;
        if (!F.path || (F.aimT = (F.aimT || 0) + dt) > 0.6) {
          F.aimT = 0;
          GLFIG.go(F, [p.x, p.y], 2.15);
        }
        if (!p.veh && d < 1.7) S.catchT += dt;
        if (!F.shout || F.shout < 0) {
          F.shout = 9;
          const line = GL.era === '1989' ? GLDATA.J89.leute.abv[2] : 'Halt! Polizei!';
          GLHUD.sub(F.name, line, 2200);
        }
      } else if (S.last && F.st !== 'geht' && hyp(F.x - S.last[0], F.y - S.last[1]) > 4) GLFIG.go(F, S.last, 1.5);
      if (F.shout > 0) F.shout -= dt;
    }
    if (
      !seen ||
      (p.veh ? p.v > 1.5 : hyp(P.mvx || 0, P.mvy || 0) > 0.2 && !S.cops.some(F => hyp(F.x - p.x, F.y - p.y) < 1.7))
    )
      S.catchT = Math.max(0, S.catchT - dt * 0.7);
    if (S.catchT > 1.2 && n > 0) {
      S.catchT = 0;
      erwischt();
      return;
    }
    // the road block: driven past it → another deed; it sees too
    if (S.block) {
      const B = S.block,
        d = hyp(B.x - p.x, B.y - p.y);
      if (d < 70 && !S.off && los(B.x, B.y, p.x, p.y) && !S.hidden) {
        seen = true;
        if (d < 26) close = true;
      }
      if (d < 22) B.near = true;
      else if (B.near && d > 45 && !B.passed && p.veh) {
        B.passed = true;
        tat('sperre', { force: [{ name: 'Die Sperre', police: true }] });
      }
      if (n < 3 && full < 3) blockOff();
    }
    S.seen = seen;
    S.close = close;
    if (S.last) S.lastT += dt;
    // a long chase is a deed of its own (they get more determined)
    if (seen && p.veh && p.v > 6) {
      S.chaseT += dt;
      if (S.chaseT > 22) {
        S.chaseT = 0;
        tat('flucht', { force: [{ name: 'Die Streife', police: true }], quiet: true });
      }
    }
    // the rules
    const ev = GLLOGIK.tick(W, dt, { seen, close, hidden: S.hidden, split: !!GL.getrennt });
    if (ev === 'gesehen') {
      GLHUD.say(T.gesehen, '', 2.5);
      GLTON.fx('stern');
    } else if (ev === 'erkannt') PLAY.think(T.erkannt, 3000);
    else if (ev === 'verloren') PLAY.think(S.hidden ? T.versteck : T.verloren, 3000);
    else if (ev === 'stern') {
      PLAY.think(T.stern, 2400);
      GL.emit('sterne', { n: GLLOGIK.stars(W), bekannt: W.known });
    } else if (ev === 'entkommen') {
      GL.stats.entkommen++;
      GL.save();
      GLHUD.say(T.entkommen, '', 4);
      GLTON.fx('frei');
      for (const u of S.cars.slice()) leave(u);
      blockOff();
      S.sent = 0;
      S.last = null;
      GL.emit('entkommen', {});
      GL.emit('sterne', { n: 0, bekannt: false });
    }
    // sending: as many cars as the stars ask for, one after the other, only where there are roads
    if ((acc += dt) > 0.5) {
      acc = 0;
      const A = GLLOGIK.antwort(full),
        want = GL.era === '1989' ? Math.min(1, A.cars) : A.cars,
        have = S.cars.filter(u => u.st !== 'abzug').length;
      if (full > 0 && have < want && !S.off && S.last && inSquare(S.last[0], S.last[1])) {
        if (S.wait <= 0) {
          const u = send(S.last);
          S.wait = u ? 9 + have * 6 : 6;
        }
      } else if (full > 0 && !S.off && !inSquare(p.x, p.y) && !S.cops.length && !S.busy && S.wait <= 0 && S.last) {
        // beyond the square (the town): two officers on foot from round the corner
        S.wait = 30;
        footPatrol(p);
      }
      if (A.sperre && !S.block && p.veh) sperre(p);
    }
    if (S.wait > 0) S.wait -= dt;
  }
  async function footPatrol(p) {
    S.busy = true;
    const ids = ['polizei1', 'polizei2'],
      a = Math.random() * 6.28;
    for (let i = 0; i < 2; i++) {
      const F = await GLFIG.make(ids[i], { era: 'heute' });
      if (!F) continue;
      if (!GL.on) {
        GLFIG.drop(F);
        continue;
      }
      F.cop = { car: null, st: 'jagt' };
      F.r = 38;
      F.knows = false;
      GLFIG.place(F, p.x + Math.sin(a) * 38 + i * 1.2, p.y + Math.cos(a) * 38, a + Math.PI);
      S.cops.push(F);
    }
    S.busy = false;
  }
  // what the display says
  const stand = () => ({
    sterne: GLLOGIK.stars(GL.W),
    hitze: Math.round(GL.W.heat * 100) / 100,
    bekannt: GL.W.known,
    state: GL.W.state,
    seen: S.seen,
    hidden: S.hidden,
    cars: S.cars.map(u => ({
      st: u.st,
      x: Math.round(u.c.x),
      y: Math.round(u.c.y),
      v: Math.round(u.c.v * 10) / 10,
      crew: u.crew,
    })),
    cops: S.cops.map(F => ({ id: F.id, x: Math.round(F.x), y: Math.round(F.y), st: F.st })),
    block: S.block ? [Math.round(S.block.x), Math.round(S.block.y)] : null,
    wait: Math.round(S.wait * 10) / 10,
    last: S.last ? S.last.map(Math.round) : null,
  });
  Object.assign(S, { wo, los, versteckt, zeugen, tat, send, clear, tick, stand, erwischt, inSquare, sneak });
  return S;
})();
window.GLFAHNDUNG = GLFAHNDUNG;
