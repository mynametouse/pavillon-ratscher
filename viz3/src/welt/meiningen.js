// ===================== Meiningen and the Werra valley on the way: tiles, houses, street names (MEININGEN) =====================
// Falko 19.11. 18:52: „Meiningen … und den Weg nach Meiningen, sodass dort keine flache Karte erscheint, sondern echte Gebäude“ (Karten-Chat).
// Two zones of core/kern.js (KERN.zone) like Trusetal, each with its own tile set (tools/welt/build.py --plan MG / MR: ground DGM1 Thüringen
// 1 m, the 2024 aerial image of GDI-Th, the OSM roads cut in):
//   - Meiningen (welt-test/zonen/meiningen/): the town from Obermaßfeld to the Dampflokwerk, the finest level round the Markt, the
//     Stadtkirche, the Schloss Elisabethenburg, the theatre and the station;
//   - the Werra valley (welt-test/zonen/werratal/): the B 89 from Kloster Veßra's block by Henfstädt, Leutersdorf, Vachdorf, Belrieth and
//     Einhausen to Meiningen.
// The houses are the ETHOS.BUILDA buildings of the state's LoD2 in the cells of gebaeude/gebaeude.js (tools/welt-gebaeude/orte.py), the
// trees those of weltwald/; the named streets and places from OSM (tools/welt/zone_trusetal.py --zone MG / MR → <name>/ort.json) give
// the street on the HUD and in the map's place display. Reach it through the map (search „Meiningen“ → Hinfliegen), the jetpack's list
// or ?szenario=meiningen.
import { BASE } from '../core/head.js';
import { KERN } from '../core/kern.js';
import { go } from '../game/player.js';
import { WELT } from './welt.js';
export const MEININGEN = (() => {
  const S = { on: false, state: 'idle', ways: [], rev: 0, zones: {} };
  if (!WELT.on) return S;
  S.on = true;
  // model metres: the Markt by the Stadtkirche (UTM 600240/5602800) and the middle of the Werra valley's block (608700/5598000)
  const Z = [
    { id: 'meiningen', name: 'meiningen', sub: 'zonen/meiningen/', c: [-24230, 8931], near: 3000, far: 3800 },
    { id: 'werratal', name: 'werratal', sub: 'zonen/werratal/', c: [-16284, 3586], near: 6500, far: 7500 },
  ];
  const START = [-24240, 8787];
  const yawTo = (x, y, tx, ty) => (Math.atan2(tx - x, ty - y) * 180) / Math.PI;
  KERN.spot('meiningen', {
    mode: 'walk',
    pos: START,
    z: 0,
    yaw: yawTo(...START, -24242, 8809),
    pitch: 12,
    label: 'Meiningen, Markt',
  });
  KERN.scenario('meiningen', { label: 'Meiningen, Markt', order: 35, run: () => go('meiningen') });
  // the streets of the zones whose data is loaded, for karte/karte.js ({ name, ref, kind, n, p: [x, y, z, …] })
  function setWays() {
    S.ways = [];
    for (const z of Z)
      if (z.data)
        for (const s of z.data.streets) {
          const n = s.p.length / 2,
            p = new Array(n * 3).fill(0);
          for (let i = 0; i < n; i++) [p[i * 3], p[i * 3 + 1]] = [s.p[i * 2], s.p[i * 2 + 1]];
          S.ways.push({ name: s.name, ref: s.ref, kind: s.kind, n, p });
        }
    S.rev++;
  }
  for (const z of Z) {
    WELT.addSet(z.sub);
    S.zones[z.id] = z;
    KERN.zone({
      id: z.id,
      x: z.c[0],
      y: z.c[1],
      near: z.near,
      far: z.far,
      build: async () => {
        WELT.need(z.id, true, z.sub);
        if (!z.data) {
          try {
            const r = await fetch(BASE + z.name + '/ort.json');
            if (r.ok) {
              z.data = await r.json();
              setWays();
            }
          } catch (e) {
            z.err = String(e);
          }
        }
        if (z.id === 'meiningen') {
          await KERN.until(() => WELT.heightAt(START[0], START[1]) !== undefined, 900);
          const h = WELT.heightAt(START[0], START[1]);
          if (h !== undefined) KERN.spot('meiningen', { z: h });
        }
        z.state = 'ready';
        S.state = Z.some(q => q.state === 'ready') ? 'ready' : 'idle';
      },
      drop: () => {
        WELT.need(z.id, false);
        z.state = 'idle';
        S.state = Z.some(q => q.state === 'ready') ? 'ready' : 'idle';
      },
    });
  }
  // the HUD: the nearest named street within 20 m (or the B 89 by its number)
  let pc = [1e9, 0, null];
  KERN.provide(
    'place',
    (x, y) => {
      if (!S.ways.length || !Z.some(z => z.data && Math.hypot(x - z.c[0], y - z.c[1]) < z.far)) return undefined;
      if (Math.abs(x - pc[0]) < 1 && Math.abs(y - pc[1]) < 1) return pc[2] || undefined;
      let best = 20,
        nm = null;
      for (const w of S.ways) {
        const label = w.name || w.ref;
        if (!label) continue;
        for (let i = 0; i + 1 < w.n; i++) {
          const ax = w.p[i * 3],
            ay = w.p[i * 3 + 1];
          if (Math.abs(x - ax) > 300 || Math.abs(y - ay) > 300) continue;
          const ex = w.p[i * 3 + 3] - ax,
            ey = w.p[i * 3 + 4] - ay,
            t = Math.max(0, Math.min(1, ((x - ax) * ex + (y - ay) * ey) / (ex * ex + ey * ey || 1))),
            d = Math.hypot(x - ax - ex * t, y - ay - ey * t);
          if (d < best) [best, nm] = [d, label];
        }
      }
      pc = [x, y, nm];
      return nm || undefined;
    },
    14
  );
  S.status = () => ({
    state: S.state,
    ways: S.ways.length,
    zones: Z.map(z => ({ id: z.id, state: z.state || 'idle', err: z.err || '' })),
  });
  return S;
})();
window.MEININGEN = MEININGEN;
