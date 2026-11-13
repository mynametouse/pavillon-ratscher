// trial runs: node viz3/extra/grenzland-polizei/sim/lauf.mjs [scene]
import { welt, steht, geht, faehrt, BOX } from './welt.mjs';
import { GLLOGIK } from '../../../src/grenzland/gl_logik.js';
const scene = process.argv[2] || 'suche';
const r = v => Math.round(v);
const show = (w, each = 5) => {
  let last = -1e9;
  return (t, p, evs) => {
    for (const e of evs) console.log(t.toFixed(1), 'EV', e[0], JSON.stringify(e[1]));
    if (t - last >= each) {
      last = t;
      console.log(
        t.toFixed(1),
        'stars', GLLOGIK.stars(w.W), w.W.known ? 'known' : 'hollow', w.W.state, 'unseen', w.W.unseen.toFixed(0),
        '| p', r(p.x), r(p.y),
        '| units', w.E.units.map(u => `${u.st}@${r(u.x)},${r(u.y)} v${u.v.toFixed(1)} ${u.crew}`).join(' ; '),
        '| cops', w.E.cops.map(c => `${c.st}@${r(c.x)},${r(c.y)}`).join(' ; '),
        '| last', w.E.last && w.E.last.map(r), 'wait', w.E.wait.toFixed(0)
      );
    }
  };
};
if (scene === 'suche') {
  const w = welt({ seed: 3 });
  w.deed('einbruch', 222, -108);
  w.spiel(steht(60, -420), 420, show(w, 10));
  console.log('stats', w.stats, 'units', w.E.units.length);
}
if (scene === 'fuss') {
  const w = welt({ seed: 3 });
  w.deed('einbruch', 222, -108);
  w.spiel(steht(226, -100), 200, show(w, 5));
  console.log('stats', w.stats);
}
if (scene === 'moped') {
  const w = welt({ seed: 3 });
  const f = faehrt(w.N, [222, -108], [860, -1300], 13);
  w.deed('einbruch', 222, -108, { police: true });
  w.E.wait = 1;
  w.spiel(f, 200, show(w, 5));
  console.log('stats', w.stats);
}

if (scene === 'flucht') {
  // on foot at the Anger; when the officers get out he runs north across the meadows
  const w = welt({ seed: 5 });
  w.deed('einbruch', 222, -108);
  let run = 0;
  const pl = (t, dt) => {
    if (!run && w.E.cops.length) run = t;
    const s = run ? Math.min(400, (t - run) * 4.75) : 0;
    return { x: 226 - s * 0.3, y: -100 + s * 0.95, v: run && s < 400 ? 4.75 : 0, hd: Math.atan2(-0.3, 0.95), veh: false, hidden: false, cover: false, sneak: false };
  };
  w.spiel(pl, 420, show(w, 6));
  console.log('stats', w.stats);
}
if (scene === 'acker') {
  // on the moped along the county road, then off into the field and stop
  const w = welt({ seed: 5 });
  const f = faehrt(w.N, [222, -108], [440, -663], 13);
  w.deed('einbruch', 222, -108, { police: true });
  w.E.wait = 1;
  let off = 0, q = null;
  const pl = (t, dt) => {
    const a = f(t);
    if (a.s < a.L) return a;
    if (!off) { off = t; q = a; }
    const s = Math.min(90, (t - off) * 9);
    return { x: q.x - s, y: q.y - s * 0.2, v: s < 90 ? 9 : 0, hd: Math.atan2(-1, -0.2), veh: true, hidden: false, cover: false, sneak: false };
  };
  w.spiel(pl, 260, show(w, 5));
  console.log('stats', w.stats);
}
