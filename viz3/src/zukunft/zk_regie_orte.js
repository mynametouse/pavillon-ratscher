// ===================== feat/zeitreise-regie: the places of the time journey – where the camera stands and what it looks at (ZKORTE) =====================
// The chronicle names places (anger, hang, waldrand, kahlflaeche, strasse, bruecke, heizhaus, windrad, schule); the director owns their poses.
// Views that *show* the change: from the Anger past the Dorflinde to the forested slopes; an overview from the slope over the village; eye
// height at the edge of the family forest at the Klinge; the street in the flood area; the old school at night. On foot always at eye
// height 1.65 m (later a VR headset stands there: fixed standpoints, no forced motion), overviews 60–120 m above the ground. Each place has
// a slow move for the time-lapse (a dolly of a few metres or a slow pan – calm, never a fast cut); halts stand still at the start pose.
// Places that depend on built things (heizhaus, windrad, kahlflaeche, strasse) are asked of ZKZEITWELT.place(id) first – it knows where it
// builds them; the table below is the fallback. Site metres: x east, y north, z up (the garden's ground is z ≈ 0); `h` is the height above
// the ground at that point (KERN.ground), `lh` that of the look point. `fov` is the vertical field of view of the single picture; in the
// split each half is narrower, so the director widens it (FOV_SPLIT).
import { KERN } from '../core/kern.js';

export const ZKORTE = (() => {
  const EYE = 1.65;
  const FOV_SPLIT = 1.16;
  // pos / look [x, y], heights above the ground; move: 'dolly' (m forward along the view), 'truck' (m sideways), 'pan' (degrees)
  const P = {
    // the Anger: past the Dorflinde (217, −109; 21 m) towards the forested slopes south-west of the village
    anger: { pos: [244, -92], h: EYE, look: [150, -190], lh: 14, fov: 50, move: { dolly: 4 }, label: 'Am Anger' },
    // the overview: from the slope north-east of the village over the roofs to the forest at the Klinge
    hang: { pos: [470, 120], h: 85, look: [120, -330], lh: 20, fov: 44, move: { truck: 14 }, label: 'Über dem Dorf' },
    // the edge of the family forest at the Klinge (the what-if mode's „Untere Klinge“, zukunft/zk_modus.js)
    waldrand: {
      pos: [-112, -418],
      h: EYE,
      look: [-150, -500],
      lh: 7,
      fov: 52,
      move: { dolly: 3 },
      label: 'Am Waldrand an der Klinge',
    },
    // a beetle clearing seen from its edge (zeitreise-welt knows the real one)
    kahlflaeche: {
      pos: [470, -420],
      h: EYE,
      look: [520, -470],
      lh: 6,
      fov: 52,
      move: { pan: 8 },
      label: 'Auf der Käferfläche',
    },
    // the street in the flood area by the Anger (zeitreise-welt's water lies there)
    strasse: {
      pos: [214, -84],
      h: EYE,
      look: [224, -112],
      lh: 1.2,
      fov: 52,
      move: { dolly: 2 },
      label: 'In der Straße',
    },
    // the bridge over the Schleuse (the what-if mode's „Schleusebrücke“)
    bruecke: {
      pos: [222, 12],
      h: EYE + 0.4,
      look: [284, -14],
      lh: 1,
      fov: 50,
      move: { pan: 7 },
      label: 'An der Schleusebrücke',
    },
    // the heating house at the edge of the village (zeitreise-welt builds it)
    heizhaus: { pos: [292, -150], h: EYE, look: [318, -168], lh: 4, fov: 52, move: { dolly: 3 }, label: 'Am Heizhaus' },
    // the wind turbine on the beetle clearing, seen from the village's edge (zeitreise-welt builds it)
    windrad: {
      pos: [330, -260],
      h: EYE,
      look: [900, -1100],
      lh: 140,
      fov: 48,
      move: { pan: 5 },
      label: 'Blick zum Windrad',
    },
    // the old school (Ratschner Anger 24) across the green – the village's emergency point in the blackout
    schule: {
      pos: [238, -116],
      h: EYE,
      look: [227, -86],
      lh: 5,
      fov: 50,
      move: { dolly: 2 },
      label: 'Vor der alten Schule',
    },
  };
  const ground = (x, y) => {
    const g = KERN.ground(x, y);
    return Number.isFinite(g) ? g : KERN.terrain(x, y) || 0;
  };
  // a pose { pos:[x,y,z], look:[x,y,z], fov, near, foot } – z absolute; `welt` is ZKZEITWELT (or its stand-in)
  function pose(id, welt) {
    const d = P[id] || P.anger;
    let pos, look;
    const w = welt && typeof welt.place === 'function' ? safe(() => welt.place(id)) : null;
    if (w && Array.isArray(w.pos) && Array.isArray(w.look)) {
      pos = w.pos.slice(0, 3);
      look = w.look.slice(0, 3);
      if (!Number.isFinite(pos[2])) pos[2] = ground(pos[0], pos[1]) + EYE;
      if (!Number.isFinite(look[2])) look[2] = ground(look[0], look[1]) + 1;
    } else {
      pos = [d.pos[0], d.pos[1], ground(d.pos[0], d.pos[1]) + d.h];
      look = [d.look[0], d.look[1], ground(d.look[0], d.look[1]) + d.lh];
    }
    // never inside a hill: overviews keep 3 m above the ground under them
    pos[2] = Math.max(pos[2], ground(pos[0], pos[1]) + (d.h > 3 ? 3 : 1.2));
    const foot = pos[2] - ground(pos[0], pos[1]) < 3;
    return { id, pos, look, fov: d.fov, near: foot ? 0.1 : 0.5, foot, move: d.move || null, label: d.label || id };
  }
  function safe(f) {
    try {
      return f();
    } catch (e) {
      return null;
    }
  }
  // the end pose of the place's slow move (null: none) – same look height, a few metres or degrees
  function moved(p) {
    const m = p.move;
    if (!m) return null;
    const dx = p.look[0] - p.pos[0],
      dy = p.look[1] - p.pos[1],
      L = Math.hypot(dx, dy) || 1,
      fx = dx / L,
      fy = dy / L;
    const q = { ...p, pos: p.pos.slice(), look: p.look.slice() };
    if (m.dolly) {
      q.pos[0] += fx * m.dolly;
      q.pos[1] += fy * m.dolly;
      if (p.foot) q.pos[2] = ground(q.pos[0], q.pos[1]) + (p.pos[2] - ground(p.pos[0], p.pos[1]));
    }
    if (m.truck) {
      // sideways to the right, the look point along (a parallel move)
      q.pos[0] += fy * m.truck;
      q.pos[1] -= fx * m.truck;
      q.look[0] += fy * m.truck;
      q.look[1] -= fx * m.truck;
    }
    if (m.pan) {
      const a = (m.pan * Math.PI) / 180,
        c = Math.cos(a),
        s = Math.sin(a);
      q.look[0] = p.pos[0] + dx * c + dy * s;
      q.look[1] = p.pos[1] - dx * s + dy * c;
    }
    return q;
  }
  return { EYE, FOV_SPLIT, P, ids: () => Object.keys(P), pose, moved, ground };
})();
