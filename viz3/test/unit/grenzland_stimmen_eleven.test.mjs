// Unit tests of ton-stimmen's ElevenLabs engine (tools/voices/grenzland_record.py, grenzland_eleven.py) without the service: a fake
// ElevenLabs on localhost (GL_EL_BASE) answers the subscription and the speech requests with a short tone made by ffmpeg. Checks: the
// offline self-test (budget guard, voice choice, tags), without a key nothing is sent and the notice says so, the casting samples and
// the model test (tags only for v3/v4), the re-recording with --engine eleven (same paths and ids, the sig, the manifest's VOICEX.el with
// the AI person gl_p_<who>, the credits' ledger), a second run sends nothing, the budget stops a request before it is sent.
// Run: node --test "viz3/test/unit/*.test.mjs" (tools/check.sh does it); the parts with sound skip without ffmpeg.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import http from 'node:http';
import { spawn, spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', '..', '..');
const REC = path.join(ROOT, 'tools', 'voices', 'grenzland_record.py');
const hasFF = spawnSync('ffmpeg', ['-version']).status === 0 && spawnSync('ffprobe', ['-version']).status === 0;
const hasPy = spawnSync('python3', ['--version']).status === 0;

test('the offline self-test of the engine passes (budget guard, chosen voices, direction tags, the casting sheet)', { skip: !hasPy }, () => {
  const r = spawnSync('python3', [REC, '--selbsttest'], { encoding: 'utf8' });
  assert.equal(r.status, 0, r.stdout + r.stderr);
  assert.match(r.stdout, /selbsttest ok: \d+ checks/);
});

// ---------------- a fake ElevenLabs ----------------
function fake() {
  const S = { used: 1000, reqs: [] };
  const srv = http.createServer((q, res) => {
    let body = '';
    q.on('data', c => (body += c));
    q.on('end', () => {
      if (q.url.startsWith('/v1/user/subscription')) {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ character_count: S.used, character_limit: 100000 }));
        return;
      }
      const m = q.url.match(/^\/v1\/text-to-speech\/([^?]+)/);
      if (!m || q.method !== 'POST') {
        res.writeHead(404);
        res.end('{}');
        return;
      }
      const j = JSON.parse(body);
      S.reqs.push({ voice: m[1], key: q.headers['xi-api-key'], ...j });
      S.used += j.text.length;
      // a tone about as long as the words would take
      const sec = Math.max(0.6, j.text.length / 14);
      const ff = spawn('ffmpeg', ['-loglevel', 'error', '-f', 'lavfi', '-i', `sine=f=220:d=${sec}`, '-f', 'mp3', 'pipe:1']);
      const out = [];
      ff.stdout.on('data', d => out.push(d));
      ff.on('close', () => {
        res.writeHead(200, { 'Content-Type': 'audio/mpeg' });
        res.end(Buffer.concat(out));
      });
    });
  });
  return new Promise(ok => srv.listen(0, '127.0.0.1', () => ok({ S, srv, base: 'http://127.0.0.1:' + srv.address().port })));
}
function run(args, env) {
  return new Promise(ok => {
    const p = spawn('python3', [REC, ...args], { env: { ...process.env, ...env }, cwd: ROOT });
    let out = '';
    p.stdout.on('data', d => (out += d));
    p.stderr.on('data', d => (out += d));
    p.on('close', code => ok({ code, out }));
  });
}
const V = c => (c + 'x'.repeat(20)).slice(0, 20);

test('ElevenLabs end to end against a fake service: samples, model test, re-recording, ledger, budget', { skip: !hasFF || !hasPy }, async () => {
  const F = await fake();
  const T = fs.mkdtempSync(path.join(os.tmpdir(), 'gl-eleven-'));
  try {
    const EX = path.join(T, 'extra');
    fs.mkdirSync(EX, { recursive: true });
    const lines = [
      { who: 'gl_sarah', id: 'gl_sarah_test1', text: 'Leise also. Dann wartet, bis es dunkel ist.', prio: 1, src: 'R.test', regie: ['whispers'] },
      { who: 'gl_jule', id: 'gl_jule_test2', text: 'Stimmt.', prio: 1, src: 'R.test' },
    ];
    fs.writeFileSync(path.join(T, 'linien.json'), JSON.stringify({ cast: {}, lines }));
    const B = {
      modelle: { probe: 'eleven_multilingual_v2', test: ['eleven_multilingual_v2', 'eleven_v3'] },
      personen: {
        gl_sarah: { name: 'Sarah', rang: 1, probe: 'Drei Fotos.', kandidaten: [{ id: V('SARAHA') }, { id: V('SARAHB') }], gewaehlt: V('SARAHA') },
        gl_jule: { name: 'Jule', rang: 2, probe: 'Stimmt.', kandidaten: [{ id: V('JULEA') }, { id: V('JULEB') }], gewaehlt: V('JULEA') },
      },
      leute: {},
    };
    fs.writeFileSync(path.join(T, 'bes.json'), JSON.stringify(B));
    const env = {
      GL_EX: EX,
      GL_LINIEN: path.join(T, 'linien.json'),
      GL_BES: path.join(T, 'bes.json'),
      GL_REGIE: path.join(T, 'regie.json'),
      GL_HOER: path.join(T, 'hoer.json'),
      GL_TMP: path.join(T, 'tmp'),
      GL_EL_BASE: F.base,
      GL_EDGE_STATIC: '1',
      GITHUB_STEP_SUMMARY: '',
    };
    // 1. without a key: the notice, nothing sent, the Hörprobe list still written (with the library previews: none here)
    let r = await run(['--probe', '--modelltest'], { ...env, ELEVENLABS_API_KEY: '' });
    assert.equal(r.code, 0, r.out);
    assert.match(r.out, /ELEVENLABS_API_KEY fehlt – übersprungen/);
    assert.equal(F.S.reqs.length, 0);
    // 2. the samples and the model test (only Jule and Sarah of the test lines have voices here)
    r = await run(['--probe', '--modelltest'], { ...env, ELEVENLABS_API_KEY: 'k-test' });
    assert.equal(r.code, 0, r.out);
    const probes = F.S.reqs.filter(q => q.text === 'Drei Fotos.' || q.text === 'Stimmt.');
    assert.equal(probes.length, 4, 'two candidates each');
    assert.ok(probes.every(q => q.model_id === 'eleven_multilingual_v2' && q.key === 'k-test'));
    const t3 = F.S.reqs.filter(q => q.model_id === 'eleven_v3');
    const t2 = F.S.reqs.filter(q => q.model_id === 'eleven_multilingual_v2' && !probes.includes(q));
    assert.ok(t3.length === 2 && t3.some(q => q.text.startsWith('[whispers] Leise also.')), 'v3 gets the tags: ' + JSON.stringify(t3.map(q => q.text)));
    assert.ok(t3.some(q => q.text.startsWith('[out of breath] [shouting] Raus hier!')));
    assert.ok(t2.length === 2 && t2.every(q => !q.text.includes('[')), 'v2 the words only');
    const L = JSON.parse(fs.readFileSync(path.join(EX, 'probe', 'index.json'), 'utf8'));
    const sent = F.S.reqs.reduce((s, q) => s + q.text.length, 0);
    assert.equal(L._credits, sent, 'the ledger counts what was sent');
    assert.match(r.out, new RegExp(sent + ' credits used by the subscription in this run'));
    for (const e of Object.values(L.proben)) assert.ok(fs.statSync(path.join(EX, 'probe', e.datei)).size > 1000);
    const H = JSON.parse(fs.readFileSync(path.join(T, 'hoer.json'), 'utf8'));
    assert.ok(H.some(h => h.id.startsWith('stimme:modell:')) && H.some(h => h.datei && h.datei.includes('/probe/sarah/')));
    // 3. again: everything is there – nothing sent
    const n0 = F.S.reqs.length;
    r = await run(['--probe', '--modelltest'], { ...env, ELEVENLABS_API_KEY: 'k-test' });
    assert.equal(r.code, 0, r.out);
    assert.equal(F.S.reqs.length, n0, 'idempotent');
    // 4. the re-recording of the lines (the lead's go): same path and id, the direction in the text, the manifest
    r = await run(['--engine', 'eleven'], { ...env, ELEVENLABS_API_KEY: 'k-test', GL_EL_MODEL: 'eleven_v3', GL_EL_BUDGET: '100000' });
    assert.equal(r.code, 0, r.out);
    const rec = F.S.reqs.slice(n0);
    assert.equal(rec.length, 2, r.out);
    assert.ok(rec.some(q => q.voice === V('SARAHA') && q.text === '[whispers] Leise also. Dann wartet, bis es dunkel ist.'));
    assert.ok(rec.some(q => q.voice === V('JULEA') && q.text === 'Stimmt.'));
    const mp3 = path.join(EX, 'dist', 'snd', 'voice', 'gl', 'gl_sarah_test1.mp3');
    assert.ok(fs.statSync(mp3).size > 1000);
    const A = JSON.parse(fs.readFileSync(path.join(EX, 'aufnahmen.json'), 'utf8'));
    assert.match(A.gl_sarah_test1.sig, new RegExp('^el\\|' + V('SARAHA') + '\\|eleven_v3\\|whispers\\|p\\|'));
    const M = JSON.parse(fs.readFileSync(path.join(EX, 'manifest.json'), 'utf8'));
    assert.equal(M.vx.el.gl_sarah, V('SARAHA'));
    assert.equal(M.vx.el.gl_p_sarah, V('SARAHA'), 'the AI Sarah of the free talks speaks with the same voice');
    assert.ok(M.vx.voices.gl_p_sarah && M.vx.voices.gl_p_sarah === M.vx.voices.gl_sarah, 'and with the same Edge voice');
    assert.deepEqual(
      M.vx_add.map(l => [l.who, l.id, l.file]),
      [
        ['gl_sarah', 'gl_sarah_test1', 'voice/gl/gl_sarah_test1.mp3'],
        ['gl_jule', 'gl_jule_test2', 'voice/gl/gl_jule_test2.mp3'],
      ]
    );
    // 5. an Edge run keeps the ElevenLabs recordings (nothing to record, no request)
    const n1 = F.S.reqs.length;
    r = await run([], { ...env, ELEVENLABS_API_KEY: '' });
    assert.equal(r.code, 0, r.out);
    assert.match(r.out, /0 to record/);
    assert.equal(JSON.parse(fs.readFileSync(path.join(EX, 'aufnahmen.json'), 'utf8')).gl_sarah_test1.sig, A.gl_sarah_test1.sig);
    // 6. the budget: a new line that does not fit is not sent (it waits for Edge)
    lines.push({ who: 'gl_jule', id: 'gl_jule_test3', text: 'Das hier ist ein ziemlich langer neuer Satz für das Budget.', prio: 1, src: 'R.test' });
    fs.writeFileSync(path.join(T, 'linien.json'), JSON.stringify({ cast: {}, lines }));
    const L2 = JSON.parse(fs.readFileSync(path.join(EX, 'probe', 'index.json'), 'utf8'));
    r = await run(['--engine', 'eleven'], { ...env, GL_DRY: '1', ELEVENLABS_API_KEY: 'k-test', GL_EL_BUDGET: String(L2._credits + 5) });
    assert.equal(r.code, 0, r.out);
    assert.match(r.out, /ElevenLabs eleven_v3: 0 lines, 0 credits planned/);
    assert.equal(F.S.reqs.length, n1, 'nothing sent over the budget');
  } finally {
    F.srv.close();
    fs.rmSync(T, { recursive: true, force: true });
  }
});
