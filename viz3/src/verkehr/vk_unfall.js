// ===================== feat/verkehr-real 6: harmless accidents – a knock moves the traffic car after its mass (VKUNFALL) =====================
// Falko, 13.11.2026 12:14: „… nicht durchfahrbar sind, sondern tatsächlich auch Unfälle bauen, wenn man gegen sie fährt“; 12:45 chosen: the
// consequences harmless (docs/plans/plan_verkehr.md, D). The player's vehicle meets a traffic car: vehicles/vehicle.js resolves the knock
// between the two bodies – one impulse at the point of contact, from both masses and moments of inertia (VEH.extra's x.dyn gives the
// traffic car as such a body, x.knock takes the result back). The car leaves its path for a moment in the frame of its road: it rolls on,
// slides sideways (the tyres' friction), turns, the driver brakes after a moment (at once when the car stood with the foot on the brake);
// the hazard lights go on, the driver complains – from the window after a bump, getting out after a real knock (verkehr/verkehr.js) – then
// it turns back into its lane and drives on. One that ended far off the road or turned round waits with its hazard lights until nobody
// sees it. A parked car has nobody in it: it is only pushed. A knocked car that slides into another passes the knock on (VEH.resolve).
// Pure: no scene, no DOM – the car is a plain object (unit tests viz3/test/unit/verkehr_real.test.mjs).
//   VKUNFALL.grade(dv, closing)   'touch' (the car's speed changed by less than 0.4 m/s, the two came together slower than 1.2 m/s:
//                             a parking touch) | 'knock' (a bump: below 1 m/s, or 3 m/s together) | 'crash'
//   VKUNFALL.massOf(T)        { M, Iz } of a type (VKTYPEN.TYP[typ]: its mass, a box's moment of inertia), or of the old plain car
//   VKUNFALL.body(c)          the car as a body for VEH.resolve: { spec: { mass, Iz }, st: { x, y, psi, u, v, r } } and where it was
//   VKUNFALL.commit(c, b)     the body after the knock back into the car's frame of its road (s along, lat across, hdOff the body turned
//                             against the road; v, vlat, rOff its speeds there); returns the change of the car's speed (m/s)
//   VKUNFALL.start(c, grade, o)   the car's accident: c.crash = { t, grade, react, stood, fault, phase: 'rutscht', … }
//   VKUNFALL.step(c, dt)      one frame of the car after the knock; true when it has come to rest
//   VKUNFALL.back(c)          can it turn back into its lane (not far off, not turned round)?
//   VKUNFALL.straighten(c, ds)    after the accident, while it drives on: the body turns back with the road over ~5 m
//   VKUNFALL.fault(Wp, Wc, n) who ran into whom: 'player' | 'car' (the velocities before the knock, n: the push direction for the player)
//   VKUNFALL.LINES, VKUNFALL.line(kind, rnd), VKUNFALL.who(cls, typ, g)   what the other driver says, and who that is
export const VKUNFALL = (() => {
  const wrap = a => Math.atan2(Math.sin(a), Math.cos(a));
  // a value towards 0 by at most a (exactly 0 when within reach)
  const toward = (x, a) => (x > a ? x - a : x < -a ? x + a : 0);
  const TOUCH = 0.4,
    KNOCK = 1.0;
  // by the car's change of speed, or by how fast the two came together (a heavy lorry hardly moves, but its driver felt it)
  const grade = (dv, closing = 0) =>
    dv >= KNOCK || closing >= 3 ? 'crash' : dv >= TOUCH || closing >= 1.2 ? 'knock' : 'touch';
  // the old plain car (vehicles/car.js: the player's own Logan MCV) – its mass and moment of inertia
  const OLD = { M: 1230, Iz: 2150 };
  function massOf(T) {
    if (!T || !(T.mass > 0)) return { ...OLD };
    const L = T.yf - T.yr,
      W = 2 * T.hw;
    // a box of the vehicle's length and width, its mass a little to the middle (engine, axles): 0.9 of the even box
    return { M: T.mass, Iz: (0.9 * T.mass * (L * L + W * W)) / 12 };
  }
  // ---- the car as a body of vehicles/vehicle.js (psi: the body's heading, u along it, v to its right, r: the turn, + clockwise) ----
  function body(c) {
    const ht = c.hd - (c.hdOff || 0), // the road's direction where the car is
      sh = Math.sin(ht),
      ch = Math.cos(ht),
      vl = c.vlat || 0,
      Wx = c.v * sh + vl * ch,
      Wy = c.v * ch - vl * sh,
      psi = c.hd,
      sp = Math.sin(psi),
      cp = Math.cos(psi);
    const st = { x: c.x, y: c.y, psi, u: Wx * sp + Wy * cp, v: Wx * cp - Wy * sp, r: c.rOff || 0, sleep: 0 };
    return { spec: { mass: c.M || OLD.M, Iz: c.Iz || OLD.Iz }, st, x0: c.x, y0: c.y, Wx, Wy };
  }
  function commit(c, b) {
    const s = b.st,
      sp = Math.sin(s.psi),
      cp = Math.cos(s.psi),
      Wx = s.u * sp + s.v * cp,
      Wy = s.u * cp - s.v * sp,
      ht = c.hd - (c.hdOff || 0),
      sh = Math.sin(ht),
      ch = Math.cos(ht),
      dx = s.x - b.x0,
      dy = s.y - b.y0;
    if (Number.isFinite(dx) && Number.isFinite(dy)) {
      c.s += dx * sh + dy * ch;
      c.lat = (c.lat || 0) + dx * ch - dy * sh;
      c.x = s.x;
      c.y = s.y;
    }
    if (Number.isFinite(Wx) && Number.isFinite(Wy)) {
      c.v = Wx * sh + Wy * ch;
      c.vlat = Wx * ch - Wy * sh;
    }
    if (Number.isFinite(s.r)) c.rOff = Math.max(-3, Math.min(3, s.r));
    return Math.hypot(Wx - b.Wx, Wy - b.Wy) || 0;
  }
  // ---- the accident ----
  // o: { v0 (its speed before), fault, parked (nobody in it) }
  function start(c, g, o = {}) {
    const k = c.crash;
    if (k && (k.phase === 'rutscht' || k.phase === 'steht' || k.phase === 'liegt')) {
      // knocked again: while it slides (or has only just stopped – the player still pushing) it is the same knock; after a moment at
      // rest a new one, and a word more from the driver
      if (g === 'crash') k.grade = 'crash';
      if (k.phase !== 'rutscht' && k.rest > 0.8) {
        k.n++;
        k.said = false;
      }
      k.phase = 'rutscht';
      k.t = Math.min(k.t, 0.5);
      k.react = 0;
      return k;
    }
    return (c.crash = {
      t: 0,
      n: 1,
      grade: g,
      // the driver brakes after a moment – at once when the car stood (the foot on the brake); a parked car: the hand brake holds
      react: o.parked ? 0 : (o.v0 || 0) < 0.4 ? 0 : 0.8,
      stood: (o.v0 || 0) < 0.4,
      fault: o.fault || 'player',
      parked: !!o.parked,
      phase: 'rutscht',
      rest: 0,
      hold: g === 'crash' ? 13 : 4.5,
      said: false,
      busy: false,
      was: c.st,
    });
  }
  function step(c, dt) {
    const k = c.crash;
    k.t += dt;
    const brake = k.t > k.react ? (k.parked ? 7.5 : 6.5) : 0.6;
    c.v = toward(c.v, brake * dt);
    c.vlat = toward(c.vlat || 0, 6.8 * dt);
    c.rOff = toward((c.rOff || 0) * Math.exp(-2.2 * dt), 0.9 * dt);
    c.s += c.v * dt;
    c.lat = (c.lat || 0) + c.vlat * dt;
    c.hdOff = wrap((c.hdOff || 0) + c.rOff * dt);
    return !c.v && !c.vlat && !c.rOff;
  }
  const back = c => Math.abs(c.lat || 0) < 5.5 && Math.abs(c.hdOff || 0) < 1.9;
  function straighten(c, ds) {
    if (!c.hdOff) return;
    // most of it in the first metres, the rest steadily (0.04 rad a metre): straight after a finite way, no jump at the end
    c.hdOff = toward(c.hdOff * Math.max(0, 1 - Math.abs(ds) / 5), 0.04 * Math.abs(ds));
  }
  // who ran into whom: the faster one towards the other along the push (n points from the car to the player)
  function fault(Wp, Wc, n) {
    const p = -(Wp[0] * n[0] + Wp[1] * n[1]),
      q = Wc[0] * n[0] + Wc[1] * n[1];
    return q > p + 0.3 ? 'car' : 'player';
  }
  // ---- what the other driver says (du, as everyone here; harmless) ----
  const LINES = {
    // a bump: from the window
    knock: [
      'He! Pass doch auf!',
      'Hallo?! Was soll das denn?',
      'Mensch, Abstand halten!',
      'Na, geht’s noch?',
      'Ey, das ist doch kein Autoscooter!',
    ],
    // a real knock, it was driving
    crash: [
      'Sag mal, spinnst du? Der war gerade erst beim TÜV!',
      'Na super. Ganz toll. Und jetzt?',
      'Hast du keine Augen im Kopf?',
      'Mein schönes Auto! Das klären wir mit der Versicherung.',
      'Wo hast du denn deinen Führerschein her – aus dem Kaugummiautomaten?',
    ],
    // it stood when it was hit
    stood: [
      'Ich steh hier ganz normal, und du fährst mir einfach rein!',
      'Ich hab doch gestanden! Was machst du denn?',
    ],
    // it ran into the player (who stood or braked)
    rear: ['Warum bremst du denn einfach so?!', 'Mitten auf der Straße stehen bleiben – na toll!'],
    // once more during the scene
    again: ['Jetzt reicht’s aber!', 'Schon wieder?! Hast du sie noch alle?'],
    // at the end, before driving on
    end: [
      'Na gut. Ist ja nur Blech. Pass das nächste Mal besser auf!',
      'Schon gut – Hauptsache, keinem ist was passiert.',
      'Ich muss weiter. Aber so was macht man nicht!',
    ],
    // it ended far off the road or turned round: it stays
    liegt: [
      'Na toll. Und wie komm ich hier jetzt wieder raus?',
      'Das darf doch nicht wahr sein. Jetzt brauch ich einen Abschlepper.',
    ],
    // stage 4a: a walker, up again after the fall – and one only stumbling
    fuss: [
      'Aua! Bist du verrückt geworden?',
      'Mensch! Hast du mich denn nicht gesehen?',
      'Nichts passiert … glaub ich. Aber fahr doch langsamer!',
      'Das war knapp! Hier laufen Leute, weißt du?',
    ],
    stolpert: ['He! Vorsicht!', 'Hoppla! Pass doch auf!'],
    // a villager at the end (they know the player)
    endDorf: [
      'Na, wir kennen uns ja. Das klären wir beim Bier.',
      'Das erzähl ich aber Hubert!',
      'Schon gut. Aber das spricht sich rum, das weißt du.',
    ],
  };
  const line = (kind, r = Math.random()) => {
    const L = LINES[kind] || LINES.knock;
    return L[Math.min(L.length - 1, Math.floor(r * L.length))];
  };
  // the stranger at the wheel (the flow's cars): by the vehicle and the driver's gender
  function who(cls, typ, g) {
    const f = g === 'f';
    if (typ === 'muell') return f ? 'Die Müllfahrerin' : 'Der Müllfahrer';
    if (cls === 'lkw') return f ? 'Die Lkw-Fahrerin' : 'Der Lkw-Fahrer';
    if (cls === 'trak') return f ? 'Die Landwirtin' : 'Der Landwirt';
    return f ? 'Die Fahrerin' : 'Der Fahrer';
  }
  // the share of women at the wheel by the vehicle (a little below half in cars, few in lorries and on tractors)
  const womenShare = cls => (cls === 'lkw' ? 0.08 : cls === 'trak' ? 0.12 : cls === 'lfz' ? 0.25 : 0.42);
  return {
    grade,
    TOUCH,
    KNOCK,
    massOf,
    body,
    commit,
    start,
    step,
    back,
    straighten,
    fault,
    LINES,
    line,
    who,
    womenShare,
    wrap,
  };
})();
if (typeof window !== 'undefined') window.VKUNFALL = VKUNFALL;
