// ===================== garden planner 5: the planner – data, panel, plan view, on site, the saved plan (GPLAN) =====================
// Menü → Gestalten → „Garten planen“ (#gplanbtn) opens the plan view with the panel #gplan: plants by layer with search and filters (tap a
// plant, then tap the ground to set it; drag a plant to move it), the age (heute, 5, 10, 20 Jahre), crowns as discs coloured by layer, the
// legal distance ring of the selected plant, shade of a month and an hour, the adviser's warnings with reasons, guild templates, the plant
// list and the shopping list for the nursery Kammbach (copy, download). „Vor Ort“: walk in the garden and set the chosen plant in front of
// you. The planned plants stand in the 3D garden at the chosen age and season (GP3D) – also after closing the panel („im Garten“).
// Data: dist/gartenplaner/pflanzen.json, regeln.json, gilden.json (contract gplan/gplan_schema.js), fetched when the planner opens – never at
// start (only a saved plan shown in the garden loads them once the model stands); testdaten.json when they are missing (badge „Testdaten“).
// Saved: pav-gplan-v1 { v: 1, items: [{ id, x, y, jahr }], show, age, month, hour } through SAVE. Plan view: hooks of world/siteplan.js.
import { SAVE } from '../core/save.js';
import { $, BASE, stage } from '../core/head.js';
import { LOADLOG, markDirty, whenLoaded } from '../core/assets.js';
import { BUILD, bldRects, rectCorners } from '../core/geo.js';
import { STREAM } from '../garden/stream_geo.js';
import { PATHS, S0 } from '../garden/env.js';
import { P } from '../game/walkable.js';
import { go } from '../game/player.js';
import { toast } from '../audio/audio.js';
import { SITEPLAN } from '../world/siteplan.js';
import { HUD } from '../game/hud.js';
import { CLOCK } from '../time/clock.js';
import { DN } from '../time/daynight.js';
import { GPSCHEMA } from './gplan_schema.js';
import { GPMODEL as M } from './gplan_model.js';
import { GPSUN } from './gplan_sun.js';
import { GPRULES } from './gplan_rules.js';
import { GP3D } from './gplan_3d.js';
export const GPLAN = (() => {
  const KEY = 'pav-gplan-v1';
  const YEAR = Math.max(2026, new Date().getFullYear());
  const D = { st: 'none', p: null, test: false, db: M.index(null), errors: [], warnings: [] };
  let ST = M.sanitize(SAVE.get(KEY), null, YEAR);
  const U = {
    open: false,
    mode: 'plan',
    tab: 'pflanzen',
    arm: null,
    sel: -1,
    drag: null,
    q: '',
    f: new Set(),
    shade: false,
    warns: [],
    flag: new Map(),
    list: 'shop',
    probe: null,
    el: null,
  };
  const esc = t => String(t).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
  const de = M.de;
  const r2 = v => Math.round(v * 20) / 20;
  // ---------------- data: fetched on first use, checked against the contract, broken entries left out ----------------
  async function getJSON(name) {
    try {
      const r = await fetch(BASE + 'gartenplaner/' + name, { cache: 'no-cache' });
      if (!r.ok) return null;
      return await r.json();
    } catch (e) {
      return null;
    }
  }
  function report(list, kind) {
    for (const e of list.slice(0, 40)) {
      try {
        console.warn('Gartenplaner ' + kind + ': ' + e);
      } catch (_) {}
    }
    if (kind === 'Fehler' && list.length)
      LOADLOG.err('Gartenplaner: ' + list.length + ' Fehler in den Daten – ' + list[0]);
  }
  // drop the entries an error names (arten[3 …], grenzabstand[1 …], gilden[0 …])
  function dropBroken(errors, file, key, arr) {
    const bad = new Set();
    const re = new RegExp('^' + file.replace('.', '\\.') + ' ' + key + '\\[(\\d+)');
    for (const e of errors) {
      const m = re.exec(e);
      if (m) bad.add(+m[1]);
    }
    return bad.size ? arr.filter((_, i) => !bad.has(i)) : arr;
  }
  function loadData() {
    if (D.p) return D.p;
    D.st = 'loading';
    D.p = (async () => {
      let [pflanzen, regeln, gilden] = await Promise.all(['pflanzen.json', 'regeln.json', 'gilden.json'].map(getJSON));
      D.test = false;
      if (!pflanzen) {
        const t = await getJSON('testdaten.json');
        if (t) {
          pflanzen = t.pflanzen;
          regeln = t.regeln;
          gilden = t.gilden;
          D.test = true;
        }
      }
      if (!pflanzen) {
        D.st = 'fail';
        D.errors = ['keine Pflanzendaten gefunden (gartenplaner/pflanzen.json, testdaten.json)'];
        report(D.errors, 'Fehler');
        return D;
      }
      const r = GPSCHEMA.validateAll({ pflanzen, regeln, gilden });
      D.errors = r.errors;
      D.warnings = r.warnings;
      report(r.errors, 'Fehler');
      // keep the good entries: plants, legal categories and facts, then the guilds against the plants that are left
      if (regeln && Array.isArray(regeln.grenzabstand))
        regeln = Object.assign({}, regeln, {
          grenzabstand: dropBroken(r.errors, 'regeln.json', 'grenzabstand', regeln.grenzabstand),
          fakten: Array.isArray(regeln.fakten) ? dropBroken(r.errors, 'regeln.json', 'fakten', regeln.fakten) : [],
        });
      if (pflanzen && Array.isArray(pflanzen.arten))
        pflanzen = Object.assign({}, pflanzen, {
          arten: dropBroken(r.errors, 'pflanzen.json', 'arten', pflanzen.arten),
        });
      if (gilden && Array.isArray(gilden.gilden)) {
        const g2 = GPSCHEMA.validateGuilds(gilden, pflanzen);
        gilden = Object.assign({}, gilden, { gilden: dropBroken(g2.errors, 'gilden.json', 'gilden', gilden.gilden) });
      }
      D.db = M.index({ pflanzen, regeln, gilden });
      D.st = 'ok';
      // plants of the saved plan that are not in the data any more are dropped
      const n0 = ST.items.length;
      ST = M.sanitize(ST, new Set(D.db.byId.keys()), YEAR);
      if (ST.items.length !== n0) save();
      return D;
    })();
    return D.p;
  }
  // ---------------- the site for the adviser: boundary, buildings (where they stand now), paths, bridge, brook, standing trees ----------------
  const PAV = { c: [2.95, 2], az: 90, hx: 3.95, hy: 3.05 }; // the pavilion with its cantilevers (as world/siteplan.js)
  // name, gender (for the adviser's sentences), height (m, for its shadow), genitive (plant list: „3 m nördlich des Bungalows“)
  const BLD = {
    garage: ['Garage', 'f', 2.4, 'der Garage'],
    werkstatt: ['Werkstatt', 'f', 4.2, 'der Werkstatt'],
    holzhaus: ['Holzhaus', 'n', 2.8, 'des Holzhauses'],
    bungalow: ['Bungalow', 'm', 3.3, 'des Bungalows'],
    greenhouse: ['Gewächshaus', 'n', 2.4, 'des Gewächshauses'],
    washhouse: ['Waschhaus', 'n', 2.6, 'des Waschhauses'],
    carport: ['Carport', 'm', 2.9, 'des Carports'],
  };
  function site() {
    const buildings = [
      { key: 'pavillon', name: 'Pavillon', g: 'm', h: 7.2, gen: 'des Pavillons', foot: rectCorners(PAV) },
    ];
    for (const [k, [name, g, h, gen]] of Object.entries(BLD))
      if (BUILD[k])
        for (const r of bldRects(BUILD[k])) buildings.push({ key: k, name, g, h, gen, foot: rectCorners(r) });
    const B = STREAM.BR,
      U0 = STREAM.U,
      N0 = STREAM.N;
    const bridge = [
      [-1, -1],
      [1, -1],
      [1, 1],
      [-1, 1],
    ].map(([i, j]) => [B.c[0] + U0[0] * B.w * i + N0[0] * B.l * j, B.c[1] + U0[1] * B.w * i + N0[1] * B.l * j]);
    return {
      boundary: S0.garden,
      buildings,
      paths: PATHS,
      pathW: 0.6,
      bridge,
      brook: (x, y) => Math.abs(STREAM.across(x, y)),
      ditch: STREAM.WT,
      wet: 6,
      trees: S0.trees.filter(t => GPRULES.inPoly(t[0], t[1], S0.garden) || GPRULES.edgeDist(t[0], t[1], S0.garden) < 8),
    };
  }
  // where a plant stands, for the plant list: distance and direction from the nearest building, distance to the boundary
  const DIRS = [
      'nördlich',
      'nordöstlich',
      'östlich',
      'südöstlich',
      'südlich',
      'südwestlich',
      'westlich',
      'nordwestlich',
    ],
    SUNDIR = ['Norden', 'Nordosten', 'Osten', 'Südosten', 'Süden', 'Südwesten', 'Westen', 'Nordwesten'];
  function where(it, S) {
    let best = null;
    for (const b of S.buildings) {
      const d = GPRULES.edgeDist(it.x, it.y, b.foot);
      if (!best || d < best.d) best = { b, d };
    }
    let t = '';
    if (best && best.d < 25) {
      const c = best.b.foot.reduce(
          (s, p) => [s[0] + p[0] / best.b.foot.length, s[1] + p[1] / best.b.foot.length],
          [0, 0]
        ),
        az = (Math.atan2(it.x - c[0], it.y - c[1]) * 180) / Math.PI;
      t = ' – ' + de(best.d) + ' m ' + DIRS[Math.round((((az % 360) + 360) % 360) / 45) % 8] + ' ' + best.b.gen;
    }
    return t + ', ' + de(GPRULES.edgeDist(it.x, it.y, S.boundary)) + ' m zur Grenze';
  }
  // ---------------- state changes ----------------
  let saveT = 0,
    checkT = 0;
  function save() {
    clearTimeout(saveT);
    saveT = setTimeout(() => SAVE.set(KEY, ST), 250);
  }
  const viewYear = () => YEAR + ST.age;
  const gameMonth = () => {
    try {
      return new Date((DN.jdOf(CLOCK.t) - 2440587.5) * 864e5).getUTCMonth() + 1;
    } catch (e) {
      return ST.month;
    }
  };
  const seasonMonth = () => (U.open ? ST.month : gameMonth());
  function entries() {
    const out = [];
    ST.items.forEach((it, i) => {
      const p = D.db.byId.get(it.id);
      if (p) out.push({ p, x: it.x, y: it.y, age: M.ageOf(it, viewYear()), seed: M.seedOf(it), it, i });
    });
    return out;
  }
  function view3d() {
    if (D.st !== 'ok') return;
    GP3D.sync(entries(), { month: seasonMonth(), show: ST.show });
  }
  function recheck(now) {
    clearTimeout(checkT);
    const run = () => {
      if (D.st !== 'ok') return;
      U.warns = GPRULES.check(ST, D.db, site(), { year: YEAR, age: ST.age });
      U.flag = new Map();
      for (const w of U.warns)
        for (const i of w.items)
          if (w.level === 'warn' || !U.flag.has(i)) U.flag.set(i, w.level === 'warn' ? 'bad' : 'hint');
      renderBadge();
      if (U.tab === 'hinweise') renderBody();
      renderSel();
      redraw();
    };
    if (now) run();
    else checkT = setTimeout(run, 120);
  }
  function changed(o = {}) {
    save();
    recheck(o.now);
    if (!o.no3d) view3d();
    redraw();
  }
  const redraw = () => {
    if (P.mode === 'top' && SITEPLAN.S.on) SITEPLAN.drawOverlay();
    markDirty();
  };
  function add(id, x, y, o = {}) {
    if (!D.db.byId.get(id)) return -1;
    ST.items.push({ id, x: r2(x), y: r2(y), jahr: o.jahr || YEAR });
    if (!o.quiet) {
      U.sel = ST.items.length - 1;
      changed();
      renderSel();
    }
    return ST.items.length - 1;
  }
  function remove(i) {
    if (i < 0 || i >= ST.items.length) return;
    ST.items.splice(i, 1);
    U.sel = -1;
    changed();
    renderSel();
  }
  function select(i) {
    U.sel = i >= 0 && i < ST.items.length ? i : -1;
    renderSel();
    redraw();
  }
  function placeGuild(gid, x, y) {
    const g = D.db.guilds.find(q => q.id === gid);
    if (!g) return 0;
    const L = M.guildPlace(g, D.db, x, y);
    const i0 = ST.items.length;
    for (const q of L) add(q.id, q.x, q.y, { quiet: true });
    U.sel = i0;
    changed();
    renderSel();
    toast(g.name + ' gesetzt: ' + L.length + ' Pflanzen. Einzelne Pflanzen lassen sich verschieben.', 4200);
    return L.length;
  }
  function setAge(a) {
    if (!M.AGES.includes(a)) return;
    ST.age = a;
    changed();
    renderAges();
    renderSel();
  }
  function setShow(v) {
    ST.show = !!v;
    save();
    view3d();
    renderAges();
  }
  function setShade(month, hour) {
    if (Number.isInteger(month) && month >= 1 && month <= 12) {
      const m0 = ST.month;
      ST.month = month;
      if (m0 !== month) view3d();
    }
    if (Number.isFinite(hour)) ST.hour = Math.max(4, Math.min(22, hour));
    save();
    if (U.tab === 'schatten') renderShadeInfo();
    redraw();
  }
  // ---------------- drawing in the plan view (SVG over the boundary, under the outlines and labels) ----------------
  const LCOL = {
    baum: '#3f8f2f',
    kleinbaum: '#86b83c',
    strauch: '#c9c42b',
    kraut: '#f0a830',
    boden: '#ef7b45',
    wurzel: '#a87b5c',
    kletter: '#b065c6',
  };
  const sunNow = () => GPSUN.sun(YEAR, ST.month, 15, ST.hour);
  function shadows() {
    const s = sunNow();
    if (s.el <= 0.5) return { s, polys: [] };
    const polys = [];
    for (const e of entries()) {
      if (e.age === null) continue;
      const c = M.crown(e.p, M.sizeAt(e.p, e.age, e.seed)),
        el = GPSUN.crownShadow(e.x, e.y, c, s.az, s.el);
      if (el) polys.push(GPSUN.ellipsePoly(el, 24));
      const t = GPSUN.trunkShadow(e.x, e.y, c.zb, Math.max(0.05, c.tr), s.az, s.el);
      if (t && c.zb > 0.2) polys.push(t);
    }
    const S = site();
    for (const b of S.buildings) {
      const p = GPSUN.boxShadow(b.foot, b.h, s.az, s.el);
      if (p) polys.push(p);
    }
    for (const t of S.trees) {
      const c = { zb: t[3] * 0.35, zc: t[3] * 0.65, a: t[3] * 0.32, r: t[2] };
      const el = GPSUN.crownShadow(t[0], t[1], c, s.az, s.el);
      if (el) polys.push(GPSUN.ellipsePoly(el, 20));
    }
    return { s, polys };
  }
  function draw(pr) {
    if (!U.open || U.mode !== 'plan' || D.st !== 'ok') return '';
    const P2 = pts => pts.map(p => p[0].toFixed(1) + ',' + p[1].toFixed(1)).join(' ');
    let h = '';
    if (U.shade) {
      const { polys } = shadows();
      h += '<g class="gp-shade">';
      for (const p of polys) h += `<polygon points="${P2(p.map(q => pr(q[0], q[1], 0.03)))}"/>`;
      h += '</g>';
    }
    const E = entries().map(e => Object.assign(e, { s: M.sizeAt(e.p, e.age === null ? 0 : e.age, e.seed) }));
    // big crowns first, so small plants lie on top
    E.sort((a, b) => b.s.w - a.s.w);
    for (const e of E) {
      const c = pr(e.x, e.y, 0.05),
        q = pr(e.x + e.s.w / 2, e.y, 0.05),
        R = Math.max(2.5, Math.hypot(q[0] - c[0], q[1] - c[1]));
      const cls =
        'gp-c gp-' +
        e.p.schicht +
        (e.age === null ? ' later' : '') +
        (U.flag.get(e.i) ? ' ' + U.flag.get(e.i) : '') +
        (e.i === U.sel ? ' on' : '');
      h += `<circle class="${cls}" cx="${c[0].toFixed(1)}" cy="${c[1].toFixed(1)}" r="${R.toFixed(1)}"/>`;
      if (M.isTree(e.p) || e.p.schicht === 'strauch')
        h += `<circle class="gp-t" cx="${c[0].toFixed(1)}" cy="${c[1].toFixed(1)}" r="${M.isTree(e.p) ? 2.6 : 1.8}"/>`;
      if (R > 24 && M.isTree(e.p))
        h += `<text class="gp-lb" x="${c[0].toFixed(1)}" y="${(c[1] + 13).toFixed(1)}">${esc(e.p.name)}</text>`;
    }
    // the selected plant: its grown crown and the legal distance to the boundary
    const it = ST.items[U.sel],
      p = it && D.db.byId.get(it.id);
    if (p) {
      const c = pr(it.x, it.y, 0.05),
        G = M.sizeAt(p, 999, M.seedOf(it)),
        q = pr(it.x + G.w / 2, it.y, 0.05);
      h += `<circle class="gp-grown" cx="${c[0].toFixed(1)}" cy="${c[1].toFixed(1)}" r="${Math.hypot(q[0] - c[0], q[1] - c[1]).toFixed(1)}"/>`;
      const g = D.db.legal.get(p.nachbarrecht);
      if (g && g.abstand_m > 0) {
        const q2 = pr(it.x + g.abstand_m, it.y, 0.05),
          R2 = Math.hypot(q2[0] - c[0], q2[1] - c[1]);
        h += `<circle class="gp-ring" cx="${c[0].toFixed(1)}" cy="${c[1].toFixed(1)}" r="${R2.toFixed(1)}"/>`;
        h += `<text class="gp-rl" x="${c[0].toFixed(1)}" y="${(c[1] - R2 - 7).toFixed(1)}">${de(g.abstand_m)} m Grenzabstand</text>`;
      }
    }
    if (U.probe) {
      const c = pr(U.probe.x, U.probe.y, 0.05);
      h += `<circle class="gp-probe" cx="${c[0].toFixed(1)}" cy="${c[1].toFixed(1)}" r="5"/><text class="gp-rl" x="${c[0].toFixed(1)}" y="${(c[1] - 12).toFixed(1)}">${Math.round(U.probe.share * 100)} % Schatten</text>`;
    }
    return h;
  }
  // ---------------- input in the plan view (hooks of world/siteplan.js) ----------------
  const wpp = () => P.th / Math.max(1, stage.clientHeight);
  function hit(gp) {
    const tol = Math.max(0.5, wpp() * 16);
    let best = -1,
      bd = Infinity;
    ST.items.forEach((it, i) => {
      const p = D.db.byId.get(it.id);
      if (!p) return;
      const age = M.ageOf(it, viewYear()),
        s = M.sizeAt(p, age === null ? 0 : age, M.seedOf(it)),
        d = Math.hypot(gp[0] - it.x, gp[1] - it.y),
        r = Math.max(tol, Math.min(s.w / 2, 3));
      // the nearest trunk wins, a small plant inside a big crown can still be taken
      if (d < r && d - r * 0.3 < bd) {
        bd = d - r * 0.3;
        best = i;
      }
    });
    return best;
  }
  const HOOK = {
    draw,
    down(e, gp) {
      if (!U.open || U.mode !== 'plan' || D.st !== 'ok') return false;
      if (U.arm) return 'keep';
      const i = hit(gp);
      if (i < 0) return false;
      select(i);
      const it = ST.items[i];
      U.drag = { i, dx: it.x - gp[0], dy: it.y - gp[1], moved: false };
      return 'take';
    },
    move(e, gp) {
      const g = U.drag;
      if (!g || !ST.items[g.i]) return;
      const it = ST.items[g.i];
      it.x = r2(gp[0] + g.dx);
      it.y = r2(gp[1] + g.dy);
      g.moved = true;
      renderSel(true);
      redraw();
    },
    up(e, gp, tap) {
      const g = U.drag;
      U.drag = null;
      if (g && g.moved) changed();
    },
    tap(e, gp) {
      if (!U.open || U.mode !== 'plan' || D.st !== 'ok') return false;
      if (U.arm) {
        if (U.arm.guild) placeGuild(U.arm.guild, gp[0], gp[1]);
        else add(U.arm.id, gp[0], gp[1]);
        if (U.arm && U.arm.guild) disarm();
        return true;
      }
      if (U.shade && U.tab === 'schatten') {
        probe(gp[0], gp[1]);
        return true;
      }
      if (U.sel >= 0) select(-1);
      return false;
    },
  };
  SITEPLAN.hooks.push(HOOK);
  // share of the day in shade at a point (shade tab: tap the plan)
  function probe(x, y) {
    const cs = [];
    for (const e of entries())
      if (e.age !== null) cs.push({ x: e.x, y: e.y, c: M.crown(e.p, M.sizeAt(e.p, e.age, e.seed)) });
    const S = site();
    for (const b of S.buildings) cs.push({ foot: b.foot, h: b.h });
    for (const t of S.trees)
      cs.push({ x: t[0], y: t[1], c: { zb: t[3] * 0.35, zc: t[3] * 0.65, a: t[3] * 0.32, r: t[2] } });
    const r = GPSUN.shadeShare(x, y, 0.3, cs, YEAR, ST.month, 15, 20);
    U.probe = { x, y, share: r.share };
    renderShadeInfo();
    redraw();
    return r.share;
  }
  // ---------------- the panel ----------------
  function makePanel() {
    if (U.el) return U.el;
    const host = ($('npcpanel') && $('npcpanel').parentNode) || stage;
    const el = document.createElement('aside');
    el.id = 'gplan';
    el.hidden = true;
    el.setAttribute('aria-label', 'Gartenplaner');
    el.innerHTML =
      '<header><h3>Garten planen</h3><span class="gp-badge" hidden title="Die echten Pflanzendaten fehlen noch – Platzhalter, keine echten Werte">Testdaten</span>' +
      '<button type="button" class="gp-mode" data-gp="site" title="Im Garten gehen und die Pflanze vor dir setzen">Vor Ort</button>' +
      '<button type="button" class="gp-fold" data-gp="fold" aria-label="Einklappen" aria-expanded="true">▾</button>' +
      '<button type="button" class="x" data-gp="close" aria-label="Schließen">×</button></header>' +
      '<div class="gp-ages"><span>Alter</span><div class="gp-seg">' +
      M.AGES.map(
        a => `<button type="button" data-age="${a}">${a ? a + (a === 20 ? ' Jahre' : '') : 'heute'}</button>`
      ).join('') +
      '</div><button type="button" class="gp-show" data-gp="show" aria-pressed="true" title="Geplante Pflanzen im 3D-Garten zeigen (bleibt nach dem Schließen)">im Garten</button></div>' +
      '<div class="gp-sel" hidden></div>' +
      '<nav class="gp-tabs" role="tablist">' +
      [
        ['pflanzen', 'Pflanzen'],
        ['hinweise', 'Hinweise'],
        ['gilden', 'Gilden'],
        ['schatten', 'Schatten'],
        ['listen', 'Listen'],
      ]
        .map(
          ([k, t]) =>
            `<button type="button" role="tab" data-tab="${k}">${t}${k === 'hinweise' ? '<b></b>' : ''}</button>`
        )
        .join('') +
      '</nav><div class="gp-body"></div>' +
      '<div class="gp-site" hidden><p class="gp-sitehint"></p><div class="gp-row">' +
      '<button type="button" class="acc" data-gp="here">Hier setzen</button><button type="button" data-gp="moveHere">Ausgewählte hierher</button>' +
      '<button type="button" data-gp="plan">Draufsicht</button></div></div>';
    host.appendChild(el);
    U.el = el;
    el.addEventListener('click', onClick);
    el.addEventListener('input', onInput);
    // keys typed into the panel's fields do not walk the figure
    el.addEventListener('keydown', e => {
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes(e.target.tagName)) e.stopPropagation();
    });
    return el;
  }
  const q$ = s => U.el && U.el.querySelector(s);
  function renderBadge() {
    if (!U.el) return;
    const b = q$('[data-tab="hinweise"] b'),
      nw = U.warns.filter(w => w.level === 'warn').length;
    if (b) {
      b.textContent = U.warns.length ? String(U.warns.length) : '';
      b.className = nw ? 'bad' : '';
    }
    q$('.gp-badge').hidden = !D.test;
  }
  function renderAges() {
    if (!U.el) return;
    U.el
      .querySelectorAll('[data-age]')
      .forEach(b => b.setAttribute('aria-pressed', +b.dataset.age === ST.age ? 'true' : 'false'));
    const s = q$('[data-gp="show"]');
    s.setAttribute('aria-pressed', ST.show ? 'true' : 'false');
    s.textContent = ST.show ? 'im Garten: an' : 'im Garten: aus';
  }
  function renderSel(light) {
    if (!U.el) return;
    const box = q$('.gp-sel'),
      it = ST.items[U.sel],
      p = it && D.db.byId.get(it.id);
    if (!p) {
      box.hidden = true;
      box.innerHTML = '';
      return;
    }
    box.hidden = false;
    const age = M.ageOf(it, viewYear()),
      s = M.sizeAt(p, age === null ? 0 : age, M.seedOf(it)),
      G = M.sizeAt(p, 999, M.seedOf(it));
    const sz =
      age === null
        ? 'erst ab ' + it.jahr + ' gepflanzt'
        : (ST.age ? 'in ' + ST.age + ' Jahren' : 'beim Pflanzen') + ' ' + de(s.h) + ' m hoch, ' + de(s.w) + ' m breit';
    if (light && box.dataset.i === String(U.sel)) {
      const pos = box.querySelector('.gp-pos');
      if (pos) pos.textContent = 'x ' + de(it.x) + ' / y ' + de(it.y) + ' m';
      return;
    }
    const W = U.warns.filter(w => w.items.includes(U.sel));
    box.dataset.i = String(U.sel);
    box.innerHTML =
      `<div class="gp-selh"><i style="background:${LCOL[p.schicht]}"></i><b>${esc(M.fullName(p))}</b>` +
      `<button type="button" class="x" data-gp="desel" aria-label="Auswahl aufheben">×</button></div>` +
      `<p>${esc(sz)} · ausgewachsen ${de(G.h)} × ${de(G.w)} m · <span class="gp-pos">x ${de(it.x)} / y ${de(it.y)} m</span></p>` +
      `<div class="gp-row"><span class="gp-year">Pflanzjahr <button type="button" data-gp="y-" aria-label="ein Jahr früher">−</button><b>${it.jahr}</b><button type="button" data-gp="y+" aria-label="ein Jahr später">+</button></span>` +
      `<button type="button" data-gp="tips" aria-pressed="${U.tips ? 'true' : 'false'}">Berater</button><button type="button" data-gp="del">Löschen</button></div>` +
      (W.length
        ? '<ul class="gp-w">' + W.map(w => `<li class="${w.level}">${esc(w.text)}</li>`).join('') + '</ul>'
        : '<p class="gp-ok">Keine Hinweise für diese Pflanze.</p>') +
      (U.tips
        ? '<ul class="gp-tips">' +
          GPRULES.tips(p, D.db)
            .map(t => `<li>${esc(t)}</li>`)
            .join('') +
          '</ul>'
        : '');
  }
  function plantRow(p) {
    const F = M.finalSize(p),
      L = { sonne: 'Sonne', halbschatten: 'Halbschatten', schatten: 'Schatten' };
    const extra = [];
    if ((p.funktionen || []).includes('ertrag')) extra.push('essbar');
    if ((p.funktionen || []).includes('stickstoff')) extra.push('Stickstoff');
    const on = U.arm && U.arm.id === p.id;
    return (
      `<li><button type="button" data-pid="${esc(p.id)}" aria-pressed="${on ? 'true' : 'false'}"><i style="background:${LCOL[p.schicht]}"></i>` +
      `<b>${esc(M.fullName(p))}</b><small>${de(F.h)} m · ${(p.licht || []).map(l => L[l]).join('/')}${extra.length ? ' · ' + extra.join(' · ') : ''}${p.entwurf ? ' · Entwurf' : ''}</small></button></li>`
    );
  }
  const FILTERS = [
    ['s:baum', 'Baum'],
    ['s:kleinbaum', 'Kleinbaum'],
    ['s:strauch', 'Strauch'],
    ['s:kraut', 'Kraut'],
    ['s:boden', 'Boden'],
    ['s:wurzel', 'Wurzel'],
    ['s:kletter', 'Kletter'],
    ['l:sonne', 'Sonne'],
    ['l:halbschatten', 'Halbschatten'],
    ['l:schatten', 'Schatten'],
    ['f:ertrag', 'essbar'],
    ['f:stickstoff', 'Stickstoff'],
    ['f:insekten', 'Insekten'],
    ['f:mulch', 'Mulch'],
  ];
  function matches(p) {
    const q = U.q.trim().toLowerCase();
    if (q) {
      const hay = [p.name, p.sorte, p.art, p.text, (p.funktionen || []).join(' '), M.LAYER[p.schicht]]
        .join(' ')
        .toLowerCase();
      if (!q.split(/\s+/).every(w => hay.includes(w))) return false;
    }
    const by = { s: [], l: [], f: [] };
    for (const f of U.f) by[f[0]].push(f.slice(2));
    if (by.s.length && !by.s.includes(p.schicht)) return false;
    if (by.l.length && !by.l.some(l => (p.licht || []).includes(l))) return false;
    if (by.f.length && !by.f.every(f => (p.funktionen || []).includes(f))) return false;
    return true;
  }
  function renderList() {
    const ul = q$('.gp-list');
    if (!ul) return;
    let h = '';
    for (const layer of M.LAYERS) {
      const L = D.db.list.filter(p => p.schicht === layer && matches(p));
      if (!L.length) continue;
      h += `<li class="gp-lh">${esc(M.LAYER[layer])}</li>` + L.map(plantRow).join('');
    }
    ul.innerHTML = h || '<li class="gp-none">Nichts gefunden.</li>';
  }
  function renderShadeInfo() {
    const box = q$('.gp-sinfo');
    if (!box) return;
    const s = sunNow(),
      dl = GPSUN.dayLight(YEAR, ST.month, 15),
      hm = h => Math.floor(h) + ':' + String(Math.round((h % 1) * 60)).padStart(2, '0');
    const dir = SUNDIR[Math.round((((s.az % 360) + 360) % 360) / 45) % 8];
    q$('.gp-mlab').textContent = M.monthName(ST.month);
    q$('.gp-hlab').textContent = hm(ST.hour) + ' Uhr';
    box.innerHTML =
      (s.el > 0 ? `Sonne im ${dir}, ${de(s.el, 0)}° hoch (Azimut ${de(s.az, 0)}°).` : 'Die Sonne ist untergegangen.') +
      (dl.rise !== null ? ` Tageslicht am 15. ${M.monthName(ST.month)}: ${hm(dl.rise)}–${hm(dl.set)} Uhr.` : '') +
      (U.probe ? `<br>Angetippte Stelle: ${Math.round(U.probe.share * 100)} % des Tages im Schatten.` : '');
  }
  function renderBody() {
    if (!U.el) return;
    U.el
      .querySelectorAll('[data-tab]')
      .forEach(b => b.setAttribute('aria-selected', b.dataset.tab === U.tab ? 'true' : 'false'));
    const body = q$('.gp-body');
    if (D.st !== 'ok') {
      body.innerHTML =
        D.st === 'fail'
          ? '<p class="gp-msg bad">Die Pflanzendaten ließen sich nicht laden. ' + esc(D.errors[0] || '') + '</p>'
          : '<p class="gp-msg">Pflanzendaten werden geladen …</p>';
      return;
    }
    if (U.tab === 'pflanzen') {
      body.innerHTML =
        `<input type="search" class="gp-q" placeholder="Suchen: Apfel, Stickstoff, Beere …" value="${esc(U.q)}" aria-label="Pflanzen suchen">` +
        '<div class="gp-chips">' +
        FILTERS.map(
          ([k, t]) =>
            `<button type="button" data-f="${k}" aria-pressed="${U.f.has(k) ? 'true' : 'false'}">${t}</button>`
        ).join('') +
        '</div><p class="gp-hint">' +
        (U.arm && U.arm.id
          ? '<b>' +
            esc(M.fullName(D.db.byId.get(U.arm.id))) +
            '</b>: in den Plan tippen zum Setzen (mehrmals möglich) – Pflanze noch einmal antippen zum Beenden.'
          : 'Pflanze antippen, dann in den Plan tippen. Gesetzte Pflanzen ziehen zum Verschieben, antippen für Größe, Berater und Löschen.') +
        '</p><ul class="gp-list"></ul>';
      renderList();
    } else if (U.tab === 'hinweise') {
      body.innerHTML = U.warns.length
        ? '<p class="gp-hint">Antippen wählt die Pflanze im Plan. Gerechnet ' +
          (ST.age ? 'für in ' + ST.age + ' Jahren' : 'für heute') +
          ' – Kronen ausgewachsen.</p><ul class="gp-warns">' +
          U.warns
            .map(
              (w, k) =>
                `<li class="${w.level}"><button type="button" data-w="${k}"><b>${w.level === 'warn' ? 'Warnung' : 'Hinweis'}</b> ${esc(w.text)}${w.why ? `<small>${esc(w.why)}</small>` : ''}</button></li>`
            )
            .join('') +
          '</ul>'
        : '<p class="gp-ok">' + (ST.items.length ? 'Keine Warnungen und Hinweise.' : 'Noch nichts geplant.') + '</p>';
    } else if (U.tab === 'gilden') {
      body.innerHTML = D.db.guilds.length
        ? '<p class="gp-hint">' +
          (U.arm && U.arm.guild
            ? 'In den Plan tippen: dort kommt die Mitte hin, die Partner auf ihre Ringe.'
            : 'Vorlage antippen, dann in den Plan tippen, wo der Baum in der Mitte stehen soll.') +
          '</p><ul class="gp-guilds">' +
          D.db.guilds
            .map(g => {
              const mid = D.db.byId.get(g.mitte),
                n = g.ringe.reduce((s, r) => s + r.pflanzen.reduce((a, e) => a + e.anzahl, 0), 0);
              return `<li><button type="button" data-gid="${esc(g.id)}" aria-pressed="${U.arm && U.arm.guild === g.id ? 'true' : 'false'}"><b>${esc(g.name)}</b><small>${esc(mid ? M.fullName(mid) : g.mitte)} und ${n} Partner – ${esc(g.text)}</small></button></li>`;
            })
            .join('') +
          '</ul>'
        : '<p class="gp-ok">Noch keine Gilden-Vorlagen in den Daten.</p>';
    } else if (U.tab === 'schatten') {
      body.innerHTML =
        `<div class="gp-row"><button type="button" data-gp="shade" aria-pressed="${U.shade ? 'true' : 'false'}">Schatten zeigen</button></div>` +
        `<label class="gp-sl">Monat <b class="gp-mlab"></b><input type="range" class="gp-month" min="1" max="12" step="1" value="${ST.month}" aria-label="Monat"></label>` +
        `<label class="gp-sl">Uhrzeit <b class="gp-hlab"></b><input type="range" class="gp-hour" min="5" max="21" step="0.5" value="${ST.hour}" aria-label="Uhrzeit"></label>` +
        '<p class="gp-sinfo"></p><p class="gp-hint">Schatten der geplanten Pflanzen im gewählten Alter, der Gebäude und der Bäume im Garten am 15. des Monats. Mit „Schatten zeigen“ in den Plan tippen: wie viel des Tages die Stelle im Schatten liegt.</p>';
      renderShadeInfo();
    } else if (U.tab === 'listen') {
      const txt = listText();
      body.innerHTML =
        `<div class="gp-row"><button type="button" data-list="plan" aria-pressed="${U.list === 'plan' ? 'true' : 'false'}">Pflanzliste</button><button type="button" data-list="shop" aria-pressed="${U.list === 'shop' ? 'true' : 'false'}">Einkaufsliste</button></div>` +
        `<pre class="gp-text">${esc(txt)}</pre>` +
        '<div class="gp-row"><button type="button" data-gp="copy">Kopieren</button><button type="button" data-gp="dl">Herunterladen</button><button type="button" data-gp="print">Drucken</button></div><p class="gp-msg" hidden></p>';
    }
  }
  const today = () => {
    const d = new Date();
    return (
      String(d.getDate()).padStart(2, '0') + '.' + String(d.getMonth() + 1).padStart(2, '0') + '.' + d.getFullYear()
    );
  };
  function listText(kind = U.list) {
    if (D.st !== 'ok') return '';
    const S = site(),
      o = { date: today(), test: D.test, where: it => where(it, S) };
    return kind === 'plan' ? M.plantList(ST.items, D.db, o) : M.shopList(ST.items, D.db, o);
  }
  function msg(t, bad) {
    const m = q$('.gp-body .gp-msg');
    if (!m) return toast(t);
    m.hidden = false;
    m.textContent = t;
    m.classList.toggle('bad', !!bad);
  }
  function copy() {
    const t = listText();
    try {
      navigator.clipboard.writeText(t).then(
        () => msg('Kopiert.'),
        () => msg('Kopieren ging nicht – den Text oben markieren und kopieren.', true)
      );
    } catch (e) {
      msg('Kopieren ging nicht – den Text oben markieren und kopieren.', true);
    }
  }
  function download() {
    const t = listText(),
      name = (U.list === 'plan' ? 'pflanzplan' : 'einkaufsliste') + '-garten-ratscher.txt';
    try {
      const a = document.createElement('a');
      a.href = URL.createObjectURL(new Blob([t + '\n'], { type: 'text/plain;charset=utf-8' }));
      a.download = name;
      document.body.appendChild(a);
      a.click();
      setTimeout(() => {
        URL.revokeObjectURL(a.href);
        a.remove();
      }, 1500);
      msg('Als ' + name + ' heruntergeladen.');
    } catch (e) {
      msg('Herunterladen ging nicht – „Kopieren“ nehmen.', true);
    }
  }
  // print-friendly: the list alone in a new window (falls back to copying when pop-ups are blocked)
  function printList() {
    const w = window.open('', '_blank');
    if (!w) return msg('Das Fenster zum Drucken wurde blockiert – „Kopieren“ oder „Herunterladen“ nehmen.', true);
    w.document.write(
      '<!doctype html><meta charset="utf-8"><title>Garten Ratscher</title><pre style="font:13px/1.5 ui-monospace,monospace;white-space:pre-wrap">' +
        esc(listText()) +
        '</pre>'
    );
    w.document.close();
    w.focus();
    w.print();
  }
  function arm(a) {
    U.arm = a;
    renderBody();
    document.body.dataset.gparm = a ? '1' : '';
  }
  const disarm = () => arm(null);
  function onClick(e) {
    const b = e.target.closest('button');
    if (!b || !U.el.contains(b)) return;
    const d = b.dataset;
    if (d.tab) {
      U.tab = d.tab;
      if (U.tab !== 'pflanzen' && U.arm && U.arm.id) U.arm = null;
      if (U.tab !== 'gilden' && U.arm && U.arm.guild) U.arm = null;
      renderBody();
      redraw();
    } else if (d.age !== undefined) setAge(+d.age);
    else if (d.pid) {
      if (U.arm && U.arm.id === d.pid) disarm();
      else {
        arm({ id: d.pid });
        if (U.mode === 'site') renderSite();
      }
    } else if (d.gid) {
      if (U.arm && U.arm.guild === d.gid) disarm();
      else arm({ guild: d.gid });
    } else if (d.f) {
      U.f.has(d.f) ? U.f.delete(d.f) : U.f.add(d.f);
      b.setAttribute('aria-pressed', U.f.has(d.f) ? 'true' : 'false');
      renderList();
    } else if (d.w !== undefined) {
      const w = U.warns[+d.w];
      if (w) focusItem(w.items[0]);
    } else if (d.list) {
      U.list = d.list;
      renderBody();
    } else if (d.gp) act(d.gp);
  }
  function act(a) {
    const it = ST.items[U.sel];
    if (a === 'close') close();
    else if (a === 'fold') {
      const f = U.el.classList.toggle('folded');
      q$('[data-gp="fold"]').setAttribute('aria-expanded', f ? 'false' : 'true');
      q$('[data-gp="fold"]').textContent = f ? '▴' : '▾';
    } else if (a === 'show') setShow(!ST.show);
    else if (a === 'desel') select(-1);
    else if (a === 'del' && it) remove(U.sel);
    else if ((a === 'y-' || a === 'y+') && it) {
      it.jahr = Math.max(YEAR - 30, Math.min(YEAR + 30, it.jahr + (a === 'y+' ? 1 : -1)));
      changed();
      renderSel();
    } else if (a === 'tips') {
      U.tips = !U.tips;
      renderSel();
    } else if (a === 'shade') {
      U.shade = !U.shade;
      if (!U.shade) U.probe = null;
      renderBody();
      redraw();
    } else if (a === 'copy') copy();
    else if (a === 'dl') download();
    else if (a === 'print') printList();
    else if (a === 'site') siteMode(U.mode !== 'site');
    else if (a === 'plan') siteMode(false);
    else if (a === 'here') placeHere();
    else if (a === 'moveHere') moveHere();
  }
  function onInput(e) {
    const t = e.target;
    if (t.classList.contains('gp-q')) {
      U.q = t.value;
      renderList();
    } else if (t.classList.contains('gp-month')) setShade(+t.value, null);
    else if (t.classList.contains('gp-hour')) setShade(null, +t.value);
  }
  // a warning tapped: select its plant, bring it into view
  function focusItem(i) {
    const it = ST.items[i];
    if (!it) return;
    select(i);
    if (U.mode === 'plan' && P.mode === 'top') centerOn(it.x, it.y);
  }
  // ---------------- open, close, framing the garden ----------------
  const isSheet = () => stage.clientWidth < 640 && stage.clientHeight > stage.clientWidth;
  function panelShare() {
    if (!U.el || U.el.hidden) return 0;
    const r = U.el.getBoundingClientRect(),
      s = stage.getBoundingClientRect();
    return isSheet() ? Math.min(0.7, r.height / Math.max(1, s.height)) : Math.min(0.6, r.width / Math.max(1, s.width));
  }
  function frameGarden() {
    const W = stage.clientWidth,
      H = stage.clientHeight,
      bx = [-14, 18],
      by = [-46, 40];
    const sh = panelShare(),
      sheet = isSheet(),
      top = 70;
    const vw = sheet ? W : W * (1 - sh),
      vh = sheet ? H * (1 - sh) - top : H - top;
    const th = Math.max(((by[1] - by[0]) * H) / Math.max(80, vh), ((bx[1] - bx[0]) * H) / Math.max(80, vw));
    P.th = Math.min(th * 1.04, 168);
    centerOn((bx[0] + bx[1]) / 2, (by[0] + by[1]) / 2);
  }
  // the middle of the free part of the picture (beside or above the panel, under the plan view's bar) shows (x, y)
  function centerOn(x, y) {
    const W = stage.clientWidth,
      H = stage.clientHeight,
      sh = panelShare(),
      sheet = isSheet(),
      top = 70,
      mpp = P.th / Math.max(1, H);
    const offX = sheet ? 0 : (W * sh) / 2,
      offY = sheet ? (H * sh) / 2 - top / 2 : -top / 2;
    P.tx = x + offX * mpp;
    P.ty = y - offY * mpp;
    markDirty();
  }
  async function open() {
    makePanel();
    U.open = true;
    U.el.hidden = false;
    document.body.dataset.gplan = '1';
    const b = $('gplanbtn');
    if (b) b.setAttribute('aria-pressed', 'true');
    renderAges();
    renderBody();
    if (U.mode === 'plan') {
      if (P.mode !== 'top') go('draufsicht');
      requestAnimationFrame(() => frameGarden());
    } else renderSite();
    await loadData();
    renderBadge();
    renderBody();
    renderSel();
    view3d();
    recheck(true);
    redraw();
    if (D.test && !U.testHinted) {
      U.testHinted = true;
      toast('Gartenplaner mit Testdaten: die echten Pflanzendaten kommen noch.', 4200);
    }
  }
  function close() {
    if (!U.el) return;
    U.open = false;
    U.el.hidden = true;
    U.arm = null;
    U.drag = null;
    U.probe = null;
    document.body.dataset.gplan = '';
    document.body.dataset.gparm = '';
    const b = $('gplanbtn');
    if (b) b.setAttribute('aria-pressed', 'false');
    if (U.mode === 'site') siteMode(false, true);
    view3d();
    redraw();
  }
  // ---------------- on site: walking in the garden, setting the chosen plant in front of the player ----------------
  function front(d = 2.2) {
    const a = (P.yaw * Math.PI) / 180;
    return [P.x + Math.sin(a) * d, P.y + Math.cos(a) * d];
  }
  function renderSite() {
    if (!U.el) return;
    const on = U.mode === 'site';
    U.el.classList.toggle('site', on);
    q$('.gp-site').hidden = !on;
    q$('[data-gp="site"]').textContent = on ? 'Draufsicht' : 'Vor Ort';
    const p = U.arm && U.arm.id ? D.db.byId.get(U.arm.id) : null,
      it = ST.items[U.sel];
    q$('.gp-sitehint').textContent = p
      ? M.fullName(p) + ': „Hier setzen“ setzt sie zwei Schritte vor dir.'
      : 'Im Reiter „Pflanzen“ eine Pflanze wählen – oder eine gesetzte antippen in der Draufsicht und hier „hierher“ holen.';
    q$('[data-gp="here"]').disabled = !p;
    q$('[data-gp="moveHere"]').disabled = !it;
  }
  function siteMode(on, quiet) {
    U.mode = on ? 'site' : 'plan';
    if (on) {
      const it = ST.items[U.sel];
      if (P.mode !== 'walk') go('garten');
      // stand a few steps south of the selected plant, looking at it
      if (it) {
        P.x = it.x;
        P.y = it.y - 4.5;
        P.yaw = 0;
        P.pitch = 2;
      }
      document.body.dataset.gpsite = '1';
    } else {
      document.body.dataset.gpsite = '';
      if (!quiet && U.open) {
        go('draufsicht');
        requestAnimationFrame(() => frameGarden());
      }
    }
    renderSite();
    renderBody();
    view3d();
    redraw();
  }
  function placeHere() {
    if (!U.arm || !U.arm.id) return -1;
    const [x, y] = front();
    const i = add(U.arm.id, x, y);
    toast(M.fullName(D.db.byId.get(U.arm.id)) + ' gesetzt.', 2200);
    renderSite();
    return i;
  }
  function moveHere() {
    const it = ST.items[U.sel];
    if (!it) return false;
    const [x, y] = front();
    it.x = r2(x);
    it.y = r2(y);
    changed();
    renderSel();
    return true;
  }
  // ---------------- keys, the menu entry, the frame tick, the start ----------------
  window.addEventListener('keydown', e => {
    if (!U.open || ['INPUT', 'TEXTAREA', 'SELECT'].includes(document.activeElement?.tagName)) return;
    if ((e.key === 'Delete' || e.key === 'Backspace') && U.sel >= 0 && P.mode === 'top') {
      remove(U.sel);
      e.preventDefault();
    } else if (e.key === 'Escape' && U.arm) disarm();
  });
  const mb = $('gplanbtn');
  if (mb)
    mb.addEventListener('click', () => {
      HUD.setMenu(false);
      if (U.open && U.mode === 'plan' && P.mode === 'top') close();
      else open();
    });
  let lastMode = P.mode,
    acc = 0,
    lastMonth = 0;
  (window.TICKS = window.TICKS || []).push(dt => {
    if (P.mode !== lastMode) {
      lastMode = P.mode;
      // left the plan view (its „Fertig“, a place in the menu): the planner closes; in the plan view again: back to planning
      if (U.open && U.mode === 'plan' && P.mode !== 'top') close();
      else if (U.open && U.mode === 'site' && P.mode === 'top') siteMode(false, true);
      else if (U.open && U.mode === 'site') renderSite();
    }
    if (U.open || !ST.show || D.st !== 'ok' || !ST.items.length) return;
    acc += dt;
    if (acc < 2) return;
    acc = 0;
    const m = gameMonth();
    if (m !== lastMonth) {
      lastMonth = m;
      view3d();
    }
  });
  // a plan saved with „im Garten: an“ stands in the garden after a reload: its data load once the model stands (not before)
  whenLoaded(() => {
    if (ST.show && ST.items.length)
      setTimeout(() => {
        loadData().then(() => {
          view3d();
          recheck(true);
        });
      }, 1500);
  });
  const api = {
    open,
    close,
    loadData,
    add,
    remove,
    select,
    placeGuild,
    setAge,
    setShow,
    setShade,
    siteMode,
    placeHere,
    moveHere,
    probe,
    listText,
    frameGarden,
    site,
    shadows,
    arm,
    get state() {
      return ST;
    },
    get ui() {
      return U;
    },
    get data() {
      return D;
    },
    get warnings() {
      return U.warns;
    },
    M,
    SUN: GPSUN,
    RULES: GPRULES,
    G3: GP3D,
  };
  return api;
})();
window.GPLAN = GPLAN;
