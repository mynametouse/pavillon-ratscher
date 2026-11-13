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
  // pos / look [x, y], heights above the ground; or yaw (compass bearing of the view: 0 north, 90 east) and pitch (degrees up) instead of
  // look – the look point then lies 100 m ahead. move: 'dolly' (m forward along the view), 'truck' (m sideways), 'pan' (degrees)
  const P = {
    // the establishing shot of each chapter's time-lapse: 90 m above the Anger towards the forests south and south-west, the lime below
    ueberblick: { pos: [232, -92], h: 90, yaw: 195, pitch: -10, fov: 60, move: { truck: 10 }, label: 'Über dem Dorf' },
    // the Anger: the Dorflinde (217, −109; 21 m) to the right of the view, the forested slopes south of the village behind (~5° high)
    anger: { pos: [240, -60], h: EYE, yaw: 195, pitch: 4, fov: 55, move: { dolly: 4 }, label: 'Am Anger' },
    // on the slope north-east of the village: the village below, the forests south and south-west (the Klinge lobe) behind
    // (zeitreise-welt checked the line of sight on the terrain model, 13.11.: ~100 % of the conifers S/SW visible)
    hang: { pos: [430, 90], h: EYE, yaw: 199, pitch: -2, fov: 55, move: { pan: -6 }, label: 'Am Hang über dem Dorf' },
    // at the edge of the family forest at the Klinge, ~20 m before the first spruces (the what-if mode's „Untere Klinge“)
    waldrand: {
      pos: [-137, -473],
      h: EYE,
      look: [-160, -523],
      lh: 6,
      fov: 55,
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
    // the street in the flood area by the brook (zeitreise-welt's water lies there)
    strasse: {
      pos: [214, -84],
      h: EYE,
      look: [224, -112],
      lh: 1.2,
      fov: 52,
      move: { dolly: 2 },
      label: 'In der Straße',
    },
    // on the bridge over the Schleuse (the what-if mode's „Schleusebrücke“), looking down the river
    bruecke: {
      pos: [222, 12],
      h: EYE + 0.4,
      look: [284, -14],
      lh: -2,
      fov: 52,
      move: { pan: 7 },
      label: 'An der Schleusebrücke',
    },
    // the heating house at the edge of the village (zeitreise-welt builds it)
    heizhaus: { pos: [292, -150], h: EYE, look: [318, -168], lh: 4, fov: 52, move: { dolly: 3 }, label: 'Am Heizhaus' },
    // the village's south edge by the lane: open fields up to the forest, the turbine on the ridge (230, −1290) straight ahead
    windrad: {
      pos: [330, -330],
      h: EYE,
      yaw: 186,
      pitch: 6,
      fov: 58,
      move: { dolly: 3 },
      label: 'Am Dorfrand, Blick zum Kamm',
    },
    // the old school (Ratschner Anger 24) from the green before it, by the signpost – the village's emergency point in the blackout
    schule: {
      pos: [231, -105],
      h: EYE,
      look: [226, -82],
      lh: 4,
      fov: 55,
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
      if (Number.isFinite(d.yaw)) {
        const a = (d.yaw * Math.PI) / 180;
        look = [
          pos[0] + Math.sin(a) * 100,
          pos[1] + Math.cos(a) * 100,
          pos[2] + Math.tan(((d.pitch || 0) * Math.PI) / 180) * 100,
        ];
      } else look = [d.look[0], d.look[1], ground(d.look[0], d.look[1]) + d.lh];
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
      if (p.foot) {
        const dz = ground(q.pos[0], q.pos[1]) + (p.pos[2] - ground(p.pos[0], p.pos[1])) - q.pos[2];
        q.pos[2] += dz;
        q.look[2] += dz; // the view keeps its pitch over a sloping ground
      }
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
