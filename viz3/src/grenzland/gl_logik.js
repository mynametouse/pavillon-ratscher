// ===================== feat/grenzland: the wanted level as pure logic (GLLOGIK) – deeds, witnesses, stars, what the police send =====================
// No imports, no scene: unit tests in viz3/test/unit/grenzland.test.mjs.
// The wanted level works as in GTA 6 (previews of autumn 2026): a crime counts only when somebody sees it – a passer-by, a villager, the
// police, a camera. Heat becomes stars (0 … 5); the stars are hollow until the police know who they are after (seen from close by, or a
// witness who knows the two – in the village everybody does). Out of sight the stars go one by one, faster in a hiding place and faster
// while nobody knows a name; while Falko and Sarah are apart one star less is shown. What the police send grows with the stars.
export const GLLOGIK = (() => {
  // ---- crimes: heat per witnessed deed ----
  const CRIMES = {
    rempeln: { h: 0.5, name: 'Rempelei' },
    schlag: { h: 1.1, name: 'Körperverletzung' },
    autoklau: { h: 1.3, name: 'Fahrzeugdiebstahl' },
    raserei: { h: 0.6, name: 'Raserei im Ort' },
    boeller: { h: 0.5, name: 'Böller im Ort' },
    hausfrieden: { h: 0.8, name: 'Hausfriedensbruch' },
    einbruch: { h: 1.9, name: 'Einbruch' },
    flucht: { h: 0.9, name: 'Flucht vor der Kontrolle' },
    sperre: { h: 1.4, name: 'Durchbrechen einer Sperre' },
    widerstand: { h: 1.6, name: 'Widerstand' },
    // 1989
    kiste: { h: 1.5, name: 'Verdächtige Kiste' },
    ausweis: { h: 0.9, name: 'Der Kontrolle entzogen' },
  };
  const STEPS = [0.45, 1.5, 2.9, 4.4, 6.2]; // the heat of one … five stars
  const MAX = 7.5;
  const starsOf = h => {
    let n = 0;
    for (const s of STEPS) if (h >= s) n++;
    return n;
  };
  const fresh = () => ({ heat: 0, known: false, unseen: 0, seeT: 0, state: 'ruhe', split: false, calls: 0, log: [] });
  // a deed. o: { seen: witnesses who saw it, police: an officer saw it, knows: a witness knows the two by name, k: weight, t: game minute }
  // returns the stars gained (0: nobody saw it, or the level stays)
  function crime(W, id, o = {}) {
    const C = CRIMES[id];
    if (!C) return 0;
    const wit = Math.max(0, o.seen | 0) + (o.police ? 1 : 0);
    W.log.push({ id, t: o.t || 0, wit });
    if (W.log.length > 12) W.log.shift();
    if (!wit) return 0;
    const before = starsOf(W.heat);
    W.heat = Math.min(MAX, W.heat + C.h * (o.police ? 1.25 : 1) * (o.k > 0 ? o.k : 1));
    if (o.police || o.knows) W.known = true;
    W.unseen = 0;
    W.calls++;
    if (W.state === 'ruhe') W.state = 'gesucht';
    return starsOf(W.heat) - before;
  }
  // the stars shown: one less while the two are apart (never below one while wanted)
  const stars = W => {
    const n = starsOf(W.heat);
    return n > 1 && W.split ? n - 1 : n;
  };
  // seconds out of sight until one star goes
  const loseT = W => (16 + 7 * starsOf(W.heat)) * (W.known ? 1 : 0.6);
  // per frame. ctx: { seen: the police see the player now, close: from close by, hidden: in a hiding place, split: the two are apart,
  // hold: the police are still on their way }
  // returns an event or null: 'gesehen' | 'erkannt' | 'verloren' | 'stern' | 'entkommen'
  function tick(W, dt, ctx = {}) {
    W.split = !!ctx.split;
    if (W.state === 'ruhe' || !(dt > 0)) return null;
    let ev = null;
    if (ctx.seen) {
      W.unseen = 0;
      W.seeT += dt;
      if (W.state !== 'verfolgt') {
        W.state = 'verfolgt';
        ev = 'gesehen';
      }
      if (!W.known && W.seeT > (ctx.close ? 1.5 : 6)) {
        W.known = true;
        ev = 'erkannt';
      }
    } else {
      W.seeT = Math.max(0, W.seeT - dt * 2);
      if (W.state === 'verfolgt') {
        W.state = 'gesucht';
        ev = 'verloren';
      }
      // (hold: nobody of the police is there yet – the search has not begun, so it cannot run out)
      if (!ctx.hold) W.unseen += dt * (ctx.hidden ? 1.8 : 1);
      if (W.unseen >= loseT(W)) {
        W.unseen = 0;
        const n = starsOf(W.heat);
        W.heat = n <= 1 ? 0 : STEPS[n - 2];
        if (W.heat <= 0) {
          W.state = 'ruhe';
          W.known = false;
          W.seeT = 0;
          ev = 'entkommen';
        } else ev = 'stern';
      }
    }
    return ev;
  }
  // the share of the search that is over (0 … 1), for the display
  const fade = W => (W.state === 'gesucht' ? Math.min(1, W.unseen / loseT(W)) : 0);
  // what the police send at n stars: patrol cars, a road block, the helicopter, special forces; seconds until the first car is there
  const antwort = n => ({
    cars: [0, 1, 2, 3, 3, 4][n] || 0,
    sperre: n >= 3,
    heli: n >= 4,
    sek: n >= 5,
    delay: [0, 38, 30, 24, 20, 16][n] || 0,
  });
  // arrested: the fine in euros (or marks), never more than one has
  const busse = (W, geld) =>
    Math.max(0, Math.min(geld | 0, Math.round((40 + 60 * starsOf(W.heat)) * (W.known ? 1 : 0.7))));
  function clear(W) {
    Object.assign(W, fresh(), { log: W.log });
  }
  // does a witness see a point? w: { x, y, hd (compass rad, or null: looks around), r (reach in m) }; o: { dark, sneak, cover }
  function sieht(w, px, py, o = {}) {
    const dx = px - w.x,
      dy = py - w.y,
      d = Math.hypot(dx, dy);
    let r = w.r || 30;
    if (o.dark) r *= 0.45;
    if (o.sneak) r *= 0.5;
    if (o.cover) r *= 0.35;
    if (!(d <= r)) return false;
    if (d < 5 || w.hd == null) return true;
    let a = Math.atan2(dx, dy) - w.hd;
    while (a > Math.PI) a -= 2 * Math.PI;
    while (a < -Math.PI) a += 2 * Math.PI;
    return Math.abs(a) < 1.75; // a good half circle ahead
  }
  return { CRIMES, STEPS, MAX, starsOf, fresh, crime, stars, loseT, tick, fade, antwort, busse, clear, sieht };
})();
if (typeof window !== 'undefined') window.GLLOGIK = GLLOGIK;
