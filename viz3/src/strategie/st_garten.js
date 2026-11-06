// ===================== feat/strategie-bau: the garden from above – planning, buying, planting, care, protection, harvest (STGARTEN) =====================
// The garden planner (gplan/*) steered from above (plan_strategie.md 4, 8: „Von oben ein Beet geplant → im Garten stehen die Pflanzen und
// wachsen mit dem Kalender“): a suggestion when nothing is planned (an apple and its pollinator – apples are self-sterile), buying at the
// Baumschule Kammbach with delivery to the garden gate the next morning (the planner's containers: gplan/gplan_shop.js shows them there),
// planting step by step in the planting season (the same steps as by hand: gplan/gplan_game.js GPGAME.apply – the hole, the vole basket,
// the stake, the tree, tying, watering in), watering in the first two summers, protection against browsing (feat/tiere's TIERE.schutz when it
// is there, else a small model of its own), pruning in late winter, the harvest into the stock „Obst“ (also what is picked on foot: the
// event gplan:geerntet), fruit that keeps or spoils, gifts to the neighbours (favours, your style) and the market in Schleusingen (Euro).
// State: STRAT.S.ext.garten (saved with pav-strat-v1); the plants themselves stay in the planner's pav-gplan-v1.
import { KERN } from '../core/kern.js';
import { CLOCK } from '../time/clock.js';
import { GPMODEL as M } from '../gplan/gplan_model.js';
import { GPLAN } from '../gplan/gplan.js';
import { GPGAME } from '../gplan/gplan_game.js';
import { STDATA } from './st_data.js';
import { STRAT } from './st_modus.js';
import { STBAUDATA } from './st_bau_data.js';
import { STBAU } from './st_bau.js';
export const STGARTEN = (() => {
  const D = STDATA,
    G = STBAUDATA.GARDEN,
    S = STRAT.S,
    W = STRAT.W;
  const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
  const de = (v, n = 1) => (+v).toLocaleString('de-DE', { minimumFractionDigits: n, maximumFractionDigits: n });
  const isNum = v => typeof v === 'number' && Number.isFinite(v);
  // ---------------- state (STRAT.S.ext.garten, checked whenever read) ----------------
  function st() {
    let g = S.ext.garten;
    if (!g || typeof g !== 'object' || Array.isArray(g)) g = S.ext.garten = {};
    if (g.v !== 1) {
      for (const k of Object.keys(g)) delete g[k];
      g.v = 1;
    }
    if (!Array.isArray(g.obst)) g.obst = [];
    g.obst = g.obst.filter(o => o && typeof o.id === 'string' && isNum(o.kg) && o.kg > 0 && isNum(o.d)).slice(-60);
    for (const k of ['schutz', 'dmg']) if (!g[k] || typeof g[k] !== 'object' || Array.isArray(g[k])) g[k] = {};
    if (g.huehner != null && (typeof g.huehner !== 'object' || Array.isArray(g.huehner))) g.huehner = null;
    for (const k of ['sold', 'given', 'eur']) if (!isNum(g[k])) g[k] = 0;
    return g;
  }
  // ---------------- the planner's plants ----------------
  const ready = () => GPLAN.ready;
  let asked = false;
  function ensureData() {
    if (asked) return;
    asked = true;
    GPLAN.loadData().then(() => {
      try {
        GPLAN.view3d();
      } catch (e) {}
    });
  }
  const keyOf = it => it.id + '@' + Math.round(it.x * 10) + ',' + Math.round(it.y * 10);
  const gday = () => GPLAN.gday();
  const all = () => {
    if (!ready()) return [];
    const db = GPLAN.data.db;
    return GPLAN.state.items.map((it, i) => ({ it, i, p: db.byId.get(it.id) })).filter(x => x.p);
  };
  const isTree = p => p && (p.schicht === 'baum' || p.schicht === 'kleinbaum');
  const planted = () => all().filter(x => x.it.st === 'gepflanzt');
  const planned = () => all().filter(x => x.it.st !== 'gepflanzt');
  const box = it => GPLAN.state.kuebel.filter(c => c.id === it.id);
  // a bought container of this plant that has arrived (at the gate, set down, in the hands)
  const arrived = it => box(it).find(c => c.loc === 'tor' || c.loc === 'boden' || c.loc === 'hand') || null;
  const coming = it =>
    box(it).find(c => c.loc === 'liefer' || c.loc === 'kasse' || c.loc === 'auto' || c.loc === 'anh') || null;
  // planned items still to buy: one container per planned item (several of a kind: as many containers as items)
  function toBuy() {
    const need = {},
      have = {};
    for (const x of planned()) if (!x.it.sch) need[x.it.id] = (need[x.it.id] || 0) + 1;
    for (const c of GPLAN.state.kuebel) have[c.id] = (have[c.id] || 0) + 1;
    const out = [];
    for (const [id, n] of Object.entries(need)) for (let k = 0; k < n - (have[id] || 0); k++) out.push(id);
    return out;
  }
  const plantable = () => planned().filter(x => GPLAN.frei || x.it.sch || arrived(x.it));
  const ageOf = x => Math.max(0, (gday() - x.it.pd) / M.DAY_YEAR);
  const nameOf = p => M.fullName(p);
  const month = () => M.monthOfDay(gday());
  const inMonths = (m, r) => !!r && (r[0] <= r[1] ? m >= r[0] && m <= r[1] : m >= r[0] || m <= r[1]);
  // ---------------- protection against browsing (feat/tiere's API when it is there) ----------------
  const T = () =>
    window.TIERE && window.TIERE.schutz && typeof window.TIERE.schutz.add === 'function' ? window.TIERE : null;
  const guarded = x => {
    if (st().schutz[keyOf(x.it)]) return true;
    const t = T();
    try {
      return !!(t && t.schutz.at(x.it.x, x.it.y, 'reh'));
    } catch (e) {
      return false;
    }
  };
  const young = x => ageOf(x) < 6;
  // the damage of a planted tree (0 whole … 1 lost): feat/tiere's model when it is there (TIERE.baeume, its ids gp_<id>_<x·10>_<y·10>),
  // else the small model of this module
  function dmgOf(it) {
    const t = T();
    if (t && typeof t.baeume === 'function')
      try {
        const id = 'gp_' + it.id + '_' + Math.round(it.x * 10) + '_' + Math.round(it.y * 10),
          b = t.baeume().find(q => q.id === id);
        return b ? b.dmg || 0 : 0;
      } catch (e) {
        return 0;
      }
    return st().dmg[keyOf(it)] || 0;
  }
  // ---------------- the stock of fruit (kg, by harvest; what keeps and what spoils) ----------------
  const keepOf = id => {
    const k = Object.keys(G.keep).find(s => id.startsWith(s));
    return k ? G.keep[k] : G.keepDef;
  };
  const obstKg = () => st().obst.reduce((s, o) => s + o.kg, 0);
  function takeObst(kg) {
    const g = st();
    let left = kg;
    g.obst.sort((a, b) => a.d + keepOf(a.id) - (b.d + keepOf(b.id)));
    for (const o of g.obst) {
      const q = Math.min(o.kg, left);
      o.kg = +(o.kg - q).toFixed(2);
      left -= q;
      if (left <= 1e-6) break;
    }
    g.obst = g.obst.filter(o => o.kg > 0.01);
    return kg - left;
  }
  // a harvest (from above or by hand): into the stock, less what roe deer or voles took
  KERN.on('gplan:geerntet', e => {
    if (!e || !isNum(e.kg) || e.kg <= 0) return;
    const g = st(),
      it = GPLAN.state.items[e.i],
      dm = it ? dmgOf(it) : 0,
      kg = +(e.kg * (1 - Math.min(0.8, dm))).toFixed(1);
    g.obst.push({ id: e.id, kg, d: gday() });
    STRAT.emit('obst', { id: e.id, kg });
  });
  STRAT.res.define({
    id: 'obst',
    label: 'Obst',
    icon: '🍎',
    unit: 'kg',
    order: 58,
    get: () => obstKg(),
    fmt: v => de(v, 1) + ' kg',
    tip: () => {
      const L = st().obst;
      return L.length
        ? L.map(o => `${de(o.kg, 1)} kg ${o.id} (hält noch ${Math.max(0, keepOf(o.id) - (gday() - o.d))} Tage)`).join(
            ' · '
          )
        : 'Noch keine Ernte – erst pflanzen, dann ein paar Jahre warten';
    },
  });
  // each game day: fruit that spoils, browsing of unprotected young trees (without feat/tiere)
  KERN.on('strategie:tag', () => {
    const g = st();
    if (g.obst.length) {
      const d = gday(),
        bad = g.obst.filter(o => d - o.d > keepOf(o.id));
      if (bad.length) {
        const kg = bad.reduce((s, o) => s + o.kg, 0);
        g.obst = g.obst.filter(o => d - o.d <= keepOf(o.id));
        if (kg >= 0.5)
          STRAT.note(`${de(kg, 1)} kg Obst sind verdorben.`, {
            kind: 'garten',
            why: 'Kirschen und Zwetschen halten nur Tage, Äpfel im kühlen Keller Monate – verschenken, verkaufen oder einkochen, bevor es verdirbt.',
            src: 'Pflanzen-Datenbank des Gartenplaners (Ernte)',
          });
      }
    }
    if (T() || !ready()) return;
    const m = month(),
      ch = m >= 11 || m <= 5 ? G.browse[0] : G.browse[1],
      r = STRAT.C.rng(((gday() * 2654435761) ^ 77) | 0);
    for (const x of planted()) {
      if (!isTree(x.p) || !young(x) || guarded(x)) continue;
      if (r() < ch) {
        const k = keyOf(x.it);
        g.dmg[k] = Math.min(1, (g.dmg[k] || 0) + 0.3);
        STRAT.note(`Ein Reh hat ${nameOf(x.p)} verbissen – der Leittrieb ist ab.`, {
          kind: 'garten',
          why: G.learn.schutz,
          src: G.learn.schutzSrc + '; ' + G.browseSrc,
        });
      }
    }
  });
  // feat/tiere: the animals' module reports damage – told from above when it is in the garden
  KERN.on('tiere:schaden', e => {
    if (e && e.kind === 'huhn') {
      STRAT.note('Der Fuchs hat ein Huhn geholt – die Klappe war nachts offen.', {
        kind: 'garten',
        why: 'Füchse jagen in der Dämmerung und nachts; ein offener Stall ist für sie leichte Beute. Eine Klappe mit Lichtsensor schließt von selbst.',
        src: 'feat/tiere (der Fuchs an den Hühnern)',
      });
      return;
    }
    if (!e || !['verbiss', 'fegen', 'wurzel', 'wuehlen'].includes(e.kind)) return;
    if (!(isNum(e.x) && isNum(e.y) && Math.hypot(e.x, e.y) < 70)) return;
    const what = {
      verbiss: 'verbissen',
      fegen: 'gefegt (Bast vom Gehörn an der Rinde)',
      wurzel: 'an den Wurzeln benagt',
      wuehlen: 'umgewühlt',
    }[e.kind];
    STRAT.note(
      `Im Garten: ${e.art === 'wildschwein' ? 'Wildschweine haben die Wiese' : e.art === 'wuehlmaus' ? 'Wühlmäuse haben einen jungen Baum' : 'Ein Reh hat einen jungen Baum'} ${what}.`,
      {
        kind: 'garten',
        why: G.learn.schutz,
        src: G.learn.schutzSrc + '; feat/tiere',
      }
    );
  });
  // ---------------- places: the orchard, the nursery ----------------
  const centre = () => {
    const L = all();
    if (!L.length) return [-5.5, 6];
    return [L.reduce((s, x) => s + x.it.x, 0) / L.length, L.reduce((s, x) => s + x.it.y, 0) / L.length];
  };
  STRAT.place.define({
    id: 'obstgarten',
    name: 'Obstgarten (Gartenplaner)',
    icon: '🌳',
    order: 26,
    r: 8,
    pos: centre,
    sub: () => {
      ensureData();
      if (!ready()) return 'Die Pflanzendaten laden …';
      const p = planted().length,
        q = planned().length;
      return `${p} gepflanzt · ${q} geplant · Gartentag ${M.dayDe(gday())}`;
    },
    stock: () => {
      const g = st(),
        y = M.yearOfDay(gday()),
        e = (GPLAN.state.ernte || {})[String(y)] || {};
      return [
        ['Obst im Vorrat', de(obstKg(), 1) + ' kg'],
        [
          'Ernte ' + y + ' (Erntebuch)',
          de(
            Object.values(e).reduce((s, v) => s + v, 0),
            1
          ) + ' kg',
        ],
        ['Verschenkt · verkauft', de(g.given, 1) + ' kg · ' + de(g.sold, 1) + ' kg'],
      ];
    },
    info: () => infoHTML(),
    badge: () => {
      if (!ready()) return '';
      const th = planted().filter(x => M.thirst(x.it, gday()) !== null).length,
        rp = planted().filter(x => M.careOf(x.it, x.p, gday()).includes('ernten')).length;
      return [th && th + ' durstig', rp && rp + ' reif', planted().length && planted().length + ' Bäume']
        .filter(Boolean)
        .join(' · ');
    },
    missing: () => {
      if (!ready()) return [];
      const m = [];
      const nb = toBuy().length;
      if (nb) m.push(nb + ' geplante Pflanzen kaufen (Baumschule Kammbach)');
      const un = planted().filter(x => isTree(x.p) && young(x) && !guarded(x)).length;
      if (un) m.push(un + ' junge Bäume ohne Verbissschutz');
      return m;
    },
  });
  STRAT.place.define({
    id: 'kammbach',
    name: 'Baumschule Kammbach (Kloster Veßra)',
    icon: '✿',
    order: 92,
    r: 30,
    pos: () => {
      const s = KERN.spot('baumschule');
      return s && s.pos ? s.pos.slice(0, 2) : [-8863, -171];
    },
    sub: () => 'Obstbäume, Beeren, Stauden – Lieferung ans Gartentor am nächsten Morgen',
  });
  function infoHTML() {
    if (!ready()) return '<div class="sub">Die Pflanzendaten des Gartenplaners laden …</div>';
    const gd = gday();
    let h = '<h4>Pflanzen</h4><ul>';
    const L = all();
    if (!L.length)
      h += '<li><span>Noch nichts geplant – unten ein Vorschlag, oder Menü → Gestalten → „Garten planen“.</span></li>';
    for (const x of L.slice(0, 12)) {
      const it = x.it;
      let s;
      if (it.st === 'gepflanzt') {
        const a = ageOf(x),
          sz = M.sizeAt(x.p, a, M.seedOf(it)),
          c = M.careOf(it, x.p, gd);
        s = `gepflanzt ${M.dayDe(it.pd)} · ${de(a, 1)} J. · ${de(sz.h, 1)} m${guarded(x) ? ' · geschützt' : isTree(x.p) && young(x) ? ' · ohne Verbissschutz' : ''}${c.length ? ' · ' + c.map(k => M.CARE[k].label).join(', ') : ''}${dmgOf(it) >= 0.3 ? ' · verbissen' : ''}`;
      } else if (it.sch) s = 'wird gepflanzt (' + it.sch + '/' + M.plantSteps(x.p).length + ')';
      else if (arrived(it)) s = 'gekauft – steht am Gartentor';
      else if (coming(it)) s = 'gekauft – kommt morgen früh';
      else s = 'geplant ' + it.jahr;
      h += `<li><span>${esc(nameOf(x.p))}</span><b>${esc(s)}</b></li>`;
    }
    h += '</ul>';
    const m = month(),
      pz = L.length ? L[0].p.pflanzzeit : [10, 4];
    h += `<div class="learn">${esc(G.learn.pflanzen)} Jetzt ist ${esc(M.monthName(m))}: ${inMonths(m, pz) ? 'Pflanzzeit.' : 'keine Pflanzzeit (Oktober bis April).'}<br><small>Quelle: ${esc(G.learn.pflanzenSrc)}</small></div>`;
    return h;
  }
  // ---------------- jobs ----------------
  const garden = 'obstgarten';
  const here = (j, id) => STRAT.pos(id).slice(0, 2);
  STRAT.job.define({
    id: 'g_vorschlag',
    label: 'Zwei Apfelbäume planen: ‚Rebella‘ und ihr Befruchter ‚Rewena‘',
    place: garden,
    spot: here,
    people: [1, 2],
    skill: 'garten',
    min: 1,
    heavy: 0,
    order: 1,
    anytime: true,
    text: 'Im Gartenplaner zwei schorfresistente Halbstämme setzen – mit Abstand zur Grenze, zu den Gebäuden und zueinander.',
    learn: G.learn.paar + ' Quelle: ' + G.learn.paarSrc + '. ' + G.learn.abstand + ' Quelle: ' + G.learn.abstandSrc,
    show: () => ready() && !all().some(x => isTree(x.p)),
    dur: 30,
    finish: () => {
      const site = GPLAN.site(),
        R = GPLAN.RULES,
        used = all().map(x => [x.it.x, x.it.y]),
        ok = ([x, y]) =>
          R.inPoly(x, y, site.boundary) &&
          R.edgeDist(x, y, site.boundary) >= 4 &&
          site.buildings.every(b => R.edgeDist(x, y, b.foot) >= 4) &&
          used.every(u => Math.hypot(u[0] - x, u[1] - y) >= 7);
      const put = [];
      for (const id of G.pair) {
        const sp = G.spots.find(s => ok(s) && !put.some(q => Math.hypot(q[0] - s[0], q[1] - s[1]) < 7));
        if (!sp) break;
        GPLAN.add(id, sp[0], sp[1], { quiet: true });
        used.push(sp);
        put.push(sp);
      }
      GPLAN.changed({ now: true });
      return { text: put.length ? put.length + ' Apfelbäume geplant' : 'kein freier Platz gefunden' };
    },
  });
  // buying: one container per planned plant, the protection material with it; delivered to the gate the next morning (gplan/gplan_shop.js)
  const priceOf = p => {
    const s = p.schutz || [];
    return (
      (isTree(p) ? G.tree.eur : G.bush.eur) +
      (s.includes('wuehlmauskorb') ? G.korb.eur : 0) +
      (s.includes('pfahl') ? G.pfahl.eur : 0) +
      (s.includes('verbissschutz') || s.includes('stammschutz') ? G.schutz.eur : 0)
    );
  };
  STRAT.job.define({
    id: 'g_kaufen',
    label: 'In der Baumschule Kammbach kaufen (Lieferung ans Gartentor)',
    place: 'kammbach',
    people: [1, 2],
    skill: 'reden',
    min: 1,
    heavy: 0.1,
    order: 2,
    hours: [9 * 60, 18 * 60],
    text: 'Die geplanten Pflanzen aussuchen, Wühlmauskörbe, Pfähle und Verbissschutz dazu; geliefert wird am nächsten Morgen ans Gartentor.',
    learn: 'Preise: ' + G.tree.src + '; ' + G.schutz.src + '.',
    show: () => ready() && toBuy().length > 0,
    dur: 60,
    can: cx => {
      if (cx.day.wd === 0 || cx.day.hol)
        return {
          no: true,
          text: 'Die Baumschule hat sonntags und feiertags zu.',
          why: 'Ladenöffnung: sonn- und feiertags geschlossen.',
          src: 'Thüringer Ladenöffnungsgesetz',
        };
      const L = toBuy();
      if (!L.length && !(cx.job && cx.job.d.ids))
        return { no: true, text: 'Es ist nichts zu kaufen – erst planen.', why: '', src: '' };
      const eur = L.reduce((s, id) => s + priceOf(GPLAN.data.db.byId.get(id)), 0);
      return STRAT.S.eur < eur
        ? { no: true, text: `Nicht genug Geld (${Math.round(eur)} €).`, why: '', src: '' }
        : null;
    },
    init: j => {
      j.d.ids = toBuy();
    },
    finish: j => {
      const ids = toBuy(),
        day = GPLAN.gameDay(),
        db = GPLAN.data.db;
      let eur = 0,
        n = 0;
      for (const id of ids) {
        const p = db.byId.get(id);
        if (!p) continue;
        GPLAN.state.kuebel.push({ k: 'st' + Date.now().toString(36) + n, id, loc: 'liefer', tag: day });
        eur += priceOf(p);
        n++;
      }
      const deal = j.who.some(id => STRAT.ability.buff(id, 'handel')) ? 0.9 : 1;
      if (n) STRAT.book(-eur * deal, `Baumschule Kammbach: ${n} Pflanzen mit Schutz`, 'garten');
      GPLAN.changed({ game: true, no3d: true });
      KERN.emit('gplan:liefern', { n });
      return { text: `${n} Pflanzen, Lieferung morgen früh ans Gartentor` };
    },
  });
  // planting: the planner's steps one after another (the hole, basket, stake, the tree, tying, watering in) – the same as by hand
  STRAT.job.define({
    id: 'g_pflanzen',
    label: 'Bäume pflanzen',
    place: garden,
    people: [1, 2],
    skill: 'garten',
    min: 1,
    heavy: 0.7,
    xp: 1.2,
    order: 3,
    pose: 'chop',
    text: 'Pflanzloch graben, Wühlmauskorb, Pfahl, den Baum einsetzen, anbinden, 20 Liter angießen – Baum für Baum.',
    learn: G.learn.pflanzen + ' Quelle: ' + G.learn.pflanzenSrc,
    show: () => ready() && plantable().length > 0,
    spot: j => {
      const x = (j.d.list || []).map(i => GPLAN.state.items[i]).find(it => it && it.st !== 'gepflanzt');
      return x ? [x.x + 0.8, x.y] : centre();
    },
    can: cx => {
      const L =
        cx.job && cx.job.d.list ? cx.job.d.list.map(i => all().find(x => x.i === i)).filter(Boolean) : plantable();
      if (!L.length)
        return {
          no: true,
          text: 'Nichts zu pflanzen – erst kaufen; die Lieferung kommt morgens ans Tor.',
          why: '',
          src: '',
        };
      const p = L[0].p,
        m = W.dateOf(cx.t).getUTCMonth() + 1;
      if (p.pflanzzeit && !inMonths(m, p.pflanzzeit))
        return {
          no: true,
          text: `Keine Pflanzzeit für ${nameOf(p)} (${M.monthRange(p.pflanzzeit)}).`,
          why: G.learn.pflanzen,
          src: G.learn.pflanzenSrc,
        };
      if (STBAU.tempOf(cx.t) < -1)
        return {
          no: true,
          text: 'Der Boden ist gefroren.',
          why: 'In gefrorenen Boden pflanzt man nicht: die Wurzeln erfrieren, das Loch lässt sich nicht schließen.',
          src: STBAUDATA.TEMP_SRC,
        };
      return null;
    },
    init: j => {
      j.d.list = plantable()
        .slice(0, 4)
        .map(x => x.i);
      j.d.steps = j.d.list.reduce((s, i) => {
        const x = all().find(y => y.i === i);
        return s + (x ? M.plantSteps(x.p).length - (x.it.sch || 0) : 0);
      }, 0);
      j.d.did = 0;
    },
    dur: (j, cx) => ((j.d.list || []).length * 50) / Math.max(1, j.who.length * 0.85) / (0.7 + 0.1 * cx.skill),
    step: (j, cx, dw, k) => {
      const want = Math.floor(k * (j.d.steps || 0) + 1e-6);
      while (j.d.did < want) {
        if (!stepOne(j)) break;
        j.d.did++;
      }
    },
    finish: j => {
      let n = 0;
      while (stepOne(j) && n < 40) n++;
      const L = (j.d.list || []).map(i => GPLAN.state.items[i]).filter(it => it && it.st === 'gepflanzt');
      return { text: L.length + ' gepflanzt: ' + L.map(it => nameOf(GPLAN.data.db.byId.get(it.id))).join(', ') };
    },
  });
  // one planting step at the first unfinished item of the job; the container goes to the hole first (carried from the gate)
  function stepOne(j) {
    for (const i of j.d.list || []) {
      const it = GPLAN.state.items[i];
      if (!it || it.st === 'gepflanzt') continue;
      const p = GPLAN.data.db.byId.get(it.id);
      if (!p) continue;
      const L = M.plantSteps(p),
        k = L[it.sch || 0];
      if (!k) continue;
      if (k === 'pflanzen' && !GPLAN.frei) {
        const c = arrived(it);
        if (!c) return false;
        c.loc = 'boden';
        c.x = it.x + 0.7;
        c.y = it.y;
      }
      return GPGAME.apply({ i, it, p, kind: 'step', k });
    }
    return false;
  }
  // care at the planted plants: what careOf names (water, prune, harvest) – the same as by hand
  function careJob(id, kind, o) {
    STRAT.job.define(
      Object.assign(
        {
          id,
          place: garden,
          people: [1, 2],
          skill: 'garten',
          min: 1,
          heavy: 0.4,
          show: () => ready() && planted().some(x => M.careOf(x.it, x.p, gday()).includes(kind)),
          can: () =>
            planted().some(x => M.careOf(x.it, x.p, gday()).includes(kind))
              ? null
              : { no: true, text: 'Gerade ist hier nichts zu tun.', why: '', src: '' },
          init: j => {
            j.d.list = planted()
              .filter(x => M.careOf(x.it, x.p, gday()).includes(kind))
              .map(x => x.i);
          },
          // Ronald's know-how (the old varieties, decades of pruning): faster with him
          speed: (j, cx) => (cx.who.includes('ronald') && (kind === 'schneiden' || kind === 'ernten') ? 1.25 : 1),
          dur: (j, cx) =>
            ((j.d.list || []).length * (o.per || 12)) / Math.max(1, j.who.length * 0.85) / (0.7 + 0.1 * cx.skill),
          spot: j => {
            const it = GPLAN.state.items[(j.d.list || [])[0]];
            return it ? [it.x + 0.8, it.y] : centre();
          },
          finish: j => {
            let n = 0,
              kg = 0;
            for (const i of j.d.list || []) {
              const it = GPLAN.state.items[i],
                p = it && GPLAN.data.db.byId.get(it.id);
              if (!p || !M.careOf(it, p, gday()).includes(kind)) continue;
              if (kind === 'ernten') kg += M.harvestKg(p, (gday() - it.pd) / M.DAY_YEAR, M.seedOf(it));
              if (GPGAME.apply({ i, it, p, kind: 'care', k: kind })) n++;
            }
            return { text: o.done(n, kg) };
          },
        },
        o.def
      )
    );
  }
  careJob('g_giessen', 'giessen', {
    per: 10,
    def: {
      label: 'Junge Bäume gießen',
      pose: 'carry',
      order: 4,
      text: 'Mit der Gießkanne vom Bach: 20–30 Liter je jungem Baum.',
      learn: G.learn.giessen + ' Quelle: ' + G.learn.giessenSrc,
    },
    done: n => n + ' Bäume gegossen',
  });
  careJob('g_schneiden', 'schneiden', {
    per: 25,
    def: {
      label: 'Obstbäume schneiden (Spätwinter)',
      pose: 'pick',
      order: 6,
      skill: 'garten',
      min: 2,
      text: 'Erziehungsschnitt: Mitte und Leitäste, Konkurrenztriebe weg.',
      learn: G.learn.schneiden + ' Quelle: ' + G.learn.schneidenSrc + '. ' + G.learn.ronald,
    },
    done: n => n + ' Bäume geschnitten',
  });
  careJob('g_ernten', 'ernten', {
    per: 30,
    def: {
      label: 'Ernten',
      pose: 'pick',
      order: 7,
      text: 'Pflücken, in Kisten legen, ins kühle Lager.',
      learn: G.learn.ernten + ' Quelle: ' + G.learn.erntenSrc,
    },
    done: (n, kg) => `${n} Bäume abgeerntet, ${de(kg, 1)} kg`,
  });
  // protection: a wire sleeve or a tree guard round every young tree, a white coat on the trunk
  STRAT.job.define({
    id: 'g_schutz',
    label: 'Verbiss- und Stammschutz anbringen',
    place: garden,
    people: [1, 2],
    skill: 'garten',
    min: 1,
    heavy: 0.3,
    order: 5,
    pose: 'place',
    text: 'Drahthose 1,5 m um den Stamm, an drei Pfählen gespannt; Weißanstrich gegen Frostrisse.',
    learn: G.learn.schutz + ' Quelle: ' + G.learn.schutzSrc,
    show: () => ready() && planted().some(x => isTree(x.p) && young(x) && !guarded(x)),
    can: () =>
      planted().some(x => isTree(x.p) && young(x) && !guarded(x))
        ? null
        : { no: true, text: 'Alle jungen Bäume sind geschützt.', why: '', src: '' },
    init: j => {
      j.d.list = planted()
        .filter(x => isTree(x.p) && young(x) && !guarded(x))
        .map(x => x.i);
    },
    dur: (j, cx) => ((j.d.list || []).length * 20) / Math.max(1, j.who.length * 0.85) / (0.7 + 0.1 * cx.skill),
    spot: j => {
      const it = GPLAN.state.items[(j.d.list || [])[0]];
      return it ? [it.x + 0.8, it.y] : centre();
    },
    finish: () => {
      const g = st(),
        t = T();
      let n = 0;
      for (const x of planted()) {
        if (!isTree(x.p) || !young(x) || guarded(x)) continue;
        const k = keyOf(x.it);
        g.schutz[k] = gday();
        if (t)
          try {
            t.schutz.add({ id: 'st-' + k, kind: 'huelle', x: x.it.x, y: x.it.y, r: 0.3 });
          } catch (e) {}
        n++;
      }
      STRAT.style(1, 'Junge Bäume vor Verbiss geschützt');
      return { text: n + ' junge Bäume geschützt' };
    },
  });
  // the harvest out of the stock: gifts to the neighbours (favours, your style), the market in Schleusingen (Euro)
  STRAT.job.define({
    id: 'g_schenken',
    label: 'Obst verschenken (Hubert und Ronald)',
    place: garden,
    spot: here,
    people: [1, 1],
    skill: 'reden',
    min: 1,
    heavy: 0.05,
    order: 8,
    text: 'Je ein Korb (gut 3 kg) für Hubert und Ronald.',
    learn: G.learn.schenken,
    show: () => obstKg() >= 2,
    dur: 40,
    can: () => (obstKg() >= 2 ? null : { no: true, text: 'Zu wenig Obst im Vorrat.', why: '', src: '' }),
    finish: () => {
      const g = st(),
        kg = takeObst(Math.min(6.5, obstKg()));
      g.given = +(g.given + kg).toFixed(1);
      STRAT.favour('hubert', 1, 'ein Korb Obst');
      STRAT.favour('ronald', 1, 'ein Korb Obst');
      STRAT.style(1, 'Obst an die Nachbarn verschenkt');
      return { text: de(kg, 1) + ' kg verschenkt – Hubert und Ronald freuen sich' };
    },
  });
  STRAT.job.define({
    id: 'g_einkochen',
    label: 'Obst einkochen (Apfelmus, Kompott)',
    place: 'bungalow',
    people: [1, 2],
    skill: 'garten',
    min: 1,
    heavy: 0.15,
    order: 30,
    pose: 'bench',
    text: 'Schälen, kochen, heiß in Gläser, einkochen – für die Wochenenden im Winter.',
    learn: G.learn.einkochen + ' Quelle: ' + G.learn.einkochenSrc,
    show: () => obstKg() >= 3,
    dur: 90,
    can: () => (obstKg() >= 3 ? null : { no: true, text: 'Zu wenig Obst zum Einkochen.', why: '', src: '' }),
    finish: () => {
      const kg = takeObst(Math.min(8, obstKg())),
        n = Math.round(kg * 2);
      S.essen = (S.essen || 0) + n;
      STRAT.book(-Math.round(kg) * 0.6, 'Gläser, Deckel, Zucker', 'garten');
      return { text: `${de(kg, 1)} kg eingekocht – ${n} Mahlzeiten im Vorrat` };
    },
  });
  STRAT.job.define({
    id: 'g_markt',
    label: 'Obst auf dem Markt verkaufen',
    place: 'schleusingen',
    people: [1, 2],
    skill: 'reden',
    min: 2,
    heavy: 0.2,
    order: 20,
    hours: [7 * 60, 14 * 60],
    text: 'Stand auf dem Wochenmarkt: Kisten, Waage, Preisschild.',
    learn: G.learn.verkaufen + ' Quelle: ' + G.learn.verkaufenSrc,
    show: () => obstKg() >= 5,
    dur: 240,
    can: cx =>
      obstKg() < 5
        ? { no: true, text: 'Für einen Stand lohnt es erst ab etwa 5 kg.', why: '', src: '' }
        : cx.day.wd === 0 || cx.day.hol
          ? { no: true, text: 'Sonn- und feiertags ist kein Markt.', why: '', src: 'Thüringer Feiertagsgesetz' }
          : null,
    finish: j => {
      const g = st(),
        kg = takeObst(Math.max(0, obstKg() - 1)),
        deal = j.who.some(id => STRAT.ability.buff(id, 'handel')) ? 1.1 : 1,
        eur = kg * G.kg.eur * deal - G.stand.eur;
      g.sold = +(g.sold + kg).toFixed(1);
      g.eur = +(g.eur + eur).toFixed(2);
      STRAT.book(eur, `Markt Schleusingen: ${de(kg, 1)} kg Obst (Standgebühr abgezogen)`, 'verkauf');
      return { text: `${de(kg, 1)} kg verkauft, ${STRAT.C.eur(eur)}` };
    },
  });
  // ---------------- chickens (feat/tiere: TIERE.huehner – a coop and a flock where someone decides to keep them) ----------------
  // a future to try: five hens in a small coop on the meadow; they need food, water and a shut pop hole every day – on weekdays Ronald
  // looks after them (a favour), the eggs go into the meals; without an automatic pop hole the fox takes one now and then
  const COOP = [-4.5, -3.2];
  const HUHN = {
    stall: { eur: 450, src: 'Annahme: kleiner Hühnerstall auf Stelzen 2026 um 300–600 €' },
    henne: { eur: 18, src: 'Annahme: Legehenne (Junghenne) um 15–20 €' },
    klappe: { eur: 120, src: 'Annahme: automatische Hühnerklappe mit Lichtsensor um 100–150 €' },
    learn:
      'Hühner brauchen jeden Tag Futter, frisches Wasser und abends eine geschlossene Klappe – der Fuchs kommt in der Dämmerung. Eine Henne legt im Frühjahr und Sommer fast täglich, im Winter (kurze Tage) wenig. Wer Hühner hält, meldet sie dem Veterinäramt und der Tierseuchenkasse – auch zwei, drei im Garten.',
    src: 'Viehverkehrsverordnung (Meldung der Geflügelhaltung beim Veterinäramt); Thüringer Tierseuchenkasse; feat/tiere (Legeleistung nach Tageslänge)',
  };
  const coop = () => {
    const t = T();
    try {
      return t && window.TEINFLUSS && window.TEINFLUSS.E ? window.TEINFLUSS.E.huehner : null;
    } catch (e) {
      return null;
    }
  };
  STRAT.job.define({
    id: 'g_huehner',
    label: 'Hühner halten: ein Stall und fünf Hennen',
    place: garden,
    people: [1, 2],
    skill: 'garten',
    min: 2,
    heavy: 0.5,
    order: 9,
    pose: 'place',
    text: 'Den Stall auf die Wiese stellen, einzäunen, fünf Junghennen holen. Unter der Woche versorgt sie Ronald (ein Gefallen).',
    learn: HUHN.learn + ' Quelle: ' + HUHN.src,
    show: () => !!T() && typeof T().huehner === 'function' && !coop(),
    dur: 240,
    can: () =>
      STRAT.S.eur < HUHN.stall.eur + 5 * HUHN.henne.eur
        ? { no: true, text: 'Nicht genug Geld für Stall und Hennen.', why: HUHN.stall.src, src: '' }
        : null,
    finish: () => {
      const t = T();
      if (!t) return { text: 'ohne das Tier-Modul keine Hühner' };
      t.huehner({ x: COOP[0], y: COOP[1], n: 5, zu: false });
      STRAT.book(-(HUHN.stall.eur + 5 * HUHN.henne.eur), 'Hühnerstall und fünf Junghennen', 'garten');
      STRAT.favour('ronald', -1, 'die Hühner unter der Woche');
      st().huehner = { t: Math.round(STRAT.S.t || 0), auto: false };
      return { text: 'fünf Hennen im Stall auf der Wiese' };
    },
  });
  STRAT.job.define({
    id: 'g_klappe',
    label: 'Automatische Hühnerklappe einbauen',
    place: garden,
    people: [1, 1],
    skill: 'maschinen',
    min: 2,
    heavy: 0.1,
    order: 10,
    text: 'Eine Klappe mit Lichtsensor: sie öffnet bei Tagesanbruch und schließt in der Dämmerung.',
    learn:
      'Füchse holen Hühner in der Dämmerung und nachts – eine Klappe, die sich mit dem Licht schließt, hält sie fern, auch wenn niemand da ist. Quelle: feat/tiere (der Fuchs an offenen Ställen); ' +
      HUHN.klappe.src,
    show: () => !!coop() && !(st().huehner && st().huehner.auto),
    dur: 60,
    can: () => (STRAT.S.eur < HUHN.klappe.eur ? { no: true, text: 'Nicht genug Geld.', why: '', src: '' } : null),
    finish: () => {
      const c = coop(),
        t = T();
      if (c && t) t.huehner({ x: c.x, y: c.y, n: c.n, zu: true });
      STRAT.book(-HUHN.klappe.eur, 'Automatische Hühnerklappe', 'garten');
      const h = (st().huehner = st().huehner || {});
      h.auto = true;
      STRAT.style(1, 'Die Hühner nachts sicher vor dem Fuchs');
      return { text: 'die Klappe schließt jetzt von selbst' };
    },
  });
  STRAT.job.define({
    id: 'g_eier',
    label: 'Eier einsammeln',
    place: garden,
    spot: () => (coop() ? [coop().x - 0.6, coop().y] : COOP),
    people: [1, 1],
    skill: 'garten',
    min: 1,
    heavy: 0.05,
    order: 11,
    text: 'Die Nester leeren – zwei Eier sind etwa eine Mahlzeit.',
    learn: HUHN.learn + ' Quelle: ' + HUHN.src,
    show: () => !!coop() && (coop().eier || 0) >= 1,
    dur: 15,
    finish: () => {
      const c = coop();
      if (!c || !(c.eier >= 1)) return { text: 'keine Eier im Nest' };
      const n = Math.floor(c.eier);
      c.eier -= n;
      try {
        window.TEINFLUSS.save && window.TEINFLUSS.save();
      } catch (e) {}
      KERN.emit('tiere:eier', { n });
      S.essen = (S.essen || 0) + Math.floor(n / 2);
      return { text: `${n} Eier – ${Math.floor(n / 2)} Mahlzeiten im Vorrat` };
    },
  });
  // ---------------- a layer: the young trees from above – thirsty, ripe, unprotected, browsed ----------------
  STRAT.layer.define({
    id: 'garten',
    label: 'Garten',
    text: 'Die Bäume des Gartenplaners: durstig, reif, ohne Schutz, verbissen',
    order: 10,
    draw: pr => {
      if (!ready()) return '';
      let h = '';
      const gd = gday();
      for (const x of all().slice(0, 40)) {
        const q = pr(x.it.x, x.it.y, 1.2);
        if (!(q[2] < 1)) continue;
        let t;
        if (x.it.st !== 'gepflanzt') t = arrived(x.it) ? '📦' : '◌';
        else {
          const c = M.careOf(x.it, x.p, gd);
          t = c.includes('ernten')
            ? '🍎'
            : c.includes('giessen')
              ? '💧'
              : dmgOf(x.it) >= 0.3
                ? '✂'
                : isTree(x.p) && young(x) && !guarded(x)
                  ? '!'
                  : '🌳';
        }
        h += `<text class="wx" x="${q[0].toFixed(1)}" y="${q[1].toFixed(1)}" text-anchor="middle">${t}</text>`;
      }
      return h;
    },
  });
  // the data load when the mode starts (the planner fetches its files on first need – never at the game's start)
  KERN.on('strategie:modus', e => {
    if (e && e.on && (GPLAN.state.items.length || STRAT.place.get('obstgarten'))) ensureData();
  });
  STRAT.onLoad.push(() => st());
  const api = {
    st,
    all,
    planted,
    planned,
    toBuy,
    plantable,
    obstKg,
    takeObst,
    guarded,
    keyOf,
    ensureData,
    priceOf,
    stepOne,
  };
  void D;
  void CLOCK;
  return api;
})();
window.STGARTEN = STGARTEN;
