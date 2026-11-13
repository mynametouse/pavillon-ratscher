// Unit tests of the Zeitreise chronicle (zukunft/zk_chronik.js, feat/zeitreise-chronik) without a browser: the contract's shape, events in
// playback order inside SPAN at known places, the same moments in both worlds of a pair, state() continuous and within its bounds, every
// number with a range and a source, line ids unique, only the invented villagers.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { ZKCHRONIK as C } from '../../src/zukunft/zk_chronik.js';

const PLACES = ['anger', 'hang', 'waldrand', 'kahlflaeche', 'strasse', 'bruecke', 'heizhaus', 'windrad', 'schule'];
const KINDS = ['wandel', 'ereignis', 'stresstest', 'entscheidung'];
const VILLAGERS = ['gerhard', 'manfred', 'wolfgang', 'uwe', 'katrin', 'ingrid', 'jens', 'heike'];
const PLAY = ['allein', 'gewappnet'];
const SHARES = ['green', 'red', 'grey', 'cleared', 'fallen', 'young'];

test('contract: worlds, pairs, span, chapters, places', () => {
  assert.deepEqual(Object.keys(C.WORLDS), ['allein', 'gewappnet', 'rueckenwind', 'glueck']);
  for (const [id, w] of Object.entries(C.WORLDS)) {
    assert.equal(w.id, id);
    assert.ok(w.title && w.claim && /^#[0-9a-f]{6}$/.test(w.color), id);
    assert.ok(['heftig', 'mild'].includes(w.klima) && ['jeder', 'gemeinsam'].includes(w.handeln), id);
  }
  assert.equal(C.WORLDS.allein.title, 'Allein im Sturm');
  assert.equal(C.WORLDS.allein.handeln, 'jeder');
  assert.equal(C.WORLDS.gewappnet.handeln, 'gemeinsam');
  assert.ok(C.WORLDS.rueckenwind.stub && C.WORLDS.glueck.stub);
  assert.deepEqual(C.PAIRS, [['allein', 'gewappnet']]);
  assert.deepEqual(C.SPAN, [2026, 2060]);
  assert.deepEqual(
    C.CHAPTERS.map(c => c.id),
    ['wald', 'wasser', 'energie']
  );
  for (const c of C.CHAPTERS) {
    assert.ok(c.title && c.from >= C.SPAN[0] && c.to <= C.SPAN[1] && c.from < c.to, c.id);
    assert.ok(c.places.length && c.places.every(p => PLACES.includes(p)), c.id + ' places');
    assert.equal(c.questions.length, 2, c.id + ' two questions');
    for (const q of c.questions) assert.ok(q.endsWith('?') && q.length < 140, q);
  }
  assert.deepEqual(Object.keys(C.PLACES).sort(), [...PLACES].sort());
  for (const c of C.CHAPTERS) assert.ok(c.hour >= 8 && c.hour <= 18, c.id + ': a daylight hour for the time-lapse');
  assert.ok(C.NOTES.jahre && C.NOTES.zukunft === C.SIGN_NOTE);
});

test('events: playback order, inside SPAN and the chapter, known places and kinds, readable lengths', () => {
  for (const w of PLAY) {
    const ev = C.events(w);
    assert.ok(ev.length >= 12, w + ': at least a dozen events');
    const ids = new Set();
    let last = -1,
      lastT = -Infinity;
    for (const e of ev) {
      assert.ok(!ids.has(e.id), w + ': unique id ' + e.id);
      ids.add(e.id);
      assert.equal(e.w, w);
      const ci = C.CHAPTERS.findIndex(c => c.id === e.chapter);
      assert.ok(ci >= 0, e.id + ' chapter');
      if (ci !== last) {
        assert.ok(ci > last, e.id + ': chapters in order');
        last = ci;
        lastT = -Infinity;
      }
      assert.ok(e.t >= lastT, e.id + ': sorted in time');
      lastT = e.t;
      const ch = C.CHAPTERS[ci];
      assert.ok(e.y >= ch.from && e.y <= ch.to && e.y >= C.SPAN[0] && e.y <= C.SPAN[1], e.id + ' year');
      assert.ok(e.doy >= 1 && e.doy <= 366 && e.hour >= 0 && e.hour < 24, e.id + ' date');
      assert.ok(Math.abs(e.t - C.yf(e.y, e.doy, e.hour)) < 1e-9, e.id + ' t');
      assert.ok(PLACES.includes(e.place), e.id + ' place ' + e.place);
      assert.ok(KINDS.includes(e.kind), e.id + ' kind');
      assert.ok(e.title && e.title.length <= 40, e.id + ' title ≤ 40: ' + e.title);
      assert.ok(e.text && e.text.length <= 320, e.id + ' text ≤ 320 (' + e.text.length + ')');
      assert.ok(e.halt >= 0 && Number.isFinite(e.halt) && e.dur >= 0, e.id + ' halt/dur');
      assert.ok(e.weather === null || typeof e.weather === 'string', e.id + ' weather');
      if (e.lines.length) assert.ok(e.halt > 0, e.id + ': lines only where the time stands still');
      for (const l of e.lines) assert.ok(l.text.length <= 130, l.id + ' line ≤ 130 (' + l.text.length + ')');
      if (e.kind === 'entscheidung') {
        assert.ok(e.fork && e.fork.q && e.fork.options.length >= 2, e.id + ' fork');
        assert.ok(e.fork.pick >= 0 && e.fork.pick < e.fork.options.length, e.id + ' pick');
      }
      if (e.kind === 'stresstest') assert.ok(e.halt > 0 && e.dur > 0, e.id + ': a stress test halts and has a phase');
      for (const c of e.cues) assert.ok(C.CUES[c.id] && c.h >= 0 && c.p >= 0 && c.p <= 1, e.id + ' cue ' + c.id);
      if (e.kind === 'stresstest') assert.ok(e.cues.length >= 2, e.id + ': cues');
    }
    for (const c of C.CHAPTERS)
      assert.ok(
        ev.some(e => e.chapter === c.id && e.halt > 0),
        w + ' ' + c.id + ': a halt'
      );
  }
  for (const w of ['rueckenwind', 'glueck']) assert.deepEqual(C.events(w), [], w + ' is a stub');
});

test('the required moments are there: beetle summer, heavy-rain night and the morning after, river flood, blackout, decisions, epilogue', () => {
  for (const w of PLAY) {
    const ev = C.events(w),
      by = id => ev.find(e => e.id === id);
    assert.equal(by('wald-kaefer').place, 'waldrand');
    const sr = by('starkregen');
    assert.ok(
      sr.kind === 'stresstest' && sr.place === 'strasse' && sr.weather === 'starkregen' && sr.y >= 2030 && sr.y < 2040
    );
    const d = C.date(sr.t);
    assert.ok(d.doy >= 182 && d.doy <= 212 && Math.abs(d.hour - (23 + 40 / 60)) < 1e-6, 'a July night around 23:40');
    assert.ok(by('starkregen-morgen').t > sr.t);
    const b = by('blackout');
    assert.ok(b.kind === 'stresstest' && b.place === 'schule' && b.y >= 2030 && b.y < 2040);
    assert.ok(C.date(b.t).doy < 60 || C.date(b.t).doy > 330, 'a winter evening');
    assert.ok(by('hochwasser').y > sr.y);
    for (const id of ['wald-rat', 'energie-eg', 'energie-waermeplan', 'energie-wind', 'energie-speicher'])
      assert.equal(by(id).kind, 'entscheidung', id);
    const ep = by('epilog');
    assert.equal(ep.y, 2060);
    assert.ok(/Dorflinde von 1888/.test(ep.text));
  }
});

test('the pair: shared moments are the same moment; same:true events are identical', () => {
  for (const [L, R] of C.PAIRS) {
    const a = C.events(L),
      b = C.events(R);
    let shared = 0,
      same = 0;
    for (const e of a) {
      const f = b.find(x => x.id === e.id);
      if (!f) continue;
      shared++;
      for (const k of ['y', 'doy', 'hour', 't', 'chapter', 'kind', 'place', 'halt', 'dur', 'weather', 'same'])
        assert.deepEqual(f[k], e[k], e.id + '.' + k);
      if (e.same) {
        same++;
        assert.equal(f.title, e.title);
        assert.equal(f.text, e.text);
        assert.deepEqual(f.lines, e.lines, e.id + ' lines');
      } else if (e.kind === 'entscheidung')
        assert.notEqual(f.fork.pick, e.fork.pick, e.id + ': the worlds decide differently');
    }
    assert.ok(shared >= 20 && same >= 4, `shared ${shared}, same ${same}`);
  }
});

test('phases: at() and phase() map 0..1 onto the event hours', () => {
  const sr = C.find('allein', 'starkregen');
  assert.equal(C.at(sr, 0), sr.t);
  assert.ok(Math.abs(C.phase(sr, C.at(sr, 0.5)) - 0.5) < 1e-9);
  const d = C.date(C.at(sr, 1));
  assert.ok(
    d.doy === sr.doy + 1 && Math.abs(d.hour - (sr.hour + sr.dur - 24)) < 1e-6,
    'four hours later, after midnight'
  );
  for (const y of [2026, 2028, 2034, 2059]) {
    const t = C.yf(y, 200, 13.5),
      dd = C.date(t);
    assert.ok(dd.y === y && dd.doy === 200 && Math.abs(dd.hour - 13.5) < 1e-6, 'date(yf) round trip ' + y);
  }
});

test('state: shape, bounds, shares sum to one, today is today', () => {
  for (const w of Object.keys(C.WORLDS))
    for (let t = 2026; t <= 2060.99; t += 0.37) {
      const s = C.state(w, t);
      assert.ok(s && s.y === t, w + ' ' + t);
      const f = s.forest;
      let sum = 0;
      for (const k of SHARES) {
        assert.ok(f[k] >= -1e-9 && f[k] <= 1 + 1e-9, `${w} ${t} forest.${k} = ${f[k]}`);
        sum += f[k];
      }
      assert.ok(Math.abs(sum - 1) < 1e-9, `${w} ${t} shares sum ${sum}`);
      assert.ok(['pionier', 'mischwald'].includes(f.regrow) && f.regrowH >= 0 && f.regrowH < 30);
      for (const k of ['harvest', 'planted']) assert.ok(f[k] >= 0 && f[k] <= 1, k);
      const wa = s.water;
      assert.ok(wa.rain === null || wa.rain === 'starkregen');
      assert.ok(wa.level >= 0 && wa.level < 2);
      for (const k of ['mud', 'debris', 'prepared']) assert.ok(wa[k] >= 0 && wa[k] <= 1, k);
      assert.ok(Array.isArray(wa.marks) && wa.marks.every(m => m.y >= 2000 && m.h > 0 && m.h < 2));
      const e = s.energy;
      assert.ok([0, 1, 2].includes(e.heatNet) && [0, 1, 2].includes(e.windrad) && typeof e.oilTruck === 'boolean');
      for (const k of ['chips', 'pvRoof', 'battery']) assert.ok(e[k] >= 0 && e[k] <= 1, k);
      assert.ok(
        e.blackout === null ||
          (typeof e.blackout.school === 'boolean' && e.blackout.islands >= 0 && e.blackout.islands <= 1)
      );
      assert.ok(Array.isArray(s.signs) && s.signs.every(id => C.SIGNS[id]));
    }
  const s0 = C.state('allein', 2026);
  assert.ok(
    s0.forest.green > 0.999 && s0.water.level === 0 && s0.energy.heatNet === 0 && s0.energy.blackout === null,
    'today'
  );
  assert.equal(C.state('nirgendwo', 2030), null);
});

test('state: continuous curves (shares and levels move smoothly, also inside the events)', () => {
  const smooth = ['green', 'red', 'grey', 'cleared', 'fallen', 'young', 'planted'];
  for (const w of PLAY) {
    let p = C.state(w, 2026);
    for (let t = 2026.002; t <= 2060.9; t += 0.002) {
      const s = C.state(w, t);
      for (const k of smooth)
        assert.ok(Math.abs(s.forest[k] - p.forest[k]) < 0.02, `${w} ${t.toFixed(3)} forest.${k} jumps`);
      for (const k of ['prepared', 'pvRoof', 'battery'])
        assert.ok(Math.abs((s.water[k] ?? s.energy[k]) - (p.water[k] ?? p.energy[k])) < 0.02, `${w} ${t} ${k} jumps`);
      assert.ok(Math.abs(s.forest.regrowH - p.forest.regrowH) < 0.3, `${w} ${t} regrowH jumps`);
      p = s;
    }
    // inside the water events, minute by minute
    for (const id of ['starkregen', 'hochwasser']) {
      const ev = C.find(w, id);
      let q = C.state(w, C.at(ev, 0) - 1 / 8766);
      for (let m = -60; m < 60 * 72; m += 1) {
        const s = C.state(w, ev.t + m / 60 / 8784);
        for (const k of ['level', 'mud', 'debris'])
          assert.ok(Math.abs(s.water[k] - q.water[k]) < 0.03, `${w} ${id} +${m} min water.${k} jumps`);
        q = s;
      }
    }
  }
});

test('state: the worlds differ the way the chronicle says', () => {
  const A = (t, k) => C.state('allein', t),
    G = t => C.state('gewappnet', t);
  const sr = C.find('allein', 'starkregen');
  const peak = C.at(sr, 0.3);
  assert.ok(A(peak).water.level > 0.3 && G(peak).water.level < 0.2, 'the street floods in Allein im Sturm');
  assert.equal(A(peak).water.rain, 'starkregen');
  const morning = C.find('allein', 'starkregen-morgen').t;
  assert.ok(A(morning).water.debris > 0.5 && G(morning).water.debris < 0.2, 'bulky waste the morning after');
  assert.ok(A(morning).water.mud > G(morning).water.mud);
  const dark = C.at(C.find('allein', 'blackout'), 0.5);
  assert.ok(A(dark).energy.blackout && G(dark).energy.blackout, 'the region is dark in both');
  assert.ok(!A(dark).energy.blackout.school && G(dark).energy.blackout.school, 'the school is lit only in Gewappnet');
  assert.ok(G(dark).energy.blackout.islands > A(dark).energy.blackout.islands);
  assert.equal(A(2032).energy.heatNet, 0);
  assert.equal(G(2032).energy.heatNet, 2);
  assert.equal(G(2029.8).energy.heatNet, 1, 'the trench in summer 2029');
  assert.ok(A(2031.05).energy.oilTruck && !G(2031.05).energy.oilTruck, 'the oil truck in winter');
  assert.ok(G(2035).energy.windrad === 2 && A(2035).energy.windrad === 0);
  assert.equal(A(2040).energy.windrad, 2, 'the investor turbine later');
  assert.ok(A(2028.85).forest.red > 0.4 && G(2028.85).forest.red > 0.3, 'red-brown slopes in both');
  assert.ok(G(2040).forest.young > 0.7 && A(2040).forest.young < 0.55, 'green again by the 2040s in Gewappnet');
  assert.ok(A(2060).forest.young > A(2040).forest.young + 0.15, 'succession closes the gaps slowly');
  assert.ok(A(2040).forest.fallen > 0.2 && G(2040).forest.fallen < 0.1, 'dead wood lying in Allein im Sturm');
  assert.ok(G(2045).forest.regrow === 'mischwald' && A(2045).forest.regrow === 'pionier');
  assert.ok(A(2047).water.marks.length > G(2047).water.marks.length, 'more marks on the wall');
});

test('kpi: 3 to 5 per chapter, the same ids in both worlds, every number with range, source and a reason', () => {
  for (const c of C.CHAPTERS) {
    const a = C.kpi('allein', c.id),
      g = C.kpi('gewappnet', c.id);
    assert.ok(a.length >= 3 && a.length <= 5, c.id);
    assert.deepEqual(
      a.map(k => k.id),
      g.map(k => k.id)
    );
    for (const k of [...a, ...g]) {
      assert.ok(k.label && k.unit && Number.isFinite(k.value), k.id);
      assert.ok(
        Array.isArray(k.range) && k.range[0] <= k.value && k.value <= k.range[1],
        `${c.id}/${k.id}: ${k.value} in ${k.range}`
      );
      assert.ok(k.src.length && k.src.every(s => Array.isArray(s) && s[0]), k.id + ' source');
      assert.ok(k.why && k.why.length > 30, k.id + ' why');
      assert.ok(k.text && k.rangeText, k.id + ' text');
    }
  }
  assert.deepEqual(C.kpi('glueck', 'wald'), []);
  assert.deepEqual(C.kpi('allein', 'mobil'), []);
});

test('lines: unique stable ids, only the invented villagers, never Hubert or Ronald', () => {
  const L = C.lines();
  assert.ok(L.length >= 30);
  const ids = new Set();
  for (const l of L) {
    assert.ok(/^zk-[a-z0-9-]+-[agx]\d+$/.test(l.id), l.id);
    assert.ok(!ids.has(l.id), 'unique ' + l.id);
    ids.add(l.id);
    assert.ok(VILLAGERS.includes(l.who), l.id + ' ' + l.who);
    assert.ok(C.WHO[l.who], l.who);
    assert.ok(l.text.length > 5 && !/[{}]/.test(l.text), l.id);
    assert.ok((l.text.match(/[.!?](\s|$)/g) || []).length <= 2, l.id + ': one or two sentences');
  }
  const all = JSON.stringify([C.events('allein'), C.events('gewappnet'), C.CHAPTERS, C.SIGNS, C.kpi('allein', 'wald')]);
  assert.ok(!/hubert|ronald/i.test(all), 'no real neighbours');
  // a villager who would be very old does not speak (ages from the game's 2026)
  for (const w of PLAY)
    for (const e of C.events(w))
      for (const l of e.lines)
        assert.ok(e.y - C.WHO[l.who].born <= 86, `${l.id}: ${l.who} at ${e.y - C.WHO[l.who].born}`);
});

test('voices: every line is in the recording list (tools/voices/linien.json, made by linien.mjs) under its rec id', () => {
  const list = JSON.parse(fs.readFileSync(new URL('../../../tools/voices/linien.json', import.meta.url), 'utf8'));
  const by = new Map(list.map(l => [l.id, l]));
  for (const l of C.lines()) {
    const r = by.get(l.rec);
    assert.ok(r, l.id + ': ' + l.rec + ' missing – run node tools/voices/linien.mjs');
    assert.equal(r.who, l.who);
    assert.equal(r.text, l.text);
  }
});
