// ===================== feat/grenzland: the side mission „Karpfen für Suhl“ (GLNEBEN) – the Sushi in Suhl story at its fitting place =====================
// Falko, 13.11.2026 0:34: „Integriere auch an passender Stelle die Sushi in Suhl Story in diese GTA-Variante.“
// True (sources: GLDATA.SUSHI.quellen, docs/features/grenzland-neben.md): Rolf Anschütz (1932–2008) cooked Japanese in the HO restaurant
// „Waffenschmied“ in Suhl from 1966 – the only Japanese restaurant of the GDR; the guests bathed together before the meal, one waited up
// to two years for a table; what the GDR did not have he replaced – reports name rice pudding for the sushi rice, carp from a nearby
// lake for salmon, Worcestershire sauce for soy sauce. Invented, and said so in the game: Yuki, a young cook from Suhl, and her memorial
// dinner „Sukiyaki wie im Waffenschmied“, for which she wants exactly these three things.
// How it goes: once the player has met the clique (event 'grenzland:mission' { id: 'clique', st: 'erledigt' }) Yuki writes (GLHANDY.sms).
// In the evening (17:30 – 22:00 by the game clock) she stands at the school bus stop in Ratscher. She tells what she plans and what
// is true; one brings her a carp of two kilos or more (the jetty at the dam: in the evening, on corn), a packet of Milchreis and a bottle
// of Worcestersauce (the shop on wheels) → money, her thanks, and the true story as a note in the phone (GLHANDY.note).
// State: GL.m.karpfen { st, i } (i: 0 she wrote, 1 she has asked). In the journal: KERN.tasks.source 'grenzland-neben'.
// Interface: GLNEBEN.start() · reden() → Promise · stand() · yuki() → her figure or null · ORT (where she stands)
import { KERN } from '../core/kern.js';
import { P } from '../game/walkable.js';
import { PLAY } from '../game/play.js';
import { CLOCK } from '../time/clock.js';
import { DKDATA } from '../world/dorfkern_data.js';
import { GLNLOGIK } from './gl_neben_logik.js';
import { GLDATA } from './gl_data.js';
import { GL } from './gl_state.js';
import { GLTON } from './gl_ton.js';
import { GLFIG } from './gl_fig.js';
import { GLHUD } from './gl_hud.js';
import { GLHANDY } from './gl_handy.js';
import { GLORTE } from './gl_orte.js';
export const GLNEBEN = (() => {
  const S = { F: null, loading: false, busy: false, acc: 0, off: null, note: false, dankT: 0 };
  const ID = 'karpfen',
    LOHN = 80,
    ZEIT = [17 * 60 + 30, 22 * 60], // when she stands at the bus stop (minutes of the day)
    NAME = GLDATA.CAST.yuki.name;
  // where she stands: beside the east end of the school bus stop's shelter (world/dorfkern_data.js), a step back from the kerb – the
  // buses stop in front of the shelter –, facing the road
  const ORT = (() => {
    const sh = DKDATA.open && DKDATA.open.shelter,
      c = sh ? sh.c : [249, -101],
      az = ((sh ? sh.az : 196) * Math.PI) / 180;
    return {
      pos: [c[0] - Math.cos(az) * 2.3 - Math.sin(az) * 0.2, c[1] + Math.sin(az) * 2.3 - Math.cos(az) * 0.2],
      hd: az,
    };
  })();
  const DINGE = [
    ['karpfen_gross', 'ein Karpfen ab zwei Kilo'],
    ['milchreis', 'ein Päckchen Milchreis'],
    ['worcester', 'eine Flasche Worcestersauce'],
  ];
  const st = () => GL.m[ID] || null;
  const fehlt = () => DINGE.filter(d => !GL.has(d[0]));
  const da = () => {
    const m = GLNLOGIK.minOf(CLOCK.t);
    return m >= ZEIT[0] && m < ZEIT[1];
  };
  const T = {
    sms: 'Hallo! Jule sagt, ihr kennt euch an der Talsperre aus. Ich koche in Suhl ein Gedenkessen: „Sukiyaki wie im Waffenschmied“. Dafür fehlen mir drei Dinge, die man hier bekommt. Abends ab halb sechs stehe ich an der Schulbushaltestelle in Ratscher. – Yuki',
    erst: [
      'Du bist das? Schön. Ich bin Yuki, Köchin aus Suhl.',
      'Kennst du den „Waffenschmied“? Rolf Anschütz hat dort ab 1966 japanisch gekocht. In Suhl, mitten in der DDR. Das einzige Japan-Restaurant im ganzen Land.',
      'Vor dem Essen wurde gemeinsam gebadet, und auf einen Tisch hat man bis zu zwei Jahre gewartet.',
      'Was es nicht gab, hat er ersetzt. So wird es erzählt: Milchreis für den Sushi-Reis, Karpfen aus einem See in der Nähe statt Lachs, Worcestersauce statt Sojasauce.',
      'Ich koche ihm zu Ehren einen Abend lang genau so. Bringst du mir einen Karpfen, zwei Kilo oder mehr, ein Päckchen Milchreis und eine Flasche Worcestersauce? Ich zahle anständig.',
    ],
    wahr: 'Wahr ist alles, was ich über Anschütz und den Waffenschmied gesagt habe – das kannst du nachlesen. Mein Gedenkessen ist meine eigene Verbeugung vor ihm. Das hat es so nie gegeben.',
    ok: 'Danke! Karpfen beißen abends, auf Mais, sagen die Angler. Milchreis und die Sauce hat der Verkaufswagen am Anger.',
    wieder: 'Da bist du ja wieder.',
    noch: l => 'Noch fehlt mir: ' + l.join(', ') + '.',
    bringt: [
      'Ein Karpfen aus der Talsperre! Genau so einer. Und der Milchreis. Und die Sauce.',
      'Weißt du, Anschütz ist 2008 gestorben. In Suhl hängt seit 2012 eine Tafel an dem Haus in der Gothaer Straße. Ich finde, man soll auch für ihn kochen.',
      'Hier, für deine Mühe. Und ich schicke dir aufs Handy, was man über ihn weiß – mit Quellen.',
    ],
    dank: 'Das Essen war ein Erfolg. Vierzig Gäste, alle satt, keiner hat den Lachs vermisst. Für dich ist immer ein Platz frei – ohne zwei Jahre Wartezeit. Yuki',
    fertig: 'Schön, dich zu sehen. In Suhl reden sie noch von dem Karpfen.',
    hinweis:
      'Yuki und ihr Gedenkessen gehören zum Spiel und sind erfunden. Was hier über Rolf Anschütz und den „Waffenschmied“ steht, ist wahr.',
  };
  // ---- the beginning: she writes ----
  function start() {
    if (!GL.on || st()) return false;
    GL.m[ID] = { st: 'läuft', i: 0, n: 0 };
    GL.save();
    GLHANDY.sms(NAME, T.sms);
    GL.emit('neben', { id: ID, st: 'läuft' });
    return true;
  }
  // ---- what she says, line by line ----
  const pause = s => new Promise(res => setTimeout(res, window.FREEZE ? 0 : Math.round(s * 1000)));
  async function sagt(lines) {
    for (const l of lines) {
      if (!GL.on) return;
      if (S.F) GLFIG.talking(S.F, true);
      await pause(GLHUD.sub(NAME, l) + 0.25);
    }
    if (S.F) GLFIG.talking(S.F, false);
  }
  async function reden() {
    const m = st();
    if (S.busy || !GL.on || !m) return false;
    S.busy = true;
    try {
      if (S.F) GLFIG.face(S.F, P.x, P.y);
      if (m.st === 'erledigt') await sagt([T.fertig]);
      else if (m.i === 0) {
        await sagt(T.erst);
        const i = await GLHUD.wahl(
          NAME,
          'Ein Karpfen ab 2 kg, Milchreis, Worcestersauce – für ein Essen zu Ehren von Rolf Anschütz.',
          [{ t: 'Mach ich.' }, { t: 'Was davon ist wahr?' }]
        );
        if (i < 0 || !GL.on) return false;
        if (i === 1) await sagt([T.wahr]);
        m.i = 1;
        GL.save();
        GL.emit('neben', { id: ID, st: 'läuft', i: 1 });
        await sagt([T.ok]);
      } else {
        const f = fehlt();
        if (f.length) await sagt([T.wieder, T.noch(f.map(d => d[1]))]);
        else {
          await sagt(T.bringt.slice(0, 1));
          for (const d of DINGE) GL.use(d[0]);
          GLTON.fx('geld');
          GL.earn(LOHN, 'Yuki');
          m.st = 'erledigt';
          GL.save(true);
          GLHANDY.note(GLDATA.SUSHI.titel, GLDATA.SUSHI.text.concat([T.hinweis]), GLDATA.SUSHI.quellen);
          S.note = true;
          S.dankT = 90; // seconds until she writes once more
          GL.emit('neben', { id: ID, st: 'erledigt', lohn: LOHN });
          GLHUD.say('Karpfen für Suhl', LOHN + ' € · im Handy: „' + GLDATA.SUSHI.titel + '“', 6);
          await sagt(T.bringt.slice(1));
        }
      }
    } finally {
      S.busy = false;
    }
    return true;
  }
  // ---- her figure: at the bus stop in the evening while the mission runs, loaded while somebody is near ----
  const will = () => {
    const m = st();
    return !!m && GL.era === 'heute' && da() && (m.st === 'läuft' || S.dankT > 0);
  };
  async function holen() {
    if (S.loading || S.F) return;
    S.loading = true;
    const F = await GLFIG.make('yuki', {});
    S.loading = false;
    if (!F) return;
    if (!GLORTE.built || S.F || !will()) return GLFIG.drop(F);
    S.F = F;
    const p = ORT.pos.slice();
    try {
      KERN.pushOut(p, 0.4);
    } catch (e) {}
    GLFIG.place(F, p[0], p[1], ORT.hd);
  }
  function tick(dt) {
    if ((S.acc += dt) < 1) return;
    const d1 = S.acc;
    S.acc = 0;
    const m = st();
    if (!m) return;
    if (S.dankT > 0 && (S.dankT -= d1) <= 0 && GL.on) GLHANDY.sms(NAME, T.dank);
    const o = KERN.where() || [P.x, P.y],
      d = Math.hypot(o[0] - ORT.pos[0], o[1] - ORT.pos[1]),
      w = will();
    if (w && d < 130 && !S.F) holen();
    else if (S.F && (!w || d > 210) && !S.busy) {
      GLFIG.drop(S.F);
      S.F = null;
    }
  }
  // ---- the journal: what is to do, and where ----
  KERN.tasks.source({
    id: 'grenzland-neben',
    order: 5,
    list() {
      const m = st();
      if (!GL.on || !m) return [];
      const f = fehlt(),
        hat = k => (GL.has(k) ? '✓' : '–');
      let text, target, ort;
      if (m.st === 'erledigt')
        text =
          'Yuki hat ihren Karpfen. Die wahre Geschichte von Rolf Anschütz und dem „Waffenschmied“ steht im Handy unter den Notizen.';
      else if (m.i === 0) {
        text =
          'Yuki, eine Köchin aus Suhl, hat geschrieben. Abends (17:30 bis 22 Uhr) steht sie an der Schulbushaltestelle in Ratscher.';
        target = ORT.pos;
        ort = 'Schulbushaltestelle';
      } else {
        text =
          'Für ihr Gedenkessen „Sukiyaki wie im Waffenschmied“ braucht Yuki: ' +
          hat('karpfen_gross') +
          ' einen Karpfen ab 2 kg (Angelstelle an der Staumauer: abends, auf Mais), ' +
          hat('milchreis') +
          ' Milchreis und ' +
          hat('worcester') +
          ' Worcestersauce (Verkaufswagen am Anger, ' +
          GLNLOGIK.zeitenText() +
          '). Abends steht sie an der Schulbushaltestelle.';
        if (!f.length) {
          target = ORT.pos;
          ort = 'Schulbushaltestelle';
        } else if (f.some(d => d[0] !== 'karpfen_gross') || !(GL.has('mais') || GL.has('wurm'))) {
          target = GLORTE.P.wagen;
          ort = 'Verkaufswagen';
        } else {
          target = GLORTE.P.angel;
          ort = 'Angelstelle';
        }
      }
      return [
        {
          id: ID,
          title: 'Karpfen für Suhl',
          who: NAME,
          status: m.st === 'erledigt' ? 'erledigt' : 'läuft',
          text,
          target: target ? () => target : undefined,
          ort,
          z: target ? GLORTE.gnd(target[0], target[1]) : undefined,
        },
      ];
    },
  });
  GLORTE.hook({
    build() {
      S.off = KERN.on('grenzland:mission', d => {
        if (GL.on && d && d.id === 'clique' && d.st === 'erledigt') start();
      });
      // a saved game in which she has her carp: the note is in the phone again
      if (st() && st().st === 'erledigt') {
        GLHANDY.note(GLDATA.SUSHI.titel, GLDATA.SUSHI.text.concat([T.hinweis]), GLDATA.SUSHI.quellen);
        S.note = true;
      }
      // a saved game in which the clique is met already
      if (GL.m.clique && GL.m.clique.st === 'erledigt' && !st()) setTimeout(() => GL.on && start(), 4000);
      KERN.act({
        id: 'gl:yuki',
        r: 2.4,
        prio: 0.4,
        label: () =>
          GL.on && S.F && S.F.g.visible && !S.busy && P.mode === 'walk' && !PLAY.seated()
            ? 'Mit ' + NAME + ' reden'
            : null,
        pos: () => (S.F ? [S.F.x, S.F.y, S.F.z + 1.2] : null),
        run: () => {
          reden();
        },
      });
    },
    drop() {
      if (S.off) S.off();
      S.off = null;
      KERN.unact('gl:yuki');
      if (S.F) GLFIG.drop(S.F);
      S.F = null;
      S.busy = false;
      S.dankT = 0;
    },
    tick,
  });
  return Object.assign(S, {
    start,
    reden,
    stand: () => (st() ? Object.assign({}, st()) : null),
    yuki: () => S.F,
    ORT,
    ZEIT,
    LOHN,
    T,
  });
})();
window.GLNEBEN = GLNEBEN;
