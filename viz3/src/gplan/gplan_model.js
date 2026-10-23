// ===================== garden planner 1: the model – growth, seasons, the plan, guilds, lists (GPMODEL) =====================
// Pure logic on plain objects (no three.js, no DOM, no window – tested in node: viz3/test/unit/gplan_model.test.mjs). The plant data
// follow the contract of gplan/gplan_schema.js (pflanzen.json, regeln.json, gilden.json). Sizes in metres, ages in years since planting,
// months 1–12. Everything is deterministic: the same plant, seed and age give the same size.
export const GPMODEL = (() => {
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const isNum = v => typeof v === 'number' && Number.isFinite(v);
  const own = (o, k) => typeof k === 'string' && Object.prototype.hasOwnProperty.call(o, k);
  // months: a range may wrap the year ([10, 4] = October to April)
  const inMonths = (m, r) => !!r && (r[0] <= r[1] ? m >= r[0] && m <= r[1] : m >= r[0] || m <= r[1]);
  const MONTHS = [
    'Januar',
    'Februar',
    'März',
    'April',
    'Mai',
    'Juni',
    'Juli',
    'August',
    'September',
    'Oktober',
    'November',
    'Dezember',
  ];
  const monthName = m => MONTHS[(((Math.round(m) - 1) % 12) + 12) % 12];
  const monthRange = r => (r ? (r[0] === r[1] ? monthName(r[0]) : monthName(r[0]) + '–' + monthName(r[1])) : '');
  // a small hash of a number or text → [0, 1) (FNV-1a, then one mulberry32 step)
  function hash01(v) {
    let h = 2166136261;
    const s = String(v);
    for (let i = 0; i < s.length; i++) {
      h ^= s.charCodeAt(i);
      h = Math.imul(h, 16777619);
    }
    let t = (h + 0x6d2b79f5) | 0;
    t = Math.imul(t ^ (t >>> 15), 1 | t);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }
  const de = (v, d = 1) => (+v).toFixed(d).replace('.', ',');
  // ---------------- the database: plants by id, legal categories, facts, guilds ----------------
  function index(data) {
    const d = data || {};
    const arten = d.pflanzen && Array.isArray(d.pflanzen.arten) ? d.pflanzen.arten : [];
    const byId = new Map(arten.map(p => [p.id, p]));
    const legal = new Map(
      (d.regeln && Array.isArray(d.regeln.grenzabstand) ? d.regeln.grenzabstand : []).map(g => [g.id, g])
    );
    const facts = d.regeln && Array.isArray(d.regeln.fakten) ? d.regeln.fakten : [];
    const guilds = d.gilden && Array.isArray(d.gilden.gilden) ? d.gilden.gilden : [];
    return {
      list: arten,
      byId,
      legal,
      facts,
      guilds,
      messung: (d.regeln && d.regeln.messung) || '',
      stand: (d.pflanzen && d.pflanzen.stand) || '',
    };
  }
  // ---------------- growth ----------------
  const TREE = new Set(['baum', 'kleinbaum']);
  const isTree = p => !!p && TREE.has(p.schicht);
  // stem of the tree forms (m): the crown starts there once the tree is tall enough
  const STEM = { hochstamm: 1.8, halbstamm: 1.2, solitaer: 1.5, spindel: 0.5, busch: 0.6 };
  // final size: the middle of the ranges; a seed (e.g. the plan item) varies it within the middle half of the range
  function finalSize(p, seed) {
    const v = seed === undefined || seed === null ? 0.5 : 0.25 + 0.5 * hash01(seed);
    return {
      h: p.hoehe_m[0] + (p.hoehe_m[1] - p.hoehe_m[0]) * v,
      w: p.breite_m[0] + (p.breite_m[1] - p.breite_m[0]) * v,
    };
  }
  // share of the way from planting size to final size after 'age' years: fast at first, saturating at jahre_bis_endgroesse
  // (1 − (1 − t)²: half of the way after 30 % of the time, 89 % after two thirds)
  function growth(p, age) {
    const T = Math.max(0.5, p.jahre_bis_endgroesse || 1);
    const t = clamp((isNum(age) ? age : 0) / T, 0, 1);
    return 1 - (1 - t) * (1 - t);
  }
  // size at an age: height h, crown width w (m)
  function sizeAt(p, age, seed) {
    const F = finalSize(p, seed),
      h0 = Math.min(p.pflanzhoehe_m, F.h);
    // width at planting: a young tree is a whip with a few side shoots, a pot of a shrub or perennial about as wide as tall
    const w0 = Math.min(F.w, isTree(p) ? Math.max(0.25, h0 * 0.3) : Math.max(0.1, h0 * 0.8));
    const f = growth(p, age);
    return { h: h0 + (F.h - h0) * f, w: w0 + (F.w - w0) * f, f, H: F.h, W: F.w };
  }
  // crown as an ellipsoid over a trunk: base zb, centre zc, half height a, radius r; trunk radius tr (m) – for shade and 3D
  function crown(p, s) {
    const h = s.h,
      r = s.w / 2,
      k = (p.darstellung && p.darstellung.krone) || 'rund';
    let zb;
    if (isTree(p)) {
      const stem = STEM[p.form] !== undefined ? STEM[p.form] : p.schicht === 'baum' ? 1.6 : 0.8;
      zb = Math.min(stem, h * (k === 'schirm' ? 0.6 : 0.42));
      if (k === 'schirm') zb = Math.max(zb, h * 0.5);
      if (k === 'saeule') zb = Math.min(zb, h * 0.2);
    } else if (p.schicht === 'strauch') zb = h * 0.06;
    else zb = 0;
    const a = Math.max(0.02, (h - zb) / 2);
    const tr = isTree(p) ? clamp(0.015 + h * 0.012, 0.02, 0.3) : 0;
    return { zb, zc: zb + a, a, r: Math.max(0.03, r), h, tr };
  }
  // ---------------- season ----------------
  // leaves by month: 'kahl' (bare), 'austrieb' (budding), 'voll' (full), 'herbst' (autumn colour); k = how much foliage (0–1).
  // The valley at Ratscher is late: budding in April, autumn colour in October, bare from November.
  function leaves(p, m) {
    const laub = p.laub;
    if (laub === 'immergruen') return { leaf: 'voll', k: 1 };
    if (laub === 'wintergruen') return { leaf: m === 1 || m === 2 ? 'herbst' : 'voll', k: 1 };
    if (laub === 'einziehend') {
      if (m <= 3 || m >= 12) return { leaf: 'kahl', k: 0 };
      if (m === 4) return { leaf: 'austrieb', k: 0.45 };
      if (m === 11) return { leaf: 'herbst', k: 0.35 };
      if (m === 10) return { leaf: 'herbst', k: 0.75 };
      return { leaf: 'voll', k: 1 };
    }
    if (m <= 3 || m === 12) return { leaf: 'kahl', k: 0 };
    if (m === 4) return { leaf: 'austrieb', k: 0.5 };
    if (m === 10) return { leaf: 'herbst', k: 0.9 };
    if (m === 11) return { leaf: 'kahl', k: 0.15 };
    return { leaf: 'voll', k: 1 };
  }
  function season(p, month) {
    const m = clamp(Math.round(month) || 6, 1, 12);
    const L = leaves(p, m);
    return {
      month: m,
      leaf: L.leaf,
      k: L.k,
      bloom: !!(p.bluete && inMonths(m, p.bluete.monate)),
      fruit: !!(p.ernte && inMonths(m, p.ernte.monate)),
    };
  }
  // colours for drawing (hex): foliage of the month, blossom and fruit when they show (null otherwise)
  const AUTUMN = '#c58a2e';
  function colours(p, month) {
    const s = season(p, month),
      d = p.darstellung || {};
    const leaf = s.leaf === 'herbst' ? d.herbst || AUTUMN : s.leaf === 'kahl' ? '#7a6a55' : d.laub || '#5f8a3a';
    return {
      leaf,
      bloom: s.bloom ? d.bluete || (p.bluete && p.bluete.farbe) || '#f4efe6' : null,
      fruit: s.fruit && d.frucht ? d.frucht : null,
      s,
    };
  }
  // ---------------- the plan: { v: 1, items: [{ id, x, y, jahr }], show, age, month, hour } ----------------
  const AGES = [0, 5, 10, 20];
  const ITEMS_MAX = 600;
  // a stored plan (any shape) → a clean plan; broken items are dropped one by one (known: a set of plant ids – unknown ids are kept
  // when it is missing, so a plan survives a data file that is still loading)
  function sanitize(st, known, year) {
    const out = { v: 1, items: [], show: true, age: 0, month: 6, hour: 14 };
    if (!st || typeof st !== 'object' || Array.isArray(st)) return out;
    if (typeof st.show === 'boolean') out.show = st.show;
    if (AGES.includes(st.age)) out.age = st.age;
    if (Number.isInteger(st.month) && st.month >= 1 && st.month <= 12) out.month = st.month;
    if (isNum(st.hour) && st.hour >= 0 && st.hour <= 24) out.hour = st.hour;
    const y0 = isNum(year) ? year : 2026;
    if (Array.isArray(st.items))
      for (const it of st.items.slice(0, ITEMS_MAX)) {
        if (!it || typeof it !== 'object' || typeof it.id !== 'string' || !/^[a-z0-9-]{1,80}$/.test(it.id)) continue;
        if (!isNum(it.x) || !isNum(it.y) || Math.abs(it.x) > 500 || Math.abs(it.y) > 500) continue;
        if (known && !known.has(it.id)) continue;
        const jahr = Number.isInteger(it.jahr) && it.jahr >= 1990 && it.jahr <= 2200 ? it.jahr : y0;
        out.items.push({ id: it.id, x: Math.round(it.x * 100) / 100, y: Math.round(it.y * 100) / 100, jahr });
      }
    return out;
  }
  // age of a plan item in the view year (null: not planted yet)
  const ageOf = (it, viewYear) => (viewYear < it.jahr ? null : viewYear - it.jahr);
  // a stable seed per item (position and plant – moving it a little keeps its look, a new one gets its own)
  const seedOf = it => it.id + '@' + Math.round(it.x * 2) + ',' + Math.round(it.y * 2);
  // ---------------- guilds: the middle tree at (cx, cy), the partners on rings around it ----------------
  // radius = radius_rel × crown radius of the middle tree when grown; seite null: spread all round, else an arc of ±60° on that side
  const SIDE_AZ = { nord: 0, ost: 90, sued: 180, west: 270 };
  function guildPlace(g, db, cx, cy) {
    const mid = db.byId.get(g.mitte);
    if (!mid) return [];
    const R = finalSize(mid).w / 2;
    const out = [{ id: mid.id, x: cx, y: cy, ring: -1 }];
    (g.ringe || []).forEach((ring, j) => {
      const list = [];
      for (const e of ring.pflanzen || []) for (let k = 0; k < (e.anzahl || 1); k++) list.push(e.id);
      const n = list.length,
        r = Math.max(0.3, ring.radius_rel * R);
      list.forEach((id, k) => {
        let az;
        if (ring.seite && own(SIDE_AZ, ring.seite)) {
          const span = n > 1 ? Math.min(120, (n - 1) * 40) : 0;
          az = SIDE_AZ[ring.seite] - span / 2 + (n > 1 ? (span * k) / (n - 1) : 0);
        } else az = (360 * k) / Math.max(1, n) + j * 23 + 15;
        const a = (az * Math.PI) / 180;
        out.push({
          id,
          x: Math.round((cx + Math.sin(a) * r) * 100) / 100,
          y: Math.round((cy + Math.cos(a) * r) * 100) / 100,
          ring: j,
        });
      });
    });
    return out;
  }
  // ---------------- lists: what is planned (Pflanzliste) and what to buy (Einkaufsliste) ----------------
  const LAYER = {
    baum: 'Bäume',
    kleinbaum: 'Kleinbäume',
    strauch: 'Sträucher',
    kraut: 'Kräuter und Stauden',
    boden: 'Bodendecker',
    wurzel: 'Wurzel- und Knollenpflanzen',
    kletter: 'Kletterpflanzen',
  };
  const LAYERS = Object.keys(LAYER);
  const FORM = {
    busch: 'Busch',
    spindel: 'Spindel',
    halbstamm: 'Halbstamm',
    hochstamm: 'Hochstamm',
    solitaer: 'Solitär',
    strauch: 'Strauch',
    staude: 'Staude',
    kletter: 'Kletterpflanze',
    bodendecker: 'Bodendecker',
    zwiebel: 'Zwiebel',
    einjaehrig: 'einjährig',
  };
  const SCHUTZ = {
    wuehlmauskorb: 'Wühlmauskorb (Drahtkorb um den Wurzelballen)',
    verbissschutz: 'Verbissschutz (Ziegen, Rehe, Hasen)',
    pfahl: 'Baumpfahl mit Anbindeband',
    stammschutz: 'Stammschutz (Weißanstrich oder Manschette)',
    frostschutz: 'Frostschutzvlies für späte Fröste',
  };
  const fullName = p => p.name + (p.sorte ? ' ‚' + p.sorte + '‘' : '');
  const dateDe = s =>
    /^\d{4}-\d{2}-\d{2}$/.test(s || '') ? s.slice(8, 10) + '.' + s.slice(5, 7) + '.' + s.slice(0, 4) : s || '';
  function kammbach(p) {
    const b = p.bezug || {},
      st = b.stand ? ' (Stand ' + dateDe(b.stand) + ')' : '';
    const t =
      b.kammbach === 'kategorie'
        ? 'Art im Sortiment, Sorte und Form anfragen'
        : b.kammbach === 'nein'
          ? 'nicht im Sortiment – anderswo besorgen'
          : 'unbekannt – nachfragen';
    return 'bei Kammbach: ' + t + st + (b.hinweis ? ' – ' + b.hinweis : '');
  }
  // items grouped by plant: [{ p, n, items }] in the order of the layers, then by name
  function groups(items, db) {
    const by = new Map();
    for (const it of items) {
      const p = db.byId.get(it.id);
      if (!p) continue;
      if (!by.has(p.id)) by.set(p.id, { p, n: 0, items: [] });
      const g = by.get(p.id);
      g.n++;
      g.items.push(it);
    }
    return [...by.values()].sort(
      (a, b) =>
        LAYERS.indexOf(a.p.schicht) - LAYERS.indexOf(b.p.schicht) || fullName(a.p).localeCompare(fullName(b.p), 'de')
    );
  }
  // opts: { date: 'TT.MM.JJJJ', where(it) → text about the spot, test: true when the data are test data }
  function plantList(items, db, opts = {}) {
    const G = groups(items, db);
    const L = ['Pflanzplan Garten Ratscher' + (opts.date ? ' – ' + opts.date : '')];
    if (opts.test) L.push('ACHTUNG: Testdaten – keine echten Pflanzenwerte.');
    L.push('Lage in Metern: x nach Osten, y nach Norden (Ursprung: Südwestecke der Bodenplatte).');
    if (!G.length) {
      L.push('', 'Noch nichts geplant.');
      return L.join('\n');
    }
    for (const layer of LAYERS) {
      const gs = G.filter(g => g.p.schicht === layer);
      if (!gs.length) continue;
      L.push('', LAYER[layer] + ' (' + gs.reduce((s, g) => s + g.n, 0) + ')');
      for (const g of gs) {
        const p = g.p,
          F = finalSize(p);
        L.push(
          '- ' +
            g.n +
            ' × ' +
            fullName(p) +
            (p.form ? ', ' + FORM[p.form] : '') +
            (p.unterlage ? ', Unterlage ' + p.unterlage : '') +
            ' – ausgewachsen etwa ' +
            de(F.h) +
            ' m hoch, ' +
            de(F.w) +
            ' m breit'
        );
        for (const it of g.items)
          L.push(
            '    bei x ' +
              de(it.x) +
              ' / y ' +
              de(it.y) +
              ' m, Pflanzjahr ' +
              it.jahr +
              (opts.where ? opts.where(it) : '')
          );
      }
    }
    return L.join('\n');
  }
  function shopList(items, db, opts = {}) {
    const G = groups(items, db);
    const L = [
      'Einkaufsliste für die Baumschule Kammbach, Kloster Veßra' + (opts.date ? ' – Stand ' + opts.date : ''),
      'Garten Ratscher (Auenlehm, Tallage mit Spätfrost; Bodenwerte geschätzt)',
    ];
    if (opts.test) L.push('ACHTUNG: Testdaten – keine echten Pflanzenwerte.');
    if (!G.length) {
      L.push('', 'Noch nichts geplant.');
      return L.join('\n');
    }
    for (const layer of LAYERS) {
      const gs = G.filter(g => g.p.schicht === layer);
      if (!gs.length) continue;
      L.push('', LAYER[layer]);
      for (const g of gs) {
        const p = g.p;
        L.push(
          '- ' +
            g.n +
            ' × ' +
            fullName(p) +
            (p.form ? ' – ' + FORM[p.form] : '') +
            (p.unterlage ? ', Unterlage ' + p.unterlage : '') +
            ' – ' +
            kammbach(p) +
            ' – pflanzen ' +
            monthRange(p.pflanzzeit)
        );
      }
    }
    const acc = new Map();
    for (const g of G)
      for (const s of g.p.schutz || []) {
        if (!acc.has(s)) acc.set(s, { n: 0, for: [] });
        const a = acc.get(s);
        a.n += g.n;
        a.for.push(g.p.name);
      }
    if (acc.size) {
      L.push('', 'Zubehör zum Pflanzen');
      for (const [s, a] of acc)
        L.push('- ' + a.n + ' × ' + (SCHUTZ[s] || s) + ' – für ' + [...new Set(a.for)].join(', '));
    }
    return L.join('\n');
  }
  return {
    clamp,
    inMonths,
    monthName,
    monthRange,
    hash01,
    de,
    index,
    isTree,
    finalSize,
    growth,
    sizeAt,
    crown,
    season,
    colours,
    AGES,
    sanitize,
    ageOf,
    seedOf,
    guildPlace,
    LAYER,
    LAYERS,
    FORM,
    SCHUTZ,
    fullName,
    dateDe,
    kammbach,
    groups,
    plantList,
    shopList,
  };
})();
