// Unit tests of feat/grenzland-partner without a browser: the fixed lines by mission state (GLPDATA.waehle), the AI's <lage> lines
// (GLPDATA.lage) and the small hooks in the free talks' core (npc/ki_core.js: situation() with an adapter's lines, a person without
// aufgabe_geben, one who knows the player for years) – and that nothing changes for the other people.
// Run: node --test "viz3/test/unit/*.test.mjs" (tools/check.sh does it)
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { GLPDATA as D } from '../../src/grenzland/gl_partner_data.js';
import { GLMDATA } from '../../src/grenzland/gl_mission_data.js';
import * as K from '../../src/npc/ki_core.js';

test('every step of chapter 1 has a line in both voices, and the order is that of the story', () => {
  assert.deepEqual(D.ORDER, GLMDATA.ORDER);
  for (const id of GLMDATA.ORDER) {
    const steps = Object.keys(GLMDATA.S[id]).filter(k => !/^(hin|rein)(Laut|Leise)$/.test(k));
    for (const s of steps.concat(id === 'coup' ? ['hin', 'rein', 'raus'] : []))
      assert.ok(D.JETZT[id][s] && D.JETZT[id][s].length === 2 && D.JETZT[id][s].every(t => t.length > 5), id + ':' + s);
    assert.ok(D.BISHER[id] && D.PAUSE[id], id);
  }
});

test('„Was machen wir jetzt?“: mission 1 step 1 and free play, the partner answers in her or his voice', () => {
  const a = D.waehle({ partner: 'sarah', mission: 'gefallen', step: 'ankunft', erledigt: [], sterne: 0, stunde: 18 });
  assert.deepEqual(a.jetzt[0], ['falko', 'Was machen wir jetzt?']);
  assert.deepEqual(a.jetzt[1], ['sarah', D.JETZT.gefallen.ankunft[0]]);
  const b = D.waehle({ partner: 'falko', mission: '', step: '', erledigt: D.ORDER.slice(), sterne: 0, stunde: 18 });
  assert.deepEqual(b.jetzt[0], ['sarah', 'Was machen wir jetzt?']);
  assert.deepEqual(b.jetzt[1], ['falko', D.FREI[1]]);
  // between two missions: what comes next
  const c = D.waehle({ partner: 'sarah', mission: '', erledigt: ['gefallen', 'clique'] });
  assert.equal(c.jetzt[1][1], D.PAUSE.gerhard[0]);
});

test('„Was wissen wir bisher?“ by progress, „Alles gut?“ by stars, a chase and the time', () => {
  const n = D.waehle({ partner: 'sarah', erledigt: [] });
  assert.deepEqual(n.bisher.slice(1), [['sarah', D.BISHER.leer[0]]]);
  const z = D.waehle({ partner: 'falko', erledigt: ['gefallen', 'clique', 'gerhard'] });
  assert.deepEqual(z.bisher.slice(1), [
    ['falko', D.BISHER.clique[1]],
    ['falko', D.BISHER.gerhard[1]],
  ]);
  assert.equal(D.waehle({ partner: 'sarah', sterne: 2, stunde: 14 }).gehtLage, 'sterne');
  assert.equal(D.waehle({ partner: 'sarah', sterne: 0, jagd: true, stunde: 14 }).gehtLage, 'jagd');
  assert.equal(D.waehle({ partner: 'sarah', sterne: 0, stunde: 23 }).gehtLage, 'nacht');
  assert.equal(D.waehle({ partner: 'sarah', sterne: 0, stunde: 7 }).gehtLage, 'morgen');
  assert.equal(D.waehle({ partner: 'sarah', sterne: 0, stunde: 15 }).gehtLage, 'tag');
  const g = D.waehle({ partner: 'sarah', sterne: 1 });
  assert.ok(D.GEHT.sterne[0].includes(g.geht(0)[1][1]) && D.GEHT.sterne[0].includes(g.geht(4)[1][1]));
  assert.deepEqual(g.warte(1)[0], ['falko', 'Warte hier.']);
  assert.ok(D.WARTE[0].includes(g.warte(1)[1][1]));
  assert.ok(D.KOMM[0].includes(g.komm(2)[1][1]));
});

test('linien(): every line a fixed string, both voices, no placeholders', () => {
  const L = D.linien();
  assert.ok(L.length >= 140, String(L.length));
  for (const [w, t] of L) {
    assert.ok(w === 'sarah' || w === 'falko', w);
    assert.equal(typeof t, 'string');
    assert.ok(t.trim() && !t.includes('{'), t);
  }
  const fa = L.filter(l => l[0] === 'falko').length,
    sa = L.filter(l => l[0] === 'sarah').length;
  assert.ok(fa === sa && fa >= 70, fa + ' / ' + sa);
});

test('the <lage> lines of the AI carry the objective, the stars and what the police know', () => {
  const st = {
    spieler: 'Falko',
    ort: 'Schleusingen, Zentralhaltestelle',
    mission: { id: 'gefallen', titel: 'Ein Gefallen', nr: 1, n: 5 },
    schritt: GLMDATA.S.gefallen.heim,
    erledigt: [],
    sterne: 2,
    polizei: 'gesucht',
    wissen: { gesicht: true, kleidung: false, fahrzeug: true },
    geld: 170,
    folgt: true,
    dinge: { paket: 1, boeller: 3 },
  };
  const L = D.lage(st);
  const all = L.join('\n');
  assert.match(all, /Mission 1 von 5, „Ein Gefallen“ – jetzt: Bringt das Paket nach Ratscher/);
  assert.match(all, /Polizei: 2 Sterne – sie suchen euch; sie kennen: Gesicht, Fahrzeug/);
  assert.match(all, /Geld: 170 €/);
  assert.match(all, /Falko hat dabei: das Paket, 3 × Böller/);
  assert.match(all, /Du gehst mit Falko mit\./);
  assert.match(all, /Wo ihr seid: Schleusingen, Zentralhaltestelle/);
  const frei = D.lage({ spieler: 'Sarah', erledigt: [{ titel: 'Ein Gefallen', done: 'x.' }], sterne: 0, geld: 5, folgt: false });
  assert.match(frei.join('\n'), /Kapitel 1 ist geschafft/);
  assert.match(frei.join('\n'), /Polizei: keine Fahndung\./);
  assert.match(frei.join('\n'), /Du wartest hier, bis Sarah dich holt\./);
  // through the core's situation(): the lines stand in <lage>, the topics of the tool too
  const s = K.situation({ zeit: 'Fr, 4. Sep., 18:20 Uhr', lage: L, themen: D.THEMEN, meinung: 85 });
  assert.match(s, /^<lage>\nZeit: Fr, 4\. Sep\., 18:20 Uhr\nWo ihr seid: /);
  assert.match(s, /jetzt: Bringt das Paket/);
  assert.match(s, /2 Sterne/);
  assert.match(s, /mitkommen „Mitkommen/);
  assert.doesNotMatch(s, /Baustand/);
});

test('ki_core: the <lage> of the other people is unchanged; the partner leaves out aufgabe_geben, knows the player, passes nothing on', () => {
  const sample = {
    zeit: 'Sa 14:20 Uhr',
    ort: 'Ziegenweide',
    haelt: 'Schaufel',
    phase: 'Fundament',
    aufgaben: ['Holz holen (von Hubert): zum Holzplatz'],
    neu: ['Zaun geflickt'],
    themen: [{ k: 'q_helfen', label: 'Kann ich dir helfen?' }],
    meinung: 50,
    begruessung: 'Na?',
  };
  assert.equal(
    K.situation(sample),
    '<lage>\nZeit: Sa 14:20 Uhr\nOrt: Ziegenweide\nEr hat in der Hand: Schaufel\nBaustand drüben: Fundament\n' +
      'Seine laufenden Aufgaben: Holz holen (von Hubert): zum Holzplatz\nGerade für dich erledigt: Zaun geflickt\n' +
      'Spielaufgaben (Werkzeug spielaufgabe, thema = Schlüssel): q_helfen „Kann ich dir helfen?“\nDeine Meinung über ihn gerade: 50/100\n' +
      'Du hast ihn eben begrüßt mit: „Na?“\n</lage>'
  );
  // the neighbours as before
  assert.deepEqual(
    K.tools('hubert').map(t => t.name),
    ['meinung_aendern', 'merken', 'aufgabe_geben', 'spielaufgabe', 'taetigkeit', 'gespraech_beenden']
  );
  assert.match(K.systemFixed('hubert'), /aufgabe_geben/);
  assert.match(K.systemFixed('hubert'), /Mit weitererzaehlen = true/);
  assert.match(K.systemMemory(K.memDefault(), 'hubert'), /zum ersten Mal/);
  // the partner, registered as npc/ki.js KI.person does it for grenzland/gl_partner.js
  K.person('gl_p_sarah', {
    name: 'Sarah',
    sheet: D.SHEET.sarah,
    g: 'f',
    start: 85,
    quests: true,
    ohne: ['aufgabe_geben'],
    vertraut: true,
    klatsch: false,
    intro: 'Dein Gegenüber ist dein Partner.',
  });
  assert.deepEqual(
    K.tools('gl_p_sarah').map(t => t.name),
    ['meinung_aendern', 'merken', 'spielaufgabe', 'gespraech_beenden']
  );
  const f = K.systemFixed('gl_p_sarah');
  assert.match(f, /^Du bist Sarah aus Berlin/);
  assert.doesNotMatch(f, /aufgabe_geben/);
  assert.doesNotMatch(f, /weitererzaehlen/);
  assert.match(f, /spielaufgabe/);
  const m = K.memDefault();
  assert.doesNotMatch(K.systemMemory(m, 'gl_p_sarah', 'Falko'), /zum ersten Mal/);
  assert.match(K.systemMemory(m, 'gl_p_sarah', 'Falko'), /85 von 100/);
  const r = K.runTool(m, 'gl_p_sarah', 'spielaufgabe', { thema: 'warten' }, { themen: D.THEMEN, quest: k => ({ text: 'Du wartest jetzt hier.', k }) });
  assert.equal(r.error, false);
  assert.match(r.text, /Du wartest jetzt hier/);
});
