// ---------------- garden planner: the plant data contract (pure – no three.js, no window, no DOM) ----------------
// The garden planner (gplan/*) reads three JSON files from dist/gartenplaner/:
//   pflanzen.json  species and cultivars for the forest garden on fresh loam in a valley (layer, size, growth, light, soil, frost,
//                  bloom, functions, pollination, neighbours, harvest, care, protection at planting, how to draw it, sources)
//   regeln.json    boundary distances of the Thuringian neighbour law (ThürNRG) by category, how they are measured, advisory facts
//   gilden.json    guild templates: a tree in the middle, rings of partners at a share of its crown radius
// This module states their fields and checks them. Keys are German like the UI. The unit tests run the checks on the real files.
// A change of this contract goes through the Kern-Chat – the planner and the plant database are built by different helper agents.

const E = {
  SCHICHT: ['baum', 'kleinbaum', 'strauch', 'kraut', 'boden', 'wurzel', 'kletter'],
  FORM: [
    'busch',
    'spindel',
    'halbstamm',
    'hochstamm',
    'solitaer',
    'strauch',
    'staude',
    'kletter',
    'bodendecker',
    'zwiebel',
    'einjaehrig',
  ],
  LICHT: ['sonne', 'halbschatten', 'schatten'],
  BODENART: ['sand', 'lehmsand', 'lehm', 'tonlehm', 'ton'],
  FEUCHTE: ['trocken', 'frisch', 'feucht', 'nass'],
  STAUNAESSE: ['nein', 'kurz', 'ja'],
  RISIKO: ['gering', 'mittel', 'hoch'],
  LAUB: ['sommergruen', 'immergruen', 'wintergruen', 'einziehend'],
  FUNKTION: [
    'ertrag',
    'stickstoff',
    'mulch',
    'insekten',
    'voegel',
    'abwehr',
    'bodendecker',
    'windschutz',
    'gewuerz',
    'heil',
    'zier',
  ],
  SELBST: ['ja', 'teilweise', 'nein'],
  SCHUTZ: ['wuehlmauskorb', 'verbissschutz', 'pfahl', 'stammschutz', 'frostschutz'],
  DARST: ['laubbaum', 'obstbaum', 'nadelbaum', 'strauch', 'staude', 'gras', 'kletter', 'bodendecker', 'zwiebel'],
  KRONE: ['rund', 'oval', 'breit', 'saeule', 'schirm', 'ueberhaengend', 'buschig', 'flach'],
  KAMMBACH: ['kategorie', 'nein', 'unbekannt'],
  SEITE: ['nord', 'ost', 'sued', 'west'],
};

// the fields of a plant: name -> required? (unknown keys are reported as warnings – they are usually typos)
const PLANT_KEYS = {
  id: 1,
  name: 1,
  art: 1,
  sorte: 0,
  unterlage: 0,
  form: 0,
  schicht: 1,
  hoehe_m: 1,
  breite_m: 1,
  pflanzhoehe_m: 1,
  jahre_bis_endgroesse: 1,
  lebensdauer_j: 1,
  licht: 1,
  boden: 1,
  frosthaerte_c: 1,
  bluete: 1,
  laub: 1,
  funktionen: 1,
  befruchtung: 0,
  unvertraeglich: 0,
  partner: 0,
  ernte: 0,
  pflanzzeit: 1,
  pflege: 1,
  schutz: 0,
  nachbarrecht: 1,
  bezug: 1,
  darstellung: 1,
  text: 1,
  quellen: 1,
  entwurf: 0,
};

const isObj = v => v !== null && typeof v === 'object' && !Array.isArray(v);
const isNum = v => typeof v === 'number' && isFinite(v);
const isStr = v => typeof v === 'string' && v.trim().length > 0;
const ID_RE = /^[a-z0-9]+(-[a-z0-9]+)*$/;
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const HEX_RE = /^#[0-9a-fA-F]{6}$/;
const URL_RE = /^https?:\/\/\S+$/;

function checker(where) {
  const errors = [],
    warnings = [];
  const C = {
    errors,
    warnings,
    err: (path, msg) => errors.push(where + ' ' + path + ': ' + msg),
    warn: (path, msg) => warnings.push(where + ' ' + path + ': ' + msg),
    num: (path, v, lo, hi) => {
      if (!isNum(v)) return C.err(path, 'Zahl erwartet');
      if (v < lo || v > hi) C.err(path, v + ' außerhalb ' + lo + '…' + hi);
    },
    str: (path, v) => isStr(v) || C.err(path, 'Text erwartet'),
    strOrNull: (path, v) => v === undefined || v === null || isStr(v) || C.err(path, 'Text oder null erwartet'),
    oneOf: (path, v, list) => list.includes(v) || C.err(path, JSON.stringify(v) + ' ist keiner von ' + list.join('|')),
    someOf: (path, v, list, nonEmpty) => {
      if (!Array.isArray(v)) return C.err(path, 'Liste erwartet');
      if (nonEmpty && !v.length) C.err(path, 'Liste ist leer');
      for (const x of v) if (!list.includes(x)) C.err(path, JSON.stringify(x) + ' ist keiner von ' + list.join('|'));
    },
    range: (path, v, lo, hi) => {
      if (!Array.isArray(v) || v.length !== 2 || !isNum(v[0]) || !isNum(v[1]))
        return C.err(path, '[von, bis] erwartet');
      if (v[0] > v[1]) C.err(path, 'von > bis');
      if (v[0] < lo || v[1] > hi) C.err(path, 'außerhalb ' + lo + '…' + hi);
    },
    // months 1–12; a range may wrap the year ([10, 4] = October to April)
    months: (path, v) => {
      if (!Array.isArray(v) || v.length !== 2 || !v.every(m => Number.isInteger(m) && m >= 1 && m <= 12))
        C.err(path, '[Monat von, Monat bis] mit 1–12 erwartet');
    },
    hex: (path, v, orNull) =>
      (orNull && v === null) || (typeof v === 'string' && HEX_RE.test(v)) || C.err(path, 'Farbe #rrggbb erwartet'),
    date: (path, v) => (typeof v === 'string' && DATE_RE.test(v)) || C.err(path, 'Datum JJJJ-MM-TT erwartet'),
    // a file head: version 1, date, a map of sources { key: { titel, url, abgerufen, herausgeber?, lizenz? } }
    head: (f, ver) => {
      if (!isObj(f)) return C.err('', 'Objekt erwartet');
      if (f.version !== ver) C.err('version', 'erwartet ' + ver);
      C.date('stand', f.stand);
      if (!isObj(f.quellen)) return C.err('quellen', 'Objekt { Schlüssel: Quelle } erwartet');
      for (const [k, q] of Object.entries(f.quellen)) {
        const p = 'quellen.' + k;
        if (!isObj(q)) {
          C.err(p, 'Objekt erwartet');
          continue;
        }
        C.str(p + '.titel', q.titel);
        if (!(typeof q.url === 'string' && URL_RE.test(q.url))) C.err(p + '.url', 'Link http(s)://… erwartet');
        C.date(p + '.abgerufen', q.abgerufen);
        C.strOrNull(p + '.herausgeber', q.herausgeber);
        C.strOrNull(p + '.lizenz', q.lizenz);
      }
    },
    refs: (path, v, quellen, nonEmpty) => {
      if (!Array.isArray(v)) return C.err(path, 'Liste von Quellen-Schlüsseln erwartet');
      if (nonEmpty && !v.length) C.err(path, 'mindestens eine Quelle');
      for (const k of v) if (!quellen || !quellen[k]) C.err(path, 'unbekannte Quelle ' + JSON.stringify(k));
    },
  };
  return C;
}

// pflanzen.json: { version: 1, stand, quellen, arten: [plant] } – rules: the optional second argument (regeln.json) checks 'nachbarrecht'
function validatePlants(db, rules) {
  const C = checker('pflanzen.json');
  C.head(db, 1);
  if (!isObj(db) || !Array.isArray(db.arten)) {
    C.err('arten', 'Liste erwartet');
    return { errors: C.errors, warnings: C.warnings };
  }
  const ids = new Set(db.arten.map(p => p && p.id));
  const legal = rules && Array.isArray(rules.grenzabstand) ? new Set(rules.grenzabstand.map(g => g && g.id)) : null;
  const seen = new Set();
  db.arten.forEach((p, i) => {
    const at = 'arten[' + i + (p && p.id ? ' ' + p.id : '') + ']';
    if (!isObj(p)) return C.err(at, 'Objekt erwartet');
    for (const k of Object.keys(PLANT_KEYS)) if (PLANT_KEYS[k] && !(k in p)) C.err(at + '.' + k, 'fehlt');
    for (const k of Object.keys(p)) if (!(k in PLANT_KEYS)) C.warn(at + '.' + k, 'unbekanntes Feld');
    if (!(typeof p.id === 'string' && ID_RE.test(p.id))) C.err(at + '.id', 'kebab-case erwartet (a-z, 0-9, -)');
    if (seen.has(p.id)) C.err(at + '.id', 'doppelt');
    seen.add(p.id);
    C.str(at + '.name', p.name);
    C.str(at + '.art', p.art);
    C.strOrNull(at + '.sorte', p.sorte);
    C.strOrNull(at + '.unterlage', p.unterlage);
    if (p.form !== undefined && p.form !== null) C.oneOf(at + '.form', p.form, E.FORM);
    C.oneOf(at + '.schicht', p.schicht, E.SCHICHT);
    C.range(at + '.hoehe_m', p.hoehe_m, 0.02, 45);
    C.range(at + '.breite_m', p.breite_m, 0.02, 30);
    C.num(at + '.pflanzhoehe_m', p.pflanzhoehe_m, 0.01, 6);
    if (isNum(p.pflanzhoehe_m) && Array.isArray(p.hoehe_m) && p.pflanzhoehe_m > p.hoehe_m[1])
      C.err(at + '.pflanzhoehe_m', 'höher als die Endhöhe');
    C.num(at + '.jahre_bis_endgroesse', p.jahre_bis_endgroesse, 1, 80);
    C.num(at + '.lebensdauer_j', p.lebensdauer_j, 1, 600);
    C.someOf(at + '.licht', p.licht, E.LICHT, true);
    if (!isObj(p.boden)) C.err(at + '.boden', 'Objekt erwartet');
    else {
      C.someOf(at + '.boden.art', p.boden.art, E.BODENART, true);
      C.range(at + '.boden.ph', p.boden.ph, 3.5, 9);
      C.someOf(at + '.boden.feuchte', p.boden.feuchte, E.FEUCHTE, true);
      C.oneOf(at + '.boden.staunaesse', p.boden.staunaesse, E.STAUNAESSE);
    }
    C.num(at + '.frosthaerte_c', p.frosthaerte_c, -50, 5);
    if (p.bluete !== null) {
      if (!isObj(p.bluete)) C.err(at + '.bluete', 'Objekt oder null erwartet');
      else {
        C.months(at + '.bluete.monate', p.bluete.monate);
        C.oneOf(at + '.bluete.spaetfrost', p.bluete.spaetfrost, E.RISIKO);
        C.hex(at + '.bluete.farbe', p.bluete.farbe, true);
      }
    }
    C.oneOf(at + '.laub', p.laub, E.LAUB);
    C.someOf(at + '.funktionen', p.funktionen, E.FUNKTION, false);
    if (p.befruchtung !== undefined && p.befruchtung !== null) {
      const b = p.befruchtung;
      if (!isObj(b)) C.err(at + '.befruchtung', 'Objekt oder null erwartet');
      else {
        C.oneOf(at + '.befruchtung.selbstfruchtbar', b.selbstfruchtbar, E.SELBST);
        if (!Array.isArray(b.befruchter) || !b.befruchter.every(isStr))
          C.err(at + '.befruchtung.befruchter', 'Liste von Sorten (Text oder Pflanzen-id) erwartet');
        else if (b.selbstfruchtbar === 'nein' && !b.befruchter.length)
          C.err(at + '.befruchtung.befruchter', 'braucht Befruchter');
      }
    }
    // neighbours: 'mit' is a plant id, 'schicht:<layer>' or '*' (everything within radius_m, null = its crown)
    const nb = (key, needRadius) => {
      const v = p[key];
      if (v === undefined) return;
      if (!Array.isArray(v)) return C.err(at + '.' + key, 'Liste erwartet');
      v.forEach((n, j) => {
        const q = at + '.' + key + '[' + j + ']';
        if (!isObj(n)) return C.err(q, 'Objekt erwartet');
        const m = n.mit;
        const ok =
          (typeof m === 'string' && ids.has(m)) ||
          (needRadius && m === '*') ||
          (typeof m === 'string' && m.startsWith('schicht:') && E.SCHICHT.includes(m.slice(8)));
        if (!ok)
          C.err(
            q + '.mit',
            'Pflanzen-id' + (needRadius ? ", '*'" : '') + " oder 'schicht:…' erwartet, nicht " + JSON.stringify(m)
          );
        C.str(q + '.grund', n.grund);
        if (n.radius_m !== undefined && n.radius_m !== null) C.num(q + '.radius_m', n.radius_m, 0, 30);
      });
    };
    nb('unvertraeglich', true);
    nb('partner', false);
    if (p.ernte !== undefined && p.ernte !== null) {
      if (!isObj(p.ernte)) C.err(at + '.ernte', 'Objekt oder null erwartet');
      else {
        C.months(at + '.ernte.monate', p.ernte.monate);
        if (p.ernte.kg_jahr !== undefined && p.ernte.kg_jahr !== null)
          C.range(at + '.ernte.kg_jahr', p.ernte.kg_jahr, 0, 1000);
        C.strOrNull(at + '.ernte.text', p.ernte.text);
      }
    }
    C.months(at + '.pflanzzeit', p.pflanzzeit);
    C.str(at + '.pflege', p.pflege);
    if (p.schutz !== undefined) C.someOf(at + '.schutz', p.schutz, E.SCHUTZ, false);
    C.str(at + '.nachbarrecht', p.nachbarrecht);
    if (legal && isStr(p.nachbarrecht) && !legal.has(p.nachbarrecht))
      C.err(at + '.nachbarrecht', 'keine Kategorie in regeln.json: ' + p.nachbarrecht);
    if (!isObj(p.bezug)) C.err(at + '.bezug', 'Objekt erwartet');
    else {
      C.oneOf(at + '.bezug.kammbach', p.bezug.kammbach, E.KAMMBACH);
      C.date(at + '.bezug.stand', p.bezug.stand);
      C.strOrNull(at + '.bezug.hinweis', p.bezug.hinweis);
    }
    if (!isObj(p.darstellung)) C.err(at + '.darstellung', 'Objekt erwartet');
    else {
      const d = p.darstellung;
      C.oneOf(at + '.darstellung.typ', d.typ, E.DARST);
      C.oneOf(at + '.darstellung.krone', d.krone, E.KRONE);
      C.hex(at + '.darstellung.laub', d.laub, false);
      for (const k of ['bluete', 'frucht', 'herbst'])
        C.hex(at + '.darstellung.' + k, d[k] === undefined ? null : d[k], true);
    }
    if (!isStr(p.text) || p.text.length < 20 || p.text.length > 400) C.err(at + '.text', '20–400 Zeichen erwartet');
    C.refs(at + '.quellen', p.quellen, db.quellen, !p.entwurf);
    if (p.entwurf) C.warn(at, 'Entwurf (ohne Beleg)');
  });
  return { errors: C.errors, warnings: C.warnings };
}

// regeln.json: { version: 1, stand, quellen, messung, grenzabstand: [{ id, text, abstand_m, paragraf, quelle }], fakten: [{ id, text, quelle }] }
function validateRules(r) {
  const C = checker('regeln.json');
  C.head(r, 1);
  if (!isObj(r)) return { errors: C.errors, warnings: C.warnings };
  C.str('messung', r.messung);
  const list = (key, fn) => {
    if (!Array.isArray(r[key]) || !r[key].length) return C.err(key, 'nicht leere Liste erwartet');
    const seen = new Set();
    r[key].forEach((g, i) => {
      const at = key + '[' + i + (g && g.id ? ' ' + g.id : '') + ']';
      if (!isObj(g)) return C.err(at, 'Objekt erwartet');
      if (!(typeof g.id === 'string' && ID_RE.test(g.id))) C.err(at + '.id', 'kebab-case erwartet');
      if (seen.has(g.id)) C.err(at + '.id', 'doppelt');
      seen.add(g.id);
      C.str(at + '.text', g.text);
      if (!r.quellen || !r.quellen[g.quelle]) C.err(at + '.quelle', 'unbekannte Quelle ' + JSON.stringify(g.quelle));
      fn(g, at);
    });
  };
  list('grenzabstand', (g, at) => {
    C.num(at + '.abstand_m', g.abstand_m, 0, 12);
    C.str(at + '.paragraf', g.paragraf);
  });
  list('fakten', () => {});
  return { errors: C.errors, warnings: C.warnings };
}

// gilden.json: { version: 1, stand, quellen, gilden: [{ id, name, text, mitte, ringe: [{ radius_rel, seite, pflanzen: [{ id, anzahl }] }], quellen }] }
// radius_rel: share of the middle tree's crown radius when grown (1 = the drip line); seite: null all round, else one side of the tree
function validateGuilds(g, plants) {
  const C = checker('gilden.json');
  C.head(g, 1);
  if (!isObj(g) || !Array.isArray(g.gilden)) {
    C.err('gilden', 'Liste erwartet');
    return { errors: C.errors, warnings: C.warnings };
  }
  const P = new Map(plants && Array.isArray(plants.arten) ? plants.arten.map(p => [p.id, p]) : []);
  const seen = new Set();
  g.gilden.forEach((x, i) => {
    const at = 'gilden[' + i + (x && x.id ? ' ' + x.id : '') + ']';
    if (!isObj(x)) return C.err(at, 'Objekt erwartet');
    if (!(typeof x.id === 'string' && ID_RE.test(x.id))) C.err(at + '.id', 'kebab-case erwartet');
    if (seen.has(x.id)) C.err(at + '.id', 'doppelt');
    seen.add(x.id);
    C.str(at + '.name', x.name);
    C.str(at + '.text', x.text);
    if (plants) {
      const m = P.get(x.mitte);
      if (!m) C.err(at + '.mitte', 'unbekannte Pflanze ' + JSON.stringify(x.mitte));
      else if (!['baum', 'kleinbaum'].includes(m.schicht)) C.err(at + '.mitte', 'Baum oder Kleinbaum erwartet');
    } else C.str(at + '.mitte', x.mitte);
    if (!Array.isArray(x.ringe) || !x.ringe.length) C.err(at + '.ringe', 'nicht leere Liste erwartet');
    else
      x.ringe.forEach((r, j) => {
        const q = at + '.ringe[' + j + ']';
        if (!isObj(r)) return C.err(q, 'Objekt erwartet');
        C.num(q + '.radius_rel', r.radius_rel, 0, 2.5);
        if (r.seite !== null) C.oneOf(q + '.seite', r.seite, E.SEITE);
        if (!Array.isArray(r.pflanzen) || !r.pflanzen.length)
          return C.err(q + '.pflanzen', 'nicht leere Liste erwartet');
        r.pflanzen.forEach((e, k) => {
          const w = q + '.pflanzen[' + k + ']';
          if (!isObj(e)) return C.err(w, 'Objekt erwartet');
          if (plants && !P.has(e.id)) C.err(w + '.id', 'unbekannte Pflanze ' + JSON.stringify(e.id));
          if (!(Number.isInteger(e.anzahl) && e.anzahl >= 1 && e.anzahl <= 60))
            C.err(w + '.anzahl', 'ganze Zahl 1–60 erwartet');
        });
      });
    C.refs(at + '.quellen', x.quellen, g.quellen, true);
  });
  return { errors: C.errors, warnings: C.warnings };
}

// all three together (each file may be missing: null) – one list of errors and warnings
function validateAll({ pflanzen = null, regeln = null, gilden = null } = {}) {
  const out = { errors: [], warnings: [] };
  const add = r => {
    out.errors.push(...r.errors);
    out.warnings.push(...r.warnings);
  };
  if (regeln) add(validateRules(regeln));
  if (pflanzen) add(validatePlants(pflanzen, regeln));
  if (gilden) add(validateGuilds(gilden, pflanzen));
  return out;
}

export const GPSCHEMA = { ENUM: E, PLANT_KEYS, validatePlants, validateRules, validateGuilds, validateAll };
