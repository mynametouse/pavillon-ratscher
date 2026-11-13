// Unit tests of the shared phone (viz3/src/handy/) without a browser: the CSS keeps to its own class names (the old phone's body had the
// base game's class .hb – every message stood beside the previous one), the standard apps are all there, the Grenzland adapter keeps the
// old interface and the hooks of its tests. Run: node --test "viz3/test/unit/*.test.mjs" (tools/check.sh does it)
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
const src = f => readFileSync(new URL('../../src/' + f, import.meta.url), 'utf8');
const core = src('handy/handy.js'),
  apps = src('handy/handy_apps.js'),
  gl = src('grenzland/gl_handy.js');
// the CSS of a module: the template string after "const CSS = `"
const cssOf = t => {
  const i = t.indexOf('const CSS = `');
  assert.ok(i >= 0, 'a CSS block');
  return t.slice(i + 13, t.indexOf('`;', i));
};
// old names kept as hooks for the tests of the first world (no rules of their own except what the phone scopes)
const HOOKS = new Set(['msg', 'neu', 'po', 'nt', 'nz', 'gut', 'blitz', 'lo']);
test('every class the phone styles is its own (hy-…) or a scoped hook – no .hb, .ov, .toast of the base game', () => {
  for (const [name, t] of [
    ['handy.js', core],
    ['handy_apps.js', apps],
  ]) {
    const css = cssOf(t).replace(/url\([^)]*\)/g, '');
    const cls = [...css.matchAll(/\.([a-zA-Z][\w-]*)/g)].map(m => m[1]);
    assert.ok(cls.length > 40, name + ' has rules');
    const bad = [...new Set(cls.filter(c => !c.startsWith('hy') && !HOOKS.has(c)))];
    assert.deepEqual(bad, [], name + ': foreign class names ' + bad.join(', '));
  }
});
test('the phone scrolls only from top to bottom', () => {
  const css = cssOf(core);
  assert.match(css, /\.hy-body\{[^}]*overflow-y:auto/);
  assert.match(css, /\.hy-body\{[^}]*overflow-x:hidden/);
  assert.match(css, /\.hy-body\{[^}]*overscroll-behavior:contain/);
  assert.doesNotMatch(css + cssOf(apps), /overflow-x:(auto|scroll)/);
});
test('the reset of the buttons does not outrank the apps (zero specificity)', () => {
  assert.match(cssOf(core), /:where\(\.hy\) button\{/);
});
test('the standard apps are registered, each with a name and an icon', () => {
  const ids = [...apps.matchAll(/HANDY\.std\('(\w+)'/g)].map(m => m[1]);
  for (const id of ['nachrichten', 'telefon', 'kamera', 'fotos', 'karte', 'feed', 'bank', 'notizen', 'einstellungen', 'uhr'])
    assert.ok(ids.includes(id), id);
});
test('the core knows no world: nothing of Grenzland is imported into handy/', () => {
  for (const t of [core, apps, src('handy/handy_pose.js')]) assert.doesNotMatch(t, /from '\.\.\/grenzland\//);
});
test('Grenzland keeps the old interface of GLHANDY', () => {
  const ret = gl.slice(gl.lastIndexOf('return {'));
  for (const k of ['sms', 'chat', 'feed', 'post', 'posts', 'note', 'unlock', 'open', 'close', 'zu', 'toggle', 'tab', 'isOpen', 'unread', 'badge', 'kamera', 'foto', 'fotoUI', 'sucher', 'cam', 'ziel', 'tick', 'stop', 'S'])
    assert.match(ret, new RegExp('\\n\\s+' + k + '[,:]'), k);
  // the hooks its tests know: the element ids, the old tabs, the camera's state
  assert.match(gl, /ids: \{ root: 'glhandy', sucher: 'glcam' \}/);
  assert.match(gl, /'sms', 'chat', 'feed', 'bank', 'notiz', 'kamera', 'radio'/);
  assert.match(gl, /get camOn\(\)/);
});
