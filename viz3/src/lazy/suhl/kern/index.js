// Suhl runtime: what data there are (docs/features/suhl-daten.md, tools/suhl/lib/suhllib.py).
//   <base>aktuell.json                      { schema, products: { <product>: { version, schema, path, index, based_on } } } – the valid
//                                           version of every product (fetched without the cache: the only file that changes)
//   <base><produkt>/v<N>/index.json         which tiles exist (ground: meta.json in the format of welt/welt.js), sources, attribution
//   <base><produkt>/v<N>/<L>/<x>/<y>.<ext>   the tiles (ground: t/<L>/<x>/<y>.bin and i/<L>/<x>/<y>.webp)
// Products read here: boden (terrain and aerial image, levels 6–12), g (building records), b (trees), s (streets) – level-10 tiles.
// A tile list may be written as { "x_y": n, … }, ["x_y", …], [[x, y], …] or as the bit field of suhllib.tileset_encode
// { x0, y0, w, h, n, bits } – per level under 'has' (the contract), 'tiles' or 'kacheln' (older indexes).
export const READ = ['boden', 'g', 'b', 's', 'm'];
export const SCHEMA = 1; // the schema this runtime reads; a product that asks for more is left out (and named in the status)
// (aktuell.json changes with every publication and GitHub Pages lets it be cached for ten minutes: asked for without the cache;
// the versioned folders never change)
const json = async (url, fresh) => {
  const r = await fetch(url, fresh ? { cache: 'no-cache' } : undefined);
  if (!r.ok) throw new Error('HTTP ' + r.status + ' ' + url);
  return r.json();
};
// a tile list of one level → has(x, y), n
export function tileSet(def) {
  if (!def) return null;
  if (def.bits !== undefined && def.w !== undefined) {
    const raw = atob(def.bits || ''),
      b = Uint8Array.from(raw, c => c.charCodeAt(0)),
      { x0, y0, w, h } = def;
    return {
      n: def.n || 0,
      has(x, y) {
        const i = x - x0,
          j = y - y0;
        if (i < 0 || j < 0 || i >= w || j >= h) return false;
        const k = j * w + i;
        return ((b[k >> 3] >> (k & 7)) & 1) === 1;
      },
      each(fn) {
        for (let k = 0; k < w * h; k++) if ((b[k >> 3] >> (k & 7)) & 1) fn(x0 + (k % w), y0 + Math.floor(k / w));
      },
    };
  }
  const S = new Set(),
    add = k => {
      const m = Array.isArray(k) ? k : String(k).split(/[_/,]/).map(Number);
      // "10/497/542" names its level too: the last two numbers count
      if (m.length >= 2 && m.slice(-2).every(Number.isFinite)) S.add(m[m.length - 2] + '/' + m[m.length - 1]);
    };
  if (Array.isArray(def)) def.forEach(add);
  else if (typeof def === 'object') Object.keys(def).forEach(add);
  return {
    n: S.size,
    has: (x, y) => S.has(x + '/' + y),
    each(fn) {
      for (const k of S) {
        const [x, y] = k.split('/').map(Number);
        fn(x, y);
      }
    },
  };
}
// the tile lists of a product index: { level: tileSet }
function setsOf(ix) {
  const out = {},
    L0 = ix.level || ix.stufe || 10;
  // 'has' is the contract's name; indexes written before revision 1.1 say 'tiles' (per sub-product, '' = the product itself) or 'kacheln'
  let src = ix.has || ix.tiles || ix.kacheln || ix.sets;
  if (src && !Array.isArray(src) && src[''] !== undefined) src = src[''];
  if (!src) return out;
  // per level ({ "10": … }) or one list for the product's level
  const perLevel =
    !Array.isArray(src) &&
    src.bits === undefined &&
    Object.keys(src).length > 0 &&
    Object.keys(src).every(k => /^\d+$/.test(k) && +k >= 4 && +k <= 14);
  if (perLevel) for (const [L, d] of Object.entries(src)) out[+L] = tileSet(d);
  else out[L0] = tileSet(src);
  return out;
}
// 'v1', '1' or 1 → 1
const vnum = v => (typeof v === 'number' ? v : parseInt(String(v).replace(/^v/, ''), 10));
export async function loadIndex(base) {
  // aktuell.json of the contract: { schema, products: { g: { version, schema, path, index, based_on }, … } }
  // (also read: 'produkte' with { v, pfad } as the first sample copies had it)
  const akt = await json(base + 'aktuell.json', true),
    P = akt.products || akt.produkte || {},
    IX = { akt, schema: akt.schema || 1, version: {}, skipped: [], prod: {} };
  const jobs = [];
  for (const [name, p0] of Object.entries(P)) {
    if (!READ.includes(name)) continue; // a product this runtime does not read yet (m, f, w, gr, d …): not asked for
    const p = typeof p0 === 'object' && p0 ? p0 : { version: p0 },
      v = vnum(p.version === undefined ? p.v : p.version),
      need = p.schema || p.schema_min || 1;
    if (need > SCHEMA) {
      IX.skipped.push(name + ' (Schema ' + need + ')');
      continue;
    }
    const path = base + (p.path || p.pfad || name + '/v' + v + '/'),
      pr = (IX.prod[name] = { name, v, path, index: null, sets: {}, basedOn: p.based_on || null, err: '' });
    IX.version[name] = v;
    jobs.push(
      json(p.index ? base + p.index : path + (name === 'boden' ? 'meta.json' : 'index.json'))
        .then(ix => {
          pr.index = ix;
          if (name !== 'boden') pr.sets = setsOf(ix);
          // on which generation of the others a product was computed (z0 of the buildings on the ground, …)
          pr.basedOn = ix.based_on || (ix.suhl && ix.suhl.based_on) || pr.basedOn || {};
        })
        .catch(e => {
          pr.err = String((e && e.message) || e);
        })
    );
  }
  await Promise.all(jobs);
  return IX;
}
// the ground's levels from meta.json (welt/welt.js format: tiling.levels[L] = { rect: [x0, y0, x1, y1], has? })
export function bodenSets(meta) {
  const out = {};
  for (const [L, lv] of Object.entries((meta && meta.tiling && meta.tiling.levels) || {})) {
    const r = lv.rect,
      ts = lv.has ? tileSet(lv.has) : null;
    if (!r) continue;
    out[+L] = {
      rect: r,
      has: (x, y) => x >= r[0] && x <= r[2] && y >= r[1] && y <= r[3] && (!ts || ts.has(x, y)),
      each(fn) {
        if (ts) return ts.each(fn);
        for (let y = r[1]; y <= r[3]; y++) for (let x = r[0]; x <= r[2]; x++) fn(x, y);
      },
    };
  }
  return out;
}
