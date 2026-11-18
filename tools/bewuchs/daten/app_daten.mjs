// Data of the app that the vegetation-class maps need, read from the app's own modules in node (no browser): the site (viz3/site.js –
// the garden polygon, trees, buildings, neighbours, field path), the brook (garden/stream_geo.js – its centre line, banks, bridge, terrace,
// steps; it also moves trees out of the ditch, as in the app) and the open space of the village centre (world/dorfkern_data.js – hedges,
// paving, well). Writes JSON to stdout.   node tools/bewuchs/daten/app_daten.mjs > app.json
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..', '..');
const src = readFileSync(join(ROOT, 'viz3', 'site.js'), 'utf8');
globalThis.window = {};
globalThis.location = { search: '' };
new Function('window', src)(globalThis.window); // window.SITE = {...}
const SITE = globalThis.window.SITE;
const { STREAM } = await import(pathToFileURL(join(ROOT, 'viz3', 'src', 'garden', 'stream_geo.js')).href);
const { DKDATA } = await import(pathToFileURL(join(ROOT, 'viz3', 'src', 'world', 'dorfkern_data.js')).href);

// the brook: centre line and offsets every 0.25 m along it (t), so Python can draw bands without porting the meander
const line = [];
for (let t = STREAM.tLim[0] - 30; t <= STREAM.tLim[1] + 30; t += 0.25) {
  const c = STREAM.cOff(t);
  line.push([+t.toFixed(2), +c.toFixed(4), ...STREAM.wpt(t, c).map(v => +v.toFixed(3))]);
}
const out = {
  site: SITE,
  stream: {
    U: STREAM.U,
    N: STREAM.N,
    P1: SITE.path[0],
    OFF: STREAM.OFF,
    WT: STREAM.WT,
    WB: STREAM.WB,
    WW: STREAM.WW,
    TB: STREAM.TB,
    tLim: STREAM.tLim,
    BR: { t: STREAM.BR.t, w: STREAM.BR.w, l: STREAM.BR.l },
    TERR: STREAM.TERR,
    STAIRS: STREAM.STAIRS,
    SW: STREAM.SW,
    YT: STREAM.YT,
    line, // [t, cOff, x, y]
  },
  dorfkern: DKDATA.open,
};
process.stdout.write(JSON.stringify(out));
