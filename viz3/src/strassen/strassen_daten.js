// ===================== feat/strassen 2: the roads' data – towns and villages, and what stands beside the roads (STRDAT) =====================
// One small file (dist/strassen/ausstattung.json, made by viz3/extra/strassen/daten.py from OpenStreetMap and the app's own roads): the
// built-up areas (a town or a village – the raster of the roads asks for every stretch, world/roads.js and strassen/strassen_karte.js)
// and the furniture: delineators, guard rails, traffic signs, street lamps, power poles and lines (strassen/strassen.js builds them near
// the observer). It loads at the start beside the road file; world/roads.js waits for it (STRDAT.when) – and goes on without it when the
// file is missing or ?nostrassen is set (then every road is open country, as before).
// Round 2 (13.11.2026, wish W6 of the Suhl chat): further sets of the same shape may come and go while the app runs – STRDAT.add(name,
// json) / STRDAT.drop(name): the built-up areas of a town that loads only when one gets there, and its furniture. STRDAT.rev counts the
// changes, STRDAT.orev those of the built-up areas (the road map works out the styles of its ways again), STRDAT.onChange(fn) tells
// the furniture (strassen/strassen.js). Send the built-up areas of a town once, as a set of their own – not with every tile of it.
// © OpenStreetMap contributors (ODbL 1.0).
import * as THREE from 'three';
import { BASE } from '../core/head.js';
import { LM } from '../core/assets.js';
export const STRDAT = (() => {
  const S = {
    on: !new URLSearchParams(location.search).has('nostrassen'),
    ready: false,
    failed: false,
    data: null,
    orte: [],
    sets: new Map(), // name → { data, orte }: what came with STRDAT.add
    rev: 0, // counts every change
    orev: 0, // counts the changes of the built-up areas (the road map works out its styles again)
  };
  const waiting = [];
  // fn runs once the data is there or has failed – at once when that is already so; inside the file's load callback otherwise, so the
  // loading manager is still busy while fn works (world/roads.js must be ready before whenLoaded fires)
  S.when = fn => {
    if (S.ready || S.failed) fn(S);
    else waiting.push(fn);
  };
  const done = () => {
    for (const fn of waiting.splice(0)) {
      try {
        fn(S);
      } catch (e) {
        console.warn('strassen', e);
      }
    }
  };
  const inPoly = (r, x, y) => {
    let c = false;
    for (let i = 0, j = r.length - 2; i < r.length; j = i, i += 2)
      if (r[i + 1] > y !== r[j + 1] > y && x < ((r[j] - r[i]) * (y - r[i + 1])) / (r[j + 1] - r[i + 1]) + r[i]) c = !c;
    return c;
  };
  // 0 open country, 1 in a village, 2 in a town
  S.placeAt = (x, y) => {
    let best = 0;
    for (const o of S.orte) {
      if (o.t <= best) continue;
      for (const a of o.a)
        if (x > a.bb[0] && x < a.bb[2] && y > a.bb[1] && y < a.bb[3] && inPoly(a.r, x, y)) {
          best = o.t;
          break;
        }
    }
    return best;
  };
  // the place itself (its name) or null
  S.ortAt = (x, y) => {
    for (const o of S.orte)
      for (const a of o.a) if (x > a.bb[0] && x < a.bb[2] && y > a.bb[1] && y < a.bb[3] && inPoly(a.r, x, y)) return o;
    return null;
  };
  const orteOf = (j, set) =>
    (j.orte || []).map(o => ({
      n: o.n,
      t: o.t,
      set,
      a: o.a.map(q => {
        const r = Float32Array.from(q, v => v / 10),
          bb = [1e9, 1e9, -1e9, -1e9];
        for (let i = 0; i < r.length; i += 2) {
          bb[0] = Math.min(bb[0], r[i]);
          bb[1] = Math.min(bb[1], r[i + 1]);
          bb[2] = Math.max(bb[2], r[i]);
          bb[3] = Math.max(bb[3], r[i + 1]);
        }
        return { r, bb };
      }),
    }));
  S.parse = j => {
    S.data = j;
    // (sets that came before the file keep their places)
    S.orte = orteOf(j, '').concat(S.orte.filter(o => o.set));
  };
  // ---- further sets while the app runs: { orte, pfosten, planken, schilder, lampen, masten, leitungen, linien } as in the file ----
  const subs = [];
  S.onChange = fn => subs.push(fn);
  const tell = (name, added, orte) => {
    S.rev++;
    if (orte) S.orev++;
    for (const fn of subs) {
      try {
        fn(name, added);
      } catch (e) {
        console.warn('strassen', e);
      }
    }
  };
  S.drop = name => {
    const st = S.sets.get(name);
    if (!st) return false;
    S.sets.delete(name);
    if (st.orte.length) S.orte = S.orte.filter(o => o.set !== name);
    tell(name, false, st.orte.length > 0);
    return true;
  };
  S.add = (name, j) => {
    if (!S.on || !name || !j) return false;
    S.drop(name);
    const orte = orteOf(j, name);
    if (orte.length) S.orte = S.orte.concat(orte);
    S.sets.set(name, { data: j, orte });
    tell(name, true, orte.length > 0);
    return true;
  };
  if (!S.on) {
    S.failed = true;
    return S;
  }
  new THREE.FileLoader(LM).setResponseType('json').load(
    BASE + 'strassen/ausstattung.json',
    j => {
      try {
        S.parse(j);
        S.ready = true;
      } catch (e) {
        S.failed = true;
        S.err = String(e);
      }
      done();
    },
    undefined,
    () => {
      S.failed = true;
      S.err = 'load';
      done();
    }
  );
  return S;
})();
window.STRDAT = STRDAT;
