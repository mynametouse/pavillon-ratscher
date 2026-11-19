// ===================== feat/karte: a map to switch on, where am I (top left), destinations to look up and follow (KARTE) =====================
// Falko, 19.11.2026 2:22: „… wenn ich mit dem Jetpack drüber fliege und auch sonst, eine optional einschaltbare Karte, die mir zeigt, wo ich
// mich gerade befinde. Und links oben sollte auch optional immer angezeigt werden die Straße und das Gebiet, in dem ich mich gerade
// befinde, beziehungsweise Ort und Gebiet … Ich möchte auch selbstständig Zielorte eingeben können, die mir dann an der Karte angezeigt
// werden, die ich dann verfolgen kann.“
// - The small map (button „Karte“ top right, key K): round, turned with the view, on foot and in the jetpack (in a vehicle the vehicle's own
//   map, vehicles/minimap.js, shows the destination too). Its range grows with the height over the ground (180 m on foot, km in the air).
//   Behind the roads the aerial images of the tile sets the 3D world streams (welt-test, Kloster Veßra, Suhl, the Grenz-Zone): the same
//   files, so mostly from the browser's cache. A tap on it (or Shift+K) opens the large map.
// - The large map: north up, drag to move, wheel or two fingers to zoom, a tap sets the destination; a search box finds places (Wikidata:
//   towns, villages, parts of towns, mountains, forests, waters, castles, churches – tools/karte/orte.py), the streets of the drive's data
//   (welt/fahrt.js, Suhl's streets once loaded) and the places one can jump to (KERN.spot). Buttons: fly there (jetpack), the autopilot
//   (in a vehicle), clear.
// - Where am I (top left, instead of the place line): the street (named roads of the drive's data within 22 m), else what KERN.place knows
//   (the garden's rooms, the village's places, Schleusingen …); below: town or village · municipality · district (the districts from
//   OpenStreetMap), out in the land „bei …“ or the mountain, forest or lake nearby; in the air the height above sea level and over the
//   ground; with a destination its distance and an arrow towards it.
// - The destination: an orange beam with its name in the world, a line on both maps; reached within 25 m (60 m in a vehicle).
// Saved: pav-karte-v1 { map, ort, ziel }. Nothing is fetched at the start but the gazetteer (karte/orte.json, ~60 KB packed) a few seconds
// after loading; tiles only while a map is open.
import * as THREE from 'three';
import { KERN } from '../core/kern.js';
import { SAVE } from '../core/save.js';
import { BASE, COARSE, scene } from '../core/head.js';
import { markDirty } from '../core/assets.js';
import { P } from '../game/walkable.js';
import { WELT } from '../welt/welt.js';
import { FAHRT } from '../welt/fahrt.js';
import { SUHL } from '../welt/suhl.js';
import { VEH } from '../vehicles/vehicle.js';
import { MMAP } from '../vehicles/minimap.js';
import { JET } from '../jetpack/jetpack.js';
import { NAVI } from '../navi/navi.js';
import { toast } from '../audio/audio.js';

export const KARTE = (() => {
  const GM = window.GEOMAN || {},
    XF = GM.xf || { a: 1.0127906473420232, b: 0.07715765993901931, ex: 625469.0070213208, ey: 5595624.323524626 },
    H0 = Number.isFinite(GM.H0) ? GM.H0 : 374.617,
    XA = XF.a,
    XB = XF.b,
    S2 = XA * XA + XB * XB;
  const toUTM = (x, y) => [XA * x - XB * y + XF.ex, XB * x + XA * y + XF.ey];
  const ZK = 'kartenziel'; // the KERN.spot of the destination (the jetpack and the autopilot fly and drive to spots)
  const S = {
    map: false, // the small map
    ort: true, // where am I, top left
    ziel: null, // { label, x, y, kind }
    big: false,
    data: null, // the gazetteer
    err: '',
    line: ['', '', '', ''],
    n: { tiles: 0, req: 0, err: 0, draws: 0 },
  };

  // ---------------- saved ----------------
  const KS = SAVE.key('pav-karte-v1', {
    owner: 'karte',
    kind: 'json',
    def: { v: 1, map: false, ort: true, ziel: null },
    check: s =>
      !!s &&
      s.v === 1 &&
      typeof s.map === 'boolean' &&
      typeof s.ort === 'boolean' &&
      (s.ziel === null ||
        (!!s.ziel &&
          typeof s.ziel.label === 'string' &&
          s.ziel.label.length < 120 &&
          Number.isFinite(s.ziel.x) &&
          Number.isFinite(s.ziel.y) &&
          Math.abs(s.ziel.x) < 200000 &&
          Math.abs(s.ziel.y) < 200000)),
  });
  {
    const s0 = SAVE.get(KS);
    S.map = s0.map;
    S.ort = s0.ort;
    S.ziel = s0.ziel ? { label: s0.ziel.label, x: s0.ziel.x, y: s0.ziel.y, kind: s0.ziel.kind || '' } : null;
  }
  const save = () =>
    SAVE.set(KS, {
      v: 1,
      map: S.map,
      ort: S.ort,
      ziel: S.ziel
        ? { label: S.ziel.label, x: Math.round(S.ziel.x), y: Math.round(S.ziel.y), kind: S.ziel.kind || '' }
        : null,
    });

  // ---------------- where one may use it ----------------
  const special = () => {
    try {
      return !!(
        (window.ZSTATE && window.ZSTATE.on) ||
        (window.GLSTATE && window.GLSTATE.on) ||
        (window.ZUKUNFT && window.ZUKUNFT.S && window.ZUKUNFT.S.on) ||
        (window.ZKREGIE && window.ZKREGIE.state && window.ZKREGIE.state().on)
      );
    } catch (e) {
      return false;
    }
  };
  const clean = () => document.body.dataset.clean === '1';
  // where the observer is: the vehicle, else the walker
  function here() {
    const v = VEH.cur;
    if (v && v.st) return { x: v.st.x, y: v.st.y, z: Number.isFinite(v.st.z) ? v.st.z : P.feet, veh: true };
    return { x: P.x, y: P.y, z: P.feet, veh: false };
  }
  // the heading of the view (model: 0 = north, clockwise): the vehicle's, else the figure's – the cameras follow it (game/camera.js)
  function viewHeading() {
    const v = VEH.cur;
    if (v && v.st && Number.isFinite(v.st.psi)) return v.st.psi;
    return ((P.yaw || 0) * Math.PI) / 180;
  }
  function groundAt(x, y, z) {
    let g = null;
    try {
      g = KERN.ground(x, y, z === undefined ? 9999 : z);
    } catch (e) {}
    if (!Number.isFinite(g) && WELT && WELT.heightAt) {
      try {
        g = WELT.heightAt(x, y);
      } catch (e) {}
    }
    return Number.isFinite(g) ? g : null;
  }
  const fmtD = d =>
    d >= 950
      ? (d / 1000).toFixed(d >= 9950 ? 0 : 1).replace('.', ',') + ' km'
      : Math.max(10, Math.round(d / 10) * 10) + ' m';
  const DIRS = ['Nord', 'Nordost', 'Ost', 'Südost', 'Süd', 'Südwest', 'West', 'Nordwest'];
  const dirName = a => DIRS[Math.round((((a * 180) / Math.PI + 360) % 360) / 45) % 8];

  // ---------------- the gazetteer (tools/karte/orte.py) ----------------
  const SETTLE = new Set(['Stadt', 'Gemeinde', 'Ortsteil', 'Dorf', 'Stadtteil', 'Weiler', 'Wohnplatz', 'Ort']);
  const norm = s =>
    String(s || '')
      .toLowerCase()
      .replace(/ä/g, 'ae')
      .replace(/ö/g, 'oe')
      .replace(/ü/g, 'ue')
      .replace(/ß/g, 'ss')
      .normalize('NFD')
      .replace(/[̀-ͯ]/g, '')
      .replace(/[^a-z0-9 ]+/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  let dataP = null;
  function loadData() {
    if (dataP) return dataP;
    dataP = fetch(BASE + 'karte/orte.json')
      .then(r => (r.ok ? r.json() : Promise.reject(new Error('karte/orte.json ' + r.status))))
      .then(j => {
        const orte = [],
          grid = new Map(),
          C = 2000;
        for (const r of j.orte || []) {
          if (!Array.isArray(r) || r.length < 9 || !Number.isFinite(r[2]) || !Number.isFinite(r[3])) continue;
          const o = {
            n: r[0],
            k: r[1],
            x: r[2],
            y: r[3],
            g: r[4],
            kr: r[5],
            pop: r[6],
            r: r[7],
            m: r[8],
            q: norm(r[0]),
          };
          o.s = SETTLE.has(o.k);
          o.rr = !o.s
            ? 0
            : o.k === 'Stadt'
              ? o.pop > 20000
                ? 2600
                : o.pop > 5000
                  ? 1500
                  : 1000
              : o.k === 'Weiler' || o.k === 'Wohnplatz'
                ? 350
                : 650;
          orte.push(o);
          const key = Math.floor(o.x / C) * 4099 + Math.floor(o.y / C);
          let a = grid.get(key);
          if (!a) grid.set(key, (a = []));
          a.push(o);
        }
        const kreise = (j.kreise || []).map(k => {
          const polys = (k.p || []).filter(p => Array.isArray(p) && p.length >= 6);
          let x0 = 1e9,
            y0 = 1e9,
            x1 = -1e9,
            y1 = -1e9;
          for (const p of polys)
            for (let i = 0; i < p.length; i += 2) {
              x0 = Math.min(x0, p[i]);
              x1 = Math.max(x1, p[i]);
              y0 = Math.min(y0, p[i + 1]);
              y1 = Math.max(y1, p[i + 1]);
            }
          return { n: k.n, polys, bb: [x0, y0, x1, y1] };
        });
        const towns = new Map();
        for (const o of orte) if (o.k === 'Stadt' || o.k === 'Gemeinde') towns.set(o.n, o.k);
        S.data = { orte, grid, C, kreise, towns, src: j.src || '' };
        return S.data;
      })
      .catch(e => {
        S.err = String(e);
        dataP = null;
        S.dataFail = performance.now();
        throw e;
      });
    return dataP;
  }
  function near(x, y, r) {
    const D = S.data;
    if (!D) return [];
    const C = D.C,
      out = [];
    for (let i = Math.floor((x - r) / C); i <= Math.floor((x + r) / C); i++)
      for (let j = Math.floor((y - r) / C); j <= Math.floor((y + r) / C); j++) {
        const a = D.grid.get(i * 4099 + j);
        if (a) for (const o of a) if (Math.abs(o.x - x) <= r && Math.abs(o.y - y) <= r) out.push(o);
      }
    return out;
  }
  function inPoly(p, x, y) {
    let c = false;
    for (let i = 0, j = p.length - 2; i < p.length; j = i, i += 2) {
      const xi = p[i],
        yi = p[i + 1],
        xj = p[j],
        yj = p[j + 1];
      if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi + 1e-12) + xi) c = !c;
    }
    return c;
  }
  function kreisAt(x, y) {
    const D = S.data;
    if (!D) return '';
    for (const k of D.kreise) {
      if (x < k.bb[0] || x > k.bb[2] || y < k.bb[1] || y > k.bb[3]) continue;
      for (const p of k.polys) if (inPoly(p, x, y)) return k.n;
    }
    return '';
  }
  // the village or town the drive's data draw around (fahrt/strassen.json places, their outlines)
  function fahrtPlace(x, y) {
    const D = (FAHRT && FAHRT.ready && FAHRT.data) || own;
    if (!D || !D.places) return null;
    for (const p of D.places)
      for (const a of p.a || []) {
        const r = a && (a.r || a),
          bb = a && a.bb;
        if (bb && (x < bb[0] || x > bb[2] || y < bb[1] || y > bb[3])) continue;
        if (Array.isArray(r) || (r && r.length)) if (inPoly(r, x, y)) return p.n;
      }
    return null;
  }
  // town or village, municipality, district, a landmark nearby – for the line top left and for a point set on the map
  function describe(x, y) {
    const out = { ort: null, bei: null, nat: null, gem: '', kreis: kreisAt(x, y) };
    const cand = near(x, y, 4000);
    let best = null,
      bq = 1,
      nb = null,
      nd = 3200;
    for (const o of cand) {
      if (!o.s) continue;
      const d = Math.hypot(o.x - x, o.y - y),
        q = d / o.rr;
      if (q < bq) {
        bq = q;
        best = o;
      }
      if (d < nd && o.r >= 3) {
        nd = d;
        nb = o;
      }
    }
    const fp = fahrtPlace(x, y);
    if (fp) {
      const o = cand.find(c => c.s && c.n === fp);
      best = o || { n: fp, k: 'Ort', g: '' };
    }
    out.ort = best;
    if (!best) {
      out.bei = nb;
      let nn = null,
        ndn = 1e9;
      for (const o of cand) {
        if (o.s) continue;
        const lim =
          o.k === 'Wald' || o.k === 'Gebirge' || o.k === 'Landschaft'
            ? 1500
            : o.k === 'Berg' || o.k === 'Hügel'
              ? 700
              : o.k === 'Talsperre' || o.k === 'See'
                ? 600
                : o.k === 'Fluss' || o.k === 'Bach'
                  ? 250
                  : 120;
        const d = Math.hypot(o.x - x, o.y - y);
        if (d < lim && d / lim < ndn) {
          ndn = d / lim;
          nn = o;
        }
      }
      out.nat = nn;
    }
    const g = best && best.g && best.g !== best.n ? best.g : '';
    if (g) out.gem = (S.data && S.data.towns.get(g) === 'Stadt' ? 'Stadt ' : 'Gemeinde ') + g;
    if (!g && nb && !best && nb.g)
      out.gem = (S.data && S.data.towns.get(nb.g) === 'Stadt' ? 'Stadt ' : 'Gemeinde ') + nb.g;
    return out;
  }
  const PREP = {
    Berg: 'am',
    Hügel: 'am',
    Gebirge: 'im',
    Wald: 'im',
    Landschaft: 'im',
    Talsperre: 'an der',
    See: 'am',
    Fluss: 'an der',
    Bach: 'am',
    Burg: 'an der',
    Schloss: 'am',
    Kirche: 'an der',
    Kloster: 'am',
    Ruine: 'an der',
    Turm: 'am',
    Aussichtsturm: 'am',
    Bahnhof: 'am',
    Park: 'im',
    Museum: 'am',
  };
  const natText = o => {
    const p = PREP[o.k] || 'bei';
    // a name that already says what it is („Talsperre Ratscher“, „Schneekopfturm“) needs no article of its own
    return (p === 'an der' && /^(Talsperre|Burg|Kirche|Ruine)\b/.test(o.n) ? 'an der' : p) + ' ' + o.n;
  };
  function labelAt(x, y) {
    const d = describe(x, y);
    if (d.ort) return d.ort.n;
    if (d.nat) return d.nat.n;
    if (d.bei) return 'bei ' + d.bei.n;
    return 'Punkt auf der Karte';
  }

  // ---------------- roads: the drive's data (welt/fahrt.js), or a copy of its file until the drive loads it ----------------
  let own = null,
    ownP = null;
  function loadOwnRoads() {
    if (ownP || (FAHRT && FAHRT.ready)) return;
    ownP = fetch(BASE + 'fahrt/strassen.json')
      .then(r => (r.ok ? r.json() : Promise.reject(new Error('HTTP ' + r.status))))
      .then(j => {
        if (FAHRT && FAHRT.ready) return;
        const KINDS = ['motorway', 'main', 'county', 'street', 'lane', 'service', 'track', 'path', 'foot'],
          km = (j.kinds || KINDS).map(k => KINDS.indexOf(k)),
          names = j.names || [''],
          ways = [];
        for (const row of j.ways || []) {
          const [k0, , w10, fl, ni, ri, q] = row;
          const k = km[k0];
          if (!(k >= 0) || !q || q.length < 6) continue;
          const n = Math.floor(q.length / 3),
            p = new Float32Array(n * 3);
          for (let i = 0; i < n * 3; i++) p[i] = q[i] / 10;
          let x0 = 1e9,
            y0 = 1e9,
            x1 = -1e9,
            y1 = -1e9;
          for (let i = 0; i < n; i++) {
            x0 = Math.min(x0, p[i * 3]);
            x1 = Math.max(x1, p[i * 3]);
            y0 = Math.min(y0, p[i * 3 + 1]);
            y1 = Math.max(y1, p[i * 3 + 1]);
          }
          ways.push({
            kind: k,
            hw: w10 / 20,
            fl,
            name: names[ni] || '',
            ref: names[ri] || '',
            p,
            n,
            bb: [x0, y0, x1, y1],
          });
        }
        own = { ways, places: j.places || [] };
        roadsKey = '';
      })
      .catch(e => {
        S.err = 'roads ' + e;
      });
  }
  const roadWays = () => (FAHRT && FAHRT.ready && FAHRT.data ? FAHRT.data.ways : own ? own.ways : []);
  // the named roads in a grid of 40 m for the street under one's feet
  let roadsKey = '',
    RG = null;
  function roadGrid() {
    const W = roadWays(),
      key = (FAHRT && FAHRT.ready ? 'f' + (FAHRT.rev || 0) : own ? 'o' : '-') + ':' + W.length;
    if (RG && key === roadsKey) return RG;
    roadsKey = key;
    RG = new Map();
    const C = 40;
    for (const w of W) {
      const nm = w.name || w.ref;
      if (!nm || w.kind > 6) continue;
      for (let i = 0; i < w.n - 1; i++) {
        const ax = w.p[i * 3],
          ay = w.p[i * 3 + 1],
          bx = w.p[i * 3 + 3],
          by = w.p[i * 3 + 4],
          L = Math.hypot(bx - ax, by - ay),
          m = Math.max(1, Math.ceil(L / 20));
        const seen = new Set();
        for (let s = 0; s <= m; s++) {
          const x = ax + ((bx - ax) * s) / m,
            y = ay + ((by - ay) * s) / m,
            k = Math.floor(x / C) * 100003 + Math.floor(y / C);
          if (seen.has(k)) continue;
          seen.add(k);
          let a = RG.get(k);
          if (!a) RG.set(k, (a = []));
          a.push([w, i]);
        }
      }
    }
    return RG;
  }
  function streetAt(x, y, r) {
    const G = roadGrid(),
      C = 40;
    let best = null,
      bd = r;
    for (let i = Math.floor((x - r) / C); i <= Math.floor((x + r) / C); i++)
      for (let j = Math.floor((y - r) / C); j <= Math.floor((y + r) / C); j++) {
        const a = G.get(i * 100003 + j);
        if (!a) continue;
        for (const [w, s] of a) {
          const ax = w.p[s * 3],
            ay = w.p[s * 3 + 1],
            dx = w.p[s * 3 + 3] - ax,
            dy = w.p[s * 3 + 4] - ay,
            L2 = dx * dx + dy * dy || 1,
            t = Math.max(0, Math.min(1, ((x - ax) * dx + (y - ay) * dy) / L2)),
            d = Math.hypot(ax + dx * t - x, ay + dy * t - y) - (w.hw || 2);
          if (d < bd) {
            bd = d;
            best = w;
          }
        }
      }
    if (!best) return '';
    return best.name && best.ref && best.kind <= 2 ? best.name + ' (' + best.ref + ')' : best.name || best.ref;
  }

  // ---------------- where am I: the panel top left ----------------
  const st = document.createElement('style');
  st.textContent = `
#ortinfo{left:max(12px,env(safe-area-inset-left,0px));top:calc(12px + env(safe-area-inset-top,0px));max-width:min(420px,calc(100vw - 260px));
  background:var(--ov-bg,rgba(20,24,30,.6));border-radius:8px;padding:7px 11px 8px;backdrop-filter:blur(6px);color:var(--ov-ink,#fff);z-index:3;
  pointer-events:auto;cursor:pointer}
#ortinfo[hidden]{display:none}
#ortinfo b{display:block;font:600 14px/1.25 var(--f-body,system-ui);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
#ortinfo span{display:block;font:400 12px/1.35 var(--f-body,system-ui);opacity:.86;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
#ortinfo .oh{font:400 11px/1.3 var(--f-mono,monospace);opacity:.75}
#ortinfo .oz{color:#ffb070;opacity:1;font-weight:600}
#ortinfo .oz i{display:inline-block;font-style:normal;width:14px;text-align:center;margin-right:3px}
body[data-ort="1"] .where{display:none}
body[data-ort="1"] #qtrack{top:calc(var(--ort-h,58px) + 22px)}
body[data-ort="1"] #vmap{top:calc(var(--ort-h,58px) + 20px)}
body[data-ort="1"] #vmaplab{top:calc(var(--ort-h,58px) + 194px)}
body[data-clean="1"] #ortinfo,body[data-clean="1"] #kmini,body[data-clean="1"] #kminilab{display:none!important}
#kmini{right:max(12px,env(safe-area-inset-right,0px));top:calc(62px + env(safe-area-inset-top,0px));width:176px;height:176px;border-radius:50%;
  z-index:3;pointer-events:auto;cursor:pointer;box-shadow:0 2px 10px rgba(0,0,0,.35)}
#kmini[hidden],#kminilab[hidden]{display:none}
#kminilab{right:max(12px,env(safe-area-inset-right,0px));top:calc(244px + env(safe-area-inset-top,0px));width:176px;text-align:center;
  font:600 12px/1.2 var(--f-body,system-ui);color:#ffb070;text-shadow:0 1px 3px rgba(0,0,0,.7);pointer-events:none;z-index:3}
#kartebtn[aria-pressed="true"]{background:#ff6a13;color:#fff}
#kbig{position:absolute;inset:max(10px,3vmin);z-index:12;border-radius:16px;overflow:hidden;background:#1c1f1a;box-shadow:0 10px 40px rgba(0,0,0,.5);
  color:#fff;display:flex;flex-direction:column;pointer-events:auto;font:400 13px/1.3 var(--f-body,system-ui)}
#kbig[hidden]{display:none}
#kbig .kh{display:flex;gap:8px;align-items:center;padding:8px;background:rgba(18,17,15,.92);flex-wrap:wrap}
#kbig .ks{position:relative;flex:1 1 220px;min-width:180px}
#kbig input{width:100%;box-sizing:border-box;border:0;border-radius:999px;padding:9px 14px;font:500 14px/1.2 var(--f-body,system-ui);
  background:rgba(255,255,255,.14);color:#fff;outline:none}
#kbig input::placeholder{color:rgba(255,255,255,.6)}
#kbig .kr{position:absolute;left:0;right:0;top:calc(100% + 4px);background:rgba(24,24,22,.97);border-radius:12px;overflow:hidden;z-index:2;
  max-height:min(380px,55vh);overflow-y:auto;box-shadow:0 6px 20px rgba(0,0,0,.45)}
#kbig .kr[hidden]{display:none}
#kbig .kr button{display:block;width:100%;text-align:left;border:0;background:none;color:#fff;padding:8px 12px;cursor:pointer;font:500 13px/1.25 var(--f-body,system-ui)}
#kbig .kr button small{display:block;font-weight:400;opacity:.65}
#kbig .kr button:hover,#kbig .kr button.on{background:rgba(255,106,19,.35)}
#kbig .kr button.off{opacity:.55}
#kbig .kb{border:0;border-radius:999px;padding:8px 12px;cursor:pointer;background:rgba(255,255,255,.14);color:#fff;font:500 13px/1.1 var(--f-body,system-ui)}
#kbig .kb[aria-pressed="true"]{background:#ff6a13}
#kbig .kb.acc{background:#ff6a13}
#kbig .kx{font-size:18px;padding:5px 12px}
#kbig .kc{position:relative;flex:1;min-height:0;touch-action:none;cursor:grab}
#kbig .kc canvas{position:absolute;inset:0;width:100%;height:100%}
#kbig .kz{position:absolute;right:10px;top:10px;display:grid;gap:6px}
#kbig .kz button{width:40px;height:40px;border-radius:50%;border:0;background:rgba(18,17,15,.75);color:#fff;font:600 19px/1 system-ui;cursor:pointer}
#kbig .kf{display:flex;gap:8px;align-items:center;padding:8px 10px;background:rgba(18,17,15,.92);flex-wrap:wrap}
#kbig .kf .kt{flex:1 1 200px;min-width:0}
#kbig .kf .kt b{color:#ffb070}
#kbig .ka{position:absolute;left:8px;bottom:6px;font:400 10px/1.2 var(--f-body,system-ui);opacity:.75;text-shadow:0 1px 2px #000;pointer-events:none}
#kbig label{display:flex;gap:5px;align-items:center;white-space:nowrap;font-size:12.5px;opacity:.9;cursor:pointer}
@media (max-width:560px){#kmini{width:120px;height:120px;top:calc(56px + env(safe-area-inset-top,0px))}
  #kminilab{width:120px;top:calc(180px + env(safe-area-inset-top,0px))}
  #ortinfo{top:calc(8px + env(safe-area-inset-top,0px));max-width:calc(100vw - 200px);padding:5px 9px 6px}
  #ortinfo b{font-size:13px} #ortinfo span{font-size:11.5px}
  #kbig{inset:6px} #kbig .kh label{display:none}}`;
  document.head.appendChild(st);
  const ort = document.createElement('div');
  ort.id = 'ortinfo';
  ort.className = 'ov';
  ort.hidden = true;
  ort.setAttribute('aria-live', 'polite');
  ort.title = 'Wo bin ich – antippen für die große Karte';
  ort.innerHTML =
    '<b></b><span class="o2"></span><span class="oh" hidden></span><span class="oz" hidden><i>➤</i><em></em></span>';
  ort.addEventListener('click', () => openBig());
  const mini = document.createElement('canvas');
  mini.id = 'kmini';
  mini.className = 'ov';
  mini.hidden = true;
  mini.setAttribute('aria-label', 'Karte – antippen für die große Karte');
  mini.addEventListener('click', () => openBig());
  const minilab = document.createElement('div');
  minilab.id = 'kminilab';
  minilab.className = 'ov';
  minilab.hidden = true;

  let lastOrt = 0,
    ortH = 0;
  function updateOrt() {
    const show = S.ort && P.mode === 'walk' && !special();
    if (ort.hidden === show) ort.hidden = !show;
    const want = show && !clean() ? '1' : '';
    if ((document.body.dataset.ort || '') !== want) document.body.dataset.ort = want;
    if (!show) return;
    const h = here();
    if (!S.data && !dataP && performance.now() - (S.dataFail || -1e9) > 30000) loadData().catch(() => {});
    if (!own && !(FAHRT && FAHRT.ready)) loadOwnRoads();
    const flyH =
      JET && JET.S && JET.S.flying
        ? (() => {
            const g = groundAt(h.x, h.y, h.z + 1);
            return g === null ? null : h.z - g;
          })()
        : null;
    const high = flyH !== null && flyH > 40;
    let kp = null;
    try {
      kp = KERN.place(h.x, h.y, h.z);
    } catch (e) {}
    const street = high ? '' : streetAt(h.x, h.y, h.veh ? 14 : 22);
    const d = describe(h.x, h.y);
    let l1 = street;
    if (!l1 && kp && !/^Feldflur|^Modellansicht/.test(kp)) l1 = String(kp).split(/, | · /)[0];
    if (!l1 || high)
      l1 = d.ort
        ? (high ? 'Über ' : '') + d.ort.n
        : d.nat
          ? (high ? 'Über dem Land ' : '') + natText(d.nat)
          : d.bei
            ? 'Bei ' + d.bei.n
            : 'Unterwegs';
    const parts = [];
    if (d.ort && d.ort.n !== l1 && !l1.endsWith(d.ort.n)) parts.push(d.ort.n);
    else if (!d.ort) {
      if (d.nat && !l1.includes(d.nat.n)) parts.push(natText(d.nat));
      if (d.bei && !l1.includes(d.bei.n)) parts.push('bei ' + d.bei.n);
    }
    if (d.gem && !parts.some(p => d.gem.endsWith(p)) && !l1.endsWith(d.gem.replace(/^(Stadt|Gemeinde) /, '')))
      parts.push(d.gem);
    if (d.kreis) parts.push(d.kreis);
    const l2 = parts.join(' · ') || (S.data ? '' : 'Orte laden …');
    const l3 =
      flyH !== null && flyH > 4 ? Math.round(h.z + H0) + ' m ü. NN · ' + Math.round(flyH) + ' m über Grund' : '';
    let l4 = '',
      rot = 0;
    if (S.ziel) {
      const dx = S.ziel.x - h.x,
        dy = S.ziel.y - h.y;
      rot = ((Math.atan2(dx, dy) - viewHeading()) * 180) / Math.PI;
      l4 = 'Ziel ' + S.ziel.label + ' · ' + fmtD(Math.hypot(dx, dy));
    }
    const L = [l1, l2, l3, l4];
    const els = ort.children;
    if (L[0] !== S.line[0]) els[0].textContent = L[0];
    if (L[1] !== S.line[1]) els[1].textContent = L[1];
    if (L[2] !== S.line[2]) {
      els[2].textContent = L[2];
      els[2].hidden = !L[2];
    }
    if (L[3] !== S.line[3]) {
      els[3].querySelector('em').textContent = L[3];
      els[3].hidden = !L[3];
    }
    els[3].querySelector('i').style.transform = 'rotate(' + (rot - 90).toFixed(0) + 'deg)';
    S.line = L;
    const hh = ort.offsetHeight + ort.offsetTop;
    if (hh && Math.abs(hh - ortH) > 1) {
      ortH = hh;
      document.body.style.setProperty('--ort-h', hh + 'px');
    }
  }

  // ---------------- aerial tiles of the tile sets (the same files the world streams) ----------------
  const ROOT_E0 = 420700,
    ROOT_N0 = 5390800,
    ROOT = 409600;
  const TS = { sets: null, p: null }; // [{ base, levels: { L: { rect, has } } }]
  function loadSets() {
    if (TS.p) return TS.p;
    const metas = [];
    const one = (base, url) =>
      fetch(url || base + 'meta.json')
        .then(r => (r.ok ? r.json() : null))
        .then(j => (j && j.tiling ? { base, levels: j.tiling.levels } : null))
        .catch(() => null);
    if (WELT && WELT.base) {
      metas.push(WELT.meta ? Promise.resolve({ base: WELT.base, levels: WELT.meta.tiling.levels }) : one(WELT.base));
      metas.push(one(WELT.base + 'zonen/vessra/'));
    }
    metas.push(one(BASE + 'grenzland-zone/welt/'));
    if (SUHL && SUHL.on && SUHL.DATA && SUHL.BASE)
      metas.push(
        fetch(SUHL.BASE + 'aktuell.json')
          .then(r => (r.ok ? r.json() : null))
          .then(a => {
            const pr = a && a.products && a.products.boden;
            return pr && pr.path ? one(SUHL.BASE + pr.path) : null;
          })
          .catch(() => null)
      );
    TS.p = Promise.all(metas).then(list => {
      TS.sets = list.filter(Boolean);
      for (const s of TS.sets)
        for (const L in s.levels) {
          const lv = s.levels[L];
          if (lv.has) lv.hs = new Set(lv.has.map(q => q[0] + '/' + q[1]));
        }
      dirtyBig = true;
      return TS.sets;
    });
    return TS.p;
  }
  function setOf(L, x, y) {
    if (!TS.sets) return null;
    for (const s of TS.sets) {
      const lv = s.levels[L],
        r = lv && lv.rect;
      if (!r || x < r[0] || x > r[2] || y < r[1] || y > r[3]) continue;
      if (lv.hs && !lv.hs.has(x + '/' + y)) continue;
      return s;
    }
    return null;
  }
  const TILE = new Map(), // 'L/x/y' → { img, st: 'load' | 'ok' | 'err', used }
    TMAX = COARSE ? 36 : 90;
  let tBusy = 0;
  function tile(L, x, y) {
    const k = L + '/' + x + '/' + y;
    let t = TILE.get(k);
    if (t) {
      t.used = performance.now();
      return t;
    }
    const s = setOf(L, x, y);
    if (!s) return null;
    if (tBusy >= 6) return null;
    t = { img: new Image(), st: 'load', used: performance.now() };
    TILE.set(k, t);
    tBusy++;
    S.n.req++;
    t.img.decoding = 'async';
    // as three's loader asks for them (CORS), so that the browser's cache serves the same file to both
    t.img.crossOrigin = 'anonymous';
    t.img.onload = () => {
      tBusy--;
      t.st = 'ok';
      S.n.tiles++;
      dirtyBig = true;
      miniT = 1;
    };
    t.img.onerror = () => {
      tBusy--;
      t.st = 'err';
      S.n.err++;
    };
    t.img.src = s.base + 'i/' + L + '/' + x + '/' + y + '.webp';
    if (TILE.size > TMAX) {
      // drop the least recently used (the browser keeps the file in its cache)
      const arr = [...TILE.entries()].filter(e => e[1].st !== 'load').sort((a, b) => a[1].used - b[1].used);
      for (let i = 0; i < arr.length && TILE.size > TMAX; i++) {
        arr[i][1].img.src = '';
        TILE.delete(arr[i][0]);
      }
    }
    return t;
  }

  // ---------------- drawing (both maps): a view { cx, cy, k (px per m), th (turn), W, H, D } ----------------
  const COLK = ['#f2a07a', '#ffd27a', '#fff0a8', '#ffffff', '#ece8e0', '#e2ddd4', '#d2b483', '#c9b08c', '#d4c6b0'],
    WMIN = [2.6, 2.2, 1.9, 1.5, 1.2, 1, 0.9, 0.7, 0.7];
  function toScr(V) {
    const c = Math.cos(V.th),
      s = Math.sin(V.th);
    // model → screen: [k c, -k s; -k s, -k c] (p - centre) + (W/2, H/2)
    return {
      m: [V.k * c, -V.k * s, -V.k * s, -V.k * c],
      P: (x, y) => {
        const dx = x - V.cx,
          dy = y - V.cy;
        return [V.W / 2 + V.k * (dx * c - dy * s), V.H / 2 - V.k * (dx * s + dy * c)];
      },
      inv: (sx, sy) => {
        const u = (sx - V.W / 2) / V.k,
          v = -(sy - V.H / 2) / V.k;
        return [V.cx + u * c + v * s, V.cy - u * s + v * c];
      },
    };
  }
  function drawTiles(g, V, T) {
    if (!TS.sets) {
      loadSets();
      return;
    }
    // the level whose pixels match the screen's (a little finer on sharp screens)
    const mpp = 1 / (V.k * (V.D || 1)),
      want = Math.log2(ROOT / 512 / mpp);
    let L = Math.max(5, Math.min(12, Math.round(want)));
    // the corners of the view in UTM
    const cs = [
      [0, 0],
      [V.W, 0],
      [0, V.H],
      [V.W, V.H],
    ].map(q => toUTM(...T.inv(q[0], q[1])));
    let E0 = 1e12,
      E1 = -1e12,
      N0 = 1e12,
      N1 = -1e12;
    for (const q of cs) {
      E0 = Math.min(E0, q[0]);
      E1 = Math.max(E1, q[0]);
      N0 = Math.min(N0, q[1]);
      N1 = Math.max(N1, q[1]);
    }
    const D = V.D || 1;
    const draw = (Lv, x, y, t) => {
      const s = ROOT / (1 << Lv),
        m = s / 512,
        e0 = ROOT_E0 + x * s - XF.ex,
        n1 = ROOT_N0 + (y + 1) * s - XF.ey;
      // image pixel (u, v) → model: x = (a dE + b dN)/S2, y = (-b dE + a dN)/S2 with dE = e0 + u m, dN = n1 - v m
      const ax = (XA * m) / S2,
        bx = (-XB * m) / S2,
        tx = (XA * e0 + XB * n1) / S2,
        ay = (-XB * m) / S2,
        by = (-XA * m) / S2,
        ty = (-XB * e0 + XA * n1) / S2;
      const M = T.m,
        ox = V.W / 2 - M[0] * V.cx - M[1] * V.cy,
        oy = V.H / 2 - M[2] * V.cx - M[3] * V.cy;
      // screen = M (model) + o
      const a = M[0] * ax + M[1] * ay,
        c = M[0] * bx + M[1] * by,
        e = M[0] * tx + M[1] * ty + ox,
        b = M[2] * ax + M[3] * ay,
        d = M[2] * bx + M[3] * by,
        f = M[2] * tx + M[3] * ty + oy;
      g.setTransform(a * D, b * D, c * D, d * D, e * D, f * D);
      g.drawImage(t.img, 0, 0, 512.8, 512.8);
    };
    // coarser levels first as the background, the wanted level on top (whatever of it is there)
    const order = [];
    for (let Lv = Math.max(5, L - 3); Lv <= L; Lv++) order.push(Lv);
    let n = 0;
    for (const Lv of order) {
      const s = ROOT / (1 << Lv),
        x0 = Math.floor((E0 - ROOT_E0) / s),
        x1 = Math.floor((E1 - ROOT_E0) / s),
        y0 = Math.floor((N0 - ROOT_N0) / s),
        y1 = Math.floor((N1 - ROOT_N0) / s);
      if ((x1 - x0 + 1) * (y1 - y0 + 1) > 64) continue;
      for (let x = x0; x <= x1; x++)
        for (let y = y0; y <= y1; y++) {
          const t = tile(Lv, x, y);
          if (t && t.st === 'ok') {
            draw(Lv, x, y, t);
            n++;
          }
        }
    }
    g.setTransform(D, 0, 0, D, 0, 0);
    return n;
  }
  function drawRoads(g, V, T, R2) {
    const W = roadWays(),
      lw = V.k;
    g.lineCap = 'round';
    g.lineJoin = 'round';
    for (let kind = 8; kind >= 0; kind--) {
      if (V.k < 0.06 && kind > 2) continue;
      if (V.k < 0.2 && kind > 5) continue;
      g.strokeStyle = COLK[kind];
      g.globalAlpha = kind > 5 ? 0.7 : 0.9;
      let open = false;
      for (const w of W) {
        if (w.kind !== kind) continue;
        const b = w.bb;
        if (b && (b[2] < V.cx - R2 || b[0] > V.cx + R2 || b[3] < V.cy - R2 || b[1] > V.cy + R2)) continue;
        if (!open) {
          g.lineWidth = Math.max(WMIN[kind], (w.hw || 2) * 2 * lw);
          g.beginPath();
          open = true;
        }
        for (let i = 0; i < w.n; i++) {
          const q = T.P(w.p[i * 3], w.p[i * 3 + 1]);
          i ? g.lineTo(q[0], q[1]) : g.moveTo(q[0], q[1]);
        }
      }
      if (open) g.stroke();
    }
    g.globalAlpha = 1;
  }
  function drawLabels(g, V, T, minRank, small) {
    const D = S.data;
    if (!D) return;
    const R2 = Math.hypot(V.W, V.H) / 2 / V.k;
    const boxes = [];
    const list = near(V.cx, V.cy, R2)
      .filter(o => o.r >= minRank && (o.s || V.k > 0.12 || o.r >= 5))
      .sort((a, b) => b.r - a.r || b.pop - a.pop);
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    for (const o of list.slice(0, 160)) {
      const q = T.P(o.x, o.y);
      if (q[0] < -40 || q[0] > V.W + 40 || q[1] < -20 || q[1] > V.H + 20) continue;
      const fs = small ? (o.r >= 8 ? 11 : 10) : o.r >= 9 ? 16 : o.r >= 8 ? 14 : o.s ? 12.5 : 11.5;
      g.font = (o.r >= 6 ? '700 ' : o.s ? '600 ' : 'italic 500 ') + fs + 'px system-ui, sans-serif';
      const txt = (o.k === 'Berg' || o.k === 'Hügel' ? '▲ ' : '') + o.n,
        w = g.measureText(txt).width + 6,
        bx = [q[0] - w / 2, q[1] - fs / 2 - 2, q[0] + w / 2, q[1] + fs / 2 + 2];
      if (boxes.some(c => bx[0] < c[2] && bx[2] > c[0] && bx[1] < c[3] && bx[3] > c[1])) continue;
      boxes.push(bx);
      g.lineWidth = 3;
      g.strokeStyle = 'rgba(0,0,0,.72)';
      g.strokeText(txt, q[0], q[1]);
      g.fillStyle = o.s
        ? '#fff'
        : o.k === 'See' || o.k === 'Talsperre' || o.k === 'Fluss' || o.k === 'Bach'
          ? '#bfe3ff'
          : '#e8f2d8';
      g.fillText(txt, q[0], q[1]);
    }
  }
  function drawZiel(g, V, T, me, clip) {
    if (!S.ziel) return;
    const q = T.P(S.ziel.x, S.ziel.y),
      m = T.P(me.x, me.y);
    // the autopilot's way, if it drives there
    const R = NAVI && NAVI.S && NAVI.S.on && NAVI.S.R;
    if (R && NAVI.S.dest && NAVI.S.dest.k === ZK) {
      g.strokeStyle = 'rgba(255,106,19,.95)';
      g.lineWidth = 4;
      g.beginPath();
      for (let i = Math.max(0, Math.floor(NAVI.S.s)); i < R.n; i += 3) {
        const p = T.P(R.X[i], R.Y[i]);
        i > NAVI.S.s ? g.lineTo(p[0], p[1]) : g.moveTo(p[0], p[1]);
      }
      g.stroke();
    } else {
      g.setLineDash([7, 6]);
      g.strokeStyle = 'rgba(255,140,60,.9)';
      g.lineWidth = 2.5;
      g.beginPath();
      g.moveTo(m[0], m[1]);
      g.lineTo(q[0], q[1]);
      g.stroke();
      g.setLineDash([]);
    }
    let x = q[0],
      y = q[1],
      out = false;
    if (clip) {
      const r = clip - 9,
        dx = x - V.W / 2,
        dy = y - V.H / 2,
        d = Math.hypot(dx, dy);
      if (d > r) {
        x = V.W / 2 + (dx / d) * r;
        y = V.H / 2 + (dy / d) * r;
        out = true;
      }
    }
    g.fillStyle = '#ff6a13';
    g.strokeStyle = '#fff';
    g.lineWidth = 2;
    if (out) {
      const a = Math.atan2(y - V.H / 2, x - V.W / 2);
      g.save();
      g.translate(x, y);
      g.rotate(a);
      g.beginPath();
      g.moveTo(8, 0);
      g.lineTo(-6, 6);
      g.lineTo(-6, -6);
      g.closePath();
      g.fill();
      g.stroke();
      g.restore();
    } else {
      g.beginPath();
      g.moveTo(x, y);
      g.bezierCurveTo(x - 9, y - 11, x - 7, y - 22, x, y - 22);
      g.bezierCurveTo(x + 7, y - 22, x + 9, y - 11, x, y);
      g.fill();
      g.stroke();
      g.fillStyle = '#fff';
      g.beginPath();
      g.arc(x, y - 15, 3, 0, 7);
      g.fill();
    }
  }
  function drawMe(g, V, T, me, hd) {
    const q = T.P(me.x, me.y),
      a = hd - V.th;
    g.save();
    g.translate(q[0], q[1]);
    g.rotate(a);
    g.fillStyle = '#ffd36b';
    g.strokeStyle = 'rgba(0,0,0,.7)';
    g.lineWidth = 1.5;
    g.beginPath();
    g.moveTo(0, -10);
    g.lineTo(7, 8);
    g.lineTo(0, 4);
    g.lineTo(-7, 8);
    g.closePath();
    g.fill();
    g.stroke();
    g.restore();
  }

  // ---------------- the small map ----------------
  let miniT = 0;
  function rangeNow(me) {
    if (JET && JET.S && JET.S.flying) {
      const gz = groundAt(me.x, me.y, me.z + 1),
        h = gz === null ? 100 : Math.max(0, me.z - gz);
      return Math.min(4000, 180 + h * 2.4);
    }
    return 180;
  }
  function drawMini() {
    const css = mini.clientWidth || 176,
      D = Math.min(2, window.devicePixelRatio || 1),
      n = Math.round(css * D);
    if (mini.width !== n) mini.width = mini.height = n;
    const g = mini.getContext('2d'),
      me = here(),
      hd = viewHeading(),
      R = rangeNow(me),
      V = { cx: me.x, cy: me.y, k: css / 2 / R, th: hd, W: css, H: css, D },
      T = toScr(V);
    g.setTransform(D, 0, 0, D, 0, 0);
    g.clearRect(0, 0, css, css);
    g.save();
    g.beginPath();
    g.arc(css / 2, css / 2, css / 2 - 1, 0, 7);
    g.clip();
    g.fillStyle = '#2a3024';
    g.fillRect(0, 0, css, css);
    try {
      drawTiles(g, V, T);
    } catch (e) {
      S.err = 'tiles ' + e;
    }
    g.fillStyle = 'rgba(10,12,8,.18)';
    g.fillRect(0, 0, css, css);
    drawRoads(g, V, T, R * 1.5);
    drawLabels(g, V, T, R > 1500 ? 6 : 4, true);
    drawZiel(g, V, T, me, css / 2);
    drawMe(g, V, T, me, hd);
    g.restore();
    // north on the rim
    // north on the screen: the model's (0, 1) turned by the heading → (−sin, −cos)
    const nx = css / 2 - Math.sin(hd) * (css / 2 - 10),
      ny = css / 2 - Math.cos(hd) * (css / 2 - 10);
    g.font = '700 11px system-ui, sans-serif';
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    g.lineWidth = 3;
    g.strokeStyle = 'rgba(0,0,0,.7)';
    g.strokeText('N', nx, ny);
    g.fillStyle = '#fff';
    g.fillText('N', nx, ny);
    g.strokeStyle = 'rgba(255,255,255,.4)';
    g.lineWidth = 1.5;
    g.beginPath();
    g.arc(css / 2, css / 2, css / 2 - 1, 0, 7);
    g.stroke();
    S.n.draws++;
    const lab = S.ziel
      ? S.ziel.label + ' · ' + fmtD(Math.hypot(S.ziel.x - me.x, S.ziel.y - me.y))
      : R > 400
        ? 'Radius ' + fmtD(R)
        : '';
    if (minilab.textContent !== lab) minilab.textContent = lab;
    minilab.hidden = !lab;
  }

  // ---------------- the large map ----------------
  const big = document.createElement('div');
  big.id = 'kbig';
  big.hidden = true;
  big.setAttribute('role', 'dialog');
  big.setAttribute('aria-label', 'Karte und Ziel');
  big.innerHTML =
    '<div class="kh"><div class="ks"><input type="search" id="ksuche" placeholder="Ort, Straße, Berg suchen …" autocomplete="off" ' +
    'enterkeyhint="search" aria-label="Ziel suchen"><div class="kr" hidden></div></div>' +
    '<label title="Kleine Karte beim Gehen und Fliegen"><input type="checkbox" data-o="map"> kleine Karte</label>' +
    '<label title="Straße, Ort und Gebiet oben links"><input type="checkbox" data-o="ort"> Ortsanzeige</label>' +
    '<button type="button" class="kb kx" data-k="close" aria-label="Karte schließen">×</button></div>' +
    '<div class="kc"><canvas></canvas><div class="kz"><button type="button" data-k="in" aria-label="Näher">+</button>' +
    '<button type="button" data-k="out" aria-label="Weiter weg">−</button><button type="button" data-k="me" aria-label="Wo bin ich" title="Wo bin ich">◎</button></div>' +
    '<div class="ka">Luftbild © GDI-Th · Orte: Wikidata · Straßen und Grenzen © OpenStreetMap-Mitwirkende</div></div>' +
    '<div class="kf"><div class="kt"></div><span class="kfa"></span></div>';
  const bc = big.querySelector('canvas'),
    inp = big.querySelector('#ksuche'),
    res = big.querySelector('.kr'),
    foot = big.querySelector('.kt'),
    acts = big.querySelector('.kfa');
  const BV = { cx: 0, cy: 0, k: 0.25, th: 0, W: 800, H: 600, D: 1 };
  let dirtyBig = true;
  function openBig(focusSearch) {
    if (P.mode !== 'walk' || special()) return false;
    if (document.exitPointerLock) {
      try {
        document.exitPointerLock();
      } catch (e) {}
    }
    loadData().catch(() => {});
    loadOwnRoads();
    loadSets();
    const me = here();
    if (!S.big) {
      BV.cx = me.x;
      BV.cy = me.y;
      BV.k = JET && JET.S && JET.S.flying ? 0.06 : me.veh ? 0.12 : 0.3;
    }
    S.big = true;
    big.hidden = false;
    for (const c of big.querySelectorAll('[data-o]')) c.checked = !!S[c.dataset.o];
    renderFoot();
    dirtyBig = true;
    if (focusSearch) setTimeout(() => inp.focus(), 30);
    KERN.emit('karte', { big: true });
    return true;
  }
  function closeBig() {
    if (!S.big) return;
    S.big = false;
    big.hidden = true;
    res.hidden = true;
    inp.blur();
    KERN.emit('karte', { big: false });
  }
  function drawBig() {
    const r = bc.getBoundingClientRect(),
      W = Math.max(50, r.width),
      H = Math.max(50, r.height),
      D = Math.min(2, window.devicePixelRatio || 1);
    if (bc.width !== Math.round(W * D) || bc.height !== Math.round(H * D)) {
      bc.width = Math.round(W * D);
      bc.height = Math.round(H * D);
    }
    BV.W = W;
    BV.H = H;
    BV.D = D;
    BV.th = 0;
    const g = bc.getContext('2d'),
      T = toScr(BV),
      me = here();
    g.setTransform(D, 0, 0, D, 0, 0);
    g.fillStyle = '#232820';
    g.fillRect(0, 0, W, H);
    try {
      drawTiles(g, BV, T);
    } catch (e) {
      S.err = 'tiles ' + e;
    }
    drawRoads(g, BV, T, Math.hypot(W, H) / BV.k);
    drawLabels(g, BV, T, BV.k < 0.012 ? 8 : BV.k < 0.03 ? 6 : BV.k < 0.09 ? 5 : 3, false);
    drawZiel(g, BV, T, me, 0);
    drawMe(g, BV, T, me, viewHeading());
    // scale bar
    const mpp = 1 / BV.k,
      nice = [10, 20, 50, 100, 200, 500, 1000, 2000, 5000, 10000, 20000].find(v => v / mpp > 70) || 20000,
      px = nice / mpp;
    g.fillStyle = 'rgba(0,0,0,.55)';
    g.fillRect(W - px - 26, H - 30, px + 16, 22);
    g.fillStyle = '#fff';
    g.fillRect(W - px - 18, H - 14, px, 3);
    g.font = '600 11px system-ui, sans-serif';
    g.textAlign = 'center';
    g.fillText(fmtD(nice), W - px / 2 - 18, H - 21);
    S.n.draws++;
  }
  // drag, wheel, two fingers; a tap sets the destination
  const ptr = new Map();
  let drag = null;
  const kc = big.querySelector('.kc');
  kc.addEventListener('pointerdown', e => {
    if (e.target.closest('.kz')) return;
    kc.setPointerCapture && kc.setPointerCapture(e.pointerId);
    ptr.set(e.pointerId, [e.clientX, e.clientY]);
    if (ptr.size === 1) drag = { x: e.clientX, y: e.clientY, cx: BV.cx, cy: BV.cy, moved: 0, t: performance.now() };
    else if (ptr.size === 2) {
      const [a, b] = [...ptr.values()];
      drag = { pinch: Math.hypot(a[0] - b[0], a[1] - b[1]), k: BV.k, moved: 99 };
    }
    res.hidden = true;
  });
  kc.addEventListener('pointermove', e => {
    if (!ptr.has(e.pointerId) || !drag) return;
    ptr.set(e.pointerId, [e.clientX, e.clientY]);
    if (drag.pinch && ptr.size === 2) {
      const [a, b] = [...ptr.values()];
      BV.k = Math.max(0.004, Math.min(4, drag.k * (Math.hypot(a[0] - b[0], a[1] - b[1]) / drag.pinch)));
    } else if (!drag.pinch) {
      const dx = e.clientX - drag.x,
        dy = e.clientY - drag.y;
      drag.moved = Math.max(drag.moved, Math.hypot(dx, dy));
      BV.cx = drag.cx - dx / BV.k;
      BV.cy = drag.cy + dy / BV.k;
    }
    dirtyBig = true;
  });
  const up = e => {
    if (!ptr.has(e.pointerId)) return;
    ptr.delete(e.pointerId);
    if (drag && !drag.pinch && drag.moved < 6 && performance.now() - drag.t < 600 && e.type === 'pointerup') {
      const r = bc.getBoundingClientRect(),
        q = toScr(BV).inv(e.clientX - r.left, e.clientY - r.top);
      setZiel({ label: labelAt(q[0], q[1]), x: q[0], y: q[1], kind: 'Punkt' });
    }
    if (!ptr.size) drag = null;
  };
  kc.addEventListener('pointerup', up);
  kc.addEventListener('pointercancel', up);
  kc.addEventListener(
    'wheel',
    e => {
      e.preventDefault();
      const r = bc.getBoundingClientRect(),
        sx = e.clientX - r.left,
        sy = e.clientY - r.top,
        T = toScr(BV),
        q = T.inv(sx, sy);
      BV.k = Math.max(0.004, Math.min(4, BV.k * Math.exp(-e.deltaY * 0.0015)));
      const q2 = toScr(BV).inv(sx, sy);
      BV.cx += q[0] - q2[0];
      BV.cy += q[1] - q2[1];
      dirtyBig = true;
    },
    { passive: false }
  );
  big.addEventListener('click', e => {
    const b = e.target.closest('[data-k]');
    if (!b) return;
    const k = b.dataset.k;
    if (k === 'close') closeBig();
    else if (k === 'in') BV.k = Math.min(4, BV.k * 1.6);
    else if (k === 'out') BV.k = Math.max(0.004, BV.k / 1.6);
    else if (k === 'me') {
      const me = here();
      BV.cx = me.x;
      BV.cy = me.y;
    } else if (k === 'fly') flyThere();
    else if (k === 'drive') driveThere();
    else if (k === 'show' && S.ziel) {
      BV.cx = S.ziel.x;
      BV.cy = S.ziel.y;
    } else if (k === 'clear') setZiel(null);
    dirtyBig = true;
  });
  big.addEventListener('change', e => {
    const c = e.target.closest('[data-o]');
    if (!c) return;
    if (c.dataset.o === 'map') setMap(c.checked);
    else setOrt(c.checked);
  });
  big.addEventListener('keydown', e => {
    if (e.key === 'Escape') {
      e.stopPropagation();
      e.preventDefault();
      if (!res.hidden) res.hidden = true;
      else closeBig();
    }
  });
  window.addEventListener(
    'keydown',
    e => {
      if (S.big && e.key === 'Escape') {
        e.stopPropagation();
        e.preventDefault();
        closeBig();
      }
    },
    true
  );
  function renderFoot() {
    const me = here(),
      z = S.ziel;
    if (!z) {
      foot.innerHTML = 'Tippe auf die Karte oder suche einen Ort, um ein Ziel zu setzen.';
      acts.innerHTML = '';
      return;
    }
    const d = Math.hypot(z.x - me.x, z.y - me.y),
      dir = dirName(Math.atan2(z.x - me.x, z.y - me.y)),
      ds = describe(z.x, z.y),
      where = [ds.ort && ds.ort.n !== z.label ? ds.ort.n : '', ds.gem, ds.kreis].filter(Boolean).join(' · ');
    foot.innerHTML = '';
    const b = document.createElement('b');
    b.textContent = 'Ziel: ' + z.label;
    foot.appendChild(b);
    foot.appendChild(document.createTextNode(' · ' + fmtD(d) + ' Richtung ' + dir + (where ? ' · ' + where : '')));
    const btns = [['show', 'Zeigen']];
    if (VEH.cur) btns.unshift(['drive', 'Autopilot', 'acc']);
    else btns.unshift(['fly', 'Hinfliegen', 'acc']);
    btns.push(['clear', 'Ziel löschen']);
    acts.innerHTML = '';
    for (const [k, t, c] of btns) {
      const bt = document.createElement('button');
      bt.type = 'button';
      bt.className = 'kb' + (c ? ' ' + c : '');
      bt.dataset.k = k;
      bt.textContent = t;
      acts.appendChild(bt);
    }
  }

  // ---------------- search ----------------
  function streetEntries() {
    const W = roadWays(),
      out = new Map();
    for (const w of W) {
      if (!w.name || w.kind > 7) continue;
      const mid = Math.floor(w.n / 2),
        x = w.p[mid * 3],
        y = w.p[mid * 3 + 1];
      const d = describe(x, y),
        where = d.ort ? d.ort.n : d.bei ? 'bei ' + d.bei.n : '',
        key = w.name + '|' + where;
      if (!out.has(key)) out.set(key, { n: w.name, k: 'Straße', x, y, where, q: norm(w.name), r: 4, m: 2 });
    }
    return [...out.values()];
  }
  let streetsKey = '',
    streets = [];
  function search(text) {
    const q = norm(text);
    if (q.length < 2) return [];
    const me = here(),
      out = [];
    const sk = roadsKey + ':' + roadWays().length + ':' + !!S.data;
    if (sk !== streetsKey) {
      streetsKey = sk;
      streets = streetEntries();
    }
    const score = o => {
      const i = o.q.indexOf(q);
      if (i < 0) return -1;
      const word = i === 0 || o.q[i - 1] === ' ';
      return (
        (i === 0 ? 3 : word ? 2 : 1) * 10 +
        (o.m === 2 ? 4 : o.m === 1 ? 2 : 0) +
        (o.r || 0) -
        Math.min(4, Math.hypot(o.x - me.x, o.y - me.y) / 5000)
      );
    };
    // the places one can jump to (garden, village, Schleusingen …)
    const spots = KERN.spots ? KERN.spots() : {};
    for (const k in spots) {
      const s = spots[k];
      if (!s || !s.pos || !s.label || k === ZK) continue;
      const o = { n: String(s.label), k: 'Ort im Spiel', x: s.pos[0], y: s.pos[1], q: norm(s.label), r: 7, m: 2 };
      const sc = score(o);
      if (sc >= 0) out.push([sc + 3, o]);
    }
    for (const o of (S.data && S.data.orte) || []) {
      const sc = score(o);
      if (sc >= 0) out.push([sc, o]);
    }
    for (const o of streets) {
      const sc = score(o);
      if (sc >= 0) out.push([sc, o]);
    }
    out.sort((a, b) => b[0] - a[0]);
    const seen = new Set(),
      list = [];
    for (const [, o] of out) {
      const key = o.n + '|' + Math.round(o.x / 300) + '|' + Math.round(o.y / 300);
      if (seen.has(key)) continue;
      seen.add(key);
      list.push(o);
      if (list.length >= 9) break;
    }
    return list;
  }
  let hits = [],
    sel = 0;
  function showHits() {
    res.innerHTML = '';
    if (!hits.length) {
      res.hidden = !inp.value.trim();
      if (!res.hidden)
        res.innerHTML = '<button type="button" disabled>' + (S.data ? 'Nichts gefunden' : 'Orte laden …') + '</button>';
      return;
    }
    const me = here();
    hits.forEach((o, i) => {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = (i === sel ? 'on' : '') + (o.m === 0 ? ' off' : '');
      const where =
        o.where !== undefined
          ? o.where
          : [o.g && o.g !== o.n ? o.g : '', S.data && o.kr >= 0 && S.data.kreise[o.kr] ? S.data.kreise[o.kr].n : '']
              .filter(Boolean)
              .join(', ');
      b.textContent = o.n;
      const sm = document.createElement('small');
      sm.textContent =
        o.k +
        (where ? ' · ' + where : '') +
        ' · ' +
        fmtD(Math.hypot(o.x - me.x, o.y - me.y)) +
        (o.m === 0 ? ' · nicht auf der Karte' : o.m === 1 ? ' · nur grob' : '');
      b.appendChild(sm);
      b.addEventListener('click', () => choose(o));
      res.appendChild(b);
    });
    res.hidden = false;
  }
  function choose(o) {
    res.hidden = true;
    inp.value = o.n;
    if (o.m === 0) toast(o.n + ' liegt noch außerhalb der Karte – das Ziel zeigt die Richtung.', 4200);
    setZiel({ label: o.n, x: o.x, y: o.y, kind: o.k });
    BV.cx = o.x;
    BV.cy = o.y;
    BV.k = Math.max(BV.k, o.s && o.k === 'Stadt' ? 0.06 : 0.15);
    dirtyBig = true;
    inp.blur();
  }
  inp.addEventListener('input', () => {
    if (!S.data)
      loadData().then(
        () => {
          hits = search(inp.value);
          showHits();
        },
        () => {}
      );
    hits = search(inp.value);
    sel = 0;
    showHits();
  });
  inp.addEventListener('keydown', e => {
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault();
      if (!hits.length) return;
      sel = (sel + (e.key === 'ArrowDown' ? 1 : hits.length - 1)) % hits.length;
      showHits();
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (hits[sel]) choose(hits[sel]);
    }
  });

  // ---------------- the destination ----------------
  function setZiel(z) {
    S.ziel =
      z && Number.isFinite(z.x) && Number.isFinite(z.y)
        ? { label: String(z.label || z.n || 'Ziel').slice(0, 100), x: z.x, y: z.y, kind: z.kind || z.k || '' }
        : null;
    S.via = false;
    if (S.ziel) KERN.spot(ZK, { mode: 'walk', pos: [S.ziel.x, S.ziel.y], label: S.ziel.label });
    else KERN.spot(ZK, { pos: null, label: '' });
    // the autopilot's and the jetpack's lists of places
    if (NAVI && Array.isArray(NAVI.DEST)) {
      const i = NAVI.DEST.findIndex(d => d[0] === ZK);
      if (i >= 0) NAVI.DEST.splice(i, 1);
      if (S.ziel) NAVI.DEST.unshift([ZK, S.ziel.label]);
    }
    jetDest();
    save();
    renderFoot();
    marker();
    dirtyBig = true;
    miniT = 1;
    S.line = ['', '', '', ''];
    try {
      updateOrt();
    } catch (e) {}
    KERN.emit('karte', { ziel: S.ziel ? S.ziel.label : null });
    markDirty();
    return S.ziel;
  }
  function jetDest() {
    const box = document.getElementById('jetdest');
    if (!box) return;
    let b = box.querySelector('[data-dest="' + ZK + '"]');
    if (!S.ziel) {
      if (b) b.remove();
      return;
    }
    if (!b) {
      b = document.createElement('button');
      b.type = 'button';
      b.dataset.dest = ZK;
      b.style.gridColumn = '1 / -1';
      b.style.background = '#ff6a13';
      b.addEventListener('click', () => flyThere());
      box.insertBefore(b, box.firstChild);
    }
    b.textContent = 'Mein Ziel: ' + S.ziel.label;
  }
  function flyThere() {
    if (!S.ziel || !JET) return false;
    if (VEH.cur) {
      toast('Erst aussteigen – im Auto fährt der Autopilot hin.');
      return false;
    }
    closeBig();
    JET.flyTo(ZK, S.ziel.label);
    return true;
  }
  function driveThere() {
    if (!S.ziel || !NAVI) return false;
    if (!VEH.cur) {
      toast('Erst in ein Fahrzeug steigen.');
      return false;
    }
    closeBig();
    return NAVI.go(ZK, S.ziel.label);
  }
  // the beam in the world: an orange column and the name with the distance, seen from far (no depth test for the name)
  const MK = new THREE.Group();
  MK.name = 'kartenziel';
  MK.visible = false;
  MK.userData.noMerge = true;
  let beam = null,
    lbl = null,
    lblText = '',
    lblT = 0;
  function marker() {
    if (!S.ziel) {
      MK.visible = false;
      return;
    }
    if (!beam) {
      const mat = new THREE.MeshBasicMaterial({
        color: 0xff6a13,
        transparent: true,
        opacity: 0.5,
        depthWrite: false,
        fog: false,
      });
      beam = new THREE.Mesh(new THREE.CylinderGeometry(1, 1, 1, 10, 1, true), mat);
      beam.renderOrder = 15;
      MK.add(beam);
      const c = document.createElement('canvas');
      c.width = 512;
      c.height = 72;
      const t = new THREE.CanvasTexture(c);
      t.colorSpace = THREE.SRGBColorSpace;
      lbl = new THREE.Sprite(
        new THREE.SpriteMaterial({
          map: t,
          depthTest: false,
          depthWrite: false,
          sizeAttenuation: false,
          transparent: true,
        })
      );
      lbl.renderOrder = 21;
      lbl.userData.c = c;
      MK.add(lbl);
      scene.add(MK);
    }
    lblText = '';
  }
  function markerTick(me) {
    if (!S.ziel || !beam || P.mode !== 'walk' || special()) {
      MK.visible = false;
      return;
    }
    const d = Math.hypot(S.ziel.x - me.x, S.ziel.y - me.y);
    MK.visible = d > 18;
    if (!MK.visible) return;
    let gz = groundAt(S.ziel.x, S.ziel.y);
    if (gz === null) gz = me.z;
    // thicker with the distance, so that it stays a few pixels wide
    const r = Math.max(0.6, d * 0.004),
      h = Math.min(600, 60 + d * 0.15);
    beam.scale.set(r, h, r);
    beam.position.set(S.ziel.x, gz + h / 2, -S.ziel.y);
    lbl.position.set(S.ziel.x, gz + h + 4, -S.ziel.y);
    const txt = S.ziel.label + ' · ' + fmtD(d);
    if (txt !== lblText && performance.now() - lblT > 500) {
      lblText = txt;
      lblT = performance.now();
      const c = lbl.userData.c,
        g = c.getContext('2d');
      g.clearRect(0, 0, c.width, c.height);
      g.font = '600 34px system-ui, sans-serif';
      const w = Math.min(c.width - 4, g.measureText(txt).width + 36),
        x0 = (c.width - w) / 2,
        rr = 30;
      g.fillStyle = 'rgba(255,106,19,0.88)';
      g.beginPath();
      g.moveTo(x0 + rr, 4);
      g.arcTo(x0 + w, 4, x0 + w, 68, rr);
      g.arcTo(x0 + w, 68, x0, 68, rr);
      g.arcTo(x0, 68, x0, 4, rr);
      g.arcTo(x0, 4, x0 + w, 4, rr);
      g.fill();
      g.fillStyle = '#fff';
      g.textAlign = 'center';
      g.textBaseline = 'middle';
      g.fillText(txt, c.width / 2, 37, c.width - 40);
      lbl.material.map.needsUpdate = true;
      const hh = 0.03;
      lbl.scale.set((hh * c.width) / c.height, hh, 1);
      markDirty();
    }
  }
  // reached: a short note, the destination goes (the jetpack and the autopilot say it themselves)
  function arrivedCheck(me) {
    if (!S.ziel) return;
    const viaJet = !!(JET && JET.S && JET.S.auto && JET.S.auto.k === ZK),
      viaNavi = !!(NAVI && NAVI.S && NAVI.S.on && NAVI.S.dest && NAVI.S.dest.k === ZK),
      d = Math.hypot(S.ziel.x - me.x, S.ziel.y - me.y);
    // while the jetpack or the autopilot goes there they announce the arrival themselves; taken over far away, the note is ours again
    if (viaJet || viaNavi) S.via = true;
    else if (d > 300) S.via = false;
    if (d > (me.veh ? 60 : 25) || viaJet || viaNavi) return;
    const name = S.ziel.label,
      said = S.via;
    setZiel(null);
    if (!said) toast('Ziel erreicht: ' + name + '.', 3800);
  }
  // in a vehicle: the destination on the vehicle's own map (after the autopilot's hooks)
  if (MMAP) {
    const more0 = MMAP.more,
      dest0 = MMAP.dest;
    MMAP.more = (g, Pf, cx, cy, R2) => {
      if (more0) more0(g, Pf, cx, cy, R2);
      if (!S.ziel || (NAVI && NAVI.S && NAVI.S.on)) return;
      const q = Pf(S.ziel.x, S.ziel.y),
        m = Pf(cx, cy);
      g.save();
      g.setLineDash([6, 5]);
      g.strokeStyle = 'rgba(255,140,60,.9)';
      g.lineWidth = 2.5;
      g.beginPath();
      g.moveTo(m[0], m[1]);
      g.lineTo(q[0], q[1]);
      g.stroke();
      g.setLineDash([]);
      g.fillStyle = '#ff6a13';
      g.beginPath();
      g.arc(q[0], q[1], 5, 0, 7);
      g.fill();
      g.restore();
    };
    MMAP.dest = (cx, cy, psi) => {
      if (S.ziel && !(NAVI && NAVI.S && NAVI.S.on)) return [S.ziel.label, Math.hypot(S.ziel.x - cx, S.ziel.y - cy)];
      return dest0 ? dest0(cx, cy, psi) : null;
    };
  }

  // ---------------- on and off ----------------
  function setMap(on) {
    S.map = !!on;
    save();
    ui();
    miniT = 1;
    return S.map;
  }
  function setOrt(on) {
    S.ort = !!on;
    save();
    S.line = ['', '', '', ''];
    updateOrt();
    return S.ort;
  }
  function ui() {
    const b = document.getElementById('kartebtn');
    if (b) b.setAttribute('aria-pressed', S.map ? 'true' : 'false');
    const mc = document.querySelector('#kartemenu [data-karte="map"]');
    if (mc) mc.setAttribute('aria-pressed', S.map ? 'true' : 'false');
  }
  window.addEventListener('keydown', e => {
    if (e.ctrlKey || e.metaKey || e.altKey || e.repeat) return;
    if (['INPUT', 'TEXTAREA', 'SELECT'].includes(document.activeElement && document.activeElement.tagName)) return;
    if (e.key !== 'k' && e.key !== 'K') return;
    // the trailer's and the winch's K in a vehicle, the piano's keys
    if (VEH.cur || P.mode !== 'walk' || special()) return;
    const pn = document.getElementById('piano');
    if (pn && !pn.hidden && pn.offsetParent) return;
    if (e.shiftKey) S.big ? closeBig() : openBig(true);
    else setMap(!S.map);
  });
  function mount() {
    const host = document.getElementById('p-3d') || document.body;
    for (const el of [ort, mini, minilab, big]) if (!el.parentNode) host.appendChild(el);
    const bar = document.getElementById('hudtr');
    if (bar && !document.getElementById('kartebtn')) {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'hb';
      b.id = 'kartebtn';
      b.title = 'Karte ein- und ausblenden (K) – große Karte mit Zielsuche: Shift+K';
      b.setAttribute('aria-pressed', 'false');
      b.innerHTML =
        '<span class="hbi"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3.5 6.5l5.5-2 6 2 5.5-2v13l-5.5 2-6-2-5.5 2z"/>' +
        '<path d="M9 4.5v13M15 6.5v13"/></svg></span><span class="hbt">Karte</span>';
      b.addEventListener('click', () => setMap(!S.map));
      const jb = document.getElementById('jetbtn'),
        mb = document.getElementById('menubtn');
      bar.insertBefore(b, jb || mb || null);
    }
    // the menu: Hingehen → Karte
    const pg = document.querySelector('#menu [data-page="orte"]');
    if (pg && !document.getElementById('kartemenu')) {
      const sec = document.createElement('section');
      sec.className = 'msec';
      sec.id = 'kartemenu';
      sec.setAttribute('aria-label', 'Karte und Ziel');
      sec.innerHTML =
        '<h3>Karte und Ziel</h3><div class="mchips"><button class="chip" type="button" data-karte="big" title="Große Karte, Ort oder Straße suchen, Ziel setzen (Shift+K)">Karte und Ziel</button>' +
        '<button class="chip" type="button" data-karte="map" aria-pressed="false" title="Kleine Karte oben rechts (K)">Kleine Karte</button></div>';
      sec.addEventListener('click', e => {
        const c = e.target.closest('[data-karte]');
        if (!c) return;
        if (window.HUD && window.HUD.setMenu) window.HUD.setMenu(false);
        if (c.dataset.karte === 'big') openBig(true);
        else setMap(!S.map);
      });
      pg.insertBefore(sec, pg.children[1] || null);
    }
    jetDest();
    ui();
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', mount);
  else mount();
  if (S.ziel) {
    KERN.spot(ZK, { mode: 'walk', pos: [S.ziel.x, S.ziel.y], label: S.ziel.label });
    if (NAVI && Array.isArray(NAVI.DEST)) NAVI.DEST.unshift([ZK, S.ziel.label]);
    marker();
  }
  // the gazetteer a little after the start (small; the line top left needs it)
  setTimeout(() => {
    if (S.ort) loadData().catch(() => {});
  }, 4000);

  // ---------------- per frame ----------------
  let tOrt = 0,
    tFoot = 0;
  KERN.tick(dt => {
    const me = here();
    tOrt -= dt;
    if (tOrt <= 0) {
      tOrt = 0.5;
      try {
        updateOrt();
      } catch (e) {
        S.err = 'ort ' + e;
      }
      arrivedCheck(me);
      if (!document.getElementById('kartebtn') || !document.getElementById('kartemenu')) mount();
    }
    const mshow = S.map && P.mode === 'walk' && !VEH.cur && !special() && !S.big;
    if (mini.hidden === mshow) {
      mini.hidden = !mshow;
      if (!mshow) minilab.hidden = true;
      miniT = 1;
    }
    if (mshow) {
      miniT += dt;
      if (miniT >= (JET && JET.S && JET.S.flying ? 0.08 : 0.12)) {
        miniT = 0;
        try {
          drawMini();
        } catch (e) {
          S.err = 'mini ' + e;
        }
      }
    }
    if (S.big) {
      if (P.mode !== 'walk' || special()) closeBig();
      tFoot -= dt;
      if (tFoot <= 0) {
        tFoot = 1;
        renderFoot();
        dirtyBig = true;
      }
      if (dirtyBig) {
        dirtyBig = false;
        try {
          drawBig();
        } catch (e) {
          S.err = 'big ' + e;
        }
      }
    }
    markerTick(me);
  }, 'karte');

  return {
    S,
    setMap,
    setOrt,
    setZiel,
    openBig,
    closeBig,
    flyThere,
    driveThere,
    search,
    describe,
    streetAt,
    loadData,
    get ready() {
      return !!S.data;
    },
    state: () => ({
      map: S.map,
      ort: S.ort,
      big: S.big,
      ziel: S.ziel ? { label: S.ziel.label, x: Math.round(S.ziel.x), y: Math.round(S.ziel.y) } : null,
      line: S.line.slice(),
      data: S.data ? S.data.orte.length : 0,
      sets: TS.sets ? TS.sets.length : 0,
      tiles: TILE.size,
      n: Object.assign({}, S.n),
      roads: roadWays().length,
      own: !!own,
      marker: MK.visible,
      err: S.err,
    }),
  };
})();
window.KARTE = KARTE;
