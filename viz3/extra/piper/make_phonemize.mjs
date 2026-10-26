// The phonemizer of the Piper voices (feat/piper, 25.10.2026), German only: text → the phoneme ids a Piper model reads.
// It is piper-phonemize with eSpeak NG, compiled to WebAssembly (npm @diffusionstudio/piper-wasm 1.0.0, build steps of
// github.com/wide-video/piper-phonemize). eSpeak NG and its data are GPL-3.0-or-later – so this part stays a program of its own: its own
// files in dist/piper/, called like a command line (arguments in, one JSON line out, viz3/src/lazy/piper.js), its licence beside it,
// the sources named in the credits. The rest of the page is not linked with it.
// What this script changes: the eSpeak data package keeps only what German needs (phoneme tables, intonation, voice list, the German
// and English dictionaries – 1 MB instead of 18 MB with every language), and the loader becomes an ES module for the module worker.
//   node viz3/extra/piper/make_phonemize.mjs [unpacked package dir]   → viz3/extra/piper/dist/piper/phonemize.{mjs,wasm}, phonemize_de.data
// Without a directory it fetches the package from npm (npm pack). Run it again only to change the package version or the languages.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const PKG = '@diffusionstudio/piper-wasm@1.0.0';
const HERE = path.dirname(fileURLToPath(import.meta.url));
const OUT = path.join(HERE, 'dist', 'piper');
// dictionaries kept: German, and English for the English words eSpeak switches to inside German text
const KEEP_DICT = new Set(['de_dict', 'en_dict']);

let dir = process.argv[2];
if (!dir) {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'piperwasm-'));
  const tgz = execFileSync('npm', ['pack', PKG, '--silent'], { cwd: tmp, encoding: 'utf8' }).trim().split('\n').pop();
  execFileSync('tar', ['xzf', tgz], { cwd: tmp });
  dir = path.join(tmp, 'package');
}
const B = path.join(dir, 'build');
let js = fs.readFileSync(path.join(B, 'piper_phonemize.js'), 'utf8');
const data = fs.readFileSync(path.join(B, 'piper_phonemize.data'));

// the file table of the data package: loadPackage({"files":[{filename,start,end},…],"remote_package_size":N})
const a = js.indexOf('loadPackage({"files"');
const b = js.indexOf('})', js.indexOf('"remote_package_size"', a)) + 1;
if (a < 0 || b <= 0) throw new Error('no data package table in the loader');
const meta = JSON.parse(js.slice(a + 'loadPackage('.length, b));
const keep = meta.files.filter(f => {
  const n = path.posix.basename(f.filename);
  return !n.endsWith('_dict') || KEEP_DICT.has(n);
});
const parts = [];
let at = 0;
const files = keep.map(f => {
  const len = f.end - f.start;
  parts.push(data.subarray(f.start, f.end));
  const o = { filename: f.filename, start: at, end: at + len };
  at += len;
  return o;
});
js = js.slice(0, a) + 'loadPackage(' + JSON.stringify({ files, remote_package_size: at }) + js.slice(b);
// the package's name, and the loader as an ES module (the module worker imports it)
const n0 = js.length;
js = js.replace(/"piper_phonemize\.data"/g, '"phonemize_de.data"');
if (js.length === n0) throw new Error('package name not found');
if (!js.includes('"piper_phonemize.wasm"')) throw new Error('wasm name not found');
js = js.replace(/"piper_phonemize\.wasm"/g, '"phonemize.wasm"');
js =
  '// piper-phonemize + eSpeak NG (GPL-3.0-or-later), WebAssembly build from ' +
  PKG +
  ' – changed by viz3/extra/piper/make_phonemize.mjs: German data only, ES module. Licence: LICENSE-espeak-ng.txt\n' +
  js +
  '\nexport default createPiperPhonemize;\n';

fs.mkdirSync(OUT, { recursive: true });
fs.writeFileSync(path.join(OUT, 'phonemize.mjs'), js);
fs.writeFileSync(path.join(OUT, 'phonemize_de.data'), Buffer.concat(parts));
fs.copyFileSync(path.join(B, 'piper_phonemize.wasm'), path.join(OUT, 'phonemize.wasm'));
const gpl = '/usr/share/common-licenses/GPL-3';
if (fs.existsSync(gpl))
  fs.writeFileSync(
    path.join(OUT, 'LICENSE-espeak-ng.txt'),
    'eSpeak NG (https://github.com/espeak-ng/espeak-ng, the fork used by Piper: https://github.com/rhasspy/espeak-ng) and\n' +
      'piper-phonemize (https://github.com/rhasspy/piper-phonemize, MIT; WebAssembly build: https://github.com/wide-video/piper-phonemize,\n' +
      'npm ' +
      PKG +
      ') are distributed here as phonemize.mjs, phonemize.wasm and phonemize_de.data under the\n' +
      'GNU General Public License, version 3 or later. Source: the repositories above; the changes to the loader and the data:\n' +
      'https://github.com/mynametouse/pavillon-ratscher/blob/src/viz3/extra/piper/make_phonemize.mjs\n\n' +
      fs.readFileSync(gpl, 'utf8')
  );
console.log(
  `phonemize: ${files.length} of ${meta.files.length} files, data ${(at / 1e6).toFixed(2)} MB (was ${(data.length / 1e6).toFixed(1)} MB), loader ${(js.length / 1024).toFixed(0)} KB → ${path.relative(process.cwd(), OUT)}`
);
