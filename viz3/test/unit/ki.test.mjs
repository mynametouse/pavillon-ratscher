// Unit tests of the free conversations' core (npc/ki_core.js) without a browser: memory and its repair, opinion limits, notes, prompts
// (fixed part, memory, situation), tools and their effects, tasks as data for TASKS, summary and gossip at the table, the sentence splitter.
// Run: node --test "viz3/test/unit/*.test.mjs"
import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as K from '../../src/npc/ki_core.js';
import { KI_ORTE, KI_TAETIGKEIT, KI_TUN } from '../../src/npc/ki_text.js';

test('memory: defaults, repair of broken parts, limits', () => {
  const m = K.memDefault();
  assert.equal(m.who.hubert.meinung, 35);
  assert.equal(m.who.ronald.meinung, 45);
  assert.equal(K.memCheck(null), null);
  assert.equal(K.memCheck({ v: 2, who: {} }), null);
  const r = K.memCheck({
    v: 1,
    who: {
      hubert: { meinung: 140, notizen: [{ text: 'x' }, null, { text: '' }, { text: 'Plant einen Teich.', von: 'ronald' }], n: -3 },
      ronald: 'kaputt',
    },
    tasks: [{ id: 'ki-hubert-1', who: 'hubert', titel: 'Holz', schritte: [{ art: 'tun', ziel: 'gibtsnicht', text: 'a' }] }],
  });
  assert.equal(r.who.hubert.meinung, 100);
  assert.equal(r.who.hubert.n, 0);
  assert.deepEqual(
    r.who.hubert.notizen.map(n => [n.text, n.von]),
    [
      ['x', 'selbst'],
      ['Plant einen Teich.', 'ronald'],
    ]
  );
  assert.equal(r.who.ronald.meinung, 45);
  assert.equal(r.tasks.length, 0, 'a task without a valid step is dropped');
  for (let i = 0; i < 40; i++) K.addNote(m, 'ronald', 'Notiz ' + i);
  assert.equal(m.who.ronald.notizen.length, 30);
  K.addNote(m, 'ronald', 'notiz 39');
  assert.equal(m.who.ronald.notizen.filter(n => /39/.test(n.text)).length, 1, 'the same note again replaces the old one');
});

test('opinion: at most 15 per step, within 0–100; friends from 65', () => {
  const m = K.memDefault();
  assert.equal(K.opinion(m, 'hubert', 50), 50);
  assert.equal(K.opinion(m, 'hubert', -99), 35);
  for (let i = 0; i < 10; i++) K.opinion(m, 'hubert', 15);
  assert.equal(m.who.hubert.meinung, 100);
  assert.equal(K.likes(m, 'hubert'), true);
  m.who.ronald.meinung = 64;
  assert.equal(K.likes(m, 'ronald'), false);
});

test('prompts: the fixed part says du and names the tools; memory and situation', () => {
  const f = K.systemFixed('hubert');
  assert.match(f, /Du bist Hubert/);
  assert.match(f, /duzt/);
  assert.match(f, /aufgabe_geben/);
  assert.equal(K.systemFixed('hubert'), f, 'the same text every time (prompt cache)');
  const m = K.memDefault();
  K.addNote(m, 'hubert', 'Er hat beim Holz geholfen.');
  K.addNote(m, 'hubert', 'Er will einen Teich graben.', 'ronald');
  const s = K.systemMemory(m, 'hubert', 'Sarah');
  assert.match(s, /Sarah, Falkos Freundin/);
  assert.match(s, /35 von 100/);
  assert.match(s, /Was du dir gemerkt hast:\n- Er hat beim Holz geholfen\./);
  assert.match(s, /Was dir Ronald erzählt hat:\n- Er will einen Teich graben\./);
  const b = K.systemBlocks(m, 'ronald', 'Falko');
  assert.deepEqual(b[0].cache_control, { type: 'ephemeral' });
  assert.equal(b[1].cache_control, undefined);
  const l = K.situation({ zeit: 'Sa 14:20 Uhr', ort: 'Ziegenweide', themen: [{ k: 'q_helfen', label: 'Kann ich dir helfen?' }], meinung: 50 });
  assert.match(l, /^<lage>\n/);
  assert.match(l, /q_helfen „Kann ich dir helfen\?“/);
  assert.doesNotMatch(l, /Hand/);
});

test('tools: definitions per neighbour', () => {
  const h = K.tools('hubert'),
    r = K.tools('ronald');
  assert.deepEqual(
    h.map(t => t.name),
    ['meinung_aendern', 'merken', 'aufgabe_geben', 'spielaufgabe', 'taetigkeit', 'gespraech_beenden']
  );
  for (const t of h) {
    assert.equal(t.input_schema.type, 'object');
    assert.equal(t.input_schema.additionalProperties, false);
    assert.equal(t.eager_input_streaming, true);
  }
  assert.deepEqual(h.find(t => t.name === 'taetigkeit').input_schema.properties.was.enum, Object.keys(KI_TAETIGKEIT.hubert));
  assert.deepEqual(r.find(t => t.name === 'taetigkeit').input_schema.properties.was.enum, Object.keys(KI_TAETIGKEIT.ronald));
  const d = h.find(t => t.name === 'aufgabe_geben').description;
  for (const k of [...Object.keys(KI_ORTE), ...Object.keys(KI_TUN)]) assert.ok(d.includes(k), 'named in the description: ' + k);
});

test('runTool: opinion, notes to pass on, activity, end, errors', () => {
  const m = K.memDefault();
  let r = K.runTool(m, 'ronald', 'meinung_aendern', { delta: 8, grund: 'hat geholfen' });
  assert.equal(r.error, false);
  assert.equal(m.who.ronald.meinung, 53);
  assert.deepEqual(r.fx[0], { k: 'meinung', who: 'ronald', from: 45, to: 53, grund: 'hat geholfen' });
  assert.equal(K.runTool(m, 'ronald', 'meinung_aendern', { delta: 'viel' }).error, true);
  r = K.runTool(m, 'hubert', 'merken', { notiz: 'Falko will Hühner halten.', weitererzaehlen: true });
  assert.equal(r.fx[0].tell, true);
  assert.deepEqual(m.who.hubert.tell, ['Falko will Hühner halten.']);
  r = K.runTool(m, 'ronald', 'taetigkeit', { was: 'visit' });
  assert.deepEqual(r.fx[0], { k: 'taetigkeit', who: 'ronald', was: 'visit', with: ['hubert', 'talk'] });
  assert.equal(K.runTool(m, 'ronald', 'taetigkeit', { was: 'chop' }).error, true, 'Ronald does not chop wood');
  assert.equal(K.runTool(m, 'hubert', 'gespraech_beenden', {}).fx[0].k, 'ende');
  assert.equal(K.runTool(m, 'hubert', 'zaubern', {}).error, true);
  // an old task: only one that is offered right now; its line goes back to the model
  const env = { themen: [{ k: 'q_hilfe', label: 'Brauchst du Hilfe?' }], quest: k => ({ text: 'Bring mir den grünen Kanister.', end: false }) };
  assert.equal(K.runTool(m, 'hubert', 'spielaufgabe', { thema: 'q_holz' }, env).error, true);
  r = K.runTool(m, 'hubert', 'spielaufgabe', { thema: 'q_hilfe' }, env);
  assert.equal(r.error, false);
  assert.match(r.text, /grünen Kanister/);
});

test('aufgabe_geben: steps checked, the task as data for TASKS, the reward when done', () => {
  const m = K.memDefault();
  let r = K.runTool(m, 'hubert', 'aufgabe_geben', { titel: 'Zum Bäcker', schritte: [{ art: 'ort', ziel: 'baecker', text: 'Hol Brot.' }], belohnung: 5 });
  assert.equal(r.error, true);
  assert.match(r.text, /unbekanntes ziel: baecker/);
  assert.match(r.text, /schleusingen/);
  r = K.runTool(m, 'hubert', 'aufgabe_geben', {
    titel: 'Rasen und Markt',
    schritte: [
      { art: 'tun', ziel: 'rasen_maehen', text: 'Mäh endlich deinen Rasen.' },
      { art: 'ort', ziel: 'schleusingen', text: 'Fahr zum Markt nach Schleusingen.' },
    ],
    belohnung: 50,
  });
  assert.equal(r.error, false);
  const rec = r.fx[0].rec;
  assert.equal(rec.id, 'ki-hubert-1');
  assert.equal(rec.belohnung, 20, 'reward at most 20');
  assert.equal(K.runTool(m, 'hubert', 'aufgabe_geben', { titel: 'Rasen und Markt', schritte: rec.schritte }).error, true, 'not twice');
  let near = false;
  const def = K.taskDef(rec, { near: () => near, spotAt: () => [1, 2], npcAt: () => [3, 4] });
  assert.equal(def.steps.length, 3);
  assert.equal(def.steps[0].on, 'garage:gemaeht');
  assert.equal(def.steps[1].on, 'place');
  assert.equal(def.steps[1].when({ name: 'Schleusingen, Markt' }), true);
  assert.equal(def.steps[1].when({ name: 'Ratscher' }), false);
  assert.equal(def.steps[1].check(), false);
  near = true;
  assert.equal(def.steps[1].check(), true);
  assert.deepEqual(def.steps[1].target(), [1, 2]);
  assert.equal(def.steps[2].on, 'talk');
  assert.equal(def.steps[2].when({ who: 'hubert' }), true);
  assert.equal(def.steps[2].when({ who: 'ronald' }), false);
  assert.deepEqual(def.steps[2].target(), [3, 4]);
  // stored and repaired like the rest of the memory
  const again = K.memCheck(JSON.parse(JSON.stringify(m)));
  assert.equal(again.tasks.length, 1);
  assert.equal(again.seq, 1);
  // done: reward and a line for the next talk
  const t = K.taskDone(m, rec.id);
  assert.equal(t.titel, 'Rasen und Markt');
  assert.equal(m.who.hubert.meinung, 55);
  assert.deepEqual(m.who.hubert.neu, ['Rasen und Markt']);
  assert.match(K.systemMemory(m, 'hubert'), /Was er für dich erledigt hat: Rasen und Markt/);
  assert.equal(K.taskDone(m, 'ki-hubert-9'), null);
});

test('summary and gossip: stored, told at the table, remembered by the listener', () => {
  const m = K.memDefault();
  K.runTool(m, 'hubert', 'merken', { notiz: 'Falko will Hühner halten.', weitererzaehlen: true });
  const inp = K.summaryInput(m, 'hubert', [
    ['n', 'Was willst du?'],
    ['p', 'Ich will Hühner halten.'],
  ]);
  assert.match(inp, /Falko: Ich will Hühner halten\./);
  assert.match(inp, /Weitererzählen will er: Falko will Hühner halten\./);
  assert.match(K.summarySystem('hubert'), /wer "h"/);
  assert.equal(K.SUMMARY_SCHEMA.additionalProperties, false);
  const g = K.applySummary(
    m,
    'hubert',
    {
      zusammenfassung: 'Falko will Hühner halten.',
      zeilen: [
        { wer: 'h', text: 'Der Junge will jetzt Hühner.' },
        { wer: 'r', text: 'Na, dann gibt es bald frische Eier!' },
        { wer: 'x', text: 'falsch' },
      ],
      notiz_fuer_anderen: 'Falko will Hühner halten.',
      meinung_anderer: 30,
    },
    4
  );
  assert.equal(g.zeilen.length, 2);
  assert.equal(g.meinung, 10);
  assert.deepEqual(m.who.hubert.tell, []);
  assert.equal(m.who.hubert.gespraeche[0].text, 'Falko will Hühner halten.');
  const n = K.nextGossip(m);
  assert.equal(n.who, 'hubert');
  K.gossipHeard(m, 'hubert', 5);
  assert.equal(K.nextGossip(m), null);
  assert.equal(m.who.ronald.meinung, 55);
  assert.deepEqual(m.who.ronald.notizen[0], { t: 5, text: 'Falko will Hühner halten.', von: 'hubert' });
  assert.equal(K.applySummary(m, 'ronald', { zusammenfassung: 'Nur Wetter.', zeilen: [], notiz_fuer_anderen: '', meinung_anderer: 0 }), null);
});

test('sentences: each sentence as soon as it is complete, short ones wait, markup removed', () => {
  const out = [];
  const s = K.sentencer(t => out.push(t));
  for (const ch of 'Nu. Das ist so eine Sache mit dem Holz. Lärche muss zwei Jahre trocknen! Sonst reißt es')
    s.push(ch);
  assert.deepEqual(out, ['Nu. Das ist so eine Sache mit dem Holz.', 'Lärche muss zwei Jahre trocknen!']);
  s.flush();
  assert.equal(out[2], 'Sonst reißt es');
  assert.equal(K.spoken('*brummt* Hm. [lacht] Na gut.'), 'Hm. Na gut.');
});
