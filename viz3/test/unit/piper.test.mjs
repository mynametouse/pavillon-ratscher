// Unit tests of the Piper worker's phoneme mapping (viz3/src/lazy/piper.js, toIds) without a browser: the phonemizer's ids are those of the
// newest Piper map; each model gets its own (older „low“ models know fewer symbols – „ç“ is one sign there, not c + combining cedilla).
// The worker itself needs a browser (onnxruntime-web, WebAssembly) – the function is taken out of its source.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const SRC = fs.readFileSync(
  path.join(path.dirname(fileURLToPath(import.meta.url)), '..', '..', 'src', 'lazy', 'piper.js'),
  'utf8'
);
function extract(name) {
  const i = SRC.indexOf('function ' + name + '(');
  assert.ok(i >= 0, name + ' in the worker');
  let d = 0,
    j = SRC.indexOf('{', i);
  for (let k = j; k < SRC.length; k++) {
    if (SRC[k] === '{') d++;
    else if (SRC[k] === '}' && --d === 0) return new Function('return ' + SRC.slice(i, k + 1))();
  }
  throw new Error('no end of ' + name);
}
const toIds = extract('toIds');

// what the phonemizer gives for „Ich bin müde. Na?“ (shortened): two sentences, ç as c + U+0327
const LINE = {
  phonemes: ['ɪ', 'c', '̧', ' ', 'b', 'ɪ', 'n', '.', 'n', 'ˈ', 'ɑ', 'ː', '?'],
  phoneme_ids: [
    1, 0, 74, 0, 16, 0, 140, 0, 3, 0, 15, 0, 74, 0, 26, 0, 10, 0, 2, 1, 0, 26, 0, 120, 0, 51, 0, 122, 0, 13, 0, 2,
  ],
};
const BASE = {
  _: [0],
  '^': [1],
  $: [2],
  ' ': [3],
  '.': [10],
  '?': [13],
  b: [15],
  c: [16],
  n: [26],
  ɑ: [51],
  ɪ: [74],
  ˈ: [120],
  ː: [122],
};

test('a model with the newest map: the same ids as the phonemizer', () => {
  const map = Object.assign({ '̧': [140] }, BASE);
  assert.deepEqual(toIds(LINE, map), LINE.phoneme_ids);
});

test('an older model: c + combining cedilla becomes its one sign ç, nothing out of range', () => {
  const map = Object.assign({ ç: [129] }, BASE);
  const ids = toIds(LINE, map);
  assert.ok(
    ids.every(i => i < 130),
    'every id within the model'
  );
  assert.deepEqual(ids.slice(0, 8), [1, 0, 74, 0, 129, 0, 3, 0]);
  assert.equal(ids.filter(i => i === 2).length, 2, 'two sentences end');
  assert.equal(ids.filter(i => i === 1).length, 2, 'two sentences begin');
});

test('a sign the model does not know is left out', () => {
  const map = Object.assign({}, BASE);
  const ids = toIds(LINE, map);
  assert.ok(!ids.includes(140), 'no combining cedilla');
  assert.ok(ids.includes(16), 'the c stays');
  assert.ok(ids.every(i => Object.values(map).flat().includes(i)));
});

test('no map (a stand-in model): the phonemizer ids as they are', () => {
  assert.deepEqual(toIds(LINE, null), LINE.phoneme_ids);
});

test('phonemes and ids out of step: only the ids the model knows', () => {
  const ids = toIds({ phonemes: ['a'], phoneme_ids: [1, 0, 74, 0, 140, 0, 2] }, BASE);
  assert.deepEqual(ids, [1, 0, 74, 0, 0, 2]);
});
