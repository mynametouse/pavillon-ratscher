// Unit tests of feat/grenzland's radio without a browser: the composer and synthesiser (grenzland/gl_radio_musik.js – deterministic, in
// key, real form, levels, no clipping, a sane spectrum) and the programme's rules (grenzland/gl_radio_data.js – the format clock, no
// line twice in a row, the police report of the player's deeds first, the feature in parts, the news of 10 November 1989).
// Run: node --test "viz3/test/unit/*.test.mjs" (tools/check.sh does it)
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { GLRMUSIK as M } from '../../src/grenzland/gl_radio_musik.js';
import { GLRDATA as D } from '../../src/grenzland/gl_radio_data.js';

const ALL = D.SENDER.heute.concat(D.SENDER[1989]);
// the share of the energy in bands (a plain FFT over windows of 4096 samples)
function bands(buf, edges) {
  const N = 4096,
    re = new Float64Array(N),
    im = new Float64Array(N),
    acc = new Float64Array(N / 2);
  for (let o = 0; o + N <= buf.length; o += N * 3) {
    for (let i = 0; i < N; i++) {
      re[i] = buf[o + i] * (0.5 - 0.5 * Math.cos((2 * Math.PI * i) / N));
      im[i] = 0;
    }
    for (let i = 1, j = 0; i < N; i++) {
      let bit = N >> 1;
      for (; j & bit; bit >>= 1) j ^= bit;
      j ^= bit;
      if (i < j) {
        [re[i], re[j]] = [re[j], re[i]];
        [im[i], im[j]] = [im[j], im[i]];
      }
    }
    for (let len = 2; len <= N; len <<= 1) {
      const a = (-2 * Math.PI) / len,
        wr = Math.cos(a),
        wi = Math.sin(a);
      for (let i = 0; i < N; i += len) {
        let cr = 1,
          ci = 0;
        for (let k = 0; k < len / 2; k++) {
          const p = i + k,
            q = p + len / 2,
            vr = re[q] * cr - im[q] * ci,
            vi = re[q] * ci + im[q] * cr;
          re[q] = re[p] - vr;
          im[q] = im[p] - vi;
          re[p] += vr;
          im[p] += vi;
          const t = cr * wr - ci * wi;
          ci = cr * wi + ci * wr;
          cr = t;
        }
      }
    }
    for (let i = 1; i < N / 2; i++) acc[i] += re[i] * re[i] + im[i] * im[i];
  }
  let tot = 0;
  const out = edges.map(() => 0);
  for (let i = 1; i < N / 2; i++) {
    const f = (i * M.SR) / N;
    tot += acc[i];
    edges.forEach(([a, b], k) => {
      if (f >= a && f < b) out[k] += acc[i];
    });
  }
  return out.map(x => x / tot);
}

test('every station has a repertoire of its own; a piece is composed the same way every time', () => {
  for (const s of ALL) {
    const rep = M.REP[s.id];
    assert.ok(rep && rep.length >= 3, s.id + ' has pieces');
    assert.equal(new Set(rep.map(r => r.t)).size, rep.length, s.id + ': titles differ');
  }
  const a = M.song('kirmes', 0),
    b = M.song('kirmes', 0),
    c = M.song('kirmes', 3);
  assert.deepEqual(Array.from(a.ev), Array.from(b.ev), 'the same notes');
  assert.equal(a.stil, 'polka');
  assert.equal(c.stil, 'polka');
  assert.notDeepEqual(
    Array.from(a.ev.subarray(0, 400)),
    Array.from(c.ev.subarray(0, 400)),
    'two polkas are two pieces'
  );
  assert.equal(M.song('kirmes', 6).titel, a.titel, 'the repertoire goes round');
});

test('pieces have form (sections, themes, an ending), last about a minute and stay in their key', () => {
  let n = 0;
  for (const s of ALL)
    for (let i = 0; i < M.REP[s.id].length; i++) {
      const S = M.song(s.id, i),
        tag = s.id + ' ' + i + ' ' + S.titel;
      n++;
      assert.ok(S.dauer > 40 && S.dauer < 100, tag + ' lasts ' + S.dauer.toFixed(0) + ' s');
      assert.ok(S.sek.length >= 4, tag + ' has sections');
      assert.ok(new Set(S.sek.map(q => q.th).filter(Boolean)).size >= 2, tag + ' has two themes at least');
      assert.ok(S.nev > 120, tag + ' has notes');
      let lead = 0;
      for (let k = 0; k < S.nev; k++) {
        const o = k * 5;
        assert.ok(S.ev[o] >= 0 && S.ev[o] < S.dauer, tag + ' note in time');
        if (S.ev[o + 4] < 0) continue;
        const midi = S.ev[o + 2];
        assert.ok(midi >= 24 && midi <= 96, tag + ' note in range: ' + midi);
        assert.ok(
          M.tonart(S, S.ev[o]) & (1 << (Math.round(midi) % 12)),
          tag + ' in key at ' + S.ev[o].toFixed(2) + ' s: ' + midi
        );
        lead++;
      }
      assert.ok(lead > 100);
    }
  assert.ok(n >= 45);
});

test('rendered pieces: equal loudness, no clipping, no hum, silence at both ends, a sane spectrum, more than a loop', () => {
  for (const [id, i] of [
    ['kirmes', 0],
    ['zweitakt', 0],
    ['neon', 1],
    ['republik', 1],
    ['klassik', 0],
  ]) {
    const S = M.song(id, i),
      b = M.render(S),
      p = M.pegel(b),
      tag = id + ' ' + S.titel;
    assert.equal(b.length, S.n);
    for (let k = 0; k < b.length; k += 97) assert.ok(Number.isFinite(b[k]), tag + ' finite');
    assert.ok(p.peak <= M.LIM + 1e-6, tag + ' peak ' + p.peak.toFixed(3) + ' stays under the limit');
    assert.ok(p.rms > 0.08 && p.rms < 0.115, tag + ' rms ' + p.rms.toFixed(3));
    assert.ok(Math.abs(p.dc) < 0.002, tag + ' no offset');
    assert.ok(Math.abs(b[0]) < 0.01 && Math.abs(b[b.length - 1]) < 0.01, tag + ' begins and ends in silence');
    let over = 0;
    for (let k = 0; k < b.length; k++) if (Math.abs(b[k]) > 0.5) over++;
    assert.ok(
      over / b.length < 0.004,
      tag + ' is hardly ever bent by the limiter: ' + ((100 * over) / b.length).toFixed(2) + ' %'
    );
    const [low, mid, high] = bands(b, [
      [20, 150],
      [150, 2500],
      [2500, 12000],
    ]);
    assert.ok(low < 0.6, tag + ' not all bass: ' + low.toFixed(2));
    assert.ok(mid > 0.3, tag + ' has a middle: ' + mid.toFixed(2));
    assert.ok(high > 0.002 && high < 0.3, tag + ' has some treble, not much: ' + high.toFixed(3));
    // sections differ in level: the loudest four seconds against the quietest (the ends left out)
    const w = 4 * M.SR;
    let lo = 1,
      hi = 0;
    for (let o = w; o + 2 * w < b.length; o += w) {
      const r = M.pegel(b.subarray(o, o + w)).rms;
      lo = Math.min(lo, r);
      hi = Math.max(hi, r);
    }
    assert.ok(hi / lo > 1.12, tag + ' grows and falls: ' + (hi / lo).toFixed(2));
  }
});

test('rendering is deterministic and can be done in slices', () => {
  const S = M.kennung('neon'),
    a = M.render(S),
    J = M.job(S);
  let steps = 0;
  while (!M.step(J, 0)) steps++;
  assert.ok(steps > 5, 'many small slices: ' + steps);
  assert.deepEqual(Array.from(J.out.subarray(0, 5000)), Array.from(a.subarray(0, 5000)));
  assert.ok(S.dauer < 6 && M.pegel(a).peak <= M.LIM + 1e-6);
  assert.notDeepEqual(
    Array.from(M.render(M.kennung('kirmes')).subarray(2000, 2400)),
    Array.from(a.subarray(2000, 2400)),
    'idents differ'
  );
});

test('the dial: seven stations today (ton-radio: Funkloch FM), three in 1989, invented names, nobody real in the texts', () => {
  assert.equal(D.SENDER.heute.length, 7);
  assert.equal(D.SENDER[1989].length, 3);
  for (const era of ['heute', 1989]) {
    const l = D.SENDER[era];
    assert.equal(new Set(l.map(s => s.id)).size, l.length);
    for (let i = 1; i < l.length; i++) assert.ok(l[i].mhz > l[i - 1].mhz, "in the dial's order");
    for (const s of l) {
      assert.ok(
        s.name &&
          s.freq &&
          s.wer &&
          s.wer.name &&
          s.claims.length &&
          s.mod.length &&
          s.news.length &&
          s.uhr.includes('musik')
      );
      assert.equal(String(s.mhz).replace('.', ','), s.freq);
    }
  }
  const text = JSON.stringify(D, (k, v) => (typeof v === 'function' ? String(v) : v));
  assert.ok(!/Hubert|Ronald/.test(text), 'the real neighbours never appear');
  assert.ok(text.length > 12000);
});

test('the programme follows the format clock and does not repeat a line before all were said', () => {
  const st = D.PROG.neu('grenzland', 5),
    kinds = [],
    lines = [];
  for (let i = 0; i < 24; i++) {
    const it = D.PROG.next(st, { songs: 6, min: 17 * 60 + 20, last: { titel: 'X', von: 'Y' } });
    kinds.push(it.k === 'musik' ? 'musik' : it.art);
    if (it.k === 'wort') {
      assert.ok(it.zeilen.length && it.zeilen.every(z => typeof z === 'string' && z.length > 8), 'lines: ' + it.art);
      if (it.art === 'werb') lines.push(it.zeilen[0]);
    } else assert.ok(it.i >= 0 && it.i < 6);
  }
  for (const k of ['musik', 'kenn', 'news', 'mod', 'werb', 'feat', 'verkehr'])
    assert.ok(kinds.includes(k), k + ' is on: ' + kinds.join(' '));
  assert.ok(kinds.filter(k => k === 'musik').length >= 8);
  assert.equal(new Set(lines).size, lines.length, 'no advert twice in two rounds');
  // the news tell the time and the weather of the game
  const s2 = D.PROG.neu('grenzland', 9);
  D.PROG.next(s2, {});
  const news = D.PROG.next(s2, { min: 17 * 60 + 20, w: { text: 'Leichter Regen', temp: 6.4, rain: 0.4, wind: 3 } });
  assert.equal(news.art, 'news');
  assert.ok(news.zeilen[0].includes('17 Uhr 20'));
  assert.ok(
    news.zeilen.some(z => z.includes('leichter regen, 6 Grad')),
    news.zeilen.join(' | ')
  );
  // pieces in turn
  const s3 = D.PROG.neu('neon', 2),
    order = [];
  for (let i = 0; i < 30 && order.length < 7; i++) {
    const it = D.PROG.next(s3, { songs: 6 });
    if (it.k === 'musik') order.push(it.i);
  }
  assert.deepEqual(order, [0, 1, 2, 3, 4, 5, 0]);
});

test("the police report of the player's own deeds comes first, in the station's tone", () => {
  const st = D.PROG.neu('grenzland', 1);
  D.PROG.next(st, {});
  const i0 = st.i;
  let it = D.PROG.next(st, { taten: [{ id: 'autoklau', wit: 2 }], sterne: 2, bekannt: false });
  assert.equal(it.art, 'polizei');
  assert.equal(it.taten, 1);
  assert.equal(st.i, i0, 'the clock waits');
  assert.ok(it.zeilen[0].startsWith('Polizeibericht') && /Fahrzeug/.test(it.zeilen[0]), it.zeilen[0]);
  assert.ok(it.zeilen.some(z => z.includes('Die Polizei sucht Zeugen')));
  assert.ok(
    it.zeilen.some(z => z.includes('Beschreibung')),
    'hollow stars: only a description'
  );
  it = D.PROG.next(st, { taten: [{ id: 'boeller', wit: 0 }], sterne: 0 });
  assert.equal(it.art, 'polizei');
  assert.ok(it.zeilen[0].includes('Keine besonderen Vorkommnisse'), 'nobody saw it');
  // another station passes it on in its own words; 1989 the Volkspolizei asks
  const k = D.PROG.next(D.PROG.neu('kirmes', 1), { taten: [{ id: 'schlag', wit: 1 }], sterne: 1, bekannt: true });
  assert.ok(
    k.zeilen[0].includes('Walzer') &&
      k.zeilen[1].startsWith('Polizeibericht') &&
      k.zeilen.some(z => z.includes('wissen inzwischen'))
  );
  const o = D.PROG.next(D.PROG.neu('republik', 1), { taten: [{ id: 'kiste', wit: 1 }], sterne: 2 });
  assert.ok(
    /Volkspolizei/.test(o.zeilen[0]) && /Kiste/.test(o.zeilen[0]) && o.zeilen.some(z => z.includes('Dienststelle'))
  );
  // a special report, an arrest, an escape
  assert.equal(D.PROG.next(st, { eil: 'eil' }).art, 'eil');
  assert.ok(D.PROG.next(st, { eil: 'erwischt', busse: 160 }).zeilen[0].includes('160 Euro'));
  assert.ok(D.PROG.next(st, { eil: 'frei' }).zeilen[0].includes('eingestellt'));
  for (const id of Object.keys(D.POLIZEI))
    assert.ok(D.polizei('grenzland', [{ id, wit: 1 }], 0, false, 'heute').length === 1, id);
});

test('the feature „Sukiyaki in Suhl“ is told in its four parts, in order; 1989 reports what was reported', () => {
  const st = D.PROG.neu('grenzland', 3),
    parts = [];
  for (let i = 0; i < 130 && parts.length < 5; i++) {
    const it = D.PROG.next(st, { songs: 6 });
    if (it.art === 'feat') parts.push(it);
  }
  assert.deepEqual(
    parts.map(p => p.teil),
    [1, 2, 3, 4, 1]
  );
  assert.ok(parts[0].zeilen[0].includes('Sukiyaki') && parts[3].ende && !parts[0].ende);
  const all = D.SENDER[1989].flatMap(s => s.news).join(' ');
  for (const w of [
    'Reiseregelung',
    'Volkspolizeikreisämter',
    'Eisfeld',
    'Aufruf des Ministerrates',
    'Lustgarten',
    'Begrüßungsgeld',
    'Rathaus Schöneberg',
  ])
    assert.ok(all.includes(w), w);
  assert.ok(D.QUELLEN89.length >= 5 && D.QUELLEN89.every(q => /^https:\/\//.test(q[1])));
  const n = D.PROG.next(Object.assign(D.PROG.neu('republik', 1), { i: 1 }), {});
  assert.equal(n.art, 'news');
  assert.ok(n.zeilen.length >= 4 && n.zeilen[n.zeilen.length - 1].startsWith('Das Wetter'));
});

test('the weather and the clock as sentences', () => {
  assert.equal(D.uhr(17 * 60 + 20), 'Es ist 17 Uhr 20.');
  assert.equal(D.uhr(1440 + 8 * 60), 'Es ist 8 Uhr.');
  assert.ok(D.wetter(null, 'heute').startsWith('Das Wetter'));
  assert.ok(D.wetter({ text: 'Nebel', temp: -2, fog: true, wind: 1 }, 'heute').includes('minus 2 Grad'));
  assert.ok(D.wetter({ text: 'Bedeckt', temp: 5, wind: 14 }, '1989').includes('Stürmischer Wind.'));
  assert.ok(D.dauer('kurz') >= 2.4 && D.dauer('x'.repeat(200)) > 12);
});
